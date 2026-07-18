---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Review a PRISM india R15 build-once refactor. Read all four files: - H:/prism/sc"
date: "2026-06-17"
first_ts: "2026-06-17T13:29:34.054Z"
last_ts: "2026-06-17T13:31:44.902Z"
cwd: "H:\\prism-slot-india"
messages: 34
user_msgs: 13
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a754ce38274176956.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Review a PRISM india R15 build-once refactor. Read all four files: - H:/prism/sc

> **claude-code-cli** | 2026-06-17 | 34 msgs (13 user / 21 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a754ce38274176956.jsonl`

## Transcript

### User | 2026-06-17T13:29:34.054Z

Review a PRISM india R15 build-once refactor. Read all four files:
- H:/prism/scripts/lib/refpool-merge.mjs  (NEW shared lib: ghostContentEqual + mergeGhostsIntoGraph)
- H:/prism/scripts/lib/refpool-merge.test.mjs  (NEW: 9 tests)
- H:/prism/scripts/vault-to-gnn-refpool.mjs  (nodeContentEqual + mergeVaultGhosts converted to thin wrappers importing the lib)
- H:/prism/scripts/ghost-wire-outcomes-to-refpool.mjs  (its inline always-replace/always-write merge replaced with the shared mergeGhostsIntoGraph + skip-write-when-unchanged)

WHY: the two GNN ref-pool feeders had duplicate merge loops; the outcome feeder still REPLACED a node on every id-match (re-stamping volatile proposed_at) and ALWAYS wrote the ~542MB system-graph.json -> a durable periodic re-apply would churn the graph + the retrain drift fingerprint. This extracts ONE idempotent merge (skip-write when unchanged) both import (R15/R7/R8 build-once). The vault feeder's idempotency (commit e804997662) is preserved; the outcome feeder GAINS it.

VERIFIED already: lib 9/9, vault 28/28 (back-compat via wrappers), outcome 11/11, dry-runs vault=14 outcome=139, 0 conflicts.

CRITICAL checks:
1. CORRECTNESS of mergeGhostsIntoGraph: idempotent (UPDATE only when !contentEqual), edges ADD-only, edge OPTIONAL (a node-only ghost must not throw), returns {nodesAdded,nodesUpdated,edgesAdded,changed}. Any case where it loses a node, double-adds, or mis-computes `changed`?
2. ghostContentEqual(a,b,fields): field-list equality, null-safe. Confirm the VAULT field list ["proposed_wiring","confidence","info","reason","sourceMemory","label","kind"] exactly reproduces the OLD vault nodeContentEqual (no behavior drift -> the 28 vault tests still passing is the proof, but verify the field set matches). Confirm the OUTCOME field list ["proposed_wiring","confidence","info","reason","sourceLedger","label","kind"] is correct for buildGhostFromOutcome's node shape (note: outcome uses `sourceLedger`, NOT `sourceMemory` -- a wrong field her
... [+600 chars truncated]

### Assistant | 2026-06-17T13:29:51.217Z

I'll review this R15 build-once refactor across all four files. Let me start by reading them all in parallel.

### Assistant | 2026-06-17T13:29:51.712Z

[tool_use: Read]

### Assistant | 2026-06-17T13:29:52.166Z

[tool_use: Read]

### Assistant | 2026-06-17T13:29:52.644Z

[tool_use: Read]

### User | 2026-06-17T13:29:52.745Z

[tool_result] 1	// scripts/lib/refpool-merge.mjs
2	// Shared idempotent ADD/UPDATE merge for the GNN reference-pool feeders
3	// (vault-to-gnn-refpool + ghost-wire-outcomes-to-refpool). BUILD-ONCE (R15/R7/R8):
4	// the merge loop is the churn-prone part -- the original feeders REPLACED a node on
5	// every id-match (re-stamping the volatile `proposed_at`) and ALWAYS wrote the ~542MB
6	// system-graph.json, so a
... [+2444 chars truncated]

### Assistant | 2026-06-17T13:29:52.943Z

[tool_use: Read]

### User | 2026-06-17T13:29:53.177Z

[tool_result] 1	// scripts/lib/refpool-merge.test.mjs -- shared GNN ref-pool merge (R15 build-once)
2	import { test } from "node:test";
3	import assert from "node:assert/strict";
4	import { ghostContentEqual, mergeGhostsIntoGraph } from "./refpool-merge.mjs";
5	
6	const FIELDS = ["proposed_wiring", "confidence", "label", "kind"];
7	const eq = (a, b) => ghostContentEqual(a, b, FIELDS);
8	const ghost = (id, w, at
... [+3437 chars truncated]

### User | 2026-06-17T13:29:55.364Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * vault-to-gnn-refpool.mjs -- feed the NN/GNN reference pool from CONFIRMED
4	 * vault wiring decisions (OBSIDIAN-AI-SYNERGY, slot:kilo 2026-06-09).
5	 *
6	 * THE GAP THIS CLOSES: nn-graph-eval.mjs buildHoldout() builds its leave-out
7	 * holdout from graph nodes where kind==="ghost.unwired-engine" AND
8	 * isValidDispatcher(proposed_wiring) AND confidence>=refMinCon
... [+21135 chars truncated]

### User | 2026-06-17T13:29:55.422Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ghost-wire-outcomes-to-refpool.mjs -- feed the NN/GNN reference pool from CONFIRMED
4	 * ghost-wiring OUTCOMES (U-GHOST-OUTCOME-REFPOOL, slot:india 2026-06-11).
5	 *
6	 * THE GAP THIS CLOSES: state/shared/ghost-wire-outcomes.jsonl records 7,160 ghost-wiring
7	 * proposals (engine -> proposedWiring) each with a validation status. 545 are CONFIRMED
8	 * (validated as
... [+11769 chars truncated]

### Assistant | 2026-06-17T13:30:02.366Z

Let me verify the critical claims. First, I'll confirm the OLD vault `nodeContentEqual` field set matches the new wrapper, and check the outcome node shape against its field list. Let me look at the git history and the consumer/caller behavior.

### Assistant | 2026-06-17T13:30:02.948Z

[tool_use: Bash]

### User | 2026-06-17T13:30:07.507Z

[tool_result] 249:export function nodeContentEqual(a, b) {
250-  if (!a || !b) return false;
251-  return a.proposed_wiring === b.proposed_wiring
252-    && a.confidence === b.confidence
253-    && a.info === b.info
254-    && a.reason === b.reason
255-    && a.sourceMemory === b.sourceMemory
256-    && a.label === b.label
257-    && a.kind === b.kind;
258-}
259-
260-/**
261- * Idempotent ADD/UPDATE merge of va
... [+3792 chars truncated]

### Assistant | 2026-06-17T13:30:13.381Z

The OLD vault `nodeContentEqual` field set matches exactly: `proposed_wiring, confidence, info, reason, sourceMemory, label, kind` — identical to the new `VAULT_CONTENT_FIELDS`. The OLD merge had a NON-optional edge (line 280-281: `const key = ...; if (!existingEdgeKeys.has(key))` with no `if (edge)` guard). The new lib makes the edge optional. That's a safe widening for vault (which always emits an edge) and required for correctness of node-only ghosts.

Now let me verify the prior (pre-refactor) state of the outcome feeder, and confirm there's no behavior drift in its merge. Let me check git status/diff for the outcome feeder.

### Assistant | 2026-06-17T13:30:14.805Z

[tool_use: Bash]

### User | 2026-06-17T13:30:20.825Z

[tool_result] 94e2520d54 [MAIN-FORCE] [SYSTEM-VIZ-HARDEN]/U-VIZ-GHOST-WIRE-STRENGTH (slot:sierra): grade ghost-wire confirmations strong/weak + exclude comment-only weak labels from GNN ref-pool feed
626b907287 [MAIN] [CAD-CLOSED-LOOP-MS0]/U-GHOST-OUTCOME-REFPOOL (slot:india): close india's GNN closed loop -- feed 123 CONFIRMED ghost-wire outcomes into the GNN ref pool across 10 classes (545 confirmed of 7160).
... [+3735 chars truncated]

### Assistant | 2026-06-17T13:30:26.809Z

The diff confirms the exact claim: the OLD outcome `--apply` did `existingIds.has(node.id)` → always REPLACE (re-stamp `proposed_at`) + ALWAYS write. The new path uses the shared idempotent merge with skip-write-when-unchanged. The old merge also had a non-optional `const key = edge.from...` so the edge was always assumed present — consistent with `buildGhostFromOutcome` always emitting an edge.

Now let me verify the outcome node shape actually contains every field in `OUTCOME_CONTENT_FIELDS`, and confirm no circular import. The node has: `proposed_wiring`✓, `confidence`✓, `info`✓, `reason`✓, `sourceLedger`✓, `label`✓, `kind`✓. All present.

Let me check the no-circular-import concern and verify the vault tests + lib tests for back-compat, plus the vault diff.

### Assistant | 2026-06-17T13:30:28.833Z

[tool_use: Bash]

### User | 2026-06-17T13:30:32.517Z

[tool_result] === refpool-merge.mjs imports ===
=== graph-io.mjs imports (does it import any feeder?) ===
30:import fs from "node:fs";
=== vault feeder diff vs HEAD (merge/contentEqual region) ===
diff --git a/scripts/vault-to-gnn-refpool.mjs b/scripts/vault-to-gnn-refpool.mjs
index 549fccd780..4fe1e63d69 100644
--- a/scripts/vault-to-gnn-refpool.mjs
+++ b/scripts/vault-to-gnn-refpool.mjs
@@ -56,6 +56,7 @@ impo
... [+3448 chars truncated]

### Assistant | 2026-06-17T13:30:38.709Z

No circular import: `refpool-merge.mjs` imports nothing (zero `import` lines), `graph-io.mjs` imports only `node:fs`. The outcome feeder imports `hasHeapFlag/nodeArgsWithHeap` from the vault feeder and the merge from the lib — the lib does not import either feeder, so there's no cycle. The vault feeder's wrappers preserve the exact same names (`nodeContentEqual`, `mergeVaultGhosts`) for its 28 back-compat tests.

Now let me verify the merge logic against the OLD behavior in detail, run the test suites to confirm the verified claims, and check one subtle thing: the OLD merge used `nodeById` updated via `set` but found the index via `findIndex` — the new lib does the same. Let me also confirm there are no OTHER consumers of `mergeVaultGhosts`/`nodeContentEqual` beyond the feeder's own tests.

### Assistant | 2026-06-17T13:30:39.662Z

[tool_use: Grep]

### Assistant | 2026-06-17T13:30:41.498Z

[tool_use: Bash]

### User | 2026-06-17T13:30:41.684Z

[tool_result] No files found

### User | 2026-06-17T13:30:49.533Z

[tool_result] === lib tests ===
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 87.3311
=== vault tests ===
# tests 28
# suites 6
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 800.7751
=== outcome tests ===
# tests 11
# suites 3
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 93.9309

### Assistant | 2026-06-17T13:30:52.763Z

The Grep returned "No files found" — that's because the default Grep search path/glob didn't match. Let me re-run with explicit scope to confirm there are no external consumers I'm missing (the symbols could be referenced in test files or other scripts).

### Assistant | 2026-06-17T13:30:54.110Z

[tool_use: Grep]

### User | 2026-06-17T13:30:55.189Z

[tool_result] H:\prism\scripts\ghost-wire-outcomes-to-refpool.mjs:47:import { mergeGhostsIntoGraph, ghostContentEqual } from "./lib/refpool-merge.mjs";
H:\prism\scripts\lib\refpool-merge.test.mjs:4:import { ghostContentEqual, mergeGhostsIntoGraph } from "./refpool-merge.mjs";
H:\prism\scripts\vault-to-gnn-refpool.mjs:59:import { mergeGhostsIntoGraph, ghostContentEqual } from "./lib/refpool-merge.mjs";
H:\prism\
... [+2207 chars truncated]

### Assistant | 2026-06-17T13:31:03.081Z

All consumers are accounted for: the two feeders + the two test files. No external/un-updated consumer of `mergeVaultGhosts` or `nodeContentEqual` exists outside the vault feeder's own test file (28/28 passing proves back-compat). No cross-module consumer was broken.

Now let me trace one subtle correctness concern in the shared merge — the `findIndex` after a Map hit. In the lib, when `prior` exists but is content-different, it does `graph.nodes.findIndex((x) => x.id === node.id)`. If `idx < 0` (impossible since `prior` came from `nodeById` built off `graph.nodes`, but defensive), it would skip the update AND not increment `nodesUpdated` — but `prior` exists so the node isn't lost. Let me verify the `changed` computation edge case and confirm the vault `main()` still calls the wrapper (line 323) while the outcome calls the lib directly (line 184) — both equivalent. Let me also double-check there's no scenario where the same id appears twice in `ghosts` causing a double-count or stale `findIndex`.

### Assistant | 2026-06-17T13:31:03.625Z

[tool_use: Read]

### User | 2026-06-17T13:31:04.572Z

[tool_result] 1	// scripts/ghost-wire-outcomes-to-refpool.test.mjs
2	// Tests for U-GHOST-OUTCOME-REFPOOL: confirmed ghost-wire outcomes -> GNN reference pool.
3	
4	import { describe, it } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  extractConfirmedOutcomes,
8	  buildGhostFromOutcome,
9	  shouldReexecForHeap,
10	} from "./ghost-wire-outcomes-to-refpool.mjs";
11	
12	const row = (o
... [+6343 chars truncated]

### Assistant | 2026-06-17T13:31:13.067Z

I now have full coverage. Let me note one important observation: the outcome feeder's test file does NOT directly test the merge (it tests `extractConfirmedOutcomes`, `buildGhostFromOutcome`, `shouldReexecForHeap`). The merge correctness for the outcome path rests on the shared lib's 9 tests using a generic field list. The vault test file (28) directly tests `mergeVaultGhosts`. Both pass.

Let me trace the remaining correctness edge — duplicate ids within a single `ghosts` batch (both feeders dedup by engine before building, so the node id `ghost.<ns>.<engine>` is unique per batch — no double-add risk). And confirm the `findIndex` consistency. Let me verify the dedup guarantees by checking the vault collect path and confirm the outcome `extractConfirmedOutcomes` dedups by engine (line 92 — `byEngine` Map, first-seen wins). Both confirmed.

One last check: confirm the `--revert` and dry-run paths in both feeders are byte-unchanged by the refactor (the diff above showed only the import + merge region changed in the outcome feeder, and only the contentEqual/merge region in the vault feeder). Let me confirm the full extent of the vault diff has nothing else.

### Assistant | 2026-06-17T13:31:16.437Z

[tool_use: Bash]

### User | 2026-06-17T13:31:21.695Z

[tool_result] === full vault diff stat ===
 scripts/ghost-wire-outcomes-to-refpool.mjs | 27 +++++++++++-------
 scripts/vault-to-gnn-refpool.mjs           | 46 +++++++-----------------------
 2 files changed, 27 insertions(+), 46 deletions(-)
=== untracked? lib + lib test ===
?? scripts/lib/refpool-merge.mjs
?? scripts/lib/refpool-merge.test.mjs
=== confirm vault diff touches ONLY import+contentEqual+merge (lin
... [+163 chars truncated]

### Assistant | 2026-06-17T13:31:44.902Z

Confirmed. The vault diff touches exactly two hunks: the import (line 56/57) and the `nodeContentEqual`/`mergeVaultGhosts` region (lines 246-288). The `buildGhostFromVault`, `extractConfirmedWirings`, `collectVaultWirings`, `--revert`, dry-run, `--json`, heap-reexec, and `parseArgs` paths are all byte-unchanged. The outcome diff is the import + the `--apply` merge block only — `--revert`, dry-run, `buildGhostFromOutcome`, `extractConfirmedOutcomes` untouched. The lib + lib-test are net-new untracked files.

I have verified all five critical checks end-to-end. Here is my verdict.

---

VERDICT: PASS

summary: This is a clean, correctly-scoped build-once extraction. The shared `mergeGhostsIntoGraph` is idempotent (UPDATE only on content-inequality), edges are ADD-only and now correctly OPTIONAL (the old vault/outcome merges assumed an edge; the lib guards `if (edge)`, a safe widening since both `buildGhost*` always emit one), and `changed` is computed correctly. The vault field set is byte-for-byte identical to the old `nodeContentEqual` (verified against commit e804997662), the outcome field set correctly uses `sourceLedger` and every listed field exists on `buildGhostFromOutcome`'s node, the outcome `--apply` now skips the 542MB write when `!changed`, there is no circular import (lib imports nothing), and no un-updated consumer of the changed symbols exists outside the two feeders' own test files.

findings: none

Auditable trace of what I checked (so the PASS is not a rubber-stamp):

1. **Idempotency / no node loss / no double-add / `changed` correctness** — `H:/prism/scripts/lib/refpool-merge.mjs:31-49`. New id → push + Map.set + `nodesAdded++`. Existing id, content-different → `findIndex` replace + `nodesUpdated++`. Existing id, content-equal → node untouched (no re-stamp). The defensive `if (idx >= 0)` after a Map hit can never lose a node (the node already exists from `nodeById`). No double-add: both feeders dedup by engine before building (`extractConfirmedOut
... [+2083 chars truncated]
