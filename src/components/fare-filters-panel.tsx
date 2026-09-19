import { useId, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  activeFilterCount,
  airlineName,
  cheapestWhere,
  EMPTY_FILTERS,
  outboundMinutes,
  STOPS_BUCKETS,
  stopsBucket,
  TIME_SLOTS,
  timeSlot,
  type FareFilters,
  type TrackingState,
} from "@/lib/fare-details";
import type { LatestFare } from "@/lib/flight-api";

const twd = new Intl.NumberFormat("zh-TW");

type Option<K extends string> = { key: K; label: string; hint?: string | null };

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-sm font-semibold"
      >
        {title}
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? <div className="mt-3 space-y-2.5">{children}</div> : null}
    </div>
  );
}

function CheckGroup<K extends string>({
  options,
  selected,
  onChange,
}: {
  options: Option<K>[];
  selected: K[];
  onChange: (next: K[]) => void;
}) {
  const id = useId();
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">目前沒有資料</p>;
  }
  return (
    <>
      {options.map((opt) => {
        const inputId = `${id}-${opt.key}`;
        return (
          <div key={opt.key} className="flex items-center gap-2.5 text-sm">
            <Checkbox
              id={inputId}
              checked={selected.includes(opt.key)}
              onCheckedChange={() => onChange(toggle(selected, opt.key))}
            />
            <label htmlFor={inputId} className="flex flex-1 cursor-pointer justify-between gap-2">
              <span>{opt.label}</span>
              {opt.hint ? (
                <span className="text-xs tabular-nums text-muted-foreground">{opt.hint}</span>
              ) : null}
            </label>
          </div>
        );
      })}
    </>
  );
}

const priceHint = (n: number | null) => (n === null ? null : `NT$${twd.format(n)}`);

export function FareFiltersPanel({
  fares,
  filters,
  onChange,
  shown,
  total,
}: {
  fares: LatestFare[];
  filters: FareFilters;
  onChange: (next: FareFilters) => void;
  shown: number;
  total: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const set = <K extends keyof FareFilters>(key: K, value: FareFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const airlines = [...new Set(fares.map((f) => f.airline).filter(Boolean) as string[])]
    .map((code) => ({
      key: code,
      label: airlineName(code) ?? code,
      hint: priceHint(cheapestWhere(fares, (f) => f.airline === code)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-TW"));

  const airports = [
    ...new Set(
      fares.flatMap((f) => [f.origin_airport, f.destination_airport]).filter(Boolean) as string[],
    ),
  ]
    .sort()
    .map((code) => ({
      key: code,
      label: code,
      hint: priceHint(
        cheapestWhere(fares, (f) => f.origin_airport === code || f.destination_airport === code),
      ),
    }));

  const stops = STOPS_BUCKETS.map((b) => ({
    ...b,
    hint: priceHint(cheapestWhere(fares, (f) => stopsBucket(f) === b.key)),
  }));

  const times = TIME_SLOTS.map((t) => ({
    key: t.key,
    label: `${t.label} ${t.range}`,
    hint: priceHint(cheapestWhere(fares, (f) => timeSlot(f.depart_date) === t.key)),
  }));

  const tracking: Option<TrackingState>[] = [
    { key: "tracking", label: "我已訂閱" },
    { key: "untracked", label: "尚未訂閱" },
  ];

  const prices = fares.map((f) => f.price);
  const priceMin = prices.length ? Math.min(...prices) : 0;
  const priceMax = prices.length ? Math.max(...prices) : 0;
  const hours = fares.map(outboundMinutes).filter((m): m is number => m !== null);
  const hoursMax = hours.length ? Math.ceil(Math.max(...hours) / 60) : 0;
  const hoursMin = hours.length ? Math.floor(Math.min(...hours) / 60) : 0;

  const count = activeFilterCount(filters);

  return (
    <aside className="w-full lg:sticky lg:top-6 lg:w-64 lg:shrink-0 lg:self-start">
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium lg:hidden"
        aria-expanded={mobileOpen}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        篩選{count ? `（${count}）` : ""}
      </button>

      <div
        className={`rounded-xl border border-border bg-card p-5 ${mobileOpen ? "block" : "hidden"} lg:block`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <SlidersHorizontal className="size-4 text-primary" aria-hidden />
            篩選
          </h3>
          {count ? (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="text-xs font-medium text-primary hover:underline"
            >
              全部清除
            </button>
          ) : null}
        </div>
        <p className="mb-4 text-xs text-muted-foreground" aria-live="polite">
          顯示 <strong className="text-foreground">{shown}</strong>/{total} 條航線
        </p>

        <Section title="轉機">
          <CheckGroup options={stops} selected={filters.stops} onChange={(v) => set("stops", v)} />
        </Section>

        <Section title="去程起飛時間">
          <CheckGroup
            options={times}
            selected={filters.departTimes}
            onChange={(v) => set("departTimes", v)}
          />
        </Section>

        <Section title="航空公司">
          <CheckGroup
            options={airlines}
            selected={filters.airlines}
            onChange={(v) => set("airlines", v)}
          />
        </Section>

        <Section title="價格">
          {prices.length ? (
            <>
              <p className="text-xs text-muted-foreground">
                最高 NT${twd.format(filters.maxPrice ?? priceMax)}
              </p>
              <Slider
                aria-label="最高價格"
                min={priceMin}
                max={priceMax}
                step={100}
                value={[filters.maxPrice ?? priceMax]}
                onValueChange={([v]) => set("maxPrice", v! >= priceMax ? null : v!)}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">目前沒有資料</p>
          )}
        </Section>

        <Section title="去程飛行時間">
          {hours.length ? (
            <>
              <p className="text-xs text-muted-foreground">
                {filters.maxHours === null ? "不限" : `${filters.maxHours} 小時以內`}
              </p>
              <Slider
                aria-label="去程最長飛行時間"
                min={hoursMin}
                max={hoursMax}
                step={1}
                value={[filters.maxHours ?? hoursMax]}
                onValueChange={([v]) => set("maxHours", v! >= hoursMax ? null : v!)}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">目前沒有資料</p>
          )}
        </Section>

        <Section title="機場" defaultOpen={false}>
          <CheckGroup
            options={airports}
            selected={filters.airports}
            onChange={(v) => set("airports", v)}
          />
        </Section>

        <Section title="訂閱狀態">
          <CheckGroup
            options={tracking}
            selected={filters.tracking}
            onChange={(v) => set("tracking", v)}
          />
        </Section>
      </div>
    </aside>
  );
}
