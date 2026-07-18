# JM DIE curriculum cited tips — emitted TS files

**Generated:** 2026-05-26T23:41:38.990Z
**Slot:** echo · **Milestone:** POST-PDF-NODE-MS0/U-CITED-TIPS-EMIT · **Iter:** 13

## Pipeline
1. iter9: page-by-page curriculum
2. iter10: query CLI + re-extraction (67 PDFs)
3. iter11: full-body candidates (94 advanced/complex pages)
4. iter12: content-classifier (26 controllers recovered)
5. **iter13 (this): per-controller TypeScript cited-tip files**

## Headline
- candidates parsed:    94
- controller files:     6
- index file:           `mcp-server/src/data/tribal-tips/jm-die-curriculum/index.ts`
- output dir:           `mcp-server/src/data/tribal-tips/jm-die-curriculum`

## Per-controller emit
| Controller | Tips | File |
|------------|-----:|------|
| mazak | 38 | mazak-cited-tips.ts |
| siemens | 14 | siemens-cited-tips.ts |
| okuma | 6 | okuma-cited-tips.ts |
| fanuc | 3 | fanuc-cited-tips.ts |
| haas | 1 | haas-cited-tips.ts |
| hurco | 1 | hurco-cited-tips.ts |
| (unspecified — skipped) | 31 | — |

## Consumer wiring
Imports: `import { HAAS_CITED_TIPS, MAZAK_CITED_TIPS, SIEMENS_CITED_TIPS } from "@/data/tribal-tips/jm-die-curriculum";`
Each tip = full CitedTip object with id + sourceId + citation + page + score + body. Post-processor + classifier engines can filter by controller + difficulty + score.
