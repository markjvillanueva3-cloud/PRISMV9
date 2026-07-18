/**
 * jmdie-mill-proven-samples -- curated JM-Die PROVEN mill catalog -> ChipLoadSample[].
 * U-SFC-PROVEN-MILL-CATALOG-SEED (slot:oscar).
 *
 * The corpus mill G-code yield is thin (most JM mill files are Mastercam .mcx
 * binaries, not parseable G-code -- reference_oscar_mill_proven_path_broken_2026_06_21),
 * so this folds the hand-curated PROVEN PRG catalog (FONTANA grip blocks + SFS
 * guided backstops -- die/tool-steel HSM) into the proven store as a high-quality seed,
 * consumed by ProvenSpeedFeedAggregatorEngine.aggregateMillData via the proven-S/F harness.
 *
 * UNITS (units-first rail): JM Die programs are INCH (G20). The catalog feed is ipm,
 * which matches the corpus feed_rate (also ipm, extracted from inch-program F-words) --
 * NO conversion. Diameter IS normalized to mm (diameter_mm preferred; diameter_inch*25.4
 * fallback) because ChipLoadSample.diameter_mm is metric. chip_load is left null (the
 * catalog carries no flute count to derive feed/(rpm*flutes)).
 */
import type { ChipLoadSample } from "../MillPatternMinerEngine.js";
import { JM_DIE_PROVEN_MILL_PROGRAMS } from "../../data/jmdie-proven-mill-programs.js";

const INCH_TO_MM = 25.4;

/**
 * Classify a catalog tool into the operation keyword aggregateMillData understands
 * (mapMillOperation: rough|finish|pocket|contour|drill|bore). Tool-type first (most
 * reliable), then program-level operation hints for the flat-endmill workhorse.
 */
export function catalogToolOperation(toolType: string, opsDetected: string[]): string {
  if (toolType === "drill" || toolType === "tap") return "drilling";
  if (toolType === "face_mill") return "facing";
  if (toolType === "ball_endmill" || toolType === "chamfer") return "finishing"; // 3D surfacing / finish per PROVEN_TOOL_PATTERNS
  const ops = opsDetected.map((o) => o.toLowerCase());
  if (ops.some((o) => o.includes("pocket"))) return "pocketing";
  if (ops.some((o) => o.includes("finish"))) return "finishing";
  return "roughing";
}

/** Map the curated PROVEN mill catalog to ChipLoadSample[] for aggregateMillData. */
export function jmdieMillProvenSamples(): ChipLoadSample[] {
  const out: ChipLoadSample[] = [];
  for (const prog of JM_DIE_PROVEN_MILL_PROGRAMS) {
    for (const t of prog.tools_used) {
      const diameter_mm =
        t.diameter_mm ?? (t.diameter_inch != null ? t.diameter_inch * INCH_TO_MM : null);
      out.push({
        program: prog.file_path,
        tool_number: t.t_num,
        tool_desc: t.description,
        diameter_mm,
        flute_count: null,
        rpm: t.rpm,
        feed_rate: t.feed,
        chip_load: null,
        operation: catalogToolOperation(t.tool_type, prog.operations_detected),
      });
    }
  }
  return out;
}
