---
title: loop-goal-stack-advisor
type: architecture
status: built
shipped: 2026-06-14
slot: alpha
milestone: SELF-DRIVE-MS0
unit: U-STACK-ADVISOR
tags: [loop, goal, token-economy, ollama-routing, psn, synergy, autonomous-loop]
---

# /loop + /goal Stack Advisor

**What:** A per-iteration advisory injected by the `/loop` and `/goal` script hooks that forces a chat to deploy the **whole PRISM stack** optimally, variably, and efficiently — instead of grinding code with a narrow tool set.

**Operator directive (2026-06-14):** make `/goal` + `/loop` develop utilizing every substrate (AI/learning/reasoning, PSN, system-viz, Obsidian, Hermes, engines/pipelines/algorithms/formulas/DBs, mcp tools, per-galaxy CLAUDE.md/souls, memories/wikis/tribal, model routing, token-savings, session lifecycle, JM Die/resources/docs) "in unison, optimally and strategically"; "attach a script hook to it."

## Gap it closes
The loop/goal hooks already injected loop *discipline* (closed-loop, eval-gate, R15) but not strategic *stack deployment*. The peer-shipped `synergy-definition-inject.mjs` holds the canonical all-substrates catalog but fires only on the literal word "synergy" — never during a `/loop`/`/goal` run. Prior audit `[[feedback_checkin_loop_goal_utilization_audit_2026_05_16]]` found **9/14 surfaces NAMED-not-INVOKED**. This advisor invokes them, intent-routed, every loop/goal turn.

## Mechanism (compose, don't duplicate — R8)
`scripts/lib/loop-goal-stack-advisor.mjs` — `buildStackAdvisory({prompt, loopState, iter})`:
1. `classifyDevIntent(prompt)` → `{intent, phase, reasoning}` (DISCOVER / AUDIT / VERIFY / DATA / LEARN / DESIGN / BUILD), scored by keyword hits, default BUILD. Maps to a real `FORGE_PHASE_CATEGORY` phase.
2. **Model lane as policy** (not a live probe): mechanical intents → "OFFLOAD to Ollama"; reasoning intents → "Claude-led, but offload mechanical sub-steps; Opus only for hard reasoning". Never Opus for mechanical.
3. **Substrate plan** — reuses `routeTask(taskType, phase)` from `scripts/lib/task-substrate-router.mjs` (ollama / obsidian / hermes / master-graph / psn, each with concrete invocations).
4. **Variable spotlight** — `spotlightForIter(iter)` rotates one deeper substrate nudge across 14 spotlights keyed to the loop `iter`, so coverage compounds (the "variably" requirement).
5. **Catalog pointer** — ends at `[[feedback_synergy_definition]]` + `[[feedback_psn_definition]]` (reuse, never re-copy the catalog).

## Wiring
- `.claude/hooks/loop-iteration-inject.mjs` (fires on `/loop`) — appends the advisor after `LOOP_DISCIPLINE`; passes the live loop `iter` so the spotlight rotates.
- `.claude/hooks/goal-prereq-inject.mjs` (fires on `/goal`) — appends the advisor **after** the dedup decision (stable pre-flight panel stays deduped; advisor stays fresh); `iter:0`.
- Both: lazy dynamic import + try/catch (never crash-on-load, fleet convention); fail-open. Knob `PRISM_STACK_ADVISOR_DISABLE=1`.

## Efficiency
Intent-filtered subset (~2KB), not the 40-system dump. Appended after the goal hook's `loop-inject-dedup` so the stable panel is deduped. The advisor itself embodies the token-economy it preaches (Ollama offload, RTK, search-first, cheap-node-access).

## Tests / validation
`scripts/lib/loop-goal-stack-advisor.test.mjs` — 19/19 (intent routing per representative prompt, spotlight rotation + full-cycle distinctness, render contains lane/substrates/spotlight/catalog, disabled→null, non-string→null, intent-differentiation, iter-rotation). Live E2E: both hooks inject on `/loop`+`/goal`, knob disables, non-loop/goal prompts stay silent.

Related: [[feedback_loop_goal_optimal_stack_utilization]] · [[agent-loop-design-rules]] (the discipline blocks this complements) · the self-compact spotlight → [[feedback_model_self_triggers_compact]].
