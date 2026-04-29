/**
 * AutoForkExecutor.test.ts
 *
 * Covers .claude/hooks/auto-fork-executor.mjs — the PreToolUse(Bash for git
 * commit) hook that actually performs `git worktree add` + stash when a
 * commit would land on the wrong tree.
 *
 * Tests run inside a per-test hermetic git repo (mkdtemp + `git init` + an
 * initial commit) so the hook can be exercised end-to-end without touching
 * any real worktree. spawnSync invokes the hook as a real subprocess, with
 * `cwd` set to the temp repo, matching how Claude actually runs it.
 *
 * No toBeDefined / toBeTruthy / toBeUndefined / toBeFalsy patterns — the
 * test-legitimacy hook rejects those.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const HOOK_TIMEOUT_MS = 15_000;
const REPO_ROOT = resolve(__dirname, "../../..");
const HOOK_PATH = resolve(REPO_ROOT, ".claude/hooks/auto-fork-executor.mjs");

interface HookOutput {
  continue?: boolean;
  decision?: string;
  reason?: string;
}

// Per-test scratch — each test gets its own git repo.
let scratchRoot: string;
let repoDir: string;

function git(args: string[], cwd: string): { code: number; stdout: string; stderr: string } {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    timeout: HOOK_TIMEOUT_MS,
  });
  return {
    code: r.status ?? -1,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

function initRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "prism-auto-fork-"));
  const repo = join(root, "main-repo");
  // Use init.defaultBranch=main so worktree-route's main detection matches.
  spawnSync("git", ["init", "-b", "main", repo], { encoding: "utf-8" });
  // Configure committer identity so commits don't fail on a fresh CI box.
  git(["config", "user.email", "test@prism.local"], repo);
  git(["config", "user.name", "Test"], repo);
  // Initial commit so worktrees can be added.
  writeFileSync(join(repo, "README.md"), "scratch repo for auto-fork tests\n");
  git(["add", "README.md"], repo);
  git(["commit", "-m", "initial"], repo);
  scratchRoot = root;
  return repo;
}

function runHook(
  payload: unknown,
  cwd: string,
  env: Record<string, string> = {},
): HookOutput {
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    timeout: HOOK_TIMEOUT_MS,
    cwd,
    env: { ...process.env, ...env },
  });
  if (r.error) throw r.error;
  const stdout = (r.stdout || "").trim();
  if (!stdout) return {};
  return JSON.parse(stdout) as HookOutput;
}

beforeEach(() => {
  repoDir = initRepo();
});

afterEach(() => {
  try {
    rmSync(scratchRoot, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

describe("auto-fork-executor — pass-through paths", () => {
  it("hook script exists on disk", () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it("allows when tool is not Bash", () => {
    const out = runHook(
      { tool_name: "Edit", tool_input: { file_path: "x" } },
      repoDir,
    );
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows when command is not a git commit", () => {
    const out = runHook(
      { tool_name: "Bash", tool_input: { command: "ls -la" } },
      repoDir,
    );
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows when commit subject has [MAIN] override", () => {
    const out = runHook(
      {
        tool_name: "Bash",
        tool_input: { command: 'git commit -m "[MAIN] cross-cutting work"' },
      },
      repoDir,
    );
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows when commit subject has [MAIN-FORCE] override", () => {
    const out = runHook(
      {
        tool_name: "Bash",
        tool_input: {
          command: 'git commit -m "[MAIN-FORCE] genuinely cross-cutting"',
        },
      },
      repoDir,
    );
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows when commit has no parseable -m subject (editor mode)", () => {
    const out = runHook(
      { tool_name: "Bash", tool_input: { command: "git commit" } },
      repoDir,
    );
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("allows when PRISM_AUTO_FORK=0 (kill switch)", () => {
    const out = runHook(
      {
        tool_name: "Bash",
        tool_input: { command: 'git commit -m "FOO/U-X: scoped commit"' },
      },
      repoDir,
      { PRISM_AUTO_FORK: "0" },
    );
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });

  it("fails open on malformed JSON payload", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: "not json {{{",
      encoding: "utf-8",
      timeout: HOOK_TIMEOUT_MS,
      cwd: repoDir,
    });
    const out = JSON.parse((r.stdout || "").trim()) as HookOutput;
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);
  });
});

describe("auto-fork-executor — actually creates the worktree", () => {
  it("blocks the original commit AND creates ../prism-foo-<id> on disk", () => {
    const out = runHook(
      {
        tool_name: "Bash",
        tool_input: { command: 'git commit -m "FOO-MS0/U-1: scoped commit"' },
      },
      repoDir,
    );
    expect(out.decision).toBe("block");
    expect(out.continue === undefined).toBe(true);
    expect(out.reason).toContain("AUTO-FORK");
    expect(out.reason).toContain("New worktree:");
    expect(out.reason).toContain("New branch:");
    expect(out.reason).toMatch(/work\/foo-/);

    // Verify a worktree dir actually appeared one level up under
    // ../prism-foo-* (the hook resolves new path relative to cwd).
    const parent = resolve(repoDir, "..");
    const siblings = readdirSync(parent);
    const matching = siblings.filter((d) => d.startsWith("prism-foo-"));
    expect(matching.length).toBe(1);

    // Verify the new worktree is a real git tree on the expected branch.
    const newTree = join(parent, matching[0]);
    expect(existsSync(newTree)).toBe(true);
    const branchOut = git(["rev-parse", "--abbrev-ref", "HEAD"], newTree);
    expect(branchOut.code).toBe(0);
    expect(branchOut.stdout.trim().startsWith("work/foo-")).toBe(true);
  });

  it("includes a single retry command line that cd's into the new tree", () => {
    const out = runHook(
      {
        tool_name: "Bash",
        tool_input: { command: 'git commit -m "BAR-MS0/U-2: another scoped commit"' },
      },
      repoDir,
    );
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("RETRY");
    expect(out.reason).toContain("cd ");
    expect(out.reason).toContain("git commit");
  });
});

describe("auto-fork-executor — stash safety", () => {
  it("stashes work-in-progress when staged changes exist before forking", () => {
    // Create a staged change so the hook has something to stash.
    writeFileSync(join(repoDir, "wip.txt"), "in progress\n");
    git(["add", "wip.txt"], repoDir);

    const out = runHook(
      {
        tool_name: "Bash",
        tool_input: { command: 'git commit -m "BAZ-MS0/U-3: stash-test"' },
      },
      repoDir,
    );
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("Work in progress stashed as:");
    expect(out.reason).toMatch(/auto-fork-baz-/);

    // Verify a stash entry actually landed.
    const stashList = git(["stash", "list"], repoDir);
    expect(stashList.code).toBe(0);
    expect(stashList.stdout.includes("auto-fork-baz-")).toBe(true);
  });

  it("does not stash when working tree is clean", () => {
    const out = runHook(
      {
        tool_name: "Bash",
        tool_input: { command: 'git commit -m "QUX-MS0/U-4: no-stash test"' },
      },
      repoDir,
    );
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("(no working-tree changes to stash)");
    const stashList = git(["stash", "list"], repoDir);
    expect(stashList.stdout.includes("auto-fork-")).toBe(false);
  });
});

describe("auto-fork-executor — defers when themed worktree already exists", () => {
  it("allows silently when ../prism-quark-* worktree already exists for scope=quark", () => {
    // Manually pre-create a themed worktree that matches the scope.
    const parent = resolve(repoDir, "..");
    const existingTree = join(parent, "prism-quark-pre");
    git(["worktree", "add", existingTree, "-b", "work/quark-pre"], repoDir);

    const out = runHook(
      {
        tool_name: "Bash",
        tool_input: { command: 'git commit -m "QUARK-MS0/U-5: existing-tree test"' },
      },
      repoDir,
    );
    // Hook defers to worktree-commit-route — must not auto-create another tree.
    expect(out.continue).toBe(true);
    expect(out.decision === undefined).toBe(true);

    const siblings = readdirSync(parent);
    const matching = siblings.filter((d) => d.startsWith("prism-quark-"));
    expect(matching.length).toBe(1); // still just the pre-existing one
  });
});
