# Manufacturer Catalog Dedup

Generated: 2026-03-30
Task anchor: `SQ2-0-CENSUS`
Corpora:
- `H:\PRISM\MANUFACTURER_CATALOGS`
- `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MANUFACTURER_CATALOGS`

## Finding

The active and archive manufacturer catalog corpora currently behave like the same mirrored dataset, not two distinct knowledge pools.

## Evidence

- Active file count: `116`
- Archive file count: `116`
- Filename matches across active vs archive: `116`
- Filename plus byte-length matches: `116`
- Sample SHA-256 spot checks matched on representative files:
  - `01-Global-CNC-Full-Catalog-2023.pdf` -> `35F361CF1592FD2B...`
  - `Accupro 2013.pdf` -> `69AFA75892B23406...`
  - `REGO-FIX Catalogue 2026 ENGLISH.pdf` -> `26F5B043E50F9C7A...`
  - `YU25_America.pdf` -> `F8E84D5999976C46...`
  - `ZK12023_DEGB RevA EMUGE Katalog 160.pdf` -> `4CA5E5F663995ABB...`

## Operational Decision

- Treat `H:\PRISM\MANUFACTURER_CATALOGS` as the working-source mirror for ongoing `SQ2` execution.
- Treat `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MANUFACTURER_CATALOGS` as backup provenance, not a separate extraction queue.
- Do not schedule both corpora independently for `SQ2-1`.

## Canonical Dedup Rule

For this corpus family:

1. group duplicates by filename first
2. confirm with byte length when available
3. preserve archive path as provenance metadata
4. ingest only the active-path representative unless later hashes prove divergence

## Follow-On Work

- Assign a shared `duplicate_group` for each catalog asset during `LR-1`
- Mark archive-side assets as `validation_state=duplicate` once represented by the active mirror
- Verify whether Box-side manufacturer catalogs are truly unsynced or simply not hydrated locally
