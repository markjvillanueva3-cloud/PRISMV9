/**
 * prism_business — Business Operations Dispatcher
 *
 * 16 actions across 4 engines:
 *   Financial (4): financial_npv, financial_irr, financial_breakeven,
 *                  financial_machine_investment
 *   Inventory (4): inventory_eoq, inventory_safety_stock,
 *                  inventory_abc, inventory_tool_optimize
 *   Job Lifecycle (4): job_create, job_update_status,
 *                      job_summary, job_dashboard
 *   Purchasing (4): purchasing_search, purchasing_recommend,
 *                   purchasing_manufacturers, purchasing_summary
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
] as const;

/** Registers business dispatcher.
 * @param server - MCP server instance
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
