import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BellRing, Check, CreditCard, Loader2, Plane, RotateCcw, X } from "lucide-react";

import {
  cancelSubscription,
  getLatestFares,
  handOffToCheckout,
  listSubscriptions,
  saveSubscription,
  MONTHLY_PRICE_TWD,
  type LatestFare,
  type PlanName,
  type Subscription,
} from "@/lib/flight-api";
import { periodEndLabel } from "@/lib/datetime";

type Plan = {
  name: PlanName;
  label: string;
  route: string;
};

/* No hard-coded price hints. The reference price comes from GET /fares, which
   serves what the parser actually saw on its last sweep — a stale constant
   labelled 目前最低價 is worse than showing nothing. */
const PLANS: Plan[] = [
  { name: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO" },
  { name: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL" },
  { name: "london", label: "台北 ✈ 倫敦", route: "TPE-LON" },
];

const twd = new Intl.NumberFormat("zh-TW");

/**
 * What the card shows. "legacy" is a row created before the paywall existed —
 * it has no subscription_status, so the parser no longer alerts it. Showing it
 * as 已訂閱 (what the M1 UI did) would be a lie.
 */
type CardStatus = "none" | "legacy" | "pending_payment" | "active" | "cancelled" | "expired";

function statusOf(existing: Subscription | undefined): CardStatus {
  if (!existing) return "none";
  return existing.subscription_status ?? "legacy";
}

const BADGES: Partial<Record<CardStatus, { text: string; className: string }>> = {
  active: {
    text: "已訂閱（有效）",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  legacy: {
    text: "需完成付款",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  pending_payment: {
    text: "未完成付款",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  cancelled: {
    text: "已取消",
    className: "border-border bg-muted text-muted-foreground",
  },
  expired: {
    text: "已結束",
    className: "border-border bg-muted text-muted-foreground",
  },
};

function actionLabel(status: CardStatus): string {
  switch (status) {
    case "active":
    case "cancelled":
      return "更新目標價";
    case "pending_payment":
    case "legacy":
      return "完成付款";
    case "expired":
      return "重新訂閱";
    default:
      return "開始追蹤";
  }
}

type CardState = {
  value: string;
  saving: boolean;
  cancelling: boolean;
  error: string | null;
  notice: string | null;
};

const emptyCard: CardState = {
  value: "",
  saving: false,
  cancelling: false,
  error: null,
  notice: null,
};

export function SubscriptionPlans({ email }: { email: string }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchase, setPurchase] = useState<string | null>(null);
  const [fares, setFares] = useState<Record<string, LatestFare>>({});
  const [cards, setCards] = useState<Record<PlanName, CardState>>({
    tokyo: emptyCard,
    seoul: emptyCard,
    london: emptyCard,
  });

  const byPlan = useMemo(() => {
    const map = {} as Partial<Record<PlanName, Subscription>>;
    for (const s of subscriptions ?? []) map[s.plan_name] = s;
    return map;
  }, [subscriptions]);

  const refresh = useCallback(async () => {
    const rows = await listSubscriptions(email);
    setSubscriptions(rows);
    return rows;
  }, [email]);

  useEffect(() => {
    let cancelled = false;
    getLatestFares()
      .then((f) => {
        if (!cancelled) setFares(f);
      })
      .catch(() => {
        /* reference prices are decoration — never block the cards on them */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Handing off to ECPay replaces the document, so coming back lands on a
   * bfcache-restored page whose React state predates the /subscribe call — the
   * card would still read 開始追蹤 even though a pending_payment row now exists.
   * Re-read on restore and on tab re-focus so abandoning checkout shows
   * 未完成付款 immediately instead of needing a manual reload.
   */
  useEffect(() => {
    const reread = () => {
      refresh().catch(() => {
        /* a failed background refresh should not clobber what is on screen */
      });
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reread();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") reread();
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    refresh().catch((err: unknown) => {
      if (!cancelled) {
        setSubscriptions([]);
        setLoadError(err instanceof Error ? err.message : "無法載入你的訂閱");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  /* Read ?purchase= once, then strip it so a refresh does not replay the banner. */
  const purchaseHandled = useRef(false);
  useEffect(() => {
    if (purchaseHandled.current) return;
    const flag = searchParams.get("purchase");
    if (!flag) return;
    purchaseHandled.current = true;
    setPurchase(flag);
    const next = new URLSearchParams(searchParams);
    next.delete("purchase");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  /*
   * ECPay returns the browser via OrderResultURL at more or less the same
   * moment it POSTs the server-to-server ReturnURL, so the row may still read
   * pending_payment on the first load after paying. Poll briefly rather than
   * showing the user a stale "未完成付款" on a payment that just succeeded.
   */
  useEffect(() => {
    if (purchase !== "success") return;
    let attempts = 0;
    let stop = false;
    const tick = async () => {
      if (stop || attempts >= 5) return;
      attempts += 1;
      try {
        const rows = await refresh();
        const settled = rows.some((r) => r.subscription_status === "active");
        if (!settled && !stop) window.setTimeout(tick, 2000);
      } catch {
        /* the banner already tells them it went through; leave the list alone */
      }
    };
    const timer = window.setTimeout(tick, 1500);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [purchase, refresh]);

  function patch(plan: PlanName, next: Partial<CardState>) {
    setCards((prev) => ({ ...prev, [plan]: { ...prev[plan], ...next } }));
  }

  async function handleSubmit(plan: Plan, event: React.FormEvent) {
    event.preventDefault();
    const existing = byPlan[plan.name];
    const raw = cards[plan.name].value.trim();

    /* Blank input on an existing row means "keep the target I already set" —
       which is what 完成付款 on an unpaid row should do. */
    const target = raw ? Number(raw.replace(/[,\s]/g, "")) : (existing?.target_price ?? NaN);
    if (!Number.isFinite(target) || target <= 0) {
      patch(plan.name, { error: "請輸入一個大於 0 的目標價（新台幣）" });
      return;
    }

    patch(plan.name, { saving: true, error: null, notice: null });
    try {
      const result = await saveSubscription({
        email,
        plan_name: plan.name,
        target_price: Math.round(target),
      });

      if (result.kind === "checkout") {
        /* Navigates away to ECPay's cashier — nothing below this runs. */
        handOffToCheckout(result.html);
        return;
      }

      setSubscriptions((prev) => {
        const rest = (prev ?? []).filter((s) => s.plan_name !== plan.name);
        return [...rest, result.subscription];
      });
      patch(plan.name, { saving: false, value: "", notice: "目標價已更新。" });
    } catch (err: unknown) {
      patch(plan.name, {
        saving: false,
        error: err instanceof Error ? err.message : "儲存失敗，請再試一次",
      });
    }
  }

  async function handleCancel(plan: Plan) {
    const existing = byPlan[plan.name];
    if (!existing) return;
    const ok = window.confirm(
      `取消 ${plan.label} 的訂閱？\n\n之後不會再自動扣款，但在本期結束前你仍然會收到降價通知。`,
    );
    if (!ok) return;

    patch(plan.name, { cancelling: true, error: null, notice: null });
    try {
      await cancelSubscription({ email, route: existing.route });
      await refresh();
      patch(plan.name, { cancelling: false, notice: "已取消，本期結束前仍會通知你。" });
    } catch (err: unknown) {
      patch(plan.name, {
        cancelling: false,
        error: err instanceof Error ? err.message : "取消失敗，請再試一次",
      });
    }
  }

  return (
    <section className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">追蹤航線</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          設定目標價，我們每 30 分鐘檢查一次票價，達標就寄信通知你。月費 NT$
          {twd.format(MONTHLY_PRICE_TWD)}，隨時可取消。
        </p>
      </div>

      {purchase === "success" ? (
        <p className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
          付款完成，訂閱處理中——狀態最慢幾秒內就會更新為「已訂閱」。
        </p>
      ) : null}
      {purchase === "failed" ? (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          這次付款沒有完成，訂閱尚未生效。你可以在下方按「完成付款」再試一次。
        </p>
      ) : null}

      {loadError ? (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const existing = byPlan[plan.name];
          const card = cards[plan.name];
          const loading = subscriptions === null;
          const status = statusOf(existing);
          const fare = fares[plan.route];
          const badge = BADGES[status];
          const needsPayment = status === "pending_payment" || status === "legacy";

          return (
            <form
              key={plan.name}
              onSubmit={(event) => handleSubmit(plan, event)}
              className="flex h-full flex-col rounded-xl border border-border bg-card p-5 text-left"
            >
              {/* Title owns its whole row, so the status badge can never squeeze
                  it onto a second line and knock this card out of alignment
                  with its neighbours. */}
              <div className="flex items-center gap-2 text-base font-semibold">
                <Plane className="size-4 shrink-0 text-primary" aria-hidden />
                <span>{plan.label}</span>
              </div>

              <div className="mt-1 flex min-h-7 items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{plan.route}</p>
                {badge ? (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.className}`}
                  >
                    {status === "active" ? <Check className="size-3" aria-hidden /> : null}
                    {badge.text}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                {fare ? (
                  <p className="text-xs">
                    目前最低價約{" "}
                    {/* The figure and its qualifier break as one unit, so a
                        narrow card never strands （參考） on its own line. */}
                    <span className="whitespace-nowrap">
                      <strong className="font-medium text-foreground">
                        NT${twd.format(fare.price)}
                      </strong>
                      （參考）
                    </span>
                  </p>
                ) : null}

                {loading ? (
                  <p className="inline-flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    載入中…
                  </p>
                ) : existing ? (
                  <>
                    <p>
                      目前目標價{" "}
                      <strong className="font-semibold text-foreground">
                        NT${twd.format(existing.target_price)}
                      </strong>
                    </p>
                    {status === "cancelled" ? (
                      <p className="text-xs">
                        有效至 {periodEndLabel(existing) ?? "本期結束"}
                        ，在那之前仍會通知你。
                      </p>
                    ) : null}
                    {status === "pending_payment" ? (
                      <p className="text-xs">尚未完成付款，付款後才會開始通知。</p>
                    ) : null}
                    {status === "legacy" ? (
                      <p className="text-xs">
                        這筆訂閱建立於付費機制上線前，完成付款後才會繼續通知。
                      </p>
                    ) : null}
                    {status === "expired" ? <p className="text-xs">訂閱已結束。</p> : null}
                  </>
                ) : (
                  <p>設定一個你願意出手的價格</p>
                )}
              </div>

              {/* mt-auto pins the input block to the bottom of every card, so the
                  labels, inputs and buttons line up across the row regardless of
                  how tall the text above them is. */}
              <div className="mt-auto pt-4">
                <label
                  className="block text-xs font-medium text-muted-foreground"
                  htmlFor={`target-${plan.name}`}
                >
                  {existing ? "新的目標價（NT$）" : "目標價（NT$）"}
                </label>
                <input
                  id={`target-${plan.name}`}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={String(existing?.target_price ?? fare?.price ?? "")}
                  value={card.value}
                  onChange={(event) =>
                    patch(plan.name, {
                      value: event.target.value,
                      error: null,
                      notice: null,
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={card.saving || card.cancelling || loading}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {card.saving ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : needsPayment ? (
                    <CreditCard className="size-4" aria-hidden />
                  ) : status === "expired" ? (
                    <RotateCcw className="size-4" aria-hidden />
                  ) : (
                    <BellRing className="size-4" aria-hidden />
                  )}
                  {actionLabel(status)}
                </button>

                {status === "active" ? (
                  <button
                    type="button"
                    onClick={() => handleCancel(plan)}
                    disabled={card.cancelling || card.saving}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {card.cancelling ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <X className="size-3.5" aria-hidden />
                    )}
                    取消訂閱
                  </button>
                ) : null}

                {existing && status === "active" && periodEndLabel(existing) ? (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    下次扣款 {periodEndLabel(existing)}
                  </p>
                ) : null}

                {/* Reserved so a status message never changes the card's height
                    and re-breaks the alignment it was meant to preserve. */}
                <p className="mt-2 min-h-4 text-xs" aria-live="polite">
                  {card.error ? (
                    <span className="text-destructive">{card.error}</span>
                  ) : card.notice ? (
                    <span className="text-primary">{card.notice}</span>
                  ) : null}
                </p>
              </div>
            </form>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        通知會寄到 {email}。付款由綠界科技處理，我們不會接觸到你的卡號。
      </p>
    </section>
  );
}
