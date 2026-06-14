# H:/PRISM/extracted_modules/ — monolith v8.89 wider-catalog extraction

Operator-discoverable index for the `extracted_modules/` stockpile.

## What this is

This directory holds **1048 files** of wider-catalog extraction from the v8.89 PRISM monolith. Categories include `GIANT/` (the 100K-line single-file beasts: PSO_OPTIMIZER 214K, AI_EXPERT_INTEGRATION 204K, KB_CONNECTOR 186K), `ULTRA/`, `MEGA/`, `COMPLETE/`, `FINAL/`, plus typed subdirs `ai_ml_engines/`, `physics_engines/`, `geometry_engines/`, `databases/`, `priority_extraction/`, `complete_extraction/`, `stubs/`.

The sister stockpile `H:/PRISM/extracted/` (740 files) holds the more-curated wave-1 categorized extraction from the same monolith.

## Top WIRE_CANDIDATEs (from classified manifest)

These are the highest-line-count modules with **no existing PRISM engine match** — the highest-leverage absorption targets:

| Lines | File | Dispatcher |
|---:|---|---|
| 214580 | `GIANT/PRISM_PSO_OPTIMIZER.js` | `prism_calc` |
| 204004 | `GIANT/PRISM_AI_EXPERT_INTEGRATION.js` | `prism_ai` |
| 186368 | `GIANT/PRISM_AI_100_KB_CONNECTOR.js` | `prism_ai` |
| 181781 | `GIANT/PRISM_SIGNAL_ENHANCED.js` | `prism_dev` |
| 168511 | `GIANT/PRISM_SUBSCRIPTION_SYSTEM.js` | `prism_dev` |
| 146622 | `ULTRA/PRISM_PHASE6_DEEPLEARNING.js` | `prism_ai` |
| 141869 | `GIANT/PRISM_PRECISION.js` | `prism_dev` |
| 115880 | `ULTRA/PRISM_EKF.js` | `prism_dev` |
| 105609 | `ULTRA/PRISM_NURBS_100.js` | `prism_dev` |
| 91269 | `ULTRA/PRISM_TAYLOR_COMPLETE.js` | `prism_dev` |

Top DATABASEs (registry candidates): `PRISM_VERIFIED_POST_DATABASE_V2` (114K lines), `PRISM_MANUFACTURER_CATALOG_DB` (73K), `PRISM_FIXTURE_DATABASE` (63K).

## How it's wired into PRISM

See `H:/PRISM/extracted/README.md` for the full 4-stage pipeline (manifest → classify → /system-viz → pick-unit queue).

## How operators use it

Per-stockpile filter on the manifest:
```bash
node -e "const j=require('./state/shared/extracted-modules-classified.json'); j.modules.filter(m => m.source_stockpile === 'extracted_modules' && m.dup_status === 'WIRE_CANDIDATE').sort((a,b) => b.lines - a.lines).slice(0,10).forEach(m => console.log(m.lines+'L '+m.recommended_dispatcher+' '+m.path))"
```

## Don't edit files in this directory

This stockpile is **frozen** legacy extraction. Add or modify functionality in `mcp-server/src/engines/` instead.

## Related

- Wiki: `knowledge/wiki/architecture/extracted-modules-pipeline.md`
- Memory: `knowledge/memories/reference/reference_extracted_modules_pipeline_2026_05_26.md`
- Sister stockpile: `H:/PRISM/extracted/README.md`
- Source manifest: `state/shared/extracted-modules-manifest.json` `summary.by_stockpile.extracted_modules` (1048 files)
