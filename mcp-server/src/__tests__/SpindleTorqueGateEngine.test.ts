/**
 * SpindleTorqueGateEngine Tests — U-LSR05 (LATHE-HARDENED-MS0)
 *
 * Verifies:
 *  - Torque curve physics (constant-torque + constant-power regions)
 *  - gate() total-ness (no throws on valid-shape bad-value input)
 *  - gateOrThrow() throws SpindleTorqueBlockError on BLOCKED
 *  - NaN / Infinity / rpm≤0 / rpm>max → BLOCKED with specific reason
 *  - Utilisation bands: safe / warning / block
 *  - Dispatcher wiring
 */

import { describe, it, expect } from "vitest";
import {
  spindleTorqueGateEngine,
  SpindleTorqueGateEngine,
  SpindleTorqueBlockError,
  SpindleTorqueGateResultSchema,
  MachineSpindleSpecSchema,
  type MachineSpindleSpec,
} from "../engines/SpindleTorqueGateEngine.js";
import type { ToolpathProgram } from "../engines/LathePrintToolpathGeneratorEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ---------------------------------------------------------------------------
// Machine + program fixtures
// ---------------------------------------------------------------------------

// Okuma LB3000: 15 kW / 173 Nm / base_rpm ≈ 828 (derived: 9549×15/173)
const OKUMA_LB3000: MachineSpindleSpec = {
  max_power_kW: 15,
  max_torque_Nm: 173,
  max_rpm: 4500,
};

// Small turning centre: 7.5 kW / 60 Nm / derived base_rpm ≈ 1194
const SMALL_SPINDLE: MachineSpindleSpec = {
  max_power_kW: 7.5,
  max_torque_Nm: 60,
  max_rpm: 6000,
};

function makeOp(overrides: Partial<{
  op_number: number;
  spindle_rpm: number;
  cutting_force_n: number;
  cutting_speed_m_min: number;
}> = {}): ToolpathProgram["operations"][number] {
  return {
    op_number: overrides.op_number ?? 1,
    featureId: "F1",
    featureType: "od_turn",
    strategy_id: "OD_ROUGH",
    tool_id: "T01",
    cutting_speed_m_min: overrides.cutting_speed_m_min ?? 200,
    spindle_rpm: overrides.spindle_rpm ?? 1800,
    feed_mm_rev: 0.25,
    feed_mm_min: 450,
    depth_of_cut_mm: 2,
    number_of_passes: 1,
    moves: [],
    cycle_time_sec: 30,
    cutting_force_n: overrides.cutting_force_n ?? 500,
    material_removal_rate_cm3_min: 50,
    warnings: [],
  };
}

function makeProgram(ops: ToolpathProgram["operations"]): ToolpathProgram {
  return {
    program_id: "P-TORQUE-TEST",
    source_sequence_plan_id: "S-1",
    operations: ops,
    total_cycle_time_sec: ops.reduce((s, o) => s + o.cycle_time_sec, 0),
    total_rapid_time_sec: 0,
    total_feed_time_sec: 30,
    total_cutting_volume_cm3: 50,
    gcode_preview: "",
    machine_envelope_check: {
      max_x_mm: 50, max_z_mm: 100, min_x_mm: 0, min_z_mm: 0, within_envelope: true,
    },
    warnings: [],
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------

describe("SpindleTorqueGateEngine", () => {
  describe("Singleton + schemas", () => {
    it("exports a singleton that is an instance of the class", () => {
      expect(spindleTorqueGateEngine).toBeInstanceOf(SpindleTorqueGateEngine);
    });

    it("MachineSpindleSpecSchema rejects non-positive power", () => {
      const r = MachineSpindleSpecSchema.safeParse({ max_power_kW: 0, max_torque_Nm: 10, max_rpm: 100 });
      expect(r.success).toBe(false);
    });

    it("result conforms to exported schema", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp()]),
        machine: OKUMA_LB3000,
      });
      const parsed = SpindleTorqueGateResultSchema.safeParse(res);
      expect(parsed.success).toBe(true);
    });
  });

  describe("Torque curve physics", () => {
    it("derives base_rpm from P_max / T_max when not supplied (Okuma LB3000: 9549×15/173 ≈ 828)", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp()]),
        machine: OKUMA_LB3000,
      });
      expect(res.machine.derived_base_rpm).toBeCloseTo((9549 * 15) / 173, 1);
    });

    it("uses supplied base_rpm when provided", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp()]),
        machine: { ...OKUMA_LB3000, base_rpm: 1000 },
      });
      expect(res.machine.derived_base_rpm).toBe(1000);
    });

    it("below base_rpm, available_torque equals T_max (constant-torque region)", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 400, cutting_force_n: 100, cutting_speed_m_min: 60 })]),
        machine: OKUMA_LB3000,
      });
      // At rpm=400 < base_rpm ≈ 828, T_avail = min(173, 9549×15/400) = min(173, 358) = 173
      expect(res.per_operation[0].available_torque_Nm).toBe(OKUMA_LB3000.max_torque_Nm);
    });

    it("above base_rpm, available_torque follows constant-power curve", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 3000, cutting_force_n: 100, cutting_speed_m_min: 120 })]),
        machine: OKUMA_LB3000,
      });
      // At rpm=3000 > base_rpm ≈ 828, T_avail = min(173, 9549×15/3000) = min(173, 47.7) = 47.7
      expect(res.per_operation[0].available_torque_Nm).toBeCloseTo((9549 * 15) / 3000, 2);
    });

    it("required_torque matches 9549 × P_cut / rpm", () => {
      // Fc=500 N, Vc=200 m/min → P = 500×200/60000 ≈ 1.667 kW
      // rpm=1800 → T_req = 9549×1.667/1800 ≈ 8.84 Nm
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 1800, cutting_force_n: 500, cutting_speed_m_min: 200 })]),
        machine: OKUMA_LB3000,
      });
      expect(res.per_operation[0].required_power_kW).toBeCloseTo((500 * 200) / 60000, 3);
      expect(res.per_operation[0].required_torque_Nm).toBeCloseTo(
        (9549 * ((500 * 200) / 60000)) / 1800,
        2,
      );
    });
  });

  describe("Gate decisions (SAFE / WARNING / BLOCKED)", () => {
    it("SAFE when utilisation below safe_threshold for all ops", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([
          makeOp({ op_number: 1, spindle_rpm: 1800, cutting_force_n: 300, cutting_speed_m_min: 180 }),
          makeOp({ op_number: 2, spindle_rpm: 2000, cutting_force_n: 250, cutting_speed_m_min: 160 }),
        ]),
        machine: OKUMA_LB3000,
      });
      expect(res.overall.status).toBe("SAFE");
      expect(res.overall.gate_block).toBe(false);
      expect(res.per_operation.every((o) => o.safe)).toBe(true);
    });

    it("WARNING when any op in [safe%, 100%] utilisation band", () => {
      // Small spindle + heavy cut to push into warning band
      // At rpm=3000, T_avail = min(60, 9549×7.5/3000) = min(60, 23.87) = 23.87 Nm
      // Target 90% utilisation = 21.48 Nm → P_req = 21.48 × 3000 / 9549 = 6.75 kW
      // With Vc=200, Fc = 6.75 × 60000 / 200 = 2025 N
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 3000, cutting_force_n: 2025, cutting_speed_m_min: 200 })]),
        machine: SMALL_SPINDLE,
        safe_utilisation_pct: 85,
      });
      expect(res.overall.status).toBe("WARNING");
      expect(res.overall.gate_block).toBe(false);
      expect(res.per_operation[0].severity).toBe("warning");
      expect(res.per_operation[0].utilisation_pct).toBeGreaterThan(85);
      expect(res.per_operation[0].utilisation_pct).toBeLessThanOrEqual(100);
    });

    it("BLOCKED when any op utilisation > 100%", () => {
      // Same small spindle, push to 150% utilisation
      // Target 150% of 23.87 = 35.81 Nm at 3000 rpm → P = 35.81×3000/9549 = 11.25 kW
      // Vc=200 → Fc = 11.25 × 60000/200 = 3375 N
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 3000, cutting_force_n: 3375, cutting_speed_m_min: 200 })]),
        machine: SMALL_SPINDLE,
      });
      expect(res.overall.status).toBe("BLOCKED");
      expect(res.overall.gate_block).toBe(true);
      expect(res.overall.any_torque_failure).toBe(true);
      expect(res.per_operation[0].severity).toBe("block");
      expect(res.per_operation[0].utilisation_pct).toBeGreaterThan(100);
      expect(res.overall.worst_case_op_number).toBe(1);
    });

    it("worst_utilisation_pct tracks the max across all ops", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([
          makeOp({ op_number: 1, spindle_rpm: 1800, cutting_force_n: 300, cutting_speed_m_min: 180 }),
          makeOp({ op_number: 2, spindle_rpm: 3000, cutting_force_n: 3375, cutting_speed_m_min: 200 }), // blocked
          makeOp({ op_number: 3, spindle_rpm: 2000, cutting_force_n: 250, cutting_speed_m_min: 160 }),
        ]),
        machine: SMALL_SPINDLE,
      });
      expect(res.overall.worst_case_op_number).toBe(2);
      expect(res.overall.worst_utilisation_pct).toBeGreaterThan(100);
    });
  });

  describe("Adversarial inputs — BLOCKED with specific reason", () => {
    it("rpm = 0 → BLOCKED with 'undefined torque' reason", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 0 })]),
        machine: OKUMA_LB3000,
      });
      expect(res.overall.status).toBe("BLOCKED");
      const op = res.per_operation[0];
      expect(op.severity).toBe("block");
      expect(op.reason).toContain("≤ 0");
      expect(op.reason).toContain("undefined torque");
    });

    it("rpm > machine.max_rpm → BLOCKED with over-max reason", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 7000 })]),
        machine: OKUMA_LB3000, // max_rpm=4500
      });
      expect(res.overall.status).toBe("BLOCKED");
      expect(res.overall.any_rpm_over_max).toBe(true);
      const op = res.per_operation[0];
      expect(op.severity).toBe("block");
      expect(op.reason).toContain("exceeds spindle max_rpm 4500");
    });

    it("NaN in cutting_force_n → BLOCKED with non-finite reason", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ cutting_force_n: NaN })]),
        machine: OKUMA_LB3000,
      });
      expect(res.overall.status).toBe("BLOCKED");
      expect(res.overall.any_nan_input).toBe(true);
      const op = res.per_operation[0];
      expect(op.severity).toBe("block");
      expect(op.reason).toContain("non-finite input");
    });

    it("Infinity in spindle_rpm → BLOCKED", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: Infinity })]),
        machine: OKUMA_LB3000,
      });
      expect(res.overall.status).toBe("BLOCKED");
      expect(res.overall.any_nan_input).toBe(true);
      expect(res.per_operation[0].severity).toBe("block");
    });

    it("throws on program with no operations field", () => {
      expect(() => {
        spindleTorqueGateEngine.gate({
          program: { program_id: "x" } as unknown as ToolpathProgram,
          machine: OKUMA_LB3000,
        });
      }).toThrow(/missing operations/);
    });
  });

  describe("gateOrThrow", () => {
    it("returns result on SAFE", () => {
      const res = spindleTorqueGateEngine.gateOrThrow({
        program: makeProgram([makeOp({ spindle_rpm: 1800, cutting_force_n: 300, cutting_speed_m_min: 180 })]),
        machine: OKUMA_LB3000,
      });
      expect(res.overall.status).toBe("SAFE");
    });

    it("returns result on WARNING (does not throw)", () => {
      const res = spindleTorqueGateEngine.gateOrThrow({
        program: makeProgram([makeOp({ spindle_rpm: 3000, cutting_force_n: 2025, cutting_speed_m_min: 200 })]),
        machine: SMALL_SPINDLE,
      });
      expect(res.overall.status).toBe("WARNING");
    });

    it("throws SpindleTorqueBlockError on BLOCKED with full result attached", () => {
      let caught: unknown = null;
      try {
        spindleTorqueGateEngine.gateOrThrow({
          program: makeProgram([makeOp({ spindle_rpm: 3000, cutting_force_n: 3375, cutting_speed_m_min: 200 })]),
          machine: SMALL_SPINDLE,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(SpindleTorqueBlockError);
      const err = caught as SpindleTorqueBlockError;
      expect(err.code).toBe("SPINDLE_TORQUE_BLOCKED");
      expect(err.name).toBe("SpindleTorqueBlockError");
      expect(err.message).toContain("SPINDLE_TORQUE_BLOCKED");
      expect(err.message).toContain("allow_torque_override=true");
      expect(err.result.overall.gate_block).toBe(true);
      expect(err.result.per_operation[0].severity).toBe("block");
    });
  });

  describe("Recommendations", () => {
    it("produces a happy-path summary when nothing blocked or warned", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 1800, cutting_force_n: 300, cutting_speed_m_min: 180 })]),
        machine: OKUMA_LB3000,
      });
      expect(res.overall.recommendations).toHaveLength(1);
      expect(res.overall.recommendations[0]).toContain("within safe torque band");
    });

    it("produces a BLOCK recommendation with target rpm when blocked on torque", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 3000, cutting_force_n: 3375, cutting_speed_m_min: 200 })]),
        machine: SMALL_SPINDLE,
      });
      const blockRec = res.overall.recommendations.find((r) => r.includes("BLOCK"));
      expect(typeof blockRec).toBe("string");
      expect(blockRec!).toContain("util");
      expect(blockRec!).toContain("Lower rpm toward");
    });

    it("produces a WARNING recommendation when in the headroom band", () => {
      const res = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 3000, cutting_force_n: 2025, cutting_speed_m_min: 200 })]),
        machine: SMALL_SPINDLE,
      });
      const warnRec = res.overall.recommendations.find((r) => r.includes("WARNING"));
      expect(typeof warnRec).toBe("string");
      expect(warnRec!).toContain("headroom band");
    });
  });

  describe("Custom safe_utilisation_pct", () => {
    it("safe_utilisation_pct=95 shifts a previously-warning op into SAFE", () => {
      const resStrict = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 3000, cutting_force_n: 2025, cutting_speed_m_min: 200 })]),
        machine: SMALL_SPINDLE,
        safe_utilisation_pct: 85,
      });
      expect(resStrict.overall.status).toBe("WARNING");

      const resLoose = spindleTorqueGateEngine.gate({
        program: makeProgram([makeOp({ spindle_rpm: 3000, cutting_force_n: 2025, cutting_speed_m_min: 200 })]),
        machine: SMALL_SPINDLE,
        safe_utilisation_pct: 95,
      });
      expect(resLoose.overall.status).toBe("SAFE");
    });
  });

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains lathe_spindle_torque_gate", () => {
      expect(camActions).toContain("lathe_spindle_torque_gate");
    });

    it("ACTIONS contains lathe_spindle_torque_gate_or_throw", () => {
      expect(camActions).toContain("lathe_spindle_torque_gate_or_throw");
    });
  });
});
