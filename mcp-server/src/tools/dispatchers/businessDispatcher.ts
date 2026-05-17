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

async function getEngine(name: string): Promise<any> {
  switch (name) {
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
  "customer_credit_check",
  "customer_log_comm",
  "customer_comm_history",
  "customer_follow_ups",
  "customer_create_opportunity",
  "customer_update_opportunity",
  "customer_pipeline",
  "customer_analytics",
  "customer_top",
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
            result = engine.bridge(params.analysis ?? params, params.overrides);
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
