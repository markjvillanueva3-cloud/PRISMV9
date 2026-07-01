---
name: reference_charlie_closed_loop_test_2026_06_12
description: Verified end-to-end closed-loop quoting test run on ALL present JM data (2026-06-12, slot charlie) — numbers + honest data ceiling + next ROI lever
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.507Z
aliases: reference_charlie_closed_loop_test_2026_06_12
---


# Closed-loop quoting test — verified end-to-end run (2026-06-12, slot:charlie)

Operator /goal "finish closed loop testing of quoting system utilizing ALL jm documents". Ran the **whole** closed loop live against every present JM data source and captured ground-truth numbers. The system is **functionally complete + behaves correctly**; trustworthy real-world accuracy is **data-ceiling-bound** (xray-OCR dependency), not code-bound.

## Verified results (this session, R12 — re-run from the live runners, not prose)
- **Test infra:** `node scripts/quoting-pipeline-verify.mjs --json` → **434/434 PASS, 0 fail**.
- **Train-cycle** (`scripts/quoting-train-cycle.mjs --baseline state/shared/quoting/baseline-records-corpus-with-real.json --json --no-write`): ok, **47,905 records**, **MAPE 71.1%**, safe_to_activate (dry-run). ⚠ `synthetic_revenue_dominant` — baseline is a GENERATED bootstrap (markup 1.40×, CoV 8.3%), so MAPE measures **self-consistency, not real-world accuracy**.
- **OODA cycle on REAL pairs** (`npx tsx scripts/run-quoting-closed-loop-jm-corpus.mjs`, 10 curated DocuStrata invoices): verdict **ROLLED_BACK** — PRE **MAPE 45.17%, bias −39.65%** (model UNDER-quotes JM actuals by ~40%), n=10. CoV-unsafe → calibration **correctly refused** (charlie soul: never apply unsafe calibration on a tiny noisy sample). Stages observed/measured/drift_evaluated/retrained all ✓. iter48 material parse 8/10 (80%).
- **Data-source coverage: 40% (2/5).** Consumed: `baseline` + `outbound_sold_orders`. Unconsumed (all units-gated INBOUND cost, by design): `vendor_cost_index`, `tool_purchases`, `docustrata_invoices`.
- **real_distribution_match:** predicted median $195.04 vs real $1.005 → ratio 194×, real_n=60, ks_gap 0.92, verdict `predicted-high` — **grain mismatch** (per-part-job FMV vs per-line ext_price, gotcha #15) + OCR-$1 noise, advisory only.

## The honest data ceiling
Real (predicted, actual) pairs are capped at **10 curated DocuStrata rows** — the only hand-verified quoted-vs-actual pairs. Scaling them needs the **xray OCR pipeline** (real quoted-actual extraction from the 317,139-file JM H-drive). That blocker is NOT charlie-tractable; it is xray's domain. Until then the OODA verdict on real data is information-rich but sample-starved (correctly rolls back).

## SHIPPED THIS SESSION (2026-06-12) — U-QP-COST-BASIS-NORMALIZE + WIRE2
The $10M AP ledger (`jm-vendor-ap-ledger.jsonl`, 20,736 rows) carries **structured** `qty`+`unit_cost`+`line_amount`+`category` (the units-blend of gotcha #25 lives only in the DERIVED index). Built a **density-FREE per-grade $/in3** normalizer (`scripts/lib/material-cost-basis-normalize.mjs` + CLI + `jm-material-cost-basis.json`): block form (qty=1, exact A*B*C volume) = consumable; round/bar = advisory-only (qty grain ambiguous). LIVE: **9 consumable grades — H13 $1.55, S7 $1.23, A2 $1.40, 4140 $1.62, O1 $4.41, 1045 $0.85 /in3**. The cross-form invariant caught 2 real parse bugs (.500->500 1000x; qty>1 bar-vs-block); the 2-reviewer per-file gate caught P0 grade-digit-bleed. Wired consumable via **`prism_quoting:material_cost_basis`** (VendorCostIndexEngine; consumable-gate never costs against the advisory round figure). 26/26 + 12/12 + 14/14, tsc clean. Commits `c3c798d639`(test) -> normalizer -> `3ad2986212`(wire).
**HONEST next (R12):** this makes the basis CONSUMABLE; it does NOT yet raise the train-cycle 40% coverage metric — that needs the **FMV prediction-side integration** (`material_cost = $/in3 * part_volume_in3`), which requires per-part VOLUME (a CAD/geometry input = the blueprint-vision/xray dependency). Follow-on = U-QP-COST-BASIS-CONSUME-FMV. Category breakdown for that work: tooling-consumable 7,150/$4.89M, material 5,652/$2.71M (5,613 non-credit; 210 block + 607 round parseable), misc 4,533/$1.25M.

## "Can we train from other data sources?" — evidence-complete audit (iter 4-5, 2026-06-12)
Every "train-further" lever has a cross-galaxy/geometry gate, NOT a charlie-internal one (verified against live files):
- **PAIRS (predicted,actual) — the scarce input.** Only **10 curated DocuStrata** pairs. **hotel `ActualCostEngine.listJobIds()` = 0 (probed live this iter)** — the QuotingActualOutcomeLoaderEngine pair-source is WIRED but hotel has zero real actuals populated. So lever #2 is **data-blocked on HOTEL** (ERP must record real job actuals). Raw DocuStrata `_Imported_` adds only ~11 files (not a well). Pair-scale beyond that = **xray OCR** (real quoted-vs-actual extraction).
- **TARGET (outbound prices) — abundant + already consumed.** `jm-sold-orders.json` = **500 processed orders** (NOT the legacy "12,761" raw count) w/ real line prices, wired as the outbound distribution prior. No paired predictions (quote_ref is OCR noise).
- **FEATURES (inbound cost) — newly unlocked, charlie-built.** material $/in3 basis (this session) + jm-tool-purchases; improves prediction quality without more pairs, but APPLYING it needs part VOLUME (CAD).
**Conclusion (soul: never train on synthetic-as-real):** charlie has exhausted INTERNAL training-data levers; the real-world-accuracy ceiling (synthetic baseline + 10 pairs) is broken only by (a) hotel populating actuals, (b) CAD geometry for the FMV feature-consume, or (c) xray OCR for pair-scale. Routed to owners; not charlie-buildable alone.

## iter 6 (2026-06-12) — internal cost-realism lever found, but it does NOT move accuracy
Baseline records (`quoting-baseline-from-corpus.mjs`) carry `material`(grade)+`machine_class`+`time_in_cut` but **NO part volume** (so the $/in3 basis can't apply — CAD gate confirmed). Material cost = `MATERIAL_SPEND_BY_CLASS` flat stub `{mill:60,lathe:50,wedm:80,...}` + `STUB_MARKUP=1.4` (revenue=1.4*cost = the `synthetic_revenue_dominant` source). The iter54-planned swap to `DocuStrataMaterialPriorEngine.getMaterialSpendBracket(grade)` (real per-grade per-job $) **never shipped** — a real internal lever using a real other source. **BUT two gates:** (1) the generator writes only the 25KB Stage-0 `baseline-records.json`; the 18MB Stage-2 training corpus `baseline-records-corpus-with-real.json` is a STATIC artifact (2026-05-27), decoupled — the swap needs a corpus REGEN to reach training; (2) even regenerated, revenue stays `1.4*cost` synthetic, so it improves cost-feature realism (grade-diverse vs class-flat) but **does NOT move headline MAPE / real-world accuracy** (that needs real revenue pairs = hotel/xray). DocuStrata per-grade brackets also have a known raw-stock-vs-finished issue (many <$20 = raw stock; jm-corpus runner uses FINISHED_BLANK_FLOOR_USD=20 to ignore them). **VERDICT: the binary stands — real-world quoting accuracy improves ONLY via real (predicted,actual) pairs (hotel actuals=0 today / xray OCR). No charlie-internal lever moves that metric. The DocuStrata cost-realism swap is a real but accuracy-neutral improvement, operator-choice (not auto-built — would be partial-work dressed as progress).**

## Pointers
- Closeout JSON: `state/shared/closeout/QUOTING-CLOSED-LOOP-JM-CORPUS-*.json` (per-run).
- Status surface: `state/shared/quoting/latest-training-status.json` + `prism_quoting:training_status` (includeOutcomeDigest).
- Queue: [[reference_charlie_quoting_roi_session_2026_06_11]] · galaxy `OPEN-THREADS.md`. Related: [[reference_quoting_closed_loop_jm_corpus_first_live_2026_05_26]] · [[reference_charlie_quoting_data_ceiling]].
