import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, it } from "vitest";

import { EXPORT_TABLES, NOT_EXPORTED } from "./export-tables";

it("exports every table that has a user_id column", () => {
  const types = readFileSync(join(__dirname, "../db/database.types.ts"), "utf8");
  // "\n  public: {" (not "graphql_public: {").
  const start = types.indexOf("\n  public: {");
  const publicTables = types.slice(start, types.indexOf("Views:", start));
  const withUserId = [...publicTables.matchAll(/^ {6}(\w+): \{\n {8}Row: \{([\s\S]*?)\n {8}\}/gm)]
    .filter(([, , row]) => /\n\s+user_id: string/.test(row))
    .map(([, table]) => table)
    .sort();

  expect(withUserId.length).toBeGreaterThan(10);
  expect(withUserId).toEqual([...EXPORT_TABLES, ...NOT_EXPORTED].sort());
});
