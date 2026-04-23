/**
 * WEDMOverageApprovalEngine — Customer approval workflow for cost overages
 *
 * Per WEDM-ERP-MS0 scrutiny fix_15: when actual job cost exceeds estimated
 * cost by more than `auto_approve_variance_pct`, the overage must be
 * consented to by the customer before invoice generation is unblocked.
 *
 * Workflow:
 *   1. Job completes with actual metrics.
 *   2. WEDMInvoiceLineEngine computes variance.
 *   3. If variance < threshold → auto-approve (no-op pass through).
 *   4. If variance >= threshold → create pending approval record,
 *      notify customer via email/webhook, block invoice until `approved`.
 *
 * This engine is pure state machine logic — the transport (email, Slack,
 * webhook) is delegated to NotificationEngine. Persistence is delegated
 * to the caller (the approval record includes serializable fields only).
 */

import { WEDM_OVERAGE_THRESHOLDS } from "../physics/wedm-constants.js";

export type OverageApprovalStatus = "auto_approved" | "pending" | "approved" | "rejected" | "expired";

export interface OverageRequestInput {
  job_id: string;
  customer_id: string;
  customer_email?: string;
  estimated_cost_usd: number;
  actual_cost_usd: number;
  overage_reason?: string;
  /** Override threshold for this job (e.g., contract with tighter rules) */
  threshold_pct_override?: number;
}

export interface OverageApprovalRecord {
  request_id: string;
  job_id: string;
  customer_id: string;
  customer_email?: string;
  status: OverageApprovalStatus;
  estimated_cost_usd: number;
  actual_cost_usd: number;
  overage_usd: number;
  variance_pct: number;
  threshold_pct: number;
  overage_reason?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  decision_at?: string;
  decided_by?: string;
  notification_sent?: boolean;
}

export class WEDMOverageApprovalEngine {
  private static requestCounter = 0;

  /** Create an approval request (or auto-approve if below threshold) */
  static createRequest(input: OverageRequestInput): OverageApprovalRecord {
    const estimated = Math.max(0, input.estimated_cost_usd || 0);
    const actual = Math.max(0, input.actual_cost_usd || 0);
    const overage = Math.max(0, actual - estimated);
    const variance_pct = estimated > 0 ? (overage / estimated) * 100 : 0;
    const threshold_pct = input.threshold_pct_override ?? WEDM_OVERAGE_THRESHOLDS.auto_approve_variance_pct;

    const now = new Date().toISOString();
    const id = `OA-${Date.now()}-${++WEDMOverageApprovalEngine.requestCounter}`;
    const expires = new Date(Date.now() + WEDM_OVERAGE_THRESHOLDS.dispute_window_days * 86_400_000).toISOString();

    const auto = variance_pct < threshold_pct;

    return {
      request_id: id,
      job_id: input.job_id,
      customer_id: input.customer_id,
      customer_email: input.customer_email,
      status: auto ? "auto_approved" : "pending",
      estimated_cost_usd: estimated,
      actual_cost_usd: actual,
      overage_usd: overage,
      variance_pct,
      threshold_pct,
      overage_reason: input.overage_reason,
      created_at: now,
      updated_at: now,
      expires_at: auto ? undefined : expires,
      decision_at: auto ? now : undefined,
      decided_by: auto ? "system:auto_approve_below_threshold" : undefined,
    };
  }

  /** Customer approves — unblocks invoice generation */
  static approve(record: OverageApprovalRecord, decided_by: string): OverageApprovalRecord {
    if (record.status !== "pending") {
      throw new Error(`Cannot approve record in status "${record.status}"`);
    }
    const now = new Date().toISOString();
    return {
      ...record,
      status: "approved",
      updated_at: now,
      decision_at: now,
      decided_by,
    };
  }

  /** Customer rejects — blocks invoice, triggers dispute */
  static reject(record: OverageApprovalRecord, decided_by: string, reason?: string): OverageApprovalRecord {
    if (record.status !== "pending") {
      throw new Error(`Cannot reject record in status "${record.status}"`);
    }
    const now = new Date().toISOString();
    return {
      ...record,
      status: "rejected",
      updated_at: now,
      decision_at: now,
      decided_by,
      overage_reason: reason || record.overage_reason,
    };
  }

  /** Expire stale requests past dispute window */
  static expireIfStale(record: OverageApprovalRecord, now_iso?: string): OverageApprovalRecord {
    if (record.status !== "pending" || !record.expires_at) return record;
    const nowTs = now_iso ? Date.parse(now_iso) : Date.now();
    if (nowTs > Date.parse(record.expires_at)) {
      return { ...record, status: "expired", updated_at: new Date(nowTs).toISOString() };
    }
    return record;
  }

  /** Whether a given record permits invoice generation */
  static invoiceAllowed(record: OverageApprovalRecord): boolean {
    return record.status === "auto_approved" || record.status === "approved";
  }
}

export const wedmOverageApprovalEngine = WEDMOverageApprovalEngine;
