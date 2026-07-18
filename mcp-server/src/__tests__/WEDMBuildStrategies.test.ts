/**
 * Tests for the Phase A3 build-status toolpath strategies (cannelure + micro fine-wire).
 *   npx vitest run src/__tests__/WEDMBuildStrategies.test.ts
 *
 * Verifies INTENT (R9): the halve-feed rule fires on the exact tight-pitch
 * boundary, the oracle base feed is the only feed source (derate is a pure
 * multiply), null base feed degrades to operator-set (not 0), and the micro
 * path gates wire + standoff before deriving — including the deliberate
 * "0.10mm not on JM spools" closed-loop linkage.
 */
import { describe, it, expect } from "vitest";
import {
  cannelureFeedStrategy,
  microFineWireStrategy,
  CANNELURE_PITCH_WIRE_FACTOR,
  CANNELURE_DEFAULT_FEED_DERATE,
  FINE_WIRE_DIAMETER_MM,
  FINE_WIRE_MAX_STANDOFF_MM,
  FINE_WIRE_DEFAULT_POWER_DERATE,
} from "../data/wedm-build-strategies.js";

describe("cannelureFeedStrategy", () => {
  it("halves the oracle feed when pitch < 3x wire-Ø (default tribal derate)", () => {
    // wire 0.25 -> threshold 0.75mm; pitch 0.5mm is tight.
    const r = cannelureFeedStrategy({ base_feed_mm_min: 2.0, feature_pitch_mm: 0.5, wire_diameter_mm: 0.25 });
    expect(r.applies).toBe(true);
    expect(r.feed_derate_used).toBe(CANNELURE_DEFAULT_FEED_DERATE);
    expect(r.derated_feed_mm_min).toBe(1.0); // 2.0 * 0.5 — derate is pure multiply of the injected base
    expect(r.debris_short_guard).toBe(true);
  });

  it("does NOT derate when pitch >= 3x wire-Ø (passes oracle feed through)", () => {
    // wire 0.25 -> threshold 0.75mm; pitch exactly at threshold is NOT < threshold.
    const r = cannelureFeedStrategy({ base_feed_mm_min: 2.0, feature_pitch_mm: CANNELURE_PITCH_WIRE_FACTOR * 0.25, wire_diameter_mm: 0.25 });
    expect(r.applies).toBe(false);
    expect(r.derated_feed_mm_min).toBe(2.0);
    expect(r.feed_derate_used).toBe(1.0);
    expect(r.debris_short_guard).toBe(false);
  });

  it("respects an explicit feed_derate override (clamped to 0.5-1.0)", () => {
    const r = cannelureFeedStrategy({ base_feed_mm_min: 1.0, feature_pitch_mm: 0.3, wire_diameter_mm: 0.25, feed_derate: 0.7 });
    expect(r.feed_derate_used).toBe(0.7);
    expect(r.derated_feed_mm_min).toBe(0.7);
    const clamped = cannelureFeedStrategy({ base_feed_mm_min: 1.0, feature_pitch_mm: 0.3, wire_diameter_mm: 0.25, feed_derate: 0.1 });
    expect(clamped.feed_derate_used).toBe(0.5); // clamp floor
  });

  it("null oracle feed (operator-set) stays null after derate — never silently 0", () => {
    const r = cannelureFeedStrategy({ base_feed_mm_min: null, feature_pitch_mm: 0.3, wire_diameter_mm: 0.25 });
    expect(r.applies).toBe(true);
    expect(r.derated_feed_mm_min).toBe(null);
  });
});

describe("microFineWireStrategy", () => {
  it("derates a valid fine-wire job (0.10mm + standoff in range)", () => {
    const r = microFineWireStrategy({ base_feed_mm_min: 1.5, wire_diameter_mm: FINE_WIRE_DIAMETER_MM, standoff_mm: 0.2 });
    expect(r.feasible).toBe(true);
    expect(r.blockers).toEqual([]);
    expect(r.standoff_ok).toBe(true);
    expect(r.power_derate_used).toBe(FINE_WIRE_DEFAULT_POWER_DERATE);
    expect(r.derated_feed_mm_min).toBeCloseTo(1.5 * FINE_WIRE_DEFAULT_POWER_DERATE, 6);
  });

  it("rejects non-fine wire (0.25mm) with a blocker + no derated feed", () => {
    const r = microFineWireStrategy({ base_feed_mm_min: 1.5, wire_diameter_mm: 0.25, standoff_mm: 0.2 });
    expect(r.feasible).toBe(false);
    expect(r.derated_feed_mm_min).toBe(null);
    expect(r.blockers.some((b) => /fine wire/.test(b))).toBe(true);
  });

  it("gates standoff > 0.25mm (and standoff <= 0)", () => {
    const tooFar = microFineWireStrategy({ base_feed_mm_min: 1.5, wire_diameter_mm: FINE_WIRE_DIAMETER_MM, standoff_mm: FINE_WIRE_MAX_STANDOFF_MM + 0.05 });
    expect(tooFar.feasible).toBe(false);
    expect(tooFar.standoff_ok).toBe(false);
    const zero = microFineWireStrategy({ base_feed_mm_min: 1.5, wire_diameter_mm: FINE_WIRE_DIAMETER_MM, standoff_mm: 0 });
    expect(zero.feasible).toBe(false);
  });

  it("clamps power_derate to the 0.3-0.8 registry range", () => {
    const hi = microFineWireStrategy({ base_feed_mm_min: 1.0, wire_diameter_mm: FINE_WIRE_DIAMETER_MM, standoff_mm: 0.2, power_derate: 0.95 });
    expect(hi.power_derate_used).toBe(0.8);
    const lo = microFineWireStrategy({ base_feed_mm_min: 1.0, wire_diameter_mm: FINE_WIRE_DIAMETER_MM, standoff_mm: 0.2, power_derate: 0.1 });
    expect(lo.power_derate_used).toBe(0.3);
  });
});
