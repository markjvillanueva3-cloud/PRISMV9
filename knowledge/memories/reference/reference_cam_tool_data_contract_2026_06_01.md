---
name: reference_cam_tool_data_contract_2026_06_01
description: "kilo↔charlie/hotel tool-data coordination — kilo built the JM tool-binder + the exact data contract; tool-aware CAM generation is BLOCKED on charlie/hotel providing JM purchased-tool data (gitignored + absent in kilo's tree)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.505Z
aliases: reference_cam_tool_data_contract_2026_06_01
---


# CAM tool-data contract kilo↔charlie/hotel (U-CAM-TOOL-DATA-CONTRACT, slot:kilo, 2026-06-01)

Operator /goal clause #5: *"utilize hotel and charlie data for jm purchased tools to write programs based off jm tools (teach the system to generate programs based off customer availability)."* Driven to a concrete contract + kilo-side consumer + cross-slot request — the **tool-side analogue of the delta Fusion coordination** ([[reference_fusion_instance_coordination_2026_06_01]]).

## The blocker (verified, R12 honest)
JM purchased-tool data is charlie/hotel-owned + **gitignored** → NOT in kilo's worktree:
- `scripts/build-vendor-catalog-db.mjs` — absent in `H:/prism-slot-kilo` (CLAUDE.md references it but it's not on this branch/tree).
- `state/shared/quoting/` (charlie source) — absent/empty here.
- `mcp-server/data/vendor-catalog-db/` — absent/empty here.
kilo **cannot materialize it alone** (R13 — don't build a consumer atop absent data; don't fabricate a tool — a made-up insert grade/holder = unsafe program).

## What kilo built (the consumer, ready)
- `scripts/lib/cam-tool-binder.mjs` (commit `378a378058`, 11/11 tests): `bindTool(recipe, toolDb, {material_iso_group})` + `bindToolsForPart(plan, toolDb)`. Matches op-family + ISO-grade; FAILS LOUD (`pending_tool_data` / `no_tool_for_family` / `bound_no_iso_grade_match` / `bound_material_pending`) — never fabricates. `TOOL_BIND_STATUS` frozen enum. Pure, no inlined constants (finish/feed suitability delegated downstream to `cutting_condition_directive`).
- `state/shared/cam-drive/CAM-TOOL-DATA-CONTRACT.md`: the exact JSON shape needed (`tools[]` with id/tcode/holder/op_families[]/insert{iso_shape,nose_radius_in,grade_iso_groups[]}), field-by-field, op_family keys = the 8 CAM-OP-TEMPLATE-MATRIX families.

## REQUEST — charlie/hotel (the unblock)
Provide `jm-turning-tools.json` in the contract shape, OR point kilo at where JM purchased-tool data actually lives (kilo will own the transform if given source path/columns). Every `no_tool_for_family`/`bound_no_iso_grade_match` kilo emits is a **customer-availability procurement signal** (destination TBD — a `PROCUREMENT-GAPS.jsonl`?). Posted to bus for charlie+hotel.

## Status of the two /goal coordination clauses
- Clause #1 (delta Fusion instance) — driven: resolver REFUSES unsafe instances; operator must give kilo a dedicated instance. [[reference_fusion_instance_coordination_2026_06_01]].
- Clause #5 (charlie/hotel tool data) — driven: contract + binder shipped; blocked on charlie/hotel data. THIS memory.

Both coordination clauses are now at concrete operator/cross-slot decision points; the entire OFFLINE CAM-lathe foundation (templates→resolver→optimization-rules→part-planner→tool-binder) is built + adversarially verified. The LIVE half (live Fusion binding + closed-loop train) remains gated on the Fusion instance decision + #43 feed-mode confirm + MCP up.
