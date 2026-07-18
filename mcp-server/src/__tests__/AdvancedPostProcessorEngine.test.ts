/**
 * AdvancedPostProcessorEngine — Hurco dialect coverage
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring
 *
 * Validates the new "hurco" entries in AdvancedController dialect tables
 * (SMOOTHING_CODES, NURBS_CODES, CORNER_ROUNDING, RTCP_ACTIVATE,
 * RTCP_DEACTIVATE) and the controller-class branches in
 * generateSisterToolBlock, generateBreakDetection, injectInProcessMeasure.
 *
 * Honest scope: V11 has no inline smoothing G-code, no inline NURBS, no
 * inline corner-tolerance arg. The dialect emits comment annotations and
 * surfaces structured warnings so callers see the limitation.
 */
import { describe, it, expect } from "vitest";
import { advancedPostProcessorEngine } from "../engines/AdvancedPostProcessorEngine.js";

const MIN_GCODE = [
  "%",
  "O1234 (TEST PROGRAM)",
  "G90 G94 G17 G54",
  "T1 M6",
  "S5000 M3",
  "G0 X10 Y10 Z5",
  "G1 Z-2 F500",
  "G1 X20 Y20 F1000",
  "G1 X30 Y30",
  "G1 X40 Y20",
  "M5 M9",
  "M30",
  "%",
].join("\n");

const HSM_BASE = {
  corner_rounding_tolerance: 0,
  nurbs_interpolation: false,
  arc_fitting: false,
  arc_tolerance: 0.01,
  min_arc_radius: 0.5,
  max_arc_radius: 50,
};

describe("AdvancedPostProcessorEngine — hurco controller dialect", () => {
  describe("SMOOTHING_CODES.hurco — comment-only (control-level only)", () => {
    it("rough mode emits exactly the documented WinMax-UI annotation, no inline G-code", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: { ...HSM_BASE, smoothing_mode: "rough" },
      });
      expect(r.gcode).toContain(
        "(HURCO V11: smoothing tol target ~0.05mm — set in WinMax UI)",
      );
      expect(r.gcode).not.toMatch(/\bG5\.1\s+Q1\s+R/);
      expect(r.gcode).not.toMatch(/\bG187\s+P\d+/);
    });

    it("finish mode emits the 0.005mm target annotation specifically", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: { ...HSM_BASE, smoothing_mode: "finish" },
      });
      expect(r.gcode).toContain(
        "(HURCO V11: smoothing tol target ~0.005mm — set in WinMax UI)",
      );
      expect(r.gcode).not.toContain("0.05mm");
      expect(r.gcode).not.toContain("0.001mm");
    });

    it("ultra mode emits the 0.001mm target annotation specifically", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: { ...HSM_BASE, smoothing_mode: "ultra" },
      });
      expect(r.gcode).toContain(
        "(HURCO V11: smoothing tol target ~0.001mm — set in WinMax UI)",
      );
      expect(r.gcode).not.toContain("0.005mm");
      expect(r.gcode).not.toContain("0.05mm");
    });

    it("off mode emits the 'UltiMotion off' verification annotation", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: { ...HSM_BASE, smoothing_mode: "off" },
      });
      expect(r.gcode).toContain(
        "(HURCO V11: UltiMotion off — verify in WinMax UI)",
      );
    });

    it("pushes exactly one structured 'control-panel only' warning when smoothing requested", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: { ...HSM_BASE, smoothing_mode: "finish" },
      });
      const matches = r.warnings.filter(
        (w) => w.includes("Hurco V11") && w.includes("WinMax control panel"),
      );
      expect(matches).toHaveLength(1);
      expect(matches[0]).toContain(
        "smoothing tolerance is set in the WinMax control panel",
      );
    });

    it("does NOT push the control-panel warning when smoothing_mode === 'off'", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: { ...HSM_BASE, smoothing_mode: "off" },
      });
      const matches = r.warnings.filter(
        (w) => w.includes("Hurco V11") && w.includes("WinMax control panel"),
      );
      expect(matches).toHaveLength(0);
    });
  });

  describe("NURBS_CODES.hurco — null (V11 lacks inline NURBS)", () => {
    it("emits exactly 'NURBS interpolation not supported on hurco' warning", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: {
          ...HSM_BASE,
          smoothing_mode: "off",
          nurbs_interpolation: true,
        },
      });
      expect(r.warnings).toContain(
        "NURBS interpolation not supported on hurco",
      );
    });

    it("does NOT emit Fanuc-style G06.2 P3 K1 NURBS wrappers or BSPLINE", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: {
          ...HSM_BASE,
          smoothing_mode: "off",
          nurbs_interpolation: true,
        },
      });
      expect(r.gcode).not.toMatch(/\bG06\.2\s+P3\s+K1\b/);
      expect(r.gcode).not.toContain("BSPLINE");
    });
  });

  describe("CORNER_ROUNDING.hurco — bare G64 + comment (no inline tol)", () => {
    it("emits exact bare G64 with documenting comment for tol=0.005mm", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: {
          ...HSM_BASE,
          corner_rounding_tolerance: 0.005,
          smoothing_mode: "rough",
        },
      });
      expect(r.gcode).toContain(
        "(HURCO V11: corner blend tol=0.005mm — set in WinMax UI)",
      );
      // Must contain bare G64 line — explicitly NOT G64 P0.005 (no inline arg)
      const lines = r.gcode.split("\n").map((l) => l.trim());
      expect(lines).toContain("G64");
      expect(r.gcode).not.toMatch(/\bG64\s+P0\.005\b/);
      // Definitely not Fanuc G62 P1 form
      expect(r.gcode).not.toMatch(/\bG62\s+P1\b/);
    });

    it("emits different documented tolerance text for tol=0.02mm", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: {
          ...HSM_BASE,
          corner_rounding_tolerance: 0.02,
          smoothing_mode: "rough",
        },
      });
      expect(r.gcode).toContain("corner blend tol=0.020mm");
      expect(r.gcode).not.toContain("corner blend tol=0.005mm");
    });
  });

  describe("RTCP_ACTIVATE.hurco / RTCP_DEACTIVATE.hurco", () => {
    const gcodeWith5Axis = MIN_GCODE.replace(
      "G1 X20 Y20 F1000",
      "G1 X20 Y20 A30 C45 F1000",
    );

    it("rtcp_mode 'G43.4' emits exactly 'G43.4 H#1' activation", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: gcodeWith5Axis,
        multi_axis: {
          rtcp_mode: "G43.4",
          tilt_axis: "AC",
          tool_vector_output: false,
          singularity_avoidance: false,
          singularity_tolerance: 5,
          inverse_time_feed: false,
        },
      });
      expect(r.gcode).toContain("G43.4 H#1");
      expect(r.gcode).not.toContain("G43.5 H#1");
      // RTCP must deactivate before M30
      expect(r.gcode).toMatch(/G49[\s\S]*M30/);
      expect(r.enhancements_applied).toContain("multi_axis_rtcp");
    });

    it("rtcp_mode 'G43.5' emits exactly 'G43.5 H#1' activation", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: gcodeWith5Axis,
        multi_axis: {
          rtcp_mode: "G43.5",
          tilt_axis: "AC",
          tool_vector_output: false,
          singularity_avoidance: false,
          singularity_tolerance: 5,
          inverse_time_feed: false,
        },
      });
      expect(r.gcode).toContain("G43.5 H#1");
      expect(r.gcode).not.toContain("G43.4 H#1");
    });

    it("rtcp_mode 'G234' aliases to 'G43.4 H#1' (Hurco does not use G234)", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: gcodeWith5Axis,
        multi_axis: {
          rtcp_mode: "G234",
          tilt_axis: "AC",
          tool_vector_output: false,
          singularity_avoidance: false,
          singularity_tolerance: 5,
          inverse_time_feed: false,
        },
      });
      expect(r.gcode).toContain("G43.4 H#1");
      expect(r.gcode).not.toMatch(/\bG234\b/);
    });

    it("RTCP deactivation uses 'G49' (not Heidenhain M129 or Siemens TRAFOOF)", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: gcodeWith5Axis,
        multi_axis: {
          rtcp_mode: "G43.4",
          tilt_axis: "AC",
          tool_vector_output: false,
          singularity_avoidance: false,
          singularity_tolerance: 5,
          inverse_time_feed: false,
        },
      });
      const lines = r.gcode.split("\n").map((l) => l.trim());
      expect(lines).toContain("G49");
      expect(r.gcode).not.toContain("M129");
      expect(r.gcode).not.toContain("TRAFOOF");
    });
  });

  describe("Sister tooling — Fanuc-style #500-series macros for hurco", () => {
    it("emits exact 'IF [#501 GE 60] GOTO 9900' for tool 1 with 60min life", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        tool_management: {
          sister_tooling: true,
          max_tool_life_minutes: 60,
          break_detection: false,
          break_detection_method: "probe",
          wear_offset_increment: 0.01,
          auto_offset_update: false,
        },
      });
      expect(r.gcode).toContain("IF [#501 GE 60] GOTO 9900");
      expect(r.gcode).toContain("(SISTER TOOL: T101)");
      // Should NOT use Siemens R-vars or Heidenhain Q-vars
      expect(r.gcode).not.toMatch(/IF\s+R201>=60/);
      expect(r.gcode).not.toMatch(/FN 9: IF \+Q201/);
    });

    it("emits 'G65 P9023 (TOOL LENGTH MEASURE)' on probe break-detection", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        tool_management: {
          sister_tooling: false,
          max_tool_life_minutes: 60,
          break_detection: true,
          break_detection_method: "probe",
          wear_offset_increment: 0,
          auto_offset_update: false,
        },
      });
      expect(r.gcode).toContain("G65 P9023 (TOOL LENGTH MEASURE)");
      expect(r.gcode).toContain(
        "IF [#182 LT #501] GOTO 9999 (BROKEN TOOL ALARM)",
      );
    });
  });

  describe("In-process measurement — Fanuc-style #199 counter for hurco", () => {
    it("emits exact '#199=#199+1' increment + 'IF [#199 LT 5] GOTO 9800' branch", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        in_process_measure: {
          measure_every_n_parts: 5,
          critical_features: [
            {
              type: "bore",
              nominal: 25.4,
              tolerance_plus: 0.025,
              tolerance_minus: -0.025,
              work_offset: "G54",
            },
          ],
          auto_compensate: false,
          alarm_on_out_of_tolerance: true,
          spc_logging: false,
        },
      });
      expect(r.gcode).toContain("#199=#199+1");
      expect(r.gcode).toContain("IF [#199 LT 5] GOTO 9800");
      expect(r.gcode).toContain("#199=0");
      // No Siemens R or Heidenhain Q usage for Hurco
      expect(r.gcode).not.toContain("R199=R199+1");
      expect(r.gcode).not.toMatch(/FN 1: Q199/);
    });

    it("counter logic uses different 'measure_every_n_parts=10' threshold value", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        in_process_measure: {
          measure_every_n_parts: 10,
          critical_features: [
            {
              type: "bore",
              nominal: 25.4,
              tolerance_plus: 0.025,
              tolerance_minus: -0.025,
              work_offset: "G54",
            },
          ],
          auto_compensate: false,
          alarm_on_out_of_tolerance: true,
          spc_logging: false,
        },
      });
      expect(r.gcode).toContain("IF [#199 LT 10] GOTO 9800");
      expect(r.gcode).not.toContain("IF [#199 LT 5] GOTO 9800");
    });
  });

  describe("Combined pipeline — multi sub-feature stacking", () => {
    it("HSM + corner_rounding + sister_tooling stack their outputs and enhancements", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: MIN_GCODE,
        hsm: {
          ...HSM_BASE,
          corner_rounding_tolerance: 0.01,
          smoothing_mode: "finish",
          arc_fitting: true,
        },
        tool_management: {
          sister_tooling: true,
          max_tool_life_minutes: 90,
          break_detection: false,
          break_detection_method: "probe",
          wear_offset_increment: 0,
          auto_offset_update: false,
        },
      });
      expect(r.enhancements_applied).toContain("hsm_smoothing");
      expect(r.enhancements_applied).toContain("arc_fitting");
      expect(r.enhancements_applied).toContain("tool_management");
      expect(r.gcode).toContain(
        "(HURCO V11: smoothing tol target ~0.005mm — set in WinMax UI)",
      );
      expect(r.gcode).toContain(
        "(HURCO V11: corner blend tol=0.010mm — set in WinMax UI)",
      );
      expect(r.gcode).toContain("(SISTER TOOL: T101)");
      expect(r.gcode).toContain("IF [#501 GE 90] GOTO 9900");
    });
  });

  describe("Cross-controller regression — hurco does not break existing dialects", () => {
    it("fanuc still emits exact 'G5.1 Q1 R0.01' for finish smoothing", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "fanuc",
        gcode: MIN_GCODE,
        hsm: { ...HSM_BASE, smoothing_mode: "finish" },
      });
      expect(r.gcode).toContain("G5.1 Q1 R0.01");
    });

    it("haas still emits exact 'G187 P3 E0.005' for finish smoothing", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "haas",
        gcode: MIN_GCODE,
        hsm: { ...HSM_BASE, smoothing_mode: "finish" },
      });
      expect(r.gcode).toContain("G187 P3 E0.005");
    });

    it("okuma still emits exact 'G08 P1' for finish smoothing", () => {
      const r = advancedPostProcessorEngine.enhance({
        controller: "okuma",
        gcode: MIN_GCODE,
        hsm: { ...HSM_BASE, smoothing_mode: "finish" },
      });
      expect(r.gcode).toContain("G08 P1");
    });
  });

  // ==========================================================================
  // NON-FINITE EMIT GUARD (U-PP-NONFINITE-EMIT-SWEEP) -- a NaN/Infinity probe
  // nominal must never leak a literal ZNaN/DInfinity the probe macro rejects.
  // ==========================================================================
  describe("In-process measurement -- non-finite nominal guard (U-PP-NONFINITE-EMIT-SWEEP)", () => {
    const measure = (controller: string, nominal: number) =>
      advancedPostProcessorEngine.enhance({
        controller, gcode: MIN_GCODE,
        in_process_measure: {
          measure_every_n_parts: 5,
          critical_features: [{ type: "surface", nominal, tolerance_plus: 0.025, tolerance_minus: -0.025, work_offset: "G54" }],
          auto_compensate: false, alarm_on_out_of_tolerance: true, spc_logging: false,
        },
      } as never);

    it("[regression] a finite Fanuc surface measure emits the real G65 P9811 Z block", () => {
      const r = measure("fanuc", 25.4);
      expect(r.gcode).toContain("G65 P9811 Z25.400");
      expect(r.gcode).not.toContain("NON-FINITE");
    });

    it("NaN nominal emits an ERROR marker -- no literal ZNaN", () => {
      const r = measure("fanuc", NaN);
      expect(r.gcode).not.toMatch(/[ZDWQ]NaN/);
      expect(r.gcode).toContain("NON-FINITE NOMINAL");
    });

    it("Infinity nominal emits an ERROR marker -- no literal ZInfinity", () => {
      const r = measure("fanuc", Infinity);
      expect(r.gcode).not.toMatch(/[ZDWQ]Infinity/);
      expect(r.gcode).toContain("NON-FINITE NOMINAL");
    });
  });
});
