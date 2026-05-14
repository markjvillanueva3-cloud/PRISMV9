import { type ComponentType, type ReactNode, Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { RouteStageFallback, getRouteLoadingMeta } from './components/workspace/RouteStageFallback';
import { WorkspaceErrorBoundary } from './components/workspace/WorkspaceErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { LearningProvider } from './contexts/LearningContext';
import { OperatingSystemProvider } from './features/operating-system/OperatingSystemProvider';

function lazyNamed<TModule extends Record<string, unknown>, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[key] as ComponentType };
  });
}

function lazyElement(node: ReactNode) {
  return <RouteWorkspaceStage>{node}</RouteWorkspaceStage>;
}

function secure(node: ReactNode, minClearance?: 'shop_floor' | 'lead' | 'hr_manager' | 'admin') {
  return <ProtectedRoute minClearance={minClearance}>{node}</ProtectedRoute>;
}

function RouteWorkspaceStage({ children }: { children: ReactNode }) {
  const location = useLocation();
  const meta = getRouteLoadingMeta(location.pathname);

  return (
    <WorkspaceErrorBoundary
      title={meta.title}
      detail="The requested route could not finish loading."
      resetKey={location.pathname}
    >
      <Suspense fallback={<RouteStageFallback />}>{children}</Suspense>
    </WorkspaceErrorBoundary>
  );
}

const DashboardPage = lazyNamed(() => import('./pages/DashboardPage'), 'DashboardPage');
const ShellGatewayPage = lazyNamed(() => import('./pages/ShellGatewayPage'), 'ShellGatewayPage');
const MessagesPage = lazyNamed(() => import('./pages/MessagesPage'), 'MessagesPage');
const CaptureOpsPage = lazyNamed(() => import('./pages/CaptureOpsPage'), 'CaptureOpsPage');
const CalculatorPage = lazyNamed(() => import('./pages/CalculatorPage'), 'CalculatorPage');
const ProgramReleasePage = lazyNamed(() => import('./pages/ProgramReleasePage'), 'ProgramReleasePage');
const PipelinePage = lazyNamed(() => import('./pages/PipelinePage'), 'PipelinePage');
const JobPlannerPage = lazyNamed(() => import('./pages/JobPlannerPage'), 'JobPlannerPage');
const ToolpathAdvisorPage = lazyNamed(() => import('./pages/ToolpathAdvisorPage'), 'ToolpathAdvisorPage');
const ThreadCalcPage = lazyNamed(() => import('./pages/ThreadCalcPage'), 'ThreadCalcPage');
const PostProcessorGeneratorPage = lazyNamed(() => import('./pages/PostProcessorGeneratorPage'), 'PostProcessorGeneratorPage');
const PostProcessorPage = lazyNamed(() => import('./pages/PostProcessorPage'), 'PostProcessorPage');
const OptimizationReportPage = lazyNamed(() => import('./pages/OptimizationReportPage'), 'OptimizationReportPage');
const SetupSheetPage = lazyNamed(() => import('./pages/SetupSheetPage'), 'SetupSheetPage');
const ToolOptimizationPage = lazyNamed(() => import('./pages/ToolOptimizationPage'), 'ToolOptimizationPage');
const CycleTimePage = lazyNamed(() => import('./pages/CycleTimePage'), 'CycleTimePage');
const FeatureTogglePage = lazyNamed(() => import('./pages/FeatureTogglePage'), 'FeatureTogglePage');
const ProveOutWorkflowPage = lazyNamed(() => import('./pages/ProveOutWorkflowPage'), 'ProveOutWorkflowPage');
const AILearningDashboardPage = lazyNamed(() => import('./pages/AILearningDashboardPage'), 'AILearningDashboardPage');
const SafetyMonitorPage = lazyNamed(() => import('./pages/SafetyMonitorPage'), 'SafetyMonitorPage');
const WhatIfPage = lazyNamed(() => import('./pages/WhatIfPage'), 'WhatIfPage');
const AlarmPage = lazyNamed(() => import('./pages/AlarmPage'), 'AlarmPage');
const ReportsPage = lazyNamed(() => import('./pages/ReportsPage'), 'ReportsPage');
const ViewerPage = lazyNamed(() => import('./pages/ViewerPage'), 'ViewerPage');
const ShopFloorClockPage = lazyNamed(() => import('./pages/ShopFloorClockPage'), 'ShopFloorClockPage');
const ShopFloorLivePage = lazyNamed(() => import('./pages/ShopFloorLivePage'), 'default');
const TimecardPage = lazyNamed(() => import('./pages/TimecardPage'), 'TimecardPage');
const PayrollPage = lazyNamed(() => import('./pages/PayrollPage'), 'PayrollPage');
const InvoicesPage = lazyNamed(() => import('./pages/InvoicesPage'), 'InvoicesPage');
const JobProfitabilityPage = lazyNamed(() => import('./pages/JobProfitabilityPage'), 'JobProfitabilityPage');
const ToolingCostPage = lazyNamed(() => import('./pages/ToolingCostPage'), 'ToolingCostPage');
const PurchaseOrdersPage = lazyNamed(() => import('./pages/PurchaseOrdersPage'), 'PurchaseOrdersPage');
const GeneralLedgerPage = lazyNamed(() => import('./pages/GeneralLedgerPage'), 'GeneralLedgerPage');
const CapacityPlanningPage = lazyNamed(() => import('./pages/CapacityPlanningPage'), 'CapacityPlanningPage');
const QualityManagementPage = lazyNamed(() => import('./pages/QualityManagementPage'), 'QualityManagementPage');
const HRCompliancePage = lazyNamed(() => import('./pages/HRCompliancePage'), 'HRCompliancePage');
const CustomersPage = lazyNamed(() => import('./pages/CustomersPage'), 'CustomersPage');
const CustomerPortalPage = lazyNamed(() => import('./pages/CustomerPortalPage'), 'CustomerPortalPage');
const ExportsPage = lazyNamed(() => import('./pages/ExportsPage'), 'ExportsPage');
const InventoryPage = lazyNamed(() => import('./pages/InventoryPage'), 'InventoryPage');
const PartsLibraryPage = lazyNamed(() => import('./pages/PartsLibraryPage'), 'PartsLibraryPage');
const SchedulingPage = lazyNamed(() => import('./pages/SchedulingPage'), 'SchedulingPage');
const QuoteBuilderPage = lazyNamed(() => import('./pages/QuoteBuilderPage'), 'QuoteBuilderPage');
const SecondaryOpsPage = lazyNamed(() => import('./pages/SecondaryOpsPage'), 'SecondaryOpsPage');
const QuoteAnalyticsPage = lazyNamed(() => import('./pages/QuoteAnalyticsPage'), 'QuoteAnalyticsPage');
const BlueprintQuotePage = lazyNamed(() => import('./pages/BlueprintQuotePage'), 'BlueprintQuotePage');
const SheetMetalQuotePage = lazyNamed(() => import('./pages/SheetMetalQuotePage'), 'SheetMetalQuotePage');
const AdditiveQuotePage = lazyNamed(() => import('./pages/AdditiveQuotePage'), 'AdditiveQuotePage');
const InjectionMoldPage = lazyNamed(() => import('./pages/InjectionMoldPage'), 'InjectionMoldPage');
const StockOptimizerPage = lazyNamed(() => import('./pages/StockOptimizerPage'), 'StockOptimizerPage');
const MaterialPricingPage = lazyNamed(() => import('./pages/MaterialPricingPage'), 'MaterialPricingPage');
const JobsPage = lazyNamed(() => import('./pages/JobsPage'), 'JobsPage');
const OrderTrackingPage = lazyNamed(() => import('./pages/OrderTrackingPage'), 'OrderTrackingPage');
const EmployeeDirectoryPage = lazyNamed(() => import('./pages/EmployeeDirectoryPage'), 'EmployeeDirectoryPage');
const EmployeeProfilePage = lazyNamed(() => import('./pages/EmployeeProfilePage'), 'EmployeeProfilePage');
const PurchasingPage = lazyNamed(() => import('./pages/PurchasingPage'), 'PurchasingPage');
const MachineRatesPage = lazyNamed(() => import('./pages/MachineRatesPage'), 'MachineRatesPage');
const BatchPlanningPage = lazyNamed(() => import('./pages/BatchPlanningPage'), 'BatchPlanningPage');
const MechanicalDesignPage = lazyNamed(() => import('./pages/MechanicalDesignPage'), 'MechanicalDesignPage');
const DocumentLearningPage = lazyNamed(() => import('./pages/DocumentLearningPage'), 'DocumentLearningPage');
const IntegrationsPage = lazyNamed(() => import('./pages/IntegrationsPage'), 'IntegrationsPage');
const FinancialAnalysisPage = lazyNamed(() => import('./pages/FinancialAnalysisPage'), 'FinancialAnalysisPage');
const EmployeeShellLayout = lazyNamed(() => import('./components/employee/EmployeeShellLayout'), 'EmployeeShellLayout');
const EmployeePortalPage = lazyNamed(() => import('./pages/EmployeePortalPage'), 'EmployeePortalPage');
const LearningLayout = lazyNamed(() => import('./components/learning/LearningLayout'), 'LearningLayout');
const LearningDashboard = lazyNamed(() => import('./pages/LearningDashboard'), 'LearningDashboard');
const Assessment = lazyNamed(() => import('./components/learning/Assessment'), 'Assessment');
const LearningPath = lazyNamed(() => import('./components/learning/LearningPath'), 'LearningPath');
const ProgressTracker = lazyNamed(() => import('./components/learning/ProgressTracker'), 'ProgressTracker');
const KnowledgeSearch = lazyNamed(() => import('./components/learning/KnowledgeSearch'), 'KnowledgeSearch');
const MaterialWizard = lazyNamed(() => import('./components/learning/MaterialWizard'), 'MaterialWizard');
const ToolWizard = lazyNamed(() => import('./components/learning/ToolWizard'), 'ToolWizard');
const MachineWizard = lazyNamed(() => import('./components/learning/MachineWizard'), 'MachineWizard');
const DigitalTwin = lazyNamed(() => import('./components/learning/DigitalTwin'), 'DigitalTwin');
const CourseCatalog = lazyNamed(() => import('./components/learning/CourseCatalog'), 'CourseCatalog');
const CourseDetail = lazyNamed(() => import('./components/learning/CourseDetail'), 'CourseDetail');
const LessonView = lazyNamed(() => import('./components/learning/LessonView'), 'LessonView');
const KnowledgeIngestionPage = lazyNamed(() => import('./pages/KnowledgeIngestionPage'), 'KnowledgeIngestionPage');
const KnowledgeBrowserPage = lazyNamed(() => import('./pages/KnowledgeBrowserPage'), 'KnowledgeBrowserPage');
const CourseViewerPage = lazyNamed(() => import('./pages/CourseViewerPage'), 'CourseViewerPage');
const FleetLearningDashboardPage = lazyNamed(() => import('./pages/FleetLearningDashboardPage'), 'FleetLearningDashboardPage');
const DepartmentDashboardPage = lazyNamed(() => import('./pages/DepartmentDashboardPage'), 'DepartmentDashboardPage');
const LatheUploadPage = lazyNamed(() => import('./pages/LatheUploadPage'), 'LatheUploadPage');
const LatheWizardPage = lazyNamed(() => import('./pages/LatheWizardPage'), 'LatheWizardPage');
const LatheResultsPage = lazyNamed(() => import('./pages/LatheResultsPage'), 'LatheResultsPage');
const MillingUploadPage = lazyNamed(() => import('./pages/MillingUploadPage'), 'MillingUploadPage');
const MillingWizardPage = lazyNamed(() => import('./pages/MillingWizardPage'), 'MillingWizardPage');
const MillingResultsPage = lazyNamed(() => import('./pages/MillingResultsPage'), 'MillingResultsPage');
const ShopProfilePage = lazyNamed(() => import('./pages/ShopProfilePage'), 'ShopProfilePage');
const WireEdmUploadPage = lazyNamed(() => import('./pages/WireEdmUploadPage'), 'WireEdmUploadPage');
const WireEdmWizardPage = lazyNamed(() => import('./pages/WireEdmWizardPage'), 'WireEdmWizardPage');
const WireEdmResultsPage = lazyNamed(() => import('./pages/WireEdmResultsPage'), 'WireEdmResultsPage');
const OEEDashboardPage = lazyNamed(() => import('./pages/OEEDashboardPage'), 'OEEDashboardPage');
const KaizenBoardPage = lazyNamed(() => import('./pages/KaizenBoardPage'), 'KaizenBoardPage');
const SPCDashboardPage = lazyNamed(() => import('./pages/SPCDashboardPage'), 'SPCDashboardPage');
const ValueStreamPage = lazyNamed(() => import('./pages/ValueStreamPage'), 'ValueStreamPage');
const KanbanBoardPage = lazyNamed(() => import('./pages/KanbanBoardPage'), 'KanbanBoardPage');
const RootCausePage = lazyNamed(() => import('./pages/RootCausePage'), 'RootCausePage');
const A3ReportPage = lazyNamed(() => import('./pages/A3ReportPage'), 'A3ReportPage');
const DocumentInboxPage = lazyNamed(() => import('./pages/DocumentInboxPage'), 'DocumentInboxPage');
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ExecutiveDashboardPage = lazyNamed(() => import('./pages/ExecutiveDashboardPage'), 'ExecutiveDashboardPage');
const ShopFloorTVPage = lazy(() => import('./pages/ShopFloorTVPage'));
const DailyFlashReportPage = lazy(() => import('./pages/DailyFlashReportPage'));
const RFQInboxPage = lazy(() => import('./pages/RFQInboxPage'));
const SalesPipelinePage = lazy(() => import('./pages/SalesPipelinePage'));
const CommissionTrackerPage = lazy(() => import('./pages/CommissionTrackerPage'));
const CreditManagementPage = lazy(() => import('./pages/CreditManagementPage'));
const VendorScorecardPage = lazy(() => import('./pages/VendorScorecardPage'));
const ReceivingInspectionPage = lazy(() => import('./pages/ReceivingInspectionPage'));
const ShippingPackingPage = lazy(() => import('./pages/ShippingPackingPage'));
// BIZ-MS5: Maintenance, Assets, Compliance & Integrations
const PreventiveMaintenancePage = lazy(() => import('./pages/PreventiveMaintenancePage'));
const EquipmentAssetPage = lazy(() => import('./pages/EquipmentAssetPage'));
const MaintenanceWorkOrderPage = lazy(() => import('./pages/MaintenanceWorkOrderPage'));
const CalibrationPage = lazy(() => import('./pages/CalibrationPage'));
const OSHACompliancePage = lazy(() => import('./pages/OSHACompliancePage'));
const AuditManagerPage = lazy(() => import('./pages/AuditManagerPage'));

// WIRE-MS0: Full App Pipeline Wiring - Target Pages
const MachineLivePage = lazy(() => import('./pages/MachineLivePage'));
const DiagnosisPage = lazy(() => import('./pages/DiagnosisPage'));
const CncOpsPage = lazy(() => import('./pages/CncOpsPage'));
const KnowledgeExtPage = lazy(() => import('./pages/KnowledgeExtPage'));
const VibrationPage = lazy(() => import('./pages/VibrationPage'));
const ThermalPage = lazy(() => import('./pages/ThermalPage'));
const EdmPage = lazy(() => import('./pages/EdmPage'));
const TurningPage = lazy(() => import('./pages/TurningPage'));
const GrindingPage = lazy(() => import('./pages/GrindingPage'));
const FormingPage = lazy(() => import('./pages/FormingPage'));
const WeldingPage = lazy(() => import('./pages/WeldingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
// WIRE-MS0: Additional merged pages
const AdminPage = lazy(() => import('./pages/AdminPage'));
const CamStrategyPage = lazy(() => import('./pages/CamStrategyPage'));
const CompliancePage = lazy(() => import('./pages/CompliancePage'));
const CostEstimatorPage = lazy(() => import('./pages/CostEstimatorPage'));
const DataManagementPage = lazy(() => import('./pages/DataManagementPage'));
const ErpDashboard = lazy(() => import('./pages/ErpDashboard'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PostProcessorStorePage = lazy(() => import('./pages/PostProcessorStorePage'));
const PpgPage = lazy(() => import('./pages/PpgPage'));
const QualityPage = lazy(() => import('./pages/QualityPage'));
const CamAiDashboardPage = lazy(() => import('./pages/cam-ai-dashboard'));
const SafetyDashboardPage = lazy(() => import('./pages/SafetyDashboardPage'));
const SfcCalculatorPage = lazy(() => import('./pages/SfcCalculatorPage'));
const ShopDashboardPage = lazyNamed(() => import('./pages/ShopDashboardPage'), 'DashboardPage');
const SpeedFeedPage = lazy(() => import('./pages/SpeedFeedPage'));
const TelemetryPage = lazy(() => import('./pages/TelemetryPage'));
const WireEdmStudioPage = lazy(() => import('./pages/WireEdmStudioPage'));

export function App() {
  return (
    <OperatingSystemProvider>
      <AuthProvider>
        <LearningProvider>
          <Routes>
            <Route index element={lazyElement(<ShellGatewayPage />)} />
            <Route path="signin" element={lazyElement(<ShellGatewayPage />)} />
            <Route path="login" element={lazyElement(<LoginPage />)} />
            <Route path="shop-tv" element={lazyElement(<ShopFloorTVPage />)} />
            <Route path="employee" element={lazyElement(secure(<EmployeeShellLayout />))}>
              <Route index element={lazyElement(<EmployeePortalPage />)} />
              <Route path="jobs" element={lazyElement(<JobsPage />)} />
              <Route path="messages" element={lazyElement(<MessagesPage />)} />
              <Route path="capture" element={lazyElement(<CaptureOpsPage />)} />
              <Route path="shop-clock" element={lazyElement(<ShopFloorClockPage />)} />
              <Route path="shop-live" element={lazyElement(<ShopFloorLivePage />)} />
              <Route path="quality" element={lazyElement(<QualityManagementPage />)} />
              <Route path="scheduling" element={lazyElement(<SchedulingPage />)} />
              <Route path="orders" element={lazyElement(<OrderTrackingPage />)} />
              <Route path="learning" element={lazyElement(<LearningLayout />)}>
                <Route index element={lazyElement(<LearningDashboard />)} />
                <Route path="assessment" element={lazyElement(<Assessment />)} />
                <Route path="path" element={lazyElement(<LearningPath />)} />
                <Route path="progress" element={lazyElement(<ProgressTracker />)} />
                <Route path="knowledge" element={lazyElement(<KnowledgeSearch />)} />
                <Route path="material-wizard" element={lazyElement(<MaterialWizard />)} />
                <Route path="tool-wizard" element={lazyElement(<ToolWizard />)} />
                <Route path="machine-wizard" element={lazyElement(<MachineWizard />)} />
                <Route path="twin" element={lazyElement(<DigitalTwin />)} />
                <Route path="academy" element={lazyElement(<CourseCatalog />)} />
                <Route path="academy/:courseId" element={lazyElement(<CourseDetail />)} />
                <Route path="academy/:courseId/:lessonId" element={lazyElement(<LessonView />)} />
              </Route>
              <Route path="*" element={<div />} />
            </Route>
            <Route element={<Layout />}>
              <Route path="dashboard" element={lazyElement(<DashboardPage />)} />
              <Route path="messages" element={lazyElement(<MessagesPage />)} />
              <Route path="capture" element={lazyElement(<CaptureOpsPage />)} />
              <Route path="calculator" element={lazyElement(<CalculatorPage />)} />
              <Route path="print-to-cnc" element={lazyElement(<ProgramReleasePage />)} />
              <Route path="pipeline" element={lazyElement(<PipelinePage />)} />
              <Route path="job-planner" element={lazyElement(secure(<JobPlannerPage />, 'lead'))} />
              <Route path="toolpath" element={lazyElement(<ToolpathAdvisorPage />)} />
              <Route path="thread-calculator" element={lazyElement(<ThreadCalcPage />)} />
              <Route path="ppg" element={lazyElement(<PostProcessorGeneratorPage />)} />
              <Route path="post-processor" element={lazyElement(<PostProcessorPage />)} />
              <Route path="optimize" element={lazyElement(<OptimizationReportPage />)} />
              <Route path="setup-sheet" element={lazyElement(<SetupSheetPage />)} />
              <Route path="cycle-time" element={lazyElement(<CycleTimePage />)} />
              <Route path="tool-optimization" element={lazyElement(<ToolOptimizationPage />)} />
              <Route path="features" element={lazyElement(<FeatureTogglePage />)} />
              <Route path="prove-out" element={lazyElement(<ProveOutWorkflowPage />)} />
              <Route path="ai-learning" element={lazyElement(<AILearningDashboardPage />)} />
              <Route path="safety" element={lazyElement(<SafetyMonitorPage />)} />
              <Route path="what-if" element={lazyElement(<WhatIfPage />)} />
              <Route path="alarms" element={lazyElement(<AlarmPage />)} />
              <Route path="reports" element={lazyElement(secure(<ReportsPage />, 'lead'))} />
              <Route path="viewer" element={lazyElement(<ViewerPage />)} />
              <Route path="shop-clock" element={lazyElement(<ShopFloorClockPage />)} />
              <Route path="shop-live" element={lazyElement(<ShopFloorLivePage />)} />
              <Route path="timecards" element={lazyElement(secure(<TimecardPage />, 'hr_manager'))} />
              <Route path="payroll" element={lazyElement(secure(<PayrollPage />, 'hr_manager'))} />
              <Route path="invoices" element={lazyElement(secure(<InvoicesPage />, 'lead'))} />
              <Route path="profitability" element={lazyElement(secure(<JobProfitabilityPage />, 'lead'))} />
              <Route path="tooling-cost" element={lazyElement(secure(<ToolingCostPage />, 'lead'))} />
              <Route path="purchase-orders" element={lazyElement(secure(<PurchaseOrdersPage />, 'lead'))} />
              <Route path="general-ledger" element={lazyElement(secure(<GeneralLedgerPage />, 'admin'))} />
              <Route path="capacity" element={lazyElement(secure(<CapacityPlanningPage />, 'lead'))} />
              <Route path="quality" element={lazyElement(<QualityManagementPage />)} />
              <Route path="hr" element={lazyElement(secure(<HRCompliancePage />, 'hr_manager'))} />
              <Route path="customers" element={lazyElement(<CustomersPage />)} />
              <Route path="customer-portal" element={lazyElement(<CustomerPortalPage />)} />
              <Route path="exports" element={lazyElement(<ExportsPage />)} />
              <Route path="inventory" element={lazyElement(<InventoryPage />)} />
              <Route path="parts-library" element={lazyElement(<PartsLibraryPage />)} />
              <Route path="scheduling" element={lazyElement(secure(<SchedulingPage />, 'lead'))} />
              <Route path="quote-builder" element={lazyElement(<QuoteBuilderPage />)} />
              <Route path="secondary-ops" element={lazyElement(<SecondaryOpsPage />)} />
              <Route path="quote-analytics" element={lazyElement(<QuoteAnalyticsPage />)} />
              <Route path="blueprint-quote" element={lazyElement(<BlueprintQuotePage />)} />
              <Route path="sheet-metal" element={lazyElement(<SheetMetalQuotePage />)} />
              <Route path="additive" element={lazyElement(<AdditiveQuotePage />)} />
              <Route path="injection-mold" element={lazyElement(<InjectionMoldPage />)} />
              <Route path="stock-optimizer" element={lazyElement(<StockOptimizerPage />)} />
              <Route path="material-pricing" element={lazyElement(<MaterialPricingPage />)} />
              <Route path="jobs" element={lazyElement(<JobsPage />)} />
              <Route path="orders" element={lazyElement(secure(<OrderTrackingPage />, 'lead'))} />
              <Route path="employees" element={lazyElement(secure(<EmployeeDirectoryPage />, 'hr_manager'))} />
              <Route path="employees/:employeeId" element={lazyElement(secure(<EmployeeProfilePage />, 'hr_manager'))} />
              <Route path="purchasing" element={lazyElement(secure(<PurchasingPage />, 'lead'))} />
              <Route path="machine-rates" element={lazyElement(secure(<MachineRatesPage />, 'lead'))} />
              <Route path="batch-planning" element={lazyElement(secure(<BatchPlanningPage />, 'lead'))} />
              <Route path="mechanical" element={lazyElement(<MechanicalDesignPage />)} />
              <Route path="documents" element={lazyElement(<DocumentLearningPage />)} />
              <Route path="inbox" element={lazyElement(<DocumentInboxPage />)} />
              <Route path="knowledge-ingest" element={lazyElement(<KnowledgeIngestionPage />)} />
              <Route path="knowledge-browse" element={lazyElement(<KnowledgeBrowserPage />)} />
              <Route path="course-viewer" element={lazyElement(<CourseViewerPage />)} />
              <Route path="fleet-learning" element={lazyElement(<FleetLearningDashboardPage />)} />
              <Route path="integrations" element={lazyElement(<IntegrationsPage />)} />
              <Route path="financial-analysis" element={lazyElement(secure(<FinancialAnalysisPage />, 'admin'))} />
              <Route path="department" element={lazyElement(secure(<DepartmentDashboardPage />, 'lead'))} />
              <Route path="oee" element={lazyElement(<OEEDashboardPage />)} />
              <Route path="kaizen" element={lazyElement(<KaizenBoardPage />)} />
              <Route path="spc" element={lazyElement(<SPCDashboardPage />)} />
              <Route path="value-stream" element={lazyElement(<ValueStreamPage />)} />
              <Route path="kanban" element={lazyElement(<KanbanBoardPage />)} />
              <Route path="root-cause" element={lazyElement(<RootCausePage />)} />
              <Route path="a3-report" element={lazyElement(<A3ReportPage />)} />
              <Route path="executive-dashboard" element={lazyElement(secure(<ExecutiveDashboardPage />, 'admin'))} />
              <Route path="daily-flash" element={lazyElement(secure(<DailyFlashReportPage />, 'admin'))} />
              <Route path="rfq-inbox" element={lazyElement(secure(<RFQInboxPage />, 'lead'))} />
              <Route path="sales-pipeline" element={lazyElement(secure(<SalesPipelinePage />, 'lead'))} />
              <Route path="commissions" element={lazyElement(secure(<CommissionTrackerPage />, 'hr_manager'))} />
              <Route path="credit-management" element={lazyElement(secure(<CreditManagementPage />, 'hr_manager'))} />
              <Route path="vendor-scorecard" element={lazyElement(secure(<VendorScorecardPage />, 'lead'))} />
              <Route path="receiving" element={lazyElement(secure(<ReceivingInspectionPage />, 'lead'))} />
              <Route path="shipping" element={lazyElement(secure(<ShippingPackingPage />, 'lead'))} />
              {/* BIZ-MS5: Maintenance, Assets, Compliance & Integrations */}
              <Route path="maintenance" element={lazyElement(secure(<PreventiveMaintenancePage />, 'lead'))} />
              <Route path="assets" element={lazyElement(secure(<EquipmentAssetPage />, 'lead'))} />
              <Route path="work-orders" element={lazyElement(secure(<MaintenanceWorkOrderPage />, 'lead'))} />
              <Route path="calibration" element={lazyElement(secure(<CalibrationPage />, 'lead'))} />
              <Route path="osha" element={lazyElement(secure(<OSHACompliancePage />, 'hr_manager'))} />
              <Route path="audit-manager" element={lazyElement(secure(<AuditManagerPage />, 'hr_manager'))} />
              <Route path="lathe" element={lazyElement(<LatheUploadPage />)} />
              <Route path="lathe/wizard" element={lazyElement(<LatheWizardPage />)} />
              <Route path="lathe/results" element={lazyElement(<LatheResultsPage />)} />
              <Route path="milling" element={lazyElement(<MillingUploadPage />)} />
              <Route path="milling/wizard" element={lazyElement(<MillingWizardPage />)} />
              <Route path="milling/results" element={lazyElement(<MillingResultsPage />)} />
              <Route path="shop" element={lazyElement(<ShopProfilePage />)} />
              <Route path="wire-edm" element={lazyElement(<WireEdmUploadPage />)} />
              <Route path="wire-edm/wizard" element={lazyElement(<WireEdmWizardPage />)} />
              <Route path="wire-edm/results" element={lazyElement(<WireEdmResultsPage />)} />
              {/* WIRE-MS0: Full App Pipeline Wiring - Target Routes */}
              <Route path="machine-live" element={lazyElement(<MachineLivePage />)} />
              <Route path="diagnosis" element={lazyElement(<DiagnosisPage />)} />
              <Route path="cnc-ops" element={lazyElement(<CncOpsPage />)} />
              <Route path="knowledge-ext" element={lazyElement(<KnowledgeExtPage />)} />
              <Route path="vibration" element={lazyElement(<VibrationPage />)} />
              <Route path="thermal" element={lazyElement(<ThermalPage />)} />
              <Route path="edm" element={lazyElement(<EdmPage />)} />
              <Route path="turning" element={lazyElement(<TurningPage />)} />
              <Route path="grinding" element={lazyElement(<GrindingPage />)} />
              <Route path="forming" element={lazyElement(<FormingPage />)} />
              <Route path="welding" element={lazyElement(<WeldingPage />)} />
              <Route path="settings" element={lazyElement(<SettingsPage />)} />
              {/* WIRE-MS0: Additional merged routes */}
              <Route path="admin" element={lazyElement(secure(<AdminPage />, 'admin'))} />
              <Route path="cam-ai-dashboard" element={lazyElement(secure(<CamAiDashboardPage />, 'lead'))} />
              <Route path="cam-strategy" element={lazyElement(<CamStrategyPage />)} />
              <Route path="compliance" element={lazyElement(secure(<CompliancePage />, 'lead'))} />
              <Route path="cost-estimator" element={lazyElement(<CostEstimatorPage />)} />
              <Route path="data-management" element={lazyElement(secure(<DataManagementPage />, 'admin'))} />
              <Route path="erp" element={lazyElement(secure(<ErpDashboard />, 'lead'))} />
              <Route path="home" element={lazyElement(<LandingPage />)} />
              <Route path="post-processor-store" element={lazyElement(<PostProcessorStorePage />)} />
              {/*
               * Calculator + PPG matrix — five distinct surfaces, NOT duplicates.
               * Each has its own audience + component tree. Full catalog: pages/README.md.
               *   /calculator        — full Calculator Studio (CalculatorPage, components/calculator/*)
               *   /speed-feed-calc   — focused Codex SFC with smart selectors (components/sfc/*)
               *   /ppg               — full Post Processor Generator
               *   /ppg-lite          — focused Codex PPG editor with AI panel (components/ppg/*)
               *   /post-processor    — marketing landing page (HERO + pricing + testimonials)
               *                       — route lives at line 242 above; NOT duplicated here.
               * Cross-links between surfaces are wired via <SurfaceCrossLink>.
               */}
              <Route path="ppg-lite" element={lazyElement(<PpgPage />)} />
              <Route path="quality-system" element={lazyElement(<QualityPage />)} />
              <Route path="safety-dashboard" element={lazyElement(<SafetyDashboardPage />)} />
              <Route path="speed-feed-calc" element={lazyElement(<SfcCalculatorPage />)} />
              <Route path="shop-dashboard" element={lazyElement(<ShopDashboardPage />)} />
              <Route path="speed-feed" element={lazyElement(<SpeedFeedPage />)} />
              <Route path="telemetry" element={lazyElement(<TelemetryPage />)} />
              <Route path="wire-edm-studio" element={lazyElement(<WireEdmStudioPage />)} />
              <Route path="learning" element={lazyElement(<LearningLayout />)}>
                <Route index element={lazyElement(<LearningDashboard />)} />
                <Route path="assessment" element={lazyElement(<Assessment />)} />
                <Route path="path" element={lazyElement(<LearningPath />)} />
                <Route path="progress" element={lazyElement(<ProgressTracker />)} />
                <Route path="knowledge" element={lazyElement(<KnowledgeSearch />)} />
                <Route path="material-wizard" element={lazyElement(<MaterialWizard />)} />
                <Route path="tool-wizard" element={lazyElement(<ToolWizard />)} />
                <Route path="machine-wizard" element={lazyElement(<MachineWizard />)} />
                <Route path="twin" element={lazyElement(<DigitalTwin />)} />
                <Route path="academy" element={lazyElement(<CourseCatalog />)} />
                <Route path="academy/:courseId" element={lazyElement(<CourseDetail />)} />
                <Route path="academy/:courseId/:lessonId" element={lazyElement(<LessonView />)} />
              </Route>
            </Route>
          </Routes>
        </LearningProvider>
      </AuthProvider>
    </OperatingSystemProvider>
  );
}
