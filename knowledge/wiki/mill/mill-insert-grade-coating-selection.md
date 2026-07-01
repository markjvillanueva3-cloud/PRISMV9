---
title: Mill Insert Grade & Coating Selection
type: reference
domain: mill
tags: [mill, insert, grade, coating, ISO513, carbide, CBN, CVD, PVD, substrate]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-data-contents-inventory, mill-toolholder-selection, tooling-selection-geometry-coating-stickout, mill-tooling-corpus-index]
---

# Mill Insert Grade & Coating Selection

> Grounded in the PRISM tool catalogs that actually carry grade/coating data — a confirmed OPEN gap (rich data, no wiki). **Honest scope:** of ~30 extracted catalogs, **most are GEOMETRY-ONLY** (diameter/flutes/length, no grade). Grade/coating decision data lives in a *handful* of them — this page names which, and grounds the grade→material map in the one structured grade sub-catalog (Mitsubishi, 82 entries). For coating *temperature* limits + chipbreaker geometry, this page LINKS the existing canonical [[tooling-selection-geometry-coating-stickout]] rather than duplicate it.

## Which catalogs carry grade/coating (cite)
| Catalog | Grade/coating data |
|---------|--------------------|
| `mitsubishi-tool-catalog.ts` | **82-entry `MITSUBISHI_GRADES` sub-catalog** (`name, coating_type, application`) — src `:40,:47` — the only structured grade table |
| `helical-tool-catalog.ts` (6,007 rec) | per-tool `coating` + `application` (e.g. `ZrN (ZPLUS)` / aluminum) — best per-tool coating coverage |
| `ingersoll-tool-catalog.ts` (3,169) | tool `material` + `coating`; insert `application` |
| `sumitomo-tool-catalog.ts` (7,616) | per-tool `grade` (e.g. `ACT100`) |
| `sandvik-2018-rotating-catalog.ts` (10,686) | `grade` + `materialApplication` (e.g. `KC7325`/cast_iron) — *header note: actually Kennametal Master 2018* |
| `horn-tool-catalog.ts` (198) | `grades` array (e.g. `MG12, TI25, TH35`) |
| **Geometry-only (NO grade):** | osg, iscar, guhring, accupro, seco, kennametal-milling/holemaking, ma-ford, korloy, dormer-pramet |

## §1 — ISO 513 application categories (the spine)
The `application` field in every grade catalog maps to ISO 513's six material groups. Match the *workpiece* to the group, then pick a grade whose `application` matches:

| ISO | Colour | Material | Mitsubishi grade examples (src: `mitsubishi-tool-catalog.ts`) |
|-----|--------|----------|------------------------------------------------------------|
| **P** | blue | Steel (low/alloy) | `MC6015`/`MC6025`/`MC6035` (CVD, "Steel turning") |
| **M** | yellow | Stainless / duplex | (PVD multilayer grades — query `application:"stainless"`) |
| **K** | red | Cast iron | `MC5005`/`MC5015` (CVD, "Cast iron turning"); `HTi10` (Uncoated, "Cast iron/non-ferrous") |
| **N** | green | Non-ferrous (Al, brass, Cu) | `HTi10`/`HTi20` (Uncoated); helical `ZrN`/aluminum |
| **S** | brown | Superalloys / Ti | (PVD AlTiN grades — heat-resistant) |
| **H** | grey | Hardened steel ≥48 HRC | `BC8100`/`MB8100` family (**CBN**, "Hardened steel") |

Group letters/colours are ISO 513 standard (textbook); the grade→group rows are real records from `mitsubishi-tool-catalog.ts`.

## §2 — Substrate × coating (what the data shows)
The Mitsubishi `coating_type` field resolves to four real families (src: `mitsubishi-tool-catalog.ts:48-79`):

| coating_type in data | Where it wins (per the `application` field) | Why |
|----------------------|---------------------------------------------|-----|
| **Uncoated carbide** (`HTi10/20`) | Cast iron / non-ferrous | Sharp edge, no coating drag; aluminum welds to coated edges |
| **PVD** (`AP25N`, `DP1020`) | General purpose, drilling | Thin, tough, sharp — interrupted cuts, smaller tools, lower temp |
| **CVD** (`MC5005`, `MC6015`) | Cast iron + steel turning | Thicker, more wear-resistant — continuous cuts, higher speed/heat |
| **CBN** (`BC8100`, `MB8100`) | Hardened steel (H) | Second-hardest material — hard-milling ≥48 HRC where carbide burns |

Decision shortcut: **coating thickness tracks heat.** PVD (thin) for interrupted/low-heat/small tools; CVD (thick) for continuous/high-heat; uncoated for aluminum/non-ferrous; CBN for hardened. Coating *temperature ceilings* (AlTiN/AlCrN/TiAlN/TiCN limits) are tabulated in [[tooling-selection-geometry-coating-stickout]] — use that table for the exact ceiling, this page for the material→family map.

## §3 — "Find a grade for this material" workflow
1. Classify the workpiece into an ISO 513 group (P/M/K/N/S/H).
2. Grep the grade catalogs for that application: `grep -i "Hardened steel" mitsubishi-tool-catalog.ts` → CBN family; `grep -i "aluminum" helical-tool-catalog.ts` → ZrN-coated.
3. For *milling* inserts specifically, cross-check geometry in the milling catalogs (kennametal-milling, iscar, seco — geometry-only, so pick the geometry there and the grade from a grade-carrying catalog).
4. Validate the pick against `prism_safety:validate_physics` (the grade doesn't change the spindle-power gate, but a wrong N-vs-K coating choice causes BUE → finish failure, not an alarm — it's a silent scrap risk).

## Shop-floor tips (tribal)
- **Never run a TiAlN/AlTiN-coated edge on aluminum** — aluminum welds to the coating (BUE); use uncoated or ZrN/DLC. (src: helical `ZrN`/aluminum records + canonical coating table)
- CBN is for *hardened* steel (≥~48 HRC) — on soft steel it chips; that's what the `BC8100`/`application:"Hardened steel"` rows mean. (src: `mitsubishi-tool-catalog.ts`)
- PVD for interrupted cuts and small tools (toughness); CVD for long continuous high-heat cuts (wear). (src: Mitsubishi coating_type→application)
- Most of the 60K-record catalog corpus is **geometry-only** — don't assume a tool has a documented grade; only mitsubishi/helical/ingersoll/sumitomo/sandvik-2018/horn carry it. (src: [[mill-data-contents-inventory]] §1)
- `insert_grade_selection` / `coating_selection` cited tips (~5) live in `tribal-tips/milling-pdf-cited-tips.ts` — query that bucket for Sandvik/Kennametal vendor specifics.

## Source data (cite)
`mitsubishi-tool-catalog.ts` (82 grades) · `helical-tool-catalog.ts` (coating/application) · `ingersoll-tool-catalog.ts` · `sumitomo-tool-catalog.ts` · `sandvik-2018-rotating-catalog.ts` · `horn-tool-catalog.ts` · `tribal-tips/milling-pdf-cited-tips.ts`. Coating-temp + geometry: [[tooling-selection-geometry-coating-stickout]]. Full surface: [[mill-data-contents-inventory]] §1.
