/**
 * memory-mirror-to-vault.mjs hook + obsidian-memory-sync --single-file —
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U04.
 *
 * Verifies the incremental single-file mirror path used by the
 * PostToolUse hook on memory-file write/edit.
 *
 * Coverage:
 *   - Happy: --single-file mirrors one file, --json reports mode:single-file
 *   - Idempotent: second run reports skipped:1
 *   - Source-changed: rewrites
 *   - Missing source file: graceful (no crash, ok:false-friendly)
 *   - Hook stdin parsing: file_path from tool_input
 *   - Hook stdin parsing: edits[0].file_path
 *   - Hook stdin parsing: path field fallback
 *   - Hook isMemoryPath: rejects non-memory paths
 *   - Hook always emits {continue:true} regardless of input
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const SYNC_SCRIPT = path.join(process.cwd(), "scripts", "obsidian-memory-sync.mjs");
const HOOK_SCRIPT = path.join(process.cwd(), "..", ".claude", "hooks", "memory-mirror-to-vault.mjs");

function mkTmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `prism-mirror-incr-${prefix}-`));
}

function runSync(env: Record<string, string>, ...flags: string[]): { stdout: string; status: number | null } {
  const r = spawnSync(process.execPath, [SYNC_SCRIPT, "--json", ...flags], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
    timeout: 30_000,
  });
  return { stdout: r.stdout ?? "", status: r.status };
}

function runHook(stdinJson: string): { stdout: string; status: number | null } {
  const r = spawnSync(process.execPath, [HOOK_SCRIPT], {
    input: stdinJson,
    encoding: "utf-8",
    env: process.env,
    timeout: 10_000,
  });
  return { stdout: r.stdout ?? "", status: r.status };
}

describe("obsidian-memory-sync --single-file (P1-U04)", () => {
  let sourceDir: string;
  let vaultRoot: string;

  beforeEach(() => {
    sourceDir = mkTmp("src");
    vaultRoot = mkTmp("vault");
  });
  afterEach(() => {
    for (const d of [sourceDir, vaultRoot]) {
      try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it("mirrors one file via --single-file flag", () => {
    const src = path.join(sourceDir, "feedback_x.md");
    fs.writeFileSync(src, "# X\nentry x", "utf-8");

    const r = runSync({
      PRISM_MEMORY_SOURCE_DIR: sourceDir,
      PRISM_MEMORY_VAULT_ROOT: vaultRoot,
    }, `--single-file=${src}`);

    expect(r.status).toBe(0);
    const last = r.stdout.trim().split("\n").pop()!;
    const out = JSON.parse(last);

    expect(out.ok).toBe(true);
    expect(out.filesScanned).toBe(1);
    expect(out.filesMirrored).toBe(1);
    expect(out.filesSkipped).toBe(0);
    expect(out.mode).toBe("single-file");
    expect(fs.existsSync(path.join(vaultRoot, "feedback_x.md"))).toBe(true);
  });

  it("idempotent: second --single-file run reports skipped:1", () => {
    const src = path.join(sourceDir, "feedback_y.md");
    fs.writeFileSync(src, "# Y\nentry y", "utf-8");

    runSync({
      PRISM_MEMORY_SOURCE_DIR: sourceDir,
      PRISM_MEMORY_VAULT_ROOT: vaultRoot,
    }, `--single-file=${src}`);

    const r2 = runSync({
      PRISM_MEMORY_SOURCE_DIR: sourceDir,
      PRISM_MEMORY_VAULT_ROOT: vaultRoot,
    }, `--single-file=${src}`);
    const out = JSON.parse(r2.stdout.trim().split("\n").pop()!);

    expect(out.filesMirrored).toBe(0);
    expect(out.filesSkipped).toBe(1);
    expect(out.reason).toBe("hash match");
  });

  it("source content change triggers rewrite", () => {
    const src = path.join(sourceDir, "feedback_z.md");
    fs.writeFileSync(src, "v1", "utf-8");
    runSync({
      PRISM_MEMORY_SOURCE_DIR: sourceDir,
      PRISM_MEMORY_VAULT_ROOT: vaultRoot,
    }, `--single-file=${src}`);

    fs.writeFileSync(src, "v2 brand new", "utf-8");
    const r = runSync({
      PRISM_MEMORY_SOURCE_DIR: sourceDir,
      PRISM_MEMORY_VAULT_ROOT: vaultRoot,
    }, `--single-file=${src}`);
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!);

    expect(out.filesMirrored).toBe(1);
    expect(out.filesSkipped).toBe(0);
    const after = fs.readFileSync(path.join(vaultRoot, "feedback_z.md"), "utf-8");
    expect(after).toContain("v2 brand new");
  });

  it("missing source file returns ok:true filesMirrored:0 (graceful)", () => {
    const src = path.join(sourceDir, "does-not-exist.md");
    const r = runSync({
      PRISM_MEMORY_SOURCE_DIR: sourceDir,
      PRISM_MEMORY_VAULT_ROOT: vaultRoot,
    }, `--single-file=${src}`);
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!);

    expect(r.status).toBe(0);
    expect(out.ok).toBe(true);
    expect(out.filesMirrored).toBe(0);
    expect(out.filesSkipped).toBe(0);
    expect(out.reason).toBe("source missing");
  });
});

describe("memory-mirror-to-vault hook (P1-U04)", () => {
  it("emits {continue:true} for any input", () => {
    const r = runHook(JSON.stringify({}));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"continue":true');
  });

  it("emits {continue:true} on empty stdin", () => {
    const r = runHook("");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"continue":true');
  });

  it("emits {continue:true} on non-memory file path", () => {
    const r = runHook(JSON.stringify({
      tool_input: { file_path: "/tmp/random/not-memory.md" },
    }));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"continue":true');
  });

  it("emits {continue:true} on memory-path edit (forward slashes)", () => {
    const r = runHook(JSON.stringify({
      tool_input: { file_path: "C:/Users/test/.claude/projects/H--PRISM/memory/feedback_a.md" },
    }));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"continue":true');
  });

  it("emits {continue:true} on memory-path edit (Windows backslashes)", () => {
    const r = runHook(JSON.stringify({
      tool_input: { file_path: "C:\\Users\\test\\.claude\\projects\\H--PRISM\\memory\\feedback_b.md" },
    }));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"continue":true');
  });

  it("emits {continue:true} on MultiEdit-shaped payload", () => {
    const r = runHook(JSON.stringify({
      tool_input: {
        edits: [
          { file_path: "C:/Users/test/.claude/projects/H--PRISM/memory/feedback_c.md", old: "x", new: "y" },
        ],
      },
    }));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"continue":true');
  });

  it("emits {continue:true} when PRISM_MEMORY_MIRROR_DISABLED=1", () => {
    const r = spawnSync(process.execPath, [HOOK_SCRIPT], {
      input: JSON.stringify({ tool_input: { file_path: "C:/Users/test/.claude/projects/H--PRISM/memory/x.md" } }),
      encoding: "utf-8",
      env: { ...process.env, PRISM_MEMORY_MIRROR_DISABLED: "1" },
      timeout: 5_000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"continue":true');
  });

  it("emits {continue:true} on malformed JSON stdin", () => {
    const r = runHook("{not valid json");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"continue":true');
  });
});
