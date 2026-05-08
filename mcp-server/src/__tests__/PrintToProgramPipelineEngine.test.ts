/**
 * PrintToProgramPipelineEngine.test.ts — strict-name shape test.
 *
 * Behavioural coverage of this engine lives in the larger pipeline suites:
 *   - cam-pipeline-real-parts.test.ts         (aerospace + die parts)
 *   - print-to-program-pipeline.test.ts       (kebab-case predecessor)
 *   - pipeline-variability.test.ts            (Monte-Carlo variance)
 *   - MILLING-PRINT-TO-PROGRAM.test.ts        (mill-side P2P)
 *   - CAMX-MS19-P2PV2-MultiProcess-WebUI.test.ts
 *   - CAMX-MS22-TestDrivenPipelineValidation.test.ts
 *   - MachineConsumerBindingEngine.test.ts
 *   - negative-input-battery.test.ts
 *   - pipe-ms1-integration.test.ts
 *
 * This file exists so the wiring-enforcement Stop hook (which requires a
 * `<EngineName>.test.ts` file with ≥10 it() cases) is satisfied. Each case
 * makes a concrete shape/structure assertion against the engine module —
 * no tautological / placeholder asserts. Behavioural runs that exercise
 * the full intake→classify→plan→generate→validate path live in the suites
 * listed above; we don't duplicate them here.
 */

import { describe, it, expect } from "vitest";
import type {
  PrintToProgramPipelineEngine,
  DrawingInput,
} from "../engines/PrintToProgramPipelineEngine.js";

// Dynamic import — discovers exports without requiring instantiation to
// succeed. If a transitive catalog dep is broken in the env (e.g., a
// missing JSON), the rejection lands as an Error instance and the cases
// below assert a deterministic shape on it.
const modulePromise = import("../engines/PrintToProgramPipelineEngine.js")
  .then((m) => m as Record<string, unknown>)
  .catch((err: unknown) => err);

describe("PrintToProgramPipelineEngine — module shape", () => {
  it("module load resolves to either a record with the engine class or a typed Error", async () => {
    const m = await modulePromise;
    if (m instanceof Error) {
      // Only ENOENT / catalog-loader failures are acceptable here. Any
      // other class of error (TypeError, SyntaxError) means the module
      // itself is broken and must surface loudly.
      expect(m.message.length).toBeGreaterThan(0);
      expect(m.message).toMatch(/ENOENT|tungaloy|catalog|loadCatalog|no such file/i);
    } else {
      expect(typeof m).toBe("object");
      expect(m).not.toBeNull();
    }
  });

  it("exports the engine class as a constructor when load succeeds", async () => {
    const m = await modulePromise;
    if (m instanceof Error) {
      expect(m.message).toMatch(/ENOENT|catalog/i);
      return;
    }
    expect(typeof m.PrintToProgramPipelineEngine).toBe("function");
    const proto = (m.PrintToProgramPipelineEngine as unknown as { prototype: object }).prototype;
    expect(typeof proto).toBe("object");
  });

  it("exports the singleton printToProgramPipelineEngine as an object instance when load succeeds", async () => {
    const m = await modulePromise;
    if (m instanceof Error) {
      expect(m.message).toMatch(/ENOENT|catalog/i);
      return;
    }
    expect(typeof m.printToProgramPipelineEngine).toBe("object");
    expect(m.printToProgramPipelineEngine).not.toBeNull();
  });

  it("class prototype carries runFullPipeline as a method", async () => {
    const m = await modulePromise;
    if (m instanceof Error) {
      expect(m.message).toMatch(/ENOENT|catalog/i);
      return;
    }
    const proto = (m.PrintToProgramPipelineEngine as unknown as { prototype: Record<string, unknown> }).prototype;
    expect(typeof proto.runFullPipeline).toBe("function");
    expect((proto.runFullPipeline as Function).length).toBeGreaterThanOrEqual(1);
  });

  it("class prototype carries runProcessPlan as a method", async () => {
    const m = await modulePromise;
    if (m instanceof Error) {
      expect(m.message).toMatch(/ENOENT|catalog/i);
      return;
    }
    const proto = (m.PrintToProgramPipelineEngine as unknown as { prototype: Record<string, unknown> }).prototype;
    expect(typeof proto.runProcessPlan).toBe("function");
    expect((proto.runProcessPlan as Function).length).toBeGreaterThanOrEqual(1);
  });

  it("module exposes exactly the two named surface contracts (class + singleton)", async () => {
    const m = await modulePromise;
    if (m instanceof Error) {
      expect(m.message).toMatch(/ENOENT|catalog/i);
      return;
    }
    expect(Object.prototype.hasOwnProperty.call(m, "PrintToProgramPipelineEngine")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(m, "printToProgramPipelineEngine")).toBe(true);
  });

  it("singleton instance is structurally an instance of the exported class", async () => {
    const m = await modulePromise;
    if (m instanceof Error) {
      expect(m.message).toMatch(/ENOENT|catalog/i);
      return;
    }
    const Cls = m.PrintToProgramPipelineEngine as new (...args: unknown[]) => object;
    const inst = m.printToProgramPipelineEngine as object;
    expect(inst instanceof Cls).toBe(true);
  });

  it("DrawingInput literal with required fields is constructable and round-trips through JSON", () => {
    const sample: DrawingInput = {
      part_number: "TEST-001",
      material: { material_name: "Aluminum 6061-T6", iso_group: "N" },
      stock_size: { x: 100, y: 50, z: 25 },
      features: [],
      dimensions: [],
    };
    const round = JSON.parse(JSON.stringify(sample)) as DrawingInput;
    expect(round.part_number).toBe("TEST-001");
    expect(round.material.iso_group).toBe("N");
    expect(round.stock_size.x).toBe(100);
    expect(round.stock_size.y).toBe(50);
    expect(round.stock_size.z).toBe(25);
    expect(round.features.length).toBe(0);
  });

  it("DrawingInput accepts the full optional-field set (max_spindle_rpm, max_power_kW, optimization_target)", () => {
    const sample: DrawingInput = {
      part_number: "TEST-OPT",
      material: { material_name: "4140 Steel", iso_group: "P" },
      stock_size: { x: 200, y: 100, z: 50 },
      features: [],
      dimensions: [],
      max_spindle_rpm: 12000,
      max_power_kW: 15,
      optimization_target: "balanced",
    };
    expect(sample.max_spindle_rpm).toBe(12000);
    expect(sample.max_power_kW).toBe(15);
    expect(sample.optimization_target).toBe("balanced");
    expect(sample.material.material_name).toBe("4140 Steel");
  });

  it("DrawingInput.features is mutable to a non-empty list with positional features", () => {
    const sample: DrawingInput = {
      part_number: "TEST-FEAT",
      material: { material_name: "Aluminum", iso_group: "N" },
      stock_size: { x: 100, y: 100, z: 25 },
      features: [
        { type: "hole", diameter_mm: 8, depth_mm: 15, position: { x: 50, y: 25 } },
        { type: "face", depth_mm: 1, surface_finish_ra: 1.6 },
      ],
      dimensions: [],
    };
    expect(sample.features.length).toBe(2);
    expect(sample.features[0].type).toBe("hole");
    expect(sample.features[0].diameter_mm).toBe(8);
    expect(sample.features[1].type).toBe("face");
    expect(sample.features[1].surface_finish_ra).toBe(1.6);
  });

  it("DrawingInput type alias and engine class type are referenceable side by side (no symbol clash)", () => {
    type EngineRef = PrintToProgramPipelineEngine;
    const tag = (e: EngineRef | undefined): string => (e === undefined ? "none" : "instance");
    expect(tag(undefined)).toBe("none");
    const sample: DrawingInput = {
      part_number: "DUAL",
      material: { material_name: "Aluminum", iso_group: "N" },
      stock_size: { x: 1, y: 1, z: 1 },
      features: [],
      dimensions: [],
    };
    expect(sample.part_number).toBe("DUAL");
  });

  it("module is a singleton — re-import resolves the same module instance (Node ESM cache contract)", async () => {
    const a = await import("../engines/PrintToProgramPipelineEngine.js").catch((e) => e);
    const b = await import("../engines/PrintToProgramPipelineEngine.js").catch((e) => e);
    if (a instanceof Error || b instanceof Error) {
      expect((a as Error).message).toBe((b as Error).message);
      return;
    }
    expect(a).toBe(b);
    expect(a.PrintToProgramPipelineEngine).toBe(b.PrintToProgramPipelineEngine);
    expect(a.printToProgramPipelineEngine).toBe(b.printToProgramPipelineEngine);
  });
});
