---
name: reference_charlie_outcome_digest_2026_06_11
description: U-QP-OUTCOME-LEDGER-DIGEST -- read-side consumer of the feedOutcome ledger; closes the quoting closed-loop write->read->learn.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.511Z
aliases: reference_charlie_outcome_digest_2026_06_11
---


**QUOTING-SYNERGY-MS0/U-QP-OUTCOME-LEDGER-DIGEST** (slot:charlie, 2026-06-11, commit `88d5389e57` + R9-harden `c3aa26702b`). The READ-SIDE consumer of the `feedOutcome` ledger shipped in [[reference_charlie_outcome_telemetry_2026_06_11]] -- that ledger was write-only; this closes the loop write->read->learn.

**What shipped.** `QuotingOutcomeLedgerDigestEngine` (`mcp-server/src/engines/`) reads `state/shared/quoting/quoting-cycle-outcomes.jsonl` and projects it into the loop's BEHAVIOR DISTRIBUTION + an advisory HEALTH verdict -- the self-improvement signal:
- `summarizeOutcomeLedger(records)` (pure): per-verdict `{count,rate}` (all 6 zero-filled), `applied_rate`/`withhold_rate`/`rollback_rate`/`no_drift_rate`/`insufficient_rate`, `drift_detected_count`, `mean_applied_mape_delta` (mean over PROMOTED with non-null finite delta, else null), `window {first_iso,last_iso}` from fed_at.
- HEALTH: `provenance_problem` when `withhold_rate >= 0.5` (loop starved of real actuals); `drift_uncorrectable` when rollback-AMONG-drift `>= 0.5` AND `drift_detected_count>0` (calibration can't fix the drift); below `MIN_CYCLES_FOR_HEALTH=5` => `insufficient_cycles`, no conclusion. `healthy = !insufficient && !provenance_problem && !drift_uncorrectable`. All thresholds dimensionless (NOT price constants).
- `readOutcomeLedger(path, readImpl?)`: tolerant JSONL -- ENOENT->[] (0 cycles is valid), skip blank/malformed/missing-string-verdict, non-ENOENT propagates. Pure core + injected reader.
- Telemetry-ONLY: never writes the ledger, never alters a gate/verdict.

**Wired** `prism_quoting:closed_loop_outcome_digest` (enum + schema `{ledgerPath?}` + dispatcher case). 43 tests: 20 engine (pure/reader/health) + 23 dispatcher incl. 3 real enum->schema->case round-trips (proves the SDK z.enum gate accepts it -- the MockMCPServer caveat means an engine-only test can't prove wiring). tsc clean. 2-reviewer scrutiny PASS (code-analyzer + reviewer, both Sonnet); R9-hardened the `drift_uncorrectable` fixture (was all-drift so a total-vs-drift denominator bug wouldn't fail; now drift<total) + added STAGE_FAILED non-zero accumulation.

**SHARED-TREE LESSONS (3rd hazard this session, R12).** My first commit (`git add <5> && git commit -m`) absorbed 4 peer JM-FUSION-TOOLS files because `git commit` without a pathspec commits the WHOLE shared index (a peer had staged into it). FIX going forward: `git commit -m "msg" -- <pathspec>` (the `--` AFTER `-m`) limits the commit to your files even when peers have staged others -- proven clean on `c3aa26702b`. Cf [[reference_shared_tree_commit_contamination_2026_06_08]]. Queue: NEXT = T13 (cross-galaxy orphans + TSC drift) then T7 (absorb 5 dormant features).
