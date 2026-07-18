---
type: extracted-book
source_book: "InventorCAM 2024 Application Tutorial - 5X Basic Training Vol. 1"
author: "SolidCAM (Autodesk OEM)"
year: 2023
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter72"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/InventorCAM2024_5-Axis_Basic_Training_Vol-1.pdf"
extraction_focus: "InventorCAM 2024 — 9-strategy spectrum, post/sim file mgmt, 3 5-axis kinematic types, ABC rotary nomenclature, 5-axis CoordSys alignment, Sim-5-Axis POS1-only restriction, surface-vs-mesh tolerance, 3 area-machining types"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/inventorcam-5axis-vol1-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_72_tips: 217
audience_slots: ["delta", "kilo", "alpha", "india", "bravo", "hotel"]
---

# InventorCAM 2024 5-Axis Basic Training Vol-1 — extraction

> Twenty-fourth pass overall (iter72). Adds **InventorCAM** (Autodesk Inventor's integrated CAM — third major CAM system after Mastercam + hyperMILL). Also closes the **5-axis** strategy gap (previously partially covered by hm18-001 hyperMILL 3D + cl24-001 lathe-axis context). 5-axis Sim machining is the most advanced strategy in PRISM's CAM stack.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| ic24-001 | InventorCAM 9-strategy spectrum (iMachining 2D/3D + 2.5D + Indexial Multi-Sided + HSS + 3D HSM + Sim 5-Axis + Turning + Mill-Turn + Swiss) | CamStrategySelect + MillExpertAdvisor + CADFeatureRecognize + PostProcessor + HyperMillStrategy |
| ic24-002 | Post + machine-sim file management — separate folders C:/GPP + C:/Machine_Sim survive upgrades | PostProcessor + MachineController + CamStrategySelect + JMDieCustomer + ShopFloorTraining |
| ic24-003 | 5-axis machine kinematics — Table-Table / Head-Head / Head-Table (DMU 100 / Mazak Variaxis / Makino A) | CamStrategySelect + PostProcessor + MachineController + CollisionDetection + MillExpertAdvisor |
| ic24-004 | Rotary axis nomenclature — A=around X / B=around Y / C=around Z (industry standard) | PostProcessor + MachineController + CamStrategySelect + GCodeSafetyAnalyzer + CollisionDetection |
| ic24-005 | 5-Axis CoordSys aligned to machine axes — X must be axis of revolution for X-rotary; #1 5-axis programmer error | WorkCoordinateSystem + PostProcessor + MachineController + CollisionDetection + CamStrategySelect + CADGeometry |
| ic24-006 | Sim 5-Axis POS1-only restriction — separate MAC# for multi-setup not POS2/POS3 | CamStrategySelect + WorkCoordinateSystem + PostProcessor + MachineController + MillExpertAdvisor |
| ic24-007 | 5-Axis surface-based calc (vs HSM mesh) — 0.02mm finish-tolerance gives high-quality finish from quality surfaces | CamStrategySelect + CADGeometry + PostProcessor + MachineController + GCodeTimeEstimator + MillExpertAdvisor |
| ic24-008 | 3 area-machining types — Full-avoid-exact-edges (imported CAD safe) / Full-start-end-at-exact / Limit-by-points | CamStrategySelect + CADGeometry + CADFeatureRecognize + MachineController + MillExpertAdvisor + PostProcessor |

## High-leverage rules

- **Post + sim files in separate folder** — `C:/GPP` + `C:/Machine_Sim` survives uninstall/upgrade.
- **CoordSys X = axis of revolution** for X-rotary machines (DMU 100); #1 5-axis programming error.
- **Sim 5-Axis = POS1 only** — multi-setup needs separate MAC#, not POS2/POS3.
- **Surface-based tolerance forgives** — 0.02mm in 5-Axis Sim gives high finish if surfaces high-quality.
- **Avoid-exact-edges is safe default** for imported customer CAD (trim inaccuracies).
- **ABC rotary mapping is industry standard** — A around X, B around Y, C around Z.

## Pipeline status after iter72

- Roost: 105 book pivots, **445 tribal tips** (was 437), 551 total nodes
- NEW BOOK: 110 → 111 books
- Cumulative iter27-72: **217 page-cited tips**
- **Key unlock**: Third major CAM system (InventorCAM) + 5-axis simultaneous tribal. CAM stack now spans Mastercam (dm14 + ms14), hyperMILL (hm18 + hmcs), Autodesk Fundamentals (foc14), Hubs DfM (cncg), CNCCookbook articles (dh24/hi24/cl24/g76/fm24/fs24), and InventorCAM (ic24). 5-axis CoordSys + POS1 + kinematic-types fills the most-error-prone advanced strategy gap.

## See also

- [[hypermill-2018]] — hm18-001 hyperMILL 3D strategy taxonomy
- [[mastercam-dynamic-milling]] — dm14 HSM (peer of iMachining)
- [[cnccookbook-lathe-programming]] — cl24-001 mill-turn context
- [[autodesk-2014-gcode-language]] — foc14-503 A/B/C rotary letters
