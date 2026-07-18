/**
 * fold-helical-end-mills-to-crib-source.mjs
 * [JM-FUSION-TOOLS]/U-HELICAL-FOLD (slot:romeo, operator-directed 2026-06-18 "fold ALL").
 *
 * Folds the 2485 operator-confirmed Helical Solutions end mills (attributed in
 * unknown-vendor-tools.json, commit d953b3c077) into the JM crib SOURCE as a
 * Fusion CSV_TOOLS_VERSION_1 file, so they flow through the existing generators
 * into all 3 CAM libraries with cutting params (matrix-driven) + collision geometry.
 *
 * SAFETY (shop-floor collision data -- units-first + no-fabricate-geometry):
 *  - UNITS: Helical source is METRIC (_mm); the JM crib is INCH. EVERY geometry
 *    value is converted mm->inch (/25.4); a miss is a 25.4x scale catastrophe.
 *    The emitted Unit column is "inches".
 *  - HOLDER: cloned from JM's ACTUAL end-mill holder (REGO-FIX CAPTO C6 PG25, from
 *    END MILLS FOR MACHINE 4.csv) -- a real holder JM uses, NOT fabricated. Its
 *    Holder Segments + Tool Holder Gauge Length are cloned verbatim.
 *  - GAUGE (collision-conservative): Tool Assembly Gauge Length = holderGauge +
 *    fluteLength + STICKOUT_CLEARANCE_IN. Shorter stickout => holder modeled
 *    CLOSER to work => collision detection errs toward CATCHING collisions (safe);
 *    programmer extends stickout per-job.
 *  - TYPE by Helical family: EBI/EBAI = ball; ECAI or corner_radius>0 = bull nose;
 *    ECI = flat.
 *
 * Re-runnable (overwrites its own output). Usage: node <this> [--dry]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const MM_TO_IN = 1 / 25.4;
const STICKOUT_CLEARANCE_IN = 0.25;
const HELICAL_VENDOR = "Helical Solutions";

const SRC_CANDIDATES = [
  "H:/prism/resources/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY",
  "H:/prism/resources/FUSION360/tool-library",
];
const srcDir = SRC_CANDIDATES.find((d) => existsSync(d));
if (!srcDir) { console.error("FATAL: no crib source dir:", SRC_CANDIDATES); process.exit(1); }
const TEMPLATE_FILE = join(srcDir, "END MILLS FOR MACHINE 4.csv");
// --out lets this 173-col Fusion CSV write to the standalone helical-end-mills dir (NOT the crib SOURCE
// dir, which the all-conditions generator would explode). Default keeps the legacy crib-dir path.
const outArg = process.argv.indexOf("--out");
const OUT_FILE = outArg >= 0 ? process.argv[outArg + 1] : join(srcDir, "HELICAL END MILLS (auto-folded).csv");
const UNKNOWN = "H:/prism/state/shared/jm-fusion-tools/unknown-vendor-tools.json";

function parseLine(l) {
  const o = []; let c = "", q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (ch === '"') { if (q && l[i + 1] === '"') { c += '"'; i++; } else q = !q; }
    else if (ch === "," && !q) { o.push(c); c = ""; }
    else c += ch;
  }
  o.push(c);
  return o;
}
function serField(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const r4 = (n) => Math.round(n * 1e4) / 1e4;

const tlines = readFileSync(TEMPLATE_FILE, "utf8").split(/\r?\n/).filter((x) => x.length);
const HEADER = parseLine(tlines[0]);
const TEMPLATE = parseLine(tlines[1]);
if (HEADER.length !== 173) { console.error("FATAL: template not 173 cols:", HEADER.length); process.exit(1); }

const col = (needle) => {
  const i = HEADER.findIndex((h) => h.toLowerCase().includes(needle.toLowerCase()));
  if (i < 0) { console.error("FATAL: column not found:", needle); process.exit(1); }
  return i;
};
const C = {
  idx: col("Tool Index"), preset: col("Preset Name"), type: col("Type ("),
  desc: col("Description ("), dia: col("Diameter (tool_diameter)"), toolNum: col("Number (tool_number"),
  unit: col("Unit ("), gauge: col("Tool Assembly Gauge Length"), body: col("Body Length"),
  cornerR: col("Corner Radius"), flute: col("Flute Length"), holderGauge: col("Tool Holder Gauge Length"),
  nFlutes: col("Number of Flutes"), oal: col("Overall Length (tool_overallLength"),
  shaftDia: col("Shaft Diameter"), shoulderDia: col("Shoulder Diameter"), shoulderLen: col("Shoulder Length"),
};
const HOLDER_GAUGE_IN = parseFloat(TEMPLATE[C.holderGauge]) || 4.72441;

const d = JSON.parse(readFileSync(UNKNOWN, "utf8"));
const all = Array.isArray(d) ? d : d.tools || Object.values(d).find(Array.isArray);
// Exclude geometry_suspect tools (flute>OAL, unknown true LOC) -- never ship impossible collision geometry.
const helical = all.filter((t) => t.brand === HELICAL_VENDOR && t.type === "end_mill" && !t.geometry_suspect);
if (helical.length === 0) { console.error("FATAL: no Helical end mills (run attribution first)"); process.exit(1); }

function fusionType(t) {
  const des = (t.designation || "").toUpperCase();
  if (/^EBI|^EBAI/.test(des)) return "ball end mill";
  if (/^ECAI/.test(des) || t.corner_radius_mm > 0) return "bull nose end mill";
  return "flat end mill";
}
const inOrEmpty = (mm) => (mm > 0 ? r4(mm * MM_TO_IN) : "");

const rows = [];
let n = 0, skipped = 0;
for (const t of helical) {
  const diaMm = t.cutting_diameter_mm;
  if (!(diaMm > 0)) { skipped++; continue; }
  const diaIn = r4(diaMm * MM_TO_IN);
  const fluteIn = inOrEmpty(t.flute_length_mm);
  const oalIn = inOrEmpty(t.overall_length_mm);
  const shankIn = inOrEmpty(t.shank_diameter_mm);
  const fluteCt = Number.isFinite(t.flute_count) && t.flute_count > 0 ? t.flute_count : 4;
  const cornerIn = t.corner_radius_mm > 0 ? r4(t.corner_radius_mm * MM_TO_IN) : "";
  const protrusionIn = (typeof fluteIn === "number" ? fluteIn : 0) + STICKOUT_CLEARANCE_IN;
  const gaugeIn = r4(HOLDER_GAUGE_IN + protrusionIn);

  const row = TEMPLATE.slice();
  n += 1;
  row[C.idx] = String(n);
  row[C.toolNum] = String(n);
  row[C.preset] = "Default Preset";
  row[C.type] = fusionType(t);
  row[C.desc] = `${t.designation || "Helical"} (Helical ${fluteCt}FL D${diaIn}in)`;
  row[C.unit] = "inches";
  row[C.dia] = String(diaIn);
  row[C.nFlutes] = String(fluteCt);
  if (fluteIn !== "") row[C.flute] = String(fluteIn);
  if (oalIn !== "") row[C.oal] = String(oalIn);
  if (shankIn !== "") { row[C.shaftDia] = String(shankIn); row[C.shoulderDia] = String(shankIn); }
  if (fluteIn !== "") { row[C.body] = String(fluteIn); row[C.shoulderLen] = String(fluteIn); }
  row[C.cornerR] = cornerIn === "" ? "" : String(cornerIn);
  row[C.gauge] = String(gaugeIn);
  rows.push(row.map(serField).join(","));
}

const out = [tlines[0], ...rows].join("\n") + "\n";
if (process.argv.includes("--dry")) {
  console.log(`DRY: would write ${rows.length} Helical end mills (skipped ${skipped}) -> ${OUT_FILE}`);
  console.log("sample row 1 (first 160 chars):", rows[0].slice(0, 160));
} else {
  writeFileSync(OUT_FILE, out);
  console.log(`WROTE ${rows.length} Helical end mills (skipped ${skipped} no-diameter) -> ${OUT_FILE}`);
  console.log(`holder cloned REGO-FIX CAPTO C6; gauge = ${HOLDER_GAUGE_IN}in + flute + ${STICKOUT_CLEARANCE_IN}in`);
}
