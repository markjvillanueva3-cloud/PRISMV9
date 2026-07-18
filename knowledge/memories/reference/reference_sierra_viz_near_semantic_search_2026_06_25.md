---
name: reference-sierra-viz-near-semantic-search-2026-06-25
description: "Shipped U-VIZ-NEAR + U-VIZ-NEAR-ARGFIX (slot:sierra, 2026-06-25): semantic nearest-neighbor node search `node scripts/system-viz-query.mjs near <id> [--k N] [--json]` over the 60,218-node rtx6000 768d embedding pool (state/shared/nn-graph/node-embeddings-768d.jsonl). The SEMANTIC complement to find (substring) / subgraph (edges) / node-card (read-by-id) on the cheap-read surface -- never loads the 884MB graph. Core lesson: a green pure-lib test suite (12/12) shipped a P0 in the CLI arg-parsing because the COMMAND surface had zero coverage; the 3-of-3 arm B caught it. Lib-green != CLI-tested."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.204Z
aliases: reference_sierra_viz_near_semantic_search_2026_06_25
---


# U-VIZ-NEAR: semantic nearest-neighbor node search (slot:sierra, 2026-06-25)

Shipped under the `continue /yolo` + ultracode directive after 5 in-domain levers
verified ALREADY-BUILT (node-card MCP action, leverage-queue, watcher-correct,
consensus-of edge, cron fabric). The ONE genuine gap: the cheap-read surface had
`find` (substring), `subgraph` (edges), `node-card` (read-by-id) but NO SEMANTIC
neighbor lookup -- "what nodes are conceptually like this one".

## What shipped
- **`node scripts/system-viz-query.mjs near <id> [--k N] [--json]`** -- cosine top-K
  over the 60,218-node 768d pool (`state/shared/nn-graph/node-embeddings-768d.jsonl`,
  record shape `{n:<id>, q:[768 ints]}`), each neighbor enriched with its node-card
  (label/layer/kind). NEVER loads the 884MB graph (short-circuits before loadGraph,
  like find/octopus/node-card). Live: `core.hooks_cl` -> `fe.cli`/claude-brief-*
  (semantically tight); heap 6.3MB; ~1.2s.
- **`scripts/lib/node-near-search.mjs`** -- pure `cosineSim` (returns 0 not NaN on
  zero-norm/mismatch/non-finite), `parseEmbeddingRecord`, `makeTopK`, `topKFromRecords`,
  `parseNearArgs`, + **streaming** async `nearById` (two bounded-memory readline passes:
  find query vector, then score all). 13 reference-value tests.
- Commits: `d828f94` (U-VIZ-NEAR) + the argfix (U-VIZ-NEAR-ARGFIX). 3-of-3 PASS.

## Two real defects caught (R12/R16 -- live validation + scrutiny, not "looks fine")
1. **OOM on first live run** -- the initial `loadRecords` held all 60k x 768-int
   vectors in memory (~384MB, past the heap cap). Fix: STREAM (readline), never
   materialize the pool. Lesson = my own sierra refuse: "never load the big thing
   in one parse" applies to the embeddings file too, not just the graph.
2. **P0: bare `near <id>` never extracted the id** -- the inline predicate
   `params.find((p,i)=>!p.startsWith("--") && i!==kFlag+1)` excluded index 0 when
   `--k` was absent (`kFlag=-1` -> `kFlag+1=0`). So `near <id>` and `near <id> --json`
   (the two simplest forms) failed with "near needs <id>". EVERY shipped live test
   happened to use `--k`, so it sailed through 12/12 green; I even MISREAD the
   bare-id failure as the usage path. **Caught by 3-of-3 arm B, not by me or my
   validation.** Fix: extract pure `parseNearArgs(params)` + a 9-case regression
   test that simulates the old buggy predicate (true oracle).

## The reusable lesson: lib-green != CLI-tested (R9/R15)
A passing PURE-LIB suite proves the lib, NOT the command. The CLI glue (arg parsing,
exit codes, the dispatcher/short-circuit wiring) is the actual deliverable callers
use, and it needs its OWN coverage. Extract CLI arg-parsing into a pure exported fn
so the command surface is unit-testable -- an inline predicate in the subcommand
block has no test and is exactly where the bug shipped. Validate EVERY invocation
form (bare, each flag, each ordering), not just the one you happened to type. (Also:
the Bash `node` shim collapses exit codes >=3 to 0 -- verify non-zero exits with the
REAL binary `H:/Tools/nodejs/node.exe`, per arm C.) -> [[feedback_loop_until_gaps_filled]]

## Dispatcher parity SHIPPED (U-VIZ-NEAR-DISPATCHER + -TESTS, same session)
`prism_session:node_near` MCP action added (z.enum + handler case in sessionDispatcher.ts,
mirroring node_card exactly) -> the semantic search now has both CLI + MCP-UP surfaces (R15
complete). Pure runner `sessionNodeNearAction.ts` (normalizeNearParams + runNodeNearAction,
dep-injected, fail-soft) delegates to the `near` CLI via execFileSync (argv array, no shell;
k bounded [1,100] before String(k); a `--`-prefixed id is safely dropped by parseNearArgs ->
fail-soft, no flag-injection). 10 runner tests; R15 round-trip validated against the real CLI
(total=60218). Per-file 2-arm scrutiny PASS (wiring + independent); both arms confirmed
security-safe + type-safe. No Zod schema file (node_card precedent: normalize in runner).

## Remaining follow-ups (non-blocking, queued)
- Arm C P2: a spawn round-trip test asserting `near <bogus-id>` exits non-zero (real binary).
- Arm C P2: human output could hint when the k-cutoff falls amid a byte-identical 1.0 tie band.
- ENOEMBED via the dispatcher surfaces "Command failed:" (execFileSync wrap) not the CLI's
  "no embedding" stderr -- fail-soft + success:false is correct, but capturing stderr would
  give a cleaner error message (P3 polish).
