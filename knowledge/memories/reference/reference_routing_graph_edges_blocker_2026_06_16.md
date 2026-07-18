---
name: reference_routing_graph_edges_blocker_2026_06_16
description: "U-SLASH-PLANS shipped (route-class plan for all 1266 slash commands, wired into live prompt-route-inject); and the VERIFIED architectural blocker for the next routing unit -- slash commands are NOT individual graph nodes, so prompt-class->command routing edges would dangle. Materializing routing edges in system-graph requires command-node creation first (sierra's regen-gated graph-build domain), not an alpha-solo cross-substrate edge augmentation."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.149Z
aliases: reference_routing_graph_edges_blocker_2026_06_16
---


# Routing brain: U-SLASH-PLANS shipped + graph-route-edges blocker (2026-06-16, slot:alpha)

## Shipped this session
**[PROMPT-ROUTE-HISTORY]/U-SLASH-PLANS** (committed, cad-fusion-live-ms0). `scripts/build-slash-command-plans.mjs`
(+ `.test.mjs`, + `--query class|/command` CLI) enumerates ALL **1266** slash commands (748 project +
393 user + 125 archive; 860 distinct), classifies each into its route class via `classifyRoutingClass`
(R8 reuse, NOT reimplemented) -> `state/shared/slash-command-plans.json` (byClass + per-class route from
TASK_CLASS_POLICY). WIRED into the LIVE `prompt-route-inject.mjs` (every-prompt): the route block now
appends "+N <class>-class commands -- more: /a /b ... | --query <class>" (knob `PRISM_SLASH_PLAN_INJECT`,
fail-soft, backward-compatible 3-arg renderRouteBlock). 37 tests (22 generator + 15 hook); both 2-arm
scrutiny verdicts PASS after a FAIL->fix cycle (arm-C caught a P1 silent description-corruption when a
command's frontmatter exceeds the head window -- fixed with HEAD_BYTES 16K + truncation-safe parse + a
YAML-key guard + a `truncatedFrontmatter` fail-loud count; +3 P2 fixes).

This is the per-COMMAND half of the routing brain. The per-PROMPT-CLASS half (PROMPT-ROUTE-MAP-MS0:
`extract-operator-prompts.mjs` mined 613/613 transcripts -> 4870 distinct -> `operator-prompt-route-map.json`,
+ the live auto-trigger inject) was ALREADY built 2026-06-15. So the operator directive's units 1+2+4
(mine, route-map, auto-trigger) are DONE; U-SLASH-PLANS closed the slash-command-plan gap.

## VERIFIED blocker for U-GRAPH-ROUTE-EDGES (next unit) -- do not naively attempt
The directive asks to "update the graph to account for every prompt/command." The intuitive move --
typed `routes-to` edges (prompt-class -> command) via sierra's ADD-only cross-substrate edge spine
(`scripts/lib/cross-substrate-edge-schema.mjs` + `generate-cross-substrate-edges.mjs`) -- is BLOCKED:
**slash commands are not individual nodes in the 110K/346K-node graph.** Probed the node-card offset
oracle (`state/shared/system-viz/node-card-offsets.json`, `o.offsets`, 346,676 ids): namespaces are
`fs/vault/wiki/datacat/memory_reference/disp/ghost/eng/test/...`. Commands exist ONLY as the directory
node `fs.commands` + the dispatcher/registry (`disp.skillscriptdispatcher`, `reg.skillregistry`) -- NO
`skill.<name>` / `command.<name>` per-command namespace. A command->command routing edge would DANGLE
and violate the generator's NO-DANGLING invariant (or pollute the graph).

**Correct path (sierra-coordinated, regen-gated):** (1) sierra adds per-command nodes to system-graph
(a `cmd.<name>` namespace) during a graph regen; THEN (2) alpha adds `routes-to` edges (cmd -> its
TASK_CLASS_POLICY curated commands / dispatcher targets) via the ADD-only spine, validated against the
offset oracle, merged on the next regen-viz (24GB-RAM gated). Until command nodes exist, the routing
brain stays surfaced via the LIVE inject + the `--query` CLI + `slash-command-plans.json` (not the graph).

## U-LOOP-CRON-POLICY -- SHIPPED 2026-06-16 (commit 5b5bdb830a)
Added `loopCron {loop, cron}` to all 12 TASK_CLASS_POLICY classes (feature-routing-graph.mjs);
`renderLoopCronLine` surfaces a compact `loop/cron: LOOP ... | CRON ...` line in the LIVE
prompt-route-inject ONLY when worthwhile (build/learn/fix/orchestrate/session/domain = yes; one-shot
classes silent), knob `PRISM_LOOP_CRON_INJECT`, backward-compat. Snapshot
`state/shared/feature-routing-graph.json` regenerated 12/12. 21 tests + both 2-arm scrutiny PASS. Serves
Goal A + the operator's "harnessed loops/crons to keep looping until done."

## NEXT ready unit (no graph dep): U-WORKFLOW-TEMPLATE
The operator's "make a template of the graph that you can auto-fill with relevant data for the task you're
trying to accomplish so you always follow the same thorough workflow." A fillable per-task workflow
template keyed off the route class (class -> {substrate ladder, model tier, ordered commands+when,
loop/cron policy, eval gate}). All inputs now exist (route-map + slash-command-plans + loopCron). Loss:
template renders a complete filled workflow for a held-out prompt; test pins it.

## Two-goals status (operator said "do both")
- Goal A (PROMPT-ROUTE-HISTORY, alpha's lane): foundation live; U-SLASH-PLANS shipped; remaining =
  U-LOOP-CRON-POLICY (ready), U-GRAPH-ROUTE-EDGES (sierra-gated, above), workflow-template auto-fill,
  3 X-article techniques (x.com auth-walled -> operator /mcp+playwright or pasted technique).
- Goal B (AI systems across all galaxies, india's domain): substrate verified 34/34 (CAG, 768d-RAG,
  LoRA, synthesis, audit, doctrine -- [[reference_ai_synergy_allgalaxy_verified_2026_06_16]]); the one
  open item (NN/GNN Brier 0.210 > 0.15) is GPU + india-gated, NOT alpha-solo-closable. Alpha's genuine
  Goal-B contribution = CAG/RAG telemetry honesty ([[reference_cag_warm_hitrate_honesty_2026_06_15]]) +
  surfacing the routing brain as AI-substrate context (the graph-edge unit above, once unblocked).
