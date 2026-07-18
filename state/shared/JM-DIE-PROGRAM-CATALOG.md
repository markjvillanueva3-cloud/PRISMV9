# JM Die Program Catalog — Cross-Chat Awareness Surface

**Generated:** 2026-05-09 by claude-d9860be8 (Docustrata Phase 3b v2 rebuild)
**Source of truth:** `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` (10.3 MB)

## Headline numbers

JM Die's `H:/PRISM/JM DIE/` archive contains **38,251 indexed files**, of which **35,625 are program-bearing** (will be the basis of the print→program / print→toolpath training corpus).

| Kind | Count | Description |
|------|-------|-------------|
| g_code | 20,081 | Posted G-code saved on disk |
| cam_project | 15,544 | Toolpath embedded (Mastercam/Inventor/Fusion/SW) |
| pure_cad | 2,304 | `.step`/`.dwg`/`.iges` geometry only |
| pdf | 235 | Prints |
| data | 87 | Controller params/macros |

## Per-machine breakdown

| Machine | Count |
|---------|-------|
| Lathe | 19,803 |
| Okuma (standalone) | 6,092 |
| Wire EDM | 4,000 |
| Matthew programs (Mastercam) | 2,320 |
| JM Die general | 2,172 |
| Haas-Hurco mill mixed | 1,820 |
| Roku-Roku | 1,102 |
| Mill Haas (standalone) | 533 |
| Okuma Multus (mill-turn) | 13 |

## Critical correction from earlier inventory

The pre-2026-05-09 `jm-die-index.json` indexed only **17,023 programs** because the extension list omitted `.mcx-8` (7,092), `.mcx` (1,779), `.cyc` (2,876), `.hnc` (55), and a few smaller ones. **Wire EDM was reported as 22 programs but is actually 4,000.** Always read v2 numbers, not v1.

## Per-controller save behavior (matters for training)

- **G-code on disk** (training has direct text): Mazak `.min`, Okuma `.min`/`.mpf`, Roku-Roku `.cyc`, Hurco `.hnc`, generic `.nc`/`.tap`
- **Toolpath embedded only** (G-code dumped to USB at post-time, not retained): Mastercam `.mcx*`, Inventor `.ipt`/`.iam`, Fusion `.f3d`, SolidWorks `.sldprt`/`.sldasm`

The 15,544 CAM-project files require a future re-post pass to recover the G-code text — gated on the program-enhancement milestone.

## Print → program matching status

Last matcher run: `phase3g-match-cam-aware.py` against `jm-die-index-v2.json`.

- 228 verified prints → **55 program-bearing matches** (46 g_code + 9 CAM project)
- 173 prints unmatched (likely no JM Die archive entry — outsourced or pre-archive jobs)
- Output: `training-triples-v4.jsonl` + `training-triples-v4-summary.md`

## Cross-references

- Memory: `reference_jm_die_program_save_practice.md`
- Future work: `H:/PRISM/Docustrata/.index/FUTURE_WORK_GCODE_EXTRACTION.md`
- Code (test-shop profile): `mcp-server/src/data/jm-die-profile.ts` — needs update to reference v2 totals (next milestone)
- Catalog rebuild script: `H:/PRISM/Docustrata/.index/phase3b-v2-rebuild-jm-index.ps1`
- Match script: `H:/PRISM/Docustrata/.index/phase3g-match-cam-aware.py`
