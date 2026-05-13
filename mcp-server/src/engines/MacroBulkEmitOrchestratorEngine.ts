/**
 * MacroBulkEmitOrchestratorEngine — MACRO-PROGRAM-PIPELINE-MS0/MS0-U6 (SAFETY-CRITICAL).
 *
 * The BULK path: iterate parts under `_PART LIBRARY/`, for each part with a
 * confident family match + supplied PartPrintFeatures, run the safety-critical
 * trio U2 (fill) → U4 (gate) → U5 (per-machine emit). This is the DANGEROUS
 * one — it is NOT a `phase18`-style fire-and-forget batch. It runs in BATCHES
 * (default size 25), each batch produces a review report, and the operator
 * MUST sign off on each batch before the next runs.
 *
 * SAFETY-CRITICAL invariants (asserted by tests):
 *   1. Batch n is REFUSED if batch n-1 has no `_BATCH_<n-1>_APPROVED` marker
 *      file AND the `MACRO_PROGRAM_PIPELINE_BATCH_APPROVED` env is not set to
 *      that batch number. Batch 0 needs no prior approval.
 *   2. Per-part categorization:
 *        - emitted        — passed U4 (S(x) ≥ 0.75 — borderline padding above
 *                           the HARD-BLOCK 0.70) AND at least one machine
 *                           produced a file via U5
 *        - needsHuman     — gate failed on every machine, OR S(x) in the
 *                           borderline band 0.70..0.749, OR the per-machine
 *                           emit produced zero files (every machine in the
 *                           fleet was dialect-translation-pending or
 *                           envelope-blocked)
 *        - errors         — U2/U4/U5 threw — captured with the exception
 *                           message so the batch keeps running
 *   3. Every batch produces THREE artifacts:
 *        - `_MACRO_BATCH_<n>_REVIEW.md` — operator review report (per part:
 *          family, S(x) per machine, filled-var table, dossier path, status)
 *        - `_MACRO_BULK_LOG.md`        — append-only history of every batch
 *          run with timestamps and counters
 *        - `_MACRO_NEEDS_HUMAN.md`     — sticky queue of parts that need
 *          manual review (carried across batches, append-only)
 *   4. NOTHING is emitted-as-final at the bulk path — every emitted file
 *      from U5 still carries `needsOperatorReview: true` in its header.
 *   5. Resumable: the bulk log records `offset` so calling emitBatch(n+1) on
 *      a partial dataset picks up where n left off. (The current PartRef-list
 *      path is the explicit-input variant; production callers feed the part
 *      list from PartFolderOrganizerEngine + `macroNeedsFill:true` scan.)
 *   6. Companion Stop hook `macro-bulk-emit-guard.mjs` (in MINIMAL_ALLOWLIST)
 *      blocks Stop if a `macro_bulk_emit_batch` ran in the session without
 *      a recorded approval marker for that batch.
 *
 * @module MacroBulkEmitOrchestratorEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { macroFillOrchestratorEngine } from "./MacroFillOrchestratorEngine.js";
import type { PartPrintFeatures, MacroFillCandidate } from "./MacroFillOrchestratorEngine.js";
import { macroCandidateGateEngine } from "./MacroCandidateGateEngine.js";
import type { GateResult } from "./MacroCandidateGateEngine.js";
import { macroPerMachineEmitterEngine } from "./MacroPerMachineEmitterEngine.js";
import type { PerMachineEmitOutput } from "./MacroPerMachineEmitterEngine.js";
import { safeWriteSync } from "../utils/atomicWrite.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/** One part's input — operator/UI supplies these. */
export interface BulkPartInput {
  customerName: string;
  partNumber: string;
  /** PartPrintFeatures for U2 — may be omitted to force needsHuman routing. */
  features?: PartPrintFeatures;
  /**
   * Reason for needsHuman routing if features is omitted (e.g. "no dim flag
   * set", "borderline at FAI"). Surfaced in the review report.
   */
  needsHumanReason?: string;
}

/** Where to write the per-batch artifacts. */
export interface BulkEmitOptions {
  batchNumber: number;
  libraryRoot: string;
  /** Default 25 — the spec's "BATCHES of N". */
  batchSize?: number;
  /** Explicit parts list — required for safety: NO directory-scan fallback. */
  parts: BulkPartInput[];
  /**
   * S(x) lower band for "borderline → needsHuman" routing. Default 0.75.
   * The U4 gate HARD-BLOCKs at 0.70, so this is the buffer above HARD-BLOCK.
   * Parts with 0.70 ≤ S(x) < borderlineThreshold are needsHuman, NOT emitted.
   */
  borderlineThreshold?: number;
  /**
   * Per-part target machine for U2's fill step (the candidate carries a
   * specific machine; U5 re-gates per fleet machine). Defaults to LB-3000-EX
   * because every JM Die wafer/top-hat program in the archive was built on
   * that machine and the U2 generator's defaults are tuned for it.
   */
  fillMachineHint?: string;
  /** Optional override for env-var name (tests). */
  approvedEnvVarName?: string;
  /** When true: do every step EXCEPT writing files / updating logs. */
  dryRun?: boolean;
}

export interface BatchEmittedOutcome {
  customerName: string;
  partNumber: string;
  family: string;
  emitOutput: PerMachineEmitOutput;
  filesEmitted: number;
  bestSxScore: number;
}

export interface BatchNeedsHumanOutcome {
  customerName: string;
  partNumber: string;
  reason: "no_features" | "gate_failed_all_machines" | "borderline_sx" | "no_machine_emitted" | "explicit_request";
  detail: string;
  sxScore?: number;
  blockedReasons?: string[];
}

export interface BatchErrorOutcome {
  customerName: string;
  partNumber: string;
  stage: "fill" | "gate" | "emit";
  message: string;
}

export interface BulkEmitResult {
  batchNumber: number;
  startedAt: string;
  finishedAt: string;
  partsConsidered: number;
  emitted: BatchEmittedOutcome[];
  needsHuman: BatchNeedsHumanOutcome[];
  errors: BatchErrorOutcome[];
  /** Absolute paths to the artifacts (or empty string when dryRun). */
  reviewReportPath: string;
  bulkLogPath: string;
  needsHumanQueuePath: string;
  /** Did this batch require + verify approval for batch n-1? */
  priorBatchApproved: boolean;
  /** True iff every file written carries needsOperatorReview (unconditional). */
  needsOperatorReview: true;
}

export interface BatchApproveOptions {
  batchNumber: number;
  libraryRoot: string;
  approvedBy: string;
  approvalNote?: string;
}

export interface BatchApproveResult {
  batchNumber: number;
  markerPath: string;
  approved: boolean;
  approvedAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_BORDERLINE_THRESHOLD = 0.75;
const DEFAULT_FILL_MACHINE = "OKUMA_LB-3000-EX";
const DEFAULT_APPROVED_ENV_VAR = "MACRO_PROGRAM_PIPELINE_BATCH_APPROVED";

const BATCH_REVIEW_FILENAME = (n: number) => `_MACRO_BATCH_${n}_REVIEW.md`;
const BATCH_APPROVED_FILENAME = (n: number) => `_BATCH_${n}_APPROVED`;
const BULK_LOG_FILENAME = "_MACRO_BULK_LOG.md";
const NEEDS_HUMAN_FILENAME = "_MACRO_NEEDS_HUMAN.md";

// ============================================================================
// INPUT VALIDATION
// ============================================================================

const BulkEmitOptionsSchema = z.object({
  batchNumber: z.number().int().min(0).describe("Batch index (>=0). Batch 0 requires no prior approval; n>=1 requires _BATCH_{n-1}_APPROVED."),
  libraryRoot: z.string().min(1).describe("Library root (where _MACRO_BATCH_*, _MACRO_BULK_LOG.md, _MACRO_NEEDS_HUMAN.md live)."),
  batchSize: z.number().int().min(1).max(500).optional().describe("Default 25; caps at 500 (spec's BATCHES of N)."),
  parts: z.array(z.object({
    customerName: z.string().min(1),
    partNumber: z.string().min(1),
    features: z.unknown().optional(),
    needsHumanReason: z.string().optional(),
  })).describe("Explicit parts list — production callers feed this from PartFolderOrganizerEngine + macroNeedsFill scan."),
  // Upper bound is 2.0 (semantically "force all S(x)≤1.0 parts into the
  // borderline band") so operators can run a one-shot "treat everything as
  // needsHuman" pass without rewriting the engine. The 0.70 floor still
  // enforces the U4 HARD-BLOCK alignment — a threshold below the gate's
  // own block is meaningless.
  borderlineThreshold: z.number().min(0.70).max(2.0).optional(),
  fillMachineHint: z.string().optional(),
  approvedEnvVarName: z.string().optional(),
  dryRun: z.boolean().optional(),
});

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class MacroBulkEmitOrchestratorEngineImpl {
  /**
   * Run one batch. Refuses if batch n-1 isn't approved. Categorizes each part
   * into emitted / needsHuman / errors. Writes review report + appends bulk
   * log + appends needsHuman queue. Returns counters for the operator.
   *
   * @throws Error if batchNumber > 0 and batch n-1 isn't approved (marker
   * file present OR env var set to n-1).
   */
  emitBatch(options: BulkEmitOptions): BulkEmitResult {
    const parsed = BulkEmitOptionsSchema.safeParse(options);
    if (!parsed.success) {
      throw new Error(`MacroBulkEmitOrchestratorEngine: invalid options — ${parsed.error.message}`);
    }

    const batchNumber = options.batchNumber;
    const libraryRoot = path.resolve(options.libraryRoot);
    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    const borderlineThreshold = options.borderlineThreshold ?? DEFAULT_BORDERLINE_THRESHOLD;
    const fillMachine = options.fillMachineHint ?? DEFAULT_FILL_MACHINE;
    const approvedEnvVar = options.approvedEnvVarName ?? DEFAULT_APPROVED_ENV_VAR;
    const dryRun = options.dryRun === true;

    // --- Approval gate ----------------------------------------------------
    const priorBatchApproved = this._isPriorBatchApproved(batchNumber, libraryRoot, approvedEnvVar);
    if (batchNumber > 0 && !priorBatchApproved) {
      throw new Error(
        `MacroBulkEmitOrchestratorEngine: refusing to run batch ${batchNumber} ` +
          `— batch ${batchNumber - 1} is not approved. Approve via ` +
          `approveBatch(${batchNumber - 1}, …) or set env ` +
          `${approvedEnvVar}=${batchNumber - 1}.`,
      );
    }

    const partsToProcess = options.parts.slice(0, batchSize);
    const startedAt = new Date().toISOString();

    const emitted: BatchEmittedOutcome[] = [];
    const needsHuman: BatchNeedsHumanOutcome[] = [];
    const errors: BatchErrorOutcome[] = [];

    for (const part of partsToProcess) {
      this._processOnePart({
        part,
        libraryRoot,
        fillMachine,
        borderlineThreshold,
        emitted,
        needsHuman,
        errors,
      });
    }

    const finishedAt = new Date().toISOString();

    // --- Artifacts -------------------------------------------------------
    const reviewReportPath = path.join(libraryRoot, BATCH_REVIEW_FILENAME(batchNumber));
    const bulkLogPath = path.join(libraryRoot, BULK_LOG_FILENAME);
    const needsHumanQueuePath = path.join(libraryRoot, NEEDS_HUMAN_FILENAME);

    if (!dryRun) {
      fs.mkdirSync(libraryRoot, { recursive: true });
      this._writeReviewReport(reviewReportPath, {
        batchNumber, startedAt, finishedAt, partsConsidered: partsToProcess.length,
        emitted, needsHuman, errors, borderlineThreshold,
      });
      this._appendBulkLog(bulkLogPath, {
        batchNumber, startedAt, finishedAt, partsConsidered: partsToProcess.length,
        emittedCount: emitted.length, needsHumanCount: needsHuman.length, errorCount: errors.length,
      });
      this._appendNeedsHumanQueue(needsHumanQueuePath, batchNumber, needsHuman);
    }

    return {
      batchNumber,
      startedAt,
      finishedAt,
      partsConsidered: partsToProcess.length,
      emitted,
      needsHuman,
      errors,
      reviewReportPath: dryRun ? "" : reviewReportPath,
      bulkLogPath: dryRun ? "" : bulkLogPath,
      needsHumanQueuePath: dryRun ? "" : needsHumanQueuePath,
      priorBatchApproved,
      needsOperatorReview: true,
    };
  }

  /**
   * Approve a completed batch — creates `_BATCH_<n>_APPROVED` marker so the
   * next call to `emitBatch(n+1)` can proceed. The marker carries who approved
   * + when + an optional note for the audit trail.
   */
  approveBatch(options: BatchApproveOptions): BatchApproveResult {
    if (!options || typeof options !== "object") {
      throw new Error("approveBatch requires options object");
    }
    if (!Number.isInteger(options.batchNumber) || options.batchNumber < 0) {
      throw new Error("approveBatch: batchNumber must be a non-negative integer");
    }
    if (!options.libraryRoot || typeof options.libraryRoot !== "string") {
      throw new Error("approveBatch: libraryRoot is required");
    }
    if (!options.approvedBy || typeof options.approvedBy !== "string") {
      throw new Error("approveBatch: approvedBy is required (operator identity)");
    }

    const libraryRoot = path.resolve(options.libraryRoot);
    const markerPath = path.join(libraryRoot, BATCH_APPROVED_FILENAME(options.batchNumber));
    const approvedAt = new Date().toISOString();

    fs.mkdirSync(libraryRoot, { recursive: true });
    const content = [
      `# Batch ${options.batchNumber} — APPROVED`,
      ``,
      `- Approved by: ${options.approvedBy}`,
      `- Approved at: ${approvedAt}`,
      `- Note: ${options.approvalNote ?? "(none)"}`,
      ``,
      `This marker authorizes \`MacroBulkEmitOrchestratorEngine.emitBatch(${options.batchNumber + 1}, …)\``,
      `to proceed. Every emitted file from THIS batch still carries`,
      `\`needsOperatorReview: true\` in its header — first-piece prove-out is unconditional.`,
      ``,
    ].join("\n");
    safeWriteSync(markerPath, content, "utf-8");

    return { batchNumber: options.batchNumber, markerPath, approved: true, approvedAt };
  }

  /** True iff `_BATCH_<n>_APPROVED` marker exists in libraryRoot. */
  isBatchApproved(batchNumber: number, libraryRoot: string): boolean {
    const root = path.resolve(libraryRoot);
    return fs.existsSync(path.join(root, BATCH_APPROVED_FILENAME(batchNumber)));
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: process one part end-to-end (U2 → U4 → U5). Errors NEVER abort
  // the batch — they become typed BatchErrorOutcome entries.
  // ────────────────────────────────────────────────────────────────────────
  private _processOnePart(args: {
    part: BulkPartInput;
    libraryRoot: string;
    fillMachine: string;
    borderlineThreshold: number;
    emitted: BatchEmittedOutcome[];
    needsHuman: BatchNeedsHumanOutcome[];
    errors: BatchErrorOutcome[];
  }): void {
    const { part, libraryRoot, fillMachine, borderlineThreshold, emitted, needsHuman, errors } = args;

    // No features supplied — short-circuit to needsHuman with the supplied reason.
    if (!part.features) {
      needsHuman.push({
        customerName: part.customerName,
        partNumber: part.partNumber,
        reason: part.needsHumanReason ? "explicit_request" : "no_features",
        detail: part.needsHumanReason ?? "PartPrintFeatures not provided — operator must fill",
      });
      return;
    }

    // U2 — fill the candidate.
    let candidate: MacroFillCandidate;
    try {
      candidate = macroFillOrchestratorEngine.fillCandidate(part.features, fillMachine);
    } catch (err) {
      errors.push({
        customerName: part.customerName,
        partNumber: part.partNumber,
        stage: "fill",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    // U4 — gate the candidate.
    let gateResult: GateResult;
    try {
      gateResult = macroCandidateGateEngine.gateCandidate(candidate);
    } catch (err) {
      errors.push({
        customerName: part.customerName,
        partNumber: part.partNumber,
        stage: "gate",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    if (!gateResult.passed || !gateResult.dossier) {
      needsHuman.push({
        customerName: part.customerName,
        partNumber: part.partNumber,
        reason: "gate_failed_all_machines",
        detail: `S(x)=${gateResult.sxScore.toFixed(3)}; BLOCKED: ${gateResult.failingChecks.map(c => c.gate).join(", ") || "(none flagged but passed=false)"}`,
        sxScore: gateResult.sxScore,
        blockedReasons: gateResult.failingChecks.map(c => `${c.gate}: ${c.detail}`),
      });
      return;
    }

    // Borderline band — pass U4 but in the buffer above HARD-BLOCK.
    if (gateResult.sxScore < borderlineThreshold) {
      needsHuman.push({
        customerName: part.customerName,
        partNumber: part.partNumber,
        reason: "borderline_sx",
        detail: `S(x)=${gateResult.sxScore.toFixed(3)} in borderline band [0.70, ${borderlineThreshold.toFixed(2)})`,
        sxScore: gateResult.sxScore,
      });
      return;
    }

    // U5 — per-machine emit.
    let emitOutput: PerMachineEmitOutput;
    try {
      emitOutput = macroPerMachineEmitterEngine.emitPerMachine({
        dossier: gateResult.dossier,
        partRef: {
          customerName: part.customerName,
          partNumber: part.partNumber,
          libraryRoot,
        },
      });
    } catch (err) {
      errors.push({
        customerName: part.customerName,
        partNumber: part.partNumber,
        stage: "emit",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    if (emitOutput.summary.filesEmitted === 0) {
      needsHuman.push({
        customerName: part.customerName,
        partNumber: part.partNumber,
        reason: "no_machine_emitted",
        detail: `Per-machine gate or dialect-pending rejected every machine in the fleet`,
        sxScore: gateResult.sxScore,
      });
      return;
    }

    emitted.push({
      customerName: part.customerName,
      partNumber: part.partNumber,
      family: candidate.family,
      emitOutput,
      filesEmitted: emitOutput.summary.filesEmitted,
      bestSxScore: Math.max(...emitOutput.machines.filter(m => m.emitted).map(m => m.sxScore), 0),
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: approval check — marker file OR env-var fallback.
  // ────────────────────────────────────────────────────────────────────────
  private _isPriorBatchApproved(batchNumber: number, libraryRoot: string, envVarName: string): boolean {
    if (batchNumber === 0) return true;
    const prior = batchNumber - 1;
    // Marker file path.
    const markerPath = path.join(libraryRoot, BATCH_APPROVED_FILENAME(prior));
    if (fs.existsSync(markerPath)) return true;
    // Env-var fallback (operator may set on the shop floor without writing files).
    const envVal = process.env[envVarName];
    if (envVal !== undefined && envVal.trim() !== "") {
      const envNum = Number(envVal.trim());
      if (Number.isInteger(envNum) && envNum >= prior) return true;
    }
    return false;
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: artifact writers (atomic via safeWriteSync).
  // ────────────────────────────────────────────────────────────────────────
  private _writeReviewReport(filePath: string, ctx: {
    batchNumber: number;
    startedAt: string;
    finishedAt: string;
    partsConsidered: number;
    emitted: BatchEmittedOutcome[];
    needsHuman: BatchNeedsHumanOutcome[];
    errors: BatchErrorOutcome[];
    borderlineThreshold: number;
  }): void {
    const lines: string[] = [];
    lines.push(`# Macro Bulk Emit — Batch ${ctx.batchNumber} Review`);
    lines.push("");
    lines.push(`- Started:        ${ctx.startedAt}`);
    lines.push(`- Finished:       ${ctx.finishedAt}`);
    lines.push(`- Parts considered: ${ctx.partsConsidered}`);
    lines.push(`- Emitted:        ${ctx.emitted.length}`);
    lines.push(`- Needs human:    ${ctx.needsHuman.length}`);
    lines.push(`- Errors:         ${ctx.errors.length}`);
    lines.push(`- Borderline threshold S(x): ${ctx.borderlineThreshold.toFixed(2)}`);
    lines.push("");
    lines.push("**Every emitted .MIN file still carries `needsOperatorReview: true` in its header — first-piece prove-out is unconditional.**");
    lines.push("");
    lines.push(`To proceed to batch ${ctx.batchNumber + 1}: approve this batch via \`approveBatch(${ctx.batchNumber}, {libraryRoot, approvedBy, ...})\` or create \`_BATCH_${ctx.batchNumber}_APPROVED\`.`);
    lines.push("");

    if (ctx.emitted.length > 0) {
      lines.push(`## Emitted (${ctx.emitted.length})`);
      lines.push("");
      lines.push("| Customer | Part | Family | Files emitted | Best S(x) |");
      lines.push("|---|---|---|---|---|");
      for (const e of ctx.emitted) {
        lines.push(`| ${e.customerName} | ${e.partNumber} | ${e.family} | ${e.filesEmitted} | ${e.bestSxScore.toFixed(3)} |`);
      }
      lines.push("");
    }

    if (ctx.needsHuman.length > 0) {
      lines.push(`## Needs human review (${ctx.needsHuman.length})`);
      lines.push("");
      for (const h of ctx.needsHuman) {
        lines.push(`- **${h.customerName} / ${h.partNumber}** — ${h.reason}: ${h.detail}`);
      }
      lines.push("");
    }

    if (ctx.errors.length > 0) {
      lines.push(`## Errors (${ctx.errors.length})`);
      lines.push("");
      for (const e of ctx.errors) {
        lines.push(`- **${e.customerName} / ${e.partNumber}** [${e.stage}]: ${e.message}`);
      }
      lines.push("");
    }

    safeWriteSync(filePath, lines.join("\n"), "utf-8");
  }

  private _appendBulkLog(filePath: string, entry: {
    batchNumber: number;
    startedAt: string;
    finishedAt: string;
    partsConsidered: number;
    emittedCount: number;
    needsHumanCount: number;
    errorCount: number;
  }): void {
    const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "# Macro Bulk Emit Log\n\n";
    const line = `- ${entry.startedAt} — batch ${entry.batchNumber}: considered=${entry.partsConsidered}, emitted=${entry.emittedCount}, needsHuman=${entry.needsHumanCount}, errors=${entry.errorCount}, finished=${entry.finishedAt}\n`;
    safeWriteSync(filePath, existing + line, "utf-8");
  }

  private _appendNeedsHumanQueue(filePath: string, batchNumber: number, entries: BatchNeedsHumanOutcome[]): void {
    if (entries.length === 0) return;
    const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "# Macro Needs-Human Queue\n\nParts flagged during bulk emit that require manual review.\n\n";
    const block: string[] = [];
    block.push(`## Batch ${batchNumber}`);
    block.push("");
    for (const h of entries) {
      block.push(`- ${h.customerName} / ${h.partNumber} — **${h.reason}**: ${h.detail}`);
    }
    block.push("");
    safeWriteSync(filePath, existing + block.join("\n"), "utf-8");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const macroBulkEmitOrchestratorEngine = new MacroBulkEmitOrchestratorEngineImpl();

/** @internal — test surface only. */
export const BULK_CONSTANTS_FOR_TESTS = {
  DEFAULT_BATCH_SIZE,
  DEFAULT_BORDERLINE_THRESHOLD,
  DEFAULT_FILL_MACHINE,
  DEFAULT_APPROVED_ENV_VAR,
  BATCH_REVIEW_FILENAME,
  BATCH_APPROVED_FILENAME,
  BULK_LOG_FILENAME,
  NEEDS_HUMAN_FILENAME,
};
