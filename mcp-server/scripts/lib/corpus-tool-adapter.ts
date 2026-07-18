/**
 * corpus-tool-adapter.ts -- adapt a unified-corpus tool record to the input shape
 * `conditionMatrix()` expects, so the SAME deterministic per-(grade x toolpath)
 * cutting matrix that produced the JM crib can run over EVERY corpus tool.
 * [CORPUS-CUTTING-CORPUS] (slot:romeo, 2026-06-14)
 *
 * The corpus tool shape (verified via probe-corpus-tool-shape.ts, R12):
 *   { id, manufacturer, series, designation, type, material, coating?,
 *     physical:{cutting_diameter_mm, shank_diameter_mm, overall_length_mm, flute_length_mm},
 *     flute_count?, iso_groups?:Iso[], operations?, subtype?, source? }
 *
 * Two corpus realities this adapter handles HONESTLY (no fabrication):
 *   1. flute_count is ABSENT on most corpus (catalog-extracted) tools -> a
 *      type-driven default flute count is used; surfaced as `fluteSource`.
 *   2. cutting_diameter_mm is 0 on holder-derived / geometry-less entries ->
 *      `geometryKnown=false`; the matrix yields no RPM-based presets for those.
 *      They are still ACCOUNTED FOR (enumerated), just not preset-computable.
 *
 * NO physics constants here. NO CSV. Pure mapping + the matrix's own gate.
 */
import type { Iso } from "./jm-tool-condition-matrix.js";
import { classifyToolType } from "./jm-tool-condition-matrix.js";

export interface CorpusToolPhysical {
  cutting_diameter_mm?: number;
  shank_diameter_mm?: number;
  overall_length_mm?: number;
  flute_length_mm?: number;
}

export interface CorpusTool {
  id: string;
  manufacturer?: string;
  series?: string;
  designation?: string;
  type: string;
  material?: string;
  coating?: string;
  subtype?: string;
  physical?: CorpusToolPhysical;
  flute_count?: number;
  iso_groups?: string[];
  operations?: string[];
  source?: string;
}

/** Matrix input shape (mirrors `conditionMatrix`'s parameter). */
export interface MatrixToolInput {
  toolType: string;
  dMm: number;
  flutes: number;
  material: string;
  description: string;
}

export interface AdaptedCorpusTool {
  input: MatrixToolInput;
  /** Tool's declared ISO applicability (intersect the matrix output with this when non-empty). */
  declaredIso: Iso[];
  /** false when cutting_diameter_mm <= 0 -- accounted-for but not preset-computable. */
  geometryKnown: boolean;
  /** where the flute count came from: the record, or a type default. */
  fluteSource: "record" | "type-default";
  /** brand (manufacturer) bucket, normalized non-empty. */
  brand: string;
}

const VALID_ISO = new Set<Iso>(["P", "M", "K", "N", "S", "H"]);

/**
 * Default flute count by the classified TOOLPATHS family, used ONLY when the
 * record omits flute_count. These are conservative shop-standard tooth counts;
 * they feed feed-per-rev math, never a physics constant.
 */
function defaultFlutes(classified: string): number {
  switch (classified) {
    case "end_mill": return 4;       // general 4-flute carbide endmill
    case "face_mill": return 5;      // typical indexable face mill
    case "ball_end_mill": return 2;  // 2-flute ball typical
    case "chamfer_mill": return 2;
    case "drill": return 2;          // 2-flute twist/insert drill
    case "reamer": return 4;         // multi-flute reamer (>=4)
    case "spot_drill": return 2;
    case "tap": return 1;            // feed is pitch-locked; flutes irrelevant to feed
    case "boring_bar": return 1;     // single-point
    case "turning_tool": return 1;
    case "grooving_tool": return 1;
    case "threading_tool": return 1;
    default: return 2;
  }
}

export function normalizeBrand(mfr: string | undefined): string {
  const b = (mfr ?? "").trim();
  return b.length ? b : "unspecified";
}

/**
 * Adapt one corpus tool to the matrix input. Pure -- no engine calls, no I/O.
 * `description` is the designation/series (drives the matrix's non-ferrous
 * coating hint); `material` is the substrate (carbide/hss) the matrix's isHss
 * gate reads.
 */
export function adaptCorpusTool(tool: CorpusTool): AdaptedCorpusTool {
  const classified = classifyToolType(tool.type);
  const dMm = Number(tool.physical?.cutting_diameter_mm ?? 0);
  const geometryKnown = Number.isFinite(dMm) && dMm > 0;

  const hasRecordFlutes = Number.isFinite(tool.flute_count) && (tool.flute_count as number) > 0;
  const flutes = hasRecordFlutes ? (tool.flute_count as number) : defaultFlutes(classified);

  const declaredIso = (tool.iso_groups ?? [])
    .map((g) => String(g).toUpperCase())
    .filter((g): g is Iso => VALID_ISO.has(g as Iso));

  const description = String(tool.designation || tool.series || tool.id || "").trim();
  const material = String(tool.material || "carbide").trim() || "carbide";

  return {
    input: {
      toolType: tool.type,
      dMm: geometryKnown ? dMm : 0,
      flutes,
      material,
      description,
    },
    declaredIso,
    geometryKnown,
    fluteSource: hasRecordFlutes ? "record" : "type-default",
    brand: normalizeBrand(tool.manufacturer),
  };
}
