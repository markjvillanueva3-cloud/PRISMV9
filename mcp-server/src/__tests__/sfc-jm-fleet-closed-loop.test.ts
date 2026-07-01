/**
 * SFC JM-Die-fleet CLOSED-LOOP calc-correctness test.
 *
 * Operator directive (2026-06-22): oscar owns the SFC frontend; after building,
 * "run full closed-loop testing of the entire SFC app page suite to check that
 * calculations are correct, JM Die fleet machines FIRST."
 *
 * SCOPE (honest): this verifies the SFC PHYSICS-CORE orchestrator
 * (SpeedFeedOrchestratorEngine.compute) -- the engine that produced the 11.2M
 * variability corpus and backs sfc_nine_axis -- per real JM Die machine. It is
 * NOT the engine the /api/v1/sfc/calculate web page runs: that page path uses a
 * PARALLEL engine (ProductEngine.sfcCalculate -> ManufacturingCalculations) and
 * is covered separately by sfc-jm-fleet-page-closed-loop.test.ts. (The two SFC
 * engines diverge -- see reference_oscar_sfc_engine_divergence_magnitude_2026_06_21.)
 *
 * This test drives the orchestrator with EACH real JM Die machine's spindle
 * constraints and asserts the computed speed/feed is:
 *   (1) actually computed (finite + positive core outputs, bounded),
 *   (2) MACHINE-COMPLIANT -- spindle_rpm within the machine's max rpm, and no
 *       SILENT over-spindle-power recommendation (over power must be flagged),
 *   (3) PHYSICALLY CORRECT -- the same closed-form identities that validated the
 *       11.2M-config variability corpus (SFC-ACCURACY-MS2): feed = rpm*fz*flutes
 *       (every machine) and vc = pi*D*rpm/1000 (mill).
 *
 * Live-calc analogue of scripts/lib/sfc-accuracy-audit-lib.mjs (which audited the
 * precomputed corpus); here the same invariants are checked against the live
 * orchestrator output per real JM machine.
 *
 * JM specs: the 7 lathes are VERIFIED from ShopConfigurationEngine.ts (cited per
 * row). The 5 VMC mills LACK spindle specs in ShopConfigurationEngine (a real gap
 * -- those entries carry only hourly_rate / capabilities), so their max_rpm/power
 * below are representative manufacturer values, labelled as such. Closing that
 * ShopConfig gap is a follow-up.
 */
import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

type OrchestratorInputArg = Parameters<typeof speedFeedOrchestratorEngine.compute>[0];

interface JmMachine {
  id: string;
  name: string;
  kind: "mill" | "lathe";
  maxRpm: number;
  powerKw: number;
  specSource: "verified-shopconfig" | "representative-mfr";
}

// JM Die LATHES -- specs VERIFIED from ShopConfigurationEngine.ts (line cited).
const JM_LATHES: JmMachine[] = [
  { id: "LTH-01", name: "Okuma GENOS L300-M", kind: "lathe", maxRpm: 5000, powerKw: 15, specSource: "verified-shopconfig" }, // :251
  { id: "LTH-02", name: "Okuma GENOS L200E-M", kind: "lathe", maxRpm: 5000, powerKw: 11, specSource: "verified-shopconfig" }, // :262
  { id: "LTH-03", name: "Okuma LNC8", kind: "lathe", maxRpm: 4000, powerKw: 11, specSource: "verified-shopconfig" }, // :273
  { id: "LTH-04", name: "Okuma Crown L1060", kind: "lathe", maxRpm: 3800, powerKw: 11, specSource: "verified-shopconfig" }, // :284
  { id: "LTH-05", name: "Okuma GENOS L400II-E", kind: "lathe", maxRpm: 3800, powerKw: 22, specSource: "verified-shopconfig" }, // :295
  { id: "LTH-06", name: "Okuma LB 3000EX Big Bore", kind: "lathe", maxRpm: 3800, powerKw: 22, specSource: "verified-shopconfig" }, // :306
  { id: "LTH-07", name: "Okuma Multus B250II", kind: "lathe", maxRpm: 5000, powerKw: 22, specSource: "verified-shopconfig" }, // :317
];

// JM Die VMC MILLS -- representative manufacturer specs (ShopConfig lacks them).
const JM_MILLS: JmMachine[] = [
  { id: "VMC-01", name: "Hurco VM30i", kind: "mill", maxRpm: 10000, powerKw: 12, specSource: "representative-mfr" },
  { id: "VMC-02", name: "Okuma M460V-5AX", kind: "mill", maxRpm: 15000, powerKw: 22, specSource: "representative-mfr" },
  { id: "VMC-03", name: "Haas VF-2", kind: "mill", maxRpm: 8100, powerKw: 22.4, specSource: "representative-mfr" },
  { id: "VMC-04", name: "Haas OM-2 (office mill)", kind: "mill", maxRpm: 30000, powerKw: 5.6, specSource: "representative-mfr" },
  { id: "VMC-05", name: "Roku-Roku HC 658-II", kind: "mill", maxRpm: 40000, powerKw: 11, specSource: "representative-mfr" },
];

// Representative materials spanning ISO groups (comprehensive variability floor).
const MILL_MATERIALS = [
  { material: "1045", iso: "P", hb: 180 },
  { material: "6061", iso: "N", hb: 95 },
  { material: "316", iso: "M", hb: 170 },
];
const LATHE_MATERIALS = [
  { material: "4140", iso: "P", hb: 200 },
  { material: "316", iso: "M", hb: 170 },
];

// A physical upper bound that no real speed/feed output approaches -- used to
// reject non-finite (Infinity) values without a boolean presence-check.
const PHYS_UPPER = 1e7;

const MILL_DIAMETER_MM = 12;
const MILL_FLUTES = 4;
const TURNING_FLUTES = 1;

/** A milling OrchestratorInput mirroring a corpus-proven config, machine overridden. */
function millInput(m: JmMachine, mat: { material: string; iso: string; hb: number }): OrchestratorInputArg {
  return {
    machine_name: m.id,
    machine_type: "vertical_mill",
    machine_power_kw: m.powerKw,
    machine_max_rpm: m.maxRpm,
    machine_rigidity: "medium",
    machine_guideway: "box",
    machine_age_years: 3,
    machine_axis_accel_m_s2: 2,
    machine_axis_jerk_m_s3: 10,
    spindle_taper: "BT40",
    spindle_bearing_preload: "medium",
    controller: "fanuc-30i",
    coolant_type: "flood",
    coolant_pressure_bar: 1,
    coolant_concentration_pct: 5,
    material: mat.material,
    iso_group: mat.iso,
    hardness_hb: mat.hb,
    operation: "milling",
    cut_type: "roughing",
    strategy: "conventional",
    holder_type: "ER_collet",
    holder_gauge_length_mm: 60,
    holder_tir_mm: 2,
    holder_balanced_g: 2.5,
    tool_diameter_mm: MILL_DIAMETER_MM,
    flutes: MILL_FLUTES,
    tool_material: "carbide",
    tool_coating: "AlCrN",
    helix_angle_deg: 45,
    corner_radius_mm: 0.4,
    tool_stickout_mm: 36,
    workholding_type: "vise",
    workholding_stiffness: "high",
    clamping_force_kN: 20,
    spindle_torque_curve_archetype: "constant-torque",
    optimize_for: "balanced",
  } as OrchestratorInputArg;
}

/** A turning OrchestratorInput mirroring a corpus-proven lathe config. */
function latheInput(m: JmMachine, mat: { material: string; iso: string; hb: number }): OrchestratorInputArg {
  return {
    machine_name: m.id,
    machine_type: "lathe",
    machine_power_kw: m.powerKw,
    machine_max_rpm: m.maxRpm,
    machine_rigidity: "medium",
    machine_age_years: 3,
    spindle_taper: "lathe_turret",
    controller: "okuma",
    coolant_type: "flood",
    coolant_pressure_bar: 1,
    coolant_concentration_pct: 5,
    material: mat.material,
    iso_group: mat.iso,
    hardness_hb: mat.hb,
    operation: "turning",
    cut_type: "roughing",
    strategy: "conventional",
    tool_diameter_mm: 25,
    flutes: TURNING_FLUTES,
    tool_material: "carbide",
    tool_stickout_mm: 40,
    insert_grade: "P25",
    insert_shape: "CNMG",
    nose_radius_mm: 0.8,
    workholding_type: "chuck",
    workholding_stiffness: "high",
    clamping_force_kN: 8,
    optimize_for: "productivity",
  } as OrchestratorInputArg;
}

/** Unwrap AtomicValue<OrchestratorResult> | OrchestratorResult. */
function unwrap(out: unknown): Record<string, any> {
  const o = out as Record<string, any>;
  return o && typeof o === "object" && o.value && typeof o.value === "object" ? o.value : o;
}

const CORE_FIELDS = ["cutting_speed_mpm", "spindle_rpm", "feed_rate_mmmin", "power_kw", "tool_life_min"] as const;

/** Every core output is a real, finite, strictly-positive physical quantity. */
function assertComputedAndFinite(r: Record<string, any>, label: string): void {
  for (const k of CORE_FIELDS) {
    const v = r[k];
    expect(v, `${label}: ${k} must be positive (got ${v})`).toBeGreaterThan(0); // NaN/<=0 fail here
    expect(v, `${label}: ${k} must be finite (got ${v})`).toBeLessThan(PHYS_UPPER); // Infinity fails here
  }
}

/** Feed identity: feed_rate_mmmin == spindle_rpm * feed_per_tooth_mm * flutes. */
function assertFeedIdentity(r: Record<string, any>, flutes: number, label: string): void {
  const fz = r.feed_per_tooth_mm;
  const vf = r.feed_rate_mmmin;
  expect(fz, `${label}: feed_per_tooth_mm must be positive`).toBeGreaterThan(0);
  const expected = r.spindle_rpm * fz * flutes;
  // Tolerance mirrors sfc-accuracy-audit-lib (generous relative band; engine
  // output is full-precision so the rounding term is negligible).
  const tol = 1.0 + 0.06 * Math.max(Math.abs(vf), Math.abs(expected));
  expect(
    Math.abs(vf - expected),
    `${label}: feed_rate ${vf} != rpm*fz*flutes ${expected.toFixed(2)} (rpm=${r.spindle_rpm}, fz=${fz}, flutes=${flutes})`,
  ).toBeLessThanOrEqual(tol);
}

/** vc identity (mill): cutting_speed_mpm == pi * D * spindle_rpm / 1000. */
function assertVcIdentity(r: Record<string, any>, diameterMm: number, label: string): void {
  const expected = (Math.PI * diameterMm * r.spindle_rpm) / 1000;
  const tol = 2.0 + 0.05 * Math.max(Math.abs(r.cutting_speed_mpm), Math.abs(expected));
  expect(
    Math.abs(r.cutting_speed_mpm - expected),
    `${label}: vc ${r.cutting_speed_mpm} != pi*D*rpm/1000 ${expected.toFixed(2)} (D=${diameterMm}, rpm=${r.spindle_rpm})`,
  ).toBeLessThanOrEqual(tol);
}

/** Machine compliance: rpm within spindle max; no SILENT over-power. */
function assertMachineCompliant(r: Record<string, any>, m: JmMachine, label: string): void {
  // A correct SFC can never recommend an rpm the spindle physically cannot reach.
  expect(
    r.spindle_rpm,
    `${label}: spindle_rpm exceeds ${m.id} max ${m.maxRpm}`,
  ).toBeLessThanOrEqual(m.maxRpm * 1.001);
  // The orchestrator must always run safety checks (>=1).
  const safetyChecks: unknown[] = Array.isArray(r.safety_checks) ? r.safety_checks : [];
  expect(safetyChecks.length, `${label}: safety_checks must be present`).toBeGreaterThan(0);
  // Over-spindle-power is allowed ONLY if explicitly flagged -- never silent.
  if (r.power_kw > m.powerKw * 1.02) {
    const flags = [
      Array.isArray(r.limiting_factors)
        && r.limiting_factors.some((l: any) => /power|spindle|torque/i.test(String(l?.parameter))),
      safetyChecks.some((c: any) => c?.passed === false),
    ].filter(Boolean);
    expect(
      flags.length,
      `${label}: power ${r.power_kw}kW > ${m.id} spindle ${m.powerKw}kW but NOT flagged (silent over-power)`,
    ).toBeGreaterThan(0);
  }
}

describe("SFC JM-Die fleet closed-loop calc correctness (JM machines FIRST)", () => {
  // --- LATHES FIRST (verified specs) ---
  describe("JM lathes (verified ShopConfig specs)", () => {
    for (const m of JM_LATHES) {
      it(`${m.id} ${m.name}: turning calc correct + machine-compliant`, () => {
        const r = unwrap(speedFeedOrchestratorEngine.compute(latheInput(m, LATHE_MATERIALS[0])));
        const label = `${m.id}/${LATHE_MATERIALS[0].material}`;
        assertComputedAndFinite(r, label);
        assertMachineCompliant(r, m, label);
        assertFeedIdentity(r, TURNING_FLUTES, label);
      });
    }
  });

  describe("JM mills (representative specs; ShopConfig gap noted)", () => {
    for (const m of JM_MILLS) {
      it(`${m.id} ${m.name}: milling calc correct + machine-compliant`, () => {
        const r = unwrap(speedFeedOrchestratorEngine.compute(millInput(m, MILL_MATERIALS[0])));
        const label = `${m.id}/${MILL_MATERIALS[0].material}`;
        assertComputedAndFinite(r, label);
        assertMachineCompliant(r, m, label);
        assertFeedIdentity(r, MILL_FLUTES, label);
        assertVcIdentity(r, MILL_DIAMETER_MM, label);
      });
    }
  });

  // --- Material variability across the fleet (>=3 spanning ISO groups) ---
  describe("material variability (spanning ISO P/N/M)", () => {
    const mill = JM_MILLS[2]; // Haas VF-2
    for (const mat of MILL_MATERIALS) {
      it(`${mill.id} milling ${mat.material} (${mat.iso}): correct + compliant`, () => {
        const r = unwrap(speedFeedOrchestratorEngine.compute(millInput(mill, mat)));
        const label = `${mill.id}/${mat.material}`;
        assertComputedAndFinite(r, label);
        assertMachineCompliant(r, mill, label);
        assertFeedIdentity(r, MILL_FLUTES, label);
        assertVcIdentity(r, MILL_DIAMETER_MM, label);
      });
    }
    const lathe = JM_LATHES[4]; // L400II-E (22 kW)
    for (const mat of LATHE_MATERIALS) {
      it(`${lathe.id} turning ${mat.material} (${mat.iso}): correct + compliant`, () => {
        const r = unwrap(speedFeedOrchestratorEngine.compute(latheInput(lathe, mat)));
        const label = `${lathe.id}/${mat.material}`;
        assertComputedAndFinite(r, label);
        assertMachineCompliant(r, lathe, label);
        assertFeedIdentity(r, TURNING_FLUTES, label);
      });
    }
  });
});
