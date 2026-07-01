---
name: reference_feature_routing_graph_ms0_2026_06_15
description: "FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH shipped 2026-06-15 (slot:alpha). A UNIFIED task-class->optimal-routing decision graph the fleet follows for every task + auto-invoke. Composes the 6 existing routers (cag/model-policy/substrate/loop-advisor/skill-trigger/AISystemRouter) into one followable policy -- the gap the enumeration found: no single artifact wired them in a declared order. 12 task classes x 19 substrates x 112 cmd families x 809 hooks. Files absorbed into peer commit f004aa153d (shared-tree hazard) + properly-attributed P2 fix 281fdecd93."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.572Z
aliases: reference_feature_routing_graph_ms0_2026_06_15
---


# FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (2026-06-15, slot:alpha)

Operator: *"build a graph for you to follow on the most token-efficient way to do every tool call
and every task we've ever done"* + *"auto-invoke [commands] in a session without me having to type
them in"* (shape chosen: "Both -- graph now, catalog as backing data"). Triggered partly by the
cyrilXBT/charliejhills Hermes second-brain X posts (which PRISM already exceeds via PSN +
HERMES-BRIDGE-MS0; the one novel idea was hermes-CCC's no-OAuth native-skill port).

## What shipped
A **composition layer**, NOT a new router (R8). The enumeration (4 parallel Sonnet miners over
commands/hooks/substrates/routers) confirmed PRISM already had 6 routers but **no single artifact
wired them in a declared execution order with a shared input** -- that gap is what this fills.

- `scripts/lib/feature-routing-graph.mjs` -- the brain: `TASK_CLASS_POLICY` (12 frozen classes),
  `classifyRoutingClass(prompt)` (pure keyword classifier -- NAMED to avoid colliding with
  `local-llm-task-router.classifyTaskClass`, which is the model-capability axis, R7),
  `routeTaskClass(prompt,ctx)` (async, lazy-imports cag-router/model-routing-policy/task-substrate-router,
  fail-open per field), `buildRoutingDigest`, `TASK_CLASS_TO_FORGE_PHASE`.
- `scripts/lib/feature-routing-graph.test.mjs` -- 23 tests.
- `state/shared/specs/FEATURE-ROUTING-GRAPH.md` -- the followable graph (Mermaid + 12-class policy
  table + 19-substrate reference + 6-router composition + auto-invoke section). THE "graph to follow".
- `state/shared/feature-routing-graph.json` -- machine catalog (single-sourced from the lib).
- `scripts/generate-feature-routing-graph.mjs` -- the JSON generator.
- `scripts/feature-route.mjs` -- on-demand CLI (`node scripts/feature-route.mjs "<task>" [--json]`);
  named feature-route NOT route to avoid the existing `/route` SKILL (model-provider axis), R7.
- `scripts/lib/loop-goal-stack-advisor.mjs` (+test) -- EXTENDED: emits the task-class `autoInvoke`
  line per /loop+/goal iteration (the "fire without typing" delivery; R8 host -- it already ran
  per-iter and already called routeTask).

## The 12 task classes + ladder
locate|build|plan|recall|learn|quote|physics|review|fix|orchestrate|session|domain. Each carries a
cheapest-first substrate ladder (master-graph 0-tok -> obsidian -> ollama -> wiki/tribal -> claude),
a model tier (Ollama->Sonnet->Opus), ordered commands, autoInvoke set, and the antipattern to avoid.
Live-validated: `feature-route.mjs "compute the speed and feed for 4140"` -> physics class + real
composed cag(HYBRID)+model(opus)+substrate verdicts.

## Verification
45/45 tests (23 lib + 22 advisor incl. 2 new). 3-of-3 scrutiny ALL PASS, no P0/P1; 3 P2s auto-fixed
inline (task-class->forge-phase map so substrate plan is class-specific not generic "summary"; dropped
over-broad locate "does" signal; re-mirrored spec learn/quote rows).

## R12 process note -- shared-tree absorption
The 8 files were **absorbed into peer commit f004aa153d** (slot:tango) -- tango ran `git add -A`/`commit -a`
on the shared H:/prism tree between my `git add` and `git commit`, sweeping my staged files into their
commit ("no changes added to commit" + my files appeared in tango's `show --stat` with full content).
Work intact (classifyRoutingClass present, 45/45). The properly-attributed P2 fix is `281fdecd93`.
This is the exact hazard [[feedback_commit_to_slot_worktree]] warns of; mitigation = chain add+commit
in one bash call (tiny window) or use the slot worktree. Lesson reinforced: in the shared tree,
`git add` then a separate `git commit` call is racy against peer `git add -A`.

Related: [[feedback_commit_to_slot_worktree]] · [[feedback_loop_goal_optimal_stack_utilization]] (the advisor host) · [[feedback_psn_definition]] (the 11-leg ladder).
