---
type: "chat-session"
source: "claude-code-cli"
session_id: "63dafa30-5781-4963-bca2-c42e28ae48a2"
title: "Review this surgical 3-file change in the PRISM repo (H:/prism) for correctness,"
date: "2026-06-25"
first_ts: "2026-06-25T13:06:15.856Z"
last_ts: "2026-06-25T13:09:03.256Z"
cwd: "H:\\prism"
messages: 41
user_msgs: 16
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/63dafa30-5781-4963-bca2-c42e28ae48a2/subagents/agent-a67f8f2d2d0951cca.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Review this surgical 3-file change in the PRISM repo (H:/prism) for correctness,

> **claude-code-cli** | 2026-06-25 | 41 msgs (16 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/63dafa30-5781-4963-bca2-c42e28ae48a2/subagents/agent-a67f8f2d2d0951cca.jsonl`

## Transcript

### User | 2026-06-25T13:06:15.856Z

Review this surgical 3-file change in the PRISM repo (H:/prism) for correctness, silent breakage, convention conformance, and regression risk. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Read each file end-to-end.

CONTEXT / INTENT: `scripts/system-viz-query.mjs` had two defects:
- Defect A: an unrecognized command (`--help`, `-h`, a typo) was non-empty so it skipped the empty-cmd usage, matched no cheap short-circuit, and fell through to the eager `loadGraph()` (644MB) — OOMing on the default heap — before finally hitting the `unknown command` else at the bottom.
- Defect B: the main `loadGraph()` path had NO heap guard (unlike the `subgraph` short-circuit which self-respawns with --max-old-space-size), so graph commands OOM'd on the default heap.

THE CHANGE:
1. NEW pure planner `scripts/lib/viz-query-heap-reexec.mjs` — exports isKnownGraphCmd(cmd), planHeapRespawn({execArgv,env,breakerVar,heapVar,defaultMb}), GRAPH_CMDS (frozen 8: headline, roadmap-candidates, blast-radius, dispatcher-summary, coverage-by-domain, worktrees, build-order, find), GRAPH_USAGE.
2. NEW test `scripts/lib/viz-query-heap-reexec.test.mjs` (node:test, 13 tests, all passing).
3. EDITED `scripts/system-viz-query.mjs`: added the import; migrated the inline `subgraph` heap-reexec block to use planHeapRespawn (build-once); inserted BEFORE `let G; try { G = loadGraph() }` a guard: if !isKnownGraphCmd(cmd) print usage (exit 0 for help, 2 for unknown) WITHOUT loading the graph, else self-respawn once with PRISM_VIZQUERY_HEAP_MB (default 16384).

Verify specifically:
- The known-graph-cmd allowlist (GRAPH_CMDS) EXACTLY matches the if/else dispatch chain that runs after loadGraph() in system-viz-query.mjs (headline fallback, roadmap-candidates, blast-radius, dispatcher-summary, coverage-by-domain, worktrees, build-order; find is the unreachable documented fallback). Any VALID command that would now be wrongly rejected as "unknown" before reaching its handler is a P0.
- No infin
... [+1164 chars truncated]

### Assistant | 2026-06-25T13:06:20.263Z

I'll review this 3-file change end-to-end. Let me start by reading all the files.

### Assistant | 2026-06-25T13:06:20.748Z

[tool_use: Read]

### Assistant | 2026-06-25T13:06:21.221Z

[tool_use: Read]

### Assistant | 2026-06-25T13:06:21.381Z

[tool_use: Read]

### User | 2026-06-25T13:06:22.741Z

[tool_result] 1	/**
2	 * viz-query-heap-reexec -- pure planner for system-viz-query's graph-command
3	 * guard + heap self-respawn.
4	 *
5	 * Extracted (build-once, R15) so two real defects in system-viz-query.mjs are
6	 * unit-testable WITHOUT spawning a 644 MB graph load:
7	 *
8	 *   Defect A (OOM/cost on typo): an UNKNOWN command (incl. `--help` / `-h`)
9	 *     used to fall all the way through the eager `lo
... [+6542 chars truncated]

### User | 2026-06-25T13:06:23.160Z

[tool_result] 1	/**
2	 * Tests for viz-query-heap-reexec (the system-viz-query OOM-on-help + missing
3	 * Blackwell heap guard fix). Pure planner -> no graph load, no spawn.
4	 *
5	 * Run: node scripts/lib/viz-query-heap-reexec.test.mjs   (node:test auto-runs on
6	 * exit). `node --test <file>` reports 0 tests in this env -- run the file directly.
7	 */
8	import { test } from "node:test";
9	import assert from "
... [+6240 chars truncated]

### User | 2026-06-25T13:06:23.596Z

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
... [+42401 chars truncated]

### Assistant | 2026-06-25T13:06:29.024Z

I've read all three files end-to-end. Now let me verify the critical claim: that `GRAPH_CMDS` exactly matches the post-`loadGraph()` dispatch chain. Let me extract the dispatch chain conditions precisely.

### Assistant | 2026-06-25T13:06:30.447Z

[tool_use: Grep]

### Assistant | 2026-06-25T13:06:31.270Z

[tool_use: Grep]

### User | 2026-06-25T13:06:33.211Z

[tool_result] 57:if (cmd === "find") {
94:if (cmd === "cache-status") {
115:if (cmd === "octopus" || cmd === "consensus") {
134:if (cmd === "near") {
174:if (cmd === "headline") {
205:if (cmd === "node" || cmd === "card" || cmd === "node-card") {
268:if (cmd === "doc-nodes" || cmd === "vault-backlinks" || cmd === "doc") {
305:if (cmd === "canvas" || cmd === "canvas-doc") {
306:  if (cmd === "canvas-doc") {
355:
... [+513 chars truncated]

### User | 2026-06-25T13:06:33.822Z

[tool_result] 26:import { spawnSync } from "node:child_process";

### Assistant | 2026-06-25T13:06:42.569Z

Now I have the complete picture. Let me cross-check the post-`loadGraph()` dispatch chain (lines 532-799) against `GRAPH_CMDS`.

Post-loadGraph dispatch handlers (the if/else-if chain that runs after line 496):
- 532: `headline`
- 540: `roadmap-candidates`
- 564: `blast-radius`
- 622: `dispatcher-summary`
- 634: `coverage-by-domain`
- 653: `find` (documented unreachable)
- 663: `worktrees`
- 752: `build-order`
- 796: `else` → unknown command

`GRAPH_CMDS` = `headline, roadmap-candidates, blast-radius, dispatcher-summary, coverage-by-domain, worktrees, build-order, find` (8 entries).

These match exactly — all 8 post-loadGraph handlers are in the allowlist, and every allowlist entry has a handler. Let me verify there are no aliases I'm missing in the graph chain and double-check the `--json`/params handling and the `near` async edge case interaction with the new guard.

### Assistant | 2026-06-25T13:06:43.495Z

[tool_use: Read]

### Assistant | 2026-06-25T13:06:44.507Z

[tool_use: Bash]

### User | 2026-06-25T13:06:44.595Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so a single process can load
5	 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
6	 *
7	 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
8	 * module-scope cache keyed on the graph file's mtime + size. A seco
... [+3289 chars truncated]

### User | 2026-06-25T13:06:48.622Z

[tool_result]   ...
# Subtest: planHeapRespawn: missing breakerVar/heapVar throws (contract)
ok 11 - planHeapRespawn: missing breakerVar/heapVar throws (contract)
  ---
  duration_ms: 0.2835
  ...
# Subtest: planHeapRespawn: non-positive / non-finite defaultMb throws (contract)
ok 12 - planHeapRespawn: non-positive / non-finite defaultMb throws (contract)
  ---
  duration_ms: 0.0985
  ...
# Subtest: GRAPH_USAGE
... [+252 chars truncated]

### Assistant | 2026-06-25T13:06:53.368Z

13/13 tests pass. Now let me verify the live behavior the change claims, and check the ASCII/exec contracts on the actual byte level for both code files.

### Assistant | 2026-06-25T13:06:54.772Z

[tool_use: Bash]

### Assistant | 2026-06-25T13:06:55.545Z

[tool_use: Bash]

### User | 2026-06-25T13:06:59.115Z

[tool_result] system-viz-query <command> [params] [--json]

Cheap commands (no 644MB graph load):
  find <query> [--brain-only]   case-insensitive node search (find-cache)
  subgraph <query>              connected neighborhood (sidecars only)
  node-card <id> [<id>...]      token-cheap read-by-id
  near <id> [--k N]             768d semantic nearest-neighbor
  doc-nodes <docOrSlug>         graph node(s) a vault
... [+839 chars truncated]

### User | 2026-06-25T13:07:03.454Z

[tool_result] unknown command: frobnicate

system-viz-query <command> [params] [--json]

Cheap commands (no 644MB graph load):
  find <query> [--brain-only]   case-insensitive node search (find-cache)
  subgraph <query>              connected neighborhood (sidecars only)
  node-card <id> [<id>...]      token-cheap read-by-id
  near <id> [--k N]             768d semantic nearest-neighbor
  doc-nodes <docOrSlug> 
... [+868 chars truncated]

### Assistant | 2026-06-25T13:07:07.583Z

Both behaviors confirmed live. Now let me check the ASCII/exec contract on the byte level and the git diff to confirm exactly what changed.

### Assistant | 2026-06-25T13:07:09.950Z

[tool_use: Bash]

### Assistant | 2026-06-25T13:07:11.982Z

[tool_use: Bash]

### User | 2026-06-25T13:07:14.259Z

[tool_result] === scripts/lib/viz-query-heap-reexec.mjs ===
non-ASCII bytes: 0
exec( substring: 0
0
=== scripts/lib/viz-query-heap-reexec.test.mjs ===
non-ASCII bytes: 0
exec( substring: 0
0

### User | 2026-06-25T13:07:20.332Z

[tool_result]  scripts/system-viz-query.mjs | 80 +++++++++++++++++++++++++++++++++++---------
 1 file changed, 64 insertions(+), 16 deletions(-)
---UNTRACKED---
 M scripts/system-viz-query.mjs
?? scripts/lib/viz-query-heap-reexec.mjs
?? scripts/lib/viz-query-heap-reexec.test.mjs

### Assistant | 2026-06-25T13:07:26.329Z

New files are ASCII-only with no `exec(` substring. Note: `system-viz-query.mjs` itself (the edited file) still contains the pre-existing emoji/non-ASCII characters in the cheap-command output blocks (e.g. `✗`, `⚠`, `📦`, `📂`), but those are unchanged pre-existing lines, not part of this diff. Let me confirm the diff didn't introduce any new non-ASCII and review the exact edit hunks.

### Assistant | 2026-06-25T13:07:26.880Z

[tool_use: Bash]

### User | 2026-06-25T13:07:30.880Z

[tool_result] diff --git a/scripts/system-viz-query.mjs b/scripts/system-viz-query.mjs
index e1007c8db2..08f1643fd4 100644
--- a/scripts/system-viz-query.mjs
+++ b/scripts/system-viz-query.mjs
@@ -33,6 +33,7 @@ import { summarizeCanvas, canvasNodesForDoc } from "./lib/canvas-read-lib.mjs";
 import { retrieveSubgraph } from "./lib/subgraph-retrieve.mjs";
 import { readConsensusDecisions, CONSENSUS_DECISIONS_PATH
... [+4885 chars truncated]

### Assistant | 2026-06-25T13:07:49.603Z

The diff confirms the change is exactly as described. Now let me carefully analyze the two subtle interaction points the task flagged: (1) the `headline` double-respawn/double-stderr concern, and (2) whether the headline fallthrough now passes through the new guard before reaching the fallback block at line 532.

This is the critical correctness question. Let me trace the `headline` control flow:

1. `cmd === "headline"` reaches the short-circuit at line 174.
2. If meta-read succeeds → prints + `process.exit(0)`. Done. Never reaches the guard.
3. If meta-read fails/incomplete → logs to stderr (line 195), then **falls through** (no exit) past lines 199-453 (all those `if` blocks are for other cmds), and reaches the new guard block at line 467.
4. At line 467, `isKnownGraphCmd("headline")` is `true`, so it skips the unknown-command branch and enters the heap-respawn block at line 476.
5. `planHeapRespawn` → on a clean launch `shouldRespawn=true` → it **respawns the whole process** with the heap bump.
6. The child re-runs from the top: `cmd === "headline"` hits the short-circuit at line 174 **again**, fails again (same reason), logs the **same stderr line again** (now in the child), falls through, hits the guard — but now `PRISM_VIZQUERY_REEXEC=1` so `shouldRespawn=false`, proceeds to `loadGraph()`, reaches the fallback block at 532.

Let me verify this double-stderr behavior live to confirm it's the documented P2 and not worse.

### Assistant | 2026-06-25T13:07:52.135Z

[tool_use: Bash]

### User | 2026-06-25T13:08:05.450Z

[tool_result] EXIT=0
--- STDERR (count of fallback lines) ---
2
--- STDERR content ---
[system-viz-query] headline: cheap meta read unavailable -- readGraphMeta error: Cannot parse-meta graph at H:\prism\state\shared\system-viz\system-graph.json.
  top-level "meta" not found or not closed within first 10 bytes
  Run: node scripts/generate-system-viz.mjs; falling back to full-graph loadGraph()
[system-viz-query]
... [+383 chars truncated]

### Assistant | 2026-06-25T13:08:13.501Z

Confirmed live: the headline fallback path emits the stderr fallback message **twice** (once in the parent before respawn, once in the child after respawn), but:
- Exit code is correct (0).
- **stdout is clean** — the headline JSON is emitted exactly once, by the child. Consumers parsing stdout (the documented contract: stderr is deliberately kept off stdout per the line-195 comment) are unaffected.

This is a genuine but cosmetic P2: the parent process logs the diagnostic, then respawns, and the child re-does the failed cheap-read and logs it again. It's redundant noise on stderr only, behavior-correct otherwise. Not a regression of any contract.

Now let me verify the remaining points: that no cheap short-circuit can reach the guard with a graph cmd it shouldn't, and confirm the `near` async path (which uses `await` at top level) doesn't interact badly. Let me also confirm the subgraph migration parity for the `spawnSync` structure and that `headline` is the only graph cmd that can fall through a cheap short-circuit.

### Assistant | 2026-06-25T13:08:14.319Z

[tool_use: Read]

### User | 2026-06-25T13:08:17.722Z

[tool_result] 532	if (cmd === "headline") {
533	  // Fallback path only (reached when the readGraphMeta short-circuit above fell
534	  // through). Same renderer => identical output. meta.totals carries the
535	  // node/edge/layer counts the short-circuit also uses.
536	  const { human, machine } = buildHeadline(G.meta, G.generatedAt);
537	  out(human, machine);
538	}
539	
540	else if (cmd === "roadmap-candida
... [+161 chars truncated]

### Assistant | 2026-06-25T13:08:29.503Z

Confirmed. The fallback `headline` block at 532 runs after `loadGraph()` succeeds. Now let me verify the one remaining subtle point: the `headline` cheap short-circuit at line 174 has NO `process.exit()` on the fallthrough path — it relies on falling through to the guard. I need to confirm that between line 197 (end of headline short-circuit) and line 467 (guard), there is no other `if (cmd === ...)` block that `headline` would erroneously enter. The intervening blocks are node-card (205), doc-nodes (268), canvas (305), subgraph (355) — none match `headline`, so it correctly falls to the guard. Verified.

Let me do a final check on whether `near` (the `await`-using async path at line 138) being top-level `await` affects the synchronous guard flow, and confirm there are no other entry points that bypass the cheap exits.

### Assistant | 2026-06-25T13:08:30.884Z

[tool_use: Bash]

### User | 2026-06-25T13:08:35.544Z

[tool_result] --- top-level await present? ---
138:  try { res = await nearById(id, { k }); }
--- all process.exit before line 467 (guard) ---
36

### Assistant | 2026-06-25T13:09:03.256Z

The only top-level `await` is inside the `near` short-circuit (line 138), which always `process.exit()`s before the guard. There are 36 `process.exit()` calls before the guard, covering every cheap command path. The guard at line 467 is only ever reached by graph cmds (which all reach loadGraph after the heap respawn) or unknowns. All verified.

Let me do one final confirmation that `cache-status`/`octopus`/`near`/`doc-nodes`/`canvas`/`subgraph`/`node-card`/`find` each unconditionally exit, and check the `subgraph` migration preserves the `spawnSync` arg structure exactly (the `breakerVar` interpolation `[plan.breakerVar]: "1"` vs the old literal `PRISM_SUBGRAPH_REEXEC: "1"`).

The old code used `env: { ...process.env, PRISM_SUBGRAPH_REEXEC: "1" }`; the new code uses `[plan.breakerVar]: "1"` where `plan.breakerVar === "PRISM_SUBGRAPH_REEXEC"`. Since `planHeapRespawn` returns `breakerVar` echoed back from its input (line 104), this is identical. The `spawnSync` call site structure (`process.execPath`, `[--max-old-space-size=${plan.heapMb}, fileURLToPath(import.meta.url), ...args]`, `{ stdio: "inherit", env }`) is structurally unchanged. Confirmed behavior-equivalent.

I have completed a thorough end-to-end review of all three files plus live validation. Here is my verdict.

---

VERDICT: PASS

summary: This surgical 3-file change correctly fixes both defects. The new pure planner `viz-query-heap-reexec.mjs` and its 13-test suite are clean (ASCII-only, no `exec(`, all tests pass live). The `GRAPH_CMDS` allowlist exactly matches the post-`loadGraph()` if/else dispatch chain in `system-viz-query.mjs` (all 8 handlers — `headline`, `roadmap-candidates`, `blast-radius`, `dispatcher-summary`, `coverage-by-domain`, `find`, `worktrees`, `build-order` — map 1:1, no valid command is wrongly rejected). The infinite-respawn breaker, heap sanitization, subgraph-migration parity, and cheap-short-circuit ordering are all correct, and I verified the claimed live behaviors directly.


... [+2928 chars truncated]
