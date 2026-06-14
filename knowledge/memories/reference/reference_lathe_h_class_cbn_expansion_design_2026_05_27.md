---
name: reference-lathe-h-class-cbn-expansion-design-2026-05-27
description: Design notes for U-LATHE-H-CLASS-CBN-EXPANSION — flesh out ISO-H (hardened steel + chilled cast iron) grade table with Sumitomo BNX, Mitsubishi MB8000, and Sandvik CB7015 CBN grades. Closes ISO-H sparse-coverage gap in master index.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.188Z
aliases: reference_lathe_h_class_cbn_expansion_design_2026_05_27
---


# H-class CBN expansion design

## Why this exists

`lathe-tribal-master-index-2026-05-26.json` Layer 2 has thin ISO-H coverage. The iter46 corpus add (CBN vs Carbide for Hard Turning, Haas Automation) introduced the category but the master index still has <5 H-grade entries. Hard turning is a high-value technique (replaces grinding, 5× faster, surface finish to Ra 0.4 µm) — wizard MUST recommend H-class grades for HRC > 45 materials.

## Target grades to add

### Sumitomo BNX-series (CBN)
- **BNX1** — CBN-low (50% CBN content), uncoated, base for general HRC 45-55 work
- **BNX4** — CBN-medium, PVD-coated, interrupted-cut tolerance (lock/cam/spline work)
- **BNX10** — CBN-high (90% CBN), uncoated, continuous-cut HRC 60+ (bearings, dies)
- **BNX20** — CBN-high, PVD-coated, premium edge-life for production-volume hard turning

### Mitsubishi MB8000-series (CBN)
- **MB8015** — CBN-low (45% CBN), tolerates interrupted-cut
- **MB8025** — CBN-medium, balanced wear + impact
- **MB8115** — CBN-high (88% CBN), PVD-coated TiAlN, top-of-line for production hard turn
- **MBC020** — CBN-high uncoated, finishing-only on HRC 60+ continuous

### Sandvik CB7015-series (CBN)
- **CB7015** — CBN-low, multi-coating, general HRC 45-60
- **CB7115** — CBN-medium, PVD-coated, balance of life + toughness
- **CB7525** — CBN-high (90% CBN), TiAlN/Al2O3 multilayer coating, hardened-steel finishing
- **CB7050** — CBN-medium, for interrupted hard turning (shoulder + bore + radial features)

## Per-grade payload (schema matches master index)

```json
{
  "grade": "BNX10",
  "vendor": "Sumitomo",
  "geometry_compatible": ["C", "D", "S", "W"],
  "iso_group_fit": ["H-30", "H-35"],
  "hardness_range_HRC": [55, 65],
  "coating": null,
  "cbn_content_pct": 90,
  "suggested_vc_sfm": [400, 800],
  "suggested_fz_ipr": [0.003, 0.008],
  "max_doc_mm": 0.15,
  "life_minutes_at_target_vc": 25,
  "interrupted_cut_capable": false,
  "best_application": "continuous hard turning, finishing only",
  "anti_patterns": [
    "interrupted cut (chipping risk)",
    "heavy DOC > 0.2mm (catastrophic edge failure)",
    "wet machining (CBN-low chemistry doesn't like coolant — dry only)"
  ]
}
```

## Validation rules per H-grade (wizard-side)

1. **CBN-low (45-50% content) for HRC 45-55** — outside this hardness range → suggest BNX10/MB8115/CB7525 instead
2. **CBN-high (85-95%) for continuous-cut only** — if program has interrupted feature (slot, keyway, bore-out radial) → suggest CBN-medium grade
3. **PVD-coated CBN ONLY when shop has it in stock** — uncoated CBN runs hotter but at lower SFM; coated allows higher SFM at same edge life
4. **Dry vs wet** — CBN chemistry varies by grade; uncoated CBN typically dry-only (per manufacturer)
5. **DOC < 0.15mm for HRC 55+** — heavier DOC saturates CBN thermal capacity → edge failure
6. **Insert geometry: prefer round (R) or strong-corner C/D 0.8+ nose radius** — CBN inserts are brittle, sharp corners fracture

## Implementation steps

1. Open `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json`
2. Add 12 grades total (4 Sumitomo + 4 Mitsubishi + 4 Sandvik) per the per-grade payload schema
3. Cross-reference manufacturer published curves (Sumitomo/Mitsubishi/Sandvik public PDFs in `resources/RESOURCE PDFS/MANUFACTURER_CATALOGS/`)
4. Regenerate index hash + bump schemaVersion
5. Update `indexes.grades_by_iso_p[]` / `_m[]` / `_h[]` arrays accordingly
6. Update `wizard_query_records[]` with new entries
7. Update `ai_query_synonyms{}` to add CBN-related synonyms
8. Add 5-7 tests verifying lookups return H-grade hits for HRC 45+ queries
9. Update `state/shared/dashboards/lathe-corpus-coverage.json` with delta

## Where the data comes from

Manufacturer published curves — NOT free-text videos. The iter84 carbide tooling deep-dive (long-form) covers some of this. The CTE Episode 53 (iter98) "Switching to CBN" gives application-side context but lacks specific grade-curve tables. Need operator wget of:
- Sumitomo BNX catalog PDF
- Mitsubishi Materials hard-turning catalog PDF
- Sandvik Coromant CB7015-series technical brochure

If operator can wget these → lima's pypdf page-by-page extractor parses them → per-grade data extracted automatically.

## Estimated scope

- Manual data entry (with PDF refs): ~12 grades × 5 mins = ~1 hour
- Schema additions + regen: ~30 mins
- Tests: ~150 LOC / 10 cases
- Total: ~2 hours

## Why P1 not P0

The 0% insert-coverage on ALCOA programs (iter7) was generic — most JM-Die work is ISO-P / M / K (steel + stainless + cast iron), not ISO-H. H-class adds capability for premium applications (bearing reconditioning, hardened die-block finishing) but doesn't gate the wizard from delivering the baseline.

## Related

- [[reference_shop_tool_library_bridge_design_2026_05_27]] — Layer 2 source where these grades land
- [[reference_lathe_wizard_vendor_lookup_design_2026_05_27]] — selectInsert returns these for HRC 45+ queries
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — iter46 + iter98 corpus
- [[feedback_use_lima_pypdf_page_extractor]] — for PDF source extraction
- `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` — target file
