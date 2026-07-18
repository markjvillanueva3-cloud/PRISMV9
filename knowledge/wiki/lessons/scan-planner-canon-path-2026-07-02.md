---
title: Scan planner's dead ledger diff -- canonical path keys (U-CLT-SCANPLAN-CANON)
date: 2026-07-02
slot: hotel
tags: [lesson, closed-loop-training, jm-die, path-canonicalization, R9, silent-bug]
commits: [d6cdc2f470, 86ca111890]
---

# The scan planner's ledger diff was structurally DEAD -- raw path-string compare across formats

## Symptom
`jm_die_scan_plan_batches` reported `to_scan == walked_files` (317,130) despite the
scan ledger holding 301,948 rows. Every "scan the remainder" run would have re-scanned
the ENTIRE JM DIE corpus and doubled the ledger in a second path format.

## Root cause
`JMDieScanCoordinatorEngine.plan()` compared raw strings: ledger rows read
`H:/prism/JM DIE/...` (forward slashes, lowercase root -- written by earlier callers)
while `JMDieFleetWideIngestEngine` emits native `H:\PRISM\JM DIE\...` backslash
absolutes with the caller's root casing. `Set.has()` intersected to ZERO.

## Why the tests were green (R9)
The existing dedup test seeded the ledger via `path.join(...)` -- the walker's OWN
format. It could never exercise cross-format membership. A dedup test must seed the
persisted store in the format the PRODUCER actually wrote, not the format the test's
own platform emits.

## Fix
Shared exported `canonScanPath` (backslash->forward-slash + `toLowerCase`; NTFS-scope)
in `JMDieScanLedgerEngine`; the planner folds BOTH sides of every membership test;
`stats().unique_paths` is canon-unique. Stored rows keep original casing (display
fidelity) -- canon is a COMPARISON key only. 7 reference tests incl. an adversarial
uppercase/forward-slash ledger vs a native walk, toothed on Windows AND POSIX.

## Ground truth the fix revealed (arm-C verified, not assumed)
- to_scan: 317,130 -> **163,632** (33x5000 batches)
- already_scanned: 301,948 raw -> 301,218 canon-unique (~730 cross-format dup rows)
- **~148K ledger rows are DEAD** -- 49.1% of a 603-row stratified sample reference
  files deleted since scanning (OCR page-split `__pN.pdf` derivatives + `part.json`
  sidecars under `_PART LIBRARY`). They are NOT out-of-root paths.
- True live JM DIE coverage: **153,498 / 317,130 (48.4%)** -- ledger size must never
  be read as corpus coverage.

## Standing rules
1. Any membership test against a persisted path store folds BOTH sides through
   `canonScanPath` (the engine JSDoc now warns on `loadScanned`).
2. `sha_short` is hashed over the RAW path -- never a cross-format dedup key.
3. `canonScanPath` is NTFS-scope; do not reuse on case-sensitive filesystems.
4. Append-only path ledgers accumulate tombstones; coverage claims need a live
   walk-intersect, not a row count.
