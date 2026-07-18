/**
 * sfcCalculateResponseNormalize.test.ts (U-BRAVO-SFC-CALC-RESPONSE-SHAPE, slot:bravo, 2026-06-26)
 *
 * Proves normalizeSfcCalculateResponse (routes/sfc.ts) maps the dispatcher's doubly-nested,
 * differently-named sfc_calculate payload into the web SfcCalculateResult contract that
 * SfcCalculatorPage / ResultsDisplay / ComparisonView / CalculationHistory read.
 *
 * THE BUG (verified live on :3100): prism_product:sfc_calculate returns
 *   { action:"sfc_calculate", result:{ cutting_speed_m_min, spindle_rpm, feed_per_tooth_mm,
 *     table_feed_mm_min, safety_score, safety_status, power_kW, ... } }
 * but the page reads result.{cutting_speed, spindle_speed, feed_per_tooth, feed_rate} -> EVERY primary
 * field was undefined and ResultsDisplay crashed on `result.feed_rate.toFixed(1)`.
 */
import { describe, it, expect } from "vitest";
import { normalizeSfcCalculateResponse, bridgeCycleTimeParams } from "../routes/sfc.js";
import { estimateCycleTime } from "../engines/ToolpathCalculations.js";

// The EXACT shape callTool("prism_product","sfc_calculate") returns on success (verified live).
function dispatcherPayload(): Record<string, unknown> {
  return {
    action: "sfc_calculate",
    result: {
      cutting_speed_m_min: 200,
      spindle_rpm: 6366,
      feed_per_tooth_mm: 0.137,
      table_feed_mm_min: 3487,
      depth_of_cut_mm: 5,
      width_of_cut_mm: 10,
      cutting_force_N: 2889,
      power_kW: 9.63,
      torque_Nm: 14.44,
      tool_life_min: 8.9,
      optimal_speed_m_min: 170,
      surface_roughness_Ra_um: 1.47,
      surface_finish_grade: "N7 (fair)",
      mrr_cm3_min: 174.43,
      safety_score: 1,
      safety_status: "safe",
      safety_warnings: [],
      uncertainty: { cutting_speed_range: [170, 230] },
      sustainability: { energy_kWh_per_part: 1.6 },
      formulas_used: ["Kienzle cutting force", "Taylor tool life"],
      tier: "pro",
    },
  };
}

describe("normalizeSfcCalculateResponse — dispatcher shape -> web SfcCalculateResult contract", () => {
  it("maps the engine field names the page reads (cutting_speed/spindle_speed/feed_per_tooth/feed_rate)", () => {
    const out = normalizeSfcCalculateResponse(dispatcherPayload());
    const r = out.result as Record<string, unknown>;
    expect(r.cutting_speed).toBe(200);     // <- cutting_speed_m_min
    expect(r.spindle_speed).toBe(6366);    // <- spindle_rpm
    expect(r.feed_per_tooth).toBe(0.137);  // <- feed_per_tooth_mm
    expect(r.feed_rate).toBe(3487);        // <- table_feed_mm_min
  });

  it("REGRESSION ANCHOR: the page's primary reads are DEFINED after normalize (were undefined pre-fix)", () => {
    const out = normalizeSfcCalculateResponse(dispatcherPayload());
    const r = out.result as Record<string, unknown>;
    // These four are exactly what ResultsDisplay.tsx / CalculationHistory.tsx call .toFixed on.
    for (const k of ["cutting_speed", "spindle_speed", "feed_per_tooth", "feed_rate"]) {
      expect(typeof r[k], `${k} must be a number for the page to render`).toBe("number");
    }
  });

  it("assembles a structured safety object from the engine's flat safety_score/status/warnings", () => {
    const out = normalizeSfcCalculateResponse(dispatcherPayload());
    const r = out.result as Record<string, unknown>;
    const safety = r.safety as Record<string, unknown>;
    expect(safety.score).toBe(1);
    expect(safety.status).toBe("safe");
    expect(out.safety).toEqual(safety); // also surfaced at the top level (web Wrapped<T>.safety)
  });

  it("carries the rich engine outputs into meta (power/torque/tool-life/Ra/MRR + power_kw read)", () => {
    const out = normalizeSfcCalculateResponse(dispatcherPayload());
    const meta = (out.result as Record<string, unknown>).meta as Record<string, unknown>;
    expect(meta.power_kw).toBe(9.63);
    expect(meta.torque_nm).toBe(14.44);
    expect(meta.tool_life_min).toBe(8.9);
    expect(meta.surface_roughness_ra_um).toBe(1.47);
    expect(meta.mrr_cm3_min).toBe(174.43);
  });

  it("PASSES a {blocked} gate envelope THROUGH unchanged (FE assertNotBlocked must still fire)", () => {
    const blocked = { blocked: true, blocker: "pre-machine-completeness-gate", action: "sfc_calculate" };
    expect(normalizeSfcCalculateResponse(blocked)).toEqual(blocked);
  });

  it("PASSES an {error} envelope THROUGH unchanged (FE assertNoEnvelopeError must still fire)", () => {
    const err = { error: "no material" };
    expect(normalizeSfcCalculateResponse(err)).toEqual(err);
  });

  it("is forward-compatible: an already-contract-named flat result keeps its values", () => {
    const flat = { cutting_speed: 150, spindle_speed: 5000, feed_per_tooth: 0.1, feed_rate: 2000 };
    const r = normalizeSfcCalculateResponse(flat).result as Record<string, unknown>;
    expect(r.cutting_speed).toBe(150);
    expect(r.spindle_speed).toBe(5000);
  });
});

describe("bridgeCycleTimeParams — maps web field synonyms (rapid_distance left optional per calc schema)", () => {
  it("maps feed_rate->cutting_feedrate and cut_length*num_passes->cutting_distance; leaves rapid_distance unset when no approach/overtravel", () => {
    const b = bridgeCycleTimeParams({ feed_rate: 200, cut_length: 100, num_passes: 3 });
    expect(b.cutting_feedrate).toBe(200);        // feed_rate synonym
    expect(b.cutting_distance).toBe(300);         // cut_length * num_passes
    // rapid_distance is OPTIONAL in the calc schema (optPosNum rejects 0); the bridge must NOT inject 0
    // here — the engine's safe-default handles the undefined case (see estimateCycleTime tests below).
    expect(b.rapid_distance).toBeUndefined();
  });

  it("sums approach + overtravel into rapid_distance when supplied", () => {
    const b = bridgeCycleTimeParams({ feed_rate: 200, cut_length: 100, num_passes: 3, approach_distance: 5, overtravel: 2 });
    expect(b.rapid_distance).toBe(7);
  });

  it("never overwrites an explicit rapid_distance the caller already supplied", () => {
    const b = bridgeCycleTimeParams({ feed_rate: 200, cut_length: 100, rapid_distance: 42 });
    expect(b.rapid_distance).toBe(42);
  });
});

describe("estimateCycleTime — omitted rapid_distance yields a real total_time, never NaN/null (U-BRAVO-SFC-CYCLETIME-RAPID-GUARD)", () => {
  it("REGRESSION: rapid_distance undefined -> total_time === cutting_time (was NaN -> JSON null)", () => {
    // Verified live on :3100: {feed_rate,cut_length,num_passes} (no approach/overtravel) returned
    // total_time:null because estimateCycleTime computed undefined/rapid_rate = NaN. The engine now
    // treats a missing rapid_distance as zero non-cutting traverse.
    const r = estimateCycleTime(300, 200, undefined);
    expect(Number.isFinite(r.total_time)).toBe(true);
    expect(Number.isFinite(r.rapid_time)).toBe(true);
    expect(Number.isFinite(r.rapid_distance)).toBe(true);
    expect(r.rapid_time).toBe(0);                 // no rapids -> zero rapid time
    expect(r.total_time).toBe(r.cutting_time);     // total collapses to cutting time
    expect(r.cutting_time).toBe(1.5);              // 300mm / 200mm/min
  });

  it("non-finite rapid_distance (NaN) is also coerced to zero, not propagated", () => {
    const r = estimateCycleTime(300, 200, Number.NaN);
    expect(Number.isFinite(r.total_time)).toBe(true);
    expect(r.rapid_distance).toBe(0);
  });

  it("a real rapid_distance still contributes rapid time (unchanged behavior)", () => {
    // rapid_rate default = CAM_CONSTANTS.RAPID_RATE_XY; with a large rapid_distance the rapid_time > 0.
    const r = estimateCycleTime(300, 200, 30000);
    expect(r.rapid_distance).toBe(30000);
    expect(r.rapid_time).toBeGreaterThan(0);
    expect(r.total_time).toBeGreaterThan(r.cutting_time);
  });
});


