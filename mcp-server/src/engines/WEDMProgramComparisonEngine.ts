/**
 * WEDMProgramComparisonEngine — WEDM-CAL-MS4 / U-CAL18
 *
 * Parse a reference (real shop) NC program and a PRISM-generated NC program,
 * then emit a per-parameter deviation report + overall match score.
 *
 * This is the calibration gate: if the comparison says "generated matches
 * reference within tolerance," the pipeline is production-ready for that
 * part family. If not, the deviations flag which sub-engine is drifting
 * (pass count → multi-pass planner; feed rates → speed/feed orchestrator;
 * offset declarations → H-register emitter; E-codes → family selector).
 *
 * Generic G-code diff already exists in ProgramCompareEngine. This engine
 * differs because it compares WEDM-specific semantics: pass counts,
 * per-pass offsets (H-register), feed-rate cascade, E-code family, taper
 * flag, adaptive control flag, safety block — none of which survive a
 * line-by-line diff.
 *
 * Algorithm — weighted parameter match:
 *   score = Σ wᵢ · matchᵢ(referenceᵢ, generatedᵢ)        [0, 1]
 *
 * matchᵢ is in [0,1]:
 *   - categorical (dialect, has_taper)  → 1.0 if equal else 0.0
 *   - numeric (pass count, offsets)     → 1 − clip(|r−g|/tol, 0, 1)
 *
 * Weights are calibrated so that the operator-critical parameters
 * (pass count + offset cascade) dominate — a program that nails passes
 * and offsets but misses feed by 5% still scores ≥ 0.9.
 *
 * References:
 *   - ProgramCompareEngine (generic G-code diff — does not model WEDM passes)
 *   - WireEDMProgramParserEngine (parses both inputs)
 *   - WEDMCalibrationReportEngine (shop-vs-published; different axis)
 */

import { wireEDMProgramParserEngine, type WireEDMProgram } from "./WireEDMProgramParserEngine.js";
import { log } from "../utils/Logger.js";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ParamDeviation {
  parameter: string;
  reference: string | number | boolean | null;
  generated: string | number | boolean | null;
  unit?: string;
  match: number;             // [0,1]
  deviation_pct?: number;    // numeric params only
  severity: "match" | "minor" | "major" | "critical";
  note?: string;
}

export interface WEDMComparisonReport {
  reference_filename: string;
  generated_filename: string;
  overall_match: number;     // [0,1] weighted
  overall_grade: "excellent" | "good" | "acceptable" | "poor" | "mismatch";
  deviations: ParamDeviation[];
  summary: string;
  /** Production-ready gate: true iff overall_match ≥ 0.85 AND no `critical` deviations. */
  production_ready: boolean;
}

export interface ComparisonTolerances {
  /** Pass count absolute tolerance (default 1). */
  pass_count_tol: number;
  /** Per-pass offset relative tolerance in fraction (default 0.30 = ±30%). */
  offset_rel_tol: number;
  /** Per-pass feed-rate relative tolerance (default 0.40 = ±40%). */
  feed_rel_tol: number;
  /** Contour move count relative tolerance (default 0.50 = ±50%). */
  contour_rel_tol: number;
}

const DEFAULT_TOLERANCES: ComparisonTolerances = {
  pass_count_tol: 1,
  offset_rel_tol: 0.30,
  feed_rel_tol: 0.40,
  contour_rel_tol: 0.50,
};

// Weighted scoring — operator-critical parameters dominate
const WEIGHTS = {
  dialect: 0.10,
  pass_count: 0.20,
  offset_cascade: 0.20,
  feed_cascade: 0.15,
  e_code_family: 0.10,
  has_taper: 0.05,
  has_adaptive_control: 0.05,
  safety_block: 0.10,
  contour_moves: 0.05,
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function gradeFromScore(score: number): WEDMComparisonReport["overall_grade"] {
  if (score >= 0.95) return "excellent";
  if (score >= 0.85) return "good";
  if (score >= 0.70) return "acceptable";
  if (score >= 0.50) return "poor";
  return "mismatch";
}

function severityFromMatch(match: number): ParamDeviation["severity"] {
  if (match >= 0.95) return "match";
  if (match >= 0.80) return "minor";
  if (match >= 0.50) return "major";
  return "critical";
}

function numericMatch(ref: number, gen: number, relTol: number): number {
  if (!Number.isFinite(ref) || !Number.isFinite(gen)) return 0;
  if (ref === 0 && gen === 0) return 1;
  const base = Math.max(Math.abs(ref), Math.abs(gen), 1e-9);
  const rel = Math.abs(ref - gen) / base;
  return Math.max(0, 1 - rel / relTol);
}

function booleanMatch(ref: boolean, gen: boolean): number {
  return ref === gen ? 1 : 0;
}

function categoricalMatch<T>(ref: T, gen: T): number {
  return ref === gen ? 1 : 0;
}

function eCodeFamily(code: string | null): string | null {
  if (!code) return null;
  // Pull the hundreds-thousands prefix: E1221 → "E122", E2825 → "E282", E0100 → "E010"
  const m = /^E(\d{3})/.exec(code);
  return m ? `E${m[1]}` : code;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class WEDMProgramComparisonEngine {
  compare(
    reference_nc: string,
    generated_nc: string,
    options: {
      reference_filename?: string;
      generated_filename?: string;
      tolerances?: Partial<ComparisonTolerances>;
    } = {},
  ): WEDMComparisonReport {
    const tol: ComparisonTolerances = { ...DEFAULT_TOLERANCES, ...(options.tolerances ?? {}) };
    const refName = options.reference_filename ?? "reference.nc";
    const genName = options.generated_filename ?? "generated.nc";

    const ref = wireEDMProgramParserEngine.parse(reference_nc, refName);
    const gen = wireEDMProgramParserEngine.parse(generated_nc, genName);

    const deviations: ParamDeviation[] = [];

    // 1. Dialect
    deviations.push(this.cmpDialect(ref, gen));

    // 2. Pass count
    deviations.push(this.cmpPassCount(ref, gen, tol));

    // 3. Offset cascade (per-register)
    deviations.push(this.cmpOffsetCascade(ref, gen, tol));

    // 4. Feed-rate cascade
    deviations.push(this.cmpFeedCascade(ref, gen, tol));

    // 5. E-code family
    deviations.push(this.cmpECodeFamily(ref, gen));

    // 6. Has taper
    deviations.push(this.cmpFlag("has_taper", ref.hasTaper, gen.hasTaper));

    // 7. Has adaptive control
    deviations.push(this.cmpFlag("has_adaptive_control", ref.hasAdaptiveControl, gen.hasAdaptiveControl));

    // 8. Safety block completeness
    deviations.push(this.cmpSafetyBlock(ref, gen));

    // 9. Contour move count
    deviations.push(this.cmpContourMoves(ref, gen, tol));

    // Weighted score
    const overall_match = this.weightedScore(deviations);
    const overall_grade = gradeFromScore(overall_match);

    const criticals = deviations.filter(d => d.severity === "critical");
    const production_ready = overall_match >= 0.85 && criticals.length === 0;

    const summary =
      `${refName} vs ${genName}: match=${(overall_match * 100).toFixed(1)}% (${overall_grade}). ` +
      `${criticals.length} critical, ${deviations.filter(d => d.severity === "major").length} major, ` +
      `${deviations.filter(d => d.severity === "minor").length} minor, ` +
      `${deviations.filter(d => d.severity === "match").length} match.`;

    log.info(`[WEDMCompare] ${summary}`);

    return {
      reference_filename: refName,
      generated_filename: genName,
      overall_match,
      overall_grade,
      deviations,
      summary,
      production_ready,
    };
  }

  // ─── Per-parameter comparators ───────────────────────────────────────

  private cmpDialect(ref: WireEDMProgram, gen: WireEDMProgram): ParamDeviation {
    const match = categoricalMatch(ref.dialect, gen.dialect);
    return {
      parameter: "dialect",
      reference: ref.dialect,
      generated: gen.dialect,
      match,
      severity: severityFromMatch(match),
      note: match < 1 ? `expected ${ref.dialect}, got ${gen.dialect}` : undefined,
    };
  }

  private cmpPassCount(ref: WireEDMProgram, gen: WireEDMProgram, tol: ComparisonTolerances): ParamDeviation {
    const r = ref.passes.length;
    const g = gen.passes.length;
    const diff = Math.abs(r - g);
    const match = diff <= tol.pass_count_tol ? 1 - (diff / (tol.pass_count_tol + 1)) * 0.5 : Math.max(0, 1 - diff / Math.max(r, 1));
    return {
      parameter: "pass_count",
      reference: r,
      generated: g,
      match,
      deviation_pct: r > 0 ? ((g - r) / r) * 100 : 0,
      severity: severityFromMatch(match),
      note: diff > tol.pass_count_tol ? `difference ${diff} exceeds tolerance ${tol.pass_count_tol}` : undefined,
    };
  }

  private cmpOffsetCascade(ref: WireEDMProgram, gen: WireEDMProgram, tol: ComparisonTolerances): ParamDeviation {
    const refKeys = Object.keys(ref.offset_declarations).map(Number).filter(k => ref.offset_declarations[k] > 0);
    const genKeys = Object.keys(gen.offset_declarations).map(Number).filter(k => gen.offset_declarations[k] > 0);
    if (refKeys.length === 0 && genKeys.length === 0) {
      return { parameter: "offset_cascade", reference: "—", generated: "—", match: 1, severity: "match" };
    }
    if (refKeys.length === 0 || genKeys.length === 0) {
      return {
        parameter: "offset_cascade", reference: refKeys.length, generated: genKeys.length,
        match: 0, severity: "critical",
        note: `one side declares no offsets (ref=${refKeys.length}, gen=${genKeys.length})`,
      };
    }
    // Compare by position in sorted cascade, not by H-register number (engines may
    // emit H10..H14 whereas the shop uses H1..H5).
    const refSorted = refKeys.sort((a, b) => a - b).map(k => ref.offset_declarations[k]);
    const genSorted = genKeys.sort((a, b) => a - b).map(k => gen.offset_declarations[k]);
    const n = Math.min(refSorted.length, genSorted.length);
    let sum = 0;
    const deltas: number[] = [];
    for (let i = 0; i < n; i++) {
      const m = numericMatch(refSorted[i], genSorted[i], tol.offset_rel_tol);
      sum += m;
      deltas.push(((genSorted[i] - refSorted[i]) / Math.max(refSorted[i], 1e-9)) * 100);
    }
    const lenPenalty = Math.abs(refSorted.length - genSorted.length) * 0.15;
    const match = Math.max(0, (sum / n) - lenPenalty);
    const avgDev = deltas.reduce((a, b) => a + b, 0) / (deltas.length || 1);
    return {
      parameter: "offset_cascade",
      reference: `[${refSorted.map(v => v.toFixed(5)).join(", ")}]`,
      generated: `[${genSorted.map(v => v.toFixed(5)).join(", ")}]`,
      unit: ref.dialect === "mitsubishi" ? "in" : "mm",
      match,
      deviation_pct: avgDev,
      severity: severityFromMatch(match),
    };
  }

  private cmpFeedCascade(ref: WireEDMProgram, gen: WireEDMProgram, tol: ComparisonTolerances): ParamDeviation {
    const refFeeds = ref.passes.map(p => p.feed_rate).filter((f): f is number => f !== null && f > 0);
    const genFeeds = gen.passes.map(p => p.feed_rate).filter((f): f is number => f !== null && f > 0);
    if (refFeeds.length === 0 && genFeeds.length === 0) {
      return { parameter: "feed_cascade", reference: "—", generated: "—", match: 1, severity: "match" };
    }
    if (refFeeds.length === 0 || genFeeds.length === 0) {
      return {
        parameter: "feed_cascade", reference: refFeeds.length, generated: genFeeds.length,
        match: 0.3, severity: "major",
        note: `one side has no feed rates (ref=${refFeeds.length}, gen=${genFeeds.length})`,
      };
    }
    const n = Math.min(refFeeds.length, genFeeds.length);
    let sum = 0;
    const deltas: number[] = [];
    for (let i = 0; i < n; i++) {
      sum += numericMatch(refFeeds[i], genFeeds[i], tol.feed_rel_tol);
      deltas.push(((genFeeds[i] - refFeeds[i]) / Math.max(refFeeds[i], 1e-9)) * 100);
    }
    const match = sum / n;
    const avgDev = deltas.reduce((a, b) => a + b, 0) / (deltas.length || 1);
    return {
      parameter: "feed_cascade",
      reference: `[${refFeeds.map(v => v.toFixed(3)).join(", ")}]`,
      generated: `[${genFeeds.map(v => v.toFixed(3)).join(", ")}]`,
      match,
      deviation_pct: avgDev,
      severity: severityFromMatch(match),
    };
  }

  private cmpECodeFamily(ref: WireEDMProgram, gen: WireEDMProgram): ParamDeviation {
    const refFams = new Set(ref.passes.map(p => eCodeFamily(p.condition_code)).filter(Boolean));
    const genFams = new Set(gen.passes.map(p => eCodeFamily(p.condition_code)).filter(Boolean));
    if (refFams.size === 0 && genFams.size === 0) {
      return { parameter: "e_code_family", reference: "—", generated: "—", match: 1, severity: "match" };
    }
    if (refFams.size === 0 || genFams.size === 0) {
      return {
        parameter: "e_code_family",
        reference: [...refFams].join("|") || "—",
        generated: [...genFams].join("|") || "—",
        match: 0.5, severity: "major",
        note: "one side omits E-codes",
      };
    }
    const intersection = [...refFams].filter(f => genFams.has(f));
    const match = intersection.length / Math.max(refFams.size, genFams.size);
    return {
      parameter: "e_code_family",
      reference: [...refFams].sort().join("|"),
      generated: [...genFams].sort().join("|"),
      match,
      severity: severityFromMatch(match),
    };
  }

  private cmpFlag(name: string, ref: boolean, gen: boolean): ParamDeviation {
    const match = booleanMatch(ref, gen);
    return {
      parameter: name,
      reference: ref,
      generated: gen,
      match,
      severity: severityFromMatch(match),
    };
  }

  private cmpSafetyBlock(ref: WireEDMProgram, gen: WireEDMProgram): ParamDeviation {
    // Count safety terminators present in each; higher is more complete
    const refFlags = [ref.safety.has_program_end, ref.safety.has_wire_stop, ref.safety.has_offset_cancel, ref.safety.has_taper_cancel, ref.safety.has_flush_off];
    const genFlags = [gen.safety.has_program_end, gen.safety.has_wire_stop, gen.safety.has_offset_cancel, gen.safety.has_taper_cancel, gen.safety.has_flush_off];
    const refCount = refFlags.filter(Boolean).length;
    const genCount = genFlags.filter(Boolean).length;
    // Generated must have at least as many safety terminators as reference; no penalty for more
    const match = genCount >= refCount ? 1.0 : genCount / Math.max(refCount, 1);
    return {
      parameter: "safety_block",
      reference: `${refCount}/5 terminators`,
      generated: `${genCount}/5 terminators`,
      match,
      severity: severityFromMatch(match),
      note: genCount < refCount ? `generated missing ${refCount - genCount} safety terminator(s)` : undefined,
    };
  }

  private cmpContourMoves(ref: WireEDMProgram, gen: WireEDMProgram, tol: ComparisonTolerances): ParamDeviation {
    const r = ref.contour_moves.length;
    const g = gen.contour_moves.length;
    const match = numericMatch(r, g, tol.contour_rel_tol);
    return {
      parameter: "contour_moves",
      reference: r,
      generated: g,
      match,
      deviation_pct: r > 0 ? ((g - r) / r) * 100 : 0,
      severity: severityFromMatch(match),
    };
  }

  private weightedScore(deviations: ParamDeviation[]): number {
    const byName = new Map(deviations.map(d => [d.parameter, d.match]));
    let sum = 0;
    let totalW = 0;
    for (const [name, weight] of Object.entries(WEIGHTS)) {
      const m = byName.get(name);
      if (m === undefined) continue;
      sum += weight * m;
      totalW += weight;
    }
    return totalW > 0 ? sum / totalW : 0;
  }
}

export const wedmProgramComparisonEngine = new WEDMProgramComparisonEngine();
