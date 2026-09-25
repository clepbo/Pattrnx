-- Milestone 4: experiments limits and windows, reviews, rate limits.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.test');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

insert into public.life_areas (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Career');
insert into public.goals (id, life_area_id, title, measurement_type, start_date) values
  ('aaaaaaaa-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000001', 'G1', 'milestone', '2026-09-01'),
  ('aaaaaaaa-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000001', 'G2', 'milestone', '2026-09-01'),
  ('aaaaaaaa-0000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-000000000001', 'G3', 'milestone', '2026-09-01');

create function pg_temp.new_experiment(goal uuid, starts date = '2026-09-24', ends date = '2026-10-07', metric text = 'task_completion_rate', subject jsonb = '{}')
returns void language sql as $$
  insert into public.experiments (goal_id, title, hypothesis, intervention_category, intervention_description, metric, metric_subject, direction,
                                  start_date, end_date, baseline_start, baseline_end)
  values (goal, 'T', 'H', 'reduce', 'D', metric::public.experiment_metric, subject, 'increase',
          starts, ends, starts - (ends - starts) - 1, starts - 1);
$$;

select lives_ok($$ select pg_temp.new_experiment('aaaaaaaa-0000-0000-0000-000000000010') $$, 'a 14-day experiment with a matching baseline');
select throws_ok($$ select pg_temp.new_experiment('aaaaaaaa-0000-0000-0000-000000000010') $$, '23505', null, 'BR-7: one active experiment per goal');
select lives_ok($$ select pg_temp.new_experiment('aaaaaaaa-0000-0000-0000-000000000011') $$, 'a second goal can have one too');
select throws_ok($$ select pg_temp.new_experiment('aaaaaaaa-0000-0000-0000-000000000012') $$, '23514', 'at most two active experiments', 'BR-7: two active per user');
update public.experiments set status = 'abandoned' where goal_id = 'aaaaaaaa-0000-0000-0000-000000000011';
select lives_ok($$ select pg_temp.new_experiment('aaaaaaaa-0000-0000-0000-000000000012') $$, 'abandoning one frees a slot');

select throws_ok($$ select pg_temp.new_experiment(null, '2026-09-24', '2026-09-28') $$, '23514', null, 'BR-7: at least 7 days');
select throws_ok($$ select pg_temp.new_experiment(null, '2026-09-24', '2026-11-10') $$, '23514', null, 'BR-7: at most 42 days');
select throws_ok(
  $$ insert into public.experiments (title, hypothesis, intervention_category, intervention_description, metric, direction,
                                     start_date, end_date, baseline_start, baseline_end)
     values ('T', 'H', 'reduce', 'D', 'task_completion_rate', 'increase', '2026-09-24', '2026-10-07', '2026-09-01', '2026-09-23') $$,
  '23514', null, 'the baseline must be the equal-length window before the start'
);
select throws_ok(
  $$ select pg_temp.new_experiment(null, '2026-09-24', '2026-10-07', 'active_days', '{}') $$,
  '23514', null, 'activity metrics need an activity type'
);

-- Rate limits: counted server-side, users can't reset them.
select ok(
  public.hit_rate_limit('export') and public.hit_rate_limit('export') and public.hit_rate_limit('export')
  and public.hit_rate_limit('export') and public.hit_rate_limit('export') and not public.hit_rate_limit('export'),
  'the sixth export in an hour is refused'
);
select throws_ok($$ select public.hit_rate_limit('anything-else') $$, '22023', null, 'only known actions can be counted');
select throws_ok($$ delete from public.rate_limits $$, '42501', null, 'users cannot reset their counters');

-- Reviews: one per week.
insert into public.reviews (period_start, period_end, content, engine_version) values ('2026-09-14', '2026-09-20', '{}', 1);
select throws_ok(
  $$ insert into public.reviews (period_start, period_end, content, engine_version) values ('2026-09-14', '2026-09-20', '{}', 1) $$,
  '23505', null, 'one review per user per week'
);

select throws_ok(
  $$ insert into public.reviews (period_start, period_end, content, engine_version)
     values ('2026-09-07', '2026-09-13', jsonb_build_object('blob', repeat(md5(random()::text), 5000)), 1) $$,
  '23514', null, 'oversized JSON is rejected (SR-4)'
);

select * from finish();
rollback;
