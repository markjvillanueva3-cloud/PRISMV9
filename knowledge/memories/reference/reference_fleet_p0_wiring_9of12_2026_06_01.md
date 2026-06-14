---
name: reference_fleet_p0_wiring_9of12_2026_06_01
description: "FLEET-AI-SYSTEMS P0 master-brain wiring: 3/12 -> 9/12 galaxies now FEED india's closed loop. Wired via fire-and-forget recordRecommendationEmitted at each galaxy's primary dispatcher action: speed-feed(SFC-loop), cam, quote, cad, erp, post_processor. Commits d68771044b, 186997363d, 8c8b92478d. Remaining 3 (academy/system-viz/blueprint) use corpus/graph mechanisms (enumless) — separate next-iteration work."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.115Z
aliases: reference_fleet_p0_wiring_9of12_2026_06_01
---


**Shipped (slot india, 2026-06-01, FLEET-AI-SYSTEMS P0):** master-brain closed-loop adoption moved **3/12 → 9/12** with real, audit-verified, per-file-scrutinized feeds. Each gap galaxy now FEEDS india's loop via a fire-and-forget `universalFeedbackCommandEngine.recordRecommendationEmitted({domain, recommended:result, context:{action}})` at its primary recommendation/result dispatcher action (result finalized before emit; try/catch never breaks the dispatcher):

| galaxy | dispatcher · action | domain | commit |
|---|---|---|---|
| speed-feed | calcDispatcher · ultimate_speed_feed (SFC loop feed-side) | speed_feed | d68771044b |
| cam | camDispatcher · cam_strategy_recommend | cam | 186997363d |
| quoting | businessDispatcher · quote_estimate | quote | 186997363d |
| cad | cadDispatcher · feature_recognize | cad | 8c8b92478d |
| business/ERP | businessDispatcher · actual_cost_forecast | erp | 8c8b92478d |
| post-processor | ppDispatcher · pp_generate_gcode | post_processor | 8c8b92478d |
(mill/lathe/wedm were already FED via `emitP2POutcome` in their print-to-program engines.)

**Enabler (commit 186997363d, `U-ADOPT-AUDIT-DISPATCHER-FEEDS`):** the adoption audit had a dispatcher-feed blindspot — it excluded ALL `/tools/dispatchers/`, so genuine capture_bus feed CALL SITES in dispatchers were invisible. Fixed with **verb-dependent two-tier exclusion**: capture_bus CALL-verbs (call-syntax `…(`) count EVERYWHERE incl dispatchers; bare-token mechanism verbs (corpus `tribal_capture`, graph `xproc_kg_project_features`, calibration `xproc_calibration_monitor_record`) stay dispatcher+schema-excluded (they appear in action-enums as noise, e.g. the lima false-green). `VERBDEF_EXCLUDE` (always) + `NOISE_EXCLUDE` (bare-token only). 10/10 node:test.

**Remaining 3 gaps (honest, next iteration):** academy (lima), system-viz (sierra), blueprint-vision (xray) have `enumDomain:null` — NO OutcomeDomain enum value — so they CANNOT use a clean `recordRecommendationEmitted` capture_bus wire. They feed via their prescribed mechanisms: corpus (`tribal_capture {slot}` in a consumer) for academy/blueprint, graph (`xproc_kg_project_features`) for system-viz. Those are mechanism-specific builds + their domain AI is more nascent — a separate next-iteration concern, NOT a simple wire.

**Still pending for the full goal:** P2 synergy bridges (SFC↔CAM, sysviz-graph↔GNN, etc. per `FLEET-AI-SYSTEMS-ROADMAP-2026-06-01.md`) + explicit obsidian/psn/system-viz wiring + P3 GNN unification (blocked on the absent `graphsage-*` trainer + AUROC 0.096→0.78). Doctrine: india ships substrate+measurement+wiring; per-galaxy enhancement to "theoretical max" is each owning slot's ongoing work (AI-T7). Sibling: [[reference_fleet_ai_systems_roadmap_2026_06_01]] · [[reference_sfc_loop_feed_and_audit_blindspot_2026_06_01]] · [[reference_closed_loop_adoption_audit_2026_06_01]].
