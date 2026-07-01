---
name: reference_hermes_router_u1_2026_06_04
description: HERMES-EFFICIENCY-ROUTER U1 keystone — local-llm-task-router.mjs composer (runLocal vs Claude decision + model pick); plan + dead-offloader fix shipped
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.607Z
aliases: reference_hermes_router_u1_2026_06_04
---


# HERMES-EFFICIENCY-ROUTER — U1 keystone shipped (2026-06-04, slot:alpha)

Operator goal: keyword-triggered skills/scripts/hooks for Hermes that use Ollama/local-LLMs to do as much work as possible **without degraded quality**; a reviewer agent enhances+gap-fills; Hermes knows the optimal `{tool,skill,memory,tribal,llm-model,prism-feature}` for any task. **LOCAL ONLY** (manufacturing IP never leaves the box). Full plan: `state/shared/specs/HERMES-EFFICIENCY-ROUTER-PLAN-2026-06-04.md` (7 units, research-grounded by Workflow wnxc8ihda — 5 lenses; reuses existing infra, rebuilds nothing).

## Shipped
- **U1-ROUTER-CORE** (`f0e72dd6e0`): `scripts/lib/local-llm-task-router.mjs` — `routeTask(task)` → ONE verdict `{taskClass, category, runLocal, ollamaModel, escalateTo, qualityBar, fallbackChain, reason}`. It is a **COMPOSER** (zero new policy): delegates model-tier to `routeModelForTask` (ollama-cost-router), install-truth to `fetchInstalledModels` (host-aware-synthesis-model), host class to `detectHostClass`. 3 tested invariants: **safety-NEVER-local** (broad mfg-safety vocab → escalateTo claude), **model-∈-installed** (phantom-reject), **IP-stays-local**. 18 tests incl REAL-composition (real routeModelForTask, not mocks) + 13-phrasing safety-breadth guard + over-escalation guard. 2-reviewer per-file scrutiny: A caught a P0 safety-vocabulary hole (feedrate/RPM/toolpath/CNC-program/safe-to-run all wrongly ran local) → fixed + regression-guarded; A+B caught a P1 over-escalation (check/verify + RSS"feed"/API"speed") → tightened to machining-sense terms only.
- **U-HER-PLAN+CONFIG-FIX** (`318d0c062b`): fixed the live dead-offloader bug — `ollama-route-config.json` pinned `qwen2.5-coder:7b` (deleted in the same session's BLACKWELL retirement) → 100% cascade_model_missing (5589-fired/0-offloaded). Re-pointed to 32b.

## Remaining units (dependency-ordered; in the plan spec)
- **U1b** (next): thin `mcp-server/src/engines/LocalLLMTaskRouterEngine.ts` + `prism_ai:route_task` dispatcher wrapper over the U1 .mjs; ADD the tool/dispatcherAction axes (costAwareRouterEngine + PRISMSelfAwarenessEngine); RETIRE stale deleted-model tags in `OllamaHookBridgeEngine.ts` (modelOverrides) + `AISystemRouterEngine.ts` (ollama-codellama/deepseek) onto routeModelForTask (live silent quality bug — they point at models deleted this session; NOT scanned by the anti-revert guard which only covers .claude+scripts).
- **U2** `local-first-execute` + `/local-do` skill (keyword front door; drives ollama-l3-agent/ask-ollama on the routed model). **U3** `local-output-reviewer` (Claude reviewer grades→enhances/gap-fills the local draft; reuse reviewer/code-analyzer + parseOllamaReviewVerdict; new = grade→enhance vs grade→block). **U4** `HermesAssetBundleEngine` + `prism_ai:asset_bundle` + `/optimal-assets` (the {tool,skill,memory,tribal,llm,feature} advisor; seed from unit-knowledge-pack composePack). **U5** hermes-asset-brief-inject. **U6** route-conversion (0.8% nudge→auto-invoke). **U7** HermesAutonomousDriver (decompose→route→execute→review→aggregate→self-correct over existing Hermes primitives). U4-U7 lean into bravo/zebra (Hermes) lane — COORDINATE.

## Key facts (live-verified)
- Read-route offloader fix is correctness-only (kills 5589 wasted fires + stale-model bug) but reroutes near-ZERO real traffic (isGistSafe correctly excludes exact-value .json/.md; .ts/.mjs never consumable). Volume lever = U2/U3/U6 (prompt-level execution), NOT Read-substitution. Do NOT widen isGistSafe.
- Advisory nudges convert at ~0.8% — every "use Ollama more" unit must AUTO-INVOKE/executable-directive, never another ignorable suggestion.
- gpt-oss:120b (134 t/s) is the best-tier winner once golf's pull lands; auto-promotes via install-gated cost-router. See [[reference_blackwell_model_retirement_2026_06_04]].

Wiki: [[blackwell-token-synergy-ms0]]. Related: [[reference_blackwell_model_retirement_2026_06_04]], [[reference_alpha_forge_punchlist_2026_06_04]], [[feedback_wire_test_validate_all_galaxies]].
