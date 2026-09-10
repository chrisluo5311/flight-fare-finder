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

export type Subscription = {
  email: string;
  route: string;
  plan_name: PlanName;
  origin: string;
  destination: string;
  target_price: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
};

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

export async function saveSubscription(input: {
  email: string;
  plan_name: PlanName;
  target_price: number;
}): Promise<Subscription> {
  const response = await fetch(`${API_BASE}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Subscription;
}
