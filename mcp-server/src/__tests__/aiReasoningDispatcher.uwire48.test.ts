/**
 * aiReasoningDispatcher U-WIRE48 round-trip tests — LaserLoRADatasetBuilderEngine.
 *
 * Validates laser_lora_build_dataset / laser_lora_required_schema through
 * prism_ai. Engine wraps BaseLoRADatasetBuilder with a laser-specific render
 * (instruction = "Recommend laser pierce strategy and lead-in for <material>
 * <thickness>mm with <gas> assist.") and bins thickness into 4 buckets so
 * the train/val/test split preserves rare regimes (heavy >=25mm).
 *
 * Engine internals (verified):
 *   - REQUIRED_FEATURE_KEYS: material, thickness_mm, laser_power_w,
 *     assist_gas, pierce_type. Missing/null any → drop.
 *   - REQUIRED_ACTUAL_KEYS: pierce_success (boolean), edge_quality_score
 *     (number 0-10), dross_events (number ≥0).
 *   - enrichFingerprint(): thickness_mm < 3 → "thin"; <10 → "medium";
 *     <25 → "thick"; ≥25 → "heavy". Stamped as fingerprint.thicknessBucket.
 *   - validate() SIDE EFFECT: pierce_success === false ⇒ pushes
 *     "pierce-fail" label (idempotent) AND boosts weight to max(weight, 3.0).
 *   - id-prefixed with "laser-".
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE48
 */

import { describe, it, expect } from "vitest";
import { laserLoRADatasetBuilderEngine } from "../engines/LaserLoRADatasetBuilderEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["laser_lora_build_dataset", "laser_lora_required_schema"] as const;

const GOOD_THIN_JOB = {
  id: "lz-thin-1",
  fingerprint: { material: "MS-1018", thickness_mm: 2 },
  features: {
    material: "MS-1018",
    thickness_mm: 2,
    laser_power_w: 4000,
    assist_gas: "N2",
    pierce_type: "fly",
  },
  actual: { pierce_success: true, edge_quality_score: 8.5, dross_events: 0 },
  weight: 1,
  labels: ["nesting"],
};

const GOOD_HEAVY_JOB = {
  id: "lz-heavy-1",
  fingerprint: { material: "MS-1018", thickness_mm: 30 },
  features: {
    material: "MS-1018",
    thickness_mm: 30,
    laser_power_w: 12000,
    assist_gas: "O2",
    pierce_type: "soft",
  },
  actual: { pierce_success: true, edge_quality_score: 6, dross_events: 2 },
  weight: 1,
  labels: ["heavy"],
};

const PIERCE_FAIL_JOB = {
  id: "lz-fail",
  fingerprint: { material: "SS-304", thickness_mm: 12 },
  features: {
    material: "SS-304",
    thickness_mm: 12,
    laser_power_w: 6000,
    assist_gas: "N2",
    pierce_type: "ramp",
  },
  actual: { pierce_success: false, edge_quality_score: 4, dross_events: 5 },
  weight: 1,
};

const MISSING_FEATURE_JOB = {
  id: "lz-bad-feat",
  fingerprint: { material: "MS-1018", thickness_mm: 4 },
  features: {
    material: "MS-1018",
    thickness_mm: 4,
    laser_power_w: 4000,
    assist_gas: "N2",
    // pierce_type missing
  },
  actual: { pierce_success: true, edge_quality_score: 7, dross_events: 0 },
};

const NON_BOOL_PIERCE_JOB = {
  id: "lz-bad-pierce",
  fingerprint: { material: "MS-1018", thickness_mm: 4 },
  features: {
    material: "MS-1018",
    thickness_mm: 4,
    laser_power_w: 4000,
    assist_gas: "N2",
    pierce_type: "fly",
  },
  actual: { pierce_success: 1, edge_quality_score: 7, dross_events: 0 }, // 1 not boolean
};

const EQ_OUT_OF_RANGE_JOB = {
  id: "lz-eq-oor",
  fingerprint: { material: "MS-1018", thickness_mm: 4 },
  features: {
    material: "MS-1018",
    thickness_mm: 4,
    laser_power_w: 4000,
    assist_gas: "N2",
    pierce_type: "fly",
  },
  actual: { pierce_success: true, edge_quality_score: 11, dross_events: 0 },
};

const NEGATIVE_DROSS_JOB = {
  id: "lz-neg-dross",
  fingerprint: { material: "MS-1018", thickness_mm: 4 },
  features: {
    material: "MS-1018",
    thickness_mm: 4,
    laser_power_w: 4000,
    assist_gas: "N2",
    pierce_type: "fly",
  },
  actual: { pierce_success: true, edge_quality_score: 8, dross_events: -1 },
};

const NAN_EQ_JOB = {
  id: "lz-nan",
  fingerprint: { material: "MS-1018", thickness_mm: 4 },
  features: {
    material: "MS-1018",
    thickness_mm: 4,
    laser_power_w: 4000,
    assist_gas: "N2",
    pierce_type: "fly",
  },
  actual: { pierce_success: true, edge_quality_score: Number.NaN, dross_events: 0 },
};

const INFINITY_DROSS_JOB = {
  id: "lz-inf",
  fingerprint: { material: "MS-1018", thickness_mm: 4 },
  features: {
    material: "MS-1018",
    thickness_mm: 4,
    laser_power_w: 4000,
    assist_gas: "N2",
    pierce_type: "fly",
  },
  actual: { pierce_success: true, edge_quality_score: 8, dross_events: Number.POSITIVE_INFINITY },
};

describe("U-WIRE48 — engine direct: LaserLoRADatasetBuilderEngine", () => {
  it("buildDataset on empty array returns valid stats with zero rows", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([]);
    expect(r.stats.totalJobs).toBe(0);
    expect(r.stats.validJobs).toBe(0);
    expect(typeof r.datasetFingerprint).toBe("string");
    expect(r.datasetFingerprint.length).toBe(24);
  });

  it("buildDataset on single thin job places one example with laser- id prefix", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB]);
    expect(r.stats.validJobs).toBe(1);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("laser-lz-thin-1");
    expect(all[0].instruction).toContain("laser pierce");
    expect(all[0].instruction).toContain("MS-1018");
    expect(all[0].instruction).toContain("2.0mm");
    expect(all[0].instruction).toContain("N2");
  });

  it("enrichFingerprint stamps thicknessBucket: thin (<3) / medium (<10) / thick (<25) / heavy (>=25)", () => {
    const cases = [
      { thickness: 1, bucket: "thin" },
      { thickness: 2.99, bucket: "thin" },
      { thickness: 3, bucket: "medium" },
      { thickness: 9.99, bucket: "medium" },
      { thickness: 10, bucket: "thick" },
      { thickness: 24.99, bucket: "thick" },
      { thickness: 25, bucket: "heavy" },
      { thickness: 50, bucket: "heavy" },
    ];
    for (const { thickness, bucket } of cases) {
      const job = {
        ...GOOD_THIN_JOB,
        id: `lz-${thickness}`,
        features: { ...GOOD_THIN_JOB.features, thickness_mm: thickness },
      };
      const r = laserLoRADatasetBuilderEngine.buildDataset([job]);
      const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
      expect(all[0].metadata.fingerprint.thicknessBucket, `thickness=${thickness} → expected ${bucket}`).toBe(bucket);
    }
  });

  it("validate() side-effect: pierce_success=false adds 'pierce-fail' label and boosts weight to >=3.0", () => {
    // Engine mutates input — clone first.
    const job = { ...PIERCE_FAIL_JOB, labels: undefined as string[] | undefined, weight: 1 };
    const r = laserLoRADatasetBuilderEngine.buildDataset([job]);
    expect(r.stats.validJobs).toBe(1);
    // Label + weight propagate into example metadata.
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all[0].metadata.labels).toContain("pierce-fail");
    expect(all[0].metadata.weight).toBeGreaterThanOrEqual(3.0);
    // byLabel stat reflects the auto-added label.
    expect(r.stats.byLabel["pierce-fail"]).toBe(1);
  });

  it("pierce-fail boost is idempotent: existing label not duplicated", () => {
    const preLabeled = {
      ...PIERCE_FAIL_JOB,
      id: "lz-pre",
      labels: ["pierce-fail", "regression"],
      weight: 5, // already above boost floor
    };
    const r = laserLoRADatasetBuilderEngine.buildDataset([preLabeled]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    // Label only appears once.
    const failCount = all[0].metadata.labels.filter((l: string) => l === "pierce-fail").length;
    expect(failCount).toBe(1);
    // Weight not lowered: max(5, 3.0) = 5.
    expect(all[0].metadata.weight).toBe(5);
  });

  it("buildDataset render produces alphabetically sorted JSON (dross_events < edge_quality_score < pierce_success)", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    const out = all[0].output;
    expect(out.indexOf("dross_events")).toBeLessThan(out.indexOf("edge_quality_score"));
    expect(out.indexOf("edge_quality_score")).toBeLessThan(out.indexOf("pierce_success"));
  });

  it("buildDataset drops job missing required feature (pierce_type absent)", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB, MISSING_FEATURE_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with non-boolean pierce_success (e.g. 1, 'true')", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB, NON_BOOL_PIERCE_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with edge_quality_score > 10 (boundary)", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB, EQ_OUT_OF_RANGE_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with negative dross_events (failure mode)", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB, NEGATIVE_DROSS_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with NaN edge_quality_score (adversarial)", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB, NAN_EQ_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset drops job with Infinity dross_events (adversarial)", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB, INFINITY_DROSS_JOB]);
    expect(r.stats.validJobs).toBe(1);
  });

  it("buildDataset accepts edge_quality_score=0 and =10 (boundary inclusive)", () => {
    const j0 = { ...GOOD_THIN_JOB, id: "lz-eq0", actual: { ...GOOD_THIN_JOB.actual, edge_quality_score: 0 } };
    const j10 = { ...GOOD_THIN_JOB, id: "lz-eq10", actual: { ...GOOD_THIN_JOB.actual, edge_quality_score: 10 } };
    const r = laserLoRADatasetBuilderEngine.buildDataset([j0, j10]);
    expect(r.stats.validJobs).toBe(2);
  });

  it("buildDataset stratifies thin+heavy across distinct buckets (0 hash collisions)", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB, GOOD_HEAVY_JOB]);
    expect(r.stats.validJobs).toBe(2);
    expect(r.stats.geometryHashCollisions).toBe(0);
  });

  it("buildDataset honors custom split (50/25/25 seed=17) with 8 unique-fp jobs", () => {
    const jobs = Array.from({ length: 8 }, (_, i) => ({
      ...GOOD_THIN_JOB,
      id: `lz-${i}`,
      fingerprint: { ...GOOD_THIN_JOB.fingerprint, idx: String(i) },
    }));
    const r = laserLoRADatasetBuilderEngine.buildDataset(jobs, {
      trainRatio: 0.5,
      valRatio: 0.25,
      testRatio: 0.25,
      seed: 17,
    });
    expect(r.stats.validJobs).toBe(8);
    expect(r.stats.trainCount).toBe(4);
    expect(r.stats.valCount).toBe(2);
    expect(r.stats.testCount).toBe(2);
  });

  it("buildDataset throws on negative split ratio (boundary)", () => {
    expect(() =>
      laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB], {
        trainRatio: -0.1,
        valRatio: 0.5,
        testRatio: 0.6,
        seed: 1,
      }),
    ).toThrow(/non-negative/);
  });

  it("buildDataset reproduces datasetFingerprint deterministically", () => {
    const r1 = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB, GOOD_HEAVY_JOB]);
    const r2 = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB, GOOD_HEAVY_JOB]);
    expect(r1.datasetFingerprint).toBe(r2.datasetFingerprint);
  });

  it("requiredSchema returns documented laser feature + actual key lists", () => {
    const s = laserLoRADatasetBuilderEngine.requiredSchema();
    expect(s.features).toEqual([
      "material",
      "thickness_mm",
      "laser_power_w",
      "assist_gas",
      "pierce_type",
    ]);
    expect(s.actuals).toEqual(["pierce_success", "edge_quality_score", "dross_events"]);
  });
});

describe("U-WIRE48 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });

  it("laser_lora_build_dataset minimal valid input parses (empty jobs)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["laser_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [] })).not.toThrow();
  });

  it("laser_lora_build_dataset accepts a fully-formed job", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["laser_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [GOOD_THIN_JOB] })).not.toThrow();
  });

  it("laser_lora_build_dataset rejects missing jobs key", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["laser_lora_build_dataset"];
    expect(() => schema.parse({})).toThrow();
  });

  it("laser_lora_build_dataset rejects job with empty id (boundary)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["laser_lora_build_dataset"];
    expect(() => schema.parse({ jobs: [{ ...GOOD_THIN_JOB, id: "" }] })).toThrow();
  });

  it("laser_lora_build_dataset rejects job missing fingerprint (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["laser_lora_build_dataset"];
    const noFp = { ...GOOD_THIN_JOB } as Record<string, unknown>;
    delete noFp.fingerprint;
    expect(() => schema.parse({ jobs: [noFp] })).toThrow();
  });

  it("laser_lora_build_dataset rejects job missing features (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["laser_lora_build_dataset"];
    const noFeat = { ...GOOD_THIN_JOB } as Record<string, unknown>;
    delete noFeat.features;
    expect(() => schema.parse({ jobs: [noFeat] })).toThrow();
  });

  it("laser_lora_build_dataset rejects job missing actual (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["laser_lora_build_dataset"];
    const noActual = { ...GOOD_THIN_JOB } as Record<string, unknown>;
    delete noActual.actual;
    expect(() => schema.parse({ jobs: [noActual] })).toThrow();
  });

  it("laser_lora_build_dataset split rejects ratio outside [0,1] (both ends)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["laser_lora_build_dataset"];
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: 1.5, valRatio: 0, testRatio: 0, seed: 1 },
      }),
    ).toThrow();
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: -0.1, valRatio: 0.5, testRatio: 0.6, seed: 1 },
      }),
    ).toThrow();
  });

  it("laser_lora_build_dataset split rejects non-finite seed (adversarial)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["laser_lora_build_dataset"];
    expect(() =>
      schema.parse({
        jobs: [],
        split: { trainRatio: 0.8, valRatio: 0.1, testRatio: 0.1, seed: Number.NaN },
      }),
    ).toThrow();
  });

  it("laser_lora_required_schema accepts empty input and passthrough fields", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["laser_lora_required_schema"];
    expect(() => schema.parse({})).not.toThrow();
    expect(() => schema.parse({ ignored: "x" })).not.toThrow();
  });
});

describe("U-WIRE48 — dispatcher round-trip: prism_ai", () => {
  it("laser_lora_build_dataset on empty jobs returns success:true, zero stats", async () => {
    const out = await executeAIReasoningAction("laser_lora_build_dataset", { jobs: [] });
    expect(out.success).toBe(true);
    const data = out.data as {
      stats: { totalJobs: number; validJobs: number };
      datasetFingerprint: string;
    };
    expect(data.stats.totalJobs).toBe(0);
    expect(data.stats.validJobs).toBe(0);
    expect(typeof data.datasetFingerprint).toBe("string");
  });

  it("laser_lora_build_dataset on single thin job returns DatasetBuildResult with bucket=thin", async () => {
    const out = await executeAIReasoningAction("laser_lora_build_dataset", { jobs: [GOOD_THIN_JOB] });
    expect(out.success).toBe(true);
    const data = out.data as {
      examples: { train?: unknown[]; val?: unknown[]; test?: unknown[] };
      stats: { validJobs: number; trainCount: number; valCount: number; testCount: number };
    };
    expect(data.stats.validJobs).toBe(1);
    const surviving = [data.examples.train, data.examples.val, data.examples.test].filter(
      (a) => Array.isArray(a) && a.length > 0,
    );
    expect(surviving).toHaveLength(1);
  });

  it("laser_lora_build_dataset honors custom split (60/20/20 seed=23)", async () => {
    const jobs = Array.from({ length: 10 }, (_, i) => ({
      ...GOOD_THIN_JOB,
      id: `lz-${i}`,
      fingerprint: { ...GOOD_THIN_JOB.fingerprint, idx: String(i) },
    }));
    const out = await executeAIReasoningAction("laser_lora_build_dataset", {
      jobs,
      split: { trainRatio: 0.6, valRatio: 0.2, testRatio: 0.2, seed: 23 },
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { trainCount: number; valCount: number; testCount: number } };
    expect(data.stats.trainCount).toBe(6);
    expect(data.stats.valCount).toBe(2);
    expect(data.stats.testCount).toBe(2);
  });

  it("laser_lora_build_dataset filters out 6 invalid jobs leaving 1 valid", async () => {
    const out = await executeAIReasoningAction("laser_lora_build_dataset", {
      jobs: [
        GOOD_THIN_JOB,
        MISSING_FEATURE_JOB,
        NON_BOOL_PIERCE_JOB,
        EQ_OUT_OF_RANGE_JOB,
        NEGATIVE_DROSS_JOB,
        NAN_EQ_JOB,
        INFINITY_DROSS_JOB,
      ],
    });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { totalJobs: number; validJobs: number } };
    expect(data.stats.totalJobs).toBe(7);
    expect(data.stats.validJobs).toBe(1);
  });

  it("laser_lora_build_dataset auto-labels and boosts pierce-fail through dispatcher", async () => {
    const job = { ...PIERCE_FAIL_JOB, id: "lz-fail-rt", labels: undefined as string[] | undefined, weight: 1 };
    const out = await executeAIReasoningAction("laser_lora_build_dataset", { jobs: [job] });
    expect(out.success).toBe(true);
    const data = out.data as { stats: { byLabel: Record<string, number> } };
    expect(data.stats.byLabel["pierce-fail"]).toBe(1);
  });

  it("laser_lora_required_schema returns documented features + actuals via dispatcher", async () => {
    const out = await executeAIReasoningAction("laser_lora_required_schema", {});
    expect(out.success).toBe(true);
    const data = out.data as { features: string[]; actuals: string[] };
    expect(data.features).toEqual([
      "material",
      "thickness_mm",
      "laser_power_w",
      "assist_gas",
      "pierce_type",
    ]);
    expect(data.actuals).toEqual(["pierce_success", "edge_quality_score", "dross_events"]);
  });

  it("laser_lora_build_dataset without jobs key returns success:false (Zod)", async () => {
    const out = await executeAIReasoningAction("laser_lora_build_dataset", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/jobs|required/i);
  });

  it("laser_lora_build_dataset with bad split ratio returns success:false", async () => {
    const out = await executeAIReasoningAction("laser_lora_build_dataset", {
      jobs: [],
      split: { trainRatio: 5, valRatio: 0, testRatio: 0, seed: 1 },
    });
    expect(out.success).toBe(false);
  });

  it("dispatcher build_dataset matches engine direct on fingerprint+stats (equivalence)", async () => {
    const direct = laserLoRADatasetBuilderEngine.buildDataset([GOOD_THIN_JOB, GOOD_HEAVY_JOB]);
    const out = await executeAIReasoningAction("laser_lora_build_dataset", {
      jobs: [GOOD_THIN_JOB, GOOD_HEAVY_JOB],
    });
    expect(out.success).toBe(true);
    const data = out.data as {
      datasetFingerprint: string;
      stats: { validJobs: number; geometryHashCollisions: number };
    };
    expect(data.datasetFingerprint).toBe(direct.datasetFingerprint);
    expect(data.stats.validJobs).toBe(direct.stats.validJobs);
    expect(data.stats.geometryHashCollisions).toBe(direct.stats.geometryHashCollisions);
  });
});
