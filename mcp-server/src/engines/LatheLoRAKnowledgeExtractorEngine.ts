/**
 * LatheLoRAKnowledgeExtractorEngine — LATHE-LORA-MS0/U-LLR-EXTRACT
 *
 * L1 of the lathe self-improving-AI loop: harvests training-ready records from
 * the lathe knowledge sources into a deduped, schema-versioned `LatheTrainingRecord[]`
 * (SFT instruction/input/output format) — the feeder UPSTREAM of the LoRA dataset builder.
 *
 * Sources:
 *   1. OUTCOMES — the labeled lathe rows in the shared experience ledger
 *      (latheLoRAExperienceLedgerEngine.replaySample → crossProcessOutcomeStore, process:"lathe").
 *      This is the always-available, in-slot source (the closed-loop signal).
 *   2. CORPUS / TRIBAL — INJECTED (pure-core + injected-readers pattern): the caller passes
 *      arrays of corpus/tribal records. This keeps the engine testable + decoupled from the
 *      heavy corpus/tribal readers (which may be absent in a behind-sync slot or require the
 *      MCP server). The reader-wiring is the caller's concern; the extraction logic is pure here.
 *
 * Deterministic: record ids are FNV-1a content hashes (source|instruction|input) — same
 * input → same id → idempotent dedup across repeated harvests. No Date.now / RNG.
 */
import {
  latheLoRAExperienceLedgerEngine,
} from "./LatheLoRAExperienceLedgerEngine.js";
import type { OutcomeRecord } from "./CrossProcessOutcomeStore.js";

export const KNOWLEDGE_EXTRACT_SCHEMA_VERSION = "1.0";
const MAX_HARVEST = 10_000;
const DEFAULT_LIMIT = 256;

/** SFT-format training record harvested from a lathe knowledge source. */
export interface LatheTrainingRecord {
  /** Deterministic FNV-1a content hash (source|instruction|input) — the dedup key. */
  id: string;
  schemaVersion: string;
  instruction: string;
  input: string;
  output: string;
  /** Quality signal ∈ [0,1] carried from the source (outcome reward, or caller-supplied). */
  reward: number;
  source: "outcome" | "corpus" | "tribal";
  /** Source timestamp (pass-through; "" when the injected source omits it). */
  ts: string;
}

/** Injected corpus record — a pre-extracted lathe program/example. */
export interface LatheCorpusRecordInput {
  instruction?: string;
  input: string;
  output: string;
  reward?: number;
  ts?: string;
}

/** Injected tribal record — a shop-floor tip mapped to a teachable example. */
export interface LatheTribalRecordInput {
  tip: string;
  context?: string;
  reward?: number;
  ts?: string;
}

export interface LatheExtractOptions {
  /** Max outcome rows to pull from the ledger (clamped 1..10000). */
  limit?: number;
  /** Drop outcome records whose reward is below this floor (default 0 — keep all). */
  minReward?: number;
  includeCorpus?: LatheCorpusRecordInput[];
  includeTribal?: LatheTribalRecordInput[];
}

export interface LatheExtractResult {
  records: LatheTrainingRecord[];
  stats: {
    total: number;
    fromOutcomes: number;
    fromCorpus: number;
    fromTribal: number;
    deduped: number;
    skipped: number;
  };
}

/** FNV-1a 32-bit — deterministic, dependency-free content hash. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function clamp01(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

export class LatheLoRAKnowledgeExtractorEngine {
  private make(
    instruction: string,
    input: string,
    output: string,
    reward: number,
    source: LatheTrainingRecord["source"],
    ts: string,
  ): LatheTrainingRecord {
    return {
      id: fnv1a(`${source}|${instruction}|${input}`),
      schemaVersion: KNOWLEDGE_EXTRACT_SCHEMA_VERSION,
      instruction,
      input,
      output,
      reward: clamp01(reward),
      source,
      ts,
    };
  }

  private fromOutcome(r: OutcomeRecord): LatheTrainingRecord | null {
    const rs = r.request_summary;
    if (!rs || typeof rs.operation !== "string" || rs.operation.length === 0) return null;
    const instruction = `Recommend turning parameters for ${rs.operation}${rs.material ? ` of ${rs.material}` : ""}.`;
    const input = JSON.stringify({
      material: rs.material,
      operation: rs.operation,
      controller: rs.controller,
      targetRaUm: rs.target_ra_um,
      machineFamily: rs.machine_family,
    });
    const output = JSON.stringify({
      vc: rs.cutting_speed_m_min,
      feed: rs.feed_rate_mm_min,
      rpm: rs.spindle_rpm,
      ap: rs.depth_of_cut_mm,
      outcome: r.outcome?.kind,
    });
    const reward = clamp01(
      r.outcome?.actual_metrics?.reward ?? (r.outcome?.kind === "success" ? 1 : 0),
    );
    return this.make(instruction, input, output, reward, "outcome", r.ts ?? "");
  }

  private fromCorpus(c: LatheCorpusRecordInput): LatheTrainingRecord | null {
    if (!c || typeof c.input !== "string" || typeof c.output !== "string") return null;
    const instruction = c.instruction ?? "Reproduce the proven lathe program for this context.";
    return this.make(instruction, c.input, c.output, clamp01(c.reward ?? 1), "corpus", c.ts ?? "");
  }

  private fromTribal(t: LatheTribalRecordInput): LatheTrainingRecord | null {
    if (!t || typeof t.tip !== "string" || t.tip.length === 0) return null;
    const instruction = "Apply the shop-floor lathe tip relevant to this situation.";
    const input = t.context ?? "";
    return this.make(instruction, input, t.tip, clamp01(t.reward ?? 1), "tribal", t.ts ?? "");
  }

  /**
   * Harvest labeled lathe outcomes (+ optional injected corpus/tribal) into deduped
   * SFT training records.
   * @returns records + per-source stats (incl deduped + skipped-malformed counts)
   */
  extract(opts: LatheExtractOptions = {}): LatheExtractResult {
    const limit = Math.max(1, Math.min(MAX_HARVEST, Math.floor(opts.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));
    const minReward = typeof opts.minReward === "number" && Number.isFinite(opts.minReward) ? opts.minReward : 0;
    const records: LatheTrainingRecord[] = [];
    const seen = new Set<string>();
    let fromOutcomes = 0;
    let fromCorpus = 0;
    let fromTribal = 0;
    let deduped = 0;
    let skipped = 0;

    const push = (rec: LatheTrainingRecord | null, bump: () => void): void => {
      if (!rec) {
        skipped++;
        return;
      }
      if (seen.has(rec.id)) {
        deduped++;
        return;
      }
      seen.add(rec.id);
      records.push(rec);
      bump();
    };

    for (const r of latheLoRAExperienceLedgerEngine.replaySample(limit)) {
      const rec = this.fromOutcome(r);
      if (rec && rec.reward < minReward) continue; // below quality floor — not a skip/dedup
      push(rec, () => (fromOutcomes += 1));
    }
    for (const c of opts.includeCorpus ?? []) push(this.fromCorpus(c), () => (fromCorpus += 1));
    for (const t of opts.includeTribal ?? []) push(this.fromTribal(t), () => (fromTribal += 1));

    return {
      records,
      stats: { total: records.length, fromOutcomes, fromCorpus, fromTribal, deduped, skipped },
    };
  }
}

export const latheLoRAKnowledgeExtractorEngine = new LatheLoRAKnowledgeExtractorEngine();
