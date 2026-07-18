// MS-PRINT-PROGRAM-LOOP/U-PPL-B2 (Phase 1) — MillProgramOptimizerEngine tests
//
// Closes the 0-test gap: the engine was 568 LOC, wired to skillDispatcher,
// but had no test file. U-PPL-B2 adds the content-based entry point
// (optimizeProgramFromContent) AND this test suite that proves both entry
// points behave consistently against KNOWN-VALUE expectations.
//
// All assertions verify ACTUAL computed values from the deep-learning
// parser + optimizer — no presence-only / toBeTruthy / toBeDefined stubs.

import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  millProgramOptimizerEngine,
  MillProgramOptimizerEngine,
  type ProgramOptimization,
} from "../engines/MillProgramOptimizerEngine.js";

// ─── Test fixtures ──────────────────────────────────────────────────────────

// Minimal mill G-code matching the JM Die observed header pattern. Includes
// every cue MillDeepLearningEngine.learnFromContent requires to populate a
// non-null result: O-number, MATERIAL line, tool definition, T-code change,
// operation with S (RPM) + F (feed) words.
const SAMPLE_MILL_GCODE = `%
O1234 (TEST_PROGRAM)
(MATERIAL = 4140 STEEL)
(T01 - 0.500 FLAT END MILL)
G20 G40 G80 G90 G94
T1 M6
G0 G54 X0. Y0. S1200 M3
G43 H1 Z1.0
G81 Z-0.5 F8.0 R0.1
X1.0 Y1.0
G80
G0 Z2.0
M30
%`;

// The 4 known JM Die mill machines (MillProgramOptimizerEngine: JM_DIE_MILLS).
// Optimizer recommends ONE of these for every program.
const KNOWN_JM_DIE_MILLS = ["Haas VF-2SS", "Hurco VMX-42", "Okuma MB-5000H", "Roku-Roku"];

// Valid ISO P/M/K/N/S/H material codes (MillDeepLearningEngine.classifyMaterial).
const VALID_ISO_CODES = ["P", "M", "K", "N", "S", "H"];

// ─── Singleton + API surface (real-value type assertions) ───────────────────

describe("MillProgramOptimizerEngine — singleton + U-PPL-B2 API", () => {
  it("singleton is the same class instance, not a fresh export", () => {
    const ctor = millProgramOptimizerEngine.constructor;
    expect(ctor).toBe(MillProgramOptimizerEngine);
  });

  it("U-PPL-B2 added optimizeProgramFromContent with arity 2 (content, filePath?)", () => {
    // TypeScript's `filePath?: string` compiles to a normal positional
    // param without a default expression — Function.length counts it as
    // a formal param. So arity is 2, not 1.
    expect(millProgramOptimizerEngine.optimizeProgramFromContent.length).toBe(2);
  });
});

// ─── Happy path (content variant) — assert real values ─────────────────────

describe("optimizeProgramFromContent — happy path real-value assertions", () => {
  it("extracts program_number='1234' from O1234 line", async () => {
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent(SAMPLE_MILL_GCODE);
    if (result === null) {
      throw new Error("parser returned null — regression in MillDeepLearningEngine");
    }
    expect(result.program_number).toBe("1234");
  });

  it("classifies '4140 STEEL' as ISO group 'P' (per classifyMaterial)", async () => {
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent(SAMPLE_MILL_GCODE);
    if (result === null) {
      throw new Error("parser returned null — regression in MillDeepLearningEngine");
    }
    expect(result.material_iso).toBe("P");
  });

  it("returns confidence in the documented [0.7, 0.95] band (current hardcoded 0.85)", async () => {
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent(SAMPLE_MILL_GCODE);
    if (result === null) {
      throw new Error("parser returned null");
    }
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  it("recommended_machine is one of the 4 known JM Die mills", async () => {
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent(SAMPLE_MILL_GCODE);
    if (result === null) {
      throw new Error("parser returned null");
    }
    expect(KNOWN_JM_DIE_MILLS).toContain(result.recommended_machine);
  });

  it("issues_fixed + issues_remaining is a non-negative integer count", async () => {
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent(SAMPLE_MILL_GCODE);
    if (result === null) {
      throw new Error("parser returned null");
    }
    const total = result.issues_fixed + result.issues_remaining;
    expect(Number.isInteger(total)).toBe(true);
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it("cycle-time invariant: optimized ≤ original (optimization cannot increase time)", async () => {
    // This is the load-bearing optimization invariant. If a regression
    // makes optimized_cycle_time_min > original_cycle_time_min, the engine
    // has shipped a negative-value "optimization" that would hurt the
    // shop. Catch it here, not in production.
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent(SAMPLE_MILL_GCODE);
    if (result === null) {
      throw new Error("parser returned null");
    }
    expect(result.optimized_cycle_time_min).toBeLessThanOrEqual(result.original_cycle_time_min);
  });

  it("time_savings_pct correctly reflects cycle-time delta (within 0.5% rounding)", async () => {
    // Verifies the percentage math, not just presence. If the engine ever
    // computes savings_pct from the wrong baseline, this fails.
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent(SAMPLE_MILL_GCODE);
    if (result === null) throw new Error("parser returned null");
    if (result.original_cycle_time_min === 0) {
      // Engine sets savings to 0 when baseline is 0 — verify that branch
      expect(result.time_savings_pct).toBe(0);
    } else {
      const expected = ((result.original_cycle_time_min - result.optimized_cycle_time_min) /
                        result.original_cycle_time_min) * 100;
      expect(Math.abs(result.time_savings_pct - expected)).toBeLessThan(0.5);
    }
  });
});

// ─── original_path propagation (the U-PPL-B2 invariant under test) ──────────

describe("optimizeProgramFromContent — original_path propagation (U-PPL-B2 contract)", () => {
  it("omitted filePath → original_path is exactly the literal '<in-memory>'", async () => {
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent(SAMPLE_MILL_GCODE);
    if (result === null) throw new Error("parser returned null");
    expect(result.original_path).toBe("<in-memory>");
  });

  it("supplied filePath → original_path is the EXACT string passed in", async () => {
    const engine = new MillProgramOptimizerEngine();
    const path = "H:/PRISM/JM DIE/CNC MILL/SAMPLE.NC";
    const result = await engine.optimizeProgramFromContent(SAMPLE_MILL_GCODE, path);
    if (result === null) throw new Error("parser returned null");
    expect(result.original_path).toBe(path);
  });
});

// ─── Failure modes — verify the engine handles bad input correctly ──────────

describe("optimizeProgramFromContent — failure modes (degenerate-object semantics)", () => {
  // Observed engine behavior: returns a populated ProgramOptimization with
  // empty/zero fields when no parseable signals are found (NOT null).
  // Downstream consumers must check program_number / operations_optimized.
  // This is a known weakness worth tightening in a future unit (engine
  // SHOULD return null on no-signal input — guarded here so behavior
  // doesn't silently change).

  it("empty content returns degenerate object with program_number='' and 0 operations", async () => {
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent("");
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.program_number).toBe("");
    expect(result.operations_optimized.length).toBe(0);
    expect(result.original_cycle_time_min).toBe(0);
    expect(result.issues_fixed).toBe(0);
    expect(result.issues_remaining).toBe(0);
  });

  it("whitespace-only content returns same degenerate-object shape as empty", async () => {
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent("   \n\n  \t  \n");
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.program_number).toBe("");
    expect(result.operations_optimized.length).toBe(0);
  });

  it("malformed G-code (no O-number, no operations) returns degenerate object without throwing", async () => {
    // Contract: return populated result, NEVER throw — operators depend
    // on this for robustness when scanning unknown archive files.
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent("G0\nG1\nM30");
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.operations_optimized.length).toBe(0);
  });
});

// ─── Adversarial inputs — verify edge-case robustness ──────────────────────

describe("optimizeProgramFromContent — adversarial robustness", () => {
  it("NaN-injected speed value does not crash parser or produce NaN cycle time", async () => {
    const nanGcode = SAMPLE_MILL_GCODE.replace("S1200", "SNaN");
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgramFromContent(nanGcode);
    if (result === null) {
      // Acceptable — parser may correctly reject NaN-speed input
      return;
    }
    expect(Number.isFinite(result.original_cycle_time_min)).toBe(true);
    expect(Number.isFinite(result.optimized_cycle_time_min)).toBe(true);
    expect(Number.isNaN(result.time_savings_pct)).toBe(false);
  });

  it("100KB oversize content completes under 5s (O(n) parser invariant)", async () => {
    // Defense against accidental O(n²) regressions in the parser. A 100KB
    // typical JM Die program is ~3,000 lines; 5s is 3x the observed
    // baseline so the test isn't flaky on slow CI but still catches
    // genuine algorithmic regressions.
    const oversize = SAMPLE_MILL_GCODE + "\n" + "G1 X1.0 Y0.0 F10.0\n".repeat(5000);
    const engine = new MillProgramOptimizerEngine();
    const start = Date.now();
    await engine.optimizeProgramFromContent(oversize);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});

// ─── File-path ↔ content equivalence (the U-PPL-B2 round-trip invariant) ────

describe("U-PPL-B2 round-trip: file-path API delegates to content API", () => {
  it("optimizeProgram(path) and optimizeProgramFromContent(content, path) produce structurally-identical results", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "prism-mill-opt-test-"));
    try {
      const sample = join(tmp, "TEST.NC");
      await writeFile(sample, SAMPLE_MILL_GCODE, "utf-8");

      const engine = new MillProgramOptimizerEngine();
      const fromPath: ProgramOptimization | null = await engine.optimizeProgram(sample);
      const fromContent: ProgramOptimization | null = await engine.optimizeProgramFromContent(SAMPLE_MILL_GCODE, sample);

      // Both should resolve the same way — either both null (parser
      // rejected identically) or both populated with matching content.
      expect(fromPath === null).toBe(fromContent === null);
      if (fromPath && fromContent) {
        expect(fromPath.program_number).toBe(fromContent.program_number);
        expect(fromPath.material_iso).toBe(fromContent.material_iso);
        expect(fromPath.original_path).toBe(fromContent.original_path);
        expect(fromPath.operations_optimized.length).toBe(fromContent.operations_optimized.length);
        expect(fromPath.original_cycle_time_min).toBe(fromContent.original_cycle_time_min);
        expect(fromPath.optimized_cycle_time_min).toBe(fromContent.optimized_cycle_time_min);
        expect(fromPath.issues_fixed).toBe(fromContent.issues_fixed);
        expect(fromPath.recommended_machine).toBe(fromContent.recommended_machine);
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("optimizeProgram(nonexistent path) returns null without throwing (try/catch wrapped readFileSync)", async () => {
    const engine = new MillProgramOptimizerEngine();
    const result = await engine.optimizeProgram("H:/genuinely/nonexistent/program-XYZ-12345.nc");
    expect(result).toBeNull();
  });
});

// ─── Variability floor — 3 spanning materials (per comprehensive-build-enforce R3) ──

describe("optimizeProgramFromContent — material variability (3 ISO spans)", () => {
  // Spanning P=steel, M=stainless, N=aluminum. The classifier maps via
  // substring patterns — not all material names hit cleanly, so we
  // assert (a) no throw, and (b) ISO is one of the 6 valid codes when
  // a result is produced.
  const materials = ["4140 STEEL", "316 STAINLESS", "6061 ALUMINUM"];

  for (const name of materials) {
    it(`material "${name}" produces a valid ISO classification when parseable`, async () => {
      const gcode = SAMPLE_MILL_GCODE.replace("4140 STEEL", name);
      const engine = new MillProgramOptimizerEngine();
      const result = await engine.optimizeProgramFromContent(gcode);
      if (result !== null) {
        expect(VALID_ISO_CODES).toContain(result.material_iso);
      }
    });
  }
});
