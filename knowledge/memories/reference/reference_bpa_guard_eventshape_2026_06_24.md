---
name: reference_bpa_guard_eventshape_2026_06_24
description: U-BPA-GUARD-EVENTSHAPE (slot:india 2026-06-24) -- aligned the blueprint-accuracy-guard hook's written event shape (kind -> type+payload) to the consumer-lib contract; the LAST divergent ledger writer. + R12 correction that this hook is ADVISORY (PostToolUse), not a Stop hard-block.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.481Z
aliases: reference_bpa_guard_eventshape_2026_06_24
---


# blueprint-accuracy-guard event-shape alignment -- india 2026-06-24

## What shipped (commits cc27bd974d + ee2d1a739a, [CAD-LEARNING-AI], slot:india)
The SECOND scouted next-unit from [[reference_cad_learning_loop_closures_2026_06_24]]
(the first was the recordOutcome wiring, option B = [[reference_recordoutcome_mjs_ts_seam_2026_06_24]]).

`.claude/hooks/blueprint-accuracy-guard.mjs` `appendEvent` wrote rows keyed
`{ts, kind:"drift_observation"|"replay_add"|"outcome_record"|"predlog_pair"|"ewc_consolidate", ...}`.
But the SOLE offline consumer `scripts/lib/blueprint-accuracy-consumer-lib.mjs`
(`applyEvents`, via `parseEventsBlob`) routes by TOP-LEVEL `type` and SKIPS any row
whose `type` is not a string (it doesn't even bin to `unknown` -- it `continue`s).
So every hook-written row was SILENTLY DROPPED. LATENT today (the hook had written
0 live rows -- the live ledger is all `type`-shaped from the python/training-driver
writers), so the fix has zero live effect now; it closes the gap (R7 align-the-
divergent-writer, R16 close-early) before the hook ever becomes a live writer.

Fix (event SHAPE only): `appendEvent` now emits canonical `{type: type ?? kind, ts,
payload:{...rest}}` -- maps `kind` -> top-level `type`, nests rich fields
(sessionId/tool/dispatch/...) under `payload`, idempotent if a `type` is already
present. PLUS the consumer-lib gained `predlog_pair` in KNOWN_EVENT_TYPES +
EVENT_TO_XPROC_ACTION (-> `xproc_predlog_pair`) -- the one hook event type it didn't
know, so it routes instead of dropping.

## Why it was SAFE (verified by 3-of-3 + my own reads)
- The in-memory `events[]` array (consumed by the advisory rendering ~L597-600 which
  reads `e.kind`) is NOT mutated -- `appendEvent` transforms only what it WRITES to
  disk. So the advisory text is byte-identical.
- The hard-block / `decision` is computed UPSTREAM from drift state, never from the
  written row. `appendEvent` only logs.
- **R12 CORRECTION:** this hook is a **PostToolUse ADVISORY** hook (every path
  `continue:true`; wired at `C:/Users/wompu/.claude/settings.json` ~L1867), NOT a Stop
  hard-block. The actual blueprint enforcement lives in the SIBLING
  `blueprint-coverage-floor-guard.mjs` (separate ledger, its own appendJsonl, does NOT
  read the accuracy-events file). The xray awareness-inject's "blueprint-accuracy-guard
  HARD-BLOCKS >20% drift" is imprecise -- the >20% conformal-bound block is the
  coverage-floor-guard's job. My commit cc27bd974d's message said "hard-block" loosely;
  the shape-change-cannot-affect-blocking conclusion holds either way.
- ALL readers traced (arm C): consumer-lib + `extraction-aggregator-lib` + `blueprint-ocr-review`
  read only `ev.type` + `ev.payload.*`; NONE read top-level `.kind`/`.dispatch`. Zero
  silent-breakage. `appendEvent`'s only real caller is the hook's own `processPayload`
  (+ the new test); other same-named `appendEvent`s are unrelated ledgers.

## TEST (new .claude/hooks/blueprint-accuracy-guard.event-shape.test.mjs, 6/6 node:test)
All 5 hook kinds round-trip THROUGH the REAL consumer-lib -> each routes to
`type===kind`, 0 unknown, processedCount 5; payload preserves dispatch/sessionId/tool;
predlog_pair -> xproc_predlog_pair; REGRESSION ORACLE proves the OLD kind-only shape is
dropped (processedCount 0); end-to-end `processPayload(ground_truth_match)` -> real
`appendEvent` -> consumer routes replay_add; idempotency (type wins over kind). No
regression: consumer-lib 40/40, writer-lib 13/13.

## Lesson (generalizable)
A divergent WRITER whose row shape doesn't match the canonical READER's routing key is a
SILENT-DROP gap even when it "works" (the writer succeeds, the reader skips). Align the
writer to the reader's contract (R7), register any writer-specific event type in the
reader, and prove it with a round-trip-through-the-REAL-reader test + a regression oracle
that the old shape dropped. Sibling of the recordOutcome canonical-writer work; both
close the "scattered write side silently rots the closed loop" class.
[[canonical-ledger-writer-pattern]]
