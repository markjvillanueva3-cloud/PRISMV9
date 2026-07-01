# U-QP-SEND-QUOTE-WIRE — build spec (charlie, scoped 2026-06-09 via workflow wf_a0dd99c5-75a)

**Why #1 toward JM Die beta:** converts the working physics-pricing backend into a thing an estimator can actually hand a customer. Beta = "operator produces a sendable quote." Everything else is invisible to the buyer. Both pieces already EXIST but are orphaned -- this is last-mile wiring + one adapter, no new engine.

> Verify every file:line below against live code before editing (R8/R12) -- these came from a subagent scope pass, not yet hand-confirmed.

## Files to touch
1. `mcp-server/web/src/utils/quotePdf.ts` (orphaned `generateQuotePdf` ~:21, zero callers). Today it imports `ErpQuoteGenerateResult`/`ErpQuoteBreakdownResult` (fields `total_cost`, `unit_cost`, `line_items`, `margin_pct`, `warnings` ~:67-76,113,202) which the builder flow never produces. **Add an adapter** `toQuotePdfModel(src: InstantQuoteResult | QuoteEstimateResult): QuotePdfModel` mapping the live result shape -> the PDF fields. Do NOT inline any shop-rate/margin number -- read `margin_pct`/rates straight from the result object (soul: no inlined shop-rate/margin constants).
2. `mcp-server/web/src/pages/QuoteBuilderPage.tsx` (`handleGenerate` ~:1316-1415). Add "Download Quote PDF" + "Send Quote (share link)" actions on the result panel. Wire existing `instant`/`quoteDoc` result -> `toQuotePdfModel()` -> `generateQuotePdf()`. For Send, reuse the existing `quoteShareToken` (`client.ts` ~:1377, 14-day link; `QuoteBuilderPage.tsx` ~:1362) -- fastest beta path, no new email endpoint.
3. `mcp-server/web/src/api/client.ts`. Add `quoteExplainRender(payload)` calling the already-wired `quote_explain_render` action (`businessDispatcher.ts` ~:1533, 2037-2040) so the PDF embeds the buyer-facing "Why this price?" block.

## Contract (the adapter = load-bearing)
`toQuotePdfModel` MUST surface a **margin-floor gate** before allowing download: effective margin < floor (floor read from result/config, NOT inlined) -> render a blocking warning instead of a clean PDF (soul: margin-floor gate on emitted quotes). Map `unit_cost`/`total_cost`/`line_items` from `InstantQuoteResult`; carry `warnings[]` through verbatim so OCR/synthetic advisories reach the operator.

## Wiring
No new dispatcher action -- `quote_explain_render` (~:1533) and `instant_quote` (~:2467) already wired. This unit is frontend wiring + one adapter; verify the HTTP round-trip returns a non-empty breakdown.

## Test plan (real-data, fail-on-revert)
1. `quotePdf.test.ts` -- feed a REAL `InstantQuoteResult` captured from `POST /quotes/instant` for a JM Die part; assert `toQuotePdfModel` produces non-empty `line_items` + finite `total_cost`. Revert the adapter -> RED (proves not a shape-blind passthrough).
2. Margin-floor gate test: sub-floor-margin result -> assert blocking warning, NOT a clean PDF. Floor sourced from result/config; assert no inlined constant.
3. Round-trip: `quoteExplainRender` against the live bridge -> assert "Why this price?" payload non-empty (negative-assert the empty-orphan state that exists today).

## Sequencing (per scope)
1. **U-QP-SEND-QUOTE-WIRE** (this) -- the only thing a buyer sees. No dependency.
2. **U-QP-CORPUS-ACTIVATE** -- refresh stale 2026-05-28 `active-calibration.json` from the live 47,905-record corpus with `--write` (proven `safe_to_activate:true`); GATE on the `synthetic_revenue_dominant` advisory + freshness preflight (soul). Numbers-quality win; do AFTER #1 so a sent quote carries fresh factors. Smaller -- finishable in one session if budget-tight.
3. **U-QP-ACCOUNTING-WIRE** (ingestion-contract form) -- build `loadOutcomes`/`quote-outcomes.jsonl` plumbing (`QuotingClosedLoopEngine.ts` ~:161 DI point). Code buildable; real value blocked on external ERP/QB or xray re-OCR (`jm-sold-orders.json` 42% $1-OCR-noise, `OutboundPriceIndexEngine.ts` ~:328 degenerate-guard). Not on beta critical path.

## Budget note
Spans 3 files across the frontend/HTTP boundary + needs a live `InstantQuoteResult` fixture + per-file scrutiny (2 reviewers x 3 files) + 3-of-3. Start FRESH context (post-/compact); do not half-build.
