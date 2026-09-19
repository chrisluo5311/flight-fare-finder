import { describe, expect, it } from "vitest";

import {
  airlineName,
  departureLabel,
  durationLabel,
  EMPTY_FILTERS,
  matchesFilters,
  stopsBucket,
  timeSlot,
} from "@/lib/fare-details";
import type { LatestFare } from "@/lib/flight-api";

const base: LatestFare = {
  route: "TPE-TYO",
  month: "2026-10",
  price: 6579,
  currency: "TWD",
  airline: "GK",
  depart_date: "2026-10-29T12:50:00+08:00",
  return_date: "2026-11-12T22:25:00+09:00",
  transfers: 0,
  return_transfers: 1,
  duration_to: 195,
};

function withoutStops(fare: LatestFare): LatestFare {
  const copy = { ...fare };
  delete copy.transfers;
  delete copy.return_transfers;
  return copy;
}

describe("labels", () => {
  it("names known airlines and falls back to the code", () => {
    expect(airlineName("BR")).toBe("長榮航空");
    expect(airlineName("ZZ")).toBe("ZZ");
    expect(airlineName(undefined)).toBeNull();
  });

  it("formats durations", () => {
    expect(durationLabel(225)).toBe("3小時45分");
    expect(durationLabel(180)).toBe("3小時");
    expect(durationLabel(undefined)).toBeNull();
  });

  it("reads the departure wall clock as written, not converted to Taipei", () => {
    expect(departureLabel("2026-11-12T22:25:00+09:00")).toBe("11/12（四）22:25");
    expect(departureLabel("2026-11-26T10:30:00Z")).toBe("11/26（四）10:30");
  });
});

describe("buckets", () => {
  it("lets the worse leg decide the stops bucket", () => {
    expect(stopsBucket(base)).toBe("one");
    expect(stopsBucket({ ...base, return_transfers: 0 })).toBe("direct");
    expect(stopsBucket(withoutStops(base))).toBeNull();
  });

  it("slots departures by local hour", () => {
    expect(timeSlot("2026-10-29T05:59:00+08:00")).toBe("night");
    expect(timeSlot("2026-10-29T12:50:00+08:00")).toBe("afternoon");
    expect(timeSlot("2026-10-29")).toBeNull();
  });
});

describe("matchesFilters", () => {
  const subject = { fare: base, tracking: false };

  it("passes everything with no filters, even without a fare", () => {
    expect(matchesFilters(subject, EMPTY_FILTERS)).toBe(true);
    expect(matchesFilters({ tracking: false }, EMPTY_FILTERS)).toBe(true);
  });

  it("excludes a route without a fare once a fare filter is set", () => {
    expect(matchesFilters({ tracking: false }, { ...EMPTY_FILTERS, maxPrice: 9000 })).toBe(false);
  });

  it("filters on stops, airline, price, hours and tracking", () => {
    expect(matchesFilters(subject, { ...EMPTY_FILTERS, stops: ["direct"] })).toBe(false);
    expect(matchesFilters(subject, { ...EMPTY_FILTERS, stops: ["one"] })).toBe(true);
    expect(matchesFilters(subject, { ...EMPTY_FILTERS, airlines: ["BR"] })).toBe(false);
    expect(matchesFilters(subject, { ...EMPTY_FILTERS, maxPrice: 6000 })).toBe(false);
    expect(matchesFilters(subject, { ...EMPTY_FILTERS, maxHours: 3 })).toBe(false);
    expect(matchesFilters(subject, { ...EMPTY_FILTERS, maxHours: 4 })).toBe(true);
    expect(matchesFilters(subject, { ...EMPTY_FILTERS, tracking: ["tracking"] })).toBe(false);
  });

  it("excludes a route whose fare lacks the filtered field", () => {
    const bare = {
      fare: withoutStops(base),
      tracking: false,
    };
    expect(matchesFilters(bare, { ...EMPTY_FILTERS, stops: ["direct", "one", "multi"] })).toBe(
      false,
    );
  });
});
