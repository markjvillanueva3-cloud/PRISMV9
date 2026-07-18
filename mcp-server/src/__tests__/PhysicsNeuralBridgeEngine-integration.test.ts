/**
 * PhysicsNeuralBridgeEngine — prism_ai dispatcher integration tests
 *
 * Covers the U-NN-WIRE-PNB wiring (MILL-AGI-P0.3) — verifies that
 * `physics_neural_bridge_predict` and `physics_neural_bridge_version`
 * round-trip through prism_ai end-to-end, that the Zod schema rejects
 * malformed input, and that physics invariants (Kienzle force formula,
 * Taylor tool-life invariant, neural-correction bounded band) hold on
 * the physics_prediction leg through the dispatcher.
 *
 * Sister to PhysicsNeuralBridgeEngine.test.ts (engine unit tests).
 *
 * @module __tests__/PhysicsNeuralBridgeEngine-integration
 * @milestone MILL-AGI-P0.3 / U-NN-WIRE-PNB
 */

import { describe, it, expect } from "vitest";
import { PhysicsNeuralBridgeEngine } from "../engines/PhysicsNeuralBridgeEngine.js";
import { executeAIReasoningAction } from "../tools/dispatchers/AIReasoningDispatcher.js";

// ---------------------------------------------------------------------------
// Result-envelope helpers — the dispatcher returns a slimmed envelope
// `{ success, data, action, dispatcher, ... }`. Rejection paths return
// `{ success: false, error }` where error is the stringified Zod issue list.
// ---------------------------------------------------------------------------

interface DispatchEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

interface BridgeResultShape {
  cutting_force: {
    physics_prediction: { model: string; value: number; unit: string; confidence: number };
    neural_correction: { correction_factor: number; correction_confidence: number; learned_from: string };
    fused_value: number;
    fused_confidence: number;
    validation_status: "pass" | "warn" | "fail";
    validation_messages: string[];
    explanation: string;
  };
  tool_life: { physics_prediction: { model: string; value: number; unit: string }; fused_value: number };
  surface_roughness: { physics_prediction: { model: string; value: number; unit: string }; fused_value: number };
  deflection: { physics_prediction: { model: string; value: number; unit: string }; fused_value: number };
  overall_confidence: number;
  model_version: string;
}

describe("PhysicsNeuralBridgeEngine — prism_ai dispatcher wiring (U-NN-WIRE-PNB)", () => {
  const validInput = {
    cutting_speed_mpm: 150,
    feed_per_tooth_mm: 0.1,
    axial_depth_mm: 3,
    radial_depth_mm: 6,
    tool_diameter_mm: 12,
    number_of_teeth: 4,
    material_kc1_1: 1800,
    material_mc: 0.25,
    material_C: 250,
    material_n: 0.25,
  };

  describe("happy path round-trip", () => {
    it("physics_neural_bridge_predict returns full BridgeResult through dispatcher", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", validInput);
      const env = out as DispatchEnvelope<BridgeResultShape>;
      expect(env.success).toBe(true);
      const bridge = env.data as BridgeResultShape;
      expect(bridge.cutting_force.physics_prediction.model).toBe("Kienzle");
      expect(bridge.cutting_force.physics_prediction.unit).toBe("N");
      expect(bridge.tool_life.physics_prediction.model).toBe("Taylor");
      expect(bridge.tool_life.physics_prediction.unit).toBe("min");
      expect(bridge.surface_roughness.physics_prediction.model).toBe("Kinematic");
      expect(bridge.surface_roughness.physics_prediction.unit).toBe("µm");
      expect(bridge.deflection.physics_prediction.model).toBe("Cantilever");
      expect(bridge.deflection.physics_prediction.unit).toBe("µm");
      expect(["pass", "warn", "fail"]).toContain(bridge.cutting_force.validation_status);
      // validation_messages is an array of strings; dispatcher's slimResponse strips empty arrays,
      // so default to [] when omitted — preserves the type contract on populated responses.
      const validationMsgs = bridge.cutting_force.validation_messages ?? [];
      expect(validationMsgs.every((m) => typeof m === "string")).toBe(true);
      expect(bridge.overall_confidence).toBeGreaterThan(0);
      expect(bridge.overall_confidence).toBeLessThanOrEqual(1);
      expect(bridge.model_version).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe("physics invariants on the physics_prediction leg (un-fused, deterministic)", () => {
    it("Kienzle: Fc = kc1.1·h^(1-mc)·b·z·η matches engine to 0.1 N (η=0.7 engagement factor)", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", validInput);
      const env = out as DispatchEnvelope<BridgeResultShape>;
      expect(env.success).toBe(true);
      const bridge = env.data as BridgeResultShape;
      const h = validInput.feed_per_tooth_mm;
      const b = validInput.axial_depth_mm;
      const z = validInput.number_of_teeth;
      // Engine formula: kc = kc1_1·h^(-mc); Fc = kc·h·b·z·0.7
      const expectedPhysics = validInput.material_kc1_1 * Math.pow(h, -validInput.material_mc) * h * b * z * 0.7;
      expect(bridge.cutting_force.physics_prediction.value).toBeCloseTo(expectedPhysics, 1);
    });

    it("Taylor: T·Vc^(1/n) − C^(1/n) is zero to floating-point (relative tol 1e-4)", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", validInput);
      const env = out as DispatchEnvelope<BridgeResultShape>;
      expect(env.success).toBe(true);
      const bridge = env.data as BridgeResultShape;
      const T = bridge.tool_life.physics_prediction.value;
      const lhs = T * Math.pow(validInput.cutting_speed_mpm, 1 / validInput.material_n);
      const rhs = Math.pow(validInput.material_C, 1 / validInput.material_n);
      expect(Math.abs(lhs - rhs) / rhs).toBeLessThan(1e-4);
    });

    it("neural correction stays inside engine's tanh-bounded ±30% band on cutting_force", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", validInput);
      const env = out as DispatchEnvelope<BridgeResultShape>;
      expect(env.success).toBe(true);
      const bridge = env.data as BridgeResultShape;
      // Engine forwardCorrector(x) = 1 + tanh(x)·0.3 → strictly in (0.7, 1.3)
      const c = bridge.cutting_force.neural_correction.correction_factor;
      expect(c).toBeGreaterThan(0.7);
      expect(c).toBeLessThan(1.3);
      expect(bridge.cutting_force.neural_correction.learned_from).toContain("JM-DIE");
    });

    it("fused value sits inside [physics × 0.7, physics × 1.3] (Bayesian fusion bound)", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", validInput);
      const env = out as DispatchEnvelope<BridgeResultShape>;
      expect(env.success).toBe(true);
      const bridge = env.data as BridgeResultShape;
      const phys = bridge.cutting_force.physics_prediction.value;
      const fused = bridge.cutting_force.fused_value;
      // Engine fuse: fused = physicsValue × (physicsWeight + correctionWeight × correction)
      // With correction ∈ (0.7, 1.3), the multiplier is strictly in (0.7, 1.3).
      expect(fused).toBeGreaterThan(phys * 0.7);
      expect(fused).toBeLessThan(phys * 1.3);
    });
  });

  describe("model-version action", () => {
    it("physics_neural_bridge_version round-trips and matches engine.getModelVersion() exactly", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_version", {});
      const env = out as DispatchEnvelope<{ version: string }>;
      expect(env.success).toBe(true);
      const v = env.data?.version;
      expect(typeof v).toBe("string");
      expect(v).toMatch(/^v\d+\.\d+\.\d+/);
      // Cross-check against a fresh engine instance — implementation invariant.
      expect(v).toBe(new PhysicsNeuralBridgeEngine().getModelVersion());
    });
  });

  describe("failure-mode rejections (Zod schema gating, 5 cases)", () => {
    it("rejects missing required fields (only cutting_speed_mpm present)", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", { cutting_speed_mpm: 150 });
      const env = out as DispatchEnvelope<unknown>;
      expect(env.success).toBe(false);
      expect(typeof env.error).toBe("string");
      // Zod error must name the missing-field condition; case-insensitive over any of the expected tokens.
      expect((env.error as string).toLowerCase()).toMatch(/(invalid|required|expected|number)/);
    });

    it("rejects negative cutting_speed_mpm (boundary: must be positive)", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", { ...validInput, cutting_speed_mpm: -50 });
      const env = out as DispatchEnvelope<unknown>;
      expect(env.success).toBe(false);
      expect(typeof env.error).toBe("string");
      expect((env.error as string).toLowerCase()).toMatch(/(positive|greater|too[_ ]small|invalid)/);
    });

    it("rejects zero axial_depth_mm (boundary: must be strictly positive)", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", { ...validInput, axial_depth_mm: 0 });
      const env = out as DispatchEnvelope<unknown>;
      expect(env.success).toBe(false);
      expect(typeof env.error).toBe("string");
    });

    it("rejects non-integer number_of_teeth (adversarial: fractional teeth)", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", { ...validInput, number_of_teeth: 4.5 });
      const env = out as DispatchEnvelope<unknown>;
      expect(env.success).toBe(false);
      expect(typeof env.error).toBe("string");
      expect((env.error as string).toLowerCase()).toMatch(/(integer|invalid|expected)/);
    });

    it("rejects NaN cutting_speed_mpm (adversarial: silent-garbage input)", async () => {
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", { ...validInput, cutting_speed_mpm: NaN });
      const env = out as DispatchEnvelope<unknown>;
      expect(env.success).toBe(false);
      expect(typeof env.error).toBe("string");
    });
  });

  describe("optional Taylor params behave correctly when omitted", () => {
    it("predict succeeds without material_C / material_n; engine defaults C=250, n=0.25 satisfy Taylor invariant", async () => {
      const noTaylor = {
        cutting_speed_mpm: 150,
        feed_per_tooth_mm: 0.1,
        axial_depth_mm: 3,
        radial_depth_mm: 6,
        tool_diameter_mm: 12,
        number_of_teeth: 4,
        material_kc1_1: 1800,
        material_mc: 0.25,
      };
      const out = await executeAIReasoningAction("physics_neural_bridge_predict", noTaylor);
      const env = out as DispatchEnvelope<BridgeResultShape>;
      expect(env.success).toBe(true);
      const T = (env.data as BridgeResultShape).tool_life.physics_prediction.value;
      // Same Taylor analytical with engine-default (C=250, n=0.25) — must match the explicit-params run.
      const lhs = T * Math.pow(150, 1 / 0.25);
      const rhs = Math.pow(250, 1 / 0.25);
      expect(Math.abs(lhs - rhs) / rhs).toBeLessThan(1e-4);
    });
  });
});
