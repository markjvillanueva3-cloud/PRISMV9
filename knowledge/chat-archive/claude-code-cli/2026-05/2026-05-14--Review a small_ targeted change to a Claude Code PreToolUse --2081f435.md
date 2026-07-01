---
type: "chat-session"
source: "claude-code-cli"
session_id: "2081f435-92ef-4cfc-b986-d43d968e9d65"
title: "Review a small, targeted change to a Claude Code PreToolUse hook. Read the WHOLE"
date: "2026-05-14"
first_ts: "2026-05-14T20:36:10.128Z"
last_ts: "2026-05-14T20:36:49.971Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-a7df14d3a51ae92e9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review a small, targeted change to a Claude Code PreToolUse hook. Read the WHOLE

> **claude-code-cli** | 2026-05-14 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2081f435-92ef-4cfc-b986-d43d968e9d65/subagents/agent-a7df14d3a51ae92e9.jsonl`

## Transcript

### User | 2026-05-14T20:36:10.128Z

Review a small, targeted change to a Claude Code PreToolUse hook. Read the WHOLE file: H:\prism\.claude\hooks\worktree-commit-route.mjs

THE CHANGE (U-P1-ROUTE-ACTIVATE, SLOT-WORKTREE-MS0 Phase 1): this hook was previously wired into bash-bundle.mjs with NO opt-in gate — effectively default-ON, which is a fleet hazard because all 7 chats currently share H:/prism on cad-fusion-live-ms0 and the hook would deny routine commits that have no themed worktree to route to. The change adds an ENV-OPT-IN ACTIVATION GATE (default OFF):
- `const ROUTE_ENABLED = process.env.PRISM_WORKTREE_ROUTE_ENABLE === "1";`
- `const ROUTE_DISABLED = process.env.PRISM_WORKTREE_ROUTE_DISABLE === "1";`
- `if (!ROUTE_ENABLED || ROUTE_DISABLED) exit(0);`
placed as the FIRST executable statement (before the stdin read), plus an expanded header docblock documenting the gate, the kill switch, and the CROSS_CUTTING_SCOPES whitelist.

VERIFY:
- Is the gate logic correct? `!ROUTE_ENABLED || ROUTE_DISABLED` — default OFF (unset → exit), ENABLE=1 → proceeds, DISABLE=1 always wins even with ENABLE=1.
- Is exiting BEFORE reading stdin safe for a hook run inside bash-bundle.mjs? (The bundle's hook-runner spawns each hook as a child and writes stdin then calls child.stdin.end() — it wraps the write in try/catch. An early exit() before reading stdin should be safe — confirm there's no hang/EPIPE-crash risk.)
- `exit` is imported from "node:process" — confirm `exit(0)` at that point is valid (the file's existing pattern relies on imported `exit` never returning).
- Does the rest of the hook still function unchanged below the gate? Any variable/scope breakage from inserting the gate?
- The docblock claims: hook is wired in bash-bundle.mjs, default OFF, kill switch always wins, CROSS_CUTTING_SCOPES whitelist. Are those claims accurate vs the actual code?
- Any P0/P1.

Smoke-tested already: gate OFF (no env) → no output, exit 0; ENABLE=1 → proceeds to routing logic and emits the deny JSON; ENABLE=1 + DISABLE=1 → 
... [+133 chars truncated]

### Assistant | 2026-05-14T20:36:14.734Z

I'll review the hook file thoroughly.

### Assistant | 2026-05-14T20:36:15.118Z

[tool_use: Read]

### User | 2026-05-14T20:36:18.560Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * worktree-commit-route.mjs — PreToolUse(Bash) worktree-routing enforcement
5	 *
6	 * WHY: 6 concurrent chats all try to commit to H:/prism (the main
7	 * worktree). git-anti-clobber.mjs serializes but does NOT route — two
8	 * chats doing unrelated work still collide on HEAD. The user has 15
9	 * worktrees already set up, one per active work theme. Thi
... [+25206 chars truncated]

### Assistant | 2026-05-14T20:36:49.971Z

I've read the whole file. Here's my review of U-P1-ROUTE-ACTIVATE.

## Findings

### P0
None.

### P1
None.

### P2

**P2-1 — `tier: T0` comment vs documented bash-bundle wiring (line 2 vs lines 34, 79)**
The file is tagged `// tier: T0` on line 2, but the docblock says it fires "via bash-bundle.mjs" (line 34) and "is wired into bash-bundle.mjs" (line 79). bash-bundle is the *non-blocking* T4-style aggregator; a true T0 hook would be wired individually in the Stop/PreToolUse chain ahead of the bundle. This is a pre-existing inconsistency, not introduced by this change, but the new docblock now asserts the bash-bundle wiring explicitly — worth confirming the `tier: T0` tag still reflects reality (or downgrade it). Non-blocking for this change since the gate behavior is correct regardless.

**P2-2 — Docblock CROSS_CUTTING_SCOPES list is accurate but `[MAIN]`/`[MAIN-FORCE]` description slightly understates behavior (lines 31-32 vs 156-179)**
Lines 31-32 say `[MAIN]` "is a soft override that still warns on detected scope drift." In the actual code (lines 157-179, 331-396), a strong `[MAIN]` scope-drift detection results in a `deny()`, not a `warn()` — it blocks with a route hint. The docblock's "warns" wording is imprecise. Minor; pre-existing semantics, the new docblock just inherited loose phrasing. The NON-BLOCKING PATHS list (lines 38-47) is accurate.

## Verification of the change itself

- **Gate logic (line 88)** — `if (!ROUTE_ENABLED || ROUTE_DISABLED) exit(0);` is correct. Unset → `ROUTE_ENABLED=false` → `!false=true` → exit. `ENABLE=1` only → `false || false` → proceeds. `ENABLE=1 + DISABLE=1` → `false || true` → exit. `DISABLE=1` only → exit. All four cases match the documented contract; DISABLE always wins. Strict `=== "1"` means `PRISM_WORKTREE_ROUTE_ENABLE=true`/`yes`/`0` all correctly leave it OFF — fail-safe.

- **Early exit before stdin read** — Safe. The hook never opens fd 0; `readFileSync(0, ...)` on line 93 is now unreachable when gated. The bash-bu
... [+2492 chars truncated]
