---
title: Mill Cutting-Tool Reference — types, geometry, substrate (ratings + calc-feed)
type: reference
domain: mill
tags: [mill, endmill, cutting-tool, geometry, flutes, helix, corner, indexable, ball-nose, face-mill, deflection, chip-thinning, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-toolholder-connection-style-reference, mill-insert-grade-coating-selection, tooling-endmill-flute-helix-corner, tooling-selection-geometry-coating-stickout, mill-data-contents-inventory, mill-foundations]
---

# Mill Cutting-Tool Reference

> Operator directive 2026-06-12: the same comparative-ratings + interactions + **calculation-feed** lens for the **cutting tool itself** (distinct from the holder it sits in). The tool is the deepest of the geometry+coating decisions — so this page **does NOT duplicate** the existing canonical depth; it LINKS it and adds the type-level ratings + the calc-feed map: [[tooling-selection-geometry-coating-stickout]] (substrate/coating/flute/helix/L:D tables), [[tooling-endmill-flute-helix-corner]] (flute/helix/corner detail), [[mill-insert-grade-coating-selection]] (grade/coating from real catalogs).
>
> Tool-type ratings are comparative engineering *(eng.)*; counts cite the catalog corpus.

The tool is a **type × geometry × substrate** choice. Geometry + substrate are covered in the canonical above — this page owns the **type comparison** and the **calc-feed**.

## §1 — Tool TYPE comparison (ratings 1–5, 5=best)

| Type | Rigidity | MRR | Finish | Runout-sensitivity | Cost / economy | Best for |
|------|----------|-----|--------|--------------------|----------------|----------|
| **Solid carbide end mill** | 4 | 4 | 5 | 5 (high — every µm of runout shows) | 2 (scrap whole tool) | finishing, small/medium features, hard milling |
| **Indexable end mill** | 5 (steel body) | 5 | 2 | 3 | 5 (replace insert only) | roughing, large dia, high MRR |
| **Ball-nose** | 3 (thin tip) | 2 | 5 (3D contour) | 5 | 2 | 3D/5-axis surfacing, mold/die |
| **Bull-nose (corner-rad)** | 4 | 4 | 4 | 4 | 3 | roughing+semi-finish, stronger corner than square |
| **Square (flat)** | 4 | 4 | 4 (flat floors) | 4 | 3 | 2.5D pockets, slots, walls |
| **Chamfer / spot** | 5 | 2 | 4 | 3 | 4 | edge break, spot-drill, lead-in |
| **Face mill (indexable)** | 5 | 5 | 4 | 3 | 5 | flat datums, large-area stock removal |
| **High-feed mill** | 5 (low axial force) | 5 (tiny DOC, huge feed) | 3 | 3 | 4 | roughing thin-wall / long-overhang (axial-force direction) |
| **Drill-via-mill (helical)** | 4 | 3 | 3 | 4 | 3 | making holes without a drill change |

## §2 — Geometry levers (LINK canonical; here = the calc each feeds)
| Lever | Effect | Feeds calc | Canonical detail |
|-------|--------|-----------|------------------|
| **Flute count** | More flutes = more edges/rev (feed) but less chip room (gumming) | MRR / feed-per-min; chip-evac limit | [[tooling-endmill-flute-helix-corner]] |
| **Helix angle** | Higher helix = shearier cut, more axial pull-up | cutting-force direction; finish | [[tooling-endmill-flute-helix-corner]] |
| **Corner (sharp/CR/ball/chamfer)** | Corner radius strengthens + sets scallop | **surface-finish Ra** (`predictedRa()`); corner stress | [[tooling-endmill-flute-helix-corner]] |
| **Core diameter / L:D** | Sets bending stiffness (∝ D⁴, ∝ 1/L³) | **deflection** (`toolDeflection()`, L³/D⁴) | [[tooling-selection-geometry-coating-stickout]] |
| **Substrate (carbide/HSS/ceramic/CBN/PCD)** | Hardness vs toughness; sets max speed | **Taylor tool life** (C, n per material); speed ceiling | [[mill-insert-grade-coating-selection]] |

## §3 — INTERACTIONS
| Couples to | Effect |
|------------|--------|
| **Holder** | Tool shank tolerance (h6 for shrink), length, and weight set the holder's runout + balance. A long ball-nose in a long shrink holder is a deflection + chatter stack — see [[mill-toolholder-connection-style-reference]] §4/§5. |
| **Spindle** | Tool dia + flutes + target SFM set the RPM; the spindle power curve caps it at the chosen RPM. |
| **Material** | Substrate + coating must match the ISO 513 group (P/M/K/N/S/H) — wrong pick = BUE/burn, a silent scrap, not an alarm. See [[mill-insert-grade-coating-selection]]. |
| **Toolpath** | HSM/trochoidal wants high-flute + variable-helix (chatter) + small RDOC (chip-thinning); roughing wants indexable/high-feed; finishing wants ball/bull + sharp corner. |
| **Work-holding / part** | A flexible part or light fixture caps the cutting force the tool can apply → favors high-feed (low axial force) + smaller engagement. See [[mill-workholding-reference]]. |

## §4 — Feeds the calculations (the operator's intent)
- **Flutes + helix + corner + RDOC** → chip-thinning / RCTF (effective chip load below 50% radial engagement) → speed/feed solver.
- **Core dia + L:D + stickout** → deflection `toolDeflection()` (L³/D⁴) → max safe DOC/feed before the tool walks.
- **Tool dia + flutes + SFM** → RPM + MRR → cycle-time + power gate.
- **Corner radius + feed-per-tooth** → surface-finish Ra `predictedRa()` → does it meet the print callout, or add a finishing pass.
- **Substrate + coating + Vc** → Taylor C/n tool life → tool-change interval + cost-per-part.

Doctrine: the tool's geometry + substrate are the *inputs* every mill physics calc already wants — wiring them from the real catalogs (which carry diameter/flutes/corner/coating/grade for 60K+ tools, [[mill-data-contents-inventory]] §1) turns a nominal calc into a tool-specific one.

## §5 — Catalogs on hand (cite)
60K+ tool records, ~30 vendors — geometry for all, grade/coating for some (mitsubishi/helical/ingersoll/sumitomo/sandvik-2018/horn). Full vendor table + which carry what: [[mill-data-contents-inventory]] §1 + (planned) `mill-tooling-corpus-index`.

## Shop-floor tips (tribal)
- Indexable for roughing (replace a $15 insert, not a $90 tool), solid carbide for finishing (sharper, truer). *(eng.)*
- A long ball-nose deflects at the tip (thin core) — leave finish stock and take a light final pass. *(eng.)*
- High-feed mills push force AXIALLY (into the spindle, not the thin wall) — the move for long-overhang/thin-wall roughing. *(eng.)*
- Match flutes to chip room: aluminium = 2–3 flutes (huge chips), steel/stainless = 4–6 (small chips, more edges). *(eng.; detail in [[tooling-endmill-flute-helix-corner]])*

## Source data (cite)
Tool catalogs: [[mill-data-contents-inventory]] §1. Geometry/coating canonical: [[tooling-selection-geometry-coating-stickout]], [[tooling-endmill-flute-helix-corner]]. Grade/coating: [[mill-insert-grade-coating-selection]]. Physics fns: `mcp-server/src/physics/constants.ts` (`toolDeflection`, `predictedRa`, `taylorLife`). Holder counterpart: [[mill-toolholder-connection-style-reference]].
