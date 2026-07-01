/**
 * fold-helical-end-mills-to-cam-libraries.ts
 * [JM-FUSION-TOOLS]/U-HELICAL-FOLD-CAM (slot:romeo, operator-directed 2026-06-18).
 *
 * Produces STANDALONE importable Helical Solutions end-mill libraries for Mastercam
 * (.mcam-tools JSON) + hyperMILL (.hmt SQL), reusing the PROVEN exporters
 * (MastercamToolExportEngine / HyperMillToolExportEngine -- the same path that
 * generates JM_CRIB). The 2485 Helical end mills were operator-confirmed +
 * attributed in unknown-vendor-tools.json (commit d953b3c077).
 *
 * WHY STANDALONE (not via generate-jm-cam-libraries.ts):
 *  - That generator reads the crib SOURCE dir; the Fusion all-conditions generator
 *    reads the SAME dir and EXPLODES to 508MB on 2485 tools (>GitHub 100MB push
 *    limit). Reading the 2485 from unknown-vendor-tools.json directly avoids
 *    polluting the crib dir, so neither generator re-explodes.
 *  - Mastercam/.hmt are per-MATERIAL only (6/tool), NOT per-toolpath, so the
 *    output stays small (~MB), unlike the Fusion all-conditions.
 *
 * UNITS: the Helical source is ALREADY METRIC (cutting_diameter_mm etc.); the
 * exporters expect mm -> pass through verbatim, NO 25.4x conversion (no scale risk).
 *
 * GAUGE (collision-conservative): gauge_length_mm = overall_length_mm (tool fully
 * extended, holder modeled at the shank top => holder near the work => collision
 * detection errs toward CATCHING collisions; programmer extends per-job).
 *
 * Run: cd mcp-server && npx tsx scripts/fold-helical-end-mills-to-cam-libraries.ts
 */
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { mastercamToolExportEngine } from "../src/engines/MastercamToolExportEngine.js";
import { hyperMillToolExportEngine } from "../src/engines/HyperMillToolExportEngine.js";

const UNKNOWN = "H:/prism/state/shared/jm-fusion-tools/unknown-vendor-tools.json";
const OUT_DIR = "H:/prism/state/shared/jm-fusion-tools/helical-end-mills";
const HELICAL_VENDOR = "Helical Solutions";

const d = JSON.parse(readFileSync(UNKNOWN, "utf-8"));
const all: any[] = Array.isArray(d) ? d : (d.tools || Object.values(d).find((v) => Array.isArray(v)) || []);
// Exclude geometry_suspect tools (flute>OAL with unknown true LOC, flagged by fix-helical-source-geometry.mjs)
// -- never ship physically-impossible collision geometry to a CAM; they await a Docustrata/catalog LOC lookup.
const eligible = all.filter((t) => t.brand === HELICAL_VENDOR && t.type === "end_mill");
const excluded = eligible.filter((t) => t.geometry_suspect);
const helical = eligible.filter((t) => !t.geometry_suspect);
if (excluded.length) console.log(`Excluded ${excluded.length} geometry_suspect tool(s) from shipped libs: ${excluded.map((t) => t.designation).join(", ")}`);
if (helical.length === 0) { console.error("FATAL: no Helical end mills (run attribution first)"); process.exit(1); }

// Map to the PRISMTool shape the exporters consume (geometry already mm -> verbatim).
const tools = helical.map((t) => {
  const diaMm = t.cutting_diameter_mm;
  const shankMm = t.shank_diameter_mm ?? diaMm;
  const fluteLenMm = t.flute_length_mm;
  const oalMm = t.overall_length_mm;
  const cornerMm = t.corner_radius_mm ?? undefined;
  const nFlutes = Number.isFinite(t.flute_count) && t.flute_count > 0 ? t.flute_count : undefined;
  const gaugeMm = oalMm > 0 ? oalMm : (fluteLenMm > 0 ? fluteLenMm * 4 : undefined); // conservative
  return {
    tool_type: "endmill", type: "endmill",
    physical: {
      cutting_diameter_mm: diaMm, diameter_mm: diaMm, shank_diameter_mm: shankMm,
      flute_length_mm: fluteLenMm, overall_length_mm: oalMm, corner_radius_mm: cornerMm,
      flute_count: nFlutes, flutes: nFlutes,
    },
    diameter_mm: diaMm, cutting_diameter_mm: diaMm, shank_diameter_mm: shankMm,
    flute_length_mm: fluteLenMm, overall_length_mm: oalMm, corner_radius_mm: cornerMm,
    flutes: nFlutes, flute_count: nFlutes,
    manufacturer: HELICAL_VENDOR, brand: HELICAL_VENDOR,
    designation: t.designation, part_number: t.designation, description: t.designation,
    material: "carbide", gauge_length_mm: gaugeMm,
  };
}).filter((t) => t.cutting_diameter_mm > 0); // need a real diameter

if (tools.length === 0) { console.error("FATAL: 0 Helical tools had a valid diameter"); process.exit(1); }

// Reuse the proven exporters (same path that builds JM_CRIB) -- compute BOTH before writing.
const mcam: any = mastercamToolExportEngine.exportFromTools(tools, "JM-HELICAL-END-MILLS", "mcam-tools");
const hmt: any = hyperMillToolExportEngine.exportToHMT(tools);
const hmtSql: string =
  typeof hmt?.sqlite_schema === "string" && Array.isArray(hmt?.insert_statements)
    ? `${hmt.sqlite_schema}\n\n${hmt.insert_statements.join("\n")}`
  : typeof hmt?.sql === "string" ? hmt.sql
  : (() => { console.error(`FATAL: exportToHMT unrecognized shape: keys=[${Object.keys(hmt || {}).join(", ")}]`); process.exit(1); })();

mkdirSync(OUT_DIR, { recursive: true });
const mcamPath = join(OUT_DIR, mcam.file_name || "JM-HELICAL-END-MILLS.mcam-tools");
const hmtPath = join(OUT_DIR, "JM-HELICAL-END-MILLS.hmt.sql");
writeFileSync(mcamPath, mcam.library_data, "utf-8");
writeFileSync(hmtPath, hmtSql, "utf-8");

const mb = (p: string) => (statSync(p).size / 1e6).toFixed(2) + "MB";
console.log(`Helical tools exported: ${tools.length}`);
console.log(`Mastercam: ${mcam.file_name} (${mcam.tool_count} tools, ${mb(mcamPath)})`);
console.log(`hyperMILL: JM-HELICAL-END-MILLS.hmt.sql (${mb(hmtPath)})`);
console.log(`Output: ${OUT_DIR}`);
