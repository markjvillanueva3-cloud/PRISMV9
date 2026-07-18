---
name: reference_charlie_outbound_promote_gate_2026_06_09
description: "U-QP-OUTBOUND-PROMOTE-GATE (commit d294957c4d) — grain-correct outbound-price distribution alignment as the quoting closed-loop's 2nd promote gate; the ActualCost grain-violation rejection + OCR-$1 reference-median finding"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.510Z
aliases: reference_charlie_outbound_promote_gate_2026_06_09
---


# Outbound-price promote gate (U-QP-OUTBOUND-PROMOTE-GATE, commit `d294957c4d`, 2026-06-09 slot:charlie)

Second grain-correct promote gate on the quoting OODA loop, alongside the provenance gate ([[reference_charlie_provenance_gate_2026_06_09]], commit `4c12a75a8d`).

## What shipped
- `gateOutboundAlignment(match, {driftTolerance?})` in `QuotingClosedLoopEngine.ts` -> `{verdict: "aligned"|"withheld-outbound-drift"|"unverified", block, signals}`.
- `prism_quoting:outbound_promote_check` action (schema `quotingActionSchemas.ts` + handler `quotingDispatcher.ts`): `compareToPredicted(predicted[], {against:"line", ...})` -> `gateOutboundAlignment` -> `{match, gate}`.
- 62 tests (47 engine + 15 dispatcher), tsc clean, 3-of-3 PASS 0 P0/P1.

## The load-bearing grain decision (WHY outbound distribution, NOT ActualCost)
The handoff's queued next unit was an `ActualCostEngine.profitability()` loader. **That is a grain violation.** `profitability()` is COST-grain (`estimated_cost`/`actual_cost`). The quoting OODA loop is PRICE-grain end-to-end: `predicted_quote_usd` = FMV sell price (cost x overhead x 0.20 margin), `actual_invoice_usd` = realized revenue. Feeding COST-grain ratios into PRICE-grain slots trains out JM's 20% margin -> systematic under-quotes (charlie soul refuse #4). Investigated grain FIRST (R13 logical order), rejected the queued unit, redirected to the real OUTBOUND sold-price distribution via `OutboundPriceIndexEngine.compareToPredicted`. **Lesson: verify the grain of any actuals source before wiring it into a price-trained loop.**

`against:"line"` (per-line ext_price) = the per-part-job FMV grain and MUST be passed — the engine default is `"unit"`. The dispatcher handler forces `against: p.against ?? "line"`.

## Fail-closed posture
Unreliable/empty reference -> `unverified`, `block:false`. A withheld live write is reversible; promoting a drifted factor poisons real customer quotes (irreversible). Block only on an affirmatively-bad signal (ratio > 1+tol on a RELIABLE reference).

## LIVE-DATA finding (R15 validate) — why this can't gate live yet
The real `against:"line"` ext_price reference median is OCR-$1 noise (~$1.005) while IQR stays wide, so the IQR-collapse `referenceReliable` check reads `true` falsely -> real $-magnitude quotes read `predicted-high`. The gate LOGIC is correct; the reference DATA is not clean enough. Captured as a hermetic always-run regression (OCR-noise fixture: 30x$1 + 12 real -> median collapses, IQR wide). Tests are hermetic tmpdir fixtures (mirrors `OutboundPriceIndexEngine.test.ts`), NO dependency on the gitignored `jm-sold-orders.json` (CI-safe).

## Deferred follow-up
`U-QP-OUTBOUND-OODA-DEPS-WIRE` — thread `deps.outboundCalibration` into `runCycle` 6a + emit `WITHHELD_OUTBOUND_DRIFT`. **Gated on ext_price OCR cleanup** (else it false-blocks every real quote). True production unblock is operator/ERP-side: clean the ext_price `$1` OCR noise in `jm-sold-orders.json`, or live E2/QuickBooks credentials feeding real actuals.
