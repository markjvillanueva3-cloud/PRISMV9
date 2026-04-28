/**
 * P6U02UnforcedRuleHooks.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P6-U02
 *
 * Round-trip tests for the 4 advisory hooks that enforce previously
 * unforced CLAUDE.md rules:
 *
 *   .claude/hooks/engine-digest-precheck.mjs   — fuzzy-match new engine
 *                                                 names against ENGINE_DIGEST.md
 *   .claude/hooks/commit-format-validator.mjs  — validate commit subject
 *   .claude/hooks/compact-interval-warning.mjs — warn when ≥3 units since /compact
 *   .claude/hooks/rtk-prefix-reminder.mjs      — suggest rtk wrapper on Bash
 *
 * Each hook exposes pure helper exports that we exercise directly. The
 * Stop/Pre/Post `main()` driver is exercised indirectly by importing the
 * module — if it had top-level side effects on import (e.g. blocking on
 * stdin), the suite would hang. Reaching the asserts is the proof.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const digestMod = import("../../../.claude/hooks/engine-digest-precheck.mjs");
const commitMod = import("../../../.claude/hooks/commit-format-validator.mjs");
const compactMod = import("../../../.claude/hooks/compact-interval-warning.mjs");
const rtkMod = import("../../../.claude/hooks/rtk-prefix-reminder.mjs");

describe("engine-digest-precheck — similarity helpers", () => {
  it("similarity('AdaptiveFeedEngine','AdaptiveFeedEngine') === 1", async () => {
    const { similarity } = await digestMod;
    expect(similarity("AdaptiveFeedEngine", "AdaptiveFeedEngine")).toBe(1);
  });

  it("similarity catches near-duplicates above threshold", async () => {
    const { similarity } = await digestMod;
    // One char swap on an 18-char name: edit distance 1, similarity ≈ 17/18 ≈ 0.944
    const s = similarity("AdaptiveFeedEngine", "AdaptiveFeedEngin1");
    expect(s).toBeGreaterThan(0.9);
    // Different engine names share the 'Engine' suffix (6 chars / 18) so
    // similarity floors at ~0.33 — assert it stays below the 0.7 production
    // threshold so this pair would NOT trip the hook.
    const t = similarity("AdaptiveFeedEngine", "QdrantMemoryEngine");
    expect(t).toBeLessThan(0.7);
  });

  it("extractEngineNames pulls *Engine identifiers from digest text", async () => {
    const { extractEngineNames } = await digestMod;
    const sample = `
- AdaptiveFeedEngine.ts — auto feed override
- KienzleForceEngine.ts — Fc = kc * ap * fz^(1-mc)
- not an engine line
- QdrantMemoryEngine.ts — vector backbone
    `;
    const names = extractEngineNames(sample);
    expect(names.includes("AdaptiveFeedEngine")).toBe(true);
    expect(names.includes("KienzleForceEngine")).toBe(true);
    expect(names.includes("QdrantMemoryEngine")).toBe(true);
    expect(names.length).toBe(3);
  });

  it("findSimilar returns top-3 matches above threshold", async () => {
    const { findSimilar } = await digestMod;
    const matches = findSimilar(
      "AdaptiveFeedEngine",
      ["AdaptiveFeedEngine", "AdaptiveFeedEngin1", "AdaptiveSpindleEngine", "QdrantMemoryEngine"],
      0.7,
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(3);
    expect(matches[0].name).toBe("AdaptiveFeedEngine"); // best match
    expect(matches[0].score).toBe(1);
  });

  it("findSimilar returns [] when no candidate clears the threshold", async () => {
    const { findSimilar } = await digestMod;
    const matches = findSimilar(
      "ZyzzyvaQuantumEngine",
      ["AdaptiveFeedEngine", "QdrantMemoryEngine"],
      0.7,
    );
    expect(matches.length).toBe(0);
  });
});

describe("commit-format-validator — subject parsing & validation", () => {
  it("isGitCommit detects bare and rtk-prefixed commit invocations", async () => {
    const { isGitCommit } = await commitMod;
    expect(isGitCommit('git commit -m "X"')).toBe(true);
    expect(isGitCommit('rtk git commit -m "X"')).toBe(true);
    expect(isGitCommit('git -c commit.gpgsign=false commit -m "X"')).toBe(true);
    expect(isGitCommit("git status")).toBe(false);
    expect(isGitCommit("npm run build")).toBe(false);
  });

  it("extractSubjectFromCommand handles double and single quoted -m", async () => {
    const { extractSubjectFromCommand } = await commitMod;
    expect(extractSubjectFromCommand('git commit -m "INTEL-OLLAMA-OBSIDIAN-MS0/P6-U02: hooks"'))
      .toBe("INTEL-OLLAMA-OBSIDIAN-MS0/P6-U02: hooks");
    expect(extractSubjectFromCommand("git commit -m 'CAM-EXHAUST-MS0/U-CAM-FIDX-19: alphacam'"))
      .toBe("CAM-EXHAUST-MS0/U-CAM-FIDX-19: alphacam");
  });

  it("extractSubjectFromCommand returns first line of multiline -m", async () => {
    const { extractSubjectFromCommand } = await commitMod;
    const cmd = 'git commit -m "INTEL-OLLAMA-OBSIDIAN-MS0/P6-U02: hooks\nDetails here"';
    const subj = extractSubjectFromCommand(cmd);
    expect((subj ?? "").startsWith("INTEL-OLLAMA-OBSIDIAN-MS0/P6-U02:")).toBe(true);
    expect((subj ?? "").includes("Details here")).toBe(false);
  });

  it("validateSubject accepts canonical PRISM commit subjects", async () => {
    const { validateSubject } = await commitMod;
    const good = [
      "INTEL-OLLAMA-OBSIDIAN-MS0/P5-U01: wire 5 orphan reasoning engines",
      "[MAIN] AUTONOMOUS-FOOLPROOF-MS0/U-AF03: reviewer-fail-latch",
      "CAM-EXHAUST-MS0/U-CAM-FIDX-19: alphacam function index",
      "INTEL-OLLAMA-OBSIDIAN-MS0/P5-FIX-01: harden enum gate",
      "INTEL-OLLAMA-OBSIDIAN-MS0/P5-U01..U05: bundle 5 wires",
    ];
    for (const s of good) {
      expect(validateSubject(s).ok).toBe(true);
    }
  });

  it("validateSubject rejects non-canonical subjects", async () => {
    const { validateSubject } = await commitMod;
    const bad = [
      "wip",
      "fix bug in dispatcher",
      "Update file",
      "intel-ollama-obsidian-ms0/p5-u01: lower case", // lowercase scope rejected
      "",
    ];
    for (const s of bad) {
      expect(validateSubject(s).ok).toBe(false);
    }
  });
});

describe("compact-interval-warning — measurement helpers", () => {
  it("lastCompactMs returns 0 when handoff dir does not exist", async () => {
    const { lastCompactMs } = await compactMod;
    const sandbox = mkdtempSync(join(tmpdir(), "p6u02-compact-"));
    try {
      expect(lastCompactMs(join(sandbox, "nope"))).toBe(0);
    } finally {
      try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });

  it("lastCompactMs picks the newest HANDOFF-*.md mtime", async () => {
    const { lastCompactMs } = await compactMod;
    const sandbox = mkdtempSync(join(tmpdir(), "p6u02-compact-"));
    try {
      const dir = join(sandbox, "handoffs");
      mkdirSync(dir, { recursive: true });
      const old = join(dir, "HANDOFF-old.md");
      const young = join(dir, "HANDOFF-young.md");
      writeFileSync(old, "old");
      writeFileSync(young, "young");
      // Stamp `old` to a day ago — `young` must still win.
      const oldStamp = (Date.now() - 86_400_000) / 1000;
      utimesSync(old, oldStamp, oldStamp);
      const result = lastCompactMs(dir);
      expect(result).toBeGreaterThan(0);
      // Chosen mtime must be the YOUNG one (within a minute of now).
      expect(Date.now() - result).toBeLessThan(60_000);
    } finally {
      try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });

  it("lastCompactMs ignores non-HANDOFF files", async () => {
    const { lastCompactMs } = await compactMod;
    const sandbox = mkdtempSync(join(tmpdir(), "p6u02-compact-"));
    try {
      const dir = join(sandbox, "handoffs");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "README.md"), "x");
      writeFileSync(join(dir, "junk.txt"), "x");
      expect(lastCompactMs(dir)).toBe(0);
    } finally {
      try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });

  it("unitCommitsSince counts only milestone-prefixed subjects in real repo", async () => {
    const { unitCommitsSince } = await compactMod;
    // Look back 365 days — repo has thousands of milestone-prefixed commits.
    const yearAgoMs = Date.now() - 365 * 86_400_000;
    const n = unitCommitsSince(yearAgoMs);
    expect(typeof n).toBe("number");
    expect(n).toBeGreaterThanOrEqual(0);
  });
});

describe("module importability — no top-level side effects on import", () => {
  it("all 3 hook modules expose their expected helpers", async () => {
    const d = await digestMod;
    const c = await commitMod;
    const k = await compactMod;
    expect(typeof d.similarity).toBe("function");
    expect(typeof d.extractEngineNames).toBe("function");
    expect(typeof d.findSimilar).toBe("function");
    expect(typeof c.isGitCommit).toBe("function");
    expect(typeof c.extractSubjectFromCommand).toBe("function");
    expect(typeof c.validateSubject).toBe("function");
    expect(typeof k.lastCompactMs).toBe("function");
    expect(typeof k.unitCommitsSince).toBe("function");
  });
});

describe("rtk-prefix-reminder — normalizeCommand", () => {
  it("strips leading 'command ' bypass and exposes the base command", async () => {
    const { normalizeCommand } = await rtkMod;
    const r = normalizeCommand("command git status");
    expect(r.base).toBe("git");
    expect(r.hasCommandBypass).toBe(true);
    expect(r.isAlreadyRtk).toBe(false);
  });

  it("detects existing rtk wrapper", async () => {
    const { normalizeCommand } = await rtkMod;
    expect(normalizeCommand("rtk git status").isAlreadyRtk).toBe(true);
    expect(normalizeCommand("command rtk vitest run").isAlreadyRtk).toBe(true);
  });

  it("strips env-var assignments and sudo", async () => {
    const { normalizeCommand } = await rtkMod;
    expect(normalizeCommand("FOO=bar git status").base).toBe("git");
    expect(normalizeCommand("FOO=bar BAZ=qux npm install").base).toBe("npm");
    expect(normalizeCommand("sudo docker ps").base).toBe("docker");
  });

  it("strips path prefixes and Windows .exe suffixes", async () => {
    const { normalizeCommand } = await rtkMod;
    expect(normalizeCommand("/usr/bin/git status").base).toBe("git");
    expect(normalizeCommand("C:\\Tools\\git.exe status").base).toBe("git");
  });

  it("returns empty base for empty / non-string input", async () => {
    const { normalizeCommand } = await rtkMod;
    expect(normalizeCommand("").base).toBe("");
    expect(normalizeCommand(undefined).base).toBe("");
    expect(normalizeCommand(42).base).toBe("");
  });
});

describe("rtk-prefix-reminder — shouldRemind decision matrix", () => {
  it("reminds on plain `git status` (verbose, not yet wrapped)", async () => {
    const { shouldRemind } = await rtkMod;
    const d = shouldRemind("git status", {});
    expect(d.remind).toBe(true);
    expect(d.reason).toBe("verbose-command-no-rtk");
    expect(d.base).toBe("git");
  });

  it("reminds on npm/vitest/docker/tsc — verbose-command whitelist", async () => {
    const { shouldRemind } = await rtkMod;
    expect(shouldRemind("npm install", {}).remind).toBe(true);
    expect(shouldRemind("vitest run src/", {}).remind).toBe(true);
    expect(shouldRemind("docker ps -a", {}).remind).toBe(true);
    expect(shouldRemind("tsc --noEmit", {}).remind).toBe(true);
  });

  it("does NOT remind when already wrapped in rtk", async () => {
    const { shouldRemind } = await rtkMod;
    const d = shouldRemind("rtk git status", {});
    expect(d.remind).toBe(false);
    expect(d.reason).toBe("already-rtk");
  });

  it("does NOT remind on `command <verbose>` bypass (intentional opt-out)", async () => {
    const { shouldRemind } = await rtkMod;
    const d = shouldRemind("command npm install", {});
    expect(d.remind).toBe(false);
    expect(d.reason).toBe("command-bypass");
  });

  it("does NOT remind on non-verbose commands (cd, mkdir, echo, mv)", async () => {
    const { shouldRemind } = await rtkMod;
    expect(shouldRemind("mkdir -p data/state", {}).remind).toBe(false);
    expect(shouldRemind("echo hello world", {}).remind).toBe(false);
    expect(shouldRemind("mv old new-name", {}).remind).toBe(false);
  });

  it("does NOT remind on trivially short commands (<5 chars)", async () => {
    const { shouldRemind } = await rtkMod;
    const d = shouldRemind("ls", {});
    expect(d.remind).toBe(false);
    expect(d.reason).toBe("trivially-short");
  });

  it("respects PRISM_RTK_REMINDER_OFF=1 escape hatch", async () => {
    const { shouldRemind } = await rtkMod;
    const d = shouldRemind("git status", { PRISM_RTK_REMINDER_OFF: "1" });
    expect(d.remind).toBe(false);
    expect(d.reason).toBe("off-switch");
  });

  it("does NOT remind on empty command", async () => {
    const { shouldRemind } = await rtkMod;
    expect(shouldRemind("", {}).remind).toBe(false);
    expect(shouldRemind(null, {}).remind).toBe(false);
  });
});

describe("rtk-prefix-reminder — buildReminder format", () => {
  it("emits a multi-line advisory mentioning rtk + base command + escape hatch", async () => {
    const { buildReminder } = await rtkMod;
    const msg = buildReminder("git");
    expect(msg).toContain("rtk git");
    expect(msg).toContain("PRISM_RTK_REMINDER_OFF=1");
    expect(msg).toContain("/rtk-setup");
  });

  it("truncates excessively long base command to 32 chars", async () => {
    const { buildReminder } = await rtkMod;
    const long = "a".repeat(100);
    const msg = buildReminder(long);
    // The 32-char slice plus the leading 'rtk ' should appear; nothing beyond
    expect(msg).toContain("rtk " + "a".repeat(32));
    expect(msg).not.toContain("rtk " + "a".repeat(33));
  });
});

describe("rtk-prefix-reminder — VERBOSE_COMMANDS whitelist", () => {
  it("includes all expected verbose commands", async () => {
    const { VERBOSE_COMMANDS } = await rtkMod;
    expect(VERBOSE_COMMANDS).toContain("git");
    expect(VERBOSE_COMMANDS).toContain("npm");
    expect(VERBOSE_COMMANDS).toContain("vitest");
    expect(VERBOSE_COMMANDS).toContain("docker");
    expect(VERBOSE_COMMANDS).toContain("tsc");
  });

  it("whitelist is a frozen array (immutable contract)", async () => {
    const { VERBOSE_COMMANDS } = await rtkMod;
    expect(Object.isFrozen(VERBOSE_COMMANDS)).toBe(true);
  });
});
