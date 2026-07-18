# PRISM Brain — Upgrade Inventory (2026-05-30, slot alpha)

Source: 8-agent `Workflow` sweep (`prism-brain-upgrade-sweep`, run `wf_9fa06f33-d0f`) over the
PSN 11 legs + compounding stack. 7 facet agents (compounding-amplifiers · recall-stack ·
NN/GNN · wiki-tribal · memory-governance · system-viz · fleet-propagation) → 41 raw candidates
→ **36 deduped + ranked**. Full structured data (every item's evidence/effort/deps):
[`PRISM-BRAIN-UPGRADES-2026-05-30.json`](./PRISM-BRAIN-UPGRADES-2026-05-30.json). Advisory.

## The cross-cutting finding (the meta-move)

**The brain's #1 systemic weakness is UNWIRED REFRESH PIPELINES.** Five independently-built,
tested, working refresh stacks all depend on a human to run them, so each silently rots:
1. AMP2 galaxy-synthesis refresh (`galaxy-synthesis-refresh.mjs`) — 0 wiring
2. memory-recall sidecars (`build-memory-index-sidecar.mjs` + `…embeddings…`) — 0 hook callers
3. wiki↔tribal embed+audit (`embed-all-wiki.mjs` + audits) — 0 settings.json refs
4. wiki-precheck fallback embeddings (`build-wiki-embeddings.mjs`) — unwired
5. system-viz regen floor (`regen-viz.mjs`) — only commit/Stop triggers, no time floor

**Highest-compounding single build:** ONE `brain-refresh` orchestrator (script + one throttled
Stop hook + one phase-offset scheduled task) that fans out to all five — Ollama-health-gated,
throttled, claim-coordinated — instead of five separate wires. Consolidates ranks 1/4/5/9/27.

**Second theme:** NO falsifiable quality metric anywhere — recall has no eval harness (rank 3),
the NN leg's only grade is a stale lie (rank 2), synthesis has no helped/refuted signal (rank 17).
**Third:** two proposed dashboards (rank 18 galaxy-freshness + rank 33 memory-health) should merge.

## Top 5 picks (build first)

1. **wire-amp2-refresh-to-stop-hook** (S, high) — closes the one named operational gap; clone `stop-obsidian-memory-feed.mjs`. Makes the whole COMPOUND stack self-maintaining.
2. **regrade-nn-eval-on-existing-checkpoint** (S, high, needs host run) — un-dormants PSN leg #10; `NN-EVAL.json` poolSize:0/deferred is a STALE LIE (636 ghosts provably exist).
3. **recall-eval-harness** (M, high) — the measurement substrate the recall stack lacks; unblocks 4 downstream tuning levers (precision@k / MRR / nDCG, BM25-only vs hybrid).
4. **stale-sidecar-auto-rebuild-wire** (S, high) — recall corpus stops rotting (sidecars unwired, already 2h+ stale, record-diverged 11017 vs 11021).
5. **wire-wiki-tribal-embed+audit-to-scheduled-task** (S, high) — makes the 31.5%→target coverage climb continuous (audit trails the index 3 days).

## Quick wins (S-effort, buildable-now)

ranks 1, 4, 5, 8 (durable-memory-size-watchdog), 9 (regen floor), 11 (tighten NN drift bands),
12 (tribal-index writer lock), 16 (priority-backfill worst domains), 19 (obsidian-feed telemetry),
20 (hybrid-fire telemetry), 21 (embeddings-staleness gate).

## Bigger levers

- **#3 amplifier — fleet-distributed synthesis** (rank 14, L): each of ~20 slot-Claudes synthesizes ITS galaxy in parallel (GPU-free, higher quality than the 7B B1). Requires synthesis-claim-ledger (rank 6).
- **hybrid BM25+dense master-index search** (rank 13, L): the fleet's PRIMARY search substrate is lexical-only (`has_embedding:false`); add a dense arm reusing this session's A6 int8 nomic sidecar.
- **synthesis-claim-ledger** (rank 6, M): clone `slot-task-claim.mjs`; stops N chats re-synthesizing all 35 galaxies; precondition for #3.

## Facets the 7-agent sweep did NOT cover (follow-up)

- **PRISM-AI / aiSystemRouterEngine** (PSN leg #11) — the Claude-vs-Ollama-vs-dispatcher router, unexamined for staleness/quality.
- **Algorithms + Formulas** (legs #8/#9) — no audit of whether the 120+ formulas/algorithms are discoverable/embedded in the recall corpus.
- **PRISM-OS** (leg #2) — unexamined.
- **DATA-INTEGRITY BUG (act regardless of rank):** phantom `hermes-zebra` galaxy in live `_meta_synthesis.md` (not in `SLOT_GALAXY_MAP`) — actively corrupting L2 output now; fixed by rank-7's validation gate.
- **C:→H: mirror drift** — only a dashboard row, never actually audited this session.
