/**
 * SFC ENGINE PARITY PROBE -- page engine vs validated physics core vs published carbide reference.
 *
 * WHY: the customer-facing SFC web page runs ProductEngine.sfcCalculate ->
 * ManufacturingCalculations.calculateSpeedFeed, a SEPARATE/simpler engine from the
 * 11.2M-corpus-validated SpeedFeedOrchestratorEngine (which sfc_nine_axis + the variability
 * corpus use). They diverge ~3.7-6.9x. Before any rewire we must settle WHICH is physically
 * correct by anchoring both against published carbide milling cutting-speed bands.
 *
 * This is a DIAGNOSTIC harness (read-only, no writes); it prints a numeric table + verdict.
 * Run under tsx:  node_modules/.bin/tsx scripts/sfc-engine-parity-probe.mjs
 *
 * Reference bands: coated-carbide endmill, roughing, flood coolant -- general-purpose vc (m/min)
 * from Machinery's Handbook 31e + Sandvik Coromant + manufacturer GP carbide milling data.
 * These are surface-speed bands; they are independent of tool slenderness (deflection limits
 * depth/width/feed, NOT vc -- vc is a Taylor tool-life/temperature quantity).
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// dynamic import() of an absolute Windows path needs a file:// URL (tsx/Node ESM
// rejects the bare `H:\...` form as an unsupported `h:` URL scheme).
const SRC = (p) => pathToFileURL(resolve(__dirname, "..", "mcp-server", "src", "engines", p)).href;

const { speedFeedOrchestratorEngine } = await import(SRC("SpeedFeedOrchestratorEngine.ts"));
const { productSFC } = await import(SRC("ProductEngine.ts"));
const { speedFeedNineAxisOrchestratorEngine } = await import(SRC("SpeedFeedNineAxisOrchestratorEngine.ts"));

const D = 12; // tool diameter mm
const Z = 4; // flutes
const AP = 6; // depth mm
const AE = 6; // radial width mm (half-immersion)
const MACH = { id: "VMC-03", name: "Haas VF-2", maxRpm: 8100, powerKw: 22.4 };

// material grade -> {iso, hb, pageCategory, vcRefLo, vcRefHi}  (vc band in m/min, coated carbide GP milling)
const CASES = [
  { grade: "1045", iso: "P", hb: 180, page: "steel",     vcLo: 110, vcHi: 200 },
  { grade: "4140", iso: "P", hb: 200, page: "steel",     vcLo: 90,  vcHi: 160 },
  { grade: "316",  iso: "M", hb: 170, page: "stainless", vcLo: 75,  vcHi: 140 },
  { grade: "6061", iso: "N", hb: 95,  page: "aluminum",  vcLo: 300, vcHi: 900 },
];

function coreInput(c) {
  return {
    machine_name: MACH.id, machine_type: "vertical_mill",
    machine_power_kw: MACH.powerKw, machine_max_rpm: MACH.maxRpm,
    machine_rigidity: "medium", machine_guideway: "box", machine_age_years: 3,
    machine_axis_accel_m_s2: 2, machine_axis_jerk_m_s3: 10,
    spindle_taper: "BT40", spindle_bearing_preload: "medium", controller: "fanuc-30i",
    coolant_type: "flood", coolant_pressure_bar: 1, coolant_concentration_pct: 5,
    material: c.grade, iso_group: c.iso, hardness_hb: c.hb,
    operation: "milling", cut_type: "roughing", strategy: "conventional",
    holder_type: "ER_collet", holder_gauge_length_mm: 60, holder_tir_mm: 2, holder_balanced_g: 2.5,
    tool_diameter_mm: D, flutes: Z, tool_material: "carbide", tool_coating: "AlCrN",
    helix_angle_deg: 45, corner_radius_mm: 0.4, tool_stickout_mm: 36,
    // OrchestratorInput reads axial_depth_mm/radial_depth_mm -- NOT ap_mm/ae_mm. Sending the
    // wrong names made compute() fall back to its DEFAULT ap=12 (=D, full-diameter depth), which
    // maxes the deflection limiter (95%) and collapses fz to a false 0.014 rubbing value. With the
    // correct names ap=6 is honored and fz returns to a realistic ~0.036 (fix 2026-06-29 slot:oscar).
    axial_depth_mm: AP, radial_depth_mm: AE,
    workholding_type: "vise", workholding_stiffness: "high", clamping_force_kN: 20,
    spindle_torque_curve_archetype: "constant-torque", optimize_for: "balanced",
  };
}

function pageInput(c) {
  // The real codex page (SmartMaterialSelector) sends GRADE ids ("1045","316",
  // "6061") -- which resolve in ProductEngine.MATERIAL_HARDNESS to the right ISO
  // group -- NOT category strings ("steel"/"stainless"), which fall back to steel.
  return {
    material: c.grade, material_hardness: c.hb, tool_material: "Carbide",
    tool_diameter: D, number_of_teeth: Z, operation: "milling",
    depth_of_cut: AP, width_of_cut: AE,
    machine_power_kw: MACH.powerKw, machine_max_rpm: MACH.maxRpm, tier: "pro",
  };
}

function nineAxisInput(c) {
  // SpeedFeedNineAxisOrchestratorEngine.run() uses a structured per-category input shape
  // (the engine the page's Advanced panel routes to). Mirror the CORE cell physically.
  return {
    machine: { way_type: "box_way", build_quality: "production", rigidity: "medium", weight_kg: 3000, power_kw: MACH.powerKw, max_rpm: MACH.maxRpm, accuracy_um: 5 },
    spindle: { hp: Math.round(MACH.powerKw * 1.34), through_spindle_coolant: true },
    controller: { brand: "fanuc", high_speed_machining: true },
    material: { name: c.grade, iso_group: c.iso, hardness_hb: c.hb },
    workholding: { type: "kurt_vise", clamp_force_available_kn: 20 },
    tool_holder: { type: "er_collet", balance_class: "g2_5", runout_tir_um: 2 },
    tooling: { tool_diameter_mm: D, flutes: Z, tool_material: "carbide", stickout_mm: 36 },
    coolant: { type: "flood" },
    toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional", axial_depth_mm: AP, radial_depth_mm: AE },
    mode: "prism_optimized",
  };
}

function unwrap(out) {
  const o = out;
  return o && typeof o === "object" && o.value && typeof o.value === "object" ? o.value : o;
}

const inBand = (v, lo, hi) => (v >= lo && v <= hi ? "IN " : v < lo ? "LO " : "HI ");
const f = (x, d = 1) => (typeof x === "number" && isFinite(x) ? x.toFixed(d) : String(x));

console.log("SFC ENGINE PARITY PROBE -- " + MACH.name + " | 12mm 4FL carbide | ap=" + AP + " ae=" + AE + " (mill, roughing)");
console.log("=".repeat(118));
console.log(
  ["grade".padEnd(6), "ref vc band".padEnd(13), "engine".padEnd(7),
   "vc".padStart(7), "band".padEnd(4), "rpm".padStart(7), "fz".padStart(7),
   "feed".padStart(8), "kW".padStart(7), "life".padStart(7)].join(" | "),
);
console.log("-".repeat(118));

const rows = [];
for (const c of CASES) {
  const refStr = c.vcLo + "-" + c.vcHi;
  // CORE
  let core;
  try { core = unwrap(speedFeedOrchestratorEngine.compute(coreInput(c))); }
  catch (e) { core = { __err: String(e && e.message || e) }; }
  // PAGE
  let page;
  try {
    const out = productSFC("sfc_calculate", pageInput(c));
    page = out && out.error ? { __err: out.error } : (out && out.result) || {};
  } catch (e) { page = { __err: String(e && e.message || e) }; }

  // NINE (SpeedFeedNineAxisOrchestrator -- the engine the page's Advanced panel routes to)
  let nine;
  try {
    const r9 = speedFeedNineAxisOrchestratorEngine.run(nineAxisInput(c));
    nine = (r9 && r9.recommendation) || { __err: "no recommendation" };
  } catch (e) { nine = { __err: String(e && e.message || e) }; }

  const coreVc = core.cutting_speed_mpm;
  const pageVc = page.cutting_speed_m_min;
  const nineVc = nine.cutting_speed_mpm;
  rows.push({ grade: c.grade, ref: [c.vcLo, c.vcHi], coreVc, pageVc, nineVc });

  const coreLine = core.__err
    ? ["", "", "CORE".padEnd(7), "ERR".padStart(7), "   ", "", "", "", "", ""].join(" | ") + "  " + core.__err
    : [c.grade.padEnd(6), refStr.padEnd(13), "CORE".padEnd(7),
       f(coreVc).padStart(7), inBand(coreVc, c.vcLo, c.vcHi).padEnd(4),
       f(core.spindle_rpm, 0).padStart(7), f(core.feed_per_tooth_mm, 4).padStart(7),
       f(core.feed_rate_mmmin, 0).padStart(8), f(core.power_kw, 2).padStart(7),
       f(core.tool_life_min, 0).padStart(7)].join(" | ");
  const pageLine = page.__err
    ? ["", "", "PAGE".padEnd(7), "ERR".padStart(7), "   ", "", "", "", "", ""].join(" | ") + "  " + page.__err
    : ["".padEnd(6), "".padEnd(13), "PAGE".padEnd(7),
       f(pageVc).padStart(7), inBand(pageVc, c.vcLo, c.vcHi).padEnd(4),
       f(page.spindle_rpm, 0).padStart(7), f(page.feed_per_tooth_mm, 4).padStart(7),
       f(page.table_feed_mm_min, 0).padStart(8), f(page.power_kW, 2).padStart(7),
       f(page.tool_life_min, 0).padStart(7)].join(" | ");
  const nineLine = nine.__err
    ? ["", "", "NINE".padEnd(7), "ERR".padStart(7), "   ", "", "", "", "", ""].join(" | ") + "  " + nine.__err
    : ["".padEnd(6), "".padEnd(13), "NINE".padEnd(7),
       f(nineVc).padStart(7), inBand(nineVc, c.vcLo, c.vcHi).padEnd(4),
       f(nine.spindle_rpm, 0).padStart(7), f(nine.feed_per_tooth_mm, 4).padStart(7),
       f(nine.feed_rate_mmmin, 0).padStart(8), f(nine.power_kw, 2).padStart(7),
       f(nine.tool_life_min, 0).padStart(7)].join(" | ");
  console.log(coreLine);
  console.log(pageLine);
  console.log(nineLine);
  console.log("-".repeat(118));
}

console.log("\nVERDICT (vc vs published carbide band):");
for (const r of rows) {
  const ratio = (typeof r.coreVc === "number" && typeof r.pageVc === "number" && r.coreVc > 0)
    ? (r.pageVc / r.coreVc) : NaN;
  const coreVerd = typeof r.coreVc === "number" ? inBand(r.coreVc, r.ref[0], r.ref[1]).trim() : "ERR";
  const pageVerd = typeof r.pageVc === "number" ? inBand(r.pageVc, r.ref[0], r.ref[1]).trim() : "ERR";
  const nineVerd = typeof r.nineVc === "number" ? inBand(r.nineVc, r.ref[0], r.ref[1]).trim() : "ERR";
  console.log(
    "  " + r.grade.padEnd(5) + " ref " + (r.ref[0] + "-" + r.ref[1]).padEnd(9) +
    " | core(orch) vc=" + f(r.coreVc).padStart(7) + " [" + coreVerd + "]" +
    " | page(prod) vc=" + f(r.pageVc).padStart(7) + " [" + pageVerd + "]" +
    " | nine(9ax) vc=" + f(r.nineVc).padStart(7) + " [" + nineVerd + "]",
  );
}
console.log("\nband legend: IN=within published band, LO=below (over-conservative), HI=above (over-aggressive)");
