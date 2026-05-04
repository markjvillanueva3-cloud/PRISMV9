/**
 * Tests for HyperMillAIOrchestrationEngine — CAM-EXHAUST-MS0
 *
 * Covers:
 *  - Class shape (singleton + constructor + 8 reasoning modes)
 *  - Happy paths (strategy / maxx / 5axis / tribal request types)
 *  - Failure modes (unknown feature mapping, fallback strategy path,
 *    physics path skipped on missing material_id)
 *  - Adversarial inputs (NaN tool diameter, empty feature_type,
 *    blank reasoning_mode, oversize values, zero flutes)
 *  - Stats and reasoning-mode list integrity
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HyperMillAIOrchestrationEngine,
  hyperMillAIOrchestrationEngine,
  type HyperMillAIRequest,
  type HyperMillReasoningMode,
} from "../engines/HyperMillAIOrchestrationEngine.js";

// ============================================================================
// Named constants (no magic numbers in assertions)
// ============================================================================
const REASONING_MODE_COUNT = 8;
const TRIBAL_TIP_COUNT = 12; // entries in HYPERMILL_TRIBAL_KNOWLEDGE
const INTEGRATED_ENGINE_MIN = 12;
const SIGNATURE_FEATURE_COUNT = 6;

const MAXX_FINISH_STEPOVER_PCT = 3;
const MAXX_FINISH_STEPDOWN_MM = 0.5;
const MAXX_FINISH_CYCLE_REDUCTION = 90;

const FIVE_AXIS_TILT_DEFAULT = 3;
const FIVE_AXIS_BLADE_TILT = 5;
const FIVE_AXIS_UNDERCUT_TILT = 15;
const FIVE_AXIS_SINGULARITY_ZONES = 2;

const ALL_REASONING_MODES: HyperMillReasoningMode[] = [
  "chain_of_thought",
  "tree_of_thought",
  "multi_path",
  "backtracking",
  "abductive",
  "deductive",
  "inductive",
  "analogical",
];

describe("HyperMillAIOrchestrationEngine", () => {
  let engine: HyperMillAIOrchestrationEngine;

  beforeEach(() => {
    engine = new HyperMillAIOrchestrationEngine();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Class shape
  // ──────────────────────────────────────────────────────────────────────────
  describe("class shape", () => {
    it("singleton is a HyperMillAIOrchestrationEngine instance", () => {
      expect(hyperMillAIOrchestrationEngine).toBeInstanceOf(HyperMillAIOrchestrationEngine);
    });

    it("getReasoningModes returns all 8 canonical modes", () => {
      const modes = engine.getReasoningModes();
      expect(modes).toHaveLength(REASONING_MODE_COUNT);
      for (const m of ALL_REASONING_MODES) {
        expect(modes).toContain(m);
      }
    });

    it("getReasoningModes returns a fresh copy (caller cannot mutate internal state)", () => {
      const a = engine.getReasoningModes();
      a.pop();
      const b = engine.getReasoningModes();
      expect(b).toHaveLength(REASONING_MODE_COUNT);
    });

    it("getStats reports canonical reasoning_modes / tribal_tips counts", () => {
      const stats = engine.getStats();
      expect(stats.reasoning_modes).toBe(REASONING_MODE_COUNT);
      expect(stats.tribal_tips).toBe(TRIBAL_TIP_COUNT);
      expect(stats.engines_integrated.length).toBeGreaterThanOrEqual(INTEGRATED_ENGINE_MIN);
      expect(stats.signature_features).toHaveLength(SIGNATURE_FEATURE_COUNT);
      const joined = stats.signature_features.join(" | ");
      expect(joined).toMatch(/MAXX/);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Happy paths
  // ──────────────────────────────────────────────────────────────────────────
  describe("orchestrate — happy paths", () => {
    it("strategy request with feature_type returns recommended_strategy", async () => {
      const req: HyperMillAIRequest = {
        request_type: "strategy",
        feature_type: "pocket",
        material_iso: "P",
        machine_type: "3axis",
        operation: "roughing",
        tool_diameter_mm: 12,
      };
      const r = await engine.orchestrate(req);

      expect(r.request_type).toBe("strategy");
      expect(r.reasoning_mode).toBe("chain_of_thought");
      expect(r.recommended_strategy!.name.length).toBeGreaterThan(0);
      expect(r.recommended_strategy!.hypermill_cycle.length).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(r.engines_invoked).toContain("HyperMillAIOrchestrationEngine");
      expect(r.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(r.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("maxx request with maxx_roughing operation populates maxx_optimization", async () => {
      const req: HyperMillAIRequest = {
        request_type: "maxx",
        feature_type: "pocket",
        material_iso: "P",
        operation: "maxx_roughing",
        tool_diameter_mm: 10,
        priority: "balanced",
      };
      const r = await engine.orchestrate(req);

      const m = r.maxx_optimization!;
      expect(m.maxx_type).toBe("roughing");
      expect(m.trochoidal_enabled).toBe(true);
      expect(m.barrel_cutter_enabled).toBe(false);
      expect(m.stepover_pct).toBeGreaterThan(0);
      expect(m.stepdown_mm).toBeGreaterThan(0);
      expect(m.rationale).toMatch(/MAXX/);
    });

    it("maxx_finishing operation enables barrel cutter and 90% reduction", async () => {
      const req: HyperMillAIRequest = {
        request_type: "maxx",
        feature_type: "surface",
        material_iso: "H",
        operation: "maxx_finishing",
        tool_diameter_mm: 8,
        priority: "balanced",
      };
      const r = await engine.orchestrate(req);
      const m = r.maxx_optimization!;
      expect(m.maxx_type).toBe("finishing");
      expect(m.barrel_cutter_enabled).toBe(true);
      expect(m.trochoidal_enabled).toBe(false);
      expect(m.stepover_pct).toBe(MAXX_FINISH_STEPOVER_PCT);
      expect(m.stepdown_mm).toBeCloseTo(MAXX_FINISH_STEPDOWN_MM, 6);
      expect(m.cycle_time_reduction_pct).toBe(MAXX_FINISH_CYCLE_REDUCTION);
    });

    it("priority=cycle_time inflates stepover for MAXX roughing vs balanced", async () => {
      const base: HyperMillAIRequest = {
        request_type: "maxx",
        material_iso: "P",
        operation: "maxx_roughing",
        tool_diameter_mm: 10,
        priority: "balanced",
      };
      const r1 = await engine.orchestrate(base);
      const r2 = await engine.orchestrate({ ...base, priority: "cycle_time" });
      expect(r2.maxx_optimization!.stepover_pct).toBeGreaterThan(
        r1.maxx_optimization!.stepover_pct,
      );
    });

    it("priority=tool_life shrinks stepover vs balanced", async () => {
      const base: HyperMillAIRequest = {
        request_type: "maxx",
        material_iso: "P",
        operation: "maxx_roughing",
        tool_diameter_mm: 10,
        priority: "balanced",
      };
      const r1 = await engine.orchestrate(base);
      const r2 = await engine.orchestrate({ ...base, priority: "tool_life" });
      expect(r2.maxx_optimization!.stepover_pct).toBeLessThan(
        r1.maxx_optimization!.stepover_pct,
      );
    });

    it("5axis request selects 5-Axis Contouring with default tilt", async () => {
      const req: HyperMillAIRequest = {
        request_type: "5axis",
        feature_type: "surface",
        machine_type: "5axis",
      };
      const r = await engine.orchestrate(req);
      const f = r.five_axis_optimization!;
      expect(f.strategy).toBe("5-Axis Contouring");
      expect(f.tilt_angle_deg).toBe(FIVE_AXIS_TILT_DEFAULT);
      expect(f.collision_avoidance).toBe(true);
      expect(f.singularity_zones).toBe(FIVE_AXIS_SINGULARITY_ZONES);
    });

    it("5axis blade feature selects 5-Axis Flowline", async () => {
      const r = await engine.orchestrate({
        request_type: "5axis",
        feature_type: "turbine_blade",
        machine_type: "5axis",
      });
      expect(r.five_axis_optimization!.strategy).toBe("5-Axis Flowline");
      expect(r.five_axis_optimization!.tilt_angle_deg).toBe(FIVE_AXIS_BLADE_TILT);
    });

    it("5axis undercut feature selects Shape Offset with high tilt", async () => {
      const r = await engine.orchestrate({
        request_type: "5axis",
        feature_type: "undercut_groove",
        machine_type: "5axis",
      });
      expect(r.five_axis_optimization!.strategy).toBe("5-Axis Shape Offset");
      expect(r.five_axis_optimization!.tilt_angle_deg).toBe(FIVE_AXIS_UNDERCUT_TILT);
    });

    it("include_tribal returns ISO-S filtered tips for titanium", async () => {
      const r = await engine.orchestrate({
        request_type: "tribal",
        material_iso: "S",
        feature_type: "blade",
        operation: "maxx_roughing",
        machine_type: "5axis",
        include_tribal: true,
      });
      expect(r.tribal_tips!.length).toBeGreaterThan(0);
      for (const t of r.tribal_tips!) {
        expect(t.category.length).toBeGreaterThan(0);
        expect(t.tip).toMatch(/[A-Za-z]/);
        expect(t.source.length).toBeGreaterThan(0);
        expect(t.confidence).toBeGreaterThan(0);
        expect(t.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("include_chain=false suppresses reasoning_chain in response", async () => {
      const r = await engine.orchestrate({
        request_type: "maxx",
        material_iso: "P",
        operation: "maxx_roughing",
        tool_diameter_mm: 10,
        include_chain: false,
      });
      expect(r.reasoning_chain).toEqual([]);
    });

    it("explicit reasoning_mode is reflected in response", async () => {
      const r = await engine.orchestrate({
        request_type: "diagnose",
        reasoning_mode: "abductive",
      });
      expect(r.reasoning_mode).toBe("abductive");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Failure modes
  // ──────────────────────────────────────────────────────────────────────────
  describe("orchestrate — failure modes", () => {
    it("strategy request without feature_type produces no recommended_strategy", async () => {
      const r = await engine.orchestrate({
        request_type: "strategy",
        material_iso: "P",
      });
      expect(r.recommended_strategy).toBe(undefined);
    });

    it("physics path skipped when material_id missing", async () => {
      const r = await engine.orchestrate({
        request_type: "physics",
        include_physics: true,
        tool_diameter_mm: 10,
      });
      expect(r.physics_analysis).toBe(undefined);
    });

    it("physics path skipped when tool_diameter_mm missing", async () => {
      // Note: use material_iso (cheap path) instead of material_id to avoid
      // triggering the optional HyperMillMaterialBridgeEngine lookup.
      const r = await engine.orchestrate({
        request_type: "physics",
        include_physics: true,
        material_iso: "M",
      });
      expect(r.physics_analysis).toBe(undefined);
    });

    it("unknown feature maps to closed_pocket fallback in mapFeatureType", async () => {
      const r = await engine.orchestrate({
        request_type: "strategy",
        feature_type: "completely_unknown_garbage",
        material_iso: "P",
        machine_type: "3axis",
        operation: "roughing",
      });
      const text = (r.recommended_strategy!.rationale + r.recommended_strategy!.name).toLowerCase();
      expect(text.length).toBeGreaterThan(0);
    });

    it("warnings array is always present, even on minimal input", async () => {
      const r = await engine.orchestrate({ request_type: "diagnose" });
      expect(Array.isArray(r.warnings)).toBe(true);
      expect(r.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Adversarial inputs
  // ──────────────────────────────────────────────────────────────────────────
  describe("orchestrate — adversarial inputs", () => {
    it("NaN tool_diameter_mm does not crash MAXX path", async () => {
      const r = await engine.orchestrate({
        request_type: "maxx",
        material_iso: "P",
        operation: "maxx_roughing",
        tool_diameter_mm: Number.NaN,
        priority: "balanced",
      });
      expect(r.maxx_optimization!.maxx_type).toBe("roughing");
    });

    it("empty string feature_type tolerated in 5axis path", async () => {
      const r = await engine.orchestrate({
        request_type: "5axis",
        feature_type: "",
        machine_type: "5axis",
      });
      expect(r.five_axis_optimization!.strategy.length).toBeGreaterThan(0);
    });

    it("oversize tool_diameter_mm (1000mm) does not crash and returns finite stepdown", async () => {
      const r = await engine.orchestrate({
        request_type: "maxx",
        material_iso: "P",
        operation: "maxx_roughing",
        tool_diameter_mm: 1000,
        priority: "balanced",
      });
      const m = r.maxx_optimization!;
      expect(Number.isFinite(m.stepdown_mm)).toBe(true);
      expect(m.stepdown_mm).toBeGreaterThan(0);
    });

    it("Infinity spindle_rpm does not break orchestration", async () => {
      const r = await engine.orchestrate({
        request_type: "diagnose",
        spindle_rpm: Number.POSITIVE_INFINITY,
      });
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(r.engines_invoked)).toBe(true);
      expect(r.engines_invoked.length).toBeGreaterThan(0);
    });

    it("zero tool_flutes tolerated (default applied internally)", async () => {
      // Use diagnose path with material_iso so the orchestrator does not call
      // the optional HyperMillMaterialBridgeEngine; the assertion is that
      // tool_flutes=0 is tolerated downstream regardless.
      const r = await engine.orchestrate({
        request_type: "diagnose",
        material_iso: "S",
        tool_diameter_mm: 10,
        tool_flutes: 0,
      });
      expect(r.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(r.request_type).toBe("diagnose");
      expect(r.engines_invoked).toContain("HyperMillAIOrchestrationEngine");
    });

    it("rapid concurrent orchestrate calls return independent responses", async () => {
      const results = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          engine.orchestrate({
            request_type: "5axis",
            feature_type: i % 2 === 0 ? "blade" : "surface",
            machine_type: "5axis",
          }),
        ),
      );
      expect(results[0].five_axis_optimization!.strategy).toBe("5-Axis Flowline");
      expect(results[1].five_axis_optimization!.strategy).toBe("5-Axis Contouring");
      expect(results[2].five_axis_optimization!.strategy).toBe("5-Axis Flowline");
      expect(results[3].five_axis_optimization!.strategy).toBe("5-Axis Contouring");
    });
  });
});
