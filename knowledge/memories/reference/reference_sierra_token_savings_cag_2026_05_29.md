---
name: reference_sierra_token_savings_cag_2026_05_29
description: Sierra owns the CAG-route + injector-consume token-savings work (TOKEN-SAVINGS-PIVOT) — cold/hot/hybrid prompt routing + 2 silent-injector fixes.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.946Z
aliases: reference_sierra_token_savings_cag_2026_05_29
---


**Sierra's [[reference_token_savings_pivot_2026_05_22|TOKEN-SAVINGS-PIVOT]] / CAG work (system-viz-adjacent, prior sessions).** Beyond the graph, sierra shipped the CAG (Cache-Augmented-Generation) route layer that classifies each prompt COLD/HOT/HYBRID and writes a route-decision sidecar (`state/shared/cag-route/`) that downstream static-doctrine injectors consume to short-circuit on cold hits (inspired by akshay_pachaar's RAG-vs-CAG pattern). Producer hook: `.claude/hooks/cag-router-inject.mjs` (U-CAG-HOOK-INJECT); consumer wiring U-CAG-INJECTORS-CONSUME wired `tribal-by-domain-inject` to honor the sidecar skip-flag.

Two silent-bug fixes (scrutiny arm-C, commit 7f6a8ded5a, 130/130 tests): **P1** `memory-relevance-inject` was calling `_markSeen()` on the CAG-skip path — burning the 24h per-(session,file) rate-limit window on a SKIP, suppressing the fallback on a later COLD-stale prompt. **P2** `tribal-by-domain-inject` session_id extractor now accepts BOTH `input.session_id` AND `input.sessionId` (silent full-rerank-on-COLD if the harness drifted to camelCase).

**Why:** these are sierra-owned token-economy substrate, not in the galaxy MEMORY.md — and the two fixes are reusable silent-bug classes (rate-limiter-blocks-fallback; field-name case-drift).

**How to apply:** when touching prompt-injection hooks, check both the rate-limit-mark placement AND session_id field-name handling. See [[reference_sierra_galaxy_buildout_2026_05_29]] · [[feedback_system_viz_first_audit]].
