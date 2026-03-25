import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { Spinner } from "./components/ui";
import { LearningProvider } from "./contexts/LearningContext";
import { ErpProvider } from "./contexts/ErpContext";

// Lazy-load pages for code splitting

// Core
const SfcCalculatorPage = lazy(() => import("./pages/SfcCalculatorPage"));
const PpgPage = lazy(() => import("./pages/PpgPage"));
const CamStrategyPage = lazy(() => import("./pages/CamStrategyPage"));

// Shop (named exports)
const ShopDashboardPage = lazy(() => import("./pages/ShopDashboardPage").then(m => ({ default: m.DashboardPage })));
const JobsPage = lazy(() => import("./pages/JobsPage").then(m => ({ default: m.JobsPage })));
const SchedulingPage = lazy(() => import("./pages/SchedulingPage").then(m => ({ default: m.SchedulingPage })));
const CapacityPlanningPage = lazy(() => import("./pages/CapacityPlanningPage").then(m => ({ default: m.CapacityPlanningPage })));
const InventoryPage = lazy(() => import("./pages/InventoryPage").then(m => ({ default: m.InventoryPage })));
const BatchPlanningPage = lazy(() => import("./pages/BatchPlanningPage").then(m => ({ default: m.BatchPlanningPage })));

// Quoting (named exports)
const QuoteBuilderPage = lazy(() => import("./pages/QuoteBuilderPage").then(m => ({ default: m.QuoteBuilderPage })));
const BlueprintQuotePage = lazy(() => import("./pages/BlueprintQuotePage").then(m => ({ default: m.BlueprintQuotePage })));
const SheetMetalQuotePage = lazy(() => import("./pages/SheetMetalQuotePage").then(m => ({ default: m.SheetMetalQuotePage })));
const AdditiveQuotePage = lazy(() => import("./pages/AdditiveQuotePage").then(m => ({ default: m.AdditiveQuotePage })));
const InjectionMoldPage = lazy(() => import("./pages/InjectionMoldPage").then(m => ({ default: m.InjectionMoldPage })));
const QuoteAnalyticsPage = lazy(() => import("./pages/QuoteAnalyticsPage").then(m => ({ default: m.QuoteAnalyticsPage })));
const SecondaryOpsPage = lazy(() => import("./pages/SecondaryOpsPage").then(m => ({ default: m.SecondaryOpsPage })));
const MaterialPricingPage = lazy(() => import("./pages/MaterialPricingPage").then(m => ({ default: m.MaterialPricingPage })));
const StockOptimizerPage = lazy(() => import("./pages/StockOptimizerPage").then(m => ({ default: m.StockOptimizerPage })));

// Finance (named exports)
const InvoicesPage = lazy(() => import("./pages/InvoicesPage").then(m => ({ default: m.InvoicesPage })));
const PurchaseOrdersPage = lazy(() => import("./pages/PurchaseOrdersPage").then(m => ({ default: m.PurchaseOrdersPage })));
const GeneralLedgerPage = lazy(() => import("./pages/GeneralLedgerPage").then(m => ({ default: m.GeneralLedgerPage })));
const FinancialAnalysisPage = lazy(() => import("./pages/FinancialAnalysisPage").then(m => ({ default: m.FinancialAnalysisPage })));
const JobProfitabilityPage = lazy(() => import("./pages/JobProfitabilityPage").then(m => ({ default: m.JobProfitabilityPage })));
const ToolingCostPage = lazy(() => import("./pages/ToolingCostPage").then(m => ({ default: m.ToolingCostPage })));

// HR & Payroll (named exports)
const EmployeeDirectoryPage = lazy(() => import("./pages/EmployeeDirectoryPage").then(m => ({ default: m.EmployeeDirectoryPage })));
const ShopFloorClockPage = lazy(() => import("./pages/ShopFloorClockPage").then(m => ({ default: m.ShopFloorClockPage })));
const TimecardPage = lazy(() => import("./pages/TimecardPage").then(m => ({ default: m.TimecardPage })));
const PayrollPage = lazy(() => import("./pages/PayrollPage").then(m => ({ default: m.PayrollPage })));
const HRCompliancePage = lazy(() => import("./pages/HRCompliancePage").then(m => ({ default: m.HRCompliancePage })));

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

// Analysis (named exports)
const JobPlannerPage = lazy(() => import("./pages/JobPlannerPage").then(m => ({ default: m.JobPlannerPage })));
const WhatIfPage = lazy(() => import("./pages/WhatIfPage").then(m => ({ default: m.WhatIfPage })));
const MachineRatesPage = lazy(() => import("./pages/MachineRatesPage").then(m => ({ default: m.MachineRatesPage })));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage").then(m => ({ default: m.OrderTrackingPage })));
const CustomersPage = lazy(() => import("./pages/CustomersPage").then(m => ({ default: m.CustomersPage })));
const PurchasingPage = lazy(() => import("./pages/PurchasingPage").then(m => ({ default: m.PurchasingPage })));

// Viewer (named export)
const ViewerPage = lazy(() => import("./pages/ViewerPage").then(m => ({ default: m.ViewerPage })));

// Data & Quality
const DataManagementPage = lazy(() => import("./pages/DataManagementPage"));
const SafetyDashboardPage = lazy(() => import("./pages/SafetyDashboardPage"));
const QualityPage = lazy(() => import("./pages/QualityPage"));
const QualityManagementPage = lazy(() => import("./pages/QualityManagementPage").then(m => ({ default: m.QualityManagementPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const ExportsPage = lazy(() => import("./pages/ExportsPage").then(m => ({ default: m.ExportsPage })));

// Billing
const PostProcessorStorePage = lazy(() => import("./pages/PostProcessorStorePage"));

// Admin
const CostEstimatorPage = lazy(() => import("./pages/CostEstimatorPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

// Learning
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

// Standalone pages (outside AppShell)
const LoginPage = lazy(() => import("./pages/LoginPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="lg" />
      <span className="ml-3 text-sm text-slate-500">Loading...</span>
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
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
        {/* Core */}
        <Route path="/sfc" element={<Lazy><SfcCalculatorPage /></Lazy>} />
        <Route path="/ppg" element={<Lazy><PpgPage /></Lazy>} />
        <Route path="/cam" element={<Lazy><CamStrategyPage /></Lazy>} />

        {/* Shop */}
        <Route path="/shop" element={<Lazy><ShopDashboardPage /></Lazy>} />
        <Route path="/jobs" element={<Lazy><JobsPage /></Lazy>} />
        <Route path="/scheduling" element={<Lazy><SchedulingPage /></Lazy>} />
        <Route path="/capacity" element={<Lazy><CapacityPlanningPage /></Lazy>} />
        <Route path="/inventory" element={<Lazy><InventoryPage /></Lazy>} />
        <Route path="/batch" element={<Lazy><BatchPlanningPage /></Lazy>} />

        {/* Quoting */}
        <Route path="/quote-builder" element={<Lazy><QuoteBuilderPage /></Lazy>} />
        <Route path="/blueprint-quote" element={<Lazy><BlueprintQuotePage /></Lazy>} />
        <Route path="/sheet-metal" element={<Lazy><SheetMetalQuotePage /></Lazy>} />
        <Route path="/additive" element={<Lazy><AdditiveQuotePage /></Lazy>} />
        <Route path="/injection-mold" element={<Lazy><InjectionMoldPage /></Lazy>} />
        <Route path="/quote-analytics" element={<Lazy><QuoteAnalyticsPage /></Lazy>} />
        <Route path="/secondary-ops" element={<Lazy><SecondaryOpsPage /></Lazy>} />
        <Route path="/material-pricing" element={<Lazy><MaterialPricingPage /></Lazy>} />
        <Route path="/stock-optimizer" element={<Lazy><StockOptimizerPage /></Lazy>} />

        {/* Finance */}
        <Route path="/invoices" element={<Lazy><InvoicesPage /></Lazy>} />
        <Route path="/purchase-orders" element={<Lazy><PurchaseOrdersPage /></Lazy>} />
        <Route path="/general-ledger" element={<Lazy><GeneralLedgerPage /></Lazy>} />
        <Route path="/financial-analysis" element={<Lazy><FinancialAnalysisPage /></Lazy>} />
        <Route path="/job-profitability" element={<Lazy><JobProfitabilityPage /></Lazy>} />
        <Route path="/tooling-cost" element={<Lazy><ToolingCostPage /></Lazy>} />

        {/* HR & Payroll */}
        <Route path="/employees" element={<Lazy><EmployeeDirectoryPage /></Lazy>} />
        <Route path="/shop-clock" element={<Lazy><ShopFloorClockPage /></Lazy>} />
        <Route path="/timecards" element={<Lazy><TimecardPage /></Lazy>} />
        <Route path="/payroll" element={<Lazy><PayrollPage /></Lazy>} />
        <Route path="/hr-compliance" element={<Lazy><HRCompliancePage /></Lazy>} />

        {/* ERP */}
        <Route
          path="/erp"
          element={
            <ErpProvider>
              <Lazy><ErpLayout /></Lazy>
            </ErpProvider>
          }
        >
          <Route index element={<Lazy><ErpDashboard /></Lazy>} />
          <Route path="quote" element={<Lazy><QuoteGenerator /></Lazy>} />
          <Route path="jobs" element={<Lazy><JobPlanner /></Lazy>} />
          <Route path="schedule" element={<Lazy><ScheduleView /></Lazy>} />
          <Route path="tracker" element={<Lazy><JobTracker /></Lazy>} />
          <Route path="analytics" element={<Lazy><CapacityDashboard /></Lazy>} />
          <Route path="maintenance" element={<Lazy><PredictiveMaintenance /></Lazy>} />
          <Route path="inventory" element={<Lazy><Inventory /></Lazy>} />
          <Route path="reports" element={<Lazy><ReportBuilder /></Lazy>} />
        </Route>

        {/* Analysis */}
        <Route path="/job-planner" element={<Lazy><JobPlannerPage /></Lazy>} />
        <Route path="/what-if" element={<Lazy><WhatIfPage /></Lazy>} />
        <Route path="/machine-rates" element={<Lazy><MachineRatesPage /></Lazy>} />
        <Route path="/order-tracking" element={<Lazy><OrderTrackingPage /></Lazy>} />
        <Route path="/customers" element={<Lazy><CustomersPage /></Lazy>} />
        <Route path="/purchasing" element={<Lazy><PurchasingPage /></Lazy>} />

        {/* Viewer */}
        <Route path="/viewer" element={<Lazy><ViewerPage /></Lazy>} />

        {/* Data & Quality */}
        <Route path="/data" element={<Lazy><DataManagementPage /></Lazy>} />
        <Route path="/safety" element={<Lazy><SafetyDashboardPage /></Lazy>} />
        <Route path="/quality" element={<Lazy><QualityPage /></Lazy>} />
        <Route path="/quality-management" element={<Lazy><QualityManagementPage /></Lazy>} />
        <Route path="/reports" element={<Lazy><ReportsPage /></Lazy>} />
        <Route path="/exports" element={<Lazy><ExportsPage /></Lazy>} />

        {/* Billing */}
        <Route path="/post-processors" element={<Lazy><PostProcessorStorePage /></Lazy>} />

        {/* Admin */}
        <Route path="/cost" element={<Lazy><CostEstimatorPage /></Lazy>} />
        <Route path="/settings" element={<Lazy><SettingsPage /></Lazy>} />

        {/* Learning */}
        <Route
          path="/learning"
          element={
            <LearningPage>
              <LearningLayout />
            </LearningPage>
          }
        >
          <Route index element={<Lazy><LearningDashboard /></Lazy>} />
          <Route path="assessment" element={<Lazy><Assessment /></Lazy>} />
          <Route path="path" element={<Lazy><LearningPath /></Lazy>} />
          <Route path="progress" element={<Lazy><ProgressTracker /></Lazy>} />
          <Route path="knowledge" element={<Lazy><KnowledgeSearch /></Lazy>} />
          <Route path="material" element={<Lazy><MaterialWizard /></Lazy>} />
          <Route path="tool" element={<Lazy><ToolWizard /></Lazy>} />
          <Route path="machine" element={<Lazy><MachineWizard /></Lazy>} />
          <Route path="twin" element={<Lazy><DigitalTwin /></Lazy>} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/sfc" replace />} />
      </Route>

      {/* Standalone pages (outside AppShell) */}
      <Route path="/login" element={<Lazy><LoginPage /></Lazy>} />
      <Route path="/landing" element={<Lazy><LandingPage /></Lazy>} />
    </Routes>
  );
}
