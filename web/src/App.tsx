import { type ComponentType, type ReactNode, Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
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
const PrismIntelligencePage = lazyNamed(() => import('./pages/PrismIntelligencePage'), 'PrismIntelligencePage');
const SafetyMonitorPage = lazyNamed(() => import('./pages/SafetyMonitorPage'), 'SafetyMonitorPage');
const WhatIfPage = lazyNamed(() => import('./pages/WhatIfPage'), 'WhatIfPage');
const AlarmPage = lazyNamed(() => import('./pages/AlarmPage'), 'AlarmPage');
const ReportsPage = lazyNamed(() => import('./pages/ReportsPage'), 'ReportsPage');
const ViewerPage = lazyNamed(() => import('./pages/ViewerPage'), 'ViewerPage');
const ShopFloorClockPage = lazyNamed(() => import('./pages/ShopFloorClockPage'), 'ShopFloorClockPage');
const ShopFloorLivePage = lazyNamed(() => import('./pages/ShopFloorLivePage'), 'default');
const TravelerPage = lazyNamed(() => import('./pages/TravelerPage'), 'TravelerPage');
const DispatchBoardPage = lazyNamed(() => import('./pages/DispatchBoardPage'), 'DispatchBoardPage');
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
const DocumentLearningPage = lazyNamed(() => import('./pages/DocumentLearningPage'), 'DocumentLearningPage');
const IntegrationsPage = lazyNamed(() => import('./pages/IntegrationsPage'), 'IntegrationsPage');
const FinancialAnalysisPage = lazyNamed(() => import('./pages/FinancialAnalysisPage'), 'FinancialAnalysisPage');
const EmployeeShellLayout = lazyNamed(() => import('./components/employee/EmployeeShellLayout'), 'EmployeeShellLayout');
const EmployeePortalPage = lazyNamed(() => import('./pages/EmployeePortalPage'), 'EmployeePortalPage');
const LearningLayout = lazyNamed(() => import('./components/learning/LearningLayout'), 'LearningLayout');
const LearningDashboard = lazyNamed(() => import('./pages/LearningDashboard'), 'LearningDashboard');
const Assessment = lazyNamed(() => import('./components/learning/Assessment'), 'Assessment');
const LearningPath = lazyNamed(() => import('./components/learning/LearningPath'), 'default');
const ProgressTracker = lazyNamed(() => import('./components/learning/ProgressTracker'), 'default');
const KnowledgeSearch = lazyNamed(() => import('./components/learning/KnowledgeSearch'), 'default');
const MaterialWizard = lazyNamed(() => import('./components/learning/MaterialWizard'), 'MaterialWizard');
const ToolWizard = lazyNamed(() => import('./components/learning/ToolWizard'), 'ToolWizard');
const MachineWizard = lazyNamed(() => import('./components/learning/MachineWizard'), 'default');
const DigitalTwin = lazyNamed(() => import('./components/learning/DigitalTwin'), 'default');
const CourseCatalog = lazyNamed(() => import('./components/learning/CourseCatalog'), 'CourseCatalog');
const CourseDetail = lazyNamed(() => import('./components/learning/CourseDetail'), 'CourseDetail');
const LessonView = lazyNamed(() => import('./components/learning/LessonView'), 'LessonView');
const KnowledgeIngestionPage = lazyNamed(() => import('./pages/KnowledgeIngestionPage'), 'KnowledgeIngestionPage');
const KnowledgeBrowserPage = lazyNamed(() => import('./pages/KnowledgeBrowserPage'), 'KnowledgeBrowserPage');
const CourseViewerPage = lazyNamed(() => import('./pages/CourseViewerPage'), 'CourseViewerPage');
const FleetLearningDashboardPage = lazyNamed(() => import('./pages/FleetLearningDashboardPage'), 'FleetLearningDashboardPage');
const DepartmentDashboardPage = lazyNamed(() => import('./pages/DepartmentDashboardPage'), 'DepartmentDashboardPage');
const LatheUploadPage = lazyNamed(() => import('./pages/LatheUploadPage'), 'LatheUploadPage');
const LatheResultsPage = lazyNamed(() => import('./pages/LatheResultsPage'), 'LatheResultsPage');
const OEEDashboardPage = lazyNamed(() => import('./pages/OEEDashboardPage'), 'OEEDashboardPage');
const KaizenBoardPage = lazyNamed(() => import('./pages/KaizenBoardPage'), 'KaizenBoardPage');
const SPCDashboardPage = lazyNamed(() => import('./pages/SPCDashboardPage'), 'SPCDashboardPage');
const ValueStreamPage = lazyNamed(() => import('./pages/ValueStreamPage'), 'ValueStreamPage');
const KanbanBoardPage = lazyNamed(() => import('./pages/KanbanBoardPage'), 'KanbanBoardPage');
const RootCausePage = lazyNamed(() => import('./pages/RootCausePage'), 'RootCausePage');
const A3ReportPage = lazyNamed(() => import('./pages/A3ReportPage'), 'A3ReportPage');
const DocumentInboxPage = lazyNamed(() => import('./pages/DocumentInboxPage'), 'DocumentInboxPage');
const ReferenceLibraryPage = lazyNamed(() => import('./pages/ReferenceLibraryPage'), 'ReferenceLibraryPage');

export function App() {
  return (
    <OperatingSystemProvider>
      <AuthProvider>
        <LearningProvider>
          <Routes>
            <Route index element={lazyElement(<ShellGatewayPage />)} />
            <Route path="signin" element={lazyElement(<ShellGatewayPage />)} />
            <Route path="employee" element={lazyElement(<EmployeeShellLayout />)}>
              <Route index element={lazyElement(<EmployeePortalPage />)} />
              <Route path="jobs" element={lazyElement(<JobsPage />)} />
              <Route path="messages" element={lazyElement(<MessagesPage />)} />
              <Route path="capture" element={lazyElement(<CaptureOpsPage />)} />
              <Route path="shop-clock" element={lazyElement(<ShopFloorClockPage />)} />
              <Route path="shop-live" element={lazyElement(<ShopFloorLivePage />)} />
              <Route path="travelers" element={lazyElement(<TravelerPage />)} />
              <Route path="dispatch" element={lazyElement(<DispatchBoardPage />)} />
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
              <Route path="job-planner" element={lazyElement(<JobPlannerPage />)} />
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
              <Route path="intelligence" element={lazyElement(<PrismIntelligencePage />)} />
              <Route path="ai-learning" element={lazyElement(<PrismIntelligencePage />)} />
              <Route path="safety" element={lazyElement(<SafetyMonitorPage />)} />
              <Route path="what-if" element={lazyElement(<WhatIfPage />)} />
              <Route path="alarms" element={lazyElement(<AlarmPage />)} />
              <Route path="reports" element={lazyElement(<ReportsPage />)} />
              <Route path="viewer" element={lazyElement(<ViewerPage />)} />
              <Route path="shop-clock" element={lazyElement(<ShopFloorClockPage />)} />
              <Route path="shop-live" element={lazyElement(<ShopFloorLivePage />)} />
              <Route path="travelers" element={lazyElement(<TravelerPage />)} />
              <Route path="dispatch" element={lazyElement(<DispatchBoardPage />)} />
              <Route path="timecards" element={lazyElement(<TimecardPage />)} />
              <Route path="payroll" element={lazyElement(<PayrollPage />)} />
              <Route path="invoices" element={lazyElement(<InvoicesPage />)} />
              <Route path="profitability" element={lazyElement(<JobProfitabilityPage />)} />
              <Route path="tooling-cost" element={lazyElement(<ToolingCostPage />)} />
              <Route path="purchase-orders" element={lazyElement(<PurchaseOrdersPage />)} />
              <Route path="general-ledger" element={lazyElement(<GeneralLedgerPage />)} />
              <Route path="capacity" element={lazyElement(<CapacityPlanningPage />)} />
              <Route path="quality" element={lazyElement(<QualityManagementPage />)} />
              <Route path="hr" element={lazyElement(<HRCompliancePage />)} />
              <Route path="customers" element={lazyElement(<CustomersPage />)} />
              <Route path="customer-portal" element={lazyElement(<CustomerPortalPage />)} />
              <Route path="exports" element={lazyElement(<ExportsPage />)} />
              <Route path="inventory" element={lazyElement(<InventoryPage />)} />
              <Route path="parts-library" element={lazyElement(<PartsLibraryPage />)} />
              <Route path="scheduling" element={lazyElement(<SchedulingPage />)} />
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
              <Route path="orders" element={lazyElement(<OrderTrackingPage />)} />
              <Route path="employees" element={lazyElement(<EmployeeDirectoryPage />)} />
              <Route path="employees/:employeeId" element={lazyElement(<EmployeeProfilePage />)} />
              <Route path="purchasing" element={lazyElement(<PurchasingPage />)} />
              <Route path="machine-rates" element={lazyElement(<MachineRatesPage />)} />
              <Route path="batch-planning" element={lazyElement(<BatchPlanningPage />)} />
              <Route path="documents" element={lazyElement(<DocumentLearningPage />)} />
              <Route path="inbox" element={lazyElement(<DocumentInboxPage />)} />
              <Route path="knowledge-ingest" element={lazyElement(<KnowledgeIngestionPage />)} />
              <Route path="knowledge-browse" element={lazyElement(<KnowledgeBrowserPage />)} />
              <Route path="reference-library" element={lazyElement(<ReferenceLibraryPage />)} />
              <Route path="course-viewer" element={lazyElement(<CourseViewerPage />)} />
              <Route path="fleet-learning" element={lazyElement(<FleetLearningDashboardPage />)} />
              <Route path="integrations" element={lazyElement(<IntegrationsPage />)} />
              <Route path="financial-analysis" element={lazyElement(<FinancialAnalysisPage />)} />
              <Route path="department" element={lazyElement(<DepartmentDashboardPage />)} />
              <Route path="oee" element={lazyElement(<OEEDashboardPage />)} />
              <Route path="kaizen" element={lazyElement(<KaizenBoardPage />)} />
              <Route path="spc" element={lazyElement(<SPCDashboardPage />)} />
              <Route path="value-stream" element={lazyElement(<ValueStreamPage />)} />
              <Route path="kanban" element={lazyElement(<KanbanBoardPage />)} />
              <Route path="root-cause" element={lazyElement(<RootCausePage />)} />
              <Route path="a3-report" element={lazyElement(<A3ReportPage />)} />
              <Route path="lathe" element={lazyElement(<LatheUploadPage />)} />
              <Route path="lathe/wizard" element={lazyElement(<LatheUploadPage />)} />
              <Route path="lathe/results" element={lazyElement(<LatheResultsPage />)} />
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
