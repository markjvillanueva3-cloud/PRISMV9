/**
 * MemoryMirrorToVault.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U04 — verifies memory-mirror hook +
 * mirror-memories-bootstrap script with concrete behavioral assertions.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";

const HOOK = "H:/prism/.claude/hooks/memory-mirror-to-vault.mjs";
const SCRIPT = "H:/prism/scripts/mirror-memories-bootstrap.mjs";
const VAULT = "H:/prism/knowledge/memories";
const MEM_DIR = "C:/Users/wompu/.claude/projects/H--prism/memory";

function runHook(payload: unknown) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    timeout: 15_000,
  });
}

function runBootstrap(args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    timeout: 30_000,
  });
}

describe("memory-mirror-to-vault hook — P1-U04", () => {
  it("exits 0 with empty stdin and emits continue:true exactly", () => {
    const r = spawnSync(process.execPath, [HOOK], { input: "", encoding: "utf8", timeout: 5_000 });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("non-Write tool produces continue:true with no extra keys", () => {
    const r = runHook({ tool_name: "Read", tool_input: { file_path: "any.md" } });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(["continue"]);
    expect(parsed.continue).toBe(true);
  });

  it("Write outside memory dir does NOT mirror anything", () => {
    const targetIfMirrored = `${VAULT}/uncategorized/random-outside.md`;
    if (existsSync(targetIfMirrored)) rmSync(targetIfMirrored);
    const r = runHook({ tool_name: "Write", tool_input: { file_path: "H:/prism/random/random-outside.md" } });
    expect(r.status).toBe(0);
    expect(existsSync(targetIfMirrored)).toBe(false);
  });

  it("Write to memory dir but non-md file does NOT mirror", () => {
    const txtPath = `${MEM_DIR}/p1u04-test-skip.txt`;
    const txtTargetIfMirrored = `${VAULT}/uncategorized/p1u04-test-skip.txt`;
    if (!existsSync(MEM_DIR)) mkdirSync(MEM_DIR, { recursive: true });
    writeFileSync(txtPath, "not markdown");
    if (existsSync(txtTargetIfMirrored)) rmSync(txtTargetIfMirrored);
    try {
      runHook({ tool_name: "Write", tool_input: { file_path: txtPath } });
      expect(existsSync(txtTargetIfMirrored)).toBe(false);
    } finally {
      try { rmSync(txtPath); } catch { /* ignore */ }
    }
  });

  it("mirrors memory .md to feedback/ subdir with byte-identical content", () => {
    const testName = "feedback_p1u04_unittest.md";
    const testPath = `${MEM_DIR}/${testName}`;
    if (!existsSync(MEM_DIR)) mkdirSync(MEM_DIR, { recursive: true });
    const content = "---\nname: P1-U04 unit test\n---\n\nReal content for memory-mirror.";
    writeFileSync(testPath, content);
    const mirrored = `${VAULT}/feedback/${testName}`;
    if (existsSync(mirrored)) rmSync(mirrored);
    try {
      const r = runHook({ tool_name: "Write", tool_input: { file_path: testPath } });
      expect(r.status).toBe(0);
      const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
      const ctx = out.hookSpecificOutput?.additionalContext ?? "";
      expect(ctx).toMatch(/feedback\/feedback_p1u04_unittest\.md/);
      expect(ctx).toMatch(/embed=(ok|embed-skip)/);
      expect(existsSync(mirrored)).toBe(true);
      expect(readFileSync(mirrored, "utf8")).toBe(content);
    } finally {
      try { rmSync(testPath); } catch { /* ignore */ }
      try { rmSync(mirrored); } catch { /* ignore */ }
    }
  });

  it("project_ prefix routes to project/ subdir (variability)", () => {
    const testName = "project_p1u04_routing.md";
    const testPath = `${MEM_DIR}/${testName}`;
    const expected = `${VAULT}/project/${testName}`;
    if (!existsSync(MEM_DIR)) mkdirSync(MEM_DIR, { recursive: true });
    writeFileSync(testPath, "category routing test");
    if (existsSync(expected)) rmSync(expected);
    try {
      runHook({ tool_name: "Write", tool_input: { file_path: testPath } });
      expect(existsSync(expected)).toBe(true);
      expect(readFileSync(expected, "utf8")).toBe("category routing test");
    } finally {
      try { rmSync(testPath); } catch { /* ignore */ }
      try { rmSync(expected); } catch { /* ignore */ }
    }
  });

  it("user_ prefix routes to user/ subdir (variability)", () => {
    const testName = "user_p1u04_routing.md";
    const testPath = `${MEM_DIR}/${testName}`;
    const expected = `${VAULT}/user/${testName}`;
    if (!existsSync(MEM_DIR)) mkdirSync(MEM_DIR, { recursive: true });
    writeFileSync(testPath, "user category test");
    if (existsSync(expected)) rmSync(expected);
    try {
      runHook({ tool_name: "Write", tool_input: { file_path: testPath } });
      expect(existsSync(expected)).toBe(true);
      expect(readFileSync(expected, "utf8")).toBe("user category test");
    } finally {
      try { rmSync(testPath); } catch { /* ignore */ }
      try { rmSync(expected); } catch { /* ignore */ }
    }
  });

  it("unknown prefix routes to uncategorized/ (variability)", () => {
    const testName = "weird_xyz_p1u04.md";
    const testPath = `${MEM_DIR}/${testName}`;
    const expected = `${VAULT}/uncategorized/${testName}`;
    if (!existsSync(MEM_DIR)) mkdirSync(MEM_DIR, { recursive: true });
    writeFileSync(testPath, "fallback category test");
    if (existsSync(expected)) rmSync(expected);
    try {
      runHook({ tool_name: "Write", tool_input: { file_path: testPath } });
      expect(existsSync(expected)).toBe(true);
      expect(readFileSync(expected, "utf8")).toBe("fallback category test");
    } finally {
      try { rmSync(testPath); } catch { /* ignore */ }
      try { rmSync(expected); } catch { /* ignore */ }
    }
  });

  it("ADV: malformed JSON stdin → exits 0 with continue:true exactly", () => {
    const r = spawnSync(process.execPath, [HOOK], { input: "garbage{{", encoding: "utf8", timeout: 5_000 });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("ADV: tool_input missing → no mirror, exact continue:true output", () => {
    const r = runHook({ tool_name: "Write" });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });
});

describe("mirror-memories-bootstrap script — P1-U04", () => {
  it("--dry-run reports correct source/target and scans real files", () => {
    const r = runBootstrap(["--dry-run"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as {
      dryRun: boolean;
      scanned: number;
      mirrored: number;
      source: string;
      target: string;
    };
    expect(stats.dryRun).toBe(true);
    expect(stats.source).toBe(MEM_DIR);
    expect(stats.target).toBe(VAULT);
    expect(stats.scanned).toBeGreaterThan(10);
    expect(stats.mirrored).toBe(stats.scanned);
  });

  it("--no-embed runs full mirror without contacting Qdrant", () => {
    const r = runBootstrap(["--no-embed"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as { embedAttempted: boolean; embedded: number; embedFailed: number };
    expect(stats.embedAttempted).toBe(false);
    expect(stats.embedded).toBe(0);
    expect(stats.embedFailed).toBe(0);
  });

  it("byCategory keys are within canonical set and sum to scanned total", () => {
    const r = runBootstrap(["--dry-run"]);
    const stats = JSON.parse(r.stdout) as { byCategory: Record<string, number>; scanned: number };
    const keys = Object.keys(stats.byCategory);
    const allowed = new Set(["feedback", "project", "user", "reference", "mistakes", "patterns", "_index", "uncategorized"]);
    for (const k of keys) expect(allowed.has(k)).toBe(true);
    const sum = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
    expect(sum).toBe(stats.scanned);
  });

  it("FAIL: unknown CLI flag exits 2 with stderr message", () => {
    const r = runBootstrap(["--bogus"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Unknown arg/);
  });

  it("ADV: --help prints usage and does not run scan", () => {
    const r = runBootstrap(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
    expect(r.stdout).not.toMatch(/byCategory/);
  });

  it("idempotency: second --no-embed run reports skippedUnchanged > 0", () => {
    const first = runBootstrap(["--no-embed"]);
    expect(first.status).toBe(0);
    const second = runBootstrap(["--no-embed"]);
    expect(second.status).toBe(0);
    const stats = JSON.parse(second.stdout) as { skippedUnchanged: number };
    expect(stats.skippedUnchanged).toBeGreaterThan(0);
  });
});
