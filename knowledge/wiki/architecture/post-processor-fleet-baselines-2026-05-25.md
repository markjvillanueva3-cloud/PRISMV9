---
title: Post-Processor Fleet Baselines + Consolidation Architecture
type: architecture
node_id: architecture.post-processor-fleet-baselines
parent_layer: L8
kind: architecture
status: baseline
created: 2026-05-25
slot: echo
last_verified: 2026-05-25
tags: [post-processor, baseline, hurco, okuma, mitsubishi-wedm, consolidation, master-post-processor, print-to-cnc]
related:
  - knowledge/wiki/architecture/post-processor-cross-controller-corpus.md
  - state/shared/specs/POST-PROCESSOR-CONSOLIDATION-2026-05-25-echo.md
  - state/shared/specs/POST-PROCESSOR-FLEET-UPGRADE-2026-05-25.md
---

# Post-Processor Fleet Baselines + Consolidation Architecture

**Date:** 2026-05-25 · **Slot:** echo · **Session:** `claude-9029a5d7`
**Trigger:** operator directive — *"hurco is the current baseline for all mills, okuma lb3000 and multusb250 will be the baseline for turning. find all posts in the h drive and copy them into 2 folders 1. consolidated post folder and 2. Prism Enhanced posts… bridge to PPG page + employee portal… final mission is the master post processor for internal use for print-to-CNC"*

---

## Canonical baselines

| Domain | Baseline post | Why |
|---|---|---|
| **All mill** | `HURCO_VM30i_PRISM_v11.cps` | Hurco WinMAX is JM Die's primary mill control. Most PRISM-tested feature surface: G05.3 smoothing (P35 rough / P10 finish), UltiMotion G64 per-op tolerance, M140 Z-retract, PRISM Enhanced Roughing (iMachining/dyn-depth/chip-thin), + 4 advanced-feature properties shipped this session (prismTribalCitation, prismCI95Comments, prismLookAheadBlocks, prismCrossCAMFeatures). |
| **All lathe / turning** | `OKUMA_LATHE_LB3000-Ai-Enhanced 2.cps` + `OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps` | LB3000 = mill-turn baseline (G137 polar, G138 Y-mode, CAS collision-avoid, live-tool 6000 rpm, sub-spindle sync). Multus = 5-axis-capable lathe envelope (Super NURBS G131, HSM G132, Machining Navi AI feeds, CAS, TCP G255/G254, B-axis live-tool, Kienzle force estimate, tool-life tracking). Together they cover 100% of JM Die's turning capability matrix. |
| **All wire EDM** | `PRISM-Master-Mitsubishi-FA10S-WEDM.cps` | JM Die WEDM-01 is Mitsubishi FA10S. PRISM-Master template shipped this session (270 LOC, calls `prism_cam:wedm_post_mitsubishi_generate` via sidecar JSON, gitignored operator-local). |

## Fleet scale — multi-vendor post formats

PRISM has **hundreds** of post-processor files across H: drive, spanning EVERY major CAM vendor (not just Autodesk). Each CAM system uses its own post-processor file format:

| CAM system | Post extension | Language |
|---|---|---|
| **Autodesk Fusion 360 / HSMWorks / Inventor HSM** | `.cps` | JavaScript (HSM post kernel) |
| **Mastercam** | `.pst` | MP post block language (legacy) or `.psb` (MP) |
| **hyperMILL / hyperCAD** | `.tcp` + `.ini` + `.cpr` | OPEN MIND post + machine config |
| **ESPRIT** | `.est` or vendor-specific config | DP Technology proprietary |
| **SolidCAM** | `.gpp` | GPPL (Generalized Post-Processor Language) |
| **PowerMill** | `.pm` or `.opt` | Autodesk PowerMill format |
| **NX / Siemens CAM** | `.tcl` | Tool Command Language post |
| **CATIA / DELMIA** | `.lib` | Dassault PPR catalog |

Live count requires scan — never hard-code. Known major locations:

- `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/` — 15 active PRISM Enhanced + Master posts (gitignored, mostly `.cps`)
- `H:/prism/resources/FUSION BASIC POSTS/` — 100+ Autodesk Fusion 360 stock posts (every major controller)
- `H:/prism/resources/HSMWorks 2026/posts/` — HSMWorks 2026 library
- `H:/prism/resources/HSMWorks 2027/posts/` — HSMWorks 2027 library
- `H:/prism/resources/Mastercam*/` — Mastercam .pst posts
- `H:/prism/resources/hyperMILL*/` or `H:/prism/resources/OPEN MIND*/` — hyperMILL .tcp + .ini
- `H:/prism/resources/ESPRIT*/` — ESPRIT .est
- Per-customer custom posts in `JM DIE/` customer subfolders (all formats mixed)

**Operator directive (2026-05-25):** Mastercam + hyperMILL/hyperCAD + ESPRIT posts ALSO need PRISM-enhancement treatment. The same advanced-feature property pattern (tribal-citation, CI95, look-ahead, cross-CAM, vendor-specific extras) applies to ALL post formats, with vendor-specific syntax adapters per format.

## Folder structure

```
H:/prism/JM DIE/POST PROCESSORS/                  (planned tree; partially built)
├── 1. CONSOLIDATED/
│   ├── vanilla/                                  (untouched stock from vendors)
│   │   ├── mill/<brand>/
│   │   ├── lathe/<brand>/
│   │   ├── mill-turn/<brand>/
│   │   ├── wire-edm/<brand>/
│   │   ├── sinker-edm/<brand>/
│   │   ├── grinder/<brand>/
│   │   └── swiss/<brand>/
│   └── work-in-progress/                         (partial enhancements, untested)
│       └── (same sub-tree)
└── 2. PRISM ENHANCED/                            (production-grade, sale-ready)
    ├── mill/
    ├── lathe/
    ├── mill-turn/
    ├── wire-edm/
    └── README.md                                 (per-post: tested-against, version, change log)
```

**Brand categorization rules:**
- Brand folder name is the lowercase manufacturer (`hurco`, `haas`, `okuma`, `fanuc`, `heidenhain`, `mazak`, `siemens`, `mitsubishi`, `sodick`, `makino`, `agie`, `dmg-mori`, `brother`, `doosan`, `citizen`, `mori-seiki`, `mazak-mazatrol`)
- File naming preserves vendor original name + appends `.vanilla.cps` for stock or `.wip.cps` for work-in-progress  
- PRISM Enhanced names follow `<brand>-<model>-PRISM-Enhanced-v<X.Y.Z>.cps` pattern (operator-driven version bump on every release)

## PRISM Enhanced tier — "production-grade, sale-ready" criteria

A post graduates from `work-in-progress/` to `PRISM ENHANCED/` ONLY when ALL of:

1. **All 4 advanced-feature properties** present (prismTribalCitation, prismCI95Comments, prismLookAheadBlocks, prismCrossCAMFeatures) — tailored per controller
2. **PRISM dispatcher integration** declared in header (which `prism_cam:*` action does what)
3. **Per-controller tailoring** — e.g. Hurco has `useUltiMotion` + `ultiMotionRoughTol` + `ultiMotionFinishTol`; Multus has `prismMultiChannelSync`; M460V-5AX has `prismTCPGate`; Roku-Roku has `prismAICCQuality`; etc.
4. **Tested against real machine** (or WinMax/simulator for mill, Okuma OSP-Simulator for lathe, Mitsubishi WEDM Sim for wire) with at least one JM Die production part successfully posted + cut
5. **Sidecar JSON contract** documented (what PRISM physics data flows in/out)
6. **Verification scorecard** ≥ 0.85 via `prism_cam:cad_template_apply_measurements` chain OR via new `PostProcessorVerificationOrchestratorEngine.verify()` (shipped this session)
7. **Tribal-tip citation map** — known field failures referenced by tip_id (e.g. Hurco v10.7 "FIELD FAILURE: 79% LOC + 2.5x chip thinning = BROKEN ENDMILL")

## Bridges (planned)

| Surface | Bridge | Status |
|---|---|---|
| Post-processor generator page (`web/src/PPGPage.tsx` or similar) | List PRISM ENHANCED posts as downloadable cards; vanilla/WIP as research-only | TODO |
| Employee portal | Authenticated download endpoint for PRISM ENHANCED posts (role-gated) | TODO |
| `prism_cam:post_library_search` | Index both folders, return per-machine post recommendations | TODO |
| `prism_cam:post_library_download` | Return base64 .cps content with optional signed-URL | TODO |
| `prism_dev:post_library_consolidation_status` | Live status: counts per tier, what's missing | TODO |

## End mission — Master Post Processor (internal-only)

Once ALL of (major brands × machine types × features × controllers × capabilities × PRISM AI capabilities) reach PRISM ENHANCED tier, they merge into ONE Master Post Processor:

- **Drives**: PRISM print-to-CNC pipeline — drawing/CAD → CAM strategy → Master Post → controller-correct .NC
- **Audience**: PRISM internal only (NOT sold externally — the PRISM ENHANCED individual posts ARE the sale product)
- **Architecture**: Dispatch layer that routes a `(machine, controller, capability_set)` tuple to the right per-brand emitter, with cross-CAM normalization at the front (the user's "use Fusion/Inventor kernel + PRISM engines validate" ask is the front half of this; the per-brand emitter is the back half)
- **Gates on**: ALL PRISM ENHANCED individual posts being graduated (i.e. tier-1 quality across the entire fleet)

## Verification (Boris discipline — re-measurable)

| Finding | Re-measure |
|---|---|
| Total .cps in H: drive | `find /h -maxdepth 8 -iname "*.cps" \| wc -l` |
| Active PRISM Enhanced posts | `ls "H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/" \| wc -l` |
| Per-brand category counts (after consolidation) | `find "H:/prism/JM DIE/POST PROCESSORS/1. CONSOLIDATED/vanilla/<domain>/<brand>/" -name "*.cps" \| wc -l` |

## See also
- [[post-processor-cross-controller-corpus]] — corpus + variability matrix
- POST-PROCESSOR-CONSOLIDATION-2026-05-25-echo.md — session consolidation spec
- POST-PROCESSOR-FLEET-UPGRADE-2026-05-25.md — fleet upgrade audit
- POST-PROCESSOR-PROVE-OUT-2026-05-25.md — R12 fail-loud runtime prove-out (0/200 finding — open follow-up)
- [[checkin-loop-fullstack]] — slot-loop pipeline that consumed this session
