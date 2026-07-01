---
name: reference_charlie_guard_volume_synth_2026_06_01
description: Quoting baseline guard v2 — admit high-volume real corpus (low_unique abs-floor) + advisory synthetic_revenue_dominant gate; the with-real corpus is 100% synthetic (overlay match_pct=0)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.509Z
aliases: reference_charlie_guard_volume_synth_2026_06_01
---


QUOTING-SYNERGY-MS0/U-QP-GUARD-VOLUME-AND-SYNTH (slot:charlie, 2026-06-01, /loop ultracode). Follow-on to [[reference_charlie_baseline_guard_2026_06_01]].

**Two findings (R12), both in my OWN freshly-shipped guard:**
1. **False-refuse on real data (inverse cardinal sin).** `low_unique_customers` used a pure RATIO test (unique/total < 10%). The real training corpus `baseline-records-corpus-with-real.json` (47,905 records, **474 real customers** ≈ jm-customers.jsonl's 473) has a 1% ratio → was REFUSED, blocking training on good data. Collapsed attribution is FEW ABSOLUTE distinct customers, not a low ratio. Fix: AND `uniqueCustomers < minUniqueCustomers` (default 8). 474≥8 admits; the 7-Okuma stub (7<8) still refuses.
2. **Synthetic-target contamination, undetected.** The "with-real" corpus's `overlay_report.match_pct=0` — it matched **0 of 47,905** real invoices; every record is synthetic (revenue = cost × ~1.40 markup, CoV 8.3%, over a 4-time × 3-rate × 3-material grid, $77–$274 band). The active calibration `factor=0.5845 / MAPE 71.1%` measures self-consistency, NOT real-world accuracy. New ADVISORY `synthetic_revenue_dominant` warning (markup-CoV<0.15 AND distinct-cut-times<10 over ≥20 scorable rows; NEVER refuses) admits-but-flags it. train-cycle surfaces it on stderr + --json `baseline_warnings`. The 11-key buildLedgerRow drift-audit row was NOT widened.

**Verify:** `node scripts/quoting-train-cycle.mjs --baseline state/shared/quoting/baseline-records-corpus-with-real.json --no-write` → ADVISORY synthetic_revenue_dominant + SAFE-DRYRUN 47905 records MAPE 71.1%. 52 tests (32 guard + 7 preflight subprocess-oracle + 13 ledger), all live-runner verified. 3-of-3 PASS; negative-markup credit-memo P2 (3-arm consensus) fixed (exclude non-positive markups). Files: `scripts/lib/quoting-baseline-guard.mjs` + `.test.mjs` + `scripts/quoting-train-cycle.mjs` + `scripts/quoting-train-cycle.guard-preflight.test.mjs`.

**Provenance anomaly (R12 — surfaced, not hidden):** the dedicated commit was LOST to shared-tree index contention. `git add` staged my 4 files into the shared `H:/prism` index; before my pathspec-commit could land (6 lock-retries all blocked), a peer's bare `git commit` swallowed my staged files under the peer's commit message. The CODE is intact in main (verified: 8 markers present at HEAD, working tree clean vs HEAD), just not under its own `[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-GUARD-VOLUME-AND-SYNTH` commit. **Lesson: on the shared tree NEVER `git add` — use `git commit -- <pathspec>` only** (pathspec-commit ignores the contaminated index, commits only the named paths). See [[feedback_commit_prefix_main_on_shared_tree]].

**Data ceiling unchanged:** real outbound pricing (the calibration TARGET) remains OCR-locked (240 verified / $47K text-recoverable of 12,761 orders; the rest needs xray's blueprint-vision pipeline). The cost-basis (`jm-vendor-cost-index.json`, 20,736 AP line-items) is the next "use the data" lever → `U-QP-COST-BASIS-WIRE`. See [[reference_charlie_quoting_data_ceiling]], [[feedback_charlie_quoting_drift_freshness]]. Wiki: [[quoting-baseline-poisoning-gate]].
