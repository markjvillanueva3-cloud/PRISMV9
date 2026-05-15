// git-add-lane-guard.test.mjs — vitest suite for SLOT-WORKTREE-MS0/U-P1-ADD-LANE-GUARD.
//
// Every assertion is real-value (no toBeDefined() stubs). The hook's
// pure helpers (canonicalize, parseGitAddInvocations, tokenize, isWithin,
// findWorktreeForBranch, resolveSlotScope, decideOnInvocations) are
// imported directly; the side-effectful CLI entry is exercised via a
// spawn smoke test at the bottom.
//
// FAIL-OPEN policy is load-bearing: every test that exercises an error
// path must assert allow (null decision), never block.

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  canonicalize,
  tokenize,
  parseGitAddInvocations,
  isWithin,
  findWorktreeForBranch,
  resolveSlotScope,
  decideOnInvocations,
} from "../git-add-lane-guard.mjs";

const HOOK_PATH = fileURLToPath(new URL("../git-add-lane-guard.mjs", import.meta.url));

// ── canonicalize ────────────────────────────────────────────────────────
describe("canonicalize", () => {
  it("converts backslashes to forward slashes", () => {
    expect(canonicalize("H:\\prism\\file.ts")).toBe("h:/prism/file.ts");
  });
  it("lowercases the drive letter", () => {
    expect(canonicalize("C:/Users/foo")).toBe("c:/Users/foo");
  });
  it("strips trailing slash", () => {
    expect(canonicalize("h:/prism/")).toBe("h:/prism");
  });
  it("strips multiple trailing slashes", () => {
    expect(canonicalize("h:/prism///")).toBe("h:/prism");
  });
  it("returns empty for empty input", () => {
    expect(canonicalize("")).toBe("");
  });
  it("returns empty for null/undefined", () => {
    expect(canonicalize(null)).toBe("");
    expect(canonicalize(undefined)).toBe("");
  });
  it("resolves relative paths against cwd", () => {
    const out = canonicalize("./foo");
    // resolved absolute, drive lowercased, forward slashes
    expect(out).toMatch(/^[a-z]:/);
    expect(out.endsWith("/foo")).toBe(true);
    expect(out.includes("\\")).toBe(false);
  });
});

// ── tokenize ────────────────────────────────────────────────────────────
describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("a b c")).toEqual(["a", "b", "c"]);
  });
  it("respects double quotes", () => {
    expect(tokenize(`a "b c" d`)).toEqual(["a", "b c", "d"]);
  });
  it("respects single quotes", () => {
    expect(tokenize(`a 'b c' d`)).toEqual(["a", "b c", "d"]);
  });
  it("collapses multiple spaces", () => {
    expect(tokenize("a    b\tc")).toEqual(["a", "b", "c"]);
  });
  it("returns empty array for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });
});

// ── parseGitAddInvocations ──────────────────────────────────────────────
describe("parseGitAddInvocations", () => {
  it("returns [] when no git add", () => {
    expect(parseGitAddInvocations("ls -la")).toEqual([]);
    expect(parseGitAddInvocations("git status")).toEqual([]);
    expect(parseGitAddInvocations("")).toEqual([]);
  });
  it("returns [] for non-string", () => {
    expect(parseGitAddInvocations(null)).toEqual([]);
    expect(parseGitAddInvocations(undefined)).toEqual([]);
    expect(parseGitAddInvocations(42)).toEqual([]);
  });
  it("parses a single explicit path", () => {
    const r = parseGitAddInvocations("git add foo.txt");
    expect(r.length).toBe(1);
    expect(r[0].broad).toBe(false);
    expect(r[0].paths).toEqual(["foo.txt"]);
  });
  it("parses multiple explicit paths", () => {
    const r = parseGitAddInvocations("git add a.txt b.txt c.txt");
    expect(r.length).toBe(1);
    expect(r[0].broad).toBe(false);
    expect(r[0].paths).toEqual(["a.txt", "b.txt", "c.txt"]);
  });
  it("detects broad glob `git add .`", () => {
    const r = parseGitAddInvocations("git add .");
    expect(r.length).toBe(1);
    expect(r[0].broad).toBe(true);
    expect(r[0].paths).toEqual([]);
  });
  it("detects broad glob `git add -A`", () => {
    const r = parseGitAddInvocations("git add -A");
    expect(r[0].broad).toBe(true);
  });
  it("detects broad glob `git add --all`", () => {
    const r = parseGitAddInvocations("git add --all");
    expect(r[0].broad).toBe(true);
  });
  it("detects broad glob `git add -u`", () => {
    const r = parseGitAddInvocations("git add -u");
    expect(r[0].broad).toBe(true);
  });
  it("ignores non-broad flags", () => {
    const r = parseGitAddInvocations("git add -v foo.txt");
    expect(r[0].broad).toBe(false);
    expect(r[0].paths).toEqual(["foo.txt"]);
  });
  it("handles `&&` chain", () => {
    const r = parseGitAddInvocations("git add a.txt && git commit -m 'x'");
    // Only the `git add` invocation surfaces; the commit segment has no `git add`.
    expect(r.length).toBe(1);
    expect(r[0].paths).toEqual(["a.txt"]);
  });
  it("captures both git add segments in a chain", () => {
    const r = parseGitAddInvocations("git add a.txt && git add b.txt");
    expect(r.length).toBe(2);
    expect(r[0].paths).toEqual(["a.txt"]);
    expect(r[1].paths).toEqual(["b.txt"]);
  });
  it("handles `;` separator", () => {
    const r = parseGitAddInvocations("git add a.txt; git add b.txt");
    expect(r.length).toBe(2);
    expect(r[0].paths).toEqual(["a.txt"]);
    expect(r[1].paths).toEqual(["b.txt"]);
  });
  it("handles quoted path with spaces", () => {
    const r = parseGitAddInvocations(`git add "my file.txt"`);
    expect(r[0].paths).toEqual(["my file.txt"]);
  });
  it("ignores `git add` inside single quotes", () => {
    const r = parseGitAddInvocations(`echo 'git add bogus.txt'`);
    expect(r).toEqual([]);
  });
  it("treats bare `git add` (no args) as no-op", () => {
    expect(parseGitAddInvocations("git add")).toEqual([]);
  });
  it("does not match `gitadd` or `git addX`", () => {
    expect(parseGitAddInvocations("gitadd foo.txt")).toEqual([]);
    expect(parseGitAddInvocations("git addX foo.txt")).toEqual([]);
  });
  it("recognises `--` pathspec separator without staging it", () => {
    const r = parseGitAddInvocations("git add -- foo.txt");
    expect(r[0].paths).toEqual(["foo.txt"]);
  });
});

// ── isWithin ────────────────────────────────────────────────────────────
describe("isWithin", () => {
  it("true when child equals parent", () => {
    expect(isWithin("h:/prism", "h:/prism")).toBe(true);
  });
  it("true when child is under parent", () => {
    expect(isWithin("h:/prism", "h:/prism/foo/bar.txt")).toBe(true);
  });
  it("false when child is sibling", () => {
    expect(isWithin("h:/prism", "h:/prism-slot-charlie")).toBe(false);
  });
  it("false when child is parent's parent", () => {
    expect(isWithin("h:/prism/foo", "h:/prism")).toBe(false);
  });
  it("false when paths only share a prefix (no separator)", () => {
    // "h:/prism" is NOT within "h:/pri" — startsWith would lie without separator
    expect(isWithin("h:/pri", "h:/prism")).toBe(false);
  });
  it("normalises slashes/case", () => {
    expect(isWithin("H:\\prism", "h:/prism/file.ts")).toBe(true);
  });
  it("false on empty inputs", () => {
    expect(isWithin("", "h:/x")).toBe(false);
    expect(isWithin("h:/x", "")).toBe(false);
    expect(isWithin("", "")).toBe(false);
  });
});

// ── findWorktreeForBranch ───────────────────────────────────────────────
const SAMPLE_PORCELAIN = [
  "worktree H:/prism",
  "HEAD abc123",
  "branch refs/heads/cad-fusion-live-ms0",
  "",
  "worktree H:/prism-slot-charlie",
  "HEAD def456",
  "branch refs/heads/slot/charlie",
  "",
  "worktree H:/prism-detached",
  "HEAD 0000",
  "detached",
  "",
].join("\n");

describe("findWorktreeForBranch", () => {
  it("matches a short branch name", () => {
    expect(findWorktreeForBranch(SAMPLE_PORCELAIN, "slot/charlie"))
      .toBe("H:/prism-slot-charlie");
  });
  it("matches a full refs/heads/ ref", () => {
    expect(findWorktreeForBranch(SAMPLE_PORCELAIN, "refs/heads/cad-fusion-live-ms0"))
      .toBe("H:/prism");
  });
  it("returns null for an unknown branch", () => {
    expect(findWorktreeForBranch(SAMPLE_PORCELAIN, "no/such")).toBe(null);
  });
  it("returns null for empty porcelain", () => {
    expect(findWorktreeForBranch("", "slot/charlie")).toBe(null);
  });
  it("returns null for empty branch", () => {
    expect(findWorktreeForBranch(SAMPLE_PORCELAIN, "")).toBe(null);
  });
  it("skips detached worktrees (no branch line)", () => {
    expect(findWorktreeForBranch(SAMPLE_PORCELAIN, "detached")).toBe(null);
  });
});

// ── resolveSlotScope ────────────────────────────────────────────────────
const SLOTS_FIXTURE = {
  slots: [
    { slot: "alpha", state: null, status: "idle" },
    {
      slot: "charlie",
      status: "active",
      state: {
        chatId: "claude-abcd1234",
        branch: "slot/charlie",
      },
    },
  ],
};

describe("resolveSlotScope", () => {
  it("returns scope for a chat with a bound slot+branch", () => {
    const scope = resolveSlotScope({
      sessionId: "claude-abcd1234",
      slots: SLOTS_FIXTURE,
      porcelain: SAMPLE_PORCELAIN,
      cwd: "H:/prism-slot-charlie",
    });
    expect(scope).not.toBe(null);
    expect(scope.slot).toBe("charlie");
    expect(scope.branch).toBe("slot/charlie");
    expect(scope.root).toBe("h:/prism-slot-charlie");
    expect(scope.cwd).toBe("h:/prism-slot-charlie");
  });
  it("returns null when sessionId missing", () => {
    expect(resolveSlotScope({
      sessionId: null,
      slots: SLOTS_FIXTURE,
      porcelain: SAMPLE_PORCELAIN,
      cwd: "H:/prism",
    })).toBe(null);
  });
  it("returns null when slots missing", () => {
    expect(resolveSlotScope({
      sessionId: "claude-abcd1234",
      slots: null,
      porcelain: SAMPLE_PORCELAIN,
      cwd: "H:/prism",
    })).toBe(null);
  });
  it("returns null when sessionId not in any slot", () => {
    expect(resolveSlotScope({
      sessionId: "claude-99999999",
      slots: SLOTS_FIXTURE,
      porcelain: SAMPLE_PORCELAIN,
      cwd: "H:/prism",
    })).toBe(null);
  });
  it("returns null when slot has no branch (unbound)", () => {
    const slots = { slots: [{ slot: "alpha", state: { chatId: "claude-xx" } }] };
    expect(resolveSlotScope({
      sessionId: "claude-xx",
      slots,
      porcelain: SAMPLE_PORCELAIN,
      cwd: "H:/prism",
    })).toBe(null);
  });
  it("returns null when branch has no matching worktree", () => {
    const slots = {
      slots: [{ slot: "charlie", state: { chatId: "claude-xx", branch: "slot/missing" } }],
    };
    expect(resolveSlotScope({
      sessionId: "claude-xx",
      slots,
      porcelain: SAMPLE_PORCELAIN,
      cwd: "H:/prism",
    })).toBe(null);
  });
});

// ── decideOnInvocations ─────────────────────────────────────────────────
const SCOPE_CHARLIE = {
  slot: "charlie",
  branch: "slot/charlie",
  root: "h:/prism-slot-charlie",
  cwd: "h:/prism-slot-charlie",
};
const SCOPE_CHARLIE_BAD_CWD = {
  slot: "charlie",
  branch: "slot/charlie",
  root: "h:/prism-slot-charlie",
  cwd: "h:/prism", // chat is in the WRONG worktree
};

describe("decideOnInvocations", () => {
  it("allows when no invocations", () => {
    expect(decideOnInvocations([], SCOPE_CHARLIE)).toBe(null);
  });
  it("allows when scope is null (fail-open)", () => {
    expect(decideOnInvocations([{ broad: false, paths: ["x.txt"] }], null)).toBe(null);
  });
  it("allows in-scope relative path", () => {
    const out = decideOnInvocations(
      [{ broad: false, paths: ["foo.txt"] }],
      SCOPE_CHARLIE,
    );
    expect(out).toBe(null);
  });
  it("allows in-scope absolute path", () => {
    const out = decideOnInvocations(
      [{ broad: false, paths: ["H:/prism-slot-charlie/sub/x.ts"] }],
      SCOPE_CHARLIE,
    );
    expect(out).toBe(null);
  });
  it("BLOCKS out-of-scope absolute path", () => {
    const out = decideOnInvocations(
      [{ broad: false, paths: ["H:/prism/web/app.tsx"] }],
      SCOPE_CHARLIE,
    );
    expect(out).not.toBe(null);
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("slot");
    expect(out.reason).toContain("charlie");
    expect(out.reason).toContain("h:/prism/web/app.tsx");
  });
  it("BLOCKS out-of-scope relative path (../)", () => {
    const out = decideOnInvocations(
      [{ broad: false, paths: ["../prism/foo.ts"] }],
      SCOPE_CHARLIE, // cwd=h:/prism-slot-charlie → ../prism/foo.ts = h:/prism/foo.ts
    );
    expect(out).not.toBe(null);
    expect(out.decision).toBe("block");
  });
  it("allows broad glob from INSIDE the scope", () => {
    expect(decideOnInvocations([{ broad: true, paths: [] }], SCOPE_CHARLIE)).toBe(null);
  });
  it("BLOCKS broad glob from OUTSIDE the scope", () => {
    const out = decideOnInvocations([{ broad: true, paths: [] }], SCOPE_CHARLIE_BAD_CWD);
    expect(out).not.toBe(null);
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("broad-from-outside");
  });
  it("reports multiple offenders together", () => {
    const out = decideOnInvocations(
      [
        { broad: false, paths: ["H:/prism/a.ts", "H:/prism/b.ts"] },
        { broad: false, paths: ["H:/prism/c.ts"] },
      ],
      SCOPE_CHARLIE,
    );
    expect(out).not.toBe(null);
    expect(out.decision).toBe("block");
    expect(out.reason).toMatch(/a\.ts/);
    expect(out.reason).toMatch(/b\.ts/);
    expect(out.reason).toMatch(/c\.ts/);
  });
  it("includes the kill-switch hint", () => {
    const out = decideOnInvocations(
      [{ broad: false, paths: ["H:/prism/a.ts"] }],
      SCOPE_CHARLIE,
    );
    expect(out.reason).toContain("PRISM_GIT_ADD_LANE_DISABLE");
  });
});

// ── CLI integration: activation gate is load-bearing ────────────────────
describe("CLI activation gate", () => {
  it("exits 0 silently when neither env var is set", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "git add ." } }),
      encoding: "utf-8",
      timeout: 4000,
      env: { ...process.env, PRISM_GIT_ADD_LANE_ENABLE: "", PRISM_GIT_ADD_LANE_DISABLE: "" },
      windowsHide: true,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(""); // pure no-op
  });
  it("kill switch wins over enable", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "git add ." } }),
      encoding: "utf-8",
      timeout: 4000,
      env: {
        ...process.env,
        PRISM_GIT_ADD_LANE_ENABLE: "1",
        PRISM_GIT_ADD_LANE_DISABLE: "1",
      },
      windowsHide: true,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
  it("exits 0 on malformed stdin even when armed", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: "not json",
      encoding: "utf-8",
      timeout: 4000,
      env: { ...process.env, PRISM_GIT_ADD_LANE_ENABLE: "1", PRISM_GIT_ADD_LANE_DISABLE: "" },
      windowsHide: true,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
  it("exits 0 on non-Bash tool even when armed", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "x.ts" } }),
      encoding: "utf-8",
      timeout: 4000,
      env: { ...process.env, PRISM_GIT_ADD_LANE_ENABLE: "1", PRISM_GIT_ADD_LANE_DISABLE: "" },
      windowsHide: true,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
  it("exits 0 on `git status` (no `git add`)", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "git status" } }),
      encoding: "utf-8",
      timeout: 4000,
      env: { ...process.env, PRISM_GIT_ADD_LANE_ENABLE: "1", PRISM_GIT_ADD_LANE_DISABLE: "" },
      windowsHide: true,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
});
