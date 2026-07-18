/**
 * Wiring-gate test for U-WIRE-LATHE-GA (BACKEND-DEV-LOOP).
 *
 * Asserts that LatheGeneticAlgorithmEngine.{optimizeParameters,
 * optimizeToolSequence, optimizeMultiPassStrategy} are reachable through
 * the prism_turning dispatcher (3 new actions). Fail-on-revert oracle —
 * if anyone removes the wiring, these tests fail with concrete diffs.
 *
 * Pattern follows other wire*.test.ts: schema enum membership, schema
 * validation oracle, engine API contract, dependency-respecting
 * sequence oracle, and pass-distribution invariant.
 *
 * @milestone BACKEND-DEV-LOOP
 * @unit U-WIRE-LATHE-GA
 */
import { describe, it, expect } from "vitest";
import { ZodObject } from "zod";
import { latheGeneticAlgorithmEngine } from "../engines/LatheGeneticAlgorithmEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";
import type { LatheGAConfig } from "../engines/LatheGeneticAlgorithmEngine.js";

// Hermetic test fixtures (seed pins RNG; small population + few generations for speed).
const TEST_GA_CONFIG: Partial<LatheGAConfig> = {
  seed: 42,
  population_size: 20,
  max_generations: 10,
};

// Op timing fixtures (named so assertions stay traceable):
const OP_TIME_FACE = 0.5;
const OP_TIME_ROUGH = 2.5;
const OP_TIME_FINISH = 1.5;
const TOOL_CHANGE_PENALTY_MIN = 0.5; // engine constant; mirrored locally for the oracle
const EXPECTED_SEQUENCE_TIME = OP_TIME_FACE + OP_TIME_ROUGH + OP_TIME_FINISH + TOOL_CHANGE_PENALTY_MIN; // = 5.0
const EXPECTED_TOOL_CHANGES = 1; // face(T01) → rough(T02) → finish(T02)

describe("U-WIRE-LATHE-GA — LatheGeneticAlgorithmEngine dispatcher wiring", () => {
  describe("schema registry membership (fail-on-revert oracle)", () => {
    it("registers lathe_ga_optimize_parameters as a ZodObject schema", () => {
      const schema = TURNING_ACTION_SCHEMAS.lathe_ga_optimize_parameters;
      expect(schema).toBeInstanceOf(ZodObject);
    });

    it("registers lathe_ga_optimize_tool_sequence as a ZodObject schema", () => {
      const schema = TURNING_ACTION_SCHEMAS.lathe_ga_optimize_tool_sequence;
      expect(schema).toBeInstanceOf(ZodObject);
    });

    it("registers lathe_ga_optimize_multi_pass as a ZodObject schema", () => {
      const schema = TURNING_ACTION_SCHEMAS.lathe_ga_optimize_multi_pass;
      expect(schema).toBeInstanceOf(ZodObject);
    });
  });

  describe("schema validation rejects bad input", () => {
    it("rejects empty input for lathe_ga_optimize_parameters", () => {
      const result = TURNING_ACTION_SCHEMAS.lathe_ga_optimize_parameters.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts a complete valid input for lathe_ga_optimize_parameters", () => {
      const valid = {
        material: "steel",
        operation: "roughing",
        machine: {
          max_spindle_rpm: 4500,
          max_power_kw: 22,
          max_feed_mm_rev: 1.2,
          max_rapid_mm_min: 24000,
          turret_stations: 12,
        },
        tool: {
          insert_grade: "KC5010",
          nose_radius_mm: 0.8,
          approach_angle_deg: 95,
          max_depth_mm: 4.0,
        },
        workpiece: {
          diameter_mm: 50.0,
          length_mm: 120.0,
          stock_allowance_mm: 2.5,
        },
        objectives: [{ name: "mrr", weight: 1.0 }],
      };
      const result = TURNING_ACTION_SCHEMAS.lathe_ga_optimize_parameters.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects empty operations array for lathe_ga_optimize_tool_sequence", () => {
      const result = TURNING_ACTION_SCHEMAS.lathe_ga_optimize_tool_sequence.safeParse({ operations: [] });
      expect(result.success).toBe(false);
    });

    it("accepts a valid op list for lathe_ga_optimize_tool_sequence", () => {
      const valid = {
        operations: [
          { name: "face", time_min: OP_TIME_FACE, tool_id: "T01" },
          { name: "rough_od", time_min: OP_TIME_ROUGH, tool_id: "T02", dependencies: ["face"] },
        ],
      };
      const result = TURNING_ACTION_SCHEMAS.lathe_ga_optimize_tool_sequence.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects zero total_stock for lathe_ga_optimize_multi_pass", () => {
      const result = TURNING_ACTION_SCHEMAS.lathe_ga_optimize_multi_pass.safeParse({ total_stock_mm: 0 });
      expect(result.success).toBe(false);
    });

    it("accepts a valid multi-pass input", () => {
      const valid = {
        total_stock_mm: 10.0,
        constraints: { max_doc_mm: 3.0, min_doc_mm: 0.5, max_passes: 5, tool_stability_factor: 1.0 },
        objectives: [{ name: "cutting_time", weight: 0.6 }, { name: "tool_wear", weight: 0.4 }],
      };
      const result = TURNING_ACTION_SCHEMAS.lathe_ga_optimize_multi_pass.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("engine API contract", () => {
    it("optimizeParameters is a callable function on the singleton", () => {
      expect(latheGeneticAlgorithmEngine.optimizeParameters).toBeInstanceOf(Function);
    });

    it("optimizeToolSequence is a callable function on the singleton", () => {
      expect(latheGeneticAlgorithmEngine.optimizeToolSequence).toBeInstanceOf(Function);
    });

    it("optimizeMultiPassStrategy is a callable function on the singleton", () => {
      expect(latheGeneticAlgorithmEngine.optimizeMultiPassStrategy).toBeInstanceOf(Function);
    });
  });

  describe("engine round-trip (real value oracle)", () => {
    it("optimizeToolSequence respects dependency ordering (face → rough → finish)", () => {
      const result = latheGeneticAlgorithmEngine.optimizeToolSequence(
        [
          { name: "face", time_min: OP_TIME_FACE, tool_id: "T01" },
          { name: "rough", time_min: OP_TIME_ROUGH, tool_id: "T02", dependencies: ["face"] },
          { name: "finish", time_min: OP_TIME_FINISH, tool_id: "T02", dependencies: ["rough"] },
        ],
        TEST_GA_CONFIG,
      );

      const faceIdx = result.sequence.indexOf("face");
      const roughIdx = result.sequence.indexOf("rough");
      const finishIdx = result.sequence.indexOf("finish");

      // All three ops are scheduled
      expect(result.sequence.length).toBe(3);
      // Dependency invariant: face before rough before finish
      expect(faceIdx).toBeGreaterThanOrEqual(0);
      expect(roughIdx).toBeGreaterThan(faceIdx);
      expect(finishIdx).toBeGreaterThan(roughIdx);

      // total_time = sum(op_times) + penalty * tool_changes (5.0)
      expect(result.total_time).toBeCloseTo(EXPECTED_SEQUENCE_TIME, 1);
      expect(result.tool_changes).toBe(EXPECTED_TOOL_CHANGES);
    });

    it("optimizeMultiPassStrategy distributes DOC across viable passes (sum > 0)", () => {
      const TOTAL_STOCK_MM = 6.0;
      const result = latheGeneticAlgorithmEngine.optimizeMultiPassStrategy(
        TOTAL_STOCK_MM,
        { max_doc_mm: 3.0, min_doc_mm: 0.5, max_passes: 4, tool_stability_factor: 1.0 },
        [{ name: "cutting_time", weight: 1.0 }],
        TEST_GA_CONFIG,
      );

      const sumDoc = result.passes.reduce((s, d) => s + d, 0);
      expect(sumDoc).toBeGreaterThan(0);
      expect(result.total_passes).toBeGreaterThan(0);
      expect(result.total_passes).toBeLessThanOrEqual(4);
      // Every active pass DOC must be >= min_doc_mm (engine invariant from filter)
      for (const doc of result.passes) {
        expect(doc).toBeGreaterThanOrEqual(0.5);
      }
      expect(result.cutting_time_factor).toBeGreaterThan(0);
      expect(result.tool_wear_factor).toBeGreaterThan(0);
    });
  });

  describe("dispatcher contract — anti-regression", () => {
    it("LatheGeneticAlgorithmEngine.js is import-reachable + singleton stable", async () => {
      const mod = await import("../engines/LatheGeneticAlgorithmEngine.js");
      // Verify singleton identity (not a fresh instance per import)
      expect(mod.latheGeneticAlgorithmEngine).toBe(latheGeneticAlgorithmEngine);
      // Verify the singleton exposes all 3 wired methods
      expect(mod.latheGeneticAlgorithmEngine.optimizeParameters).toBeInstanceOf(Function);
      expect(mod.latheGeneticAlgorithmEngine.optimizeToolSequence).toBeInstanceOf(Function);
      expect(mod.latheGeneticAlgorithmEngine.optimizeMultiPassStrategy).toBeInstanceOf(Function);
    });
  });
});
