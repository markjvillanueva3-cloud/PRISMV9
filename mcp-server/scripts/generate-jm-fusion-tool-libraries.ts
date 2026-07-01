/**
 * generate-jm-fusion-tool-libraries.ts
 * [JM-FUSION-TOOLS-MS0]/U-JFT-MATGROUP-CRIB (slot:romeo)
 *
 * Generates Fusion 360 cloud-importable tool libraries from JM Die's REAL
 * production tool crib — the 7 Fusion `CSV_TOOLS_VERSION_1` exports the shop
 * already runs (REGO-FIX Capto C6 / BIG DAISHOWA ER-32 / ISCAR / Techniks
 * holders). Output stays in the exact same proven CSV format Fusion imports,
 * so there is zero new-format risk and the real geometry + real holder
 * collision-segment columns are copied through VERBATIM (no unit conversion on
 * collision-critical data — eliminates the 25.4x scale-error class).
 *
 * What it adds: for every tool, alongside its original "as-run" preset,
 * physics-optimal per-ISO-material-group preset rows — but ONLY for the ISO
 * groups the tool's coating/substrate is metallurgically COMPATIBLE with
 * (`coatingSelectionAdapter.compatibleIsoGroups`): a Ti-coated carbide end mill
 * gets P/M/K/S/H (not aluminum N — Al-bearing coatings cause BUE); an HSS twist
 * drill gets P/M/N (not S/H); a PCD tool gets N only; CBN gets H/K. The cutting
 * columns (surface speed, RPM, feed/tooth, feedrate, stepdown, stepover,
 * coolant) are overridden per group from the canonical
 * `ultimateSpeedFeedEngine.lookupCuttingData()` (Kienzle/Taylor-backed
 * CUTTING_PARAMS table). All other columns (172 data cols incl. geometry +
 * holder collision segments) are preserved verbatim per tool; re-serialized
 * group rows parse to identical values (text fields may differ only in
 * cosmetic quoting, which the CSV_TOOLS_VERSION_1 / RFC-4180 parser ignores).
 *
 * This is literally the operator's "different versions for each material group"
 * + "copy-and-paste batches to adjust parameters between groups": each tool's
 * preset rows ARE the per-group batches, ready to import or copy in Fusion.
 *
 * Outputs (under state/shared/jm-fusion-tools/material-group-libraries/):
 *   - JM-CRIB-ALL-families.csv    : single all-in-one import (every tool, re-indexed)
 *   - <source>-allconditions.csv  : per source file, as-run + (grade x toolpath) rows
 *   - by-group/JM-CRIB-<ISO>.csv  : one library per material group (all tools)
 *   - by-type-brand/.../<brand>.csv: material -> tool type -> brand tree
 *   - JM-MATERIAL-GROUP-BATCHES.md : human copy-paste parameter batch sheet
 *   - JM-MATERIAL-CATEGORIZATION.md: JM stock material -> ISO group map
 *   - README.md                   : import instructions + provenance
 *
 * Units: emitted in each tool's native CSV unit (JM = inches). Cutting physics
 * runs in mm internally (lookupCuttingData) and converts back to the tool unit.
 *
 * Run: cd mcp-server && npx tsx scripts/generate-jm-fusion-tool-libraries.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { ultimateSpeedFeedEngine } from "../src/engines/UltimateSpeedFeedEngine.js";
import { coatingSelectionAdapter } from "../src/engines/CoatingSelectionAdapter.js";
import { nestByMaterialTypeBrand, flattenTree, isoSegment, type PartitionInput } from "./lib/tool-library-partition.js";

// ── Paths ────────────────────────────────────────────────────────────────
const SRC_DIRS = [
  "H:/prism/resources/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY",
  "H:/prism/resources/FUSION360/tool-library",
];
const OUT_DIR = "H:/prism/state/shared/jm-fusion-tools/material-group-libraries";
const BY_GROUP_DIR = join(OUT_DIR, "by-group");

// ── Constants ────────────────────────────────────────────────────────────
const IN_PER_MM = 1 / 25.4;
const MM_PER_IN = 25.4;
const MPM_TO_SFM = 3.28084;          // 1 m/min surface speed = 3.28084 SFM

// Per group: the Fusion preset name + the Fusion CSV stock-material category
// ("Filter by Type (tool_presetMaterialCategory)") so Fusion AUTO-SELECTS the
// matching preset when a stock material is assigned to the setup -- this is what
// makes the per-material categorization FUNCTIONAL (not just named). Category
// strings are the canonical lowercase Fusion CAM stock tokens: steel / stainless
// steel / aluminum are confirmed verbatim in JM's own existing Fusion exports;
// cast iron / titanium are core Fusion stock categories. H (hardened tool steel)
// maps to `steel` -- Fusion has no "hardened" stock category, so the preset NAME
// plus its hardened-specific cutting data carry the H semantics (per-grade
// hardness-range filtering is the Phase-2 atomic refinement). S (superalloy/Ti)
// maps to `titanium` -- the closest Fusion stock category for the S group
// (Ti-6Al-4V + Inconel/Hastelloy share the low-Vc/high-heat regime). The source
// "as-run" preset row keeps its verbatim `all` category (the catch-all default).
const GROUPS: { iso: "P" | "M" | "K" | "N" | "S" | "H"; name: string; category: string }[] = [
  { iso: "P", name: "Steel (P)", category: "steel" },
  { iso: "M", name: "Stainless (M)", category: "stainless steel" },
  { iso: "K", name: "Cast Iron (K)", category: "cast iron" },
  { iso: "N", name: "Aluminum (N)", category: "aluminum" },
  { iso: "S", name: "Superalloy (S)", category: "titanium" },
  { iso: "H", name: "Hardened (H)", category: "steel" },
];

// ── ATOMIC per-grade expansion (operator: "fine tune SFM as atomically as we can") ──
// Each ISO group expands into the specific JM stock grades it contains. Each grade
// gets its OWN cutting speed = the group base Vc scaled by the canonical per-grade
// machinability rating (UltimateSpeedFeedEngine MATERIAL_DB `machinability_factor`,
// relative to AISI-1212 = 1.0 -- the standard machinability-rating speed factor).
// The SFC's lookupCuttingData/calculate collapse every grade to its ISO-group Vc
// (verified), so this scaling is what makes the per-grade SFM ACTUALLY differ:
// e.g. 4140 alloy (0.50) / 1018 (0.65) = 0.77x = -23% Vc, matching MATERIAL_DB's
// own "reduce speed 15-25% vs plain carbon steel" guidance. machinability + the
// HB hardness range (-> Fusion "Filter by hardness", so Fusion distinguishes
// same-category grades like 1018 vs 4140) are pulled LIVE from getMaterialProfile
// at gen time -- MATERIAL_DB is the single source of truth, never copied here.
// `key` = the exact MATERIAL_DB key (all 14 verified to resolve via getMaterialProfile).
const GRADES: { iso: "P" | "M" | "K" | "N" | "S" | "H"; key: string; name: string; category: string }[] = [
  { iso: "P", key: "steel",           name: "1018 Steel (P)",         category: "steel" },
  { iso: "P", key: "aisi_1045",       name: "1045 Steel (P)",         category: "steel" },
  { iso: "P", key: "alloy_steel",     name: "4140/4340 Alloy (P)",    category: "steel" },
  { iso: "M", key: "stainless_steel", name: "304/316 SS (M)",         category: "stainless steel" },
  { iso: "M", key: "17_4ph",          name: "17-4 PH (M)",            category: "stainless steel" },
  { iso: "M", key: "duplex",          name: "2205 Duplex (M)",        category: "stainless steel" },
  { iso: "K", key: "cast_iron",       name: "Gray Iron (K)",          category: "cast iron" },
  { iso: "K", key: "ductile_iron",    name: "Ductile Iron (K)",       category: "cast iron" },
  { iso: "N", key: "aluminum",        name: "6061/7075 Alum (N)",     category: "aluminum" },
  { iso: "N", key: "brass",           name: "Brass (N)",              category: "brass" },
  { iso: "N", key: "copper",          name: "Copper (N)",             category: "copper" },
  { iso: "S", key: "titanium",        name: "Ti-6Al-4V (S)",          category: "titanium" },
  { iso: "S", key: "inconel",         name: "Inconel/Nickel (S)",     category: "titanium" },
  { iso: "H", key: "hardened_steel",  name: "Hardened Tool Steel (H)", category: "steel" },
];

// Per-group reference grade whose machinability anchors the group base Vc (the
// representative grade the SFC's per-group cutting data is tabulated for).
const REFERENCE_KEY: Record<"P" | "M" | "K" | "N" | "S" | "H", string> = {
  P: "steel", M: "stainless_steel", K: "cast_iron", N: "aluminum", S: "titanium", H: "hardened_steel",
};

const _refMachCache = new Map<string, number | undefined>();
/** Machinability of the group's reference grade (cached). Vc scale = grade.mach / this. */
function refMachinability(iso: "P" | "M" | "K" | "N" | "S" | "H"): number | undefined {
  if (!_refMachCache.has(iso)) {
    const p = ultimateSpeedFeedEngine.getMaterialProfile(REFERENCE_KEY[iso]);
    _refMachCache.set(iso, p ? p.machinability_factor : undefined);
  }
  return _refMachCache.get(iso);
}

// Exact Fusion CSV header tokens for the columns we override per group.
const COL = {
  preset: "Preset Name (preset_name)",
  presetMaterialCategory: "Filter by Type (tool_presetMaterialCategory)",
  presetUseHardness: "Filter by hardness (tool_presetMaterialUseHardness)",
  presetMinHardness: "Minimum hardness (tool_presetMaterialMinimumHardness)",
  presetMaxHardness: "Maximum hardness (tool_presetMaterialMaximumHardness)",
  type: "Type (tool_type)",
  diameter: "Diameter (tool_diameter)",
  unit: "Unit (tool_unit)",
  flutes: "Number of Flutes (tool_numberOfFlutes)",
  material: "Material (tool_material)",
  description: "Description (tool_description)",
  vendor: "Vendor (tool_vendor)",
  surfaceSpeed: "Surface Speed (tool_surfaceSpeed)",
  spindleSpeed: "Spindle Speed (tool_spindleSpeed)",
  feedPerTooth: "Feed per Tooth (tool_feedPerTooth)",
  feedCutting: "Cutting Feedrate (tool_feedCutting)",
  feedCuttingRel: "Cutting Feed per Revolution (tool_feedCuttingRel)",
  stepdown: "Stepdown (tool_stepdown)",
  stepover: "Stepover (tool_stepover)",
  useStepdown: "Use Stepdown (use_tool_stepdown)",
  useStepover: "Use Stepover (use_tool_stepover)",
  coolant: "Coolant (tool_coolant)",
  useCSS: "Use Constant Surface Speed (tool_useConstantSurfaceSpeed)",
  useFeedPerRev: "Use Feed per Revolution (tool_useFeedPerRevolution)",
} as const;

// Table coolant strategy -> Fusion CSV coolant enum.
const COOLANT_MAP: Record<string, string> = {
  flood: "flood", mist: "mist", dry: "disabled",
  air_blast: "air", through_tool: "through tool",
};

type OpClass = "milling" | "drilling" | "reaming" | "tapping" | "turning" | "thread_milling";

// ── CSV helpers (RFC-4180-ish, mirrors FusionToolLibraryEngine.parseCsvLine) ─
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

/** Serialize one field, quoting iff it contains comma/quote/newline (Fusion quotes all text). */
function csvField(v: string): string {
  if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}
function serializeCsvLine(fields: string[]): string {
  return fields.map(csvField).join(",");
}

function num(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
/** Trim trailing zeros, max `dp` decimals. */
function fmt(n: number, dp: number): string {
  return parseFloat(n.toFixed(dp)).toString();
}

function classifyOp(toolType: string): OpClass {
  const t = toolType.toLowerCase();
  if (/thread.*mill/.test(t)) return "thread_milling";
  if (/tap/.test(t)) return "tapping";
  if (/ream/.test(t)) return "reaming";
  if (/drill/.test(t)) return "drilling";
  if (/turn|boring|groov|part/.test(t)) return "turning";
  return "milling"; // end mill / face mill / chamfer / bull nose / ball
}

function isHss(material: string): boolean {
  return /hss|high\s*speed\s*steel/i.test(material || "");
}

// ── ALL-CONDITIONS toolpath matrix (operator: every tool path for every material) ──
// Strategy modifiers mirror UltimateSpeedFeedEngine STRATEGY_MODS (vc/fz/ap factors + ae
// override %) -- applied on top of the looked-up base so each toolpath gets its OWN numbers.
// axialDx (diameter-relative axial baseline, operator 2026-06-17) + every value MUST match
// jm-tool-condition-matrix.ts STRATEGY_FACTORS exactly -- both are the same number source and
// the cross-CAM oracle test asserts parity. (TODO: collapse this fork by importing the matrix's
// STRATEGY_FACTORS + delegating condOverride to computeCondition -- tracked as a dedup follow-up.)
const STRATEGY_FACTORS: Record<string, { vc: number; fz: number; ap: number; aePct?: number; axialDx: number }> = {
  conventional: { vc: 1.0, fz: 1.0, ap: 1.0, axialDx: 1.0 },             // general roughing -- 1xD LOC baseline
  adaptive:     { vc: 1.4, fz: 1.2, ap: 2.0, aePct: 10, axialDx: 2.0 },  // HEM -- constant-engagement, deep ap, light ae
  trochoidal:   { vc: 1.5, fz: 1.3, ap: 2.5, aePct: 8,  axialDx: 2.5 },
  hsm:          { vc: 1.3, fz: 1.0, ap: 0.5, aePct: 50, axialDx: 0.15 }, // light DOC, high speed
  plunge:       { vc: 0.7, fz: 0.5, ap: 1.0, axialDx: 1.0 },             // ramp / peck -- axial dominant
  slot:         { vc: 0.8, fz: 0.9, ap: 0.7, aePct: 100, axialDx: 0.5 },
};

type CutType = "roughing" | "semi_finishing" | "finishing";
// One toolpath = (op, cutType, strategy, label). Each tool emits a preset per (grade x toolpath).
interface Toolpath { op: OpClass; cut: CutType; strat: string; label: string; }

// Per-tool-type toolpath list (from the research-workflow wr0fg62h4 tool-type condition matrix).
const TOOLPATHS: Record<string, Toolpath[]> = {
  end_mill: [ // flat + bull-nose: the full milling toolpath spread
    { op: "milling", cut: "roughing",       strat: "conventional", label: "Rough" },
    { op: "milling", cut: "roughing",       strat: "adaptive",     label: "HEM Adaptive" },
    { op: "milling", cut: "roughing",       strat: "trochoidal",   label: "Trochoidal" },
    { op: "milling", cut: "roughing",       strat: "slot",         label: "Slot" },
    { op: "milling", cut: "roughing",       strat: "plunge",       label: "Ramp" },
    { op: "milling", cut: "semi_finishing", strat: "conventional", label: "Semi" },
    { op: "milling", cut: "finishing",      strat: "conventional", label: "Finish" },
    { op: "milling", cut: "finishing",      strat: "hsm",          label: "HSM" },
  ],
  ball_end_mill: [
    { op: "milling", cut: "semi_finishing", strat: "conventional", label: "Semi" },
    { op: "milling", cut: "semi_finishing", strat: "trochoidal",   label: "Trochoidal" },
    { op: "milling", cut: "finishing",      strat: "conventional", label: "Finish" },
    { op: "milling", cut: "finishing",      strat: "hsm",          label: "HSM" },
  ],
  chamfer_mill: [
    { op: "milling", cut: "finishing", strat: "conventional", label: "Chamfer" },
  ],
  face_mill: [
    { op: "milling", cut: "roughing",       strat: "conventional", label: "Rough" },
    { op: "milling", cut: "semi_finishing", strat: "conventional", label: "Semi" },
    { op: "milling", cut: "finishing",      strat: "conventional", label: "Finish" },
    { op: "milling", cut: "finishing",      strat: "hsm",          label: "HSM" },
  ],
  spot_drill: [
    { op: "drilling", cut: "roughing", strat: "conventional", label: "Spot" },
  ],
  drill: [ // twist + insert drills
    { op: "drilling", cut: "roughing", strat: "conventional", label: "Drill" },
    { op: "drilling", cut: "roughing", strat: "plunge",       label: "Peck" },
  ],
  reamer: [
    { op: "reaming", cut: "finishing", strat: "conventional", label: "Ream" },
  ],
  tap: [
    { op: "tapping", cut: "roughing", strat: "conventional", label: "Tap" },
  ],
  boring_bar: [
    { op: "turning", cut: "roughing",  strat: "conventional", label: "Bore Rough" },
    { op: "turning", cut: "finishing", strat: "conventional", label: "Bore Finish" },
  ],
  turning_tool: [
    { op: "turning", cut: "roughing",  strat: "conventional", label: "Turn Rough" },
    { op: "turning", cut: "finishing", strat: "conventional", label: "Turn Finish" },
  ],
  grooving_tool: [
    { op: "turning", cut: "roughing",  strat: "conventional", label: "Groove Rough" },
    { op: "turning", cut: "finishing", strat: "conventional", label: "Groove Finish" },
  ],
  threading_tool: [
    // JM's "turning threading" are LATHE thread inserts -> turning op (CSS mode at the
    // control), NOT a rotary thread mill. Uses turning-finish speed as the thread-turning
    // starting point (the thread_milling SFC data stays available for true rotary thread mills).
    { op: "turning", cut: "finishing", strat: "conventional", label: "Thread" },
  ],
};

/** Map a raw JM tool_type to a TOOLPATHS key (order matters: specific before generic). */
function classifyToolType(toolType: string): string {
  const s = toolType.toLowerCase();
  if (/spot/.test(s)) return "spot_drill";
  if (/cent(er|re).{0,3}drill/.test(s)) return "spot_drill"; // center drills behave like spots
  if (/ream/.test(s)) return "reamer";
  if (/\btap\b|tapping/.test(s)) return "tap";
  if (/drill/.test(s)) return "drill";                       // twist + insert drills
  if (/ball/.test(s)) return "ball_end_mill";
  if (/chamfer/.test(s)) return "chamfer_mill";
  if (/face.{0,3}mill/.test(s)) return "face_mill";
  if (/end.{0,3}mill|bull|flat/.test(s)) return "end_mill";
  if (/bor/.test(s)) return "boring_bar";
  if (/groov|part/.test(s)) return "grooving_tool";
  if (/thread/.test(s)) return "threading_tool";
  if (/turn/.test(s)) return "turning_tool";
  const op = classifyOp(toolType); // fall back by op class
  if (op === "drilling") return "drill";
  if (op === "turning") return "turning_tool";
  return "end_mill";
}

// ── Per-condition override computation ─────────────────────────────────────────
interface Override { [csvHeader: string]: string; }

/**
 * Compute the cutting-column overrides for one (tool, ISO group). Returns a
 * map of CSV header -> new value. Op-class aware so we never apply milling
 * feed-per-tooth to a turning tool, etc. Returns null if no sane data resolves
 * (then that group row is skipped — fail-loud, never emit garbage).
 */
function condOverride(
  iso: "P" | "M" | "K" | "N" | "S" | "H",
  op: OpClass,
  cut: CutType,
  strategy: string,
  dMm: number,
  flutes: number,
  toolMaterial: "carbide" | "hss",
  unit: "inches" | "mm",
  vcScale: number = 1,
): Override | null {
  // turning/boring surface speed lives on a turning row; the rest are mill/hole ops.
  const lookupOp = op === "turning" ? "turning" : op;
  const lk = ultimateSpeedFeedEngine.lookupCuttingData({
    iso_group: iso,
    operation: lookupOp,            // OpClass ⊆ Operation — assignable, no cast
    cut_type: cut,
    tool_diameter_mm: dMm,
    tool_material: toolMaterial,
  });
  if (!lk || !(lk.vc > 0)) return null;

  // Two independent modifiers on the ISO-group base: (1) per-grade machinability scales
  // SPEED only (1018 != 4140); (2) per-strategy mod adjusts vc/fz/ap/ae (HEM deep+light-radial,
  // HSM light-DOC-high-speed, slot full-radial-slower, ramp axial). feed follows RPM.
  const sm = STRATEGY_FACTORS[strategy] ?? STRATEGY_FACTORS.conventional;
  const vc = lk.vc * (vcScale > 0 ? vcScale : 1) * sm.vc;
  const toUnit = (mm: number) => (unit === "mm" ? mm : mm * IN_PER_MM);
  const sfm = Math.round(vc * MPM_TO_SFM);
  const coolant = COOLANT_MAP[lk.coolant as string] ?? lk.coolant ?? "flood";
  const ov: Override = { [COL.surfaceSpeed]: String(sfm), [COL.coolant]: coolant };

  if (op === "turning") {
    // Surface speed is workpiece-diameter driven at the control — set CSS mode
    // and the per-material vc; preserve JM's proven feed-per-rev (kept verbatim).
    ov[COL.useCSS] = "true";
    return ov;
  }

  if (!(dMm > 0)) return null; // milling/hole ops need a real tool diameter for RPM
  const rpm = Math.round((vc * 1000) / (Math.PI * dMm));
  if (!(rpm > 0)) return null;
  ov[COL.spindleSpeed] = String(rpm);

  if (op === "tapping") {
    // Tap feed = thread pitch (geometry-locked) — keep JM's proven feed; only
    // surface speed + RPM vary by material group.
    return ov;
  }

  if (op === "drilling" || op === "reaming") {
    // CUTTING_PARAMS drilling/reaming fz is feed-PER-REV; hole-making feeds per rev.
    const fnRev = toUnit(lk.fz * sm.fz);          // mm/rev, strategy-scaled
    const feed = fnRev * rpm;                     // unit/min
    const fzTooth = flutes > 0 ? fnRev / flutes : fnRev;
    ov[COL.feedPerTooth] = fmt(fzTooth, 6);
    ov[COL.feedCuttingRel] = fmt(fnRev, 6);
    ov[COL.feedCutting] = fmt(feed, 4);
    ov[COL.useFeedPerRev] = "true";
    return ov;
  }

  // milling / thread_milling: fz is per-tooth, strategy-scaled.
  const fzTooth = toUnit(lk.fz * sm.fz);
  const fnRev = fzTooth * (flutes > 0 ? flutes : 1);
  const feed = fnRev * rpm;
  ov[COL.feedPerTooth] = fmt(fzTooth, 6);
  ov[COL.feedCuttingRel] = fmt(fnRev, 6);
  ov[COL.feedCutting] = fmt(feed, 4);
  // ap: 1xD-LOC baseline (operator 2026-06-17). MUST mirror jm-tool-condition-matrix.ts
  // computeCondition() exactly -- this generator and the matrix are the same number source
  // (the cross-CAM oracle test asserts parity). Diameter-relative axial baseline (axialDx*D)
  // CLAMPED to the SFC physics ceiling (lk.ap*sm.ap). min() => small tools get a snap-safe
  // diameter-scaled axial (a quarter-inch endmill no longer defaults to a 0.6-0.8in DOC);
  // large tools + finishing stay physics-clamped. Never exceeds either bound.
  const apCeiling = lk.ap * sm.ap;
  const apEff = Math.min(sm.axialDx * dMm, apCeiling);
  if (apEff > 0) { ov[COL.stepdown] = fmt(toUnit(apEff), 4); ov[COL.useStepdown] = "true"; }
  // ae: strategy override (% of Dc) wins, else the looked-up radial.
  const aeEff = sm.aePct != null ? (sm.aePct / 100) * dMm : lk.ae;
  if (aeEff > 0) { ov[COL.stepover] = fmt(toUnit(aeEff), 4); ov[COL.useStepover] = "true"; }
  return ov;
}

// ── Main ───────────────────────────────────────────────────────────────────
interface RowStat { source: string; tools: number; presetRows: number; skippedGroups: number; incompatibleGroups: number; }

function main(): void {
  const srcDir = SRC_DIRS.find((d) => existsSync(d));
  if (!srcDir) {
    console.error(`FATAL: no JM Fusion CSV source dir found. Tried:\n  ${SRC_DIRS.join("\n  ")}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(BY_GROUP_DIR, { recursive: true });

  // Guard: each fixed material group must map to a UNIQUE isoSegment path token
  // (P/M/K/N/S/H already do) -- fail loud if a future GROUPS edit ever aliases two
  // groups into one directory (isoSegment is not injective for free-text input).
  if (new Set(GROUPS.map((g) => isoSegment(g.iso))).size !== GROUPS.length) {
    console.error("FATAL: material-group ISO segments collide -- distinct groups would merge");
    process.exit(1);
  }

  const csvs = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith(".csv"));
  if (csvs.length === 0) { console.error(`FATAL: no .csv files in ${srcDir}`); process.exit(1); }

  const stats: RowStat[] = [];
  // Accumulate per-group rows across ALL source files for the by-group libraries.
  const byGroupRows: Record<string, string[]> = {};
  // Accumulate the same group rows tagged with type+brand for the material->type->brand tree.
  const partitionInputs: PartitionInput[] = [];
  let byGroupHeader = "";
  // Single consolidated import file (all tools, all presets) -- tool_index offset per source
  // file so every tool is globally unique + contiguous (supersedes the merge-jm-fusion-crib step).
  let consHeader = "";
  const consRows: string[] = [];
  let consOffset = 0;

  for (const file of csvs) {
    const raw = readFileSync(join(srcDir, file), "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) { stats.push({ source: file, tools: 0, presetRows: 0, skippedGroups: 0, incompatibleGroups: 0 }); continue; }

    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine);
    const idx = new Map<string, number>();
    headers.forEach((h, i) => idx.set(h, i));
    if (!byGroupHeader) byGroupHeader = headerLine;

    const colOf = (name: string): number => idx.get(name) ?? -1;
    const getField = (fields: string[], name: string): string => {
      const i = colOf(name);
      return i >= 0 && i < fields.length ? fields[i] : "";
    };

    const outLines: string[] = [headerLine];
    let tools = 0, presetRows = 0, skippedGroups = 0, incompatibleGroups = 0;

    for (let li = 1; li < lines.length; li++) {
      const fields = parseCsvLine(lines[li]);
      if (fields.length < 5) continue;
      tools++;

      // Original "as-run" row preserved verbatim (geometry + holder segments intact).
      outLines.push(lines[li]);
      presetRows++;

      const toolType = getField(fields, COL.type);
      const vendor = getField(fields, COL.vendor);
      const unit: "inches" | "mm" = getField(fields, COL.unit) === "mm" ? "mm" : "inches";
      const diaRaw = num(getField(fields, COL.diameter)) ?? 0;
      const dMm = unit === "mm" ? diaRaw : diaRaw * MM_PER_IN;
      const flutes = num(getField(fields, COL.flutes)) ?? 1;
      const material = getField(fields, COL.material);
      const toolMaterial: "carbide" | "hss" = isHss(material) ? "hss" : "carbide";
      const toolpaths = TOOLPATHS[classifyToolType(toolType)] ?? TOOLPATHS.end_mill;

      // Material-domain gate (operator constraint): only populate ISO groups
      // this tool's coating/substrate is metallurgically compatible with.
      let coatingHint = material;
      const desc = getField(fields, COL.description).toLowerCase();
      if (/alum|non[- ]?ferrous|brass|copper|graphite|plastic/.test(desc) &&
          !/steel|stainless|inconel|titanium|hardened|tool steel/.test(desc)) {
        coatingHint = "uncoated for aluminum"; // explicit non-ferrous intent in description
      }
      const compatible = coatingSelectionAdapter.compatibleIsoGroups(coatingHint, toolMaterial);

      for (const g of GRADES) {
        if (!compatible.includes(g.iso)) { incompatibleGroups++; continue; }
        // Per-grade Vc scale from the canonical machinability ratio (single source
        // of truth = MATERIAL_DB via getMaterialProfile). Skip a grade whose profile
        // or its group reference doesn't resolve (fail-loud, never emit unscaled).
        const prof = ultimateSpeedFeedEngine.getMaterialProfile(g.key);
        const refMach = refMachinability(g.iso);
        if (!prof || !refMach || !(prof.machinability_factor > 0)) { skippedGroups++; continue; }
        const vcScale = prof.machinability_factor / refMach;
        const [hbMin, hbMax] = prof.hardness_hb_range;
        // For THIS grade, emit one preset per applicable toolpath (op x cut_type x strategy).
        for (const tp of toolpaths) {
          const ov = condOverride(g.iso, tp.op, tp.cut, tp.strat, dMm, flutes, toolMaterial, unit, vcScale);
          if (!ov) { skippedGroups++; continue; }
          const row = fields.slice();
          // Match the verbatim data-row width exactly. The final header token
          // (CSV_TOOLS_VERSION_1) is a format sentinel with NO data column, so real
          // data rows carry headers.length-1 fields. Pad/trim to that width so each
          // preset row is byte-width-identical to the original (every override index
          // is well below this width, so geometry + holder segments survive verbatim).
          const dataWidth = headers.length - 1;
          while (row.length < dataWidth) row.push("");
          if (row.length > dataWidth) row.length = dataWidth;
          // preset name = "{grade} {toolpath}"; Fusion stock category (Filter by Type)
          // + HB hardness range (Filter by hardness) per grade so Fusion auto-selects by
          // stock material + hardness, then the operator picks the toolpath.
          const pi = colOf(COL.preset);
          if (pi >= 0) row[pi] = `${g.name} ${tp.label}`;
          const ci2 = colOf(COL.presetMaterialCategory);
          if (ci2 >= 0) row[ci2] = g.category;
          const uh = colOf(COL.presetUseHardness); if (uh >= 0) row[uh] = "true";
          const lo = colOf(COL.presetMinHardness); if (lo >= 0) row[lo] = String(hbMin);
          const hi = colOf(COL.presetMaxHardness); if (hi >= 0) row[hi] = String(hbMax);
          for (const [hdr, val] of Object.entries(ov)) {
            const ci = colOf(hdr);
            if (ci >= 0) row[ci] = val;
          }
          const serialized = serializeCsvLine(row);
          outLines.push(serialized);
          presetRows++;
          (byGroupRows[g.iso] ??= []).push(serialized);
          partitionInputs.push({ iso: g.iso, toolType, vendor, row: serialized });
        }
      }
    }

    const outName = basename(file, ".csv") + "-allconditions.csv";
    writeFileSync(join(OUT_DIR, outName), outLines.join("\n") + "\n", "utf-8");
    stats.push({ source: file, tools, presetRows, skippedGroups, incompatibleGroups });

    // Fold this file's rows into the consolidated library, offsetting tool_index by the
    // running max so indices stay globally unique + contiguous (a tool's rows stay grouped).
    if (!consHeader) consHeader = headerLine;
    let localMaxIdx = 0;
    for (let k = 1; k < outLines.length; k++) {
      const m = outLines[k].match(/^(\d+),/);
      if (!m) continue;
      const tIdx = parseInt(m[1], 10);
      if (tIdx > localMaxIdx) localMaxIdx = tIdx;
      consRows.push(outLines[k].replace(/^(\d+),/, (_mm, d) => `${parseInt(d, 10) + consOffset},`));
    }
    consOffset += localMaxIdx;
  }

  // Single consolidated Fusion-importable library (all tools x all conditions, re-indexed).
  writeFileSync(join(OUT_DIR, "JM-CRIB-ALL-families.csv"), [consHeader, ...consRows].join("\n") + "\n", "utf-8");

  // Per-material-group libraries (one file per ISO group, all tools).
  for (const g of GROUPS) {
    const rows = byGroupRows[g.iso] ?? [];
    const content = [byGroupHeader, ...rows].join("\n") + "\n";
    writeFileSync(join(BY_GROUP_DIR, `JM-CRIB-${g.iso}.csv`), content, "utf-8");
  }

  // Material -> tool TYPE -> BRAND tree (operator: "by material type, then type, then brand").
  // Each leaf is a valid CSV_TOOLS_VERSION_1 library (same header) Fusion imports directly,
  // carrying that material group's SFC-optimal preset rows for one tool-type + one brand.
  // Fail-loud invariant: partitionInputs is pushed in lockstep with byGroupRows, so the tree
  // must file EVERY group row exactly once -- never silently drop or duplicate.
  const byGroupTotal = Object.values(byGroupRows).reduce((a, r) => a + r.length, 0);
  if (partitionInputs.length !== byGroupTotal) {
    throw new Error(`partition lockstep broken: ${partitionInputs.length} partition rows vs ${byGroupTotal} by-group rows`);
  }
  const tbCounts = writeTypeBrandTree(partitionInputs, byGroupHeader);
  if (tbCounts.rows !== byGroupTotal) {
    throw new Error(`material->type->brand tree dropped rows: ${tbCounts.rows} emitted vs ${byGroupTotal} expected`);
  }

  writeBatchSheet(stats);
  writeCategorization();
  writeReadme(stats, srcDir);

  const totalTools = stats.reduce((a, s) => a + s.tools, 0);
  const totalRows = stats.reduce((a, s) => a + s.presetRows, 0);
  console.log(`\nGENERATED ${csvs.length} augmented libraries from ${totalTools} JM tools -> ${totalRows} preset rows`);
  for (const s of stats) console.log(`  ${s.source.padEnd(52)} ${s.tools} tools, ${s.presetRows} rows, ${s.incompatibleGroups} incompat-gated, ${s.skippedGroups} no-data`);
  console.log(`Material->type->brand tree: ${tbCounts.leaves} leaf libraries, ${tbCounts.rows} preset rows`);
  console.log(`Output: ${OUT_DIR}`);
}

// ── Material -> tool TYPE -> BRAND tree emission ────────────────────────────
function writeTypeBrandTree(inputs: PartitionInput[], header: string): { leaves: number; rows: number } {
  const tree = nestByMaterialTypeBrand(inputs);
  const leaves = flattenTree(tree);
  const tbDir = join(OUT_DIR, "by-type-brand");
  mkdirSync(tbDir, { recursive: true });

  const index: string[] = [
    "# JM Die -- Tooling Library: MATERIAL -> TYPE -> BRAND\n",
    "> Per-material-group, per-tool-type, per-brand importable Fusion libraries.",
    "> Each leaf CSV is a valid `CSV_TOOLS_VERSION_1` file (same header Fusion imports);",
    "> its rows carry that material group's SFC-physics-optimal cutting preset (see ../README.md).",
    "> Path layout: `by-type-brand/<ISO>/<tool-type>/<brand>.csv`. A blank tool vendor files",
    "> under `unspecified` (never dropped); a blank type under `unknown-type`.\n",
    "| Material | Tool type | Brand | Tools | File |",
    "|----------|-----------|-------|------:|------|",
  ];
  let leafFiles = 0;
  let leafRows = 0;
  for (const leaf of leaves) {
    const dir = join(tbDir, leaf.iso, leaf.typeSlug);
    mkdirSync(dir, { recursive: true });
    const file = `${leaf.brandSlug}.csv`;
    writeFileSync(join(dir, file), [header, ...leaf.rows].join("\n") + "\n", "utf-8");
    leafFiles++;
    leafRows += leaf.rows.length;
    const rawType = leaf.rawType.replace(/\|/g, "\\|");
    const rawBrand = leaf.rawBrand.replace(/\|/g, "\\|");
    index.push(`| ${leaf.iso} | ${rawType} | ${rawBrand} | ${leaf.rows.length} | by-type-brand/${leaf.iso}/${leaf.typeSlug}/${file} |`);
  }
  index.push("", `_Total: ${leafFiles} (material x type x brand) libraries, ${leafRows} preset rows. U-TOOLDB-MAT-TYPE-BRAND (slot:romeo)._`);
  writeFileSync(join(tbDir, "INDEX.md"), index.join("\n") + "\n", "utf-8");
  return { leaves: leafFiles, rows: leafRows };
}

// ── T4: batch sheet (copy-paste) + categorization ──────────────────────────
function writeBatchSheet(stats: RowStat[]): void {
  // A representative parameter batch matrix per ISO group x tool diameter, so
  // an operator can copy-paste cutting numbers between material groups quickly.
  const dias = [3, 6, 10, 12, 16, 20, 25]; // mm representative end-mill diameters
  const lines: string[] = [];
  lines.push("# JM Die — Material-Group Cutting-Parameter Batches (carbide end mill, roughing)\n");
  lines.push("> Physics-optimal balanced values from `UltimateSpeedFeedEngine.lookupCuttingData`");
  lines.push("> (Kienzle/Taylor CUTTING_PARAMS). Vc = surface speed; SFM = Vc x 3.28084;");
  lines.push("> RPM = Vc*1000/(pi*D); fz = chip load per tooth. Copy a column into the matching");
  lines.push("> Fusion preset, or import the per-group CSV libraries directly.\n");
  for (const dia of dias) {
    lines.push(`\n## Ø${dia} mm carbide end mill (4 flute)\n`);
    lines.push("| Group | Material | Vc (m/min) | SFM | RPM | fz (mm/t) | ap (mm) | ae (mm) | Coolant |");
    lines.push("|-------|----------|-----------:|----:|----:|----------:|--------:|--------:|---------|");
    for (const g of GROUPS) {
      const lk = ultimateSpeedFeedEngine.lookupCuttingData({
        iso_group: g.iso, operation: "milling", cut_type: "roughing",
        tool_diameter_mm: dia, tool_material: "carbide",
      });
      if (!lk) { lines.push(`| ${g.iso} | ${g.name} | — | — | — | — | — | — | — |`); continue; }
      const rpm = Math.round((lk.vc * 1000) / (Math.PI * dia));
      const sfm = Math.round(lk.vc * MPM_TO_SFM);
      lines.push(`| ${g.iso} | ${g.name.replace(/\s*\(.\)$/, "")} | ${fmt(lk.vc, 0)} | ${sfm} | ${rpm} | ${fmt(lk.fz, 3)} | ${fmt(lk.ap, 2)} | ${fmt(lk.ae, 2)} | ${COOLANT_MAP[lk.coolant as string] ?? lk.coolant} |`);
    }
  }
  lines.push("\n---\n_Generated by `scripts/generate-jm-fusion-tool-libraries.ts` — JM-FUSION-TOOLS-MS0/U-JFT-MATGROUP-CRIB._");
  writeFileSync(join(OUT_DIR, "JM-MATERIAL-GROUP-BATCHES.md"), lines.join("\n") + "\n", "utf-8");
}

function writeCategorization(): void {
  // JM's actual stock materials mapped to ISO machinability groups. The
  // programmatic source of truth is `physics/constants.ts` resolveMaterial();
  // this curated table is the operator-facing "categorize my material" view.
  const rows: [string, string, string][] = [
    ["P — Steel", "1018, 1045, 1144, 4130, 4140, 4340, 8620 (annealed/pre-hard)", "Carbon & alloy steel; most die-set / fixture stock"],
    ["M — Stainless", "303, 304, 316, 17-4 PH, 2205 duplex", "Austenitic / PH stainless; gummy, work-hardens — never dwell"],
    ["K — Cast Iron", "Gray iron, ductile/nodular iron, CGI", "Abrasive, short chip; often dry / air"],
    ["N — Non-ferrous", "6061, 7075, 2024 aluminum; C360 brass; C110 copper; plastics", "High Vc; sharp uncoated/polished flutes; chip evacuation critical"],
    ["S — Superalloy/Ti", "Ti-6Al-4V, Inconel 718/625, Hastelloy, Waspaloy", "Low Vc, high heat into tool; flood/HP coolant mandatory"],
    ["H — Hardened", "A2, D2, S7, O1, H13, M2, CPM, carbide blanks (HRC 45-65)", "JM carbide-die stock once hardened; AlTiSiN/CBN, light ap, air"],
  ];
  const out: string[] = [];
  out.push("# JM Die — Material-Group Categorization (ISO 513 P/M/K/N/S/H)\n");
  out.push("Pick the row matching your stock material, then use the matching preset");
  out.push("(`Steel (P)` … `Hardened (H)`) in the generated tool libraries.\n");
  out.push("| ISO Group | JM stock materials | Notes |");
  out.push("|-----------|--------------------|-------|");
  for (const [grp, mats, notes] of rows) out.push(`| **${grp}** | ${mats} | ${notes} |`);
  out.push("\n> JM is a carbide-die shop: most work is **P** (alloy steel) and **H** (hardened");
  out.push("> tool steel); aluminum fixtures are **N**; stainless components **M**.");
  out.push("> Canonical programmatic mapping: `mcp-server/src/physics/constants.ts` `resolveMaterial()`.");
  out.push("\n_Generated by U-JFT-MATGROUP-CRIB (slot:romeo)._");
  writeFileSync(join(OUT_DIR, "JM-MATERIAL-CATEGORIZATION.md"), out.join("\n") + "\n", "utf-8");
}

function writeReadme(stats: RowStat[], srcDir: string): void {
  const totalTools = stats.reduce((a, s) => a + s.tools, 0);
  const out: string[] = [];
  out.push("# JM Die — Fusion 360 Material-Group Tool Libraries\n");
  out.push(`Generated from JM's real production crib (${totalTools} tools, source: \`${srcDir}\`).\n`);
  out.push("## What's here");
  out.push("- `JM-CRIB-ALL-families.csv` -- single all-in-one import (every tool, re-indexed).");
  out.push("- `*-allconditions.csv` -- per source file: each JM tool x per-GRADE x per-TOOLPATH.");
  out.push("  Grades: 1018 / 1045 / 4140-4340 (P); 304-316 / 17-4PH / 2205 (M); Gray / Ductile (K);");
  out.push("  6061-7075 / Brass / Copper (N); Ti-6Al-4V / Inconel (S); Hardened tool steel (H) --");
  out.push("  only grades whose ISO group the tool's coating+substrate is compatible with.");
  out.push("  Toolpaths by tool type: mills get Rough / HEM Adaptive / Trochoidal / Slot / Ramp /");
  out.push("  Semi / Finish / HSM; drills get Drill / Peck; plus Ream, Tap, Bore, Turn, Groove, Thread.");
  out.push("  Each preset = '{grade} {toolpath}', SFM = ISO-base x machinability(grade) x strategy.");
  out.push("- `by-group/JM-CRIB-<ISO>.csv` — one importable library per material group (all tools).");
  out.push("- `JM-MATERIAL-GROUP-BATCHES.md` — copy-paste cutting-parameter matrix by group × diameter.");
  out.push("- `JM-MATERIAL-CATEGORIZATION.md` — JM stock material → ISO group map.\n");
  out.push("## Import into Fusion 360 (cloud or local)");
  out.push("1. Manufacture → Manage → Tool Library.");
  out.push("2. Right-click your Cloud (or Local) library → **Import**.");
  out.push("3. Select a `*.csv` (format: `CSV_TOOLS_VERSION_1` — same as JM's existing exports).");
  out.push("4. Each tool carries multiple GRADE presets, each with grade-specific SFM/RPM/feed.");
  out.push("   Fusion AUTO-SELECTS by your setup's stock material via `Filter by Type`");
  out.push("   (steel / stainless steel / cast iron / aluminum / brass / copper / titanium)");
  out.push("   AND `Filter by hardness` (each grade carries its HB range, so 1018 vs 4140 --");
  out.push("   both `steel` -- are told apart by stock hardness). As-run preset stays `all`.\n");
  out.push("## Provenance / safety");
  out.push("- Geometry + holder collision segments are copied VERBATIM from JM's proven CSVs");
  out.push("  (no unit conversion → no 25.4× scale risk on collision-critical data).");
  out.push("- Cutting presets come from `UltimateSpeedFeedEngine.lookupCuttingData` (Kienzle/Taylor");
  out.push("  CUTTING_PARAMS, balanced). Surface speed/RPM/feed are starting points — verify on the");
  out.push("  machine and adjust for setup rigidity, coolant, and finish.");
  out.push("- Turning/boring presets set CSS surface speed per material and KEEP JM's proven feed/rev");
  out.push("  (turning surface speed is workpiece-diameter driven at the control).\n");
  out.push("| Source file | Tools | Preset rows |");
  out.push("|-------------|------:|------------:|");
  for (const s of stats) out.push(`| ${s.source} | ${s.tools} | ${s.presetRows} |`);
  out.push("\n_Generated by `scripts/generate-jm-fusion-tool-libraries.ts` — JM-FUSION-TOOLS-MS0/U-JFT-MATGROUP-CRIB (slot:romeo)._");
  writeFileSync(join(OUT_DIR, "README.md"), out.join("\n") + "\n", "utf-8");
}

main();
