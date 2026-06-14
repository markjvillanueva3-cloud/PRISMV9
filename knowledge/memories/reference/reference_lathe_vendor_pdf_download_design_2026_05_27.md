---
name: reference-lathe-vendor-pdf-download-design-2026-05-27
description: Design notes for U-LATHE-VENDOR-PDF-DOWNLOAD — operator-driven wget of manufacturer catalog PDFs into resources/MANUFACTURER_CATALOGS/uploaded/. Lima's pypdf extractor handles parsing automatically once PDFs land.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.192Z
aliases: reference_lathe_vendor_pdf_download_design_2026_05_27
---


# Vendor PDF download workflow design

## Why this exists

Tier-B vendors (11 of 25) + H-class CBN expansion (iter115) + machine-vendor models all need manufacturer-published curves to populate the master index. Free-text YouTube transcripts give application context; PDF catalogs give the actual SFM/feed ranges + life-curves. The pipeline can't fabricate these — operator must wget the source PDFs.

## Target downloads (priority order)

### Tier 1: H-class CBN expansion (iter115 dependency)
- Sumitomo BNX hard-turning catalog
- Mitsubishi Materials MB8000/MB8115 catalog
- Sandvik Coromant CB7015-series technical brochure
- Kennametal KB1340/KB1610 CBN catalog

### Tier 2: Tier-B tooling brand expansion (iter9 follow-up)
For each of the 11 tier-B brands lacking grade tables, fetch:
- General turning catalog (master grade table)
- Application guide (operation-specific recommendations)
- New-product brochures (last 12 months)

11 brands × 2-3 PDFs each = ~25-30 PDFs

### Tier 3: Machine vendor specs (U-LATHE-MACHINE-VENDOR-MODELS dependency)
For each JM-fleet machine model:
- Operator manual (programming + setup)
- Parts book (P/N for spares)
- Alarm book (codes + fixes)
- Kinematics doc (axis travels + spindle thermal)

Per [[feedback_jm_machine_manual_coverage_doctrine]] — JM fleet has Okuma LB-3000 + Haas ST-series + Mazak QT-series + Doosan Puma. Approximate 4 × 4 = 16 PDFs.

### Tier 4: Standards + reference
- ISO 1832 (turning insert designation)
- ANSI B212.4 (indexable insert holders)
- ISO 513 (material group classification)
- AISI/SAE alloy hardness reference

Approximate 8-12 standards PDFs.

## Total scope

~80-100 PDFs across 4 tiers.

## Operator-driven workflow

This unit is mostly operator manual work — `wget` or browser-download into `H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded/`. The system side is:

1. **Build a download manifest** — `state/shared/vendor-pdf-download-manifest.json` listing each PDF with: vendor, title, URL, expected-path, priority-tier, status (pending/downloaded/parsed)
2. **Operator picks tier 1 first**, runs `wget -i <urls.txt>` into the upload directory
3. **lima's pypdf page-by-page extractor** auto-detects new PDFs (or invoked manually) → page records JSONL
4. **whiskey integrates** the page records into `lathe-tribal-master-index-2026-05-26.json` with operator review

## Manifest schema

```json
{
  "schemaVersion": "1.0.0",
  "manifest_id": "lathe-vendor-pdfs-2026-05-27",
  "pdfs": [
    {
      "id": "sumitomo-bnx-2026",
      "vendor": "Sumitomo",
      "title": "BNX Series CBN Inserts for Hard Turning",
      "url": "https://www.sumitool.com/.../bnx_catalog.pdf",
      "expected_path": "resources/MANUFACTURER_CATALOGS/uploaded/sumitomo-bnx-2026.pdf",
      "priority": "tier-1",
      "size_estimate_kb": null,
      "status": "pending",
      "iso_groups_expected": ["H-30", "H-35"],
      "expected_grades": ["BNX1", "BNX4", "BNX10", "BNX20"],
      "operator_notes": null,
      "downloaded_at": null,
      "parsed_at": null,
      "page_count": null,
      "extractor_run_id": null
    }
  ],
  "tiers": {
    "tier-1": { "count": 4, "downloaded": 0, "parsed": 0 },
    "tier-2": { "count": 25, "downloaded": 0, "parsed": 0 },
    "tier-3": { "count": 16, "downloaded": 0, "parsed": 0 },
    "tier-4": { "count": 10, "downloaded": 0, "parsed": 0 }
  }
}
```

## Status state machine

```
pending → downloaded → parsing → parsed → integrated
              ↓                       ↓        ↓
           failed                  failed   conflict
                                            (operator review)
```

R12 fail-loud per transition:
- `pending → downloaded` — operator must `touch` the manifest line OR a watcher script detects new file in upload dir
- `downloaded → parsed` — lima's extractor emits page records; watcher updates manifest
- `parsed → integrated` — whiskey runs `integrate-pdf-into-master-index.mjs` (script TBD) with operator confirmation

## What the system can pre-build

Even though operator does the download:
1. **Manifest CRUD scripts** — `scripts/vendor-pdf-manifest.mjs {add,list,status,promote,reject}`
2. **Watcher** — `scripts/watch-uploaded-pdfs.mjs` to auto-update status when new files appear
3. **Integration script** — `scripts/integrate-pdf-into-master-index.mjs` takes parsed page records + emits master-index patch (operator reviews before commit)
4. **Tier-priority dashboard** — `state/shared/dashboards/vendor-pdf-download-status.html` showing per-tier progress

## Estimated scope

- Manifest scripts: ~250 LOC
- Watcher: ~100 LOC
- Integration script: ~300 LOC (master-index patching is non-trivial — schema validation + conflict detection + diff preview)
- Dashboard HTML generator: ~150 LOC
- Tests: ~250 LOC
- Total: ~1,050 LOC + operator work (~10 hours of manual wget + review)

## Why P1 not P0

P0 path works on existing 14-vendor master index. P1 expansion adds H-class CBN + 11 tier-B vendors = breadth, not blocker. Without it, wizard works for 80% of JM-Die jobs (which run ISO-P/M/K work).

## Anti-patterns to prevent

- ❌ Auto-scraping vendor websites for catalog PDFs — manufacturers consider their grade tables proprietary; **always operator-initiated download, never bot**
- ❌ Integrating PDF data into master index without operator review — vendor curves vary by region (metric vs imperial, EU vs NA naming); silent integration = polluted index
- ❌ Hosting downloaded PDFs publicly — per [[feedback_no_public_h_drive]], stays internal-only
- ❌ Cross-vendor grade-equivalence-mapping without source validation — premature equivalence claims when actual cutting tests would show differences

## Related

- [[reference_lathe_h_class_cbn_expansion_design_2026_05_27]] — Tier-1 priority
- [[feedback_jm_machine_manual_coverage_doctrine]] — Tier-3 priority justification
- [[feedback_use_lima_pypdf_page_extractor]] — extraction tool already shipped
- [[feedback_no_public_h_drive]] — internal-only constraint
- [[reference_whiskey_lathe_next_session_p0_implementation_roadmap_2026_05_27]] — this is P1 follow-up after P0 path
- `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` — integration target
- `resources/MANUFACTURER_CATALOGS/uploaded/` — landing directory
