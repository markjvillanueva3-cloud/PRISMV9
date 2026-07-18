---
name: reference_gnn_class_collapse_finding_2026_06_11
description: The tier-5 GNN predicts prism_cam for ALL unlabeled ghosts (class-collapse) -- concretely explains macro-F1 0.439 and reframes the label lever toward BALANCED classes
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.589Z
aliases: reference_gnn_class_collapse_finding_2026_06_11
---


**Finding (slot:india, 2026-06-11):** the tier-5 GraphSAGE/direct-embed ghost classifier has **collapsed to the majority class** -- it predicts `prism_cam` for **every** unlabeled ghost in the active-label worklist (all 31, confidence ~0.27, uncertainty ~0.73). This is the concrete mechanism behind the long-known **macro-F1 0.439** and the PSN-LEG-STATE note "spans 2/6 classes (concentrated)": the model is not discriminating, it is defaulting to the dominant labeled class (`classDistribution`: prism_cam 12 of 31 references).

**How it surfaced:** `scripts/propose-worklist-labels.mjs` (U-OLLAMA-WORKLIST-PROPOSER, commit `9371ce90e9`) ran an INDEPENDENT Ollama second opinion per ghost (qwen2.5-coder:32b reading each engine's source file-head, anti-hallucination-gated to valid dispatchers via `verifiedOffload`+`enumMember`). Result: **0/31 agree, 31 conflict** -- the GNN's `prism_cam`-for-everything matched a source-aware classifier on ZERO ghosts. Ollama's proposals are clearly more sensible (GrooveClassificationEngine->prism_turning, TurretLayoutEngine->prism_turning, PreMOUKickoffChecklistEngine->prism_business, BlastDampenerEngine->prism_safety).

**Implication for the #1 lever (reframed):** growing the reference pool needs **BALANCED labels across the under-represented classes** (prism_turning, prism_business, prism_safety, prism_data, prism_dev, prism_edm), NOT just more prism_cam. A collapsed model fed more majority-class labels stays collapsed. The proposer's CONFLICT set IS the diverse-seed candidate list -- each Ollama source-aware guess is a better label starting point than the GNN default. Triage `state/shared/nn-graph/active-label-worklist-proposed.md` (conflicts sorted first) -> seed `scripts/vault-to-gnn-refpool.mjs` with the corrected diverse labels -> re-run `scripts/nn-graph-retrain-lifecycle.mjs`.

Surfaced every india session via `ai-training-awareness.mjs` (the agree/conflict line). Consistent with [[feedback_multiseed_before_auroc_claim]] (link-pred metrics are high-variance) and [[reference_gnn_selective_deploy_2026_06_06]] (selective-deploy @ tau=0.7 is the validated production path; full-coverage lift = ref-pool growth, here shown to require CLASS-BALANCED growth). [[reference_ollama_fleet_fixes_2026_06_11]]
