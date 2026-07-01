# JM DIE curriculum → tribal-tip candidates

**Generated:** 2026-05-26T23:26:06.628Z
**Slot:** echo · **Milestone:** POST-PDF-NODE-MS0/U-JM-CURRICULUM-TRIBAL-CANDIDATES · **Iter:** 11

## Pipeline
1. iter9 generate-training-curriculum.mjs emits page-by-page JSONL ranked easy→complex
2. iter11 (this script) filters advanced + complex records, joins to source .txt extract, emits candidate-shaped records with full body text
3. operator curation step (manual or LLM-assisted): convert highest-quality candidates into typed CitedTip entries in `mcp-server/src/data/tribal-tips/`

## Headline
- high-signal source records:    94 (from 7565 total curriculum records)
- candidates emitted:            94
- missing extracts (skipped):    0
- content-classifier wins:       26 (controllers recovered from extract text where filename was silent)
- output JSONL:                  `mcp-server/data/ingestion_cache/curriculum-tribal-candidates/jm-die-curriculum-tribal-candidates.jsonl`

## Distribution by domain
| Domain | Count |
|--------|------:|
| reference | 45 |
| mill | 29 |
| cam | 16 |
| post | 4 |

## Distribution by controller
| Controller | Count |
|------------|------:|
| mazak | 38 |
| (unspecified) | 31 |
| siemens | 14 |
| okuma | 6 |
| fanuc | 3 |
| haas | 1 |
| hurco | 1 |

## Top 10 candidates (by score)
| # | difficulty | score | domain | controller | citation | body length |
|--:|------------|------:|--------|------------|----------|------------:|
| 1 | complex | 6.851 | mill | - | English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf p115 | 1836 |
| 2 | advanced | 5.883 | reference | mazak | Mazak EIA - Programming Manula for Mazatrol Matrix.pdf p407 | 928 |
| 3 | advanced | 5.852 | reference | mazak | Mazak EIA - Programming Manula for Mazatrol Matrix.pdf p374 | 2332 |
| 4 | advanced | 5.798 | mill | - | English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf p112 | 2691 |
| 5 | advanced | 5.795 | mill | - | English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf p111 | 2427 |
| 6 | advanced | 5.47 | cam | siemens | Manual 5-axis machining.pdf p21 | 1418 |
| 7 | advanced | 5.414 | mill | - | English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf p181 | 1303 |
| 8 | advanced | 5.388 | reference | mazak | Mazak EIA - Programming Manula for Mazatrol Matrix.pdf p416 | 1034 |
| 9 | advanced | 5.321 | mill | okuma | ME32-128-R03a.pdf p339 | 952 |
| 10 | advanced | 5.25 | reference | mazak | Mazak EIA - Programming Manula for Mazatrol Matrix.pdf p367 | 1068 |

## Consumer wiring
- Operator curation: pick high-score candidates → convert body → cited tip with id+sourceId+citation+body fields per the iter6 `CitedPostTip` pattern.
- Target: `mcp-server/src/data/tribal-tips/{controller}-{topic}-cited-tips.ts` (one file per controller for queryability).
- Cross-references: ranker (`scripts/lib/training-difficulty-ranker.mjs`), joiner (`scripts/lib/curriculum-tribal-candidate.mjs`), query (`scripts/lib/training-curriculum-query.mjs`).
