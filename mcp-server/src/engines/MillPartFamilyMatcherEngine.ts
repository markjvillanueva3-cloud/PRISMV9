/**
 * MillPartFamilyMatcherEngine
 * ================================
 *
 * Given a MillPartDescriptor (geometry / material / customer / kind / filename
 * hints), returns the corpus families ranked by similarity. Consumes the
 * templates produced by `MillPartFamilyTemplateExtractorEngine` (U-TL-U2) —
 * never re-scans the source corpus and never emits runnable code.
 *
 * Query-side companion to the U2 extractor, mirroring
 * LathePartFamilyMatcherEngine (U-TL-U1's matcher) and the upcoming
 * WEDMPartFamilyMatcherEngine. Without it the extracted mill corpora are
 * inert; with it, downstream consumers (SpeedFeedOrchestrator, Master Post,
 * CAD/CAM AI) can anchor inference to a validated family before specialising
 * further.
 *
 * Owns (per spec H:/prism/state/shared/specs/TRAINING-LEARNING-MS0-2026-05-12.md, U-TL-U5):
 *   - matchPartFamily(descriptor, opts?)  → ranked MillMatchResult[]
 *   - inferFromFilename(filename)          → Partial<MillPartDescriptor>
 *   - listFamilies()                       → known family taxonomy
 *
 * Wires to (per WIRE-TO-ALL-SOURCES rule):
 *   - prism_cam: mill_part_family_match                (primary)
 *   - prism_intelligence: match_part_family_mill       (cross-domain unified query)
 *
 * Algorithm — weighted multi-signal similarity (mirrors lathe sibling for cross-
 * domain consistency; lathe-sibling DEFAULT_WEIGHTS are the audited baseline):
 *
 *   score(family) = Σ weight[signal] * signalScore[family]
 *
 *   Signals (each ∈ [0..1]):
 *     • kind         — descriptor.kind keyword overlap vs FAMILY_KIND_KEYWORDS
 *     • filename     — descriptor.source_filename matched against FAMILY_FILENAME_PATTERNS
 *     • ext          — descriptor.ext present in the template's ext_breakdown
 *     • customer     — descriptor.customer in the template's customers_top
 *     • material     — material → family bias map (descriptor.material → likely families)
 *     • features     — Jaccard over descriptor.features vs family keyword set
 *
 *   Confidence band is the score ± a width inversely proportional to the number
 *   of populated signals — fewer signals means looser bounds.
 *
 * Safety / hygiene:
 *   - READ-ONLY against the on-disk corpus.
 *   - NEVER throws on missing templates — returns ok:false with a discriminated
 *     error token.
 *   - Empty descriptors (no signals populated) return `error: "empty_descriptor"`.
 *   - When all template files are absent on disk, falls back to family-keyword-only
 *     matching with `template_present: false` on each result and `corpus_coverage: 0`.
 *   - NEVER emits runnable code — pure scoring + classification.
 *
 * @module engines/MillPartFamilyMatcherEngine
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U5-DOMAIN-MATCHERS
 * @version 1.0.0
 */

import {
  millPartFamilyTemplateExtractorEngine,
  MILL_TEMPLATE_FAMILIES,
  type MillTemplateFamily,
  type MillTrainingTemplate,
} from "./MillPartFamilyTemplateExtractorEngine.js";

// ───────────────────────────────────────────────────────────────────────────────
// Public types

export interface MillPartDescriptor {
  /** Overall part length (X) in mm — useful for plate vs bracket discrimination. */
  length_mm?: number;
  /** Overall part width (Y) in mm. */
  width_mm?: number;
  /** Overall part height/thickness (Z) in mm — plates are thin, blocks are thick. */
  height_mm?: number;
  /** Whether the part has at least one pocket feature. */
  hasPocket?: boolean;
  /** Whether the part has at least one thru-hole feature. */
  hasThruHole?: boolean;
  /** Whether the part has thin walls (< 2 mm typical). */
  hasThinWall?: boolean;
  /** Free-form material designator (e.g., "6061-T6", "AISI 4140", "P20", "Mic-6"). */
  material?: string;
  /** Customer code from the JM Die taxonomy (e.g., "ITW", "Holo-Krome"). */
  customer?: string;
  /** Original source filename — used by inferFromFilename + filename signal. */
  source_filename?: string;
  /** Tightest tolerance on the part in mm — used as a lower-priority signal. */
  tightestTolerance_mm?: number;
  /** Free-form feature tokens (e.g., ["pocket", "thru-hole", "thin-wall"]). */
  features?: string[];
  /** Caller-provided family kind hint (e.g., "taptite-mill", "plate"). */
  kind?: string;
  /** File extension lowercased without leading dot (e.g., "min", "nc", "sldprt", "ipt", "f3d"). */
  ext?: string;
}

export interface MillFamilySignalBreakdown {
  kind: number;
  filename: number;
  ext: number;
  customer: number;
  material: number;
  features: number;
}

export interface MillMatchResult {
  family: MillTemplateFamily;
  /** Composite similarity in [0..1]. */
  similarity: number;
  /** Lower confidence bound — widens when few descriptor signals are populated. */
  confidenceLow: number;
  /** Upper confidence bound — widens when few descriptor signals are populated. */
  confidenceHigh: number;
  /** Per-signal sub-scores in [0..1]. */
  signals: MillFamilySignalBreakdown;
  /** Human-readable explanation strings for the operator UI. */
  rationale: string[];
  /** Sample part paths from the template (empty when template_present is false). */
  representative_parts: string[];
  /** Top customers from the template (empty when template_present is false). */
  customers_top: Array<{ customer: string; count: number }>;
  /** Total corpus programs in this family (0 when template_present is false). */
  run_count: number;
  /** True when the on-disk template was loaded; false when matching against
   *  family keywords only (corpus not yet extracted). */
  template_present: boolean;
}

export interface MillMatchSuccess {
  ok: true;
  matches: MillMatchResult[];
  /** Number of families with a loaded template / total known families ∈ [0..1]. */
  corpus_coverage: number;
  /** Total families evaluated (always === MILL_TEMPLATE_FAMILIES.length). */
  families_evaluated: number;
  /** Number of descriptor fields that contributed a non-zero signal. */
  descriptor_signals_present: number;
}

export interface MillMatchError {
  ok: false;
  error: "empty_descriptor" | "no_match" | "corpus_unreadable";
  detail?: string;
}

export interface MillMatchOptions {
  /** Override default top-K (default 5; caps at MILL_TEMPLATE_FAMILIES.length). */
  topK?: number;
  /** Drop results below this similarity (default 0.05). */
  minSimilarity?: number;
  /** Override the on-disk template directory (forwarded to the extractor's
   *  getTemplate(dir) — same env-knob path resolution applies). */
  dir?: string;
  /** Custom signal weights (must sum to 1.0; out-of-range values rejected). */
  weights?: Partial<MillFamilySignalBreakdown>;
  /** When true, never read templates from disk — match against keywords only.
   *  Useful for fast pre-corpus-extraction sanity checks. */
  keywordsOnly?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────────
// Keyword / heuristic tables — mirrors phase21-mill-template-corpus-scan.py rules
// + the U-TL-U2 family taxonomy. Order matters within a family (more specific
// keywords first).

const FAMILY_KIND_KEYWORDS: Record<MillTemplateFamily, ReadonlyArray<string>> = {
  "taptite-mill": ["taptite-mill", "taptite", "trilobe", "thread-rolling-mill"],
  "electrode-mill": ["electrode-mill", "electrode", "copper-electrode", "graphite-electrode"],
  "plate": ["plate", "slab", "flat-stock"],
  "bracket-housing": ["bracket", "housing", "enclosure"],
  "mold-die-insert": ["mold-insert", "die-insert", "cavity", "core", "mold-die"],
  "aerospace-bracket": ["aerospace-bracket", "thin-wall-bracket", "aerospace"],
  "sheet-metal-fixture": ["sheet-fixture", "weldment-fixture", "sheet-metal"],
  "unknown": [],
};

/** Filename regex patterns — matched case-insensitively. */
const FAMILY_FILENAME_PATTERNS: Record<MillTemplateFamily, ReadonlyArray<RegExp>> = {
  "taptite-mill": [/taptite/i, /trilobe/i],
  "electrode-mill": [/electrode/i, /(?<!\w)graphite(?!\w)/i, /(?<!\w)copper(?!\w)/i],
  "plate": [/(?<!\w)plate(?!\w)/i, /(?<!\w)slab(?!\w)/i],
  "bracket-housing": [/(?<!\w)bracket(?!\w)/i, /(?<!\w)housing(?!\w)/i, /(?<!\w)enclosure(?!\w)/i],
  "mold-die-insert": [/(?<!\w)mold(?!\w)/i, /(?<!\w)cavity(?!\w)/i, /die.?insert/i, /(?<!\w)core(?!\w)/i],
  "aerospace-bracket": [/(?<!\w)aero(?:space)?(?!\w)/i, /thin.?wall/i, /(?<!\w)spar(?!\w)/i],
  "sheet-metal-fixture": [/sheet.?metal/i, /(?<!\w)fixture(?!\w)/i, /(?<!\w)weldment(?!\w)/i],
  "unknown": [],
};

/** Material → family bias map. Keys are lowercased substrings; descriptor.material
 *  is searched for these as substrings (case-insensitive). One material may bias
 *  multiple families, with weight split equally among the listed targets. */
const MATERIAL_FAMILY_BIAS: ReadonlyArray<{ pattern: RegExp; families: ReadonlyArray<MillTemplateFamily> }> = [
  { pattern: /\bcopper\b|\bc11\d|\bc10\d|\bcu\b/i, families: ["electrode-mill"] },
  { pattern: /\bgraphite\b|\bedm[-_ ]?3\b|poco/i, families: ["electrode-mill"] },
  { pattern: /\baluminum\b|\baluminium\b|\b6061\b|\b7075\b|\bal\b|mic.?6/i, families: ["bracket-housing", "aerospace-bracket", "sheet-metal-fixture", "plate"] },
  { pattern: /\b1018\b|\b1020\b|\b1045\b/i, families: ["taptite-mill", "plate", "bracket-housing"] },
  { pattern: /\b4140\b|\b4340\b|\b8620\b/i, families: ["bracket-housing", "mold-die-insert"] },
  { pattern: /\bp20\b|\bh13\b|\b420\b|\bs7\b/i, families: ["mold-die-insert"] },
  { pattern: /\ba2\b|\bd2\b|\bo1\b|\bm2\b|tool.?steel/i, families: ["mold-die-insert", "taptite-mill"] },
  { pattern: /\binconel\b|\b718\b|\b625\b|rene|hastelloy/i, families: ["aerospace-bracket"] },
  { pattern: /\btitanium\b|\bti.?6al/i, families: ["aerospace-bracket", "bracket-housing"] },
  { pattern: /\bstainless\b|\bss\b|\b303\b|\b304\b|\b316\b|\b17-?4\b/i, families: ["plate", "bracket-housing"] },
  { pattern: /\bbrass\b|c360|c260/i, families: ["bracket-housing", "electrode-mill"] },
];

/** Family feature keyword sets — Jaccard target for descriptor.features. */
const FAMILY_FEATURE_KEYWORDS: Record<MillTemplateFamily, ReadonlyArray<string>> = {
  "taptite-mill": ["tap", "taptite", "hex-head", "shank", "thread-rolling", "head-feature"],
  "electrode-mill": ["pocket", "electrode-shape", "copper-mill", "graphite-tab", "shrink-allowance"],
  "plate": ["face", "surface-mill", "large-flat", "drill-pattern", "flatness", "parallelism"],
  "bracket-housing": ["pocket", "boss", "ribs", "bolt-pattern", "shoulder", "cavity"],
  "mold-die-insert": ["cavity", "core", "parting-line", "mold-pocket", "ejector-pin", "vent", "runner"],
  "aerospace-bracket": ["thin-wall", "lightening-pocket", "web", "spar", "rib", "pocket-deep"],
  "sheet-metal-fixture": ["cutout", "weld-prep", "mounting-holes", "slot", "edge-finish"],
  "unknown": [],
};

/** Default signal weights — sum to 1.0 (mirrors lathe sibling). */
const DEFAULT_WEIGHTS: MillFamilySignalBreakdown = {
  kind: 0.30,
  filename: 0.20,
  features: 0.20,
  material: 0.15,
  customer: 0.10,
  ext: 0.05,
};

// ───────────────────────────────────────────────────────────────────────────────
// Internal helpers (same shape as lathe sibling — kept local to avoid coupling)

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function normalizeWeights(custom?: Partial<MillFamilySignalBreakdown>): MillFamilySignalBreakdown {
  if (!custom) return DEFAULT_WEIGHTS;
  const merged: MillFamilySignalBreakdown = { ...DEFAULT_WEIGHTS };
  for (const k of Object.keys(custom) as Array<keyof MillFamilySignalBreakdown>) {
    const v = custom[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) merged[k] = v;
  }
  const sum = merged.kind + merged.filename + merged.features + merged.material + merged.customer + merged.ext;
  if (sum <= 0) return DEFAULT_WEIGHTS;
  return {
    kind: merged.kind / sum,
    filename: merged.filename / sum,
    features: merged.features / sum,
    material: merged.material / sum,
    customer: merged.customer / sum,
    ext: merged.ext / sum,
  };
}

function kindSignal(family: MillTemplateFamily, kind: string | undefined): number {
  if (!kind) return 0;
  const lower = kind.toLowerCase();
  const keywords = FAMILY_KIND_KEYWORDS[family];
  if (keywords.length === 0) return 0;
  if (lower === family) return 1.0;
  for (const kw of keywords) {
    if (lower === kw) return 1.0;
  }
  for (const kw of keywords) {
    if (lower.includes(kw)) return 0.75;
  }
  return 0;
}

function filenameSignal(family: MillTemplateFamily, filename: string | undefined): number {
  if (!filename) return 0;
  const patterns = FAMILY_FILENAME_PATTERNS[family];
  if (patterns.length === 0) return 0;
  let hits = 0;
  for (const re of patterns) {
    if (re.test(filename)) hits++;
  }
  if (hits === 0) return 0;
  return clamp01(hits / Math.min(patterns.length, 2));
}

function extSignal(
  family: MillTemplateFamily,
  ext: string | undefined,
  template: MillTrainingTemplate | null,
): number {
  if (!ext || !template) return 0;
  const lower = ext.toLowerCase().replace(/^\./, "");
  const breakdown = template.ext_breakdown ?? {};
  const total = Object.values(breakdown).reduce((acc, n) => acc + (typeof n === "number" ? n : 0), 0);
  if (total <= 0) return 0;
  const matched =
    (typeof breakdown[lower] === "number" ? breakdown[lower] : 0) +
    (typeof breakdown[`.${lower}`] === "number" ? breakdown[`.${lower}`] : 0);
  if (matched <= 0) return 0;
  return clamp01(matched / total);
}

function customerSignal(
  family: MillTemplateFamily,
  customer: string | undefined,
  template: MillTrainingTemplate | null,
): number {
  if (!customer || !template) return 0;
  const lower = customer.toLowerCase();
  const top = template.customers_top ?? [];
  if (top.length === 0) return 0;
  const total = top.reduce((acc, row) => acc + (typeof row.count === "number" ? row.count : 0), 0);
  if (total <= 0) return 0;
  const matched = top
    .filter((row) => row.customer && row.customer.toLowerCase() === lower)
    .reduce((acc, row) => acc + row.count, 0);
  if (matched <= 0) return 0;
  return clamp01(matched / total);
}

function materialSignal(family: MillTemplateFamily, material: string | undefined): number {
  if (!material) return 0;
  let total = 0;
  let matched = 0;
  for (const row of MATERIAL_FAMILY_BIAS) {
    if (row.pattern.test(material)) {
      total += 1;
      if (row.families.includes(family)) matched += 1 / row.families.length;
    }
  }
  if (total === 0) return 0;
  return clamp01(matched / total);
}

function featuresSignal(family: MillTemplateFamily, features: ReadonlyArray<string> | undefined): number {
  if (!features || features.length === 0) return 0;
  const target = FAMILY_FEATURE_KEYWORDS[family];
  if (target.length === 0) return 0;
  const a = new Set(features.map((f) => f.toLowerCase()));
  const b = new Set(target.map((f) => f.toLowerCase()));
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = new Set([...a, ...b]).size;
  if (union === 0) return 0;
  return inter / union;
}

function countDescriptorSignals(d: MillPartDescriptor): number {
  let n = 0;
  if (typeof d.kind === "string" && d.kind.length > 0) n++;
  if (typeof d.source_filename === "string" && d.source_filename.length > 0) n++;
  if (typeof d.ext === "string" && d.ext.length > 0) n++;
  if (typeof d.customer === "string" && d.customer.length > 0) n++;
  if (typeof d.material === "string" && d.material.length > 0) n++;
  if (Array.isArray(d.features) && d.features.length > 0) n++;
  return n;
}

function buildRationale(family: MillTemplateFamily, sig: MillFamilySignalBreakdown): string[] {
  const out: string[] = [];
  const pct = (x: number) => Math.round(x * 100);
  if (sig.kind > 0) out.push(`kind hit (${pct(sig.kind)}% of family ${family} keywords)`);
  if (sig.filename > 0) out.push(`filename matched ${pct(sig.filename)}% of family pattern set`);
  if (sig.features > 0) out.push(`feature Jaccard ${pct(sig.features)}% vs family taxonomy`);
  if (sig.material > 0) out.push(`material bias ${pct(sig.material)}% toward this family`);
  if (sig.customer > 0) out.push(`customer mass ${pct(sig.customer)}% in family corpus`);
  if (sig.ext > 0) out.push(`file extension represents ${pct(sig.ext)}% of family corpus`);
  if (out.length === 0) out.push("no signal matched — fallback ordering only");
  return out;
}

// ───────────────────────────────────────────────────────────────────────────────
// Public engine

export class MillPartFamilyMatcherEngine {
  /** Heuristic descriptor inference from a filename — used by callers that have
   *  a part-program path but no structured descriptor yet. Lower-cased
   *  substring/regex matching against FAMILY_FILENAME_PATTERNS. The returned
   *  partial descriptor always includes `source_filename` and may include
   *  `kind` + `ext` when those can be inferred. NEVER throws.
   *
   * @param filename — absolute or relative path; only basename + extension are used.
   * @returns Partial<MillPartDescriptor>
   */
  inferFromFilename(filename: string): Partial<MillPartDescriptor> {
    if (typeof filename !== "string" || filename.length === 0) {
      return {};
    }
    const baseRaw = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
    const dot = baseRaw.lastIndexOf(".");
    const stem = dot > 0 ? baseRaw.slice(0, dot) : baseRaw;
    const ext = dot > 0 ? baseRaw.slice(dot + 1).toLowerCase() : "";
    const out: Partial<MillPartDescriptor> = { source_filename: baseRaw };
    if (ext) out.ext = ext;
    for (const fam of MILL_TEMPLATE_FAMILIES) {
      const patterns = FAMILY_FILENAME_PATTERNS[fam];
      if (patterns.some((re) => re.test(stem))) {
        out.kind = fam;
        break;
      }
    }
    return out;
  }

  /** List the family taxonomy known to this matcher. Reads-only against the
   *  taxonomy constants — never throws. */
  listFamilies(): ReadonlyArray<MillTemplateFamily> {
    return MILL_TEMPLATE_FAMILIES;
  }

  /** Score every family against the descriptor and return the top-K ranked
   *  matches. Templates are loaded best-effort from disk (via the extractor's
   *  `getTemplate(family, {dir})`); missing templates result in
   *  `template_present: false` results but do NOT abort the match.
   *
   * @param descriptor — MillPartDescriptor with at least one populated signal field
   * @param opts        — optional weights / topK / minSimilarity / dir overrides
   * @returns MillMatchSuccess on success or MillMatchError discriminator
   */
  matchPartFamily(
    descriptor: MillPartDescriptor,
    opts: MillMatchOptions = {},
  ): MillMatchSuccess | MillMatchError {
    if (!descriptor || typeof descriptor !== "object") {
      return { ok: false, error: "empty_descriptor", detail: "descriptor must be an object" };
    }
    const signalsPresent = countDescriptorSignals(descriptor);
    if (signalsPresent === 0) {
      return {
        ok: false,
        error: "empty_descriptor",
        detail:
          "at least one of {kind, source_filename, ext, customer, material, features} must be set",
      };
    }

    const weights = normalizeWeights(opts.weights);
    const requestedTopK = typeof opts.topK === "number" && opts.topK > 0 ? Math.floor(opts.topK) : 5;
    const effectiveTopK = Math.min(requestedTopK, MILL_TEMPLATE_FAMILIES.length);
    const minSimilarity =
      typeof opts.minSimilarity === "number" && Number.isFinite(opts.minSimilarity)
        ? clamp01(opts.minSimilarity)
        : 0.05;

    const templates: Map<MillTemplateFamily, MillTrainingTemplate | null> = new Map();
    let loaded = 0;
    let loadFailed = false;
    for (const fam of MILL_TEMPLATE_FAMILIES) {
      if (opts.keywordsOnly) {
        templates.set(fam, null);
        continue;
      }
      try {
        // Mill extractor's ListOpts uses `outDir` (lathe sibling uses `dir`) — public
        // matcher API stays on `dir` for cross-domain parity; the rename only happens
        // at this call site.
        const t = millPartFamilyTemplateExtractorEngine.getTemplate(fam, { outDir: opts.dir });
        templates.set(fam, t);
        if (t) loaded++;
      } catch (err) {
        loadFailed = true;
        templates.set(fam, null);
        void err;
      }
    }
    if (!opts.keywordsOnly && loadFailed && loaded === 0) {
      try {
        const list = millPartFamilyTemplateExtractorEngine.listTemplates({ outDir: opts.dir });
        if (list.templates.length === 0) {
          // Corpus genuinely empty — keywords-only fallback.
        } else {
          return {
            ok: false,
            error: "corpus_unreadable",
            detail: "all template loads threw; check filesystem permissions on template dir",
          };
        }
      } catch {
        return {
          ok: false,
          error: "corpus_unreadable",
          detail: "template directory inaccessible",
        };
      }
    }

    const results: MillMatchResult[] = [];
    for (const fam of MILL_TEMPLATE_FAMILIES) {
      const t = templates.get(fam) ?? null;
      const sig: MillFamilySignalBreakdown = {
        kind: kindSignal(fam, descriptor.kind),
        filename: filenameSignal(fam, descriptor.source_filename),
        ext: extSignal(fam, descriptor.ext, t),
        customer: customerSignal(fam, descriptor.customer, t),
        material: materialSignal(fam, descriptor.material),
        features: featuresSignal(fam, descriptor.features),
      };
      const similarity = clamp01(
        weights.kind * sig.kind +
          weights.filename * sig.filename +
          weights.ext * sig.ext +
          weights.customer * sig.customer +
          weights.material * sig.material +
          weights.features * sig.features,
      );
      // Confidence band widens with fewer descriptor signals — same shape as lathe.
      const halfWidth = 0.30 - (signalsPresent / 6) * 0.25;
      const confidenceLow = clamp01(similarity - halfWidth);
      const confidenceHigh = clamp01(similarity + halfWidth);
      results.push({
        family: fam,
        similarity,
        confidenceLow,
        confidenceHigh,
        signals: sig,
        rationale: buildRationale(fam, sig),
        representative_parts: t?.representative_parts ?? [],
        customers_top: t?.customers_top ?? [],
        run_count: t?.run_count ?? 0,
        template_present: t !== null,
      });
    }

    results.sort((a, b) => {
      const ds = b.similarity - a.similarity;
      if (Math.abs(ds) > 1e-9) return ds;
      return b.run_count - a.run_count;
    });

    const filtered = results.filter((r) => r.similarity >= minSimilarity);
    if (filtered.length === 0) {
      return {
        ok: false,
        error: "no_match",
        detail: `no family scored ≥ ${minSimilarity}; descriptor signals=${signalsPresent}`,
      };
    }

    return {
      ok: true,
      matches: filtered.slice(0, effectiveTopK),
      corpus_coverage: loaded / MILL_TEMPLATE_FAMILIES.length,
      families_evaluated: MILL_TEMPLATE_FAMILIES.length,
      descriptor_signals_present: signalsPresent,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Test surfaces — prefixed `_`; not part of the public API.

  /** @internal — exposed so tests can verify each signal function in isolation. */
  _signal_kind(family: MillTemplateFamily, kind?: string): number {
    return kindSignal(family, kind);
  }
  /** @internal */
  _signal_filename(family: MillTemplateFamily, filename?: string): number {
    return filenameSignal(family, filename);
  }
  /** @internal */
  _signal_material(family: MillTemplateFamily, material?: string): number {
    return materialSignal(family, material);
  }
  /** @internal */
  _signal_features(family: MillTemplateFamily, features?: string[]): number {
    return featuresSignal(family, features);
  }
  /** @internal */
  _normalizeWeights(custom?: Partial<MillFamilySignalBreakdown>): MillFamilySignalBreakdown {
    return normalizeWeights(custom);
  }
  /** @internal */
  _countSignals(d: MillPartDescriptor): number {
    return countDescriptorSignals(d);
  }
  /** @internal — default weights surface so the test suite can validate weight sums. */
  _defaultWeights(): MillFamilySignalBreakdown {
    return { ...DEFAULT_WEIGHTS };
  }
}

export const millPartFamilyMatcherEngine = new MillPartFamilyMatcherEngine();
