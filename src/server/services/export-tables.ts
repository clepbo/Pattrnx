/**
 * Every user-owned table, in export order (PRD F15). `export-tables.test.ts`
 * fails if a table with a user_id column is missing, so new tables can't be
 * silently left out of exports.
 */
export const EXPORT_TABLES = [
  "life_areas",
  "activity_types",
  "goals",
  "goal_strategies",
  "milestones",
  "actions",
  "routines",
  "routine_steps",
  "tasks",
  "activities",
  "outcomes",
  "daily_checkins",
  "patterns",
  "experiments",
  "reviews",
] as const;

/** Operational tables that hold no user content and are deliberately not exported. */
export const NOT_EXPORTED = ["rate_limits"] as const;
