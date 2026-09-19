import { describe, expect, it } from "vitest";

import { periodEndLabel, taipeiDate, taipeiDateTime } from "./datetime";

function normalizeSpaces(value: string | null): string | null {
  return value === null ? null : value.replace(/\s+/g, " ");
}

describe("taipeiDate", () => {
  it("renders a UTC instant as its Taipei calendar date", () => {
    expect(taipeiDate("2026-10-13T12:14:00Z")).toBe("2026/10/13");
  });

  it("rolls to the next day for instants at or after 16:00 UTC", () => {
    // 16:00Z is midnight in Taipei — the whole point of not formatting in UTC.
    expect(taipeiDate("2026-10-13T16:00:00Z")).toBe("2026/10/14");
  });

  it("returns null for missing or unparseable input", () => {
    expect(taipeiDate(undefined)).toBeNull();
    expect(taipeiDate(null)).toBeNull();
    expect(taipeiDate("")).toBeNull();
    expect(taipeiDate("not-a-date")).toBeNull();
  });
});

describe("taipeiDateTime", () => {
  it("renders date and 24-hour time in Taipei", () => {
    // Intl separates the date and the time with a narrow no-break space.
    expect(normalizeSpaces(taipeiDateTime("2026-10-13T12:14:00Z"))).toBe("2026/10/13 20:14");
  });

  it("returns null for unparseable input", () => {
    expect(taipeiDateTime("nope")).toBeNull();
  });
});

describe("periodEndLabel", () => {
  it("prefers the UTC instant over the server-sliced date string", () => {
    // The string reads a day early for evening-Taipei instants; the instant wins.
    expect(
      periodEndLabel({
        current_period_end: "2026-10-13T16:30:00Z",
        current_period_end_date: "2026-10-13",
      }),
    ).toBe("2026/10/14");
  });

  it("falls back to the date string for legacy rows without an instant", () => {
    expect(periodEndLabel({ current_period_end_date: "2026-10-13" })).toBe("2026-10-13");
  });

  it("returns null when the subscription carries neither", () => {
    expect(periodEndLabel({})).toBeNull();
  });
});
