/**
 * HurcoV11 coolant emission test — PPG-HARDEN/U-PPGH01.
 *
 * Targeted unit-test for the coolant-emit fix: TSC (through-spindle
 * coolant) was previously accepted by the type enum but silently dropped
 * during emit. This file asserts the production behavior of all four
 * coolant modes (flood / mist / tsc / off) end-to-end through
 * generateProgram() — both the gcode emit and the absence of a
 * conflicting code.
 *
 * Stays narrow on purpose: the wider HurcoV11MillMasterPostEngine.test.ts
 * file is a pre-existing uncommitted artifact with 29 stale assertions
 * predating the U-PPGM13 labelled-block sidecar contract; bringing it in
 * line is its own multi-unit roadmap (PPG-HARDEN U-PPGH02..05). This
 * unit ships ONLY the TSC coolant fix with focused coverage, mirroring
 * the test discipline used by HurcoV11SidecarIntegration.test.ts which
 * is already tracked and GREEN.
 */

import { describe, it, expect } from "vitest";
import {
  hurcoV11MillMasterPostEngine,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";

function makeOp(overrides: Partial<MillOperation> = {}): MillOperation {
  return {
    operation_type: "pocket",
    tool_number: 1,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    tool_description: "12MM 4FL CARBIDE",
    material_iso: "N",
    spindle_rpm: 6000,
    feed_mm_min: 1200,
    axial_depth_mm: 3,
    coordinates: [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 25, y: 25, z: -3, type: "linear" },
    ],
    ...overrides,
  };
}

const linesMatching = (gcode: string[], pattern: RegExp): string[] =>
  gcode.filter((l) => pattern.test(l));

describe("HurcoV11 — coolant emit (U-PPGH01)", () => {
  it("emits M88 (THROUGH-SPINDLE COOLANT) when coolant=tsc (regression: was silently dropped)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ coolant: "tsc" }),
    ]);
    const m88Lines = linesMatching(result.gcode, /^M88\b/);
    expect(m88Lines).toHaveLength(1);
    expect(m88Lines[0]).toBe("M88 (THROUGH-SPINDLE COOLANT)");
    // No competing flood/mist code emitted
    expect(linesMatching(result.gcode, /^M0?7\b/)).toEqual([]);
    expect(linesMatching(result.gcode, /^M0?8\b/).filter((l) => !/COOLANT OFF/.test(l))).toEqual([]);
  });

  it("emits M07 (MIST COOLANT) when coolant=mist (regression check unchanged from prior behavior)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ coolant: "mist" }),
    ]);
    const m07Lines = linesMatching(result.gcode, /^M0?7\b/);
    expect(m07Lines).toHaveLength(1);
    expect(m07Lines[0]).toBe("M07 (MIST COOLANT)");
    expect(linesMatching(result.gcode, /^M88\b/)).toEqual([]);
  });

  it("emits M08 (FLOOD COOLANT) when coolant=flood (regression check unchanged from prior behavior)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ coolant: "flood" }),
    ]);
    const floodLines = linesMatching(result.gcode, /^M08 \(FLOOD/);
    expect(floodLines).toHaveLength(1);
    expect(floodLines[0]).toBe("M08 (FLOOD COOLANT)");
    expect(linesMatching(result.gcode, /^M07\b/)).toEqual([]);
    expect(linesMatching(result.gcode, /^M88\b/)).toEqual([]);
  });

  it("emits NO coolant code (apart from M09 program-end) when coolant=off", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ coolant: "off" }),
    ]);
    expect(linesMatching(result.gcode, /^M07\b/)).toEqual([]);
    expect(linesMatching(result.gcode, /^M08 \(FLOOD/)).toEqual([]);
    expect(linesMatching(result.gcode, /^M88\b/)).toEqual([]);
    // The program-end M09 (coolant off) is always emitted regardless of
    // op-level coolant — verify it survives the off branch.
    const m09Lines = linesMatching(result.gcode, /^M09\b/);
    expect(m09Lines).toHaveLength(1);
    expect(m09Lines[0]).toBe("M09 (COOLANT OFF)");
  });

  it("multi-op programs emit per-op coolant code in order (mist → tsc → flood)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 1, coolant: "mist" }),
      makeOp({ tool_number: 2, coolant: "tsc" }),
      makeOp({ tool_number: 3, coolant: "flood" }),
    ]);
    const coolantLines = result.gcode.filter((l) =>
      /^M07\b|^M88\b|^M08 \(FLOOD/.test(l),
    );
    expect(coolantLines).toEqual([
      "M07 (MIST COOLANT)",
      "M88 (THROUGH-SPINDLE COOLANT)",
      "M08 (FLOOD COOLANT)",
    ]);
  });
});
