/**
 * WEDMPrintProgramAlpacaAugmenterEngine — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0 U-WCTP-PRINT-AUGMENT
 * ============================================================================
 *
 * iter23 — closes the print-side of closed-loop training.
 *
 * The iter1-22 substrate emits PROGRAM-ONLY Alpaca pairs from the JM Die wire
 * archive (4,058 .NC files). The operator's specific 2026-05-27 directive
 * — "use prints and existing wire programs to train the system to generate
 * wire programs ... wire to the blueprint reading domain so it learns too" —
 * requires augmenting each pair with the matching blueprint's extracted
 * dimensions / GD&T / material / finish. That gives the model the print→program
 * mapping at training time (not just program-only style).
 *
 * Pure transform engine — caller provides:
 *   1. Program content (string) — the .NC file body
 *   2. Optional print extraction (from BlueprintVisionOCREngine /
 *      PDFBlueprintDimensionExtractorEngine / BlueprintExtractionRAGEngine)
 *   3. Join confidence + tier (from BlueprintProgramJoinEngine)
 *
 * Output: AugmentedAlpacaPair with `print_context` field. If the print is
 * missing or low-confidence, the pair is either kept as program-only OR
 * skipped — caller controls via confidence_floor + emit_program_only_below.
 *
 * Design constraints (Karpathy):
 *   CLASSIFY: dataset transform (program + optional print → Alpaca example)
 *   TECHNIQUE: pure function, no I/O, deterministic ordering of fields
 *   EDGE CASES: missing print, OCR failure, multi-dim print, long context,
 *               empty program, NaN/null inputs, non-string content
 *   FAILURE MODES: throws on type violations; skips on policy violations
 *
 * @module engines/WEDMPrintProgramAlpacaAugmenterEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PrintDimension {
  label: string;
  value: number;
  unit?: "mm" | "in" | "thou" | "deg";
  tolerance?: { plus: number; minus: number };
}

export interface PrintExtraction {
  /** Dimensional callouts extracted from the print (Vision OCR or PDF regex). */
  dimensions?: PrintDimension[];
  /** GD&T strings (e.g. "⌖ 0.005 A B C", "⊥ 0.002 A"). */
  gdt?: string[];
  /** Material callout (e.g. "A2 Tool Steel — Heat Treated to 58-62 HRC"). */
  material?: string | null;
  /** Surface finish callout (e.g. "Ra 0.8 max" / "32 ulnch"). */
  surface_finish?: string | null;
  /** Title-block fields (part_no, drawing_no, revision, customer, etc.). */
  title_block?: Record<string, string>;
  /** Raw OCR text fallback — used when structured fields are empty. */
  raw_text?: string;
}

export type JoinTier = "exact" | "loose" | "none";

export interface AugmentInput {
  /** The .NC program text. Required + non-empty. */
  program_content: string;
  /** Optional path to the source file — kept for audit trail. */
  program_path?: string;
  /** Print extraction payload (null when no matching print or OCR failed). */
  print_extraction?: PrintExtraction | null;
  /** Join confidence from BlueprintProgramJoinEngine (0..1). */
  join_confidence?: number;
  /** Join tier from BlueprintProgramJoinEngine. */
  join_tier?: JoinTier;
  /**
   * Minimum confidence to include print_context in the pair.
   * Below this, the pair is either skipped or emitted program-only
   * depending on emit_program_only_below. Default: 0.5.
   */
  confidence_floor?: number;
  /**
   * When confidence is below confidence_floor:
   *  - true: emit pair as program-only (no print_context)
   *  - false: skip the pair entirely
   * Default: true (program-only fallback so we never lose a program).
   */
  emit_program_only_below?: boolean;
  /**
   * Max chars of print_context to emit (prevents OOM on huge raw_text).
   * Default: 4096.
   */
  max_print_context_chars?: number;
}

export interface AugmentedAlpacaPair {
  instruction: string;
  input: string;
  output: string;
  meta: AugmentedMeta;
}

export interface AugmentedMeta {
  program_path: string | null;
  has_print: boolean;
  join_confidence: number;
  confidence_tier: JoinTier;
  print_context_length: number;
  skipped: boolean;
  skip_reason: string | null;
  /** Which instruction family the pair belongs to (mirrors WEDMLoRADatasetBuilder). */
  instruction_family: string;
}

export interface BatchStats {
  total_input: number;
  total_emitted: number;
  total_skipped: number;
  by_tier: { exact: number; loose: number; none: number };
  with_print_context: number;
  program_only_fallback: number;
  reasons: Record<string, number>;
}

export interface AugmentBatchResult {
  augmented: AugmentedAlpacaPair[];
  stats: BatchStats;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIDENCE_FLOOR = 0.5;
const DEFAULT_MAX_PRINT_CONTEXT_CHARS = 4096;
const DEFAULT_INSTRUCTION_FAMILY = "print_to_program";

const INSTRUCTION_WITH_PRINT =
  "You are a wire-EDM CNC programming expert specializing in Mitsubishi FA-series machines. Given the dimensions, tolerances, GD&T, material, and surface finish extracted from a blueprint, write a complete .NC wire-EDM program using the canonical FA-10S dialect (E-code/H-offset cascade, M78/M80/M82/M84 startup, M85/M83/M81/M21/M58/M02 shutdown).";

const INSTRUCTION_PROGRAM_ONLY =
  "You are a wire-EDM CNC programming expert specializing in Mitsubishi FA-series machines. Reproduce the following wire-EDM .NC program in canonical FA-10S dialect. Preserve E-code/H-offset cascades, M-code groups, and the canonical startup/shutdown sequence.";

// ============================================================================
// ENGINE
// ============================================================================

class WEDMPrintProgramAlpacaAugmenterEngine {
  /**
   * Augment a single program with its (optional) matched blueprint extraction.
   * Returns the resulting Alpaca pair. If skipped, the returned pair has
   * meta.skipped = true and empty instruction/input/output (caller should
   * filter on meta.skipped before writing to JSONL).
   */
  augmentAlpacaPair(input: AugmentInput): AugmentedAlpacaPair {
    this.validateInput(input);

    const programContent = input.program_content;
    const programPath = input.program_path ?? null;
    const confidenceFloor = input.confidence_floor ?? DEFAULT_CONFIDENCE_FLOOR;
    const emitProgramOnlyBelow = input.emit_program_only_below ?? true;
    const maxPrintContextChars = input.max_print_context_chars ?? DEFAULT_MAX_PRINT_CONTEXT_CHARS;

    // Resolve the join confidence + tier (clamp to [0,1]).
    const rawConf = input.join_confidence ?? 0;
    const joinConfidence = Math.max(0, Math.min(1, rawConf));
    const joinTier: JoinTier = input.join_tier ?? this.inferTier(joinConfidence, input.print_extraction);

    const hasUsablePrint =
      input.print_extraction != null &&
      this.printExtractionHasContent(input.print_extraction) &&
      joinConfidence >= confidenceFloor;

    if (hasUsablePrint) {
      const printContext = this.formatPrintContext(input.print_extraction!, maxPrintContextChars);
      return {
        instruction: INSTRUCTION_WITH_PRINT,
        input: printContext,
        output: programContent,
        meta: {
          program_path: programPath,
          has_print: true,
          join_confidence: joinConfidence,
          confidence_tier: joinTier,
          print_context_length: printContext.length,
          skipped: false,
          skip_reason: null,
          instruction_family: DEFAULT_INSTRUCTION_FAMILY,
        },
      };
    }

    // No usable print — decide fallback policy.
    if (!emitProgramOnlyBelow) {
      const reason = input.print_extraction == null
        ? "no_print_attached"
        : (!this.printExtractionHasContent(input.print_extraction!) ? "print_ocr_empty" : "below_confidence_floor");
      return {
        instruction: "",
        input: "",
        output: "",
        meta: {
          program_path: programPath,
          has_print: false,
          join_confidence: joinConfidence,
          confidence_tier: joinTier,
          print_context_length: 0,
          skipped: true,
          skip_reason: reason,
          instruction_family: DEFAULT_INSTRUCTION_FAMILY,
        },
      };
    }

    // Program-only fallback.
    return {
      instruction: INSTRUCTION_PROGRAM_ONLY,
      input: "",
      output: programContent,
      meta: {
        program_path: programPath,
        has_print: false,
        join_confidence: joinConfidence,
        confidence_tier: joinTier,
        print_context_length: 0,
        skipped: false,
        skip_reason: null,
        instruction_family: DEFAULT_INSTRUCTION_FAMILY,
      },
    };
  }

  /**
   * Batch augment — convenience wrapper for whole-corpus runs.
   * Filters skipped pairs by default; caller pass include_skipped:true
   * to keep them for audit.
   */
  augmentBatch(
    inputs: AugmentInput[],
    options?: { include_skipped?: boolean },
  ): AugmentBatchResult {
    if (!Array.isArray(inputs)) {
      throw new Error("augmentBatch: inputs must be an array");
    }
    const includeSkipped = options?.include_skipped ?? false;
    const stats: BatchStats = {
      total_input: inputs.length,
      total_emitted: 0,
      total_skipped: 0,
      by_tier: { exact: 0, loose: 0, none: 0 },
      with_print_context: 0,
      program_only_fallback: 0,
      reasons: {},
    };
    const augmented: AugmentedAlpacaPair[] = [];

    for (const input of inputs) {
      const pair = this.augmentAlpacaPair(input);
      stats.by_tier[pair.meta.confidence_tier] += 1;
      if (pair.meta.skipped) {
        stats.total_skipped += 1;
        const reason = pair.meta.skip_reason ?? "unknown";
        stats.reasons[reason] = (stats.reasons[reason] ?? 0) + 1;
        if (includeSkipped) {
          augmented.push(pair);
        }
      } else {
        stats.total_emitted += 1;
        if (pair.meta.has_print) {
          stats.with_print_context += 1;
        } else {
          stats.program_only_fallback += 1;
        }
        augmented.push(pair);
      }
    }

    return { augmented, stats };
  }

  // ----------------------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------------------

  private validateInput(input: AugmentInput): void {
    if (input == null || typeof input !== "object") {
      throw new Error("augmentAlpacaPair: input must be an object");
    }
    if (typeof input.program_content !== "string") {
      throw new Error("augmentAlpacaPair: program_content must be a string");
    }
    if (input.program_content.trim().length === 0) {
      throw new Error("augmentAlpacaPair: program_content must be non-empty");
    }
    if (input.join_confidence !== undefined) {
      if (typeof input.join_confidence !== "number" || !Number.isFinite(input.join_confidence)) {
        throw new Error("augmentAlpacaPair: join_confidence must be a finite number");
      }
    }
    if (input.confidence_floor !== undefined) {
      if (typeof input.confidence_floor !== "number" || !Number.isFinite(input.confidence_floor)) {
        throw new Error("augmentAlpacaPair: confidence_floor must be a finite number");
      }
      if (input.confidence_floor < 0 || input.confidence_floor > 1) {
        throw new Error("augmentAlpacaPair: confidence_floor must be in [0,1]");
      }
    }
    if (input.max_print_context_chars !== undefined) {
      if (typeof input.max_print_context_chars !== "number" || !Number.isFinite(input.max_print_context_chars) || input.max_print_context_chars < 0) {
        throw new Error("augmentAlpacaPair: max_print_context_chars must be a non-negative finite number");
      }
    }
  }

  private printExtractionHasContent(p: PrintExtraction): boolean {
    if (p.dimensions && p.dimensions.length > 0) return true;
    if (p.gdt && p.gdt.length > 0) return true;
    if (typeof p.material === "string" && p.material.trim().length > 0) return true;
    if (typeof p.surface_finish === "string" && p.surface_finish.trim().length > 0) return true;
    if (p.title_block && Object.keys(p.title_block).length > 0) return true;
    if (typeof p.raw_text === "string" && p.raw_text.trim().length > 0) return true;
    return false;
  }

  private inferTier(confidence: number, extraction: PrintExtraction | null | undefined): JoinTier {
    if (extraction == null) return "none";
    if (confidence >= 0.85) return "exact";
    if (confidence >= 0.5) return "loose";
    return "none";
  }

  /**
   * Format a structured PrintExtraction as a deterministic, training-friendly
   * text block. Stable field ordering so the LLM sees consistent structure
   * across the whole corpus. Truncates raw_text last (keeps structured fields).
   */
  private formatPrintContext(p: PrintExtraction, maxChars: number): string {
    const sections: string[] = [];

    if (p.title_block && Object.keys(p.title_block).length > 0) {
      const lines = Object.entries(p.title_block)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `  ${k}: ${v}`);
      sections.push(`TITLE BLOCK:\n${lines.join("\n")}`);
    }

    if (typeof p.material === "string" && p.material.trim().length > 0) {
      sections.push(`MATERIAL: ${p.material.trim()}`);
    }

    if (typeof p.surface_finish === "string" && p.surface_finish.trim().length > 0) {
      sections.push(`SURFACE FINISH: ${p.surface_finish.trim()}`);
    }

    if (p.dimensions && p.dimensions.length > 0) {
      const lines = p.dimensions.map((d) => {
        const unit = d.unit ? ` ${d.unit}` : "";
        const tol = d.tolerance
          ? ` (+${d.tolerance.plus.toFixed(4)}/-${d.tolerance.minus.toFixed(4)})`
          : "";
        return `  ${d.label} = ${d.value}${unit}${tol}`;
      });
      sections.push(`DIMENSIONS:\n${lines.join("\n")}`);
    }

    if (p.gdt && p.gdt.length > 0) {
      sections.push(`GD&T:\n${p.gdt.map((g) => `  ${g}`).join("\n")}`);
    }

    const structured = sections.join("\n\n");
    if (structured.length >= maxChars) {
      return structured.slice(0, maxChars);
    }

    // Append raw_text only if there's budget left.
    if (typeof p.raw_text === "string" && p.raw_text.trim().length > 0) {
      const budget = maxChars - structured.length - 2; // 2 for separator
      if (budget > 0) {
        const trimmedRaw = p.raw_text.trim().slice(0, budget);
        return structured.length > 0
          ? `${structured}\n\n${trimmedRaw}`
          : trimmedRaw;
      }
    }
    return structured;
  }
}

export const wedmPrintProgramAlpacaAugmenterEngine = new WEDMPrintProgramAlpacaAugmenterEngine();
