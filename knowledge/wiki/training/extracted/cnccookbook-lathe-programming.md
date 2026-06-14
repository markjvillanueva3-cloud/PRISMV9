---
type: extracted-book
source_book: "CNC Lathe Programming for Turning"
author: "CNCCookbook"
year: 2024
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter69"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/CNC Lathe Programming for Turning.pdf"
extraction_focus: "Lathe G-code — 2/3-axis, diameter vs radius mode, Y-omission profile programming, part-zero locations, Tttww tool change, gang tooling, auto chamfer/corner rounding, G18 ZX plane"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/cnccookbook-lathe-programming-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_69_tips: 193
audience_slots: ["delta", "kilo", "alpha", "india", "bravo", "hotel"]
---

# CNC Lathe Programming for Turning (CNCCookbook 2024) — extraction

> Twenty-first pass overall (iter69). Extends lathe G-code tribal from foc14-801..808 (insert + tool types + CSS + G50 safety) into lathe-specific PROGRAMMING semantics (axis conventions, mode switches, part-zero choice, T-word format, gang vs turret, auto chamfer, G18 plane).

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| cl24-001 | 2-axis Z+X / 3-axis +C live-tooling / mill-turn +Y; Y-coordinate omitted on basic lathe | LatheCorePhysics + LatheLiveToolingPlanner + LatheTribalIntegration + PostProcessor + MachineController |
| cl24-002 | Diameter vs radius mode — X-values 2× different; G190 radius / G191 diameter | LatheCorePhysics + LathePostGeneratorDialect + PostProcessor + MachineController + GCodeSafetyAnalyzer |
| cl24-003 | Lathe Y/J/V omission + profile-creation focus; G71 canned cycle simplifies further | LatheCorePhysics + LathePostGeneratorDialect + PostProcessor + MachineController + LatheTribalIntegration |
| cl24-004 | Part-zero 3 locations — chuck face / jaw face / end-of-finished-part (most popular for flippable parts) | LatheCorePhysics + WorkCoordinateSystem + LatheTribalIntegration + LathePostGeneratorDialect + ShopFloorTraining + JMDieCustomer |
| cl24-005 | Tool change no M06 (T-word triggers); Tttww format = tool# + wear-offset; multiple wear offsets per tool for per-feature tolerance | LatheCorePhysics + LatheLiveToolingPlanner + LathePostGeneratorDialect + PostProcessor + MachineController + ToolWearProgression + LatheTribalIntegration |
| cl24-006 | Gang tooling vs turret — gang faster + more rigid but limited tool count; Swiss-style + high-prod | LatheCorePhysics + LatheLiveToolingPlanner + LathePostGeneratorDialect + PostProcessor + MachineController + LatheTribalIntegration |
| cl24-007 | Auto chamfer (C) / corner rounding (R) on G01 — single-axis move + chart-driven sign | LatheCorePhysics + LathePostGeneratorDialect + PostProcessor + MachineController + LatheTribalIntegration + CADGeometry |
| cl24-008 | G18 ZX plane lathe default vs G17 XY mill — K replaces J in arc commands | LatheCorePhysics + LathePostGeneratorDialect + PostProcessor + MachineController + GCodeSafetyAnalyzer + LatheTribalIntegration |

## High-leverage rules

- **Diameter mode is the US default** — know which mode the controller uses BEFORE first cycle (2× scrap risk).
- **End-of-finished-part Z-zero** for flippable production parts; chuck-jaw-face for one-offs.
- **Tttww enables per-feature wear offsets** — same tool, multiple wear registers, independent per-feature tolerance tweaks.
- **Auto chamfer/radius on G01** — single line per corner instead of (line + arc + line); easier to read + edit.
- **G18 in lathe safety block** like G17 in mill safety block (foc14-502).

## Pipeline status after iter69

- Roost: 102 book pivots, **421 tribal tips** (was 413), 524 total nodes
- NEW BOOK: 107 → 108 books
- Cumulative iter27-69: **193 page-cited tips**
- **Key unlock**: Lathe-side G-code programming tribal — `LathePostGeneratorDialectEngine` + `LatheCorePhysicsEngine` + `LatheLiveToolingPlannerEngine` + `LatheTribalIntegrationEngine` now have first-class lathe-specific programming knowledge (axis conventions, mode switches, T-word format, gang vs turret, auto-chamfer, G18 plane). Complements iter55 foc14-801..808 (insert selection + tool types + CSS + G50 safety).

## See also

- [[autodesk-2014-turning]] — Autodesk Lesson 8 (8 tips, foc14-801..808 — insert + tools + CSS + G50)
- [[autodesk-2014-gcode-language]] — Autodesk Lesson 5 (8 tips, foc14-501..508 — general G-code that lathe extends)
- [[hypermill-2018]] — hm18-005 hyperMILL turning cycles (13 cycles + Rollfeed)
- [[solidworks-eng-graphics-revolved]] — Planchard Ch 6 swg-501 (4-input Revolve → lathe XZ profile bridge)
