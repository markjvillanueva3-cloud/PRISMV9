/**
 * StreamVsBatchReconciliationEngine — U-LEARN-02
 * ================================================
 *
 * Feature-store MLOps safety net: detects when the ONLINE path (features
 * computed at decision time) disagrees with the OFFLINE path (features
 * later reconstructed from the immutable FeatureStore) — the classic
 * train/serve skew that silently breaks production ML.
 *
 * Every time a recommendation is served:
 *   1. Online feature values are passed in as `online_values` (from the
 *      live feature builder attached to the dispatcher action).
 *   2. Engine looks up the AS-OF feature row for the same entity at the
 *      decision timestamp via FeatureStoreEngine.getHistoricalFeatures().
 *   3. Per-key comparison against the feature contract's tolerance
 *      (rel_tolerance + abs_tolerance).
 *   4. Verdict: aligned | drift | missing_offline | missing_online.
 *
 * Results append to state/reconciliation/<domain>/<feature_group>.jsonl
 * so a calibration job can roll up divergence rates and flag features
 * whose online implementation has drifted from the offline definition.
 *
 * Invariants:
 *   - NEVER-THROW. Engine never breaks the serving path on error.
 *   - NON-BLOCKING by default. Callers decide whether to gate on drift.
 *   - PER-KEY. Each feature key has its own verdict.
 *
 * @module engines/StreamVsBatchReconciliationEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-02
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  featureStoreEngine,
  FeatureStoreEngine,
} from "./FeatureStoreEngine.js";
import type { OutcomeDomainT } from "../schemas/outcomeEventSchema.js";

const RECON_ROOT = path.resolve(process.cwd(), "state/reconciliation");

export type ReconVerdict =
  | "aligned"
  | "drift"
  | "missing_offline"
  | "missing_online";

export interface KeyComparison {
  key: string;
  online: unknown;
  offline: unknown;
  abs_delta?: number;
  rel_delta?: number;
  verdict: ReconVerdict;
}

export interface ReconcileInput {
  domain: OutcomeDomainT;
  feature_group: string;
  feature_group_version?: string;
  entity_id: string;
  as_of_ts: string;
  online_values: Record<string, unknown>;
  /** Per-key tolerance. Default rel=1e-3, abs=1e-9 when unset. */
  tolerances?: Record<string, { rel?: number; abs?: number }>;
  /** Optional: keys to exclude from reconciliation (e.g. synthetic ids). */
  ignore_keys?: string[];
  /** Optional: if set, append result to the JSONL log. Default true. */
  persist?: boolean;
}

export interface ReconcileResult {
  ok: boolean;
  report_id: string;
  entity_id: string;
  as_of_ts: string;
  overall_verdict: ReconVerdict;
  comparisons: KeyComparison[];
  warning?: string;
  created_at: string;
}

export interface StatsResult {
  total_reports: number;
  by_verdict: Record<ReconVerdict, number>;
  domains: Record<string, number>;
}

/**
 * StreamVsBatchReconciliationEngine — stateless; instance only for test isolation.
 */
export class StreamVsBatchReconciliationEngine {
  private readonly rootDir: string;
  private readonly store: FeatureStoreEngine;

  constructor(
    rootDir: string = RECON_ROOT,
    store: FeatureStoreEngine = featureStoreEngine,
  ) {
    this.rootDir = rootDir;
    this.store = store;
  }

  /**
   * Compare online feature values against the AS-OF offline feature row.
   * Returns per-key verdicts + overall verdict. Persists to JSONL log by
   * default (override with `persist: false` for dry-runs).
   */
  reconcile(input: ReconcileInput): ReconcileResult {
    const report_id = randomUUID();
    const created_at = new Date().toISOString();

    let offlineRow: Record<string, unknown> | null = null;
    try {
      const q = this.store.getHistoricalFeatures({
        domain: input.domain,
        feature_group: input.feature_group,
        feature_group_version: input.feature_group_version,
        entity_ids: [input.entity_id],
        as_of_ts: input.as_of_ts,
        limit_per_entity: 1,
      });
      offlineRow = q.rows[0]?.feature_values ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        report_id,
        entity_id: input.entity_id,
        as_of_ts: input.as_of_ts,
        overall_verdict: "missing_offline",
        comparisons: [],
        warning: `FeatureStore query failed: ${message}`,
        created_at,
      };
    }

    const ignore = new Set(input.ignore_keys ?? []);
    const tolerances = input.tolerances ?? {};

    // Union of keys from both sides (minus ignored)
    const allKeys = new Set<string>();
    for (const k of Object.keys(input.online_values)) if (!ignore.has(k)) allKeys.add(k);
    if (offlineRow) for (const k of Object.keys(offlineRow)) if (!ignore.has(k)) allKeys.add(k);

    const comparisons: KeyComparison[] = [];
    for (const key of Array.from(allKeys).sort()) {
      const online = input.online_values[key];
      const offline = offlineRow?.[key];
      comparisons.push(
        this.compareKey(key, online, offline, tolerances[key] ?? {}),
      );
    }

    const overall_verdict = this.rollup(comparisons, offlineRow !== null, input.online_values);

    const result: ReconcileResult = {
      ok: true,
      report_id,
      entity_id: input.entity_id,
      as_of_ts: input.as_of_ts,
      overall_verdict,
      comparisons,
      created_at,
    };

    if (input.persist !== false) {
      this.appendReport(input.domain, input.feature_group, result);
    }
    return result;
  }

  /**
   * Read recent reports for a (domain, feature_group), newest-first.
   */
  query(
    domain: OutcomeDomainT,
    feature_group: string,
    limit = 100,
  ): ReconcileResult[] {
    const p = this.pathFor(domain, feature_group);
    if (!fs.existsSync(p)) return [];
    try {
      const raw = fs.readFileSync(p, "utf8");
      const all = raw
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l) as ReconcileResult);
      return all.slice(-limit).reverse();
    } catch {
      return [];
    }
  }

  /**
   * Stats across every persisted report — useful for dashboards.
   */
  stats(): StatsResult {
    const out: StatsResult = {
      total_reports: 0,
      by_verdict: { aligned: 0, drift: 0, missing_offline: 0, missing_online: 0 },
      domains: {},
    };
    if (!fs.existsSync(this.rootDir)) return out;
    for (const dom of this.listDirs(this.rootDir)) {
      const domDir = path.join(this.rootDir, dom);
      for (const file of this.listFiles(domDir)) {
        const p = path.join(domDir, file);
        try {
          const raw = fs.readFileSync(p, "utf8");
          for (const line of raw.split(/\r?\n/)) {
            if (!line.trim()) continue;
            const r = JSON.parse(line) as ReconcileResult;
            out.total_reports++;
            out.by_verdict[r.overall_verdict]++;
            out.domains[dom] = (out.domains[dom] ?? 0) + 1;
          }
        } catch {
          /* skip malformed file */
        }
      }
    }
    return out;
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private compareKey(
    key: string,
    online: unknown,
    offline: unknown,
    tolerance: { rel?: number; abs?: number },
  ): KeyComparison {
    const onlineMissing = online === undefined;
    const offlineMissing = offline === undefined;

    if (onlineMissing && offlineMissing) {
      // Shouldn't happen given union logic, but safe default
      return { key, online, offline, verdict: "aligned" };
    }
    if (onlineMissing) return { key, online, offline, verdict: "missing_online" };
    if (offlineMissing) return { key, online, offline, verdict: "missing_offline" };

    // Numeric path — apply rel_tolerance / abs_tolerance
    if (typeof online === "number" && typeof offline === "number") {
      const abs_delta = Math.abs(online - offline);
      const rel_delta = offline === 0 ? (online === 0 ? 0 : Infinity) : abs_delta / Math.abs(offline);
      const abs_tol = tolerance.abs ?? 1e-9;
      const rel_tol = tolerance.rel ?? 1e-3;
      const aligned = abs_delta <= abs_tol || rel_delta <= rel_tol;
      return {
        key,
        online,
        offline,
        abs_delta,
        rel_delta,
        verdict: aligned ? "aligned" : "drift",
      };
    }

    // Non-numeric — deep equality via JSON (handles strings, booleans, objects)
    const aligned = this.deepEqual(online, offline);
    return { key, online, offline, verdict: aligned ? "aligned" : "drift" };
  }

  private rollup(
    comparisons: KeyComparison[],
    offlinePresent: boolean,
    onlineValues: Record<string, unknown>,
  ): ReconVerdict {
    if (!offlinePresent) return "missing_offline";
    if (Object.keys(onlineValues).length === 0) return "missing_online";
    for (const c of comparisons) {
      if (c.verdict === "drift") return "drift";
      if (c.verdict === "missing_offline") return "missing_offline";
      if (c.verdict === "missing_online") return "missing_online";
    }
    return "aligned";
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  private pathFor(domain: OutcomeDomainT, feature_group: string): string {
    return path.join(this.rootDir, domain, `${feature_group}.jsonl`);
  }

  private appendReport(
    domain: OutcomeDomainT,
    feature_group: string,
    report: ReconcileResult,
  ): void {
    try {
      const p = this.pathFor(domain, feature_group);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.appendFileSync(p, JSON.stringify(report) + "\n", "utf8");
    } catch {
      /* best effort — never break caller */
    }
  }

  private listDirs(p: string): string[] {
    try {
      return fs
        .readdirSync(p, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => String(d.name));
    } catch {
      return [];
    }
  }

  private listFiles(p: string): string[] {
    try {
      return fs.readdirSync(p).filter((f) => f.endsWith(".jsonl"));
    } catch {
      return [];
    }
  }

  static getSelfAwareness() {
    return {
      name: "StreamVsBatchReconciliationEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-02",
      capabilities: ["reconcile", "query", "stats"],
      dependencies: ["FeatureStoreEngine", "featureStoreSchema"],
      dataSourcesUsed: ["state/reconciliation/<domain>/<group>.jsonl"],
    };
  }
}

export const streamVsBatchReconciliationEngine = new StreamVsBatchReconciliationEngine();
