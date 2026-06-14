---
name: reference_xray_juliett_database_wiring
description: xray↔juliett DB wiring — juliett owns the jm-die-database/docustrata/Qdrant stores xray searches; R8 no re-OCR
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.070Z
aliases: reference_xray_juliett_database_wiring
---


xray↔juliett PSN edge (operator directive 2026-05-29, "wire to juliett galaxy for the databases"). **Juliett owns every persistence surface; xray is a primary consumer + producer of the blueprint/print data layer.**

**Fast-search stores xray queries (juliett-owned — SEARCH, never re-OCR — R8):**
- `mcp-server/data/jm-die-database/` — consolidated DocuStrata + JM-file DB: `manifest.json` (corpus stats + role/notebook/machine rollups + source registry) + `.index/*.jsonl`. **257,992 files**, already extracted by `docustrata-pipeline.py`, built by `scripts/build-jm-die-database.mjs`. Big regenerable tables gitignored; committed catalog = manifest + reports + loader + README.
- `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` — docustrata join index.
- Qdrant collections (`QdrantMemoryEngine`) — memory/wiki/tribal/code-symbol embeddings (semantic search backbone for blueprint tribal + wiki).

**Doctrine:** before extracting a print, query `manifest.json` + `.index/*.jsonl` for a prior extraction (dedup vs `state/shared/blueprint-accuracy-events.jsonl`). **NEVER re-OCR the 257K-PDF corpus** — reuse the paid-for extraction (juliett's R8). New xray extractions feed juliett's ingestion; juliett owns schema + migration + cross-writer atomicity (atomicWriteJson), NOT the extraction business logic.

**Asymmetry to fix (advisory):** juliett's galaxy CLAUDE.md lists Charlie/Echo/Hotel as consumers of these stores but NOT xray — yet xray is THE extraction slot. Ping juliett (chat-bus) to add xray as a consumer+producer of the jm-die-database. Declared in xray's galaxy CLAUDE.md `## Related galaxies` 2026-05-29. See [[blueprint-vision-knowledge-index]] §5.
