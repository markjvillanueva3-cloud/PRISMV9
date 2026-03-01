import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { Spinner } from "./components/ui";
import { LearningProvider } from "./contexts/LearningContext";

// Lazy-load pages for code splitting
const SfcCalculatorPage = lazy(() => import("./pages/SfcCalculatorPage"));
const PpgPage = lazy(() => import("./pages/PpgPage"));
const LearningLayout = lazy(() => import("./layouts/LearningLayout"));
const LearningDashboard = lazy(() => import("./pages/LearningDashboard"));
const Assessment = lazy(() => import("./components/learning/Assessment"));
const LearningPath = lazy(() => import("./components/learning/LearningPath"));
const ProgressTracker = lazy(() => import("./components/learning/ProgressTracker"));
const KnowledgeSearch = lazy(() => import("./components/learning/KnowledgeSearch"));
const MaterialWizard = lazy(() => import("./components/learning/MaterialWizard"));
const ToolWizard = lazy(() => import("./components/learning/ToolWizard"));
const MachineWizard = lazy(() => import("./components/learning/MachineWizard"));
const DigitalTwin = lazy(() => import("./components/learning/DigitalTwin"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="lg" />
      <span className="ml-3 text-sm text-slate-500">Loading...</span>
    </div>
  );
}

function LearningPage({ children }: { children: React.ReactNode }) {
  return (
    <LearningProvider>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </LearningProvider>
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
        <Route
          path="/ppg"
          element={
            <Suspense fallback={<PageLoader />}>
              <PpgPage />
            </Suspense>
          }
        />
        <Route
          path="/learning"
          element={
            <LearningPage>
              <LearningLayout />
            </LearningPage>
          }
        >
          <Route index element={<Suspense fallback={<PageLoader />}><LearningDashboard /></Suspense>} />
          <Route path="assessment" element={<Suspense fallback={<PageLoader />}><Assessment /></Suspense>} />
          <Route path="path" element={<Suspense fallback={<PageLoader />}><LearningPath /></Suspense>} />
          <Route path="progress" element={<Suspense fallback={<PageLoader />}><ProgressTracker /></Suspense>} />
          <Route path="knowledge" element={<Suspense fallback={<PageLoader />}><KnowledgeSearch /></Suspense>} />
          <Route path="material" element={<Suspense fallback={<PageLoader />}><MaterialWizard /></Suspense>} />
          <Route path="tool" element={<Suspense fallback={<PageLoader />}><ToolWizard /></Suspense>} />
          <Route path="machine" element={<Suspense fallback={<PageLoader />}><MachineWizard /></Suspense>} />
          <Route path="twin" element={<Suspense fallback={<PageLoader />}><DigitalTwin /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/sfc" replace />} />
      </Route>
    </Routes>
  );
}
