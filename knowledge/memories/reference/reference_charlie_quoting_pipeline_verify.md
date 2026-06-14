---
name: reference_charlie_quoting_pipeline_verify
description: Quoting gotcha
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.056Z
aliases: reference_charlie_quoting_pipeline_verify
---


QUOTING-SYNERGY-MS0 iter23 (commit `f464588376`). `scripts/quoting-pipeline-verify.mjs` is the single-command health check: glob-discovers quoting tests → runs `node --test` sequentially → parses TAP summaries → aggregates fleet totals via pure `parseTapSummary` + `aggregateSummaries` exports.

Exit codes: 0=all pass, 1=any fail, 2=discovery error. Run `node scripts/quoting-pipeline-verify.mjs --json` for a single confidence number before claiming the pipeline is green. This is THE quoting test surface — extend its discovery glob when shipping new test prefixes (see [[reference_charlie_quoting_test_discovery_glob]]). It's also how you reverify any running test-count claim (see [[reference_charlie_quoting_test_count_drift]]).
