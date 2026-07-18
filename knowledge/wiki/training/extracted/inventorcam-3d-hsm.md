---
type: extracted-book
source_book: "InventorCAM 2024 HSM User Guide"
author: "SolidCAM (Autodesk OEM)"
year: 2024
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter76"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/InventorCAM2024_3D_HSM_User_Guide.pdf"
extraction_focus: "InventorCAM 2024 3D HSM — module purpose (3 pillars), 18+ strategy taxonomy, 8-stage operation definition, boundary types (drive vs constraint), 3D manual boundaries, calculate min tool length + holder clearance, retract optimization, motion control (4th/5th axis + arc approx)"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/inventorcam-3d-hsm-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_76_tips: 249
audience_slots: ["delta", "kilo", "alpha", "india", "bravo"]
---

# InventorCAM 2024 3D HSM User Guide — extraction

> Twenty-eighth pass overall (iter76). 3D HSM is the **mold/die/complex-3D** strategy layer; complements iter72 (5-axis Vol-1) + iter73 (Turning) + iter75 (Multi-Axis Drilling). InventorCAM module coverage now 4 modules.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| h3d24-001 | HSM 3 pillars — smooth toolpaths + min retracts + gouge-free | CamStrategySelect + AdaptiveFeedrate + MillExpertAdvisor + ToolDeflection + ToolWearProgression + MillChipEvacuationPredictor |
| h3d24-002 | 18+ strategy taxonomy (Constant Z / Helical / Linear / Radial / Spiral / Morphed / Offset / Boundary / Rest / Pencil / 3D Corner Offset / Prismatic / Combined) | CamStrategySelect + MillExpertAdvisor + AdaptiveFeedrate + HyperMillStrategy + CADFeatureRecognize |
| h3d24-003 | 8-stage operation definition (Strategy → Geometry → Tool → Boundaries → Passes → Links → Motion → Misc) | CamStrategySelect + CADGeometry + CADFeatureRecognize + MillExpertAdvisor + PostProcessor + MachineController |
| h3d24-004 | Drive vs Constraint boundaries; 4 auto + 4 manual + 5 3D-manual types | CamStrategySelect + CADGeometry + CADFeatureRecognize + CollisionDetection + MillExpertAdvisor |
| h3d24-005 | 5 3D manual boundaries (Selected Faces / Shallow Areas / Theoretical Rest / Tool Contact / Rest Areas) | CamStrategySelect + CADGeometry + CADFeatureRecognize + CollisionDetection + MillExpertAdvisor + ToolDeflection |
| h3d24-006 | Calculate Minimum Tool Length + Holder Clearance — automated stickout optimization (deflection L³ savings) | CamStrategySelect + ToolDeflection + CollisionDetection + MillExpertAdvisor + AdaptiveFeedrate + ToolWearProgression |
| h3d24-007 | Retract optimization — angled + arc-smoothed + no-higher-than-necessary; 20-50% air-cutting time savings | CamStrategySelect + AdaptiveFeedrate + GCodeTimeEstimator + PostProcessor + MillExpertAdvisor + CollisionDetection |
| h3d24-008 | Motion Control — 4th/5th axis + Arc Approximation (legacy controllers) + Point Interpolation | CamStrategySelect + PostProcessor + MachineController + GCodeSafetyAnalyzer + GCodeTimeEstimator |

## Pipeline status after iter76

- Roost: 109 book pivots, **477 tribal tips** (was 469), 587 total nodes
- NEW BOOK: 114 → 115 books
- Cumulative iter27-76: **249 page-cited tips**
- **Key unlock**: 3D HSM tribal — InventorCAM HSM is the third major 3D-HSM CAM tribal layer alongside Mastercam Dynamic Mill (dm14) + hyperMILL Optimised Roughing (hm18-002). 3D HSM strategy stack now has 3 first-class system tribals + the 18+ strategy taxonomy + 5-3D-boundary types + retract optimization + min-tool-length automation.

## See also

- [[inventorcam-multiaxis-drilling]] — mxd24 multi-axis sibling (iter75)
- [[inventorcam-5axis-vol1]] — ic24 5-axis sim sibling (iter72)
- [[inventorcam-turning-millturn]] — ict24 turning sibling (iter73)
- [[mastercam-dynamic-milling]] — dm14 Dynamic Mill (HSM peer)
- [[hypermill-2018]] — hm18-002 Optimised Roughing (HSM peer)
- [[autodesk-2014-3d-toolpaths]] — foc14-901..908 (3D fundamentals)
