# BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-BLUEPRINT-LORA-STAGE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-BLUEPRINT-LORA-STAGE (slot:xray): link xray trainset -> india LoRA stack via the real BlueprintLoRABridgeEngine

**Commit:** `4fec77e8c169` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T13:14:52-05:00
**Tags:** blackwell-ocr-ensemble-ms0, u-xray-blueprint-lora-stage, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-BLUEPRINT-LORA-STAGE (slot:xray): link xray trainset -> india LoRA stack via the real BlueprintLoRABridgeEngine

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-BLUEPRINT-LORA-STAGE (slot:xray): link xray trainset -> india LoRA stack via the real BlueprintLoRABridgeEngine

Closes the xray->india LoRA seam (galaxies linked). scripts/lib/trainset-to-lora-pairs.mjs (8 tests): pure adapter trainset.jsonl -> LoRATrainingPair[] (trainable-only, String(value_mm), type+signals folded into context since the bridge prompt is only Print:<path> Context:<ctx>). scripts/xray-trainset-to-lora.mjs: imports the COMPILED bridge directly (no MCP) -> prepareTrainingSet(ensemble_consensus) -> exportBundle(local-lora) -> staged {prompt,completion} bundle under DEFAULT_STAGING_DIR. ZERO new engines (bridge owns anonymize/serialize/export). Fail-soft if dist unavailable. LIVE: 1 print -> 8 pairs -> staged, anonymized. The [L8/stub] graph label was STALE — bridge is real (proven by the run).

Designed via workflow wwvgyrm26 (4 discovery agents + synthesis). GO/NO-GO on a real fine-tune: NO-GO, 3 verified india-owned blockers documented in INDIA-HANDOFF-blueprint-lora.md: (1) Blackwell sm_120 but torch 2.6/cu124 kernels <=sm_90 (cuda.is_available false positive); (2) no real trainer + missing peft/datasets/trl (wedm_train_lora.py is a sim stub); (3) text/path bundle not pixels (vision LoRA needs pdfPath->VLM). Guardrails: NOT ContinualLoRAEngine (stub Math.random numerics); deploy gate Brier<=0.15 on operator_verified data NOT pseudo-labels (xray has none yet); InferenceLoRAGate is serving not quality; deploy via LoRAAdapterRegistry shadow->canary->active. R12: honest NO-GO, not a fake fine-tune.
```

## Files touched (7)
- .../lessons/ocr-closed-loop-training-ensemble-distillation.md    |  17 ++++
- scripts/lib/trainset-to-lora-pairs.mjs                           |  74 ++++++++++++++++
- scripts/lib/trainset-to-lora-pairs.test.mjs                      |  85 ++++++++++++++++++
- scripts/xray-trainset-to-lora.mjs                                | 137 +++++++++++++++++++++++++++++
- state/shared/ocr-training-loop/INDIA-HANDOFF-blueprint-lora.md   |  43 +++++++++
- state/shared/ocr-training-loop/lora-staging-summary.json         |  21 +++++
- 6 files changed, 377 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4fec77e8c169`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-OCR-ENSEMBLE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._