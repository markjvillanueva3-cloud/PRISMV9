/**
 * QuotingOutcomeLedgerDigestEngine --
 * QUOTING-SYNERGY-MS0/U-QP-OUTCOME-LEDGER-DIGEST (slot:charlie 2026-06-11).
 *
 * The READ-SIDE consumer of the closed-loop outcome ledger written by
 * QuotingClosedLoopRunnerEngine.buildLiveDeps().feedOutcome
 * (U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY). feedOutcome appends one CycleOutcomeSignal
 * per terminal verdict to state/shared/quoting/quoting-cycle-outcomes.jsonl; this
 * engine reads that ledger and projects it into the loop's behavior distribution
 * plus a health verdict, closing the write -> read -> learn loop.
 *
 * The health logic is the self-improvement signal the operator asked for:
 *   - a high WITHHELD_SYNTHETIC rate  => the training data is synthetic
 *     (a data-provenance problem the loop cannot fix by itself)
 *   - a high ROLLED_BACK rate among drift-detected cycles => drift the
 *     calibration model cannot correct (a modelling problem)
 *
 * Pure core (summarizeOutcomeLedger) + injected reader (readImpl) so it is
 * testable without disk. Fail-soft: a missing ledger = 0 cycles (valid: the loop
 * may never have run), a malformed line is skipped, never throws on bad data.
 *
 * NOTE: telemetry-ONLY. This engine reads + reports; it NEVER writes the ledger,
 * never alters a gate/verdict, never feeds back into a promotion decision. The
 * health verdict is advisory for the PSN / operator.
 */

import { promises as fs } from "node:fs";
import {
  DEFAULT_OUTCOME_LEDGER_PATH,
} from "./QuotingClosedLoopRunnerEngine.js";
import type { CycleOutcomeSignal } from "./QuotingClosedLoopEngine.js";

/** A ledger line = the signal plus the runner-stamped fed_at. */
export type OutcomeLedgerRecord = CycleOutcomeSignal & { fed_at?: string };

/** All six terminal verdicts feedOutcome can carry. Kept here as the canonical
 *  ordered list so the digest zero-fills every verdict (a verdict with 0 cycles
 *  is itself a signal -- e.g. "never promoted"). */
export const ALL_CYCLE_VERDICTS = [
  "PROMOTED",
  "NO_DRIFT_NO_OP",
  "ROLLED_BACK",
  "WITHHELD_SYNTHETIC",
  "INSUFFICIENT_DATA",
  "STAGE_FAILED",
] as const;
export type CycleVerdict = (typeof ALL_CYCLE_VERDICTS)[number];

/** Dimensionless behavior thresholds (NOT price/physics constants). */
/** >= 50% of cycles withheld-synthetic => the loop is starved of real actuals. */
export const WITHHOLD_PROBLEM_THRESHOLD = 0.5;
/** >= 50% of DRIFT-DETECTED cycles rolled back => drift the model cannot fix. */
export const ROLLBACK_PROBLEM_THRESHOLD = 0.5;
/** Below this many cycles, no health conclusion is drawn (too few samples). */
export const MIN_CYCLES_FOR_HEALTH = 5;

export interface VerdictBreakdown {
  count: number;
  /** count / total_cycles (0 when total is 0). */
  rate: number;
}

export interface OutcomeLedgerHealth {
  /** No problem flags AND enough cycles to conclude. */
  healthy: boolean;
  /** Too few cycles (< MIN_CYCLES_FOR_HEALTH) to draw a conclusion. */
  insufficient_cycles: boolean;
  /** withhold_rate >= WITHHOLD_PROBLEM_THRESHOLD. */
  provenance_problem: boolean;
  /** rollback fraction among drift-detected cycles >= ROLLBACK_PROBLEM_THRESHOLD. */
  drift_uncorrectable: boolean;
  reasons: string[];
}

export interface OutcomeLedgerDigest {
  total_cycles: number;
  by_verdict: Record<CycleVerdict, VerdictBreakdown>;
  applied_rate: number;
  withhold_rate: number;
  rollback_rate: number;
  no_drift_rate: number;
  insufficient_rate: number;
  /** Count of cycles where the drift gate fired (drift_detected === true). */
  drift_detected_count: number;
  /** Mean mape_delta over PROMOTED cycles with a non-null delta; null if none. */
  mean_applied_mape_delta: number | null;
  health: OutcomeLedgerHealth;
  /** Earliest / latest fed_at across the ledger (null when absent/unparseable). */
  window: { first_iso: string | null; last_iso: string | null };
}

/** Pure: project a list of ledger records into the behavior digest. Total over
 *  every verdict; zero-safe on an empty ledger; never throws. */
export function summarizeOutcomeLedger(records: OutcomeLedgerRecord[]): OutcomeLedgerDigest {
  const total = records.length;

  const by_verdict = {} as Record<CycleVerdict, VerdictBreakdown>;
  for (const v of ALL_CYCLE_VERDICTS) by_verdict[v] = { count: 0, rate: 0 };

  let drift_detected_count = 0;
  let appliedDeltaSum = 0;
  let appliedDeltaCount = 0;
  let driftRollbackCount = 0;
  let firstMs: number | null = null;
  let lastMs: number | null = null;
  let first_iso: string | null = null;
  let last_iso: string | null = null;

  for (const r of records) {
    const v = r.verdict as CycleVerdict;
    if (by_verdict[v]) by_verdict[v].count += 1;

    if (r.drift_detected === true) {
      drift_detected_count += 1;
      if (v === "ROLLED_BACK") driftRollbackCount += 1;
    }

    if (v === "PROMOTED" && typeof r.mape_delta === "number" && Number.isFinite(r.mape_delta)) {
      appliedDeltaSum += r.mape_delta;
      appliedDeltaCount += 1;
    }

    if (typeof r.fed_at === "string") {
      const ms = Date.parse(r.fed_at);
      if (!Number.isNaN(ms)) {
        if (firstMs === null || ms < firstMs) { firstMs = ms; first_iso = r.fed_at; }
        if (lastMs === null || ms > lastMs) { lastMs = ms; last_iso = r.fed_at; }
      }
    }
  }

  const rate = (n: number) => (total > 0 ? n / total : 0);
  for (const v of ALL_CYCLE_VERDICTS) by_verdict[v].rate = rate(by_verdict[v].count);

  const withhold_rate = by_verdict.WITHHELD_SYNTHETIC.rate;
  const rollback_rate = by_verdict.ROLLED_BACK.rate;
  const no_drift_rate = by_verdict.NO_DRIFT_NO_OP.rate;
  const insufficient_rate = by_verdict.INSUFFICIENT_DATA.rate;
  const applied_rate = by_verdict.PROMOTED.rate;

  const mean_applied_mape_delta =
    appliedDeltaCount > 0 ? appliedDeltaSum / appliedDeltaCount : null;

  // Health verdict (advisory): the self-improvement signal.
  const reasons: string[] = [];
  const insufficient_cycles = total < MIN_CYCLES_FOR_HEALTH;
  let provenance_problem = false;
  let drift_uncorrectable = false;

  if (insufficient_cycles) {
    reasons.push(`insufficient cycles for health assessment (${total} < ${MIN_CYCLES_FOR_HEALTH})`);
  } else {
    provenance_problem = withhold_rate >= WITHHOLD_PROBLEM_THRESHOLD;
    if (provenance_problem) {
      reasons.push(
        `provenance problem: ${(withhold_rate * 100).toFixed(0)}% of cycles withheld-synthetic ` +
          `(>= ${(WITHHOLD_PROBLEM_THRESHOLD * 100).toFixed(0)}%) -- loop is starved of real actuals`,
      );
    }
    const rollbackFracOfDrift = drift_detected_count > 0 ? driftRollbackCount / drift_detected_count : 0;
    drift_uncorrectable =
      drift_detected_count > 0 && rollbackFracOfDrift >= ROLLBACK_PROBLEM_THRESHOLD;
    if (drift_uncorrectable) {
      reasons.push(
        `drift uncorrectable: ${(rollbackFracOfDrift * 100).toFixed(0)}% of drift-detected cycles ` +
          `rolled back (>= ${(ROLLBACK_PROBLEM_THRESHOLD * 100).toFixed(0)}%) -- calibration cannot fix the drift`,
      );
    }
    if (!provenance_problem && !drift_uncorrectable) {
      reasons.push("healthy: no provenance or uncorrectable-drift signal");
    }
  }

  const healthy = !insufficient_cycles && !provenance_problem && !drift_uncorrectable;

  return {
    total_cycles: total,
    by_verdict,
    applied_rate,
    withhold_rate,
    rollback_rate,
    no_drift_rate,
    insufficient_rate,
    drift_detected_count,
    mean_applied_mape_delta,
    health: { healthy, insufficient_cycles, provenance_problem, drift_uncorrectable, reasons },
    window: { first_iso, last_iso },
  };
}

/** Tolerant JSONL reader. Fail-soft: a missing file -> [] (the loop may never
 *  have run -- 0 cycles is valid, not an error); a blank or malformed line is
 *  skipped (a record MUST carry a string `verdict` to count). Never throws on
 *  bad data; only a non-ENOENT read error propagates (surfaced, not swallowed). */
export async function readOutcomeLedger(
  ledgerPath: string,
  readImpl: (p: string) => Promise<string> = (p) => fs.readFile(p, "utf8"),
): Promise<OutcomeLedgerRecord[]> {
  let text: string;
  try {
    text = await readImpl(ledgerPath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    throw e;
  }
  const out: OutcomeLedgerRecord[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec: unknown;
    try {
      rec = JSON.parse(trimmed);
    } catch {
      continue; // skip malformed line
    }
    if (rec && typeof rec === "object" && typeof (rec as { verdict?: unknown }).verdict === "string") {
      out.push(rec as OutcomeLedgerRecord);
    }
  }
  return out;
}

export interface DigestOptions {
  /** Override the ledger path (defaults to the runner's DEFAULT_OUTCOME_LEDGER_PATH). */
  ledgerPath?: string;
  /** Injected reader for tests. */
  readImpl?: (p: string) => Promise<string>;
}

export class QuotingOutcomeLedgerDigestEngine {
  /** Read the live outcome ledger and project it into the behavior digest. */
  async digest(opts: DigestOptions = {}): Promise<OutcomeLedgerDigest> {
    const ledgerPath = opts.ledgerPath ?? DEFAULT_OUTCOME_LEDGER_PATH;
    const records = await readOutcomeLedger(ledgerPath, opts.readImpl);
    return summarizeOutcomeLedger(records);
  }
}

export const quotingOutcomeLedgerDigestEngine = new QuotingOutcomeLedgerDigestEngine();
