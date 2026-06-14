---
name: high-roi-ai-psn-scope-2026-05-23
description: "48-unit exhaustive scope of high-ROI RAG + NN/GNN + ML + DL builds across all 11 PSN legs — planning artifact, advisory only, operator picks from this list."
aliases: reference_high_roi_ai_psn_scope_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.143Z
---


# HIGH-ROI-AI-PSN-SCOPE — 48 enumerated AI/ML/DL units across PSN (2026-05-23, slot golf)

Operator `/goal [ scope high roi builds for RAG + Neural network + GNN + Machine Learning + deep learning across the entire PSN | completed and wired to all viable nodes + synergized to PSN ]` directive triggered an exhaustive enumeration. Result lives at `state/shared/specs/HIGH-ROI-AI-PSN-SCOPE-2026-05-23.md`.

## Breakdown (48 units total, 5 tracks)

| Track | Count | Already shipped | New in this scope |
|---|---|---|---|
| A. RAG | 16 | 5 | 11 |
| B. NN/GNN | 18 | 7 | 11 |
| C. Machine Learning | 11 | 0 | 11 |
| D. Deep Learning | 10 | 0 | 10 |
| E. Cross-cutting AI infra | 7 | 0 (partial: aiReasoningDispatcher actions exist) | 7 |

## Top-10 ROI pickup order (per spec § ROI ranking)

1. **A1** finish wiki corpus pass (compounder for every other RAG unit)
2. **B8** run NN retrain with the new bridge JSONL + verify AUROC (closes session unblock)
3. **A7** LLM/cross-encoder rerank Stage-3 (spec § U-RAG-2 expected +15-30%)
4. **E1** feature store (every C/D unit assumes one)
5. **D1** llama3.2-vision wire into blueprint OCR (model is pulled and idle)
6. **C1** CAM strategy classifier (labeled JM Die data exists)
7. **B9** NN tier-4 LLM fallback (deepseek-r1:14b loaded, small wire)
8. **C8** cycle-time regressor (direct revenue impact via quote accuracy)
9. **A14** Obsidian memories index (wiki RAG works; memory vault also needs it)
10. **A8** HyDE — Hypothetical Document Embeddings (cheap, big recall boost)

## Why this matters (PSN-leg synergy)

The spec's PSN-leg matrix shows every unit touches 2-5 legs. Building any single unit feeds 2-5 downstream consumers. The cross-cutting infra (E1-E7) is the highest-multiplier set because it's a dependency for the 30+ ML/DL units. Skipping E1 (feature store) means every C/D unit re-implements feature extraction = 10× code duplication.

## Hardware tier ceiling

- RTX 4080 SUPER 16 GB (current): 35 of 48 units viable; D6/D7 LoRA + D2 large-batch CNN training blocked
- RTX 6000 Ada 48 GB (proposed): all 48 viable
- RTX 6000 Blackwell 96 GB: enables 70B-class LoRA + 405B inference for ensemble — luxury for ~5 of the 48

## How to apply

When picking the next [[feedback_golf_owns_reaper|golf-slot]] unit (or any /pick-unit call), this spec is the canonical "what's the highest-leverage AI/ML/DL work available" reference. Each row has the why/depends/blocks/PSN-legs already enumerated — operator can claim a unit by name without re-deriving the scope.

## Linked

- [[reference_gnn_node_embedding_bridge_2026_05_23]] (B6, shipped this session)
- [[reference_trainer_export_regression_2026_05_23]] (B7 follow-up doc, shipped)
- [[reference_rag_upgrade_ms0_2026_05_22]] (A1-A5 parent milestone)
- [[reference_psn_high_roi_audit_2026_05_23]] (earlier audit; this scope expands it to ML+DL)
- [[feedback_psn_definition]] (canonical 11-leg [[feedback_psn_definition|PSN definition]])
- [[feedback_do_optional_high_roi_work]] (operator standing rule — pick from this list proactively)
