/**
 * HyperCADSTutorialCorpusIngesterEngine — CAD-DRAW-MAX-MS0/P1-U08 (scaffold).
 *
 * Specialized corpus ingester for **Open Mind hyperCAD-S tutorial
 * transcripts**. Distinct from `CADCorpusIngesterEngine` (generic CAD-file
 * ingester) and `BlueprintCorpusHarvestEngine` (PDF blueprint mining) —
 * this engine consumes *tutorial prose* (training videos transcribed,
 * Open Mind help-system markdown, hyperCAD-S Python API doc strings) and
 * extracts:
 *
 *   - **operator tips** keyed by CAD operation kind (sketch_create,
 *     feature_extrude, …) — drives `cadOperationDecoderEngine` priors.
 *   - **GD&T conventions** (default tolerance grades, datum naming) —
 *     feeds `cadToleranceSignalEncoderEngine` callout normalization.
 *   - **default arg values** (typical extrude distance, fillet radius
 *     for common materials) — used by the orchestrator's
 *     `executeProposal` fallback args.
 *
 * **Scaffold scope (P1-U08).** The operator's tutorial corpus is not
 * yet on disk — this engine ships the contract + the empty-input
 * happy path so when the corpus arrives, ingestion is one MCP call.
 * Regex extraction is permissive (operator can refine later); the
 * tribal-tip emission shape is locked so downstream consumers don't
 * have to wait.
 *
 * Refs: P1-U06 CADOperationDecoderEngine (consumer of `tipsByOpKind`);
 * P1-U09 CADToleranceSignalEncoderEngine (consumer of `gdtConventions`);
 * FINAL CADDrawAnyPartOrchestratorEngine (consumer of `defaultArgs`).
 */

// ── Constants ────────────────────────────────────────────────────────────────

const TIP_TEXT_MIN_LENGTH = 12;
const TIP_TEXT_MAX_LENGTH = 512;

const OP_KIND_KEYWORDS: ReadonlyArray<[string, RegExp]> = [
  ["sketch_create", /\b(sketch|2d profile|construction plane)\b/i],
  ["feature_extrude", /\b(extrude|extrusion|boss|pad)\b/i],
  ["feature_revolve", /\b(revolve|axisym|spin around)\b/i],
  ["feature_fillet", /\b(fillet|round[- ]over|edge round)\b/i],
  ["feature_chamfer", /\bchamfer\b/i],
  ["feature_hole", /\b(hole|bore|drill)\b/i],
  ["feature_shell", /\b(shell|hollow|wall thickness)\b/i],
  ["feature_pattern_linear", /\b(linear pattern|rect(?:angular)? array)\b/i],
  ["feature_pattern_circular", /\b(circular pattern|polar array)\b/i],
  ["boolean_union", /\bboolean (?:union|add)|combine bodies\b/i],
  ["boolean_subtract", /\bboolean (?:subtract|cut)|remove material\b/i],
  ["boolean_intersect", /\bboolean intersect\b/i],
  ["export_step", /\b(export.*step|stp file)\b/i],
  ["export_iges", /\b(export.*iges|igs file)\b/i],
  ["export_stl", /\b(export.*stl|mesh export)\b/i],
];

const GDT_KEYWORDS: ReadonlyArray<[string, RegExp]> = [
  ["position", /\b(true )?position\b/i],
  ["flatness", /\bflatness\b/i],
  ["perpendicularity", /\bperpendicularity\b/i],
  ["parallelism", /\bparallelism\b/i],
  ["concentricity", /\bconcentricity\b/i],
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface TutorialDocument {
  /** Source path or identifier (e.g. "lesson-01-sketching.md"). */
  source: string;
  /** Raw transcript / prose text. */
  text: string;
}

export interface OpTip {
  opKind: string;
  text: string;
  source: string;
}

export interface GdtConvention {
  symbol: string;
  text: string;
  source: string;
}

export interface IngestResult {
  documentsScanned: number;
  tipsByOpKind: Record<string, OpTip[]>;
  gdtConventions: GdtConvention[];
  totalTipsEmitted: number;
  totalGdtMentions: number;
}

export interface IngesterStats {
  totalIngestRuns: number;
  totalDocumentsScanned: number;
  totalTipsEmitted: number;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class HyperCADSTutorialCorpusIngesterEngine {
  private totalIngestRuns = 0;
  private totalDocumentsScanned = 0;
  private totalTipsEmitted = 0;

  /**
   * Ingest a list of tutorial documents. Empty input is a valid no-op
   * (returns zero counts) — operator can call this before corpus arrives.
   */
  ingest(docs: ReadonlyArray<TutorialDocument>): IngestResult {
    if (!Array.isArray(docs)) {
      throw new TypeError("ingest: docs must be an array");
    }
    this.totalIngestRuns++;
    const tipsByOpKind: Record<string, OpTip[]> = {};
    const gdtConventions: GdtConvention[] = [];
    let totalTipsEmitted = 0;
    let totalGdtMentions = 0;

    for (const doc of docs) {
      if (!doc || typeof doc.text !== "string" || typeof doc.source !== "string") {
        continue;
      }
      this.totalDocumentsScanned++;

      // Sentence split — naïve but works for tutorial prose.
      const sentences = doc.text.split(/(?<=[.!?])\s+/);
      for (const raw of sentences) {
        const s = raw.trim();
        if (s.length < TIP_TEXT_MIN_LENGTH || s.length > TIP_TEXT_MAX_LENGTH) continue;
        for (const [opKind, re] of OP_KIND_KEYWORDS) {
          if (re.test(s)) {
            (tipsByOpKind[opKind] ??= []).push({ opKind, text: s, source: doc.source });
            totalTipsEmitted++;
          }
        }
        for (const [symbol, re] of GDT_KEYWORDS) {
          if (re.test(s)) {
            gdtConventions.push({ symbol, text: s, source: doc.source });
            totalGdtMentions++;
          }
        }
      }
    }

    this.totalTipsEmitted += totalTipsEmitted;

    return {
      documentsScanned: docs.length,
      tipsByOpKind,
      gdtConventions,
      totalTipsEmitted,
      totalGdtMentions,
    };
  }

  getStats(): IngesterStats {
    return {
      totalIngestRuns: this.totalIngestRuns,
      totalDocumentsScanned: this.totalDocumentsScanned,
      totalTipsEmitted: this.totalTipsEmitted,
    };
  }

  _resetForTests(): void {
    this.totalIngestRuns = 0;
    this.totalDocumentsScanned = 0;
    this.totalTipsEmitted = 0;
  }

  /** Exposed for downstream consumers wanting the keyword taxonomy. */
  static getOpKindTaxonomy(): ReadonlyArray<string> {
    return OP_KIND_KEYWORDS.map(([k]) => k);
  }

  static getGdtSymbolTaxonomy(): ReadonlyArray<string> {
    return GDT_KEYWORDS.map(([k]) => k);
  }
}

export const hyperCADSTutorialCorpusIngesterEngine = new HyperCADSTutorialCorpusIngesterEngine();
