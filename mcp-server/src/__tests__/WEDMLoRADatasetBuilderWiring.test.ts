/**
 * WEDMLoRADatasetBuilderEngine wiring test
 * ========================================
 * U-LORA-WEDM-DATASET (slot:india). Implements + wires the previously-0-byte
 * WEDMLoRADatasetBuilderEngine (mike's WEDM-TRAINING-WIZARD-MS0/U-WTW-AUDIT
 * flagged it empty: "concrete proof WEDM cannot run wedm_lora") -- the WEDM
 * sibling of MillingLoRADatasetBuilderEngine.
 *
 * Verifies the 2 new prism_edm actions:
 *   - wedm_lora_build_dataset
 *   - wedm_lora_required_schema
 *
 * Two real-behavior assertion layers (no toBeDefined-only):
 *   1) SOURCE-GREP -- ACTIONS membership + case-block presence + loraDataset
 *      lazy getter pin (edmDispatcher does not export ACTIONS, so grep the src)
 *   2) RUNTIME -- invoke the singleton against valid + invalid WEDM RawJob sets;
 *      verify Alpaca-format examples with the engine-required feature + actual keys
 *
 * (edmDispatcher uses generic z.record params + an optional schema map, like the
 * sibling wedm_lora_create/set_scale/forward actions -- no per-action Zod layer.)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { wedmLoRADatasetBuilderEngine } from "../engines/WEDMLoRADatasetBuilderEngine.js";
import type { RawJob } from "../engines/MachineLoRABaseEngine.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = join(HERE, "..", "tools", "dispatchers", "edmDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf8");

const NEW_ACTIONS = ["wedm_lora_build_dataset", "wedm_lora_required_schema"] as const;

function mkJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    id: "WJOB-001",
    fingerprint: { material: "D2 tool steel", wire_diameter: "0.25" },
    features: {
      material: "D2 tool steel",
      wire_diameter: "0.25",
      op_type: "skim_2",
      machine_class: "mitsubishi_fa",
    },
    actual: { peak_current: 12, pulse_on: 0.8, pulse_off: 12 },
    ...overrides,
  };
}

describe("WEDMLoRADatasetBuilderEngine wiring (U-LORA-WEDM-DATASET)", () => {
  // ---------------------------------------------------------------------
  // LAYER 1 -- dispatcher source pins
  // ---------------------------------------------------------------------
  describe("edmDispatcher source contains the 2 actions + loraDataset getter", () => {
    for (const action of NEW_ACTIONS) {
      it(`dispatcher source registers '${action}' (ACTIONS entry + case label = exactly 2)`, () => {
        const occurrences = DISPATCHER_SRC.split(`"${action}"`).length - 1;
        // each action appears EXACTLY twice: once in the ACTIONS array, once as a case label.
        // toBe(2) catches a missing ACTIONS registration OR a missing case handler (R9).
        expect(occurrences).toBe(2);
      });
      it(`dispatcher source has 'case "${action}":' block`, () => {
        expect(DISPATCHER_SRC.includes(`case "${action}":`)).toBe(true);
      });
    }

    it("dispatcher source lazy-imports WEDMLoRADatasetBuilderEngine via a loraDataset getter", () => {
      expect(DISPATCHER_SRC.includes(`case "loraDataset":`)).toBe(true);
      expect(DISPATCHER_SRC.includes("WEDMLoRADatasetBuilderEngine.js")).toBe(true);
      expect(DISPATCHER_SRC.includes("wedmLoRADatasetBuilderEngine")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // LAYER 2 -- engine round-trip
  // ---------------------------------------------------------------------
  describe("engine round-trip returns concrete dataset values", () => {
    it("requiredSchema() returns the documented WEDM feature + actual keys", () => {
      const r = wedmLoRADatasetBuilderEngine.requiredSchema();
      expect([...r.features].sort()).toEqual(
        ["machine_class", "material", "op_type", "wire_diameter"].sort(),
      );
      expect([...r.actuals].sort()).toEqual(["peak_current", "pulse_off", "pulse_on"].sort());
    });

    it("buildDataset() with 1 valid job produces >=1 example + validJobs=1", () => {
      const r = wedmLoRADatasetBuilderEngine.buildDataset([mkJob()]);
      const total = r.examples.train.length + r.examples.val.length + r.examples.test.length;
      expect(total).toBeGreaterThanOrEqual(1);
      expect(r.stats.totalJobs).toBe(1);
      expect(r.stats.validJobs).toBe(1);
      expect(typeof r.datasetFingerprint).toBe("string");
      expect(r.datasetFingerprint.length).toBeGreaterThan(0);
    });

    it("buildDataset() drops jobs missing a required feature (wire_diameter)", () => {
      const badJob = mkJob({
        features: { material: "D2 tool steel", op_type: "skim_2", machine_class: "mitsubishi_fa" },
      });
      const r = wedmLoRADatasetBuilderEngine.buildDataset([badJob, mkJob({ id: "WJOB-002" })]);
      expect(r.stats.totalJobs).toBe(2);
      expect(r.stats.validJobs).toBe(1);
    });

    it("buildDataset() drops jobs with non-positive discharge actuals (peak_current=0)", () => {
      const zero = mkJob({ id: "WJOB-003", actual: { peak_current: 0, pulse_on: 0.8, pulse_off: 12 } });
      const r = wedmLoRADatasetBuilderEngine.buildDataset([zero]);
      expect(r.stats.totalJobs).toBe(1);
      expect(r.stats.validJobs).toBe(0);
    });

    it("buildDataset() instruction references op + material + wire + machine; output carries discharge actuals", () => {
      const r = wedmLoRADatasetBuilderEngine.buildDataset(
        Array.from({ length: 10 }, (_, i) =>
          mkJob({ id: `WJOB-${i}`, fingerprint: { material: "D2 tool steel", wire_diameter: "0.25", n: i } }),
        ),
      );
      const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
      expect(all.length).toBeGreaterThan(0);
      const ex = all[0];
      expect(ex.instruction).toContain("D2 tool steel");
      expect(ex.instruction).toContain("skim_2");
      expect(ex.instruction).toContain("0.25mm wire");
      expect(ex.instruction).toContain("mitsubishi_fa");
      const parsedInput = JSON.parse(ex.input) as Record<string, unknown>;
      expect(parsedInput.material).toBe("D2 tool steel");
      const parsedOutput = JSON.parse(ex.output) as Record<string, unknown>;
      expect(parsedOutput.peak_current).toBe(12);
      expect(parsedOutput.pulse_on).toBe(0.8);
    });
  });
});
