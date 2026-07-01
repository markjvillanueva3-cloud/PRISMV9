---
type: "chat-session"
source: "claude-code-cli"
session_id: "2c3adfc7-d056-43fd-9301-bf5fa366ceb8"
title: "Enumerate PRISM slash-command SKILLS relevant to the \"discovery\" domain (algorit"
date: "2026-05-29"
first_ts: "2026-05-29T13:34:12.698Z"
last_ts: "2026-05-29T13:36:08.209Z"
cwd: "H:\\prism-slot-tango"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-tango/2c3adfc7-d056-43fd-9301-bf5fa366ceb8/subagents/agent-a462d38ff9f954276.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:12"
---

# Enumerate PRISM slash-command SKILLS relevant to the "discovery" domain (algorit

> **claude-code-cli** | 2026-05-29 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/2c3adfc7-d056-43fd-9301-bf5fa366ceb8/subagents/agent-a462d38ff9f954276.jsonl`

## Transcript

### User | 2026-05-29T13:34:12.698Z

Enumerate PRISM slash-command SKILLS relevant to the "discovery" domain (algorithm/engine/pipeline discovery, anti-duplication, audit/coverage, orphan/unwired inventory, master-index search-first). MCP server is DOWN — use Glob/Grep/Read only. Work in shared tree H:/prism.

Glob both H:/prism/.claude/commands/*.md AND C:/Users/wompu/.claude/commands/*.md. Filter to skills whose name OR description matches keywords: dedup, duplicat, discovery, engine-digest, dispatcher-coverage, coverage-by-domain, audit, orphan, unwired, wire-unwired, master-index, capabilities, awareness, scout, deep-search, find, navigate, registry-browse, engine-browse, action-search, code-index, scrutinize, close-out-audit, stale-milestones, envelope-drift.

For each matching skill report: skill-name | 1-line description (read the frontmatter `description:` field or first heading). Group by relevance: "## Core discovery skills" (the ones tango would invoke daily — dedup, master-index, find, orphan-inventory, audit-* etc.) then "## Adjacent skills". ≤30 total. Compact, no preamble. This feeds a galaxy TOOLBELT.md.

### Assistant | 2026-05-29T13:34:26.944Z

I'll enumerate the discovery-domain skills. Let me glob both command directories and read the relevant frontmatter.

### Assistant | 2026-05-29T13:34:27.378Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:34:29.059Z

[tool_use: Glob]

### User | 2026-05-29T13:34:43.464Z

[tool_result] H:/prism/.claude/commands\ingest.md
H:/prism/.claude/commands\vendor.md
H:/prism/.claude/commands\prints.md
H:/prism/.claude/commands\tooling.md
H:/prism/.claude/commands\process-docs.md
H:/prism/.claude/commands\material-stock.md
H:/prism/.claude/commands\my-shop.md
H:/prism/.claude/commands\erp-health.md
H:/prism/.claude/commands\self-improve.md
H:/prism/.claude/commands\advisor-strategy.md
H:/p
... [+3860 chars truncated]

### User | 2026-05-29T13:34:44.205Z

[tool_result] C:\Users\wompu\.claude\commands\template.md
C:\Users\wompu\.claude\commands\wedm-ai-advisor.md
C:\Users\wompu\.claude\commands\wedm-batch.md
C:\Users\wompu\.claude\commands\wedm-compare.md
C:\Users\wompu\.claude\commands\wedm-controller.md
C:\Users\wompu\.claude\commands\wedm-cost.md
C:\Users\wompu\.claude\commands\wedm-feasibility.md
C:\Users\wompu\.claude\commands\wedm-hook-disable.md
C:\Users\w
... [+4563 chars truncated]

### Assistant | 2026-05-29T13:34:52.897Z

The globs are truncated. Let me use Grep against the discovery-relevant skill files directly to read their `description:` frontmatter. I'll target the specific filenames I know match the keywords from the available-skills list.

### Assistant | 2026-05-29T13:34:56.974Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:34:59.436Z

[tool_use: Grep]

### User | 2026-05-29T13:35:06.759Z

[tool_result] H:\prism\.claude\commands\awareness-snapshot.md:description: One-shot PRISM awareness snapshot — built/wired/utilized/drifted in 60 lines. Regenerates state/shared/AWARENESS-SNAPSHOT.md by orchestrating BUILD_STATE + MILESTONE_PROGRESS + system-graph utilization classifier. Cron-able session warmup.
H:\prism\.claude\commands\close-out-audit.md:description: Audit roadmap envelopes for units whose d
... [+2950 chars truncated]

### User | 2026-05-29T13:35:08.345Z

[tool_result] C:\Users\wompu\.claude\commands\action-search.md:description: Action Search — Dispatcher Action Discovery
C:\Users\wompu\.claude\commands\awareness-check.md:description: Run awareness score check with per-dimension breakdown
C:\Users\wompu\.claude\commands\aware.md:description: /aware — Phase 0.13 Situational Awareness Query
C:\Users\wompu\.claude\commands\capability-manifest.md:description: /capa
... [+3314 chars truncated]

### Assistant | 2026-05-29T13:35:12.410Z

I have descriptions for nearly all matches. A few discovery-relevant skills lacked a `description:` frontmatter line (e.g. `scout`, `digest`). Let me grab those plus check a couple more that appeared in the skills list without descriptions.

### Assistant | 2026-05-29T13:35:14.444Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:35:14.878Z

[tool_use: Read]

### User | 2026-05-29T13:35:19.140Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-tango.

### User | 2026-05-29T13:35:20.080Z

[tool_result] H:\prism\.claude\commands\wiring-batch.md:description: Propose a wire-batch plan from the unwired-engine backlog — pick a domain, get top-N engines + suggested dispatcher + action-name draft

### Assistant | 2026-05-29T13:35:26.237Z

The MCP server is down per the task, so I'll continue with file-based discovery. `scout` doesn't exist as a file in H:; it was in the skills list, likely C: only. I have enough coverage now. Let me confirm `scout` location and grab `digest` (H: side had no description match earlier).

### Assistant | 2026-05-29T13:35:27.202Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:35:27.908Z

[tool_use: Glob]

### User | 2026-05-29T13:35:31.550Z

[tool_result] C:\Users\wompu\.claude\commands\scout.md

### User | 2026-05-29T13:35:32.755Z

[tool_result] C:\Users\wompu\.claude\commands\navigate.md
C:\Users\wompu\.claude\commands\find.md
C:\Users\wompu\.claude\commands\scout.md

### Assistant | 2026-05-29T13:35:37.722Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:35:37.723Z

[tool_use: Read]

### User | 2026-05-29T13:35:43.874Z

[tool_result] No matches found

### User | 2026-05-29T13:35:46.851Z

[tool_result] 1	---
2	effort: medium
3	maxTurns: 15
4	disallowedTools:
5	  - Edit
6	composes_with:
7	  - "/forge-from-scout"
8	---
9	# Scout — Discover New MCP Servers, Plugins, Tools & Claude Features
10	
11	Scans public sources for new capabilities that PRISM should integrate. Adds findings to a prioritized build queue. Run periodically (weekly) or on-demand.
12	

### Assistant | 2026-05-29T13:36:08.209Z

`scout` is more about external capability discovery than internal PRISM discovery — it's adjacent at best. I have full coverage now. Here is the enumerated toolbelt.

## Core discovery skills
- **dedup** | Check for duplicates before creating new engines, hooks, skills, or actions (the mandatory pre-create gate).
- **master-index** | Unified search across system-viz graph + Obsidian vault + capability index + BUILD_STATE; use INSTEAD OF Grep/Glob/Agent for "where is X / what handles Y / is Z built/wired/utilized".
- **find** | Single-shot symbol/file resolver via the /system-viz graph (master-index BM25 + node-status); replaces the Glob→Grep→Read chain for "where is X?".
- **deep-search** | Search-first then deep-reason fallback — runs master_index_query, escalates to model reasoning only when top hits fall below the confidence floor.
- **navigate** | Find any PRISM component instantly.
- **orphan-inventory** | Built-but-unwired audit punch list — system-graph orphans grouped by suggested dispatcher + layer → ORPHAN-INVENTORY.md.
- **unwired-review** | Structured unwired-engine triage.
- **wire-unwired** | Orchestrates the full wiring sprint: dispatcher-coverage → forge-wiring → wiring-batch → unwired-review.
- **dispatcher-coverage** | Pivot ENGINE_WIRING_INDEX on the dispatcher axis — engines/actions per dispatcher, orphan rate, consolidation candidates.
- **coverage-by-domain** | Per-domain wired/unwired coverage (Lathe/Mill/WEDM/etc.) — which domains lag on dispatcher wiring.
- **utilization-dashboard** | Graph-wide classifier bucketing every node into hub/sink/source/orphan/ghost; surfaces built-but-unwired + dead code.
- **audit-duplicates** | Retroactive duplicate-surface detector (post-hoc dedup sweep).
- **close-out-audit** | Audit roadmap envelopes for shipped-on-disk-but-pending units (silent close-out debt); advisory, human-verify.
- **awareness-snapshot** | One-shot built/wired/utilized/drifted snapshot in 60 lines (BUILD_STATE + MILESTONE_PROGRESS + ut
... [+1679 chars truncated]
