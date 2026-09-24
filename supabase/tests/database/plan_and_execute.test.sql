-- Milestone 2 schema: goals, milestones, actions, routines, tasks, outcomes, set_task_status.
begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test', '{"timezone": "Africa/Lagos"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test', '{"timezone": "UTC"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

-- Fixtures for A
insert into public.life_areas (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Career');
insert into public.activity_types (id, life_area_id, name, polarity)
  values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Portfolio work', 'desired');

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------

insert into public.goals (id, life_area_id, title, measurement_type, unit, baseline_value, target_value, start_date, deadline)
  values ('aaaaaaaa-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000001', 'Emergency fund',
          'cumulative', 'NGN', 400000, 2000000, '2026-09-01', '2027-03-01');
insert into public.goals (id, life_area_id, title, measurement_type, start_date)
  values ('aaaaaaaa-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000001', 'Become a product designer',
          'milestone', '2026-09-01');

select throws_ok(
  $$ insert into public.goals (life_area_id, title, measurement_type, start_date)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'No numbers', 'cumulative', '2026-09-01') $$,
  '23514', null, 'numeric goals need unit, baseline and target'
);
select throws_ok(
  $$ insert into public.goals (life_area_id, title, measurement_type, unit, baseline_value, target_value, start_date)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Same', 'level', 'kg', 80, 80, '2026-09-01') $$,
  '23514', null, 'target must differ from baseline'
);
select throws_ok(
  $$ insert into public.goals (life_area_id, title, measurement_type, start_date, deadline)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Backwards', 'milestone', '2026-09-01', '2026-08-01') $$,
  '23514', null, 'deadline must be after start'
);
select throws_ok(
  $$ insert into public.goals (life_area_id, title, measurement_type, start_date, planned_pace_amount)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Half pace', 'milestone', '2026-09-01', 10) $$,
  '23514', null, 'planned pace needs both amount and period'
);

update public.goals set status_changed_at = '2020-01-01' where id = 'aaaaaaaa-0000-0000-0000-000000000011';
update public.goals set status = 'paused' where id = 'aaaaaaaa-0000-0000-0000-000000000011';
select ok((select status_changed_at > '2025-01-01' from public.goals where id = 'aaaaaaaa-0000-0000-0000-000000000011'),
          'status_changed_at updates when status changes');

-- ---------------------------------------------------------------------------
-- milestones and actions
-- ---------------------------------------------------------------------------

insert into public.milestones (id, goal_id, title)
  values ('aaaaaaaa-0000-0000-0000-000000000020', 'aaaaaaaa-0000-0000-0000-000000000011', 'Build portfolio');
insert into public.actions (id, goal_id, milestone_id, title, activity_type_id)
  values ('aaaaaaaa-0000-0000-0000-000000000030', 'aaaaaaaa-0000-0000-0000-000000000011',
          'aaaaaaaa-0000-0000-0000-000000000020', 'Write problem statement', 'aaaaaaaa-0000-0000-0000-000000000002');

select throws_ok(
  $$ insert into public.actions (goal_id, milestone_id, title)
     values ('aaaaaaaa-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000020', 'Wrong goal') $$,
  '23503', null, 'an action''s milestone must belong to the same goal'
);

update public.milestones set status = 'done' where id = 'aaaaaaaa-0000-0000-0000-000000000020';
select isnt((select completed_at from public.milestones where id = 'aaaaaaaa-0000-0000-0000-000000000020'), null,
            'completing a milestone stamps completed_at');
update public.milestones set status = 'in_progress' where id = 'aaaaaaaa-0000-0000-0000-000000000020';
select is((select completed_at from public.milestones where id = 'aaaaaaaa-0000-0000-0000-000000000020'), null,
          'reopening a milestone clears completed_at');

-- ---------------------------------------------------------------------------
-- routines
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.routines (name, activity_type_id, days_of_week, normal_minutes, active_from)
     values ('Bad days', 'aaaaaaaa-0000-0000-0000-000000000002', '{1,1}', 30, '2026-09-01') $$,
  '23514', null, 'days_of_week rejects duplicates'
);
select throws_ok(
  $$ insert into public.routines (name, activity_type_id, days_of_week, normal_minutes, active_from)
     values ('Bad days', 'aaaaaaaa-0000-0000-0000-000000000002', '{7}', 30, '2026-09-01') $$,
  '23514', null, 'days_of_week rejects values outside 0–6'
);
select throws_ok(
  $$ insert into public.routines (name, activity_type_id, days_of_week, normal_minutes, minimum_minutes, active_from)
     values ('Upside down', 'aaaaaaaa-0000-0000-0000-000000000002', '{1}', 30, 45, '2026-09-01') $$,
  '23514', null, 'minimum minutes cannot exceed normal minutes'
);

insert into public.routines (id, name, goal_id, activity_type_id, days_of_week, normal_minutes, minimum_minutes, active_from)
  values ('aaaaaaaa-0000-0000-0000-000000000040', 'Design practice', 'aaaaaaaa-0000-0000-0000-000000000011',
          'aaaaaaaa-0000-0000-0000-000000000002', '{1,2,3,4,5}', 60, 15, '2026-09-01');

-- ---------------------------------------------------------------------------
-- tasks and set_task_status
-- ---------------------------------------------------------------------------

insert into public.tasks (id, title, source, routine_id, goal_id, activity_type_id, scheduled_date, planned_minutes, minimum_minutes)
  values ('aaaaaaaa-0000-0000-0000-000000000050', 'Design practice', 'routine', 'aaaaaaaa-0000-0000-0000-000000000040',
          'aaaaaaaa-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000002', '2026-09-21', 60, 15);

select throws_ok(
  $$ insert into public.tasks (title, source, routine_id, scheduled_date)
     values ('Dup', 'routine', 'aaaaaaaa-0000-0000-0000-000000000040', '2026-09-21') $$,
  '23505', null, 'one task per routine per date'
);
select throws_ok(
  $$ insert into public.tasks (title, source, scheduled_date) values ('Inconsistent', 'routine', '2026-09-21') $$,
  '23514', null, 'task source must match its links'
);

select lives_ok(
  $$ select public.set_task_status('aaaaaaaa-0000-0000-0000-000000000050', 'done') $$,
  'owner can complete a past task'
);
select is((select count(*)::int from public.activities where task_id = 'aaaaaaaa-0000-0000-0000-000000000050'), 1,
          'completing a task creates one activity');
select is(
  (select row(duration_minutes, local_date, source::text, goal_id)::text from public.activities
   where task_id = 'aaaaaaaa-0000-0000-0000-000000000050'),
  row(60, '2026-09-21'::date, 'task', 'aaaaaaaa-0000-0000-0000-000000000011'::uuid)::text,
  'the activity is logged on the task''s day with its planned minutes and goal'
);
select isnt((select completed_at from public.tasks where id = 'aaaaaaaa-0000-0000-0000-000000000050'), null,
            'completed_at is stamped');

select public.set_task_status('aaaaaaaa-0000-0000-0000-000000000050', 'done_minimum');
select is((select count(*)::int from public.activities where task_id = 'aaaaaaaa-0000-0000-0000-000000000050'), 1,
          'switching to the minimum version keeps exactly one activity');
select is((select duration_minutes from public.activities where task_id = 'aaaaaaaa-0000-0000-0000-000000000050'), 15,
          'the minimum version logs minimum minutes');

select public.set_task_status('aaaaaaaa-0000-0000-0000-000000000050', 'skipped');
select is((select count(*)::int from public.activities where task_id = 'aaaaaaaa-0000-0000-0000-000000000050'), 0,
          'skipping removes the activity');
select is((select completed_at from public.tasks where id = 'aaaaaaaa-0000-0000-0000-000000000050'), null,
          'skipping clears completed_at');

insert into public.tasks (id, title, source, scheduled_date)
  values ('aaaaaaaa-0000-0000-0000-000000000051', 'Future', 'manual', current_date + 30);
select throws_ok(
  $$ select public.set_task_status('aaaaaaaa-0000-0000-0000-000000000051', 'done') $$,
  '23514', 'future tasks cannot be completed or skipped', 'future tasks cannot be completed'
);

-- An action's task drives the action's status.
insert into public.tasks (id, title, source, action_id, goal_id, activity_type_id, scheduled_date, planned_minutes)
  values ('aaaaaaaa-0000-0000-0000-000000000052', 'Write problem statement', 'action',
          'aaaaaaaa-0000-0000-0000-000000000030', 'aaaaaaaa-0000-0000-0000-000000000011',
          'aaaaaaaa-0000-0000-0000-000000000002', '2026-09-22', 30);
select public.set_task_status('aaaaaaaa-0000-0000-0000-000000000052', 'done');
select is((select status::text from public.actions where id = 'aaaaaaaa-0000-0000-0000-000000000030'), 'done',
          'completing an action''s task completes the action');
select public.set_task_status('aaaaaaaa-0000-0000-0000-000000000052', 'planned');
select is((select status::text from public.actions where id = 'aaaaaaaa-0000-0000-0000-000000000030'), 'open',
          'reopening the task reopens the action');

-- ---------------------------------------------------------------------------
-- outcomes
-- ---------------------------------------------------------------------------

insert into public.outcomes (id, goal_id, occurred_at, value)
  values ('aaaaaaaa-0000-0000-0000-000000000060', 'aaaaaaaa-0000-0000-0000-000000000010', '2026-09-20T23:30:00Z', 80000);
select is((select local_date from public.outcomes where id = 'aaaaaaaa-0000-0000-0000-000000000060'), '2026-09-21'::date,
          'outcome local_date derived in the user timezone');
select throws_ok(
  $$ insert into public.outcomes (goal_id) values ('aaaaaaaa-0000-0000-0000-000000000010') $$,
  '23514', null, 'an outcome needs a value or a description'
);

-- ---------------------------------------------------------------------------
-- Isolation: B can't read, change or reference A's plan
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select is(
  (select count(*)::int from (
     select id from public.goals union all select id from public.milestones union all select id from public.actions
     union all select id from public.routines union all select id from public.tasks union all select id from public.outcomes
   ) visible),
  0, 'B sees none of A''s plan'
);
select throws_ok(
  $$ select public.set_task_status('aaaaaaaa-0000-0000-0000-000000000050', 'done') $$,
  'P0002', 'task not found', 'B cannot change A''s task status'
);
insert into public.life_areas (id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Health');
select throws_ok(
  $$ insert into public.goals (life_area_id, title, measurement_type, start_date)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Sneaky', 'milestone', '2026-09-01') $$,
  '23503', null, 'B cannot attach a goal to A''s life area'
);

-- ---------------------------------------------------------------------------
-- Deletion semantics (as A)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

delete from public.milestones where id = 'aaaaaaaa-0000-0000-0000-000000000020';
select is(
  (select row(milestone_id, user_id)::text from public.actions where id = 'aaaaaaaa-0000-0000-0000-000000000030'),
  row(null::uuid, '11111111-1111-1111-1111-111111111111'::uuid)::text,
  'deleting a milestone detaches its actions without touching user_id'
);

select public.set_task_status('aaaaaaaa-0000-0000-0000-000000000050', 'done');
delete from public.goals where id = 'aaaaaaaa-0000-0000-0000-000000000011';
select is((select count(*)::int from public.actions where goal_id = 'aaaaaaaa-0000-0000-0000-000000000011'), 0,
          'deleting a goal deletes its actions');
select is(
  (select row(goal_id, user_id)::text from public.activities where task_id = 'aaaaaaaa-0000-0000-0000-000000000050'),
  row(null::uuid, '11111111-1111-1111-1111-111111111111'::uuid)::text,
  'activities outlive a deleted goal (goal_id set null)'
);

select * from finish();
rollback;
