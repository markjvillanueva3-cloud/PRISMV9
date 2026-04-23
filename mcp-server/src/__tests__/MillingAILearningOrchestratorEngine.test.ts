/**
 * MillingAILearningOrchestratorEngine tests — MILL-MASTER-P1-U09-L2-AGG
 * Covers core/extended member registry, capability routing (explicit + auto
 * heuristics), invoke() success + failure paths, and the self-awareness report.
 */

import { describe, expect, it } from "vitest";
import {
  millingAILearningOrchestratorEngine,
  MillingAILearningOrchestratorEngine,
  type MillingAILearningMember,
} from "../engines/MillingAILearningOrchestratorEngine.js";

const EXPECTED_CORE_COUNT = 7;
const EXPECTED_CORE_MEMBERS: MillingAILearningMember[] = [
  "ultimate_ai",
  "strategy_library",
  "reinforcement_learning",
  "pattern_miner",
  "online_learning_tracker",
  "reasoning_trace_ledger",
  "meta_learning",
];

describe("MillingAILearningOrchestratorEngine.listCore + coreCount", () => {
  it("listCore() returns exactly the 7 canonical member ids in declaration order", () => {
    const members = millingAILearningOrchestratorEngine.listCore();
    expect(members).toEqual(EXPECTED_CORE_MEMBERS);
  });

  it("coreCount() returns 7 matching listCore().length", () => {
    expect(millingAILearningOrchestratorEngine.coreCount()).toBe(EXPECTED_CORE_COUNT);
    expect(millingAILearningOrchestratorEngine.coreCount())
      .toBe(millingAILearningOrchestratorEngine.listCore().length);
  });

  it("listCore() members are unique (no duplicates)", () => {
    const members = millingAILearningOrchestratorEngine.listCore();
    expect(new Set(members).size).toBe(members.length);
  });
});

describe("MillingAILearningOrchestratorEngine extended member registry", () => {
  it("starts empty, can register names, and lists them in sorted order", () => {
    const isolated = new MillingAILearningOrchestratorEngine();
    expect(isolated.listExtended()).toEqual([]);
    isolated.registerExtended("ZetaEngine");
    isolated.registerExtended("AlphaEngine");
    isolated.registerExtended("MikeEngine");
    expect(isolated.listExtended()).toEqual(["AlphaEngine", "MikeEngine", "ZetaEngine"]);
  });

  it("deduplicates repeated registrations of the same name", () => {
    const isolated = new MillingAILearningOrchestratorEngine();
    isolated.registerExtended("Foo");
    isolated.registerExtended("Foo");
    isolated.registerExtended("Foo");
    expect(isolated.listExtended()).toEqual(["Foo"]);
  });

  it("totalCount() equals coreCount() + extended members", () => {
    const isolated = new MillingAILearningOrchestratorEngine();
    expect(isolated.totalCount()).toBe(EXPECTED_CORE_COUNT);
    isolated.registerExtended("A");
    isolated.registerExtended("B");
    expect(isolated.totalCount()).toBe(EXPECTED_CORE_COUNT + 2);
  });
});

describe("MillingAILearningOrchestratorEngine.route — explicit capability", () => {
  it("routes capability 'analyze' → ultimate_ai", () => {
    const out = millingAILearningOrchestratorEngine.route({ capability: "analyze" });
    expect(out.selected_member).toBe("ultimate_ai");
    expect(out.capability).toBe("analyze");
    expect(out.rationale).toContain("explicit");
  });

  it("routes capability 'recommend_strategy' → strategy_library", () => {
    const out = millingAILearningOrchestratorEngine.route({ capability: "recommend_strategy" });
    expect(out.selected_member).toBe("strategy_library");
    expect(out.capability).toBe("recommend_strategy");
  });

  it("routes capability 'optimize_params' → reinforcement_learning", () => {
    const out = millingAILearningOrchestratorEngine.route({ capability: "optimize_params" });
    expect(out.selected_member).toBe("reinforcement_learning");
  });

  it("routes capability 'mine_patterns' → pattern_miner", () => {
    const out = millingAILearningOrchestratorEngine.route({ capability: "mine_patterns" });
    expect(out.selected_member).toBe("pattern_miner");
  });

  it("routes capability 'track_progress' → online_learning_tracker", () => {
    const out = millingAILearningOrchestratorEngine.route({ capability: "track_progress" });
    expect(out.selected_member).toBe("online_learning_tracker");
  });

  it("routes capability 'trace_reasoning' → reasoning_trace_ledger", () => {
    const out = millingAILearningOrchestratorEngine.route({ capability: "trace_reasoning" });
    expect(out.selected_member).toBe("reasoning_trace_ledger");
  });

  it("routes capability 'adapt_meta' → meta_learning", () => {
    const out = millingAILearningOrchestratorEngine.route({ capability: "adapt_meta" });
    expect(out.selected_member).toBe("meta_learning");
  });
});

describe("MillingAILearningOrchestratorEngine.route — auto heuristics", () => {
  it("picks pattern_miner when has_historical_data is true", () => {
    const out = millingAILearningOrchestratorEngine.route({
      capability: "auto",
      has_historical_data: true,
    });
    expect(out.selected_member).toBe("pattern_miner");
    expect(out.capability).toBe("mine_patterns");
    expect(out.rationale).toContain("historical");
  });

  it("picks meta_learning when reasoning_depth is 'deep' (and no historical data)", () => {
    const out = millingAILearningOrchestratorEngine.route({
      capability: "auto",
      reasoning_depth: "deep",
    });
    expect(out.selected_member).toBe("meta_learning");
    expect(out.capability).toBe("adapt_meta");
    expect(out.rationale).toContain("deep");
  });

  it("picks ultimate_ai as the default when auto with no hints", () => {
    const out = millingAILearningOrchestratorEngine.route({ capability: "auto" });
    expect(out.selected_member).toBe("ultimate_ai");
    expect(out.capability).toBe("analyze");
    expect(out.rationale).toContain("default");
  });

  it("picks ultimate_ai when no capability is specified at all (empty ctx)", () => {
    const out = millingAILearningOrchestratorEngine.route({});
    expect(out.selected_member).toBe("ultimate_ai");
    expect(out.capability).toBe("analyze");
  });

  it("prefers historical_data over deep reasoning_depth in auto mode", () => {
    const out = millingAILearningOrchestratorEngine.route({
      capability: "auto",
      has_historical_data: true,
      reasoning_depth: "deep",
    });
    expect(out.selected_member).toBe("pattern_miner");
  });
});

describe("MillingAILearningOrchestratorEngine.invoke — happy path", () => {
  it("invokes pattern_miner.mineHaas with an empty program list and returns zero totals", async () => {
    const out = await millingAILearningOrchestratorEngine.invoke("pattern_miner", "mineHaas", []);
    expect(out.ok).toBe(true);
    expect(out.member).toBe("pattern_miner");
    expect(out.method).toBe("mineHaas");
    const result = out.result as { total_programs: number; chip_load_samples: unknown[] };
    expect(result.total_programs).toBe(0);
    expect(result.chip_load_samples).toEqual([]);
  });
});

describe("MillingAILearningOrchestratorEngine.invoke — failure modes", () => {
  it("returns ok:false with 'Unknown core member' when member is not registered", async () => {
    const out = await millingAILearningOrchestratorEngine.invoke("not_a_member" as never, "anything");
    expect(out.ok).toBe(false);
    expect(out.member).toBe("not_a_member");
    expect(out.reason).toContain("Unknown core member");
    expect(out.reason).toContain("not_a_member");
  });

  it("returns ok:false with 'Method not on' when method does not exist on the engine", async () => {
    const out = await millingAILearningOrchestratorEngine.invoke(
      "pattern_miner",
      "thisMethodDoesNotExist",
    );
    expect(out.ok).toBe(false);
    expect(out.method).toBe("thisMethodDoesNotExist");
    expect(out.reason).toMatch(/Method 'thisMethodDoesNotExist' not on millPatternMinerEngine/);
  });

  it("treats empty method name as missing method rather than throwing", async () => {
    const out = await millingAILearningOrchestratorEngine.invoke("pattern_miner", "");
    expect(out.ok).toBe(false);
    expect(out.method).toBe("");
    expect(out.reason).toContain("Method ''");
  });
});

describe("MillingAILearningOrchestratorEngine.invocation counter", () => {
  it("starts at 0 on a fresh instance", () => {
    const isolated = new MillingAILearningOrchestratorEngine();
    expect(isolated.getInvocationCount()).toBe(0);
  });

  it("increments exactly once per invoke call regardless of outcome", async () => {
    const isolated = new MillingAILearningOrchestratorEngine();
    await isolated.invoke("pattern_miner", "mineHaas", []);
    expect(isolated.getInvocationCount()).toBe(1);
    await isolated.invoke("pattern_miner", "nonexistent");
    expect(isolated.getInvocationCount()).toBe(2);
    await isolated.invoke("bogus" as never, "whatever");
    expect(isolated.getInvocationCount()).toBe(3);
  });

  it("route() and registerExtended() do NOT touch the invocation counter", () => {
    const isolated = new MillingAILearningOrchestratorEngine();
    isolated.route({ capability: "analyze" });
    isolated.registerExtended("SomeEngine");
    expect(isolated.getInvocationCount()).toBe(0);
  });
});

describe("MillingAILearningOrchestratorEngine.getSelfAwareness", () => {
  it("reports engine_name, core members, counts, and running counter", async () => {
    const isolated = new MillingAILearningOrchestratorEngine();
    isolated.registerExtended("ExtA");
    isolated.registerExtended("ExtB");
    await isolated.invoke("pattern_miner", "mineHaas", []);
    const awareness = isolated.getSelfAwareness();
    expect(awareness.engine_name).toBe("MillingAILearningOrchestratorEngine");
    expect(awareness.core_members).toEqual(EXPECTED_CORE_MEMBERS);
    expect(awareness.core_count).toBe(EXPECTED_CORE_COUNT);
    expect(awareness.extended_count).toBe(2);
    expect(awareness.total_count).toBe(EXPECTED_CORE_COUNT + 2);
    expect(awareness.invocation_count).toBe(1);
  });

  it("singleton awareness mirrors listCore()/coreCount() exactly", () => {
    const awareness = millingAILearningOrchestratorEngine.getSelfAwareness();
    expect(awareness.core_count).toBe(millingAILearningOrchestratorEngine.coreCount());
    expect(awareness.core_members).toEqual(millingAILearningOrchestratorEngine.listCore());
    expect(awareness.engine_name).toBe("MillingAILearningOrchestratorEngine");
  });
});
