import { Link, NavLink } from "react-router-dom";
import { Plane } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Plane className="size-5 text-primary" aria-hidden />
          <span className="whitespace-nowrap">Flight Price Notifier</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`
            }
          >
            <span className="hidden sm:inline">Pricing / </span>價格
          </NavLink>
          <Link
            to="/auth"
            className="whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 glow-shadow"
          >
            <span className="hidden sm:inline">Sign in / </span>登入
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
      <div className="space-y-1">
        <p>
          客服信箱：
          <a href="mailto:chrislo5311@gmail.com" className="hover:text-foreground">
            chrislo5311@gmail.com
          </a>
        </p>
        <p>
          客服電話：
          <a href="tel:0937938701" className="hover:text-foreground">
            0937938701
          </a>
        </p>
        <p className="pt-2">© 2026 Flight Price Notifier</p>
      </div>
    </footer>
  );
}
