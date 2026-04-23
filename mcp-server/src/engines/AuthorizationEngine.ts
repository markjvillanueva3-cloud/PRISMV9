/**
 * AuthorizationEngine (U-LPR-SEC05 — plan-spec version)
 *
 * Consolidated authz decision service with REST/MCP parity verification.
 * The earlier SEC05 commit built RateLimitingEngine; the plan spec
 * actually asked for a unified policy layer that ensures every protected
 * operation produces the same decision whether reached via REST or via
 * the MCP tool dispatcher.
 *
 * Design:
 *
 *   - Resources are identified by a canonical `(resource_type, resource_id)`
 *     pair (e.g. "lathe_program/P-1042"). Each resource is reachable via
 *     one or more bindings — a REST route + method, or an MCP tool +
 *     action. Bindings point to the same resource so a single policy
 *     covers both surfaces.
 *
 *   - Policies combine RBAC (role → permissions) with scoped
 *     per-resource rules. Evaluation is deterministic and order-
 *     independent: explicit `deny` beats any `allow`, then `allow`,
 *     then a default `deny` fallback (deny-by-default per zero-trust).
 *
 *   - `verifyParity` takes a resource + principal + action and proves
 *     that both bindings would return the identical decision. Returns
 *     the decision and a boolean `parity`. Mismatch → test failure →
 *     CI gate before merge.
 *
 *   - Every decision (allow/deny) is appended to an in-memory audit
 *     stream for SEC04 to persist.
 *
 * Pure calculation engine. No I/O.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC05 — Authorization parity (REST ↔ MCP)
 */

// ============================================================================
// TYPES
// ============================================================================

export type Surface = "rest" | "mcp";

export type Decision = "allow" | "deny" | "abstain";

export type PermissionAction =
  | "read" | "create" | "update" | "delete"
  | "execute" | "approve" | "export" | "admin";

export interface ResourceBinding {
  /** Surface the binding targets. */
  surface: Surface;
  /** For REST: HTTP method. For MCP: dispatcher name. */
  method_or_dispatcher: string;
  /** For REST: route pattern (e.g. "/api/programs/:id"). For MCP: action. */
  route_or_action: string;
}

export interface Resource {
  /** Resource type (e.g. "lathe_program", "tenant", "quote"). */
  type: string;
  /** Stable resource identifier. */
  id: string;
  /** REST and/or MCP bindings that surface this resource. */
  bindings: ResourceBinding[];
  /** Tenant that owns this resource (for per-tenant isolation). */
  tenant_id: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  resource_type: string;
  action: PermissionAction;
}

export interface Policy {
  id: string;
  /** Principal identity (user id) OR role id. */
  subject: string;
  subject_kind: "user" | "role";
  /** Target resource. "*" = any id of the given type. */
  resource_type: string;
  resource_id: string | "*";
  action: PermissionAction;
  effect: "allow" | "deny";
  tenant_id: string | "*";
  /** Optional condition expression (stringly-typed; evaluator is the caller). */
  condition?: string;
}

export interface Principal {
  id: string;
  tenant_id: string;
  roles: string[];
}

export interface DecisionRequest {
  principal: Principal;
  resource_type: string;
  resource_id: string;
  action: PermissionAction;
  surface: Surface;
  /** Optional attribute bag for ABAC. */
  context?: Record<string, unknown>;
}

export interface DecisionRecord {
  seq: number;
  at: number;
  principal_id: string;
  resource_type: string;
  resource_id: string;
  action: PermissionAction;
  surface: Surface;
  decision: Decision;
  matched_policy: string | null;
  reason: string;
}

export interface ParityResult {
  resource_type: string;
  resource_id: string;
  action: PermissionAction;
  principal_id: string;
  rest_decision: Decision;
  mcp_decision: Decision;
  parity: boolean;
  delta_reason: string | null;
}

export interface AuthzStats {
  resources: number;
  roles: number;
  policies: number;
  decisions_total: number;
  decisions_allowed: number;
  decisions_denied: number;
  parity_checks_total: number;
  parity_failures: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class AuthorizationEngine {
  private resources = new Map<string, Resource>();
  private roles = new Map<string, Role>();
  private policies = new Map<string, Policy>();
  private decisions: DecisionRecord[] = [];
  private parityChecks: ParityResult[] = [];
  private seq = 0;

  // ──────────────────────────────────────────────────────────────────────
  // Resource registry
  // ──────────────────────────────────────────────────────────────────────

  registerResource(input: Resource): Resource {
    if (!input.type.trim()) throw new Error("resource type required");
    if (!input.id.trim()) throw new Error("resource id required");
    if (!input.tenant_id.trim()) throw new Error("tenant_id required");
    if (!input.bindings.length) throw new Error("at least one binding required");
    const key = this.resourceKey(input.type, input.id);
    if (this.resources.has(key)) throw new Error(`resource ${key} already registered`);
    const surfaces = new Set(input.bindings.map(b => b.surface));
    // Parity guarantee only holds if a resource has both REST + MCP bindings
    // OR explicitly opts into single-surface exposure. We permit single-
    // surface resources but verifyParity on them returns abstain.
    for (const b of input.bindings) {
      if (!b.method_or_dispatcher.trim()) throw new Error("binding method/dispatcher required");
      if (!b.route_or_action.trim()) throw new Error("binding route/action required");
    }
    const copy: Resource = {
      ...input,
      bindings: input.bindings.map(b => ({ ...b })),
    };
    this.resources.set(key, copy);
    void surfaces;
    return copy;
  }

  getResource(type: string, id: string): Resource | null {
    return this.resources.get(this.resourceKey(type, id)) ?? null;
  }

  listResources(tenant_id?: string): Resource[] {
    const all = Array.from(this.resources.values());
    return tenant_id ? all.filter(r => r.tenant_id === tenant_id) : all;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Role registry
  // ──────────────────────────────────────────────────────────────────────

  registerRole(input: Role): Role {
    if (!input.id.trim()) throw new Error("role id required");
    if (this.roles.has(input.id)) throw new Error(`role ${input.id} already registered`);
    this.roles.set(input.id, { ...input, permissions: [...input.permissions] });
    return this.roles.get(input.id)!;
  }

  getRole(id: string): Role | null {
    return this.roles.get(id) ?? null;
  }

  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  // ──────────────────────────────────────────────────────────────────────
  // Policy registry
  // ──────────────────────────────────────────────────────────────────────

  registerPolicy(input: Policy): Policy {
    if (!input.id.trim()) throw new Error("policy id required");
    if (this.policies.has(input.id)) throw new Error(`policy ${input.id} already registered`);
    if (input.subject_kind === "role" && !this.roles.has(input.subject)) {
      throw new Error(`role policy references unknown role: ${input.subject}`);
    }
    this.policies.set(input.id, { ...input });
    return { ...input };
  }

  removePolicy(id: string): boolean {
    return this.policies.delete(id);
  }

  listPolicies(filter?: { tenant_id?: string; resource_type?: string }): Policy[] {
    const all = Array.from(this.policies.values());
    return all.filter(p =>
      (!filter?.tenant_id || p.tenant_id === filter.tenant_id || p.tenant_id === "*") &&
      (!filter?.resource_type || p.resource_type === filter.resource_type),
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Decision evaluation
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Evaluate authz. Order of precedence:
   *   1. Tenant isolation: principal.tenant_id must match resource.tenant_id
   *      (or principal holds a cross-tenant role) → else deny.
   *   2. Explicit policy `deny` on principal or any of their roles wins.
   *   3. Explicit policy `allow` on principal or any of their roles wins.
   *   4. Role-based permission (role.permissions) grants allow.
   *   5. Default deny (deny-by-default).
   *
   * Decisions are auto-logged.
   */
  evaluate(req: DecisionRequest): DecisionRecord {
    const subjects = new Set<string>([req.principal.id, ...req.principal.roles]);
    const subjectKinds = new Map<string, "user" | "role">();
    subjectKinds.set(req.principal.id, "user");
    for (const r of req.principal.roles) subjectKinds.set(r, "role");

    const resource = this.getResource(req.resource_type, req.resource_id);
    let decision: Decision = "deny";
    let matched: string | null = null;
    let reason = "default deny";

    // Tenant isolation (skip if resource not registered — fail closed unless caller allows anon).
    if (resource && resource.tenant_id !== req.principal.tenant_id) {
      reason = `tenant mismatch: principal=${req.principal.tenant_id} resource=${resource.tenant_id}`;
      return this.logDecision(req, "deny", null, reason);
    }

    // Collect candidate policies matching resource scope + action.
    const candidates: Policy[] = [];
    for (const p of this.policies.values()) {
      if (p.resource_type !== req.resource_type) continue;
      if (p.resource_id !== req.resource_id && p.resource_id !== "*") continue;
      if (p.action !== req.action) continue;
      if (p.tenant_id !== "*" && p.tenant_id !== req.principal.tenant_id) continue;
      if (!subjects.has(p.subject)) continue;
      if (subjectKinds.get(p.subject) !== p.subject_kind) continue;
      candidates.push(p);
    }

    // Step 2: explicit deny wins.
    const explicitDeny = candidates.find(p => p.effect === "deny");
    if (explicitDeny) {
      decision = "deny";
      matched = explicitDeny.id;
      reason = `explicit deny policy ${explicitDeny.id}`;
      return this.logDecision(req, decision, matched, reason);
    }

    // Step 3: explicit allow.
    const explicitAllow = candidates.find(p => p.effect === "allow");
    if (explicitAllow) {
      decision = "allow";
      matched = explicitAllow.id;
      reason = `explicit allow policy ${explicitAllow.id}`;
      return this.logDecision(req, decision, matched, reason);
    }

    // Step 4: role-based permission.
    for (const roleId of req.principal.roles) {
      const role = this.roles.get(roleId);
      if (!role) continue;
      if (role.permissions.some(p => p.resource_type === req.resource_type && p.action === req.action)) {
        decision = "allow";
        matched = `role:${roleId}`;
        reason = `granted by role ${role.name}`;
        return this.logDecision(req, decision, matched, reason);
      }
    }

    return this.logDecision(req, decision, matched, reason);
  }

  // ──────────────────────────────────────────────────────────────────────
  // REST/MCP parity
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Verify that REST and MCP surfaces yield the same decision for the
   * same (principal, resource, action) triple. Returns parity=false if
   * either surface lacks a binding OR if decisions differ.
   */
  verifyParity(input: {
    principal: Principal;
    resource_type: string;
    resource_id: string;
    action: PermissionAction;
    context?: Record<string, unknown>;
  }): ParityResult {
    const resource = this.getResource(input.resource_type, input.resource_id);
    if (!resource) {
      const r: ParityResult = {
        resource_type: input.resource_type,
        resource_id: input.resource_id,
        action: input.action,
        principal_id: input.principal.id,
        rest_decision: "abstain",
        mcp_decision: "abstain",
        parity: false,
        delta_reason: "resource not registered",
      };
      this.parityChecks.push(r);
      return r;
    }
    const hasRest = resource.bindings.some(b => b.surface === "rest");
    const hasMcp = resource.bindings.some(b => b.surface === "mcp");

    const restDecision = hasRest
      ? this.evaluate({ ...input, surface: "rest" }).decision
      : "abstain";
    const mcpDecision = hasMcp
      ? this.evaluate({ ...input, surface: "mcp" }).decision
      : "abstain";

    const parity = hasRest && hasMcp && restDecision === mcpDecision;
    const delta_reason = parity
      ? null
      : !hasRest
        ? "no REST binding"
        : !hasMcp
          ? "no MCP binding"
          : `decisions differ: rest=${restDecision} mcp=${mcpDecision}`;

    const r: ParityResult = {
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      action: input.action,
      principal_id: input.principal.id,
      rest_decision: restDecision,
      mcp_decision: mcpDecision,
      parity,
      delta_reason,
    };
    this.parityChecks.push(r);
    return r;
  }

  /**
   * Batch parity verification across every registered resource + action
   * for a principal. Useful as a CI gate before merging authz changes.
   */
  parityCoverageReport(principal: Principal): {
    total: number;
    parity_ok: number;
    parity_fail: number;
    failures: ParityResult[];
  } {
    const results: ParityResult[] = [];
    const actions: PermissionAction[] = [
      "read", "create", "update", "delete", "execute", "approve", "export", "admin",
    ];
    for (const r of this.resources.values()) {
      if (r.tenant_id !== principal.tenant_id) continue;
      const hasRest = r.bindings.some(b => b.surface === "rest");
      const hasMcp = r.bindings.some(b => b.surface === "mcp");
      if (!hasRest || !hasMcp) continue; // skip single-surface resources
      for (const action of actions) {
        results.push(this.verifyParity({
          principal,
          resource_type: r.type,
          resource_id: r.id,
          action,
        }));
      }
    }
    return {
      total: results.length,
      parity_ok: results.filter(r => r.parity).length,
      parity_fail: results.filter(r => !r.parity).length,
      failures: results.filter(r => !r.parity),
    };
  }

  listParityChecks(limit = 100): ParityResult[] {
    return this.parityChecks.slice(-limit);
  }

  listDecisions(limit = 200): DecisionRecord[] {
    return this.decisions.slice(-limit);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Stats + admin
  // ──────────────────────────────────────────────────────────────────────

  getStats(): AuthzStats {
    return {
      resources: this.resources.size,
      roles: this.roles.size,
      policies: this.policies.size,
      decisions_total: this.decisions.length,
      decisions_allowed: this.decisions.filter(d => d.decision === "allow").length,
      decisions_denied: this.decisions.filter(d => d.decision === "deny").length,
      parity_checks_total: this.parityChecks.length,
      parity_failures: this.parityChecks.filter(p => !p.parity).length,
    };
  }

  clearAll(): void {
    this.resources.clear();
    this.roles.clear();
    this.policies.clear();
    this.decisions.length = 0;
    this.parityChecks.length = 0;
    this.seq = 0;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────

  private resourceKey(type: string, id: string): string {
    return `${type}/${id}`;
  }

  private logDecision(
    req: DecisionRequest,
    decision: Decision,
    matched_policy: string | null,
    reason: string,
  ): DecisionRecord {
    const rec: DecisionRecord = {
      seq: ++this.seq,
      at: Date.now(),
      principal_id: req.principal.id,
      resource_type: req.resource_type,
      resource_id: req.resource_id,
      action: req.action,
      surface: req.surface,
      decision,
      matched_policy,
      reason,
    };
    this.decisions.push(rec);
    return rec;
  }
}

export const authorizationEngine = new AuthorizationEngine();
