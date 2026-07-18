# AI-Training Galaxy Access Card — self-learn / self-improve for all domain slots

> **Owner: slot:india** (galaxy `mcp-server/src/engines/ai-training/`). This card tells ANY domain slot how to wire INTO india's ai-training galaxy so its domain can **self-learn and self-improve** through the closed loop. Per `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md` + india `RULES.md` **AI-T7** (india owns the loop; others wire IN, learning signal flows THROUGH india — never roll your own retrain trigger / drift threshold / model rollout).
> Discoverable via master `MEMORY.md` `[galaxy:ai-training]` back-pointer. Source: U-PSGB-INDIA-AUDIT 2026-05-29.

## The 4 closed-loop surfaces (india produces; you feed + consume)

1. **OutcomeFeedbackBus** — publish every domain outcome as a labeled training row: `prism_outcome:capture_bus_*` or `prism_ai:xproc_outcome_publish {slot, domain}` → `state/shared/outcome-bus.jsonl`. india's models learn from YOUR results.
2. **NN-GRAPH retrain + wiring-inference** — emit features via `prism_ai:xproc_kg_project_features`; consume the GraphSAGE tier-5 classifier. india retrains every 6h and promotes a candidate→live only on deploy-gate pass (AUROC≥0.78 / macro-F1≥0.55 / Brier≤0.15).
3. **RAG / tribal corpus** — capture domain learnings via `prism_knowledge:tribal_capture {slot:<you>}`; consume prompt-augmentation via `xproc_rag_features`.
4. **Calibration + conformal** — record actuals via `prism_ai:xproc_calibration_monitor_record`; the drift-canary fires retrain candidacy at the right time.

## Per-slot self-improvement entry points (the named consumers)

| slot | domain | feed (publish) | consume |
|---|---|---|---|
| charlie | quoting | quote-vs-actual → capture_bus + calibration_monitor | calibrated quote/cost models |
| delta | cad | CAD-classifier outcomes → capture_bus | feature-recognition RAG, GNN classifications |
| echo | post-processor | post-emitted G-code prove-out outcomes (RL surface) | dialect/controller pattern models |
| foxtrot | mill | mill cut outcomes → capture_bus | mill LoRA, calibrated S/F |
| hotel | business/ERP | business KPIs / forecasts → capture_bus | forecasting + anomaly models |
| kilo | cam | toolpath outcomes → capture_bus | CAM LoRA, strategy recommender |
| lima | academy | learning/assessment outcomes → corpus | MIT-OCW RAG, curriculum models |
| mike | wedm | wire-EDM outcomes → capture_bus | WEDM LoRA, parameter models |
| oscar | speed-feed | S/F actuals → calibration_monitor | SFC RAG warm-start, calibrated coeffs |
| sierra | system-viz | the system-graph IS the NN-GRAPH input | wiring-inference ghost-node classifications |
| whiskey | lathe | turning outcomes → capture_bus | lathe LoRA, calibrated turning params |
| xray | blueprint-vision | OCR / extraction outcomes → corpus | blueprint RAG, extraction confidence calibration |

## The self-learn contract (4 steps)

1. **Read** india's `mcp-server/src/engines/ai-training/{RULES.md (AI-T1..AI-T8), KNOWLEDGE.md (wiki+tribal+action index)}`.
2. **Publish** your domain outcomes (capture_bus) so india's closed loop trains on your shop-floor/ERP/CAM/quote results.
3. **Consume** the trained models / RAG / calibrated parameters india produces — defer retrain cadence + drift thresholds + model rollout to india (AI-T7).
4. **Capture** domain tribal via `tribal_capture slot=<you>` → feeds the shared RAG corpus every slot benefits from.

_Wiring these surfaces in is what turns each domain galaxy into a self-improving loop rather than a static toolset. India is the learning substrate; your domain is the signal source + the consumer._
