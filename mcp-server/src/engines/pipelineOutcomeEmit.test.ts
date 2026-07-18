/**
 * pipelineOutcomeEmit.test.ts -- CLOSE-THE-LOOPS-MS0 (slot:india)
 *
 * R9: the load-bearing assertion is that the helper CONSTRUCTS a record that
 * passes the REAL RecordOutcomeTraceInputSchema -- if it builds an invalid record
 * (wrong reward shape, missing engine_name, bad state) every emit silently no-ops
 * and the 4 pipelines stay open-loop while looking wired. We capture the arg the
 * helper passes to record() and validate it against the canonical schema.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { emitPipelineOutcome } from "./pipelineOutcomeEmit.js";
import { outcomeTraceEngine } from "./OutcomeTraceEngine.js";
import { RecordOutcomeTraceInputSchema } from "../schemas/policyExperienceSchema.js";

afterEach(() => vi.restoreAllMocks());

describe("emitPipelineOutcome", () => {
  it("constructs a record that passes the canonical RecordOutcomeTraceInputSchema", () => {
    let captured: any = null;
    vi.spyOn(outcomeTraceEngine, "record").mockImplementation((input: any) => {
      captured = input;
      return { ok: true, experience_id: "exp-1", reward_total: 1, edges_created: [], warnings: [] };
    });

    const r = emitPipelineOutcome({
      domain: "setup_sheet",
      engineName: "SetupSheetPipelineEngine",
      outcomeEventId: "setup_sheet_generated",
      predictionId: "job-42-setup",
      inline: { partId: "P-42", machine: "VMC-02" },
      adapted: { setupCount: 3 },
      reward: { objective: "cycle_time", raw_value: 17.5, sign_convention: "minimize" },
      metadata: { tool_count: 9 },
    });

    expect(r.emitted).toBe(true);
    expect(r.experience_id).toBe("exp-1");
    // THE gold check: the constructed record is schema-valid.
    const parsed = RecordOutcomeTraceInputSchema.safeParse(captured);
    expect(parsed.success).toBe(true);
    // And the fields carry the caller's intent.
    expect(captured.domain).toBe("setup_sheet");
    expect(captured.prediction_id).toBe("job-42-setup");
    expect(captured.outcome_event_id).toBe("setup_sheet_generated");
    expect(captured.action_record.engine_name).toBe("SetupSheetPipelineEngine");
    expect(captured.action_record.adapted.setupCount).toBe(3);
    expect(captured.state.inline.partId).toBe("P-42");
    expect(captured.reward_components[0].objective).toBe("cycle_time");
    expect(captured.reward_components[0].sign_convention).toBe("minimize");
    expect(captured.metadata.tool_count).toBe(9);
  });

  it("defaults to a neutral 'other'/maximize reward + random ids when omitted", () => {
    let captured: any = null;
    vi.spyOn(outcomeTraceEngine, "record").mockImplementation((input: any) => {
      captured = input;
      return { ok: true, experience_id: "x", reward_total: 1, edges_created: [], warnings: [] };
    });
    emitPipelineOutcome({ domain: "traveler", engineName: "JobTravelerEngine", outcomeEventId: "step_done" });
    expect(RecordOutcomeTraceInputSchema.safeParse(captured).success).toBe(true);
    expect(captured.reward_components[0].objective).toBe("other");
    expect(captured.reward_components[0].sign_convention).toBe("maximize");
    expect(captured.reward_components[0].raw_value).toBe(1);
    expect(typeof captured.lineage_id).toBe("string");
    expect(captured.lineage_id.length).toBeGreaterThan(0);
    expect(typeof captured.prediction_id).toBe("string");
    // empty state still valid (StateRef permits an empty inline dict)
    expect(captured.state.inline).toEqual({});
  });

  it("carries both inline and context state when supplied", () => {
    let captured: any = null;
    vi.spyOn(outcomeTraceEngine, "record").mockImplementation((input: any) => {
      captured = input;
      return { ok: true, experience_id: "x", reward_total: 0, edges_created: [], warnings: [] };
    });
    emitPipelineOutcome({
      domain: "fusion_bridge",
      engineName: "AutodeskFusionMCPProxyEngine",
      outcomeEventId: "fusion_extrude",
      inline: { documentOpen: true },
      context: { machine: "fusion", operation: "extrude" },
    });
    expect(captured.state.inline.documentOpen).toBe(true);
    expect(captured.state.context.operation).toBe("extrude");
    expect(RecordOutcomeTraceInputSchema.safeParse(captured).success).toBe(true);
  });

  it("is fire-and-forget: a throwing record() never propagates (returns emitted:false)", () => {
    vi.spyOn(outcomeTraceEngine, "record").mockImplementation(() => {
      throw new Error("ledger disk full");
    });
    let r: any;
    expect(() => { r = emitPipelineOutcome({ domain: "doc_read", engineName: "documentExtractionRouter", outcomeEventId: "routed" }); }).not.toThrow();
    expect(r.emitted).toBe(false);
    expect(r.reason).toMatch(/threw|disk full/);
  });

  it("surfaces a record() not-ok result without throwing", () => {
    vi.spyOn(outcomeTraceEngine, "record").mockImplementation(() => ({
      ok: false, experience_id: "", reward_total: 0, edges_created: [], warnings: ["append failed: x"],
    }));
    const r = emitPipelineOutcome({ domain: "doc_read", engineName: "E", outcomeEventId: "e" });
    expect(r.emitted).toBe(false);
    expect(r.reason).toMatch(/append failed/);
  });

  it("the 4 new generation domains are all schema-valid (enum extension wired)", () => {
    let captured: any = null;
    vi.spyOn(outcomeTraceEngine, "record").mockImplementation((input: any) => {
      captured = input;
      return { ok: true, experience_id: "x", reward_total: 0, edges_created: [], warnings: [] };
    });
    for (const domain of ["setup_sheet", "traveler", "doc_read", "fusion_bridge"] as const) {
      emitPipelineOutcome({ domain, engineName: "E", outcomeEventId: "e" });
      expect(RecordOutcomeTraceInputSchema.safeParse(captured).success, `${domain} must be a valid OutcomeDomain`).toBe(true);
      expect(captured.domain).toBe(domain);
    }
  });
});
