import { describe, it, expect } from "vitest";
import type { SpindleTorqueGateResult } from "../engines/SpindleTorqueGateEngine.js";
import { spindleTorqueGateEngine } from "../engines/SpindleTorqueGateEngine.js";
import { evaluateSpindleTorqueAdequacyGate } from "../tools/dispatchers/safetyDispatcher.js";
import { ACTION_SAFETY_SCHEMAS } from "../schemas/safetyActionSchemas.js";

/**
 * MS-CRITWIRE/U-CW-05 wiring verification (oscar iter27, 2026-05-24).
 *
 * Wires SpindleTorqueGateEngine.gate() onto prism_safety as
 * spindle_torque_adequacy_gate. STRICT policy: only overall.status === "SAFE"
 * passes. WARNING utilisation band (≥safe_threshold) maps to safe=false at
 * this surface — the cam-side (lathe_spindle_torque_gate*) carries the full
 * structured result for callers who can tolerate the warning band.
 */

function mkSafeResult(overrides: Partial<SpindleTorqueGateResult["overall"]> = {}): SpindleTorqueGateResult {
  return {
    program_id: "p1",
    machine: {
      max_power_kW: 22,
      max_torque_Nm: 350,
      base_rpm: 600,
      max_rpm: 6000,
      derived_base_rpm: 600,
      safe_utilisation_pct: 85,
    },
    per_operation: [],
    overall: {
      status: "SAFE",
      gate_block: false,
      any_torque_failure: false,
      any_rpm_over_max: false,
      any_nan_input: false,
      worst_case_op_number: 1,
      worst_utilisation_pct: 60,
      recommendations: ["all ops within safe envelope"],
      ...overrides,
    },
    evaluated_at: "2026-05-24T00:00:00Z",
  };
}

describe("MS-CRITWIRE/U-CW-05 — spindle_torque_adequacy_gate on prism_safety", () => {
  describe("evaluateSpindleTorqueAdequacyGate() — strict verdict policy", () => {
    it("safe verdict — overall.status === SAFE passes", () => {
      const v = evaluateSpindleTorqueAdequacyGate(mkSafeResult());
      expect(v.safe).toBe(true);
      expect(v.overall_status).toBe("SAFE");
      expect(v.reason).toContain("spindle torque adequate");
      expect(v.reason).toContain("worst 60.0%");
      expect(v.reason).toContain("op#1");
    });

    it("STRICT — overall.status === WARNING maps to safe=false (the safety surface refuses the band)", () => {
      const v = evaluateSpindleTorqueAdequacyGate(mkSafeResult({
        status: "WARNING",
        worst_utilisation_pct: 92,
        worst_case_op_number: 3,
      }));
      expect(v.safe).toBe(false);
      expect(v.overall_status).toBe("WARNING");
      expect(v.reason).toContain("WARNING");
      expect(v.reason).toContain("op#3");
      expect(v.reason).toContain("92.0%");
      expect(v.reason).toContain("85%");
      expect(v.reason).toContain("Sandvik §3.4");
    });

    it("BLOCKED — torque > 100% utilisation fails LOUD with structured cause", () => {
      const v = evaluateSpindleTorqueAdequacyGate(mkSafeResult({
        status: "BLOCKED",
        gate_block: true,
        any_torque_failure: true,
        worst_utilisation_pct: 145,
        worst_case_op_number: 7,
      }));
      expect(v.safe).toBe(false);
      expect(v.overall_status).toBe("BLOCKED");
      expect(v.reason).toContain("BLOCKED");
      expect(v.reason).toContain("torque-utilisation >100%");
      expect(v.reason).toContain("op#7");
      expect(v.reason).toContain("145.0%");
    });

    it("BLOCKED — rpm > max_rpm fails LOUD with named cause", () => {
      const v = evaluateSpindleTorqueAdequacyGate(mkSafeResult({
        status: "BLOCKED",
        gate_block: true,
        any_rpm_over_max: true,
        worst_utilisation_pct: 50,
        worst_case_op_number: 2,
      }));
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("rpm > machine max");
    });

    it("BLOCKED — NaN/Infinity in op inputs fails LOUD with named cause", () => {
      const v = evaluateSpindleTorqueAdequacyGate(mkSafeResult({
        status: "BLOCKED",
        gate_block: true,
        any_nan_input: true,
        worst_utilisation_pct: 0,
        worst_case_op_number: null,
      }));
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("NaN/Infinity in op inputs");
      expect(v.worst_case_op_number).toBeNull();
    });

    it("BLOCKED — multiple simultaneous causes (torque + rpm) listed together", () => {
      const v = evaluateSpindleTorqueAdequacyGate(mkSafeResult({
        status: "BLOCKED",
        gate_block: true,
        any_torque_failure: true,
        any_rpm_over_max: true,
        worst_utilisation_pct: 130,
        worst_case_op_number: 4,
      }));
      expect(v.safe).toBe(false);
      expect(v.reason).toContain("torque-utilisation >100%");
      expect(v.reason).toContain("rpm > machine max");
    });

    it("output shape — envelope carries every overall field for operator triage", () => {
      const v = evaluateSpindleTorqueAdequacyGate(mkSafeResult({
        status: "WARNING",
        worst_utilisation_pct: 88,
        worst_case_op_number: 5,
        any_torque_failure: false,
        any_rpm_over_max: false,
        any_nan_input: false,
        recommendations: ["reduce feed on op#5", "consider lighter cut"],
      }));
      expect(v.worst_utilisation_pct).toBe(88);
      expect(v.worst_case_op_number).toBe(5);
      expect(v.any_torque_failure).toBe(false);
      expect(v.any_rpm_over_max).toBe(false);
      expect(v.any_nan_input).toBe(false);
      expect(v.recommendations).toEqual(["reduce feed on op#5", "consider lighter cut"]);
    });

    it("recommendations propagate from engine to envelope", () => {
      const v = evaluateSpindleTorqueAdequacyGate(mkSafeResult({
        recommendations: ["A", "B", "C"],
      }));
      expect(v.recommendations).toEqual(["A", "B", "C"]);
    });
  });

  describe("Engine integration — gate() output feeds the safety verdict end-to-end", () => {
    it("realistic safe case — modest cuts on a 22kW VMC produce SAFE verdict", () => {
      const gateResult = spindleTorqueGateEngine.gate({
        program: {
          program_id: "test-program-safe",
          operations: [
            { op_number: 1, spindle_rpm: 1500, cutting_force_n: 200, cutting_speed_m_min: 150, axial_depth_mm: 1, feed_per_rev_mm: 0.1 },
            { op_number: 2, spindle_rpm: 2000, cutting_force_n: 180, cutting_speed_m_min: 180, axial_depth_mm: 0.8, feed_per_rev_mm: 0.08 },
          ],
        } as any,
        machine: { max_power_kW: 22, max_torque_Nm: 350, max_rpm: 6000 },
      });
      const v = evaluateSpindleTorqueAdequacyGate(gateResult);
      expect(v.safe).toBe(true);
      expect(v.overall_status).toBe("SAFE");
    });

    it("realistic block case — rpm exceeds machine max → BLOCKED", () => {
      const gateResult = spindleTorqueGateEngine.gate({
        program: {
          program_id: "test-program-overspeed",
          operations: [
            { op_number: 1, spindle_rpm: 10000, cutting_force_n: 200, cutting_speed_m_min: 150, axial_depth_mm: 1, feed_per_rev_mm: 0.1 },
          ],
        } as any,
        machine: { max_power_kW: 22, max_torque_Nm: 350, max_rpm: 6000 },
      });
      const v = evaluateSpindleTorqueAdequacyGate(gateResult);
      expect(v.safe).toBe(false);
      expect(v.overall_status).toBe("BLOCKED");
      expect(v.any_rpm_over_max).toBe(true);
    });
  });

  describe("Wiring contract — safetyDispatcher source + schema map + ALL_ACTIONS enum", () => {
    it("dispatcher source contains SPINDLE_TORQUE_ADEQUACY_ACTIONS + action + engine import + spread + exported pure function", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const here = path.dirname(fileURLToPath(import.meta.url));
      const src = fs.readFileSync(path.resolve(here, "../tools/dispatchers/safetyDispatcher.ts"), "utf8");
      expect(src).toContain("SPINDLE_TORQUE_ADEQUACY_ACTIONS");
      expect(src).toContain('"spindle_torque_adequacy_gate"');
      expect(src).toContain("SpindleTorqueGateEngine.js");
      expect(src).toContain("spindleTorqueGateEngine.gate");
      expect(src).toContain("...SPINDLE_TORQUE_ADEQUACY_ACTIONS");
      expect(src).toContain("export function evaluateSpindleTorqueAdequacyGate");
    });

    it("schema map exposes spindle_torque_adequacy_gate and accepts a known-good payload", () => {
      const schema = ACTION_SAFETY_SCHEMAS.spindle_torque_adequacy_gate;
      expect(typeof schema?.safeParse).toBe("function");
      const good = {
        program: {
          program_id: "p1",
          operations: [
            { op_number: 1, spindle_rpm: 1500, cutting_force_n: 200, cutting_speed_m_min: 150 },
          ],
        },
        machine: { max_power_kW: 22, max_torque_Nm: 350, max_rpm: 6000 },
      };
      const r = schema!.safeParse(good);
      expect(r.success).toBe(true);
    });

    it("schema map — missing machine.max_torque_Nm → safeParse failure (REQUIRED)", () => {
      const bad = {
        program: { program_id: "p1", operations: [{ op_number: 1, spindle_rpm: 1500, cutting_force_n: 200, cutting_speed_m_min: 150 }] },
        machine: { max_power_kW: 22, max_rpm: 6000 },
      };
      const r = ACTION_SAFETY_SCHEMAS.spindle_torque_adequacy_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("schema map — empty operations array → safeParse failure (min(1))", () => {
      const bad = {
        program: { program_id: "p1", operations: [] },
        machine: { max_power_kW: 22, max_torque_Nm: 350, max_rpm: 6000 },
      };
      const r = ACTION_SAFETY_SCHEMAS.spindle_torque_adequacy_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("schema map — safe_utilisation_pct > 100 rejected (physical bound)", () => {
      const bad = {
        program: { program_id: "p1", operations: [{ op_number: 1, spindle_rpm: 1500, cutting_force_n: 200, cutting_speed_m_min: 150 }] },
        machine: { max_power_kW: 22, max_torque_Nm: 350, max_rpm: 6000 },
        safe_utilisation_pct: 110,
      };
      const r = ACTION_SAFETY_SCHEMAS.spindle_torque_adequacy_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });

    it("schema map — Infinity max_power_kW rejected (.finite() guard)", () => {
      const bad = {
        program: { program_id: "p1", operations: [{ op_number: 1, spindle_rpm: 1500, cutting_force_n: 200, cutting_speed_m_min: 150 }] },
        machine: { max_power_kW: Number.POSITIVE_INFINITY, max_torque_Nm: 350, max_rpm: 6000 },
      };
      const r = ACTION_SAFETY_SCHEMAS.spindle_torque_adequacy_gate!.safeParse(bad);
      expect(r.success).toBe(false);
    });
  });
});
