import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "@/components/error-boundary";
import { ProtectedRoute } from "@/components/protected-route";
import { AppPage } from "@/pages/app";
import { AuthPage } from "@/pages/auth";
import { IndexPage } from "@/pages/index";
import { NotFoundPage } from "@/pages/not-found";

const queryClient = new QueryClient();

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/sign-in" element={<AuthPage initialMode="signin" />} />
            <Route path="/sign-up" element={<AuthPage initialMode="signup" />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppPage />} />
            </Route>
            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
