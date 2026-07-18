#!/usr/bin/env node
// lathe-capability-coverage.mjs -- U-LW-CAPABILITY-COVERAGE (slot:whiskey, 2026-07-01)
// ============================================================================
// Deterministic per-MACHINING-CAPABILITY knowledge/build coverage checker for the Lathe Wizard.
// DISTINCT from build-lathe-knowledge-coverage.mjs (which measures the 5 PRODUCT phases P1-P5:
// Speed/Feed, Post, Master-Post, Print-to-Program, ERP). THIS tool measures whether each of the
// ~50 LATHE MACHINING CAPABILITIES (OD turning ... Swiss polygon ... chatter) has, in the live code:
//   E = an ENGINE (matched in ENGINE_DIGEST.md, the 1-line index of every engine)
//   F = a FORMULA (a symbol in physics/constants.ts OR a class in src/algorithms/)
//   T = TRIBAL data (a file under src/data matching the capability keywords)
//   D = a reachable DISPATCHER action (in the turning/thread/turning_program dispatchers)
// Status: COVERED (>=3 of 4, incl E) | PARTIAL (1-2) | GAP (0 engine or 0 formula).
// Deterministic (grep/index match, no LLM) -> use as the ground-truth cross-check for agent audits.
// Read-only inputs; writes ONE report. No args, no mutation.
// Output: state/shared/lathe-capability-coverage.md

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MCP = resolve(ROOT, "mcp-server");
const OUT = resolve(ROOT, "state/shared/lathe-capability-coverage.md");

// ---- Load source corpora once (fail-soft) -----------------------------------
const readSafe = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const lc = (s) => s.toLowerCase();

const ENGINE_DIGEST = lc(readSafe(resolve(MCP, "data/docs/ENGINE_DIGEST.md")));
const CONSTANTS = lc(readSafe(resolve(MCP, "src/physics/constants.ts")));

// Recursive filename lister (bounded, fail-soft).
function listFiles(dir, exts, acc = []) {
  let ents = [];
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git|dist/.test(p)) listFiles(p, exts, acc); }
    else if (exts.some((x) => e.name.endsWith(x))) acc.push(p);
  }
  return acc;
}

const ENGINE_PATHS = listFiles(resolve(MCP, "src/engines"), [".ts"]);
const ENGINE_FILES = lc(ENGINE_PATHS.join("\n"));
// Engine BODIES too -- exotic capabilities (whirling, Y-axis) live inside engine bodies (e.g.
// LatheAdvancedOperationsEngine) without the term in the 1-line ENGINE_DIGEST summary or the filename.
// Matching only the digest/filename produced FALSE GAPs; grep the bodies (fail-soft per file).
const ENGINE_BODIES = lc(ENGINE_PATHS.map(readSafe).join("\n"));
const ALGO_FILES = lc(listFiles(resolve(MCP, "src/algorithms"), [".ts"]).join("\n"));
const DATA_FILES = lc(listFiles(resolve(MCP, "src/data"), [".ts", ".json"]).join("\n"));
const DISPATCHERS = lc(
  ["turningDispatcher.ts", "threadDispatcher.ts", "turningProgramDispatcher.ts", "millturnDispatcher.ts"]
    .map((f) => readSafe(resolve(MCP, "src/tools/dispatchers", f)))
    .join("\n")
);

const anyIn = (hay, kws) => kws.some((k) => hay.includes(lc(k)));

// ---- Machining-capability taxonomy ------------------------------------------
// Each: keywords chosen to match the ENGINE_DIGEST line / filename / dispatcher action / data file.
const CAPS = [
  // -- Turning basics --
  ["turning", "OD turning (rough+finish)", ["od turning", "turning force", "turningprinttoprogram", "cuttingforce"], ["kienzle", "cutting_force", "kc1_1"], ["turning", "okuma"], ["od_rough", "od_finish", "turning_force"]],
  ["turning", "ID boring", ["boring", "boringbar"], ["deflection", "l3", "boring"], ["boring", "bore"], ["bore_rough", "bore_finish", "boring"]],
  ["turning", "Facing", ["facing", "faceengine", "turningprinttoprogram"], ["kienzle", "cutting_force"], ["facing", "turning"], ["face", "facing"]],
  ["turning", "Contour / profile turning", ["contour", "profile", "revprofile"], ["nurbs", "interp"], ["contour", "profile"], ["contour", "od_contour", "profile"]],
  ["turning", "Taper turning", ["taper"], ["taper", "tan", "angle"], ["taper"], ["taper"]],
  ["turning", "Form turning", ["form turning", "formturn"], ["kienzle"], ["form"], ["form"]],
  ["turning", "Chamfer / corner radius", ["chamfer", "cornersuffix", "cornerradius"], ["corner", "chamfer"], ["chamfer", "corner"], ["chamfer", "corner_r"]],
  // -- Threading --
  ["threading", "Single-point external threading", ["thread", "singlepointthread", "threadturning"], ["thread", "pitch", "iso 68"], ["thread", "g76"], ["thread_single_point", "thread_turning_calc", "g76"]],
  ["threading", "Single-point internal threading", ["internal thread", "threadturning"], ["thread", "minor"], ["thread", "internal"], ["thread", "internal_thread"]],
  ["threading", "Tapping (rigid)", ["tap", "tapping"], ["tap", "pitch"], ["tap"], ["tap", "rigid"]],
  ["threading", "Multi-start threading", ["multi-start", "multistart", "thread"], ["lead", "start", "pitch"], ["multi", "thread"], ["multi_start", "thread"]],
  ["threading", "NPT / tapered pipe thread", ["npt", "pipe thread", "tapered thread"], ["npt", "taper", "1.7899"], ["npt", "pipe"], ["npt", "pipe_thread"]],
  ["threading", "Thread whirling", ["whirl", "whirling"], ["whirl", "eccentric"], ["whirl"], ["whirl"]],
  ["threading", "Thread minor-dia / depth math", ["thread", "threadturning"], ["0.6134", "0.6403", "minor", "pitch"], ["thread"], ["thread"]],
  ["threading", "Thread insert selection", ["thread insert", "insertselect", "threadrobust"], ["thread", "insert"], ["insert", "thread"], ["thread_insert", "select"]],
  // -- Grooving / parting --
  ["grooving", "OD grooving", ["groove", "grooveclassification"], ["groove", "kienzle"], ["groove", "okuma"], ["turning_groove_classify", "groove", "g75"]],
  ["grooving", "ID grooving", ["id groove", "groove"], ["groove"], ["groove", "internal"], ["groove_id", "groove"]],
  ["grooving", "Face grooving", ["face groove", "groove"], ["groove"], ["face groove", "groove"], ["face_groove", "groove"]],
  ["grooving", "Peck grooving (deep)", ["peck", "deepgroove", "groove"], ["peck", "chip"], ["peck", "groove"], ["turning_groove_deep_cycle", "peck"]],
  ["grooving", "Parting / cutoff", ["partoff", "parting", "part-off", "partoffforce"], ["partoff", "blade", "kienzle"], ["parting", "cutoff", "partoff"], ["part_off_force", "turning_partoff_optimize", "g75"]],
  ["grooving", "Part-catcher timing", ["catcher", "part catcher", "partcatcher"], ["catcher", "diameter"], ["catcher"], ["turning_partoff_catcher_timing", "catcher"]],
  ["grooving", "Blade stress / deflection", ["blade", "partoffforce", "bladestress"], ["blade", "stress", "yield", "deflection"], ["blade"], ["turning_partoff_blade_stress", "blade"]],
  // -- Drilling / holes / C-axis --
  ["drilling", "On-center drilling", ["drill", "drilling"], ["thrust", "drill", "peck"], ["drill"], ["drill", "drill_thrust"]],
  ["drilling", "Peck drilling (G74/G83)", ["peck", "drill"], ["peck", "chip"], ["peck", "drill"], ["peck", "g74", "g83", "peck_schedule"]],
  ["drilling", "Spot / center drilling", ["spot drill", "center drill", "centerdrill"], ["spot", "center"], ["spot", "center"], ["spot", "center_drill"]],
  ["drilling", "Drill thrust force", ["drill thrust", "thrust", "drilling"], ["thrust", "drill"], ["thrust"], ["drill_thrust"]],
  ["drilling", "Live-tool cross-drilling @C", ["live tool", "livetool", "crossdrill", "cross-drill"], ["c-axis", "c axis", "polar"], ["live", "cross"], ["live_tool", "cross_drill", "g12.1"]],
  ["drilling", "Live-tool cross-tapping @C", ["live tool", "cross tap", "cross-tap"], ["c-axis", "tap"], ["live", "tap"], ["live_tool", "cross_tap"]],
  ["drilling", "C-axis polar (G12.1/G112) milling", ["c-axis", "caxis", "polar", "millturn"], ["polar", "c-axis", "g12.1", "g112"], ["polar", "c-axis"], ["c_axis", "polar", "g12.1"]],
  ["drilling", "Bolt-circle / hole pattern", ["bolt circle", "bolt-circle", "hole pattern", "boltcircle"], ["bolt", "circle", "polar"], ["bolt", "pattern"], ["bolt_circle", "pattern"]],
  ["drilling", "Boring-bar deflection (L/D)", ["boringbardeflection", "boring bar deflection"], ["deflection", "l3", "d4", "l/d"], ["boring bar", "deflection"], ["boring_reach", "boring_taper_comp", "beam_deflection"]],
  // -- Mill-turn / Swiss --
  ["millturn", "Live-tool milling on lathe", ["live tool", "livetool", "millturn", "mill-turn"], ["live", "milling"], ["live tool", "mill"], ["mill_turn_live_tool", "live_tool_plan"]],
  ["millturn", "Sub-spindle transfer (NO-DROP)", ["subspindle", "sub-spindle", "transfer", "purge"], ["phase", "sync", "transfer"], ["sub-spindle", "transfer"], ["mill_turn_sub_spindle", "subspindle"]],
  ["millturn", "Bar-feeder / bar-puller", ["bar feed", "barfeed", "bar puller", "barpuller"], ["bar", "remnant", "feed"], ["bar"], ["mill_turn_bar_feeder", "bar_pull", "bar_stock_cut_plan"]],
  ["millturn", "Swiss guide-bushing", ["swiss", "guide bushing", "guidebushing"], ["guide", "bushing", "swiss"], ["swiss", "guide"], ["mill_turn_swiss", "swiss_decide", "guide"]],
  ["millturn", "Polygon turning", ["polygon"], ["polygon", "ratio", "sides"], ["polygon"], ["polygon"]],
  ["millturn", "Y-axis on lathe", ["y-axis", "y axis", "yaxis"], ["y-axis", "eccentric"], ["y-axis", "y axis"], ["y_axis", "yaxis"]],
  ["millturn", "Gang-tool / back-working", ["gang", "back-working", "backwork"], ["gang"], ["gang", "back"], ["gang", "back_work"]],
  ["millturn", "Multi-channel scheduling", ["multi-channel", "multichannel", "channel"], ["channel", "sync"], ["channel"], ["mill_turn_multi_channel", "mill_turn_channel_emit"]],
  ["millturn", "Turret layout / interference", ["turret"], ["turret", "interference"], ["turret"], ["turret_analyze_capability", "turret_check_interference"]],
  // -- Physics / limitations --
  ["physics", "Regenerative chatter / stability lobes", ["chatter", "stability", "stabilitylobe"], ["stability", "lobe", "frf", "regener"], ["chatter"], ["chatter_analysis", "chatter"]],
  ["physics", "Part deflection", ["partdeflection", "part deflection"], ["deflection", "l3", "3ei"], ["deflection"], ["deflection", "springback_comp"]],
  ["physics", "Workpiece thermal growth", ["thermodynamics", "thermal"], ["cte", "thermal", "expansion", "alpha"], ["thermal"], ["thermal"]],
  ["physics", "Chuck-jaw grip + centrifugal", ["chuckjaw", "chuck jaw", "jaw force"], ["grip", "centrifugal", "clamp", "rpm"], ["chuck", "jaw"], ["chuck_force", "workholding", "jaw"]],
  ["physics", "Spindle torque limit", ["spindle torque", "torque"], ["torque", "power"], ["torque", "spindle"], ["spindle_torque", "torque"]],
  ["physics", "Spindle power limit", ["spindle power", "power"], ["power", "kw", "mrr"], ["power", "spindle"], ["spindle_power", "power"]],
  ["physics", "G50 overspeed clamp (G96 CSS)", ["css", "cssoptimizer", "g50", "overspeed"], ["css", "g50", "g96", "rpm"], ["css", "g50", "overspeed"], ["g50", "css", "swing_check"]],
  ["physics", "Tool wear / Taylor life", ["wear", "toollife", "wearprediction", "insertlife"], ["taylor", "wear", "vb", "flank"], ["wear", "life"], ["insert_life", "offset_wear", "wear"]],
  ["physics", "Surface finish Ra-from-feed", ["surfacefinish", "surface finish", "ra"], ["ra", "surface", "nose radius", "8"], ["surface", "finish"], ["surface", "ra", "cpk_surrogate"]],
  ["physics", "Hard-turning gate", ["hardturning", "hard turning", "hardturn"], ["hard", "hrc", "cbn"], ["hard turn"], ["hard_turn_decide", "hard_turn_optimize"]],
  ["physics", "Toxic-material / Ti-fire gate", ["toxic", "ti fire", "coolantstrategy", "berylium", "becu"], ["coolant", "titanium", "fire"], ["coolant", "toxic", "titanium"], ["coolant", "toxic"]],
  ["physics", "Residual stress / surface integrity", ["surfaceintegrity", "residual", "residualstress"], ["residual", "stress", "fatigue"], ["residual", "integrity"], ["residual", "integrity"]],
];

// ---- Evaluate ---------------------------------------------------------------
function evalCap([cluster, name, engKw, formKw, tribKw, dispKw]) {
  const E = anyIn(ENGINE_DIGEST, engKw) || anyIn(ENGINE_FILES, engKw) || anyIn(ENGINE_BODIES, engKw);
  const F = anyIn(CONSTANTS, formKw) || anyIn(ALGO_FILES, formKw);
  const T = anyIn(DATA_FILES, tribKw);
  const D = anyIn(DISPATCHERS, dispKw);
  const score = [E, F, T, D].filter(Boolean).length;
  let status;
  if (!E && !F) status = "GAP";
  else if (score >= 3 && E) status = "COVERED";
  else status = "PARTIAL";
  return { cluster, name, E, F, T, D, score, status };
}

const rows = CAPS.map(evalCap);
const covered = rows.filter((r) => r.status === "COVERED").length;
const partial = rows.filter((r) => r.status === "PARTIAL").length;
const gaps = rows.filter((r) => r.status === "GAP");

// ---- Report -----------------------------------------------------------------
const chk = (b) => (b ? "✅" : "❌");
const now = process.env.PRISM_STAMP || "(run date via git)";
let md = `# Lathe MACHINING-CAPABILITY Coverage (deterministic) -- ${now}\n\n`;
md += `> Per-capability E/F/T/D coverage across the FULL lathe machining taxonomy (${rows.length} capabilities).\n`;
md += `> Distinct from lathe-knowledge-coverage.md (which measures the 5 PRODUCT phases). Deterministic grep/index\n`;
md += `> match -> use as the ground-truth cross-check for agent coverage audits. Regen: node scripts/lathe-capability-coverage.mjs\n\n`;
md += `**Summary:** ${covered} COVERED · ${partial} PARTIAL · ${gaps.length} GAP (of ${rows.length}).\n`;
md += `Legend: E=engine (ENGINE_DIGEST/filename) · F=formula (constants.ts/algorithms) · T=tribal (src/data) · D=dispatcher action.\n\n`;
md += `| Cluster | Capability | E | F | T | D | Status |\n|---|---|:-:|:-:|:-:|:-:|---|\n`;
for (const r of rows) md += `| ${r.cluster} | ${r.name} | ${chk(r.E)} | ${chk(r.F)} | ${chk(r.T)} | ${chk(r.D)} | ${r.status} |\n`;
if (gaps.length) {
  md += `\n## GAPS (no engine OR no formula) -- genuine build candidates\n`;
  for (const g of gaps) md += `- **${g.name}** (${g.cluster}): E=${g.E} F=${g.F} T=${g.T} D=${g.D}\n`;
} else {
  md += `\n## GAPS\nNone -- every capability has at least an engine or a formula.\n`;
}
const partials = rows.filter((r) => r.status === "PARTIAL");
if (partials.length) {
  md += `\n## PARTIAL (thin coverage -- verify) \n`;
  for (const p of partials) md += `- ${p.name} (${p.cluster}): missing ${["E","F","T","D"].filter((k) => !p[k]).join("/")}\n`;
}

writeFileSync(OUT, md);
console.log(`wrote ${OUT}`);
console.log(`  capabilities: ${rows.length} | COVERED ${covered} | PARTIAL ${partial} | GAP ${gaps.length}`);
if (gaps.length) console.log(`  gaps: ${gaps.map((g) => g.name).join("; ")}`);
