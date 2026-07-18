# Untracked-file Reference Audit

Generated: 2026-05-14T18:36:03.045Z
Roots scanned: `mcp-server/src`, `mcp-server/web/src`

## Summary

| Category | Count | Action |
|---|---|---|
| **KEEP** (referenced by tracked code) | 274 | restore in CALC-RESTORE-MS0 |
| **TEST** (vitest auto-discovers) | 154 | restore alongside KEEP |
| **AMBIGUOUS** (only untracked importers) | 268 | review with user — likely keep if a KEEP file imports them transitively |
| **ORPHAN** (no inbound imports) | 91 | review — candidates for deletion |
| **TOTAL** | 787 | |

## KEEP — tracked code imports them OR entry-point heuristic flagged (274)

| Score | File | LOC | Inbound tracked / untracked | Entry-point | Deleted by | Sample importer |
|---:|---|---:|---|---|---|---|
| **100** | `mcp-server/web/src/api/client.ts` | 2247 | 8 / 135 | — | — | `mcp-server/web/src/api/latheAI.ts` |
| **100** | `mcp-server/web/src/data/calculatorWorkspace.ts` | 3414 | 6 / 43 | data-catalog | — | `mcp-server/web/src/api/calculatorData.ts` |
| **89** | `mcp-server/web/src/utils/workflowRouteContext.ts` | 205 | 3 / 30 | — | — | `mcp-server/web/src/pages/CustomerPortalPage.tsx` |
| **88** | `mcp-server/web/src/components/workspace/WorkspacePrimitives.tsx` | 193 | 11 / 97 | — | — | `mcp-server/web/src/components/LatheAIPanel.tsx` |
| **86** | `mcp-server/web/src/features/machine-workspace/MachineWorkspaceAuthorityCard.tsx` | 96 | 3 / 6 | — | — | `mcp-server/web/src/pages/LatheResultsPage.tsx` |
| **80** | `mcp-server/web/src/api/types.ts` | 1130 | 2 / 50 | — | — | `mcp-server/web/src/api/latheTurning.ts` |
| **80** | `mcp-server/web/src/features/operating-system/contracts.ts` | 1269 | 2 / 50 | — | — | `mcp-server/web/src/features/operating-system/liveProvider.ts` |
| **80** | `mcp-server/web/src/pages/WireEdmWizardPage.tsx` | 1762 | 2 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **74** | `mcp-server/web/src/types/wedmStudio.ts` | 488 | 2 / 11 | — | — | `mcp-server/web/src/api/wedmStudio.ts` |
| **71** | `mcp-server/web/src/api/requestCore.ts` | 314 | 2 / 16 | — | — | `mcp-server/web/src/api/latheTurning.ts` |
| **70** | `mcp-server/web/src/data/calculatorWorkholding.ts` | 279 | 1 / 1 | data-catalog | — | `mcp-server/web/src/api/calculatorData.ts` |
| **70** | `mcp-server/web/src/pages/ReportsPage.tsx` | 282 | 2 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **69** | `mcp-server/web/src/pages/JobProfitabilityPage.tsx` | 238 | 2 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **68** | `mcp-server/web/src/pages/WireEdmUploadPage.tsx` | 168 | 2 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **68** | `mcp-server/web/src/utils/jmDieCalculatorProgrammingAuthority.ts` | 160 | 2 / 4 | — | — | `mcp-server/web/src/api/calculatorData.ts` |
| **67** | `mcp-server/web/src/pages/recovery/recoveryUtils.ts` | 109 | 2 / 15 | — | — | `mcp-server/web/src/pages/LatheUploadPage.tsx` |
| **66** | `mcp-server/web/src/components/workspace/WorkspaceRecoveryScaffold.tsx` | 86 | 2 / 16 | — | — | `mcp-server/web/src/pages/LatheUploadPage.tsx` |
| **65** | `mcp-server/web/src/components/ui/index.ts` | 12 | 2 / 42 | — | — | `mcp-server/web/src/components/wedm-studio/StepOptimize.tsx` |
| **65** | `mcp-server/web/src/features/operating-system/OperatingSystemProvider.tsx` | 33 | 2 / 43 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/components/Layout.tsx` | 1610 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/features/operating-system/programReleaseFixtures.ts` | 791 | 1 / 11 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **60** | `mcp-server/web/src/pages/CalculatorPage.tsx` | 13558 | 1 / 16 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/CaptureOpsPage.tsx` | 926 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/CustomersPage.tsx` | 798 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/DashboardPage.tsx` | 1307 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/DepartmentDashboardPage.tsx` | 890 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/EmployeeDirectoryPage.tsx` | 761 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/GeneralLedgerPage.tsx` | 755 | 1 / 4 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/InventoryPage.tsx` | 941 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/JobsPage.tsx` | 1844 | 1 / 4 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/MachineRatesPage.tsx` | 866 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/MessagesPage.tsx` | 1021 | 1 / 4 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/ProgramReleasePage.tsx` | 1665 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/PurchaseOrdersPage.tsx` | 850 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/QualityManagementPage.tsx` | 754 | 1 / 4 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/QuoteBuilderPage.tsx` | 2447 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/SchedulingPage.tsx` | 895 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/ShopFloorClockPage.tsx` | 1520 | 1 / 4 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/ShopProfilePage.tsx` | 1016 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **60** | `mcp-server/web/src/pages/ToolpathAdvisorPage.tsx` | 895 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **59** | `mcp-server/web/src/pages/OrderTrackingPage.tsx` | 704 | 1 / 5 | — | — | `mcp-server/web/src/App.tsx` |
| **59** | `mcp-server/web/src/pages/PurchasingPage.tsx` | 716 | 1 / 4 | — | — | `mcp-server/web/src/App.tsx` |
| **59** | `mcp-server/web/src/pages/TimecardPage.tsx` | 739 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **58** | `mcp-server/web/src/pages/ProveOutWorkflowPage.tsx` | 694 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **57** | `mcp-server/web/src/pages/AlarmPage.tsx` | 624 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **57** | `mcp-server/web/src/pages/LearningDashboard.tsx` | 607 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **57** | `mcp-server/web/src/pages/OptimizationReportPage.tsx` | 643 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **57** | `mcp-server/web/src/pages/SetupSheetPage.tsx` | 600 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **56** | `mcp-server/web/src/pages/FinancialAnalysisPage.tsx` | 586 | 1 / 4 | — | — | `mcp-server/web/src/App.tsx` |
| **56** | `mcp-server/web/src/pages/HRCompliancePage.tsx` | 577 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **56** | `mcp-server/web/src/pages/QuoteAnalyticsPage.tsx` | 563 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **55** | `mcp-server/web/src/features/operating-system/shellFixtures.ts` | 506 | 1 / 2 | — | — | `mcp-server/web/src/features/operating-system/liveProvider.ts` |
| **55** | `mcp-server/web/src/pages/AuditManagerPage.tsx` | 285 | 2 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **55** | `mcp-server/web/src/pages/CycleTimePage.tsx` | 535 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **55** | `mcp-server/web/src/pages/DocumentLearningPage.tsx` | 533 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **55** | `mcp-server/web/src/pages/EmployeePortalPage.tsx` | 547 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **55** | `mcp-server/web/src/pages/InvoicesPage.tsx` | 524 | 1 / 5 | — | — | `mcp-server/web/src/App.tsx` |
| **55** | `mcp-server/web/src/pages/OSHACompliancePage.tsx` | 269 | 2 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **55** | `mcp-server/web/src/pages/PreventiveMaintenancePage.tsx` | 277 | 2 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **55** | `mcp-server/web/src/pages/ReceivingInspectionPage.tsx` | 259 | 2 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **55** | `mcp-server/web/src/pages/ViewerPage.tsx` | 526 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **55** | `mcp-server/web/src/pages/WhatIfPage.tsx` | 503 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **54** | `mcp-server/web/src/pages/CreditManagementPage.tsx` | 209 | 2 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **54** | `mcp-server/web/src/pages/ExportsPage.tsx` | 480 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **54** | `mcp-server/web/src/pages/FeatureTogglePage.tsx` | 461 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **54** | `mcp-server/web/src/pages/MaterialPricingPage.tsx` | 455 | 1 / 4 | — | — | `mcp-server/web/src/App.tsx` |
| **54** | `mcp-server/web/src/pages/PayrollPage.tsx` | 497 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **53** | `mcp-server/web/src/contexts/WedmStudioContext.tsx` | 429 | 1 / 7 | — | — | `mcp-server/web/src/components/wedm-studio/StepOptimize.tsx` |
| **53** | `mcp-server/web/src/pages/CalibrationPage.tsx` | 176 | 2 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **53** | `mcp-server/web/src/pages/DailyFlashReportPage.tsx` | 163 | 2 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **53** | `mcp-server/web/src/pages/EquipmentAssetPage.tsx` | 163 | 2 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **53** | `mcp-server/web/src/pages/JobPlannerPage.tsx` | 402 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **53** | `mcp-server/web/src/pages/PartsLibraryPage.tsx` | 449 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **53** | `mcp-server/web/src/pages/ShopFloorTVPage.tsx` | 174 | 2 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **53** | `mcp-server/web/src/pages/WireEdmResultsPage.tsx` | 439 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **52** | `mcp-server/web/src/features/operating-system/fixtureProvider.ts` | 362 | 1 / 28 | — | — | `mcp-server/web/src/features/operating-system/liveProvider.ts` |
| **52** | `mcp-server/web/src/pages/CapacityPlanningPage.tsx` | 361 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **52** | `mcp-server/web/src/pages/EdmPage.tsx` | 396 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **52** | `mcp-server/web/src/pages/InjectionMoldPage.tsx` | 359 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **52** | `mcp-server/web/src/pages/SecondaryOpsPage.tsx` | 399 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **52** | `mcp-server/web/src/pages/ShellGatewayPage.tsx` | 379 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **52** | `mcp-server/web/src/pages/ShopFloorLivePage.tsx` | 130 | 2 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **52** | `mcp-server/web/src/utils/jobTracking.ts` | 390 | 1 / 9 | — | — | `mcp-server/web/src/features/operating-system/liveProvider.ts` |
| **51** | `mcp-server/web/src/components/employee/EmployeeShellLayout.tsx` | 317 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **51** | `mcp-server/web/src/components/ppg/MachinePickerPanel.tsx` | 328 | 1 / 2 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **51** | `mcp-server/web/src/pages/AdditiveQuotePage.tsx` | 342 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **51** | `mcp-server/web/src/pages/BatchPlanningPage.tsx` | 323 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **51** | `mcp-server/web/src/pages/ExecutiveDashboardPage.tsx` | 337 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **51** | `mcp-server/web/src/pages/SafetyMonitorPage.tsx` | 304 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **50** | `mcp-server/web/src/api/portal.ts` | 288 | 1 / 2 | — | — | `mcp-server/web/src/pages/CustomerPortalPage.tsx` |
| **50** | `mcp-server/web/src/data/academy.ts` | 1721 | 0 / 7 | data-catalog | — | `mcp-server/web/src/components/learning/CourseCatalog.tsx` |
| **50** | `mcp-server/web/src/pages/OEEDashboardPage.tsx` | 263 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **50** | `mcp-server/web/src/pages/StockOptimizerPage.tsx` | 286 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **50** | `mcp-server/web/src/pages/ThreadCalcPage.tsx` | 267 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **50** | `mcp-server/web/src/pages/VendorScorecardPage.tsx` | 281 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **50** | `mcp-server/web/src/types/learning.ts` | 270 | 1 / 14 | — | — | `mcp-server/web/src/features/operating-system/liveProvider.ts` |
| **49** | `mcp-server/web/src/hooks/useWedmPipeline.ts` | 219 | 1 / 5 | — | — | `mcp-server/web/src/components/wedm-studio/StepOptimize.tsx` |
| **49** | `mcp-server/web/src/pages/BlueprintQuotePage.tsx` | 218 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **49** | `mcp-server/web/src/pages/IntegrationsPage.tsx` | 217 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **49** | `mcp-server/web/src/pages/PipelinePage.tsx` | 227 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **49** | `mcp-server/web/src/pages/SheetMetalQuotePage.tsx` | 227 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **49** | `mcp-server/web/src/pages/ToolingCostPage.tsx` | 244 | 1 / 3 | — | — | `mcp-server/web/src/App.tsx` |
| **49** | `mcp-server/web/src/utils/machineConfigurationOptions.ts` | 213 | 1 / 3 | — | — | `mcp-server/web/src/api/calculatorData.ts` |
| **48** | `mcp-server/web/src/components/workspace/RouteStageFallback.tsx` | 159 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **48** | `mcp-server/web/src/contexts/AuthContext.tsx` | 191 | 1 / 10 | — | — | `mcp-server/web/src/App.tsx` |
| **48** | `mcp-server/web/src/features/operating-system/hotJobSignals.ts` | 191 | 1 / 4 | — | — | `mcp-server/web/src/features/operating-system/liveProvider.ts` |
| **47** | `mcp-server/web/src/api/learning.ts` | 148 | 1 / 1 | — | — | `mcp-server/web/src/features/operating-system/liveProvider.ts` |
| **47** | `mcp-server/web/src/components/learning/LearningPath.tsx` | 126 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **47** | `mcp-server/web/src/components/ProtectedRoute.tsx` | 128 | 1 / 1 | — | — | `mcp-server/web/src/App.tsx` |
| **47** | `mcp-server/web/src/utils/programReleaseRouteMachineResolver.ts` | 142 | 1 / 5 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **47** | `mcp-server/web/src/utils/programReleaseSelectorExtras.ts` | 104 | 1 / 5 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **46** | `mcp-server/web/src/components/LoadingState.tsx` | 91 | 1 / 58 | — | — | `mcp-server/web/src/pages/CustomerPortalPage.tsx` |
| **46** | `mcp-server/web/src/components/SurfaceCrossLink.tsx` | 97 | 1 / 5 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **46** | `mcp-server/web/src/components/ui/Tabs.tsx` | 73 | 1 / 11 | — | — | `mcp-server/web/src/pages/cam-ai-dashboard.tsx` |
| **46** | `mcp-server/web/src/components/workspace/WorkspaceErrorBoundary.tsx` | 92 | 1 / 2 | — | — | `mcp-server/web/src/App.tsx` |
| **46** | `mcp-server/web/src/utils/captureRoute.ts` | 53 | 1 / 12 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **46** | `mcp-server/web/src/utils/jmDieCalculatorAuthority.ts` | 82 | 1 / 1 | — | — | `mcp-server/web/src/api/calculatorData.ts` |
| **46** | `mcp-server/web/src/utils/machinePackageContract.ts` | 99 | 1 / 1 | — | — | `mcp-server/web/src/api/calculatorData.ts` |
| **46** | `mcp-server/web/src/utils/shopFloorRoute.ts` | 54 | 1 / 9 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **45** | `mcp-server/web/src/components/ErrorBoundary.tsx` | 45 | 1 / 2 | — | — | `mcp-server/web/src/pages/MillStudioPage.tsx` |
| **45** | `mcp-server/web/src/components/wedm-studio/InfoTip.tsx` | 37 | 1 / 4 | — | — | `mcp-server/web/src/components/wedm-studio/StepOptimize.tsx` |
| **45** | `mcp-server/web/src/components/wedm-studio/StepErrorCard.tsx` | 42 | 1 / 4 | — | — | `mcp-server/web/src/components/wedm-studio/StepOptimize.tsx` |
| **45** | `mcp-server/web/src/pages/A3ReportPage.tsx` | 819 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **45** | `mcp-server/web/src/pages/PostProcessorPage.tsx` | 1181 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **45** | `mcp-server/web/src/pages/SpeedFeedPage.tsx` | 873 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **44** | `mcp-server/web/src/pages/RootCausePage.tsx` | 711 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **43** | `mcp-server/web/src/pages/LandingPage.tsx` | 679 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **42** | `mcp-server/web/src/data/calculatorHolderLibrary.ts` | 385 | 0 / 3 | data-catalog | — | `mcp-server/web/src/__tests__/calculatorData.test.ts` |
| **42** | `mcp-server/web/src/pages/MillingResultsPage.tsx` | 617 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **42** | `mcp-server/web/src/pages/SPCDashboardPage.tsx` | 631 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **41** | `mcp-server/web/src/pages/MillingWizardPage.tsx` | 576 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **40** | `mcp-server/web/src/pages/DiagnosisPage.tsx` | 541 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **40** | `mcp-server/web/src/pages/KanbanBoardPage.tsx` | 524 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **39** | `mcp-server/web/src/components/learning/CourseCatalog.tsx` | 457 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **39** | `mcp-server/web/src/components/learning/LessonView.tsx` | 487 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **39** | `mcp-server/web/src/pages/KaizenBoardPage.tsx` | 470 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **38** | `mcp-server/web/src/pages/CourseViewerPage.tsx` | 410 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **38** | `mcp-server/web/src/pages/EmployeeProfilePage.tsx` | 410 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **38** | `mcp-server/web/src/pages/MechanicalDesignPage.tsx` | 420 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **38** | `mcp-server/web/src/pages/PpgPage.tsx` | 412 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **38** | `mcp-server/web/src/pages/ValueStreamPage.tsx` | 411 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **37** | `mcp-server/src/bot/bot-config.ts` | 144 | 0 / 1 | bot | — | `mcp-server/src/bot/webhook-receiver.ts` |
| **37** | `mcp-server/web/src/pages/FleetLearningDashboardPage.tsx` | 388 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **37** | `mcp-server/web/src/pages/MachineLivePage.tsx` | 384 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **37** | `mcp-server/web/src/pages/MillingUploadPage.tsx` | 367 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **37** | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` | 381 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **36** | `mcp-server/web/src/data/machines.ts` | 59 | 0 / 4 | data-catalog | — | `mcp-server/web/src/components/sfc/AdvancedCharts.tsx` |
| **36** | `mcp-server/web/src/data/materials.ts` | 70 | 0 / 4 | data-catalog | — | `mcp-server/web/src/components/sfc/CompatibilityValidator.tsx` |
| **36** | `mcp-server/web/src/data/operations.ts` | 78 | 0 / 3 | data-catalog | — | `mcp-server/web/src/components/sfc/OperationSelector.tsx` |
| **36** | `mcp-server/web/src/data/tools.ts` | 86 | 0 / 3 | data-catalog | — | `mcp-server/web/src/components/sfc/CompatibilityValidator.tsx` |
| **36** | `mcp-server/web/src/pages/AILearningDashboardPage.tsx` | 334 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **36** | `mcp-server/web/src/pages/KnowledgeBrowserPage.tsx` | 343 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **36** | `mcp-server/web/src/pages/KnowledgeIngestionPage.tsx` | 310 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **36** | `mcp-server/web/src/pages/ShopDashboardPage.tsx` | 336 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **35** | `mcp-server/src/cli/index.ts` | 1662 | 0 / 0 | cli | — | `—` |
| **35** | `mcp-server/src/data/agie-power-extracted.ts` | 1181 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/hurco-winmax-knowledge.ts` | 1073 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/hypermill-automation-center.ts` | 2374 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/jmdie-wedm-program-index.ts` | 902 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/lathe-hardening-catalog.ts` | 1716 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/lathe-tooling-catalog.ts` | 1230 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/makino-duo-extracted.ts` | 1050 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/makino-sp-extracted.ts` | 11479 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/mill-resources-index.ts` | 920 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/mitsubishi-fa-advance-extracted.ts` | 1230 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/okuma-osp-program-examples.ts` | 1737 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/okuma-program-examples.ts` | 1396 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/data/wedm-resources-index.ts` | 1559 | 0 / 0 | data-catalog | — | `—` |
| **35** | `mcp-server/src/schemas/ppActionSchemas.ts` | 912 | 0 / 0 | schema | — | `—` |
| **35** | `mcp-server/src/scripts/generate-roadmap.ts` | 1096 | 0 / 0 | script | — | `—` |
| **35** | `mcp-server/src/scripts/scrutinize-roadmap.ts` | 1288 | 0 / 0 | script | — | `—` |
| **35** | `mcp-server/src/tools/dispatchers/algorithmDispatcher.ts` | 768 | 0 / 0 | dispatcher | — | `—` |
| **35** | `mcp-server/src/tools/dispatchers/ppDispatcher.ts` | 6420 | 0 / 0 | dispatcher | — | `—` |
| **35** | `mcp-server/web/src/components/learning/CourseDetail.tsx` | 276 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **35** | `mcp-server/web/src/components/learning/MachineWizard.tsx` | 255 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **35** | `mcp-server/web/src/components/ppg/PostLibraryUI.tsx` | 274 | 1 / 0 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **35** | `mcp-server/web/src/pages/AdminPage.tsx` | 251 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **35** | `mcp-server/web/src/pages/CncOpsPage.tsx` | 250 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **35** | `mcp-server/web/src/pages/CompliancePage.tsx` | 277 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **35** | `mcp-server/web/src/pages/QualityPage.tsx` | 266 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **35** | `mcp-server/web/src/pages/ThermalPage.tsx` | 273 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **34** | `mcp-server/src/data/makino-duo-v6-extracted.ts` | 739 | 0 / 0 | data-catalog | — | `—` |
| **34** | `mcp-server/src/data/mitsubishi-fa-s-extracted.ts` | 716 | 0 / 0 | data-catalog | — | `—` |
| **34** | `mcp-server/web/src/components/learning/MaterialWizard.tsx` | 249 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **34** | `mcp-server/web/src/components/learning/ToolWizard.tsx` | 202 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **34** | `mcp-server/web/src/components/ppg/FeatureTogglePanel.tsx` | 231 | 1 / 0 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **34** | `mcp-server/web/src/components/ppg/ToolConfigCard.tsx` | 248 | 1 / 0 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **34** | `mcp-server/web/src/components/SetupInstructionPanel.tsx` | 248 | 1 / 0 | — | — | `mcp-server/web/src/pages/LatheResultsPage.tsx` |
| **34** | `mcp-server/web/src/pages/FormingPage.tsx` | 225 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **34** | `mcp-server/web/src/pages/LoginPage.tsx` | 201 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **34** | `mcp-server/web/src/pages/PostProcessorStorePage.tsx` | 228 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **34** | `mcp-server/web/src/pages/SettingsPage.tsx` | 247 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **34** | `mcp-server/web/src/pages/TelemetryPage.tsx` | 216 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **34** | `mcp-server/web/src/pages/WeldingPage.tsx` | 240 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **33** | `mcp-server/src/data/mitsubishi-fa-tech-extracted.ts` | 662 | 0 / 0 | data-catalog | — | `—` |
| **33** | `mcp-server/src/data/okuma-machines-from-step.ts` | 679 | 0 / 0 | data-catalog | — | `—` |
| **33** | `mcp-server/web/src/api/inbox.ts` | 158 | 1 / 0 | — | — | `mcp-server/web/src/pages/DocumentInboxPage.tsx` |
| **33** | `mcp-server/web/src/components/calculator/PassScheduleChart.tsx` | 162 | 1 / 0 | — | — | `mcp-server/web/src/components/calculator/LatheThreadingPanel.tsx` |
| **33** | `mcp-server/web/src/components/learning/DigitalTwin.tsx` | 156 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **33** | `mcp-server/web/src/components/learning/KnowledgeSearch.tsx` | 167 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **33** | `mcp-server/web/src/components/ppg/ControllerOverridePanel.tsx` | 169 | 1 / 0 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **33** | `mcp-server/web/src/components/ppg/GcodeComparisonPanel.tsx` | 171 | 1 / 0 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **33** | `mcp-server/web/src/components/ppg/GcodePreviewPanel.tsx` | 159 | 1 / 0 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **33** | `mcp-server/web/src/components/ppg/HolderSelectorPanel.tsx` | 199 | 1 / 0 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **33** | `mcp-server/web/src/components/ppg/MaterialSearchPanel.tsx` | 186 | 1 / 0 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **33** | `mcp-server/web/src/components/ppg/PostPreviewComponent.tsx` | 173 | 1 / 0 | — | — | `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` |
| **33** | `mcp-server/web/src/pages/CostEstimatorPage.tsx` | 162 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **33** | `mcp-server/web/src/pages/ErpDashboard.tsx` | 170 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **33** | `mcp-server/web/src/pages/GrindingPage.tsx` | 198 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **33** | `mcp-server/web/src/pages/KnowledgeExtPage.tsx` | 187 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **33** | `mcp-server/web/src/pages/SafetyDashboardPage.tsx` | 165 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **33** | `mcp-server/web/src/pages/TurningPage.tsx` | 190 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **33** | `mcp-server/web/src/pages/VibrationPage.tsx` | 199 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **32** | `mcp-server/web/src/components/calculator/SurfaceIntegrityCard.tsx` | 133 | 1 / 0 | — | — | `mcp-server/web/src/components/calculator/LatheHardTurningPanel.tsx` |
| **32** | `mcp-server/web/src/components/learning/Assessment.tsx` | 143 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **32** | `mcp-server/web/src/components/learning/ProgressTracker.tsx` | 135 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **32** | `mcp-server/web/src/contexts/LearningContext.tsx` | 101 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **32** | `mcp-server/web/src/pages/CamStrategyPage.tsx` | 141 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **32** | `mcp-server/web/src/pages/DataManagementPage.tsx` | 135 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **32** | `mcp-server/web/src/pages/RFQInboxPage.tsx` | 135 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **32** | `mcp-server/web/src/pages/WireEdmStudioPage.tsx` | 148 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **31** | `mcp-server/src/data/jm-die-wedm-program-patterns.ts` | 571 | 0 / 0 | data-catalog | — | `—` |
| **31** | `mcp-server/src/data/marks-multus-patterns.ts` | 579 | 0 / 0 | data-catalog | — | `—` |
| **31** | `mcp-server/web/src/components/learning/LearningLayout.tsx` | 70 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **31** | `mcp-server/web/src/pages/CommissionTrackerPage.tsx` | 68 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **31** | `mcp-server/web/src/pages/SalesPipelinePage.tsx` | 75 | 1 / 0 | — | — | `mcp-server/web/src/App.tsx` |
| **30** | `mcp-server/src/data/makino-tech-extracted.ts` | 533 | 0 / 0 | data-catalog | — | `—` |
| **30** | `mcp-server/src/data/okuma-osp-advanced-knowledge.ts` | 503 | 0 / 0 | data-catalog | — | `—` |
| **30** | `mcp-server/src/data/okuma-osp-extracted-tips.ts` | 510 | 0 / 0 | data-catalog | — | `—` |
| **30** | `mcp-server/web/src/utils/crossLinks.ts` | 24 | 1 / 0 | — | — | `mcp-server/src/__tests__/l8-p1-learning-web.test.ts` |
| **29** | `mcp-server/src/data/hypermill-turning-strategy-catalog.ts` | 458 | 0 / 0 | data-catalog | — | `—` |
| **29** | `mcp-server/src/data/lathe-physics-science-tips.ts` | 473 | 0 / 0 | data-catalog | — | `—` |
| **28** | `mcp-server/src/routes/python-api.ts` | 424 | 0 / 0 | route | — | `—` |
| **28** | `mcp-server/src/tools/dispatchers/agentDispatcher.ts` | 413 | 0 / 0 | dispatcher | — | `—` |
| **27** | `mcp-server/src/data/jmdie-mill-program-index.ts` | 370 | 0 / 0 | data-catalog | — | `—` |
| **27** | `mcp-server/src/data/jmdie-proven-mill-programs.ts` | 361 | 0 / 0 | data-catalog | — | `—` |
| **27** | `mcp-server/src/data/okuma-macro-patterns.ts` | 364 | 0 / 0 | data-catalog | — | `—` |
| **26** | `mcp-server/src/bot/discord-bot.ts` | 323 | 0 / 0 | bot | — | `—` |
| **26** | `mcp-server/src/bot/webhook-receiver.ts` | 320 | 0 / 0 | bot | — | `—` |
| **26** | `mcp-server/src/data/jmdie-milling-macros.ts` | 317 | 0 / 0 | data-catalog | — | `—` |
| **26** | `mcp-server/src/data/turning-vendor-catalog-loader.ts` | 341 | 0 / 0 | data-catalog | — | `—` |
| **25** | `mcp-server/src/bot/messaging-adapter.ts` | 262 | 0 / 0 | bot | — | `—` |
| **25** | `mcp-server/src/data/lathe-tribal-tips-okuma.ts` | 287 | 0 / 0 | data-catalog | — | `—` |
| **25** | `mcp-server/src/queue/JobQueueEngine.ts` | 264 | 0 / 0 | queue-engine | — | `—` |
| **25** | `mcp-server/src/schemas/aiInterfaceSchemas.ts` | 250 | 0 / 0 | schema | — | `—` |
| **25** | `mcp-server/src/schemas/selfAwarenessSchema.ts` | 294 | 0 / 0 | schema | — | `—` |
| **25** | `mcp-server/src/tools/dispatchers/resourceHarvestingDispatcher.ts` | 265 | 0 / 0 | dispatcher | — | `—` |
| **24** | `mcp-server/src/routes/shopProfile.ts` | 216 | 0 / 0 | route | — | `—` |
| **24** | `mcp-server/src/schemas/hookStateSchemas.ts` | 228 | 0 / 0 | schema | — | `—` |
| **24** | `mcp-server/src/scripts/index-roadmap-outputs.ts` | 202 | 0 / 0 | script | — | `—` |
| **24** | `mcp-server/src/storage/FileStorageEngine.ts` | 225 | 0 / 0 | storage-engine | — | `—` |
| **24** | `mcp-server/src/tools/dispatchers/camFunctionDispatcher.ts` | 202 | 0 / 0 | dispatcher | — | `—` |
| **23** | `mcp-server/src/cli/formatters.ts` | 163 | 0 / 0 | cli | — | `—` |
| **23** | `mcp-server/src/routes/shopLive.ts` | 181 | 0 / 0 | route | — | `—` |
| **22** | `mcp-server/src/schemas/camFunctionActionSchemas.ts` | 108 | 0 / 0 | schema | — | `—` |
| **22** | `mcp-server/src/schemas/camxMs22U01ActionSchemas.ts` | 114 | 0 / 0 | schema | — | `—` |
| **21** | `mcp-server/src/cli/config.ts` | 95 | 0 / 0 | cli | — | `—` |
| **21** | `mcp-server/src/migrations/stateMigrations.ts` | 78 | 0 / 0 | migration | — | `—` |
| **21** | `mcp-server/src/routes/upload.ts` | 98 | 0 / 0 | route | — | `—` |
| **21** | `mcp-server/src/routes/userLibrary.ts` | 82 | 0 / 0 | route | — | `—` |
| **21** | `mcp-server/src/tools/schemas/resourceHarvestingSchema.ts` | 79 | 0 / 0 | schema | — | `—` |
| **20** | `mcp-server/src/cli/stdin.ts` | 43 | 0 / 0 | cli | — | `—` |
| **20** | `mcp-server/src/routes/cncOps.ts` | 20 | 0 / 0 | route | — | `—` |
| **20** | `mcp-server/src/routes/diagnosis.ts` | 22 | 0 / 0 | route | — | `—` |
| **20** | `mcp-server/src/routes/mechanical.ts` | 44 | 0 / 0 | route | — | `—` |
| **20** | `mcp-server/src/routes/settings.ts` | 15 | 0 / 0 | route | — | `—` |
| **20** | `mcp-server/src/routes/specialty.ts` | 29 | 0 / 0 | route | — | `—` |
| **20** | `mcp-server/src/routes/thermal.ts` | 26 | 0 / 0 | route | — | `—` |
| **20** | `mcp-server/src/routes/vibration.ts` | 20 | 0 / 0 | route | — | `—` |
| **20** | `mcp-server/src/schemas/wedmWireBreakPredictorSchemas.ts` | 39 | 0 / 0 | schema | — | `—` |
| **20** | `mcp-server/web/src/data/calculatorProgrammingCatalogSupplements.ts` | 10 | 0 / 0 | data-catalog | — | `—` |
| **20** | `mcp-server/web/src/main.tsx` | 14 | 0 / 0 | vite-entry | — | `—` |
| **20** | `mcp-server/web/src/types/qrcode.d.ts` | 21 | 0 / 0 | type-decl | — | `—` |
| **10** | `mcp-server/web/src/vite-env.d.ts` | 2 | 0 / 0 | type-decl | — | `—` |

## TEST — vitest auto-discovers under __tests__/ (154)

| Score | File | LOC |
|---:|---|---:|
| **20** | `mcp-server/src/__tests__/FileStorageEngine.test.ts` | 503 |
| **25** | `mcp-server/src/__tests__/devDispatcher.modelTelemetry.test.ts` | 281 |
| **19** | `mcp-server/src/__tests__/feedbackBus.e2e.test.ts` | 469 |
| **23** | `mcp-server/src/engines/__tests__/ThinWallMachiningEngine.test.ts` | 650 |
| **13** | `mcp-server/web/src/__tests__/AlarmPage.test.tsx` | 183 |
| **13** | `mcp-server/web/src/__tests__/CADRegressionDashboardPage.test.tsx` | 168 |
| **17** | `mcp-server/web/src/__tests__/CalculatorPage.autoProgramming.test.tsx` | 360 |
| **11** | `mcp-server/web/src/__tests__/CalculatorPage.commerce.test.tsx` | 84 |
| **15** | `mcp-server/web/src/__tests__/CalculatorPage.finishView.test.tsx` | 287 |
| **25** | `mcp-server/web/src/__tests__/CalculatorPage.machineSelection.test.tsx` | 828 |
| **16** | `mcp-server/web/src/__tests__/CalculatorPage.matrix.test.tsx` | 341 |
| **13** | `mcp-server/web/src/__tests__/CalculatorPage.prismMode.test.tsx` | 164 |
| **13** | `mcp-server/web/src/__tests__/CalculatorPage.routeContinuity.test.tsx` | 186 |
| **10** | `mcp-server/web/src/__tests__/CalculatorPage.setupPreview.test.tsx` | 46 |
| **18** | `mcp-server/web/src/__tests__/CalculatorPage.solveWorkflows.test.tsx` | 441 |
| **25** | `mcp-server/web/src/__tests__/CalculatorPage.test.tsx` | 762 |
| **16** | `mcp-server/web/src/__tests__/CaptureOpsPage.test.tsx` | 348 |
| **20** | `mcp-server/web/src/__tests__/CustomerPortalPage.test.tsx` | 510 |
| **15** | `mcp-server/web/src/__tests__/CustomersPage.test.tsx` | 265 |
| **13** | `mcp-server/web/src/__tests__/CycleTimePage.test.tsx` | 189 |
| **17** | `mcp-server/web/src/__tests__/DashboardPage.test.tsx` | 396 |
| **12** | `mcp-server/web/src/__tests__/DepartmentDashboardPage.test.tsx` | 141 |
| **11** | `mcp-server/web/src/__tests__/DocumentLearningPage.test.tsx` | 98 |
| **13** | `mcp-server/web/src/__tests__/EdmPage.test.tsx` | 167 |
| **12** | `mcp-server/web/src/__tests__/EmployeePortalPage.test.tsx` | 142 |
| **11** | `mcp-server/web/src/__tests__/EmployeeShellLayout.test.tsx` | 98 |
| **11** | `mcp-server/web/src/__tests__/ExecutiveDashboardPage.test.tsx` | 70 |
| **13** | `mcp-server/web/src/__tests__/FeatureTogglePage.test.tsx` | 196 |
| **14** | `mcp-server/web/src/__tests__/FinancialAnalysisPage.test.tsx` | 201 |
| **14** | `mcp-server/web/src/__tests__/GeneralLedgerPage.test.tsx` | 237 |
| **18** | `mcp-server/web/src/__tests__/InventoryPage.test.tsx` | 400 |
| **17** | `mcp-server/web/src/__tests__/InvoicesPage.test.tsx` | 386 |
| **12** | `mcp-server/web/src/__tests__/JobPlannerPage.test.tsx` | 124 |
| **25** | `mcp-server/web/src/__tests__/JobsPage.test.tsx` | 1506 |
| **21** | `mcp-server/web/src/__tests__/Layout.test.tsx` | 582 |
| **15** | `mcp-server/web/src/__tests__/LearningDashboard.test.tsx` | 283 |
| **14** | `mcp-server/web/src/__tests__/LearningPath.test.tsx` | 208 |
| **12** | `mcp-server/web/src/__tests__/MachineRatesPage.test.tsx` | 149 |
| **13** | `mcp-server/web/src/__tests__/MaterialPricingPage.test.tsx` | 197 |
| **21** | `mcp-server/web/src/__tests__/MessagesPage.test.tsx` | 566 |
| **12** | `mcp-server/web/src/__tests__/NotificationBell.test.tsx` | 142 |
| **12** | `mcp-server/web/src/__tests__/OEEDashboardPage.test.tsx` | 102 |
| **13** | `mcp-server/web/src/__tests__/OperatingSystemProvider.test.tsx` | 169 |
| **12** | `mcp-server/web/src/__tests__/OperatorFeedbackPanel.test.tsx` | 113 |
| **12** | `mcp-server/web/src/__tests__/OptimizationReportPage.test.tsx` | 149 |
| **19** | `mcp-server/web/src/__tests__/OrderTrackingPage.test.tsx` | 456 |
| **14** | `mcp-server/web/src/__tests__/PartsLibraryPage.test.tsx` | 201 |
| **18** | `mcp-server/web/src/__tests__/PostProcessorGeneratorPage.test.tsx` | 435 |
| **21** | `mcp-server/web/src/__tests__/ProgramReleasePage.test.tsx` | 592 |
| **11** | `mcp-server/web/src/__tests__/ProtectedRoute.test.tsx` | 98 |
| **12** | `mcp-server/web/src/__tests__/ProveOutWorkflowPage.test.tsx` | 123 |
| **17** | `mcp-server/web/src/__tests__/PurchaseOrdersPage.test.tsx` | 376 |
| **15** | `mcp-server/web/src/__tests__/PurchasingPage.test.tsx` | 284 |
| **13** | `mcp-server/web/src/__tests__/QualityManagementPage.test.tsx` | 172 |
| **11** | `mcp-server/web/src/__tests__/QuoteAnalyticsPage.test.tsx` | 92 |
| **16** | `mcp-server/web/src/__tests__/QuoteBuilderPage.test.tsx` | 316 |
| **15** | `mcp-server/web/src/__tests__/QuoteFollowUpPage.test.tsx` | 286 |
| **10** | `mcp-server/web/src/__tests__/RouteStageFallback.test.tsx` | 30 |
| **13** | `mcp-server/web/src/__tests__/SafetyMonitorPage.test.tsx` | 183 |
| **14** | `mcp-server/web/src/__tests__/SchedulingPage.test.tsx` | 209 |
| **12** | `mcp-server/web/src/__tests__/SecondaryOpsPage.test.tsx` | 122 |
| **12** | `mcp-server/web/src/__tests__/SetupSheetPage.test.tsx` | 120 |
| **11** | `mcp-server/web/src/__tests__/ShellCommerceControls.test.tsx` | 78 |
| **12** | `mcp-server/web/src/__tests__/ShellGatewayPage.test.tsx` | 126 |
| **23** | `mcp-server/web/src/__tests__/ShopFloorClockPage.test.tsx` | 686 |
| **13** | `mcp-server/web/src/__tests__/ShopProfilePage.test.tsx` | 172 |
| **13** | `mcp-server/web/src/__tests__/SurfaceCrossLink.test.tsx` | 151 |
| **13** | `mcp-server/web/src/__tests__/ToolOptimizationPage.test.tsx` | 168 |
| **12** | `mcp-server/web/src/__tests__/ToolpathAdvisorPage.test.tsx` | 143 |
| **13** | `mcp-server/web/src/__tests__/VendorScorecardPage.test.tsx` | 193 |
| **13** | `mcp-server/web/src/__tests__/Viewer3D.test.tsx` | 183 |
| **12** | `mcp-server/web/src/__tests__/ViewerPage.test.tsx` | 131 |
| **15** | `mcp-server/web/src/__tests__/WedmAutonomyIndicator.test.tsx` | 252 |
| **18** | `mcp-server/web/src/__tests__/WedmCompletionModal.test.tsx` | 424 |
| **13** | `mcp-server/web/src/__tests__/WedmControllerCodePreview.test.tsx` | 156 |
| **14** | `mcp-server/web/src/__tests__/WedmFlushPressureAdvisor.test.tsx` | 220 |
| **16** | `mcp-server/web/src/__tests__/WedmJobCard.test.tsx` | 324 |
| **13** | `mcp-server/web/src/__tests__/WedmKerfCalculator.test.tsx` | 188 |
| **13** | `mcp-server/web/src/__tests__/WedmMaterialThicknessChart.test.tsx` | 154 |
| **14** | `mcp-server/web/src/__tests__/WedmPassPlanner.test.tsx` | 207 |
| **14** | `mcp-server/web/src/__tests__/WedmQuoteSection.test.tsx` | 238 |
| **16** | `mcp-server/web/src/__tests__/WedmRULGauge.test.tsx` | 303 |
| **15** | `mcp-server/web/src/__tests__/WedmSafetyBadge.test.tsx` | 260 |
| **13** | `mcp-server/web/src/__tests__/WedmSparkConditionMatrix.test.tsx` | 166 |
| **13** | `mcp-server/web/src/__tests__/WedmTribalTipCard.test.tsx` | 156 |
| **11** | `mcp-server/web/src/__tests__/WhatIfPage.test.tsx` | 50 |
| **13** | `mcp-server/web/src/__tests__/WireEdmCalibrationPanel.test.tsx` | 177 |
| **25** | `mcp-server/web/src/__tests__/WireEdmOptimizeCards.test.tsx` | 1194 |
| **25** | `mcp-server/web/src/__tests__/WireEdmPages.test.tsx` | 1871 |
| **14** | `mcp-server/web/src/__tests__/WireEdmResultsPage.test.tsx` | 239 |
| **11** | `mcp-server/web/src/__tests__/WorkspaceErrorBoundary.test.tsx` | 52 |
| **10** | `mcp-server/web/src/__tests__/academy-storage-hardening.test.tsx` | 23 |
| **18** | `mcp-server/web/src/__tests__/calculator-wedm-e2e.test.ts` | 429 |
| **25** | `mcp-server/web/src/__tests__/calculatorCatalogCoverage.test.ts` | 1668 |
| **12** | `mcp-server/web/src/__tests__/calculatorCoolantStrategy.test.ts` | 125 |
| **25** | `mcp-server/web/src/__tests__/calculatorData.test.ts` | 2250 |
| **23** | `mcp-server/web/src/__tests__/calculatorJmDieMillVariabilityOracle.test.ts` | 659 |
| **12** | `mcp-server/web/src/__tests__/calculatorParameterOptimization.test.ts` | 103 |
| **16** | `mcp-server/web/src/__tests__/calculatorPrismMode.test.ts` | 317 |
| **12** | `mcp-server/web/src/__tests__/calculatorProgrammingCoverage.test.ts` | 134 |
| **12** | `mcp-server/web/src/__tests__/calculatorPurchaseRecommendations.test.ts` | 125 |
| **14** | `mcp-server/web/src/__tests__/calculatorScenarioMatrix.test.ts` | 229 |
| **13** | `mcp-server/web/src/__tests__/calculatorSetupPreview.test.ts` | 166 |
| **24** | `mcp-server/web/src/__tests__/calculatorSpeedFeedContract.test.ts` | 729 |
| **11** | `mcp-server/web/src/__tests__/calculatorStrategyRegistryBridge.test.ts` | 55 |
| **15** | `mcp-server/web/src/__tests__/calculatorSurfaceFinish.test.ts` | 274 |
| **15** | `mcp-server/web/src/__tests__/calculatorTooling.test.ts` | 279 |
| **13** | `mcp-server/web/src/__tests__/calculatorToolpathTaxonomy.test.ts` | 155 |
| **15** | `mcp-server/web/src/__tests__/calculatorToolpathUniverseCoverage.test.ts` | 265 |
| **14** | `mcp-server/web/src/__tests__/chart-components.test.tsx` | 209 |
| **12** | `mcp-server/web/src/__tests__/client.test.ts` | 135 |
| **14** | `mcp-server/web/src/__tests__/component-units.test.tsx` | 247 |
| **15** | `mcp-server/web/src/__tests__/core-pages.test.tsx` | 282 |
| **11** | `mcp-server/web/src/__tests__/dashboardHotReleaseSeed.test.ts` | 73 |
| **12** | `mcp-server/web/src/__tests__/document-learning.test.tsx` | 145 |
| **14** | `mcp-server/web/src/__tests__/erp-pages-batch2.test.tsx` | 231 |
| **12** | `mcp-server/web/src/__tests__/erp-pages-batch3.test.tsx` | 106 |
| **16** | `mcp-server/web/src/__tests__/erp-pages.test.tsx` | 342 |
| **17** | `mcp-server/web/src/__tests__/financeContinuityChain.test.tsx` | 350 |
| **11** | `mcp-server/web/src/__tests__/hotJobSignals.test.ts` | 53 |
| **12** | `mcp-server/web/src/__tests__/jmDieCalculatorPostWorkflowState.test.ts` | 143 |
| **11** | `mcp-server/web/src/__tests__/jmDieCalculatorRouteAuthority.test.ts` | 95 |
| **25** | `mcp-server/web/src/__tests__/liveProvider.test.ts` | 1445 |
| **20** | `mcp-server/web/src/__tests__/machineConfigurationOptions.test.ts` | 504 |
| **14** | `mcp-server/web/src/__tests__/manufacturing-pages.test.tsx` | 226 |
| **14** | `mcp-server/web/src/__tests__/manufacturing-utility-pages.test.tsx` | 205 |
| **20** | `mcp-server/web/src/__tests__/modeHygieneReducer.test.ts` | 518 |
| **10** | `mcp-server/web/src/__tests__/numericExpression.test.ts` | 27 |
| **15** | `mcp-server/web/src/__tests__/operations-quality-pages.test.tsx` | 279 |
| **15** | `mcp-server/web/src/__tests__/orderTrackingContinuityChain.test.tsx` | 271 |
| **12** | `mcp-server/web/src/__tests__/orphan-pages.test.tsx` | 100 |
| **11** | `mcp-server/web/src/__tests__/partsLibraryReleaseSeed.test.ts` | 72 |
| **13** | `mcp-server/web/src/__tests__/people-finance-tooling-pages.test.tsx` | 178 |
| **23** | `mcp-server/web/src/__tests__/people-ops-pages.test.tsx` | 689 |
| **13** | `mcp-server/web/src/__tests__/physicsPreviewWorker.test.ts` | 173 |
| **14** | `mcp-server/web/src/__tests__/planning-learning-pages.test.tsx` | 247 |
| **12** | `mcp-server/web/src/__tests__/portal-api.test.ts` | 141 |
| **10** | `mcp-server/web/src/__tests__/programReleaseRouteMachineResolver.test.ts` | 42 |
| **11** | `mcp-server/web/src/__tests__/programReleaseSelectorExtras.test.ts` | 60 |
| **12** | `mcp-server/web/src/__tests__/programmingAuthorityContract.test.ts` | 105 |
| **11** | `mcp-server/web/src/__tests__/quote-follow-up-api.test.ts` | 84 |
| **17** | `mcp-server/web/src/__tests__/quote-pages.test.tsx` | 388 |
| **15** | `mcp-server/web/src/__tests__/quote-specialization-pages.test.tsx` | 277 |
| **16** | `mcp-server/web/src/__tests__/remaining-pages.test.tsx` | 349 |
| **11** | `mcp-server/web/src/__tests__/routeContext.test.ts` | 72 |
| **11** | `mcp-server/web/src/__tests__/routeMachineWorkspaceAuthority.test.ts` | 76 |
| **11** | `mcp-server/web/src/__tests__/routeProgrammingAuthority.test.ts` | 64 |
| **12** | `mcp-server/web/src/__tests__/selectorAuthorityContract.test.ts` | 132 |
| **11** | `mcp-server/web/src/__tests__/shellSavedViewsState.test.ts` | 69 |
| **11** | `mcp-server/web/src/__tests__/types.test.ts` | 72 |
| **12** | `mcp-server/web/src/__tests__/useLearningCourseRegistry.test.tsx` | 122 |
| **12** | `mcp-server/web/src/__tests__/useOrchestrator.test.tsx` | 139 |
| **23** | `mcp-server/web/src/__tests__/workflowContinuityChain.test.tsx` | 669 |
| **10** | `mcp-server/web/src/__tests__/workflowRouteContext.test.ts` | 21 |

## AMBIGUOUS — only untracked files import them (268)

| Score | File | LOC | Inbound tracked / untracked | Entry-point | Deleted by | Sample importer |
|---:|---|---:|---|---|---|---|
| **30** | `mcp-server/web/src/api/wedmCoordination.ts` | 752 | 0 / 7 | — | — | `mcp-server/web/src/__tests__/WedmAutonomyIndicator.test.tsx` |
| **30** | `mcp-server/web/src/components/calculator/CalculatorProgramWorkbench.tsx` | 1474 | 0 / 2 | — | — | `mcp-server/web/src/features/machine-workspace/MachineWorkspaceShell.tsx` |
| **30** | `mcp-server/web/src/components/calculator/WireEdmBackplot.tsx` | 841 | 0 / 1 | — | — | `mcp-server/web/src/pages/CalculatorPage.tsx` |
| **30** | `mcp-server/web/src/components/calculator/WireEdmOptimizeCards.tsx` | 1754 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/WireEdmOptimizeCards.test.tsx` |
| **30** | `mcp-server/web/src/components/ppg/AIIntelligencePanel.tsx` | 838 | 0 / 1 | — | — | `mcp-server/web/src/pages/PpgPage.tsx` |
| **30** | `mcp-server/web/src/components/wedm-studio/ProfileCanvas.tsx` | 838 | 0 / 1 | — | — | `mcp-server/web/src/pages/WireEdmStudioPage.tsx` |
| **30** | `mcp-server/web/src/features/machine-workspace/selectorAuthorityContract.ts` | 822 | 0 / 7 | — | — | `mcp-server/web/src/__tests__/selectorAuthorityContract.test.ts` |
| **30** | `mcp-server/web/src/pages/QuoteFollowUpPage.tsx` | 1053 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/QuoteFollowUpPage.test.tsx` |
| **30** | `mcp-server/web/src/utils/calculatorI18n.ts` | 2360 | 0 / 1 | — | — | `mcp-server/web/src/pages/CalculatorPage.tsx` |
| **30** | `mcp-server/web/src/utils/calculatorPrismMode.ts` | 1116 | 0 / 4 | — | — | `mcp-server/web/src/__tests__/calculatorCatalogCoverage.test.ts` |
| **30** | `mcp-server/web/src/utils/calculatorPurchaseRecommendations.ts` | 777 | 0 / 3 | — | — | `mcp-server/web/src/__tests__/calculatorPurchaseRecommendations.test.ts` |
| **30** | `mcp-server/web/src/utils/calculatorSetupPreview.ts` | 811 | 0 / 5 | — | — | `mcp-server/web/src/__tests__/calculatorCatalogCoverage.test.ts` |
| **30** | `mcp-server/web/src/utils/calculatorSpeedFeedContract.ts` | 1124 | 0 / 4 | — | — | `mcp-server/web/src/__tests__/CalculatorPage.solveWorkflows.test.tsx` |
| **30** | `mcp-server/web/src/utils/calculatorSurfaceFinish.ts` | 1779 | 0 / 4 | — | — | `mcp-server/web/src/__tests__/CalculatorPage.matrix.test.tsx` |
| **29** | `mcp-server/web/src/components/wedm-studio/StepReview.tsx` | 730 | 0 / 1 | — | — | `mcp-server/web/src/pages/WireEdmStudioPage.tsx` |
| **29** | `mcp-server/web/src/components/wedm-studio/StepToolpath.tsx` | 715 | 0 / 1 | — | — | `mcp-server/web/src/pages/WireEdmStudioPage.tsx` |
| **28** | `mcp-server/web/src/components/wedm-studio/StepImport.tsx` | 689 | 0 / 1 | — | — | `mcp-server/web/src/pages/WireEdmStudioPage.tsx` |
| **28** | `mcp-server/web/src/components/wedm-studio/StepProgram.tsx` | 689 | 0 / 1 | — | — | `mcp-server/web/src/pages/WireEdmStudioPage.tsx` |
| **28** | `mcp-server/web/src/features/machine-workspace/programmingAuthorityContract.ts` | 683 | 0 / 8 | — | — | `mcp-server/web/src/__tests__/CalculatorPage.matrix.test.tsx` |
| **28** | `mcp-server/web/src/features/operating-system/commerceFixtures.ts` | 682 | 0 / 4 | — | — | `mcp-server/web/src/features/operating-system/fixtureProvider.ts` |
| **27** | `mcp-server/web/src/components/wedm-studio/StepWcs.tsx` | 644 | 0 / 1 | — | — | `mcp-server/web/src/pages/WireEdmStudioPage.tsx` |
| **27** | `mcp-server/web/src/utils/calculatorTooling.ts` | 620 | 0 / 4 | — | — | `mcp-server/web/src/__tests__/calculatorCatalogCoverage.test.ts` |
| **26** | `mcp-server/web/src/api/wireEdm.ts` | 571 | 0 / 8 | — | — | `mcp-server/web/src/__tests__/WedmPassPlanner.test.tsx` |
| **26** | `mcp-server/web/src/components/puoa/WorkspaceAICopilot.tsx` | 569 | 0 / 14 | — | — | `mcp-server/web/src/components/puoa/AppwCalculatorCopilot.tsx` |
| **26** | `mcp-server/web/src/features/operating-system/messageFixtures.ts` | 576 | 0 / 1 | — | — | `mcp-server/web/src/features/operating-system/fixtureProvider.ts` |
| **25** | `mcp-server/web/src/components/jobs/WedmCompletionModal.tsx` | 532 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmCompletionModal.test.tsx` |
| **25** | `mcp-server/web/src/components/quote/WedmQuoteSection.tsx` | 536 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmQuoteSection.test.tsx` |
| **25** | `mcp-server/web/src/utils/calculatorParameterOptimization.ts` | 526 | 0 / 3 | — | — | `mcp-server/web/src/__tests__/calculatorParameterOptimization.test.ts` |
| **25** | `mcp-server/web/src/utils/wedmGeometry.ts` | 535 | 0 / 2 | — | — | `mcp-server/web/src/components/wedm-studio/ProfileCanvas.tsx` |
| **24** | `mcp-server/web/src/api/dashboard.ts` | 453 | 0 / 4 | — | — | `mcp-server/web/src/__tests__/dashboardHotReleaseSeed.test.ts` |
| **24** | `mcp-server/web/src/components/operator/OperatorFeedbackPanel.tsx` | 499 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/OperatorFeedbackPanel.test.tsx` |
| **23** | `mcp-server/web/src/api/viewer.ts` | 431 | 0 / 1 | — | — | `mcp-server/web/src/pages/ViewerPage.tsx` |
| **23** | `mcp-server/web/src/components/calculator/CalculatorBackendAiReview.tsx` | 447 | 0 / 1 | — | — | `mcp-server/web/src/pages/CalculatorPage.tsx` |
| **23** | `mcp-server/web/src/components/learning/LessonVisual.tsx` | 431 | 0 / 1 | — | — | `mcp-server/web/src/components/learning/LessonView.tsx` |
| **23** | `mcp-server/web/src/components/NotificationCenter.tsx` | 409 | 0 / 1 | — | — | `mcp-server/web/src/pages/DashboardPage.tsx` |
| **23** | `mcp-server/web/src/components/shell/shellCatalog.ts` | 431 | 0 / 3 | — | — | `mcp-server/web/src/components/Layout.tsx` |
| **23** | `mcp-server/web/src/components/wedm/WedmSparkConditionMatrix.tsx` | 441 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmSparkConditionMatrix.test.tsx` |
| **23** | `mcp-server/web/src/features/operating-system/schedulingFixtures.ts` | 439 | 0 / 1 | — | — | `mcp-server/web/src/features/operating-system/fixtureProvider.ts` |
| **23** | `mcp-server/web/src/lib/OptimisticSyncManager.ts` | 416 | 0 / 2 | — | — | `mcp-server/web/src/components/SyncStatusIndicator.tsx` |
| **22** | `mcp-server/web/src/components/calculator/CalculatorSetupPreview3D.tsx` | 368 | 0 / 1 | — | — | `mcp-server/web/src/pages/CalculatorPage.tsx` |
| **22** | `mcp-server/web/src/components/calculator/WireEdmContour3D.tsx` | 374 | 0 / 2 | — | — | `mcp-server/web/src/components/calculator/CalculatorProgramWorkbench.tsx` |
| **22** | `mcp-server/web/src/components/NotificationBell.tsx` | 353 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/NotificationBell.test.tsx` |
| **22** | `mcp-server/web/src/components/puoa/AppwInventoryCopilot.tsx` | 352 | 0 / 1 | — | — | `mcp-server/web/src/pages/InventoryPage.tsx` |
| **22** | `mcp-server/web/src/components/wedm/WedmFlushPressureAdvisor.tsx` | 355 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmFlushPressureAdvisor.test.tsx` |
| **22** | `mcp-server/web/src/components/wedm/WedmMaterialThicknessChart.tsx` | 357 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmMaterialThicknessChart.test.tsx` |
| **22** | `mcp-server/web/src/hooks/useMechanical.ts` | 371 | 0 / 1 | — | — | `mcp-server/web/src/pages/MechanicalDesignPage.tsx` |
| **22** | `mcp-server/web/src/pages/CADRegressionDashboardPage.tsx` | 358 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/CADRegressionDashboardPage.test.tsx` |
| **22** | `mcp-server/web/src/utils/calculatorCoolantStrategy.ts` | 387 | 0 / 6 | — | — | `mcp-server/web/src/__tests__/calculatorCatalogCoverage.test.ts` |
| **21** | `mcp-server/web/src/components/calculator/WireEdmContourPicker.tsx` | 308 | 0 / 2 | — | — | `mcp-server/web/src/components/calculator/CalculatorProgramWorkbench.tsx` |
| **21** | `mcp-server/web/src/components/calculator/WireEdmFeasibilityPanel.tsx` | 337 | 0 / 1 | — | — | `mcp-server/web/src/pages/CalculatorPage.tsx` |
| **21** | `mcp-server/web/src/components/jobs/WedmJobCard.tsx` | 325 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmJobCard.test.tsx` |
| **21** | `mcp-server/web/src/components/ppg/AdvancedEnhancer.tsx` | 336 | 0 / 1 | — | — | `mcp-server/web/src/pages/PpgPage.tsx` |
| **21** | `mcp-server/web/src/components/puoa/AppwDashboardCopilot.tsx` | 324 | 0 / 1 | — | — | `mcp-server/web/src/pages/DashboardPage.tsx` |
| **21** | `mcp-server/web/src/components/puoa/AppwMessagesCopilot.tsx` | 319 | 0 / 1 | — | — | `mcp-server/web/src/pages/MessagesPage.tsx` |
| **21** | `mcp-server/web/src/components/puoa/AppwOperatorCopilot.tsx` | 306 | 0 / 1 | — | — | `mcp-server/web/src/pages/ShopFloorClockPage.tsx` |
| **21** | `mcp-server/web/src/components/sfc/AdvancedCharts.tsx` | 311 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **21** | `mcp-server/web/src/components/shell/ShellCommerceControls.tsx` | 306 | 0 / 3 | — | — | `mcp-server/web/src/__tests__/ShellCommerceControls.test.tsx` |
| **21** | `mcp-server/web/src/components/viewer/ViewerToolbar.tsx` | 337 | 0 / 2 | — | — | `mcp-server/web/src/components/viewer/ViewerCanvasWorkspace.tsx` |
| **21** | `mcp-server/web/src/components/wedm-studio/WizardShell.tsx` | 312 | 0 / 1 | — | — | `mcp-server/web/src/pages/WireEdmStudioPage.tsx` |
| **21** | `mcp-server/web/src/components/wedm/WedmAutonomyIndicator.tsx` | 306 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmAutonomyIndicator.test.tsx` |
| **21** | `mcp-server/web/src/components/wedm/WedmControllerCodePreview.tsx` | 319 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmControllerCodePreview.test.tsx` |
| **21** | `mcp-server/web/src/components/wedm/WedmPassPlanner.tsx` | 319 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmPassPlanner.test.tsx` |
| **21** | `mcp-server/web/src/components/wedm/WedmRULGauge.tsx` | 300 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmRULGauge.test.tsx` |
| **21** | `mcp-server/web/src/components/wedm/WireEdmCalibrationPanel.tsx` | 320 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WireEdmCalibrationPanel.test.tsx` |
| **21** | `mcp-server/web/src/features/machine-workspace/MachineIntakeNormalizer.ts` | 326 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/routeMachineWorkspaceAuthority.test.ts` |
| **20** | `mcp-server/web/src/api/speedfeed.ts` | 296 | 0 / 8 | — | — | `mcp-server/web/src/__tests__/calculatorPrismMode.test.ts` |
| **20** | `mcp-server/web/src/components/calculator/WireEdmCostBreakdownPanel.tsx` | 293 | 0 / 1 | — | — | `mcp-server/web/src/pages/CalculatorPage.tsx` |
| **20** | `mcp-server/web/src/components/calculator/WireEdmSurfaceIntegrityPanel.tsx` | 271 | 0 / 1 | — | — | `mcp-server/web/src/pages/CalculatorPage.tsx` |
| **20** | `mcp-server/web/src/components/puoa/AppwCaptureOpsCopilot.tsx` | 290 | 0 / 1 | — | — | `mcp-server/web/src/pages/CaptureOpsPage.tsx` |
| **20** | `mcp-server/web/src/components/puoa/AppwJobsCopilot.tsx` | 294 | 0 / 1 | — | — | `mcp-server/web/src/pages/JobsPage.tsx` |
| **20** | `mcp-server/web/src/components/puoa/AppwPurchaseOrdersCopilot.tsx` | 275 | 0 / 1 | — | — | `mcp-server/web/src/pages/PurchaseOrdersPage.tsx` |
| **20** | `mcp-server/web/src/components/puoa/AppwPurchasingCopilot.tsx` | 272 | 0 / 1 | — | — | `mcp-server/web/src/pages/PurchasingPage.tsx` |
| **20** | `mcp-server/web/src/components/sfc/SmartMaterialSelector.tsx` | 298 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **20** | `mcp-server/web/src/components/shell/PurchaseRecommendationModal.tsx` | 289 | 0 / 3 | — | — | `mcp-server/web/src/pages/AlarmPage.tsx` |
| **20** | `mcp-server/web/src/components/viewer/ToolpathLayer.tsx` | 292 | 0 / 1 | — | — | `mcp-server/web/src/components/viewer/ViewerCanvasWorkspace.tsx` |
| **20** | `mcp-server/web/src/components/wedm/WedmKerfCalculator.tsx` | 277 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmKerfCalculator.test.tsx` |
| **20** | `mcp-server/web/src/components/wedm/WedmSafetyBadge.tsx` | 292 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmSafetyBadge.test.tsx` |
| **20** | `mcp-server/web/src/components/wedm/WedmTribalTipCard.tsx` | 294 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/WedmTribalTipCard.test.tsx` |
| **20** | `mcp-server/web/src/contexts/LatheStudioContext.tsx` | 290 | 0 / 1 | — | — | `mcp-server/web/src/pages/LatheStudioPage.tsx` |
| **20** | `mcp-server/web/src/features/machine-workspace/routeProgrammingAuthority.ts` | 255 | 0 / 5 | — | — | `mcp-server/web/src/__tests__/routeProgrammingAuthority.test.ts` |
| **20** | `mcp-server/web/src/features/operating-system/jobDeskFixtures.ts` | 282 | 0 / 2 | — | — | `mcp-server/web/src/features/operating-system/fixtureProvider.ts` |
| **20** | `mcp-server/web/src/types/erp.ts` | 279 | 0 / 4 | — | — | `mcp-server/web/src/api/erp.ts` |
| **20** | `mcp-server/web/src/utils/sceneParser.ts` | 295 | 0 / 1 | — | — | `mcp-server/web/src/components/viewer/StockMesh.tsx` |
| **19** | `mcp-server/web/src/api/knowledge.ts` | 241 | 0 / 4 | — | — | `mcp-server/web/src/pages/CourseViewerPage.tsx` |
| **19** | `mcp-server/web/src/api/mechanical.ts` | 228 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useMechanical.ts` |
| **19** | `mcp-server/web/src/api/shopProfile.ts` | 232 | 0 / 3 | — | — | `mcp-server/web/src/__tests__/routeMachineWorkspaceAuthority.test.ts` |
| **19** | `mcp-server/web/src/components/CommandPalette.tsx` | 208 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/component-units.test.tsx` |
| **19** | `mcp-server/web/src/components/operating-system/WorkflowPrimitives.tsx` | 217 | 0 / 2 | — | — | `mcp-server/web/src/pages/JobsPage.tsx` |
| **19** | `mcp-server/web/src/components/ppg/GcodeDiff.tsx` | 203 | 0 / 1 | — | — | `mcp-server/web/src/pages/PpgPage.tsx` |
| **19** | `mcp-server/web/src/components/ppg/TemplateBrowser.tsx` | 223 | 0 / 1 | — | — | `mcp-server/web/src/pages/PpgPage.tsx` |
| **19** | `mcp-server/web/src/components/puoa/AppwInvoicesCopilot.tsx` | 238 | 0 / 1 | — | — | `mcp-server/web/src/pages/InvoicesPage.tsx` |
| **19** | `mcp-server/web/src/components/puoa/AppwMaterialPricingCopilot.tsx` | 236 | 0 / 1 | — | — | `mcp-server/web/src/pages/MaterialPricingPage.tsx` |
| **19** | `mcp-server/web/src/components/puoa/AppwOrderTrackingCopilot.tsx` | 241 | 0 / 1 | — | — | `mcp-server/web/src/pages/OrderTrackingPage.tsx` |
| **19** | `mcp-server/web/src/components/sfc/PresetManager.tsx` | 222 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **19** | `mcp-server/web/src/components/sfc/SmartMachineSelector.tsx` | 214 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **19** | `mcp-server/web/src/components/sfc/SmartToolSelector.tsx` | 207 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **19** | `mcp-server/web/src/components/viewer/HeatmapOverlay.tsx` | 243 | 0 / 1 | — | — | `mcp-server/web/src/components/viewer/ViewerCanvasWorkspace.tsx` |
| **19** | `mcp-server/web/src/components/viewer/Viewer3D.tsx` | 215 | 0 / 2 | — | — | `mcp-server/web/src/components/calculator/CalculatorSetupPreview3D.tsx` |
| **19** | `mcp-server/web/src/components/wedm-studio/AIReasoningTab.tsx` | 247 | 0 / 1 | — | — | `mcp-server/web/src/pages/WireEdmStudioPage.tsx` |
| **19** | `mcp-server/web/src/components/wedm-studio/BlackboardPanel.tsx` | 220 | 0 / 1 | — | — | `mcp-server/web/src/components/wedm-studio/AIReasoningTab.tsx` |
| **19** | `mcp-server/web/src/features/operating-system/shellSavedViewsState.ts` | 201 | 0 / 4 | — | — | `mcp-server/web/src/__tests__/Layout.test.tsx` |
| **19** | `mcp-server/web/src/features/operating-system/shopFloorFixtures.ts` | 216 | 0 / 1 | — | — | `mcp-server/web/src/features/operating-system/fixtureProvider.ts` |
| **19** | `mcp-server/web/src/hooks/useCourses.ts` | 210 | 0 / 5 | — | — | `mcp-server/web/src/__tests__/academy-storage-hardening.test.tsx` |
| **19** | `mcp-server/web/src/types/mechanical.ts` | 244 | 0 / 3 | — | — | `mcp-server/web/src/api/mechanical.ts` |
| **19** | `mcp-server/web/src/types/ppg.ts` | 213 | 0 / 8 | — | — | `mcp-server/web/src/components/ppg/ControllerSelector.tsx` |
| **19** | `mcp-server/web/src/utils/jmDieCalculatorPostWorkflowState.ts` | 219 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/jmDieCalculatorPostWorkflowState.test.ts` |
| **19** | `mcp-server/web/src/utils/jmDieCalculatorRouteAuthority.ts` | 224 | 0 / 4 | — | — | `mcp-server/web/src/__tests__/jmDieCalculatorPostWorkflowState.test.ts` |
| **18** | `mcp-server/web/src/api/learningProgression.ts` | 151 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useLearningCourseRegistry.ts` |
| **18** | `mcp-server/web/src/api/parts.ts` | 186 | 0 / 6 | — | — | `mcp-server/web/src/__tests__/PartsLibraryPage.test.tsx` |
| **18** | `mcp-server/web/src/api/safetyMonitor.ts` | 155 | 0 / 1 | — | — | `mcp-server/web/src/pages/SafetyMonitorPage.tsx` |
| **18** | `mcp-server/web/src/components/calculator/CalculatorSectionPurchaseModal.tsx` | 165 | 0 / 1 | — | — | `mcp-server/web/src/pages/CalculatorPage.tsx` |
| **18** | `mcp-server/web/src/components/calculator/WireEdmPassChart.tsx` | 155 | 0 / 1 | — | — | `mcp-server/web/src/pages/CalculatorPage.tsx` |
| **18** | `mcp-server/web/src/components/employee/EmployeeEditModal.tsx` | 183 | 0 / 1 | — | — | `mcp-server/web/src/pages/EmployeeDirectoryPage.tsx` |
| **18** | `mcp-server/web/src/components/FormulaCard.tsx` | 165 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/component-units.test.tsx` |
| **18** | `mcp-server/web/src/components/ppg/gcode-language.ts` | 155 | 0 / 2 | — | — | `mcp-server/web/src/components/ppg/GcodeDiff.tsx` |
| **18** | `mcp-server/web/src/components/ppg/GcodePreview.tsx` | 151 | 0 / 1 | — | — | `mcp-server/web/src/pages/PpgPage.tsx` |
| **18** | `mcp-server/web/src/components/ppg/OptimizeDownload.tsx` | 157 | 0 / 1 | — | — | `mcp-server/web/src/pages/PpgPage.tsx` |
| **18** | `mcp-server/web/src/components/ppg/ValidationPanel.tsx` | 167 | 0 / 1 | — | — | `mcp-server/web/src/pages/PpgPage.tsx` |
| **18** | `mcp-server/web/src/components/puoa/AppwCalculatorCopilot.tsx` | 194 | 0 / 1 | — | — | `mcp-server/web/src/pages/CalculatorPage.tsx` |
| **18** | `mcp-server/web/src/components/puoa/AppwVendorScorecardCopilot.tsx` | 178 | 0 / 1 | — | — | `mcp-server/web/src/pages/VendorScorecardPage.tsx` |
| **18** | `mcp-server/web/src/components/sfc/CalculationHistory.tsx` | 156 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **18** | `mcp-server/web/src/components/sfc/CompatibilityValidator.tsx` | 193 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **18** | `mcp-server/web/src/components/sfc/ParameterPanel.tsx` | 187 | 0 / 5 | — | — | `mcp-server/web/src/components/sfc/AdvancedCharts.tsx` |
| **18** | `mcp-server/web/src/components/sfc/ResultsDisplay.tsx` | 158 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **18** | `mcp-server/web/src/components/shared/NotificationCenter.tsx` | 180 | 0 / 1 | — | — | `mcp-server/web/src/pages/ShopDashboardPage.tsx` |
| **18** | `mcp-server/web/src/components/viewer/ViewerCanvasWorkspace.tsx` | 155 | 0 / 1 | — | — | `mcp-server/web/src/pages/ViewerPage.tsx` |
| **18** | `mcp-server/web/src/components/wedm-studio/ReasoningTraceDashboard.tsx` | 188 | 0 / 1 | — | — | `mcp-server/web/src/components/wedm-studio/AIReasoningTab.tsx` |
| **18** | `mcp-server/web/src/features/operating-system/inventoryOperationsFixtures.ts` | 195 | 0 / 3 | — | — | `mcp-server/web/src/__tests__/calculatorCatalogCoverage.test.ts` |
| **18** | `mcp-server/web/src/formulas.ts` | 187 | 0 / 2 | — | — | `mcp-server/web/src/components/FormulaCard.tsx` |
| **18** | `mcp-server/web/src/hooks/useLearning.ts` | 160 | 0 / 9 | — | — | `mcp-server/web/src/components/learning/Assessment.tsx` |
| **18** | `mcp-server/web/src/hooks/useOptimisticSync.ts` | 197 | 0 / 1 | — | — | `mcp-server/web/src/components/SyncStatusIndicator.tsx` |
| **18** | `mcp-server/web/src/hooks/useUnifiedOrchestrator.ts` | 158 | 0 / 2 | — | — | `mcp-server/web/src/components/calculator/CalculatorBackendAiReview.tsx` |
| **18** | `mcp-server/web/src/hooks/useWebSocket.ts` | 150 | 0 / 5 | — | — | `mcp-server/web/src/pages/DashboardPage.tsx` |
| **18** | `mcp-server/web/src/lib/OfflineQueueManager.ts` | 186 | 0 / 3 | — | — | `mcp-server/web/src/components/operator/OperatorFeedbackPanel.tsx` |
| **18** | `mcp-server/web/src/types/speedfeed.ts` | 165 | 0 / 2 | — | — | `mcp-server/web/src/hooks/useSpeedFeed.ts` |
| **18** | `mcp-server/web/src/utils/numericExpression.ts` | 157 | 0 / 3 | — | — | `mcp-server/web/src/__tests__/numericExpression.test.ts` |
| **18** | `mcp-server/web/src/utils/sfcReport.ts` | 159 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **18** | `mcp-server/web/src/workers/physicsPreview.worker.ts` | 178 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/physicsPreviewWorker.test.ts` |
| **17** | `mcp-server/src/shared/response-level.ts` | 115 | 0 / 1 | — | — | `mcp-server/src/shared/response-level.ts` |
| **17** | `mcp-server/web/src/api/cadRegressionDashboard.ts` | 128 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/CADRegressionDashboardPage.test.tsx` |
| **17** | `mcp-server/web/src/api/docLearn.ts` | 135 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useDocLearn.ts` |
| **17** | `mcp-server/web/src/api/erp.ts` | 116 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useErp.ts` |
| **17** | `mcp-server/web/src/api/sessionIntelligence.ts` | 112 | 0 / 1 | — | — | `mcp-server/web/src/components/puoa/WorkspaceAICopilot.tsx` |
| **17** | `mcp-server/web/src/api/traveler.ts` | 111 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/JobsPage.test.tsx` |
| **17** | `mcp-server/web/src/api/unifiedOrchestrator.ts` | 120 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useOrchestrator.ts` |
| **17** | `mcp-server/web/src/api/wedmErp.ts` | 127 | 0 / 9 | — | — | `mcp-server/web/src/__tests__/WedmCompletionModal.test.tsx` |
| **17** | `mcp-server/web/src/components/employee/OnboardingModal.tsx` | 111 | 0 / 1 | — | — | `mcp-server/web/src/pages/EmployeeDirectoryPage.tsx` |
| **17** | `mcp-server/web/src/components/employee/StatusChangeModal.tsx` | 127 | 0 / 1 | — | — | `mcp-server/web/src/pages/EmployeeDirectoryPage.tsx` |
| **17** | `mcp-server/web/src/components/optimization-report/SetupSheetPanel.tsx` | 102 | 0 / 1 | — | — | `mcp-server/web/src/components/optimization-report/index.ts` |
| **17** | `mcp-server/web/src/components/ppg/ControllerSelector.tsx` | 132 | 0 / 1 | — | — | `mcp-server/web/src/pages/PpgPage.tsx` |
| **17** | `mcp-server/web/src/components/ppg/GcodeEditor.tsx` | 131 | 0 / 1 | — | — | `mcp-server/web/src/pages/PpgPage.tsx` |
| **17** | `mcp-server/web/src/components/sfc/ComparisonView.tsx` | 143 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **17** | `mcp-server/web/src/components/sfc/OperationSelector.tsx` | 104 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **17** | `mcp-server/web/src/components/viewer/ToolAssembly.tsx` | 113 | 0 / 1 | — | — | `mcp-server/web/src/components/viewer/ViewerCanvasWorkspace.tsx` |
| **17** | `mcp-server/web/src/contexts/PpgContext.tsx` | 106 | 0 / 1 | — | — | `mcp-server/web/src/pages/PpgPage.tsx` |
| **17** | `mcp-server/web/src/features/operating-system/learningIntelligenceFixtures.ts` | 100 | 0 / 1 | — | — | `mcp-server/web/src/features/operating-system/fixtureProvider.ts` |
| **17** | `mcp-server/web/src/features/operating-system/providerSurfaceStatus.ts` | 136 | 0 / 3 | — | — | `mcp-server/web/src/components/operating-system/SurfaceStatusNotice.tsx` |
| **17** | `mcp-server/web/src/features/operating-system/shellSession.ts` | 144 | 0 / 9 | — | — | `mcp-server/web/src/__tests__/MessagesPage.test.tsx` |
| **17** | `mcp-server/web/src/hooks/useErp.ts` | 123 | 0 / 1 | — | — | `mcp-server/web/src/pages/ErpDashboard.tsx` |
| **17** | `mcp-server/web/src/hooks/useJobStatusSocket.ts` | 139 | 0 / 1 | — | — | `mcp-server/web/src/pages/ShopFloorClockPage.tsx` |
| **17** | `mcp-server/web/src/hooks/useLearningCourseRegistry.ts` | 105 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/useLearningCourseRegistry.test.tsx` |
| **17** | `mcp-server/web/src/hooks/useOrchestrator.ts` | 118 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/useOrchestrator.test.tsx` |
| **17** | `mcp-server/web/src/hooks/usePpg.ts` | 130 | 0 / 6 | — | — | `mcp-server/web/src/components/ppg/ControllerSelector.tsx` |
| **17** | `mcp-server/web/src/hooks/useUndoStack.ts` | 109 | 0 / 1 | — | — | `mcp-server/web/src/components/wedm-studio/WizardShell.tsx` |
| **17** | `mcp-server/web/src/testing/pageSurfaceManifest.ts` | 131 | 0 / 2 | — | — | `mcp-server/web/src/testing/machineCadSurfaceManifest.ts` |
| **17** | `mcp-server/web/src/types/pipeline.ts` | 119 | 0 / 2 | — | — | `mcp-server/web/src/api/pipeline.ts` |
| **17** | `mcp-server/web/src/types/sfc.ts` | 117 | 0 / 7 | — | — | `mcp-server/web/src/api/sfc.ts` |
| **17** | `mcp-server/web/src/types/viewer.ts` | 111 | 0 / 10 | — | — | `mcp-server/web/src/api/viewer.ts` |
| **17** | `mcp-server/web/src/utils/routeContext.ts` | 103 | 0 / 1 | — | — | `mcp-server/web/src/__tests__/routeContext.test.ts` |
| **16** | `mcp-server/web/src/api/auth.ts` | 61 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useAuth.ts` |
| **16** | `mcp-server/web/src/api/billing.ts` | 52 | 0 / 1 | — | — | `mcp-server/web/src/pages/PostProcessorStorePage.tsx` |
| **16** | `mcp-server/web/src/api/cost.ts` | 61 | 0 / 2 | — | — | `mcp-server/web/src/hooks/useCost.ts` |
| **16** | `mcp-server/web/src/api/orphanRoutes.ts` | 74 | 0 / 3 | — | — | `mcp-server/web/src/pages/IntegrationsPage.tsx` |
| **16** | `mcp-server/web/src/api/sfc.ts` | 56 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useSfc.ts` |
| **16** | `mcp-server/web/src/components/charts/RadarChart.tsx` | 83 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/chart-components.test.tsx` |
| **16** | `mcp-server/web/src/components/jobs/QrSticker.tsx` | 77 | 0 / 1 | — | — | `mcp-server/web/src/pages/JobsPage.tsx` |
| **16** | `mcp-server/web/src/components/learning/LessonStudio.tsx` | 88 | 0 / 1 | — | — | `mcp-server/web/src/components/learning/LessonView.tsx` |
| **16** | `mcp-server/web/src/components/operating-system/SurfaceStatusNotice.tsx` | 65 | 0 / 15 | — | — | `mcp-server/web/src/components/Layout.tsx` |
| **16** | `mcp-server/web/src/components/optimization-report/DownloadButtons.tsx` | 67 | 0 / 1 | — | — | `mcp-server/web/src/components/optimization-report/index.ts` |
| **16** | `mcp-server/web/src/components/optimization-report/SummaryCards.tsx` | 79 | 0 / 1 | — | — | `mcp-server/web/src/components/optimization-report/index.ts` |
| **16** | `mcp-server/web/src/components/optimization-report/ToolBreakdownTable.tsx` | 78 | 0 / 1 | — | — | `mcp-server/web/src/components/optimization-report/index.ts` |
| **16** | `mcp-server/web/src/components/ui/Modal.tsx` | 62 | 0 / 1 | — | — | `mcp-server/web/src/components/ui/index.ts` |
| **16** | `mcp-server/web/src/components/ui/Select.tsx` | 53 | 0 / 1 | — | — | `mcp-server/web/src/components/ui/index.ts` |
| **16** | `mcp-server/web/src/components/ui/Table.tsx` | 51 | 0 / 3 | — | — | `mcp-server/web/src/components/ui/index.ts` |
| **16** | `mcp-server/web/src/components/ui/ThemeToggle.tsx` | 81 | 0 / 1 | — | — | `mcp-server/web/src/components/ui/index.ts` |
| **16** | `mcp-server/web/src/components/ui/Toast.tsx` | 85 | 0 / 9 | — | — | `mcp-server/web/src/components/ppg/AIIntelligencePanel.tsx` |
| **16** | `mcp-server/web/src/components/viewer/StockMesh.tsx` | 86 | 0 / 1 | — | — | `mcp-server/web/src/components/viewer/ViewerCanvasWorkspace.tsx` |
| **16** | `mcp-server/web/src/features/operating-system/shellCommerceState.ts` | 89 | 0 / 4 | — | — | `mcp-server/web/src/components/shell/ShellCommerceControls.tsx` |
| **16** | `mcp-server/web/src/hooks/useAdmin.ts` | 75 | 0 / 1 | — | — | `mcp-server/web/src/pages/AdminPage.tsx` |
| **16** | `mcp-server/web/src/hooks/useCompliance.ts` | 74 | 0 / 1 | — | — | `mcp-server/web/src/pages/CompliancePage.tsx` |
| **16** | `mcp-server/web/src/hooks/useCoordination.ts` | 90 | 0 / 1 | — | — | `mcp-server/web/src/components/wedm-studio/AIReasoningTab.tsx` |
| **16** | `mcp-server/web/src/hooks/useDiagnosis.ts` | 52 | 0 / 1 | — | — | `mcp-server/web/src/pages/DiagnosisPage.tsx` |
| **16** | `mcp-server/web/src/hooks/useExport.ts` | 70 | 0 / 1 | — | — | `mcp-server/web/src/components/ExportButton.tsx` |
| **16** | `mcp-server/web/src/hooks/useMachineLive.ts` | 75 | 0 / 1 | — | — | `mcp-server/web/src/pages/MachineLivePage.tsx` |
| **16** | `mcp-server/web/src/hooks/useOfflineSync.ts` | 53 | 0 / 1 | — | — | `mcp-server/web/src/pages/ShopFloorClockPage.tsx` |
| **16** | `mcp-server/web/src/hooks/useSfc.ts` | 55 | 0 / 1 | — | — | `mcp-server/web/src/pages/SfcCalculatorPage.tsx` |
| **16** | `mcp-server/web/src/hooks/useTelemetry.ts` | 74 | 0 / 1 | — | — | `mcp-server/web/src/pages/TelemetryPage.tsx` |
| **16** | `mcp-server/web/src/types/cam.ts` | 60 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useCam.ts` |
| **16** | `mcp-server/web/src/types/cncOps.ts` | 54 | 0 / 3 | — | — | `mcp-server/web/src/api/cncOps.ts` |
| **16** | `mcp-server/web/src/types/cost.ts` | 79 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useCost.ts` |
| **16** | `mcp-server/web/src/types/data.ts` | 60 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useData.ts` |
| **16** | `mcp-server/web/src/types/docLearn.ts` | 98 | 0 / 2 | — | — | `mcp-server/web/src/api/docLearn.ts` |
| **16** | `mcp-server/web/src/types/edm.ts` | 89 | 0 / 3 | — | — | `mcp-server/web/src/api/edm.ts` |
| **16** | `mcp-server/web/src/types/forming.ts` | 75 | 0 / 3 | — | — | `mcp-server/web/src/api/forming.ts` |
| **16** | `mcp-server/web/src/types/grinding.ts` | 73 | 0 / 3 | — | — | `mcp-server/web/src/api/grinding.ts` |
| **16** | `mcp-server/web/src/types/integrations.ts` | 66 | 0 / 2 | — | — | `mcp-server/web/src/api/integrations.ts` |
| **16** | `mcp-server/web/src/types/quality.ts` | 79 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useQuality.ts` |
| **16** | `mcp-server/web/src/types/safety.ts` | 69 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useSafety.ts` |
| **16** | `mcp-server/web/src/types/thermal.ts` | 80 | 0 / 3 | — | — | `mcp-server/web/src/api/thermal.ts` |
| **16** | `mcp-server/web/src/types/turning.ts` | 99 | 0 / 3 | — | — | `mcp-server/web/src/api/turning.ts` |
| **16** | `mcp-server/web/src/types/vibration.ts` | 55 | 0 / 3 | — | — | `mcp-server/web/src/api/vibration.ts` |
| **16** | `mcp-server/web/src/types/welding.ts` | 78 | 0 / 3 | — | — | `mcp-server/web/src/api/welding.ts` |
| **16** | `mcp-server/web/src/utils/partsLibraryReleaseSeed.ts` | 77 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/partsLibraryReleaseSeed.test.ts` |
| **15** | `mcp-server/web/src/api/admin.ts` | 48 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useAdmin.ts` |
| **15** | `mcp-server/web/src/api/cam.ts` | 41 | 0 / 2 | — | — | `mcp-server/web/src/hooks/useCam.ts` |
| **15** | `mcp-server/web/src/api/cncOps.ts` | 29 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useCncOps.ts` |
| **15** | `mcp-server/web/src/api/compliance.ts` | 47 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useCompliance.ts` |
| **15** | `mcp-server/web/src/api/data.ts` | 47 | 0 / 5 | — | — | `mcp-server/web/src/components/sfc/SmartMachineSelector.tsx` |
| **15** | `mcp-server/web/src/api/diagnosis.ts` | 38 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useDiagnosis.ts` |
| **15** | `mcp-server/web/src/api/edm.ts` | 29 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useEdm.ts` |
| **15** | `mcp-server/web/src/api/forming.ts` | 28 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useForming.ts` |
| **15** | `mcp-server/web/src/api/grinding.ts` | 28 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useGrinding.ts` |
| **15** | `mcp-server/web/src/api/integrations.ts` | 30 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useIntegrations.ts` |
| **15** | `mcp-server/web/src/api/knowledgeExt.ts` | 29 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useKnowledgeExt.ts` |
| **15** | `mcp-server/web/src/api/machineLive.ts` | 49 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useMachineLive.ts` |
| **15** | `mcp-server/web/src/api/pipeline.ts` | 34 | 0 / 1 | — | — | `mcp-server/web/src/hooks/usePipeline.ts` |
| **15** | `mcp-server/web/src/api/quality.ts` | 49 | 0 / 2 | — | — | `mcp-server/web/src/hooks/useQuality.ts` |
| **15** | `mcp-server/web/src/api/safety.ts` | 42 | 0 / 2 | — | — | `mcp-server/web/src/hooks/useSafety.ts` |
| **15** | `mcp-server/web/src/api/settings.ts` | 13 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useSettings.ts` |
| **15** | `mcp-server/web/src/api/telemetry.ts` | 48 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useTelemetry.ts` |
| **15** | `mcp-server/web/src/api/thermal.ts` | 31 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useThermal.ts` |
| **15** | `mcp-server/web/src/api/turning.ts` | 29 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useTurning.ts` |
| **15** | `mcp-server/web/src/api/vibration.ts` | 29 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useVibration.ts` |
| **15** | `mcp-server/web/src/api/welding.ts` | 28 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useWelding.ts` |
| **15** | `mcp-server/web/src/components/charts/BarChart.tsx` | 36 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/chart-components.test.tsx` |
| **15** | `mcp-server/web/src/components/charts/ProgressRing.tsx` | 46 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/chart-components.test.tsx` |
| **15** | `mcp-server/web/src/components/charts/Sparkline.tsx` | 40 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/chart-components.test.tsx` |
| **15** | `mcp-server/web/src/components/optimization-report/index.ts` | 6 | 0 / 1 | — | — | `mcp-server/web/src/pages/OptimizationReportPage.tsx` |
| **15** | `mcp-server/web/src/components/optimization-report/RecommendationList.tsx` | 40 | 0 / 1 | — | — | `mcp-server/web/src/components/optimization-report/index.ts` |
| **15** | `mcp-server/web/src/components/SafetyBadge.tsx` | 29 | 0 / 6 | — | — | `mcp-server/web/src/__tests__/component-units.test.tsx` |
| **15** | `mcp-server/web/src/components/sfc/comparison-types.ts` | 49 | 0 / 5 | — | — | `mcp-server/web/src/components/sfc/CalculationHistory.tsx` |
| **15** | `mcp-server/web/src/components/shared/SafetyBadge.tsx` | 46 | 0 / 1 | — | — | `mcp-server/web/src/pages/ShopDashboardPage.tsx` |
| **15** | `mcp-server/web/src/components/ui/Badge.tsx` | 23 | 0 / 1 | — | — | `mcp-server/web/src/components/ui/index.ts` |
| **15** | `mcp-server/web/src/components/ui/Button.tsx` | 38 | 0 / 1 | — | — | `mcp-server/web/src/components/ui/index.ts` |
| **15** | `mcp-server/web/src/components/ui/Card.tsx` | 19 | 0 / 1 | — | — | `mcp-server/web/src/components/ui/index.ts` |
| **15** | `mcp-server/web/src/components/ui/Input.tsx` | 49 | 0 / 1 | — | — | `mcp-server/web/src/components/ui/index.ts` |
| **15** | `mcp-server/web/src/components/ui/Spinner.tsx` | 23 | 0 / 8 | — | — | `mcp-server/web/src/components/ppg/ControllerSelector.tsx` |
| **15** | `mcp-server/web/src/features/operating-system/employeeShellRoutes.ts` | 46 | 0 / 5 | — | — | `mcp-server/web/src/components/employee/EmployeeShellLayout.tsx` |
| **15** | `mcp-server/web/src/hooks/useCncOps.ts` | 44 | 0 / 1 | — | — | `mcp-server/web/src/pages/CncOpsPage.tsx` |
| **15** | `mcp-server/web/src/hooks/useEdm.ts` | 44 | 0 / 1 | — | — | `mcp-server/web/src/pages/EdmPage.tsx` |
| **15** | `mcp-server/web/src/hooks/useForming.ts` | 43 | 0 / 1 | — | — | `mcp-server/web/src/pages/FormingPage.tsx` |
| **15** | `mcp-server/web/src/hooks/useGrinding.ts` | 43 | 0 / 1 | — | — | `mcp-server/web/src/pages/GrindingPage.tsx` |
| **15** | `mcp-server/web/src/hooks/useKnowledgeExt.ts` | 44 | 0 / 1 | — | — | `mcp-server/web/src/pages/KnowledgeExtPage.tsx` |
| **15** | `mcp-server/web/src/hooks/useSpeedFeed.ts` | 48 | 0 / 1 | — | — | `mcp-server/web/src/pages/SpeedFeedPage.tsx` |
| **15** | `mcp-server/web/src/hooks/useThermal.ts` | 46 | 0 / 1 | — | — | `mcp-server/web/src/pages/ThermalPage.tsx` |
| **15** | `mcp-server/web/src/hooks/useTurning.ts` | 44 | 0 / 1 | — | — | `mcp-server/web/src/pages/TurningPage.tsx` |
| **15** | `mcp-server/web/src/hooks/useVibration.ts` | 44 | 0 / 1 | — | — | `mcp-server/web/src/pages/VibrationPage.tsx` |
| **15** | `mcp-server/web/src/hooks/useWelding.ts` | 43 | 0 / 1 | — | — | `mcp-server/web/src/pages/WeldingPage.tsx` |
| **15** | `mcp-server/web/src/types/admin.ts` | 36 | 0 / 2 | — | — | `mcp-server/web/src/api/admin.ts` |
| **15** | `mcp-server/web/src/types/auth.ts` | 35 | 0 / 1 | — | — | `mcp-server/web/src/hooks/useAuth.ts` |
| **15** | `mcp-server/web/src/types/compliance.ts` | 26 | 0 / 2 | — | — | `mcp-server/web/src/api/compliance.ts` |
| **15** | `mcp-server/web/src/types/diagnosis.ts` | 35 | 0 / 2 | — | — | `mcp-server/web/src/api/diagnosis.ts` |
| **15** | `mcp-server/web/src/types/knowledgeExt.ts` | 46 | 0 / 2 | — | — | `mcp-server/web/src/api/knowledgeExt.ts` |
| **15** | `mcp-server/web/src/types/machineLive.ts` | 39 | 0 / 2 | — | — | `mcp-server/web/src/api/machineLive.ts` |
| **15** | `mcp-server/web/src/types/telemetry.ts` | 27 | 0 / 2 | — | — | `mcp-server/web/src/api/telemetry.ts` |
| **15** | `mcp-server/web/src/utils/dashboardHotReleaseSeed.ts` | 37 | 0 / 2 | — | — | `mcp-server/web/src/__tests__/dashboardHotReleaseSeed.test.ts` |
| **15** | `mcp-server/web/src/utils/programReleasePartClassInference.ts` | 26 | 0 / 3 | — | — | `mcp-server/web/src/pages/JobsPage.tsx` |
| **5** | `mcp-server/web/src/components/ErrorState.tsx` | 3 | 0 / 9 | — | — | `mcp-server/web/src/components/Layout.tsx` |

## ORPHAN — no inbound import detected (candidates for deletion) (91)

| Score | File | LOC | Inbound tracked / untracked | Entry-point | Deleted by | Sample importer |
|---:|---|---:|---|---|---|---|
| **15** | `mcp-server/src/architecture/MULTI_AGENT_BLUEPRINT.ts` | 1199 | 0 / 0 | — | — | `—` |
| **15** | `mcp-server/src/mcp/elicitation.ts` | 1037 | 0 / 0 | — | — | `—` |
| **15** | `mcp-server/web/src/api/shopTypes.ts` | 858 | 0 / 0 | — | — | `—` |
| **14** | `mcp-server/src/mcp/outputSchemas.ts` | 707 | 0 / 0 | — | — | `—` |
| **11** | `mcp-server/src/mcp/toolAnnotationsComplete.ts` | 550 | 0 / 0 | — | — | `—` |
| **10** | `mcp-server/web/src/pages/LatheStudioPage.tsx` | 521 | 0 / 0 | — | — | `—` |
| **9** | `mcp-server/src/knowledge/knowledge-spine.test.ts` | 495 | 0 / 0 | — | — | `—` |
| **9** | `mcp-server/src/knowledge/KnowledgeConflictResolverEngine.ts` | 455 | 0 / 0 | — | — | `—` |
| **9** | `mcp-server/src/knowledge/KnowledgeConsumerRegistryEngine.ts` | 462 | 0 / 0 | — | — | `—` |
| **9** | `mcp-server/src/knowledge/KnowledgePromotionEngine.ts` | 467 | 0 / 0 | — | — | `—` |
| **9** | `mcp-server/web/src/api/shop.ts` | 466 | 0 / 0 | — | — | `—` |
| **9** | `mcp-server/web/src/pages/PrintDropPage.tsx` | 461 | 0 / 0 | — | — | `—` |
| **8** | `mcp-server/src/knowledge/KnowledgeApplicabilityEngine.ts` | 410 | 0 / 0 | — | — | `—` |
| **8** | `mcp-server/src/knowledge/KnowledgeFeedbackIngestEngine.ts` | 447 | 0 / 0 | — | — | `—` |
| **8** | `mcp-server/src/schemas.ts` | 415 | 0 / 0 | — | — | `—` |
| **8** | `mcp-server/src/utils/forgeQuintTransaction.ts` | 435 | 0 / 0 | — | — | `—` |
| **8** | `mcp-server/web/src/components/wedm-studio/FeedbackPanel.tsx` | 425 | 0 / 0 | — | — | `—` |
| **8** | `mcp-server/web/src/components/wedm/WedmCompletionModal.tsx` | 449 | 0 / 0 | — | — | `—` |
| **8** | `mcp-server/web/src/pages/MachineDataAuditPage.tsx` | 432 | 0 / 0 | — | — | `—` |
| **7** | `mcp-server/src/mcp/elicitationIntegration.ts` | 392 | 0 / 0 | — | — | `—` |
| **7** | `mcp-server/web/src/components/wedm-studio/AutonomyPanel.tsx` | 365 | 0 / 0 | — | — | `—` |
| **7** | `mcp-server/web/src/utils/performance.ts` | 350 | 0 / 0 | — | — | `—` |
| **6** | `mcp-server/src/mcp/agentConfig.ts` | 348 | 0 / 0 | — | — | `—` |
| **6** | `mcp-server/src/mcp/prompts.ts` | 303 | 0 / 0 | — | — | `—` |
| **6** | `mcp-server/web/src/components/jobs/ActiveJobsDashboard.tsx` | 334 | 0 / 0 | — | — | `—` |
| **5** | `mcp-server/src/mcp/authMiddleware.ts` | 281 | 0 / 0 | — | — | `—` |
| **5** | `mcp-server/src/mcp/completions.ts` | 264 | 0 / 0 | — | — | `—` |
| **5** | `mcp-server/src/mcp/resources.ts` | 282 | 0 / 0 | — | — | `—` |
| **5** | `mcp-server/src/validation/actionParamValidator.ts` | 255 | 0 / 0 | — | — | `—` |
| **5** | `mcp-server/web/src/components/EnhancedErrorBoundary.tsx` | 266 | 0 / 0 | — | — | `—` |
| **5** | `mcp-server/web/src/components/SyncStatusIndicator.tsx` | 280 | 0 / 0 | — | — | `—` |
| **5** | `mcp-server/web/src/components/wedm/WedmJobCard.tsx` | 279 | 0 / 0 | — | — | `—` |
| **5** | `mcp-server/web/src/styles/design-system.ts` | 288 | 0 / 0 | — | — | `—` |
| **5** | `mcp-server/web/src/utils/geometryValidator.ts` | 262 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/src/mcp/routeGuards.ts` | 217 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/src/mcp/taskTools.ts` | 248 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/src/prompts/agentSystemPrompt.ts` | 244 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/src/shared/progressive-response.ts` | 217 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/web/src/components/AmbiguityResolver.tsx` | 234 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/web/src/components/jobs/ShiftClockWidget.tsx` | 221 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/web/src/components/ppg/OperationBuilder.tsx` | 246 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/web/src/components/SpeedFeedPanel.tsx` | 222 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/web/src/components/wedm/WedmQuoteSection.tsx` | 216 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/web/src/lib/resilientFetch.ts` | 233 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/web/src/utils/a11y.ts` | 228 | 0 / 0 | — | — | `—` |
| **4** | `mcp-server/web/src/utils/quotePdf.ts` | 214 | 0 / 0 | — | — | `—` |
| **3** | `mcp-server/src/cache/RedisCacheProvider.ts` | 191 | 0 / 0 | — | — | `—` |
| **3** | `mcp-server/src/mcp/registerToolWithOutput.ts` | 197 | 0 / 0 | — | — | `—` |
| **3** | `mcp-server/src/utils/atomicLockedWrite.ts` | 198 | 0 / 0 | — | — | `—` |
| **3** | `mcp-server/web/src/components/jobs/JobSelector.tsx` | 158 | 0 / 0 | — | — | `—` |
| **3** | `mcp-server/web/src/components/sfc/MaterialSelector.tsx` | 156 | 0 / 0 | — | — | `—` |
| **3** | `mcp-server/web/src/contexts/ErpContext.tsx` | 159 | 0 / 0 | — | — | `—` |
| **3** | `mcp-server/web/src/hooks/usePhysicsPreview.ts` | 196 | 0 / 0 | — | — | `—` |
| **3** | `mcp-server/web/src/hooks/useSSE.ts` | 152 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/src/mcp/healthProbes.ts` | 118 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/src/mcp/mcpLogging.ts` | 114 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/src/mcp/progressTracker.ts` | 123 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/src/mcp/resourceLinks.ts` | 144 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/components/ExportButton.tsx` | 121 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/components/results/ResultsPageLayout.tsx` | 104 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/components/shared/CommandPalette.tsx` | 120 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/components/shared/ExportButton.tsx` | 104 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/components/shared/FormulaCard.tsx` | 139 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/features/machine-workspace/MachineWorkspaceShell.tsx` | 129 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/hooks/useDocLearn.ts` | 122 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/hooks/useKeyboardShortcuts.ts` | 104 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/hooks/useNetworkStatus.ts` | 126 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/pages/SwissPage.tsx` | 107 | 0 / 0 | — | — | `—` |
| **2** | `mcp-server/web/src/testing/machineCadSurfaceManifest.ts` | 101 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/src/engines/ConsensusModelPerformanceEngine.ts` | 50 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/src/knowledge/index.ts` | 63 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/components/Breadcrumbs.tsx` | 51 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/hooks/useAuth.ts` | 51 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/hooks/useCam.ts` | 52 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/hooks/useCost.ts` | 72 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/hooks/useData.ts` | 76 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/hooks/useFavorites.ts` | 65 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/hooks/usePipeline.ts` | 57 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/hooks/useQuality.ts` | 52 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/hooks/useSafety.ts` | 52 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/pages/MillTurnPage.tsx` | 90 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/testing/pageInteractionManifest.ts` | 59 | 0 / 0 | — | — | `—` |
| **1** | `mcp-server/web/src/utils/erpCrossLinks.ts` | 52 | 0 / 0 | — | — | `—` |
| **0** | `mcp-server/src/engines/PRISMContextInjectorEngine.ts` | 39 | 0 / 0 | — | — | `—` |
| **0** | `mcp-server/src/shared/index.ts` | 23 | 0 / 0 | — | — | `—` |
| **0** | `mcp-server/web/src/components/charts/index.ts` | 5 | 0 / 0 | — | — | `—` |
| **0** | `mcp-server/web/src/components/operator/index.ts` | 8 | 0 / 0 | — | — | `—` |
| **0** | `mcp-server/web/src/components/shared/Breadcrumbs.tsx` | 37 | 0 / 0 | — | — | `—` |
| **0** | `mcp-server/web/src/components/shared/LoadingState.tsx` | 31 | 0 / 0 | — | — | `—` |
| **0** | `mcp-server/web/src/hooks/useIntegrations.ts` | 45 | 0 / 0 | — | — | `—` |
| **0** | `mcp-server/web/src/hooks/useSettings.ts` | 25 | 0 / 0 | — | — | `—` |

## Recommendations

- **KEEP (274)** — restore in one commit `[CALC-RESTORE-MS0]/U-CALC-RESTORE-01`. The system is broken-by-git-but-running-from-disk without these.
- **TEST (154)** — restore alongside KEEP. Vitest auto-discovers them; without git tracking they are at risk of stomp.
- **AMBIGUOUS (268)** — restore in the same commit. These are transitive dependencies of KEEP files; restoring KEEP without AMBIGUOUS leaves broken imports.
- **ORPHAN (91)** — review per-file. Sort by valueScore: items >= 30 likely have hidden references (HTML, registry, CLI entrypoints); items < 15 are strong dead-code candidates.

Sister surface: `state/shared/system-viz/untracked-files.json` is consumed by the /system-viz graph regenerator to surface untracked files as a distinct node class.

