# AI / NN / Wiring Opportunity Map — 2026-05-17

> **advisoryOnly · mustHumanVerify** — produced by slot `alpha` (session `23c10eea`)
> on a `/loop` directive: *"work on the ai systems… use /system-viz to find neural
> network opportunities of improvement and ai system improvements. also find wiring
> opportunities."* This is the **discovery** half of that directive. Every scoped
> unit below must be dedup-checked (`duplicationGuardEngine.mustCheckBeforeCreating`)
> and physics-reviewed before a `/forge-*` invocation.

## Survey context

- **Memory state at survey:** commit **97.4% CRITICAL** (fleet-memory-monitor flagged it,
  recommended `/compact`). Heavy builds (regen-viz, GNN retrain, full `npm run build`)
  are R6-unsafe this window — they OOM-kill sessions (see `## Recent regressions`
  → regen-viz SIGKILL-under-pressure). Discovery + scoping is the memory-safe deliverable;
  the builds are sequenced for a sub-90%-commit window.
- **Sources:** `system-viz-query` (`find neural`, `coverage-by-domain`,
  `roadmap-candidates`), `state/shared/nn-graph/NN-EVAL.json`, `loop-state list` (14
  active peer loops).

## §1 — Neural-network improvements (ranked)

### NN-1 [HIGHEST LEVERAGE] — GraphSAGE feature dimensionality: 8-d → 768-d
- **Evidence (hard):** `NN-EVAL.json` → `checkpointMeta.inputDim = 8`,
  `auroc = 0.0961` (anti-correlated — worse than the 0.5 random floor).
- **Root cause (triply documented in [[nn-graph-ms0]]):** heterophily — same-type
  nodes are *not* preferentially linked. NN-GRAPH-MS1 (`U-NNG-PIPELINE-STRATIFIED-WIRE`,
  commit `97c9286311`) already fixed the *negative-sampling distribution*. The
  **remaining model-side lever is feature richness** — an 8-d hand-feature vector
  cannot separate 372k structurally-similar nodes.
- **The fix is unusually cheap because the features ALREADY EXIST:** the wiki brain
  ships **14,738 int8 768-d nomic-embed-text vectors** at
  `knowledge/wiki/architecture/_embeddings.jsonl` (per CLAUDE-BRIEF "Semantic index").
  NN-1 is a feature-**source swap**, not feature engineering from scratch.
- **Scoped unit — `U-NNG-768D-FEATURES`:**
  - Touch: `scripts/lib/graphsage-train-pipeline.mjs` (feature loader — add an
    `--embedding-source <jsonl>` path that joins node-id → 768-d vector, falling back
    to the 8-d hand-features when a node has no embedding); `graphsage-trainer.mjs`
    (`inputDim` is read from the feature matrix — verify it is not hard-coded 8).
  - Keep the 8-d path **byte-identical** when `--embedding-source` is unset
    (preserves `PRISM_NNG_DISABLE` discipline + the MS1 legacy-parity invariant).
  - Memory note: needs reading 2 source files + **one retrain** — do at **<90% commit**.
  - Auto-promotion is already wired: the U2 self-retrain lifecycle
    (`nn-graph-retrain-lifecycle.mjs`) will auto-promote the retrained checkpoint
    **IFF** it clears AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15. No deploy code needed.
- **Risk:** if 768-d still under-performs, the next lever is a heterophily-aware
  aggregator (H2GCN-style ego/neighbor separation) — a larger unit, scope only if NN-1 fails.

### NN-2 [OPERATIONAL, not a code unit] — regen-viz has not run since the U1 seed stage
- **Evidence:** `NN-EVAL.json` → `deferred:true, reason:"insufficient-reference-pool",
  poolSize:0`. NN-GRAPH-MS2 U1 added the `seed-ghost-from-unwired.mjs` stage to
  `regen-viz.mjs`, but no regen has run since — so the live graph still carries 0
  reference ghosts and the eval cannot grade.
- **Action:** an operator (or the hourly regen cron) runs `regen-viz` **once at
  <90% commit** → poolSize >0 → eval transitions `deferred → graded`. Do **not**
  run regen-viz at 97% commit (documented SIGKILL-under-pressure class).

### NN-3 [OPERATIONAL] — the MS1 stratified retrain
- `node scripts/lib/graphsage-train-pipeline.mjs --node-type-field layer --neg-p-hard 0.7`
  against the real 372k-node graph. Out-of-session, memory-heavy. Superseded by NN-1
  if `U-NNG-768D-FEATURES` lands first (the 768-d retrain subsumes it).

## §2 — AI-system improvements

- **3-tier AI bridge units (`ghost → built`)** — CLAUDE-BRIEF documents the hierarchy
  (Claude T1 · `FullSystemAICoordinator` T2 · 7 domain-specialist AIs T3). A prior
  forge-audit flagged "PRISM AI 3-tier bridge units" as pending but **un-scoped**.
  *This needs its own audit pass* — I have NOT verified which bridges are ghost vs
  built; do not treat as shovel-ready. Honest gap, not a scoped unit.
- **`xproc-neural-*` surface** — `system-viz find neural` shows the
  `xproc-neural-{train,predict,evaluate,save,load,metrics,reset}` actions present in
  the `prism_ai` dispatcher enum, i.e. **wired**. No defect found; no unit.
- **`octopus-neural-ms0` worktree is archived/drained** — `system-viz` lists it under
  `wt.archived.*`. Confirmed dead; no action.

## §3 — Wiring opportunities — COORDINATION REQUIRED

- `coverage-by-domain`: **132/3274 = 4% wired**. Top unwired: Misc 1630 · Other 605 ·
  Lathe 188 · Hyper 68 · Cross 67.
- **This is peer `18b69120`'s lane** — its loop is *"wire unwired engines + ghost-wire
  nodes from /system-viz"*, **iter 12/20, ACTIVE**. Per R7 lane discipline, alpha does
  **not** compete on generic engine wiring.
- **Coordination handoff to `18b69120`:** when wiring the `Cross`/`Other` domains,
  prioritise AI-reasoning engines (`*AGI*`, `*Neural*`, `*Reasoning*`, `*DeepLearning*`)
  — they unblock the §2 3-tier bridge work. Alpha does the AI-opportunity discovery;
  `18b69120` does the execution it is already doing. No collision.

## §4 — Coordination map (14 loop-state entries; 5 running peers)

| Peer | Task | Lane vs alpha |
|------|------|---------------|
| `18b69120` | wire unwired engines + ghost-wire nodes (iter 12) | **owns wiring** — defer §3 |
| `a61ea33b` | fix tsc errors until gone (iter 5) | orthogonal |
| `c0f06dee` | COMMAND-KERNEL-MS0 units | orthogonal |
| `773c6214` | yolo-mode: all units (iter 14) | broad — watch for NN-graph overlap |
| `58bd7f4e` | system-viz upgrades (ended) | feeds NN-2 (graph regen) |

Alpha's NN-GRAPH lane (`scripts/nn-graph-retrain-lifecycle.mjs`, `nn-graph-eval.mjs`,
`graphsage-*`) is **not claimed by any peer loop** — NN-1 is collision-free.

## §5 — Sequenced build plan (for subsequent loop iterations / operators)

1. **NN-2** (operational) — run `regen-viz` at <90% commit → unblocks the eval data-side gate.
2. **NN-1** (`U-NNG-768D-FEATURES`) — the build; the single highest-leverage NN unit.
   Memory-gate it: only at <90% commit. Auto-promotes via the U2 lifecycle on gate-pass.
3. **§2 3-tier bridge audit** — a discovery unit of its own before any bridge build.
4. **§3** stays with peer `18b69120`; alpha contributes the AI-engine priority sub-list only.

---
*Generated 2026-05-17 by slot alpha, session 23c10eea. Advisory — verify every claim
against live state before acting. Memory-safe deliverable produced under a 97.4%-commit
constraint; the builds it scopes are explicitly deferred to a sub-90%-commit window.*
