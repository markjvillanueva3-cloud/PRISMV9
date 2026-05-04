/**
 * HurcoV11MillMasterPostEngine — UltiMotion / G187 dialect-correctness
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-Hurco-Tribal-Fix
 *
 * Regression guard for the wrong-dialect bug where the engine emitted
 * `G187 P3 (ULTIMOTION HIGH ACCURACY MODE)` when use_ultimotion=true.
 * G187 is the **Haas** smoothing G-code (G187 P3 E0.005). Hurco V11
 * controls (WinMax) do NOT accept G187 — feeding it to a real V11 yields
 * a parse error before the cut starts. UltiMotion / Smoothing Tolerance
 * on V11 is a control-panel parameter (Settings → Performance →
 * UltiMotion ON, Smoothing Tolerance) — there is no inline G-code form.
 *
 * The fix replaces the inline emission with a comment annotation that
 * documents the intent so the operator can verify the WinMax setting
 * before run-up. Mirrors AdvancedPostProcessorEngine.hurco dialect row.
 */
import { describe, it, expect } from "vitest";
import {
  hurcoV11MillMasterPostEngine,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";

const TOOL_NUM = 7;
const TOOL_DIA_MM = 10;
const TOOL_FLUTES = 4;
const SPINDLE_RPM = 5000;
const FEED_MM_MIN = 1000;
const AXIAL_DOC_MM = 1.5;
const RADIAL_DOC_MM = 6;
const PROGRAM_NUMBER = 9300;
const HURCO_3AXIS_MACHINE_ID = "jmdie_hurco_v11";

const baseOp: MillOperation = {
  operation_type: "3d_surface",
  tool_number: TOOL_NUM,
  tool_diameter_mm: TOOL_DIA_MM,
  tool_flutes: TOOL_FLUTES,
  material_iso: "P",
  spindle_rpm: SPINDLE_RPM,
  feed_mm_min: FEED_MM_MIN,
  axial_depth_mm: AXIAL_DOC_MM,
  radial_depth_mm: RADIAL_DOC_MM,
  coordinates: [
    { x: 0, y: 0, z: 25, type: "rapid" },
    { x: 50, y: 0, z: 25, type: "rapid" },
    { x: 50, y: 0, z: -1.5, type: "linear" },
    { x: 50, y: 50, z: -1.5, type: "linear" },
    { x: 0, y: 50, z: -1.5, type: "linear" },
    { x: 0, y: 0, z: -1.5, type: "linear" },
  ],
};

describe("HurcoV11 UltiMotion — regression: G187 must NEVER be emitted", () => {
  it("generateProgram(use_ultimotion=true) emits ZERO lines containing 'G187' across full program", () => {
    const out = hurcoV11MillMasterPostEngine.generateProgram(
      [baseOp],
      { program_number: PROGRAM_NUMBER, use_ultimotion: true },
    );
    const g187Lines = out.gcode.filter(line => /\bG187\b/.test(line));
    expect(g187Lines).toEqual([]);
  });

  it("generateProgram(use_ultimotion=true) emits exactly ONE comment line referencing 'WinMax' UltiMotion", () => {
    const out = hurcoV11MillMasterPostEngine.generateProgram(
      [baseOp],
      { program_number: PROGRAM_NUMBER + 1, use_ultimotion: true },
    );
    const winmaxLines = out.gcode.filter(line => /UltiMotion/i.test(line) && /WinMax/i.test(line));
    expect(winmaxLines).toHaveLength(1);
    // Concrete content checks — not just presence.
    const annotation = winmaxLines[0];
    expect(annotation.startsWith("(")).toBe(true);
    expect(annotation.endsWith(")")).toBe(true);
    expect(annotation).toContain("Settings");
    expect(annotation).toContain("Performance");
    expect(annotation).toContain("Smoothing Tolerance");
  });

  it("generateProgram(use_ultimotion=false) emits ZERO UltiMotion-related lines AND ZERO G187 lines", () => {
    const out = hurcoV11MillMasterPostEngine.generateProgram(
      [baseOp],
      { program_number: PROGRAM_NUMBER + 2, use_ultimotion: false },
    );
    const ultiLines = out.gcode.filter(line => /UltiMotion/i.test(line));
    const g187Lines = out.gcode.filter(line => /\bG187\b/.test(line));
    expect(ultiLines).toEqual([]);
    expect(g187Lines).toEqual([]);
  });

  it("regression: scan ALL gcode for G187 with any P-value and any whitespace/punctuation form", () => {
    const out = hurcoV11MillMasterPostEngine.generateProgram(
      [baseOp],
      { program_number: PROGRAM_NUMBER + 3, use_ultimotion: true },
    );
    // Variations: "G187 P3", "G187P3", "G187 P0", "G187 P3 E0.005", "G187 ".
    const variations = [
      /\bG187\s+P\d+/,         // G187 P3
      /\bG187P\d+/,             // G187P3 (no space)
      /\bG187\s+P\d+\s+E[\d.]+/,  // G187 P3 E0.005 (Haas tolerance arg)
      /\bG187\b/,               // bare G187 anywhere
    ];
    for (const re of variations) {
      const matches = out.gcode.filter(line => re.test(line));
      expect(matches).toEqual([]);
    }
  });

  it("tribal_tips_applied: G187 only as negative attribution + cites WinMax + comment-annotation + flags Haas", () => {
    const out = hurcoV11MillMasterPostEngine.generateProgram(
      [baseOp],
      { program_number: PROGRAM_NUMBER + 4, use_ultimotion: true },
    );
    const ultiTips = out.tribal_tips_applied.filter(t => /UltiMotion/i.test(t));
    // 3d_surface op matches static HURCO_V11_TRIBAL_KNOWLEDGE ultimotion entry
    // AND the engine pushes a runtime annotation tip — so 2 entries are
    // expected. Both must be G187-free.
    expect(ultiTips.length).toBeGreaterThanOrEqual(2);
    for (const tip of ultiTips) {
      // G187 may appear ONLY as a negative attribution ("G187 is Haas dialect
      // ... would parse-error on V11"). It must NEVER appear as a positive
      // recommendation ("Enable UltiMotion (G187 P3)" — the old wrong form).
      if (/G187/.test(tip)) {
        // Allowed: tip explicitly disclaims G187 by tagging it as Haas
        // and warning of parse-error. Required disclaimer phrases:
        const flagsAsHaas = /G187\s+is\s+Haas/i.test(tip);
        const warnsParseError = /parse-?error/i.test(tip);
        expect(flagsAsHaas).toBe(true);
        expect(warnsParseError).toBe(true);
        // Disallowed: positive-recommendation form like "Enable UltiMotion (G187 P3)".
        expect(tip).not.toMatch(/\(G187\s+P\d+\)/);
        expect(tip).not.toMatch(/\bUse\s+G187\b/i);
        expect(tip).not.toMatch(/\bEnable\s+UltiMotion\s+\(G187/i);
      }
      // The old runtime push string is unconditionally banned — that exact
      // wording came from the bugged version of the engine.
      expect(tip).not.toContain("UltiMotion enabled for smoother motion");
    }
    // At least one tip must acknowledge the V11 dialect reality:
    //  - the static doctrine tip references "WinMax control panel"
    //  - the runtime tip references "comment annotation"
    // Both must be present somewhere in the union.
    const cites = ultiTips.join("\n");
    expect(cites).toMatch(/WinMax/i);
    expect(cites).toMatch(/comment annotation/i);
    // The doctrine tip explicitly flags G187 as Haas dialect (negative claim
    // about V11) so the operator reading the tip database is told the WHY.
    expect(cites).toMatch(/Haas/i);
  });
});

describe("HurcoV11 UltiMotion — async generateProgramAdvanced respects same dialect rule", () => {
  it("advanced pipeline emits ZERO G187 in both base gcode and optimized_gcode", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [baseOp],
      {
        program_number: PROGRAM_NUMBER + 100,
        use_advanced_features: true,
        use_ultimotion: true,
        machine_id: HURCO_3AXIS_MACHINE_ID,
      },
    );
    const baseG187 = out.gcode.filter(line => /\bG187\b/.test(line));
    const optG187 = (out.optimized_gcode ?? []).filter(line => /\bG187\b/.test(line));
    expect(baseG187).toEqual([]);
    expect(optG187).toEqual([]);
  }, 30_000);

  it("AdvancedPost hurco controller dialect emits ZERO Fanuc G5.1 and ZERO G64 P{tol} (V11 rejects both)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(
      [baseOp],
      {
        program_number: PROGRAM_NUMBER + 110,
        use_advanced_features: true,
        use_ultimotion: true,
        machine_id: HURCO_3AXIS_MACHINE_ID,
        advanced_post: {
          hsm: {
            corner_rounding_tolerance: 0.005,
            smoothing_mode: "finish",
            nurbs_interpolation: false,
            arc_fitting: true,
            arc_tolerance: 0.005,
            min_arc_radius: 0.5,
            max_arc_radius: 50,
          },
        },
      },
    );
    const all = out.optimized_gcode ?? [];
    // V11 rejects all three of these inline forms — Haas dialect, Fanuc dialect, parameterized G64.
    const g187 = all.filter(line => /\bG187\b/.test(line));
    const g51q = all.filter(line => /\bG5\.1\s+Q\d+/.test(line));
    const g64WithP = all.filter(line => /\bG64\s+P\d/.test(line));
    expect(g187).toEqual([]);
    expect(g51q).toEqual([]);
    expect(g64WithP).toEqual([]);
  }, 30_000);
});

describe("HurcoV11 UltiMotion — comment annotation is operator-actionable", () => {
  it("annotation gives a concrete WinMax UI navigation path the operator can follow verbatim", () => {
    const out = hurcoV11MillMasterPostEngine.generateProgram(
      [baseOp],
      { program_number: PROGRAM_NUMBER + 200, use_ultimotion: true },
    );
    const annotations = out.gcode.filter(line => /UltiMotion/i.test(line));
    expect(annotations).toHaveLength(1);
    const ann = annotations[0];
    // Concrete UI breadcrumb: must include all three navigation tokens.
    expect(ann).toContain("Settings");
    expect(ann).toContain("Performance");
    expect(ann).toContain("UltiMotion");
    // Concrete tolerance guidance for finish mode.
    expect(ann).toMatch(/0\.005\s*mm/);
  });

  it("annotation is wrapped as a G-code comment (parens) so V11 parser ignores it (won't error out)", () => {
    const out = hurcoV11MillMasterPostEngine.generateProgram(
      [baseOp],
      { program_number: PROGRAM_NUMBER + 201, use_ultimotion: true },
    );
    const annotation = out.gcode.find(line => /UltiMotion/i.test(line));
    // The find result narrows past the toHaveLength check above. Not relying
    // on the same toBeDefined pattern — assert explicit string properties.
    const annString: string = annotation as string;
    expect(annString.charAt(0)).toBe("(");
    expect(annString.charAt(annString.length - 1)).toBe(")");
    // No G-code mnemonic at the start — would be parse-error if parser got
    // confused. First non-paren char should be a letter (not a digit/G/M).
    const firstInner = annString.charAt(1);
    expect(/[A-Za-z]/.test(firstInner)).toBe(true);
    expect(firstInner).not.toBe("G");
    expect(firstInner).not.toBe("M");
  });
});
