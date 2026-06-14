/**
 * shopFloorOutcomeBridge — wire shop-floor producers to the universal outcome bus.
 *
 * BRIDGE-DEEP / U-BRIDGE-SHOPFLOOR-LEARN — closes the half-open learning loop:
 * producer engines (WEDMJobOutcomeEngine + MachineConnectivityEngine) keep their
 * own per-domain ledgers, but the cross-domain learning consumers
 * (CrossProcessNeuralLearningEngine, LearningAdaptationEngine, LearningCascadeEngine)
 * read the universal `outcomeCaptureBus`. This lib normalizes producer-specific
 * records into OutcomeEvents and fires them at the bus.
 *
 * Pure mapping fns are exported for unit testing. The emit fns are thin shells
 * that call into `outcomeCaptureBusEngine.record()` (which is fire-and-forget by
 * contract — never throws upstream). Per R5: routing is deterministic, not a
 * model judgment call — keep the mapping table small and explicit.
 *
 * @module utils/shopFloorOutcomeBridge
 * @milestone BRIDGE-DEEP / U-BRIDGE-SHOPFLOOR-LEARN
 */

import { outcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";
import type { RecordOutcomeResult } from "../engines/OutcomeCaptureBusEngine.js";
import { OutcomeDomain } from "../schemas/outcomeEventSchema.js";
import type {
  OutcomeDomainT,
  OutcomeKindT,
  OutcomeSeverityT,
  OutcomeSourceT,
} from "../schemas/outcomeEventSchema.js";

// Bounds for free-form fields crossing the bus boundary. Sister to substrate-
// health 1 MB cap and precompact-loop-state 64 KB / 10-candidate caps already
// in the codebase — every bus-bound bridge must clamp producer-controlled
// strings so a single hostile/buggy emit cannot corrupt the JSONL shard with
// embedded newlines or megabyte notes (per scrutiny round 1, P1-3).
// Exported so tests assert against the constant (not a magic literal), per
// scrutiny round 2, P2-3 (drift risk if the cap moves).
export const MAX_ID_CHARS = 256;
export const MAX_NOTE_CHARS = 2048;

/**
 * Minimal bus interface — both emit fns accept an optional injected bus so
 * tests can target a tmpdir-rooted OutcomeCaptureBusEngine instance instead of
 * polluting the live `state/outcomes/*.jsonl` shards (per scrutiny round 2,
 * P1-2 — every test emit accumulated forever in production data).
 * Production callers omit the param; the default is the live singleton.
 */
export interface OutcomeBusLike {
  record: typeof outcomeCaptureBusEngine.record;
}
// Strip CRLF + ASCII control bytes (except tab) from any field used as a JSONL
// primary key (lineage_id, ids); the bus's MAX_LINE_BYTES guard runs *after*
// JSON.stringify so an embedded newline already corrupted the line.
const CTRL_CHAR_RE = /[\x00-\x08\x0b-\x1f\x7f]/g;

function clampId(s: string | undefined | null): string {
  if (s == null) return "";
  const str = String(s).replace(CTRL_CHAR_RE, "").replace(/[\r\n]/g, "");
  return str.length > MAX_ID_CHARS ? str.slice(0, MAX_ID_CHARS) : str;
}

function clampNote(s: string | undefined | null): string | undefined {
  if (s == null) return undefined;
  const str = String(s).replace(CTRL_CHAR_RE, " ");
  return str.length > MAX_NOTE_CHARS ? str.slice(0, MAX_NOTE_CHARS) : str;
}

// ───────────────────────────────────────────────────────────────────────────
// MachineAlert (re-declared as a structural type so this lib does not couple
// to MachineConnectivityEngine's internal interface). Only fields we read.
// ───────────────────────────────────────────────────────────────────────────

// KEEP-IN-SYNC with MachineConnectivityEngine.AlertType (mcp-server/src/engines/
// MachineConnectivityEngine.ts, line ~30). If a new alert type is added there,
// extend this union AND add a case to mapAlertTypeToKind/mapAlertSource — the
// switch statements are exhaustive (no default) so TS flags the omission at
// build, but the runtime drift test in __tests__/shopFloorOutcomeBridge.test.ts
// is the belt-and-suspenders guard (per scrutiny round 1, P1 #3).
export type ShopFloorAlertType =
  | "chatter_detected"
  | "overload_trending"
  | "tool_wear_predicted"
  | "thermal_drift"
  | "alarm_active"
  | "feed_override_low";

export type ShopFloorAlertSeverity = "info" | "warning" | "critical";

export interface ShopFloorAlertLike {
  id: string;
  machine_id: string;
  type: ShopFloorAlertType;
  severity: ShopFloorAlertSeverity;
  message: string;
  timestamp: string;
}

// ───────────────────────────────────────────────────────────────────────────
// WEDM job outcome (re-declared structurally). Only fields we read.
// ───────────────────────────────────────────────────────────────────────────

export interface WEDMJobOutcomeLike {
  jobId: string;
  material: string;
  finishedAt: string;
  predicted: {
    raUm: number;
    cycleTimeMin: number;
  };
  actual: {
    raUm: number;
    cycleTimeMin: number;
    wireBreaks: number;
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Pure mapping fns — exported for tests.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Map a MachineConnectivity alert type to a canonical OutcomeKind. The bus
 * vocabulary is small and intentional — alert types without a direct kind
 * fall through to "other" so we never lose the event.
 */
export function mapAlertTypeToKind(t: ShopFloorAlertType): OutcomeKindT {
  switch (t) {
    case "chatter_detected":
      return "chatter_event";
    case "feed_override_low":
      return "operator_override";
    // No direct mapping in v1.1.0 — preserve as "other"; consumers route by
    // context.alert_type. Listed explicitly (not via default) so a future
    // OutcomeKind expansion forces a TS exhaustiveness re-review.
    case "overload_trending":
    case "tool_wear_predicted":
    case "thermal_drift":
    case "alarm_active":
      return "other";
  }
}

/**
 * Alert severity → OutcomeSeverity. The bus vocabulary has 5 levels
 * (info/low/medium/high/critical); the alert vocabulary has 3. Map upward
 * conservatively so a "warning" never silently downgrades to "info".
 */
export function mapAlertSeverity(s: ShopFloorAlertSeverity): OutcomeSeverityT {
  switch (s) {
    case "info":
      return "info";
    case "warning":
      return "medium";
    case "critical":
      return "critical";
  }
}

/**
 * Alert source attribution — `feed_override_low` is a human operator action
 * by definition (someone turned the override dial); the other alert types are
 * controller-derived analytics. Mis-attributing operator-caused events to
 * "controller" pollutes the causal-attribution prior the cross-process
 * learning engine builds (per scrutiny round 1, P1-2).
 */
export function mapAlertSource(t: ShopFloorAlertType): OutcomeSourceT {
  return t === "feed_override_low" ? "operator" : "controller";
}

/**
 * Normalize a domain hint to a valid OutcomeDomain. Unknown / undefined falls
 * through to "other" so an emit never fails on a malformed/missing hint
 * (per R12 — surface uncertainty, do not silently drop).
 *
 * The allowed set is derived FROM the canonical Zod enum at module load
 * (`OutcomeDomain.options`) so a schema expansion in outcomeEventSchema.ts is
 * picked up automatically — no hand-edited mirror to drift (per scrutiny
 * round 1, P1-1; an earlier hand-edited mirror was already missing
 * "shop_floor", silently downgrading every shop-floor hint to "other").
 */
const ALLOWED_DOMAINS: ReadonlySet<string> = new Set<string>(OutcomeDomain.options);

export function normalizeDomain(hint: string | undefined | null): OutcomeDomainT {
  if (!hint || typeof hint !== "string") return "other";
  return (ALLOWED_DOMAINS.has(hint) ? hint : "other") as OutcomeDomainT;
}

// ───────────────────────────────────────────────────────────────────────────
// Emit fns — thin shells calling outcomeCaptureBusEngine.record(). Fire-and-
// forget; the bus is non-throwing by contract.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Emit one OutcomeEvent per MachineAlert to the universal bus. Returns the
 * per-alert results array so callers can log emission failures if they care;
 * most callers ignore the return.
 *
 * The lineage_id ties this batch back to the (machine_id, ingest_timestamp)
 * pair so consumers can correlate alerts from one machine tick.
 */
export function emitFromMachineAlerts(
  machineId: string,
  domainHint: string | undefined | null,
  alerts: ShopFloorAlertLike[],
  ingestTimestampIso: string,
  bus: OutcomeBusLike = outcomeCaptureBusEngine,
): RecordOutcomeResult[] {
  if (!Array.isArray(alerts) || alerts.length === 0) return [];
  const domain = normalizeDomain(domainHint);
  const cleanMachineId = clampId(machineId);
  const cleanTs = clampId(ingestTimestampIso);
  const lineageId = `machine:${cleanMachineId}@${cleanTs}`;
  return alerts.map((a) =>
    bus.record({
      domain,
      kind: mapAlertTypeToKind(a.type),
      severity: mapAlertSeverity(a.severity),
      source: mapAlertSource(a.type),
      timestamp: a.timestamp,
      lineage_id: lineageId,
      context: {
        machine_id: cleanMachineId,
        engine: "MachineConnectivityEngine",
        action: "ingestLiveData",
        // Free-form passthrough (OutcomeContextSchema has .passthrough()).
        alert_type: a.type,
        alert_id: clampId(a.id),
      } as Record<string, unknown>,
      note: clampNote(a.message),
    }),
  );
}

/**
 * Emit cycle-time outcome + (when wire breaks observed) a tool_break outcome
 * to the universal bus. Mirrors the WEDMJobOutcomeEngine's own ledger so the
 * cross-domain consumers see WEDM job data without reading the WEDM-private
 * shard.
 *
 * lineage_id = jobId so the recommended(predicted)/actual delta correlates
 * across both events.
 */
export function emitFromWEDMJobOutcome(
  outcome: WEDMJobOutcomeLike,
  bus: OutcomeBusLike = outcomeCaptureBusEngine,
): RecordOutcomeResult[] {
  // Structural guard (R12 fail-loud) — a producer that hands us a malformed
  // outcome must not silently emit NaN deltas to the bus (per scrutiny round 1,
  // A's P2 #4). Refuse to emit; the producer's own ledger still captured the
  // record, so no signal is lost — only the cross-domain mirror is skipped.
  if (
    !outcome ||
    typeof outcome.jobId !== "string" ||
    outcome.jobId.length === 0 ||
    !outcome.predicted ||
    !outcome.actual ||
    typeof outcome.predicted.cycleTimeMin !== "number" ||
    typeof outcome.predicted.raUm !== "number" ||
    typeof outcome.actual.cycleTimeMin !== "number" ||
    typeof outcome.actual.raUm !== "number" ||
    typeof outcome.actual.wireBreaks !== "number" ||
    !Number.isFinite(outcome.predicted.cycleTimeMin) ||
    !Number.isFinite(outcome.predicted.raUm) ||
    !Number.isFinite(outcome.actual.cycleTimeMin) ||
    !Number.isFinite(outcome.actual.raUm) ||
    !Number.isFinite(outcome.actual.wireBreaks)
  ) {
    return [];
  }
  const results: RecordOutcomeResult[] = [];
  const jobId = clampId(outcome.jobId);
  const finishedAt = clampId(outcome.finishedAt);
  const sharedContext: Record<string, unknown> = {
    job_id: jobId,
    material: clampId(outcome.material),
    engine: "WEDMJobOutcomeEngine",
    action: "recordOutcome",
  };

  // 1. Cycle-time measurement — always emitted.
  results.push(
    bus.record({
      domain: "wedm",
      kind: "cycle_time_measurement",
      source: "controller",
      timestamp: finishedAt,
      lineage_id: jobId,
      context: sharedContext,
      recommended: { cycle_time_min: outcome.predicted.cycleTimeMin },
      actual: { cycle_time_min: outcome.actual.cycleTimeMin },
      delta: {
        cycle_time_error_min:
          outcome.actual.cycleTimeMin - outcome.predicted.cycleTimeMin,
      },
    }),
  );

  // 2. Surface finish — always emitted (canonical OutcomeKind for Ra).
  results.push(
    bus.record({
      domain: "wedm",
      kind: "surface_finish_ra",
      source: "controller",
      timestamp: finishedAt,
      lineage_id: jobId,
      context: sharedContext,
      recommended: { ra_um: outcome.predicted.raUm },
      actual: { ra_um: outcome.actual.raUm },
      delta: { ra_error_um: outcome.actual.raUm - outcome.predicted.raUm },
    }),
  );

  // 3. Tool-break — emitted ONLY when wireBreaks > 0. Severity escalates per
  // count: 1 break = medium, 2+ = high. Critical reserved for the
  // collision/safety class (a wire break is degradation, not danger).
  // Documented as policy per scrutiny round 1, A's P2 #6.
  if (outcome.actual.wireBreaks > 0) {
    const wireBreaks = outcome.actual.wireBreaks;
    const severity: OutcomeSeverityT = wireBreaks >= 2 ? "high" : "medium";
    results.push(
      bus.record({
        domain: "wedm",
        kind: "tool_break",
        severity,
        source: "controller",
        timestamp: finishedAt,
        lineage_id: jobId,
        context: sharedContext,
        actual: { wire_breaks: wireBreaks },
        note: clampNote(
          `${wireBreaks} wire break(s) observed during job ${jobId}`,
        ),
      }),
    );
  }

  return results;
}
