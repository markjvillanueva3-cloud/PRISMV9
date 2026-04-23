/**
 * GateFailureHistoryEngine — U-FORE-06 (PSAU-FORESIGHT)
 * ======================================================
 *
 * Append-only event log of gate outcomes (pass/fail) seen during build.
 * Aggregates into per-(unitClass, gateName) failure-rate counters that
 * the RiskForecastEngine consumes. Also tracks Brier-score calibration
 * by pairing past predictions with observed outcomes.
 *
 * Storage: mcp-server/data/state/GATE_HISTORY.jsonl
 *
 * JSONL is used so concurrent writers from multiple sessions can append
 * safely. Reads parse every row — cheap enough for this scale.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type GateName =
  | "canonical_constants"
  | "no_silent_catch"
  | "test_legitimacy"
  | "sx_gate"
  | "duplication_hard_block"
  | string;

export type GateOutcome = "pass" | "fail";

export interface GateEvent {
  ts: number;
  unitId: string;
  unitClass: string;
  gate: GateName;
  outcome: GateOutcome;
  predicted?: number; // probability-of-failure at the time of prediction
}

export interface GateAggregate {
  unitClass: string;
  gate: GateName;
  total: number;
  failures: number;
  failureRate: number;
  lastSeen: number;
}

export interface CalibrationStats {
  count: number;
  brier: number; // 0 is perfect, 0.25 is random, higher is worse
  mean_predicted: number;
  mean_actual: number;
}

const DEFAULT_LOG = path.join(
  process.cwd(),
  "mcp-server",
  "data",
  "state",
  "GATE_HISTORY.jsonl"
);

export class GateFailureHistoryEngine {
  readonly name = "GateFailureHistoryEngine";

  constructor(private readonly logPath: string = DEFAULT_LOG) {}

  /**
   * Append a gate event to the log.
   *
   * @param event Event metadata — ts is filled if missing.
   */
  record(event: Omit<GateEvent, "ts"> & { ts?: number }): GateEvent {
    this.assertEvent(event);
    const full: GateEvent = { ts: event.ts ?? Date.now(), ...event };
    this.ensureDir();
    fs.appendFileSync(this.logPath, JSON.stringify(full) + "\n", "utf-8");
    return full;
  }

  /**
   * Read all events. Parses once per call — log is expected to be small.
   */
  all(): GateEvent[] {
    if (!fs.existsSync(this.logPath)) return [];
    try {
      const txt = fs.readFileSync(this.logPath, "utf-8");
      const lines = txt.split(/\r?\n/).filter((l) => l.trim());
      const out: GateEvent[] = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as GateEvent;
          if (parsed && parsed.unitClass && parsed.gate && parsed.outcome) {
            out.push(parsed);
          }
        } catch {
          // skip malformed rows
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  /**
   * Failure-rate per (unitClass, gate) with recency-weighted total counts.
   *
   * @returns Array sorted by failureRate desc.
   */
  aggregates(): GateAggregate[] {
    const buckets = new Map<
      string,
      { unitClass: string; gate: GateName; total: number; failures: number; lastSeen: number }
    >();
    for (const e of this.all()) {
      const key = `${e.unitClass}|${e.gate}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          unitClass: e.unitClass,
          gate: e.gate,
          total: 0,
          failures: 0,
          lastSeen: 0,
        };
        buckets.set(key, bucket);
      }
      bucket.total += 1;
      if (e.outcome === "fail") bucket.failures += 1;
      if (e.ts > bucket.lastSeen) bucket.lastSeen = e.ts;
    }
    return Array.from(buckets.values())
      .map((b) => ({
        ...b,
        failureRate: b.total === 0 ? 0 : b.failures / b.total,
      }))
      .sort((a, b) => b.failureRate - a.failureRate);
  }

  /**
   * Compute Brier score over events that have both `predicted` and observed
   * `outcome`. 0 = perfect; 0.25 = chance; higher is worse.
   */
  calibration(): CalibrationStats {
    const scored = this.all().filter(
      (e) => typeof e.predicted === "number" && !isNaN(e.predicted)
    );
    if (scored.length === 0) {
      return { count: 0, brier: 0, mean_predicted: 0, mean_actual: 0 };
    }
    let sumSq = 0;
    let sumPred = 0;
    let sumActual = 0;
    for (const e of scored) {
      const actual = e.outcome === "fail" ? 1 : 0;
      const predicted = Math.max(0, Math.min(1, e.predicted!));
      sumSq += (predicted - actual) ** 2;
      sumPred += predicted;
      sumActual += actual;
    }
    return {
      count: scored.length,
      brier: sumSq / scored.length,
      mean_predicted: sumPred / scored.length,
      mean_actual: sumActual / scored.length,
    };
  }

  /**
   * Convenience: total events, total failures, global failure rate.
   */
  summary(): { total: number; failures: number; failureRate: number; classes: number; gates: number } {
    const all = this.all();
    const failures = all.filter((e) => e.outcome === "fail").length;
    const classes = new Set(all.map((e) => e.unitClass)).size;
    const gates = new Set(all.map((e) => e.gate)).size;
    return {
      total: all.length,
      failures,
      failureRate: all.length === 0 ? 0 : failures / all.length,
      classes,
      gates,
    };
  }

  /**
   * Wipe the log (mostly for tests).
   */
  reset(): void {
    if (fs.existsSync(this.logPath)) fs.rmSync(this.logPath);
  }

  private ensureDir(): void {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  private assertEvent(event: unknown): void {
    if (!event || typeof event !== "object") {
      throw new Error("GateFailureHistoryEngine.record: event must be an object");
    }
    const e = event as Partial<GateEvent>;
    if (!e.unitId || typeof e.unitId !== "string") {
      throw new Error("GateFailureHistoryEngine.record: unitId required");
    }
    if (!e.unitClass || typeof e.unitClass !== "string") {
      throw new Error("GateFailureHistoryEngine.record: unitClass required");
    }
    if (!e.gate || typeof e.gate !== "string") {
      throw new Error("GateFailureHistoryEngine.record: gate required");
    }
    if (e.outcome !== "pass" && e.outcome !== "fail") {
      throw new Error("GateFailureHistoryEngine.record: outcome must be pass or fail");
    }
  }
}

export const gateFailureHistoryEngine = new GateFailureHistoryEngine();
