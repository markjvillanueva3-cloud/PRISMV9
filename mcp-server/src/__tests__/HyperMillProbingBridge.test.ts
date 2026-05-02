/**
 * HyperMillProbingBridge.test.ts
 *
 * Coverage for HM-REV-MS5 / U-HMR27 + U-HMR28 probing bridge wiring.
 * Validates probe cycle lookup (6 types × 3 systems), approach speed gating,
 * ISO 10360-2 measurement uncertainty, and WCS datum verification.
 *
 * CAM-EXHAUST-MS0 / U-CAM-HM-PROBE-TESTS-01
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillProbingBridge,
  hyperMillProbingBridge,
  type ProbeInput,
  type ProbeSystem,
} from "../engines/HyperMillProbingBridge.js";

const ENGINE = new HyperMillProbingBridge();

function input(over: Partial<ProbeInput>): ProbeInput {
  return {
    probeType: over.probeType ?? "bore",
    probeSystem: over.probeSystem ?? "renishaw",
    nominalDiameter_mm: over.nominalDiameter_mm,
    nominalZ_mm: over.nominalZ_mm,
    approachSpeed_mmmin: over.approachSpeed_mmmin,
    partTolerance_mm: over.partTolerance_mm,
    wcsRegister: over.wcsRegister,
    measuredValue_mm: over.measuredValue_mm,
    nominalDatum_mm: over.nominalDatum_mm,
    toolDiameter_mm: over.toolDiameter_mm,
  };
}

describe("HyperMillProbingBridge — cycle lookup (6 probe types × 3 systems)", () => {
  it("bore + renishaw maps to G65 P9815", () => {
    const r = ENGINE.calculate(input({ probeType: "bore", probeSystem: "renishaw" }));
    expect(r.cycleCall).toBe("G65 P9815");
    expect(r.hyperMillCycle).toBe("Bore Centre Finding");
  });

  it("boss + heidenhain maps to TCH PROBE 421", () => {
    const r = ENGINE.calculate(input({ probeType: "boss", probeSystem: "heidenhain" }));
    expect(r.cycleCall).toBe("TCH PROBE 421");
    expect(r.hyperMillCycle).toBe("Boss Centre Finding");
  });

  it("tool_set + blum maps to G65 P9010", () => {
    const r = ENGINE.calculate(input({ probeType: "tool_set", probeSystem: "blum" }));
    expect(r.cycleCall).toBe("G65 P9010");
    expect(r.hyperMillCycle).toBe("Tool Length Measurement");
  });

  it("web + heidenhain maps to TCH PROBE 430", () => {
    const r = ENGINE.calculate(input({ probeType: "web", probeSystem: "heidenhain" }));
    expect(r.cycleCall).toBe("TCH PROBE 430");
  });

  it("tool_break + renishaw maps to G65 P9825", () => {
    const r = ENGINE.calculate(input({
      probeType: "tool_break", probeSystem: "renishaw", toolDiameter_mm: 6,
    }));
    expect(r.cycleCall).toBe("G65 P9825");
  });

  it("surface + blum maps to G65 P9000", () => {
    const r = ENGINE.calculate(input({
      probeType: "surface", probeSystem: "blum", nominalZ_mm: -10,
    }));
    expect(r.cycleCall).toBe("G65 P9000");
  });
});

describe("HyperMillProbingBridge — approach speed validation", () => {
  it("speed within max passes validation (renishaw 800 < 1000)", () => {
    const r = ENGINE.calculate(input({ approachSpeed_mmmin: 800, probeSystem: "renishaw" }));
    expect(r.approachSpeedValid).toBe(true);
    expect(r.validatedApproachSpeed_mmmin).toBe(800);
  });

  it("excessive speed clamps to max + emits warning (renishaw 2000 → 1000)", () => {
    const r = ENGINE.calculate(input({ approachSpeed_mmmin: 2000, probeSystem: "renishaw" }));
    expect(r.approachSpeedValid).toBe(false);
    expect(r.validatedApproachSpeed_mmmin).toBe(1000);
    expect(r.warnings.some(w => w.includes("exceeds renishaw max"))).toBe(true);
  });

  it("blum has tighter max (500) than renishaw (1000)", () => {
    const r = ENGINE.calculate(input({ approachSpeed_mmmin: 700, probeSystem: "blum" }));
    expect(r.approachSpeedValid).toBe(false);
    expect(r.validatedApproachSpeed_mmmin).toBe(500);
  });

  it("heidenhain max is 800 (between renishaw and blum)", () => {
    const r = ENGINE.calculate(input({ approachSpeed_mmmin: 900, probeSystem: "heidenhain" }));
    expect(r.approachSpeedValid).toBe(false);
    expect(r.validatedApproachSpeed_mmmin).toBe(800);
  });

  it("default speed = 50% of max when none provided (renishaw → 500)", () => {
    const r = ENGINE.calculate(input({ probeSystem: "renishaw" }));
    expect(r.validatedApproachSpeed_mmmin).toBe(500);
    expect(r.approachSpeedValid).toBe(true);
  });
});

describe("HyperMillProbingBridge — measurement uncertainty (ISO 10360-2 adapted)", () => {
  it("typeA matches probe manufacturer spec (renishaw=1.0μm 2σ)", () => {
    const r = ENGINE.calculate(input({ probeSystem: "renishaw" }));
    expect(r.uncertainty.typeA_um).toBe(1.0);
  });

  it("typeA matches probe manufacturer spec (blum=1.2μm 2σ)", () => {
    const r = ENGINE.calculate(input({ probeSystem: "blum" }));
    expect(r.uncertainty.typeA_um).toBe(1.2);
  });

  it("typeA matches probe manufacturer spec (heidenhain=0.8μm 2σ — best repeatability)", () => {
    const r = ENGINE.calculate(input({ probeSystem: "heidenhain" }));
    expect(r.uncertainty.typeA_um).toBe(0.8);
  });

  it("expanded_um = 2 × combined_um (k=2, 95% confidence)", () => {
    const r = ENGINE.calculate(input({}));
    expect(r.uncertainty.expanded_um).toBeCloseTo(r.uncertainty.combined_um * 2, 1);
  });

  it("combined_um = √(typeA² + typeB²) — RSS rule", () => {
    const r = ENGINE.calculate(input({}));
    const expected = Math.sqrt(r.uncertainty.typeA_um ** 2 + r.uncertainty.typeB_um ** 2);
    expect(r.uncertainty.combined_um).toBeCloseTo(expected, 1);
  });

  it("typeB > 0 (always has roughness + temp drift contributions)", () => {
    const r = ENGINE.calculate(input({}));
    expect(r.uncertainty.typeB_um).toBeGreaterThan(0);
  });

  it("dominantSource string identifies the dominant contributor", () => {
    const r = ENGINE.calculate(input({}));
    const namesProbe = r.uncertainty.dominantSource.includes("Probe repeatability");
    const namesRoughness = r.uncertainty.dominantSource.includes("roughness");
    expect(namesProbe || namesRoughness).toBe(true);
  });
});

describe("HyperMillProbingBridge — WCS verification (integrated path)", () => {
  it("WCS verification populated when measured + nominal provided", () => {
    const r = ENGINE.calculate(input({
      measuredValue_mm: 100.02, nominalDatum_mm: 100.00, partTolerance_mm: 0.05,
    }));
    expect(r.wcsVerification === undefined).toBe(false);
    expect(r.wcsVerification!.measured_mm).toBe(100.02);
    expect(r.wcsVerification!.nominal_mm).toBe(100.00);
  });

  it("deviation within tolerance → withinTolerance=true, no WCS warning", () => {
    const r = ENGINE.calculate(input({
      measuredValue_mm: 100.01, nominalDatum_mm: 100.00, partTolerance_mm: 0.05,
    }));
    expect(r.wcsVerification!.withinTolerance).toBe(true);
    expect(r.warnings.some(w => w.includes("WCS deviation"))).toBe(false);
  });

  it("deviation exceeds tolerance → withinTolerance=false + warning emitted", () => {
    const r = ENGINE.calculate(input({
      measuredValue_mm: 100.20, nominalDatum_mm: 100.00, partTolerance_mm: 0.05,
    }));
    expect(r.wcsVerification!.withinTolerance).toBe(false);
    expect(r.warnings.some(w => w.includes("WCS deviation"))).toBe(true);
  });

  it("WCS verification absent when no measured/nominal supplied", () => {
    const r = ENGINE.calculate(input({}));
    expect(r.wcsVerification === undefined).toBe(true);
  });

  it("partTolerance defaults to 0.05mm when not specified", () => {
    const r = ENGINE.calculate(input({
      measuredValue_mm: 50.04, nominalDatum_mm: 50.00,
    }));
    expect(r.wcsVerification!.withinTolerance).toBe(true); // 0.04 < 0.05 default
  });

  it("wcsRegister defaults to G54 when not specified", () => {
    const r = ENGINE.calculate(input({
      measuredValue_mm: 0, nominalDatum_mm: 0,
    }));
    expect(r.wcsVerification!.wcsRegister).toBe("G54");
  });
});

describe("HyperMillProbingBridge — probe-type specific warnings", () => {
  it("small bore (Ø < 8mm) emits stylus warning", () => {
    const r = ENGINE.calculate(input({
      probeType: "bore", nominalDiameter_mm: 5,
    }));
    expect(r.warnings.some(w => w.includes("Small bore"))).toBe(true);
    expect(r.warnings.some(w => w.includes("stylus ball"))).toBe(true);
  });

  it("normal bore (Ø ≥ 8mm) does not emit small-bore warning", () => {
    const r = ENGINE.calculate(input({
      probeType: "bore", nominalDiameter_mm: 12,
    }));
    expect(r.warnings.some(w => w.includes("Small bore"))).toBe(false);
  });

  it("tool_break without toolDiameter_mm emits warning", () => {
    const r = ENGINE.calculate(input({ probeType: "tool_break" }));
    expect(r.warnings.some(w => w.includes("toolDiameter_mm"))).toBe(true);
  });

  it("tool_break with toolDiameter_mm has no diameter warning", () => {
    const r = ENGINE.calculate(input({
      probeType: "tool_break", toolDiameter_mm: 6,
    }));
    expect(r.warnings.some(w => w.includes("toolDiameter_mm"))).toBe(false);
  });

  it("surface probe without nominalZ_mm emits warning", () => {
    const r = ENGINE.calculate(input({ probeType: "surface" }));
    expect(r.warnings.some(w => w.includes("nominalZ_mm"))).toBe(true);
  });
});

describe("HyperMillProbingBridge — verifyWCS standalone", () => {
  it("correctedOffset = -deviation (sign convention: shift WCS opposite of part shift)", () => {
    const r = ENGINE.verifyWCS({
      measured_mm: 100.10, nominal_mm: 100.00,
      partTolerance_mm: 0.05, wcsRegister: "G54",
    });
    expect(r.deviation_mm).toBeCloseTo(0.10, 4);
    expect(r.correctedOffset_mm).toBeCloseTo(-0.10, 4);
  });

  it("zero deviation → correctedOffset = 0, withinTolerance = true", () => {
    const r = ENGINE.verifyWCS({
      measured_mm: 50.00, nominal_mm: 50.00,
      partTolerance_mm: 0.01, wcsRegister: "G55",
    });
    expect(r.deviation_mm).toBeCloseTo(0, 4);
    expect(r.correctedOffset_mm).toBeCloseTo(0, 4);
    expect(r.withinTolerance).toBe(true);
  });

  it("message contains wcsRegister name", () => {
    const r = ENGINE.verifyWCS({
      measured_mm: 25.0, nominal_mm: 25.0,
      partTolerance_mm: 0.01, wcsRegister: "G57",
    });
    expect(r.message.includes("G57")).toBe(true);
  });

  it("out-of-tolerance message says EXCEEDS + lists corrected offset", () => {
    const r = ENGINE.verifyWCS({
      measured_mm: 100.5, nominal_mm: 100.0,
      partTolerance_mm: 0.05, wcsRegister: "G54",
    });
    expect(r.message.includes("EXCEEDS")).toBe(true);
    expect(r.message.includes("apply correction")).toBe(true);
  });

  it("standalone verifyWCS produces same correctedOffset as integrated path", () => {
    const standalone = ENGINE.verifyWCS({
      measured_mm: 100.03, nominal_mm: 100.00,
      partTolerance_mm: 0.05, wcsRegister: "G54",
    });
    const integrated = ENGINE.calculate(input({
      measuredValue_mm: 100.03, nominalDatum_mm: 100.00, partTolerance_mm: 0.05,
    }));
    expect(integrated.wcsVerification!.correctedOffset_mm).toBeCloseTo(
      standalone.correctedOffset_mm, 4,
    );
  });

  it("deviation rounded to 4 decimal places", () => {
    const r = ENGINE.verifyWCS({
      measured_mm: 1.123456789, nominal_mm: 1.000000000,
      partTolerance_mm: 1.0, wcsRegister: "G54",
    });
    expect(r.deviation_mm).toBe(0.1235); // rounded to 4 decimals
  });
});

describe("HyperMillProbingBridge — listProbeTypes catalog", () => {
  it("returns all 6 probe types for renishaw", () => {
    const list = ENGINE.listProbeTypes("renishaw");
    expect(list.length).toBe(6);
    const types = list.map(e => e.probeType).sort();
    expect(types).toEqual(["bore", "boss", "surface", "tool_break", "tool_set", "web"]);
  });

  it("each entry exposes the system's max approach speed", () => {
    const list = ENGINE.listProbeTypes("blum");
    expect(list.every(e => e.maxApproachSpeed_mmmin === 500)).toBe(true);
  });

  it("heidenhain catalog uses TCH PROBE cycle calls", () => {
    const list = ENGINE.listProbeTypes("heidenhain");
    expect(list.every(e => e.cycleCall.startsWith("TCH PROBE"))).toBe(true);
  });

  it("defaults to renishaw when no system supplied", () => {
    const list = ENGINE.listProbeTypes();
    const bore = list.find(e => e.probeType === "bore")!;
    expect(bore.cycleCall).toBe("G65 P9815");
  });
});

describe("HyperMillProbingBridge — getWCSUpdateCall", () => {
  const cases: Array<[ProbeSystem, string]> = [
    ["renishaw", "G65 P9832"],
    ["blum", "G65 P9005"],
    ["heidenhain", "TCH PROBE 0"],
  ];
  for (const [sys, expected] of cases) {
    it(`${sys} → ${expected}`, () => {
      expect(ENGINE.getWCSUpdateCall(sys)).toBe(expected);
    });
  }
});

describe("HyperMillProbingBridge — confidence + source attribution", () => {
  it("clean input (no warnings) yields 0.93 confidence", () => {
    const r = ENGINE.calculate(input({
      probeType: "bore", nominalDiameter_mm: 25,
      approachSpeed_mmmin: 600, probeSystem: "renishaw",
    }));
    expect(r.warnings.length).toBe(0);
    expect(r.confidence).toBeCloseTo(0.93, 2);
  });

  it("warnings + valid speed yields 0.80 confidence", () => {
    const r = ENGINE.calculate(input({
      probeType: "tool_break", probeSystem: "renishaw",
      // missing toolDiameter_mm → triggers warning, but speed defaults are valid
    }));
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.approachSpeedValid).toBe(true);
    expect(r.confidence).toBeCloseTo(0.80, 2);
  });

  it("invalid speed yields 0.65 confidence", () => {
    const r = ENGINE.calculate(input({
      approachSpeed_mmmin: 5000, probeSystem: "renishaw",
    }));
    expect(r.approachSpeedValid).toBe(false);
    expect(r.confidence).toBeCloseTo(0.65, 2);
  });

  it("source attributes Renishaw + ISO-10360-2 + Heidenhain", () => {
    const r = ENGINE.calculate(input({}));
    expect(r.source.includes("Renishaw")).toBe(true);
    expect(r.source.includes("ISO-10360-2")).toBe(true);
    expect(r.source.includes("Heidenhain")).toBe(true);
  });
});

describe("HyperMillProbingBridge — singleton + dispatcher round-trip", () => {
  it("singleton produces identical result to fresh instance", () => {
    const r1 = ENGINE.calculate(input({}));
    const r2 = hyperMillProbingBridge.calculate(input({}));
    expect(r2.cycleCall).toBe(r1.cycleCall);
    expect(r2.uncertainty.combined_um).toBeCloseTo(r1.uncertainty.combined_um, 4);
    expect(r2.confidence).toBe(r1.confidence);
  });

  it("dispatcher exposes cam_hypermill_probe_setup action", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_hypermill_probe_setup");
  });

  it("dispatcher exposes cam_hypermill_probe_wcs_verify action", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_hypermill_probe_wcs_verify");
  });

  it("engine reachable via dynamic-import path used by dispatcher", async () => {
    const mod = await import("../engines/HyperMillProbingBridge.js");
    const r = mod.hyperMillProbingBridge.calculate(input({}));
    expect(r.source.includes("Renishaw")).toBe(true);
  });
});
