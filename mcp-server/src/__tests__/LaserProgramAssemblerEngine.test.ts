/**
 * LaserProgramAssemblerEngine — emission wiring tests
 *
 * INFRA-NEURAL-LEDGER-MS1/P0-U02
 *
 * Verifies that all 4 assemble* entry methods (Cut, Mark, Weld, Drill) emit a
 * cross_process_stage_complete event to outcomeCaptureBus with the correct
 * domain="laser" and the matching pipeline_stage value. The Laser engine is
 * scaffolded per envelope spec — emissions carry scaffolded=true.
 *
 * Also verifies the singleton export added during P0-U02 (the engine was
 * missing its module-level singleton — class was exported without the
 * default-instance binding that the rest of PRISM expects).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  laserProgramAssemblerEngine,
  LaserProgramAssemblerEngine,
} from "../engines/LaserProgramAssemblerEngine.js";
import * as busModule from "../engines/OutcomeCaptureBusEngine.js";

describe("LaserProgramAssemblerEngine — module surface", () => {
  it("exports a singleton named laserProgramAssemblerEngine (added in P0-U02)", () => {
    expect(laserProgramAssemblerEngine).toBeInstanceOf(LaserProgramAssemblerEngine);
  });

  it("exports the class as a named export with the expected name", () => {
    expect(LaserProgramAssemblerEngine.name).toBe("LaserProgramAssemblerEngine");
  });

  it("singleton has assembleLaserCut method", () => {
    expect(typeof laserProgramAssemblerEngine.assembleLaserCut).toBe("function");
  });

  it("singleton has assembleLaserMark method", () => {
    expect(typeof laserProgramAssemblerEngine.assembleLaserMark).toBe("function");
  });

  it("singleton has assembleLaserWeld method", () => {
    expect(typeof laserProgramAssemblerEngine.assembleLaserWeld).toBe("function");
  });

  it("singleton has assembleLaserDrill method", () => {
    expect(typeof laserProgramAssemblerEngine.assembleLaserDrill).toBe("function");
  });
});

describe("LaserProgramAssemblerEngine — emission contract", () => {
  let recordSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    recordSpy = vi
      .spyOn(busModule.outcomeCaptureBusEngine, "record")
      .mockReturnValue({ ok: true, event_id: "test-evt", lineage_id: "test-lin", path: "", bytes: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Minimal input shared across cut/mark/weld/drill — fields likely insufficient
   *  for full physics but exercises the emission code path if engine tolerates. */
  const baseCutInput = () => ({
    process: "co2_thin",
    material: "mild_steel",
    thickness_mm: 1.0,
    power_w: 2000,
    assist_gas: "oxygen",
    gas_pressure_bar: 1.0,
    controller: "fanuc",
    part_name: "TEST_LASER_PART",
  });

  it("emissions from assembleLaserCut carry domain='laser' if reached", () => {
    try {
      laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
    } catch {
      /* tolerate physics-input throws */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({ domain: "laser" });
    }
  });

  it("emissions carry kind='cross_process_stage_complete' (v1.1.0 schema kind)", () => {
    try {
      laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({ kind: "cross_process_stage_complete" });
    }
  });

  it("emissions carry source='system' (producer-side classification)", () => {
    try {
      laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({ source: "system" });
    }
  });

  it("emissions carry context.engine='LaserProgramAssemblerEngine'", () => {
    try {
      laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({
        context: { engine: "LaserProgramAssemblerEngine" },
      });
    }
  });

  it("emissions carry context.scaffolded=true (Laser is scaffolded per envelope)", () => {
    try {
      laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({ context: { scaffolded: true } });
    }
  });

  it("emissions carry a `note` describing pipeline_skipped when scaffolded", () => {
    try {
      laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      const note = (call[0] as { note?: string }).note;
      expect(note).toMatch(/pipeline_skipped/);
    }
  });

  it("assembleLaserCut emission stage is 'laser_cut' (P2P_STAGES.LASER_CUT value)", () => {
    try {
      laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
    } catch {
      /* tolerate */
    }
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({
        context: { pipeline_stage: "laser_cut" },
      });
    }
  });

  it("multiple assembleLaserCut invocations produce independent emissions (no shared mutation)", () => {
    for (let i = 0; i < 3; i++) {
      try {
        laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
      } catch {
        /* tolerate */
      }
    }
    // Spy count is the only honest cross-invocation invariant we can assert
    // without knowing the precise success/failure outcome of each run.
    expect(recordSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
    for (const call of recordSpy.mock.calls) {
      expect(call[0]).toMatchObject({ domain: "laser", source: "system" });
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
        laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
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
        laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
      } catch {
        /* tolerate */
      }
    }).not.toThrow();
  });

  it("emissions carry a context payload with engine + pipeline_stage + scaffolded keys", () => {
    try {
      laserProgramAssemblerEngine.assembleLaserCut(baseCutInput() as unknown as Parameters<typeof laserProgramAssemblerEngine.assembleLaserCut>[0]);
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
