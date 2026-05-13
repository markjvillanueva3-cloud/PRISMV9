// tier: T0
/**
 * hook-cross-worktree-block.test.mjs — tests for the cross-worktree Tier-0 firewall
 * HOOK-SYNERGY-MS0 / U-HOOK-CROSS-WORKTREE-FIREWALL  (H10)
 *
 * The hook exposes `evaluate({stdin, cwd, gitToplevel, gitCommonDir, env})` as a pure
 * function so tests can stub the worktree + git context without spawning processes.
 *
 * Coverage rubric (per the comprehensive-build floor):
 *   - tool gate (Edit/Write/MultiEdit/NotebookEdit + non-tool filtering)
 *   - main-tree fast-path allow
 *   - non-main worktree → blocks on every shared-state pattern (5+ spanning patterns)
 *   - non-main worktree → allows worktree-local file (the per-tree exception)
 *   - non-PRISM cwd → out-of-scope allow
 *   - env override (PRISM_CROSS_WORKTREE_BYPASS=1)
 *   - adversarial: empty stdin, null tool_input, missing file_path, garbage tool_name
 *   - reason text always names the conflict-fork remediation
 */

import { describe, it, expect } from "vitest";
import { evaluate } from "../hook-cross-worktree-block.mjs";

const MAIN = "H:/prism";
const WT = "H:/prism-cad-fusion-live-ms0";
const NESTED_WT = "H:/prism/.claude/worktrees/u-fus-api02";

// ── smoke + tool-gating ──────────────────────────────────────────────────────

describe("hook-cross-worktree-block: smoke + tool gating", () => {
  it("allows tools outside Edit/Write/MultiEdit/NotebookEdit (e.g. Bash)", () => {
    const r = evaluate({
      stdin: { tool_name: "Bash", tool_input: { command: "echo hi" } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    expect(r.decision).toBe("allow");
    expect(r.reason).toMatch(/not in firewall scope/);
  });

  it("allows when tool_input has no file_path / notebook_path / path", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: {} },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    expect(r.decision).toBe("allow");
    expect(r.reason).toMatch(/no target file/);
  });

  it("fails open on missing stdin (so a broken harness never deadlocks)", () => {
    const r = evaluate({ stdin: null, cwd: WT, gitToplevel: WT, gitCommonDir: null, env: {} });
    expect(r.decision).toBe("allow");
  });

  it("fails open on missing gitToplevel + missing cwd fallback", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: "foo.ts" } },
      cwd: "", gitToplevel: null, gitCommonDir: null, env: {},
    });
    expect(r.decision).toBe("allow");
  });
});

// ── main-tree pass-through ────────────────────────────────────────────────────

describe("hook-cross-worktree-block: main-tree pass-through", () => {
  it("allows ANY shared-state write when cwd is the main tree", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: "H:/prism/.claude/settings.json" } },
      cwd: MAIN, gitToplevel: MAIN, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    expect(r.decision).toBe("allow");
    expect(r.reason).toMatch(/main tree/i);
  });

  it("allows a CLAUDE.md edit from the main tree", () => {
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: "H:/prism/CLAUDE.md" } },
      cwd: MAIN, gitToplevel: MAIN, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    expect(r.decision).toBe("allow");
  });

  it("path-case insensitivity: H:\\PRISM\\ counts as main tree", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: "H:\\PRISM\\.claude\\settings.json" } },
      cwd: "H:\\PRISM", gitToplevel: "H:\\PRISM", gitCommonDir: "H:\\PRISM\\.git", env: {},
    });
    expect(r.decision).toBe("allow");
  });
});

// ── non-main worktree blocking ────────────────────────────────────────────────

describe("hook-cross-worktree-block: non-main worktree blocking", () => {
  const ctx = { cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {} };

  it("blocks settings.json edit from sibling worktree", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/settings.json` } },
    });
    expect(r.decision).toBe("block");
    expect(r.reason).toMatch(/Cross-worktree write blocked/);
    expect(r.reason).toMatch(/conflict-fork rule/);
    expect(r.reason).toMatch(/PRISM_CROSS_WORKTREE_BYPASS/);
    expect(r.target?.toLowerCase()).toContain("settings.json");
  });

  it("blocks .claude/hooks/*.mjs edit (would change which hooks fire fleet-wide)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Write", tool_input: { file_path: `${MAIN}/.claude/hooks/some-new-hook.mjs` } },
    });
    expect(r.decision).toBe("block");
  });

  it("blocks state/shared/*.json edit (cross-chat coordination state)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/state/shared/BUILD_STATE.json` } },
    });
    expect(r.decision).toBe("block");
  });

  it("blocks state/shared/*.md edit (the human-facing twin of the json state)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "MultiEdit", tool_input: { file_path: `${MAIN}/state/shared/MILESTONE_PROGRESS.md` } },
    });
    expect(r.decision).toBe("block");
  });

  it("blocks .mcp.json edit (MCP server registry)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.mcp.json` } },
    });
    expect(r.decision).toBe("block");
  });

  it("blocks milestone envelope edit", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Write", tool_input: { file_path: `${MAIN}/mcp-server/data/milestones/HOOK-SYNERGY-MS0.json` } },
    });
    expect(r.decision).toBe("block");
  });

  it("blocks CLAUDE.md at repo root (top-level doctrine)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/CLAUDE.md` } },
    });
    expect(r.decision).toBe("block");
  });

  it("blocks NotebookEdit on a shared file (uses .notebook_path)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "NotebookEdit", tool_input: { notebook_path: `${MAIN}/state/shared/AGENT_WORKBOARD.md` } },
    });
    expect(r.decision).toBe("block");
  });

  it("identifies the nested worktree as non-main (under .claude/worktrees/)", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/settings.json` } },
      cwd: NESTED_WT, gitToplevel: NESTED_WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    expect(r.decision).toBe("block");
    expect(r.worktree?.toLowerCase()).toContain("worktrees");
  });
});

// ── non-main worktree allow paths ─────────────────────────────────────────────

describe("hook-cross-worktree-block: non-main worktree allow paths", () => {
  const ctx = { cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {} };

  it("allows worktree-local file (target is under the worktree, not the main tree)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${WT}/mcp-server/src/engines/Foo.ts` } },
    });
    expect(r.decision).toBe("allow");
    expect(r.reason).toMatch(/local to worktree/);
  });

  it("allows a write under main tree that doesn't match any shared-state pattern", () => {
    // mcp-server/src/engines/* is plenty under main tree, but not shared-state.
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/mcp-server/src/engines/Foo.ts` } },
    });
    expect(r.decision).toBe("allow");
    expect(r.reason).toMatch(/not shared-state/);
  });

  it("allows a target outside the main tree entirely (e.g. C:/tmp)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Write", tool_input: { file_path: "C:/tmp/scratch.txt" } },
    });
    expect(r.decision).toBe("allow");
    expect(r.reason).toMatch(/outside the main tree/);
  });

  it("allows when cwd is outside PRISM altogether (out-of-scope)", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/settings.json` } },
      cwd: "C:/some-other-repo", gitToplevel: "C:/some-other-repo", gitCommonDir: "C:/some-other-repo/.git", env: {},
    });
    expect(r.decision).toBe("allow");
    expect(r.reason).toMatch(/not a PRISM worktree/i);
  });
});

// ── emergency bypass ─────────────────────────────────────────────────────────

describe("hook-cross-worktree-block: emergency bypass", () => {
  it("PRISM_CROSS_WORKTREE_BYPASS=1 allows an otherwise-blocked write", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/settings.json` } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`,
      env: { PRISM_CROSS_WORKTREE_BYPASS: "1" },
    });
    expect(r.decision).toBe("allow");
    expect(r.reason).toMatch(/firewall bypassed/);
  });

  it("PRISM_CROSS_WORKTREE_BYPASS=other-value does NOT bypass (only \"1\" counts)", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/settings.json` } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`,
      env: { PRISM_CROSS_WORKTREE_BYPASS: "true" },
    });
    expect(r.decision).toBe("block");
  });
});

// ── adversarial inputs (never throw) ─────────────────────────────────────────

describe("hook-cross-worktree-block: adversarial inputs", () => {
  it("non-string file_path is ignored (no crash)", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: 12345 } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    expect(r.decision).toBe("allow");
  });

  it("garbled tool_name is allow-passed", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit\nrm -rf /", tool_input: { file_path: "x" } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    expect(r.decision).toBe("allow");
  });

  it("tool_input itself missing → allow", () => {
    const r = evaluate({
      stdin: { tool_name: "Write" },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    expect(r.decision).toBe("allow");
  });

  it("relative file_path resolves against cwd (worktree-local in a worktree)", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: "src/engines/Bar.ts" } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    expect(r.decision).toBe("allow");
    expect(r.reason).toMatch(/local to worktree/);
  });
});
