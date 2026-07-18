---
name: reference_sfc_loop_feed_and_audit_blindspot_2026_06_01
description: "U-SFC-LOOP-FEED (commit d68771044b) completes U4's SFC self-improving loop: U4 wired the inference belt (consume adapters), this wires the outcome FEED (recordRecommendationEmitted domain:speed_feed at prism_calc:ultimate_speed_feed). ALSO: a genuine blindspot in closed-loop-adoption-audit.mjs — it excludes /tools/dispatchers/ so GENUINE dispatcher capture_bus feeds aren't counted (follow-up U-ADOPT-AUDIT-DISPATCHER-FEEDS)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.186Z
aliases: reference_sfc_loop_feed_and_audit_blindspot_2026_06_01
---


**Shipped (slot india, 2026-06-01, FLEET-AI-SYSTEMS; commit `d68771044b`):** the SFC self-improving loop is now CLOSED end-to-end. U4 (`U-LA1-SFC-GATE-WIRE`, 3d470ac75f) wired the **inference belt** — `prism_calc:ultimate_speed_feed` CONSUMES trained SFC LoRA adapters via `SFCInferenceGateWireEngine`. U-SFC-LOOP-FEED wires the symmetric **outcome feed** — a fire-and-forget `universalFeedbackCommandEngine.recordRecommendationEmitted({domain:"speed_feed", recommended:result, context})` right after the gate result, emitting each speed/feed recommendation to india's master-brain OutcomeCaptureBus (the signal the adapters train on). Strictly additive (result finalized before the emit; try/catch never breaks the physics response). Per-file scrutiny 2/2 PASS.

**GENUINE AUDIT BLINDSPOT found (R12, follow-up `U-ADOPT-AUDIT-DISPATCHER-FEEDS`):** `scripts/closed-loop-adoption-audit.mjs` `isExcludedPath` excludes `/tools/dispatchers/` (added to suppress the lima-class false-positive — bare action-name tokens like `tribal_capture`/`xproc_kg_project_features` appear in dispatcher action-ENUMS as noise). But this also excludes **genuine** capture_bus feed CALL SITES in dispatchers (e.g. my `recordRecommendationEmitted({domain:"speed_feed"})` in calcDispatcher, and devDispatcher's). So the audit does NOT count dispatcher-resident feeds → it still shows speed-feed as GAP even though a real feed exists. **This is a false-NEGATIVE, the honest direction (under-reports), but it should be fixed.**

**The precise fix (deferred — non-trivial change to freshly-3-of-3-scrutinized code, not safe under budget pressure):** make the dispatcher exclusion VERB-DEPENDENT. The capture_bus verbs are call-syntax (`emitP2POutcome(`, `recordRecommendationEmitted(` — end in `\(`); a match in a dispatcher is a GENUINE call. The bare-token mechanisms (corpus `tribal_capture`, graph `xproc_kg_project_features`, calibration `xproc_calibration_monitor_record`) match action-enum strings → noise in dispatchers. So: scan dispatcher files with ONLY the capture_bus call-verbs (skip the bare-token mechanism verbs there); scan non-dispatcher files with all verbs. This counts genuine dispatcher feeds while keeping the lima-class false-positive suppressed.

**Why I did NOT hack the audit to flip speed-feed→FED this session:** the audit's speed-feed row prescribes the **calibration** mechanism (per AI-TRAINING-ACCESS card). My `recordRecommendationEmitted` is a COMPLEMENTARY recommendation-outcome feed, not the prescribed calibration feed — so the audit correctly still flags speed-feed's calibration feed as a gap. Changing the audit to count my capture_bus feed for speed-feed (or removing the dispatcher exclusion) without the precise verb-dependent fix would have re-introduced the lima false-positive — that would be gaming the metric (R12 violation). Honest measurement > a green number.

Sibling: [[reference_sfc_inference_gate_wire_la1_2026_06_01]] (U4) · [[reference_closed_loop_adoption_audit_2026_06_01]] (the audit) · [[reference_fleet_ai_systems_roadmap_2026_06_01]] (the fleet plan).
