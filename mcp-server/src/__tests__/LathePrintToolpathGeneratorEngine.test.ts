/**
 * LathePrintToolpathGeneratorEngine Tests — U-LTH39
 *
 * Physics-based toolpath generation: Vc/RPM/feed calculation, Kienzle forces,
 * MRR, machine envelope checks, G-code emission. JM Die samples + adversarial.
 *
 * @milestone LATHE-MASTER U-LTH39
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintToolpathGeneratorEngine,
  type MachineLimits,
} from "../engines/LathePrintToolpathGeneratorEngine.js";
import {
  lathePrintFeatureStrategySelectorEngine,
  type FeatureInput,
  type MaterialInput,
} from "../engines/LathePrintFeatureStrategySelectorEngine.js";
import {
  lathePrintSequencePlannerEngine,
  type StockInput,
} from "../engines/LathePrintSequencePlannerEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ============================================================================
// FIXTURES
// ============================================================================

const STEEL_1018: MaterialInput = {
  name: "1018 Steel",
  iso_group: "P",
  tensile_strength_mpa: 440,
  machinability_factor: 0.8,
};

const ALUMINUM: MaterialInput = {
  name: "6061-T6 Aluminum",
  iso_group: "N",
  tensile_strength_mpa: 310,
  machinability_factor: 1.5,
};

const INCONEL: MaterialInput = {
  name: "Inconel 718",
  iso_group: "S",
  hardness_hrc: 36,
  tensile_strength_mpa: 1350,
  machinability_factor: 0.15,
};

const JM_DIE_PIN: FeatureInput[] = [
  { id: "F1", type: "face", diameter_mm: 25.4, depth_mm: 2, tolerance_total_mm: 0.05 },
  { id: "F2", type: "od_turn", diameter_mm: 25.4, length_mm: 50, tolerance_total_mm: 0.025 },
  { id: "F3", type: "chamfer_od", diameter_mm: 25.4, depth_mm: 1.5 },
  { id: "F4", type: "groove_od", diameter_mm: 20, depth_mm: 2.5 },
];

const ITW_CONNECTOR: FeatureInput[] = [
  { id: "C1", type: "center_drill", diameter_mm: 3.2, depth_mm: 5 },
  { id: "C2", type: "drill", diameter_mm: 8.5, depth_mm: 30 },
  { id: "C3", type: "face", diameter_mm: 19.05, depth_mm: 1.5 },
  { id: "C4", type: "od_turn", diameter_mm: 19.05, length_mm: 40 },
  { id: "C5", type: "thread_external", diameter_mm: 19.05, length_mm: 20, tolerance_total_mm: 1.5 },
];

const STOCK: StockInput = { od_mm: 30, length_mm: 80, id_mm: 0 };

// Helper to build sequence plan
function buildSequence(features: FeatureInput[], material: MaterialInput) {
  const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(features, material);
  return lathePrintSequencePlannerEngine.planSequence(stratPlan, STOCK, features);
}

// ============================================================================
// HAPPY PATH
// ============================================================================

describe("LathePrintToolpathGeneratorEngine", () => {
  describe("Happy Path — JM Die Samples", () => {
    it("Alcoa Die Pin: generates toolpath for 4 features", () => {
      const seq = buildSequence(JM_DIE_PIN, ALUMINUM);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, ALUMINUM
      );

      expect(program.operations.length).toBe(4);
      expect(program.total_cycle_time_sec).toBeGreaterThan(0);
      expect(program.gcode_preview).toContain("O1000");
      expect(program.gcode_preview).toContain("M30");
    });

    it("ITW Connector: handles drill, face, turn, thread operations", () => {
      const seq = buildSequence(ITW_CONNECTOR, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, ITW_CONNECTOR, STEEL_1018
      );

      expect(program.operations.length).toBe(5);
      const threadOp = program.operations.find(o => o.featureType === "thread_external");
      expect(threadOp).toBeTruthy();
      expect(threadOp!.moves.some(m => m.move_type === "canned_cycle")).toBe(true);
      expect(threadOp!.moves.some(m => m.gcode.includes("G76"))).toBe(true);
    });

    it("Drill operation: uses G83 peck cycle", () => {
      const features: FeatureInput[] = [
        { id: "D1", type: "drill", diameter_mm: 10, depth_mm: 50 },
      ];
      const seq = buildSequence(features, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, features, STEEL_1018
      );

      const drillOp = program.operations[0];
      expect(drillOp.moves.some(m => m.gcode.includes("G83"))).toBe(true);
      expect(drillOp.moves.some(m => m.gcode.includes("G80"))).toBe(true);
    });
  });

  // ============================================================================
  // PHYSICS INVARIANTS
  // ============================================================================

  describe("Physics Invariants", () => {
    it("Vc/RPM invariant: N = 1000·Vc / (π·D)", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, STEEL_1018
      );

      const odOp = program.operations.find(o => o.featureType === "od_turn")!;
      const feature = JM_DIE_PIN.find(f => f.id === odOp.featureId)!;
      const expectedRpmMax = (1000 * odOp.cutting_speed_m_min) / (Math.PI * feature.diameter_mm!);

      // RPM capped at expected (within rounding)
      expect(odOp.spindle_rpm).toBeLessThanOrEqual(Math.ceil(expectedRpmMax) + 1);
    });

    it("feed = fz · RPM (dimensional check)", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, STEEL_1018
      );

      program.operations.forEach(op => {
        if (op.spindle_rpm > 0 && op.feed_mm_rev > 0) {
          const expectedFeedMmMin = op.feed_mm_rev * op.spindle_rpm;
          // Allow ±2% for rounding + machine feed cap
          const ratio = op.feed_mm_min / expectedFeedMmMin;
          expect(ratio).toBeLessThanOrEqual(1.02);
        }
      });
    });

    it("Kienzle force: harder material → higher force", () => {
      const seqAl = buildSequence(JM_DIE_PIN, ALUMINUM);
      const seqSteel = buildSequence(JM_DIE_PIN, STEEL_1018);
      const seqInconel = buildSequence(JM_DIE_PIN, INCONEL);

      const pAl = lathePrintToolpathGeneratorEngine.generateProgram(seqAl, JM_DIE_PIN, ALUMINUM);
      const pSt = lathePrintToolpathGeneratorEngine.generateProgram(seqSteel, JM_DIE_PIN, STEEL_1018);
      const pIn = lathePrintToolpathGeneratorEngine.generateProgram(seqInconel, JM_DIE_PIN, INCONEL);

      const fAl = pAl.operations.find(o => o.featureType === "od_turn")!.cutting_force_n;
      const fSt = pSt.operations.find(o => o.featureType === "od_turn")!.cutting_force_n;
      const fIn = pIn.operations.find(o => o.featureType === "od_turn")!.cutting_force_n;

      expect(fSt).toBeGreaterThan(fAl);
      expect(fIn).toBeGreaterThan(fSt);
    });

    it("Aluminum: Vc much higher than steel (machinability invariant)", () => {
      const seqAl = buildSequence(JM_DIE_PIN, ALUMINUM);
      const seqSt = buildSequence(JM_DIE_PIN, STEEL_1018);

      const pAl = lathePrintToolpathGeneratorEngine.generateProgram(seqAl, JM_DIE_PIN, ALUMINUM);
      const pSt = lathePrintToolpathGeneratorEngine.generateProgram(seqSt, JM_DIE_PIN, STEEL_1018);

      const vcAl = pAl.operations[1].cutting_speed_m_min; // OD turn
      const vcSt = pSt.operations[1].cutting_speed_m_min;

      expect(vcAl).toBeGreaterThan(vcSt * 1.5);  // aluminum Vc at least 50% higher
    });

    it("MRR > 0 for all cutting operations", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, STEEL_1018
      );

      program.operations.forEach(op => {
        expect(op.material_removal_rate_cm3_min).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // MACHINE LIMITS
  // ============================================================================

  describe("Machine Limits", () => {
    it("RPM capped to machine max", () => {
      const tight: MachineLimits = {
        max_x_mm: 250, max_z_mm: 500, max_rpm: 2000, max_feed_mm_min: 10000,
      };
      const seq = buildSequence(JM_DIE_PIN, ALUMINUM);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, ALUMINUM, tight
      );

      program.operations.forEach(op => {
        expect(op.spindle_rpm).toBeLessThanOrEqual(tight.max_rpm);
      });
    });

    it("feed capped to machine max", () => {
      const tight: MachineLimits = {
        max_x_mm: 250, max_z_mm: 500, max_rpm: 5000, max_feed_mm_min: 500,
      };
      const seq = buildSequence(JM_DIE_PIN, ALUMINUM);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, ALUMINUM, tight
      );

      program.operations.forEach(op => {
        expect(op.feed_mm_min).toBeLessThanOrEqual(tight.max_feed_mm_min);
      });
    });

    it("envelope violation flagged when part exceeds machine", () => {
      const tiny: MachineLimits = {
        max_x_mm: 5, max_z_mm: 5, max_rpm: 5000, max_feed_mm_min: 10000,
      };
      const large: FeatureInput[] = [
        { id: "L1", type: "od_turn", diameter_mm: 100, length_mm: 500 },
      ];
      const seq = buildSequence(large, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, large, STEEL_1018, tiny
      );

      expect(program.machine_envelope_check.within_envelope).toBe(false);
      expect(program.warnings.some(w => w.includes("envelope"))).toBe(true);
    });
  });

  // ============================================================================
  // G-CODE EMISSION
  // ============================================================================

  describe("G-Code Emission", () => {
    it("preview includes program start/end markers", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, STEEL_1018
      );

      expect(program.gcode_preview).toMatch(/^%/);
      expect(program.gcode_preview).toContain("O1000");
      expect(program.gcode_preview).toContain("G28 U0 W0");
      expect(program.gcode_preview).toContain("M30");
    });

    it("exportGCode returns string with operation markers", () => {
      const seq = buildSequence(ITW_CONNECTOR, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, ITW_CONNECTOR, STEEL_1018
      );

      const gcode = lathePrintToolpathGeneratorEngine.exportGCode(program);
      expect(gcode).toContain("OP 1:");
      expect(gcode.split("\n").length).toBeGreaterThan(20);
    });

    it("tool change codes present (T and M06)", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, STEEL_1018
      );

      expect(program.gcode_preview).toMatch(/T\d{4}/);
      expect(program.gcode_preview).toContain("M06");
    });

    it("spindle on command present", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, STEEL_1018
      );

      expect(program.gcode_preview).toMatch(/M03 S\d+/);
    });
  });

  // ============================================================================
  // CYCLE TIME BREAKDOWN
  // ============================================================================

  describe("Cycle Time Breakdown", () => {
    it("total = rapid + feed (approximately)", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, STEEL_1018
      );

      const breakdown = lathePrintToolpathGeneratorEngine.getCycleTimeBreakdown(program);
      expect(breakdown.rapid_percent + breakdown.feed_percent).toBeLessThanOrEqual(110); // allow for tool change overhead
      expect(breakdown.total_sec).toBeCloseTo(program.total_cycle_time_sec, 1);
    });

    it("per-operation times sum to total (within overhead)", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, STEEL_1018
      );

      const breakdown = lathePrintToolpathGeneratorEngine.getCycleTimeBreakdown(program);
      const perOpSum = breakdown.by_operation_sec.reduce((s, o) => s + o.seconds, 0);
      expect(perOpSum).toBeCloseTo(program.total_cycle_time_sec, 1);
    });
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  describe("Validation", () => {
    it("validate returns valid=true for good program", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, STEEL_1018
      );
      const result = lathePrintToolpathGeneratorEngine.validate(program);
      expect(result.valid).toBe(true);
    });

    it("validate returns valid=false for envelope violation", () => {
      const tiny: MachineLimits = {
        max_x_mm: 1, max_z_mm: 1, max_rpm: 5000, max_feed_mm_min: 10000,
      };
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, STEEL_1018, tiny
      );
      const result = lathePrintToolpathGeneratorEngine.validate(program);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("envelope"))).toBe(true);
    });
  });

  // ============================================================================
  // ADVERSARIAL INPUTS
  // ============================================================================

  describe("Adversarial Inputs", () => {
    it("throws on null sequence plan", () => {
      expect(() => {
        lathePrintToolpathGeneratorEngine.generateProgram(
          null as any, JM_DIE_PIN, STEEL_1018
        );
      }).toThrow(/Invalid sequence plan/);
    });

    it("throws on missing operations", () => {
      expect(() => {
        lathePrintToolpathGeneratorEngine.generateProgram(
          { plan_id: "bad" } as any, JM_DIE_PIN, STEEL_1018
        );
      }).toThrow(/Invalid sequence plan/);
    });

    it("throws when features is not array", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      expect(() => {
        lathePrintToolpathGeneratorEngine.generateProgram(
          seq, null as any, STEEL_1018
        );
      }).toThrow(/array/);
    });

    it("rejects max_rpm below 100 (schema)", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      expect(() => {
        lathePrintToolpathGeneratorEngine.generateProgram(
          seq, JM_DIE_PIN, STEEL_1018,
          { max_x_mm: 250, max_z_mm: 500, max_rpm: 50, max_feed_mm_min: 10000 }
        );
      }).toThrow();
    });

    it("rejects NaN limits (schema)", () => {
      const seq = buildSequence(JM_DIE_PIN, STEEL_1018);
      expect(() => {
        lathePrintToolpathGeneratorEngine.generateProgram(
          seq, JM_DIE_PIN, STEEL_1018,
          { max_x_mm: Number.NaN, max_z_mm: 500, max_rpm: 5000, max_feed_mm_min: 10000 }
        );
      }).toThrow();
    });

    it("handles empty sequence plan gracefully", () => {
      const emptySeq = {
        plan_id: "empty",
        source_strategy_plan_id: "src",
        operations: [],
        setup_count: 1,
        tool_change_count: 0,
        total_cycle_time_sec: 0,
        total_tool_change_time_sec: 0,
        initial_stock: { od_mm: 10, id_mm: 0, length_mm: 50, remaining_volume_cm3: 0, setup_id: "OP10" },
        final_stock: { od_mm: 10, id_mm: 0, length_mm: 50, remaining_volume_cm3: 0, setup_id: "OP10" },
        violations: [],
        valid: true,
        timestamp: new Date().toISOString(),
      };

      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        emptySeq, [], STEEL_1018
      );
      expect(program.operations).toEqual([]);
      expect(program.total_cycle_time_sec).toBe(0);
    });
  });

  // ============================================================================
  // MATERIAL VARIABILITY
  // ============================================================================

  describe("Material Variability", () => {
    const materials: MaterialInput[] = [
      { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 },
      { name: "316 Stainless", iso_group: "M", tensile_strength_mpa: 580 },
      { name: "Gray Cast Iron", iso_group: "K", tensile_strength_mpa: 250 },
      { name: "Inconel 718", iso_group: "S", tensile_strength_mpa: 1350 },
    ];

    it.each(materials)("generates valid program for $name (ISO $iso_group)", (mat) => {
      const seq = buildSequence(JM_DIE_PIN, mat);
      const program = lathePrintToolpathGeneratorEngine.generateProgram(
        seq, JM_DIE_PIN, mat
      );

      expect(program.operations.length).toBeGreaterThan(0);
      expect(program.total_cycle_time_sec).toBeGreaterThan(0);
      program.operations.forEach(op => {
        expect(op.spindle_rpm).toBeGreaterThan(0);
        expect(op.cutting_speed_m_min).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // DISPATCHER INTEGRATION
  // ============================================================================

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains lathe_p2p_toolpath_generate", () => {
      expect(camActions).toContain("lathe_p2p_toolpath_generate");
    });

    it("ACTIONS contains lathe_p2p_toolpath_validate", () => {
      expect(camActions).toContain("lathe_p2p_toolpath_validate");
    });

    it("ACTIONS contains lathe_p2p_toolpath_gcode", () => {
      expect(camActions).toContain("lathe_p2p_toolpath_gcode");
    });

    it("ACTIONS contains lathe_p2p_toolpath_cycle_time", () => {
      expect(camActions).toContain("lathe_p2p_toolpath_cycle_time");
    });
  });
});
