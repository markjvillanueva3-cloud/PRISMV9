---
name: reference_exec_policy_routing_graph_2026_06_16
description: "SHIPPED 2026-06-16 (slot:alpha, commits 7ae1ad7c05 + d1246d2abe): U-EXEC-POLICY added a per-class execution:{harness,hermes,ollama} field to all 12 TASK_CLASS_POLICY classes in the feature-routing-graph, naming the REAL engineered harness, hermes-agent delegation, and ollama-offload model for each task class. Operator directive: apply engineered loops/harnesses/hermes/ollama/model-switching in the routing graph. Self-suppressing renderExecutionLine wired into the live prompt-route-inject + buildRoutingDigest CLI. Also records the shared-index-reset commit-split incident (stage-early-commit-late loses files on the shared tree)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.569Z
aliases: reference_exec_policy_routing_graph_2026_06_16
---


# U-EXEC-POLICY -- per-class execution machinery in the routing graph (2026-06-16, slot:alpha)

## What shipped
Operator: *"make sure we apply proper engineered loops and harnesses and utilizing hermes
and ollama and model switching in your graphs"* (the "graphs for how to tackle tasks" =
`scripts/lib/feature-routing-graph.mjs` TASK_CLASS_POLICY, 12 classes). The gap: each class
node declared `substrateLadder/modelTier/commands/autoInvoke/antipattern/loopCron` but NOT the
concrete execution MACHINERY (which harness, which hermes-agent, which ollama-offload).

Fix (additive, R7 -- loopCron + modelTier untouched, no field duplication): added
`execution: { harness, hermes, ollama }` to all 12 classes, composing REAL on-disk assets
(pdf-corpus-watcher-sweep / hermes-dream-cycle-synth / scrutiny-3way / regression-hunter /
Workflow+prism_atcs / hurco-jmdie-roundtrip-harness / studios; ask-hermes; qwen2.5-coder:32b/1.5b,
gpt-oss:120b/20b, deepseek-r1:14b). A `no`/`none` dim = judgment-only/inapplicable.
- **Safety invariant (pinned by test):** `physics.execution.hermes` + `.ollama` BOTH start with
  "no" -- safety calc/G-code NEVER delegates or offloads (no egress). `orchestrate` is the
  hermes-PRIMARY class; `learn` offloads the whole pipeline to ollama ($0).

## Wired + validated (R15)
- WIRE: self-suppressing `renderExecutionLine(execution)` (omits no/none dims) in
  `.claude/hooks/prompt-route-inject.mjs` -> renderRouteBlock (live UserPromptSubmit inject, all 26
  slots); ALSO mirrored into `buildRoutingDigest` so the `feature-route.mjs` CLI surfaces exec
  (arm-B P2 closed -- wire to ALL consumers). Regenerated `state/shared/feature-routing-graph.json`
  (12/12 classes carry execution). Spec 1b added to `FEATURE-ROUTING-GRAPH.md`.
- TEST: 34/34 graph + 27/27 inject = 61, real-value asserts (high-value classes name real
  machinery; physics no-egress; suppression edge cases; coverage invariant). A real test caught the
  build.harness "none --" mis-phrasing -> fixed to the real eval-harness string.
- VALIDATE: live inject + CLI digest render exec lines across orchestrate/build/review/fix/learn
  with correct per-dim suppression (recall shows ollama-only; physics shows harness-only).
- SCRUTINY: 3-of-3 PASS (arm A verified all 7 named assets exist on-disk; arm A finding
  jmdie-roundtrip -> real hurco-jmdie-roundtrip-harness.mjs / lathe-jmdie-param-accuracy-harness.mjs).

## Incident: shared-index-reset split the commit (R12 fail-loud)
First commit `7ae1ad7c05` captured only 2 of 6 staged files -- the shared `H:/prism` index churned
between my early `git add` (6 files) and the `git commit` (peer activity + a foreign-file
auto-unstage of the peer-claimed json), leaving 2 files. Caught by reading `git show --stat` +
`git status` (the work was intact on disk, NOT swept into a peer commit). Re-committed the remaining
4 in `d1246d2abe`. **Lesson:** on the shared multi-chat tree, stage + commit ATOMICALLY (one step,
explicit pathspec) -- never `git add` early and `git commit` a turn later; the shared index is
contended (this is the exact collision the git-add-lane-guard docstring warns about, sibling of
[[feedback_commit_to_slot_worktree]]). Verify a commit's file COUNT (`git show --stat`) before
calling it done.

Sibling of [[reference_routing_graph_edges_blocker_2026_06_16]] +
[[reference_prompt_route_and_force_use_maps_2026_06_15]] + [[reference_feature_routing_graph_ms0_2026_06_15]].
