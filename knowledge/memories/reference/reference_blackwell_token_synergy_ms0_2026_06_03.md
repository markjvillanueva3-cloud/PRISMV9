---
name: reference_blackwell_token_synergy_ms0_2026_06_03
description: BLACKWELL-TOKEN-SYNERGY-MS0 (slot:alpha) — wired the RTX PRO 6000 Blackwell 96GB into the token-saving model-routing paths so code+reasoning route to free local 32B/14B
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.479Z
aliases: reference_blackwell_token_synergy_ms0_2026_06_03
---


**BLACKWELL-TOKEN-SYNERGY-MS0** (slot:alpha, 2026-06-03, branch cad-fusion-live-ms0). Lane split (operator-set): golf=GPU install/docker/hermes + model catalog; india=AI/ML systems (NN/GNN/LoRA/RAG/CAG); alpha=token-savings + context-retention leveraging the now-free GPU-class local LLMs. Works in tandem with bravo.

**Context:** 2026-06-03 BLACKWELL-GPU-SWAP (golf) replaced RTX 4080 16GB → RTX PRO 6000 Blackwell 96GB; ollama v0.30.3 now GPU-resident (1.3→220 tok/s). The routing layer was blind to it (offload rate stuck 11%, target 30%).

**Shipped (2 units, both 2-reviewer PASS, clean surgical commits):**
- **U-BW-ROUTE-PROFILE** (`d673f2866f`): added `home_blackwell` to `ModelRoutingEngine.HardwareProfile` + real GPU catalog (qwen2.5-coder:32b/14b, deepseek-r1:14b, qwen3-vl:8b, sized to live `/api/tags` quant footprint) + schema enum + 10 tests (45/45). The scorer now picks the FREE local 32B for `code` and substantial `reasoning` over paid cloud (cost penalty grows with output). **SAFETY INVARIANT:** every local model qualityTier<85, so the `canServe` safety_critical tier-floor always routes force/collision/workholding to a cloud frontier model — never local.
- **U-BW-OFFLOAD-TIER** (`ddf0fcac70`, folds in U-BW-HW-DETECT): the `.claude/hooks/lib/ollama-cost-router.mjs` `CATEGORY_TIER` map capped EVERY category at `balanced` (7B) — the 14B/32B were structurally unreachable. New `.claude/hooks/lib/host-class.mjs` `detectHostClass()` bridges golf's hostname-keyed `fleet-reaper-host-presets.json` label (blackwell/home/work → home_blackwell/home_4080/work_3080; reuses golf's `loadPresetFile`/`getPresetForHost`, env `PRISM_HARDWARE_PROFILE` wins). On `home_blackwell` the router promotes balanced→strong (14B free w/ headroom) → better summaries/audits → fewer Claude re-escalations. Gated on a strong model actually being held (no false `fallback` telemetry). Cheap tasks stay cheap; non-blackwell byte-identical (back-compat). Wired into the live `ollama-task-offloader.mjs`. +18 tests (40/40). Live-verified: `detectHostClass()` → `home_blackwell` on DESKTOP-N7MI1VB.

**Coordination:** golf concurrently extended `ModelRoutingEngine.ts` catalog with a qwen3 stack (LOCAL-LLM-FOUNDATION-BLUEPRINT) — additive, built on alpha's home_blackwell profile + <85 safety pattern. Catalog/model-install = golf's lane (alpha dropped U-BW-CATALOG-REALIGN).

**Next (open):** U-BW-DEAD-ROUTE-FIX is NOT a bug — `ollama-route-pretooluse` defaults to suggest-mode (offloaded=0 by design); enabling auto-route (`PRISM_OLLAMA_ROUTE_AUTO=1`) for report/digest/log reads on Blackwell is an **operator decision** (auto-substitutes reads with summaries). Broader open work: context-retention (Obsidian memory summarization via free 32B), galaxy-synthesis via 32B, fleet-wide offload take-rate 11%→30%. See [[feedback_git_add_absorbs_working_tree_whitespace]] for the shared-tree commit hygiene lesson learned this session.
