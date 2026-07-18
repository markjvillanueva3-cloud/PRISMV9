/**
 * GCodeRuntimePredictorEngine -- companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * Pure, deterministic cycle-time predictor (per-block kinematics: feed time,
 * accel penalty, controller throttle, tool-change/spindle-ramp/dwell overhead).
 * No physics constants (machine descriptors are data inputs). Every assertion is
 * a hand-traced REFERENCE VALUE (R9), never a presence-only stub.
 *
 * Coverage:
 *   predict()         happy G1 feed + G0 rapid classification + arc length + G83 peck
 *   overhead          tool-change (M6+T) + spindle-ramp (M3+S) + dwell (G4 P)
 *   FAILURE (throw)   null machine, bad machine constants, non-array blocks, unknown machine_id
 *   ADVERSARIAL       NaN block field (NaN-safe carry) + empty program
 *   variability       >=3 machines from MACHINE_LIBRARY (haas/okuma/hurco) exercised
 */

import { describe, it, expect } from "vitest";
import {
  gcodeRuntimePredictorEngine,
  GCodeRuntimePredictorEngine,
  MACHINE_LIBRARY,
} from "../engines/GCodeRuntimePredictorEngine.js";

const HAAS = MACHINE_LIBRARY.haas_vf2;

describe("GCodeRuntimePredictorEngine", () => {
  describe("predict() -- motion timing", () => {
    it("computes a pure G1 feed block (100mm @ 6000mm/min = 1.0s + accel ramp)", () => {
      const r = gcodeRuntimePredictorEngine.predict([{ motion: "G1", x: 100, f: 6000 }], HAAS);
      expect(r.blocks[0].path_length_mm).toBe(100);
      expect(r.blocks[0].effective_feed_mm_min).toBe(6000);
      expect(r.blocks[0].motion_time_sec).toBeCloseTo(1.0, 6); // 100/6000*60
      expect(r.blocks[0].accel_penalty_sec).toBeCloseTo(100 / 1500, 4); // dV=100mm/s / a=1500
      expect(r.blocks[0].bottleneck).toBe("feed");
      expect(r.total_sec).toBeCloseTo(1.0 + 100 / 1500, 4);
      expect(r.time_breakdown.cutting_sec).toBeCloseTo(1.0, 6);
      expect(r.bottleneck_breakdown.feed).toBe(1);
    });

    it("classifies a G0 move as rapid (uses max_rapid, not cutting time)", () => {
      const r = gcodeRuntimePredictorEngine.predict([{ motion: "G0", x: 300 }], HAAS);
      expect(r.blocks[0].motion).toBe("G0");
      expect(r.blocks[0].effective_feed_mm_min).toBe(24000); // haas max_rapid
      expect(r.blocks[0].motion_time_sec).toBeCloseTo(0.75, 6); // 300/24000*60
      expect(r.time_breakdown.rapid_sec).toBeCloseTo(0.75, 6);
      expect(r.time_breakdown.cutting_sec).toBe(0);
    });

    it("computes G3 (CCW) quarter-circle arc length (r=10 -> 5*pi mm)", () => {
      const r = gcodeRuntimePredictorEngine.predict(
        [
          { motion: "G0", x: 10, y: 0 },
          { motion: "G3", x: 0, y: 10, i: -10, j: 0, f: 6000 },
        ],
        HAAS,
      );
      expect(r.blocks[1].path_length_mm).toBeCloseTo(5 * Math.PI, 3); // 10 * (pi/2)
    });

    it("computes G83 peck-drill path length with retract overhead (Q increments)", () => {
      // 20mm deep, Q=5 -> 4 pecks -> 20 + 4*5*0.5 = 30mm
      const r = gcodeRuntimePredictorEngine.predict([{ motion: "G83", z: -20, q: 5 }], HAAS);
      expect(r.blocks[0].path_length_mm).toBe(30);
    });
  });

  describe("predict() -- overhead (tool change / spindle ramp / dwell)", () => {
    it("adds tool-change time on an M6 + new-T transition and marks it overhead-bound", () => {
      const r = gcodeRuntimePredictorEngine.predict([{ motion: "G0", x: 0, m: [6], t: 1 }], HAAS);
      expect(r.blocks[0].tool_change_sec).toBe(8); // haas tool_change_sec
      expect(r.blocks[0].bottleneck).toBe("overhead");
      expect(r.time_breakdown.tool_change_sec).toBe(8);
    });

    it("adds spindle ramp on an M3 + new-S transition (10krpm @ 2.0s/krpm = 20s)", () => {
      const r = gcodeRuntimePredictorEngine.predict([{ m: [3], s: 10000 }], HAAS);
      expect(r.blocks[0].spindle_ramp_sec).toBe(20);
      expect(r.time_breakdown.spindle_ramp_sec).toBe(20);
    });

    it("adds dwell time (G4 P)", () => {
      const r = gcodeRuntimePredictorEngine.predict([{ dwell_sec: 2.5 }], HAAS);
      expect(r.blocks[0].dwell_sec).toBe(2.5);
      expect(r.time_breakdown.dwell_sec).toBe(2.5);
    });
  });

  describe("FAILURE MODES -- fail loud (R12)", () => {
    it("throws when the machine descriptor is missing", () => {
      expect(() => gcodeRuntimePredictorEngine.predict([], null as never)).toThrow(/machine descriptor required/);
    });

    it("throws on a non-positive machine feed/accel/block-rate constant", () => {
      expect(() => gcodeRuntimePredictorEngine.predict([], { ...HAAS, max_feed_mm_min: 0 })).toThrow(/max_feed_mm_min must be > 0/);
      expect(() => gcodeRuntimePredictorEngine.predict([], { ...HAAS, max_accel_mm_sec2: 0 })).toThrow(/max_accel_mm_sec2 must be > 0/);
      expect(() => gcodeRuntimePredictorEngine.predict([], { ...HAAS, blocks_per_sec: 0 })).toThrow(/blocks_per_sec must be > 0/);
    });

    it("throws when blocks is not an array", () => {
      expect(() => gcodeRuntimePredictorEngine.predict("nope" as never, HAAS)).toThrow(/blocks must be an array/);
    });

    it("throws on an unknown machine_id via predictForMachine", () => {
      expect(() => gcodeRuntimePredictorEngine.predictForMachine([], "not_a_machine")).toThrow(/Unknown machine_id/);
    });
  });

  describe("ADVERSARIAL", () => {
    it("is NaN-safe -- a NaN coordinate is ignored (carries the prior position)", () => {
      // NaN x is dropped -> move is (0,0,0)->(0,50,0) = 50mm, NOT NaN
      const r = gcodeRuntimePredictorEngine.predict([{ motion: "G1", x: NaN, y: 50, f: 6000 }], HAAS);
      expect(r.blocks[0].path_length_mm).toBe(50);
      expect(Number.isFinite(r.total_sec)).toBe(true);
    });

    it("returns a zeroed prediction for an empty program (no throw)", () => {
      const r = gcodeRuntimePredictorEngine.predict([], HAAS);
      expect(r.total_sec).toBe(0);
      expect(r.total_min).toBe(0);
      expect(r.blocks).toEqual([]);
      expect(r.findings).toEqual([]);
    });
  });

  describe("machine variability (>=3 descriptors in MACHINE_LIBRARY)", () => {
    it("exposes the 4 JM-fleet machine descriptors", () => {
      expect(Object.keys(MACHINE_LIBRARY).sort()).toEqual(
        ["haas_vf2", "hurco_vm30i", "hurco_vmx24", "okuma_m460v"],
      );
    });

    it("predicts a faster cycle on the higher-rapid/accel Okuma than the Haas for the same rapid move", () => {
      const prog = [{ motion: "G0" as const, x: 1000 }];
      const haas = gcodeRuntimePredictorEngine.predictForMachine(prog, "haas_vf2");
      const okuma = gcodeRuntimePredictorEngine.predictForMachine(prog, "okuma_m460v");
      const hurco = gcodeRuntimePredictorEngine.predictForMachine(prog, "hurco_vmx24");
      expect(okuma.machine.max_rapid_mm_min).toBe(50000);
      expect(okuma.total_sec).toBeLessThan(haas.total_sec); // 50000 vs 24000 rapid
      expect(hurco.total_sec).toBeLessThan(haas.total_sec); // 33000 vs 24000 rapid
    });
  });

  describe("class + singleton parity", () => {
    it("a fresh instance predicts identically to the exported singleton", () => {
      const fresh = new GCodeRuntimePredictorEngine();
      const prog = [{ motion: "G1" as const, x: 50, f: 4000 }];
      expect(fresh.predict(prog, HAAS).total_sec).toBeCloseTo(
        gcodeRuntimePredictorEngine.predict(prog, HAAS).total_sec,
        9,
      );
    });
  });
});
