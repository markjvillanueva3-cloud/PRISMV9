---
type: entity
title: JM Die Program Catalog
slug: jm-die-program-catalog
created: 2026-05-09
updated: 2026-05-09
authors:
  - claude-d9860be8
tags:
  - jm-die
  - test-shop
  - training-corpus
  - cam
  - g-code
links:
  - "[[jm-die-shop]]"
  - "[[reference_jm_die_program_save_practice]]"
---

# JM Die Program Catalog

JM Die Company is PRISM's test shop. Their full program archive at `H:/PRISM/JM DIE/` contains **38,251 indexed files** (rebuilt 2026-05-09), of which **35,625 are program-bearing** — the basis for PRISM's print→program/toolpath training corpus.

## Counts

### By file kind
- **g_code:** 20,081 (posted G-code on disk)
- **cam_project:** 15,544 (toolpath embedded in CAD/CAM file)
- pure_cad: 2,304
- pdf: 235
- data: 87

### By machine type
- Lathe: 19,803
- Okuma standalone: 6,092
- Wire EDM: 4,000
- Matthew (Mastercam): 2,320
- JM Die general: 2,172
- Haas-Hurco mixed: 1,820
- Roku-Roku: 1,102
- Mill Haas: 533
- Okuma Multus: 13

## Per-controller save practice

| Controller | Extension | Saved on disk? |
|-----------|-----------|----------------|
| Mazak Mazatrol | `.min` | YES — posted G-code; line 1 = `$<INTERNAL>%` |
| Okuma OSP | `.min`/`.mpf` | YES — posted G-code |
| Roku-Roku | `.cyc` | YES — cycle program |
| Hurco WinMax | `.hnc` | YES — native NC |
| Mastercam X+ | `.mcx-8`/`.mcx`/`.mcx-6` | NO — toolpath embedded; G-code → USB |
| Inventor HSM | `.ipt`/`.iam` | NO — toolpath embedded |
| Fusion 360 | `.f3d` | NO — toolpath embedded |
| SolidWorks CAM | `.sldprt`/`.sldasm` | NO — toolpath embedded |

The 15,544 CAM-project files have machinable toolpath data inside but **the resulting G-code text is not retained on disk** — it's posted to USB at job-run time. Recovering that G-code requires opening each CAM project in its native CAM, re-posting, and saving the output. This is gated on the program-enhancement milestone.

## Inventory mistake (pre-2026-05-09)

The original `jm-die-index.json` reported **17,023 programs** because its extension allowlist missed:
- `.mcx-8` (7,092 — Mastercam X8 part files)
- `.cyc` (2,876 — Roku-Roku)
- `.mcx` (1,779 — Mastercam X)
- `.mcx-6` (106 — older Mastercam)
- `.hnc` (55 — Hurco native)
- `.def`/`.pmc`/`.macro` (controller data)

Wire EDM was reported as 22 programs but is actually **4,000**. Always use v2 totals.

## Source artifacts

- Catalog JSON: `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` (10.3 MB)
- Builder: `H:/PRISM/Docustrata/.index/phase3b-v2-rebuild-jm-index.ps1`
- Internal-name extractor (Mazak `$NAME%` line 1): `H:/PRISM/Docustrata/.index/phase3e2-extract-internal-names.py` → `program-internal-names.json` (14,799 records, 87% yield on `.min` files)
- Print matcher: `H:/PRISM/Docustrata/.index/phase3g-match-cam-aware.py` → `training-triples-v4.jsonl`

## Use this for

- Sizing the JM Die training corpus (35,625 not 17,023)
- Discussing wire EDM coverage (4,000 programs, not 22)
- Planning program-enhancement milestone scope (15,544 CAM projects to re-post)
- Cross-controller training data balancing (lathe ~half the corpus; mill ~1/3 split between Mastercam/Inventor; Roku-Roku ~3% but production-critical)
