# Real manufacturer-catalog PDF ingestion template

Operator: drop manufacturer-published PDF catalogs into the upload directory, then run
lima's pypdf page-by-page extractor. Output feeds master-index vendor_grades + tribal-query corpus.

## File locations

- **PDF uploads**: `resources/MANUFACTURER_CATALOGS/uploaded/<vendor>-<date>.pdf`
- **Page-extract output**: `mcp-server/data/ingestion_cache/pypdf-pages-<vendor>-<date>.jsonl`
- **Master-index target**: `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` (extend `vendors.<vendor>.grades[]`)

## Priority tier (from iter118 design)

### Tier 1: H-class CBN expansion (iter115 dependency)
| Vendor | Catalog | Expected grades |
|--------|---------|-----------------|
| Sumitomo | BNX series hard-turning catalog | BNX1, BNX4, BNX10, BNX20 |
| Mitsubishi | Materials MB8000/MB8115 catalog | MB8015, MB8025, MB8115, MBC020 |
| Sandvik | Coromant CB7015-series technical brochure | CB7015, CB7115, CB7525, CB7050 |
| Kennametal | KB1340/KB1610 CBN catalog | KB1340, KB1610, KB5610, KB7050 |

### Tier 2: tier-B brand grade tables (iter120)
11 brands from `lathe-vendor-expansion-2026-05-26.json` tier-B list (Dapra, PTS-Tools, Lamina, Korloy, Stellram, etc.) — each needs 2-3 PDFs

### Tier 3: JM-fleet machine manuals (iter119)
All 7 Okuma lathe variants (LTH-01..LTH-07) per `jm-die-profile.ts` — operator manual + alarm book + parts book + kinematics doc per machine

### Tier 4: ISO standards
ISO 1832 (insert designation), ANSI B212.4 (insert holders), ISO 513 (material groups), AISI/SAE alloy hardness reference

## Ingestion workflow

```
1. Operator: wget <vendor-catalog-url> -O resources/MANUFACTURER_CATALOGS/uploaded/<vendor>-<date>.pdf
2. Operator (or scheduled task): python scripts/extract-jm-die-corpus-page-by-page.py <pdf-path>
   → emits: mcp-server/data/ingestion_cache/pypdf-pages-<vendor>-<date>.jsonl
3. Claude (whiskey or peer): read JSONL, propose grade-table additions
   → emits: mcp-server/data/ingestion_cache/proposed-grades-<vendor>-<date>.json
4. Operator: review proposed-grades, accept/reject/modify per grade
5. Whiskey: integrate accepted grades into master-index, bump schemaVersion, commit
6. Re-run real-data-batch to verify wizard now picks the new grades when applicable
```

## R12 fail-loud rules

1. **Never integrate without operator review** — manufacturer published curves vary by region (metric vs imperial, EU vs NA naming); silent integration = polluted index
2. **Source-PDF page reference required** per grade — provenance must trace back to a specific catalog page
3. **No grade with empty SFM range** — single point estimate = reject
4. **No grade without ISO-group fit** — must name at least one sub-group (P-30, M-25, etc.)
5. **No grade without ANSI geometry** — must name at least one compatible code (CNMG, DNMG, etc.)

## Anti-patterns (from iter120 design)

- ❌ Curating from secondary sources (distributor SKU sheets) when manufacturer catalog is available — second-hand data has translation drift
- ❌ Including grades that aren't in current production — vendors deprecate grades regularly; check catalog date
- ❌ Treating Sumitomo BNX (already covered in iter115 H-class expansion) as a tier-B duplicate effort
- ❌ Single-pass curation without operator review — high false-positive rate at this fineness

## Estimated effort

Per-vendor: 2 hours operator+Claude collaboration (read PDFs + propose + integrate + test).
Tier 1: ~8 hours total (4 vendors). Tier 2: ~22 hours. Tier 3: ~16 vendor manuals at ~3h each = ~48h. Tier 4: ~8h.

## Related

- `[[reference_lathe_vendor_pdf_download_design_2026_05_27]]` — full design memo
- `[[reference_lathe_h_class_cbn_expansion_design_2026_05_27]]` — Tier 1 specifics
- `[[reference_lathe_machine_vendor_models_design_2026_05_27]]` — Tier 3 specifics
- `[[reference_lathe_vendor_expansion_deep_curate_design_2026_05_27]]` — Tier 2 specifics
- `[[feedback_use_lima_pypdf_page_extractor]]` — extractor tool already shipped
- `[[feedback_no_public_h_drive]]` — internal-only constraint
