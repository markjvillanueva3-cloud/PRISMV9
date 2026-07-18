---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "SCRUTINY AXIS A1 — OBSOLETE HOOKS You are agent 1 of 10 in juliett's `/forge7` s"
date: "2026-05-17"
first_ts: "2026-05-17T04:24:41.403Z"
last_ts: "2026-05-17T04:29:28.210Z"
cwd: "H:\\prism"
messages: 30
user_msgs: 14
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-af5789cc3224c290b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SCRUTINY AXIS A1 — OBSOLETE HOOKS You are agent 1 of 10 in juliett's `/forge7` s

> **claude-code-cli** | 2026-05-17 | 30 msgs (14 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-af5789cc3224c290b.jsonl`

## Transcript

### User | 2026-05-17T04:24:41.403Z

SCRUTINY AXIS A1 — OBSOLETE HOOKS

You are agent 1 of 10 in juliett's `/forge7` scrutiny pass. The other 9 cover different axes; you own OBSOLETE HOOKS.

CONTEXT: PRISM has ~510 hook .mjs files but `feedback_dont_wire_for_wiring_sake_2026_05_16.md` doctrine just dropped — concern is many wired hooks are dead-code (never fire, fire but no-op, or fire on stale conditions). MEMORY.md indexed entry says 500/510 hooks never fire (memory `reference_dev_tools_audit_meta_scripts_2026_05_17`).

YOUR JOB: find obsolete hooks — wired in settings.json but no longer load-bearing.

EVIDENCE SOURCES (read these directly):
1. `H:/PRISM/state/shared/specs/JULIETT-CONSOLIDATED-WORK-PLAN-V2.md` — context of what was already known
2. `node H:/prism/scripts/hook-fire-rank.mjs --window=7d --json` if exists, else grep `state/shared/hook-fire-stats.jsonl`
3. `node H:/prism/scripts/system-viz-query.mjs hook-coverage --json` (updated /system-viz per user note)
4. `H:/PRISM/.claude/settings.json` + `C:/Users/wompu/.claude/settings.json` — current wiring
5. `H:/PRISM/.claude/hooks/` directory listing — what exists on disk
6. `knowledge/memories/feedback/feedback_dont_wire_for_wiring_sake_2026_05_16.md` — charlie's doctrine
7. `knowledge/wiki/architecture/hooks/` if exists

LOOK FOR:
- Hooks wired in settings.json that have zero fires in 7d
- Hooks that fire but emit `{continue:true}` no-op every time (dead branches)
- Hooks targeting deleted/renamed files
- Hooks whose trigger keywords no longer appear in current commands/skills
- Bundle children listed in `bundles/*.mjs` but no longer used
- Duplicate hooks doing the same thing across the chain

OUTPUT (under 400 words, structured):
```
## A1 — OBSOLETE HOOKS FINDINGS

### F1: <one-line finding>
- Evidence: <file:line or query result>
- Impact: <what breaks or wastes>
- Recommendation: <unwire / delete / consolidate / promote-to-loud>
- Priority: P0/P1/P2

### F2: ...

## SUMMARY COUNTS
- Total hooks in settings.json (C+H): N
- Hooks never fi
... [+330 chars truncated]

### Assistant | 2026-05-17T04:24:47.136Z

I'll investigate obsolete hooks. Let me gather evidence from the listed sources.

### Assistant | 2026-05-17T04:24:48.256Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:24:49.821Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:24:50.468Z

[tool_use: Bash]

### User | 2026-05-17T04:24:59.640Z

[tool_result] H:/prism/scripts/hook-fire-rank.mjs*
H:/prism/scripts/system-viz-query.mjs*

### User | 2026-05-17T04:25:01.919Z

[tool_result] ls: cannot access 'H:/PRISM/state/shared/hook-fire-stats.jsonl': No such file or directory
ls: cannot access 'H:/PRISM/state/shared/hook-fire-stats.json': No such file or directory

### User | 2026-05-17T04:25:04.308Z

[tool_result] H:/PRISM/state/shared/specs/JULIETT-CONSOLIDATED-WORK-PLAN-V2.md

### Assistant | 2026-05-17T04:25:07.192Z

Acknowledged. Proceeding with targeted reads now that I have evidence file paths confirmed.

### Assistant | 2026-05-17T04:25:11.394Z

[tool_use: Bash]

### User | 2026-05-17T04:25:21.756Z

[tool_result] unknown flag: --window=7d

### Assistant | 2026-05-17T04:25:23.953Z

[tool_use: Bash]

### User | 2026-05-17T04:26:21.650Z

[tool_result] hook-fire-rank.mjs — empirical hook fire-rate ranker

Reads mcp-server/data/state/hook-fire-counts.jsonl, ranks hooks by events/hour.

Flags:
  --json                emit JSON
  --top N               keep top-N (default 25)
  --include-zero        also list hooks on-disk that never fire
  --no-disk-scan        skip the .claude/hooks/ enumeration
  --frozen-time ISO     deterministic now for tests

... [+111 chars truncated]

### Assistant | 2026-05-17T04:26:24.471Z

[tool_use: Bash]

### User | 2026-05-17T04:26:39.040Z

[tool_result] {
  "schemaVersion": 1,
  "generatedAt": "2026-05-17T04:26:37.678Z",
  "ledger": {
    "path": "H:\\prism\\mcp-server\\data\\state\\hook-fire-counts.jsonl",
    "parseErrors": 0,
    "totalEvents": 8779
  },
  "window": {
    "hours": 395.9230425
  },
  "totals": {
    "unique_firing_hooks": 10,
    "zero_fire_hooks": 501
  },
  "ranked": [
    {
      "hook": "wiki-precheck-inject",
      "count"
... [+12690 chars truncated]

### Assistant | 2026-05-17T04:26:43.285Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:26:47.316Z

[tool_use: Bash]

### User | 2026-05-17T04:26:53.074Z

[tool_result]     "file-ownership-tracker",
    "file-read-cache",
    "fix-stdin-pattern",
    "fleet-reaper-stop",
    "forge-intent-claim",
    "formula-algorithm-suggest",
    "git-add-lane-guard",
    "git-anti-clobber",
    "git-anti-clobber-release",
    "git-commit-checkin",
    "git-health-guard",
    "git-lock-sweeper",
    "git-output-condenser",
    "git-sync-fetch",
    "git-sync-stop",
    "glob-n
... [+9651 chars truncated]

### User | 2026-05-17T04:27:05.594Z

[tool_result] C entries: 151
H entries: 151
Unique commands: 145

### Assistant | 2026-05-17T04:27:16.048Z

[tool_use: Bash]

### User | 2026-05-17T04:27:32.511Z

[tool_result] Wired in settings.json (C): 151
Wired AND firing: 15 [
  'verify-hook-refs',
  'precompact-handoff',
  'error-pattern-promote',
  'stop-regression-bundle',
  'mcp-action-router',
  'mcp-pretool-injector',
  'edit-bundle',
  'bash-bundle',
  'read-bundle',
  'search-optimizer',
  'viz-first-redirect',
  'skill-auto-trigger',
  'mcp-posttool-tracker',
  'posttool-edit-bundle',
  'posttool-bash-read-
... [+352 chars truncated]

### Assistant | 2026-05-17T04:27:42.010Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:27:43.437Z

[tool_use: Bash]

### User | 2026-05-17T04:27:55.403Z

[tool_result] Bundle entries: 6
Stop |  | stop-regression-bundle.mjs
PreToolUse | Edit|Write|MultiEdit | edit-bundle.mjs
PreToolUse | Bash | bash-bundle.mjs
PreToolUse | Read | read-bundle.mjs
PostToolUse | Edit|Write|MultiEdit | posttool-edit-bundle.mjs
PostToolUse | Bash|Read | posttool-bash-read-bundle.mjs

### User | 2026-05-17T04:28:06.019Z

[tool_result] H:/PRISM/.claude/hooks/bundles/bash-bundle.mjs*
H:/PRISM/.claude/hooks/bundles/edit-bundle.mjs*
H:/PRISM/.claude/hooks/bundles/posttool-bash-read-bundle.mjs*
H:/PRISM/.claude/hooks/bundles/posttool-edit-bundle.mjs*
H:/PRISM/.claude/hooks/bundles/read-bundle.mjs*
H:/PRISM/.claude/hooks/bundles/sessionstart-bundle.mjs*
H:/PRISM/.claude/hooks/bundles/smoke-test.mjs*
H:/PRISM/.claude/hooks/bundles/sto
... [+72 chars truncated]

### Assistant | 2026-05-17T04:28:12.979Z

[tool_use: Bash]

### User | 2026-05-17T04:28:21.219Z

[tool_result] stop-regression-bundle children: 0
edit-bundle children: 0
bash-bundle children: 0
read-bundle children: 0
posttool-edit-bundle children: 0
posttool-bash-read-bundle children: 0
sessionstart-bundle children: 0
stop-bundle children: 0
Unique bundle children total: 0

### Assistant | 2026-05-17T04:28:23.636Z

[tool_use: Bash]

### User | 2026-05-17T04:28:32.605Z

[tool_result] #!/usr/bin/env node
// tier: T0
// stop-regression-bundle.mjs — single Stop hook that runs the DEV-TOOL
// regression GATES (the fail-closed ones), as the sibling of stop-bundle.mjs
// (which runs only the non-blocking trackers).
//
// Why: the Stop event runs all gates as individual settings.json entries —
// ~62s of serial timeout budget for the 10 folded here, ×N concurrent chats,
// a fresh no
... [+2412 chars truncated]

### Assistant | 2026-05-17T04:29:28.210Z

I have sufficient evidence. Delivering findings now.

## A1 — OBSOLETE HOOKS FINDINGS

### F1: 90.0% of wired hooks are zero-fire in 16.5 days
- Evidence: `node H:/prism/scripts/hook-fire-rank.mjs --include-zero --top 1000 --json` → 501 zero-fire hooks on disk; 136 of 151 wired commands in `C:/Users/wompu/.claude/settings.json` map to zero-fire hooks. Only **15 unique wired hooks fire** (10 are real productive hooks; 5 are bundle dispatchers + routers).
- Impact: Per-event timeout budget consumed serially on every Stop/PostToolUse for zero benefit. Fork-storm + xmalloc class symptoms (regression history line 2026-05-14).
- Recommendation: Disable in batches by category (per F2-F6). Apply [[feedback_never_delete_only_disable]] — set `hooks:[]` + ledger.
- Priority: **P0**

### F2: 8 duplicate wirings — same hook registered in multiple settings.json positions
- Evidence: `stress-harness-emit` (4×), `session-id-pin`, `linear-roadmap-sync`, `supabase-state-sync`, `golf-slot-reaper-guardian`, `quality-dashboard-alert`, `precompact-auto-trigger`, `cross-session-orchestrator` (2× each).
- Impact: Same hook fires N times per event = N× the timeout budget, N× telemetry rows. `stress-harness-emit` 4× is the worst.
- Recommendation: Consolidate to single entry each; `stress-harness-emit` 4× wiring smells like a hot-swap that never cleaned up — audit the 4 positions, keep 1.
- Priority: **P0**

### F3: Documented-as-canonical hooks are wired but DEAD (zero fires)
- Evidence: Zero-fire list includes load-bearing-by-doctrine hooks: `master-index-precheck-inject`, `awareness-snapshot-inject`, `build-state-inject`, `comprehensive-build-enforce`, `scrutinize-before-stop`, `inventory-check-guard`, `dedup-auto-invoke`, `duplication-hard-block`, `chat-bus-inject`, `ai-feature-recommend`, `build-create-detector`, `goal-complete-gate`, `close-out-audit-suggest`, `error-pattern-capture`, `error-block-prewarn`, `tribal-by-domain-inject` (last had 45 fires but only in a 2hr window 2026-05-1
... [+4986 chars truncated]
