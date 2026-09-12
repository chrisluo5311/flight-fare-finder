/**
 * Flight Price Notifier API (AWS API Gateway → Lambda → DynamoDB).
 *
 * The browser holds no AWS credentials — it only talks to this HTTP API.
 * Override the base URL with VITE_FLIGHT_API_URL when pointing at another stack.
 */
const API_BASE = (
  import.meta.env["VITE_FLIGHT_API_URL"] ?? "https://nsa7mjdxz7.execute-api.us-east-1.amazonaws.com"
).replace(/\/$/, "");

export type PlanName = "tokyo" | "seoul" | "london";

/**
 * Lifecycle: pending_payment → active ⇄ (target updates) → cancelled (grace,
 * still alerted) → expired. Only the ECPay callbacks write `active`; cancelling
 * writes `cancelled`, and the parser lazily expires it once the paid-through
 * date passes.
 *
 * Rows created before M2 have no status at all. They are legacy and are no
 * longer alerted, so the UI must surface them as needing payment rather than
 * as subscribed.
 */
export type SubscriptionStatus = "pending_payment" | "active" | "cancelled" | "expired";

export type Subscription = {
  email: string;
  route: string;
  plan_name: PlanName;
  origin: string;
  destination: string;
  target_price: number;
  currency: string;
  subscription_status?: SubscriptionStatus;
  /** Sortable UTC instant at which the paid-through period ends. */
  current_period_end?: string;
  /** Human YYYY-MM-DD of the same thing, for display. */
  current_period_end_date?: string;
  merchant_trade_no?: string;
  created_at?: string;
  updated_at?: string;
};

/** The monthly price. Mirrors `amount` in the flight/ecpay secret. */
export const MONTHLY_PRICE_TWD = 300;

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body?.error) return body.error;
  } catch {
    /* fall through to the status text */
  }
  return `請求失敗（HTTP ${response.status}）`;
}

export async function listSubscriptions(email: string): Promise<Subscription[]> {
  const response = await fetch(`${API_BASE}/subscriptions?email=${encodeURIComponent(email)}`);
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { subscriptions?: Subscription[] };
  return body.subscriptions ?? [];
}

/**
 * POST /subscribe answers one of two content types, and calling `res.json()`
 * unconditionally — as the M1 client did — throws on the HTML branch and
 * leaves the button silently doing nothing.
 *
 *   text/html        → an ECPay auto-submit checkout form. Hand it to the
 *                      browser; its inline script POSTs to ECPay's cashier.
 *   application/json → an in-place update for someone already active (or
 *                      cancelled-in-grace). No re-payment.
 */
export type SaveResult =
  { kind: "checkout"; html: string } | { kind: "updated"; subscription: Subscription };

export async function saveSubscription(input: {
  email: string;
  plan_name: PlanName;
  target_price: number;
}): Promise<SaveResult> {
  const response = await fetch(`${API_BASE}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    return { kind: "checkout", html: await response.text() };
  }
  return { kind: "updated", subscription: (await response.json()) as Subscription };
}

/**
 * Replace the document with ECPay's form so its inline script can auto-submit.
 * This navigates away from the SPA — nothing after it will run.
 */
export function handOffToCheckout(html: string): void {
  document.open();
  document.write(html);
  document.close();
}

export async function cancelSubscription(input: {
  email: string;
  route: string;
}): Promise<Subscription> {
  const response = await fetch(`${API_BASE}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Subscription;
}

/** The cheapest fare the last parser run saw, published per route. */
export type LatestFare = {
  route: string;
  month: string;
  price: number;
  currency: string;
  airline?: string;
  depart_date?: string;
  return_date?: string;
  checked_at?: string;
  price_usd?: number;
};

/**
 * Reference prices for every tracked route, keyed by route ("TPE-TYO").
 *
 * Served from what the parser already fetched on its last 30-minute sweep, so
 * showing it costs no extra travelpayouts quota. A route is simply absent if
 * nothing has been published for it yet — never guess a number here, a stale
 * hard-coded hint is worse than showing none.
 */
export async function getLatestFares(): Promise<Record<string, LatestFare>> {
  const response = await fetch(`${API_BASE}/fares`);
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { fares?: Record<string, LatestFare> };
  return body.fares ?? {};
}
