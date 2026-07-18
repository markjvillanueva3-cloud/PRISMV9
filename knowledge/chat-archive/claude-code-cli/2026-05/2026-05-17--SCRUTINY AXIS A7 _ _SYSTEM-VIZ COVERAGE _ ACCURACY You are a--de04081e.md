---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "SCRUTINY AXIS A7 — /SYSTEM-VIZ COVERAGE + ACCURACY You are agent 7 of 10 in juli"
date: "2026-05-17"
first_ts: "2026-05-17T04:26:25.373Z"
last_ts: "2026-05-17T04:30:06.229Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 16
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a455f7ff90246410e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SCRUTINY AXIS A7 — /SYSTEM-VIZ COVERAGE + ACCURACY You are agent 7 of 10 in juli

> **claude-code-cli** | 2026-05-17 | 35 msgs (16 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a455f7ff90246410e.jsonl`

## Transcript

### User | 2026-05-17T04:26:25.373Z

SCRUTINY AXIS A7 — /SYSTEM-VIZ COVERAGE + ACCURACY

You are agent 7 of 10 in juliett's `/forge7` scrutiny pass. Your axis: /system-viz graph — completeness, accuracy, query API.

CONTEXT: User EXPLICITLY said in current turn: "/system-viz was updated so utilize it". 372K-node graph with known issues:
- Utilization classifier degenerate (0 orphans across 372K nodes — false; reality 1,348 wired engines lack wiki entries)
- BUILD_STATE says 836 unwired engines but validate-unwired-signal shows ≥50% false-positive rate
- SYSTEM-VIZ-FS-COVERAGE-MS1 fixed truncation + cron re-walk + drift detector
- AAM04 hook-wiring auditor was 12/14 false-positives

YOUR JOB: scrutinize the updated /system-viz for coverage gaps + accuracy bugs.

EVIDENCE SOURCES:
1. `H:/prism/scripts/system-viz-query.mjs` — query API
2. `state/shared/system-viz/system-graph.json` — read METADATA only (huge file)
3. `state/shared/CLAUDE-BRIEF.md` — auto-generated headline numbers
4. `state/shared/BUILD_STATE.md` + `BUILD_STATE.json`
5. `state/shared/AWARENESS-SNAPSHOT.md`
6. Generators in `scripts/`: `regen-viz.mjs`, `augment-graph-with-awareness.mjs`, `merge-augmentations.mjs`, `generate-misc-tasks-features.mjs`, `generate-bridge-synergy-features.mjs`, `generate-priority-queue-features.mjs`
7. Recent commits touching system-viz: `git -C H:/prism log --oneline -20 -- scripts/system-viz*.mjs scripts/regen-viz.mjs`

LOOK FOR:
- What was recently added to /system-viz? (PRIORITY-QUEUE-MS0 ghost.priority_queue roost, ghost.bridge_synergy, ghost.misc_tasks, ghost.unwired-engine)
- Coverage gaps: are knowledge/memories/ entries in the graph? wiki entries? skills? hooks?
- L8 has 21,774 nodes — what kind? (per kind ONLY not layer per DSL-MS0)
- Classifier degenerate bug — is it fixed? (Recent regression entry: "fix classifier in scripts/augment-graph-with-awareness.mjs")
- Edge directionality: 591,479 edges — any "wires-to" edges where target doesn't exist?
- Drift detector: state/shared/system-viz-drift-history
... [+824 chars truncated]

### Assistant | 2026-05-17T04:26:34.139Z

I'll scrutinize the /system-viz graph for coverage gaps and accuracy bugs.

### Assistant | 2026-05-17T04:26:36.081Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:26:37.297Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:26:38.504Z

[tool_use: Bash]

### User | 2026-05-17T04:26:47.308Z

[tool_result] 4ccd92177c [MAIN] [SYSTEM-VIZ-UPGRADES-MS0]/U-FOLD-DEFAULT: auditable newly-built fold-debt (NOT flip default)
f24cc1fabc [MAIN] [PRIORITY-QUEUE-MS0]/juliett: master color-coded pickup queue + helper API
8ad069c0bd [MAIN] [ROADMAP-CONSOLIDATION]/juliett: register consolidate-roadmaps.mjs in regen-viz FAST[]
1cedde159f [MAIN] [ROADMAP-CONSOLIDATION]/juliett: unify all roadmaps -> 5826-item consolid
... [+1964 chars truncated]

### User | 2026-05-17T04:26:59.409Z

[tool_result] -rw-r--r-- 1 wompu 197611   3274 May 16 20:36 state/shared/AWARENESS-SNAPSHOT.md
-rw-r--r-- 1 wompu 197611 234031 May 16 21:26 state/shared/BUILD_STATE.json
-rw-r--r-- 1 wompu 197611  16487 May 16 18:49 state/shared/CLAUDE-BRIEF.md

### User | 2026-05-17T04:27:00.116Z

[tool_result] total 1576666
drwxr-xr-x 1 wompu 197611         0 May 16 22:45 ./
drwxr-xr-x 1 wompu 197611         0 May 16 23:26 ../
-rw-r--r-- 1 wompu 197611        82 May 16 16:52 .newly-built-fold-debt.json
-rw-r--r-- 1 wompu 197611    974854 May 13 19:50 .test-wiki-mtimes.json
-rw-r--r-- 1 wompu 197611       222 May 16 22:45 DRIFT_REPORT.json
-rw-r--r-- 1 wompu 197611      8866 May 16 22:43 EXECUTIVE-BRIEFI
... [+1774 chars truncated]

### Assistant | 2026-05-17T04:27:03.925Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:27:11.192Z

[tool_use: Bash]

### User | 2026-05-17T04:27:14.834Z

[tool_result] size: 331.0MB mtime: 2026-05-17T03:45:12.419Z

### Assistant | 2026-05-17T04:27:17.184Z

[tool_use: Read]

### User | 2026-05-17T04:27:29.245Z

[tool_result] {"schemaVersion":"2.29.0","generatedAt":"2026-05-16T21:52:06.173Z","meta":{"counts":{"engines":3259,"dispatchers":97,"actions":7715,"algorithms":53,"registries":27,"tests":3693,"srcHooks":54,"claudeHooks":607,"scripts":855,"slashLocal":220,"slashUser":394,"formulas":499},"headline":{"built":2421,"unwired":836,"pendingFE":2,"drift":11,"wikiEntries":23981},"dispatcherCatCount":{"manufacturing":29,"a
... [+3600 chars truncated]

### User | 2026-05-17T04:27:32.645Z

[tool_result] 1	# CLAUDE-BRIEF — PRISM Continuous Awareness
2	
3	**Auto-generated:** 2026-05-16T00:39:25.197Z  ·  Regenerated each SessionStart by `generate-claude-brief.mjs`.
4	If timestamp >24h old, run: `node H:/prism/mcp-server/scripts/generate-claude-brief.mjs`
5	
6	---
7	
8	## What PRISM is
9	
10	Manufacturing-intelligence platform Mark is building. Speed/Feed Calculator (SFC) + Master Post are the two sa
... [+8577 chars truncated]

### Assistant | 2026-05-17T04:27:35.439Z

Acknowledged. Continuing with read-only scrutiny of /system-viz surface; not introducing new manual workflows.

### Assistant | 2026-05-17T04:27:36.533Z

[tool_use: Read]

### Assistant | 2026-05-17T04:27:37.560Z

[tool_use: Read]

### User | 2026-05-17T04:27:38.424Z

[tool_result] 1	# PRISM Awareness Snapshot
2	
3	> Generated **2026-05-17T01:36:39.865Z** · graph mtime 2026-05-16T21:52:14.494Z
4	> One-shot session warmup: built/wired/utilized/drifted in 60 lines.
5	> Regenerate: `node scripts/awareness-snapshot.mjs` · or via `/awareness-snapshot` skill.
6	
7	## Headline (from BUILD_STATE)
8	- **2421** engines built · **1073** with wiki entry
9	- **836** engines on disk with 
... [+2999 chars truncated]

### Assistant | 2026-05-17T04:27:39.461Z

[tool_use: Bash]

### User | 2026-05-17T04:27:39.905Z

[tool_result] 1	{
2	  "generatedAt": "2026-05-17T03:45:55.591Z",
3	  "graphPath": "H:\\prism\\state\\shared\\system-viz\\system-graph.json",
4	  "total": 0,
5	  "byCategory": {},
6	  "namespaces": [],
7	  "summary": "no fsCoverage entries in graph"
8	}

### User | 2026-05-17T04:27:53.044Z

[tool_result] augment-graph-with-awareness.mjs*
augment-molecules.mjs*
build-system-viz-livediff.mjs*
detect-system-viz-drift.mjs*
detect-system-viz-drift.test.mjs*
expand-system-viz-l12-files.mjs*
expand-system-viz-l12-files.test.mjs
generate-system-viz.mjs*
install-system-viz-git-hook.mjs*
merge-augmentations.mjs*
regen-viz.mjs*
system-viz-action-overlay.mjs*
system-viz-add-node.mjs*
system-viz-ghost-report.m
... [+193 chars truncated]

### Assistant | 2026-05-17T04:27:59.800Z

Acknowledged. Skipping re-reads; will use existing knowledge plus the freshly-read DRIFT_REPORT to finalize findings.

### Assistant | 2026-05-17T04:28:01.425Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:28:02.533Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:28:04.039Z

[tool_use: Bash]

### User | 2026-05-17T04:28:12.703Z

[tool_result] usage: system-viz-query <roadmap-candidates|build-order|blast-radius|dispatcher-summary|coverage-by-domain|worktrees|find|headline> [params] [--json]

### User | 2026-05-17T04:28:26.621Z

[tool_result] 1778989557 state/shared/system-viz/DRIFT_REPORT.json
1778989512 state/shared/system-viz/system-graph.json
1778989410 state/shared/system-viz/obsidian-augmentation.json
1778989410 state/shared/system-viz/EXECUTIVE-BRIEFING.json
1778989375 state/shared/system-viz/engine-classification-repair-log.json
1778989342 state/shared/system-viz/l11-leaves-augmentation.json
1778989340 state/shared/system-viz/f
... [+574 chars truncated]

### User | 2026-05-17T04:28:36.216Z

[tool_result] state/shared/system-viz/bridge-synergy-augmentation.json
state/shared/system-viz/core-inventory-augmentation.json
state/shared/system-viz/galaxy-constituents-augmentation.json
state/shared/system-viz/git-tree-augmentation.json
state/shared/system-viz/h-drive-census.json
state/shared/system-viz/misc-tasks-augmentation.json
state/shared/system-viz/molecules-augmentation.json
state/shared/system-viz/
... [+388 chars truncated]

### Assistant | 2026-05-17T04:28:40.101Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:28:41.813Z

[tool_use: Bash]

### User | 2026-05-17T04:28:50.626Z

[tool_result] PRISM headline (2026-05-16T21:52:06.173Z):
  engines:      3,259  (built 2421 / unwired 836 = 74% wired)
  dispatchers:  97
  actions:      7,715
  tests:        3,693
  formulas:     499
  wiki:         23981
  pending FE:   2
  drift:        11
  worktrees:    45 (KEEP 24 / MERGE 2 / PRUNE 10 / INVESTIGATE 9)
  graph:        145440n / 700547e / 11 layers
---FIND-test---
Found 3 node(s) matching 
... [+286 chars truncated]

### User | 2026-05-17T04:28:58.849Z

[tool_result]   336 scripts/detect-system-viz-drift.mjs
  300 scripts/augment-graph-with-awareness.mjs
  636 total
---DRIFT-EXIT-CODE---
System-Viz Drift Report — generated 2026-05-17T04:28:54.878Z
  total: 0 namespaces
  summary: no fsCoverage entries in graph

  category        count
  ----------------------------

  report written → H:\prism\state\shared\system-viz\DRIFT_REPORT.json
exit=0

### Assistant | 2026-05-17T04:29:10.296Z

[tool_use: Bash]

### User | 2026-05-17T04:29:17.780Z

[tool_result] schemaVersion: 2.29.0
nodes len: 145440  edges len: 700547
byKind: [
  [ 'unknown', 108459 ],
  [ 'wiki_entry', 19719 ],
  [ 'dispatcher_router', 6717 ],
  [ 'planned-unit', 3833 ],
  [ 'priority-unit', 3588 ],
  [ 'engine', 1909 ],
  [ 'milestone', 541 ],
  [ 'misc-task', 318 ],
  [ 'combo', 183 ],
  [ 'design-spec', 53 ],
  [ 'bridge-unit', 42 ],
  [ 'novel_formula', 36 ],
  [ 'tier3_specialist'
... [+1456 chars truncated]

### Assistant | 2026-05-17T04:30:06.229Z

I have enough evidence. Returning findings.

## A7 — SYSTEM-VIZ COVERAGE FINDINGS

### F1: Graph headline TRIPLE-DRIFTED across surfaces (3 numbers, 0 truth)
- Evidence: graph `meta.headline` 145,440n/700,547e (live read); CLAUDE-BRIEF.md line 27 says **372,731n/591,479 edges** (graph generated 2026-05-15); awareness-snapshot.md says **64,161 of 72,451 scanned**. Three different node totals for the same /system-viz.
- Impact: every chat that reads `CLAUDE-BRIEF.md` at SessionStart works off **2.5x inflated node count** + stale-by-2-days generation timestamp. Roadmap-pick decisions, "what's in scope" reasoning, and orphan-rate %s all wrong.
- Recommendation: gate `generate-claude-brief.mjs` on `system-graph.json` mtime + ALWAYS re-read headline from current graph (not a cached prior run).
- Priority: **P0**

### F2: `built` / `stub` / `unwired` classifier IS DEAD CODE in current graph schema 2.29.0
- Evidence: 145,440/145,440 nodes resolve to `builtCounts.other` (0 built, 0 stub, 0 unwired) when iterating `n.built` or `n.meta.built`. Yet awareness-snapshot prints "27,333 hubs / 12,129 orphans / 823 ghosts" — those classifications come from a *different* code path (`augment-graph-with-awareness.mjs` writes a sibling overlay, never merged back into node fields).
- Impact: `meta.headline.built=2421 / unwired=836` in the graph is computed only from L5 engine-node subset; the 836 unwired figure cannot be cross-validated by any query. The Recent Regression "classifier degenerate" entry IS NOT FIXED — it's the same root: classifier writes sibling overlay, node fields stay null.
- Recommendation: fold awareness overlay back into `n.classification = {built, util, role}` during `merge-augmentations.mjs`; expose `system-viz-query classify --kind engine --status unwired` so signal becomes queryable.
- Priority: **P0**

### F3: `kind:"unknown"` is 74.6% of all nodes (108,459 / 145,440)
- Evidence: live kind histogram — `unknown:108459` dwarfs `wiki_entry:19719` and `engine:1909`.
... [+4196 chars truncated]
