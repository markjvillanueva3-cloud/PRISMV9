// tier: T0
// RUN: node --test .claude/hooks/__tests__/hook-cross-worktree-block.test.mjs
/**
 * hook-cross-worktree-block.test.mjs — tests for the cross-worktree Tier-0 firewall
 * HOOK-SYNERGY-MS0 / U-HOOK-CROSS-WORKTREE-FIREWALL  (H10)
 *
 * Converted vitest -> node:test (2026-05-31): the repo vitest config only globs
 * the src/__tests__ ".test.ts" set, so this file was permanently un-CI'd and a stale
 * assertion shipped undetected (the firewall two-tier rewrite removed
 * "conflict-fork rule" from the block reason but the test still matched it).
 * node:test runs it deterministically via `node --test <file>`.
 *
 * The hook exposes `evaluate({stdin, cwd, gitToplevel, gitCommonDir, env})` as a pure
 * function so tests can stub the worktree + git context without spawning processes.
 *
 * Coverage rubric (per the comprehensive-build floor):
 *   - tool gate (Edit/Write/MultiEdit/NotebookEdit + non-tool filtering)
 *   - main-tree fast-path allow
 *   - non-main worktree: HARD-block (harness-exec) vs ADVISE (doc/coordination)
 *   - two-tier policy (2026-05-31 main-tree grant) + PRISM_CROSS_WORKTREE_HARD re-arm
 *   - non-main worktree → allows worktree-local file (the per-tree exception)
 *   - non-PRISM cwd → out-of-scope allow
 *   - env override (PRISM_CROSS_WORKTREE_BYPASS=1)
 *   - adversarial: empty stdin, null tool_input, missing file_path, garbage tool_name
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
    assert.equal(r.decision, "allow");
    assert.match(r.reason, /not in firewall scope/);
  });

  it("allows when tool_input has no file_path / notebook_path / path", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: {} },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    assert.equal(r.decision, "allow");
    assert.match(r.reason, /no target file/);
  });

  it("fails open on missing stdin (so a broken harness never deadlocks)", () => {
    const r = evaluate({ stdin: null, cwd: WT, gitToplevel: WT, gitCommonDir: null, env: {} });
    assert.equal(r.decision, "allow");
  });

  it("fails open on missing gitToplevel + missing cwd fallback", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: "foo.ts" } },
      cwd: "", gitToplevel: null, gitCommonDir: null, env: {},
    });
    assert.equal(r.decision, "allow");
  });
});

// ── main-tree pass-through ────────────────────────────────────────────────────

describe("hook-cross-worktree-block: main-tree pass-through", () => {
  it("allows ANY shared-state write when cwd is the main tree", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: "H:/prism/.claude/settings.json" } },
      cwd: MAIN, gitToplevel: MAIN, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    assert.equal(r.decision, "allow");
    assert.match(r.reason, /main tree/i);
  });

  it("allows a CLAUDE.md edit from the main tree", () => {
    const r = evaluate({
      stdin: { tool_name: "Write", tool_input: { file_path: "H:/prism/CLAUDE.md" } },
      cwd: MAIN, gitToplevel: MAIN, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    assert.equal(r.decision, "allow");
  });

  it("path-case insensitivity: H:\\PRISM\\ counts as main tree", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: "H:\\PRISM\\.claude\\settings.json" } },
      cwd: "H:\\PRISM", gitToplevel: "H:\\PRISM", gitCommonDir: "H:\\PRISM\\.git", env: {},
    });
    assert.equal(r.decision, "allow");
  });
});

// ── non-main worktree: HARD-block tier (harness-exec) ─────────────────────────

describe("hook-cross-worktree-block: harness-exec HARD-block tier", () => {
  const ctx = { cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {} };

  it("blocks settings.json edit from sibling worktree", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/settings.json` } },
    });
    assert.equal(r.decision, "block");
    assert.match(r.reason, /Cross-worktree write blocked/);
    assert.match(r.reason, /harness-exec/); // was /conflict-fork rule/ pre-2026-05-31 two-tier rewrite
    assert.match(r.reason, /PRISM_CROSS_WORKTREE_BYPASS/);
    assert.ok(r.target?.toLowerCase().includes("settings.json"));
  });

  it("blocks .claude/hooks/*.mjs edit (would change which hooks fire fleet-wide)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Write", tool_input: { file_path: `${MAIN}/.claude/hooks/some-new-hook.mjs` } },
    });
    assert.equal(r.decision, "block");
  });

  it("blocks .mcp.json edit (MCP server registry)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.mcp.json` } },
    });
    assert.equal(r.decision, "block");
  });

  it("identifies the nested worktree as non-main (under .claude/worktrees/) and hard-blocks settings", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/settings.json` } },
      cwd: NESTED_WT, gitToplevel: NESTED_WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    assert.equal(r.decision, "block");
    assert.ok(r.worktree?.toLowerCase().includes("worktrees"));
  });
});

// ── non-main worktree: ADVISORY tier (doc/coordination — 2026-05-31 grant) ────

describe("hook-cross-worktree-block: doc/coordination ADVISORY tier", () => {
  const ctx = { cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {} };

  it("ADVISES (allows) state/shared/*.json edit — operator grant 2026-05-31 (was block)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/state/shared/BUILD_STATE.json` } },
    });
    assert.equal(r.decision, "advise");
    assert.equal(r.advisory, true);
  });

  it("ADVISES (allows) state/shared/*.md edit — doc/coordination tier (was block)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "MultiEdit", tool_input: { file_path: `${MAIN}/state/shared/MILESTONE_PROGRESS.md` } },
    });
    assert.equal(r.decision, "advise");
    assert.equal(r.advisory, true);
  });

  it("ADVISES (allows) milestone envelope edit — doc/coordination tier (was block)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Write", tool_input: { file_path: `${MAIN}/mcp-server/data/milestones/HOOK-SYNERGY-MS0.json` } },
    });
    assert.equal(r.decision, "advise");
    assert.equal(r.advisory, true);
  });

  it("ADVISES (allows) CLAUDE.md at repo root — reason cites the operator grant + re-arm knob (was block)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/CLAUDE.md` } },
    });
    assert.equal(r.decision, "advise");
    assert.equal(r.advisory, true);
    assert.match(r.reason, /operator grant/i);
    assert.match(r.reason, /PRISM_CROSS_WORKTREE_HARD/);
  });

  it("ADVISES NotebookEdit on a shared state/shared/*.md file (uses .notebook_path; was block)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "NotebookEdit", tool_input: { notebook_path: `${MAIN}/state/shared/AGENT_WORKBOARD.md` } },
    });
    assert.equal(r.decision, "advise");
  });
});

// ── two-tier policy: re-arm knob + tier integrity ─────────────────────────────

describe("hook-cross-worktree-block: two-tier policy (2026-05-31 main-tree grant)", () => {
  const ctx = { cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {} };

  it("harness-exec stays HARD even though docs are advisory (.claude/hooks/*.mjs reason names harness-exec)", () => {
    const r = evaluate({ ...ctx, stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/hooks/x.mjs` } } });
    assert.equal(r.decision, "block");
    assert.match(r.reason, /harness-exec/);
  });

  it("PRISM_CROSS_WORKTREE_HARD=1 re-arms the blanket block: CLAUDE.md blocks again", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/CLAUDE.md` } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: { PRISM_CROSS_WORKTREE_HARD: "1" },
    });
    assert.equal(r.decision, "block");
    assert.match(r.reason, /re-armed/);
  });

  it("PRISM_CROSS_WORKTREE_HARD=1 leaves harness-exec unchanged (settings still block)", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/settings.json` } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: { PRISM_CROSS_WORKTREE_HARD: "1" },
    });
    assert.equal(r.decision, "block");
  });

  it("advisory reason names the scrutiny-gate + clobber caution", () => {
    const r = evaluate({ ...ctx, stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/state/shared/x.json` } } });
    assert.equal(r.decision, "advise");
    assert.match(r.reason, /scrutiny gate/i);
    assert.match(r.reason, /clobber/i);
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
    assert.equal(r.decision, "allow");
    assert.match(r.reason, /local to worktree/);
  });

  it("allows a write under main tree that doesn't match any shared-state pattern", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/mcp-server/src/engines/Foo.ts` } },
    });
    assert.equal(r.decision, "allow");
    assert.match(r.reason, /not shared-state/);
  });

  it("allows a target outside the main tree entirely (e.g. C:/tmp)", () => {
    const r = evaluate({
      ...ctx,
      stdin: { tool_name: "Write", tool_input: { file_path: "C:/tmp/scratch.txt" } },
    });
    assert.equal(r.decision, "allow");
    assert.match(r.reason, /outside the main tree/);
  });

  it("allows when cwd is outside PRISM altogether (out-of-scope)", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/settings.json` } },
      cwd: "C:/some-other-repo", gitToplevel: "C:/some-other-repo", gitCommonDir: "C:/some-other-repo/.git", env: {},
    });
    assert.equal(r.decision, "allow");
    assert.match(r.reason, /not a PRISM worktree/i);
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
    assert.equal(r.decision, "allow");
    assert.match(r.reason, /firewall bypassed/);
  });

  it('PRISM_CROSS_WORKTREE_BYPASS=other-value does NOT bypass (only "1" counts)', () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: `${MAIN}/.claude/settings.json` } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`,
      env: { PRISM_CROSS_WORKTREE_BYPASS: "true" },
    });
    assert.equal(r.decision, "block");
  });
});

// ── adversarial inputs (never throw) ─────────────────────────────────────────

describe("hook-cross-worktree-block: adversarial inputs", () => {
  it("non-string file_path is ignored (no crash)", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: 12345 } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    assert.equal(r.decision, "allow");
  });

  it("garbled tool_name is allow-passed", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit\nrm -rf /", tool_input: { file_path: "x" } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    assert.equal(r.decision, "allow");
  });

  it("tool_input itself missing → allow", () => {
    const r = evaluate({
      stdin: { tool_name: "Write" },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    assert.equal(r.decision, "allow");
  });

  it("relative file_path resolves against cwd (worktree-local in a worktree)", () => {
    const r = evaluate({
      stdin: { tool_name: "Edit", tool_input: { file_path: "src/engines/Bar.ts" } },
      cwd: WT, gitToplevel: WT, gitCommonDir: `${MAIN}/.git`, env: {},
    });
    assert.equal(r.decision, "allow");
    assert.match(r.reason, /local to worktree/);
  });
});
