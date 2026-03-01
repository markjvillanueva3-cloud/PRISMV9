import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { Spinner } from "./components/ui";

// Lazy-load pages for code splitting
const SfcCalculatorPage = lazy(() => import("./pages/SfcCalculatorPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="lg" />
      <span className="ml-3 text-sm text-slate-500">Loading...</span>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          path="/sfc"
          element={
            <Suspense fallback={<PageLoader />}>
              <SfcCalculatorPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/sfc" replace />} />
      </Route>
    </Routes>
  );
}
