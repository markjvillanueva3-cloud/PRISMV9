/**
 * MachineKinematicStateEngine Tests (U-MIO39)
 * ============================================
 * Comprehensive tests for dynamic machine state tracking:
 * - Thermal expansion per axis (ISO 230-3)
 * - Servo following-error trend detection
 * - Dynamic jerk derating
 * - Controller look-ahead validation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MachineKinematicStateEngine,
  machineKinematicStateEngine,
  THERMAL_ALPHA,
  LOOKAHEAD_BLOCKS,
  type MachineStateSnapshot,
  type ThermalAxisState,
  type ServoAxisState,
  type DerivedState,
} from "../engines/MachineKinematicStateEngine.js";

describe("MachineKinematicStateEngine", () => {
  beforeEach(() => {
    machineKinematicStateEngine.reset();
  });

  // ── Helper: minimal valid snapshot ────────────────────────────────────────
  function mkSnap(overrides: Partial<MachineStateSnapshot> = {}): MachineStateSnapshot {
    return {
      machine_id: "VMC-001",
      controller: "fanuc",
      captured_at: new Date().toISOString(),
      thermal: [{ axis: "X", temperature_c: 22, stroke_mm: 500 }],
      servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
      ...overrides,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // update() — input validation
  // ══════════════════════════════════════════════════════════════════════════
  describe("update() input validation", () => {
    it("throws if machine_id missing", () => {
      const snap = mkSnap({ machine_id: "" });
      expect(() => machineKinematicStateEngine.update(snap)).toThrow("machine_id required");
    });

    it("throws if controller missing", () => {
      const snap = mkSnap({ controller: undefined as any });
      expect(() => machineKinematicStateEngine.update(snap)).toThrow("controller required");
    });

    it("throws if thermal array empty", () => {
      const snap = mkSnap({ thermal: [] });
      expect(() => machineKinematicStateEngine.update(snap)).toThrow("at least one thermal axis");
    });

    it("accepts valid snapshot and returns DerivedState", () => {
      const snap = mkSnap();
      const result = machineKinematicStateEngine.update(snap);
      expect(result.machine_id).toBe("VMC-001");
      expect(result.controller).toBe("fanuc");
      expect(result.snapshot_id).toMatch(/^MKS-\d{6}$/);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Thermal expansion (ISO 230-3)
  // ══════════════════════════════════════════════════════════════════════════
  describe("thermal expansion calculations", () => {
    it("computes delta_mm = stroke * alpha * (T - T_ref) for steel", () => {
      const snap = mkSnap({
        thermal: [{
          axis: "X",
          temperature_c: 25,        // +5 K above ref
          stroke_mm: 1000,          // 1 m stroke
          material: "steel",
          reference_temp_c: 20,
        }],
      });
      const result = machineKinematicStateEngine.update(snap);
      // delta = 1000 * 1.2e-5 * 5 = 0.06 mm
      expect(result.thermal[0].delta_mm).toBeCloseTo(0.06, 6);
    });

    it("computes larger delta_mm for aluminum (higher alpha)", () => {
      const snap = mkSnap({
        thermal: [{
          axis: "Y",
          temperature_c: 25,
          stroke_mm: 1000,
          material: "aluminum",
          reference_temp_c: 20,
        }],
      });
      const result = machineKinematicStateEngine.update(snap);
      // delta = 1000 * 2.3e-5 * 5 = 0.115 mm
      expect(result.thermal[0].delta_mm).toBeCloseTo(0.115, 6);
    });

    it("uses default T_ref=20 and material=steel when not specified", () => {
      const snap = mkSnap({
        thermal: [{ axis: "Z", temperature_c: 22, stroke_mm: 500 }],
      });
      const result = machineKinematicStateEngine.update(snap);
      // delta = 500 * 1.2e-5 * 2 = 0.012 mm
      expect(result.thermal[0].delta_mm).toBeCloseTo(0.012, 6);
    });

    it("flags beyond_tolerance when |delta_mm| > tolerance/3", () => {
      const snap = mkSnap({
        thermal: [{
          axis: "X",
          temperature_c: 30,   // +10 K
          stroke_mm: 1000,
          material: "steel",
        }],
      });
      // delta = 1000 * 1.2e-5 * 10 = 0.12 mm
      // tolerance_mm = 0.3 → tol/3 = 0.1 → 0.12 > 0.1 → beyond_tolerance
      const result = machineKinematicStateEngine.update(snap, 0.3);
      expect(result.thermal[0].beyond_tolerance).toBe(true);
      expect(result.warnings.some(w => w.includes("exceeds tolerance/3"))).toBe(true);
    });

    it("does NOT flag beyond_tolerance when under threshold", () => {
      const snap = mkSnap({
        thermal: [{ axis: "X", temperature_c: 21, stroke_mm: 500 }],
      });
      // delta = 500 * 1.2e-5 * 1 = 0.006 mm; tol/3 = 0.05 → ok
      const result = machineKinematicStateEngine.update(snap, 0.15);
      expect(result.thermal[0].beyond_tolerance).toBe(false);
    });

    it("handles negative temperature delta (contraction)", () => {
      const snap = mkSnap({
        thermal: [{
          axis: "X",
          temperature_c: 15,   // -5 K from ref
          stroke_mm: 1000,
          reference_temp_c: 20,
        }],
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.thermal[0].delta_mm).toBeCloseTo(-0.06, 6);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Servo following-error trend
  // ══════════════════════════════════════════════════════════════════════════
  describe("servo following-error trend", () => {
    it("returns nominal status when lag_ratio <= 1.5", () => {
      const snap = mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.servo[0].lag_ratio).toBeCloseTo(1.0, 6);
      expect(result.servo[0].status).toBe("nominal");
      expect(result.servo[0].degraded).toBe(false);
    });

    it("returns warning status when 1.5 < lag_ratio <= 2.0", () => {
      const snap = mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.009, baseline_following_error_mm: 0.005 }],
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.servo[0].lag_ratio).toBeCloseTo(1.8, 6);
      expect(result.servo[0].status).toBe("warning");
      expect(result.servo[0].degraded).toBe(true);
    });

    it("returns critical status when lag_ratio > 2.0", () => {
      const snap = mkSnap({
        servo: [{ axis: "Y", following_error_mean_mm: 0.012, baseline_following_error_mm: 0.005 }],
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.servo[0].lag_ratio).toBeCloseTo(2.4, 6);
      expect(result.servo[0].status).toBe("critical");
      expect(result.servo[0].degraded).toBe(true);
      expect(result.warnings.some(w => w.includes("CRITICAL"))).toBe(true);
    });

    it("handles near-zero baseline (avoids division by zero)", () => {
      const snap = mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.001, baseline_following_error_mm: 0 }],
      });
      const result = machineKinematicStateEngine.update(snap);
      // baseline clamped to 1e-9, ratio = 0.001 / 1e-9 = 1e6 → critical
      expect(result.servo[0].status).toBe("critical");
    });

    it("computes lag_ratio correctly at threshold boundaries", () => {
      // Exactly 1.5 → should be nominal (not warning)
      const snap1 = mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.0075, baseline_following_error_mm: 0.005 }],
      });
      expect(machineKinematicStateEngine.update(snap1).servo[0].status).toBe("nominal");

      machineKinematicStateEngine.reset();

      // Exactly 2.0 → should be warning (not critical)
      const snap2 = mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.010, baseline_following_error_mm: 0.005 }],
      });
      expect(machineKinematicStateEngine.update(snap2).servo[0].status).toBe("warning");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Payload overload
  // ══════════════════════════════════════════════════════════════════════════
  describe("payload overload detection", () => {
    it("flags payload_overload when mass > rated_max", () => {
      const snap = mkSnap({
        payload: { mass_kg: 550, rated_max_kg: 500 },
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.payload_overload).toBe(true);
      expect(result.warnings.some(w => w.includes("exceeds rated max"))).toBe(true);
    });

    it("does not flag when mass <= rated_max", () => {
      const snap = mkSnap({
        payload: { mass_kg: 400, rated_max_kg: 500 },
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.payload_overload).toBe(false);
    });

    it("handles no payload gracefully", () => {
      const snap = mkSnap({ payload: undefined });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.payload_overload).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Jerk derating
  // ══════════════════════════════════════════════════════════════════════════
  describe("jerk derating", () => {
    it("returns factor=1.0 when all conditions nominal", () => {
      const snap = mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
        ambient_temp_c: 22,
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.jerk.factor).toBe(1.0);
      expect(result.jerk.reasons).toHaveLength(0);
    });

    it("derates 20% per critical servo axis", () => {
      const snap = mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.015, baseline_following_error_mm: 0.005 }],
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.jerk.factor).toBeCloseTo(0.8, 6);
      expect(result.jerk.reasons.some(r => r.includes("-20%"))).toBe(true);
    });

    it("derates 10% per warning servo axis", () => {
      const snap = mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.009, baseline_following_error_mm: 0.005 }],
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.jerk.factor).toBeCloseTo(0.9, 6);
    });

    it("derates 10% for payload > 80% rated", () => {
      const snap = mkSnap({
        payload: { mass_kg: 450, rated_max_kg: 500 },  // 90%
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.jerk.factor).toBeCloseTo(0.9, 6);
      expect(result.jerk.reasons.some(r => r.includes("payload > 80%"))).toBe(true);
    });

    it("derates 15% for ambient outside 15-35 band", () => {
      const snap = mkSnap({ ambient_temp_c: 10 });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.jerk.factor).toBeCloseTo(0.85, 6);
      expect(result.jerk.reasons.some(r => r.includes("outside 15-35"))).toBe(true);
    });

    it("applies multiplicative derating", () => {
      const snap = mkSnap({
        servo: [
          { axis: "X", following_error_mean_mm: 0.015, baseline_following_error_mm: 0.005 },  // critical
          { axis: "Y", following_error_mean_mm: 0.009, baseline_following_error_mm: 0.005 },  // warning
        ],
        payload: { mass_kg: 450, rated_max_kg: 500 },  // >80%
        ambient_temp_c: 40,  // outside band
      });
      const result = machineKinematicStateEngine.update(snap);
      // 0.8 * 0.9 * 0.9 * 0.85 = 0.5508
      expect(result.jerk.factor).toBeCloseTo(0.5508, 4);
    });

    it("floors jerk factor at 30%", () => {
      const snap = mkSnap({
        servo: [
          { axis: "X", following_error_mean_mm: 0.02, baseline_following_error_mm: 0.005 },  // critical -20%
          { axis: "Y", following_error_mean_mm: 0.02, baseline_following_error_mm: 0.005 },  // critical -20%
          { axis: "Z", following_error_mean_mm: 0.02, baseline_following_error_mm: 0.005 },  // critical -20%
          { axis: "A", following_error_mean_mm: 0.02, baseline_following_error_mm: 0.005 },  // critical -20%
          { axis: "B", following_error_mean_mm: 0.02, baseline_following_error_mm: 0.005 },  // critical -20%
        ],
        payload: { mass_kg: 450, rated_max_kg: 500 },  // >80% -10%
        ambient_temp_c: 5,  // outside band -15%
      });
      const result = machineKinematicStateEngine.update(snap);
      // 0.8^5 * 0.9 * 0.85 = 0.25034... → clamped to 0.3
      expect(result.jerk.factor).toBe(0.3);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Look-ahead validation
  // ══════════════════════════════════════════════════════════════════════════
  describe("look-ahead validation", () => {
    it("validates against controller-specific block capacity", () => {
      const snap = mkSnap({
        controller: "fanuc",
        lookahead: { blocks_per_sec: 100, safety_margin: 1.5 },
      });
      const result = machineKinematicStateEngine.update(snap);
      // required = ceil(100 * 1.5) = 150; fanuc capacity = 200 → adequate
      expect(result.lookahead?.adequate).toBe(true);
      expect(result.lookahead?.capacity_blocks).toBe(200);
      expect(result.lookahead?.required_blocks).toBe(150);
    });

    it("flags inadequate when required > capacity", () => {
      const snap = mkSnap({
        controller: "haas",  // capacity = 90
        lookahead: { blocks_per_sec: 100, safety_margin: 1.5 },
      });
      const result = machineKinematicStateEngine.update(snap);
      // required = 150 > 90 → inadequate
      expect(result.lookahead?.adequate).toBe(false);
      expect(result.warnings.some(w => w.includes("Look-ahead inadequate"))).toBe(true);
    });

    it("uses default safety_margin=1.5 when not specified", () => {
      const snap = mkSnap({
        controller: "siemens",  // capacity = 1000
        lookahead: { blocks_per_sec: 500 },
      });
      const result = machineKinematicStateEngine.update(snap);
      // required = ceil(500 * 1.5) = 750 < 1000 → adequate
      expect(result.lookahead?.adequate).toBe(true);
      expect(result.lookahead?.required_blocks).toBe(750);
    });

    it("uses generic capacity for unknown controller", () => {
      const snap = mkSnap({
        controller: "generic",
        lookahead: { blocks_per_sec: 30, safety_margin: 1.0 },
      });
      const result = machineKinematicStateEngine.update(snap);
      // generic = 50, required = 30 → adequate
      expect(result.lookahead?.capacity_blocks).toBe(50);
      expect(result.lookahead?.adequate).toBe(true);
    });

    it("handles no lookahead input gracefully", () => {
      const snap = mkSnap({ lookahead: undefined });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.lookahead).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Overall status
  // ══════════════════════════════════════════════════════════════════════════
  describe("overall status", () => {
    it("returns nominal when all subsystems nominal", () => {
      const snap = mkSnap();
      const result = machineKinematicStateEngine.update(snap);
      expect(result.overall_status).toBe("nominal");
    });

    it("returns warning when thermal beyond tolerance", () => {
      const snap = mkSnap({
        thermal: [{ axis: "X", temperature_c: 30, stroke_mm: 1000 }],
      });
      const result = machineKinematicStateEngine.update(snap, 0.1);  // tight tolerance
      expect(result.overall_status).toBe("warning");
    });

    it("returns critical when servo critical", () => {
      const snap = mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.02, baseline_following_error_mm: 0.005 }],
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.overall_status).toBe("critical");
    });

    it("returns critical when payload overload", () => {
      const snap = mkSnap({
        payload: { mass_kg: 600, rated_max_kg: 500 },
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.overall_status).toBe("critical");
    });

    it("returns critical when lookahead inadequate", () => {
      const snap = mkSnap({
        controller: "haas",
        lookahead: { blocks_per_sec: 200 },
      });
      const result = machineKinematicStateEngine.update(snap);
      expect(result.overall_status).toBe("critical");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // History management
  // ══════════════════════════════════════════════════════════════════════════
  describe("history management", () => {
    it("stores snapshots per machine_id", () => {
      machineKinematicStateEngine.update(mkSnap({ machine_id: "VMC-001" }));
      machineKinematicStateEngine.update(mkSnap({ machine_id: "VMC-001" }));
      machineKinematicStateEngine.update(mkSnap({ machine_id: "VMC-002" }));

      expect(machineKinematicStateEngine.getHistory("VMC-001")).toHaveLength(2);
      expect(machineKinematicStateEngine.getHistory("VMC-002")).toHaveLength(1);
    });

    it("getLatest returns most recent snapshot", () => {
      machineKinematicStateEngine.update(mkSnap({ captured_at: "2026-04-01T10:00:00Z" }));
      machineKinematicStateEngine.update(mkSnap({ captured_at: "2026-04-01T11:00:00Z" }));
      const latest = machineKinematicStateEngine.getLatest("VMC-001");
      expect(latest?.captured_at).toBe("2026-04-01T11:00:00Z");
    });

    it("getLatest returns null for unknown machine", () => {
      expect(machineKinematicStateEngine.getLatest("UNKNOWN")).toBeNull();
    });

    it("getHistory returns empty array for unknown machine", () => {
      expect(machineKinematicStateEngine.getHistory("UNKNOWN")).toEqual([]);
    });

    it("getHistory returns copy (not internal reference)", () => {
      machineKinematicStateEngine.update(mkSnap());
      const hist1 = machineKinematicStateEngine.getHistory("VMC-001");
      const hist2 = machineKinematicStateEngine.getHistory("VMC-001");
      expect(hist1).not.toBe(hist2);
      expect(hist1).toEqual(hist2);
    });

    it("servoLagTrend returns per-axis lag_ratio series", () => {
      machineKinematicStateEngine.update(mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
      }));
      machineKinematicStateEngine.update(mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.008, baseline_following_error_mm: 0.005 }],
      }));
      machineKinematicStateEngine.update(mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.012, baseline_following_error_mm: 0.005 }],
      }));
      const trend = machineKinematicStateEngine.servoLagTrend("VMC-001", "X");
      expect(trend).toEqual([1.0, 1.6, 2.4]);
    });

    it("servoLagTrend returns empty for missing axis", () => {
      machineKinematicStateEngine.update(mkSnap({
        servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
      }));
      expect(machineKinematicStateEngine.servoLagTrend("VMC-001", "Y")).toEqual([]);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Rendering
  // ══════════════════════════════════════════════════════════════════════════
  describe("renderMarkdown", () => {
    it("renders all sections for full state", () => {
      const snap = mkSnap({
        thermal: [
          { axis: "X", temperature_c: 25, stroke_mm: 1000 },
          { axis: "Y", temperature_c: 24, stroke_mm: 800 },
        ],
        servo: [
          { axis: "X", following_error_mean_mm: 0.009, baseline_following_error_mm: 0.005 },
        ],
        lookahead: { blocks_per_sec: 100 },
        ambient_temp_c: 10,
      });
      const result = machineKinematicStateEngine.update(snap);
      const md = machineKinematicStateEngine.renderMarkdown(result);

      expect(md).toContain("# Machine Kinematic State");
      expect(md).toContain("## Thermal Expansion");
      expect(md).toContain("## Servo Health");
      expect(md).toContain("## Look-ahead");
      expect(md).toContain("## Jerk Derate Reasons");
      expect(md).toContain("## Warnings");
    });

    it("omits optional sections when not applicable", () => {
      const snap = mkSnap();
      const result = machineKinematicStateEngine.update(snap);
      const md = machineKinematicStateEngine.renderMarkdown(result);

      expect(md).not.toContain("## Look-ahead");
      expect(md).not.toContain("## Jerk Derate Reasons");
      expect(md).not.toContain("## Warnings");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Constants validation
  // ══════════════════════════════════════════════════════════════════════════
  describe("constants", () => {
    it("THERMAL_ALPHA has correct values per Machinery's Handbook", () => {
      expect(THERMAL_ALPHA.steel).toBe(1.2e-5);
      expect(THERMAL_ALPHA.cast_iron).toBe(1.08e-5);
      expect(THERMAL_ALPHA.aluminum).toBe(2.3e-5);
      expect(THERMAL_ALPHA.granite).toBe(6e-6);
      expect(THERMAL_ALPHA.ceramic).toBe(3e-6);
    });

    it("LOOKAHEAD_BLOCKS has correct values per vendor docs", () => {
      expect(LOOKAHEAD_BLOCKS.fanuc).toBe(200);
      expect(LOOKAHEAD_BLOCKS.siemens).toBe(1000);
      expect(LOOKAHEAD_BLOCKS.okuma).toBe(400);
      expect(LOOKAHEAD_BLOCKS.heidenhain).toBe(10000);
      expect(LOOKAHEAD_BLOCKS.haas).toBe(90);
      expect(LOOKAHEAD_BLOCKS.mazak).toBe(600);
      expect(LOOKAHEAD_BLOCKS.generic).toBe(50);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Reset
  // ══════════════════════════════════════════════════════════════════════════
  describe("reset", () => {
    it("clears all history and resets counter", () => {
      machineKinematicStateEngine.update(mkSnap());
      machineKinematicStateEngine.update(mkSnap());
      expect(machineKinematicStateEngine.getHistory("VMC-001")).toHaveLength(2);

      machineKinematicStateEngine.reset();

      expect(machineKinematicStateEngine.getHistory("VMC-001")).toHaveLength(0);
      const newResult = machineKinematicStateEngine.update(mkSnap());
      expect(newResult.snapshot_id).toBe("MKS-000001");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Singleton export
  // ══════════════════════════════════════════════════════════════════════════
  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(machineKinematicStateEngine).toBeInstanceOf(MachineKinematicStateEngine);
    });
  });
});
