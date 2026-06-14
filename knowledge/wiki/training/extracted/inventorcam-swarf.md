---
type: extracted-book
source_book: "InventorCAM 2024 SWARF Machining User Guide"
author: "SolidCAM (Autodesk OEM)"
year: 2024
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter77"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/InventorCAM2024_SWARF_Machining.pdf"
extraction_focus: "InventorCAM 2024 SWARF Machining — tool-side line contact strategy, vs traditional steep-area passes (order-of-magnitude pass-count reduction), aerospace 3-pass HSR/HSM/SWARF workflow, tool selection (tapered + flute), 5-axis HEAD machine requirement (FANUC5X_HEAD), aerospace use cases (turbine blades/impellers/blisks/structural ribs), drive faces selection, iMachining Database (machine + material + Machining Level 6)"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/inventorcam-swarf-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_77_tips: 257
audience_slots: ["delta", "kilo", "alpha", "india", "bravo"]
---

# InventorCAM 2024 SWARF Machining User Guide — extraction

> Twenty-ninth pass overall (iter77). SWARF is the **side-cutting line-contact** strategy used on aerospace ruled surfaces (turbine blades, impellers, blisks, structural ribs). Complements iter72 (5-axis Vol-1) + iter73 (Turning) + iter75 (Multi-Axis Drilling) + iter76 (3D HSM). InventorCAM module coverage now **5 modules**.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| swf24-001 | SWARF tool-side line contact — tool flute rides drive face instead of tip-poking | CamStrategySelect + AdaptiveFeedrate + MillExpertAdvisor + ToolDeflection + SurfaceFinishPredictor + GCodeTimeEstimator |
| swf24-002 | vs traditional steep-area passes — order-of-magnitude pass-count reduction (50-100→5-10) | CamStrategySelect + GCodeTimeEstimator + MillExpertAdvisor + AdaptiveFeedrate + SurfaceFinishPredictor + CADGeometry |
| swf24-003 | Aerospace 3-pass workflow — HSR rough → HSM semi-finish → SWARF finish | CamStrategySelect + MillExpertAdvisor + AdaptiveFeedrate + CADFeatureRecognize + GCodeTimeEstimator + SurfaceFinishPredictor |
| swf24-004 | Tool selection — tapered + flute length ≥ drive-face length; check Cone Geometry exactly | CamStrategySelect + ToolDeflection + MillExpertAdvisor + CollisionDetection + AdaptiveFeedrate |
| swf24-005 | 5-axis HEAD machine requirement (FANUC5X_HEAD per tutorial); table-only ≠ SWARF-capable | CamStrategySelect + PostProcessor + MachineController + CollisionDetection + WorkCoordinateSystem |
| swf24-006 | Aerospace use cases — turbine blades, impellers, blisks, structural ribs, fuel-pump impellers | CamStrategySelect + CADFeatureRecognize + MillExpertAdvisor + ToolDeflection + AdaptiveFeedrate + SurfaceFinishPredictor |
| swf24-007 | Drive faces selection — pick the actual ruled face the flute contacts, not the projection | CamStrategySelect + CADGeometry + CADFeatureRecognize + CollisionDetection + MillExpertAdvisor |
| swf24-008 | iMachining Database — Machine + Material + Machining Level (1-6) determines feed/speed | CamStrategySelect + MillExpertAdvisor + AdaptiveFeedrate + ToolWearProgression + ChipEvacuation + KienzleForceModel |

## High-leverage rules

- **SWARF only on ruled surfaces** — flute rides the rule line. Non-ruled → use 3D HSM.
- **Flute length ≥ drive-face length** — partial-contact SWARF defeats the strategy.
- **Validate 5-axis HEAD** — swivel-table machines cannot do flute-side contact on tilted ruled walls.
- **Always pair with HSR + HSM first** — SWARF is the finish pass, not a roughing strategy.
- **Machining Level 6 = aggressive** — drop to Level 3-4 on first cut + new material combo.

## Pipeline status after iter77

- Roost: 110 book pivots, **485 tribal tips** (was 477), 596 total nodes
- NEW BOOK: 115 → 116 books
- Cumulative iter27-77: **257 page-cited tips**
- **Key unlock**: 5-axis SWARF tribal — completes the aerospace ruled-surface finish-strategy layer alongside iter76 3D HSM (mold/die) + iter72 5-axis sim machining (general). 5-axis CAM strategy stack now has 3 first-class system tribals + the 8 SWARF rules.

## See also

- [[inventorcam-3d-hsm]] — h3d24 3D HSM sibling (iter76, mold/die)
- [[inventorcam-multiaxis-drilling]] — mxd24 multi-axis sibling (iter75)
- [[inventorcam-5axis-vol1]] — ic24 5-axis sim sibling (iter72)
- [[inventorcam-turning-millturn]] — ict24 turning sibling (iter73)
- [[mastercam-dynamic-milling]] — dm14 Dynamic Mill (HSR/HSM peer)
- [[hypermill-2018]] — hm18-002 Optimised Roughing (HSR peer)
