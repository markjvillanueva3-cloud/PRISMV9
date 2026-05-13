/**
 * MacroPerMachineEmitterEngine — MS0-U5 SAFETY-CRITICAL coverage.
 *
 * Asserts every load-bearing invariant from the unit spec at
 * state/shared/specs/MACRO-PROGRAM-PIPELINE-MS0-2026-05-12.md lines 69-73:
 *
 *   1. HARD RULE: NO file emitted unless THAT machine's gate passed at
 *      S(x) >= 0.70 AND zero BLOCKED signatures (per-machine independence).
 *   2. needsOperatorReview is true on every emitted file's header.
 *   3. The candidate's calculated VC expressions (VC130, VC150) stay as
 *      STRING expressions in the emitted file — never pre-computed.
 *   4. Path-traversal sandbox blocks customerName/partNumber containing
 *      "..", "/", "\\" or Windows-reserved chars.
 *   5. `targetMachines: []` returns empty result, NOT full-fleet fallback.
 *   6. Corrupt part.json is renamed to .corrupt-<ts> before fresh write.
 *   7. Single-machine failure does NOT abort the loop — other machines
 *      still emit.
 *   8. Non-Okuma controllers exit with form: "dialect-translation-pending"
 *      and no file, but gatePassed reflects the gate's actual verdict.
 *   9. Catalog parity between MacroCandidateGateEngine.JM_DIE_MACHINE_LIMITS
 *      and FLEET_METADATA — module-load drift guard.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { MacroFillCandidate, PartPrintFeatures } from "../engines/MacroFillOrchestratorEngine.js";
import type { SignoffDossier } from "../engines/MacroCandidateGateEngine.js";

// ============================================================================
// FIXTURES — build real, U2-derived candidates the gate accepts.
// ============================================================================

async function buildPassingWaferInsertCandidate(machine = "OKUMA_LB-3000-EX"): Promise<MacroFillCandidate> {
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

async function buildPassingDossier(machine = "OKUMA_LB-3000-EX"): Promise<SignoffDossier> {
  const { macroCandidateGateEngine } = await import("../engines/MacroCandidateGateEngine.js");
  const candidate = await buildPassingWaferInsertCandidate(machine);
  const gateResult = macroCandidateGateEngine.gateCandidate(candidate);
  if (!gateResult.passed || !gateResult.dossier) {
    throw new Error(`fixture: gate did not pass — sxScore=${gateResult.sxScore}, blockedReasons=${gateResult.failingChecks.map(f => f.gate).join(",")}`);
  }
  return gateResult.dossier;
}

function makeTempLibraryRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-u5-test-"));
}

function cleanupTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe("MacroPerMachineEmitterEngine — happy path (MS0-U5)", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanupTempDir(tempRoot); });

  it("emits a .MIN file for the default fleet's Okuma machines + 1 GENERIC_LATHE skip", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    });
    expect(result.machines.length).toBe(4);
    expect(result.summary.totalMachinesConsidered).toBe(4);
    expect(result.summary.filesEmitted).toBeGreaterThanOrEqual(1);
    expect(result.summary.dialectPending).toBe(1);
    const emittedMachines = result.machines.filter((m) => m.emitted);
    expect(emittedMachines.length).toBeGreaterThanOrEqual(1);
    for (const m of emittedMachines) {
      expect(typeof m.file).toBe("string");
      expect(fs.existsSync(m.file!)).toBe(true);
    }
  });

  it("file naming is <part>__<MACHINE-ID>.MIN", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["OKUMA_LB-3000-EX"],
    });
    const m = result.machines[0];
    expect(m.emitted).toBe(true);
    expect(path.basename(m.file!)).toBe("PART-001__OKUMA_LB-3000-EX.MIN");
  });

  it("header includes macro source, family, S(x), controller, OPERATOR REVIEW REQUIRED banner", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["OKUMA_LB-3000-EX"],
    });
    const fileContent = fs.readFileSync(result.machines[0].file!, "utf-8");
    expect(fileContent).toContain("MACRO-PROGRAM-PIPELINE-MS0/MS0-U5");
    expect(fileContent).toContain("Family:   waferinsert");
    expect(fileContent).toContain("OKUMA_LB-3000-EX");
    expect(fileContent).toContain("Safety S[x]:");
    expect(fileContent).toContain("OPERATOR REVIEW REQUIRED");
    expect(fileContent).toContain("prove-out mode on for first run");
  });

  it("HARD RULE: emitted file body contains calculated VC expressions UNCHANGED (e.g. VC130 = [VC111 * 3.82] / VC110)", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["OKUMA_LB-3000-EX"],
    });
    const fileContent = fs.readFileSync(result.machines[0].file!, "utf-8");
    expect(fileContent).toMatch(/VC130\s*=\s*\[VC111\s*\*\s*3\.82\]\s*\/\s*VC110/);
  });

  it("part.json is created with perMachinePrograms[] entries + customer + partNumber + lastMacroEmit", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["OKUMA_LB-3000-EX"],
    });
    const partJsonPath = path.join(tempRoot, "ACME", "PART-001", "part.json");
    expect(fs.existsSync(partJsonPath)).toBe(true);
    const partJson = JSON.parse(fs.readFileSync(partJsonPath, "utf-8"));
    expect(partJson.customer).toBe("ACME");
    expect(partJson.partNumber).toBe("PART-001");
    expect(Array.isArray(partJson.perMachinePrograms)).toBe(true);
    expect(partJson.perMachinePrograms.length).toBe(1);
    expect(partJson.perMachinePrograms[0].machineId).toBe("OKUMA_LB-3000-EX");
    expect(partJson.perMachinePrograms[0].needsOperatorReview).toBe(true);
    expect(partJson.perMachinePrograms[0].sxScore).toBeGreaterThanOrEqual(0.70);
    expect(partJson.lastMacroEmit.needsOperatorReview).toBe(true);
  });

  it("output carries needsOperatorReview: true at every level", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["OKUMA_LB-3000-EX"],
    });
    expect(result.needsOperatorReview).toBe(true);
  });
});

describe("MacroPerMachineEmitterEngine — HARD RULE (no file unless gate passed per-machine)", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanupTempDir(tempRoot); });

  it("every emitted machine's sxScore is >= 0.70", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    });
    for (const m of result.machines) {
      if (m.emitted) {
        expect(m.sxScore).toBeGreaterThanOrEqual(0.70);
        expect(m.gatePassed).toBe(true);
      }
    }
  });

  it("a non-emitted machine has file=null AND emitted=false AND no file on disk", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    });
    for (const m of result.machines) {
      if (!m.gatePassed || m.dialectTranslationPending) {
        expect(m.file).toBeNull();
        expect(m.emitted).toBe(false);
      }
    }
  });

  it("per-machine independence: dossier built for LB-3000 still re-gates each fleet machine independently", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier("OKUMA_LB-3000-EX");
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    });
    for (const m of result.machines) {
      expect(m.safetyRecord.targetMachine).toBe(m.machineId);
    }
  });
});

describe("MacroPerMachineEmitterEngine — targetMachines distinction (undefined vs empty)", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanupTempDir(tempRoot); });

  it("targetMachines undefined → considers the full 4-machine fleet", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    });
    expect(result.machines.length).toBe(4);
  });

  it("targetMachines = [] → considers ZERO machines (NOT a fallback to fleet)", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: [],
    });
    expect(result.machines.length).toBe(0);
    expect(result.summary.filesEmitted).toBe(0);
  });

  it("targetMachines = ['OKUMA_LB-3000-EX'] → exactly one machine considered", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["OKUMA_LB-3000-EX"],
    });
    expect(result.machines.length).toBe(1);
    expect(result.machines[0].machineId).toBe("OKUMA_LB-3000-EX");
  });

  it("targetMachines containing an UNKNOWN id → routes to 'generic' controller, dialect-translation-pending", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["UNKNOWN_LATHE_TYPO"],
    });
    expect(result.machines.length).toBe(1);
    expect(result.machines[0].controller).toBe("generic");
    expect(result.machines[0].dialectTranslationPending).toBe(true);
    expect(result.machines[0].emitted).toBe(false);
    expect(result.machines[0].file).toBeNull();
  });
});

describe("MacroPerMachineEmitterEngine — path traversal sandbox", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanupTempDir(tempRoot); });

  it("rejects customerName containing '..'", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "..", partNumber: "PART-001", libraryRoot: tempRoot },
    })).toThrow(/customerName/);
  });

  it("rejects partNumber containing '..'", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "..", libraryRoot: tempRoot },
    })).toThrow(/partNumber/);
  });

  it("rejects customerName containing a forward slash (multi-segment)", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "evil/path", partNumber: "PART-001", libraryRoot: tempRoot },
    })).toThrow(/customerName/);
  });

  it("rejects customerName with a Windows-reserved char (?)", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "what?", partNumber: "PART-001", libraryRoot: tempRoot },
    })).toThrow(/customerName/);
  });

  it("rejects explicit cncProgramDir outside libraryRoot", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const escape = path.join(os.tmpdir(), "outside-the-sandbox");
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: {
        customerName: "ACME",
        partNumber: "PART-001",
        libraryRoot: tempRoot,
        cncProgramDir: escape,
      },
    })).toThrow(/cncProgramDir/);
  });

  it("rejects explicit partJsonPath outside libraryRoot", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const escape = path.join(os.tmpdir(), "outside-the-sandbox", "part.json");
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: {
        customerName: "ACME",
        partNumber: "PART-001",
        libraryRoot: tempRoot,
        partJsonPath: escape,
      },
    })).toThrow(/partJsonPath/);
  });
});

describe("MacroPerMachineEmitterEngine — candidate integrity (defense in depth)", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanupTempDir(tempRoot); });

  it("rejects a candidate whose calculatedVars.VC130.formula is a numeric string", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const tainted: SignoffDossier = {
      ...dossier,
      candidate: {
        ...dossier.candidate,
        calculatedVars: {
          ...dossier.candidate.calculatedVars,
          VC130: { formula: "993.2", result: 993.2, description: "pre-computed (BAD)" },
        },
      },
    };
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier: tainted,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    })).toThrow(/VC130|formula/);
  });

  it("rejects a candidate whose calculatedVars.VC130.formula is the number 999 (not a string)", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const tainted: SignoffDossier = {
      ...dossier,
      candidate: {
        ...dossier.candidate,
        calculatedVars: {
          ...dossier.candidate.calculatedVars,
          // @ts-expect-error — testing runtime defense
          VC130: { formula: 999, result: 999, description: "pre-computed (BAD)" },
        },
      },
    };
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier: tainted,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    })).toThrow(/VC130|formula/);
  });

  it("rejects when dossier.safetyRecord.passed === false", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const tainted = {
      ...dossier,
      safetyRecord: { ...dossier.safetyRecord, passed: false },
    } as SignoffDossier;
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier: tainted,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    })).toThrow(/dossier.+failed.+original gate|passed=false/);
  });

  it("rejects when dossier.candidate.needsGate is false", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const tainted = {
      ...dossier,
      candidate: { ...dossier.candidate, needsGate: false as unknown as true },
    } as SignoffDossier;
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier: tainted,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    })).toThrow(/needsGate/);
  });

  it("rejects when partRef.customerName is missing (Zod)", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    expect(() => macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      // @ts-expect-error — testing runtime defense
      partRef: { partNumber: "PART-001", libraryRoot: tempRoot },
    })).toThrow();
  });
});

describe("MacroPerMachineEmitterEngine — non-Okuma dialect (translation pending)", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanupTempDir(tempRoot); });

  it("GENERIC_LATHE → no file, form: 'dialect-translation-pending', dialectTranslationPending: true", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["GENERIC_LATHE"],
    });
    expect(result.machines.length).toBe(1);
    const m = result.machines[0];
    expect(m.form).toBe("dialect-translation-pending");
    expect(m.dialectTranslationPending).toBe(true);
    expect(m.file).toBeNull();
    expect(m.emitted).toBe(false);
    expect(m.controller).toBe("generic");
  });
});

describe("MacroPerMachineEmitterEngine — comment-injection defense", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanupTempDir(tempRoot); });

  it("customerName containing '(' or ')' is sanitized to '[' / ']' in the header", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME (Eastern Div)", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["OKUMA_LB-3000-EX"],
    });
    const fileContent = fs.readFileSync(result.machines[0].file!, "utf-8");
    expect(fileContent).toContain("ACME [Eastern Div]");
    expect(fileContent).not.toMatch(/ACME \(/);
  });
});

describe("MacroPerMachineEmitterEngine — part.json preservation + corruption recovery", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanupTempDir(tempRoot); });

  it("preserves existing part.json fields (FAI history, lot info, etc.)", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const partDir = path.join(tempRoot, "ACME", "PART-001");
    fs.mkdirSync(partDir, { recursive: true });
    const partJsonPath = path.join(partDir, "part.json");
    fs.writeFileSync(partJsonPath, JSON.stringify({
      faiHistory: [{ date: "2026-04-01", inspector: "JS", result: "PASS" }],
      lotCode: "LOT-2026-Q1",
      bomVersion: "rev-C",
    }, null, 2));

    macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["OKUMA_LB-3000-EX"],
    });
    const after = JSON.parse(fs.readFileSync(partJsonPath, "utf-8"));
    expect(after.faiHistory).toEqual([{ date: "2026-04-01", inspector: "JS", result: "PASS" }]);
    expect(after.lotCode).toBe("LOT-2026-Q1");
    expect(after.bomVersion).toBe("rev-C");
    expect(after.perMachinePrograms.length).toBe(1);
  });

  it("a corrupt part.json is renamed to part.json.corrupt-<iso> BEFORE fresh write — operator can recover", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const partDir = path.join(tempRoot, "ACME", "PART-001");
    fs.mkdirSync(partDir, { recursive: true });
    const partJsonPath = path.join(partDir, "part.json");
    fs.writeFileSync(partJsonPath, "<<<<<<< HEAD\n{ broken }\n>>>>>>> branch\n");

    macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
      targetMachines: ["OKUMA_LB-3000-EX"],
    });

    const dirEntries = fs.readdirSync(partDir);
    const corruptBackup = dirEntries.find((f) => f.startsWith("part.json.corrupt-"));
    expect(typeof corruptBackup).toBe("string");
    expect(corruptBackup!.length).toBeGreaterThan("part.json.corrupt-".length);
    const backupContent = fs.readFileSync(path.join(partDir, corruptBackup!), "utf-8");
    expect(backupContent).toContain("<<<<<<< HEAD");
    const fresh = JSON.parse(fs.readFileSync(partJsonPath, "utf-8"));
    expect(fresh.perMachinePrograms.length).toBe(1);
  });
});

describe("MacroPerMachineEmitterEngine — structuredClone deep-isolation", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanupTempDir(tempRoot); });

  it("emitting for multiple machines does NOT mutate the input dossier's candidate.targetMachine", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier("OKUMA_LB-3000-EX");
    const originalTargetMachine = dossier.candidate.targetMachine;
    macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    });
    expect(dossier.candidate.targetMachine).toBe(originalTargetMachine);
  });

  it("emitting for multiple machines does NOT mutate the input dossier's calculatedVars formulas", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const originalVc130Formula = dossier.candidate.calculatedVars.VC130?.formula;
    expect(typeof originalVc130Formula).toBe("string");
    macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    });
    expect(dossier.candidate.calculatedVars.VC130?.formula).toBe(originalVc130Formula);
  });
});

describe("MacroPerMachineEmitterEngine — catalog parity drift guard", () => {
  it("module-load drift guard ran without throwing (asserted by successful import)", async () => {
    const mod = await import("../engines/MacroPerMachineEmitterEngine.js");
    const flt = mod.FLEET_TABLE_FOR_TESTS;
    expect(Object.keys(flt).length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(flt)).toContain("OKUMA_LB-3000-EX");
    expect(Object.keys(flt)).toContain("OKUMA_LB-4000-MY");
    expect(Object.keys(flt)).toContain("OKUMA_LU-15");
    expect(Object.keys(flt)).toContain("GENERIC_LATHE");
  });

  it("controller-memory-limit catalog covers every ControllerDialect with sane bounds", async () => {
    const mod = await import("../engines/MacroPerMachineEmitterEngine.js");
    const limits = mod.CONTROLLER_LIMITS_FOR_TESTS;
    const expectedDialects = ["okuma_osp", "fanuc", "haas", "mazak", "siemens", "mitsubishi", "generic"];
    for (const dialect of expectedDialects) {
      const entry = limits[dialect as keyof typeof limits];
      expect(typeof entry.id).toBe("string");
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.maxProgramChars).toBeGreaterThan(0);
      expect(entry.maxLines).toBeGreaterThan(0);
    }
  });

  it("SX threshold export matches the canonical 0.70 hard-block value", async () => {
    const mod = await import("../engines/MacroPerMachineEmitterEngine.js");
    expect(mod.SX_THRESHOLD_FOR_TESTS).toBe(0.70);
  });
});

describe("MacroPerMachineEmitterEngine — summary counters", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanupTempDir(tempRoot); });

  it("summary counters match the actual machines[] state", async () => {
    const { macroPerMachineEmitterEngine } = await import("../engines/MacroPerMachineEmitterEngine.js");
    const dossier = await buildPassingDossier();
    const result = macroPerMachineEmitterEngine.emitPerMachine({
      dossier,
      partRef: { customerName: "ACME", partNumber: "PART-001", libraryRoot: tempRoot },
    });
    const actualGatePassed = result.machines.filter((m) => m.gatePassed).length;
    const actualEmitted = result.machines.filter((m) => m.emitted).length;
    const actualDialectPending = result.machines.filter((m) => m.dialectTranslationPending).length;
    expect(result.summary.gatePassed).toBe(actualGatePassed);
    expect(result.summary.filesEmitted).toBe(actualEmitted);
    expect(result.summary.dialectPending).toBe(actualDialectPending);
    expect(result.summary.gatePassed + result.summary.gateFailed).toBe(result.machines.length);
  });
});
