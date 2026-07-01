---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Per-file scrutiny review of an EDIT to a PRISM file. Read the WHOLE file end-to-"
date: "2026-05-19"
first_ts: "2026-05-19T02:54:59.660Z"
last_ts: "2026-05-19T02:56:52.070Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-ad280392f97a940e1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Per-file scrutiny review of an EDIT to a PRISM file. Read the WHOLE file end-to-

> **claude-code-cli** | 2026-05-19 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-ad280392f97a940e1.jsonl`

## Transcript

### User | 2026-05-19T02:54:59.660Z

Per-file scrutiny review of an EDIT to a PRISM file. Read the WHOLE file end-to-end and grade PASS or FAIL.

FILE: H:/prism/scripts/lib/master-index-search-lib.mjs — File 3 of a 5-file build (U-MASTER-INDEX-SIDECAR).
SPEC: H:/prism/state/shared/specs/UNITS/U-MASTER-INDEX-SIDECAR.md — File 3 section.

WHAT THIS EDIT ADDED (additive sidecar fast-path for `loadGraph`):
1. A new `SIDECAR_SCHEMA_VERSION` const + a new `tryLoadSidecar(graphPath, graphStat)` function.
2. In `loadGraph`: the process-lifetime cache check was MOVED UP (now right after `statSync`, before the size-cap/fallback block), and a `tryLoadSidecar` call was inserted after it. The OLD cache-check block (which used to sit after the size-cap block) was DELETED.

CONTRACT (must hold):
- The sidecar file `system-graph-index.json` is produced by `H:/prism/scripts/build-graph-index.mjs` — read it to confirm the sidecar shape `tryLoadSidecar` consumes (`schemaVersion`, `nodes[]`, `inverted{token:[idx]}`, `sourceMtimeMs`) matches what build-graph-index emits.
- `tryLoadSidecar` must return `{ nodes, inverted: Map<string,Set<string>> }` — the EXACT shape `searchGraphHits` (same file, ~line 237) consumes, so searchGraphHits works UNCHANGED.
- Strictly additive: when no sidecar exists / it is stale / schema-mismatched / `PRISM_GRAPH_SIDECAR_DISABLE=1`, behavior must be BYTE-IDENTICAL to before this edit (legacy parse, or the JULIETT F1 architecture-graph fallback for the 372 MB graph).

VERIFY — flag P0/P1:
1. Cache-move correctness — moving the cache check above the size-cap/fallback block: does this change behavior for ANY case (graph ≤ cap with cache hit; graph > cap; the fallback recursion `loadGraph(architecture-graph.json)`)? Trace the fallback recursion path specifically — does it wrongly pick up a sidecar?
2. `tryLoadSidecar` staleness gate — `Number(sc.sourceMtimeMs) >= graphStat.mtimeMs`. Is the direction correct (stale = sidecar older than graph → reject)? What about missing/NaN `sourceMtimeMs`?
3. The 
... [+967 chars truncated]

### Assistant | 2026-05-19T02:56:00.159Z

I'll review this edit carefully. Let me read the file, the spec, and the sidecar producer.

### Assistant | 2026-05-19T02:56:00.587Z

[tool_use: Read]

### Assistant | 2026-05-19T02:56:01.430Z

[tool_use: Read]

### Assistant | 2026-05-19T02:56:01.438Z

[tool_use: Read]

### User | 2026-05-19T02:56:04.359Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-graph-index.mjs' was already read 19m ago in this session and is unchanged (mtime 1779158103332). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T02:56:07.619Z

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
... [+25342 chars truncated]

### User | 2026-05-19T02:56:08.538Z

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

### Assistant | 2026-05-19T02:56:13.928Z

The build-graph-index.mjs read was cached. Let me retrieve it with Grep to confirm the sidecar shape it emits.

### Assistant | 2026-05-19T02:56:15.412Z

[tool_use: Grep]

### User | 2026-05-19T02:56:16.925Z

[tool_result] 3: * build-graph-index.mjs — offline inverted-index sidecar generator for
16: * inverted-index sidecar that `loadGraph` rebuilds in seconds with FULL
20: *   { schemaVersion, generatedAt, sourceGraph, sourceMtimeMs,
21: *     sourceSizeBytes, nodeCount, nodes:[compact], inverted:{token:[idx]} }
24: * — `{ id, label?, layer?, status?, info?, knowledge?:{wikiEntries?,
25: * memoryEntries?} }` — so F
... [+2683 chars truncated]

### Assistant | 2026-05-19T02:56:20.419Z

Let me see the key sections of build-graph-index.mjs in detail — node compaction and posting index assignment.

### Assistant | 2026-05-19T02:56:21.111Z

[tool_use: Read]

### User | 2026-05-19T02:56:24.931Z

[tool_result] 95	 * Build the sidecar object from an already-parsed graph object. Pure — no I/O.
96	 *
97	 * Per-node posture mirrors `loadGraph`: null nodes + non-string ids are
98	 * skipped (they never participate in the inverted index); a single
99	 * malformed node is skipped, never aborts the whole build.
100	 *
101	 * @param {object} graphObj  — parsed system-graph.json
102	 * @param {object} [meta]    —
... [+4457 chars truncated]

### Assistant | 2026-05-19T02:56:52.070Z

I have the full picture. Let me trace each verification point against both files.

## Analysis

**Sidecar shape contract (build-graph-index.mjs → tryLoadSidecar):**
- `schemaVersion` = `"1.0.0"` (both files), `nodes[]` array, `inverted` plain object `{token: [idx,...]}`, `sourceMtimeMs` number. **All match.** `tryLoadSidecar` consumes exactly this. ✓
- `inverted` postings are integer indices into `nodes[]` (line 157). `tryLoadSidecar` resolves `nodes[i].id` (line 181-182). ✓
- Compact nodes carry `knowledge.{wikiEntries,memoryEntries}` (lines 143-145) — the exact shape `searchGraphHits` reads (`node.knowledge?.wikiEntries`, lines 345/367). ✓

**1. Cache-move correctness.** The cache check moved above the size-cap block. Cache is keyed on `graphPath + stat.mtimeMs`. A cache hit returns the stored wrapper regardless of how it was originally built (sidecar/legacy/fallback). For the fallback recursion: `loadGraph("architecture-graph.json")` runs with its own path key — distinct cache entry, no cross-contamination. The recursion calls `tryLoadSidecar("...architecture-graph.json", ...)` → the regex `replace(/system-graph\.json$/, ...)` does NOT match → `sidecarPath === graphPath` → returns null. Fallback never picks up a sidecar. ✓ No behavior change.

**2. Staleness gate.** `Number(sc.sourceMtimeMs) >= graphStat.mtimeMs` — sidecar built from current-or-newer graph passes; older → rejected. Direction correct. Missing/non-numeric `sourceMtimeMs` → `Number(undefined)` = `NaN`, `NaN >= x` = `false`, `!(false)` = reject. ✓ Note build-graph-index always emits `Number(meta.sourceMtimeMs) || 0` so a real sidecar with mtime 0 would also reject — acceptable (degrades to legacy).

**3. Path derivation + self-guard.** Production: `.../system-graph.json` → `.../system-graph-index.json`, `!==` original → proceeds. Architecture fallback: `architecture-graph.json` — regex doesn't match, no-op replace → `sidecarPath === graphPath` → returns null. ✓

**4. `__proto__` token.** build-graph-
... [+2632 chars truncated]
