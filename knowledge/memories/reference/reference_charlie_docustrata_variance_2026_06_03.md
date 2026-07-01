---
name: reference_charlie_docustrata_variance_2026_06_03
description: "U-QP-DOCUSTRATA-VARIANCE — quote-execution-variance metric consuming the Docustrata invoice doc; freshness-preflight + advisory-only, distinct from FMV under-quote."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.508Z
aliases: reference_charlie_docustrata_variance_2026_06_03
---


**U-QP-DOCUSTRATA-VARIANCE** (slot:charlie, commit `87c40bdba6`, 2026-06-03) — closed-loop quoting-training iter-14. Consumes the Docustrata invoice document via a **quote-execution-accuracy** metric, the units-safest of the 3 unconsumed quoting sources (cost-index = grain-blended units landmine, deferred; tool-purchases = amortization, deferred).

Two pure functions added to `mcp-server/src/engines/QuotingTrainingLoopEngine.ts` (9 tests, `QuotingDocustrataVariance.test.ts`):
- `docustrataIsPlaceholder(doc)` — **freshness preflight** (soul: `training-on-stale-bootstrap-distribution-without-freshness-preflight`). Regex `/bootstrap|manual-curation|placeholder/` on `source`+`note`; **null/undefined → true** (safe — never silently consumed as real).
- `assessQuoteExecutionVariance(doc, {bandPct=5, topN=10})` — `variance_pct = (actual_invoice_usd − predicted_quote_usd)/predicted_quote_usd × 100`. Classifies above/below (sign) vs within-band (magnitude, **orthogonal axes that overlap** — a +2% line is both above-quote AND within-band; the iter-14 test bug was asserting these mutually exclusive). Placeholder source → `advisory:true` + caveat "MUST NOT feed [the live calibration factor]". Defensive: `quote<=0` skip, non-finite skip.

**UNITS DISCIPLINE (load-bearing):** this is a like-over-like RATIO at the same per-invoice-line grain (`predicted_quote_usd` vs `actual_invoice_usd`) — DISTINCT from the FMV under-quote assessment (`assessUnderQuotes` over `PerRecordPrediction[]`, fair-vs-actual, NO qty term). Separation is enforced at the TYPE level (different input types). `quantity` intentionally NOT applied — both $ are already extended per-line; re-multiplying = grain (units) error (JSDoc-pinned).

**R13 split (both reviewers PASS):** engine capability ships NOW; the train-cycle wire (`assessQuoteExecutionVariance` into `quoting-train-cycle.mjs --json` + flip docustrata `consumed` in `QUOTING_DATA_SOURCES`) is DEFERRED → tracked unit `U-QP-DOCUSTRATA-TRAIN-WIRE`. Wiring placeholder data into the live cycle now would violate the soul freshness-preflight.

Part of the closed-loop quoting-training stack (iters 8–14): outbound price prior → calibration diagnostic → reference-reliability guard → ledger capture → drift-summary → training-data coverage → under-quote assessment → docustrata variance. See [[reference_charlie_underquote_assess_2026_06_02]].
