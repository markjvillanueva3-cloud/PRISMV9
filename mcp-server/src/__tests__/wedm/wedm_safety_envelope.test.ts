/**
 * WEDMSafetyEnvelopeEngine tests — WEDM AGI Phase 4 / P4-MS2 / U-P4-05.
 *
 * Covers the 6 roadmap constraints (tension / gap V / resistivity / tank /
 * axis / wire-breaks) plus envelope management + exception mapping.
 */
import { describe, it, expect } from "vitest";
import {
  WEDMSafetyEnvelopeEngine,
  wedmSafetyEnvelopeEngine,
  ROADMAP_DEFAULT_ENVELOPE,
  JM_DIE_DEFAULT_ENVELOPE,
  type EnvelopeReading,
  type EnvelopeViolation,
  type WEDMSafetyEnvelope,
} from "../../engines/WEDMSafetyEnvelopeEngine.js";

// ----------------------------------------------------------------------------
// Happy paths
// ----------------------------------------------------------------------------

describe("WEDMSafetyEnvelopeEngine — clean readings", () => {
  it("nominal mid-band reading → pass with zero violations", () => {
    const e = new WEDMSafetyEnvelopeEngine();
    const r = e.check({
      wire_tension_gf: 1200,
      gap_V: 50,
      resistivity_Mohm_cm: 7,
      tank_level_pct: 95,
      wire_breaks_in_window: 0,
    });
    expect(r.pass).toBe(true);
    expect(r.violations).toHaveLength(0);
    expect(e.isClean(r.reading)).toBe(true);
  });

  it("empty reading → pass (no fields to check)", () => {
    const e = new WEDMSafetyEnvelopeEngine();
    const r = e.check({});
    expect(r.pass).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it("undefined fields are skipped (not flagged)", () => {
    const e = new WEDMSafetyEnvelopeEngine();
    const r = e.check({ wire_tension_gf: 1200 });
    expect(r.violations).toHaveLength(0);
  });
});

// ----------------------------------------------------------------------------
// Per-constraint critical violations
// ----------------------------------------------------------------------------

describe("WEDMSafetyEnvelopeEngine — critical breaches (per roadmap constraint)", () => {
  const e = new WEDMSafetyEnvelopeEngine();

  it("wire tension below 500 gf → critical", () => {
    const r = e.check({ wire_tension_gf: 400 });
    expect(r.pass).toBe(false);
    expect(r.violations[0].severity).toBe("critical");
    expect(r.violations[0].param).toBe("wire_tension_gf");
    expect(r.violations[0].edge).toBe("low");
  });

  it("wire tension above 2000 gf → critical", () => {
    const r = e.check({ wire_tension_gf: 2200 });
    expect(r.pass).toBe(false);
    expect(r.violations[0].edge).toBe("high");
  });

  it("gap V below 20 → critical (low)", () => {
    const r = e.check({ gap_V: 10 });
    expect(r.pass).toBe(false);
    expect(r.violations[0].param).toBe("gap_V");
    expect(r.violations[0].edge).toBe("low");
  });

  it("gap V above 80 → critical (high)", () => {
    const r = e.check({ gap_V: 95 });
    expect(r.pass).toBe(false);
    expect(r.violations[0].edge).toBe("high");
  });

  it("resistivity below 3 MΩ·cm → critical", () => {
    const r = e.check({ resistivity_Mohm_cm: 2.5 });
    expect(r.pass).toBe(false);
    expect(r.violations[0].param).toBe("resistivity_Mohm_cm");
  });

  it("tank level below 80 % → critical", () => {
    const r = e.check({ tank_level_pct: 75 });
    expect(r.pass).toBe(false);
    expect(r.violations[0].param).toBe("tank_level_pct");
  });

  it("wire breaks ≥ 3 in window → critical", () => {
    const r = e.check({ wire_breaks_in_window: 3 });
    expect(r.pass).toBe(false);
    expect(r.violations[0].param).toBe("wire_breaks_in_window");
    expect(r.violations[0].edge).toBe("high");
  });

  it("multiple breaches reported in one call", () => {
    const r = e.check({
      wire_tension_gf: 100,
      tank_level_pct: 40,
      resistivity_Mohm_cm: 1,
    });
    expect(r.violations).toHaveLength(3);
    expect(r.pass).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// Warning band (inside limits, within soft band)
// ----------------------------------------------------------------------------

describe("WEDMSafetyEnvelopeEngine — warning band", () => {
  const e = new WEDMSafetyEnvelopeEngine();

  it("tension just above 500 gf (within 50 gf band) → warning, pass=true", () => {
    const r = e.check({ wire_tension_gf: 520 });
    expect(r.pass).toBe(true);
    expect(r.violations[0].severity).toBe("warning");
    expect(r.violations[0].edge).toBe("low");
  });

  it("gap_V just below 80 (within 5 V band) → warning", () => {
    const r = e.check({ gap_V: 77 });
    expect(r.pass).toBe(true);
    expect(r.violations[0].severity).toBe("warning");
    expect(r.violations[0].edge).toBe("high");
  });

  it("tank level 83 % (80–85) → warning", () => {
    const r = e.check({ tank_level_pct: 83 });
    expect(r.pass).toBe(true);
    expect(r.violations[0].severity).toBe("warning");
  });

  it("isClean() is false if there are any warnings", () => {
    expect(e.isClean({ wire_tension_gf: 520 })).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// Envelope management
// ----------------------------------------------------------------------------

describe("WEDMSafetyEnvelopeEngine — envelope management", () => {
  it("default envelope is the roadmap-default", () => {
    const e = new WEDMSafetyEnvelopeEngine();
    expect(e.getEnvelope().id).toBe(ROADMAP_DEFAULT_ENVELOPE.id);
  });

  it("setEnvelope swaps the active envelope", () => {
    const e = new WEDMSafetyEnvelopeEngine();
    e.setEnvelope(JM_DIE_DEFAULT_ENVELOPE);
    expect(e.getEnvelope().id).toBe("jm_die_mv2400s");
  });

  it("JM Die envelope flags axis overrun", () => {
    const e = new WEDMSafetyEnvelopeEngine(JM_DIE_DEFAULT_ENVELOPE);
    const r = e.check({ X_mm: 650 });
    expect(r.pass).toBe(false);
    expect(r.violations[0].param).toBe("X_mm");
    expect(r.violations[0].edge).toBe("high");
  });

  it("setEnvelope rejects envelope without id", () => {
    const e = new WEDMSafetyEnvelopeEngine();
    const bad = { id: "", description: "x", limits: {} } as WEDMSafetyEnvelope;
    expect(() => e.setEnvelope(bad)).toThrow();
  });

  it("getEnvelope returns a copy of limits (can't be mutated externally)", () => {
    const e = new WEDMSafetyEnvelopeEngine();
    const snap = e.getEnvelope();
    (snap.limits as Record<string, unknown>).wire_tension_gf = undefined;
    const again = e.getEnvelope();
    expect(again.limits.wire_tension_gf).toBeDefined();
  });

  it("singleton export exists and uses roadmap default", () => {
    expect(wedmSafetyEnvelopeEngine.getEnvelope().id).toBe("roadmap_default");
  });
});

// ----------------------------------------------------------------------------
// Exception-type mapping
// ----------------------------------------------------------------------------

describe("WEDMSafetyEnvelopeEngine.mapViolationToException()", () => {
  function vio(param: EnvelopeViolation["param"], edge: "low" | "high"): EnvelopeViolation {
    return {
      param,
      severity: "critical",
      value: 0,
      limit: {},
      edge,
      reason: "test",
    };
  }

  it("wire_tension_gf → wire_tension_out", () => {
    expect(
      WEDMSafetyEnvelopeEngine.mapViolationToException(vio("wire_tension_gf", "low")),
    ).toBe("wire_tension_out");
  });

  it("gap_V low → short_circuit", () => {
    expect(
      WEDMSafetyEnvelopeEngine.mapViolationToException(vio("gap_V", "low")),
    ).toBe("short_circuit");
  });

  it("gap_V high → open_circuit", () => {
    expect(
      WEDMSafetyEnvelopeEngine.mapViolationToException(vio("gap_V", "high")),
    ).toBe("open_circuit");
  });

  it("resistivity low → resistivity_low", () => {
    expect(
      WEDMSafetyEnvelopeEngine.mapViolationToException(vio("resistivity_Mohm_cm", "low")),
    ).toBe("resistivity_low");
  });

  it("tank level → tank_low", () => {
    expect(
      WEDMSafetyEnvelopeEngine.mapViolationToException(vio("tank_level_pct", "low")),
    ).toBe("tank_low");
  });

  it("axis overrun → axis_overrun", () => {
    expect(
      WEDMSafetyEnvelopeEngine.mapViolationToException(vio("X_mm", "high")),
    ).toBe("axis_overrun");
  });

  it("wire_breaks_in_window → wire_break", () => {
    expect(
      WEDMSafetyEnvelopeEngine.mapViolationToException(vio("wire_breaks_in_window", "high")),
    ).toBe("wire_break");
  });
});

// ----------------------------------------------------------------------------
// Realistic scenario
// ----------------------------------------------------------------------------

describe("WEDMSafetyEnvelopeEngine — realistic scenario", () => {
  it("tank siphoning + wire break count = 2 → pass with warnings only", () => {
    const e = new WEDMSafetyEnvelopeEngine();
    const reading: EnvelopeReading = {
      wire_tension_gf: 1100,
      gap_V: 55,
      resistivity_Mohm_cm: 5.5,
      tank_level_pct: 82,
      wire_breaks_in_window: 2,
    };
    const r = e.check(reading);
    expect(r.pass).toBe(true);
    // tank_level 82 is inside softBand_low of 5 from 80 → warning on tank_level_pct.
    const params = r.violations.map((v) => v.param);
    expect(params).toContain("tank_level_pct");
    expect(r.violations.every((v) => v.severity === "warning")).toBe(true);
  });
});
