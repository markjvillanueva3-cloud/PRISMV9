---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Per-file scrutiny arm A on U-P2-GRAPH-SEARCH-MASTERINDEX (PRISM SYSTEM-VIZ-BRAIN"
date: "2026-05-17"
first_ts: "2026-05-17T16:16:11.487Z"
last_ts: "2026-05-17T16:16:47.937Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a646df700b5ecc832.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Per-file scrutiny arm A on U-P2-GRAPH-SEARCH-MASTERINDEX (PRISM SYSTEM-VIZ-BRAIN

> **claude-code-cli** | 2026-05-17 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a646df700b5ecc832.jsonl`

## Transcript

### User | 2026-05-17T16:16:11.487Z

Per-file scrutiny arm A on U-P2-GRAPH-SEARCH-MASTERINDEX (PRISM SYSTEM-VIZ-BRAIN-MS0 — LAST backend slice for the milestone).

**Unit:** Pure resolver + CLI that builds `prism_session:master_index_query` invocation payload from a /system-viz search-bar free-text query + optional filters. Same backend-clean pattern as 4 prior shipped this loop. Frontend search-bar wiring deferred.

**Files (READ END-TO-END):**
1. `H:\prism\scripts\system-viz-graph-search.mjs` (~250 LOC, 17 exports + CLI)
2. `H:\prism\scripts\system-viz-graph-search.test.mjs` (~430 LOC, 40/40 PASS via node:test)

**Dispatcher contract pinned against live source (read BEFORE writing):**
- `mcp-server/src/tools/dispatchers/sessionDispatcher.ts:1338-1350` — `case "master_index_query"`
- Reads: `params.query ?? params.q` (string), `params.limit` (Number-coerced), `params.layers` (array), `params.sources` (array), `params.min_utilization` / `params.min_confidence` (Number-coerced), `params.build_classes` (array)

**Self-caught bug already fixed:** `Number(null) === 0` was silently emitting `min_utilization:0` and `min_confidence:0` when caller didn't supply. 1 test failure surfaced it. Fix applied: null/undefined check BEFORE `Number()` coercion.

**Scope (content-specialist):**
- Query validation: missing / non-string / empty-after-trim / over-MAX_QUERY_LEN — all distinct error codes.
- Limit clamping: NaN-coerced to DEFAULT_LIMIT (NaN-clamp lesson from U-P2-COT-REASON-BLAST-RADIUS).
- Layer filter: KNOWN_LAYERS allowlist; unknowns drop with advisory.droppedLayers.
- Sources/buildClasses: dedup + non-string filter.
- Utilization/confidence: null-safe Number() coercion, clamp to [0, 1].
- Optional params ABSENT (not undefined) when caller omits.
- Snake_case emission verified against dispatcher (build_classes vs buildClasses).
- Object.create(null) NOT used here — verify no proto-pollution surface (resolver creates plain {} params; Object.create(null) only matters for accumulators with dynamic keys, which 
... [+107 chars truncated]

### Assistant | 2026-05-17T16:16:17.981Z

I'll read both files end-to-end and verify against the dispatcher contract.

### Assistant | 2026-05-17T16:16:18.454Z

[tool_use: Read]

### Assistant | 2026-05-17T16:16:18.983Z

[tool_use: Read]

### User | 2026-05-17T16:16:19.816Z

[tool_result] 1	#!/usr/bin/env node
2	// U-P2-GRAPH-SEARCH-MASTERINDEX (SYSTEM-VIZ-BRAIN-MS0, slot=echo, 2026-05-17)
3	//
4	// Pure resolver + CLI that takes a /system-viz search-bar free-text query (plus
5	// optional filters: layers, sources, build classes, utilization/confidence
6	// floors, result limit) and emits a fully-formed `prism_session:master_index_query`
7	// invocation payload. The frontend search
... [+13087 chars truncated]

### Assistant | 2026-05-17T16:16:19.873Z

[tool_use: Read]

### User | 2026-05-17T16:16:20.264Z

[tool_result] 1	// system-viz-graph-search.test.mjs — U-P2-GRAPH-SEARCH-MASTERINDEX tests (node:test)
2	//
3	// Coverage:
4	//   • buildSearchPayload — query validation (missing, empty, too-long), limit clamping,
5	//     layer filter with KNOWN_LAYERS allowlist (drop unknowns), source/buildClasses dedup,
6	//     utilization/confidence floor clamping, optional-field omission, contract pinning
7	//   • Dispatch
... [+16133 chars truncated]

### User | 2026-05-17T16:16:20.797Z

[tool_result] 1320	
1321	          case "dispatcher_map_compact": {
1322	            const { dispatcherMapEngine: dme } = await import("../../engines/DispatcherMapEngine.js");
1323	            const max = params.max_per_dispatcher ? Number(params.max_per_dispatcher) : 5;
1324	            return ok({ map: dme.getCompactMap(max) });
1325	          }
1326	
1327	          // HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2) — 
... [+3418 chars truncated]

### Assistant | 2026-05-17T16:16:47.937Z

## Per-File Scrutiny Arm A — U-P2-GRAPH-SEARCH-MASTERINDEX

**Files reviewed:**
- `H:\prism\scripts\system-viz-graph-search.mjs` (330 LOC)
- `H:\prism\scripts\system-viz-graph-search.test.mjs` (411 LOC)
- Pinned against `mcp-server/src/tools/dispatchers/sessionDispatcher.ts:1338-1350`

---

### Grade: **PASS**

---

### Contract verification (lines 1338-1350 of sessionDispatcher.ts)

| Dispatcher reads | Resolver emits | Status |
|---|---|---|
| `params.query ?? params.q` | `params.query` (trimmed string) | OK |
| `params.limit` via `Number()` | `params.limit` (clamped number) | OK |
| `Array.isArray(params.layers)` | `params.layers` (string[]) | OK |
| `Array.isArray(params.sources)` | `params.sources` (string[]) | OK |
| `params.min_utilization` via `Number()` | `params.min_utilization` snake_case | OK |
| `params.min_confidence` via `Number()` | `params.min_confidence` snake_case | OK |
| `Array.isArray(params.build_classes)` | `params.build_classes` snake_case | OK |

Snake_case emission verified — test:115-132 explicitly guards `buildClasses`/`minUtilization`/`minConfidence` are NOT in emitted params. Three live-source regression tests (test:373-410) freeze contract against sessionDispatcher.ts via filesystem read.

---

### Findings by severity

**P0:** None.

**P1:** None.

**P2:**
- `mjs:148` — `dropped.push(String(l))` coerces `null`→`"null"`, `42`→`"42"`. The non-string-entry test (line 202-211) asserts only `length >= 2` and doesn't pin the string form. Minor: operator-facing advisory may show `"null"` strings which is acceptable but underspecified.

**P3:**
- `mjs:134` — `Number.isFinite(limit)` accepts `limit: "20"` as non-finite (string→NaN under `isFinite`), so a string-coerced CLI value falls to DEFAULT_LIMIT. CLI parser already calls `Number(argv[++i])` at line 257, so user-facing CLI is safe. Library callers passing string limits get silent fallback. Documented test exists for `"0.5"` string→Number coercion path on minUtilization (line 283) but not
... [+1952 chars truncated]
