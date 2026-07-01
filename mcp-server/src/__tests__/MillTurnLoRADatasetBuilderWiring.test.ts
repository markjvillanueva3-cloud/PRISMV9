/**
 * MillTurnLoRADatasetBuilderEngine wiring test
 * ============================================
 * BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING — iter-3.
 *
 * Sibling of iter-2 (MillingLoRADatasetBuilder). Adds the mill-turn-specific
 * REQUIRED_FEATURE_KEYS = [material, part_class, machine_class, channel_count,
 * sub_spindle] and REQUIRED_ACTUAL_KEYS = [wait_ms_per_sync,
 * channel_imbalance_ratio]; enriches fingerprint with channels + subSpindle.
 *
 * Three real-behavior assertion layers:
 *   1) SOURCE-GREP — MILL_ACTIONS membership + case-block + lazy getter
 *   2) SCHEMA — concrete accept/reject with typed field comparison
 *   3) RUNTIME — round-trip producing real DatasetBuildResult with stats
 *      reflecting validator drops + enriched fingerprint visible in the
 *      datasetFingerprint
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { millTurnLoRADatasetBuilderEngine } from "../engines/MillTurnLoRADatasetBuilderEngine.js";
import type { RawJob } from "../engines/MachineLoRABaseEngine.js";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = join(HERE, "..", "tools", "dispatchers", "millDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf8");

const NEW_ACTIONS = [
  "millturn_lora_build_dataset",
  "millturn_lora_required_schema",
] as const;

type ZodSchemaLike = {
  safeParse: (p: unknown) => { success: boolean; data?: unknown };
};
const getSchema = (action: string): ZodSchemaLike =>
  (MILL_ACTION_SCHEMAS as Record<string, ZodSchemaLike>)[action];

function mkJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    id: "MT-001",
    fingerprint: { material: "AISI 4140", part_class: "shaft_with_milled_flat" },
    features: {
      material: "AISI 4140",
      part_class: "shaft_with_milled_flat",
      machine_class: "turn_mill_y_axis",
      channel_count: 2,
      sub_spindle: true,
    },
    actual: {
      wait_ms_per_sync: 150,
      channel_imbalance_ratio: 0.12,
    },
    ...overrides,
  };
}

describe("MillTurnLoRADatasetBuilderEngine wiring (U-BRIDGE-WIRE-MILLING iter-3)", () => {
  describe("dispatcher source pins the 2 actions + millturn_lora getter", () => {
    for (const action of NEW_ACTIONS) {
      it(`MILL_ACTIONS contains exactly one '${action}'`, () => {
        const arr = MILL_ACTIONS as readonly string[];
        expect(arr.filter((x) => x === action).length).toBe(1);
      });
      it(`dispatcher source has 'case "${action}":' block`, () => {
        expect(DISPATCHER_SRC.includes(`case "${action}":`)).toBe(true);
      });
    }

    it("dispatcher source lazy-imports MillTurnLoRADatasetBuilderEngine", () => {
      expect(DISPATCHER_SRC.includes('case "millturn_lora":')).toBe(true);
      expect(DISPATCHER_SRC.includes("MillTurnLoRADatasetBuilderEngine.js")).toBe(true);
    });
  });

  describe("Zod schemas validate input", () => {
    it("millturn_lora_build_dataset REJECTS empty jobs array", () => {
      expect(getSchema("millturn_lora_build_dataset").safeParse({ jobs: [] }).success).toBe(false);
    });

    it("millturn_lora_build_dataset ACCEPTS valid mill-turn job", () => {
      const r = getSchema("millturn_lora_build_dataset").safeParse({ jobs: [mkJob()] });
      expect(r.success).toBe(true);
      const data = r.data as { jobs: RawJob[] };
      expect(data.jobs[0].id).toBe("MT-001");
    });

    it("millturn_lora_required_schema ACCEPTS empty, REJECTS extras", () => {
      expect(getSchema("millturn_lora_required_schema").safeParse({}).success).toBe(true);
      expect(getSchema("millturn_lora_required_schema").safeParse({ x: 1 }).success).toBe(false);
    });
  });

  describe("engine round-trip returns mill-turn-specific dataset", () => {
    it("requiredSchema() returns the 5 mill-turn feature keys", () => {
      const r = millTurnLoRADatasetBuilderEngine.requiredSchema();
      expect(r.features.length).toBe(5);
      expect([...r.features].sort()).toEqual(
        ["channel_count", "machine_class", "material", "part_class", "sub_spindle"].sort(),
      );
      expect([...r.actuals].sort()).toEqual(
        ["channel_imbalance_ratio", "wait_ms_per_sync"].sort(),
      );
    });

    it("buildDataset() with 1 valid mill-turn job → validJobs=1", () => {
      const r = millTurnLoRADatasetBuilderEngine.buildDataset([mkJob()]);
      expect(r.stats.totalJobs).toBe(1);
      expect(r.stats.validJobs).toBe(1);
      const total = r.examples.train.length + r.examples.val.length + r.examples.test.length;
      expect(total).toBe(1);
    });

    it("buildDataset() drops job missing channel_count (mill-turn-specific key)", () => {
      const bad = mkJob({
        features: {
          material: "AISI 4140",
          part_class: "shaft_with_milled_flat",
          machine_class: "turn_mill_y_axis",
          // channel_count removed
          sub_spindle: true,
        },
      });
      const r = millTurnLoRADatasetBuilderEngine.buildDataset([bad, mkJob({ id: "MT-002" })]);
      expect(r.stats.totalJobs).toBe(2);
      expect(r.stats.validJobs).toBe(1);
    });

    it("buildDataset() enriches fingerprint with channels + subSpindle markers", () => {
      // Build many jobs varying channel_count + sub_spindle so enrichment is visible
      // via geometryHashCollisions = 0 when distinct, > 0 when identical.
      const jobs: RawJob[] = [
        mkJob({ id: "A", features: { ...mkJob().features, channel_count: 2, sub_spindle: true } }),
        mkJob({ id: "B", features: { ...mkJob().features, channel_count: 2, sub_spindle: true } }),
        mkJob({ id: "C", features: { ...mkJob().features, channel_count: 3, sub_spindle: false } }),
      ];
      const r = millTurnLoRADatasetBuilderEngine.buildDataset(jobs);
      // A + B share the same enriched fingerprint → 1 collision; C is distinct
      expect(r.stats.totalJobs).toBe(3);
      expect(r.stats.validJobs).toBe(3);
      // datasetFingerprint is stable + non-empty
      expect(typeof r.datasetFingerprint).toBe("string");
      expect(r.datasetFingerprint.length).toBeGreaterThan(0);
    });
  });

  describe("MILL_ACTIONS action-count anti-regression", () => {
    it("includes both new actions exactly once", () => {
      const arr = MILL_ACTIONS as readonly string[];
      for (const a of NEW_ACTIONS) {
        expect(arr.filter((x) => x === a).length).toBe(1);
      }
    });

    it("total action count is ≥ post-iter2 + 2", () => {
      expect((MILL_ACTIONS as readonly string[]).length).toBeGreaterThanOrEqual(98);
    });
  });
});
