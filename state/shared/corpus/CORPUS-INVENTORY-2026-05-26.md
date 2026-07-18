# CAM-AI-TRAINING-MS0 — Corpus Inventory Snapshot v2 (2026-05-26)

Slot: kilo · Branch: slot/kilo · Final corpus state after iter 22-91.

## On-disk corpus files (state/shared/corpus/)

### Catalog tracks (iter 22-69, 5-system foundation)

| File | Records | Iter | Description |
|------|--------:|-----:|-------------|
| `cam-coverage-{hypermill,mastercam,esprit,fusion360}.json` | 23/17/18/48 (100%) | 44 | Per-system function-to-CamOperation coverage |
| `cam-coverage-nxcam.json` | 35/37 (95%) | 74 | NX CAM coverage (2 fbm meta-ops unmapped) |
| `cam-templates-{hypermill,mastercam,esprit,fusion360,nxcam}.jsonl` | 23+17+18+48+35 = **141** | 47, 74 | CamTemplate JSONL per system |
| `cam-lora-dataset.jsonl` | 424 | 50 | v1 LoRA dataset (4 prompt patterns) |
| `cam-lora-dataset-v2.jsonl` | 987 | 67, 74 | v2 LoRA dataset (7 prompt patterns × 5 systems) |
| `cam-lora-dataset-merged.jsonl` | 987 | 68 | v1+v2 deduplicated merge |
| `cam-rag-index.jsonl` | 141 | 51, 75 | RAG retrieval records (5 systems) |
| `wiki/<system>/*.md` | 141 (23+17+18+48+35) | 52, 75 | Per-(op,system) markdown wiki entries |
| `cam-tribal-tips.jsonl` | 928 | 53, 75 | Tribal tips from catalog descriptions (5 systems) |
| `cam-training-manifest.json` | 1775 unified (v2.0.0) | 54, 88 | Unified manifest aggregating all corpora |
| `cam-training-manifest.csv` | per-system rollup | 62 | Spreadsheet view of manifest |
| `cam-ai-dispatcher-manifest.json` | 23 engines × 56 actions | 58 | MCP wiring map |
| `cam-ai-action-schemas.json` | 60 action schema stubs | 66 | Per-action {params, returns} type stubs |

### Train/holdout splits

| File | Records | Iter | Description |
|------|--------:|-----:|-------------|
| `cam-lora-train.jsonl` | 642 | 71 | Per-template train split (sha256 deterministic) |
| `cam-lora-holdout.jsonl` | 100 | 71 | Per-template holdout (15%) |
| `cam-master-train.jsonl` | 3206 | 90 | Master train split (85.1%) |
| `cam-master-holdout.jsonl` | 560 | 90 | Master holdout (14.9%) |

### Cross-system + reasoning tracks (iter 72-86)

| File | Records | Iter | Description |
|------|--------:|-----:|-------------|
| `cam-cross-system-equivalence.json` | 30 ops grouped | 72, 75 | Operation equivalence map across 5 systems |
| `cam-cross-system-translation.jsonl` | 108 | 72, 75 | Cross-vendor translation tuples (5-system) |
| `cam-param-recommendation.jsonl` | 691 | 73, 75 | Per-(op,parameter) recommendation tuples |

### Physics-grounded tracks (iter 77-81)

| File | Records | Iter | Description |
|------|--------:|-----:|-------------|
| `cam-speeds-feeds-matrix.csv` + `cam-speeds-feeds-tuples.jsonl` | 42 cells / 210 tuples | 77 | Material × ToolFamily speeds-feeds matrix |
| `cam-tool-life-tuples.jsonl` | 726 | 78 | Taylor V·T^n=C tool-life grid (11 mat × 11 tools × 6 speeds) |
| `cam-kienzle-force-grid.csv` + `cam-kienzle-force-tuples.jsonl` | 264 | 79 | Fc=kc1.1·(h/h0)^-mc·h·b grid (11 mat × 6 h × 4 b) |
| `cam-deflection-grid.csv` + `cam-deflection-tuples.jsonl` | 320 | 80 | δ=FL³/(3EI) deflection grid (5 tool-mat × 4 L × 4 d × 4 F) |
| `cam-physics-tuples-merged.jsonl` | 1520 | 81 | Unified physics-grounded corpus |

### Engineering-knowledge tracks (iter 83-86)

| File | Records | Iter | Description |
|------|--------:|-----:|-------------|
| `cam-iso286-fit-tuples.jsonl` | 312 | 83 | ISO 286-1 IT-grade fit classification (13 bands × 8 grades) |
| `cam-surface-finish-tuples.jsonl` | 52 | 84 | Ra→finishing-strategy mapping |
| `cam-coolant-decision-tuples.jsonl` | 54 | 85 | Coolant strategy rule-chain decisions |
| `cam-operator-gate-tuples.jsonl` | 42 | 86 | Pre-cut operator checklist + S(x) scenarios |

### MASTER unified training set (iter 82, 87)

| File | Records | Iter | Description |
|------|--------:|-----:|-------------|
| **`cam-master-training-set.jsonl`** | **3766** | 87 | All 8 tracks merged, dedup, track-annotated |
| `cam-master-training-set-summary.json` | per-track counts | 87 | Track summary |
| `cam-master-corpus-validation.json` | 3766/3766 PASS | 91 | Provenance + operator-constraint validator report |

### Documentation + integration tests

| File | Records | Iter | Description |
|------|--------:|-----:|-------------|
| `CAM-AI-TRAINING-MS0-TEST-MANIFEST.md` | 449 tests | 56 | Per-engine test count table |
| `CAM-AI-TRAINING-MS0-CLOSEOUT.md` | full report | 65 | Initial close-out spec |
| `CORPUS-INVENTORY-2026-05-26.md` | this file | 69, 92 | Inventory snapshot v2 |
| `mcp-server/src/__tests__/CAMCorpusInventoryIntegrationTest.test.ts` | 29 tests, all PASS | 70, 76, 89 | Vitest integration suite |

## Aggregate ship totals (v2)

- **Templates:** 141 (real catalog data, 5 systems)
- **LoRA tuples (template-track v2):** 987 (7 prompt patterns × 141 templates)
- **LoRA tuples (physics-grounded):** 1520 (speeds-feeds + tool-life + Kienzle + deflection)
- **LoRA tuples (param recommendation):** 691 (with 493 catalog defaults)
- **LoRA tuples (cross-system translation):** 108 (5-system)
- **LoRA tuples (ISO 286 fit classification):** 312
- **LoRA tuples (surface finish mapping):** 52
- **LoRA tuples (coolant decisions):** 54
- **LoRA tuples (operator gate):** 42
- **MASTER training set total:** **3766** (zero duplicates, every tuple validated)
- **MASTER train split:** 3206 (85.1%)
- **MASTER holdout split:** 560 (14.9%)
- **RAG records:** 141
- **Wiki entries:** 141
- **Tribal tips:** 928
- **Coverage manifests:** 5 (4 at 100%, NX CAM at 95%)
- **Engines shipped:** 24
- **Tests passing:** 449 + 29 integration = 478
- **Total unified artifacts (manifest count):** 1775 + 3766 master = comprehensive coverage

## Real-data provenance enforcement

Every tuple in the master training set (3766/3766 validated iter 91) carries verbatim:

```json
{
  "metadata": {
    "track": "<one of 8 track names>",
    "provenance": {
      "realDataOnly": true,
      "sourceMilestone": "CAM-AI-TRAINING-MS0",
      "sourceSlot": "kilo",
      "operatorConstraint": "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)"
    }
  }
}
```

## Regen commands

```bash
# Re-emit per-system catalogs:
rtk node H:/prism-slot-kilo/scripts/emit-4-system-coverage.mjs
rtk node H:/prism-slot-kilo/scripts/emit-templates-4-systems.mjs
rtk node H:/prism-slot-kilo/scripts/emit-templates-nxcam.mjs

# Re-emit LoRA tracks:
rtk node H:/prism-slot-kilo/scripts/emit-cam-lora-dataset.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-lora-dataset-v2.mjs
rtk node H:/prism-slot-kilo/scripts/merge-cam-lora-datasets.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-lora-eval-split.mjs

# Re-emit downstream artifacts:
rtk node H:/prism-slot-kilo/scripts/emit-cam-rag-index.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-wiki-entries.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-tribal-tips.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-training-manifest.mjs
rtk node H:/prism-slot-kilo/scripts/export-cam-training-manifest-csv.mjs

# Re-emit cross-system + reasoning:
rtk node H:/prism-slot-kilo/scripts/emit-cam-cross-system-equivalence.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-param-recommendation-dataset.mjs

# Re-emit physics:
rtk node H:/prism-slot-kilo/scripts/emit-cam-speeds-feeds-matrix.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-tool-life-grid.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-kienzle-force-grid.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-deflection-grid.mjs
rtk node H:/prism-slot-kilo/scripts/merge-cam-physics-tuples.mjs

# Re-emit engineering knowledge:
rtk node H:/prism-slot-kilo/scripts/emit-cam-iso286-fit-tuples.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-surface-finish-tuples.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-coolant-decision-tuples.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-operator-gate-tuples.mjs

# MASTER merge + split + validate:
rtk node H:/prism-slot-kilo/scripts/merge-cam-master-training-set.mjs
rtk node H:/prism-slot-kilo/scripts/emit-cam-master-holdout-split.mjs
rtk node H:/prism-slot-kilo/scripts/validate-cam-master-corpus.mjs

# Health check:
rtk node H:/prism-slot-kilo/scripts/verify-cam-training-corpus.mjs

# Integration test:
cd H:/prism-slot-kilo/mcp-server && rtk npx vitest run src/__tests__/CAMCorpusInventoryIntegrationTest.test.ts
```
