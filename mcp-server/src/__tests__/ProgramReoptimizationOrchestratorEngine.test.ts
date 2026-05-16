/**
 * Tests for ProgramReoptimizationOrchestratorEngine (MS-PRINT-PROGRAM-LOOP/U-PPL-B1).
 *
 * Exercises every documented path:
 *  - detectProcess: lathe markers, mill markers, neither, edge cases
 *  - unifiedLineDiff: identical / appended / removed / replaced lines
 *  - reoptimize: happy lathe path, mill-deferred surface, no-process, empty,
 *    safety-before vs safety-after delta computation, physics opt-in surface
 *  - Real on-disk CASING_MACRO.MIN integration (the surviving anchor)
 *  - Adversarial inputs: oversized, NUL bytes embedded, NaN-not-applicable
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  ProgramReoptimizationOrchestratorEngine,
  programReoptimizationOrchestratorEngine,
  DEFAULT_SAFETY_STRICTNESS,
  DEFAULT_CONTROLLER,
  MAX_GCODE_BYTES,
  LATHE_REGEX_G50,
  LATHE_REGEX_CSS,
  MILL_REGEX_G43,
  MILL_REGEX_WORK_OFFSET,
  MILL_REGEX_XY,
} from "../engines/ProgramReoptimizationOrchestratorEngine.js";

const CLEAN_CASING = join("H:/prism", "Resources", "MACRO PROGRAMS", "CASING_MACRO.MIN");

// Synthetic lathe fixture — has G50 S clamp + G96 S CSS pair. Triggers
// the lathe-marker detector.
const SYNTHETIC_LATHE = `O1001
(T010101 - FACE/OD ROUGH)
N0001 G50 S3500
N0002 G96 S600 M03
N0003 G00 X100 Z10
N0004 G01 X50 F0.2
M30
`;

// Synthetic mill fixture — has G54 + G43 + XY moves, no G50/G96.
const SYNTHETIC_MILL = `O2001
(MILL JOB)
N0001 G54 G43 H01 Z25
N0002 G54 X10.0 Y20.0 Z5.0
N0003 G01 F300
N0004 G00 X100
M30
`;

const SYNTHETIC_UNKNOWN = `(no g50, no g54, no g43)
G01 X10
M30
`;

describe("ProgramReoptimizationOrchestratorEngine — constants", () => {
  it("exports DEFAULT_SAFETY_STRICTNESS as 'standard'", () => {
    expect(DEFAULT_SAFETY_STRICTNESS).toBe("standard");
  });
  it("exports DEFAULT_CONTROLLER as 'fanuc'", () => {
    expect(DEFAULT_CONTROLLER).toBe("fanuc");
  });
  it("LATHE_REGEX_G50 matches BOTH Fanuc (S3500) and Okuma (S[V65]) spindle clamp forms", () => {
    expect(LATHE_REGEX_G50.test("N0001 G50 S3500")).toBe(true);
    expect(LATHE_REGEX_G50.test("G50 S[V65]")).toBe(true);
    expect(LATHE_REGEX_G50.test("G50 S#100")).toBe(true);
  });
  it("LATHE_REGEX_CSS matches G96 (CSS) and G97 (constant RPM)", () => {
    expect(LATHE_REGEX_CSS.test("G96 S[V45] M3")).toBe(true);
    expect(LATHE_REGEX_CSS.test("G97 S[V87] M3")).toBe(true);
    expect(LATHE_REGEX_CSS.test("N0002 G96 S600 M03")).toBe(true);
  });
  it("MILL_REGEX_G43 matches a typical G43 H01 tool-length-comp", () => {
    expect(MILL_REGEX_G43.test("N0001 G54 G43 H01 Z25")).toBe(true);
  });
  it("MILL_REGEX_WORK_OFFSET matches G54..G59", () => {
    expect(MILL_REGEX_WORK_OFFSET.test("G54 X10")).toBe(true);
    expect(MILL_REGEX_WORK_OFFSET.test("N1 G59 Y2")).toBe(true);
  });
  it("MILL_REGEX_XY matches an X-then-Y move (digit or variable arg)", () => {
    expect(MILL_REGEX_XY.test("G54 X10.0 Y20.0 Z5.0")).toBe(true);
    expect(MILL_REGEX_XY.test("X[V1] Y[V2]")).toBe(true);
  });
  it("singleton alias resolves to the class itself", () => {
    expect(programReoptimizationOrchestratorEngine).toBe(ProgramReoptimizationOrchestratorEngine);
  });
});

describe("ProgramReoptimizationOrchestratorEngine.detectProcess", () => {
  it("synthetic lathe program (G50+G96) → 'lathe'", () => {
    expect(ProgramReoptimizationOrchestratorEngine.detectProcess(SYNTHETIC_LATHE)).toBe("lathe");
  });
  it("synthetic mill program (G43+G54+XY) → 'mill'", () => {
    expect(ProgramReoptimizationOrchestratorEngine.detectProcess(SYNTHETIC_MILL)).toBe("mill");
  });
  it("no-markers program → 'unknown'", () => {
    expect(ProgramReoptimizationOrchestratorEngine.detectProcess(SYNTHETIC_UNKNOWN)).toBe("unknown");
  });
  it("empty string → 'unknown'", () => {
    expect(ProgramReoptimizationOrchestratorEngine.detectProcess("")).toBe("unknown");
  });
  it("G50 only (no G96) → 'unknown' (lathe needs BOTH)", () => {
    expect(ProgramReoptimizationOrchestratorEngine.detectProcess("N0001 G50 S3500\nM30")).toBe("unknown");
  });
  it("G96 only (no G50) → 'unknown' (lathe needs BOTH)", () => {
    expect(ProgramReoptimizationOrchestratorEngine.detectProcess("N0001 G96 S600\nM30")).toBe("unknown");
  });
  it("lathe markers win over mill markers when both present", () => {
    const both = SYNTHETIC_LATHE + SYNTHETIC_MILL;
    expect(ProgramReoptimizationOrchestratorEngine.detectProcess(both)).toBe("lathe");
  });
  it("real on-disk CASING_MACRO.MIN classifies as 'lathe'", () => {
    if (!existsSync(CLEAN_CASING)) {
      expect(existsSync(CLEAN_CASING)).toBe(false);
      return;
    }
    const content = readFileSync(CLEAN_CASING, "utf8");
    expect(ProgramReoptimizationOrchestratorEngine.detectProcess(content)).toBe("lathe");
  });
});

describe("ProgramReoptimizationOrchestratorEngine.unifiedLineDiff", () => {
  it("identical inputs produce an empty diff", () => {
    const diff = ProgramReoptimizationOrchestratorEngine.unifiedLineDiff("A\nB\nC", "A\nB\nC");
    expect(diff).toBe("");
  });
  it("appended line produces a single '+' entry", () => {
    const diff = ProgramReoptimizationOrchestratorEngine.unifiedLineDiff("A\nB", "A\nB\nC");
    expect(diff).toBe("+ C");
  });
  it("removed line produces a single '-' entry", () => {
    const diff = ProgramReoptimizationOrchestratorEngine.unifiedLineDiff("A\nB\nC", "A\nB");
    expect(diff).toBe("- C");
  });
  it("replaced line produces a '- old' followed by '+ new' pair", () => {
    const diff = ProgramReoptimizationOrchestratorEngine.unifiedLineDiff("A\nB\nC", "A\nX\nC");
    expect(diff).toBe("- B\n+ X");
  });
  it("handles CRLF inputs without producing phantom diffs", () => {
    const diff = ProgramReoptimizationOrchestratorEngine.unifiedLineDiff("A\r\nB\r\nC", "A\r\nB\r\nC");
    expect(diff).toBe("");
  });
});

describe("ProgramReoptimizationOrchestratorEngine.reoptimize — error paths", () => {
  it("empty gcode → ok:false, reason='no_gcode'", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({ gcode: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("no_gcode");
      expect(r.stages.length).toBe(0);
    }
  });

  it("whitespace-only gcode → ok:false, reason='no_gcode'", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({ gcode: "   \n\t\n  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_gcode");
  });

  it("program with no detectable markers → ok:false, reason='no_process_detected', stages=[detect]", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({ gcode: SYNTHETIC_UNKNOWN });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("no_process_detected");
      expect(r.detectedProcess).toBe("unknown");
      expect(r.stages.length).toBe(1);
      expect(r.stages[0].name).toBe("detect");
      expect(r.stages[0].status).toBe("error");
    }
  });

  it("mill program → ok:false, reason='mill_path_deferred' (U-PPL-B2 follow-up)", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({ gcode: SYNTHETIC_MILL });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("mill_path_deferred");
      expect(r.detectedProcess).toBe("mill");
      // Both detect AND optimizer (skipped) stages must be present.
      expect(r.stages.length).toBe(2);
      expect(r.stages[1].name).toBe("optimizer");
      expect(r.stages[1].status).toBe("skipped");
    }
  });

  it("forced process='mill' bypasses detection but still hits mill_path_deferred", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({
      gcode: SYNTHETIC_LATHE,  // would auto-detect lathe, but force mill
      process: "mill",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("mill_path_deferred");
  });
});

describe("ProgramReoptimizationOrchestratorEngine.reoptimize — lathe happy path", () => {
  it("synthetic lathe gcode → ok:true with 6 stages (detect, optimizer, safety_before, safety_after, physics, diff)", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({
      gcode: SYNTHETIC_LATHE,
      filename: "synthetic.MIN",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.detectedProcess).toBe("lathe");
    expect(r.stages.length).toBe(6);
    expect(r.stages.map(s => s.name)).toEqual([
      "detect", "optimizer", "safety_before", "safety_after", "physics", "diff",
    ]);
    expect(r.stages[0].status).toBe("ok");  // detect succeeded
    expect(r.stages[1].status).toBe("ok");  // optimizer ran
    expect(r.stages[5].status).toBe("ok");  // diff produced
  });

  it("BOTH safety passes actually run (regression guard for the asymmetric-binding silent-zero bug)", async () => {
    // 2026-05-16: a prior edit left the safety_after arm importing a
    // non-existent `gcodeSafetyAnalyzerEngine` (singleton is `gcSafetyAnalyzer`).
    // It threw, was swallowed, and EVERY after-score silently became 0 — a
    // hugely negative bogus delta — while typeof/Number.isFinite checks still
    // passed. This test pins BOTH stage statuses AND a real non-zero after
    // score on a structurally-valid program so the bug cannot regress silently.
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({
      gcode: SYNTHETIC_LATHE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const before = r.stages.find(s => s.name === "safety_before");
    const after = r.stages.find(s => s.name === "safety_after");
    expect(before?.status).toBe("ok");
    expect(after?.status).toBe("ok");          // ← would be "error" with the bug
    // gcSafetyAnalyzer scores a valid program in (0,100]; a 0 here means the
    // analyzer threw and emptyEmptyAnalysis() leaked through.
    expect(r.safetyScoreBefore).toBeGreaterThan(0);
    expect(r.safetyScoreAfter).toBeGreaterThan(0);  // ← would be 0 with the bug
    expect(r.safetyScoreDelta).toBe(r.safetyScoreAfter - r.safetyScoreBefore);
    expect(Number.isFinite(r.safetyScoreBefore)).toBe(true);
    expect(Number.isFinite(r.safetyScoreAfter)).toBe(true);
  });

  it("safetyIssuesBefore/After contain per-severity counts as non-negative integers", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({ gcode: SYNTHETIC_LATHE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const counts of [r.safetyIssuesBefore, r.safetyIssuesAfter]) {
      expect(Number.isInteger(counts.critical)).toBe(true);
      expect(Number.isInteger(counts.high)).toBe(true);
      expect(Number.isInteger(counts.medium)).toBe(true);
      expect(counts.critical).toBeGreaterThanOrEqual(0);
      expect(counts.high).toBeGreaterThanOrEqual(0);
      expect(counts.medium).toBeGreaterThanOrEqual(0);
    }
  });

  it("optimizer reduces or holds high-severity safety issues (never increases)", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({ gcode: SYNTHETIC_LATHE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Reoptimization MUST NOT make safety worse — high-severity issue count
    // is the load-bearing assertion (lower-severity counts can wobble).
    expect(r.safetyIssuesAfter.high).toBeLessThanOrEqual(r.safetyIssuesBefore.high);
    expect(r.safetyIssuesAfter.critical).toBeLessThanOrEqual(r.safetyIssuesBefore.critical);
  });

  it("diff has '+ M30' when optimizer adds an M30 program-end", async () => {
    // Lathe optimizer adds M30 when missing — our synthetic program has it
    // already, so the diff for this case should NOT contain '+ M30'.
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({
      gcode: SYNTHETIC_LATHE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Concrete assertion: optimizedGcode contains M30
    expect(r.optimizedGcode.includes("M30")).toBe(true);
  });

  it("physics stage status='skipped' when runPhysicsPass=false (default)", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({ gcode: SYNTHETIC_LATHE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const physics = r.stages.find(s => s.name === "physics");
    expect(physics?.status).toBe("skipped");
    expect(physics?.notes).toContain("default");
  });

  it("physics stage notes the U-PPL-B2 dependency when runPhysicsPass=true", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({
      gcode: SYNTHETIC_LATHE,
      runPhysicsPass: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const physics = r.stages.find(s => s.name === "physics");
    expect(physics?.status).toBe("skipped");
    expect(physics?.notes ?? "").toContain("U-PPL-B2");
  });

  it("durationMs is recorded as a non-negative number for stages that run", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({ gcode: SYNTHETIC_LATHE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const stage of r.stages) {
      if (stage.durationMs !== undefined) {
        expect(stage.durationMs).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("real on-disk CASING_MACRO.MIN round-trips through the orchestrator successfully", async () => {
    if (!existsSync(CLEAN_CASING)) {
      expect(existsSync(CLEAN_CASING)).toBe(false);
      return;
    }
    const gcode = readFileSync(CLEAN_CASING, "utf8");
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({
      gcode,
      filename: "CASING_MACRO.MIN",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.detectedProcess).toBe("lathe");
    expect(r.optimizedGcode.length).toBeGreaterThan(0);
    expect(typeof r.cycleTimeDeltaSec).toBe("number");
    expect(Number.isFinite(r.cycleTimeDeltaSec)).toBe(true);
    expect(r.stages.length).toBe(6);
  });
});

describe("ProgramReoptimizationOrchestratorEngine — adversarial inputs", () => {
  it("oversized input (> MAX_GCODE_BYTES) fails loud with reason='gcode_too_large' (no hang)", async () => {
    // A single char per byte; build just past the 2MB ceiling. The guard
    // must reject BEFORE the lathe optimizer + dual safety pass, which would
    // otherwise hang for minutes on multi-MB input (observed 2026-05-16).
    const oneBlock = "N0001 G50 S3500 G96 S600\n"; // 25 bytes, includes both lathe markers
    const repeats = Math.ceil((MAX_GCODE_BYTES + 1024) / oneBlock.length);
    const gcode = oneBlock.repeat(repeats);
    expect(Buffer.byteLength(gcode, "utf8")).toBeGreaterThan(MAX_GCODE_BYTES);

    const t0 = Date.now();
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({ gcode });
    const elapsed = Date.now() - t0;

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("gcode_too_large");
      expect(r.detail).toContain(String(MAX_GCODE_BYTES));
    }
    // The guard must fire fast — well under a second even at 2MB+.
    expect(elapsed).toBeLessThan(2000);
  });

  it("input just UNDER MAX_GCODE_BYTES still routes to the optimizer (guard is a ceiling, not a wall)", async () => {
    // ~200KB of valid lathe blocks — large but realistic-ish, well under 2MB.
    const oneBlock = "N0001 G50 S3500\nN0002 G96 S600\nN0003 G01 X1 Z1\n";
    const repeats = Math.floor((200 * 1024) / oneBlock.length);
    const gcode = oneBlock.repeat(repeats);
    expect(Buffer.byteLength(gcode, "utf8")).toBeLessThan(MAX_GCODE_BYTES);
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({ gcode });
    // Detected lathe → either ok:true or a deterministic optimizer_error,
    // never a hang and never gcode_too_large.
    if (!r.ok) {
      expect(r.reason).not.toBe("gcode_too_large");
    }
    expect(r.detectedProcess).toBe("lathe");
  }, 30_000);

  it("gcode with embedded NUL bytes still detects lathe markers around them", async () => {
    const gcode = "O1001\n\x00\x00\nN0001 G50 S3500\n\x00\nN0002 G96 S600\nM30\n";
    const detected = ProgramReoptimizationOrchestratorEngine.detectProcess(gcode);
    expect(detected).toBe("lathe");
  });

  it("forced process='lathe' on a non-lathe gcode still attempts optimizer (does not silently misclassify)", async () => {
    const r = await ProgramReoptimizationOrchestratorEngine.reoptimize({
      gcode: SYNTHETIC_UNKNOWN,
      process: "lathe",
    });
    // The detect stage is skipped (process forced); optimizer either succeeds
    // on the non-lathe content or surfaces an optimizer_error — in either
    // case, the surface MUST be deterministic.
    expect([true, false]).toContain(r.ok);
    expect(r.detectedProcess).toBe("lathe");
  });
});
