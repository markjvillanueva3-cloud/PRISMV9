---
type: "chat-session"
source: "claude-code-cli"
session_id: "acb396a1-5d83-43f6-9cec-7c65bf98418f"
title: "You are the independent second-pass reviewer for PRISM unit U-LOCAL-VECTOR-LEG-W"
date: "2026-06-12"
first_ts: "2026-06-12T18:24:11.965Z"
last_ts: "2026-06-12T18:33:09.760Z"
cwd: "H:\\prism-slot-alpha"
messages: 64
user_msgs: 25
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism-slot-alpha/acb396a1-5d83-43f6-9cec-7c65bf98418f/subagents/agent-a9a7c01b66af7d0f9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# You are the independent second-pass reviewer for PRISM unit U-LOCAL-VECTOR-LEG-W

> **claude-code-cli** | 2026-06-12 | 64 msgs (25 user / 39 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/acb396a1-5d83-43f6-9cec-7c65bf98418f/subagents/agent-a9a7c01b66af7d0f9.jsonl`

## Transcript

### User | 2026-06-12T18:24:11.965Z

You are the independent second-pass reviewer for PRISM unit U-LOCAL-VECTOR-LEG-WIRE (slot:alpha) — making a shipped-but-inert "localvector" hybrid-search leg LIVE in two consumers. Read these END-TO-END and grade PASS/FAIL with P0/P1/P2:

PATCHERS (raw-FS, idempotent — they edit main-tree files the Edit-tool firewall blocks from a slot worktree):
1. H:/prism-slot-alpha/scripts/apply-local-vector-wire.mjs  (patches the CLI consumer)
2. H:/prism-slot-alpha/scripts/apply-local-vector-wire-ts.mjs  (patches the MCP dispatcher consumer)

LIVE PATCHED RESULTS (verify the injection is correct + non-breaking):
3. H:/prism/scripts/prism-hybrid.mjs  (CLI — should import makeLocalVectorSearch + inject localVectorSearch into the hybridSearch opts; 2 LOCAL-VECTOR-WIRE markers)
4. H:/prism/mcp-server/src/tools/dispatchers/sessionHybridSearchAction.ts  (MCP dispatcher runHybridSearchAction — LocalStoreModule interface + importLocalStore dep + defaultImportLocalStore + opts injection; 6 markers)

CONTEXT: the leg lives in H:/prism/scripts/lib/hybrid-retrieval.mjs::hybridSearch (already shipped). It fires only when opts.localVectorSearch is a function; otherwise trace.skipped 'no-impl' (non-breaking). The leg reuses opts.embedImpl for the query vector, independent of the Qdrant 'vector' leg. The reader is H:/prism/scripts/lib/local-vector-store.mjs (a cp of the worktree copy — note the dual-tree copy).

VALIDATED LIVE: `node scripts/prism-hybrid.mjs --query "wire EDM spark gap" --no-memory --no-master --no-episode --no-vector --json` returned surfacesQueried:1, sources:[{source:localvector,count:20}], skipped:[] — i.e. with Qdrant leg OFF, localvector STILL returns 20 ranked hits (the SPOF-kill). tsc --noEmit: no errors mention sessionHybridSearchAction.ts (648 pre-existing project errors unrelated).

SCRUTINIZE HARD for:
- REGRESSION to existing callers: does injecting localVectorSearch change behavior when the leg was previously absent? Could a default-on localvector leg now run an
... [+1205 chars truncated]

### Assistant | 2026-06-12T18:24:17.073Z

I'll review this unit thoroughly. Let me read all the relevant files end-to-end.

### Assistant | 2026-06-12T18:24:17.736Z

[tool_use: Read]

### Assistant | 2026-06-12T18:24:17.983Z

[tool_use: Read]

### Assistant | 2026-06-12T18:24:18.336Z

[tool_use: Read]

### Assistant | 2026-06-12T18:24:18.892Z

[tool_use: Read]

### User | 2026-06-12T18:24:23.226Z

[tool_result] 1	#!/usr/bin/env node
2	// apply-local-vector-wire.mjs
3	// ----------------------------------------------------------------------------
4	// U-LOCAL-VECTOR-LEG-WIRE (2026-06-12, slot:alpha): make the shipped-but-inert
5	// `localvector` leg of hybrid-retrieval.mjs ACTUALLY FIRE in the prism-hybrid CLI
6	// (scripts/prism-hybrid.mjs). It injects `localVectorSearch: makeLocalVectorSearch()`
7	// in
... [+3793 chars truncated]

### User | 2026-06-12T18:24:25.251Z

[tool_result] 1	#!/usr/bin/env node
2	// apply-local-vector-wire-ts.mjs
3	// ----------------------------------------------------------------------------
4	// U-LOCAL-VECTOR-LEG-WIRE (2026-06-12, slot:alpha) -- consumer #2. Wire the
5	// offline `localvector` leg into the prism_session:hybrid_search MCP dispatcher
6	// (mcp-server/src/tools/dispatchers/sessionHybridSearchAction.ts) so EXTERNAL
7	// MCP clients 
... [+4965 chars truncated]

### User | 2026-06-12T18:24:25.425Z

[tool_result] 1	#!/usr/bin/env node
2	// PSN-ENHANCE-MS0/U-PSN-HYBRID-RETRIEVAL-WIRE CLI. One verb: run a
3	// hybrid retrieval query across all 4 PSN substrates (memory + master +
4	// episode + Qdrant dense) and print fused results.
5	//
6	// Flags:
7	//   --query "..."         (required) the query string
8	//   --top-k N             top-K final results (default: 10)
9	//   --per-source N        per-substrate
... [+5594 chars truncated]

### User | 2026-06-12T18:24:25.512Z

[tool_result] 1	/**
2	 * PSN-ENHANCE-MS0/U-PSN-HYBRID-MCP-VERIFY (sierra iter27 2026-05-26):
3	 * Extract the prism_session:hybrid_search dispatcher case body into a
4	 * standalone, dependency-injected helper so it can be unit-tested without
5	 * spinning up Qdrant, Ollama, or the full MCP harness.
6	 *
7	 * iter26 (commit d38959daca) shipped the dispatcher case with cross-tree
8	 * dynamic imports (`file:///H
... [+7052 chars truncated]

### Assistant | 2026-06-12T18:24:29.198Z

Now let me read the underlying lib (the leg itself) and the store reader to verify the contract claims, and check the dual-tree copy.

### Assistant | 2026-06-12T18:24:29.694Z

[tool_use: Read]

### Assistant | 2026-06-12T18:24:29.923Z

[tool_use: Read]

### User | 2026-06-12T18:24:31.408Z

[tool_result] 1	#!/usr/bin/env node
2	// PSN-ENHANCE-MS0/U-PSN-HYBRID-RETRIEVAL-WIRE — compose all 4 retrieval
3	// substrates (memory-index BM25 + master-index graph BM25 + episode-store
4	// predicate + Qdrant dense vector) into ONE query API. Fan out the same
5	// query string to every substrate the caller injects; merge ranked hit
6	// lists by Reciprocal Rank Fusion (Cormack et al. 2009, k=60) — robust to

... [+18210 chars truncated]

### User | 2026-06-12T18:24:31.501Z

[tool_result] 1	#!/usr/bin/env node
2	// local-vector-store.mjs
3	// ----------------------------------------------------------------------------
4	// GRAPH-UTILIZATION rec #1 / U-LOCAL-VECTOR-LEG-WIRE (2026-06-12, slot:alpha):
5	// the memory-SAFE cached reader that makes the `localvector` leg of
6	// scripts/lib/hybrid-retrieval.mjs LIVE. It loads the on-disk nomic-768d int8
7	// vectors (knowledge/wiki/archi
... [+11915 chars truncated]

### Assistant | 2026-06-12T18:24:35.106Z

Now I have the full picture of the leg. Let me verify a few load-bearing claims: the dual-tree copy drift, whether `includeLocalVector` is exposed by consumers, and the exact CLI behavior regarding default-on. Let me check the dual-tree copy and whether the CLI exposes a disable flag.

### Assistant | 2026-06-12T18:24:37.490Z

[tool_use: Bash]

### Assistant | 2026-06-12T18:24:39.050Z

[tool_use: Bash]

### User | 2026-06-12T18:24:44.790Z

[tool_result] === diff worktree vs main local-vector-store.mjs ===
IDENTICAL

### User | 2026-06-12T18:24:51.787Z

[tool_result] === worktree copy exists? ===
-rwxr-xr-x 1 wompu 197611 11379 Jun 12 13:02 /h/prism-slot-alpha/scripts/lib/local-vector-store.mjs*
=== main copy exists? ===
-rwxr-xr-x 1 wompu 197611 11379 Jun 12 13:08 /h/prism/scripts/lib/local-vector-store.mjs*
=== embeddings file exists? ===
-rw-r--r-- 1 wompu 197611 139512769 Jun 12 07:49 /h/prism/knowledge/wiki/architecture/_embeddings.jsonl

### Assistant | 2026-06-12T18:24:55.819Z

Copies are byte-identical right now. Let me check whether the `includeLocalVector`/disable knob is reachable by either consumer, and confirm whether the CLI's `--no-vector` flag affects the localvector leg (it should NOT — they're independent), plus verify the double-embed claim and check the git state / other apply-* patchers for the established pattern.

### Assistant | 2026-06-12T18:24:59.345Z

[tool_use: Bash]

### Assistant | 2026-06-12T18:25:01.874Z

[tool_use: Bash]

### User | 2026-06-12T18:25:05.973Z

[tool_result] === does CLI expose includeLocalVector or any localvector disable? ===
29:import { makeLocalVectorSearch } from "./lib/local-vector-store.mjs"; // LOCAL-VECTOR-WIRE
93:    localVectorSearch: makeLocalVectorSearch(), // LOCAL-VECTOR-WIRE: offline dense leg, Qdrant-independent (kills the SPOF)

=== does .ts dispatcher expose no_local / includeLocalVector? ===
(none — no disable param)

### User | 2026-06-12T18:25:14.137Z

[tool_result] Exit code 2
=== existing apply-* patchers (pattern precedent) ===
scripts/apply-hook-fast-lane.mjs*
scripts/apply-karpathy-doctrine-to-galaxies.mjs*

=== git status of patched main-tree files ===
c9e3992e84 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-ENHANCE-MS0]/U-PSN-HYBRID-MCP-VERIFY (slot:sierra iter27 2026-05-26): close iter-26 dispatcher-boundary verification gap. iter26 shipped prism_session:hybri
... [+1582 chars truncated]

### Assistant | 2026-06-12T18:25:19.666Z

Note: the prompt named `apply-local-vector-leg.mjs` and `apply-route-decay-splice.mjs` as precedent patchers, but they aren't in the listing — only `apply-hook-fast-lane.mjs` and `apply-karpathy-doctrine-to-galaxies.mjs` exist. Let me verify whether the two named-precedent patchers actually exist (the patcher header cites them) and check the `.bak` cleanup behavior, plus confirm the live validation claim and the double-embed reality.

### Assistant | 2026-06-12T18:25:23.230Z

[tool_use: Bash]

### Assistant | 2026-06-12T18:25:25.390Z

[tool_use: Bash]

### User | 2026-06-12T18:25:30.453Z

[tool_result] === do the cited precedent patchers exist? ===
MISSING: scripts/apply-local-vector-leg.mjs
MISSING: scripts/apply-route-decay-splice.mjs
MISSING: scripts/apply-local-vector-wire.mjs
MISSING: scripts/apply-local-vector-wire-ts.mjs

=== are the wire patchers in main tree at all? (they live in worktree) ===
/h/prism-slot-alpha/scripts/apply-local-vector-wire-ts.mjs*
/h/prism-slot-alpha/scripts/apply-
... [+22 chars truncated]

### User | 2026-06-12T18:25:38.848Z

[tool_result] === LIVE re-validation: Qdrant OFF, localvector should still return hits ===
surfacesQueried: 1
sources: [{"source":"localvector","count":20,"vectorDim":768}]
skipped: []
results.len: 10

### Assistant | 2026-06-12T18:25:42.822Z

Live re-validation confirms the SPOF-kill: with all other legs off, localvector alone returns 20 hits fused to top-10. Now let me verify the double-embed claim with both vector + localvector active (count the embed calls), and confirm idempotency by checking the marker-guard re-run behavior.

### Assistant | 2026-06-12T18:25:46.040Z

[tool_use: Bash]

### Assistant | 2026-06-12T18:25:48.612Z

[tool_use: Bash]

### User | 2026-06-12T18:25:51.840Z

[tool_result] === Idempotency test: re-run the CLI patcher against ALREADY-patched main copy ===
{"status":"already-patched","target":"H:/prism/scripts/prism-hybrid.mjs"}

=== Idempotency test: re-run the .ts patcher against ALREADY-patched main copy ===
{"status":"already-patched","target":"H:/prism/mcp-server/src/tools/dispatchers/sessionHybridSearchAction.ts"}

### User | 2026-06-12T18:25:59.134Z

[tool_result] === marker counts in patched files (CLI=2, ts=6 expected) ===
prism-hybrid.mjs: 2
sessionHybridSearchAction.ts: 6

=== Double-embed reality: with vector+localvector both active, how many embedImpl calls? Trace the lib path ===
315:      const vector = opts.embedImpl(query);
342:      const lvVector = typeof opts.embedImpl === "function" ? opts.embedImpl(query) : null;

### Assistant | 2026-06-12T18:26:03.784Z

Confirmed: idempotency works (marker guard short-circuits, returns `already-patched`), marker counts correct (2 CLI / 6 ts). The double-embed is real — line 315 (`vector` leg) and line 342 (`localvector` leg) each independently call `opts.embedImpl(query)`. When both legs are active and Ollama is up, the query is embedded TWICE. Let me assess severity by confirming the default-on behavior and quantifying the cost, and check whether there's any test coverage for the wired consumers.

### Assistant | 2026-06-12T18:26:07.551Z

[tool_use: Bash]

### Assistant | 2026-06-12T18:26:10.424Z

[tool_use: Bash]

### User | 2026-06-12T18:26:19.543Z

[tool_result] === Default-on confirmation: with NO --no-* flags, all 5 legs run (2 embeds) ===
sources: [{"source":"vector","count":0,"vectorDim":768},{"source":"localvector","count":20,"vectorDim":768}]
skipped: []
NOTE: vector + localvector both present => embedImpl called twice

### User | 2026-06-12T18:26:44.771Z

[tool_result] === test coverage for the wired consumers ===
ls: cannot access 'scripts/__tests__/local-vector-store.test.mjs': No such file or directory
ls: cannot access 'scripts/lib/__tests__/local-vector-store.test.mjs': No such file or directory
--- dispatcher test references localStore/importLocalStore? ---
(no dispatcher test references the new local-store dep)
--- CLI prism-hybrid test? ---
ls: cannot ac
... [+101 chars truncated]

### Assistant | 2026-06-12T18:26:51.116Z

Important findings here. The default-on run confirms BOTH `vector` (count:0, Qdrant down) and `localvector` (count:20) legs fire — the query was embedded twice. Also notable: the `vector` leg shows `vectorDim:768` even with `count:0`, proving `embedImpl` succeeded for the Qdrant leg too (Ollama up), so the double-embed actually executes in the live default path.

The cross-check test the store lib's header CITES (`scripts/__tests__/local-vector-store.test.mjs`) does NOT exist. Let me verify this is a real gap (the store lib claims a guarding test) and locate where the actual test lives, if anywhere.

### Assistant | 2026-06-12T18:26:54.925Z

[tool_use: Bash]

### User | 2026-06-12T18:29:27.331Z

[tool_result] === Hunt for ANY local-vector-store test (cited as the cross-check guard) ===
./knowledge/memories/reference/reference_post_ship_high-roi-hunt-u-local-vector-leg.md
./knowledge/wiki/code-tribal/learnings/high-roi-hunt-u-local-vector-leg.md
./scripts/lib/local-vector-store.mjs
--- worktree side ---
/h/prism-slot-alpha/scripts/__tests__/apply-local-vector-leg.test.mjs
/h/prism-slot-alpha/scripts/__t
... [+199 chars truncated]

### Assistant | 2026-06-12T18:29:32.332Z

This clarifies the picture significantly. The cited cross-check test DOES exist — but only in the worktree (`/h/prism-slot-alpha/scripts/__tests__/local-vector-store.test.mjs`), not in main. That's part of the dual-tree split: the test + the leg are committed to `slot/alpha`, while the main-tree copy is `[MAIN-FORCE]`. Let me verify the worktree test actually passes (the leg's correctness foundation) and check whether the worktree-side prereq lib matches and the patchers are tested.

### Assistant | 2026-06-12T18:29:33.241Z

[tool_use: Bash]

### User | 2026-06-12T18:29:40.806Z

[tool_result] === Run the worktree cross-check test (the leg's correctness guard) ===
    # Subtest: missing store -> closure returns [] (never throws)
    ok 2 - missing store -> closure returns [] (never throws)
      ---
      duration_ms: 0.1074
      ...
    1..2
ok 5 - makeLocalVectorSearch closure (the hybridSearch injection point)
  ---
  duration_ms: 1.3302
  type: 'suite'
  ...
1..5
# tests 13
# suite
... [+80 chars truncated]

### Assistant | 2026-06-12T18:29:44.159Z

The worktree test passes 13/13, including the cross-check that the flat-array search matches the pure reference `defaultLocalVectorSearch`. The wd is the worktree (`scripts/__tests__/` resolved there). Let me run the patcher test and confirm the worktree-side prereq lib is the source of the main-tree cp.

### Assistant | 2026-06-12T18:29:47.519Z

[tool_use: Bash]

### User | 2026-06-12T18:29:53.669Z

[tool_result] === patcher test (apply-local-vector-leg) ===
# tests 12
# suites 3
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 349.7398

=== is there a test for the WIRE patchers (apply-local-vector-wire / -ts)? ===
(NO test for apply-local-vector-wire.mjs or -ts.mjs — the patchers themselves are untested)

=== git: are the two wire patchers + worktree store committed to slot/alpha? ===
e
... [+433 chars truncated]

### Assistant | 2026-06-12T18:29:59.016Z

Significant finding: the wire patchers, the worktree store lib copy, AND the cross-check test are all **untracked (`??`)** in the worktree — not yet committed to `slot/alpha`. The two prior commits (`e0f94117a0`, `9a02dde733`) shipped the LEG (in hybrid-retrieval.mjs) but the WIRE unit's artifacts are uncommitted. This is the in-progress state being reviewed, which is fine, but it means the "committed to slot/alpha" claim in the prompt is not yet true for these files.

Let me do a final check on EOL-awareness correctness and the anchor-stability of the `embedImpl` anchor (used in both patchers), then confirm the tsc gate claim.

### Assistant | 2026-06-12T18:30:03.262Z

[tool_use: Bash]

### Assistant | 2026-06-12T18:30:05.601Z

[tool_use: Bash]

### User | 2026-06-12T18:30:10.395Z

[tool_result] === EOL of the two target files (patcher claims EOL-aware) ===
scripts/prism-hybrid.mjs: LF
mcp-server/src/tools/dispatchers/sessionHybridSearchAction.ts: LF

=== anchor uniqueness: embedImpl line count in each (must be 1 for clean insert) ===
CLI embedImpl anchor occurrences: 1
ts embedImpl anchor occurrences: 1

### User | 2026-06-12T18:31:12.574Z

[tool_result] === tsc --noEmit: does sessionHybridSearchAction.ts introduce NEW errors? ===
EXIT-GREP-DONE
--- total error count (context: 648 pre-existing claimed) ---
0

### Assistant | 2026-06-12T18:31:18.909Z

Interesting — tsc returned 0 errors total here (the build may have a different tsconfig path or the 648 are in a different project scope). Either way, the critical fact holds: **zero errors mention `sessionHybridSearchAction.ts`, `local-vector`, or `LocalStore`** — the dispatcher patch is tsc-clean. Anchors are unique (1 occurrence each), both files are LF (EOL detection correct).

Let me do one final verification: confirm the `vector` leg's `count:0` in my default-on test was genuinely Qdrant-down (not a silent localvector masking) and verify the dispatcher's actual wiring into the MCP dispatcher case (is `runHybridSearchAction` actually called by a live dispatcher, or is it an orphan helper?).

### Assistant | 2026-06-12T18:31:21.307Z

[tool_use: Bash]

### User | 2026-06-12T18:31:32.842Z

[tool_result] === Is runHybridSearchAction actually CALLED by a live dispatcher case? (orphan check) ===
mcp-server/src/tools/dispatchers/sessionDispatcher.ts
mcp-server/src/tools/dispatchers/sessionHybridSearchAction.test.ts
--- the calling site ---
1813:            const { runHybridSearchAction } = await import("./sessionHybridSearchAction.js");
1814:            const result = await runHybridSearchAction(para
... [+51 chars truncated]

### Assistant | 2026-06-12T18:31:40.041Z

Confirmed — `runHybridSearchAction` IS wired into the live `sessionDispatcher.ts:1813-1814` (the `prism_session:hybrid_search` case), so the localvector leg now reaches external MCP clients. Not an orphan. And there's an existing dispatcher test (`sessionHybridSearchAction.test.ts`) — let me confirm it still passes with the new dep (it injects mocks, so the new `importLocalStore` default won't be exercised unless the smoke test resolves it).

### Assistant | 2026-06-12T18:31:43.595Z

[tool_use: Bash]

### User | 2026-06-12T18:31:49.640Z

[tool_result] === does the existing dispatcher test still pass with the new importLocalStore dep? (the real-imports smoke test resolves all file:// imports) ===
280:  it("smoke: real default imports resolve when query is empty (no Qdrant/Ollama needed)", async () => {
--- the smoke test will now ALSO resolve local-vector-store.mjs default import. Does that file exist at main tree? ---
YES — default import targe
... [+36 chars truncated]

### Assistant | 2026-06-12T18:31:55.372Z

The existing dispatcher test has a "real default imports resolve" smoke test (line 280). Critically: that test was written BEFORE the localvector dep was added. With the new `await importLocalStore()` now in `runHybridSearchAction` (line 135), the smoke test will now ALSO trigger the `defaultImportLocalStore()` → `file:///H:/prism/scripts/lib/local-vector-store.mjs` import. That file exists at main, so it resolves. But the smoke test was NOT re-run as part of this WIRE unit (no MCP harness run claimed). Let me run it to verify the wire didn't break the existing test.

### Assistant | 2026-06-12T18:31:56.729Z

[tool_use: Bash]

### User | 2026-06-12T18:32:18.885Z

[tool_result] === Run the existing dispatcher test against the patched .ts (verifies wire is non-breaking) ===

 RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/tools/dispatchers/sessionHybridSearchAction.test.ts (14 tests) 148ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  13:32:16
   Duration  437ms (transform 193ms, setup 0ms, import 111ms, tests 148ms, environment 0ms)

### Assistant | 2026-06-12T18:33:09.760Z

The existing dispatcher test passes 14/14 against the patched file — including the smoke test that now resolves the new `local-vector-store.mjs` default import. So the dispatcher WAS effectively runtime-exercised through the smoke test (the prompt's claim that it was "NOT runtime-tested" is overly pessimistic — the import-resolution path is covered, though the actual localvector retrieval with real vectors is not).

I have everything I need. Let me compile the verdict.

---

## REVIEW: U-LOCAL-VECTOR-LEG-WIRE (independent second-pass)

I read all 4 target artifacts plus the leg (`hybrid-retrieval.mjs`), the reader (`local-vector-store.mjs`), the worktree tests, and the live dispatcher caller end-to-end. I re-ran the live validation, idempotency, the worktree test suite, the patcher test, and the existing dispatcher vitest suite.

### What is correct and verified

- **The SPOF-kill works (re-validated live).** `prism-hybrid.mjs --no-memory --no-master --no-episode --no-vector --json` → `surfacesQueried:1, sources:[{localvector,count:20,vectorDim:768}], skipped:[]`, results.len 10. With Qdrant off, localvector alone returns ranked dense hits. This is the actual operator win and it is real.
- **CLI injection correct** — `prism-hybrid.mjs:29` (import) + `:93` (opts injection), 2 markers, both anchors unique (1 occurrence each), LF preserved.
- **Dispatcher injection correct** — `sessionHybridSearchAction.ts:42-45` (interface), `:60` (deps field), `:93-96` (defaultImportLocalStore), `:128` (resolve), `:135` (await), `:155-156` (opts injection), 6 markers. Mirrors the existing `defaultImportEpisode` pattern exactly — same `as string` loose-typed cross-tree import, same `?? defaultImport*` deps override convention (`sessionHybridSearchAction.ts:81-96, 124-129`). Convention conformance is clean.
- **Dispatcher is NOT an orphan** — `runHybridSearchAction` is called live at `sessionDispatcher.ts:1813-1814` (the `prism_session:hybrid_search` case). External MCP clients get the
... [+7281 chars truncated]
