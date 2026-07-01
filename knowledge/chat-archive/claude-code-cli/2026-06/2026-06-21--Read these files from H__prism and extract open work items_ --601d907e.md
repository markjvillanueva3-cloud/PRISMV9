---
type: "chat-session"
source: "claude-code-cli"
session_id: "601d907e-af1c-4dab-9ccd-c1df191ab9d2"
title: "Read these files from H:/prism and extract open work items: 1. H:/prism/state/sh"
date: "2026-06-21"
first_ts: "2026-06-21T02:39:34.707Z"
last_ts: "2026-06-21T02:42:03.502Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/601d907e-af1c-4dab-9ccd-c1df191ab9d2/subagents/agent-a7853f32cbab0afba.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Read these files from H:/prism and extract open work items: 1. H:/prism/state/sh

> **claude-code-cli** | 2026-06-21 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/601d907e-af1c-4dab-9ccd-c1df191ab9d2/subagents/agent-a7853f32cbab0afba.jsonl`

## Transcript

### User | 2026-06-21T02:39:34.707Z

Read these files from H:/prism and extract open work items:

1. H:/prism/state/shared/RECENT-REGRESSIONS-ARCHIVE.md - extract all entries with explicit "P2 follow-up", "next-unit", "pending", "failing-test", "tsc debt" or similar open debt markers
2. H:/prism/state/shared/specs/ZULU-MASTER-CONTEXT-LEDGER-2026-06-11.md - read the TOP section first (trust the "2026-06-20 RECONCILE UPDATE" header), extract all open/pending tasks. If large, read first 400 lines.
3. H:/prism/state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md - read fully, extract all open tasks

For each file report: task/unit id, title, status (open/pending/blocked), any dependencies noted.

Also check H:/prism/CLAUDE.md "## Recent regressions" section for P2 follow-ups, next-units, pending items. Use Grep to find these markers:
- grep for "P2 follow-up" in H:/prism/CLAUDE.md
- grep for "next-unit" in H:/prism/CLAUDE.md  
- grep for "pending" near "## Recent regressions" section

Be exhaustive.

### Assistant | 2026-06-21T02:39:38.153Z

I'll read all the specified files and grep for open work items systematically. Let me do this in parallel.

### Assistant | 2026-06-21T02:39:38.539Z

[tool_use: Read]

### Assistant | 2026-06-21T02:39:39.324Z

[tool_use: Read]

### Assistant | 2026-06-21T02:39:40.389Z

[tool_use: Grep]

### User | 2026-06-21T02:39:43.479Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-105 of 207 total (28949 tokens, cap 25000). Call Read with offset=106 limit=105 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# CLAUDE.md Recent-regressions archive
2	> Externalized from CLAUDE.md by slim-claude-md-injection.mjs (U-
... [+46031 chars truncated]

### User | 2026-06-21T02:39:44.286Z

[tool_result] 1	# ZULU MASTER CONTEXT LEDGER -- 2026-06-11
2	
3	Executive summary: This ledger merges three miner passes (Miner 1 returned 61 classified items from zulu/india/sierra/tango/bravo/alpha session threads + git log since 2026-06-01; Miners 2 and 3 returned nothing, so the article and milestone/memory passes are empty and folded into the relevant sections from CLAUDE.md context). After dedup the open 
... [+37945 chars truncated]

### User | 2026-06-21T02:39:44.750Z

[tool_result] 19-| `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md` | JM Die paths, AI capability inventory, multi-agent patterns. |
20-| `state/shared/PRISM_SHARED_INDEX_SURFACES.md` | Shared indexes for cross-agent search-first discipline. |
21:| `state/shared/MILESTONE_PROGRESS.md` / `.json` | **Generated** delta of milestone-envelope `status` vs git-log reality. Shows shipped/pending per unit, flags drift (
... [+3266 chars truncated]

### Assistant | 2026-06-21T02:39:49.526Z

Now let me read the remaining files and get the BRAVO ledger plus the rest of the regressions archive:

### Assistant | 2026-06-21T02:39:50.671Z

[tool_use: Glob]

### Assistant | 2026-06-21T02:39:51.435Z

[tool_use: Read]

### Assistant | 2026-06-21T02:39:52.836Z

[tool_use: Grep]

### User | 2026-06-21T02:39:54.508Z

[tool_result] 106	- 2026-06-15 | **[MAIN-FORCE] [HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C2-HERMETIC (slot:zulu): fix scrutiny arm-B P1 -- C2 round-trip test was non-hermet...** | observed-in: 295d8ffde | fix: see commit | verify: `git -C H:/prism show 295d8ffde`
107	
108	- 2026-06-15 | **slot-commit-enforce honors PreToolUse input.cwd** | observed-in: 887b7096a | fix: see commit | verify: `git -C H:/prism show
... [+12299 chars truncated]

### User | 2026-06-21T02:39:55.798Z

[tool_result] 21:| `state/shared/MILESTONE_PROGRESS.md` / `.json` | **Generated** delta of milestone-envelope `status` vs git-log reality. Shows shipped/pending per unit, flags drift (envelope says `not_started` but units already shipped). Audit chats: subtract `shipped` here from your gap lists before flagging missing. Regenerate via `node scripts/build-milestone-progress.mjs`. |
296:[Omitted long matching lin
... [+668 chars truncated]

### User | 2026-06-21T02:40:00.490Z

[tool_result] state\shared\specs\BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md

### Assistant | 2026-06-21T02:40:03.193Z

Now let me read the BRAVO ledger file:

### Assistant | 2026-06-21T02:40:03.455Z

[tool_use: Read]

### User | 2026-06-21T02:40:06.918Z

[tool_result] 1	# BRAVO / HERMES-ZULU — Domain Open-Tasks Ledger (curated, ROI-ordered)
2	
3	> **Canonical single-read context-regain surface for the bravo (hermes-zulu) galaxy.**
4	> Curated by a human-in-the-loop chat — DISTINCT from the two auto/narrative surfaces:
5	> - `state/shared/handoffs/consolidated/bravo.md` — auto-generated raw thread feed (40 threads,
6	>   mostly peer-drift + `L8-P*-MS2 / 759ms 37
... [+12741 chars truncated]

### Assistant | 2026-06-21T02:42:03.502Z

Here is the exhaustive extraction of all open work items across all three files and the CLAUDE.md regression section.

---

## 1. RECENT-REGRESSIONS-ARCHIVE.md — Open Debt Markers

### P2 / Follow-up items explicitly flagged

**From regression 2026-06-10 (SFC radial_depth / hex_mm):**
- **P2-OSCAR-1**: Negative explicit `radial_depth_mm` → engine produces NaN (pre-existing, not fixed in the 69146aa9c1 commit)
- **P2-OSCAR-2**: `max(1,Dc)` sub-mm immersion floor missing (pre-existing)
- Source: entry for `69146aa9c1`

**From regression 2026-06-10 (tribal brain CLOBBER #4):**
- **U-TRIBAL-SIBLING-WRITER-SHARD-SAFE**: 3 sibling embedders (`embed-engines`, `embed-knowledge-store`, `embed-cited-tips`) still use the old monolith-only write path. Named follow-up unit: route ALL writers through `loadTribalIndex`+`writeTribalIndex`
- Status: explicitly named next-unit, open
- Source: entry for `8bf1873577`

**From regression 2026-06-10 (`stop_on_unwired_assets` array dispatch fix):**
- **Pre-existing P2**: `objKeyRe` `name:value` pattern over-matches a TypeScript interface field → can clear a real orphan; Pattern-3 hardening follow-up needed
- Status: logged, not fixed
- Source: entry for the array-dispatch fix commit

**From regression 2026-06-08 (tribal index V8 string cap):**
- **KNOWN-REMAINING**: The WRITE side (`JSON.stringify` of a >cap object) also throws → appending entries needs index **sharding** (explicitly noted as next unit)
- Status: open (though the shard read guard was fixed in 8bf1873577; the sibling writers above are the outstanding path)
- Source: entry for `182788232a`

**From regression 2026-06-10 (Stop-hook handoff-append full-uuid key mismatch):**
- **Scoped follow-up**: `stop-force-loop-continue.mjs::findHandoff` had the identical `f.includes(sid)` full-uuid bug — flagged as "scoped follow-up, not fixed here." (Note: a later regression entry `9821bebb8` corrects a stale note about this, but verify actual fix status independently)
- Source: entry for 
... [+11827 chars truncated]
