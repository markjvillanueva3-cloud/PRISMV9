---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Review an ADDITIVE change in slot sierra (PRISM system-viz): surface brain-cover"
date: "2026-06-02"
first_ts: "2026-06-02T17:07:02.488Z"
last_ts: "2026-06-02T17:10:20.439Z"
cwd: "H:\\prism-slot-sierra"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-adbca09adfad8daa6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Review an ADDITIVE change in slot sierra (PRISM system-viz): surface brain-cover

> **claude-code-cli** | 2026-06-02 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-adbca09adfad8daa6.jsonl`

## Transcript

### User | 2026-06-02T17:07:02.488Z

Review an ADDITIVE change in slot sierra (PRISM system-viz): surface brain-coverage (`noteCount`) on the find-cache path. Verified: 8/8 tests pass; force-deploy rebuilt the live cache (56→57.5MB, the noteCount field landing); `find --brain-only` works live. NO schema migration, NO freshness-gate change, NO hot-hook edit (deferred).

Read END-TO-END and verify CORRECTNESS:
1. `H:/prism/scripts/lib/system-viz-graph.mjs` — `projectForFind` (search it): the new noteCount derivation `(knowledge.wikiEntries?.length||0)+(knowledge.memoryEntries?.length||0)`, set ONLY when >0. Verify: (a) it's truly additive (old readers ignore it; not added to FIND_FIELDS so findInGraph is unchanged — confirm findInGraph's search blob doesn't include noteCount); (b) the only-when->0 guard keeps the cache lean (undocumented nodes carry no field); (c) handles missing/non-array knowledge safely (no throw). Also `regenFindCache({force})` — verify the `if (!force)` wrapper: force=true bypasses the fast-path → full rebuild; force=false (the DEFAULT, used by the wired regen-viz stage) preserves the iter-4 idempotent behavior EXACTLY. CRITICAL: confirm the wired regen-viz path (which calls regen-find-cache.mjs WITHOUT --force) is unaffected — it must still fast-path-skip when fresh and rebuild when stale.
2. `H:/prism/scripts/regen-find-cache.mjs` — `regenFindCache({force: process.argv.includes("--force")})` + the heap re-exec forwards argv (so --force survives the re-exec). Verify --force threads correctly.
3. `H:/prism/scripts/system-viz-query.mjs` — the `find` block: `--brain-only` parse (stripped from the query via `params.filter`), the `limit: brainOnly?60:30` then `.filter(noteCount>0).slice(0,30)`, and that the HUMAN output format is UNCHANGED (only the header gets a "(brain-backed only)" suffix) — confirm no change to the per-hit line format that viz-first-redirect.parseFindOutput depends on.

Report P0/P1. Try to find: a way noteCount bloats the cache, a way force breaks the wired regen-v
... [+156 chars truncated]

### Assistant | 2026-06-02T17:07:19.096Z

I'll review this additive change end-to-end. Let me read the three files involved.

### Assistant | 2026-06-02T17:07:19.099Z

[tool_use: Bash]

### Assistant | 2026-06-02T17:07:19.108Z

[tool_use: Read]

### Assistant | 2026-06-02T17:07:19.299Z

[tool_use: Read]

### User | 2026-06-02T17:07:37.752Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-find-cache — offline (proactive) generator for the find-cache sidecar.
4	 *
5	 * The find-cache (state/shared/system-viz/find-cache.json) is the slim per-node
6	 * projection behind findInGraph() — read by viz-first-redirect.mjs + the four
7	 * pre-*-graph-inject hooks (~1060 `find` calls/day from fresh node subprocesses).
8	 * It used to be built ONLY lazily
... [+4059 chars truncated]

### User | 2026-06-02T17:07:37.868Z

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
... [+18736 chars truncated]

### User | 2026-06-02T17:08:03.810Z

[tool_result] 29: *   findInGraph(G, q, opts)   — case-insensitive node search.
199:export function findInGraph(G, terms, { limit = 30 } = {}) {
211: * loadFindCache — cross-process sidecar optimized for findInGraph().
219: * fields findInGraph() actually reads — label, id, info, subgroup, layer,
227: * is for `findInGraph` ONLY. DO NOT USE if you need `graph.edges`,
271:// Fields findInGraph() actually inspect
... [+1220 chars truncated]

### Assistant | 2026-06-02T17:08:11.971Z

Now let me read the core library file end-to-end, focusing on the relevant functions.

### Assistant | 2026-06-02T17:08:12.384Z

[tool_use: Read]

### User | 2026-06-02T17:08:22.252Z

[tool_result] 150	  const bypass = fresh || cacheDisabled() || ttlMs() === 0;
151	
152	  if (!bypass && _cache) {
153	    let st = null;
154	    try {
155	      st = fs.statSync(graphPath());
156	    } catch {
157	      st = null; // file vanished — fall through to readAndParse (canonical throw)
158	    }
159	    if (
160	      st &&
161	      st.mtimeMs === _cache.mtimeMs &&
162	      st.size === _cache.size &
... [+13337 chars truncated]

### Assistant | 2026-06-02T17:08:29.007Z

I have the critical region. Let me read the rest of `regenFindCache` to confirm the `force` wrapper logic.

### Assistant | 2026-06-02T17:08:29.938Z

[tool_use: Read]

### User | 2026-06-02T17:08:41.160Z

[tool_result] 429	  // readable until the new one atomically swaps in.
430	  if (!force) {
431	    const existing = readSidecarIfFresh();
432	    if (existing) {
433	      let bytes = 0;
434	      try { bytes = fs.statSync(cachePath).size; } catch { /* size is advisory */ }
435	      return { ok: true, path: cachePath, nodeCount: existing.nodes.length, bytes, sourceMtimeMs: st.mtimeMs, reason: "already-fresh" }
... [+4747 chars truncated]

### Assistant | 2026-06-02T17:08:45.451Z

I have read all three files end-to-end. Let me verify the one outstanding claim — that `parseFindOutput` in viz-first-redirect depends on the per-hit line format, to confirm `--brain-only` doesn't break it.

### Assistant | 2026-06-02T17:08:47.328Z

[tool_use: Grep]

### User | 2026-06-02T17:09:12.772Z

[tool_result] 8-// as a master index before trying anything else."
9-//
10-\ Strategy: before a Grep/Glob runs, query the system-viz name index for
11:// nodes matching the search pattern's identifier-shaped tokens. Inject the
12-// top-K matches as additionalContext so Claude sees the canonical graph
13-// answer FIRST, then can decide whether the Grep/Glob is even necessary.
14-//
--
102-}
103-
104-\ Parse th
... [+1025 chars truncated]

### Assistant | 2026-06-02T17:09:24.757Z

Let me read the exact body of `parseFindOutput` to verify the line-format dependency precisely.

### Assistant | 2026-06-02T17:09:24.768Z

[tool_use: Read]

### User | 2026-06-02T17:09:39.425Z

[tool_result] 104	// Parse the system-viz-query find output. The script's `find` mode emits lines:
105	//   "Found N node(s) matching \"PATTERN\":"
106	//   "  L<layer>/<kind>  <node-id>  <name>"
107	// We need the top-K (name, layer/kind, id) triples after the header.
108	export function parseFindOutput(stdout, topK) {
109	  if (!stdout || typeof stdout !== "string") return [];
110	  const lines = stdout.split
... [+1563 chars truncated]

### Assistant | 2026-06-02T17:10:20.439Z

I now have everything needed. Let me trace the three correctness concerns the review asks me to find.

**Concern A — does `--brain-only` change the human line format?**

The hook calls `runVizQuery(probe)` with `execFileSync(QUERY_SCRIPT, ["find", probe])` — it never passes `--brain-only`. So the hook always gets the default (non-brain) path: `limit: 30`, no `.filter`, header without the suffix. `parseFindOutput`'s regex is `/^\s+(L\d+\/[\w_-]+)\s+(\S+)\s+(.+)$/` and the header skip is `/^Found\s+\d+\s+node/i`.

Now compare the two find blocks. The new per-hit line (line 65):
```
`  ${h.layer}/${h.subgroup ?? '_'}  ${h.id.padEnd(28)} ${(h.label ?? '').split('\n')[0]}`
```
The old/unreachable block (line 239):
```
`  ${h.layer}/${h.subgroup ?? '_'}  ${h.id.padEnd(28)} ${h.label.split('\n')[0]}`
```
Byte-identical except `(h.label ?? '')` — a pure null-safety hardening that produces the same string for any real node. The header (line 63) only appends `(brain-backed only)` *inside* the `brainOnly` branch, which the hook never triggers. The regex matches `L<layer>/<subgroup>` — and the suffix `" (brain-backed only):"` lands on the **header** line, which `parseFindOutput` skips via the `^Found` test regardless. So even if some caller did pass `--brain-only`, the per-hit lines are unchanged and the header still matches the skip pattern. **No format break.**

**Concern B — can `force` break the wired regen-viz path?**

`regen-find-cache.mjs` line 72: `regenFindCache({ force: process.argv.includes("--force") })`. The wired regen-viz stage calls this CLI **without** `--force` → `force=false`. With `force=false`, the `if (!force)` block (line 430) runs `readSidecarIfFresh()`; if fresh, it returns `already-fresh` (fast-path skip preserved); if stale/absent, it falls through to `loadGraph({fresh:true})` + write. This is exactly the iter-4 idempotent behavior. `force=true` only bypasses the fast-path. The re-exec (lines 54-56) forwards `...process.argv.slice(2)`, so `--force` su
... [+5173 chars truncated]
