/**
 * WEDMPartFamilyMatcherEngine
 * ================================
 *
 * Given a WEDMPartDescriptor (geometry / material / customer / kind / filename
 * hints), returns the corpus families ranked by similarity. Consumes the
 * templates produced by `WEDMPartFamilyTemplateExtractorEngine` (U-TL-U4) —
 * never re-scans the source corpus and never emits runnable code.
 *
 * Query-side companion to the U4 extractor, mirroring
 * LathePartFamilyMatcherEngine (U-TL-U1's matcher) and
 * MillPartFamilyMatcherEngine. Without it the extracted WEDM corpora are
 * inert; with it, downstream consumers (MACRO-PROGRAM-PIPELINE, master-post,
 * dialect resolution, CAD/CAM AI) can anchor inference to a validated family
 * before specialising further.
 *
 * Owns (per spec H:/prism/state/shared/specs/TRAINING-LEARNING-MS0-2026-05-12.md, U-TL-U5):
 *   - matchPartFamily(descriptor, opts?)  → ranked WEDMMatchResult[]
 *   - inferFromFilename(filename)          → Partial<WEDMPartDescriptor>
 *   - listFamilies()                       → known family taxonomy
 *
 * Wires to (per WIRE-TO-ALL-SOURCES rule):
 *   - prism_edm: wedm_part_family_match                (primary)
 *   - prism_intelligence: match_part_family_wedm       (cross-domain unified query)
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
 * Safety / hygiene:
 *   - READ-ONLY against the on-disk corpus.
 *   - NEVER throws on missing templates — returns ok:false with a discriminated
 *     error token.
 *   - NEVER emits runnable G-code or WEDM controller dialect output.
 *   - Empty descriptors (no signals populated) return `error: "empty_descriptor"`.
 *
 * @module engines/WEDMPartFamilyMatcherEngine
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U5-DOMAIN-MATCHERS
 * @version 1.0.0
 */

import {
  wedmPartFamilyTemplateExtractorEngine,
  WEDM_TEMPLATE_FAMILIES,
  type WEDMTemplateFamily,
  type WEDMTrainingTemplate,
} from "./WEDMPartFamilyTemplateExtractorEngine.js";

// ───────────────────────────────────────────────────────────────────────────────
// Public types

export interface WEDMPartDescriptor {
  /** Workpiece thickness (Z) in mm — drives pass-count + flushing planning. */
  thickness_mm?: number;
  /** Bounding-box length in mm (X). */
  length_mm?: number;
  /** Bounding-box width in mm (Y). */
  width_mm?: number;
  /** Profile cut length (perimeter) in mm — used as a lower-priority signal. */
  profile_length_mm?: number;
  /** Whether the part has at least one taper feature. */
  hasTaper?: boolean;
  /** Whether the part requires sub-micron tolerance (pcd/aerospace bias). */
  hasSubMicronTol?: boolean;
  /** Whether the part has internal cutouts (closed pockets requiring start-holes). */
  hasInternalCutouts?: boolean;
  /** Free-form material designator (e.g., "Carbide C2", "Inconel 718", "PCD"). */
  material?: string;
  /** Customer code from the JM Die taxonomy (e.g., "ITW", "Holo-Krome"). */
  customer?: string;
  /** Original source filename — used by inferFromFilename + filename signal. */
  source_filename?: string;
  /** Tightest tolerance on the part in mm — used as a lower-priority signal. */
  tightestTolerance_mm?: number;
  /** Free-form feature tokens (e.g., ["punch", "taper", "internal-cutout"]). */
  features?: string[];
  /** Caller-provided family kind hint (e.g., "carbide-die-insert", "punch-die"). */
  kind?: string;
  /** File extension lowercased without leading dot (e.g., "min", "nc", "dxf", "sldprt"). */
  ext?: string;
}

export interface WEDMFamilySignalBreakdown {
  kind: number;
  filename: number;
  ext: number;
  customer: number;
  material: number;
  features: number;
}

export interface WEDMMatchResult {
  family: WEDMTemplateFamily;
  /** Composite similarity in [0..1]. */
  similarity: number;
  /** Lower confidence bound — widens when few descriptor signals are populated. */
  confidenceLow: number;
  /** Upper confidence bound — widens when few descriptor signals are populated. */
  confidenceHigh: number;
  /** Per-signal sub-scores in [0..1]. */
  signals: WEDMFamilySignalBreakdown;
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

export interface WEDMMatchSuccess {
  ok: true;
  matches: WEDMMatchResult[];
  /** Number of families with a loaded template / total known families ∈ [0..1]. */
  corpus_coverage: number;
  /** Total families evaluated (always === WEDM_TEMPLATE_FAMILIES.length). */
  families_evaluated: number;
  /** Number of descriptor fields that contributed a non-zero signal. */
  descriptor_signals_present: number;
}

export interface WEDMMatchError {
  ok: false;
  error: "empty_descriptor" | "no_match" | "corpus_unreadable";
  detail?: string;
}

export interface WEDMMatchOptions {
  /** Override default top-K (default 5; caps at WEDM_TEMPLATE_FAMILIES.length). */
  topK?: number;
  /** Drop results below this similarity (default 0.05). */
  minSimilarity?: number;
  /** Override the on-disk template directory (forwarded to the extractor's
   *  `getTemplate({outDir})` — same env-knob path resolution applies). */
  dir?: string;
  /** Custom signal weights (must sum to 1.0; out-of-range values rejected). */
  weights?: Partial<WEDMFamilySignalBreakdown>;
  /** When true, never read templates from disk — match against keywords only. */
  keywordsOnly?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────────
// Keyword / heuristic tables — mirrors phaseXX-wedm-template-corpus-scan.py
// scope + the U-TL-U4 family taxonomy.

const FAMILY_KIND_KEYWORDS: Record<WEDMTemplateFamily, ReadonlyArray<string>> = {
  "taptite-electrode": ["taptite-electrode", "taptite", "trilobe-edm", "electrode-wire"],
  "carbide-die-insert": ["carbide-die-insert", "carbide-die", "carbide", "tungsten-carbide"],
  "punch-die": ["punch-die", "punch", "blanking-die", "forming-die"],
  "pcd-tipped-tooling": ["pcd-tipped-tooling", "pcd", "polycrystalline-diamond", "diamond-tip"],
  "aerospace-fir-tree": ["aerospace-fir-tree", "fir-tree", "blade-root", "turbine-blade"],
  "mold-insert": ["mold-insert", "mold", "die-insert", "cavity-insert"],
  "unknown": [],
};

/** Filename regex patterns — matched case-insensitively. */
const FAMILY_FILENAME_PATTERNS: Record<WEDMTemplateFamily, ReadonlyArray<RegExp>> = {
  "taptite-electrode": [/(?<!\w)taptite(?!\w)/i, /(?<!\w)electrode(?!\w)/i, /(?<!\w)trilobe(?!\w)/i],
  "carbide-die-insert": [/(?<!\w)carbide(?!\w)/i, /\bc[-_ ]?[12]\b(?!\w)/i, /(?<!\w)tungsten(?!\w)/i],
  "punch-die": [/(?<!\w)punch(?!\w)/i, /(?<!\w)blanking(?!\w)/i, /(?<!\w)die(?!\w)/i, /(?<!\w)forming(?!\w)/i],
  "pcd-tipped-tooling": [/(?<!\w)pcd(?!\w)/i, /(?<!\w)diamond(?!\w)/i],
  "aerospace-fir-tree": [/(?<!\w)fir[-_ ]?tree(?!\w)/i, /(?<!\w)blade[-_ ]?root(?!\w)/i, /(?<!\w)turbine(?!\w)/i],
  "mold-insert": [/(?<!\w)mold(?!\w)/i, /(?<!\w)insert(?!\w)/i, /(?<!\w)cavity(?!\w)/i],
  "unknown": [],
};

/** Material → family bias map. Keys are lowercased substrings; descriptor.material
 *  is searched for these as substrings (case-insensitive). One material may bias
 *  multiple families, with weight split equally among the listed targets. */
const MATERIAL_FAMILY_BIAS: ReadonlyArray<{ pattern: RegExp; families: ReadonlyArray<WEDMTemplateFamily> }> = [
  { pattern: /\bcarbide\b|\bwc\b|tungsten.?carbide|\bc-?[12]\b|\bc-?10\b/i, families: ["carbide-die-insert"] },
  { pattern: /\bpcd\b|polycrystalline.?diamond|diamond.?tip/i, families: ["pcd-tipped-tooling"] },
  { pattern: /\bcopper\b|\bcu\b|c11\d|c10\d/i, families: ["taptite-electrode"] },
  { pattern: /\bgraphite\b|\bedm[-_ ]?3\b|poco/i, families: ["taptite-electrode", "mold-insert"] },
  { pattern: /\ba2\b|\bd2\b|\bo1\b|\bm2\b|\bcpm\b|tool.?steel/i, families: ["punch-die", "mold-insert"] },
  { pattern: /\bp20\b|\bh13\b|\b420\b|\bs7\b/i, families: ["mold-insert", "punch-die"] },
  { pattern: /\binconel\b|\b718\b|\b625\b|rene|hastelloy/i, families: ["aerospace-fir-tree"] },
  { pattern: /\btitanium\b|\bti.?6al/i, families: ["aerospace-fir-tree"] },
  { pattern: /\bstainless\b|\bss\b|\b303\b|\b304\b|\b316\b|\b17-?4\b/i, families: ["punch-die", "mold-insert"] },
  { pattern: /\b1018\b|\b1020\b|\b1045\b/i, families: ["punch-die"] },
];

/** Family feature keyword sets — Jaccard target for descriptor.features. */
const FAMILY_FEATURE_KEYWORDS: Record<WEDMTemplateFamily, ReadonlyArray<string>> = {
  "taptite-electrode": ["taptite", "trilobe", "electrode-wire", "thread-rolling", "shank"],
  "carbide-die-insert": ["carbide-die", "tight-tolerance", "hard-material", "submicron-finish", "tungsten"],
  "punch-die": ["punch", "die", "blanking", "forming", "land", "relief", "shear-angle"],
  "pcd-tipped-tooling": ["pcd-tip", "diamond", "extreme-tolerance", "sub-micron"],
  "aerospace-fir-tree": ["fir-tree", "blade-root", "turbine-airfoil", "dovetail", "AS9100"],
  "mold-insert": ["mold-cavity", "insert", "ejector-hole", "venting-slot", "parting-line"],
  "unknown": [],
};

/** Default signal weights — sum to 1.0 (mirrors lathe + mill siblings). */
const DEFAULT_WEIGHTS: WEDMFamilySignalBreakdown = {
  kind: 0.30,
  filename: 0.20,
  features: 0.20,
  material: 0.15,
  customer: 0.10,
  ext: 0.05,
};

// ───────────────────────────────────────────────────────────────────────────────
// Internal helpers (same shape as lathe/mill siblings — kept local to avoid coupling)

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function normalizeWeights(custom?: Partial<WEDMFamilySignalBreakdown>): WEDMFamilySignalBreakdown {
  if (!custom) return DEFAULT_WEIGHTS;
  const merged: WEDMFamilySignalBreakdown = { ...DEFAULT_WEIGHTS };
  for (const k of Object.keys(custom) as Array<keyof WEDMFamilySignalBreakdown>) {
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

function kindSignal(family: WEDMTemplateFamily, kind: string | undefined): number {
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

function filenameSignal(family: WEDMTemplateFamily, filename: string | undefined): number {
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
  family: WEDMTemplateFamily,
  ext: string | undefined,
  template: WEDMTrainingTemplate | null,
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
  family: WEDMTemplateFamily,
  customer: string | undefined,
  template: WEDMTrainingTemplate | null,
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

function materialSignal(family: WEDMTemplateFamily, material: string | undefined): number {
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

function featuresSignal(family: WEDMTemplateFamily, features: ReadonlyArray<string> | undefined): number {
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

function countDescriptorSignals(d: WEDMPartDescriptor): number {
  let n = 0;
  if (typeof d.kind === "string" && d.kind.length > 0) n++;
  if (typeof d.source_filename === "string" && d.source_filename.length > 0) n++;
  if (typeof d.ext === "string" && d.ext.length > 0) n++;
  if (typeof d.customer === "string" && d.customer.length > 0) n++;
  if (typeof d.material === "string" && d.material.length > 0) n++;
  if (Array.isArray(d.features) && d.features.length > 0) n++;
  return n;
}

function buildRationale(family: WEDMTemplateFamily, sig: WEDMFamilySignalBreakdown): string[] {
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

export class WEDMPartFamilyMatcherEngine {
  /** Heuristic descriptor inference from a filename — used by callers that have
   *  a part-program path but no structured descriptor yet.
   *
   * @param filename — absolute or relative path; only basename + extension are used.
   * @returns Partial<WEDMPartDescriptor>
   */
  inferFromFilename(filename: string): Partial<WEDMPartDescriptor> {
    if (typeof filename !== "string" || filename.length === 0) {
      return {};
    }
    const baseRaw = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
    const dot = baseRaw.lastIndexOf(".");
    const stem = dot > 0 ? baseRaw.slice(0, dot) : baseRaw;
    const ext = dot > 0 ? baseRaw.slice(dot + 1).toLowerCase() : "";
    const out: Partial<WEDMPartDescriptor> = { source_filename: baseRaw };
    if (ext) out.ext = ext;
    for (const fam of WEDM_TEMPLATE_FAMILIES) {
      const patterns = FAMILY_FILENAME_PATTERNS[fam];
      if (patterns.some((re) => re.test(stem))) {
        out.kind = fam;
        break;
      }
    }
    return out;
  }

  /** List the family taxonomy known to this matcher. */
  listFamilies(): ReadonlyArray<WEDMTemplateFamily> {
    return WEDM_TEMPLATE_FAMILIES;
  }

  /** Score every family against the descriptor and return the top-K ranked matches.
   *
   * @param descriptor — WEDMPartDescriptor with at least one populated signal field
   * @param opts        — optional weights / topK / minSimilarity / dir overrides
   * @returns WEDMMatchSuccess on success or WEDMMatchError discriminator
   */
  matchPartFamily(
    descriptor: WEDMPartDescriptor,
    opts: WEDMMatchOptions = {},
  ): WEDMMatchSuccess | WEDMMatchError {
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
    const effectiveTopK = Math.min(requestedTopK, WEDM_TEMPLATE_FAMILIES.length);
    const minSimilarity =
      typeof opts.minSimilarity === "number" && Number.isFinite(opts.minSimilarity)
        ? clamp01(opts.minSimilarity)
        : 0.05;

    const templates: Map<WEDMTemplateFamily, WEDMTrainingTemplate | null> = new Map();
    let loaded = 0;
    let loadFailed = false;
    for (const fam of WEDM_TEMPLATE_FAMILIES) {
      if (opts.keywordsOnly) {
        templates.set(fam, null);
        continue;
      }
      try {
        // WEDM extractor's ListOpts uses `outDir` — public matcher API stays on
        // `dir` for cross-domain parity; the rename only happens at this call site.
        const t = wedmPartFamilyTemplateExtractorEngine.getTemplate(fam, { outDir: opts.dir });
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
        const list = wedmPartFamilyTemplateExtractorEngine.listTemplates({ outDir: opts.dir });
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

    const results: WEDMMatchResult[] = [];
    for (const fam of WEDM_TEMPLATE_FAMILIES) {
      const t = templates.get(fam) ?? null;
      const sig: WEDMFamilySignalBreakdown = {
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
      corpus_coverage: loaded / WEDM_TEMPLATE_FAMILIES.length,
      families_evaluated: WEDM_TEMPLATE_FAMILIES.length,
      descriptor_signals_present: signalsPresent,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Test surfaces — prefixed `_`; not part of the public API.

  /** @internal */
  _signal_kind(family: WEDMTemplateFamily, kind?: string): number {
    return kindSignal(family, kind);
  }
  /** @internal */
  _signal_filename(family: WEDMTemplateFamily, filename?: string): number {
    return filenameSignal(family, filename);
  }
  /** @internal */
  _signal_material(family: WEDMTemplateFamily, material?: string): number {
    return materialSignal(family, material);
  }
  /** @internal */
  _signal_features(family: WEDMTemplateFamily, features?: string[]): number {
    return featuresSignal(family, features);
  }
  /** @internal */
  _normalizeWeights(custom?: Partial<WEDMFamilySignalBreakdown>): WEDMFamilySignalBreakdown {
    return normalizeWeights(custom);
  }
  /** @internal */
  _countSignals(d: WEDMPartDescriptor): number {
    return countDescriptorSignals(d);
  }
  /** @internal */
  _defaultWeights(): WEDMFamilySignalBreakdown {
    return { ...DEFAULT_WEIGHTS };
  }
}

export const wedmPartFamilyMatcherEngine = new WEDMPartFamilyMatcherEngine();
