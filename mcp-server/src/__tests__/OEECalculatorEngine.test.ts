/**
 * OEECalculatorEngine.test.ts -- U-HOTEL-OEE-DASHBOARD (gap #4 of HOTEL-ERP-FRONTEND-WIRING-SPEC)
 *
 * The OEEDashboardPage Losses + Trends tabs had no backing engine projection -- losses()/trend()
 * were promised in the engine's header comment but never built, so /erp/oee-losses + /erp/oee-trend
 * had nothing to return. This unit adds losses(input):OEELoss[] + trend(samples):OEETrendDay[] as
 * PURE projections of the existing calculate(). These tests pin the projection with real reference
 * values (no toBeDefined stubs) and lock the fail-closed empty-input contract the page relies on.
 *
 * The page is EXPLICITLY anti-fabrication: an empty array renders "Unavailable", NOT seeded data.
 * trend([]) MUST return [] (not throw, not fabricate) -- that is the load-bearing R12 pin here.
 */
import { describe, it, expect } from "vitest";
import { oeeCalculatorEngine } from "../engines/OEECalculatorEngine.js";
import type { OEEInput } from "../engines/OEECalculatorEngine.js";

/** A healthy, fully-populated measurement window with hand-computed reference values:
 *  availableTime=450, availability=400/450=88.9%, idealRunTime=350, performance=350/400=87.5%,
 *  quality=680/700=97.1%. six_big_losses: breakdowns 36, setup 24, minor_stops 15, reduced_speed 35,
 *  startup_rejects 4 (count), production_rejects 16 (count). idealCycleMin=0.5 -> startupMin 2.0, prodMin 8.0. */
function baseInput(over: Partial<OEEInput> = {}): OEEInput {
  return {
    planned_production_time_min: 480,
    actual_run_time_min: 400,
    planned_downtime_min: 30,
    unplanned_downtime_min: 60,
    ideal_cycle_time_sec: 30,
    actual_cycle_time_sec: 35,
    total_parts_produced: 700,
    good_parts: 680,
    machine_id: "VMC-1",
    date: "2026-06-24",
    ...over,
  };
}

describe("OEECalculatorEngine.losses() -- Six Big Losses projection (U-HOTEL-OEE-DASHBOARD gap #4)", () => {
  it("projects all 6 losses into the correct TPM category buckets with reference minutes", () => {
    const losses = oeeCalculatorEngine.losses(baseInput());
    expect(losses).toHaveLength(6);
    const byId = Object.fromEntries(losses.map((l) => [l.id, l]));

    // Availability bucket: breakdowns (60*0.6=36) + setup (60*0.4=24)
    expect(byId.breakdowns.category).toBe("availability");
    expect(byId.breakdowns.minutes_lost).toBe(36.0);
    expect(byId.setup_adjustment.category).toBe("availability");
    expect(byId.setup_adjustment.minutes_lost).toBe(24.0);

    // Performance bucket: minor_stops (speedLoss 50 * 0.3 = 15) + reduced_speed (50 * 0.7 = 35)
    expect(byId.minor_stops.category).toBe("performance");
    expect(byId.minor_stops.minutes_lost).toBe(15.0);
    expect(byId.reduced_speed.category).toBe("performance");
    expect(byId.reduced_speed.minutes_lost).toBe(35.0);

    // Quality bucket: reject COUNTS converted to minutes via ideal_cycle_time (30s -> 0.5 min/part).
    // startup_rejects=4 -> 4*0.5=2.0 min; production_rejects=16 -> 16*0.5=8.0 min.
    expect(byId.startup_rejects.category).toBe("quality");
    expect(byId.startup_rejects.minutes_lost).toBe(2.0);
    expect(byId.production_rejects.category).toBe("quality");
    expect(byId.production_rejects.minutes_lost).toBe(8.0);
  });

  it("ranks losses worst-first by minutes_lost (matches the page's ranked display)", () => {
    const losses = oeeCalculatorEngine.losses(baseInput());
    const mins = losses.map((l) => l.minutes_lost);
    // 36 (breakdowns) > 35 (reduced_speed) > 24 (setup) > 15 (minor_stops) > 8 (prod_rejects) > 2 (startup_rejects)
    expect(mins).toEqual([36.0, 35.0, 24.0, 15.0, 8.0, 2.0]);
    // Strictly non-increasing (the ranking invariant).
    for (let i = 1; i < mins.length; i++) expect(mins[i]).toBeLessThanOrEqual(mins[i - 1]);
  });

  it("emits a valid FE BigLoss contract for every loss (id, name, category union, numeric minutes, description)", () => {
    const losses = oeeCalculatorEngine.losses(baseInput());
    for (const l of losses) {
      expect(typeof l.id).toBe("string");
      expect(l.id.length).toBeGreaterThan(0);
      expect(typeof l.name).toBe("string");
      expect(l.name.length).toBeGreaterThan(0);
      expect(["availability", "performance", "quality"]).toContain(l.category);
      expect(Number.isFinite(l.minutes_lost)).toBe(true);
      expect(typeof l.description).toBe("string");
      expect(l.description.length).toBeGreaterThan(0);
    }
  });

  it("R12 FAIL-CLOSED PIN: empty body ({}) -> [] (the FE's first-load call -> honest Unavailable, NOT '0 min lost' cards)", () => {
    // The FE posts analyticsOEELosses({}) = an EMPTY body on first load. An empty/unmeasured window has
    // nothing to project, so losses({}) MUST return [] -- symmetric with trend([]) -> [] -- so the page
    // shows honest "Unavailable" rather than fabricated finite-0 loss cards flagged "Live". (A prior cut
    // returned 6 rows where minor_stops/reduced_speed came out as a surviving finite 0 -> the page showed
    // 2 bogus "0 min lost / Live" cards; this is the corrected fail-closed contract.)
    expect(oeeCalculatorEngine.losses({} as OEEInput)).toEqual([]);
  });

  it("R12 FAIL-CLOSED: a window missing a core field (no good_parts) -> [] (partial body is not a measurement)", () => {
    const partial = baseInput();
    delete (partial as Partial<OEEInput>).good_parts;
    expect(oeeCalculatorEngine.losses(partial)).toEqual([]);
  });

  it("ADVERSARIAL: a measured window with garbage numbers never emits a negative/NaN/Infinity minute (safeMin clamp)", () => {
    // A negative ideal_cycle_time / huge value is a FULLY-POPULATED (measured) window, so losses() runs --
    // but every emitted minutes_lost is clamped finite + non-negative so a bar can never render negative or
    // overflow its track. (isMeasuredWindow lets bad-but-complete data through; safeMin keeps the page sane.)
    const garbage = oeeCalculatorEngine.losses(baseInput({ ideal_cycle_time_sec: -100 }));
    expect(garbage).toHaveLength(6);
    for (const l of garbage) {
      expect(Number.isFinite(l.minutes_lost)).toBe(true);
      expect(l.minutes_lost).toBeGreaterThanOrEqual(0);
    }
    // A massive ideal_cycle_time must not blow the reject->minutes bar into the millions of survivable minutes.
    const huge = oeeCalculatorEngine.losses(baseInput({ ideal_cycle_time_sec: 1e9 }));
    for (const l of huge) expect(Number.isFinite(l.minutes_lost)).toBe(true);
  });

  it("ADVERSARIAL: zero ideal_cycle_time_sec keeps reject->minutes finite (0, never NaN/Infinity)", () => {
    const losses = oeeCalculatorEngine.losses(baseInput({ ideal_cycle_time_sec: 0 }));
    const startup = byIdLoss(losses, "startup_rejects");
    const prod = byIdLoss(losses, "production_rejects");
    expect(Number.isFinite(startup.minutes_lost)).toBe(true);
    expect(Number.isFinite(prod.minutes_lost)).toBe(true);
    expect(startup.minutes_lost).toBe(0);
    expect(prod.minutes_lost).toBe(0);
  });

  it("ADVERSARIAL: zero rejects (good == total) yields 0-minute quality losses", () => {
    const losses = oeeCalculatorEngine.losses(baseInput({ good_parts: 700 }));
    expect(byIdLoss(losses, "startup_rejects").minutes_lost).toBe(0);
    expect(byIdLoss(losses, "production_rejects").minutes_lost).toBe(0);
  });
});

describe("OEECalculatorEngine.trend() -- per-day OEE history projection (U-HOTEL-OEE-DASHBOARD gap #4)", () => {
  it("projects each dated sample into a TrendDay with the exact per-day oee_pct from calculate()", () => {
    const day1 = baseInput({ date: "2026-06-22" });                  // oee = 88.9 * 87.5 * 97.1 /1e4
    const day2 = baseInput({ date: "2026-06-23", good_parts: 700 }); // quality 100% -> higher oee
    const trend = oeeCalculatorEngine.trend([day1, day2]);
    expect(trend).toHaveLength(2);
    expect(trend[0].date).toBe("2026-06-22");
    expect(trend[1].date).toBe("2026-06-23");
    // Each row's pcts equal calculate()'s rounded outputs for that sample.
    const r1 = oeeCalculatorEngine.calculate(day1);
    expect(trend[0].oee_pct).toBe(r1.oee_pct);
    expect(trend[0].availability_pct).toBe(r1.availability_pct);
    expect(trend[0].performance_pct).toBe(r1.performance_pct);
    expect(trend[0].quality_pct).toBe(r1.quality_pct);
    // day2 has 100% quality so its OEE is strictly higher than day1's.
    expect(trend[1].oee_pct).toBeGreaterThan(trend[0].oee_pct);
  });

  it("preserves input order (does NOT sort -- the page slices the tail for its period filter)", () => {
    const samples = ["2026-06-20", "2026-06-21", "2026-06-22"].map((d) => baseInput({ date: d }));
    const trend = oeeCalculatorEngine.trend(samples);
    expect(trend.map((d) => d.date)).toEqual(["2026-06-20", "2026-06-21", "2026-06-22"]);
  });

  it("R12 FAIL-CLOSED PIN: empty samples -> [] (the page then shows honest Unavailable, NOT fabricated data)", () => {
    expect(oeeCalculatorEngine.trend([])).toEqual([]);
  });

  it("ADVERSARIAL: a non-array / missing samples arg -> [] (never throws, never fabricates)", () => {
    expect(oeeCalculatorEngine.trend(undefined as unknown as OEEInput[])).toEqual([]);
    expect(oeeCalculatorEngine.trend(null as unknown as OEEInput[])).toEqual([]);
  });

  it("ADVERSARIAL: drops samples with no date (the FE drops dateless rows too)", () => {
    const dated = baseInput({ date: "2026-06-22" });
    const dateless = baseInput({ date: undefined });
    const empty = baseInput({ date: "" });
    const trend = oeeCalculatorEngine.trend([dated, dateless, empty]);
    expect(trend).toHaveLength(1);
    expect(trend[0].date).toBe("2026-06-22");
  });

  it("ADVERSARIAL: a single zero-parts sample is still projected (finite pcts, no throw)", () => {
    const zero = baseInput({ date: "2026-06-22", total_parts_produced: 0, good_parts: 0 });
    const trend = oeeCalculatorEngine.trend([zero]);
    expect(trend).toHaveLength(1);
    expect(Number.isFinite(trend[0].oee_pct)).toBe(true);
    expect(trend[0].oee_pct).toBe(0); // performance 0 (no parts) -> OEE 0
  });
});

/** Local helper -- find a loss by id (avoids depending on sort order in adversarial cases). */
function byIdLoss(
  losses: ReturnType<typeof oeeCalculatorEngine.losses>,
  id: string,
): (typeof losses)[number] {
  const found = losses.find((l) => l.id === id);
  if (!found) throw new Error(`loss id '${id}' not found`);
  return found;
}
