---
name: reference_wedm_training_regimen_catalog_2026_05_31
description: "Master training-regimen catalog for the entire JM Die wire-EDM system (state/shared/specs/WEDM-TRAINING-REGIMENS-2026-05-31.md, 9 regimens, print->program first). Reusable ORACLE-AUGMENTATION training architecture for any scarce-data domain: deterministic engines/tables = the label oracle -> arbitrarily-large synthetic corpus; warm-start one shared adapter; RAG for live numbers"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.039Z
aliases: reference_wedm_training_regimen_catalog_2026_05_31
---


# WEDM master training-regimen catalog + oracle-augmentation architecture (slot mike, U-WEDM-TRAINING-REGIMENS, 2026-05-31)

Operator (via `/workflow`): "find and generate exhaustive training regimens utilizing all wire-edm related data including purchased stock and equipment for JM so the entire wire-edm system gets training, most important print->wire-program." Delivered a 19-agent workflow (7 discovery + 9 regimen + synthesis) → **`state/shared/specs/WEDM-TRAINING-REGIMENS-2026-05-31.{md,html}`** (68KB, executable build spec). Structure: exec-summary+architecture · **print→program (the crux, #1)** · regimens #2–8 · cross-cutting data-assembly · build-sequence (R13 dependency order) · scarcity/risk register. **Gap:** taper/UV + feasibility-gating regimens failed the schema call — backfill follow-up.

**THE REUSABLE ARCHITECTURE (any scarce-data domain — broadcast to india/whiskey/foxtrot/oscar/kilo/delta/xray/echo):**
- **Deterministic engine/table = the LABEL ORACLE.** `selectECodeFamily()`, `getShopFeed/OffsetForPass()`, `WEDMJobCostEngine`, `WEDM{Ra,Recast,HAZ,WireBreak}Predictor`, the 5 `WEDMPost*Engine` emitters are PURE FUNCTIONS → generate arbitrarily-large, label-noise-free synthetic training pairs. **This converts "scarce" (3 unique real wire programs) into "unlimited."** (R5: code answers deterministic questions.)
- **Warm-start the ONE shared adapter, never cold-start.** Every regimen continues `lora-bundle/models/wedm-lora/adapter_model.safetensors` (the 2026-05-31 trained adapter) → small-data convergence, inherited physics/safety.
- **RAG supplies live/rotting numbers; weights learn the POLICY.** Rate cards, inventory `remaining_pct`, machine envelope stay OUT of weights → a price change never forces a retrain. (R6/R12.)
- **NEW per-regimen deterministic functional gate = the real success metric** (emit vs the same oracle), not the lexical grounding screen. (R9.)
- **Name circularity loud (R12):** where the oracle both labels AND validates (recast/HAZ, cost), flag "oracle-validated NOT machine-validated."

**Print→program method (the crux):** STRUCTURED-FEATURES, not multimodal. Print (DXF/DWG/PDF) → feature card (delta/xray blueprint-vision + `EDMDrawingInterpretationEngine`) → tech-table oracle → FA-10S G-code. Pairs from the DocuStrata `blueprint-program-join-v6.jsonl` + `phase20-verified-prints.jsonl` + the genuine 3 .NC. Staged curriculum (skeleton→params→full program); validation = parses + dims-match-print + discharge-safety gate.

Builds on [[reference_wedm_lora_finetune_complete_2026_05_31]] (the warm-start adapter) + [[reference_min_is_okuma_lathe_not_wire_2026_05_31]] (clean wire data) + [[reference_program_scorer_knowledge_corpus_mismatch_2026_05_30]] (the eval). Pairs with [[feedback_ai_upgrade_broadcast_protocol]].
