---
name: feedback_setup_extra_material_fixture_clearance
description: "When planning ANY workholding setup (vise jaws, parallels, dovetail mate-vise), ALWAYS add extra material HEIGHT (a riser) so the part's lowest finished surface sits ABOVE the fixture top (jaw lip / parallel) by a tool+holder clearance margin. Finishing the part's overall height with no clearance crashes the tool into the fixture."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.443Z
aliases: feedback_setup_extra_material_fixture_clearance
---


**Standing rule (operator directive, 2026-05-31):** When you do setups, **always plan for extra material height** to compensate for the part/stock sitting on top of the lip of the vise jaws (or a parallel), and **plan additional material to avoid fixture surfaces** — specifically the top of the jaws — when finishing the **overall height** of the part.

**Why:** If the part's lowest finished face sits *at* the fixture top (jaw lip / parallel top), the finishing tool (and its holder/shank) reaches that Z and **collides with the fixture** when machining the part to its overall height. The part must be RAISED on a riser of extra stock so the lowest cut clears the jaw top by a tool+holder margin. The riser material is sacrificial / belongs to the Op-2 (flip) region — it is gripped + provides the clearance, then removed in the second op.

**How to apply (deterministic setup rule — feeds the CAM-AI decision rules):**
1. Stock BOTTOM seats on the jaw top lip (or parallel top) — `stock_bottom_Z = fixture_top_Z`.
2. RAISE the part so `part_lowest_finished_Z = fixture_top_Z + fixture_clearance`. The gap `[fixture_top_Z, part_lowest_finished_Z]` is the **riser** (extra material, left as stock in this op).
3. `fixture_clearance` default ≈ **0.5 in** — tune to: finishing tool stickout + holder diameter clearance above the jaw top, never less than (tool_flute_reach margin). Larger for big-diameter holders / short tools.
4. Applies to **vise jaws AND parallels** (any fixture surface the tool could reach while finishing to height).
5. WCS still at **stock-bottom-center** (machine-from-table-center) — the riser is below the part, WCS Z = stock bottom = jaw top.
6. The overall-height finish pass (and side-wall finish to the parting plane) machines DOWN to `part_lowest_finished_Z`, never into the riser/jaws.

**UP SET application (this part):** jaw top lip Z=5.63"; raised part bottom to **Z=6.13"** (0.5" riser); stock Z[5.63 → 10.74+top-oversize]; WCS at (0,0,5.63). Corrected the live `UP SET - OP1 - 5AX SETUP` placement.

Pairs with [[reference_kilo_5axis_setup_sop_2026_05_30]] (the 5-axis mate-vise SOP) and [[feedback_check_units_first]]. Domain: kilo CAM galaxy + all machining slots (mill/lathe/wedm). This is a CAM-drive **decision rule** — encode it in the autonomous-replay recipe so the PRISM AI applies the riser automatically.
