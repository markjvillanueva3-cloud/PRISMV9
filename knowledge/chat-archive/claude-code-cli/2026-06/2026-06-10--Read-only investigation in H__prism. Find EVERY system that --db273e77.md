---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Read-only investigation in H:/prism. Find EVERY system that injects \"compact\" / "
date: "2026-06-10"
first_ts: "2026-06-10T14:24:27.926Z"
last_ts: "2026-06-10T14:28:13.021Z"
cwd: "H:\\prism"
messages: 65
user_msgs: 27
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_8aad5adf-f68/agent-a44ca946b8ef6e638.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Read-only investigation in H:/prism. Find EVERY system that injects "compact" / 

> **claude-code-cli** | 2026-06-10 | 65 msgs (27 user / 38 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_8aad5adf-f68/agent-a44ca946b8ef6e638.jsonl`

## Transcript

### User | 2026-06-10T14:24:27.926Z

Read-only investigation in H:/prism. Find EVERY system that injects "compact" / "checkpoint" / "YELLOW" / "token budget" / "memory pressure" DIRECTIVE language into the model (advisory injections, not blocks).
Start points: UserPromptSubmit + Stop hook arrays in C:/Users/wompu/.claude/settings.json; H:/prism/.claude/hooks/*.mjs. 
Known candidates: token-awareness state injector (zone=GREEN/YELLOW/RED), critical-memory-compact-nudge.mjs, fleet-memory-monitor, the ZULU slot-context-bundle "decision: noop/compact" line (slot-context-bundle-inject.mjs), enforce-auto-compact.py / enforce-auto-continue.py / enforce-post-compact-continue.py.
THE KEY QUESTION: how MANY independent systems compute a "should I compact?" signal, and what METRIC does each read? Specifically distinguish (a) CONTEXT-WINDOW token budget (the chat's own token usage) vs (b) HOST RAM commit charge (the 227GB machine-wide memory). Do any CONFLICT — e.g. one emits "token-zone-green / compact suppressed" while another blocks for memory pressure? Quote the exact decision lines + file:line. Output plain-text. Do NOT edit.

### Assistant | 2026-06-10T14:24:36.863Z

I'll conduct a thorough read-only investigation to map all "compact/checkpoint/memory pressure" injectors in the prism repository and identify their decision metrics.

Let me start by examining the settings file and hook directories.

### Assistant | 2026-06-10T14:24:36.972Z

[tool_use: Read]

### Assistant | 2026-06-10T14:24:37.160Z

[tool_use: Bash]

### Assistant | 2026-06-10T14:24:37.315Z

[tool_use: Bash]

### User | 2026-06-10T14:24:42.111Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1452 of 1843 total (26960 tokens, cap 25000). Call Read with offset=1453 limit=1452 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claud
... [+57753 chars truncated]

### User | 2026-06-10T14:24:49.170Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### User | 2026-06-10T14:24:58.520Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-06-10T14:25:02.775Z

Let me use PowerShell to list the hooks files:

### Assistant | 2026-06-10T14:25:03.388Z

[tool_use: PowerShell]

### Assistant | 2026-06-10T14:25:03.393Z

[tool_use: PowerShell]

### User | 2026-06-10T14:25:07.848Z

[tool_result] <persisted-output>
Output too large (38.9KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\db273e77-fb5e-418e-b0e1-d7ef98b97236\tool-results\blfy434k1.txt

Preview (first 2KB):
H:\PRISM\.claude\hooks\_envelope.mjs
H:\PRISM\.claude\hooks\_rpc-shim.mjs
H:\PRISM\.claude\hooks\_rpc-shim.test.mjs
H:\PRISM\.claude\hooks\activate-before-build-precheck.mjs
H:\PRISM\.claude\hooks\acti
... [+1799 chars truncated]

### User | 2026-06-10T14:25:09.581Z

[tool_result] H:\PRISM\.claude\hooks\architecture-scanner.py
H:\PRISM\.claude\hooks\generate-dashboard.py
H:\PRISM\.claude\hooks\health-scanner.py

### Assistant | 2026-06-10T14:25:20.590Z

Now let me search for the specific "compact", "checkpoint", and "token budget" injectors. Let me grep for the key files mentioned in the query:

### Assistant | 2026-06-10T14:25:22.656Z

[tool_use: Grep]

### Assistant | 2026-06-10T14:25:22.658Z

[tool_use: Bash]

### User | 2026-06-10T14:25:25.763Z

[tool_result] Found 26 files
.claude\hooks\token-awareness-sidecar.mjs
.claude\hooks\zulu-advisory-inject.mjs
.claude\hooks\slot-context-bundle-inject.mjs
.claude\hooks\xray-blueprint-domain-inject.mjs
.claude\hooks\delta-cad-awareness-inject.mjs
.claude\hooks\foxtrot-mill-awareness-inject.mjs
.claude\hooks\__tests__\slot-context-bundle-inject.test.mjs
.claude\hooks\outcome-bus-auto-tap.mjs
.claude\hooks\HOOK_D
... [+869 chars truncated]

### User | 2026-06-10T14:25:32.893Z

[tool_result] alpha-token-domain-awareness-inject.mjs*
auto-precompact-watchdog.mjs*
cad-token-vocabulary-guard.mjs
checkpoint-auto-trigger.mjs*
claim-registry-precompact.mjs*
claude-brief-precompact.mjs*
cog-bridge-ai-memory-capture.mjs*
cog-bridge-context-auto-compact.mjs*
compact-interval-warning.mjs*
compaction-budget-nudge.mjs*
compaction-survival-auto.mjs*
compression-precompact.mjs*
critical-memory-compa
... [+1304 chars truncated]

### Assistant | 2026-06-10T14:25:37.013Z

Now let me read the key injector files to identify the decision logic:

### Assistant | 2026-06-10T14:25:37.428Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:37.696Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:37.770Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:38.015Z

[tool_use: Read]

### User | 2026-06-10T14:25:46.366Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * critical-memory-compact-nudge.mjs — UserPromptSubmit actuator that drives a
5	 * /compact onto the ONE chat that is the fleet's largest memory consumer when
6	 * the box is at critical commit pressure.
7	 *
8	 * THE GAP. scripts/fleet-memory-monitor.mjs samples system RAM every 5 min and,
9	 * on critical pressure, names the largest live chat tree as 
... [+12197 chars truncated]

### User | 2026-06-10T14:25:46.465Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// TOKEN-AWARENESS-MS0 / U-TA05 — model-visible inject hook.
4	//
5	// UserPromptSubmit hook. Reads the per-slot sidecar written by
6	// token-awareness-sidecar.mjs and emits a 3-line `additionalContext` block so
7	// the model SEES its current ctx/quota state and can self-pace.
8	//
9	// Wording is STATE not INSTRUCTION (per the Reddit r/ClaudeAI thread's
10	
... [+6909 chars truncated]

### User | 2026-06-10T14:25:46.561Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// TOKEN-AWARENESS-MS0 / U-TA03 — sidecar writer hook.
4	//
5	// UserPromptSubmit + PostToolUse hook. Composes a canonical TokenAwarenessState
6	// from 4 data sources and writes it to state/shared/token-budget-<slot>.json
7	// atomically. The state is then read by:
8	//   1. token-awareness-inject.mjs (UserPromptSubmit) → makes model see the state
9	//   2. T
... [+9373 chars truncated]

### User | 2026-06-10T14:25:46.757Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// ZULU-OMNISCIENT-MS0/U-ZO-MS0-FLEET-PRECHECK — per-slot context-bundle precheck.
4	//
5	// UserPromptSubmit hook. For the slot bound to this chat, calls loadSlotContext
6	// from scripts/lib/zulu-context-bundle.mjs and injects a COMPACT summary of
7	// the slot's MS0 read-side state (soul refuse_list / loop running / token zone
8	// / bridge units available 
... [+14648 chars truncated]

### Assistant | 2026-06-10T14:25:58.936Z

Now let me search for additional injectors and check for conflicts in decision logic:

### Assistant | 2026-06-10T14:25:59.452Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:59.552Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:59.781Z

[tool_use: Read]

### Assistant | 2026-06-10T14:26:00.875Z

[tool_use: Grep]

### User | 2026-06-10T14:26:05.342Z

[tool_result] Found 30 files limit: 30
.claude\hooks\auto-consensus-critical-edit.mjs
.claude\hooks\token-awareness-sidecar.mjs
.claude\hooks\zulu-advisory-inject.mjs
.claude\hooks\localhost-ollama-hardcode-guard.test.mjs
.claude\hooks\claudemd-ollama-enforcer.mjs
.claude\hooks\optimal-context-inject.mjs
.claude\hooks\goal-prereq-inject.mjs
.claude\hooks\__tests__\fleet-task-health-stop.test.mjs
.claude\hooks\f
... [+1076 chars truncated]

### User | 2026-06-10T14:26:06.402Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * compaction-budget-nudge.mjs — PostToolUse hook
5	 *
6	 * Fires after every Edit / Write / MultiEdit completion. Reads the live
7	 * token-economy session state and nudges the chat to /precompact when
8	 * context utilisation crosses predetermined thresholds.
9	 *
10	 * THRESHOLDS:
11	 *   <60%  silent — keep working
12	 *   60-80% advisory nudge ("app
... [+3941 chars truncated]

### User | 2026-06-10T14:26:06.435Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * precompact-auto-trigger.mjs — Enforce /precompact at 160K tokens.
5	 *
6	 * Goal:
7	 *   Claude runs with a 1M token context window (Opus 4.5). At 900K tokens we MUST run
8	 *   /precompact (writes the per-chat handoff so /startup can resume). The
9	 *   100K remaining buffer is writing-room for the handoff and for Claude's
10	 *   subsequent invocati
... [+24498 chars truncated]

### User | 2026-06-10T14:26:06.581Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// TOKEN-AWARENESS-MS0 / U-TA08 — Stop hook advisory.
4	//
5	// Stop hook. If this session is ending while the sidecar shows RED/CRITICAL
6	// zone AND no /compact was emitted this session, write a one-line advisory
7	// to state/shared/AGENT_CHAT.jsonl so the NEXT session in this slot picks up
8	// the warning. Never blocks Stop — pure advisory.
9	//
10	// Wh
... [+5349 chars truncated]

### Assistant | 2026-06-10T14:26:11.950Z

Now let me read the Python scripts and check for fleet-memory-monitor:

### Assistant | 2026-06-10T14:26:12.319Z

[tool_use: Bash]

### Assistant | 2026-06-10T14:26:12.328Z

[tool_use: Read]

### User | 2026-06-10T14:26:15.938Z

[tool_result] 1	/**
2	 * fleet-memory-monitor.mjs — durable system-RAM + per-slot memory monitor.
3	 *
4	 * Sits ALONGSIDE the fleet-reaper. The reaper reaps orphan processes of
5	 * CRASHED slots (after a 10-min confirm window) and runs at +210s phase off
6	 * the host. That covers post-crash cleanup, but leaves a real gap: when ALL
7	 * 13 chats are LIVE and the box drifts toward commit-memory saturation, the
... [+10818 chars truncated]

### User | 2026-06-10T14:26:44.404Z

[tool_result] H:\prism/knowledge/wiki/architecture/fleet-memory-monitor.md
H:\prism/knowledge/wiki/code-tribal/learnings/fleet-memory-monitor-ms0-u-fmm01.md
H:\prism/scripts/fleet-memory-monitor.mjs
H:\prism/scripts/fleet-memory-monitor.test.mjs
H:\prism/scripts/__tests__/fleet-memory-monitor-chat-advisory.test.mjs
H:\prism/state/shared/fleet-memory-monitor-state.json

### Assistant | 2026-06-10T14:26:49.859Z

Let me search for the decision logic in fleet-memory-monitor and check for potential conflicts:

### Assistant | 2026-06-10T14:26:50.643Z

[tool_use: Grep]

### Assistant | 2026-06-10T14:26:51.070Z

[tool_use: Grep]

### User | 2026-06-10T14:26:54.241Z

[tool_result] 92:// chat tree is bloating. Complementary to the existing decideAdvisory layer
620: * @param {{physUsedPct:number, commitUsedPct:number}} pressure
625:  const worst = Math.max(pressure.physUsedPct, pressure.commitUsedPct);
682:export function decideAdvisory(level, ledger, nowMs, cfg) {
688:  if (level === "critical") {
694:  if (level === "warn") {
789:  const physUsedPct = physTotalBytes > 0 ? (
... [+1911 chars truncated]

### User | 2026-06-10T14:26:54.306Z

[tool_result] Found 50 files limit: 50
.claude\hooks\gpu-vram-admission-guard.mjs
.claude\hooks\cross-session-orchestrator.mjs
.claude\hooks\zulu-advisory-inject.mjs
.claude\hooks\slot-context-bundle-inject.mjs
.claude\hooks\psn-leg-state-inject.mjs
.claude\hooks\__tests__\precompact-auto-trigger.test.mjs
.claude\hooks\intake-quarantine-guard.mjs
.claude\hooks\ollama-reviewer-second-opinion.mjs
.claude\hooks\ho
... [+1836 chars truncated]

### Assistant | 2026-06-10T14:27:03.011Z

Now let me read the zulu-advisory-inject to see if there's a "suppressCompact" decision path:

### Assistant | 2026-06-10T14:27:03.365Z

[tool_use: Read]

### Assistant | 2026-06-10T14:27:04.064Z

[tool_use: Grep]

### User | 2026-06-10T14:27:06.934Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// ZULU-ORCHESTRATOR-MS0 / U-ZULU06 — advisory inject hook.
4	//
5	// UserPromptSubmit hook. Reads THIS chat's transcript via CHO02
6	// readChatPressure, calls CHO01 decideClearOrCompact, emits an
7	// additionalContext advisory line when the decision is non-noop.
8	//
9	// This is the ADVISORY surface — distinct from the token-awareness-inject
10	// hook (wh
... [+7176 chars truncated]

### User | 2026-06-10T14:27:07.478Z

[tool_result] Found 6 files
scripts\lib\zulu-rag-policy.test.mjs
scripts\lib\zulu-orchestrator-lib.mjs
scripts\lib\zulu-context-bundle.test.mjs
scripts\lib\zulu-context-bundle.mjs
scripts\lib\chat-orchestrator-decisions.test.mjs
scripts\lib\chat-orchestrator-decisions.mjs

### Assistant | 2026-06-10T14:27:10.689Z

Now let me check the chat-orchestrator-decisions library:

### Assistant | 2026-06-10T14:27:11.322Z

[tool_use: Read]

### Assistant | 2026-06-10T14:27:11.839Z

[tool_use: Grep]

### User | 2026-06-10T14:27:13.866Z

[tool_result] 1	/**
2	 * chat-orchestrator-decisions.mjs — pure decision functions for the
3	 * CHAT-ORCHESTRATOR-MS0 golf-side fleet orchestrator.
4	 *
5	 * Two decisions, both no-IO + fully deterministic + injection-free, so they
6	 * are exhaustively testable without any process / filesystem / window state.
7	 * The orchestrator main loop (scripts/chat-orchestrator.mjs) is the only
8	 * caller; it gathers st
... [+8025 chars truncated]

### User | 2026-06-10T14:27:15.425Z

[tool_result] 2: * chat-orchestrator-decisions.mjs — pure decision functions for the
5: * Two decisions, both no-IO + fully deterministic + injection-free, so they
15: * gated by an env knob. The decision functions never recommend action
16: * outside that contract; e.g. they never recommend "compact" on a chat
20: * default (noop / skip-unknown) and surface the reason — never guess.
30: *   pressureLevel === "
... [+589 chars truncated]

### Assistant | 2026-06-10T14:27:18.805Z

Now let me check for the "suppressCompact" field in slot-context-bundle-inject (which I saw earlier):

### Assistant | 2026-06-10T14:27:19.808Z

[tool_use: Grep]

### Assistant | 2026-06-10T14:27:20.029Z

[tool_use: Read]

### User | 2026-06-10T14:27:22.555Z

[tool_result] 876://     decision: {recommend, rationale, suppressCompact, allowedSuggestions} }
891:                  suppressCompact: true, allowedSuggestions: [] },
903:                  suppressCompact: true, allowedSuggestions: [] },
959://   - suppressCompact: true when loop is running OR token-zone is GREEN+fresh
968:    suppressCompact: false,
975:    decision.suppressCompact = true;
982:    decision.re
... [+285 chars truncated]

### User | 2026-06-10T14:27:22.611Z

[tool_result] 1	// ZULU-OMNISCIENT-MS0/U-ZO-MS0-01 — CLAUDE-BRIEF + PRISM-BUILD-VISION reader
2	// with mtime-keyed cache layer for the Zulu orchestrator sweep.
3	//
4	// Purpose: ONE place that reads the 2 highest-leverage goal-anchor files
5	// (CLAUDE-BRIEF.md — what we have, PRISM-BUILD-VISION.md — what we're trying
6	// to build) so the Zulu orchestrator's `planSlotAction` can make
7	// goal-aware decision
... [+11192 chars truncated]

### Assistant | 2026-06-10T14:27:26.477Z

Perfect! Now I have enough information. Let me search for the complete decision logic in zulu-context-bundle around line 876 and 959-1026:

### Assistant | 2026-06-10T14:27:26.927Z

[tool_use: Read]

### User | 2026-06-10T14:27:29.158Z

[tool_result] 850	// degrades to the legacy boolean path; never throws). Returns a stable
851	// envelope with `surfaces.<name>` sub-envelopes so callers can inspect
852	// per-surface health.
853	
854	// Helper: shape a generic per-surface envelope into the bundle shape.
855	// Preserves ok/reason from each surface without unwrapping all fields.
856	function bundleSurface(surfaceEnv) {
857	  return {
858	    o
... [+8886 chars truncated]

### Assistant | 2026-06-10T14:28:13.021Z

Perfect. Now I have all the information I need. Let me compile my findings:

## FINAL REPORT: COMPACT/CHECKPOINT/MEMORY-PRESSURE DIRECTIVE INJECTORS

**READ-ONLY INVESTIGATION COMPLETE** — 5 independent systems that inject "compact" / "checkpoint" / "YELLOW" / "token budget" advisory directives into the model.

---

### SYSTEM 1: CRITICAL MEMORY PRESSURE (HOST RAM COMMIT)
**File:** `H:\prism\.claude\hooks\critical-memory-compact-nudge.mjs`
**Event:** UserPromptSubmit
**Metric:** HOST SYSTEM COMMIT MEMORY (not context-window)
**Decision Logic:**
- Reads: `state/shared/fleet-memory-history.jsonl` (last row from fleet-memory-monitor, sampled every 5 min)
- Decision at **line 178-205** (`decideNudge` function):
  ```
  L180:  if (row.level !== "critical") return { nudge: false, ... }
  L182-184: Check freshness (TELEMETRY_FRESH_MS = 10 min)
  L187: if (row.largestTree !== mySlot) return { nudge: false, reason: "not-largest" }
  L189-191: Cooldown gate (default 480 sec = 8 min)
  L204: DECISION: nudge = true, text = "⛔ MEMORY CRITICAL" advisory
  ```
- **ADVISORY INJECTION at L256:** `emitContinue(decision.text)` — injects into chat context
- **METRIC SOURCES (from fleet-memory-monitor.mjs:789-804):**
  - `physUsedPct` = (physUsedBytes / physTotalBytes) × 100 [physical RAM]
  - `commitUsedPct` = (commitUsedBytes / virtTotalBytes) × 100 [Windows commit budget]
  - `level` = worst-of(physUsedPct, commitUsedPct) vs thresholds (default: warn≥80%, critical≥92%)
- **KNOBS:** `PRISM_CRIT_MEM_NUDGE_DISABLE=1`, `PRISM_CRIT_MEM_NUDGE_COOLDOWN_SEC=N`

---

### SYSTEM 2: CONTEXT-WINDOW TOKEN AWARENESS (CONTEXT TOKENS)
**Files:** 
- `H:\prism\.claude\hooks\token-awareness-sidecar.mjs` (writer, UserPromptSubmit+PostToolUse)
- `H:\prism\.claude\hooks\token-awareness-inject.mjs` (reader/injector, UserPromptSubmit)
- `H:\prism\.claude\hooks\token-awareness-stop-advisory.mjs` (Stop hook)

**Metric:** CONTEXT-WINDOW TOKEN BUDGET (chat's own transcript)
**Decision Logic:**
- **Sidecar Write
... [+9623 chars truncated]
