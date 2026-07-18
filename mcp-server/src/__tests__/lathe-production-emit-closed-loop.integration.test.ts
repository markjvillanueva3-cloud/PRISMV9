// lathe-production-emit-closed-loop.integration.test.ts — CLOSED-LOOP-MS0/U-CL7
//
// Closes the spec's flagged "future-wire": proves the REAL move-level PRODUCTION post
// (LathePrintProgramEmitterEngine — turret moves, machine-envelope hard-block, sign-off dossier)
// emits machine-ready Okuma-OSP G-code that clears the SAME closed-loop gates as the lightweight
// U-CL5 emitter:
//   lathePrintProgramEmitterEngine.emit(ToolpathProgram, {controller:"okuma_osp", use_css})
//        → EmittedProgram.gcode (machine-ready .MIN text)
//        → assessProgram() [U-CL1, 8-gotcha lint]  +  closedLoopTest() [U-CL4]
//
// The emitter is proper-by-construction (its CSS dialect emits "G50 S<max>" before "G96 S<vc>");
// this asserts that property survives end-to-end into a PASS verdict. A NEGATIVE CONTROL (a
// program that violates the machine envelope) must be hard-blocked by emit() — proving the
// production safety gate the lightweight emitter lacks, and that the suite can fail (R9).
import { describe, test, expect } from "vitest";
import { lathePrintProgramEmitterEngine } from "../engines/LathePrintProgramEmitterEngine.js";
import type { ToolpathProgram } from "../engines/LathePrintToolpathGeneratorEngine.js";
import { assessProgram } from "../../../scripts/lathe-program-assessor.mjs";
import { closedLoopTest } from "../../../scripts/lathe-closed-loop-test.mjs";

// A minimal but schema-valid ToolpathProgram: one ISO-P OD-roughing op within the envelope.
// vc/feed/rpm are realistic turning values (not asserted as physics here — they pass through the
// emitter unchanged; the physics centers are owned + tested by LatheToolpathTemplateEngine/U-CL2).
function odRoughProgram(opts: { withinEnvelope?: boolean } = {}): ToolpathProgram {
  const withinEnvelope = opts.withinEnvelope ?? true;
  return {
    program_id: "TEST-OD-ROUGH-P",
    source_sequence_plan_id: "SP-TEST-1",
    operations: [{
      op_number: 1, featureId: "F1", featureType: "od_cylinder", strategy_id: "od_rough_iso_p",
      tool_id: "T0101", cutting_speed_m_min: 220, spindle_rpm: 1400, feed_mm_rev: 0.3, feed_mm_min: 420,
      depth_of_cut_mm: 2.5, number_of_passes: 4,
      moves: [
        { move_type: "tool_change", gcode: "T0101", duration_sec: 2 },
        { move_type: "rapid", x_mm: 52, z_mm: 2, gcode: "G00 X52.0 Z2.0", duration_sec: 1 },
        { move_type: "canned_cycle", x_mm: 40, z_mm: -60, feed_mm_min: 420, rpm: 1400, gcode: "G71 P10 Q20 U0.5 W0.1 D2500 F0.3", duration_sec: 80 },
        { move_type: "rapid", x_mm: 100, z_mm: 50, gcode: "G00 X100.0 Z50.0", duration_sec: 1 },
      ],
      cycle_time_sec: 84, cutting_force_n: 1800, material_removal_rate_cm3_min: 30, warnings: [],
    }],
    total_cycle_time_sec: 84, total_rapid_time_sec: 3, total_feed_time_sec: 80,
    total_cutting_volume_cm3: 42, gcode_preview: "",
    machine_envelope_check: {
      max_x_mm: withinEnvelope ? 100 : 999, max_z_mm: 50, min_x_mm: 40, min_z_mm: -60,
      within_envelope: withinEnvelope,
    },
    warnings: [], timestamp: "2026-06-01T00:00:00Z",
  };
}

const CTX = { controller: "okuma" };

describe("CLOSED-LOOP: real production emitter → machine-ready .MIN passes the loop (U-CL7)", () => {
  test("emit (okuma_osp, CSS) bakes the G50 cap before G96 and yields machine-ready gcode", () => {
    const emitted = lathePrintProgramEmitterEngine.emit(odRoughProgram(), {
      controller: "okuma_osp", use_css: true, include_comments: true,
    });
    expect(emitted.gcode_lines).toBeGreaterThan(0);
    expect(emitted.gcode).toContain("G50");      // spindle overspeed cap
    expect(emitted.gcode).toContain("G96");      // constant surface speed
    // the cap must precede the CSS command (chuck-overspeed safety order):
    expect(emitted.gcode.indexOf("G50")).toBeLessThan(emitted.gcode.indexOf("G96"));
    // a real production emit carries a sign-off dossier with safety checks (not a stub):
    expect(emitted.dossier.safety_checks.length).toBeGreaterThan(0);
    expect(emitted.dossier.max_rpm_used).toBe(1400);
  });

  test("the production gcode is PROPER (assessProgram, 0 ERROR gotchas) — no css-no-rpm-cap", () => {
    const emitted = lathePrintProgramEmitterEngine.emit(odRoughProgram(), {
      controller: "okuma_osp", use_css: true,
    });
    const a = assessProgram(emitted.gcode, CTX);
    expect.soft(a.errorCount, `production emit ERROR gotchas: ${a.ruleSet.join(", ")}`).toBe(0);
    expect(a.proper).toBe(true);
    expect(a.ruleSet).not.toContain("css-no-rpm-cap");
  });

  test("the production gcode PASSES the full closed-loop test with tools on hand", () => {
    const emitted = lathePrintProgramEmitterEngine.emit(odRoughProgram(), {
      controller: "okuma_osp", use_css: true,
    });
    const r = closedLoopTest({
      programText: emitted.gcode, ctx: CTX,
      purchaseByType: { insert: { count: 212 }, "carbide-blank": { count: 5372 } },
    });
    expect(r.verdict, `verdict=${r.verdict} reasons=${r.reasons.join("; ")}`).toBe("PASS");
    expect(r.proper).toBe(true);
    expect(r.toolTypesMissing).toEqual([]);
  });

  test("NEGATIVE CONTROL: an out-of-envelope program is HARD-BLOCKED by emit() (production safety gate)", () => {
    // No allow_envelope_override → the emitter must refuse (ISO 16090-1 §5.3.2 envelope hard-block).
    expect(() => lathePrintProgramEmitterEngine.emit(odRoughProgram({ withinEnvelope: false }), {
      controller: "okuma_osp", use_css: true,
    })).toThrow(/envelope/i);
  });
});
