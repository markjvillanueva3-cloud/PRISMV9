import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { Spinner } from "./components/ui";
import { LearningProvider } from "./contexts/LearningContext";
import { ErpProvider } from "./contexts/ErpContext";

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

// Standalone pages
const CamStrategyPage = lazy(() => import("./pages/CamStrategyPage"));
const DataManagementPage = lazy(() => import("./pages/DataManagementPage"));
const SafetyDashboardPage = lazy(() => import("./pages/SafetyDashboardPage"));

// ERP module
const ErpLayout = lazy(() => import("./layouts/ErpLayout"));
const ErpDashboard = lazy(() => import("./pages/ErpDashboard"));
const QuoteGenerator = lazy(() => import("./components/erp/QuoteGenerator"));
const JobPlanner = lazy(() => import("./components/erp/JobPlanner"));
const ScheduleView = lazy(() => import("./components/erp/ScheduleView"));
const JobTracker = lazy(() => import("./components/erp/JobTracker"));
const CapacityDashboard = lazy(() => import("./components/erp/CapacityDashboard"));
const PredictiveMaintenance = lazy(() => import("./components/erp/PredictiveMaintenance"));
const Inventory = lazy(() => import("./components/erp/Inventory"));
const ReportBuilder = lazy(() => import("./components/erp/ReportBuilder"));

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
        <Route
          path="/cam"
          element={<Suspense fallback={<PageLoader />}><CamStrategyPage /></Suspense>}
        />
        <Route
          path="/data"
          element={<Suspense fallback={<PageLoader />}><DataManagementPage /></Suspense>}
        />
        <Route
          path="/safety"
          element={<Suspense fallback={<PageLoader />}><SafetyDashboardPage /></Suspense>}
        />
        <Route
          path="/erp"
          element={
            <ErpProvider>
              <Suspense fallback={<PageLoader />}>
                <ErpLayout />
              </Suspense>
            </ErpProvider>
          }
        >
          <Route index element={<Suspense fallback={<PageLoader />}><ErpDashboard /></Suspense>} />
          <Route path="quote" element={<Suspense fallback={<PageLoader />}><QuoteGenerator /></Suspense>} />
          <Route path="jobs" element={<Suspense fallback={<PageLoader />}><JobPlanner /></Suspense>} />
          <Route path="schedule" element={<Suspense fallback={<PageLoader />}><ScheduleView /></Suspense>} />
          <Route path="tracker" element={<Suspense fallback={<PageLoader />}><JobTracker /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<PageLoader />}><CapacityDashboard /></Suspense>} />
          <Route path="maintenance" element={<Suspense fallback={<PageLoader />}><PredictiveMaintenance /></Suspense>} />
          <Route path="inventory" element={<Suspense fallback={<PageLoader />}><Inventory /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportBuilder /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/sfc" replace />} />
      </Route>
    </Routes>
  );
}
