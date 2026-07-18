---
name: post-processor-fleet-baselines-2026-05-25
description: "PRISM has dozens-to-hundreds of .cps post processors across H: drive; Hurco is the baseline for ALL mills, Okuma LB3000 + Multus B250IIW are the baselines for ALL turning. Consolidated + PRISM-Enhanced folder structure with PPG + employee portal bridges. End mission is the Master Post Processor for internal print-to-CNC."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.729Z
aliases: reference_post_processor_fleet_baselines_2026_05_25
---


# Post-Processor Fleet — Baselines + Consolidation Architecture (2026-05-25)

**Source:** Operator directive 2026-05-25 (slot:echo /goal post-processor consolidation continuation)
**Session:** `claude-9029a5d7`

## Scale — multi-vendor post formats

PRISM has hundreds of post-processor files across H: drive, spanning EVERY major CAM vendor (not Autodesk-only). Each uses its own format:

- `.cps` — Fusion 360 / HSMWorks / Inventor HSM (JavaScript)
- `.pst` / `.psb` — Mastercam (MP language)
- `.tcp` + `.ini` + `.cpr` — hyperMILL / hyperCAD (OPEN MIND post + machine config)
- `.est` — ESPRIT (DP Technology)
- `.gpp` — SolidCAM (GPPL)
- `.pm` / `.opt` — PowerMill
- `.tcl` — NX / Siemens CAM
- `.lib` — CATIA / DELMIA

Known locations:
- `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/` — 15 active PRISM Enhanced + Master posts (gitignored, mostly .cps)
- `H:/prism/resources/FUSION BASIC POSTS/` — 100+ Autodesk Fusion 360 stock posts
- `H:/prism/resources/HSMWorks 2026/posts/` + `HSMWorks 2027/posts/` — HSMWorks libraries
- `H:/prism/resources/Mastercam*/` — Mastercam .pst
- `H:/prism/resources/hyperMILL*/` / `OPEN MIND*/` — hyperMILL .tcp + .ini
- `H:/prism/resources/ESPRIT*/` — ESPRIT .est
- Per-customer custom posts in `JM DIE/` customer subfolders (all formats mixed)

**Operator directive 2026-05-25:** Mastercam + hyperMILL/hyperCAD + ESPRIT also need PRISM-enhancement treatment — same advanced-feature property pattern adapted per format syntax.

**Total** is materially in the hundreds across all formats — operator MUST run the scan to get the live count, never hard-code.

## Baselines (canonical reference posts — every new mill/lathe post compares back to these)

| Domain | Baseline | Path |
|---|---|---|
| **All mill** | **Hurco VM30i v11** | `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/HURCO_VM30i_PRISM_v11.cps` (PRISM Enhanced, gitignored) |
| **All lathe / turning** | **Okuma LB3000 + Multus B250IIW** | `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/OKUMA_LATHE_LB3000-Ai-Enhanced 2.cps` + `OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps` |
| **All wire EDM** | PRISM-Master-Mitsubishi-FA10S-WEDM | `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/PRISM-Master-Mitsubishi-FA10S-WEDM.cps` (shipped 2026-05-25 echo) |

**Mill rationale:** Hurco WinMAX is JM Die's primary mill control + has the most PRISM-tested feature surface (G05.3 smoothing, UltiMotion G64 per-op tolerance, M140 Z-retract, full PRISM Enhanced Roughing technology with iMachining/dynamic-depth/chip-thinning + 4 advanced-feature properties shipped 2026-05-25: prismTribalCitation, prismCI95Comments, prismLookAheadBlocks, prismCrossCAMFeatures).

**Lathe rationale:** Okuma LB3000 (mill-turn capable, G137 polar, G138 Y-mode, CAS collision-avoid, live-tool 6000 rpm, sub-spindle sync) + Multus B250IIW (most feature-rich JM post: Super NURBS G131, HSM G132, Machining Navi AI feeds, CAS, TCP G255/G254, B-axis live-tool, Kienzle force estimate). Multus is the upper envelope for 5-axis-capable lathe; LB3000 is the upper envelope for 2-spindle mill-turn.

## Folder structure (planned, partially built)

```
H:/prism/JM DIE/POST PROCESSORS/                  (planned new tree)
├── 1. CONSOLIDATED/
│   ├── vanilla/                                  (untouched stock from vendors)
│   │   ├── mill/
│   │   │   ├── hurco/                            (baseline-anchor brand)
│   │   │   ├── haas/
│   │   │   ├── okuma/
│   │   │   ├── fanuc/
│   │   │   ├── heidenhain/
│   │   │   ├── mazak/
│   │   │   ├── siemens/
│   │   │   └── ...
│   │   ├── lathe/
│   │   │   ├── okuma/                            (baseline-anchor brand)
│   │   │   ├── haas/
│   │   │   ├── ...
│   │   ├── mill-turn/
│   │   ├── wire-edm/
│   │   ├── sinker-edm/
│   │   ├── grinder/
│   │   └── swiss/
│   └── work-in-progress/                         (partial enhancements, untested)
│       └── (same sub-tree as vanilla/)
└── 2. PRISM ENHANCED/                            (production-grade, sale-ready)
    ├── mill/
    ├── lathe/
    ├── mill-turn/
    ├── wire-edm/
    └── README.md                                 (per-post: tested-against, version, change log)
```

## Bridges (planned, MS0 phase)

| Surface | Bridge |
|---|---|
| Post-processor generator page (`web/src/PPGPage.tsx`) | List PRISM ENHANCED posts as downloadable; vanilla/WIP as research-only |
| Employee portal | Authenticated download endpoint for PRISM ENHANCED posts (gated by role) |
| `prism_cam:post_library_search` | Index both folders, return per-machine post recommendations |
| `prism_cam:post_library_download` | Return base64 .cps content with signed-URL alternative |

## End mission — Master Post Processor

Once ALL major brands × ALL machine types × ALL features × ALL controllers × ALL capabilities × ALL PRISM AI capabilities are perfected and proven-out across the PRISM ENHANCED tier:

- They combine into a single **Master Post Processor** for INTERNAL use only
- Drives the print-to-CNC-program pipeline: drawing/CAD → CAM strategy → Master Post → controller-correct .NC
- This is the canonical output surface for the entire PRISM print-to-program flow
- Internal-only — not sold externally (the PRISM ENHANCED individual posts are the sale product)

## How to apply this memory

1. When operator asks about post-processor capability, reference Hurco mill / Okuma LB3000+Multus lathe / Mitsubishi FA10S wire as baselines
2. When a new post-processor unit lands, classify it: vanilla (stock untouched) OR work-in-progress (partial enhancement) OR PRISM ENHANCED (production-ready)
3. Before adding a new post, run the consolidation scan to know what already exists (avoid duplication)
4. Master Post Processor work is gated on PRISM ENHANCED tier completeness for the relevant brand/machine combination

## Related
- [[reference_p0_u06_post_processor_corpus_2026_05_25]] — corpus + variability matrix
- [[reference_india_post_gaps_2026_05_22]] — JM Die post gap analysis
- POST-PROCESSOR-CONSOLIDATION-2026-05-25-echo.md — session consolidation spec
- POST-PROCESSOR-FLEET-UPGRADE-2026-05-25.md — fleet upgrade audit
