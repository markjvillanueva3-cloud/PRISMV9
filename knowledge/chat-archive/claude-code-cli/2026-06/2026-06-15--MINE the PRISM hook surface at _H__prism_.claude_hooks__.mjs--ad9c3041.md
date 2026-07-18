---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "MINE the PRISM hook surface at `H:/prism/.claude/hooks/*.mjs` (809 hooks) + wiri"
date: "2026-06-15"
first_ts: "2026-06-15T05:30:27.047Z"
last_ts: "2026-06-15T05:44:15.042Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 11
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a11e8b8ad4bf1f7de.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# MINE the PRISM hook surface at `H:/prism/.claude/hooks/*.mjs` (809 hooks) + wiri

> **claude-code-cli** | 2026-06-15 | 24 msgs (11 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a11e8b8ad4bf1f7de.jsonl`

## Transcript

### User | 2026-06-15T05:30:27.047Z

MINE the PRISM hook surface at `H:/prism/.claude/hooks/*.mjs` (809 hooks) + wiring in `C:/Users/wompu/.claude/settings.json`. Goal: document the EXISTING auto-invoke + gate layer that a unified routing graph must compose with (not duplicate).

Extract:
- totalHooks (count)
- byEvent: count per event (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop) — read settings.json events arrays + grep hook `tier:` headers.
- autoInjectors: the UserPromptSubmit/SessionStart hooks that ALREADY auto-inject context or auto-fire skills — especially skill-auto-trigger.mjs, master-index-precheck-inject.mjs, the model-routing inject, task-substrate-router consumer, per-slot soul/galaxy injectors, CAG router inject. For each: {hook, event, fires (what + on what condition)}.
- gates: the PreToolUse/Stop HARD-BLOCK gates the routing graph must respect: {hook, blocks}. Include duplication-hard-block, comprehensive-build-enforce, scrutinize-before-stop, claude-md-golf-only-guard, git-add-lane-guard, and any others.
- autoInvokeMechanism: READ `.claude/hooks/skill-auto-trigger.mjs` END-TO-END and describe exactly how it decides to fire a skill — its data source (`knowledge/wiki/architecture/_skill-triggers.jsonl`), the score threshold, the INVOKE_NOW_SKILLS allowlist, and how a NEW task-class→command table could be added to it.

Return ONLY a single fenced ```json block:
{"totalHooks":<n>,"byEvent":{...},"autoInjectors":[{"hook":"","event":"","fires":""}],"gates":[{"hook":"","blocks":""}],"autoInvokeMechanism":"..."}

### Assistant | 2026-06-15T05:30:39.413Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:30:39.419Z

[tool_use: Read]

### User | 2026-06-15T05:31:17.897Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1421 of 1867 total (27906 tokens, cap 25000). Call Read with offset=1422 limit=1421 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PRISM_FLEET_REAPER_DISABLE": "0",
5	    "PRISM_GOLF
... [+56393 chars truncated]

### User | 2026-06-15T05:31:35.457Z

[tool_result] 809

### Assistant | 2026-06-15T05:31:40.294Z

[tool_use: Read]

### Assistant | 2026-06-15T05:31:40.351Z

[tool_use: Read]

### User | 2026-06-15T05:32:00.449Z

[tool_result] 1422	          },
1423	          {
1424	            "type": "command",
1425	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/slot-context-bundle-inject.mjs",
1426	            "timeout": 3000
1427	          },
1428	          {
1429	            "type": "command",
1430	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ai-synergy-awareness-i
... [+16834 chars truncated]

### User | 2026-06-15T05:32:02.430Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * skill-auto-trigger.mjs — pipeline-aware multi-event suggester.
5	 *
6	 * History:
7	 *   - DEV-VELOCITY-AUTOTRIGGER-MS0 (Phase D.2): UserPromptSubmit-only,
8	 *     skill-trigger jsonl matching, suggest-only.
9	 *   - COMMAND-KERNEL-MS0/U-CK16: extended to fire on PostToolUse + Stop
10	 *     in addition to UserPromptSubmit, AND to suggest pipelines (
... [+31954 chars truncated]

### Assistant | 2026-06-15T05:32:08.486Z

Now let me check the specific gate hooks mentioned and count events from settings.json:

### Assistant | 2026-06-15T05:32:12.486Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:32:13.053Z

[tool_use: Bash]

### User | 2026-06-15T05:33:41.343Z

[tool_result] {
  "SessionStart": 61,
  "PreCompact": 9,
  "Stop": 66,
  "PreToolUse": 47,
  "UserPromptSubmit": 59,
  "PostToolUse": 31,
  "SubagentStart": 1
}
TOTAL: 274

### User | 2026-06-15T05:34:43.666Z

[tool_result] === scrutinize-before-stop.mjs ===
#!/usr/bin/env node
// tier: T0
/**
 * scrutinize-before-stop — Stop hook (UNIVERSAL ENFORCEMENT).
 *
 * Forces a strict 3-of-3 multi-reviewer scrutiny before the agent is allowed to
 * finish a task that produced code/file changes:
 *   - Codex CLI               (cross-vendor — auto-recorded by scrutiny-3way.mjs)
 *   - Claude reviewer agent A  (holistic — dispa
... [+8176 chars truncated]

### Assistant | 2026-06-15T05:34:50.708Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:34:52.047Z

[tool_use: Bash]

### User | 2026-06-15T05:35:56.412Z

[tool_result] H:/prism/.claude/hooks/bundles/edit-bundle.mjs:  { path: `${HOOK_BASE}/duplication-hard-block.mjs`,         timeout: 3000 },
  { path: `${HOOK_BASE}/duplication-hard-block.mjs`,         timeout: 3000 },
  { path: `${HOOK_BASE}/dedup-auto-invoke.mjs`,              timeout: 3000, cacheable: true },
=== master-index-precheck-inject.mjs header ===
#!/usr/bin/env node
// tier: T2
/**
 * master-index-pr
... [+6839 chars truncated]

### User | 2026-06-15T05:37:32.643Z

[tool_result] Exit code 255
=== model-tier-advisor.mjs ===
// tier: T2
/**
 * model-tier-advisor.mjs -- UserPromptSubmit hook (U-MODEL-TIER-ADVISOR, slot:india 2026-06-11).
 *
 * THE OPERATOR GOAL (2026-06-11, "fable demolished session limits"): auto-enforced model switching --
 * fable for deep planning/reasoning, opus for building/coding, ollama for verified-100% mechanical,
 * sonnet/haiku for capable tasks.
... [+3190 chars truncated]

### Assistant | 2026-06-15T05:37:36.094Z

Now I have all the data needed. Let me compile the final JSON:

### Assistant | 2026-06-15T05:37:38.689Z

[tool_use: Bash]

### User | 2026-06-15T05:40:24.460Z

[tool_result] Exit code 255

### Assistant | 2026-06-15T05:40:34.137Z

[tool_use: Bash]

### User | 2026-06-15T05:42:36.681Z

[tool_result] Exit code 255
root hooks: 809
bundles: 11
total: 820

### Assistant | 2026-06-15T05:44:15.042Z

```json
{
  "totalHooks": 809,
  "byEvent": {
    "SessionStart": 61,
    "UserPromptSubmit": 59,
    "PreToolUse": 47,
    "PostToolUse": 31,
    "Stop": 66,
    "PreCompact": 9,
    "SubagentStart": 1
  },
  "autoInjectors": [
    {
      "hook": "skill-auto-trigger.mjs",
      "event": "UserPromptSubmit + PostToolUse + Stop",
      "fires": "On UserPromptSubmit: BM25-scores prompt tokens against knowledge/wiki/architecture/_skill-triggers.jsonl; emits MANDATORY 'INVOKE NOW' directive for INVOKE_NOW_SKILLS (dedup, forge7, forge-audit-v2, forge-triple, scrutinize, wire-edm-studio, lathe-studio, quote-to-ship, octopus, wiki-query, master-index, pick-unit, pick-build-close) when score>=0.75; emits advisory suggestions for other skills at score>=0.65 (default top-3). Also matches pipeline .md frontmatter by /command mention in prompt. On PostToolUse: matches pipelines whose composed_of references the just-executed tool (top-2, suppressOutput). On Stop: surfaces pipelines with triggerEvents:Stop or triggerKind:hook with stop-class stage (top-2). Controlled by PRISM_SKILL_AUTO_TRIGGER_DISABLE=0 (currently enabled). Lifecycle skills (precompact/compact/handoff/checkpoint) are STATE-GATED and excluded from keyword matching."
    },
    {
      "hook": "master-index-precheck-inject.mjs",
      "event": "UserPromptSubmit",
      "fires": "Keyword-gated injection of top-K master-index hits from system-graph.json before the model picks a search tool. Controlled by PRISM_MASTER_INDEX_INJECT=1 (currently ON), throttled at PRISM_MASTER_INDEX_THROTTLE_MS=300000ms to suppress repeated identical-prompt re-injection in /loop iterations."
    },
    {
      "hook": "cag-router-inject.mjs",
      "event": "UserPromptSubmit",
      "fires": "Classifies prompt as COLD/HOT/HYBRID via scripts/lib/cag-router.mjs and writes a route-decision sidecar so downstream injectors (master-index, memory-relevance, tribal-by-domain) can short-circuit on high-confidence cold hits. Producer-only hook; c
... [+14067 chars truncated]
