---
name: reference_charlie_baseline_guard_2026_06_01
description: Quoting training baseline poisoning gate — degenerate baseline-records.json (MAPE 1881%) + machine-name customer filter
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.507Z
aliases: reference_charlie_baseline_guard_2026_06_01
---


QUOTING-SYNERGY-MS0/U-QP-BASELINE-GUARD (slot:charlie, 2026-06-01, commit `d42e969a2c`).

**Finding (R12):** `state/shared/quoting/baseline-records.json` was a degenerate BOOTSTRAP placeholder — 100 records, ALL `actual_revenue_usd:10`, 7 "customers" that are Okuma machine MODELS (`Okuma_Multus_B250II`...). A read-only `quoting-train-cycle.mjs --no-write` scored **MAPE 1880.99% with safe_to_activate=true** — a write-mode retrain would have ACTIVATED that factor. The iter58 "Okuma-as-customer" poisoning recurred because `quoting-baseline-from-corpus.mjs` fixed it by switching SOURCE, not by adding a filter.

**Fix:** `scripts/lib/quoting-baseline-guard.mjs` (pure, 23 tests) — conservative `isMachineNameCustomer` double-gate (builder + model-family|alphanumeric-code; bare numbers/units excluded); `AMBIGUOUS_BUILDERS` (brother/citizen/goodway/grob/spinner/feeler) require model-FAMILY evidence so real customers w/ cert tokens like AS9100/i9 are never dropped; `detectDegeneracy`/`validateBaseline` refuse on machine-name>20% / constant-revenue / builder-word-prevalence / low-unique. Standalone CLI `scripts/quoting-baseline-validate.mjs` (4 tests, exit 0/1/2). Wired into `quoting-train-cycle.mjs` as a preflight (REFUSE exit 2; `--force-degenerate` override). LIVE-PROVEN: now exits 2 on the poisoned baseline. Reviewer A + B both PASS; 2 P1s (underscore-blind filter, ambiguous-builder FP) + 1 P2 (varied-revenue backstop) closed.

**Key lesson:** a passing CoV/safety gate ≠ a usable baseline — gate the DATA, not only the fit. Conservative customer-name filtering is asymmetric: never drop a real customer (cardinal sin); a slipped machine row is backstopped by degeneracy flags. The "more data" that improves quoting is cost-basis (`jm-vendor-cost-index.json` → U-QP-COST-BASIS-WIRE), NOT new calibration records (outbound pricing is OCR-locked, xray's job). See [[reference_charlie_quoting_data_ceiling]], [[feedback_charlie_quoting_drift_freshness]]. Wiki: [[quoting-baseline-poisoning-gate]].
