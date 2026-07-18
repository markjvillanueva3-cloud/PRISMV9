# OLLAMA-ROUTING/U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT — [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT (slot:alpha): route each matrix-proven mechanical class to the CHEAPEST proven local model, not first-in-roster-order -- completes U-ALPHA-OLLAMA-ROSTER-SYNC (measuring 9 models only pays off if the policy then PICKS the smallest sufficient one). ollamaSafeClassModels was best=best||model = first-qualifying in matrix/roster order, correct ONLY by the coincidence that the coder ladder is listed small-first; a roster reorder would silently route mechanical work to a needlessly-large model (wasting the VRAM the offload exists to save -- the resident 32b's ~55GB footprint is the 96GB box's binding constraint). New pure modelCostRank parses the param-size suffix (:1.5b/:7b/:32b/:120b; reads post-colon so the 2.5 in qwen2.5 name is never a size; unparseable->Infinity->first-seen fallback = zero regression). Selection now picks argmin cost among all-tasks-proven models, stable first-seen tie-break. Cheaper proven model = same matrix-verified 100% quality, less VRAM, more concurrency. No-op on the current coincidentally-sorted 3-model matrix (live-validated: extract->1.5b, format->32b unchanged); diverges for cross-family classes (gpt-oss:20b over deepseek-r1:32b) + any future reorder. 34/34 policy (incl big-first regression oracle + MoE + tie + 5 cost-rank unit tests) + 26/26 effort-tier consumer + live model-tier-advisor smoke; routePrompt contract unchanged.

**Commit:** `c243f01414a7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T09:19:45-05:00
**Tags:** ollama-routing, u-alpha-ollama-cheapest-model-select, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT (slot:alpha): route each matrix-proven mechanical class to the CHEAPEST proven local model, not first-in-roster-order -- completes U-ALPHA-OLLAMA-ROSTER-SYNC (measuring 9 models only pays off if the policy then PICKS the smallest sufficient one). ollamaSafeClassModels was best=best||model = first-qualifying in matrix/roster order, correct ONLY by the coincidence that the coder ladder is listed small-first; a roster reorder would silently route mechanical work to a needlessly-large model (wasting the VRAM the offload exists to save -- the resident 32b's ~55GB footprint is the 96GB box's binding constraint). New pure modelCostRank parses the param-size suffix (:1.5b/:7b/:32b/:120b; reads post-colon so the 2.5 in qwen2.5 name is never a size; unparseable->Infinity->first-seen fallback = zero regression). Selection now picks argmin cost among all-tasks-proven models, stable first-seen tie-break. Cheaper proven model = same matrix-verified 100% quality, less VRAM, more concurrency. No-op on the current coincidentally-sorted 3-model matrix (live-validated: extract->1.5b, format->32b unchanged); diverges for cross-family classes (gpt-oss:20b over deepseek-r1:32b) + any future reorder. 34/34 policy (incl big-first regression oracle + MoE + tie + 5 cost-rank unit tests) + 26/26 effort-tier consumer + live model-tier-advisor smoke; routePrompt contract unchanged.

## Body
```
[MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-CHEAPEST-MODEL-SELECT (slot:alpha): route each matrix-proven mechanical class to the CHEAPEST proven local model, not first-in-roster-order -- completes U-ALPHA-OLLAMA-ROSTER-SYNC (measuring 9 models only pays off if the policy then PICKS the smallest sufficient one). ollamaSafeClassModels was best=best||model = first-qualifying in matrix/roster order, correct ONLY by the coincidence that the coder ladder is listed small-first; a roster reorder would silently route mechanical work to a needlessly-large model (wasting the VRAM the offload exists to save -- the resident 32b's ~55GB footprint is the 96GB box's binding constraint). New pure modelCostRank parses the param-size suffix (:1.5b/:7b/:32b/:120b; reads post-colon so the 2.5 in qwen2.5 name is never a size; unparseable->Infinity->first-seen fallback = zero regression). Selection now picks argmin cost among all-tasks-proven models, stable first-seen tie-break. Cheaper proven model = same matrix-verified 100% quality, less VRAM, more concurrency. No-op on the current coincidentally-sorted 3-model matrix (live-validated: extract->1.5b, format->32b unchanged); diverges for cross-family classes (gpt-oss:20b over deepseek-r1:32b) + any future reorder. 34/34 policy (incl big-first regression oracle + MoE + tie + 5 cost-rank unit tests) + 26/26 effort-tier consumer + live model-tier-advisor smoke; routePrompt contract unchanged.
```

## Files touched (3)
- scripts/lib/model-routing-policy.mjs      | 43 +++++++++++++++++++++++++++---
- scripts/lib/model-routing-policy.test.mjs | 95 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 133 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c243f01414a7`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-ROUTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._