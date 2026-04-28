/**
 * anti-regression-auto-sweep — synthetic-input tests for U-AF05.
 *
 * The hook decides whether a post-commit test sweep result indicates
 * a regression that should latch the autonomous loop. Pure decision
 * logic — vitest invocation lives in the hook script (I/O glue).
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @unit U-AF05
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error - importing pure logic from .mjs lib (no shebang, vitest-safe)
import { decideAntiRegressionSweep } from "../../../.claude/hooks/lib/autonomous-foolproof-logic.mjs";

describe("U-AF05 anti-regression-auto-sweep", () => {
  describe("non-commit pass-through", () => {
    it("passes any non-commit invocation", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: false,
        sweepResult: { totalTests: 50, passed: 49, failed: 1 },
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("not-a-commit");
    });
  });

  describe("non-autonomous mode", () => {
    it("does NOT block in manual mode even with failed tests", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: false,
        isCommit: true,
        sweepResult: { totalTests: 50, passed: 0, failed: 50 },
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("non-autonomous");
    });
  });

  describe("happy paths (no regression)", () => {
    it("passes when all tests pass", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        sweepResult: { totalTests: 70, passed: 70, failed: 0 },
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("all-tests-passing");
      expect(r.total_tests).toBe(70);
      expect(r.passed).toBe(70);
    });

    it("passes through when sweep result is missing (no tests found)", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        sweepResult: null,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-sweep-result");
    });

    it("passes through when totalTests is 0 (docs-only commit)", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        sweepResult: { totalTests: 0, passed: 0, failed: 0 },
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-tests-found");
    });
  });

  describe("regression detection (block paths)", () => {
    it("DETECTS regression on a single failed test", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        sweepResult: {
          totalTests: 70,
          passed: 69,
          failed: 1,
          failedFiles: ["src/__tests__/aiReasoningDispatcher.uwire13.test.ts"],
        },
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("regression-detected");
      expect(r.reason).toBe("post-commit-tests-failed");
      expect(r.failed).toBe(1);
      expect(r.failed_files).toEqual([
        "src/__tests__/aiReasoningDispatcher.uwire13.test.ts",
      ]);
    });

    it("DETECTS regression on multiple failed tests across files", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        sweepResult: {
          totalTests: 70,
          passed: 65,
          failed: 5,
          failedFiles: [
            "src/__tests__/A.test.ts",
            "src/__tests__/B.test.ts",
            "src/__tests__/C.test.ts",
          ],
        },
      });
      expect(r.continue).toBe(false);
      expect(r.failed).toBe(5);
      expect(r.failed_files).toHaveLength(3);
    });

    it("treats failed without failedFiles array as empty list (does not crash)", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        sweepResult: { totalTests: 70, passed: 69, failed: 1 },
      });
      expect(r.continue).toBe(false);
      expect(r.failed_files).toEqual([]);
    });
  });

  describe("adversarial inputs", () => {
    it("treats NaN failed as 0 (no regression)", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        sweepResult: { totalTests: 70, passed: 70, failed: Number.NaN },
      });
      expect(r.continue).toBe(true);
    });

    it("treats negative failed as 0 (no regression)", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        sweepResult: { totalTests: 70, passed: 70, failed: -5 },
      });
      expect(r.continue).toBe(true);
    });

    it("ignores non-array failedFiles gracefully", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        sweepResult: {
          totalTests: 70,
          passed: 69,
          failed: 1,
          failedFiles: "not-an-array",
        },
      });
      expect(r.continue).toBe(false);
      expect(r.failed_files).toEqual([]);
    });

    it("treats non-object sweepResult as no-sweep", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        // @ts-expect-error - intentional wrong-type adversarial input
        sweepResult: "garbage",
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-sweep-result");
    });
  });

  describe("contract guarantees", () => {
    it("never blocks when isAutonomous=false (off-switch)", () => {
      const adversarial = [
        { totalTests: 70, passed: 0, failed: 70 },
        { totalTests: 100, passed: 50, failed: 50, failedFiles: ["x.ts"] },
      ];
      for (const sweepResult of adversarial) {
        const r = decideAntiRegressionSweep({
          isAutonomous: false,
          isCommit: true,
          sweepResult,
        });
        expect(r.continue).toBe(true);
      }
    });

    it("regression decision always includes total_tests, passed, failed, failed_files", () => {
      const r = decideAntiRegressionSweep({
        isAutonomous: true,
        isCommit: true,
        sweepResult: {
          totalTests: 70,
          passed: 65,
          failed: 5,
          failedFiles: ["A.test.ts"],
        },
      });
      expect(r.continue).toBe(false);
      expect(typeof r.total_tests).toBe("number");
      expect(typeof r.passed).toBe("number");
      expect(typeof r.failed).toBe("number");
      expect(Array.isArray(r.failed_files)).toBe(true);
    });
  });
});
