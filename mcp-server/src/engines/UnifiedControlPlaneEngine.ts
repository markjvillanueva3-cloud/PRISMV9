/**
 * UnifiedControlPlaneEngine — U-HAGI02 single-pane operator governance (Voxyz L12).
 *
 * Pure-core decision aggregator: consults the kill-switch state, tenant
 * boundary, and budget remaining to produce a unified ALLOW/DENY verdict
 * for a request.  Composes U-HAGI10 (tenant) + U-HAGI11 (kill-switch) +
 * caller-supplied budget primitives + caller-supplied approval gates.
 *
 * Decision order (deny short-circuits):
 *   1. Kill switch level vs operation class
 *   2. Tenant boundary (request vs resource)
 *   3. Budget remaining
 *   4. Approval-required gate
 *   5. Else → ALLOW with assembled audit record
 *
 * @module engines/UnifiedControlPlaneEngine
 */

import { z } from "zod";
import { KillSwitchEngine, type KillState } from "./KillSwitchEngine.js";
import { TenantBoundaryEngine, type CrossTenantPair } from "./TenantBoundaryEngine.js";

export const ControlPlaneRequestSchema = z.object({
  request_id: z.string().min(1).max(120),
  actor: z.string().min(1).max(100),
  request_tenant_id: z.string().min(1).max(64),
  resource_tenant_id: z.string().min(1).max(64),
  operation_class: z.enum(["new_request", "in_flight", "credential_use"]),
  estimated_cost_usd: z.number().refine(
    (v) => Number.isFinite(v) && v >= 0,
    { message: "estimated_cost_usd must be a finite non-negative number" },
  ),
  requires_approval: z.boolean().default(false),
  approved_by: z.string().max(100).optional(),
});
export type ControlPlaneRequest = z.infer<typeof ControlPlaneRequestSchema>;

export const BudgetStateSchema = z.object({
  remaining_usd: z.number().refine(
    (v) => Number.isFinite(v) && v >= 0,
    { message: "remaining_usd must be a finite non-negative number" },
  ),
  cap_usd: z.number().refine(
    (v) => Number.isFinite(v) && v >= 0,
    { message: "cap_usd must be a finite non-negative number" },
  ),
  reset_at: z.string().min(1),
});
export type BudgetState = z.infer<typeof BudgetStateSchema>;

export interface ControlPlaneVerdict {
  allow: boolean;
  blocked_by: "none" | "kill-switch" | "tenant-boundary" | "budget" | "approval-required";
  reason: string;
  request_id: string;
  decided_at: string;
  components: {
    kill_switch?: { level: string; reason?: string };
    tenant?: { request: string; resource: string; via: string };
    budget?: { remaining_usd: number; cap_usd: number };
    approval?: { required: boolean; approved_by?: string };
  };
}

export class UnifiedControlPlaneEngine {
  static validateRequest(r: unknown): ControlPlaneRequest { return ControlPlaneRequestSchema.parse(r); }
  static validateBudget(b: unknown): BudgetState { return BudgetStateSchema.parse(b); }

  /**
   * Decide whether `request` is allowed given current kill state, budget,
   * and an optional cross-tenant allowlist.  Tests one gate at a time and
   * returns the FIRST denying gate's reason; ALLOW only if all gates pass.
   */
  static decide(
    request: ControlPlaneRequest,
    killState: KillState,
    budget: BudgetState,
    crossTenantAllowlist: readonly CrossTenantPair[] = [],
    at: string = new Date().toISOString(),
  ): ControlPlaneVerdict {
    ControlPlaneRequestSchema.parse(request);
    BudgetStateSchema.parse(budget);

    // Gate 1: kill switch
    const killDecision = KillSwitchEngine.decide(killState, request.operation_class);
    if (!killDecision.allow) {
      return {
        allow: false,
        blocked_by: "kill-switch",
        reason: killDecision.reason ?? `kill switch ${killDecision.level}`,
        request_id: request.request_id,
        decided_at: at,
        components: { kill_switch: { level: killDecision.level, reason: killDecision.reason } },
      };
    }

    // Gate 2: tenant boundary
    const tenantDecision = TenantBoundaryEngine.decide(
      request.request_tenant_id,
      request.resource_tenant_id,
      crossTenantAllowlist,
    );
    if (!tenantDecision.allow) {
      return {
        allow: false,
        blocked_by: "tenant-boundary",
        reason: tenantDecision.reason,
        request_id: request.request_id,
        decided_at: at,
        components: {
          kill_switch: { level: killDecision.level },
          tenant: { request: tenantDecision.request, resource: tenantDecision.resource, via: tenantDecision.via ?? "?" },
        },
      };
    }

    // Gate 3: budget
    if (request.estimated_cost_usd > budget.remaining_usd) {
      return {
        allow: false,
        blocked_by: "budget",
        reason: `estimated cost $${request.estimated_cost_usd.toFixed(4)} exceeds remaining budget $${budget.remaining_usd.toFixed(4)}`,
        request_id: request.request_id,
        decided_at: at,
        components: {
          kill_switch: { level: killDecision.level },
          tenant: { request: tenantDecision.request, resource: tenantDecision.resource, via: tenantDecision.via ?? "?" },
          budget: { remaining_usd: budget.remaining_usd, cap_usd: budget.cap_usd },
        },
      };
    }

    // Gate 4: approval-required
    if (request.requires_approval && !request.approved_by) {
      return {
        allow: false,
        blocked_by: "approval-required",
        reason: "operator approval required but not yet granted",
        request_id: request.request_id,
        decided_at: at,
        components: {
          kill_switch: { level: killDecision.level },
          tenant: { request: tenantDecision.request, resource: tenantDecision.resource, via: tenantDecision.via ?? "?" },
          budget: { remaining_usd: budget.remaining_usd, cap_usd: budget.cap_usd },
          approval: { required: true },
        },
      };
    }

    return {
      allow: true,
      blocked_by: "none",
      reason: "all 4 gates passed: kill-switch / tenant / budget / approval",
      request_id: request.request_id,
      decided_at: at,
      components: {
        kill_switch: { level: killDecision.level },
        tenant: { request: tenantDecision.request, resource: tenantDecision.resource, via: tenantDecision.via ?? "?" },
        budget: { remaining_usd: budget.remaining_usd, cap_usd: budget.cap_usd },
        approval: { required: request.requires_approval, approved_by: request.approved_by },
      },
    };
  }

  /** Render a verdict for operator audit log. */
  static renderVerdict(v: ControlPlaneVerdict): string {
    const head = v.allow ? "ALLOW" : `DENY (${v.blocked_by})`;
    return `[${head}] request=${v.request_id} at=${v.decided_at} — ${v.reason}`;
  }
}

export const unifiedControlPlaneEngine = UnifiedControlPlaneEngine;
