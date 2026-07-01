---
name: reference-psn-training-substrate-2026-05-25
description: "Data-side substrate spec for R3's top-10 learning+reasoning picks. Maps each pick to concrete PRISM data sources (110K-node /system-viz, 11 PSN legs, 13 domain pipelines). New orchestrator scripts/build-psn-training-corpus.mjs walks 9 legs + emits JSONL training corpus."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.136Z
aliases: reference_psn_training_substrate_2026_05_25
---


# PSN deep-learning + deep-reasoning training substrate — papa 2026-05-25

User directive: *"add deep learning and deep reasoning training relative to the entire /system-viz, PSN and all domains and functionalities of the prism app"*.

## What was already designed (NOT what I built)

- `state/shared/specs/PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md` — **100+ specific systems** across 6 functional layers (preference-opt, self-training, PEFT, active/curriculum, continual, synthetic/distill, prompt-as-program, search-based reasoning, trajectory patterns, PoT/PAL, multi-agent, verification, domain-specific). Top-10 ranked picks. Phase ordering: 5-6 weeks for full top-10.
- [[deep-reasoning-doctrine]] — the 4-tier model ladder (L0 Ollama → L1 Haiku → L2 Sonnet → L3 Opus). Judgment-density selector. Anti-pattern: never silently de-escalate mid-task.
- [[college-courses-psn-incorporation]] — the course-corpus side (papa 2026-05-25, shipped earlier this session).

## What was missing (the gap this session closed)

R3 lists *what systems to add*. The doctrine says *when to route to which tier*. Neither says *what data goes in*. The result: every chat picking up an R3 pick has to re-derive the corpus mapping — duplicate work that [[feedback_always_capture_lessons]] is meant to prevent.

The 110K-node `system-graph.json` + the 11 PSN-leg surfaces are the highest-fidelity training corpus PRISM has. They hold provenance (commit lineage), confidence (`AtomicValue<T>`), outcomes (built/unwired/ghost), and structural relations at the level an ML pipeline needs.

## What shipped this turn

### Wiki entry — the architecture map
`knowledge/wiki/architecture/psn-deep-learning-reasoning-training-substrate.md` — comprehensive map covering:
- **Substrate layers table** — 8 data sources (structural, tribal, course corpus, outcome ledger, JM-DIE shop floor, PSN-leg state, domain pipelines, commit lineage) with volume + feature shape + readiness
- **R3 top-10 × data-source map** — for each pick, names (a) the PRISM data source, (b) the extraction step, (c) the output format the picked system consumes
- **PSN-leg-specific extractors table** — each of 11 legs gets a named extractor tool (existing or proposed)
- **Domain coverage matrix** — per-domain (mill/lathe/wedm/cad/cam/tribal/erp/post/speedfeed/print2prog/academy/database/misc) tally + suggested training pick
- **Cross-leg compounding diagram** — Replay-buffer ↔ DPO-pairs ↔ LoRA-adapter loop with feedback through CoV gate + Best-of-N rerank
- **Privacy gate**: JM-DIE outcomes are HARDCODED internal-only per [[feedback_no_public_h_drive]]

### Orchestrator script — first-pass tool
`scripts/build-psn-training-corpus.mjs` — walks `/system-viz` + 9 PSN legs (1, 3, 4, 5, 6, 7, 8, 9, 11) and emits structured JSONL training corpus per leg. CLI: `--legs 6,8,10` for subset, `--dry-run` for plan, `--out-dir` for custom path. Uses `readGraphStreaming` (the streaming-gate from this session's V8 mass-migration). Output: 9 JSONL files + `psn-corpus-manifest.json` summary.

Pure helpers (exported for testing):
- `extractGraphFeatures(graph)` — leg 6 — per-node `{node_id, layer, status, in_degree, out_degree, parent, is_ghost}`
- `extractMemoryDoctrines(memoriesDir)` — legs 1+4 — walks `knowledge/memories/{feedback,reference,project,user,patterns}/`
- `extractWikiCorpus(wikiDir)` — leg 3 — depth-bounded `.md` walk
- `extractTribalRows(tribalIndexPath)` — leg 5 — re-uses `tribal-embed-index.json` with `has_embedding` + dim
- `extractEngineFeatures(graph)` — leg 7 — engine nodes filtered from graph
- `extractAlgorithmCorpus(algorithmsDir)` — leg 8 — walks `mcp-server/src/algorithms/*.ts` + extracts docstring excerpts
- `extractFormulaCorpus(graph)` — leg 9 — formula nodes filtered from graph
- `extractPrismAiCorpus(graph)` — leg 11 — KB registry + ai-router + aireasoning-dispatcher nodes

Legs deliberately NOT included in v1:
- Leg 2 (PRISM OS) — has its own action history surface; defer to a per-action-history extractor
- Leg 10 (NN/GNN) — already produced by `scripts/lib/graphsage-train-pipeline.mjs`

### Memory pointer
This file. Plus `reference_college_courses_psn_incorporation_2026_05_25.md` (sister deliverable shipped earlier in this same session).

## Top-10 picks × cost-adjusted ROI (from R3, with my data-source annotations)

1. Claude extended-thinking on safety-critical engine paths — **1 hour, free win**
2. Plan-and-Solve wrapper on `prismCreativeReasoningEngine.explore("optimal")` — **1 day**
3. PoT + PAL via `prism_calc` — **1 day**
4. Best-of-N + ORM rerank for shop-floor outputs — **3 days**, training data: `AI_LEDGER.jsonl`
5. CoV inside `wedm_safety_gate_evaluate` — **1 day**
6. Reflexion → memory write loop — **2 days**, formalize [[feedback_always_capture_lessons]]
7. Replay buffer over slot session logs — **3 days**, data is on disk waiting
8. DSPy + Promptfoo for octopus consensus — **1 week**
9. DPO / KTO ready-to-train pipeline on JM-DIE outcomes — **2 weeks**, highest-ROI long-term
10. STaR-style bootstrap on WEDM reasoning traces — **1 month**, deepest per-domain payoff

Total ~5-6 weeks for full top-10. Picks 1-4 ship in a week of focused work.

## Cross-leg compounding (the system, not 10 disjoint picks)

```
JM-DIE outcome ledger (legs 6 + 4)
   ↓                                     ↓
DPO/KTO pairs (pick 9)              Replay buffer (pick 7)
   ↓                                     ↓
LoRA adapter (R3 §1C)               Continual training (R3 §1E)
   ↓                                     ↓
   └─→ Per-domain adapter via S-LoRA (R3 §1C) ←─┘
         ↓
       aiSystemRouterEngine routes (leg 11)
         ↓
       CoV gate (pick 5) + Best-of-N rerank (pick 4)
         ↓
       Shop-floor emit → fed back into ledger (close the loop)
```

The Replay-buffer ↔ DPO-pairs ↔ LoRA-adapter loop is the highest-ROI multi-leg compounding.

## How to apply

- Operator: `node scripts/build-psn-training-corpus.mjs --dry-run` to plan; full run produces 9 JSONL files in `state/shared/training/`.
- Future chat picking up an R3 top-10 unit: read the wiki entry's "R3 top-10 × data-source map" section to get the exact extraction step.
- Future training run: consume the JSONL via the framework named in R3 §1F (Axolotl / unsloth) — **strip JM-DIE customer/part identifiers first** per [[feedback_no_public_h_drive]].

## Related

- R3 source: `state/shared/specs/PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md`
- R1: `state/shared/specs/PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md` (25 systems)
- R2: `state/shared/specs/PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md` (50+ systems)
- [[psn-deep-learning-reasoning-training-substrate]] — the architecture map (wiki)
- [[deep-reasoning-doctrine]] — 4-tier model ladder
- [[college-courses-psn-incorporation]] — course-corpus side (sister deliverable, same session)
- [[domain-pipeline-ms0]] — 13-domain × 18-stage print-to-part lattice
- [[nn-graph-ms0]] — GraphSAGE tier-5 (the live target for replay-buffer training)
- [[feedback_psn_definition]] — 11-leg PSN map
- [[feedback_no_public_h_drive]] — JM-DIE privacy gate
