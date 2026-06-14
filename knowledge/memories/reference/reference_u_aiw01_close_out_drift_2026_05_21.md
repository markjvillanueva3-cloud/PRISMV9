---
name: reference-u-aiw01-close-out-drift-2026-05-21
description: "U-AIW01 close-out — 10 AI Core engines confirmed MCP-exposed under alt action names (2 spec-matched, 8 alt-named); envelope+queue flipped; spec→actual mapping wiki shipped; iter 1/10 of fresh lima /loop"
aliases: reference_u_aiw01_close_out_drift_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.986Z
---


# U-AIW01 drift close-out (AI-WIRE-MS0) — 2026-05-21 lima iter 1

Fresh /loop directive: "complete all tasks and units for lima, if empty take
from other task queues or unclaimed leftover tasks". Lima queue had
1606 unknown-status entries (many bare-ID allocator placeholders).
Priority-queue surfaced 8 academy-domain pickables; AI-WIRE-MS0
(AI/Safety/Physics MCP exposure milestone, authored 2026-04-18, claimed
status `not_started`) had U-AIW01 as the most tractable entry-point.

**Drift verdict:** all 10 of U-AIW01's AI Core engines ARE wired and
MCP-exposed. They're just under different action names than the spec
proposed in 2026-04-18:

- 2/10 match spec verbatim: `ai_explain_decision`, `ai_physics_optimize`
- 8/10 wired under more precise per-engine names: `ai_capability_compute_metrics`,
  `ai_intelligence_maximize`, `ai_knowledge_query`, `ai_code_gate_pending`,
  `calc_anomaly_detection`+`calc_time_series_ml`+`calc_reinforcement_learning`,
  `ai_resource_*` family, `dev_system_recommend_engines`, `dev_auto_utilize_analyze`

Spec-rename would regress ~150 downstream references (test imports, action-
trace, DISPATCHER_DIGEST cache, history). **R7 decision:** keep actual
names, document mapping in a permanent wiki entry, flip envelope.

**Shipped:**
1. `knowledge/wiki/architecture/u-aiw01-close-out-spec-vs-actual.md` — full
   spec→actual mapping table, verification one-liners, R7 reasoning
2. `mcp-server/data/milestones/AI-WIRE-MS0.json` — status not_started → in_progress,
   completed_units 0 → 1, U-AIW01 status not_started → complete with closed_at/
   closed_by/close_out_wiki fields, milestone-level close_out_log added
3. `state/shared/slot-task-queues.json` — lima queue key 432 (U-AIW01) status
   undefined → completed with completed_at/closed_by/shipped_note

**NOT shipped (deliberate):** the other 11 units in AI-WIRE-MS0
(U-AIW02..U-AIW09, U-AIW03b/04b, U-AIW07a/07b). Each needs its own per-unit
drift audit before flipping. This entry deliberately does NOT batch-flip.

**Lesson:** the audit pattern from [[feedback_auto_close_out]] generalises
cleanly to engine-wiring milestones. The drift detector should learn to
match `engine→dispatcher reference` AS A SUFFICIENT signal for "engine is
MCP-exposed", not just `engine→spec-named action`. Spec action names get
revised during implementation; the engine-presence signal is the durable
one.

See [[reference_silent_close_out_drift_2026_05_17]] for the parent doctrine
this work closed against. See [[feedback_roadmap_close_out]] for the 4-surface
close-out protocol applied here.

Loop iter: 1/10. Next iter: audit U-AIW02 (10 spec-named schemas) — if all
10 actions are already schema-validated (highly likely given build passes),
flip with same R7 reasoning. Otherwise enumerate the missing schemas.
