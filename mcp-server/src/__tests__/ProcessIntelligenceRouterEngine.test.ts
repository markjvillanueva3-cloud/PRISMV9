/**
 * Tests for ProcessIntelligenceRouterEngine
 * @see src/engines/ProcessIntelligenceRouterEngine.ts
 * @see U-XPROC-ROUTER-01 (top-level router for all 4 cross-process bridges)
 */

import { describe, it, expect } from "vitest";
import {
  ProcessIntelligenceRouterEngine,
  ROUTER_PROCESSES,
  PIPELINE_STAGES,
  type RouterProcessId,
  type PipelineStageId,
} from "../engines/ProcessIntelligenceRouterEngine.js";

// ============================================================================
// SECTION 1 — listSupportedStages()
// ============================================================================

describe("ProcessIntelligenceRouterEngine.listSupportedStages()", () => {
  it("returns 5 stages in canonical execution order", () => {
    const stages = ProcessIntelligenceRouterEngine.listSupportedStages();
    expect(stages).toHaveLength(5);
    expect(stages.map((s) => s.stage)).toEqual([
      "classify",
      "feature",
      "speedfeed",
      "post",
      "ai",
    ]);
  });

  it("classify stage is bridged by CrossProcessAIBridge", () => {
    const stages = ProcessIntelligenceRouterEngine.listSupportedStages();
    const classify = stages.find((s) => s.stage === "classify");
    expect(classify?.bridge).toBe("CrossProcessAIBridge");
  });

  it("feature stage is bridged by CrossProcessFeatureBridge", () => {
    const stages = ProcessIntelligenceRouterEngine.listSupportedStages();
    const feat = stages.find((s) => s.stage === "feature");
    expect(feat?.bridge).toBe("CrossProcessFeatureBridge");
  });

  it("speedfeed stage is bridged by CrossProcessSpeedFeedBridge", () => {
    const stages = ProcessIntelligenceRouterEngine.listSupportedStages();
    const sf = stages.find((s) => s.stage === "speedfeed");
    expect(sf?.bridge).toBe("CrossProcessSpeedFeedBridge");
  });

  it("post stage is bridged by CrossProcessPostBridge", () => {
    const stages = ProcessIntelligenceRouterEngine.listSupportedStages();
    const post = stages.find((s) => s.stage === "post");
    expect(post?.bridge).toBe("CrossProcessPostBridge");
  });

  it("each stage has a non-empty description", () => {
    const stages = ProcessIntelligenceRouterEngine.listSupportedStages();
    for (const s of stages) {
      expect(s.description.length).toBeGreaterThan(10);
    }
  });
});

// ============================================================================
// SECTION 2 — route(): lightweight classification + bridge recommendation
// ============================================================================

describe("ProcessIntelligenceRouterEngine.route()", () => {
  it("classifies a milling intent and recommends 4 downstream bridges", async () => {
    const out = await ProcessIntelligenceRouterEngine.route({
      intent: "make a pocket on the VMX mill in 4140",
    });
    expect(out.process).toBe("mill");
    expect(out.classification.process).toBe("mill");
    expect(out.recommended_bridges).toEqual(["feature", "speedfeed", "post", "ai"]);
    expect(out.warnings).toEqual([]);
  });

  it("classifies a turning intent as lathe", async () => {
    const out = await ProcessIntelligenceRouterEngine.route({
      intent: "turn an external thread on the lathe with chuck",
    });
    expect(out.process).toBe("lathe");
  });

  it("classifies a wire-EDM intent as wedm", async () => {
    const out = await ProcessIntelligenceRouterEngine.route({
      intent: "wire EDM a tapered profile in D2 with skim passes",
    });
    expect(out.process).toBe("wedm");
  });

  it("respects explicit context.process override (forces wedm)", async () => {
    const out = await ProcessIntelligenceRouterEngine.route({
      intent: "ambiguous",
      process: "wedm",
    });
    expect(out.process).toBe("wedm");
    expect(out.classification.confidence).toBe(1.0);
  });

  it("biases on features (groove_external → lathe)", async () => {
    const out = await ProcessIntelligenceRouterEngine.route({
      intent: "make a part",
      features: ["groove_external"],
    });
    expect(out.process).toBe("lathe");
  });

  it("surfaces low-confidence warning when intent has no signals", async () => {
    const out = await ProcessIntelligenceRouterEngine.route({
      intent: "do the thing",
    });
    expect(out.warnings.some((w) => w.includes("low classification confidence"))).toBe(true);
  });

  it("does NOT warn on low confidence when caller provided explicit process", async () => {
    const out = await ProcessIntelligenceRouterEngine.route({
      intent: "do the thing",
      process: "mill",
    });
    expect(out.warnings).toEqual([]);
  });

  it("includes process + confidence + recommended_bridges in notes", async () => {
    const out = await ProcessIntelligenceRouterEngine.route({
      intent: "face mill 6061 aluminum on VMX",
      material: "6061",
    });
    expect(out.notes.some((n) => n.includes("process=mill"))).toBe(true);
    expect(out.notes.some((n) => n.includes("confidence="))).toBe(true);
    expect(out.notes.some((n) => n.includes("recommended_bridges="))).toBe(true);
    expect(out.notes.some((n) => n.includes("material=6061"))).toBe(true);
  });

  it("throws on missing request object", async () => {
    const bad = undefined as unknown as Parameters<typeof ProcessIntelligenceRouterEngine.route>[0];
    await expect(ProcessIntelligenceRouterEngine.route(bad)).rejects.toThrow(
      /request object required/,
    );
  });

  it("throws on missing intent", async () => {
    const bad = {} as unknown as Parameters<typeof ProcessIntelligenceRouterEngine.route>[0];
    await expect(ProcessIntelligenceRouterEngine.route(bad)).rejects.toThrow(
      /must be a non-empty string/,
    );
  });

  it("throws on empty intent", async () => {
    await expect(ProcessIntelligenceRouterEngine.route({ intent: "" })).rejects.toThrow(
      /non-empty/,
    );
  });

  it("throws on invalid process override", async () => {
    const badProc = "ultrasonic" as unknown as RouterProcessId;
    await expect(
      ProcessIntelligenceRouterEngine.route({ intent: "make a part", process: badProc }),
    ).rejects.toThrow(/not in \[mill, lathe, wedm\]/);
  });
});

// ============================================================================
// SECTION 3 — fullPipeline(): default stages with no opt-in bodies
// ============================================================================

describe("ProcessIntelligenceRouterEngine.fullPipeline() — empty pipeline", () => {
  it("classifies + skips all 4 downstream stages when no bodies provided", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "make a pocket on the VMX mill",
    });
    expect(out.process).toBe("mill");
    expect(out.stages_executed).toEqual(["classify"]);
    expect(out.stages_skipped.map((s) => s.stage).sort()).toEqual([
      "ai",
      "feature",
      "post",
      "speedfeed",
    ]);
    expect(out.stages_failed).toEqual([]);
  });

  it("each skip carries a reason explaining why the stage was skipped", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "make a pocket",
    });
    for (const skip of out.stages_skipped) {
      expect(skip.reason.length).toBeGreaterThan(0);
      expect(skip.reason).toMatch(/no .*_request provided|not in `stages` filter/);
    }
  });

  it("notes capture the pipeline summary (executed + skipped + classification)", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "wire EDM a profile",
    });
    expect(out.notes.some((n) => n.includes("process=wedm"))).toBe(true);
    expect(out.notes.some((n) => n.includes("executed=[classify]"))).toBe(true);
    expect(out.notes.some((n) => n.includes("skipped=["))).toBe(true);
  });
});

// ============================================================================
// SECTION 4 — fullPipeline(): per-stage execution
// ============================================================================

describe("ProcessIntelligenceRouterEngine.fullPipeline() — feature stage", () => {
  it("runs feature stage when feature_request is supplied", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "make a pocket",
      feature_request: { feature: "pocket_2d" },
    });
    expect(out.stages_executed).toContain("feature");
    expect(out.feature_result?.feature).toBe("pocket_2d");
    expect(out.feature_result?.recommended_process).toBe("mill");
  });

  it("captures feature stage failure when bridge throws", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "make a part",
      feature_request: { feature: "totally_made_up_feature" },
    });
    expect(out.stages_failed.some((f) => f.stage === "feature")).toBe(true);
    expect(out.warnings.some((w) => w.includes("1 stage(s) failed"))).toBe(true);
  });
});

describe("ProcessIntelligenceRouterEngine.fullPipeline() — speedfeed stage", () => {
  it("runs speedfeed stage for mill carbide on aluminum", { timeout: 30_000 }, async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "rough mill carbide on aluminum",
      sf_request: {
        process: "mill",
        material: "aluminum",
        tool_material: "Carbide",
        mill_operation: "roughing",
        tool_diameter_mm: 12,
        number_of_teeth: 4,
        material_hardness_hb: 95,
      },
    });
    expect(out.stages_executed).toContain("speedfeed");
    expect(out.speedfeed_result?.process).toBe("mill");
    expect((out.speedfeed_result?.spindle_rpm ?? 0)).toBeGreaterThan(0);
    expect((out.speedfeed_result?.feed_rate_mm_min ?? 0)).toBeGreaterThan(0);
  });

  it("runs speedfeed stage for wedm on steel at thin thickness", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "wire EDM steel",
      sf_request: {
        process: "wedm",
        material: "steel",
        workpiece_thickness_mm: 4,
      },
    });
    expect(out.stages_executed).toContain("speedfeed");
    expect(out.speedfeed_result?.process).toBe("wedm");
    expect(out.speedfeed_result?.pulse_on_us).toBe(2);
    expect(out.speedfeed_result?.current_A).toBe(8);
  });

  it("captures speedfeed stage failure on invalid material", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "wedm",
      sf_request: {
        process: "wedm",
        material: "unobtainium",
        workpiece_thickness_mm: 10,
      },
    });
    expect(out.stages_failed.some((f) => f.stage === "speedfeed")).toBe(true);
  });
});

describe("ProcessIntelligenceRouterEngine.fullPipeline() — ai stage", () => {
  it("runs ai stage in dry_run mode without invoking the heavy orchestrator", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "milling pocket",
      ai_request: {
        intent: "wisdom query on milling",
        process: "mill",
        dry_run: true,
      },
    });
    expect(out.stages_executed).toContain("ai");
    expect(out.ai_result?.dry_run).toBe(true);
    expect(out.ai_result?.routed_to).toBe("MillMasterOrchestratorFacadeEngine.orchestrate");
  });

  it("force_ai_dry_run forces dry_run even if ai_request omits it", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "lathe groove",
      ai_request: { intent: "lathe orchestration", process: "lathe" },
      force_ai_dry_run: true,
    });
    expect(out.stages_executed).toContain("ai");
    expect(out.ai_result?.dry_run).toBe(true);
  });

  it("captures ai stage failure when ai_request has no matching live request body", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "live mill orchestration",
      ai_request: {
        intent: "make a pocket on the VMX mill",
        // dry_run omitted; classified mill but no mill_request → throws
      },
    });
    expect(out.stages_failed.some((f) => f.stage === "ai")).toBe(true);
  });
});

// ============================================================================
// SECTION 5 — fullPipeline(): stage filtering
// ============================================================================

describe("ProcessIntelligenceRouterEngine.fullPipeline() — stage filtering", () => {
  it("restricts execution to stages listed in `stages`", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "milling",
      stages: ["classify", "feature"],
      feature_request: { feature: "pocket_2d" },
    });
    expect(out.stages_executed).toEqual(["classify", "feature"]);
    expect(
      out.stages_skipped.some(
        (s) => s.stage === "ai" && s.reason.includes("not in `stages` filter"),
      ),
    ).toBe(true);
  });

  it("throws when stages contains an unknown stage id", async () => {
    const badStages = ["bogus_stage"] as unknown as PipelineStageId[];
    await expect(
      ProcessIntelligenceRouterEngine.fullPipeline({
        intent: "milling",
        stages: badStages,
      }),
    ).rejects.toThrow(/invalid stage/);
  });

  it("empty stages array results in everything skipped", async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "milling",
      stages: [],
    });
    expect(out.stages_executed).toEqual([]);
    expect(out.stages_skipped).toHaveLength(5);
  });
});

// ============================================================================
// SECTION 6 — fullPipeline(): combined multi-stage execution
// ============================================================================

describe("ProcessIntelligenceRouterEngine.fullPipeline() — combined execution", () => {
  it("runs classify + feature + speedfeed in one call (mill pocket on aluminum)", { timeout: 30_000 }, async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "rough mill aluminum pocket",
      feature_request: { feature: "pocket_2d" },
      sf_request: {
        process: "mill",
        material: "aluminum",
        tool_material: "Carbide",
        mill_operation: "roughing",
        tool_diameter_mm: 12,
        number_of_teeth: 4,
        material_hardness_hb: 95,
      },
    });
    expect(out.stages_executed.sort()).toEqual(["classify", "feature", "speedfeed"]);
    expect(out.feature_result?.feature).toBe("pocket_2d");
    expect((out.speedfeed_result?.spindle_rpm ?? 0)).toBeGreaterThan(0);
    expect(out.stages_failed).toEqual([]);
  });

  it("partial failure (one stage fails, others continue)", { timeout: 30_000 }, async () => {
    const out = await ProcessIntelligenceRouterEngine.fullPipeline({
      intent: "mixed pipeline",
      feature_request: { feature: "pocket_2d" }, // valid
      sf_request: {
        process: "wedm",
        material: "unobtainium", // will fail
        workpiece_thickness_mm: 10,
      },
    });
    expect(out.stages_executed).toContain("feature");
    expect(out.stages_failed.some((f) => f.stage === "speedfeed")).toBe(true);
    expect(out.feature_result?.feature).toBe("pocket_2d");
  });
});

// ============================================================================
// SECTION 7 — error paths on fullPipeline()
// ============================================================================

describe("ProcessIntelligenceRouterEngine.fullPipeline() — error paths", () => {
  it("throws on missing request object", async () => {
    const bad = undefined as unknown as Parameters<
      typeof ProcessIntelligenceRouterEngine.fullPipeline
    >[0];
    await expect(ProcessIntelligenceRouterEngine.fullPipeline(bad)).rejects.toThrow(
      /request object required/,
    );
  });

  it("throws on missing intent", async () => {
    const bad = {} as unknown as Parameters<typeof ProcessIntelligenceRouterEngine.fullPipeline>[0];
    await expect(ProcessIntelligenceRouterEngine.fullPipeline(bad)).rejects.toThrow(
      /must be a non-empty string/,
    );
  });

  it("throws on empty intent", async () => {
    await expect(
      ProcessIntelligenceRouterEngine.fullPipeline({ intent: "   " }),
    ).rejects.toThrow(/non-empty/);
  });

  it("throws on invalid process override", async () => {
    const badProc = "ultrasonic" as unknown as RouterProcessId;
    await expect(
      ProcessIntelligenceRouterEngine.fullPipeline({ intent: "do something", process: badProc }),
    ).rejects.toThrow(/not in \[mill, lathe, wedm\]/);
  });

  it("throws when stages is not an array", async () => {
    const badStages = "ai" as unknown as PipelineStageId[];
    await expect(
      ProcessIntelligenceRouterEngine.fullPipeline({ intent: "milling", stages: badStages }),
    ).rejects.toThrow(/stages must be an array/);
  });
});

// ============================================================================
// SECTION 8 — module exports
// ============================================================================

describe("Module exports — constants", () => {
  it("ROUTER_PROCESSES has exactly mill, lathe, wedm (in this order)", () => {
    expect(ROUTER_PROCESSES).toEqual(["mill", "lathe", "wedm"]);
  });

  it("PIPELINE_STAGES has 5 stages in canonical execution order", () => {
    expect(PIPELINE_STAGES).toEqual(["classify", "feature", "speedfeed", "post", "ai"]);
  });
});
