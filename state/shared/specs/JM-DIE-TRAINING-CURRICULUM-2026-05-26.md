# JM DIE TRIBAL+WIKI training curriculum — page-by-page easy→complex

**Generated:** 2026-05-26T20:38:21.566Z
**Slot:** echo · **Milestone:** POST-PDF-NODE-MS0/U-JM-TRAINING-CURRICULUM · **Iter:** 9
**Source corpus:** `H:/PRISM/JM DIE/TRIBAL + WIKI` · 67 extracts indexed (of 80 PDFs in corpus)

## Coverage reconciliation (R12 fail-loud)
- corpus PDFs:            80
- extracts on disk:       67
- indexed (echo-domain):  67
- skipped other-domain:   0 (none)
- orphan .txt extracts:   0
- empty-extract failures: 0
- corpus PDFs not yet extracted: 13

## Headline
- **7565** training-grade pages (after noise filter)
- **8313** total pages scanned · 748 dropped as noise (TOC / page-numbers / blanks)
- **Output JSONL:** `mcp-server/data/ingestion_cache/training-curriculum/jm-die-easy-to-complex.jsonl` (sorted ascending by difficulty score, rank field assigned, schemaVersion=1.0.0)

## Distribution by difficulty bucket
| Bucket | Count | %  |
|--------|------:|---:|
| unscored | 3642 | 48.1% |
| easy | 2638 | 34.9% |
| intermediate | 1191 | 15.7% |
| advanced | 93 | 1.2% |
| complex | 1 | 0.0% |

## Distribution by classifier domain
| Domain | Pages |
|--------|------:|
| reference | 3357 |
| mill | 3200 |
| cam | 533 |
| post | 431 |
| wire | 44 |

## First 5 pages (easiest)
| # | difficulty | score | filename · page | preview |
|--:|------------|------:|-----------------|---------|
| 1 | unscored | 0 | Autodesk_CNCBOOK.pdf · p3 | Copyright �2012 HSMWorks, ApS All Rights Reserved. Reproduction or translation o… |
| 2 | unscored | 0 | Autodesk_CNCBOOK.pdf · p8 | Contents Fundamentals of CNC Machining Appendix B: AlternateTool Setting Methods… |
| 3 | unscored | 0 | Autodesk_CNCBOOK.pdf · p51 | Fundamentals of CNC Machining Lesson 4 Coordinate Systems WCS Example � Job 2 Af… |
| 4 | unscored | 0 | Autodesk_CNCBOOK.pdf · p52 | Lesson 4 Fundamentals of CNC Machining Coordinate Systems WCS Example � Job 3 Dr… |
| 5 | unscored | 0 | Autodesk_CNCBOOK.pdf · p79 | Fundamentals of CNC Machining Lesson 6 … |

## Last 5 pages (hardest)
| # | difficulty | score | filename · page | preview |
|--:|------------|------:|-----------------|---------|
| 7561 | advanced | 5.795 | English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf · p111 | 12.4 \| MILL PROGRAMMING - SUBPROGRAMS Local Subprogram (M97) A local subprogram… |
| 7562 | advanced | 5.798 | English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf · p112 | 12.4 \| MILL PROGRAMMING - SUBPROGRAMS External Subprogram (M98) An external sub… |
| 7563 | advanced | 5.852 | Mazak EIA - Programming Manula for Mazatrol Matrix.pdf · p374 | Return to Library 14 PROGRAM SUPPORT FUNCTIONS 5. Auxiliary command macro call (… |
| 7564 | advanced | 5.883 | Mazak EIA - Programming Manula for Mazatrol Matrix.pdf · p407 | Return to Library 14 PROGRAM SUPPORT FUNCTIONS [9] Branching into WHILE DOm is n… |
| 7565 | complex | 6.851 | English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf · p115 | 13.1 \| MILL MACROS - INTRODUCTION Useful G and M Codes Input Signal is 0 M97 Px… |

## Consumer wiring
- Page-by-page records can feed any retrieval / fine-tune / curriculum-learning pipeline.
- For a controller-aware progressive trainer: filter by `domain` + `controller`, then iterate in JSONL order.
- Cross-references: classifier (`scripts/lib/jm-die-tribal-wiki-classifier.mjs`), ranker (`scripts/lib/training-difficulty-ranker.mjs`).
