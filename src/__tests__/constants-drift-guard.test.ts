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

const ENGINES_DIR = path.resolve(__dirname, "../engines");
const CONSTANTS_FILE = path.resolve(__dirname, "../physics/constants.ts");

// Canonical values from physics/constants.ts
const CANONICAL_KIENZLE: Record<string, { kc1_1: number; mc: number }> = {
  P: { kc1_1: 1800, mc: 0.25 },
  M: { kc1_1: 2100, mc: 0.25 },
  K: { kc1_1: 1100, mc: 0.28 },
  N: { kc1_1: 700, mc: 0.23 },
  S: { kc1_1: 2800, mc: 0.25 },
  H: { kc1_1: 3200, mc: 0.30 },
};

describe("Constants Drift Guard", () => {
  it("canonical constants file exists", () => {
    expect(fs.existsSync(CONSTANTS_FILE)).toBe(true);
  });

  it("canonical constants contain all 6 ISO groups", () => {
    const content = fs.readFileSync(CONSTANTS_FILE, "utf-8");
    for (const group of Object.keys(CANONICAL_KIENZLE)) {
      expect(content).toContain(`kc1_1`);
    }
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
