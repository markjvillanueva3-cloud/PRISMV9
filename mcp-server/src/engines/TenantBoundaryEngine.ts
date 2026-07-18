/**
 * TenantBoundaryEngine — U-HAGI10 multi-customer data isolation (Voxyz L12 sub-axis).
 *
 * Pure-core decision engine: given a request's `requestTenantId`, the target
 * resource's `resourceTenantId`, and an operator-supplied allowlist of
 * cross-tenant pairings, returns an allow/deny verdict + a reason.
 *
 * Default policy: same-tenant always allowed, cross-tenant always denied
 * unless explicitly listed in `crossTenantAllowlist`.  Caller wraps every
 * customer-facing dispatcher with `decide()` to enforce isolation.
 *
 * @module engines/TenantBoundaryEngine
 */

import { z } from "zod";

export const TenantIdSchema = z.string().min(1).max(64).regex(
  /^[a-zA-Z0-9_-]+$/,
  "Tenant id must be alphanumeric + _- only",
);

export const CrossTenantPairSchema = z.object({
  from: TenantIdSchema,
  to: TenantIdSchema,
  reason: z.string().min(1).max(200),
});
export type CrossTenantPair = z.infer<typeof CrossTenantPairSchema>;

export interface BoundaryDecision {
  allow: boolean;
  request: string;
  resource: string;
  reason: string;
  via?: "same-tenant" | "cross-allowed" | "cross-denied" | "system";
}

const SYSTEM_TENANT = "_system_";

export class TenantBoundaryEngine {
  static validateTenantId(id: unknown): string { return TenantIdSchema.parse(id); }

  static validatePair(p: unknown): CrossTenantPair { return CrossTenantPairSchema.parse(p); }

  /**
   * Decide whether request-tenant may access resource-tenant.
   *
   * Decision order (each step short-circuits):
   *   1. If either id is empty → DENY (defensive)
   *   2. If requestTenantId === "_system_" → ALLOW (system always permitted)
   *   3. If requestTenantId === resourceTenantId → ALLOW (same-tenant)
   *   4. If (request, resource) appears in allowlist → ALLOW with reason
   *   5. Otherwise → DENY (default-deny on cross-tenant)
   */
  static decide(
    requestTenantId: string,
    resourceTenantId: string,
    crossTenantAllowlist: readonly CrossTenantPair[] = [],
  ): BoundaryDecision {
    if (typeof requestTenantId !== "string" || requestTenantId.length === 0) {
      return { allow: false, request: String(requestTenantId), resource: resourceTenantId,
        reason: "missing request tenant id", via: "cross-denied" };
    }
    if (typeof resourceTenantId !== "string" || resourceTenantId.length === 0) {
      return { allow: false, request: requestTenantId, resource: String(resourceTenantId),
        reason: "missing resource tenant id", via: "cross-denied" };
    }
    // Defensive: validate format (throws on bad)
    TenantIdSchema.parse(requestTenantId);
    TenantIdSchema.parse(resourceTenantId);

    if (requestTenantId === SYSTEM_TENANT) {
      return { allow: true, request: requestTenantId, resource: resourceTenantId,
        reason: "system tenant — full access", via: "system" };
    }
    if (requestTenantId === resourceTenantId) {
      return { allow: true, request: requestTenantId, resource: resourceTenantId,
        reason: "same tenant", via: "same-tenant" };
    }
    for (const pair of crossTenantAllowlist) {
      if (pair.from === requestTenantId && pair.to === resourceTenantId) {
        return { allow: true, request: requestTenantId, resource: resourceTenantId,
          reason: `cross-tenant allowlist: ${pair.reason}`, via: "cross-allowed" };
      }
    }
    return { allow: false, request: requestTenantId, resource: resourceTenantId,
      reason: "cross-tenant access denied (default-deny)", via: "cross-denied" };
  }

  /**
   * Filter an array of resources to those the request tenant may access.
   * Resources must carry their tenantId at the supplied accessor.
   */
  static filterAccessible<T>(
    requestTenantId: string,
    resources: readonly T[],
    getResourceTenant: (r: T) => string,
    crossTenantAllowlist: readonly CrossTenantPair[] = [],
  ): T[] {
    if (typeof getResourceTenant !== "function") {
      throw new Error("filterAccessible requires getResourceTenant function");
    }
    return resources.filter((r) =>
      TenantBoundaryEngine.decide(requestTenantId, getResourceTenant(r), crossTenantAllowlist).allow);
  }

  /** Render a decision as operator-readable markdown for audit logs. */
  static renderDecision(d: BoundaryDecision): string {
    const verdict = d.allow ? "ALLOW" : "DENY";
    return `[${verdict}] request=${d.request} resource=${d.resource} via=${d.via ?? "?"} — ${d.reason}`;
  }
}

export const tenantBoundaryEngine = TenantBoundaryEngine;
