---
type: "chat-session"
source: "claude-code-cli"
session_id: "1a624844-ea3f-42d6-9850-5cc6700cd54d"
title: "Audit the PRISM system-viz subsystem for FUNCTIONALITY upgrades — features that "
date: "2026-05-16"
first_ts: "2026-05-16T20:44:15.349Z"
last_ts: "2026-05-16T20:45:23.936Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 7
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/1a624844-ea3f-42d6-9850-5cc6700cd54d/subagents/agent-ac0e0e0888aefa996.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Audit the PRISM system-viz subsystem for FUNCTIONALITY upgrades — features that 

> **claude-code-cli** | 2026-05-16 | 14 msgs (7 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/1a624844-ea3f-42d6-9850-5cc6700cd54d/subagents/agent-ac0e0e0888aefa996.jsonl`

## Transcript

### User | 2026-05-16T20:44:15.349Z

Audit the PRISM system-viz subsystem for FUNCTIONALITY upgrades — features that would make it more useful to operators and to Claude agents. Read-only exploration.

Scope:
- H:/prism/scripts/system-viz-query.mjs (current verb set — list all of them)
- H:/prism/.claude/hooks/audit-viz-first-inject.mjs (existing pre-search hook)
- H:/prism/.claude/hooks/master-index-precheck-inject.mjs (parallel surface)
- H:/prism/scripts/system-viz-ghost-report.mjs
- H:/prism/scripts/system-viz-add-node.mjs
- H:/prism/scripts/system-viz-obsidian-bridge.mjs and -v2.mjs
- H:/prism/state/shared/system-viz/ (look at augmentation diversity — bridge-synergy, agent-overlay, misc-tasks etc)
- H:/prism/state/shared/specs/MISC-TASKS-INVENTORY.json (recently added as ghost)
- H:/prism/state/shared/specs/ROADMAP-CONSOLIDATED.json (5826 items — most as ghost?)

For each FUNCTIONALITY upgrade produce:
1. The operator/agent need it serves
2. Current gap (what's missing right now)
3. Concrete UX or API change
4. Verification (how would we measure adoption — invocation count? hook fire? viewer click?)
5. Effort (S/M/L)

Look specifically for:
- New query verbs (e.g. "who-calls", "depends-on", "unhealthy-domain", "stalest-wiki")
- Better integration with /system-viz the slash command (does it surface time-since-regen? blast-radius widget?)
- Drill-down into ghost categories (misc_tasks, bridge_synergy, roadmap-orphans)
- Auto-spawn-from-graph (turn a ghost.misc_task into a roadmap unit)
- Agent overlay (G2 just shipped — does any other shipped surface plug into it?)
- Action-trace overlay (D4 just shipped — query verbs to read traces?)
- Memory-conflict-resolver (D3 just shipped — does its output surface in viz?)
- Cross-link with /master-index, /awareness-snapshot, /forge-audit-v2
- Differential viz ("what changed in last 24h")
- Search-then-act ("find unwired engine in lathe domain and emit wire-plan")

Return UNDER 600 words. Rank by operator/agent leverage. Skip cosmetic suggestions.

### Assistant | 2026-05-16T20:44:17.190Z

I'll audit the PRISM system-viz subsystem for functionality upgrades. Let me explore the current state across these files.

### Assistant | 2026-05-16T20:44:17.409Z

[tool_use: Read]

### Assistant | 2026-05-16T20:44:17.639Z

[tool_use: Read]

### Assistant | 2026-05-16T20:44:17.851Z

[tool_use: Read]

### Assistant | 2026-05-16T20:44:18.072Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:44:18.229Z

[tool_use: Bash]

### User | 2026-05-16T20:44:19.482Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-query — programmatic adapter for the live system graph.
4	 *
5	 * Lets rgs / forge / roadmap tools consume system-graph.json without
6	 * embedding parsing logic. Read-only.
7	 *
8	 * Usage:
9	 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
10	 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # do
... [+14449 chars truncated]

### User | 2026-05-16T20:44:19.710Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// audit-viz-first-inject.mjs — UserPromptSubmit T2 hook.
4	// When an audit/discovery intent is detected, auto-run
5	// `node scripts/system-viz-query.mjs find <noun>` and inject the top-K hits
6	// so the chat sees the answer BEFORE reaching for Grep/Glob.
7	//
8	// Knobs: PRISM_AUDIT_VIZ_FIRST_DISABLE=1 · PRISM_AUDIT_VIZ_FIRST_K=N (1..20, def 5)
9	//       
... [+5796 chars truncated]

### User | 2026-05-16T20:44:19.856Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+5668 chars truncated]

### User | 2026-05-16T20:44:23.356Z

[tool_result] ls: cannot access 'H:/prism/scripts/system-viz-*.mjs': No such file or directory

### User | 2026-05-16T20:44:23.783Z

[tool_result] total 894539
drwxr-xr-x 1 wompu 197611         0 May 16 15:38 ./
drwxr-xr-x 1 wompu 197611         0 May 16 15:44 ../
-rw-r--r-- 1 wompu 197611    974854 May 13 19:50 .test-wiki-mtimes.json
-rw-r--r-- 1 wompu 197611     31939 May 15 19:09 DRIFT_REPORT.json
-rw-r--r-- 1 wompu 197611      8869 May 16 08:32 EXECUTIVE-BRIEFING.json
-rw-r--r-- 1 wompu 197611     21537 May 16 08:32 EXECUTIVE-BRIEFING.md
... [+1667 chars truncated]

### User | 2026-05-16T20:45:04.080Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
Audit PRISM system-viz subsystem for FUNCTIONALITY upgrades (not cosmetic) that serve operators and Claude agents. Deliver 4-5 ranked recommendations, each with: operator/agent need served, current gap, concrete UX/API change, adoption verification method, effort level (S/M/L). Focus on: new query verbs, /system-viz slash command integration, ghost category drill-down, auto-spawn-from-graph, agent overlay, action-trace overlay, memory-conflict-resolver, cross-links, differential viz, search-then-act patterns. Maximum 600 words. Rank by operator/agent leverage. Skip cosmetic suggestions.

2. Key Technical Concepts:
- system-viz-query.mjs: read-only CLI adapter (9 verbs) for consuming system-graph.json without embedding parsing logic
- Verb architecture: headline, roadmap-candidates, blast-radius, dispatcher-summary, coverage-by-domain, worktrees, find, build-order
- UserPromptSubmit hooks: audit-viz-first-inject (detects audit intent + injects find results before Grep/Glob) and master-index-precheck-inject (BM25 search over 110K nodes + pre-joined wiki/memory)
- Augmentation layers: bridge-synergy, agent-overlay, ai-tier-expand, algorithms-atomic, combo-detector, cam-vendor-catalog, actions-atomic, awareness-augmentation
- Ghost nodes: PARKED (archived worktrees), DRAINED (archive SHA-only pins), L5 unwired domains, misc_tasks inventory
- Graph structure: 110K nodes, layered (L4 dispatchers, L5 domains, L9 worktrees), bidirectional edges with depth-based blast-radius calculation

3. Files and Code Sections:

- **H:/prism/scripts/system-viz-query.mjs** (311 lines)
  - Purpose: programmatic read-only adapter for system-graph.json; surfaced via CLI and hooks
  - Current verbs (8 implemented):
    - `headline`: one-line summary (engines wired %, dispatchers, actions, tests, formula
... [+6394 chars truncated]

### Assistant | 2026-05-16T20:45:23.936Z

I'll synthesize the audit findings into 4-5 ranked functionality upgrade recommendations under 600 words.

---

## PRISM system-viz Functionality Upgrades — Ranked by Operator/Agent Leverage

### 1. **Ghost Category Drill-Down Verb** (HIGHEST LEVERAGE)
**Operator/Agent Need:** Operators need rapid inventory of archived/drained worktrees and unwired domains; agents need structured access to recovery candidates for reanimation or consolidation.

**Current Gap:** `worktrees` verb shows verdicts (PARKED, DRAINED) but doesn't expose the content inside them. Ghost counts appear in `headline` but aren't queryable. No verb surfaces "what's archived and why."

**Concrete Change:** Add `system-viz-query.mjs ghost-inventory` verb returning: ghost count by category (PARKED worktree, DRAINED archive, L5 unwired domain, misc_tasks), per-item SHA/metadata, and "recovery readiness" score (branch age, commit count since archive, conflict risk). Output: `--json` for agent consumption.

**Verification:** Hook count: how many times does `master-index-precheck-inject` or `audit-viz-first-inject` get triggered with "archive" / "orphan" / "drained" keywords? Agent integration: does `prism_intelligence:genplan_plan` call it before backfilling ghost domains?

**Effort:** M (walk ghost categories, compute age/risk metadata, JSON schema)

---

### 2. **Action-Trace Overlay Verb** (HIGH LEVERAGE FOR AGENTS)
**Operator/Agent Need:** When an agent dispatches to `prism_mill:mill_print_to_program` or `prism_cam:cam_recommend`, it needs to see the call graph (which engines fired, which skip, why). Operators debugging "why didn't my macro get picked up" need trace visibility.

**Current Gap:** `blast-radius` shows static edges; `dispatcher-summary` lists what's wired but not execution flow. No hook or verb surfaces "last N actions + outcomes." Master-index shows hits but not why they ranked that way.

**Concrete Change:** Add `system-viz-query.mjs action-trace <action_name> [--last N]` returning: (1
... [+4026 chars truncated]
