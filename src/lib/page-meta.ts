import { useEffect } from "react";

type MetaTag = { name?: string; property?: string; content: string };

function upsertMeta({ name, property, content }: MetaTag) {
  const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    if (name) el.setAttribute("name", name);
    if (property) el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Client-side replacement for TanStack Start's route `head()` option: keeps the
 * per-page <title> and meta tags in sync now that there is no SSR shell.
 */
export function usePageMeta(title: string, meta: MetaTag[] = []) {
  useEffect(() => {
    document.title = title;
    for (const tag of meta) upsertMeta(tag);
  }, [title, meta]);
}
