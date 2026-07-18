---
title: Lathe Okuma OSP Dialect (slot:whiskey)
type: architecture
status: active
tags: [lathe, okuma, osp, dialect, whiskey, jm-die, post-processor]
created: 2026-05-28
by: claude-57dfea65 (slot:whiskey)
---

# Lathe Okuma OSP Dialect — JM Die's 100%-Okuma fleet

JM Die's entire lathe fleet is **100% Okuma OSP** — so slot:whiskey defaults all lathe work to the Okuma OSP dialect. Assuming Fanuc defaults misprograms every JM Die job.

## Fleet (from `jm-die-profile.ts`)
| ID | Model | Controller |
|----|-------|-----------|
| LTH-01 | GENOS L300-M | OSP-P300L-R |
| LTH-02 | GENOS L200E-M | OSP-P200LA-R |
| LTH-03 | LNC8 | OSP-U10L |
| LTH-04 | Crown L1060 | OSP-U10L |
| LTH-05 | GENOS L400II-E | OSP-P300LA-E (AI-Enhanced) |
| LTH-06 | LB 3000EX Big Bore | OSP-P500 |
| LTH-07 | Multus B250II | OSP-P300SA (Mill-Turn) |

## OSP specifics vs Fanuc
- Feed mode: G95 (feed/rev) default; IPR vs IPM confusion = 10× feed error (−25 quality).
- G-code variants + special-G + macro syntax differ from Fanuc; IGF / Advanced One-Touch programming.
- Use `OkumaB250LatheMasterPostEngine`, `OkumaOSPParserEngine`, `OkumaDialectKnowledgeEngine`, `OkumaMacroConverterBridgeEngine` + the `okuma_*` tribal miners (`okuma_step_parse`, `okuma_macro_convert`, `okuma_manual_tips_extract`, `okuma_transcript_mine`).

## Post-processor home
`JM DIE/POST PROCESSORS/2. PRISM ENHANCED/{lathe,mill-turn}/` (OKUMA GENOS/LB/MULTUS AI-Enhanced); vanilla in `1. CONSOLIDATED/vanilla/lathe/`. Cross-galaxy: echo (post-processor).

## Related
- [[lathe-galaxy]] · [[lathe-safety-gates]]
- [[feedback_whiskey_okuma_first_corpus]] · [[reference_jm_die_is_okuma_heavy_implications_2026_05_27]]
