import { describe, it, expect } from "vitest";
import {
  millAnomalyDetectionEngine as eng,
  type MillDataPoint,
  type MillProgram,
  type MillAnomalyResult,
} from "../engines/MillAnomalyDetectionEngine.js";

function nominal(o: Partial<MillDataPoint> = {}): MillDataPoint {
  return {
    Vc_m_min: 200,
    fz_mm_tooth: 0.10,
    ap_mm: 2,
    ae_mm: 4,
    tool_diameter_mm: 10,
    flute_count: 4,
    material_iso: "P",
    operation: "end_milling_rough",
    spindle_load_pct: 50,
    feed_override_pct: 100,
    ...o,
  };
}

function findOne(results: MillAnomalyResult[], type: string): MillAnomalyResult {
  const r = results.find(a => a.anomaly_type === type);
  if (!r) throw new Error(`Expected anomaly_type=${type}, got types=[${results.map(a => a.anomaly_type).join(",")}]`);
  return r;
}

function hasType(results: MillAnomalyResult[], type: string): boolean {
  return results.some(a => a.anomaly_type === type);
}

describe("MillAnomalyDetectionEngine", () => {
  it("getStats returns full canonical 10-detector / 6-iso / 9-op taxonomy", () => {
    const s = eng.getStats();
    expect(s.detectors).toEqual([
      "spindle_load_spike",
      "chip_thinning_violation",
      "adaptive_timing_mismatch",
      "surface_finish_drift",
      "flute_wear_delta",
      "engagement_vs_deflection",
      "slot_transition_spike",
      "feed_per_tooth_outlier",
      "vibration_outlier",
      "missing_safety_code",
    ]);
    expect(s.iso_groups_supported).toEqual(["P", "M", "K", "N", "S", "H"]);
    expect(s.operation_types_supported).toEqual([
      "face_milling", "end_milling_rough", "end_milling_finish", "slot_milling",
      "contour_milling", "pocket_milling", "thread_milling", "drilling", "boring",
    ]);
  });

  it("nominal P-group cut returns no anomalies", () => {
    const r = eng.scanPoint(nominal());
    expect(r).toEqual([]);
  });

  it("spindle load 95% → spindle_load_spike warning, score=0.5, description cites 95.0%", () => {
    const r = eng.scanPoint(nominal({ spindle_load_pct: 95 }));
    const spike = findOne(r, "spindle_load_spike");
    expect(spike.severity).toBe("warning");
    expect(spike.anomaly_score).toBeCloseTo(0.5, 2);
    expect(spike.description).toMatch(/95\.0.*sustained spike/);
    expect(spike.confidence).toBe(0.9);
  });

  it("spindle load 110% → CRITICAL, score=1 (clamped)", () => {
    const r = eng.scanPoint(nominal({ spindle_load_pct: 110 }));
    const spike = findOne(r, "spindle_load_spike");
    expect(spike.severity).toBe("critical");
    expect(spike.anomaly_score).toBe(1);
  });

  it("ae/D=10% → chip_thinning_violation, recommends prism_calc:chip_thinning_compensation", () => {
    const r = eng.scanPoint(nominal({ ae_mm: 1, fz_mm_tooth: 0.05 }));
    const thinning = findOne(r, "chip_thinning_violation");
    expect(thinning.severity).toBe("warning");
    expect(thinning.recommendation).toBe(
      "Boost fz to compensate for chip thinning. See prism_calc:chip_thinning_compensation."
    );
    expect(thinning.affected_parameters).toEqual(["ae_mm", "fz_mm_tooth"]);
    expect(thinning.description).toMatch(/10\.0% requires fz boost/);
  });

  it("ae/D=50% → no chip_thinning_violation (no boost needed)", () => {
    const r = eng.scanPoint(nominal({ ae_mm: 5, fz_mm_tooth: 0.10 }));
    expect(hasType(r, "chip_thinning_violation")).toBe(false);
  });

  it("L/D=5 + ae/D=70% → engagement_vs_deflection CRITICAL, recommendation cites deflection+chatter", () => {
    const r = eng.scanPoint(nominal({ tool_overhang_mm: 50, ae_mm: 7 }));
    const def = findOne(r, "engagement_vs_deflection");
    expect(def.severity).toBe("critical");
    expect(def.confidence).toBe(0.95);
    expect(def.recommendation).toBe(
      "Reduce engagement to <0.3D, or use shorter tool. See prism_mill:mill_deflection_check + prism_mill:mill_chatter_predict."
    );
    expect(def.description).toMatch(/L\/D=5\.00.*engagement 70%.*chatter inevitable/);
  });

  it("L/D=3 (below threshold) + high engagement → no engagement_vs_deflection finding", () => {
    const r = eng.scanPoint(nominal({ tool_overhang_mm: 30, ae_mm: 7 }));
    expect(hasType(r, "engagement_vs_deflection")).toBe(false);
  });

  it("feed override 60% + load 80% → adaptive_timing_mismatch warning, score=0.333", () => {
    const r = eng.scanPoint(nominal({ spindle_load_pct: 80, feed_override_pct: 60 }));
    const mis = findOne(r, "adaptive_timing_mismatch");
    expect(mis.severity).toBe("warning");
    expect(mis.anomaly_score).toBeCloseTo(0.3333, 3);
    expect(mis.description).toMatch(/60%.*compensating/);
    expect(mis.recommendation).toMatch(/mill_adaptive_feed/);
  });

  it("feed override 100% + load 80% → no adaptive_timing_mismatch", () => {
    const r = eng.scanPoint(nominal({ spindle_load_pct: 80, feed_override_pct: 100 }));
    expect(hasType(r, "adaptive_timing_mismatch")).toBe(false);
  });

  it("flute loads [30,30,30,60] → flute_wear_delta CRITICAL (delta_frac=0.8 > 0.5 threshold)", () => {
    const r = eng.scanPoint(nominal({ flute_count: 4, per_flute_load_pct: [30, 30, 30, 60] }));
    const wear = findOne(r, "flute_wear_delta");
    expect(wear.severity).toBe("critical");
    expect(wear.affected_parameters).toEqual(["per_flute_load_pct"]);
    expect(wear.description).toMatch(/avg=37\.5/);
  });

  it("flute loads [20,20,20,80] → flute_wear_delta CRITICAL with score > 0.5", () => {
    const r = eng.scanPoint(nominal({ flute_count: 4, per_flute_load_pct: [20, 20, 20, 80] }));
    const wear = findOne(r, "flute_wear_delta");
    expect(wear.severity).toBe("critical");
    expect(wear.anomaly_score).toBeGreaterThan(0.5);
    expect(wear.recommendation).toMatch(/mill_tool_assembly|tool_runout_calc/);
  });

  it("flute loads [40,40,40,40] → equal loads, no flute_wear_delta", () => {
    const r = eng.scanPoint(nominal({ flute_count: 4, per_flute_load_pct: [40, 40, 40, 40] }));
    expect(hasType(r, "flute_wear_delta")).toBe(false);
  });

  it("P-group fz=1.0 (above max 0.30) → feed_per_tooth_outlier, score=1 clamped, critical", () => {
    const r = eng.scanPoint(nominal({ material_iso: "P", fz_mm_tooth: 1.0 }));
    const fz = findOne(r, "feed_per_tooth_outlier");
    expect(fz.severity).toBe("critical");
    expect(fz.anomaly_score).toBe(1);
    expect(fz.description).toMatch(/fz=1\.000.*outside typical range 0\.03-0\.3/);
  });

  it("P-group fz=0.10 → no feed_per_tooth_outlier", () => {
    const r = eng.scanPoint(nominal({ material_iso: "P", fz_mm_tooth: 0.10 }));
    expect(hasType(r, "feed_per_tooth_outlier")).toBe(false);
  });

  it("series of 10 with 8g vibration at idx=5 → vibration_outlier at idx=5", () => {
    const series: MillDataPoint[] = Array.from({ length: 10 }, (_, i) =>
      nominal({ vibration_g: i === 5 ? 8.0 : 1.5 })
    );
    const r = eng.scanSeries(series);
    const vib = findOne(r.anomalies, "vibration_outlier");
    expect(vib.data_point_index).toBe(5);
    expect(vib.severity).toBe("critical");
    expect(vib.recommendation).toMatch(/chatter_stability_lobes|mill_chatter_predict/);
  });

  it("6 passes of surface_ra rising 0.5μm each → surface_finish_drift detected w/ slope cite", () => {
    const series: MillDataPoint[] = Array.from({ length: 6 }, (_, i) =>
      nominal({ surface_ra_um: 1.0 + i * 0.5 })
    );
    const r = eng.scanSeries(series);
    const drift = findOne(r.anomalies, "surface_finish_drift");
    expect(drift.severity).toBe("warning");
    expect(drift.affected_parameters).toEqual(["surface_ra_um"]);
    expect(drift.description).toMatch(/0\.500 μm\/pass.*6 passes/);
    expect(drift.recommendation).toMatch(/mill_first_piece_approval/);
  });

  it("6 passes of stable surface_ra=1.6μm → no surface_finish_drift", () => {
    const series: MillDataPoint[] = Array.from({ length: 6 }, () => nominal({ surface_ra_um: 1.6 }));
    const r = eng.scanSeries(series);
    expect(hasType(r.anomalies, "surface_finish_drift")).toBe(false);
  });

  it("program with S2000 + M03 + no M30 → critical missing_safety_code with M30 in description", () => {
    const program: MillProgram = {
      program_id: "test-1",
      blocks: [
        { line_number: 1, raw_text: "G54", g_codes: ["G54"], m_codes: [] },
        { line_number: 2, raw_text: "S2000 M03", g_codes: [], m_codes: ["M03"], s: 2000 },
      ],
    };
    const r = eng.scanProgram(program);
    const miss = findOne(r.anomalies, "missing_safety_code");
    expect(miss.severity).toBe("critical");
    expect(miss.description).toMatch(/Program lacks end code \(M30\/M02\/M99\)/);
    expect(miss.recommendation).toMatch(/post_process/);
  });

  it("program with M30 + M03 → 0 anomalies, status=normal, score=0", () => {
    const program: MillProgram = {
      program_id: "test-2",
      blocks: [
        { line_number: 1, raw_text: "G54", g_codes: ["G54"], m_codes: [] },
        { line_number: 2, raw_text: "S2000 M03", g_codes: [], m_codes: ["M03"], s: 2000 },
        { line_number: 3, raw_text: "M30", g_codes: [], m_codes: ["M30"] },
      ],
    };
    const r = eng.scanProgram(program);
    expect(r.anomalies).toEqual([]);
    expect(r.overall_status).toBe("normal");
    expect(r.overall_score).toBe(0);
  });

  it("program with S without M03 → critical 'S commanded without M03/M04'", () => {
    const program: MillProgram = {
      program_id: "test-3",
      blocks: [
        { line_number: 1, raw_text: "G54", g_codes: ["G54"], m_codes: [] },
        { line_number: 2, raw_text: "S2000", g_codes: [], m_codes: [], s: 2000 },
        { line_number: 3, raw_text: "M30", g_codes: [], m_codes: ["M30"] },
      ],
    };
    const r = eng.scanProgram(program);
    const noSpindle = r.anomalies.find(a => /S commanded without M03/.test(a.description));
    if (!noSpindle) throw new Error("Expected S-without-M03 anomaly");
    expect(noSpindle.severity).toBe("critical");
    expect(noSpindle.recommendation).toMatch(/gcode_safety_analyze/);
    expect(r.overall_status).toBe("alarm");
  });

  it("overall_status state machine: nominal=normal, load95=warning, load110=alarm", () => {
    const nomR = eng.scanSeries([nominal()]);
    expect(nomR.overall_status).toBe("normal");
    expect(nomR.overall_score).toBe(0);

    const warnR = eng.scanSeries([nominal({ spindle_load_pct: 95 })]);
    expect(warnR.overall_status).toBe("warning");
    expect(warnR.overall_score).toBeGreaterThan(0);
    expect(warnR.overall_score).toBeLessThanOrEqual(0.8);

    const alarmR = eng.scanSeries([nominal({ spindle_load_pct: 110 })]);
    expect(alarmR.overall_status).toBe("alarm");
    expect(alarmR.overall_score).toBeGreaterThan(0.8);
  });

  it("scanSeries throws on non-array input", () => {
    expect(() => eng.scanSeries(null as never)).toThrow(/array/);
  });

  it("scanProgram throws on missing blocks", () => {
    expect(() => eng.scanProgram({} as never)).toThrow(/blocks required/);
  });

  it("recommendations array dedupes — 5 identical spikes generate 1 unique recommendation", () => {
    const series: MillDataPoint[] = Array.from({ length: 5 }, () => nominal({ spindle_load_pct: 95 }));
    const r = eng.scanSeries(series);
    expect(r.anomalies.length).toBe(5);
    expect(r.recommendations.length).toBe(1);
    expect(r.recommendations[0]).toMatch(/mill_deflection_check/);
  });
});
