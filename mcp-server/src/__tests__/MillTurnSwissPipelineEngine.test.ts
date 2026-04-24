/**
 * MillTurnSwissPipelineEngine tests — MILL-MASTER-AI-WIRING / U5-SWISS
 *
 * Retrofit: calculateSwissMachiningUltra stacks three PRISM primitives onto
 * the deterministic Swiss pipeline:
 *   bayesianToolLifeEngine.predict             (uncertainty-bounded Taylor)
 *     → crossDisciplinaryEngine.deepReason     (stiffness-deflection coupling)
 *     → prismCreativeReasoningEngine.explore   (only when bushing + sub-spindle conflict)
 *
 * Envelope invariants:
 *   - Tests cover >= 3 materials (P, M, N canonical ISO groups).
 *   - Bayesian prediction variance (std) is bounded AND finite.
 *   - useAI='off' bit-identical to legacy calculateSwissMachining.
 *   - useAI='on' p95 < 500 ms per global_contracts.latency_budgets_ms.
 *
 * @envelope mcp-server/data/milestones/MILL-MASTER-AI-WIRING.json (U5-SWISS)
 */

import { describe, it, expect } from "vitest";
import { millTurnSwissPipelineEngine } from "../engines/MillTurnSwissPipelineEngine.js";

const LEGACY_WALL_CLOCK_CEILING_MS = 50;
const AI_WALL_CLOCK_CEILING_MS = 500;

const INPUT_P = {
  machine_config: "citizen_cincom",
  guide_bushing: true,
  bushing_bore_mm: 20,
  workpiece_diameter_mm: 18,
  overhang_from_bushing_mm: 30,
  operation: "turn",
  tool_diameter_mm: 10,
  depth_of_cut_mm: 0.5,
  feed_mm_rev: 0.08,
  iso_group: "P",
  material_name: "4140",
};

const INPUT_M = {
  ...INPUT_P,
  iso_group: "M",
  material_name: "316L",
  workpiece_diameter_mm: 16,
  depth_of_cut_mm: 0.4,
};

const INPUT_N = {
  ...INPUT_P,
  iso_group: "N",
  material_name: "6061-T6",
  workpiece_diameter_mm: 22,
  depth_of_cut_mm: 1.0,
  feed_mm_rev: 0.12,
};

const MATERIALS = [
  { label: "ISO P (4140)", input: INPUT_P },
  { label: "ISO M (316L)", input: INPUT_M },
  { label: "ISO N (6061)", input: INPUT_N },
] as const;

// ============================================================================
// useAI:'off' bit-identical to legacy calculateSwissMachining
// ============================================================================

describe("MillTurnSwissPipelineEngine.calculateSwissMachiningUltra — useAI:'off'", () => {
  it.each(MATERIALS)("$label: useAI='off' equals legacy calculateSwissMachining", async ({ input }) => {
    const legacy = millTurnSwissPipelineEngine.calculateSwissMachining(input);
    const ultra = await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({
      ...input,
      useAI: "off",
    });
    expect(ultra.swiss).toEqual(legacy);
    expect(ultra.ai).toBe(undefined);
  });

  it("omitting useAI equals useAI='off'", async () => {
    const a = await millTurnSwissPipelineEngine.calculateSwissMachiningUltra(INPUT_P);
    const b = await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({
      ...INPUT_P,
      useAI: "off",
    });
    expect(a.swiss).toEqual(b.swiss);
    expect(a.ai).toBe(undefined);
    expect(b.ai).toBe(undefined);
  });
});

// ============================================================================
// useAI:'on' — Bayesian tool life with bounded, finite variance (3 materials)
// ============================================================================

describe("MillTurnSwissPipelineEngine.calculateSwissMachiningUltra — useAI:'on' Bayesian tool life", () => {
  it.each(MATERIALS)("$label: Bayesian prediction has bounded, finite variance", async ({ input }) => {
    const out = await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({
      ...input,
      useAI: "on",
    });
    expect(typeof out.ai).toBe("object");
    expect(out.ai === null).toBe(false);
    const tl = out.ai!.tool_life;
    expect(tl.mean_min).toBeGreaterThan(0);
    expect(Number.isFinite(tl.mean_min)).toBe(true);
    expect(tl.std_min).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(tl.std_min)).toBe(true);
    expect(tl.std_min).toBeLessThanOrEqual(tl.mean_min * 2);
    expect(tl.ci95_low_min).toBeLessThanOrEqual(tl.mean_min);
    expect(tl.ci95_high_min).toBeGreaterThanOrEqual(tl.mean_min);
    expect(tl.ci95_low_min).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(tl.ci95_low_min)).toBe(true);
    expect(Number.isFinite(tl.ci95_high_min)).toBe(true);
  });

  it("ISO P, M, N produce DISTINCT tool-life means (material-sensitive prediction)", async () => {
    const [rp, rm, rn] = await Promise.all(
      MATERIALS.map(m =>
        millTurnSwissPipelineEngine.calculateSwissMachiningUltra({ ...m.input, useAI: "on" }),
      ),
    );
    const means = [rp.ai!.tool_life.mean_min, rm.ai!.tool_life.mean_min, rn.ai!.tool_life.mean_min];
    const allEqual = means.every(m => Math.abs(m - means[0]) < 1e-6);
    expect(allEqual).toBe(false);
  });

  it("cites all PRISM-AI pipeline stages in sources[]", async () => {
    const out = await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({
      ...INPUT_P,
      useAI: "on",
    });
    expect(Array.isArray(out.ai!.sources)).toBe(true);
    expect(out.ai!.sources.some(s => /bayesian_tool_life/.test(s))).toBe(true);
    expect(out.ai!.sources.some(s => /cross_disciplinary/.test(s))).toBe(true);
  });
});

// ============================================================================
// Cross-domain stiffness-deflection insight (envelope-required)
// ============================================================================

describe("MillTurnSwissPipelineEngine.calculateSwissMachiningUltra — cross-domain deflection", () => {
  it("surfaces a non-empty manufacturing_insight string from crossDisciplinaryEngine", async () => {
    const out = await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({
      ...INPUT_P,
      useAI: "on",
    });
    const insight = out.ai!.deflection_insight;
    expect(typeof insight.manufacturing_insight).toBe("string");
    expect(insight.manufacturing_insight.length).toBeGreaterThan(0);
    expect(Array.isArray(insight.relevant_domains)).toBe(true);
    expect(insight.confidence).toBeGreaterThanOrEqual(0);
    expect(insight.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Hybrid-strategy synthesis when guide-bushing + sub-spindle conflict
// ============================================================================

describe("MillTurnSwissPipelineEngine.calculateSwissMachiningUltra — hybrid strategy", () => {
  it("invokes creative reasoning when hasSubSpindleConflict=true (populated strategy object)", async () => {
    const out = await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({
      ...INPUT_P,
      useAI: "on",
      hasSubSpindleConflict: true,
    });
    expect(typeof out.ai!.creative_strategy).toBe("object");
    expect(out.ai!.creative_strategy === null).toBe(false);
    const cs = out.ai!.creative_strategy!;
    expect(typeof cs.recommended_approach).toBe("string");
    expect(cs.recommended_approach.length).toBeGreaterThan(0);
    expect(Array.isArray(cs.solutions)).toBe(true);
    expect(out.ai!.sources.some(s => /creative_reasoning/.test(s))).toBe(true);
  });

  it("skips creative reasoning when no conflict declared (creative_strategy === null)", async () => {
    const out = await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({
      ...INPUT_P,
      useAI: "on",
    });
    expect(out.ai!.creative_strategy).toBe(null);
    expect(out.ai!.sources.some(s => /creative_reasoning/.test(s))).toBe(false);
  });
});

// ============================================================================
// Hardening + latency
// ============================================================================

describe("MillTurnSwissPipelineEngine.calculateSwissMachiningUltra — hardening", () => {
  it("NaN feed_mm_rev does not throw and returns a finite mean tool life", async () => {
    const out = await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({
      ...INPUT_P,
      feed_mm_rev: Number.NaN,
      useAI: "on",
    });
    expect(Number.isFinite(out.ai!.tool_life.mean_min)).toBe(true);
  });

  it("unknown iso_group does not throw; ai is populated and fallback factor applies", async () => {
    // Legacy calculateSwissMachining does not guard against unrecognized iso
    // groups (it returns NaN rpm). The U5 wiring MUST not throw and MUST still
    // populate ai.tool_life with the default (P) factor.
    const out = await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({
      ...INPUT_P,
      iso_group: "ZZ" as "P",
      useAI: "on",
    });
    expect(typeof out.ai).toBe("object");
    expect(typeof out.swiss).toBe("object");
    expect(out.ai!.tool_life.mean_min).toBeGreaterThan(0);
    expect(Number.isFinite(out.ai!.tool_life.mean_min)).toBe(true);
  });

  it("useAI='off' single-call wall clock < 50 ms", async () => {
    const t = performance.now();
    await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({ ...INPUT_P, useAI: "off" });
    expect(performance.now() - t).toBeLessThan(LEGACY_WALL_CLOCK_CEILING_MS);
  });

  it("useAI='on' single-call wall clock < 500 ms", async () => {
    const t = performance.now();
    await millTurnSwissPipelineEngine.calculateSwissMachiningUltra({ ...INPUT_P, useAI: "on" });
    expect(performance.now() - t).toBeLessThan(AI_WALL_CLOCK_CEILING_MS);
  });
});
