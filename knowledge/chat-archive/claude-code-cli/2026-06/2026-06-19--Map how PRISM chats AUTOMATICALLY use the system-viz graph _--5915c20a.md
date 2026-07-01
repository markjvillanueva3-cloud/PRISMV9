---
type: "chat-session"
source: "claude-code-cli"
session_id: "5915c20a-a517-4e95-bc12-edf7d9055431"
title: "Map how PRISM chats AUTOMATICALLY use the system-viz graph (system-graph.json, ~"
date: "2026-06-19"
first_ts: "2026-06-19T16:15:45.039Z"
last_ts: "2026-06-19T16:20:09.235Z"
cwd: "H:\\prism"
messages: 73
user_msgs: 32
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/5915c20a-a517-4e95-bc12-edf7d9055431/subagents/agent-ad3d611940a3c7c68.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Map how PRISM chats AUTOMATICALLY use the system-viz graph (system-graph.json, ~

> **claude-code-cli** | 2026-06-19 | 73 msgs (32 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5915c20a-a517-4e95-bc12-edf7d9055431/subagents/agent-ad3d611940a3c7c68.jsonl`

## Transcript

### User | 2026-06-19T16:15:45.039Z

Map how PRISM chats AUTOMATICALLY use the system-viz graph (system-graph.json, ~110K-node fleet search substrate) so I can find concrete ENHANCEMENTS that make chats auto-use it more effectively. Read-only reconnaissance; report findings with file:line citations. Be thorough but concise.

THE GRAPH + SIDECARS (confirm paths/sizes):
- H:/prism/state/shared/system-viz/ (and/or scripts output) — system-graph.json (the big graph), find-cache.json, system-graph-index.json, node-cards.jsonl + node-card-offsets.json.
- Query CLI: scripts/system-viz-query.mjs (actions: find, node-card, ...). Shared lib: scripts/lib/master-index-search-lib.mjs, scripts/lib/node-card-{read,schema,offset-lib}.mjs.

AUTO-INJECTION HOOKS (the surfaces that push graph context into chats WITHOUT a tool call) -- find ALL of them in .claude/hooks/ and report what each injects + when:
- master-index-precheck-inject.mjs (top-K hits per UserPromptSubmit)
- pre-read-graph-inject.mjs / pre-grep-graph-inject.mjs / pre-write-graph-inject.mjs (top-3 hits before Read/Grep/Write)
- node-card-prefetch-inject.mjs (injects node CARDS for node-ids detected in a prompt)
- audit-viz-first-inject.mjs (runs system-viz-query find before Grep/Glob)
- any others (grep .claude/hooks for: system-graph, master-index-search, master_index_query, find-cache, node-card, system-viz-query).

FOR EACH auto-usage surface, capture:
1. WHAT it injects (names only? node cards? doc pointers?) and the K/limit.
2. HOW it matches/ranks (lexical token overlap? embeddings? exact-id? what lib fn).
3. KNOWN WEAKNESSES visible in code/comments (e.g. weak lexical matching, no relevance threshold so it injects noise, no dedup, stale sidecar, missing trigger patterns, only names so the model still needs a follow-up tool call).
4. Whether there's any TAKE-RATE / effectiveness measurement (does anything record whether the chat actually ACTED on the injected hit? grep for take-rate / takeup / adoption around these).

THEN synthesize a RANKED list o
... [+569 chars truncated]

### Assistant | 2026-06-19T16:15:50.138Z

I'll systematically explore the codebase to map how PRISM chats auto-use the system-viz graph. Let me start with parallel reconnaissance.

### Assistant | 2026-06-19T16:15:51.287Z

[tool_use: Bash]

### Assistant | 2026-06-19T16:15:52.076Z

[tool_use: Bash]

### Assistant | 2026-06-19T16:15:52.122Z

[tool_use: Glob]

### User | 2026-06-19T16:15:53.991Z

[tool_result] scripts\system-viz-query.mjs

### User | 2026-06-19T16:15:55.958Z

[tool_result] DRIFT_REPORT.json
EXECUTIVE-BRIEFING.json
EXECUTIVE-BRIEFING.md
LEVERAGE-WIRING-QUEUE.json
LEVERAGE-WIRING-QUEUE.md
WIKI-COVERAGE-AUDIT.json
WIKI-COVERAGE-AUDIT.md
WIKI-DEBT-WORKLIST.md
_merge.log
_node-embeddings.jsonl.partial
_server.cjs*
_server.err.log
_server.log
_server.out.log
action-engine-edges-augmentation.json
actions-atomic-augmentation.json
agent-findings/
agent-findings-v2/
agent-ove
... [+23344 chars truncated]

### User | 2026-06-19T16:15:56.865Z

[tool_result] AGI_INFRA_PHASE_A_WIRING.md
HOOK-TYPE-GUIDE.md
HOOK_DIGEST.md
README.md
__tests__/
_disabled/
_envelope.mjs*
_rpc-shim.mjs*
_rpc-shim.test.mjs
activate-before-build-precheck.mjs*
activate-before-build-precheck.test.mjs
active-chat-priority-boost.mjs*
active-chat-priority-decay.mjs*
agent-boundary-guard.mjs*
agent-fanout-pressure-gate.mjs*
agent-fanout-pressure-gate.test.mjs
agent-handoff-canonical
... [+1172 chars truncated]

### Assistant | 2026-06-19T16:16:01.599Z

Now let me read all the key auto-injection hooks in parallel.

### Assistant | 2026-06-19T16:16:02.468Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:02.742Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:03.107Z

[tool_use: Read]

### User | 2026-06-19T16:16:04.302Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * node-card-prefetch-inject.mjs — UserPromptSubmit injector
5	 * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-PREFETCH-HOOK, slot:sierra)
6	 *
7	 * When a prompt NAMES a system-viz node id (e.g. `eng.mill`, `ghost.galaxy.wedm`,
8	 * `formula.kienzle`), this hook SEEKS that node's compact card from the offset
9	 * index and injects it as additionalContext — so th
... [+7227 chars truncated]

### User | 2026-06-19T16:16:04.354Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+17015 chars truncated]

### User | 2026-06-19T16:16:04.616Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// audit-viz-first-inject.mjs — UserPromptSubmit T2 hook.
4	// When an audit/discovery intent is detected, auto-run
5	// `node scripts/system-viz-query.mjs find <noun>` and inject the top-K hits
6	// so the chat sees the answer BEFORE reaching for Grep/Glob.
7	//
8	// Knobs: PRISM_AUDIT_VIZ_FIRST_DISABLE=1 · PRISM_AUDIT_VIZ_FIRST_K=N (1..20, def 5)
9	//       
... [+8968 chars truncated]

### Assistant | 2026-06-19T16:16:09.463Z

Now let me read the remaining auto-injection hooks in parallel.

### Assistant | 2026-06-19T16:16:10.988Z

[tool_use: Bash]

### Assistant | 2026-06-19T16:16:12.766Z

[tool_use: Grep]

### User | 2026-06-19T16:16:14.117Z

[tool_result] Found 66 files
.claude\hooks\__tests__\mcp-route-takeup.test.mjs
.claude\hooks\mcp-route-takeup.mjs
.claude\hooks\master-index-search-gate.mjs
.claude\hooks\__tests__\mcp-route-action-hint.test.mjs
.claude\hooks\comprehensive-build-enforce.mjs
.claude\hooks\sierra-graph-health-inject.test.mjs
.claude\hooks\grep-index-first-force.test.mjs
.claude\hooks\grep-index-first.mjs
.claude\hooks\graph-guard
... [+2606 chars truncated]

### User | 2026-06-19T16:16:14.943Z

[tool_result] master-index-precheck-inject.mjs*
master-index-precheck-inject.test.mjs*
master-index-search-gate.mjs*
node-card-prefetch-inject.mjs*
node-card-prefetch-inject.test.mjs
pre-bash-graph-inject.mjs*
pre-bash-graph-inject.test.mjs
pre-grep-graph-inject.mjs*
pre-grep-graph-inject.test.mjs
pre-read-graph-inject.mjs*
pre-read-graph-inject.test.mjs
pre-write-cross-galaxy-warn.mjs*
pre-write-graph-inject.m
... [+148 chars truncated]

### Assistant | 2026-06-19T16:16:19.659Z

Now let me read all the pre-tool inject hooks and the master-index-search-lib in parallel.

### Assistant | 2026-06-19T16:16:20.025Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:20.040Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:20.410Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:20.815Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:21.118Z

[tool_use: Read]

### User | 2026-06-19T16:16:22.113Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-grep-graph-inject.mjs — PreToolUse:Grep graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A2.
7	 *
8	 * Sibling of pre-read-graph-inject.mjs. Before a Grep runs, surface the
9	 * master-index nodes that already match the grep pattern — "the graph
10	 * already knows these N nodes for your pattern" — so Claude can often
11	 * answ
... [+10484 chars truncated]

### User | 2026-06-19T16:16:22.174Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-read-graph-inject.mjs — PreToolUse:Read graph-context injector.
5	 *
6	 * PRISM-SEARCH-MS0 / U-PSM01 (2026-05-18, slot golf).
7	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A5 (2026-05-22, slot echo) — key
8	 *   derivation refactored onto the shared scripts/lib/graph-key-derive.mjs
9	 *   so all four PreToolUse graph hooks (read / grep / write / bash) sh
... [+7774 chars truncated]

### User | 2026-06-19T16:16:22.439Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-write-graph-inject.mjs — PreToolUse:Write graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A3.
7	 *
8	 * Sibling of pre-read / pre-grep graph-inject. Before a Write creates or
9	 * overwrites a file, surface the master-index nodes whose name overlaps the
10	 * target filename — "the graph has N related/duplicate nodes for this n
... [+10845 chars truncated]

### User | 2026-06-19T16:16:22.737Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-bash-graph-inject.mjs — PreToolUse:Bash graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A4.
7	 *
8	 * Sibling of pre-read / pre-grep / pre-write graph-inject. Before a Bash
9	 * command runs, surface the master-index nodes the graph already knows —
10	 * but NARROW: bash is mostly `git` / `npm` / `node` / build commands that
11
... [+13355 chars truncated]

### User | 2026-06-19T16:16:23.227Z

[tool_result] 1	/**
2	 * master-index-search-lib.mjs
3	 *
4	 * Shared keyword search over PRISM's two large knowledge corpora:
5	 *
6	 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7	 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
8	 *
9	 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
10	 *      domain). Keyword-only path (s
... [+39468 chars truncated]

### Assistant | 2026-06-19T16:16:32.535Z

Now let me read the remaining key hooks and libs in parallel.

### Assistant | 2026-06-19T16:16:33.348Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:33.733Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:34.115Z

[tool_use: Read]

### User | 2026-06-19T16:16:34.694Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * master-index-search-gate.mjs — PreToolUse hook (U-AWARE03)
5	 *
6	 * Before creating new engines/algorithms, searches MASTER_INDEX_COMPACT.md
7	 * for similar existing assets and warns if duplicates found.
8	 */
9	
10	import * as fs from 'fs';
11	import * as path from 'path';
12	
13	// Canonical auto-refreshed path (regen-digests writes here; PreCompa
... [+3299 chars truncated]

### User | 2026-06-19T16:16:34.836Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// viz-first-redirect.mjs — PreToolUse:Glob|Grep
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P3-VIZ-FIRST-REDIRECT-GLOB.
6	//
7	// User directive 2026-05-15: "make it so searches by claude use /system-viz
8	// as a master index before trying anything else."
9	//
10	// Strategy: before a Grep/Glob runs, query the system-viz name index for
11	// nodes matching the search p
... [+10880 chars truncated]

### Assistant | 2026-06-19T16:16:34.925Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:35.056Z

[tool_use: Read]

### User | 2026-06-19T16:16:35.375Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * system-viz-live-bridge.mjs — PostToolUse(Edit|Write|MultiEdit) → ping the live system-viz.
5	 *
6	 * U-HKA07 of HOOKS-AUTOMATION-V2-MS0. (Spec asked for a `type:"http"` hook; realised as a
7	 * `type:"command"` hook that does the HTTP itself, so it works regardless of harness support
8	 * for the http hook type.)
9	 *
10	 * WHY: with the /system-viz t
... [+11979 chars truncated]

### User | 2026-06-19T16:16:35.997Z

[tool_result] 1	/**
2	 * node-card-read.mjs — token-cheap read-by-id over the system-viz node substrate
3	 * (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * `readCard(id)` returns a compact NodeCard (~200 tokens) for ANY of the ~302K
6	 * graph nodes WITHOUT loading the 644MB system-graph.json. It reads the freshest
7	 * compact projection sidecar (no new heavy build):
8	 *   - system-graph-index.json (~193MB, 
... [+4099 chars truncated]

### User | 2026-06-19T16:16:36.196Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-system-viz-reminder.mjs — Advisory Stop hook.
5	 *
6	 * On every Stop event, scan the transcript tail for Write/Edit/MultiEdit/
7	 * NotebookEdit tool calls that wrote to paths under H:/prism/ during THIS
8	 * session. If at least one is found and the system-viz refresh wasn't already
9	 * pinged this session, surface a one-line reminder asking t
... [+7433 chars truncated]

### Assistant | 2026-06-19T16:16:42.912Z

Now let me check for take-rate measurement, the query log, and additional hooks I haven't seen yet.

### Assistant | 2026-06-19T16:16:43.365Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:44.100Z

[tool_use: Read]

### User | 2026-06-19T16:16:44.364Z

[tool_result] 1	// SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G2: master-index query telemetry.
2	// Pure record + aggregate. Append fail-soft, never throws to callers.
3	
4	import { appendFileSync, existsSync, readFileSync, renameSync, statSync } from "node:fs";
5	
6	const DEFAULT_LOG_PATH = "H:/prism/state/shared/master-index-query-log.jsonl";
7	const DEFAULT_MAX_BYTES = 8 * 1024 * 1024; // 8 MB → rotate to .1
8	co
... [+7236 chars truncated]

### User | 2026-06-19T16:16:45.083Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * sessionstart-graph-staleness-inject.mjs — SessionStart hook (T2 injector)
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-B5 — staleness visibility.
7	 *
8	 * Reads the regen artifacts produced by U-GO-B2 / B3 / B4:
9	 *   - state/shared/system-viz/system-graph.json           (the graph)
10	 *   - state/shared/system-viz/system-graph-index.json     (the s
... [+8842 chars truncated]

### Assistant | 2026-06-19T16:16:46.114Z

[tool_use: Grep]

### Assistant | 2026-06-19T16:16:46.795Z

[tool_use: Grep]

### User | 2026-06-19T16:16:47.619Z

[tool_result] .claude\hooks\claude-brief-inject.mjs:9: * injectors as the root cause of "compacted session larger than pre-compact"
.claude\hooks\git-add-lane-guard.mjs:37: * purpose — it is the TRANSITIONAL knob for incremental fleet adoption;
.claude\hooks\fleet-work-digest-inject.mjs:10: *   - SessionStart (all events): inject once so a new/compacted chat anchors to the fleet.
.claude\hooks\large-read-digest
... [+4202 chars truncated]

### User | 2026-06-19T16:16:48.338Z

[tool_result] scripts\ai-systems-synergy-goal-gate.mjs:115:// thresholds); live age at adoption 16.1h. Tune via the knob.
scripts\ai-systems-synergy-goal-gate.mjs:119:// constant red (live age at adoption: 6.5d). Same operator-blanket provenance.
scripts\ask-ollama.mjs:1000:// DIRECTIVE time (before any adoption); this records at EXECUTION time with the
scripts\ask-ollama.mjs:1003:// bumpTotals) and the dashboa
... [+5271 chars truncated]

### Assistant | 2026-06-19T16:16:54.317Z

Now let me check the nav-savings ledger, graph-key-derive lib, and look for any graph-inject effectiveness measurement.

### Assistant | 2026-06-19T16:16:55.167Z

[tool_use: Read]

### Assistant | 2026-06-19T16:16:55.523Z

[tool_use: Read]

### User | 2026-06-19T16:16:56.042Z

[tool_result] 1	// nav-savings-ledger.mjs — append-only ledger of node→path NAV resolutions that
2	// turned a "the graph knows X" hint into a direct `Read: <path>` (a saved
3	// Grep/Glob+Read search). SYSTEM-VIZ / U-SV-NAV-SAVINGS (sierra).
4	//
5	// Producer: the exact-path inject hooks (master-index-precheck-inject,
6	//   pre-bash-graph-inject) call recordNavHit() when they resolve a graph node's
7	//   la
... [+2721 chars truncated]

### User | 2026-06-19T16:16:56.400Z

[tool_result] 1	/**
2	 * graph-key-derive.mjs — per-tool key-derivation strategies for the four
3	 * PreToolUse graph-injection hooks (pre-read / pre-write / pre-grep /
4	 * pre-bash).
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A1.
7	 *
8	 * The hooks all share the same shape: derive a small set of "high-ROI" keys
9	 * from the tool's raw input, then call `runMasterIndexSearch` on each. The
10	 * derivation st
... [+3150 chars truncated]

### Assistant | 2026-06-19T16:16:57.508Z

[tool_use: Grep]

### User | 2026-06-19T16:16:58.914Z

[tool_result] .claude\hooks\agent-handoff-canonicalize.mjs:26:// the noisy fs/test/git/core/script namespaces that would false-positive on prose).
.claude\hooks\ai-duplication-guard.mjs:60:// Known algorithms that already exist (only check longer names to avoid false positives)
.claude\hooks\ai-duplication-guard.mjs:147:    // to avoid false positives on generic words like "index", "cache", "base"
.claude\hooks
... [+3517 chars truncated]

### Assistant | 2026-06-19T16:16:59.200Z

[tool_use: Grep]

### User | 2026-06-19T16:17:00.611Z

[tool_result] No matches found

### Assistant | 2026-06-19T16:17:06.337Z

Now let me check the settings.json for how these hooks are wired, and quickly check the lexical-rerank lib and the find-cache structure.

### Assistant | 2026-06-19T16:17:08.633Z

[tool_use: Bash]

### Assistant | 2026-06-19T16:17:09.062Z

[tool_use: Read]

### User | 2026-06-19T16:17:09.917Z

[tool_result] 1	/**
2	 * lexical-rerank.mjs — RAG-UPGRADE-MS0 / U-RAG-2 (2026-05-22, slot golf).
3	 *
4	 * Stage-2 reranker for PRISM's retrieval inject hooks. The 2026 RAG research
5	 * prescribes two-stage retrieval — a fast recall-oriented first stage
6	 * (BM25-lite, here) then a more careful reranker that lifts answer quality
7	 * 15-30%.
8	 *
9	 * A neural cross-encoder is the textbook stage 2 — but PRISM
... [+2488 chars truncated]

### Assistant | 2026-06-19T16:17:11.005Z

[tool_use: Bash]

### User | 2026-06-19T16:17:12.650Z

[tool_result]             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/system-viz-live-bridge.mjs",

### User | 2026-06-19T16:17:16.703Z

[tool_result] keys: 5 sample: [["schemaVersion",1],["generatedAt","2026-06-19T16:01:01.355Z"]]

### Assistant | 2026-06-19T16:17:22.215Z

Now I have enough to write the full report. Let me do one final check on the find-cache structure and settings wiring.

### Assistant | 2026-06-19T16:17:24.354Z

[tool_use: Bash]

### Assistant | 2026-06-19T16:17:26.047Z

[tool_use: Bash]

### User | 2026-06-19T16:17:28.309Z

[tool_result] top-level keys: [
  'schemaVersion',
  'generatedAt',
  'sourceMtimeMs',
  'sourceSize',
  'nodes'
]
entry key: sourceMtimeMs val: 1781884851900.464
entry key: sourceSize val: 769901801
entry key: nodes val: [{"label":"Operator","id":"p.operator","info":"Shop floor — runs jobs, scans travelers, reports SPC","subgroup":"personas","layer":"L0","noteCount":16},{"label":"Programmer","id":"p.programmer
... [+8 chars truncated]

### User | 2026-06-19T16:17:31.713Z

[tool_result]             "type": "command",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/helpers/async-hook-enqueue.mjs --hook H:/prism/.claude/hooks/git-sync-stop.mjs --tier T4 --event Stop",
            "type": "command",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop_on_uncommitted_critical.mjs",
            "type": "command",
            "c
... [+953 chars truncated]

### Assistant | 2026-06-19T16:20:09.235Z

I have all the information I need. Here is the full reconnaissance report.

---

## PRISM Graph Auto-Use Reconnaissance Report

### Confirmed Artifact Paths & Sizes

| Artifact | Path | Size |
|---|---|---|
| system-graph.json | `state/shared/system-viz/system-graph.json` | 734 MB |
| system-graph-index.json (sidecar) | `state/shared/system-viz/system-graph-index.json` | 257 MB |
| find-cache.json | `state/shared/system-viz/find-cache.json` | 62 MB |
| node-cards.jsonl | `state/shared/system-viz/node-cards.jsonl` | 213 MB |
| node-card-offsets.json | `state/shared/system-viz/node-card-offsets.json` | 28 MB |
| architecture-graph.json (fallback) | `state/shared/system-viz/architecture-graph.json` | 65 MB |

find-cache.json schema: `{ schemaVersion, generatedAt, sourceMtimeMs, sourceSize, nodes[] }` — an array of `{label, id, info, subgroup, layer, noteCount}` records, 110K+ entries.

---

## Auto-Injection Surfaces (Exhaustive Map)

### Surface 1: `master-index-precheck-inject.mjs`
**Trigger:** UserPromptSubmit (every prompt)
**File:** `.claude/hooks/master-index-precheck-inject.mjs`

**What it injects:**
- Top-K (default 5, max 20) graph nodes from system-graph.json (via sidecar when heap allows)
- Each hit: `[layer/status] label` + up to 2 wiki names + 1 memory name + optional DSL shortcode + source-chain provenance tag
- On exact-match (single token = single non-ghost node): collapses to a one-line EXACT MATCH banner (`~80B` vs `~400B`) and optionally emits `Read: <repoPath>` from `code-path-resolver.mjs`
- Stage-1 recall is `TOP_K × 5` (capped at 30), then narrowed by lexical reranker (`lexical-rerank.mjs`) to TOP_K, then `edgeOrder`-sorted

**How it matches/ranks:**
- BM25-lite: `W_LABEL=3.0`, `W_ID=2.0`, `W_INFO=1.5`, `W_VAULT=1.0` (wiki/memory entry names)
- Tokenizer: lowercase, strip non-`\p{L}\p{N}_`, stopword filter (~34 words including "engine", "system", "node"), max 8 tokens from prompt, min token length 3
- Stage-2 lexical rerank (`lexical-rerank.mjs`)
... [+22032 chars truncated]
