/**
 * CADReverseTemplateEngine — CAD-REVERSE-ENGINEER-MS0/U1
 *
 * The **inverse** of CADDrawAnyPartOrchestratorEngine. The orchestrator
 * goes intent → ops → geometry; this engine goes parsed-feature-tree →
 * parameterized template → category + canonical name. Feed the operator's
 * CAD corpus through `cad_step_parse_file` + `cad_feature_tree_extract`
 * to obtain a `CADOperation[]`, hand that array here, and get back a
 * `ReverseEngineeredTemplate` that:
 *
 *   1. **categorizes** the part from its op-kind histogram (turned_part,
 *      housing, flange, bracket, drilled_block, assembly_body,
 *      extruded_profile, prismatic_part) — most-specific rule wins.
 *   2. **names** it deterministically: `<category>_<dim>mm_<n>op_<hash4>`
 *      — the hash4 disambiguates same-size same-category parts so the
 *      whole corpus gets unique, sortable, human-readable names.
 *   3. **parameterizes** every finite numeric arg into a named param
 *      (`<argKey>_op<index>`) so the template is re-usable: change a
 *      param, redraw a variant.
 *   4. is **round-trip lossless** — `template.opTemplate` IS a valid
 *      `CADOperation[]`; feeding it straight back into
 *      `cad_draw_any_part` regenerates the exact part. That round trip
 *      is the "prove you can draw each part reverse-engineered from
 *      scratch" proof (in simulation; the live hyperCAD-S drive is the
 *      operator's seat action).
 *
 * Pure: no I/O, no host calls. The corpus batch-driver (a later unit)
 * owns the file walk + parser invocation.
 *
 * Refs: ICADCodeGenerator (CADOperation / CAD_OPERATION_KINDS contract);
 * CADDrawAnyPartOrchestratorEngine (FINAL — consumes opTemplate);
 * CADOperationDecoderEngine (P1-U06 — categorization mirrors its
 * INTENT_RULES in reverse).
 */

import { CAD_OPERATION_KINDS, type CADOperation } from "../interfaces/ICADCodeGenerator.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** Knuth multiplicative hash constant — shared with NN01 / Arg encoders. */
const KNUTH_MULT = 2_654_435_761;
const HASH_MOD = 0x7fff_ffff;

/** Arg keys that count toward the part's "dominant dimension". */
const DIMENSION_ARG_KEYS = new Set([
  "distance", "radius", "diameter", "depth", "length", "width", "height", "spacing",
]);

const VALID_OP_KINDS = new Set<string>(CAD_OPERATION_KINDS as readonly string[]);

// ── Types ────────────────────────────────────────────────────────────────────

export type PartCategory =
  | "turned_part"
  | "housing"
  | "flange"
  | "bracket"
  | "drilled_block"
  | "assembly_body"
  | "extruded_profile"
  | "prismatic_part"
  | "empty";

export interface TemplateParam {
  /** Unique param name: `<argKey>_op<index>`. */
  name: string;
  /** Concrete numeric value extracted from the source op. */
  value: number;
  /** Index of the op this param came from. */
  opIndex: number;
  /** Original arg key on that op. */
  argKey: string;
}

export interface ReverseEngineeredTemplate {
  /** Deterministic canonical name. */
  name: string;
  /** Inferred part category. */
  category: PartCategory;
  /** Category-match confidence in [0,1]. */
  confidence: number;
  /** Extracted named numeric params (re-parameterization surface). */
  params: TemplateParam[];
  /** The op sequence — round-trip lossless; feeds cad_draw_any_part. */
  opTemplate: CADOperation[];
  /** Op-kind histogram used for categorization. */
  opKindHistogram: Record<string, number>;
  /** Count of malformed ops dropped from the input. */
  skippedOps: number;
}

export interface ReverseTemplateStats {
  totalReverseEngineered: number;
  totalParamsExtracted: number;
  categoryCounts: Record<string, number>;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADReverseTemplateEngine {
  private totalReverseEngineered = 0;
  private totalParamsExtracted = 0;
  private categoryCounts: Record<string, number> = {};

  /**
   * Reverse-engineer a parsed feature tree into a categorized,
   * named, parameterized, round-trip-lossless template.
   */
  reverseEngineer(ops: ReadonlyArray<CADOperation>): ReverseEngineeredTemplate {
    if (!Array.isArray(ops)) {
      throw new TypeError("reverseEngineer: ops must be an array of CADOperation");
    }
    this.totalReverseEngineered++;

    // Filter malformed ops (must be objects with a string kind).
    // Shallow-clone each op so a caller mutating the returned opTemplate
    // cannot corrupt the input array (round-trip immutability guarantee).
    const opTemplate: CADOperation[] = [];
    let skippedOps = 0;
    for (const op of ops) {
      if (op && typeof op === "object" && typeof (op as CADOperation).kind === "string") {
        opTemplate.push({ ...(op as CADOperation) });
      } else {
        skippedOps++;
      }
    }

    const opKindHistogram = this.buildHistogram(opTemplate);
    const { category, confidence } = this.categorize(opKindHistogram, opTemplate.length);
    const params = this.extractParams(opTemplate);
    const dominantDim = this.dominantDimension(opTemplate);
    const name = this.canonicalName(category, dominantDim, opTemplate);

    this.totalParamsExtracted += params.length;
    this.categoryCounts[category] = (this.categoryCounts[category] ?? 0) + 1;

    return {
      name,
      category,
      confidence,
      params,
      opTemplate,
      opKindHistogram,
      skippedOps,
    };
  }

  /** Category-only fast path (skips param extraction). */
  categorizeOnly(ops: ReadonlyArray<CADOperation>): { category: PartCategory; confidence: number } {
    if (!Array.isArray(ops)) {
      throw new TypeError("categorizeOnly: ops must be an array");
    }
    const valid = ops.filter(
      (o): o is CADOperation => !!o && typeof o === "object" && typeof o.kind === "string",
    );
    return this.categorize(this.buildHistogram(valid), valid.length);
  }

  private buildHistogram(ops: ReadonlyArray<CADOperation>): Record<string, number> {
    const h: Record<string, number> = {};
    for (const op of ops) h[op.kind] = (h[op.kind] ?? 0) + 1;
    return h;
  }

  /**
   * Op-kind histogram → part category. Rules are ordered most-specific
   * first; the first match wins. Confidence = fraction of ops that
   * carry the category-defining signal, floored at 0.3.
   */
  private categorize(
    hist: Record<string, number>,
    total: number,
  ): { category: PartCategory; confidence: number } {
    if (total === 0) return { category: "empty", confidence: 0 };

    const has = (k: string): boolean => (hist[k] ?? 0) > 0;
    const count = (k: string): number => hist[k] ?? 0;
    const conf = (signalOps: number): number =>
      Math.min(1, Math.max(0.3, signalOps / total));

    if (has("feature_revolve")) {
      return { category: "turned_part", confidence: conf(count("feature_revolve")) };
    }
    if (has("feature_shell")) {
      return { category: "housing", confidence: conf(count("feature_shell")) };
    }
    if (has("feature_pattern_circular") && has("feature_hole")) {
      return {
        category: "flange",
        confidence: conf(count("feature_pattern_circular") + count("feature_hole")),
      };
    }
    if (has("feature_pattern_linear") && has("feature_hole")) {
      return {
        category: "bracket",
        confidence: conf(count("feature_pattern_linear") + count("feature_hole")),
      };
    }
    if (has("feature_hole")) {
      return { category: "drilled_block", confidence: conf(count("feature_hole")) };
    }
    if (has("boolean_union") || has("boolean_subtract") || has("boolean_intersect")) {
      const boolOps = count("boolean_union") + count("boolean_subtract") + count("boolean_intersect");
      return { category: "assembly_body", confidence: conf(boolOps) };
    }
    if (has("feature_extrude")) {
      return { category: "extruded_profile", confidence: conf(count("feature_extrude")) };
    }
    // Generic fallback — sketch-only or unknown-op parts.
    return { category: "prismatic_part", confidence: 0.3 };
  }

  /**
   * Walk every op; emit one TemplateParam per finite numeric arg.
   * Reads the modern `args` field, falling back to the legacy `params`
   * alias (ICADCodeGenerator declares both) so feature trees from older
   * CAD generators are not silently dropped.
   */
  private extractParams(ops: ReadonlyArray<CADOperation>): TemplateParam[] {
    const params: TemplateParam[] = [];
    for (let i = 0; i < ops.length; i++) {
      const args = ops[i].args ?? ops[i].params;
      if (!args || typeof args !== "object") continue;
      for (const [argKey, value] of Object.entries(args)) {
        if (typeof value === "number" && Number.isFinite(value)) {
          params.push({ name: `${argKey}_op${i}`, value, opIndex: i, argKey });
        }
      }
    }
    return params;
  }

  /** Max dimension-arg value across the whole part, rounded to mm. */
  private dominantDimension(ops: ReadonlyArray<CADOperation>): number {
    let max = 0;
    for (const op of ops) {
      const args = op.args ?? op.params;
      if (!args || typeof args !== "object") continue;
      for (const [argKey, value] of Object.entries(args)) {
        if (
          DIMENSION_ARG_KEYS.has(argKey) &&
          typeof value === "number" &&
          Number.isFinite(value) &&
          value > max
        ) {
          max = value;
        }
      }
    }
    return Math.round(max);
  }

  /**
   * Deterministic canonical name. The 4-hex suffix is an LCG/Knuth hash
   * of the op-kind sequence — disambiguates two same-size, same-category
   * parts so the whole corpus has unique sortable names.
   */
  private canonicalName(
    category: PartCategory,
    dominantDim: number,
    ops: ReadonlyArray<CADOperation>,
  ): string {
    const seq = ops.map((o) => o.kind).join("|");
    let h = 0;
    for (let i = 0; i < seq.length; i++) {
      h = (Math.imul(h ^ seq.charCodeAt(i), KNUTH_MULT) >>> 0) & HASH_MOD;
    }
    const hash4 = (h & 0xffff).toString(16).padStart(4, "0");
    return `${category}_${dominantDim}mm_${ops.length}op_${hash4}`;
  }

  getStats(): ReverseTemplateStats {
    return {
      totalReverseEngineered: this.totalReverseEngineered,
      totalParamsExtracted: this.totalParamsExtracted,
      categoryCounts: { ...this.categoryCounts },
    };
  }

  _resetForTests(): void {
    this.totalReverseEngineered = 0;
    this.totalParamsExtracted = 0;
    this.categoryCounts = {};
  }

  /** Exposed for the corpus driver — the full category vocabulary. */
  static getCategoryVocabulary(): ReadonlyArray<PartCategory> {
    return [
      "turned_part", "housing", "flange", "bracket",
      "drilled_block", "assembly_body", "extruded_profile",
      "prismatic_part", "empty",
    ];
  }

  /** True iff a kind string is in the canonical CAD operation vocabulary. */
  static isKnownOpKind(kind: string): boolean {
    return VALID_OP_KINDS.has(kind);
  }
}

export const cadReverseTemplateEngine = new CADReverseTemplateEngine();
