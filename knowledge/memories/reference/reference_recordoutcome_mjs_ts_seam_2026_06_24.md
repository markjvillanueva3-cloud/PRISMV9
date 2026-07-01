---
name: reference_recordoutcome_mjs_ts_seam_2026_06_24
description: The blueprint_rag_extract recordOutcome wiring is NOT a one-liner -- the canonical event-writer is .mjs at repo-root scripts/lib/ but the dispatcher is .ts under mcp-server/src/ (no reachable import). Decided approach to avoid dual-source drift.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.145Z
aliases: reference_recordoutcome_mjs_ts_seam_2026_06_24
---


# recordOutcome MCP-wiring: the .mjs/.ts seam (decided approach) -- india 2026-06-24

## The seam (verified, R12)
Prior handoffs called the `blueprint_rag_extract` `recordOutcome` wiring a
"de-risked one-liner: `recordOutcome: async (ext) => recordExtractionOutcome(ext)`".
That was WRONG. Verified this fire:
- The canonical writer (`buildExtractionOutcomeEvent` / `appendAccuracyEvent` /
  `recordExtractionOutcome`) lives at **`scripts/lib/blueprint-accuracy-event-writer.mjs`**
  (repo root, `.mjs`).
- The dispatcher is **`mcp-server/src/tools/dispatchers/cadDispatcher.ts`** ->
  compiled to `mcp-server/dist/`. NO TS code under `mcp-server/src/` imports from
  repo-root `scripts/lib/`, and NO TS code currently writes
  `blueprint-accuracy-events.jsonl` (grep: only `.md` docs reference it on the TS side).
- So the dispatcher CANNOT cleanly `import` the `.mjs` writer (cross-boundary,
  fragile `../../../../../scripts` from dist).

## Why a naive TS port is WRONG (R8 + the drift anti-pattern arm C flagged)
Porting `buildExtractionOutcomeEvent` into a `.ts` module under `mcp-server/src/`
DUPLICATES the event-shape contract -> the `.mjs` (drivers) and `.ts` (dispatcher)
copies drift over time. The consumer-lib routes by exact `type`/`payload.kind`; a
drifted shape silently mis-routes or drops (the very class the writer was built to
prevent).

## Decided approach (do THIS next, do NOT one-line a TS dup)
Single-source the event shape. Best options, in order:
1. **Server-injected recordOutcome (preferred).** The MCP SERVER runs in Node from
   the repo and CAN reach `scripts/lib/*.mjs` via an absolute path / dynamic import.
   Wire the `recordOutcome` callback at the server's cad-dispatch setup layer
   (find where the server constructs dispatcher `io`/context), backed by the
   canonical `.mjs` `recordExtractionOutcome`. The engine already accepts
   `io.recordOutcome` -- this just supplies it on the MCP path. Zero duplication.
2. **Contract-test-guarded TS mirror (fallback).** If (1) is infeasible, a tiny TS
   `blueprintAccuracyEventWriter.ts` that mirrors the shape, PLUS a contract test
   that asserts a TS-built event round-trips through the SAME consumer-lib
   (`parseEventsBlob`+`applyEvents`) to `outcome_record` (never `unknown`). The
   test is the anti-drift guard.

## Also still open (separate)
- Duplicate drain scheduled tasks: mine "PRISM Resources Tribal Drain" (healthy) vs
  pre-existing failing "PRISM Tribal Resources Drain" (S4U/--no-embed). Surfaced on
  AGENT_CHAT.jsonl for owner/operator consolidation; NOT clobbered. See
  [[reference_resources_tribal_drain_armed_2026_06_24]].

## SHIPPED -- option B (commit e2fa23c46f, [CAD-LEARNING-AI]/U-BPA-RAG-RECORDOUTCOME, slot:india 2026-06-24)
Option B landed exactly as decided -- server-injected `recordOutcome`, NO TS dup.
- `cadDispatcher.ts` blueprint_rag_extract `io` block now supplies
  `recordOutcome: async (extraction) => { ... dynamic import(pathToFileURL(writerPath)) ... await recordExtractionOutcome(extraction); }`.
- Repo-root path: cloned the proven in-file `import.meta.url` idiom at ~L2447
  (`dist/tools/dispatchers` `../../..` = mcp-server; **+1 `..`** = repo root where
  `scripts/` lives). VERIFIED co-depth: `src/` and `dist/` are the SAME 3 segments
  under `mcp-server/`, so the resolve is correct in BOTH tsx-from-src (tests) and
  bundled-dist (prod). All 3 scrutiny arms independently simulated the dist
  resolution against the on-disk layout -> `H:/prism/scripts/lib/...mjs` exists:true.
- TEST: new `cadDispatcher.blueprint-rag-recordoutcome.test.ts` 6/6, round-tripped
  THROUGH the `prism_cad` handler + the REAL consumer-lib (parseEventsBlob +
  applyEvents): happy (1 outcome_record, 0 unknown) + floor-independence + append-
  only invariant + 2 guard-reject (ZERO ledger pollution) + adversarial mixed-blob.
- Why the prior "one-liner" framing was the trap: the writer is repo-root `.mjs`,
  the dispatcher is `.ts`->dist; the "one-liner" assumed a clean `import` exists.
  It doesn't -- the real work was the CWD-independent dynamic-import path resolution
  + the round-trip-through-the-real-consumer test. 3-of-3 PASS, zero findings.
- SILENT-BREAKAGE note (arm C): the engine wraps recordOutcome in an EMPTY catch
  (advisory), so a WRONG dist path would fail silently. Proven safe because src
  (tested) and dist are co-depth -- but if the dist tree layout ever changes, this
  wire goes silently dead. The append-only + outcome_record routing is the live
  signal to watch.

## Status of the broader goal
The tribal-drain `/learn` pipeline is armed + autonomous (tips ~3501, ~4183
remaining). The text->CAD + writer-lib + consolidation units shipped earlier this
series. This seam (option B) is now CLOSED. Remaining scouted next-unit: align
`blueprint-accuracy-guard.mjs` hook event shape (kind->type+payload) to the
consumer-lib contract -- latent today (hook has written 0 live rows), xray-domain,
coordinate. See [[reference_cad_learning_loop_closures_2026_06_24]].
