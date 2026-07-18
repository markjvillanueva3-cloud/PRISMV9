# WORKING-PATH-CAPTURE-MS0 — plot-path → capture-working-path → autonomous-learning → compound across galaxies

## Context (why)

Operator directive (alpha, who owns cross-galaxy doctrine + learning-memory): make a **standing rule** —
*every chat must plot its path / track its movements toward a goal; when a working path to a goal is
proven, wire it into the AI system to drive **autonomous CAD work that keeps learning**; add it to the
learning system; pass the rule to **all galaxies** so we **compound-learn**.* Originally aimed at delta
(CAD) + kilo (CAM), but built fleet-wide by alpha and wired to the master brain + all domains, plus a
plan to **accelerate** the pathing system. Coordinated with **india** (AI-training galaxy) per its
authority doctrine.

The win: PRISM already executes goals but **throws away the trajectory**. Capturing the *proven action
sequence* per (domain, goal) turns one-shot success into a replayable, compounding asset — autonomous
CAD/CAM stops re-deriving and starts replaying+improving known-good paths, and every galaxy's wins feed
one shared learner.

## Reuse map (R8 — wire into existing backbone, do NOT duplicate)

| Need | Reuse (verified) | Path |
|---|---|---|
| Learning signal sink | **india's OutcomeFeedbackBus** ("learning signal goes through india") | `OutcomeFeedbackBusEngine.ts` · `state/shared/outcome-bus.jsonl` · `xproc_outcome_*` · `outcome-bus-auto-tap.mjs` |
| Outcome→path record pattern | RGS pure-core + injected-paths ledger | `scripts/lib/rgs-plan-outcome.mjs` · `rgs-outcome-record-stop.mjs` |
| Autonomous replay of a sequence | `autonomousDispatcher.ts` `auto_execute` + `ExecutionPlan` (ATCS) | `mcp-server/src/tools/dispatchers/autonomousDispatcher.ts` · `state/autonomous_tasks/` |
| CAD working-path format (exists!) | delta `cad-action-templates/*.actions.json` + `blueprintToAllCADsOrchestrator` | `state/shared/cad-action-templates/` · `prism_cad` |
| CAM autonomous entry | kilo `auto_print_to_program` + `AdaptiveToolpathRouterEngine` | `prism_cam` |
| Rule → all galaxies | feedback-memory → `stop-obsidian-memory-feed.mjs` → `knowledge/memories/feedback/` → `master-index-precheck-inject` recall | C: memory + galaxy `MEMORY.md` `## Master-brain link` |
| Master-brain registration | `[galaxy:*]` back-pointer in master `MEMORY.md` + system-graph node via `system-viz-add-node.mjs` | master `MEMORY.md` · `system-graph.json` |
| Acceleration math | `prism_algorithm`: `ml_knn`, `ml_beam_search`, `ml_viterbi`, `graph_heterophily_aggregate` | (india-owned primitives) |
| Peer-locked surface edits | PATCH-SIBLING | `state/shared/dashboards/patches/<SURFACE>-PATCH-<unit>.md` |

## The mechanism — `scripts/lib/path-ledger.mjs` (pure-core, the only net-new code)

A fleet-wide ledger of action-trajectories keyed by `(galaxy, goalType, goalHash)`.
- `recordStep(pathId, step)` — append a movement breadcrumb `{seq, action, args-digest, ts}` (lightweight; a chat plots its path as it works). Store: `state/shared/path-ledger/active/<pathId>.jsonl`.
- `captureWorkingPath(pathId, {outcome, goal, domain})` — on success, promote the trajectory to a **WorkingPath** `{domain, goalType, steps[], params, outcome, score, sourceSession, capturedAt}` → `state/shared/path-ledger/working-paths.jsonl` (append+dedup on `(domain,goalType,stepsHash)`, atomic via `scripts/lib/exclusive-file-lock.mjs` — the lock I shipped this session).
- `findWorkingPaths(domain, goalType, query)` — retrieve proven paths (exact + `ml_knn` cosine over goal-embeddings = acceleration).
- `toExecutionPlan(workingPath)` — adapt a WorkingPath → `autonomousDispatcher` `ExecutionPlan` shape for `auto_execute` replay.
- `emitLearningRow(workingPath)` — labeled training row → **india's OutcomeFeedbackBus** (`outcome-bus.jsonl`, same schema `outcome-bus-auto-tap` uses).
- Pure-core + injected `LedgerRoots`/`now`/`embed`; fail-soft (never throws into the work loop — it's an optimization like the galaxy-synth ledger). CLI `scripts/path-ledger.mjs {record|capture|find|replay|emit}`.
- Tests `scripts/lib/path-ledger.test.mjs` (node:test): record→capture→find round-trip, dedup, atomic-write under the exclusive lock, `toExecutionPlan` shape matches `ExecutionPlan`, `emitLearningRow` schema matches outcome-bus, fail-soft on corrupt/missing store, + a real-data E2E (capture a path, find it, adapt to ExecutionPlan) — the "hermetic fakes don't prove wiring" oracle.

## Deliverables (enumerated; layered R13 — foundation first, domains adopt on proven foundation)

**Foundation (this milestone — alpha builds, all writable from alpha worktree):**
1. **U-WPC-LEDGER** — `path-ledger.mjs` + CLI + tests (above). [`scripts/lib/`, `scripts/`]
2. **U-WPC-LEARN-WIRE** — `emitLearningRow` → india's `outcome-bus.jsonl` (labeled WorkingPath-completion rows); verify schema parity with `outcome-bus-auto-tap`. *This is "add it to the learning system," routed through india.*
3. **U-WPC-AUTO-BRIDGE** — `toExecutionPlan` adapter + wire a `path_replay` action into the autonomous surface (prefer extending `autonomousDispatcher.ts` `auto_execute` to accept a `workingPathId`; if that dispatcher is peer-locked → patch-sibling). E2E: capture→adapt→`auto_dry_run`.
4. **U-WPC-RULE-MEMORY** — `feedback_plot_path_capture_working_path.md` (C: memory; auto-feeds Obsidian → all galaxies recall it). The standing rule + Why + How-to-apply.
5. **U-WPC-RULE-WIKI** — `knowledge/wiki/architecture/working-path-capture.md` (mechanism + reuse map + acceleration).
6. **U-WPC-MASTER-BRAIN** — register `[galaxy:path-capture]`-style back-pointer + a system-graph node (via `system-viz-add-node.mjs`) so the master index surfaces the ledger fleet-wide.
7. **U-WPC-PROPAGATE** — the rule reaches all galaxies: (a) the feedback-memory (auto-fed); (b) a CLAUDE.md doctrine-pointer section + a one-line entry in every galaxy `MEMORY.md` "Standing focus" — both peer-locked → **patch-siblings** (`CLAUDE-MD-PATCH-WPC.md` + `GALAXY-MEMORY-PATCH-WPC.md` listing all galaxy MEMORY.md targets for golf/owners to splice).
8. **U-WPC-INDIA-COORD** — coordination with india: chat-bus post + a patch-sibling to india's galaxy `MEMORY.md` noting WorkingPath rows now flow into its OutcomeFeedbackBus (so india's NN-GRAPH/LoRA/meta-learn consume them); follow `PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.
9. **U-WPC-ACCEL** — acceleration plan spec `state/shared/specs/PATHING-ACCELERATION-PLAN-2026-05-31.md` (below).

**Domain adoption (next, on the proven foundation — the rule drives delta+kilo in their slots; I provide a worked CAD reference):**
10. **U-WPC-CAD-ADOPT (delta)** — delta's autonomous CAD (`blueprintToAllCADsOrchestrator`) records its path via `path-ledger`, captures the working-path on a clean STEP round-trip, and replays proven paths for similar prints. I ship ONE worked reference (capture a known-good `cad-action-templates` sequence as the first WorkingPath) so delta's adoption is copy-the-pattern.
11. **U-WPC-CAM-ADOPT (kilo)** — same for `auto_print_to_program` → `AdaptiveToolpathRouterEngine`.

## Acceleration plan (the "accelerate the pathing system" deliverable — U-WPC-ACCEL)

1. **Memoize + retrieve (biggest lever)** — `findWorkingPaths` via `ml_knn` cosine over goal-embeddings (nomic): a new goal that matches a proven path within τ replays it instead of re-planning. Compounds as the ledger grows.
2. **Optimal path selection** — when ≥2 candidate paths exist, score by outcome + `ml_beam_search`/`ml_viterbi` over step-success priors; A* over the action space when composing a novel path from sub-paths.
3. **India retrain loop** — WorkingPath rows are GNN/LoRA training signal; `nn-graph-retrain-lifecycle.mjs` (6h) improves the path-selection model; promote-on-gate-pass only.
4. **Prewarm** — keep the path-selection embed model warm (`keep_alive`) so retrieval is sub-second (ties into the Ollama recovery this session).
5. **Cross-galaxy transfer** — a proven CAD path informs CAM (and vice-versa) via shared goal-embedding space → compound-learning across domains, not just within.
6. **Negative paths** — capture FAILED paths too (the error-bus already has them) so selection avoids known dead-ends.

## Critical files
- NEW: `scripts/lib/path-ledger.mjs`, `scripts/path-ledger.mjs`, `scripts/lib/path-ledger.test.mjs`, `knowledge/wiki/architecture/working-path-capture.md`, `state/shared/specs/PATHING-ACCELERATION-PLAN-2026-05-31.md`, `state/shared/specs/WORKING-PATH-CAPTURE-MS0-DESIGN.md`, C: `feedback_plot_path_capture_working_path.md`.
- REUSE/IMPORT: `scripts/lib/exclusive-file-lock.mjs` (atomic store), `scripts/lib/rgs-plan-outcome.mjs` (outcome pattern), `OutcomeFeedbackBusEngine.ts` schema, `autonomousDispatcher.ts` `ExecutionPlan`.
- PATCH-SIBLINGS (peer-locked): `state/shared/dashboards/patches/{CLAUDE-MD-PATCH-WPC,GALAXY-MEMORY-PATCH-WPC,INDIA-MEMORY-PATCH-WPC}.md`.

## Verification
- `node --test scripts/lib/path-ledger.test.mjs` → all green (round-trip, dedup, atomic, ExecutionPlan-shape, outcome-bus-schema parity, fail-soft, real-data E2E).
- E2E: `node scripts/path-ledger.mjs record … && … capture … && … find …` returns the path; `… emit` appends a valid row to a tmp `outcome-bus.jsonl`; `… replay --dry-run` produces a valid `ExecutionPlan`.
- Schema parity check: emitted learning row parses under the same reader `outcome-bus-auto-tap` uses.
- Per-file 2-reviewer scrutiny on `path-ledger.mjs` + its test (arm A code-analyzer, arm B reviewer); 3-of-3 at Stop.
- Propagation proof: after the feedback-memory writes, `prism_memory:semantic_search query="plot your path working path"` returns it (recall reaches all galaxies).

## Scope honesty (R12)
This milestone ships the **fleet-wide foundation + the india learning-wire + master-brain + propagation + acceleration plan** — complete + validatable in alpha's lane. The per-domain **executor replay adoption** (delta CAD, kilo CAM) is layered on the proven foundation (R13): I ship one worked CAD reference WorkingPath; delta/kilo wire replay into their own dispatchers in their slots (the rule mandates it). Dispatcher edits that hit peer-locked files become patch-siblings, surfaced not silent.
