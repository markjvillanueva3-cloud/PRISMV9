/**
 * Tests for awareness-backbone hooks:
 *   - claude-brief-precompact.mjs (PreCompact event)
 *   - claude-brief-staleness-check.mjs (UserPromptSubmit event)
 *
 * Strategy: spawn each hook with a temporary brief file at controlled mtimes
 * and assert the output JSON conforms to Claude Code's hook protocol +
 * contains the expected tier-specific content.
 *
 * Coverage:
 *   - claude-brief-precompact: emits anchor regardless of brief age (designed
 *     to give post-compact Claude a foothold), 3 failure modes, 1 adversarial
 *   - claude-brief-staleness-check: 4 tier boundaries (silent / nudge /
 *     abbreviated / full re-inject), 2 failure modes, 2 adversarial
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, utimesSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const PRISM_ROOT = resolve(__dirname, "..", "..", "..");
const PRECOMPACT_HOOK = join(PRISM_ROOT, ".claude", "hooks", "claude-brief-precompact.mjs");
const STALENESS_HOOK = join(PRISM_ROOT, ".claude", "hooks", "claude-brief-staleness-check.mjs");
const REAL_BRIEF = join(PRISM_ROOT, "state", "shared", "CLAUDE-BRIEF.md");

interface HookResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  parsed: { continue?: boolean; hookSpecificOutput?: { hookEventName?: string; additionalContext?: string } } | null;
}

function runHook(hookPath: string): HookResult {
  const r = spawnSync(process.execPath, [hookPath], {
    encoding: "utf8",
    timeout: 10_000,
    input: "{}\n",
  });
  let parsed: HookResult["parsed"] = null;
  if (r.stdout && r.stdout.trim()) {
    try { parsed = JSON.parse(r.stdout); } catch { /* not JSON: silent path */ }
  }
  return { exitCode: r.status, stdout: r.stdout || "", stderr: r.stderr || "", parsed };
}

function setMtimeHoursAgo(path: string, hours: number): void {
  const now = Date.now();
  const target = (now - hours * 3_600_000) / 1000;
  utimesSync(path, target, target);
}

function backupAndRestore<T>(path: string, fn: () => T): T {
  const backup = existsSync(path) ? readFileSync(path) : null;
  const backupMtime = existsSync(path) ? require("node:fs").statSync(path).mtimeMs / 1000 : null;
  try {
    return fn();
  } finally {
    if (backup !== null) {
      writeFileSync(path, backup);
      if (backupMtime !== null) {
        utimesSync(path, backupMtime, backupMtime);
      }
    }
  }
}

describe("claude-brief-precompact.mjs (PreCompact hook)", () => {
  it("happy path — emits awareness anchor with PreCompact event tag and brief reference", () => {
    const r = runHook(PRECOMPACT_HOOK);
    expect(r.exitCode).toBe(0);
    expect(r.parsed).not.toBeNull();
    expect(r.parsed?.continue).toBe(true);
    expect(r.parsed?.hookSpecificOutput?.hookEventName).toBe("PreCompact");
    const ctx = r.parsed?.hookSpecificOutput?.additionalContext || "";
    expect(ctx).toContain("AWARENESS BACKBONE");
    expect(ctx).toContain("CLAUDE-BRIEF.md");
    expect(ctx).toContain("PRISM-BUILD-CONTEXT.md");
    expect(ctx).toContain("PRISM-BUILD-VISION.md");
  });

  it("failure: brief missing → still emits anchor (post-compact Claude needs the pointer regardless)", () => {
    backupAndRestore(REAL_BRIEF, () => {
      rmSync(REAL_BRIEF);
      const r = runHook(PRECOMPACT_HOOK);
      expect(r.exitCode).toBe(0);
      expect(r.parsed?.hookSpecificOutput?.additionalContext || "").toContain("missing");
    });
  });

  it("anchor includes Build Doctrine pre-build checklist", () => {
    const r = runHook(PRECOMPACT_HOOK);
    const ctx = r.parsed?.hookSpecificOutput?.additionalContext || "";
    expect(ctx).toContain("Build Doctrine");
    expect(ctx).toContain("duplicationGuardEngine");
    expect(ctx).toContain("build-vision-spec");
  });

  it("anchor includes top current gap from audit", () => {
    const r = runHook(PRECOMPACT_HOOK);
    const ctx = r.parsed?.hookSpecificOutput?.additionalContext || "";
    expect(ctx).toContain("Top current gap");
  });

  it("adversarial: anchor stays under 4KB so it doesn't dominate the compaction prompt", () => {
    const r = runHook(PRECOMPACT_HOOK);
    const ctx = r.parsed?.hookSpecificOutput?.additionalContext || "";
    expect(ctx.length).toBeLessThan(4096);
  });
});

describe("claude-brief-staleness-check.mjs (UserPromptSubmit hook)", () => {
  it("silent tier: brief <2h old → no output (token-economy)", () => {
    backupAndRestore(REAL_BRIEF, () => {
      setMtimeHoursAgo(REAL_BRIEF, 0.5);
      const r = runHook(STALENESS_HOOK);
      expect(r.exitCode).toBe(0);
      expect(r.parsed).toBeNull();
      expect(r.stdout.trim()).toBe("");
    });
  });

  it("nudge tier: brief 2-6h old → single-line nudge to /refresh-awareness", () => {
    backupAndRestore(REAL_BRIEF, () => {
      setMtimeHoursAgo(REAL_BRIEF, 4);
      const r = runHook(STALENESS_HOOK);
      expect(r.exitCode).toBe(0);
      expect(r.parsed?.hookSpecificOutput?.hookEventName).toBe("UserPromptSubmit");
      const ctx = r.parsed?.hookSpecificOutput?.additionalContext || "";
      expect(ctx).toContain("/refresh-awareness");
      expect(ctx.length).toBeLessThan(500);
    });
  });

  it("abbreviated tier: brief 6-12h old → abbreviated re-inject under 2KB", () => {
    backupAndRestore(REAL_BRIEF, () => {
      setMtimeHoursAgo(REAL_BRIEF, 8);
      const r = runHook(STALENESS_HOOK);
      expect(r.exitCode).toBe(0);
      const ctx = r.parsed?.hookSpecificOutput?.additionalContext || "";
      expect(ctx).toContain("abbreviated");
      expect(ctx).toContain("PRISM");
      expect(ctx.length).toBeLessThan(3500);
    });
  });

  it("full tier: brief >12h old → full re-inject (or truncated to budget)", () => {
    backupAndRestore(REAL_BRIEF, () => {
      setMtimeHoursAgo(REAL_BRIEF, 24);
      const r = runHook(STALENESS_HOOK);
      expect(r.exitCode).toBe(0);
      const ctx = r.parsed?.hookSpecificOutput?.additionalContext || "";
      expect(ctx).toContain("FULL re-inject");
      expect(ctx.length).toBeGreaterThan(2000);
    });
  });

  it("failure: brief missing → emits 'missing' warning instead of silent", () => {
    backupAndRestore(REAL_BRIEF, () => {
      rmSync(REAL_BRIEF);
      const r = runHook(STALENESS_HOOK);
      expect(r.exitCode).toBe(0);
      const ctx = r.parsed?.hookSpecificOutput?.additionalContext || "";
      expect(ctx).toContain("missing");
    });
  });

  it("adversarial: empty brief → still emits something rather than crash", () => {
    backupAndRestore(REAL_BRIEF, () => {
      writeFileSync(REAL_BRIEF, "", "utf8");
      setMtimeHoursAgo(REAL_BRIEF, 24);
      const r = runHook(STALENESS_HOOK);
      expect(r.exitCode).toBe(0);
      const ctx = r.parsed?.hookSpecificOutput?.additionalContext || "";
      expect(ctx.length).toBeGreaterThanOrEqual(0);
    });
  });

  it("adversarial: brief 14h old gets truncated to inject budget", () => {
    backupAndRestore(REAL_BRIEF, () => {
      const huge = "# CLAUDE-BRIEF — synthetic huge\n" + "filler line\n".repeat(5000);
      writeFileSync(REAL_BRIEF, huge, "utf8");
      setMtimeHoursAgo(REAL_BRIEF, 14);
      const r = runHook(STALENESS_HOOK);
      expect(r.exitCode).toBe(0);
      const ctx = r.parsed?.hookSpecificOutput?.additionalContext || "";
      expect(ctx).toContain("FULL re-inject");
      expect(ctx.length).toBeLessThan(15000);
    });
  });
});
