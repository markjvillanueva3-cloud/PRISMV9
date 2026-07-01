---
title: QUOTING-SYNERGY-MS0/U-QP-OUTCOME-LEDGER-DIGEST
type: architecture
domain: quoting
slot: charlie
created: 2026-06-11
commit: 88d5389e57
tests: 43 (20 engine + 23 dispatcher)
scrutiny: 2-reviewer PASS + R9 hardening
sibling: quoting-synergy-ms0-u-qp-closed-loop-outcome-telemetry
---

# Quoting closed-loop outcome-ledger digest (read-side)

## Problem
`U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY` made `QuotingClosedLoopRunnerEngine.feedOutcome` append one `CycleOutcomeSignal` per terminal verdict to `state/shared/quoting/quoting-cycle-outcomes.jsonl`. That ledger was **write-only** -- nothing read it. The loop emitted its behavior but never observed it. This unit closes the loop: write -> read -> learn.

## Design
`QuotingOutcomeLedgerDigestEngine` -- pure core + injected reader, telemetry-ONLY (never writes the ledger, never alters a gate/verdict).

- `summarizeOutcomeLedger(records): OutcomeLedgerDigest` -- pure projection:
  - `by_verdict`: `{count, rate}` for all 6 verdicts (zero-filled -- a 0-count verdict is itself a signal, e.g. "never promoted").
  - `applied_rate`, `withhold_rate`, `rollback_rate`, `no_drift_rate`, `insufficient_rate` (each = count/total).
  - `drift_detected_count`; `mean_applied_mape_delta` (mean over PROMOTED cycles with a non-null finite delta; null if none).
  - `window {first_iso, last_iso}` from the min/max parseable `fed_at`.
- HEALTH verdict (the self-improvement signal):
  - `provenance_problem` = `withhold_rate >= WITHHOLD_PROBLEM_THRESHOLD (0.5)` -- the loop is starved of real actuals (training data is synthetic).
  - `drift_uncorrectable` = `drift_detected_count > 0 && (rolled_back among drift-detected) >= ROLLBACK_PROBLEM_THRESHOLD (0.5)` -- drift the calibration model cannot fix.
  - below `MIN_CYCLES_FOR_HEALTH (5)` -> `insufficient_cycles`, no conclusion drawn.
  - `healthy = !insufficient && !provenance_problem && !drift_uncorrectable`. Thresholds are dimensionless (NOT price/physics constants).
- `readOutcomeLedger(path, readImpl?)` -- tolerant JSONL: ENOENT -> [] (0 cycles is valid, the loop may never have run); skip blank/malformed/missing-string-verdict lines; a non-ENOENT read error propagates (surfaced, not swallowed).

## Wiring
`prism_quoting:closed_loop_outcome_digest` -- enum entry + schema `{ ledgerPath?: string }` (overrides `DEFAULT_OUTCOME_LEDGER_PATH`) + dispatcher case routing to `quotingOutcomeLedgerDigestEngine.digest({ledgerPath})`. Fail-soft: a missing ledger returns a zero digest, never an error.

## Tests / evidence
43 tests: 20 engine (pure summarizer rates/counts, mean-delta filter, all 4 health paths incl. the no-divide-by-zero case, tolerant reader: parse/blank/malformed/missing-verdict/ENOENT/non-ENOENT-throws) + 23 dispatcher (incl. 3 real round-trips through the captured handler proving the enum->schema->case path -- an engine-only test cannot, per the MockMCPServer caveat). tsc clean. 2-reviewer scrutiny PASS (code-analyzer + reviewer, Sonnet); R9 hardening pinned the `drift_uncorrectable` denominator (fixture now `drift_detected_count < total` so a `total`-denominator bug fails the test) + STAGE_FAILED non-zero accumulation.

## Follow-ups (deferred P2)
- Ledger rotation -- unbounded JSONL growth; `readOutcomeLedger` loads the whole file each call. Mirror the `fleet-memory-history.jsonl` 512KB rotation, or tail-read the most-recent N.
- A consumer/surface for the health verdict (PSN autonomy / the `QuotingCalibrationHealthPage` UI) -- the digest is now queryable but no dashboard reads it yet.

## Process note
First commit (`88d5389e57`) absorbed 4 peer JM-FUSION-TOOLS files via shared-index contamination (`git commit` without pathspec commits the whole index). Fix: `git commit -m "msg" -- <pathspec>` going forward (proven on `c3aa26702b`).
