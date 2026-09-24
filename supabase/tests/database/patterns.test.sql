-- Milestone 3: patterns table, dirty tracking, detection claim.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

-- Claim: exactly once while due.
select ok(public.claim_pattern_detection(), 'first claim succeeds (never run)');
select ok(not public.claim_pattern_detection(), 'second claim within the max age is refused');
-- now() is fixed inside a transaction, so backdate the last run instead of waiting.
update public.profiles set patterns_checked_at = now() - interval '25 hours';
select ok(public.claim_pattern_detection(), 'a run older than the max age is due again');

-- Editing source data marks detection dirty; plain inserts don't.
insert into public.life_areas (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Career');
insert into public.activity_types (id, life_area_id, name)
  values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Deep work');
insert into public.activities (id, activity_type_id, occurred_at)
  values ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', now() - interval '1 day');
select ok(not (select patterns_dirty from public.profiles), 'inserting an activity does not mark detection dirty');
update public.activities set note = 'edited' where id = 'aaaaaaaa-0000-0000-0000-000000000003';
select ok((select patterns_dirty from public.profiles), 'editing an activity marks detection dirty');
select ok(public.claim_pattern_detection(), 'a dirty profile can be claimed');
select ok(not (select patterns_dirty from public.profiles), 'claiming clears the dirty flag');
delete from public.activities where id = 'aaaaaaaa-0000-0000-0000-000000000003';
select ok((select patterns_dirty from public.profiles), 'deleting an activity marks detection dirty');

-- Patterns: one row per fingerprint; others can't see or touch them.
insert into public.patterns (kind, detector_key, detector_version, fingerprint, summary, observations, effect_size, confidence, window_start, window_end)
  values ('timing', 'timing.weekday', 1, 'timing.weekday:r1:3', 'Possible pattern: …', 20, 0.4, 'moderate', '2026-06-27', '2026-09-24');
select throws_ok(
  $$ insert into public.patterns (kind, detector_key, detector_version, fingerprint, summary, observations, effect_size, confidence, window_start, window_end)
     values ('timing', 'timing.weekday', 1, 'timing.weekday:r1:3', 'dup', 20, 0.4, 'moderate', '2026-06-27', '2026-09-24') $$,
  '23505', null, 'one pattern per fingerprint per user'
);

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is((select count(*)::int from public.patterns), 0, 'B cannot see A''s patterns');
update public.patterns set suppressed = true;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select ok(not (select suppressed from public.patterns limit 1), 'B cannot change A''s pattern feedback');

select * from finish();
rollback;
