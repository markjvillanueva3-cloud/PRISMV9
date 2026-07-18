---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Map what node-direct access ALREADY exists in PRISM so we do not rebuild it. Rea"
date: "2026-06-02"
first_ts: "2026-06-02T13:31:51.316Z"
last_ts: "2026-06-02T13:41:37.854Z"
cwd: "H:\\prism-slot-sierra"
messages: 92
user_msgs: 40
assistant_msgs: 52
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_bdf6d033-341/agent-a4a8dc3cb56d5f169.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Map what node-direct access ALREADY exists in PRISM so we do not rebuild it. Rea

> **claude-code-cli** | 2026-06-02 | 92 msgs (40 user / 52 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_bdf6d033-341/agent-a4a8dc3cb56d5f169.jsonl`

## Transcript

### User | 2026-06-02T13:31:51.316Z

Map what node-direct access ALREADY exists in PRISM so we do not rebuild it. Read: H:/prism/.claude/hooks/viz-first-redirect.mjs (or audit-viz-first.mjs — Grep .claude/hooks for 'viz-first'/'system-viz-query'), H:/prism/.claude/hooks/master-index-precheck-inject.mjs, H:/prism/scripts/system-viz-query.mjs, H:/prism/scripts/lib/system-viz-graph.mjs (loadFindCache + the find-cache projection FIND_FIELDS), H:/prism/scripts/lib/master-index-search-lib.mjs, and the prism-navigate skill (Grep .claude/commands for 'prism-navigate' / 'Zero-IO'). REPORT: (1) every existing way a chat/hook resolves a named thing to a graph node WITHOUT Grep/Read exploration, with exact invocation + token cost; (2) the find-cache contract (fields projected per node, how a lookup returns); (3) gaps — what node-direct access is MISSING that a chat would actually want; (4) is there already a generator/template for node-routing skills/scripts/hooks?

HARD CONSTRAINT: NEVER read/parse H:/prism/state/shared/system-viz/system-graph.json (695MB) or system-graph-index.json (194MB) — parsing OOMs the host. Analyze ONLY code, hooks, skills, small sidecars (find-cache.json ~2MB and JSON dashboards are fine), and docs. Locate any file you are unsure of via Grep/Glob. Do NOT write or edit any file. Be concrete: cite file:line. Be exhaustive and adversarial — prefer non-obvious findings.

### Assistant | 2026-06-02T13:32:19.793Z

I'll map the existing node-direct access surface in PRISM. Let me start by locating the key files and reading them in parallel.

### Assistant | 2026-06-02T13:32:19.794Z

[tool_use: Grep]

### Assistant | 2026-06-02T13:32:19.796Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:32:19.799Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:32:19.803Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:32:19.806Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:32:20.960Z

[tool_use: Grep]

### User | 2026-06-02T13:33:35.841Z

[tool_result] scripts\lib\system-viz-graph.mjs

### User | 2026-06-02T13:33:35.976Z

[tool_result] .claude\hooks\audit-viz-first-inject.mjs
.claude\hooks\stop-system-viz-drift.mjs
.claude\hooks\stop-system-viz-reminder.mjs
.claude\hooks\system-viz-live-bridge.mjs
.claude\hooks\viz-first-redirect.mjs
.claude\hooks\viz-first-redirect.test.mjs
.claude\hooks\stop-system-viz-stale-auto-regen.mjs
.claude\hooks\stop-system-viz-stale-auto-regen.test.mjs

### User | 2026-06-02T13:33:36.227Z

[tool_result] scripts\system-viz-query.mjs

### User | 2026-06-02T13:33:36.350Z

[tool_result] No files found

### User | 2026-06-02T13:33:36.381Z

[tool_result] scripts\lib\master-index-search-lib.mjs

### User | 2026-06-02T13:33:36.603Z

[tool_result] Found 8 files
H:\prism\.claude\hooks\HOOK_DIGEST.md
H:\prism\.claude\hooks\foxtrot-mill-awareness-inject.mjs
H:\prism\.claude\hooks\viz-first-redirect.mjs
H:\prism\.claude\hooks\__tests__\audit-viz-first-rate-gate.test.mjs
H:\prism\.claude\hooks\audit-viz-first-inject.mjs
H:\prism\.claude\hooks\viz-first-redirect.test.mjs
H:\prism\.claude\hooks\error-pattern-capture.mjs
H:\prism\.claude\hooks\suba
... [+22 chars truncated]

### Assistant | 2026-06-02T13:33:39.335Z

Let me read the core files in parallel.

### Assistant | 2026-06-02T13:33:39.905Z

[tool_use: Read]

### Assistant | 2026-06-02T13:33:40.379Z

[tool_use: Read]

### Assistant | 2026-06-02T13:33:40.845Z

[tool_use: Read]

### Assistant | 2026-06-02T13:33:41.329Z

[tool_use: Read]

### User | 2026-06-02T13:34:01.992Z

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
... [+9448 chars truncated]

### User | 2026-06-02T13:34:03.890Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+11685 chars truncated]

### User | 2026-06-02T13:34:05.437Z

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
... [+16711 chars truncated]

### User | 2026-06-02T13:34:12.415Z

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
... [+27618 chars truncated]

### Assistant | 2026-06-02T13:34:16.202Z

Now let me read the find-cache contract in system-viz-graph.mjs, and find the prism-navigate skill plus any node-routing generator.

### Assistant | 2026-06-02T13:34:17.137Z

[tool_use: Read]

### Assistant | 2026-06-02T13:34:18.394Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:34:18.398Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:34:18.400Z

[tool_use: Glob]

### User | 2026-06-02T13:34:43.453Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so a single process can load
5	 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
6	 *
7	 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
8	 * module-scope cache keyed on the graph file's mtime + size. A seco
... [+17516 chars truncated]

### User | 2026-06-02T13:34:47.147Z

[tool_result] No files found

### User | 2026-06-02T13:34:47.520Z

[tool_result] No files found

### User | 2026-06-02T13:34:47.730Z

[tool_result] No files found

### Assistant | 2026-06-02T13:34:52.203Z

The prism-navigate skill must be in the plugin/managed location since it's listed in available skills. Let me find it plus check for node-routing generators/templates.

### Assistant | 2026-06-02T13:34:53.595Z

[tool_use: Bash]

### Assistant | 2026-06-02T13:34:54.886Z

[tool_use: Grep]

### User | 2026-06-02T13:35:47.844Z

[tool_result] Found 60 files limit: 60
.claude\commands\discover-tango.md
.claude\commands\viz-audit-sierra.md
.claude\commands\system-viz.md
state\shared\specs\SYSTEM-VIZ-HIGH-VALUE-FEATURES-2026-05-11.md
state\shared\specs\SYSTEM-SYNERGY-AUDIT-2026-05-09.md
state\shared\specs\REVENUE-ROADMAP-2026-05-10.md
state\shared\specs\JULIETT-PLAN-V2.1-SCRUTINY-DELTAS-2026-05-17.md
state\shared\specs\JULIETT-OPEN-TASKS-
... [+2354 chars truncated]

### User | 2026-06-02T13:36:46.254Z

[tool_result] H:/prism/.claude/hookify.autofire-navigate.local.md
H:/prism/.claude/hooks/lib/navigate-first-hook.mjs
H:/prism/.claude/skills/prism-lookup
H:/prism/.claude/skills/prism-navigate
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/.claude/hooks/lib/navigate-first-hook.mjs
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/state/shared/claude-user-mirror/hookify.autofire-navigate.local.md
H:/prism/.
... [+4130 chars truncated]

### Assistant | 2026-06-02T13:36:50.490Z

The skills are in `.claude/skills/` not `.claude/commands/`. Let me read the navigate skill, lookup skill, the navigate-first-hook lib, and the prism-paths/navigate skill docs.

### Assistant | 2026-06-02T13:36:51.684Z

[tool_use: Bash]

### Assistant | 2026-06-02T13:36:51.976Z

[tool_use: Read]

### system

... [12 middle messages omitted -- see raw_file] ...

### User | 2026-06-02T13:37:23.330Z

[tool_result] No files found

### Assistant | 2026-06-02T13:37:28.196Z

The graph shows `fs-navigate-find` and `fs-navigate` are calc dispatcher actions (L10). Let me find that implementation plus the `navigate` skill and any node-routing generators. Let me also check the prism-paths skill referenced earlier.

### Assistant | 2026-06-02T13:37:29.146Z

[tool_use: Grep]

### Assistant | 2026-06-02T13:37:31.766Z

[tool_use: Bash]

### Assistant | 2026-06-02T13:37:35.847Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:37:35.851Z

[tool_use: Glob]

### User | 2026-06-02T13:37:41.933Z

[tool_result] Found 1 file
mcp-server\src\tools\dispatchers\calcDispatcher.ts

### User | 2026-06-02T13:37:42.884Z

[tool_result] No files found

### User | 2026-06-02T13:37:42.885Z

[tool_result] scripts\generate-skill-wiki.mjs
scripts\generate-skills-atomic.mjs

### User | 2026-06-02T13:37:44.097Z

[tool_result] ---skills dir---
hypermill-material-lookup/
prism-lookup/
prism-navigate/

### Assistant | 2026-06-02T13:37:48.885Z

Let me look at the calcDispatcher `fs_navigate` implementation and check the master-index node-direct query path, plus the audit-viz-first hook and the action_search/dispatcher_map MCP actions which are alternate node-direct surfaces.

### Assistant | 2026-06-02T13:37:50.717Z

[tool_use: Grep]

### Assistant | 2026-06-02T13:37:50.836Z

[tool_use: Read]

### User | 2026-06-02T13:37:55.083Z

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

### User | 2026-06-02T13:37:55.248Z

[tool_result] 915-  \ -- SFC-ACCURACY-MS1 Iter 4+5: parameter-cascade auto-adjust + pareto recommender --
916-  "sf_auto_adjust", "prism_enhanced_recommend",
917-  "tool_library_add", "tool_library_import_csv", "tool_library_filter",
918-  "tool_library_stats", "geometry_job_plan",
919:  "fs_navigate", "fs_navigate_find", "dsl_resolve", "dsl_search",
920-  \ Resource Optimization: hyperMILL + ISO 286 extended (
... [+932 chars truncated]

### Assistant | 2026-06-02T13:38:00.753Z

Now let me read the FileSystemNavigatorEngine (the node-direct engine behind `fs_navigate`) and check the MasterIndexEngine for its node-direct query, plus the pre-grep/pre-bash graph injection hooks I've been seeing fire (they're a node-direct surface I should document).

### Assistant | 2026-06-02T13:38:01.236Z

[tool_use: Glob]

### Assistant | 2026-06-02T13:38:02.348Z

[tool_use: Grep]

### User | 2026-06-02T13:38:04.305Z

[tool_result] mcp-server\src\engines\FileSystemNavigatorEngine.ts

### User | 2026-06-02T13:38:07.512Z

[tool_result] Found 6 files
H:\prism\.claude\hooks\HOOK_DIGEST.md
H:\prism\.claude\hooks\mcp-route-suggest.mjs
H:\prism\.claude\hooks\pre-grep-graph-inject.mjs
H:\prism\.claude\hooks\pre-bash-graph-inject.mjs
H:\prism\.claude\hooks\pre-bash-graph-inject.test.mjs
H:\prism\.claude\hooks\pre-grep-graph-inject.test.mjs

### Assistant | 2026-06-02T13:38:10.964Z

[tool_use: Read]

### Assistant | 2026-06-02T13:38:11.457Z

[tool_use: Read]

### User | 2026-06-02T13:38:12.433Z

[tool_result] 1	/**
2	 * FileSystemNavigatorEngine — Zero-IO file system navigation for token savings
3	 *
4	 * Answers "where is X?" queries using pre-built domain routing maps.
5	 * No file reads required — all knowledge is embedded. Saves 200-500 tokens
6	 * per navigation query vs Glob/Grep exploration.
7	 *
8	 * Models: Keyword-weighted TF-IDF matching, domain taxonomy routing,
9	 *         fuzzy prefix ma
... [+12887 chars truncated]

### User | 2026-06-02T13:38:14.442Z

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
... [+6324 chars truncated]

### Assistant | 2026-06-02T13:38:19.251Z

I have a strong picture. Let me check the `graph-key-derive.mjs` lib (the shared derivation used by the pre-grep/pre-bash injectors), the master_index_query MCP action, and confirm whether any generator/template exists for node-routing skills/hooks. Let me also verify the find-cache sidecar exists and its size.

### Assistant | 2026-06-02T13:38:19.979Z

[tool_use: Read]

### User | 2026-06-02T13:38:22.765Z

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
... [+5114 chars truncated]

### Assistant | 2026-06-02T13:38:28.287Z

[tool_use: Bash]

### User | 2026-06-02T13:38:35.912Z

[tool_result] H:/prism/state/shared/system-viz/architecture-graph.json  51.7M
H:/prism/state/shared/system-viz/find-cache.json  53.4M
H:/prism/state/shared/system-viz/system-graph-index.json  193.7M
---pre-read/pre-bash injectors---
pre-bash-graph-inject.mjs  7.8K
pre-bash-graph-inject.test.mjs  5.4K
pre-grep-graph-inject.mjs  6.1K
pre-grep-graph-inject.test.mjs  4.9K
pre-read-graph-inject.mjs  7.0K
pre-read-gr
... [+96 chars truncated]

### Assistant | 2026-06-02T13:38:41.452Z

Important finding: the find-cache is 53.4MB, NOT ~2MB as the code comment claims. And system-graph-index.json is 193.7MB. Let me verify the master_index_query MCP action exists (the runtime engine surface) and do a final check for any node-routing generator/template. Let me also confirm the actual graph size to validate the OOM constraint claim.

### Assistant | 2026-06-02T13:38:43.203Z

[tool_use: Grep]

### Assistant | 2026-06-02T13:38:45.375Z

[tool_use: Bash]

### User | 2026-06-02T13:39:00.962Z

[tool_result] mcp-server\src\tools\dispatchers\sessionDispatcher.ts:164:  "master_index_query",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:165:  "master_index_node_status",
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:1430:          case "master_index_query": {
mcp-server\src\tools\dispatchers\sessionDispatcher.ts:1446:            const result = await masterIndexEngine.query(query, opts as P
... [+473 chars truncated]

### User | 2026-06-02T13:39:33.942Z

[tool_result] H:/prism/state/shared/system-viz/system-graph.json  653.4M
---node-routing generators/templates---
generate-per-slot-galaxy-buildout-files.mjs  23.7K
generate-per-slot-galaxy-verify.mjs  1.6K
generate-per-slot-skill-wrappers.mjs  16.3K
generate-per-slot-wrappers.mjs  9.1K
generate-per-slot-wrappers.test.mjs  3.1K
generate-skill-wiki.mjs  6.4K
generate-skills-atomic.mjs  5.6K
---templates dir---

### Assistant | 2026-06-02T13:39:40.277Z

I have everything needed. The system-graph.json is confirmed 653.4MB (matches the OOM constraint). Let me do one final targeted check on the generate-per-slot-wrappers template mechanism to determine if it's reusable for node-routing skills, and verify how the find-cache is generated (to assess the 53MB sidecar gap).

### Assistant | 2026-06-02T13:39:42.819Z

[tool_use: Bash]

### Assistant | 2026-06-02T13:39:43.620Z

[tool_use: Read]

### User | 2026-06-02T13:39:58.855Z

[tool_result] 1	#!/usr/bin/env node
2	// Generates per-slot wrapper slash commands for precompact / handoff / startup.
3	// Mirrors the established /checkin-<slot> pattern (force-take slot → bind topic → delegate to canonical pipeline).
4	//
5	// Why: every per-chat data-write (precompact handoff, /handoff resume, /startup auto-resume) must
6	// land under the correct slot prefix in HANDOFF-<slot>-<topic>.md so
... [+4805 chars truncated]

### User | 2026-06-02T13:40:09.679Z

[tool_result] Exit code 1
H:/prism/scripts/build-memory-index-sidecar.mjs
H:/prism/scripts/lib/system-viz-graph.mjs
H:/prism/scripts/system-viz-query.mjs
---how find-cache gets generated (regen path)---

### Assistant | 2026-06-02T13:41:37.854Z

I have a complete, adversarially-verified picture. Note the critical finding: the find-cache is generated lazily by `loadFindCache()` itself (no offline regen writes it), and it has bloated to 53.4MB — defeating its own design goal. Here is the full report.

---

# Node-Direct Access in PRISM — What Already Exists

The repo has **four distinct, independently-built node-direct surfaces**, plus a lazy sidecar layer. None of them should be rebuilt. Below: exact invocations + token costs (1), the find-cache contract (2), the real gaps (3), and the generator question (4).

## (1) Every existing way to resolve a named thing to a graph node WITHOUT Grep/Read

### A. `system-viz-query.mjs find <query>` — the canonical node-direct CLI
- **Invocation:** `node H:/prism/scripts/system-viz-query.mjs find <query> [--json]`
- **Path:** `scripts/system-viz-query.mjs:44-60` (the `find` short-circuit)
- **Mechanism:** Calls `loadFindCache()` (NOT `loadGraph()`) — short-circuits BEFORE the eager `loadGraph()` at `:62`. `findInGraph()` does a case-insensitive substring match over `label + id + info + subgroup` (`system-viz-graph.mjs:199-208`), limit 30.
- **Token cost to a chat:** ~0 if it reads the human output; the JSON form returns up to 30 nodes each with `{label,id,info,subgroup,layer,kind}`. The *subprocess* cost is the real concern (see §3).
- **Other subcommands (each uses full `loadGraph()`, NOT find-cache):** `headline`, `roadmap-candidates`, `blast-radius <nodeId>`, `dispatcher-summary`, `coverage-by-domain`, `worktrees`, `build-order` (`system-viz-query.mjs:74-345`). These parse the **653MB** graph — they are NOT cheap and must never run in a hot hook path.

### B. `viz-first-redirect.mjs` — PreToolUse:Glob|Grep auto-injector (hook, zero chat action)
- **Path:** `.claude/hooks/viz-first-redirect.mjs`
- **Mechanism:** Intercepts Glob/Grep, strips the leaf identifier (`shouldQueryViz` `:86-102`), shells out to `system-viz-query.mjs find <probe>` (`:124-138`), parses the human
... [+12440 chars truncated]
