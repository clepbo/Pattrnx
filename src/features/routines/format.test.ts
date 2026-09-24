import { expect, it } from "vitest";

import { describeDays } from "./format";

it.each([
  [[0, 1, 2, 3, 4, 5, 6], "Every day"],
  [[5, 4, 3, 2, 1], "Weekdays"],
  [[6, 0], "Weekends"],
  [[0, 1, 3], "Mon, Wed, Sun"],
])("describeDays(%j) → %s", (days, text) => {
  expect(describeDays(days)).toBe(text);
});
