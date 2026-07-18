---
name: reference-aimax-07-08-shipped
description: AI-MAX-MS0/U-AIMAX07 (ContextCompression) + U-AIMAX08 (ContextCheckpoint) shipped 2026-05-13. Both engines + dispatcher actions + 113 tests live in main; do NOT re-build. Slot bravo (claude-281195e4) wired pre-existing orphan engines into prism_context.
aliases: reference_aimax_07_08_shipped
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.463Z
---


# U-AIMAX07 + U-AIMAX08 shipped — DO NOT REBUILD

**Shipped:** 2026-05-13, slot BRAVO (claude-281195e4), branch `cad-fusion-live-ms0`.

Both `ContextCompressionEngine` and `ContextCheckpointEngine` (404+424 LOC) existed in the tree from an earlier session but were **orphaned — no dispatcher wiring**. This session added the wire, schemas, and dedicated wiring tests.

## Commits

| SHA | Subject |
|---|---|
| `7d91389e5` | `[AI-MAX-MS0]/U-AIMAX07+08`: initial wiring (14 actions, 242 LOC dispatcher + schemas) |
| `36d20ea69` | `[AI-MAX-MS0]/U-AIMAX07+08-FIX`: codex round-1 (remove as-any, tighten schemas, add wiring tests) |
| `3a20f8cc4` | `[AI-MAX-MS0]/U-AIMAX07+08-FIX2`: codex round-2 (typed harness, exact assertions, engine-direct setup) |
| `ca61ff86b` | `[INFRA-CLOSEOUT-MS0]/U-MILESTONE-PROGRESS-FIX`: regen fix for flat ms.units + combined unit-ids |

## Dispatcher actions (prism_context)

**U-AIMAX07 (compression) — 6 actions:**
`compression_compress` · `compression_batch` · `compression_expand` · `compression_has` · `compression_policy` · `compression_stats`

**U-AIMAX08 (checkpoint) — 8 actions:**
`checkpoint_record_edit` · `checkpoint_should` · `checkpoint_create` · `checkpoint_latest` · `checkpoint_list` · `checkpoint_recover` · `checkpoint_ingest` · `checkpoint_config`

## Tests — 113/113 pass

- `mcp-server/src/__tests__/ContextCompressionEngine.test.ts` — 40 engine + round-trip
- `mcp-server/src/__tests__/ContextCheckpointEngine.test.ts` — 53 engine + round-trip
- `mcp-server/src/__tests__/contextDispatcher.aimax.test.ts` — 20 dedicated wiring (NEW this session)

## 3-of-3 scrutiny PASS

Session ledger entry: `claude-281195e4`. Codex passed only after 2 rounds of pushback (forced removal of `as any`, tightening of Zod schemas, addition of explicit `.finite().int().positive()` constraints on `checkpoint_config` thresholds + maxBytes + maxCheckpointsPerSession). The negotiation produced strictly stronger tests than I would have shipped on my own pass — `toMatch(/regex/)` became literal `.includes()` through type-guarded `assertFailure`; ratio bounds became engine-direct exact equality.

## Subtle finding: slimResponse strips null

`checkpoint_should` had to **bypass** `slimResponse` because it strips `null` and `undefined`. The test asserts `expect(r.data.threshold).toBe(null)` literally — without the bypass, the wire payload would omit the key and the test would see `undefined`. Documented in inline comment at `contextDispatcher.ts` `case "checkpoint_should"`. Load-bearing wiring test at `contextDispatcher.aimax.test.ts:76-90` confirms `hasOwnProperty("threshold") === true && threshold === null`.

## Close-out side-effect: regenerator fix

Closing out surfaced two bugs in `scripts/build-milestone-progress.mjs` that would have let these (and any future similarly-named units) leak back into `/pick-unit` pools:

1. **Flat `ms.units[]` not loaded** — script only walked `ms.phases[].units[]`. AI-MAX-ROADMAP.json and other flat envelopes appeared as `total: 0`. Fixed with a fallback that fires when phases yields zero units. Recovered **+1367 previously-uncounted units** across the whole milestone set.

2. **Combined unit-ids only matched the leading id** — commit subject `U-AIMAX07+08` regex-captured only `U-AIMAX07`. Fixed with a `+`-aware regex + `expandCombinedIds()` helper that handles bare/combined/commit-suffix forms (`U-AIMAX07+08-FIX2` strips `FIX2`, expands to `[U-AIMAX07, U-AIMAX08]`).

After regen: AI-MAX-MS0 shows shipped 2/12 (was 0/0). `/pick-unit` correctly filters both units out.

## Why this won't be re-built

- Envelope `mcp-server/data/milestones/AI-MAX-ROADMAP.json` U-AIMAX07/08 → `status: "complete"` with `completion_notes`
- `state/shared/MILESTONE_PROGRESS.json` → both marked `shipped: true` with sha `3a20f8cc4`
- `state/shared/BUILD_STATE.json` reflects 2/12 shipped for AI-MAX-MS0
- `state/shared/atomic-roadmap.json` units still listed as `status:undefined` but `pick-unit.mjs` filters by MILESTONE_PROGRESS, not atomic-roadmap status — so the filter still works
- Chat bus has the close-out broadcast
- Memory (this file) records it

If a future session sees `ContextCompressionEngine.ts` or `ContextCheckpointEngine.ts` and considers wiring it: **the wire is already done.** See `prism_context` dispatcher actions above. Companion to [[reference_skill_tier_wire_pattern]] (the canonical orphan-rescue recipe).

## Followup tasks (P2, not blocking)

Both 3-of-3 reviewers flagged some engine API methods that aren't wired — fine for follow-up wires:
- `ContextCompressionEngine.entityRecall()` — useful for caller-side info-loss probes
- `ContextCheckpointEngine.{serialize, deserialize, getCheckpointById, getEditState, totalCheckpoints, knownSessions, resetEdits}` — serialize/deserialize especially useful for on-disk checkpoint persistence (the AI-MAX-MS0 milestone's stated integration path with the auto-compact hook)

These are P2 "should-wire" items, not P0/P1. They were intentionally deferred per the unit's stated scope. Document any follow-up wire with a `[AI-MAX-MS0]/U-AIMAX07-FOLLOWUP` or `U-AIMAX08-FOLLOWUP` commit tag so the regen attributes them correctly.
