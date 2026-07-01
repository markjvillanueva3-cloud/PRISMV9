/**
 * ProbeRoutineGeneratorEngine -- partial-position robustness (regression for the
 * `pos.z.toFixed()` null-access that crashed PrintToProgram on tight-tolerance /
 * titanium parts via the U-CAMX23 in-process-probe wiring).
 *
 * Root cause: `feature.position ?? {x:0,y:0,z:0}` only guarded a FULLY-missing
 * position; a partial position (a 2D {x,y} with no z) slipped through and made
 * `pos.z` undefined -> `z.toFixed(3)` threw. Fix: per-coordinate coalesce, 0 =
 * WCS datum (consistent with the original whole-object fallback).
 *
 * R9: these tests fail (throw) against the pre-fix engine and pin the intent
 * (a probe routine for a partial-position feature emits a FINITE datum Z, never
 * `undefined`/`NaN`), not merely "does not throw".
 */
import { describe, it, expect } from "vitest";
import {
  probeRoutineGeneratorEngine,
  type ProbeFeature,
} from "../engines/ProbeRoutineGeneratorEngine.js";

/** A surface feature whose position is a 2D {x,y} with NO z (the crash trigger). */
const PARTIAL_SURFACE = {
  type: "surface",
  position: { x: 10, y: 20 },
} as unknown as ProbeFeature;

/** A bore feature with a fully-empty position object (all coords missing). */
const EMPTY_POS_BORE = {
  type: "bore",
  position: {},
  diameter: 25,
  depth: 12,
} as unknown as ProbeFeature;

/** A complete, well-formed surface feature (happy path). */
const COMPLETE_SURFACE: ProbeFeature = {
  type: "surface",
  position: { x: 10, y: 20, z: -5 },
};

/** No `gcode` line may contain a non-finite token. */
function assertFiniteGcode(gcode: string): void {
  expect(gcode).not.toMatch(/undefined/);
  expect(gcode).not.toMatch(/NaN/);
  // A bare `Z.` / `X.` (toFixed on undefined would not even produce this, but a
  // malformed coalesce could) must never appear.
  expect(gcode).not.toMatch(/[XYZ]\.\D/);
}

describe("ProbeRoutineGeneratorEngine -- partial-position robustness (U-CAMX23 regression)", () => {
  // ── generateWCSSetup ─────────────────────────────────────────────────────
  it("generateWCSSetup: partial position (no z) does NOT throw and defaults z to the 0.000 datum", () => {
    const r = probeRoutineGeneratorEngine.generateWCSSetup({ features: [PARTIAL_SURFACE] });
    expect(r.gcode.length).toBeGreaterThan(0);
    assertFiniteGcode(r.gcode);
    // FANUC surface measure emits `G65 P9811 Z<z>.` -- z defaulted to 0.
    expect(r.gcode).toContain("G65 P9811 Z0.000");
    // x/y carried through unchanged.
    expect(r.gcode).toContain("X10.000");
    expect(r.gcode).toContain("Y20.000");
  });

  it("generateWCSSetup: empty position object (all coords missing) does NOT throw", () => {
    const r = probeRoutineGeneratorEngine.generateWCSSetup({ features: [EMPTY_POS_BORE] });
    expect(r.gcode.length).toBeGreaterThan(0);
    assertFiniteGcode(r.gcode);
    expect(r.gcode).toContain("X0.000");
    expect(r.gcode).toContain("Y0.000");
  });

  it("generateWCSSetup: complete position renders the real coordinates (happy path, no regression)", () => {
    const r = probeRoutineGeneratorEngine.generateWCSSetup({ features: [COMPLETE_SURFACE] });
    assertFiniteGcode(r.gcode);
    expect(r.gcode).toContain("X10.000");
    expect(r.gcode).toContain("Y20.000");
    expect(r.gcode).toContain("G65 P9811 Z-5.000");
  });

  it("generateWCSSetup: feature with NO position key at all still works (original fallback path)", () => {
    const noPos = { type: "surface" } as unknown as ProbeFeature;
    const r = probeRoutineGeneratorEngine.generateWCSSetup({ features: [noPos] });
    assertFiniteGcode(r.gcode);
    expect(r.gcode).toContain("Z0.000");
  });

  // ── generatePartInspection ───────────────────────────────────────────────
  it("generatePartInspection: partial position (no z) does NOT throw", () => {
    const r = probeRoutineGeneratorEngine.generatePartInspection({ features: [PARTIAL_SURFACE] });
    expect(r.gcode.length).toBeGreaterThan(0);
    assertFiniteGcode(r.gcode);
    expect(r.features_measured).toBe(1);
  });

  it("generatePartInspection: bore with empty position + finite diameter/depth", () => {
    const r = probeRoutineGeneratorEngine.generatePartInspection({ features: [EMPTY_POS_BORE] });
    assertFiniteGcode(r.gcode);
    // FANUC bore measure: `G65 P9814 D<d>. Z<z-depth>.` -> D25.000, Z-(0-12)=-12.000
    expect(r.gcode).toContain("D25.000");
    expect(r.gcode).toContain("Z-12.000");
  });

  // ── generateFirstArticle ─────────────────────────────────────────────────
  it("generateFirstArticle: partial position (no z) does NOT throw", () => {
    const r = probeRoutineGeneratorEngine.generateFirstArticle({ features: [PARTIAL_SURFACE] });
    expect(r.gcode.length).toBeGreaterThan(0);
    assertFiniteGcode(r.gcode);
  });

  it("generateFirstArticle: mixed complete + partial features both render finite Z", () => {
    const r = probeRoutineGeneratorEngine.generateFirstArticle({
      features: [COMPLETE_SURFACE, PARTIAL_SURFACE],
    });
    assertFiniteGcode(r.gcode);
    expect(r.gcode).toContain("Z-5.000"); // complete
    expect(r.gcode).toContain("Z0.000"); // partial -> datum
  });

  // ── Cross-controller: the partial-position guard holds for every dialect ──
  it("partial position is safe across fanuc/siemens/heidenhain dialects", () => {
    for (const controller of ["fanuc", "siemens", "heidenhain"] as const) {
      const r = probeRoutineGeneratorEngine.generateWCSSetup({
        controller,
        features: [PARTIAL_SURFACE],
      });
      expect(r.gcode.length).toBeGreaterThan(0);
      assertFiniteGcode(r.gcode);
    }
  });

  // ── Determinism ──────────────────────────────────────────────────────────
  it("is deterministic for a partial-position feature", () => {
    const a = probeRoutineGeneratorEngine.generateWCSSetup({ features: [PARTIAL_SURFACE] });
    const b = probeRoutineGeneratorEngine.generateWCSSetup({ features: [PARTIAL_SURFACE] });
    expect(a.gcode).toBe(b.gcode);
  });
});
