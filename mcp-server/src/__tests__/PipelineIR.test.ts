// PipelineIR.test.ts -- PIPELINE-IR-MS0/U-PIR01. Real parse/reject/default assertions.
import { describe, it, expect } from "vitest";
import {
  PipelineIRSchema,
  PipelineStageSchema,
  ParamSpecSchema,
  StageRefSchema,
  StageErrorPolicySchema,
  PRINT_TO_PROGRAM_IR,
} from "../schemas/PipelineIR.js";

describe("PipelineIR -- worked example", () => {
  it("PRINT_TO_PROGRAM_IR is a valid IR with a 4-stage DAG", () => {
    const r = PipelineIRSchema.safeParse(PRINT_TO_PROGRAM_IR);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.id).toBe("print-to-program");
    expect(r.data.stages.map((s) => s.id)).toEqual(["extract", "speed_feed", "toolpath", "safety"]);
    // safety depends on toolpath depends on {extract, speed_feed} depends on extract -> linear-ish DAG
    expect(r.data.stages.find((s) => s.id === "toolpath")!.dependsOn).toEqual(["extract", "speed_feed"]);
    expect(r.data.stages.find((s) => s.id === "toolpath")!.onError).toBe("retry");
    expect(r.data.stages.find((s) => s.id === "toolpath")!.retries).toBe(2);
  });
});

describe("PipelineIR -- defaults", () => {
  it("applies version, params, dependsOn, onError, retries defaults", () => {
    const r = PipelineIRSchema.parse({
      id: "p",
      stages: [{ id: "s1", dispatcher: "prism_calc", action: "speed_feed" }],
    });
    expect(r.version).toBe("1.0.0");
    const s = r.stages[0];
    expect(s.params).toEqual({});
    expect(s.dependsOn).toEqual([]);
    expect(s.onError).toBe("abort");
    expect(s.retries).toBe(0);
  });
});

describe("PipelineIR -- structural rejection (failure modes)", () => {
  it("rejects an empty stages array", () => {
    expect(PipelineIRSchema.safeParse({ id: "p", stages: [] }).success).toBe(false);
  });
  it("rejects a missing pipeline id", () => {
    expect(PipelineIRSchema.safeParse({ stages: [{ id: "s", dispatcher: "d", action: "a" }] }).success).toBe(false);
  });
  it("rejects an empty stage id / dispatcher / action", () => {
    expect(PipelineStageSchema.safeParse({ id: "", dispatcher: "d", action: "a" }).success).toBe(false);
    expect(PipelineStageSchema.safeParse({ id: "s", dispatcher: "", action: "a" }).success).toBe(false);
    expect(PipelineStageSchema.safeParse({ id: "s", dispatcher: "d", action: "" }).success).toBe(false);
  });
  it("rejects an invalid onError enum value", () => {
    expect(StageErrorPolicySchema.safeParse("explode").success).toBe(false);
    expect(PipelineStageSchema.safeParse({ id: "s", dispatcher: "d", action: "a", onError: "explode" }).success).toBe(false);
  });
  it("rejects unknown keys (strict)", () => {
    expect(PipelineStageSchema.safeParse({ id: "s", dispatcher: "d", action: "a", bogus: 1 }).success).toBe(false);
  });
  it("rejects retries out of range", () => {
    expect(PipelineStageSchema.safeParse({ id: "s", dispatcher: "d", action: "a", retries: 99 }).success).toBe(false);
    expect(PipelineStageSchema.safeParse({ id: "s", dispatcher: "d", action: "a", retries: -1 }).success).toBe(false);
  });
});

describe("ParamSpec -- literal XOR ref (adversarial)", () => {
  it("accepts a pure literal", () => {
    expect(ParamSpecSchema.safeParse({ value: 42 }).success).toBe(true);
    expect(ParamSpecSchema.safeParse({ value: null }).success).toBe(true); // unknown allows null
  });
  it("accepts a pure ref", () => {
    expect(ParamSpecSchema.safeParse({ ref: { stage: "s1" } }).success).toBe(true);
    expect(ParamSpecSchema.safeParse({ ref: { stage: "s1", path: "result.value" } }).success).toBe(true);
  });
  it("rejects BOTH value and ref together (strict union, no overlap)", () => {
    expect(ParamSpecSchema.safeParse({ value: 1, ref: { stage: "s1" } }).success).toBe(false);
  });
  it("rejects NEITHER (empty object)", () => {
    expect(ParamSpecSchema.safeParse({}).success).toBe(false);
  });
  it("rejects a ref with an empty stage id", () => {
    expect(StageRefSchema.safeParse({ stage: "" }).success).toBe(false);
  });
});
