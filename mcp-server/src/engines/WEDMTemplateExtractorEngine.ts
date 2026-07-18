/**
 * WEDMTemplateExtractorEngine — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0 U-WCTP-TEMPLATE
 * ============================================================================
 *
 * Closed-loop ingredient — autonomous template extractor for the JM Die
 * WIRE EDM archive. Closes iter13 strategic-gap item #5: today
 * `jm-die-wedm-program-patterns.ts` ships 4 hand-authored ProgramAnalysis
 * entries (ITW SHAKEPROOF / NOZE TEST / CHOCTAW / FIOCCHI) out of 4,058
 * archive files. This engine takes raw NC program text and emits the same
 * shape automatically, so a streaming consumer can convert 22 NC programs
 * (and any future operator-uploaded programs) into machine-extracted
 * templates without manual transcription.
 *
 * Three operating modes:
 *   - parseProgram(text)      — single NC source → ExtractedProgram
 *   - extractTemplates(texts) — list of NC sources → clustered TemplateSet
 *   - selectTemplate(query)   — apply a TemplateSet over (material, taper,
 *                               thickness, tolerance) → ranked candidate(s)
 *
 * The clustering key is (axes_count, pass_count, e_code_family_prefix,
 * uses_h175_master) — matching the JM Die operator's working ontology.
 *
 * @module engines/WEDMTemplateExtractorEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Parsed shape of a single NC program. Mirrors ProgramAnalysis in
 * jm-die-wedm-program-patterns.ts so downstream consumers can swap the
 * hand-authored array for the machine-extracted one without code changes.
 */
export interface ExtractedProgram {
  filename: string;
  e_codes: string[];
  pass_count: number;
  h_offsets: Record<string, number>;
  m_codes: string[];
  g_codes: string[];
  feed_rates_ipm: number[];
  uses_taper: boolean;
  uses_h175_master: boolean;
  program_type: "2axis_straight" | "4axis_taper" | "punch_slug" | "die_opening" | "unknown";
  e_code_family: WedmECodeFamily | "unknown";
  /** Approximate part dimensions (mm) from XY ranges if extractable */
  estimated_envelope_mm?: { x_span: number; y_span: number };
  /** Customer hint from filename or header comment, if detected */
  customer_hint?: string;
}

/** Mirrors the family taxonomy in jm-die-wedm-program-patterns.ts. */
export type WedmECodeFamily =
  | "E12xx_standard_4pass"
  | "E12xx_heavy_5pass"
  | "E28xx_taper_5pass"
  | "E952_acu_7pass_thin"
  | "E56xx_acu_7pass_thick";

/**
 * Clustered template — represents a group of programs that share the same
 * structural fingerprint (family + axes + pass count + offset style).
 */
export interface WedmTemplate {
  template_id: string;
  e_code_family: WedmECodeFamily | "unknown";
  axes_count: 2 | 4;
  pass_count: number;
  uses_h175_master: boolean;
  /** Median per-pass feed rates (ipm) across the cluster's programs. */
  median_feed_rates_ipm: number[];
  /** Median per-pass H-offsets across the cluster's programs. */
  median_h_offsets: Record<string, number>;
  /** Programs that contributed to this cluster. */
  program_count: number;
  example_filenames: string[];
}

export interface WedmTemplateSet {
  templates: WedmTemplate[];
  total_programs: number;
  unparseable_count: number;
  family_distribution: Record<WedmECodeFamily | "unknown", number>;
}

export interface WedmTemplateSelectQuery {
  material?: string;
  taper_angle_deg?: number;
  thickness_mm?: number;
  tolerance_mm?: number;
  target_ra_um?: number;
}

export interface WedmTemplateSelection {
  template: WedmTemplate | null;
  reason: string;
  /** Confidence in the match (0..1) — based on family distribution + match strength. */
  confidence: number;
}

// ============================================================================
// PARSERS
// ============================================================================

const E_CODE_RE = /\bE\d{3,4}\b/gi;
const M_CODE_RE = /\bM\d{1,3}\b/gi;
const G_CODE_RE = /\bG\d{1,3}(?:\.\d)?\b/gi;
const H_OFFSET_RE = /\bH(\d{1,3})\s*=?\s*([+-]?\d+\.?\d*)/gi;
const FEED_RE = /\bF(\d+\.?\d*)\b/gi;
const TAPER_RE = /\b[UV][+-]?\d+\.?\d*/i;
const XY_COORD_RE = /\b([XY])([+-]?\d+\.?\d*)\b/g;

/**
 * Map first-E-code → family. Mirrors detectECodeFamily() in
 * jm-die-wedm-program-patterns.ts so the two stay in sync.
 */
export function classifyECodeFamily(firstECode: string | undefined): WedmECodeFamily | "unknown" {
  if (!firstECode) return "unknown";
  if (/^E12[12][1-4]$/.test(firstECode)) return "E12xx_standard_4pass";
  if (/^E128[1-5]$/.test(firstECode)) return "E12xx_heavy_5pass";
  if (/^E282[1-5]$/.test(firstECode)) return "E28xx_taper_5pass";
  if (/^E952$/.test(firstECode)) return "E952_acu_7pass_thin";
  if (/^E56[01][1-7]$/.test(firstECode)) return "E56xx_acu_7pass_thick";
  return "unknown";
}

/** Parse a single NC program text into the structured extraction shape. */
export function parseProgram(text: string, filename = "unknown.NC"): ExtractedProgram {
  const distinct = <T>(arr: T[]): T[] => Array.from(new Set(arr));

  const eCodes = distinct(text.match(E_CODE_RE) ?? []).map((s) => s.toUpperCase());
  const mCodes = distinct(text.match(M_CODE_RE) ?? []).map((s) => s.toUpperCase());
  const gCodes = distinct(text.match(G_CODE_RE) ?? []).map((s) => s.toUpperCase());

  const hOffsets: Record<string, number> = {};
  const hMatches = Array.from(text.matchAll(H_OFFSET_RE));
  for (const m of hMatches) {
    const key = `H${m[1]}`;
    const val = parseFloat(m[2]);
    if (Number.isFinite(val) && !(key in hOffsets)) hOffsets[key] = val;
  }

  const feedRates = Array.from(text.matchAll(FEED_RE))
    .map((m) => parseFloat(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 100); // sanity-filter junk feed numbers

  const usesTaper = TAPER_RE.test(text);
  const usesH175Master = /\bH175\b/i.test(text);

  // XY range → envelope estimate (mm; assume metric or operator-provided)
  const xy = Array.from(text.matchAll(XY_COORD_RE));
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const m of xy) {
    const v = parseFloat(m[2]);
    if (!Number.isFinite(v)) continue;
    if (m[1].toUpperCase() === "X") { xMin = Math.min(xMin, v); xMax = Math.max(xMax, v); }
    else { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); }
  }
  const envelope =
    Number.isFinite(xMin) && Number.isFinite(xMax) && Number.isFinite(yMin) && Number.isFinite(yMax)
      ? { x_span: xMax - xMin, y_span: yMax - yMin }
      : undefined;

  const family = classifyECodeFamily(eCodes[0]);
  const passCount = eCodes.length || 0;
  const programType: ExtractedProgram["program_type"] =
    usesTaper ? "4axis_taper" :
    eCodes.length > 0 ? "2axis_straight" :
    "unknown";

  // Customer hint from filename prefix or header comment
  const headerMatch = text.match(/^\s*\(([^)]+)\)/);
  const fileNameStem = filename.replace(/\.[^.]+$/, "");
  const customerHint =
    headerMatch?.[1].trim() ||
    fileNameStem.split(/[\s_\-/]/)[0]?.toUpperCase();

  return {
    filename,
    e_codes: eCodes,
    pass_count: passCount,
    h_offsets: hOffsets,
    m_codes: mCodes,
    g_codes: gCodes,
    feed_rates_ipm: feedRates,
    uses_taper: usesTaper,
    uses_h175_master: usesH175Master,
    program_type: programType,
    e_code_family: family,
    estimated_envelope_mm: envelope,
    customer_hint: customerHint,
  };
}

// ============================================================================
// CLUSTERING
// ============================================================================

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function clusterKey(p: ExtractedProgram): string {
  return [
    p.e_code_family,
    p.uses_taper ? "4axis" : "2axis",
    `pass${p.pass_count}`,
    p.uses_h175_master ? "h175" : "noh175",
  ].join("|");
}

/** Cluster a batch of parsed programs into structural templates. */
export function buildTemplateSet(programs: ExtractedProgram[]): WedmTemplateSet {
  const groups = new Map<string, ExtractedProgram[]>();
  let unparseable = 0;
  for (const p of programs) {
    if (p.pass_count === 0) {
      unparseable++;
      continue;
    }
    const key = clusterKey(p);
    const bucket = groups.get(key) ?? [];
    bucket.push(p);
    groups.set(key, bucket);
  }

  const templates: WedmTemplate[] = [];
  for (const [key, bucket] of groups) {
    const first = bucket[0];
    // Median feed-rate cascade — pass-by-pass across the cluster
    const maxPass = Math.max(...bucket.map((p) => p.feed_rates_ipm.length));
    const medianFeeds: number[] = [];
    for (let i = 0; i < maxPass; i++) {
      const slice = bucket.map((p) => p.feed_rates_ipm[i]).filter((v) => Number.isFinite(v));
      medianFeeds.push(median(slice));
    }
    // Median H-offsets — by register key, across the cluster
    const allKeys = new Set<string>();
    for (const p of bucket) for (const k of Object.keys(p.h_offsets)) allKeys.add(k);
    const medianOffsets: Record<string, number> = {};
    for (const k of allKeys) {
      const slice = bucket.map((p) => p.h_offsets[k]).filter((v) => Number.isFinite(v));
      if (slice.length > 0) medianOffsets[k] = median(slice);
    }
    templates.push({
      template_id: `T-${key}`,
      e_code_family: first.e_code_family,
      axes_count: first.uses_taper ? 4 : 2,
      pass_count: first.pass_count,
      uses_h175_master: first.uses_h175_master,
      median_feed_rates_ipm: medianFeeds,
      median_h_offsets: medianOffsets,
      program_count: bucket.length,
      example_filenames: bucket.slice(0, 3).map((p) => p.filename),
    });
  }

  // Family distribution telemetry
  const families: Record<WedmECodeFamily | "unknown", number> = {
    E12xx_standard_4pass: 0,
    E12xx_heavy_5pass: 0,
    E28xx_taper_5pass: 0,
    E952_acu_7pass_thin: 0,
    E56xx_acu_7pass_thick: 0,
    unknown: 0,
  };
  for (const p of programs) families[p.e_code_family] = (families[p.e_code_family] ?? 0) + 1;

  // Sort templates by program_count descending — wizard's "most-likely" first
  templates.sort((a, b) => b.program_count - a.program_count);

  return {
    templates,
    total_programs: programs.length,
    unparseable_count: unparseable,
    family_distribution: families,
  };
}

// ============================================================================
// SELECTION
// ============================================================================

const HARDENED_STEEL = /\b(D2|A2|S7|M2|H13|SKD-?11)\b/i;
const STAINLESS = /\b(stainless|304|316|17-?4)\b/i;
const HIGH_DIFFICULTY = /\b(carbide|WC[-\s]?Co|PCD|Inconel|Ti[\s-]?6Al[\s-]?4V|titanium)\b/i;
const PRECISION_TOL_MM = 0.005;
const PRECISION_RA_UM = 0.5;
const HEAVY_THICKNESS_MM = 25.4;
const VERY_HEAVY_THICKNESS_MM = 50;

/**
 * Select the best-fit template for a query. Decision tree mirrors
 * selectECodeFamily() in jm-die-wedm-tech-tables.ts but operates on the
 * machine-extracted TemplateSet (so the runtime adapts as more programs
 * land in the archive).
 */
export function selectTemplate(
  set: WedmTemplateSet,
  query: WedmTemplateSelectQuery,
): WedmTemplateSelection {
  const taperPositive = (query.taper_angle_deg ?? 0) > 0;
  const isHardSteel = !!query.material && HARDENED_STEEL.test(query.material);
  const isStainless = !!query.material && STAINLESS.test(query.material);
  const isHighDifficulty = !!query.material && HIGH_DIFFICULTY.test(query.material);
  const tightTol = query.tolerance_mm != null && query.tolerance_mm < PRECISION_TOL_MM;
  const fineRa = query.target_ra_um != null && query.target_ra_um < PRECISION_RA_UM;
  const veryThick = query.thickness_mm != null && query.thickness_mm > VERY_HEAVY_THICKNESS_MM;
  const thick = query.thickness_mm != null && query.thickness_mm > HEAVY_THICKNESS_MM;

  // High-difficulty + precision → 7-pass acu thin/thick families if available
  if (isHighDifficulty && (tightTol || fineRa)) {
    const thin = set.templates.find((t) => t.e_code_family === "E952_acu_7pass_thin");
    const thickAcu = set.templates.find((t) => t.e_code_family === "E56xx_acu_7pass_thick");
    const preferred = veryThick ? thickAcu ?? thin : thin ?? thickAcu;
    if (preferred) {
      return {
        template: preferred,
        reason: `High-difficulty material + precision target → 7-pass acu family (${preferred.e_code_family})`,
        confidence: 0.9,
      };
    }
  }

  // Taper present → E28xx
  if (taperPositive) {
    const taper = set.templates.find((t) => t.e_code_family === "E28xx_taper_5pass");
    if (taper) {
      const conf = isStainless || isHardSteel ? 0.95 : 0.75;
      return {
        template: taper,
        reason: `Taper > 0° + ${isStainless ? "stainless" : isHardSteel ? "tool steel" : "material"} → E28xx 5-pass UV taper`,
        confidence: conf,
      };
    }
  }

  // Heavy / tight-tol / fine-Ra → 5-pass heavy
  if (isHardSteel && (veryThick || tightTol || fineRa || (thick && (tightTol || fineRa)))) {
    const heavy = set.templates.find((t) => t.e_code_family === "E12xx_heavy_5pass");
    if (heavy) {
      return {
        template: heavy,
        reason: `Hardened steel + (thick > ${VERY_HEAVY_THICKNESS_MM} mm OR tolerance < ${PRECISION_TOL_MM} mm OR Ra < ${PRECISION_RA_UM} µm) → E12xx heavy 5-pass`,
        confidence: 0.9,
      };
    }
  }

  // Default workhorse → standard 4-pass
  if (isHardSteel || (!query.material && !taperPositive)) {
    const standard = set.templates.find((t) => t.e_code_family === "E12xx_standard_4pass");
    if (standard) {
      return {
        template: standard,
        reason: `Standard 2-axis hardened-steel job → E12xx standard 4-pass workhorse cycle`,
        confidence: 0.85,
      };
    }
  }

  // No calibrated template found
  return {
    template: null,
    reason: `No JM Die-calibrated template matches material=${query.material ?? "<unspecified>"} taper=${query.taper_angle_deg ?? 0}° thk=${query.thickness_mm ?? "?"}mm — fall back to operator-dialed conditions`,
    confidence: 0,
  };
}

// ============================================================================
// ENGINE
// ============================================================================

class WEDMTemplateExtractorEngine {
  /** Single-program parse. */
  parseProgram(text: string, filename = "unknown.NC"): ExtractedProgram {
    return parseProgram(text, filename);
  }

  /** Batch extract — accepts (text, filename) tuples and emits the clustered TemplateSet. */
  extractTemplates(
    sources: ReadonlyArray<{ text: string; filename?: string }>,
  ): WedmTemplateSet {
    const parsed = sources.map((s) => parseProgram(s.text, s.filename ?? "unknown.NC"));
    return buildTemplateSet(parsed);
  }

  /** Apply selection decision tree over a TemplateSet. */
  selectTemplate(set: WedmTemplateSet, query: WedmTemplateSelectQuery): WedmTemplateSelection {
    return selectTemplate(set, query);
  }

  /** Classify a single E-code into its family — exposed for downstream consumers. */
  classifyECodeFamily(firstECode: string | undefined): WedmECodeFamily | "unknown" {
    return classifyECodeFamily(firstECode);
  }
}

export const wedmTemplateExtractorEngine = new WEDMTemplateExtractorEngine();
