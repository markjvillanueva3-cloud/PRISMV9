---
title: JM Die Database (DocuStrata + JM-file consolidation)
kind: architecture
status: shipped
date: 2026-05-29
unit: U-JM-DIE-DATABASE
milestone: DATABASE-EXPANSION
author: claude-a6304a93 (slot juliett)
---

# JM Die Database

Schema-versioned consolidation of the **JM Die / DocuStrata corpus** into a queryable store. Owned by **slot:juliett** (primary slot for DocuStrata + JM files, operator directive 2026-05-29). Built by `scripts/build-jm-die-database.mjs` → `mcp-server/data/jm-die-database/`.

## Source corpus

`H:/PRISM/Docustrata/` — **257,992 files** (257,723 PDFs). Already extracted + classified by `docustrata-pipeline.py` into `H:/PRISM/Docustrata/.index/*.jsonl`:
- `documents-classified.jsonl` (111,745 docs, v1 base) + `documents-classified-v3.jsonl` (73,506 v3 role-refinements) · `documents-text-extracted-v3.jsonl` · `blueprint-program-join-full-v6.jsonl` (76,205 joins) · `jm-die-index-v2.json` (38,251 JM-DIE files).

The database **reuses this paid-for extraction** (R8 — does NOT re-OCR 257K PDFs).

## Contents

| Table / record | Rows | Source |
|---|---|---|
| `tables/documents.jsonl` | 111,745 | normalized from `documents-classified.jsonl` (v1 base) + v3 role enrichment (id, role, notebook, customer, disk_path, text-layer flags, classified_v3 flag) |
| `tables/files.jsonl` | 38,251 | `jm-die-index-v2.json` (CAD/CAM/g-code: path, customer, machine, kind) |
| blueprint→program joins | 76,205 | `blueprint-program-join-full-v6.jsonl` (referenced in place, not copied) |
| `reports/report-from-jm-tool-die-llc.json` | 1 | named PDF — QuickBooks *Purchases by Vendor Detail*, 2014–2026, 5.28M chars |

Top document roles: NOTE (26,572), SCAN_GENERIC (20,349), SCAN_BUSINESS (12,501), PRINT (7,418). Top JM-DIE file machines: lathe (19,803), okuma (6,092), wire_edm (4,000).

## Design (juliett doctrine)

- **schemaVersion 1.0.0** on every artifact (bump → migration in `mcp-server/src/migrations/`).
- **Atomic writes** — tmp+rename with `finally`-unlink (no tmp-orphan leak, see [[database-expansion-atomic-write-discipline]]).
- **Read-back smoke test** gates the build (manifest + line-count re-read must match).
- **Reuse over re-extract** (R8); big regenerable tables gitignored, lean catalog committed.

## Consumers (PSN)

Charlie (quoting) · Echo (post PDFs) · Hotel (accounting/ERP) **consume** these stores. Juliett owns ingestion + schema + persistence health, not their business logic.

## Rebuild
`node scripts/build-jm-die-database.mjs` (`--dry-run` for plan). Linked to `mcp-server/src/data/jm-die-profile.ts` (117 customers / 21 machines / 24,545 programs).

## Cross-refs
- [[database-expansion-galaxy]] · [[database-expansion-atomic-write-discipline]] · [[database-expansion-schema-versioning]]
- Memory: `reference_juliett_jm_die_database_2026_05_29`
