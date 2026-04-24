/**
 * PPDialectTransferEngine — PP-AGI-MS0
 *
 * Transfers G-code knowledge from known controller dialects to unknown or
 * partially-known controllers using embedding similarity. When PRISM encounters
 * a new controller it hasn't seen before, this engine:
 *
 *   1. Computes the embedding for partial features the user provides
 *   2. Finds the nearest known controllers via cosine similarity
 *   3. Transfers G-code patterns (canned cycles, tool change, safe start, etc.)
 *      from the best match with confidence scores
 *   4. Flags gaps where transfer is uncertain
 *
 * This enables zero-shot post-processing for new controllers by leveraging
 * the behavioral similarity captured in the 48-dim embedding space.
 *
 * References: PP-AGI-MAXOUT-ROADMAP Phase 0 MS0
 * @module PPDialectTransferEngine
 */

import {
  ppControllerEmbeddingEngine,
  EMBEDDING_DIM,
} from "./PPControllerEmbeddingEngine.js";

import {
  controllerDialectEngine,
  type ControllerDialect,
} from "./ControllerDialectEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

/** Partial description of an unknown controller */
export interface PartialControllerSpec {
  /** Manufacturer name (e.g., "Doosan", "Toyoda") */
  manufacturer?: string;
  /** Base family hint (e.g., "fanuc", "siemens") */
  base_family?: "fanuc" | "siemens" | "heidenhain" | "mazak" | "okuma" | "other";
  /** Arc format if known */
  arc_format?: "ijk_incremental" | "ijk_absolute" | "r_word" | "both";
  /** Comment style if known */
  comment_style?: "parentheses" | "semicolon" | "heidenhain";
  /** Max simultaneous axes */
  max_axes?: number;
  /** Has 5-axis TCPC/RTCP */
  has_tcpc?: boolean;
  /** Has high-speed machining mode */
  has_hsc?: boolean;
  /** Has NURBS interpolation */
  has_nurbs?: boolean;
  /** Has macro B support */
  has_macro_b?: boolean;
  /** Is Swiss-type (guide bushing) */
  is_swiss?: boolean;
  /** Has sub-spindle */
  has_sub_spindle?: boolean;
  /** Sample G-code lines for pattern matching */
  sample_gcode?: string[];
}

/** A transferred G-code pattern with confidence */
export interface TransferredPattern {
  category: string;
  pattern: string | string[];
  confidence: number;
  source_controller: string;
  notes?: string;
}

/** Full transfer result */
export interface TransferResult {
  /** Best matching known controller */
  best_match: {
    controller_id: string;
    display_name: string;
    similarity: number;
  };
  /** Runner-up matches for validation */
  runner_ups: Array<{
    controller_id: string;
    similarity: number;
  }>;
  /** Transferred patterns from best match */
  transferred_patterns: TransferredPattern[];
  /** Features where transfer is uncertain */
  gaps: Array<{
    feature: string;
    reason: string;
  }>;
  /** Overall transfer confidence (0-1) */
  overall_confidence: number;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPDialectTransferEngine {
  /**
   * Transfer G-code knowledge from known controllers to an unknown controller.
   */
  transfer(spec: PartialControllerSpec): TransferResult {
    // Build a partial embedding from the spec
    const partialVec = this.specToPartialVector(spec);

    // Find nearest known controllers
    const all = ppControllerEmbeddingEngine.embedAll();
    const scored = all
      .map(e => ({
        controller_id: e.controller_id,
        display_name: e.display_name,
        similarity: ppControllerEmbeddingEngine.cosineSimilarity(partialVec, e.vector),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    const best = scored[0];
    const runnerUps = scored.slice(1, 4);

    // Get the source dialect for transfer
    const sourceDialect = controllerDialectEngine.getDialect(best.controller_id);

    // Transfer patterns
    const patterns = this.extractPatterns(sourceDialect, best.similarity);

    // Identify gaps
    const gaps = this.identifyGaps(spec, sourceDialect, best.similarity);

    // Overall confidence: similarity × pattern confidence average
    const avgPatternConf = patterns.length > 0
      ? patterns.reduce((s, p) => s + p.confidence, 0) / patterns.length
      : 0;
    const overallConf = round2(best.similarity * avgPatternConf);

    return {
      best_match: { controller_id: best.controller_id, display_name: best.display_name, similarity: round4(best.similarity) },
      runner_ups: runnerUps.map(r => ({ controller_id: r.controller_id, similarity: round4(r.similarity) })),
      transferred_patterns: patterns,
      gaps,
      overall_confidence: overallConf,
    };
  }

  /**
   * Quick check: can we confidently transfer to this controller spec?
   * Returns true if best match similarity > threshold.
   */
  canTransfer(spec: PartialControllerSpec, threshold = 0.7): boolean {
    const partialVec = this.specToPartialVector(spec);
    const all = ppControllerEmbeddingEngine.embedAll();
    const maxSim = all.reduce(
      (best, e) => Math.max(best, ppControllerEmbeddingEngine.cosineSimilarity(partialVec, e.vector)),
      0,
    );
    return maxSim >= threshold;
  }

  /**
   * Infer the base family from sample G-code lines.
   * Detects Fanuc-style (O, M98, G43.4), Siemens-style (DEF, CYCLE),
   * Heidenhain-style (BLK FORM, FN, TOOL CALL), etc.
   */
  inferFamily(sampleLines: string[]): { family: string; confidence: number; evidence: string[] } {
    const text = sampleLines.join("\n").toUpperCase();
    const evidence: string[] = [];
    const scores: Record<string, number> = {
      fanuc: 0, siemens: 0, heidenhain: 0, mazak: 0, okuma: 0, other: 0,
    };

    // Fanuc indicators
    if (text.includes("M98 P")) { scores.fanuc += 2; evidence.push("M98 subprogram call → Fanuc"); }
    if (text.includes("G43.4") || text.includes("G43.5")) { scores.fanuc += 2; evidence.push("G43.4/5 TCPC → Fanuc 5-axis"); }
    if (/^%/.test(text)) { scores.fanuc += 1; evidence.push("% wrapper → Fanuc/generic"); }
    if (/^O\d{4}/.test(text)) { scores.fanuc += 1; evidence.push("O-number → Fanuc"); }
    if (text.includes("G187")) { scores.fanuc -= 1; scores.other += 2; evidence.push("G187 → Haas NGC"); }

    // Siemens indicators
    if (text.includes("CYCLE81") || text.includes("CYCLE800")) { scores.siemens += 3; evidence.push("CYCLExx → Siemens"); }
    if (text.includes("TRANSMIT") || text.includes("TRAORI")) { scores.siemens += 3; evidence.push("TRAORI/TRANSMIT → Siemens 5-axis"); }
    if (text.includes("DEF REAL") || text.includes("DEF INT")) { scores.siemens += 2; evidence.push("DEF variable → Siemens"); }
    if (text.includes("$P_UIFR")) { scores.siemens += 2; evidence.push("$P_UIFR offset → Siemens"); }

    // Heidenhain indicators
    if (text.includes("BLK FORM") || text.includes("TOOL CALL")) { scores.heidenhain += 3; evidence.push("BLK FORM/TOOL CALL → Heidenhain"); }
    if (text.includes("CYCL DEF") || text.includes("FN ")) { scores.heidenhain += 2; evidence.push("CYCL DEF/FN → Heidenhain"); }
    if (text.includes("PLANE SPATIAL")) { scores.heidenhain += 3; evidence.push("PLANE SPATIAL → Heidenhain 5-axis"); }

    // Mazak indicators
    if (text.includes("G43.4") === false && text.includes("G68.2") === false && text.includes("SMOOTH")) {
      scores.mazak += 1;
    }

    // Okuma indicators
    if (text.includes("G8.1") || text.includes("NAVI")) { scores.okuma += 3; evidence.push("G8.1/NAVI → Okuma OSP"); }
    if (text.includes("IGFF") || text.includes("SUPER-NURBS")) { scores.okuma += 2; evidence.push("IGFF/SUPER-NURBS → Okuma"); }

    // Find winner
    let bestFamily = "fanuc";
    let bestScore = 0;
    for (const [family, score] of Object.entries(scores)) {
      if (score > bestScore) { bestFamily = family; bestScore = score; }
    }

    const totalScore = Object.values(scores).reduce((s, v) => s + Math.max(v, 0), 0);
    const confidence = totalScore > 0 ? round2(bestScore / totalScore) : 0.2;

    return { family: bestFamily, confidence, evidence };
  }

  // ── Private ──────────────────────────────────────────────────────────

  /** Convert a partial spec to a 48-dim vector (unknown dims = 0.5 neutral) */
  private specToPartialVector(spec: PartialControllerSpec): number[] {
    const v = new Array<number>(EMBEDDING_DIM).fill(0.5); // neutral default

    // Base family
    if (spec.base_family) {
      v.fill(0, 0, 6);
      const idx = { fanuc: 0, siemens: 1, heidenhain: 2, mazak: 3, okuma: 4, other: 5 }[spec.base_family];
      v[idx ?? 5] = 1;
    }

    // Infer family from G-code samples
    if (!spec.base_family && spec.sample_gcode?.length) {
      const inferred = this.inferFamily(spec.sample_gcode);
      v.fill(0, 0, 6);
      const idx = { fanuc: 0, siemens: 1, heidenhain: 2, mazak: 3, okuma: 4, other: 5 }[inferred.family];
      v[idx ?? 5] = inferred.confidence;
    }

    // Arc format
    if (spec.arc_format) {
      v.fill(0, 6, 10);
      const idx = { ijk_incremental: 0, ijk_absolute: 1, r_word: 2, both: 3 }[spec.arc_format];
      v[6 + (idx ?? 0)] = 1;
    }

    // Comment style
    if (spec.comment_style) {
      v.fill(0, 10, 13);
      const idx = { parentheses: 0, semicolon: 1, heidenhain: 2 }[spec.comment_style];
      v[10 + (idx ?? 0)] = 1;
    }

    // Known binary features
    if (spec.has_hsc !== undefined) v[17] = spec.has_hsc ? 1 : 0;
    if (spec.has_tcpc !== undefined) v[19] = spec.has_tcpc ? 1 : 0;
    if (spec.has_nurbs !== undefined) v[22] = spec.has_nurbs ? 1 : 0;
    if (spec.has_macro_b !== undefined) v[23] = spec.has_macro_b ? 1 : 0;
    if (spec.has_sub_spindle !== undefined) v[24] = spec.has_sub_spindle ? 1 : 0;
    if (spec.is_swiss !== undefined) v[25] = spec.is_swiss ? 1 : 0;

    // Known numeric features
    if (spec.max_axes !== undefined) v[31] = Math.min(spec.max_axes / 5, 1);

    return v;
  }

  /** Extract transferable patterns from a source dialect */
  private extractPatterns(dialect: ControllerDialect, similarity: number): TransferredPattern[] {
    const patterns: TransferredPattern[] = [];
    const baseConf = Math.min(similarity, 0.95); // cap at 0.95

    // Safe start block
    patterns.push({
      category: "safe_start",
      pattern: dialect.safe_start,
      confidence: round2(baseConf * 0.95),
      source_controller: dialect.id,
    });

    // Program start/end
    patterns.push({
      category: "program_start",
      pattern: dialect.program_start,
      confidence: round2(baseConf * 0.9),
      source_controller: dialect.id,
    });
    patterns.push({
      category: "program_end",
      pattern: dialect.program_end,
      confidence: round2(baseConf * 0.9),
      source_controller: dialect.id,
    });

    // Tool change sequence
    patterns.push({
      category: "tool_change",
      pattern: dialect.tool_change_sequence,
      confidence: round2(baseConf * 0.85),
      source_controller: dialect.id,
      notes: "Verify ATC type matches target machine",
    });

    // Canned cycles
    const cycleEntries = Object.entries(dialect.canned_cycles).filter(([_, v]) => v);
    if (cycleEntries.length > 0) {
      patterns.push({
        category: "canned_cycles",
        pattern: cycleEntries.map(([k, v]) => `${k}: ${v}`),
        confidence: round2(baseConf * 0.8),
        source_controller: dialect.id,
        notes: "Cycle syntax is highly controller-specific — verify each cycle",
      });
    }

    // Spindle/coolant M-codes (usually standard)
    patterns.push({
      category: "spindle_codes",
      pattern: `CW=${dialect.spindle_cw} CCW=${dialect.spindle_ccw} STOP=${dialect.spindle_stop}`,
      confidence: round2(baseConf * 0.95),
      source_controller: dialect.id,
    });
    patterns.push({
      category: "coolant_codes",
      pattern: `FLOOD=${dialect.coolant_flood} MIST=${dialect.coolant_mist} OFF=${dialect.coolant_off}`,
      confidence: round2(baseConf * 0.95),
      source_controller: dialect.id,
    });

    // Work offsets
    patterns.push({
      category: "work_offsets",
      pattern: `base=${dialect.work_offsets.base} extended=${dialect.work_offsets.extended ?? "none"}`,
      confidence: round2(baseConf * 0.85),
      source_controller: dialect.id,
    });

    // Comment formatting
    patterns.push({
      category: "comment_format",
      pattern: `${dialect.comment_open}text${dialect.comment_close}`,
      confidence: round2(baseConf * 0.9),
      source_controller: dialect.id,
    });

    // HSC/smoothing features (if available)
    if (dialect.features.hsc_mode) {
      patterns.push({
        category: "hsc_mode",
        pattern: `ON=${dialect.features.hsc_mode.on} OFF=${dialect.features.hsc_mode.off}`,
        confidence: round2(baseConf * 0.7),
        source_controller: dialect.id,
        notes: "HSC codes vary significantly between firmware versions",
      });
    }

    // TCPC (if available)
    if (dialect.features.tcpc) {
      patterns.push({
        category: "tcpc_5axis",
        pattern: `ON=${dialect.features.tcpc.on} OFF=${dialect.features.tcpc.off}`,
        confidence: round2(baseConf * 0.7),
        source_controller: dialect.id,
        notes: "TCPC/RTCP is machine-specific — verify kinematics",
      });
    }

    return patterns;
  }

  /** Identify gaps where transfer is uncertain */
  private identifyGaps(
    spec: PartialControllerSpec,
    source: ControllerDialect,
    similarity: number,
  ): TransferResult["gaps"] {
    const gaps: TransferResult["gaps"] = [];

    if (similarity < 0.8) {
      gaps.push({
        feature: "overall_similarity",
        reason: `Best match similarity ${round2(similarity)} < 0.8 — transfer may be unreliable`,
      });
    }

    if (!spec.base_family && !spec.sample_gcode?.length) {
      gaps.push({
        feature: "base_family",
        reason: "No family or sample G-code provided — match based on capabilities only",
      });
    }

    if (spec.has_tcpc && !source.features.tcpc) {
      gaps.push({
        feature: "tcpc",
        reason: "Target has TCPC but best match does not — 5-axis codes must be manually specified",
      });
    }

    if (spec.is_swiss && !source.features.guide_bushing) {
      gaps.push({
        feature: "swiss_type",
        reason: "Target is Swiss-type but best match is not — guide bushing logic unavailable",
      });
    }

    if (spec.max_axes && spec.max_axes > (source.features.max_simultaneous_axes ?? 3)) {
      gaps.push({
        feature: "axis_count",
        reason: `Target has ${spec.max_axes} axes but best match has ${source.features.max_simultaneous_axes ?? 3}`,
      });
    }

    return gaps;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

// ── Singleton ─────────────────────────────────────────────────────────

export const ppDialectTransferEngine = new PPDialectTransferEngine();
