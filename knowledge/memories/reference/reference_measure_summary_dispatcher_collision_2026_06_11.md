---
name: reference_measure_summary_dispatcher_collision_2026_06_11
description: "Pre-existing cross-dispatcher action-name collision: 'measure_summary' is in the z.enum of BOTH integrationDispatcher AND intelligenceDispatcher. Found during romeo U-WIRE-MEASURE scrutiny 2026-06-11. NOT introduced by that unit."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.654Z
aliases: reference_measure_summary_dispatcher_collision_2026_06_11
---


# Pre-existing dispatcher collision: `measure_summary` (integration vs intelligence)

**Found:** 2026-06-11, slot:romeo, during the 2-of-2 per-file scrutiny of WIRING/U-WIRE-MEASURE (the wiring-review agent's dedup pass).

**The collision:** the action token `measure_summary` appears in the `z.enum(ACTIONS)` of **two** dispatchers:
- `mcp-server/src/tools/dispatchers/integrationDispatcher.ts:80` (in `MEASURE_ACTIONS`) with a **live** `case "measure_summary":` at ~line 193 (CMM/probe health roll-up report).
- `mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts:552` (in that dispatcher's ACTIONS enum).

Two dispatchers exposing the same action name is the cross-dispatcher action-name collision class (a caller routing by action name alone is ambiguous; the MCP tool surface has two `measure_summary`).

**NOT introduced by U-WIRE-MEASURE.** Romeo's U-WIRE-MEASURE (commit `e763f5252c` on slot/romeo) wired MeasureSummaryEngine into `prism_quality` with 7 DISTINCT actions — `measure_add`, `measure_generate_summary`, `measure_get_summary`, `measure_list_summaries`, `measure_quality_trend`, `measure_parts_with_issues`, `measure_export_summary` — none of which is `measure_summary`. The collision predates that unit and lives in different files.

**Follow-up (for whoever owns integration/intelligence dispatchers — NOT a romeo-wiring unit):** decide which dispatcher OWNS `measure_summary`; the other renames (e.g. `intel_measure_summary`) or removes it. Adding an anti-regression test asserting no action token appears in >1 dispatcher enum would catch the whole class.

**Verify:** `grep -rn '"measure_summary"' mcp-server/src/tools/dispatchers/` -> 2+ hits across integrationDispatcher + intelligenceDispatcher.

Related: [[feedback_dont_wire_for_wiring_sake]] (dedup discipline) · [[feedback_romeo_commit_to_slot_branch]].
