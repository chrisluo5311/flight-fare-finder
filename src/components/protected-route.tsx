import { useEffect, useState } from "react";
import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

type AuthContext = { user: User };

/** Read the signed-in user from inside a <ProtectedRoute /> subtree. */
export function useAuthenticatedUser(): User {
  return useOutletContext<AuthContext>().user;
}

type AuthState =
  { status: "loading" } | { status: "authenticated"; user: User } | { status: "anonymous" };

/**
 * Client-side replacement for the `_authenticated` layout route's `beforeLoad`
 * guard: gate the subtree on a Supabase session and bounce to /auth without one.
 */
export function ProtectedRoute() {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setState(
        error || !data.user
          ? { status: "anonymous" }
          : { status: "authenticated", user: data.user },
      );
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(
        session?.user ? { status: "authenticated", user: session.user } : { status: "anonymous" },
      );
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (state.status === "loading") {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }
  if (state.status === "anonymous") {
    return <Navigate to="/auth" replace />;
  }
  return <Outlet context={{ user: state.user } satisfies AuthContext} />;
}
