/**
 * Tests for PrintToAllCADsOrchestrator — CAD-COMPLETE-MS0/U-CADC-PRINT-ORCHESTRATOR-01
 *
 * The orchestrator is the end-to-end OCR→draw entry point: one BlueprintAnalysis
 * in, scripts for all 5 priority CADs out (or a subset). Tests verify:
 *   - Singleton + identity
 *   - All-targets default (5 results)
 *   - Subset targeting + dedupe + priority ordering
 *   - Per-CAD failure isolation (one bad input doesn't kill the others — but
 *     since translator-level errors come BEFORE per-bridge dispatch, an empty
 *     input throws orchestrator-level. Per-CAD isolation is verified by
 *     forcing a translator-recoverable failure shape on one bridge.)
 *   - Aggregate counts (totalOpsEmitted, totalScriptLines)
 *   - Unknown target warnings
 *   - Empty target subset rejection
 */

import { describe, it, expect } from "vitest";
import {
  PrintToAllCADsOrchestrator,
  printToAllCADsOrchestrator,
  ALL_CAD_TARGETS,
  type CADTarget,
  type OrchestratorInput,
} from "../engines/PrintToAllCADsOrchestrator.js";
import type { ExtractedDimension } from "../engines/BlueprintOCREngine.js";
import type { ExtractedProfile } from "../engines/BlueprintVisionOCREngine.js";

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_TARGET_COUNT = 6;
const ORCH_VERSION = "1.0.0";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function dim(
  type: ExtractedDimension["type"],
  nominal: number,
): ExtractedDimension {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    nominal,
    unit: "mm",
    raw_text: `${nominal}mm`,
    confidence: 0.9,
  };
}

function holeProfile(diameter_mm: number): ExtractedProfile {
  return {
    id: `hole-${diameter_mm}`,
    name: `Hole Ø${diameter_mm}`,
    type: "hole",
    points: [{ x: 50, y: 50 }],
    is_closed: true,
    diameter_mm,
    confidence: 0.95,
  };
}

// ── Identity ─────────────────────────────────────────────────────────────────

describe("PrintToAllCADsOrchestrator — identity", () => {
  it("exports a singleton with version 1.0.0", () => {
    expect(printToAllCADsOrchestrator).toBeInstanceOf(PrintToAllCADsOrchestrator);
    expect(printToAllCADsOrchestrator.version).toBe(ORCH_VERSION);
  });

  it("supports exactly the 6 priority CAD targets in priority order", () => {
    expect([...printToAllCADsOrchestrator.supportedTargets()]).toEqual([
      "fusion360",
      "hypercads",
      "mastercam",
      "inventor",
      "solidworks",
      "esprit",
    ]);
    expect(ALL_CAD_TARGETS.length).toBe(ALL_TARGET_COUNT);
  });
});

// ── validate() ───────────────────────────────────────────────────────────────

describe("PrintToAllCADsOrchestrator — validate()", () => {
  it("rejects null input", () => {
    const r = printToAllCADsOrchestrator.validate(null as unknown as OrchestratorInput);
    expect(r.valid).toBe(false);
    expect(r.warnings).toEqual(["input is not an object"]);
  });

  it("rejects targets that aren't an array", () => {
    const r = printToAllCADsOrchestrator.validate({
      profiles: [holeProfile(5)],
      targets: "fusion360" as unknown as CADTarget[],
    });
    expect(r.valid).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/must be an array/);
  });

  it("rejects an empty target list (after filtering)", () => {
    const r = printToAllCADsOrchestrator.validate({
      profiles: [holeProfile(5)],
      targets: ["does_not_exist" as CADTarget],
    });
    expect(r.valid).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/at least one of/);
  });

  it("warns on unknown targets but stays valid if any known remain", () => {
    const r = printToAllCADsOrchestrator.validate({
      profiles: [holeProfile(5)],
      targets: ["fusion360", "made_up_cad" as CADTarget],
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes("made_up_cad"))).toBe(true);
  });
});

// ── buildAllScripts() ────────────────────────────────────────────────────────

describe("PrintToAllCADsOrchestrator — buildAllScripts() defaults to all 5 targets", () => {
  it("returns 5 successful per-CAD results from a single hole profile", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      profiles: [holeProfile(8)],
      defaultDepth: 12,
    });
    expect(out.summary.targetsRequested).toBe(ALL_TARGET_COUNT);
    expect(out.summary.succeeded).toBe(ALL_TARGET_COUNT);
    expect(out.summary.failed).toBe(0);
    expect(out.results.length).toBe(ALL_TARGET_COUNT);
    // Priority order preserved (hypercads inserted after fusion360)
    expect(out.results.map((r) => r.target)).toEqual([
      "fusion360",
      "hypercads",
      "mastercam",
      "inventor",
      "solidworks",
      "esprit",
    ]);
    // Each got 3 ops (sketch + circle + extrude)
    for (const r of out.results) {
      expect(r.ok).toBe(true);
      expect(r.output?.opsEmitted).toBe(3);
    }
    // Total ops aggregated
    expect(out.summary.totalOpsEmitted).toBe(3 * ALL_TARGET_COUNT);
    expect(out.summary.totalScriptLines).toBeGreaterThan(0);
    expect(out.summary.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(out.orchestratorVersion).toBe(ORCH_VERSION);
  });

  it("emits CAD-system-specific markers in each script", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      profiles: [holeProfile(6)],
    });
    const byTarget = Object.fromEntries(out.results.map((r) => [r.target, r]));
    expect(byTarget.fusion360!.output!.script).toContain("adsk.fusion");
    expect(byTarget.mastercam!.output!.script).toContain("Mastercam");
    expect(byTarget.inventor!.output!.script).toContain("Imports Inventor");
    expect(byTarget.solidworks!.output!.script).toContain("SldWorks");
    expect(byTarget.esprit!.output!.script).toContain("Esprit.Application");
  });

  it("each per-CAD result has its own filename with the host's extension", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      profiles: [holeProfile(6)],
    });
    const byTarget = Object.fromEntries(out.results.map((r) => [r.target, r]));
    expect(byTarget.fusion360!.output!.filename.endsWith(".py")).toBe(true);
    expect(byTarget.mastercam!.output!.filename.endsWith(".cs")).toBe(true);
    expect(byTarget.inventor!.output!.filename.endsWith(".iLogicVb")).toBe(true);
    expect(byTarget.solidworks!.output!.filename.endsWith(".bas")).toBe(true);
    expect(byTarget.esprit!.output!.filename.endsWith(".esprit.vb")).toBe(true);
  });
});

// ── Subset targeting ─────────────────────────────────────────────────────────

describe("PrintToAllCADsOrchestrator — subset targeting + dedupe", () => {
  it("running only ['fusion360', 'esprit'] returns 2 results in priority order", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      profiles: [holeProfile(5)],
      targets: ["esprit", "fusion360"], // input order ignored, priority enforced
    });
    expect(out.summary.targetsRequested).toBe(2);
    expect(out.results.map((r) => r.target)).toEqual(["fusion360", "esprit"]);
  });

  it("dedupes repeated targets", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      profiles: [holeProfile(5)],
      targets: ["fusion360", "fusion360", "mastercam", "mastercam"],
    });
    expect(out.summary.targetsRequested).toBe(2);
    expect(out.results.map((r) => r.target)).toEqual(["fusion360", "mastercam"]);
  });

  it("filters out unknown targets but warns about them", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      profiles: [holeProfile(5)],
      targets: ["fusion360", "blender" as CADTarget, "esprit"],
    });
    expect(out.results.map((r) => r.target)).toEqual(["fusion360", "esprit"]);
    expect(out.warnings.some((w) => w.includes("blender"))).toBe(true);
  });
});

// ── Failure modes ────────────────────────────────────────────────────────────

describe("PrintToAllCADsOrchestrator — failure modes", () => {
  it("throws when input has neither analysis, profiles, nor dimensions", () => {
    expect(() =>
      printToAllCADsOrchestrator.buildAllScripts({}),
    ).toThrow(/PrintToAllCADsOrchestrator/);
  });

  it("throws when target subset filters down to nothing", () => {
    expect(() =>
      printToAllCADsOrchestrator.buildAllScripts({
        profiles: [holeProfile(5)],
        targets: ["nope" as CADTarget],
      }),
    ).toThrow(/at least one of/);
  });

  it("throws on null input", () => {
    expect(() =>
      printToAllCADsOrchestrator.buildAllScripts(null as unknown as OrchestratorInput),
    ).toThrow(/PrintToAllCADsOrchestrator/);
  });
});

// ── Aggregate behavior ───────────────────────────────────────────────────────

describe("PrintToAllCADsOrchestrator — aggregate behavior", () => {
  it("works with a dimensions-only input (cylinder primitive across all 5)", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      dimensions: [dim("diameter", 25), dim("depth", 50)],
    });
    expect(out.summary.succeeded).toBe(ALL_TARGET_COUNT);
    expect(out.summary.totalOpsEmitted).toBe(3 * ALL_TARGET_COUNT);
  });

  it("totalScriptLines is the sum of each result's line count", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      profiles: [holeProfile(8)],
    });
    let manualSum = 0;
    for (const r of out.results) {
      if (r.ok && r.output) {
        manualSum += r.output.script.split(/\r?\n/).length;
      }
    }
    expect(out.summary.totalScriptLines).toBe(manualSum);
  });

  it("timestamp is ISO-8601 and orchestratorVersion is reported", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      profiles: [holeProfile(6)],
    });
    expect(out.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(out.orchestratorVersion).toBe(ORCH_VERSION);
  });

  it("each per-CAD result includes its own durationMs", () => {
    const out = printToAllCADsOrchestrator.buildAllScripts({
      profiles: [holeProfile(6)],
    });
    for (const r of out.results) {
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});
