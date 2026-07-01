---
name: reference_india_closed_loop_ownership_2026_05_28
description: india owns the 4 closed-loop surfaces; other slots wire IN, not the reverse
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.616Z
aliases: reference_india_closed_loop_ownership_2026_05_28
---


Per `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`, slot:india owns 4 surfaces every domain slot consumes: (1) OutcomeFeedbackBus (`prism_outcome:capture_bus_*` + `xproc_outcome_*` + `state/shared/outcome-bus.jsonl`), (2) NN-GRAPH retrain (`xproc_neural_*` + `nn-graph-retrain-lifecycle.mjs`), (3) RAG/tribal (`prism_knowledge:tribal_*` + `xproc_rag_features`), (4) calibration/conformal (`xproc_calibration_monitor_*` + `xproc_conformal_*`). Learning signal flows THROUGH india; india does NOT wire into other slots. Authority on retrain cadence / model rollout / drift thresholds. Wiki: [[architecture/ai-training-closed-loop]].
