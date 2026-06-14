---
type: extracted-book
source_book: "G-Code and M-Code List [Easy Examples & Tutorials]"
author: "CNCCookbook"
year: 2024
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter74"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/G-Code and M-Code List.pdf"
extraction_focus: "G-code + M-code comprehensive reference — G vs M split, 100+ codes + dialects, G00/G01 rapid vs feed, G02/G03 arcs, G54-G59+G54.1 P1..P48 fixture offsets, G81-G89 canned cycles, G73 vs G83 peck, M-code essentials"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/cnccookbook-g-m-code-list-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_74_tips: 233
audience_slots: ["delta", "kilo", "alpha", "india", "bravo", "hotel"]
---

# G-Code and M-Code List (CNCCookbook 2024) — extraction

> Twenty-sixth pass overall (iter74). Comprehensive G/M code reference; extends foc14-503 (21 alphabetic codes) with the full G/M code catalog. Closes the G-code reference tribal gap — every post-processor + machine-controller engine now has both the high-level codes (motion/state) and machine-control codes (spindle/coolant/program-flow) catalogued.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| gmc24-001 | G-code (PREPARATORY motion/state) vs M-code (MISCELLANEOUS machine functions); 1 M-code/block | PostProcessor + MachineController + GCodeSafetyAnalyzer + CamStrategySelect + ShopFloorTraining |
| gmc24-002 | ~100 G-codes + dialects (Fanuc/Haas/Mazatrol/Heidenhain/Siemens/Okuma/LinuxCNC); core ~20-code subset | PostProcessor + MachineController + GCodeSafetyAnalyzer + CamStrategySelect + LathePostGeneratorDialect |
| gmc24-003 | G00 rapid vs G01 feed — paths NOT proportional in G00 (dogleg); never G00 in cut | PostProcessor + MachineController + GCodeSafetyAnalyzer + CollisionDetection + ShopSafety + GCodeTimeEstimator |
| gmc24-004 | G02/G03 arc direction — CW/CCW from programmed plane (G17 default); IJK > R for >180° | PostProcessor + MachineController + GCodeSafetyAnalyzer + CADGeometry + LathePostGeneratorDialect |
| gmc24-005 | G54-G59 + G54.1 P1..P48 = 54 total fixture offsets per machine | WorkCoordinateSystem + PostProcessor + MachineController + GCodeSafetyAnalyzer + HyperMillStrategy |
| gmc24-006 | G81-G89 canned drilling cycles — 9 standard cycles (simple/dwell/peck/tap/bore/etc); G80 cancel | PostProcessor + MachineController + GCodeSafetyAnalyzer + Thread + MillChipEvacuationPredictor + MillExpertAdvisor |
| gmc24-007 | G73 (small-retract chip break) vs G83 (full-retract chip evac) — pick by hole depth + chip behavior | PostProcessor + MachineController + CamStrategySelect + MillChipEvacuationPredictor + MillExpertAdvisor + GCodeTimeEstimator |
| gmc24-008 | M-code essentials — M00/M01/M02/M30 program control + M03/M04/M05 spindle + M06 tool change + M07/M08/M09 coolant + M98/M99 subprogram | PostProcessor + MachineController + GCodeSafetyAnalyzer + Thread + ShopFloorTraining + ShopSafety |

## High-leverage rules

- **G-code = motion/state; M-code = machine function** — fundamental split.
- **G00 path is NOT straight** — controller decides dogleg routing; never assume G00 path.
- **ONE M-code per block** — controller-enforced hard limit.
- **G80 cancel BEFORE switching canned cycles** — failure to cancel can carry over wrong cycle semantics.
- **G73 for chip break (shallow/brittle), G83 for chip evac (deep/gummy)** — wrong pick = broken bit.
- **54 fixture offsets per machine** (G54-G59 + G54.1 P1..P48) — sufficient for 50+ op parts.

## Pipeline status after iter74

- Roost: 107 book pivots, **461 tribal tips** (was 453), 569 total nodes
- NEW BOOK: 112 → 113 books
- Cumulative iter27-74: **233 page-cited tips**
- **Key unlock**: Comprehensive G/M code catalog tribal — every post-processor + machine-controller engine has the full reference (motion + state + machine-functions + canned cycles). Completes the G-code-syntax tribal layer started by foc14-501..508 (modal vs non-modal, safety block, 21 alphabetic codes).

## See also

- [[autodesk-2014-gcode-language]] — foc14-501..508 (G-code language fundamentals)
- [[cnccookbook-deep-hole-drilling]] — dh24 deep hole drilling (G73/G83 context)
- [[cnccookbook-g76-threading]] — g76 threading cycle (related canned cycle)
- [[cnccookbook-helical-interpolation]] — hi24 helical interpolation (G02/G03 mechanics)
- [[autodesk-2014-operation]] — foc14-603 G54-G59 fixture offset operation
