import type { LatestFare } from "@/lib/flight-api";

/* Presentation and filtering for the fare the parser last published per route.
   Kept free of React so the rules can be unit-tested directly. */

const AIRLINE_NAMES: Record<string, string> = {
  BR: "長榮航空",
  CI: "中華航空",
  JX: "星宇航空",
  IT: "台灣虎航",
  AE: "華信航空",
  B7: "立榮航空",
  GK: "捷星日本",
  JL: "日本航空",
  NH: "全日空",
  MM: "樂桃航空",
  TR: "酷航",
  KE: "大韓航空",
  OZ: "韓亞航空",
  "7C": "濟州航空",
  LJ: "真航空",
  TW: "德威航空",
  ZE: "易斯達航空",
  BX: "釜山航空",
  CX: "國泰航空",
  UO: "香港快運",
  MU: "中國東方航空",
  CA: "中國國際航空",
  CZ: "中國南方航空",
  FM: "上海航空",
  BA: "英國航空",
  VS: "維珍航空",
  EK: "阿聯酋航空",
  QR: "卡達航空",
  TK: "土耳其航空",
  SQ: "新加坡航空",
  TG: "泰國航空",
  VN: "越南航空",
  VJ: "越捷航空",
  KL: "荷蘭皇家航空",
  AF: "法國航空",
  LH: "漢莎航空",
};

/** "長榮航空" for a code we know, the bare IATA code otherwise. */
export function airlineName(code?: string): string | null {
  if (!code) return null;
  return AIRLINE_NAMES[code] ?? code;
}

export function stopsLabel(transfers?: number): string | null {
  if (transfers === undefined || transfers === null) return null;
  return transfers === 0 ? "直飛" : `轉機 ${transfers} 次`;
}

/** 225 → "3小時45分". */
export function durationLabel(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}小時` : `${h}小時${m}分`;
}

export function tripClassLabel(tripClass?: number): string | null {
  switch (tripClass) {
    case 0:
      return "經濟艙";
    case 1:
      return "商務艙";
    case 2:
      return "頭等艙";
    default:
      return null;
  }
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

/*
 * Departure times are wall-clock times at the departure airport, sent with
 * that airport's offset ("2026-11-12T22:25:00+09:00"). Read the digits as
 * written: converting to Taipei would show a Tokyo departure an hour early,
 * which is not what the airline's timetable or the booking site will say.
 */
type WallClock = { month: number; day: number; weekday: string; hour: number; time: string };

export function wallClock(stamp?: string): WallClock | null {
  const match = stamp?.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, y, mo, d, hh, mm] = match;
  const weekday = WEEKDAYS[new Date(Date.UTC(+y!, +mo! - 1, +d!)).getUTCDay()]!;
  return {
    month: +mo!,
    day: +d!,
    weekday,
    hour: hh ? +hh : -1,
    time: hh ? `${hh}:${mm}` : "",
  };
}

/** "10/29（四）12:50". */
export function departureLabel(stamp?: string): string | null {
  const w = wallClock(stamp);
  if (!w) return null;
  return `${w.month}/${w.day}（${w.weekday}）${w.time}`.trim();
}

/* ------------------------------------------------------------------ filters */

export type StopsBucket = "direct" | "one" | "multi";
export type TimeSlot = "night" | "morning" | "afternoon" | "evening";
export type TrackingState = "tracking" | "untracked";

export const TIME_SLOTS: { key: TimeSlot; label: string; range: string }[] = [
  { key: "night", label: "凌晨", range: "00:00–05:59" },
  { key: "morning", label: "上午", range: "06:00–11:59" },
  { key: "afternoon", label: "下午", range: "12:00–17:59" },
  { key: "evening", label: "晚上", range: "18:00–23:59" },
];

export const STOPS_BUCKETS: { key: StopsBucket; label: string }[] = [
  { key: "direct", label: "直飛" },
  { key: "one", label: "轉機 1 次" },
  { key: "multi", label: "轉機 2 次以上" },
];

/** Worst leg decides: a trip with a stop on the way back is not 直飛. */
export function stopsBucket(fare: LatestFare): StopsBucket | null {
  const legs = [fare.transfers, fare.return_transfers].filter(
    (n): n is number => typeof n === "number",
  );
  if (legs.length === 0) return null;
  const worst = Math.max(...legs);
  return worst === 0 ? "direct" : worst === 1 ? "one" : "multi";
}

export function timeSlot(stamp?: string): TimeSlot | null {
  const hour = wallClock(stamp)?.hour ?? -1;
  if (hour < 0) return null;
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** Outbound leg duration, falling back to the whole-trip figure. */
export function outboundMinutes(fare: LatestFare): number | null {
  return fare.duration_to ?? fare.duration ?? null;
}

export type FareFilters = {
  stops: StopsBucket[];
  airlines: string[];
  airports: string[];
  departTimes: TimeSlot[];
  tracking: TrackingState[];
  /** Upper bounds; null means "no limit". */
  maxPrice: number | null;
  maxHours: number | null;
};

export const EMPTY_FILTERS: FareFilters = {
  stops: [],
  airlines: [],
  airports: [],
  departTimes: [],
  tracking: [],
  maxPrice: null,
  maxHours: null,
};

export function activeFilterCount(f: FareFilters): number {
  return (
    f.stops.length +
    f.airlines.length +
    f.airports.length +
    f.departTimes.length +
    f.tracking.length +
    (f.maxPrice === null ? 0 : 1) +
    (f.maxHours === null ? 0 : 1)
  );
}

export type FilterSubject = { fare?: LatestFare | undefined; tracking: boolean };

/*
 * An empty group means "don't filter on this". Once a group narrows anything,
 * a route whose fare lacks that field is excluded — we can't claim a route is
 * 直飛 when the parser never said so.
 */
export function matchesFilters({ fare, tracking }: FilterSubject, f: FareFilters): boolean {
  if (f.tracking.length > 0 && !f.tracking.includes(tracking ? "tracking" : "untracked")) {
    return false;
  }

  const needsFare =
    f.stops.length ||
    f.airlines.length ||
    f.airports.length ||
    f.departTimes.length ||
    f.maxPrice !== null ||
    f.maxHours !== null;
  if (!needsFare) return true;
  if (!fare) return false;

  if (f.stops.length) {
    const bucket = stopsBucket(fare);
    if (!bucket || !f.stops.includes(bucket)) return false;
  }
  if (f.airlines.length && !(fare.airline && f.airlines.includes(fare.airline))) return false;
  if (f.airports.length) {
    const airports = [fare.origin_airport, fare.destination_airport].filter(Boolean);
    if (!airports.some((a) => f.airports.includes(a!))) return false;
  }
  if (f.departTimes.length) {
    const slot = timeSlot(fare.depart_date);
    if (!slot || !f.departTimes.includes(slot)) return false;
  }
  if (f.maxPrice !== null && fare.price > f.maxPrice) return false;
  if (f.maxHours !== null) {
    const minutes = outboundMinutes(fare);
    if (minutes === null || minutes > f.maxHours * 60) return false;
  }
  return true;
}

/** Cheapest published price among fares for which `pick` holds, for the facet hints. */
export function cheapestWhere(
  fares: LatestFare[],
  pick: (fare: LatestFare) => boolean,
): number | null {
  let best: number | null = null;
  for (const fare of fares) {
    if (pick(fare) && (best === null || fare.price < best)) best = fare.price;
  }
  return best;
}
