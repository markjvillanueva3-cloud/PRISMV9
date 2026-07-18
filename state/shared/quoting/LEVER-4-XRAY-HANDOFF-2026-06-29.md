# Lever 4 — cross-galaxy handoff: xray (pred,actual) pairs → quoting live-MAPE band

**From:** slot:charlie (quoting) · **To:** slot:xray (OCR/blueprint-corpus) · **Date:** 2026-06-29
**Status:** consumer side COMPLETE + provenance-gated; BLOCKED on producer (real PO outcome data).

## The accuracy lever is DATA, not engines (operator's standing directive)
World-class quoting = single-digit MAPE + a calibrated CI band that auto-tightens as real
(predicted, actual) pairs accumulate. The band machinery (Levers 1-3) is built and live.
Lever 4 is the **data feed** that makes the band honest — and it can only come from real
outcomes, never fabricated (charlie soul refuses `training-on-stale-bootstrap-distribution-
without-freshness-preflight`).

## Consumer side — DONE (charlie, this + prior sessions). Nothing left to wire.
`InstantQuoteEngine.estimate()` (Lever 2, `InstantQuoteEngine.ts:641-653`) self-populates
`observed_mape_pct` from the live snapshot via
`QuotingActiveFactorLoaderEngine.getLiveObservedMapePct()` when the caller didn't supply one.
That MAPE then floors the CI95 band (Lever 3, `computeCI95` → `sigmaPerPart` floored at
`max(theory, observed)` — only ever WIDENS, never narrows). Fail-safe: a missing/refused live
MAPE leaves the band theory-only; a lookup error never breaks a quote.

The lookup is **provenance-gated** (`gateObservedMape`, `QuotingActiveFactorLoaderEngine.ts`)
— it ADMITS a MAPE only when the snapshot is provably:
- `mape_pct`: finite, positive number
- `baseline_fallback`: **null** (NOT a bootstrap/degraded cycle; an object = REFUSED)
- `data_source_coverage`: `{ coverage_pct }` 0-100, sufficiently covered
- `ts_iso`: fresh + parseable (cannot confirm freshness → REFUSE rather than trust)

## Producer side — xray owns this (the blocker)
**Contract file xray must produce:** `state/shared/quoting/latest-training-status.json`
Written by the quoting train-cycle (`scripts/quoting-train-cycle.mjs` →
`buildTrainingStatusSnapshot`) — but the cycle needs REAL (pred, actual) pairs to compute a
non-bootstrap MAPE. Today the only available outcome data is synth/bootstrap, so the gate
correctly REFUSES (band stays theory-only — honest, not silently wrong).

**What unblocks it:** xray's OCR scale-up over the **12,761 PO corpus** → extract per-job
`{ predicted_price, actual_price }` pairs → feed the train-cycle so `buildTrainingStatusSnapshot`
emits a `baseline_fallback: null` snapshot with real `coverage_pct`. The moment that lands,
the consumer above picks it up automatically (60s cache) — **zero further charlie work needed.**

### Pair shape the train-cycle consumes
```
{ job_id, predicted_price_usd, actual_price_usd, quoted_at_iso, closed_at_iso,
  material, machine_type, quantity }   // actual from the won/closed PO; predicted from the quote of record
```
Source of actuals: the PO/invoice corpus (won-and-closed jobs with a real billed amount).
Source of predictions: the quote-of-record for that job (or re-quote the historical spec
through `prism_quoting:instant_quote` for a counterfactual pair — flag which method per pair).

## Verification when the data lands (charlie will run)
1. `node scripts/quoting-train-cycle.mjs --json` → confirm `baseline_fallback: null` + real `coverage_pct`.
2. `QuotingActiveFactorLoaderEngine.getLiveObservedMapePct()` returns a non-null `mape_pct`.
3. A live `instant_quote` shows the CI band WIDENED to the observed floor (vs theory-only before).
4. Track MAPE trend toward single digits as coverage grows (the auto-tightening loop).

## TL;DR
Consumer: **done + gated + fail-safe.** Producer: **xray's 12,761-PO OCR → real pairs.**
No charlie code change required to activate — only the data. Do NOT hand-curate or
bootstrap-fill the snapshot (the gate + soul refuse it, and a fabricated MAPE would lie to the band).
