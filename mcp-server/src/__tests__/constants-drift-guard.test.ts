/**
 * Constants Drift Guard (F360-REV-MS1 U-SAF05)
 *
 * Prevents inline kc1.1/mc/Taylor constants from drifting from canonical values.
 * Scans engine files for hardcoded Kienzle/Taylor definitions that should import
 * from physics/constants.ts instead.
 *
 * This test runs in CI and blocks any engine edit that introduces new inline
 * physics constants without documented justification.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

const ENGINES_DIR = path.resolve(__dirname, "../engines");
const CONSTANTS_FILE = path.resolve(__dirname, "../physics/constants.ts");

// Independent GOLDEN REFERENCE of the canonical Kienzle values (Sandvik Coromant; constants.ts:40-46).
// Deliberately a SEPARATE hardcoded copy so this guard fails if anyone edits constants.ts and drifts a
// value -- assert(import === golden). Do NOT derive it from the CANONICAL_KIENZLE import (that would be
// a tautology). CORRECTED 2026-07-01 (U-OSC-SFC-CANONICAL-KC-INTEGRITY): this reference had itself
// drifted (N.mc 0.23 vs canonical 0.22; S.mc 0.25 vs 0.27), so the guard silently blessed wrong values.
const CANONICAL_KIENZLE_REFERENCE: Record<string, { kc1_1: number; mc: number }> = {
  P: { kc1_1: 1800, mc: 0.25 },
  M: { kc1_1: 2100, mc: 0.25 },
  K: { kc1_1: 1100, mc: 0.28 },
  N: { kc1_1: 700, mc: 0.22 },
  S: { kc1_1: 2800, mc: 0.27 },
  H: { kc1_1: 3200, mc: 0.30 },
};

describe("Constants Drift Guard", () => {
  it("canonical constants file exists", () => {
    expect(fs.existsSync(CONSTANTS_FILE)).toBe(true);
  });

  it("CANONICAL_KIENZLE matches the golden reference for all 6 ISO groups (real value drift guard)", () => {
    // Deep value equality, NOT a substring check: a silent kc1_1/mc mutation in constants.ts MUST fail
    // here. (The prior test only asserted content.toContain("kc1_1"), which passes even if every value
    // drifts -- the R9 gap this fixes.)
    for (const [iso, ref] of Object.entries(CANONICAL_KIENZLE_REFERENCE)) {
      expect(CANONICAL_KIENZLE[iso as keyof typeof CANONICAL_KIENZLE]).toEqual(ref);
    }
    // exactly the 6 ISO groups -- no group added/removed without updating the golden reference
    expect(Object.keys(CANONICAL_KIENZLE).sort()).toEqual(Object.keys(CANONICAL_KIENZLE_REFERENCE).sort());
  });

  it("the value drift guard has teeth (meta-test: a mutated canonical is rejected)", () => {
    // Proves the equality assertion above would actually fail on drift (R9 -- a guard that cannot
    // fail is not a guard). Mutate a copy and confirm the per-ISO check throws for that group.
    const mutated: Record<string, { kc1_1: number; mc: number }> = {
      ...CANONICAL_KIENZLE, S: { kc1_1: 9999, mc: 0.27 },
    };
    const check = () => {
      for (const [iso, ref] of Object.entries(CANONICAL_KIENZLE_REFERENCE)) {
        const a = mutated[iso]!;
        if (a.kc1_1 !== ref.kc1_1 || a.mc !== ref.mc) throw new Error(`drift at ${iso}`);
      }
    };
    expect(check).toThrow(/drift at S/);
  });

  it("no engine file defines a new KIENZLE_TABLE without referencing canonical source", () => {
    const engineFiles = fs.readdirSync(ENGINES_DIR)
      .filter(f => f.endsWith(".ts") && !f.includes(".test."));

    const violations: string[] = [];
    for (const file of engineFiles) {
      // KienzleForceModelEngine is allowed — it has per-alloy refinements documented
      if (file === "KienzleForceModelEngine.ts") continue;

      const content = fs.readFileSync(path.join(ENGINES_DIR, file), "utf-8");
      if (/KIENZLE_TABLE\s*[:=]/.test(content)) {
        violations.push(`${file}: defines KIENZLE_TABLE — should use KienzleForceModelEngine or physics/constants.ts`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("ProcessSynthesisEngine uses canonical ISO group values", () => {
    const content = fs.readFileSync(
      path.join(ENGINES_DIR, "ProcessSynthesisEngine.ts"), "utf-8"
    );
    // Verify canonical constants are referenced (from the U-SAF04 fix)
    expect(content).toContain("CANONICAL_KIENZLE");
    expect(content).toContain("ISO M canonical");
    expect(content).toContain("ISO N canonical");
    expect(content).toContain("ISO S canonical");
  });

  it("KienzleForceModelEngine KIENZLE_TABLE is documented as per-alloy refinement", () => {
    const content = fs.readFileSync(
      path.join(ENGINES_DIR, "KienzleForceModelEngine.ts"), "utf-8"
    );
    // Verify the U-SAF04 documentation comment is present
    expect(content).toContain("PER-ALLOY values");
    expect(content).toContain("CANONICAL_KIENZLE");
    expect(content).toContain("physics/constants.ts");
  });

  it("face_mill exists in TYPE_PRIORITY at position 0", () => {
    const content = fs.readFileSync(
      path.join(ENGINES_DIR, "OperationSequencerEngine.ts"), "utf-8"
    );
    expect(content).toContain("face_mill: 0");
  });

  it("safety catch blocks do not silently pass through", () => {
    const safetyFiles = [
      "SafetyVetoEngine.ts",
      "PipelineSafetyOrchestratorEngine.ts",
      "GCodeSafetyAnalyzerEngine.ts",
      "PostVerificationSafetyEngine.ts",
      "SafetyEscalationEngine.ts",
    ];

    const violations: string[] = [];
    for (const file of safetyFiles) {
      const filePath = path.join(ENGINES_DIR, file);
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, "utf-8");

      // Check for bare catch {} or catch { /* comment */ } without error handling
      const bareMatches = content.match(/catch\s*\{\s*\/\*[^*]*\*\/\s*\}/g);
      if (bareMatches) {
        violations.push(`${file}: has ${bareMatches.length} bare catch blocks — must surface errors`);
      }
    }

    expect(violations).toEqual([]);
  });
});
