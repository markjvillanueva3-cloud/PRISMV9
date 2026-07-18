# JM Die Database (slot:juliett — database-expansion)

Schema-versioned, queryable consolidation of the **JM Die / DocuStrata corpus**. Built by
`scripts/build-jm-die-database.mjs`. Owner: **juliett** (primary slot for DocuStrata + JM-file data).

## What it is

The DocuStrata archive (`H:/PRISM/Docustrata/`, **257,992 files**) was already extracted + classified
by `docustrata-pipeline.py` into `H:/PRISM/Docustrata/.index/*.jsonl`. This database **reuses that
paid-for extraction** (R8 — does NOT re-OCR 257K PDFs) and consolidates it into a normalized, rolled-up,
schema-versioned store, plus the named J.M. Tool & Die report.

## Layout

| Path | Committed? | Contents |
|------|-----------|----------|
| `manifest.json` | ✅ (6 KB) | schemaVersion, corpus stats, role/notebook/machine rollups, source registry, report record, profile link, smoke-test |
| `reports/report-from-jm-tool-die-llc.json` | ✅ (4 KB) | The named PDF as a record — metadata + sha256 + 4 KB text preview |
| `tables/documents.jsonl` | ⛔ gitignored (56 MB) | 111,745 DocuStrata doc records (normalized: id, role, notebook, customer, disk_path, text-layer flags; `classified_v3` flag marks the 73,506 v3-enriched rows) |
| `tables/files.jsonl` | ⛔ gitignored (10 MB) | 38,251 JM-DIE files (CAD/CAM/g-code) — path, customer, machine, kind |
| `reports/*.txt` | ⛔ gitignored (5 MB) | Full extracted report text |

Big tables are gitignored because they're **regenerable** from the local `.index` sources; the committed
catalog (manifest + report.json) is the durable, shareable surface.

## Contents (as of 2026-05-29 build)

- **111,745** classified DocuStrata documents (top roles: NOTE, SCAN_GENERIC, SCAN_BUSINESS, PRINT; notebooks: All Files, My Notebook, JMD Scans). Of the **73,506 v3-processed** docs, **56,887 have a text layer** (the text-layer/disk-path signal is evaluated only on the v3 subset; the other 38,239 base-only docs are unevaluated → null/false).
- **38,251** JM-DIE files (top machines: lathe 19,803 · okuma 6,092 · wire_edm 4,000).
- **76,205** blueprint→program joins (registered by reference to `blueprint-program-join-full-v6.jsonl`, not copied).
- **The named report** `Report_from_J.M._Tool__Die_LLC.pdf` = a QuickBooks *Purchases by Vendor Detail* report, **May 2014 – May 2026** (5.28 M chars, text PDF — no OCR needed).
- Linked to canonical config `mcp-server/src/data/jm-die-profile.ts` (117 customers / 21 machines / 24,545 programs).

## Rebuild

```bash
node scripts/build-jm-die-database.mjs            # full build (atomic, read-back smoke test)
node scripts/build-jm-die-database.mjs --dry-run  # plan + counts, no writes
```

## Juliett doctrine applied
- Atomic tmp+rename with `finally`-unlink (no tmp-orphan leak — see `reference_juliett_tmp_orphan_leak_2026_05_29`).
- `schemaVersion: 1.0.0` on every artifact (bump → migration in `mcp-server/src/migrations/`).
- Read-back smoke test gates success (a write isn't done until read back).
- Reuse over re-extract (R8) — the `.index` JSONLs are the source tables; this is the consumable product.
