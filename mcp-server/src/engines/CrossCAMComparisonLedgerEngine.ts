/**
 * CrossCAMComparisonLedgerEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL14
 * ==================================================================
 *
 * Per-cell CAM-system leaderboard. For each (featureClass,
 * materialClass, machineClass) cell, tracks which CAM system (7+)
 * produces the best predicted-vs-actual agreement.
 *
 * Ranks CAM systems per cell using Wilson lower-bound score at 95% CI:
 *
 *     wilson = (p + z²/(2n) - z·√((p(1-p) + z²/(4n))/n)) / (1 + z²/n)
 *
 * This corrects for small-n over-confidence — a CAM with 1/1 perfect
 * agreement ranks BELOW a CAM with 95/100 (because 1/1 has huge
 * uncertainty). z = 1.96 (95% two-sided).
 *
 * Reference: Wilson, E.B. (1927). "Probable inference, the law of
 * succession, and statistical inference."
 *
 * @module engines/CrossCAMComparisonLedgerEngine
 * @version 1.0.0
 */

import type { CAMSystem } from "./ConfidenceCommitEventBusEngine.js";

const Z_95 = 1.959963984540054; // z-score for 95% two-sided CI

export interface ObservationRecord {
  camSystem: CAMSystem;
  featureClass: string;
  materialClass: string;
  machineClass: string;
  /** 1 if CAM matched observed reality within tolerance, else 0. */
  success: 0 | 1;
  observedAt: string;
}

export interface CellAccumulator {
  camSystem: CAMSystem;
  featureClass: string;
  materialClass: string;
  machineClass: string;
  n: number;
  successes: number;
  pointEstimate: number; // successes / n
  wilsonLower: number;   // lower bound of 95% CI
  wilsonUpper: number;
}

export interface CellLeaderboard {
  featureClass: string;
  materialClass: string;
  machineClass: string;
  entries: CellAccumulator[]; // sorted by wilsonLower DESC
  topCam: CAMSystem | null;
}

function cellKey(r: Pick<ObservationRecord, "featureClass" | "materialClass" | "machineClass">): string {
  return `${r.featureClass}|${r.materialClass}|${r.machineClass}`;
}

function accKey(r: Pick<ObservationRecord, "camSystem" | "featureClass" | "materialClass" | "machineClass">): string {
  return `${r.camSystem}|${cellKey(r)}`;
}

/**
 * Wilson score interval at z (default 1.96, 95% CI). Returns { lower,
 * upper } with p_hat = successes / n. n=0 returns [0, 0].
 */
export function wilsonInterval(successes: number, n: number, z: number = Z_95): { lower: number; upper: number } {
  if (n <= 0) return { lower: 0, upper: 0 };
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  const lower = (center - margin) / denom;
  const upper = (center + margin) / denom;
  return {
    lower: Math.max(0, lower),
    upper: Math.min(1, upper),
  };
}

class CrossCAMComparisonLedgerEngineImpl {
  private acc = new Map<string, CellAccumulator>();

  record(obs: ObservationRecord): CellAccumulator {
    if (obs.success !== 0 && obs.success !== 1) throw new Error("success must be 0 or 1");
    const key = accKey(obs);
    const cur = this.acc.get(key) ?? {
      camSystem: obs.camSystem,
      featureClass: obs.featureClass,
      materialClass: obs.materialClass,
      machineClass: obs.machineClass,
      n: 0,
      successes: 0,
      pointEstimate: 0,
      wilsonLower: 0,
      wilsonUpper: 0,
    };
    cur.n += 1;
    cur.successes += obs.success;
    cur.pointEstimate = cur.successes / cur.n;
    const { lower, upper } = wilsonInterval(cur.successes, cur.n);
    cur.wilsonLower = lower;
    cur.wilsonUpper = upper;
    this.acc.set(key, cur);
    return { ...cur };
  }

  /** Leaderboard for a single cell. */
  leaderboard(cell: { featureClass: string; materialClass: string; machineClass: string }): CellLeaderboard {
    const entries: CellAccumulator[] = [];
    const target = cellKey(cell);
    for (const [key, v] of this.acc.entries()) {
      if (key.split("|").slice(1).join("|") === target) entries.push({ ...v });
    }
    entries.sort((a, b) => {
      if (Math.abs(a.wilsonLower - b.wilsonLower) > 1e-9) return b.wilsonLower - a.wilsonLower;
      // Tie: prefer larger n (more data).
      if (a.n !== b.n) return b.n - a.n;
      return a.camSystem.localeCompare(b.camSystem);
    });
    return {
      ...cell,
      entries,
      topCam: entries.length > 0 ? entries[0].camSystem : null,
    };
  }

  /**
   * Leaderboard across ALL cells for a given CAM system (what does
   * CAM X do best at?).
   */
  byCAM(camSystem: CAMSystem): CellAccumulator[] {
    const out: CellAccumulator[] = [];
    for (const [key, v] of this.acc.entries()) {
      if (key.startsWith(`${camSystem}|`)) out.push({ ...v });
    }
    out.sort((a, b) => b.wilsonLower - a.wilsonLower);
    return out;
  }

  /** Distinct cells seen. */
  totalCells(): number {
    const seen = new Set<string>();
    for (const [, v] of this.acc.entries()) seen.add(cellKey(v));
    return seen.size;
  }

  /** Total observations across all CAMs and cells. */
  totalObservations(): number {
    let total = 0;
    for (const [, v] of this.acc.entries()) total += v.n;
    return total;
  }

  reset(): void {
    this.acc.clear();
  }
}

export const crossCAMComparisonLedgerEngine = new CrossCAMComparisonLedgerEngineImpl();
export type CrossCAMComparisonLedgerEngine = typeof crossCAMComparisonLedgerEngine;
