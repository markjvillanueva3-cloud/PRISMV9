---
name: JM Die program & file catalog (full extension breakdown)
description: H:/PRISM/JM DIE/ contains 38,251 indexed files. 35,625 are program-bearing (20,081 G-code + 15,544 CAM-project). Per-controller save practices vary — Mastercam/Inventor/Fusion embed the toolpath; Mazak/Okuma/Roku-Roku/Hurco save posted G-code on disk.
type: reference
originSessionId: d9860be8-11f1-48b5-be7d-f29706fa27e5
---
# JM Die Program Catalog (rebuilt 2026-05-09)

**Authoritative index:** `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` (10.3 MB)
**Builder:** `H:/PRISM/Docustrata/.index/phase3b-v2-rebuild-jm-index.ps1`

## Counts by file kind

| Kind | Count | Description |
|------|-------|-------------|
| **g_code** | **20,081** | Posted G-code on disk — actual instruction stream |
| **cam_project** | **15,544** | Toolpath embedded in CAD/CAM file — G-code generated at post |
| pure_cad | 2,304 | Geometry-only (`.step`/`.stp`/`.iges`/`.dwg`/`.dxf`/`.idw`) |
| pdf | 235 | Prints on the floor |
| data | 87 | Controller params/macros (`.def`/`.pmc`) |
| **TOTAL** | **38,251** | (kept; 583 noise files filtered out) |
| **Program-bearing** | **35,625** | g_code + cam_project — what training cares about |

## Counts by machine type

| Folder | Count | Notes |
|--------|-------|-------|
| CNC LATHE | 19,803 | Mostly `.min` (Mazak/Okuma) |
| OKUMA | 6,092 | Standalone Okuma fork |
| WIRE EDM | 4,000 | All 5 controllers (Mitsubishi/Sodick/Makino/AgieCharmilles/Fanuc) |
| MATTHEW programs | 2,320 | Programmer-tagged folder (Mastercam) |
| JM DIE COMPANY | 2,172 | General/legacy |
| HAAS-HURCO | 1,820 | Mill mixed |
| ROKU-ROKU | 1,102 | All `.cyc` cycle programs |
| CNC MILL HAAS | 533 | Standalone Haas fork |
| CNC OKUMA MULTUS | 13 | Mill-turn |

## Per-controller program save practice

| Controller | Native ext | Save behavior |
|-----------|-----------|---------------|
| Mazak Mazatrol | `.min` (16,947) | Saved as posted G-code; line 1 `$<INTERNAL>%` |
| Okuma OSP | `.min`/`.mpf` | Saved as posted G-code |
| Roku-Roku | `.cyc` (2,876) | Saved as posted G-code (cycle format) |
| Hurco WinMax | `.hnc` (55) | Saved as native NC |
| Generic CNC | `.nc`/`.tap`/`.eia`/`.cnc` | Saved as posted |
| **Mastercam X**+ | `.mcx-8` (7,092), `.mcx` (1,779), `.mcx-6` (106) | **Toolpath embedded — G-code generated at post and dumped to USB, NOT saved** |
| **Inventor / HSM** | `.ipt` (5,821), `.iam` (669) | **Same — toolpath embedded** |
| **Fusion 360** | `.f3d` | Same |
| **SolidWorks CAM** | `.sldprt` (39), `.sldasm` | Same |

## Why this matters for training

- 20,081 jobs have actual G-code on disk → ready for direct `print → G-code` model training
- 15,544 jobs have toolpath embedded but no G-code text → train on `print → toolpath-strategy` until the future re-post pass extracts the G-code
- Total opportunity is 35,625 programs across ~40K JM Die jobs (Mark's "closer to 40k" estimate is correct)

## Earlier inventory (pre-2026-05-09) — DO NOT TRUST

The original `jm-die-index.json` (now superseded) under-counted by ~12,000 files because it omitted `.mcx-8`, `.mcx`, `.mcx-6`, `.cyc`, `.hnc`, `.def`, etc. Use `jm-die-index-v2.json` only.

## How to apply

- When sizing the JM Die training corpus → use 35,625 not 17,023
- When matching prints to programs → use `phase3g-match-cam-aware.py` against `jm-die-index-v2.json`
- When discussing wire EDM coverage → 4,000 programs available, not 22
- When planning the program-enhancement milestone → 15,544 CAM projects need re-post extraction; this is THE bulk of the future G-code recovery work
