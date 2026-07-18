---
title: Quoting Pipeline Verify — single-command health check
type: architecture
domain: quoting
slot: charlie
created: 2026-05-28
tags: [quoting, charlie, testing, tap, discovery-glob, ci]
---

# Quoting Pipeline Verify

`scripts/quoting-pipeline-verify.mjs` is slot **charlie**'s single-command health check for the entire quoting test surface. Shipped QUOTING-SYNERGY-MS0 iter23 (`f464588376`).

## How it works
1. Glob-discovers quoting test files.
2. Runs `node --test` sequentially over them.
3. Parses each TAP summary via pure exported `parseTapSummary`.
4. Aggregates fleet totals via pure `aggregateSummaries`.

Exit codes: **0** = all pass · **1** = any fail · **2** = discovery error. Run `node scripts/quoting-pipeline-verify.mjs --json` for one confidence number.

## The discovery-glob lesson (R12)
The original discovery regex `/^quoting-.+\.test\.mjs$/` **silently excluded** `install-quoting-pipeline-cron.test.mjs` (prefix mismatch) — 18 tests ran 0×, operator saw "263/263 PASS" and assumed full coverage (iter32 `211ab8e1f3`).

**Fix + rule:** use explicit alternation `/^(quoting-|install-quoting-).+\.test\.mjs$/`; whenever charlie ships a new `<prefix>-quoting-*.test.mjs`, extend the discovery glob. Assume silent exclusion until proven otherwise. This is also the canonical way to reverify a running test-count (never trust a prose total — iter28-32 claimed 281, actual 263).

## Cross-refs
- [[architecture/quoting-galaxy]]
- Memories: `reference_charlie_quoting_pipeline_verify`, `reference_charlie_quoting_test_discovery_glob`, `reference_charlie_quoting_test_count_drift`
