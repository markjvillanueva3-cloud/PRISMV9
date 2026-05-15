/**
 * Wire test: prism_calc × SpindleHarmonicsQualityEngine
 *
 * Pre-this-iter state: action enum + result-slimmer present (calcExtractKeyValues
 * cases at lines 214/216/218; enum line 592), but NO main switch case calling
 * `spindleHarmonicsQualityEngine.analyze / findOptimalRpm / qualityMap` —
 * so the 3 actions hit `default` and returned "Unknown action" errors.
 *
 * Verifies the half-wire completion (OBSIDIAN-PRISM-OS-MS0/
 * U-ORPHAN-RESCUE-SPINDLE-HARMONICS-QUALITY, iter 13).
 *
 * NOTE ON RESPONSE SHAPE: calcDispatcher only applies the calcExtractKeyValues
 * slimmer when context pressure > 50% OR response_level is requested. In a
 * normal test (0% pressure, no response_level) the dispatcher returns the RAW
 * engine result via slimResponse(result). These tests therefore assert against
 * the RAW HarmonicAnalysisResult / OptimalRpmResult / QualityMapResult shapes.
 *
 * Engine references: Altintas (2012), Schmitz & Smith (2009), Quintana &
 * Ciurana (2011). Physics: TPF = RPM × Z / 60, dynamic magnification
 * factor M = 1 / sqrt((1-r²)² + (2ζr)²), worst harmonic drives quality.
 */
import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

interface ToolResult { content: Array<{ type: "text"; text: string }> }

function buildHandler() {
  let handler: ((args: any) => Promise<ToolResult>) | undefined;
  const server: any = {
    tool: (_name: string, _desc: string, _schema: any, h: any) => { handler = h; },
  };
  registerCalcDispatcher(server);
  if (!handler) throw new Error("calcDispatcher did not register a handler");
  return handler;
}

async function call(handler: ReturnType<typeof buildHandler>, action: string, params: any = {}) {
  const r: any = await handler({ action, params });
  let parsed: any;
  if (r && Array.isArray(r.content) && typeof r.content[0]?.text === "string") {
    parsed = JSON.parse(r.content[0].text);
  } else if (r && typeof r === "object") {
    parsed = r;
  } else {
    throw new Error(`unexpected response shape: ${JSON.stringify(r)}`);
  }
  const ok = parsed.ok !== false && parsed.success !== false && !parsed.error;
  return { ok, raw: parsed };
}

const SEVERITY_VALUES = ["negligible", "minor", "moderate", "severe", "critical"] as const;

describe("calcDispatcher × SpindleHarmonicsQualityEngine wire (OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SPINDLE-HARMONICS-QUALITY)", () => {
  const handler = buildHandler();

  // ─── spindle_harmonic_analysis (raw HarmonicAnalysisResult) ──────────

  it("spindle_harmonic_analysis returns a full HarmonicAnalysisResult", async () => {
    // TPF = 8000 × 4 / 60 = 533.3 Hz. Mode at 800 Hz: 1st order ratio 0.667
    // (amp ≈ 1.8); 2nd order 1066 Hz: ratio 1.33 (amp ≈ 1.27). Worst is 1st.
    const r = await call(handler, "spindle_harmonic_analysis", {
      spindle_rpm: 8000,
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [800] },
    });
    expect(r.ok, JSON.stringify(r.raw)).toBe(true);
    // TPF echo: 8000 * 4 / 60 = 533.33, engine rounds to 1 decimal → 533.3
    expect(r.raw.tooth_passing_freq_Hz).toBe(533.3);
    expect(r.raw.spindle_rpm).toBe(8000);
    // 5 excitations by default (max_harmonic_order default = 5)
    expect(Array.isArray(r.raw.excitations)).toBe(true);
    expect(r.raw.excitations.length).toBe(5);
    // quality_score in [0,100]
    expect(typeof r.raw.quality_score).toBe("number");
    expect(r.raw.quality_score).toBeGreaterThanOrEqual(0);
    expect(r.raw.quality_score).toBeLessThanOrEqual(100);
    // surface_penalty_factor: 1.0 (no penalty) up to 3.0 cap
    expect(r.raw.surface_penalty_factor).toBeGreaterThanOrEqual(1.0);
    expect(r.raw.surface_penalty_factor).toBeLessThanOrEqual(3.0);
    // worst_excitation has the known HarmonicExcitation fields
    expect(typeof r.raw.worst_excitation.harmonic_order).toBe("number");
    expect(r.raw.worst_excitation.harmonic_order).toBeGreaterThanOrEqual(1);
    expect(r.raw.worst_excitation.nearest_mode_Hz).toBe(800);
    expect(SEVERITY_VALUES).toContain(r.raw.worst_excitation.severity);
    // recommendations non-empty
    expect(Array.isArray(r.raw.recommendations)).toBe(true);
    expect(r.raw.recommendations.length).toBeGreaterThan(0);
    expect(typeof r.raw.recommendations[0]).toBe("string");
    expect(r.raw.recommendations[0].length).toBeGreaterThan(10);
  });

  it("spindle_harmonic_analysis detects critical resonance when TPF hits a mode dead-on", async () => {
    // TPF = 12000 × 4 / 60 = 800 Hz → ratio 1.0 → resonance. With ζ=0.03 the
    // SDOF amplification M = 1/(2ζ) = 16.67 → severity 'critical' (engine
    // threshold: amp > 10).
    const r = await call(handler, "spindle_harmonic_analysis", {
      spindle_rpm: 12000,
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [800], damping_ratios: [0.03] },
    });
    expect(r.ok).toBe(true);
    expect(r.raw.worst_excitation.severity).toBe("critical");
    // Hand calc: M = 1/(2 × 0.03) = 16.67 (engine rounds to 2 dp)
    expect(r.raw.worst_excitation.amplification_factor).toBeGreaterThan(15);
    expect(r.raw.worst_excitation.amplification_factor).toBeLessThan(20);
    // Surface penalty: 1 + 0.15 × (16.67 - 1.5) = 3.28 → capped at 3.0
    expect(r.raw.surface_penalty_factor).toBe(3.0);
    // Quality score: 100 - (16.67 - 1) × 15 = -135 → clamped to 0
    expect(r.raw.quality_score).toBe(0);
  });

  it("spindle_harmonic_analysis with anti-resonance RPM scores high quality", async () => {
    // RPM 7500: TPF=500 Hz. Harmonics: 500, 1000, 1500, 2000, 2500.
    // Mode 800 Hz → order 1 ratio 0.625, order 2 ratio 1.25. None near 1.0.
    const r = await call(handler, "spindle_harmonic_analysis", {
      spindle_rpm: 7500,
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [800] },
    });
    expect(r.ok).toBe(true);
    expect(r.raw.quality_score).toBeGreaterThan(50);
    expect(r.raw.surface_penalty_factor).toBeLessThan(1.5);
  });

  it("spindle_harmonic_analysis respects max_harmonic_order parameter", async () => {
    // max_harmonic_order=3 → exactly 3 excitations.
    const r = await call(handler, "spindle_harmonic_analysis", {
      spindle_rpm: 6000,
      num_flutes: 3,
      machine_modes: { natural_frequencies_Hz: [400, 1200] },
      max_harmonic_order: 3,
    });
    expect(r.ok).toBe(true);
    expect(r.raw.excitations.length).toBe(3);
    expect(r.raw.worst_excitation.harmonic_order).toBeGreaterThanOrEqual(1);
    expect(r.raw.worst_excitation.harmonic_order).toBeLessThanOrEqual(3);
  });

  // ─── spindle_optimal_rpm (raw OptimalRpmResult) ──────────────────────

  it("spindle_optimal_rpm sweeps a range and returns the best RPM", async () => {
    const r = await call(handler, "spindle_optimal_rpm", {
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [800] },
      rpm_min: 4000,
      rpm_max: 10000,
      rpm_step: 250,
    });
    expect(r.ok, JSON.stringify(r.raw)).toBe(true);
    expect(r.raw.optimal_rpm).toBeGreaterThanOrEqual(4000);
    expect(r.raw.optimal_rpm).toBeLessThanOrEqual(10000);
    expect(r.raw.quality_score).toBeGreaterThanOrEqual(0);
    expect(r.raw.quality_score).toBeLessThanOrEqual(100);
    // rpm_range_tested echoes the input bounds
    expect(r.raw.rpm_range_tested).toEqual([4000, 10000]);
    expect(r.raw.rpm_step).toBe(250);
    // top_5_rpms has 1..5 entries
    expect(Array.isArray(r.raw.top_5_rpms)).toBe(true);
    expect(r.raw.top_5_rpms.length).toBeGreaterThan(0);
    expect(r.raw.top_5_rpms.length).toBeLessThanOrEqual(5);
    // optimal_rpm = the best entry's rpm
    expect(r.raw.optimal_rpm).toBe(r.raw.top_5_rpms[0].rpm);
    expect(Array.isArray(r.raw.avoid_rpms)).toBe(true);
  });

  it("spindle_optimal_rpm: top_5_rpms entries are sorted descending by score", async () => {
    const r = await call(handler, "spindle_optimal_rpm", {
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [600, 1500] },
      rpm_min: 3000,
      rpm_max: 9000,
      rpm_step: 200,
    });
    expect(r.ok).toBe(true);
    for (let i = 1; i < r.raw.top_5_rpms.length; i++) {
      expect(r.raw.top_5_rpms[i - 1].score).toBeGreaterThanOrEqual(r.raw.top_5_rpms[i].score);
    }
  });

  it("spindle_optimal_rpm avoid_rpms flags RPMs with score < 30 and a non-empty reason", async () => {
    // Range containing resonance: RPM 12000 hits TPF=800 = mode 800 dead-on.
    const r = await call(handler, "spindle_optimal_rpm", {
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [800], damping_ratios: [0.02] },
      rpm_min: 11800,
      rpm_max: 12200,
      rpm_step: 50,
    });
    expect(r.ok).toBe(true);
    expect(r.raw.avoid_rpms.length).toBeGreaterThanOrEqual(1);
    for (const a of r.raw.avoid_rpms) {
      expect(a.score).toBeLessThan(30);
      expect(typeof a.reason).toBe("string");
      // Reason template mentions ×TPF and the offending mode Hz
      expect(a.reason).toMatch(/TPF/);
      expect(a.reason).toMatch(/Hz/);
    }
  });

  it("spindle_optimal_rpm honors default rpm_step (auto-derived from range)", async () => {
    // engine: step = max(10, round((max-min)/200)). For 5000-9000 → step 20.
    const r = await call(handler, "spindle_optimal_rpm", {
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [800] },
      rpm_min: 5000,
      rpm_max: 9000,
      // rpm_step omitted
    });
    expect(r.ok).toBe(true);
    expect(r.raw.rpm_step).toBe(20);
    expect(r.raw.optimal_rpm).toBeGreaterThanOrEqual(5000);
    expect(r.raw.optimal_rpm).toBeLessThanOrEqual(9000);
  });

  // ─── spindle_quality_map (raw QualityMapResult) ──────────────────────

  it("spindle_quality_map returns a full QualityMapResult with points + sweet_spots", async () => {
    const r = await call(handler, "spindle_quality_map", {
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [800] },
      rpm_min: 4000,
      rpm_max: 10000,
      rpm_step: 500,
    });
    expect(r.ok, JSON.stringify(r.raw)).toBe(true);
    expect(r.raw.rpm_min).toBe(4000);
    expect(r.raw.rpm_max).toBe(10000);
    expect(r.raw.rpm_step).toBe(500);
    expect(Array.isArray(r.raw.points)).toBe(true);
    // (10000-4000)/500 + 1 = 13 RPM points
    expect(r.raw.points.length).toBe(13);
    // Each point has the QualityMapPoint shape
    const p0 = r.raw.points[0];
    expect(p0.rpm).toBe(4000);
    expect(typeof p0.quality_score).toBe("number");
    expect(typeof p0.surface_penalty_factor).toBe("number");
    expect(typeof p0.worst_harmonic).toBe("number");
    expect(typeof p0.worst_mode_Hz).toBe("number");
    expect(Array.isArray(r.raw.sweet_spots)).toBe(true);
  });

  it("spindle_quality_map sweet_spots are contiguous regions with avg_score ≥ 70", async () => {
    const r = await call(handler, "spindle_quality_map", {
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [800] },
      rpm_min: 3000,
      rpm_max: 11000,
      rpm_step: 200,
    });
    expect(r.ok).toBe(true);
    expect(r.raw.sweet_spots.length).toBeGreaterThan(0);
    for (const s of r.raw.sweet_spots) {
      expect(s.rpm_end).toBeGreaterThanOrEqual(s.rpm_start);
      expect(s.avg_score).toBeGreaterThanOrEqual(70);
      expect(s.avg_score).toBeLessThanOrEqual(100);
    }
  });

  it("spindle_quality_map handles narrow ranges (3 points: start/mid/end)", async () => {
    const r = await call(handler, "spindle_quality_map", {
      num_flutes: 4,
      machine_modes: { natural_frequencies_Hz: [800] },
      rpm_min: 6000,
      rpm_max: 6100,
      rpm_step: 50,
    });
    expect(r.ok).toBe(true);
    expect(r.raw.points.length).toBe(3);
  });

  // ─── parameter defaults exposed by the wire ──────────────────────────

  it("dispatcher applies default num_flutes=4 when omitted", async () => {
    // With default flutes=4, TPF at 8000 RPM = 533.3 Hz.
    const r = await call(handler, "spindle_harmonic_analysis", {
      spindle_rpm: 8000,
      machine_modes: { natural_frequencies_Hz: [800] },
      // num_flutes omitted
    });
    expect(r.ok).toBe(true);
    expect(r.raw.tooth_passing_freq_Hz).toBe(533.3);
  });

  it("dispatcher applies default machine_modes={[800]} when omitted", async () => {
    const r = await call(handler, "spindle_optimal_rpm", {
      // num_flutes + machine_modes omitted → defaults applied
      rpm_min: 6000,
      rpm_max: 8000,
      rpm_step: 200,
    });
    expect(r.ok).toBe(true);
    expect(r.raw.optimal_rpm).toBeGreaterThanOrEqual(6000);
    expect(r.raw.optimal_rpm).toBeLessThanOrEqual(8000);
    // top_5 entries reference the default mode — every analyzed RPM used 800 Hz.
    expect(r.raw.top_5_rpms.length).toBeGreaterThan(0);
  });

  // ─── enum membership (no Unknown action errors after the wire fix) ───

  it("dispatcher routes all 3 spindle_* actions through the engine (no 'Unknown action' branch)", async () => {
    const probes: Array<[string, (raw: any) => boolean]> = [
      ["spindle_harmonic_analysis", (raw) => typeof raw.quality_score === "number" && Array.isArray(raw.excitations)],
      ["spindle_optimal_rpm", (raw) => typeof raw.optimal_rpm === "number" && Array.isArray(raw.top_5_rpms)],
      ["spindle_quality_map", (raw) => Array.isArray(raw.points) && Array.isArray(raw.sweet_spots)],
    ];
    for (const [action, shapeCheck] of probes) {
      const r = await call(handler, action, {
        spindle_rpm: 6000,
        num_flutes: 4,
        machine_modes: { natural_frequencies_Hz: [800] },
        rpm_min: 4000,
        rpm_max: 10000,
        rpm_step: 500,
      });
      const msg = String(r.raw.error || "");
      expect(msg, `${action} hit default: ${msg}`).not.toMatch(/Unknown.*action/i);
      expect(shapeCheck(r.raw), `${action} returned wrong shape: ${JSON.stringify(r.raw).slice(0, 200)}`).toBe(true);
    }
  });
});
