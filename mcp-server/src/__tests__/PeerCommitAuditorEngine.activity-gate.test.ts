/**
 * PeerCommitAuditorEngine.activity-gate.test.ts — CLEANUP-MS0 / U-CLEANUP-G15
 *
 * Covers the activity-gate pre-check introduced in `tickFromCli`. The full
 * `engine.tick()` behaviour is exercised by the existing
 * PeerCommitAuditorEngine.test.ts; this file is scoped to the new gate.
 *
 * Coverage:
 *   - checkFleetIdle: zero commits → isIdle=true
 *   - checkFleetIdle: only excluded (golf-*) authors → isIdle=true
 *   - checkFleetIdle: ≥1 non-golf author → isIdle=false
 *   - checkFleetIdle: case-insensitive exclude match
 *   - checkFleetIdle: prefix-match for golf-watchdog-bot etc.
 *   - checkFleetIdle: git non-zero exit → inconclusive=true, isIdle=false (fail-open)
 *   - checkFleetIdle: git timeout → inconclusive=true
 *   - checkFleetIdle: malformed stdout still parsed safely
 *   - DEFAULT_ACTIVITY_WINDOW_HOURS exported correctly
 *   - windowHours hard cap honored
 *   - sinceIso reflects windowHours
 *   - sampleAuthors capped at 10 distinct
 */

import { describe, it, expect } from "vitest";
import {
  checkFleetIdle, DEFAULT_ACTIVITY_WINDOW_HOURS,
  type ActivityGitRunner,
} from "../engines/PeerCommitAuditorEngine.js";

/** Test seam helper: builds a git runner that returns a canned stdout. */
function gitOk(stdout: string): ActivityGitRunner {
  return () => ({ status: 0, stdout, stderr: "" });
}
function gitFail(stderr: string, exit = 128): ActivityGitRunner {
  return () => ({ status: exit, stdout: "", stderr });
}
function gitTimeout(): ActivityGitRunner {
  return () => ({ status: null, stdout: "", stderr: "", timedOut: true });
}

describe("checkFleetIdle — activity gate", () => {
  it("zero commits → isIdle=true", () => {
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 48, excludeAuthors: ["golf-watchdog"] },
      gitOk(""),
    );
    expect(r.isIdle).toBe(true);
    expect(r.inconclusive).toBe(false);
    expect(r.nonGolfCommitCount).toBe(0);
    expect(r.sampleAuthors).toEqual([]);
  });

  it("only excluded authors → isIdle=true", () => {
    const stdout = [
      "abc123\tgolf-watchdog",
      "def456\tgolf-watchdog-bot",
      "ghi789\tgolf-watchdog",
    ].join("\n");
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 48, excludeAuthors: ["golf-watchdog", "golf-watchdog-bot"] },
      gitOk(stdout),
    );
    expect(r.isIdle).toBe(true);
    expect(r.nonGolfCommitCount).toBe(0);
  });

  it("≥1 non-golf author → isIdle=false", () => {
    const stdout = [
      "abc123\tgolf-watchdog",
      "def456\tMark Villanueva",
      "ghi789\tgolf-watchdog-bot",
    ].join("\n");
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 48, excludeAuthors: ["golf-watchdog", "golf-watchdog-bot"] },
      gitOk(stdout),
    );
    expect(r.isIdle).toBe(false);
    expect(r.nonGolfCommitCount).toBe(1);
    expect(r.sampleAuthors).toEqual(["Mark Villanueva"]);
  });

  it("case-insensitive exclude match", () => {
    const stdout = "abc123\tGOLF-WATCHDOG";
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 48, excludeAuthors: ["golf-watchdog"] },
      gitOk(stdout),
    );
    expect(r.isIdle).toBe(true);
  });

  it("prefix-match catches golf-watchdog-bot when only 'golf-' is excluded", () => {
    const stdout = [
      "a\tgolf-watchdog-bot",
      "b\tgolf-watchdog",
      "c\tgolf-anything-else",
    ].join("\n");
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 48, excludeAuthors: ["golf-"] },
      gitOk(stdout),
    );
    expect(r.isIdle).toBe(true);
  });

  it("git non-zero exit → inconclusive=true (fail-open)", () => {
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 48, excludeAuthors: ["golf-watchdog"] },
      gitFail("fatal: not a git repository", 128),
    );
    expect(r.isIdle).toBe(false);
    expect(r.inconclusive).toBe(true);
    expect(r.reason).toMatch(/git-log-exit-128/);
  });

  it("git timeout → inconclusive=true", () => {
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 48, excludeAuthors: ["golf-watchdog"] },
      gitTimeout(),
    );
    expect(r.isIdle).toBe(false);
    expect(r.inconclusive).toBe(true);
    expect(r.reason).toBe("git-log-timeout");
  });

  it("malformed stdout (line without tab) is still parsed safely", () => {
    // git --pretty=%H%x09%an should always emit a tab; defensive coverage in
    // case a future format option breaks that contract.
    const stdout = "abc-no-tab-line-here\nzzz\tMark";
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 48, excludeAuthors: ["golf-watchdog"] },
      gitOk(stdout),
    );
    // Both lines are treated as author strings; "abc-no-tab-line-here" and
    // "Mark" are not in the exclude set so both count.
    expect(r.nonGolfCommitCount).toBe(2);
    expect(r.isIdle).toBe(false);
  });

  it("DEFAULT_ACTIVITY_WINDOW_HOURS = 48 (matches spec)", () => {
    expect(DEFAULT_ACTIVITY_WINDOW_HOURS).toBe(48);
  });

  it("windowHours hard-capped at 30 days", () => {
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 999_999, excludeAuthors: [] },
      gitOk(""),
    );
    expect(r.windowHours).toBe(30 * 24);
  });

  it("windowHours floor=1 (prevents zero-window weirdness)", () => {
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 0, excludeAuthors: [] },
      gitOk(""),
    );
    expect(r.windowHours).toBe(1);
  });

  it("sinceIso reflects windowHours from now", () => {
    const before = Date.now();
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 24, excludeAuthors: [] },
      gitOk(""),
    );
    const sinceMs = Date.parse(r.sinceIso);
    const expectedMs = before - 24 * 60 * 60 * 1000;
    // Allow a 2-second jitter for the call's own duration.
    expect(Math.abs(sinceMs - expectedMs)).toBeLessThan(2_000);
  });

  it("sampleAuthors capped at 10 distinct entries", () => {
    const stdout = Array.from({ length: 20 }, (_, i) => `sha${i}\tauthor-${i}`).join("\n");
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 48, excludeAuthors: [] },
      gitOk(stdout),
    );
    expect(r.nonGolfCommitCount).toBe(20);
    expect(r.sampleAuthors.length).toBeLessThanOrEqual(10);
  });

  it("git runner is called with bounded `git log` args", () => {
    let capturedArgs: string[] = [];
    let capturedCwd = "";
    const spyRunner: ActivityGitRunner = (args, cwd) => {
      capturedArgs = args;
      capturedCwd = cwd;
      return { status: 0, stdout: "", stderr: "" };
    };
    checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 48, excludeAuthors: [] },
      spyRunner,
    );
    expect(capturedCwd).toBe("/tmp/repo");
    expect(capturedArgs[0]).toBe("log");
    expect(capturedArgs).toContain("--pretty=%H%x09%an");
    // `-n 50` cap keeps the call cheap.
    expect(capturedArgs).toContain("-n");
    expect(capturedArgs[capturedArgs.indexOf("-n") + 1]).toBe("50");
    // --since=<iso>
    expect(capturedArgs.some((a) => /^--since=/.test(a))).toBe(true);
  });

  it("returns deterministic shape on success", () => {
    const r = checkFleetIdle(
      { repoRoot: "/tmp/repo", windowHours: 6, excludeAuthors: ["golf-"] },
      gitOk(""),
    );
    expect(Object.keys(r).sort()).toEqual([
      "inconclusive", "isIdle", "nonGolfCommitCount", "sampleAuthors", "sinceIso", "windowHours",
    ]);
  });
});
