import { useNavigate } from "react-router-dom";
import { LogOut, Plane } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthenticatedUser } from "@/components/protected-route";
import { SubscriptionPlans } from "@/components/subscription-plans";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/lib/page-meta";

export function AppPage() {
  usePageMeta("Dashboard — Flight Price Notifier");

  const user = useAuthenticatedUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col hero-glow">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Plane className="size-5 text-primary" aria-hidden />
            <span>Flight Price Notifier</span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <LogOut className="size-4" aria-hidden />
            Sign Out / 登出
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hi {user.email}</h1>
        <p className="mt-2 mb-10 text-muted-foreground">
          選一條航線、設定你的目標價，票價一到就寄信通知你。
        </p>
        <SubscriptionPlans email={user.email ?? ""} />
      </main>
    </div>
  );
}
