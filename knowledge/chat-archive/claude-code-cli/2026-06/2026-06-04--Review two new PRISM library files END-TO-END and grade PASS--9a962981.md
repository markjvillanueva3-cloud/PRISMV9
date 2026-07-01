---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a962981-7a23-49ca-a503-804671284925"
title: "Review two new PRISM library files END-TO-END and grade PASS/FAIL with explicit "
date: "2026-06-04"
first_ts: "2026-06-04T13:34:36.395Z"
last_ts: "2026-06-04T13:38:51.927Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/agent-a134aeda8a93ce8a1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review two new PRISM library files END-TO-END and grade PASS/FAIL with explicit 

> **claude-code-cli** | 2026-06-04 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/agent-a134aeda8a93ce8a1.jsonl`

## Transcript

### User | 2026-06-04T13:34:36.395Z

Review two new PRISM library files END-TO-END and grade PASS/FAIL with explicit P0/P1/P2 findings. Weight toward correctness, edge cases, and the load-bearing invariant.

Files:
1. H:/prism/scripts/lib/node-card-schema.mjs
2. H:/prism/scripts/lib/node-card-read.mjs
Also skim the tests (H:/prism/scripts/lib/node-card-schema.test.mjs, node-card-read.test.mjs) and the CLI wiring block in H:/prism/scripts/system-viz-query.mjs (the `cmd === "node" || "card" || "node-card"` short-circuit).

CONTEXT: This is CHEAP-NODE-ACCESS-MS0 (slot:sierra). Goal: read ANY of ~302K system-viz graph nodes by id in ~200 tokens WITHOUT loading the 644MB system-graph.json (the status-quo `Read` of which costs ~186K tokens). The reader sources the freshest compact sidecar: system-graph-index.json (302K nodes, {id,label,layer,status,info,knowledge:{wikiEntries,memoryEntries}}) preferred, find-cache.json ({id,label,layer,subgroup,info,noteCount}) as fallback. node-capability-index.json enriches with kind/wikiPath/pointerPath.

THE LOAD-BEARING INVARIANT to verify: the reader must NEVER read (JSON.parse) the 644MB graph — it may only STAT it (size/mtime) for staleness. freshnessOf() reads only a 2048-byte HEAD of each sidecar via regex to extract sourceMtimeMs/sourceSize(Bytes). buildIndex() picks the freshest EXISTING source, refuses (throws) if none exist.

Check specifically:
1. Is the no-graph-load invariant actually upheld in every code path (hit, miss, stale, missing-sidecar, batch)? Any path that could fall through to a full-graph parse?
2. freshnessOf head-regex: is 2048 bytes ALWAYS enough to contain sourceMtimeMs + sourceSize for both sidecar formats? What if the stamps appear after 2048 bytes, or are absent? Is the "can't verify → not stale" default safe (could it serve stale data as fresh)?
3. The module cache (`_cacheByPath`) keyed on chosen.path + mtime + size — any staleness/correctness bug if two different `paths` objects resolve to the same chosen path, or if a file changes mid
... [+834 chars truncated]

### Assistant | 2026-06-04T13:34:58.129Z

I'll review these files end-to-end. Let me read all the relevant files in parallel.

### Assistant | 2026-06-04T13:34:58.656Z

[tool_use: Read]

### Assistant | 2026-06-04T13:34:59.047Z

[tool_use: Read]

### Assistant | 2026-06-04T13:34:59.774Z

[tool_use: Read]

### Assistant | 2026-06-04T13:34:59.779Z

[tool_use: Read]

### User | 2026-06-04T13:35:05.881Z

[tool_result] 1	/**
2	 * node-card-schema.mjs — the compact "node card" record shape for token-cheap
3	 * node reads (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * THE PROBLEM: status-quo "find + read a node" loads the 644MB system-graph.json
6	 * to extract one node — ~186K tokens per access. A NodeCard is the minimal record
7	 * that lets an agent IDENTIFY + LOCATE a node (and route to its source doc) WITHOU
... [+5612 chars truncated]

### User | 2026-06-04T13:35:06.480Z

[tool_result] 1	/**
2	 * node-card-read.mjs — token-cheap read-by-id over the system-viz node substrate
3	 * (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * `readCard(id)` returns a compact NodeCard (~200 tokens) for ANY of the ~302K
6	 * graph nodes WITHOUT loading the 644MB system-graph.json. It reads only:
7	 *   - find-cache.json (~55MB, already fresh + regenerated each regen-viz): the
8	 *     card basics 
... [+7840 chars truncated]

### User | 2026-06-04T13:35:08.226Z

[tool_result] 1	/**
2	 * node-card-schema.test.mjs — verifies the compact NodeCard projection contract.
3	 */
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import { kindFromId, makeCard, assertCard, CARD_SCHEMA_VERSION, CARD_FIELDS } from "./node-card-schema.mjs";
7	
8	test("kindFromId derives the namespace prefix (or null)", () => {
9	  assert.equal(kindFromId("eng.mill"), "e
... [+3345 chars truncated]

### User | 2026-06-04T13:35:08.409Z

[tool_result] 1	/**
2	 * node-card-read.test.mjs — verifies the token-cheap reader's INTENT:
3	 *   1. it prefers the FRESH, richer system-graph-index (knowledge doc pointers),
4	 *   2. it falls back to find-cache when the index is absent,
5	 *   3. it NEVER reads the 644MB graph (proven with a poison-pill graph fixture
6	 *      that would throw if ever JSON-parsed),
7	 *   4. it flags staleness instead of si
... [+7474 chars truncated]

### Assistant | 2026-06-04T13:35:13.624Z

Now let me read the CLI wiring block in system-viz-query.mjs and verify the actual sidecar formats to confirm stamp placement.

### Assistant | 2026-06-04T13:35:14.922Z

[tool_use: Grep]

### User | 2026-06-04T13:35:24.294Z

[tool_result] 15: *   node scripts/system-viz-query.mjs node-card <id> [<id>..]  # token-cheap read-by-id (no 644MB load)
25:import { readCards } from "./lib/node-card-read.mjs";
36:  console.error("usage: system-viz-query <roadmap-candidates|build-order|blast-radius|dispatcher-summary|coverage-by-domain|worktrees|find|node-card|headline|cache-status> [params] [--json]");
102:// scripts/lib/node-card-read.mjs a
... [+369 chars truncated]

### Assistant | 2026-06-04T13:35:29.147Z

Let me read the full CLI wiring block and verify the actual sidecar head format on disk.

### Assistant | 2026-06-04T13:35:30.212Z

[tool_use: Read]

### Assistant | 2026-06-04T13:35:32.223Z

[tool_use: Bash]

### User | 2026-06-04T13:35:35.605Z

[tool_result] 95	  process.exit(s.graph.exists && s.findCache.fresh && s.index.fresh ? 0 : 1);
96	}
97	
98	// NODE-CARD SHORT-CIRCUIT — token-cheap read-by-id (CHEAP-NODE-ACCESS-MS0, sierra).
99	// MUST run BEFORE the eager loadGraph() below, exactly like `find`/`cache-status`:
100	// a card read that loaded the 644MB graph would defeat its own purpose. Sources
101	// the freshest compact sidecar (system-graph-
... [+2867 chars truncated]

### User | 2026-06-04T13:35:40.582Z

[tool_result] === system-graph-index.json (size 202460402) HEAD 600 bytes ===
{"schemaVersion":"1.0.0","generatedAt":"2026-06-04T13:01:25.020Z","sourceGraph":"system-graph.json","sourceMtimeMs":1780578067486.758,"sourceSizeBytes":675859110,"nodeCount":302481,"nodes":[{"id":"p.operator","label":"Operator","layer":"L0","status":"built","info":"Shop floor — runs jobs, scans travelers, reports SPC","knowledge":{"wi
... [+913 chars truncated]

### Assistant | 2026-06-04T13:35:48.753Z

I now have the real on-disk data. Both stamps appear within the first ~120 bytes — well within the 2048-byte head. Let me verify a few specifics: whether `system-graph-index` find-cache records can have an `id` before `label` matters (it doesn't for Map building), and confirm the actual graph size matches the stamp (675859110 bytes = ~644MB).

Let me check one edge case — whether the `find-cache` format ever puts records where `id` is missing, and verify there's no `__proto__` hazard with the Map (Map is prototype-safe, but let me confirm makeCard's object literal isn't vulnerable). Let me also verify the actual graph size to confirm the staleness comparison is live-accurate.

### Assistant | 2026-06-04T13:35:50.440Z

[tool_use: Bash]

### User | 2026-06-04T13:36:03.654Z

[tool_result] live graph size: 675859110
index stamp sourceSizeBytes: 675859110
find-cache stamp sourceSize: 675859110
--- run schema tests ---
  ...
# Subtest: assertCard fails loud on a malformed card
ok 13 - assertCard fails loud on a malformed card
  ---
  duration_ms: 0.7937
  ...
# Subtest: schema version is pinned
ok 14 - schema version is pinned
  ---
  duration_ms: 0.1412
  ...
1..14
# tests 14
# suite
... [+80 chars truncated]

### Assistant | 2026-06-04T13:36:20.861Z

All 14 tests pass, live graph size matches the stamps exactly, and both stamps are in the first ~120 bytes. Let me verify a couple of subtle correctness points by reading the actual freshness logic edge: the `__proto__` id hazard in `makeCard`'s returned object literal, and whether `byId.has`/`set`/`get` with a key like `__proto__` is safe (Map is safe; object literal property assignment of `card.id = "__proto__"` is just a normal own property, safe). Let me also double check the relDocPath regex against an already-relative path and a traversal attempt.

### Assistant | 2026-06-04T13:36:28.665Z

[tool_use: Bash]

### User | 2026-06-04T13:37:18.974Z

[tool_result] relDocPath tests:
  abs win: "knowledge/wiki/a.md"
  abs fwd: "knowledge/wiki/a.md"
  already-rel: "knowledge/wiki/a.md"
  rel mid-segment: "knowledge/wiki/a.md"
  traversal: "../../etc/passwd"
  weird abs no anchor: "D:/random/file.md"
  non-string: 123
  C: drive prefix (not /prism/): ".claude/projects/x.md"

__proto__ / constructor id:
  __proto__ card id: "__proto__" polluted Object.prototype?
... [+104 chars truncated]

### Assistant | 2026-06-04T13:37:34.323Z

All probes confirm the behavior. A few notes worth flagging:
- `relDocPath("some/knowledge/wiki/a.md")` → `"knowledge/wiki/a.md"` — the regex anchors on any `/knowledge/` mid-segment, so a path like `some/knowledge/...` gets re-rooted. Minor — only matters for genuinely-relative inputs that happen to contain a `knowledge|state|mcp-server|scripts|.claude` segment mid-path. In practice doc pointers are absolute repo paths or already-correct relative paths, so low risk.
- `relDocPath("C:/Users/wompu/.claude/projects/x.md")` → `".claude/projects/x.md"` — a private C: memory path gets relativized as if it were a repo path. Cosmetic, not a correctness/security bug (it's a display string).
- No prototype pollution: object-literal assignment of `card.id = "__proto__"` is a normal own property; Map keys are prototype-safe. Confirmed clean.

Let me confirm the freshness comparison handles the float `mtimeMs` correctly (stamp is `1780578067486.758`, a float) — the regex `[0-9.]+` captures it, and the 1000ms tolerance covers FS mtime precision. Let me also verify one final invariant concern: what happens if the index head's stamp is missing entirely (older format) — does "can't verify → not stale" risk serving stale-as-fresh?

### Assistant | 2026-06-04T13:37:43.161Z

[tool_use: Bash]

### User | 2026-06-04T13:37:56.597Z

[tool_result] no-stamp index chosen? system-graph-index | stale: false | reason: null
>>> A stampless index is ALWAYS treated fresh & preferred — even when find-cache has REAL fresh stamps. Index wins by order, stale=false because unverifiable.

### Assistant | 2026-06-04T13:38:51.927Z

This confirms the one real correctness concern (P2, bounded). I now have everything needed. Let me write the review.

---

## Code Quality Analysis Report — CHEAP-NODE-ACCESS-MS0 node-card reader

### Summary
- Files analyzed: 2 library + 2 tests + 1 CLI wiring block
- Overall quality: high. Clean, well-documented, the load-bearing invariant holds.
- All 14 tests pass; live graph size (675,859,110 B) exactly matches both sidecar stamps; both stamps sit in the first ~120 bytes (far inside the 2048-byte head).
- Issues found: 0 P0, 0 P1, 3 P2, 2 P3.

---

### The load-bearing invariant: VERIFIED HELD

The 644MB `system-graph.json` is **never JSON-parsed** in any code path. I traced every branch:

- `freshnessOf` (`node-card-read.mjs:59-92`) — opens the **sidecar** with `openSync`/`readSync` for a 2048-byte head, and only `statSync`s the graph (`:80`). Never reads graph bytes.
- `buildIndex` (`:94-140`) — `JSON.parse` is called only on `chosen.path` (`:113`, a sidecar from `SOURCES`, which contains only `graphIndex`/`findCache` — never `graph`) and on `paths.capIndex` (`:122`). The graph path is passed to `freshnessOf` for stat-only.
- Hit / miss / stale / missing-sidecar / batch — all route through `buildIndex`; none can reach the graph. When no sidecar exists, it **throws** (`:100-106`) rather than falling through (`readCards` surfaces that per-id as `{id,error}`, `:172-174`).
- The CLI short-circuit (`system-viz-query.mjs:104-149`) runs **before** the eager `loadGraph()` at `:152`, mirroring `find`/`cache-status`. Correct placement — verified by reading the control flow.

The poison-pill test (`node-card-read.test.mjs:114-118`, `:151`) is a genuine invariant guard: the graph fixture is the literal string `POISON`, which would throw if ever `JSON.parse`d, and the test asserts it stays byte-identical. Good R12/R9 test.

---

### Findings

**P2-1 — A stampless sidecar is silently treated as fresh AND wins by preference order, which can serve stale-as-fresh.** `node-car
... [+7149 chars truncated]
