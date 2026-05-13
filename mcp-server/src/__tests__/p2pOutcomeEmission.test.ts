/**
 * p2pOutcomeEmission — Helper unit tests
 *
 * INFRA-NEURAL-LEDGER-MS1/P0-U02
 *
 * Validates the shared helper that 6 Print-to-Program / Program-Assembler
 * engines call to emit `cross_process_stage_complete` events. Tests cover:
 *   - buildRecordInput shape (kind, source, severity, context, actual)
 *   - sanitizeSummary (scalar-only + snake_case + truncation + NaN/Infinity drop)
 *   - namespacing under actual.summary (collision-proof with helper-controlled success)
 *   - scaffolded note auto-generation + override via params.note
 *   - emitP2POutcome never throws even when the bus rejects/throws
 *   - schema-driven OutcomeEventSchema.safeParse round-trip
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OutcomeEventSchema } from "../schemas/outcomeEventSchema.js";
import {
  buildRecordInput,
  emitP2POutcome,
  P2P_STAGES,
  type P2POutcomeParams,
} from "../utils/p2pOutcomeEmission.js";
import * as busModule from "../engines/OutcomeCaptureBusEngine.js";

const BASE_PARAMS: P2POutcomeParams = {
  engineName: "MillingPrintToProgramEngine",
  domain: "mill",
  pipelineStage: P2P_STAGES.PRINT_TO_PROGRAM,
  success: true,
  jobId: "PART-001",
  summary: {
    total_operations: 5,
    estimated_cycle_time_sec: 120,
    confidence_score: 0.85,
  },
  warnings: ["test warning"],
};

describe("p2pOutcomeEmission.buildRecordInput — shape", () => {
  it("produces a bus-input with kind='cross_process_stage_complete' and source='system'", () => {
    const input = buildRecordInput(BASE_PARAMS, "evt-1", "lin-1");
    expect(input).toMatchObject({
      kind: "cross_process_stage_complete",
      source: "system",
      domain: "mill",
      event_id: "evt-1",
      lineage_id: "lin-1",
    });
  });

  it("maps success=true → severity='info' by default", () => {
    const input = buildRecordInput({ ...BASE_PARAMS, success: true }, "e", "l");
    expect(input.severity).toBe("info");
  });

  it("maps success=false → severity='medium' by default", () => {
    const input = buildRecordInput({ ...BASE_PARAMS, success: false }, "e", "l");
    expect(input.severity).toBe("medium");
  });

  it("respects explicit severity override (caller wins over default)", () => {
    const input = buildRecordInput(
      { ...BASE_PARAMS, success: false, severity: "critical" },
      "e",
      "l",
    );
    expect(input.severity).toBe("critical");
  });

  it("threads engine + pipeline_stage into context for downstream filtering", () => {
    const input = buildRecordInput(BASE_PARAMS, "e", "l");
    expect(input.context).toMatchObject({
      engine: "MillingPrintToProgramEngine",
      pipeline_stage: "print_to_program",
    });
  });
});

describe("p2pOutcomeEmission.buildRecordInput — v1.1.0 context fields", () => {
  it("forwards job_id when supplied", () => {
    const input = buildRecordInput({ ...BASE_PARAMS, jobId: "JOB-42" }, "e", "l");
    expect(input.context).toMatchObject({ job_id: "JOB-42" });
  });

  it("forwards pipeline_run_id when supplied", () => {
    const input = buildRecordInput(
      { ...BASE_PARAMS, pipelineRunId: "run-xyz" },
      "e",
      "l",
    );
    expect(input.context).toMatchObject({ pipeline_run_id: "run-xyz" });
  });

  it("forwards consensus_audit_id when supplied", () => {
    const input = buildRecordInput(
      { ...BASE_PARAMS, consensusAuditId: "audit-7" },
      "e",
      "l",
    );
    expect(input.context).toMatchObject({ consensus_audit_id: "audit-7" });
  });

  it("emits only engine + pipeline_stage context keys when no v1.1.0 fields supplied", () => {
    const input = buildRecordInput(
      { engineName: "E", domain: "mill", pipelineStage: "x", success: true },
      "e",
      "l",
    );
    const keys = Object.keys(input.context as Record<string, unknown>);
    expect(keys.sort()).toEqual(["engine", "pipeline_stage"]);
  });
});

describe("p2pOutcomeEmission.buildRecordInput — actual payload", () => {
  it("namespaces caller summary under actual.summary (no flat-merge with success)", () => {
    const input = buildRecordInput(BASE_PARAMS, "e", "l");
    expect(input.actual).toMatchObject({
      success: true,
      summary: {
        total_operations: 5,
        estimated_cycle_time_sec: 120,
        confidence_score: 0.85,
      },
    });
  });

  it("prevents caller from overwriting helper-controlled success boolean", () => {
    const input = buildRecordInput(
      {
        ...BASE_PARAMS,
        success: true,
        summary: { success: 0 as unknown as number, total_operations: 3 },
      },
      "e",
      "l",
    );
    const actual = input.actual as { success: boolean; summary?: Record<string, unknown> };
    expect(actual.success).toBe(true);
    expect(actual.summary).toMatchObject({ total_operations: 3 });
  });

  it("emits warning_count and warnings_sample when warnings supplied", () => {
    const input = buildRecordInput(
      { ...BASE_PARAMS, warnings: ["w1", "w2", "w3"] },
      "e",
      "l",
    );
    expect(input.actual).toMatchObject({
      warning_count: 3,
      warnings_sample: ["w1", "w2", "w3"],
    });
  });

  it("caps warnings_sample at 8 entries while preserving total warning_count", () => {
    const warnings = Array.from({ length: 12 }, (_, i) => `warn-${i}`);
    const input = buildRecordInput({ ...BASE_PARAMS, warnings }, "e", "l");
    const actual = input.actual as { warnings_sample: string[]; warning_count: number };
    expect(actual.warning_count).toBe(12);
    expect(actual.warnings_sample.length).toBe(8);
    expect(actual.warnings_sample[0]).toBe("warn-0");
    expect(actual.warnings_sample[7]).toBe("warn-7");
  });

  it("omits warning_count and warnings_sample keys when warnings array is empty", () => {
    const input = buildRecordInput(
      { ...BASE_PARAMS, warnings: [] },
      "e",
      "l",
    );
    const actualKeys = Object.keys(input.actual as Record<string, unknown>);
    expect(actualKeys).not.toContain("warning_count");
    expect(actualKeys).not.toContain("warnings_sample");
  });
});

describe("p2pOutcomeEmission.sanitizeSummary — PII gate", () => {
  it("drops camelCase keys (snake_case-only doctrine)", () => {
    const input = buildRecordInput(
      {
        ...BASE_PARAMS,
        summary: {
          totalOperations: 5,
          total_operations: 5,
        },
      },
      "e",
      "l",
    );
    const summary = (input.actual as { summary?: Record<string, unknown> }).summary ?? {};
    expect(summary).toMatchObject({ total_operations: 5 });
    expect(Object.keys(summary)).not.toContain("totalOperations");
  });

  it("drops NaN and Infinity values; keeps finite numbers", () => {
    const input = buildRecordInput(
      {
        ...BASE_PARAMS,
        summary: {
          good_value: 42,
          nan_value: Number.NaN,
          inf_value: Number.POSITIVE_INFINITY,
          neg_inf: Number.NEGATIVE_INFINITY,
        },
      },
      "e",
      "l",
    );
    const summary = (input.actual as { summary?: Record<string, unknown> }).summary ?? {};
    expect(summary).toMatchObject({ good_value: 42 });
    expect(Object.keys(summary).sort()).toEqual(["good_value"]);
  });

  it("drops non-scalar values (objects, arrays, functions); keeps scalars", () => {
    const input = buildRecordInput(
      {
        ...BASE_PARAMS,
        summary: {
          scalar: 1,
          obj: { nested: 1 } as unknown as number,
          arr: [1, 2, 3] as unknown as number,
          fn: (() => 1) as unknown as number,
        },
      },
      "e",
      "l",
    );
    const summary = (input.actual as { summary?: Record<string, unknown> }).summary ?? {};
    expect(summary).toMatchObject({ scalar: 1 });
    expect(Object.keys(summary)).toEqual(["scalar"]);
  });

  it("truncates strings longer than 256 characters with ellipsis", () => {
    const huge = "x".repeat(500);
    const input = buildRecordInput(
      { ...BASE_PARAMS, summary: { note: huge } },
      "e",
      "l",
    );
    const summary = (input.actual as { summary?: Record<string, unknown> }).summary ?? {};
    const noteVal = summary.note as string;
    expect(noteVal.length).toBe(256);
    expect(noteVal.endsWith("...")).toBe(true);
  });

  it("omits actual.summary entirely when sanitization leaves an empty record", () => {
    const input = buildRecordInput(
      {
        ...BASE_PARAMS,
        summary: { badKey: 1, anotherBad: 2 },
      },
      "e",
      "l",
    );
    const actualKeys = Object.keys(input.actual as Record<string, unknown>);
    expect(actualKeys).not.toContain("summary");
  });
});

describe("p2pOutcomeEmission.buildRecordInput — scaffolded engines", () => {
  it("marks context.scaffolded=true and auto-generates a parameterized note", () => {
    const input = buildRecordInput(
      {
        engineName: "LaserProgramAssemblerEngine",
        domain: "laser",
        pipelineStage: P2P_STAGES.LASER_CUT,
        success: true,
        scaffolded: true,
      },
      "e",
      "l",
    );
    expect(input.context).toMatchObject({ scaffolded: true });
    expect(input.note).toMatch(/pipeline_skipped: LaserProgramAssemblerEngine \(laser_cut\)/);
  });

  it("uses explicit note over the scaffolded auto-default when both supplied", () => {
    const input = buildRecordInput(
      {
        ...BASE_PARAMS,
        scaffolded: true,
        note: "custom operator note",
      },
      "e",
      "l",
    );
    expect(input.note).toBe("custom operator note");
  });

  it("omits scaffolded flag and note when scaffolded is not set", () => {
    const input = buildRecordInput(BASE_PARAMS, "e", "l");
    const contextKeys = Object.keys(input.context as Record<string, unknown>);
    expect(contextKeys).not.toContain("scaffolded");
    const inputKeys = Object.keys(input);
    expect(inputKeys).not.toContain("note");
  });
});

describe("p2pOutcomeEmission.buildRecordInput — numeric_features", () => {
  it("forwards non-empty numeric_features to the bus input", () => {
    const input = buildRecordInput(
      {
        ...BASE_PARAMS,
        numericFeatures: { tool_diameter_mm: 12.7, spindle_rpm: 8000 },
      },
      "e",
      "l",
    );
    expect(input.numeric_features).toMatchObject({
      tool_diameter_mm: 12.7,
      spindle_rpm: 8000,
    });
  });

  it("omits numeric_features key when an empty record is supplied", () => {
    const input = buildRecordInput(
      { ...BASE_PARAMS, numericFeatures: {} },
      "e",
      "l",
    );
    expect(Object.keys(input)).not.toContain("numeric_features");
  });
});

describe("p2pOutcomeEmission.emitP2POutcome — fire-and-forget contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls outcomeCaptureBusEngine.record exactly once per emit", () => {
    const spy = vi
      .spyOn(busModule.outcomeCaptureBusEngine, "record")
      .mockReturnValue({ ok: true, event_id: "e", lineage_id: "l", path: "", bytes: 0 });
    emitP2POutcome(BASE_PARAMS);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("passes a bus-input with domain, kind, and context.engine matching params", () => {
    const spy = vi
      .spyOn(busModule.outcomeCaptureBusEngine, "record")
      .mockReturnValue({ ok: true, event_id: "e", lineage_id: "l", path: "", bytes: 0 });
    emitP2POutcome({ ...BASE_PARAMS, engineName: "TurningPrintToProgramEngine", domain: "lathe" });
    const arg = spy.mock.calls[0]?.[0];
    expect(arg).toMatchObject({
      domain: "lathe",
      kind: "cross_process_stage_complete",
      source: "system",
      context: { engine: "TurningPrintToProgramEngine" },
    });
  });

  it("does NOT throw when the bus returns ok:false (schema rejection path)", () => {
    vi.spyOn(busModule.outcomeCaptureBusEngine, "record").mockReturnValue({
      ok: false,
      event_id: "e",
      lineage_id: "l",
      path: "",
      bytes: 0,
      warning: "schema validation failed: synthetic",
    });
    expect(() => emitP2POutcome(BASE_PARAMS)).not.toThrow();
  });

  it("does NOT throw when bus.record itself throws (defense-in-depth)", () => {
    vi.spyOn(busModule.outcomeCaptureBusEngine, "record").mockImplementation(() => {
      throw new Error("synthetic bus crash");
    });
    expect(() => emitP2POutcome(BASE_PARAMS)).not.toThrow();
  });
});

describe("p2pOutcomeEmission — schema round-trip", () => {
  it("produces a bus-input that passes OutcomeEventSchema.safeParse at v1.1.0", () => {
    // The helper always emits kind='cross_process_stage_complete' which is a
    // v1.1.0-only kind — schemaVersion must be "1.1.0" (the bus's
    // pickSchemaVersion auto-stamps this; the schema's superRefine rejects
    // v1.1.0-only kinds paired with schemaVersion="1.0.0").
    const input = buildRecordInput(
      {
        engineName: "WEDMPrintToProgramEngine",
        domain: "wedm",
        pipelineStage: P2P_STAGES.PRINT_TO_PROGRAM,
        success: true,
        summary: { profiles_cut: 4, line_count: 250 },
      },
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    );
    const candidate = {
      ...input,
      schemaVersion: "1.1.0" as const,
      timestamp: new Date().toISOString(),
    };
    const parsed = OutcomeEventSchema.safeParse(candidate);
    expect(parsed.success).toBe(true);
  });

  it("validates a v1.1.0 candidate (cross_process_stage_complete + scaffolded context)", () => {
    const input = buildRecordInput(
      {
        engineName: "LaserProgramAssemblerEngine",
        domain: "laser",
        pipelineStage: P2P_STAGES.LASER_CUT,
        success: false,
        jobId: "laser-job",
        scaffolded: true,
      },
      "33333333-3333-3333-3333-333333333333",
      "44444444-4444-4444-4444-444444444444",
    );
    const candidate = {
      ...input,
      schemaVersion: "1.1.0" as const,
      timestamp: new Date().toISOString(),
    };
    const parsed = OutcomeEventSchema.safeParse(candidate);
    expect(parsed.success).toBe(true);
  });
});

describe("p2pOutcomeEmission.P2P_STAGES — canonical stage vocabulary", () => {
  it("exports exactly 9 canonical stages (1 generic + 4 laser + 4 waterjet)", () => {
    expect(Object.keys(P2P_STAGES).sort()).toEqual([
      "LASER_CUT",
      "LASER_DRILL",
      "LASER_MARK",
      "LASER_WELD",
      "PRINT_TO_PROGRAM",
      "WATERJET_ABRASIVE",
      "WATERJET_CONTROLLED_DEPTH",
      "WATERJET_PURE",
      "WATERJET_TAPER",
    ]);
  });

  it("all stage values are snake_case strings (controlled vocabulary)", () => {
    const snake = /^[a-z][a-z0-9_]*$/;
    for (const [, v] of Object.entries(P2P_STAGES)) {
      expect(v).toMatch(snake);
    }
  });
});
