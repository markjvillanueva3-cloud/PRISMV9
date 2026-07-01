---
schema: ideablock-v1
title: "Tribal-to-AI-training bridge — 4,245 tribal tips → LoRA fine-tuning → per-domain model deployment"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - CLAUDE.md §AI SYSTEM ROUTING + §NN-GRAPH + §KNOWLEDGE-CONVERSION-MS0
  - reference_tribal_coverage_audit_2026_05_18 (4245-tip corpus measurement)
  - reference_u_lima_a7_calibration + reference_u_lima_a8_transfer_priors (LoRA cadence)
  - feedback_ai_training_first_before_revenue (standing rule)
  - DOMAIN-PIPELINE-MS0 per-domain partition
extracted_via: human-authored
extracted_at: 2026-05-21T10:30:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-TRIBAL-AI-TRAINING-BRIDGE)
---

## Question

PRISM has 4,245 tribal tips + 33 canonical wiki entries + the JM-Die 76K-file corpus. How does that knowledge flow into trainable per-domain AI models — and what's the bridge gap?

## Answer (canonical — 5-stage pipeline; stages 1-3 built, stage 4-5 partial; the closed-loop is the gap)

### The standing rule (operator directive)

Per [[feedback_ai_training_first_before_revenue]]: *pre-revenue, train per-domain AI engines on the full corpus before chasing revenue features.* The tribal-to-training pipeline is the literal expression of this rule — it converts accumulated shop knowledge into model capability.

### The 5-stage tribal-to-training pipeline

| # | Stage | Built? | Engine(s) / artifact |
|---|---|---|---|
| 1 | **Knowledge capture** | ✅ | TribalCapture · ShopKnowledge · PdfLearn · VideoLearn → `tribal-tips.json` (4245 tips) + 33 wiki canonical entries |
| 2 | **Knowledge normalize + embed** | ✅ | embed-wiki-into-tribal-index.mjs · tribal-embed-index.json · KnowledgeConversionMS0 6-node-type router |
| 3 | **Training-set assembly** | ✅ partial | KnowledgeInjectionPipeline (KIP) · per-domain corpus splits (mill/lathe/wedm/cam/cad) · customer-disjoint splits (`cam_ml_split_customer_disjoint`) |
| 4 | **LoRA fine-tune** | ✅ partial | LatheLoRA cadence (8-12 engines) · CamLoRA · MillingLoRA · WedmLoRA · drift-detection + retrain trigger |
| 5 | **Deploy + serve + close loop** | ⚠️ gap | cam_serve_* (model registry, routing, canary, rollback) · OutcomeBus → retrain trigger |

### The bridge gap — closed-loop learning (#10 of the 16 deep-integration bridges)

Stages 1-3 are essentially built. The gap is **the closed loop**:

```
[Job shipped] → [OutcomeBus records actual vs predicted]
      ↓
[Drift detector: prediction error > threshold?]
      ↓ YES
[Retrain trigger: assemble incremental training set from recent outcomes]
      ↓
[LoRA fine-tune: EWC-protected incremental update]
      ↓
[Model registry: shadow → canary → active promotion (AUROC/F1/Brier gates)]
      ↓
[Next job uses the improved model]
```

Components that EXIST:
- `OutcomeBus` / `xproc_outcome_*` actions (record + query + replay)
- Drift detection: `xproc_drift_observe` + `lora_drift_record` + `lora_drift_should_retrain`
- LoRA cadence: `lathe_lora_cadence_*` (state, should-trigger, active-version)
- Model serving: `cam_serve_*` (register, route, shadow, canary, promote, rollback)
- EWC (Elastic Weight Consolidation): `xproc_ewc_*` (Fisher matrix, consolidate, regularization)

Components that are PARTIAL / unwired:
- The **trigger chain** — drift-detected → retrain-job-enqueued is not auto-firing. It's a manual `lora_drift_should_retrain` check, not a scheduled task.
- The **outcome → training-set assembly** — `xproc_outcome_replay` exists but the replay → incremental-LoRA-dataset adapter is not wired.
- The **promotion gate** — `cam_serve_promote_to_canary` / `promote_to_active` exist but the AUROC/F1/Brier gate evaluation that feeds them is research-only (see NN-GRAPH-MS2 — AUROC 0.096 pending operator retrain).

### How the 33 wiki canonical entries feed training

The pivot's 33 canonical entries are **high-quality labeled training data**:
- Each entry has a `## Question` + `## Answer (canonical)` — that's a Q→A training pair.
- Each entry cites sources + confidence — that's a provenance + calibration signal.
- Each entry's worked examples (Taylor V×T^n, chip-thinning √(D/ae), Euler-Bernoulli k=3EI/L³) are physics-grounded reference values — anti-hallucination anchors.
- The cross-reference graph (every entry links 3-10 siblings) is a knowledge-graph training signal.

The bridge: a `wiki-canonical-to-training-pairs.mjs` adapter that converts the `code-tribal/` + `architecture/` wiki leaves into a JSONL training set. Each entry → 1 primary Q/A pair + N derived pairs from the worked examples + anti-patterns. 33 entries × ~5 derived pairs = ~165 high-quality training examples, all physics-grounded.

### Per-domain training-set composition

| Domain | Tribal tips | Wiki canonical | JM-Die corpus | Recommended split |
|---|---|---|---|---|
| Mill | ~1400 | 9 machining-tactics + 4 tooling + 3 op-ordering | ~30K mill programs | 70/15/15 train/val/test, customer-disjoint |
| Lathe | ~900 | (tactical entries apply) | ~20K lathe programs | customer-disjoint per JM-Die customer |
| Wire EDM | ~600 | (tactical entries apply) | ~5K WEDM programs | smaller corpus — transfer-learn from mill |
| CAD-CAM | ~700 | 7 architecture bridges | ~15K CAD files | — |
| Cross-domain | ~645 | 2 synthesis + 1 nav | — | shared encoder |

The customer-disjoint split is critical: per [[reference_u_lima_a8_transfer_priors_2026_05_21]], cross-pipeline transfer must NOT leak a customer's part geometry between train + test, or the model overfits to customer-specific patterns.

### The transfer-priors mechanism (already shipped)

[[reference_u_lima_a7_calibration_2026_05_20]] + [[reference_u_lima_a8_transfer_priors_2026_05_21]] shipped the cross-pipeline transfer layer: cold pipelines (e.g. a new WEDM job-type) borrow discounted (0.5×) outcomes from donor-cluster siblings (mill↔lathe↔cam, cad↔knowledge). This is how a domain with a thin corpus (WEDM, 600 tips) still gets a usable model — it transfer-learns from the mill corpus.

### Build hints — closing the closed-loop gap

| Task | Effort | Detail |
|---|---|---|
| `wiki-canonical-to-training-pairs.mjs` adapter | ~100 LOC | Parse wiki frontmatter + Q/A sections → JSONL pairs |
| Outcome → incremental-dataset adapter | ~150 LOC | `xproc_outcome_replay_since` → LoRA dataset format |
| Drift → retrain scheduled task | ~80 LOC | Cron: `lora_drift_should_retrain` true → enqueue retrain job |
| Promotion-gate evaluator | ~120 LOC | AUROC + macro-F1 + Brier on held-out set → `cam_serve_promote_*` |
| End-to-end E2E test | ~200 LOC | Ship-job → outcome → drift → retrain → promote → next-job-improved |

Total: ~650 LOC of bridge code closes the closed-loop. No new models, no new training infra — just the connectors.

### Operator picks — next 3 (P0/P1)

| Priority | Task | Why FIRST |
|---|---|---|
| **P0** | `wiki-canonical-to-training-pairs.mjs` | The 33 pivot entries are the highest-quality training data PRISM has; convert them NOW while fresh |
| **P0** | Drift → retrain scheduled task | Closes the closed loop's trigger; without it, models never auto-improve |
| **P1** | Outcome → incremental-dataset adapter | Feeds the retrain job real production outcomes |

### Tie-ins (PRISM-side)

- `prism_ai` dispatcher — `xproc_*` (outcome, drift, ewc, neural, lora_drift) + `cam_serve_*`
- `prism_knowledge` dispatcher — `learn_*` + `tribal_*` + `cognitive_*`
- `tribal-embed-index.json` — embedded tribal corpus
- `KnowledgeInjectionPipeline` (KIP) — plan → inject → recordOutcome loop
- `aiSystemRouterEngine` — 3-tier routing (Claude / Ollama / per-domain LoRA)
- NN-GRAPH-MS2 — GraphSAGE wiring-inference (research-only pending AUROC gate)

### Tie-ins (tribal canonical + sibling bridges)

- [[deep-integration-bridge-pattern]] — this entry details bridge #10 (closed-loop learning) + #9 (3-tier AI)
- [[wiring-pattern-engine-to-dispatcher]] — the LoRA + outcome engines need wiring per this pattern
- [[print-to-program-pipeline-canonical]] — every pipeline stage emits outcomes that feed training
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (the 33 entries ARE training data)

## Provenance

Distilled from CLAUDE.md §AI SYSTEM ROUTING §NN-GRAPH §KNOWLEDGE-CONVERSION-MS0 + reference_tribal_coverage_audit_2026_05_18 + reference_u_lima_a7/a8 (LoRA cadence + transfer priors) + feedback_ai_training_first_before_revenue. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-TRIBAL-AI-TRAINING-BRIDGE — **34th canonical entry**, **8th bridge-class entry** of the wiki+tribal pivot phase 2C. Provides 5-stage tribal-to-training pipeline + closed-loop gap analysis + ~650-LOC build estimate.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `AI training`, `LoRA`, `fine-tune`, `closed-loop learning`, `drift detection`, `retrain trigger`, `OutcomeBus`, `model serving`, `canary promotion`, `EWC`, `transfer priors`, `training set assembly`, `tribal to training` keywords. Zero new wiring required.

## Cross-references

- [[deep-integration-bridge-pattern]] — bridge #9 + #10 detailed here
- [[wiring-pattern-engine-to-dispatcher]] · [[orphan-engine-triage-pattern]] — LoRA + outcome engine wiring
- [[print-to-program-pipeline-canonical]] — pipeline outcomes feed training
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[reference_u_lima_a7_calibration_2026_05_20]] · [[reference_u_lima_a8_transfer_priors_2026_05_21]] — LoRA cadence + transfer priors
- [[feedback_ai_training_first_before_revenue]] — standing rule this bridge serves
- [[feedback_do_optional_high_roi_work]] — standing rule
