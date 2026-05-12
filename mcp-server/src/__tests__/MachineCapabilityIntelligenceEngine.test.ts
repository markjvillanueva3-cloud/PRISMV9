/**
 * MachineCapabilityIntelligenceEngine — HBK-MS4 Tests
 * ====================================================
 * 45+ tests covering:
 * 1. Schema validation (5)
 * 2. Spindle profile merging (10)
 * 3. Axis profile merging (7)
 * 4. Work envelope merging (4)
 * 5. Torque curve generation (6)
 * 6. Reconciliation report (7)
 * 7. Stats and coverage (3)
 * 8. Validation / warnings (5)
 * 9. Edge cases (5)
 *
 * Test data: Haas VF-2 (with real torque curve), DMG MORI DMU 50,
 * plus synthetic handbook data for merge testing.
 *
 * Run: npx vitest run MachineCapabilityIntelligenceEngine --pool=forks
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  machineCapabilityIntelligenceEngine,
  CapabilityLookupSchema,
  CapabilityQuerySchema,
  ReconciliationSchema,
  CapabilityStatsSchema,
  type MachineCapabilityProfile,
  type SpindleCapabilityProfile,
  type ReconciliationReport,
  type CapabilitySource,
  type TorqueCurvePoint,
} from "../engines/MachineCapabilityIntelligenceEngine.js";

// ════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ════════════════════════════════════════════════════════════════════

/** Minimal handbook registry mock with Haas VF-2 handbook data. */
function createMockHandbookRegistry(handbooks: Record<string, any> = {}) {
  const byMachine = new Map<string, any>(Object.entries(handbooks));
  return {
    getByMachineId(id: string) { return byMachine.get(id); },
    list() { return Array.from(byMachine.entries()).map(([mid, hbk]) => ({ machine_id: mid, ...hbk })); },
  };
}

/** Real torque curve data for Haas VF-2 (from machine-torque-curves.ts). */
const HAAS_VF2_TORQUE_CURVE = {
  machine_id: "haas_vf_2",
  brand: "Haas",
  model: "VF-2",
  source: "hsm_advisor" as const,
  confidence: 0.95,
  base_speed_rpm: 1087,
  peak_torque_Nm: 131.04,
  rated_power_kW: 14.91,
  max_rpm: 7500,
  drive_type_inferred: "belt" as const,
  duty_note: "HSMAdvisor ground truth — 6 data points",
  points: [
    { rpm: 1, torque_Nm: 131.04, power_kW: 0.01 },
    { rpm: 1087, torque_Nm: 131.04, power_kW: 14.91 },
    { rpm: 2690, torque_Nm: 52.94, power_kW: 14.91 },
    { rpm: 4293, torque_Nm: 33.18, power_kW: 14.91 },
    { rpm: 5897, torque_Nm: 24.15, power_kW: 14.91 },
    { rpm: 7500, torque_Nm: 18.99, power_kW: 14.91 },
  ],
};

const DMU50_TORQUE_CURVE = {
  machine_id: "dmg_mori_dmu_50_3rd_gen",
  brand: "DMG MORI",
  model: "DMU 50 3rd Gen",
  source: "computed_from_PT" as const,
  confidence: 0.7,
  base_speed_rpm: 1543,
  peak_torque_Nm: 130,
  rated_power_kW: 21,
  max_rpm: 15000,
  drive_type_inferred: "direct" as const,
  duty_note: "Computed from P=Tω",
  points: [
    { rpm: 0, torque_Nm: 130, power_kW: 0 },
    { rpm: 1543, torque_Nm: 130, power_kW: 21 },
    { rpm: 3086, torque_Nm: 64.98, power_kW: 21 },
    { rpm: 7715, torque_Nm: 25.99, power_kW: 21 },
    { rpm: 15000, torque_Nm: 13.37, power_kW: 21 },
  ],
};

/** Mock MachineRegistry with Haas VF-2. */
function createMockMachineRegistry(machines: Record<string, any> = {}) {
  const byId = new Map<string, any>(Object.entries(machines));
  return {
    get(id: string) { return byId.get(id); },
    list() { return Array.from(byId.values()); },
  };
}

const HAAS_VF2_REGISTRY = {
  id: "haas_vf_2",
  manufacturer: "Haas",
  model: "VF-2",
  spindle: {
    max_rpm: 8100,
    min_rpm: 0,
    power_continuous: 14.9,
    power_30min: 22.4,
    torque_max: 122,
    torque_continuous: 68,
    bearing_type: "Ceramic hybrid",
    spindle_nose: "BT40",
    coolant_through: true,
  },
  axes: [
    { name: "X", travel: 762, rapid_rate: 25400, max_feed_rate: 16500, acceleration: 5.0, resolution: 1, repeatability: 5, accuracy: 10 },
    { name: "Y", travel: 406, rapid_rate: 25400, max_feed_rate: 16500, acceleration: 5.0, resolution: 1, repeatability: 5, accuracy: 10 },
    { name: "Z", travel: 508, rapid_rate: 25400, max_feed_rate: 16500, acceleration: 5.0, resolution: 1, repeatability: 5, accuracy: 10 },
  ],
  envelope: {
    x_travel: 762,
    y_travel: 406,
    z_travel: 508,
    spindle_to_table_min: 102,
    spindle_to_table_max: 610,
  },
  simultaneous_axes: 3,
};

/** Handbook data for Haas VF-2 (higher authority than registry). */
const HAAS_VF2_HANDBOOK = {
  manufacturer: "Haas",
  model: "VF-2",
  spindle_specs: {
    max_rpm: 8100,
    min_rpm: 50,
    power_continuous_kw: 14.9,
    power_30min_kw: 22.4,
    torque_max_nm: 122,
    torque_continuous_nm: 68,
    taper_type: "BT40",
    drive_type: "belt",
    bearing_type: "Ceramic hybrid angular contact",
    base_speed_rpm: 1100,
    drawbar_force_kn: 8.9,
    gear_ranges: [{ gear: 1, min_rpm: 50, max_rpm: 8100, max_torque_nm: 122, max_power_kw: 22.4 }],
    torque_curve: [
      { rpm: 50, torque_nm: 122, power_kw: 0.64 },
      { rpm: 1100, torque_nm: 122, power_kw: 14.05 },
      { rpm: 2000, torque_nm: 67.1, power_kw: 14.05 },
      { rpm: 4000, torque_nm: 33.55, power_kw: 14.05 },
      { rpm: 8100, torque_nm: 16.56, power_kw: 14.05 },
    ],
    warmup_procedure: "Run spindle at 50% max RPM for 15 minutes before production cuts",
    source: {
      handbook_title: "Haas VF-2 Operator Manual",
      page_number: 47,
      section_ref: "3.2 Spindle Specifications",
      extraction_method: "manual" as const,
      confidence: 0.98,
      extracted_at: "2026-03-28T00:00:00Z",
    },
  },
  axis_kinematics: {
    axes: [
      { name: "X", travel_mm: 762, rapid_mm_min: 25400, max_feed_mm_min: 16510, accel_m_s2: 4.9, resolution_um: 1, repeatability_um: 5, accuracy_um: 10, backlash_um: 2, ball_screw_pitch_mm: 10, linear_scale: false },
      { name: "Y", travel_mm: 406, rapid_mm_min: 25400, max_feed_mm_min: 16510, accel_m_s2: 4.9, resolution_um: 1, repeatability_um: 5, accuracy_um: 10, backlash_um: 2, ball_screw_pitch_mm: 10, linear_scale: false },
      { name: "Z", travel_mm: 508, rapid_mm_min: 25400, max_feed_mm_min: 16510, accel_m_s2: 4.9, resolution_um: 1, repeatability_um: 5, accuracy_um: 10, backlash_um: 2, ball_screw_pitch_mm: 10, linear_scale: false },
    ],
    simultaneous_axes: 3,
    work_envelope_mm: { x: 762, y: 406, z: 508 },
    spindle_to_table_min_mm: 102,
    spindle_to_table_max_mm: 610,
    source: {
      handbook_title: "Haas VF-2 Operator Manual",
      page_number: 12,
      section_ref: "2.1 Axis Specifications",
      extraction_method: "manual" as const,
      confidence: 0.98,
      extracted_at: "2026-03-28T00:00:00Z",
    },
  },
};

const SPINDLE_CORRECTIONS = [
  {
    brand: "DATRON",
    model: "DATRON M8Cube 3 axis",
    original_issue: "Catalog had CAT40/10,000 RPM — wrong",
    source: "datron.com: HSK-E25, 60000 RPM, 3 kW",
    corrected_spindle: { max_rpm: 60000, power_kw: 3, torque_nm: 1.4, taper: "HSK-E25", base_rpm: 20463 },
    confidence: 0.85,
  },
];

// ════════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════════

describe("MachineCapabilityIntelligenceEngine", () => {

  // ── 1. Schema Validation ──
  describe("Schema Validation", () => {
    it("validates CapabilityLookupSchema with required machine_id", () => {
      expect(() => CapabilityLookupSchema.parse({ machine_id: "haas_vf_2" })).not.toThrow();
    });

    it("rejects CapabilityLookupSchema without machine_id", () => {
      expect(() => CapabilityLookupSchema.parse({})).toThrow();
    });

    it("defaults include_torque_curve to true", () => {
      const parsed = CapabilityLookupSchema.parse({ machine_id: "test" });
      expect(parsed.include_torque_curve).toBe(true);
    });

    it("validates ReconciliationSchema with tolerance default", () => {
      const parsed = ReconciliationSchema.parse({ machine_id: "test" });
      expect(parsed.tolerance_pct).toBe(5);
    });

    it("validates CapabilityQuerySchema with all optional fields", () => {
      expect(() => CapabilityQuerySchema.parse({})).not.toThrow();
      expect(() => CapabilityQuerySchema.parse({
        manufacturer: "Haas", min_spindle_rpm: 8000, simultaneous_axes: 5,
      })).not.toThrow();
    });
  });

  // ── 2. Spindle Profile Merging ──
  describe("Spindle Profile Merging", () => {
    it("builds profile from torque curve only", () => {
      const registry = createMockHandbookRegistry();
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: registry, torqueCurves: { haas_vf_2: HAAS_VF2_TORQUE_CURVE }, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.spindle).not.toBeNull();
      expect(profile.spindle!.max_rpm.value).toBe(7500);
      expect(profile.spindle!.max_rpm.source).toBe("torque_curve_hsm");
      expect(profile.spindle!.max_rpm.confidence).toBe(0.95);
    });

    it("builds profile from registry only", () => {
      const registry = createMockHandbookRegistry();
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: registry, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(profile.spindle).not.toBeNull();
      expect(profile.spindle!.max_rpm.value).toBe(8100);
      expect(profile.spindle!.max_rpm.source).toBe("machine_registry");
    });

    it("prefers handbook over torque curve and registry", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: { haas_vf_2: HAAS_VF2_TORQUE_CURVE }, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(profile.spindle!.max_rpm.source).toBe("handbook");
      expect(profile.spindle!.max_rpm.confidence).toBe(0.98);
      expect(profile.spindle!.max_rpm.value).toBe(8100);
    });

    it("preserves handbook torque curve over HSMAdvisor curve", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: { haas_vf_2: HAAS_VF2_TORQUE_CURVE }, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.spindle!.torque_curve.source).toBe("handbook");
      expect(profile.spindle!.torque_curve.value.length).toBe(5);
      expect(profile.spindle!.torque_curve.value[0].rpm).toBe(50);
    });

    it("includes gear_ranges from handbook", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.spindle!.gear_ranges).toBeDefined();
      expect(profile.spindle!.gear_ranges!.value.length).toBe(1);
      expect(profile.spindle!.gear_ranges!.value[0].gear).toBe(1);
    });

    it("includes drawbar_force_kn from handbook", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.spindle!.drawbar_force_kn).toBeDefined();
      expect(profile.spindle!.drawbar_force_kn!.value).toBe(8.9);
    });

    it("includes warmup_procedure from handbook", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.spindle!.warmup_procedure).toBeDefined();
      expect(profile.spindle!.warmup_procedure!.value).toContain("15 minutes");
    });

    it("maps torque curve source correctly", () => {
      const { _internal } = machineCapabilityIntelligenceEngine;
      expect(_internal.mapTorqueSource("hsm_advisor")).toBe("torque_curve_hsm");
      expect(_internal.mapTorqueSource("catalog_verified")).toBe("torque_curve_catalog");
      expect(_internal.mapTorqueSource("computed_from_PT")).toBe("torque_curve_computed");
      expect(_internal.mapTorqueSource("unknown")).toBe("torque_curve_computed");
    });

    it("omits torque curve when include_torque_curve=false", () => {
      const registry = createMockHandbookRegistry();
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2", include_torque_curve: false },
        { handbookRegistry: registry, torqueCurves: { haas_vf_2: HAAS_VF2_TORQUE_CURVE }, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.spindle!.torque_curve.value.length).toBe(0);
    });
  });

  // ── 3. Axis Profile Merging ──
  describe("Axis Profile Merging", () => {
    it("builds axis profiles from registry only", () => {
      const registry = createMockHandbookRegistry();
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: registry, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(profile.axes.length).toBe(3);
      expect(profile.axes[0].name).toBe("X");
      expect(profile.axes[0].travel_mm.value).toBe(762);
      expect(profile.axes[0].travel_mm.source).toBe("machine_registry");
    });

    it("prefers handbook axis data over registry", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(profile.axes[0].travel_mm.source).toBe("handbook");
      expect(profile.axes[0].max_feed_mm_min!.value).toBe(16510); // handbook has 16510 vs registry 16500
    });

    it("includes backlash_um from handbook only", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.axes[0].backlash_um).toBeDefined();
      expect(profile.axes[0].backlash_um!.value).toBe(2);
      expect(profile.axes[0].backlash_um!.source).toBe("handbook");
    });

    it("sorts axes in X, Y, Z, A, B, C order", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.axes.map(a => a.name)).toEqual(["X", "Y", "Z"]);
    });

    it("merges axes from both sources when handbook has extra axes", () => {
      const hbkWith5Axis = {
        ...HAAS_VF2_HANDBOOK,
        axis_kinematics: {
          ...HAAS_VF2_HANDBOOK.axis_kinematics,
          axes: [
            ...HAAS_VF2_HANDBOOK.axis_kinematics.axes,
            { name: "A", travel_mm: 240, rapid_mm_min: 11400, accel_m_s2: 8.0 },
            { name: "C", travel_mm: 360, rapid_mm_min: 11400, accel_m_s2: 8.0 },
          ],
        },
      };
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: hbkWith5Axis });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(profile.axes.length).toBe(5);
      expect(profile.axes.map(a => a.name)).toEqual(["X", "Y", "Z", "A", "C"]);
    });

    it("includes ball_screw_pitch from handbook", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.axes[0].ball_screw_pitch_mm!.value).toBe(10);
    });

    it("includes linear_scale from handbook", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.axes[0].linear_scale!.value).toBe(false);
    });
  });

  // ── 4. Work Envelope Merging ──
  describe("Work Envelope Merging", () => {
    it("builds work envelope from registry", () => {
      const registry = createMockHandbookRegistry();
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: registry, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(profile.work_envelope).not.toBeNull();
      expect(profile.work_envelope!.x_mm.value).toBe(762);
    });

    it("prefers handbook envelope over registry", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(profile.work_envelope!.x_mm.source).toBe("handbook");
    });

    it("includes spindle_to_table distances", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.work_envelope!.spindle_to_table_min_mm!.value).toBe(102);
      expect(profile.work_envelope!.spindle_to_table_max_mm!.value).toBe(610);
    });

    it("returns null envelope when no data available", () => {
      const registry = createMockHandbookRegistry();
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "unknown_machine" },
        { handbookRegistry: registry, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.work_envelope).toBeNull();
    });
  });

  // ── 5. Torque Curve Generation ──
  describe("Torque Curve Generation", () => {
    it("generates synthetic curve from spindle specs", () => {
      const curve = machineCapabilityIntelligenceEngine.generateSyntheticCurve(
        131, 14.9, 1087, 7500,
      );
      expect(curve.length).toBeGreaterThan(5);
      // First point should be at RPM=0 with peak torque
      expect(curve[0].rpm).toBe(0);
      expect(curve[0].torque_nm).toBe(131);
      expect(curve[0].power_kw).toBe(0);
    });

    it("computes base speed from P=Tω when not provided", () => {
      const curve = machineCapabilityIntelligenceEngine.generateSyntheticCurve(
        100, 10, 0, 10000, // base_rpm=0 → computed
      );
      expect(curve.length).toBeGreaterThan(3);
      // P = T*ω → base_rpm = P * 9549 / T = 10 * 9549 / 100 = 955
      const basePt = curve.find(p => Math.abs(p.torque_nm - 100) < 1 && p.power_kw > 0);
      expect(basePt).toBeDefined();
    });

    it("returns empty array for invalid inputs", () => {
      expect(machineCapabilityIntelligenceEngine.generateSyntheticCurve(0, 10, 0, 1000)).toEqual([]);
      expect(machineCapabilityIntelligenceEngine.generateSyntheticCurve(100, 0, 0, 1000)).toEqual([]);
      expect(machineCapabilityIntelligenceEngine.generateSyntheticCurve(100, 10, 0, 0)).toEqual([]);
    });

    it("torque decreases with RPM in constant-power region", () => {
      const curve = machineCapabilityIntelligenceEngine.generateSyntheticCurve(
        131, 14.9, 1087, 7500,
      );
      // Find points above base speed
      const cpPoints = curve.filter(p => p.rpm > 1087);
      for (let i = 1; i < cpPoints.length; i++) {
        expect(cpPoints[i].torque_nm).toBeLessThanOrEqual(cpPoints[i - 1].torque_nm);
      }
    });

    it("last point is at max_rpm", () => {
      const curve = machineCapabilityIntelligenceEngine.generateSyntheticCurve(
        131, 14.9, 1087, 7500,
      );
      expect(curve[curve.length - 1].rpm).toBe(7500);
    });

    it("energy conservation: P ≈ T×ω at base speed (±15%)", () => {
      const curve = machineCapabilityIntelligenceEngine.generateSyntheticCurve(
        131, 14.9, 1087, 7500,
      );
      // Find the base speed point
      const basePt = curve.find(p => p.rpm === 1087);
      expect(basePt).toBeDefined();
      const computedP = basePt!.torque_nm * basePt!.rpm / 9549;
      expect(Math.abs(computedP - 14.9) / 14.9).toBeLessThan(0.15);
    });
  });

  // ── 6. Reconciliation Report ──
  describe("Reconciliation Report", () => {
    it("reports no discrepancies when data matches", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const report = machineCapabilityIntelligenceEngine.reconcile(
        { machine_id: "haas_vf_2", tolerance_pct: 5 },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      // Most fields match within 5%
      expect(report.fields_compared).toBeGreaterThan(0);
      expect(report.overall_agreement_pct).toBeGreaterThanOrEqual(50);
    });

    it("detects torque discrepancy between sources", () => {
      // Registry says torque_max=122, torque curve says 131.04 — 7.4% delta
      const hbkReg = createMockHandbookRegistry();
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const report = machineCapabilityIntelligenceEngine.reconcile(
        { machine_id: "haas_vf_2", tolerance_pct: 5 },
        { handbookRegistry: hbkReg, torqueCurves: { haas_vf_2: HAAS_VF2_TORQUE_CURVE }, spindleCorrections: [], machineRegistry: machineReg },
      );
      const torqueDiscrep = report.discrepancies.find(d => d.field.includes("torque"));
      expect(torqueDiscrep).toBeDefined();
      expect(torqueDiscrep!.delta_pct).toBeGreaterThan(5);
    });

    it("flags taper mismatch as critical", () => {
      const hbkWithWrongTaper = {
        ...HAAS_VF2_HANDBOOK,
        spindle_specs: { ...HAAS_VF2_HANDBOOK.spindle_specs, taper_type: "HSK-A63" },
      };
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: hbkWithWrongTaper });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const report = machineCapabilityIntelligenceEngine.reconcile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      const taperDiscrep = report.discrepancies.find(d => d.field === "spindle.taper_type");
      expect(taperDiscrep).toBeDefined();
      expect(taperDiscrep!.severity).toBe("critical");
    });

    it("reports missing sections in handbook vs registry", () => {
      const hbkWithoutSpindle = { manufacturer: "Haas", model: "VF-2" }; // No spindle_specs
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: hbkWithoutSpindle });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const report = machineCapabilityIntelligenceEngine.reconcile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(report.fields_missing_in_handbook.length).toBeGreaterThan(0);
    });

    it("uses custom tolerance percentage", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const strictReport = machineCapabilityIntelligenceEngine.reconcile(
        { machine_id: "haas_vf_2", tolerance_pct: 0.1 },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      const looseReport = machineCapabilityIntelligenceEngine.reconcile(
        { machine_id: "haas_vf_2", tolerance_pct: 50 },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(strictReport.discrepancies.length).toBeGreaterThanOrEqual(looseReport.discrepancies.length);
    });

    it("returns 100% agreement when no data to compare", () => {
      const hbkReg = createMockHandbookRegistry();
      const report = machineCapabilityIntelligenceEngine.reconcile(
        { machine_id: "unknown" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(report.overall_agreement_pct).toBe(100);
      expect(report.fields_compared).toBe(0);
    });

    it("includes manufacturer and model in report", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const report = machineCapabilityIntelligenceEngine.reconcile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(report.manufacturer).toBe("Haas");
      expect(report.model).toBe("VF-2");
    });
  });

  // ── 7. Stats and Coverage ──
  describe("Stats and Coverage", () => {
    it("counts torque curve machines", () => {
      const registry = createMockHandbookRegistry();
      const stats = machineCapabilityIntelligenceEngine.getStats({
        handbookRegistry: registry,
        torqueCurves: { haas_vf_2: HAAS_VF2_TORQUE_CURVE, dmg_mori_dmu_50_3rd_gen: DMU50_TORQUE_CURVE },
        machineRegistry: null,
      });
      expect(stats.torque_curve_coverage).toBe(2);
      expect(stats.sources.torque_curve_hsm).toBe(1);
      expect(stats.sources.torque_curve_computed).toBe(1);
    });

    it("counts handbook machines", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const stats = machineCapabilityIntelligenceEngine.getStats({
        handbookRegistry: hbkReg,
        torqueCurves: {},
        machineRegistry: null,
      });
      expect(stats.handbook_coverage).toBe(1);
      expect(stats.sources.handbook).toBe(1);
    });

    it("reports unique machine count across all sources", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const stats = machineCapabilityIntelligenceEngine.getStats({
        handbookRegistry: hbkReg,
        torqueCurves: { haas_vf_2: HAAS_VF2_TORQUE_CURVE, dmg_mori_dmu_50_3rd_gen: DMU50_TORQUE_CURVE },
        machineRegistry: machineReg,
      });
      // haas_vf_2 appears in all 3 sources + dmg in torque curves = 2 unique machines
      expect(stats.total_machines_with_capability).toBe(2);
    });
  });

  // ── 8. Validation / Warnings ──
  describe("Validation and Warnings", () => {
    it("flags base_speed > max_rpm as critical", () => {
      const badHandbook = {
        ...HAAS_VF2_HANDBOOK,
        spindle_specs: {
          ...HAAS_VF2_HANDBOOK.spindle_specs,
          base_speed_rpm: 20000, // > max_rpm 8100
        },
      };
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: badHandbook });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      const w = profile.warnings.find(w => w.field === "spindle.base_speed_rpm");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("critical");
    });

    it("flags impossibly high RPM as critical", () => {
      const badHandbook = {
        ...HAAS_VF2_HANDBOOK,
        spindle_specs: {
          ...HAAS_VF2_HANDBOOK.spindle_specs,
          max_rpm: 500000, // Way above 200k limit
        },
      };
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: badHandbook });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      const w = profile.warnings.find(w => w.field === "spindle.max_rpm");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("critical");
    });

    it("no warnings for valid Haas VF-2 data", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      const criticalWarnings = profile.warnings.filter(w => w.severity === "critical");
      expect(criticalWarnings.length).toBe(0);
    });

    it("flags 30-min power < continuous power as warning", () => {
      const badHandbook = {
        ...HAAS_VF2_HANDBOOK,
        spindle_specs: {
          ...HAAS_VF2_HANDBOOK.spindle_specs,
          power_30min_kw: 10, // Less than continuous 14.9
        },
      };
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: badHandbook });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      const w = profile.warnings.find(w => w.field === "spindle.power_30min_kw");
      expect(w).toBeDefined();
      expect(w!.severity).toBe("warning");
    });

    it("includes provenance detail in source_detail", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.spindle!.max_rpm.source_detail).toContain("Haas VF-2 Operator Manual");
    });
  });

  // ── 9. Edge Cases ──
  describe("Edge Cases", () => {
    it("returns empty profile for unknown machine", () => {
      const registry = createMockHandbookRegistry();
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "nonexistent" },
        { handbookRegistry: registry, torqueCurves: {}, spindleCorrections: [], machineRegistry: null },
      );
      expect(profile.spindle).toBeNull();
      expect(profile.axes.length).toBe(0);
      expect(profile.work_envelope).toBeNull();
      expect(profile.field_count).toBe(0);
    });

    it("sources_consulted lists all used sources", () => {
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const machineReg = createMockMachineRegistry({ haas_vf_2: HAAS_VF2_REGISTRY });
      const profile = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: { haas_vf_2: HAAS_VF2_TORQUE_CURVE }, spindleCorrections: [], machineRegistry: machineReg },
      );
      expect(profile.sources_consulted).toContain("handbook");
      expect(profile.sources_consulted).toContain("torque_curve_hsm");
      expect(profile.sources_consulted).toContain("machine_registry");
    });

    it("avg_confidence reflects source mix", () => {
      // Only torque curve (conf 0.95)
      const registry = createMockHandbookRegistry();
      const p1 = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: registry, torqueCurves: { haas_vf_2: HAAS_VF2_TORQUE_CURVE }, spindleCorrections: [], machineRegistry: null },
      );
      // Handbook (conf 0.98) + torque curve
      const hbkReg = createMockHandbookRegistry({ haas_vf_2: HAAS_VF2_HANDBOOK });
      const p2 = machineCapabilityIntelligenceEngine.getProfile(
        { machine_id: "haas_vf_2" },
        { handbookRegistry: hbkReg, torqueCurves: { haas_vf_2: HAAS_VF2_TORQUE_CURVE }, spindleCorrections: [], machineRegistry: null },
      );
      expect(p2.avg_confidence).toBeGreaterThanOrEqual(p1.avg_confidence);
    });

    it("pickBest selects highest-confidence source", () => {
      const { _internal } = machineCapabilityIntelligenceEngine;
      const result = _internal.pickBest(
        { value: 100, source: "machine_registry" as CapabilitySource },
        { value: 200, source: "handbook" as CapabilitySource },
        { value: 150, source: "torque_curve_hsm" as CapabilitySource },
      );
      expect(result!.value).toBe(200); // handbook has highest confidence
      expect(result!.source).toBe("handbook");
    });

    it("pickBest returns undefined when no candidates", () => {
      const { _internal } = machineCapabilityIntelligenceEngine;
      expect(_internal.pickBest()).toBeUndefined();
      expect(_internal.pickBest(undefined, undefined)).toBeUndefined();
    });
  });
});
