/**
 * LatheERPOrchestratorEngine — U-LTH57 (LATHE-MASTER P5-S4)
 *
 * One-shot P5 orchestrator: takes a P4 artifact + ShopContext and runs the
 * full quote → order → schedule → PO → inventory-reserve pipeline. Each
 * stage is a pure delegation to the underlying engine (U-LTH48..U-LTH54);
 * this engine owns only sequencing and consolidation.
 *
 * Sequence:
 *   1. Generate quote                (LatheAutoQuoteFromPrintEngine)
 *   2. Create order                  (LatheCustomerOrderLifecycleEngine: draft)
 *   3. Transition order → quoted     (lifecycle)
 *   4. Build schedulable job         (LatheJobSchedulingEngine.jobFromQuote)
 *   5. Schedule on fleet             (LatheJobSchedulingEngine.schedule)
 *   6. Build POs for shortages       (LathePurchaseOrderAutomationEngine)
 *   7. Reserve inventory             (LatheInventoryIntelligenceEngine)
 *   8. Transition order → accepted+scheduled (lifecycle)
 *
 * Returns a consolidated report with all artifact IDs for audit + UI display.
 *
 * @milestone LATHE-MASTER U-LTH57
 */

import { z } from "zod";
import { latheAutoQuoteFromPrintEngine } from "./LatheAutoQuoteFromPrintEngine.js";
import { latheCustomerOrderLifecycleEngine } from "./LatheCustomerOrderLifecycleEngine.js";
import { latheJobSchedulingEngine, type MachineSpec } from "./LatheJobSchedulingEngine.js";
import { lathePurchaseOrderAutomationEngine } from "./LathePurchaseOrderAutomationEngine.js";
import { latheInventoryIntelligenceEngine } from "./LatheInventoryIntelligenceEngine.js";

export const ERPFullInputSchema = z.object({
  sequence_plan: z.any(),
  toolpath: z.any(),
  material: z.any(),
  signoff: z.any().optional(),
  quote_input: z.object({
    quantity: z.number().int().positive(),
    customer: z.string().min(1),
    part_number: z.string().min(1),
    margin_rate_override: z.number().min(0).max(2).optional(),
    rush_multiplier: z.number().min(1).max(3).optional(),
  }),
  order_id: z.string().min(1),
  due_date_iso: z.string().datetime(),
  priority: z.number().int().min(0).max(100).default(50),
  machines: z.array(z.any()).min(1),
  reserve_material_sku: z.string().optional(),
});
export type ERPFullInput = z.infer<typeof ERPFullInputSchema>;

export interface ERPFullReport {
  order_id: string;
  quote_id: string;
  quote_unit_price_usd: number;
  quote_lot_price_usd: number;
  job_id: string;
  schedule_machine_id: string | null;
  schedule_start_iso: string | null;
  schedule_end_iso: string | null;
  on_time: boolean;
  po_count: number;
  po_total_usd: number;
  po_aggregate_lead_time_days: number;
  reserved_material_kg: number | null;
  final_order_state: string;
  warnings: string[];
}

class LatheERPOrchestratorEngine {
  /**
   * Run the full P5 pipeline. Any stage failure bubbles up as a thrown error
   * so the caller can roll back or re-queue. Idempotency is per-stage and
   * handled by the underlying engines (order_id duplicates throw, etc.).
   */
  erpFull(input: ERPFullInput): ERPFullReport {
    const parsed = ERPFullInputSchema.parse(input);
    const warnings: string[] = [];

    // --- Stage 1: quote ---
    const quote = latheAutoQuoteFromPrintEngine.generateQuote({
      sequence_plan: parsed.sequence_plan,
      toolpath: parsed.toolpath,
      material: parsed.material,
      signoff: parsed.signoff,
      quote: {
        quantity: parsed.quote_input.quantity,
        customer: parsed.quote_input.customer,
        part_number: parsed.quote_input.part_number,
        margin_rate_override: parsed.quote_input.margin_rate_override,
        rush_multiplier: parsed.quote_input.rush_multiplier,
      },
    });

    // --- Stage 2-3: create + transition to quoted ---
    latheCustomerOrderLifecycleEngine.createOrder({
      order_id: parsed.order_id,
      customer: parsed.quote_input.customer,
      part_number: parsed.quote_input.part_number,
      quantity: parsed.quote_input.quantity,
      quote_id: quote.quote_id,
      priority: parsed.priority,
    });
    latheCustomerOrderLifecycleEngine.transition({
      order_id: parsed.order_id,
      to_state: "quoted",
      actor: "orchestrator",
      reason: "ERP full pipeline",
    });

    // --- Stage 4: schedulable job ---
    const job = latheJobSchedulingEngine.jobFromQuote(quote, {
      job_id: parsed.order_id,
      due_date_iso: parsed.due_date_iso,
      priority: parsed.priority,
    });

    // --- Stage 5: schedule ---
    const machines = parsed.machines as MachineSpec[];
    const scheduleReport = latheJobSchedulingEngine.schedule({
      machines,
      jobs: [job],
    });

    let scheduleMachineId: string | null = null;
    let scheduleStart: string | null = null;
    let scheduleEnd: string | null = null;
    let onTime = false;
    for (const mach of scheduleReport.machines) {
      const op = mach.operations.find((o) => o.job_id === job.job_id);
      if (op) {
        scheduleMachineId = op.machine_id;
        scheduleStart = op.start_iso;
        scheduleEnd = op.end_iso;
        onTime = op.on_time;
        break;
      }
    }
    if (scheduleMachineId === null) {
      warnings.push(`Job ${job.job_id} could not be scheduled (no feasible machine)`);
    }

    // --- Stage 6: POs ---
    const poResult = lathePurchaseOrderAutomationEngine.build({
      job_id: parsed.order_id,
      quote,
    });

    // --- Stage 7: reserve material (best-effort) ---
    let reservedKg: number | null = null;
    if (parsed.reserve_material_sku) {
      try {
        const needed = quote.evidence.stock_mass_kg * parsed.quote_input.quantity;
        latheInventoryIntelligenceEngine.recordMovement({
          sku: parsed.reserve_material_sku,
          type: "reserve",
          quantity: needed,
          job_id: parsed.order_id,
          reason: "ERP full pipeline — material reservation",
        });
        reservedKg = needed;
      } catch (err) {
        warnings.push(
          `Material reservation skipped: ${(err as Error).message}`,
        );
      }
    }

    // --- Stage 8: transition to accepted + scheduled ---
    latheCustomerOrderLifecycleEngine.transition({
      order_id: parsed.order_id,
      to_state: "accepted",
      actor: "orchestrator",
      reason: "ERP full pipeline",
    });
    let finalState = "accepted";
    if (scheduleMachineId !== null) {
      latheCustomerOrderLifecycleEngine.transition({
        order_id: parsed.order_id,
        to_state: "scheduled",
        actor: "orchestrator",
        reason: `Scheduled on ${scheduleMachineId}`,
        metadata: { machine_id: scheduleMachineId, start_iso: scheduleStart ?? "" },
      });
      finalState = "scheduled";
    }

    return {
      order_id: parsed.order_id,
      quote_id: quote.quote_id,
      quote_unit_price_usd: quote.cost.total_unit_price_usd,
      quote_lot_price_usd: quote.cost.total_lot_price_usd,
      job_id: job.job_id,
      schedule_machine_id: scheduleMachineId,
      schedule_start_iso: scheduleStart,
      schedule_end_iso: scheduleEnd,
      on_time: onTime,
      po_count: poResult.pos.length,
      po_total_usd: poResult.aggregate_total_usd,
      po_aggregate_lead_time_days: poResult.aggregate_lead_time_days,
      reserved_material_kg: reservedKg,
      final_order_state: finalState,
      warnings,
    };
  }
}

export const latheERPOrchestratorEngine = new LatheERPOrchestratorEngine();
export { LatheERPOrchestratorEngine };
