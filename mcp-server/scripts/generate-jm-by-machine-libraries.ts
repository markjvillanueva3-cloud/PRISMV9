/**
 * generate-jm-by-machine-libraries.ts -- JM Die FLEET tool libraries, organized
 * the way JM actually sets tools up: BY MACHINE, then material-first.
 * [JM-BY-MACHINE] (slot:romeo, 2026-06-15)
 *
 * Operator: "look how the current jm die fusion library is setup and update your
 * work to coincide with how we set our tools up by machines. update the jm die
 * fleet utilizing the same logic of categorizing by material type first so that
 * cutting parameters coincide with the material for the tool cutting data."
 *
 * JM's source FUSION TOOL LIBRARY (resources/PRISM FOLDER FROM HOME/FUSION TOOL
 * LIBRARY) groups cribs by FUNCTION + one explicit machine crib:
 *   END MILLS FOR MACHINE 4, TWIST DRILLS             -> MILL tools  (the 5 VMCs)
 *   TURNING TOOLS, BORING BARS, 130/180 INSERT DRILLS  -> LATHE tools (the 7 LTHs)
 *
 * This pairs with the existing Fusion `.machine` KINEMATIC definitions
 * (generate-jm-fusion-machine-library.ts -> FusionMachineLibraryExportEngine):
 * those define the machine envelopes for simulation; THIS assigns JM's ACTUAL
 * crib tools (NOT the 118K corpus -- JM does not own 118K tools) to JM's ACTUAL
 * CNC fleet (12 cutting machines from ShopConfigurationEngine), computes
 * per-(material grade x toolpath) cutting via the shared condition matrix, and
 * CLAMPS rpm/feed to each machine's spindle max_rpm so the same tool+material
 * yields the usable parameters for THAT machine. Material-first: one CSV per ISO
 * group per machine.
 *
 * UNITS: source is INCH (JM convention); matrix is canonical mm + m/min; emitted
 * inch view (vc in SFM, feed in IPM). NO inline physics constants.
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { conditionMatrix, classifyToolType, IN_PER_MM, MM_PER_IN, type Iso } from "./lib/jm-tool-condition-matrix.js";

// JM Die's ACTUAL cutting fleet (ShopConfigurationEngine controller-map IDs --
// post-processor filenames confirm these are the real machines) with VERIFIED
// OEM spindle specs. Mill specs web-researched 2026-06-15 (5 parallel agents ->
// OEM/dealer datasheets, sources in FLEET-LEDGER); lathe specs from
// JmDieMachineConfigEngine (OEM, matched ShopConfig). This REPLACES keying off
// JmDieMachineConfigEngine.getAllConfigs(), whose roster carried WRONG mill
// models: okuma-mb-56va (6000 rpm/BT50) stood in for JM's real Okuma
// M460V-5AX (15000 rpm/CAT40 Big-Plus) -- a 2.5x UNDER-clamp; roku-roku-rmx5
// (40000) for the real HC 658-II (32000). Flagged for the engine owner
// (juliett/foxtrot) to reconcile JmDieMachineConfigEngine's roster itself.
interface FleetMachine { id: string; name: string; klass: "mill" | "lathe" | "both"; maxRpm: number; taper: string | null; powerKw: number; conf: "high" | "medium"; }
const JM_FLEET: FleetMachine[] = [
  // MILLS -- verified OEM spindle specs (web research 2026-06-15)
  { id: "VMC-01", name: "Hurco VM30i",           klass: "mill",  maxRpm: 12000, taper: "CAT40",          powerKw: 15,   conf: "high" },
  { id: "VMC-02", name: "Okuma GENOS M460V-5AX", klass: "mill",  maxRpm: 15000, taper: "CAT40 Big-Plus", powerKw: 22,   conf: "high" },
  { id: "VMC-03", name: "Haas VF-2",             klass: "mill",  maxRpm: 8100,  taper: "CAT40",          powerKw: 22.4, conf: "high" },
  { id: "VMC-04", name: "Haas OM-2",             klass: "mill",  maxRpm: 30000, taper: "ISO20",          powerKw: 3.73, conf: "high" },
  { id: "VMC-05", name: "Roku-Roku HC 658-II",   klass: "mill",  maxRpm: 32000, taper: "HSK-E40",        powerKw: 6.26, conf: "medium" },
  // LATHES -- OEM specs via JmDieMachineConfigEngine (matched ShopConfig); turning is CSS so rpm is a CSS ceiling
  { id: "LTH-01", name: "Okuma GENOS L300-M",    klass: "lathe", maxRpm: 4500,  taper: null, powerKw: 15,   conf: "high" },
  { id: "LTH-02", name: "Okuma GENOS L200E-M",   klass: "lathe", maxRpm: 5000,  taper: null, powerKw: 11,   conf: "high" },
  { id: "LTH-03", name: "Okuma LNC8",            klass: "lathe", maxRpm: 4000,  taper: null, powerKw: 11,   conf: "high" },
  { id: "LTH-04", name: "Okuma Crown L1060",     klass: "lathe", maxRpm: 3800,  taper: null, powerKw: 11,   conf: "high" },
  { id: "LTH-05", name: "Okuma GENOS L400II-E",  klass: "lathe", maxRpm: 3800,  taper: null, powerKw: 18.5, conf: "high" },
  { id: "LTH-06", name: "Okuma LB 3000EX",       klass: "lathe", maxRpm: 4200,  taper: null, powerKw: 22,   conf: "high" },
  { id: "LTH-07", name: "Okuma Multus B250II",   klass: "both",  maxRpm: 5000,  taper: null, powerKw: 22,   conf: "high" }, // mill-turn: turning + live-tool milling
];

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..", "..");
const SRC_DIRS = [
  join(ROOT, "resources", "PRISM FOLDER FROM HOME", "FUSION TOOL LIBRARY"),
  join(ROOT, "mcp-server", "data", "jm-fusion-tool-library"),
];
const OUT = join(ROOT, "state", "shared", "jm-fusion-tools", "by-machine");
const ISO_GROUPS: Iso[] = ["P", "M", "K", "N", "S", "H"];
const RESET = process.argv.includes("--reset");

const r4 = (n: number): number => Math.round(n * 10000) / 10000;
const r2 = (n: number): number => Math.round(n * 100) / 100;
const numCell = (n: number | null | undefined): string => (n == null || !Number.isFinite(n) ? "" : String(n));
const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Clamp one preset's spindle speed to a machine's max RPM -- the core
 * "machine-coincident cutting data" transform. A milling preset whose computed
 * RPM exceeds the spindle ceiling is pinned at the ceiling; SFM scales down with
 * RPM and table feed scales with RPM (chip-load fz is constant), so the result
 * is the usable parameter set for THAT machine. Turning presets (rpm=null, CSS)
 * and machines with no rpm cap pass through unchanged. Pure + exported for test.
 */
export function clampToSpindle(
  rpm: number | null,
  sfm: number,
  feedMmpm: number | null,
  maxRpm: number | null,
): { rpm: number | null; sfm: number; feedMmpm: number | null; clamped: boolean } {
  if (rpm != null && maxRpm != null && rpm > maxRpm) {
    const scale = maxRpm / rpm;
    return { rpm: maxRpm, sfm: Math.round(sfm * scale), feedMmpm: feedMmpm == null ? null : feedMmpm * scale, clamped: true };
  }
  return { rpm, sfm, feedMmpm, clamped: false };
}

// ── Robust quote-aware CSV parse (handles commas + newlines inside quotes) ────
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip CR */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Header internal key -> column index, e.g. "tool_diameter" from "Diameter (tool_diameter)". */
function keyIndex(header: string[]): Map<string, number> {
  const m = new Map<string, number>();
  header.forEach((h, i) => {
    const k = /\(([^)]+)\)\s*$/.exec(h);
    if (k) m.set(k[1], i);
    m.set(h.trim(), i);
  });
  return m;
}

// ── Machine class from the source crib filename (JM's by-machine grouping) ───
function machineClassFromFile(fname: string): "mill" | "lathe" | null {
  const f = fname.toLowerCase();
  if (/turning|boring|insert\s*drill/.test(f)) return "lathe";
  if (/end\s*mill|machine\s*\d|twist\s*drill|face\s*mill/.test(f)) return "mill";
  return null;
}

function defaultFlutes(toolType: string): number {
  const c = classifyToolType(toolType);
  if (c === "end_mill" || c === "face_mill") return 4;
  if (c === "ball_end_mill" || c === "chamfer_mill" || c === "drill" || c === "spot_drill") return 2;
  if (c === "reamer") return 4;
  return 1; // turning / boring / grooving / threading / tap -> single-point or feed-locked
}

interface JMTool {
  id: string;
  toolType: string;
  dMm: number;
  flutes: number;
  material: string;
  description: string;
  machineClass: "mill" | "lathe";
  sourceFile: string;
  raw: string[]; // the full 173-col Fusion source row (for the importable emission)
}

interface ParsedSource {
  tools: JMTool[];
  header: string[];             // canonical Fusion header (identical across all source cribs, md5-verified)
  ki: Map<string, number>;      // header internal-key -> column index
}

function parseSourceTools(): ParsedSource {
  const srcDir = SRC_DIRS.find((d) => existsSync(d));
  if (!srcDir) throw new Error(`no JM Fusion source dir found (tried: ${SRC_DIRS.join(", ")})`);
  const tools: JMTool[] = [];
  let header: string[] | null = null;
  let ki: Map<string, number> | null = null;
  for (const file of readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith(".csv"))) {
    const cls = machineClassFromFile(file);
    if (!cls) { console.log(`[by-machine] WARN: no machine class for "${file}" -- skipped`); continue; }
    const rows = parseCsv(readFileSync(join(srcDir, file), "utf8"));
    if (rows.length < 2) continue;
    const fileKi = keyIndex(rows[0]);
    if (!header) { header = rows[0]; ki = fileKi; } // all source headers are byte-identical (verified)
    const cell = (r: string[], k: string): string => { const i = fileKi.get(k); return i != null && i < r.length ? r[i].trim() : ""; };
    for (const r of rows.slice(1)) {
      if (r.every((c) => !c.trim())) continue;
      const diaIn = Number(cell(r, "tool_diameter"));
      const toolType = cell(r, "tool_type") || "end mill";
      const fl = Number(cell(r, "tool_numberOfFlutes"));
      const desc = cell(r, "preset_name") || cell(r, "tool_description") || cell(r, "holder_description") || `${file}:${tools.length}`;
      tools.push({
        id: desc,
        toolType,
        dMm: Number.isFinite(diaIn) && diaIn > 0 ? diaIn * MM_PER_IN : 0,
        flutes: Number.isFinite(fl) && fl > 0 ? fl : defaultFlutes(toolType),
        material: cell(r, "tool_material") || "carbide",
        description: desc,
        machineClass: cls,
        sourceFile: file,
        raw: r,
      });
    }
  }
  if (!header || !ki) throw new Error("parsed no Fusion source header");
  return { tools, header, ki };
}

const PRESET_HEADER = [
  "machine_id", "machine_name", "machine_taper", "machine_max_rpm", "machine_max_power_kw",
  "tool_id", "tool_type", "grade_name", "iso", "toolpath", "op", "cut", "strategy",
  "dia_in", "flutes", "vc_sfm", "rpm", "rpm_clamped", "fz_in", "feed_ipm", "ap_in", "ae_in", "coolant", "css", "source_crib",
].join(",");

interface ConditionPresetLike {
  gradeName: string; label: string; op: string; css: boolean;
  fz_mm: number; fnRev_mm: number; ap_mm: number; ae_mm: number; sfm: number;
}
interface ClampResult { rpm: number | null; sfm: number; feedMmpm: number | null; clamped: boolean; }

/**
 * Clone a source 173-col Fusion row and override its cutting cells with ONE
 * spindle-clamped (grade x toolpath) preset, in JM inch units -- producing a
 * Fusion-importable row. Mirrors the Fusion generator's condOverride mapping.
 * Geometry/holder columns pass through verbatim from the source row.
 */
function buildFusionRow(raw: string[], ki: Map<string, number>, p: ConditionPresetLike, c: ClampResult): string[] {
  const row = [...raw];
  const set = (key: string, val: string): void => { const i = ki.get(key); if (i != null && i < row.length) row[i] = val; };
  set("preset_name", `${p.gradeName} ${p.label}`);
  set("tool_surfaceSpeed", String(c.sfm));
  if (c.rpm != null) { set("tool_spindleSpeed", String(c.rpm)); set("tool_useConstantSurfaceSpeed", p.css ? "true" : "false"); }
  else { set("tool_spindleSpeed", ""); set("tool_useConstantSurfaceSpeed", "true"); } // turning CSS: no fixed rpm
  set("tool_feedPerTooth", String(r4(p.fz_mm * IN_PER_MM)));
  set("tool_feedCuttingRel", String(r4(p.fnRev_mm * IN_PER_MM)));
  if (c.feedMmpm != null) set("tool_feedCutting", String(r2(c.feedMmpm * IN_PER_MM)));
  if (p.op === "milling" || p.op === "thread_milling") { // ap/ae are milling stepdown/over; turning keeps source values
    if (p.ap_mm > 0) { set("tool_stepdown", String(r4(p.ap_mm * IN_PER_MM))); set("use_tool_stepdown", "true"); }
    if (p.ae_mm > 0) { set("tool_stepover", String(r4(p.ae_mm * IN_PER_MM))); set("use_tool_stepover", "true"); }
  }
  return row;
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  // RESET clears generated content but PRESERVES the hand-written README.md
  // (it lives in this output dir; a blind rmSync(OUT) would wipe the doc).
  if (RESET) {
    for (const entry of readdirSync(OUT)) {
      if (entry === "README.md") continue;
      rmSync(join(OUT, entry), { recursive: true, force: true });
    }
  }

  const { tools, header, ki } = parseSourceTools();
  const fusionHeaderLine = header.map(csvCell).join(",");
  const millTools = tools.filter((t) => t.machineClass === "mill");
  const latheTools = tools.filter((t) => t.machineClass === "lathe");

  // JM's ACTUAL cutting fleet with verified OEM spindle specs (JM_FLEET above).
  const machines = JM_FLEET;
  console.log(`[by-machine] JM tools: ${tools.length} (mill ${millTools.length}, lathe ${latheTools.length}) | cutting machines: ${machines.length}`);

  const fleet: Record<string, unknown>[] = [];
  let fleetPresets = 0;
  let fleetClamped = 0;

  for (const m of machines) {
    // mill_turn (Okuma Multus) runs BOTH turning + live-tool milling -> gets both crib sets.
    const klass = m.klass;
    const myTools = klass === "lathe" ? latheTools : klass === "both" ? [...latheTools, ...millTools] : millTools;
    const maxRpm: number | null = m.maxRpm;
    const powerKw: number | null = m.powerKw;
    const taper = m.taper;
    const machDir = join(OUT, m.id);
    mkdirSync(machDir, { recursive: true });

    const groupRows: Record<Iso, string[]> = {} as Record<Iso, string[]>;
    const fusionByGroup: Record<Iso, string[]> = {} as Record<Iso, string[]>;
    for (const g of ISO_GROUPS) { groupRows[g] = [PRESET_HEADER]; fusionByGroup[g] = []; }
    let machinePresets = 0, machineClamped = 0;

    for (const t of myTools) {
      if (!(t.dMm > 0)) continue; // need a real diameter for RPM-based milling math
      const presets = conditionMatrix({ toolType: t.toolType, dMm: t.dMm, flutes: t.flutes, material: t.material, description: t.description });
      for (const p of presets) {
        // CLAMP to this machine's spindle. Mills have a real rpm to cap; lathe
        // turning is CSS (rpm=null) -- the machine max_rpm is the small-diameter
        // ceiling, surfaced as a column, not applied to a null rpm.
        const c = clampToSpindle(p.rpm, p.sfm, p.feed_mmpm, maxRpm);
        if (c.clamped) machineClamped++;
        const row = [
          m.id, csvCell(m.name), csvCell(taper ?? ""), numCell(maxRpm), numCell(powerKw),
          csvCell(t.id), csvCell(t.toolType), csvCell(p.gradeName), p.iso, csvCell(p.label), p.op, p.cut, p.strategy,
          r4(t.dMm * IN_PER_MM), t.flutes, c.sfm, numCell(c.rpm), c.clamped ? 1 : 0,
          r4(p.fz_mm * IN_PER_MM), numCell(c.feedMmpm == null ? null : r2(c.feedMmpm * IN_PER_MM)),
          r4(p.ap_mm * IN_PER_MM), r4(p.ae_mm * IN_PER_MM), csvCell(p.coolant), p.css ? "1" : "0", csvCell(t.sourceFile),
        ].join(",");
        groupRows[p.iso].push(row);
        // Fusion-importable 173-col row: source tool row + clamped cutting cells.
        fusionByGroup[p.iso].push(buildFusionRow(t.raw, ki, p, c).map(csvCell).join(","));
        machinePresets++;
      }
    }

    for (const g of ISO_GROUPS) {
      if (groupRows[g].length <= 1) continue; // no presets for this material on this machine
      writeFileSync(join(machDir, `${g}.csv`), groupRows[g].join("\n") + "\n");
    }
    // Per-machine Fusion-IMPORTABLE library: canonical 173-col header + every preset
    // row, ordered material-first (ISO group order). Drops straight into Fusion.
    const fusionRows = ISO_GROUPS.flatMap((g) => fusionByGroup[g]);
    if (fusionRows.length) writeFileSync(join(machDir, "FUSION-IMPORT.csv"), [fusionHeaderLine, ...fusionRows].join("\n") + "\n");
    fleetPresets += machinePresets;
    fleetClamped += machineClamped;
    fleet.push({
      machine_id: m.id, machine_name: m.name, class: klass,
      taper, max_rpm: maxRpm, max_power_kw: powerKw, spec_confidence: m.conf, tools_assigned: myTools.filter((t) => t.dMm > 0).length,
      presets: machinePresets, rpm_clamped: machineClamped, groups_with_data: ISO_GROUPS.filter((g) => groupRows[g].length > 1),
    });
    console.log(`  ${m.id.padEnd(20).slice(0, 20)} ${klass.padEnd(5)} rpm<=${String(maxRpm ?? "?").padStart(5)} ${String(taper ?? "").padEnd(8)} | tools ${myTools.filter((t) => t.dMm > 0).length} presets ${machinePresets} clamped ${machineClamped}`);
  }

  const ledger = {
    schemaVersion: "1.0.0",
    slot: "romeo",
    units: "inch (JM convention); vc SFM; feed IPM; cutting data CLAMPED to each machine spindle max_rpm",
    note: "JM's ACTUAL crib tools assigned to JM's ACTUAL 12-machine CNC fleet with VERIFIED OEM spindle specs (mill specs web-researched 2026-06-15; corrected Okuma M460V-5AX 6000->15000 rpm and Roku-Roku HC658-II 40000->32000 vs JmDieMachineConfigEngine's mismatched roster). Material-first (one analysis CSV per ISO group + a Fusion-IMPORTABLE 173-col FUSION-IMPORT.csv per machine). Machine class from source-crib filename (no insert/twist-drill ambiguity). Pairs with the Fusion .machine kinematic defs (generate-jm-fusion-machine-library.ts).",
    spindle_spec_sources: {
      "VMC-01 Hurco VM30i": "hurco.com spec page -- 12000 rpm / CAT40 / 15 kW (high)",
      "VMC-02 Okuma GENOS M460V-5AX": "okuma.eu press release + product page -- 15000 rpm / CAT40 Big-Plus / 22 kW (high); CORRECTS engine's 6000 mb-56va",
      "VMC-03 Haas VF-2": "haas.co.uk -- 8100 rpm / CAT40 / 22.4 kW (high)",
      "VMC-04 Haas OM-2": "techspex + Haas OM datasheet -- 30000 rpm / ISO20 / 3.73 kW (high)",
      "VMC-05 Roku-Roku HC 658-II": "millenniummachinery + MC Machinery -- 32000 rpm / HSK-E40 / 6.26 kW (medium); CORRECTS engine's 40000 rmx-5",
      "LTH-01..07": "JmDieMachineConfigEngine OEM specs (matched ShopConfig); turning CSS so rpm is a ceiling, not applied",
    },
    source_tools: tools.length,
    mill_tools: millTools.length,
    lathe_tools: latheTools.length,
    cutting_machines: machines.length,
    fleet_presets: fleetPresets,
    fleet_rpm_clamped: fleetClamped,
    machines: fleet,
  };
  writeFileSync(join(OUT, "FLEET-LEDGER.json"), JSON.stringify(ledger, null, 2));

  console.log(`\n=== JM BY-MACHINE FLEET LEDGER ===`);
  console.log(`source tools: ${tools.length} | cutting machines: ${machines.length}`);
  console.log(`fleet presets: ${fleetPresets.toLocaleString()} | rpm-clamped: ${fleetClamped}`);
  console.log(`output: ${OUT}`);
}

// Run only when invoked directly (so tests can import clampToSpindle without side effects).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
