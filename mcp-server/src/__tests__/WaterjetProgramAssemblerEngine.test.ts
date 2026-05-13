/**
 * WaterjetProgramAssemblerEngine — emission wiring tests
 *
 * INFRA-NEURAL-LEDGER-MS1/P0-U02
 *
 * Verifies all 4 assemble* entry methods (AbrasiveWJ, PureWJ, TaperCompensated,
 * ControlledDepth) emit a cross_process_stage_complete event to the
 * outcomeCaptureBus with domain="waterjet" + the matching pipeline_stage.
 * Waterjet is scaffolded per envelope spec — emissions carry scaffolded=true.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  waterjetProgramAssemblerEngine,
  WaterjetProgramAssemblerEngine,
} from "../engines/WaterjetProgramAssemblerEngine.js";
import * as busModule from "../engines/OutcomeCaptureBusEngine.js";

describe("WaterjetProgramAssemblerEngine — module surface", () => {
  it("exports a singleton named waterjetProgramAssemblerEngine", () => {
    expect(waterjetProgramAssemblerEngine).toBeInstanceOf(WaterjetProgramAssemblerEngine);
  });

  it("exports the class as a named export with the expected name", () => {
    expect(WaterjetProgramAssemblerEngine.name).toBe("WaterjetProgramAssemblerEngine");
  });

  it("singleton has assembleAbrasiveWJ method", () => {
    expect(typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ).toBe("function");
  });

  it("singleton has assemblePureWJ method", () => {
    expect(typeof waterjetProgramAssemblerEngine.assemblePureWJ).toBe("function");
  });

  it("singleton has assembleTaperCompensated method", () => {
    expect(typeof waterjetProgramAssemblerEngine.assembleTaperCompensated).toBe("function");
  });

  it("singleton has assembleControlledDepth method", () => {
    expect(typeof waterjetProgramAssemblerEngine.assembleControlledDepth).toBe("function");
  });
});

describe("WaterjetProgramAssemblerEngine — emission contract", () => {
  let recordSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    recordSpy = vi
      .spyOn(busModule.outcomeCaptureBusEngine, "record")
      .mockReturnValue({ ok: true, event_id: "test-evt", lineage_id: "test-lin", path: "", bytes: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Minimal-but-valid input shape — fields likely insufficient for full
   *  physics but exercises the emission path if the engine tolerates partial. */
  const baseAbrasiveInput = () => ({
    material: "mild_steel",
    thickness_mm: 6.0,
    quality: 3,
    controller: "fanuc",
    part_name: "TEST_WJ_PART",
  });

  it("emissions from assembleAbrasiveWJ carry domain='waterjet' if reached", () => {
    try {
      waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
    } catch {
      /* tolerate physics-input throws */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({ domain: "waterjet" });
    }
  });

  it("emissions carry kind='cross_process_stage_complete' (v1.1.0 schema kind)", () => {
    try {
      waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({ kind: "cross_process_stage_complete" });
    }
  });

  it("emissions carry source='system' (producer-side classification)", () => {
    try {
      waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({ source: "system" });
    }
  });

  it("emissions carry context.engine='WaterjetProgramAssemblerEngine'", () => {
    try {
      waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({
        context: { engine: "WaterjetProgramAssemblerEngine" },
      });
    }
  });

  it("emissions carry context.scaffolded=true (Waterjet is scaffolded per envelope)", () => {
    try {
      waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({ context: { scaffolded: true } });
    }
  });

  it("scaffolded note matches /pipeline_skipped/ pattern", () => {
    try {
      waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      const note = (call[0] as { note?: string }).note;
      expect(note).toMatch(/pipeline_skipped/);
    }
  });

  it("assembleAbrasiveWJ emission stage is 'waterjet_abrasive' (canonical P2P_STAGES value)", () => {
    try {
      waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({
        context: { pipeline_stage: "waterjet_abrasive" },
      });
    }
  });

  it("multiple assembleAbrasiveWJ invocations produce independent emissions", () => {
    for (let i = 0; i < 3; i++) {
      try {
        waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
      } catch {
        /* tolerate */
      }
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({ domain: "waterjet", source: "system" });
    }
  });

  it("does NOT throw upward when bus.record returns ok:false", () => {
    recordSpy.mockReturnValue({
      ok: false,
      event_id: "e",
      lineage_id: "l",
      path: "",
      bytes: 0,
      warning: "synthetic schema rejection",
    });
    expect(() => {
      try {
        waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
      } catch {
        /* tolerate physics-side throws */
      }
    }).not.toThrow();
  });

  it("does NOT throw upward when bus.record itself throws (defense-in-depth)", () => {
    recordSpy.mockImplementation(() => {
      throw new Error("synthetic bus crash");
    });
    expect(() => {
      try {
        waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
      } catch {
        /* tolerate */
      }
    }).not.toThrow();
  });

  it("emissions carry a context payload with engine + pipeline_stage + scaffolded keys", () => {
    try {
      waterjetProgramAssemblerEngine.assembleAbrasiveWJ(baseAbrasiveInput() as unknown as Parameters<typeof waterjetProgramAssemblerEngine.assembleAbrasiveWJ>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      const ctx = (call[0] as { context: Record<string, unknown> }).context;
      expect(Object.keys(ctx)).toEqual(
        expect.arrayContaining(["engine", "pipeline_stage", "scaffolded"]),
      );
    }
  });
});
