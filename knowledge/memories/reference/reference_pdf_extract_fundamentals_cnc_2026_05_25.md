---
name: reference-pdf-extract-fundamentals-cnc-2026_05_25
description: india iter27 — REAL extraction from Fundamentals_of_CNC_Machining (NexGenCAM 2012). 12 tribal tips with page-citations + wiki entry. Closes the iter23-26 honesty gap where I shipped pointers but no actual extracted content.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.726Z
aliases: reference_pdf_extract_fundamentals_cnc_2026_05_25
---


iter27 (slot:india, 2026-05-25) ships **actual extracted content** from a source PDF — closing the honesty gap from iter23-26 where I built pointer/handoff infrastructure but never extracted real data.

**What triggered this**: user asked "did you extract all data?" Honest answer was NO — iter23-26 only classified pointer entries, never opened a single source PDF. This memo records the first real extraction.

## What was extracted

Source: `H:/PRISM/resources/RESOURCE PDFS/Autodesk_CNCBOOK.pdf` (7 MB, ~195 pages, actually titled "Fundamentals of CNC Machining" by NexGenCAM/HSMWorks 2012, ISBN 978-0-615-50059-1).

Method: `pdftotext -layout -f 1 -l 65` (poppler from Git Bash MINGW). Worked first try.

Pages extracted this pass: 1-65 (cover, TOC, chapters 1-3 + start of 4).

Output artifacts:
- `state/shared/extracted-pdfs/fundamentals-cnc-machining-tips.jsonl` — 12 tribal tips, one JSON object per line, each with `{id, domain, topic, tip, source:{book,chapter,section,pages,pdf_path}, bridge_engines[], confidence, audience[], extracted_at, extracted_by, schemaVersion}`.
- `knowledge/wiki/training/extracted/fundamentals-cnc-machining.md` — operator wiki entry with TOC + tip summary + cited chip-load table + consumer wiring + audit trail of WHAT WAS NOT extracted.

## The 12 tips (highest-impact summary)

1. **Climb milling on CNC, always** (ball-screw CNC eliminates the backlash that made conventional default on manual machines).
2. **Chip color/sound is the operator's feedback loop** — blue chips = reduce SFM; singing = chatter.
3. **Two separate tool sets**: plastic vs metal (metal-used tools have compromised edges).
4. **HSS for plastics, carbide for metals** — catalog-level pairing rule.
5. **Prototype ≠ production** — prototypes maximize reliability; production minimizes cycle. JM Die is mostly prototypes → never use production parameters there.
6. **Roughing stepover 50-80% / stepdown 25-50%** of tool dia.
7. **Peck drilling baseline 0.05"**, deeper for chip-friendly materials.
8. **Speed formula**: `RPM = (SFM × 3.82) / DIA(in)`, where `3.82 = 12/π`.
9. **Feed formula**: `IPM = RPM × IPR × NumFlutes`; twist drills NumFlutes = 1.
10. **Tap feed**: `IPM = RPM / TPI`. Rigid taps must match exactly.
11. **Reamer prereq**: pre-drilled 1-3% undersize hole; speed too fast = chatter, too slow = BUE.
12. **Full chip-load table** for prototype work across Al / Brass / SS303 / 4140 / drilling / reaming by tool-dia range — cited from book page 3-17.

## Bridge wiring

The most-fed engines (per the iter22 `PDF_KIND_TO_ENGINES["machining-handbook"]` map + my new per-tip targeting):
- `engine.UltimateSpeedFeedEngine` — 10 tips
- `engine.SpeedFeedOrchestratorEngine` — 6 tips
- `engine.ToolCatalogEngine` — 3 tips
- `engine.ChatterStabilityLobeEngine` — 2 tips
- `engine.FormulaExtractorEngine` — 2 tips (the speed + feed formulas)
- `engine.ToolLifeEngine`, `engine.ShopFloorTrainingEngine`, `engine.SurfaceFinishPredictorEngine`, `engine.ThreadEngine`, `engine.JMDieCustomerEngine`, `engine.AutoSpeedFeedEngine` — 1+ each

Audience tagging on each tip: `delta` (CAD), `kilo` (CAM), `alpha` (mill specialist), `bravo` (lathe), `india` (post / tap-feed), `hotel` (cost — for prototype-vs-production philosophy).

## What's still pending (honesty trail)

- **3 sister books** in same folder NOT YET extracted: David Planchard SOLIDWORKS (120 MB / 8 chapters), Mechanical Engineers Handbook (18 MB), Fundamentals_of_CNC_Machining.pdf (15 MB — different book despite name).
- **Chapters 4-6** of this same book — coordinate systems, programming language, CNC operation. Next extraction pass: `pdftotext -f 66 -l 195`.
- **All 893 resource-pdf entries from iter23 catalog** still un-extracted as content (only 1 of ~4 standalone books touched here).

## Method note (for future passes)

`pdftotext -layout -f <start> -l <end>` is the workhorse. Available via Git Bash MINGW. Use it instead of:
- Read tool with `pages` parameter (broken — requires `pdftoppm`)
- WebFetch (these are local files)
- Ollama (currently broken per session banner)

Per-pass throughput estimate: ~12 high-quality tips per 65 pages, ~30 mins of careful curation. Full extraction of the 4 standalone books would be ~4-8 more iter passes.

## Related memories

- [[reference_cadcam_tribal_wiki_extract_2026_05_24]] — iter24 (pointer layer)
- [[reference_cadcam_viz_roost_mcp_action_2026_05_24]] — iter25/26 (system-viz + MCP)
- [[feedback_verify_actual_contract_not_proxy]] — the doctrine that triggered this honest re-attempt

## Closes

Operator goal: "extract data from sources for wiki, memories, tribal knowledge injection into compatible nodes and pipelines | synergize to PSN — prioritize books and pdfs first" — first real pass complete. Cron `3f6023ef` will fire `/goal` every 5 min for continued extraction.
