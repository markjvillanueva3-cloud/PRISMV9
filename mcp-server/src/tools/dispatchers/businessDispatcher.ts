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
 *   Secondary Ops (5): sec_ops_list, sec_ops_quote, sec_ops_batch_quote,
 *                      sec_ops_find_vendors, sec_ops_recommend
 *   Quote Analytics (6): analytics_record, analytics_update_outcome,
 *                        analytics_record_actuals, analytics_accuracy,
 *                        analytics_conversion, analytics_calibration
 *   HR Compliance (16): hr_benefits_list..hr_dashboard
 *   Customer Mgmt (14): customer_create..customer_top
 *   Integration (6): integration_export_qb..integration_formats
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
let _integrationAdapter: any;
let _injectionMoldQuote: any;
let _stockSizeOptimizer: any;
let _marketMaterialPricing: any;
let _batchOptimization: any;
let _learningPath: any;
let _castingQuote: any;
let _weldFabQuote: any;
let _multiProcessQuote: any;

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
      return _quoting ??= (
        await import("../../engines/QuotingEngine.js")
      ).quotingEngine;
    case "scheduling":
      return _scheduling ??= (
        await import("../../engines/JobShopSchedulingEngine.js")
      ).jobShopSchedulingEngine;
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
  "employee_search",
  "employee_add_skill",
  "employee_utilization",
  "employee_dept_summary",
  // ── TimeClock ──
  "clock_in",
  "clock_out",
  "job_time_start",
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
            const engine = await getEngine("quoting");
            result = engine.generateQuote(params, {
              rush: params.rush,
              repeatOrder: params.repeat_order ?? params.repeatOrder,
              targetMargin: params.target_margin ?? params.targetMargin,
              customer: params.customer,
              notes: params.notes,
            });
            break;
          }
          case "quoting_price_breaks": {
            const engine = await getEngine("quoting");
            result = engine.generatePriceBreaks(
              params,
              params.quantities,
            );
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
          case "job_time_stop": {
            const engine = await getEngine("timeClock");
            result = engine.jobStop({
              employee_id: params.employee_id ?? params.employeeId,
              job_id: params.job_id ?? params.jobId,
              timestamp: params.timestamp,
              notes: params.notes,
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

          default:
            result = { error: `Unknown business action: ${action}` };
        }

        return slimResponse({
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        });
      } catch (err: any) {
        return dispatcherError("prism_business", action, err);
      }
    },
  );
}
