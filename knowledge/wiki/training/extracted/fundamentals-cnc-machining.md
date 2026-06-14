---
type: extracted-book
source_book: "Fundamentals of CNC Machining — A Practical Guide for Beginners"
publisher: "NexGenCAM / HSMWorks, ApS"
year: 2012
isbn_13: "978-0-615-50059-1"
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter27"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/Autodesk_CNCBOOK.pdf"
pdf_size_mb: 7.0
total_pages_estimated: 195
pages_extracted_this_pass: "1-65"
tribal_jsonl: "state/shared/extracted-pdfs/fundamentals-cnc-machining-tips.jsonl"
tip_count_this_pass: 12
audience_slots: ["alpha", "bravo", "delta", "kilo", "india"]
---

# Fundamentals of CNC Machining — extracted content (pass 1: pages 1-65)

> **Status**: real extraction, not pointer. 12 tribal tips emitted to [`state/shared/extracted-pdfs/fundamentals-cnc-machining-tips.jsonl`](../../state/shared/extracted-pdfs/fundamentals-cnc-machining-tips.jsonl). Source: pdftotext extraction of pages 1-65 (chapters 1-3) by india iter27, 2026-05-25. Remaining chapters (4-N) pending future extraction passes.

## What this book covers (TOC from pdftotext)

| Chapter | Title | Pages |
|---|---|---|
| 1 | Introduction & CNC Process Overview | 1-3 to 1-6 |
| 2 | Shop Safety | 2-3 to 2-8 |
| 3 | CNC Tools (end mill, face mill, drill, tap, reamer + cutting fundamentals + speed/feed formulas) | 3-3 to 3-19 |
| 4 | Coordinate Systems (Cartesian, quadrants, VMC motion) | 4-3 to ... |
| 5 | CNC Programming Language | pending |
| 6 | CNC Operation | pending |

## High-leverage tribal tips extracted (12, this pass)

The full set is in the jsonl. The **highest-impact** rules:

1. **Climb milling on CNC, always** (unless the tool maker says otherwise). CNC ball screws eliminate the backlash that made conventional milling the default on manual machines. Climb gives less force, less heat, better finish, longer tool life. → `engine.SpeedFeedOrchestratorEngine`, `engine.ToolLifeEngine`.

2. **Chip color/sound is the operator's feedback loop**. Curled chips that change color = heat is being carried away in the chip (good). Blue/burnt chips = reduce SFM or add coolant. Singing/screaming tool sound = chatter; back off feed or stepover. → `engine.AutoSpeedFeedEngine`, `engine.ShopFloorTrainingEngine`.

3. **Two tool sets**: plastic vs metal. Tools used on metal lose edge quality and can't reliably cut plastic afterwards. → `engine.ShopToolingRegistryEngine`.

4. **HSS for plastics; carbide for metals.** Material-tool pairing is catalog-level discipline, not per-job. → `engine.ToolCatalogEngine`.

5. **Prototype ≠ production parameter philosophy.** Prototype = maximize reliability (never risk a tool/part for seconds on a few parts). Production = minimize cycle, maximize tool life (small per-part gains compound). NEVER use production parameters on first-articles. → `engine.JMDieCustomerEngine` (most JM Die jobs are short-run prototypes).

6. **Roughing geometry rules of thumb**: stepover (XY) = 50-80% of tool dia; stepdown (Z) = 25-50% of tool dia. Below 50% wastes time; above 80%/50% risks chatter and tool overload. → `engine.UltimateSpeedFeedEngine`, `engine.ChatterStabilityLobeEngine`.

7. **Peck drilling baseline**: 0.05" peck. Adjust deeper for aluminum/brass (chip-friendly), shallower for stainless/plastics (chip-evacuation matters more).

8. **Canonical speed formula**: `RPM = (SFM × 3.82) / DIA(in)` where `3.82 = 12/π` (converts circumference-feet to diameter-inches). Stop re-deriving this; cite the book. → `engine.FormulaExtractorEngine`.

9. **Canonical feed formula**: `IPM = RPM × ChipLoad(IPR) × NumFlutes`. Twist drills NumFlutes = 1.

10. **Canonical tap-feed formula**: `IPM = RPM / TPI`. Rigid tap must match exactly; floating-head taps tolerate small mismatch.

11. **Reamer prerequisite**: pre-drilled hole 1-3% undersize. Speed too fast = chip + chatter; too slow = BUE chatter.

12. **Chip load tables for prototype work** (from page 3-17):

| Material | <0.125" | 0.125-0.25" | 0.25-0.5" | 0.5-1" | >1" |
|---|---|---|---|---|---|
| Aluminum | 0.002 | 0.002 | 0.005 | 0.006 | 0.007 |
| Brass | 0.001 | 0.002 | 0.002 | 0.004 | 0.005 |
| Stainless 303 | 0.0005 | 0.001 | 0.002 | 0.003 | 0.004 |
| Steel 4140 | 0.0005 | 0.0005 | 0.001 | 0.002 | 0.003 |
| Drilling (any) | 0.002 | 0.004 | 0.005 | 0.010 | 0.015 |
| Reaming (any) | 0.005 | 0.007 | 0.009 | 0.012 | 0.015 |

(All values in IPR — inches per revolution. Multiply by NumFlutes × RPM to get IPM.)

## Consumer wiring

The jsonl entries carry `bridge_engines[]` per tip. The most-touched engines:

- `engine.UltimateSpeedFeedEngine` (10 tips) — receives chip-load tables + formula derivations + parameter rules of thumb
- `engine.SpeedFeedOrchestratorEngine` (6 tips) — receives the canonical formulas + the climb-vs-conventional rule
- `engine.ToolCatalogEngine` (3 tips) — receives tool-material pairing rules
- `engine.ChatterStabilityLobeEngine` (2 tips) — receives stepover/stepdown thresholds that trigger chatter

Audience slots tagged on each tip: delta (CAD), kilo (CAM), alpha (mill), bravo (lathe), india (post — for tap-feed). Hotel gets the prototype-vs-production philosophy (cost model).

## What's NOT extracted (pending future passes)

- Chapters 4-6 (coordinate systems, programming language, CNC operation) — needs another `pdftotext -f 66 -l 195` pass
- Detailed speed/feed examples with worked numbers — needs targeted page-range extraction
- The 3 sister books in the same folder: SOLIDWORKS engineering graphics (120 MB, 8 chapters), Mechanical Engineers Handbook (18 MB), Fundamentals_of_CNC_Machining.pdf (15 MB — different book despite similar name)

## Audit trail

- Extractor: `pdftotext -layout -f 1 -l 65` (poppler/Git Bash MINGW)
- Pages parsed in this commit: 1-65 (cover + TOC + chapters 1-3 + start of 4)
- No claim coverage on chapters 4+ — those pages were not opened in this pass
- Per `feedback_verify_actual_contract_not_proxy`: every tip cites the specific section + page number where it was extracted from
