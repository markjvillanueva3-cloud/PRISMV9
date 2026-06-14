/**
 * MillingUltimateAIEngine wiring test
 * ===================================
 * BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING — iter-5.
 *
 * Verifies the 2 new prism_mill actions wire the deep-reasoning engine:
 *   - mill_ultimate_quick_analyze
 *   - mill_ultimate_explore_variability
 *
 * All assertions value-comparative (no toBeDefined / toBeUndefined alone).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  millingUltimateAIEngine,
  type UltimateMillingContext,
} from "../engines/MillingUltimateAIEngine.js";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = join(HERE, "..", "tools", "dispatchers", "millDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf8");

const NEW_ACTIONS = ["mill_ultimate_quick_analyze", "mill_ultimate_explore_variability"] as const;

type ZodSchemaLike = {
  safeParse: (p: unknown) => { success: boolean; data?: unknown };
};
const getSchema = (action: string): ZodSchemaLike =>
  (MILL_ACTION_SCHEMAS as Record<string, ZodSchemaLike>)[action];

const SAMPLE_CTX: UltimateMillingContext = {
  material: "AISI 1045",
  material_iso: "P",
  hardness_hrc: 28,
  feature_type: "pocket",
  dimensions: { length_mm: 80, width_mm: 50, depth_mm: 20 },
  geometry_complexity: "moderate",
  tolerance_mm: 0.05,
  surface_finish_ra: 1.6,
  axes: 3,
};

describe("MillingUltimateAIEngine wiring (U-BRIDGE-WIRE-MILLING iter-5)", () => {
  describe("dispatcher pins the 2 actions + milling_ultimate getter", () => {
    for (const action of NEW_ACTIONS) {
      it(`MILL_ACTIONS contains exactly one '${action}'`, () => {
        const arr = MILL_ACTIONS as readonly string[];
        expect(arr.filter((x) => x === action).length).toBe(1);
      });
      it(`dispatcher source has 'case "${action}":' block`, () => {
        expect(DISPATCHER_SRC.includes(`case "${action}":`)).toBe(true);
      });
    }

    it("dispatcher source lazy-imports MillingUltimateAIEngine", () => {
      expect(DISPATCHER_SRC.includes('case "milling_ultimate":')).toBe(true);
      expect(DISPATCHER_SRC.includes("MillingUltimateAIEngine.js")).toBe(true);
    });
  });

  describe("Zod schemas validate input", () => {
    it("quick_analyze REJECTS empty payload (missing material+feature_type+dimensions+complexity)", () => {
      expect(getSchema("mill_ultimate_quick_analyze").safeParse({}).success).toBe(false);
    });

    it("quick_analyze REJECTS missing geometry_complexity", () => {
      const r = getSchema("mill_ultimate_quick_analyze").safeParse({
        material: "AISI 1045",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: { depth_mm: 20 },
      });
      expect(r.success).toBe(false);
    });

    it("quick_analyze REJECTS invalid geometry_complexity enum", () => {
      const r = getSchema("mill_ultimate_quick_analyze").safeParse({
        material: "AISI 1045",
        material_iso: "P",
        feature_type: "pocket",
        dimensions: {},
        geometry_complexity: "trivial", // not in enum
      });
      expect(r.success).toBe(false);
    });

    it("quick_analyze ACCEPTS valid UltimateMillingContext and preserves material", () => {
      const r = getSchema("mill_ultimate_quick_analyze").safeParse(SAMPLE_CTX);
      expect(r.success).toBe(true);
      const data = r.data as { material: string; feature_type: string };
      expect(data.material).toBe("AISI 1045");
      expect(data.feature_type).toBe("pocket");
    });

    it("explore_variability ACCEPTS exhaustive exploration_depth", () => {
      const r = getSchema("mill_ultimate_explore_variability").safeParse({
        ...SAMPLE_CTX, exploration_depth: "exhaustive",
      });
      expect(r.success).toBe(true);
    });

    it("explore_variability REJECTS invalid axes value", () => {
      const r = getSchema("mill_ultimate_explore_variability").safeParse({
        ...SAMPLE_CTX, axes: 2,
      });
      expect(r.success).toBe(false);
    });
  });

  describe("engine round-trip returns concrete deep-reasoning results", () => {
    it("quickAnalyze() returns strategy + rpm/feed/doc parameters + confidence in (0,1]", () => {
      const r = millingUltimateAIEngine.quickAnalyze(SAMPLE_CTX);
      expect(typeof r.strategy).toBe("string");
      expect(r.strategy.length).toBeGreaterThan(0);
      expect(r.parameters.rpm).toBeGreaterThan(0);
      expect(r.parameters.feed).toBeGreaterThan(0);
      expect(r.parameters.doc).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it("quickAnalyze() reasoning references the material and feature_type", () => {
      const r = millingUltimateAIEngine.quickAnalyze(SAMPLE_CTX);
      expect(r.reasoning).toContain("P");        // material_iso
      expect(r.reasoning).toContain("pocket");   // feature_type
    });

    it("exploreMaxVariability() returns Pareto solutions + hybrid approaches + variability ≤ 1", () => {
      const r = millingUltimateAIEngine.exploreMaxVariability(SAMPLE_CTX);
      expect(Array.isArray(r.solutions)).toBe(true);
      expect(Array.isArray(r.approaches)).toBe(true);
      expect(Array.isArray(r.novel_combinations)).toBe(true);
      expect(r.variability_score).toBeGreaterThanOrEqual(0);
      expect(r.variability_score).toBeLessThanOrEqual(1);
    });

    it("exploreMaxVariability() generates ≥1 result across solutions/approaches/novel", () => {
      const r = millingUltimateAIEngine.exploreMaxVariability(SAMPLE_CTX);
      const total = r.solutions.length + r.approaches.length + r.novel_combinations.length;
      expect(total).toBeGreaterThan(0);
    });
  });

  describe("MILL_ACTIONS action-count anti-regression", () => {
    it("total action count is ≥ post-iter4 + 2 (≥ 101)", () => {
      expect((MILL_ACTIONS as readonly string[]).length).toBeGreaterThanOrEqual(101);
    });
  });
});
