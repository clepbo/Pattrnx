import { describe, expect, it } from "vitest";

import { assertLocalDate } from "./dates";
import { formatAmount, formatLocalDate, formatPercent, parseAmount } from "./format";

describe("formatAmount", () => {
  it("formats currency codes as money without kobo for large amounts", () => {
    expect(formatAmount(266_666.67, "NGN")).toBe("₦266,667");
    expect(formatAmount(12.5, "USD", "en-US")).toBe("$12.50");
  });

  it("appends other units", () => {
    expect(formatAmount(45, "min")).toBe("45 min");
    expect(formatAmount(81.456, "kg")).toBe("81.46 kg");
    expect(formatAmount(3, null)).toBe("3");
  });
});

describe("parseAmount", () => {
  it.each([
    ["1,600,000", 1_600_000],
    [" 81.5 ", 81.5],
    ["₦80,000", 80_000],
    ["-3", -3],
    [".5", 0.5],
  ])("%s → %s", (raw, value) => {
    expect(parseAmount(raw)).toBe(value);
  });

  it.each(["", "abc", "1.2.3", "12abc"])("%s → null", (raw) => {
    expect(parseAmount(raw)).toBeNull();
  });
});

describe("formatLocalDate", () => {
  it("never shifts the day", () => {
    expect(formatLocalDate(assertLocalDate("2026-09-22"))).toBe("Tue, 22 Sept 2026");
  });
});

it("formatPercent rounds", () => {
  expect(formatPercent(0.546)).toBe("55%");
});
