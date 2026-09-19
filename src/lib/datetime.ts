/* Every timestamp the API returns is a UTC instant (the Lambdas all use
   datetime.now(timezone.utc)). Users are in Taiwan, so anything shown on screen
   has to be rendered in Asia/Taipei — not in UTC, and not in the browser's local
   zone, which would quietly disagree for anyone travelling.

   The backend also sends current_period_end_date, a YYYY-MM-DD string sliced out
   of the *UTC* instant. It reads one day early whenever the instant falls at or
   after 16:00 UTC — midnight Taipei or later — which is most of a Taiwanese
   evening. Prefer the instant; keep that string only as a fallback for rows
   written before the instant existed. */

const TIME_ZONE = "Asia/Taipei";

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function parse(instant?: string | null): Date | null {
  if (!instant) return null;
  const parsed = new Date(instant);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** A UTC instant as a Taipei calendar date, e.g. "2026/10/13". */
export function taipeiDate(instant?: string | null): string | null {
  const parsed = parse(instant);
  return parsed ? dateFormatter.format(parsed) : null;
}

/** A UTC instant as a Taipei date and time, e.g. "2026/10/13 20:14". */
export function taipeiDateTime(instant?: string | null): string | null {
  const parsed = parse(instant);
  return parsed ? dateTimeFormatter.format(parsed) : null;
}

/**
 * The paid-through date to show for a subscription.
 *
 * Uses the UTC instant when present so the date is the one that actually
 * applies in Taiwan; falls back to the server-sliced date string otherwise.
 */
export function periodEndLabel(subscription: {
  current_period_end?: string;
  current_period_end_date?: string;
}): string | null {
  return (
    taipeiDate(subscription.current_period_end) ?? subscription.current_period_end_date ?? null
  );
}
