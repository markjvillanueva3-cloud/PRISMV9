/**
 * MillingLoRADatasetBuilderEngine wiring test
 * ===========================================
 * BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING — iter-2.
 *
 * Verifies the 2 new prism_mill actions end-to-end:
 *   - mill_lora_build_dataset
 *   - mill_lora_required_schema
 *
 * Three real-behavior assertion layers (no toBeDefined-only):
 *   1) SOURCE-GREP — MILL_ACTIONS membership + case-block presence +
 *      lora_dataset lazy getter pin
 *   2) SCHEMA — concrete safeParse accept/reject with typed field-value
 *      comparison; non-empty jobs[] required
 *   3) RUNTIME — invoke the singleton against a valid RawJob set; verify
 *      the dataset builder returns Alpaca-format examples with the
 *      engine-required feature + actual keys
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { millingLoRADatasetBuilderEngine } from "../engines/MillingLoRADatasetBuilderEngine.js";
import type { RawJob } from "../engines/MachineLoRABaseEngine.js";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = join(HERE, "..", "tools", "dispatchers", "millDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf8");

const NEW_ACTIONS = [
  "mill_lora_build_dataset",
  "mill_lora_required_schema",
] as const;

type ZodSchemaLike = {
  safeParse: (p: unknown) => { success: boolean; data?: unknown };
};
const getSchema = (action: string): ZodSchemaLike =>
  (MILL_ACTION_SCHEMAS as Record<string, ZodSchemaLike>)[action];

function mkJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    id: "JOB-001",
    fingerprint: { material: "AISI 1045", tool_class: "endmill_carbide" },
    features: {
      material: "AISI 1045",
      tool_class: "endmill_carbide",
      op_type: "pocket_rough",
      machine_class: "vmc_40taper",
      ap_mm: 4,
      ae_mm: 2,
      fz_mm_rev_tooth: 0.05,
      vc_m_min: 180,
    },
    actual: { rpm: 4500, feed_mm_min: 900 },
    ...overrides,
  };
}

describe("MillingLoRADatasetBuilderEngine wiring (U-BRIDGE-WIRE-MILLING iter-2)", () => {
  // ---------------------------------------------------------------------
  // LAYER 1 — source pins
  // ---------------------------------------------------------------------
  describe("dispatcher source contains the 2 actions + lora_dataset getter", () => {
    for (const action of NEW_ACTIONS) {
      it(`MILL_ACTIONS contains exactly one '${action}'`, () => {
        const arr = MILL_ACTIONS as readonly string[];
        expect(arr.filter((x) => x === action).length).toBe(1);
      });
      it(`dispatcher source has 'case "${action}":' block`, () => {
        expect(DISPATCHER_SRC.includes(`case "${action}":`)).toBe(true);
      });
    }

    it("dispatcher source lazy-imports MillingLoRADatasetBuilderEngine", () => {
      expect(DISPATCHER_SRC.includes('case "lora_dataset":')).toBe(true);
      expect(DISPATCHER_SRC.includes("MillingLoRADatasetBuilderEngine.js")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // LAYER 2 — schemas reject malformed + accept valid
  // ---------------------------------------------------------------------
  describe("Zod schemas validate input", () => {
    it("mill_lora_build_dataset REJECTS empty jobs array", () => {
      const r = getSchema("mill_lora_build_dataset").safeParse({ jobs: [] });
      expect(r.success).toBe(false);
    });

    it("mill_lora_build_dataset REJECTS missing jobs key", () => {
      const r = getSchema("mill_lora_build_dataset").safeParse({});
      expect(r.success).toBe(false);
    });

    it("mill_lora_build_dataset REJECTS job missing required id", () => {
      const r = getSchema("mill_lora_build_dataset").safeParse({
        jobs: [{ fingerprint: { m: "x" }, features: { a: 1 }, actual: { rpm: 100 } }],
      });
      expect(r.success).toBe(false);
    });

    it("mill_lora_build_dataset ACCEPTS valid single-job array", () => {
      const r = getSchema("mill_lora_build_dataset").safeParse({ jobs: [mkJob()] });
      expect(r.success).toBe(true);
      const data = r.data as { jobs: RawJob[] };
      expect(data.jobs.length).toBe(1);
      expect(data.jobs[0].id).toBe("JOB-001");
    });

    it("mill_lora_build_dataset ACCEPTS valid split config", () => {
      const r = getSchema("mill_lora_build_dataset").safeParse({
        jobs: [mkJob()],
        split: { trainRatio: 0.7, valRatio: 0.15, testRatio: 0.15, seed: 42 },
      });
      expect(r.success).toBe(true);
    });

    it("mill_lora_build_dataset REJECTS split ratios outside [0,1]", () => {
      const r = getSchema("mill_lora_build_dataset").safeParse({
        jobs: [mkJob()],
        split: { trainRatio: 1.5, valRatio: 0.15, testRatio: 0.15, seed: 42 },
      });
      expect(r.success).toBe(false);
    });

    it("mill_lora_required_schema ACCEPTS empty payload, REJECTS extras (.strict)", () => {
      expect(getSchema("mill_lora_required_schema").safeParse({}).success).toBe(true);
      expect(getSchema("mill_lora_required_schema").safeParse({ x: 1 }).success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------
  // LAYER 3 — engine round-trip
  // ---------------------------------------------------------------------
  describe("engine round-trip returns concrete dataset values", () => {
    it("requiredSchema() returns the documented feature keys", () => {
      const r = millingLoRADatasetBuilderEngine.requiredSchema();
      expect(r.features.length).toBe(4);
      expect([...r.features].sort()).toEqual(
        ["machine_class", "material", "op_type", "tool_class"].sort(),
      );
      expect([...r.actuals].sort()).toEqual(["feed_mm_min", "rpm"].sort());
    });

    it("buildDataset() with 1 valid job produces ≥1 example + validJobs=1", () => {
      // Engine contract per MachineLoRABaseEngine:
      // DatasetBuildResult = { examples: {train,val,test}, stats: {...}, datasetFingerprint }
      const r = millingLoRADatasetBuilderEngine.buildDataset([mkJob()]);
      const total = r.examples.train.length + r.examples.val.length + r.examples.test.length;
      expect(total).toBeGreaterThanOrEqual(1);
      expect(r.stats.totalJobs).toBe(1);
      expect(r.stats.validJobs).toBe(1);
      expect(typeof r.datasetFingerprint).toBe("string");
      expect(r.datasetFingerprint.length).toBeGreaterThan(0);
    });

    it("buildDataset() rejects jobs missing required features → stats.validJobs reflects drop", () => {
      // Job missing 'tool_class' — milling validator returns non-null → dropped
      const badJob = mkJob({
        features: {
          material: "AISI 1045",
          // tool_class removed
          op_type: "pocket_rough",
          machine_class: "vmc_40taper",
        },
      });
      const r = millingLoRADatasetBuilderEngine.buildDataset([badJob, mkJob({ id: "JOB-002" })]);
      expect(r.stats.totalJobs).toBe(2);
      expect(r.stats.validJobs).toBe(1);
      const total = r.examples.train.length + r.examples.val.length + r.examples.test.length;
      expect(total).toBe(1);
    });

    it("buildDataset() rejects jobs with non-positive actuals → 0 valid", () => {
      // Job with rpm = 0 (non-positive) — should be skipped
      const zeroRpm = mkJob({ id: "JOB-003", actual: { rpm: 0, feed_mm_min: 900 } });
      const r = millingLoRADatasetBuilderEngine.buildDataset([zeroRpm]);
      expect(r.stats.totalJobs).toBe(1);
      expect(r.stats.validJobs).toBe(0);
      const total = r.examples.train.length + r.examples.val.length + r.examples.test.length;
      expect(total).toBe(0);
    });

    it("buildDataset() example.instruction references material + op + tool + machine", () => {
      // Many jobs so DEFAULT_SPLIT (0.8/0.1/0.1) puts ≥1 in train deterministically
      const r = millingLoRADatasetBuilderEngine.buildDataset(
        Array.from({ length: 10 }, (_, i) =>
          mkJob({ id: `JOB-${i}`, fingerprint: { material: "AISI 1045", tool_class: "endmill_carbide", n: i } }),
        ),
      );
      // Find ≥1 example anywhere in the splits
      const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
      expect(all.length).toBeGreaterThan(0);
      const ex = all[0];
      expect(ex.instruction).toContain("AISI 1045");
      expect(ex.instruction).toContain("pocket_rough");
      expect(ex.instruction).toContain("endmill_carbide");
      expect(ex.instruction).toContain("vmc_40taper");
      // input/output are JSON-encoded — parsed objects must contain known feature keys
      const parsedInput = JSON.parse(ex.input) as Record<string, unknown>;
      expect(parsedInput.material).toBe("AISI 1045");
      expect(parsedInput.tool_class).toBe("endmill_carbide");
      const parsedOutput = JSON.parse(ex.output) as Record<string, unknown>;
      expect(parsedOutput.rpm).toBe(4500);
      expect(parsedOutput.feed_mm_min).toBe(900);
    });
  });

  // ---------------------------------------------------------------------
  // Anti-regression
  // ---------------------------------------------------------------------
  describe("MILL_ACTIONS action-count anti-regression", () => {
    it("includes both new actions exactly once", () => {
      const arr = MILL_ACTIONS as readonly string[];
      for (const a of NEW_ACTIONS) {
        expect(arr.filter((x) => x === a).length).toBe(1);
      }
    });

    it("total action count is ≥ post-iter1 + 2", () => {
      // Iter 1 left MILL_ACTIONS at 94; iter 2 adds 2 → ≥ 96.
      expect((MILL_ACTIONS as readonly string[]).length).toBeGreaterThanOrEqual(96);
    });
  });
});
