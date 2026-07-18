---
name: reference_juliett_jm_die_database_2026_05_29
description: JM die database built from DocuStrata corpus + the J.M. Tool & Die vendor report (juliett primary for DocuStrata/JM, 2026-05-29)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.630Z
aliases: reference_juliett_jm_die_database_2026_05_29
---


**JM die database (2026-05-29, slot:juliett — operator directive).** Operator made juliett the **primary slot for DocuStrata + JM files** and asked to build a JM die database from `H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf` + all DocuStrata files.

**Key reality:** `H:/PRISM/Docustrata/` = **257,992 files** (257,723 PDFs) — already extracted + classified by `docustrata-pipeline.py` into `.index/*.jsonl`. So the build **reuses that extraction (R8 — no re-OCR of 257K PDFs)**, NOT a re-parse.

**Built** (`scripts/build-jm-die-database.mjs` → `mcp-server/data/jm-die-database/`, schemaVersion 1.0.0, atomic, read-back smoke test PASS):
- `tables/documents.jsonl` — 111,745 classified docs (normalized from documents-classified.jsonl v1 base + v3 role/text-layer enrichment; `classified_v3` flag). 56,887 of the 73,506 v3-processed docs have a text layer (signal evaluated only on the v3 subset).
- `tables/files.jsonl` — 38,251 JM-DIE CAD/CAM/g-code files (from jm-die-index-v2.json). Top machines: lathe 19,803, okuma 6,092, wire_edm 4,000.
- 76,205 blueprint→program joins (referenced in place, not copied — 61MB).
- `reports/report-from-jm-tool-die-llc.json` + `.txt` — the named PDF = a **QuickBooks Purchases by Vendor Detail report (May 2014–May 2026, 5.28M chars, text PDF — pdftotext, no OCR)**. sha256 9ebed22d...
- `manifest.json` — corpus stats + role/notebook/machine rollups + source registry. Linked to jm-die-profile.ts (117 customers / 21 machines / 24,545 programs).

**Commit strategy:** big regenerable tables (documents.jsonl 56MB, files.jsonl 10MB, report.txt 5MB) gitignored; committed catalog = manifest.json + report.json + builder script `scripts/build-jm-die-database.mjs` + README + .gitignore.

**Docs updated for juliett-primary:** CHAT-SLOT-DOMAINS.md (shared + root H:/), soul, SLOT_GALAXY_MAP comment, galaxy CLAUDE.md, wiki [[jm-die-database]]. Charlie/Echo/Hotel **consume**; juliett owns ingestion+schema+atomicity. See [[reference_juliett_galaxy_buildout_2026_05_29]].
