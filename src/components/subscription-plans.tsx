import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, Loader2, Plane } from "lucide-react";

import {
  listSubscriptions,
  saveSubscription,
  type PlanName,
  type Subscription,
} from "@/lib/flight-api";

type Plan = {
  name: PlanName;
  label: string;
  route: string;
  /** Rough current cheapest, shown so people pick a sane budget. Omit if unknown. */
  hint?: number;
};

const PLANS: Plan[] = [
  { name: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", hint: 9325 },
  { name: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", hint: 5989 },
  { name: "london", label: "台北 ✈ 倫敦", route: "TPE-LON", hint: 20528 },
];

const twd = new Intl.NumberFormat("zh-TW");

type CardState = {
  value: string;
  saving: boolean;
  error: string | null;
  justSaved: boolean;
};

const emptyCard: CardState = { value: "", saving: false, error: null, justSaved: false };

export function SubscriptionPlans({ email }: { email: string }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    listSubscriptions(email)
      .then((rows) => {
        if (!cancelled) setSubscriptions(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSubscriptions([]);
          setLoadError(err instanceof Error ? err.message : "無法載入你的訂閱");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  function patch(plan: PlanName, next: Partial<CardState>) {
    setCards((prev) => ({ ...prev, [plan]: { ...prev[plan], ...next } }));
  }

  async function handleSubmit(plan: Plan, event: React.FormEvent) {
    event.preventDefault();
    const raw = cards[plan.name].value.trim();
    const target = Number(raw.replace(/[,\s]/g, ""));
    if (!raw || !Number.isFinite(target) || target <= 0) {
      patch(plan.name, { error: "請輸入一個大於 0 的目標價（新台幣）" });
      return;
    }

    patch(plan.name, { saving: true, error: null, justSaved: false });
    try {
      const saved = await saveSubscription({
        email,
        plan_name: plan.name,
        target_price: Math.round(target),
      });
      setSubscriptions((prev) => {
        const rest = (prev ?? []).filter((s) => s.plan_name !== plan.name);
        return [...rest, saved];
      });
      patch(plan.name, { saving: false, value: "", justSaved: true });
    } catch (err: unknown) {
      patch(plan.name, {
        saving: false,
        error: err instanceof Error ? err.message : "儲存失敗，請再試一次",
      });
    }
  }

  return (
    <section className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">追蹤航線</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          設定目標價，我們每 30 分鐘檢查一次票價，達標就寄信通知你。
        </p>
      </div>

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

          return (
            <form
              key={plan.name}
              onSubmit={(event) => handleSubmit(plan, event)}
              className="flex h-full flex-col rounded-xl border border-border bg-card p-5 text-left"
            >
              {/* Title owns its whole row, so the 已訂閱 badge can never squeeze
                  it onto a second line and knock this card out of alignment
                  with its neighbours. */}
              <div className="flex items-center gap-2 text-base font-semibold">
                <Plane className="size-4 shrink-0 text-primary" aria-hidden />
                <span>{plan.label}</span>
              </div>

              <div className="mt-1 flex min-h-7 items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{plan.route}</p>
                {existing ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <Check className="size-3" aria-hidden />
                    已訂閱
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    載入中…
                  </span>
                ) : existing ? (
                  <>
                    目前目標價{" "}
                    <strong className="font-semibold text-foreground">
                      NT${twd.format(existing.target_price)}
                    </strong>
                  </>
                ) : plan.hint ? (
                  <>目前最低約 NT${twd.format(plan.hint)}</>
                ) : (
                  <>設定一個你願意出手的價格</>
                )}
              </p>

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
                  placeholder={String(existing?.target_price ?? plan.hint ?? "")}
                  value={card.value}
                  onChange={(event) =>
                    patch(plan.name, {
                      value: event.target.value,
                      error: null,
                      justSaved: false,
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={card.saving || loading}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {card.saving ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <BellRing className="size-4" aria-hidden />
                  )}
                  {existing ? "更新目標價" : "開始追蹤"}
                </button>

                {/* Reserved so a status message never changes the card's height
                    and re-breaks the alignment it was meant to preserve. */}
                <p className="mt-2 min-h-4 text-xs" aria-live="polite">
                  {card.error ? (
                    <span className="text-destructive">{card.error}</span>
                  ) : card.justSaved ? (
                    <span className="text-primary">已儲存，達標時就會寄信給你。</span>
                  ) : null}
                </p>
              </div>
            </form>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        通知會寄到 {email}。目前是免費階段，訂閱後就會收到降價通知。
      </p>
    </section>
  );
}
