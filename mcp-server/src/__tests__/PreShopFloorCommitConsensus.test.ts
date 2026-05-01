/**
 * PreShopFloorCommitConsensus.test.ts — verdict-correctness suite for
 * `.claude/hooks/pre-shop-floor-commit-consensus.mjs` (P4-U03).
 *
 * Spawns the hook as a child process per case using `process.execPath` and
 * a tmp git repo so the hook's `git diff --cached` reads test fixtures, not
 * this repo's working tree.
 *
 * Cases (per envelope INTEL-OLLAMA-OBSIDIAN-MS1 P4-U03 exit_conditions):
 *   (a) intentionally bad constants edit (kc1.1=99 for steel) staged
 *       → FAIL → exit code != 0 AND stderr contains "consensus FAIL"
 *   (b) doc-only edit (README.md)
 *       → silent → exit 0, stderr empty (zero gate invocation)
 *   (c) good constants edit (kc1.1=2100 reformatted, in-range)
 *       → PASS → exit 0, stderr silent
 *   (d) PRISM_CONSENSUS_FORCE_TIMEOUT=1
 *       → CONDITIONAL → exit 0, stderr contains "CONDITIONAL" and "timeout"
 */

import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// __tests__ → src → mcp-server → repo-root → .claude/hooks/...
const HOOK_PATH = resolve(
  HERE,
  "..",
  "..",
  "..",
  ".claude",
  "hooks",
  "pre-shop-floor-commit-consensus.mjs"
);

function makeRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "prism-consensus-hook-"));
  execFileSync("git", ["init", "--quiet", "--initial-branch=main"], { cwd: root });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: root });
  return root;
}

function writeAndStage(root: string, relPath: string, content: string): void {
  const full = join(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
  execFileSync("git", ["add", "--", relPath], { cwd: root });
}

function runHook(
  root: string,
  env: Record<string, string> = {}
): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    cwd: root,
    encoding: "utf8",
    input: JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "git commit -m 'test'" },
    }),
    env: { ...process.env, ...env },
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

describe("pre-shop-floor-commit-consensus.mjs (P4-U03)", () => {
  it("(a) kc1.1=99 staged for steel → consensus FAIL → blocks commit (exit 2)", () => {
    const root = makeRepo();
    try {
      // Seed an in-range constants.ts so the diff is an EDIT (added line carries kc1.1=99).
      writeAndStage(
        root,
        "src/physics/constants.ts",
        "export const KIENZLE = { kc11: 2100 };\n"
      );
      execFileSync("git", ["commit", "--quiet", "-m", "seed"], { cwd: root });

      writeFileSync(
        join(root, "src/physics/constants.ts"),
        "export const KIENZLE = { kc11: 99 };\n",
        "utf8"
      );
      execFileSync("git", ["add", "--", "src/physics/constants.ts"], { cwd: root });

      const r = runHook(root);
      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(/consensus FAIL/);
      // Either the range-check rationale OR the inline-detect rationale — both are valid kienzle FAILs.
      expect(r.stderr).toMatch(/kc1\.1=99|outside steel range|inlined/i);
      // Domain should be detected as kienzle (home expert vetoed).
      expect(r.stderr).toMatch(/domain=kienzle/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(b) doc-only edit → no trigger match → silent exit 0, no gate invocation", () => {
    const root = makeRepo();
    try {
      writeAndStage(root, "README.md", "# Project\n\nNew section.\n");
      const r = runHook(root);
      expect(r.status).toBe(0);
      expect(r.stderr).toBe("");
      expect(r.stdout).toBe("");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(c) constants.ts reformatted, kc1.1=2100 in-range → consensus PASS → exit 0 silent", () => {
    const root = makeRepo();
    try {
      writeAndStage(
        root,
        "src/physics/constants.ts",
        "export const KIENZLE = { kc11: 2100 };\n"
      );
      execFileSync("git", ["commit", "--quiet", "-m", "seed"], { cwd: root });

      writeFileSync(
        join(root, "src/physics/constants.ts"),
        "export const KIENZLE = {\n  kc11: 2100,\n};\n",
        "utf8"
      );
      execFileSync("git", ["add", "--", "src/physics/constants.ts"], { cwd: root });

      const r = runHook(root);
      expect(r.status).toBe(0);
      expect(r.stderr).toBe("");
      expect(r.stdout).toBe("");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(d) PRISM_CONSENSUS_FORCE_TIMEOUT=1 → CONDITIONAL warning, exit 0", () => {
    const root = makeRepo();
    try {
      // Need a triggered file so the hook reaches the timeout branch
      // (which only fires AFTER the trigger filter).
      writeAndStage(
        root,
        "src/physics/constants.ts",
        "export const KIENZLE = { kc11: 2100 };\n"
      );
      const r = runHook(root, { PRISM_CONSENSUS_FORCE_TIMEOUT: "1" });
      expect(r.status).toBe(0);
      expect(r.stderr).toMatch(/CONDITIONAL/);
      expect(r.stderr).toMatch(/timeout/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("non-Bash tool invocation → silent exit 0 (hook only inspects Bash)", () => {
    const root = makeRepo();
    try {
      writeAndStage(
        root,
        "src/physics/constants.ts",
        "export const KIENZLE = { kc11: 99 };\n" // would otherwise FAIL
      );
      const r = spawnSync(process.execPath, [HOOK_PATH], {
        cwd: root,
        encoding: "utf8",
        input: JSON.stringify({
          tool_name: "Edit",
          tool_input: { file_path: "x.ts", old_string: "a", new_string: "b" },
        }),
        env: process.env,
      });
      expect(r.status).toBe(0);
      expect(r.stderr ?? "").toBe("");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("non-commit git command → silent exit 0", () => {
    const root = makeRepo();
    try {
      writeAndStage(
        root,
        "src/physics/constants.ts",
        "export const KIENZLE = { kc11: 99 };\n"
      );
      const r = spawnSync(process.execPath, [HOOK_PATH], {
        cwd: root,
        encoding: "utf8",
        input: JSON.stringify({
          tool_name: "Bash",
          tool_input: { command: "git status" },
        }),
        env: process.env,
      });
      expect(r.status).toBe(0);
      expect(r.stderr ?? "").toBe("");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
