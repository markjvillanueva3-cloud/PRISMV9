/**
 * prism_business — Business Operations Dispatcher
 *
 * 67 actions across 15 engines:
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
 *
 * @milestone AUDIT-FT-BIZ
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

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
