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
  MillAGIResponse,
  MillReasoningMode,
  ISOGroup,
  type TribalConsultFn,
  type MillConsensusFn,
  type MillConsensusQuery,
  type MillConsensusVerdict,
  type PublishOutcomeFn,
  type MillDecisionValue,
} from "../engines/MillingAGIMasterEngine.js";
import type { TribalTip } from "../engines/MillTribalKnowledgeEngine.js";
import {
  DomainAGIResultSchema,
  type DomainAGIIntent,
} from "../schemas/domainAGIContract.js";
import { OutcomeEventSchema, type OutcomeEvent } from "../schemas/outcomeEventSchema.js";

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

// ============================================================================
// INFRA-AGI-ROUTER-MS2/P0-U02 — orchestrate(DomainAGIIntent) contract
// ============================================================================

describe("MillingAGIMasterEngine.orchestrate — DomainAGIIntent contract (P0-U02)", () => {
  /** Build a valid mill DomainAGIIntent with sensible defaults. */
  function mkIntent(
    action: DomainAGIIntent["action"],
    overrides: Partial<DomainAGIIntent> = {},
  ): DomainAGIIntent {
    return {
      schemaVersion: "1.0.0",
      domain: "mill",
      action,
      features: [
        { id: "F-001", kind: "pocket", dimensions: { length_mm: 80, width_mm: 40, depth_mm: 20 } },
      ],
      material: "6061-aluminum",
      constraints: {},
      consensusRequired: false,
      ...overrides,
    };
  }

  /** Deterministic consensus fake — records every call; never hits the network. */
  function mkFakeConsensus(opts: { override?: boolean; withAuditId?: boolean } = {}) {
    const calls: MillConsensusQuery[] = [];
    const fn: MillConsensusFn = async (q) => {
      calls.push(q);
      const verdict: MillConsensusVerdict = {
        answer: opts.override ? `consensus-${q.decisionKind}-choice` : q.options[0],
        confidence: 0.91,
        voters: ["claude", "codex", "ollama"],
      };
      if (opts.withAuditId) verdict.auditId = `consensus-decisions.jsonl#${q.decisionKind}-row`;
      return verdict;
    };
    return { fn, calls };
  }

  /** Outcome-event spy for the feedback-bus seam. */
  function mkPublishSpy() {
    const events: OutcomeEvent[] = [];
    const fn: PublishOutcomeFn = (e) => {
      events.push(e);
    };
    return { fn, events };
  }

  describe("3 mill intent types return a valid DomainAGIResult", () => {
    for (const action of ["roughing", "finishing", "drilling"] as const) {
      it(`${action}: schema-valid result with tool/strategy/feed decisions`, async () => {
        const { fn: publish } = mkPublishSpy();
        const result = await millingAGIMasterEngine.orchestrate(mkIntent(action), {
          publishOutcome: publish,
        });
        // Validates decisions[], outcomes[] (each OutcomeEventSchema), confidence in [0,1].
        expect(() => DomainAGIResultSchema.parse(result)).not.toThrow();
        expect(result.success).toBe(true);
        expect(result.decisions.map((d) => d.kind).sort()).toEqual(["feed", "strategy", "tool"]);
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    }
  });

  describe("consensus gating", () => {
    it("consensusRequired=false: never calls the consensus seam", async () => {
      const { fn: consensus, calls } = mkFakeConsensus();
      const { fn: publish } = mkPublishSpy();
      const result = await millingAGIMasterEngine.orchestrate(
        mkIntent("roughing", { consensusRequired: false }),
        { consensusDecide: consensus, publishOutcome: publish },
      );
      expect(calls).toHaveLength(0);
      expect(result.decisions).toHaveLength(3);
      expect(result.decisions.every((d) => d.source === "MillingAGIMasterEngine.reason")).toBe(true);
    });

    it("consensusRequired=true: routes tool, strategy AND feed picks through consensus", async () => {
      const { fn: consensus, calls } = mkFakeConsensus();
      const { fn: publish } = mkPublishSpy();
      await millingAGIMasterEngine.orchestrate(mkIntent("finishing", { consensusRequired: true }), {
        consensusDecide: consensus,
        publishOutcome: publish,
      });
      // Exact order — tool, then strategy, then feed (deterministic pick order).
      expect(calls.map((c) => c.decisionKind)).toEqual(["tool", "strategy", "feed"]);
    });

    it("consensusRequired=true: every decision is sourced from consensus_decide", async () => {
      const { fn: consensus } = mkFakeConsensus();
      const { fn: publish } = mkPublishSpy();
      const result = await millingAGIMasterEngine.orchestrate(
        mkIntent("drilling", { consensusRequired: true }),
        { consensusDecide: consensus, publishOutcome: publish },
      );
      expect(result.decisions).toHaveLength(3);
      expect(result.decisions.every((d) => d.source.startsWith("consensus_decide:"))).toBe(true);
      // Pipeline confidence is the joint product of the 3 per-decision
      // confidences (the consensus fake fixes each at 0.91).
      expect(result.confidence).toBeCloseTo(0.91 ** 3, 5);
    });

    it("consensus override: replaces the engine pick and flags consensusOverride", async () => {
      const { fn: consensus } = mkFakeConsensus({ override: true });
      const { fn: publish } = mkPublishSpy();
      const result = await millingAGIMasterEngine.orchestrate(
        mkIntent("roughing", { consensusRequired: true }),
        { consensusDecide: consensus, publishOutcome: publish },
      );
      expect(result.decisions).toHaveLength(3);
      for (const d of result.decisions) {
        const value = d.value as MillDecisionValue;
        expect(value.consensusOverride).toBe(true);
        expect(value.selected).toBe(`consensus-${d.kind}-choice`);
        expect(value.selected).not.toBe(value.enginePick);
      }
      expect(result.warnings.some((w) => w.includes("Consensus overrode"))).toBe(true);
    });

    it("consensus audit id: surfaced on the decision only when the seam provides one", async () => {
      const { fn: publish } = mkPublishSpy();
      const withId = mkFakeConsensus({ withAuditId: true });
      const r1 = await millingAGIMasterEngine.orchestrate(
        mkIntent("roughing", { consensusRequired: true }),
        { consensusDecide: withId.fn, publishOutcome: publish },
      );
      expect(r1.decisions.map((d) => d.consensus_audit_id)).toEqual([
        "consensus-decisions.jsonl#tool-row",
        "consensus-decisions.jsonl#strategy-row",
        "consensus-decisions.jsonl#feed-row",
      ]);

      const noId = mkFakeConsensus({ withAuditId: false });
      const r2 = await millingAGIMasterEngine.orchestrate(
        mkIntent("roughing", { consensusRequired: true }),
        { consensusDecide: noId.fn, publishOutcome: publish },
      );
      // No fabricated pointer — honest absence (Karpathy R12).
      expect(r2.decisions).toHaveLength(3);
      expect(r2.decisions.every((d) => d.consensus_audit_id === undefined)).toBe(true);
    });

    it("consensus seam throws: degrades soft to the engine pick (no hard failure)", async () => {
      const consensus: MillConsensusFn = async () => {
        throw new Error("all voices offline");
      };
      const { fn: publish } = mkPublishSpy();
      const result = await millingAGIMasterEngine.orchestrate(
        mkIntent("roughing", { consensusRequired: true }),
        { consensusDecide: consensus, publishOutcome: publish },
      );
      expect(result.success).toBe(true);
      expect(result.decisions).toHaveLength(3);
      expect(result.decisions.every((d) => d.source === "MillingAGIMasterEngine.reason")).toBe(true);
      expect(result.warnings.some((w) => w.includes("Consensus call failed"))).toBe(true);
    });

    it("consensusRequired=true with no injected fake: test-env guard fires, degrades soft", async () => {
      // No consensusDecide opt -> defaultConsensusDecide runs -> test-env guard
      // throws (VITEST is set) -> per-pick catch degrades to the engine pick.
      const { fn: publish } = mkPublishSpy();
      const result = await millingAGIMasterEngine.orchestrate(
        mkIntent("roughing", { consensusRequired: true }),
        { publishOutcome: publish },
      );
      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => w.includes("injected consensusDecide fake"))).toBe(true);
    });
  });

  describe("outcome events feed the MS1 feedback bus", () => {
    it("emits one cross_process_decision event per decision via the publish seam", async () => {
      const { fn: publish, events } = mkPublishSpy();
      const result = await millingAGIMasterEngine.orchestrate(mkIntent("roughing"), {
        publishOutcome: publish,
      });
      expect(events).toHaveLength(3);
      expect(result.outcomes).toHaveLength(3);
      expect(events.every((e) => e.kind === "cross_process_decision")).toBe(true);
      expect(events.every((e) => e.domain === "mill")).toBe(true);
      // Every emitted event is itself schema-valid.
      for (const e of events) expect(() => OutcomeEventSchema.parse(e)).not.toThrow();
    });

    it("outcome events share one non-empty job_id but carry distinct lineage_ids", async () => {
      const { fn: publish, events } = mkPublishSpy();
      await millingAGIMasterEngine.orchestrate(mkIntent("finishing"), { publishOutcome: publish });
      expect(events).toHaveLength(3);
      // Every job_id is a real non-empty string (a Set of all-undefined would
      // also have size 1 — assert the value, not just the cardinality).
      for (const e of events) {
        expect(typeof e.context.job_id).toBe("string");
        expect((e.context.job_id ?? "").length).toBeGreaterThan(0);
        expect(e.lineage_id.length).toBeGreaterThan(0);
      }
      const jobIds = new Set(events.map((e) => e.context.job_id));
      const lineageIds = new Set(events.map((e) => e.lineage_id));
      expect(jobIds.size).toBe(1);
      expect(lineageIds.size).toBe(3);
    });
  });

  describe("validation + error paths", () => {
    it("rejects an action that does not belong to the mill domain", async () => {
      // "turning" is a lathe action — invalid for domain mill.
      const bad = { ...mkIntent("roughing"), action: "turning" } as unknown as DomainAGIIntent;
      const result = await millingAGIMasterEngine.orchestrate(bad);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INTENT");
      expect(() => DomainAGIResultSchema.parse(result)).not.toThrow();
    });

    it("rejects a valid non-mill intent routed to the mill engine", async () => {
      // lathe + turning is a VALID intent — it just belongs to a different
      // domain, so orchestrate must reject with WRONG_DOMAIN (router misroute).
      const wrong = {
        ...mkIntent("roughing"),
        domain: "lathe",
        action: "turning",
      } as unknown as DomainAGIIntent;
      const result = await millingAGIMasterEngine.orchestrate(wrong);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("WRONG_DOMAIN");
    });
  });

  describe("intent to request mapping", () => {
    it("infers ISO group from a known steel material without an uncertainty warning", async () => {
      const { fn: publish } = mkPublishSpy();
      const result = await millingAGIMasterEngine.orchestrate(
        mkIntent("roughing", { material: "4140-steel" }),
        { publishOutcome: publish },
      );
      expect(result.warnings.some((w) => w.includes("ISO machining group inferred"))).toBe(false);
    });

    it("warns when the ISO group cannot be inferred from the material name", async () => {
      const { fn: publish } = mkPublishSpy();
      const result = await millingAGIMasterEngine.orchestrate(
        mkIntent("roughing", { material: "G-10 fiberglass laminate" }),
        { publishOutcome: publish },
      );
      expect(result.warnings.some((w) => w.includes("ISO machining group inferred"))).toBe(true);
    });

    it("produces the uniform MillDecisionValue shape for every decision", async () => {
      const { fn: publish } = mkPublishSpy();
      const result = await millingAGIMasterEngine.orchestrate(mkIntent("drilling"), {
        publishOutcome: publish,
      });
      expect(result.decisions).toHaveLength(3);
      for (const d of result.decisions) {
        const value = d.value as MillDecisionValue;
        expect(typeof value.selected).toBe("string");
        expect(value.selected.length).toBeGreaterThan(0);
        expect(value.selected).toBe(value.enginePick); // non-consensus run
        expect(value.consensusOverride).toBe(false);
        expect(typeof value.detail).toBe("object");
        expect(value.detail).not.toBeNull();
      }
    });
  });

  describe("reasoning failure paths (failResult)", () => {
    it("returns REASONING_FAILED when the reasoning pipeline throws", async () => {
      // Subclass overrides reason() to throw — exercises the orchestrate()
      // catch that would otherwise be a defensive guard with no coverage.
      class ThrowingMill extends MillingAGIMasterEngine {
        async reason(): Promise<MillAGIResponse> {
          throw new Error("simulated reasoning crash");
        }
      }
      const result = await new ThrowingMill().orchestrate(mkIntent("roughing"));
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("REASONING_FAILED");
      expect(result.error?.stage).toBe("reasoning");
      expect(() => DomainAGIResultSchema.parse(result)).not.toThrow();
    });

    it("returns REASONING_INCOMPLETE when reason() yields no tool/strategy", async () => {
      class IncompleteMill extends MillingAGIMasterEngine {
        async reason(req: MillAGIRequest): Promise<MillAGIResponse> {
          const r = await super.reason(req);
          return { ...r, tool_recommendation: undefined, strategy_recommendation: undefined };
        }
      }
      const result = await new IncompleteMill().orchestrate(mkIntent("roughing"));
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("REASONING_INCOMPLETE");
    });

    it("publish seam throwing does not fail orchestration — degrades soft with a warning", async () => {
      const result = await millingAGIMasterEngine.orchestrate(mkIntent("roughing"), {
        publishOutcome: () => {
          throw new Error("feedback bus offline");
        },
      });
      expect(result.success).toBe(true);
      expect(result.decisions).toHaveLength(3);
      expect(result.warnings.some((w) => w.includes("could not be published"))).toBe(true);
    });
  });

  describe("legacy API preservation", () => {
    it("leaves the legacy reason() entry point intact", async () => {
      const r = await millingAGIMasterEngine.reason({ intent: "Rough a pocket", iso_group: "N" });
      expect(r.success).toBe(true);
      expect(r.tool_recommendation?.type).toBe("end_mill");
      expect(r.strategy_recommendation?.strategy).toBe("adaptive_clearing");
    });
  });
});
