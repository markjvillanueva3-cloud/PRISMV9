/**
 * extractionPlanExecutor -- drive a blueprint/document extraction routing PLAN to actual consumer dispatch.
 *
 * WHY (cross-domain "apply extraction to ALL app features" end-to-end): `blueprintExtractionRouter`
 * (routeExtractionToConsumers) produces a confirm-gated fan-out PLAN -- which downstream prism feature each
 * extraction CAN drive -- but it is PURE: it plans, it does not call anything. Nothing turned the plan into
 * ACTION. This module is that missing executor: given a validated plan + a dispatcher-call fn + the
 * operator's confirmations, it drives the eligible, confirm-cleared consumer actions across EVERY downstream
 * domain (quote -> business, program -> cam, inspection/fai/cmm -> quality, feature/cad/redact -> cad, ...),
 * isolating per-consumer errors and aggregating a report.
 *
 * SAFETY (the load-bearing rule): a COMMITMENT consumer (quote = money, print_to_program = machine motion /
 * scrap, inspection/fai/cmm = part acceptance) is NEVER auto-fired. It executes ONLY when its consumer id is
 * in `confirmedConsumers` (the operator's explicit per-consumer authorization, which also clears any
 * `requires_confirmation` below-floor fields). By default ONLY `advisory` + `privacy` consumers execute
 * (analysis / material-resolve / redaction -- reviewable, non-committing). This mirrors the router's own
 * confirm-gate, enforced at the point of EXECUTION.
 *
 * ARCHITECTURE: a pure, dependency-injected async function (the dispatcher-call fn is INJECTED, never
 * imported) so it lives at the ROUTE layer (which legitimately orchestrates dispatchers via callTool, like
 * `routes/drawing.ts::extractDrawingChain`) and is unit-testable with a mock callTool -- it does NOT make a
 * cross-dispatcher call (the dispatcher-layer rule). Total: never throws on a malformed plan / a throwing
 * callTool; a per-consumer failure is isolated, recorded, and never aborts the rest.
 *
 * @module engines/blueprint-vision/extractionPlanExecutor
 * @since   U-XRAY-EXTRACTION-PLAN-EXECUTOR (2026-06-25, slot xray -- cross-domain, operator bypass-domains directive)
 */

import type { ExtractionRoutingPlan, ConsumerRoute, ConsumerKind } from "./blueprintExtractionRouter.js";

/** Dispatcher-call fn (toolName, action, params) -> result. Injected (route layer supplies the real one). */
export type CallToolFn = (tool: string, action: string, params: Record<string, unknown>) => Promise<unknown>;

/** Plan-execution envelope version (independent of the routing-plan + contract versions it consumes). */
export const EXTRACTION_PLAN_EXECUTION_VERSION = "1.0.0";

/** Default consumer kinds executed when the caller does not restrict -- advisory + privacy ONLY (never commitment). */
export const DEFAULT_EXECUTE_KINDS: readonly ConsumerKind[] = Object.freeze(["advisory", "privacy"]);

export interface ExecutePlanOpts {
  /**
   * Which NON-commitment kinds may execute (default `advisory` + `privacy`). Commitment consumers are
   * governed ONLY by `confirmedConsumers`, never by this list -- a commitment is never fired implicitly.
   */
  allowedKinds?: ConsumerKind[];
  /**
   * Consumer ids the operator has EXPLICITLY authorized to execute. The sole gate for a commitment consumer
   * (quote/program/inspection/fai/cmm): present => the operator confirmed it (and any below-floor fields it
   * depends on); absent => the commitment is skipped. Has no effect on advisory/privacy (already governed by
   * `allowedKinds`), but listing one is harmless.
   */
  confirmedConsumers?: string[];
  /** When true, decide what WOULD execute and return `planned` per route -- call nothing. default false. */
  dryRun?: boolean;
}

/** Per-consumer execution outcome. */
export type ExecStatus =
  | "executed"
  | "planned"                        // dryRun: would have executed
  | "skipped-ineligible"             // the extraction cannot drive this consumer
  | "skipped-kind"                   // a non-commitment kind the caller did not allow
  | "skipped-unconfirmed-commitment" // a commitment with no explicit operator confirmation (incl. requires_confirmation)
  | "error";                         // the dispatch threw OR returned a failure envelope (isolated)

export interface ConsumerExecResult {
  consumer: string;
  dispatcher: string;
  action: string;
  kind: ConsumerKind;
  status: ExecStatus;
  /** operator-facing explanation of the status. */
  reason: string;
  /** the dispatcher result (only on `executed`). */
  result?: unknown;
  /** the failure message (only on `error`) -- generic, never echoes raw internals. */
  error?: string;
}

export interface PlanExecutionReport {
  schemaVersion: string;
  /** the routing-plan schemaVersion this execution was derived from (drift trip-wire). */
  plan_version: string;
  dryRun: boolean;
  results: ConsumerExecResult[];
  summary: {
    executed: number;
    planned: number;
    skipped: number;
    errored: number;
    /** commitments that were skipped purely for lack of confirmation (the actionable "needs operator" count). */
    needs_confirmation: number;
  };
}

/** Defensive: a plan's routes as a real array (the executor never throws on a malformed plan). */
function routesOf(plan: ExtractionRoutingPlan): ConsumerRoute[] {
  return plan && Array.isArray(plan.routes) ? plan.routes : [];
}

/** A dispatcher result is a failure if it is a `{success:false}` envelope or an `{error}` object. */
function isFailureEnvelope(res: unknown): boolean {
  if (!res || typeof res !== "object") return false;
  const r = res as { success?: unknown; error?: unknown };
  if (r.success === false) return true;
  if (r.error != null && r.error !== false) return true;
  return false;
}

/**
 * Decide a route's pre-dispatch disposition WITHOUT side effects (pure -- the gate). Returns the terminal
 * skip status, or `null` meaning "proceed to dispatch".
 */
export function decideRouteDisposition(
  route: ConsumerRoute,
  allowedKinds: readonly ConsumerKind[],
  confirmed: ReadonlySet<string>,
): { status: Exclude<ExecStatus, "executed" | "planned" | "error">; reason: string } | null {
  if (!route || route.eligible !== true) {
    return { status: "skipped-ineligible", reason: "extraction cannot drive this consumer (missing required fields)" };
  }
  if (route.kind === "commitment") {
    // a commitment (money / machine motion / acceptance) NEVER fires without explicit operator confirmation.
    if (!confirmed.has(route.consumer)) {
      return {
        status: "skipped-unconfirmed-commitment",
        reason: route.requires_confirmation
          ? `commitment with ${route.blocking_fields} below-floor field(s) -- needs operator confirmation`
          : "commitment consumer -- needs explicit operator confirmation before firing",
      };
    }
    return null; // confirmed -> proceed
  }
  // advisory | privacy
  if (!allowedKinds.includes(route.kind)) {
    return { status: "skipped-kind", reason: `kind '${route.kind}' not in the allowed-execute set` };
  }
  return null; // proceed
}

/**
 * Execute a validated extraction routing plan against the downstream consumer dispatchers.
 *
 * Deterministic + sequential (route order preserved) so the report + the confirm-gate reasoning are
 * reproducible and a precedence (e.g. redact before a share) is honored. Per-consumer error isolation: a
 * throwing/failing dispatch is recorded as `error` and never aborts the remaining routes.
 *
 * NOTE on `kind` trust: the gate keys on each route's `kind` (commitment vs advisory/privacy). The route-
 * layer `executePlanResponse` re-derives the plan from a contract via the trusted `blueprint_extract_route`,
 * so `kind` always comes from the frozen CONSUMERS table (un-spoofable). A DIRECT caller that hand-builds a
 * plan owns `kind` integrity -- a real money/motion consumer mislabeled `advisory` would execute by default.
 * Pass executor-built/router-derived plans, not caller-trusted ones.
 *
 * @param plan a plan from `routeExtractionToConsumers` (already validated upstream)
 * @param callTool injected dispatcher-call fn (the route layer supplies the real one; tests pass a mock)
 * @param opts allowedKinds / confirmedConsumers / dryRun
 */
export async function executeExtractionPlan(
  plan: ExtractionRoutingPlan,
  callTool: CallToolFn,
  opts: ExecutePlanOpts = {},
): Promise<PlanExecutionReport> {
  const allowedKinds = Array.isArray(opts.allowedKinds) ? opts.allowedKinds : DEFAULT_EXECUTE_KINDS;
  const confirmed = new Set<string>(Array.isArray(opts.confirmedConsumers) ? opts.confirmedConsumers : []);
  const dryRun = opts.dryRun === true;
  const results: ConsumerExecResult[] = [];

  for (const route of routesOf(plan)) {
    const base = {
      consumer: route?.consumer ?? "(unknown)",
      dispatcher: route?.dispatcher ?? "(unknown)",
      action: route?.action ?? "(unknown)",
      kind: (route?.kind ?? "advisory") as ConsumerKind,
    };
    const disposition = decideRouteDisposition(route, allowedKinds, confirmed);
    if (disposition) {
      results.push({ ...base, status: disposition.status, reason: disposition.reason });
      continue;
    }
    if (dryRun) {
      results.push({ ...base, status: "planned", reason: "would execute (dryRun)" });
      continue;
    }
    // a route cleared the gate but is structurally unusable -> error, never dispatch a bad call.
    if (typeof route.dispatcher !== "string" || !route.dispatcher || typeof route.action !== "string" || !route.action) {
      results.push({ ...base, status: "error", reason: "route missing dispatcher/action", error: "malformed route" });
      continue;
    }
    const payload = (route.payload && typeof route.payload === "object" ? route.payload : {}) as Record<string, unknown>;
    try {
      const result = await callTool(route.dispatcher, route.action, payload);
      if (isFailureEnvelope(result)) {
        // do NOT attach the raw failure envelope -- it can carry internal dispatcher detail and the report
        // is surfaced on an unauthenticated route. Keep only the generic `error` string (the success branch
        // keeps `result`, which is the legitimate consumer output the caller asked for).
        results.push({ ...base, status: "error", reason: "consumer dispatcher returned a failure", error: "dispatcher failure envelope" });
      } else {
        results.push({ ...base, status: "executed", reason: "consumer dispatched successfully", result });
      }
    } catch (err) {
      // error isolation: record + continue; generic message (never echo raw internals to an external surface).
      results.push({ ...base, status: "error", reason: "consumer dispatch threw", error: err instanceof Error ? err.message : "dispatch error" });
    }
  }

  const count = (s: ExecStatus) => results.filter((r) => r.status === s).length;
  const skipped = results.filter((r) => r.status.startsWith("skipped")).length;
  return {
    schemaVersion: EXTRACTION_PLAN_EXECUTION_VERSION,
    plan_version: typeof plan?.schemaVersion === "string" ? plan.schemaVersion : EXTRACTION_PLAN_EXECUTION_VERSION,
    dryRun,
    results,
    summary: {
      executed: count("executed"),
      planned: count("planned"),
      skipped,
      errored: count("error"),
      needs_confirmation: count("skipped-unconfirmed-commitment"),
    },
  };
}
