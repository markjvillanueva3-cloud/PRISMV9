---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a962981-7a23-49ca-a503-804671284925"
title: "Independent second-pass review (do NOT assume reviewer A caught everything) of t"
date: "2026-06-04"
first_ts: "2026-06-04T13:34:55.782Z"
last_ts: "2026-06-04T13:44:32.110Z"
cwd: "H:\\prism"
messages: 66
user_msgs: 26
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/agent-a97352c9a45fa4197.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Independent second-pass review (do NOT assume reviewer A caught everything) of t

> **claude-code-cli** | 2026-06-04 | 66 msgs (26 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/agent-a97352c9a45fa4197.jsonl`

## Transcript

### User | 2026-06-04T13:34:55.782Z

Independent second-pass review (do NOT assume reviewer A caught everything) of two new PRISM library files + their CLI wiring. Grade PASS/FAIL with P0/P1/P2 findings. Weight toward integration, hidden coupling, R12 fail-loud, naming conventions, and token-economy intent.

Files (read END-TO-END):
1. H:/prism/scripts/lib/node-card-schema.mjs
2. H:/prism/scripts/lib/node-card-read.mjs
3. The CLI block in H:/prism/scripts/system-viz-query.mjs (the `node`/`card`/`node-card` short-circuit — confirm it runs BEFORE the eager `loadGraph()` at ~line 96, like the `find` and `cache-status` short-circuits do).
Also skim: H:/prism/scripts/lib/node-card-read.test.mjs, node-card-schema.test.mjs, .claude/commands/node-card.md.

CONTEXT: CHEAP-NODE-ACCESS-MS0 (sierra). The deliverable lets fleet agents read any of ~302K system-viz nodes by id in ~200 tokens via `node scripts/system-viz-query.mjs node-card <id>` instead of `Read`-ing the 644MB system-graph.json (~186K tokens). REUSE-not-rebuild: it reuses the already-fresh find-cache.json + the fresh-but-orphaned system-graph-index.json + node-capability-index.json sidecars — NO new heavy build. Sierra's soul forbids: editing system-graph.json directly, pretty-printing the merged graph, a 2nd concurrent writer, silently continuing past a stale graph (R12).

Check specifically:
1. INTEGRATION: does the CLI short-circuit correctly precede loadGraph()? Does it handle 0 ids, 1 id, many ids, not-found, stale, and the thrown "no compact sidecar" error gracefully (right exit codes, no crash)? Is `readCards` imported + used correctly?
2. The opts.paths MERGE footgun: `{...DEFAULT_PATHS, ...opts.paths}` means a PARTIAL path override leaks the real defaults for unspecified keys. Is this documented? Could a real (non-test) caller be bitten? Is the test isolation now correct (complete fixture path sets)?
3. R12 fail-loud: when NO sidecar exists it throws (good) — but does ANY path silently degrade or return a wrong-but-plausible card? Does the `
... [+978 chars truncated]

### Assistant | 2026-06-04T13:35:13.084Z

I'll perform an independent second-pass review of these files. Let me read everything end-to-end.

### Assistant | 2026-06-04T13:35:13.615Z

[tool_use: Read]

### Assistant | 2026-06-04T13:35:13.895Z

[tool_use: Read]

### Assistant | 2026-06-04T13:35:14.650Z

[tool_use: Read]

### Assistant | 2026-06-04T13:35:15.091Z

[tool_use: Read]

### Assistant | 2026-06-04T13:35:15.571Z

[tool_use: Read]

### User | 2026-06-04T13:35:18.007Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\node-card-schema.mjs' was already read 15s ago in this session and is unchanged (mtime 1780546138052). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T13:35:18.760Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\node-card-read.mjs' was already read 16s ago in this session and is unchanged (mtime 1780546247763). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T13:35:20.235Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\node-card-read.test.mjs' was already read 16s ago in this session and is unchanged (mtime 1780579778478). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T13:35:20.384Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\node-card-schema.test.mjs' was already read 17s ago in this session and is unchanged (mtime 1780579803425). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T13:35:25.613Z

[tool_result] 1	---
2	name: node-card
3	description: Token-cheap read-by-id for ANY system-viz graph node. Returns a node's compact card (label, layer, kind, status, info, + the wiki/memory docs that document it) in ~200 tokens WITHOUT loading the 644MB system-graph.json. Use after `find` gives you an id, or whenever you know a node id and need its record + where to read more. CHEAP-NODE-ACCESS-MS0 (sierra).
4	
... [+2193 chars truncated]

### Assistant | 2026-06-04T13:35:34.349Z

The files are already in my context from a prior read this session, but I need to verify them fresh. Let me re-read them with the cache disabled to ensure I'm reviewing the actual current content, and read the CLI block in system-viz-query.mjs.

### Assistant | 2026-06-04T13:35:35.734Z

[tool_use: Bash]

### Assistant | 2026-06-04T13:35:36.239Z

[tool_use: Bash]

### User | 2026-06-04T13:35:47.696Z

[tool_result]      1	/**
     2	 * node-card-schema.mjs — the compact "node card" record shape for token-cheap
     3	 * node reads (CHEAP-NODE-ACCESS-MS0, slot:sierra).
     4	 *
     5	 * THE PROBLEM: status-quo "find + read a node" loads the 644MB system-graph.json
     6	 * to extract one node — ~186K tokens per access. A NodeCard is the minimal record
     7	 * that lets an agent IDENTIFY + LOCATE a node (
... [+6048 chars truncated]

### User | 2026-06-04T13:36:01.622Z

[tool_result]      1	/**
     2	 * node-card-read.mjs — token-cheap read-by-id over the system-viz node substrate
     3	 * (CHEAP-NODE-ACCESS-MS0, slot:sierra).
     4	 *
     5	 * `readCard(id)` returns a compact NodeCard (~200 tokens) for ANY of the ~302K
     6	 * graph nodes WITHOUT loading the 644MB system-graph.json. It reads only:
     7	 *   - find-cache.json (~55MB, already fresh + regenerated each re
... [+8504 chars truncated]

### Assistant | 2026-06-04T13:36:09.095Z

Now let me read the CLI block in system-viz-query.mjs and the test files.

### Assistant | 2026-06-04T13:36:09.097Z

[tool_use: Bash]

### Assistant | 2026-06-04T13:36:09.606Z

[tool_use: Bash]

### User | 2026-06-04T13:36:21.909Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * system-viz-query — programmatic adapter for the live system graph.
     4	 *
     5	 * Lets rgs / forge / roadmap tools consume system-graph.json without
     6	 * embedding parsing logic. Read-only.
     7	 *
     8	 * Usage:
     9	 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
    10	 *   node scripts/s
... [+6972 chars truncated]

### User | 2026-06-04T13:37:19.004Z

[tool_result]      1	/**
     2	 * node-card-read.test.mjs — verifies the token-cheap reader's INTENT:
     3	 *   1. it prefers the FRESH, richer system-graph-index (knowledge doc pointers),
     4	 *   2. it falls back to find-cache when the index is absent,
     5	 *   3. it NEVER reads the 644MB graph (proven with a poison-pill graph fixture
     6	 *      that would throw if ever JSON-parsed),
     7	 *   
... [+8087 chars truncated]

### Assistant | 2026-06-04T13:37:25.387Z

Now let me read the rest of the CLI block (lines 130-end of the node-card section) and the schema test file.

### Assistant | 2026-06-04T13:37:26.750Z

[tool_use: Bash]

### Assistant | 2026-06-04T13:37:26.980Z

[tool_use: Bash]

### User | 2026-06-04T13:37:37.783Z

[tool_result]      1	      continue;
     2	    }
     3	    const c = r.card;
     4	    const docs = c.docTotals ? `${c.docTotals.wiki}w/${c.docTotals.memory}m` : `${c.noteCount}`;
     5	    lines.push(`${c.id}  [${c.layer ?? "?"} · ${c.kind ?? "?"}${c.status ? " · " + c.status : ""}]  docs:${docs}${r.stale ? `  ⚠STALE(${r.staleReason})` : ""}`);
     6	    if (c.label) lines.push(`  ${c.label.split("\n")[0]
... [+2527 chars truncated]

### User | 2026-06-04T13:37:55.462Z

[tool_result]      1	/**
     2	 * node-card-schema.test.mjs — verifies the compact NodeCard projection contract.
     3	 */
     4	import { test } from "node:test";
     5	import assert from "node:assert/strict";
     6	import { kindFromId, makeCard, assertCard, CARD_SCHEMA_VERSION, CARD_FIELDS } from "./node-card-schema.mjs";
     7	
     8	test("kindFromId derives the namespace prefix (or null)", () => {
   
... [+3654 chars truncated]

### Assistant | 2026-06-04T13:38:01.457Z

I have the full CLI block now. Let me verify a few integration claims: the freshness stamp field name consistency (`sourceSize` vs `sourceSizeBytes`), what the real production sidecars actually use, and whether `loadFindCache`/`sidecarStatus` exist as claimed. Let me also confirm the real production find-cache staleness state and the actual stamp field names.

### Assistant | 2026-06-04T13:38:04.283Z

[tool_use: Bash]

### Assistant | 2026-06-04T13:38:04.847Z

[tool_use: Grep]

### User | 2026-06-04T13:38:14.304Z

[tool_result] 147:export function loadGraph({ fresh = false } = {}) {
199:export function findInGraph(G, terms, { limit = 30 } = {}) {
362:export function loadFindCache({ fresh = false } = {}) {
501:export function sidecarStatus() {

### User | 2026-06-04T13:38:17.813Z

[tool_result] === find-cache head ===
{"schemaVersion":1,"generatedAt":"2026-06-04T13:03:11.590Z","sourceMtimeMs":1780578067486.758,"sourceSize":675859110,"nodes":[{"label":"Operator","id":"p.operator","info":"Shop floor — runs jobs, scans travelers, reports SPC","subgroup":"personas","layer":"L0","noteCount":16},{"label":"Programmer","id":"p.programmer","info":"Quotes, CAM programming, post-process, prove-out"
... [+768 chars truncated]

### Assistant | 2026-06-04T13:38:27.887Z

This is a critical finding. The real production sidecars use DIFFERENT stamp field names:
- `find-cache.json`: `sourceSize` (no "Bytes")
- `system-graph-index.json`: `sourceSizeBytes`

The `freshnessOf` regex `"sourceSize(?:Bytes)?"` handles both — good. Let me now verify the staleness behavior against the real production data, since the find-cache is reportedly STALE in production. The graph mtime/size recorded is `1780578067486.758` / `675859110`. Let me check the live graph stat and confirm the reader surfaces staleness truthfully.

### Assistant | 2026-06-04T13:38:30.709Z

[tool_use: Bash]

### User | 2026-06-04T13:38:46.420Z

[tool_result] live graph: size=675859110 mtimeMs=1780578067486.758
graph-index recorded: size=675859110 mtimeMs=1780578067486.758
find-cache  recorded: size=675859110 mtimeMs=1780578067486.758
size match: true
mtime drift ms: 0

### Assistant | 2026-06-04T13:38:56.369Z

In this working tree the sidecars are currently FRESH (size + mtime match exactly), not stale. Now let me run the actual reader against real production data to confirm end-to-end behavior, output size, and the staleness reporting path, plus run the tests.

### Assistant | 2026-06-04T13:38:57.473Z

[tool_use: Bash]

### User | 2026-06-04T13:39:10.902Z

[tool_result] === single id (human) ===
source: system-graph-index

eng.mill  [L5 · eng · stub]  docs:16
  mill
  info: Mill: 21/24 engines wired (88%) — 3 need wiring
  wiki: knowledge/wiki/architecture/actions/aireasoning/ai-mill-adaptive-strategy.md
        knowledge/wiki/architecture/actions/aireasoning/ai-mill-agi-reason.md
        knowledge/wiki/architecture/actions/aireasoning/ai-mill-awareness-query.md

... [+154 chars truncated]

### Assistant | 2026-06-04T13:39:17.611Z

Notice: `docs:16` but the wiki list shows only 3 entries inline (capped with slice(0,3)). But there's no `… +N more` marker shown here even though there are clearly more than 3 wiki docs. Let me investigate the `docTotals` logic — the `… +N more` only appears when `docTotals` is set, which only happens when `wikiAll.length > DOC_CAP` (8). With exactly 16 noteCount but maybe fewer than 8 wiki entries, the "+N more" wouldn't show. Let me check the actual token size, the multi-id path, not-found, json bounding, and an edge case where wiki entries are between 4 and 8.

### Assistant | 2026-06-04T13:39:19.409Z

[tool_use: Bash]

### User | 2026-06-04T13:39:53.047Z

[tool_result] === token-size probe (chars) for eng.mill single human ===
517
=== many ids ===
source: system-graph-index

eng.mill  [L5 · eng · stub]  docs:16
  mill
  info: Mill: 21/24 engines wired (88%) — 3 need wiring
  wiki: knowledge/wiki/architecture/actions/aireasoning/ai-mill-adaptive-strategy.md
        knowledge/wiki/architecture/actions/aireasoning/ai-mill-agi-reason.md
        knowledge/wiki/archit
... [+852 chars truncated]

### Assistant | 2026-06-04T13:40:03.596Z

517 chars for a single richly-documented node ≈ ~150-200 tokens — the token-economy goal holds. But I see an important issue: `eng.mill` shows `docs:16` and 3 wiki entries inline, but no `… +N more` marker. The node has 16 noteCount but apparently the `knowledge.wikiEntries` array carried in the index may have more than 3 but the "+N more" only triggers when `docTotals` exists (>8 entries). Let me check the actual `wikiEntries` count in the real index for eng.mill to see if there's a silent truncation gap between slice(0,3) display and the DOC_CAP=8 stored — meaning entries 4-8 are stored in the card but never displayed in human output and never counted in "+N more".

### Assistant | 2026-06-04T13:40:04.651Z

[tool_use: Bash]

### User | 2026-06-04T13:40:21.212Z

[tool_result] === eng.mill --json (bounded?) ===
{
  "card": {
    "id": "eng.mill",
    "label": "mill\n(64 engines) ◇ 9/70 drilled",
    "layer": "L5",
    "kind": "eng",
    "status": "stub",
    "info": "Mill: 21/24 engines wired (88%) — 3 need wiring",
    "noteCount": 16,
    "wikiEntries": [
      "knowledge/wiki/architecture/actions/aireasoning/ai-mill-adaptive-strategy.md",
      "knowledge/wiki/archit
... [+1128 chars truncated]

### Assistant | 2026-06-04T13:40:32.558Z

This confirms a real behavior nuance. `eng.mill` has `noteCount:16` but the index's `knowledge.wikiEntries` and `memoryEntries` are EACH already capped at 8 in the source index (8 wiki + 8 mem = 16 = noteCount). So `wikiAll.length` (8) is NOT `> DOC_CAP` (8), so `docTotals` is never set, so the human output shows 3 with NO "+N more" — meaning entries 4-8 of the wiki array are silently invisible in human output, and the user has no signal there are 5 more. This is a minor honesty/UX gap but not a correctness bug. The JSON path carries all 8 (bounded by DOC_CAP=8), so it IS bounded. Good.

Let me verify the `docTotals`/`+N more` path actually works when the source has >8 entries, run the tests, and check the 0-id and stale-surfacing edge behaviors.

### Assistant | 2026-06-04T13:40:34.856Z

[tool_use: Bash]

### Assistant | 2026-06-04T13:40:36.120Z

[tool_use: Bash]

### User | 2026-06-04T13:40:47.478Z

[tool_result] === 0 ids ===
node-card <nodeId> [<nodeId>...]  — token-cheap read-by-id (no 644MB graph load). Find ids via: system-viz-query find <query>
EXIT(0ids): 2

=== alias 'node' ===
source: system-graph-index

eng.mill  [L5 · eng · stub]  docs:16
EXIT(node): 0

=== alias 'card' ===
source: system-graph-index

eng.mill  [L5 · eng · stub]  docs:16
EXIT(card): 0

### User | 2026-06-04T13:40:56.878Z

[tool_result] === node-card-read tests ===
  ...
# Subtest: NO compact sidecar present fails loud (refuses the 644MB fallback)
ok 8 - NO compact sidecar present fails loud (refuses the 644MB fallback)
  ---
  duration_ms: 1.5443
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 153.5821
=== schema tests ===
# tests 6
# suites 0
# pass 6
# fail 0
# cancelled 0
# s
... [+39 chars truncated]

### Assistant | 2026-06-04T13:41:04.140Z

All 14 tests pass (8 reader + 6 schema). Aliases work, 0-ids returns exit 2 with usage. Now let me verify the staleness-surfacing path with a real stale scenario (force a stale stamp) to confirm `⚠STALE` reaches the human output AND the `stale` flag reaches the importable API. Let me also confirm the `kind` discrepancy: the doc and test claim `eng.mill` kind should be `engine-domain` from the capability index, but the live run shows `kind: eng` (id-prefix fallback) — meaning the capability index does NOT have an `eng.mill` pointer. Let me check that, plus there's an important observation about `kind: ghost · ghost` (kind and status both "ghost").

### Assistant | 2026-06-04T13:41:06.539Z

[tool_use: Bash]

### User | 2026-06-04T13:41:10.242Z

[tool_result] cap has eng.mill pointer? false
sample eng.* cap keys: []
total cap pointers: 9166

### Assistant | 2026-06-04T13:41:12.201Z

[tool_use: Bash]

### User | 2026-06-04T13:41:28.390Z

[tool_result] (node:60896) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\lib\node-card-read.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
--- (require of .mjs fails as expected; use import probe instead) ---
API stale flag:
... [+51 chars truncated]

### Assistant | 2026-06-04T13:41:42.605Z

The staleness flag truthfully reaches the importable API (`r.stale: true, reason: graph-size-changed`). Now an interesting finding on the capability index: there are NO `eng.*` pointers at all — the cap keys are namespaced differently (`algorithm.*`, etc.). So `eng.mill`'s kind falls back to id-prefix `eng`, NOT `engine-domain`. The test fixture and the doc example (`kind · engine-domain`, `docs:16`) imply cap enrichment happens for `eng.mill`, but in production it does NOT — the cap index doesn't key engine-domain nodes by `eng.<x>`. This is a doc/test-vs-reality mismatch worth noting, though not a correctness bug (the id-prefix fallback is by design and works).

Let me confirm what namespaces the cap index actually covers and whether ANY real graph node gets cap enrichment, to gauge whether the capability-index integration is effectively dead in production.

### Assistant | 2026-06-04T13:41:47.038Z

[tool_use: Bash]

### User | 2026-06-04T13:42:08.511Z

[tool_result] cap-index prefixes: {"algorithm":61,"course":35,"engine":1,"formula":7316,"milestone":550,"registry":102,"tribal":1101}
graph-index nodes: 302481 | nodes with a cap pointer match: 0 (0.00%)

### Assistant | 2026-06-04T13:42:23.805Z

This is a significant integration finding. The capability index keys nodes by `engine.*`, `algorithm.*`, `formula.*`, `course.*`, `milestone.*`, `registry.*`, `tribal.*` — but the GRAPH (and graph-index/find-cache) keys the same nodes by `eng.*`, `disp.*`, `ghost.*`, `wiki.*`, `memory_*`, etc. The id namespaces DO NOT MATCH. Result: **0 of 302,481 nodes get capability-index enrichment in production.** The `capById.get(id)` lookup always misses, so `wikiPath`/`pointerPath`/the canonical `kind` from the cap index are NEVER populated for any real node. Every card's `kind` is the id-prefix fallback.

This means the entire `node-capability-index.json` integration is dead code in production — it works only in the test fixture (which deliberately keys by `eng.mill` to match the graph namespace). The reader still functions (the knowledge doc pointers come from `system-graph-index`'s own `knowledge` field, not the cap index), so the deliverable's core value holds — but a claimed enrichment source contributes nothing, and the doc/`/node-card.md` example showing `kind · engine-domain` with a `src:` wikiPath line will essentially never render in production.

Let me confirm the `src:` line never appears in real output (since `wikiPath` only comes from the cap index) and check the schema-test header comment claim about `loadFindCache` being the reused hot path.

### Assistant | 2026-06-04T13:42:28.317Z

[tool_use: Bash]

### User | 2026-06-04T13:43:09.710Z

[tool_result] === does ANY real card render a 'src:' line (cap wikiPath)? sample 12 varied ids ===
eng.mill : no src
eng.lathe : no src
eng.wedm : no src
disp.calc : no src
ghost.galaxy.wedm : no src
wiki.architecture.fleet-reaper : no src
p.operator : no src
algorithm.alg_kalmanfilter : no src
formula.kienzle : no src
tribal.x : no src
registry.materials : no src
course.0a : no src

### Assistant | 2026-06-04T13:43:16.649Z

Confirmed: NO real node renders the `src:` line — the capability-index integration produces zero enrichment across all namespaces. Let me do a final check on two things: (1) the `freshnessOf` mtime tolerance vs the fractional mtime (`.758`) — `Math.abs` with 1000ms tolerance is fine; (2) whether the multi-id `source:` header is misleading when sources differ across ids (it picks the first row with a source), and (3) confirm the duplication check — that this doesn't overlap an existing read-by-id tool.

### Assistant | 2026-06-04T13:43:17.211Z

[tool_use: Grep]

### Assistant | 2026-06-04T13:43:21.136Z

[tool_use: Bash]

### User | 2026-06-04T13:43:24.006Z

[tool_result] Found 8 files
scripts\system-viz-query.mjs
scripts\lib\node-card-schema.test.mjs
scripts\lib\node-card-read.test.mjs
scripts\lib\node-card-read.mjs
scripts\lib\node-card-schema.mjs
scripts\lib\galaxy-context-card.mjs
scripts\lib\galaxy-context-card.test.mjs
scripts\galaxy-context-card.mjs

### User | 2026-06-04T13:43:33.109Z

[tool_result] === can two ids resolve to different sources? (index has p.operator; force one id only in find-cache) — checking header logic only ===
sources seen: [ 'system-graph-index' ]
notFound rows carry source?: [ undefined ]

### Assistant | 2026-06-04T13:44:32.110Z

Single `buildIndex` per process means all ids share one source — so the `source:` header is always consistent within a single CLI invocation. No correctness issue there. The `galaxy-context-card.mjs` is a different concept (34 galaxy cards, not arbitrary node read-by-id), so no duplication. This is genuinely the missing read-by-id half of `find` — no overlap.

Let me do one final verification: the `relDocPath` regex behavior on the real wiki entries (already confirmed relativized correctly in output above: `knowledge/wiki/...`), and confirm the schema header comment in node-card-read.mjs that claims it "Reuses the find-cache that loadFindCache ... already maintain" — verifying it doesn't import or call loadFindCache (it reads the files directly, a parallel reader, not literally reusing the function). That's a minor honesty nuance in the doc comment.

I have enough to deliver the review.

---

# Independent Second-Pass Review — CHEAP-NODE-ACCESS-MS0 (sierra)

**Verdict: PASS** (with 1 P1 and several P2s — none block, but the P1 is a real integration dead-spot that should be fixed or honestly documented).

All 14 tests pass (8 reader + 6 schema). Core deliverable works end-to-end against real production data: `eng.mill` reads in 517 chars (~150-180 tokens) vs ~186K for a graph Read. The short-circuit is correctly placed, R12 fail-loud holds, and staleness reaches both the CLI and the importable API truthfully.

## Findings by check

### 1. INTEGRATION (CLI short-circuit) — PASS
- `system-viz-query.mjs:104` (`cmd === "node" || "card" || "node-card"`) runs at line 104, **before** the eager `loadGraph()` at line 152 — same pattern as `find` (line 46) and `cache-status` (line 83). Confirmed by live run: a card read never parses the 644MB graph (poison-pill test #3 + `NO-GRAPH-LOAD` test pass).
- 0 ids → `system-viz-query.mjs:106-109` exit 2 + usage. ✓
- 1 id → unwraps `rows[0]` in `--json` (line 118). ✓
- many ids → array, one `buildIndex` for the batch. ✓
- not-found → `
... [+8048 chars truncated]
