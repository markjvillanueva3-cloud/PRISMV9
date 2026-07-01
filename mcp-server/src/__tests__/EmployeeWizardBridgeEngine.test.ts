/**
 * EmployeeWizardBridgeEngine.test.ts — HOTEL/U-EMP-WIZARD-BRIDGE (iter8)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  employeeWizardBridgeEngine,
  type MillingWizardInput,
  type LatheWizardInput,
  type WireEDMWizardInput,
  type WizardCommonInput,
} from "../engines/EmployeeWizardBridgeEngine.js";
import { employeePerMachineSFAdaptiveEngine } from "../engines/EmployeePerMachineSFAdaptiveEngine.js";

const COMMON: WizardCommonInput = {
  machine_serial: "VMC-001-SN-A001",
  material: "AL6061-T6",
  tool_type: "endmill_4fl_carbide_0.25in",
  employee_id: "EMP-MV",
  part_id: "P-100",
  bootstrap: { rpm: 8000, feed_in_min: 60, doc_mm: 2, woc_mm: 4 },
};

describe("EmployeeWizardBridgeEngine", () => {
  beforeEach(() => employeePerMachineSFAdaptiveEngine.reset());

  describe("recommendSpeedFeed", () => {
    it("returns adapted_sf + strategy + safety_gates + next_step", () => {
      const r = employeeWizardBridgeEngine.recommendSpeedFeed(COMMON);
      expect(r.domain).toBe("speed_feed");
      expect(r.adapted_sf.rpm).toBe(8000);
      expect(r.adapted_sf.feed_in_min).toBe(60);
      expect(r.adapted_sf.confidence_band).toBe("low"); // 0 observations
      expect(r.strategy.length).toBeGreaterThan(0);
      expect(r.safety_gates.length).toBeGreaterThan(0);
    });

    it("confidence_band escalates with observations", () => {
      // Seed 12 observations → high band
      for (let i = 0; i < 12; i++) {
        employeePerMachineSFAdaptiveEngine.recordOutcome({
          machine_serial: COMMON.machine_serial,
          material: COMMON.material,
          tool_type: COMMON.tool_type,
          rpm_used: 8000,
          feed_in_min_used: 60,
          doc_mm_used: 2,
          woc_mm_used: 4,
          verdict: "good",
          employee_id: "E",
          job_id: `J-${i}`,
          recorded_at: new Date().toISOString(),
        });
      }
      const r = employeeWizardBridgeEngine.recommendSpeedFeed(COMMON);
      expect(r.adapted_sf.n_observations).toBe(12);
      expect(r.adapted_sf.confidence_band).toBe("high");
    });
  });

  describe("recommendMilling", () => {
    const millInput: MillingWizardInput = { ...COMMON, operation: "rough" };

    it("returns HEM strategy for roughing", () => {
      const r = employeeWizardBridgeEngine.recommendMilling(millInput);
      expect(r.domain).toBe("milling");
      expect(r.strategy.some((s) => /HEM|radial engagement/i.test(s))).toBe(true);
    });

    it("returns trochoidal strategy for slotting", () => {
      const r = employeeWizardBridgeEngine.recommendMilling({ ...millInput, operation: "slot" });
      expect(r.strategy.some((s) => /trochoidal|plunge/i.test(s))).toBe(true);
    });

    it("returns finish-pass strategy", () => {
      const r = employeeWizardBridgeEngine.recommendMilling({ ...millInput, operation: "finish" });
      expect(r.strategy.some((s) => /stepover|finish/i.test(s))).toBe(true);
    });

    it("returns drill-specific strategy", () => {
      const r = employeeWizardBridgeEngine.recommendMilling({ ...millInput, operation: "drill" });
      expect(r.strategy.some((s) => /peck/i.test(s))).toBe(true);
    });

    it("R12 throws on missing operation", () => {
      const bad: any = { ...COMMON };
      expect(() => employeeWizardBridgeEngine.recommendMilling(bad)).toThrow(/operation required/);
    });
  });

  describe("recommendLathe", () => {
    const latheInput: LatheWizardInput = { ...COMMON, operation: "rough_turn" };

    it("returns CSS strategy for rough turning", () => {
      const r = employeeWizardBridgeEngine.recommendLathe(latheInput);
      expect(r.domain).toBe("lathe");
      expect(r.strategy.some((s) => /CSS|constant surface|G96/i.test(s))).toBe(true);
    });

    it("returns wiper-insert strategy for finish turning", () => {
      const r = employeeWizardBridgeEngine.recommendLathe({ ...latheInput, operation: "finish_turn" });
      expect(r.strategy.some((s) => /wiper|nose-radius/i.test(s))).toBe(true);
    });

    it("returns groove/part-off plunge strategy", () => {
      const r = employeeWizardBridgeEngine.recommendLathe({ ...latheInput, operation: "part_off" });
      expect(r.strategy.some((s) => /plunge|center-line/i.test(s))).toBe(true);
    });

    it("returns bore L/D strategy", () => {
      const r = employeeWizardBridgeEngine.recommendLathe({ ...latheInput, operation: "bore" });
      expect(r.strategy.some((s) => /L\/D/i.test(s))).toBe(true);
    });

    it("safety_gates include chuck force + part-catcher hints", () => {
      const r = employeeWizardBridgeEngine.recommendLathe(latheInput);
      expect(r.safety_gates.some((s) => /chuck/i.test(s))).toBe(true);
    });
  });

  describe("recommendWireEDM", () => {
    const edmInput: WireEDMWizardInput = {
      ...COMMON,
      tool_type: "brass_wire_0.010in",
      thickness_mm: 25,
      cut_count: 2,
    };

    it("returns thickness-driven strategy", () => {
      const r = employeeWizardBridgeEngine.recommendWireEDM(edmInput);
      expect(r.domain).toBe("wire_edm");
      expect(r.strategy.some((s) => /thickness/i.test(s))).toBe(true);
    });

    it("warns when required Ra below 0.8 with cut_count < 3", () => {
      const r = employeeWizardBridgeEngine.recommendWireEDM({ ...edmInput, required_ra_um: 0.4, cut_count: 2 });
      expect(r.strategy.some((s) => /Ra.*requires.*cut/i.test(s))).toBe(true);
    });

    it("single-cut strategy notes Ra ~3.2μm typical", () => {
      const r = employeeWizardBridgeEngine.recommendWireEDM({ ...edmInput, cut_count: 1 });
      expect(r.strategy.some((s) => /Single rough|3\.2/i.test(s))).toBe(true);
    });

    it("R12 throws on non-positive thickness", () => {
      expect(() =>
        employeeWizardBridgeEngine.recommendWireEDM({ ...edmInput, thickness_mm: 0 }),
      ).toThrow(/thickness_mm must be positive finite/);
    });

    it("safety_gates include dielectric + wire-break", () => {
      const r = employeeWizardBridgeEngine.recommendWireEDM(edmInput);
      expect(r.safety_gates.some((s) => /[Dd]ielectric/.test(s))).toBe(true);
      expect(r.safety_gates.some((s) => /[Ww]ire-break/.test(s))).toBe(true);
    });
  });

  describe("Common input validation (R12)", () => {
    it("throws on missing machine_serial", () => {
      expect(() =>
        employeeWizardBridgeEngine.recommendSpeedFeed({ ...COMMON, machine_serial: "" }),
      ).toThrow(/machine_serial.*material.*tool_type/);
    });

    it("throws on missing employee_id", () => {
      expect(() =>
        employeeWizardBridgeEngine.recommendSpeedFeed({ ...COMMON, employee_id: "" }),
      ).toThrow(/employee_id \+ part_id/);
    });

    it("throws on missing part_id", () => {
      expect(() =>
        employeeWizardBridgeEngine.recommendSpeedFeed({ ...COMMON, part_id: "" }),
      ).toThrow(/employee_id \+ part_id/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("all returns are frozen", () => {
      const r = employeeWizardBridgeEngine.recommendSpeedFeed(COMMON);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.adapted_sf)).toBe(true);
      expect(Object.isFrozen(r.strategy)).toBe(true);
      expect(Object.isFrozen(r.safety_gates)).toBe(true);
    });

    it("source pins v1 implementation", () => {
      const r = employeeWizardBridgeEngine.recommendMilling({ ...COMMON, operation: "rough" });
      expect(r.source).toBe("EmployeeWizardBridgeEngine.v1");
    });

    it("speed_feed wizard surfaces zero-obs hint for first job", () => {
      const r = employeeWizardBridgeEngine.recommendSpeedFeed(COMMON);
      expect(r.strategy.some((s) => /First job|calculator default/i.test(s))).toBe(true);
    });

    it("speed_feed wizard surfaces n-observation count once prior is populated", () => {
      for (let i = 0; i < 5; i++) {
        employeePerMachineSFAdaptiveEngine.recordOutcome({
          machine_serial: COMMON.machine_serial,
          material: COMMON.material,
          tool_type: COMMON.tool_type,
          rpm_used: 8200,
          feed_in_min_used: 62,
          doc_mm_used: 2,
          woc_mm_used: 4,
          verdict: "good",
          employee_id: "E",
          job_id: `J-${i}`,
          recorded_at: new Date().toISOString(),
        });
      }
      const r = employeeWizardBridgeEngine.recommendSpeedFeed(COMMON);
      expect(r.strategy.some((s) => /5 prior outcomes/i.test(s))).toBe(true);
    });
  });
});
