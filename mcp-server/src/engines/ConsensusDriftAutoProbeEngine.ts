/**
 * ConsensusDriftAutoProbeEngine — plan + persist verification probes for
 * actionable consensus drift events.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-DRIFT-AUTO-PROBE.
 *
 * Why this exists
 * ---------------
 * U-CONSENSUS-DRIFT-DETECTOR + U-CONSENSUS-DRIFT-ALERT-LOG capture and
 * persist EMA regressions, but a regression observed against a small N
 * could be sample variance rather than a real vendor degradation. The
 * accountable response is: when a moderate/severe alert fires, issue a
 * targeted re-probe of the same (vendor, taskType) so the next snapshot
 * either confirms (real degradation) or refutes (noise) the alert.
 *
 * This engine is the planner half of that loop. It is pure-compute over
 * a recent slice of the alert ledger plus a small "issued" state file
 * that prevents thrash (re-probing the same combo every cron tick).
 * Execution of the probes is the cron CLI's job — the engine only emits
 * the plan and persists which (vendor, task) pairs have already been
 * probed within the cooldown window.
 *
 * Design notes
 * ------------
 *  - Pure planning: planProbes() never writes; markProbed() is the only
 *    mutating call. This keeps the engine reusable from dispatcher tests
 *    (no FS side-effects from a query path).
 *  - Dedupe: many alerts can fire for the same (vendor, taskType) inside
 *    one recency window. We collapse to the most-severe most-recent.
 *  - Severity hierarchy: severe > moderate. Minor never produces probes.
 *  - Priority [0,1]: severe alerts saturate at |delta| = 0.5; moderate
 *    at |delta| = 0.3. Within a tier, larger magnitude ranks higher.
 *  - State file: small JSON keyed by `${vendor}|${taskType}`. Atomic
 *    write via tmp+rename. Robust to corrupt content (treated as empty).
 *  - Cooldown: combos probed within `cooldownMs` (default 1h) are
 *    excluded from the next plan, so successive cron ticks don't issue
 *    duplicate probes while the previous probe's data is still being
 *    aggregated into the next snapshot.
 *  - Path safety: override paths containing ".." are rejected with an
 *    error result; this is consistent with other consensus engines.
 *
 * @module engines/ConsensusDriftAutoProbeEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { AlertEntry } from "./ConsensusDriftAlertLogEngine.js";
import { consensusDriftAlertLogEngine } from "./ConsensusDriftAlertLogEngine.js";

const SCHEMA_VERSION = "1.0.0";
const DEFAULT_STATE_FILE_PATH =
  process.env.CONSENSUS_DRIFT_PROBES_PATH ??
  "H:/prism/state/shared/CONSENSUS_DRIFT_PROBES.json";
const DEFAULT_RECENCY_MS = 24 * 60 * 60 * 1000; // 24h
const DEFAULT_COOLDOWN_MS = 60 * 60 * 1000; // 1h
const DEFAULT_MAX_PROBES = 5;

export type ProbeReason = "drift-severe" | "drift-moderate";
export type ProbeSeverity = "moderate" | "severe";

export interface DriftProbe {
  vendor: string;
  taskType: string;
  severity: ProbeSeverity;
  /** Negative delta: emaAfter - emaBefore from the source alert. */
  delta: number;
  /** ISO ts of the source alert that justified this probe. */
  alertTs: string;
  /** [0,1] — higher = more painful regression. */
  priority: number;
  reason: ProbeReason;
}

export interface PlanProbesOpts {
  /** Override alert ledger path. */
  alertLogPath?: string;
  /** Override state file path. */
  stateFilePath?: string;
  /** Look-back window (ms) for alert ledger. Default 24h. */
  recencyMs?: number;
  /** Min interval since last probe of same (vendor,task) before re-issue. Default 1h. */
  cooldownMs?: number;
  /** Cap on probes returned. Default 5. */
  maxProbes?: number;
  /** Minimum severity considered. Default "moderate". */
  severityFloor?: ProbeSeverity;
  /** Test injection. */
  now?: Date;
}

export interface PlanStats {
  alertsConsidered: number;
  deduplicatedToPairs: number;
  excludedByRecency: number;
  excludedBySeverity: number;
  excludedByCooldown: number;
  cappedAt: number;
}

export interface PlanProbesResult {
  schemaVersion: string;
  generatedAt: string;
  probes: DriftProbe[];
  stats: PlanStats;
}

export interface MarkProbedInput {
  stateFilePath?: string;
  probes: readonly DriftProbe[];
  now?: Date;
}

export interface MarkProbedResult {
  ok: boolean;
  stateFilePath: string;
  written: number;
  error: string | null;
}

export interface PruneProbedInput {
  stateFilePath?: string;
  /** Entries with lastProbedTs older than (now - olderThanMs) are removed. Default 7d. */
  olderThanMs?: number;
  now?: Date;
}

export interface PruneProbedResult {
  ok: boolean;
  stateFilePath: string;
  pruned: number;
  remaining: number;
  error: string | null;
}

export interface ProbedRecordEntry {
  lastProbedTs: string;
  alertTs: string;
  severity: ProbeSeverity;
  delta: number;
}

export interface ProbedRecord {
  schemaVersion: string;
  issued: Record<string, ProbedRecordEntry>;
}

const SEVERITY_RANK: Record<ProbeSeverity, number> = { moderate: 1, severe: 2 };

export class ConsensusDriftAutoProbeEngine {
  /**
   * Compute the next probe plan from the alert ledger plus the
   * persisted "already probed" state. Pure read-only.
   */
  planProbes(opts: PlanProbesOpts = {}): PlanProbesResult {
    const now = opts.now ?? new Date();
    const recencyMs = opts.recencyMs ?? DEFAULT_RECENCY_MS;
    const cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    const maxProbes = Math.max(0, opts.maxProbes ?? DEFAULT_MAX_PROBES);
    const severityFloor = opts.severityFloor ?? "moderate";
    const sinceTs = new Date(now.getTime() - recencyMs).toISOString();

    const stats: PlanStats = {
      alertsConsidered: 0,
      deduplicatedToPairs: 0,
      excludedByRecency: 0,
      excludedBySeverity: 0,
      excludedByCooldown: 0,
      cappedAt: 0,
    };

    const allAlerts = consensusDriftAlertLogEngine.getAlerts({
      logPath: opts.alertLogPath,
      kind: "alert",
      // Filter recency in-engine so excludedByRecency is observable.
      limit: 1000,
    });

    const probedRecord = this.loadProbedRecord(opts.stateFilePath);
    const cooldownCutoff = new Date(now.getTime() - cooldownMs);

    // 1. Recency filter (and skip non-alert-shaped entries defensively).
    const recent: AlertEntry[] = [];
    for (const a of allAlerts) {
      stats.alertsConsidered++;
      if (a.kind !== "alert") continue;
      if (a.ts < sinceTs) {
        stats.excludedByRecency++;
        continue;
      }
      // 2. Severity floor.
      if (!isProbeSeverity(a.severity)) {
        stats.excludedBySeverity++;
        continue;
      }
      if (SEVERITY_RANK[a.severity] < SEVERITY_RANK[severityFloor]) {
        stats.excludedBySeverity++;
        continue;
      }
      recent.push(a);
    }

    // 3. Dedupe by (vendor,taskType): keep most-severe-most-recent.
    const byPair = new Map<string, AlertEntry>();
    for (const a of recent) {
      if (!a.vendor || !a.taskType) continue;
      const key = pairKey(a.vendor, a.taskType);
      const cur = byPair.get(key);
      if (!cur) {
        byPair.set(key, a);
        continue;
      }
      const curSev = SEVERITY_RANK[cur.severity as ProbeSeverity] ?? 0;
      const newSev = SEVERITY_RANK[a.severity as ProbeSeverity] ?? 0;
      if (newSev > curSev) byPair.set(key, a);
      else if (newSev === curSev && a.ts > cur.ts) byPair.set(key, a);
    }
    stats.deduplicatedToPairs = byPair.size;

    // 4. Cooldown filter.
    const candidates: AlertEntry[] = [];
    for (const a of byPair.values()) {
      const key = pairKey(a.vendor!, a.taskType!);
      const prior = probedRecord.issued[key];
      if (prior) {
        const lastProbed = parseTsSafe(prior.lastProbedTs);
        if (lastProbed && lastProbed >= cooldownCutoff) {
          stats.excludedByCooldown++;
          continue;
        }
      }
      candidates.push(a);
    }

    // 5. Convert to DriftProbe + priority + sort + cap.
    const probes: DriftProbe[] = candidates.map((a) => {
      const severity = a.severity as ProbeSeverity;
      const delta = typeof a.delta === "number" ? a.delta : 0;
      const priority = computePriority(severity, delta);
      return {
        vendor: a.vendor!,
        taskType: a.taskType!,
        severity,
        delta,
        alertTs: a.ts,
        priority,
        reason: severity === "severe" ? "drift-severe" : "drift-moderate",
      };
    });

    probes.sort((x, y) => {
      if (y.priority !== x.priority) return y.priority - x.priority;
      // tie-break: newer alert first
      if (y.alertTs !== x.alertTs) return y.alertTs > x.alertTs ? 1 : -1;
      // stable lex
      if (x.taskType !== y.taskType) return x.taskType < y.taskType ? -1 : 1;
      return x.vendor < y.vendor ? -1 : 1;
    });

    if (probes.length > maxProbes) {
      stats.cappedAt = probes.length - maxProbes;
      probes.length = maxProbes;
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: now.toISOString(),
      probes,
      stats,
    };
  }

  /**
   * Persist that these probes were issued. Atomic via tmp+rename. Safe
   * to call on an empty array (no-op + ok:true).
   */
  markProbed(input: MarkProbedInput): MarkProbedResult {
    const stateFilePath = input.stateFilePath ?? DEFAULT_STATE_FILE_PATH;
    if (!isPathSafe(stateFilePath)) {
      return {
        ok: false,
        stateFilePath,
        written: 0,
        error: `unsafe state file path: ${stateFilePath}`,
      };
    }
    if (input.probes.length === 0) {
      return { ok: true, stateFilePath, written: 0, error: null };
    }
    const now = (input.now ?? new Date()).toISOString();
    const record = this.loadProbedRecord(stateFilePath);
    let written = 0;
    for (const p of input.probes) {
      const key = pairKey(p.vendor, p.taskType);
      record.issued[key] = {
        lastProbedTs: now,
        alertTs: p.alertTs,
        severity: p.severity,
        delta: p.delta,
      };
      written++;
    }
    try {
      fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
      const tmp = `${stateFilePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(record, null, 2), "utf-8");
      fs.renameSync(tmp, stateFilePath);
      return { ok: true, stateFilePath, written, error: null };
    } catch (e) {
      return {
        ok: false,
        stateFilePath,
        written: 0,
        error: (e as Error).message,
      };
    }
  }

  /**
   * Drop entries with lastProbedTs older than (now - olderThanMs).
   * Useful as a cron post-step so the state file does not grow
   * unbounded across many vendor×task combos.
   */
  pruneProbedRecord(input: PruneProbedInput = {}): PruneProbedResult {
    const stateFilePath = input.stateFilePath ?? DEFAULT_STATE_FILE_PATH;
    if (!isPathSafe(stateFilePath)) {
      return {
        ok: false,
        stateFilePath,
        pruned: 0,
        remaining: 0,
        error: `unsafe state file path: ${stateFilePath}`,
      };
    }
    const now = input.now ?? new Date();
    const olderThanMs = input.olderThanMs ?? 7 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - olderThanMs);
    const record = this.loadProbedRecord(stateFilePath);
    let pruned = 0;
    for (const [key, entry] of Object.entries(record.issued)) {
      const ts = parseTsSafe(entry.lastProbedTs);
      if (!ts || ts < cutoff) {
        delete record.issued[key];
        pruned++;
      }
    }
    const remaining = Object.keys(record.issued).length;
    if (pruned === 0) {
      return { ok: true, stateFilePath, pruned: 0, remaining, error: null };
    }
    try {
      fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
      const tmp = `${stateFilePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(record, null, 2), "utf-8");
      fs.renameSync(tmp, stateFilePath);
      return { ok: true, stateFilePath, pruned, remaining, error: null };
    } catch (e) {
      return {
        ok: false,
        stateFilePath,
        pruned: 0,
        remaining,
        error: (e as Error).message,
      };
    }
  }

  /**
   * Read the probe-issued state file. Cold-start safe: missing or
   * corrupt content returns an empty record.
   */
  loadProbedRecord(stateFilePath?: string): ProbedRecord {
    const p = stateFilePath ?? DEFAULT_STATE_FILE_PATH;
    const empty: ProbedRecord = { schemaVersion: SCHEMA_VERSION, issued: {} };
    if (!isPathSafe(p)) return empty;
    if (!fs.existsSync(p)) return empty;
    try {
      const raw = fs.readFileSync(p, "utf-8");
      const parsed = JSON.parse(raw) as Partial<ProbedRecord>;
      if (!parsed || typeof parsed !== "object") return empty;
      const issued = parsed.issued && typeof parsed.issued === "object" ? parsed.issued : {};
      // Defensive: filter out malformed entries.
      const clean: Record<string, ProbedRecordEntry> = {};
      for (const [k, v] of Object.entries(issued)) {
        if (!v || typeof v !== "object") continue;
        const e = v as Partial<ProbedRecordEntry>;
        if (typeof e.lastProbedTs !== "string") continue;
        if (typeof e.alertTs !== "string") continue;
        if (e.severity !== "moderate" && e.severity !== "severe") continue;
        if (typeof e.delta !== "number") continue;
        clean[k] = {
          lastProbedTs: e.lastProbedTs,
          alertTs: e.alertTs,
          severity: e.severity,
          delta: e.delta,
        };
      }
      return { schemaVersion: SCHEMA_VERSION, issued: clean };
    } catch {
      return empty;
    }
  }
}

function pairKey(vendor: string, taskType: string): string {
  return `${vendor}|${taskType}`;
}

function isProbeSeverity(s: unknown): s is ProbeSeverity {
  return s === "moderate" || s === "severe";
}

function parseTsSafe(s: string): Date | null {
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function isPathSafe(p: string): boolean {
  if (!p) return false;
  // Reject parent-directory escapes regardless of OS sep.
  if (p.includes("..")) return false;
  return true;
}

/**
 * Severe alerts saturate priority near |delta|=0.5; moderate near 0.3.
 * Below saturation, priority scales linearly with magnitude. Severe
 * always outranks moderate at equal |delta|.
 */
function computePriority(severity: ProbeSeverity, delta: number): number {
  const mag = Math.min(1, Math.abs(delta));
  if (severity === "severe") {
    // base 0.7, +0.3 across [0, 0.5]
    const scaled = Math.min(1, mag / 0.5);
    return Number((0.7 + 0.3 * scaled).toFixed(3));
  }
  // moderate: base 0.3, +0.3 across [0, 0.3]
  const scaled = Math.min(1, mag / 0.3);
  return Number((0.3 + 0.3 * scaled).toFixed(3));
}

export const consensusDriftAutoProbeEngine = new ConsensusDriftAutoProbeEngine();
