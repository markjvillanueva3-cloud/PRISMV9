---
name: reference-u-wire-batch-processor-misattribution-2026-05-21
description: "2026-05-21 kilo /loop iter 1 — U-WIRE-BATCH-PROCESSOR (3 prism_infra actions for the BatchProcessor singleton) absorbed into juliett's commit 2f228f6f1d during the shared H:/prism main-tree git-add window; banner wrong, work shipped clean"
aliases: reference_u_wire_batch_processor_misattribution_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.246Z
---


# U-WIRE-BATCH-PROCESSOR — shared-tree misattribution (2026-05-21, kilo iter 1)

**Slot:** kilo · **Loop iter:** 1/20 · **Unit:** `WIRE-UNWIRED-MS0::U-WIRE-BATCH-PROCESSOR`

## What shipped
3 read-only observability actions wiring the `batchProcessor` singleton into `prism_infra`:
- `batch_queue_size` → `batchProcessor.getQueueSize()`
- `batch_stats` → `batchProcessor.getStats()`
- `batch_persist_stats` → `batchProcessor.persistStats()`

Files (all in HEAD via commit `2f228f6f1d`):
- `mcp-server/src/__tests__/BatchProcessor.test.ts` (NEW, +289, 16/16 green)
- `mcp-server/src/schemas/infraActionSchemas.ts` (+3 z.object({}) schemas; refreshed JSDoc header)
- `mcp-server/src/tools/dispatchers/infraDispatcher.ts` (+3 enum entries + 3 lazy-import case branches; refreshed tool-description string + JSDoc header)

## The misattribution
My commit was racing juliett's `2f228f6f1d` (`[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-SF-AUTOPILOT-ALIAS-RECONCILE + U-MACHINE-AWARE-CAPTURE-FLAG`). When my first `git commit` failed (`Unable to create H:/prism/.git/index.lock — File exists`), I waited and polled the lock. By the time the lock cleared, juliett's commit had **already absorbed my 3 staged files** into its 8-file changeset. My re-stage / re-commit attempt found `git diff --cached --stat` and `git diff --stat` both EMPTY — every file I'd touched was already in HEAD with juliett's banner.

This is the same class as:
- [[reference_h8_misattribution_2026_05_20]] (echo's H8 → hotel's `30b7d45f1d`)
- [[reference_iter2_html_adopt_misattribution_2026_05_18]] (lima, HTML-adopt iter 2)

## R12 fail-loud
Work shipped correct + complete + scrutinized. Only the commit subject is wrong. Banner search for kilo's `[WIRE-UNWIRED-MS0]/U-WIRE-BATCH-PROCESSOR` will return zero; reach by file path or commit SHA `2f228f6f1d`.

## Per-file scrutiny gate (passed before absorption)
Both reviewers PASS:
- **wiring-review-agent** (Agent A) — enum/schema/case 3-way agreement, lazy imports, no name collisions; 2 P1 doc-staleness findings fixed before commit.
- **reviewer** (Agent B, independent) — R9 test integrity confirmed after persistStats hardening (file-exists + JSON round-trip + value-equality); R12 fail-loud verified; 5ms → 50ms expiry-sleep fix accepted.

## Engine quirk surfaced (NOT FIXED — future hardening)
`BatchProcessor.getStats()` returns a **shallow** copy. The nested `queue_by_priority` field aliases the live mutable object. Snapshot-and-diff callers will silently see equal `before`/`after` values. Test #4 deep-clones the snapshot via `JSON.parse(JSON.stringify(...))` and documents the quirk inline. Worth a follow-up unit to make the engine return a deep clone (or expose an explicit deep-copy method).

## Karpathy R10 — what was verified
- `git log --oneline -- mcp-server/src/__tests__/BatchProcessor.test.ts` → `2f228f6f1d` (single commit, my work)
- `git show --stat 2f228f6f1d` → all 3 files present with correct insertion/deletion counts (289 / 26-/+ / 37-/+ ≈ +338)
- 16/16 tests passing pre-commit; suite is order-independent (vitest `--shuffle` safe) via `resetBatchProcessorSingleton()` helper

## Unwired delta
UNWIRED engines: 635 → 634 (per `audit-unwired-engines.mjs` baseline 2026-05-07 snapshot).

## How to avoid (next time, in this slot)
1. Use slot-worktree (`H:/prism-slot-kilo` on `slot/kilo`) — the SLOT-WORKTREE-MS0 hooks would route the commit there, no race.
2. If forced to commit in shared `H:/prism`, use pathspec `git commit -- <files>` (NOT `git add` then commit) to bypass the index-file race window.
3. Accept misattribution as part of the shared-tree cost; document in memory; carry on.
