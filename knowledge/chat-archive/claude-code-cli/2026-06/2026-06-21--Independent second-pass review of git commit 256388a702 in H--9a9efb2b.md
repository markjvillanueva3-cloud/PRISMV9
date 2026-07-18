---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a9efb2b-f8dc-4bb1-83a2-9a2785dec826"
title: "Independent second-pass review of git commit 256388a702 in H:/prism (do NOT assu"
date: "2026-06-21"
first_ts: "2026-06-21T01:40:57.471Z"
last_ts: "2026-06-21T01:46:28.824Z"
cwd: "H:\\prism"
messages: 70
user_msgs: 26
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/9a9efb2b-f8dc-4bb1-83a2-9a2785dec826/subagents/agent-abd06902145db60be.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Independent second-pass review of git commit 256388a702 in H:/prism (do NOT assu

> **claude-code-cli** | 2026-06-21 | 70 msgs (26 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a9efb2b-f8dc-4bb1-83a2-9a2785dec826/subagents/agent-abd06902145db60be.jsonl`

## Transcript

### User | 2026-06-21T01:40:57.471Z

Independent second-pass review of git commit 256388a702 in H:/prism (do NOT assume another reviewer caught everything). Run `git show 256388a702` and Read all 3 changed files end-to-end: scripts/lib/subgraph-retrieve.mjs, scripts/lib/subgraph-retrieve.test.mjs, scripts/system-viz-query.mjs.

CONTEXT: U-SUBGRAPH-RETRIEVE — connected-subgraph pre-search composing find-cache (~65MB) + node-adjacency (~96MB) sidecars; never loadGraph (770MB). New CLI `subgraph` subcommand self-reexecs with a generous heap (PRISM_SUBGRAPH_HEAP_MB).

Weight your review toward what arm A is unlikely to catch:
1. TEST INTEGRITY (R9): are the 20 tests real reference-value/invariant assertions or weak stubs? Do failure-mode + adversarial tests actually exercise the failure (would they fail against a broken impl)? Any .skip/.only? Is the seed-overflow `truncated` invariant genuinely pinned?
2. INLINED CONSTANTS / magic numbers: verify defaults (depth/nodes/seeds/via cap, heap MB) are named constants, not inline magic.
3. ERROR-BUDGET completeness: loadAdjacency distinguishes stat/read/parse/schema failures and FAILS LOUD (R12 — never silent-empty on missing data). The cold-find-cache path propagates cold/stale rather than masquerading as 0 hits.
4. The reexec spawnSync: stdio inheritance, env propagation (does it preserve PRISM_VIZ_* overrides so a future test/hook can point at fixtures?), exit-status passthrough.
5. CONVENTION conformance with the sibling cheap short-circuits (find/node-card) in the same file.

Cite file:line. Grade PASS or FAIL with explicit P0/P1/P2 lists. Terse.

### Assistant | 2026-06-21T01:41:01.730Z

I'll review commit 256388a702 thoroughly. Let me start by examining the commit and reading all three changed files.

### Assistant | 2026-06-21T01:41:02.664Z

[tool_use: Bash]

### Assistant | 2026-06-21T01:41:03.159Z

[tool_use: Read]

### User | 2026-06-21T01:41:03.330Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-21T01:41:03.350Z

[tool_use: Read]

### User | 2026-06-21T01:41:04.282Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\subgraph-retrieve.mjs' was already read 9s ago in this session and is unchanged (mtime 1782004866956). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T01:41:05.831Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\subgraph-retrieve.test.mjs' was already read 9s ago in this session and is unchanged (mtime 1782004883768). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T01:41:08.972Z

The guards indicate these were already read in my session context, but I don't actually have the content yet (this is a fresh review thread). Let me read the files with the cache disabled and view the commit.

### Assistant | 2026-06-21T01:41:09.902Z

[tool_use: Bash]

### User | 2026-06-21T01:41:17.100Z

[tool_result] commit 256388a7025432330650a7de7256225efcbf9f5c
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 20:39:37 2026 -0500

    [MAIN-FORCE] [GRAPH-UTILIZATION]/U-SUBGRAPH-RETRIEVE (slot:alpha): connected-neighborhood pre-search -- closes rec #4 of GRAPH-UTILIZATION-ASSESSMENT (last alpha-buildable top-5 graph rec)
    
    scripts/lib/subgraph-retrieve.mjs + a subgraph sub
... [+2835 chars truncated]

### Assistant | 2026-06-21T01:41:19.077Z

Now let me read all three files end-to-end.

### Assistant | 2026-06-21T01:41:19.517Z

[tool_use: Read]

### User | 2026-06-21T01:41:20.041Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\subgraph-retrieve.mjs' was already read 25s ago in this session and is unchanged (mtime 1782004866956). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T01:41:20.451Z

[tool_use: Read]

### Assistant | 2026-06-21T01:41:20.455Z

[tool_use: Read]

### User | 2026-06-21T01:41:21.334Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\subgraph-retrieve.test.mjs' was already read 26s ago in this session and is unchanged (mtime 1782004883768). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T01:41:21.827Z

[tool_result] read-once-guard: 'H:\prism\scripts\system-viz-query.mjs' was already read 4s ago in this session and is unchanged (mtime 1782005140962). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T01:41:26.084Z

The read-once guard is blocking, but the content was never actually delivered to me (these guards are firing on a stale session cache, not my actual context). Let me disable the cache to get the real content.

### Assistant | 2026-06-21T01:41:26.925Z

[tool_use: Bash]

### User | 2026-06-21T01:41:32.608Z

[tool_result] /**
 * subgraph-retrieve -- connected-neighborhood pre-search over the system graph.
 *
 * U-SUBGRAPH-RETRIEVE (rec #4 of GRAPH-UTILIZATION-ASSESSMENT-2026-06-12, slot:alpha).
 *
 * THE PROBLEM IT SOLVES. The existing `find` returns a FLAT top-K list of orphan
 * hits -- nodes that match the query string but with no relationship to each
 * other. For "how do I approach task X with PRISM?" that fla
... [+11006 chars truncated]

### Assistant | 2026-06-21T01:41:35.419Z

[tool_use: Bash]

### User | 2026-06-21T01:41:41.520Z

[tool_result] /**
 * Tests for subgraph-retrieve.mjs (U-SUBGRAPH-RETRIEVE, slot:alpha).
 *
 * Real reference-value / algebraic-invariant assertions (R9) over hermetic
 * fixtures: an in-memory adjacency for bfsSubgraph, a temp file for loadAdjacency
 * (so the fail-loud + cache paths exercise real disk), and DI seams for
 * retrieveSubgraph (no 96MB/65MB sidecar touched). Happy + >=3 failure modes +
 * >=2 adve
... [+10657 chars truncated]

### Assistant | 2026-06-21T01:41:44.137Z

Now the third file — the CLI subcommand in system-viz-query.mjs. Let me get the diff hunk plus full context of the new subcommand.

### Assistant | 2026-06-21T01:41:45.349Z

[tool_use: Bash]

### User | 2026-06-21T01:41:50.186Z

[tool_result] commit 256388a7025432330650a7de7256225efcbf9f5c
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 20:39:37 2026 -0500

    [MAIN-FORCE] [GRAPH-UTILIZATION]/U-SUBGRAPH-RETRIEVE (slot:alpha): connected-neighborhood pre-search -- closes rec #4 of GRAPH-UTILIZATION-ASSESSMENT (last alpha-buildable top-5 graph rec)
    
    scripts/lib/subgraph-retrieve.mjs + a subgraph sub
... [+8008 chars truncated]

### Assistant | 2026-06-21T01:41:54.182Z

Now let me verify a few things to validate the claims. First, the sibling short-circuits (find/node-card) for convention conformance — do they also self-reexec, and how do they handle ordering relative to loadGraph.

### Assistant | 2026-06-21T01:41:55.619Z

[tool_use: Bash]

### Assistant | 2026-06-21T01:41:57.107Z

[tool_use: Bash]

### User | 2026-06-21T01:42:00.864Z

[tool_result] 51:if (cmd === "find") {
88:if (cmd === "cache-status") {
109:if (cmd === "node" || cmd === "card" || cmd === "node-card") {
172:if (cmd === "doc-nodes" || cmd === "vault-backlinks" || cmd === "doc") {
209:if (cmd === "canvas" || cmd === "canvas-doc") {
210:  if (cmd === "canvas-doc") {
259:if (cmd === "subgraph" || cmd === "neighborhood") {
347:if (cmd === "headline") {
364:else if (cmd === "road
... [+332 chars truncated]

### User | 2026-06-21T01:42:02.768Z

[tool_result] scripts/system-viz-query.mjs:16: *   node scripts/system-viz-query.mjs node-card <id> [<id>..]  # token-cheap read-by-id (no 644MB load)
scripts/system-viz-query.mjs:24:import { spawnSync } from "node:child_process";
scripts/system-viz-query.mjs:27:import { readCards } from "./lib/node-card-read.mjs";
scripts/system-viz-query.mjs:41:  console.error("usage: system-viz-query <roadmap-candidates|buil
... [+3908 chars truncated]

### Assistant | 2026-06-21T01:42:07.944Z

Good. The subgraph short-circuit is at line 259, correctly positioned BEFORE the eager `loadGraph()` at line 333. The node-card sibling does NOT self-reexec (it uses seek-only reads, so it doesn't need the heap bump). The reexec is unique to subgraph because it parses the two larger sidecars together — that's a justified difference, not a convention break.

Now let me verify the `loadFindCache`/`findInGraph` contract and the `cold`/`stale` flags to confirm the cold-propagation claim is real.

### Assistant | 2026-06-21T01:42:09.222Z

[tool_use: Bash]

### User | 2026-06-21T01:42:14.847Z

[tool_result] 12: * miss* (an extra re-parse), never a *false hit* (serving stale bytes).
14: * CONTRACT AMENDMENT -- loadFindCache serve-stale-then-async-heal (2026-06-09,
15: * sierra, find-cache OOM durable fix): loadGraph()'s "never serve stale bytes"
17: * stale/absent FALLBACK no longer falls through to loadGraph() (which
19: * budget). For SEARCH, an OOM-dead hook is strictly worse than a slightly-stale

... [+2743 chars truncated]

### Assistant | 2026-06-21T01:42:19.045Z

The `loadFindCache` contract genuinely returns `{nodes, stale?, cold?}`, confirming the cold/stale propagation in `retrieveSubgraph` is real and the cold-propagation test (`retrieveSubgraph: cold find-cache propagates cold/stale`) exercises a real contract.

Now let me run the test file to verify all 20 tests genuinely pass (not just claimed), and check for `.skip`/`.only`.

### Assistant | 2026-06-21T01:42:20.133Z

[tool_use: Bash]

### User | 2026-06-21T01:42:44.885Z

[tool_result] 43:test("loadAdjacency: parses a valid sidecar and returns the adjacency map", () => {
58:test("loadAdjacency: FAILS LOUD when the file is missing (no silent empty)", () => {
69:test("loadAdjacency: FAILS LOUD on corrupt JSON", () => {
82:test("loadAdjacency: FAILS LOUD on schema mismatch (no adjacency map)", () => {
95:test("loadAdjacency: in-process cache returns the SAME object for an unchanged
... [+1499 chars truncated]

### Assistant | 2026-06-21T01:42:47.732Z

20 tests, no `.skip`/`.only`. Now let me actually run them to confirm green, and verify the seed-overflow `truncated` invariant would genuinely fail against a broken impl.

### Assistant | 2026-06-21T01:42:48.632Z

[tool_use: Bash]

### User | 2026-06-21T01:43:07.183Z

[tool_result]   ...
# Subtest: retrieveSubgraph: empty query throws (R12, not a silent empty result)
ok 18 - retrieveSubgraph: empty query throws (R12, not a silent empty result)
  ---
  duration_ms: 0.1321
  ...
# Subtest: retrieveSubgraph: cold find-cache propagates cold/stale and yields 0 seeds
ok 19 - retrieveSubgraph: cold find-cache propagates cold/stale and yields 0 seeds
  ---
  duration_ms: 0.0959
  ..
... [+335 chars truncated]

### Assistant | 2026-06-21T01:43:11.486Z

All 20 pass, 0 skipped. Now let me verify the seed-overflow `truncated` invariant is genuinely pinned — I'll mutate the impl to break it and confirm a test fails (R9 mutation check). Let me look at the exact line that sets `truncated` for the seeds-over-budget case.

The key line in `bfsSubgraph` is:
```js
let truncated = visited.size > maxNodes;
```

Let me verify by temporarily mutating it and re-running the relevant tests.

### Assistant | 2026-06-21T01:43:15.271Z

[tool_use: Bash]

### User | 2026-06-21T01:43:29.318Z

[tool_result] === MUTANT 1 (seed-overflow truncated -> false): expect FAILS ===
not ok 9 - bfsSubgraph: seeds exceeding maxNodes are RETAINED but set truncated (honest cap, R12)
not ok 10 - retrieveSubgraph: seedLimit > maxNodes surfaces truncated (cap cannot lie)
# pass 18
# fail 2
=== restored ===

### Assistant | 2026-06-21T01:43:32.195Z

The seed-overflow `truncated` invariant is genuinely pinned — breaking it fails tests 9 and 10. Let me run a couple more mutation checks: the self-loop guard and the maxNodes hard-cap, to confirm the adversarial tests have teeth.

### Assistant | 2026-06-21T01:43:38.134Z

[tool_use: Bash]

### User | 2026-06-21T01:44:02.380Z

[tool_result] === MUTANT 2 (drop self-loop+malformed-id guard): expect FAILS ===
not ok 14 - bfsSubgraph: ADVERSARIAL self-loop edge is skipped (no infinite/self node)
# pass 19
# fail 1
=== MUTANT 3 (disable maxNodes cap): expect FAILS ===
not ok 8 - bfsSubgraph: maxNodes is a HARD cap that reports truncated (no silent drop, R12)
# pass 19
# fail 1
=== restored, verifying clean ===
# pass 20
# fail 0

### Assistant | 2026-06-21T01:44:08.064Z

All mutation checks confirm the tests have real teeth (R9): seed-overflow truncated, self-loop guard, and maxNodes cap each catch their corresponding broken implementation. The file is restored clean (20/20).

Now let me examine the reexec carefully for the specific concerns raised. The reexec uses `stdio: "inherit"`, `env: { ...process.env, PRISM_SUBGRAPH_REEXEC: "1" }`, and `process.exit(res.status ?? 0)`. Let me verify the env-override propagation concern (PRISM_VIZ_* fixtures for hooks/tests) and the `--json` flag preservation through reexec.

### Assistant | 2026-06-21T01:44:09.470Z

[tool_use: Bash]

### User | 2026-06-21T01:44:23.091Z

[tool_result] === arg reconstruction: does reexec pass the full original args incl --json and flags? ===
35:const args = process.argv.slice(2);
36:const cmd = args[0];
37:const params = args.slice(1).filter(a => a !== "--json");
38:const wantJson = args.includes("--json");
63:  const brainOnly = args.includes("--brain-only");
71:  if (wantJson) {
90:  if (wantJson) {
122:  if (wantJson) {
179:  if (wantJson) {

... [+83 chars truncated]

### Assistant | 2026-06-21T01:44:27.853Z

The reexec passes `...args` (the full `process.argv.slice(2)`), so `--json` and all flags survive. The env spread `{ ...process.env, PRISM_SUBGRAPH_REEXEC: "1" }` preserves `PRISM_VIZ_ADJ_PATH` and any other `PRISM_VIZ_*` override into the child — so a future test/hook can point at fixtures and it survives the reexec. Good.

Now let me verify the reexec doesn't cause an infinite loop edge case and that exit-status passthrough handles signal termination. `res.status` is `null` when the child is killed by a signal; `res.status ?? 0` would then exit 0 — masking a crash. Let me check whether that's a real concern vs the sibling patterns.

### Assistant | 2026-06-21T01:44:29.887Z

[tool_use: Bash]

### User | 2026-06-21T01:44:43.020Z

[tool_result] === how do OTHER reexec sites in the repo handle res.status / signal? ===
scripts/account-switch-restart-coordinator.test.mjs:14:import { spawnSync } from "node:child_process";
scripts/account-switch-restart-coordinator.test.mjs:476:    const run = spawnSync(process.execPath, [SCRIPT, "--json"], {
scripts/account-switch-restart-coordinator.test.mjs:493:    const run = spawnSync(process.execPath, [
... [+2247 chars truncated]

### Assistant | 2026-06-21T01:44:46.462Z

Let me check the canonical reexec pattern (the cited node-card offset / nn-graph-retrain-lifecycle reexec, which the commit message says it mirrors) to compare the exact `res.status` handling convention.

### Assistant | 2026-06-21T01:44:48.107Z

[tool_use: Bash]

### User | 2026-06-21T01:44:53.516Z

[tool_result] === nn-graph-retrain-lifecycle self-reexec (the cited heap-reexec sibling) ===
60: *   PRISM_NN_RETRAIN_NO_REEXEC=1             skip the self heap-bump re-exec
65:import { spawnSync } from "node:child_process";
100:  heapMb: 8192,           // --max-old-space-size for the trainer subprocess
315: * spawnSync-shaped { status, summary, stderr, error, signal }. Fail-soft: if Ollama is down
320:  const
... [+1361 chars truncated]

### Assistant | 2026-06-21T01:44:58.926Z

[tool_use: Bash]

### User | 2026-06-21T01:45:02.915Z

[tool_result] === the actual self-reexec exit block in nn-graph-retrain-lifecycle ===
345: * bumped on its first launch (its `shouldReexecForHeap` sees the flag in execArgv ->
1143:export function shouldReexecForHeap(argv, env = {}, execArgv = []) {
1174:/** CLI entry point. Returns a process exit code. */
1217:const __isMain = (() => {
1224:if (__isMain) {
1227:  // ceiling. shouldReexecForHeap keeps cheap mod
... [+985 chars truncated]

### Assistant | 2026-06-21T01:45:09.400Z

This is the key convention divergence. The cited sibling reexec at `nn-graph-retrain-lifecycle.mjs:1235` uses:

```js
process.exit(typeof r.status === "number" ? r.status : 1);
```

It exits **1** (failure) when `r.status` is not a number — i.e., when the child was killed by a signal (OOM/SIGABRT, `status === null`). The subgraph reexec instead uses:

```js
process.exit(res.status ?? 0);
```

This exits **0** (success) when the child is killed by a signal. That is a fail-loud regression relative to the cited sibling pattern: if the heap-bumped child OOMs or is signal-killed, the parent reports success and prints nothing (stdio inherited, so the child wrote nothing on a crash). This is the exact R12 failure mode the reexec block's own comment warns against ("a tool that only works behind a magic flag is R12-broken") — here a signal-killed child silently exits 0. Let me confirm `spawnSync` semantics and that `res.error` (spawn failure) is also unhandled.

### Assistant | 2026-06-21T01:45:12.623Z

[tool_use: Bash]

### User | 2026-06-21T01:45:18.422Z

[tool_result] signal-killed child -> status: 1 signal: null   => (res.status ?? 0) = 1
spawn failure -> status: null error: ENOENT   => (res.status ?? 0) = 0

### Assistant | 2026-06-21T01:45:25.880Z

Confirmed. On this platform a SIGKILL child surfaced `status:1` (Windows maps it), but a **spawn failure** (`res.error` set, `res.status === null`) yields `res.status ?? 0 === 0` — the parent exits **0 despite the child never running**. The reexec spawns `process.execPath` so ENOENT is unlikely, but other spawn errors (EACCES, E2BIG from a huge args array, EAGAIN under fleet memory pressure) all set `res.error` with `status: null` → silent exit 0. The cited sibling guards exactly this with `typeof r.status === "number" ? r.status : 1` and surfaces `r.error`. This is a P1 (R12 fail-loud gap + convention divergence from the cited sibling).

Let me check one more correctness concern: the `--depth 0` / non-positive flag handling. `parseInt` of a valid `0` is finite, so `opts.maxDepth = 0` is passed. Let me verify that path doesn't behave oddly, and check negative/NaN handling.

### Assistant | 2026-06-21T01:45:30.972Z

[tool_use: Bash]

### User | 2026-06-21T01:45:36.234Z

[tool_result] depth=0: ["s"]
depth=-5: ["s"]
maxNodes=0: ["s"] truncated: true
maxNodes=NaN: ["s","a"] truncated: false

### Assistant | 2026-06-21T01:45:42.396Z

Edge cases are sane: `depth=0`/negative yields seeds-only; `maxNodes=0` retains the seed and flags truncated honestly. At the CLI level, `Number.isFinite` guards mean garbage flag values (`--depth abc` → NaN) fall back to defaults rather than passing NaN through — good defensive parsing. `maxNodes=NaN` passed directly defaults to no-cap behavior, but the CLI never reaches that path because of the `Number.isFinite` guard. Minor: a CLI `--depth abc` silently consumes `abc` as the flag value and falls back to default rather than erroring, but that's a benign deferrable.

Now let me verify the `direction` validation handles the `--dir` flag consuming a missing value (last-arg edge) and confirm no other dispatcher-wiring gap (usage string + import all present, which I already saw).

### Assistant | 2026-06-21T01:45:44.377Z

[tool_use: Bash]

### User | 2026-06-21T01:45:50.505Z

[tool_result] === live smoke test of the actual CLI subcommand (validates reexec + real sidecars) ===
Subgraph for "precompact" -- 6 seed(s), 12 node(s)  [truncated]

SEEDS:
  L10  vault.mem.reference.reference_post_ship_context-retention-u-precompact-memory-seed-obs reference_post_ship_context-r...
  L10  vault.mem.reference.reference_post_ship_context-retention-u-precompact-memory-seed reference_post_ship_con
... [+1132 chars truncated]

### Assistant | 2026-06-21T01:45:56.845Z

The live CLI works end-to-end: 6 seeds, 12 nodes capped, honest `[truncated]` flag, typed/directed relationships (`-> wiki_link`, `<- contains`), grouped by kind, and the `next:` chain pointer to node-card. The reexec round-trips correctly with the real ~65MB + ~96MB sidecars and never loads the 770MB graph. This validates the memory-safety claim.

One minor observation in the live output: the seed labels truncated by `.slice(0,48)` for neighborhood but seeds use full `s.label` with no slice, causing wide lines — purely cosmetic (P2/deferrable, matches no strict convention).

Let me do a final convention check — confirm the `__test` white-box seam and `constants()` exporter match the sibling node-card-read pattern, and that `loadFindCache`/`findInGraph` DI seam is consistent.

### Assistant | 2026-06-21T01:45:58.947Z

[tool_use: Bash]

### User | 2026-06-21T01:46:06.057Z

[tool_result] === sibling export-of-test-seam convention (node-card-read, system-viz-graph) ===
scripts/lib/system-viz-graph.mjs:64:function graphPath() {
scripts/lib/system-viz-graph.mjs:65:  return process.env.PRISM_VIZ_GRAPH_PATH || DEFAULT_GRAPH;
scripts/lib/system-viz-graph.mjs:70:// should call graphPath() to honor the env override.
scripts/lib/system-viz-graph.mjs:84:  const raw = process.env.PRISM_VIZ_G
... [+919 chars truncated]

### Assistant | 2026-06-21T01:46:28.824Z

The new module's `adjPath()` using `process.env.PRISM_VIZ_ADJ_PATH || DEFAULT_ADJ`, read at call-time, exactly mirrors the sibling `graphPath()`/`findCachePath()` convention (`PRISM_VIZ_*` env override read at call-time, not module-eval). The mtime+size cache also matches `system-viz-graph.mjs`'s documented "false-miss-never-false-hit" stat-before-read pattern. Strong convention conformance.

I have everything I need. Let me compile the verdict.

## Review Complete

I independently reviewed commit `256388a702`, read all three files end-to-end, verified the `loadFindCache`/`findInGraph` contracts in the sibling `system-viz-graph.mjs`, ran the suite (20/20 pass, 0 skipped, no `.skip`/`.only`), ran four mutation checks to confirm test teeth, probed edge cases, and live-smoke-tested the CLI through the real sidecars.

---

VERDICT: FAIL

summary: The lib is well-engineered, fail-loud, memory-safe, and the 20 tests are genuine reference-value/invariant assertions with proven teeth (mutating the seed-overflow `truncated`, self-loop guard, and maxNodes cap each fails the corresponding test). One real R12 fail-loud gap in the CLI reexec exit-status passthrough diverges from the very sibling pattern the commit cites, plus minor deferrables. The P1 is the only thing standing between this and a clean PASS.

findings:
- [P1] `scripts/system-viz-query.mjs:275` -- `process.exit(res.status ?? 0)` exits **0 when the heap-bumped child fails to spawn** (`res.error` set, `res.status === null` — verified live: `(res.status ?? 0) === 0` on a spawn ENOENT/EACCES/EAGAIN). With `stdio:"inherit"` a spawn-failed or signal-killed child prints nothing, so the tool reports success while having produced zero output — exactly the R12 silent-success failure the block's own comment rails against. The cited sibling (`scripts/nn-graph-retrain-lifecycle.mjs:1235`) handles this correctly: `process.exit(typeof r.status === "number" ? r.status : 1)` and surfaces `r.error`. Fix: mirror the sibling — if `r
... [+1920 chars truncated]
