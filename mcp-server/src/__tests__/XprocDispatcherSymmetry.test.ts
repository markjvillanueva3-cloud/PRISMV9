/**
 * XprocDispatcherSymmetry.test.ts
 * U-XPROC-DISPATCHER-SYMMETRY-TEST
 *
 * Per CLAUDE.md "wire to all consumers" rule, every xproc_* action in
 * prism_intelligence must also exist in prism_ai (and vice-versa). This
 * test machine-verifies that lock-step. A future commit that wires a new
 * xproc_* action into one dispatcher but forgets the other will fail CI.
 *
 * The doctrine that this test enforces was raised by the 3-of-3 multi-CLI
 * scrutiny on T10-03 and is closed fleet-wide by U-XPROC-T2-T12-PRISM-AI-WIRE.
 * This test prevents regression of that closure.
 */

import { describe, it, expect } from "vitest";
import { INTELLIGENCE_CORE_ACTIONS } from "../tools/dispatchers/intelligenceDispatcher.js";
import { AI_REASONING_ACTIONS } from "../schemas/aiReasoningActionSchemas.js";

const isXproc = (a: string): boolean => a.startsWith("xproc_");

describe("XPROC dispatcher symmetry — prism_intelligence ↔ prism_ai", () => {
  const intelXproc = (INTELLIGENCE_CORE_ACTIONS as readonly string[]).filter(isXproc).sort();
  const aiXproc = (AI_REASONING_ACTIONS as readonly string[]).filter(isXproc).sort();

  it("both dispatchers expose ≥138 xproc_* actions (XPROC-NEURAL fleet baseline)", () => {
    // 138 = 38 engines × 2-9 actions each, established by T2-T12-PRISM-AI-WIRE.
    // Strict-greater allows future engines to be added without rewriting this test.
    expect(intelXproc.length).toBeGreaterThanOrEqual(138);
    expect(aiXproc.length).toBeGreaterThanOrEqual(138);
  });

  it("both dispatchers expose the SAME set of xproc_* actions (set equality)", () => {
    // toEqual on sorted arrays = set equality with deterministic diff on failure.
    expect(aiXproc).toEqual(intelXproc);
  });

  it("no xproc_* action appears in prism_ai but missing from prism_intelligence", () => {
    const missingFromIntel = aiXproc.filter((a) => !intelXproc.includes(a));
    expect(missingFromIntel).toEqual([]);
  });

  it("no xproc_* action appears in prism_intelligence but missing from prism_ai", () => {
    const missingFromAi = intelXproc.filter((a) => !aiXproc.includes(a));
    expect(missingFromAi).toEqual([]);
  });

  it("xproc_* action set has no duplicates within each dispatcher", () => {
    expect(new Set(intelXproc).size).toBe(intelXproc.length);
    expect(new Set(aiXproc).size).toBe(aiXproc.length);
  });

  it("known anchor actions present on both surfaces (spot-check Tier 10)", () => {
    // Spot-check the four anchors that closed the audit gap. If any is
    // missing from either dispatcher, the systemic doctrine is broken.
    for (const anchor of ["xproc_audio_fuse", "xproc_vision_fuse", "xproc_timeseries_fuse", "xproc_modality_dropout"]) {
      expect(intelXproc).toContain(anchor);
      expect(aiXproc).toContain(anchor);
    }
  });

  it("known anchor actions present on both surfaces (spot-check Tiers 2-9, 11-12)", () => {
    // One anchor per tier outside Tier 10.
    const anchorsByTier: Record<string, string> = {
      T2: "xproc_episodic_recall",
      T3: "xproc_drift_observe",
      T4: "xproc_bandit_select",
      T5: "xproc_bayes_predict",
      T6: "xproc_fed_aggregate",
      T7: "xproc_maml_meta_train",
      T8: "xproc_safety_verify",
      T9: "xproc_causal_learn_dag",
      T11: "xproc_curiosity_propose",
      T12: "xproc_route_query",
    };
    for (const [tier, action] of Object.entries(anchorsByTier)) {
      expect(intelXproc, `${tier} anchor ${action} missing from prism_intelligence`).toContain(action);
      expect(aiXproc, `${tier} anchor ${action} missing from prism_ai`).toContain(action);
    }
  });
});
