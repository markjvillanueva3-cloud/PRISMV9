/**
 * prism_business — Business Operations Dispatcher
 *
 * 169 actions across 29 engines:
 *   Financial (4): financial_npv, financial_irr, financial_breakeven,
 *                  financial_machine_investment
 *   Inventory (4): inventory_eoq, inventory_safety_stock,
 *                  inventory_abc, inventory_tool_optimize
 *   Job Lifecycle (4): job_create, job_update_status,
 *                      job_summary, job_dashboard
 *   Purchasing (4): purchasing_search, purchasing_recommend,
 *                   purchasing_manufacturers, purchasing_summary
 *   Costing (3): costing_job_cost, costing_material, costing_machining
 *   Quoting (2): quoting_generate, quoting_price_breaks
 *   Scheduling (4): scheduling_single_machine, scheduling_johnsons,
 *                   scheduling_job_shop, scheduling_cpm
 *   Reporting (6): reporting_dashboard, reporting_pareto, reporting_production,
 *                  reporting_quality, reporting_financial, reporting_trend
 *   Order Manager (8): order_create..order_metrics
 *   Employee (5): employee_create, employee_search, employee_add_skill,
 *                 employee_utilization, employee_dept_summary
 *   TimeClock (7): clock_in, clock_out, job_time_start, job_time_stop,
 *                  timecard_summary, attendance_report, who_clocked_in
 *   Payroll (3): payroll_create_period, payroll_run, payroll_pay_stub
 *   Invoicing (5): invoice_create, invoice_from_job, invoice_payment,
 *                  invoice_list, invoice_aging
 *   Tool Usage (6): tool_inventory_add, tool_start_usage, tool_end_usage,
 *                   tool_regrind, tool_job_cost, tool_reorder_alerts
 *   Actual Cost (3): actual_cost_calculate, actual_cost_variance,
 *                    actual_cost_profitability
 *   Quote Estimator (4): quote_estimate, quote_compare_materials,
 *                        quote_what_if, quote_price_breaks_advanced
 *   Instant Quote (3): instant_quote, instant_quote_qty_breaks, instant_quote_lead_time
 *   Quote Revisions (6): quote_revise, quote_get_history, quote_compare_revisions,
 *                         quote_status_change, quote_generate_share_token, quote_get_by_token
 *   Secondary Ops (5): sec_ops_list, sec_ops_quote, sec_ops_batch_quote,
 *                      sec_ops_find_vendors, sec_ops_recommend
 *   Quote Analytics (6): analytics_record, analytics_update_outcome,
 *                        analytics_record_actuals, analytics_accuracy,
 *                        analytics_conversion, analytics_calibration
 *   HR Compliance (16): hr_benefits_list..hr_dashboard
 *   Customer Mgmt (14): customer_create..customer_top
 *   Integration (6): integration_export_qb..integration_formats
 *
 * U-CONSOL1/U-CONSOL2 Canonical Engine Map:
 *   { quoting     → QuoteEstimatorEngine }    (was: QuotingEngine)
 *   { costing     → JobCostingEngine }         (was: CostEstimationEngine, CostEstimatorEngine)
 *   { scheduling  → ShopSchedulerEngine }      (was: JobShopSchedulingEngine)
 *   { cost_model  → PipelineCostModelEngine }  (aggregation layer, camDispatcher)
 *
 * @milestone AUDIT-FT-BIZ
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_BUSINESS_SCHEMAS } from "../../schemas/businessActionSchemas.js";

// Lazy engine cache
// _customerPortfolioMiner holder removed (hotel 2026-06-01) — its only consumer was the dead duplicate
// customer_portfolio_mine case; the real handler uses a local import (see ~L3513).
let _customerKnowledge: any;
let _shopFloorQuote: any;
let _erpWorkOrder: any;
let _multiPathReasoning: any;
let _streamVsBatch: any;
let _docustrataIndex: any;
let _costEfficiencyBridge: any;
let _xometryQuoteInputs: any;
let _quoteScenarioGenerator: any;
let _financial: any;
let _inventory: any;
let _jobLifecycle: any;
let _purchasing: any;
let _jobCosting: any;
let _quoting: any;
let _scheduling: any;
let _reporting: any;
let _orderManager: any;
let _employee: any;
let _timeClock: any;
let _commissionReport: any; // HOTEL: commission_report — per-salesperson margin-tiered sales commission (quote-to-ship sales-comp leg)
let _dailyFlash: any; // HOTEL: daily_flash_generate/_email — end-of-day owner flash report (quote-to-ship ops artifact)
let _payroll: any;
let _invoicing: any;
let _toolUsage: any;
let _actualCost: any;
let _quoteEstimator: any;
let _secondaryOps: any;
let _quoteAnalytics: any;
let _purchaseOrder: any;
let _generalLedger: any;
let _capacityPlanning: any;
let _qualityMgmt: any;
let _machineRateDb: any;
let _blueprintQuoteBridge: any;
let _sheetMetalQuote: any;
let _additiveQuote: any;
let _hrCompliance: any;
let _customerMgmt: any;
let _jmCustomerVendorDb: any; // ROMEO WIRING/U-WIRE-JMDB -- read-only analytics query layer over the JM customer/vendor JSONL corpus
let _equipmentAsset: any;
let _preventiveMaintenance: any;
let _integrationAdapter: any;
let _injectionMoldQuote: any;
let _programmerProductivity: any;
let _stockSizeOptimizer: any;
let _marketMaterialPricing: any;
let _batchOptimization: any;
let _learningPath: any;
let _castingQuote: any;
let _weldFabQuote: any;
let _milestoneTracking: any;
let _customerPortal: any;
let _jobProfitabilityWaterfall: any;
let _quoteEngine: any;
let _multiProcessQuote: any;
let _shiftScheduleOptimizer: any;
let _advancedReportRenderer: any;
let _whiteLabelConfig: any;
let _saasAPI: any;
let _approvalWorkflow: any;
let _recordTimeline: any;
let _toolInventoryOrchestrator: any;
let _latheAutoQuoteFromPrint: any;
let _billing: any;
let _stripeBilling: any;
// U-BRIDGE-WIRE-BUSINESS — 3 previously-unwired Business engines
let _eco: any;
let _qdrantCapacity: any;
let _erpToolInv: any;
let _quoteToOrderBridge: any;
let _workOrderScheduleBridge: any;
let _latheReconciliation: any;
let _latheScheduler: any;
let _latheOrderLifecycle: any;
let _lathePOAutomation: any;
let _latheInventory: any;
let _latheProfitability: any;
let _latheERPOrchestrator: any;
let _latheAGIBridge: any;
let _latheAGILearning: any;
let _latheAGIKnowledge: any;
let _latheAGISafety: any;
// ── HOTEL self-merge: QB-parity + networking marketplace (30 engines, 2026-05-31) ──
let _salesUseTax: any;
let _fixedAssetDep: any;
let _form1099nec: any;
let _estimate: any;
let _salesOrder: any;
let _creditMemo: any;
let _receivePayment: any;
let _customerStatement: any;
let _financeChargeDunning: any;
let _vendorCredit: any;
let _billPayment: any;
let _bankReconciliation: any;
let _bankFeedImport: any;
let _bankDepositTransfer: any;
let _chartOfAccounts: any;
let _journalEntry: any;
let _financialReportSuite: any;
let _budget: any;
let _listManagement: any;
let _itemMaster: any;
let _inventoryAdjustment: any;
let _payrollLiabilityFiling: any;
let _supplierCapability: any;
let _rfqMatchScoring: any;
let _quoteExplainPDF: any;
let _buyerAccount: any;
let _rfqBroadcast: any;
let _bidCollectionRanking: any;
let _marketplaceLedger: any;
let _supplierOnboarding: any;
let _vendorCatalog: any; // HOTEL: ingest charlie's VENDOR-NETWORK-MS0 vendor-source corpus (2026-05-31)
let _supplierReputation: any; // HOTEL: NETPLAT Phase-2 closed-loop reputation from RFQ outcome corpus
let _geoLogistics: any; // HOTEL: NETPLAT Phase-2 total-landed-cost (freight+customs) for RFQ ranking
let _scheduleCapacity: any; // HOTEL: NETPLAT Phase-2 capacity-aware matching (projected supplier load)
let _marketplaceFinalRank: any; // HOTEL: NETPLAT capstone — blend match+reputation+logistics+capacity
let _marketplaceMatchOrch: any; // HOTEL: NETPLAT orchestrator — end-to-end RFQ rank (capability match + 3 Phase-2 signals → capstone blend)
let _marketplaceSeeding: any; // HOTEL: NETPLAT seeding — directory-lead funnel (vendor hints → leads → onboarding bridge)

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "commissionReport":
      return _commissionReport ??= (await import("../../engines/CommissionReportEngine.js")).commissionReportEngine;
    case "dailyFlash":
      return _dailyFlash ??= (await import("../../engines/DailyFlashReportEngine.js")).dailyFlashReportEngine;
    // ── HOTEL self-merge engines (QB-parity + networking marketplace, 2026-05-31) ──
    case "salesUseTax":
      return _salesUseTax ??= (await import("../../engines/SalesUseTaxEngine.js")).salesUseTaxEngine;
    case "fixedAssetDep":
      return _fixedAssetDep ??= (await import("../../engines/FixedAssetDepreciationEngine.js")).fixedAssetDepreciationEngine;
    case "form1099nec":
      return _form1099nec ??= (await import("../../engines/Form1099NECEngine.js")).form1099NECEngine;
    case "estimate":
      return _estimate ??= (await import("../../engines/EstimateEngine.js")).estimateEngine;
    case "salesOrder":
      return _salesOrder ??= (await import("../../engines/SalesOrderEngine.js")).salesOrderEngine;
    case "creditMemo":
      return _creditMemo ??= (await import("../../engines/CreditMemoEngine.js")).creditMemoEngine;
    case "receivePayment":
      return _receivePayment ??= (await import("../../engines/ReceivePaymentEngine.js")).receivePaymentEngine;
    case "customerStatement":
      return _customerStatement ??= (await import("../../engines/CustomerStatementEngine.js")).customerStatementEngine;
    case "financeChargeDunning":
      return _financeChargeDunning ??= (await import("../../engines/FinanceChargeDunningEngine.js")).financeChargeDunningEngine;
    case "vendorCredit":
      return _vendorCredit ??= (await import("../../engines/VendorCreditEngine.js")).vendorCreditEngine;
    case "billPayment":
      return _billPayment ??= (await import("../../engines/BillPaymentCheckRunEngine.js")).billPaymentCheckRunEngine;
    case "bankReconciliation":
      return _bankReconciliation ??= (await import("../../engines/BankReconciliationEngine.js")).bankReconciliationEngine;
    case "bankFeedImport":
      return _bankFeedImport ??= (await import("../../engines/BankFeedImportEngine.js")).bankFeedImportEngine;
    case "bankDepositTransfer":
      return _bankDepositTransfer ??= (await import("../../engines/BankDepositTransferEngine.js")).bankDepositTransferEngine;
    case "chartOfAccounts":
      return _chartOfAccounts ??= (await import("../../engines/ChartOfAccountsEngine.js")).chartOfAccountsEngine;
    case "journalEntry":
      return _journalEntry ??= (await import("../../engines/JournalEntryEngine.js")).journalEntryEngine;
    case "financialReportSuite":
      return _financialReportSuite ??= (await import("../../engines/FinancialReportSuiteEngine.js")).financialReportSuiteEngine;
    case "budget":
      return _budget ??= (await import("../../engines/BudgetEngine.js")).budgetEngine;
    case "listManagement":
      return _listManagement ??= (await import("../../engines/ListManagementEngine.js")).listManagementEngine;
    case "itemMaster":
      return _itemMaster ??= (await import("../../engines/ItemMasterEngine.js")).itemMasterEngine;
    case "inventoryAdjustment":
      return _inventoryAdjustment ??= (await import("../../engines/InventoryAdjustmentEngine.js")).inventoryAdjustmentEngine;
    case "payrollLiabilityFiling":
      return _payrollLiabilityFiling ??= (await import("../../engines/PayrollLiabilityFilingEngine.js")).payrollLiabilityFilingEngine;
    case "supplierCapability":
      return _supplierCapability ??= (await import("../../engines/SupplierCapabilityProfileEngine.js")).supplierCapabilityProfileEngine;
    case "rfqMatchScoring":
      return _rfqMatchScoring ??= (await import("../../engines/RFQMatchScoringEngine.js")).rfqMatchScoringEngine;
    case "quoteExplainPDF":
      return _quoteExplainPDF ??= (await import("../../engines/QuoteExplainPDFEngine.js")).quoteExplainPDFEngine;
    case "buyerAccount":
      return _buyerAccount ??= (await import("../../engines/BuyerAccountEngine.js")).buyerAccountEngine;
    case "rfqBroadcast":
      return _rfqBroadcast ??= (await import("../../engines/RFQBroadcastEngine.js")).rfqBroadcastEngine;
    case "bidCollectionRanking":
      return _bidCollectionRanking ??= (await import("../../engines/BidCollectionRankingEngine.js")).bidCollectionRankingEngine;
    case "marketplaceLedger":
      return _marketplaceLedger ??= (await import("../../engines/MarketplaceLedgerEngine.js")).marketplaceLedgerEngine;
    case "supplierOnboarding":
      return _supplierOnboarding ??= (await import("../../engines/SupplierOnboardingEngine.js")).supplierOnboardingEngine;
    case "vendorCatalog":
      return _vendorCatalog ??= (await import("../../engines/VendorCatalogImportEngine.js")).vendorCatalogImportEngine;
    case "supplierReputation":
      return _supplierReputation ??= (await import("../../engines/SupplierReputationEngine.js")).supplierReputationEngine;
    case "geoLogistics":
      return _geoLogistics ??= (await import("../../engines/GeoLogisticsRoutingEngine.js")).geoLogisticsRoutingEngine;
    case "scheduleCapacity":
      return _scheduleCapacity ??= (await import("../../engines/ScheduleProjectedCapacityEngine.js")).scheduleProjectedCapacityEngine;
    case "marketplaceFinalRank":
      return _marketplaceFinalRank ??= (await import("../../engines/MarketplaceFinalRankEngine.js")).marketplaceFinalRankEngine;
    case "marketplaceMatchOrch":
      return _marketplaceMatchOrch ??= (await import("../../engines/MarketplaceMatchOrchestratorEngine.js")).marketplaceMatchOrchestratorEngine;
    case "marketplaceSeeding":
      return _marketplaceSeeding ??= (await import("../../engines/MarketplaceSeedingEngine.js")).marketplaceSeedingEngine;
    case "financial":
      return _financial ??= (
        await import("../../engines/FinancialAnalysisEngine.js")
      ).financialAnalysisEngine;
    case "inventory":
      return _inventory ??= (
        await import("../../engines/InventoryOptimizationEngine.js")
      ).inventoryOptimizationEngine;
    case "jobLifecycle":
      return _jobLifecycle ??= (
        await import("../../engines/JobLifecycleEngine.js")
      ).jobLifecycleEngine;
    case "purchasing":
      return _purchasing ??= (
        await import("../../engines/PurchasingDirectoryEngine.js")
      ).purchasingDirectoryEngine;
    case "jobCosting":
      return _jobCosting ??= (
        await import("../../engines/JobCostingEngine.js")
      ).jobCostingEngine;
    case "quoting":
      // U-CONSOL1: QuotingEngine deprecated — canonical engine is QuoteEstimatorEngine
      return _quoting ??= (
        await import("../../engines/QuoteEstimatorEngine.js")
      ).quoteEstimatorEngine;
    case "scheduling":
      // U-CONSOL2: JobShopSchedulingEngine deprecated — canonical engine is ShopSchedulerEngine
      return _scheduling ??= (
        await import("../../engines/ShopSchedulerEngine.js")
      ).shopSchedulerEngine;
    case "reporting":
      return _reporting ??= (
        await import("../../engines/ReportingEngine.js")
      ).reportingEngine;
    case "orderManager":
      return _orderManager ??= (
        await import("../../engines/OrderManagerEngine.js")
      ).orderManagerEngine;
    case "employee":
      return _employee ??= (
        await import("../../engines/EmployeeEngine.js")
      ).employeeEngine;
    case "timeClock":
      return _timeClock ??= (
        await import("../../engines/TimeClockEngine.js")
      ).timeClockEngine;
    case "payroll":
      return _payroll ??= (
        await import("../../engines/PayrollEngine.js")
      ).payrollEngine;
    case "invoicing":
      return _invoicing ??= (
        await import("../../engines/InvoicingEngine.js")
      ).invoicingEngine;
    case "toolUsage":
      return _toolUsage ??= (
        await import("../../engines/ToolUsageEngine.js")
      ).toolUsageEngine;
    case "actualCost":
      return _actualCost ??= (
        await import("../../engines/ActualCostEngine.js")
      ).actualCostEngine;
    case "quoteEstimator":
      return _quoteEstimator ??= (
        await import("../../engines/QuoteEstimatorEngine.js")
      ).quoteEstimatorEngine;
    case "secondaryOps":
      return _secondaryOps ??= (
        await import("../../engines/SecondaryOpsEngine.js")
      ).secondaryOpsEngine;
    case "quoteAnalytics":
      return _quoteAnalytics ??= (
        await import("../../engines/QuoteAnalyticsEngine.js")
      ).quoteAnalyticsEngine;
    case "purchaseOrder":
      return _purchaseOrder ??= (
        await import("../../engines/PurchaseOrderEngine.js")
      ).purchaseOrderEngine;
    case "generalLedger":
      return _generalLedger ??= (
        await import("../../engines/GeneralLedgerEngine.js")
      ).generalLedgerEngine;
    case "capacityPlanning":
      return _capacityPlanning ??= (
        await import("../../engines/CapacityPlanningEngine.js")
      ).capacityPlanningEngine;
    case "qualityMgmt":
      return _qualityMgmt ??= (
        await import("../../engines/QualityManagementEngine.js")
      ).qualityManagementEngine;
    case "machineRateDb":
      return _machineRateDb ??= (
        await import("../../engines/MachineRateDatabaseEngine.js")
      ).machineRateDatabaseEngine;
    case "blueprintQuoteBridge":
      return _blueprintQuoteBridge ??= (
        await import("../../engines/BlueprintToQuoteBridgeEngine.js")
      ).blueprintToQuoteBridgeEngine;
    case "sheetMetalQuote":
      return _sheetMetalQuote ??= (
        await import("../../engines/SheetMetalQuoteEngine.js")
      ).sheetMetalQuoteEngine;
    case "additiveQuote":
      return _additiveQuote ??= (
        await import("../../engines/AdditiveQuoteEngine.js")
      ).additiveQuoteEngine;
    case "hrCompliance":
      return _hrCompliance ??= (
        await import("../../engines/HRComplianceEngine.js")
      ).hrComplianceEngine;
    case "customerMgmt":
      return _customerMgmt ??= (
        await import("../../engines/CustomerManagementEngine.js")
      ).customerManagementEngine;
    case "jmCustomerVendorDb":
      // ROMEO WIRING/U-WIRE-JMDB -- static-method class (returns the class itself).
      return _jmCustomerVendorDb ??= (
        await import("../../engines/JMCustomerVendorDatabaseEngine.js")
      ).JMCustomerVendorDatabaseEngine;
    case "equipmentAsset":
      return _equipmentAsset ??= (
        await import("../../engines/EquipmentAssetEngine.js")
      ).equipmentAssetEngine;
    case "preventiveMaintenance":
      return _preventiveMaintenance ??= (
        await import("../../engines/PreventiveMaintenanceEngine.js")
      ).preventiveMaintenanceEngine;
    case "integrationAdapter":
      return _integrationAdapter ??= (
        await import("../../engines/IntegrationAdapterEngine.js")
      ).integrationAdapterEngine;
    case "injectionMoldQuote":
      return _injectionMoldQuote ??= (
        await import("../../engines/InjectionMoldQuoteEngine.js")
      ).injectionMoldQuoteEngine;
    case "stockSizeOptimizer":
      return _stockSizeOptimizer ??= (
        await import("../../engines/StockSizeOptimizerEngine.js")
      ).stockSizeOptimizerEngine;
    case "marketMaterialPricing":
      return _marketMaterialPricing ??= (
        await import("../../engines/MarketMaterialPricingEngine.js")
      ).marketMaterialPricingEngine;
    case "batchOptimization":
      return _batchOptimization ??= (
        await import("../../engines/BatchOptimizationEngine.js")
      ).batchOptimizationEngine;
    case "learningPath":
      return _learningPath ??= (
        await import("../../engines/LearningPathEngine.js")
      ).learningPathEngine;
    case "castingQuote":
      return _castingQuote ??= (
        await import("../../engines/CastingQuoteEngine.js")
      ).castingQuoteEngine;
    case "weldFabQuote":
      return _weldFabQuote ??= (
        await import("../../engines/WeldFabricationQuoteEngine.js")
      ).weldFabricationQuoteEngine;
    case "multiProcessQuote":
      return _multiProcessQuote ??= (
        await import("../../engines/MultiProcessQuoteEngine.js")
      ).multiProcessQuoteEngine;
    case "shiftScheduleOptimizer":
      return _shiftScheduleOptimizer ??= (
        await import("../../engines/ShiftScheduleOptimizerEngine.js")
      ).shiftScheduleOptimizerEngine;
    case "advancedReportRenderer":
      return _advancedReportRenderer ??= (
        await import("../../engines/AdvancedReportRendererEngine.js")
      ).advancedReportRendererEngine;
    case "programmerProductivity":
      return _programmerProductivity ??= (
        await import(
          "../../engines/ProgrammerProductivityEngine.js"
        )
      ).programmerProductivityEngine;
    case "whiteLabelConfig":
      return _whiteLabelConfig ??= (
        await import(
          "../../engines/WhiteLabelConfigEngine.js"
        )
      ).whiteLabelConfigEngine;
    case "saasAPI":
      return _saasAPI ??= (
        await import(
          "../../engines/SaaSAPIEngine.js"
        )
      ).saasAPIEngine;
    case "jobProfitabilityWaterfall":
      return _jobProfitabilityWaterfall ??= (
        await import("../../engines/JobProfitabilityWaterfallEngine.js")
      ).jobProfitabilityWaterfallEngine;
    case "quoteEngine":
      return _quoteEngine ??= (
        await import("../../engines/QuoteEngine.js")
      ).quoteEngine;
    case "toolInventoryOrchestrator":
      return _toolInventoryOrchestrator ??= (
        await import("../../engines/ToolInventoryOrchestratorEngine.js")
      ).toolInventoryOrchestratorEngine;
    case "latheAutoQuoteFromPrint":
      return _latheAutoQuoteFromPrint ??= (
        await import("../../engines/LatheAutoQuoteFromPrintEngine.js")
      ).latheAutoQuoteFromPrintEngine;
    case "billing":
      return _billing ??= (
        await import("../../engines/BillingEngine.js")
      ).billingEngine;
    case "stripeBilling":
      return _stripeBilling ??= new (
        await import("../../engines/StripeBillingEngine.js")
      ).StripeBillingEngine({ testMode: true });
    // U-BRIDGE-WIRE-BUSINESS — engineeringChangeOrderEngine + qdrantCapacityPlannerEngine
    // are exported singletons; ERPToolInventoryEngine exposes STATIC methods so the
    // class reference (not a singleton instance) is what callers invoke.
    case "eco":
      return _eco ??= (
        await import("../../engines/EngineeringChangeOrderEngine.js")
      ).engineeringChangeOrderEngine;
    case "qdrantCapacity":
      return _qdrantCapacity ??= (
        await import("../../engines/QdrantCapacityPlannerEngine.js")
      ).qdrantCapacityPlannerEngine;
    case "erpToolInventory":
      return _erpToolInv ??= (
        await import("../../engines/ERPToolInventoryEngine.js")
      ).ERPToolInventoryEngine;
    case "quoteToOrderBridge":
      return _quoteToOrderBridge ??= (
        await import("../../engines/QuoteToOrderBridgeEngine.js")
      ).quoteToOrderBridgeEngine;
    case "workOrderScheduleBridge":
      return _workOrderScheduleBridge ??= (
        await import("../../engines/WorkOrderScheduleBridgeEngine.js")
      ).workOrderScheduleBridgeEngine;
    case "latheReconciliation":
      return _latheReconciliation ??= (
        await import("../../engines/LatheActualCostReconciliationEngine.js")
      ).latheActualCostReconciliationEngine;
    case "latheScheduler":
      return _latheScheduler ??= (
        await import("../../engines/LatheJobSchedulingEngine.js")
      ).latheJobSchedulingEngine;
    case "latheOrderLifecycle":
      return _latheOrderLifecycle ??= (
        await import("../../engines/LatheCustomerOrderLifecycleEngine.js")
      ).latheCustomerOrderLifecycleEngine;
    case "lathePOAutomation":
      return _lathePOAutomation ??= (
        await import("../../engines/LathePurchaseOrderAutomationEngine.js")
      ).lathePurchaseOrderAutomationEngine;
    case "latheInventory":
      return _latheInventory ??= (
        await import("../../engines/LatheInventoryIntelligenceEngine.js")
      ).latheInventoryIntelligenceEngine;
    case "latheProfitability":
      return _latheProfitability ??= (
        await import("../../engines/LatheJobProfitabilityAnalyticsEngine.js")
      ).latheJobProfitabilityAnalyticsEngine;
    case "latheERPOrchestrator":
      return _latheERPOrchestrator ??= (
        await import("../../engines/LatheERPOrchestratorEngine.js")
      ).latheERPOrchestratorEngine;
    case "latheAGIBridge":
      return _latheAGIBridge ??= (
        await import("../../engines/LatheAGIFeatureBridgeEngine.js")
      ).latheAGIFeatureBridgeEngine;
    case "latheAGILearning":
      return _latheAGILearning ??= (
        await import("../../engines/LatheAGIContinuousLearningEngine.js")
      ).latheAGIContinuousLearningEngine;
    case "latheAGIKnowledge":
      return _latheAGIKnowledge ??= (
        await import("../../engines/LatheAGIKnowledgeUnificationEngine.js")
      ).latheAGIKnowledgeUnificationEngine;
    case "latheAGISafety":
      return _latheAGISafety ??= (
        await import("../../engines/LatheAGISafetyContainmentEngine.js")
      ).latheAGISafetyContainmentEngine;
    default:
      throw new Error(`Unknown business engine: ${name}`);
  }
}

// ── JM customer/vendor database path resolver (ROMEO WIRING/U-WIRE-JMDB, 2026-06-10).
// JMCustomerVendorDatabaseEngine defaults its JSONL paths off process.cwd(); under the
// MCP server cwd is mcp-server/, so the repo-root corpus would be missed. Resolve via the
// same 3-candidate pattern as customer_seed_jm_corpus (cwd/.., cwd, H:/PRISM) and pass
// explicit paths to every action. Cached after first resolution unless an override is given. ──
let _jmDbPaths: { customersPath: string; vendorsPath: string } | null = null;
async function resolveJmDbPaths(
  override?: { customersPath?: string; vendorsPath?: string },
): Promise<{ customersPath: string; vendorsPath: string }> {
  const hasOverride = !!(override?.customersPath || override?.vendorsPath);
  if (override?.customersPath && override?.vendorsPath) {
    return { customersPath: override.customersPath, vendorsPath: override.vendorsPath };
  }
  if (_jmDbPaths && !hasOverride) return _jmDbPaths;
  const { resolve } = await import("node:path");
  const { existsSync } = await import("node:fs");
  const pick = (rel: string, ov?: string): string => {
    if (ov) return ov;
    const cands = [
      resolve(process.cwd(), "..", rel),
      resolve(process.cwd(), rel),
      resolve("H:/PRISM", rel),
    ];
    return cands.find((c) => existsSync(c)) ?? cands[0];
  };
  const paths = {
    customersPath: pick("state/shared/databases/jm-customers.jsonl", override?.customersPath),
    vendorsPath: pick("state/shared/databases/jm-vendors.jsonl", override?.vendorsPath),
  };
  if (!hasOverride) _jmDbPaths = paths;
  return paths;
}

const ACTIONS = [
  "financial_npv",
  "financial_irr",
  "financial_breakeven",
  "financial_machine_investment",
  "inventory_eoq",
  "inventory_safety_stock",
  "inventory_abc",
  "inventory_tool_optimize",
  "job_create",
  "job_update_status",
  "job_summary",
  "job_dashboard",
  "purchasing_search",
  "purchasing_recommend",
  "purchasing_manufacturers",
  "purchasing_summary",
  "costing_job_cost",
  "costing_material",
  "costing_machining",
  "quoting_generate",
  "quoting_price_breaks",
  "scheduling_single_machine",
  "scheduling_johnsons",
  "scheduling_job_shop",
  "scheduling_cpm",
  "reporting_dashboard",
  "reporting_pareto",
  "reporting_production",
  "reporting_quality",
  "reporting_financial",
  "reporting_trend",
  "order_create",
  "order_update_status",
  "order_list",
  "order_work_order_create",
  "order_log_time",
  "order_log_production",
  "order_machine_queue",
  "order_metrics",
  // ── Employee ──
  "employee_create",
  "employee_update",
  "employee_search",
  "employee_add_skill",
  "employee_utilization",
  "employee_dept_summary",
  // ── TimeClock ──
  "clock_in",
  "clock_out",
  "job_time_start",
  "job_time_pause",
  "job_time_resume",
  "job_time_stop",
  "timecard_summary",
  "attendance_report",
  "who_clocked_in",
  "commission_report",
  "daily_flash_generate",
  "daily_flash_email",
  // ── Payroll ──
  "payroll_create_period",
  "payroll_run",
  "payroll_pay_stub",
  // ── Invoicing ──
  "invoice_create",
  "invoice_from_job",
  "invoice_payment",
  "invoice_list",
  "invoice_aging",
  // ── Tool Usage ──
  "tool_inventory_add",
  "tool_start_usage",
  "tool_end_usage",
  "tool_regrind",
  "tool_job_cost",
  "tool_reorder_alerts",
  // ── Actual Cost ──
  "actual_cost_calculate",
  "actual_cost_variance",
  "actual_cost_profitability",
  // ── Quote Estimator (physics-backed) ──
  "quote_estimate",
  "quote_compare_materials",
  "quote_what_if",
  "quote_price_breaks_advanced",
  // ── Instant Quote Pipeline ──
  "instant_quote",
  "instant_quote_qty_breaks",
  "instant_quote_lead_time",
  // ── Quote Revisions ──
  "quote_revise",
  "quote_get_history",
  "quote_compare_revisions",
  "quote_status_change",
  "quote_generate_share_token",
  "quote_get_by_token",
  // ── Secondary Ops ──
  "sec_ops_list",
  "sec_ops_quote",
  "sec_ops_batch_quote",
  "sec_ops_find_vendors",
  "sec_ops_recommend",
  // ── Quote Analytics ──
  "analytics_record",
  "analytics_update_outcome",
  "analytics_record_actuals",
  "analytics_accuracy",
  "analytics_conversion",
  "analytics_calibration",
  // ── Actual Cost Enhancements ──
  "actual_cost_forecast",
  "actual_cost_margin_alerts",
  "actual_cost_trend",
  // ── Purchase Orders (AP) ──
  "po_create",
  "po_approve",
  "po_receive",
  "po_three_way_match",
  "po_list",
  "po_ap_aging",
  "po_spend_by_category",
  // ── General Ledger ──
  "gl_chart_of_accounts",
  "gl_journal_entry",
  "gl_record_invoice",
  "gl_record_payment",
  "gl_record_purchase",
  "gl_record_payroll",
  "gl_trial_balance",
  "gl_income_statement",
  "gl_balance_sheet",
  // ── Capacity Planning ──
  "capacity_machines",
  "capacity_schedule_job",
  "capacity_machine_load",
  "capacity_all_loads",
  "capacity_bottlenecks",
  "capacity_what_if",
  "capacity_summary",
  // ── Quality Management ──
  "quality_spc_chart",
  "quality_calibration_add",
  "quality_calibration_dashboard",
  "quality_material_cert",
  "quality_trace_heat_lot",
  "quality_trace_job",
  "quality_ncr_create",
  "quality_ncr_update",
  "quality_ncr_dashboard",
  "quality_fai_create",
  "quality_fai_list",
  "quality_kpis",
  // ── Machine Rate Database ──
  "machine_rate_lookup",
  "machine_rate_list",
  "machine_rate_compare",
  "machine_rate_effective",
  // ── Shop Configuration (Session 5-2) ──
  "shop_config_get",
  "shop_config_update",
  "shop_config_machines",
  "shop_config_rates",
  "shop_config_reset",
  // ── Blueprint → Quote Bridge ──
  "blueprint_to_quote",
  "blueprint_resolve_material",
  // ── Sheet Metal Quoting ──
  "sheet_metal_quote",
  // ── Additive Manufacturing Quoting ──
  "additive_quote",
  "additive_list_materials",
  "additive_compare_technologies",
  // ── Injection Mold Quoting ──
  "injection_mold_quote",
  "injection_mold_materials",
  "injection_mold_dfm",
  // ── Stock Size Optimizer ──
  "stock_size_optimize",
  "stock_size_catalog",
  "stock_size_nesting",
  // ── Market Material Pricing ──
  "material_price_lookup",
  "material_price_adjust",
  "material_price_compare",
  "material_surcharge",
  // ── HR & Compliance ──
  "hr_benefits_list",
  "hr_enroll",
  "hr_enrollment",
  "hr_pto_init",
  "hr_pto_request",
  "hr_pto_approve",
  "hr_pto_balance",
  "hr_training_add",
  "hr_training_history",
  "hr_training_expiring",
  "hr_review_create",
  "hr_reviews",
  "hr_compensation_history",
  "hr_compliance_alerts",
  "hr_dashboard",
  // ── Equipment Assets (BIZ-MS5 U-BIZ37) ──
  "asset_compute_depreciation",
  "asset_register",
  "asset_depreciation_schedule",
  "asset_list",
  "asset_transfer",
  "asset_calibration_due",
  // ── Customer Management ──
  "customer_create",
  "customer_get",
  "customer_update",
  "customer_search",
  "customer_list",
  "customer_seed_jm_corpus",
  "customer_credit_check",
  "customer_log_comm",
  "customer_comm_history",
  "customer_follow_ups",
  "customer_create_opportunity",
  "customer_update_opportunity",
  "customer_pipeline",
  "customer_analytics",
  "customer_top",
  "customer_revenue_concentration",
  "customer_growth_trends",
  "customer_normalize",
  "customer_portfolio_sources",
  "customer_portfolio_list",
  "customer_portfolio_mine",
  "customer_portfolio_harvest",
  "customer_portfolio_audit",
  "customer_portfolio_profile",
  // ── ERP Quality (record inspections, NCRs, sync to ERP) ──
  "erp_quality_record_inspection",
  "erp_quality_create_ncr",
  "erp_quality_close_ncr",
  "erp_quality_metrics",
  "erp_quality_sync",
  "erp_quality_inspections_by_type",
  "erp_quality_open_ncrs",
  "erp_quality_inspection_trend",
  // ── Integration / Export ──
  "integration_export_qb",
  "integration_export_csv",
  "integration_export_payroll_tax",
  "integration_reconcile_bank",
  "integration_export_ar_aging",
  "integration_formats",
  // ── Batch Optimization ──
  "batch_group",
  "batch_sequence",
  "batch_setup_matrix",
  "batch_capacity",
  // ── Learning Path ──
  "learning_assess",
  "learning_plan",
  "learning_progress",
  "learning_recommend",
  // ── Casting Quoting ──
  "casting_quote",
  "casting_materials",
  "casting_compare_processes",
  "casting_dfm",
  // ── Weld/Fabrication Quoting ──
  "weld_fab_quote",
  "weld_fab_joint_cost",
  "weld_fab_consumables",
  // ── Multi-Process Quoting ──
  "multi_process_quote",
  "multi_process_estimate",
  // ── Shift Schedule Optimizer ──
  "schedule_optimize",
  "schedule_balance",
  "schedule_what_if",
  // ── Advanced Report Renderer ──
  "report_tool_life_forecast",
  "report_capability_study",
  "report_stability_map",
  "report_cost_sensitivity",
  "report_cycle_time_variance",
  "report_scrap",
  // ROI Proof (VAL-MS0)
  "roi_log", "roi_log_outcome", "roi_summary", "roi_report", "roi_reset", "roi_configure_costs", "roi_events", "roi_trend",
  // ── Programmer Productivity ──
  "productivity_log",
  "productivity_summary",
  "productivity_achievements",
  "productivity_digest",
  "productivity_compare",
  // ── White Label Config (VAL-MS3) ──
  "brand_configure",
  "brand_status",
  "brand_reset",
  "brand_fleet",
  "brand_tools",
  "brand_tips",
  // ── SaaS API (VAL-MS5) ──
  "api_route_map",
  "api_usage",
  "api_rate_check",
  "api_webhook_register",
  "api_webhook_list",
  "api_health",
  // ── Quote-to-Ship Pipeline (0-D-7a: E1086 orphan wiring) ──
  "quote_to_ship_run",
  "quote_to_ship_validate",
  "quote_to_ship_status",
  // ── Approval Workflows (Session 6-6) ──
  "workflow_configure",
  "workflow_submit",
  "workflow_decide",
  "workflow_pending",
  "approval_workflow_status",
  "workflow_cancel",
  "approval_workflow_list",
  "workflow_stats",
  "workflow_requires_approval",
  "workflow_entity_history",
  // ── Record Timeline & Comments (Session 6-6) ──
  "timeline_get",
  "timeline_add",
  "comment_create",
  "comment_list",
  "comment_edit",
  "comment_delete",
  // ── Job Traveler (Session 6-7) ──
  "traveler_create",
  "traveler_start_setup",
  "traveler_start_cycle",
  "traveler_complete_step",
  "traveler_get_active",
  "traveler_get",
  "traveler_scan",
  // ── Machine Dispatch (Session 6-7) ──
  "dispatch_queue_job",
  "dispatch_get_queue",
  "dispatch_reorder",
  "dispatch_get_all_queues",
  "dispatch_what_if",
  "dispatch_remove",
  // ── Milestone Tracking (Session 6-9) ──
  "milestone_create_timeline",
  "milestone_get_timeline",
  "milestone_advance",
  "milestone_skip",
  "milestone_on_job_status",
  "milestone_events",
  "milestone_list_jobs",
  "milestone_delete",
  // ── Customer Portal (Session 6-9) ──
  "portal_create_token",
  "portal_revoke_token",
  "portal_list_tokens",
  "portal_validate_token",
  "portal_quote_view",
  "portal_quote_respond",
  "portal_order_status",
  "portal_add_quality_doc",
  "portal_update_quality_doc",
  "portal_list_quality_docs",
  "portal_get_quality_doc",
  "portal_send_message",
  "portal_list_messages",
  "portal_mark_read",
  // ── Distributor Search (G1 from hotel iter10 ERP-comparison audit) ──
  // Live tool/material search across MSC / McMaster / Misumi / Grainger /
  // Fastenal — adapter pattern, additional distributors plug in via
  // registerProvider. Reference catalog default; live API on apiKey.
  "distributor_search",          // aggregated search across all providers
  "distributor_list_providers",  // inventory of registered providers
  "distributor_set_api_key",     // wire a live-API key for a provider
  "distributor_register",        // register a custom provider (advisory — needs full Provider object)
  "distributor_invalidate_cache",// drop the 24h cache
  // ── Region-aware vendor sort (G9 — hotel iter11) ──
  "vendor_region_rank",          // haversine sort of all active vendors by proximity to origin_zip
  "vendor_region_nearest",       // single closest vendor of a category
  "vendor_region_within_radius", // all vendors within max_distance of origin
  "vendor_region_default_origin",// the canonical JM Die origin (60018 Des Plaines IL)
  // ── Amortization / Depreciation (G8 — hotel iter12) ──
  "amortization_payment",        // closed-form PMT = P·r/(1−(1+r)^−n)
  "amortization_schedule",       // period-by-period breakdown (ledger-balanced)
  "amortization_straight_line",  // straight-line depreciation schedule
  // ── Recurring Expenses (G8 — hotel iter12) ──
  "recurring_expense_create",
  "recurring_expense_get",
  "recurring_expense_list",
  "recurring_expense_update_amount",
  "recurring_expense_deactivate",
  "recurring_expense_monthly_burden",
  "recurring_expense_forecast",
  // ── Inventory ROP / EOQ / Safety Stock (G11 — hotel iter13) ──
  "inventory_eoq",
  "inventory_safety_stock",
  "inventory_reorder_point",
  "inventory_total_cost",
  "inventory_reorder_policy",
  // ── AR Aging (G13 — hotel iter13) ──
  "ar_invoice_record",
  "ar_payment_record",
  "ar_invoice_get",
  "ar_invoice_list",
  "ar_aging_report",
  // ── Price-break optimization + ABC classification (G11ext+G12 — hotel iter14) ──
  "inventory_price_break_optimize",
  "abc_classify",
  // ── Tool-life economic replacement (G10 — hotel iter15) ──
  "tool_life_cost_per_minute",
  "tool_life_economic_life",
  "tool_life_replacement_schedule",
  // ── Critical Path Method scheduling (G5 — hotel iter16) ──
  "cpm_schedule",
  // ── BOM Explosion + Cost Rollup (G4 — hotel iter17) ──
  "bom_explode",
  "bom_cost_rollup",
  "bom_cycle_check",
  // ── Job Routing Templates (G7 — hotel iter18) ──
  "routing_template_create",
  "routing_template_get",
  "routing_template_list",
  "routing_template_instantiate",
  // ── Vendor Quote → Purchase Order lifecycle (G3 — hotel iter19) ──
  "vendor_quote_record",
  "vendor_quote_to_po",
  "po_receipt_record",
  "po_three_way_match",
  "vendor_quote_get",
  "vendor_quote_list",
  "po_get",
  "po_list",
  // ── Invoice OCR parser + X12 EDI parser (G2+G6 parser halves — hotel iter20) ──
  "invoice_text_parse",
  "x12_parse_interchange",
  // ── Prospective customer sales pipeline (hotel iter21) ──
  "prospect_create",
  "prospect_get",
  "prospect_list",
  "prospect_advance_status",
  "prospect_pipeline_report",
  "prospect_seed_jm_die",                      // load JM Die seed catalog into engine
  "prospect_first_contact_email",
  "prospect_sales_approach_guide",
  "prospect_first_quote_prompts",
  // ── JM Die team user profiles + RBAC (hotel iter23) ──
  "user_profile_get",
  "user_profile_get_redacted",
  "user_profile_list",
  "user_profile_seed_jm_team",
  "user_profile_check_permission",
  "user_profile_set_active",
  "user_profile_get_active",
  "user_profile_coverage_report",
  // ── Email PDF/print intake — Tuesday extraction (hotel iter24) ──
  "email_intake_register_inbox",
  "email_intake_list_inboxes",
  "email_intake_seed_jm_team",
  "email_intake_should_run_now",
  "email_intake_run_batch",
  "email_intake_run_dry",
  // ── Intake artifact processor — PDF→tool/inventory/part auto-populate (hotel iter25) ──
  "intake_process_artifact",
  "intake_processor_history",
  "intake_processor_summary",
  "intake_processor_diagnostics",
  // ── Vision diagnostic — chip/part/tool photo → param adjustments (hotel iter26) ──
  "vision_diagnose_image",
  // ── Job Profitability Waterfall ──
  "profitability_analyze",
  "profitability_compare",
  "profitability_sensitivity",
  // ── Quote Generation (QuoteEngine) ──
  "quote_generate",
  "quote_quantity_breaks",
  "quote_margin_analysis",
  // ── Tool Inventory Orchestrator ──
  "tool_inv_check_availability",
  "tool_inv_suggest_substitutes",
  "tool_inv_reorder_list",
  "tool_inv_optimize_crib",
  // ── Quoting Formulas (SQ4-1-QUOTE) ──
  "quote_abc_cost",
  "quote_learning_curve",
  "quote_eoq",
  "quote_calibrate",
  "quote_setup_complexity",
  "quote_scrap_reserve",
  // ── Accounting Hardening (SQ4-3-ACCT) ──
  "acct_bank_reconcile",
  "acct_wip_valuation",
  "acct_variance_analysis",
  "acct_cost_to_complete",
  "acct_multi_period_compare",
  "acct_quickbooks_sync",
  // ── Billing / Stripe (Session 2B-4: U-BILL1) ──
  "billing_get_plans",
  "billing_get_post_prices",
  "billing_calc_post_price",
  "billing_create_checkout",
  "billing_create_portal",
  "billing_create_post_checkout",
  "billing_handle_webhook",
  "billing_stats",
  "billing_stripe_status",
  // ── Bridge-Wiring: previously-unwired Business engines (U-BRIDGE-WIRE-BUSINESS) ──
  "eco_validate",
  "eco_stats",
  "qdrant_capacity_plan",
  "qdrant_capacity_max_fraction",
  "erp_tool_search",
  "erp_tool_reorder_alerts",
  // ── Bridge-Deep: ERP ↔ quoting bridge (U-BRIDGE-ERP-QUOTE) ──
  "quote_to_order",
  "order_from_quote",
  // ── Bridge-Deep: ERP ↔ scheduling bridge (U-BRIDGE-ERP-SCHED) ──
  "schedule_open_work_orders",
  "what_if_work_order",
  // ── GL WIP→COGS (Session 2B-4: U-GL2) ──
  "gl_record_wip_to_cogs",
  // ── OEE Calculator ──
  "oee_calculate",
  // ── Coolant Cost Optimization ──
  "coolant_cost_compare",
  "coolant_cost_lifecycle",
  "coolant_cost_optimal",
  // ── Setup Cost Optimization ──
  "setup_cost_calculate",
  "setup_cost_optimize",
  // ── Cost Savings Tracker ──
  "savings_dashboard",
  "savings_record",
  "savings_roi",
  "savings_trend",
  // ── Cost-Aware Router ──
  "cost_aware_route",
  // ── ROI Advisor ──
  "roi_advisor_analyze",
  // ── Tool Cost Predictor ──
  "tool_cost_predict",
  // ── Tool Cost Per Part ──
  "tool_cost_per_part",
  // ── Tool ROI ──
  "tool_roi_analyze",
  "tool_roi_compare",
  // ── Inventory EOQ (Advanced) ──
  "inventory_eoq_advanced",
  // ── Inventory-Aware Tool Selector ──
  "inventory_tool_select",
  // ── Import Cost ──
  "import_cost_calculate",
  // ── Accounting Hardening (additional) ──
  "accounting_audit",
  "accounting_validate",
  // ── Lathe Auto-Quote From Print (U-LTH48, P5 ERP) ──
  "lathe_auto_quote_from_print",
  "lathe_auto_quote_reconcile",
  // ── Lathe Actual Cost Reconciliation (U-LTH49, P5 ERP) ──
  "lathe_actual_cost_reconcile",
  "lathe_actual_cost_accuracy",
  // ── Lathe Job Scheduling (U-LTH50, P5 ERP) ──
  "lathe_job_schedule",
  "lathe_job_from_quote",
  // ── Lathe Order Lifecycle (U-LTH51) ──
  "lathe_order_create",
  "lathe_order_transition",
  "lathe_order_get",
  "lathe_order_list",
  "lathe_order_audit",
  "lathe_order_pipeline",
  // ── Lathe PO Automation (U-LTH52) ──
  "lathe_po_build",
  // ── Lathe Inventory Intelligence (U-LTH53) ──
  "lathe_inv_upsert",
  "lathe_inv_movement",
  "lathe_inv_snapshot",
  "lathe_inv_alerts",
  "lathe_inv_get",
  // ── Lathe Profitability Analytics (U-LTH54) ──
  "lathe_profit_record",
  "lathe_profit_portfolio",
  "lathe_profit_get",
  // ── Lathe ERP Orchestrator (U-LTH57) ──
  "lathe_erp_full",
  // ── Lathe AGI Substrate (U-LTH58..U-LTH61) ──
  "lathe_agi_reason",
  "lathe_agi_history",
  "lathe_agi_confidence",
  "lathe_agi_feedback",
  "lathe_agi_adjustment",
  "lathe_agi_kg_upsert_node",
  "lathe_agi_kg_upsert_edge",
  "lathe_agi_kg_query",
  "lathe_agi_kg_trace",
  "lathe_agi_kg_stats",
  "lathe_agi_safety_check",
  // ── Preventive Maintenance (OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-PM) ──
  "pm_schedule_create",
  "pm_schedule_list",
  "pm_schedule_is_due",
  "pm_work_order_generate",
  "pm_work_order_complete",
  "pm_overdue_alerts",
  "pm_downtime_record",
  "pm_work_order_list",
  "pm_work_order_assign",
  // iter8/bulk-sweep: 10 business engines
  "customer_portfolio_mine",
  "customer_knowledge_query",
  "shop_floor_quote_generate",
  "erp_work_order_sync",
  "multi_path_reason",
  "stream_vs_batch_reconcile",
  "docustrata_customer_index_search",
  "cost_efficiency_bridge_analyze",
  "xometry_quote_inputs_build",
  "quote_scenario_generate",
  // iter9 wire-unwired-loop: business/shop engines
  "business_sync_stats",
  "cash_flow_project",
  "burden_rate_calc",
  "vendor_manage",
  "distribution_network_analyze",
  "business_doc_extract",
  "docustrata_ingest_and_post",
  "docustrata_batch_ingest",
  "adaptive_shop_rate_record",
  "adaptive_shop_rate_adapt",
  "adaptive_shop_rate_get_prior",
  "adaptive_shop_rate_analyze_margin",
  "iso9001_validate",
  "iso9001_list_clauses",
  "realtime_financial_snapshot",
  "loto_initiate",
  "loto_add_authorized",
  "loto_transition",
  "loto_get_event",
  "loto_list_events",
  "loto_audit",
  "safety_training_assign",
  "safety_training_complete",
  "safety_training_status",
  "safety_training_compliance_report",
  "safety_training_list_topics",
  "sds_load",
  "sds_find_by_cas",
  "sds_find_by_product",
  "sds_find_by_hazard",
  "sds_review_report",
  "sds_revision_history",
  "sds_list_hazard_classes",
  "doc_register",
  "doc_transition",
  "doc_revise",
  "doc_issue_copy",
  "doc_acknowledge_copy",
  "doc_get",
  "doc_list",
  "doc_active_revision",
  "doc_revision_chain",
  "doc_list_copies",
  "shop_data_completeness_score",
  "make_vs_buy_analysis",
  // U-WIRE-BACKLOG-ERP — strategic-level BI analyses (BusinessIntelligenceEngine, was unwired)
  "bi_make_vs_buy_strategic",
  "bi_upgrade_vs_outsource",
  "bi_capital_investment",
  "bi_break_even",
  "bi_cost_drivers",
  "packing_slip_generate",
  "saas_api_route_map",
  "white_label_configure",
  "programmer_productivity_log",
  "instructor_dashboard_manage",
  "quoting_engine_estimate",
  // HOTEL/U-INTERNAL-AUDIT-CALENDAR — ISO 9001 §9.2
  "internal_audit_schedule",
  "internal_audit_start",
  "internal_audit_record_finding",
  "internal_audit_close_finding",
  "internal_audit_complete",
  "internal_audit_list_overdue",
  "internal_audit_annual_coverage",
  // HOTEL/U-MANAGEMENT-REVIEW — ISO 9001 §9.3
  "management_review_schedule",
  "management_review_convene",
  "management_review_record_inputs",
  "management_review_record_output",
  "management_review_add_action_item",
  "management_review_update_action_item",
  "management_review_complete",
  "management_review_overdue_actions",
  "management_review_prior_status",
  // HOTEL/U-BID-WIN-CALIBRATOR — axis D
  "bid_win_record_outcome",
  "bid_win_calibrate",
  "bid_win_predict",
  "bid_win_optimal_markup",
  "bid_win_get_model",
  // HOTEL/U-EMPLOYEE-ROLE-ACADEMY-INJECTION — role→academy course bridge
  "role_academy_list_roles",
  "role_academy_get_curriculum",
  "role_academy_set_employee_role",
  "role_academy_get_employee_role",
  "role_academy_inject_on_hire",
  "role_academy_inject_on_promotion",
  "role_academy_inject_on_incident",
  "role_academy_recommend",
  "role_academy_record_outcome",
  "role_academy_list_assignments",
  // HOTEL/U-EMPLOYEE-PERFORMANCE-FEEDBACK — self-learning loop closer
  "employee_perf_record_signal",
  "employee_perf_get_profile",
  "employee_perf_generate_nudges",
  "employee_perf_assess_readiness",
  "employee_perf_team_rollup",
  // HOTEL/U-EMPLOYEE-SHIFT-SCHEDULE — forward-looking roster + coverage gaps
  "shift_register_machine_qualification",
  "shift_register_course_passed",
  "shift_schedule",
  "shift_cancel",
  "shift_daily_roster",
  "shift_employee_schedule",
  // HOTEL/U-EMPLOYEE-PTO-ACCRUAL — PTO/sick/personal accrual + request workflow
  "pto_compute_balance",
  "pto_post_ledger",
  "pto_accrue_period",
  "pto_grant_annual_personal",
  "pto_submit_request",
  "pto_approve_request",
  "pto_reject_request",
  "pto_cancel_request",
  "pto_list_requests",
  "pto_get_approved_dates",
  "pto_get_ledger",
  // HOTEL/U-EMPLOYEE-PAYROLL-GROSS-PAY — FLSA OT + shift diff + bonus → gross
  "payroll_compute_gross",
  "payroll_reconcile_gross",
  // HOTEL/U-EMPLOYEE-DAILY-DIGEST — phone-ready daily synergy capstone
  "digest_build",
  // HOTEL/U-MANAGER-DAILY-DASHBOARD — foreman/manager team rollup
  "manager_dashboard_build",
  // HOTEL/U-EMPLOYEE-SHIFT-SWAP — peer-to-peer shift swap workflow
  "swap_propose",
  "swap_counterparty_respond",
  "swap_manager_approve",
  "swap_mark_executed",
  "swap_cancel",
  "swap_list",
  "swap_register_qualification",
  "swap_register_course_passed",
  // HOTEL/U-EMPLOYEE-TASK-HANDOFF — peer-to-peer task handoff with accept/deny + manager bypass
  "handoff_propose",
  "handoff_counterparty_respond",
  "handoff_manager_approve",
  "handoff_mark_executed",
  "handoff_cancel",
  "handoff_list",
  "handoff_stalled",
  "handoff_waste_summary",
  "handoff_register_rank",
  "handoff_register_qualification",
  "handoff_register_course_passed",
  // HOTEL/U-KAIZEN-LEAN-SIGMA — DOWNTIME 8 wastes + DMAIC + Cpk gate + kaizen suggestions
  "kaizen_observe_waste",
  "kaizen_waste_ledger",
  "kaizen_waste_summary",
  "kaizen_open_event",
  "kaizen_advance_event",
  "kaizen_close_event",
  "kaizen_list_events",
  "kaizen_calc_cpk",
  "kaizen_six_sigma_gate",
  "kaizen_submit_suggestion",
  "kaizen_triage_suggestion",
  "kaizen_list_suggestions",
  // HOTEL/U-MACHINE-DOMAIN-ACADEMY — per-machine specialist training ladder per role
  "domain_academy_enroll",
  "domain_academy_enroll_full_path",
  "domain_academy_mark_passed",
  "domain_academy_mark_failed",
  "domain_academy_promote",
  "domain_academy_report_path",
  "domain_academy_list_assignments",
  "domain_academy_list_transitions",
  "domain_academy_get_curriculum",
  "domain_academy_list_domains",
  "domain_academy_map_course_to_machines",
  // HOTEL/U-DEPARTMENT-ENGINE — org-chart entity + KPI rollup (G1)
  "dept_create",
  "dept_get",
  "dept_list",
  "dept_reassign_manager",
  "dept_add_member",
  "dept_remove_member",
  "dept_rename",
  "dept_set_machine_domain",
  "dept_set_parent",
  "dept_set_kpi_rollup",
  "dept_get_rollup",
  "dept_ancestor_chain",
  // HOTEL/U-MANAGER-REGISTRY — central rank+dept+reports_to truth (G2)
  "mgr_register",
  "mgr_get",
  "mgr_list",
  "mgr_promote",
  "mgr_demote",
  "mgr_reassign_dept",
  "mgr_set_reports_to",
  "mgr_deactivate",
  "mgr_reactivate",
  "mgr_can_approve",
  "mgr_reports_to_chain",
  "mgr_direct_reports",
  "mgr_rank_order",
  // HOTEL/U-AI-PROPOSAL-APPROVAL-QUEUE — generic admin gate for AI outputs (G5)
  "aiprop_submit",
  "aiprop_begin_review",
  "aiprop_approve",
  "aiprop_reject",
  "aiprop_edit_and_approve",
  "aiprop_withdraw",
  "aiprop_expire_overdue",
  "aiprop_list_queue",
  "aiprop_get",
  "aiprop_stats",
  "aiprop_set_admin_min_rank",
  // HOTEL/U-AUTO-JOB-SCHEDULER — AI scheduler proposer over JobShopSchedulingEngine (G3)
  "auto_sched_build_diff",
  "auto_sched_submit_proposal",
  "auto_sched_build_and_submit",
  "auto_sched_history",
  "auto_sched_system_viz_roost",
  // HOTEL/U-AUTO-TASK-DELEGATOR — AI delegation proposer over EmployeeTaskHandoffEngine (G4)
  "auto_deleg_build_proposal",
  "auto_deleg_submit_proposal",
  "auto_deleg_build_and_submit",
  "auto_deleg_history",
  "auto_deleg_system_viz_roost",
  // HOTEL/U-AI-SUMMARY-WRITER — admin-gated narrative writer for digests (G6)
  "ai_summary_build_daily_employee",
  "ai_summary_build_weekly_department",
  "ai_summary_build_monthly_customer",
  "ai_summary_submit_draft",
  "ai_summary_classify_cpk",
  "ai_summary_allowed_cadences",
  "ai_summary_system_viz_roost",
  // HOTEL/U-DEPT-AUDIT-DASHBOARD — per-dept audit rollup (G7)
  "dept_audit_build_row",
  "dept_audit_system_viz_roost",
  // HOTEL/U-AUDIT-CAPA-BRIDGE — audit finding → DMAIC kaizen event (G13)
  "audit_capa_create",
  "audit_capa_get_kaizen_for_finding",
  "audit_capa_get_finding_for_kaizen",
  "audit_capa_list",
  "audit_capa_system_viz_roost",
  // HOTEL/U-APPROVAL-CHAIN — multi-step approval chain (G8)
  "appr_chain_open",
  "appr_chain_approve_step",
  "appr_chain_reject_step",
  "appr_chain_withdraw",
  "appr_chain_get",
  "appr_chain_list",
  "appr_chain_system_viz_roost",
  // HOTEL/U-RFQ-TO-ORDER — RFQ → quote → admin → send → accept → order (G9)
  "rfq_receive",
  "rfq_draft_quote",
  "rfq_mark_admin_approved",
  "rfq_mark_admin_rejected",
  "rfq_mark_sent_to_customer",
  "rfq_mark_customer_accepted",
  "rfq_mark_customer_rejected",
  "rfq_expire_overdue",
  "rfq_get",
  "rfq_list",
  "rfq_system_viz_roost",
  // HOTEL/U-LOGISTICS-DASHBOARD — internal logistics rollup (G10)
  "logistics_build_dashboard",
  "logistics_system_viz_roost",
  // HOTEL/U-FIN-INVARIANT-GATE — double-entry + trial balance + no-overwrite (G14)
  "fin_invariant_validate_double_entry",
  "fin_invariant_validate_trial_balance",
  "fin_invariant_validate_no_posted_overwrite",
  "fin_invariant_system_viz_roost",
  // HOTEL/U-PII-REDACTION — SSN + credit card + recursive scrub (G15)
  "pii_redact_ssn",
  "pii_redact_credit_card",
  "pii_scrub",
  "pii_detect_violations",
  "pii_system_viz_roost",
  // HOTEL/U-NONCONFORMANCE-CORRECTIVE-ACTION — ISO 9001 §10.2 NCR + 8D
  "nc_record",
  "nc_record_containment",
  "nc_record_root_cause",
  "nc_record_corrective_action",
  "nc_record_verification",
  "nc_close",
  "nc_management_review_summary",
  "nc_list",
  "nc_get",
  // HOTEL/U-CUSTOMER-COMPLAINT-INTAKE — inbound complaint channel → NCR bridge
  "complaint_receive",
  "complaint_triage",
  "complaint_attach_ncr",
  "complaint_resolve",
  "complaint_close",
  "complaint_list",
  // HOTEL/U-JM-DIE-ERP-SIMULATION — E2E synergy proof / regression harness
  "jm_die_sim_run",
  // HOTEL/U-EMPLOYEE-EXPENSE-REIMBURSEMENT — expense claim → payroll bridge
  "expense_submit",
  "expense_approve",
  "expense_reject",
  "expense_mark_reimbursed",
  "expense_list",
  "expense_outstanding",
  // HOTEL/U-VENDOR-PERFORMANCE-TRACKER — ISO 9001 §8.4 external-provider evaluation
  "vendor_record_po",
  "vendor_compute_scorecard",
  "vendor_list_all",
  "vendor_rank",
  // HOTEL/U-EMPLOYEE-BENEFITS-ENROLLMENT — health/dental/vision/401k/life
  "benefits_enroll",
  "benefits_cancel",
  "benefits_payroll_deductions",
  "benefits_list",
  // HOTEL/U-EXECUTIVE-SUMMARY — C-suite weekly rollup with red-flag detection
  "exec_summary_build",
  // HOTEL/U-INSPECTION-REPORT — QC inspection reports (FAI/in-process/final/incoming) → NCR bridge
  "inspection_build_report",
  "inspection_classify_characteristic",
  "inspection_get_cofc",
  // HOTEL/U-SHIPPING-RECEIVING-LOG — inbound/outbound ledger + 3-way match (PO/receipt/invoice)
  "shipping_log_inbound",
  "shipping_log_outbound",
  "shipping_three_way_match",
  // HOTEL/U-PO-LIFECYCLE — purchase-order state machine (draft→submitted→...→closed) + change-order trail
  "po_create",
  "po_transition",
  "po_record_receipt",
  "po_append_change_order",
  "po_get_status",
  // HOTEL/U-EMPLOYEE-TIMECLOCK — punch FSM + daily/weekly minute totals + FLSA OT detect
  "timeclock_record_punch",
  "timeclock_edit_punch",
  "timeclock_daily_summary",
  "timeclock_derive_state",
  // HOTEL/U-OSHA-300-LOG — federal OSHA 1904 injury & illness log (Form 300/300A)
  "osha_record_incident",
  "osha_classify_recordable",
  "osha_reporting_window",
  "osha_annual_300a",
  // WIRE-BUSINESS-DIRECT-MS0/U-VICTOR-BUSINESS-DIRECT (slot:victor, 2026-05-26)
  // Wires 3 previously-unwired business engines from the fresh audit:
  //   scenario_batch_run             → ScenarioBatchRunnerEngine.run
  //   rfq_orchestrator_list_records  → RFQToOrderOrchestratorEngine.listRecords
  //   monolith_roughing_machine_get  → MonolithRoughingMachineConfigsEngine.getConfig
  "scenario_batch_run",
  "rfq_orchestrator_list_records",
  "monolith_roughing_machine_get",
  // ── HOTEL self-merge: QB-parity + networking marketplace (30 engines, 2026-05-31) ──
  "sales_use_tax_calc",
  "fixed_asset_depreciate",
  "form_1099nec_generate",
  "estimate_create",
  "sales_order_create",
  "credit_memo_create",
  "receive_payment_apply",
  "customer_statement_generate",
  "finance_charge_compute",
  "vendor_credit_create",
  "bill_payment_run",
  "bank_reconcile",
  "bank_feed_import",
  "bank_deposit_record",
  "chart_account_add",
  "journal_entry_memorize",
  "financial_report_sales_by_customer",
  "budget_create",
  "list_define_term",
  "item_define",
  "inventory_adjust_quantity",
  "payroll_compute_941",
  "payroll_compute_940",
  "payroll_generate_w2",
  "payroll_reconcile_w2_941",
  "payroll_contractor_1099_totals",
  "payroll_remit_liability",
  "supplier_capability_register",
  "rfq_match_score",
  "quote_explain_render",
  "buyer_register",
  "rfq_broadcast",
  "bid_rank",
  "marketplace_escrow_deposit",
  "supplier_onboard_apply",
  // HOTEL: ingest charlie's VENDOR-NETWORK-MS0 vendor corpus into the ERP (2026-05-31)
  "vendor_catalog_ingest",
  "vendor_to_supplier_hints",
  // HOTEL: NETPLAT Phase-2 — closed-loop supplier reputation from the RFQ outcome corpus (2026-05-31)
  "supplier_reputation",
  "supplier_reputation_rank",
  // HOTEL: NETPLAT Phase-2 — total-landed-cost (freight + customs) routing for RFQ ranking (2026-05-31)
  "geo_route_cost",
  "geo_landed_cost",
  "geo_logistics_score",
  // HOTEL: NETPLAT Phase-2 — capacity-aware matching (projected supplier load) (2026-05-31)
  "capacity_project",
  "capacity_earliest_slot",
  // HOTEL: NETPLAT capstone — blended final supplier rank (match+reputation+logistics+capacity) (2026-05-31)
  "marketplace_final_rank",
  // HOTEL: filtered vendor lookup over charlie's corpus (purchasing: by role/region/category) (2026-05-31)
  "vendor_catalog_query",
  // HOTEL: NETPLAT orchestrator — end-to-end RFQ rank (Phase-0 capability match + 3 Phase-2 signals → capstone blend) (2026-05-31)
  "marketplace_rank_rfq",
  // HOTEL: NETPLAT seeding — directory-lead funnel from charlie's vendor corpus into onboarding (2026-05-31)
  "marketplace_seed_from_hints",
  "marketplace_lead_list",
  "marketplace_lead_get",
  "marketplace_lead_contact",
  "marketplace_lead_convert",
  "marketplace_lead_decline",
  // ── JM customer/vendor database -- read-only analytics query layer over the
  // JSONL corpus (473 customers / 12 vendors). WIRING/U-WIRE-JMDB (slot:romeo, 2026-06-10). ──
  "jm_db_summary",
  "jm_db_list_customers",
  "jm_db_get_customer",
  "jm_db_search_customers",
  "jm_db_top_customers",
  "jm_db_list_vendors",
  "jm_db_get_vendor",
  "jm_db_vendors_for_grade",
] as const;

/** Registers business dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerBusinessDispatcher(server: any): void {
  server.tool(
    "prism_business",
    `Business Operations dispatcher — financial analysis (NPV/IRR/breakeven/machine investment), inventory optimization (EOQ/safety stock/ABC), job lifecycle tracking, purchasing directory.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({
      action,
      params: rawParams = {},
    }: {
      action: typeof ACTIONS[number];
      params?: Record<string, any>;
    }) => {
      log.info(`[prism_business] Action: ${action}`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import(
            "../../utils/paramNormalizer.js"
          );
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation
        const validation = validateActionParams(action, params, ACTION_BUSINESS_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_business",
          );
        }

        switch (action) {
          // ── Financial ──
          case "financial_npv": {
            const engine = await getEngine("financial");
            result = engine.calculateNPV(
              params.cash_flows ?? params.cashFlows ?? [],
              params.discount_rate ?? params.discountRate ?? 0.1,
            );
            break;
          }
          case "financial_irr": {
            const engine = await getEngine("financial");
            result = engine.calculateIRR(
              params.cash_flows ?? params.cashFlows ?? [],
              params.guess ?? 0.1,
            );
            break;
          }
          case "financial_breakeven": {
            const engine = await getEngine("financial");
            result = engine.calculateBreakEven(
              params.fixed_costs ?? params.fixedCosts ?? 0,
              params.price_per_unit ?? params.pricePerUnit ?? 0,
              params.variable_cost_per_unit
                ?? params.variableCostPerUnit ?? 0,
            );
            break;
          }
          case "financial_machine_investment": {
            const engine = await getEngine("financial");
            result = engine.analyzeMachineInvestment(params);
            break;
          }

          // ── Inventory ──
          case "inventory_eoq": {
            const engine = await getEngine("inventory");
            result = engine.calculateEOQ(params);
            break;
          }
          case "inventory_safety_stock": {
            const engine = await getEngine("inventory");
            result = engine.calculateSafetyStock(params);
            break;
          }
          case "inventory_abc": {
            const engine = await getEngine("inventory");
            result = engine.classifyABC(params.items ?? []);
            break;
          }
          case "inventory_tool_optimize": {
            const engine = await getEngine("inventory");
            result = engine.optimizeToolInventory(params.tools ?? []);
            break;
          }

          // ── Job Lifecycle ──
          case "job_create": {
            const engine = await getEngine("jobLifecycle");
            result = engine.createJob(params);
            break;
          }
          case "job_update_status": {
            const engine = await getEngine("jobLifecycle");
            result = engine.updateStatus(
              params.job_id ?? params.jobId,
              params.status ?? params.new_status,
              {
                user: params.user,
                notes: params.notes,
              },
            );
            break;
          }
          case "job_summary": {
            const engine = await getEngine("jobLifecycle");
            if (params.job_id ?? params.jobId) {
              result = engine.getJobSummary(
                params.job_id ?? params.jobId,
              );
            } else {
              result = engine.getActiveJobs();
            }
            break;
          }
          case "job_dashboard": {
            const engine = await getEngine("jobLifecycle");
            result = engine.dashboard();
            break;
          }

          // ── Purchasing ──
          case "purchasing_search": {
            const engine = await getEngine("purchasing");
            result = engine.searchSuppliers(params.query ?? "");
            break;
          }
          case "purchasing_recommend": {
            const engine = await getEngine("purchasing");
            result = engine.recommendSuppliers({
              need: params.need ?? params.query ?? "",
              priority: params.priority,
            });
            break;
          }
          case "purchasing_manufacturers": {
            const engine = await getEngine("purchasing");
            result = engine.getManufacturers(params.category);
            break;
          }
          case "purchasing_summary": {
            const engine = await getEngine("purchasing");
            result = engine.summary();
            break;
          }

          // ── Job Costing ──
          case "costing_job_cost": {
            const engine = await getEngine("jobCosting");
            result = engine.calculateJobCost(params);
            break;
          }
          case "costing_material": {
            const engine = await getEngine("jobCosting");
            result = engine.calculateMaterialCost(params);
            break;
          }
          case "costing_machining": {
            const engine = await getEngine("jobCosting");
            result = engine.calculateMachiningCost(params);
            break;
          }

          // ── Quoting ──
          case "quoting_generate": {
            // U-CONSOL1: Redirected from QuotingEngine → QuoteEstimatorEngine (canonical)
            const engine = await getEngine("quoteEstimator");
            const quoteInput = {
              ...params,
              material: params.material?.type ?? params.material ?? "steel_4140",
              quantity: params.quantity ?? 1,
              complexity: params.complexity ?? "medium",
              rush: params.rush,
              repeat_order: params.repeat_order ?? params.repeatOrder,
              target_margin_pct: params.target_margin ?? params.targetMargin,
            };
            result = engine.estimate(quoteInput);
            break;
          }
          case "quoting_price_breaks": {
            // U-CONSOL1: Redirected from QuotingEngine → QuoteEstimatorEngine (canonical)
            const engine = await getEngine("quoteEstimator");
            const baseInput = {
              ...params,
              material: params.material?.type ?? params.material ?? "steel_4140",
              quantity: params.quantity ?? 1,
              complexity: params.complexity ?? "medium",
            };
            result = engine.estimate(baseInput).price_breaks;
            break;
          }

          // ── Scheduling ──
          case "scheduling_single_machine": {
            const engine = await getEngine("scheduling");
            result = engine.scheduleSingleMachine(
              params.jobs ?? [],
              params.rule ?? "SPT",
            );
            break;
          }
          case "scheduling_johnsons": {
            const engine = await getEngine("scheduling");
            result = engine.johnsonsAlgorithm(params.jobs ?? []);
            break;
          }
          case "scheduling_job_shop": {
            const engine = await getEngine("scheduling");
            result = engine.scheduleJobShop(
              params.jobs ?? [],
              params.machines ?? [],
              params.rule ?? "SPT",
            );
            break;
          }
          case "scheduling_cpm": {
            const engine = await getEngine("scheduling");
            result = engine.criticalPathMethod(
              params.activities ?? [],
            );
            break;
          }

          // ── Reporting ──
          case "reporting_dashboard": {
            const engine = await getEngine("reporting");
            result = engine.dashboard(
              params.production ?? [],
              params.quality ?? [],
              params.period,
            );
            break;
          }
          case "reporting_pareto": {
            const engine = await getEngine("reporting");
            result = engine.paretoAnalysis(params.data ?? []);
            break;
          }
          case "reporting_production": {
            const engine = await getEngine("reporting");
            result = engine.productionReport(params.records ?? []);
            break;
          }
          case "reporting_quality": {
            const engine = await getEngine("reporting");
            result = engine.qualityReport(params.records ?? []);
            break;
          }
          case "reporting_financial": {
            const engine = await getEngine("reporting");
            result = engine.financialReport(params.records ?? []);
            break;
          }
          case "reporting_trend": {
            const engine = await getEngine("reporting");
            result = engine.trendAnalysis(
              params.data ?? [],
              params.window_size ?? params.windowSize ?? 3,
            );
            break;
          }

          // ── Employee ──
          case "employee_create": {
            const engine = await getEngine("employee");
            result = engine.create(params);
            break;
          }
          case "employee_update": {
            const engine = await getEngine("employee");
            const empId = params.employee_id ?? params.employeeId;
            const { employee_id: _a, employeeId: _b, ...updates } = params;
            result = engine.update(empId, updates);
            break;
          }
          case "employee_search": {
            const engine = await getEngine("employee");
            result = engine.search(params);
            break;
          }
          case "employee_add_skill": {
            const engine = await getEngine("employee");
            result = engine.addSkill(
              params.employee_id ?? params.employeeId,
              params.skill ?? { name: params.skill_name, level: params.level ?? 3 },
            );
            break;
          }
          case "employee_utilization": {
            const engine = await getEngine("employee");
            result = engine.calculateUtilization(
              params.employee_id ?? params.employeeId,
              params.period ?? "current",
              params.scheduled_hours ?? params.scheduledHours ?? 40,
              params.time_entries ?? params.timeEntries ?? [],
            );
            break;
          }
          case "employee_dept_summary": {
            const engine = await getEngine("employee");
            result = engine.departmentSummary();
            break;
          }

          // ── HOTEL self-merge: QB-parity + networking marketplace (30 engines, 2026-05-31) ──
          case "sales_use_tax_calc": {
            const engine = await getEngine("salesUseTax");
            result = engine.calcSalesTax(params);
            break;
          }
          case "fixed_asset_depreciate": {
            const engine = await getEngine("fixedAssetDep");
            result = engine.straightLine(params);
            break;
          }
          case "form_1099nec_generate": {
            const engine = await getEngine("form1099nec");
            result = engine.generate1099NEC(params);
            break;
          }
          case "estimate_create": {
            const engine = await getEngine("estimate");
            result = engine.create(params);
            break;
          }
          case "sales_order_create": {
            const engine = await getEngine("salesOrder");
            result = engine.createFromEstimate(params);
            break;
          }
          case "credit_memo_create": {
            const engine = await getEngine("creditMemo");
            result = engine.create(params);
            break;
          }
          case "receive_payment_apply": {
            const engine = await getEngine("receivePayment");
            result = engine.applyPayment(params.payment, params.openInvoices ?? [], params.opts ?? {});
            break;
          }
          case "customer_statement_generate": {
            const engine = await getEngine("customerStatement");
            result = engine.generate(params, params.opts ?? {});
            break;
          }
          case "finance_charge_compute": {
            const engine = await getEngine("financeChargeDunning");
            result = engine.computeFinanceCharge(params);
            break;
          }
          case "vendor_credit_create": {
            const engine = await getEngine("vendorCredit");
            result = engine.create(params);
            break;
          }
          case "bill_payment_run": {
            const engine = await getEngine("billPayment");
            result = engine.payBills(params.run, params.openBills ?? [], params.opts ?? {});
            break;
          }
          case "bank_reconcile": {
            const engine = await getEngine("bankReconciliation");
            result = engine.reconcile(params);
            break;
          }
          case "bank_feed_import": {
            const engine = await getEngine("bankFeedImport");
            result = engine.importFeed(params.raw, params.opts ?? params.options ?? {});
            break;
          }
          case "bank_deposit_record": {
            const engine = await getEngine("bankDepositTransfer");
            result = engine.recordDeposit(params);
            break;
          }
          case "chart_account_add": {
            const engine = await getEngine("chartOfAccounts");
            result = engine.addAccount(params);
            break;
          }
          case "journal_entry_memorize": {
            const engine = await getEngine("journalEntry");
            result = engine.memorize(params);
            break;
          }
          case "financial_report_sales_by_customer": {
            const engine = await getEngine("financialReportSuite");
            result = engine.salesByCustomer(params.invoices ?? []);
            break;
          }
          case "budget_create": {
            const engine = await getEngine("budget");
            result = engine.createBudget(params);
            break;
          }
          case "list_define_term": {
            const engine = await getEngine("listManagement");
            result = engine.defineTerm(params);
            break;
          }
          case "item_define": {
            const engine = await getEngine("itemMaster");
            result = engine.defineItem(params);
            break;
          }
          case "inventory_adjust_quantity": {
            const engine = await getEngine("inventoryAdjustment");
            result = engine.adjustQuantity(params);
            break;
          }
          case "payroll_compute_941": {
            const engine = await getEngine("payrollLiabilityFiling");
            result = engine.compute941(params);
            break;
          }
          // R15 wiring close-out (slot:hotel): compute940/generateW2/reconcileW2sTo941/contractor1099Totals
          // were built+tested in PayrollLiabilityFilingEngine but only compute941 was reachable via
          // prism_business. Params are passed through verbatim; the engine's WageRecord/W2/941 Zod schemas
          // are the validation gate (same pattern as payroll_compute_941 above), throwing descriptive
          // errors the dispatcher try/catch surfaces. No dispatcher-level schema — matches the 941 sibling.
          case "payroll_compute_940": {
            const engine = await getEngine("payrollLiabilityFiling");
            result = engine.compute940(params);
            break;
          }
          case "payroll_generate_w2": {
            const engine = await getEngine("payrollLiabilityFiling");
            result = engine.generateW2(params);
            break;
          }
          case "payroll_reconcile_w2_941": {
            const engine = await getEngine("payrollLiabilityFiling");
            result = engine.reconcileW2sTo941(params);
            break;
          }
          case "payroll_contractor_1099_totals": {
            const engine = await getEngine("payrollLiabilityFiling");
            result = engine.contractor1099Totals(params);
            break;
          }
          case "payroll_remit_liability": {
            const engine = await getEngine("payrollLiabilityFiling");
            // NOTE: remitLiability takes POSITIONAL args (amount, date) — unlike the 4 object-arg
            // methods above — so normalize from params here (dispatcher does param normalization,
            // not the engine). Emits balanced GL journal lines (DR Tax Payable / CR Cash).
            result = engine.remitLiability(params.amount, params.date);
            break;
          }
          case "supplier_capability_register": {
            const engine = await getEngine("supplierCapability");
            result = engine.registerSupplier(params);
            break;
          }
          case "rfq_match_score": {
            const engine = await getEngine("rfqMatchScoring");
            result = engine.scoreShortlist(params);
            break;
          }
          case "quote_explain_render": {
            const engine = await getEngine("quoteExplainPDF");
            result = engine.renderExplain(params);
            break;
          }
          case "buyer_register": {
            const engine = await getEngine("buyerAccount");
            result = engine.registerBuyer(params);
            break;
          }
          case "rfq_broadcast": {
            const engine = await getEngine("rfqBroadcast");
            result = engine.broadcastRFQ(params);
            break;
          }
          case "bid_rank": {
            const engine = await getEngine("bidCollectionRanking");
            result = engine.rankBids(params);
            break;
          }
          case "marketplace_escrow_deposit": {
            const engine = await getEngine("marketplaceLedger");
            result = engine.recordEscrowDeposit(params);
            break;
          }
          case "supplier_onboard_apply": {
            const engine = await getEngine("supplierOnboarding");
            result = engine.submitApplication(params);
            break;
          }

          // ── HOTEL: ingest charlie's VENDOR-NETWORK-MS0 vendor corpus into the ERP (2026-05-31) ──
          case "vendor_catalog_ingest": {
            const engine = await getEngine("vendorCatalog");
            result = Array.isArray(params.sources)
              ? engine.importSources(params.sources)
              : await engine.loadFromDir(params.repoRoot ?? process.cwd());
            break;
          }
          case "vendor_to_supplier_hints": {
            const engine = await getEngine("vendorCatalog");
            const ingested = Array.isArray(params.sources)
              ? engine.importSources(params.sources)
              : await engine.loadFromDir(params.repoRoot ?? process.cwd());
            result = { capabilityHints: ingested.capabilityHints, count: ingested.capabilityHints.length };
            break;
          }

          // ── HOTEL: NETPLAT Phase-2 — closed-loop supplier reputation from RFQ outcomes (2026-05-31) ──
          case "supplier_reputation": {
            const engine = await getEngine("supplierReputation");
            result = engine.reputationFor(params.outcomes ?? [], params.supplierId ?? params.supplier_id);
            break;
          }
          case "supplier_reputation_rank": {
            const engine = await getEngine("supplierReputation");
            result = engine.rankSuppliers(params.outcomes ?? []);
            break;
          }

          // ── HOTEL: NETPLAT Phase-2 — total-landed-cost routing (freight + customs) (2026-05-31) ──
          case "geo_route_cost": {
            const engine = await getEngine("geoLogistics");
            result = engine.routeCost(params);
            break;
          }
          case "geo_landed_cost": {
            const engine = await getEngine("geoLogistics");
            result = engine.landedCost(params);
            break;
          }
          case "geo_logistics_score": {
            const engine = await getEngine("geoLogistics");
            result = engine.logisticsScore(params.fromRegion, params.toRegion, params.sameMetro ?? false);
            break;
          }

          // ── HOTEL: NETPLAT Phase-2 — capacity-aware matching (projected supplier load) (2026-05-31) ──
          case "capacity_project": {
            const engine = await getEngine("scheduleCapacity");
            result = engine.project(params);
            break;
          }
          case "capacity_earliest_slot": {
            const engine = await getEngine("scheduleCapacity");
            result = engine.earliestSlot(params);
            break;
          }

          // ── HOTEL: NETPLAT capstone — blended final supplier rank (match+reputation+logistics+capacity) ──
          case "marketplace_final_rank": {
            const engine = await getEngine("marketplaceFinalRank");
            result = engine.rank(params);
            break;
          }
          // ── HOTEL: NETPLAT orchestrator — end-to-end RFQ rank (capability match + 3 Phase-2 signals → blend) ──
          case "marketplace_rank_rfq": {
            const engine = await getEngine("marketplaceMatchOrch");
            result = engine.rankRfq(params);
            break;
          }
          // ── HOTEL: NETPLAT seeding — directory-lead funnel (vendor hints → leads → onboarding bridge) ──
          case "marketplace_seed_from_hints": {
            const engine = await getEngine("marketplaceSeeding");
            result = engine.seedFromHints(params);
            break;
          }
          case "marketplace_lead_list": {
            const engine = await getEngine("marketplaceSeeding");
            result = engine.listLeads(params.filter ?? {});
            break;
          }
          case "marketplace_lead_get": {
            const engine = await getEngine("marketplaceSeeding");
            result = engine.getLead(params.supplierId);
            break;
          }
          case "marketplace_lead_contact": {
            const engine = await getEngine("marketplaceSeeding");
            result = engine.markContacted(params.supplierId, params.atISO);
            break;
          }
          case "marketplace_lead_convert": {
            const engine = await getEngine("marketplaceSeeding");
            result = engine.convertToApplication(params);
            break;
          }
          case "marketplace_lead_decline": {
            const engine = await getEngine("marketplaceSeeding");
            result = engine.declineLead(params.supplierId, params.reason, params.atISO);
            break;
          }
          case "vendor_catalog_query": {
            const engine = await getEngine("vendorCatalog");
            const ingested = Array.isArray(params.sources)
              ? engine.importSources(params.sources)
              : await engine.loadFromDir(params.repoRoot ?? process.cwd());
            result = engine.query(ingested.records, params.filter ?? {});
            break;
          }

          // ── TimeClock ──
          case "clock_in": {
            const engine = await getEngine("timeClock");
            result = engine.clockIn({
              employee_id: params.employee_id ?? params.employeeId,
              timestamp: params.timestamp,
            });
            break;
          }
          case "clock_out": {
            const engine = await getEngine("timeClock");
            result = engine.clockOut(
              params.employee_id ?? params.employeeId,
              params.timestamp,
            );
            break;
          }
          case "job_time_start": {
            const engine = await getEngine("timeClock");
            result = engine.jobStart({
              employee_id: params.employee_id ?? params.employeeId,
              job_id: params.job_id ?? params.jobId,
              operation: params.operation,
              machine_id: params.machine_id ?? params.machineId,
              timestamp: params.timestamp,
            });
            break;
          }
          case "job_time_pause": {
            const engine = await getEngine("timeClock");
            result = engine.jobPause({
              employee_id: params.employee_id ?? params.employeeId,
              job_id: params.job_id ?? params.jobId,
              reason: params.reason ?? "",
              reason_category: params.reason_category,
              timestamp: params.timestamp,
            });
            break;
          }
          case "job_time_resume": {
            const engine = await getEngine("timeClock");
            result = engine.jobResume(
              params.employee_id ?? params.employeeId,
              params.job_id ?? params.jobId,
              params.timestamp,
            );
            break;
          }
          case "job_time_stop": {
            const engine = await getEngine("timeClock");
            result = engine.jobStop({
              employee_id: params.employee_id ?? params.employeeId,
              job_id: params.job_id ?? params.jobId,
              timestamp: params.timestamp,
              notes: params.notes,
              good_parts: params.good_parts,
              scrap_count: params.scrap_count,
              scrap_reason: params.scrap_reason,
            });
            break;
          }
          case "timecard_summary": {
            const engine = await getEngine("timeClock");
            result = engine.timecardSummary(
              params.employee_id ?? params.employeeId,
              params.period ?? "current",
              params.start_date ?? params.startDate,
              params.end_date ?? params.endDate,
            );
            break;
          }
          case "attendance_report": {
            const engine = await getEngine("timeClock");
            result = engine.attendanceReport(
              params.start_date ?? params.startDate,
              params.end_date ?? params.endDate,
              params.department,
            );
            break;
          }
          case "commission_report": {
            // HOTEL quote-to-ship sales-comp leg: per-salesperson commission with margin-tiered
            // rates. Deals are sourced from params.deals (the salesperson-tagged closed-deal store
            // wire is a tracked follow-up — SalesOrderEngine carries no salesperson dimension yet).
            const engine = await getEngine("commissionReport");
            const deals = Array.isArray(params.deals) ? params.deals : [];
            const rep = engine.report(deals, Array.isArray(params.tiers) ? { tiers: params.tiers } : {});
            // hotel-soul invariant: a reconciliation gap is surfaced, never silently shipped.
            if (!rep.reconciled) {
              throw new Error(
                "[commission_report] reconciliation failed — per-rep commission/revenue totals do not match the grand totals to the cent",
              );
            }
            // CommissionTrackerPage consumes the entries array directly (via /erp/commission-report).
            result = rep.entries;
            break;
          }
          case "daily_flash_generate": {
            // HOTEL quote-to-ship owner artifact: end-of-day flash (scrap rate / OEE-by-machine /
            // labor utilization / on-time delivery / top downtime) aggregated from the REAL
            // TimeClock + OEE + Employee engines. Empty shop data → honest all-zero report.
            const engine = await getEngine("dailyFlash");
            result = engine.generateFlashReport(
              params.date ?? new Date().toISOString().slice(0, 10),
              params.requestedBy ?? "system",
            );
            break;
          }
          case "daily_flash_email": {
            const engine = await getEngine("dailyFlash");
            const report = engine.generateFlashReport(
              params.date ?? new Date().toISOString().slice(0, 10),
              params.requestedBy ?? "system",
            );
            const recipients = Array.isArray(params.recipients) ? params.recipients : [];
            // emailFlashReport returns {sent, recipient_count}; the actual transport is a
            // NotificationEngine follow-up (currently logs intent) — the result is honest about send status.
            result = await engine.emailFlashReport(report, recipients);
            break;
          }
          case "who_clocked_in": {
            const engine = await getEngine("timeClock");
            result = engine.whoClockedIn();
            break;
          }

          // ── Payroll ──
          case "payroll_create_period": {
            const engine = await getEngine("payroll");
            result = engine.createPeriod({
              start_date: params.start_date ?? params.startDate,
              end_date: params.end_date ?? params.endDate,
              pay_date: params.pay_date ?? params.payDate,
              type: params.type ?? "biweekly",
            });
            break;
          }
          case "payroll_run": {
            const engine = await getEngine("payroll");
            result = engine.runPayroll(
              params.period_id ?? params.periodId,
            );
            break;
          }
          case "payroll_pay_stub": {
            const engine = await getEngine("payroll");
            result = engine.calculatePayStub(
              params.employee_id ?? params.employeeId,
              params.period_id ?? params.periodId,
            );
            break;
          }

          // ── Invoicing ──
          case "invoice_create": {
            const engine = await getEngine("invoicing");
            result = engine.create(params);
            break;
          }
          case "invoice_from_job": {
            const engine = await getEngine("invoicing");
            result = engine.fromJobCost(params);
            break;
          }
          case "invoice_payment": {
            const engine = await getEngine("invoicing");
            result = engine.recordPayment(
              params.invoice_id ?? params.invoiceId,
              {
                amount: params.amount ?? 0,
                method: params.method ?? "check",
                reference: params.reference ?? "",
                date: params.date,
                notes: params.notes,
              },
            );
            break;
          }
          case "invoice_list": {
            const engine = await getEngine("invoicing");
            result = engine.list({
              status: params.status,
              customer_name: params.customer_name ?? params.customerName,
              job_id: params.job_id ?? params.jobId,
            });
            break;
          }
          case "invoice_aging": {
            const engine = await getEngine("invoicing");
            result = engine.agingReport();
            break;
          }

          // ── Tool Usage ──
          case "tool_inventory_add": {
            const engine = await getEngine("toolUsage");
            result = engine.addTool(params);
            break;
          }
          case "tool_start_usage": {
            const engine = await getEngine("toolUsage");
            result = engine.startUsage({
              tool_id: params.tool_id ?? params.toolId,
              job_id: params.job_id ?? params.jobId,
              operation: params.operation ?? "",
              machine_id: params.machine_id ?? params.machineId ?? "",
              employee_id: params.employee_id ?? params.employeeId,
              timestamp: params.timestamp,
            });
            break;
          }
          case "tool_end_usage": {
            const engine = await getEngine("toolUsage");
            result = engine.endUsage({
              usage_id: params.usage_id ?? params.usageId,
              cutting_minutes: params.cutting_minutes ?? params.cuttingMinutes ?? 0,
              parts_cut: params.parts_cut ?? params.partsCut ?? 0,
              wear_pct: params.wear_pct ?? params.wearPct ?? 0,
              status: params.status,
              timestamp: params.timestamp,
              notes: params.notes,
            });
            break;
          }
          case "tool_regrind": {
            const engine = await getEngine("toolUsage");
            result = engine.regrindTool(
              params.tool_id ?? params.toolId,
              params.restored_life_pct ?? params.restoredLifePct ?? 80,
            );
            break;
          }
          case "tool_job_cost": {
            const engine = await getEngine("toolUsage");
            result = engine.jobToolCost(
              params.job_id ?? params.jobId,
            );
            break;
          }
          case "tool_reorder_alerts": {
            const engine = await getEngine("toolUsage");
            result = engine.reorderAlerts();
            break;
          }

          // ── Actual Cost ──
          case "actual_cost_calculate": {
            const engine = await getEngine("actualCost");
            result = engine.calculate(params);
            break;
          }
          case "actual_cost_variance": {
            const engine = await getEngine("actualCost");
            result = engine.varianceAnalysis(
              params.job_id ?? params.jobId,
            );
            break;
          }
          case "actual_cost_profitability": {
            const engine = await getEngine("actualCost");
            result = engine.profitability(
              params.job_id ?? params.jobId,
            );
            break;
          }

          // ── Quote Estimator (physics-backed) ──
          case "quote_estimate": {
            const engine = await getEngine("quoteEstimator");
            result = engine.estimate(params);
            break;
          }
          case "quote_compare_materials": {
            const engine = await getEngine("quoteEstimator");
            result = engine.compareMaterials(params, params.materials ?? []);
            break;
          }
          case "quote_what_if": {
            const engine = await getEngine("quoteEstimator");
            result = engine.whatIf(params, params.scenarios ?? []);
            break;
          }
          case "quote_price_breaks_advanced": {
            const engine = await getEngine("quoteEstimator");
            result = engine.estimate(params).price_breaks;
            break;
          }

          // ── Instant Quote Pipeline ──
          case "instant_quote": {
            const { instantQuoteEngine } = await import("../../engines/InstantQuoteEngine.js");
            result = instantQuoteEngine.quote(params as any);
            break;
          }
          case "instant_quote_qty_breaks": {
            const { instantQuoteEngine } = await import("../../engines/InstantQuoteEngine.js");
            result = instantQuoteEngine.computeQtyBreaks(params as any);
            break;
          }
          case "instant_quote_lead_time": {
            const { instantQuoteEngine } = await import("../../engines/InstantQuoteEngine.js");
            result = instantQuoteEngine.computeLeadOptions(params as any);
            break;
          }

          // ── Quote Revisions ──
          case "quote_revise": {
            const { quoteRevisionEngine } = await import("../../engines/QuoteRevisionEngine.js");
            result = quoteRevisionEngine.revise(params as any);
            break;
          }
          case "quote_get_history": {
            const { quoteRevisionEngine } = await import("../../engines/QuoteRevisionEngine.js");
            result = quoteRevisionEngine.getHistory(params.quote_id ?? params.quoteId);
            break;
          }
          case "quote_compare_revisions": {
            const { quoteRevisionEngine } = await import("../../engines/QuoteRevisionEngine.js");
            result = quoteRevisionEngine.compareRevisions(
              params.quote_id ?? params.quoteId,
              params.revision_a ?? params.revisionA,
              params.revision_b ?? params.revisionB,
            );
            break;
          }
          case "quote_status_change": {
            const { quoteRevisionEngine } = await import("../../engines/QuoteRevisionEngine.js");
            result = quoteRevisionEngine.changeStatus({
              quote_id: params.quote_id ?? params.quoteId,
              to_status: params.to_status ?? params.toStatus,
              changed_by: params.changed_by ?? params.changedBy,
              reason: params.reason,
              metadata: params.metadata,
            });
            break;
          }
          case "quote_generate_share_token": {
            const { quoteRevisionEngine } = await import("../../engines/QuoteRevisionEngine.js");
            result = quoteRevisionEngine.generateShareToken({
              quote_id: params.quote_id ?? params.quoteId,
              expires_in_days: params.expires_in_days ?? params.expiresInDays,
              created_by: params.created_by ?? params.createdBy,
            });
            break;
          }
          case "quote_get_by_token": {
            const { quoteRevisionEngine } = await import("../../engines/QuoteRevisionEngine.js");
            result = quoteRevisionEngine.getByToken(params.token);
            break;
          }

          // ── Secondary Ops ──
          case "sec_ops_list": {
            const engine = await getEngine("secondaryOps");
            result = engine.listOperations(params.category);
            break;
          }
          case "sec_ops_quote": {
            const engine = await getEngine("secondaryOps");
            result = engine.quote({
              operation_id: params.operation_id ?? params.operationId,
              quantity: params.quantity ?? 1,
              material: params.material,
              requires_masking: params.requires_masking ?? params.requiresMasking,
              masking_areas: params.masking_areas ?? params.maskingAreas,
              rush: params.rush,
              vendor_quote_override: params.vendor_quote_override ?? params.vendorQuoteOverride,
            });
            break;
          }
          case "sec_ops_batch_quote": {
            const engine = await getEngine("secondaryOps");
            result = engine.quoteBatch(params.operations ?? []);
            break;
          }
          case "sec_ops_find_vendors": {
            const engine = await getEngine("secondaryOps");
            result = engine.findVendors(
              params.operation_id ?? params.operationId,
            );
            break;
          }
          case "sec_ops_recommend": {
            const engine = await getEngine("secondaryOps");
            result = engine.recommend(
              params.material ?? "",
              params.application ?? "",
            );
            break;
          }

          // ── Quote Analytics ──
          case "analytics_record": {
            const engine = await getEngine("quoteAnalytics");
            result = engine.recordQuote(params);
            break;
          }
          case "analytics_update_outcome": {
            const engine = await getEngine("quoteAnalytics");
            result = engine.updateOutcome(
              params.quote_id ?? params.quoteId,
              params.status,
              {
                loss_reason: params.loss_reason ?? params.lossReason,
                loss_notes: params.loss_notes ?? params.lossNotes,
                competing_price: params.competing_price ?? params.competingPrice,
              },
            );
            break;
          }
          case "analytics_record_actuals": {
            const engine = await getEngine("quoteAnalytics");
            result = engine.recordActuals(
              params.quote_id ?? params.quoteId,
              {
                cost_breakdown: params.cost_breakdown ?? params.costBreakdown,
                cycle_time_min: params.cycle_time_min ?? params.cycleTimeMin,
                lead_days: params.lead_days ?? params.leadDays,
              },
            );
            break;
          }
          case "analytics_accuracy": {
            const engine = await getEngine("quoteAnalytics");
            result = engine.accuracyMetrics(params);
            break;
          }
          case "analytics_conversion": {
            const engine = await getEngine("quoteAnalytics");
            result = engine.conversionMetrics();
            break;
          }
          case "analytics_calibration": {
            const engine = await getEngine("quoteAnalytics");
            result = engine.calibrationSuggestions();
            break;
          }

          // ── Order Manager ──
          case "order_create": {
            const engine = await getEngine("orderManager");
            result = engine.createOrder(params);
            break;
          }
          case "order_update_status": {
            const engine = await getEngine("orderManager");
            result = engine.updateOrderStatus(
              params.order_id ?? params.orderId,
              params.status,
              { notes: params.notes },
            );
            break;
          }
          case "order_list": {
            const engine = await getEngine("orderManager");
            result = engine.listOrders(params.status);
            break;
          }
          case "order_work_order_create": {
            const engine = await getEngine("orderManager");
            result = engine.createWorkOrder(params);
            break;
          }
          case "order_log_time": {
            const engine = await getEngine("orderManager");
            result = engine.logTime(
              params.wo_id ?? params.woId,
              params.minutes ?? 0,
            );
            break;
          }
          case "order_log_production": {
            const engine = await getEngine("orderManager");
            result = engine.logProduction(
              params.wo_id ?? params.woId,
              params.quantity ?? 0,
              params.scrap ?? 0,
            );
            break;
          }
          case "order_machine_queue": {
            const engine = await getEngine("orderManager");
            result = engine.machineQueue(params.machine ?? "");
            break;
          }
          case "order_metrics": {
            const engine = await getEngine("orderManager");
            result = engine.metrics();
            break;
          }

          // ── Actual Cost Enhancements ──
          case "actual_cost_forecast": {
            const engine = await getEngine("actualCost");
            result = engine.forecastToComplete(params.job_id ?? "", params.pct_complete ?? 50);
            break;
          }
          case "actual_cost_margin_alerts": {
            const engine = await getEngine("actualCost");
            result = engine.marginAlerts(params.threshold_pct ?? 10);
            break;
          }
          case "actual_cost_trend": {
            const engine = await getEngine("actualCost");
            result = engine.costTrend(params.job_ids ?? []);
            break;
          }

          // ── Purchase Orders ──
          case "po_create": {
            const engine = await getEngine("purchaseOrder");
            result = engine.createOrder({
              supplier_id: params.supplier_id ?? "",
              supplier_name: params.supplier_name ?? "",
              line_items: params.line_items ?? [],
              payment_terms: params.payment_terms,
              notes: params.notes,
              linked_jobs: params.linked_jobs,
            });
            break;
          }
          case "po_approve": {
            const engine = await getEngine("purchaseOrder");
            result = engine.approveOrder(params.po_id ?? "", params.approved_by ?? "");
            break;
          }
          case "po_receive": {
            const engine = await getEngine("purchaseOrder");
            result = engine.receiveGoods({
              po_id: params.po_id ?? "",
              received_by: params.received_by ?? "",
              line_items: params.line_items ?? [],
              packing_slip: params.packing_slip,
            });
            break;
          }
          case "po_three_way_match": {
            const engine = await getEngine("purchaseOrder");
            result = engine.threeWayMatch(
              params.po_id ?? "",
              params.invoice_total ?? 0,
              params.invoice_line_prices,
            );
            break;
          }
          case "po_list": {
            const engine = await getEngine("purchaseOrder");
            result = engine.listOrders({ status: params.status, supplier: params.supplier });
            break;
          }
          case "po_ap_aging": {
            const engine = await getEngine("purchaseOrder");
            result = engine.getAPAging();
            break;
          }
          case "po_spend_by_category": {
            const engine = await getEngine("purchaseOrder");
            result = engine.spendByCategory();
            break;
          }

          // ── General Ledger ──
          case "gl_chart_of_accounts": {
            const engine = await getEngine("generalLedger");
            result = engine.getChartOfAccounts();
            break;
          }
          case "gl_journal_entry": {
            const engine = await getEngine("generalLedger");
            result = engine.createJournalEntry({
              date: params.date ?? new Date().toISOString().slice(0, 10),
              description: params.description ?? "",
              source: params.source ?? "manual",
              reference_id: params.reference_id,
              lines: params.lines ?? [],
              auto_post: params.auto_post,
            });
            break;
          }
          case "gl_record_invoice": {
            const engine = await getEngine("generalLedger");
            result = engine.recordInvoice({
              invoice_id: params.invoice_id ?? "",
              amount: params.amount ?? 0,
              tax: params.tax ?? 0,
              date: params.date ?? new Date().toISOString().slice(0, 10),
            });
            break;
          }
          case "gl_record_payment": {
            const engine = await getEngine("generalLedger");
            result = engine.recordPayment({
              invoice_id: params.invoice_id ?? "",
              amount: params.amount ?? 0,
              date: params.date ?? new Date().toISOString().slice(0, 10),
            });
            break;
          }
          case "gl_record_purchase": {
            const engine = await getEngine("generalLedger");
            result = engine.recordPurchase({
              po_id: params.po_id ?? "",
              amount: params.amount ?? 0,
              tax: params.tax ?? 0,
              category: params.category ?? "other",
              date: params.date ?? new Date().toISOString().slice(0, 10),
            });
            break;
          }
          case "gl_record_payroll": {
            const engine = await getEngine("generalLedger");
            result = engine.recordPayroll({
              period: params.period ?? "",
              gross: params.gross ?? 0,
              taxes: params.taxes ?? 0,
              net: params.net ?? 0,
              date: params.date ?? new Date().toISOString().slice(0, 10),
            });
            break;
          }
          case "gl_trial_balance": {
            const engine = await getEngine("generalLedger");
            result = engine.getTrialBalance(params.as_of);
            break;
          }
          case "gl_income_statement": {
            const engine = await getEngine("generalLedger");
            result = engine.getIncomeStatement(
              params.period_start ?? "",
              params.period_end ?? new Date().toISOString().slice(0, 10),
            );
            break;
          }
          case "gl_balance_sheet": {
            const engine = await getEngine("generalLedger");
            result = engine.getBalanceSheet(params.as_of);
            break;
          }
          case "gl_record_wip_to_cogs": {
            const engine = await getEngine("generalLedger");
            result = engine.recordWipToCogs({
              job_id: params.job_id ?? "",
              amount: params.amount ?? 0,
              date: params.date ?? new Date().toISOString().slice(0, 10),
            });
            break;
          }

          // ── Capacity Planning ──
          case "capacity_machines": {
            const engine = await getEngine("capacityPlanning");
            result = engine.getMachines();
            break;
          }
          case "capacity_schedule_job": {
            const engine = await getEngine("capacityPlanning");
            result = engine.scheduleJob({
              job_id: params.job_id ?? "",
              operations: params.operations ?? [],
              due_date: params.due_date ?? "",
              priority: params.priority,
            });
            break;
          }
          case "capacity_machine_load": {
            const engine = await getEngine("capacityPlanning");
            result = engine.getMachineLoad(params.machine_id ?? "", params.period_weeks);
            break;
          }
          case "capacity_all_loads": {
            const engine = await getEngine("capacityPlanning");
            result = engine.getAllMachineLoads(params.period_weeks);
            break;
          }
          case "capacity_bottlenecks": {
            const engine = await getEngine("capacityPlanning");
            result = engine.findBottlenecks(params.period_weeks);
            break;
          }
          case "capacity_what_if": {
            const engine = await getEngine("capacityPlanning");
            result = engine.whatIfJob({
              operations: params.operations ?? [],
              desired_start: params.desired_start,
              desired_end: params.desired_end,
            });
            break;
          }
          case "capacity_summary": {
            const engine = await getEngine("capacityPlanning");
            result = engine.shopFloorSummary();
            break;
          }

          // ── Quality Management ──
          case "quality_spc_chart": {
            const engine = await getEngine("qualityMgmt");
            result = engine.createSPCChart({
              characteristic: params.characteristic ?? "",
              part_number: params.part_number ?? "",
              operation: params.operation ?? "",
              nominal: params.nominal ?? 0,
              usl: params.usl ?? 0,
              lsl: params.lsl ?? 0,
              data: params.data ?? [],
              subgroup_size: params.subgroup_size,
            });
            break;
          }
          case "quality_calibration_add": {
            const engine = await getEngine("qualityMgmt");
            result = engine.addCalibration({
              equipment_id: params.equipment_id ?? "",
              equipment_name: params.equipment_name ?? "",
              type: params.type ?? "other",
              serial_number: params.serial_number ?? "",
              last_calibration: params.last_calibration ?? "",
              next_calibration: params.next_calibration ?? "",
              calibrated_by: params.calibrated_by ?? "",
              certificate_number: params.certificate_number,
              accuracy: params.accuracy ?? "",
            });
            break;
          }
          case "quality_calibration_dashboard": {
            const engine = await getEngine("qualityMgmt");
            result = engine.getCalibrationDashboard();
            break;
          }
          case "quality_material_cert": {
            const engine = await getEngine("qualityMgmt");
            result = engine.addMaterialCert({
              heat_lot: params.heat_lot ?? "",
              material: params.material ?? "",
              supplier: params.supplier ?? "",
              po_number: params.po_number,
              cert_date: params.cert_date ?? "",
              properties: params.properties ?? [],
              linked_jobs: params.linked_jobs ?? [],
              document_ref: params.document_ref,
            });
            break;
          }
          case "quality_trace_heat_lot": {
            const engine = await getEngine("qualityMgmt");
            result = engine.traceByHeatLot(params.heat_lot ?? "");
            break;
          }
          case "quality_trace_job": {
            const engine = await getEngine("qualityMgmt");
            result = engine.traceByJob(params.job_id ?? "");
            break;
          }
          case "quality_ncr_create": {
            const engine = await getEngine("qualityMgmt");
            result = engine.createNCR({
              job_id: params.job_id ?? "",
              part_number: params.part_number ?? "",
              created_at: new Date().toISOString(),
              created_by: params.created_by ?? "",
              description: params.description ?? "",
              severity: params.severity ?? "minor",
              category: params.category ?? "dimensional",
              disposition: params.disposition ?? "pending",
              root_cause: params.root_cause,
              corrective_action: params.corrective_action,
              cost_impact: params.cost_impact ?? 0,
              quantity_affected: params.quantity_affected ?? 1,
            });
            break;
          }
          case "quality_ncr_update": {
            const engine = await getEngine("qualityMgmt");
            result = engine.updateNCR(params.ncr_id ?? "", {
              disposition: params.disposition,
              root_cause: params.root_cause,
              corrective_action: params.corrective_action,
              status: params.status,
            });
            break;
          }
          case "quality_ncr_dashboard": {
            const engine = await getEngine("qualityMgmt");
            result = engine.getNCRDashboard();
            break;
          }
          case "quality_fai_create": {
            const engine = await getEngine("qualityMgmt");
            result = engine.createFAI({
              job_id: params.job_id ?? "",
              part_number: params.part_number ?? "",
              revision: params.revision ?? "A",
              inspection_date: params.inspection_date ?? new Date().toISOString().slice(0, 10),
              inspector: params.inspector ?? "",
              characteristics: params.characteristics ?? [],
              notes: params.notes,
            });
            break;
          }
          case "quality_fai_list": {
            const engine = await getEngine("qualityMgmt");
            result = engine.listFAIs(params.job_id);
            break;
          }
          case "quality_kpis": {
            const engine = await getEngine("qualityMgmt");
            result = engine.qualityKPIs();
            break;
          }

          // ── Machine Rate Database ──
          case "machine_rate_lookup": {
            const engine = await getEngine("machineRateDb");
            result = engine.getRate(params.machine_id ?? params.machine_type);
            break;
          }
          case "machine_rate_list": {
            const engine = await getEngine("machineRateDb");
            result = engine.listMachines(params.family);
            break;
          }
          case "machine_rate_compare": {
            const engine = await getEngine("machineRateDb");
            result = engine.compareMachines(params.machine_ids ?? []);
            break;
          }
          case "machine_rate_effective": {
            const engine = await getEngine("machineRateDb");
            result = { machine_id: params.machine_id, oee_level: params.oee_level ?? "typical",
              effective_rate_hr: engine.getEffectiveRate(params.machine_id, params.oee_level) };
            break;
          }

          // ── Shop Configuration (Session 5-2) ──
          case "shop_config_get": {
            const { shopConfigurationEngine } = await import("../../engines/ShopConfigurationEngine.js");
            const profile = shopConfigurationEngine.getProfile(params.profile_id ?? "default");
            const warnings = shopConfigurationEngine.validateProfile(profile);
            result = { profile, warnings, stats: shopConfigurationEngine.getStats() };
            break;
          }
          case "shop_config_update": {
            const { shopConfigurationEngine } = await import("../../engines/ShopConfigurationEngine.js");
            const updates: Record<string, any> = {};
            if (params.name !== undefined) updates.name = params.name;
            if (params.overhead_pct !== undefined) updates.overhead_pct = Number(params.overhead_pct);
            if (params.material_markup_pct !== undefined) updates.material_markup_pct = Number(params.material_markup_pct);
            if (params.tooling_cost_per_op !== undefined) updates.tooling_cost_per_op = Number(params.tooling_cost_per_op);
            if (params.material_cost_per_part_default !== undefined) updates.material_cost_per_part_default = Number(params.material_cost_per_part_default);
            if (params.rates) updates.rates = params.rates;
            if (params.machines) updates.machines = params.machines;
            const updated = shopConfigurationEngine.updateProfile(params.profile_id ?? "default", updates);
            const warnings = shopConfigurationEngine.validateProfile(updated);
            result = { profile: updated, warnings };
            break;
          }
          case "shop_config_machines": {
            const { shopConfigurationEngine } = await import("../../engines/ShopConfigurationEngine.js");
            const pid = params.profile_id ?? "default";
            if (params.add) {
              result = { machines: shopConfigurationEngine.addMachine(pid, params.add) };
            } else if (params.update && params.machine_id) {
              result = { machine: shopConfigurationEngine.updateMachine(pid, params.machine_id, params.update) };
            } else if (params.remove) {
              result = { machines: shopConfigurationEngine.removeMachine(pid, params.remove) };
            } else {
              result = { machines: shopConfigurationEngine.getMachines(pid) };
            }
            break;
          }
          case "shop_config_rates": {
            const { shopConfigurationEngine } = await import("../../engines/ShopConfigurationEngine.js");
            const pid = params.profile_id ?? "default";
            if (params.update) {
              result = { rates: shopConfigurationEngine.updateRates(pid, params.update) };
            } else {
              result = {
                rates: shopConfigurationEngine.getRates(pid),
                job_costing_format: shopConfigurationEngine.toJobCostingRates(pid),
                erp_format: shopConfigurationEngine.toCostingParams(pid),
              };
            }
            break;
          }
          case "shop_config_reset": {
            const { shopConfigurationEngine } = await import("../../engines/ShopConfigurationEngine.js");
            const profile = shopConfigurationEngine.resetProfile(params.profile_id ?? "default");
            result = { profile, message: "Profile reset to factory defaults" };
            break;
          }

          // ── Blueprint → Quote Bridge ──
          case "blueprint_to_quote": {
            const engine = await getEngine("blueprintQuoteBridge");
            // bridgeFromOCR normalizes the OCR-engine BlueprintAnalysis shape before bridging.
            // Direct engine.bridge(params.analysis) silently dropped all GD&T (gdt_frames vs gdt)
            // -- type-invisible here because params is z.record(z.any()).
            result = engine.bridgeFromOCR(params.analysis ?? params, params.overrides);
            break;
          }
          case "blueprint_resolve_material": {
            const engine = await getEngine("blueprintQuoteBridge");
            result = { input: params.material, resolved: engine.resolveMaterial(params.material) };
            break;
          }

          // ── Sheet Metal Quoting ──
          case "sheet_metal_quote": {
            const engine = await getEngine("sheetMetalQuote");
            result = engine.quote(params);
            break;
          }

          // ── Additive Manufacturing Quoting ──
          case "additive_quote": {
            const engine = await getEngine("additiveQuote");
            result = engine.quote(params);
            break;
          }
          case "additive_list_materials": {
            const engine = await getEngine("additiveQuote");
            result = engine.listMaterials(params.technology);
            break;
          }
          case "additive_compare_technologies": {
            const engine = await getEngine("additiveQuote");
            result = engine.compareTechnologies(params, params.options ?? []);
            break;
          }

          // ── Injection Mold Quoting ──
          case "injection_mold_quote": {
            const engine = await getEngine("injectionMoldQuote");
            result = engine.quote(params);
            break;
          }
          case "injection_mold_materials": {
            const engine = await getEngine("injectionMoldQuote");
            result = engine.listMaterials();
            break;
          }
          case "injection_mold_dfm": {
            const engine = await getEngine("injectionMoldQuote");
            result = engine.analyzeDfm(params);
            break;
          }

          // ── Stock Size Optimizer ──
          case "stock_size_optimize": {
            const engine = await getEngine("stockSizeOptimizer");
            result = engine.optimize(params);
            break;
          }
          case "stock_size_catalog": {
            const engine = await getEngine("stockSizeOptimizer");
            result = engine.catalog(params.material ?? "");
            break;
          }
          case "stock_size_nesting": {
            const engine = await getEngine("stockSizeOptimizer");
            result = engine.nesting(params);
            break;
          }

          // ── Market Material Pricing ──
          case "material_price_lookup": {
            const engine = await getEngine("marketMaterialPricing");
            result = engine.lookup(params);
            break;
          }
          case "material_price_adjust": {
            const engine = await getEngine("marketMaterialPricing");
            result = engine.adjustIndex(
              params.index ?? "",
              params.multiplier ?? 1,
              params.as_of ?? new Date().toISOString().slice(0, 10),
              params.trend ?? "stable",
            );
            break;
          }
          case "material_price_compare": {
            const engine = await getEngine("marketMaterialPricing");
            result = engine.compare(
              params.materials ?? [],
              params.form,
              params.region,
            );
            break;
          }
          case "material_surcharge": {
            const engine = await getEngine("marketMaterialPricing");
            result = engine.surcharge(params);
            break;
          }

          // ── HR & Compliance ──
          case "hr_benefits_list": {
            const engine = await getEngine("hrCompliance");
            result = engine.listBenefitPlans();
            break;
          }
          case "hr_enroll": {
            const engine = await getEngine("hrCompliance");
            result = engine.enrollEmployee(
              params.employee_id ?? "",
              params.plan_ids ?? [],
            );
            break;
          }
          case "hr_enrollment": {
            const engine = await getEngine("hrCompliance");
            result = engine.getEnrollment(params.employee_id ?? "");
            break;
          }
          case "hr_pto_init": {
            const engine = await getEngine("hrCompliance");
            result = engine.initializePTO(
              params.employee_id ?? "",
              params.years_of_service ?? 0,
            );
            break;
          }
          case "hr_pto_request": {
            const engine = await getEngine("hrCompliance");
            result = engine.requestPTO({
              employee_id: params.employee_id ?? "",
              type: params.type ?? "vacation",
              start_date: params.start_date ?? "",
              end_date: params.end_date ?? "",
              hours: params.hours ?? 8,
              notes: params.notes,
            });
            break;
          }
          case "hr_pto_approve": {
            const engine = await getEngine("hrCompliance");
            result = engine.approvePTO(
              params.request_id ?? "",
              params.approved_by ?? "",
            );
            break;
          }
          case "hr_pto_balance": {
            const engine = await getEngine("hrCompliance");
            result = engine.getPTOBalance(params.employee_id ?? "");
            break;
          }
          case "hr_training_add": {
            const engine = await getEngine("hrCompliance");
            result = engine.addTraining({
              employee_id: params.employee_id ?? "",
              course_name: params.course_name ?? "",
              category: params.category ?? "technical",
              completed_date: params.completed_date ?? new Date().toISOString().slice(0, 10),
              expiration_date: params.expiration_date,
              instructor: params.instructor,
              score: params.score,
              certificate_id: params.certificate_id,
            });
            break;
          }
          case "hr_training_history": {
            const engine = await getEngine("hrCompliance");
            result = engine.getTrainingHistory(params.employee_id ?? "");
            break;
          }
          case "hr_training_expiring": {
            const engine = await getEngine("hrCompliance");
            result = engine.getExpiringTraining(params.within_days ?? 90);
            break;
          }
          case "hr_review_create": {
            const engine = await getEngine("hrCompliance");
            result = engine.createReview({
              employee_id: params.employee_id ?? "",
              reviewer_id: params.reviewer_id ?? "",
              review_date: params.review_date ?? new Date().toISOString().slice(0, 10),
              period: params.period ?? "",
              overall_rating: params.overall_rating ?? 3,
              categories: params.categories ?? [],
              goals: params.goals ?? [],
              compensation_change: params.compensation_change,
              notes: params.notes,
            });
            break;
          }
          case "hr_reviews": {
            const engine = await getEngine("hrCompliance");
            result = engine.getReviews(params.employee_id ?? "");
            break;
          }
          case "hr_compensation_history": {
            const engine = await getEngine("hrCompliance");
            result = engine.getCompensationHistory(params.employee_id ?? "");
            break;
          }
          case "hr_compliance_alerts": {
            const engine = await getEngine("hrCompliance");
            result = engine.complianceAlerts();
            break;
          }
          case "hr_dashboard": {
            const engine = await getEngine("hrCompliance");
            result = engine.hrDashboard();
            break;
          }

          // ── Equipment Assets (BIZ-MS5 U-BIZ37) ──
          case "asset_compute_depreciation": {
            const engine = await getEngine("equipmentAsset");
            result = {
              depreciation_amount: engine.computeDepreciation(
                params.purchase_cost,
                params.salvage_value,
                params.useful_life_years,
                params.method,
                params.months_elapsed,
              ),
            };
            break;
          }
          case "asset_register": {
            const engine = await getEngine("equipmentAsset");
            result = engine.registerAsset({
              asset_tag: params.asset_tag,
              name: params.name,
              category: params.category,
              manufacturer: params.manufacturer,
              model_number: params.model_number,
              serial_number: params.serial_number,
              location: params.location,
              purchase_date: params.purchase_date,
              purchase_cost: params.purchase_cost,
              salvage_value: params.salvage_value,
              useful_life_years: params.useful_life_years,
              depreciation_method: params.depreciation_method,
              status: params.status,
              calibration_required: params.calibration_required,
              last_calibration_date: params.last_calibration_date,
              next_calibration_date: params.next_calibration_date,
              calibration_interval_days: params.calibration_interval_days,
              notes: params.notes,
            });
            break;
          }
          case "asset_depreciation_schedule": {
            const engine = await getEngine("equipmentAsset");
            result = { schedule: engine.getDepreciationSchedule(params.asset_id) };
            break;
          }
          case "asset_list": {
            const engine = await getEngine("equipmentAsset");
            result = {
              assets: engine.listAssets({
                category: params.category,
                location: params.location,
                calibration_required: params.calibration_required,
                status: params.status,
              }),
            };
            break;
          }
          case "asset_transfer": {
            const engine = await getEngine("equipmentAsset");
            result = engine.transferAsset(params.asset_id, {
              to_location: params.to_location,
              transferred_by: params.transferred_by,
              reason: params.reason,
            });
            break;
          }
          case "asset_calibration_due": {
            const engine = await getEngine("equipmentAsset");
            result = { due: engine.getDueCalibrations(params.days_ahead) };
            break;
          }

          // ── Preventive Maintenance (OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-PM) ──
          case "pm_schedule_create": {
            const engine = await getEngine("preventiveMaintenance");
            result = {
              schedule: engine.createSchedule({
                machine_id: params.machine_id,
                machine_name: params.machine_name,
                task_name: params.task_name,
                trigger_type: params.trigger_type,
                interval_days: params.interval_days,
                interval_hours: params.interval_hours,
                last_completed_at: params.last_completed_at,
                last_completed_hours: params.last_completed_hours,
                parts_list: params.parts_list ?? [],
                estimated_duration_min: params.estimated_duration_min,
                instructions: params.instructions,
              }),
            };
            break;
          }
          case "pm_schedule_list": {
            const engine = await getEngine("preventiveMaintenance");
            result = {
              schedules: engine.listSchedules({
                machine_id: params.machine_id,
                overdue_only: params.overdue_only,
              }),
            };
            break;
          }
          case "pm_schedule_is_due": {
            const engine = await getEngine("preventiveMaintenance");
            // Look up schedule first so the helper can be called with an object, not an id.
            const schedule = engine.listSchedules().find((s: any) => s.id === params.schedule_id);
            if (!schedule) {
              result = { error: `PM schedule not found: ${params.schedule_id}` };
            } else {
              result = { is_due: engine.isScheduleDue(schedule, params.current_hours) };
            }
            break;
          }
          case "pm_work_order_generate": {
            const engine = await getEngine("preventiveMaintenance");
            result = { work_order: engine.generateWorkOrder(params.schedule_id, params.scheduled_date) };
            break;
          }
          case "pm_work_order_complete": {
            const engine = await getEngine("preventiveMaintenance");
            result = {
              work_order: engine.completeWorkOrder(params.work_order_id, {
                labor_hours: params.labor_hours,
                notes: params.notes,
                parts_used: params.parts_used,
              }),
            };
            break;
          }
          case "pm_overdue_alerts": {
            const engine = await getEngine("preventiveMaintenance");
            const hoursMap = params.current_machine_hours
              ? new Map<string, number>(Object.entries(params.current_machine_hours))
              : undefined;
            result = { alerts: engine.getOverdueAlerts(hoursMap) };
            break;
          }
          case "pm_downtime_record": {
            const engine = await getEngine("preventiveMaintenance");
            result = {
              downtime: engine.recordDowntime({
                machine_id: params.machine_id,
                type: params.type,
                started_at: params.started_at,
                ended_at: params.ended_at,
                duration_min: params.duration_min,
                work_order_id: params.work_order_id,
                cause: params.cause,
              }),
            };
            break;
          }
          case "pm_work_order_list": {
            const engine = await getEngine("preventiveMaintenance");
            result = {
              work_orders: engine.listWorkOrders({
                status: params.status,
                machine_id: params.machine_id,
                assigned_to: params.assigned_to,
              }),
            };
            break;
          }
          case "pm_work_order_assign": {
            const engine = await getEngine("preventiveMaintenance");
            result = { work_order: engine.assignWorkOrder(params.work_order_id, params.assigned_to) };
            break;
          }

          // ── Customer Management ──
          case "customer_create": {
            const engine = await getEngine("customerMgmt");
            result = engine.createCustomer({
              name: params.name ?? "",
              company: params.company ?? "",
              contact_name: params.contact_name ?? "",
              email: params.email ?? "",
              phone: params.phone ?? "",
              address: params.address ?? { street: "", city: "", state: "", zip: "" },
              credit_limit: params.credit_limit ?? 0,
              payment_terms: params.payment_terms ?? "Net 30",
              pricing_tier: params.pricing_tier ?? "standard",
              discount_pct: params.discount_pct ?? 0,
              tax_exempt: params.tax_exempt ?? false,
              tax_id: params.tax_id,
              tags: params.tags ?? [],
              notes: params.notes,
              status: params.status,
            });
            break;
          }
          case "customer_get": {
            const engine = await getEngine("customerMgmt");
            result = engine.getCustomer(params.customer_id ?? params.id ?? "");
            break;
          }
          case "customer_update": {
            const engine = await getEngine("customerMgmt");
            result = engine.updateCustomer(
              params.customer_id ?? params.id ?? "",
              params.updates ?? params,
            );
            break;
          }
          case "customer_search": {
            const engine = await getEngine("customerMgmt");
            result = engine.searchCustomers(params.query ?? params.q ?? "");
            break;
          }
          case "customer_list": {
            const engine = await getEngine("customerMgmt");
            result = engine.listCustomers({
              status: params.status,
              tier: params.tier ?? params.pricing_tier,
            });
            break;
          }
          case "customer_seed_jm_corpus": {
            // Bulk-seed the CRM from the JM Die full-corpus roster (473 customers,
            // jm-customers.jsonl). params.records (pre-parsed) takes precedence for
            // tests; otherwise read the JSONL from params.path or a repo-root default.
            const engine = await getEngine("customerMgmt");
            const provided = Array.isArray((params as any).records) ? (params as any).records : null;
            if (provided) {
              result = engine.seedFromJMCorpus(provided);
              break;
            }
            const { promises: fsp } = await import("node:fs");
            const { resolve } = await import("node:path");
            const rel = "state/shared/databases/jm-customers.jsonl";
            const candidates = (params as any).path
              ? [String((params as any).path)]
              : [resolve(process.cwd(), "..", rel), resolve(process.cwd(), rel), resolve("H:/PRISM", rel)];
            let raw: string | null = null;
            let usedPath = "";
            for (const c of candidates) {
              try { raw = await fsp.readFile(c, "utf8"); usedPath = c; break; } catch { /* try next candidate */ }
            }
            if (raw == null) {
              throw new Error(
                `customer_seed_jm_corpus: jm-customers.jsonl not found (tried ${candidates.join(", ")}); ` +
                `run scripts/jm-die-full-corpus-ingest.mjs or pass params.path`,
              );
            }
            const records = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
              .map((l) => { try { return JSON.parse(l); } catch { return null; } })
              .filter((x): x is Record<string, unknown> => x !== null);
            result = { ...engine.seedFromJMCorpus(records), source_path: usedPath };
            break;
          }
          case "customer_credit_check": {
            const engine = await getEngine("customerMgmt");
            result = engine.checkCredit(
              params.customer_id ?? "",
              params.order_amount ?? 0,
            );
            break;
          }
          case "customer_log_comm": {
            const engine = await getEngine("customerMgmt");
            result = engine.logCommunication({
              customer_id: params.customer_id ?? "",
              date: params.date ?? new Date().toISOString().slice(0, 10),
              type: params.type ?? "note",
              subject: params.subject ?? "",
              details: params.details ?? "",
              logged_by: params.logged_by ?? "",
              follow_up_date: params.follow_up_date,
              follow_up_done: params.follow_up_done,
            });
            break;
          }
          case "customer_comm_history": {
            const engine = await getEngine("customerMgmt");
            result = engine.getCommHistory(
              params.customer_id ?? "",
              params.limit,
            );
            break;
          }
          case "customer_follow_ups": {
            const engine = await getEngine("customerMgmt");
            result = engine.getPendingFollowUps();
            break;
          }
          case "customer_create_opportunity": {
            const engine = await getEngine("customerMgmt");
            result = engine.createOpportunity({
              customer_id: params.customer_id ?? "",
              description: params.description ?? "",
              estimated_value: params.estimated_value ?? 0,
              stage: params.stage ?? "prospect",
              probability_pct: params.probability_pct ?? 10,
              close_date: params.close_date,
              quote_id: params.quote_id,
            });
            break;
          }
          case "customer_update_opportunity": {
            const engine = await getEngine("customerMgmt");
            result = engine.updateOpportunity(
              params.opportunity_id ?? params.id ?? "",
              {
                stage: params.stage,
                probability_pct: params.probability_pct,
                close_date: params.close_date,
                lost_reason: params.lost_reason,
              },
            );
            break;
          }
          case "customer_pipeline": {
            const engine = await getEngine("customerMgmt");
            result = engine.salesPipeline();
            break;
          }
          case "customer_analytics": {
            const engine = await getEngine("customerMgmt");
            result = engine.customerAnalytics(params.customer_id ?? "");
            break;
          }
          case "customer_top": {
            const engine = await getEngine("customerMgmt");
            result = engine.topCustomers(params.limit ?? 10);
            break;
          }
          case "customer_revenue_concentration": {
            const engine = await getEngine("customerMgmt");
            result = engine.revenueConcentration();
            break;
          }
          case "customer_growth_trends": {
            const engine = await getEngine("customerMgmt");
            result = engine.customerTrends(params.window_days);
            break;
          }
          case "customer_normalize": {
            const engine = await getEngine("customerMgmt");
            result = engine.normalizeCustomers(params.apply === true);
            break;
          }
          case "customer_portfolio_sources": {
            const { CustomerPortfolioMinerEngine } = await import(
              "../../engines/CustomerPortfolioMinerEngine.js"
            );
            result = CustomerPortfolioMinerEngine.getSources();
            break;
          }
          case "customer_portfolio_list": {
            const { CustomerPortfolioMinerEngine } = await import(
              "../../engines/CustomerPortfolioMinerEngine.js"
            );
            result = { customers: await CustomerPortfolioMinerEngine.listCustomers() };
            break;
          }
          case "customer_portfolio_mine": {
            const { CustomerPortfolioMinerEngine } = await import(
              "../../engines/CustomerPortfolioMinerEngine.js"
            );
            result = await CustomerPortfolioMinerEngine.mineCustomer(params.customer_name);
            break;
          }
          case "customer_portfolio_harvest": {
            const { CustomerPortfolioMinerEngine } = await import(
              "../../engines/CustomerPortfolioMinerEngine.js"
            );
            result = await CustomerPortfolioMinerEngine.harvest(params.max_customers);
            break;
          }
          case "customer_portfolio_audit": {
            const { CustomerPortfolioMinerEngine } = await import(
              "../../engines/CustomerPortfolioMinerEngine.js"
            );
            result = await CustomerPortfolioMinerEngine.audit();
            break;
          }
          case "customer_portfolio_profile": {
            const { CustomerPortfolioMinerEngine } = await import(
              "../../engines/CustomerPortfolioMinerEngine.js"
            );
            result = await CustomerPortfolioMinerEngine.getCustomerProfile(params.name_query);
            break;
          }
          // ── ERP Quality — distinct from prism_business `quality_ncr_*` (ERP-sync layer). ──
          case "erp_quality_record_inspection": {
            const { ERPQualityEngine } = await import("../../engines/ERPQualityEngine.js");
            result = ERPQualityEngine.recordInspection(params.inspection);
            break;
          }
          case "erp_quality_create_ncr": {
            const { ERPQualityEngine } = await import("../../engines/ERPQualityEngine.js");
            result = ERPQualityEngine.createNCR(params.ncr);
            break;
          }
          case "erp_quality_close_ncr": {
            const { ERPQualityEngine } = await import("../../engines/ERPQualityEngine.js");
            result = ERPQualityEngine.closeNCR(
              params.ncr_id,
              params.disposition,
              params.closed_by,
              params.corrective_action,
            );
            break;
          }
          case "erp_quality_metrics": {
            const { ERPQualityEngine } = await import("../../engines/ERPQualityEngine.js");
            result = ERPQualityEngine.getQualityMetrics(params.work_order_number);
            break;
          }
          case "erp_quality_sync": {
            const { ERPQualityEngine } = await import("../../engines/ERPQualityEngine.js");
            result = ERPQualityEngine.syncToERP(params.work_order_number);
            break;
          }
          case "erp_quality_inspections_by_type": {
            const { ERPQualityEngine } = await import("../../engines/ERPQualityEngine.js");
            result = ERPQualityEngine.getInspectionsByType(
              params.work_order_number,
              params.inspection_type,
            );
            break;
          }
          case "erp_quality_open_ncrs": {
            const { ERPQualityEngine } = await import("../../engines/ERPQualityEngine.js");
            result = ERPQualityEngine.getOpenNCRs(params.work_order_number);
            break;
          }
          case "erp_quality_inspection_trend": {
            const { ERPQualityEngine } = await import("../../engines/ERPQualityEngine.js");
            result = ERPQualityEngine.getInspectionTrend(params.days);
            break;
          }

          // ── Integration / Export ──
          case "integration_export_qb": {
            const engine = await getEngine("integrationAdapter");
            result = engine.exportQuickBooksIIF(params.transactions ?? []);
            break;
          }
          case "integration_export_csv": {
            const engine = await getEngine("integrationAdapter");
            result = engine.exportCSV(params.transactions ?? []);
            break;
          }
          case "integration_export_payroll_tax": {
            const engine = await getEngine("integrationAdapter");
            result = engine.exportPayrollTaxSummary({
              period: params.period ?? "",
              employees: params.employees ?? [],
            });
            break;
          }
          case "integration_reconcile_bank": {
            const engine = await getEngine("integrationAdapter");
            result = engine.reconcileBank({
              statement_date: params.statement_date ?? "",
              bank_balance: params.bank_balance ?? 0,
              book_balance: params.book_balance ?? 0,
              deposits_in_transit: params.deposits_in_transit ?? [],
              outstanding_checks: params.outstanding_checks ?? [],
              bank_charges: params.bank_charges,
              interest_earned: params.interest_earned,
            });
            break;
          }
          case "integration_export_ar_aging": {
            const engine = await getEngine("integrationAdapter");
            result = engine.exportARAging(params.invoices ?? []);
            break;
          }
          case "integration_formats": {
            const engine = await getEngine("integrationAdapter");
            result = engine.listFormats();
            break;
          }

          // ── Batch Optimization ──────────────────────────────────
          case "batch_group": {
            const engine = await getEngine("batchOptimization");
            result = engine.group(params.jobs ?? []);
            break;
          }
          case "batch_sequence": {
            const engine = await getEngine("batchOptimization");
            result = engine.sequence(params.jobs ?? []);
            break;
          }
          case "batch_setup_matrix": {
            const engine = await getEngine("batchOptimization");
            result = engine.setupMatrix(params.jobs ?? []);
            break;
          }
          case "batch_capacity": {
            const engine = await getEngine("batchOptimization");
            result = engine.capacity(
              params.jobs ?? [],
              params.available_hours_per_day ?? 8,
              params.horizon_days ?? 5,
            );
            break;
          }

          // ── Learning Path ──────────────────────────────────────
          case "learning_assess": {
            const engine = await getEngine("learningPath");
            result = engine.assess(
              params.operator_id ?? "OP-001",
              params.current_skills ?? {},
              params.target_role ?? "cnc_operator",
            );
            break;
          }
          case "learning_plan": {
            const engine = await getEngine("learningPath");
            const assessment = engine.assess(
              params.operator_id ?? "OP-001",
              params.current_skills ?? {},
              params.target_role ?? "cnc_operator",
            );
            result = engine.plan(params.operator_id ?? "OP-001", assessment, params.target_role ?? "cnc_operator");
            break;
          }
          case "learning_progress": {
            const engine = await getEngine("learningPath");
            const assessment = engine.assess(
              params.operator_id ?? "OP-001",
              params.current_skills ?? {},
              params.target_role ?? "cnc_operator",
            );
            const plan = engine.plan(params.operator_id ?? "OP-001", assessment, params.target_role ?? "cnc_operator");
            result = engine.progress(params.operator_id ?? "OP-001", plan, params.completed_module_ids ?? []);
            break;
          }
          case "learning_recommend": {
            const engine = await getEngine("learningPath");
            result = engine.recommend(params.current_skills ?? {});
            break;
          }

          // ── Casting Quoting ──
          case "casting_quote": {
            const engine = await getEngine("castingQuote");
            result = engine.quote({
              process: params.process ?? "die_cast",
              material: params.material ?? "aluminum_a380",
              part_volume_cm3: params.part_volume_cm3 ?? 50,
              bounding_box_cm3: params.bounding_box_cm3,
              quantity: params.quantity ?? 1000,
              annual_volume: params.annual_volume,
              num_cores: params.num_cores,
              num_slides: params.num_slides,
              surface_finish: params.surface_finish,
              secondary_machining: params.secondary_machining,
              xray_inspection: params.xray_inspection,
              heat_treat: params.heat_treat,
              tight_tolerance: params.tight_tolerance,
              markup_pct: params.markup_pct,
            });
            break;
          }
          case "casting_materials": {
            const engine = await getEngine("castingQuote");
            result = engine.listMaterials();
            break;
          }
          case "casting_compare_processes": {
            const engine = await getEngine("castingQuote");
            result = engine.compareProcesses({
              material: params.material ?? "aluminum_a356",
              part_volume_cm3: params.part_volume_cm3 ?? 50,
              quantity: params.quantity ?? 1000,
            });
            break;
          }
          case "casting_dfm": {
            const engine = await getEngine("castingQuote");
            result = engine.analyzeDfm({
              process: params.process ?? "die_cast",
              material: params.material ?? "aluminum_a380",
              wall_thickness_mm: params.wall_thickness_mm ?? 2.0,
              draft_angle_deg: params.draft_angle_deg,
              undercuts: params.undercuts,
              max_section_mm: params.max_section_mm,
              cores: params.cores,
            });
            break;
          }

          // ── Weld/Fabrication Quoting ──
          case "weld_fab_quote": {
            const engine = await getEngine("weldFabQuote");
            result = engine.quote({
              joints: params.joints ?? [{ type: "fillet", length_mm: 200, thickness_mm: 6 }],
              process: params.process,
              material: params.material ?? "steel",
              filler_density_kg_m3: params.filler_density_kg_m3,
              nde_method: params.nde_method,
              nde_coverage_pct: params.nde_coverage_pct,
              stress_relief: params.stress_relief,
              hot_dip_galvanize: params.hot_dip_galvanize,
              blast_and_paint: params.blast_and_paint,
              quantity: params.quantity,
              fit_up_hours: params.fit_up_hours,
              markup_pct: params.markup_pct,
            });
            break;
          }
          case "weld_fab_joint_cost": {
            const engine = await getEngine("weldFabQuote");
            result = engine.jointCost({
              type: params.type ?? "fillet",
              length_mm: params.length_mm ?? 200,
              thickness_mm: params.thickness_mm ?? 6,
              process: params.process,
              position: params.position,
            });
            break;
          }
          case "weld_fab_consumables": {
            const engine = await getEngine("weldFabQuote");
            result = engine.consumables({
              joints: params.joints ?? [{ type: "fillet", length_mm: 200, thickness_mm: 6 }],
              process: params.process,
            });
            break;
          }

          // ── Multi-Process Quoting ──
          case "multi_process_quote": {
            const engine = await getEngine("multiProcessQuote");
            result = engine.quote({
              project_name: params.project_name,
              part_name: params.part_name,
              steps: params.steps ?? [],
              quantity: params.quantity ?? 1,
              markup_pct: params.markup_pct,
              rush: params.rush,
              shipping_cost: params.shipping_cost,
              packaging_cost_per_unit: params.packaging_cost_per_unit,
              engineering_hours: params.engineering_hours,
              engineering_rate_hr: params.engineering_rate_hr,
            });
            break;
          }
          case "multi_process_estimate": {
            const engine = await getEngine("multiProcessQuote");
            result = engine.estimate({
              steps: params.steps ?? [],
              quantity: params.quantity ?? 1,
              markup_pct: params.markup_pct,
            });
            break;
          }

          // ── Shift Schedule Optimizer ──
          case "schedule_optimize": {
            const engine = await getEngine("shiftScheduleOptimizer");
            result = engine.optimizeSchedule(params);
            break;
          }
          case "schedule_balance": {
            const engine = await getEngine("shiftScheduleOptimizer");
            result = engine.balanceLoad(params);
            break;
          }
          case "schedule_what_if": {
            const engine = await getEngine("shiftScheduleOptimizer");
            result = engine.whatIfAddMachine(params);
            break;
          }

          // ── Advanced Report Renderer ──
          case "report_tool_life_forecast": {
            const engine = await getEngine("advancedReportRenderer");
            result = engine.generateToolLifeForecast(params);
            break;
          }
          case "report_capability_study": {
            const engine = await getEngine("advancedReportRenderer");
            result = engine.generateCapabilityStudy(params);
            break;
          }
          case "report_stability_map": {
            const engine = await getEngine("advancedReportRenderer");
            result = engine.generateStabilityMap(params);
            break;
          }
          case "report_cost_sensitivity": {
            const engine = await getEngine("advancedReportRenderer");
            result = engine.generateCostSensitivity(params);
            break;
          }
          case "report_cycle_time_variance": {
            const engine = await getEngine("advancedReportRenderer");
            result = engine.generateCycleTimeVariance(params);
            break;
          }
          case "report_scrap": {
            const engine = await getEngine("advancedReportRenderer");
            result = engine.generateScrapReport(params);
            break;
          }

          
        // ═══ ROI PROOF (VAL-MS0) ═══
        case "roi_log":
        case "roi_log_outcome":
        case "roi_summary":
        case "roi_report":
        case "roi_reset":
        case "roi_configure_costs":
        case "roi_events":
        case "roi_trend": {
          // Direct import — engines/index.ts no longer re-exports this singleton
          // (it remains in the backup index.ts-1 file). Import the source directly.
          const { costSavingsTrackerEngine } = await import(
            "../../engines/CostSavingsTrackerEngine.js"
          );
          result = costSavingsTrackerEngine.calculate(action, params);
          break;
        }
        // ═══ PROGRAMMER PRODUCTIVITY ═══
        case "productivity_log": {
          const eng = await getEngine(
            "programmerProductivity"
          );
          result = eng.log(params);
          break;
        }
        case "productivity_summary": {
          const eng = await getEngine(
            "programmerProductivity"
          );
          result = eng.summary(params);
          break;
        }
        case "productivity_achievements": {
          const eng = await getEngine(
            "programmerProductivity"
          );
          result = eng.achievements(params);
          break;
        }
        case "productivity_digest": {
          const eng = await getEngine(
            "programmerProductivity"
          );
          result = eng.digest(params);
          break;
        }
        case "productivity_compare": {
          const eng = await getEngine(
            "programmerProductivity"
          );
          result = eng.compare(params);
          break;
        }

        // ═══ WHITE LABEL CONFIG (VAL-MS3) ═══
        case "brand_configure":
        case "brand_status":
        case "brand_reset":
        case "brand_fleet":
        case "brand_tools":
        case "brand_tips": {
          const wl = await getEngine("whiteLabelConfig");
          result = wl.calculate(action, params);
          break;
        }

        // ── SaaS API (VAL-MS5) ──
        case "api_route_map":
        case "api_usage":
        case "api_rate_check":
        case "api_webhook_register":
        case "api_webhook_list":
        case "api_health": {
          const saas = await getEngine("saasAPI");
          result = saas.calculate(action, params);
          break;
        }

        // ── Quote-to-Ship Pipeline (0-D-7a: E1086 orphan wiring) ──
        case "quote_to_ship_run": {
          const { quoteToShipOrchestratorEngine } = await import("../../engines/QuoteToShipOrchestratorEngine.js");
          result = await quoteToShipOrchestratorEngine.runFullPipeline(params as any);
          break;
        }
        case "quote_to_ship_validate": {
          const { quoteToShipOrchestratorEngine: qtsVal } = await import("../../engines/QuoteToShipOrchestratorEngine.js");
          result = qtsVal.validateInput(params as any);
          break;
        }
        case "quote_to_ship_status": {
          const { quoteToShipOrchestratorEngine: qtsStat } = await import("../../engines/QuoteToShipOrchestratorEngine.js");
          result = qtsStat.getStageDescriptors();
          break;
        }

        // ── Approval Workflows (Session 6-6) ──
          case "workflow_configure": {
            const { approvalWorkflowEngine } = await import("../../engines/ApprovalWorkflowEngine.js");
            result = approvalWorkflowEngine.configureWorkflow(params as any);
            break;
          }
          case "workflow_submit": {
            const { approvalWorkflowEngine } = await import("../../engines/ApprovalWorkflowEngine.js");
            result = await approvalWorkflowEngine.submit(params as any);
            break;
          }
          case "workflow_decide": {
            const { approvalWorkflowEngine } = await import("../../engines/ApprovalWorkflowEngine.js");
            result = await approvalWorkflowEngine.decide(params as any);
            break;
          }
          case "workflow_pending": {
            const { approvalWorkflowEngine } = await import("../../engines/ApprovalWorkflowEngine.js");
            result = approvalWorkflowEngine.getPending(params as any);
            break;
          }
          case "approval_workflow_status": {
            const { approvalWorkflowEngine } = await import("../../engines/ApprovalWorkflowEngine.js");
            result = approvalWorkflowEngine.getStatus((params as any).instance_id);
            break;
          }
          case "workflow_cancel": {
            const { approvalWorkflowEngine } = await import("../../engines/ApprovalWorkflowEngine.js");
            const p = params as any;
            result = await approvalWorkflowEngine.cancel(p.instance_id, p.cancelled_by, p.reason);
            break;
          }
          case "approval_workflow_list": {
            const { approvalWorkflowEngine } = await import("../../engines/ApprovalWorkflowEngine.js");
            result = approvalWorkflowEngine.listWorkflows((params as any).entity_type);
            break;
          }
          case "workflow_stats": {
            const { approvalWorkflowEngine } = await import("../../engines/ApprovalWorkflowEngine.js");
            result = approvalWorkflowEngine.getStats();
            break;
          }
          case "workflow_requires_approval": {
            const { approvalWorkflowEngine } = await import("../../engines/ApprovalWorkflowEngine.js");
            const p = params as any;
            result = approvalWorkflowEngine.requiresApproval(p.entity_type, p.amount);
            break;
          }
          case "workflow_entity_history": {
            const { approvalWorkflowEngine } = await import("../../engines/ApprovalWorkflowEngine.js");
            const p = params as any;
            result = approvalWorkflowEngine.getEntityHistory(p.entity_type, p.entity_id);
            break;
          }

          // ── Record Timeline & Comments (Session 6-6) ──
          case "timeline_get": {
            const { recordTimelineEngine } = await import("../../engines/RecordTimelineEngine.js");
            result = recordTimelineEngine.getTimeline(params as any);
            break;
          }
          case "timeline_add": {
            const { recordTimelineEngine } = await import("../../engines/RecordTimelineEngine.js");
            result = recordTimelineEngine.addEntry(params as any);
            break;
          }
          case "comment_create": {
            const { recordTimelineEngine } = await import("../../engines/RecordTimelineEngine.js");
            result = recordTimelineEngine.createComment(params as any);
            break;
          }
          case "comment_list": {
            const { recordTimelineEngine } = await import("../../engines/RecordTimelineEngine.js");
            const p = params as any;
            result = recordTimelineEngine.listComments(p.entity_type, p.entity_id, p.include_internal);
            break;
          }
          case "comment_edit": {
            const { recordTimelineEngine } = await import("../../engines/RecordTimelineEngine.js");
            const p = params as any;
            result = recordTimelineEngine.editComment(p.comment_id, p.body, p.editor_name);
            break;
          }
          case "comment_delete": {
            const { recordTimelineEngine } = await import("../../engines/RecordTimelineEngine.js");
            const p = params as any;
            result = recordTimelineEngine.deleteComment(p.comment_id, p.deleted_by);
            break;
          }

        // ── Job Traveler (Session 6-7) ──
          case "traveler_create": {
            const { jobTravelerEngine } = await import("../../engines/JobTravelerEngine.js");
            result = jobTravelerEngine.createTraveler(params as any);
            break;
          }
          case "traveler_start_setup": {
            const { jobTravelerEngine } = await import("../../engines/JobTravelerEngine.js");
            result = jobTravelerEngine.startSetup(params as any);
            break;
          }
          case "traveler_start_cycle": {
            const { jobTravelerEngine } = await import("../../engines/JobTravelerEngine.js");
            result = jobTravelerEngine.startCycle(params as any);
            break;
          }
          case "traveler_complete_step": {
            const { jobTravelerEngine } = await import("../../engines/JobTravelerEngine.js");
            result = await jobTravelerEngine.completeStep(params as any);
            break;
          }
          case "traveler_get_active": {
            const { jobTravelerEngine } = await import("../../engines/JobTravelerEngine.js");
            result = jobTravelerEngine.getActiveTravelers();
            break;
          }
          case "traveler_get": {
            const { jobTravelerEngine } = await import("../../engines/JobTravelerEngine.js");
            result = jobTravelerEngine.getTraveler((params as any).job_id);
            break;
          }
          case "traveler_scan": {
            const { jobTravelerEngine } = await import("../../engines/JobTravelerEngine.js");
            result = jobTravelerEngine.scan((params as any).code);
            break;
          }

          // ── Machine Dispatch (Session 6-7) ──
          case "dispatch_queue_job": {
            const { machineDispatchEngine } = await import("../../engines/MachineDispatchEngine.js");
            result = machineDispatchEngine.queueJob(params as any);
            break;
          }
          case "dispatch_get_queue": {
            const { machineDispatchEngine } = await import("../../engines/MachineDispatchEngine.js");
            result = machineDispatchEngine.getQueue((params as any).machine_id);
            break;
          }
          case "dispatch_reorder": {
            const { machineDispatchEngine } = await import("../../engines/MachineDispatchEngine.js");
            result = machineDispatchEngine.reorder(params as any);
            break;
          }
          case "dispatch_get_all_queues": {
            const { machineDispatchEngine } = await import("../../engines/MachineDispatchEngine.js");
            result = machineDispatchEngine.getAllQueues();
            break;
          }
          case "dispatch_what_if": {
            const { machineDispatchEngine } = await import("../../engines/MachineDispatchEngine.js");
            result = machineDispatchEngine.whatIf(params as any);
            break;
          }
          case "dispatch_remove": {
            const { machineDispatchEngine } = await import("../../engines/MachineDispatchEngine.js");
            const p = params as any;
            result = machineDispatchEngine.remove(p.entry_id ?? p.entryId, p.removed_by ?? p.removedBy ?? "system");
            break;
          }

          // ── Milestone Tracking (Session 6-9) ──────────────────────────
          case "milestone_create_timeline": {
            if (!_milestoneTracking) _milestoneTracking = await import("../../engines/MilestoneTrackingEngine.js");
            const p = params as any;
            result = _milestoneTracking.milestoneTrackingEngine.createTimeline(p);
            break;
          }
          case "milestone_get_timeline": {
            if (!_milestoneTracking) _milestoneTracking = await import("../../engines/MilestoneTrackingEngine.js");
            const p = params as any;
            result = _milestoneTracking.milestoneTrackingEngine.getTimeline(p.job_id);
            break;
          }
          case "milestone_advance": {
            if (!_milestoneTracking) _milestoneTracking = await import("../../engines/MilestoneTrackingEngine.js");
            const p = params as any;
            result = _milestoneTracking.milestoneTrackingEngine.advanceMilestone(p);
            break;
          }
          case "milestone_skip": {
            if (!_milestoneTracking) _milestoneTracking = await import("../../engines/MilestoneTrackingEngine.js");
            const p = params as any;
            result = _milestoneTracking.milestoneTrackingEngine.skipMilestone(p);
            break;
          }
          case "milestone_on_job_status": {
            if (!_milestoneTracking) _milestoneTracking = await import("../../engines/MilestoneTrackingEngine.js");
            const p = params as any;
            result = _milestoneTracking.milestoneTrackingEngine.onJobStatusChange(p.job_id, p.new_status);
            break;
          }
          case "milestone_events": {
            if (!_milestoneTracking) _milestoneTracking = await import("../../engines/MilestoneTrackingEngine.js");
            const p = params as any;
            result = _milestoneTracking.milestoneTrackingEngine.getEvents(p.job_id, p.limit);
            break;
          }
          case "milestone_list_jobs": {
            if (!_milestoneTracking) _milestoneTracking = await import("../../engines/MilestoneTrackingEngine.js");
            result = _milestoneTracking.milestoneTrackingEngine.listTrackedJobs();
            break;
          }
          case "milestone_delete": {
            if (!_milestoneTracking) _milestoneTracking = await import("../../engines/MilestoneTrackingEngine.js");
            const p = params as any;
            result = _milestoneTracking.milestoneTrackingEngine.deleteTimeline(p.job_id);
            break;
          }

          // ── Customer Portal (Session 6-9) ─────────────────────────────
          case "portal_create_token": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.createToken(p);
            break;
          }
          case "portal_revoke_token": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.revokeToken(p.token);
            break;
          }
          case "portal_list_tokens": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.listTokens(p.entity_id);
            break;
          }
          case "portal_validate_token": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.validateToken(p.token, p.required_scope);
            break;
          }
          case "portal_quote_view": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.getQuoteView(p);
            break;
          }
          case "portal_quote_respond": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.respondToQuote(p);
            break;
          }
          case "portal_order_status": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.getOrderStatus(p);
            break;
          }
          case "portal_add_quality_doc": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.addQualityDocument(p);
            break;
          }
          case "portal_update_quality_doc": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.updateQualityDocument(p);
            break;
          }
          case "portal_list_quality_docs": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.listQualityDocuments(p.job_id, p.portal_mode);
            break;
          }
          case "portal_get_quality_doc": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.getQualityDocument(p.job_id, p.doc_id);
            break;
          }
          case "portal_send_message": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.addMessage(p);
            break;
          }
          case "portal_list_messages": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.listMessages(p.entity_type, p.entity_id, p.limit);
            break;
          }
          case "portal_mark_read": {
            if (!_customerPortal) _customerPortal = await import("../../engines/CustomerPortalEngine.js");
            const p = params as any;
            result = _customerPortal.customerPortalEngine.markMessagesRead(p.entity_type, p.entity_id, p.sender_type);
            break;
          }

          // ── Job Profitability Waterfall ──
          case "profitability_analyze": {
            const eng = await getEngine("jobProfitabilityWaterfall");
            result = eng.analyzeJob(params);
            break;
          }
          case "profitability_compare": {
            const eng = await getEngine("jobProfitabilityWaterfall");
            result = eng.compareJobs(params);
            break;
          }
          case "profitability_sensitivity": {
            const eng = await getEngine("jobProfitabilityWaterfall");
            result = eng.sensitivityAnalysis(params);
            break;
          }

          // ── Quote Generation (QuoteEngine) ──
          case "quote_generate": {
            const eng = await getEngine("quoteEngine");
            result = eng.generate(params);
            break;
          }
          case "quote_quantity_breaks": {
            const eng = await getEngine("quoteEngine");
            const p = params as any;
            result = eng.quantityBreaks(p, p.quantities ?? [1, 10, 50, 100, 500]);
            break;
          }
          case "quote_margin_analysis": {
            const eng = await getEngine("quoteEngine");
            result = eng.marginAnalysis(params);
            break;
          }

          // ── Tool Inventory Orchestrator ──
          case "tool_inv_check_availability": {
            const eng = await getEngine("toolInventoryOrchestrator");
            result = eng.checkAvailability({
              operations: params.operations ?? [],
              on_hand_tools: params.on_hand_tools ?? params.onHandTools,
            });
            break;
          }
          case "tool_inv_suggest_substitutes": {
            const eng = await getEngine("toolInventoryOrchestrator");
            result = eng.suggestSubstitutes({
              required_diameter: params.required_diameter ?? params.requiredDiameter ?? params.diameter ?? 10,
              required_type: params.required_type ?? params.requiredType ?? params.type ?? "endmill",
              material: params.material ?? "P",
              on_hand_tools: params.on_hand_tools ?? params.onHandTools,
              max_results: params.max_results ?? params.maxResults,
            });
            break;
          }
          case "tool_inv_reorder_list": {
            const eng = await getEngine("toolInventoryOrchestrator");
            result = eng.getReorderList({
              on_hand_tools: params.on_hand_tools ?? params.onHandTools,
              min_stock_level: params.min_stock_level ?? params.minStockLevel,
              upcoming_jobs: params.upcoming_jobs ?? params.upcomingJobs,
            });
            break;
          }
          case "tool_inv_optimize_crib": {
            const eng = await getEngine("toolInventoryOrchestrator");
            result = eng.optimizeToolCrib({
              usage_history: params.usage_history ?? params.usageHistory ?? [],
              on_hand_tools: params.on_hand_tools ?? params.onHandTools,
              max_tools: params.max_tools ?? params.maxTools,
              idle_days_threshold: params.idle_days_threshold ?? params.idleDaysThreshold,
            });
            break;
          }

          // ── Quoting Formulas (SQ4-1-QUOTE) ──
          case "quote_abc_cost": {
            const { quotingFormulaEngine: qfe } = await import("../../engines/QuotingFormulaEngine.js");
            result = qfe.activityBasedCost(params as any);
            break;
          }
          case "quote_learning_curve": {
            const { quotingFormulaEngine: qfe } = await import("../../engines/QuotingFormulaEngine.js");
            result = qfe.learningCurve(params as any);
            break;
          }
          case "quote_eoq": {
            const { quotingFormulaEngine: qfe } = await import("../../engines/QuotingFormulaEngine.js");
            result = qfe.economicBatchSize(params as any);
            break;
          }
          case "quote_calibrate": {
            const { quotingFormulaEngine: qfe } = await import("../../engines/QuotingFormulaEngine.js");
            result = qfe.calibrateQuote(params as any);
            break;
          }
          case "quote_setup_complexity": {
            const { quotingFormulaEngine: qfe } = await import("../../engines/QuotingFormulaEngine.js");
            result = qfe.setupComplexity(params as any);
            break;
          }
          case "quote_scrap_reserve": {
            const { quotingFormulaEngine: qfe } = await import("../../engines/QuotingFormulaEngine.js");
            result = qfe.scrapReserve(params as any);
            break;
          }

          // ── Accounting Hardening (SQ4-3-ACCT) ──
          case "acct_bank_reconcile": {
            const { accountingHardeningEngine: ahe } = await import("../../engines/AccountingHardeningEngine.js");
            result = ahe.bankReconciliation(params as any);
            break;
          }
          case "acct_wip_valuation": {
            const { accountingHardeningEngine: ahe2 } = await import("../../engines/AccountingHardeningEngine.js");
            result = ahe2.wipValuation(params as any);
            break;
          }
          case "acct_variance_analysis": {
            const { accountingHardeningEngine: ahe3 } = await import("../../engines/AccountingHardeningEngine.js");
            result = ahe3.varianceAnalysis(params as any);
            break;
          }
          case "acct_cost_to_complete": {
            const { accountingHardeningEngine: ahe4 } = await import("../../engines/AccountingHardeningEngine.js");
            result = ahe4.costToComplete(params as any);
            break;
          }
          case "acct_multi_period_compare": {
            const { accountingHardeningEngine: ahe5 } = await import("../../engines/AccountingHardeningEngine.js");
            result = ahe5.multiPeriodCompare(params as any);
            break;
          }
          case "acct_quickbooks_sync": {
            const { accountingHardeningEngine: ahe6 } = await import("../../engines/AccountingHardeningEngine.js");
            result = ahe6.quickbooksSync(params as any);
            break;
          }

          // ── OEE Calculator ──
          case "oee_calculate": {
            const { oeeCalculatorEngine } = await import("../../engines/OEECalculatorEngine.js");
            result = oeeCalculatorEngine.calculate(params as any);
            break;
          }

          // ── Coolant Cost Optimization ──
          case "coolant_cost_compare": {
            const { coolantCostOptimizationEngine } = await import("../../engines/CoolantCostOptimizationEngine.js");
            result = coolantCostOptimizationEngine.compareCoolantCosts(params as any, params as any, params.annual_volume as any);
            break;
          }
          case "coolant_cost_optimal": {
            const { coolantCostOptimizationEngine } = await import("../../engines/CoolantCostOptimizationEngine.js");
            result = coolantCostOptimizationEngine.optimalCoolant(params as any);
            break;
          }
          case "coolant_cost_lifecycle": {
            const { coolantCostOptimizationEngine } = await import("../../engines/CoolantCostOptimizationEngine.js");
            result = coolantCostOptimizationEngine.getLifecycleCost(
              (params.coolant_type ?? params.coolantType) as any,
              Number(params.annual_hours ?? params.annualHours ?? 2000),
            );
            break;
          }

          // ── Setup Cost Optimization ──
          case "setup_cost_calculate": {
            const { setupCostOptimizationEngine } = await import("../../engines/SetupCostOptimizationEngine.js");
            result = setupCostOptimizationEngine.estimateSetupTime(
              (params.complexity ?? "moderate") as any,
              params.modifiers as any,
            );
            break;
          }
          case "setup_cost_optimize": {
            const { setupCostOptimizationEngine } = await import("../../engines/SetupCostOptimizationEngine.js");
            result = setupCostOptimizationEngine.optimizeSetupCost(params as any);
            break;
          }

          // ── Cost Savings Tracker ──
          case "savings_record": {
            const { costSavingsTrackerEngine } = await import("../../engines/CostSavingsTrackerEngine.js");
            result = costSavingsTrackerEngine.calculate("roi_log", params);
            break;
          }
          case "savings_trend": {
            const { costSavingsTrackerEngine } = await import("../../engines/CostSavingsTrackerEngine.js");
            result = costSavingsTrackerEngine.calculate("roi_trend", params);
            break;
          }
          case "savings_dashboard": {
            const { costSavingsTrackerEngine } = await import("../../engines/CostSavingsTrackerEngine.js");
            result = costSavingsTrackerEngine.calculate("roi_summary", params);
            break;
          }
          case "savings_roi": {
            const { costSavingsTrackerEngine } = await import("../../engines/CostSavingsTrackerEngine.js");
            result = costSavingsTrackerEngine.calculate("roi_report", params);
            break;
          }

          // ── Cost-Aware Router ──
          case "cost_aware_route": {
            const { costAwareRouterEngine } = await import("../../engines/CostAwareRouterEngine.js");
            result = costAwareRouterEngine.route(
              (params.intent ?? params.query_intent ?? "search-content") as any,
              params.context as any ?? {},
            );
            break;
          }

          // ── ROI Advisor ──
          case "roi_advisor_analyze": {
            const { roiAdvisorEngine } = await import("../../engines/ROIAdvisorEngine.js");
            result = roiAdvisorEngine.analyze(
              params.current as any,
              params.optimal as any,
              Number(params.annual_volume ?? params.annualVolume ?? 1000),
              Number(params.current_cycle_time_min ?? params.currentCycleTimeMin ?? 5),
              Number(params.current_cost_per_part ?? params.currentCostPerPart ?? 10),
            );
            break;
          }

          // ── Tool Cost Predictor ──
          case "tool_cost_predict": {
            const { toolCostPredictorEngine } = await import("../../engines/ToolCostPredictorEngine.js");
            result = toolCostPredictorEngine.predict(
              String(params.tool ?? "Read"),
              (params.params ?? params.tool_params ?? {}) as any,
            );
            break;
          }

          // ── Tool Cost Per Part ──
          case "tool_cost_per_part": {
            const { toolCostPerPartEngine } = await import("../../engines/ToolCostPerPartEngine.js");
            result = toolCostPerPartEngine.calculate(params as any);
            break;
          }

          // ── Tool ROI ──
          case "tool_roi_analyze":
          case "tool_roi_compare": {
            const { toolROIEngine } = await import("../../engines/ToolROIEngine.js");
            result = toolROIEngine.calculate(params as any);
            break;
          }

          // ── Inventory EOQ (Advanced) ──
          case "inventory_eoq_advanced": {
            const { inventoryEOQEngine } = await import("../../engines/InventoryEOQEngine.js");
            result = inventoryEOQEngine.calculate(params as any);
            break;
          }

          // ── Inventory-Aware Tool Selector ──
          case "inventory_tool_select": {
            const { inventoryAwareToolSelectorEngine } = await import("../../engines/InventoryAwareToolSelectorEngine.js");
            result = inventoryAwareToolSelectorEngine.select(
              (params.features ?? []) as any,
              (params.inventory ?? params.tools ?? []) as any,
            );
            break;
          }

          // ── Import Cost ──
          case "import_cost_calculate": {
            const { importCostEngine } = await import("../../engines/ImportCostEngine.js");
            result = importCostEngine.analyzeDirectory(
              params.dir as any,
              Number(params.max_depth ?? params.maxDepth ?? 0),
            );
            break;
          }

          // ── Accounting Hardening (additional) ──
          case "accounting_validate": {
            const { accountingHardeningEngine: aheVal } = await import("../../engines/AccountingHardeningEngine.js");
            result = aheVal.varianceAnalysis(params as any);
            break;
          }
          case "accounting_audit": {
            const { accountingHardeningEngine: aheAudit } = await import("../../engines/AccountingHardeningEngine.js");
            result = aheAudit.bankReconciliation(params as any);
            break;
          }

          // ── Lathe Auto-Quote From Print (U-LTH48) ──
          case "lathe_auto_quote_from_print": {
            const engine = await getEngine("latheAutoQuoteFromPrint");
            result = engine.generateQuote(params as any);
            break;
          }
          case "lathe_auto_quote_reconcile": {
            const engine = await getEngine("latheAutoQuoteFromPrint");
            result = engine.reconcileAgainstActual(params.quote, params.actual_cost_usd);
            break;
          }

          // ── Lathe Actual Cost Reconciliation (U-LTH49) ──
          case "lathe_actual_cost_reconcile": {
            const engine = await getEngine("latheReconciliation");
            result = engine.reconcile(params as any);
            break;
          }
          case "lathe_actual_cost_accuracy": {
            const engine = await getEngine("latheReconciliation");
            result = engine.getAccuracyStats(params.customer, params.material_iso_group);
            break;
          }

          // ── Lathe Job Scheduling (U-LTH50) ──
          case "lathe_job_schedule": {
            const engine = await getEngine("latheScheduler");
            result = engine.schedule(params as any);
            break;
          }
          case "lathe_job_from_quote": {
            const engine = await getEngine("latheScheduler");
            result = engine.jobFromQuote(params.quote, params.extras);
            break;
          }

          // ── Lathe Order Lifecycle (U-LTH51) ──
          case "lathe_order_create": {
            const engine = await getEngine("latheOrderLifecycle");
            result = engine.createOrder(params as any);
            break;
          }
          case "lathe_order_transition": {
            const engine = await getEngine("latheOrderLifecycle");
            result = engine.transition(params as any);
            break;
          }
          case "lathe_order_get": {
            const engine = await getEngine("latheOrderLifecycle");
            result = engine.getOrder(params.order_id);
            break;
          }
          case "lathe_order_list": {
            const engine = await getEngine("latheOrderLifecycle");
            result = engine.listOrders({ customer: params.customer, state: params.state });
            break;
          }
          case "lathe_order_audit": {
            const engine = await getEngine("latheOrderLifecycle");
            result = engine.getAuditLog(params.order_id);
            break;
          }
          case "lathe_order_pipeline": {
            const engine = await getEngine("latheOrderLifecycle");
            result = engine.pipelineSummary();
            break;
          }

          // ── Lathe PO Automation (U-LTH52) ──
          case "lathe_po_build": {
            const engine = await getEngine("lathePOAutomation");
            result = engine.build(params as any);
            break;
          }

          // ── Lathe Inventory Intelligence (U-LTH53) ──
          case "lathe_inv_upsert": {
            const engine = await getEngine("latheInventory");
            result = engine.upsertItem(params as any);
            break;
          }
          case "lathe_inv_movement": {
            const engine = await getEngine("latheInventory");
            result = engine.recordMovement(params as any);
            break;
          }
          case "lathe_inv_snapshot": {
            const engine = await getEngine("latheInventory");
            result = engine.snapshot();
            break;
          }
          case "lathe_inv_alerts": {
            const engine = await getEngine("latheInventory");
            result = engine.alerts();
            break;
          }
          case "lathe_inv_get": {
            const engine = await getEngine("latheInventory");
            result = engine.getItem(params.sku);
            break;
          }

          // ── Lathe Profitability Analytics (U-LTH54) ──
          case "lathe_profit_record": {
            const engine = await getEngine("latheProfitability");
            result = engine.recordJob(params as any);
            break;
          }
          case "lathe_profit_portfolio": {
            const engine = await getEngine("latheProfitability");
            result = engine.portfolio(params as any);
            break;
          }
          case "lathe_profit_get": {
            const engine = await getEngine("latheProfitability");
            result = engine.getJob(params.job_id);
            break;
          }

          // ── Lathe ERP Orchestrator (U-LTH57) ──
          case "lathe_erp_full": {
            const engine = await getEngine("latheERPOrchestrator");
            result = engine.erpFull(params as any);
            break;
          }

          // ── Lathe AGI Substrate (U-LTH58..U-LTH61) ──
          case "lathe_agi_reason": {
            const engine = await getEngine("latheAGIBridge");
            result = engine.reason(params as any);
            break;
          }
          case "lathe_agi_history": {
            const engine = await getEngine("latheAGIBridge");
            result = engine.history({ feature: params.feature, limit: params.limit });
            break;
          }
          case "lathe_agi_confidence": {
            const engine = await getEngine("latheAGIBridge");
            result = engine.confidenceStats();
            break;
          }
          case "lathe_agi_feedback": {
            const engine = await getEngine("latheAGILearning");
            result = engine.recordFeedback(params as any);
            break;
          }
          case "lathe_agi_adjustment": {
            const engine = await getEngine("latheAGILearning");
            result = { multiplier: engine.predictAdjustment(params.feature, params.key) };
            break;
          }
          case "lathe_agi_kg_upsert_node": {
            const engine = await getEngine("latheAGIKnowledge");
            result = engine.upsertNode(params as any);
            break;
          }
          case "lathe_agi_kg_upsert_edge": {
            const engine = await getEngine("latheAGIKnowledge");
            result = engine.upsertEdge(params as any);
            break;
          }
          case "lathe_agi_kg_query": {
            const engine = await getEngine("latheAGIKnowledge");
            result = engine.query(params as any);
            break;
          }
          case "lathe_agi_kg_trace": {
            const engine = await getEngine("latheAGIKnowledge");
            result = engine.traceReasoning(params as any);
            break;
          }
          case "lathe_agi_kg_stats": {
            const engine = await getEngine("latheAGIKnowledge");
            result = engine.stats();
            break;
          }
          case "lathe_agi_safety_check": {
            const engine = await getEngine("latheAGISafety");
            result = engine.check(params as any);
            break;
          }

          // ── Billing (SaaS multi-tenant) ──
          case "billing_get_plans": {
            const engine = await getEngine("billing");
            result = { plans: engine.getPlans() };
            break;
          }
          case "billing_get_post_prices": {
            const engine = await getEngine("billing");
            result = { tiers: engine.getPostPrices() };
            break;
          }
          case "billing_calc_post_price": {
            const engine = await getEngine("billing");
            result = engine.calcPostPrice({ qty: params.qty });
            break;
          }
          case "billing_create_checkout": {
            const engine = await getEngine("billing");
            result = engine.createCheckout(params as any);
            break;
          }
          case "billing_create_portal": {
            const engine = await getEngine("billing");
            result = engine.createPortal(params as any);
            break;
          }
          case "billing_create_post_checkout": {
            const engine = await getEngine("billing");
            result = engine.createPostCheckout(params as any);
            break;
          }
          case "billing_handle_webhook": {
            const engine = await getEngine("billing");
            result = engine.handleWebhook(params as any);
            break;
          }
          case "billing_stats": {
            const engine = await getEngine("billing");
            result = engine.stats();
            break;
          }
          case "billing_stripe_status": {
            // Surfaces StripeBillingEngine (Stripe-adapter for BillingEngine) via MCP.
            // BillingEngine = self-contained dispatcher surface; StripeBillingEngine
            // = HTTP-route surface (routes/billing.ts). Action exposes adapter health.
            const engine = await getEngine("stripeBilling");
            result = engine.stats();
            break;
          }

          // ── U-BRIDGE-WIRE-BUSINESS: 3 previously-unwired Business engines ──
          case "eco_validate": {
            // EngineeringChangeOrderEngine — validate an ECO/ECN change package
            // (EIA-649-C / MIL-HDBK-61A / ISO 10007 / AS9100D §8.5.6).
            const engine = await getEngine("eco");
            result = engine.validate(params);
            break;
          }
          case "eco_stats": {
            const engine = await getEngine("eco");
            result = engine.getStats();
            break;
          }
          case "qdrant_capacity_plan": {
            // QdrantCapacityPlannerEngine — pre-flight disk/RAM estimate before
            // a vector-store ingestion. ok | tight | insufficient decision.
            const engine = await getEngine("qdrantCapacity");
            result = engine.plan(params.collection, params.host);
            break;
          }
          case "qdrant_capacity_max_fraction": {
            const engine = await getEngine("qdrantCapacity");
            result = {
              maxIngestFraction: engine.maxIngestFraction(params.collection, params.host),
            };
            break;
          }
          case "erp_tool_search": {
            // ERPToolInventoryEngine — static-method engine; getEngine returns the
            // class reference, so searchTools is invoked as a static call.
            const engine = await getEngine("erpToolInventory");
            result = { tools: engine.searchTools(params.query, params.category) };
            break;
          }
          case "erp_tool_reorder_alerts": {
            const engine = await getEngine("erpToolInventory");
            result = { alerts: engine.getReorderAlerts() };
            break;
          }

          // ── U-BRIDGE-ERP-QUOTE: ERP ↔ quoting bridge ──
          case "quote_to_order": {
            // QuoteToOrderBridgeEngine — run a fresh quote estimate, then
            // create an ERP order + per-operation work orders from it.
            const engine = await getEngine("quoteToOrderBridge");
            result = engine.estimateAndCreateOrder(params.input, params);
            break;
          }
          case "order_from_quote": {
            // QuoteToOrderBridgeEngine — bridge an already-computed quote
            // result into an ERP order (generic, process-agnostic counterpart
            // of the lathe-specific lathe_job_from_quote).
            const engine = await getEngine("quoteToOrderBridge");
            result = engine.createOrderFromQuote(params.quote, params);
            break;
          }

          // ── U-BRIDGE-ERP-SCHED: ERP work-orders ↔ scheduling/capacity bridge ──
          case "schedule_open_work_orders": {
            // WorkOrderScheduleBridgeEngine — map every open OrderManager
            // work-order to a Job, then run schedulingEngine.schedule() with
            // results correlated back to WO ids.
            const engine = await getEngine("workOrderScheduleBridge");
            result = engine.scheduleOpenWorkOrders(params);
            break;
          }
          case "what_if_work_order": {
            // WorkOrderScheduleBridgeEngine — capacity what-if for a single
            // work-order; routes hours = estimatedTime/60 to
            // capacityPlanningEngine.whatIfJob.
            const engine = await getEngine("workOrderScheduleBridge");
            result = engine.whatIfWorkOrder(params.work_order_id, params);
            break;
          }

          // ── U-DISTRIBUTOR-SEARCH (hotel iter10): live tool/material search ──
          case "distributor_search": {
            const { distributorSearchEngine } = await import("../../engines/DistributorSearchEngine.js");
            type Input = import("../../engines/DistributorSearchEngine.js").DistributorSearchInput;
            result = await distributorSearchEngine.search(params as Input);
            break;
          }
          case "distributor_list_providers": {
            const { distributorSearchEngine } = await import("../../engines/DistributorSearchEngine.js");
            result = { providers: distributorSearchEngine.listProviders() };
            break;
          }
          case "distributor_set_api_key": {
            const { distributorSearchEngine } = await import("../../engines/DistributorSearchEngine.js");
            const p = params as { provider_id: string; api_key: string };
            result = distributorSearchEngine.setProviderApiKey(p.provider_id, p.api_key);
            break;
          }
          case "distributor_register": {
            // Advisory — registering a fully-typed Provider object is operator
            // work (cannot serialize a class through MCP). This action returns
            // a help string with the doc link.
            result = {
              ok: false,
              error: "distributor_register requires a Provider class — call distributorSearchEngine.registerProvider(provider) directly in operator code; see DistributorSearchEngine.ts for the interface",
            };
            break;
          }
          case "distributor_invalidate_cache": {
            const { distributorSearchEngine } = await import("../../engines/DistributorSearchEngine.js");
            distributorSearchEngine.invalidateCache();
            result = { ok: true, cache_invalidated: true };
            break;
          }

          // ── U-VENDOR-REGION-SORT (hotel iter11): haversine vendor proximity ──
          case "vendor_region_rank": {
            const { vendorRegionEngine } = await import("../../engines/VendorRegionEngine.js");
            type Input = import("../../engines/VendorRegionEngine.js").RegionSearchInput;
            result = vendorRegionEngine.rankByDistance(params as Input);
            break;
          }
          case "vendor_region_nearest": {
            const { vendorRegionEngine } = await import("../../engines/VendorRegionEngine.js");
            type Cat = import("../../engines/VendorEngine.js").VendorCategory;
            const p = params as { category: Cat; origin_zip?: string; unit?: "km" | "mi" };
            result = vendorRegionEngine.nearest(p.category, p.origin_zip, p.unit ?? "km");
            break;
          }
          case "vendor_region_within_radius": {
            const { vendorRegionEngine } = await import("../../engines/VendorRegionEngine.js");
            type Cat = import("../../engines/VendorEngine.js").VendorCategory;
            const p = params as { origin_zip: string; max_distance: number; unit?: "km" | "mi"; category?: Cat };
            result = { vendors: vendorRegionEngine.withinRadius(p.origin_zip, p.max_distance, p.unit ?? "km", p.category) };
            break;
          }
          case "vendor_region_default_origin": {
            const { vendorRegionEngine } = await import("../../engines/VendorRegionEngine.js");
            result = { default_origin_zip: vendorRegionEngine.defaultOriginZip };
            break;
          }
          // ── Amortization / Depreciation (G8 — hotel iter12) ──
          case "amortization_payment": {
            const { fixedPayment } = await import("../../algorithms/AmortizationScheduleFormula.js");
            const p = params as { principal: number; rate_periodic: number; n_periods: number };
            result = { payment: fixedPayment(p.principal, p.rate_periodic, p.n_periods) };
            break;
          }
          case "amortization_schedule": {
            const { amortizationSchedule } = await import("../../algorithms/AmortizationScheduleFormula.js");
            const p = params as { principal: number; rate_annual: number; n_periods: number; periods_per_year?: number };
            result = amortizationSchedule(p.principal, p.rate_annual, p.n_periods, p.periods_per_year);
            break;
          }
          case "amortization_straight_line": {
            const { straightLineDepreciation } = await import("../../algorithms/AmortizationScheduleFormula.js");
            const p = params as { cost: number; salvage: number; life_years: number };
            result = straightLineDepreciation(p.cost, p.salvage, p.life_years);
            break;
          }
          // ── Recurring Expenses (G8 — hotel iter12) ──
          case "recurring_expense_create": {
            const { recurringExpenseEngine } = await import("../../engines/RecurringExpenseEngine.js");
            type Input = import("../../engines/RecurringExpenseEngine.js").RecurringExpenseInput;
            result = recurringExpenseEngine.create(params as Input);
            break;
          }
          case "recurring_expense_get": {
            const { recurringExpenseEngine } = await import("../../engines/RecurringExpenseEngine.js");
            const p = params as { id: string };
            result = { expense: recurringExpenseEngine.get(p.id) };
            break;
          }
          case "recurring_expense_list": {
            const { recurringExpenseEngine } = await import("../../engines/RecurringExpenseEngine.js");
            type Cat = import("../../engines/RecurringExpenseEngine.js").RecurringCategory;
            const p = params as { active?: boolean; category?: Cat };
            result = { expenses: recurringExpenseEngine.list(p.active, p.category) };
            break;
          }
          case "recurring_expense_update_amount": {
            const { recurringExpenseEngine } = await import("../../engines/RecurringExpenseEngine.js");
            const p = params as { id: string; new_amount: number };
            result = recurringExpenseEngine.updateAmount(p.id, p.new_amount);
            break;
          }
          case "recurring_expense_deactivate": {
            const { recurringExpenseEngine } = await import("../../engines/RecurringExpenseEngine.js");
            const p = params as { id: string };
            result = recurringExpenseEngine.deactivate(p.id);
            break;
          }
          case "recurring_expense_monthly_burden": {
            const { recurringExpenseEngine } = await import("../../engines/RecurringExpenseEngine.js");
            result = recurringExpenseEngine.monthlyBurden();
            break;
          }
          case "recurring_expense_forecast": {
            const { recurringExpenseEngine } = await import("../../engines/RecurringExpenseEngine.js");
            const p = params as { id: string; lookahead_periods: number };
            result = recurringExpenseEngine.forecastDueDates(p.id, p.lookahead_periods);
            break;
          }
          // ── Inventory ROP / EOQ / Safety Stock (G11 — hotel iter13) ──
          case "inventory_eoq": {
            const { economicOrderQuantity } = await import("../../algorithms/InventoryReorderPointFormula.js");
            const p = params as { annual_demand: number; order_cost: number; holding_cost: number };
            result = { eoq: economicOrderQuantity(p.annual_demand, p.order_cost, p.holding_cost) };
            break;
          }
          case "inventory_safety_stock": {
            const { safetyStock } = await import("../../algorithms/InventoryReorderPointFormula.js");
            const p = params as { std_dev_demand: number; lead_time_days: number; service_level: number };
            result = { safety_stock: safetyStock(p.std_dev_demand, p.lead_time_days, p.service_level) };
            break;
          }
          case "inventory_reorder_point": {
            const { reorderPoint } = await import("../../algorithms/InventoryReorderPointFormula.js");
            const p = params as { avg_daily_demand: number; lead_time_days: number; safety_stock: number };
            result = { reorder_point: reorderPoint(p.avg_daily_demand, p.lead_time_days, p.safety_stock) };
            break;
          }
          case "inventory_total_cost": {
            const { totalInventoryCost } = await import("../../algorithms/InventoryReorderPointFormula.js");
            const p = params as { annual_demand: number; order_cost: number; holding_cost: number; order_quantity: number };
            result = { total_cost: totalInventoryCost(p.annual_demand, p.order_cost, p.holding_cost, p.order_quantity) };
            break;
          }
          case "inventory_reorder_policy": {
            const { reorderPolicy } = await import("../../algorithms/InventoryReorderPointFormula.js");
            type Input = Parameters<typeof reorderPolicy>[0];
            const p = params as {
              annual_demand: number; order_cost: number; holding_cost: number;
              avg_daily_demand: number; std_dev_demand: number;
              lead_time_days: number; service_level: number;
            };
            const mapped: Input = {
              annualDemand: p.annual_demand,
              orderCost: p.order_cost,
              holdingCost: p.holding_cost,
              avgDailyDemand: p.avg_daily_demand,
              stdDevDemand: p.std_dev_demand,
              leadTimeDays: p.lead_time_days,
              serviceLevel: p.service_level,
            };
            result = reorderPolicy(mapped);
            break;
          }
          // ── AR Aging (G13 — hotel iter13) ──
          case "ar_invoice_record": {
            const { arAgingEngine } = await import("../../engines/ARAgingEngine.js");
            type Input = import("../../engines/ARAgingEngine.js").InvoiceInput;
            result = arAgingEngine.recordInvoice(params as Input);
            break;
          }
          case "ar_payment_record": {
            const { arAgingEngine } = await import("../../engines/ARAgingEngine.js");
            const p = params as { invoice_id: string; payment_amount: number };
            result = arAgingEngine.recordPayment(p.invoice_id, p.payment_amount);
            break;
          }
          case "ar_invoice_get": {
            const { arAgingEngine } = await import("../../engines/ARAgingEngine.js");
            const p = params as { id: string };
            result = { invoice: arAgingEngine.get(p.id) };
            break;
          }
          case "ar_invoice_list": {
            const { arAgingEngine } = await import("../../engines/ARAgingEngine.js");
            const p = params as { customer_id?: string; status?: "open" | "paid" | "partial" };
            result = { invoices: arAgingEngine.list(p) };
            break;
          }
          case "ar_aging_report": {
            const { arAgingEngine } = await import("../../engines/ARAgingEngine.js");
            const p = params as { as_of: string };
            result = arAgingEngine.agingReport(p.as_of);
            break;
          }
          // ── Price-break optimization + ABC classification (G11ext+G12 — hotel iter14) ──
          case "inventory_price_break_optimize": {
            const { optimizePriceBreaks } = await import("../../algorithms/PriceBreakOptimizationFormula.js");
            type Tier = import("../../algorithms/PriceBreakOptimizationFormula.js").PriceTier;
            const p = params as {
              annual_demand: number; order_cost: number; holding_rate: number; tiers: Tier[];
            };
            result = optimizePriceBreaks(p.annual_demand, p.order_cost, p.holding_rate, p.tiers);
            break;
          }
          case "abc_classify": {
            const { classifyABC } = await import("../../algorithms/ABCClassificationFormula.js");
            type Item = import("../../algorithms/ABCClassificationFormula.js").ABCItem;
            const p = params as { items: Item[]; thresholds?: { a?: number; b?: number } };
            result = classifyABC(p.items, p.thresholds);
            break;
          }
          // ── Tool-life economic replacement (G10 — hotel iter15) ──
          case "tool_life_cost_per_minute": {
            const { costPerCutMinute } = await import("../../algorithms/ToolLifeEconomicReplacementFormula.js");
            type Input = import("../../algorithms/ToolLifeEconomicReplacementFormula.js").ToolCostInput;
            const p = params as { tool: Input; t_cut_min: number };
            result = costPerCutMinute(p.tool, p.t_cut_min);
            break;
          }
          case "tool_life_economic_life": {
            const { economicLife } = await import("../../algorithms/ToolLifeEconomicReplacementFormula.js");
            type Input = import("../../algorithms/ToolLifeEconomicReplacementFormula.js").ToolCostInput;
            const p = params as { tool: Input; scrap_risk_per_hr: number; part_value_avg: number };
            result = economicLife(p.tool, p.scrap_risk_per_hr, p.part_value_avg);
            break;
          }
          case "tool_life_replacement_schedule": {
            const { replacementSchedule } = await import("../../algorithms/ToolLifeEconomicReplacementFormula.js");
            type Input = import("../../algorithms/ToolLifeEconomicReplacementFormula.js").ToolCostInput;
            const p = params as { tool: Input; scrap_risk_per_hr: number; part_value_avg: number; actual_lives_min: number[] };
            result = { rows: replacementSchedule(p.tool, p.scrap_risk_per_hr, p.part_value_avg, p.actual_lives_min) };
            break;
          }
          // ── Critical Path Method scheduling (G5 — hotel iter16) ──
          case "cpm_schedule": {
            const { scheduleCriticalPath } = await import("../../algorithms/CriticalPathSchedulingFormula.js");
            type Input = import("../../algorithms/CriticalPathSchedulingFormula.js").TaskInput;
            const p = params as { tasks: Input[] };
            result = scheduleCriticalPath(p.tasks);
            break;
          }
          // ── BOM Explosion + Cost Rollup (G4 — hotel iter17) ──
          case "bom_explode": {
            const { explodeBOM } = await import("../../algorithms/BillOfMaterialsRollupFormula.js");
            type Part = import("../../algorithms/BillOfMaterialsRollupFormula.js").BomPart;
            const p = params as { parts: Part[]; root_id: string; top_qty: number };
            result = explodeBOM(p.parts, p.root_id, p.top_qty);
            break;
          }
          case "bom_cost_rollup": {
            const { rollUpBomCost } = await import("../../algorithms/BillOfMaterialsRollupFormula.js");
            type Part = import("../../algorithms/BillOfMaterialsRollupFormula.js").BomPart;
            const p = params as { parts: Part[]; root_id: string; top_qty: number };
            result = rollUpBomCost(p.parts, p.root_id, p.top_qty);
            break;
          }
          case "bom_cycle_check": {
            const { circularReferenceCheck } = await import("../../algorithms/BillOfMaterialsRollupFormula.js");
            type Part = import("../../algorithms/BillOfMaterialsRollupFormula.js").BomPart;
            const p = params as { parts: Part[]; root_id: string };
            const cyclePath = circularReferenceCheck(p.parts, p.root_id);
            result = { has_cycle: cyclePath !== null, cycle_message: cyclePath };
            break;
          }
          // ── Job Routing Templates (G7 — hotel iter18) ──
          case "routing_template_create": {
            const { jobRoutingTemplateEngine } = await import("../../engines/JobRoutingTemplateEngine.js");
            type Input = import("../../engines/JobRoutingTemplateEngine.js").RoutingTemplateInput;
            result = jobRoutingTemplateEngine.create(params as Input);
            break;
          }
          case "routing_template_get": {
            const { jobRoutingTemplateEngine } = await import("../../engines/JobRoutingTemplateEngine.js");
            const p = params as { id: string };
            result = { template: jobRoutingTemplateEngine.get(p.id) };
            break;
          }
          case "routing_template_list": {
            const { jobRoutingTemplateEngine } = await import("../../engines/JobRoutingTemplateEngine.js");
            const p = params as { part_family?: string };
            result = { templates: jobRoutingTemplateEngine.list(p.part_family) };
            break;
          }
          case "routing_template_instantiate": {
            const { jobRoutingTemplateEngine } = await import("../../engines/JobRoutingTemplateEngine.js");
            const p = params as { template_id: string; part_id: string; qty: number };
            result = jobRoutingTemplateEngine.instantiate(p.template_id, p.part_id, p.qty);
            break;
          }
          // ── Vendor Quote → Purchase Order lifecycle (G3 — hotel iter19) ──
          case "vendor_quote_record": {
            const { vendorQuoteToPurchaseOrderEngine } = await import("../../engines/VendorQuoteToPurchaseOrderEngine.js");
            type Input = import("../../engines/VendorQuoteToPurchaseOrderEngine.js").VendorQuoteInput;
            result = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(params as Input);
            break;
          }
          case "vendor_quote_to_po": {
            const { vendorQuoteToPurchaseOrderEngine } = await import("../../engines/VendorQuoteToPurchaseOrderEngine.js");
            const p = params as { quote_id: string; requested_qtys: Record<string, number> };
            result = vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(p.quote_id, p.requested_qtys);
            break;
          }
          case "po_receipt_record": {
            const { vendorQuoteToPurchaseOrderEngine } = await import("../../engines/VendorQuoteToPurchaseOrderEngine.js");
            type RLine = import("../../engines/VendorQuoteToPurchaseOrderEngine.js").POReceiptLineItem;
            const p = params as { po_id: string; receipt_lines: RLine[] };
            result = vendorQuoteToPurchaseOrderEngine.recordPOReceipt(p.po_id, p.receipt_lines);
            break;
          }
          case "po_three_way_match": {
            const { vendorQuoteToPurchaseOrderEngine } = await import("../../engines/VendorQuoteToPurchaseOrderEngine.js");
            const p = params as { po_id: string; invoice_total: number };
            result = vendorQuoteToPurchaseOrderEngine.threeWayMatch(p);
            break;
          }
          case "vendor_quote_get": {
            const { vendorQuoteToPurchaseOrderEngine } = await import("../../engines/VendorQuoteToPurchaseOrderEngine.js");
            const p = params as { id: string };
            result = { quote: vendorQuoteToPurchaseOrderEngine.getQuote(p.id) };
            break;
          }
          case "vendor_quote_list": {
            const { vendorQuoteToPurchaseOrderEngine } = await import("../../engines/VendorQuoteToPurchaseOrderEngine.js");
            const p = params as { vendor_id?: string; status?: "open" | "converted" | "expired" };
            result = { quotes: vendorQuoteToPurchaseOrderEngine.listQuotes(p) };
            break;
          }
          case "po_get": {
            const { vendorQuoteToPurchaseOrderEngine } = await import("../../engines/VendorQuoteToPurchaseOrderEngine.js");
            const p = params as { id: string };
            result = { po: vendorQuoteToPurchaseOrderEngine.getPO(p.id) };
            break;
          }
          case "po_list": {
            const { vendorQuoteToPurchaseOrderEngine } = await import("../../engines/VendorQuoteToPurchaseOrderEngine.js");
            type Status = import("../../engines/VendorQuoteToPurchaseOrderEngine.js").POStatus;
            const p = params as { vendor_id?: string; status?: Status };
            result = { pos: vendorQuoteToPurchaseOrderEngine.listPOs(p) };
            break;
          }
          // ── Invoice OCR parser + X12 EDI parser (G2+G6 parser halves — hotel iter20) ──
          case "invoice_text_parse": {
            const { parseInvoiceText } = await import("../../algorithms/InvoiceTextParserFormula.js");
            const p = params as { text: string };
            result = parseInvoiceText(p.text);
            break;
          }
          case "x12_parse_interchange": {
            const { parseX12Interchange } = await import("../../algorithms/X12EdiSegmentParserFormula.js");
            const p = params as { raw: string };
            result = parseX12Interchange(p.raw);
            break;
          }
          // ── Prospective customer sales pipeline (hotel iter21) ──
          case "prospect_create": {
            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
            type Input = import("../../engines/ProspectiveCustomerEngine.js").ProspectiveCustomerInput;
            result = prospectiveCustomerEngine.create(params as Input);
            break;
          }
          case "prospect_get": {
            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
            const p = params as { id: string };
            result = { prospect: prospectiveCustomerEngine.get(p.id) };
            break;
          }
          case "prospect_list": {
            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
            type Status = import("../../engines/ProspectiveCustomerEngine.js").ProspectStatus;
            type WT = import("../../engines/ProspectiveCustomerEngine.js").WorkType;
            const p = params as { status?: Status; work_type?: WT; min_relevance?: number };
            result = { prospects: prospectiveCustomerEngine.list(p) };
            break;
          }
          case "prospect_advance_status": {
            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
            type Status = import("../../engines/ProspectiveCustomerEngine.js").ProspectStatus;
            const p = params as { id: string; new_status: Status };
            result = prospectiveCustomerEngine.advanceStatus(p.id, p.new_status);
            break;
          }
          case "prospect_pipeline_report": {
            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
            result = prospectiveCustomerEngine.pipelineReport();
            break;
          }
          case "prospect_seed_jm_die": {
            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
            const { JM_DIE_PROSPECTS_SEED } = await import("../../data/jm-die-prospects-seed.js");
            const loaded: string[] = [];
            for (const seed of JM_DIE_PROSPECTS_SEED) {
              loaded.push(prospectiveCustomerEngine.create(seed).id);
            }
            result = { loaded_ids: loaded, count: loaded.length };
            break;
          }
          case "prospect_first_contact_email": {
            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
            const { generateFirstContactEmail } = await import("../../algorithms/FirstContactEmailTemplateFormula.js");
            const p = params as { id: string };
            const prospect = prospectiveCustomerEngine.get(p.id);
            if (!prospect) throw new Error(`prospect '${p.id}' not found`);
            result = generateFirstContactEmail(prospect);
            break;
          }
          case "prospect_sales_approach_guide": {
            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
            const { salesApproachGuide } = await import("../../algorithms/FirstContactEmailTemplateFormula.js");
            const p = params as { id: string };
            const prospect = prospectiveCustomerEngine.get(p.id);
            if (!prospect) throw new Error(`prospect '${p.id}' not found`);
            result = salesApproachGuide(prospect);
            break;
          }
          case "prospect_first_quote_prompts": {
            const { prospectiveCustomerEngine } = await import("../../engines/ProspectiveCustomerEngine.js");
            const { firstQuotePrompts } = await import("../../algorithms/FirstContactEmailTemplateFormula.js");
            const p = params as { id: string };
            const prospect = prospectiveCustomerEngine.get(p.id);
            if (!prospect) throw new Error(`prospect '${p.id}' not found`);
            result = firstQuotePrompts(prospect);
            break;
          }
          // ── JM Die team user profiles + RBAC (hotel iter23) ──
          case "user_profile_get": {
            const { jmDieUserProfileEngine } = await import("../../engines/JmDieUserProfileEngine.js");
            const p = params as { id: string };
            const profile = jmDieUserProfileEngine.get(p.id);
            if (!profile) {
              result = { profile: null };
            } else {
              // raw profile leaks PII — server-side use only; expose work email + role + perms count
              result = {
                profile: {
                  id: profile.id,
                  legal_name: profile.legal_name,
                  display_name: profile.display_name,
                  role: profile.role,
                  work_email: profile.work_email,
                  responsibilities: profile.responsibilities,
                  owned_domains: profile.owned_domains,
                  permission_count: profile.permissions.size,
                  is_backup_for: profile.is_backup_for ?? null,
                  created_at: profile.created_at,
                },
              };
            }
            break;
          }
          case "user_profile_get_redacted": {
            const { jmDieUserProfileEngine } = await import("../../engines/JmDieUserProfileEngine.js");
            const p = params as { id: string };
            result = { profile: jmDieUserProfileEngine.getRedacted(p.id) };
            break;
          }
          case "user_profile_list": {
            const { jmDieUserProfileEngine } = await import("../../engines/JmDieUserProfileEngine.js");
            type Role = import("../../engines/JmDieUserProfileEngine.js").UserRole;
            const p = params as { role?: Role; owned_domain?: string };
            result = { profiles: jmDieUserProfileEngine.listRedacted(p) };
            break;
          }
          case "user_profile_seed_jm_team": {
            const { jmDieUserProfileEngine } = await import("../../engines/JmDieUserProfileEngine.js");
            const { JM_DIE_TEAM_SEED } = await import("../../data/jm-die-team-seed.js");
            const loaded: string[] = [];
            const skipped: string[] = [];
            for (const seed of JM_DIE_TEAM_SEED) {
              if (jmDieUserProfileEngine.get(seed.id)) {
                skipped.push(seed.id);
                continue;
              }
              loaded.push(jmDieUserProfileEngine.create(seed).id);
            }
            result = { loaded_ids: loaded, skipped_ids: skipped, total: jmDieUserProfileEngine.size() };
            break;
          }
          case "user_profile_check_permission": {
            const { jmDieUserProfileEngine } = await import("../../engines/JmDieUserProfileEngine.js");
            const p = params as { user_id: string; feature: string };
            result = {
              user_id: p.user_id,
              feature: p.feature,
              allowed: jmDieUserProfileEngine.checkPermission(p.user_id, p.feature),
            };
            break;
          }
          case "user_profile_set_active": {
            const { jmDieUserProfileEngine } = await import("../../engines/JmDieUserProfileEngine.js");
            const p = params as { id: string };
            const prior = jmDieUserProfileEngine.setActiveUser(p.id);
            result = { active_user_id: p.id, prior_active_user_id: prior };
            break;
          }
          case "user_profile_get_active": {
            const { jmDieUserProfileEngine } = await import("../../engines/JmDieUserProfileEngine.js");
            result = { active_user: jmDieUserProfileEngine.getActiveUser() };
            break;
          }
          case "user_profile_coverage_report": {
            const { jmDieUserProfileEngine } = await import("../../engines/JmDieUserProfileEngine.js");
            result = jmDieUserProfileEngine.coverageReport();
            break;
          }
          // ── Email PDF/print intake — Tuesday extraction (hotel iter24) ──
          // Engine singleton lives in a module-scope cache so register/run share state.
          case "email_intake_register_inbox": {
            const { getEmailIntakeEngine } = await import("../../engines/emailIntakeSingleton.js");
            type Cfg = import("../../engines/EmailPrintIntakeEngine.js").InboxConfig;
            const engine = getEmailIntakeEngine();
            engine.registerInbox(params as Cfg);
            result = { registered: (params as Cfg).user_id, total_inboxes: engine.size().inboxes };
            break;
          }
          case "email_intake_list_inboxes": {
            const { getEmailIntakeEngine } = await import("../../engines/emailIntakeSingleton.js");
            // do NOT leak password_env_var values (env var name is OK; tells operator what to set)
            result = { inboxes: getEmailIntakeEngine().listInboxes() };
            break;
          }
          case "email_intake_seed_jm_team": {
            const { getEmailIntakeEngine } = await import("../../engines/emailIntakeSingleton.js");
            const { JM_DIE_INBOX_SEED } = await import("../../data/jm-die-inbox-seed.js");
            const engine = getEmailIntakeEngine();
            const registered: string[] = [];
            const skipped: string[] = [];
            for (const cfg of JM_DIE_INBOX_SEED) {
              if (engine.getInbox(cfg.user_id)) {
                skipped.push(cfg.user_id);
                continue;
              }
              engine.registerInbox(cfg);
              registered.push(cfg.user_id);
            }
            result = { registered_ids: registered, skipped_ids: skipped, total: engine.size().inboxes };
            break;
          }
          case "email_intake_should_run_now": {
            const { getEmailIntakeEngine } = await import("../../engines/emailIntakeSingleton.js");
            result = { should_run: getEmailIntakeEngine().shouldRunNow() };
            break;
          }
          case "email_intake_run_batch": {
            const { getEmailIntakeEngine } = await import("../../engines/emailIntakeSingleton.js");
            const p = params as { force_run_ignoring_tuesday?: boolean; timeout_ms_per_user?: number };
            result = await getEmailIntakeEngine().runBatch({
              forceRunIgnoringTuesday: p.force_run_ignoring_tuesday,
              timeoutMsPerUser: p.timeout_ms_per_user,
            });
            break;
          }
          case "email_intake_run_dry": {
            // dry-run = forceRun=true; useful for operator manual triggers and CI smoke
            const { getEmailIntakeEngine } = await import("../../engines/emailIntakeSingleton.js");
            result = await getEmailIntakeEngine().runBatch({ forceRunIgnoringTuesday: true });
            break;
          }
          // ── Intake artifact processor — PDF→tool/inventory/part auto-populate (hotel iter25) ──
          case "intake_process_artifact": {
            const { getIntakeProcessor } = await import("../../engines/intakeProcessorSingleton.js");
            type Artifact = import("../../engines/EmailPrintIntakeEngine.js").ExtractedArtifact;
            const p = params as { artifact: Artifact; bytes_base64: string };
            if (!p.artifact || !p.bytes_base64) throw new Error("artifact + bytes_base64 required");
            const bytes = new Uint8Array(Buffer.from(p.bytes_base64, "base64"));
            result = await getIntakeProcessor().process(p.artifact, bytes);
            break;
          }
          case "intake_processor_history": {
            const { getIntakeProcessor } = await import("../../engines/intakeProcessorSingleton.js");
            result = { history: getIntakeProcessor().history_get() };
            break;
          }
          case "intake_processor_summary": {
            const { getIntakeProcessor } = await import("../../engines/intakeProcessorSingleton.js");
            result = getIntakeProcessor().history_summary();
            break;
          }
          case "intake_processor_diagnostics": {
            const { getSinksForDiagnostics } = await import("../../engines/intakeProcessorSingleton.js");
            const sinks = getSinksForDiagnostics();
            // Return counts only — sink internals stay in process memory
            const t = sinks.tooling as { proposed?: unknown[] };
            const inv = sinks.inventory as { proposed?: unknown[] };
            const part = sinks.part as { proposed?: unknown[] };
            const review = sinks.review as { queued?: unknown[] };
            result = {
              tooling_proposed: t.proposed?.length ?? 0,
              inventory_proposed: inv.proposed?.length ?? 0,
              parts_proposed: part.proposed?.length ?? 0,
              review_queued: review.queued?.length ?? 0,
            };
            break;
          }
          // ── Vision diagnostic — chip/part/tool photo → param adjustments (hotel iter26) ──
          case "vision_diagnose_image": {
            const { getVisionDiagnosticEngine } = await import("../../engines/visionDiagnosticSingleton.js");
            type ProcessType = import("../../engines/MachiningVisionDiagnosticEngine.js").ProcessType;
            type Subject = import("../../engines/MachiningVisionDiagnosticEngine.js").Subject;
            const p = params as { bytes_base64: string; process_type: ProcessType; subject_hint?: Subject };
            if (!p.bytes_base64 || !p.process_type) {
              throw new Error("bytes_base64 + process_type required");
            }
            const bytes = new Uint8Array(Buffer.from(p.bytes_base64, "base64"));
            result = await getVisionDiagnosticEngine().diagnose(bytes, {
              process_type: p.process_type,
              subject_hint: p.subject_hint,
            });
            break;
          }

          // ── iter8/bulk-sweep business engines ──
          // NOTE (hotel 2026-06-01): the iter8 bulk-sweep appended a DUPLICATE `customer_portfolio_mine`
          // case here carrying a `{note:"method not callable"}` placeholder. It was dead/shadowed — the
          // FIRST matching `case` wins in JS, and the real handler lives earlier in this switch
          // (customer_portfolio_mine → mineCustomer(customer_name); sibling customer_portfolio_list →
          // listCustomers). The dead duplicate + its orphaned `_customerPortfolioMiner` holder are removed.
          case "customer_knowledge_query": {
            // REAL WIRE (hotel 2026-06-01): the prior `.query/.search/.get ?? {note:"method not callable"}`
            // was a FALSE-WIRE — none of those methods exist on CustomerKnowledgeEngine, so it always
            // returned the placeholder. The real methods are getProfile / getShopModifiers / getJobHistory
            // (keyed by shop_id = a real JM Die customer). Route by `sub`, default to the full profile.
            _customerKnowledge ??= (await import("../../engines/CustomerKnowledgeEngine.js")).customerKnowledgeEngine;
            const ck = _customerKnowledge as typeof import("../../engines/CustomerKnowledgeEngine.js").customerKnowledgeEngine;
            const ckp = params as { shop_id?: string; sub?: string; material?: string; limit?: number };
            if (!ckp.shop_id || typeof ckp.shop_id !== "string") {
              throw new Error("customer_knowledge_query: shop_id (string) is required");
            }
            const ckSub = ckp.sub || "profile";
            let ckData: unknown;
            switch (ckSub) {
              case "profile":
                ckData = ck.getProfile(ckp.shop_id);
                break;
              case "modifiers":
                ckData = ck.getShopModifiers(ckp.shop_id, ckp.material ? { material: ckp.material } : undefined);
                break;
              case "history":
                ckData = ck.getJobHistory(ckp.shop_id, typeof ckp.limit === "number" ? ckp.limit : 20);
                break;
              default:
                throw new Error(`customer_knowledge_query: unknown sub '${ckSub}' (expected profile | modifiers | history)`);
            }
            result = { success: true, data: ckData, found: ckData != null, sub: ckSub, shop_id: ckp.shop_id };
            break;
          }
          case "shop_floor_quote_generate": {
            // REAL WIRE (hotel 2026-06-01): prior `.generate/.quote/.calculate ?? {note}` was a FALSE-WIRE.
            // Real API is STATIC: generateQuote(QuoteRequest) / getHistoricalJobs / getSuggestedPriceFromHistory
            // / getDepartmentRates. Default = generate a JM Die shop-floor quote (schema-validated input).
            const sfqMod = await import("../../engines/ShopFloorQuoteEngine.js");
            _shopFloorQuote ??= sfqMod.ShopFloorQuoteEngine;
            const sfq = params as { sub?: string; part_number?: string; quantity?: number };
            const sfqSub = sfq.sub || "generate";
            let sfqData: unknown;
            switch (sfqSub) {
              case "generate": {
                const req = sfqMod.QuoteRequestSchema.parse(params);
                sfqData = _shopFloorQuote.generateQuote(req);
                break;
              }
              case "history":
                if (!sfq.part_number) throw new Error("shop_floor_quote_generate: part_number required for sub='history'");
                sfqData = _shopFloorQuote.getHistoricalJobs(sfq.part_number);
                break;
              case "suggested_price":
                if (!sfq.part_number || typeof sfq.quantity !== "number") {
                  throw new Error("shop_floor_quote_generate: part_number + quantity required for sub='suggested_price'");
                }
                sfqData = _shopFloorQuote.getSuggestedPriceFromHistory(sfq.part_number, sfq.quantity);
                break;
              case "rates":
                sfqData = _shopFloorQuote.getDepartmentRates();
                break;
              default:
                throw new Error(`shop_floor_quote_generate: unknown sub '${sfqSub}' (expected generate | history | suggested_price | rates)`);
            }
            result = { success: true, data: sfqData, sub: sfqSub };
            break;
          }
          case "erp_work_order_sync": {
            // REAL WIRE (hotel 2026-06-01): prior `.sync/.process/.run ?? {note}` was a FALSE-WIRE.
            // Real API is STATIC: getWorkOrderSync / getOperationStatuses / syncToERP / syncFromERP /
            // getPendingSyncs / getProgressSummary. Default = READ status (hotel soul: never silently mutate;
            // the mutating sub='to_erp'/'from_erp' must be requested explicitly).
            _erpWorkOrder ??= (await import("../../engines/ERPWorkOrderEngine.js")).ERPWorkOrderEngine;
            const erp = params as { sub?: string; work_order_number?: string; erp_data?: Record<string, unknown> };
            const erpSub = erp.sub || "status";
            const needWO = (): string => {
              if (!erp.work_order_number || typeof erp.work_order_number !== "string") {
                throw new Error(`erp_work_order_sync: work_order_number (string) required for sub='${erpSub}'`);
              }
              return erp.work_order_number;
            };
            let erpData: unknown;
            switch (erpSub) {
              case "status": erpData = _erpWorkOrder.getWorkOrderSync(needWO()); break;
              case "operations": erpData = _erpWorkOrder.getOperationStatuses(needWO()); break;
              case "pending": erpData = _erpWorkOrder.getPendingSyncs(); break;
              case "progress": erpData = _erpWorkOrder.getProgressSummary(); break;
              case "to_erp": erpData = _erpWorkOrder.syncToERP(needWO()); break;
              case "from_erp": erpData = _erpWorkOrder.syncFromERP(needWO(), erp.erp_data ?? {}); break;
              default:
                throw new Error(`erp_work_order_sync: unknown sub '${erpSub}' (expected status | operations | pending | progress | to_erp | from_erp)`);
            }
            result = { success: true, data: erpData, sub: erpSub };
            break;
          }
          case "multi_path_reason": {
            // REAL WIRE (hotel 2026-06-01): prior `.reason/.analyze/.run ?? {note}` was a FALSE-WIRE.
            // Real API (singleton): explorePaths(MultiPathProblem) async / getAvailableApproaches(domain) /
            // getExplorationSummary(result). Default = list available approaches for a domain (cheap read);
            // sub='explore' runs the full multi-path exploration.
            _multiPathReasoning ??= (await import("../../engines/MultiPathReasoningEngine.js")).multiPathReasoningEngine;
            const mpr = params as { sub?: string; domain?: string; problem?: Record<string, unknown> };
            const mprSub = mpr.sub || "approaches";
            let mprData: unknown;
            switch (mprSub) {
              case "approaches":
                if (!mpr.domain || typeof mpr.domain !== "string") {
                  throw new Error("multi_path_reason: domain (string) required for sub='approaches'");
                }
                mprData = _multiPathReasoning.getAvailableApproaches(mpr.domain);
                break;
              case "explore": {
                const problem = (mpr.problem ?? params) as Record<string, unknown>;
                if (!problem || typeof problem !== "object" || !("problem" in problem || "goal" in problem)) {
                  throw new Error("multi_path_reason: sub='explore' requires a MultiPathProblem (problem + goal + domain)");
                }
                mprData = await _multiPathReasoning.explorePaths(problem);
                break;
              }
              default:
                throw new Error(`multi_path_reason: unknown sub '${mprSub}' (expected approaches | explore)`);
            }
            result = { success: true, data: mprData, sub: mprSub };
            break;
          }
          case "stream_vs_batch_reconcile": {
            // REAL WIRE (hotel 2026-06-01): prior `.reconcile/.analyze/.run ?? {note}` — `.reconcile` happened to
            // exist so this ACCIDENTALLY half-worked, but passed unvalidated params and could still fall to the
            // placeholder. Real API (singleton): reconcile(ReconcileInput) / stats(). Default = stats (safe read).
            _streamVsBatch ??= (await import("../../engines/StreamVsBatchReconciliationEngine.js")).streamVsBatchReconciliationEngine;
            const svb = params as { sub?: string; domain?: unknown; feature_group?: unknown; entity_id?: unknown; as_of_ts?: unknown; online_values?: unknown };
            const svbSub = svb.sub || "stats";
            let svbData: unknown;
            if (svbSub === "stats") {
              svbData = _streamVsBatch.stats();
            } else if (svbSub === "reconcile") {
              for (const k of ["domain", "feature_group", "entity_id", "as_of_ts", "online_values"] as const) {
                if (svb[k] == null) throw new Error(`stream_vs_batch_reconcile: '${k}' required for sub='reconcile'`);
              }
              svbData = _streamVsBatch.reconcile(params);
            } else {
              throw new Error(`stream_vs_batch_reconcile: unknown sub '${svbSub}' (expected stats | reconcile)`);
            }
            result = { success: true, data: svbData, sub: svbSub };
            break;
          }
          case "docustrata_customer_index_search": {
            // REAL WIRE (hotel 2026-06-01): prior `.search/.query/.find ?? {note}` was a FALSE-WIRE — the object
            // exposes isAvailable/getTotals/listCustomers/getCustomer/searchCustomers/findByPartNumber, not those
            // names. Default = search by query over the Docustrata customer index.
            _docustrataIndex ??= (await import("../../engines/DocustrataCustomerIndexEngine.js")).docustrataCustomerIndexEngine;
            const dci = params as { sub?: string; query?: string; customer?: string; part_number?: string };
            const dciSub = dci.sub || "search";
            let dciData: unknown;
            switch (dciSub) {
              case "available": dciData = _docustrataIndex.isAvailable(); break;
              case "totals": dciData = _docustrataIndex.getTotals(); break;
              case "customers": dciData = _docustrataIndex.listCustomers(); break;
              case "customer":
                if (!dci.customer) throw new Error("docustrata_customer_index_search: customer required for sub='customer'");
                dciData = _docustrataIndex.getCustomer(dci.customer);
                break;
              case "search":
                if (!dci.query) throw new Error("docustrata_customer_index_search: query required for sub='search'");
                dciData = _docustrataIndex.searchCustomers(dci.query);
                break;
              case "part":
                if (!dci.part_number) throw new Error("docustrata_customer_index_search: part_number required for sub='part'");
                dciData = _docustrataIndex.findByPartNumber(dci.part_number);
                break;
              default:
                throw new Error(`docustrata_customer_index_search: unknown sub '${dciSub}' (expected available | totals | customers | customer | search | part)`);
            }
            result = { success: true, data: dciData, sub: dciSub };
            break;
          }
          case "cost_efficiency_bridge_analyze": {
            // REAL WIRE (hotel 2026-06-01): prior `.analyze/.calculate/.run ?? {note}` was a FALSE-WIRE.
            // Real API (singleton): build(BridgeInputs) → ProgramCostReport. BridgeInputs carries two Map fields
            // (tools, toolPricing) JSON can't express directly, so we accept them as objects/entry-arrays and
            // reconstruct the Maps. Missing required field → loud throw (hotel soul: never fabricate a cost).
            _costEfficiencyBridge ??= (await import("../../engines/CostEfficiencyBridgeEngine.js")).costEfficiencyBridgeEngine;
            const ceb = params as Record<string, unknown>;
            for (const k of ["program_id", "blocks", "machine", "stock", "tools", "toolPricing", "material", "rates"] as const) {
              if (ceb[k] == null) {
                throw new Error(`cost_efficiency_bridge_analyze: required BridgeInputs field '${k}' is missing`);
              }
            }
            const toNumMap = (v: unknown): Map<number, unknown> => {
              if (v instanceof Map) return v as Map<number, unknown>;
              if (Array.isArray(v)) return new Map(v as [number, unknown][]);
              if (v && typeof v === "object") {
                return new Map(Object.entries(v as Record<string, unknown>).map(([k, val]) => [Number(k), val]));
              }
              throw new Error("cost_efficiency_bridge_analyze: tools/toolPricing must be a Map, [toolNo, value] entry-array, or object keyed by tool number");
            };
            const bridgeInputs = { ...ceb, tools: toNumMap(ceb.tools), toolPricing: toNumMap(ceb.toolPricing) };
            result = { success: true, data: _costEfficiencyBridge.build(bridgeInputs) };
            break;
          }
          case "xometry_quote_inputs_build": {
            // REAL WIRE (hotel 2026-06-01): prior `.build/.generate/.run ?? {note}` was a FALSE-WIRE.
            // Real API (singleton): quote(XometryQuoteInputs) → QuoteBreakdown (engine returns an empty
            // breakdown with a `reason` on invalid input — surfaced via the breakdown's own `ok` flag).
            _xometryQuoteInputs ??= (await import("../../engines/XometryStyleQuoteInputsEngine.js")).xometryStyleQuoteInputsEngine;
            result = { success: true, data: _xometryQuoteInputs.quote(params) };
            break;
          }
          case "quote_scenario_generate": {
            // REAL WIRE (hotel 2026-06-01): prior `.generate/.run/.create ?? {note}` — `.generate` existed so this
            // half-worked but unvalidated. Real API (singleton): generate(ScenarioGenOptions{count, seed?, ...})
            // → ScenarioBatch (engine validates count and returns a `reason` on invalid input).
            _quoteScenarioGenerator ??= (await import("../../engines/QuoteScenarioGeneratorEngine.js")).quoteScenarioGeneratorEngine;
            const qsg = params as { count?: number };
            if (!Number.isInteger(qsg.count) || (qsg.count ?? 0) <= 0) {
              throw new Error("quote_scenario_generate: count (positive integer) is required");
            }
            result = { success: true, data: _quoteScenarioGenerator.generate(params) };
            break;
          }

          // iter9 wire-unwired-loop: business/shop engines
          case "business_sync_stats": {
            const { businessSyncEngine } = await import("../../engines/BusinessSyncEngine.js");
            result = { success: true, data: (businessSyncEngine as any).getStats?.() ?? { engine: "BusinessSyncEngine", note: "method not callable" } };
            break;
          }
          case "cash_flow_project": {
            const { cashFlowProjectionEngine } = await import("../../engines/CashFlowProjectionEngine.js");
            const p = params as any;
            result = { success: true, data: (cashFlowProjectionEngine as any).project?.(p.horizonDays ?? 90, p.scheduledFlows ?? []) ?? { engine: "CashFlowProjectionEngine", note: "method not callable" } };
            break;
          }
          case "burden_rate_calc": {
            const { burdenRateEngine } = await import("../../engines/BurdenRateEngine.js");
            const p = params as any;
            result = { success: true, data: (burdenRateEngine as any).calculateBurdenRate?.(p.machineId ?? p.machine_id ?? "", p.periodMonths ?? 3) ?? { engine: "BurdenRateEngine", note: "method not callable" } };
            break;
          }
          case "vendor_manage": {
            // REAL WIRE (hotel 2026-06-01): prior `.run/.manage/.get(p) ?? {note}` was a FALSE-WIRE — `.run/.manage`
            // don't exist and `.get(p)` was mis-called with the whole params object (get expects a vendorId string).
            // Real API (singleton): create / get / update / search / list / scorecard / spendAnalysis / recordSpend
            // / getStats. Default = stats (safe read); mutating subs (create/update/record_spend) are explicit
            // (business soul: never silently mutate vendor/financial state).
            const { vendorEngine } = await import("../../engines/VendorEngine.js");
            const v = params as { sub?: string; vendor_id?: string; amount?: number; input?: any; updates?: any; status?: any };
            const vSub = v.sub || "stats";
            const needVid = (): string => {
              if (!v.vendor_id || typeof v.vendor_id !== "string") throw new Error(`vendor_manage: vendor_id (string) required for sub='${vSub}'`);
              return v.vendor_id;
            };
            let vData: unknown;
            switch (vSub) {
              case "stats": vData = vendorEngine.getStats(); break;
              case "list": vData = vendorEngine.list(v.status); break;
              case "get": vData = vendorEngine.get(needVid()); break;
              case "search": vData = vendorEngine.search((v.input ?? params) as any); break;
              case "scorecard": vData = vendorEngine.scorecard(needVid()); break;
              case "spend_analysis": vData = vendorEngine.spendAnalysis(needVid()); break;
              case "create":
                if (!v.input) throw new Error("vendor_manage: input (VendorCreateInput) required for sub='create'");
                vData = vendorEngine.create(v.input);
                break;
              case "update":
                if (!v.updates) throw new Error("vendor_manage: updates required for sub='update'");
                vData = vendorEngine.update(needVid(), v.updates);
                break;
              case "record_spend": {
                if (typeof v.amount !== "number") throw new Error("vendor_manage: amount (number) required for sub='record_spend'");
                const vid = needVid();
                vendorEngine.recordSpend(vid, v.amount);
                vData = { recorded: true, vendor_id: vid, amount: v.amount };
                break;
              }
              default: throw new Error(`vendor_manage: unknown sub '${vSub}' (expected stats | list | get | search | scorecard | spend_analysis | create | update | record_spend)`);
            }
            result = { success: true, data: vData, sub: vSub };
            break;
          }
          case "distribution_network_analyze": {
            // REAL WIRE (hotel 2026-06-01): prior `.analyze/.run ?? {note}` was a FALSE-WIRE (neither exists).
            // Real API (singleton): getNetworkMap / assessRisk / getBrandPreferences / getVendorsForCategory /
            // getCategoriesForVendor / recommendReorder / getStats. Default = network map.
            const { distributionNetworkEngine } = await import("../../engines/DistributionNetworkEngine.js");
            const d = params as { sub?: string; category?: any; vendor_id?: string };
            const dSub = d.sub || "network";
            let dData: unknown;
            switch (dSub) {
              case "network": dData = distributionNetworkEngine.getNetworkMap(); break;
              case "stats": dData = distributionNetworkEngine.getStats(); break;
              case "risk": dData = distributionNetworkEngine.assessRisk(); break;
              case "brands": dData = distributionNetworkEngine.getBrandPreferences(d.category); break;
              case "vendors_for_category":
                if (!d.category) throw new Error("distribution_network_analyze: category required for sub='vendors_for_category'");
                dData = distributionNetworkEngine.getVendorsForCategory(d.category);
                break;
              case "categories_for_vendor":
                if (!d.vendor_id) throw new Error("distribution_network_analyze: vendor_id required for sub='categories_for_vendor'");
                dData = distributionNetworkEngine.getCategoriesForVendor(d.vendor_id);
                break;
              case "reorder":
                if (!d.category) throw new Error("distribution_network_analyze: category required for sub='reorder'");
                dData = distributionNetworkEngine.recommendReorder(d.category);
                break;
              default: throw new Error(`distribution_network_analyze: unknown sub '${dSub}' (expected network | stats | risk | brands | vendors_for_category | categories_for_vendor | reorder)`);
            }
            result = { success: true, data: dData, sub: dSub };
            break;
          }
          case "business_doc_extract": {
            // REAL WIRE (hotel 2026-06-01): prior `.extract(p) ?? .run ?? {note}` — `.extract` exists so this
            // half-worked, but passed unvalidated params and could still fall to the placeholder. Real API
            // (singleton): extract(ExtractInput) / get / search / getPendingReview / getStats / approve / reject /
            // fuzzyMatchVendor. Default = stats (safe read); sub='extract' runs extraction.
            const { businessDocumentExtractorEngine } = await import("../../engines/BusinessDocumentExtractorEngine.js");
            const bd = params as { sub?: string; extraction_id?: string; input?: any; name?: string };
            const bdSub = bd.sub || "stats";
            let bdData: unknown;
            switch (bdSub) {
              case "stats": bdData = businessDocumentExtractorEngine.getStats(); break;
              case "pending": bdData = businessDocumentExtractorEngine.getPendingReview(); break;
              case "get":
                if (!bd.extraction_id) throw new Error("business_doc_extract: extraction_id required for sub='get'");
                bdData = businessDocumentExtractorEngine.get(bd.extraction_id);
                break;
              case "search": bdData = businessDocumentExtractorEngine.search((bd.input ?? {}) as any); break;
              case "extract":
                if (!bd.input) throw new Error("business_doc_extract: input (ExtractInput) required for sub='extract'");
                bdData = businessDocumentExtractorEngine.extract(bd.input);
                break;
              case "fuzzy_vendor":
                if (!bd.name) throw new Error("business_doc_extract: name (string) required for sub='fuzzy_vendor'");
                bdData = businessDocumentExtractorEngine.fuzzyMatchVendor(bd.name);
                break;
              default: throw new Error(`business_doc_extract: unknown sub '${bdSub}' (expected stats | pending | get | search | extract | fuzzy_vendor)`);
            }
            result = { success: true, data: bdData, sub: bdSub };
            break;
          }
          case "docustrata_ingest_and_post": {
            const { docustrataAccountingBridgeEngine } = await import(
              "../../engines/DocustrataAccountingBridgeEngine.js"
            );
            result = { success: true, data: docustrataAccountingBridgeEngine.ingestAndPost(params as any) };
            break;
          }
          case "docustrata_batch_ingest": {
            const { docustrataAccountingBridgeEngine } = await import(
              "../../engines/DocustrataAccountingBridgeEngine.js"
            );
            const p = params as any;
            const inputs = Array.isArray(p?.inputs) ? p.inputs : Array.isArray(p) ? p : [];
            result = { success: true, data: docustrataAccountingBridgeEngine.batchIngest(inputs) };
            break;
          }
          case "adaptive_shop_rate_record": {
            const { adaptiveShopRateEngine } = await import("../../engines/AdaptiveShopRateEngine.js");
            result = { success: true, data: adaptiveShopRateEngine.recordOutcome(params as any) };
            break;
          }
          case "adaptive_shop_rate_adapt": {
            const { adaptiveShopRateEngine } = await import("../../engines/AdaptiveShopRateEngine.js");
            const p = params as any;
            result = {
              success: true,
              data: adaptiveShopRateEngine.adaptShopRate(p?.machine_id ?? p?.machineId ?? "", p?.obsSigmaFraction),
            };
            break;
          }
          case "adaptive_shop_rate_get_prior": {
            const { adaptiveShopRateEngine } = await import("../../engines/AdaptiveShopRateEngine.js");
            const p = params as any;
            result = { success: true, data: adaptiveShopRateEngine.getPrior(p?.machine_id ?? p?.machineId ?? "") };
            break;
          }
          case "adaptive_shop_rate_analyze_margin": {
            const { adaptiveShopRateEngine } = await import("../../engines/AdaptiveShopRateEngine.js");
            const p = params as any;
            result = {
              success: true,
              data: adaptiveShopRateEngine.analyzeMargin(p?.machine_id ?? p?.machineId ?? ""),
            };
            break;
          }
          case "iso9001_validate": {
            const { iso9001QMSEngine } = await import("../../engines/ISO9001QMSEngine.js");
            result = { success: true, data: iso9001QMSEngine.validate(params as any) };
            break;
          }
          case "iso9001_list_clauses": {
            const { iso9001QMSEngine } = await import("../../engines/ISO9001QMSEngine.js");
            result = { success: true, data: { clauses: iso9001QMSEngine.listClauses() } };
            break;
          }
          case "realtime_financial_snapshot": {
            const { realTimeFinancialSnapshotEngine } = await import("../../engines/RealTimeFinancialSnapshotEngine.js");
            result = { success: true, data: await realTimeFinancialSnapshotEngine.snapshot(params as any) };
            break;
          }
          case "loto_initiate": {
            const { lotoLogEngine } = await import("../../engines/LOTOLogEngine.js");
            result = { success: true, data: lotoLogEngine.initiate(params as any) };
            break;
          }
          case "loto_add_authorized": {
            const { lotoLogEngine } = await import("../../engines/LOTOLogEngine.js");
            result = { success: true, data: lotoLogEngine.addAuthorizedEmployee(params as any) };
            break;
          }
          case "loto_transition": {
            const { lotoLogEngine } = await import("../../engines/LOTOLogEngine.js");
            result = { success: true, data: lotoLogEngine.transition(params as any) };
            break;
          }
          case "loto_get_event": {
            const { lotoLogEngine } = await import("../../engines/LOTOLogEngine.js");
            const p = params as { loto_event_id: string };
            result = { success: true, data: lotoLogEngine.getEvent(p.loto_event_id) };
            break;
          }
          case "loto_list_events": {
            const { lotoLogEngine } = await import("../../engines/LOTOLogEngine.js");
            result = { success: true, data: lotoLogEngine.listEvents(params as any) };
            break;
          }
          case "loto_audit": {
            const { lotoLogEngine } = await import("../../engines/LOTOLogEngine.js");
            result = { success: true, data: { chain: lotoLogEngine.audit(params as any) } };
            break;
          }
          case "safety_training_assign": {
            const { safetyTrainingRecordEngine } = await import("../../engines/SafetyTrainingRecordEngine.js");
            result = { success: true, data: safetyTrainingRecordEngine.assignTraining(params as any) };
            break;
          }
          case "safety_training_complete": {
            const { safetyTrainingRecordEngine } = await import("../../engines/SafetyTrainingRecordEngine.js");
            result = { success: true, data: safetyTrainingRecordEngine.recordCompletion(params as any) };
            break;
          }
          case "safety_training_status": {
            const { safetyTrainingRecordEngine } = await import("../../engines/SafetyTrainingRecordEngine.js");
            result = { success: true, data: { status: safetyTrainingRecordEngine.computeStatus(params as any) } };
            break;
          }
          case "safety_training_compliance_report": {
            const { safetyTrainingRecordEngine } = await import("../../engines/SafetyTrainingRecordEngine.js");
            result = { success: true, data: safetyTrainingRecordEngine.getEmployeeComplianceReport(params as any) };
            break;
          }
          case "safety_training_list_topics": {
            const { safetyTrainingRecordEngine } = await import("../../engines/SafetyTrainingRecordEngine.js");
            result = { success: true, data: { topics: safetyTrainingRecordEngine.listTopics() } };
            break;
          }
          case "sds_load": {
            const { sdsLibraryEngine } = await import("../../engines/SDSLibraryEngine.js");
            result = { success: true, data: sdsLibraryEngine.loadSDS(params as any) };
            break;
          }
          case "sds_find_by_cas": {
            const { sdsLibraryEngine } = await import("../../engines/SDSLibraryEngine.js");
            const p = params as { cas_number: string };
            result = { success: true, data: sdsLibraryEngine.findByCAS(p.cas_number) };
            break;
          }
          case "sds_find_by_product": {
            const { sdsLibraryEngine } = await import("../../engines/SDSLibraryEngine.js");
            const p = params as { query: string; active_only?: boolean };
            result = { success: true, data: sdsLibraryEngine.findByProductName(p.query, { active_only: p.active_only }) };
            break;
          }
          case "sds_find_by_hazard": {
            const { sdsLibraryEngine } = await import("../../engines/SDSLibraryEngine.js");
            const p = params as { hazard_class: string };
            result = { success: true, data: sdsLibraryEngine.findByHazardClass(p.hazard_class) };
            break;
          }
          case "sds_review_report": {
            const { sdsLibraryEngine } = await import("../../engines/SDSLibraryEngine.js");
            result = { success: true, data: sdsLibraryEngine.reviewReport(params as any) };
            break;
          }
          case "sds_revision_history": {
            const { sdsLibraryEngine } = await import("../../engines/SDSLibraryEngine.js");
            result = { success: true, data: { history: sdsLibraryEngine.getRevisionHistory(params as any) } };
            break;
          }
          case "sds_list_hazard_classes": {
            const { sdsLibraryEngine } = await import("../../engines/SDSLibraryEngine.js");
            result = { success: true, data: { hazard_classes: sdsLibraryEngine.listHazardClasses() } };
            break;
          }
          case "doc_register": {
            const { documentControlEngine } = await import("../../engines/DocumentControlEngine.js");
            result = { success: true, data: documentControlEngine.registerDocument(params as any) };
            break;
          }
          case "doc_transition": {
            const { documentControlEngine } = await import("../../engines/DocumentControlEngine.js");
            result = { success: true, data: documentControlEngine.transition(params as any) };
            break;
          }
          case "doc_revise": {
            const { documentControlEngine } = await import("../../engines/DocumentControlEngine.js");
            result = { success: true, data: documentControlEngine.reviseDocument(params as any) };
            break;
          }
          case "doc_issue_copy": {
            const { documentControlEngine } = await import("../../engines/DocumentControlEngine.js");
            result = { success: true, data: documentControlEngine.issueControlledCopy(params as any) };
            break;
          }
          case "doc_acknowledge_copy": {
            const { documentControlEngine } = await import("../../engines/DocumentControlEngine.js");
            result = { success: true, data: documentControlEngine.acknowledgeReceipt(params as any) };
            break;
          }
          case "doc_get": {
            const { documentControlEngine } = await import("../../engines/DocumentControlEngine.js");
            const p = params as { document_id: string };
            result = { success: true, data: documentControlEngine.getDocument(p.document_id) };
            break;
          }
          case "doc_list": {
            const { documentControlEngine } = await import("../../engines/DocumentControlEngine.js");
            result = { success: true, data: documentControlEngine.listDocuments(params as any) };
            break;
          }
          case "doc_active_revision": {
            const { documentControlEngine } = await import("../../engines/DocumentControlEngine.js");
            const p = params as { doc_number: string };
            result = { success: true, data: documentControlEngine.getActiveRevision(p.doc_number) };
            break;
          }
          case "doc_revision_chain": {
            const { documentControlEngine } = await import("../../engines/DocumentControlEngine.js");
            const p = params as { doc_number: string };
            result = { success: true, data: { chain: documentControlEngine.getRevisionChain(p.doc_number) } };
            break;
          }
          case "doc_list_copies": {
            const { documentControlEngine } = await import("../../engines/DocumentControlEngine.js");
            result = { success: true, data: documentControlEngine.listControlledCopies(params as any) };
            break;
          }
          case "shop_data_completeness_score": {
            // REAL WIRE (hotel 2026-06-01): prior `.score/.calculate/.run ?? {note}` was a FALSE-WIRE.
            // Real API (singleton): calculateCompleteness(profileId?) / getDomainGaps(domainId, profileId?) /
            // getRecommendations(profileId?), all async. Default = full completeness report.
            const { shopDataCompletenessEngine } = await import("../../engines/ShopDataCompletenessEngine.js");
            const sd = params as { sub?: string; profile_id?: string; domain_id?: any };
            const sdSub = sd.sub || "completeness";
            let sdData: unknown;
            switch (sdSub) {
              case "completeness": sdData = await shopDataCompletenessEngine.calculateCompleteness(sd.profile_id); break;
              case "gaps":
                if (!sd.domain_id) throw new Error("shop_data_completeness_score: domain_id required for sub='gaps'");
                sdData = await shopDataCompletenessEngine.getDomainGaps(sd.domain_id, sd.profile_id);
                break;
              case "recommendations": sdData = await shopDataCompletenessEngine.getRecommendations(sd.profile_id); break;
              default: throw new Error(`shop_data_completeness_score: unknown sub '${sdSub}' (expected completeness | gaps | recommendations)`);
            }
            result = { success: true, data: sdData, sub: sdSub };
            break;
          }
          case "make_vs_buy_analysis": {
            // REAL WIRE (hotel 2026-06-01): prior `.analyze/.run ?? {note}` was a FALSE-WIRE.
            // Real API (singleton): analyzeJob(MakeVsBuyJobInput) / breakevenAnalysis(OperationInput).
            const { makeVsBuyDecisionEngine } = await import("../../engines/MakeVsBuyDecisionEngine.js");
            const mb = params as { sub?: string; input?: any };
            const mbSub = mb.sub || "job";
            let mbData: unknown;
            switch (mbSub) {
              case "job":
                if (!mb.input) throw new Error("make_vs_buy_analysis: input (MakeVsBuyJobInput) required for sub='job'");
                mbData = makeVsBuyDecisionEngine.analyzeJob(mb.input);
                break;
              case "breakeven":
                if (!mb.input) throw new Error("make_vs_buy_analysis: input (OperationInput) required for sub='breakeven'");
                mbData = makeVsBuyDecisionEngine.breakevenAnalysis(mb.input);
                break;
              default: throw new Error(`make_vs_buy_analysis: unknown sub '${mbSub}' (expected job | breakeven)`);
            }
            result = { success: true, data: mbData, sub: mbSub };
            break;
          }
          // U-WIRE-BACKLOG-ERP — BusinessIntelligenceEngine strategic analyses (was unwired, 1489 LOC)
          // R12 fail-loud: throw on missing required params instead of returning silent stubs.
          case "bi_make_vs_buy_strategic": {
            const { BusinessIntelligenceEngine } = await import("../../engines/BusinessIntelligenceEngine.js");
            const p = params as any;
            if (p?.annualVolume == null || !p?.makeOption || !Array.isArray(p?.buyOptions) || !p?.strategicFactors) {
              throw new Error("bi_make_vs_buy_strategic requires: annualVolume, makeOption, buyOptions[], strategicFactors");
            }
            result = { success: true, data: BusinessIntelligenceEngine.analyzeMakeVsBuy(p.annualVolume, p.makeOption, p.buyOptions, p.strategicFactors) };
            break;
          }
          case "bi_upgrade_vs_outsource": {
            const { BusinessIntelligenceEngine } = await import("../../engines/BusinessIntelligenceEngine.js");
            const p = params as any;
            if (!p?.currentState || !p?.upgradeOption || !p?.outsourceOption) {
              throw new Error("bi_upgrade_vs_outsource requires: currentState, upgradeOption, outsourceOption");
            }
            result = { success: true, data: BusinessIntelligenceEngine.analyzeUpgradeVsOutsource(p.currentState, p.upgradeOption, p.outsourceOption, p.discountRate) };
            break;
          }
          case "bi_capital_investment": {
            const { BusinessIntelligenceEngine } = await import("../../engines/BusinessIntelligenceEngine.js");
            const p = params as any;
            if (p?.investmentCost == null || p?.annualBenefits == null || p?.annualCosts == null || p?.usefulLifeYears == null) {
              throw new Error("bi_capital_investment requires: investmentCost, annualBenefits, annualCosts, usefulLifeYears");
            }
            result = { success: true, data: BusinessIntelligenceEngine.analyzeCapitalInvestment(p.investmentCost, p.annualBenefits, p.annualCosts, p.usefulLifeYears, p.salvageValue, p.discountRate) };
            break;
          }
          case "bi_break_even": {
            const { BusinessIntelligenceEngine } = await import("../../engines/BusinessIntelligenceEngine.js");
            const p = params as any;
            if (p?.fixedCosts == null || p?.variableCostPerUnit == null || p?.sellingPricePerUnit == null) {
              throw new Error("bi_break_even requires: fixedCosts, variableCostPerUnit, sellingPricePerUnit");
            }
            result = { success: true, data: BusinessIntelligenceEngine.calculateBreakEvenAnalysis(p.fixedCosts, p.variableCostPerUnit, p.sellingPricePerUnit) };
            break;
          }
          case "bi_cost_drivers": {
            const { BusinessIntelligenceEngine } = await import("../../engines/BusinessIntelligenceEngine.js");
            const p = params as any;
            if (!Array.isArray(p?.costs) || p?.volume == null) {
              throw new Error("bi_cost_drivers requires: costs[], volume");
            }
            result = { success: true, data: BusinessIntelligenceEngine.analyzeCostDrivers(p.costs, p.volume) };
            break;
          }
          case "packing_slip_generate": {
            // REAL WIRE (hotel 2026-06-01): prior `.generate(p) ?? .build ?? .run ?? {note}` — `.generate` exists
            // so it half-worked unvalidated. Real API (singleton): generate(PackingSlipInput) -> PackingSlipResult.
            const { packingSlipEngine } = await import("../../engines/PackingSlipEngine.js");
            const ps = params as { input?: any; line_items?: any };
            const psInput = ps.input ?? params;
            if (!psInput || typeof psInput !== "object" || !(psInput as { line_items?: unknown }).line_items) {
              throw new Error("packing_slip_generate: input (PackingSlipInput with line_items) is required");
            }
            result = { success: true, data: packingSlipEngine.generate(psInput as any) };
            break;
          }
          case "saas_api_route_map": {
            // REAL WIRE (hotel 2026-06-01): prior `.getRouteMap(p) ?? .run ?? {note}` was a FALSE-WIRE — getRouteMap
            // is INTERNAL; the public entry is calculate(action, params) which routes sub-actions
            // (api_route_map / api_usage / api_rate_check / ...). Default sub_action = api_route_map.
            const { saasAPIEngine } = await import("../../engines/SaaSAPIEngine.js");
            const sa = params as { sub_action?: string };
            const saAction = sa.sub_action || "api_route_map";
            result = { success: true, data: saasAPIEngine.calculate(saAction, params as Record<string, any>), sub_action: saAction };
            break;
          }
          case "white_label_configure": {
            // REAL WIRE (hotel 2026-06-01): prior `.configure/.run ?? {note}` was a FALSE-WIRE (real method is
            // brandConfigure, not configure). Real API (singleton): brandStatus / getCurrentBrand / brandConfigure
            // / brandFleet / brandTools / brandTips / getFleetMachines / brandReset. Default = brandStatus (safe
            // read); brandConfigure/brandReset mutate -> explicit sub.
            const { whiteLabelConfigEngine } = await import("../../engines/WhiteLabelConfigEngine.js");
            const wl = params as { sub?: string; input?: any };
            const wlSub = wl.sub || "status";
            const needInput = (): any => { if (!wl.input) throw new Error(`white_label_configure: input required for sub='${wlSub}'`); return wl.input; };
            let wlData: unknown;
            switch (wlSub) {
              case "status": wlData = whiteLabelConfigEngine.brandStatus(); break;
              case "current": wlData = whiteLabelConfigEngine.getCurrentBrand(); break;
              case "fleet_machines": wlData = whiteLabelConfigEngine.getFleetMachines(); break;
              case "configure": wlData = whiteLabelConfigEngine.brandConfigure(needInput()); break;
              case "fleet": wlData = whiteLabelConfigEngine.brandFleet(needInput()); break;
              case "tools": wlData = whiteLabelConfigEngine.brandTools(needInput()); break;
              case "tips": wlData = whiteLabelConfigEngine.brandTips(needInput()); break;
              case "reset": wlData = whiteLabelConfigEngine.brandReset(); break;
              default: throw new Error(`white_label_configure: unknown sub '${wlSub}' (expected status | current | fleet_machines | configure | fleet | tools | tips | reset)`);
            }
            result = { success: true, data: wlData, sub: wlSub };
            break;
          }
          case "programmer_productivity_log": {
            // REAL WIRE (hotel 2026-06-01): prior `.log(p) ?? .run ?? {note}` — `.log` exists (and is a WRITE) so it
            // half-worked unvalidated. Real API (singleton): log / summary / achievements / digest / compare /
            // listAchievements / resetUser / listUsers. Default = listUsers (safe read); log mutates -> explicit.
            const { programmerProductivityEngine } = await import("../../engines/ProgrammerProductivityEngine.js");
            const pp = params as { sub?: string; input?: any; userId?: string; user_id?: string };
            const ppSub = pp.sub || "users";
            const uid = (): string => { const u = pp.userId ?? pp.user_id; if (!u) throw new Error(`programmer_productivity_log: userId required for sub='${ppSub}'`); return u; };
            let ppData: unknown;
            switch (ppSub) {
              case "users": ppData = programmerProductivityEngine.listUsers(); break;
              case "achievements_list": ppData = programmerProductivityEngine.listAchievements(); break;
              case "digest": ppData = programmerProductivityEngine.digest({ userId: uid() }); break;
              case "compare": ppData = programmerProductivityEngine.compare({ userId: uid() }); break;
              case "summary": ppData = programmerProductivityEngine.summary((pp.input ?? params) as any); break;
              case "achievements": ppData = programmerProductivityEngine.achievements((pp.input ?? params) as any); break;
              case "log":
                if (!pp.input) throw new Error("programmer_productivity_log: input required for sub='log'");
                ppData = programmerProductivityEngine.log(pp.input);
                break;
              default: throw new Error(`programmer_productivity_log: unknown sub '${ppSub}' (expected users | achievements_list | digest | compare | summary | achievements | log)`);
            }
            result = { success: true, data: ppData, sub: ppSub };
            break;
          }
          case "instructor_dashboard_manage": {
            // REAL WIRE (hotel 2026-06-01): prior `.run/.manage ?? {note}` was a FALSE-WIRE (neither exists).
            // Real API (singleton): createClass / enroll / getGrades / getAnalytics / getClass / listClasses /
            // deleteClass / getAssignments / reset. No safe no-arg default -> require an explicit sub.
            const { instructorDashboardEngine } = await import("../../engines/InstructorDashboardEngine.js");
            const ix = params as { sub?: string; input?: any; instructor_id?: string; class_id?: string };
            const ixSub = ix.sub;
            const needInput = (): any => { if (!ix.input) throw new Error(`instructor_dashboard_manage: input required for sub='${ixSub}'`); return ix.input; };
            let ixData: unknown;
            switch (ixSub) {
              case "classes":
                if (!ix.instructor_id) throw new Error("instructor_dashboard_manage: instructor_id required for sub='classes'");
                ixData = instructorDashboardEngine.listClasses(ix.instructor_id);
                break;
              case "class":
                if (!ix.class_id) throw new Error("instructor_dashboard_manage: class_id required for sub='class'");
                ixData = instructorDashboardEngine.getClass(ix.class_id);
                break;
              case "assignments":
                if (!ix.class_id) throw new Error("instructor_dashboard_manage: class_id required for sub='assignments'");
                ixData = instructorDashboardEngine.getAssignments(ix.class_id);
                break;
              case "grades": ixData = instructorDashboardEngine.getGrades(needInput()); break;
              case "analytics": ixData = instructorDashboardEngine.getAnalytics(needInput()); break;
              case "create_class": ixData = instructorDashboardEngine.createClass(needInput()); break;
              case "enroll": ixData = instructorDashboardEngine.enroll(needInput()); break;
              default: throw new Error("instructor_dashboard_manage: explicit sub required (classes | class | assignments | grades | analytics | create_class | enroll)");
            }
            result = { success: true, data: ixData, sub: ixSub };
            break;
          }
          case "quoting_engine_estimate": {
            // REAL WIRE (hotel 2026-06-01): prior `.estimate/.quote/.run ?? {note}` was a FALSE-WIRE (real method
            // is generateQuote). Real API (singleton): generateQuote(jobSpec, options?). Requires a jobSpec.
            const { quotingEngine } = await import("../../engines/QuotingEngine.js");
            const q = params as { job_spec?: any; jobSpec?: any; options?: any };
            const jobSpec = q.job_spec ?? q.jobSpec;
            if (!jobSpec) throw new Error("quoting_engine_estimate: job_spec (JobSpec) is required");
            result = { success: true, data: quotingEngine.generateQuote(jobSpec, q.options ?? {}) };
            break;
          }
          // ─── HOTEL/U-INTERNAL-AUDIT-CALENDAR — ISO 9001 §9.2 ───────────────
          case "internal_audit_schedule": {
            const { internalAuditCalendarEngine } = await import("../../engines/InternalAuditCalendarEngine.js");
            result = { success: true, data: internalAuditCalendarEngine.scheduleAudit(params as any) };
            break;
          }
          case "internal_audit_start": {
            const { internalAuditCalendarEngine } = await import("../../engines/InternalAuditCalendarEngine.js");
            result = { success: true, data: internalAuditCalendarEngine.startAudit(params as any) };
            break;
          }
          case "internal_audit_record_finding": {
            const { internalAuditCalendarEngine } = await import("../../engines/InternalAuditCalendarEngine.js");
            result = { success: true, data: internalAuditCalendarEngine.recordFinding(params as any) };
            break;
          }
          case "internal_audit_close_finding": {
            const { internalAuditCalendarEngine } = await import("../../engines/InternalAuditCalendarEngine.js");
            result = { success: true, data: internalAuditCalendarEngine.closeFinding(params as any) };
            break;
          }
          case "internal_audit_complete": {
            const { internalAuditCalendarEngine } = await import("../../engines/InternalAuditCalendarEngine.js");
            result = { success: true, data: internalAuditCalendarEngine.completeAudit(params as any) };
            break;
          }
          case "internal_audit_list_overdue": {
            const { internalAuditCalendarEngine } = await import("../../engines/InternalAuditCalendarEngine.js");
            result = { success: true, data: internalAuditCalendarEngine.listOverdue(params as any) };
            break;
          }
          case "internal_audit_annual_coverage": {
            const { internalAuditCalendarEngine } = await import("../../engines/InternalAuditCalendarEngine.js");
            result = { success: true, data: internalAuditCalendarEngine.annualCoverage(params as any) };
            break;
          }
          // ─── HOTEL/U-MANAGEMENT-REVIEW — ISO 9001 §9.3 ─────────────────────
          case "management_review_schedule": {
            const { managementReviewEngine } = await import("../../engines/ManagementReviewEngine.js");
            result = { success: true, data: managementReviewEngine.scheduleReview(params as any) };
            break;
          }
          case "management_review_convene": {
            const { managementReviewEngine } = await import("../../engines/ManagementReviewEngine.js");
            result = { success: true, data: managementReviewEngine.convene(params as any) };
            break;
          }
          case "management_review_record_inputs": {
            const { managementReviewEngine } = await import("../../engines/ManagementReviewEngine.js");
            result = { success: true, data: managementReviewEngine.recordInputs(params as any) };
            break;
          }
          case "management_review_record_output": {
            const { managementReviewEngine } = await import("../../engines/ManagementReviewEngine.js");
            result = { success: true, data: managementReviewEngine.recordOutput(params as any) };
            break;
          }
          case "management_review_add_action_item": {
            const { managementReviewEngine } = await import("../../engines/ManagementReviewEngine.js");
            result = { success: true, data: managementReviewEngine.addActionItem(params as any) };
            break;
          }
          case "management_review_update_action_item": {
            const { managementReviewEngine } = await import("../../engines/ManagementReviewEngine.js");
            result = { success: true, data: managementReviewEngine.updateActionItem(params as any) };
            break;
          }
          case "management_review_complete": {
            const { managementReviewEngine } = await import("../../engines/ManagementReviewEngine.js");
            result = { success: true, data: managementReviewEngine.completeReview(params as any) };
            break;
          }
          case "management_review_overdue_actions": {
            const { managementReviewEngine } = await import("../../engines/ManagementReviewEngine.js");
            result = { success: true, data: managementReviewEngine.listOverdueActionItems(params as any) };
            break;
          }
          case "management_review_prior_status": {
            const { managementReviewEngine } = await import("../../engines/ManagementReviewEngine.js");
            const p = params as any;
            result = { success: true, data: managementReviewEngine.priorReviewActionStatus(p.review_id) };
            break;
          }
          // ─── HOTEL/U-BID-WIN-CALIBRATOR — logistic markup optimizer ────────
          case "bid_win_record_outcome": {
            const { bidWinCalibratorEngine } = await import("../../engines/BidWinCalibratorEngine.js");
            result = { success: true, data: bidWinCalibratorEngine.recordOutcome(params as any) };
            break;
          }
          case "bid_win_calibrate": {
            const { bidWinCalibratorEngine } = await import("../../engines/BidWinCalibratorEngine.js");
            result = { success: true, data: bidWinCalibratorEngine.calibrate() };
            break;
          }
          case "bid_win_predict": {
            const { bidWinCalibratorEngine } = await import("../../engines/BidWinCalibratorEngine.js");
            result = { success: true, data: bidWinCalibratorEngine.predictWin(params as any) };
            break;
          }
          case "bid_win_optimal_markup": {
            const { bidWinCalibratorEngine } = await import("../../engines/BidWinCalibratorEngine.js");
            result = { success: true, data: bidWinCalibratorEngine.optimalMarkup(params as any) };
            break;
          }
          case "bid_win_get_model": {
            const { bidWinCalibratorEngine } = await import("../../engines/BidWinCalibratorEngine.js");
            result = { success: true, data: bidWinCalibratorEngine.getModel() };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-ROLE-ACADEMY-INJECTION ──────────────────────
          case "role_academy_list_roles": {
            const { employeeRoleAcademyInjectionEngine } = await import("../../engines/EmployeeRoleAcademyInjectionEngine.js");
            result = { success: true, data: employeeRoleAcademyInjectionEngine.listAllRoles() };
            break;
          }
          case "role_academy_get_curriculum": {
            const { employeeRoleAcademyInjectionEngine } = await import("../../engines/EmployeeRoleAcademyInjectionEngine.js");
            const p = params as any;
            result = { success: true, data: employeeRoleAcademyInjectionEngine.getRoleCurriculum(p.role) };
            break;
          }
          case "role_academy_set_employee_role": {
            const { employeeRoleAcademyInjectionEngine } = await import("../../engines/EmployeeRoleAcademyInjectionEngine.js");
            employeeRoleAcademyInjectionEngine.setEmployeeRole(params as any);
            result = { success: true, data: { ok: true } };
            break;
          }
          case "role_academy_get_employee_role": {
            const { employeeRoleAcademyInjectionEngine } = await import("../../engines/EmployeeRoleAcademyInjectionEngine.js");
            const p = params as any;
            result = { success: true, data: { role: employeeRoleAcademyInjectionEngine.getEmployeeRole(p.employee_id) } };
            break;
          }
          case "role_academy_inject_on_hire": {
            const { employeeRoleAcademyInjectionEngine } = await import("../../engines/EmployeeRoleAcademyInjectionEngine.js");
            result = { success: true, data: employeeRoleAcademyInjectionEngine.injectOnHire(params as any) };
            break;
          }
          case "role_academy_inject_on_promotion": {
            const { employeeRoleAcademyInjectionEngine } = await import("../../engines/EmployeeRoleAcademyInjectionEngine.js");
            result = { success: true, data: employeeRoleAcademyInjectionEngine.injectOnPromotion(params as any) };
            break;
          }
          case "role_academy_inject_on_incident": {
            const { employeeRoleAcademyInjectionEngine } = await import("../../engines/EmployeeRoleAcademyInjectionEngine.js");
            result = { success: true, data: employeeRoleAcademyInjectionEngine.injectOnIncident(params as any) };
            break;
          }
          case "role_academy_recommend": {
            const { employeeRoleAcademyInjectionEngine } = await import("../../engines/EmployeeRoleAcademyInjectionEngine.js");
            result = { success: true, data: employeeRoleAcademyInjectionEngine.recommend(params as any) };
            break;
          }
          case "role_academy_record_outcome": {
            const { employeeRoleAcademyInjectionEngine } = await import("../../engines/EmployeeRoleAcademyInjectionEngine.js");
            result = { success: true, data: employeeRoleAcademyInjectionEngine.recordOutcome(params as any) };
            break;
          }
          case "role_academy_list_assignments": {
            const { employeeRoleAcademyInjectionEngine } = await import("../../engines/EmployeeRoleAcademyInjectionEngine.js");
            result = { success: true, data: employeeRoleAcademyInjectionEngine.listAssignments(params as any) };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-PERFORMANCE-FEEDBACK ────────────────────────
          case "employee_perf_record_signal": {
            const { employeePerformanceFeedbackEngine } = await import("../../engines/EmployeePerformanceFeedbackEngine.js");
            result = { success: true, data: employeePerformanceFeedbackEngine.recordSignal(params as any) };
            break;
          }
          case "employee_perf_get_profile": {
            const { employeePerformanceFeedbackEngine } = await import("../../engines/EmployeePerformanceFeedbackEngine.js");
            const p = params as any;
            result = { success: true, data: employeePerformanceFeedbackEngine.getProfile(p.employee_id) };
            break;
          }
          case "employee_perf_generate_nudges": {
            const { employeePerformanceFeedbackEngine } = await import("../../engines/EmployeePerformanceFeedbackEngine.js");
            const p = params as any;
            result = { success: true, data: employeePerformanceFeedbackEngine.generateNudges(p.employee_id) };
            break;
          }
          case "employee_perf_assess_readiness": {
            const { employeePerformanceFeedbackEngine } = await import("../../engines/EmployeePerformanceFeedbackEngine.js");
            result = { success: true, data: employeePerformanceFeedbackEngine.assessRoleReadiness(params as any) };
            break;
          }
          case "employee_perf_team_rollup": {
            const { employeePerformanceFeedbackEngine } = await import("../../engines/EmployeePerformanceFeedbackEngine.js");
            result = { success: true, data: employeePerformanceFeedbackEngine.teamRollup(params as any) };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-SHIFT-SCHEDULE ──────────────────────────────
          case "shift_register_machine_qualification": {
            const { employeeShiftScheduleEngine } = await import("../../engines/EmployeeShiftScheduleEngine.js");
            result = { success: true, data: employeeShiftScheduleEngine.registerMachineQualification(params as any) };
            break;
          }
          case "shift_register_course_passed": {
            const { employeeShiftScheduleEngine } = await import("../../engines/EmployeeShiftScheduleEngine.js");
            employeeShiftScheduleEngine.registerCoursePassed(params as any);
            result = { success: true, data: { ok: true } };
            break;
          }
          case "shift_schedule": {
            const { employeeShiftScheduleEngine } = await import("../../engines/EmployeeShiftScheduleEngine.js");
            result = { success: true, data: employeeShiftScheduleEngine.scheduleShift(params as any) };
            break;
          }
          case "shift_cancel": {
            const { employeeShiftScheduleEngine } = await import("../../engines/EmployeeShiftScheduleEngine.js");
            result = { success: true, data: employeeShiftScheduleEngine.cancelShift(params as any) };
            break;
          }
          case "shift_daily_roster": {
            const { employeeShiftScheduleEngine } = await import("../../engines/EmployeeShiftScheduleEngine.js");
            result = { success: true, data: employeeShiftScheduleEngine.getDailyRoster(params as any) };
            break;
          }
          case "shift_employee_schedule": {
            const { employeeShiftScheduleEngine } = await import("../../engines/EmployeeShiftScheduleEngine.js");
            result = { success: true, data: employeeShiftScheduleEngine.getEmployeeSchedule(params as any) };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-PTO-ACCRUAL ─────────────────────────────────
          case "pto_compute_balance": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            const p = params as any;
            result = { success: true, data: employeePTOAccrualEngine.computeBalance(p.employee_id) };
            break;
          }
          case "pto_post_ledger": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            result = { success: true, data: employeePTOAccrualEngine.postLedger(params as any) };
            break;
          }
          case "pto_accrue_period": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            result = { success: true, data: employeePTOAccrualEngine.accruePeriod(params as any) };
            break;
          }
          case "pto_grant_annual_personal": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            result = { success: true, data: employeePTOAccrualEngine.grantAnnualPersonal(params as any) };
            break;
          }
          case "pto_submit_request": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            result = { success: true, data: employeePTOAccrualEngine.submitRequest(params as any) };
            break;
          }
          case "pto_approve_request": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            result = { success: true, data: employeePTOAccrualEngine.approveRequest(params as any) };
            break;
          }
          case "pto_reject_request": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            result = { success: true, data: employeePTOAccrualEngine.rejectRequest(params as any) };
            break;
          }
          case "pto_cancel_request": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            result = { success: true, data: employeePTOAccrualEngine.cancelRequest(params as any) };
            break;
          }
          case "pto_list_requests": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            result = { success: true, data: employeePTOAccrualEngine.listRequests(params as any) };
            break;
          }
          case "pto_get_approved_dates": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            result = { success: true, data: employeePTOAccrualEngine.getApprovedPTODates(params as any) };
            break;
          }
          case "pto_get_ledger": {
            const { employeePTOAccrualEngine } = await import("../../engines/EmployeePTOAccrualEngine.js");
            const p = params as any;
            result = { success: true, data: employeePTOAccrualEngine.getLedger(p.employee_id) };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-PAYROLL-GROSS-PAY ──────────────────────────
          case "payroll_compute_gross": {
            const { employeePayrollGrossPayEngine } = await import("../../engines/EmployeePayrollGrossPayEngine.js");
            result = { success: true, data: employeePayrollGrossPayEngine.computeGrossPay(params as any) };
            break;
          }
          case "payroll_reconcile_gross": {
            const { employeePayrollGrossPayEngine } = await import("../../engines/EmployeePayrollGrossPayEngine.js");
            result = { success: true, data: employeePayrollGrossPayEngine.reconcile(params as any) };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-DAILY-DIGEST ────────────────────────────────
          case "digest_build": {
            const { employeeDailyDigestEngine } = await import("../../engines/EmployeeDailyDigestEngine.js");
            result = { success: true, data: employeeDailyDigestEngine.buildDigest(params as any) };
            break;
          }
          // ─── HOTEL/U-MANAGER-DAILY-DASHBOARD ──────────────────────────────
          case "manager_dashboard_build": {
            const { managerDailyDashboardEngine } = await import("../../engines/ManagerDailyDashboardEngine.js");
            result = { success: true, data: managerDailyDashboardEngine.buildDashboard(params as any) };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-SHIFT-SWAP ──────────────────────────────────
          case "swap_propose": {
            const { employeeShiftSwapEngine } = await import("../../engines/EmployeeShiftSwapEngine.js");
            result = { success: true, data: employeeShiftSwapEngine.proposeSwap(params as any) };
            break;
          }
          case "swap_counterparty_respond": {
            const { employeeShiftSwapEngine } = await import("../../engines/EmployeeShiftSwapEngine.js");
            result = { success: true, data: employeeShiftSwapEngine.counterpartyRespond(params as any) };
            break;
          }
          case "swap_manager_approve": {
            const { employeeShiftSwapEngine } = await import("../../engines/EmployeeShiftSwapEngine.js");
            result = { success: true, data: employeeShiftSwapEngine.managerApprove(params as any) };
            break;
          }
          case "swap_mark_executed": {
            const { employeeShiftSwapEngine } = await import("../../engines/EmployeeShiftSwapEngine.js");
            result = { success: true, data: employeeShiftSwapEngine.markExecuted(params as any) };
            break;
          }
          case "swap_cancel": {
            const { employeeShiftSwapEngine } = await import("../../engines/EmployeeShiftSwapEngine.js");
            result = { success: true, data: employeeShiftSwapEngine.cancel(params as any) };
            break;
          }
          case "swap_list": {
            const { employeeShiftSwapEngine } = await import("../../engines/EmployeeShiftSwapEngine.js");
            result = { success: true, data: employeeShiftSwapEngine.listSwaps(params as any) };
            break;
          }
          case "swap_register_qualification": {
            const { employeeShiftSwapEngine } = await import("../../engines/EmployeeShiftSwapEngine.js");
            employeeShiftSwapEngine.registerMachineQualification(params as any);
            result = { success: true, data: { ok: true } };
            break;
          }
          case "swap_register_course_passed": {
            const { employeeShiftSwapEngine } = await import("../../engines/EmployeeShiftSwapEngine.js");
            employeeShiftSwapEngine.registerCoursePassed(params as any);
            result = { success: true, data: { ok: true } };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-TASK-HANDOFF ────────────────────────────────
          case "handoff_propose": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            result = { success: true, data: employeeTaskHandoffEngine.proposeHandoff(params as any) };
            break;
          }
          case "handoff_counterparty_respond": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            result = { success: true, data: employeeTaskHandoffEngine.counterpartyRespond(params as any) };
            break;
          }
          case "handoff_manager_approve": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            result = { success: true, data: employeeTaskHandoffEngine.managerApprove(params as any) };
            break;
          }
          case "handoff_mark_executed": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            result = { success: true, data: employeeTaskHandoffEngine.markExecuted(params as any) };
            break;
          }
          case "handoff_cancel": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            result = { success: true, data: employeeTaskHandoffEngine.cancel(params as any) };
            break;
          }
          case "handoff_list": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            result = { success: true, data: employeeTaskHandoffEngine.listHandoffs(params as any) };
            break;
          }
          case "handoff_stalled": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            result = { success: true, data: employeeTaskHandoffEngine.listStalledHandoffs(params as any) };
            break;
          }
          case "handoff_waste_summary": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            result = { success: true, data: employeeTaskHandoffEngine.wasteSummary() };
            break;
          }
          case "handoff_register_rank": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            employeeTaskHandoffEngine.registerRank(params as any);
            result = { success: true, data: { ok: true } };
            break;
          }
          case "handoff_register_qualification": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            employeeTaskHandoffEngine.registerMachineQualification(params as any);
            result = { success: true, data: { ok: true } };
            break;
          }
          case "handoff_register_course_passed": {
            const { employeeTaskHandoffEngine } = await import("../../engines/EmployeeTaskHandoffEngine.js");
            employeeTaskHandoffEngine.registerCoursePassed(params as any);
            result = { success: true, data: { ok: true } };
            break;
          }
          // ─── HOTEL/U-KAIZEN-LEAN-SIGMA — DOWNTIME + DMAIC + Cpk gate ──────
          case "kaizen_observe_waste": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.observeWaste(params as any) };
            break;
          }
          case "kaizen_waste_ledger": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.wasteLedger(params as any) };
            break;
          }
          case "kaizen_waste_summary": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.wasteSummary() };
            break;
          }
          case "kaizen_open_event": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.openEvent(params as any) };
            break;
          }
          case "kaizen_advance_event": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.advanceEvent(params as any) };
            break;
          }
          case "kaizen_close_event": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.closeEvent(params as any) };
            break;
          }
          case "kaizen_list_events": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.listEvents(params as any) };
            break;
          }
          case "kaizen_calc_cpk": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.calculateCpk(params as any) };
            break;
          }
          case "kaizen_six_sigma_gate": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.sixSigmaGate(params as any) };
            break;
          }
          case "kaizen_submit_suggestion": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.submitSuggestion(params as any) };
            break;
          }
          case "kaizen_triage_suggestion": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.triageSuggestion(params as any) };
            break;
          }
          case "kaizen_list_suggestions": {
            const { kaizenLeanSigmaEngine } = await import("../../engines/KaizenLeanSigmaEngine.js");
            result = { success: true, data: kaizenLeanSigmaEngine.listSuggestions(params as any) };
            break;
          }
          // ─── HOTEL/U-MACHINE-DOMAIN-ACADEMY — specialist ladder per machine ─
          case "domain_academy_enroll": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            result = { success: true, data: employeeMachineDomainAcademyEngine.enroll(params as any) };
            break;
          }
          case "domain_academy_enroll_full_path": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            result = { success: true, data: employeeMachineDomainAcademyEngine.enrollFullPath(params as any) };
            break;
          }
          case "domain_academy_mark_passed": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            result = { success: true, data: employeeMachineDomainAcademyEngine.markPassed(params as any) };
            break;
          }
          case "domain_academy_mark_failed": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            result = { success: true, data: employeeMachineDomainAcademyEngine.markFailed(params as any) };
            break;
          }
          case "domain_academy_promote": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            result = { success: true, data: employeeMachineDomainAcademyEngine.promote(params as any) };
            break;
          }
          case "domain_academy_report_path": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            result = { success: true, data: employeeMachineDomainAcademyEngine.reportPath(params as any) };
            break;
          }
          case "domain_academy_list_assignments": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            result = { success: true, data: employeeMachineDomainAcademyEngine.listAssignments(params as any) };
            break;
          }
          case "domain_academy_list_transitions": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            result = { success: true, data: employeeMachineDomainAcademyEngine.listTransitions(params as any) };
            break;
          }
          case "domain_academy_get_curriculum": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            const p = params as { domain: any; tier: any };
            result = { success: true, data: employeeMachineDomainAcademyEngine.getDomainCurriculum(p.domain, p.tier) };
            break;
          }
          case "domain_academy_list_domains": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            result = { success: true, data: { domains: employeeMachineDomainAcademyEngine.listDomains(), tiers: employeeMachineDomainAcademyEngine.listTiers() } };
            break;
          }
          case "domain_academy_map_course_to_machines": {
            const { employeeMachineDomainAcademyEngine } = await import("../../engines/EmployeeMachineDomainAcademyEngine.js");
            employeeMachineDomainAcademyEngine.mapCourseToMachines(params as any);
            result = { success: true, data: { ok: true } };
            break;
          }
          // ─── HOTEL/U-DEPARTMENT-ENGINE (G1) ───────────────────────────────
          case "dept_create": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            result = { success: true, data: departmentEngine.createDepartment(params as any) };
            break;
          }
          case "dept_get": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            const p = params as { code: string };
            result = { success: true, data: departmentEngine.getDepartment(p.code) };
            break;
          }
          case "dept_list": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            result = { success: true, data: departmentEngine.listDepartments(params as any) };
            break;
          }
          case "dept_reassign_manager": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            result = { success: true, data: departmentEngine.reassignManager(params as any) };
            break;
          }
          case "dept_add_member": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            result = { success: true, data: departmentEngine.addMember(params as any) };
            break;
          }
          case "dept_remove_member": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            result = { success: true, data: departmentEngine.removeMember(params as any) };
            break;
          }
          case "dept_rename": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            result = { success: true, data: departmentEngine.rename(params as any) };
            break;
          }
          case "dept_set_machine_domain": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            result = { success: true, data: departmentEngine.setMachineDomain(params as any) };
            break;
          }
          case "dept_set_parent": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            result = { success: true, data: departmentEngine.setParent(params as any) };
            break;
          }
          case "dept_set_kpi_rollup": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            result = { success: true, data: departmentEngine.setKpiRollup(params as any) };
            break;
          }
          case "dept_get_rollup": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            const p = params as { code: string };
            result = { success: true, data: departmentEngine.getRollup(p.code) };
            break;
          }
          case "dept_ancestor_chain": {
            const { departmentEngine } = await import("../../engines/DepartmentEngine.js");
            const p = params as { code: string };
            result = { success: true, data: { chain: departmentEngine.ancestorChain(p.code) } };
            break;
          }
          // ─── HOTEL/U-MANAGER-REGISTRY (G2) ────────────────────────────────
          case "mgr_register": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            result = { success: true, data: managerRegistryEngine.register(params as any) };
            break;
          }
          case "mgr_get": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            const p = params as { employee_id: string };
            result = { success: true, data: managerRegistryEngine.getEmployee(p.employee_id) };
            break;
          }
          case "mgr_list": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            result = { success: true, data: managerRegistryEngine.listEmployees(params as any) };
            break;
          }
          case "mgr_promote": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            result = { success: true, data: managerRegistryEngine.promote(params as any) };
            break;
          }
          case "mgr_demote": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            result = { success: true, data: managerRegistryEngine.demote(params as any) };
            break;
          }
          case "mgr_reassign_dept": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            result = { success: true, data: managerRegistryEngine.reassignDepartment(params as any) };
            break;
          }
          case "mgr_set_reports_to": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            result = { success: true, data: managerRegistryEngine.setReportsTo(params as any) };
            break;
          }
          case "mgr_deactivate": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            result = { success: true, data: managerRegistryEngine.deactivate(params as any) };
            break;
          }
          case "mgr_reactivate": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            result = { success: true, data: managerRegistryEngine.reactivate(params as any) };
            break;
          }
          case "mgr_can_approve": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            const p = params as { approver_employee_id: string; subject_employee_id: string };
            result = { success: true, data: { can_approve: managerRegistryEngine.canManagerApprove(p.approver_employee_id, p.subject_employee_id) } };
            break;
          }
          case "mgr_reports_to_chain": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            const p = params as { employee_id: string };
            result = { success: true, data: { chain: managerRegistryEngine.reportsToChain(p.employee_id) } };
            break;
          }
          case "mgr_direct_reports": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            const p = params as { manager_employee_id: string };
            result = { success: true, data: managerRegistryEngine.directReports(p.manager_employee_id) };
            break;
          }
          case "mgr_rank_order": {
            const { managerRegistryEngine } = await import("../../engines/ManagerRegistryEngine.js");
            result = { success: true, data: { ranks: managerRegistryEngine.rankOrder() } };
            break;
          }
          // ─── HOTEL/U-AI-PROPOSAL-APPROVAL-QUEUE (G5) ──────────────────────
          case "aiprop_submit": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            result = { success: true, data: aiProposalApprovalQueueEngine.submit(params as any) };
            break;
          }
          case "aiprop_begin_review": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            result = { success: true, data: aiProposalApprovalQueueEngine.beginReview(params as any) };
            break;
          }
          case "aiprop_approve": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            result = { success: true, data: aiProposalApprovalQueueEngine.approve(params as any) };
            break;
          }
          case "aiprop_reject": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            result = { success: true, data: aiProposalApprovalQueueEngine.reject(params as any) };
            break;
          }
          case "aiprop_edit_and_approve": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            result = { success: true, data: aiProposalApprovalQueueEngine.editAndApprove(params as any) };
            break;
          }
          case "aiprop_withdraw": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            result = { success: true, data: aiProposalApprovalQueueEngine.withdraw(params as any) };
            break;
          }
          case "aiprop_expire_overdue": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            result = { success: true, data: { expired_ids: aiProposalApprovalQueueEngine.expireOverdue(params as any) } };
            break;
          }
          case "aiprop_list_queue": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            result = { success: true, data: aiProposalApprovalQueueEngine.listQueue(params as any) };
            break;
          }
          case "aiprop_get": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            const p = params as { proposal_id: string };
            result = { success: true, data: aiProposalApprovalQueueEngine.getProposal(p.proposal_id) };
            break;
          }
          case "aiprop_stats": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            result = { success: true, data: aiProposalApprovalQueueEngine.stats(params as any) };
            break;
          }
          case "aiprop_set_admin_min_rank": {
            const { aiProposalApprovalQueueEngine } = await import("../../engines/AIProposalApprovalQueueEngine.js");
            const p = params as { rank: any };
            aiProposalApprovalQueueEngine.setAdminMinRank(p.rank);
            result = { success: true, data: { admin_min_rank: aiProposalApprovalQueueEngine.getAdminMinRank() } };
            break;
          }
          // ─── HOTEL/U-AUTO-JOB-SCHEDULER (G3) ──────────────────────────────
          case "auto_sched_build_diff": {
            const { automatedJobSchedulerEngine } = await import("../../engines/AutomatedJobSchedulerEngine.js");
            result = { success: true, data: automatedJobSchedulerEngine.buildSchedulerDiff(params as any) };
            break;
          }
          case "auto_sched_submit_proposal": {
            const { automatedJobSchedulerEngine } = await import("../../engines/AutomatedJobSchedulerEngine.js");
            const proposal_id = automatedJobSchedulerEngine.submitProposal(params as any);
            result = { success: true, data: { proposal_id } };
            break;
          }
          case "auto_sched_build_and_submit": {
            const { automatedJobSchedulerEngine } = await import("../../engines/AutomatedJobSchedulerEngine.js");
            result = { success: true, data: automatedJobSchedulerEngine.buildAndSubmit(params as any) };
            break;
          }
          case "auto_sched_history": {
            const { automatedJobSchedulerEngine } = await import("../../engines/AutomatedJobSchedulerEngine.js");
            result = { success: true, data: { history: automatedJobSchedulerEngine.history() } };
            break;
          }
          case "auto_sched_system_viz_roost": {
            const { automatedJobSchedulerEngine } = await import("../../engines/AutomatedJobSchedulerEngine.js");
            result = { success: true, data: automatedJobSchedulerEngine.systemVizRoost() };
            break;
          }
          // ─── HOTEL/U-AUTO-TASK-DELEGATOR (G4) ─────────────────────────────
          case "auto_deleg_build_proposal": {
            const { automatedTaskDelegatorEngine } = await import("../../engines/AutomatedTaskDelegatorEngine.js");
            result = { success: true, data: automatedTaskDelegatorEngine.buildProposal(params as any) };
            break;
          }
          case "auto_deleg_submit_proposal": {
            const { automatedTaskDelegatorEngine } = await import("../../engines/AutomatedTaskDelegatorEngine.js");
            const proposal_id = automatedTaskDelegatorEngine.submitProposal(params as any);
            result = { success: true, data: { proposal_id } };
            break;
          }
          case "auto_deleg_build_and_submit": {
            const { automatedTaskDelegatorEngine } = await import("../../engines/AutomatedTaskDelegatorEngine.js");
            result = { success: true, data: automatedTaskDelegatorEngine.buildAndSubmit(params as any) };
            break;
          }
          case "auto_deleg_history": {
            const { automatedTaskDelegatorEngine } = await import("../../engines/AutomatedTaskDelegatorEngine.js");
            result = { success: true, data: { history: automatedTaskDelegatorEngine.history() } };
            break;
          }
          case "auto_deleg_system_viz_roost": {
            const { automatedTaskDelegatorEngine } = await import("../../engines/AutomatedTaskDelegatorEngine.js");
            result = { success: true, data: automatedTaskDelegatorEngine.systemVizRoost() };
            break;
          }
          // ─── HOTEL/U-AI-SUMMARY-WRITER (G6) ───────────────────────────────
          case "ai_summary_build_daily_employee": {
            const { aiSummaryWriterEngine } = await import("../../engines/AISummaryWriterEngine.js");
            result = { success: true, data: aiSummaryWriterEngine.buildDailyEmployeeSummary(params as any) };
            break;
          }
          case "ai_summary_build_weekly_department": {
            const { aiSummaryWriterEngine } = await import("../../engines/AISummaryWriterEngine.js");
            result = { success: true, data: aiSummaryWriterEngine.buildWeeklyDepartmentSummary(params as any) };
            break;
          }
          case "ai_summary_build_monthly_customer": {
            const { aiSummaryWriterEngine } = await import("../../engines/AISummaryWriterEngine.js");
            const p = params as { metrics: any; customer_dept_code: string };
            result = { success: true, data: aiSummaryWriterEngine.buildMonthlyCustomerSummary(p.metrics, p.customer_dept_code) };
            break;
          }
          case "ai_summary_submit_draft": {
            const { aiSummaryWriterEngine } = await import("../../engines/AISummaryWriterEngine.js");
            const proposal_id = aiSummaryWriterEngine.submitDraft(params as any);
            result = { success: true, data: { proposal_id } };
            break;
          }
          case "ai_summary_classify_cpk": {
            const { aiSummaryWriterEngine } = await import("../../engines/AISummaryWriterEngine.js");
            const p = params as { cpk: number };
            result = { success: true, data: { verdict: aiSummaryWriterEngine.classifyCpk(p.cpk) } };
            break;
          }
          case "ai_summary_allowed_cadences": {
            const { allowedCadences, allowedSubjectKinds } = await import("../../engines/AISummaryWriterEngine.js");
            result = { success: true, data: { cadences: allowedCadences(), subject_kinds: allowedSubjectKinds() } };
            break;
          }
          case "ai_summary_system_viz_roost": {
            const { aiSummaryWriterEngine } = await import("../../engines/AISummaryWriterEngine.js");
            result = { success: true, data: aiSummaryWriterEngine.systemVizRoost() };
            break;
          }
          // ─── HOTEL/U-DEPT-AUDIT-DASHBOARD (G7) ────────────────────────────
          case "dept_audit_build_row": {
            const { departmentAuditDashboardEngine } = await import("../../engines/DepartmentAuditDashboardEngine.js");
            result = { success: true, data: departmentAuditDashboardEngine.buildRow(params as any) };
            break;
          }
          case "dept_audit_system_viz_roost": {
            const { departmentAuditDashboardEngine } = await import("../../engines/DepartmentAuditDashboardEngine.js");
            result = { success: true, data: departmentAuditDashboardEngine.systemVizRoost() };
            break;
          }
          // ─── HOTEL/U-AUDIT-CAPA-BRIDGE (G13) ──────────────────────────────
          case "audit_capa_create": {
            const { auditFindingToCAPABridgeEngine } = await import("../../engines/AuditFindingToCAPABridgeEngine.js");
            result = { success: true, data: auditFindingToCAPABridgeEngine.createCapaFromFinding(params as any) };
            break;
          }
          case "audit_capa_get_kaizen_for_finding": {
            const { auditFindingToCAPABridgeEngine } = await import("../../engines/AuditFindingToCAPABridgeEngine.js");
            const p = params as { finding_id: string };
            result = { success: true, data: { kaizen_event_id: auditFindingToCAPABridgeEngine.getKaizenEventForFinding(p.finding_id) } };
            break;
          }
          case "audit_capa_get_finding_for_kaizen": {
            const { auditFindingToCAPABridgeEngine } = await import("../../engines/AuditFindingToCAPABridgeEngine.js");
            const p = params as { kaizen_event_id: string };
            result = { success: true, data: { finding_id: auditFindingToCAPABridgeEngine.getFindingForKaizenEvent(p.kaizen_event_id) } };
            break;
          }
          case "audit_capa_list": {
            const { auditFindingToCAPABridgeEngine } = await import("../../engines/AuditFindingToCAPABridgeEngine.js");
            result = { success: true, data: auditFindingToCAPABridgeEngine.listBridges(params as any) };
            break;
          }
          case "audit_capa_system_viz_roost": {
            const { auditFindingToCAPABridgeEngine } = await import("../../engines/AuditFindingToCAPABridgeEngine.js");
            result = { success: true, data: auditFindingToCAPABridgeEngine.systemVizRoost() };
            break;
          }
          // ─── HOTEL/U-APPROVAL-CHAIN (G8) ──────────────────────────────────
          case "appr_chain_open": {
            const { approvalChainEngine } = await import("../../engines/ApprovalChainEngine.js");
            result = { success: true, data: approvalChainEngine.open(params as any) };
            break;
          }
          case "appr_chain_approve_step": {
            const { approvalChainEngine } = await import("../../engines/ApprovalChainEngine.js");
            result = { success: true, data: approvalChainEngine.approveStep(params as any) };
            break;
          }
          case "appr_chain_reject_step": {
            const { approvalChainEngine } = await import("../../engines/ApprovalChainEngine.js");
            result = { success: true, data: approvalChainEngine.rejectStep(params as any) };
            break;
          }
          case "appr_chain_withdraw": {
            const { approvalChainEngine } = await import("../../engines/ApprovalChainEngine.js");
            result = { success: true, data: approvalChainEngine.withdraw(params as any) };
            break;
          }
          case "appr_chain_get": {
            const { approvalChainEngine } = await import("../../engines/ApprovalChainEngine.js");
            const p = params as { chain_id: string };
            result = { success: true, data: approvalChainEngine.getChain(p.chain_id) };
            break;
          }
          case "appr_chain_list": {
            const { approvalChainEngine } = await import("../../engines/ApprovalChainEngine.js");
            result = { success: true, data: approvalChainEngine.listChains(params as any) };
            break;
          }
          case "appr_chain_system_viz_roost": {
            const { approvalChainEngine } = await import("../../engines/ApprovalChainEngine.js");
            result = { success: true, data: approvalChainEngine.systemVizRoost() };
            break;
          }
          // ─── HOTEL/U-RFQ-TO-ORDER (G9) ────────────────────────────────────
          case "rfq_receive": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            result = { success: true, data: rfqToOrderOrchestratorEngine.receiveRfq(params as any) };
            break;
          }
          case "rfq_draft_quote": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            result = { success: true, data: rfqToOrderOrchestratorEngine.draftQuote(params as any) };
            break;
          }
          case "rfq_mark_admin_approved": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            result = { success: true, data: rfqToOrderOrchestratorEngine.markAdminApproved(params as any) };
            break;
          }
          case "rfq_mark_admin_rejected": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            result = { success: true, data: rfqToOrderOrchestratorEngine.markAdminRejected(params as any) };
            break;
          }
          case "rfq_mark_sent_to_customer": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            result = { success: true, data: rfqToOrderOrchestratorEngine.markSentToCustomer(params as any) };
            break;
          }
          case "rfq_mark_customer_accepted": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            result = { success: true, data: rfqToOrderOrchestratorEngine.markCustomerAccepted(params as any) };
            break;
          }
          case "rfq_mark_customer_rejected": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            result = { success: true, data: rfqToOrderOrchestratorEngine.markCustomerRejected(params as any) };
            break;
          }
          case "rfq_expire_overdue": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            const expired_ids = rfqToOrderOrchestratorEngine.expireOverdue(params as any);
            result = { success: true, data: { expired_ids } };
            break;
          }
          case "rfq_get": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            const p = params as { record_id: string };
            result = { success: true, data: rfqToOrderOrchestratorEngine.getRecord(p.record_id) };
            break;
          }
          case "rfq_list": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            result = { success: true, data: rfqToOrderOrchestratorEngine.listRecords(params as any) };
            break;
          }
          case "rfq_system_viz_roost": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            result = { success: true, data: rfqToOrderOrchestratorEngine.systemVizRoost() };
            break;
          }
          // ─── HOTEL/U-LOGISTICS-DASHBOARD (G10) ────────────────────────────
          case "logistics_build_dashboard": {
            const { logisticsDashboardEngine } = await import("../../engines/LogisticsDashboardEngine.js");
            result = { success: true, data: logisticsDashboardEngine.buildDashboard(params as any) };
            break;
          }
          case "logistics_system_viz_roost": {
            const { logisticsDashboardEngine } = await import("../../engines/LogisticsDashboardEngine.js");
            result = { success: true, data: logisticsDashboardEngine.systemVizRoost() };
            break;
          }
          // ─── HOTEL/U-FIN-INVARIANT-GATE (G14) ─────────────────────────────
          case "fin_invariant_validate_double_entry": {
            const { financialInvariantGateEngine } = await import("../../engines/HotelGateEngines.js");
            const p = params as { entry: any };
            result = { success: true, data: financialInvariantGateEngine.validateDoubleEntry(p.entry) };
            break;
          }
          case "fin_invariant_validate_trial_balance": {
            const { financialInvariantGateEngine } = await import("../../engines/HotelGateEngines.js");
            const p = params as { entries: any };
            result = { success: true, data: financialInvariantGateEngine.validateTrialBalance(p.entries) };
            break;
          }
          case "fin_invariant_validate_no_posted_overwrite": {
            const { financialInvariantGateEngine } = await import("../../engines/HotelGateEngines.js");
            result = { success: true, data: financialInvariantGateEngine.validateNoPostedOverwrite(params as any) };
            break;
          }
          case "fin_invariant_system_viz_roost": {
            const { financialInvariantGateEngine } = await import("../../engines/HotelGateEngines.js");
            result = { success: true, data: financialInvariantGateEngine.systemVizRoost() };
            break;
          }
          // ─── HOTEL/U-PII-REDACTION (G15) ──────────────────────────────────
          case "pii_redact_ssn": {
            const { piiRedactionEngine } = await import("../../engines/HotelGateEngines.js");
            const p = params as { raw: string };
            result = { success: true, data: { redacted: piiRedactionEngine.redactSSN(p.raw) } };
            break;
          }
          case "pii_redact_credit_card": {
            const { piiRedactionEngine } = await import("../../engines/HotelGateEngines.js");
            const p = params as { raw: string };
            result = { success: true, data: { redacted: piiRedactionEngine.redactCreditCard(p.raw) } };
            break;
          }
          case "pii_scrub": {
            const { piiRedactionEngine } = await import("../../engines/HotelGateEngines.js");
            const p = params as { value: unknown };
            result = { success: true, data: { scrubbed: piiRedactionEngine.scrub(p.value) } };
            break;
          }
          case "pii_detect_violations": {
            const { piiRedactionEngine } = await import("../../engines/HotelGateEngines.js");
            const p = params as { payload: unknown };
            result = { success: true, data: { violations: piiRedactionEngine.detectViolations(p.payload) } };
            break;
          }
          case "pii_system_viz_roost": {
            const { piiRedactionEngine } = await import("../../engines/HotelGateEngines.js");
            result = { success: true, data: piiRedactionEngine.systemVizRoost() };
            break;
          }
          // ─── HOTEL/U-NONCONFORMANCE-CORRECTIVE-ACTION — ISO §10.2 ─────────
          case "nc_record": {
            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.recordNC(params as any) };
            break;
          }
          case "nc_record_containment": {
            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.recordContainment(params as any) };
            break;
          }
          case "nc_record_root_cause": {
            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.recordRootCause(params as any) };
            break;
          }
          case "nc_record_corrective_action": {
            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.recordCorrectiveAction(params as any) };
            break;
          }
          case "nc_record_verification": {
            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.recordVerification(params as any) };
            break;
          }
          case "nc_close": {
            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.closeNC(params as any) };
            break;
          }
          case "nc_management_review_summary": {
            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.managementReviewSummary(params as any) };
            break;
          }
          case "nc_list": {
            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.listNCs(params as any) };
            break;
          }
          case "nc_get": {
            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
            const p = params as any;
            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.getNC(p.ncr_id) };
            break;
          }
          // ─── HOTEL/U-CUSTOMER-COMPLAINT-INTAKE ────────────────────────────
          case "complaint_receive": {
            const { customerComplaintIntakeEngine } = await import("../../engines/CustomerComplaintIntakeEngine.js");
            result = { success: true, data: customerComplaintIntakeEngine.receiveComplaint(params as any) };
            break;
          }
          case "complaint_triage": {
            const { customerComplaintIntakeEngine } = await import("../../engines/CustomerComplaintIntakeEngine.js");
            result = { success: true, data: customerComplaintIntakeEngine.triage(params as any) };
            break;
          }
          case "complaint_attach_ncr": {
            const { customerComplaintIntakeEngine } = await import("../../engines/CustomerComplaintIntakeEngine.js");
            result = { success: true, data: customerComplaintIntakeEngine.attachNCR(params as any) };
            break;
          }
          case "complaint_resolve": {
            const { customerComplaintIntakeEngine } = await import("../../engines/CustomerComplaintIntakeEngine.js");
            result = { success: true, data: customerComplaintIntakeEngine.resolve(params as any) };
            break;
          }
          case "complaint_close": {
            const { customerComplaintIntakeEngine } = await import("../../engines/CustomerComplaintIntakeEngine.js");
            result = { success: true, data: customerComplaintIntakeEngine.closeComplaint(params as any) };
            break;
          }
          case "complaint_list": {
            const { customerComplaintIntakeEngine } = await import("../../engines/CustomerComplaintIntakeEngine.js");
            result = { success: true, data: customerComplaintIntakeEngine.listComplaints(params as any) };
            break;
          }
          // ─── HOTEL/U-JM-DIE-ERP-SIMULATION ─────────────────────────────────
          case "jm_die_sim_run": {
            const { jmDieErpSimulationEngine } = await import("../../engines/JMDieErpSimulationEngine.js");
            result = { success: true, data: jmDieErpSimulationEngine.run(params as any) };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-EXPENSE-REIMBURSEMENT ───────────────────────
          case "expense_submit": {
            const { employeeExpenseReimbursementEngine } = await import("../../engines/EmployeeExpenseReimbursementEngine.js");
            result = { success: true, data: employeeExpenseReimbursementEngine.submitClaim(params as any) };
            break;
          }
          case "expense_approve": {
            const { employeeExpenseReimbursementEngine } = await import("../../engines/EmployeeExpenseReimbursementEngine.js");
            result = { success: true, data: employeeExpenseReimbursementEngine.approveClaim(params as any) };
            break;
          }
          case "expense_reject": {
            const { employeeExpenseReimbursementEngine } = await import("../../engines/EmployeeExpenseReimbursementEngine.js");
            result = { success: true, data: employeeExpenseReimbursementEngine.rejectClaim(params as any) };
            break;
          }
          case "expense_mark_reimbursed": {
            const { employeeExpenseReimbursementEngine } = await import("../../engines/EmployeeExpenseReimbursementEngine.js");
            result = { success: true, data: employeeExpenseReimbursementEngine.markReimbursed(params as any) };
            break;
          }
          case "expense_list": {
            const { employeeExpenseReimbursementEngine } = await import("../../engines/EmployeeExpenseReimbursementEngine.js");
            result = { success: true, data: employeeExpenseReimbursementEngine.listClaims(params as any) };
            break;
          }
          case "expense_outstanding": {
            const { employeeExpenseReimbursementEngine } = await import("../../engines/EmployeeExpenseReimbursementEngine.js");
            const p = params as any;
            result = { success: true, data: employeeExpenseReimbursementEngine.outstandingForReimbursement(p.employee_id) };
            break;
          }
          // ─── HOTEL/U-VENDOR-PERFORMANCE-TRACKER — ISO §8.4 ───────────────
          case "vendor_record_po": {
            const { vendorPerformanceTrackerEngine } = await import("../../engines/VendorPerformanceTrackerEngine.js");
            result = { success: true, data: vendorPerformanceTrackerEngine.recordPO(params as any) };
            break;
          }
          case "vendor_compute_scorecard": {
            const { vendorPerformanceTrackerEngine } = await import("../../engines/VendorPerformanceTrackerEngine.js");
            result = { success: true, data: vendorPerformanceTrackerEngine.computeScorecard(params as any) };
            break;
          }
          case "vendor_list_all": {
            const { vendorPerformanceTrackerEngine } = await import("../../engines/VendorPerformanceTrackerEngine.js");
            result = { success: true, data: vendorPerformanceTrackerEngine.listAllVendors() };
            break;
          }
          case "vendor_rank": {
            const { vendorPerformanceTrackerEngine } = await import("../../engines/VendorPerformanceTrackerEngine.js");
            result = { success: true, data: vendorPerformanceTrackerEngine.rankVendors(params as any) };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-BENEFITS-ENROLLMENT ──────────────────────────
          case "benefits_enroll": {
            const { employeeBenefitsEnrollmentEngine } = await import("../../engines/EmployeeBenefitsEnrollmentEngine.js");
            result = { success: true, data: employeeBenefitsEnrollmentEngine.enroll(params as any) };
            break;
          }
          case "benefits_cancel": {
            const { employeeBenefitsEnrollmentEngine } = await import("../../engines/EmployeeBenefitsEnrollmentEngine.js");
            result = { success: true, data: employeeBenefitsEnrollmentEngine.cancelElection(params as any) };
            break;
          }
          case "benefits_payroll_deductions": {
            const { employeeBenefitsEnrollmentEngine } = await import("../../engines/EmployeeBenefitsEnrollmentEngine.js");
            result = { success: true, data: employeeBenefitsEnrollmentEngine.getPayrollDeductions(params as any) };
            break;
          }
          case "benefits_list": {
            const { employeeBenefitsEnrollmentEngine } = await import("../../engines/EmployeeBenefitsEnrollmentEngine.js");
            result = { success: true, data: employeeBenefitsEnrollmentEngine.listElections(params as any) };
            break;
          }
          // ─── HOTEL/U-EXECUTIVE-SUMMARY — C-suite weekly rollup ───────────
          case "exec_summary_build": {
            const { executiveSummaryEngine } = await import("../../engines/ExecutiveSummaryEngine.js");
            result = { success: true, data: executiveSummaryEngine.buildSummary(params as any) };
            break;
          }
          // ─── HOTEL/U-INSPECTION-REPORT — QC reports → NCR bridge ─────────
          case "inspection_build_report": {
            const { inspectionReportEngine } = await import("../../engines/InspectionReportEngine.js");
            result = { success: true, data: inspectionReportEngine.buildReport(params as any) };
            break;
          }
          case "inspection_classify_characteristic": {
            const { inspectionReportEngine } = await import("../../engines/InspectionReportEngine.js");
            result = { success: true, data: inspectionReportEngine.classifyCharacteristic(params as any) };
            break;
          }
          case "inspection_get_cofc": {
            const { inspectionReportEngine } = await import("../../engines/InspectionReportEngine.js");
            result = { success: true, data: inspectionReportEngine.getCertificateOfConformance((params as any).report) };
            break;
          }
          // ─── HOTEL/U-SHIPPING-RECEIVING-LOG — inbound/outbound + 3-way match ───
          case "shipping_log_inbound": {
            const { shippingReceivingLogEngine } = await import("../../engines/ShippingReceivingLogEngine.js");
            result = { success: true, data: shippingReceivingLogEngine.logInbound(params as any) };
            break;
          }
          case "shipping_log_outbound": {
            const { shippingReceivingLogEngine } = await import("../../engines/ShippingReceivingLogEngine.js");
            result = { success: true, data: shippingReceivingLogEngine.logOutbound(params as any) };
            break;
          }
          case "shipping_three_way_match": {
            const { shippingReceivingLogEngine } = await import("../../engines/ShippingReceivingLogEngine.js");
            result = { success: true, data: shippingReceivingLogEngine.threeWayMatch(params as any) };
            break;
          }
          // ─── HOTEL/U-PO-LIFECYCLE — purchase-order state machine + change orders ───
          case "po_create": {
            const { purchaseOrderLifecycleEngine } = await import("../../engines/PurchaseOrderLifecycleEngine.js");
            result = { success: true, data: purchaseOrderLifecycleEngine.createPO(params as any) };
            break;
          }
          case "po_transition": {
            const { purchaseOrderLifecycleEngine } = await import("../../engines/PurchaseOrderLifecycleEngine.js");
            const p = params as any;
            result = { success: true, data: purchaseOrderLifecycleEngine.transition(p.po, p.to, p.by_employee_id, p.reason) };
            break;
          }
          case "po_record_receipt": {
            const { purchaseOrderLifecycleEngine } = await import("../../engines/PurchaseOrderLifecycleEngine.js");
            const p = params as any;
            result = { success: true, data: purchaseOrderLifecycleEngine.recordReceipt(p.po, p.line_id, p.qty, p.by_employee_id) };
            break;
          }
          case "po_append_change_order": {
            const { purchaseOrderLifecycleEngine } = await import("../../engines/PurchaseOrderLifecycleEngine.js");
            const p = params as any;
            result = { success: true, data: purchaseOrderLifecycleEngine.appendChangeOrder(p.po, p.change) };
            break;
          }
          case "po_get_status": {
            const { purchaseOrderLifecycleEngine } = await import("../../engines/PurchaseOrderLifecycleEngine.js");
            result = { success: true, data: purchaseOrderLifecycleEngine.getStatus((params as any).po) };
            break;
          }
          // ─── HOTEL/U-EMPLOYEE-TIMECLOCK — punch FSM + daily minute aggregation ───
          case "timeclock_record_punch": {
            const { employeeTimeClockEngine } = await import("../../engines/EmployeeTimeClockEngine.js");
            const p = params as any;
            result = { success: true, data: employeeTimeClockEngine.recordPunch(p.existing_punches ?? [], p) };
            break;
          }
          case "timeclock_edit_punch": {
            const { employeeTimeClockEngine } = await import("../../engines/EmployeeTimeClockEngine.js");
            const p = params as any;
            result = { success: true, data: employeeTimeClockEngine.editPunch(p.punch, p.new_timestamp, p.approver_employee_id) };
            break;
          }
          case "timeclock_daily_summary": {
            const { employeeTimeClockEngine } = await import("../../engines/EmployeeTimeClockEngine.js");
            const p = params as any;
            result = {
              success: true,
              data: employeeTimeClockEngine.getDailySummary(p.employee_id, p.date, p.punches ?? [], p.week_to_date_minutes ?? 0),
            };
            break;
          }
          case "timeclock_derive_state": {
            const { employeeTimeClockEngine } = await import("../../engines/EmployeeTimeClockEngine.js");
            result = { success: true, data: { state: employeeTimeClockEngine.deriveState((params as any).punches ?? []) } };
            break;
          }
          // ─── HOTEL/U-OSHA-300-LOG — federal OSHA 1904 injury & illness log ───
          case "osha_record_incident": {
            const { osha300LogEngine } = await import("../../engines/OSHA300LogEngine.js");
            result = { success: true, data: osha300LogEngine.recordIncident(params as any) };
            break;
          }
          case "osha_classify_recordable": {
            const { osha300LogEngine } = await import("../../engines/OSHA300LogEngine.js");
            result = { success: true, data: osha300LogEngine.classifyRecordable(params as any) };
            break;
          }
          case "osha_reporting_window": {
            const { osha300LogEngine } = await import("../../engines/OSHA300LogEngine.js");
            result = { success: true, data: osha300LogEngine.reportingWindow(params as any) };
            break;
          }
          case "osha_annual_300a": {
            const { osha300LogEngine } = await import("../../engines/OSHA300LogEngine.js");
            const p = params as any;
            result = { success: true, data: osha300LogEngine.buildAnnual300A(p.year, p.records ?? []) };
            break;
          }
          // ─── WIRE-BUSINESS-DIRECT-MS0/U-VICTOR-BUSINESS-DIRECT (2026-05-26) ───
          // 3 specialized business sub-engines lifted from the unwired-audit list.
          case "scenario_batch_run": {
            const { scenarioBatchRunnerEngine } = await import("../../engines/ScenarioBatchRunnerEngine.js");
            result = { success: true, data: scenarioBatchRunnerEngine.run(params as any) };
            break;
          }
          case "rfq_orchestrator_list_records": {
            const { rfqToOrderOrchestratorEngine } = await import("../../engines/RFQToOrderOrchestratorEngine.js");
            result = { success: true, data: rfqToOrderOrchestratorEngine.listRecords(params as any) };
            break;
          }
          case "monolith_roughing_machine_get": {
            const { monolithRoughingMachineConfigsEngine } = await import("../../engines/MonolithRoughingMachineConfigsEngine.js");
            const p = params as any;
            // getConfig requires an id; listIds() if id omitted (read-only discovery)
            result = (p?.id ?? p?.machine_id)
              ? { success: true, data: monolithRoughingMachineConfigsEngine.getConfig(String(p.id ?? p.machine_id)) }
              : { success: true, data: { ids: monolithRoughingMachineConfigsEngine.listIds() } };
            break;
          }
          // ── JM customer/vendor database (read-only analytics over the JSONL corpus).
          // WIRING/U-WIRE-JMDB (slot:romeo, 2026-06-10). ──
          case "jm_db_summary": {
            const engine = await getEngine("jmCustomerVendorDb");
            const paths = await resolveJmDbPaths(params as any);
            result = { success: true, data: await engine.summary(paths) };
            break;
          }
          case "jm_db_list_customers": {
            const engine = await getEngine("jmCustomerVendorDb");
            const paths = await resolveJmDbPaths(params as any);
            result = { success: true, data: await engine.listCustomers(paths) };
            break;
          }
          case "jm_db_get_customer": {
            const engine = await getEngine("jmCustomerVendorDb");
            const paths = await resolveJmDbPaths(params as any);
            const key = String((params as any).key ?? (params as any).customer_key ?? (params as any).customer ?? "");
            if (!key) throw new Error("jm_db_get_customer: 'key' (customer_key) is required");
            result = { success: true, data: await engine.getCustomer(key, paths) };
            break;
          }
          case "jm_db_search_customers": {
            const engine = await getEngine("jmCustomerVendorDb");
            const paths = await resolveJmDbPaths(params as any);
            const query = String((params as any).query ?? (params as any).q ?? "");
            if (!query) throw new Error("jm_db_search_customers: 'query' is required");
            const limit = (params as any).limit;
            result = { success: true, data: await engine.searchCustomers(query, { ...paths, limit }) };
            break;
          }
          case "jm_db_top_customers": {
            const engine = await getEngine("jmCustomerVendorDb");
            const paths = await resolveJmDbPaths(params as any);
            const nRaw = Number((params as any).n ?? (params as any).limit ?? 10);
            const n = Number.isFinite(nRaw) && nRaw > 0 ? Math.floor(nRaw) : 10;
            result = { success: true, data: await engine.topCustomersByFiles(n, paths) };
            break;
          }
          case "jm_db_list_vendors": {
            const engine = await getEngine("jmCustomerVendorDb");
            const paths = await resolveJmDbPaths(params as any);
            result = { success: true, data: await engine.listVendors(paths) };
            break;
          }
          case "jm_db_get_vendor": {
            const engine = await getEngine("jmCustomerVendorDb");
            const paths = await resolveJmDbPaths(params as any);
            const key = String((params as any).key ?? (params as any).vendor_key ?? (params as any).vendor ?? "");
            if (!key) throw new Error("jm_db_get_vendor: 'key' (vendor_key) is required");
            result = { success: true, data: await engine.getVendor(key, paths) };
            break;
          }
          case "jm_db_vendors_for_grade": {
            const engine = await getEngine("jmCustomerVendorDb");
            const paths = await resolveJmDbPaths(params as any);
            const grade = String((params as any).grade ?? (params as any).material_grade ?? "");
            if (!grade) throw new Error("jm_db_vendors_for_grade: 'grade' is required");
            result = { success: true, data: await engine.vendorsForGrade(grade, paths) };
            break;
          }
        default:
            result = { error: `Unknown business action: ${action}` };
        }

        return slimResponse({
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        });
      } catch (err: any) {
        // Bug fix 2026-05-15 (iter8 EquipmentAsset wire): arg order was reversed
        // (dispatcher, action, error) — signature is (error, action, dispatcher).
        // Pre-fix, engine errors surfaced as literal string "prism_business" in
        // the `error` field, hiding real failure messages from MCP callers.
        return dispatcherError(err, action, "prism_business");
      }
    },
  );
}
