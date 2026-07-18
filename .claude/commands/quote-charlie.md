---
name: quote-charlie
description: Quoting-galaxy health + pickup macro for slot charlie — verify pipeline, read drift, surface next QUOTING-SYNERGY-MS0 unit
model: inherit
---

# /quote-charlie — quoting galaxy health + pickup

Slot **charlie**'s one-command entry into the quoting galaxy. Loads the galaxy context, checks pipeline health, and surfaces the next unit. Read `mcp-server/src/engines/quoting/CLAUDE.md` (galactic center) + `MEMORY.md` (brain) first if not already cascaded.

## Steps

1. **Pipeline health** — single confidence number:
   ```bash
   node H:/prism/scripts/quoting-pipeline-verify.mjs --json
   ```
   Exit 0 = all pass · 1 = any fail · 2 = discovery error. If 2, a new test prefix slipped the discovery glob (see [[architecture/quoting-pipeline-verify]]).

2. **Drift freshness** (gate before any training/baseline regen):
   ```bash
   node H:/prism/scripts/quoting-alert-banner.mjs
   cat H:/prism/state/shared/quoting/latest-drift-alert.json
   ```
   Stale distribution silently poisons the baseline — compare on the raw fractional staleness, not a rounded value.

3. **Surface next unit** — QUOTING-SYNERGY-MS0 chain. Current bottleneck:
   `U-QP-ACCOUNTING-WIRE` (AccountingHardeningEngine / ERP connector → real outbound revenue) or
   `U-QP-CURATE-WITH-REAL-PART-IDS` (re-curate docustrata invoices with iter56 corpus part_ids).

4. **Dispatcher actions** (prefer over inlining):
   - `prism_business:quote_estimate` / `instant_quote` / `actual_cost_variance` / `analytics_calibration`
   - `prism_quoting:jm_die_quote_training_pipeline` / `quoting_calibration_derive` / `fair_market_value`

## Doctrine (charlie soul)
- Never inline shop-rate/margin/material-price constants → `jm-die-profile.ts` / `HistoricalMaterialPriceEngine`.
- DocuStrata is INBOUND-only — report MAPE honestly, never dress it up.
- Conservative customer-name match; reverify test counts from the live runner.
- Defer post-quote work-order management to hotel (ERP galaxy).

## Cross-refs
- Galaxy: `mcp-server/src/engines/quoting/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- Wiki: [[architecture/quoting-galaxy]], [[architecture/quoting-pipeline-verify]], [[lessons/quoting-filter-conservative-match]]
