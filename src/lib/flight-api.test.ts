import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelSubscription,
  getLatestFares,
  listSubscriptions,
  saveSubscription,
  type Subscription,
} from "./flight-api";

const API_BASE = "https://flight-api.test";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listSubscriptions", () => {
  it("requests the caller's email and unwraps the list", async () => {
    const subscription: Subscription = {
      email: "a+b@example.com",
      route: "TPE-TYO",
      plan_name: "tokyo",
      origin: "TPE",
      destination: "TYO",
      target_price: 9000,
      currency: "TWD",
    };
    fetchMock.mockResolvedValue(jsonResponse({ subscriptions: [subscription] }));

    await expect(listSubscriptions("a+b@example.com")).resolves.toEqual([subscription]);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${API_BASE}/subscriptions?email=a%2Bb%40example.com`);
    // Back-navigation from ECPay must not be served a stale cached list.
    expect(init).toMatchObject({ cache: "no-store" });
  });

  it("returns an empty list when the body carries no subscriptions", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(listSubscriptions("x@example.com")).resolves.toEqual([]);
  });

  it("surfaces the server's error message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "email 不存在" }, { status: 404 }));
    await expect(listSubscriptions("x@example.com")).rejects.toThrow("email 不存在");
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    await expect(listSubscriptions("x@example.com")).rejects.toThrow("HTTP 500");
  });
});

describe("saveSubscription", () => {
  const input = { email: "x@example.com", plan_name: "tokyo" as const, target_price: 9000 };

  it("returns the raw HTML for the ECPay checkout branch", async () => {
    fetchMock.mockResolvedValue(
      new Response("<form id='ecpay'></form>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );

    await expect(saveSubscription(input)).resolves.toEqual({
      kind: "checkout",
      html: "<form id='ecpay'></form>",
    });
  });

  it("returns the parsed subscription for the in-place update branch", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ email: "x@example.com", route: "TPE-TYO" }));

    const result = await saveSubscription(input);
    expect(result.kind).toBe("updated");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: "POST" });
  });
});

describe("cancelSubscription", () => {
  it("POSTs the route and returns the updated subscription", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ subscription_status: "cancelled" }));

    await expect(
      cancelSubscription({ email: "x@example.com", route: "TPE-TYO" }),
    ).resolves.toMatchObject({ subscription_status: "cancelled" });
    expect(fetchMock.mock.calls[0]![0]).toBe(`${API_BASE}/cancel`);
  });
});

describe("getLatestFares", () => {
  it("returns an empty map rather than guessing a price when nothing is published", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(getLatestFares()).resolves.toEqual({});
  });

  it("keys published fares by route", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        fares: { "TPE-TYO": { route: "TPE-TYO", month: "2026-11", price: 8200, currency: "TWD" } },
      }),
    );
    const fares = await getLatestFares();
    expect(fares["TPE-TYO"]?.price).toBe(8200);
  });
});
