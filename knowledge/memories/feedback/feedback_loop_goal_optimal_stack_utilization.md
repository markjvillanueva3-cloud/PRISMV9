---
name: feedback_loop_goal_optimal_stack_utilization
description: "SELF-DRIVE-MS0/U-STACK-ADVISOR (slot:alpha 2026-06-14): /loop and /goal now inject a per-iteration STACK ADVISOR that forces optimal+variable+efficient deployment of the WHOLE PRISM stack (intent-routed substrate plan + model lane + a rotating spotlight). Operator directive: make /goal+/loop develop utilizing all substrates in unison, strategically. Composes the existing routers; does NOT duplicate synergy-definition-inject."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.433Z
aliases: feedback_loop_goal_optimal_stack_utilization
---


Operator directive (2026-06-14): "make /goal + /loop develop utilizing all this optimally, variably, efficiently and effectively … work together in unison, optimally and strategically" + "modify or add to the /loop /goal slash command … if you can attach a script hook to it do it."

## What shipped
`/loop` (an Anthropic harness command) and `/goal` (a PRISM keyword) each already have a UserPromptSubmit **script hook** attached (`loop-iteration-inject.mjs`, `goal-prereq-inject.mjs`). Those hooks now inject a **STACK ADVISOR** block (`scripts/lib/loop-goal-stack-advisor.mjs`, `buildStackAdvisory({prompt, loopState, iter})`) that, per iteration:
- **classifies dev-intent** (`classifyDevIntent` → DISCOVER/AUDIT/VERIFY/DATA/LEARN/DESIGN/BUILD + a real forge phase),
- **states the model lane as POLICY** (mechanical → OFFLOAD to Ollama $0; reasoning-led → Claude but offload mechanical sub-steps; never Opus for mechanical) — derived from the intent's nature, NOT a live Ollama probe a hook can't make,
- **surfaces the routed substrate plan** (reuses `routeTask` from `task-substrate-router.mjs` → ollama/obsidian/hermes/master-graph/psn with concrete invocations),
- **rotates ONE deeper spotlight per iteration** (`spotlightForIter(iter)`, 14 spotlights spanning the PSN legs + token levers) so coverage compounds across a loop instead of tunnel-visioning 3 tools — the "variably" requirement,
- **points at the canonical catalog** `[[feedback_synergy_definition]]` + 11-leg `[[feedback_psn_definition]]` (reuse, never re-copy the 40-system list).

## Why / root cause it fixes
The loop/goal hooks already injected DISCIPLINE (closed-loop, eval-gate, R15) but not strategic **stack deployment**. The peer's `synergy-definition-inject.mjs` holds the catalog but fires only on the literal word "synergy" — never during a `/loop`/`/goal` run, which is where dev happens. Prior audit `[[feedback_checkin_loop_goal_utilization_audit_2026_05_16]]` found 9/14 surfaces NAMED-not-INVOKED. This advisor INVOKES them, intent-routed, every loop/goal turn.

## How to apply (for any chat in a /loop or /goal)
When you see the `⚙ OPTIMAL STACK USE` block: actually DO it that iteration — offload the mechanical work to Ollama, search system-viz before grep, recall the Obsidian brain, engage the spotlighted substrate, switch models by task, persist the outcome (memory→Obsidian→master-index) so the next iteration compounds. It is advisory (you can't hard-gate "used the stack well"), but it is the standing operating mindset for autonomous work.

## Design notes (R8/R7)
- **Compose, don't duplicate:** reuses `routeTask` + `classifyTaskClass` + the synergy catalog. Only-new logic = the coarse dev-intent map + the iteration-variable spotlight + the compact render.
- **Token-cheap by construction:** intent-filtered subset (~2KB), not the 40-system dump; advisor appended AFTER the goal hook's dedup decision so the stable pre-flight panel stays deduped while the rotating advisor is fresh.
- **Fail-open everywhere:** lazy dynamic import + try/catch in both hooks; `buildStackAdvisory` returns null on any fault — an advisor fault can NEVER block /loop or /goal. Knob `PRISM_STACK_ADVISOR_DISABLE=1`.
- 19/19 unit tests (intent routing + spotlight rotation + render + adversarial) + 6 live end-to-end hook checks.

Related: [[feedback_synergy_definition]] · [[feedback_psn_definition]] · [[feedback_checkin_loop_goal_utilization_audit_2026_05_16]] · [[feedback_model_self_triggers_compact]] (the self-compact spotlight references it).
