---
type: "chat-session"
source: "claude-code-cli"
session_id: "d545743f-8fad-47d7-a7de-1716a4be5839"
title: "You are inventorying the ENV KNOBS that control context-stop + injection behavio"
date: "2026-06-11"
first_ts: "2026-06-11T13:43:47.718Z"
last_ts: "2026-06-11T13:50:36.878Z"
cwd: "H:\\prism-slot-hotel"
messages: 24
user_msgs: 11
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/workflows/wf_9f76de57-9ef/agent-a52b1814c03f53cbc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# You are inventorying the ENV KNOBS that control context-stop + injection behavio

> **claude-code-cli** | 2026-06-11 | 24 msgs (11 user / 13 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d545743f-8fad-47d7-a7de-1716a4be5839/subagents/workflows/wf_9f76de57-9ef/agent-a52b1814c03f53cbc.jsonl`

## Transcript

### User | 2026-06-11T13:43:47.718Z

You are inventorying the ENV KNOBS that control context-stop + injection behavior, and recovering what a PRIOR chat ("yesterday") decided about context re-injection.

1) Read these Obsidian decision notes (the operator referenced addressing this yesterday):
   - H:/prism/knowledge/claude-md/project-hook-injection-responses-react-to-auto-injected-context-don-.md
   - H:/prism/knowledge/claude-md/project-ollama-context-floor-canonical-prism-brief-on-every-local-ll.md
   - H:/prism/knowledge/memories/feedback/feedback_enhancements_auto_apply_all_galaxies.md
   Summarize what each decided about re-injection / context floors / fleet-wide application.

2) Grep H:/prism/.claude/hooks/*.mjs AND the settings.json env block (C:/Users/wompu/.claude/settings.json (canonical edit target) + H:/.claude/settings.json (mirror) + H:/prism/.claude/settings.json + H:/prism-slot-hotel/.claude/settings.json) for env knobs matching: PRISM_*COMPACT*, PRISM_*PRECOMPACT*, PRISM_*BUDGET*, PRISM_*TOKEN*, PRISM_*NUDGE*, PRISM_*INJECT*, PRISM_*ZONE*, PRISM_*AUTORESUME*, PRISM_*CONTEXT*. For each: knob name, what it does, current default, which file reads it.

3) Identify the current settings.json "env" block contents (which knobs are already set, in which of the settings.json files).

Output structured markdown: (a) prior-decision summary, (b) a KNOB TABLE (name | controls | default | set-where), (c) "RECOMMENDED ENV SETTINGS to disable context-size stops + optimize injection (with exact JSON keys/values)". Be precise -- these will be pasted into settings.json.

### Assistant | 2026-06-11T13:43:54.048Z

I'll read the Obsidian decision notes in parallel, then grep the hooks and settings files.

### Assistant | 2026-06-11T13:43:54.593Z

[tool_use: Read]

### Assistant | 2026-06-11T13:43:55.074Z

[tool_use: Read]

### Assistant | 2026-06-11T13:43:55.143Z

[tool_use: Read]

### User | 2026-06-11T13:44:03.036Z

[tool_result] 1	---
2	source: project
3	section: HOOK INJECTION RESPONSES — react to auto-injected context, don't scroll past
4	slug: hook-injection-responses-react-to-auto-injected-context-don-
5	indexed_at: 2026-04-30T17:23:34.960Z
6	---
7	
8	## HOOK INJECTION RESPONSES — react to auto-injected context, don't scroll past
9	
10	| Hook signal | Required action |
11	|---|---|
12	| `wiki-precheck-inject` top-3 en
... [+1946 chars truncated]

### User | 2026-06-11T13:44:03.087Z

[tool_result] 1	---
2	source: project
3	section: OLLAMA CONTEXT FLOOR (canonical PRISM brief on every local-LLM call — added 2026-05-04)
4	slug: ollama-context-floor-canonical-prism-brief-on-every-local-ll
5	indexed_at: 2026-05-04T20:05:40.031Z
6	---
7	
8	## OLLAMA CONTEXT FLOOR (canonical PRISM brief on every local-LLM call — added 2026-05-04)
9	
10	`OllamaContextFloorEngine` prepends the canonical PRISM brief
... [+1118 chars truncated]

### User | 2026-06-11T13:44:03.131Z

[tool_result] 1	---
2	name: enhancements-auto-apply-all-galaxies
3	description: "FLEET-WIDE rule (operator 2026-06-11): any enhancement, fix, or gap-fill a slot makes to its OWN galaxy/system AUTOMATICALLY applies to ALL other galaxies -- clone-don't-fork, in the same work. Strengthens R15 SS-APPLY-TO-ALL-GALAXIES into an always-on default for every slot."
4	type: feedback
5	source: prism-memory
6	synced: 2026-
... [+2921 chars truncated]

### Assistant | 2026-06-11T13:44:06.880Z

Now let me grep the hooks and settings files in parallel.

### Assistant | 2026-06-11T13:44:09.192Z

[tool_use: Bash]

### Assistant | 2026-06-11T13:44:11.267Z

[tool_use: Bash]

### User | 2026-06-11T13:44:17.966Z

[tool_result] H:/prism/.claude/hooks/alpha-token-domain-awareness-inject.mjs
H:/prism/.claude/hooks/awareness-snapshot-inject.mjs
H:/prism/.claude/hooks/build-state-inject.mjs
H:/prism/.claude/hooks/cad-pipeline-knowledge-inject.mjs
H:/prism/.claude/hooks/cag-injectors-consume.test.mjs
H:/prism/.claude/hooks/cag-router-inject.mjs
H:/prism/.claude/hooks/cag-router-inject.test.mjs
H:/prism/.claude/hooks/cag-soul-
... [+2751 chars truncated]

### User | 2026-06-11T13:44:18.160Z

[tool_result] C:/Users/wompu/.claude/settings.json:    "PRISM_CHAT_BUS_COMPACT": "1",
C:/Users/wompu/.claude/settings.json:    "PRISM_MASTER_INDEX_INJECT": "1",
C:/Users/wompu/.claude/settings.json:    "PRISM_MEMORY_INDEX_INJECT": "1",
C:/Users/wompu/.claude/settings.json:    "PRISM_WIKI_PRECHECK_INJECT": "1",
C:/Users/wompu/.claude/settings.json:    "PRISM_BRIEF_INJECT_MODE": "headline",
C:/Users/wompu/.claude
... [+1145 chars truncated]

### Assistant | 2026-06-11T13:44:21.112Z

Now let me get the full settings.json env block and grep the hook files for the specific knob definitions/defaults:

### Assistant | 2026-06-11T13:44:22.977Z

[tool_use: Bash]

### Assistant | 2026-06-11T13:44:24.159Z

[tool_use: Bash]

### User | 2026-06-11T13:44:30.275Z

[tool_result] H:/prism/.claude/hooks/alpha-token-domain-awareness-inject.mjs:20: *   PRISM_TOKEN_AWARENESS_INJECT_DISABLE=1 → no-op
H:/prism/.claude/hooks/alpha-token-domain-awareness-inject.mjs:21: *   PRISM_TOKEN_AWARENESS_STALE_HRS=N      → staleness hint threshold (default 24)
H:/prism/.claude/hooks/alpha-token-domain-awareness-inject.mjs:67:// Knob: PRISM_TOKEN_AWARENESS_NO_AUTOREGEN=1 sets disabled (read-
... [+16630 chars truncated]

### User | 2026-06-11T13:44:35.007Z

[tool_result] {
  "PRISM_FLEET_REAPER_DISABLE": "1",
  "PRISM_GOLF_GUARDIAN_DISABLE": "1",
  "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
  "OLLAMA_MODELS": "H:/Tools/ollama/models",
  "PRISM_PYTHON_GPU_PATH": "H:/Tools/py
... [+2324 chars truncated]

### User | 2026-06-11T13:46:08.461Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
The user requested an inventory of ENV KNOBS controlling context-stop and injection behavior, plus recovery of what a prior chat ("yesterday") decided about context re-injection. Three explicit sub-tasks:
- (1) Read three specific Obsidian decision notes and summarize what each decided about re-injection / context floors / fleet-wide application.
- (2) Grep `H:/prism/.claude/hooks/*.mjs` AND the env blocks of four specific settings.json files (`C:/Users/wompu/.claude/settings.json`, `H:/.claude/settings.json`, `H:/prism/.claude/settings.json`, `H:/prism-slot-hotel/.claude/settings.json`) for env knobs matching patterns: PRISM_*COMPACT*, PRISM_*PRECOMPACT*, PRISM_*BUDGET*, PRISM_*TOKEN*, PRISM_*NUDGE*, PRISM_*INJECT*, PRISM_*ZONE*, PRISM_*AUTORESUME*, PRISM_*CONTEXT*.
- (3) Identify the current settings.json "env" block contents (which knobs are set, in which files).
- Final output format requested: structured markdown with (a) prior-decision summary, (b) KNOB TABLE (name | controls | default | set-where), (c) RECOMMENDED ENV SETTINGS to disable context-size stops and optimize injection with exact JSON keys/values.

The conversation was cut short by compaction before the final structured output was produced. The task is incomplete.

2. Key Technical Concepts:
- PRISM env knob system: environment variables in settings.json `env` block control injection, compaction, and budget behaviors across hooks
- Hook injection pipeline: ~60 hooks in `H:/prism/.claude/hooks/*.mjs` read env knobs to gate/modify behavior
- Canonical settings edit target: `C:/Users/wompu/.claude/settings.json` (auto-mirrored to `H:/.claude/settings.json` by c-to-h-mirror hook on every Edit/Write)
- OllamaContextFloorEngine: prepends `CLAUDE-BRIEF.md` as system prompt to every Ollama API call; three modes: `brie
... [+10554 chars truncated]

### Assistant | 2026-06-11T13:46:18.518Z

Now I have all the data needed. Let me grab the remaining key hook files for the compact/precompact/budget knobs:

### Assistant | 2026-06-11T13:46:21.482Z

[tool_use: Bash]

### User | 2026-06-11T13:46:27.261Z

[tool_result] H:/prism/.claude/hooks/cognitive-budget-allocator.mjs:22:const MAX_CONTEXT_TOKENS = Number(process.env.PRISM_MAX_CONTEXT_TOKENS) || CONTEXT_CAP;
H:/prism/.claude/hooks/injection-budget-cap-enforce.mjs:44: *   PRISM_INJECTION_BUDGET_CAP_BYTES=N   cap override (default 3072 = spec target)
H:/prism/.claude/hooks/injection-budget-cap-enforce.mjs:45: *   PRISM_INJECTION_BUDGET_CAP_TTL_MS=N  snapshot fr
... [+4585 chars truncated]

### User | 2026-06-11T13:49:14.859Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
The user requested a complete inventory of ENV KNOBS controlling context-stop and injection behavior across the PRISM fleet, plus recovery of what "yesterday's" prior chat decided about context re-injection. Three explicit sub-tasks with a specific output format:
- (1) Read three specific Obsidian decision notes and summarize what each decided about re-injection/context floors/fleet-wide application.
- (2) Grep `H:/prism/.claude/hooks/*.mjs` AND the env blocks of four settings.json files for env knobs matching: PRISM_*COMPACT*, PRISM_*PRECOMPACT*, PRISM_*BUDGET*, PRISM_*TOKEN*, PRISM_*NUDGE*, PRISM_*INJECT*, PRISM_*ZONE*, PRISM_*AUTORESUME*, PRISM_*CONTEXT*.
- (3) Identify current settings.json "env" block contents (which knobs are set, in which files).
- Final output format: structured markdown with (a) prior-decision summary, (b) KNOB TABLE (name | controls | default | set-where), (c) RECOMMENDED ENV SETTINGS JSON to disable context-size stops and optimize injection — with exact JSON keys/values suitable for pasting into settings.json.

The task was interrupted by two compaction cycles before the final output was produced. All data has been gathered; the output needs to be written.

2. Key Technical Concepts:
- PRISM env knob system: environment variables in settings.json `env` block control injection, compaction, and budget behaviors fleet-wide
- Canonical settings edit target: `C:/Users/wompu/.claude/settings.json` — auto-mirrored to `H:/.claude/settings.json` by c-to-h-mirror hook on every Edit/Write
- Hook injection pipeline: ~60 hooks in `H:/prism/.claude/hooks/*.mjs` read env knobs to gate/modify behavior per UserPromptSubmit and SessionStart
- `injection-budget-cap-enforce.mjs`: enforces a byte cap (default 3072 bytes) on total injection per prompt; HARD BLOCK unless 
... [+20254 chars truncated]

### Assistant | 2026-06-11T13:50:36.878Z

The complete inventory is ready. Here is the full structured output:

---

## (a) PRIOR-DECISION SUMMARY

**Decision 1 — Hook Injection Responses Doctrine**
Every hook emitting `systemMessage` or `additionalContext` asserts a constraint. Silence = non-compliance. Required actions per signal: `auto-precompact-watchdog` pressure → run `/precompact` + write per-agent handoff NOW; `session-reorient-inject` brief → use as ground truth, skip re-exploration; `ollama-context-aggregator` summary → treat as cached, skip Read of summarized files; `wiki-precheck-inject` top-3 entries → read them before deriving; `karpathy-discipline-inject` checklist → apply CLASSIFY→TECHNIQUE→EDGES→FAILURES→WRITE before first Edit. This governs ALL injection hooks fleet-wide.

**Decision 2 — Ollama Context Floor (CLAUDE-BRIEF on every local-LLM call)**
`OllamaContextFloorEngine` prepends `state/shared/CLAUDE-BRIEF.md` as system prompt on every Ollama API call via `OllamaHookBridgeEngine`. Three modes: `brief` (~13KB, default), `standard` (+memory +claims +position, ~22KB), `full` (+master-index +GSD-quick, ~26KB). 12h TTL cache; auto-regenerated on SessionStart via `generate-claude-brief.mjs`. Stale-detection: >12h triggers re-inject; >24h triggers full regenerate. Skip-list: tasks tagged `bare-ollama` (embedding-only, deterministic stringification — saves ~2K tokens/call). Mode is set via `PRISM_BRIEF_INJECT_MODE` (pointer / headline / full / silent).

**Decision 3 — Enhancements Auto-Apply Fleet-Wide (operator directive 2026-06-11)**
Any enhancement, fix, or gap-fill made to own galaxy/system automatically applies to ALL 34 galaxies. General asset (tool/hook/skill/script/schema/pattern) → wire fleet-wide, one canonical copy. Galaxy-specific asset → clone (not fork) into every galaxy that shares the need, adapting only domain content. Fix to shared pattern → apply to ALL instances. `[SCOPED]` is the only exception, stated explicitly. Backed by `comprehensive-build-enforce` + `stop_on_unwired_
... [+10921 chars truncated]
