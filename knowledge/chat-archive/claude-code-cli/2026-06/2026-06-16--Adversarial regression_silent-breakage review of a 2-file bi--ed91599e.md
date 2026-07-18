---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Adversarial regression/silent-breakage review of a 2-file big-graph-read fix. Gr"
date: "2026-06-16"
first_ts: "2026-06-16T20:36:33.851Z"
last_ts: "2026-06-16T20:39:48.079Z"
cwd: "H:\\prism-slot-sierra"
messages: 46
user_msgs: 19
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a915a123a3bb2aa1a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Adversarial regression/silent-breakage review of a 2-file big-graph-read fix. Gr

> **claude-code-cli** | 2026-06-16 | 46 msgs (19 user / 27 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a915a123a3bb2aa1a.jsonl`

## Transcript

### User | 2026-06-16T20:36:33.851Z

Adversarial regression/silent-breakage review of a 2-file big-graph-read fix. Grade PASS or FAIL with file:line. Read each file END TO END. ABSOLUTE paths under H:/prism/ (shared tree, NOT a slot worktree):
1. H:/prism/scripts/roadmap-to-viz-nodes.mjs  (function loadGraphNodeIds, ~line 169)
2. H:/prism/scripts/audit-roadmap-viz-bindings.mjs  (function loadGraphNodeIndex, ~line 87)
3. H:/prism/scripts/lib/graph-io.mjs  (the streamGraphArray + exceedsStringParseCap exports being used)

BUG FIXED (same class in both files): each had a `JSON.parse(readFileSync(<graphPath>, "utf8"))` that crashed with ERR_STRING_TOO_LONG on the live 765MB merged system-graph.json (over Node's UTF-8 string cap 0x1fffffe8 ~512MB). Confirmed crash: roadmap-to-viz-nodes.test.mjs had 3 tests failing with "system-graph.json is not valid JSON: Cannot create a string longer than 0x1fffffe8 characters".

FIX (both files): added `import { streamGraphArray, exceedsStringParseCap } from "./lib/graph-io.mjs"` + `statSync`, and a size-gate: `if (exceedsStringParseCap(statSync(abs).size)) { streamGraphArray(abs, "nodes", processNode); } else { <original JSON.parse(readFileSync) path, unchanged> }`. The per-node processing was extracted into a closure (addId / processNode) and applied identically in both the streaming and full-parse branches.

VERIFY (silent-breakage focus):
- BEHAVIOR EQUIVALENCE: the extracted closure (addId in roadmap-to-viz-nodes; processNode in audit-roadmap-viz-bindings) must do EXACTLY what the original inline loop body did. roadmap-to-viz-nodes: collect lowercased node ids into a Set. audit-roadmap-viz-bindings: collect ids + prefixes + engineStems (Map of stem -> [original-case n.id]) -- confirm the closure preserves n.id ORIGINAL case for engineStems.push (line ~105) while lowercasing for ids/prefixes. Any field dropped or cased differently = silent regression.
- STREAMING CORRECTNESS: streamGraphArray(abs, "nodes", cb) must call cb once per element of the top-level `nodes` ar
... [+1036 chars truncated]

### Assistant | 2026-06-16T20:36:38.336Z

I'll read all three files end-to-end before forming any verdict.

### Assistant | 2026-06-16T20:36:38.768Z

[tool_use: Read]

### Assistant | 2026-06-16T20:36:39.141Z

[tool_use: Read]

### Assistant | 2026-06-16T20:36:39.146Z

[tool_use: Read]

### User | 2026-06-16T20:36:39.418Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 61172 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 47s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-m
... [+520 chars truncated]

### User | 2026-06-16T20:36:39.904Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graph-io.mjs' was already read 23m ago in this session and is unchanged (mtime 1781066455041). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-16T20:36:40.549Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * audit-roadmap-viz-bindings.mjs — re-runnable roadmap↔system-viz binding auditor
4	 *
5	 * Emitted by /forge-audit-v2 (BACKEND-DEVTOOLS-RGS6 audit, 2026-05-11) as the
6	 * compounding-gains META artifact. Re-run after any RGS pass that emits or edits
7	 * atomized roadmap specs to keep drift bounded.
8	 *
9	 * What it measures, for a glob of atomized roadmap specs:

... [+25382 chars truncated]

### Assistant | 2026-06-16T20:36:47.936Z

The read-once guard fired for `graph-io.mjs` and `roadmap-to-viz-nodes.mjs`. I need to read both of those now — the guard says the content is already in context from this session, but as a fresh analyst arm I must verify them directly.

### Assistant | 2026-06-16T20:36:48.314Z

[tool_use: Read]

### Assistant | 2026-06-16T20:36:48.575Z

[tool_use: Read]

### User | 2026-06-16T20:36:49.059Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graph-io.mjs' was already read 23m ago in this session and is unchanged (mtime 1781066455041). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-16T20:36:49.429Z

[tool_result] read-once-guard: 'H:\prism\scripts\roadmap-to-viz-nodes.mjs' was already read 10s ago in this session and is unchanged (mtime 1781641849015). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-16T20:36:54.125Z

The hook claims the files are already in context. I'll use Grep to pull the specific sections I need to verify independently, starting with `graph-io.mjs` and the `roadmap-to-viz-nodes.mjs` loadGraphNodeIds function.

### Assistant | 2026-06-16T20:36:54.730Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:36:56.354Z

[tool_use: Grep]

### User | 2026-06-16T20:37:01.297Z

[tool_result] 1:/**
2: * scripts/lib/graph-io.mjs — streaming read+write for `system-graph.json`
3: *
4: * Bypasses V8's ~512MB max-string-length ceiling that crashes legacy
5: * `JSON.parse(fs.readFileSync(p, "utf8"))` (read) and `JSON.stringify(G)`
6: * (write) calls once the graph passes ~512MB serialized.
7: *
8: * Discovered: papa /loop 2026-05-23, U-PSN-VIZ-REGEN, on the 541MB graph.
9: * Memory: `referen
... [+15819 chars truncated]

### User | 2026-06-16T20:37:01.723Z

[tool_result] 41:import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
42:import { streamGraphArray, exceedsStringParseCap } from "./lib/graph-io.mjs";
171:export function loadGraphNodeIds(graphPath) {
173:  if (!existsSync(abs)) return null;
175:  const addId = (n) => {
186:  if (exceedsStringParseCap(statSync(abs).size)) {
187:    streamGraphArray(abs, "nodes", addId);
196:  const nodes =
... [+141 chars truncated]

### Assistant | 2026-06-16T20:37:06.886Z

Good. Now let me read the full `loadGraphNodeIds` function body and surrounding context in `roadmap-to-viz-nodes.mjs` to see every line of that function.

### Assistant | 2026-06-16T20:37:07.514Z

[tool_use: Grep]

### User | 2026-06-16T20:37:10.138Z

[tool_result] 1:#!/usr/bin/env node
2:/**
3: * roadmap-to-viz-nodes.mjs — MS-VIZ-ROADMAP-BIND
4: *
5: * The canonical roadmap-unit -> system-viz viz_node_id resolver, plus a
6: * reconciler that diffs every milestone-envelope unit against the live graph.
7: *
8: * The peer's scripts/audit-roadmap-viz-bindings.mjs CLASSIFIES viz_node_ids that
9: * already exist in roadmap specs (is this id valid?). This script i
... [+16149 chars truncated]

### Assistant | 2026-06-16T20:37:13.283Z

I now have all three files read in full. Let me do the focused cross-checks on the specific lenses requested.

### Assistant | 2026-06-16T20:37:15.292Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:37:16.353Z

[tool_use: Bash]

### User | 2026-06-16T20:37:34.052Z

[tool_result] 90:  if (!existsSync(abs)) return { ids: new Set(), engineStems: new Map(), prefixes: new Set(), ghostPfx: false };
92:  const engineStems = new Map(); // stem -> [node ids]   (stem = lc engine name minus trailing "engine")
95:    const id = String(n && n.id != null ? n.id : '').toLowerCase();
103:        if (!engineStems.has(stem)) engineStems.set(stem, []);
104:        engineStems.get(stem).push
... [+222 chars truncated]

### User | 2026-06-16T20:37:54.023Z

[tool_result] diff --git a/scripts/roadmap-to-viz-nodes.mjs b/scripts/roadmap-to-viz-nodes.mjs
index 3ffea07ddd..55e9d9990f 100644
--- a/scripts/roadmap-to-viz-nodes.mjs
+++ b/scripts/roadmap-to-viz-nodes.mjs
@@ -38,7 +38,8 @@
  * should extract scripts/lib/viz-node-taxonomy.mjs and have BOTH import it. Left
  * inline here to avoid editing the working peer script in this pass.
  */
-import { readFileSync, read
... [+1808 chars truncated]

### Assistant | 2026-06-16T20:37:56.726Z

[tool_use: Bash]

### User | 2026-06-16T20:38:07.562Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-16T20:38:11.431Z

[tool_use: Bash]

### User | 2026-06-16T20:38:28.065Z

[tool_result] On branch cad-fusion-live-ms0
Your branch is ahead of 'origin/cad-fusion-live-ms0' by 4036 commits.
  (use "git push" to publish your local commits)

Cherry-pick currently in progress.
  (run "git cherry-pick --continue" to continue)
  (use "git cherry-pick --skip" to skip this patch)
  (use "git cherry-pick --abort" to cancel the cherry-pick operation)

Changes not staged for commit:
  (use "git 
... [+15412 chars truncated]

### Assistant | 2026-06-16T20:38:33.665Z

The `audit-roadmap-viz-bindings.mjs` is untracked (new file), not a diff against HEAD. Let me now check its `loadGraphNodeIndex` closure versus the original behavior precisely, and verify the `streamGraphArray` callback signature contract:

### Assistant | 2026-06-16T20:38:35.008Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:38:36.214Z

[tool_use: Grep]

### User | 2026-06-16T20:38:38.791Z

[tool_result] 39: * needs a streaming parser (readGraphStreaming / streamGraphArray) or it must be
242: * streamGraphArray share ONE implementation.
305:      if (depth === 0 && !inElem) { count++; inElem = true; }
309:      if (depth === 0) { count++; }
318:    if (depth === 0 && !isWS(c) && !inElem) { count++; inElem = true; } // depth-0 scalar
345:export function streamGraphArray(filePath, arrayKey, onElemen
... [+95 chars truncated]

### User | 2026-06-16T20:38:38.793Z

[tool_result] No matches found

### Assistant | 2026-06-16T20:38:44.355Z

The grep on `audit-roadmap-viz-bindings.mjs` for those imports returned no matches, which means I need to re-examine. The file I read earlier shows those imports at lines 48-49. Let me verify the import line and the callback signature contract precisely.

### Assistant | 2026-06-16T20:38:44.500Z

[tool_use: Read]

### Assistant | 2026-06-16T20:38:44.566Z

[tool_use: Read]

### User | 2026-06-16T20:38:48.338Z

[tool_result] 48	import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
49	import { streamGraphArray, exceedsStringParseCap } from './lib/graph-io.mjs';
50	import { resolve, dirname, basename } from 'node:path';
51	import { fileURLToPath } from 'node:url';
52	import { execSync } from 'node:child_process';

### User | 2026-06-16T20:38:48.340Z

[tool_result] 343	 * @returns {number}  number of elements streamed (0 on missing key / read error)
344	 */
345	export function streamGraphArray(filePath, arrayKey, onElement) {
346	  let buf;
347	  try { buf = fs.readFileSync(filePath); } catch { return 0; }
348	  const arrStart = findArrayContentStart(buf, arrayKey);
349	  if (arrStart < 0) return 0;
350	  const QUOTE = 0x22, BACKSLASH = 0x5c, LBRACE = 0x7b, 
... [+1133 chars truncated]

### Assistant | 2026-06-16T20:38:51.807Z

I now have everything I need. Let me do the final targeted checks on two edge cases before rendering the verdict.

### Assistant | 2026-06-16T20:38:52.192Z

[tool_use: Read]

### Assistant | 2026-06-16T20:38:52.714Z

[tool_use: Read]

### User | 2026-06-16T20:38:54.173Z

[tool_result] 88	function loadGraphNodeIndex(graphPath) {
89	  const abs = resolve(REPO, graphPath);
90	  if (!existsSync(abs)) return { ids: new Set(), engineStems: new Map(), prefixes: new Set(), ghostPfx: false };
91	  const ids = new Set();
92	  const engineStems = new Map(); // stem -> [node ids]   (stem = lc engine name minus trailing "engine")
93	  const prefixes = new Set();
94	  const processNode = (n)
... [+1341 chars truncated]

### User | 2026-06-16T20:38:54.413Z

[tool_result] 171	export function loadGraphNodeIds(graphPath) {
172	  const abs = resolve(REPO, graphPath);
173	  if (!existsSync(abs)) return null;
174	  const ids = new Set();
175	  const addId = (n) => {
176	    const id = String(n && n.id != null ? n.id : "").toLowerCase();
177	    if (id) ids.add(id);
178	  };
179	  // GRAPH-READ SAFETY (U-VIZ-ROADMAP-BIGREAD): the merged system-graph.json is
180	  // ~765
... [+936 chars truncated]

### Assistant | 2026-06-16T20:39:48.079Z

I have read every relevant line. Here is the full analysis.

---

## Verification trace

### 1. Behavior equivalence — `addId` / `processNode` closures

**`roadmap-to-viz-nodes.mjs` — `addId`**

Original inline loop (from git diff):
```js
const id = String(n && n.id != null ? n.id : "").toLowerCase();
if (id) ids.add(id);
```
Extracted closure at lines 175-178: identical byte-for-byte. The only data structure is the `ids` Set. No field dropped, no case difference, no regression.

**`audit-roadmap-viz-bindings.mjs` — `processNode`** (lines 94-106)

The closure does three things:
1. `ids.add(id)` — `id` is the **lowercased** form of `n.id`. Correct; `ids` is always queried with lowercased strings.
2. `prefixes.add(id.split('.', 1)[0])` — lowercased prefix. Correct.
3. `engineStems.get(stem).push(n.id)` at line 104 — this pushes `n.id` in **original case**, not `id` (the lowercased form).

This is the load-bearing question. The consumer at line 224 is:
```js
const hit = stem.length >= 5 ? (graph.engineStems.get(stem) || []) : [];
```
and at line 225:
```js
return { class: 'EXISTS-MISLABEL', detail: `tagged TBD-create but live node(s) exist: ${hit.join(', ')}` };
```
`hit` is used only in the human-readable `detail` string. Original case is **correct and intentional** — the output text should show the real id (e.g. `eng.mill.MillingForceEngine`, not `eng.mill.millingforceengine`). The stem key itself is derived from the already-lowercased `id` at line 100-101, so the Map key is always lowercase and lookups are consistent. No regression here.

The streaming path and the full-parse path both call the same `processNode` closure; behavior is identical across both branches for all three data structures.

### 2. Streaming correctness

`streamGraphArray(filePath, arrayKey, onElement)` signature at graph-io.mjs:345 — `onElement` receives `(element, index)` (line 376: `onElement(JSON.parse(...), count)`).

Both callers:
- `roadmap-to-viz-nodes.mjs:187`: `streamGraphArray(abs, "n
... [+6234 chars truncated]
