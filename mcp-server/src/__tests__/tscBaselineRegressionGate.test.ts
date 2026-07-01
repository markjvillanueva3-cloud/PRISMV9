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
  classifyTscRun,
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

describe("U-AF02 classifyTscRun -- completion guard (false-green killer)", () => {
  // A truncated tsc error stream -- the kind an OOM/timeout leaves behind:
  // GENUINE error lines, but the process was killed before it finished. The bug
  // is that the old countTscErrors counted these and returned a falsely-low N.
  const PARTIAL_WITH_ERRORS =
    "src/a.ts(12,5): error TS2322: Type 'string' is not assignable to type 'number'.\n" +
    "src/b.ts(3,1): error TS2304: Cannot find name 'foo'.\n";
  // A COMPLETE `tsc --noEmit` run on this repo: exit code 1 (DiagnosticsPresent_
  // OutputsSkipped), real error lines, and -- verified live 2026-06-11 -- NO
  // "Found N errors" footer. Completion is proven by the clean exit code, not a
  // footer. Includes an indented follow-up line that must NOT be counted.
  const COMPLETE_EXIT1 =
    "src/a.ts(12,5): error TS2322: Type 'string' is not assignable to type 'number'.\n" +
    "  Type 'string' is not assignable to type 'number'.\n" +
    "src/b.ts(3,1): error TS2304: Cannot find name 'foo'.\n";

  it("clean exit (status 0) is complete with zero errors", () => {
    const v = classifyTscRun({ status: 0, signal: null, stdout: "" });
    expect(v.completed).toBe(true);
    expect(v.reason).toBe("clean");
    expect(v.errorCount).toBe(0);
  });

  it("exit 1 with error lines is COMPLETE (the real `tsc --noEmit` path, no footer)", () => {
    const v = classifyTscRun({ status: 1, signal: null, stdout: COMPLETE_EXIT1 });
    expect(v.completed).toBe(true);
    expect(v.reason).toBe("errors-found");
    // 2 error lines; the indented follow-up line is NOT counted.
    expect(v.errorCount).toBe(2);
  });

  it("exit 2 with error lines is also COMPLETE (OutputsGenerated variant)", () => {
    const v = classifyTscRun({ status: 2, signal: null, stdout: PARTIAL_WITH_ERRORS });
    expect(v.completed).toBe(true);
    expect(v.reason).toBe("errors-found");
    expect(v.errorCount).toBe(2);
  });

  // ---- the bug this guard kills (OOM / timeout truncation) ----
  it("SIGKILL (OOM abort) is INCOMPLETE even though error lines were flushed", () => {
    const v = classifyTscRun({ status: null, signal: "SIGKILL", stdout: PARTIAL_WITH_ERRORS });
    expect(v.completed).toBe(false);
    expect(v.reason).toBe("killed-signal:SIGKILL");
  });

  it("SIGTERM (timeout kill) is INCOMPLETE", () => {
    const v = classifyTscRun({ status: null, signal: "SIGTERM", stdout: PARTIAL_WITH_ERRORS });
    expect(v.completed).toBe(false);
    expect(v.reason).toBe("killed-signal:SIGTERM");
  });

  it("timedOut flag is INCOMPLETE", () => {
    const v = classifyTscRun({ status: null, signal: null, timedOut: true, stdout: PARTIAL_WITH_ERRORS });
    expect(v.completed).toBe(false);
    expect(v.reason).toBe("timed-out");
  });

  it("ETIMEDOUT via spawnSync .error is INCOMPLETE", () => {
    const v = classifyTscRun({ status: null, signal: null, error: { code: "ETIMEDOUT" }, stdout: PARTIAL_WITH_ERRORS });
    expect(v.completed).toBe(false);
    expect(v.reason).toBe("timed-out");
  });

  it("ENOBUFS (maxBuffer overflow) is INCOMPLETE", () => {
    const v = classifyTscRun({ status: null, signal: null, error: { code: "ENOBUFS" }, stdout: PARTIAL_WITH_ERRORS });
    expect(v.completed).toBe(false);
    expect(v.reason).toBe("buffer-overflow");
  });

  it("a V8 OOM that exits WITHOUT a signal (Windows path) is INCOMPLETE via the fatal marker", () => {
    const oomOut =
      PARTIAL_WITH_ERRORS +
      "\n<--- Last few GCs --->\nFATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory\n";
    const v = classifyTscRun({ status: 134, signal: null, stdout: oomOut });
    expect(v.completed).toBe(false);
    expect(v.reason).toBe("node-fatal-oom");
  });

  it("exit 1/2 with ZERO parsed error lines is INCOMPLETE (non-diagnostic crash, not '0 errors')", () => {
    const v = classifyTscRun({
      status: 1,
      signal: null,
      stdout: "TypeError: Cannot read properties of undefined\n    at t (tsc.js:1)\n",
    });
    expect(v.completed).toBe(false);
    expect(v.reason).toBe("diagnostics-exit-no-error-lines");
  });

  it("exit 3 (invalid tsconfig) is INCOMPLETE -- a config failure is not a clean check", () => {
    const v = classifyTscRun({ status: 3, signal: null, stdout: "error TS5083: Cannot read file 'tsconfig.json'.\n" });
    expect(v.completed).toBe(false);
    expect(v.reason).toBe("unexpected-exit:3");
  });

  it("tolerates missing / non-string stdout", () => {
    expect(classifyTscRun({ status: 0, signal: null, stdout: undefined }).completed).toBe(true);
    expect(classifyTscRun({ status: null, signal: "SIGKILL", stdout: null }).completed).toBe(false);
  });

  it("CONTRACT: no kill signal can EVER be reported complete, even with a full error stream", () => {
    for (const sig of ["SIGKILL", "SIGTERM", "SIGABRT", "SIGSEGV"]) {
      const v = classifyTscRun({ status: null, signal: sig, stdout: COMPLETE_EXIT1 });
      expect(v.completed).toBe(false);
    }
  });

  it("END-TO-END: an incomplete run never poisons the gate (null -> tsc-unavailable, no baseline init)", () => {
    // The caller wiring: an incomplete verdict yields a null count, which
    // decideTscRegressionGate maps to a safe no-op pass-through. Without this
    // guard the partial stream would grep to a falsely-low count and
    // initialize/regress the baseline (the live cache=0 poisoning we found).
    const v = classifyTscRun({ status: null, signal: "SIGKILL", stdout: PARTIAL_WITH_ERRORS });
    const current = v.completed ? v.errorCount : null;
    const gate = decideTscRegressionGate({
      isAutonomous: true,
      isCommit: true,
      allowRegression: false,
      baseline: 648,
      current,
    });
    expect(current).toBe(null);
    expect(gate.continue).toBe(true);
    expect(gate.reason).toBe("tsc-unavailable");
    expect("initialize_to" in gate).toBe(false);
  });

  it("END-TO-END: a COMPLETE run feeds the real count to the gate", () => {
    // The complementary path: a complete run's count IS trusted and flows to the
    // gate. This is what the live repo produces (exit 1, hundreds of errors).
    const v = classifyTscRun({ status: 1, signal: null, stdout: COMPLETE_EXIT1 });
    expect(v.completed).toBe(true);
    const gate = decideTscRegressionGate({
      isAutonomous: true,
      isCommit: true,
      allowRegression: false,
      baseline: null,
      current: v.completed ? v.errorCount : null,
    });
    expect(gate.reason).toBe("baseline-initialized");
    expect(gate.initialize_to).toBe(2);
  });
});
