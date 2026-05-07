/**
 * E2E test for ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH4 — 6 unwired learning /
 * drift / dialect / failsafe / diagnosis / fixture WEDM engines.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { wedmContinuousLearningEngine } from "../engines/WEDMContinuousLearningEngine.js";
import { wedmControllerDialectVerifierEngine } from "../engines/WEDMControllerDialectVerifierEngine.js";
import { wedmDriftDetectionEngine } from "../engines/WEDMDriftDetectionEngine.js";
import { wedmFailsafeEngine } from "../engines/WEDMFailsafeEngine.js";
import { wedmFaultDiagnosisEngine } from "../engines/WEDMFaultDiagnosisEngine.js";
import { wedmFixtureInterferenceEngine } from "../engines/WEDMFixtureInterferenceEngine.js";

const NEW_ACTIONS = [
  "wedm_learning_snapshot",
  "wedm_dialect_verify",
  "wedm_drift_detect",
  "wedm_failsafe_from_clearance",
  "wedm_fault_diagnose",
  "wedm_fixture_interference",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-WEDM-BATCH4 — engines verified directly", () => {
  describe("WEDMContinuousLearningEngine.snapshot", () => {
    it("returns a snapshot for a fresh material with non-negative integer samples and null weibull", () => {
      const s = wedmContinuousLearningEngine.snapshot(`unit-test-${Date.now()}`);
      expect(s.material).toMatch(/unit-test-/);
      expect(Number.isInteger(s.calibration.samples)).toBe(true);
      expect(s.calibration.samples).toBeGreaterThanOrEqual(0);
      expect(s.weibull).toBeNull();
      expect(typeof s.preferences).toBe("object");
      expect(Number.isFinite(s.calibration.k_ra)).toBe(true);
      expect(Number.isFinite(s.calibration.eta_mrr)).toBe(true);
    });

    it("snapshot for the same material returns consistent material key", () => {
      const matName = `consistency-test-${Date.now()}`;
      const a = wedmContinuousLearningEngine.snapshot(matName);
      const b = wedmContinuousLearningEngine.snapshot(matName);
      expect(a.material).toBe(b.material);
    });
  });

  describe("WEDMControllerDialectVerifierEngine.verify", () => {
    it("Mitsubishi-style program with E-codes returns expected_requested='mitsubishi_fa'", () => {
      const mitsuProgram = `%
G92 X0 Y0
M73 (start cut)
E001
M50 H001
G01 X100 Y0
M02
%`;
      const r = wedmControllerDialectVerifierEngine.verify({
        program_text: mitsuProgram,
        expected_controller: "mitsubishi_fa",
      });
      expect(typeof r.success).toBe("boolean");
      expect(typeof r.pass).toBe("boolean");
      expect(Array.isArray(r.ranking)).toBe(true);
      expect(r.expected_requested).toBe("mitsubishi_fa");
    });

    it("verify on a controller-agnostic program emits a verdict without throwing", () => {
      const r = wedmControllerDialectVerifierEngine.verify({
        program_text: "G01 X10 Y10\nG01 X20 Y20\nM30",
        expected_controller: "mitsubishi_fa",
      });
      expect([true, false]).toContain(r.pass);
      expect(typeof r.hard_block).toBe("boolean");
    });
  });

  describe("WEDMDriftDetectionEngine.detect", () => {
    it("identical baseline and current windows return drifted=false (psi<0.1)", () => {
      const values = Array.from({ length: 30 }, (_, i) => 1.5 + 0.1 * Math.sin(i));
      const r = wedmDriftDetectionEngine.detect({
        modelId: "wedm-test-v1",
        baseline: { label: "baseline", values: [...values] },
        current: { label: "current", values: [...values] },
      });
      expect(r.modelId).toBe("wedm-test-v1");
      expect(r.drifted).toBe(false);
      expect(r.psi).toBeLessThan(0.1);
    });

    it("dramatically shifted current window flips drifted=true with elevated PSI", () => {
      const baseline = Array.from({ length: 30 }, () => 1.5);
      const shifted = Array.from({ length: 30 }, () => 5.0);
      const r = wedmDriftDetectionEngine.detect({
        modelId: "wedm-shift-test",
        baseline: { label: "baseline", values: baseline },
        current: { label: "current", values: shifted },
      });
      expect(r.drifted).toBe(true);
      expect(r.psi).toBeGreaterThan(0.1);
    });
  });

  describe("WEDMFailsafeEngine.planFromClearance", () => {
    it("clearance report with critical event yields tier='hard' + degradeTo=0", () => {
      const plan = wedmFailsafeEngine.planFromClearance({
        pose: { x_mm: 0, y_mm: 0, z_mm: 0, u_mm: 0, v_mm: 0 } as never,
        pass: false,
        minClearance_mm: -2.0,
        events: [
          { kind: "guide_collision", severity: "critical", clearance_mm: -2.0 } as never,
        ],
      });
      expect(plan.tier).toBe("hard");
      expect(plan.degradeTo).toBe(0);
      expect(plan.escalate).toBe(true);
      expect(Array.isArray(plan.steps)).toBe(true);
      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it("clearance report with no critical events yields tier='retract' + degradeTo=1", () => {
      const plan = wedmFailsafeEngine.planFromClearance({
        pose: { x_mm: 0, y_mm: 0, z_mm: 0, u_mm: 0, v_mm: 0 } as never,
        pass: true,
        minClearance_mm: 1.5,
        events: [
          { kind: "near_miss", severity: "warn", clearance_mm: 1.5 } as never,
        ],
      });
      expect(plan.tier).toBe("retract");
      expect(plan.degradeTo).toBe(1);
    });
  });

  describe("WEDMFaultDiagnosisEngine.diagnose", () => {
    it("returns top_candidate=null when symptoms are unrecognized variables", () => {
      const r = wedmFaultDiagnosisEngine.diagnose({
        symptoms: [{ variable: "totally_bogus_unknown_var_xyz", direction: "up" }],
      });
      expect(r.top_candidate).toBeNull();
      expect(Array.isArray(r.candidates)).toBe(true);
    });

    it("returns candidates and notes arrays for valid symptom inputs", () => {
      const r = wedmFaultDiagnosisEngine.diagnose({
        symptoms: [
          { variable: "ra_um", direction: "up", severity: "high" } as never,
          { variable: "wire_break_rate", direction: "up" } as never,
        ],
        top_n: 3,
      });
      expect(Array.isArray(r.candidates)).toBe(true);
      expect(r.candidates.length).toBeLessThanOrEqual(3);
      expect(Array.isArray(r.notes)).toBe(true);
    });
  });

  describe("WEDMFixtureInterferenceEngine.analyze", () => {
    it("returns accessibility_score in [0,1] for a workpiece with one clear profile", () => {
      const r = wedmFixtureInterferenceEngine.analyze({
        workpiece: {
          bounds: { min: { x: 0, y: 0 }, max: { x: 100, y: 100 }, width_mm: 100, height_mm: 100 } as never,
          thickness_mm: 25,
          origin: { x: 0, y: 0 },
        },
        clamps: [
          {
            id: "c1",
            type: "step" as never,
            footprint: { min: { x: 0, y: 0 }, max: { x: 5, y: 100 }, width_mm: 5, height_mm: 100 } as never,
            height_mm: 30,
            over_top: false,
          },
        ],
        profiles: [
          {
            name: "p1",
            path: [
              { x: 30, y: 30 },
              { x: 70, y: 30 },
              { x: 70, y: 70 },
              { x: 30, y: 70 },
              { x: 30, y: 30 },
            ],
            is_through: true,
          },
        ],
      });
      expect(r.accessibility_score).toBeGreaterThanOrEqual(0);
      expect(r.accessibility_score).toBeLessThanOrEqual(1);
      expect(["ok", "underclamped", "overclamped"]).toContain(r.clamp_stability.verdict);
      expect(Array.isArray(r.warnings)).toBe(true);
      expect(Array.isArray(r.recommendations)).toBe(true);
    });
  });
});

describe("U-WIRE-WEDM-BATCH4 — dispatcher wiring verified", () => {
  it("registers all 6 new actions in edmDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "edmDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("registers all 6 schemas in EDM_ACTION_SCHEMAS", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof EDM_ACTION_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
  });

  it("schema rejects wedm_learning_snapshot with empty material", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_learning_snapshot"]!.safeParse({ material: "" });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_dialect_verify with empty program_text", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_dialect_verify"]!.safeParse({
      program_text: "",
      expected_controller: "mitsubishi_fa",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_drift_detect missing modelId", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_drift_detect"]!.safeParse({
      baseline: { label: "b", values: [1, 2, 3] },
      current: { label: "c", values: [1, 2, 3] },
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_fault_diagnose with empty symptoms array", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_fault_diagnose"]!.safeParse({ symptoms: [] });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_fixture_interference with non-positive min_clearance_mm", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_fixture_interference"]!.safeParse({
      workpiece: {},
      clamps: [],
      profiles: [],
      min_clearance_mm: 0,
    });
    expect(r.success).toBe(false);
  });
});
