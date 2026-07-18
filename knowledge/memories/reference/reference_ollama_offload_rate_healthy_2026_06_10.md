---
name: reference_ollama_offload_rate_healthy_2026_06_10
description: Ollama offload RAW rate (10.7%) is a misleading artifact; the ADJUSTED rate (40.6% last-24h) is above the 30% target. Do NOT chase the raw number as an inefficiency.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.679Z
aliases: reference_ollama_offload_rate_healthy_2026_06_10
---


# Ollama offload rate is HEALTHY when measured correctly (2026-06-10, slot:sierra)

Investigated the offload rate as a candidate "system inefficiency" (goal clause 1: "utilize strongest possible viable Ollama models for grunt work"). **It is NOT an inefficiency — the raw metric is misleading.**

`node scripts/ollama-offload-dashboard.mjs` reports two rates:
- **RAW: 10.7%** (44 offloaded / 410 total) — looks far below the CLAUDE.md ">=30% healthy" target.
- **ADJUSTED (last 24h): 40.6%** (41/101) — **ABOVE target.**

The raw rate counts the 265 last-window events that are *correctly* kept on Claude (orchestration 248, operator_directive 12, deep_reasoning 3, git_ops 1, multi_file 1) as if they were "missed offloads." They are not — those are exactly the judgment-call / safety / multi-step categories that R5 says MUST stay on Claude. The adjusted rate excludes them and is the honest measure.

What IS actually offloading (last window): documentation 23, summary 12-14, prism_audit 3-4, prism_inventory 3 -> the mechanical text ops R5 wants on Ollama. Working as designed.

Per-hook: `ollama-task-offloader` fired=494 offload=44 keep=366; `ollama-route-pretooluse` fired=3774 keep=3750 (advisory, almost always correctly keeps). The advisory hooks fire a lot and suggest-but-keep — expected for a Claude-driven session.

**Lesson (R12):** before flagging a low metric as an inefficiency to "fix," check whether the denominator includes work that SHOULD be excluded. The adjusted rate was right there in the dashboard advisory. Almost built a fix for a non-problem. The `feedback_autonomous_loop_drift_discipline` cap (<=1 extra investigation tick) held. Related: [[feedback_ollama_token_routing]] · [[reference_ollama_pipeline_ms0_2026_05_15]].
