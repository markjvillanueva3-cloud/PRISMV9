/**
 * ChunkClaudeMdVault.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U05 — verifies chunk-claudemd-vault.mjs +
 * claudemd-section-update.mjs hook + claudemd-ollama-enforcer.mjs
 * semantic-search-first path.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const CHUNKER = "H:/prism/scripts/chunk-claudemd-vault.mjs";
const SECTION_UPDATE_HOOK = "H:/prism/.claude/hooks/claudemd-section-update.mjs";
const ENFORCER = "H:/prism/.claude/hooks/claudemd-ollama-enforcer.mjs";
const VAULT = "H:/prism/knowledge/claude-md";

function runChunker(args: string[]) {
  return spawnSync(process.execPath, [CHUNKER, ...args], {
    encoding: "utf8",
    timeout: 30_000,
  });
}

function runHook(hookPath: string, payload: unknown) {
  return spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    timeout: 12_000,
  });
}

describe("chunk-claudemd-vault — P1-U05", () => {
  it("--dry-run reports project + global sources with chunk counts", () => {
    const r = runChunker(["--dry-run"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as {
      bySource: Record<string, { exists: boolean; chunks?: number }>;
      totalChunks: number;
      target: string;
    };
    expect(stats.target).toBe(VAULT);
    expect(stats.bySource.project?.exists).toBe(true);
    expect(typeof stats.bySource.project?.chunks).toBe("number");
    expect(stats.totalChunks).toBeGreaterThan(20);
  });

  it("--no-embed mirrors all chunks without contacting Qdrant", () => {
    const r = runChunker(["--no-embed"]);
    expect(r.status).toBe(0);
    const stats = JSON.parse(r.stdout) as {
      embedAttempted: boolean;
      totalEmbedded: number;
      totalEmbedFailed: number;
      totalChunks: number;
      totalMirrored: number;
    };
    expect(stats.embedAttempted).toBe(false);
    expect(stats.totalEmbedded).toBe(0);
    expect(stats.totalEmbedFailed).toBe(0);
  });

  it("vault contains project- and global-prefixed chunk files", () => {
    const r = runChunker(["--no-embed"]);
    expect(r.status).toBe(0);
    expect(existsSync(VAULT)).toBe(true);
    // At least the preamble chunks for both sources must exist
    expect(existsSync(`${VAULT}/project-preamble.md`)).toBe(true);
    expect(existsSync(`${VAULT}/global-preamble.md`)).toBe(true);
  });

  it("each chunk file has required frontmatter fields", () => {
    runChunker(["--no-embed"]);
    const sample = `${VAULT}/project-preamble.md`;
    expect(existsSync(sample)).toBe(true);
    const content = readFileSync(sample, "utf8");
    expect(content).toMatch(/^---/);
    expect(content).toMatch(/source: project/);
    expect(content).toMatch(/section: /);
    expect(content).toMatch(/slug: /);
    expect(content).toMatch(/indexed_at: \d{4}-\d{2}-\d{2}/);
  });

  it("idempotency: second run skips unchanged chunks", () => {
    runChunker(["--no-embed"]);
    const second = runChunker(["--no-embed"]);
    expect(second.status).toBe(0);
    const stats = JSON.parse(second.stdout) as {
      bySource: Record<string, { skipped?: number; mirrored?: number }>;
    };
    const projectSkipped = stats.bySource.project?.skipped ?? 0;
    expect(projectSkipped).toBeGreaterThan(0);
  });

  it("FAIL: unknown CLI flag exits 2 with stderr message", () => {
    const r = runChunker(["--bogus"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Unknown arg/);
  });

  it("ADV: --help short-circuits without scanning", () => {
    const r = runChunker(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
    expect(r.stdout).not.toMatch(/totalChunks/);
  });
});

describe("claudemd-section-update hook — P1-U05", () => {
  it("ignores non-Write tools with continue:true exactly", () => {
    const r = runHook(SECTION_UPDATE_HOOK, { tool_name: "Read", tool_input: { file_path: "H:/prism/CLAUDE.md" } });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("ignores Write to non-CLAUDE.md files", () => {
    const r = runHook(SECTION_UPDATE_HOOK, { tool_name: "Write", tool_input: { file_path: "H:/prism/random.md" } });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("spawns chunker for project CLAUDE.md edit (reports pid)", () => {
    const r = runHook(SECTION_UPDATE_HOOK, { tool_name: "Edit", tool_input: { file_path: "H:/prism/CLAUDE.md" } });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { hookSpecificOutput?: { additionalContext?: string } };
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toMatch(/claudemd-chunker spawned \(pid=\d+\)/);
  });

  it("ADV: empty stdin → continue:true exactly", () => {
    const r = spawnSync(process.execPath, [SECTION_UPDATE_HOOK], { input: "", encoding: "utf8", timeout: 5_000 });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("ADV: malformed JSON stdin → continue:true exactly", () => {
    const r = spawnSync(process.execPath, [SECTION_UPDATE_HOOK], { input: "garbage{{", encoding: "utf8", timeout: 5_000 });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });
});

describe("claudemd-ollama-enforcer — semantic path (P1-U05)", () => {
  it("trivial prompt skipped (length < 15) — returns continue:true exactly", () => {
    const r = runHook(ENFORCER, { prompt: "ok" });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("slash command prompt skipped — returns continue:true exactly", () => {
    const r = runHook(ENFORCER, { prompt: "/handoff" });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("real prompt yields parseable JSON envelope (continue:true regardless of injection)", () => {
    const r = runHook(ENFORCER, { prompt: "how do I wire a new dispatcher action with proper schema validation" });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as { continue: boolean };
    expect(parsed.continue).toBe(true);
  });
});
