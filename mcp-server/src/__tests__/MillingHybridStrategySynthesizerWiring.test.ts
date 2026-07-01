/**
 * MillingHybridStrategySynthesizer wiring test
 * ============================================
 * BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING — iter-1.
 *
 * Verifies the 4 new prism_mill actions end-to-end against real behavior:
 *   - mill_hybrid_synthesize
 *   - mill_hybrid_quick_recommend
 *   - mill_hybrid_strategies
 *   - mill_hybrid_synergy
 *
 * Every assertion is value-comparative (no bare toBeDefined / toBeTruthy):
 *   - source-grep checks invoke the exact wired token under the exact case
 *     keyword (catches refactor-drop class per
 *     [[reference_u_wire_session_event_log_2026_05_18]])
 *   - schema checks invoke safeParse with concrete inputs and compare both
 *     success outcome and a typed field value when accepted
 *   - engine round-trip exercises pure-transform calls and compares concrete
 *     enum / numeric / structural invariants
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  millingHybridStrategySynthesizer,
  type HybridRequest,
  type StrategyType,
} from "../engines/MillingHybridStrategySynthesizer.js";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = join(HERE, "..", "tools", "dispatchers", "millDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf8");

const NEW_ACTIONS = [
  "mill_hybrid_synthesize",
  "mill_hybrid_quick_recommend",
  "mill_hybrid_strategies",
  "mill_hybrid_synergy",
] as const;

const KNOWN_STRATEGIES: readonly StrategyType[] = [
  "trochoidal", "plunge", "hsm", "conventional", "hfm", "rest",
  "pencil", "spiral", "ramp", "helical", "3_axis", "5_axis",
];

type ZodSchemaLike = {
  safeParse: (p: unknown) => { success: boolean; data?: unknown; error?: unknown };
};
const getSchema = (action: string): ZodSchemaLike =>
  (MILL_ACTION_SCHEMAS as Record<string, ZodSchemaLike>)[action];

describe("MillingHybridStrategySynthesizer wiring (U-BRIDGE-WIRE-MILLING)", () => {
  // -----------------------------------------------------------------------
  // LAYER 1 — dispatcher source contains the exact wired tokens
  // -----------------------------------------------------------------------
  describe("dispatcher source pins all 4 actions + engine getter", () => {
    for (const action of NEW_ACTIONS) {
      it(`MILL_ACTIONS contains exactly one '${action}'`, () => {
        const arr = MILL_ACTIONS as readonly string[];
        const occurrences = arr.filter((x) => x === action).length;
        expect(occurrences).toBe(1);
      });
      it(`dispatcher source has 'case "${action}":' block`, () => {
        expect(DISPATCHER_SRC.includes(`case "${action}":`)).toBe(true);
      });
    }

    it("dispatcher source lazy-imports MillingHybridStrategySynthesizer", () => {
      expect(DISPATCHER_SRC.includes('case "hybrid":')).toBe(true);
      expect(DISPATCHER_SRC.includes("MillingHybridStrategySynthesizer.js")).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // LAYER 2 — schemas reject malformed + accept valid with typed payload
  // -----------------------------------------------------------------------
  describe("Zod schemas validate input with typed accept/reject behavior", () => {
    it("mill_hybrid_synthesize rejects empty payload (missing feature_type)", () => {
      expect(getSchema("mill_hybrid_synthesize").safeParse({}).success).toBe(false);
    });

    it("mill_hybrid_synthesize accepts minimal valid payload and parses feature_type='pocket'", () => {
      const r = getSchema("mill_hybrid_synthesize").safeParse({ feature_type: "pocket" });
      expect(r.success).toBe(true);
      expect((r.data as { feature_type?: string } | undefined)?.feature_type).toBe("pocket");
    });

    it("mill_hybrid_synthesize accepts full HybridRequest and preserves depth_mm=40", () => {
      const r = getSchema("mill_hybrid_synthesize").safeParse({
        feature_type: "pocket", depth_mm: 40, machine_axes: 3, priority: "balanced",
      });
      expect(r.success).toBe(true);
      expect((r.data as { depth_mm?: number } | undefined)?.depth_mm).toBe(40);
    });

    it("mill_hybrid_quick_recommend rejects unknown priority", () => {
      const r = getSchema("mill_hybrid_quick_recommend").safeParse({
        feature_type: "slot", priority: "fast", // 'fast' is not in enum
      });
      expect(r.success).toBe(false);
    });

    it("mill_hybrid_strategies accepts empty object exactly", () => {
      expect(getSchema("mill_hybrid_strategies").safeParse({}).success).toBe(true);
      // .strict() rejects unknown fields
      expect(getSchema("mill_hybrid_strategies").safeParse({ extra: 1 }).success).toBe(false);
    });

    it("mill_hybrid_synergy rejects bogus strategy enum value", () => {
      const r = getSchema("mill_hybrid_synergy").safeParse({
        primary: "trochoidal", secondary: "not-a-real-strategy",
      });
      expect(r.success).toBe(false);
    });

    it("mill_hybrid_synergy accepts valid pair and preserves both fields", () => {
      const r = getSchema("mill_hybrid_synergy").safeParse({
        primary: "trochoidal", secondary: "rest",
      });
      expect(r.success).toBe(true);
      const d = r.data as { primary?: string; secondary?: string } | undefined;
      expect(d?.primary).toBe("trochoidal");
      expect(d?.secondary).toBe("rest");
    });

    it("mill_hybrid_synergy rejects missing primary", () => {
      expect(getSchema("mill_hybrid_synergy").safeParse({ secondary: "rest" }).success).toBe(false);
    });

    it("mill_hybrid_synergy rejects missing secondary", () => {
      expect(getSchema("mill_hybrid_synergy").safeParse({ primary: "trochoidal" }).success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // LAYER 3 — engine round-trip returns real, non-stub values
  // -----------------------------------------------------------------------
  describe("engine round-trip returns concrete values (pure-transform)", () => {
    const REQ: HybridRequest = {
      feature_type: "pocket",
      depth_mm: 40,
      width_mm: 80,
      length_mm: 120,
      material_iso: "P",
      hardness_hrc: 30,
      tolerance_mm: 0.05,
      surface_finish_ra: 1.6,
      machine_axes: 3,
      priority: "balanced",
      tool_diameter_mm: 12,
    };

    it("synthesize().request_id is non-empty", () => {
      const r = millingHybridStrategySynthesizer.synthesize(REQ);
      expect(r.request_id.length).toBeGreaterThan(0);
    });

    it("synthesize().timestamp matches ISO-8601 prefix", () => {
      const r = millingHybridStrategySynthesizer.synthesize(REQ);
      expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(r.timestamp)).toBe(true);
    });

    it("synthesize().feature_analysis.complexity is one of 3 known values", () => {
      const r = millingHybridStrategySynthesizer.synthesize(REQ);
      expect(["simple", "moderate", "complex"]).toContain(r.feature_analysis.complexity);
    });

    it("synthesize().strategy_scores has ≥1 entry with fit_score in [0,1]", () => {
      const r = millingHybridStrategySynthesizer.synthesize(REQ);
      expect(r.strategy_scores.length).toBeGreaterThan(0);
      expect(r.strategy_scores[0].fit_score).toBeGreaterThanOrEqual(0);
      expect(r.strategy_scores[0].fit_score).toBeLessThanOrEqual(1);
    });

    it("synthesize().strategy_scores ranks by fit_score descending", () => {
      const r = millingHybridStrategySynthesizer.synthesize(REQ);
      for (let i = 1; i < r.strategy_scores.length; i++) {
        expect(r.strategy_scores[i - 1].fit_score).toBeGreaterThanOrEqual(
          r.strategy_scores[i].fit_score,
        );
      }
    });

    it("synthesize().top_single_strategy is a recognized StrategyType", () => {
      const r = millingHybridStrategySynthesizer.synthesize(REQ);
      expect(KNOWN_STRATEGIES as readonly string[]).toContain(r.top_single_strategy);
    });

    it("synthesize().workflow_steps has ≥1 step (real, non-stub)", () => {
      const r = millingHybridStrategySynthesizer.synthesize(REQ);
      expect(r.workflow_steps.length).toBeGreaterThan(0);
      expect(r.workflow_steps.every((s) => typeof s === "string" && s.length > 0)).toBe(true);
    });

    it("synthesize().confidence is in (0,1]", () => {
      const r = millingHybridStrategySynthesizer.synthesize(REQ);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it("quickRecommend() returns an object with a known StrategyType field", () => {
      const r = millingHybridStrategySynthesizer.quickRecommend(REQ);
      const picked = (r as { primary?: string; strategy?: string }).primary
        ?? (r as { primary?: string; strategy?: string }).strategy;
      expect(typeof picked).toBe("string");
      expect(KNOWN_STRATEGIES as readonly string[]).toContain(picked as string);
    });

    it("getStrategies() returns all 12 known strategies", () => {
      const r = millingHybridStrategySynthesizer.getStrategies();
      expect(r.length).toBe(12);
      const types = r.map((s) => s.type).sort();
      expect(types).toEqual([...KNOWN_STRATEGIES].sort());
    });

    it("getStrategies() returns entries with non-uniform cost/time/quality factors", () => {
      const r = millingHybridStrategySynthesizer.getStrategies();
      const cost = new Set(r.map((s) => s.cost_factor));
      const time = new Set(r.map((s) => s.time_factor));
      const quality = new Set(r.map((s) => s.quality_factor));
      // At least two distinct factor values across the 12 strategies — not stubbed to 1.0
      expect(cost.size).toBeGreaterThan(1);
      expect(time.size).toBeGreaterThan(1);
      expect(quality.size).toBeGreaterThan(1);
    });

    it("getSynergy('trochoidal','rest') returns synergy_score 0.9 with concrete workflow", () => {
      // 0.9 is the canonical SYNERGY_MATRIX value for trochoidal+rest in the engine source.
      // Engine contract per source: { synergy_score, workflow, recommended }.
      const r = millingHybridStrategySynthesizer.getSynergy("trochoidal", "rest");
      expect(r).not.toBeNull();
      expect(r!.synergy_score).toBe(0.9);
      expect(r!.recommended).toBe(true); // > 0.75 threshold
      expect(r!.workflow.length).toBeGreaterThanOrEqual(2);
      // Workflow describes the hybrid sequence — first step references trochoidal
      expect(r!.workflow[0].toLowerCase()).toContain("trochoidal");
    });

    it("getSynergy('hfm','plunge') returns synergy_score 0.85 (recommended)", () => {
      // 0.85 is the canonical SYNERGY_MATRIX value for hfm+plunge
      const r = millingHybridStrategySynthesizer.getSynergy("hfm", "plunge");
      expect(r).not.toBeNull();
      expect(r!.synergy_score).toBe(0.85);
      expect(r!.recommended).toBe(true);
      expect(r!.workflow.length).toBeGreaterThanOrEqual(2);
    });

    it("getSynergy() falls back to reverse key (rest+trochoidal === trochoidal+rest)", () => {
      // SYNERGY_MATRIX has 'trochoidal+rest' (not reversed); engine checks reverse-key
      const forward = millingHybridStrategySynthesizer.getSynergy("trochoidal", "rest");
      const reverse = millingHybridStrategySynthesizer.getSynergy("rest", "trochoidal");
      expect(reverse).not.toBeNull();
      expect(reverse!.synergy_score).toBe(forward!.synergy_score);
    });

    it("getSynergy() returns null for unknown strategy pair", () => {
      // Strategy types valid but the pair isn't in SYNERGY_MATRIX
      const r = millingHybridStrategySynthesizer.getSynergy("ramp", "pencil");
      expect(r).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Action-count anti-regression — protects against accidental case removal
  // -----------------------------------------------------------------------
  describe("MILL_ACTIONS action-count anti-regression", () => {
    it("includes all 4 new actions exactly once", () => {
      const arr = MILL_ACTIONS as readonly string[];
      for (const a of NEW_ACTIONS) {
        expect(arr.filter((x) => x === a).length).toBe(1);
      }
    });

    it("total action count is ≥ 94 (pre-wiring 90 + 4 new)", () => {
      expect((MILL_ACTIONS as readonly string[]).length).toBeGreaterThanOrEqual(94);
    });
  });
});
