---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review the TEST file `H:/prism/scripts/seed-ghost-gnn-classify.test.mjs` for tes"
date: "2026-05-16"
first_ts: "2026-05-16T18:50:00.356Z"
last_ts: "2026-05-16T18:51:14.753Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-accd6999e680b1233.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review the TEST file `H:/prism/scripts/seed-ghost-gnn-classify.test.mjs` for tes

> **claude-code-cli** | 2026-05-16 | 19 msgs (7 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-accd6999e680b1233.jsonl`

## Transcript

### User | 2026-05-16T18:50:00.356Z

Review the TEST file `H:/prism/scripts/seed-ghost-gnn-classify.test.mjs` for test quality and coverage.

MANDATORY FIRST STEP: use the Read tool on `H:/prism/scripts/seed-ghost-gnn-classify.test.mjs` AND `H:/prism/scripts/seed-ghost-gnn-classify.mjs`. Do not rely on memory or "cached context" — Read them now. Two prior reviewers hallucinated this file and were discarded; to prove you read the real file your review must quote 3 test names VERBATIM and cite real line numbers that exist in the file.

CONTEXT — unit U6 (U-NNG-INFERENCE-FIFTH-TIER) of NN-GRAPH-MS0. The unit `seed-ghost-gnn-classify.mjs` is a GNN tier-5 dispatcher classifier: for each UNKNOWN `ghost.unwired-engine` graph node it predicts a dispatcher via GraphSAGE-embedding k-NN label-propagation over high-confidence reference ghosts. Its real exports: `GNN_DEFAULTS` (a frozen object with keys `minConf/refMinConf/topK/maxNodes/confidenceCap` — NOT `enabled`), `GHOST_KIND`, `DISPATCHER_RE`, `DEFAULT_CHECKPOINT`, `isValidDispatcher`, `resolveGnnConfig`, `loadGnnCheckpoint`, `partitionGhosts`, `buildGhostSubgraph`, `voteDispatcher` (uses a `Map` for vote tallying, not a bare object), `classifyUnknownGhosts(graph, opts)`, `gnnClassifyUnknowns(unknowns, opts)`, `applyGnnClassifications`, `parseArgs`, `main`. The test file uses `node:test` + `node:assert/strict` — no mock framework. There are 58 tests; all pass under `node --test`.

PRISM mandates: real-value assertions (never `toBeDefined()`-style stubs), coverage = happy path + ≥3 failure modes + ≥2 adversarial inputs + a variability floor (≥3 spanning configs).

Assess the REAL file end-to-end:
  - Are assertions concrete (real expected values / algebraic invariants), or weak tautologies that would pass against a hardcoded return?
  - Is every exported function covered by at least one test?
  - Failure modes exercised: `disabled`, `no-checkpoint`, `no-references`, `embed-failed`, malformed-checkpoint-JSON, graph-load-failure?
  - Adversarial: `__proto__` dis
... [+830 chars truncated]

### Assistant | 2026-05-16T18:50:06.409Z

I'll start by reading both files as mandated.

### Assistant | 2026-05-16T18:50:07.290Z

[tool_use: Read]

### Assistant | 2026-05-16T18:50:07.496Z

[tool_use: Read]

### User | 2026-05-16T18:50:07.797Z

[tool_result] read-once-guard: 'H:\prism\scripts\seed-ghost-gnn-classify.test.mjs' was already read 5m ago in this session and is unchanged (mtime 1778957012946). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T18:50:07.990Z

[tool_result] read-once-guard: 'H:\prism\scripts\seed-ghost-gnn-classify.mjs' was already read 5m ago in this session and is unchanged (mtime 1778957065034). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T18:50:10.692Z

The read-once guard claims these files are in context, but they are not — this is a fresh session. I must defeat the cache to genuinely read the real files, since two prior reviewers hallucinated this exact file.

### Assistant | 2026-05-16T18:50:12.289Z

[tool_use: Bash]

### User | 2026-05-16T18:50:17.416Z

[tool_result]   629 H:/prism/scripts/seed-ghost-gnn-classify.test.mjs
  504 H:/prism/scripts/seed-ghost-gnn-classify.mjs
 1133 total
---SHA---
512e54b6755b7bada7191065d95e85d00b3c1d04aa15bee32ef671ab65e59079 *H:/prism/scripts/seed-ghost-gnn-classify.test.mjs
24ef85eafaa78dad13dac4bb958285e701798c540812603054685497e32fc509 *H:/prism/scripts/seed-ghost-gnn-classify.mjs

### Assistant | 2026-05-16T18:50:19.753Z

Files are real. Now reading them by defeating the read-once guard.

### Assistant | 2026-05-16T18:50:20.236Z

[tool_use: Read]

### User | 2026-05-16T18:50:21.039Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
4	 *
5	 * The 5th tier of the wiring-inference cascade. The first four tiers —
6	 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
7	 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
8	 * adds a GraphSAGE-derived classifier and ru
... [+23323 chars truncated]

### Assistant | 2026-05-16T18:50:23.076Z

Now the test file.

### Assistant | 2026-05-16T18:50:23.986Z

[tool_use: Read]

### User | 2026-05-16T18:50:24.987Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-gnn-classify.test.mjs — node:test suite for the GNN tier-5
4	 * dispatcher classifier (NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER, U6).
5	 *
6	 * Real-value assertions only — no stubs. Covers: happy path, the failure modes
7	 * (disabled / no-checkpoint / no-references / embed mismatch / bad graph), the
8	 * adversarial inputs (__proto__ dispatcher labels
... [+28416 chars truncated]

### Assistant | 2026-05-16T18:50:27.591Z

I have read both real files end-to-end. Let me verify the test suite runs and count the tests.

### Assistant | 2026-05-16T18:50:28.647Z

[tool_use: Bash]

### User | 2026-05-16T18:50:32.168Z

[tool_result]   ...
# Subtest: parseArgs sets help and rejects a garbage --limit gracefully
ok 57 - parseArgs sets help and rejects a garbage --limit gracefully
  ---
  duration_ms: 0.0915
  ...
# Subtest: main returns 0 for --help and 2 for an unknown argument
ok 58 - main returns 0 for --help and 2 for an unknown argument
  ---
  duration_ms: 0.5686
  ...
1..58
# tests 58
# suites 0
# pass 58
# fail 0
# cance
... [+50 chars truncated]

### Assistant | 2026-05-16T18:51:14.753Z

Confirmed: 58 tests, all pass under `node --test` (`# pass 58 / # fail 0`). Now I'll perform the full quality and coverage assessment.

## Verbatim test names (proof of read) with real line numbers

- Line 257: `partitionGhosts P0 regression — a duplicate-label ghost never becomes its target's reference`
- Line 365: `voteDispatcher P1 regression — two label-less nodes do not collide via undefined===undefined`
- Line 574: `applyGnnClassifications P1 regression — rejects an invalid / __proto__ dispatcher`

## Coverage matrix — every exported function

| Export | Covered? | Tests (lines) |
|---|---|---|
| `GNN_DEFAULTS` | Yes | asserted as expected values 122-124, 144-147, 452 |
| `GHOST_KIND` | Yes | used in `makeGhost` fixture 46 |
| `DISPATCHER_RE` | Indirect via `isValidDispatcher` | 99-115 |
| `DEFAULT_CHECKPOINT` | Yes | 125 |
| `isValidDispatcher` | Yes | 99, 105, 111 |
| `resolveGnnConfig` | Yes | 119, 128, 134, 142, 149 |
| `loadGnnCheckpoint` | Yes | 156, 162, 171, 182, 190 |
| `partitionGhosts` | Yes | 200, 208, 215, 228, 242, 257, 274 |
| `buildGhostSubgraph` | Yes | 281, 289, 295 |
| `voteDispatcher` | Yes | 303, 319, 331, 351, 358, 365, 377, 384 |
| `classifyUnknownGhosts` | Yes | 398-499 (15 tests) |
| `gnnClassifyUnknowns` | Yes | 503, 510, 518, 530 |
| `applyGnnClassifications` | Yes | 543, 561, 574, 583, 591 |
| `parseArgs` | Yes | 602, 609, 617, 621 |
| `main` | Yes | 626 |

Every exported symbol is exercised. No uncovered exports.

## Assertion quality — concrete, not tautological

Assertions check real values and algebraic invariants, and would genuinely fail against a hardcoded return:

- Line 203: `references.length === 6` with a precise rationale — distinguishes the 6 high-conf refs from the 0.4 ghost + the `kind:"engine"` node. A stub returning `[]` or all-8 fails.
- Line 327-328: `voteShare === 1` AND `confidence === 0.8` — pins the cap arithmetic exactly; a stub returning `voteShare` uncapped fails.
- Line 347: `voteDispatcher topK actually b
... [+5529 chars truncated]
