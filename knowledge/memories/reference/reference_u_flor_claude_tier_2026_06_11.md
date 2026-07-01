---
name: reference_u_flor_claude_tier_2026_06_11
description: U-FLOR-CLAUDE-TIER — resolveExecutor now returns claudeModel (opus=reasoning only; mechanical-offload-miss->sonnet/haiku NEVER opus)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.237Z
aliases: reference_u_flor_claude_tier_2026_06_11
---


**FLEET-OLLAMA-ROUTING-MS1/U-FLOR-CLAUDE-TIER** (2026-06-11, slot:tango, commit `7d69fe556d`, [MAIN]). Operationalizes the CLAUDE.md FALLBACK LADDER doctrine ("Ollama free -> Sonnet cheap -> Opus expensive; NEVER silently promote mechanical work to Opus on an Ollama miss") in the **canonical executor contract**.

**What:** `resolveExecutor` in `.claude/hooks/lib/ollama-cost-router.mjs` now returns a `claudeModel` SUB-TIER on every result:
- judgment/reasoning/heavy-codegen (`CLAUDE_LANE_CATEGORIES`) -> `"opus"` (the ONE place opus/fable belongs — operator's "reasoning, planning and heavy coding").
- mechanical task that fell back from an unreachable Ollama -> `claudeFallbackModel(cat)` = cheap-tier->`"haiku"`, balanced+/unknown->`"sonnet"`. NEVER opus.
- prism_calc / ollama / vllm lanes -> `null` (no Claude spend).
`claudeFallbackModel()` is the cross-surface single source (reuses `CATEGORY_TIER` cheap/balanced split).

**Wired:** `ollama-task-offloader.mjs` ollama-down branch now injects `buildClaudeFallbackDirective()` — an Agent-dispatch directive naming the cheap tier (`Agent({model:"sonnet"|"haiku"})`) instead of silently keeping mechanical work on the Opus session.

**Verified (live, real installed models):** summary↓->sonnet, classification↓->haiku, deep_reasoning->opus, physics_calc->prism_calc(null); **anti-leak: mechanical-miss->opus count = 0**. +18 tests (82 green across the two suites); `no-retired-llm-refs` guard 3/0.

**Complementary (NOT duplicate) to same-day peer work** — india `U-OLLAMA-SONNET-FALLBACK` (ask-ollama path) + zulu `U-FANOUT-SONNET-FALLBACK` (`scripts/lib/ollama-fanout.mjs`, hardcodes sonnet for batch fanout). Three surfaces, one ladder. **Open DRY nicety:** zulu's hardcoded `"sonnet"` in ollama-fanout could reference `claudeFallbackModel` for a single source — deferred (peer-fresh code).

**Installed ollama models (this Blackwell box, 2026-06-11):** deepseek-r1:32b, qwen3-coder:30b, qwen2.5-coder:1.5b, qwen2.5-coder:32b, gpt-oss:120b, gpt-oss:20b, llama3.2-vision:11b, moondream:1.8b, nomic-embed-text, qwen2.5vl:7b, qwen3-vl:8b(-instruct). Retired (NOT installed): the :3b/:7b/:14b coders + deepseek-r1:14b. `routeModelForTask` intersects with live `/api/tags` so stale tier-list names are harmless.

See [[feedback_ollama_fallback_sonnet_agents]] · [[reference_ollama_cost_routing]] · [[reference_ollama_fleet_fixes_2026_06_11]]. The broader UTILIZATION gap (hooks suggest, none auto-execute, 9% rate vs 30% target) is owned by india/charlie (OLLAMA-FLEET-AUDIT-2026-06-11) — separate from this routing-discipline fix.
