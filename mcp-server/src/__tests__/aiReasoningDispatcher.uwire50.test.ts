/**
 * aiReasoningDispatcher U-WIRE50 round-trip tests — MillTurnLoRADatasetBuilderEngine.
 *
 * Validates millturn_dataset_lora_build_dataset / millturn_dataset_lora_required_schema
 * through prism_ai. Engine wraps BaseLoRADatasetBuilder with a mill-turn render
 * (instruction = "Allocate mill-turn channels for a <part> in <material> using
 * <n> channels with/no sub-spindle.") and stamps channels+subSpindle into the
 * fingerprint so split allocation respects the very different scheduling
 * regimes of single-channel-no-handoff vs multi-channel-with-handoff jobs.
 *
 * Engine internals (verified):
 *   - REQUIRED_FEATURE_KEYS: material, part_class, machine_class,
 *     channel_count, sub_spindle. Missing/null any → drop.
 *   - REQUIRED_ACTUAL_KEYS: wait_ms_per_sync, channel_imbalance_ratio.
 *     Each must be finite number ≥0 (zero allowed).
 *   - enrichFingerprint(): channels = `c<n>`, subSpindle = "ss1" | "ss0".
 *   - validate() SIDE EFFECT: channel_imbalance_ratio > 0.95 (strict)
 *     ⇒ pushes "imbalanced" label (idempotent).
 *   - id-prefixed with "millturn-".
 *
 * Note action names use `_dataset_` infix to disambiguate from camDispatcher's
 * existing `millturn_lora_predict|train|optimize` actions (those wire
 * MillTurnLoRACadenceEngine — a different engine).
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE50
 */

import { describe, it, expect } from "vitest";
import { millTurnLoRADatasetBuilderEngine } from "../engines/MillTurnLoRADatasetBuilderEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["millturn_dataset_lora_build_dataset", "millturn_dataset_lora_required_schema"] as const;

const SINGLE_CH_JOB = {
  id: "mt-1ch",
  fingerprint: { material: "1018", part_class: "shaft" },
  features: {
    material: "1018",
    part_class: "shaft",
    machine_class: "Doosan-Puma-MX",
    channel_count: 1,
    sub_spindle: false,
  },
  actual: { wait_ms_per_sync: 250, channel_imbalance_ratio: 0.0 },
  weight: 1,
  labels: ["mt-baseline"],
};

const TWO_CH_SS_JOB = {
  id: "mt-2ch-ss",
  fingerprint: { material: "4140", part_class: "complex-shaft" },
  features: {
    material: "4140",
    part_class: "complex-shaft",
    machine_class: "Mazak-Integrex",
    channel_count: 2,
    sub_spindle: true,
  },
  actual: { wait_ms_per_sync: 1500, channel_imbalance_ratio: 0.4 },
  weight: 1,
};

const IMBALANCED_JOB = {
  id: "mt-imbal",
  fingerprint: { material: "Ti-6Al-4V", part_class: "thin-walled" },
  features: {
    material: "Ti-6Al-4V",
    part_class: "thin-walled",
    machine_class: "Mazak-Integrex",
    channel_count: 2,
    sub_spindle: true,
  },
  actual: { wait_ms_per_sync: 8500, channel_imbalance_ratio: 0.97 }, // > 0.95
  weight: 1,
};

describe("U-WIRE50 — engine direct: MillTurnLoRADatasetBuilderEngine", () => {
  it("buildDataset on empty array returns 0 totalJobs/validJobs and 24-char hex datasetFingerprint", () => {
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([]);
    expect(r.stats.totalJobs).toBe(0);
    expect(r.stats.validJobs).toBe(0);
    expect(r.stats.trainCount).toBe(0);
    expect(r.stats.valCount).toBe(0);
    expect(r.stats.testCount).toBe(0);
    expect(r.datasetFingerprint).toMatch(/^[a-f0-9]{24}$/);
  });

  it("buildDataset on single 1-channel job places one example with millturn- id prefix and exact instruction", () => {
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB]);
    expect(r.stats.totalJobs).toBe(1);
    expect(r.stats.validJobs).toBe(1);
    expect(r.stats.trainCount + r.stats.valCount + r.stats.testCount).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("millturn-mt-1ch");
    expect(all[0].instruction).toBe(
      "Allocate mill-turn channels for a shaft in 1018 using 1 channels no sub-spindle.",
    );
  });

  it("instruction varies sub_spindle phrasing: 'with sub-spindle' vs 'no sub-spindle'", () => {
    const r1 = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB]);
    const r2 = millTurnLoRADatasetBuilderEngine.buildDataset([TWO_CH_SS_JOB]);
    const allNoSS = [...r1.examples.train, ...r1.examples.val, ...r1.examples.test];
    const allWithSS = [...r2.examples.train, ...r2.examples.val, ...r2.examples.test];
    expect(allNoSS[0].instruction).toContain("no sub-spindle");
    expect(allNoSS[0].instruction).not.toContain("with sub-spindle");
    expect(allWithSS[0].instruction).toContain("with sub-spindle");
    expect(allWithSS[0].instruction).toContain("2 channels");
  });

  it("enrichFingerprint stamps channels=c<n> and subSpindle=ss0/ss1 into example metadata", () => {
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB, TWO_CH_SS_JOB]);
    expect(r.stats.validJobs).toBe(2);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    const single = all.find((e) => e.id === "millturn-mt-1ch");
    const twoSS = all.find((e) => e.id === "millturn-mt-2ch-ss");
    expect(single?.metadata.fingerprint.channels).toBe("c1");
    expect(single?.metadata.fingerprint.subSpindle).toBe("ss0");
    expect(twoSS?.metadata.fingerprint.channels).toBe("c2");
    expect(twoSS?.metadata.fingerprint.subSpindle).toBe("ss1");
  });

  it("validate() side-effect: imbalance>0.95 auto-adds 'imbalanced' label visible in stats and metadata", () => {
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([IMBALANCED_JOB]);
    expect(r.stats.validJobs).toBe(1);
    expect(r.stats.byLabel["imbalanced"]).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all[0].metadata.labels).toEqual(["imbalanced"]);
  });

  it("imbalance label is idempotent: pre-labeled 'imbalanced' not duplicated; other labels preserved in order", () => {
    const preLabeled = {
      ...IMBALANCED_JOB,
      id: "mt-pre",
      labels: ["imbalanced", "rework"],
    };
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([preLabeled]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all[0].metadata.labels).toEqual(["imbalanced", "rework"]);
    // byLabel still counts each job's labels once.
    expect(r.stats.byLabel["imbalanced"]).toBe(1);
    expect(r.stats.byLabel["rework"]).toBe(1);
  });

  it("imbalance threshold is strict >0.95: ratio=0.95 (boundary) does NOT trigger label", () => {
    // Fresh labels per case to avoid shared-reference leakage across iterations.
    const onBoundary = {
      ...SINGLE_CH_JOB,
      id: "mt-95",
      labels: [] as string[],
      actual: { wait_ms_per_sync: 100, channel_imbalance_ratio: 0.95 },
    };
    const justOver = {
      ...SINGLE_CH_JOB,
      id: "mt-96",
      labels: [] as string[],
      actual: { wait_ms_per_sync: 100, channel_imbalance_ratio: 0.951 },
    };
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([onBoundary, justOver]);
    expect(r.stats.byLabel["imbalanced"]).toBe(1); // only the >0.95 one
  });

  it("render output JSON has alphabetic key order (channel_imbalance_ratio < wait_ms_per_sync) and round-trips to verbatim values", () => {
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    const out = all[0].output;
    expect(out.indexOf('"channel_imbalance_ratio"')).toBeGreaterThan(-1);
    expect(out.indexOf('"channel_imbalance_ratio"')).toBeLessThan(out.indexOf('"wait_ms_per_sync"'));
    expect(JSON.parse(out)).toEqual({
      channel_imbalance_ratio: 0.0,
      wait_ms_per_sync: 250,
    });
  });

  it("buildDataset drops job missing required feature sub_spindle absent (validJobs counts survivor)", () => {
    const bad = {
      id: "mt-bad-feat",
      fingerprint: { material: "1018", part_class: "shaft" },
      features: {
        material: "1018",
        part_class: "shaft",
        machine_class: "Doosan",
        channel_count: 1,
        // sub_spindle missing
      },
      actual: { wait_ms_per_sync: 100, channel_imbalance_ratio: 0.1 },
    };
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB, bad]);
    expect(r.stats.totalJobs).toBe(2);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with negative wait_ms_per_sync (failure mode)", () => {
    const bad = {
      ...SINGLE_CH_JOB,
      id: "mt-neg",
      actual: { wait_ms_per_sync: -1, channel_imbalance_ratio: 0.1 },
    };
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with NaN channel_imbalance_ratio (non-finite adversarial)", () => {
    const bad = {
      ...SINGLE_CH_JOB,
      id: "mt-nan",
      actual: { wait_ms_per_sync: 100, channel_imbalance_ratio: Number.NaN },
    };
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with Infinity wait_ms_per_sync (non-finite adversarial)", () => {
    const bad = {
      ...SINGLE_CH_JOB,
      id: "mt-inf",
      actual: { wait_ms_per_sync: Number.POSITIVE_INFINITY, channel_imbalance_ratio: 0.1 },
    };
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with non-number imbalance ratio (string adversarial)", () => {
    const bad = {
      ...SINGLE_CH_JOB,
      id: "mt-str",
      actual: { wait_ms_per_sync: 100, channel_imbalance_ratio: "0.5" as unknown as number },
    };
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB, bad]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset accepts zero across both actuals (boundary inclusive)", () => {
    const job = {
      ...SINGLE_CH_JOB,
      id: "mt-zero",
      actual: { wait_ms_per_sync: 0, channel_imbalance_ratio: 0 },
    };
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([job]);
    expect(r.stats.validJobs).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(JSON.parse(all[0].output)).toEqual({
      channel_imbalance_ratio: 0,
      wait_ms_per_sync: 0,
    });
  });

  it("1ch + 2ch+SS + imbalanced (all distinct fingerprints) produce 0 hash collisions", () => {
    const r = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB, TWO_CH_SS_JOB, IMBALANCED_JOB]);
    expect(r.stats.validJobs).toBe(3);
    expect(r.stats.geometryHashCollisions).toBe(0);
  });

  it("custom 50/25/25 split with 8 unique-fp jobs yields exactly 4/2/2 train/val/test", () => {
    const jobs = Array.from({ length: 8 }, (_, i) => ({
      ...SINGLE_CH_JOB,
      id: `mt-${i}`,
      fingerprint: { ...SINGLE_CH_JOB.fingerprint, idx: String(i) },
    }));
    const r = millTurnLoRADatasetBuilderEngine.buildDataset(jobs, {
      trainRatio: 0.5,
      valRatio: 0.25,
      testRatio: 0.25,
      seed: 41,
    });
    expect(r.stats.validJobs).toBe(8);
    expect(r.stats.trainCount).toBe(4);
    expect(r.stats.valCount).toBe(2);
    expect(r.stats.testCount).toBe(2);
  });

  it("buildDataset throws 'non-negative' on a negative split ratio", () => {
    expect(() =>
      millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB], {
        trainRatio: -0.1,
        valRatio: 0.5,
        testRatio: 0.6,
        seed: 1,
      }),
    ).toThrow(/non-negative/);
  });

  it("buildDataset throws 'sum to 1' when ratios don't add to 1", () => {
    expect(() =>
      millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB], {
        trainRatio: 0.5,
        valRatio: 0.5,
        testRatio: 0.5,
        seed: 1,
      }),
    ).toThrow(/sum to 1/);
  });

  it("two builds on identical input produce identical 24-char hex datasetFingerprint (deterministic)", () => {
    const r1 = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB, TWO_CH_SS_JOB]);
    const r2 = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB, TWO_CH_SS_JOB]);
    expect(r1.datasetFingerprint).toBe(r2.datasetFingerprint);
    expect(r1.datasetFingerprint).toMatch(/^[a-f0-9]{24}$/);
  });

  it("requiredSchema returns the exact mill-turn dataset-builder key lists", () => {
    const s = millTurnLoRADatasetBuilderEngine.requiredSchema();
    expect(s.features).toEqual([
      "material",
      "part_class",
      "machine_class",
      "channel_count",
      "sub_spindle",
    ]);
    expect(s.actuals).toEqual(["wait_ms_per_sync", "channel_imbalance_ratio"]);
  });
});

describe("U-WIRE50 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });

  it("millturn_dataset_lora_build_dataset on { jobs: [] } parses to itself unchanged", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["millturn_dataset_lora_build_dataset"];
    expect(schema.parse({ jobs: [] })).toEqual({ jobs: [] });
  });

  it("millturn_dataset_lora_build_dataset on a fully-formed job parses without throwing", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["millturn_dataset_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [SINGLE_CH_JOB] })).not.toThrow();
  });

  it("millturn_dataset_lora_build_dataset rejects {} (missing jobs)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["millturn_dataset_lora_build_dataset"];
    expect(() => schema.parse({})).toThrow();
  });

  it("millturn_dataset_lora_build_dataset rejects empty job id (boundary)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["millturn_dataset_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [{ ...SINGLE_CH_JOB, id: "" }] })).toThrow();
  });

  it("millturn_dataset_lora_build_dataset rejects job missing fingerprint", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["millturn_dataset_lora_build_dataset"];
    const noFp: Record<string, unknown> = { ...SINGLE_CH_JOB };
    delete noFp.fingerprint;
    expect(() => schema.parse({ jobs: [noFp] })).toThrow();
  });

  it("millturn_dataset_lora_build_dataset rejects job missing features", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["millturn_dataset_lora_build_dataset"];
    const noFeat: Record<string, unknown> = { ...SINGLE_CH_JOB };
    delete noFeat.features;
    expect(() => schema.parse({ jobs: [noFeat] })).toThrow();
  });

  it("millturn_dataset_lora_build_dataset rejects job missing actual", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["millturn_dataset_lora_build_dataset"];
    const noActual: Record<string, unknown> = { ...SINGLE_CH_JOB };
    delete noActual.actual;
    expect(() => schema.parse({ jobs: [noActual] })).toThrow();
  });

  it("millturn_dataset_lora_build_dataset split rejects ratios outside [0,1] (both ends)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["millturn_dataset_lora_build_dataset"];
    expect(() =>
      schema.parse({ jobs: [], split: { trainRatio: 1.5, valRatio: 0, testRatio: 0, seed: 1 } }),
    ).toThrow();
    expect(() =>
      schema.parse({ jobs: [], split: { trainRatio: -0.1, valRatio: 0.5, testRatio: 0.6, seed: 1 } }),
    ).toThrow();
  });

  it("millturn_dataset_lora_build_dataset split rejects non-finite seed", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["millturn_dataset_lora_build_dataset"];
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: 0.8, valRatio: 0.1, testRatio: 0.1, seed: Number.NaN },
      }),
    ).toThrow();
  });

  it("millturn_dataset_lora_required_schema parses {} and ignores extras (passthrough)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["millturn_dataset_lora_required_schema"];
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ ignored: "x" })).toEqual({ ignored: "x" });
  });
});

describe("U-WIRE50 — dispatcher round-trip: prism_ai", () => {
  it("millturn_dataset_lora_build_dataset on empty jobs returns success:true with 24-hex fingerprint", async () => {
    const out = await executeAIReasoningAction("millturn_dataset_lora_build_dataset", { jobs: [] });
    expect(out.success).toBe(true);
    const data = out.data as {
      stats: { totalJobs: number; validJobs: number };
      datasetFingerprint: string;
    };
    expect(data.stats.totalJobs).toBe(0);
    expect(data.stats.validJobs).toBe(0);
    expect(data.datasetFingerprint).toMatch(/^[a-f0-9]{24}$/);
  });

  it("millturn_dataset_lora_build_dataset on single 1-ch job returns validJobs=1 with one example surviving slim", async () => {
    const out = await executeAIReasoningAction("millturn_dataset_lora_build_dataset", { jobs: [SINGLE_CH_JOB] });
    expect(out.success).toBe(true);
    const data = out.data as {
      examples: { train?: unknown[]; val?: unknown[]; test?: unknown[] };
      stats: { validJobs: number; trainCount: number; valCount: number; testCount: number };
    };
    expect(data.stats.validJobs).toBe(1);
    expect(data.stats.trainCount + data.stats.valCount + data.stats.testCount).toBe(1);
    const surviving = [data.examples.train, data.examples.val, data.examples.test].filter(
      (a) => Array.isArray(a) && a.length > 0,
    );
    expect(surviving).toHaveLength(1);
    expect(surviving[0]).toHaveLength(1);
  });

  it("custom 60/20/20 split with 10 unique-fp jobs yields exactly 6/2/2 through dispatcher", async () => {
    const jobs = Array.from({ length: 10 }, (_, i) => ({
      ...SINGLE_CH_JOB,
      id: `mt-${i}`,
      fingerprint: { ...SINGLE_CH_JOB.fingerprint, idx: String(i) },
    }));
    const out = await executeAIReasoningAction("millturn_dataset_lora_build_dataset", {
      jobs,
      split: { trainRatio: 0.6, valRatio: 0.2, testRatio: 0.2, seed: 53 },
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { trainCount: number; valCount: number; testCount: number } };
    expect(data.stats.trainCount).toBe(6);
    expect(data.stats.valCount).toBe(2);
    expect(data.stats.testCount).toBe(2);
  });

  it("dispatcher filters 4 invalid jobs out of 5, leaving validJobs=1", async () => {
    const out = await executeAIReasoningAction("millturn_dataset_lora_build_dataset", {
      jobs: [
        SINGLE_CH_JOB,
        // missing sub_spindle
        {
          id: "mt-x1",
          fingerprint: { material: "1018", part_class: "shaft" },
          features: { material: "1018", part_class: "shaft", machine_class: "Doosan", channel_count: 1 },
          actual: { wait_ms_per_sync: 100, channel_imbalance_ratio: 0.1 },
        },
        // negative wait
        { ...SINGLE_CH_JOB, id: "mt-x2", actual: { wait_ms_per_sync: -1, channel_imbalance_ratio: 0.1 } },
        // NaN ratio
        { ...SINGLE_CH_JOB, id: "mt-x3", actual: { wait_ms_per_sync: 100, channel_imbalance_ratio: Number.NaN } },
        // Infinity wait
        { ...SINGLE_CH_JOB, id: "mt-x4", actual: { wait_ms_per_sync: Number.POSITIVE_INFINITY, channel_imbalance_ratio: 0.1 } },
      ],
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { totalJobs: number; validJobs: number } };
    expect(data.stats.totalJobs).toBe(5);
    expect(data.stats.validJobs).toBe(1);
  });

  it("dispatcher auto-stamps 'imbalanced' label on imbalance>0.95 job", async () => {
    const out = await executeAIReasoningAction("millturn_dataset_lora_build_dataset", { jobs: [IMBALANCED_JOB] });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { byLabel: Record<string, number> } };
    expect(data.stats.byLabel["imbalanced"]).toBe(1);
  });

  it("millturn_dataset_lora_required_schema returns the exact documented arrays", async () => {
    const out = await executeAIReasoningAction("millturn_dataset_lora_required_schema", {});
    expect(out.success).toBe(true);
    const data = out.data as { features: string[]; actuals: string[] };
    expect(data.features).toEqual([
      "material",
      "part_class",
      "machine_class",
      "channel_count",
      "sub_spindle",
    ]);
    expect(data.actuals).toEqual(["wait_ms_per_sync", "channel_imbalance_ratio"]);
  });

  it("millturn_dataset_lora_build_dataset with no jobs key returns success:false (Zod)", async () => {
    const out = await executeAIReasoningAction("millturn_dataset_lora_build_dataset", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/jobs|required/i);
  });

  it("millturn_dataset_lora_build_dataset with bad split ratio returns success:false", async () => {
    const out = await executeAIReasoningAction("millturn_dataset_lora_build_dataset", {
      jobs: [],
      split: { trainRatio: 5, valRatio: 0, testRatio: 0, seed: 1 },
    });
    expect(out.success).toBe(false);
  });

  it("dispatcher build_dataset matches engine direct on datasetFingerprint+validJobs+geometryHashCollisions (3 distinct fps)", async () => {
    const direct = millTurnLoRADatasetBuilderEngine.buildDataset([SINGLE_CH_JOB, TWO_CH_SS_JOB, IMBALANCED_JOB]);
    const out = await executeAIReasoningAction("millturn_dataset_lora_build_dataset", {
      jobs: [SINGLE_CH_JOB, TWO_CH_SS_JOB, IMBALANCED_JOB],
    });
    expect(out.success).toBe(true);
    const data = out.data as {
      datasetFingerprint: string;
      stats: { validJobs: number; geometryHashCollisions: number };
    };
    expect(data.datasetFingerprint).toBe(direct.datasetFingerprint);
    expect(data.stats.validJobs).toBe(direct.stats.validJobs);
    expect(data.stats.geometryHashCollisions).toBe(direct.stats.geometryHashCollisions);
    expect(data.stats.geometryHashCollisions).toBe(0);
    expect(data.stats.validJobs).toBe(3);
  });
});
