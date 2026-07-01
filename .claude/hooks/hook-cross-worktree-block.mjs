#!/usr/bin/env node
// tier: T0
/**
 * hook-cross-worktree-block.mjs — Tier-0 PreToolUse firewall
 * HOOK-SYNERGY-MS0 / U-HOOK-CROSS-WORKTREE-FIREWALL  (H10)
 *
 * Multi-chat safety net. With 6+ concurrent Claude sessions, each sitting in
 * its own git worktree (`H:/prism-<scope>/`), an Edit/Write/MultiEdit that
 * targets a *shared-tree* file from a *non-main* worktree silently introduces
 * one of two failure modes:
 *
 *   1. **Behaviour drift across chats** — the change lives only in the worktree's
 *      branch; another chat reading H:/prism/.claude/settings.json sees the
 *      old version, and the harness across the two chats now disagrees about
 *      which hooks fire. Hook-stack drift is the worst kind: silent, asymmetric,
 *      survives reboots.
 *   2. **Silent clobber on merge** — when the worktree branch eventually merges
 *      to main, the shared-state delta lands without scrutiny gate review
 *      (worktree-local scrutiny runs against the worktree's own diff, not
 *      against the cross-worktree blast radius).
 *
 * ── TWO-TIER POLICY (2026-05-31, operator grant: "each chat galaxy has
 *    permission to add to the main tree") ────────────────────────────────────
 * The operator grant supersedes the original blanket conflict-fork block for
 * DOC / COORDINATION state, but the silent-drift hazard is genuinely worst for
 * the harness-EXECUTION files (settings.json, hooks/*.mjs, .mcp.json) — a drift
 * there changes which hooks fire fleet-wide. So the firewall is now tiered:
 *
 *   - HARD_BLOCK_PATTERNS (harness-exec): STILL HARD-BLOCKED from a non-main
 *     worktree. settings(.local).json, .claude/hooks/*.mjs, .mcp.json.
 *   - ADVISORY_PATTERNS (doc/coordination): ALLOWED with a drift advisory —
 *     CLAUDE.md / AGENTS.md / CODEX.md / GEMINI.md, state/shared/*.{json,md},
 *     mcp-server/data/state/*.json, milestone envelopes, the roadmap.
 *
 * Re-arm knob: `PRISM_CROSS_WORKTREE_HARD=1` restores the original blanket
 * HARD-block for the advisory tier too (every shared-state pattern blocks).
 * Full bypass (no block, no advisory): `PRISM_CROSS_WORKTREE_BYPASS=1`.
 *
 * BLOCKS when ALL of:
 *   - tool is Edit / Write / MultiEdit / NotebookEdit
 *   - cwd is a git worktree whose top-level is NOT the canonical main tree
 *     (`H:/prism`, case-insensitive)
 *   - target file resolves under the main tree
 *   - target file matches a HARD_BLOCK_PATTERN  (OR any shared-state pattern
 *     when PRISM_CROSS_WORKTREE_HARD=1)
 *
 * ADVISES (allow + drift warning) when:
 *   - all of the block conditions hold BUT the matched pattern is in the
 *     ADVISORY tier and PRISM_CROSS_WORKTREE_HARD is not set
 *
 * ALLOWS (silently) when ANY of:
 *   - cwd is the main tree itself
 *   - target is a worktree-local file (lives under the worktree, not the main tree)
 *   - target matches no shared-state pattern
 *   - `PRISM_CROSS_WORKTREE_BYPASS=1` (emergency override; the hook still logs)
 *   - the hook can't tell (no git binary, no .git, malformed stdin) — fail-open
 *
 * EXIT CONTRACT (Claude Code PreToolUse):
 *   - allow:  prints {continue:true}, exit 0
 *   - advise: prints {continue:true, systemMessage:"..."}, exit 0  (write proceeds)
 *   - block:  prints {decision:"block", reason:"..."}, exit 0  (the decision field
 *     is what the harness reads — non-zero exit also blocks but emits to stderr)
 *
 * The hook is intentionally NEVER fatal: any unexpected error path falls through
 * to {continue:true} so a misbehaving guard can't deadlock the harness.
 *
 * Test seam: the core logic is exposed as `evaluate({stdin, cwd, gitToplevel,
 * gitCommonDir, env})` so tests can drive it without spawning git.
 *
 * @module .claude/hooks/hook-cross-worktree-block
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

// ── Constants ────────────────────────────────────────────────────────────────

/** Canonical PRISM main worktree (normalized forward-slash, lowercase drive). */
const MAIN_TREE = "h:/prism";

/** Soft-allowed worktree dirs that ARE under the main tree (don't trip the firewall). */
const NESTED_WORKTREE_PREFIX = "h:/prism/.claude/worktrees/";

/**
 * HARNESS-EXECUTION files. A drift here changes which hooks fire / which MCP
 * servers load across the fleet — "the worst kind: silent, asymmetric, survives
 * reboots." These stay HARD-BLOCKED from a non-main worktree even under the
 * 2026-05-31 main-tree-write grant.
 */
const HARD_BLOCK_PATTERNS = [
  /^\.claude\/settings(\.local)?\.json$/i,                  // harness hook config
  /^\.claude\/hooks\/[^/]+\.mjs$/i,                          // hook scripts the harness loads
  /^\.mcp\.json$/i,                                          // MCP server registry
];

/**
 * DOC / COORDINATION state. Every chat galaxy may write these to the main tree
 * (operator grant 2026-05-31). The firewall ADVISES (warns about drift) but
 * ALLOWS — unless PRISM_CROSS_WORKTREE_HARD=1 re-arms the blanket block.
 */
const ADVISORY_PATTERNS = [
  /^state\/shared\/[^/]+\.(?:json|md)$/i,                   // shared coordination state
  /^mcp-server\/data\/state\/[A-Z_]+\.json$/i,              // shared BUILD/STATE/MASTER files (uppercase-name convention)
  /^mcp-server\/data\/milestones\/[A-Z0-9._-]+\.json$/i,   // milestone envelopes
  /^CLAUDE\.md$/,                                            // top-level doctrine files (case-sensitive — the lowercase claude.md is per-dir)
  /^AGENTS\.md$/,
  /^CODEX\.md$/,
  /^GEMINI\.md$/,
  /^PRISM-UNIFIED-ROADMAP[^/]*\.md$/,
];

/** spawnSync timeout for git probes. Longer than needed but bounded. */
const GIT_TIMEOUT_MS = 2000;

// ── Path helpers ─────────────────────────────────────────────────────────────

/** Normalize a path to forward-slash + lowercase drive letter, no trailing slash. */
function canonical(p) {
  if (!p || typeof p !== "string") return "";
  return p
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, d) => `${d.toLowerCase()}:`)
    .replace(/\/+$/, "");
}

/** Is `child` underneath `parent` (case-insensitive on the canonical form)? */
function isUnder(child, parent) {
  const c = canonical(child);
  const p = canonical(parent);
  if (!c || !p) return false;
  if (c === p) return true;
  return c.startsWith(p + "/");
}

// ── Git helpers (overridable for tests) ──────────────────────────────────────

function shellGit(args, cwd) {
  const res = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true,
  });
  if (res.status !== 0 || res.error) return null;
  return (res.stdout || "").trim();
}

function defaultProbeWorktree(cwd) {
  const top = shellGit(["rev-parse", "--show-toplevel"], cwd);
  const common = shellGit(["rev-parse", "--git-common-dir"], cwd);
  return { gitToplevel: top, gitCommonDir: common };
}

// ── Core logic (pure; test seam) ─────────────────────────────────────────────

/**
 * Evaluate a single PreToolUse fire. All inputs are explicit so tests can stub
 * git + filesystem behaviour without spawning processes.
 *
 * @param {object} opts
 * @param {object|null} opts.stdin     Parsed hook stdin JSON ({tool_name, tool_input}).
 * @param {string} opts.cwd            process.cwd() at fire time.
 * @param {string|null} opts.gitToplevel `git rev-parse --show-toplevel` from cwd, or null.
 * @param {string|null} opts.gitCommonDir `git rev-parse --git-common-dir`, or null.
 *                                    For a linked worktree this points at the MAIN tree's
 *                                    `.git` dir, so it's the most reliable "where's main?"
 *                                    signal — but we also fall back to MAIN_TREE.
 * @param {object} opts.env            process.env (PRISM_CROSS_WORKTREE_BYPASS / _HARD).
 * @returns {{decision:"allow"|"advise"|"block", reason:string, advisory?:boolean, target?:string, worktree?:string}}
 */
export function evaluate({ stdin, cwd, gitToplevel, gitCommonDir, env }) {
  // 1. Tool gate — we only fire on Edit/Write/MultiEdit, but check defensively.
  const toolName = String(stdin?.tool_name || "");
  if (!/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(toolName)) {
    return { decision: "allow", reason: "tool not in firewall scope" };
  }

  // 2. Extract target file. Edit/Write use `file_path`; NotebookEdit uses `notebook_path`.
  const ti = (stdin?.tool_input ?? {});
  const rawTarget = ti.file_path || ti.notebook_path || ti.path || "";
  if (!rawTarget || typeof rawTarget !== "string") {
    return { decision: "allow", reason: "no target file in tool_input" };
  }

  // 3. Bypass override (emergency). Logged via decision.reason so it shows in transcript.
  if (env?.PRISM_CROSS_WORKTREE_BYPASS === "1") {
    return { decision: "allow", reason: "PRISM_CROSS_WORKTREE_BYPASS=1 set; firewall bypassed" };
  }

  // 4. Determine the worktree we're sitting in. If we can't tell, fail-open.
  const wtRoot = canonical(gitToplevel || cwd);
  if (!wtRoot) {
    return { decision: "allow", reason: "no git toplevel resolved; fail-open" };
  }

  // 5. Are we IN the main tree? Two ways to know:
  //    (a) wtRoot === MAIN_TREE (the simple case)
  //    (b) wtRoot is under H:/prism/.claude/worktrees/ — nested-worktree pattern;
  //        these still live on the main tree's volume but they're isolated branches,
  //        so they're treated as non-main for firewall purposes
  //    (c) gitCommonDir's parent === MAIN_TREE — this is a worktree of H:/prism
  if (wtRoot === MAIN_TREE) {
    return { decision: "allow", reason: "cwd is main tree (H:/prism); no firewall needed" };
  }
  const inNestedWorktree = canonical(wtRoot).startsWith(NESTED_WORKTREE_PREFIX);
  const commonDirParent = gitCommonDir ? canonical(path.dirname(gitCommonDir)) : null;
  const isPrismWorktree = inNestedWorktree || commonDirParent === MAIN_TREE || canonical(wtRoot).startsWith("h:/prism-");
  if (!isPrismWorktree) {
    // Outside PRISM altogether — not our concern.
    return { decision: "allow", reason: `cwd is not a PRISM worktree (${wtRoot}); out of scope` };
  }

  // 6. Resolve the target path — absolute → canonical, relative → resolve against cwd.
  const absTarget = path.isAbsolute(rawTarget) || /^[A-Za-z]:[\\/]/.test(rawTarget)
    ? canonical(rawTarget)
    : canonical(path.resolve(cwd, rawTarget));

  // 7. Decide whether the target sits under the main tree (not the worktree). A target
  //    that lives inside the worktree itself is a per-tree file — the firewall does
  //    not apply.
  const targetUnderMain = isUnder(absTarget, MAIN_TREE);
  const targetUnderWorktree = isUnder(absTarget, wtRoot);
  // Exception: nested worktree paths ARE under MAIN_TREE — but the worktree-local check
  // above already classified them. If both flags are true and the worktree is nested,
  // the worktree-local check wins (path is per-worktree, even if the parent is the main tree).
  if (targetUnderWorktree && wtRoot !== MAIN_TREE) {
    return { decision: "allow", reason: `target is local to worktree ${wtRoot}` };
  }
  if (!targetUnderMain) {
    return { decision: "allow", reason: "target is outside the main tree; not a firewall concern" };
  }

  // 8. The target IS under the main tree from a non-main worktree. Classify it:
  //    harness-exec (hard) vs doc/coordination (advisory) vs not-shared-state (allow).
  const relToMain = canonical(absTarget).slice(MAIN_TREE.length + 1); // strip "h:/prism/"
  const hardMatch = HARD_BLOCK_PATTERNS.find((rx) => rx.test(relToMain));
  const advisoryMatch = ADVISORY_PATTERNS.find((rx) => rx.test(relToMain));
  if (!hardMatch && !advisoryMatch) {
    return { decision: "allow", reason: "target is under main tree but not shared-state" };
  }

  const reArmed = env?.PRISM_CROSS_WORKTREE_HARD === "1";

  // 9a. DOC / COORDINATION shared-state. Operator grant 2026-05-31: every chat galaxy
  //     may write these to the main tree. ADVISE (warn + allow) unless re-armed.
  if (advisoryMatch && !hardMatch && !reArmed) {
    const reason =
      `Cross-worktree ADVISORY: writing main-tree shared-state ${relToMain} from worktree ${wtRoot}.\n` +
      `Permitted — operator grant 2026-05-31: every chat galaxy may add to the main tree. ` +
      `Heads-up: this lands on the shared tree where peers read it. Make sure it clears the ` +
      `scrutiny gate and does not silently clobber a peer's uncommitted edit (read fresh, ` +
      `re-stage if a peer just committed). Re-arm the hard block fleet-wide with ` +
      `PRISM_CROSS_WORKTREE_HARD=1.`;
    return { decision: "advise", advisory: true, reason, target: absTarget, worktree: wtRoot };
  }

  // 9b. HARNESS-EXEC files (settings/hooks/mcp) OR PRISM_CROSS_WORKTREE_HARD=1 re-arm →
  //     HARD block with a remediation-oriented reason.
  const tier = hardMatch ? "harness-exec (always hard)" : "re-armed via PRISM_CROSS_WORKTREE_HARD=1";
  const matchedSrc = (hardMatch || advisoryMatch).source;
  const reason =
    `Cross-worktree write blocked: this chat is in worktree ${wtRoot} but the target ` +
    `${absTarget} is a HARD-blocked shared-state file in the main tree (${relToMain} — ` +
    `matched ${matchedSrc}; tier: ${tier}).\n\n` +
    `Why this stays blocked: drift in harness-execution files (settings.json, hooks/*.mjs, ` +
    `.mcp.json) changes which hooks fire across the fleet — silent, asymmetric, survives ` +
    `reboots. The 2026-05-31 main-tree-write grant relaxed DOC/coordination files to ` +
    `advisory, but NOT these.\n\n` +
    `To proceed:\n` +
    `  - Make the change from the main tree (H:/prism): cd there, edit, commit, then return.\n` +
    `  - Emergency override: set PRISM_CROSS_WORKTREE_BYPASS=1 (the hook still logs the bypass).`;
  return { decision: "block", reason, target: absTarget, worktree: wtRoot };
}

// ── Hook entry (when run as a script) ────────────────────────────────────────

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    return raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function main() {
  let result;
  try {
    const stdin = readStdinSafe();
    const cwd = process.cwd();
    const { gitToplevel, gitCommonDir } = defaultProbeWorktree(cwd);
    result = evaluate({ stdin, cwd, gitToplevel, gitCommonDir, env: process.env });
  } catch {
    // Last-ditch failsafe: never break the harness.
    result = { decision: "allow", reason: "hook threw; failing open" };
  }
  if (result.decision === "block") {
    process.stdout.write(JSON.stringify({ decision: "block", reason: result.reason }));
  } else if (result.decision === "advise") {
    process.stdout.write(JSON.stringify({ continue: true, systemMessage: result.reason }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
  // Exit 0 either way — the decision field is what the harness reads.
  process.exit(0);
}

// Run only when invoked as the entry script (not when imported by tests).
const invokedAsScript = (() => {
  try {
    const self = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/i, "$1");
    return path.resolve(self) === path.resolve(process.argv[1] ?? "");
  } catch {
    return false;
  }
})();
if (invokedAsScript) main();
