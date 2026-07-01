---
name: feedback_always_check_units_vs_part_and_print
description: "Before any tooling, speed/feed, or CAM program, check inch-vs-metric against BOTH the current part/document setting AND the print callouts. JM Die works in IMPERIAL (inch). Defaulting to mm is a real bug."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.398Z
aliases: feedback_always_check_units_vs_part_and_print
---


**Standing rule (operator directive, 2026-05-30):** JM Die does **everything in IMPERIAL (inch)**, not metric. Before generating ANY tooling, tool holder, speed/feed, stock, or CAM program, **check the unit on both axes**: (1) the **current part / document setting** (Fusion `design.unitsManager.defaultLengthUnits`), and (2) the **print callouts**. Define every tool/holder dimension, stepdown, stock, and feed in the part's unit. Cross-check the two — if part-setting and print disagree, surface it, don't silently pick one.

**Why:** On the live UP-SET drive (slot:kilo, CAM-DRIVE-MS0) I built the whole tool+holder library and face program in **mm** without checking. The Fusion document was **inch** (`doc_units:"in"`). Result: the Ø50 mm cutter + Ø63.5 mm BIG-PLUS-CAT40 holder rendered oversized relative to the ~4.7″ part, and the feed stored as **384 cm/min ≈ 151 IPM — ~10× too hot** for annealed H13 (intended ~14 IPM). Operator caught it visually ("tool holder is huge relative to the part and cutter — you got confused with mm/in settings"). Unit mismatch in CAM → unsafe G-code + scrap + crashes. This is a five-sigma shop-floor surface (Ω≥0.95 / S(x)≥0.98).

**How to apply:**
1. **Query the part unit first** — for Fusion, `POST /execute` → `design.unitsManager.defaultLengthUnits` (or add `doc_units` to `/status`). Never assume.
2. **Read the print callouts** — dimensions + GD&T are stated in a unit; confirm it matches the model.
3. **Author tooling + feeds in the part's unit.** Inch shop → tools in inch (Ø2.0″ face mill, not Ø50 mm), holders inch (CAT40 flange Ø2.5″), SFM + IPM/IPR. Fusion tool JSON `"unit":"inches"`.
4. **Set Fusion CAM length/feed params with explicit unit suffixes** (`tool_feedCutting = "14 in/min"`, `maximumStepdown = "0.04 in"`) instead of relying on the mm→cm `CAM_PARAM_MAP` ×0.1 factor — that factor is mm-only and silently 10×-wrong in an inch document.
5. **Sanity-check magnitudes** against the part bounding box: a holder/cutter that dwarfs the part is the unit-mismatch tell.

JM imperial materials per [[user_shop_profile]] (H13, 4140, A2, D2, S7…). H13 annealed = ISO P, derate ~20% for hot-work ([[tip-jm-die-011]]). Pairs with [[feedback_psn_definition]] shop-floor safety tier. Domain: kilo CAM galaxy `mcp-server/src/engines/cam/`.
