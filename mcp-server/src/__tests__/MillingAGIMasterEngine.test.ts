/**
 * MillingAGIMasterEngine Tests
 * MILL-MASTER/P1-U03-AGI-BIND
 *
 * ≥15 tests covering: 8 reasoning modes, tool/strategy recommendations,
 * provenance tracking, edge cases, adversarial inputs.
 */
import { describe, it, expect } from "vitest";
import {
  millingAGIMasterEngine,
  MillingAGIMasterEngine,
  MillAGIRequest,
  MillReasoningMode,
  ISOGroup,
  type TribalConsultFn,
} from "../engines/MillingAGIMasterEngine.js";
import type { TribalTip } from "../engines/MillTribalKnowledgeEngine.js";

describe("MillingAGIMasterEngine", () => {
  describe("chain_of_thought reasoning", () => {
    it("should return sequential reasoning steps", async () => {
      const request: MillAGIRequest = {
        intent: "Machine a 50x30x15mm pocket in aluminum",
        reasoning_mode: "chain_of_thought",
        iso_group: "N",
      };

      const response = await millingAGIMasterEngine.reason(request);

      expect(response.success).toBe(true);
      expect(response.reasoning_mode).toBe("chain_of_thought");
      expect(response.reasoning_steps.length).toBeGreaterThanOrEqual(3);
      expect(response.reasoning_steps[0].step).toBe(1);
      expect(response.confidence).toBeGreaterThan(0.8);
    });

    it("should include high-speed strategy for aluminum (ISO N)", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Rough pocket",
        iso_group: "N",
      });

      const speedStep = response.reasoning_steps.find(s =>
        s.thought.toLowerCase().includes("high-speed") || s.thought.includes("800")
      );
      expect(speedStep).toBeDefined();
    });
  });

  describe("tree_of_thought reasoning", () => {
    it("should return branching alternatives", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Complex pocket with islands",
        reasoning_mode: "tree_of_thought",
        iso_group: "P",
      });

      expect(response.reasoning_mode).toBe("tree_of_thought");
      const branchStep = response.reasoning_steps.find(s => s.alternatives?.length);
      expect(branchStep).toBeDefined();
      expect(branchStep!.alternatives!.length).toBeGreaterThan(0);
    });
  });

  describe("multi_path reasoning", () => {
    it("should evaluate multiple parallel paths", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Deep pocket 4xD",
        reasoning_mode: "multi_path",
        iso_group: "N",
      });

      expect(response.reasoning_mode).toBe("multi_path");
      const pathSteps = response.reasoning_steps.filter(s =>
        s.thought.includes("Path") || s.thought.includes("path")
      );
      expect(pathSteps.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("backtracking reasoning", () => {
    it("should show constraint checking and refinement", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Thin wall pocket",
        reasoning_mode: "backtracking",
        iso_group: "M",
      });

      expect(response.reasoning_mode).toBe("backtracking");
      const backtrackStep = response.reasoning_steps.find(s =>
        s.thought.toLowerCase().includes("backtrack")
      );
      expect(backtrackStep).toBeDefined();
    });
  });

  describe("abductive reasoning", () => {
    it("should infer best explanation from observations", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Deep pocket chip evacuation",
        reasoning_mode: "abductive",
        iso_group: "N",
      });

      expect(response.reasoning_mode).toBe("abductive");
      const hypothesisStep = response.reasoning_steps.find(s =>
        s.thought.toLowerCase().includes("hypothesis")
      );
      expect(hypothesisStep).toBeDefined();
    });
  });

  describe("deductive reasoning", () => {
    it("should apply Kienzle kc1.1 rules correctly", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Calculate cutting force",
        reasoning_mode: "deductive",
        iso_group: "P",
      });

      expect(response.reasoning_mode).toBe("deductive");
      const ruleStep = response.reasoning_steps.find(s =>
        s.thought.includes("kc1.1") && s.thought.includes("1800")
      );
      expect(ruleStep).toBeDefined();
    });

    it("should use correct kc1.1 for ISO N (aluminum)", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Force calc",
        reasoning_mode: "deductive",
        iso_group: "N",
      });

      const ruleStep = response.reasoning_steps.find(s => s.thought.includes("700"));
      expect(ruleStep).toBeDefined();
    });
  });

  describe("inductive reasoning", () => {
    it("should generalize from patterns", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Similar to previous jobs",
        reasoning_mode: "inductive",
        iso_group: "N",
      });

      expect(response.reasoning_mode).toBe("inductive");
      const patternStep = response.reasoning_steps.find(s =>
        s.thought.toLowerCase().includes("pattern")
      );
      expect(patternStep).toBeDefined();
    });
  });

  describe("analogical reasoning", () => {
    it("should transfer from similar past solutions", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Like job 2024-0847",
        reasoning_mode: "analogical",
        iso_group: "P",
      });

      expect(response.reasoning_mode).toBe("analogical");
      const transferStep = response.reasoning_steps.find(s =>
        s.thought.toLowerCase().includes("transfer") || s.thought.toLowerCase().includes("similar")
      );
      expect(transferStep).toBeDefined();
    });
  });

  describe("tool recommendations", () => {
    it("should recommend 3-flute for aluminum", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Pocket in aluminum",
        iso_group: "N",
      });

      expect(response.tool_recommendation).toBeDefined();
      expect(response.tool_recommendation!.flutes).toBe(3);
      expect(response.tool_recommendation!.diameter_mm).toBe(12);
    });

    it("should recommend 4-flute for steel", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Pocket in steel",
        iso_group: "P",
      });

      expect(response.tool_recommendation!.flutes).toBe(4);
      expect(response.tool_recommendation!.diameter_mm).toBe(10);
    });

    it("should recommend AlTiN coating for superalloys", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Machine Inconel",
        iso_group: "S",
      });

      expect(response.tool_recommendation!.coating).toBe("AlTiN");
    });
  });

  describe("strategy recommendations", () => {
    it("should recommend adaptive_clearing for aluminum", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Rough pocket",
        iso_group: "N",
      });

      expect(response.strategy_recommendation).toBeDefined();
      expect(response.strategy_recommendation!.strategy).toBe("adaptive_clearing");
      expect(response.strategy_recommendation!.params.radial_engagement).toBe(0.1);
    });

    it("should recommend trochoidal for steel", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Rough pocket",
        iso_group: "P",
      });

      expect(response.strategy_recommendation!.strategy).toBe("trochoidal");
    });

    it("should flag risk factors for difficult materials", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Machine hardened steel",
        iso_group: "H",
      });

      expect(response.strategy_recommendation!.risk_factors).toContain("tool_wear");
      expect(response.strategy_recommendation!.risk_factors).toContain("thermal");
    });
  });

  describe("provenance tracking", () => {
    it("should track engines invoked", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Test provenance",
        iso_group: "N",
      });

      expect(response.provenance.engines_invoked).toContain("MillingAGIMasterEngine");
      expect(response.provenance.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("warnings", () => {
    it("should warn for difficult-to-machine materials (ISO S)", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Machine titanium",
        iso_group: "S",
      });

      expect(response.warnings.length).toBeGreaterThan(0);
      expect(response.warnings[0]).toContain("Difficult-to-machine");
    });

    it("should warn for hardened steel (ISO H)", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Machine hardened steel",
        iso_group: "H",
      });

      expect(response.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle missing iso_group with default", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Machine something",
      });

      expect(response.success).toBe(true);
      expect(response.tool_recommendation!.flutes).toBe(3); // Default aluminum
    });

    it("should handle missing reasoning_mode with chain_of_thought default", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Default mode test",
      });

      expect(response.reasoning_mode).toBe("chain_of_thought");
    });

    it("should handle empty intent", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "",
      });

      expect(response.success).toBe(true);
      expect(response.reasoning_steps.length).toBeGreaterThan(0);
    });
  });

  describe("stats tracking", () => {
    it("should track invocation count", async () => {
      const statsBefore = millingAGIMasterEngine.getStats();
      await millingAGIMasterEngine.reason({ intent: "stats test" });
      const statsAfter = millingAGIMasterEngine.getStats();

      expect(statsAfter.invocations).toBe(statsBefore.invocations + 1);
    });

    it("should list all 8 reasoning modes", () => {
      const stats = millingAGIMasterEngine.getStats();
      expect(stats.modes_used).toHaveLength(8);
      expect(stats.modes_used).toContain("chain_of_thought");
      expect(stats.modes_used).toContain("analogical");
    });
  });

  describe("all ISO groups", () => {
    const isoGroups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];

    it.each(isoGroups)("should handle ISO group %s", async (iso) => {
      const response = await millingAGIMasterEngine.reason({
        intent: `Test ISO ${iso}`,
        iso_group: iso,
      });

      expect(response.success).toBe(true);
      expect(response.tool_recommendation).toBeDefined();
      expect(response.strategy_recommendation).toBeDefined();
    });
  });

  describe("all reasoning modes", () => {
    const modes: MillReasoningMode[] = [
      "chain_of_thought", "tree_of_thought", "multi_path", "backtracking",
      "abductive", "deductive", "inductive", "analogical",
    ];

    it.each(modes)("should execute %s mode", async (mode) => {
      const response = await millingAGIMasterEngine.reason({
        intent: `Test ${mode}`,
        reasoning_mode: mode,
      });

      expect(response.success).toBe(true);
      expect(response.reasoning_mode).toBe(mode);
      expect(response.reasoning_steps.length).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // AUDIT-TRIBAL-BRIDGE-FIX (finding #3): the engine USED to declare
  // tribalSources=[] and never consult the corpus while abductive() claimed
  // "Evidence: tribal knowledge supports this". These tests encode the
  // INTENT — they fail loudly if the consultation loop is removed again.
  // DI seam (constructor) keeps the unit hermetic; one real-data E2E
  // exercises the real corpus through the production singleton.
  // ══════════════════════════════════════════════════════════════════════
  describe("tribal grounding (audit finding #3 fix)", () => {
    // SCALE NOTE: TribalTip.confidence is 0-1 (verified against
    // MillTribalKnowledgeEngine SEED_TIPS — values 0.88..0.97). Earlier
    // revisions of this suite used 0-100 fakes, masking a production
    // scale-mismatch (P0-1). All fakes here are 0-1 to match the real
    // corpus contract.
    const tip = (
      id: string,
      confidence: number,
      rule = "Use 3-flute end mill for aluminum",
    ): TribalTip => ({
      id,
      category: "tool_life", // real TribalCategory member; no `as` cast (P2-1)
      rule,
      rationale: "Chip evacuation in soft material",
      source: `shop:test-${id}`,
      confidence,
    });

    it("populates tribal_sources + status='consulted' when the corpus returns tips", async () => {
      const fake: TribalConsultFn = () => [tip("TT-1", 0.9), tip("TT-2", 0.7)];
      const eng = new MillingAGIMasterEngine(fake);
      const r = await eng.reason({ intent: "Deep pocket aluminum", iso_group: "N" });

      expect(r.provenance.tribal_status).toBe("consulted");
      expect(r.provenance.tribal_sources).toContain("TT-1: shop:test-TT-1");
      expect(r.provenance.tribal_sources).toContain("TT-2: shop:test-TT-2");
      expect(r.provenance.engines_invoked).toContain("MillTribalKnowledgeEngine");
    });

    it("orders tribal_sources by confidence (highest-confidence rule first)", async () => {
      const fake: TribalConsultFn = () => [tip("LOW", 0.55), tip("HIGH", 0.95), tip("MID", 0.75)];
      const eng = new MillingAGIMasterEngine(fake);
      const r = await eng.reason({ intent: "Pocket", iso_group: "N" });

      expect(r.provenance.tribal_sources[0]).toBe("HIGH: shop:test-HIGH");
      expect(r.provenance.tribal_sources[2]).toBe("LOW: shop:test-LOW");
    });

    it("caps tribal_sources at 5 even when the corpus floods results", async () => {
      // Float confidences spanning 0.50-0.99 (mod-50 cycle), all in-scale.
      const flood: TribalConsultFn = () =>
        Array.from({ length: 40 }, (_, i) => tip(`F${i}`, 0.5 + (i % 50) * 0.01));
      const eng = new MillingAGIMasterEngine(flood);
      const r = await eng.reason({ intent: "Wide search", iso_group: "P" });

      expect(r.provenance.tribal_sources.length).toBe(5);
      expect(r.provenance.tribal_status).toBe("consulted");
    });

    it("injects a tribal-grounding reasoning step carrying the actual rules as evidence", async () => {
      const fake: TribalConsultFn = () => [tip("TT-9", 0.88, "Climb mill thin walls")];
      const eng = new MillingAGIMasterEngine(fake);
      const r = await eng.reason({ intent: "Thin wall", iso_group: "N" });

      const grounding = r.reasoning_steps.find((s) =>
        s.thought.toLowerCase().includes("tribal grounding"),
      );
      expect(grounding).toBeDefined();
      expect(grounding!.evidence).toBeDefined();
      // The evidence must be the REAL rule text + id, not a generic claim.
      expect(grounding!.evidence!.some((e) => e.includes("Climb mill thin walls"))).toBe(true);
      expect(grounding!.evidence!.some((e) => e.includes("TT-9"))).toBe(true);
    });

    it("status='consulted_no_match' when corpus is queried but returns zero tips (NOT a fake zero)", async () => {
      const empty: TribalConsultFn = () => [];
      const eng = new MillingAGIMasterEngine(empty);
      const r = await eng.reason({ intent: "Obscure operation", iso_group: "S" });

      expect(r.provenance.tribal_status).toBe("consulted_no_match");
      expect(r.provenance.tribal_sources).toHaveLength(0);
      // A genuine no-match must NOT add the tribal engine to provenance.
      expect(r.provenance.engines_invoked).not.toContain("MillTribalKnowledgeEngine");
      // Still a successful reasoning response — physics path unaffected.
      expect(r.success).toBe(true);
    });

    it("status='unavailable' + warning when the corpus THROWS (fail-soft, honest)", async () => {
      const boom: TribalConsultFn = () => {
        throw new Error("corpus disk I/O error");
      };
      const eng = new MillingAGIMasterEngine(boom);
      const r = await eng.reason({ intent: "Pocket", iso_group: "N" });

      expect(r.provenance.tribal_status).toBe("unavailable");
      expect(r.provenance.tribal_sources).toHaveLength(0);
      expect(r.success).toBe(true); // reasoning still proceeds (degraded)
      expect(
        r.warnings.some((w) => w.toLowerCase().includes("tribal corpus unavailable")),
      ).toBe(true);
      // The honesty step must explicitly flag the recommendation as
      // physics-only / not tribally validated.
      expect(
        r.reasoning_steps.some((s) =>
          s.thought.toLowerCase().includes("corpus unavailable"),
        ),
      ).toBe(true);
    });

    it("ADVERSARIAL: a corpus returning null is treated as no-match, not a crash", async () => {
      const nuller = (() => null) as unknown as TribalConsultFn;
      const eng = new MillingAGIMasterEngine(nuller);
      const r = await eng.reason({ intent: "Edge case", iso_group: "K" });

      expect(r.success).toBe(true);
      expect(r.provenance.tribal_status).toBe("consulted_no_match");
      expect(r.provenance.tribal_sources).toHaveLength(0);
    });

    it("REAL-DATA E2E: the production singleton consults the REAL mill tribal corpus", async () => {
      // STRICT regression oracle (P0-2 hardened). Pre-fix this asserted
      // `["consulted","consulted_no_match"]` and gated the strong checks
      // behind an `if` — that wrote the test so it green-passed even when
      // the production seam was broken (min_confidence on the wrong scale
      // → every tip filtered → permanent consulted_no_match). The fix
      // demands an UNCONDITIONAL "consulted" verdict: SEED_TIPS contains
      // chatter + aluminum + tooling tips at confidence ≥ 0.88, all above
      // the 0.6 floor, so a mainstream chatter/aluminum query MUST surface
      // real sources. If the loop, the scale, or the min_confidence
      // regress, this assertion fails red — exactly what the RGS-MS1
      // lesson cited in the file header requires of a real-data E2E.
      // No `material:` here on purpose — SEED_TIPS encode materials as
      // codes ("6061", "4140", "D2"), not common names. The keyword path
      // (`intentKeyword` → "chatter") is what surfaces the 2 chatter tips
      // (TT-001 / TT-011, confidence 0.92) the real corpus carries. The
      // material filter is exercised by the engine's pure-fake unit tests
      // above; here the goal is to PROVE the production singleton
      // actually reaches and binds the real corpus.
      const r = await millingAGIMasterEngine.reason({
        intent: "chatter suppression in pocket milling",
        iso_group: "N",
      });
      expect(r.provenance.tribal_status).toBe("consulted");
      expect(r.provenance.tribal_sources.length).toBeGreaterThan(0);
      expect(r.provenance.engines_invoked).toContain("MillTribalKnowledgeEngine");

      // The grounding-step confidence math (P2-3 fix) lives on the 0-1
      // scale. A near-zero ~0.009 value here would mean the `*100` scale
      // bug regressed; the captured step must land in (0.5, 0.99].
      const groundingSteps = r.reasoning_steps.filter((s) =>
        s.thought.toLowerCase().includes("tribal grounding"),
      );
      expect(groundingSteps).toHaveLength(1);
      const grounding = groundingSteps[0]!;
      expect(grounding.confidence).toBeGreaterThan(0.5);
      expect(grounding.confidence).toBeLessThanOrEqual(0.99);
      // Real corpus tip ids look like `TT-001`/`TT-002`/… — at least one
      // entry of evidence[] must carry a real corpus id, proving the
      // citation is the matched rule, not a fabricated string.
      expect(
        (grounding.evidence ?? []).some((e) => /\[TT-\d{3}\]/.test(e)),
      ).toBe(true);
    });

    it("REGRESSION: explicit reasoning modes still work unchanged with tribal wired in", async () => {
      // Zero-regression guard: the 8 modes + tool/strategy recs must be
      // identical in shape to pre-fix; tribal is additive only.
      const r = await millingAGIMasterEngine.reason({
        intent: "Calculate cutting force",
        reasoning_mode: "deductive",
        iso_group: "P",
      });
      expect(r.reasoning_mode).toBe("deductive");
      expect(r.tool_recommendation).toBeDefined();
      expect(r.strategy_recommendation).toBeDefined();
      const ruleStep = r.reasoning_steps.find(
        (s) => s.thought.includes("kc1.1") && s.thought.includes("1800"),
      );
      expect(ruleStep).toBeDefined();
    });
  });
});
