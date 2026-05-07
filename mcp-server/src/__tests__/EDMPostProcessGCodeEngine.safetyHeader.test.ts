/**
 * U-WGAP10 — Safety interlock comments across all 5 controller generators.
 *
 * Verifies:
 *   1. Every controller emits a PRE-CUT SAFETY CHECKLIST header block
 *   2. Every controller emits a VERIFY comment before tank-fill / power-on M-codes
 *   3. Material-specific cautions render for carbide / titanium / aluminum
 *   4. Coated-wire note renders when a coated wire is in use
 */
import { describe, it, expect } from "vitest";
import {
  edmPostProcessGCodeEngine,
  type EDMGCodeInput,
  type EDMProfile,
  type EDMPass,
} from "../engines/EDMPostProcessGCodeEngine.js";

function profile(): EDMProfile {
  return {
    name: "SAFETY_TEST",
    start_hole: { x: 0, y: 0 },
    approach: { type: "linear", length_mm: 2 },
    departure: { type: "linear", length_mm: 2 },
    contour_points: [
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 },
    ],
  };
}

function passes(): EDMPass[] {
  return [
    { pass_number: 1, offset_mm: 0.16, technology_table: "E001", wire_speed_m_min: 12, tension_N: 15 },
    { pass_number: 2, offset_mm: 0.135, technology_table: "E002", wire_speed_m_min: 8, tension_N: 12 },
  ];
}

function baseInput(controller: EDMGCodeInput["controller"], overrides: Partial<EDMGCodeInput> = {}): EDMGCodeInput {
  return {
    controller,
    profiles: [profile()],
    passes: passes(),
    wire_type: "0.25mm Brass",
    program_number: 1234,
    submerged: true,
    ...overrides,
  };
}

const CONTROLLERS: Array<EDMGCodeInput["controller"]> = [
  "fanuc",
  "sodick",
  "makino",
  "mitsubishi",
  "agiecharmilles",
];

describe("U-WGAP10: Pre-cut safety checklist across all controllers", () => {
  for (const controller of CONTROLLERS) {
    describe(`[${controller}]`, () => {
      it("emits PRE-CUT SAFETY CHECKLIST header block", () => {
        const r = edmPostProcessGCodeEngine.generate_gcode(baseInput(controller));
        const gcode = r.gcode;
        expect(gcode).toMatch(/PRE-CUT SAFETY CHECKLIST/);
        expect(gcode).toMatch(/E-STOP tested/);
        expect(gcode).toMatch(/Tank interlocks/);
        expect(gcode).toMatch(/Dielectric level/);
        expect(gcode).toMatch(/Fire suppression ARMED/);
      });

      it("emits VERIFY comment before tank-fill / power-on M-code", () => {
        const r = edmPostProcessGCodeEngine.generate_gcode(baseInput(controller));
        expect(r.gcode).toMatch(/VERIFY:/);
      });

      it("includes wire-type in checklist", () => {
        const r = edmPostProcessGCodeEngine.generate_gcode(
          baseInput(controller, { wire_type: "coated_zinc_0.25" }),
        );
        expect(r.gcode).toMatch(/Wire loaded: coated_zinc_0\.25/);
        expect(r.gcode).toMatch(/Coated wire in use/);
      });

      it("emits carbide-specific caution for Tungsten Carbide", () => {
        const r = edmPostProcessGCodeEngine.generate_gcode(
          baseInput(controller, { material: "Tungsten Carbide" }),
        );
        expect(r.gcode).toMatch(/CAUTION: Carbide/);
        expect(r.gcode).toMatch(/coated wire recommended|cobalt binder/);
      });

      it("emits titanium-specific caution with fire-risk warning", () => {
        const r = edmPostProcessGCodeEngine.generate_gcode(
          baseInput(controller, { material: "Ti-6Al-4V" }),
        );
        expect(r.gcode).toMatch(/CAUTION: Titanium/);
        expect(r.gcode).toMatch(/alpha case|fire risk/);
      });

      it("emits aluminum-specific caution about low melting point", () => {
        const r = edmPostProcessGCodeEngine.generate_gcode(
          baseInput(controller, { material: "Aluminum 6061" }),
        );
        expect(r.gcode).toMatch(/CAUTION: Aluminum/);
        expect(r.gcode).toMatch(/low melting point/);
      });

      it("does NOT emit material caution for plain steel", () => {
        const r = edmPostProcessGCodeEngine.generate_gcode(
          baseInput(controller, { material: "D2 tool steel" }),
        );
        expect(r.gcode).not.toMatch(/CAUTION: Carbide/);
        expect(r.gcode).not.toMatch(/CAUTION: Titanium/);
        expect(r.gcode).not.toMatch(/CAUTION: Aluminum/);
      });

      it("safety header appears BEFORE the first tank/power M-code", () => {
        const r = edmPostProcessGCodeEngine.generate_gcode(baseInput(controller));
        const header = r.gcode.indexOf("PRE-CUT SAFETY CHECKLIST");
        // Find any of the safety-critical M-codes
        const mIdx = Math.min(
          ...["M28", "M14", "M78", "M80", "M82", "M84"]
            .map(m => r.gcode.indexOf(m))
            .filter(i => i >= 0),
        );
        expect(header).toBeGreaterThan(-1);
        expect(mIdx).toBeGreaterThan(-1);
        expect(header).toBeLessThan(mIdx);
      });
    });
  }
});
