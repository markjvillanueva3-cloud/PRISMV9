import { describe, it, expect } from "vitest";
import {
  MILL_VC_ENVELOPE,
  MILL_FZ_PER_TOOTH_MAX,
  MARGIN_MIN_HARD,
  MARGIN_MIN_SOFT,
  CHATTER_DANGER_ZONE_LOW,
  CHATTER_DANGER_ZONE_HIGH,
  millAGISafetyContainmentEngine as eng,
  MillAGISafetyContainmentEngine,
  type MillSpeedFeedCandidate,
  type MillQuoteCandidate,
  type MillKinematicCandidate,
  type MillChatterCandidate,
} from "../engines/MillAGISafetyContainmentEngine.js";

function nominalSpeedFeed(o: Partial<MillSpeedFeedCandidate> = {}): MillSpeedFeedCandidate {
  return { iso_group: "P", vc_m_min: 200, fz_mm_tooth: 0.10, ap_mm: 5, ae_mm: 3, flute_count: 4, ...o };
}
function nominalQuote(o: Partial<MillQuoteCandidate> = {}): MillQuoteCandidate {
  return { unit_price_usd: 100, total_direct_cost_usd: 5000, quantity: 100, ...o };
}
function nominalKinematic(o: Partial<MillKinematicCandidate> = {}): MillKinematicCandidate {
  return {
    requires_4th_axis: false, requires_5th_axis: false,
    requires_pallet_changer: false, requires_probe: false,
    machine_has_4th_axis: false, machine_has_5th_axis: false,
    machine_has_pallet_changer: false, machine_has_probe: false,
    ...o,
  };
}
function nominalChatter(o: Partial<MillChatterCandidate> = {}): MillChatterCandidate {
  // rpm=5000, flute=4 → tooth-pass=333Hz. Far from any normal fn → no chatter
  return { rpm: 5000, flute_count: 4, natural_freq_hz: 1500, ...o };
}

describe("MillAGISafetyContainmentEngine", () => {
  it("identity smoke: singleton is an instance of the class", () => {
    expect(eng).toBeInstanceOf(MillAGISafetyContainmentEngine);
  });

  it("getStats: 5 categories, 3 mill-canonical extensions, 6 ISO groups", () => {
    const s = eng.getStats();
    expect(s.categories).toEqual(["physics", "economics", "capacity", "kinematic", "chatter"]);
    expect(s.mill_canonical_extensions).toEqual(["chatter_check", "fz_per_tooth", "kinematic_4_5_axis_pallet_probe"]);
    expect(s.iso_groups.length).toBe(6);
    expect(s.margin_thresholds).toEqual({ min_hard: MARGIN_MIN_HARD, min_soft: MARGIN_MIN_SOFT });
    expect(s.chatter_danger_zone).toEqual({ low: CHATTER_DANGER_ZONE_LOW, high: CHATTER_DANGER_ZONE_HIGH });
  });

  it("nominal P-group speed/feed at Vc=200 → passes (no hard blocks)", () => {
    const r = eng.check({ category: "physics", speed_feed: nominalSpeedFeed() });
    expect(r.passed).toBe(true);
    expect(r.blocking_count).toBe(0);
  });

  it("Vc below hard-min for P → HARD BLOCK", () => {
    const r = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ vc_m_min: 5 }) });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "vc_below_hard_min")).toBe(true);
  });

  it("Vc below soft-min for P → soft warning, still passes", () => {
    const r = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ vc_m_min: 30 }) });
    expect(r.passed).toBe(true);
    expect(r.warning_count).toBeGreaterThanOrEqual(1);
    expect(r.checks.some(c => c.check_id === "vc_below_soft_min")).toBe(true);
  });

  it("Vc above hard-max for P (Vc=700) → HARD BLOCK", () => {
    const r = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ vc_m_min: 700 }) });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "vc_above_hard_max")).toBe(true);
  });

  it("MILL-CANONICAL Vc for aluminum (N): 2000 m/min is within mill envelope (HSM allowed)", () => {
    // N max_hard for mill is 2500 (vs lathe 1800)
    const r = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ iso_group: "N", vc_m_min: 2000 }) });
    expect(r.checks.some(c => c.check_id === "vc_above_hard_max")).toBe(false);
    // Above soft-max 1500 → warning
    expect(r.checks.some(c => c.check_id === "vc_above_soft_max")).toBe(true);
  });

  it("MILL-CANONICAL fz PER-TOOTH (not per-rev) hard-max check fires above limit", () => {
    // P group fz_per_tooth max_hard = 0.40
    const r = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ fz_mm_tooth: 0.50 }) });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "fz_above_hard_max")).toBe(true);
  });

  it("fz nonpositive → HARD BLOCK", () => {
    const r = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ fz_mm_tooth: 0 }) });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "fz_nonpositive")).toBe(true);
  });

  it("ap nonpositive → HARD BLOCK", () => {
    const r = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ ap_mm: 0 }) });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "ap_nonpositive")).toBe(true);
  });

  it("ae nonpositive (when provided) → HARD BLOCK", () => {
    const r = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ ae_mm: 0 }) });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "ae_nonpositive")).toBe(true);
  });

  it("force-margin check fires when estimated Fc exceeds spindle envelope", () => {
    // kc1.1 for P = 1800; force = 1800 × ae × fz × Z = 1800 × 10 × 0.4 × 8 = 57600 N → way over
    const r = eng.check({
      category: "physics",
      speed_feed: nominalSpeedFeed({ ae_mm: 10, fz_mm_tooth: 0.40, flute_count: 8 }),
    });
    expect(r.checks.some(c => c.check_id === "force_above_spindle_margin")).toBe(true);
  });

  it("economics: positive margin → passes", () => {
    // 100 unit_price, 50/unit cost → 50% margin
    const r = eng.check({ category: "economics", quote: nominalQuote() });
    expect(r.passed).toBe(true);
    expect(r.checks.filter(c => c.category === "economics")).toEqual([]);
  });

  it("economics: margin = 5% → soft warning (below 10%)", () => {
    // 100 unit_price, 95/unit cost → 5% margin
    const r = eng.check({ category: "economics", quote: nominalQuote({ total_direct_cost_usd: 9500 }) });
    expect(r.passed).toBe(true);
    expect(r.checks.some(c => c.check_id === "margin_below_soft_min")).toBe(true);
  });

  it("economics: negative margin → HARD BLOCK", () => {
    const r = eng.check({ category: "economics", quote: nominalQuote({ total_direct_cost_usd: 15_000 }) });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "margin_negative")).toBe(true);
  });

  it("capacity: 100hr in fleet of 168hr → passes", () => {
    const r = eng.check({ category: "capacity", schedule: { total_busy_min: 6000 } });
    expect(r.passed).toBe(true);
  });

  it("capacity: 200hr in fleet of 168hr → HARD BLOCK", () => {
    const r = eng.check({ category: "capacity", schedule: { total_busy_min: 12000 } });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "busy_exceeds_capacity")).toBe(true);
  });

  it("capacity: 155hr in 168hr (>90%) → soft warning", () => {
    const r = eng.check({ category: "capacity", schedule: { total_busy_min: 155 * 60 } });
    expect(r.passed).toBe(true);
    expect(r.checks.some(c => c.check_id === "busy_above_soft_threshold")).toBe(true);
  });

  it("MILL-CANONICAL kinematic: requires_4th_axis on 3-axis machine → HARD BLOCK", () => {
    const r = eng.check({ category: "kinematic", kinematic: nominalKinematic({ requires_4th_axis: true }) });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "missing_4th_axis")).toBe(true);
  });

  it("MILL-CANONICAL kinematic: requires_5th_axis on 3-axis → HARD BLOCK", () => {
    const r = eng.check({ category: "kinematic", kinematic: nominalKinematic({ requires_5th_axis: true }) });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "missing_5th_axis")).toBe(true);
  });

  it("MILL-CANONICAL kinematic: pallet_changer missing → soft warning (not block)", () => {
    const r = eng.check({ category: "kinematic", kinematic: nominalKinematic({ requires_pallet_changer: true }) });
    expect(r.passed).toBe(true);
    expect(r.checks.some(c => c.check_id === "missing_pallet_changer" && c.severity === "soft")).toBe(true);
  });

  it("MILL-CANONICAL kinematic: probe required but missing → HARD BLOCK", () => {
    const r = eng.check({ category: "kinematic", kinematic: nominalKinematic({ requires_probe: true }) });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "missing_probe")).toBe(true);
  });

  it("MILL-CANONICAL kinematic: all required + all present → passes", () => {
    const r = eng.check({
      category: "kinematic",
      kinematic: {
        requires_4th_axis: true, requires_5th_axis: true,
        requires_pallet_changer: true, requires_probe: true,
        machine_has_4th_axis: true, machine_has_5th_axis: true,
        machine_has_pallet_changer: true, machine_has_probe: true,
      },
    });
    expect(r.passed).toBe(true);
  });

  it("MILL-CANONICAL chatter: tooth-pass in [0.8, 1.2] × fn → HARD BLOCK", () => {
    // rpm=15000, flutes=4 → tooth-pass=1000Hz. fn=1000Hz → ratio=1.0 → danger zone
    const r = eng.check({
      category: "chatter",
      chatter: { rpm: 15_000, flute_count: 4, natural_freq_hz: 1000 },
    });
    expect(r.passed).toBe(false);
    expect(r.checks.some(c => c.check_id === "tooth_pass_in_danger_zone")).toBe(true);
  });

  it("MILL-CANONICAL chatter: tooth-pass at 1st harmonic (~0.5×fn) → soft warning", () => {
    // rpm=7500, flute=4 → 500Hz. fn=1000Hz → ratio=0.5 → 1st harmonic
    const r = eng.check({
      category: "chatter",
      chatter: { rpm: 7500, flute_count: 4, natural_freq_hz: 1000 },
    });
    expect(r.passed).toBe(true);
    expect(r.checks.some(c => c.check_id === "tooth_pass_near_1st_harmonic")).toBe(true);
  });

  it("MILL-CANONICAL chatter: well clear of danger zones → no checks", () => {
    // rpm=5000, flute=4 → 333Hz. fn=2000Hz → ratio=0.167 → safe
    const r = eng.check({ category: "chatter", chatter: nominalChatter({ natural_freq_hz: 2000 }) });
    expect(r.passed).toBe(true);
    expect(r.checks.filter(c => c.category === "chatter")).toEqual([]);
  });

  it("category='all' runs every check group when payloads present", () => {
    const r = eng.check({
      category: "all",
      speed_feed: nominalSpeedFeed(),
      quote: nominalQuote(),
      schedule: { total_busy_min: 6000 },
      kinematic: nominalKinematic(),
      chatter: nominalChatter(),
    });
    expect(r.passed).toBe(true);
    expect(r.trace.some(t => /physics:/.test(t))).toBe(true);
    expect(r.trace.some(t => /economics:/.test(t))).toBe(true);
    expect(r.trace.some(t => /capacity:/.test(t))).toBe(true);
    expect(r.trace.some(t => /kinematic:/.test(t))).toBe(true);
    expect(r.trace.some(t => /chatter:/.test(t))).toBe(true);
  });

  it("variability ≥3 ISO groups: P, N, S — all envelopes distinct", () => {
    const p = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ iso_group: "P", vc_m_min: 200 }) });
    const n = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ iso_group: "N", vc_m_min: 200 }) });
    const s = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ iso_group: "S", vc_m_min: 200 }) });
    // P: 200 within envelope, OK
    // N: 200 below soft-min (200 — same as soft-min boundary)
    // S: 200 == max_hard for S (200), boundary
    expect(p.passed).toBe(true);
    // P at 200: in [50, 400], no warnings
    expect(p.warning_count).toBe(0);
    // N at 200: just above hard min (80) and at soft min (200) — borderline
    expect(n.passed).toBe(true);
    // S at 200: == max_hard (200), passing condition is strict ">" so it just barely passes
    expect(s.passed).toBe(true);
  });

  it("invalid input rejected by zod (missing iso_group)", () => {
    expect(() => eng.check({
      category: "physics",
      speed_feed: { vc_m_min: 200, fz_mm_tooth: 0.1, ap_mm: 5, flute_count: 4 } as never,
    })).toThrow();
  });

  it("determinism: same input twice → identical report", () => {
    const input = { category: "all" as const, speed_feed: nominalSpeedFeed(), quote: nominalQuote() };
    const r1 = eng.check(input);
    const r2 = eng.check(input);
    expect(r1.checks).toEqual(r2.checks);
    expect(r1.passed).toBe(r2.passed);
  });

  it("trace narrates final summary with check counts", () => {
    const r = eng.check({ category: "physics", speed_feed: nominalSpeedFeed({ vc_m_min: 700 }) });
    expect(r.trace.some(t => /final:.*blocking/.test(t))).toBe(true);
  });

  it("MILL_VC_ENVELOPE export matches engine internals: aluminum max_hard is 2500", () => {
    expect(MILL_VC_ENVELOPE.N.max_hard).toBe(2500);
  });

  it("MILL_FZ_PER_TOOTH_MAX export: superalloy fz_per_tooth max_hard is 0.20 (sensitive)", () => {
    expect(MILL_FZ_PER_TOOTH_MAX.S.max_hard).toBe(0.20);
  });
});
