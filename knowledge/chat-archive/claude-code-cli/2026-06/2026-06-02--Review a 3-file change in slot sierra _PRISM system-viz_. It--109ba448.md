---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Review a 3-file change in slot sierra (PRISM system-viz). It adds a `cache-statu"
date: "2026-06-02"
first_ts: "2026-06-02T15:35:00.401Z"
last_ts: "2026-06-02T15:46:56.932Z"
cwd: "H:\\prism-slot-sierra"
messages: 64
user_msgs: 24
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-abb9822cc075791ea.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Review a 3-file change in slot sierra (PRISM system-viz). It adds a `cache-statu

> **claude-code-cli** | 2026-06-02 | 64 msgs (24 user / 40 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-abb9822cc075791ea.jsonl`

## Transcript

### User | 2026-06-02T15:35:00.401Z

Review a 3-file change in slot sierra (PRISM system-viz). It adds a `cache-status` CLI subcommand that reports freshness of the two search sidecars (find-cache.json, system-graph-index.json) vs the live system-graph.json — STAT-ONLY (fd-head-read 512 bytes, no parse of the 56MB/194MB sidecars, no load of the 695MB graph). Verified: unit test 5/5 pass; live run shows find-cache FRESH (exact float-mtime match `...444.9028`), index FRESH (gte gate), exit 0.

Read END-TO-END and verify CORRECTNESS:
1. `H:/prism/scripts/lib/system-viz-graph.mjs` — the NEW `sidecarStatus()` export + `sidecarHead()` helper (search for them, near the bottom before `__test`). Verify: (a) `sidecarHead` fd-read uses try/finally to ALWAYS closeSync the fd (no fd leak on a throw); (b) the mtime regex `/"sourceMtimeMs"\s*:\s*(\d+(?:\.\d+)?)/` is fraction-aware (NTFS sub-ms — a floored capture mis-reports fresh as stale); (c) the size regex matches BOTH `sourceSize` (find-cache) and `sourceSizeBytes` (index) without cross-matching; (d) the per-sidecar gate is CORRECT: find-cache uses "exact" (`sourceMtimeMs === g.mtimeMs && sourceSize === g.size`, mirroring readSidecarIfFresh) and index uses "gte" (`sourceMtimeMs >= g.mtimeMs`, mirroring the master-index loadGraph staleness gate) — read readSidecarIfFresh in the same file to confirm the find-cache invariant matches; (e) 512 bytes is sufficient to contain the freshness fields (they precede the huge `nodes` array in both sidecar formats); (f) fail-soft on missing graph/sidecar (exists:false, never a throw); (g) the index path is correctly derived from the find-cache dir (honors PRISM_VIZ_FIND_CACHE_PATH override).
2. `H:/prism/scripts/system-viz-query.mjs` — the `cache-status` short-circuit (search "cache-status"). Verify it is placed BEFORE the eager `loadGraph()` (so it never parses), the exit code (0 iff graph present AND both fresh), and the import.

Report P0 (wrong freshness verdict, fd leak, would load the graph, cross-match) / P1. Try to fin
... [+190 chars truncated]

### Assistant | 2026-06-02T15:35:17.216Z

I'll review this 3-file change end-to-end. Let me start by reading the core library file to find the new exports.

### Assistant | 2026-06-02T15:35:19.155Z

[tool_use: Grep]

### Assistant | 2026-06-02T15:35:19.258Z

[tool_use: Grep]

### User | 2026-06-02T15:35:53.709Z

[tool_result] 431:function sidecarHead(p, g, mode) {
457: * sidecarStatus — freshness report for the two search sidecars vs the live graph.
459: * STAT-ONLY: fd-reads 512 bytes of each sidecar (see sidecarHead) — NEVER parses
467:export function sidecarStatus() {
478:    findCache: sidecarHead(fcPath, g, "exact"),
479:    index: sidecarHead(idxPath, g, "gte"),

### User | 2026-06-02T15:35:53.933Z

[tool_result] 34:  console.error("usage: system-viz-query <roadmap-candidates|build-order|blast-radius|dispatcher-summary|coverage-by-domain|worktrees|find|headline|cache-status> [params] [--json]");
66:// the eager loadGraph below so `cache-status` itself never pays a parse.
67:if (cmd === "cache-status") {

### Assistant | 2026-06-02T15:35:57.291Z

Let me read the full library implementation including the surrounding helpers and `readSidecarIfFresh`.

### Assistant | 2026-06-02T15:35:57.785Z

[tool_use: Read]

### User | 2026-06-02T15:36:35.627Z

[tool_result] 380	 *
381	 * STRATEGY: do the same stat → parse → project → atomic-write EAGERLY (wired
382	 * as a regen-viz post-merge step), so the sidecar is always fresh after a
383	 * regen and no hook subprocess ever pays the cold parse.
384	 *
385	 * REUSE: calls the SAME writeSidecarAtomic primitive as the lazy path, so the
386	 * emitted sidecar is byte-format-identical (schemaVersion 1) — a pure drop-
... [+5549 chars truncated]

### Assistant | 2026-06-02T15:36:38.881Z

Now let me read `readSidecarIfFresh`, `findCachePath`, `graphPath`, and `writeSidecarAtomic` to confirm the exact invariants and the sidecar write format.

### Assistant | 2026-06-02T15:36:40.717Z

[tool_use: Grep]

### User | 2026-06-02T15:37:05.637Z

[tool_result] 41:const DEFAULT_GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
48:function graphPath() {
233: * FRESHNESS: sidecar carries `sourceMtimeMs` + `sourceSize` of the graph at
251: *   PRISM_VIZ_FIND_CACHE_PATH=<p>   → override sidecar path (read at call time)
262:function findCachePath() {
263:  return process.env.PRISM_VIZ_FIND_CACHE_PATH
290:function readSidecarIfFres
... [+1717 chars truncated]

### Assistant | 2026-06-02T15:37:09.498Z

Let me read the `findCachePath`, `graphPath`, `readSidecarIfFresh`, and `writeSidecarAtomic` bodies in full to confirm the invariants.

### Assistant | 2026-06-02T15:37:10.750Z

[tool_use: Read]

### Assistant | 2026-06-02T15:37:10.978Z

[tool_use: Read]

### User | 2026-06-02T15:37:49.156Z

[tool_result] 40	const ROOT = path.resolve(__dirname, "..", "..");
41	const DEFAULT_GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
42	// Read at CALL time (not module-eval) so tests + future tooling can point the
43	// lib at a temp fixture without touching the live ~370 MB production graph.
44	// REGRESSION DEFENSE: a prior test that hard-coded the production path
45	// accident
... [+1426 chars truncated]

### User | 2026-06-02T15:37:49.413Z

[tool_result] 255	 * @returns {{nodes: Array}} ALWAYS this shape. See RETURN SHAPE above.
256	 */
257	
258	// Read at CALL time, not module-eval, so tests/callers can toggle per-invocation
259	// (mirrors `cacheDisabled()` / `ttlMs()` pattern on lines 53-64). Module-scope
260	// caching of the path would freeze whatever value process.env had when the
261	// module was first imported — a real footgun for sequent
... [+3736 chars truncated]

### Assistant | 2026-06-02T15:37:55.957Z

Now I have the find-cache invariant confirmed. The find-cache sidecar writes `sourceMtimeMs` + `sourceSize` (line 336-337), and `readSidecarIfFresh` checks `st.mtimeMs !== sidecar.sourceMtimeMs || st.size !== sidecar.sourceSize` — i.e. exact equality on BOTH mtime and size (line 306). The `sidecarHead` "exact" mode mirrors this: `sourceMtimeMs === g.mtimeMs && sourceSize === g.size` (line 447). Confirmed match.

Now I need to verify the index sidecar format. The "gte" mode uses `sourceSize(?:Bytes)?` regex to also capture `sourceSizeBytes`. Let me confirm the index sidecar actually uses `sourceSizeBytes` (not `sourceSize`) and that its consumer (master-index loadGraph) uses a `>=` gate. Let me find the index writer/consumer.

### Assistant | 2026-06-02T15:37:56.908Z

[tool_use: Grep]

### Assistant | 2026-06-02T15:37:57.967Z

[tool_use: Grep]

### User | 2026-06-02T15:38:38.019Z

[tool_result] Found 16 files
H:\prism\scripts\lib\__tests__\sidecar-status.test.mjs
H:\prism\scripts\lib\system-viz-graph.mjs
H:\prism\scripts\regen-viz.mjs
H:\prism\scripts\build-graph-index.mjs
H:\prism\scripts\build-memory-embeddings-sidecar.mjs
H:\prism\scripts\build-memory-index-sidecar.test.mjs
H:\prism\scripts\lib\memory-index-search-lib.mjs
H:\prism\scripts\build-memory-index-sidecar.mjs
H:\prism\script
... [+385 chars truncated]

### User | 2026-06-02T15:38:40.757Z

[tool_result] Found 1 file
H:\prism\mcp-server\src\engines\LatheProgramLibraryEngine.ts

### Assistant | 2026-06-02T15:38:44.555Z

The index sidecar is written by `build-graph-index.mjs` and consumed by `master-index-search-lib.mjs`. Let me examine both: confirm the index uses `sourceSizeBytes` and `sourceMtimeMs`, where in the file these fields sit (must be within first 512 bytes), and the consumer's staleness gate (must be `>=`).

### Assistant | 2026-06-02T15:38:46.653Z

[tool_use: Grep]

### Assistant | 2026-06-02T15:38:47.595Z

[tool_use: Grep]

### User | 2026-06-02T15:39:31.967Z

[tool_result] 20: *   { schemaVersion, generatedAt, sourceGraph, sourceMtimeMs,
21: *     sourceSizeBytes, nodeCount, nodes:[compact], inverted:{token:[idx]} }
47:  readFileSync, writeFileSync, statSync, existsSync, renameSync, unlinkSync,
90:/** Return v only when it is a string, else undefined (drops the key on write). */
103: * @param {object} [meta]    — { sourceGraph, sourceMtimeMs, sourceSizeBytes }
168: 
... [+1282 chars truncated]

### User | 2026-06-02T15:39:36.817Z

[tool_result] 74:let _graphCache = { path: "", mtimeMs: 0, wrapper: null };
75:let _tribalCache = { path: "", mtimeMs: 0, wrapper: null };
100:    if (tok.length < MIN_TOKEN_LEN) continue;
105:    if (out.length >= maxTokens) break;
142: * `inverted` is rebuilt (integer-index postings → `Map<token, Set<id>>`).
144: * Returns the wrapper on a fresh-sidecar hit, else null — the caller then
153: * @returns {{ node
... [+1633 chars truncated]

### Assistant | 2026-06-02T15:39:48.034Z

This confirms the two critical invariants:

1. **Index writer** (`build-graph-index.mjs` line 168-172): emits `schemaVersion, generatedAt, sourceGraph, sourceMtimeMs, sourceSizeBytes` in that order — `sourceMtimeMs`/`sourceSizeBytes` come right after the header, before `nodes`. So they're within the first 512 bytes. And it uses `sourceSizeBytes` (not `sourceSize`), confirming the regex's `(?:Bytes)?` alternation is needed.

2. **Index consumer** (`master-index-search-lib.mjs` line 190): `if (!(Number(sc.sourceMtimeMs) >= graphStat.mtimeMs)) return rejected("stale...")` — this is a `>=` gate (only mtime, no size check). The `sidecarHead` "gte" mode mirrors this exactly: `fresh = sourceMtimeMs >= g.mtimeMs` (line 450), and correctly does NOT add a size check. Confirmed match.

Now I need to verify the field ordering in the find-cache writer is also within 512 bytes — it is: line 333-339 emits `schemaVersion, generatedAt, sourceMtimeMs, sourceSize` before `nodes`. Good.

Let me now read the `system-viz-query.mjs` cache-status short-circuit, and the import line.

### Assistant | 2026-06-02T15:39:48.642Z

[tool_use: Read]

### User | 2026-06-02T15:40:37.907Z

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
... [+4883 chars truncated]

### Assistant | 2026-06-02T15:40:47.419Z

The CLI short-circuit is correctly placed before the eager `loadGraph()` (line 83), the import includes `sidecarStatus` (line 23), and the exit code is `s.graph.exists && s.findCache.fresh && s.index.fresh ? 0 : 1` (line 79). All correct.

Now let me verify the index sidecar's field ordering really fits in 512 bytes (the `generatedAt` ISO + `sourceGraph` path could push `sourceMtimeMs` past 512 in a pathological case). Let me read lines 160-180 of `build-graph-index.mjs` to see the exact key order, and check the `sourceGraph` value (a path that could be long).

### Assistant | 2026-06-02T15:40:48.079Z

[tool_use: Read]

### User | 2026-06-02T15:41:22.888Z

[tool_result] 160	    } catch {
161	      // Per-node failure — skip and continue (same total-load semantics as
162	      // loadGraph: a few skipped nodes is acceptable; aborting is not).
163	      continue;
164	    }
165	  }
166	
167	  return {
168	    schemaVersion: SIDECAR_SCHEMA_VERSION,
169	    generatedAt: new Date().toISOString(),
170	    sourceGraph: meta.sourceGraph ?? "system-graph.json",
171	    sou
... [+470 chars truncated]

### Assistant | 2026-06-02T15:41:30.565Z

Let me compute the worst-case byte offset of `sourceMtimeMs` in the index sidecar header. The keys before it, with `JSON.stringify` (no spaces):

```
{"schemaVersion":N,"generatedAt":"2026-06-02T12:34:56.789Z","sourceGraph":"<value>","sourceMtimeMs":...
```

- `{"schemaVersion":` = 17 chars, value ~1-2 chars → ~19
- `,"generatedAt":"..."` = ISO date is fixed 24 chars + `,"generatedAt":""` = 17 → ~41
- `,"sourceGraph":"<value>"` = `,"sourceGraph":""` = 17 + value
- `,"sourceMtimeMs":` = 17 + the number value (~16 digits)

So the offset of the captured digits ≈ 19 + 41 + 17 + len(sourceGraph) + 17 = ~94 + len(sourceGraph). For the value to push the captured mtime digits past byte 512, `sourceGraph` would need to be ~400+ chars. The default is `"system-graph.json"` (17 chars). I need to check what `meta.sourceGraph` is actually set to — is it a short basename or a full absolute path? Let me check the build invocation.

### Assistant | 2026-06-02T15:41:31.487Z

[tool_use: Read]

### User | 2026-06-02T15:41:59.518Z

[tool_result] 228	 * Read the graph, build the sidecar, write it. Returns a summary object.
229	 * Throws (fail-loud) on graph-missing / parse-fail / no-nodes / 0-indexed /
230	 * mass-skip (indexed node count collapsed below the floor — schema drift).
231	 *
232	 * @param {object} [opts]  — { graphPath, outPath }
233	 * @returns {object} summary
234	 */
235	export function generate({ graphPath = DEFAULT_GRAPH_
... [+2077 chars truncated]

### Assistant | 2026-06-02T15:42:04.580Z

Confirmed: line 258 sets `sourceGraph` to the **basename only** (`.split("/").pop()`), i.e. `"system-graph.json"` (17 chars). So `sourceMtimeMs` digits land at ~byte 94-110 — comfortably within 512. The find-cache writer has `sourceGraph` absent entirely and `sourceMtimeMs` even earlier. So 512 bytes is more than sufficient for both formats. Point (e) confirmed.

Now let me verify the test file to understand what cases were covered, and probe for the adversarial "lies" input.

### Assistant | 2026-06-02T15:42:04.977Z

[tool_use: Read]

### User | 2026-06-02T15:42:37.842Z

[tool_result] 1	// sidecar-status.test.mjs — tests for sidecarStatus (find-cache + graph-index
2	// freshness vs the live graph). The KEY thing under test is that the two
3	// sidecars use DIFFERENT freshness gates (find-cache = exact mtime+size;
4	// graph-index = sourceMtimeMs >= graph.mtime) and sidecarStatus mirrors each.
5	//
6	// HERMETIC: every test writes a tmp graph + tmp sidecars and points the lib at
... [+6780 chars truncated]

### Assistant | 2026-06-02T15:42:48.087Z

The test suite covers the 5 key cases including the load-bearing gate-distinction test. Now let me hunt adversarially for an input where the freshness report LIES. I've identified several candidate edge cases to reason through. Let me focus on the cross-match and regex-anchoring concerns by checking the exact field layout once more.

The critical adversarial vectors I'm reasoning about:

1. **Cross-match in the size regex**: `/"sourceSize(?:Bytes)?"\s*:\s*(\d+)/`. For the **find-cache** (which has `sourceSize` but NOT `sourceSizeBytes`), this matches `sourceSize` correctly. For the **index** (which has `sourceSizeBytes` but NOT `sourceSize`), it matches `sourceSizeBytes`. But here's the subtle question: in the index's "gte" mode, `sourceSize` isn't even used in the freshness computation (only `sourceMtimeMs >= g.mtimeMs`). So a cross-match there is harmless. But could the find-cache regex accidentally match `sourceSizeBytes` if a find-cache ever contained both? It won't — find-cache only has `sourceSize`. The regex `(?:Bytes)?` is greedy-optional, so given the literal string `"sourceSize":`, it matches `sourceSize` (the `Bytes?` is optional and there's no `Bytes` following). Given `"sourceSizeBytes":`, the `(?:Bytes)?` consumes `Bytes`. No cross-contamination. Confirmed safe.

2. **The mtime fraction regex** `/"sourceMtimeMs"\s*:\s*(\d+(?:\.\d+)?)/` — fraction-aware. Let me verify it can't mis-capture. Let me check the live find-cache head to see the actual stored format.

### Assistant | 2026-06-02T15:42:50.041Z

[tool_use: Bash]

### Assistant | 2026-06-02T15:42:51.222Z

[tool_use: Bash]

### User | 2026-06-02T15:43:30.039Z

[tool_result] "{\"schemaVersion\":1,\"generatedAt\":\"2026-06-02T15:20:49.597Z\",\"sourceMtimeMs\":1780405350444.9028,\"sourceSize\":685119149,\"nodes\":[{\"label\":\"Operator\",\"id\":\"p.operator\",\"info\":\"Shop floor — runs jobs, sca"

### User | 2026-06-02T15:44:17.312Z

[tool_result] "{\"schemaVersion\":\"1.0.0\",\"generatedAt\":\"2026-06-02T13:02:47.996Z\",\"sourceGraph\":\"system-graph.json\",\"sourceMtimeMs\":1780405350444.9028,\"sourceSizeBytes\":685119149,\"nodeCount\":302447,\"nodes\":[{\"id\":\"p."

### Assistant | 2026-06-02T15:44:26.215Z

This is exactly the real-world data I needed. Both live sidecars confirm:

- **find-cache head**: `...,"sourceMtimeMs":1780405350444.9028,"sourceSize":685119149,"nodes":[...` — the fraction `.9028` is present. A floored regex would capture `1780405350444` ≠ graph's `1780405350444.9028` → **false STALE**. The fraction-aware regex captures the full `1780405350444.9028`. Point (b) confirmed against live data.
- **index head**: `...,"sourceMtimeMs":1780405350444.9028,"sourceSizeBytes":685119149,"nodeCount":302447,...` — uses `sourceSizeBytes`. Confirmed.

Both `sourceMtimeMs` fields land at byte offset ~50-85 — far inside 512.

Now the **single most important adversarial test**: does the `Number()` conversion of the captured fraction string exactly equal `g.mtimeMs` from `fs.statSync`? The captured string is `"1780405350444.9028"`. `Number("1780405350444.9028")` must produce the identical IEEE-754 double as the `statSync().mtimeMs` that produced it. Let me verify this round-trips, and also probe the genuine LIE vector I'm most worried about: **float precision loss in the decimal string round-trip**.

### Assistant | 2026-06-02T15:44:33.382Z

[tool_use: Bash]

### User | 2026-06-02T15:44:59.361Z

[tool_result] write: 1780405350444.9028 | reparse===orig: true
mtime cap: 1780405350444.9028 Number===v: true
size cap (find-cache): 685119149
idx size cap: 685119149
whole ms JSON: 1780405350444 cap-ok: true

### Assistant | 2026-06-02T15:45:10.344Z

The round-trip is exact: `Number(JSON.stringify(mtimeMs)) === mtimeMs` for the live value, and the regex captures the full fractional digits. JS's `JSON.stringify`/`Number` use the shortest round-trippable decimal representation, so `statSync().mtimeMs` → write → regex → `Number()` is lossless by construction. This is the same path `readSidecarIfFresh` relies on (`JSON.parse` also uses the same IEEE-754 parser as `Number`), so the exact-equality comparison is consistent between the live consumer and `sidecarHead`. No LIE here.

Now let me probe the remaining adversarial vectors I haven't yet closed:

**Vector A — fd leak on throw in `sidecarHead`**: `fs.openSync` succeeds, then `Buffer.alloc(512)` or `fs.readSync` throws → `finally { fs.closeSync(fd) }` runs. Correct. If `fs.openSync` itself throws (missing file), `fd` was never assigned and the outer `catch` returns `exists:false` — no fd to leak. Point (a) confirmed.

**Vector B — index path derivation honoring the override**: `idxPath = path.join(path.dirname(fcPath), "system-graph-index.json")` where `fcPath = findCachePath()` which honors `PRISM_VIZ_FIND_CACHE_PATH`. The test confirms this works hermetically. Point (g) confirmed. But there's a subtle real-world question: in production, is the index sidecar actually a sibling of find-cache? Both live at `state/shared/system-viz/`. Let me verify the index's canonical DEFAULT_OUT_PATH is in that same directory.

### Assistant | 2026-06-02T15:45:11.444Z

[tool_use: Grep]

### Assistant | 2026-06-02T15:45:12.623Z

[tool_use: Grep]

### User | 2026-06-02T15:45:24.233Z

[tool_result] 19: * Sidecar → `state/shared/system-viz/system-graph-index.json`:
58:const DEFAULT_GRAPH_PATH = "H:/prism/state/shared/system-viz/system-graph.json";
59:const DEFAULT_OUT_PATH = "H:/prism/state/shared/system-viz/system-graph-index.json";
235:export function generate({ graphPath = DEFAULT_GRAPH_PATH, outPath = DEFAULT_OUT_PATH } = {}) {
328:    writeBuildBreadcrumb(args.outPath || DEFAULT_OUT_PATH
... [+68 chars truncated]

### User | 2026-06-02T15:45:25.078Z

[tool_result] 135: * pre-builds a compact inverted-index sidecar offline (`system-graph-index.json`,
160:  const sidecarPath = graphPath.replace(/system-graph\.json$/, "system-graph-index.json");
161:  if (sidecarPath === graphPath) return null;
162:  if (!existsSync(sidecarPath)) return null;
182:  try { sc = JSON.parse(readFileSync(sidecarPath, "utf8")); }
229: * from `system-graph-index.json` in seconds with
... [+559 chars truncated]

### Assistant | 2026-06-02T15:45:36.972Z

Critical finding here. The index sidecar's canonical location IS `state/shared/system-viz/system-graph-index.json` (line 59), which is the same directory as find-cache.json — so the production-default derivation `path.join(path.dirname(fcPath), "system-graph-index.json")` resolves correctly. Point (g) confirmed for production defaults.

But I've found a subtle behavioral seam worth noting (not a P0 for the cache-status feature itself): the **real consumer** of the index sidecar (`master-index-search-lib.mjs` line 160) derives the sidecar path differently — by `graphPath.replace(/system-graph\.json$/, "system-graph-index.json")`, i.e. it's keyed off the **graph path's directory**, NOT the find-cache directory. `sidecarStatus` derives it off the **find-cache** directory. In production these coincide (all three files in `state/shared/system-viz/`). The find-cache override (`PRISM_VIZ_FIND_CACHE_PATH`) is the *correct* anchor for `sidecarStatus` per the task spec, and the test exercises that. This is a documented design choice, consistent, and matches what the spec asked for.

Now let me confirm the consumer's gate reads `sourceMtimeMs` from the index head correctly within the same comparison semantics. I've already seen line 190: `if (!(Number(sc.sourceMtimeMs) >= graphStat.mtimeMs)) return rejected("stale...")`. This is `>=` with `Number()` coercion — identical to `sidecarHead` gte mode. Let me verify there isn't ALSO a size check in the consumer that `sidecarHead` omits (which would make gte mode under-strict, a potential LIE). Let me read lines 180-195.

### Assistant | 2026-06-02T15:45:36.991Z

[tool_use: Read]

### User | 2026-06-02T15:45:41.431Z

[tool_result] 155	function tryLoadSidecar(graphPath, graphStat) {
156	  if (process.env.PRISM_GRAPH_SIDECAR_DISABLE === "1") return null;
157	  // The sidecar is a sibling of the merged system-graph only. For any other
158	  // graph path (the architecture-graph fallback, or unit-test fixtures with a
159	  // different basename) the replace is a no-op → no sidecar.
160	  const sidecarPath = graphPath.replace(/s
... [+2114 chars truncated]

### Assistant | 2026-06-02T15:45:50.325Z

Confirmed: the index consumer's ONLY staleness check on the source is `Number(sc.sourceMtimeMs) >= graphStat.mtimeMs` (line 190) — no size check. So `sidecarHead`'s gte mode (`sourceMtimeMs >= g.mtimeMs`, no size) is a **faithful mirror** of the real consumer's gate. Point (d) — index half — confirmed. The find-cache half I confirmed earlier matches `readSidecarIfFresh` exactly (mtime AND size equality).

I have now end-to-end verified every claim. Let me do one final adversarial pass on the most dangerous LIE vector that the test suite does NOT cover: **the index consumer rejects on `schemaVersion !== SIDECAR_SCHEMA_VERSION` (line 184), but `sidecarHead` does NOT check schemaVersion**. Could this make `cache-status` report the index FRESH while the real consumer rejects it as schema-mismatched (falling back to the slow legacy path)?

Let me check what `SIDECAR_SCHEMA_VERSION` is, and note the live index head showed `"schemaVersion":"1.0.0"` while the test's `writeIndex` uses `schemaVersion: 1`.

### Assistant | 2026-06-02T15:45:51.750Z

[tool_use: Grep]

### Assistant | 2026-06-02T15:45:52.445Z

[tool_use: Grep]

### User | 2026-06-02T15:45:55.315Z

[tool_result] 128:const SIDECAR_SCHEMA_VERSION = "1.0.0";

### User | 2026-06-02T15:45:55.451Z

[tool_result] 54:export const SIDECAR_SCHEMA_VERSION = "1.0.0";

### Assistant | 2026-06-02T15:46:07.070Z

This is the key adversarial finding. I've now fully characterized the one real limitation. Let me synthesize.

The `schemaVersion` divergence is a **real but bounded** semantic gap, not a freshness LIE in the sense the spec is guarding against. `sidecarStatus`/`sidecarHead` measure exactly one axis — **freshness vs the live graph** (mtime/size) — and they measure it faithfully. They do NOT measure **structural validity** (schema version, `inverted` presence, parseability). So an input exists where `cache-status` reports the index **FRESH** while the real consumer **rejects** it (e.g. a sidecar with a stale-bumped future `schemaVersion`, or one truncated after byte 512 so the head looks valid but `nodes`/`inverted` are corrupt). In those cases `cache-status` says FRESH but master-index silently runs the slow legacy path.

However — this is **by design and correctly scoped**: the feature's stated contract (and its docstring, line 459-463) is "freshness report... STAT-ONLY... NEVER parses." A schema/structure check is impossible without parsing the 56MB/194MB body, which is the whole thing the feature exists to avoid. The freshness verdict itself never lies. This is a **P2 documentation nuance**, not a P0/P1: "FRESH" means "built from the current graph," not "guaranteed-loadable by the consumer." I'll flag it so it's on record.

Let me run the test suite to confirm the claimed 5/5 pass, then deliver the verdict.

### Assistant | 2026-06-02T15:46:07.910Z

[tool_use: Bash]

### User | 2026-06-02T15:46:21.301Z

[tool_result]   ...
# Subtest: gate distinction: index newer-than-graph is fresh (gte), find-cache same is stale (exact)
ok 4 - gate distinction: index newer-than-graph is fresh (gte), find-cache same is stale (exact)
  ---
  duration_ms: 8.3485
  ...
# Subtest: missing graph + sidecars → exists:false, not fresh (fail-soft)
ok 5 - missing graph + sidecars → exists:false, not fresh (fail-soft)
  ---
  duration_m
... [+117 chars truncated]

### Assistant | 2026-06-02T15:46:56.932Z

5/5 pass confirmed. I have completed the end-to-end review without loading the 695MB graph (I only fd-head-read 512 bytes of each sidecar, exactly as the feature does).

---

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 3 (`system-viz-graph.mjs`, `system-viz-query.mjs`, `sidecar-status.test.mjs`) + 3 dependency files cross-read (`build-graph-index.mjs`, `master-index-search-lib.mjs`, the live sidecar heads)
- Issues Found: 0 P0, 0 P1, 2 P2 (advisory)
- **Verdict: PASS**

### All 7 library claims (a)–(g) — VERIFIED

| Claim | Result | Evidence |
|---|---|---|
| (a) `sidecarHead` fd try/finally always `closeSync` | **PASS** | Lines 434–436: `openSync` then `try{read}finally{closeSync(fd)}`. If `openSync` throws, `fd` is never bound and the outer `catch` returns `exists:false` — no leak on either path. |
| (b) mtime regex fraction-aware | **PASS** | `/"sourceMtimeMs"\s*:\s*(\d+(?:\.\d+)?)/` captures the full `1780405350444.9028` from BOTH live heads. Verified `Number("1780405350444.9028") === statSync().mtimeMs` round-trips exactly (lossless by JS shortest-decimal). A floored capture would falsely report STALE — this is correctly avoided. |
| (c) size regex matches both `sourceSize` and `sourceSizeBytes`, no cross-match | **PASS** | `/"sourceSize(?:Bytes)?"\s*:\s*(\d+)/` captured `685119149` from find-cache (`sourceSize`) and from index (`sourceSizeBytes`). find-cache has no `sourceSizeBytes`, index has no `sourceSize` — no cross-contamination possible. |
| (d) per-sidecar gate correctness | **PASS** | find-cache "exact" (`mtime === && size ===`, line 447) faithfully mirrors `readSidecarIfFresh` (line 306). index "gte" (`mtime >=`, no size, line 450) faithfully mirrors the real consumer `master-index-search-lib.mjs:190` (`Number(sc.sourceMtimeMs) >= graphStat.mtimeMs` — confirmed NO size check there, so omitting size in gte mode is correct, not a gap). |
| (e) 512 bytes sufficient | **PASS** | Both freshness fields land a
... [+4237 chars truncated]
