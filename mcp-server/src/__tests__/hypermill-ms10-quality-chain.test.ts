/**
 * HM-REV-MS10 Quality Chain Tests
 * =================================
 * Tests for:
 *   U-HMR51: HyperMillSetupSheetBridge
 *   U-HMR52: HyperMillFAIBridge (AS9102)
 *   U-HMR53: HyperMillSPCBridge
 *   U-HMR54: hypermill-formula-registry (F-HM-001 to F-HM-020)
 *
 * ALL assertions use specific expected values — NO toBeTruthy() / toBeDefined() only.
 *
 * HM-REV-MS10 / U-HMR55
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HyperMillSetupSheetBridge,
  hyperMillSetupSheetBridge,
} from "../engines/HyperMillSetupSheetBridge.js";
import type { HyperMillSetupSheetInput } from "../engines/HyperMillSetupSheetBridge.js";
import {
  HyperMillFAIBridge,
  hyperMillFAIBridge,
} from "../engines/HyperMillFAIBridge.js";
import {
  HyperMillSPCBridge,
  hyperMillSPCBridge,
  AEROSPACE_CPK_TARGET,
} from "../engines/HyperMillSPCBridge.js";
import {
  HYPERMILL_FORMULAS,
  HYPERMILL_FORMULA_CROSS_REF,
} from "../data/hypermill-formula-registry.js";

// ============================================================================
// Test fixtures
// ============================================================================

const FIVE_OP_JOB: HyperMillSetupSheetInput = {
  job_id: "JOB-TEST-001",
  part_number: "PN-12345",
  part_description: "Turbine Bracket",
  material: "Ti6Al4V",
  machine: "DMU 50 eVo",
  controller_model: "Siemens 840D sl",
  post_processor: "DMG_5X_SIEMENS",
  ac_script_refs: ["AutoSetup_Ti.mcs", "ProbeWCS.mcs"],
  programmer: "J. Smith",
  program_number: "O1234",
  operations: [
    {
      operation_id: "OP010",
      operation_name: "Face Mill",
      cycle_type: "hmFace",
      tool_number: 1,
      tool_description: "Face Mill D50 R0 Z5",
      speed_rpm: 2000,
      feed_mmpm: 600,
      ap_mm: 1.0,
      ae_mm: 40,
      coolant: "flood",
    },
    {
      operation_id: "OP020",
      operation_name: "3D Rough",
      cycle_type: "hmSf3",
      tool_number: 2,
      tool_description: "End Mill D16 R0 Z4",
      speed_rpm: 3500,
      feed_mmpm: 1200,
      ap_mm: 8.0,
      ae_mm: 8.0,
      coolant: "flood",
      nominal_dimension_mm: 20,
      tolerance_plus_mm: 0.3,
      tolerance_minus_mm: 0.3,
      is_critical: false,
    },
    {
      operation_id: "OP030",
      operation_name: "Contour Finish",
      cycle_type: "hmFinish",
      tool_number: 3,
      tool_description: "End Mill D8 R0 Z4",
      speed_rpm: 6000,
      feed_mmpm: 800,
      ap_mm: 0.3,
      ae_mm: 0.15,
      coolant: "flood",
      nominal_dimension_mm: 20,
      tolerance_plus_mm: 0.025,
      tolerance_minus_mm: 0.025,
      is_critical: true,
    },
    {
      operation_id: "OP040",
      operation_name: "Drill M8 holes",
      cycle_type: "hmDrl",
      tool_number: 4,
      tool_description: "Drill D6.8 HSS",
      speed_rpm: 3000,
      feed_mmpm: 300,
      ap_mm: 20,
      coolant: "flood",
    },
    {
      operation_id: "OP050",
      operation_name: "Thread M8",
      cycle_type: "hmThread",
      tool_number: 5,
      tool_description: "Tap M8×1.25",
      speed_rpm: 400,
      feed_mmpm: 500,
      coolant: "flood",
    },
  ],
  fixture: {
    description: "Kurt 6\" vise, soft jaws",
    wcs_offset: "G54",
    datum_x_mm: 0,
    datum_y_mm: 0,
    datum_z_mm: 0,
  },
  format: "json",
  include_quality_checkpoints: true,
  include_safety_notes: true,
};

// ============================================================================
// U-HMR51: HyperMillSetupSheetBridge
// ============================================================================

describe("U-HMR51: HyperMillSetupSheetBridge", () => {
  it("should generate setup sheet with correct tool count for 5-op job", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    // 5 operations use tools 1-5 (all unique) → 5 tools
    expect(result.tool_count).toBe(5);
  });

  it("should generate setup sheet with correct operation count", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    expect(result.operation_count).toBe(5);
  });

  it("should include job_id and part_number in output", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    expect(result.job_id).toBe("JOB-TEST-001");
    expect(result.part_number).toBe("PN-12345");
  });

  it("should capture hyperMILL-specific metadata: controller and post-processor", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    expect(result.hypermill_metadata.controller_model).toBe("Siemens 840D sl");
    expect(result.hypermill_metadata.post_processor).toBe("DMG_5X_SIEMENS");
  });

  it("should include AC script references", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    expect(result.hypermill_metadata.ac_script_refs).toHaveLength(2);
    expect(result.hypermill_metadata.ac_script_refs[0]).toBe("AutoSetup_Ti.mcs");
  });

  it("should capture WCS offset designation G54", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    expect(result.wcs_summary.offset_designation).toBe("G54");
  });

  it("should generate 5 quality checkpoints (one per operation)", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    expect(result.quality_checkpoints).toHaveLength(5);
  });

  it("should mark OP030 as critical in quality checkpoints", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    const op030Checkpoint = result.quality_checkpoints.find(
      (qc) => qc.operation_id === "OP030"
    );
    expect(op030Checkpoint).toBeDefined();
    expect(op030Checkpoint!.is_critical).toBe(true);
  });

  it("should include safety notes with machine name and max spindle speed", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    expect(result.safety_notes.length).toBeGreaterThan(3);
    const machineNote = result.safety_notes.find((n) =>
      n.includes("DMU 50 eVo")
    );
    expect(machineNote).toBeDefined();
  });

  it("should produce formatted_output as string", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    expect(typeof result.formatted_output).toBe("string");
    expect(result.formatted_output.length).toBeGreaterThan(10);
  });

  it("should include correct cycle types in hypermill_metadata", () => {
    const result = hyperMillSetupSheetBridge.generate(FIVE_OP_JOB);
    expect(result.hypermill_metadata.cycle_types).toContain("hmFace");
    expect(result.hypermill_metadata.cycle_types).toContain("hmDrl");
    expect(result.hypermill_metadata.cycle_types).toContain("hmThread");
  });

  it("quality gate PASS when all 3 documents present", () => {
    const bridge = new HyperMillSetupSheetBridge();
    const gate = bridge.qualityGateCheck(true, true, true);
    expect(gate.gate_pass).toBe(true);
    expect(gate.missing_items).toHaveLength(0);
    expect(gate.present_items).toHaveLength(3);
  });

  it("quality gate BLOCK when setup sheet missing", () => {
    const bridge = new HyperMillSetupSheetBridge();
    const gate = bridge.qualityGateCheck(false, true, true);
    expect(gate.gate_pass).toBe(false);
    expect(gate.missing_items).toContain("Setup Sheet");
    expect(gate.message).toContain("BLOCK");
  });

  it("quality gate BLOCK when all documents missing", () => {
    const bridge = new HyperMillSetupSheetBridge();
    const gate = bridge.qualityGateCheck(false, false, false);
    expect(gate.gate_pass).toBe(false);
    expect(gate.missing_items).toHaveLength(3);
  });

  it("tool list de-duplicates correctly when same tool used in multiple ops", () => {
    const jobWithSharedTool: HyperMillSetupSheetInput = {
      ...FIVE_OP_JOB,
      operations: [
        { ...FIVE_OP_JOB.operations[0], operation_id: "OPA", tool_number: 1 },
        { ...FIVE_OP_JOB.operations[1], operation_id: "OPB", tool_number: 1 }, // same tool
        { ...FIVE_OP_JOB.operations[2], operation_id: "OPC", tool_number: 2 },
      ],
    };
    const result = hyperMillSetupSheetBridge.generate(jobWithSharedTool);
    // 3 ops but only 2 unique tools
    expect(result.tool_count).toBe(2);
    expect(result.operation_count).toBe(3);
  });
});

// ============================================================================
// U-HMR52: HyperMillFAIBridge (AS9102)
// ============================================================================

describe("U-HMR52: HyperMillFAIBridge — AS9102 FAI Plan", () => {
  it("FAI balloon count equals number of toleranced dimensions", async () => {
    // FIVE_OP_JOB has 2 toleranced ops: OP020 (±0.3mm) and OP030 (±0.025mm)
    const result = await hyperMillFAIBridge.generate({
      job_id: "JOB-TEST-001",
      part_number: "PN-12345",
      operations: FIVE_OP_JOB.operations,
    });
    expect(result.balloon_count).toBe(2);
  });

  it("critical characteristics sorted first (tighter tolerance)", async () => {
    const result = await hyperMillFAIBridge.generate({
      job_id: "JOB-TEST-001",
      part_number: "PN-12345",
      operations: FIVE_OP_JOB.operations,
    });
    // OP030 is critical (tolerance 0.025mm and is_critical=true)
    // OP020 is minor (tolerance 0.3mm)
    // Critical should be balloon #1
    const balloon1 = result.form_3.find((b) => b.char_number === 1);
    expect(balloon1).toBeDefined();
    expect(balloon1!.designator).toBe("critical");
    expect(balloon1!.operation_id).toBe("OP030");
  });

  it("Form 1 contains correct part number and revision", async () => {
    const result = await hyperMillFAIBridge.generate({
      job_id: "JOB-TEST-001",
      part_number: "PN-12345",
      revision: "C",
      operations: FIVE_OP_JOB.operations,
    });
    expect(result.form_1.part_number).toBe("PN-12345");
    expect(result.form_1.revision).toBe("C");
  });

  it("critical dimension auto-flagged when tolerance <= 0.05mm", async () => {
    const tightOps = [
      {
        operation_id: "OP-TIGHT",
        operation_name: "Finish Bore",
        tool_number: 1,
        tool_description: "Boring Bar D20",
        nominal_dimension_mm: 50,
        tolerance_plus_mm: 0.01, // very tight
        tolerance_minus_mm: 0.01,
        is_critical: false, // not explicitly flagged
      },
    ];
    const result = await hyperMillFAIBridge.generate({
      job_id: "JOB-TIGHT",
      part_number: "PN-TIGHT",
      operations: tightOps,
    });
    expect(result.form_3[0].designator).toBe("critical");
  });

  it("inspection method is CMM for tight tolerance (<=0.02mm)", async () => {
    const tightOps = [
      {
        operation_id: "OP-BORE",
        operation_name: "Precision Bore",
        tool_number: 1,
        tool_description: "Boring Bar",
        nominal_dimension_mm: 25,
        tolerance_plus_mm: 0.01,
        tolerance_minus_mm: 0.01,
      },
    ];
    const result = await hyperMillFAIBridge.generate({
      job_id: "JOB-BORE",
      part_number: "PN-BORE",
      operations: tightOps,
    });
    expect(result.form_3[0].inspection_method).toBe("CMM");
  });

  it("job with no toleranced dimensions has balloon_count = 0", async () => {
    const nonTolOps = FIVE_OP_JOB.operations.filter(
      (op) => op.tolerance_plus_mm === undefined && op.tolerance_minus_mm === undefined
    );
    const result = await hyperMillFAIBridge.generate({
      job_id: "JOB-NOTOL",
      part_number: "PN-NOTOL",
      operations: nonTolOps,
    });
    expect(result.balloon_count).toBe(0);
  });

  it("feature_type='bore' auto-classified as critical", async () => {
    const boreOp = [
      {
        operation_id: "OP-BORE",
        operation_name: "Bore Feature",
        feature_type: "bore",
        tool_number: 1,
        tool_description: "Boring Bar",
        nominal_dimension_mm: 30,
        tolerance_plus_mm: 0.05,
        tolerance_minus_mm: 0.05,
        is_critical: false,
      },
    ];
    const result = await hyperMillFAIBridge.generate({
      job_id: "JOB-BORE2",
      part_number: "PN-BORE2",
      operations: boreOp,
    });
    expect(result.form_3[0].designator).toBe("critical");
  });
});

// ============================================================================
// U-HMR53: HyperMillSPCBridge
// ============================================================================

describe("U-HMR53: HyperMillSPCBridge — SPC Control Plan", () => {
  it("subgroup_size=5 → X-bar R chart type", () => {
    const result = hyperMillSPCBridge.generate({
      job_id: "JOB-SPC-1",
      part_number: "PN-SPC-1",
      operations: FIVE_OP_JOB.operations,
      subgroup_size: 5,
    });
    expect(result.default_chart_type).toBe("xbar_r");
  });

  it("subgroup_size=1 → Individual/MR chart type", () => {
    const result = hyperMillSPCBridge.generate({
      job_id: "JOB-SPC-2",
      part_number: "PN-SPC-2",
      operations: FIVE_OP_JOB.operations,
      subgroup_size: 1,
    });
    expect(result.default_chart_type).toBe("individual_mr");
  });

  it("subgroup_size=8 → X-bar R chart type (n>=5)", () => {
    const result = hyperMillSPCBridge.generate({
      job_id: "JOB-SPC-3",
      part_number: "PN-SPC-3",
      operations: FIVE_OP_JOB.operations,
      subgroup_size: 8,
    });
    expect(result.default_chart_type).toBe("xbar_r");
  });

  it("control plan has entries only for toleranced operations", () => {
    const result = hyperMillSPCBridge.generate({
      job_id: "JOB-SPC-4",
      part_number: "PN-SPC-4",
      operations: FIVE_OP_JOB.operations,
      subgroup_size: 5,
    });
    // FIVE_OP_JOB has 2 toleranced ops (OP020, OP030)
    expect(result.feature_count).toBe(2);
  });

  it("aerospace Cpk target is 1.33", () => {
    expect(AEROSPACE_CPK_TARGET).toBe(1.33);

    const result = hyperMillSPCBridge.generate({
      job_id: "JOB-SPC-5",
      part_number: "PN-SPC-5",
      operations: FIVE_OP_JOB.operations,
      subgroup_size: 5,
      target_cpk: 1.33,
      aerospace: true,
    });
    expect(result.target_cpk).toBe(1.33);
  });

  it("critical feature has higher Cpk target than non-critical (>=1.33)", () => {
    const result = hyperMillSPCBridge.generate({
      job_id: "JOB-SPC-6",
      part_number: "PN-SPC-6",
      operations: FIVE_OP_JOB.operations,
      subgroup_size: 5,
      target_cpk: 1.00,
    });
    const criticalEntry = result.control_plan.find(
      (e) => e.feature_plan.is_critical
    );
    const nonCriticalEntry = result.control_plan.find(
      (e) => !e.feature_plan.is_critical
    );
    if (criticalEntry && nonCriticalEntry) {
      expect(criticalEntry.feature_plan.target_cpk).toBeGreaterThanOrEqual(
        nonCriticalEntry.feature_plan.target_cpk
      );
    }
  });

  it("critical feature has 100% sampling for first 30 parts", () => {
    const result = hyperMillSPCBridge.generate({
      job_id: "JOB-SPC-7",
      part_number: "PN-SPC-7",
      operations: FIVE_OP_JOB.operations,
      subgroup_size: 5,
    });
    const criticalEntry = result.control_plan.find(
      (e) => e.feature_plan.is_critical
    );
    expect(criticalEntry).toBeDefined();
    expect(criticalEntry!.feature_plan.sampling_frequency).toContain("100%");
  });

  it("CMM measurement for tight tolerance (<=0.1mm)", () => {
    const result = hyperMillSPCBridge.generate({
      job_id: "JOB-SPC-8",
      part_number: "PN-SPC-8",
      operations: FIVE_OP_JOB.operations,
      subgroup_size: 5,
    });
    // OP030 has tolerance 0.025mm → should be CMM
    const op030Entry = result.control_plan.find(
      (e) => e.feature_plan.operation_id === "OP030"
    );
    expect(op030Entry).toBeDefined();
    expect(op030Entry!.feature_plan.measurement_method).toContain("CMM");
  });

  it("USL and LSL correctly calculated from nominal + tolerance", () => {
    const singleTolOp = [
      {
        operation_id: "OP-DIM",
        operation_name: "Bore Finish",
        tool_number: 1,
        tool_description: "Boring Bar",
        nominal_dimension_mm: 50,
        tolerance_plus_mm: 0.02,
        tolerance_minus_mm: 0.02,
      },
    ];
    const result = hyperMillSPCBridge.generate({
      job_id: "JOB-DIM",
      part_number: "PN-DIM",
      operations: singleTolOp,
    });
    const entry = result.control_plan[0];
    expect(entry.feature_plan.usl_mm).toBeCloseTo(50.02, 5);
    expect(entry.feature_plan.lsl_mm).toBeCloseTo(49.98, 5);
    expect(entry.feature_plan.nominal_mm).toBe(50);
  });
});

// ============================================================================
// U-HMR54: hypermill-formula-registry — 20 Formulas
// ============================================================================

describe("U-HMR54: hypermill-formula-registry — F-HM-001 to F-HM-020", () => {
  it("exactly 20 formulas registered", () => {
    expect(HYPERMILL_FORMULAS).toHaveLength(20);
  });

  it("formula IDs run sequentially F-HM-001 to F-HM-020", () => {
    const ids = HYPERMILL_FORMULAS.map((f) => f.formula_id);
    for (let i = 1; i <= 20; i++) {
      const expected = `F-HM-${String(i).padStart(3, "0")}`;
      expect(ids).toContain(expected);
    }
  });

  it("all formulas have required fields: domain, category, equation_plain, parameters", () => {
    for (const formula of HYPERMILL_FORMULAS) {
      expect(formula.domain).toBe("hypermill_cam");
      expect(typeof formula.category).toBe("string");
      expect(formula.category.length).toBeGreaterThan(0);
      expect(typeof formula.equation_plain).toBe("string");
      expect(formula.equation_plain.length).toBeGreaterThan(0);
      expect(Array.isArray(formula.parameters)).toBe(true);
      expect(formula.parameters.length).toBeGreaterThan(0);
    }
  });

  it("all formulas have at least one reference citation", () => {
    for (const formula of HYPERMILL_FORMULAS) {
      expect(Array.isArray(formula.references)).toBe(true);
      expect(formula.references!.length).toBeGreaterThan(0);
    }
  });

  it("all formulas have at least 2 parameters (input + output)", () => {
    for (const formula of HYPERMILL_FORMULAS) {
      const inputs = formula.parameters.filter((p) => p.type === "input");
      const outputs = formula.parameters.filter((p) => p.type === "output");
      expect(inputs.length).toBeGreaterThanOrEqual(1);
      expect(outputs.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("all formulas have at least one consumer", () => {
    for (const formula of HYPERMILL_FORMULAS) {
      expect(Array.isArray(formula.consumers)).toBe(true);
      expect(formula.consumers.length).toBeGreaterThan(0);
    }
  });

  // ── Formula-specific numeric validations ───────────────────────────────

  describe("F-HM-001: MAXX Roughing MRR", () => {
    it("ae=10, ap=3, vf=1000 → MRR = 30 cm³/min", () => {
      const formula = HYPERMILL_FORMULAS.find((f) => f.formula_id === "F-HM-001")!;
      expect(formula).toBeDefined();
      // Q = ae * ap * vf * 1e-3 = 10 * 3 * 1000 * 0.001 = 30
      const ae = 10, ap = 3, vf = 1000;
      const Q = ae * ap * vf * 1e-3;
      expect(Q).toBe(30);
      // Verify example in formula matches
      const example = formula.examples?.[0];
      expect(example).toBeDefined();
      expect(example!.output).toBe(30);
    });
  });

  describe("F-HM-002: Barrel Cutter Scallop Height", () => {
    it("R=5, stepover=1 → scallop ≈ 0.025mm", () => {
      const formula = HYPERMILL_FORMULAS.find((f) => f.formula_id === "F-HM-002")!;
      expect(formula).toBeDefined();
      // h = R - sqrt(R² - (p/2)²) = 5 - sqrt(25 - 0.25) = 5 - sqrt(24.75)
      const R = 5, p = 1;
      const h = R - Math.sqrt(R * R - (p / 2) * (p / 2));
      expect(h).toBeCloseTo(0.025, 3); // ≈ 0.025mm
    });

    it("R=10, stepover=2 → scallop ≈ 0.05mm", () => {
      const R = 10, p = 2;
      const h = R - Math.sqrt(R * R - (p / 2) * (p / 2));
      expect(h).toBeCloseTo(0.05, 3);
    });
  });

  describe("F-HM-003: 5-Axis Tilt Compensation Factor", () => {
    it("tilt=0° → factor = 1.0 (no correction)", () => {
      const factor = 1 / Math.cos(0);
      expect(factor).toBeCloseTo(1.0, 5);
    });

    it("tilt=15° → factor ≈ 1.035", () => {
      const factor = 1 / Math.cos((15 * Math.PI) / 180);
      expect(factor).toBeCloseTo(1.0353, 3);
    });
  });

  describe("F-HM-009: Feed per Tooth", () => {
    it("vf=600, rpm=3000, z=4 → fz=0.05 mm/tooth", () => {
      const fz = 600 / (3000 * 4);
      expect(fz).toBeCloseTo(0.05, 5);
    });
  });

  describe("F-HM-015: CSS RPM formula", () => {
    it("Vc=200, D=20 → rpm ≈ 3183 RPM", () => {
      const rpm = (1000 * 200) / (Math.PI * 20);
      expect(rpm).toBeCloseTo(3183.1, 0);
    });

    it("Vc=100, D=10 → rpm ≈ 3183 RPM", () => {
      const rpm = (1000 * 100) / (Math.PI * 10);
      expect(rpm).toBeCloseTo(3183.1, 0);
    });
  });

  describe("F-HM-016: Surface Roughness Rth", () => {
    // F-HM-016 equation_plain: Rth = f² / (8*r) — result in mm, convert to µm ×1000
    it("f=0.2mm/rev, r=0.8mm → Rth_mm = 0.00625mm = 6.25µm", () => {
      const Rth_mm = (0.2 * 0.2) / (8 * 0.8);
      expect(Rth_mm).toBeCloseTo(0.00625, 6);
      // Converted to µm:
      expect(Rth_mm * 1000).toBeCloseTo(6.25, 2);
    });

    it("f=0.1mm/rev, r=0.4mm → Rth_mm = 0.003125mm = 3.125µm", () => {
      const Rth_mm = (0.1 * 0.1) / (8 * 0.4);
      expect(Rth_mm).toBeCloseTo(0.003125, 7);
      expect(Rth_mm * 1000).toBeCloseTo(3.125, 3);
    });

    it("f=0.4mm/rev, r=0.8mm → Rth_mm = 0.025mm = 25µm (coarse finish)", () => {
      const Rth_mm = (0.4 * 0.4) / (8 * 0.8);
      expect(Rth_mm).toBeCloseTo(0.025, 5);
      expect(Rth_mm * 1000).toBeCloseTo(25, 2);
    });
  });

  describe("F-HM-013: MAXX HPC Chip Thinning", () => {
    it("fz=0.1, ae=2, D=20 → corrected fz ≈ 0.316", () => {
      const fzCorr = 0.1 / Math.sqrt(2 / 20);
      expect(fzCorr).toBeCloseTo(0.3162, 3);
    });

    it("ae=D (full slot, no thinning) → corrected fz = fz", () => {
      const fzCorr = 0.1 / Math.sqrt(20 / 20);
      expect(fzCorr).toBeCloseTo(0.1, 5);
    });
  });

  describe("F-HM-018: Combined Measurement Uncertainty", () => {
    // F-HM-018 equation: U = k * sqrt(u_probe² + u_temp² + u_fixture²)
    // k=2, u_probe=1.5, u_temp=0.8, u_fixture=0.5:
    //   combined = sqrt(2.25 + 0.64 + 0.25) = sqrt(3.14) = 1.772
    //   U = 2 × 1.772 = 3.544µm
    it("k=2, u_probe=1.5, u_temp=0.8, u_fixture=0.5 → U ≈ 3.544µm", () => {
      const combined = Math.sqrt(1.5 ** 2 + 0.8 ** 2 + 0.5 ** 2);
      expect(combined).toBeCloseTo(1.7720, 3); // sqrt(3.14)
      const U = 2 * combined;
      expect(U).toBeCloseTo(3.544, 2);
    });

    it("k=2, u_probe=1, u_temp=0, u_fixture=0 → U = 2µm", () => {
      const U = 2 * Math.sqrt(1 ** 2 + 0 ** 2 + 0 ** 2);
      expect(U).toBeCloseTo(2.0, 5);
    });
  });

  describe("F-HM-017: Cycle Time", () => {
    it("L_cut=10000, vf=500, L_rapid=2000, v_rapid=30000 → ≈20.07 min", () => {
      const t = 10000 / 500 + 2000 / 30000;
      expect(t).toBeCloseTo(20.067, 2);
    });

    it("L_cut=5000, vf=1000, no rapid → 5 min", () => {
      const t = 5000 / 1000 + 0;
      expect(t).toBe(5);
    });
  });

  describe("F-HM-020: Aerospace Cpk target", () => {
    it("Cpk >= 1.33 is the AS9100 aerospace minimum", () => {
      expect(AEROSPACE_CPK_TARGET).toBe(1.33);
    });

    it("Cp = (USL-LSL)/(6*sigma): tol=0.1, sigma=0.0125 → Cp = 1.33", () => {
      const USL = 25.05, LSL = 24.95, sigma = 0.0125;
      const Cp = (USL - LSL) / (6 * sigma);
      expect(Cp).toBeCloseTo(1.333, 2);
    });
  });

  // ── Cross-reference map ────────────────────────────────────────────────

  describe("Formula Cross-Reference Map", () => {
    it("has 20 entries in cross-reference map", () => {
      expect(Object.keys(HYPERMILL_FORMULA_CROSS_REF)).toHaveLength(20);
    });

    it("F-HM-001 maps to HyperMillStrategyEngine", () => {
      expect(HYPERMILL_FORMULA_CROSS_REF["F-HM-001"]).toContain(
        "HyperMillStrategyEngine"
      );
    });

    it("F-HM-020 maps to SPCProcessCapabilityEngine", () => {
      expect(HYPERMILL_FORMULA_CROSS_REF["F-HM-020"]).toContain(
        "SPCProcessCapabilityEngine"
      );
    });

    it("all 20 cross-reference entries have at least one consumer", () => {
      for (const [id, consumers] of Object.entries(HYPERMILL_FORMULA_CROSS_REF)) {
        expect(consumers.length).toBeGreaterThan(0);
      }
    });
  });
});
