---
title: Quoting baseline poisoning gate (machine-name + constant-revenue degeneracy)
type: lesson
domain: quoting
slot: charlie
created: 2026-06-01
commit: d42e969a2c
tags: [quoting, training, data-quality, fail-loud, R12, baseline, calibration]
---

# Quoting baseline poisoning gate

## The finding (R12)

The quoting training loop (`scripts/quoting-train-cycle.mjs` → `QuotingTrainingOrchestratorEngine.runOnce`) reads `state/shared/quoting/baseline-records.json` and derives a calibration factor gated by a CoV check. On 2026-06-01 a **read-only** `--no-write` dry-run reported:

```
{"ok":true,"total_predicted":100,"mape_pct":1880.99,"safe_to_activate":true,...}
```

**MAPE 1880.99% with `safe_to_activate:true`.** The CoV gate passed while accuracy was ~19× off. A *write-mode* retrain would have activated that factor.

Root cause: `baseline-records.json` was a degenerate BOOTSTRAP placeholder (`source: "jm-die-fleet-ledger"`) — **100 records, all `actual_revenue_usd:10`** (the `REVENUE_FLOOR` stub), **7 unique "customers" that are Okuma machine MODELS** (`Okuma_Multus_B250II`, `Okuma_LB-3000EX`, `Okuma_LNC8`, `Okuma_GENOS_L200E-M`). This is the iter58 "Okuma-as-customer" poisoning recurring — `quoting-baseline-from-corpus.mjs` had fixed the original by switching *source*, **not** by adding a defensive filter, so `mergeFileIntoRecord` still trusts any non-empty `file.customer`.

## The fix

`scripts/lib/quoting-baseline-guard.mjs` (pure) — the executable freshness preflight the charlie soul mandates:

- **`isMachineNameCustomer(name)`** — conservative double-gate: a builder token AND model evidence. *Model evidence* = a model-FAMILY token (`multus`, `speedio`) or an alphanumeric model code (`b250ii`, `vf2`, `4ss`) — never a bare number (`250` = suite #) or a unit/ordinal (`10mm`, `2x`, `5th`).
- **`AMBIGUOUS_BUILDERS`** (`brother`, `citizen`, `goodway`, `grob`, `spinner`, `feeler`) — real CNC builders that are also common English/company words. They require model-FAMILY evidence (not a bare code), so a real customer carrying a cert/product token (`Brother AS9100`, `Citizen i9 Systems`) is **never silently dropped**.
- **`detectDegeneracy` / `validateBaseline`** — refuse on any of: `machine_name_customers` >20%, `constant_revenue` (one value), `near_constant_revenue` ≥90%, `machine_builder_word_prevalence` >20% (independent backstop — catches `Haas 2600`-class bare-number models the per-name filter misses), `low_unique_customers` <10%.

Wired as a preflight in `quoting-train-cycle.mjs` **after** the 0-record reject (ordering matters — `validateBaseline([])` is ok by design): refuses with **exit 2** + reasons; `--force-degenerate` overrides (logged). Standalone CLI: `node scripts/quoting-baseline-validate.mjs [--json]`.

Live-proven: the train-cycle now exits 2 on the poisoned baseline instead of training it.

## Lessons

1. **A passing CoV/safety gate ≠ a usable baseline.** A degenerate distribution can satisfy variance gates while being garbage. Gate the *data*, not only the *fit*.
2. **Fix poisoning with a defensive filter, not just a cleaner source** — a source swap doesn't survive the next dirty source.
3. **Conservative customer-name filtering is asymmetric**: a false-negative (a machine row survives) is backstopped by degeneracy flags; a false-positive (a real customer dropped) is the cardinal sin. Bias hard toward never dropping a real customer — ambiguous builder words require strong (family) evidence.
4. The "more data" that improves quoting is **cost-basis** (`jm-vendor-cost-index.json`, consumed via `U-QP-COST-BASIS-WIRE`), not new calibration baseline records — JM's outbound quote-vs-actual pricing remains OCR-locked (xray's pipeline). See [[reference_charlie_quoting_data_ceiling]].

## Update 2026-06-01 — U-QP-GUARD-VOLUME-AND-SYNTH (two follow-on fixes)

Shipping the gate above surfaced two defects in the guard ITSELF when it was finally run against the real 18 MB training corpus `baseline-records-corpus-with-real.json` (47,905 records):

1. **False-refuse on a high-volume real corpus (the inverse cardinal sin).** `low_unique_customers` used a pure RATIO test (`unique/total < 10%`). The real corpus has 474 distinct customers (≈ `jm-customers.jsonl`'s 473) but a 1% ratio → REFUSED, blocking training on the good data. Collapsed attribution is FEW ABSOLUTE distinct customers (the 7-Okuma stub), not a low ratio — a real shop is hundreds of customers × many parts each. Fix: the flag now requires BOTH a low ratio AND `uniqueCustomers < minUniqueCustomers` (default 8). 474 ≥ 8 → admitted; 7 < 8 → still refused.

2. **Synthetic-target contamination admitted silently.** The corpus's own `overlay_report.match_pct = 0` — the real-invoice overlay matched **0 of 47,905** records, so every revenue value is synthetic (= modeled-cost × ~1.40 markup, CoV 8.3%, over a 4×3×3 cost-input grid, $77–$274 band). The derived calibration `factor = 0.5845 / MAPE 71.1%` measures **self-consistency, not real-world accuracy**. New ADVISORY `synthetic_revenue_dominant` (markup-CoV < 0.15 AND distinct cut-times < 10 over ≥ 20 scorable rows; **never refuses** — admits-but-labels) honors the soul refuse `training-on-stale-bootstrap-distribution`. The train-cycle surfaces it loudly on stderr + a `--json baseline_warnings` field; the 11-key drift-audit ledger row is unchanged.

A 3-of-3 review caught a third (P2) defect: negative-revenue rows (credit-memos/refunds over positive cost) left `markupMean < 0`, skipped the variance branch, and fired a nonsensical "markup mean −X.XXx" advisory — fixed by excluding non-positive markups from the synthetic population. 52 tests (32 guard + 7 preflight subprocess-oracle + 13 ledger), 3-of-3 PASS.

### Added lessons
5. **A degeneracy heuristic must scale with volume.** A ratio that flags collapse in a 100-record stub flags a HEALTHY 47,905-record corpus. Gate on the absolute quantity, or AND the absolute floor with the ratio.
6. **`revenue_source` records intent, not match success.** Every record was tagged `revenue_source:"docustrata"` while `overlay_report.match_pct = 0`. Trust the overlay/match report (or a structural fingerprint like markup-CoV), not the per-record source label.
7. **Admit-but-flag beats refuse for usable-but-imperfect data.** Synthetic self-consistency calibration is still useful; the honest move is to train AND loudly label the output, not to block until perfect real data exists (which is OCR-locked, months out per [[reference_charlie_quoting_data_ceiling]]).

## See also
- [[quoting-synergy-ms0-u-qp-training-orchestrator]] · [[quoting-synergy-ms0-u-qp-scheduled-retrain]]
- `feedback_charlie_quoting_drift_freshness` · `reference_charlie_quoting_data_ceiling` · `reference_charlie_guard_volume_synth_2026_06_01`
