---
name: reference_charlie_ledger_ref_reliability_2026_06_02
description: U-QP-LEDGER-REF-RELIABILITY — train-cycle JSONL audit ledger captures reference_reliable + reliability_verdict so the drift-audit trail detects outbound-calibration reference degradation over time; stable schema 11->13 keys, type-validated, back-compat
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.053Z
aliases: reference_charlie_ledger_ref_reliability_2026_06_02
---


QUOTING-SYNERGY-MS0/U-QP-LEDGER-REF-RELIABILITY (slot:charlie, 2026-06-02, /loop /goal /yolo iter10, commit `ae2bb88cce`). Consumer of [[reference_charlie_ref_reliability_2026_06_02]] — closes the loop on the iter9 reliability guard by PERSISTING its verdict for trend analysis.

**SHIPPED:** `buildLedgerRow` (the train-cycle's rolling JSONL audit-row builder → `state/shared/quoting/train-cycle-history.jsonl`) gains 2 keys: `reference_reliable` (bool|null) + `reliability_verdict` (string|null), read type-validated from the iter9 `real_distribution_match`. So every training cycle records whether its calibration reference was usable — the drift-audit trail now detects when the outbound reference degrades (e.g. more OCR noise ingested) over time. Schema bumped 11->13 keys, STABLE (present-as-null when no match — NOT conditionally omitted, so the JSONL stays columnar for drift tooling). New `realMatch` param added at position 3 (NOT 2) so existing `buildLedgerRow(result, tsIso)` callers are byte-unaffected.

**TESTS:** +4 ledger cases (populate / ok-true / present-as-null / malformed-rejected-to-null) = 17 ledger + 6 full-chain-smoke + 4 pipeline-e2e green (all 3 buildLedgerRow consumers). Downstream `summarizeLedger` reads named fields only (no fixed-key assertion) → additive-safe. 2-reviewer per-file PASS 0 P0/P1.

**LESSON (back-compat):** when adding a positional param to a function with existing positional callers, add it AFTER the existing ones (position 3, not 2) — inserting at position 2 would silently shift the prior 2nd-arg (`tsIso`) into the new param for every 2-arg caller. Reviewer-A flagged this as the load-bearing back-compat decision; verified by tracing every caller (pipeline-e2e + full-chain-smoke use the 2-arg form). Wiki: [[quoting-outbound-price-prior]]. Sibling: [[reference_charlie_ref_reliability_2026_06_02]].
