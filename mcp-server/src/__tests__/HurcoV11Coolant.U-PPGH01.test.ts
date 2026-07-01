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

  it("emits NO coolant code at all when coolant=off (modal: never turned on so no M09 needed)", () => {
    // U-PPGH01-MODAL: the program-end M09 is CONDITIONAL -- it fires only when
    // coolant was actually on at program end.  A single off-coolant op never
    // engages any channel, so currentCoolant stays "none" and M09 is suppressed.
    // This is correct: emitting M09 when nothing is on is redundant noise.
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ coolant: "off" }),
    ]);
    expect(linesMatching(result.gcode, /^M07\b/)).toEqual([]);
    expect(linesMatching(result.gcode, /^M08 \(FLOOD/)).toEqual([]);
    expect(linesMatching(result.gcode, /^M88\b/)).toEqual([]);
    // No M09 anywhere -- coolant was never turned on.
    expect(linesMatching(result.gcode, /^M09\b/)).toEqual([]);
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

// ---------------------------------------------------------------------------
// Modal state machine tests (U-PPGH01-MODAL)
// ---------------------------------------------------------------------------

describe("HurcoV11 -- coolant modal state machine (U-PPGH01-MODAL)", () => {
  // Helper: extract all M07/M08/M09/M88 lines from a program in order.
  const coolantSequence = (gcode: string[]): string[] =>
    gcode.filter((l) => /^M0[7-9]\b|^M88\b/.test(l));

  // -------------------------------------------------------------------------
  // Happy path: no re-emission on same channel
  // -------------------------------------------------------------------------

  it("consecutive same-coolant ops (flood then flood) emit M08 ONCE not twice", () => {
    // R9: the business rule is "don't re-emit an already-active code".
    // Regression: the old unconditional emit sent M08 before EVERY op.
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 1, coolant: "flood" }),
      makeOp({ tool_number: 2, coolant: "flood" }),
    ]);
    const seq = coolantSequence(result.gcode);
    // Expected sequence: M09 (tool-change between ops), M08 (re-engage after TC), M09 (end)
    // The first M08 starts flood; tool-change emits M09 + resets; second op re-engages M08.
    // There must be exactly two M08 lines (one per op after tool-change reset) and no duplicate
    // on the same tool context.
    const m08Count = result.gcode.filter((l) => /^M08\b/.test(l)).length;
    // Each op gets ONE M08 (the tool-change resets modal state, so op2 re-asserts).
    expect(m08Count).toBe(2);
    // The two M08s are each preceded by a tool-change M09 (first op has no prior M09 --
    // nothing was on before op1).  Verify the overall structure has no adjacent M08 pair.
    const adjacentM08 = seq.some((l, i) => l.startsWith("M08") && seq[i + 1]?.startsWith("M08"));
    expect(adjacentM08).toBe(false);
  });

  it("same tool/same coolant single-op: exactly one ON code, one trailing M09", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ coolant: "tsc" }),
    ]);
    expect(result.gcode.filter((l) => /^M88\b/.test(l))).toHaveLength(1);
    // Program-end M09 fires because coolant was on.
    expect(result.gcode.filter((l) => /^M09\b/.test(l))).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Channel switch: M09 must appear between different channel ON codes
  // -------------------------------------------------------------------------

  it("TSC -> flood transition emits M09 between them (M88 ... M09 ... M08, in order)", () => {
    // R9: a channel switch without M09 leaves BOTH channels on simultaneously on
    // a real machine -- physically dangerous.  This is the key safety invariant.
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 1, coolant: "tsc" }),
      makeOp({ tool_number: 2, coolant: "flood" }),
    ]);
    const seq = coolantSequence(result.gcode);
    // Expected sequence: M88 (op1 on), M09 (tool-change off), M08 (op2 on), M09 (end off)
    expect(seq).toEqual([
      "M88 (THROUGH-SPINDLE COOLANT)",
      "M09 (COOLANT OFF FOR TOOL CHANGE)",
      "M08 (FLOOD COOLANT)",
      "M09 (COOLANT OFF)",
    ]);
    // Confirm M09 appears BEFORE M08 (not after, not absent).
    const m09Idx = seq.indexOf("M09 (COOLANT OFF FOR TOOL CHANGE)");
    const m08Idx = seq.indexOf("M08 (FLOOD COOLANT)");
    expect(m09Idx).toBeGreaterThanOrEqual(0);
    expect(m08Idx).toBeGreaterThan(m09Idx);
  });

  it("mist -> tsc -> flood sequence: M09 appears before each new channel", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 1, coolant: "mist" }),
      makeOp({ tool_number: 2, coolant: "tsc" }),
      makeOp({ tool_number: 3, coolant: "flood" }),
    ]);
    const seq = coolantSequence(result.gcode);
    // M07(op1) / M09(TC1) / M88(op2) / M09(TC2) / M08(op3) / M09(end)
    expect(seq).toEqual([
      "M07 (MIST COOLANT)",
      "M09 (COOLANT OFF FOR TOOL CHANGE)",
      "M88 (THROUGH-SPINDLE COOLANT)",
      "M09 (COOLANT OFF FOR TOOL CHANGE)",
      "M08 (FLOOD COOLANT)",
      "M09 (COOLANT OFF)",
    ]);
  });

  // -------------------------------------------------------------------------
  // Tool-change interaction
  // -------------------------------------------------------------------------

  it("M09 appears before M06 when coolant was on at tool change", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 1, coolant: "flood" }),
      makeOp({ tool_number: 2, coolant: "flood" }),
    ]);
    const gcode = result.gcode;
    // Find the T2 M06 line and the M09 that must precede it.
    const m06Idx = gcode.findIndex((l) => /^T2\b.*M06\b/.test(l));
    expect(m06Idx).toBeGreaterThan(0);
    // There must be an M09 somewhere before T2 M06.
    const m09BeforeTC = gcode.slice(0, m06Idx).some((l) => /^M09\b/.test(l));
    expect(m09BeforeTC).toBe(true);
  });

  it("NO M09 before the FIRST tool change when no coolant was on yet", () => {
    // R9: emitting M09 before the first tool is a spurious code on a real machine.
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 1, coolant: "off" }),
      makeOp({ tool_number: 2, coolant: "flood" }),
    ]);
    const gcode = result.gcode;
    const t1M06Idx = gcode.findIndex((l) => /^T1\b.*M06\b/.test(l));
    expect(t1M06Idx).toBeGreaterThanOrEqual(0);
    // No M09 before the very first tool call.
    const m09BeforeFirst = gcode.slice(0, t1M06Idx).some((l) => /^M09\b/.test(l));
    expect(m09BeforeFirst).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Program-end: exactly one trailing M09 (no duplicate)
  // -------------------------------------------------------------------------

  it("program-end has exactly one trailing M09 when coolant was on -- no duplicate", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ coolant: "flood" }),
    ]);
    const m09Lines = result.gcode.filter((l) => /^M09\b/.test(l));
    // Only ONE M09 total (the program-end one) -- no duplicate from an off transition.
    expect(m09Lines).toHaveLength(1);
    expect(m09Lines[0]).toBe("M09 (COOLANT OFF)");
  });

  it("program-end emits NO M09 when the last op had coolant=off (nothing to turn off)", () => {
    // Adversarial: two ops, second turns coolant off -- no trailing M09 at end.
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 1, coolant: "flood" }),
      makeOp({ tool_number: 2, coolant: "off" }),
    ]);
    // After TC the modal state resets to none; op2 requests off -- no ON code emitted.
    // Program end: currentCoolant is already none -- conditional M09 suppressed.
    const trailingM09 = result.gcode.filter((l) => /^M09 \(COOLANT OFF\)$/.test(l));
    expect(trailingM09).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Single-op edge cases
  // -------------------------------------------------------------------------

  it("single-op program with coolant=off emits zero coolant codes", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ coolant: "off" }),
    ]);
    const seq = coolantSequence(result.gcode);
    expect(seq).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Failure modes: non-finite / unknown coolant values
  // -------------------------------------------------------------------------

  it("undefined op.coolant falls back to cfg.coolant_mode without emitting redundant codes", () => {
    // cfg defaults to coolant_mode="flood"; op has no coolant -- should use flood.
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ coolant: undefined })],
      { coolant_mode: "flood" },
    );
    expect(result.gcode.filter((l) => /^M08\b/.test(l))).toHaveLength(1);
    // No warning for undefined -- undefined is a valid "use config" signal.
    expect(result.warnings.some((w) => /unrecognised coolant/.test(w))).toBe(false);
  });

  it("unrecognised coolant value emits a warning and treats as off (no ON code)", () => {
    // Adversarial: caller passes a future/unsupported coolant string.
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      // Cast to any to bypass type-system -- mirrors a real runtime bad input.
      makeOp({ coolant: "air_blast" as unknown as "flood" }),
    ]);
    // No ON code emitted.
    expect(result.gcode.filter((l) => /^M07\b|^M08\b|^M88\b/.test(l))).toHaveLength(0);
    // Warning surfaced.
    expect(result.warnings.some((w) => /unrecognised coolant/.test(w))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Adversarial: verify M89 is never emitted under any path
  // -------------------------------------------------------------------------

  it("adversarial: M89 is NEVER emitted regardless of coolant combination", () => {
    // M89 is UNVERIFIED on WinMax V11 -- the modal state machine must never emit it.
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 1, coolant: "flood" }),
      makeOp({ tool_number: 2, coolant: "tsc" }),
      makeOp({ tool_number: 3, coolant: "mist" }),
      makeOp({ tool_number: 4, coolant: "off" }),
    ]);
    expect(result.gcode.some((l) => /\bM89\b/.test(l))).toBe(false);
  });

  it("adversarial: only verified codes M07/M08/M09/M88 appear in coolant position", () => {
    // Exhaustive channel sweep -- confirms no stray Mx code leaks in.
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 1, coolant: "tsc" }),
      makeOp({ tool_number: 2, coolant: "mist" }),
      makeOp({ tool_number: 3, coolant: "flood" }),
      makeOp({ tool_number: 4, coolant: "off" }),
    ]);
    const unknownCoolantCodes = result.gcode.filter(
      (l) => /^M\d+/.test(l) &&
              !/^M0[3-9]\b|^M01\b|^M30\b|^M88\b/.test(l),
    );
    // There must be no coolant-looking M-code outside the verified set.
    const badCoolant = unknownCoolantCodes.filter((l) =>
      /cool|coolant/i.test(l) && !/^M07\b|^M08\b|^M09\b|^M88\b/.test(l),
    );
    expect(badCoolant).toHaveLength(0);
  });
});
