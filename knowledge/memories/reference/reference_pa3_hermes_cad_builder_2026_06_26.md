---
name: reference_pa3_hermes_cad_builder_2026_06_26
description: "PA3-HERMES-CAD-BUILDER shipped (parallel-hermes CAD-unit builder harness) + the finding that delta's autonomous CAD-engine surface is essentially complete; remaining work is merge/GPU-gated."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.720Z
aliases: reference_pa3_hermes_cad_builder_2026_06_26
---


# PA3-HERMES-CAD-BUILDER + CAD-completion state (2026-06-26, slot:delta)

Operator `/checkin-delta /loop /goal`: utilize hermes/octopus + parallel agents + ultracode
to improve alpha's graphs, AND plan/complete remaining delta+CAD units toward "train+test
cad model and print generation."

## What shipped (commit 01866ce7d3 + docfix, `[MAIN-FORCE]` on cad-fusion-live-ms0)

**`CADBuilderFanoutEngine.ts`** -- the CAD-unit analogue of alpha's `GraphImprovementFanoutEngine`
([[reference_hermes_graph_improvement_loop_2026_06_25]]). PURE planner: reads CAD-COMPLETION-STATUS
units, classifies autonomous-buildable (excludes operator-gated `op:true` / merge-gated
`U-CAD-NURBS-STEP-EMIT`+`U-CAD-SCALE-COMPLEX` / GPU-gated gate `T1` / already-SHIPPED), greedily
packs fixed-cost build cells (builder + physics/test/code reviewers) into a token budget.
**Composes** `OpusFastMaxAgentSpecEngine.costTableFor('opus')` + `opusFastMaxSpec()` -- the opus 5x
multiplier stays single-sourced (no inline). R12: a refused budget spawns NOTHING.

- `scripts/cad-hermes-builder-driver.mts` (tsx) -- I/O driver; `deriveMergeGatedIds` self-clears
  post-merge (empty set once `U-MERGE-SLOT-DELTA` is SHIPPED). Writes ledger + Workflow-ready plan.
- `hermes_cad_build_plan` dispatcher action + schema (R15 WIRE; pure, no spawn).
- 58 tests (26 engine + 19 wire + 13 driver), tsc clean repo-wide. Per-file 2-arm + 3-of-3 PASS.
- LIVE: 3 cells / 12 opus-fast-max agents over `U-CAD-VALIDATION-50-RUN`(T2) + `U-CAD-PRINTGEN-E2E`(T3)
  + PA3; 17 units excluded with honest reasons.
- Also ran `hermes-graph-improvement-driver --refresh --count 16` (improve alpha's graph): the
  leverage queue refreshed stale->current (deflated the inflated unwired count).

## KEY FINDING (R12 honest state of the delta/CAD goal)

CAD-completion is **13/20 shipped** (`CAD-COMPLETION-STATUS.json` authoritative). Delta's
autonomous CAD-engine surface is **essentially DONE** -- every Phase-C capability unit
(sketch-subtract/boolean/patterns/ref-geom/die-design/sheet-metal/2D-drawing/weldments) is shipped.
The closed-loop fidelity is proven on real `blisk.stp` (0.00% dim / 1.55% mean / 5.09% worst).

The terminal milestone ("train+test cad model + print-gen") is gated by **OPERATOR/GPU decisions,
not autonomous units**:
1. **`U-MERGE-SLOT-DELTA`** (operator-gated coordinated session) -- 432-commit `slot/delta` branch
   holding the smooth-solid emitter + real CLIs. Playbook: `DELTA-P1-MERGE-PLAYBOOK-2026-06-10.md`.
2. **`U-CAD-REAL-TRAIN-RUN`** (Blackwell GPU window) -- the QLoRA dry-run is validated; needs a real run.
3. Then the autonomous **`U-CAD-VALIDATION-50-RUN`** (T2) + **`U-CAD-PRINTGEN-E2E`** (T3) record numbers.

## Environment notes (this session)
- **Hermes proxy `:8645` is DOWN** -- `ask-hermes`/`mcp__hermes__*` fall back to Ollama. Restart
  "PRISM Hermes Serve" / re-auth OAuth to get the max-subscription multi-model lane live.
- **Fusion `:18365` IS live** (operator was right) -- `U-CAD-FUSION-LIVE-PROOF` is attemptable.
- **Ollama UP** (qwen3-vl:32b + roster resident).

## Deferred (3-of-3 P2, advisory)
- Add a tsx self-reexec guard to the driver IF a cron is wired (latent Node-24 `.js`->`.ts` trap).
- PA3 models no inter-unit dependency (T2 validation-50 truly needs the T1 adapter; it can run as a
  BASELINE without it). A future dependency-aware pass could order cells.

See [[reference_hermes_graph_improvement_loop_2026_06_25]] (alpha's graph analogue) and the
DELTA-CONTEXT-LEDGER / CAD-COMPLETION-ROADMAP-2026-06-26 for the full remaining-units plan.
