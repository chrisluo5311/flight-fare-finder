import { Link } from "react-router-dom";
import { Bell, Plane, XCircle } from "lucide-react";

import { useReveal } from "@/hooks/use-reveal";
import { usePageMeta } from "@/lib/page-meta";

const PAGE_META = [
  {
    name: "description",
    content:
      "設定航線與目標價，機票降價就通知你。Set a route and a target price — we email you when the fare drops.",
  },
  { property: "og:title", content: "Flight Price Notifier — 機票降價通知" },
  {
    property: "og:description",
    content: "Set a route and a target price — we email you when the fare drops.",
  },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
];

const features = [
  {
    icon: Plane,
    title: "盯緊熱門航線",
    subtitle: "Always-on route watching",
    body: "持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。",
  },
  {
    icon: Bell,
    title: "達標自動通知",
    subtitle: "Target-price email alerts",
    body: "低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。",
  },
  {
    icon: XCircle,
    title: "隨時取消",
    subtitle: "Cancel anytime",
    body: "月訂閱制，不想用隨時停，沒有綁約。",
  },
];

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Plane className="size-5 text-primary" aria-hidden />
          <span>Flight Price Notifier</span>
        </Link>
        <Link
          to="/auth"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 glow-shadow"
        >
          Sign in / 登入
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero-glow">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <p className="mb-4 rounded-full border border-primary/40 bg-accent px-3 py-1 text-xs font-medium text-primary">
          台北出發 · 熱門航線最低價追蹤
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Flight Price Notifier</h1>
        <p className="mt-6 text-xl font-medium text-foreground sm:text-2xl">
          設定航線與目標價，機票降價就通知你
        </p>
        <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
          Set a route and a target price — we email you when the fare drops.
        </p>
        <Link
          to="/auth"
          className="mt-10 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground transition-all hover:opacity-90 glow-shadow"
        >
          Sign in / 登入
        </Link>
      </div>
    </section>
  );
}

function FeatureCard({ feature, delay }: { feature: (typeof features)[number]; delay: number }) {
  const { ref, props } = useReveal();
  return (
    <article
      ref={ref}
      {...props}
      style={{ transitionDelay: `${delay}ms` }}
      className="fade-up rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <div className="mb-4 inline-flex rounded-xl bg-accent p-3">
        <feature.icon className="size-6 text-primary" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-card-foreground">{feature.title}</h3>
      <p className="mt-1 text-sm font-medium text-primary">{feature.subtitle}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
    </article>
  );
}

export function IndexPage() {
  usePageMeta("Flight Price Notifier — 機票降價通知", PAGE_META);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((f, i) => (
              <FeatureCard key={f.title} feature={f} delay={i * 120} />
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 Flight Price Notifier
      </footer>
    </div>
  );
}
