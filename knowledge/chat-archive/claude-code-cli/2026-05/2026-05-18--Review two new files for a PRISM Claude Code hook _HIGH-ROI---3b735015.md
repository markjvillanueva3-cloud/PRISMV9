---
type: "chat-session"
source: "claude-code-cli"
session_id: "3b735015-a3e0-4ba4-8b97-35384113b9f9"
title: "Review two new files for a PRISM Claude Code hook (HIGH-ROI-HOOKS-MS0 / U-HRH02)"
date: "2026-05-18"
first_ts: "2026-05-18T02:36:07.598Z"
last_ts: "2026-05-18T02:37:43.634Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/3b735015-a3e0-4ba4-8b97-35384113b9f9/subagents/agent-a5cb073fb306e778d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review two new files for a PRISM Claude Code hook (HIGH-ROI-HOOKS-MS0 / U-HRH02)

> **claude-code-cli** | 2026-05-18 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3b735015-a3e0-4ba4-8b97-35384113b9f9/subagents/agent-a5cb073fb306e778d.jsonl`

## Transcript

### User | 2026-05-18T02:36:07.598Z

Review two new files for a PRISM Claude Code hook (HIGH-ROI-HOOKS-MS0 / U-HRH02). Read both END TO END:
FILE 1: H:\PRISM\.claude\hooks\mcp-readonly-cache.mjs
FILE 2: H:\PRISM\.claude\hooks\mcp-readonly-cache.test.mjs

CONTRACT: A PreToolUse hook wired on the `mcp__prism*` matcher. When Claude calls an MCP dispatcher with a READ-ONLY action and identical params it called <3min ago, the hook emits `permissionDecision:"deny"` so the dispatcher does not re-run and re-emit its (often large) JSON — the prior result is already in context. It is the MCP-tier sibling of H:\PRISM\.claude\hooks\bash-result-cache.mjs (read it for the conventions).

The DANGEROUS failure mode: deduping a MUTATING action — denying a re-call of `memory_save`/`job_create` would drop a real state change. The safety filter `isReadOnlyAction` requires a read suffix AND no mutating verb token.

Flag P0 (correctness/safety) and P1 (real defect):
1. `isReadOnlyAction` — can a MUTATING PRISM dispatcher action slip through and become cacheable/denyable? Probe real PRISM action names (they look like `gap_scan_read`, `memory_save`, `job_create`, `cam_generate`, `roadmap_advance`, `tool_crib_status`, `cpk_predict`, `auto_fix_apply`, `digital_twin_sync`). Conversely — does it wrongly reject obviously-read-only actions (lost ROI, not a bug)?
2. The deny / hookSpecificOutput JSON shape — valid? Does the hook ever throw/hang/exit non-zero (which would break a real MCP call)?
3. `decideMcpCheck` + the count-based deny-loop escape — trace it. After a deny sets `denies[key]`, the next check passes and re-records the call. Any path where a key can never be denied again, or denied in an infinite loop?
4. `stableStringify` / `cacheKey` — could two genuinely-different calls collide to the same key (→ wrong deny)? Could the same call produce different keys (→ dedup never fires — only lost ROI)?
5. Concurrency — per-session cache file, read-modify-write, 13+ concurrent fleet chats. Any lost-update causing a WRONG deny?
6.
... [+214 chars truncated]

### Assistant | 2026-05-18T02:36:15.367Z

[tool_use: Read]

### Assistant | 2026-05-18T02:36:14.521Z

I'll review both files end to end, starting with the sibling convention file for context.

### Assistant | 2026-05-18T02:36:15.680Z

[tool_use: Read]

### Assistant | 2026-05-18T02:36:14.934Z

[tool_use: Read]

### User | 2026-05-18T02:36:20.686Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * Bash Result Cache — PreToolUse Hook
5	 *
6	 * Blocks duplicate Bash executions within a session for a narrow whitelist
7	 * of read-only, idempotent commands. Saves tokens on repeat `git log`,
8	 * `git diff`, `ls`, `wc`, `stat`-type probes that already returned in this
9	 * session.
10	 *
11	 * Cache key: sessionId + normalized command + cwd
12	 *
13
... [+6468 chars truncated]

### User | 2026-05-18T02:36:20.914Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * mcp-readonly-cache.test.mjs — HIGH-ROI-HOOKS-MS0 / U-HRH02.
5	 *
6	 * Pure-function coverage + subprocess integration oracles. Several oracles
7	 * are fail-on-revert guards: the "mutating action is never denied" oracle
8	 * would FAIL if the safety filter were reverted.
9	 *
10	 * Run: node --test H:/prism/.claude/hooks/mcp-readonly-cache.test.mjs
11
... [+9146 chars truncated]

### User | 2026-05-18T02:36:21.006Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * mcp-readonly-cache.mjs — duplicate read-only MCP dispatcher-call guard.
5	 *
6	 * HIGH-ROI-HOOKS-MS0 / U-HRH02. The MCP-tier sibling of bash-result-cache:
7	 * PRISM backend dev makes hundreds of `mcp__prism…` dispatcher calls per
8	 * session and frequently re-issues an IDENTICAL read-only one (re-checking
9	 * `gap_scan_read`, `db_health`, `master_i
... [+9473 chars truncated]

### Assistant | 2026-05-18T02:37:43.634Z

I have both files plus the sibling. Now tracing the analysis paths.

## Analysis

### 1. `isReadOnlyAction` — mutating-action leak probe

I traced every probe action against `READ_SUFFIX` and `MUTATING_VERB`:

| Action | MUTATING_VERB match | READ_SUFFIX match | Verdict | Correct? |
|---|---|---|---|---|
| `memory_save` | `save` (`_save$`) → blocked | — | not-read-only | ✓ |
| `job_create` | `create` (`_create$`) → blocked | — | not-read-only | ✓ |
| `cam_generate` | `generate` → blocked | — | not-read-only | ✓ |
| `roadmap_advance` | `advance` → blocked | — | not-read-only | ✓ |
| `auto_fix_apply` | `apply` → blocked | — | not-read-only | ✓ |
| `digital_twin_sync` | `sync` → blocked | — | not-read-only | ✓ |
| `gap_scan_read` | none | `_read$` | read-only | ✓ |
| `tool_crib_status` | none | `_status$` | read-only | ✓ |
| `cpk_predict` | none | none | not-read-only | ✓ (lost ROI, not a bug) |

But the dispatcher enums in this environment expose **mutating actions that end in a read-suffix token and contain NO mutating verb** — these slip through:

**P0 — mutating actions with a read-shaped suffix pass `isReadOnlyAction` and become deny-able.** Scanning the real dispatcher enums in the tool schemas:

- **`prism_business`: `customer_credit_check`** — `check` is not in `MUTATING_VERB`; ends in `_check`... actually `check` is *not* in `READ_SUFFIX` either, so it passes through (safe). But:
- **`prism_business`: `quality_calibration_dashboard`** — read. Fine. The real hits:
- **`prism_atcs`: `queue_next`** — ends `_next`, not a read suffix → passes through. Safe.
- **`prism_turning`: `tnr_setup_procedure`** — no read suffix → safe.
- **The genuine leaks** — actions where the *last token* is a READ_SUFFIX word but the action **performs a mutation/side-effecting compute**, and no MUTATING_VERB token appears:
  - **`prism_dev`: `session_boot`** — no read suffix, safe.
  - **`prism_business`: `payroll_run` / `quote_status_change`** — `run`/`change`... `run` is in MUTATING_VE
... [+11447 chars truncated]
