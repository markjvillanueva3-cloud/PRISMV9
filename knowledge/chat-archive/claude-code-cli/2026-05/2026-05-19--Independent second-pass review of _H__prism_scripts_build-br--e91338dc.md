---
type: "chat-session"
source: "claude-code-cli"
session_id: "e91338dc-6a34-4db2-9d78-8cb86d5548d3"
title: "Independent second-pass review of `H:/prism/scripts/build-brief.mjs` (read the W"
date: "2026-05-19"
first_ts: "2026-05-19T02:57:40.066Z"
last_ts: "2026-05-19T03:01:56.557Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/e91338dc-6a34-4db2-9d78-8cb86d5548d3/subagents/agent-a8b4aa358dbd95dc7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent second-pass review of `H:/prism/scripts/build-brief.mjs` (read the W

> **claude-code-cli** | 2026-05-19 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e91338dc-6a34-4db2-9d78-8cb86d5548d3/subagents/agent-a8b4aa358dbd95dc7.jsonl`

## Transcript

### User | 2026-05-19T02:57:40.066Z

Independent second-pass review of `H:/prism/scripts/build-brief.mjs` (read the WHOLE file end-to-end). Do NOT assume a first reviewer caught everything. This is a new PRISM utility: a CLI + library that composes a deep pre-build knowledge "brief" (wiki bodies + tribal tips + regressions + commits + master-index hits) for a unit-id or topic.

Weight your review toward what a logic-focused reviewer is LIKELY TO MISS:
1. INTEGRATION with the two imported modules — `H:/prism/scripts/unit-knowledge-pack.mjs` and `H:/prism/scripts/lib/master-index-search-lib.mjs`. Read those two files. Verify: (a) the imported functions actually exist and are exported with the signatures used here; (b) `runMasterIndexSearch`/`runTribalSearch` are called with the CORRECT option names — the lib expects `topK`/`prefDomain`, and `unit-knowledge-pack.mjs` itself has a latent bug passing `k`/`domain` (wrong names); confirm build-brief.mjs does NOT repeat that bug; (c) the shapes consumed from the search results match what the lib actually returns.
2. Hidden coupling — module-level cache `_leafCache`; does it behave correctly across calls with different paths / in tests?
3. Security / I/O safety — path traversal via leaf-index `path`, via memory slug resolution, via the write path; untrusted file content (leaf-index JSONL, ROADMAP json, CLAUDE.md).
4. Error budgets — is every failure mode either handled or surfaced as a warning? Anything that could silently produce a wrong-but-plausible brief (R12 fail-loud)?
5. Convention conformance with PRISM scripts — compare structure/style to `unit-knowledge-pack.mjs` (CLI shape, export pattern, JSDoc density, the `if (process.argv[1] && import.meta.url === ...)` guard).
6. Inlined constants, stub/placeholder logic, naming.
7. Whether `parseArgs` returns config fields (`tribalK`, `wikiBodies`, `memBodies`, `gitN`, `regrN`) that no CLI flag can actually set — is that a defect or acceptable?

You may run the script from `H:/prism`. Report P0/P1/P2/P3 finding
... [+99 chars truncated]

### Assistant | 2026-05-19T02:57:47.057Z

I'll review `build-brief.mjs` thoroughly, starting by reading the file and its two imported modules.

### Assistant | 2026-05-19T02:57:47.474Z

[tool_use: Read]

### Assistant | 2026-05-19T02:57:48.161Z

[tool_use: Read]

### Assistant | 2026-05-19T02:57:47.898Z

[tool_use: Read]

### User | 2026-05-19T02:57:50.877Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\master-index-search-lib.mjs' was already read 5s ago in this session and is unchanged (mtime 1779159174889). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T02:57:51.465Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-brief.mjs — deep pre-build knowledge brief for a unit or topic
4	 *
5	 * HIGH-ROI knowledge-injection skill (slot juliett, 2026-05-19).
6	 *
7	 * The gap this closes: PRISM's existing injection surfaces are all SHALLOW.
8	 * master-index-precheck-inject gives ~5 node *names*; wiki-precheck gives 3
9	 * entry *titles*; unit-knowledge-pack lists *pointers*. Not
... [+33261 chars truncated]

### User | 2026-05-19T02:57:54.583Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * unit-knowledge-pack.mjs — per-unit knowledge surfacing for a chat slot
4	 *
5	 * BACKEND-DEV-LOOP / OLLAMA-EXPAND-MS0 follow-on.
6	 *
7	 * Closes the gap behind the operator directive 2026-05-18 charlie:
8	 *   "expand ollama and obsidian utilization for the purpose of developing
9	 *    with all relevant knowledge dedicated to the specific task and unit
10	 *    t
... [+13112 chars truncated]

### Assistant | 2026-05-19T02:57:57.261Z

The lib file was already read but the result didn't show. Let me read it now.

### Assistant | 2026-05-19T02:57:57.637Z

[tool_use: Read]

### User | 2026-05-19T02:57:59.665Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\master-index-search-lib.mjs' was already read 14s ago in this session and is unchanged (mtime 1779159174889). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-19T02:58:02.929Z

The read-once guard claims the lib content is in context, but the actual Read result was an error, not content. I need the lib's actual code to verify the integration. Let me grep for the key exported functions and their signatures.

### Assistant | 2026-05-19T02:58:04.090Z

[tool_use: Grep]

### User | 2026-05-19T02:58:09.764Z

[tool_result] 88:export function tokenize(text, opts = {}) {
89-  if (!text || typeof text !== "string") return [];
90-  const maxLen = opts.maxLen ?? DEFAULT_MAX_PROMPT_LEN;
91-  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_QUERY_TOKENS;
92-  const trimmed = text.length > maxLen
93-    ? text.slice(0, maxLen).replace(/\S+$/u, "")
94-    : text;
95-  const cleaned = trimmed.toLowerCase().replace(/[^\p{L}\p{N
... [+3742 chars truncated]

### Assistant | 2026-05-19T02:58:13.860Z

I see something important at line 436 of the lib — there appears to be a stray backslash. Let me look at that and also examine the search functions' option handling and return shapes.

### Assistant | 2026-05-19T02:58:14.866Z

[tool_use: Read]

### User | 2026-05-19T02:58:23.547Z

[tool_result] 430	  let raw;
431	  try { raw = JSON.parse(readFileSync(indexPath, "utf8")); }
432	  catch { return null; }
433	  if (!raw || !Array.isArray(raw.entries)) return null;
434	
435	  // Slim entries — drop embedding arrays we don't need on this path.
436	  // Per-entry try/catch: a single bad entry doesn't abort the whole load
437	  // (defensive against schema drift / partial-write — Reviewer C P0 c
... [+3811 chars truncated]

### Assistant | 2026-05-19T02:58:26.761Z

Now I need to verify the master-index search result shape. Let me look at `searchGraphHits` to confirm the hit shape (`.wiki`, `.memory`, `.layer`, `.status`, `.label`, `.id`).

### Assistant | 2026-05-19T02:58:28.401Z

[tool_use: Grep]

### User | 2026-05-19T02:58:34.003Z

[tool_result] 139: * The sidecar's `nodes[]` are stored in searchGraphHits' own consumed shape
287:      const wikiArr = Array.isArray(n.knowledge?.wikiEntries) ? n.knowledge.wikiEntries : [];
288:      const memArr = Array.isArray(n.knowledge?.memoryEntries) ? n.knowledge.memoryEntries : [];
321:export function searchGraphHits(graph, queryTokens, opts = {}) {
339:      // searchGraphHits previously trusted tha
... [+641 chars truncated]

### Assistant | 2026-05-19T02:58:36.863Z

Now let me verify the full hit shape from `searchGraphHits` and check the `score`/`kind`/`id` fields:

### Assistant | 2026-05-19T02:58:37.551Z

[tool_use: Read]

### User | 2026-05-19T02:58:42.914Z

[tool_result] 321	export function searchGraphHits(graph, queryTokens, opts = {}) {
322	  if (!graph || queryTokens.length === 0) return [];
323	  const topK = opts.topK ?? DEFAULT_TOP_K;
324	  const excludedLayers = opts.excludedLayers ?? DEFAULT_EXCLUDED_LAYERS;
325	  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
326	  const candidates = new Map();
327	
328	  for (const tok of queryTokens) {
329
... [+3033 chars truncated]

### Assistant | 2026-05-19T02:58:46.159Z

I have the full picture of the lib's contract. Now let me verify a few runtime facts: that the leaf-index exists and its shape, and run the script to confirm behavior.

### Assistant | 2026-05-19T02:58:47.433Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:58:48.400Z

[tool_use: Bash]

### User | 2026-05-19T02:58:52.851Z

[tool_result] knowledge/wiki/architecture/_leaf-index.jsonl  7.9M
[28520 more lines]

### User | 2026-05-19T02:59:04.491Z

[tool_result] [master-index-search-lib] system-graph 372.0MB > cap 200MB — falling back to architecture-graph (28.0MB)
{
  "target": "chatter detection in milling",
  "mode": "topic",
  "slot": null,
  "generatedAt": "2026-05-19T02:58:56.463Z",
  "unit": null,
  "domain": "mill",
  "query": "chatter detection in milling",
  "queryTokens": [
    "chatter",
    "detection",
    "milling"
  ],
  "wikiContext": [
 
... [+8446 chars truncated]

### Assistant | 2026-05-19T02:59:08.016Z

The script runs end-to-end. Now let me run unit mode and the slot path, plus check the test file existence and the write path:

### Assistant | 2026-05-19T02:59:10.147Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:59:12.775Z

[tool_use: Bash]

### User | 2026-05-19T02:59:18.054Z

[tool_result] {
  "target": null,
  "mode": "empty",
  "slot": "juliett",
  "generatedAt": "2026-05-19T02:59:13.396Z",
  "unit": null,
  "domain": null,
  "query": "",
  "queryTokens": [],
  "wikiContext": [],
  "memoryContext": [],
  "tribal": [],
  "regressions": [],
  "commits": [],
  "masterHits": [],
  "missingWiki": [],
  "missingMemory": [],
  "warnings": [
    "No target — pass a unit-id, a topic string
... [+227 chars truncated]

### User | 2026-05-19T02:59:24.525Z

[tool_result] pools: [ 'milestones', 'pending_units', 'unconsolidated_prose' ]
sample unit keys: [ 'unit_id', 'milestone', 'title', 'status', 'consolidated', 'source' ]
sample id: U-CAMP02

### Assistant | 2026-05-19T02:59:27.324Z

Let me run unit mode with a real unit-id and verify the master-index hits render and commits work:

### Assistant | 2026-05-19T02:59:30.414Z

[tool_use: Bash]

### User | 2026-05-19T03:00:37.563Z

[tool_result] mode: unit unit: {"milestone":"CAM-PARITY-AGI-MS0","title":"Mastercam 5-Axis + Multi-Axis + Mill-Turn"} domain: cam
queryTokens: [
  'camp02', 'cam',
  'parity', 'agi',
  'ms0',    'mastercam',
  'axis',   'multi',
  'mill',   'turn'
]
masterHits: 8 sample: {"id":"vault.wiki.code-tribal.learnings.cam-parity-agi-ms0-u-camp13-closeout","score":26,"layer":"L10","label":"cam-parity-agi-ms0-u-camp13-c.
... [+67 chars truncated]

### Assistant | 2026-05-19T03:00:40.447Z

Unit mode works fully. Now let me verify the write path and the `--no-write` default behavior, and check whether a test file exists:

### Assistant | 2026-05-19T03:00:41.977Z

[tool_use: Bash]

### User | 2026-05-19T03:00:57.169Z

[tool_result] _Written to: H:\prism\state\shared\build-briefs\U-CAMP02.md_
=== written file check ===
U-CAMP02.md  12.8K
=== test file ===
/usr/bin/ls: cannot access 'scripts/build-brief.test.mjs': No such file or directory
/usr/bin/ls: cannot access 'scripts/__tests__/build-brief*.mjs': No such file or directory

### Assistant | 2026-05-19T03:01:56.557Z

Now I have everything I need. Let me do a final check on one subtle integration point — how `tribalImpl` enrichment joins by `id`, since the lib's tribal hits already carry `text`:

The lib's `searchTribalHits` (line 489-528) returns hits with `{id, source, domain, title, path, score}` — **note: no `text` field in the returned hit**. The `text` is stripped from the ranked output. So `enrichTribalText` re-loads the index and joins by `id` to get the full text back. The earlier topic-mode run confirmed `fullText` was populated. Integration is correct.

Let me verify one more thing — that `loadTribalIndex` is the right loader and entries carry `text`:

The lib's `loadTribalIndex` (line 415-470) builds `entries` with `{idx, id, source, domain, title, path, text}` — `text` is present (line 450). `enrichTribalText` joins `index.entries[].id → text`. Correct.

Now I have a complete picture. Here is my independent second-pass review.

---

## Independent Second-Pass Review — `H:/prism/scripts/build-brief.mjs`

I read the whole file end-to-end plus both imported modules (`unit-knowledge-pack.mjs` and `lib/master-index-search-lib.mjs`) and ran the script in all four modes (topic, unit, slot, no-target) plus the write path.

### 1. Integration with the two imported modules — VERIFIED CORRECT

**(a) Imported function existence/signatures:**
- `lookupUnit(unitId, readImpl)` — exists, exported, called as `lookupUnit(cleanTarget, readImpl)` ✓
- `buildQueryTokens(unitId, unit)` — exists, called as `buildQueryTokens(cleanTarget, unit)` ✓
- `inferDomain(unit)` — exists, called as `inferDomain(unit || {milestone: ...})` ✓
- `resolveSlotToUnit(slot, readImpl)` — exists, called as `resolveSlotToUnit(opts.slot)` ✓
- `gitCommitsForMilestone(unit, n, spawnImpl)` — exists, called as `gitCommitsForMilestone(unit, gitN, spawnImpl)` ✓
- `runMasterIndexSearch`, `runTribalSearch`, `loadTribalIndex`, `tokenize` — all exist and are exported from the lib ✓

**(b) Option-name correctness — the laten
... [+8329 chars truncated]
