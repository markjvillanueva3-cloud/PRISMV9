/**
 * tsc-baseline-regression-gate — synthetic-input tests for U-AF02.
 *
 * Pure decision logic exported as decideTscRegressionGate() and the
 * isGitCommitCommand() detector — both tested without spawning tsc.
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @unit U-AF02
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error - importing decision logic from sibling .mjs lib (no shebang, vitest-safe)
import {
  decideTscRegressionGate,
  isGitCommitCommand,
} from "../../../.claude/hooks/lib/autonomous-foolproof-logic.mjs";

describe("U-AF02 isGitCommitCommand", () => {
  it("matches plain `git commit -m`", () => {
    expect(isGitCommitCommand("git commit -m 'msg'")).toBe(true);
  });

  it("matches `git commit --amend`", () => {
    expect(isGitCommitCommand("git commit --amend")).toBe(true);
  });

  it("matches `git commit` chained after `&&`", () => {
    expect(isGitCommitCommand("git add . && git commit -m 'msg'")).toBe(true);
  });

  it("matches `git commit` chained after `;`", () => {
    expect(isGitCommitCommand("git status; git commit")).toBe(true);
  });

  it("matches with leading whitespace", () => {
    expect(isGitCommitCommand("  git commit -m 'msg'")).toBe(true);
  });

  it("does NOT match `git committed` (false-positive guard)", () => {
    expect(isGitCommitCommand("echo 'git committed yesterday'")).toBe(false);
  });

  it("does NOT match `git status`", () => {
    expect(isGitCommitCommand("git status")).toBe(false);
  });

  it("does NOT match empty string", () => {
    expect(isGitCommitCommand("")).toBe(false);
  });

  it("does NOT match non-string", () => {
    expect(isGitCommitCommand(null)).toBe(false);
    expect(isGitCommitCommand(undefined)).toBe(false);
    expect(isGitCommitCommand(42)).toBe(false);
  });
});

describe("U-AF02 decideTscRegressionGate", () => {
  describe("non-commit pass-through", () => {
    it("passes through any non-commit command", () => {
      const r = decideTscRegressionGate({
        isAutonomous: true,
        isCommit: false,
        allowRegression: false,
        baseline: 100,
        current: 200,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("not-a-commit");
    });
  });

  describe("explicit override", () => {
    it("respects PRISM_TSC_ALLOW_REGRESSION=1 even with autonomous regression", () => {
      const r = decideTscRegressionGate({
        isAutonomous: true,
        isCommit: true,
        allowRegression: true,
        baseline: 100,
        current: 200,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("regression-explicitly-allowed");
    });
  });

  describe("baseline initialization", () => {
    it("initializes baseline on first run (no baseline file)", () => {
      const r = decideTscRegressionGate({
        isAutonomous: true,
        isCommit: true,
        allowRegression: false,
        baseline: null,
        current: 170,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("baseline-initialized");
      expect(r.initialize_to).toBe(170);
    });
  });

  describe("tsc-unavailable fail-OPEN", () => {
    it("does NOT block when tsc could not run", () => {
      const r = decideTscRegressionGate({
        isAutonomous: true,
        isCommit: true,
        allowRegression: false,
        baseline: 100,
        current: null,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("tsc-unavailable");
    });
  });

  describe("autonomous mode — block on regression", () => {
    it("BLOCKS when current > baseline by 1", () => {
      const r = decideTscRegressionGate({
        isAutonomous: true,
        isCommit: true,
        allowRegression: false,
        baseline: 170,
        current: 171,
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("block");
      expect(r.reason).toBe("regression");
      expect(r.delta).toBe(1);
    });

    it("BLOCKS when current > baseline by 50", () => {
      const r = decideTscRegressionGate({
        isAutonomous: true,
        isCommit: true,
        allowRegression: false,
        baseline: 170,
        current: 220,
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("block");
      expect(r.delta).toBe(50);
    });
  });

  describe("autonomous mode — pass on improvement / stable", () => {
    it("passes when current === baseline (stable)", () => {
      const r = decideTscRegressionGate({
        isAutonomous: true,
        isCommit: true,
        allowRegression: false,
        baseline: 170,
        current: 170,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("stable");
    });

    it("passes and reports 'improvement' when current < baseline", () => {
      const r = decideTscRegressionGate({
        isAutonomous: true,
        isCommit: true,
        allowRegression: false,
        baseline: 170,
        current: 165,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("improvement");
    });
  });

  describe("non-autonomous mode — warn-only", () => {
    it("WARNS but does NOT block on regression in non-autonomous", () => {
      const r = decideTscRegressionGate({
        isAutonomous: false,
        isCommit: true,
        allowRegression: false,
        baseline: 170,
        current: 175,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("regression-warned");
      expect(r.delta).toBe(5);
    });
  });

  describe("contract guarantees", () => {
    it("never blocks when isAutonomous=false (autonomous off-switch)", () => {
      const adversarial = [
        { baseline: 100, current: 200 },
        { baseline: 0, current: 1 },
        { baseline: 1, current: 1000 },
      ];
      for (const { baseline, current } of adversarial) {
        const r = decideTscRegressionGate({
          isAutonomous: false,
          isCommit: true,
          allowRegression: false,
          baseline,
          current,
        });
        expect(r.continue).toBe(true);
      }
    });

    it("block decision always includes baseline, current, delta", () => {
      const r = decideTscRegressionGate({
        isAutonomous: true,
        isCommit: true,
        allowRegression: false,
        baseline: 170,
        current: 175,
      });
      expect(r.continue).toBe(false);
      expect(typeof r.baseline).toBe("number");
      expect(typeof r.current).toBe("number");
      expect(typeof r.delta).toBe("number");
      expect(r.delta).toBe(r.current - r.baseline);
    });
  });
});
