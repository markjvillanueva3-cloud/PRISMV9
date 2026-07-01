/**
 * R2 Golden Benchmark Test Runner — WIRED (R2-MS0-T2)
 * Calls actual PRISM engine functions against golden-benchmarks.json
 * Usage: npx tsx tests/r2/run-benchmarks.ts [--filter=B001] [--group=P] [--calc=cutting_force] [--verbose]
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";

// Engine imports — direct access to calculation functions
import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateJohnsonCookStress,
  calculateSurfaceFinish,
  calculateMRR,
  calculateSpeedFeed,
  calculateSpindlePower,
  calculateChipLoad,
  calculateTorque,
  getDefaultKienzle,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients,
  type JohnsonCookParams,
} from "../../src/engines/ManufacturingCalculations";

import {
  calculateStabilityLobes,
  calculateToolDeflection,
  calculateCuttingTemperature,
  calculateMinimumCostSpeed,
} from "../../src/engines/AdvancedCalculations";

import {
  calculateTrochoidalParams,
  calculateHSMParams,
  calculateScallopHeight,
  calculateChipThinning,
  calculateMultiPassStrategy,
  recommendCoolantStrategy,
} from "../../src/engines/ToolpathCalculations";

// Lazy-loaded to avoid double init side-effects
let _threadEngine: any = null;
async function getThreadEngine() {
  if (!_threadEngine) {
    const mod = await import("../../src/engines/ThreadCalculationEngine");
    _threadEngine = new mod.ThreadCalculationEngine();
  }
  return _threadEngine;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExpectedValue {
  value: number | string | boolean;
  tolerance_pct?: number;
}

interface Benchmark {
  id: string;
  calc_type: string;
  name: string;
  material: { id: string; iso_group: string; name: string };
  operation: string;
  tool: Record<string, any>;
  params: Record<string, any>;
  expected: Record<string, ExpectedValue>;
}

interface CheckResult {
  field: string;
  expected: number | string | boolean;
  actual: number | string | boolean | undefined;
  tolerance_pct: number;
  delta_pct: number | null;
  pass: boolean;
}

interface BenchmarkResult {
  id: string;
  name: string;
  calc_type: string;
  iso_group: string;
  status: "PASS" | "FAIL" | "ERROR" | "SKIP";
  checks: CheckResult[];
  error?: string;
  raw_output?: any;
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const scriptDir = dirname(resolve(process.argv[1]));
const args = process.argv.slice(2).reduce((a: Record<string, string>, v) => {
  const [k, val] = v.replace("--", "").split("=");
  a[k] = val ?? "true";
  return a;
}, {});

const verbose = "verbose" in args;

// ---------------------------------------------------------------------------
// Load benchmarks
// ---------------------------------------------------------------------------
const bmPath = resolve(scriptDir, "golden-benchmarks.json");
const bmData = JSON.parse(readFileSync(bmPath, "utf-8"));
let tests: Benchmark[] = bmData.benchmarks;

if (args.filter) tests = tests.filter((b) => b.id === args.filter);
if (args.group) tests = tests.filter((b) => b.material.iso_group === args.group);
if (args.calc) tests = tests.filter((b) => b.calc_type === args.calc);

// ---------------------------------------------------------------------------
// Default Kienzle coefficients by ISO group (used when benchmarks don't provide kc1_1)
// These are approximate handbook values for representative materials
// ---------------------------------------------------------------------------
const KIENZLE_BY_ISO: Record<string, KienzleCoefficients> = {
  P: { kc1_1: 1800, mc: 0.25 },  // Medium carbon steel baseline
  M: { kc1_1: 2100, mc: 0.25 },  // Austenitic stainless
  K: { kc1_1: 1100, mc: 0.25 },  // Gray cast iron
  N: { kc1_1: 700, mc: 0.25 },   // Aluminum alloys
  S: { kc1_1: 2800, mc: 0.25 },  // Superalloys (Inconel, Ti)
  H: { kc1_1: 3500, mc: 0.25 },  // Hardened steels
};

// More specific values per benchmark material
const KIENZLE_BY_MATERIAL: Record<string, KienzleCoefficients> = {
  "AISI 4130 Annealed":   { kc1_1: 1700, mc: 0.25 },
  "AISI 1045":            { kc1_1: 1800, mc: 0.25 },
  "AISI 4340":            { kc1_1: 1900, mc: 0.25 },
  "AISI 1020":            { kc1_1: 1600, mc: 0.22 },
  "AISI 316L":            { kc1_1: 2100, mc: 0.26 },
  "Duplex 2205":          { kc1_1: 2400, mc: 0.27 },
  "AISI 304":             { kc1_1: 2000, mc: 0.26 },
  "GG25 Gray Cast Iron":  { kc1_1: 1100, mc: 0.24 },
  "GG25":                 { kc1_1: 1100, mc: 0.24 },
  "GGG50 Ductile Iron":   { kc1_1: 1400, mc: 0.25 },
  "GG30":                 { kc1_1: 1200, mc: 0.24 },
  "6061-T6 Aluminum":     { kc1_1: 700, mc: 0.23 },
  "6061-T6":              { kc1_1: 700, mc: 0.23 },
  "7075-T6 Aluminum":     { kc1_1: 800, mc: 0.23 },
  "7075-T6":              { kc1_1: 800, mc: 0.23 },
  "C110 Copper":          { kc1_1: 750, mc: 0.22 },
  "Inconel 718":          { kc1_1: 2800, mc: 0.25 },
  "Ti-6Al-4V":            { kc1_1: 1500, mc: 0.23 },
  "AISI D2 60HRC":        { kc1_1: 3500, mc: 0.28 },
  "AISI H13 52HRC":       { kc1_1: 3200, mc: 0.27 },
};

function getKienzle(b: Benchmark): KienzleCoefficients {
  if (b.params.kc1_1 && b.params.mc) return { kc1_1: b.params.kc1_1, mc: b.params.mc };
  return KIENZLE_BY_MATERIAL[b.material.name] ?? KIENZLE_BY_ISO[b.material.iso_group] ?? { kc1_1: 1800, mc: 0.25 };
}

// Thermal conductivity by material (W/m·K)
const THERMAL_K: Record<string, number> = {
  "AISI 316L": 14, "AISI 304": 16, "Duplex 2205": 15,
  "Inconel 718": 11, "Ti-6Al-4V": 7,
  "AISI D2 60HRC": 20, "AISI H13 52HRC": 25,
  "6061-T6 Aluminum": 167, "7075-T6": 130,
  "AISI 4130 Annealed": 42, "AISI 1045": 50, "AISI 4340": 44,
  "GG25 Gray Cast Iron": 48, "GG25": 48, "GG30": 48,
};

// ---------------------------------------------------------------------------
// Calculation adapters — map benchmark params to engine function calls
// ---------------------------------------------------------------------------

function runCuttingForce(b: Benchmark): any {
  const p = b.params;
  const kienzle = getKienzle(b);

  // Determine operation-specific params
  const isMilling = ["milling", "face_milling", "trochoidal_milling", "hsm_milling"].includes(b.operation);
  const isDrilling = b.operation === "drilling";

  if (isDrilling) {
    // Drilling: use feed_per_rev and derive chip geometry
    const D = b.tool.diameter_mm;
    const f = p.f_mmrev;
    const Vc = p.Vc_mpm;
    // For drilling, approximate as a 2-flute milling operation with ae=D
    const conditions: CuttingConditions = {
      cutting_speed: Vc,
      feed_per_tooth: f / 2,  // 2 cutting edges
      axial_depth: D / 2,     // Effective depth per lip
      radial_depth: D,        // Full engagement
      tool_diameter: D,
      number_of_teeth: 2,
      rake_angle: (180 - (b.tool.point_angle_deg ?? 140)) / 2,
    };
    return calculateKienzleCuttingForce(conditions, kienzle);
  }

  if (isMilling) {
    const conditions: CuttingConditions = {
      cutting_speed: p.Vc_mpm,
      feed_per_tooth: p.fz_mm,
      axial_depth: p.ap_mm,
      radial_depth: p.ae_mm ?? p.ae_max_mm ?? b.tool.diameter_mm * 0.5,
      tool_diameter: b.tool.diameter_mm,
      number_of_teeth: b.tool.flutes ?? 4,
      rake_angle: b.tool.helix_deg ? Math.min(b.tool.helix_deg, 20) : 6,
    };
    return calculateKienzleCuttingForce(conditions, kienzle);
  }

  // Turning: feed_per_rev → use as feed_per_tooth with z=1
  // For Kienzle in turning: h = f (feed per rev), b = ap (depth of cut)
  // The engine uses milling chip geometry: h_mean = fz * f(ae/D)
  // To get h ≈ f for turning, set ae = D (full engagement ratio = 1)
  const D = b.tool.diameter_mm ?? 12;
  const conditions: CuttingConditions = {
    cutting_speed: p.Vc_mpm,
    feed_per_tooth: p.f_mmrev,
    axial_depth: p.ap_mm,
    radial_depth: D,   // ae = D → engagement_ratio = 1 → h_mean ≈ fz
    tool_diameter: D,
    number_of_teeth: 1,
    rake_angle: 6,
  };
  return calculateKienzleCuttingForce(conditions, kienzle);
}

function runToolLife(b: Benchmark): any {
  const p = b.params;
  const coefficients: TaylorCoefficients = {
    C: p.C,
    n: p.n,
    tool_material: b.tool.type ?? "carbide",
  };
  return calculateTaylorToolLife(p.Vc_mpm, coefficients);
}

function runSurfaceFinish(b: Benchmark): any {
  const p = b.params;
  const nose_r = b.tool.nose_radius_mm ?? 0.8;
  const feed = p.f_mmrev ?? p.fz_mm ?? 0.1;
  return calculateSurfaceFinish(feed, nose_r);
}

function runMRR(b: Benchmark): any {
  const p = b.params;
  const conditions: CuttingConditions = {
    cutting_speed: p.Vc_mpm,
    feed_per_tooth: p.fz_mm,
    axial_depth: p.ap_mm,
    radial_depth: p.ae_mm,
    tool_diameter: b.tool.diameter_mm,
    number_of_teeth: b.tool.flutes ?? 4,
  };
  return calculateMRR(conditions);
}

function runThermal(b: Benchmark): any {
  const p = b.params;
  const kienzle = getKienzle(b);
  // Specific force for thermal calc: kc1_1 as approximation
  const kc = kienzle.kc1_1;
  const k_thermal = THERMAL_K[b.material.name] ?? 50;
  const feed = p.f_mmrev ?? p.fz_mm ?? 0.15;
  const depth = p.ap_mm ?? 1.0;
  return calculateCuttingTemperature(p.Vc_mpm, feed, depth, kc, k_thermal);
}

function runStability(b: Benchmark): any {
  const p = b.params;
  const t = b.tool;
  // Derive modal parameters from tool geometry
  const D = t.diameter_mm;
  const L = t.overhang_mm ?? 40;
  const E = 580e3; // Carbide E in N/mm² → 580 GPa
  const I = (Math.PI * Math.pow(D, 4)) / 64; // mm⁴
  const stiffness = (3 * E * I) / Math.pow(L, 3); // N/mm → N/m (×1000)
  const kienzle = getKienzle(b);

  return calculateStabilityLobes({
    natural_frequency: 2000,  // Typical for slender endmill
    damping_ratio: 0.03,
    stiffness: stiffness * 1000, // N/m
    specific_force: kienzle.kc1_1,
    number_of_teeth: t.flutes ?? 4,
    current_depth: p.ap_mm,
    current_speed: p.spindle_speed_rpm,
  });
}

function runDeflection(b: Benchmark): any {
  const p = b.params;
  const t = b.tool;
  return calculateToolDeflection(
    p.Fc_N,
    t.diameter_mm ?? t.shank_diameter_mm,
    t.overhang_mm,
    p.E_GPa ?? 580,
  );
}

function runTrochoidal(b: Benchmark): any {
  const p = b.params;
  const t = b.tool;
  return calculateTrochoidalParams(
    t.diameter_mm,
    p.slot_width_mm,
    p.ap_mm,
    p.Vc_mpm,
    p.fz_mm,
    t.flutes ?? 4,
  );
}

function runHSM(b: Benchmark): any {
  const p = b.params;
  const t = b.tool;
  // HSM needs programmed feedrate — compute from Vc, fz, D, z
  const D = t.diameter_mm;
  const z = t.flutes ?? 3;
  const rpm = (p.Vc_mpm * 1000) / (Math.PI * D);
  const vf = p.fz_mm * z * rpm;
  return { ...calculateHSMParams(D, vf), spindle_rpm: rpm, mrr: p.fz_mm * z * rpm * p.ap_mm * p.ae_mm / 1000 };
}

function runChipThinning(b: Benchmark): any {
  const p = b.params;
  return calculateChipThinning(
    p.tool_diameter_mm,
    p.ae_mm,
    p.fz_nominal_mm,
    4, // number_of_teeth
    150, // cutting_speed (default, not critical for chip thinning)
  );
}

function runScallop(b: Benchmark): any {
  const p = b.params;
  const t = b.tool;
  const R = t.diameter_mm / 2;
  // scallop needs surface_width and feed_rate — use reasonable defaults
  return calculateScallopHeight(R, p.stepover_mm, 50, 1000, true);
}

function runMultiPass(b: Benchmark): any {
  const p = b.params;
  const t = b.tool;
  const kienzle = getKienzle(b);
  return calculateMultiPassStrategy(
    p.total_depth_mm,
    t.diameter_mm,
    kienzle.kc1_1,
    22,  // typical machine power kW
    p.Vc_mpm,
    p.Vc_mpm * 0.8,  // finish speed slightly lower
    p.fz_mm,
    p.fz_mm * 0.5,   // finish feed lower
  );
}

function runCoolantStrategy(b: Benchmark): any {
  const p = b.params;
  return recommendCoolantStrategy(
    b.material.iso_group,
    b.operation,
    p.Vc_mpm,
    false, // assume no through-spindle coolant for initial test
  );
}

function runCostOptimize(b: Benchmark): any {
  const p = b.params;
  // Taylor coefficients from benchmark or defaults
  const C = p.C ?? 300;
  const n = p.n ?? 0.25;
  return calculateMinimumCostSpeed(
    C,
    n,
    { machine_rate: p.machine_rate_hr / 60, tool_cost: b.tool.cost_per_edge, tool_change_time: 2 },
  );
}

function runPower(b: Benchmark): any {
  const p = b.params;
  const t = b.tool;
  // First calculate cutting force to get Fc
  const kienzle = getKienzle(b);
  const conditions: CuttingConditions = {
    cutting_speed: p.Vc_mpm,
    feed_per_tooth: p.fz_mm,
    axial_depth: p.ap_mm,
    radial_depth: p.ae_mm,
    tool_diameter: t.diameter_mm,
    number_of_teeth: t.flutes ?? 4,
    rake_angle: 6,
  };
  const forces = calculateKienzleCuttingForce(conditions, kienzle);
  const powerResult = calculateSpindlePower(forces.Fc, p.Vc_mpm, t.diameter_mm, p.efficiency ?? 0.8);
  return {
    ...powerResult,
    spindle_power_kW: p.spindle_power_kW,
    utilization_pct: (powerResult.power_spindle_kw / p.spindle_power_kW) * 100,
    safe: powerResult.power_spindle_kw <= p.spindle_power_kW,
  };
}

function runTorque(b: Benchmark): any {
  const p = b.params;
  const t = b.tool;
  // Calculate force first for drilling
  const kienzle = getKienzle(b);
  const D = t.diameter_mm;
  const conditions: CuttingConditions = {
    cutting_speed: p.Vc_mpm,
    feed_per_tooth: p.f_mmrev / 2,
    axial_depth: D / 2,
    radial_depth: D,
    tool_diameter: D,
    number_of_teeth: 2,
    rake_angle: (180 - (t.point_angle_deg ?? 140)) / 2,
  };
  const forces = calculateKienzleCuttingForce(conditions, kienzle);
  const torqueResult = calculateTorque(forces.Fc, D, "drilling");
  return {
    ...torqueResult,
    spindle_torque_Nm: p.spindle_torque_Nm,
    safe: torqueResult.torque_nm <= p.spindle_torque_Nm,
  };
}

function runChipLoad(b: Benchmark): any {
  const p = b.params;
  const t = b.tool;
  const D = t.diameter_mm;
  const z = t.flutes ?? 2;
  const rpm = (p.Vc_mpm * 1000) / (Math.PI * D);
  const vf = p.fz_mm * z * rpm;
  return calculateChipLoad(vf, rpm, z, p.ae_mm, D);
}

function runSpeedFeed(b: Benchmark): any {
  const p = b.params;
  const t = b.tool;
  return calculateSpeedFeed({
    material_hardness: 200,
    tool_material: (t.type ?? "Carbide") as any,
    operation: (p.operation_type ?? "roughing") as any,
    tool_diameter: t.diameter_mm ?? 12,
    number_of_teeth: t.flutes ?? 1,
  });
}

function runFlowStress(b: Benchmark): any {
  const p = b.params;
  const jcParams: JohnsonCookParams = {
    A: p.A_MPa,
    B: p.B_MPa,
    n: p.n,
    C: p.C,
    m: p.m,
    T_melt: p.T_melt_C,
    T_ref: p.T_ref_C ?? 25,
  };
  return calculateJohnsonCookStress(p.strain, p.strain_rate, p.temperature_C, jcParams);
}

async function runThreadMill(b: Benchmark): Promise<any> {
  const p = b.params;
  const engine = await getThreadEngine();
  const tapResult = engine.calculateTapDrill(p.thread_size, 75);
  const engPct = engine.calculateEngagement(
    tapResult?.tap_drill_diameter ?? 10.25,
    p.thread_size,
  );
  return {
    tap_drill_mm: tapResult?.tap_drill_diameter,
    engagement_pct: engPct,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher — route benchmark to correct engine function
// ---------------------------------------------------------------------------
async function executeBenchmark(b: Benchmark): Promise<any> {
  switch (b.calc_type) {
    case "cutting_force": return runCuttingForce(b);
    case "tool_life":     return runToolLife(b);
    case "surface_finish": return runSurfaceFinish(b);
    case "mrr":           return runMRR(b);
    case "thermal":       return runThermal(b);
    case "stability":     return runStability(b);
    case "deflection":    return runDeflection(b);
    case "trochoidal":    return runTrochoidal(b);
    case "hsm":           return runHSM(b);
    case "chip_thinning": return runChipThinning(b);
    case "scallop":       return runScallop(b);
    case "multi_pass":    return runMultiPass(b);
    case "coolant_strategy": return runCoolantStrategy(b);
    case "cost_optimize": return runCostOptimize(b);
    case "power":         return runPower(b);
    case "torque":        return runTorque(b);
    case "chip_load":     return runChipLoad(b);
    case "speed_feed":    return runSpeedFeed(b);
    case "flow_stress":   return runFlowStress(b);
    case "thread_mill":   return runThreadMill(b);
    default:
      throw new Error(`Unknown calc_type: ${b.calc_type}`);
  }
}

// ---------------------------------------------------------------------------
// Output field mapping — benchmark expected field → engine result field
// ---------------------------------------------------------------------------
const FIELD_MAP: Record<string, Record<string, string>> = {
  cutting_force: {
    Fc_N: "Fc", Ff_N: "Ff", Fp_N: "Fp",
    power_kW: "power", torque_Nm: "torque",
    Ra_um: "Ra",
  },
  tool_life: { tool_life_min: "tool_life_minutes" },
  surface_finish: { Ra_um: "Ra", Rz_um: "Rz" },
  mrr: { MRR_cm3min: "mrr", Q_prime_cm3minmm: "__derive_q_prime" },
  thermal: { T_tool_C: "tool_temperature", T_chip_C: "chip_temperature" },
  stability: { stable: "is_stable", max_stable_ap_mm: "critical_depth" },
  deflection: { deflection_mm: "static_deflection", safe: "__derive_safe_defl" },
  trochoidal: { MRR_cm3min: "mrr", max_engagement_deg: "__derive_engagement" },
  hsm: { MRR_cm3min: "mrr", spindle_rpm: "spindle_rpm" },
  chip_thinning: { fz_effective_mm: "chip_thinning.fz_compensated", thinning_factor: "chip_thinning.compensation_factor" },
  scallop: { scallop_height_um: "__derive_scallop_um" },
  multi_pass: { num_passes: "__derive_passes", total_time_min: "__derive_time" },
  coolant_strategy: { strategy: "recommendation.strategy", pressure_bar: "recommendation.pressure_bar", flow_lpm: "__derive_flow" },
  cost_optimize: { Vc_optimal_mpm: "optimal_speed", cost_per_part: "cost_per_part" },
  power: { power_required_kW: "power_spindle_kw", utilization_pct: "utilization_pct", safe: "safe" },
  torque: { torque_required_Nm: "torque_nm", safe: "safe" },
  chip_load: { chip_load_ok: "__derive_chip_ok", min_chip_thickness_mm: "hex_mm" },
  speed_feed: { Vc_mpm: "cutting_speed", f_mmrev: "feed_per_tooth" },
  flow_stress: { sigma_MPa: "stress" },
  thread_mill: { tap_drill_mm: "tap_drill_mm", engagement_pct: "engagement_pct" },
};

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function extractActual(b: Benchmark, result: any, expectedField: string): number | string | boolean | undefined {
  const calcType = b.calc_type;
  const map = FIELD_MAP[calcType] ?? {};
  const mappedField = map[expectedField];

  if (!mappedField) return undefined;

  // Handle derived fields (custom logic)
  if (mappedField === "__derive_q_prime") {
    // Q' = MRR / ae (specific MRR per mm width)
    return result.mrr && b.params.ae_mm ? result.mrr / b.params.ae_mm : undefined;
  }
  if (mappedField === "__derive_safe_defl") {
    return result.static_deflection !== undefined ? result.static_deflection < 0.1 : undefined;
  }
  if (mappedField === "__derive_engagement") {
    // Trochoidal max engagement from engagement_percent
    return result.engagement_percent ? result.engagement_percent * 3.6 : undefined; // rough deg conversion
  }
  if (mappedField === "__derive_scallop_um") {
    // Scallop height in mm → μm
    return result.scallop_height !== undefined ? result.scallop_height * 1000 : undefined;
  }
  if (mappedField === "__derive_passes") {
    return result.strategy?.total_passes;
  }
  if (mappedField === "__derive_time") {
    // Approximate total time from strategy phases
    const phases = result.strategy?.phases;
    if (!phases) return undefined;
    return phases.reduce((sum: number, ph: any) => sum + (ph.time_min ?? 0), 0) || undefined;
  }
  if (mappedField === "__derive_flow") {
    return undefined; // Flow rate derivation not available in basic coolant engine
  }
  if (mappedField === "__derive_chip_ok") {
    // Chip load is OK if hex > minimum chip thickness
    return result.hex_mm ? result.hex_mm >= 0.005 : undefined;
  }

  return getNestedValue(result, mappedField);
}

// ---------------------------------------------------------------------------
// Tolerance check
// ---------------------------------------------------------------------------
function checkTolerance(actual: any, expected: any, tolerancePct: number): { pass: boolean; delta_pct: number | null } {
  if (actual === undefined || actual === null) return { pass: false, delta_pct: null };
  if (typeof expected === "boolean") return { pass: actual === expected, delta_pct: null };
  if (typeof expected === "string") return { pass: String(actual).toLowerCase().includes(expected.toLowerCase()), delta_pct: null };
  if (typeof expected === "number" && typeof actual === "number") {
    if (expected === 0) return { pass: Math.abs(actual) < 0.001, delta_pct: actual === 0 ? 0 : null };
    const delta = Math.abs(actual - expected) / Math.abs(expected) * 100;
    return { pass: delta <= tolerancePct, delta_pct: Math.round(delta * 10) / 10 };
  }
  return { pass: false, delta_pct: null };
}

// ---------------------------------------------------------------------------
// Main execution
// ---------------------------------------------------------------------------
async function main() {
const results: BenchmarkResult[] = [];
let passCount = 0, failCount = 0, errorCount = 0, skipCount = 0;

for (const b of tests) {
  const detail: BenchmarkResult = {
    id: b.id, name: b.name, calc_type: b.calc_type,
    iso_group: b.material.iso_group, status: "SKIP", checks: [],
  };

  try {
    const rawResult = await executeBenchmark(b);
    detail.raw_output = rawResult;

    let allPass = true;
    let anyChecked = false;

    for (const [field, exp] of Object.entries(b.expected)) {
      const actual = extractActual(b, rawResult, field);
      const tol = (exp as ExpectedValue).tolerance_pct ?? 0;
      const expectedVal = (exp as ExpectedValue).value;
      const { pass, delta_pct } = checkTolerance(actual, expectedVal, tol);

      detail.checks.push({
        field, expected: expectedVal, actual, tolerance_pct: tol,
        delta_pct, pass,
      });

      if (actual !== undefined) anyChecked = true;
      if (!pass) allPass = false;
    }

    if (!anyChecked) {
      detail.status = "SKIP";
      detail.error = "No output fields matched expected fields";
      skipCount++;
    } else if (allPass) {
      detail.status = "PASS";
      passCount++;
    } else {
      detail.status = "FAIL";
      failCount++;
    }
  } catch (err: any) {
    detail.status = "ERROR";
    detail.error = err.message ?? String(err);
    errorCount++;
  }

  results.push(detail);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(60)}`);
console.log(`  R2 Golden Benchmark Results — WIRED (T2)`);
console.log(`${"=".repeat(60)}`);
console.log(`Total: ${tests.length} | PASS: ${passCount} | FAIL: ${failCount} | ERROR: ${errorCount} | SKIP: ${skipCount}`);
console.log(`ISO Groups: ${[...new Set(tests.map((t) => t.material.iso_group))].sort().join(", ")}`);
console.log(`Calc Types: ${[...new Set(tests.map((t) => t.calc_type))].sort().join(", ")}`);

// Per-group summary
const groups = [...new Set(tests.map((t) => t.material.iso_group))].sort();
for (const g of groups) {
  const gResults = results.filter((r) => r.iso_group === g);
  const gPass = gResults.filter((r) => r.status === "PASS").length;
  const gFail = gResults.filter((r) => r.status === "FAIL").length;
  const gErr = gResults.filter((r) => r.status === "ERROR").length;
  console.log(`  ${g}: ${gResults.length} tests | ${gPass} PASS | ${gFail} FAIL | ${gErr} ERROR`);
}

// Detail output
console.log(`\n${"─".repeat(60)}`);
for (const r of results) {
  const icon = r.status === "PASS" ? "✓" : r.status === "FAIL" ? "✗" : r.status === "ERROR" ? "!" : "○";
  console.log(`${icon} ${r.id} [${r.calc_type}] ${r.status} — ${r.name}`);

  if (r.status === "ERROR") {
    console.log(`    ERROR: ${r.error}`);
  }

  if (r.status === "FAIL" || verbose) {
    for (const c of r.checks) {
      const cIcon = c.pass ? "  ✓" : "  ✗";
      const deltaStr = c.delta_pct !== null ? ` (Δ${c.delta_pct}% vs ±${c.tolerance_pct}%)` : "";
      console.log(`${cIcon} ${c.field}: expected=${c.expected}, actual=${c.actual ?? "MISSING"}${deltaStr}`);
    }
  }
}

// JSON output for downstream consumption
const summary = {
  timestamp: new Date().toISOString(),
  total: tests.length,
  pass: passCount,
  fail: failCount,
  error: errorCount,
  skip: skipCount,
  results: results.map((r) => ({
    id: r.id, calc_type: r.calc_type, iso_group: r.iso_group,
    status: r.status, error: r.error,
    checks: r.checks.map((c) => ({
      field: c.field, expected: c.expected, actual: c.actual,
      tolerance_pct: c.tolerance_pct, delta_pct: c.delta_pct, pass: c.pass,
    })),
  })),
};

// Write results file
const outPath = resolve(scriptDir, "benchmark-results.json");
writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(`\nResults written to: ${outPath}`);

process.exit(failCount + errorCount > 0 ? 1 : 0);
} // end main()

main().catch((err) => { console.error("Fatal:", err); process.exit(2); });
