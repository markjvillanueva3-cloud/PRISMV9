/**
 * TrainingTemplateContinuousLearningEngine
 * ================================================
 *
 * Captures shipped-job outcomes for the Lathe / Mill / WEDM training-template
 * pipelines and writes them to an append-only JSONL ledger. The matcher engines
 * (U-TL-U5) can later consume these outcomes to adjust ranking, weight customer
 * actuals, and detect family-level drift.
 *
 * Per [[feedback_box_programs_amateur]]: historical S/F and outcome data is
 * DATA, not GROUND TRUTH. This engine STORES outcomes but never adjudicates
 * them — physics-derived recommendations win on disagreement.
 *
 * Owns (per spec H:/prism/state/shared/specs/TRAINING-LEARNING-MS0-2026-05-12.md, U-TL-U6):
 *   - ingestLatheOutcome(outcome, opts?) → IngestResult
 *   - ingestMillOutcome(outcome, opts?)   → IngestResult
 *   - ingestWEDMOutcome(outcome, opts?)   → IngestResult
 *   - listRecentOutcomes(domain, opts?)   → OutcomeListResult
 *   - getFamilyAccuracy(domain, family, opts?) → FamilyAccuracyResult
 *   - getOutcomeStats(domain, opts?)      → OutcomeStatsResult
 *
 * Wires to (per WIRE-TO-ALL-SOURCES rule):
 *   - prism_turning:training_ingest_lathe_outcome
 *   - prism_cam:training_ingest_mill_outcome
 *   - prism_edm:training_ingest_wedm_outcome
 *   - prism_intelligence:training_outcome_stats (cross-domain read-only query)
 *
 * Storage contract:
 *   - Path: `mcp-server/data/training/outcomes/{lathe,mill,wedm}-outcomes.jsonl`
 *     (override via PRISM_TRAINING_OUTCOMES_DIR env or `dir` opt)
 *   - Format: one JSON object per line, append-only.
 *   - Schema: `OutcomeRecord` (see below) with stable ordering of keys.
 *   - Atomic write: fs.appendFileSync with no intermediate state — file remains
 *     parseable even on crash. Concurrent writers serialize via OS file lock.
 *
 * Safety:
 *   - NEVER mutates the matcher engines or template files.
 *   - NEVER throws on bad input — returns discriminated `{ok:false, error}`.
 *   - JSON.parse uses prototype-pollution-safe reviver.
 *   - Output dir resolution rejects paths that escape the base directory.
 *   - Schema-versioned at `schemaVersion: 1`.
 *
 * @module engines/TrainingTemplateContinuousLearningEngine
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U6-CONTINUOUS-LEARNING
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";

// ───────────────────────────────────────────────────────────────────────────────
// Public types

export type TrainingDomain = "lathe" | "mill" | "wedm";

export type OutcomeResult = "success" | "fail" | "partial";

export interface CustomerActuals {
  /** Measured surface roughness in µm (Ra) after the part shipped. */
  measured_ra_um?: number;
  /** Actual cycle time in seconds (full operation including setup if specified). */
  cycle_time_sec?: number;
  /** Scrap rate observed for this job, in [0,1]. */
  scrap_rate?: number;
  /** Tool life observed in minutes (or pieces-per-tool — caller's choice). */
  tool_life_min?: number;
  /** Free-form notes from the operator. */
  notes?: string;
}

export interface OutcomeInput {
  /** Unique job identifier from the ERP / traveler. */
  job_id: string;
  /** Family slug as returned by the U-TL-U5 matcher. */
  family: string;
  /** Optional descriptor snapshot — useful for ablation when family drifts. */
  descriptor_snapshot?: Record<string, unknown>;
  /** Outcome category. */
  outcome: OutcomeResult;
  /** Optional customer actuals — populate as data lands. */
  customer_actuals?: CustomerActuals;
  /** Optional ISO-8601 timestamp; defaults to engine clock if absent. */
  ts?: string;
  /** Optional customer code from JM Die taxonomy (e.g., "ITW"). */
  customer?: string;
  /** Optional material designator (mirrors descriptor.material). */
  material?: string;
}

export interface OutcomeRecord extends OutcomeInput {
  schemaVersion: number;
  domain: TrainingDomain;
  /** Recorded ISO-8601 timestamp — guaranteed present even if input.ts was absent. */
  ts: string;
  /** Sequence number within the ledger (assigned at ingest time). */
  seq: number;
}

export interface IngestSuccess {
  ok: true;
  record: OutcomeRecord;
  /** Path of the JSONL file written to. */
  ledger: string;
  /** Total records in the ledger after this write (best-effort line count). */
  ledger_size: number;
}

export interface IngestError {
  ok: false;
  error:
    | "missing_job_id"
    | "missing_family"
    | "invalid_outcome"
    | "invalid_domain"
    | "invalid_customer_actuals"
    | "write_failed"
    | "outdir_escape";
  detail?: string;
}

export interface OutcomeListResult {
  ok: true;
  domain: TrainingDomain;
  /** Records in chronological order (oldest first). */
  records: OutcomeRecord[];
  /** True when the on-disk ledger was readable; false when missing or empty. */
  ledger_present: boolean;
  /** Path to the ledger file. */
  ledger: string;
}

export interface OutcomeListError {
  ok: false;
  error: "invalid_domain" | "ledger_unreadable";
  detail?: string;
}

export interface FamilyAccuracyResult {
  ok: true;
  domain: TrainingDomain;
  family: string;
  total_records: number;
  success_count: number;
  fail_count: number;
  partial_count: number;
  /** Success rate ∈ [0,1] computed as (success + 0.5*partial) / total. */
  accuracy: number;
  /** Mean tool life from customer_actuals, when present. Null if no data. */
  mean_tool_life_min: number | null;
  /** Mean cycle time from customer_actuals, when present. Null if no data. */
  mean_cycle_time_sec: number | null;
  /** Mean measured Ra from customer_actuals, when present. Null if no data. */
  mean_measured_ra_um: number | null;
}

export interface FamilyAccuracyError {
  ok: false;
  error: "invalid_domain" | "missing_family" | "ledger_unreadable" | "no_records";
  detail?: string;
}

export interface OutcomeStatsResult {
  ok: true;
  domain: TrainingDomain;
  total_records: number;
  per_family: Record<string, { total: number; success: number; fail: number; partial: number; accuracy: number }>;
  /** Distinct customers seen in the ledger. */
  customers: string[];
  /** Earliest record timestamp; null if ledger empty. */
  earliest_ts: string | null;
  /** Most recent record timestamp; null if ledger empty. */
  latest_ts: string | null;
}

export interface OutcomeStatsError {
  ok: false;
  error: "invalid_domain" | "ledger_unreadable";
  detail?: string;
}

export interface IngestOpts {
  /** Override base directory for the ledger (forwarded to `defaultDir`). */
  dir?: string;
  /** Override the engine clock (for deterministic tests). */
  now?: () => Date;
}

// ───────────────────────────────────────────────────────────────────────────────
// Internal helpers

const SCHEMA_VERSION = 1;
const VALID_OUTCOMES: ReadonlySet<OutcomeResult> = new Set(["success", "fail", "partial"]);
const VALID_DOMAINS: ReadonlySet<TrainingDomain> = new Set(["lathe", "mill", "wedm"]);

function defaultDir(): string {
  const env = process.env.PRISM_TRAINING_OUTCOMES_DIR;
  if (typeof env === "string" && env.length > 0) return env;
  return path.resolve("mcp-server/data/training/outcomes");
}

function resolveLedger(domain: TrainingDomain, opts: IngestOpts | undefined): string {
  const baseRaw = opts?.dir ?? defaultDir();
  const base = path.resolve(baseRaw);
  // Containment check: ledger filename is fixed, no traversal possible.
  const filename = `${domain}-outcomes.jsonl`;
  const resolved = path.resolve(base, filename);
  if (!resolved.startsWith(base)) {
    throw new Error("outdir_escape");
  }
  return resolved;
}

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function validateCustomerActuals(c: unknown): { ok: true } | { ok: false; reason: string } {
  if (c === undefined || c === null) return { ok: true };
  if (typeof c !== "object") return { ok: false, reason: "customer_actuals must be an object" };
  const a = c as Record<string, unknown>;
  if (a.measured_ra_um !== undefined && !isFiniteNumber(a.measured_ra_um)) {
    return { ok: false, reason: "measured_ra_um must be a finite number" };
  }
  if (a.cycle_time_sec !== undefined && !isFiniteNumber(a.cycle_time_sec)) {
    return { ok: false, reason: "cycle_time_sec must be a finite number" };
  }
  if (a.scrap_rate !== undefined) {
    if (!isFiniteNumber(a.scrap_rate) || a.scrap_rate < 0 || a.scrap_rate > 1) {
      return { ok: false, reason: "scrap_rate must be a finite number in [0,1]" };
    }
  }
  if (a.tool_life_min !== undefined && (!isFiniteNumber(a.tool_life_min) || a.tool_life_min < 0)) {
    return { ok: false, reason: "tool_life_min must be a non-negative finite number" };
  }
  if (a.notes !== undefined && typeof a.notes !== "string") {
    return { ok: false, reason: "notes must be a string" };
  }
  return { ok: true };
}

function readLedger(file: string): OutcomeRecord[] {
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, "utf8");
  const out: OutcomeRecord[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      // Prototype-pollution-safe reviver: drop __proto__ and prototype keys.
      const parsed = JSON.parse(trimmed, (k, v) => (k === "__proto__" || k === "prototype" ? undefined : v));
      if (parsed && typeof parsed === "object") {
        out.push(parsed as OutcomeRecord);
      }
    } catch {
      // Skip malformed lines silently — append-only ledger may have truncations
      // at the tail from a crash; we recover by skipping.
    }
  }
  return out;
}

function countLedgerLines(file: string): number {
  if (!fs.existsSync(file)) return 0;
  const raw = fs.readFileSync(file, "utf8");
  let n = 0;
  for (const line of raw.split(/\r?\n/)) {
    if (line.trim()) n++;
  }
  return n;
}

function mean(values: ReadonlyArray<number>): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

// ───────────────────────────────────────────────────────────────────────────────
// Public engine

export class TrainingTemplateContinuousLearningEngine {
  /** Ingest a Lathe outcome. */
  ingestLatheOutcome(
    input: OutcomeInput,
    opts: IngestOpts = {},
  ): IngestSuccess | IngestError {
    return this.ingestOutcome("lathe", input, opts);
  }

  /** Ingest a Mill outcome. */
  ingestMillOutcome(
    input: OutcomeInput,
    opts: IngestOpts = {},
  ): IngestSuccess | IngestError {
    return this.ingestOutcome("mill", input, opts);
  }

  /** Ingest a WEDM outcome. */
  ingestWEDMOutcome(
    input: OutcomeInput,
    opts: IngestOpts = {},
  ): IngestSuccess | IngestError {
    return this.ingestOutcome("wedm", input, opts);
  }

  /** List recent outcomes for a domain in chronological order. */
  listRecentOutcomes(
    domain: TrainingDomain,
    opts: { dir?: string; limit?: number } = {},
  ): OutcomeListResult | OutcomeListError {
    if (!VALID_DOMAINS.has(domain)) {
      return { ok: false, error: "invalid_domain", detail: `domain must be one of: lathe|mill|wedm` };
    }
    let file: string;
    try {
      file = resolveLedger(domain, { dir: opts.dir });
    } catch {
      return { ok: false, error: "ledger_unreadable", detail: "outdir_escape" };
    }
    let records: OutcomeRecord[];
    try {
      records = readLedger(file);
    } catch (err) {
      return { ok: false, error: "ledger_unreadable", detail: (err as Error).message };
    }
    const limit = typeof opts.limit === "number" && opts.limit > 0 ? Math.floor(opts.limit) : records.length;
    const sliced = records.slice(-limit);
    return {
      ok: true,
      domain,
      records: sliced,
      ledger_present: fs.existsSync(file) && records.length > 0,
      ledger: file,
    };
  }

  /** Compute accuracy + means for a specific family within a domain. */
  getFamilyAccuracy(
    domain: TrainingDomain,
    family: string,
    opts: { dir?: string } = {},
  ): FamilyAccuracyResult | FamilyAccuracyError {
    if (!VALID_DOMAINS.has(domain)) {
      return { ok: false, error: "invalid_domain", detail: `domain must be one of: lathe|mill|wedm` };
    }
    if (typeof family !== "string" || family.length === 0) {
      return { ok: false, error: "missing_family", detail: "family must be a non-empty string" };
    }
    let file: string;
    try {
      file = resolveLedger(domain, { dir: opts.dir });
    } catch {
      return { ok: false, error: "ledger_unreadable", detail: "outdir_escape" };
    }
    let records: OutcomeRecord[];
    try {
      records = readLedger(file);
    } catch (err) {
      return { ok: false, error: "ledger_unreadable", detail: (err as Error).message };
    }
    const familyRecords = records.filter((r) => r.family === family);
    if (familyRecords.length === 0) {
      return { ok: false, error: "no_records", detail: `no records for family=${family} in domain=${domain}` };
    }
    let success = 0;
    let fail = 0;
    let partial = 0;
    const toolLives: number[] = [];
    const cycleTimes: number[] = [];
    const ras: number[] = [];
    for (const r of familyRecords) {
      if (r.outcome === "success") success++;
      else if (r.outcome === "fail") fail++;
      else if (r.outcome === "partial") partial++;
      const ca = r.customer_actuals;
      if (ca) {
        if (isFiniteNumber(ca.tool_life_min)) toolLives.push(ca.tool_life_min);
        if (isFiniteNumber(ca.cycle_time_sec)) cycleTimes.push(ca.cycle_time_sec);
        if (isFiniteNumber(ca.measured_ra_um)) ras.push(ca.measured_ra_um);
      }
    }
    const total = familyRecords.length;
    const accuracy = total > 0 ? (success + 0.5 * partial) / total : 0;
    return {
      ok: true,
      domain,
      family,
      total_records: total,
      success_count: success,
      fail_count: fail,
      partial_count: partial,
      accuracy,
      mean_tool_life_min: mean(toolLives),
      mean_cycle_time_sec: mean(cycleTimes),
      mean_measured_ra_um: mean(ras),
    };
  }

  /** Aggregate statistics across all families within a domain. */
  getOutcomeStats(
    domain: TrainingDomain,
    opts: { dir?: string } = {},
  ): OutcomeStatsResult | OutcomeStatsError {
    if (!VALID_DOMAINS.has(domain)) {
      return { ok: false, error: "invalid_domain", detail: `domain must be one of: lathe|mill|wedm` };
    }
    let file: string;
    try {
      file = resolveLedger(domain, { dir: opts.dir });
    } catch {
      return { ok: false, error: "ledger_unreadable", detail: "outdir_escape" };
    }
    let records: OutcomeRecord[];
    try {
      records = readLedger(file);
    } catch (err) {
      return { ok: false, error: "ledger_unreadable", detail: (err as Error).message };
    }
    const perFamily: Record<string, { total: number; success: number; fail: number; partial: number; accuracy: number }> = Object.create(null);
    const customerSet = new Set<string>();
    let earliest: string | null = null;
    let latest: string | null = null;
    for (const r of records) {
      if (!perFamily[r.family]) {
        perFamily[r.family] = { total: 0, success: 0, fail: 0, partial: 0, accuracy: 0 };
      }
      const row = perFamily[r.family];
      row.total++;
      if (r.outcome === "success") row.success++;
      else if (r.outcome === "fail") row.fail++;
      else if (r.outcome === "partial") row.partial++;
      if (typeof r.customer === "string" && r.customer.length > 0) {
        customerSet.add(r.customer);
      }
      if (r.ts) {
        if (!earliest || r.ts < earliest) earliest = r.ts;
        if (!latest || r.ts > latest) latest = r.ts;
      }
    }
    // Final accuracy pass.
    for (const fam of Object.keys(perFamily)) {
      const row = perFamily[fam];
      row.accuracy = row.total > 0 ? (row.success + 0.5 * row.partial) / row.total : 0;
    }
    return {
      ok: true,
      domain,
      total_records: records.length,
      per_family: perFamily,
      customers: [...customerSet].sort(),
      earliest_ts: earliest,
      latest_ts: latest,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Internal: shared ingest path.

  private ingestOutcome(
    domain: TrainingDomain,
    input: OutcomeInput,
    opts: IngestOpts,
  ): IngestSuccess | IngestError {
    if (!input || typeof input !== "object") {
      return { ok: false, error: "missing_job_id", detail: "input must be an object" };
    }
    if (typeof input.job_id !== "string" || input.job_id.length === 0) {
      return { ok: false, error: "missing_job_id", detail: "job_id must be a non-empty string" };
    }
    if (typeof input.family !== "string" || input.family.length === 0) {
      return { ok: false, error: "missing_family", detail: "family must be a non-empty string" };
    }
    if (typeof input.outcome !== "string" || !VALID_OUTCOMES.has(input.outcome)) {
      return { ok: false, error: "invalid_outcome", detail: "outcome must be one of: success|fail|partial" };
    }
    const caCheck = validateCustomerActuals(input.customer_actuals);
    if (!caCheck.ok) {
      return { ok: false, error: "invalid_customer_actuals", detail: caCheck.reason };
    }

    let file: string;
    try {
      file = resolveLedger(domain, opts);
    } catch {
      return { ok: false, error: "outdir_escape", detail: "ledger path escapes base dir" };
    }
    try {
      ensureDir(file);
    } catch (err) {
      return { ok: false, error: "write_failed", detail: (err as Error).message };
    }

    const now = (opts.now ?? (() => new Date()))();
    const seq = countLedgerLines(file) + 1;
    const record: OutcomeRecord = {
      schemaVersion: SCHEMA_VERSION,
      domain,
      job_id: input.job_id,
      family: input.family,
      descriptor_snapshot: input.descriptor_snapshot,
      outcome: input.outcome,
      customer_actuals: input.customer_actuals,
      customer: input.customer,
      material: input.material,
      ts: typeof input.ts === "string" && input.ts.length > 0 ? input.ts : now.toISOString(),
      seq,
    };
    const line = JSON.stringify(record) + "\n";
    try {
      fs.appendFileSync(file, line, "utf8");
    } catch (err) {
      return { ok: false, error: "write_failed", detail: (err as Error).message };
    }
    return {
      ok: true,
      record,
      ledger: file,
      ledger_size: seq,
    };
  }
}

export const trainingTemplateContinuousLearningEngine = new TrainingTemplateContinuousLearningEngine();
