---
name: reference_alpha_psn_savings_detectors
description: The 6 PSN token-savings detectors and the aggregate dashboard alpha governs
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.019Z
aliases: reference_alpha_psn_savings_detectors
---


PSN cumulative savings headline (`state/shared/dashboards/psn-savings-aggregate.json`, U-PSA01/02) aggregates 6 detectors: **rtk** (RTK-wrapped bash, biggest — ~467K tokens), **dedup** (duplicate-asset block), **rewriter** (Ollama prompt compression), **multi-tool** (batched-call planner), **read-auto** (Read offset/limit + route-instead), **rtk-adopt** (rtk-prefix adoption nudges).

Snapshot 2026-05-29: 975 hits · 163 nudges · ~467K tokens saved. The savings are REAL but route-nudge take-rate is only ~0.5% — actioning the nudges is the fleet's open token-discipline gap. Disable headline: `PRISM_SAVINGS_HEADLINE_DISABLE=1`. Alpha's job: raise take-rate by actually taking the routes it nudges.
