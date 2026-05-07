/**
 * E2E test for ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH3 — 6 unwired physics/RL/
 * pattern mill engines wired into millDispatcher (prism_mill).
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";
import { millingProgramPatternEngine } from "../engines/MillingProgramPatternEngine.js";
import { millingReinforcementLearningEngine } from "../engines/MillingReinforcementLearningEngine.js";
import { millingHeadIntelligenceEngine } from "../engines/MillingHeadIntelligenceEngine.js";
import { millingMachineIntelligenceEngine } from "../engines/MillingMachineIntelligenceEngine.js";

const NEW_ACTIONS = [
  "mill_physics_force",
  "mill_physics_tool_life",
  "mill_program_pattern_analyze",
  "mill_rl_select_action",
  "mill_head_recommend",
  "mill_machine_intel_get",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-MILL-BATCH3 — engines verified directly", () => {
  describe("MillingPhysicsKernelEngine.calculateMillingForces", () => {
    it("Kienzle force is linear in axial depth ap (Fc proportional to ap)", () => {
      const f1 = millingPhysicsKernelEngine.calculateMillingForces({
        kc1_1: 2100, mc: 0.21, ap: 1.0, fz: 0.1,
      });
      const f2 = millingPhysicsKernelEngine.calculateMillingForces({
        kc1_1: 2100, mc: 0.21, ap: 2.0, fz: 0.1,
      });
      const ratio = f2.tangential_force_N.value / f1.tangential_force_N.value;
      expect(ratio).toBeCloseTo(2.0, 1);
    });

    it("Kienzle force respects fz exponent (Fc ∝ fz^(1-mc))", () => {
      const mc = 0.25;
      const r1 = millingPhysicsKernelEngine.calculateMillingForces({
        kc1_1: 1800, mc, ap: 2.0, fz: 0.1,
      });
      const r2 = millingPhysicsKernelEngine.calculateMillingForces({
        kc1_1: 1800, mc, ap: 2.0, fz: 0.2,
      });
      const ratio = r2.tangential_force_N.value / r1.tangential_force_N.value;
      // fz doubled → Fc multiplied by 2^(1-mc) = 2^0.75 ≈ 1.6818
      expect(ratio).toBeCloseTo(Math.pow(2, 1 - mc), 2);
    });

    it("specific cutting force kc equals Fc / (ap × fz) within float tolerance", () => {
      const ap = 2.0, fz = 0.15;
      const r = millingPhysicsKernelEngine.calculateMillingForces({
        kc1_1: 1800, mc: 0.25, ap, fz, helix_angle_deg: 30, tool_diameter_mm: 12,
      });
      const Fc = r.tangential_force_N.value;
      const kcDerived = r.specific_cutting_force_N_mm2.value;
      expect(kcDerived).toBeCloseTo(Fc / (ap * fz), 3);
    });
  });

  describe("MillingPhysicsKernelEngine.calculateToolLife", () => {
    it("Taylor T(2*Vc) / T(Vc) equals (1/2)^(1/n)", () => {
      const C = 250, n = 0.25, Vc = 100;
      const slow = millingPhysicsKernelEngine.calculateToolLife({ C, n, Vc });
      const fast = millingPhysicsKernelEngine.calculateToolLife({ C, n, Vc: Vc * 2 });
      const slowLife = (slow as { tool_life_min: { value: number } }).tool_life_min.value;
      const fastLife = (fast as { tool_life_min: { value: number } }).tool_life_min.value;
      const ratio = fastLife / slowLife;
      // T = (C/Vc)^(1/n) → doubling Vc gives ratio 0.5^(1/n) = 0.5^4 = 0.0625
      expect(ratio).toBeCloseTo(Math.pow(0.5, 1 / n), 2);
    });
  });

  describe("MillingProgramPatternEngine.analyzeProgram", () => {
    it("counts 2 tools from Mastercam-style tool comments in a 2-tool G-code program", () => {
      const nc = `O1234
(T1|.250 FLAT ENDMILL|H1|D1|TOOL DIA. - .250)
(T2|.500 FACE MILL|H2|D2|TOOL DIA. - .500)
T1 M6
G0 G54 X0 Y0
S5000 M03
G1 Z-2.0 F500
G1 X25 Y0 F1000
G0 Z25
T2 M6
S6000 M03
G1 Z-1.0 F300
G1 X10 Y10 F800
G0 Z25
M30
`;
      const r = millingProgramPatternEngine.analyzeProgram(nc, "test.nc");
      expect(r.statistics.tool_count).toBe(2);
      expect(r.statistics.operation_count).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(r.patterns)).toBe(true);
      expect(Array.isArray(r.recommendations)).toBe(true);
    });

    it("returns zero tools and operations for an M30-only program", () => {
      const r = millingProgramPatternEngine.analyzeProgram("M30\n");
      expect(r.statistics.tool_count).toBe(0);
      expect(r.statistics.operation_count).toBe(0);
    });
  });

  describe("MillingReinforcementLearningEngine.selectAction", () => {
    const SAMPLE_STATE = {
      cutting_speed_mpm: 120,
      feed_per_tooth_mm: 0.1,
      axial_depth_mm: 2.0,
      radial_depth_mm: 5.0,
      tool_wear_vb_mm: 0.1,
      spindle_load_percent: 60,
      vibration_level: 0.3,
      temperature_c: 80,
      surface_roughness_um: 1.6,
      material_hardness_hrc: 30,
    };

    it("returns valid PolicyOutput with deltas in {-1,0,1} and exactly 9 q-values", () => {
      const out = millingReinforcementLearningEngine.selectAction(SAMPLE_STATE, false);
      expect([-1, 0, 1]).toContain(out.action.speed_delta);
      expect([-1, 0, 1]).toContain(out.action.feed_delta);
      expect(out.q_values.length).toBe(9);
      expect(out.confidence).toBeGreaterThanOrEqual(0);
      expect(out.confidence).toBeLessThanOrEqual(1);
      expect(out.exploration).toBe(false);
    });

    it("greedy mode (explore=false) is deterministic for fixed state", () => {
      const a = millingReinforcementLearningEngine.selectAction(SAMPLE_STATE, false);
      const b = millingReinforcementLearningEngine.selectAction(SAMPLE_STATE, false);
      expect(a.action.speed_delta).toBe(b.action.speed_delta);
      expect(a.action.feed_delta).toBe(b.action.feed_delta);
      expect(a.exploration).toBe(false);
      expect(b.exploration).toBe(false);
    });

    it("softmax confidence is finite and within (0,1]", () => {
      const out = millingReinforcementLearningEngine.selectAction(SAMPLE_STATE, false);
      expect(Number.isFinite(out.confidence)).toBe(true);
      expect(out.confidence).toBeGreaterThan(0);
      expect(out.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("MillingHeadIntelligenceEngine.recommendMillingHead", () => {
    type HeadResult =
      | { data: { recommendedHead: string; alternativeHeads: string[] } }
      | { recommendedHead: string; alternativeHeads: string[] };
    const unwrap = (r: HeadResult): { recommendedHead: string; alternativeHeads: string[] } =>
      "data" in r ? r.data : r;

    it("recommends b_axis_continuous for high-power (>15kW) interpolated 5-axis", () => {
      const r = millingHeadIntelligenceEngine.recommendMillingHead(
        [{ type: "5x_finish", angles: [0, 30, 45, 60], powerRequired_kW: 22, interpolation: true }],
        { budget: "high", accuracy_mm: 0.005, production: true },
      );
      const head = unwrap(r as HeadResult).recommendedHead;
      expect(head).toBe("b_axis_continuous");
    });

    it("recommends universal_ac for low-power (<15kW) interpolated 5-axis", () => {
      const r = millingHeadIntelligenceEngine.recommendMillingHead(
        [{ type: "5x_finish", angles: [0, 30, 45], powerRequired_kW: 8, interpolation: true }],
        { budget: "high", accuracy_mm: 0.005, production: true },
      );
      const head = unwrap(r as HeadResult).recommendedHead;
      expect(head).toBe("universal_ac");
    });

    it("recommends orthogonal_fixed for single 90° non-interpolated operation", () => {
      const r = millingHeadIntelligenceEngine.recommendMillingHead(
        [{ type: "drilling", angles: [90], powerRequired_kW: 5, interpolation: false }],
        { budget: "low", accuracy_mm: 0.05, production: false },
      );
      const head = unwrap(r as HeadResult).recommendedHead;
      expect(head).toBe("orthogonal_fixed");
    });
  });

  describe("MillingMachineIntelligenceEngine.getMachine", () => {
    it("returns undefined for an unknown machine id (no throw)", () => {
      const r = millingMachineIntelligenceEngine.getMachine("totally-bogus-machine-xyz-9999");
      expect(r).toBe(undefined);
    });

    it("returns undefined for empty-string id (no throw)", () => {
      const r = millingMachineIntelligenceEngine.getMachine("");
      expect(r).toBe(undefined);
    });
  });
});

describe("U-WIRE-MILL-BATCH3 — dispatcher wiring verified", () => {
  it("registers all 6 new actions in millDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "millDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
    // Each action must appear in BOTH the ACTIONS enum AND a switch case (≥2 occurrences)
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("registers all 6 schemas in MILL_ACTION_SCHEMAS", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof MILL_ACTION_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
  });

  it("schema rejects mill_physics_force with negative ap", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_physics_force"]!.safeParse({
      kc1_1: 2100, mc: 0.21, ap: -1.0, fz: 0.1,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_physics_tool_life with non-positive Vc", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_physics_tool_life"]!.safeParse({
      C: 250, n: 0.25, Vc: 0,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_program_pattern_analyze with empty ncCode", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_program_pattern_analyze"]!.safeParse({
      ncCode: "",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_head_recommend with empty operations array", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_head_recommend"]!.safeParse({
      operations: [],
      constraints: { budget: "high", accuracy_mm: 0.01, production: true },
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_head_recommend with invalid budget enum", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_head_recommend"]!.safeParse({
      operations: [{ type: "drill", angles: [0], powerRequired_kW: 5, interpolation: false }],
      constraints: { budget: "infinite", accuracy_mm: 0.01, production: true },
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects mill_machine_intel_get with empty id", async () => {
    const { MILL_ACTION_SCHEMAS } = await import("../schemas/millActionSchemas.js");
    const r = MILL_ACTION_SCHEMAS["mill_machine_intel_get"]!.safeParse({ id: "" });
    expect(r.success).toBe(false);
  });
});
