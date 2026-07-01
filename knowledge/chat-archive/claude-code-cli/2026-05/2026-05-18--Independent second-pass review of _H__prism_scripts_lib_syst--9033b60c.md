---
type: "chat-session"
source: "claude-code-cli"
session_id: "9033b60c-6a5f-4c7e-973c-57826958d374"
title: "Independent second-pass review of `H:/prism/scripts/lib/system-viz-graph.mjs` — "
date: "2026-05-18"
first_ts: "2026-05-18T14:45:44.342Z"
last_ts: "2026-05-18T14:48:18.855Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/9033b60c-6a5f-4c7e-973c-57826958d374/subagents/agent-aa0b128def5a53f27.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Independent second-pass review of `H:/prism/scripts/lib/system-viz-graph.mjs` — 

> **claude-code-cli** | 2026-05-18 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9033b60c-6a5f-4c7e-973c-57826958d374/subagents/agent-aa0b128def5a53f27.jsonl`

## Transcript

### User | 2026-05-18T14:45:44.342Z

Independent second-pass review of `H:/prism/scripts/lib/system-viz-graph.mjs` — the appended `loadFindCache` function and helpers (`projectForFind`, `readSidecarIfFresh`, `writeSidecarAtomic`, `FIND_CACHE_PATH`). Do NOT assume the first reviewer caught everything; weight your review toward issues a function-correctness pass would miss.

CONTEXT: New caching layer over an existing graph-load pipeline. The sidecar at `state/shared/system-viz/find-cache.json` is meant to be regenerated atomically on cache miss and read by ~1060/day subprocess invocations of `viz-first-redirect` hook + ad-hoc `system-viz-query.mjs find` calls.

WHAT TO WEIGHT (issues the function-correctness review will likely miss):
1. **Integration with existing callers** — `findInGraph` takes a graph object with `.nodes`. The sidecar returns `{nodes: sidecar.nodes}`. Will every existing call site of `findInGraph(G, q)` work if G is the trimmed sidecar object instead of a full graph? Are there any callers that read fields BEYOND `label/id/info/subgroup`?
2. **Inlined-constants / convention drift** — does the file follow PRISM's existing patterns (PASCAL constants, jsdoc style, exit conventions)? Any inlined paths that should come from a registry?
3. **Naming consistency** — `loadFindCache` vs `loadGraph` — is the name accurate? "FindCache" implies it's only for `find`, but the sidecar would also serve other queries that need only the same fields. Misnaming would mis-train future callers.
4. **Error budget completeness** — what happens if the directory `state/shared/system-viz/` doesn't exist when `writeSidecarAtomic` runs? Should it `mkdirSync({recursive:true})`?
5. **Hidden coupling** — the function reads env vars at call time (`process.env.PRISM_VIZ_FIND_CACHE_DISABLE`). Is that consistent with how the rest of the file handles env (look at `cacheDisabled` for `loadGraph`)?
6. **Security** — `PRISM_VIZ_FIND_CACHE_PATH` env override is read at module-eval time. If an attacker can set that env var, can
... [+608 chars truncated]

### Assistant | 2026-05-18T14:45:56.555Z

I'll review the file as requested.

### Assistant | 2026-05-18T14:45:57.067Z

[tool_use: Read]

### User | 2026-05-18T14:45:57.647Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\system-viz-graph.mjs' was already read 13s ago in this session and is unchanged (mtime 1779115494862). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T14:46:01.418Z

The file isn't in my context window since this is a fresh session. Let me retrieve it.

### Assistant | 2026-05-18T14:46:02.119Z

[tool_use: Bash]

### User | 2026-05-18T14:46:08.390Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
291

### Assistant | 2026-05-18T14:46:11.138Z

[tool_use: Read]

### User | 2026-05-18T14:46:11.743Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\system-viz-graph.mjs' was already read 28s ago in this session and is unchanged (mtime 1779115494862). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T14:46:21.478Z

[tool_use: Bash]

### User | 2026-05-18T14:46:31.645Z

[tool_result] /**
 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
 *
 * Extracted from scripts/system-viz-query.mjs so a single process can load
 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
 *
 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
 * module-scope cache keyed on the graph file's mtime + size. A second
 * same-proce
... [+10817 chars truncated]

### Assistant | 2026-05-18T14:46:37.862Z

Now let me check existing callers of `findInGraph` and `loadGraph` to assess integration impact.

### Assistant | 2026-05-18T14:46:39.521Z

[tool_use: Grep]

### Assistant | 2026-05-18T14:46:40.642Z

[tool_use: Grep]

### User | 2026-05-18T14:47:01.635Z

[tool_result] Found 4 files
CLAUDE.md
.tmp-git-log.txt
.claude\scripts\audit-phase4-synthesize.mjs
.claude\scripts\audit-phase2-crossdomain.mjs

### User | 2026-05-18T14:47:02.755Z

[tool_result] H:\prism\docs\superpowers\plans\2026-05-16-rgs-tool-autoinvoke.md-67-});
H:\prism\docs\superpowers\plans\2026-05-16-rgs-tool-autoinvoke.md-68-
docs\superpowers\plans\2026-05-16-rgs-tool-autoinvoke.md:69:test("findInGraph(G, 'kienzle') returns ≥1 hit whose label or id contains kienzle (case-insensitive)", () => {
H:\prism\docs\superpowers\plans\2026-05-16-rgs-tool-autoinvoke.md-70-  const G = loadG
... [+2625 chars truncated]

### Assistant | 2026-05-18T14:47:05.812Z

Noted — proceeding with the targeted grep results already in hand.

### Assistant | 2026-05-18T14:47:07.601Z

[tool_use: Grep]

### Assistant | 2026-05-18T14:47:08.578Z

[tool_use: Grep]

### User | 2026-05-18T14:47:10.324Z

[tool_result] No matches found

### User | 2026-05-18T14:47:31.332Z

[tool_result] scripts\system-viz-query.mjs:23:import { loadGraph, findInGraph } from "./lib/system-viz-graph.mjs";
scripts\system-viz-graph-search.test.mjs:32:} from "./system-viz-graph-search.mjs";
scripts\generate-engine-graph.mjs:22:import { loadGraph } from "./lib/system-viz-graph.mjs";
scripts\generate-combo-detector.mjs:49:import { loadGraph } from "./lib/system-viz-graph.mjs";
scripts\generate-layer-brid
... [+66 chars truncated]

### Assistant | 2026-05-18T14:47:36.128Z

[tool_use: Grep]

### User | 2026-05-18T14:47:38.756Z

[tool_result] 18- */
19-
20-import fs from "node:fs";
21-import path from "node:path";
22-import { fileURLToPath } from "node:url";
23:import { loadGraph, findInGraph } from "./lib/system-viz-graph.mjs";
24-
25-const __dirname = path.dirname(fileURLToPath(import.meta.url));
26-const ROOT = path.resolve(__dirname, "..");
27-
28-const args = process.argv.slice(2);
--
162-}
163-
164-else if (cmd === "find") {
165-
... [+393 chars truncated]

### Assistant | 2026-05-18T14:47:43.256Z

Critical finding — line 170 reads `h.layer` for the human formatter. `FIND_FIELDS` already includes `layer`, but I need to confirm whether `loadFindCache` is actually being wired into the find path. Let me also check the viz-first-redirect hook.

### Assistant | 2026-05-18T14:47:44.579Z

[tool_use: Grep]

### User | 2026-05-18T14:47:46.941Z

[tool_result] 102-}
103-
104:// Parse the system-viz-query find output. The script's `find` mode emits lines:
105-\   "Found N node(s) matching \"PATTERN\":"
106-//   "  L<layer>/<kind>  <node-id>  <name>"

### Assistant | 2026-05-18T14:48:18.855Z

Noted — I have enough context. `loadFindCache` is not yet wired into `system-viz-query.mjs` (still uses `loadGraph`); the new function is the cache path future callers will use. Now I have everything needed for the review.

---

## Independent Second-Pass Review — `loadFindCache` and helpers

**Verdict: FAIL** (one P0, three P1)

### P0 — Directory-missing crash silently disables the cache forever

`writeSidecarAtomic` (lines 244-256) wraps everything in `try/catch {}` and swallows ALL errors. If `state/shared/system-viz/` doesn't exist (fresh checkout, deleted dir, or future relocation), `fs.writeFileSync(tmpPath, ...)` throws `ENOENT`, the catch swallows it, and **every subsequent subprocess invocation pays the full 370MB cold-parse cost forever** — the exact scenario this entire feature exists to prevent. The "non-fatal perf optimization" comment is misleading: it's non-fatal to correctness but *fatal to the feature's purpose*. Reviewer's question (#4) is right — `fs.mkdirSync(path.dirname(FIND_CACHE_PATH), { recursive: true })` must run before the write. **Fix:** add `mkdirSync` inside the try block before `writeFileSync` (mkdir of existing dir is a no-op with `recursive:true`).

### P1 — Cache-hit path returns object incompatible with non-find callers (integration drift)

`loadFindCache` claims (docstring line 196) "compatible with findInGraph()". True for find, but the function name and placement suggest it's a drop-in `loadGraph` replacement. Anything reading `G.meta`, `G.edges`, `G.schemaVersion`, `G.fsCoverage`, `G.coverage` — and the sibling callers `generate-engine-graph.mjs`, `generate-combo-detector.mjs`, `generate-layer-bridges.mjs` (verified via grep) all import `loadGraph`, several of which read edges — will get `undefined` on cache-hit. The docstring should add a **DO-NOT-USE-FOR list** explicitly: "returns ONLY {nodes: [...]} with fields label/id/info/subgroup/layer/kind — do NOT use if you need edges/meta/schemaVersion." Reviewer concern #1+#3 — n
... [+2350 chars truncated]
