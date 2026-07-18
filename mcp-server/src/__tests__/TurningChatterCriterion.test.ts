/**
 * TurningChatterCriterion.test.ts -- slot:whiskey (Kienzle Lathe Wizard)
 * =====================================================================
 * R9 for U-W-FIX-CHATTER-TURNING (gap-to-100 factor 5): the wizard's turning
 * chatter pre-check previously applied a MILLING stability-lobe model to turning
 * (flute/immersion semantics), false-flagging most turning ops as "unstable". It
 * now uses the Tlusty single-DOF orthogonal-cut limit b_lim = 2*zeta*k/Kc, computed
 * inline from a cantilever tool-point stiffness (k = 3EI/L^3). Two layers: (1) the
 * pure physics -- a stiff stout OD shank tolerates a far deeper cut than a slender
 * boring bar (b_lim ~ stiffness); (2) the WIRING -- a normal OD-turn part is no
 * longer false-flagged. The check is ADVISORY (a note + a chatter_checks record),
 * never a veto, so it can never gate emission.
 */
import { describe, it, expect } from "vitest";
import {
  turningPrintToProgramEngine,
  cantileverTipStiffnessNm,
  turningChatterLimitMm,
} from "../engines/TurningPrintToProgramEngine.js";
import { getToolModulus } from "../physics/constants.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

const E_CARBIDE_PA = getToolModulus("carbide") * 1e6; // 600 GPa
const ZETA = 0.035;
const KC_P = 1800; // P-steel kc1.1 (N/mm^2)

// Cantilever k then Tlusty b_lim for a representative tool geometry.
const bLim = (dMm: number, lMm: number) =>
  turningChatterLimitMm(cantileverTipStiffnessNm(dMm, lMm, E_CARBIDE_PA), ZETA, KC_P);

describe("turning regenerative-chatter limit (Tlusty single-DOF, inline)", () => {
  it("a stout OD shank (20mm dia / 30mm overhang) has a deep stable limit (~20mm, well above any DOC)", () => {
    const stiff = bLim(20, 30);
    expect(stiff).toBeGreaterThan(15);
    expect(stiff).toBeLessThan(26);
    expect(stiff).toBeGreaterThan(3); // a normal 1-3mm rough DOC is stable
  });

  it("a slender boring bar (12mm dia / 48mm overhang) has a shallow stable limit (<1mm) -> flags an aggressive cut", () => {
    const slender = bLim(12, 48);
    expect(slender).toBeLessThan(1);
    expect(slender).toBeGreaterThan(0.2);
    expect(slender).toBeLessThan(3); // a 3mm DOC would (correctly) be flagged
  });

  it("b_lim scales with tool-point stiffness: stiffer shank > slender bar (real signal, not a constant)", () => {
    expect(bLim(20, 30)).toBeGreaterThan(bLim(12, 48));
  });

  it("longer overhang lowers the stable limit (k ~ 1/L^3); larger diameter raises it (k ~ d^4)", () => {
    expect(bLim(20, 60)).toBeLessThan(bLim(20, 30));   // 2x overhang -> ~8x less stiff -> lower b_lim
    expect(bLim(25, 30)).toBeGreaterThan(bLim(20, 30)); // bigger shank -> stiffer -> higher b_lim
  });

  it("degenerate input returns Infinity (an advisory must never fabricate a chatter verdict)", () => {
    expect(turningChatterLimitMm(0, ZETA, KC_P)).toBe(Infinity);
    expect(turningChatterLimitMm(5e8, 0, KC_P)).toBe(Infinity);
    expect(turningChatterLimitMm(5e8, ZETA, 0)).toBe(Infinity);
  });
});

describe("turning chatter WIRING -- a normal OD-turn part is not false-flagged (milling-model regression fixed)", () => {
  const odTurnPart = {
    part_number: "CHATTER-TEST",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 25,
    part_length_mm: 60,
    features: [
      { type: "od_turn" as const, x_start_mm: 25, x_end_mm: 20, z_start_mm: 0, z_end_mm: -40, length_mm: 40 },
    ],
    machine_model: "Haas ST-20",
  };

  it("no OD-turn op carries a turning-regenerative chatter note for a stiff stout shank", () => {
    const r = turningPrintToProgramEngine.runPipeline(odTurnPart as unknown as PipeIn);
    const hasChatterNote = r.operations.some(
      (o) => ((o as { notes?: string[] }).notes ?? []).some((n) => n.startsWith("Chatter risk (turning regenerative)")),
    );
    expect(hasChatterNote).toBe(false);
  });

  it("every emitted chatter_check for the stout OD tool is marked stable (no false unstable)", () => {
    const r = turningPrintToProgramEngine.runPipeline(odTurnPart as unknown as PipeIn);
    const checks = r.chatter_checks ?? [];
    expect(checks.every((c) => c.stable === true)).toBe(true);
  });
});
