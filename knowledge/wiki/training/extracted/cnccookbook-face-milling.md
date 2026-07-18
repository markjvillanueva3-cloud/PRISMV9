---
type: extracted-book
source_book: "Face Mill Speeds and Feeds [Calculator, 45 or 90 Degrees]"
author: "Bob Warfield (CNCCookbook)"
year: 2024
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter68"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/Face Mill Speeds and Feeds.pdf"
extraction_focus: "Face milling — definition, 3 selection characteristics, 45°/90°/button lead angle comparison, 45° advantages (6) + disadvantages (4), 90° for thin walls + workholding, fly cutter best finish, HSM face milling 3 toolpath techniques"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/cnccookbook-face-milling-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_68_tips: 185
audience_slots: ["delta", "kilo", "alpha", "india", "bravo"]
---

# Face Mill Speeds and Feeds (CNCCookbook 2024) — extraction

> Twentieth pass overall (iter68). Face milling is the most common FIRST OPERATION on every billet (per foc14-205 facing-first rule); this iter extends that fundamental with tool-selection + lead-angle + HSM-toolpath tribal.

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| fm24-001 | Face milling definition — bottom-cut, face mills = shell mills (no difference) | CamStrategySelect + MillExpertAdvisor + AdaptiveFeedrate + ToolDeflection |
| fm24-002 | 3 face-mill characteristics — diameter, # inserts, geometry; cutter > area for best finish | CamStrategySelect + MillExpertAdvisor + AdaptiveFeedrate + ToolDeflection + MaterialSelection |
| fm24-003 | 45° vs 90° vs button (round) — Sandvik/Kennametal recommend 45° general; 90° shoulder/thin-wall; button nasty materials | CamStrategySelect + MillExpertAdvisor + MaterialSelection + ToolDeflection + AdaptiveFeedrate |
| fm24-004 | 45° 6 advantages — balanced forces, gentle entry, demanding cuts, better finish, chip thinning higher feed, less chatter | CamStrategySelect + MillExpertAdvisor + AdaptiveFeedrate + ToolDeflection + MillChipEvacuationPredictor |
| fm24-005 | 45° 4 disadvantages — reduced Ap, body clearance, no 90° shoulder, exit chipping/burring | CamStrategySelect + MillExpertAdvisor + ToolDeflection + CADGeometry + WorkholdingDesign |
| fm24-006 | 90° for thin walls + workholding — ~half axial force; chatter/cracking risk; cncg-004 wall thickness link | CamStrategySelect + MillExpertAdvisor + PartDeflection + WorkholdingDesign + ToolDeflection |
| fm24-007 | Fly cutter best finish — single insert, easy conversion (remove all-but-one insert) | CamStrategySelect + MillExpertAdvisor + ToolDeflection + GDT + MaterialSelection |
| fm24-008 | HSM face milling 3 tricks — 60% width pass + arc into cut + don't leave cut entirely; 30-50% F+S boost | CamStrategySelect + AdaptiveFeedrate + MillExpertAdvisor + MillChipEvacuationPredictor + ToolDeflection + ToolWearProgression |

## High-leverage rules

- **45° is the default** unless you need shoulder/thin-wall/exotic. Sandvik + Kennametal industry consensus.
- **Cutter DIA > area for best finish:** Single-pass eliminates step marks at the seam.
- **Fly cutter = best finish:** Convert any face mill with 1-insert install for finish-critical work.
- **HSM face milling = 30-50% F+S boost:** 60% width pass + arc into cut + don't leave the cut.
- **90° for thin walls (cncg-004 link):** Axial force reduction matters when wall < 2× cutter dia.

## Pipeline status after iter68

- Roost: 101 book pivots, **413 tribal tips** (was 405), 515 total nodes
- NEW BOOK: 106 → 107 books
- Cumulative iter27-68: **185 page-cited tips**
- **Key unlock**: Face milling lead-angle tribal — `CamStrategySelectEngine` + `MillExpertAdvisorEngine` can now recommend 45° vs 90° vs button based on part properties + workholding + material; closes the face-milling-strategy gap that prior facing tips (foc14-205) left to operator judgment.

## See also

- [[autodesk-2014-toolpath-tips]] — foc14-205 facing-first reference
- [[cnc-complete-engineering-guide]] — cncg-004 thin-wall thickness (drives 90° choice)
- [[mastercam-dynamic-milling]] — dm14 HSM strategies that fm24-008 leverages
- [[hypermill-2018]] — hm18-002 Optimised Roughing HSM
- [[cnccookbook-helical-interpolation]] — hi24 helical interpolation (related entry strategy)
- [[cnccookbook-deep-hole-drilling]] — dh24 deep hole drilling (sibling specialty)
