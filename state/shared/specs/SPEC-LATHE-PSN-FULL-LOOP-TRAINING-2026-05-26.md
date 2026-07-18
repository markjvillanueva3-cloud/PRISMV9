# SPEC — Lathe PSN Full-Loop Self-Improving Training System (whiskey iter6 / 2026-05-26)

> **Status:** design spec — bootstrap orchestrator ships in same commit at
> `scripts/lathe-training-loop.mjs`. Closes the loop between the Quality
> Testing Pipeline (SPEC-LATHE-QUALITY-TESTING-PIPELINE) and the existing
> PSN substrate so every test iteration strengthens the model.
> **Slot:** whiskey · **Milestone:** WHISKEY-ACADEMY-LATHE-BRIDGE-MS0

## Purpose

Wire every PSN leg into a continuous training loop so the lathe wizard improves automatically: every program tested → corrections proposed → operator-confirmed corrections feed memory + LoRA weights + GraphSAGE features + wiki + tribal.

## PSN leg participation (all 11 legs)

| # | PSN leg | Role in the loop |
|---|---|---|
| 1 | **Obsidian brain** (`C:/Users/.../memory/*.md`) | persists per-loop findings across sessions; the operator can read the loop's history outside Claude |
| 2 | **PRISM OS** (`prism_*` dispatchers) | orchestrates the loop — `prism_lathe:run_quality_pipeline`, `prism_session:loop_tick`, `prism_memory:write_correction` |
| 3 | **Wiki** (`knowledge/wiki/**`) | curriculum stages 0-5 (iter4 spec) feed phase-1 supervised priors; new generalizations from the loop promote back to wiki |
| 4 | **Memories** (`knowledge/memories/**`) | every operator-confirmed correction → `reference_<part>_<date>.md` for future similarity retrieval |
| 5 | **Tribal** (master tribal index iter3, page records iter5) | the lookup layer the loop reads on EVERY iteration |
| 6 | **System Viz** (`/system-viz`) | renders a `ghost.lathe_training_loop` roost with live quality-score deltas per iteration |
| 7 | **Engines** (40+ `Lathe*` engines) | the consumers — `LatheAITrainingEngine`, `LatheActiveLearningEngine`, `LathePrintProgramEmitterEngine` |
| 8 | **Algorithms** (Kienzle, Taylor, stability-lobe, ...) | physics ground truth that the AI's corrections must agree with |
| 9 | **Formulas** (canonical `physics/constants.ts`) | constants the AI MUST cite (never inline) |
| 10 | **NN/GNN** (GraphSAGE tier-5) | embeds the corrected program graph; wiring-inference improves as more programs land |
| 11 | **PRISM AI** (`aiSystemRouterEngine`, Ollama offload, `PRISMCreativeReasoningEngine`) | routes the right model for each phase — Ollama for summarize/classify, Claude for synthesis |

## The loop (per JM-Die program)

```
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 1: GATHER                                            │
   │  Pull next .MIN program from JM-Die corpus (priority queue: │
   │  parts where amateur original + upgraded both have low      │
   │  quality scores from a prior loop iteration)                │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 2: PARSE  (LatheAITrainingEngine)                    │
   │  Extract tool_blocks, operation_sequence, params            │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 3: VALIDATE  (Quality Testing Pipeline — 10 stages)  │
   │  Run all 10 quality-pipeline checks → ValidationIssue[]     │
   │  + QualityScore A/B/C                                       │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 4: REASON  (PRISMCreativeReasoningEngine "optimal")  │
   │  Synthesize corrections using:                              │
   │  - Master tribal index (14 vendors, 87+ grades)             │
   │  - Course-5 academy priors (6 turning ToolTypes)            │
   │  - 186 page-anchored lathe records                          │
   │  - Tribal G-code tips (whiskey-lathe-tribal-2026-05-26)     │
   │  - JM-Die historical operator corrections (PSN Leg 4)       │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 5: GENERATE  (LathePrintProgramEmitterEngine)        │
   │  Produce corrected program version C                        │
   │  → emits new .MIN in slot/whiskey worktree (NOT in          │
   │     JM-Die archive — operator promotes after review)        │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 6: DIFF  (line-level + semantic delta)               │
   │  A → C: amateur-quality delta                               │
   │  B → C: prior-AI delta (proves whiskey-iter6 > earlier AI)  │
   │  Operator-confirmed gold-standard if available              │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 7: OPERATOR REVIEW (sync gate, NOT auto-promoted)    │
   │  Per feedback_box_programs_amateur: AI never replaces       │
   │  the operator's judgment. Reviewer = the operator on the    │
   │  shop floor. Output: accept | reject | modify               │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 8: LEARN  (3 parallel sinks)                         │
   │   8a. Memory sink — accepted correction → reference_*.md    │
   │       in PSN Leg 4 (Obsidian brain auto-feeds via Stop hook)│
   │   8b. RAG/CAG sink — Qdrant embed the (program, correction) │
   │       pair → future similarity retrieval                    │
   │   8c. LoRA sink — accumulate (input, ideal_output) pairs    │
   │       per controller dialect (Fanuc / Okuma / Haas / Mazak) │
   │       → quarterly LoRA fine-tune via train-lora skill       │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 9: EMBED  (GraphSAGE tier-5 update)                  │
   │  - Add the corrected program as a graph node                │
   │  - Edges: program → tools (insert codes) → vendor grades    │
   │  - 768-d node embedding via the U-NN-PREDICTOR-EMBED-WIRE   │
   │    bridge (closed 2026-05-23, see                           │
   │    [[reference_gnn_node_embedding_bridge_2026_05_23]])      │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 10: WIKI PROMOTE  (conditional)                      │
   │  If the correction generalizes (similar correction made     │
   │  ≥3 times across different parts/customers), Ollama          │
   │  drafts a new wiki entry; Claude synthesizes; operator      │
   │  approves before merge. Promotion path:                     │
   │    fleeting (loop output) → memory → wiki → CLAUDE.md       │
   │  per the 5-namespace schema (U-VAULT01).                    │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  STAGE 11: SYSTEM-VIZ TICK                                  │
   │  - Update ghost.lathe_training_loop iteration count         │
   │  - Render this part's A/B/C scores as colored nodes         │
   │  - Push to PSN Leg 6 render substrate                       │
   └────────────────────────┬────────────────────────────────────┘
                            ▼
                       LOOP RESTART
```

## AI-system routing per stage

| Stage | Default model | Fallback | Reason |
|---|---|---|---|
| 2 PARSE | deterministic regex (`LatheAITrainingEngine.parseProgram`) | — | no model needed — pure parser |
| 3 VALIDATE | Ollama qwen2.5-coder:7b (classify out-of-range) | rules engine | mechanical text op (per `feedback_ollama_token_routing`) |
| 4 REASON | Claude (Opus 4.7 or Sonnet 4.6) | Ollama deepseek-r1:14b | deep cross-domain synthesis — Claude territory |
| 5 GENERATE | `LathePrintProgramEmitterEngine` (template-driven) + Claude for novel cases | Ollama for boilerplate | rules engine handles 80%; Claude for edge cases |
| 8a MEMORY WRITE | Ollama summarize | — | summarization is offloaded |
| 8b RAG EMBED | Qdrant + local embeddings | OpenAI fallback if Qdrant down | local-first |
| 10 WIKI PROMOTE | Ollama drafts → Claude synthesizes | — | matches WIKI_SCHEMA Ollama-owns-≥70% |

## Self-improvement metrics (track per loop iteration)

| Metric | Source | Improvement signal |
|---|---|---|
| `avg_quality_score_C - avg_quality_score_A` | Stage 3 aggregate | should trend up over iterations (AI's corrections net-positive) |
| `operator_accept_rate` | Stage 7 | should approach 80%+ over time |
| `wiki_promotions_per_100_loops` | Stage 10 | indicates the loop is generalizing, not just memorizing |
| `lora_adapter_validation_loss` | Stage 8c (quarterly) | should decrease per LoRA epoch |
| `graphsage_AUROC` | Stage 9 (NN/GNN PSN Leg 10) | tier-5 wiring inference accuracy — currently 0.096 (dormant); target ≥0.78 |
| `time_per_loop_iter` | end-to-end | should decrease as cache warms + Ollama offload improves |

## Self-healing affordances

- **Operator stops AI promotion** if `avg_quality_score_C < avg_quality_score_B` for >5 consecutive loops (regression detected)
- **Loop pauses** if MCP server disconnects, Ollama goes offline, or Qdrant disk space fills (graceful degradation, not silent skip)
- **R12 fail-loud** at every stage — never silent-pass an invalid correction; flag + emit `LoopError` for operator triage

## Integration with /system-viz

- New roost `ghost.lathe_training_loop` (registered in `regen-viz.mjs` FAST[])
- Per-iteration nodes carry quality-score deltas + click-through to the `.MIN` diff
- Color: red (regression) / yellow (no change) / green (improvement) / gold (operator-confirmed)

## Bootstrap (iter6 ships)

| Artifact | Status |
|---|---|
| `scripts/lathe-quality-pipeline.mjs` | orchestrator skeleton — 10 stages defined, partial implementation (pure-fn stage runners stubbed for stages requiring engine imports — those are operator-build targets) |
| `scripts/lathe-quality-pipeline.test.mjs` | stage-runner unit tests |
| `scripts/lathe-training-loop.mjs` | loop driver skeleton — iter-counter + 11-stage workflow stubs |
| `state/shared/specs/SPEC-LATHE-QUALITY-TESTING-PIPELINE-2026-05-26.md` | this iter |
| `state/shared/specs/SPEC-LATHE-PSN-FULL-LOOP-TRAINING-2026-05-26.md` | this iter |

Follow-up units (this is the implementation roadmap):

| Unit | Priority | Scope |
|---|---|---|
| `U-LATHE-QUALITY-PIPELINE-DISPATCHER` | **P0** | wire `scripts/lathe-quality-pipeline.mjs` into `prism_lathe:run_quality_pipeline` |
| `U-LATHE-QUALITY-FULL-CORPUS-RUN` | **P0** | batch-run pipeline against all 15,251 JM-Die `.MIN` files; emit `lathe-quality-corpus-baseline.jsonl` |
| `U-LATHE-LOOP-STAGE-IMPL-1-TO-5` | P0 | implement stages 1-5 (parse → validate → reason → generate → diff) using existing engines |
| `U-LATHE-LOOP-STAGE-IMPL-6-TO-11` | P1 | implement stages 6-11 (operator-review → learn → embed → wiki-promote → system-viz tick) |
| `U-LATHE-LOOP-OPERATOR-UI` | P1 | shop-floor UI for stage 7 operator review (web component, `mcp-server/web/`) |
| `U-LATHE-LORA-QUARTERLY-CRON` | P2 | scheduled task that retrains the lathe LoRA from accumulated stage-8c data |
| `U-LATHE-LOOP-SYSTEM-VIZ-ROOST` | P2 | `/system-viz` `ghost.lathe_training_loop` roost generator |

## Closing the loop on operator's stated concern

Operator: *"original were amateur made and you made upgraded version for all machines in the JM fleet, we'll need to double check their quality now that we have more knowledge of lathe than before."*

This system DOES that double-check by design — the testing pipeline compares A (amateur), B (prior-AI upgraded), C (whiskey-iter6+ AI). The training loop makes the double-check self-improving so it gets better as the operator reviews each batch. The 5 prior whiskey commits (academy bridge + 14-vendor index + 186 page records + curriculum) are exactly the "more knowledge of lathe than before" that justifies the re-audit.
