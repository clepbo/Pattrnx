import { describe, expect, it } from "vitest";
import {
  addDays,
  assertLocalDate,
  diffDays,
  eachDay,
  isValidTimeZone,
  localDateOf,
  localHourOf,
  normalizeTimeZone,
  parseLocalDate,
  startOfWeek,
  todayIn,
  weekdayOf,
  zonedDateTimeToInstant,
} from "./dates";

const d = assertLocalDate;

describe("timezones", () => {
  it("accepts IANA names and canonicalizes casing", () => {
    expect(isValidTimeZone("Africa/Lagos")).toBe(true);
    expect(normalizeTimeZone("africa/lagos")).toBe("Africa/Lagos");
    expect(normalizeTimeZone("UTC")).toBe("UTC");
  });

  it("rejects unknown or empty names", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("parseLocalDate", () => {
  it("accepts real calendar dates", () => {
    expect(parseLocalDate("2026-09-21")).toBe("2026-09-21");
    expect(parseLocalDate("2028-02-29")).toBe("2028-02-29");
  });

  it("rejects impossible dates and other formats", () => {
    expect(parseLocalDate("2026-02-29")).toBeNull();
    expect(parseLocalDate("2026-13-01")).toBeNull();
    expect(parseLocalDate("2026-9-1")).toBeNull();
    expect(parseLocalDate("2026-09-21T00:00:00Z")).toBeNull();
  });

  it("assertLocalDate throws on invalid input", () => {
    expect(() => assertLocalDate("nope")).toThrow();
  });
});

describe("instant → local", () => {
  const lateEveningUtc = new Date("2026-09-20T23:30:00Z");

  it("matches the DB trigger: 23:30 UTC is the next day at 00h in Lagos", () => {
    expect(localDateOf(lateEveningUtc, "Africa/Lagos")).toBe("2026-09-21");
    expect(localHourOf(lateEveningUtc, "Africa/Lagos")).toBe(0);
  });

  it("stays on the same day in UTC and moves back in New York", () => {
    expect(localDateOf(lateEveningUtc, "UTC")).toBe("2026-09-20");
    expect(localDateOf(lateEveningUtc, "America/New_York")).toBe("2026-09-20");
    expect(localHourOf(lateEveningUtc, "America/New_York")).toBe(19);
  });

  it("reports midnight as hour 0, not 24", () => {
    expect(localHourOf(new Date("2026-09-21T00:00:00Z"), "UTC")).toBe(0);
  });

  it("todayIn uses the supplied clock", () => {
    expect(todayIn("Asia/Tokyo", new Date("2026-09-20T16:00:00Z"))).toBe("2026-09-21");
  });
});

describe("local → instant", () => {
  it("converts a Lagos wall time", () => {
    expect(zonedDateTimeToInstant(d("2026-09-21"), "07:30", "Africa/Lagos").toISOString()).toBe(
      "2026-09-21T06:30:00.000Z",
    );
  });

  it("round-trips through localDateOf/localHourOf", () => {
    const instant = zonedDateTimeToInstant(d("2026-03-29"), "23:15", "Europe/London");
    expect(localDateOf(instant, "Europe/London")).toBe("2026-03-29");
    expect(localHourOf(instant, "Europe/London")).toBe(23);
  });

  it("handles both sides of a DST change in New York", () => {
    expect(zonedDateTimeToInstant(d("2026-03-07"), "12:00", "America/New_York").toISOString()).toBe(
      "2026-03-07T17:00:00.000Z",
    );
    expect(zonedDateTimeToInstant(d("2026-03-09"), "12:00", "America/New_York").toISOString()).toBe(
      "2026-03-09T16:00:00.000Z",
    );
  });

  it("resolves a time inside the spring-forward gap to a valid later instant", () => {
    const instant = zonedDateTimeToInstant(d("2026-03-08"), "02:30", "America/New_York");
    expect(localDateOf(instant, "America/New_York")).toBe("2026-03-08");
    expect(localHourOf(instant, "America/New_York")).toBe(3);
  });

  it("rejects malformed times", () => {
    expect(() => zonedDateTimeToInstant(d("2026-03-08"), "24:00", "UTC")).toThrow();
    expect(() => zonedDateTimeToInstant(d("2026-03-08"), "7:30", "UTC")).toThrow();
  });
});

describe("calendar arithmetic", () => {
  it("adds days across month, year and leap boundaries", () => {
    expect(addDays(d("2026-09-30"), 1)).toBe("2026-10-01");
    expect(addDays(d("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(d("2028-03-01"), -1)).toBe("2028-02-29");
  });

  it("is unaffected by DST (dates carry no time)", () => {
    expect(addDays(d("2026-03-07"), 2)).toBe("2026-03-09");
    expect(diffDays(d("2026-03-07"), d("2026-03-09"))).toBe(2);
  });

  it("diffDays is signed", () => {
    expect(diffDays(d("2026-09-21"), d("2026-09-14"))).toBe(-7);
  });

  it("weekdayOf uses 0 = Sunday", () => {
    expect(weekdayOf(d("2026-09-20"))).toBe(0);
    expect(weekdayOf(d("2026-09-21"))).toBe(1);
  });

  it("startOfWeek honours the user's first day of week", () => {
    // 2026-09-24 is a Thursday.
    expect(startOfWeek(d("2026-09-24"), 1)).toBe("2026-09-21");
    expect(startOfWeek(d("2026-09-24"), 0)).toBe("2026-09-20");
    expect(startOfWeek(d("2026-09-24"), 4)).toBe("2026-09-24");
    expect(startOfWeek(d("2026-09-20"), 1)).toBe("2026-09-14");
  });

  it("eachDay is inclusive and empty for reversed ranges", () => {
    expect(eachDay(d("2026-09-29"), d("2026-10-02"))).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(eachDay(d("2026-09-21"), d("2026-09-20"))).toEqual([]);
  });
});
