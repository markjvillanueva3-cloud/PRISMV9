/**
 * LathePartFamilyMatcherEngine
 * ================================
 *
 * Given a LathePartDescriptor (geometry / material / customer / kind / filename hints),
 * returns the corpus families ranked by similarity. Consumes the templates produced
 * by `LathePartFamilyTemplateExtractorEngine` (U-TL-U1) — never re-scans the source
 * corpus and never emits runnable code.
 *
 * This is the query-side companion to the U2/U3/U4 extractors. Without it the
 * extracted corpora are inert; with it, downstream consumers (SpeedFeedOrchestrator,
 * Master Post, CAD/CAM AI) can anchor inference to a validated family before
 * specialising further.
 *
 * Owns (per spec H:/prism/state/shared/specs/TRAINING-LEARNING-MS0-2026-05-12.md, MS0-U5):
 *   - matchPartFamily(descriptor, opts?)  → ranked LatheMatchResult[]
 *   - inferFromFilename(filename)          → Partial<LathePartDescriptor>
 *   - listFamilies()                       → known family taxonomy
 *
 * Wires to (per WIRE-TO-ALL-SOURCES rule):
 *   - prism_turning:lathe_part_family_match  (primary)
 *   - prism_intelligence:match_part_family   (cross-domain unified query — added in
 *     the WEDM/Mill siblings' shared wire pass)
 *
 * Algorithm — weighted multi-signal similarity:
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
 *   - NEVER throws on missing templates — returns ok:false with a discriminated error token.
 *   - Empty descriptors (no signals populated) return `error: "empty_descriptor"`.
 *   - When all template files are absent on disk, falls back to family-keyword-only
 *     matching with `template_present: false` on each result and `corpus_coverage: 0`.
 *
 * @module engines/LathePartFamilyMatcherEngine
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U5-DOMAIN-MATCHERS
 * @version 1.0.0
 */

import {
  lathePartFamilyTemplateExtractorEngine,
  LATHE_TEMPLATE_FAMILIES,
  type LatheTemplateFamily,
  type TrainingTemplate as LatheTrainingTemplate,
} from "./LathePartFamilyTemplateExtractorEngine.js";

// ───────────────────────────────────────────────────────────────────────────────
// Public types

export interface LathePartDescriptor {
  /** Outside diameter in mm (largest). */
  diameter_max_mm?: number;
  /** Workpiece overall length in mm. */
  length_mm?: number;
  /** Smallest external diameter — useful for shaft vs bushing discrimination. */
  diameter_min_mm?: number;
  /** Whether the part has an internal bore (driven by ID turning / boring). */
  hasInternalBore?: boolean;
  /** Internal bore diameter in mm — populates a bushing/tube classification signal. */
  internalBoreDiameter_mm?: number;
  /** Whether the part has at least one threaded feature. */
  hasThread?: boolean;
  /** Thread spec string (e.g., "M6x1.0", "1/4-20 UNC") — non-empty implies hasThread. */
  threadSpec?: string;
  /** Free-form material designator (e.g., "303 SS", "AISI 1018", "Cu 110"). */
  material?: string;
  /** Customer code from the JM Die taxonomy (e.g., "ITW", "Holo-Krome"). */
  customer?: string;
  /** Original source filename — used by inferFromFilename + filename signal. */
  source_filename?: string;
  /** Tightest tolerance on the part in mm — used as a lower-priority signal. */
  tightestTolerance_mm?: number;
  /** Free-form feature tokens (e.g., ["wafer-pocket", "od-thread", "id-bore"]). */
  features?: string[];
  /** Caller-provided family kind hint (e.g., "wafer-insert", "shaft"). */
  kind?: string;
  /** File extension lowercased without leading dot (e.g., "min", "sldprt", "ipt"). */
  ext?: string;
}

export interface LatheFamilySignalBreakdown {
  kind: number;
  filename: number;
  ext: number;
  customer: number;
  material: number;
  features: number;
}

export interface LatheMatchResult {
  family: LatheTemplateFamily;
  /** Composite similarity in [0..1]. */
  similarity: number;
  /** Lower confidence bound — widens when few descriptor signals are populated. */
  confidenceLow: number;
  /** Upper confidence bound — widens when few descriptor signals are populated. */
  confidenceHigh: number;
  /** Per-signal sub-scores in [0..1]. */
  signals: LatheFamilySignalBreakdown;
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

export interface LatheMatchSuccess {
  ok: true;
  matches: LatheMatchResult[];
  /** Number of families with a loaded template / total known families ∈ [0..1]. */
  corpus_coverage: number;
  /** Total families evaluated (always === LATHE_TEMPLATE_FAMILIES.length). */
  families_evaluated: number;
  /** Number of descriptor fields that contributed a non-zero signal. */
  descriptor_signals_present: number;
}

export interface LatheMatchError {
  ok: false;
  error: "empty_descriptor" | "no_match" | "corpus_unreadable";
  detail?: string;
}

export interface LatheMatchOptions {
  /** Override default top-K (default 5; caps at LATHE_TEMPLATE_FAMILIES.length). */
  topK?: number;
  /** Drop results below this similarity (default 0.05). */
  minSimilarity?: number;
  /** Override the on-disk template directory (forwarded to the extractor's
   *  getTemplate(dir) — same env-knob path resolution applies). */
  dir?: string;
  /** Custom signal weights (must sum to 1.0; out-of-range values rejected). */
  weights?: Partial<LatheFamilySignalBreakdown>;
  /** When true, never read templates from disk — match against keywords only.
   *  Useful for fast pre-corpus-extraction sanity checks. */
  keywordsOnly?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────────
// Keyword / heuristic tables

/** Family kind keywords — matched against descriptor.kind via lowercased substring
 *  search. Order matters within a family (more specific keywords first). */
const FAMILY_KIND_KEYWORDS: Record<LatheTemplateFamily, ReadonlyArray<string>> = {
  "wafer-insert": ["wafer", "insert"],
  "casing": ["casing", "case"],
  "casing-counterbore": ["counterbore", "cbore", "casing-cb", "casing-counter"],
  "top-hat-casing": ["top-hat", "tophat", "top hat", "flange-casing", "hat-casing"],
  "shaft": ["shaft", "axle", "spindle"],
  "flange": ["flange", "collar"],
  "bushing": ["bushing", "bush"],
  "tube": ["tube", "tubing", "pipe"],
  "taptite-blank": ["taptite", "trilobe", "thread-rolling"],
  "nut-blank": ["nut", "hexnut", "hex-nut"],
  "electrode-rod-blank": ["electrode", "rod-blank", "copper-rod"],
  "unknown": [],
};

/** Filename regex patterns — matched case-insensitively. */
const FAMILY_FILENAME_PATTERNS: Record<LatheTemplateFamily, ReadonlyArray<RegExp>> = {
  "wafer-insert": [/wafer/i, /(?<!\w)insert(?!\w)/i],
  "casing": [/(?<!\w)casing(?!\w)/i, /(?<!\w)case(?!\w)/i],
  "casing-counterbore": [/counterbore/i, /(?<!\w)cbore(?!\w)/i, /casing.{0,8}cb/i],
  "top-hat-casing": [/top.?hat/i, /tophat/i],
  "shaft": [/(?<!\w)shaft(?!\w)/i, /(?<!\w)axle(?!\w)/i],
  "flange": [/(?<!\w)flange(?!\w)/i],
  "bushing": [/(?<!\w)bushing(?!\w)/i],
  "tube": [/(?<!\w)tube(?!\w)/i, /(?<!\w)tubing(?!\w)/i],
  "taptite-blank": [/taptite/i, /trilobe/i],
  "nut-blank": [/(?<!\w)nut(?!\w)/i, /hex.?nut/i],
  "electrode-rod-blank": [/electrode/i, /(?<!\w)rod(?!\w)/i],
  "unknown": [],
};

/** Material → family bias map. Keys are lowercased substrings; descriptor.material
 *  is searched for these as substrings (case-insensitive). One material may bias
 *  multiple families, with weight split equally among the listed targets. */
const MATERIAL_FAMILY_BIAS: ReadonlyArray<{ pattern: RegExp; families: ReadonlyArray<LatheTemplateFamily> }> = [
  { pattern: /\bcopper\b|\bc11\d|\bc10\d|\bcu\b/i, families: ["electrode-rod-blank"] },
  { pattern: /\bbrass\b|c360|c260/i, families: ["bushing", "electrode-rod-blank"] },
  { pattern: /\bbronze\b/i, families: ["bushing"] },
  { pattern: /\baluminum\b|\baluminium\b|\b6061\b|\b7075\b|\bal\b/i, families: ["wafer-insert", "casing", "bushing"] },
  { pattern: /\bstainless\b|\bss\b|\b303\b|\b304\b|\b316\b|\b17-?4\b/i, families: ["shaft", "casing", "flange"] },
  { pattern: /\b1018\b|\b1020\b/i, families: ["shaft", "taptite-blank"] },
  { pattern: /\b1045\b|\b1144\b/i, families: ["shaft"] },
  { pattern: /\b4140\b|\b4340\b|\b8620\b/i, families: ["shaft", "flange"] },
  { pattern: /\binconel\b|\b718\b|\b625\b/i, families: ["shaft", "flange"] },
  { pattern: /\bgraphite\b|\bedm[-_ ]?3\b/i, families: ["electrode-rod-blank"] },
  { pattern: /\btitanium\b|\bti.?6al/i, families: ["shaft", "flange"] },
];

/** Family feature keyword sets — Jaccard target for descriptor.features. */
const FAMILY_FEATURE_KEYWORDS: Record<LatheTemplateFamily, ReadonlyArray<string>> = {
  "wafer-insert": ["wafer-pocket", "shallow-pocket", "od-thread", "id-thread", "thin-wall"],
  "casing": ["counterbore", "od-thread", "id-thread", "boss", "shoulder"],
  "casing-counterbore": ["counterbore", "deep-counterbore", "shoulder", "od-thread"],
  "top-hat-casing": ["flange", "counterbore", "shoulder", "od-thread", "hat"],
  "shaft": ["od-turning", "shoulder", "keyway", "groove", "thread"],
  "flange": ["flange", "bolt-circle", "od-turning", "facing"],
  "bushing": ["id-bore", "od-turning", "thin-wall", "shoulder"],
  "tube": ["id-bore", "od-turning", "thin-wall", "long-bore", "thru-bore"],
  "taptite-blank": ["taptite", "trilobe", "thread-rolling", "shank", "head"],
  "nut-blank": ["hex-flat", "od-thread", "id-thread", "chamfer"],
  "electrode-rod-blank": ["electrode-rod", "od-turning", "facing"],
  "unknown": [],
};

/** Default signal weights — sum to 1.0. */
const DEFAULT_WEIGHTS: LatheFamilySignalBreakdown = {
  kind: 0.30,
  filename: 0.20,
  features: 0.20,
  material: 0.15,
  customer: 0.10,
  ext: 0.05,
};

const ZERO_SIGNALS: LatheFamilySignalBreakdown = {
  kind: 0,
  filename: 0,
  features: 0,
  material: 0,
  customer: 0,
  ext: 0,
};

// ───────────────────────────────────────────────────────────────────────────────
// Internal helpers

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function normalizeWeights(custom?: Partial<LatheFamilySignalBreakdown>): LatheFamilySignalBreakdown {
  if (!custom) return DEFAULT_WEIGHTS;
  const merged: LatheFamilySignalBreakdown = { ...DEFAULT_WEIGHTS };
  for (const k of Object.keys(custom) as Array<keyof LatheFamilySignalBreakdown>) {
    const v = custom[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) merged[k] = v;
  }
  const sum = merged.kind + merged.filename + merged.features + merged.material + merged.customer + merged.ext;
  if (sum <= 0) return DEFAULT_WEIGHTS;
  // Renormalize to sum 1.0 so callers can pass un-normalized weights without surprise.
  return {
    kind: merged.kind / sum,
    filename: merged.filename / sum,
    features: merged.features / sum,
    material: merged.material / sum,
    customer: merged.customer / sum,
    ext: merged.ext / sum,
  };
}

function kindSignal(family: LatheTemplateFamily, kind: string | undefined): number {
  if (!kind) return 0;
  const lower = kind.toLowerCase();
  const keywords = FAMILY_KIND_KEYWORDS[family];
  if (keywords.length === 0) return 0;
  // Strongest hit: exact-word equality with the family slug. Partial: any keyword substring.
  if (lower === family) return 1.0;
  for (const kw of keywords) {
    if (lower === kw) return 1.0;
  }
  for (const kw of keywords) {
    if (lower.includes(kw)) return 0.75;
  }
  return 0;
}

function filenameSignal(family: LatheTemplateFamily, filename: string | undefined): number {
  if (!filename) return 0;
  const patterns = FAMILY_FILENAME_PATTERNS[family];
  if (patterns.length === 0) return 0;
  let hits = 0;
  for (const re of patterns) {
    if (re.test(filename)) hits++;
  }
  if (hits === 0) return 0;
  // Each pattern is independent evidence; cap at 1.0.
  return clamp01(hits / Math.min(patterns.length, 2));
}

function extSignal(
  family: LatheTemplateFamily,
  ext: string | undefined,
  template: LatheTrainingTemplate | null,
): number {
  if (!ext || !template) return 0;
  const lower = ext.toLowerCase().replace(/^\./, "");
  const breakdown = template.ext_breakdown ?? {};
  const total = Object.values(breakdown).reduce((acc, n) => acc + (typeof n === "number" ? n : 0), 0);
  if (total <= 0) return 0;
  // Compare against both dotted and undotted keys, since corpus snapshots use both.
  const matched =
    (typeof breakdown[lower] === "number" ? breakdown[lower] : 0) +
    (typeof breakdown[`.${lower}`] === "number" ? breakdown[`.${lower}`] : 0);
  if (matched <= 0) return 0;
  return clamp01(matched / total);
}

function customerSignal(
  family: LatheTemplateFamily,
  customer: string | undefined,
  template: LatheTrainingTemplate | null,
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
  // Customer mass within the family; ceiling at 1.0.
  return clamp01(matched / total);
}

function materialSignal(family: LatheTemplateFamily, material: string | undefined): number {
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

function featuresSignal(family: LatheTemplateFamily, features: ReadonlyArray<string> | undefined): number {
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

function countDescriptorSignals(d: LathePartDescriptor): number {
  let n = 0;
  if (typeof d.kind === "string" && d.kind.length > 0) n++;
  if (typeof d.source_filename === "string" && d.source_filename.length > 0) n++;
  if (typeof d.ext === "string" && d.ext.length > 0) n++;
  if (typeof d.customer === "string" && d.customer.length > 0) n++;
  if (typeof d.material === "string" && d.material.length > 0) n++;
  if (Array.isArray(d.features) && d.features.length > 0) n++;
  return n;
}

function buildRationale(family: LatheTemplateFamily, sig: LatheFamilySignalBreakdown): string[] {
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

export class LathePartFamilyMatcherEngine {
  /** Heuristic descriptor inference from a filename — used by callers that have
   *  a part-program path but no structured descriptor yet. Lower-cased
   *  substring/regex matching against FAMILY_FILENAME_PATTERNS. The returned
   *  partial descriptor always includes `source_filename` and may include
   *  `kind` + `ext` when those can be inferred. NEVER throws.
   *
   * @param filename — absolute or relative path; only basename + extension are used.
   * @returns Partial<LathePartDescriptor>
   */
  inferFromFilename(filename: string): Partial<LathePartDescriptor> {
    if (typeof filename !== "string" || filename.length === 0) {
      return {};
    }
    const baseRaw = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
    const dot = baseRaw.lastIndexOf(".");
    const stem = dot > 0 ? baseRaw.slice(0, dot) : baseRaw;
    const ext = dot > 0 ? baseRaw.slice(dot + 1).toLowerCase() : "";
    const out: Partial<LathePartDescriptor> = { source_filename: baseRaw };
    if (ext) out.ext = ext;
    // First family whose pattern set hits gets surfaced as `kind`.
    for (const fam of LATHE_TEMPLATE_FAMILIES) {
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
  listFamilies(): ReadonlyArray<LatheTemplateFamily> {
    return LATHE_TEMPLATE_FAMILIES;
  }

  /** Score every family against the descriptor and return the top-K ranked
   *  matches. Templates are loaded best-effort from disk (via the extractor's
   *  `getTemplate(family, {dir})`); missing templates result in
   *  `template_present: false` results but do NOT abort the match.
   *
   * @param descriptor — LathePartDescriptor with at least one populated signal field
   * @param opts        — optional weights / topK / minSimilarity / dir overrides
   * @returns LatheMatchSuccess on success or LatheMatchError discriminator
   */
  matchPartFamily(
    descriptor: LathePartDescriptor,
    opts: LatheMatchOptions = {},
  ): LatheMatchSuccess | LatheMatchError {
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
    const topK = clamp01(0) /* unused */, ignored = topK; // satisfy linter; topK handled below
    const requestedTopK = typeof opts.topK === "number" && opts.topK > 0 ? Math.floor(opts.topK) : 5;
    const effectiveTopK = Math.min(requestedTopK, LATHE_TEMPLATE_FAMILIES.length);
    const minSimilarity =
      typeof opts.minSimilarity === "number" && Number.isFinite(opts.minSimilarity)
        ? clamp01(opts.minSimilarity)
        : 0.05;
    void ignored;

    // Load template for each family (best-effort; null is acceptable).
    const templates: Map<LatheTemplateFamily, LatheTrainingTemplate | null> = new Map();
    let loaded = 0;
    let loadFailed = false;
    for (const fam of LATHE_TEMPLATE_FAMILIES) {
      if (opts.keywordsOnly) {
        templates.set(fam, null);
        continue;
      }
      try {
        const t = lathePartFamilyTemplateExtractorEngine.getTemplate(fam, { dir: opts.dir });
        templates.set(fam, t);
        if (t) loaded++;
      } catch (err) {
        loadFailed = true;
        templates.set(fam, null);
        // Don't propagate — a missing template should not abort the match.
        // We surface the load failure via corpus_unreadable only when ALL templates
        // throw, which is the genuine "corpus directory unreadable" case.
        void err;
      }
    }
    // If we asked for templates but every single load threw, surface the failure
    // rather than silently returning keyword-only results — that's the
    // "corpus directory unreadable" case which masks misconfigured paths.
    if (!opts.keywordsOnly && loadFailed && loaded === 0) {
      // Distinguish from "corpus simply not yet built" (no exceptions, no files)
      // by inspecting whether the extractor's listTemplates surfaces ANY entries.
      try {
        const list = lathePartFamilyTemplateExtractorEngine.listTemplates({ dir: opts.dir });
        if (list.templates.length === 0) {
          // Corpus genuinely empty — treat as keywords-only fallback rather than error.
          // Operator sees this via `corpus_coverage: 0` + `template_present: false` on results.
        } else {
          // List returned entries but every getTemplate threw — that's a real I/O issue.
          return {
            ok: false,
            error: "corpus_unreadable",
            detail: "all template loads threw; check filesystem permissions on template dir",
          };
        }
      } catch {
        // listTemplates itself errored — corpus directory genuinely inaccessible.
        return {
          ok: false,
          error: "corpus_unreadable",
          detail: "template directory inaccessible",
        };
      }
    }

    const results: LatheMatchResult[] = [];
    for (const fam of LATHE_TEMPLATE_FAMILIES) {
      const t = templates.get(fam) ?? null;
      const sig: LatheFamilySignalBreakdown = {
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
      // Confidence band widens with fewer descriptor signals. With all 6
      // present, ±0.05; with only 1 present, ±0.30. Linear interpolation.
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

    // Sort descending by similarity, then by run_count as a tie-breaker
    // (prefer the better-represented family on a tie).
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
      corpus_coverage: loaded / LATHE_TEMPLATE_FAMILIES.length,
      families_evaluated: LATHE_TEMPLATE_FAMILIES.length,
      descriptor_signals_present: signalsPresent,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Test surfaces — prefixed `_`; not part of the public API.

  /** @internal — exposed so tests can verify each signal function in isolation. */
  _signal_kind(family: LatheTemplateFamily, kind?: string): number {
    return kindSignal(family, kind);
  }
  /** @internal */
  _signal_filename(family: LatheTemplateFamily, filename?: string): number {
    return filenameSignal(family, filename);
  }
  /** @internal */
  _signal_material(family: LatheTemplateFamily, material?: string): number {
    return materialSignal(family, material);
  }
  /** @internal */
  _signal_features(family: LatheTemplateFamily, features?: string[]): number {
    return featuresSignal(family, features);
  }
  /** @internal */
  _normalizeWeights(custom?: Partial<LatheFamilySignalBreakdown>): LatheFamilySignalBreakdown {
    return normalizeWeights(custom);
  }
  /** @internal */
  _countSignals(d: LathePartDescriptor): number {
    return countDescriptorSignals(d);
  }
  /** @internal — default weights surface so the test suite can validate weight sums. */
  _defaultWeights(): LatheFamilySignalBreakdown {
    return { ...DEFAULT_WEIGHTS };
  }
}

export const lathePartFamilyMatcherEngine = new LathePartFamilyMatcherEngine();
