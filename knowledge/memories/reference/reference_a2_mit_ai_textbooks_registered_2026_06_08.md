---
name: reference_a2_mit_ai_textbooks_registered_2026_06_08
description: "Took over for lima (under construction) — registered the 12 cyrilXBT MIT-Press AI/ML textbooks (A2 gap from the X-article verification) into pdf-sources/registry.json as a new ai_textbook category; definition+queue shipped, extraction still pending."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.458Z
aliases: reference_a2_mit_ai_textbooks_registered_2026_06_08
---


**Alpha took over lima's A2 deliverable (2026-06-08, lima under construction).** A2 = @cyrilXBT's "12 free MIT AI textbooks as a permanent reasoning corpus" (see [[reference_rody_cyril_claude_setup_articles_2026_06_08]]).

## The gap was real (verified, not assumed)
A naive `grep` for the 12 author surnames hit ≥1 file each — but every hit was a **false positive**: JM-Die customer/CAD surnames ("Prince", "Murphy", "Sutton" are people/company names in `jm-die-customers.json`, `CAD_FILE_REGISTRY.json`, etc.) + the memory file listing the 12 + the knowledge-conversion wiki page. **None was an ingested textbook.** R8/R12 lesson: a surname grep over a shop-data corpus is a near-useless ingest signal — verify against the actual ingest manifest (`pdf-sources/registry.json` + `pdf-sources/extracted/`), not a content grep.

## What shipped (the definition + queue — R13 verifiable core)
- **`mcp-server/data/pdf-sources/registry.json`** — added 12 `ai_textbook` entries (Mohri, Prince UDL, MIT MLSysBook, Kochenderfer ADM, Goodfellow DL, Sutton&Barto RL, Bellemare Distributional RL, Albrecht MARL, Kochenderfer textbooks hub, Barocas Fairness, Murphy ProbML vol1+vol2). Each: canonical download `url`, `status:"pending"`, extractionTargets `[formulas, problem_solutions, diagrams]`, topic tags, provenance `source:"cyrilXBT-12-mit-ai-textbooks-2026-06-08"`. Registry grew 18→30 sources.
- **`mcp-server/src/engines/PDFSourceRegistryEngine.ts`** — extended `PDFSourceCategory` union with `"ai_textbook"` (the data was off-contract without it; engine seeds from `PRIORITY_SOURCES` const then overlays registry.json at load line ~437, so the JSON edit is live in `getAllSources()`).

## Verified
12/12 load via node, JSON parses, 0 new tsc errors under project tsconfig (the standalone-compile `esModuleInterop` error on the `path` import is a pre-existing isolated-compile artifact, not mine). Registry consumed by 5 engines: PDFSourceRegistryEngine + PDFFormulaExtraction/PDFHandbookBatchProcessor/PDFMaterialPropertyExtraction/PDFTableExtraction.

## STILL PENDING (lima's, when back)
Download + page-by-page extract the 12 (heavy multi-GB pypdf/embedding job — NOT done inline under memory pressure + active model pull). Run via `scripts/extract-jm-die-corpus-page-by-page.py` or the PDFHandbookBatchProcessor pass; flip status pending→downloaded→extracted→indexed. Route extracted formulas/problem_solutions to **ai-training + academy** galaxies (these are reasoning-corpus books, NOT manufacturing — do NOT route to physics `constants.ts`).

Related: [[reference_rody_cyril_claude_setup_articles_2026_06_08]] · [[feedback_use_lima_pypdf_page_extractor]] · [[reference_knowledge_conversion_ms0_2026_05_17]].
