---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Map every occurrence of \"zebra\"/\"Zebra\"/\"ZEBRA\" (case-insensitive) under `H:/pri"
date: "2026-05-30"
first_ts: "2026-05-30T03:27:53.492Z"
last_ts: "2026-05-30T03:46:03.095Z"
cwd: "H:\\prism-slot-bravo"
messages: 110
user_msgs: 50
assistant_msgs: 60
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-ac519d09b19eb0f1f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Map every occurrence of "zebra"/"Zebra"/"ZEBRA" (case-insensitive) under `H:/pri

> **claude-code-cli** | 2026-05-30 | 110 msgs (50 user / 60 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-ac519d09b19eb0f1f.jsonl`

## Transcript

### User | 2026-05-30T03:27:53.492Z

Map every occurrence of "zebra"/"Zebra"/"ZEBRA" (case-insensitive) under `H:/prism/.claude` and `H:/prism/state/shared` ONLY. This is for a planned rename zebra->zulu. Report CONCLUSIONS with exact paths, not raw dumps.

Categorize:
1. SKILL WRAPPERS in `H:/prism/.claude/commands/` — list every `*zebra*.md` file (e.g. checkin-zebra.md, smart-zebra.md, galaxy-buildout-zebra.md, handoff-zebra.md, precompact-zebra.md, startup-zebra.md, galaxy-verify-zebra.md). CRITICAL: for each, check whether a `*-zulu.md` twin ALREADY EXISTS (e.g. checkin-zulu.md). Report a table: zebra-skill | zulu-twin-exists(Y/N) | does zebra version have orchestrator-specific content the generic zulu version lacks?
2. HOOKS in `H:/prism/.claude/hooks/` — any `*zebra*.mjs` files (e.g. zebra-advisory-inject.mjs, slot-context-bundle-inject.mjs which may contain SLOT_GALAXY_MAP with zebra). List file + what it does + whether it's wired in settings.json.
3. HELPERS in `H:/prism/.claude/helpers/` — any zebra refs (e.g. chat-slots.mjs SLOT_NAMES — confirm zebra is NOT in SLOT_NAMES; slot-galaxy-map.mjs — find the zebra/zulu entries).
4. SETTINGS — `H:/prism/.claude/settings.json` (and note H:/.claude/settings.json + C:/Users/wompu/.claude/settings.json mirrors): any line wiring a zebra-named hook. Exact line context.
5. STATE/SHARED — `state/shared/slot-souls/zebra.md` (exists? + does zulu.md exist?), `state/shared/CHAT-SLOT-DOMAINS.md` (the ZEBRA row), `state/shared/per-slot-galaxy-buildout/zebra.md`, slot-galaxy-map.mjs, any other slot-identity files with zebra.
6. SCRIPTS — `H:/prism/scripts/` generators that emit per-slot wrappers (generate-per-slot-wrappers.mjs, generate-per-slot-galaxy-*.mjs) — do they read SLOT_NAMES (which lacks zebra) or a separate list that includes zebra?

Output compact tables with absolute paths. Note which items are file-renames vs content-edits vs deletions (duplicate skills). Do NOT modify anything.

### Assistant | 2026-05-30T03:28:03.270Z

I'll map all occurrences of "zebra"/"Zebra"/"ZEBRA" across the specified directories and categorize them for the rename plan.

### Assistant | 2026-05-30T03:28:03.490Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:03.689Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:04.109Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:04.153Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:04.157Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:04.335Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:04.554Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:08.398Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:08.493Z

[tool_use: Glob]

### User | 2026-05-30T03:28:33.651Z

[tool_result] H:/prism/.claude/commands\checkin-zebra.md
H:/prism/.claude/commands\precompact-zebra.md
H:/prism/.claude/commands\handoff-zebra.md
H:/prism/.claude/commands\startup-zebra.md
H:/prism/.claude/commands\galaxy-buildout-zebra.md
H:/prism/.claude/commands\smart-zebra.md
H:/prism/.claude/commands\galaxy-verify-zebra.md

### User | 2026-05-30T03:28:33.874Z

[tool_result] H:/prism/.claude/hooks\zebra-advisory-inject.mjs
H:/prism/.claude/hooks\__tests__\zebra-advisory-inject.test.mjs

### User | 2026-05-30T03:28:34.340Z

[tool_result] No files found

### User | 2026-05-30T03:28:34.383Z

[tool_result] H:/prism/state/shared/slot-souls\zebra.md

### User | 2026-05-30T03:28:34.540Z

[tool_result] H:/prism/state/shared/slot-souls\zulu.md

### User | 2026-05-30T03:28:34.893Z

[tool_result] H:/prism/state/shared/per-slot-galaxy-buildout\zebra.md

### User | 2026-05-30T03:28:35.351Z

[tool_result] No files found

### User | 2026-05-30T03:28:41.927Z

[tool_result] No files found

### User | 2026-05-30T03:28:42.083Z

[tool_result] No files found

### Assistant | 2026-05-30T03:28:44.600Z

Now let me check for zulu twins and search for content references:

### Assistant | 2026-05-30T03:28:45.268Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:45.547Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:45.987Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:46.126Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:46.383Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:46.440Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:46.445Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:28:46.450Z

[tool_use: Read]

### Assistant | 2026-05-30T03:28:46.454Z

[tool_use: Read]

### User | 2026-05-30T03:29:09.050Z

[tool_result] H:/prism/.claude/commands\checkin-zulu.md

### User | 2026-05-30T03:29:09.159Z

[tool_result] H:/prism/.claude/commands\precompact-zulu.md

### User | 2026-05-30T03:29:09.469Z

[tool_result] H:/prism/.claude/commands\handoff-zulu.md

### User | 2026-05-30T03:29:09.539Z

[tool_result] H:/prism/.claude/commands\startup-zulu.md

### User | 2026-05-30T03:29:09.599Z

[tool_result] H:/prism/.claude/commands\galaxy-buildout-zulu.md

### User | 2026-05-30T03:29:09.752Z

[tool_result] H:/prism/.claude/commands\smart-zulu.md

### User | 2026-05-30T03:29:09.787Z

[tool_result] H:/prism/.claude/commands\galaxy-verify-zulu.md

### User | 2026-05-30T03:29:11.392Z

[tool_result] 1	# Chat-slot domain designations
2	
3	> **Canonical source.** Operator-locked 2026-05-27, mirrored from `H:/CHAT-SLOT-DOMAINS.md`.
4	> **Awareness mechanism:** `.claude/hooks/slot-domain-awareness-inject.mjs` (UserPromptSubmit) reads this file and injects a compact slot-domain table into every chat's prompt context — every slot knows every other slot's territory.
5	> **Refresh:** edit `H:/CHAT-SL
... [+4947 chars truncated]

### User | 2026-05-30T03:29:11.484Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "includeCoAuthoredBy": false,
4	  "spinnerTipsEnabled": false,
5	  "env": {
6	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
7	    "OLLAMA_MODELS": "H:/Tools/ollama/models",

... [+51796 chars truncated]

### Assistant | 2026-05-30T03:29:13.872Z

Now let me search for zebra in helpers and scripts:

### system

... [30 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-30T03:30:19.467Z

Let me check if zulu.md exists in per-slot-galaxy-buildout and search for more specific content:

### Assistant | 2026-05-30T03:30:19.694Z

[tool_use: Glob]

### Assistant | 2026-05-30T03:30:20.312Z

[tool_use: Bash]

### Assistant | 2026-05-30T03:30:21.222Z

[tool_use: Grep]

### Assistant | 2026-05-30T03:30:20.719Z

[tool_use: Read]

### User | 2026-05-30T03:30:47.684Z

[tool_result] No files found

### User | 2026-05-30T03:30:58.945Z

[tool_result] Found 3 files
H:\prism\scripts\generate-per-slot-galaxy-verify.mjs
H:\prism\scripts\generate-per-slot-galaxy-buildout-files.mjs
H:\prism\scripts\lib\slot-galaxy-map.mjs

### User | 2026-05-30T03:30:58.961Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generatedAt": "2026-05-30T01:45:17.733Z",
4	  "slotCount": 27,
5	  "fingerprints": [
6	    {
7	      "slot": "alpha",
8	      "ok": true,
9	      "hermesRole": "efficiency-watchdog",
10	      "domains": [
11	        "token",
12	        "efficiency",
13	        "obsidian",
14	        "memory",
15	        "rtk",
16	        "ollama",
17	        "cag",
18	       
... [+636 chars truncated]

### User | 2026-05-30T03:33:03.386Z

[tool_result] state/shared/AGENT_COORDINATION_STATUS.json:    "message": "[bravo->fleet] HEADS UP: full 'npm run build' (tsc) is BLOCKED by 13 PRE-EXISTING type errors, NOT mine: shopDispatcher.ts x12 (7x TS2352 Record<string,unknown>->typed-input casts @ lines 1409/1416/1423/1430/1448/1488/1500 | 2x TS2576 getLaborByDepartment static-access @ 1839/1840 | TS2740 @ 401 | TS2694 QuoteEstimateInput @ 1479 | TS2345
... [+4699 chars truncated]

### Assistant | 2026-05-30T03:33:05.973Z

Let me check the galaxy generators and look at the slot-galaxy-map:

### Assistant | 2026-05-30T03:33:06.293Z

[tool_use: Read]

### Assistant | 2026-05-30T03:33:06.653Z

[tool_use: Read]

### Assistant | 2026-05-30T03:33:07.161Z

[tool_use: Bash]

### User | 2026-05-30T03:33:21.928Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-bravo.

### User | 2026-05-30T03:33:37.886Z

[tool_result] 1	#!/usr/bin/env node
2	// Generates per-slot galaxy-buildout dispatch files at
3	// state/shared/per-slot-galaxy-buildout/<slot>.md
4	//
5	// Each file is a comprehensive operator-canonical brief for the slot to
6	// execute on launch when its galaxy doesn't exist yet (or is incomplete).
7	//
8	// Driven by:
9	//   - SLOT_GALAXY_MAP (.claude/hooks/slot-context-bundle-inject.mjs)
10	//   - H:/CHAT
... [+3879 chars truncated]

### User | 2026-05-30T03:34:47.630Z

[tool_result] state/shared/.zebra-awareness-refresh.lock
state/shared/.zebra-awareness-refresh.log
state/shared/.zebra-capability-report.log
state/shared/handoffs/HANDOFF-claude-056b67b6-mike-zebra-orchestra.md
state/shared/handoffs/HANDOFF-claude-0ea589c9-charlie-zebra-orches.md
state/shared/handoffs/HANDOFF-claude-146f9c21-charlie-zebra-orches.md
state/shared/handoffs/HANDOFF-claude-2220271d-sierra-zebra-orch
... [+1301 chars truncated]

### Assistant | 2026-05-30T03:34:54.241Z

Now let me check the slot-galaxy-map from the correct path and review the commands to understand the zulu twin situation:

### Assistant | 2026-05-30T03:34:54.635Z

[tool_use: Bash]

### Assistant | 2026-05-30T03:34:54.860Z

[tool_use: Read]

### Assistant | 2026-05-30T03:34:55.284Z

[tool_use: Read]

### Assistant | 2026-05-30T03:34:55.424Z

[tool_use: Read]

### User | 2026-05-30T03:35:57.582Z

[tool_result] 1	---
2	name: smart-zulu
3	description: Per-slot smart router — recommends optimal Claude model (Haiku/Sonnet/Opus) for the next task in slot:zulu's domain, plus loads slot context. Operator ask 2026-05-28: per-slot /smart with model routing for token efficiency (don't waste Opus on Sonnet-class work).
4	---
5	
6	# /smart-zulu
7	
8	Per-slot smart router for slot:zulu (galaxy:hermes-zebra).
9	
10	#
... [+923 chars truncated]

### User | 2026-05-30T03:35:59.388Z

[tool_result] 1	---
2	description: Verify the zebra galaxy (hermes-zebra) against the canonical galaxy kit — content-level scorecard (doc files, MEMORY sections, master back-pointer, soul, wiki). Read-only. GALAXY-KIT-MS0.
3	allowed-tools: Bash, Read
4	---
5	
6	# /galaxy-verify-zebra — galaxy completeness scorecard
7	
8	Runs the canonical-kit content checks for slot **zebra** (galaxy `hermes-zebra`):
9	
10	```b
... [+506 chars truncated]

### User | 2026-05-30T03:35:59.541Z

[tool_result] 1	---
2	name: smart-zebra
3	description: Per-slot smart router — recommends optimal Claude model (Haiku/Sonnet/Opus) for the next task in slot:zebra's domain, plus loads slot context. Operator ask 2026-05-28: per-slot /smart with model routing for token efficiency (don't waste Opus on Sonnet-class work).
4	---
5	
6	# /smart-zebra
7	
8	Per-slot smart router for slot:zebra (galaxy:hermes-zebra).
9	

... [+909 chars truncated]

### User | 2026-05-30T03:36:14.926Z

[tool_result] Exit code 255

### Assistant | 2026-05-30T03:36:17.874Z

Now let me check if there's a galaxy-verify-zulu and examine the hooks wiring in settings.json more carefully:

### Assistant | 2026-05-30T03:36:18.324Z

[tool_use: Read]

### Assistant | 2026-05-30T03:36:18.540Z

[tool_use: Bash]

### Assistant | 2026-05-30T03:36:18.886Z

[tool_use: Read]

### User | 2026-05-30T03:36:32.701Z

[tool_result] 1	---
2	description: Verify the zulu galaxy (hermes-zebra) against the canonical galaxy kit — content-level scorecard (doc files, MEMORY sections, master back-pointer, soul, wiki). Read-only. GALAXY-KIT-MS0.
3	allowed-tools: Bash, Read
4	---
5	
6	# /galaxy-verify-zulu — galaxy completeness scorecard
7	
8	Runs the canonical-kit content checks for slot **zulu** (galaxy `hermes-zebra`):
9	
10	```bash
... [+502 chars truncated]

### User | 2026-05-30T03:36:33.077Z

[tool_result] 1	// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA06 — tests for zebra-advisory-inject.mjs
2	import { describe, it } from "node:test";
3	import assert from "node:assert/strict";
4	import {
5	  resolveSlotFromSlotsFile,
6	  buildChatState,
7	  renderAdvisory,
8	} from "../zebra-advisory-inject.mjs";
9	
10	describe("resolveSlotFromSlotsFile", () => {
11	  const slotsDoc = {
12	    slots: {
13	      bravo: { chat
... [+800 chars truncated]

### User | 2026-05-30T03:37:56.432Z

[tool_result] Exit code 1

### Assistant | 2026-05-30T03:37:58.726Z

Let me check for the zebra-advisory-inject hook wiring in settings.json and verify the content of mcp-tool-domains:

### Assistant | 2026-05-30T03:37:59.143Z

[tool_use: Bash]

### Assistant | 2026-05-30T03:37:59.579Z

[tool_use: Read]

### Assistant | 2026-05-30T03:38:00.130Z

[tool_use: Bash]

### User | 2026-05-30T03:38:20.237Z

[tool_result] 1	/**
2	 * mcp-tool-domains.mjs — Tier-1 MCP tool-domain filter map
3	 * (MCP-CONSOLIDATION-MS0 / U-MCP-TOOL-DOMAINS, slot:alpha 2026-05-28)
4	 *
5	 * The operator's "4-5 MCP servers split between the primary chats" idea, realized as a
6	 * FILTER on the one shared :3100 backend instead of N separate server processes. The
7	 * mcp-http-bridge narrows its tools/list to the chat's galaxy domains via
... [+6759 chars truncated]

### User | 2026-05-30T03:39:40.626Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'zebra-advisory\|hermes-zebra'

### User | 2026-05-30T03:45:17.365Z

[tool_result] Command running in background with ID: bzi63c50q. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\7bc89bd4-5fd5-4416-ba11-69eeed7a6b90\tasks\bzi63c50q.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-30T03:46:03.095Z

Now I have enough information. Let me compile my findings into a comprehensive report:

## ZEBRA→ZULU RENAME AUDIT

I've completed a thorough search across `H:/prism/.claude` and `H:/prism/state/shared`. Here are the findings:

---

### 1. SKILL WRAPPERS IN `H:/prism/.claude/commands/`

**Table: Zebra Skills & Zulu Twins**

| Zebra Skill | Zulu Twin Exists? | Orchestrator-Specific Content? |
|---|---|---|
| `checkin-zebra.md` | Y | N — generic slot-lock template (no zebra-specific prose) |
| `precompact-zebra.md` | Y | N — generic slot-lock template |
| `handoff-zebra.md` | Y | N — generic slot-lock template |
| `startup-zebra.md` | Y | N — generic slot-lock template |
| `galaxy-buildout-zebra.md` | Y | N — generic slot-lock template |
| `smart-zebra.md` | Y | **Y** — zebra has fleet-specific routing matrix (fleet-pid-scan, chat-bus-route, orchestrator-heartbeat); zulu has generic tasks. Both reference `galaxy:hermes-zebra` but zebra's routing is domain-specific. |
| `galaxy-verify-zebra.md` | Y | N — both are auto-generated read-only scorecards |

**Recommendation:** All except `smart-zebra.md` are pure duplicates generated by `generate-per-slot-wrappers.mjs` with `onlyIfMissing: true` (preserves hand-written zebra, auto-generates zulu). The `smart-zebra.md` has meaningful fleet-orchestrator content that `smart-zulu.md` does NOT have — decision required: keep as separate orchestrator-specific skill, or promote zulu's generic version post-rename.

---

### 2. HOOKS IN `H:/prism/.claude/hooks/`

**Zebra-named hooks:**

| Hook File | Wired in settings.json? | What It Does |
|---|---|---|
| `zebra-advisory-inject.mjs` | **NOT FOUND** (grep error on settings search) | UserPromptSubmit hook; reads chat pressure via `decideClearOrCompact()` & `readChatPressure()` from `scripts/lib/chat-token-watch.mjs`. Emits advisory recommendation for /compact or /clear. Tier-T2. Tests in `__tests__/zebra-advisory-inject.test.mjs`. |
| `__tests__/zebra-advisory-inject.test.mjs` | — | Te
... [+12119 chars truncated]
