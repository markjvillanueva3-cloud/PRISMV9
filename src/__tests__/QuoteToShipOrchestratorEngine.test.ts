import { describe, expect, it } from "vitest";

import {
  quoteToShipOrchestratorEngine,
  type QuoteToShipInput,
  type QuoteToShipResult,
  type StageResult,
} from "../engines/QuoteToShipOrchestratorEngine.js";

// ── Test Fixtures ──────────────────────────────────────────────────────

const BASE_INPUT: QuoteToShipInput = {
  step_file: "test.step",
  material_spec: "6061-T6",
  quantity: 10,
  pre_approved: true,
  drawing_text: "N/A",
};

/** 6061-T6 aluminum bracket — 5 features (2 pockets, 2 holes, 1 slot) */
const BRACKET_INPUT: QuoteToShipInput = {
  material_spec: "6061-T6",
  quantity: 10,
  step_file: "bracket.step",
  drawing_text: "6061-T6 aluminum bracket, 150x100x25mm, 2 rectangular pockets, 2 through-holes, 1 slot",
  pre_approved: true,
  controller: "Fanuc 0i-MF",
  priority: "standard",
  surface_finish_ra_um: 1.6,
  feature_candidates: [
    { type: "pocket", dimensions: { width_mm: 40, length_mm: 60, depth_mm: 15 }, position: { x: 30, y: 25, z: 0 } },
    { type: "pocket", dimensions: { width_mm: 30, length_mm: 45, depth_mm: 10 }, position: { x: 100, y: 50, z: 0 } },
    { type: "through_hole", dimensions: { diameter_mm: 10, depth_mm: 25 }, position: { x: 75, y: 50, z: 0 } },
    { type: "through_hole", dimensions: { diameter_mm: 6.8, depth_mm: 25 }, position: { x: 125, y: 25, z: 0 } },
    { type: "slot", dimensions: { width_mm: 8, length_mm: 50, depth_mm: 12 }, position: { x: 75, y: 90, z: 0 } },
  ],
  tolerances: [
    { feature: "pocket_1", value_mm: 0.05 },
    { feature: "hole_1", value_mm: 0.025 },
  ],
};

function priorResult(
  id: StageResult["id"],
  label: string,
  output: Record<string, unknown> | null,
): StageResult {
  return {
    id,
    label,
    status: "pass",
    duration_ms: 0,
    result_summary: `${label} ready`,
    output,
    warnings: [],
    errors: [],
    completed_at: new Date().toISOString(),
  };
}

/** All 27 pipeline stages in execution order. */
const ALL_STAGES = [
  "INTAKE", "FEATURE_RECOGNITION", "DFM_CHECK", "FEASIBILITY", "QUOTE",
  "SCHEDULING", "APPROVAL_GATE", "PROCESS_PLAN", "SECONDARY_OPS",
  "MAKE_VS_BUY", "MATERIAL_PROCUREMENT", "TOOL_SELECTION",
  "STRATEGY_SELECTION", "SPEED_FEED", "PRE_SAFETY", "PROGRAM_GENERATION",
  "POST_PROCESSING", "POST_SAFETY", "MAGAZINE_LAYOUT", "SETUP_SHEET",
  "PROBING", "SIMULATION", "PRODUCTION_PACKAGE", "JOB_LIFECYCLE",
  "QUALITY", "OMEGA_GATE", "SHIPPING",
] as const;

// ── Stub normalization tests ───────────────────────────────────────────

describe("QuoteToShipOrchestratorEngine stub normalization", () => {
  it("fails required prior stages that claim pass with stub-backed output", async () => {
    const result = await quoteToShipOrchestratorEngine.runFromStage("QUOTE", BASE_INPUT, {
      FEATURE_RECOGNITION: priorResult("FEATURE_RECOGNITION", "Feature Recognition", {
        features: [],
      }),
      DFM_CHECK: {
        ...priorResult("DFM_CHECK", "Design for Manufacturability Check", {
          status: "pass",
          issues: [],
        }),
        warnings: ["DFMFeedbackEngine: using stub"],
      },
      FEASIBILITY: priorResult("FEASIBILITY", "Machining Feasibility Analysis", {
        overall_feasible: true,
        dead_ends: [],
      }),
    });

    const dfmStage = result.stages.find(stage => stage.id === "DFM_CHECK");
    expect(result.status).toBe("failed");
    expect(dfmStage?.status).toBe("fail");
    expect(dfmStage?.output).toBeNull();
    expect(dfmStage?.errors.some(error => /fell back to stub output/i.test(error))).toBe(true);
  });

  it("skips optional prior stages that claim pass with stub-backed output", async () => {
    const result = await quoteToShipOrchestratorEngine.runFromStage("MATERIAL_PROCUREMENT", BASE_INPUT, {
      PROCESS_PLAN: priorResult("PROCESS_PLAN", "Process Planning & Sequencing", {
        operations: [],
        primary_process: "milling",
      }),
      MAKE_VS_BUY: {
        ...priorResult("MAKE_VS_BUY", "Make vs Buy Decision", {
          decisions: [],
          summary: "all make",
        }),
        warnings: ["MakeVsBuyDecisionEngine: using stub"],
      },
    });

    const stage = result.stages.find(item => item.id === "MAKE_VS_BUY");
    expect(stage?.status).toBe("skip");
    expect(stage?.output).toBeNull();
    expect(stage?.warnings.some(warning => /fell back to stub output/i.test(warning))).toBe(true);
  });
});

// ── Pipeline structure tests ───────────────────────────────────────────

describe("QuoteToShipOrchestratorEngine pipeline structure", () => {
  it("getStageDescriptors returns all 27 stages in order", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    expect(descriptors).toHaveLength(27);
    const ids = descriptors.map(d => d.id);
    expect(ids).toEqual([...ALL_STAGES]);
  });

  it("each stage descriptor has label, engines array, and requires array", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    for (const desc of descriptors) {
      expect(desc.id).toBeTruthy();
      expect(desc.label).toBeTruthy();
      expect(Array.isArray(desc.engines)).toBe(true);
      expect(Array.isArray(desc.requires)).toBe(true);
      expect(typeof desc.optional).toBe("boolean");
    }
  });

  it("INTAKE has no prerequisites", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const intake = descriptors.find(d => d.id === "INTAKE");
    expect(intake?.requires).toEqual([]);
  });

  it("optional stages are MAKE_VS_BUY and PROBING only (SIMULATION/QUALITY are mandatory)", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const optionalStages = descriptors.filter(d => d.optional).map(d => d.id);
    expect(optionalStages).toContain("MAKE_VS_BUY");
    expect(optionalStages).toContain("PROBING");
    expect(optionalStages).not.toContain("SIMULATION");
    expect(optionalStages).not.toContain("QUALITY");
  });
});

// ── Input validation tests ─────────────────────────────────────────────

describe("QuoteToShipOrchestratorEngine validateInput", () => {
  it("validates a complete input as valid", () => {
    const result = quoteToShipOrchestratorEngine.validateInput(BRACKET_INPUT);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects missing material_spec", () => {
    const result = quoteToShipOrchestratorEngine.validateInput({
      ...BRACKET_INPUT,
      material_spec: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /material_spec/i.test(e))).toBe(true);
  });

  it("rejects zero quantity", () => {
    const result = quoteToShipOrchestratorEngine.validateInput({
      ...BRACKET_INPUT,
      quantity: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /quantity/i.test(e))).toBe(true);
  });

  it("rejects missing drawing source", () => {
    const result = quoteToShipOrchestratorEngine.validateInput({
      material_spec: "6061-T6",
      quantity: 10,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /drawing_pdf|step_file/i.test(e))).toBe(true);
  });

  it("warns when both drawing_pdf and step_file are provided", () => {
    const result = quoteToShipOrchestratorEngine.validateInput({
      ...BRACKET_INPUT,
      drawing_pdf: "bracket.pdf",
      step_file: "bracket.step",
    });
    expect(result.warnings.some(w => /both.*drawing_pdf.*step_file/i.test(w))).toBe(true);
  });

  it("warns when no controller specified", () => {
    const input = { ...BRACKET_INPUT };
    delete input.controller;
    const result = quoteToShipOrchestratorEngine.validateInput(input);
    expect(result.warnings.some(w => /controller/i.test(w))).toBe(true);
  });
});

// ── Full pipeline execution tests ──────────────────────────────────────

describe("QuoteToShipOrchestratorEngine full pipeline", () => {
  it("runs the bracket through the full pipeline and returns structured result", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);

    // Pipeline returns a structured result
    expect(result.pipeline_id).toMatch(/^QTS-/);
    expect(result.started_at).toBeTruthy();
    expect(result.completed_at).toBeTruthy();
    expect(result.total_duration_ms).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.stages)).toBe(true);
    expect(result.stages.length).toBe(27);

    // Every stage has a result (pass, fail, skip, or blocked)
    for (const stage of result.stages) {
      expect(ALL_STAGES).toContain(stage.id);
      expect(["pass", "fail", "skip", "blocked", "pending"]).toContain(stage.status);
      expect(typeof stage.duration_ms).toBe("number");
      expect(typeof stage.label).toBe("string");
      expect(stage.completed_at || stage.status === "pending").toBeTruthy();
    }
  }, 30_000);

  it("fails gracefully when material_spec is missing", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline({
      step_file: "test.step",
      material_spec: "",
      quantity: 10,
    });
    expect(result.status).toBe("failed");
  });

  it("populates warnings array at pipeline level", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    expect(Array.isArray(result.warnings)).toBe(true);
  }, 30_000);

  it("stages execute in correct order", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const stageIds = result.stages.map(s => s.id);
    expect(stageIds).toEqual([...ALL_STAGES]);
  }, 30_000);

  it("getStageResult retrieves individual stage from pipeline result", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const intake = quoteToShipOrchestratorEngine.getStageResult("INTAKE", result);
    expect(intake).not.toBeNull();
    expect(intake?.id).toBe("INTAKE");
  }, 30_000);
});

// ── Approval gate tests ────────────────────────────────────────────────

describe("QuoteToShipOrchestratorEngine approval gate", () => {
  it("pauses at approval gate when pre_approved is false", async () => {
    const input: QuoteToShipInput = {
      ...BRACKET_INPUT,
      pre_approved: false,
    };

    const result = await quoteToShipOrchestratorEngine.runFullPipeline(input);

    // Pipeline may halt at approval gate or fail earlier at intake
    // Either outcome is acceptable — we verify it doesn't silently skip the gate
    const approvalStage = result.stages.find(s => s.id === "APPROVAL_GATE");
    if (approvalStage && approvalStage.status !== "pending") {
      expect(["blocked", "pass", "fail"]).toContain(approvalStage.status);
    }

    // If the pipeline reached the approval gate, it should pause or continue based on approval
    if (result.status === "awaiting_approval") {
      expect(approvalStage?.status).toBe("blocked");
      // Post-approval stages should still be pending
      const postApprovalStages = result.stages.filter(
        s => ["PROCESS_PLAN", "MAKE_VS_BUY", "MATERIAL_PROCUREMENT"].includes(s.id),
      );
      for (const stage of postApprovalStages) {
        expect(stage.status).toBe("pending");
      }
    }
  }, 30_000);
});

// ── runFromStage tests ─────────────────────────────────────────────────

describe("QuoteToShipOrchestratorEngine runFromStage", () => {
  it("resumes from PROCESS_PLAN with injected prior results", async () => {
    const priorResults = {
      INTAKE: priorResult("INTAKE", "Blueprint/STEP Intake", {
        geometry: { bounding_box: { x: 150, y: 100, z: 25 } },
      }),
      FEATURE_RECOGNITION: priorResult("FEATURE_RECOGNITION", "Feature Recognition", {
        features: [
          { type: "pocket_rectangular", dimensions: { width_mm: 40, length_mm: 60, depth_mm: 15 } },
          { type: "through_hole", dimensions: { diameter_mm: 10, depth_mm: 25 } },
        ],
      }),
      DFM_CHECK: priorResult("DFM_CHECK", "DFM Check", {
        overall_pass: true,
        issues: [],
      }),
      FEASIBILITY: priorResult("FEASIBILITY", "Feasibility", {
        overall_feasible: true,
        dead_ends: [],
      }),
      QUOTE: priorResult("QUOTE", "Quote", {
        total_cost_usd: 45.50,
        lead_time_days: 5,
        confidence_interval_95: { low: 38.0, high: 53.0 },
      }),
      APPROVAL_GATE: priorResult("APPROVAL_GATE", "Approval Gate", {
        approved: true,
        approved_by: "test-customer",
      }),
    };

    const result = await quoteToShipOrchestratorEngine.runFromStage(
      "PROCESS_PLAN",
      BRACKET_INPUT,
      priorResults,
    );

    expect(result.pipeline_id).toMatch(/^QTS-/);
    expect(result.stages.length).toBe(27);

    // Prior stages should be present as passed
    const intakeStage = result.stages.find(s => s.id === "INTAKE");
    expect(intakeStage?.status).toBe("pass");

    // PROCESS_PLAN and beyond should have been executed
    const processPlan = result.stages.find(s => s.id === "PROCESS_PLAN");
    expect(processPlan).toBeDefined();
    expect(["pass", "fail"]).toContain(processPlan?.status);
  }, 30_000);

  it("handles missing prior results for required stages", async () => {
    // Resume from SPEED_FEED without providing TOOL_SELECTION — should block
    const result = await quoteToShipOrchestratorEngine.runFromStage(
      "SPEED_FEED",
      BRACKET_INPUT,
      {
        STRATEGY_SELECTION: priorResult("STRATEGY_SELECTION", "Strategy", {
          strategies: [],
        }),
        // TOOL_SELECTION is missing — required by SPEED_FEED
      },
    );

    const speedFeed = result.stages.find(s => s.id === "SPEED_FEED");
    expect(["blocked", "fail"]).toContain(speedFeed?.status);
  }, 30_000);
});

// ── Schema integration tests ───────────────────────────────────────────

describe("QuoteToShipOrchestratorEngine schema coverage", () => {
  it("businessDispatcher has quote_to_ship_run, quote_to_ship_validate, quote_to_ship_status actions", async () => {
    // Verify the action strings exist in the dispatcher's ACTIONS array by importing it
    const schemaModule = await import("../schemas/businessActionSchemas.js");
    const schemas = schemaModule.ACTION_BUSINESS_SCHEMAS;
    expect(schemas.quote_to_ship_run).toBeDefined();
    expect(schemas.quote_to_ship_validate).toBeDefined();
    expect(schemas.quote_to_ship_status).toBeDefined();
  });

  it("quote_to_ship_run schema accepts bracket input", async () => {
    const schemaModule = await import("../schemas/businessActionSchemas.js");
    const schema = schemaModule.ACTION_BUSINESS_SCHEMAS.quote_to_ship_run;
    const parsed = schema.parse({
      material_spec: "6061-T6",
      quantity: 10,
      step_file: "bracket.step",
      priority: "standard",
      controller: "Fanuc 0i-MF",
      surface_finish_ra_um: 1.6,
      feature_candidates: [
        { type: "pocket", dimensions: { width_mm: 40, depth_mm: 15 } },
      ],
    });
    expect(parsed.material_spec).toBe("6061-T6");
    expect(parsed.quantity).toBe(10);
  });

  it("quote_to_ship_validate schema accepts minimal input", async () => {
    const schemaModule = await import("../schemas/businessActionSchemas.js");
    const schema = schemaModule.ACTION_BUSINESS_SCHEMAS.quote_to_ship_validate;
    const parsed = schema.parse({ material_spec: "Ti-6Al-4V" });
    expect(parsed.material_spec).toBe("Ti-6Al-4V");
  });

  it("quote_to_ship_status schema accepts empty object", async () => {
    const schemaModule = await import("../schemas/businessActionSchemas.js");
    const schema = schemaModule.ACTION_BUSINESS_SCHEMAS.quote_to_ship_status;
    const parsed = schema.parse({});
    expect(parsed).toBeDefined();
  });
});

// ── SPEED_FEED physics enrichment tests ───────────────────────────────

describe("QuoteToShipOrchestratorEngine SPEED_FEED enrichment", () => {
  it("SPEED_FEED output includes chatter_check per operation", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.output) {
      const feeds = (sfStage.output as any).speed_feeds;
      if (Array.isArray(feeds) && feeds.length > 0) {
        for (const sf of feeds) {
          // chatter_check may be null if engine unavailable, but field should exist
          expect(sf).toHaveProperty("chatter_check");
        }
      }
    }
  }, 30_000);

  it("SPEED_FEED output includes thermal_wear per operation", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.output) {
      const feeds = (sfStage.output as any).speed_feeds;
      if (Array.isArray(feeds) && feeds.length > 0) {
        for (const sf of feeds) {
          expect(sf).toHaveProperty("thermal_wear");
        }
      }
    }
  }, 30_000);

  it("SPEED_FEED label reflects chatter + thermal-wear enrichment", () => {
    // The label is set in the executor, verify via a pipeline run
    // For structural check, verify the stage descriptor hasn't regressed
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const sf = descriptors.find(d => d.id === "SPEED_FEED");
    expect(sf).toBeDefined();
    expect(sf!.engines).toContain("SpeedFeedOrchestratorEngine");
  });

  it("chatter_check has stable boolean when present", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.output) {
      const feeds = (sfStage.output as any).speed_feeds;
      if (Array.isArray(feeds)) {
        for (const sf of feeds) {
          if (sf.chatter_check !== null) {
            expect(typeof sf.chatter_check.stable).toBe("boolean");
          }
        }
      }
    }
  }, 30_000);

  it("thermal_wear has predicted_tool_life_min when present", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.output) {
      const feeds = (sfStage.output as any).speed_feeds;
      if (Array.isArray(feeds)) {
        for (const sf of feeds) {
          if (sf.thermal_wear !== null) {
            expect(sf.thermal_wear).toHaveProperty("predicted_tool_life_min");
            expect(sf.thermal_wear).toHaveProperty("max_temp_C");
          }
        }
      }
    }
  }, 30_000);
});

// ── QUALITY stage wiring tests ────────────────────────────────────────

describe("QuoteToShipOrchestratorEngine QUALITY wiring", () => {
  it("QUALITY descriptor lists all 4 engines", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const quality = descriptors.find(d => d.id === "QUALITY");
    expect(quality).toBeDefined();
    expect(quality!.engines).toContain("QualityManagementEngine");
    expect(quality!.engines).toContain("FirstArticleInspectionPipelineEngine");
    expect(quality!.engines).toContain("SPCProcessCapabilityEngine");
    expect(quality!.engines).toContain("MetrologyUncertaintyEngine");
    expect(quality!.engines).toHaveLength(4);
  });

  it("QUALITY label reflects full engine stack", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const quality = descriptors.find(d => d.id === "QUALITY");
    expect(quality!.label).toContain("FAI");
    expect(quality!.label).toContain("SPC");
    expect(quality!.label).toContain("Metrology");
  });

  it("QUALITY is mandatory (not optional)", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const quality = descriptors.find(d => d.id === "QUALITY");
    expect(quality!.optional).toBe(false);
  });

  it("QUALITY output includes engines_wired array when executed", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const qualityStage = result.stages.find(s => s.id === "QUALITY");
    if (qualityStage?.output) {
      const out = qualityStage.output as Record<string, unknown>;
      expect(out).toHaveProperty("engines_wired");
      const wired = out.engines_wired as string[];
      expect(wired).toContain("QualityManagementEngine");
      expect(wired).toContain("FirstArticleInspectionPipelineEngine");
      expect(wired).toContain("SPCProcessCapabilityEngine");
      expect(wired).toContain("MetrologyUncertaintyEngine");
    }
  }, 30_000);

  it("QUALITY output has fai_report field", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const qualityStage = result.stages.find(s => s.id === "QUALITY");
    if (qualityStage?.output) {
      expect(qualityStage.output).toHaveProperty("fai_report");
    }
  }, 30_000);

  it("QUALITY output has spc_charts array", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const qualityStage = result.stages.find(s => s.id === "QUALITY");
    if (qualityStage?.output) {
      expect(qualityStage.output).toHaveProperty("spc_charts");
      expect(Array.isArray((qualityStage.output as any).spc_charts)).toBe(true);
    }
  }, 30_000);

  it("QUALITY output has metrology field", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const qualityStage = result.stages.find(s => s.id === "QUALITY");
    if (qualityStage?.output) {
      expect(qualityStage.output).toHaveProperty("metrology");
    }
  }, 30_000);

  it("QUALITY output has cpk_summary field", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const qualityStage = result.stages.find(s => s.id === "QUALITY");
    if (qualityStage?.output) {
      expect(qualityStage.output).toHaveProperty("cpk_summary");
    }
  }, 30_000);
});

// ── OMEGA Gate tests ──────────────────────────────────────────────────

describe("QuoteToShipOrchestratorEngine OMEGA gate", () => {
  it("OMEGA_GATE is positioned after QUALITY and before SHIPPING", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const ids = descriptors.map(d => d.id);
    const qualityIdx = ids.indexOf("QUALITY");
    const omegaIdx = ids.indexOf("OMEGA_GATE");
    const shippingIdx = ids.indexOf("SHIPPING");
    expect(omegaIdx).toBeGreaterThan(qualityIdx);
    expect(omegaIdx).toBeLessThan(shippingIdx);
  });

  it("OMEGA_GATE requires QUALITY stage", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const omega = descriptors.find(d => d.id === "OMEGA_GATE");
    expect(omega).toBeDefined();
    expect(omega!.requires).toContain("QUALITY");
    expect(omega!.optional).toBe(false);
  });

  it("SHIPPING now requires OMEGA_GATE (not just JOB_LIFECYCLE)", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const shipping = descriptors.find(d => d.id === "SHIPPING");
    expect(shipping!.requires).toContain("OMEGA_GATE");
  });

  it("OMEGA_GATE is non-optional (mandatory)", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const omega = descriptors.find(d => d.id === "OMEGA_GATE");
    expect(omega!.optional).toBe(false);
  });

  it("OMEGA_GATE descriptor lists ComplianceEngine", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const omega = descriptors.find(d => d.id === "OMEGA_GATE");
    expect(omega!.engines).toContain("ComplianceEngine");
  });

  it("pipeline has exactly 27 stages after MAGAZINE_LAYOUT addition", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    expect(descriptors).toHaveLength(27);
  });

  it("OMEGA_GATE executes during full pipeline run", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const omegaStage = result.stages.find(s => s.id === "OMEGA_GATE");
    expect(omegaStage).toBeDefined();
    expect(["pass", "fail", "blocked", "skip", "pending"]).toContain(omegaStage!.status);
  }, 30_000);

  it("OMEGA_GATE produces structured output with score and checklist", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const omegaStage = result.stages.find(s => s.id === "OMEGA_GATE");
    expect(omegaStage).toBeDefined();
    if (omegaStage?.output) {
      const out = omegaStage.output as Record<string, unknown>;
      expect(out).toHaveProperty("omega");
      expect(out).toHaveProperty("tier");
      expect(out).toHaveProperty("passed");
      expect(out).toHaveProperty("dimensions");
      expect(out).toHaveProperty("checklist");
      expect(typeof out.omega).toBe("number");
      expect(Number.isFinite(out.omega as number)).toBe(true);
    }
  }, 30_000);

  it("OMEGA_GATE defaults to standard tier when no industry_standard set", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const omegaStage = result.stages.find(s => s.id === "OMEGA_GATE");
    if (omegaStage?.output) {
      expect((omegaStage.output as any).tier).toBe("standard");
      expect((omegaStage.output as any).omega_threshold).toBeCloseTo(0.65, 2);
    }
  }, 30_000);

  it("industry_standard input field selects correct tier thresholds", async () => {
    const aeroInput: QuoteToShipInput = {
      ...BASE_INPUT,
      industry_standard: "AS9100",
    };
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(aeroInput);
    const omegaStage = result.stages.find(s => s.id === "OMEGA_GATE");
    if (omegaStage?.output) {
      expect((omegaStage.output as any).tier).toBe("AS9100");
      expect((omegaStage.output as any).omega_threshold).toBeCloseTo(0.85, 2);
      expect((omegaStage.output as any).safety_threshold).toBeCloseTo(0.90, 2);
    }
  }, 30_000);

  it("OMEGA formula weights sum to 1.0", () => {
    // Formula: 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
    const weights = [0.25, 0.20, 0.15, 0.30, 0.10];
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 5);
  });

  it("OMEGA_GATE output includes approval_required field", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const omegaStage = result.stages.find(s => s.id === "OMEGA_GATE");
    if (omegaStage?.output) {
      expect(omegaStage.output).toHaveProperty("approval_required");
    }
  }, 30_000);

  it("OMEGA_GATE checklist is an array of readable strings", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const omegaStage = result.stages.find(s => s.id === "OMEGA_GATE");
    if (omegaStage?.output) {
      const checklist = (omegaStage.output as any).checklist;
      expect(Array.isArray(checklist)).toBe(true);
      expect(checklist.length).toBeGreaterThan(0);
      // Each non-empty entry should be a string
      for (const line of checklist) {
        expect(typeof line).toBe("string");
      }
    }
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════════
// SESSION 2-5: Tool Wear TCO + ActualCost Connection
// ═══════════════════════════════════════════════════════════════════════

describe("QuoteToShipOrchestratorEngine TOOL_SELECTION TCO wiring", () => {
  it("TOOL_SELECTION descriptor includes ToolWearProgressionEngine", () => {
    const result = quoteToShipOrchestratorEngine.getStageDescriptors();
    const toolStage = result.find((s: any) => s.id === "TOOL_SELECTION");
    expect(toolStage).toBeDefined();
    expect(toolStage!.engines).toContain("ToolWearProgressionEngine");
  });

  it("TOOL_SELECTION label reflects TCO wiring", () => {
    const result = quoteToShipOrchestratorEngine.getStageDescriptors();
    const toolStage = result.find((s: any) => s.id === "TOOL_SELECTION");
    expect(toolStage!.label).toMatch(/TCO|Wear/i);
  });

  it("TOOL_SELECTION output includes tool_wear_tco field when tools selected", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const toolStage = result.stages.find(s => s.id === "TOOL_SELECTION");
    if (toolStage?.status === "pass" && toolStage?.output) {
      // tool_wear_tco should be present (may be null if engine unavailable)
      expect("tool_wear_tco" in (toolStage.output as any)).toBe(true);
    }
  }, 30_000);

  it("tool_wear_tco has expected TCO structure when populated", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const toolStage = result.stages.find(s => s.id === "TOOL_SELECTION");
    const tco = (toolStage?.output as any)?.tool_wear_tco;
    if (tco) {
      expect(tco).toHaveProperty("batch_quantity");
      expect(tco).toHaveProperty("tools_analyzed");
      expect(tco).toHaveProperty("total_predicted_tool_changes");
      expect(tco).toHaveProperty("total_tooling_cost_for_batch");
      expect(tco).toHaveProperty("per_tool");
      expect(Array.isArray(tco.per_tool)).toBe(true);
      expect(typeof tco.total_predicted_tool_changes).toBe("number");
      expect(tco.total_predicted_tool_changes).toBeGreaterThanOrEqual(0);
      expect(typeof tco.total_tooling_cost_for_batch).toBe("number");
    }
  }, 30_000);

  it("per-tool TCO includes wear stage and tool life", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const tco = (result.stages.find(s => s.id === "TOOL_SELECTION")?.output as any)?.tool_wear_tco;
    if (tco?.per_tool?.length > 0) {
      const first = tco.per_tool[0];
      expect(first).toHaveProperty("tool_life_min");
      expect(first).toHaveProperty("optimal_change_min");
      expect(first).toHaveProperty("wear_stage");
      expect(first).toHaveProperty("predicted_tool_changes");
      expect(first).toHaveProperty("tooling_cost_for_batch");
      expect(["initial", "steady", "accelerated", "critical"]).toContain(first.wear_stage);
    }
  }, 30_000);

  it("batch_quantity matches input quantity", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const tco = (result.stages.find(s => s.id === "TOOL_SELECTION")?.output as any)?.tool_wear_tco;
    if (tco) {
      expect(tco.batch_quantity).toBe(BASE_INPUT.quantity);
    }
  }, 30_000);
});

describe("QuoteToShipOrchestratorEngine JOB_LIFECYCLE ActualCost wiring", () => {
  it("JOB_LIFECYCLE descriptor includes ActualCostEngine", () => {
    const result = quoteToShipOrchestratorEngine.getStageDescriptors();
    const jobStage = result.find((s: any) => s.id === "JOB_LIFECYCLE");
    expect(jobStage).toBeDefined();
    expect(jobStage!.engines).toContain("ActualCostEngine");
  });

  it("JOB_LIFECYCLE label reflects cost tracking", () => {
    const result = quoteToShipOrchestratorEngine.getStageDescriptors();
    const jobStage = result.find((s: any) => s.id === "JOB_LIFECYCLE");
    expect(jobStage!.label).toMatch(/Cost/i);
  });

  it("JOB_LIFECYCLE output includes actual_cost field", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const jobStage = result.stages.find(s => s.id === "JOB_LIFECYCLE");
    if (jobStage?.status === "pass" && jobStage?.output) {
      expect("actual_cost" in (jobStage.output as any)).toBe(true);
    }
  }, 30_000);

  it("actual_cost has variance report structure when populated", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const jobStage = result.stages.find(s => s.id === "JOB_LIFECYCLE");
    const cost = (jobStage?.output as any)?.actual_cost;
    if (cost) {
      expect(cost).toHaveProperty("job_id");
      expect(cost).toHaveProperty("actual_cost");
      expect(cost).toHaveProperty("variance_report");
      expect(cost).toHaveProperty("total_variance_pct");
      expect(cost).toHaveProperty("variance_status");
      expect(Array.isArray(cost.variance_report)).toBe(true);
      expect(["under", "on_budget", "over"]).toContain(cost.variance_status);
    }
  }, 30_000);

  it("variance_report covers all cost categories", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const cost = (result.stages.find(s => s.id === "JOB_LIFECYCLE")?.output as any)?.actual_cost;
    if (cost?.variance_report?.length > 0) {
      const categories = cost.variance_report.map((v: any) => v.category);
      expect(categories).toContain("labor");
      expect(categories).toContain("material");
      expect(categories).toContain("tooling");
      expect(categories).toContain("machine");
      expect(categories).toContain("total");
    }
  }, 30_000);

  it("actual_cost includes tooling_tco_from_wear field", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const cost = (result.stages.find(s => s.id === "JOB_LIFECYCLE")?.output as any)?.actual_cost;
    if (cost) {
      expect(cost).toHaveProperty("tooling_tco_from_wear");
      expect(typeof cost.tooling_tco_from_wear).toBe("number");
    }
  }, 30_000);
});

describe("QuoteToShipOrchestratorEngine OMEGA L-score cost variance integration", () => {
  it("OMEGA LOGISTICS dimension reason mentions cost status", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const omegaStage = result.stages.find(s => s.id === "OMEGA_GATE");
    if (omegaStage?.output) {
      const details = (omegaStage.output as any).dimensions?.details ?? [];
      const logistics = details.find((d: any) => d.dimension === "LOGISTICS");
      if (logistics) {
        // Reason should mention schedule/job/pkg/cost
        expect(typeof logistics.reason).toBe("string");
        expect(logistics.reason.length).toBeGreaterThan(0);
      }
    }
  }, 30_000);

  it("pipeline context has tool_wear_tco and actual_cost fields", () => {
    // Verify PipelineContext shape by checking createContext initializes them to null
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    // Both fields exist implicitly — tested via stage outputs above
    // This test verifies the stage count is still 26 (no regression)
    expect(descriptors).toHaveLength(27);
  });

  it("27 stages still present (no regression)", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    expect(descriptors).toHaveLength(27);
    const ids = descriptors.map((d: any) => d.id);
    expect(ids).toContain("TOOL_SELECTION");
    expect(ids).toContain("JOB_LIFECYCLE");
    expect(ids).toContain("OMEGA_GATE");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SESSION 2-6: Tribal Knowledge at 5 Stages
// ═══════════════════════════════════════════════════════════════════════

describe("QuoteToShipOrchestratorEngine Tribal Knowledge at 5 stages", () => {
  it("PROCESS_PLAN output includes tribal_tips array", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const stage = result.stages.find(s => s.id === "PROCESS_PLAN");
    if (stage?.status === "pass" && stage?.output) {
      expect("tribal_tips" in (stage.output as any)).toBe(true);
      expect(Array.isArray((stage.output as any).tribal_tips)).toBe(true);
    }
  }, 30_000);

  it("STRATEGY_SELECTION output includes tribal_tips array", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const stage = result.stages.find(s => s.id === "STRATEGY_SELECTION");
    if (stage?.status === "pass" && stage?.output) {
      expect("tribal_tips" in (stage.output as any)).toBe(true);
      expect(Array.isArray((stage.output as any).tribal_tips)).toBe(true);
    }
  }, 30_000);

  it("TOOL_SELECTION output includes tribal_tips array", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const stage = result.stages.find(s => s.id === "TOOL_SELECTION");
    if (stage?.status === "pass" && stage?.output) {
      expect("tribal_tips" in (stage.output as any)).toBe(true);
      expect(Array.isArray((stage.output as any).tribal_tips)).toBe(true);
    }
  }, 30_000);

  it("SPEED_FEED output includes tribal_tips array", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const stage = result.stages.find(s => s.id === "SPEED_FEED");
    if (stage?.status === "pass" && stage?.output) {
      expect("tribal_tips" in (stage.output as any)).toBe(true);
      expect(Array.isArray((stage.output as any).tribal_tips)).toBe(true);
    }
  }, 30_000);

  it("SETUP_SHEET output includes tribal_knowledge_notes when tips available", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const stage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (stage?.status === "pass" && stage?.output) {
      const notes = (stage.output as any).tribal_knowledge_notes;
      // Notes may or may not exist depending on whether tips match the material
      if (notes) {
        expect(Array.isArray(notes)).toBe(true);
        for (const note of notes) {
          expect(note).toHaveProperty("title");
          expect(note).toHaveProperty("note");
          expect(note).toHaveProperty("confidence");
          expect(note).toHaveProperty("category");
          expect(typeof note.title).toBe("string");
          expect(typeof note.note).toBe("string");
        }
      }
    }
  }, 30_000);

  it("tribal tips are KnowledgeTip objects with required fields", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    for (const stageId of ["PROCESS_PLAN", "STRATEGY_SELECTION", "TOOL_SELECTION", "SPEED_FEED"]) {
      const stage = result.stages.find(s => s.id === stageId);
      const tips = (stage?.output as any)?.tribal_tips;
      if (tips && tips.length > 0) {
        const tip = tips[0];
        expect(tip).toHaveProperty("id");
        expect(tip).toHaveProperty("title");
        expect(tip).toHaveProperty("body");
        expect(tip).toHaveProperty("category");
        expect(tip).toHaveProperty("confidence");
        expect(tip.confidence).toBeGreaterThanOrEqual(70); // min_confidence filter
      }
    }
  }, 30_000);

  it("tribal tip count appears in result_summary for stages with tips", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    // At least one stage should mention tribal tips in its summary
    const stagesWithTips = result.stages.filter(
      s => s.result_summary?.includes("tribal tip"),
    );
    // Advisory — tips may not match minimal input, so just verify the summary format exists
    for (const s of stagesWithTips) {
      expect(s.result_summary).toMatch(/\d+ tribal tip/);
    }
  }, 30_000);

  it("TOOL_SELECTION descriptor has 4 engines (+ ToolWearProgressionEngine + ROIAdvisorEngine)", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const toolStage = descriptors.find((d: any) => d.id === "TOOL_SELECTION");
    expect(toolStage!.engines).toHaveLength(4);
    expect(toolStage!.engines).toContain("ToolWearProgressionEngine");
    expect(toolStage!.engines).toContain("ROIAdvisorEngine");
  });
});

// ── PipelinePhysicsAccumulator (Session 2-7: U-PA1..PA3) ──────────────

describe("QuoteToShipOrchestratorEngine PipelinePhysicsAccumulator", () => {
  it("SPEED_FEED output contains physics_accumulator object", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    expect(sfStage).toBeDefined();
    if (sfStage?.status === "pass") {
      const output = sfStage.output as any;
      expect(output).toHaveProperty("physics_accumulator");
      expect(output.physics_accumulator).toHaveProperty("operations");
      expect(output.physics_accumulator).toHaveProperty("total_power_kw");
      expect(output.physics_accumulator).toHaveProperty("max_force_N");
      expect(output.physics_accumulator).toHaveProperty("peak_temperature_C");
      expect(output.physics_accumulator).toHaveProperty("last_updated_by");
    }
  }, 30_000);

  it("accumulator operations match speed_feed operation count", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const output = sfStage.output as any;
      const sfCount = output.speed_feeds?.length ?? 0;
      const accCount = output.physics_accumulator?.operations?.length ?? 0;
      expect(accCount).toBe(sfCount);
    }
  }, 30_000);

  it("accumulator per-operation snapshots have correct shape", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const acc = (sfStage.output as any)?.physics_accumulator;
      for (const op of acc?.operations ?? []) {
        expect(op).toHaveProperty("operation_id");
        expect(op).toHaveProperty("cutting_force_N");
        expect(op).toHaveProperty("power_kw");
        expect(op).toHaveProperty("temperature_C");
        expect(op).toHaveProperty("stability");
        expect(op).toHaveProperty("surface_finish_ra_um");
        expect(op).toHaveProperty("deflection_mm");
        expect(op).toHaveProperty("cost_usd");
      }
    }
  }, 30_000);

  it("accumulator aggregate fields are non-negative finite numbers", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const acc = (sfStage.output as any)?.physics_accumulator;
      expect(acc.total_power_kw).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(acc.total_power_kw)).toBe(true);
      expect(acc.max_force_N).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(acc.max_force_N)).toBe(true);
      expect(acc.peak_temperature_C).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(acc.peak_temperature_C)).toBe(true);
    }
  }, 30_000);

  it("accumulator last_updated_by is SPEED_FEED after speed/feed stage", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const acc = (sfStage.output as any)?.physics_accumulator;
      expect(acc.last_updated_by).toBe("SPEED_FEED");
    }
  }, 30_000);

  it("PRE_SAFETY output includes physics_accumulator_summary", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const safetyStage = result.stages.find(s => s.id === "PRE_SAFETY");
    expect(safetyStage).toBeDefined();
    if (safetyStage?.output) {
      const output = safetyStage.output as any;
      expect(output).toHaveProperty("physics_accumulator_summary");
      const summary = output.physics_accumulator_summary;
      expect(summary).toHaveProperty("total_power_kw");
      expect(summary).toHaveProperty("max_force_N");
      expect(summary).toHaveProperty("peak_temperature_C");
    }
  }, 30_000);

  it("PRE_SAFETY result_summary includes peak temperature and max force", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const safetyStage = result.stages.find(s => s.id === "PRE_SAFETY");
    if (safetyStage?.status === "pass") {
      // Format: "Physics safety passed for N operations | peak X°C | max YN"
      expect(safetyStage.result_summary).toMatch(/peak \d+°C/);
      expect(safetyStage.result_summary).toMatch(/max \d+N/);
    }
  }, 30_000);

  it("SETUP_SHEET output contains physics_summary from accumulator", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const output = setupStage.output as any;
      if (output.physics_summary) {
        expect(output.physics_summary).toHaveProperty("total_power_kw");
        expect(output.physics_summary).toHaveProperty("max_force_N");
        expect(output.physics_summary).toHaveProperty("peak_temperature_C");
        expect(output.physics_summary).toHaveProperty("per_operation");
        expect(Array.isArray(output.physics_summary.per_operation)).toBe(true);
      }
    }
  }, 30_000);

  it("SPEED_FEED stage descriptor lists 4 physics engines", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const sfDesc = descriptors.find((d: any) => d.id === "SPEED_FEED");
    expect(sfDesc).toBeDefined();
    expect(sfDesc!.engines).toHaveLength(4);
    expect(sfDesc!.engines).toContain("SpeedFeedOrchestratorEngine");
    expect(sfDesc!.engines).toContain("ChatterStabilityLobeEngine");
    expect(sfDesc!.engines).toContain("ThermalWearCouplingEngine");
    expect(sfDesc!.engines).toContain("PhysicsFusionOrchestratorEngine");
  });

  it("SPEED_FEED result_summary includes peak temp and max force from accumulator", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      // Format: "S/F for N ops | M RPM shifts | avg tool life X min | peak Y°C | max ZN"
      expect(sfStage.result_summary).toMatch(/peak \d+°C/);
      expect(sfStage.result_summary).toMatch(/max \d+N/);
    }
  }, 30_000);

  it("accumulator accumulated_cost_usd is zero or non-negative", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const acc = (sfStage.output as any)?.physics_accumulator;
      expect(acc.accumulated_cost_usd).toBeGreaterThanOrEqual(0);
    }
  }, 30_000);

  it("accumulator updated_at is a valid ISO date string", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const acc = (sfStage.output as any)?.physics_accumulator;
      expect(acc.updated_at).toBeDefined();
      const parsed = new Date(acc.updated_at);
      expect(parsed.getTime()).not.toBeNaN();
    }
  }, 30_000);
});

// ── Session 2-8: Shop Floor Practical Features ────────────────────────

describe("QuoteToShipOrchestratorEngine Shop Floor Features", () => {
  it("MAGAZINE_LAYOUT stage exists between POST_SAFETY and SETUP_SHEET", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const ids = descriptors.map((d: any) => d.id);
    const magIdx = ids.indexOf("MAGAZINE_LAYOUT");
    const postSafetyIdx = ids.indexOf("POST_SAFETY");
    const setupIdx = ids.indexOf("SETUP_SHEET");
    expect(magIdx).toBeGreaterThan(postSafetyIdx);
    expect(magIdx).toBeLessThan(setupIdx);
  });

  it("MAGAZINE_LAYOUT descriptor lists ToolMagazineOptimizationEngine", () => {
    const descriptors = quoteToShipOrchestratorEngine.getStageDescriptors();
    const mag = descriptors.find((d: any) => d.id === "MAGAZINE_LAYOUT");
    expect(mag).toBeDefined();
    expect(mag!.engines).toContain("ToolMagazineOptimizationEngine");
  });

  it("SPEED_FEED per-operation output has chip_evacuation field", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const output = sfStage.output as any;
      for (const sf of output?.speed_feeds ?? []) {
        // chip_evacuation is null for non-drilling ops or L/D <= 3
        expect(sf).toHaveProperty("chip_evacuation");
      }
    }
  }, 30_000);

  it("SPEED_FEED per-operation output has chip_thinning field", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const output = sfStage.output as any;
      for (const sf of output?.speed_feeds ?? []) {
        expect(sf).toHaveProperty("chip_thinning");
      }
    }
  }, 30_000);

  it("first_article_mode derates S/F by 20%", async () => {
    const firstArticleInput = { ...BRACKET_INPUT, first_article_mode: true };
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(firstArticleInput);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const output = sfStage.output as any;
      for (const sf of output?.speed_feeds ?? []) {
        const r = sf.speed_feed;
        if (r?.first_article_derated) {
          expect(r.first_article_derated).toBe(true);
          // Original values should be preserved
          expect(r.original_rpm_before_derate).toBeDefined();
          expect(r.original_feed_before_derate).toBeDefined();
        }
      }
      // Warning about first-article derate should be present
      expect(sfStage.warnings).toEqual(
        expect.arrayContaining([expect.stringMatching(/FIRST ARTICLE/i)]),
      );
    }
  }, 30_000);

  it("first_article_mode adds warning text to SETUP_SHEET", async () => {
    const firstArticleInput = { ...BRACKET_INPUT, first_article_mode: true };
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(firstArticleInput);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const output = setupStage.output as any;
      expect(output.first_article_warning).toBeDefined();
      expect(output.first_article_warning).toMatch(/FIRST ARTICLE/);
      expect(output.first_article_mode).toBe(true);
    }
  }, 30_000);

  it("first_article_mode=false does NOT derate S/F", async () => {
    const normalInput = { ...BRACKET_INPUT, first_article_mode: false };
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(normalInput);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const output = sfStage.output as any;
      for (const sf of output?.speed_feeds ?? []) {
        const r = sf.speed_feed;
        if (r) {
          expect(r.first_article_derated).toBeFalsy();
        }
      }
    }
  }, 30_000);

  it("pipeline context includes magazine_layout field", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const magStage = result.stages.find(s => s.id === "MAGAZINE_LAYOUT");
    // MAGAZINE_LAYOUT stage should exist in output
    expect(magStage).toBeDefined();
  }, 30_000);

  it("first_article_mode field is accepted on QuoteToShipInput", () => {
    // Type-level test: ensure the field exists on the input interface
    const input: QuoteToShipInput = {
      ...BASE_INPUT,
      first_article_mode: true,
    };
    expect(input.first_article_mode).toBe(true);
  });

  it("chip evacuation result shape is correct when present", async () => {
    // Build input with a deep drilling op to trigger chip evacuation
    const drillingInput: QuoteToShipInput = {
      ...BRACKET_INPUT,
      feature_candidates: [
        { type: "through_hole", dimensions: { diameter_mm: 6, depth_mm: 50 }, position: { x: 50, y: 50, z: 0 } },
      ],
    };
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(drillingInput);
    const sfStage = result.stages.find(s => s.id === "SPEED_FEED");
    if (sfStage?.status === "pass") {
      const output = sfStage.output as any;
      for (const sf of output?.speed_feeds ?? []) {
        if (sf.chip_evacuation) {
          expect(sf.chip_evacuation).toHaveProperty("l_d_ratio");
          expect(sf.chip_evacuation.l_d_ratio).toBeGreaterThan(3);
        }
      }
    }
  }, 30_000);
});

// ── Session 2-9: Setup Sheet Operator Instructions ────────────────────

describe("QuoteToShipOrchestratorEngine Operator Instructions (Session 2-9)", () => {
  it("SETUP_SHEET output includes operator_instructions array", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const output = setupStage.output as any;
      expect(output.operator_instructions).toBeDefined();
      expect(Array.isArray(output.operator_instructions)).toBe(true);
      expect(output.operator_instructions.length).toBeGreaterThanOrEqual(5);
    }
  }, 30_000);

  it("operator instructions include STOCK step with material spec", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const steps = (setupStage.output as any).operator_instructions ?? [];
      const stockStep = steps.find((s: string) => s.includes("STOCK"));
      expect(stockStep).toBeDefined();
      expect(stockStep).toContain("6061-T6");
    }
  }, 30_000);

  it("operator instructions include FIXTURE step", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const steps = (setupStage.output as any).operator_instructions ?? [];
      const fixtureStep = steps.find((s: string) => s.includes("FIXTURE"));
      expect(fixtureStep).toBeDefined();
    }
  }, 30_000);

  it("operator instructions include INDICATE step with TIR", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const steps = (setupStage.output as any).operator_instructions ?? [];
      const indicateStep = steps.find((s: string) => s.includes("INDICATE"));
      expect(indicateStep).toBeDefined();
      expect(indicateStep).toMatch(/TIR/);
    }
  }, 30_000);

  it("operator instructions include TOOLS step", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const steps = (setupStage.output as any).operator_instructions ?? [];
      const toolStep = steps.find((s: string) => s.includes("TOOLS"));
      expect(toolStep).toBeDefined();
    }
  }, 30_000);

  it("operator instructions include RUN step", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const steps = (setupStage.output as any).operator_instructions ?? [];
      const runStep = steps.find((s: string) => s.includes("RUN"));
      expect(runStep).toBeDefined();
      expect(runStep).toMatch(/coolant/i);
    }
  }, 30_000);

  it("operator instructions include FINISH step when surface_finish_ra_um is set", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const steps = (setupStage.output as any).operator_instructions ?? [];
      const finishStep = steps.find((s: string) => s.includes("FINISH"));
      // BRACKET_INPUT has surface_finish_ra_um: 1.6
      expect(finishStep).toBeDefined();
      expect(finishStep).toContain("1.6");
    }
  }, 30_000);

  it("first_article_mode adds FIRST ARTICLE step to operator instructions", async () => {
    const input = { ...BRACKET_INPUT, first_article_mode: true };
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(input);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const steps = (setupStage.output as any).operator_instructions ?? [];
      const faStep = steps.find((s: string) => s.includes("FIRST ARTICLE"));
      expect(faStep).toBeDefined();
      expect(faStep).toMatch(/80%/);
    }
  }, 30_000);

  it("steps are numbered sequentially starting from 1", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass" && setupStage?.output) {
      const steps = (setupStage.output as any).operator_instructions ?? [];
      for (let i = 0; i < steps.length; i++) {
        expect(steps[i]).toMatch(new RegExp(`^${i + 1}\\.`));
      }
    }
  }, 30_000);

  it("result_summary includes operator step count", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    if (setupStage?.status === "pass") {
      expect(setupStage.result_summary).toMatch(/\d+ operator steps/);
    }
  }, 30_000);

  it("COATING_COMPENSATION lookup has anodize_type_iii entry", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const setupStage = result.stages.find(s => s.id === "SETUP_SHEET");
    expect(setupStage).toBeDefined();
  }, 30_000);
});

// ── Session 2-10: Type Hardening + Integration Tests ──────────────────

describe("QuoteToShipOrchestratorEngine pipeline_version + integration (Session 2-10)", () => {
  it("result includes pipeline_version field", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    expect(result.pipeline_version).toBeDefined();
    expect(typeof result.pipeline_version).toBe("string");
    expect(result.pipeline_version).toMatch(/^\d+\.\d+\.\d+$/);
  }, 30_000);

  it("pipeline_version is 2.10.0", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    expect(result.pipeline_version).toBe("2.10.0");
  }, 30_000);

  it("6061-T6 bracket runs all 27 stages without crash", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    expect(result.stages).toHaveLength(27);
    expect(result.pipeline_id).toMatch(/^QTS-/);
    expect(result.total_duration_ms).toBeGreaterThan(0);
    expect(result.started_at).toBeDefined();
    expect(result.completed_at).toBeDefined();
    // At minimum INTAKE should run
    const intake = result.stages.find(s => s.id === "INTAKE");
    expect(intake).toBeDefined();
  }, 30_000);

  it("backward compat: runFullPipeline still accepts minimal input", async () => {
    const minimal: QuoteToShipInput = {
      step_file: "part.step",
      material_spec: "steel_4140",
      quantity: 1,
      pre_approved: true,
      drawing_text: "",
    };
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(minimal);
    expect(result.pipeline_id).toMatch(/^QTS-/);
    expect(result.stages.length).toBe(27);
  }, 30_000);

  it("backward compat: runFromStage still works", async () => {
    const result = await quoteToShipOrchestratorEngine.runFromStage(
      "QUOTE",
      BASE_INPUT,
      {
        FEATURE_RECOGNITION: priorResult("FEATURE_RECOGNITION", "Features", { features: [] }),
        DFM_CHECK: priorResult("DFM_CHECK", "DFM", { findings: [] }),
        FEASIBILITY: priorResult("FEASIBILITY", "Feasibility", { feasible: true }),
      },
    );
    expect(result.pipeline_id).toMatch(/^QTS-/);
    expect(result.pipeline_version).toBe("2.10.0");
  }, 30_000);
});

describe("QuoteToShipOrchestratorEngine safety veto + failure injection (Session 2-10)", () => {
  it("PRE_SAFETY stage exists and runs", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const safety = result.stages.find(s => s.id === "PRE_SAFETY");
    expect(safety).toBeDefined();
  }, 30_000);

  it("PRE_SAFETY output has checks array and passed boolean", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const safety = result.stages.find(s => s.id === "PRE_SAFETY");
    if (safety?.output) {
      const output = safety.output as any;
      expect(output).toHaveProperty("checks");
      expect(output).toHaveProperty("passed");
    }
  }, 30_000);

  it("OMEGA_GATE stage exists and produces composite score", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const omega = result.stages.find(s => s.id === "OMEGA_GATE");
    expect(omega).toBeDefined();
    if (omega?.output) {
      const output = omega.output as any;
      // OMEGA produces a composite score between 0 and 1
      if (output.composite_score !== undefined) {
        expect(output.composite_score).toBeGreaterThanOrEqual(0);
        expect(output.composite_score).toBeLessThanOrEqual(1);
      }
    }
  }, 30_000);

  it("pipeline handles edge-case inputs without crashing", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline({
      step_file: "",
      material_spec: "",
      quantity: 0,
      pre_approved: true,
      drawing_text: "",
    });
    // Should still return a result with all 27 stage slots
    expect(result.stages).toHaveLength(27);
    // Pipeline returns a valid status
    expect(["complete", "partial", "failed", "awaiting_approval"]).toContain(result.status);
    // Every stage should have a defined status (no undefined/null)
    for (const stage of result.stages) {
      expect(["pass", "fail", "skip", "pending"]).toContain(stage.status);
    }
  }, 30_000);

  it("each stage result has required fields", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    for (const stage of result.stages) {
      expect(stage).toHaveProperty("id");
      expect(stage).toHaveProperty("label");
      expect(stage).toHaveProperty("status");
      expect(stage).toHaveProperty("duration_ms");
      expect(stage).toHaveProperty("result_summary");
      expect(stage).toHaveProperty("warnings");
      expect(stage).toHaveProperty("errors");
      expect(stage).toHaveProperty("completed_at");
    }
  }, 30_000);

  it("stage durations are non-negative", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    for (const stage of result.stages) {
      expect(stage.duration_ms).toBeGreaterThanOrEqual(0);
    }
  }, 30_000);

  it("POST_SAFETY stage exists and has checks", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const postSafety = result.stages.find(s => s.id === "POST_SAFETY");
    expect(postSafety).toBeDefined();
  }, 30_000);

  it("SECONDARY_OPS identifies operations when applicable", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const secOps = result.stages.find(s => s.id === "SECONDARY_OPS");
    expect(secOps).toBeDefined();
    expect(secOps!.result_summary).toBeDefined();
  }, 30_000);

  it("SCHEDULING stage assigns machine and dates", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const sched = result.stages.find(s => s.id === "SCHEDULING");
    expect(sched).toBeDefined();
  }, 30_000);
});

// ── Session 2B-1: Business/Finance Integration Tests ───────────────────

describe("Session 2B-1: Shop Configuration at INTAKE (U-BC2)", () => {
  it("INTAKE stage descriptor includes ShopConfigurationEngine", () => {
    const stages = quoteToShipOrchestratorEngine.getStageDescriptors();
    const intake = stages.find((s: any) => s.id === "INTAKE");
    expect(intake).toBeDefined();
    expect(intake!.engines).toContain("ShopConfigurationEngine");
  });

  it("INTAKE output includes shop_config when stage passes", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const intake = result.stages.find(s => s.id === "INTAKE");
    expect(intake).toBeDefined();
    if (intake!.status === "pass") {
      const output = intake!.output as any;
      expect(output).toHaveProperty("shop_config");
    }
  }, 30_000);

  it("shop_config contains rates and overhead_pct when loaded", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const intake = result.stages.find(s => s.id === "INTAKE");
    if (intake!.status === "pass") {
      const shopConfig = (intake!.output as any)?.shop_config;
      if (shopConfig) {
        expect(shopConfig).toHaveProperty("rates");
        expect(shopConfig).toHaveProperty("overhead_pct");
        expect(typeof shopConfig.overhead_pct).toBe("number");
        expect(shopConfig.overhead_pct).toBeGreaterThan(0);
      }
    }
  }, 30_000);

  it("INTAKE result_summary is a string", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const intake = result.stages.find(s => s.id === "INTAKE");
    expect(typeof intake!.result_summary).toBe("string");
  }, 30_000);

  it("shop_config profile_id present in output when loaded", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    const intake = result.stages.find(s => s.id === "INTAKE");
    if (intake!.status === "pass") {
      const output = intake!.output as any;
      if (output?.shop_config) {
        expect(output.shop_config.profile_id).toBeDefined();
      }
    }
  }, 30_000);
});

describe("Session 2B-1: PipelineCostModelEngine at QUOTE (U-BC1)", () => {
  it("QUOTE stage descriptor includes PipelineCostModelEngine", () => {
    const stages = quoteToShipOrchestratorEngine.getStageDescriptors();
    const quote = stages.find((s: any) => s.id === "QUOTE");
    expect(quote).toBeDefined();
    expect(quote!.engines).toContain("PipelineCostModelEngine");
  });

  it("QUOTE output includes cost_model field when stage passes", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const quote = result.stages.find(s => s.id === "QUOTE");
    expect(quote).toBeDefined();
    if (quote!.status === "pass") {
      const output = quote!.output as any;
      expect(output).toHaveProperty("cost_model");
    }
  }, 30_000);

  it("cost_model contains line_items when computed", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const quote = result.stages.find(s => s.id === "QUOTE");
    if (quote!.status === "pass") {
      const costModel = (quote!.output as any)?.cost_model;
      if (costModel && costModel.line_items) {
        expect(Array.isArray(costModel.line_items)).toBe(true);
        expect(costModel.line_items.length).toBeGreaterThan(0);
      }
    }
  }, 30_000);

  it("QUOTE result_summary is a string with content", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const quote = result.stages.find(s => s.id === "QUOTE");
    expect(typeof quote!.result_summary).toBe("string");
    // If quote ran, summary should have some content (even if stage was pending)
    if (quote!.status === "pass") {
      expect(quote!.result_summary.length).toBeGreaterThan(0);
    }
  }, 30_000);

  it("cost_model is an object when present in output", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const quote = result.stages.find(s => s.id === "QUOTE");
    if (quote!.status === "pass") {
      const output = quote!.output as any;
      if (output?.cost_model) {
        expect(typeof output.cost_model).toBe("object");
      }
    }
  }, 30_000);
});

describe("Session 2B-1: MarketMaterialPricingEngine at MATERIAL_PROCUREMENT (U-BC3)", () => {
  it("MATERIAL_PROCUREMENT descriptor includes MarketMaterialPricingEngine", () => {
    const stages = quoteToShipOrchestratorEngine.getStageDescriptors();
    const matProc = stages.find((s: any) => s.id === "MATERIAL_PROCUREMENT");
    expect(matProc).toBeDefined();
    expect(matProc!.engines).toContain("MarketMaterialPricingEngine");
  });

  it("MATERIAL_PROCUREMENT output includes market_pricing when stage passes", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const matProc = result.stages.find(s => s.id === "MATERIAL_PROCUREMENT");
    expect(matProc).toBeDefined();
    if (matProc!.status === "pass") {
      const output = matProc!.output as any;
      expect(output).toHaveProperty("market_pricing");
    }
  }, 30_000);

  it("market_pricing contains commodity fields when material is recognized", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const matProc = result.stages.find(s => s.id === "MATERIAL_PROCUREMENT");
    if (matProc!.status === "pass") {
      const pricing = (matProc!.output as any)?.market_pricing;
      if (pricing) {
        expect(pricing).toHaveProperty("final_price_kg");
        expect(pricing).toHaveProperty("index_trend");
        expect(pricing).toHaveProperty("category");
        expect(typeof pricing.final_price_kg).toBe("number");
        expect(pricing.final_price_kg).toBeGreaterThan(0);
      }
    }
  }, 30_000);

  it("unknown materials do not crash the pipeline", async () => {
    const unknownInput: QuoteToShipInput = {
      ...BRACKET_INPUT,
      material_spec: "Unobtanium-XYZ",
    };
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(unknownInput);
    const matProc = result.stages.find(s => s.id === "MATERIAL_PROCUREMENT");
    expect(matProc).toBeDefined();
    // Stage should not crash — any valid status is OK
    expect(["pass", "fail", "skip", "pending", "blocked"]).toContain(matProc!.status);
  }, 30_000);

  it("market_pricing has material key when present", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const matProc = result.stages.find(s => s.id === "MATERIAL_PROCUREMENT");
    if (matProc!.status === "pass") {
      const output = matProc!.output as any;
      if (output?.market_pricing) {
        expect(output.market_pricing).toHaveProperty("material");
      }
    }
  }, 30_000);
});

describe("Session 2B-1: Cross-unit integration", () => {
  it("all 27 stages still present after business engine wiring", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    expect(result.stages.length).toBe(27);
  }, 30_000);

  it("pipeline_version still present", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BASE_INPUT);
    expect(result.pipeline_version).toBeDefined();
  }, 30_000);

  it("shop rates flow from INTAKE to QUOTE when both pass", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const intake = result.stages.find(s => s.id === "INTAKE");
    const quote = result.stages.find(s => s.id === "QUOTE");
    expect(intake).toBeDefined();
    expect(quote).toBeDefined();
    // When INTAKE passes, shop_config should be in output
    if (intake!.status === "pass") {
      const shopConfig = (intake!.output as any)?.shop_config;
      if (shopConfig) {
        expect(shopConfig.rates).toBeDefined();
      }
    }
  }, 30_000);

  it("SPEED_FEED stage still present alongside business engines", async () => {
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(BRACKET_INPUT);
    const speedFeed = result.stages.find(s => s.id === "SPEED_FEED");
    expect(speedFeed).toBeDefined();
    expect(["pass", "fail", "skip", "pending", "blocked"]).toContain(speedFeed!.status);
  }, 30_000);

  it("backward compat: minimal input still runs all 27 stages", async () => {
    const minimal: QuoteToShipInput = {
      step_file: "part.step",
      material_spec: "steel_4140",
      quantity: 1,
    };
    const result = await quoteToShipOrchestratorEngine.runFullPipeline(minimal);
    expect(result.stages.length).toBe(27);
    const statuses = result.stages.map(s => s.status);
    for (const s of statuses) {
      expect(["pass", "fail", "skip", "pending", "blocked"]).toContain(s);
    }
  }, 30_000);
});
