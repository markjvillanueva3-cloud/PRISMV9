/**
 * generate-jm-cam-libraries.ts
 * [JM-FUSION-TOOLS]/U-CAM-PROPAGATE (slot:romeo)
 *
 * Propagates JM Die's tool crib to hyperMILL (.hmt SQL) + Mastercam (.mcam-tools JSON)
 * using the EXISTING exporters: HyperMillToolExportEngine.exportToHMT(tools[]) and
 * MastercamToolExportEngine.exportFromTools(tools[]). Both derive per-ISO-group cutting
 * data from UltimateSpeedFeedEngine -- which already carries U-SFC-GAPS + the hardened-
 * drilling safety fix -- so those CAMs inherit the safe/expanded speeds for free.
 *
 * This is Option B (per-ISO-group parity): hyperMILL + Mastercam get safety-correct,
 * SFC-improved per-material cutting data for every JM tool, at full JM geometry. The
 * per-grade x per-toolpath atomicity stays Fusion-specific (Option A = a future exporter
 * enhancement). Geometry is parsed from JM's source Fusion CSVs; JM = INCH -> mm (x25.4),
 * gated on the tool_unit field (units-first: a missed conversion is a 25.4x scale error).
 *
 * Run: cd mcp-server && npx tsx scripts/generate-jm-cam-libraries.ts
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { mastercamToolExportEngine } from "../src/engines/MastercamToolExportEngine.js";
import { hyperMillToolExportEngine } from "../src/engines/HyperMillToolExportEngine.js";

const SRC_DIRS = [
  "H:/prism/resources/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY",
  "H:/prism/resources/FUSION360/tool-library",
];
const OUT_DIR = "H:/prism/state/shared/jm-fusion-tools/cam-libraries";
const MM_PER_IN = 25.4;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
/** internal CSV key = the parenthesized token, e.g. "Diameter (tool_diameter)" -> "tool_diameter". */
function colKey(h: string): string {
  const m = h.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : h;
}

interface PRISMTool { [k: string]: any; }

function main(): void {
  const srcDir = SRC_DIRS.find((d) => existsSync(d));
  if (!srcDir) { console.error(`FATAL: no JM Fusion CSV source dir. Tried:\n  ${SRC_DIRS.join("\n  ")}`); process.exit(1); }
  const csvs = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith(".csv"));
  if (csvs.length === 0) { console.error(`FATAL: no .csv in ${srcDir}`); process.exit(1); }

  const tools: PRISMTool[] = [];
  for (const file of csvs) {
    const lines = readFileSync(join(srcDir, file), "utf-8").split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) continue;
    const header = parseCsvLine(lines[0]).map(colKey);
    const ix = (key: string) => header.indexOf(key);
    for (let li = 1; li < lines.length; li++) {
      const f = parseCsvLine(lines[li]);
      if (f.length < 5) continue;
      const get = (key: string): string => { const i = ix(key); return i >= 0 && i < f.length ? f[i] : ""; };
      const num = (key: string): number | undefined => { const v = parseFloat(get(key)); return Number.isFinite(v) ? v : undefined; };
      // UNITS FIRST: JM crib is inches; convert geometry to mm (x25.4) unless the row says mm.
      const isInch = (get("tool_unit") || "inches").toLowerCase() !== "mm";
      const k = isInch ? MM_PER_IN : 1;
      const dia = num("tool_diameter");
      if (dia == null || !(dia > 0)) continue; // need a real diameter
      const scale = (key: string): number | undefined => { const v = num(key); return v != null ? v * k : undefined; };
      const diaMm = dia * k;
      const shankMm = scale("tool_shaftDiameter") ?? diaMm;
      const fluteLenMm = scale("tool_fluteLength");
      const oalMm = scale("tool_overallLength");
      const cornerMm = scale("tool_cornerRadius");
      const nFlutes = num("tool_numberOfFlutes");
      const toolType = get("tool_type") || "endmill";
      const mfr = get("holder_vendor") || get("tool_vendor") || "JM Die";
      const desc = get("tool_description");
      tools.push({
        tool_type: toolType,
        type: toolType, // both engines read `type ?? tool_type`; set both (no priority surprise)
        // CANONICAL nested geometry. HyperMillToolExportEngine.buildGeomParams reads geometry
        // ONLY from prismTool.physical (-> 10mm default if absent = silent scale corruption);
        // MastercamToolExportEngine reads phys.X ?? flat.X. So nest here AND keep flat below.
        // All values mm (JM crib is inch; converted x25.4 above). undefined => engine defaults.
        physical: {
          cutting_diameter_mm: diaMm,
          diameter_mm: diaMm,
          shank_diameter_mm: shankMm,
          flute_length_mm: fluteLenMm,
          overall_length_mm: oalMm,
          corner_radius_mm: cornerMm,
          flute_count: nFlutes,
          flutes: nFlutes,
        },
        diameter_mm: diaMm,
        cutting_diameter_mm: diaMm,
        shank_diameter_mm: shankMm,
        flute_length_mm: fluteLenMm,
        overall_length_mm: oalMm,
        corner_radius_mm: cornerMm,
        flutes: nFlutes,
        flute_count: nFlutes,
        manufacturer: mfr,
        brand: mfr,
        designation: desc,
        part_number: desc,
        description: desc,
        material: get("tool_material") || "carbide",
        holder_type: get("tool_holderType"),
        gauge_length_mm: scale("tool_holderGaugeLength"),
      });
    }
  }

  if (tools.length === 0) { console.error("FATAL: parsed 0 tools from JM source CSVs"); process.exit(1); }

  // Compute BOTH exports BEFORE writing either, so a throw in the second export
  // never leaves a misleading partial library on disk (all-or-nothing output).
  const mcam = mastercamToolExportEngine.exportFromTools(tools, "JM_CRIB", "mcam-tools");

  const hmt: any = hyperMillToolExportEngine.exportToHMT(tools);
  // HMToolExportResult shape is defensive-read: prefer schema + INSERTs. If the
  // engine ever returns an unrecognized shape, FAIL LOUD (R12) -- never silently
  // write JSON into a .hmt.sql that looks valid but cannot be built into SQLite.
  const hmtSql: string =
    typeof hmt?.sqlite_schema === "string" && Array.isArray(hmt?.insert_statements)
      ? `${hmt.sqlite_schema}\n\n${hmt.insert_statements.join("\n")}`
    : typeof hmt?.sql === "string" ? hmt.sql
    : typeof hmt?.schema === "string" && Array.isArray(hmt?.inserts) ? `${hmt.schema}\n\n${hmt.inserts.join("\n")}`
    : (() => { console.error(`FATAL: exportToHMT returned unrecognized shape: keys=[${Object.keys(hmt || {}).join(", ")}]`); process.exit(1); })();

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, mcam.file_name), mcam.library_data, "utf-8");
  writeFileSync(join(OUT_DIR, "JM_CRIB.hmt.sql"), hmtSql, "utf-8");

  console.log(`Parsed ${tools.length} JM tools from ${csvs.length} source CSVs.`);
  console.log(`Mastercam: ${mcam.file_name} (${mcam.tool_count} tools)`);
  console.log(`hyperMILL: JM_CRIB.hmt.sql (result keys: ${Object.keys(hmt || {}).join(", ")})`);
  console.log(`Output: ${OUT_DIR}`);
}

main();
