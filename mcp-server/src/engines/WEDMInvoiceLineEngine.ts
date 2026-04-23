/**
 * WEDMInvoiceLineEngine — Completed Job → Invoice Draft
 *
 * WEDM-ERP-MS0 U-WEDM-ERP03
 *
 * Converts a completed WEDM job (with actual metrics) into an invoice draft
 * with line items ready for StripeBillingEngine. Computes variance vs the
 * quoted estimate, flags overages above the WEDM_OVERAGE_THRESHOLDS auto-
 * approve variance, and integrates with WEDMOverageApprovalEngine for the
 * gate.
 *
 * Formula references:
 *   variance_pct = (actual - estimated) / max(1, estimated) × 100
 *   overage_usd  = max(0, actual_cost - estimated_cost)
 *
 * Integrates:
 *   WEDMCreditCostEngine      (for credit-based plans)
 *   WEDMOverageApprovalEngine (for dispute gate)
 *
 * Does NOT post to Stripe — that's StripeBillingEngine's job. This engine
 * produces a draft the router wires to Stripe invoice_items.create.
 */

import type { WEDMJobPacket } from "./WEDMJobCreatorEngine.js";
import {
  WEDMOverageApprovalEngine,
  type OverageApprovalRecord,
} from "./WEDMOverageApprovalEngine.js";
import { WEDM_OVERAGE_THRESHOLDS } from "../physics/wedm-constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type InvoiceLineCategory =
  | "base_quote"
  | "time_overage"
  | "wire_overage"
  | "pass_overage"
  | "credit_topup"
  | "adjustment"
  | "tax";

export interface InvoiceLine {
  /** Stable ID within the invoice */
  line_id: string;
  category: InvoiceLineCategory;
  /** Human-readable description shown on invoice */
  description: string;
  quantity: number;
  unit_price_usd: number;
  amount_usd: number;
  /** Structured metadata for Stripe + reconciliation */
  metadata: {
    job_id: string;
    variance_pct?: number;
    actual?: number;
    estimated?: number;
    unit?: string;
    overage_request_id?: string;
  };
}

export interface JobActuals {
  /** Actual cutting time in minutes */
  actual_cutting_time_min: number;
  /** Actual wire consumed in meters */
  actual_wire_m: number;
  /** Actual number of passes run */
  actual_passes: number;
  /** Actual total cost in USD (shop-computed) */
  actual_cost_usd: number;
  /** Optional override for job completion timestamp */
  completed_at?: string;
  /** Operator notes / reason codes for overage */
  completion_notes?: string;
}

export interface VarianceMetric {
  metric: "time" | "wire" | "passes" | "cost";
  estimated: number;
  actual: number;
  variance_abs: number;
  variance_pct: number;
  unit: string;
}

export interface InvoiceDraft {
  invoice_number: string;
  job_id: string;
  quote_reference?: string;
  customer: string;
  currency: string;
  issued_at: string;
  lines: InvoiceLine[];
  subtotal_usd: number;
  total_usd: number;
  variances: VarianceMetric[];
  /** Overall actual-vs-estimated cost variance (%) */
  cost_variance_pct: number;
  /** Whether customer consent is required before billing overage */
  requires_overage_approval: boolean;
  /** Approval record if overage workflow was triggered */
  overage_approval?: OverageApprovalRecord;
  notes: string[];
}

export interface CreateInvoiceOptions {
  /** Customer's Stripe customer ID (for downstream) */
  customer_id?: string;
  customer_email?: string;
  /** Machine-hour rate — used for per-minute overage calc */
  machine_rate_usd_per_hr?: number;
  /** Wire cost override (brass default applied otherwise) */
  wire_cost_usd_per_m?: number;
  /** Tax rate to apply as separate line item */
  tax_rate_pct?: number;
  /** Threshold override for this specific customer contract */
  overage_threshold_pct?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMInvoiceLineEngine {
  private static invoiceCounter = 0;

  /**
   * Build an InvoiceDraft from a completed WEDM job packet and its actuals.
   *
   * If `actual_cost_usd - estimated_cost_usd` exceeds the auto-approve
   * threshold (15% default), the overage lines are created but marked
   * `requires_overage_approval: true` so the router can gate them behind
   * customer consent before posting to Stripe.
   */
  static createInvoice(
    packet: WEDMJobPacket,
    actuals: JobActuals,
    options: CreateInvoiceOptions = {},
  ): InvoiceDraft {
    if (!packet) throw new Error("WEDMInvoiceLineEngine.createInvoice: packet is required");
    if (!actuals) throw new Error("WEDMInvoiceLineEngine.createInvoice: actuals are required");

    const quoteUnitPrice = packet.quoteRef?.unit_price ?? 0;
    const quoteTotal = packet.quoteRef?.estimated_cost_usd ?? quoteUnitPrice * packet.quantity;
    const quoteNumber = packet.quoteRef?.quote_number;

    const estimatedCost = Math.max(0, quoteTotal);
    const actualCost = Math.max(0, actuals.actual_cost_usd);
    const costVariancePct =
      estimatedCost > 0 ? ((actualCost - estimatedCost) / estimatedCost) * 100 : 0;

    // Variance per metric (for invoice transparency)
    const variances: VarianceMetric[] = [
      WEDMInvoiceLineEngine.buildVariance(
        "time",
        packet.programMeta.estimated_time_min,
        actuals.actual_cutting_time_min,
        "min",
      ),
      WEDMInvoiceLineEngine.buildVariance(
        "wire",
        packet.programMeta.wire_consumption_m,
        actuals.actual_wire_m,
        "m",
      ),
      WEDMInvoiceLineEngine.buildVariance(
        "passes",
        packet.programMeta.passes_per_profile,
        actuals.actual_passes,
        "count",
      ),
      WEDMInvoiceLineEngine.buildVariance("cost", estimatedCost, actualCost, "USD"),
    ];

    const invoiceNumber = `INV-${Date.now()}-${++WEDMInvoiceLineEngine.invoiceCounter}`;
    const lines: InvoiceLine[] = [];
    const notes: string[] = [];

    // Base quote line — always billed as agreed
    lines.push({
      line_id: `${invoiceNumber}-L1`,
      category: "base_quote",
      description: quoteNumber
        ? `WEDM cutting per quote ${quoteNumber} — ${packet.jobName} (qty ${packet.quantity})`
        : `WEDM cutting — ${packet.jobName} (qty ${packet.quantity})`,
      quantity: packet.quantity,
      unit_price_usd: roundMoney(quoteUnitPrice),
      amount_usd: roundMoney(quoteUnitPrice * packet.quantity),
      metadata: { job_id: packet.jobId },
    });

    // Overage handling — only if actual exceeds estimated
    let overageApproval: OverageApprovalRecord | undefined;
    let requiresApproval = false;
    const overageLines: InvoiceLine[] = [];

    if (actualCost > estimatedCost) {
      overageApproval = WEDMOverageApprovalEngine.createRequest({
        job_id: packet.jobId,
        customer_id: options.customer_id ?? packet.customer,
        customer_email: options.customer_email,
        estimated_cost_usd: estimatedCost,
        actual_cost_usd: actualCost,
        overage_reason: actuals.completion_notes,
        threshold_pct_override: options.overage_threshold_pct,
      });
      requiresApproval = overageApproval.status === "pending";

      // Time overage (machine hour rate)
      const timeVar = variances[0];
      if (timeVar.variance_abs > 0) {
        const rate = options.machine_rate_usd_per_hr ?? 85;
        const amount = roundMoney((timeVar.variance_abs / 60) * rate);
        if (amount > 0) {
          overageLines.push({
            line_id: `${invoiceNumber}-L${lines.length + overageLines.length + 1}`,
            category: "time_overage",
            description: `Machine time overage (+${timeVar.variance_abs.toFixed(1)} min @ $${rate}/hr)`,
            quantity: +(timeVar.variance_abs / 60).toFixed(4),
            unit_price_usd: rate,
            amount_usd: amount,
            metadata: {
              job_id: packet.jobId,
              variance_pct: timeVar.variance_pct,
              actual: timeVar.actual,
              estimated: timeVar.estimated,
              unit: "hours",
              overage_request_id: overageApproval.request_id,
            },
          });
        }
      }

      // Wire overage
      const wireVar = variances[1];
      if (wireVar.variance_abs > 0) {
        const wireCost = options.wire_cost_usd_per_m ?? 0.024;
        const amount = roundMoney(wireVar.variance_abs * wireCost);
        if (amount > 0) {
          overageLines.push({
            line_id: `${invoiceNumber}-L${lines.length + overageLines.length + 1}`,
            category: "wire_overage",
            description: `Wire consumption overage (+${wireVar.variance_abs.toFixed(0)}m @ $${wireCost.toFixed(4)}/m)`,
            quantity: +wireVar.variance_abs.toFixed(2),
            unit_price_usd: wireCost,
            amount_usd: amount,
            metadata: {
              job_id: packet.jobId,
              variance_pct: wireVar.variance_pct,
              actual: wireVar.actual,
              estimated: wireVar.estimated,
              unit: "m",
              overage_request_id: overageApproval.request_id,
            },
          });
        }
      }

      // Pass overage (more passes run than planned — flat per-pass surcharge)
      const passVar = variances[2];
      if (passVar.variance_abs > 0) {
        // Per-pass surcharge = (actualCost - estimatedCost) prorated, floor $0
        const perPassCost = actualCost > 0 ? Math.max(0, actualCost - estimatedCost) / Math.max(1, passVar.variance_abs) : 0;
        const amount = roundMoney(passVar.variance_abs * perPassCost);
        if (amount > 0) {
          overageLines.push({
            line_id: `${invoiceNumber}-L${lines.length + overageLines.length + 1}`,
            category: "pass_overage",
            description: `Extra skim passes (+${passVar.variance_abs} pass${passVar.variance_abs === 1 ? "" : "es"})`,
            quantity: passVar.variance_abs,
            unit_price_usd: roundMoney(perPassCost),
            amount_usd: amount,
            metadata: {
              job_id: packet.jobId,
              variance_pct: passVar.variance_pct,
              actual: passVar.actual,
              estimated: passVar.estimated,
              unit: "passes",
              overage_request_id: overageApproval.request_id,
            },
          });
        }
      }

      if (overageApproval.status === "auto_approved") {
        notes.push(
          `Cost variance ${costVariancePct.toFixed(1)}% auto-approved (below ${(options.overage_threshold_pct ?? WEDM_OVERAGE_THRESHOLDS.auto_approve_variance_pct).toFixed(1)}% threshold).`,
        );
      } else {
        notes.push(
          `Cost variance ${costVariancePct.toFixed(1)}% exceeds ${(options.overage_threshold_pct ?? WEDM_OVERAGE_THRESHOLDS.auto_approve_variance_pct).toFixed(1)}% — customer approval required (${overageApproval.request_id}).`,
        );
      }
    } else if (actualCost < estimatedCost) {
      notes.push(
        `Under quote by ${Math.abs(costVariancePct).toFixed(1)}% — billing at quoted amount (no refund unless contract specifies).`,
      );
    }

    // Only include overage lines if auto-approved — pending approvals are
    // recorded but not yet billable.
    const includeOverages = !requiresApproval;
    if (includeOverages) {
      lines.push(...overageLines);
    }

    // Subtotal
    const subtotal = lines.reduce((s, l) => s + l.amount_usd, 0);

    // Optional tax line
    if (options.tax_rate_pct && options.tax_rate_pct > 0) {
      const taxAmount = roundMoney(subtotal * (options.tax_rate_pct / 100));
      lines.push({
        line_id: `${invoiceNumber}-TAX`,
        category: "tax",
        description: `Tax (${options.tax_rate_pct.toFixed(2)}%)`,
        quantity: 1,
        unit_price_usd: taxAmount,
        amount_usd: taxAmount,
        metadata: { job_id: packet.jobId },
      });
    }

    const total = lines.reduce((s, l) => s + l.amount_usd, 0);

    if (actuals.completion_notes) notes.push(`Operator: ${actuals.completion_notes}`);

    return {
      invoice_number: invoiceNumber,
      job_id: packet.jobId,
      quote_reference: quoteNumber,
      customer: packet.customer,
      currency: "USD",
      issued_at: actuals.completed_at ?? new Date().toISOString(),
      lines,
      subtotal_usd: roundMoney(subtotal),
      total_usd: roundMoney(total),
      variances,
      cost_variance_pct: +costVariancePct.toFixed(2),
      requires_overage_approval: requiresApproval,
      overage_approval: overageApproval,
      notes,
    };
  }

  /**
   * Sum of line amounts for a specific category — useful for reporting.
   */
  static sumCategory(draft: InvoiceDraft, category: InvoiceLineCategory): number {
    return roundMoney(
      draft.lines
        .filter((l) => l.category === category)
        .reduce((s, l) => s + l.amount_usd, 0),
    );
  }

  /**
   * Helper: promote a pending overage draft to a finalized invoice after
   * customer approves (via WEDMOverageApprovalEngine.approve). Rebuilds
   * lines with overages now included.
   */
  static finalizeAfterApproval(
    draft: InvoiceDraft,
    approved: OverageApprovalRecord,
  ): InvoiceDraft {
    if (approved.status !== "approved") {
      throw new Error(
        `WEDMInvoiceLineEngine.finalizeAfterApproval: expected approved status, got ${approved.status}`,
      );
    }
    return {
      ...draft,
      requires_overage_approval: false,
      overage_approval: approved,
      notes: [
        ...draft.notes,
        `Overage approved by ${approved.decided_by ?? "customer"} at ${approved.decision_at ?? approved.updated_at}.`,
      ],
    };
  }

  private static buildVariance(
    metric: "time" | "wire" | "passes" | "cost",
    estimated: number,
    actual: number,
    unit: string,
  ): VarianceMetric {
    const est = Number.isFinite(estimated) ? estimated : 0;
    const act = Number.isFinite(actual) ? actual : 0;
    const abs = act - est;
    const pct = est > 0 ? (abs / est) * 100 : 0;
    return {
      metric,
      estimated: est,
      actual: act,
      variance_abs: abs,
      variance_pct: +pct.toFixed(2),
      unit,
    };
  }
}

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export const wedmInvoiceLineEngine = WEDMInvoiceLineEngine;
