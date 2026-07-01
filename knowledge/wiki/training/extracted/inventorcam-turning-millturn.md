---
type: extracted-book
source_book: "InventorCAM 2024 Turning & Mill-Turn Training Course"
author: "SolidCAM (Autodesk OEM)"
year: 2024
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter73"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/InventorCAM2024_Turning_Mill-Turn.pdf"
extraction_focus: "InventorCAM 2024 Turning + Mill-Turn — 11 turning ops, Mill-Turn module 6 advantages, 4 basic concepts, CAM-Part 6-stage definition, Trochoidal Turning, Balanced Rough, Sim Tilted Turning, multi-task vendors"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/inventorcam-turning-millturn-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_73_tips: 225
audience_slots: ["delta", "kilo", "alpha", "india", "bravo", "hotel"]
---

# InventorCAM 2024 Turning & Mill-Turn Training Course — extraction

> Twenty-fifth pass overall (iter73). Extends InventorCAM coverage from iter72 (5-axis Vol-1 milling) to turning + mill-turn. Adds 4 advanced lathe strategies (Trochoidal Turning, Balanced Rough, Sim Tilted Turning, Multi-Task machines) not covered in prior lathe iters (cl24/g76/foc14-8/hm18-005). Lathe stack now has 5 complementary tribal layers.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| ict24-001 | 11 InventorCAM Turning ops (Face/Turning/Drilling/Threading/Grooving/Angled-Grooving/Cutoff/Trochoidal/Balanced-Rough/Manual/Sim-Tilted) | LatheCorePhysics + LatheLiveToolingPlanner + LathePostGeneratorDialect + LatheTribalIntegration + CamStrategySelect + Thread |
| ict24-002 | Mill-Turn module 6 advantages (unified CoordSys/Stock/Post + multi-turret sync + regular milling env) | LatheCorePhysics + LatheLiveToolingPlanner + CamStrategySelect + PostProcessor + MachineController + WorkCoordinateSystem |
| ict24-003 | InventorCAM 4 basic concepts (Manufacturing Project + CAM-Part + Geometry + Operation) — concept hierarchy drives UI | CamStrategySelect + CADGeometry + CADFeatureRecognize + PostProcessor + OperatorOnboarding + MillExpertAdvisor |
| ict24-004 | CAM-Part 6-stage definition (Creation/Machine/CoordSys/Stock/Target/Setup) — ordered, skip-fails-downstream | CamStrategySelect + WorkCoordinateSystem + CADGeometry + PostProcessor + MachineController + WorkholdingDesign |
| ict24-005 | Trochoidal Turning — lathe HSM analog (rounded pass begin/end; 30-50% insert-life extension) | LatheCorePhysics + LatheSpeedFeedCalc + LathePostGeneratorDialect + AdaptiveFeedrate + ToolDeflection + ToolWearProgression + LatheTribalIntegration |
| ict24-006 | Balanced Rough 2-tool — Master/Slave submachines on same Table; balanced forces; multi-turret only | LatheCorePhysics + LatheLiveToolingPlanner + LathePostGeneratorDialect + PostProcessor + MachineController + AdaptiveFeedrate + ToolDeflection |
| ict24-007 | Sim Tilted Turning — round-insert + B-axis tilt for 3D-curved profiles; lathe analog of 5-axis Sim | LatheCorePhysics + LatheLiveToolingPlanner + LathePostGeneratorDialect + PostProcessor + MachineController + CamStrategySelect + CADGeometry |
| ict24-008 | Multi-task Mill-Turn vendors — DMG MORI DMU FD / Okuma MULTUS / Mazak Integrex / Nakamura / Index / Chiron | LatheCorePhysics + LatheLiveToolingPlanner + CamStrategySelect + PostProcessor + MachineController + JMDieCustomer + QuoteEstimator |

## High-leverage rules

- **Mill-Turn module > separate Mill + Turn** for multi-task machines — unified CoordSys/Stock/Post + multi-turret sync.
- **Trochoidal Turning = lathe HSM** — smooth begin/end pass reduces shock, extends insert life 30-50%.
- **Balanced Rough requires multi-turret + symmetric part** — 2× MRR via balanced forces.
- **Sim Tilted Turning needs B-axis machine** — 3D-curved lathe profiles beyond standard 2-axis reach.
- **CAM-Part 6-stage ordering matters** — skip any = downstream stage fails.

## Pipeline status after iter73

- Roost: 106 book pivots, **453 tribal tips** (was 445), 560 total nodes
- NEW BOOK: 111 → 112 books
- Cumulative iter27-73: **225 page-cited tips**
- **Key unlock**: Advanced lathe tribal — Trochoidal Turning (lathe HSM) + Balanced Rough (multi-turret) + Sim Tilted Turning (B-axis curved profiles). Lathe stack now has **5 complementary tribal layers**: cl24 programming + foc14-8 tooling/CSS/G50 + hm18-005 hyperMILL cycles + g76 threading cycle + ict24 InventorCAM advanced strategies.

## See also

- [[inventorcam-5axis-vol1]] — InventorCAM 5-Axis Vol-1 (8 tips, ic24-001..008; sibling iter72)
- [[cnccookbook-lathe-programming]] — cl24-001..008 lathe G-code programming
- [[autodesk-2014-turning]] — foc14-801..808 lathe tooling + CSS + G50
- [[hypermill-2018]] — hm18-005 hyperMILL 13 turning cycles + Rollfeed
- [[cnccookbook-g76-threading]] — g76-001..008 G76 lathe threading cycle
