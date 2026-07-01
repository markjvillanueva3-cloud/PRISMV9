---
type: "chat-session"
source: "claude-code-cli"
session_id: "a9284c28-44ab-410b-aa5a-53d41d8084d0"
title: "Reconnaissance for slot:sierra. The operator wants concrete WIRING POINTS where "
date: "2026-06-06"
first_ts: "2026-06-06T05:36:34.250Z"
last_ts: "2026-06-06T05:46:34.930Z"
cwd: "H:\\prism"
messages: 81
user_msgs: 35
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism/a9284c28-44ab-410b-aa5a-53d41d8084d0/subagents/workflows/wf_23b502ce-b7a/agent-a497f02b166678f0c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Reconnaissance for slot:sierra. The operator wants concrete WIRING POINTS where 

> **claude-code-cli** | 2026-06-06 | 81 msgs (35 user / 46 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a9284c28-44ab-410b-aa5a-53d41d8084d0/subagents/workflows/wf_23b502ce-b7a/agent-a497f02b166678f0c.jsonl`

## Transcript

### User | 2026-06-06T05:36:34.250Z

Reconnaissance for slot:sierra. The operator wants concrete WIRING POINTS where a cheap node→path lookup can be wired into a skill/script/hook with a small edit for token savings.

TASK: Identify the specific, lowest-effort/highest-ROI wiring points in H:/prism. For each candidate, give the exact file, what it does now, and the 1-edit change that routes it through a cheap surface:
- The STAGED prism_session:node_card dispatcher action (CLAUDE.md CHEAP-NODE-ACCESS-MS0 says it's staged) — where would it be added (the prism_session dispatcher) and which skills/scripts would call it?
- The graph-context inject hooks (pre-grep/pre-bash/pre-write-graph-inject) — can they call seekCard() to emit paths+doc-pointers instead of bare node names? (node-card-prefetch-inject already does this for prompt-mentioned ids.)
- node-card skill (.claude/commands/node-card.md) and prism-navigate / prism-lookup / nav skills — do they route through the cheap offset index?
- Any script that re-scans the vault/graph when find-cache/node-card-offsets would serve.
Conclude with a ranked, dependency-ordered list of the 5-8 best wiring increments, each tagged S/M/L and SAFE-AUTONOMOUS vs OPERATOR-DECISION, with the #1 to ship first.

### Assistant | 2026-06-06T05:36:44.624Z

I'll conduct a thorough reconnaissance of H:/prism to identify concrete wiring points for token-efficient node→path lookup. Let me start by mapping the project structure and understanding the current dispatcher/skill architecture.

### Assistant | 2026-06-06T05:36:44.673Z

[tool_use: Bash]

### User | 2026-06-06T05:37:04.157Z

[tool_result] 8890769648 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-SCRUTINY-FIX (slot:sierra): close 3-of-3 arm-B findings
71e9d0b3d7 Merge origin/cad-fusion-live-ms0 (REAPER-PERMFIX-MS1/U-D2: Ollama GPU residency, other-PC RTX4080) — golf integrator full-sync. Strategy: ours (host-specific docker-compose/README comments kept at this Blackwell-96GB machine's version; functional config identic
... [+5385 chars truncated]

### Assistant | 2026-06-06T05:37:05.523Z

Let me map out the current architecture and identify wiring points.

### Assistant | 2026-06-06T05:37:05.730Z

[tool_use: Read]

### Assistant | 2026-06-06T05:37:06.141Z

[tool_use: Glob]

### Assistant | 2026-06-06T05:37:06.381Z

[tool_use: Glob]

### Assistant | 2026-06-06T05:37:06.577Z

[tool_use: Bash]

### User | 2026-06-06T05:37:14.247Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-207 of 534 total (54773 tokens, cap 25000). Call Read with offset=208 limit=207 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# PRISM — Manufacturing Intelligence Platform
2	
3	## EXPERT ROLE (ALWAYS ACTIVE)
4	<!-- DUPLICATE-CANDIDA
... [+43065 chars truncated]

### User | 2026-06-06T05:37:32.507Z

[tool_result] .claude\worktrees\brave-euclid\.claude\commands\claude-flow-help.md
.claude\worktrees\brave-euclid\.claude\commands\claude-flow-memory.md
.claude\worktrees\brave-euclid\.claude\commands\claude-flow-swarm.md
.claude\worktrees\brave-euclid\.claude\commands\scrutinize.md
.claude\worktrees\brave-euclid\.claude\commands\generate-roadmap.md
.claude\worktrees\brave-euclid\.claude\commands\smart.md
.claud
... [+4233 chars truncated]

### User | 2026-06-06T05:37:32.515Z

[tool_result] No files found

### User | 2026-06-06T05:38:15.184Z

[tool_result] H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/undici/lib/dispatcher
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/undici/lib/dispatcher/dispatcher-base.js
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/undici/lib/dispatcher/dispatcher.js
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/undici/types/dispatcher.d.ts
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modul
... [+1581 chars truncated]

### Assistant | 2026-06-06T05:38:17.162Z

Let me search for the dispatcher and node-card wiring infrastructure more directly.

### Assistant | 2026-06-06T05:38:17.574Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:38:18.028Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:38:18.214Z

[tool_use: Bash]

### User | 2026-06-06T05:38:45.935Z

[tool_result] H:/prism/mcp-server/src/utils/dispatcherMiddleware.ts
H:/prism/mcp-server/src/__tests__/ai-dispatcher-ledger-wire.test.ts
H:/prism/mcp-server/src/__tests__/ai-dispatcher-p3-wire.test.ts
H:/prism/mcp-server/src/__tests__/build-dispatcher-graph-index.test.ts
H:/prism/mcp-server/src/__tests__/CADCapabilityNegotiator.dispatcher.test.ts
H:/prism/mcp-server/src/__tests__/cam-dispatcher-schema-collision.
... [+1015 chars truncated]

### User | 2026-06-06T05:38:56.656Z

[tool_result] H:/prism/.cache/npm/_npx/e058441c325e062a/node_modules/playwright-core/lib/server/dispatchers/androidDispatcher.js
H:/prism/.cache/npm/_npx/e058441c325e062a/node_modules/playwright-core/lib/server/dispatchers/artifactDispatcher.js
H:/prism/.cache/npm/_npx/e058441c325e062a/node_modules/playwright-core/lib/server/dispatchers/browserContextDispatcher.js
H:/prism/.cache/npm/_npx/e058441c325e062a/node_
... [+1930 chars truncated]

### User | 2026-06-06T05:39:33.026Z

[tool_result] H:/prism/.claude/commands/node-card.md
H:/prism/.claude/hooks/node-card-prefetch-inject.mjs
H:/prism/.claude/hooks/node-card-prefetch-inject.test.mjs
H:/prism/knowledge/wiki/architecture/hooks/runtime/node-card-prefetch-inject-test.md
H:/prism/knowledge/wiki/architecture/hooks/runtime/node-card-prefetch-inject.md
H:/prism/knowledge/wiki/architecture/skills/project/node-card.md
H:/prism/mcp-server/
... [+495 chars truncated]

### Assistant | 2026-06-06T05:39:34.756Z

Perfect. Let me examine the key infrastructure files now.

### Assistant | 2026-06-06T05:39:34.997Z

[tool_use: Read]

### Assistant | 2026-06-06T05:39:35.382Z

[tool_use: Read]

### Assistant | 2026-06-06T05:39:35.801Z

[tool_use: Read]

### Assistant | 2026-06-06T05:39:35.960Z

[tool_use: Read]

### User | 2026-06-06T05:39:41.149Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\node-card-prefetch-inject.mjs' was already read 14s ago in this session and is unchanged (mtime 1780596583744). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-06T05:39:42.241Z

[tool_result] 1	/**
2	 * sessionNodeCardAction.ts — the `prism_session:node_card` action body, extracted
3	 * for dep-injected testing (mirrors sessionHybridSearchAction.ts).
4	 *
5	 * Native MCP surface for the token-cheap node-card read-by-id
6	 * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-DISPATCHER, slot:sierra). It delegates to
7	 * the single-source CLI (`scripts/system-viz-query.mjs node-card <ids> --json`)
8	 
... [+3473 chars truncated]

### User | 2026-06-06T05:39:42.496Z

[tool_result] 1	---
2	name: node-card
3	description: Token-cheap read-by-id for ANY system-viz graph node. Returns a node's compact card (label, layer, kind, status, info, + the wiki/memory docs that document it) in ~200 tokens WITHOUT loading the 644MB system-graph.json. Use after `find` gives you an id, or whenever you know a node id and need its record + where to read more. CHEAP-NODE-ACCESS-MS0 (sierra).
4	
... [+2193 chars truncated]

### User | 2026-06-06T05:39:43.068Z

[tool_result] 1	/**
2	 * node-card-offset-lib.mjs — the seekable card-offset index for sub-parse
3	 * node reads (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-OFFSET-INDEX, slot:sierra).
4	 *
5	 * THE PROBLEM (the next layer down from node-card-read): readCard's full-sidecar
6	 * path parses the WHOLE 193MB system-graph-index.json (or 55MB find-cache) to
7	 * build an id->node Map. A long-lived process caches that, but a
... [+7488 chars truncated]

### Assistant | 2026-06-06T05:39:45.128Z

Now let me examine the prism_session dispatcher and search for related lookup/navigation skills.

### Assistant | 2026-06-06T05:39:45.344Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:39:45.826Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:39:46.445Z

[tool_use: Grep]

### User | 2026-06-06T05:39:55.074Z

[tool_result] Found 2 files
.claude\commands\generate-roadmap.md
.claude\commands\continue-roadmap.md

### User | 2026-06-06T05:40:13.867Z

[tool_result] (Bash completed with no output)

### User | 2026-06-06T05:40:20.701Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/guardDispatcher.ts:  "prism_state_load": "prism:prism_session action=state_load",
H:/prism/mcp-server/src/tools/dispatchers/guardDispatcher.ts:  "prism_state_save": "prism:prism_session action=state_save",
H:/prism/mcp-server/src/tools/dispatchers/guardDispatcher.ts:  "prism_state_checkpoint": "prism:prism_session action=state_checkpoint",
H:/prism/mcp-ser
... [+2669 chars truncated]

### Assistant | 2026-06-06T05:40:23.189Z

Let me check the dispatcher digest and session dispatcher directly.

### Assistant | 2026-06-06T05:40:23.830Z

[tool_use: Read]

### Assistant | 2026-06-06T05:40:23.887Z

[tool_use: Read]

### Assistant | 2026-06-06T05:40:24.263Z

[tool_use: Bash]

### system

... [1 middle messages omitted -- see raw_file] ...

### User | 2026-06-06T05:40:35.311Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**107 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-06-04 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **13863**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|----
... [+11385 chars truncated]

### User | 2026-06-06T05:41:18.158Z

[tool_result] 1812:          case "hybrid_search": {
1881:          case "node_card": {
3786:          case "dream_discard": {

### Assistant | 2026-06-06T05:41:21.515Z

Let me examine the node_card case and the hybrid_search case, plus look at pre-grep/pre-bash hooks structure.

### Assistant | 2026-06-06T05:41:21.957Z

[tool_use: Read]

### Assistant | 2026-06-06T05:41:22.393Z

[tool_use: Read]

### Assistant | 2026-06-06T05:41:22.788Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:41:22.922Z

[tool_use: Bash]

### User | 2026-06-06T05:41:44.224Z

[tool_result] 1800	          // + BUILD_STATE. Future hot path under master-index-precheck-inject
1801	          // hook — replaces N Grep/Glob/Agent calls.
1802	          // PSN-ENHANCE-MS0/U-PSN-HYBRID-MCP-WIRE (sierra iter26 2026-05-25):
1803	          // closes iter-18 follow-up. Cross-tree dynamic import via file://
1804	          // URL bypasses src/ boundary so MCP + CLI + skill share one
1805	          
... [+6371 chars truncated]

### User | 2026-06-06T05:41:45.702Z

[tool_result] 1870	            if (Array.isArray(params.exclude_layers)) opts.excludeLayers = params.exclude_layers;
1871	            const result = await masterIndexEngine.classifyAllNodes(opts as Parameters<typeof masterIndexEngine.classifyAllNodes>[0]);
1872	            return ok(result);
1873	          }
1874	
1875	          // CHEAP-NODE-ACCESS-MS0/U-NODECARD-DISPATCHER (sierra 2026-06-04): token-cheap
187
... [+4466 chars truncated]

### User | 2026-06-06T05:42:14.654Z

[tool_result] H:/prism/.claude/hooks/agent-rules-inject.mjs
H:/prism/.claude/hooks/ai-reasoning-inject.mjs
H:/prism/.claude/hooks/ai-system-router-inject.mjs
H:/prism/.claude/hooks/audit-awareness-inject.mjs
H:/prism/.claude/hooks/audit-viz-first-inject.mjs
H:/prism/.claude/hooks/awareness-snapshot-inject.mjs
H:/prism/.claude/hooks/build-state-inject.mjs
H:/prism/.claude/hooks/cad-pipeline-knowledge-inject.mjs

... [+642 chars truncated]

### User | 2026-06-06T05:42:26.853Z

[tool_result] -rwxr-xr-x 1 wompu 197611  6280 May 12 21:15 H:/prism/.claude/hooks/_envelope.mjs*
-rwxr-xr-x 1 wompu 197611  5990 May 22 19:39 H:/prism/.claude/hooks/_rpc-shim.mjs*
-rw-r--r-- 1 wompu 197611  7325 May 22 19:41 H:/prism/.claude/hooks/_rpc-shim.test.mjs
-rwxr-xr-x 1 wompu 197611 15146 May 18 23:43 H:/prism/.claude/hooks/activate-before-build-precheck.mjs*
-rw-r--r-- 1 wompu 197611 23607 May 18 23:4
... [+1479 chars truncated]

### Assistant | 2026-06-06T05:42:29.089Z

Perfect. Let me now look at the pre-grep/pre-bash hooks and examine the nav/lookup skills.

### Assistant | 2026-06-06T05:42:29.352Z

[tool_use: Read]

### Assistant | 2026-06-06T05:42:29.740Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:42:30.153Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:42:30.356Z

[tool_use: Read]

### User | 2026-06-06T05:42:51.023Z

[tool_result] 1	---
2	name: node-card
3	description: Token-cheap read-by-id for ANY system-viz graph node. Returns a node's compact card (label, layer, kind, status, info, + the wiki/memory docs that document it) in ~200 tokens WITHOUT loading the 644MB system-graph.json. Use after `find` gives you an id, or whenever you know a node id and need its record + where to read more. CHEAP-NODE-ACCESS-MS0 (sierra).
4	
... [+2189 chars truncated]

### User | 2026-06-06T05:42:51.757Z

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
... [+6605 chars truncated]

### User | 2026-06-06T05:43:32.419Z

[tool_result] H:/prism/.claude/hooks/pre-bash-graph-inject.mjs
H:/prism/.claude/hooks/pre-bash-graph-inject.test.mjs
H:/prism/.claude/hooks/pre-edit-galaxy-cascade-inject.mjs
H:/prism/.claude/hooks/pre-grep-graph-inject.mjs
H:/prism/.claude/hooks/pre-grep-graph-inject.test.mjs
H:/prism/.claude/hooks/pre-read-graph-inject.mjs
H:/prism/.claude/hooks/pre-read-graph-inject.test.mjs
H:/prism/.claude/hooks/pre-write-
... [+71 chars truncated]

### User | 2026-06-06T05:43:32.423Z

[tool_result] H:/prism/.claude/hooks/mcp-route-suggest.mjs
H:/prism/.claude/hooks/node-card-prefetch-inject.mjs
H:/prism/.claude/hooks/node-card-prefetch-inject.test.mjs

### Assistant | 2026-06-06T05:43:34.694Z

Now let me examine the node-card-prefetch-inject hook and look for more wiring opportunities in nav/lookup skills and scripts.

### Assistant | 2026-06-06T05:43:35.142Z

[tool_use: Read]

### Assistant | 2026-06-06T05:43:35.571Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:43:35.799Z

[tool_use: Read]

### Assistant | 2026-06-06T05:43:36.291Z

[tool_use: Bash]

### User | 2026-06-06T05:43:46.219Z

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

### User | 2026-06-06T05:43:46.471Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "smart"
6	triggers:
7	  - event: UserPromptSubmit
8	    matcher:
9	      type: keyword
10	      value: "/smart|smart route|intelligent route|smart task"
11	    score: 0.7
12	    action: suggest
13	---
14	You are about to execute a prompt with intelligent auto-configuration. Follow this protocol exactly.
15	
16	## Advisor Strategy (`advisor_20260301
... [+4041 chars truncated]

### User | 2026-06-06T05:44:11.727Z

[tool_result] H:/prism/scripts/lib/node-card-offset-lib.mjs
H:/prism/scripts/lib/node-card-offset-lib.test.mjs
H:/prism/scripts/lib/node-card-read.mjs
H:/prism/scripts/lib/node-card-read.test.mjs

### User | 2026-06-06T05:44:57.680Z

[tool_result] H:/prism/.claude/commands/nav.md

### Assistant | 2026-06-06T05:44:59.408Z

Excellent. Let me now look at the nav skill and examine for more wiring patterns.

### Assistant | 2026-06-06T05:44:59.898Z

[tool_use: Read]

### Assistant | 2026-06-06T05:45:00.255Z

[tool_use: Bash]

### Assistant | 2026-06-06T05:45:00.772Z

[tool_use: Bash]

### User | 2026-06-06T05:45:03.710Z

[tool_result] 1	# /nav — node → exact source path (zero graph-parse navigation)
2	
3	Resolve a PRISM node's **name / class / DSL shortcode / graph-node-id** to its
4	**exact source file path** (+ asset type, + optional declaration line) so you can
5	`Read` it DIRECTLY instead of Grep/Glob-searching the ~200K-file tree. Backed by
6	the compact `CODE_SYSTEM_INDEX.json` — **never** parses the 548 MB system-graph.

... [+2842 chars truncated]

### User | 2026-06-06T05:45:18.804Z

[tool_result] #!/usr/bin/env node
/**
 * system-viz-query — programmatic adapter for the live system graph.
 *
 * Lets rgs / forge / roadmap tools consume system-graph.json without
 * embedding parsing logic. Read-only.
 *
 * Usage:
 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # downstream edges
 *   n
... [+4970 chars truncated]

### User | 2026-06-06T05:45:32.797Z

[tool_result] 12: *   2. PRISMSelfAwarenessEngine.findCapabilities — fuzzy match across
582:      // unfindable regardless of which stopword mode the QUERY uses. Index
773:    let caps: Awaited<ReturnType<typeof prismSelfAwarenessEngine.findCapabilities>> = [];
776:        prismSelfAwarenessEngine.findCapabilities(query ?? ""),
790:      warnings.push(`PRISMSelfAwarenessEngine.findCapabilities failed: ${(err as
... [+19 chars truncated]

### Assistant | 2026-06-06T05:45:34.270Z

Perfect. I have sufficient data. Let me now compile my findings into the reconnaissance report.

### Assistant | 2026-06-06T05:45:34.981Z

[tool_use: Bash]

### User | 2026-06-06T05:45:46.191Z

[tool_result] 1812:          case "hybrid_search": {
1838:          case "master_index_query": {
1881:          case "node_card": {

### Assistant | 2026-06-06T05:46:34.930Z

Now I can deliver the comprehensive reconnaissance report.

## RECONNAISSANCE REPORT: CHEAP NODE→PATH LOOKUP WIRING POINTS (slot:sierra)

### EXECUTIVE SUMMARY

I've identified **7 high-ROI, low-effort wiring increments** for token-efficient node→path lookup across PRISM. The backbone is already staged (CHEAP-NODE-ACCESS-MS0: `node_card` dispatcher action + offset-index infrastructure), and 4 concrete surface-inject points are primed for 1-edit rewirings.

---

### EXISTING INFRASTRUCTURE (BASELINE)

**Already Shipped:**
- **`prism_session:node_card` action** (sessionDispatcher.ts:1881) — token-cheap read-by-id via `system-viz-query.mjs node-card --json`. Seeks 24MB offset index; never loads 644MB graph. Cost: ~200 tokens/card vs ~186K old way.
- **`node-card-offset-lib.mjs`** — atomic dual-file pair (node-cards.jsonl + node-card-offsets.json). `buildCardOffsetIndex` pure compute; `writeCardOffsetIndex` I/O wrapper. Dedup semantics match full-sidecar path exactly.
- **`node-card-prefetch-inject.mjs`** hook (UserPromptSubmit) — detects node-ids in prompt (whitelisted prefixes: `eng`, `disp`, `ghost`, `formula`, `wiki`, `skill`, `memory_*`, `ms-envelope`, `tribal-tip`); seeks cards; injects 0-tool-call context. Bounds: 24 candidates scanned, K=3 cards max. Cost: ~0ms common case (no-hit), parse 24MB once if candidate present.
- **`pre-bash-graph-inject.mjs`** hook (PreToolUse:Bash) — surfaces master-index hits for file-search verbs (grep/find/cat/ls); includes `exactMatchHit` collapse + `navPathLine` resolution for direct Read path.
- **`/nav` skill** (`.claude/commands/nav.md`) — resolves name→source-path via CODE_SYSTEM_INDEX.json (O(1), fail-soft). Backed by code-path-resolver.mjs.

**The dispatch wiring:**
- sessionDispatcher.ts line 1881: `case "node_card"` → runNodeCardAction → execFileSync(`system-viz-query.mjs node-card`) → offset index seek.
- Offset index pair registered in PATHS.PRISM_ROOT/state/shared/system-viz/ (`node-cards.jsonl` + `node-card-offsets.js
... [+11761 chars truncated]
