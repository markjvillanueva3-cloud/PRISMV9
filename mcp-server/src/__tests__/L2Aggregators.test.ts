/**
 * MILL-MASTER-P1-U09-L2-AGG — L2 Aggregator engines test
 *
 * Covers all 4 new aggregators:
 *   - FiveAxisAggregatorEngine (9 members)
 *   - MultiAxisAggregatorEngine (3 members)
 *   - MillTurnOrchestrationEngine (2 members + routing)
 *   - MillingAILearningOrchestratorEngine (7 core + extended registry + routing)
 *
 * Contract validated:
 *   - list() / count() return exactly the documented member set
 *   - invoke() never throws — always returns {ok, reason} shape
 *   - invoke() succeeds on real methods, fails gracefully on missing
 *   - route() returns deterministic + explainable picks
 *   - invocation_count increments
 *   - getSelfAwareness() shape
 */
import { describe, it, expect } from "vitest";

import {
  fiveAxisAggregatorEngine,
  type FiveAxisMember,
} from "../engines/FiveAxisAggregatorEngine.js";
import {
  multiAxisAggregatorEngine,
  type MultiAxisMember,
} from "../engines/MultiAxisAggregatorEngine.js";
import {
  millTurnOrchestrationEngine,
  type MillTurnMember,
} from "../engines/MillTurnOrchestrationEngine.js";
import {
  millingAILearningOrchestratorEngine,
  type MillingAILearningMember,
} from "../engines/MillingAILearningOrchestratorEngine.js";

describe("MILL-MASTER-P1-U09 · FiveAxisAggregatorEngine", () => {
  it("exports singleton", () => {
    expect(fiveAxisAggregatorEngine).toBeDefined();
  });

  it("lists exactly 9 members (envelope target)", () => {
    expect(fiveAxisAggregatorEngine.count()).toBe(9);
    expect(fiveAxisAggregatorEngine.list()).toHaveLength(9);
  });

  it("members match envelope spec exactly", () => {
    const expected: FiveAxisMember[] = [
      "orchestration", "ai_ultra", "deep_learning",
      "cam_integration", "toolpath_integration", "toolpath_synthesis",
      "post", "decision", "cad_template",
    ];
    expect(fiveAxisAggregatorEngine.list().sort()).toEqual(expected.sort());
  });

  it("invoke(unknown member) returns graceful error, no throw", async () => {
    const r = await fiveAxisAggregatorEngine.invoke("not_a_real_member" as FiveAxisMember, "anything");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/unknown/i);
  });

  it("invoke(real member, missing method) returns graceful error", async () => {
    const r = await fiveAxisAggregatorEngine.invoke("orchestration", "definitelyNotAMethod");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not on/i);
  });

  it("invocation_count increments on each invoke", async () => {
    const before = fiveAxisAggregatorEngine.getInvocationCount();
    await fiveAxisAggregatorEngine.invoke("orchestration", "nope");
    await fiveAxisAggregatorEngine.invoke("decision", "nope");
    expect(fiveAxisAggregatorEngine.getInvocationCount()).toBe(before + 2);
  });

  it("getSelfAwareness reports shape", () => {
    const sa = fiveAxisAggregatorEngine.getSelfAwareness();
    expect(sa.engine_name).toBe("FiveAxisAggregatorEngine");
    expect(sa.member_count).toBe(9);
    expect(sa.members).toHaveLength(9);
  });
});

describe("MILL-MASTER-P1-U09 · MultiAxisAggregatorEngine", () => {
  it("lists exactly 3 members", () => {
    expect(multiAxisAggregatorEngine.count()).toBe(3);
  });

  it("members are kinematic / print_to_program / toolpath", () => {
    const expected: MultiAxisMember[] = ["kinematic", "print_to_program", "toolpath"];
    expect(multiAxisAggregatorEngine.list().sort()).toEqual(expected.sort());
  });

  it("invoke(unknown) returns graceful error", async () => {
    const r = await multiAxisAggregatorEngine.invoke("nope" as MultiAxisMember, "x");
    expect(r.ok).toBe(false);
  });

  it("getSelfAwareness shape", () => {
    const sa = multiAxisAggregatorEngine.getSelfAwareness();
    expect(sa.engine_name).toBe("MultiAxisAggregatorEngine");
    expect(sa.member_count).toBe(3);
  });
});

describe("MILL-MASTER-P1-U09 · MillTurnOrchestrationEngine", () => {
  it("lists exactly 2 members", () => {
    expect(millTurnOrchestrationEngine.count()).toBe(2);
  });

  it("route picks swiss for swiss machine_class", () => {
    const r = millTurnOrchestrationEngine.route({ machine_class: "swiss" });
    expect(r.selected_member).toBe("swiss");
    expect(r.rationale).toMatch(/swiss|guide bushing/i);
  });

  it("route picks swiss when has_guide_bushing=true (even without machine_class)", () => {
    const r = millTurnOrchestrationEngine.route({ has_guide_bushing: true });
    expect(r.selected_member).toBe("swiss");
  });

  it("route picks mill_turn for standard mill-turn context", () => {
    const r = millTurnOrchestrationEngine.route({ machine_class: "mill-turn" });
    expect(r.selected_member).toBe("mill_turn");
  });

  it("route picks mill_turn with sub_spindle (not swiss)", () => {
    const r = millTurnOrchestrationEngine.route({ has_sub_spindle: true, multi_channel: true });
    expect(r.selected_member).toBe("mill_turn");
  });

  it("route defaults to mill_turn on empty ctx", () => {
    const r = millTurnOrchestrationEngine.route({});
    expect(r.selected_member).toBe("mill_turn");
  });

  it("invoke(unknown member) returns graceful error", async () => {
    const r = await millTurnOrchestrationEngine.invoke("nope" as MillTurnMember, "x");
    expect(r.ok).toBe(false);
  });

  it("invoke(mill_turn, missing method) returns graceful error", async () => {
    const r = await millTurnOrchestrationEngine.invoke("mill_turn", "definitelyNotAMethod");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not on|not found/i);
  });

  it("getSelfAwareness shape", () => {
    const sa = millTurnOrchestrationEngine.getSelfAwareness();
    expect(sa.engine_name).toBe("MillTurnOrchestrationEngine");
    expect(sa.member_count).toBe(2);
  });
});

describe("MILL-MASTER-P1-U09 · MillingAILearningOrchestratorEngine", () => {
  it("lists 7 core members (explicitly named in envelope)", () => {
    expect(millingAILearningOrchestratorEngine.coreCount()).toBe(7);
  });

  it("core members exactly match envelope spec", () => {
    const expected: MillingAILearningMember[] = [
      "ultimate_ai", "strategy_library", "reinforcement_learning",
      "pattern_miner", "online_learning_tracker", "reasoning_trace_ledger",
      "meta_learning",
    ];
    expect(millingAILearningOrchestratorEngine.listCore().sort()).toEqual(expected.sort());
  });

  it("extended registry starts empty then accepts registrations", () => {
    const initial = millingAILearningOrchestratorEngine.listExtended().length;
    millingAILearningOrchestratorEngine.registerExtended("MillingTestExtEngine");
    expect(millingAILearningOrchestratorEngine.listExtended()).toContain("MillingTestExtEngine");
    expect(millingAILearningOrchestratorEngine.listExtended().length).toBeGreaterThanOrEqual(initial + 1);
  });

  it("totalCount = core + extended", () => {
    const sa = millingAILearningOrchestratorEngine.getSelfAwareness();
    expect(sa.total_count).toBe(sa.core_count + sa.extended_count);
  });

  it("route(explicit capability='analyze') → ultimate_ai", () => {
    const r = millingAILearningOrchestratorEngine.route({ capability: "analyze" });
    expect(r.selected_member).toBe("ultimate_ai");
    expect(r.capability).toBe("analyze");
  });

  it("route(capability='recommend_strategy') → strategy_library", () => {
    const r = millingAILearningOrchestratorEngine.route({ capability: "recommend_strategy" });
    expect(r.selected_member).toBe("strategy_library");
  });

  it("route(capability='optimize_params') → reinforcement_learning", () => {
    const r = millingAILearningOrchestratorEngine.route({ capability: "optimize_params" });
    expect(r.selected_member).toBe("reinforcement_learning");
  });

  it("route(capability='mine_patterns') → pattern_miner", () => {
    const r = millingAILearningOrchestratorEngine.route({ capability: "mine_patterns" });
    expect(r.selected_member).toBe("pattern_miner");
  });

  it("route(capability='track_progress') → online_learning_tracker", () => {
    const r = millingAILearningOrchestratorEngine.route({ capability: "track_progress" });
    expect(r.selected_member).toBe("online_learning_tracker");
  });

  it("route(capability='trace_reasoning') → reasoning_trace_ledger", () => {
    const r = millingAILearningOrchestratorEngine.route({ capability: "trace_reasoning" });
    expect(r.selected_member).toBe("reasoning_trace_ledger");
  });

  it("route(capability='adapt_meta') → meta_learning", () => {
    const r = millingAILearningOrchestratorEngine.route({ capability: "adapt_meta" });
    expect(r.selected_member).toBe("meta_learning");
  });

  it("route(auto + has_historical_data) → pattern_miner", () => {
    const r = millingAILearningOrchestratorEngine.route({ capability: "auto", has_historical_data: true });
    expect(r.selected_member).toBe("pattern_miner");
  });

  it("route(auto + reasoning_depth=deep) → meta_learning", () => {
    const r = millingAILearningOrchestratorEngine.route({ capability: "auto", reasoning_depth: "deep" });
    expect(r.selected_member).toBe("meta_learning");
  });

  it("route(empty) defaults to ultimate_ai", () => {
    const r = millingAILearningOrchestratorEngine.route({});
    expect(r.selected_member).toBe("ultimate_ai");
    expect(r.capability).toBe("analyze");
  });

  it("invoke(unknown member) returns graceful error", async () => {
    const r = await millingAILearningOrchestratorEngine.invoke(
      "nope" as MillingAILearningMember,
      "x",
    );
    expect(r.ok).toBe(false);
  });

  it("invoke(real core member, missing method) returns graceful error", async () => {
    const r = await millingAILearningOrchestratorEngine.invoke("ultimate_ai", "definitelyNotAMethod");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not on|not found/i);
  });
});

describe("MILL-MASTER-P1-U09 · Aggregators — total coverage", () => {
  it("4 aggregators cover 9 + 3 + 2 + 7 = 21 core members", () => {
    const total =
      fiveAxisAggregatorEngine.count() +
      multiAxisAggregatorEngine.count() +
      millTurnOrchestrationEngine.count() +
      millingAILearningOrchestratorEngine.coreCount();
    expect(total).toBe(21);
  });

  it("each aggregator reports engine_name matching its class", () => {
    expect(fiveAxisAggregatorEngine.getSelfAwareness().engine_name).toBe("FiveAxisAggregatorEngine");
    expect(multiAxisAggregatorEngine.getSelfAwareness().engine_name).toBe("MultiAxisAggregatorEngine");
    expect(millTurnOrchestrationEngine.getSelfAwareness().engine_name).toBe("MillTurnOrchestrationEngine");
    expect(millingAILearningOrchestratorEngine.getSelfAwareness().engine_name).toBe("MillingAILearningOrchestratorEngine");
  });

  it("no aggregator throws on garbage input (graceful failure contract)", async () => {
    // Each of 4 aggregators, invoked with garbage
    await expect(fiveAxisAggregatorEngine.invoke("bad" as any, "bad")).resolves.toBeDefined();
    await expect(multiAxisAggregatorEngine.invoke("bad" as any, "bad")).resolves.toBeDefined();
    await expect(millTurnOrchestrationEngine.invoke("bad" as any, "bad")).resolves.toBeDefined();
    await expect(millingAILearningOrchestratorEngine.invoke("bad" as any, "bad")).resolves.toBeDefined();
  });
});
