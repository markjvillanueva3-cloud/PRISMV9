---
type: extracted-book
source_book: "G76 Threading Cycle for CNC Lathes (Fanuc, Haas, Mach3, LinuxCNC)"
author: "CNCCookbook"
year: 2024
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter70"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/G76 Threading Cycle.pdf"
extraction_focus: "G76 lathe threading cycle — multi-dialect (Fanuc/Haas/Mach3/LinuxCNC), start+end positions, thread spec lookup, 3 infeed strategies, A-parameter convention, first-cut depth equal-area, spring passes, shoulder chamfer"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/cnccookbook-g76-threading-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_70_tips: 201
audience_slots: ["delta", "kilo", "alpha", "india", "bravo", "hotel"]
---

# G76 Threading Cycle for CNC Lathes (CNCCookbook 2024) — extraction

> Twenty-second pass overall (iter70). MILESTONE: **200 page-cited tips crossed**. G76 is THE standard lathe threading canned cycle; this iter completes the thread-milling stack alongside cl24 (lathe programming) + hi24 (helical interpolation) + hm18-006 (hyperMILL threading) + cncg-006 (thread design rules) + foc14-806 (thread tool touch-off).

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| g76-001 | G76 multi-dialect (Fanuc/Haas/Mach3/LinuxCNC); dialect variance requires post-validation | Thread + LatheCorePhysics + LathePostGeneratorDialect + PostProcessor + MachineController + LatheTribalIntegration |
| g76-002 | Start/end positions — Z sync allowance + pre-turn to thread top minimizes wear | Thread + LatheCorePhysics + LatheSpeedFeedCalculator + LathePostGeneratorDialect + LatheTribalIntegration + ToolDeflection |
| g76-003 | Thread height/pitch/lead from spec DB (Machinery's Handbook + G-Wizard); never derive | Thread + LatheCorePhysics + LatheSpeedFeedCalculator + MaterialSelection + GDT + PdfBlueprintExtractor |
| g76-004 | 3 infeed strategies — radial (fine only) / modified-flank (CNC default) / incremental (large) | Thread + LatheCorePhysics + LathePostGeneratorDialect + MachineController + ToolDeflection + ToolWearProgression |
| g76-005 | A-parameter convention — A58 = 29° infeed (modified flank); A60 = 30° one-side; A0 = radial | Thread + LatheCorePhysics + LathePostGeneratorDialect + PostProcessor + MachineController + ToolDeflection + ToolWearProgression |
| g76-006 | First-cut depth deepest (equal-area auto-reduction); 30-50% of total typical; simulate for exact count | Thread + LatheCorePhysics + LatheSpeedFeedCalculator + LathePostGeneratorDialect + ToolDeflection + AdaptiveFeedrate |
| g76-007 | Spring passes — combat part-springback; 1-2 typical; controller-built-in OR G92 retrace | Thread + LatheCorePhysics + LathePostGeneratorDialect + PostProcessor + MachineController + ToolDeflection + GDT |
| g76-008 | Thread shoulder chamfer — 1-2 pitches typical; critical for mating threaded parts | Thread + LatheCorePhysics + LathePostGeneratorDialect + PostProcessor + MachineController + GDT + CADGeometry |

## High-leverage rules

- **Spec DB ONLY for thread params** — never derive thread height/pitch manually. Machinery's Handbook or software.
- **Modified flank is the CNC default** — A58 for 60° insert = 29° infeed.
- **Pre-turn to thread top** — reduces threading-tool work + extends life.
- **First-cut deepest** — G76 auto-reduces subsequent passes for equal-area removal.
- **1-2 spring passes ALWAYS** for tight-tolerance threads.
- **Validate first piece with thread gage** — springback can cause dimensional miss.

## Pipeline status after iter70

- Roost: 103 book pivots, **429 tribal tips** (was 421), 533 total nodes
- NEW BOOK: 108 → 109 books
- Cumulative iter27-70: **201 page-cited tips** (200-tip milestone crossed)
- **Key unlock**: G76 threading cycle tribal — `ThreadEngine` now has **complete 6-layer stack** for thread work:
  1. swg-204 (CAD helix-as-sweep-path)
  2. cncg-006 (design: cosmetic CAD + drawing spec)
  3. foc14-806 (operator: thread tool touch-off procedure)
  4. hm18-006 (CAM cycle: hyperMILL Thread Milling)
  5. hi24-001..008 (g-code: helical interpolation for thread milling)
  6. g76-001..008 (g-code: G76 canned threading cycle for lathe)

## See also

- [[cnccookbook-helical-interpolation]] — hi24 mill-side thread milling (8 tips)
- [[cnccookbook-lathe-programming]] — cl24 lathe programming context (8 tips)
- [[autodesk-2014-turning]] — foc14-806 thread tool touch-off
- [[cnc-complete-engineering-guide]] — cncg-006 thread design rules
- [[hypermill-2018]] — hm18-006 hyperMILL Thread Milling cycle
