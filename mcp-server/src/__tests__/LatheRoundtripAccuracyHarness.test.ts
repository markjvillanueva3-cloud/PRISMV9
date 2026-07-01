/**
 * LatheRoundtripAccuracyHarness.test.ts — slot:whiskey (Lathe Wizard) [Rung B]
 * ===========================================================================
 * Drives the print->program ROUNDTRIP accuracy harness through the LIVE
 * turningPrintToProgramEngine and asserts INTENT, not stubbed values (R9):
 *
 *   - the generator produces a program for every grid cell (no throws)
 *   - PRISM ALWAYS emits the G50 max-RPM cap (the #1 safety best-practice the
 *     legacy JM corpus omits in 56% of programs) — a regression that dropped it
 *     would fail this test, not slip through
 *   - envelope agreement vs the empirical JM cloud is actually computed
 *   - the dashboard artifact is written and re-parses
 *
 * Runs under vitest because vite-node provides __dirname to the engine's
 * transitive catalog loaders (tsx ESM does not — see harness header).
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { runRoundtripHarness } from "../../scripts/lathe-roundtrip-accuracy-harness.js";
import {
  turningPrintToProgramEngine,
  type TurningInput,
  type TurningFeature,
} from "../engines/TurningPrintToProgramEngine.js";

// Minimal live-tooling input for the direct-engine failure/adversarial cases (U-W3).
// Routed through calculate("turning_print_to_program", …) — the EXACT path the
// prism_turning_program dispatcher invokes (turningProgramDispatcher.ts:165) — so
// these assertions cover the dispatcher contract, not just the engine singleton.
function liveInput(features: TurningFeature[]): TurningInput {
  return {
    part_number: "U-W3-LIVE",
    material: { material_name: "1018 Steel", iso_group: "P" },
    bar_stock_od_mm: 31.75,
    part_length_mm: 60,
    max_spindle_rpm: 4000,
    controller: "okuma",
    machine_brand: "Okuma",
    features,
    optimization_target: "balanced",
  };
}
const runLive = (features: TurningFeature[]) =>
  turningPrintToProgramEngine.calculate("turning_print_to_program", liveInput(features) as unknown as Record<string, unknown>);

describe("Lathe print->program roundtrip accuracy (Rung B)", () => {
  const { report, summary } = runRoundtripHarness({ quiet: true });

  it("generates a program for every grid cell with no engine throws", () => {
    // 10 materials x 6 feature archetypes
    expect(summary.programs_generated).toBe(60);
    expect(summary.generation_errors).toBe(0);
    expect(report.program_errors).toHaveLength(0);
  });

  it("emits the G50 max-RPM cap on 100% of programs (legacy corpus omits it in 56%)", () => {
    expect(report.safety_correctness.by_code_pct.g50_cap).toBe(100);
  });

  it("emits a program-end (M30/M02) on 100% of programs (legacy corpus omits it in 92%)", () => {
    // honest regression guard: if PRISM repeats the corpus's #1 mistake this fails
    expect(report.safety_correctness.by_code_pct.program_end).toBe(100);
  });

  it("computes real envelope agreement vs the empirical JM cloud", () => {
    const e = report.envelope_agreement;
    expect(e.feed_checked).toBeGreaterThan(0);
    expect(e.sfm_checked).toBeGreaterThan(0);
    expect(typeof e.overall_feed_pct).toBe("number");
    expect(e.overall_feed_pct as number).toBeGreaterThanOrEqual(0);
    expect(e.overall_feed_pct as number).toBeLessThanOrEqual(100);
    // every generated op classified into a real empirical bucket
    expect(Object.keys(e.per_bucket).length).toBeGreaterThan(0);
  });

  it("reports a non-trivial generator confidence", () => {
    expect(summary.mean_confidence).toBeGreaterThan(0);
  });

  it("writes the dashboard artifact and it re-parses", () => {
    expect(existsSync(summary.json)).toBe(true);
    const parsed = JSON.parse(readFileSync(summary.json, "utf8"));
    expect(parsed.rung).toMatch(/param-envelope agreement/);
    expect(parsed.schemaVersion).toBe("1.0.0");
  });
});

describe("Lathe live-tooling / C-axis coverage (Rung B, U-W3 / GAP-3)", () => {
  const { report, summary } = runRoundtripHarness({ quiet: true });
  const lt = report.live_tooling_coverage!;

  it("does NOT pollute the band-scored turning grid (turning grid stays 10x6=60)", () => {
    // The live-tooling loop is separate; live ops have no empirical band, so folding
    // them in would corrupt the headline %. The turning grid count must stay 60.
    expect(summary.programs_generated).toBe(60);
    expect(lt.programs_generated).toBe(21);
    expect(report.envelope_agreement.feed_checked).toBeGreaterThan(0);
  });

  it("generates every live-tooling archetype with no engine throws", () => {
    // 7 archetypes x 3 ISO-group materials = 21 live programs
    expect(summary.live_programs).toBe(21);
    expect(summary.live_gen_errors).toBe(0);
    expect(lt.archetypes_run).toBe(7);
  });

  it("exercises well above the >=3 live-op floor (loss fn G3/GAP-3)", () => {
    expect(summary.live_ops_total).toBeGreaterThanOrEqual(3);
    // cross_tap expands to a drill + tap, so the live-op count exceeds 21
    expect(summary.live_ops_total).toBeGreaterThanOrEqual(21);
  });

  it("emits REAL live-tool toolpath for >=3 feature types (M133 + C-axis index + M05)", () => {
    const real = lt.real_toolpath_archetypes;
    expect(real.length).toBeGreaterThanOrEqual(3);
    expect(real).toEqual(expect.arrayContaining(["live_whistle_notch", "live_od_pocket", "live_cross_drill"]));
    for (const label of real) {
      const v = lt.by_archetype[label];
      expect(v.emits_real_toolpath).toBe(true);
      expect(v.all_main_spindle_stop).toBe(true); // M05 before every live op
      expect(v.all_caxis_index).toBe(true);       // C-axis indexed before cutting
    }
  });

  it("HONESTLY flags the stub-only archetypes (no false 'working' claim — R12)", () => {
    // keyway / flat_mill / hex_mill currently emit a CAM-recommended placeholder,
    // not real toolpath. The harness must surface that, not bury it.
    expect(lt.stub_only_archetypes).toEqual(
      expect.arrayContaining(["live_keyway", "live_flat_mill", "live_hex_mill"]));
    for (const label of lt.stub_only_archetypes) {
      expect(lt.by_archetype[label].stub_only).toBe(true);
      expect(lt.by_archetype[label].emits_real_toolpath).toBe(false);
    }
  });

  it("flags live ops as having NO empirical JM band (honest scope)", () => {
    for (const v of Object.values(lt.by_archetype)) {
      expect(v.flagged_no_empirical_band).toBe(true);
    }
  });

  // ── Failure modes (>=3): missing/zero live params must still generate, not crash ──
  it("FAILURE: missing live_tool_diameter falls back to a default and still emits a live op", () => {
    const r = runLive([
      { id: "F1", type: "od_straight", od_mm: 19.05, length_mm: 50 },
      { id: "F2", type: "whistle_notch", od_mm: 19.05, length_mm: 12, notch_depth_mm: 3, position_z_mm: 20 },
    ]);
    expect(r.success).not.toBe(false);
    expect(r.operations.some((o) => o.operation_type === "live_whistle_notch")).toBe(true);
    expect(/\bM133\b/.test(r.program_text)).toBe(true);
  });

  it("FAILURE: zero cross-hole diameter falls back to a default (0 is falsy, must not divide-by-zero)", () => {
    const r = runLive([
      { id: "F1", type: "od_straight", od_mm: 25.4, length_mm: 50 },
      { id: "F2", type: "cross_drill", od_mm: 25.4, length_mm: 8, cross_hole_diameter_mm: 0, position_z_mm: 20 },
    ]);
    expect(r.success).not.toBe(false);
    expect(/NaN/.test(r.program_text)).toBe(false);
    expect(r.operations.some((o) => o.operation_type === "live_cross_drill")).toBe(true);
  });

  it("FAILURE: missing position_z on an OD pocket falls back and bounds the pass loop", () => {
    const r = runLive([
      { id: "F1", type: "od_straight", od_mm: 31.75, length_mm: 60 },
      { id: "F2", type: "od_pocket_mill", od_mm: 31.75, length_mm: 20, pocket_width_mm: 20, pocket_depth_mm: 3 },
    ]);
    expect(r.success).not.toBe(false);
    expect(r.operations.some((o) => o.operation_type === "live_od_pocket")).toBe(true);
  });

  // ── Adversarial (>=2): non-finite live params must be sanitized, never leak to G-code ──
  it("ADVERSARIAL: NaN C-axis position is sanitized — no 'CNaN' in emitted G-code", () => {
    const r = runLive([
      { id: "F1", type: "od_straight", od_mm: 19.05, length_mm: 50 },
      { id: "F2", type: "whistle_notch", od_mm: 19.05, length_mm: 12, notch_depth_mm: 3,
        position_z_mm: 20, c_axis_position_deg: NaN, live_tool_diameter_mm: 12.7 },
    ]);
    expect(/NaN/.test(r.program_text)).toBe(false);
    expect(r.operations.some((o) => o.operation_type === "live_whistle_notch")).toBe(true);
  });

  it("ADVERSARIAL: Infinity pocket depth neither hangs the pass loop nor leaks 'Infinity' to G-code", () => {
    // Pre-U-W3 this spun Math.ceil(Infinity/step)=Infinity passes (unbounded loop)
    // and emitted X-Infinity coordinates. The sanitizer + 200-pass cap close both.
    const r = runLive([
      { id: "F1", type: "od_straight", od_mm: 31.75, length_mm: 60 },
      { id: "F2", type: "od_pocket_mill", od_mm: 31.75, length_mm: 20, pocket_width_mm: 20,
        pocket_depth_mm: Infinity, position_z_mm: 25, live_tool_diameter_mm: 12.7 },
    ]);
    expect(/Infinity/.test(r.program_text)).toBe(false);
    expect(r.program_line_count).toBeLessThan(2000); // bounded, not a runaway loop
  });

  it("ADVERSARIAL: Infinity cross-hole diameter is sanitized — no 'Infinity' coordinate", () => {
    const r = runLive([
      { id: "F1", type: "od_straight", od_mm: 25.4, length_mm: 50 },
      { id: "F2", type: "cross_drill", od_mm: 25.4, length_mm: 8,
        cross_hole_diameter_mm: Infinity, position_z_mm: 20, c_axis_position_deg: 0 },
    ]);
    expect(/Infinity/.test(r.program_text)).toBe(false);
  });
});
