---
title: PSN Deep-Learning + Deep-Reasoning training substrate
created: 2026-05-25
slot: papa
related:
  - [[deep-reasoning-doctrine]]
  - [[feedback_psn_definition]]
  - [[college-courses-psn-incorporation]]
  - [[nn-graph-ms0]]
status: built
---

# PSN Deep-Learning + Deep-Reasoning training substrate

The data-side companion to **R3** (`state/shared/specs/PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md`). R3 inventoried 100+ specific learning + reasoning systems across 6 functional layers and named the top-10 picks; this entry maps each pick to the **concrete PRISM data sources** that feed it, so any training run can extract its features straight from `/system-viz` + the 11 PSN legs + the domain pipelines without re-deriving the corpus.

The directive: *"add deep learning and deep reasoning training relative to the entire /system-viz, PSN and all domains and functionalities of the prism app"*. Treat this entry as the single point of entry for any future training-substrate work.

## Why this entry exists (the gap it closes)

R3 lists what systems to add. `deep-reasoning-doctrine` says when to route to Opus vs Sonnet vs Haiku vs Ollama. Neither says **what data goes in**. The result: every chat that picks up an R3 pick has to re-derive the corpus mapping — exactly the duplicate-work pattern [[feedback_always_capture_lessons]] and [[feedback_reflect_all_changes_post_update]] are meant to prevent.

The 110K-node `system-graph.json` + the 11 PSN-leg surfaces are the highest-fidelity training corpus PRISM has — they hold provenance (commit lineage), confidence (`AtomicValue<T>`), outcomes (built/unwired/ghost), and structural relations (188 course→algorithm edges, 667 engine-import edges, 1810 hook-bridge edges) at the same level of detail an ML pipeline needs.

## The substrate layers

| Layer | Source | Volume | Feature shape | Ready? |
|---|---|---|---|---|
| **Structural** | `state/shared/system-viz/system-graph.json` (110K nodes / 250K+ edges) | 546 MB | Node IDs, layers L1-L11, status (built/ghost/stub), parent/child, contains edges | ✅ live (post-fix) |
| **Tribal** | `state/shared/tribal-embed-index.json` (12K+ entries) | ~40 MB | id, source, domain, title, 768-d embedding | ✅ live |
| **Course corpus** | `knowledge/wiki/architecture/courses/` (220 entries) + 7 algorithm primitives | ~5 MB | Course → algorithm → composition edges | ✅ via [[college-courses-psn-incorporation]] |
| **Outcome ledger** | `state/shared/AI_LEDGER.jsonl`, `state/shared/error-pattern-ledger.jsonl`, slot session logs | growing | (task, outcome=shipped/aborted, slot, ms-id) | ✅ live |
| **JM-DIE shop floor** | `H:/PRISM/JM DIE/` (147,717 files, 130+ customers) | 58.5 GB | (part, program, blueprint, recast, outcome) | ✅ live but **NOT publishable** ([[feedback_no_public_h_drive]]) |
| **PSN-leg state** | per-leg surfaces — Obsidian vault, wiki, memories, tribal, NN/GNN eval, system-viz, engines, algorithms, formulas, PRISM AI | varies | Leg-specific schema (see §3 below) | ✅ live |
| **Domain pipelines** | `state/shared/specs/DOMAIN-PIPELINE-MS0.md` — 18-stage print-to-part × 13 domains | dense | per-stage feature vector + outcome | ✅ live via `DomainPipelineEngine` |
| **Commit lineage** | `git log` + `MILESTONE_PROGRESS.json` | dense | (commit-sha, ms-id, units-shipped, slot) | ✅ live |

## R3 top-10 picks × data-source map

For each R3 pick, name (a) the PRISM data source, (b) the extraction step, (c) the output format the picked system consumes.

### Pick 1 — Claude extended-thinking on safety-critical engine paths
- **Data source**: nothing new — this is an inference-time flag, not training.
- **Extraction step**: identify the engine-action pairs whose `mcp-server/src/schemas/` Zod schema is tagged `safety_tier: shop_floor`. Walk the action registry to enumerate them.
- **Output**: a list of `{dispatcher, action}` tuples for which the prompt-builder should set `thinking: { type: "enabled", budget_tokens: N }`.
- **Effort**: 1 hour. **Free-win** (already on Claude; flag exists; not enabled per-engine).

### Pick 2 — Plan-and-Solve wrapper on `prismCreativeReasoningEngine.explore("optimal")`
- **Data source**: existing `PRISMCreativeReasoningEngine` outputs — `solutions[]`, `hybridCombinations[]`, `novelInsights[]`, `recommendedSolution`.
- **Extraction step**: prepend a 2-line plan to every `explore("optimal")` call. Plan template: *"For domain={domain}, decompose into (a) constraint enumeration, (b) candidate generation, (c) trade-off ranking. Then solve."*
- **Output**: same `ExplorationResult` schema with `plan: string` added.
- **Effort**: 1 day. Closes the "explore optimal sometimes wanders" pattern.

### Pick 3 — PoT + PAL via `prism_calc`
- **Data source**: every action under `prism_calc` (the 60+ physics-calculation routes).
- **Extraction step**: when an engine reasoning chain needs a numerical answer, emit a `prism_calc:<action>` invocation instead of letting the LLM do arithmetic in-prompt. Pair with a verifier prompt that re-checks the answer.
- **Output**: structured `{ action, params, value, confidence, source }` rather than free-text math.
- **Effort**: 1 day. Drop-in for `WEDMOnlineLearningEngine` + any other engine doing in-prompt arithmetic.

### Pick 4 — Best-of-N + ORM rerank for shop-floor outputs
- **Data source**: any safety-critical emit (G-code, post-processor output, recast-budget approval).
- **Extraction step**: sample N=5-10 outputs, score each with an Outcome Reward Model trained on JM-DIE ledger `(emit, shipped-to-floor=1, aborted=0)` pairs.
- **Output**: ranked emits; ship highest-scoring.
- **Training data for the ORM**: `AI_LEDGER.jsonl` filtered to `domain ∈ {mill, lathe, wedm}` with `outcome ∈ {shipped, aborted}`.
- **Effort**: 3 days.

### Pick 5 — Chain-of-Verification (CoV) inside `wedm_safety_gate_evaluate`
- **Data source**: `wedm_safety_gate_evaluate` current output (`{ score, gates, recast_budget, ... }`).
- **Extraction step**: after the gate emits a verdict, generate 3-5 verification questions (recast bound respected? feed/speed within Taylor envelope? skim count plausible?), answer them, revise.
- **Output**: same gate verdict + `verification: { questions[], answers[], revised: bool }`.
- **Effort**: 1 day. R2 carryover.

### Pick 6 — Reflexion → memory write loop
- **Data source**: every chat's per-slot handoff (`state/shared/handoffs/HANDOFF-*-*.md`) + `error-pattern-ledger.jsonl`.
- **Extraction step**: at Stop, the auto-memory hook already feeds Obsidian ([[feedback_auto_memory_feeds_obsidian_stophook]]). Add a Reflexion pass: *"What surprised you this session? What would you do differently?"* → write to `knowledge/memories/feedback/feedback_<topic>.md`.
- **Output**: structured `Reflexion[]` entries with `(situation, surprise, lesson, action_next_time)`.
- **Effort**: 2 days. R2 carryover. Formalizes [[feedback_always_capture_lessons]].

### Pick 7 — Replay buffer over slot session logs
- **Data source**: per-slot session transcripts (`C:\Users\wompu\.claude\projects\H--prism\*.jsonl`).
- **Extraction step**: walk per-session JSONL, extract (prompt, tool-calls, result, outcome) tuples. Index in a Qdrant collection with provenance.
- **Output**: sampleable replay buffer; new training runs interleave old + new examples to avoid catastrophic forgetting.
- **Effort**: 3 days. The data is sitting on disk waiting to be loaded.

### Pick 8 — DSPy + Promptfoo for octopus consensus
- **Data source**: octopus 5-voice prompt templates + scrutiny ledger (`mcp-server/data/state/SCRUTINY_LEDGER.json`).
- **Extraction step**: rewrite each voice as a DSPy `Signature`. Use `BootstrapFewShot` to auto-optimize on the 3-of-3 PASS/FAIL ledger.
- **Output**: optimized prompts per voice; measurable lift on scrutiny PASS rate.
- **Effort**: 1 week. R2 carryover.

### Pick 9 — DPO / KTO ready-to-train pipeline on JM-DIE outcomes
- **Data source**: `AI_LEDGER.jsonl` + JM-DIE program ledger.
- **Extraction step**: for KTO (cheaper) — emit `{prompt, completion, label: shipped_or_aborted}` JSONL. For DPO (richer) — pair `(prompt, accepted_completion, rejected_completion)` from co-located emits.
- **Output**: `state/shared/training/prism-kto-dataset.jsonl` + `state/shared/training/prism-dpo-pairs.jsonl`. **NOT publishable** — strips customer names + part numbers per [[feedback_no_public_h_drive]].
- **Training framework**: Axolotl or unsloth for actual training run (R3 §1F).
- **Effort**: 2 weeks. The single highest-ROI pick because it converts shop-floor outcomes directly into model weights.

### Pick 10 — STaR-style bootstrap on WEDM reasoning traces
- **Data source**: `WEDMOnlineLearningEngine` + WEDM safety-gate ledger + `kb-wedm-tribal-tips`.
- **Extraction step**: prompt the model to generate reasoning traces for known-good WEDM-emit examples. Filter to traces that arrive at the correct (already-known) answer. Fine-tune on those.
- **Output**: `state/shared/training/wedm-star-traces.jsonl`.
- **Effort**: 1 month. The hardest pick (large compute + careful trace filtering) but the deepest payoff for one domain.

## PSN-leg-specific extractors

Each of the 11 PSN legs is a discrete source of training signal:

| Leg | What it provides | Extractor tool (existing or proposed) |
|---|---|---|
| #1 Obsidian brain | Cross-session doctrines, regression fixes | `scripts/extract-obsidian-doctrines.mjs` (proposed) — walks `knowledge/memories/feedback/*.md` and emits `(rule, why, how_to_apply)` triples |
| #2 PRISM OS | 45 `prism_operating_system:*` actions with outcome history | `scripts/extract-prism-os-action-history.mjs` (proposed) — walks AI_LEDGER for `prism_operating_system:*` entries |
| #3 Wiki | 23K+ wiki entries + 188 course-outgoing edges | `scripts/extract-wiki-corpus.mjs` (proposed) — already partial in `embed-wiki-into-tribal-index.mjs` |
| #4 Memories | 487 memo files | `scripts/extract-memory-doctrines.mjs` (proposed) — like Obsidian-doctrines but for reference memos |
| #5 Tribal | 12K tribal-embed-index entries with 768-d vectors | `scripts/extract-tribal-features.mjs` (proposed) — re-uses tribal-embed-index format |
| #6 System Viz | 110K-node graph with structural features | `scripts/extract-graph-features.mjs` (proposed) — emits `{node_id, layer, status, in_degree, out_degree, parent, contains_count, bridges_count}` |
| #7 Engines | 2,763 engines built + 593 unwired | `scripts/extract-engine-features.mjs` (proposed) — Walks ENGINE_DIGEST + dispatcher coverage + utilization-dashboard |
| #8 Algorithms | 53+ pure-numerical primitives in `src/algorithms/` | `scripts/extract-algorithm-corpus.mjs` (proposed) — walks `src/algorithms/*.ts` for `Algorithm<I,O>` interface + tests |
| #9 Formulas | 499 formula registry entries | `scripts/extract-formula-corpus.mjs` (proposed) — walks FormulaRegistry + constants.ts |
| #10 NN/GNN | GraphSAGE tier-5 wiring-inference + 768-d embeddings | `scripts/lib/graphsage-train-pipeline.mjs` (exists) |
| #11 PRISM AI | KB registry + 7 PRISM-AI engines + aiSystemRouterEngine routing log | `scripts/extract-prism-ai-routing-history.mjs` (proposed) — walks `ollama-offload-stats.json` + ai-router decision log |

A unified `scripts/build-psn-training-corpus.mjs` (ship-now candidate) **orchestrates** these extractors per the user's directive — *"relative to the entire /system-viz, PSN and all domains"*.

## Domain coverage matrix

R3's top-10 implicitly assumes the domain mapping from [[domain-pipeline-ms0]] (mill / lathe / wedm / cad / cam / tribal / erp / post / speedfeed / print2prog / academy / database / misc). The training substrate **must cover every domain**, not just the high-touch ones. Per-domain training-data tally (from live graph query):

| Domain | Engines | Tribal tips | Wiki entries | Outcome ledger entries | Suggested training pick |
|---|---:|---:|---:|---:|---|
| mill | ~280 | ~900 | ~150 | varies | DPO on speed/feed emits (pick 9) |
| lathe | ~190 | ~500 | ~95 | varies | DPO + STaR on G-code emits (pick 9 + 10) |
| wedm | ~145 | ~440 | ~85 | dense | STaR on safety-gate traces (pick 10) |
| cad | ~74 | ~150 | ~60 | sparse | PoT/PAL for tolerance reasoning (pick 3) |
| cam | ~68 | ~280 | ~50 | dense | Best-of-N + ORM on toolpath emits (pick 4) |
| tribal | n/a | 3919 | n/a | n/a | Self-Instruct expansion: 3919 → 30K+ training pairs (R3 §1B) |
| erp | ~42 | ~50 | ~25 | dense | Plan-and-Solve on quote/job routing (pick 2) |
| post | ~20 | ~30 | ~15 | dense | DPO on post-processor diff (pick 9) |
| speedfeed | ~6 | ~40 | ~10 | dense | Replay buffer (pick 7) for tool-life convergence |
| print2prog | ~9 | ~10 | ~5 | n/a (early) | CoV inside output validation (pick 5) |
| academy | n/a | n/a | 17 | n/a | Curriculum-learning rollouts (R3 §1D) |
| database | n/a | n/a | n/a | n/a | n/a — non-training |
| misc | n/a | n/a | n/a | n/a | per-task triage |

## Cross-leg compounding

The interlock that turns this into a *system* rather than 10 disjoint picks:

```
JM-DIE outcome ledger (PSN #6 + #4)
   ↓                                     ↓
DPO/KTO pairs (R3 pick 9)            Replay buffer (R3 pick 7)
   ↓                                     ↓
LoRA adapter (R3 §1C, MoLE shape)    Continual training rounds (R3 §1E)
   ↓                                     ↓
   └─→ Per-domain adapter served via S-LoRA (R3 §1C) ←─┘
         ↓
       Inference path: route via aiSystemRouterEngine (PSN #11)
         ↓
       Output enters CoV gate (R3 pick 5) + Best-of-N rerank (R3 pick 4)
         ↓
       Shop-floor emit (JM-DIE outcome → fed back into ledger)
         ↓
       (close the loop — REST-EM at the model level)
```

The Replay-buffer ↔ DPO-pairs ↔ LoRA-adapter loop is the **highest-ROI multi-leg compounding** in PRISM. Every other pick is a refinement on top.

## What ships with this entry

1. **This wiki entry** — the architecture map (`knowledge/wiki/architecture/psn-deep-learning-reasoning-training-substrate.md`).
2. **`scripts/build-psn-training-corpus.mjs`** — first-pass orchestrator. Walks `/system-viz` + 11 PSN legs + domain pipelines, emits structured JSONL training corpus (skeleton — full per-leg extractors are deferred per-leg units).
3. **Memory pointer** — `reference_psn_training_substrate_2026_05_25.md`.

## What's deliberately out of scope

- **Actual training runs** — those need ≥1 GPU sustained (currently used by NIM endpoints) + curated labeled data + an MLOps pipeline. PRISM is pre-training-infra; R3's effort estimates (5-6 weeks for top-10) are the minimum.
- **MoLE / S-LoRA production serving** — R3 names these as L-cost (large); gated on per-domain adapters existing first.
- **MCTS + LLM full o1-pattern reasoning** — R3 names as L-cost; gated on having a reward model + reasoning eval corpus.
- **Lean / Coq / Isabelle formal verification** — R3 names as L-cost; relevant when Ω/S(x) become contractual, not now.

## See also

- `state/shared/specs/PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md` — the original R3 research (read this first)
- `state/shared/specs/PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md` — R1 (25 systems)
- `state/shared/specs/PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md` — R2 (50+ systems)
- [[deep-reasoning-doctrine]] — the 4-tier model ladder (when to route to Opus vs Sonnet vs Haiku vs Ollama)
- [[college-courses-psn-incorporation]] — the course-corpus side (ships separately this session)
- [[domain-pipeline-ms0]] — the 13-domain × 18-stage print-to-part lattice
- [[nn-graph-ms0]] — GraphSAGE tier-5 wiring inference (the live target for replay-buffer training)
- [[feedback_psn_definition]] — canonical 11-leg PSN map
- [[feedback_always_capture_lessons]] — Reflexion anchor (pick 6)
- `scripts/lib/graph-io.mjs` — streaming reader/writer used by the corpus orchestrator
