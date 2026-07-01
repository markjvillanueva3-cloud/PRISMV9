# JM Die Curriculum Cited Tips

AUTO-GENERATED cited-tip files from the iter9-13 curriculum pipeline.
**Do not edit by hand** — re-emit via `node scripts/generate-cited-tips-from-candidates.mjs`.

## Provenance

| Stage | Iter | Script | Output |
|-------|-----:|--------|--------|
| Page rank + curriculum | 9 | `scripts/generate-training-curriculum.mjs` | `mcp-server/data/ingestion_cache/training-curriculum/jm-die-easy-to-complex.jsonl` |
| Query CLI + re-extract | 10 | `scripts/training-curriculum-query.mjs` + `scripts/extract-cam-domain-pdfs.sh` | 67 .txt extracts under `state/shared/pdf-extracts/jm-die-tribal-wiki/` |
| Full-body candidates | 11 | `scripts/generate-curriculum-tribal-candidates.mjs` | `mcp-server/data/ingestion_cache/curriculum-tribal-candidates/jm-die-curriculum-tribal-candidates.jsonl` |
| Content classifier | 12 | `scripts/lib/jm-die-content-classifier.mjs` (wired into 11) | +26 controllers recovered |
| TS cited-tip emit | 13 | `scripts/generate-cited-tips-from-candidates.mjs` | this directory |

## Source corpus

`H:/PRISM/JM DIE/TRIBAL + WIKI` — 80 PDFs, 1.1 GB. Echo-domain SKIP_REGEX excludes lathe/cad/CS50 (~13 PDFs) per other-slot ownership.

## Files

| File | Tips | Source mix |
|------|-----:|------------|
| `mazak-cited-tips.ts` | 38 | Mazak EIA / Mazatrol Matrix programming manual macros |
| `siemens-cited-tips.ts` | 14 | Sinumerik 840D / TNC patterns from generic CNC PDFs |
| `okuma-cited-tips.ts` | 6 | OSP-P200L-Macturn-Multus operation manual |
| `fanuc-cited-tips.ts` | 3 | Generic Fanuc 30i / 16i patterns |
| `haas-cited-tips.ts` | 1 | Programming Haas CNC Control G-Codes and M-Codes |
| `hurco-cited-tips.ts` | 1 | WinMax Mill Intro Class Workbook |
| `index.ts` | — | Re-exports all per-controller arrays + `JM_DIE_CURRICULUM_CITED_TIPS_INDEX` const |

**Total: 63 curated tips** (31 candidates remain unspecified for future content-classifier improvement).

## Consumer pattern

```typescript
import {
  MAZAK_CITED_TIPS,
  SIEMENS_CITED_TIPS,
  HAAS_CITED_TIPS,
  type CitedTip,
} from "@/data/tribal-tips/jm-die-curriculum";

// Filter by difficulty
const advancedOnly = MAZAK_CITED_TIPS.filter(
  (t) => t.difficulty === "advanced" || t.difficulty === "complex"
);

// Filter by score range
const highScoring = SIEMENS_CITED_TIPS.filter((t) => t.score >= 5.0);

// Each tip is a readonly CitedTip:
//   { id, sourceId, sourceTitle, citation, page, domain,
//     controller, vendor, difficulty, score, bodyLength, body }
```

## Difficulty buckets (from iter9 ranker)

| Bucket | Score range | Semantic |
|--------|------------|----------|
| unscored | < 0.5 | Low-signal prose (no G/M/macro/5-axis markers) |
| easy | < 1.5 | Tutorial / intro / lesson / fundamentals |
| intermediate | < 3.5 | Some G-codes + units, no advanced patterns |
| advanced | < 6.0 | Subprograms / 5-axis / macros / post customization |
| complex | ≥ 6.0 | High-density signal pages (top-tier operator wisdom) |

These cited-tip files contain **only advanced + complex pages** — the 94-candidate filter from iter11.

## Re-emit

When the source corpus changes:

```bash
# 1. Re-extract any new PDFs (idempotent, cache-aware)
bash scripts/extract-cam-domain-pdfs.sh

# 2. Regen curriculum JSONL
node scripts/generate-training-curriculum.mjs

# 3. Regen candidates
node scripts/generate-curriculum-tribal-candidates.mjs

# 4. Re-emit TS files
node scripts/generate-cited-tips-from-candidates.mjs
```

## Coordination

Sibling slots are running parallel extraction pipelines on their own
domain corpora — see foxtrot (milling-pdf-cited-tips), lima (academy),
whiskey (lathe). The pipeline format is unified — JSONL records with
`{filename, pageNum, difficulty, score, signals, body}` shape — so
cross-slot consumers can ingest any slot's emit.
