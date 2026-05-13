/**
 * MacroCandidateGateEngine — MS0-U4 LOAD-BEARING SAFETY coverage.
 *
 * Asserts the load-bearing safety invariants:
 *   1. S(x) ≥ 0.70 HARD BLOCK — no off-by-one at threshold.
 *      passed candidate has sxScore ≥ 0.70 AND zero BLOCKED signatures.
 *   2. Envelope failure ⇒ passed=false, dossier=null, NO emitted file.
 *   3. Materially-insane candidate (negative dim) ⇒ BLOCKED.
 *   4. needsOperatorReview=true on EVERY dossier (operator gate unconditional).
 *   5. The dossier carries the calculated VC expressions UNCHANGED — gate
 *      does NOT resolve them.
 *   6. Result has NO file/path/emitted/outputFile property (emit nothing on fail).
 */

import { describe, it, expect } from "vitest";
import type { MacroFillCandidate } from "../engines/MacroFillOrchestratorEngine.js";
import type { PartPrintFeatures } from "../engines/MacroFillOrchestratorEngine.js";

/** Build a fresh, known-good wafer-insert candidate via the U2 path. */
async function buildKnownGoodCandidate(machine = "OKUMA_LB-3000-EX"): Promise<MacroFillCandidate> {
  const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
  const features: PartPrintFeatures = {
    family: "waferinsert",
    stockDiameter_in: 1.32,
    finishODAtFace_in: 1.215,
    partLength_in: 0.787,
    odFeatureSize_in: 0.005,
    odFeatureType: "radius",
    odFeatureAngleDeg: 45,
    spotDrill: { diameter_in: 0.5, sfm: 130, pointAngleDeg: 90, usePeck: false, depth_in: 0.05 },
    zClearance_in: 0.25,
    xClearance_in: 0.1,
    odTaperEndDia_in: 1.1473,
    odTaperStartZ_in: 0.4,
    idMajorDia_in: 0.25,
    idTaperAngleOkumaDeg: 250,
    idFinishXDia_in: 0.0,
    thruDrill: { diameter_in: 0.171, sfm: 50, feedPerRev_ipr: 0.0022, pointAngleDeg: 118, usePeck: true, peckDepth_in: 0.13 },
    printSource: "JM_DIE/PART_A12345.pdf",
  };
  return macroFillOrchestratorEngine.fillCandidate(features, machine);
}

describe("MacroCandidateGateEngine — happy path (MS0-U4)", () => {
  it("PASSES a known-good wafer-insert candidate with S(x) ≥ 0.70", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const candidate = await buildKnownGoodCandidate();
    const result = macroCandidateGateEngine.gateCandidate(candidate);
    expect(result.passed).toBe(true);
    expect(result.sxScore).toBeGreaterThanOrEqual(0.70);
    expect(result.failingChecks).toEqual([]);
  });

  it("attaches a SafetyRecord with the full signature set", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const candidate = await buildKnownGoodCandidate();
    const result = macroCandidateGateEngine.gateCandidate(candidate);
    expect(result.safetyRecord.schemaVersion).toBe("1.0.0");
    expect(result.safetyRecord.candidateFamily).toBe("waferinsert");
    expect(result.safetyRecord.targetMachine).toBe("OKUMA_LB-3000-EX");
    expect(result.safetyRecord.signatures.length).toBe(5); // envelope + sanity + spindle + drillRatio + exprPreservation
    expect(result.safetyRecord.passed).toBe(true);
    expect(result.safetyRecord.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("builds a dossier with needsOperatorReview=true on pass", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const candidate = await buildKnownGoodCandidate();
    const result = macroCandidateGateEngine.gateCandidate(candidate);
    const dossier = result.dossier;
    expect(dossier === null).toBe(false);
    expect(dossier!.needsOperatorReview).toBe(true);
    expect(dossier!.setupSheetSummary).toContain("Macro family: waferinsert");
    expect(dossier!.setupSheetSummary).toContain("S(x) score:");
    expect(dossier!.firstPieceChecklist.length).toBeGreaterThanOrEqual(5);
  });

  it("HARD RULE: dossier carries calculated VC expressions UNCHANGED (gate must not resolve them)", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const candidate = await buildKnownGoodCandidate();
    const result = macroCandidateGateEngine.gateCandidate(candidate);
    // VC130 is the wafer spot-drill RPM expression — MUST stay as a string in the dossier
    const vc130Formula = result.dossier!.physicsReport.calculatedFormulas.VC130;
    expect(vc130Formula).toBe("[VC111 * 3.82] / VC110");
    expect(typeof vc130Formula).toBe("string");
  });
});

describe("MacroCandidateGateEngine — hard-block failure modes (MS0-U4)", () => {
  it("HARD RULE: a result with passed=false has dossier=null AND NO file/emit properties", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    // Manually construct a tainted candidate where calculated VCs have been
    // pre-computed (formula stripped to a numeric-looking string) — this
    // triggers the calc-VC-preservation gate to BLOCK.
    const good = await buildKnownGoodCandidate();
    const bad: MacroFillCandidate = {
      ...good,
      calculatedVars: {
        ...good.calculatedVars,
        // simulate a downstream engine pre-computing VC130 to a number-only string
        VC130: { formula: "993.2", result: 993.2, description: "spot drill RPM (pre-computed — BAD)" },
      },
    };
    const result = macroCandidateGateEngine.gateCandidate(bad);
    expect(result.passed).toBe(false);
    expect(result.dossier).toBe(null);
    // NO file/emit/output property exists on the result — emit nothing on fail
    expect(result).not.toHaveProperty("file");
    expect(result).not.toHaveProperty("emitted");
    expect(result).not.toHaveProperty("outputFile");
    expect(result).not.toHaveProperty("gcodeFile");
    // The blocked signature is named and surfaced
    const blocked = result.failingChecks.find(s => s.gate === "calculatedVcExpression");
    expect(blocked?.status).toBe("BLOCKED");
  });

  it("envelope failure (part too long for machine Z travel) ⇒ BLOCKED + dossier=null", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const good = await buildKnownGoodCandidate();
    // Mutate the candidate's filledVars to have a part length way past LU-15's 13" Z travel
    const oversized: MacroFillCandidate = {
      ...good,
      targetMachine: "OKUMA_LU-15",
      filledVars: {
        ...good.filledVars,
        VC104: { value: 20.0, source: "test", description: "PART LENGTH (deliberately oversized)" },
      },
    };
    const result = macroCandidateGateEngine.gateCandidate(oversized);
    expect(result.passed).toBe(false);
    expect(result.dossier).toBe(null);
    expect(result.safetyRecord.envelopeCheck.withinEnvelope).toBe(false);
    const envBlock = result.failingChecks.find(s => s.gate === "envelope");
    expect(envBlock?.status).toBe("BLOCKED");
    expect(envBlock?.detail).toContain("13");
  });

  it("material-sanity failure (negative dim) ⇒ BLOCKED + dossier=null", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const good = await buildKnownGoodCandidate();
    const insane: MacroFillCandidate = {
      ...good,
      filledVars: {
        ...good.filledVars,
        VC101: { value: -1.215, source: "test-corrupted", description: "FINISH OD AT FACE (negative — physically impossible)" },
      },
    };
    const result = macroCandidateGateEngine.gateCandidate(insane);
    expect(result.passed).toBe(false);
    expect(result.dossier).toBe(null);
    expect(result.safetyRecord.materialSanity.sane).toBe(false);
    expect(result.safetyRecord.materialSanity.issues.some(i => i.includes("VC101"))).toBe(true);
  });

  it("spindle speed exceeding machine max ⇒ BLOCKED", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const good = await buildKnownGoodCandidate("OKUMA_LB-4000-MY"); // 4000 RPM max
    const overspeed: MacroFillCandidate = {
      ...good,
      filledVars: {
        ...good.filledVars,
        VC198: { value: 8000, source: "test", description: "ROUGH MAX RPM (deliberately past machine ceiling)" },
      },
    };
    const result = macroCandidateGateEngine.gateCandidate(overspeed);
    expect(result.passed).toBe(false);
    expect(result.safetyRecord.spindleSpeedCheck.withinRange).toBe(false);
    expect(result.safetyRecord.spindleSpeedCheck.programMaxRpm).toBe(8000);
  });

  it("REJECTS a candidate missing needsGate=true (must come from U2 path)", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const good = await buildKnownGoodCandidate();
    const stripped = { ...good, needsGate: false as unknown as true };
    expect(() => macroCandidateGateEngine.gateCandidate(stripped))
      .toThrow(/needsGate must be true/);
  });
});

describe("MacroCandidateGateEngine — S(x) threshold boundary (MS0-U4)", () => {
  it("the threshold is EXACTLY 0.70 — the pass flag is `sxScore >= 0.70 AND no BLOCKED`", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const good = await buildKnownGoodCandidate();
    const result = macroCandidateGateEngine.gateCandidate(good);
    expect(result.sxScore).toBeGreaterThanOrEqual(0);
    expect(result.sxScore).toBeLessThanOrEqual(1);
    expect(result.passed).toBe(result.sxScore >= 0.70 && result.failingChecks.length === 0);
  });

  it("S(x) is computed as weighted sum / total weight (sums to expected score)", async () => {
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const good = await buildKnownGoodCandidate();
    const result = macroCandidateGateEngine.gateCandidate(good);
    const totalWeight = result.safetyRecord.signatures.reduce((s, sig) => s + sig.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
    const expectedScore = result.safetyRecord.signatures.reduce((s, sig) => {
      if (sig.status === "SAFE") return s + sig.weight;
      if (sig.status === "WARNING") return s + sig.weight * 0.5;
      return s; // BLOCKED contributes 0
    }, 0) / totalWeight;
    expect(result.sxScore).toBeCloseTo(expectedScore, 6);
  });
});

describe("MacroCandidateGateEngine — dispatcher wiring (MS0-U4)", () => {
  it("turningDispatcher declares macro_gate_candidate in ACTIONS + case handler", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/turningDispatcher.ts"),
      "utf-8",
    );
    expect(src).toContain(`"macro_gate_candidate"`);
    expect(src).toContain(`case "macro_gate_candidate":`);
    expect(src).toContain(`macroCandidateGateEngine`);
  });

  it("camDispatcher declares macro_gate_candidate in ACTIONS + case handler", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/camDispatcher.ts"),
      "utf-8",
    );
    expect(src).toContain(`"macro_gate_candidate"`);
    expect(src).toContain(`case "macro_gate_candidate":`);
  });

  it("end-to-end: U2.fillCandidate → U4.gateCandidate → passed dossier with operator-review flag", async () => {
    const { macroFillOrchestratorEngine } = await import("../engines/MacroFillOrchestratorEngine.js");
    const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
    const features: PartPrintFeatures = {
      family: "waferinsert",
      stockDiameter_in: 1.32, finishODAtFace_in: 1.215, partLength_in: 0.787,
      odFeatureSize_in: 0.005, odFeatureType: "radius", odFeatureAngleDeg: 45,
      spotDrill: { diameter_in: 0.5, sfm: 130, pointAngleDeg: 90, usePeck: false, depth_in: 0.05 },
      zClearance_in: 0.25, xClearance_in: 0.1,
      odTaperEndDia_in: 1.1473, odTaperStartZ_in: 0.4,
      idMajorDia_in: 0.25, idTaperAngleOkumaDeg: 250, idFinishXDia_in: 0.0,
      thruDrill: { diameter_in: 0.171, sfm: 50, feedPerRev_ipr: 0.0022, pointAngleDeg: 118, usePeck: true, peckDepth_in: 0.13 },
      printSource: "E2E_TEST",
    };
    const candidate = macroFillOrchestratorEngine.fillCandidate(features, "OKUMA_LB-3000-EX");
    const gateResult = macroCandidateGateEngine.gateCandidate(candidate);
    expect(gateResult.passed).toBe(true);
    expect(gateResult.dossier === null).toBe(false);
    expect(gateResult.dossier!.needsOperatorReview).toBe(true);
    expect(gateResult.dossier!.physicsReport.calculatedFormulas.VC130).toMatch(/VC111.*VC110/);
  });
});
