---
name: reference-lathe-vendor-expansion-deep-curate-design-2026-05-27
description: Design for U-LATHE-VENDOR-EXPANSION-DEEP-CURATE — populate grade tables for 11 tier-B tooling brands currently named-only in lathe-vendor-expansion-2026-05-26.json. Closes the breadth-vs-depth gap.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.641Z
aliases: reference_lathe_vendor_expansion_deep_curate_design_2026_05_27
---


# Tier-B vendor deep-curate design

## Why this exists

`lathe-vendor-expansion-2026-05-26.json` lists 25 tooling brands but only 14 (tier-A) have full grade tables in `lathe-tribal-master-index-2026-05-26.json`. The other 11 (tier-B) are operator-known but unindexed. Wizard substitution-advisor can't suggest them when tier-A inventory is unavailable.

## The 11 tier-B brands

(Exact list per `tier_b_breadth_to_curate[]` in iter9 file — typical members include:)
1. Dapra (operator-named priority — high cross-sell relevance)
2. PTS-Tools (operator-named priority)
3. Lamina Technologies
4. Korloy
5. Stellram (Allegheny)
6. Caroloy
7. Phoenix Calibration
8. Bytech / Pramet sister
9. SPK (Sumitomo subset)
10. Asahi-Diamond
11. (one more per file)

(Read the file at integration time — list may have rotated since iter9.)

## Per-brand curation scope

For each tier-B brand, populate the same shape as tier-A:

```json
{
  "vendor": "Dapra",
  "tier": "B",
  "grade_count": null,  // populated after curation
  "grades": [
    {
      "code": "...",
      "iso_group_fit": ["..."],
      "geometry_compatible": [...],
      "coating": "...",
      "suggested_vc_sfm": [...],
      "suggested_fz_ipr": [...],
      "life_minutes_at_target_vc": ...,
      "best_application": "...",
      "anti_patterns": [...]
    }
  ],
  "application_focus": "broaching, grooving, parting",  // brand specialty
  "shop_inventory_likelihood": "medium",  // gut-feel
  "operator_named_priority": true,
  "source_pdfs": ["resources/.../dapra-2026.pdf"],
  "curation_status": "complete | partial | pending"
}
```

## Curation sources (preference order)

1. **Manufacturer catalog PDF** (most authoritative — see U-LATHE-VENDOR-PDF-DOWNLOAD for the download workflow)
2. **YouTube product demos** — extract via existing pipeline; gives application context not grade-tables
3. **Trade-magazine articles** — when MMS or CTE reviews a vendor's product line
4. **Distributor websites** (Travers / MSC / Carbide Depot) — catalog SKUs with grade refs

## Curation workflow per brand (operator + Claude collaboration)

```
Step 1: Operator runs wget on manufacturer catalog → resources/MANUFACTURER_CATALOGS/uploaded/<vendor>-<date>.pdf
Step 2: lima's pypdf extractor auto-runs → emits page records JSONL
Step 3: Claude reads JSONL (NOT the full PDF — too long)
Step 4: Claude proposes grade table draft → state/shared/proposed-grades-<vendor>.json
Step 5: Operator reviews draft, marks accept/reject/modify per grade
Step 6: Whiskey integrates accepted grades into master-index, bumps schemaVersion
Step 7: Tests pass + commit
```

R12 fail-loud at every step: no silent integration; if pypdf extraction yields zero relevant pages, throw + surface to operator.

## Quality gates per grade

Don't accept a grade into master-index unless:
- ISO group fit is named (P/M/K/N/S/H + sub-grade like P-30)
- SFM range has min + max (point estimate = reject)
- Geometry compatibility lists ≥1 ANSI code
- Coating named or "uncoated" explicitly
- Source PDF page reference recorded

This prevents "fluff entries" — a vendor name with empty data is worse than not listing them.

## Special handling for Dapra (operator-named priority)

Operator named Dapra in the original directive. Dapra specializes in:
- Grooving + parting inserts (depth-specific designs)
- "AddForceCut" series (4-edge turn/groove)
- Single-edge parting tools (Gold-Flex)

Dapra entries should ALL include `operator_named_priority: true` and surface first in wizard substitution-advisor when grooving/parting ops are detected. (Iter89 captured Ingersoll's Gold-Flex 1045-steel demo as a co-evidence node.)

## Wiki entries to generate

For each tier-B vendor that gets curated, write a wiki overview at `knowledge/wiki/entities/vendor-<name>.md`:
- Brand history (1-2 paragraphs)
- Specialty focus
- Top-3 grade recommendations per ISO group
- Inventory likelihood at JM-Die (operator-confirmed gut feel)
- Cross-reference to corpus videos that mention them

## Estimated scope

- Per-vendor curation (read PDFs + propose draft + integrate): ~2 hours each × 11 = ~22 hours of operator+Claude work
- Wiki entries: ~30 mins each × 11 = ~5.5 hours
- Integration scripts (reuse from vendor-pdf-download iter118 work): 0 LOC new
- Tests: 60 LOC / 22 cases (2 per vendor × 11)
- Total: ~27.5 hours operator+Claude, ~60 LOC new code

## Why P1 not P0

Tier-A grade tables already cover most JM-Die work — primarily ISO-P (Kennametal/Sandvik) + ISO-M (most vendors). Tier-B fills gaps in specialty niches (grooving with Dapra) + provides substitution alternates when tier-A is out-of-stock. Not blocking the wizard from delivering baseline output.

## Anti-patterns

- ❌ Curating from secondary sources (distributor SKU sheets) when manufacturer catalog is available → second-hand data has translation drift
- ❌ Including grades that aren't in current production — vendors deprecate grades regularly; check catalog date
- ❌ Treating Sumitomo BNX (already covered in iter115 H-class expansion) as a tier-B duplicate effort
- ❌ Single-pass curation without operator review on each grade — high false-positive rate at this fineness

## Related

- [[reference_lathe_vendor_pdf_download_design_2026_05_27]] — operator runs this first
- [[reference_lathe_h_class_cbn_expansion_design_2026_05_27]] — separate workflow for H-class (don't double-cover)
- [[reference_shop_tool_library_bridge_design_2026_05_27]] — bridge's substitution-advisor consumes these new grades
- [[reference_lathe_wizard_vendor_lookup_design_2026_05_27]] — selectInsert's "vendor inventory bias" scoring needs full vendor coverage
- [[reference_lathe_vendor_graph_node_design_2026_05_27]] — system-viz /tier_b sub-tree gets populated by this work
- `mcp-server/data/ingestion_cache/lathe-vendor-expansion-2026-05-26.json` — source list of 11 tier-B brands
- `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` — integration target
