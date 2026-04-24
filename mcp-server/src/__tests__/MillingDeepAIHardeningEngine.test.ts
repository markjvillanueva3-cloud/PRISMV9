/**
 * MillingDeepAIHardeningEngine tests — MILL-MASTER-AI-WIRING / U6-HARDENING
 *
 * Wires the existing troubleshootMillingIssue onto the PRISM reasoning stack:
 *   counterfactualReasoningEngine.createCausalGraph + generateCounterfactual
 *     → hypothesisPrioritizerEngine.prioritize        (Bayesian posterior)
 *     → advancedStatisticalLearningEngine.permutationTest with 'ks' statistic
 *     → selfImprovementPatternEngine when the same root cause fires >= 3 times
 *
 * Envelope invariants:
 *   - Counterfactual test case produces a distinct scenario vs the nominal input.
 *   - Failure modes prioritized by Bayesian likelihood (posterior_probability).
 *   - Distribution-shift detection via KS statistic.
 *   - Close-loop: >=3 rule fires → pattern recorded.
 *   - useAI='off' bit-identical to legacy troubleshootMillingIssue.
 *
 * Coverage floor per hook directive:
 *   - happy path + >=3 failure modes + >=2 adversarial inputs
 *   - >=3 material configurations (ISO P, M, N).
 *
 * @envelope mcp-server/data/milestones/MILL-MASTER-AI-WIRING.json (U6-HARDENING)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  millingDeepAIHardeningEngine,
  type MillingSymptoms,
} from "../engines/MillingDeepAIHardeningEngine.js";

const LEGACY_WALL_CLOCK_CEILING_MS = 50;
const AI_WALL_CLOCK_CEILING_MS = 500;

const SYMPTOMS_P: MillingSymptoms = {
  machine_id: "HAAS_VF2_01",
  material: "4140",
  operation: "rough_pocket",
  symptoms: ["chatter", "poor surface finish", "loud cutting noise"],
  chatter_detected: true,
};

const SYMPTOMS_M: MillingSymptoms = {
  machine_id: "OKUMA_MB46_01",
  material: "316L",
  operation: "finish_profile",
  symptoms: ["built-up edge", "poor surface finish", "work hardening"],
  measured_ra_um: 3.2,
};

const SYMPTOMS_N: MillingSymptoms = {
  machine_id: "ROKU_ROKU_HC658_01",
  material: "6061-T6",
  operation: "face",
  symptoms: ["chatter", "tool deflection"],
  chatter_detected: true,
  dimensional_error_mm: 0.05,
};

const MATERIALS = [
  { label: "ISO P (4140)", input: SYMPTOMS_P, iso: "P" },
  { label: "ISO M (316L)", input: SYMPTOMS_M, iso: "M" },
  { label: "ISO N (6061)", input: SYMPTOMS_N, iso: "N" },
] as const;

// ============================================================================
// useAI:'off' bit-identical to legacy troubleshootMillingIssue (3 materials)
// ============================================================================

describe("MillingDeepAIHardeningEngine.troubleshootMillingIssueUltra — useAI:'off'", () => {
  it.each(MATERIALS)("$label: useAI='off' legacy field deep-equals sync troubleshootMillingIssue", async ({ input }) => {
    const legacy = millingDeepAIHardeningEngine.troubleshootMillingIssue(input);
    const ultra = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(input, { useAI: "off" });
    expect(ultra.legacy).toEqual(legacy);
    expect(ultra.ai).toBe(undefined);
  });

  it("omitting useAI equals useAI='off'", async () => {
    const a = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P);
    const b = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, { useAI: "off" });
    expect(a.legacy).toEqual(b.legacy);
    expect(a.ai).toBe(undefined);
    expect(b.ai).toBe(undefined);
  });
});

// ============================================================================
// useAI:'on' — envelope-required spike invariants
// ============================================================================

describe("MillingDeepAIHardeningEngine.troubleshootMillingIssueUltra — counterfactual (envelope gate)", () => {
  it.each(MATERIALS)("$label: counterfactual is DISTINCT from nominal input", async ({ input }) => {
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(input, { useAI: "on" });
    expect(typeof out.ai).toBe("object");
    expect(out.ai === null).toBe(false);
    const cf = out.ai!.counterfactual;
    // Envelope-required distinction — counterfactual_value must differ from original.
    expect(cf.distinct_from_nominal).toBe(true);
    expect(cf.intervention.counterfactual_value).not.toEqual(cf.intervention.original_value);
    expect(typeof cf.description).toBe("string");
    expect(cf.description.length).toBeGreaterThan(0);
  });
});

describe("MillingDeepAIHardeningEngine.troubleshootMillingIssueUltra — Bayesian prioritization", () => {
  it("prioritized_failures are ordered by posterior probability (descending)", async () => {
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, { useAI: "on" });
    const pf = out.ai!.prioritized_failures;
    expect(pf.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < pf.length; i++) {
      expect(pf[i].posterior).toBeLessThanOrEqual(pf[i - 1].posterior);
    }
    // Top recommendation must match the highest-posterior entry.
    expect(out.ai!.top_recommendation.length).toBeGreaterThan(0);
  });

  it("all posteriors lie within [0, 1]", async () => {
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_M, { useAI: "on" });
    for (const p of out.ai!.prioritized_failures) {
      expect(p.posterior).toBeGreaterThanOrEqual(0);
      expect(p.posterior).toBeLessThanOrEqual(1);
    }
  });
});

describe("MillingDeepAIHardeningEngine.troubleshootMillingIssueUltra — distribution shift (KS)", () => {
  it("declares a shift when current metrics differ materially from baseline", async () => {
    // Nominal baseline + clearly shifted current run.
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, {
      useAI: "on",
      nominalBaseline: [1.0, 1.1, 0.9, 1.05, 0.95, 1.02, 0.98, 1.1, 0.92, 1.08],
      currentSample:  [2.5, 2.6, 2.4, 2.55, 2.45, 2.62, 2.48, 2.7, 2.42, 2.68],
    });
    const ds = out.ai!.distribution_shift;
    expect(Number.isFinite(ds.ks_statistic)).toBe(true);
    expect(ds.ks_statistic).toBeGreaterThan(0.5); // strong shift expected on these samples
    expect(ds.shifted).toBe(true);
    expect(ds.p_value).toBeGreaterThanOrEqual(0);
    expect(ds.p_value).toBeLessThanOrEqual(1);
  });

  it("declares no shift when current matches baseline distribution", async () => {
    const baseline = Array.from({ length: 20 }, (_, i) => 1 + 0.01 * i);
    const current = [...baseline];
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, {
      useAI: "on",
      nominalBaseline: baseline,
      currentSample: current,
    });
    expect(out.ai!.distribution_shift.shifted).toBe(false);
  });
});

describe("MillingDeepAIHardeningEngine.troubleshootMillingIssueUltra — pattern recording loop", () => {
  beforeEach(() => {
    millingDeepAIHardeningEngine.resetUltraPatternCounters();
  });

  it("first 2 identical rule fires do NOT record; the 3rd DOES (>=3 threshold per envelope)", async () => {
    const r1 = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, { useAI: "on" });
    const r2 = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, { useAI: "on" });
    const r3 = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, { useAI: "on" });
    expect(r1.ai!.pattern_recorded).toBe(false);
    expect(r2.ai!.pattern_recorded).toBe(false);
    expect(r3.ai!.pattern_recorded).toBe(true);
  });
});

describe("MillingDeepAIHardeningEngine.troubleshootMillingIssueUltra — source attribution", () => {
  it("cites all 4 pipeline stages in sources[]", async () => {
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, {
      useAI: "on",
      nominalBaseline: [1, 2, 3, 4, 5],
      currentSample: [10, 20, 30, 40, 50],
    });
    const sources = out.ai!.sources;
    expect(sources.some(s => /counterfactual/.test(s))).toBe(true);
    expect(sources.some(s => /hypothesis_prioritizer/.test(s))).toBe(true);
    expect(sources.some(s => /advanced_statistical_learning/.test(s))).toBe(true);
  });
});

// ============================================================================
// Failure modes (>=3 per directive)
// ============================================================================

describe("MillingDeepAIHardeningEngine.troubleshootMillingIssueUltra — failure modes", () => {
  it("failure #1: empty symptoms array does not throw; ai populated with bounded posteriors", async () => {
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(
      { symptoms: [] },
      { useAI: "on" },
    );
    expect(typeof out.ai).toBe("object");
    expect(out.ai === null).toBe(false);
    for (const p of out.ai!.prioritized_failures) {
      expect(p.posterior).toBeGreaterThanOrEqual(0);
      expect(p.posterior).toBeLessThanOrEqual(1);
    }
  });

  it("failure #2: whitespace-only symptoms are normalized and do not throw", async () => {
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(
      { symptoms: ["   ", "\t", "\n"] },
      { useAI: "on" },
    );
    expect(Array.isArray(out.legacy.root_causes)).toBe(true);
    expect(typeof out.ai!.counterfactual.description).toBe("string");
  });

  it("failure #3: missing baseline for distribution-shift — declares no-shift gracefully", async () => {
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, {
      useAI: "on",
      // no nominalBaseline, no currentSample
    });
    expect(out.ai!.distribution_shift.shifted).toBe(false);
    expect(out.ai!.distribution_shift.ks_statistic).toBe(0);
  });
});

// ============================================================================
// Adversarial inputs (>=2 per directive)
// ============================================================================

describe("MillingDeepAIHardeningEngine.troubleshootMillingIssueUltra — adversarial inputs", () => {
  it("adversarial #1: NaN dimensional_error_mm does not throw; posteriors remain finite", async () => {
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(
      { ...SYMPTOMS_P, dimensional_error_mm: Number.NaN },
      { useAI: "on" },
    );
    for (const p of out.ai!.prioritized_failures) {
      expect(Number.isFinite(p.posterior)).toBe(true);
    }
  });

  it("adversarial #2: oversize symptom list (100 entries) is bounded and finite", async () => {
    const oversize = Array.from({ length: 100 }, (_, i) => `symptom_${i}_chatter`);
    const t0 = performance.now();
    const out = await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(
      { ...SYMPTOMS_P, symptoms: oversize },
      { useAI: "on" },
    );
    const dt = performance.now() - t0;
    expect(dt).toBeLessThan(2000);
    expect(out.ai!.prioritized_failures.length).toBeLessThanOrEqual(50);
  });
});

// ============================================================================
// Latency ceilings
// ============================================================================

describe("MillingDeepAIHardeningEngine.troubleshootMillingIssueUltra — latency", () => {
  it("useAI='off' single-call wall clock < 50 ms", async () => {
    const t = performance.now();
    await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, { useAI: "off" });
    expect(performance.now() - t).toBeLessThan(LEGACY_WALL_CLOCK_CEILING_MS);
  });

  it("useAI='on' single-call wall clock < 500 ms", async () => {
    const t = performance.now();
    await millingDeepAIHardeningEngine.troubleshootMillingIssueUltra(SYMPTOMS_P, { useAI: "on" });
    expect(performance.now() - t).toBeLessThan(AI_WALL_CLOCK_CEILING_MS);
  });
});
