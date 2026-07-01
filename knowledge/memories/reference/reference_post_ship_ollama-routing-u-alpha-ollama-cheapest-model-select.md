---
name: reference_post_ship_ollama-routing-u-alpha-ollama-cheapest-model-select
description: Auto-distilled learnings from shipping OLLAMA-ROUTING/U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT (commit c243f0141). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.960Z
aliases: reference_post_ship_ollama-routing-u-alpha-ollama-cheapest-model-select
---


# OLLAMA-ROUTING/U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT

[MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT (slot:alpha): route each matrix-proven mechanical class to the CHEAPEST proven local model, not first-in-roster-order -- completes U-ALPHA-OLLAMA-ROSTER-SYNC (measuring 9 models only pays off if the policy then PICKS the smallest sufficient one). ollamaSafeClassModels was best=best||model = first-qualifying in matrix/roster order, correct ONLY by the coincidence that the coder ladder is listed small-first; a roster reorder would silently route mechanical work to a needlessly-large model (wasting the VRAM the offload exists to save -- the resident 32b's ~55GB footprint is the 96GB box's binding constraint). New pure modelCostRank parses the param-size suffix (:1.5b/:7b/:32b/:120b; reads post-colon so the 2.5 in qwen2.5 name is never a size; unparseable->Infinity->first-seen fallback = zero regression). Selection now picks argmin cost among all-tasks-proven models, stable first-seen tie-break. Cheaper proven model = same matrix-verified 100% quality, less VRAM, more concurrency. No-op on the current coincidentally-sorted 3-model matrix (live-validated: extract->1.5b, format->32b unchanged); diverges for cross-family classes (gpt-oss:20b over deepseek-r1:32b) + any future reorder. 34/34 policy (incl big-first regression oracle + MoE + tie + 5 cost-rank unit tests) + 26/26 effort-tier consumer + live model-tier-advisor smoke; routePrompt contract unchanged.

**Shipped:** 2026-06-25T09:19:45-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[ollama-routing-u-alpha-ollama-cheapest-model-select]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._