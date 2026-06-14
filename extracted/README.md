# H:/PRISM/extracted/ — monolith v8.89 wave-1 extraction stockpile

Operator-discoverable index for the `extracted/` legacy monolith stockpile.

## What this is

This directory holds **740 files** extracted from the v8.89 PRISM monolith (`986,622`-line HTML file at `C:/PRISM/_BUILD/PRISM_v8_89_002_TRUE_100_PERCENT/`). Categories: `engines/` (physics + ai_ml + cad_cam + post_processor + simulation + optimization), `materials/` + `materials_complete/` + `materials_v9_complete/`, `machines/`, `tools/`, `controllers/`, `algorithms/`, `formulas/`, `constants/`, `units/`, `mit/`, `infrastructure/`, `integration/`, `business/`, `knowledge_bases/`.

The sister stockpile `H:/PRISM/extracted_modules/` (1048 files, including `GIANT/` + `ULTRA/` + `MEGA/` + `COMPLETE/` subdirs) holds a wider catalog from the same monolith.

## How it's wired into PRISM

As of **2026-05-26 (slot:papa /goal /loop iter1)**, both stockpiles are cataloged + classified + bridged into the PSN:

| Stage | Script | Output |
|---|---|---|
| 1. Walk | `scripts/build-extracted-modules-manifest.mjs` | `state/shared/extracted-modules-manifest.json` (1788 rows, SHA-256 per file) |
| 2. Classify | `scripts/classify-extracted-modules.mjs` | `state/shared/extracted-modules-classified.json` (dup_status + matched_engine + recommended_dispatcher per row) |
| 3. /system-viz | `scripts/generate-extracted-modules-detail-features.mjs` | 653 L10 file-level nodes + 786 bridge/wire edges |
| 4. Pick-unit queue | `scripts/generate-extracted-modules-wire-queue.mjs` | `state/shared/extracted-modules-wire-queue.json` (top-K WIRE_CANDIDATEs) |

Classification breakdown (1788 modules):
- **1259 WIRE_CANDIDATE** — no existing PRISM equivalent, ready to absorb
- **134 PARTIAL_OVERLAP** — fuzzy match to existing engine, extract novel features
- **111 DUP_KEEP_EXISTING** — already mirrored in `mcp-server/src/engines/`
- **208 DATABASE** — registry candidates
- **57 STUB** + **19 META** — skip / index-only

## How operators use it

```bash
# Regenerate the artifacts before any pickup pass
node scripts/build-extracted-modules-manifest.mjs
node scripts/classify-extracted-modules.mjs
node scripts/generate-extracted-modules-detail-features.mjs
node scripts/generate-extracted-modules-wire-queue.mjs --top 50

# Pick the next legacy module worth absorbing
node -e "const j=require('./state/shared/extracted-modules-wire-queue.json'); j.queue.slice(0,10).forEach(q => console.log(q.est_lines+'L '+q.recommended_dispatcher+' '+q.unit_id))"
```

## Don't edit files in this directory

This stockpile is **frozen** legacy extraction. Add or modify functionality in `mcp-server/src/engines/` instead, then mark the corresponding `extracted/` file as superseded via the duplicationGuardEngine.

## Related

- Wiki: `knowledge/wiki/architecture/extracted-modules-pipeline.md`
- Memory: `knowledge/memories/reference/reference_extracted_modules_pipeline_2026_05_26.md`
- Predecessor (golf 5/24): `knowledge/wiki/architecture/extracted-modules-features.md` (50 category-level roost nodes)
- Sister stockpile: `H:/PRISM/extracted_modules/README.md`
- Source monolith: `state/shared/extracted-modules-manifest.json` `summary.by_stockpile.extracted` (740 files)
