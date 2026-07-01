---
type: extracted-book
source_book: "Fundamentals of CNC Machining (Autodesk 2014 edition)"
publisher: "Autodesk, Inc."
year: 2014
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter29"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/Fundamentals_of_CNC_Machining.pdf"
pdf_size_mb: 15.0
extraction_focus: "Workholding (ch 10) + WCS-on-flip (ch 7) + tapping (ch 3) — NET-NEW vs iter27 NexGenCAM 2012 edition"
tribal_jsonl: "state/shared/extracted-pdfs/fundamentals-cnc-machining-2014-workholding-tips.jsonl"
tip_count_this_pass: 11
audience_slots: ["alpha", "delta", "kilo", "india", "hotel"]
sister_book: "knowledge/wiki/training/extracted/fundamentals-cnc-machining.md (NexGenCAM 2012 — iter27)"
---

# Fundamentals of CNC Machining (Autodesk 2014) — workholding-focused extraction

> Second pass from a different book — same title, 2 years newer, EXPANDED scope (10 chapters vs 6). The 2012 NexGenCAM edition was extracted in iter27 (chapters 1-3, speeds/feeds). This iter29 pass targets the NET-NEW chapters: workholding (ch 10), WCS-on-flip patterns (ch 7), and the tapping details added in ch 3.

## Why a second extraction from a "same name" book?

The two books share a TOC for the first 6 chapters but the 2014 Autodesk edition adds:
- Ch 7: WCS-on-flip patterns (Job-1 / Job-2 fixture coordinate strategy)
- Ch 8: CNC Operation deepened with Haas-specific notes
- Ch 9: CNC Turning (was absent in 2012)
- Ch 10: CNC Milling Work-Holding Examples (was absent in 2012)
- Appendix A: detailed Project 1-N install/align procedures

This pass extracts the highest-leverage tribal from the NET-NEW material — no duplicated content.

## The 11 tips this pass

| ID | Topic | Why it matters |
|---|---|---|
| foc14-001 | Vise can exert 6000+ lbs — match force to part stiffness | Prevents deformation of thin parts; protects tolerances |
| foc14-002 | Remove vise handle before cycle | Collision/projectile hazard |
| foc14-003 | Hard jaws need parallels; step jaws don't | Pick correct workholding combo |
| foc14-004 | Soft jaws machined with spacer + remove before clamp | Irregular-shape grip — used heavily in JM Die secondary ops |
| foc14-005 | WCS datums against FIXED jaw + vise stop, NEVER moving jaw | Flip-then-G54 stability across Job-1/Job-2 |
| foc14-006 | Strap clamps on Al → use Al pad to prevent galling | Material-on-material surface protection |
| foc14-007 | Step blocks are stackable; step clamps interlock with 1 step block | Setup-kit selection |
| foc14-008 | Dowel pin LOCATES; shoulder bolt LOCATES + GRIPS | Fixture design rule |
| foc14-009 | Subplate is permanent; vises/fixtures bolt to it | Protects machine table from setup wear |
| foc14-010 | Hand-tap small holes for low volume; CNC for production | Volume-driven method selection |
| foc14-011 | Bottoming tap for blind; spiral-point for through | Wrong type = broken tap + scrap part |

## Bridge-engine wiring (most-touched)

| Engine | Tip count |
|---|---|
| `engine.ShopFloorTrainingEngine` | 8 |
| `engine.FixtureSelectionEngine` | 5 |
| `engine.ShopToolingRegistryEngine` | 4 |
| `engine.WorkholdingDesignEngine` | 3 |
| `engine.ThreadEngine` | 2 |
| `engine.ShopSafetyValidationEngine` | 1 |
| `engine.PartDeflectionEngine` | 1 |
| `engine.WorkCoordinateSystemEngine` | 1 |
| `engine.PostProcessorPipelineEngine` | 1 |

`engine.JMDieCustomerEngine` also tagged on the hand-vs-CNC-tap tip — JM Die runs lots of low-volume work where hand-tapping wins.

## Audience routing

- `alpha` (mill): 11/11 tips
- `delta` (CAD), `kilo` (CAM): 11/11
- `india` (post): 5 (the WCS + threading + vise-safety tips)
- `hotel` (cost): 3 (the volume-driven selection + subplate amortization)

## PSN synergy

After next `regen-viz`, the iter28 `ghost.extracted_pdf_tips` roost auto-grows: new pivot `ghost.extracted_pdf_tips.fundamentals-of-cnc-machining-autodesk-2014-edition-` + 11 new tribal-tip leaves. No generator code change needed.

## Not yet extracted from this book

- Ch 8 details (Haas-specific offsets, work coordinate adjustment patterns)
- Ch 9 entire (CNC Turning — lathe slot would consume this; bravo's domain)
- Appendix A install procedures (operator-actionable but lower priority than chapter content)

## Audit trail

- Extractor: `pdftotext -layout` (poppler/Git Bash MINGW)
- Section anchors: grep on "Vise", "Clamp", "Tap", "Flip" + sed page ranges
- Cross-reference vs iter27 NexGenCAM 2012 edition: NO duplicate tips (different chapters)
