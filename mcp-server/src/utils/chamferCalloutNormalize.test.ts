import { describe, it, expect } from "vitest";
import { normalizeChamferCallout, resolveChamfer } from "./chamferCalloutNormalize.js";

// Reference values PINNED IDENTICAL to the script-side
// scripts/lib/ollama-vision-extract-lib.test.mjs "normalizeChamferCallout" tests, so the documented
// .mjs/.ts clone cannot silently diverge.
describe("normalizeChamferCallout (production clone)", () => {
  it("countersink: keyword + included angle + diameter", () => {
    expect(normalizeChamferCallout("82 DEG CSK .375")).toMatchObject({
      type: "countersink", angle_deg: 82, diameter_in: 0.375, size_in: null, resolved: true,
    });
    expect(normalizeChamferCallout("90 DEG C'SINK .250")).toMatchObject({ type: "countersink", angle_deg: 90, diameter_in: 0.25 });
    expect(normalizeChamferCallout("COUNTERSINK .500").diameter_in).toBe(0.5);
  });

  it("chamfer: leg size + optional angle (X-pair both orders), no fabricated 45", () => {
    expect(normalizeChamferCallout(".03 X 45 CHAMFER")).toMatchObject({ type: "chamfer", size_in: 0.03, angle_deg: 45 });
    expect(normalizeChamferCallout("45 X .03 CHAMFER")).toMatchObject({ angle_deg: 45, size_in: 0.03 });
    expect(normalizeChamferCallout("CHAMFER .03 X 118").angle_deg).toBe(118);
    expect(normalizeChamferCallout("CHAMFER .020")).toMatchObject({ type: "chamfer", angle_deg: null, size_in: 0.02, resolved: true });
    // size-X-size pair fabricates NO angle (R12 -- both decimals are sizes, no bare integer)
    expect(normalizeChamferCallout(".250 X .125 CHAMFER").angle_deg ?? "NONE").toBe("NONE");
  });

  it("unresolved when no chamfer/csk keyword (R12 -- the overloaded X notation is not a chamfer)", () => {
    expect(normalizeChamferCallout("2 X .500 DRILL").resolved).toBe(false);
    expect(normalizeChamferCallout(".750").resolved).toBe(false);
    expect(normalizeChamferCallout("").resolved).toBe(false);
    expect(normalizeChamferCallout(null).resolved).toBe(false);
  });
});

describe("resolveChamfer (the keyword gate)", () => {
  it("resolves a chamfer/csk-typed or chamfer/csk-text dim", () => {
    expect(resolveChamfer("chamfer", ".03 X 45 CHAMFER")).toMatchObject({ type: "chamfer", angle_deg: 45, size_in: 0.03 });
    // a non-chamfer TYPE but a csk text signal still resolves (gate fires on either)
    expect(resolveChamfer("linear", "82 DEG CSK .375")).toMatchObject({ type: "countersink", angle_deg: 82, diameter_in: 0.375 });
  });

  it("returns undefined for a plain dim / no keyword / empty raw (never invents a chamfer)", () => {
    expect(resolveChamfer("linear", "2 X .500 DRILL") ?? "NONE").toBe("NONE");
    expect(resolveChamfer("linear", ".500") ?? "NONE").toBe("NONE");
    expect(resolveChamfer("chamfer", "") ?? "NONE").toBe("NONE");
    expect(resolveChamfer("chamfer", null) ?? "NONE").toBe("NONE");
  });
});
