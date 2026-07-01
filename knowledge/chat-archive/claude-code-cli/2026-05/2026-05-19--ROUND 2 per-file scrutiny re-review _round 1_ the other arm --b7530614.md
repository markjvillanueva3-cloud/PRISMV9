---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "ROUND 2 per-file scrutiny re-review (round 1: the other arm returned FAIL; the f"
date: "2026-05-19"
first_ts: "2026-05-19T03:01:35.936Z"
last_ts: "2026-05-19T03:02:14.048Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a100afa7b279d6020.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# ROUND 2 per-file scrutiny re-review (round 1: the other arm returned FAIL; the f

> **claude-code-cli** | 2026-05-19 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a100afa7b279d6020.jsonl`

## Transcript

### User | 2026-05-19T03:01:35.936Z

ROUND 2 per-file scrutiny re-review (round 1: the other arm returned FAIL; the file was revised). Read the WHOLE file end-to-end. Grade PASS or FAIL.

FILE: H:/prism/scripts/lib/master-index-search-lib.mjs — File 3 of a 5-file build (U-MASTER-INDEX-SIDECAR — additive sidecar fast-path for `loadGraph`).
SPEC: H:/prism/state/shared/specs/UNITS/U-MASTER-INDEX-SIDECAR.md

THREE FIXES were applied since round 1 — verify each is correct AND complete AND introduced no regression:
1. P1 — `searchGraphHits` (~line 248) now filters `graph.nodes` (`.filter(n => n && typeof n.id === "string")`) before building `nodeById`, so a malformed/partial-written sidecar (or the pre-existing legacy exposure) whose `nodes[]` carries `null`/non-object/hole elements can no longer throw a TypeError. Verify: does the filter break ANY valid-graph behavior? Every id referenced by the `inverted` Map must still resolve through `nodeById` — confirm `inverted` only ever contains ids of string-id nodes (so filtering id-less nodes from `nodeById` drops nothing reachable).
2. P2 — `tryLoadSidecar` now emits a `process.stderr.write` (via a local `rejected()` helper) when a sidecar FILE exists but is rejected (unparseable / schema mismatch / malformed / stale). The common no-sidecar-file case stays silent. Verify the helper never throws and fires only on file-exists-but-rejected.
3. P3 — the `loadGraph` cache comment now documents that the cache key observes the graph mtime, not the sidecar mtime.

ALSO RE-VERIFY round-1 PASS items still hold: cache-move correctness; the `Number(sc.sourceMtimeMs) >= graphStat.mtimeMs` staleness gate; the sidecar-path derivation + `sidecarPath === graphPath` guard; `Object.entries` for the `__proto__` token; the rebuilt `Map<token,Set<id>>` (non-empty buckets only, out-of-range index handling); `tryLoadSidecar` never throws; independent `SIDECAR_SCHEMA_VERSION` const.

Note: 43/43 existing tests in `scripts/lib/master-index-search-lib.test.mjs` pass.

Report every P0/P1 w
... [+56 chars truncated]

### Assistant | 2026-05-19T03:01:43.651Z

I'll read the file end-to-end and the spec to verify the round-2 review.

### Assistant | 2026-05-19T03:01:44.094Z

[tool_use: Read]

### Assistant | 2026-05-19T03:01:44.694Z

[tool_use: Read]

### User | 2026-05-19T03:01:45.619Z

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
... [+27014 chars truncated]

### User | 2026-05-19T03:01:47.338Z

[tool_result] 1	---
2	unit_id: U-MASTER-INDEX-SIDECAR
3	milestone: DEV-TOOL-CONFLICT-AUDIT-2026-05-17
4	owner_slot: alpha
5	wave: DEV-INFRA
6	cost: M
7	status: pending
8	depends_on: []
9	unblocks: [U-ACTIVATE-BEFORE-BUILD-PRECHECK, full-graph-master-index-recall]
10	roi_score: 9.0
11	generated_at: 2026-05-18
12	generator_version: alpha-investigation-b7530614
13	---
14	
15	# U-MASTER-INDEX-SIDECAR — pre-built in
... [+6787 chars truncated]

### Assistant | 2026-05-19T03:02:14.048Z

I have the full file and spec. Let me verify each of the three fixes and re-confirm the round-1 PASS items.

## Verification

### Fix 1 — P1: `searchGraphHits` filters `graph.nodes` before building `nodeById` (lines 351-355)

```js
const nodeById = new Map(
  graph.nodes
    .filter((n) => n && typeof n.id === "string")
    .map((n) => [n.id, n]),
);
```

The filter `(n) => n && typeof n.id === "string"` is correct. Question posed: does it drop anything reachable through `inverted`?

- **Legacy path** (`loadGraph` lines 302-318): a node enters `inverted` only inside the `for (const n of nodes)` loop, gated by `if (!n || typeof n.id !== "string") continue;` at line 303. So every id in `inverted` is the id of a node that already passed `n && typeof n.id === "string"`. The filter drops only nodes that *never entered* `inverted`. No regression.
- **Sidecar path** (`tryLoadSidecar` lines 198-201): `bucket.add(node.id)` only fires when `node && typeof node.id === "string"`. Identical invariant — every id in `inverted` belongs to a string-id node. No regression.
- The lookup at line 362 (`nodeById.get(nodeId)`) and line 390 (`nodeById.get(id)`) — `id` at line 390 comes from `candidates`, which is populated at line 384 only with `nodeId` values that resolved through `nodeById.get(nodeId)` at line 362 and were non-null (`if (!node) continue;` line 363). So the line-390 `nodeById.get(id)` can never miss. **No regression.**

The fix is correct and complete. The filter is a strict subset removal of unreachable nodes.

### Fix 2 — P2: `tryLoadSidecar` emits stderr on file-exists-but-rejected (lines 169-177)

```js
const rejected = (reason) => {
  try {
    process.stderr.write(...);
  } catch { /* stderr unavailable — non-fatal */ }
  return null;
};
```

- The helper is defined **after** the `existsSync(sidecarPath)` check at line 161 — so the common no-sidecar-file case (`return null` at line 161) never reaches it. Silent, as required.
- All four rejection paths use `rejected(
... [+2645 chars truncated]
