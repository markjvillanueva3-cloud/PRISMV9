# Whiskey lathe-domain engines — entry point

> **STATUS**: Session-final at iter285. All 6 P0 engines + AB-locator CLI scanner code-complete + **143+9=152 hermetic tests** (39 in lathe-quality-pipeline + 9 new in iter275/iter281 ab-locator tests) + **13 real-data-driven fixes (iter281 AB-locator PRISM_UPGRADED priority fix added)** + full JM-Die archive scan = **14,475 A/B pairs across 118 customers**. Durable cron `8505e156` (every 5min, replaces dead session-only `4d08d27a`) continues firing. **MAJOR iter261 R12 retraction: iter218 ALCOA-outlier finding is FALSE.** iter279-281 SFS G80 anomaly RESOLVED as locator bug (not pipeline behavior). iter261 pure-pass-through hypothesis EMPIRICALLY ROBUST across 6 customers / 89+ scored pairs / 0 remaining anomalies. Read `[[reference_whiskey_iter250_cron_re_establishment_2026_05_27]]` (iter250-272 work trace) AND `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]` (the retraction with iter284 6-customer matrix) before doing anything else.
> iter200-228 added: Template 4 implementation (scan-jm-die-ab-pairs.mjs with --score flag) + 3 more real-data fixes (PRISM_UPGRADED / customer-rootfile / safety-state-detector). iter250-272 (post-compact) added: durable cron + 5-customer cross-customer matrix + iter218 R12 retraction (byte-level disproof of A0137471 G40/G80 addition) + parseBlocks comment-strip root-cause fix + 3 new regression tests + iter257 `--upgraded-only` flag with 3-class `pair_type` field (prism_upgraded / human_revision / empty_source).

This directory contains the 6 P0 lathe-wizard engines built in the iter1–iter170 whiskey-slot session.

## Production engines (used in production)

| File | Purpose | Tests |
|------|---------|-------|
| `lathe-g76-thread-validator.mjs` | Validate G76/G92 threading rules 1+6+7 per controller dialect | `lathe-g76-thread-validator.test.mjs` (7/7) |
| `lathe-shop-tool-library-bridge.mjs` | Resolve (customer, T-num) → ANSI insert via 3-layer fallback | `lathe-shop-tool-library-bridge.test.mjs` (12/12) |
| `lathe-tribal-query-engine.mjs` | Query 14-vendor / 87+ grade tribal corpus via Tier 1/2 search | `lathe-tribal-query-engine.test.mjs` (12/12) |
| `lathe-wizard-vendor-lookup.mjs` | selectInsert(spec) — 7-component scoring composes bridge + query | `lathe-wizard-vendor-lookup.test.mjs` (9/9) |
| `lathe-ab-version-locator.mjs` | Parse `JM DIE/...` paths + pair A/B versions | `lathe-ab-version-locator.test.mjs` (19/19) |
| `lathe-training-loop-stage-4-reason.mjs` | Compose 5 engines → ReasonReport | `lathe-training-loop-stage-4-reason.test.mjs` (14/14) |
| `lathe-training-loop-stage-5-generate.mjs` | Apply ReasonReport recommendations → ProposedProgram | `lathe-training-loop-stage-5-generate.test.mjs` (13/13) |

Plus pipeline wiring in `scripts/lathe-quality-pipeline.mjs` (parseBlocks + validateThreading exports; 36/36 tests) and 2 cross-engine smoke tests:
- `lathe-engines-e2e-smoke.test.mjs` (7/7 — proves all 5 engines compose)
- `lathe-stage-4-5-pipeline.test.mjs` (3/3 — amateur→improved program proof)

**Total: 102 hermetic tests passing across this directory.**

## Throwaway probe scripts (committed for reproducibility)

| Script | Purpose |
|--------|---------|
| `__real-data-smoke.mjs <path>` | Run parseBlocks + validateThreading on ONE real .MIN |
| `__real-data-wizard.mjs <path>` | Run full Stage 4 + 5 wizard pipeline on ONE real .MIN |
| `__real-data-batch.mjs` | Run wizard across 12 real JM-Die programs (4 customers + 4 Okuma variants) |
| `__ab-locator-acme-probe.mjs` | Probe AB-locator on ACME `-A`/`-B` source-folder pattern |

## Entry point for next session

Read `[[reference_whiskey_session_final_iter167_2026_05_27]]` in memory before doing anything else.

Machine-readable sentinel: `mcp-server/data/ingestion_cache/whiskey-lathe-session-iter180.json` (iter181) — JSON-parseable summary with engine list, test counts, fixes, and next-session priority order.

Highest-leverage next iters:
1. Real shop tool-list ingestion (replace synthetic SHOP_INVENTORY)
2. Real master-index ingestion (operator wget Sumitomo BNX, Kennametal catalog)
3. MCP dispatcher action `prism_lathe:query_vendor_tribal`
4. CLI scan-runner for AB-locator across `JM DIE/CNC LATHE/**/*.{MIN,nc}`
5. TypeScript engine wiring

## Empirical validation results

- 12/12 real JM-Die programs round-trip byte-exact
- 12/12 surface exactly 1 P0 tooling recommendation
- 0 false-positives across 4 customers (ALCOA + ITW + ACME + AGRATI)
- 0 parse failures across 4 Okuma model variants
- 8 real-data-driven fixes + 5 regression test suites locked in
