import { Link } from "react-router-dom";
import { Check, RotateCcw } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-layout";
import { MONTHLY_PRICE_TWD } from "@/lib/flight-api";
import { usePageMeta } from "@/lib/page-meta";

const YEARLY_PRICE_TWD = 3000;
const YEARLY_PER_MONTH_TWD = YEARLY_PRICE_TWD / 12;
const YEARLY_SAVING_TWD = MONTHLY_PRICE_TWD * 12 - YEARLY_PRICE_TWD;

const twd = new Intl.NumberFormat("zh-TW");

const PAGE_META = [
  {
    name: "description",
    content: `Flight Price Notifier 訂閱方案：月繳 NT$${MONTHLY_PRICE_TWD}／月，年繳 NT$${YEARLY_PRICE_TWD}／年。隨時可取消。`,
  },
];

const INCLUDED = [
  "追蹤台北出發熱門航線（東京、首爾、倫敦）",
  "自訂目標價，每 30 分鐘自動檢查票價",
  "達標即寄 email 通知，附訂購連結",
  "隨時可取消，沒有綁約",
];

type Tier = {
  name: string;
  subtitle: string;
  price: number;
  unit: string;
  note: string;
  badge?: string;
  highlighted?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "月繳",
    subtitle: "Monthly",
    price: MONTHLY_PRICE_TWD,
    unit: "／月",
    note: "按月付費，彈性最大",
  },
  {
    name: "年繳",
    subtitle: "Yearly",
    price: YEARLY_PRICE_TWD,
    unit: "／年",
    note: `平均 NT$${twd.format(YEARLY_PER_MONTH_TWD)}／月，一年省 NT$${twd.format(YEARLY_SAVING_TWD)}`,
    badge: "最划算",
    highlighted: true,
  },
];

function TierCard({ tier }: { tier: Tier }) {
  return (
    <article
      className={`relative flex flex-col rounded-2xl border bg-card p-6 sm:p-8 ${
        tier.highlighted ? "border-primary glow-shadow" : "border-border"
      }`}
    >
      {tier.badge ? (
        <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          {tier.badge}
        </span>
      ) : null}
      <h2 className="text-lg font-semibold text-card-foreground">{tier.name}</h2>
      <p className="mt-1 text-sm font-medium text-primary">{tier.subtitle}</p>
      <p className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-card-foreground">
          NT${twd.format(tier.price)}
        </span>
        <span className="text-base text-muted-foreground">{tier.unit}</span>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{tier.note}</p>
      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {INCLUDED.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span className="text-card-foreground">{item}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/auth"
        className={`mt-8 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all hover:opacity-90 ${
          tier.highlighted
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background text-foreground"
        }`}
      >
        開始訂閱
      </Link>
    </article>
  );
}

export function PricingPage() {
  usePageMeta("Pricing 價格方案 — Flight Price Notifier", PAGE_META);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="hero-glow">
          <div className="mx-auto max-w-3xl px-4 pt-20 pb-12 text-center sm:px-6 sm:pt-24">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">價格方案</h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Simple pricing — 一個方案，所有功能。選擇月繳或年繳。
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {TIERS.map((tier) => (
              <TierCard key={tier.name} tier={tier} />
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            以上價格皆以新台幣（TWD）計價。
          </p>
        </section>
        <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <RotateCcw className="size-5 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-card-foreground">退款規則</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              隨時可取消，取消後下個月不再扣款。
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
