---
type: "chat-session"
source: "claude-code-cli"
session_id: "64f4f477-394f-4b32-b2d5-427f60a7717a"
title: "Independent re-review of the multi-writer LOCK wiring just added to two tribal-i"
date: "2026-06-04"
first_ts: "2026-06-04T14:42:32.314Z"
last_ts: "2026-06-04T15:03:58.629Z"
cwd: "H:\\prism"
messages: 89
user_msgs: 35
assistant_msgs: 54
raw_file: "H:/.claude/projects/H--prism/64f4f477-394f-4b32-b2d5-427f60a7717a/subagents/agent-a02bb2e0de748302c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent re-review of the multi-writer LOCK wiring just added to two tribal-i

> **claude-code-cli** | 2026-06-04 | 89 msgs (35 user / 54 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/64f4f477-394f-4b32-b2d5-427f60a7717a/subagents/agent-a02bb2e0de748302c.jsonl`

## Transcript

### User | 2026-06-04T14:42:32.314Z

Independent re-review of the multi-writer LOCK wiring just added to two tribal-index embedders (milestone BLACKWELL-DB-GEN-MS0, slot juliett — database-expansion / atomicity charter). A prior reviewer FAILED `embed-cited-tips-into-tribal-index.mjs` for unguarded read-modify-write of the shared 356 MB index; the canonical `scripts/lib/tribal-index-lock.mjs` has now been wired into BOTH `embed-cited-tips-into-tribal-index.mjs` and `embed-engines-into-tribal-index.mjs`.

Read all three files. WEIGHT toward:
- **Correctness of the re-read-inside-lock pattern**: the slow embed must stay OUTSIDE the lock (it does — the pool runs first); only the re-read+splice+write is inside. Confirm the embed-time in-memory `idx`/`idIndexMap` is used ONLY for the skip-check, never as the write basis (the write re-reads fresh). Any path where stale in-memory data overwrites a peer's fresh write?
- **Lock liveness**: default 30s stale-steal (per the lock header). The critical section now re-reads + rewrites 356 MB inside the lock — could that exceed 30s on a slow disk and get its lock stolen mid-write? Is the checkpoint interval (cited-tips 250 / engines 200) high enough to keep the critical-section count low?
- **Honesty (R12)**: the comments previously OVERSTATED safety (claimed atomic tmp+rename = multi-writer safe). Do the new comments now correctly describe the lock-serialized RMW? No remaining lie?
- **Data-loss on contention**: if a peer holds the lock, is the staged batch preserved (re-run recovers)? Is the user told clearly (stderr + exit 4)?
- **Consistency between the two embedders**: do they wire the lock the same way? Any divergence that would surprise a maintainer?
- **The cited-tips catalog fix**: `CATALOGS` changed from {milling, wedm(phantom), lathe(phantom)} to {milling→mill, post→general}. Is `post`→`general` a sound choice (post tips have no clean VALID_DOMAINS member; general = retrievable by cosine, no mis-boost)? Confirm POST-TIP- is the real prefix in `mcp-server/s
... [+153 chars truncated]

### Assistant | 2026-06-04T14:42:45.062Z

I'll perform an independent re-review of the multi-writer lock wiring. Let me read all three files plus the supporting files referenced in the task.

### Assistant | 2026-06-04T14:42:45.564Z

[tool_use: Read]

### Assistant | 2026-06-04T14:42:46.617Z

[tool_use: Read]

### Assistant | 2026-06-04T14:42:46.639Z

[tool_use: Read]

### User | 2026-06-04T14:42:49.108Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\tribal-index-lock.mjs' was already read 4s ago in this session and is unchanged (mtime 1780193399753). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T14:42:49.225Z

[tool_result] read-once-guard: 'H:\prism\scripts\embed-cited-tips-into-tribal-index.mjs' was already read 4s ago in this session and is unchanged (mtime 1780583416791). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-04T14:42:50.112Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * embed-engines-into-tribal-index.mjs
4	 *
5	 * NN-GRAPH-MS2 / U-NN-PREDICTOR-EMBED-WIRE-BRIDGE-EXPAND follow-up (2026-05-24,
6	 * slot papa). Embeds every wiki engine page under
7	 * `knowledge/wiki/architecture/engines/**` into `tribal-embed-index.json` so
8	 * the graph-node-embedding bridge's Path-2 resolver (newly shipped) can
9	 * actually produce embedding row
... [+18172 chars truncated]

### Assistant | 2026-06-04T14:42:57.609Z

The lock file and cited-tips file are already in my context from a prior read. Let me retrieve them from context. Since the system reminder says they were read 4s ago but I don't have them in this conversation turn, let me read them with the cache disabled, plus the supporting files.

### Assistant | 2026-06-04T14:42:58.077Z

[tool_use: Read]

### Assistant | 2026-06-04T14:42:58.717Z

[tool_use: Bash]

### User | 2026-06-04T14:43:00.377Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\tribal-index-lock.mjs' was already read 16s ago in this session and is unchanged (mtime 1780193399753). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T14:43:08.348Z

[tool_result] :PRISM_READ_CACHE

### Assistant | 2026-06-04T14:43:12.630Z

The read-once guard insists the files are in my context, but they were read by a prior session/turn before this review began — they're not actually in my visible context. Let me disable the cache to read them.

### Assistant | 2026-06-04T14:43:13.567Z

[tool_use: Bash]

### Assistant | 2026-06-04T14:43:14.501Z

[tool_use: Bash]

### User | 2026-06-04T14:43:22.650Z

[tool_result] /usr/bin/bash: line 1: :PRISM_READ_CACHE=0: command not found
#!/usr/bin/env node
// scripts/lib/tribal-index-lock.mjs — cross-process write lock for the tribal
// embedding index `state/shared/tribal-embed-index.json` (BRAIN-UPGRADE rank 12,
// 2026-05-30 slot:alpha).
//
// ── Why ──────────────────────────────────────────────────────────────────
// `tribal-embed-index.json` (~200 MB: 768-d nomic
... [+4064 chars truncated]

### User | 2026-06-04T14:43:29.694Z

[tool_result] #!/usr/bin/env node
/**
 * embed-cited-tips-into-tribal-index.mjs
 *
 * TRIBAL-OUTCOME-LOOP-MS0/U-TTOB-EMBED (slot:foxtrot 2026-05-27).
 * BLACKWELL-DB-GEN-MS0 array-shape fix + GPU concurrency pool (slot:juliett 2026-06-04).
 *
 * Embeds the `.ts` cited-tip catalogs (milling/wedm/lathe) into the canonical
 * `state/shared/tribal-embed-index.json` so `tribal_search` +
 * `tribal-by-domain-inject` 
... [+16284 chars truncated]

### Assistant | 2026-06-04T14:43:33.595Z

Now I have all three files. Let me examine the supporting files referenced: the lock's `exclusive-file-lock.mjs` (to verify stale-steal timing and the acquire contract), the `embed-pool.mjs` (order contract), and the cited-tips catalog (`post-pdf-cited-tips.ts` prefix verification).

### Assistant | 2026-06-04T14:43:36.055Z

[tool_use: Bash]

### Assistant | 2026-06-04T14:43:39.214Z

[tool_use: Bash]

### User | 2026-06-04T14:43:45.633Z

[tool_result] #!/usr/bin/env node
// scripts/lib/exclusive-file-lock.mjs — the canonical ATOMIC cross-process file lock.
// (BRAIN-UPGRADE rank 12, 2026-05-30 slot:alpha.)
//
// ── Why atomic (O_EXCL), not read-decide-write ─────────────────────────────
// Acquire has two paths, NEITHER with a time-of-check-to-time-of-use (TOCTOU)
// window:
//   • fresh acquire — a single atomic `fs.openSync(lockPath, "wx")`; 
... [+7045 chars truncated]

### User | 2026-06-04T14:43:53.610Z

[tool_result] /**
 * embed-pool.mjs — order-preserving, bounded-concurrency worker pool for the
 * GPU-backed embed passes (build-wiki-embeddings + the four
 * embed-*-into-tribal-index generators). As of BLACKWELL-DB-GEN-MS0 the two
 * all-or-nothing embedders (wiki, knowledge-store) are wired; engines + cited-
 * tips follow — they need a chunked-checkpoint variant (their checkpoint-every-N
 * + consecutive-f
... [+5919 chars truncated]

### Assistant | 2026-06-04T14:43:58.948Z

Now let me verify the cited-tips catalog prefix (`POST-TIP-`) and confirm the milling prefix, plus confirm the wedm/lathe catalog files genuinely don't exist (the phantom-catalog claim).

### Assistant | 2026-06-04T14:44:00.632Z

[tool_use: Bash]

### Assistant | 2026-06-04T14:44:01.421Z

[tool_use: Grep]

### User | 2026-06-04T14:44:09.101Z

[tool_result] FILES: jm-die-curriculum
milling-pdf-cited-tips.test.ts
milling-pdf-cited-tips.ts
milling-training-index.test.ts
milling-training-index.ts
post-pdf-cited-tips.test.ts
post-pdf-cited-tips.ts
post-pdf-cited-tips.types.ts

### User | 2026-06-04T14:44:14.216Z

[tool_result] mcp-server\src\data\tribal-tips\post-pdf-cited-tips.ts:35
mcp-server\src\data\tribal-tips\milling-pdf-cited-tips.ts:326

Found 361 total occurrences across 2 files.

### Assistant | 2026-06-04T14:44:21.428Z

Confirmed: `POST-TIP-` is the real prefix in `post-pdf-cited-tips.ts` (35 occurrences), `MILL-TIP-` in `milling-pdf-cited-tips.ts` (326). No wedm/lathe catalog files exist on disk — the phantom-catalog claim is accurate. Let me verify the exact prefix string and the tip object close-brace pattern the regex relies on, and confirm `VALID_DOMAINS` in tribal-rerank includes `mill` and `general`.

### Assistant | 2026-06-04T14:44:24.266Z

[tool_use: Bash]

### Assistant | 2026-06-04T14:44:25.186Z

[tool_use: Grep]

### User | 2026-06-04T14:44:32.598Z

[tool_result] first id sample: id: "POST-TIP-WHAT-IS-A-POST"
CLOSE-BRACE 2sp match found: true

### User | 2026-06-04T14:44:32.615Z

[tool_result] <tool_use_error>Path does not exist: H:\prism\scripts\lib\tribal-rerank.mjs. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-06-04T14:44:36.162Z

The regex matches the post catalog's tip-object close-brace indentation. Let me locate the actual tribal-rerank file and verify `VALID_DOMAINS`.

### Assistant | 2026-06-04T14:44:38.688Z

[tool_use: Bash]

### Assistant | 2026-06-04T14:44:39.008Z

[tool_use: Grep]

### User | 2026-06-04T14:44:44.689Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect
'rg' is not recognized as an internal or external command,
operable program or batch file.
rg-miss

### User | 2026-06-04T14:45:07.716Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-04T14:45:13.063Z

[tool_use: Grep]

### User | 2026-06-04T14:45:18.380Z

[tool_result] scripts\embed-knowledge-store-into-tribal-index.mjs:100:export const VALID_DOMAINS = new Set(["mill", "lathe", "wedm", "cad", "cam", "backend-dev", "general"]);
H:\prism\scripts\embed-knowledge-store-into-tribal-index.mjs-101-
H:\prism\scripts\embed-knowledge-store-into-tribal-index.mjs-102-const HM_FILE_RE = /^doc-(hypermill|hmautocolor|cad-manual|fusion-cad|automation-center|virtual-tool|virtual
... [+5692 chars truncated]

### system

... [9 middle messages omitted -- see raw_file] ...

### User | 2026-06-04T14:46:10.546Z

[tool_result] LINES: 262
16: parseTipsFromCatalog,
25: test("parseTipsFromCatalog parses a single canonical-schema tip", () => {
40: const tips = parseTipsFromCatalog(fragment, "MILL-TIP-");
51: test("parseTipsFromCatalog parses multiple tips from one catalog text", () => {
74: const tips = parseTipsFromCatalog(fragment, "MILL-TIP-");
80: test("parseTipsFromCatalog respects idPrefix and does not cross-match", (
... [+651 chars truncated]

### Assistant | 2026-06-04T14:46:15.240Z

The rerank confirms: the `--domain` flag doubles in-domain cosine scores, and `general` is the documented fallback (top-K by cosine, no 2× boost). So `post→general` is exactly the right neutral choice — no mis-boost, still retrievable.

The actual rerank script is at `.claude/scripts/tribal-rerank.mjs`. Let me confirm it doesn't crash on an unknown/`general` domain and verify the lock test coverage. Let me also check the test file's RMW/lock-section coverage more fully.

### Assistant | 2026-06-04T14:46:18.988Z

[tool_use: Bash]

### Assistant | 2026-06-04T14:46:20.511Z

[tool_use: Bash]

### User | 2026-06-04T14:46:25.357Z

[tool_result] 20: spliceTipEntries,
21: loadIndex,
22: saveIndex,
25: test("parseTipsFromCatalog parses a single canonical-schema tip", () => {
51: test("parseTipsFromCatalog parses multiple tips from one catalog text", () => {
80: test("parseTipsFromCatalog respects idPrefix and does not cross-match", () => {
107: test("parseTipsFromCatalog returns empty array on empty input", () => {
112: test("tipToEmbedding
... [+1699 chars truncated]

### User | 2026-06-04T14:46:31.569Z

[tool_result] 3: * tribal-rerank.mjs — L2 of TRIBAL × AI
7: * with optional domain weighting.
10: *   1. Domain-aware: --domain <mill|lathe|wedm|cad|cam|backend-dev|general>
11: *      doubles the cosine score for in-domain entries before sort.
15: *   2. Citation-log emit: every successful query appends one record
22: *   node tribal-rerank.mjs --query "..." --domain mill --k 3
36: const IN_DOMAIN_WEIGHT = 2.0
... [+1492 chars truncated]

### Assistant | 2026-06-04T14:46:39.103Z

This confirms the rerank logic fully. `general` is a `VALID_DOMAINS` member. When `e.domain === "general"` and the query is run with `--domain general`, the 2× boost fires only for other `general` entries; when run with a manufacturing domain (the common case), `general`-domain tips just rank by raw cosine — exactly the "retrievable, no mis-boost" claim. The `post→general` choice is sound and honest.

Now let me verify one critical correctness concern: whether the cited-tips `flush()` is correctly placed (the final flush after the loop), and whether the `built` array preservation on lock-contention is truly safe. Let me also double-check there's no stale-in-memory-overwrite path by examining the embed-time skip vs write basis interaction carefully. Let me look at the test file's tail and confirm there are no lock-section tests (a coverage gap to note).

### Assistant | 2026-06-04T14:46:42.404Z

[tool_use: Bash]

### Assistant | 2026-06-04T14:46:44.918Z

[tool_use: Bash]

### User | 2026-06-04T14:46:48.980Z

[tool_result] === lines 254-262 ===
254:     const reloaded = loadIndex(tmp);
255:     assert.equal(reloaded.entries.length, 2);
256:     assert.ok(reloaded.entries.some((x) => x.id === "tip:MILL-TIP-FACE-01"));
257:     assert.equal(reloaded.model, "nomic-embed-text:latest"); // metadata preserved
258:   } finally {
259:     fs.rmSync(tmp, { force: true });
260:   }
261: });
262: 
lock-mention count: 0
flush-m
... [+44 chars truncated]

### User | 2026-06-04T14:46:56.680Z

[tool_result] LINES: 181
flushIndex count: 0
lock count: 0
30: test("scanEngineWiki — recursive, .md only, skips underscore + hidden", () => {
51: test("scanEngineWiki — bounded depth, doesn't blow up on missing root", () => {
56: test("scanEngineWiki — depth ceiling truncates a deep recursive tree", () => {
75: test("makeWikiId — converts absolute paths to wiki:<rel-path> with POSIX separators", () => {
85: te
... [+741 chars truncated]

### Assistant | 2026-06-04T14:47:02.643Z

This confirms a coverage gap I'll note: neither test file exercises the `flush()`/`flushIndex()` lock-serialized RMW path — the lock wiring (the actual subject of this re-review) has zero direct test coverage in either embedder's test suite. The pure helpers (`spliceTipEntries`, `foldEngineResults`, `loadIndex` schema-probe) are well-tested, but the new critical section is not.

Let me run both test suites to confirm they're green, and run the lock's own test suite to confirm the lock primitive is verified.

### Assistant | 2026-06-04T14:47:03.734Z

[tool_use: Bash]

### User | 2026-06-04T14:47:11.398Z

[tool_result]   ...
# Subtest: foldEngineResults — stub failures NEVER trip the breaker (break the identical chain)
ok 26 - foldEngineResults — stub failures NEVER trip the breaker (break the identical chain)
  ---
  duration_ms: 0.4497
  ...
# Subtest: foldEngineResults — accumulates across calls (mirrors per-chunk folding)
ok 27 - foldEngineResults — accumulates across calls (mirrors per-chunk folding)
  ---

... [+328 chars truncated]

### Assistant | 2026-06-04T14:47:15.156Z

Both suites green (28 tests total: 16 cited-tips + 12 engines). Let me run the lock primitive's own test suite and the embed-pool test to confirm the foundations are verified.

### Assistant | 2026-06-04T14:47:16.107Z

[tool_use: Bash]

### User | 2026-06-04T14:47:23.850Z

[tool_result]   ...
# Subtest: withTribalIndexLock defers (ran:false, fn not called) when a peer holds it
ok 35 - withTribalIndexLock defers (ran:false, fn not called) when a peer holds it
  ---
  duration_ms: 29.2012
  ...
# Subtest: OFF knob → withTribalIndexLock runs fn unconditionally (disabled)
ok 36 - OFF knob → withTribalIndexLock runs fn unconditionally (disabled)
  ---
  duration_ms: 1.441
  ...
1..36

... [+99 chars truncated]

### Assistant | 2026-06-04T14:47:29.337Z

All foundation tests pass (36 across the three files, including the cross-process oracle that proves the atomic O_EXCL lock survives hammering writers, and the `withTribalIndexLock` defer-on-peer-held case). 

Now let me do the final critical-section timing analysis. The key liveness concern: the RMW re-reads + rewrites a 356 MB index inside the 30s-stale-steal lock. Let me check the actual index size on disk and estimate the worst-case critical-section duration.

### Assistant | 2026-06-04T14:47:33.391Z

[tool_use: Bash]

### User | 2026-06-04T14:52:18.879Z

[tool_result] index size MB: 507.9
entries: 33364
dim: 768
parse ms: 5104
stringify ms: 4809
write 508MB ms: 264104
=> full RMW critical section est ms: 274017

### Assistant | 2026-06-04T14:52:24.342Z

This is a critical finding. The live index is now **507.9 MB** (not 356 MB as the comments claim — it has grown), and the measured full RMW critical section is **~274 seconds** — dominated by the 508 MB synchronous write at **264 seconds**. That is **~9× over the 30s stale-steal threshold**.

Let me verify this isn't a one-off disk anomaly (the write could have hit a cold cache / antivirus scan). Let me re-measure the write in isolation a couple of times.

### Assistant | 2026-06-04T14:52:26.571Z

[tool_use: Bash]

### User | 2026-06-04T14:57:36.827Z

[tool_result] Command running in background with ID: bzmjyiq25. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\8c4120d4-a8b6-4daa-bc91-212f508fbc85\tasks\bzmjyiq25.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-04T14:57:40.916Z

Let me wait for that background measurement to complete.

### Assistant | 2026-06-04T14:57:42.142Z

[tool_use: Bash]

### User | 2026-06-04T14:58:09.761Z

[tool_result] payload MB: 508
write run 0 ms: 288277

### Assistant | 2026-06-04T14:58:16.195Z

The first isolated write took **288 seconds** for 508 MB. The runs are consistent: this disk (H:) writes a 508 MB file at roughly ~1.8 MB/s in this environment, so a single synchronous `writeFileSync` of the full index is ~270-290s. Let me stop the background task since I have enough data (two more runs would just confirm the same), and verify the disk isn't pathologically slow generally.

### Assistant | 2026-06-04T14:58:16.714Z

[tool_use: TaskStop]

### Assistant | 2026-06-04T14:58:19.152Z

[tool_use: Bash]

### User | 2026-06-04T14:58:24.301Z

[tool_result] {"message":"Successfully stopped task: bzmjyiq25 (rtk node -e \"const fs=require('fs');const p='H:/prism/state/shared/tribal-embed-index.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));const s=JSON.stringify(j);console.log('payload MB:',(s.length/1048576).toFixed(0));for(let k=0;k<3;k++){const tmp=p+'.timingtest'+k;const t=Date.now();fs.writeFileSync(tmp,s);const d=Date.now()-t;fs.unlinkSync(t
... [+503 chars truncated]

### User | 2026-06-04T15:02:40.890Z

[tool_result] raw 508MB buffer write ms: 249483 => MB/s: 2.0

### Assistant | 2026-06-04T15:02:50.144Z

Confirmed: the H: drive writes at ~2.0 MB/s for a 508 MB file in this environment, so a full-index `writeFileSync` is **~250s regardless of JSON serialization** — it's a raw I/O floor, ~8× over the 30s stale-steal window. This is not a measurement fluke.

Now I have everything needed for a rigorous verdict. Let me record the timing finding to a task and assess whether the embedders pass `staleMs` overrides to compensate (they don't — both call `withTribalIndexLock(INDEX_PATH, fn)` with no `opts`, so default 30s applies).

Let me do one final confirmation: verify neither embedder passes a custom `staleMs`, and check whether the checkpoint interval actually bounds the critical-section *count* (it bounds frequency, not per-section duration).

### Assistant | 2026-06-04T15:02:51.560Z

[tool_use: Grep]

### Assistant | 2026-06-04T15:02:52.551Z

[tool_use: Grep]

### User | 2026-06-04T15:02:55.479Z

[tool_result] 272:    const r = withTribalIndexLock(INDEX_PATH, () => {

### User | 2026-06-04T15:02:56.324Z

[tool_result] 331:  const r = withTribalIndexLock(INDEX_PATH, () => {

### Assistant | 2026-06-04T15:03:07.105Z

Confirmed: both embedders call `withTribalIndexLock(INDEX_PATH, fn)` with no `opts` — so the default `staleMs: 30_000` and `retries: 50 × retryMs: 50 = 2.5s` retry window apply unmodified. Neither raises `staleMs` to cover the ~250s write.

I now have a complete, evidence-backed picture. Let me update the task list and deliver the verdict.

### Assistant | 2026-06-04T15:03:07.146Z

[tool_use: TaskUpdate]

### User | 2026-06-04T15:03:08.092Z

[tool_result] Updated task #3 status

### Assistant | 2026-06-04T15:03:58.629Z

## Independent Re-Review: multi-writer LOCK wiring (BLACKWELL-DB-GEN-MS0, slot juliett)

I read all three files end-to-end plus the supporting cast (`exclusive-file-lock.mjs`, `embed-pool.mjs`, `.claude/scripts/tribal-rerank.mjs`, both test suites, the `post-pdf-cited-tips.ts` catalog) and ran the foundation + embedder test suites and a real-data timing measurement on the live index.

### What is CORRECT (the prior FAIL is substantively addressed)

- **Re-read-inside-lock pattern is right.** In both embedders the slow Ollama embed runs in `runEmbedPool` *outside* the lock; only `flush()`/`flushIndex()` enters the lock, and inside it the code re-reads fresh from disk (`loadIndex()` / `JSON.parse(fs.readFileSync(...))`), rebuilds a fresh `byId`/`freshMap` from that disk copy, splices the staged batch into the **fresh** array, and writes that. The embed-time in-memory `idx`/`idIndexMap` is used **only** for the skip-check (cited-tips `embedOneTip` line ~ `idIndexMap.get(\`tip:${tip.id}\`)`; engines `existing.has(id)` in the planning filter) — never as the write basis. **No path where stale in-memory data overwrites a peer's fresh write.** This is the exact lost-update class the prior reviewer FAILED, and it is closed.
- **Honesty (R12) restored.** The cited-tips header now explicitly documents the shape-bug fix ("write succeeded was a lie"), and both lock-section comments correctly describe lock-serialized RMW. The old overstated "atomic tmp+rename = multi-writer safe" lie is gone; `embed-pool.mjs` even carries the correct caveat ("does NOT make the index a multi-writer store... the lock... serializes"). No remaining lie about atomicity-implies-serialization.
- **Data-loss on contention is handled honestly.** If a peer holds the lock, `withTribalIndexLock` returns `{ran:false}`, `flush()` sets `lockHeldByPeer` and does **not** drain `built` (cited-tips) / `addedEntries` (engines), the loop breaks, a clear stderr message is emitted ("staged ... NOT written; index UNTOUC
... [+7134 chars truncated]
