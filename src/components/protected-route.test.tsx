import { render, screen } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute, useAuthenticatedUser } from "./protected-route";

const getUser = vi.fn();
const onAuthStateChange = vi.fn();
const unsubscribe = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => getUser(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChange(...args),
    },
  },
}));

const user = { id: "user-1", email: "chris@example.com" } as User;

function renderGuardedApp() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/auth" element={<p>auth page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<Dashboard />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function Dashboard() {
  return <p>Hi {useAuthenticatedUser().email}</p>;
}

beforeEach(() => {
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
});

describe("ProtectedRoute", () => {
  it("renders the guarded route for a signed-in user", async () => {
    getUser.mockResolvedValue({ data: { user }, error: null });

    renderGuardedApp();

    expect(await screen.findByText("Hi chris@example.com")).toBeInTheDocument();
  });

  it("redirects to /auth when there is no session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    renderGuardedApp();

    expect(await screen.findByText("auth page")).toBeInTheDocument();
  });

  it("redirects to /auth when Supabase answers with an error", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("network down") });

    renderGuardedApp();

    expect(await screen.findByText("auth page")).toBeInTheDocument();
  });

  it("shows a busy placeholder instead of flashing the sign-in page while loading", () => {
    getUser.mockReturnValue(new Promise(() => {}));

    const { container } = renderGuardedApp();

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText("auth page")).toBeNull();
  });

  it("unsubscribes from auth changes on unmount", async () => {
    getUser.mockResolvedValue({ data: { user }, error: null });

    const { unmount } = renderGuardedApp();
    await screen.findByText("Hi chris@example.com");
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
