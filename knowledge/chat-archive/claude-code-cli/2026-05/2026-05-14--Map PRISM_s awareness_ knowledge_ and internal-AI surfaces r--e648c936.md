---
type: "chat-session"
source: "claude-code-cli"
session_id: "e648c936-3dfa-4a7c-aedb-4efebd2980b0"
title: "Map PRISM's awareness, knowledge, and internal-AI surfaces relevant to making se"
date: "2026-05-14"
first_ts: "2026-05-14T13:16:23.327Z"
last_ts: "2026-05-14T13:26:30.704Z"
cwd: "H:\\prism"
messages: 62
user_msgs: 28
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/e648c936-3dfa-4a7c-aedb-4efebd2980b0/subagents/agent-aa4474aef27295202.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Map PRISM's awareness, knowledge, and internal-AI surfaces relevant to making se

> **claude-code-cli** | 2026-05-14 | 62 msgs (28 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e648c936-3dfa-4a7c-aedb-4efebd2980b0/subagents/agent-aa4474aef27295202.jsonl`

## Transcript

### User | 2026-05-14T13:16:23.327Z

Map PRISM's awareness, knowledge, and internal-AI surfaces relevant to making session-lifecycle commands smarter and self-adjusting. Search breadth: very thorough.

1. THE OBSIDIAN BRAIN — the wiki at `H:/prism/knowledge/wiki/`. Report its directory structure, the index/control files (`index.md`, `architecture/_stats.md`, `architecture/_leaf-index.jsonl`, `architecture/_embeddings.jsonl`, `architecture/_skill-triggers.jsonl`, `architecture/_orphans-rescue.md`), how it is generated (regen-wiki-from-viz.mjs and the 21-stage orchestrator), the recall hooks (wiki-precheck-inject.mjs, wiki-recall-on-read.mjs), and read `H:/prism/WIKI_SCHEMA.md` for the protocol. The user wants to "treat the Obsidian brain as the PRISM operating system" — assess what that would require: what's already an OS-like surface (index, router, state store) and what's missing.

2. /system-viz — read `H:/prism/scripts/system-viz-query.mjs` and report what queries/adapters it supports (roadmap-candidates, coverage-by-domain, etc.) and the `system-graph.json` structure (layers, node/edge counts, meta).

3. PRISM AWARENESS surfaces — MasterIndexEngine, BUILD_STATE.{json,md}, MILESTONE_PROGRESS.{json,md}, CLOSE-OUT-CANDIDATES.{json,md}, the awareness-snapshot, CLAUDE-BRIEF.md. For each: what it answers, where it lives, how it's regenerated, and whether it self-updates as the system grows.

4. INTERNAL AI dispatchers usable by session-lifecycle commands — summarize the relevant actions of: prism_sp (brainstorm/plan/cognitive_*), prism_ai, prism_intelligence, prism_session (the awareness/dispatcher_map/master_index/self_awareness actions), prism_memory, prism_knowledge. Which of these could a startup/checkin/pick-unit skill call to become smarter?

5. Report explicitly: the highest-leverage connections currently MISSING between the session-lifecycle commands (startup, checkin, pick-task, pick-unit, precompact, handoff) and these awareness/knowledge/AI surfaces.

Report as structured markdown. Do NOT edit
... [+101 chars truncated]

### Assistant | 2026-05-14T13:16:26.224Z

I'll systematically explore PRISM's awareness, knowledge, and internal-AI surfaces to map how they can make session-lifecycle commands smarter. Let me start with parallel searches across the key areas.

### Assistant | 2026-05-14T13:16:26.225Z

[tool_use: Glob]

### Assistant | 2026-05-14T13:16:26.653Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:16:26.880Z

[tool_use: Read]

### Assistant | 2026-05-14T13:16:27.140Z

[tool_use: Bash]

### User | 2026-05-14T13:16:34.497Z

[tool_result] 1	# PRISM Wiki Schema — Karpathy LLM-Wiki Pattern Adapted to PRISM
2	
3	> **Source:** Andrej Karpathy's LLM-Wiki document (popularized by [@defileo](https://x.com/defileo/status/2042241063612502162)).
4	> **Adopted:** 2026-04-27 in milestone `KNOWLEDGE-WIKI-MS0` / `U-WIKI01`.
5	> **Vault location:** `H:/prism/knowledge/` (existing — extends OBSIDIAN-MS0 wiring).
6	
7	This document codifies the wik
... [+12706 chars truncated]

### User | 2026-05-14T13:16:40.441Z

[tool_result] total 2036
drwxr-xr-x 1 Mark V 197608      0 May 13 14:53 .
drwxr-xr-x 1 Mark V 197608      0 May 11 13:59 ..
-rw-r--r-- 1 Mark V 197608      0 Apr 26 22:13 .gitkeep
drwxr-xr-x 1 Mark V 197608      0 May 14 08:15 .hook-cache
drwxr-xr-x 1 Mark V 197608      0 May 13 20:45 architecture
drwxr-xr-x 1 Mark V 197608      0 May  8 21:29 code-tribal
drwxr-xr-x 1 Mark V 197608      0 Apr 26 22:13 concepts

... [+808 chars truncated]

### User | 2026-05-14T13:16:42.566Z

[tool_result] total 1668
drwxr-xr-x 1 Mark V 197608      0 May 11 13:59 .
drwxr-xr-x 1 Mark V 197608      0 May 14 08:12 ..
drwxr-xr-x 1 Mark V 197608      0 Apr 26 19:20 .obsidian
drwxr-xr-x 1 Mark V 197608      0 May 12 22:08 claude-md
drwxr-xr-x 1 Mark V 197608      0 Apr 19 22:02 code-index
drwxr-xr-x 1 Mark V 197608      0 Apr 19 22:02 data-index
drwxr-xr-x 1 Mark V 197608      0 Apr 27 11:23 decisions
drw
... [+1487 chars truncated]

### User | 2026-05-14T13:16:47.833Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-14T13:16:50.579Z

Let me continue with more focused searches.

### Assistant | 2026-05-14T13:16:50.807Z

[tool_use: Read]

### Assistant | 2026-05-14T13:16:51.040Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:16:51.531Z

[tool_use: Read]

### Assistant | 2026-05-14T13:16:51.926Z

[tool_use: Bash]

### User | 2026-05-14T13:16:57.047Z

[tool_result] 1	---
2	title: Wiki Stats — architecture tree
3	type: architecture
4	generated_by: scripts/build-wiki-leaf-index.mjs
5	last_verified: 2026-05-14
6	total_entries: 23790
7	tags: [architecture, wiki, stats, self-awareness]
8	---
9	
10	# Wiki Stats — `knowledge/wiki/architecture/`
11	
12	> Authoritative count of the auto-generated architecture wiki tree. The
13	> system-viz graph's `meta.headline.wiki
... [+2304 chars truncated]

### User | 2026-05-14T13:16:58.026Z

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
... [+9414 chars truncated]

### User | 2026-05-14T13:17:17.397Z

[tool_result] H:/prism/state/shared/BUILD_STATE.json
H:/prism/state/shared/BUILD_STATE.md
H:/prism/state/shared/CLOSE-OUT-CANDIDATES.json
H:/prism/state/shared/CLOSE-OUT-CANDIDATES.md
H:/prism/state/shared/MILESTONE_PROGRESS.json
H:/prism/state/shared/MILESTONE_PROGRESS.md

### User | 2026-05-14T13:17:18.788Z

[tool_result] total 44269
drwxr-xr-x 1 Mark V 197608        0 May 13 20:45 .
drwxr-xr-x 1 Mark V 197608        0 May 13 14:53 ..
-rw-r--r-- 1 Mark V 197608        0 Apr 26 22:13 .gitkeep
-rw-r--r-- 1 Mark V 197608       41 May 13 07:37 .skill-triggers-fingerprint
-rw-r--r-- 1 Mark V 197608     2277 May 14 07:26 _disconnected-graph-nodes.md
-rw-r--r-- 1 Mark V 197608 36506644 May 11 14:51 _embeddings.jsonl
-rw-r
... [+16028 chars truncated]

### Assistant | 2026-05-14T13:17:23.565Z

Now let me read the awareness surfaces and session-lifecycle related files.

### Assistant | 2026-05-14T13:17:23.780Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:24.158Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:24.481Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:24.762Z

[tool_use: Bash]

### User | 2026-05-14T13:17:29.175Z

[tool_result] 1	# BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge
2	
3	> Generated: 2026-05-14T13:04:47.757Z
4	> Source: `scripts/build-state-snapshot.mjs` — read `BUILD_STATE.json` for the machine-queryable form.
5	
6	## At a glance
7	
8	- **2362** engines built and wired (of 3235)
9	- **1005** wiki entries indexed
10	- **873** engines awaiting dispatcher wiring
... [+25790 chars truncated]

### User | 2026-05-14T13:17:29.661Z

[tool_result] 1	# MILESTONE_PROGRESS — what's actually shipped vs claimed
2	
3	> Generated: 2026-05-14T13:17:22.165Z
4	> Window: last 60.days of git log across all branches
5	> Source: `scripts/build-milestone-progress.mjs`
6	
7	## Why this file exists
8	
9	Milestone envelope JSONs (`mcp-server/data/milestones/*.json`) carry a
10	`status` field that drifts: roadmap planners write `"not_started"`,
11	then chats 
... [+10833 chars truncated]

### User | 2026-05-14T13:17:30.430Z

[tool_result] 1	# CLOSE-OUT-CANDIDATES — units that look shipped but envelope says pending
2	
3	> Generated: 2026-05-14T13:00:57.901Z
4	> Source: `scripts/audit-close-out-candidates.mjs`
5	> Filter: min-confidence ≥ 0.75
6	
7	**Rule:** Advisory only — file presence ≠ spec correctness. Every candidate MUST be human-verified before flipping the envelope. False close-outs corrupt MILESTONE_PROGRESS and BUILD_STATE
... [+2249 chars truncated]

### User | 2026-05-14T13:17:58.198Z

[tool_result] H:/prism/.claude/commands/awareness-snapshot.md
H:/prism/.claude/hooks/awareness-snapshot-inject.mjs
H:/prism/scripts/awareness-snapshot.mjs
H:/prism/state/shared/CLAUDE-BRIEF.md

### Assistant | 2026-05-14T13:18:03.208Z

Let me read the awareness and session files that will help me understand the dispatcher mappings.

### Assistant | 2026-05-14T13:18:03.208Z

[tool_use: Read]

### Assistant | 2026-05-14T13:18:03.213Z

[tool_use: Read]

### Assistant | 2026-05-14T13:18:04.291Z

[tool_use: Read]

### Assistant | 2026-05-14T13:18:04.296Z

[tool_use: Bash]

### User | 2026-05-14T13:18:10.889Z

[tool_result] 1	# CLAUDE-BRIEF — PRISM Continuous Awareness
2	
3	**Auto-generated:** 2026-05-13T18:03:40.392Z  ·  Regenerated each SessionStart by `generate-claude-brief.mjs`.
4	If timestamp >24h old, run: `node H:/prism/mcp-server/scripts/generate-claude-brief.mjs`
5	
6	---
7	
8	## What PRISM is
9	
10	Manufacturing-intelligence platform Mark is building. Speed/Feed Calculator (SFC) + Master Post are the two sa
... [+7064 chars truncated]

### User | 2026-05-14T13:18:11.887Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * awareness-snapshot.mjs — one-shot PRISM awareness report
4	 *
5	 * OBSIDIAN-PRISM-OS-MS0/U-AWARENESS-SNAPSHOT.
6	 *
7	 * Dogfoods MasterIndexEngine.classifyAllNodes() + BUILD_STATE.json +
8	 * MILESTONE_PROGRESS.json into a single human-readable + agent-readable
9	 * report at `state/shared/AWARENESS-SNAPSHOT.md`. Designed to be:
10	 *   - Cron-able (regenerates on
... [+5336 chars truncated]

### User | 2026-05-14T13:18:12.323Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * awareness-snapshot-inject.mjs — SessionStart injector
5	 *
6	 * OBSIDIAN-PRISM-OS-MS0/U-AWARENESS-INJECT.
7	 *
8	 * Reads state/shared/AWARENESS-SNAPSHOT.md (generated by
9	 * scripts/awareness-snapshot.mjs — companion to /awareness-snapshot
10	 * skill) and emits a compact ~10-line digest as SessionStart
11	 * additionalContext so every fresh chat kn
... [+5064 chars truncated]

### User | 2026-05-14T13:19:29.271Z

[tool_result] H:/prism/.claude/worktrees/rgs6-audit-v2/knowledge/wiki/architecture/skills/project/startup.md
H:/prism/.claude/worktrees/rgs6-audit-v2/knowledge/wiki/architecture/skills/user/pick-task.md
H:/prism/.claude/worktrees/rgs6-audit-v2/knowledge/wiki/architecture/skills/user/startup.md
H:/prism/knowledge/wiki/architecture/skills/project/checkin.md
H:/prism/knowledge/wiki/architecture/skills/project/pick
... [+193 chars truncated]

### Assistant | 2026-05-14T13:19:34.230Z

Let me search for the session lifecycle command implementations and read the key skill files.

### Assistant | 2026-05-14T13:19:34.683Z

[tool_use: Read]

### Assistant | 2026-05-14T13:19:34.911Z

[tool_use: Read]

### Assistant | 2026-05-14T13:19:35.172Z

[tool_use: Read]

### Assistant | 2026-05-14T13:19:35.783Z

[tool_use: Bash]

### User | 2026-05-14T13:19:41.663Z

[tool_result] 1	---
2	title: Skill — startup
3	type: skill
4	skill_name: startup
5	scope: project
6	source_path: H:/prism/.claude/commands/startup.md
7	generated_by: scripts/generate-skill-wiki.mjs
8	last_verified: 2026-05-11
9	tags: [skill, scope-project]
10	related:
11	  - knowledge/wiki/architecture/layer-l8.md
12	---
13	
14	# Skill — `startup`
15	
16	> _(no description in frontmatter)_
17	
18	**Scope:** pro
... [+690 chars truncated]

### User | 2026-05-14T13:19:42.969Z

[tool_result] 1	---
2	title: Skill — checkin
3	type: skill
4	skill_name: checkin
5	scope: project
6	source_path: H:/prism/.claude/commands/checkin.md
7	generated_by: scripts/generate-skill-wiki.mjs
8	last_verified: 2026-05-14
9	tags: [skill, scope-project]
10	related:
11	  - knowledge/wiki/architecture/layer-l8.md
12	---
13	
14	# Skill — `checkin`
15	
16	> Check this chat into the 7-slot PRISM fleet (claim alph
... [+1045 chars truncated]

### User | 2026-05-14T13:19:43.461Z

[tool_result] 1	---
2	title: Skill — pick-unit
3	type: skill
4	skill_name: pick-unit
5	scope: project
6	source_path: H:/prism/.claude/commands/pick-unit.md
7	generated_by: scripts/generate-skill-wiki.mjs
8	last_verified: 2026-05-14
9	tags: [skill, scope-project]
10	related:
11	  - knowledge/wiki/architecture/layer-l8.md
12	---
13	
14	# Skill — `pick-unit`
15	
16	> Deterministic next-unit picker from the two mas
... [+841 chars truncated]

### User | 2026-05-14T13:20:52.001Z

[tool_result] H:/prism/.claude/hooks/wiki-precheck-inject.mjs
H:/prism/.claude/hooks/wiki-recall-on-read.mjs
H:/prism/.claude/worktrees/rgs6-audit-v2/.claude/hooks/wiki-precheck-inject.mjs
H:/prism/.claude/worktrees/rgs6-audit-v2/scripts/regen-wiki-from-viz.mjs
H:/prism/scripts/regen-wiki-from-viz.mjs

### Assistant | 2026-05-14T13:20:53.857Z

Let me read the actual command implementations and the wiki regeneration script.

### Assistant | 2026-05-14T13:20:54.084Z

[tool_use: Read]

### Assistant | 2026-05-14T13:20:54.508Z

[tool_use: Read]

### Assistant | 2026-05-14T13:20:54.909Z

[tool_use: Read]

### Assistant | 2026-05-14T13:20:55.266Z

[tool_use: Bash]

### User | 2026-05-14T13:20:59.669Z

[tool_result] 1	---
2	effort: high
3	maxTurns: 25
4	---
5	
6	# Session Startup Macro
7	
8	You are initializing a PRISM development session. Run through this checklist to establish context, detect issues, and present the work surface. Execute all steps — do not ask questions until the summary is ready.
9	
10	## Step 0: Set Effort to MAX (MANDATORY — user requires max effort always)
11	Tell the user: "Run `/effor
... [+17612 chars truncated]

### User | 2026-05-14T13:21:00.746Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-wiki-from-viz.mjs
4	 *
5	 * Orchestrator: runs every viz→wiki generator in sequence after the
6	 * system-viz graph regenerates. Wire into SessionStart, the system-viz-
7	 * on-commit hook, or invoke via slash command after `/system-viz`.
8	 *
9	 * Generators (run in dependency order):
10	 *   1. generate-layer-wiki.mjs       — 13 per-layer entries
11	 *   2.
... [+6967 chars truncated]

### User | 2026-05-14T13:21:01.067Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+7031 chars truncated]

### User | 2026-05-14T13:21:03.684Z

[tool_result] -rw-r--r-- 1 Mark V 197608 17787 May 13 13:42 checkin.md
-rw-r--r-- 1 Mark V 197608  6185 May 13 22:44 pick-build-close.md
-rw-r--r-- 1 Mark V 197608  8112 May 13 19:14 pick-unit.md
-rw-r--r-- 1 Mark V 197608 13514 May 12 20:55 precompact.md
-rw-r--r-- 1 Mark V 197608 17686 May 12 20:50 startup.md

### Assistant | 2026-05-14T13:21:06.147Z

Let me now read the precompact and handoff files to understand the full lifecycle.

### Assistant | 2026-05-14T13:21:06.565Z

[tool_use: Read]

### Assistant | 2026-05-14T13:21:06.755Z

[tool_use: Read]

### User | 2026-05-14T13:21:08.339Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-14T13:21:10.446Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "precompact"
6	---
7	# Pre-Compact — Session Continuation Handoff
8	
9	> **HOOK COVERAGE (added 2026-04-30):** Pre-compaction handoff is auto-fired by 5 hooks: `auto-precompact-watchdog.mjs` (UserPromptSubmit threshold trigger), `precompact-auto-trigger.mjs`, `compression-precompact.mjs`, `claim-registry-precompact.mjs`, `precompact-dossier.mjs`. *
... [+12575 chars truncated]

### User | 2026-05-14T13:24:57.016Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
# PRISM Awareness, Knowledge, and Internal-AI Surfaces — Comprehensive Map

## 1. Primary Request and Intent

Map PRISM's awareness, knowledge, and internal-AI surfaces relevant to making session-lifecycle commands (startup, checkin, pick-task, pick-unit, precompact, handoff) smarter and self-adjusting. The user requested very thorough search breadth across five specific areas: the Obsidian wiki brain, system-viz query infrastructure, awareness surfaces (BUILD_STATE, MILESTONE_PROGRESS, etc.), internal AI dispatchers, and the highest-leverage missing connections between session-lifecycle commands and these surfaces.

Explicit user constraints: "Report as structured markdown. Do NOT edit anything. Your final message is the only thing returned to me — make it complete and self-contained."

## 2. Key Technical Concepts

- **Karpathy LLM-Wiki pattern** — PRISM adapted the persistent markdown wiki approach (write-once, read-N) rather than RAG-on-every-query. Three layers: raw sources (immutable), wiki markdown (LLM-owned), schema protocol (this doc + CLAUDE.md).
- **21-stage wiki orchestrator** — `regen-wiki-from-viz.mjs` runs post-commit on every graph change: layer-wiki → domain-wiki → dispatcher-wiki → engine/action/registry/frontend/milestone/monolith/skill/hook/formula/tribal → crosslink injection → leaf-index build → embeddings → orphan lint → coverage audit. Fingerprint-gated for efficiency (skip if no graph change). Total runtime ~8min on 150K-node graph.
- **Multi-chat fleet coordination** (6 concurrent Claude sessions + 1 hygiene slot) — File-claim locking, per-agent handoffs with stable session IDs, per-chat slot assignment (alpha/bravo/charlie/delta/echo/foxtrot), per-topic branching so same session across branches gets separate handoff files.
- **Awareness backbone** — Three always-current disk file
... [+57655 chars truncated]

### Assistant | 2026-05-14T13:26:30.704Z

I'll now deliver the comprehensive structured markdown report synthesizing the five user mapping requests and the missing connections analysis.

---

# PRISM Awareness, Knowledge, and Internal-AI Surfaces — Comprehensive Map

## PART 1: THE OBSIDIAN BRAIN — `H:/prism/knowledge/wiki/`

### Directory Structure and Control Files

```
H:/prism/knowledge/wiki/
├── index.md                          # 776-entry content catalog (append-on-event, NOT regenerated)
├── index.jsonl                       # JSONL form of index.md
├── log.md                            # Append-only chronological audit trail
├── architecture/                      # Auto-generated wiki tree (19,364 files)
│   ├── _stats.md                     # Authoritative count: 23,790 total entries
│   ├── _leaf-index.jsonl             # 13,700+ architecture leaf entries (BM25 fallback)
│   ├── _embeddings.jsonl             # int8 nomic-embed-text vectors (768-d, 14,343 entries)
│   ├── _skill-triggers.jsonl         # Per-skill trigger patterns
│   ├── _orphans-rescue.md            # Every orphan gets inbound link (effective orphan rate ≈ 0%)
│   ├── actions/                      # 9,242 per-action entries
│   ├── algorithms/                   # 53 novel formula entries
│   ├── dispatcher-*.md               # 97 per-dispatcher entries
│   ├── domain-*.md                   # 38+ per-engine-domain entries
│   ├── engines/                      # 1,702 per-engine entries
│   ├── formulas/                     # 80 per-formula entries
│   ├── hooks/                        # 516 per-hook entries
│   ├── jmdie/                        # Customer/machine/product entries
│   ├── layer-l*.md                   # 13 per-layer overviews
│   ├── milestones/                   # Per-milestone progress snapshots
│   ├── skills/                       # 667 per-skill entries
│   ├── tribal/                       # 73 per-tribal-category index pages
│   ├── tribal-corpus-index.md        # 4,245 tribal tips indexed
│   ├── tests-index
... [+24677 chars truncated]
