---
name: reference_psn_incremental_aggregate_2026_06_22
description: PSN savings aggregator rewired to offset-checkpoint incremental aggregation (parse only appended bytes) — the deferred follow-up to the 64MB tail-read ceiling (slot:alpha 2026-06-22)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.131Z
aliases: reference_psn_incremental_aggregate_2026_06_22
---


# PSN savings incremental aggregation (U-PSN-INCREMENTAL-AGGREGATE, slot:alpha 2026-06-22)

**Commits:** `43c5a7cbf3` (unit) + P2-hardening sibling (`[TOKEN-SAVINGS]/U-PSN-INCREMENTAL-AGGREGATE-P2`) on `cad-fusion-live-ms0`. 36/36 tests, 3-of-3 PASS.

**What shipped (the deferred fix from [[reference_psn_aggregate_tailread_fix_2026_06_21]]):** `stop-psn-savings-aggregate.mjs` no longer re-parses every telemetry ledger in full each run. It now carries a per-ledger **byte offset** (`_checkpoint`, schema bumped 1.0.0→1.1.0) in the OUTPUT json and parses ONLY the bytes appended since the last run. Per-run read cost is bounded by the delta, not file size — retiring the 64MB ceiling as a routine path (4 of the 7 ledgers grow unbounded: pre-tool-savings-multi / rtk-adoption / read-auto / nav).

**Files:**
- `scripts/lib/psn-savings-aggregate.mjs` — extracted shared `applyDedupCache`; exported `summarizeJsonl`; added `emptyStats`/`foldStats`/`sliceCompleteLines`/`incrementalAggregate` (pure, I/O injected). `aggregateSavings` kept **byte-identical** (the extraction changes nothing) so the 16 original tests + all consumers are untouched.
- `.claude/hooks/stop-psn-savings-aggregate.mjs` — `main()` uses `incrementalAggregate`; added fail-soft byte-range fs readers `statSizeOf`/`readHeadOf`/`readRangeOf` (`fd` closed in `finally`); `tailRead`+`MAX_READ_BYTES` retained as the tested boundary primitive + the re-baseline crash cap.

**Design / correctness:**
- Invariant: `foldStats(prev, summarize(deltaLines)) == summarize(fullFile)` because offsets always land on a `\n` boundary (`sliceCompleteLines` returns complete lines + `endOffset = lastNl+1`); the delta slice `[prevOffset, size)` starts at a line start.
- **Byte (not char) offsets** via `readSync(fd, buf, 0, len, position)` + Buffer-space slicing → multibyte-UTF-8 safe (a char-index offset would corrupt deltas; adversarial test covers café/中/😀).
- **Re-baseline** (full re-read, 64MB-tail-capped) only on a detected **shrink** (`size < cp.size` — `stop-ledger-prune`'s head-drop) or **front-rewrite** (head-prefix changed). Rotation guard is `!head.startsWith(cp.head)` NOT `!==`: a pure append EXTENDS the head prefix, and on a small file the head grows as bytes append — an exact `!==` false-fired "rotation" on every small-file append (the one test failure caught during the build; fixed to `startsWith`).
- Partial final line (concurrent half-write) is **deferred** to the next run (offset stays before it) — strictly safer than parsing a half-written record; self-heals once the line completes.
- Backward-compat: a pre-1.1.0 OUTPUT (no `_checkpoint`) → `prev=null` → cold-start full re-read first run.
- Dedup cache (`injection-dedup-cache.json`) is NOT in SOURCES — recomputed fresh each run via `applyDedupCache`, so it's never carried in `prevByLedger` (no cross-run double-count).

**R12 disclosed residual:** an in-place body-rewrite PAST the 128-byte head window that does NOT shrink the file would escape both guards. Unreachable for the current append-only/head-truncating producers; documented at the `rotated` line for any future body-rewriting producer (would need a tail anchor / checkpoint-region hash).

**Live validation (numbers):** incremental cold-start == full `aggregateSavings` **byte-identical** on the real 7 ledgers (totals + byLedger); `savedTokens` unchanged (565,400 at commit time); run2==run1 (no double-count); checkpoint offsets = exact file sizes. The `hits` 2026→1705 vs the prior run is data-drift (the injection-dedup-cache churns: only 73 hashes now vs a larger older snapshot), proven by the 1703↔1705 jitter between two runs ms apart — NOT an incremental bug.

**Lesson:** a fixed-length head-probe rotation guard must compare by **prefix (`startsWith`)**, not equality — on an append-only file smaller than the probe window the probed head grows with the file, so equality false-fires rotation on every append. Sibling of [[reference_psn_aggregate_tailread_fix_2026_06_21]] · [[reference_psn_rewrite_shape_fix_2026_06_21]].
