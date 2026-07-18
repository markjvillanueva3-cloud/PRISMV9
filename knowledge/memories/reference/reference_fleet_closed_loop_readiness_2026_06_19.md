---
name: reference_fleet_closed_loop_readiness_2026_06_19
description: "Fleet-wide closed-loop TRAINING readiness assessment of all 9 producer galaxies (mill/lathe/wedm/cam/cad/speed-feed/post-processor/blueprint-vision/quoting) -- generate is over-built everywhere, but the loop closes on NONE because real actuals never persist/flow (slot:zulu, 2026-06-19)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.573Z
aliases: reference_fleet_closed_loop_readiness_2026_06_19
---


# Fleet closed-loop training readiness -- 9 producer galaxies (zulu, 2026-06-19)

Read-only assessment (per-galaxy Explore agents, evidence-cited) for readiness to BEGIN closed-loop training = GENERATE -> CAPTURE actuals -> TRAIN on outcomes -> CORPUS.

## SYSTEMIC ROOT CAUSE (all 9 share it)
The GENERATE half + the outcome-capture MACHINERY are over-built and dispatcher-wired everywhere, but **real ACTUALS do not PERSIST or FLOW into training on ANY galaxy**. The loop closes on NONE. This is ONE fleet-wide gap, not nine. Repeated pattern: outcome engines exist + are wired, but storage is in-memory-only / ledger dir absent / no actuals ingested / training-substrate not connected to consume them.

## Per-galaxy (verdict -- blocking gap -- owner)
- **Lathe** PARTIAL -- `LatheActualFeedbackTuningEngine` has NO ingest action wired (only read-only stats); substrate STRONGEST (`lathe-lora/train.json` 27,559 recs + real `scripts/fleet_lora_train.py` QLoRA + proven CAD smoke adapter). **CLOSEST.** owner whiskey+india
- **CAD** PARTIAL -- CAD-fidelity signals (regen/accept-reject) don't reach a LoRA retrain; `CAD_TRAINING_CORPUS.jsonl` never generated; 779 labeled pairs (thin) but fleet adapters already trained. owner delta+india
- **Mill** PARTIAL -- mill engines don't call `OutcomePublishAdapter`; `milling_lora_train` is a no-op cadence run (invokes no trainer); 533 real NC programs. owner foxtrot+india
- **Post-processor** PARTIAL -- `PostProcessorPipelineEngine` P6 doesn't auto-call `pp_outcome_emit`; corpus HUGE (160,582 NC + 13,790 .cps). owner echo+india
- **Quoting** PARTIAL -- **73,906 real closed actuals ALREADY on disk** (`state/shared/quoting/orders-closed-actuals.jsonl`, richest in fleet) but not flowing to calibration (hotel ERP creds-blocked); no cost-LoRA. owner charlie+hotel+india
- **Blueprint-vision** PARTIAL -- OCR training loop RUNS (scheduled `PRISM OCR Training Loop`) but 0 trainable rows emitted; VLM JSON dropout ~30-37%; calib n~24. owner xray+india
- **Speed-feed** NOT-READY -- actuals in-memory ring-buffer only + a fake `tryBusCapture()->true` bug (R12); 0 SFC LoRA substrate. owner oscar+india
- **CAM** NOT-READY -- `CAM-ML-CLOSEDLOOP-MS0` 0/15 shipped; outcomes in-memory only. owner kilo+india
- **WEDM** NOT-READY -- `wedm_train_lora.py` is a simulation stub; corpus 10 real examples (98% binary .mcx); print->program triple-join gap. owner mike+india

## THE ONE FLEET FIX
A shared **outcome-PERSISTENCE + outcome->dataset->`fleet_lora_train.py` backbone** (india owns the substrate), + each producer slot wires its terminal-publish-with-actuals + persistence. That single backbone closes the loop for the 6 PARTIAL galaxies at once. `fleet_lora_train.py` is the real shared trainer (proven on the CAD smoke adapter); per-domain stubs (e.g. `wedm_train_lora.py`) should be replaced by it.

## Ranked start order
lathe -> quoting (actuals already exist) -> cad -> post-processor -> mill -> blueprint-vision -> speed-feed -> cam -> wedm

## Verdict
NO galaxy is fully ready for TRUE closed-loop (predict->actual->retrain) today. 6 are one-to-two connectors away (PARTIAL); 3 need deeper work (speed-feed/cam/wedm). INITIAL supervised LoRA (the first turn) is feasible NOW for **lathe** (dataset+trainer ready), and plausibly post-processor/cad. Companion: the mill/lathe/wedm trio detail was assessed the same session.
