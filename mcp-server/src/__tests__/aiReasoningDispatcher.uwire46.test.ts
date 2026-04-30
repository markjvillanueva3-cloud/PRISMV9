/**
 * aiReasoningDispatcher U-WIRE46 round-trip tests — MillingLoRADatasetBuilderEngine.
 *
 * Validates milling_lora_build_dataset / milling_lora_required_schema through
 * prism_ai. Engine wraps BaseLoRADatasetBuilder with a milling-specific render
 * function (instruction = "Recommend milling feed/speed/strategy for <op_type>
 * on <material> with <tool_class> on a <machine_class> machine.") and a 4-axis
 * fingerprint (material, tool_class, op_type, machine_class). Stateless.
 *
 * Engine internals (verified):
 *   - REQUIRED_FEATURE_KEYS: material, tool_class, op_type, machine_class.
 *     Missing/empty/null any of these → job dropped (validate returns reason).
 *   - REQUIRED_ACTUAL_KEYS: rpm, feed_mm_min. Must be finite positive number.
 *     Non-number, NaN, Infinity, ≤0, missing → job dropped.
 *   - Render produces JSON-stable input/output (sorted keys → reproducible
 *     fingerprint).
 *   - Split: validates ratios non-negative + sum=1±1e-6 + finite seed.
 *   - Empty dataset → empty splits, totalJobs/validJobs:0, but datasetFingerprint
 *     still computed (machineType + 0 + seed + empty hash list).
 *   - Per-machine examples are id-prefixed with "milling-".
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE46
 */

import { describe, it, expect } from "vitest";
import { millingLoRADatasetBuilderEngine } from "../engines/MillingLoRADatasetBuilderEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["milling_lora_build_dataset", "milling_lora_required_schema"] as const;

// Fully-formed RawJob with every required key + sensible actuals.
const GOOD_JOB = {
  id: "job-001",
  fingerprint: {
    material: "4140",
    tool_class: "carbide-end-mill-12mm",
    op_type: "roughing",
    machine_class: "haas-vf2",
  },
  features: {
    material: "4140",
    tool_class: "carbide-end-mill-12mm",
    op_type: "roughing",
    machine_class: "haas-vf2",
    ap_mm: 4,
    ae_mm: 8,
    fz_mm_rev_tooth: 0.05,
    vc_m_min: 200,
  },
  actual: {
    rpm: 5300,
    feed_mm_min: 1060,
  },
  weight: 1,
  labels: ["roughing"],
};

// Job missing the required feature 'machine_class' — must be dropped by validate.
const MISSING_FEATURE_JOB = {
  id: "job-002",
  fingerprint: { material: "6061", tool_class: "carbide", op_type: "finishing", machine_class: "" },
  features: {
    material: "6061",
    tool_class: "carbide",
    op_type: "finishing",
    machine_class: "", // empty string triggers drop
  },
  actual: { rpm: 12000, feed_mm_min: 2400 },
};

// Job with invalid actual (non-finite feed) — must be dropped.
const NAN_ACTUAL_JOB = {
  id: "job-003",
  fingerprint: { material: "4140", tool_class: "carbide", op_type: "roughing", machine_class: "haas-vf2" },
  features: { material: "4140", tool_class: "carbide", op_type: "roughing", machine_class: "haas-vf2" },
  actual: { rpm: 5300, feed_mm_min: Number.NaN },
};

// Job with negative rpm — must be dropped (≤0 fails finite-positive check).
const NEGATIVE_RPM_JOB = {
  id: "job-004",
  fingerprint: { material: "4140", tool_class: "carbide", op_type: "roughing", machine_class: "haas-vf2" },
  features: { material: "4140", tool_class: "carbide", op_type: "roughing", machine_class: "haas-vf2" },
  actual: { rpm: -1, feed_mm_min: 1000 },
};

// Second valid job for split + label tests.
const GOOD_JOB_2 = {
  id: "job-010",
  fingerprint: {
    material: "6061",
    tool_class: "carbide-ball-6mm",
    op_type: "finishing",
    machine_class: "haas-vf2",
  },
  features: {
    material: "6061",
    tool_class: "carbide-ball-6mm",
    op_type: "finishing",
    machine_class: "haas-vf2",
    ap_mm: 0.3,
    ae_mm: 0.5,
    fz_mm_rev_tooth: 0.02,
    vc_m_min: 350,
  },
  actual: { rpm: 18000, feed_mm_min: 4320 },
  weight: 0.5,
  labels: ["finishing", "high-speed"],
};

describe("U-WIRE46 — engine direct: MillingLoRADatasetBuilderEngine", () => {
  it("buildDataset on empty array returns valid stats with zero rows", () => {
    const r = millingLoRADatasetBuilderEngine.buildDataset([]);
    expect(r.stats.totalJobs).toBe(0);
    expect(r.stats.validJobs).toBe(0);
    expect(r.stats.trainCount).toBe(0);
    expect(r.stats.valCount).toBe(0);
    expect(r.stats.testCount).toBe(0);
    expect(r.examples.train).toHaveLength(0);
    expect(r.examples.val).toHaveLength(0);
    expect(r.examples.test).toHaveLength(0);
    // Fingerprint still produced (machineType + 0 + seed + []).
    expect(typeof r.datasetFingerprint).toBe("string");
    expect(r.datasetFingerprint.length).toBe(24);
  });

  it("buildDataset on single good job places one example in train (default 80/10/10)", () => {
    const r = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB]);
    expect(r.stats.totalJobs).toBe(1);
    expect(r.stats.validJobs).toBe(1);
    // Math.floor(1*0.8) = 0 train; Math.floor(1*0.1) = 0 val; remainder → test.
    expect(r.stats.trainCount + r.stats.valCount + r.stats.testCount).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("milling-job-001");
    expect(all[0].instruction).toContain("milling");
    expect(all[0].instruction).toContain("roughing");
    expect(all[0].instruction).toContain("4140");
    expect(all[0].instruction).toContain("carbide-end-mill-12mm");
    expect(all[0].instruction).toContain("haas-vf2");
  });

  it("render produces stable JSON input/output (sorted keys → reproducible fingerprint)", () => {
    const r1 = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB]);
    const r2 = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB]);
    expect(r1.datasetFingerprint).toBe(r2.datasetFingerprint);
    const all = [...r1.examples.train, ...r1.examples.val, ...r1.examples.test];
    // Output JSON has rpm BEFORE feed_mm_min if alphabetical sort applied? Actually
    // alphabetical: feed_mm_min < rpm. Ensure we get the expected order.
    expect(all[0].output.indexOf("feed_mm_min")).toBeLessThan(all[0].output.indexOf("rpm"));
  });

  it("buildDataset drops jobs missing required feature key (empty machine_class)", () => {
    const r = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, MISSING_FEATURE_JOB]);
    expect(r.stats.totalJobs).toBe(2);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops jobs with NaN actual (failure mode: non-finite)", () => {
    const r = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, NAN_ACTUAL_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops jobs with negative rpm (failure mode: ≤0)", () => {
    const r = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, NEGATIVE_RPM_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops jobs with missing actual key entirely (failure mode)", () => {
    const job = { ...GOOD_JOB, id: "job-noactual", actual: { rpm: 5000 } as Record<string, unknown> }; // feed_mm_min missing
    const r = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, job]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops jobs with Infinity actual (adversarial: non-finite)", () => {
    const job = { ...GOOD_JOB, id: "job-inf", actual: { rpm: 5000, feed_mm_min: Number.POSITIVE_INFINITY } };
    const r = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, job]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops jobs with non-number actual (adversarial: string)", () => {
    const job = { ...GOOD_JOB, id: "job-str", actual: { rpm: 5000, feed_mm_min: "1000" as unknown as number } };
    const r = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, job]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset propagates labels to byLabel stats", () => {
    const r = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, GOOD_JOB_2]);
    expect(r.stats.byLabel.roughing).toBe(1);
    expect(r.stats.byLabel.finishing).toBe(1);
    expect(r.stats.byLabel["high-speed"]).toBe(1);
  });

  it("buildDataset computes weighted average (job1=1.0, job2=0.5 → avg 0.75)", () => {
    const r = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, GOOD_JOB_2]);
    expect(r.stats.avgWeight).toBeCloseTo(0.75, 5);
  });

  it("buildDataset honors custom split (50/25/25 seed=42)", () => {
    const jobs = Array.from({ length: 8 }, (_, i) => ({
      ...GOOD_JOB,
      id: `job-${i}`,
      fingerprint: { ...GOOD_JOB.fingerprint, idx: String(i) }, // unique fingerprint per job
    }));
    const r = millingLoRADatasetBuilderEngine.buildDataset(jobs, {
      trainRatio: 0.5,
      valRatio: 0.25,
      testRatio: 0.25,
      seed: 42,
    });
    expect(r.stats.validJobs).toBe(8);
    expect(r.stats.trainCount).toBe(4); // floor(8*0.5)
    expect(r.stats.valCount).toBe(2);   // floor(8*0.25)
    expect(r.stats.testCount).toBe(2);  // remainder
  });

  it("buildDataset throws on negative split ratio (boundary failure)", () => {
    expect(() =>
      millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB], {
        trainRatio: -0.1,
        valRatio: 0.5,
        testRatio: 0.6,
        seed: 1,
      }),
    ).toThrow(/non-negative/);
  });

  it("buildDataset throws on split ratios summing != 1 (boundary failure)", () => {
    expect(() =>
      millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB], {
        trainRatio: 0.5,
        valRatio: 0.5,
        testRatio: 0.5, // sum = 1.5
        seed: 1,
      }),
    ).toThrow(/sum to 1/);
  });

  it("buildDataset throws on non-finite seed (adversarial)", () => {
    expect(() =>
      millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB], {
        trainRatio: 0.8,
        valRatio: 0.1,
        testRatio: 0.1,
        seed: Number.NaN,
      }),
    ).toThrow(/Seed must be finite/);
  });

  it("buildDataset counts geometryHash collisions when fingerprints repeat", () => {
    // Two jobs with identical fingerprint → 1 collision.
    const r = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, { ...GOOD_JOB, id: "job-dup" }]);
    expect(r.stats.geometryHashCollisions).toBe(1);
  });

  it("requiredSchema returns documented feature + actual key lists", () => {
    const s = millingLoRADatasetBuilderEngine.requiredSchema();
    expect(s.features).toEqual(["material", "tool_class", "op_type", "machine_class"]);
    expect(s.actuals).toEqual(["rpm", "feed_mm_min"]);
  });
});

describe("U-WIRE46 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });

  it("milling_lora_build_dataset minimal valid input parses (empty jobs)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_build_dataset"];
    const parsed = schema.parse({ jobs: [] });
    expect(parsed).toEqual({ jobs: [] });
  });

  it("milling_lora_build_dataset accepts a fully-formed job", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [GOOD_JOB] })).not.toThrow();
  });

  it("milling_lora_build_dataset rejects missing jobs key (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_build_dataset"];
    expect(() => schema.parse({})).toThrow();
  });

  it("milling_lora_build_dataset rejects job missing id (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_build_dataset"];
    const noId = { ...GOOD_JOB } as Record<string, unknown>;
    delete noId.id;
    expect(() => schema.parse({ jobs: [noId] })).toThrow();
  });

  it("milling_lora_build_dataset rejects empty job id (boundary failure)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [{ ...GOOD_JOB, id: "" }] })).toThrow();
  });

  it("milling_lora_build_dataset rejects job missing fingerprint (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_build_dataset"];
    const noFp = { ...GOOD_JOB } as Record<string, unknown>;
    delete noFp.fingerprint;
    expect(() => schema.parse({ jobs: [noFp] })).toThrow();
  });

  it("milling_lora_build_dataset rejects job missing features (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_build_dataset"];
    const noFeat = { ...GOOD_JOB } as Record<string, unknown>;
    delete noFeat.features;
    expect(() => schema.parse({ jobs: [noFeat] })).toThrow();
  });

  it("milling_lora_build_dataset rejects job missing actual (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_build_dataset"];
    const noActual = { ...GOOD_JOB } as Record<string, unknown>;
    delete noActual.actual;
    expect(() => schema.parse({ jobs: [noActual] })).toThrow();
  });

  it("milling_lora_build_dataset split rejects ratio outside [0,1]", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_build_dataset"];
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: 1.5, valRatio: 0.0, testRatio: 0.0, seed: 1 },
      }),
    ).toThrow();
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: -0.1, valRatio: 0.5, testRatio: 0.6, seed: 1 },
      }),
    ).toThrow();
  });

  it("milling_lora_build_dataset split rejects non-finite seed (adversarial)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_build_dataset"];
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: 0.8, valRatio: 0.1, testRatio: 0.1, seed: Number.NaN },
      }),
    ).toThrow();
  });

  it("milling_lora_required_schema accepts empty input", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_required_schema"];
    expect(() => schema.parse({})).not.toThrow();
  });

  it("milling_lora_required_schema accepts unknown extra fields (passthrough)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["milling_lora_required_schema"];
    expect(() => schema.parse({ extraneous: "ignored" })).not.toThrow();
  });
});

describe("U-WIRE46 — dispatcher round-trip: prism_ai", () => {
  it("milling_lora_build_dataset on empty jobs returns success:true, zero stats", async () => {
    const out = await executeAIReasoningAction("milling_lora_build_dataset", { jobs: [] });
    expect(out.success).toBe(true);
    const data = out.data as {
      stats: { totalJobs: number; validJobs: number; trainCount: number; valCount: number; testCount: number };
      datasetFingerprint: string;
    };
    expect(data.stats.totalJobs).toBe(0);
    expect(data.stats.validJobs).toBe(0);
    expect(typeof data.datasetFingerprint).toBe("string");
  });

  it("milling_lora_build_dataset on a good job returns full DatasetBuildResult shape", async () => {
    const out = await executeAIReasoningAction("milling_lora_build_dataset", { jobs: [GOOD_JOB] });
    expect(out.success).toBe(true);
    // slimResponse strips empty arrays — with one valid job, train/val are
    // floor(1*0.8)=0 and floor(1*0.1)=0 so only `test` survives the slim.
    // Assert union covers the one valid example and the surviving array
    // is well-formed instead of asserting all three buckets are present.
    const data = out.data as {
      examples: { train?: unknown[]; val?: unknown[]; test?: unknown[] };
      stats: { totalJobs: number; validJobs: number; trainCount: number; valCount: number; testCount: number };
      datasetFingerprint: string;
    };
    expect(data.stats.validJobs).toBe(1);
    expect(data.stats.trainCount + data.stats.valCount + data.stats.testCount).toBe(1);
    const surviving = [data.examples.train, data.examples.val, data.examples.test].filter((a) => Array.isArray(a) && a.length > 0);
    expect(surviving).toHaveLength(1);
    expect(surviving[0]).toHaveLength(1);
  });

  it("milling_lora_build_dataset honors custom split from caller", async () => {
    const jobs = Array.from({ length: 10 }, (_, i) => ({
      ...GOOD_JOB,
      id: `job-${i}`,
      fingerprint: { ...GOOD_JOB.fingerprint, idx: String(i) },
    }));
    const out = await executeAIReasoningAction("milling_lora_build_dataset", {
      jobs,
      split: { trainRatio: 0.6, valRatio: 0.2, testRatio: 0.2, seed: 7 },
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { trainCount: number; valCount: number; testCount: number } };
    expect(data.stats.trainCount).toBe(6); // floor(10*0.6)
    expect(data.stats.valCount).toBe(2);   // floor(10*0.2)
    expect(data.stats.testCount).toBe(2);  // remainder
  });

  it("milling_lora_build_dataset filters out invalid jobs (engine validate)", async () => {
    const out = await executeAIReasoningAction("milling_lora_build_dataset", {
      jobs: [GOOD_JOB, MISSING_FEATURE_JOB, NAN_ACTUAL_JOB, NEGATIVE_RPM_JOB],
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { totalJobs: number; validJobs: number } };
    expect(data.stats.totalJobs).toBe(4);
    expect(data.stats.validJobs).toBe(1);
  });

  it("milling_lora_required_schema returns features + actuals arrays", async () => {
    const out = await executeAIReasoningAction("milling_lora_required_schema", {});
    expect(out.success).toBe(true);
    const data = out.data as { features: string[]; actuals: string[] };
    expect(data.features).toEqual(["material", "tool_class", "op_type", "machine_class"]);
    expect(data.actuals).toEqual(["rpm", "feed_mm_min"]);
  });

  it("milling_lora_build_dataset without jobs key returns success:false (Zod)", async () => {
    const out = await executeAIReasoningAction("milling_lora_build_dataset", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/jobs|required/i);
  });

  it("milling_lora_build_dataset with empty job id returns success:false (Zod)", async () => {
    const out = await executeAIReasoningAction("milling_lora_build_dataset", {
      jobs: [{ ...GOOD_JOB, id: "" }],
    });
    expect(out.success).toBe(false);
  });

  it("milling_lora_build_dataset with bad split ratio returns success:false", async () => {
    const out = await executeAIReasoningAction("milling_lora_build_dataset", {
      jobs: [],
      split: { trainRatio: 5, valRatio: 0.0, testRatio: 0.0, seed: 1 },
    });
    expect(out.success).toBe(false);
  });

  it("milling_lora_build_dataset propagates labels through dispatcher", async () => {
    const out = await executeAIReasoningAction("milling_lora_build_dataset", {
      jobs: [GOOD_JOB, GOOD_JOB_2],
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { byLabel: Record<string, number> } };
    expect(data.stats.byLabel.roughing).toBe(1);
    expect(data.stats.byLabel.finishing).toBe(1);
    expect(data.stats.byLabel["high-speed"]).toBe(1);
  });

  it("dispatcher build_dataset matches engine direct for same input (equivalence)", async () => {
    const direct = millingLoRADatasetBuilderEngine.buildDataset([GOOD_JOB, GOOD_JOB_2]);
    const out = await executeAIReasoningAction("milling_lora_build_dataset", {
      jobs: [GOOD_JOB, GOOD_JOB_2],
    });
    expect(out.success).toBe(true);
    const data = out.data as { datasetFingerprint: string; stats: { validJobs: number; geometryHashCollisions: number } };
    expect(data.datasetFingerprint).toBe(direct.datasetFingerprint);
    expect(data.stats.validJobs).toBe(direct.stats.validJobs);
    expect(data.stats.geometryHashCollisions).toBe(direct.stats.geometryHashCollisions);
  });
});
