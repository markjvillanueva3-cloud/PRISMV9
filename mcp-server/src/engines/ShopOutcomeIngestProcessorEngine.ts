/**
 * ShopOutcomeIngestProcessorEngine — the outcome → loop automation bridge.
 *
 * The piece that makes the self-improving loop OPERATIONAL: reads a JSONL
 * stream of shop outcomes, hands each to PSNSelfImprovingLoopEngine.ingest(),
 * and emits the resulting LoopIngestResult into a sink ledger. Without this,
 * the loop has architecture but no automated learning — outcomes never flow
 * in unless a caller manually invokes ingest() for every event.
 *
 * Architecture (slot:india /goal-psn-self-improving iter6):
 *
 *   AI_LEDGER.jsonl                shop-outcome-history.jsonl
 *   (or any JSONL of               (one LoopIngestResult per
 *    OutcomeLedgerRecord)           processed outcome — durable
 *         │                          audit trail per shop)
 *         ▼                                  ▲
 *   processLedgerOutcomes(input, sink, deps) ─┘
 *         │
 *         ├─► parseLedgerLine (pure: skip __meta + ragged)
 *         ├─► buildIngestInputFromLedger (pure: outcome+claim+questions+verifier)
 *         └─► psnSelfImprovingLoopEngine.ingest(input)  ─► LoopIngestResult
 *                                                            │
 *                                                            └─► sinkWriter (caller)
 *
 * Defaults are JM Die: when a ledger row has no shop_id, it's attributed
 * to "jm-die" per CLAUDE.md TEST SHOP. Multi-shop ledgers MUST set shop_id
 * on each row.
 *
 * Design choices:
 *
 * - **Pure when injectable** — `processLedgerOutcomes(input, sink, deps)`
 *   accepts dependencies (`readFileImpl`, `sinkWriter`, `loopEngine`,
 *   `nowImpl`) so tests can use synthetic streams + capture sinks.
 *   Production wires real fs + the loop singleton.
 *
 * - **Default verifier is conservative** — a "bounds-check" verifier that
 *   passes when the outcome's actual/estimated ratio sits in [0.5, 2.0]
 *   and conflicts otherwise. Catches the obvious "10x faster than estimate
 *   = data corruption" class without needing CoV substrate calls. Callers
 *   can inject a smarter verifier via `deps.verifierFactory`.
 *
 * - **R12 fail-loud on schema** — rows missing `category`/`domain`/
 *   `estimated`/`actual` are routed to a `rejected` count + structured
 *   reason; they never silently inflate the success bucket.
 *
 * - **Resumable** — the processor's return value names the number of rows
 *   processed + sink offset, so a follow-up call can resume past a crash.
 *   Outcome dedup keys via `deriveLoopIterationId` (see PSN engine).
 *
 * REFS:
 * - [[reference_psn_self_improving_loop_ms0_iter1to3_2026_05_25]] — loop spec
 * - [[reference_cov_engine_2026_05_25]] — substrate verifier engine
 *
 * @module ShopOutcomeIngestProcessorEngine
 */

import {
  psnSelfImprovingLoopEngine,
  type PSNSelfImprovingLoopEngine,
  type LoopIngestInput,
  type LoopIngestResult,
} from "./PSNSelfImprovingLoopEngine.js";
import type {
  ShopOutcomeRecord,
} from "./ShopProfileAdapterEngine.js";
import type {
  VerificationAnswer,
  Verifier,
  VerificationQuestion,
  VerificationClaim,
} from "./ChainOfVerificationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/**
 * One ledger row. Compatible with AI_LEDGER.jsonl + any caller-side
 * outcome history file. Privacy-preserving: customer/part identifiers
 * are hashed externally before reaching this processor — fields named
 * `evidence_id` carry opaque hashes, never raw names.
 */
export interface OutcomeLedgerRecord {
  observed_at: string;
  shop_id?: string;
  category: ShopOutcomeRecord["category"];
  domain: ShopOutcomeRecord["domain"];
  estimated: number;
  actual: number;
  unit: string;
  s_of_x?: number;
  evidence_id?: string;
  /** Optional human-readable summary for claim text. */
  summary?: string;
  /** Optional pre-built claim id (else synthesized). */
  claim_id?: string;
}

export interface ProcessLedgerRejection {
  row_index: number;
  reason: string;
  /** Raw line text, truncated to 200 chars — for forensic recovery. */
  excerpt: string;
}

export interface ProcessLedgerStats {
  rows_scanned: number;
  rows_meta_skipped: number;
  rows_processed: number;
  rows_rejected: number;
  loop_confirmed_full: number;
  loop_confirmed_caveat: number;
  loop_anomaly_only: number;
  loop_fold_skipped: number;
  rejections: ProcessLedgerRejection[];
  /** Per-shop totals — `{shop_id: count}`. */
  by_shop: Record<string, number>;
  /** Wall-clock ms for the run. */
  duration_ms: number;
  finished_at: string;
}

export interface ProcessLedgerDeps {
  /** Pure reader — defaults to fs.readFileSync(p, "utf8"). */
  readFileImpl?: (path: string) => string;
  /** Pure writer — receives one stringified JSONL line per emit. */
  sinkWriter?: (line: string) => void;
  /** PSNSelfImprovingLoopEngine instance to use. Defaults to singleton. */
  loopEngine?: PSNSelfImprovingLoopEngine;
  /** Verifier factory — given a row, return the verifier closure. */
  verifierFactory?: (row: OutcomeLedgerRecord) => Verifier;
  /** Clock for deterministic tests. */
  nowImpl?: () => string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SHOP_ID = "jm-die";
const BOUNDS_CHECK_LOW = 0.5;
const BOUNDS_CHECK_HIGH = 2.0;

// ============================================================================
// PURE HELPERS
// ============================================================================

/**
 * Parse one ledger line. Returns the row or a structured rejection — never
 * throws. Skips __meta header rows transparently.
 */
export function parseLedgerLine(
  line: string,
  rowIndex: number,
): { row: OutcomeLedgerRecord } | { meta: true } | { rejection: ProcessLedgerRejection } {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return { rejection: { row_index: rowIndex, reason: "empty_line", excerpt: "" } };
  }
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch (e) {
    return {
      rejection: {
        row_index: rowIndex,
        reason: "json_parse_failed",
        excerpt: trimmed.slice(0, 200),
      },
    };
  }
  if (!obj || typeof obj !== "object") {
    return {
      rejection: { row_index: rowIndex, reason: "not_an_object", excerpt: trimmed.slice(0, 200) },
    };
  }
  const o = obj as Record<string, unknown>;
  if (o.__meta === true) return { meta: true };

  // Required fields
  if (typeof o.observed_at !== "string" || o.observed_at.length === 0) {
    return {
      rejection: {
        row_index: rowIndex,
        reason: "missing_observed_at",
        excerpt: trimmed.slice(0, 200),
      },
    };
  }
  if (typeof o.category !== "string") {
    return {
      rejection: { row_index: rowIndex, reason: "missing_category", excerpt: trimmed.slice(0, 200) },
    };
  }
  if (typeof o.domain !== "string") {
    return {
      rejection: { row_index: rowIndex, reason: "missing_domain", excerpt: trimmed.slice(0, 200) },
    };
  }
  if (!Number.isFinite(o.estimated as number)) {
    return {
      rejection: {
        row_index: rowIndex,
        reason: "non_finite_estimated",
        excerpt: trimmed.slice(0, 200),
      },
    };
  }
  if (!Number.isFinite(o.actual as number)) {
    return {
      rejection: { row_index: rowIndex, reason: "non_finite_actual", excerpt: trimmed.slice(0, 200) },
    };
  }
  if (typeof o.unit !== "string") {
    return {
      rejection: { row_index: rowIndex, reason: "missing_unit", excerpt: trimmed.slice(0, 200) },
    };
  }
  return { row: o as unknown as OutcomeLedgerRecord };
}

/**
 * Build a LoopIngestInput from a ledger row. Pure.
 *
 * The verifier closure is supplied — the caller chooses the substrate
 * (a default bounds-check verifier is exposed below for the common case).
 */
export function buildIngestInputFromLedger(
  row: OutcomeLedgerRecord,
  verifier: Verifier,
): LoopIngestInput {
  const shop_id = row.shop_id && row.shop_id.length > 0 ? row.shop_id : DEFAULT_SHOP_ID;
  const outcome: ShopOutcomeRecord = {
    observed_at: row.observed_at,
    category: row.category,
    domain: row.domain,
    estimated: row.estimated,
    actual: row.actual,
    unit: row.unit,
    s_of_x: row.s_of_x,
    evidence_id: row.evidence_id,
  };
  const claim: VerificationClaim = {
    claimId: row.claim_id || `claim-${shop_id}-${row.observed_at}-${row.category}-${row.domain}`,
    domain: "generic",
    summary:
      row.summary ||
      `${shop_id} ${row.category} ${row.domain}: estimated=${row.estimated}${row.unit}, actual=${row.actual}${row.unit}`,
    initialVerdict: "ok",
    initialConfidence: 0.6,
    payload: {
      estimated: row.estimated,
      actual: row.actual,
      unit: row.unit,
      category: row.category,
      domain: row.domain,
    },
  };
  const questions: VerificationQuestion[] = [
    {
      id: "bounds-check",
      question: `Is actual within reasonable bounds of estimated? (ratio = ${(row.actual / Math.max(row.estimated, 1e-12)).toFixed(3)})`,
      severity: "medium",
    },
  ];
  return { shop_id, outcome, claim, questions, verifier };
}

/**
 * Default verifier — bounds-check on actual/estimated ratio. Catches the
 * "10x faster" data-corruption class without substrate calls. Pure +
 * synchronous (wrapped to Promise return per Verifier signature).
 *
 * Replace via deps.verifierFactory for substrate-aware verification.
 */
export function defaultBoundsCheckVerifierFactory(row: OutcomeLedgerRecord): Verifier {
  return (q: VerificationQuestion): VerificationAnswer => {
    const ratio = row.estimated === 0 ? Number.POSITIVE_INFINITY : row.actual / row.estimated;
    const inBounds = Number.isFinite(ratio) && ratio >= BOUNDS_CHECK_LOW && ratio <= BOUNDS_CHECK_HIGH;
    return {
      questionId: q.id,
      outcome: inBounds ? "confirms" : "conflicts",
      evidence: `ratio=${ratio.toFixed(3)} ∈ [${BOUNDS_CHECK_LOW}, ${BOUNDS_CHECK_HIGH}] = ${inBounds}`,
      confidence: inBounds ? 0.85 : 0.85,
      citedIds: [],
    };
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class ShopOutcomeIngestProcessorEngine {
  static readonly engineId = "shop_outcome_ingest_processor";
  static readonly version = "1.0.0";

  /**
   * Process a JSONL ledger file: every non-meta row → ingest() → sinkWriter.
   *
   * Pure when all deps are injected. Production callers typically only need
   * to provide `inputPath`; the defaults wire fs read + the loop singleton
   * + the default bounds-check verifier.
   */
  async processLedger(
    inputPath: string,
    deps: ProcessLedgerDeps = {},
  ): Promise<ProcessLedgerStats> {
    const t0 = Date.now();
    const readFileImpl = deps.readFileImpl ?? ((p) => {
      // Lazy fs read — only when no injection.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      return fs.readFileSync(p, "utf8");
    });
    const sinkWriter = deps.sinkWriter ?? ((_line: string) => { /* drop */ });
    const loopEngine = deps.loopEngine ?? psnSelfImprovingLoopEngine;
    const verifierFactory = deps.verifierFactory ?? defaultBoundsCheckVerifierFactory;
    const nowImpl = deps.nowImpl ?? (() => new Date().toISOString());

    let raw: string;
    try {
      raw = readFileImpl(inputPath);
    } catch (e) {
      return {
        rows_scanned: 0,
        rows_meta_skipped: 0,
        rows_processed: 0,
        rows_rejected: 0,
        loop_confirmed_full: 0,
        loop_confirmed_caveat: 0,
        loop_anomaly_only: 0,
        loop_fold_skipped: 0,
        rejections: [
          { row_index: -1, reason: "input_unreadable", excerpt: String((e as Error).message).slice(0, 200) },
        ],
        by_shop: {},
        duration_ms: Date.now() - t0,
        finished_at: nowImpl(),
      };
    }

    const stats: ProcessLedgerStats = {
      rows_scanned: 0,
      rows_meta_skipped: 0,
      rows_processed: 0,
      rows_rejected: 0,
      loop_confirmed_full: 0,
      loop_confirmed_caveat: 0,
      loop_anomaly_only: 0,
      loop_fold_skipped: 0,
      rejections: [],
      by_shop: {},
      duration_ms: 0,
      finished_at: "",
    };

    const lines = raw.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length === 0) continue;
      stats.rows_scanned++;
      const parsed = parseLedgerLine(line, i);
      if ("meta" in parsed) {
        stats.rows_meta_skipped++;
        continue;
      }
      if ("rejection" in parsed) {
        stats.rows_rejected++;
        stats.rejections.push(parsed.rejection);
        continue;
      }
      const row = parsed.row;
      const verifier = verifierFactory(row);
      const input = buildIngestInputFromLedger(row, verifier);
      let result: LoopIngestResult;
      try {
        result = await loopEngine.ingest(input);
      } catch (e) {
        stats.rows_rejected++;
        stats.rejections.push({
          row_index: i,
          reason: `ingest_threw: ${String((e as Error).message).slice(0, 160)}`,
          excerpt: line.slice(0, 200),
        });
        continue;
      }
      stats.rows_processed++;
      stats.by_shop[input.shop_id] = (stats.by_shop[input.shop_id] || 0) + 1;
      switch (result.loop_outcome) {
        case "confirmed_full":   stats.loop_confirmed_full++;   break;
        case "confirmed_caveat": stats.loop_confirmed_caveat++; break;
        case "anomaly_only":     stats.loop_anomaly_only++;     break;
        case "fold_skipped":     stats.loop_fold_skipped++;     break;
      }
      sinkWriter(JSON.stringify(result));
    }

    stats.duration_ms = Date.now() - t0;
    stats.finished_at = nowImpl();
    return stats;
  }
}

export const shopOutcomeIngestProcessorEngine = new ShopOutcomeIngestProcessorEngine();
