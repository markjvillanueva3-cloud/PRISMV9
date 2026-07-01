---
name: reference_sierra_viz_graphio_truncation_guard_2026_06_18
description: "Sierra shipped U-VIZ-GRAPHIO-TRUNCATION-GUARD (commit 61a83cfbad, 2026-06-18, branch cad-fusion-live-ms0) -- all 3 off-heap streaming readers in scripts/lib/graph-io.mjs now FAIL LOUD on a truncated system-graph.json instead of returning a silent partial. GAP (R12 silent-corruption): a TRUNCATED graph (crashed non-atomic write / disk-full / interrupted copy -- prior art [[reference_viz_graph_truncation_atomic_fix_2026_06_09]] which PREVENTS truncation via the atomic writer; this DETECTS it if it slips through) made countGraphArrayStreaming return a misleading PARTIAL count (masking corruption in the regen-viz node-count verification), streamGraphArray silently project a partial graph, and readGraphStreaming silently return a short nodes array to ~40 index/embedding/bridge consumers. FIX: a `closed` flag set ONLY at the array's depth-0 closing ']'; when an array runs off the buffer end without it, countGraphArrayStreaming returns 0 (couldn't-verify, same contract as read-error/missing-key) and streamGraphArray + readGraphStreaming THROW. The SUBTLE case is the BETWEEN-element cut (graph ends cleanly right after an element, no closing bracket) -- the per-element JSON.parse never sees a partial slice, so only the closed-flag catches it (a mid-element cut already threw via JSON.parse). LIVE-VALIDATED: the real 346,835-node graph still counts clean (closed -> no false truncation throw); happy path byte-unchanged. +5 tests (33 green). 2-arm scrutiny PASS 0 P0/P1; both arms independently flagged the readGraphStreaming sibling gap (R16) -> closed in-unit so all 3 readers are comprehensive. Found by reading graph-io deeply (the synthesis open-thread 'OOM-guard coverage' was STALE -- the suite already covers deep-nesting/unbalanced/structural/decoy/scalars; the REAL gap was truncation detection)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.203Z
aliases: reference_sierra_viz_graphio_truncation_guard_2026_06_18
---


# Sierra: graph-io truncation guard -- fail-loud on a torn graph (2026-06-18)

Autonomous build loop (operator: complete sierra tasks -> backend; ultracode). Pivoted from
vault-ops (now well-hardened) to system-viz primary domain; the graph-streaming OOM guard
(`scripts/lib/graph-io.mjs`) is sierra's #1 safety concern (the soul refuses
"silent-merge-failure-continue-past-a-stale-graph-R12").

## Measure-first (R8): the synthesis open-thread was STALE
The `system-viz_synthesis.md` open-thread "OOM-guard scalability -- need coverage for deep
nesting, binary blobs" was advisory + STALE: the suite ALREADY covers deep-nesting (test lines
88, 241), unbalanced braces (309), structural-chars-in-strings (121, 290, 391), decoy keys
(264, 436), scalars (280, 411), unicode (70). Reading the code deeply found the REAL gap:
silent-partial on TRUNCATION.

## The fix (commit 61a83cfbad)
`closed` flag set only at the array's depth-0 closing ']'. On an unterminated array:
- countGraphArrayStreaming -> 0 (graceful, matches its 0=couldn't-verify contract).
- streamGraphArray -> throw (the callback already fired for the valid prefix; a silent return
  would hand 5 callers a partial projection of a corrupt graph).
- readGraphStreaming -> throw (the ~40-consumer full reader; same sibling gap, closed in-unit
  per both arms' R16 finding).
Callers crash-loud or try/catch -> correct R12 (surface corruption; never project/index/verify
a torn graph).

## Design asymmetry (count returns 0, the two readers throw) -- justified
count's contract already treats 0 as "couldn't verify" (graceful, the caller re-checks). But
stream/readGraphStreaming have already produced side-effects/partial data, so the only fail-loud
signal is a throw (a sentinel return would re-create the silent-failure footgun). Both arms agreed.

## Documented residual (arm B, no change needed)
countGraphArrayStreaming returns 0 for BOTH a legit-empty AND a truncated array (the caller can't
distinguish) -- a pre-existing 0-contract collision, documented honestly in the code comment; the
post-merge verification direction IS caught loudly (decideMergePostState -> EXIT_MERGE_NO_OP).

## Sierra status: vault-ops + system-viz WELL-HARDENED
Contradiction-honesty arc + link-doctor derank family (vault-ops) + graph-io truncation guard
(system-viz) all shipped. Sierra's high-ROI queue is now largely clear -> transitioning to BACKEND
tasks per operator (free the fleet for front-end web/phone app).
