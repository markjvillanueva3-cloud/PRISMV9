---
name: reference_post_ship_jm-die-financial-baseline-ms0-u-jm01-03-bundle
description: Auto-distilled learnings from shipping JM-DIE-FINANCIAL-BASELINE-MS0/U-JM01-03-BUNDLE (commit d7bff5812). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.911Z
aliases: reference_post_ship_jm-die-financial-baseline-ms0-u-jm01-03-bundle
---


# JM-DIE-FINANCIAL-BASELINE-MS0/U-JM01-03-BUNDLE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-DIE-FINANCIAL-BASELINE-MS0]/U-JM01-03-BUNDLE (slot:charlie /goal-14 iter1): train quoting on JM docustrata + factor date + market prices. (1) U-JM01 JMDieDocustrataIngestEngine + 13 tests — walks H:/PRISM/JM DIE/_PART LIBRARY/<customer>/<part>/<docs> (301K files in real archive); parses MM_DD_YYYY HH_MM AM/PM filename pattern + bare MM_DD_YYYY + MM-DD-YYYY; mtime fallback; R12 explicit reason on each parse miss. (2) U-JM02 HistoricalMaterialPriceEngine + 13 tests — date to commodity-price lookup; CSV-seeded LME monthly averages 2020-2026 for 4 spanning materials (steel A36, aluminum 6061, copper C110, stainless 304); nearest-prior fallback within 12mo with R12 fail-loud on missing data; loadFromInline for hermetic tests. (3) U-JM03 JMDieFinancialBaselineEngine + 11 tests — aggregates records into per-customer (sorted by revenue) + per-material (sorted by spend) + per-year + time-span baselines; default heuristics for missing revenue (bytes-based) + missing material-spend (30%); R12 fail-loud on empty + non-array. (4) Envelope JM-DIE-FINANCIAL-BASELINE-MS0.json (6 units across P0/P1/P2). (5) Wired 3 new prism_quoting actions (jm_die_docustrata_ingest / jm_die_historical_material_price / jm_die_financial_baseline). 37/37 vitest PASS. tsc clean.

**Shipped:** 2026-05-24T20:29:40-05:00 by markjvillanueva3-cloud
**Files:** 11 touched

Full distillation: [[jm-die-financial-baseline-ms0-u-jm01-03-bundle]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._