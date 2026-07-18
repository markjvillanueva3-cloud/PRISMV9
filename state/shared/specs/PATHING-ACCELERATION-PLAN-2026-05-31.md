# Pathing-system acceleration plan (WORKING-PATH-CAPTURE-MS0 / U-WPC-ACCEL)

**Author:** claude-da9aacf5 slot alpha · 2026-05-31 · coordinated with india (ai-training).
**Context:** the operator asked to *"think of ways to plan for accelerating the pathing system"* — i.e.
make the capture→retrieve→replay→learn loop of [[working-path-capture]] FAST and self-improving.
**Status:** plan (lever 1 partly shipped in `path-ledger.findWorkingPaths`; rest are queued units).

The pathing system's value compounds as the ledger grows; the acceleration levers below shorten the
loop from "re-derive a path each time" → "retrieve+replay a proven path in sub-second, and improve the
selector continuously." Levers are ordered by leverage. India owns the math primitives (`prism_algorithm`)
and the retrain substrate — these REUSE them, never re-derive (R8).

## Lever 1 — kNN path-memoization (BIGGEST, partly shipped)
`findWorkingPaths(domain, goalType, {embed, query})` already ranks proven paths by **cosine over
goal-embeddings** when an `embed` fn is injected. Wire it to nomic-embed (the warm offload model) so a
new goal matching a proven path within threshold τ **replays instead of re-planning**. Compounds: the
more paths captured, the higher the hit-rate. UNIT `U-WPC-ACCEL-KNN` — wire the real embedder + a τ gate.

## Lever 2 — optimal path SELECTION when ≥2 candidates
When multiple working-paths match a goal, pick the best: score by `outcome × recency × captureCount`,
break ties with `ml_beam_search`/`ml_viterbi` (india primitives, already wired via `prism_algorithm`)
over per-step success priors. For composing a NOVEL path from sub-paths, **A\*** over the action space
(admissible heuristic = remaining-goal-distance in embedding space). UNIT `U-WPC-ACCEL-SELECT`.

## Lever 3 — india retrain loop (self-improving selector)
WorkingPath rows on the OutcomeFeedbackBus are GNN/LoRA training signal. `nn-graph-retrain-lifecycle.mjs`
(6h cadence, promote-on-gate-pass-only) already retrains the wiring-inference model; extend its corpus
to include path-selection outcomes so the *selector itself* improves. The loop closes: better paths →
better rows → better selector → better paths. UNIT `U-WPC-ACCEL-RETRAIN` (india-owned; alpha emits, india ingests).

## Lever 4 — prewarm the path-embedder
kNN retrieval (Lever 1) needs a warm embedding model or first-call latency dominates. Keep
`nomic-embed-text` (or the path-selection model) resident via `keep_alive:-1` (ties into the Ollama
recovery 2026-05-31 — model loads off the slow H: drive are the cold-start cost). UNIT `U-WPC-ACCEL-PREWARM`.

## Lever 5 — cross-galaxy path transfer (compound across domains)
A proven CAD path (delta) and a CAM path (kilo) share a goal-embedding space → a CAD success can seed a
CAM path proposal and vice-versa. `findWorkingPaths` with `domain=null` + an embedding query enables
cross-domain retrieval. This is the "synergize the galaxy" compounding the operator wants. UNIT `U-WPC-ACCEL-XFER`.

## Lever 6 — negative-path avoidance
`captureWorkingPath` already records FAILED paths (`working:false`). Selection (Lever 2) must DOWN-rank
or exclude paths whose stepsHash matches a known failure → the system stops re-walking dead-ends. The
error-bus already holds failures; join them. UNIT `U-WPC-ACCEL-NEG`.

## Sequencing (R13 logical order)
1. Lever 1 (kNN wire) + Lever 4 (prewarm) — retrieval is the foundation; ship together.
2. Lever 2 (selection) + Lever 6 (negatives) — needs a populated ledger.
3. Lever 3 (retrain) + Lever 5 (transfer) — india-owned, needs the bus flowing + ledger volume.

## Measurement (so acceleration is provable, not asserted — R12)
- **hit-rate**: % of goals served by a retrieved path vs re-planned (target rising over time).
- **replay-latency**: time from goal → ExecutionPlan (target sub-second once warm).
- **replay-success**: % of replayed paths that achieve the goal (the selector's accuracy).
Log to `state/shared/path-ledger/accel-metrics.jsonl`; advisory.

Memory: [[feedback_plot_path_capture_working_path]]. Wiki: [[working-path-capture]].
