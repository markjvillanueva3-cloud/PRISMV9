---
title: Mill Tooling & Cutting-Data Corpus Index (tool-on-hand → toolpath + ROI)
type: reference
domain: mill
tags: [mill, tooling, corpus, speed-feed, proven-cutting-data, tool-on-hand, roi, cost-per-part, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-data-contents-inventory, mill-cutting-tool-reference, mill-insert-grade-coating-selection, mill-machine-stack-reference, mill-foundations]
---

# Mill Tooling & Cutting-Data Corpus Index

> Operator ask 2026-06-12: *"quickly determine the best toolpath depending on the tool on hand in the shop… tooling at different price points with ROI data."* This page maps the **data we actually have** to answer that, then gives the **tool-on-hand → best-toolpath → cost-per-part** workflow. The "GOLD" here is the machine-validated proven-cutting corpus — real RPM/feed/DOC tested on physical machines, not vendor-nominal.

## §1 — Vendor tool catalogs (what's on hand to BUY/spec)
~60K+ tool records across ~30 vendors; geometry for all, **grade/coating for some** (mitsubishi/helical/ingersoll/sumitomo/sandvik-2018/horn). Full vendor table + which carry what + the STUBS: [[mill-data-contents-inventory]] §1. Grade/coating decision: [[mill-insert-grade-coating-selection]]. (These are the *price-point* axis — vendor + grade sets cost.)

## §2 — Proven cutting data (the GOLD — tool-on-hand → tested params)
**`mcp-server/src/data/user-proven-cutting-data.ts`** — a **30,812-line** corpus auto-generated from real **.hsmlib Fusion 360 tool libraries**; header: *"These are GOLD — tested on physical machines in production."* Each `ProvenCuttingRecord` (src `:11`) carries the full real cut:
- **Identity:** `machine, material, operation, sourceLibrary, toolDescription, toolType` (20 types: flat/bull/ball end mill, face_mill, drill, tap, reamer, boring_bar, chamfer/thread/slot/dovetail/lollipop/tapered mill…), `toolMaterial` (carbide/hss/ti-coated).
- **Geometry:** `diameter, shaftDiameter, fluteLength, overallLength, numberOfFlutes, cornerRadius, unit`.
- **The tested cut:** **`rpm, feedRate, plungeFeed, rampFeed`** + **`presetStepdown` (DOC), `presetStepover` (WOC)**, `coolant`.

This is THE answer to "I have *this* tool in *this* material — what RPM/feed/DOC actually works?" — it's a machine-validated starting point, strictly better than a nominal calc.

## §3 — Vendor speed-feed datasets (fallback when no proven record)
`manufacturer-speed-feed-data.ts` (828 ln) · `new-manufacturer-speed-feed-data.ts` (420) · `helical-speed-feed-data.ts` (627) · `guhring-iscar-speed-feed-data.ts` · `osg-speed-feed-data.ts` · `hypermill-speed-feed-catalog.ts`. Vendor-recommended Vc/fz by material+tool — use when the proven corpus has no record for that tool/material/op.

## §4 — JM proven programs + macros (shop-specific precedent)
`jmdie-proven-mill-programs.ts` (360 ln) · `jmdie-mill-program-index.ts` (369) · `jmdie-milling-macros.ts` (316). Real JM programs/macros — the "we ran this exact part before" precedent. (Small set — the deep JM NC archive is at `H:/PRISM/JM DIE`, accessed via `prismSelfAwarenessEngine.getJMDieCustomerPath()`, not Glob.)

## §5 — Tool-on-hand → best-toolpath → ROI workflow
1. **Inventory the magazine** — read the tool table / setup sheet: which diameters, types, materials, corner radii are physically loaded.
2. **Match to proven data** — for each (tool, material, operation), look up `user-proven-cutting-data.ts` (§2) for tested `rpm/feedRate/presetStepdown/presetStepover`. **No proven record → vendor speed-feed (§3) → physics calc** (Kienzle/Taylor, `constants.ts`) as the last resort.
3. **Pick the strategy** — per tool type + feature + material: HEM/trochoidal/adaptive/high-feed/waterline ([[mill-cutting-tool-reference]] §1 + `mill-advanced-techniques`). Constrain by the holder (runout/grip, [[mill-toolholder-connection-style-reference]]) + the machine (ways/power, [[mill-machine-stack-reference]]) + work-holding force ([[mill-workholding-reference]]).
4. **Cost-per-part (ROI)** — `cost = cycle_time × machine_rate + tooling_cost`, where `cycle_time` comes from MRR/feed (the proven feed gives the real number) and `tooling_cost = tool_price / parts_per_tool` (tool life from Taylor + the catalog price point §1). Compare options: a **cheap tool with shorter life** vs a **premium tool with longer life + higher feed** → the lower cost-per-part wins, and it flips with batch size (high volume favors the premium tool; one-off favors the cheap one).

## §6 — Feeds the calculations (the operator's intent)
- **Proven `rpm/feed/DOC/WOC` (§2)** → seed the speed/feed solver with a *machine-validated* starting point instead of a nominal Kienzle guess — then the physics refines, not invents.
- **Tool price (§1) + Taylor life** → **cost-per-part** — turns "which tool" from a gut call into a number.
- **`toolType + diameter + flutes + cornerRadius`** → the chip-thinning/deflection/Ra calcs ([[mill-cutting-tool-reference]] §4).
- Doctrine: the proven corpus is the **ground truth** a self-improving SFC should regress toward — every shipped recommendation that gets validated on the floor is a new proven record (the closed loop with india: `xproc_calibration_monitor_record`, see mill/CLAUDE.md §Closed-loop).

## Source data (cite)
`user-proven-cutting-data.ts` (30,812 ln, ProvenCuttingRecord — the GOLD) · `manufacturer-speed-feed-data.ts` (+siblings) · `jmdie-proven-mill-programs.ts` / `-index.ts` / `-milling-macros.ts` · vendor catalogs ([[mill-data-contents-inventory]] §1). Strategy: [[mill-cutting-tool-reference]]. Full surface: [[mill-data-contents-inventory]].
