/**
 * Course 26 — Entry-Level Training for SURFCAM + VISI + Alphacam + CAMWorks
 *
 * Continues course-25 into 4 more priority CAM systems:
 *   - SURFCAM (Hexagon, from Vero) — TrueMill HSM strategy
 *   - VISI (Hexagon, from Vero) — mold/die specialist with split-design integration
 *   - Alphacam (Hexagon, from Vero) — wood + composite + stone + marble specialist
 *   - CAMWorks (HCL → CNC Software 2022) — AFR (Automatic Feature Recognition) on SolidWorks
 *
 * 4 modules, ~4 hours, novice tier, prereq=course-25.
 * Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-26-m1",
    title: "SURFCAM Entry — TrueMill HSM (Hexagon)",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First SURFCAM Job

**Why SURFCAM:** Per CIMdata 2023, SURFCAM (Hexagon, acquired via Vero Software 2014) holds a niche U.S. CAM share but is notable for the TrueMill HSM strategy patented in 2008 — a contemporary of Volumill + iMachining + Mastercam Dynamic Motion.

## SURFCAM workflow

SURFCAM is **standalone** CAM with CAD import — no native add-in like SolidCAM. Most users run it on its own machine alongside SolidWorks/Inventor on another machine.

## The 4-step SURFCAM entry workflow

1. **Open part** (File → Open → STEP/IGES/native SolidWorks/Inventor)
2. **Define machine + stock** (Setup → Machine → pick post; Stock → bounding box or surface)
3. **Apply TrueMill operation** (Toolpaths → TrueMill → Pocket):
   - Stepover: 5-12% (chip-thinning)
   - Engagement: auto-managed via patented algorithm
   - Lead-in: helix (3° pitch) default
4. **Post-process** (Output → pick post → .nc)

[per SURFCAM 2024 Help Manual + Hexagon Manufacturing Suite Overview]

## SURFCAM-specific traits

- **TrueMill patent (US 7,451,013)** predates Mastercam Dynamic Motion by ~2 years; one of the original chip-thinning HSM patents
- **Hexagon ecosystem**: integrates with Hexagon CMM (PC-DMIS) for closed-loop quality, same as EdgeCAM (course-25 mod 4)
- **Production-ready posts**: SURFCAM ships with 800+ machine posts pre-validated; uncommon to need custom post tuning
- **JM Die SURFCAM exposure**: minimal — primarily indirect via outsource subcontract

[per SURFCAM 2024 + Hexagon Manufacturing Suite + JM Die operational notes]`,
      },
    ],
    quiz: [
      {
        id: "course-26-m1-q1",
        type: "multiple_choice",
        prompt: "SURFCAM's TrueMill HSM strategy is notable for what historical reason?",
        options: [
          "It was the first commercial HSM algorithm",
          "It's a contemporary chip-thinning HSM strategy (US patent 7,451,013, 2008) — predates Mastercam Dynamic Motion by ~2 years",
          "It only runs on Hexagon's CMM hardware",
          "It's not actually an HSM strategy",
        ],
        correctIndex: 1,
        explanation: "Per Hexagon Manufacturing Suite Overview + US Patent 7,451,013: TrueMill (2008) is one of the original chip-thinning HSM patents, alongside Volumill (earliest, pre-2008), iMachining (US 8,489,224, 2013 publication), Mastercam Dynamic Motion (~2010), and hyperMILL Maxx (2013). TrueMill predates Mastercam Dynamic Motion by ~2 years.",
        topicTags: ["surfcam", "truemill", "hsm_history"],
      },
    ],
    prismEngines: ["CurriculumEngine", "SurfcamFunctionIndexEngine"],
    prismDispatcherActions: ["cam_surfcam_get_operations"],
  },

  {
    id: "course-26-m2",
    title: "VISI Entry — Mold/Die Specialist (Hexagon)",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First VISI Job

**Why VISI:** Per CIMdata 2023, VISI (Hexagon, acquired via Vero Software 2014) is the #4 mold/die CAM after hyperMILL, PowerMill, and WorkNC. Its distinctive feature is integrated split-design (cavity + core extraction) for mold-makers.

## VISI workflow

VISI is **mold-design-first** then CAM. Most mold shops use VISI for the cavity + core extraction step (separating the design body into mold halves), then route to hyperMILL or PowerMill for surfacing. Pure VISI shops use its built-in CAM (VISI Modelling + VISI Machining).

## The 5-step VISI entry workflow (mold cavity + roughing)

1. **Open part** (File → Open → STEP/IGES + parting line)
2. **Split design** (Mold → Split → define parting surface; VISI extracts cavity + core automatically)
3. **Define stock** (Stock → from cavity bounding box +10 mm draft allowance)
4. **Apply Z-Level Roughing** (Toolpaths → Roughing → Z-Level → pick cavity boundary)
5. **Post-process** (Output → pick post → .nc)

[per VISI 2024 Help Manual + Hexagon Mold-Maker Workflow Guide]

## VISI-specific traits

- **Split-design first**: VISI's cavity/core extraction is the most sophisticated among mold CAMs; uses surface geometry to define parting automatically
- **Built-in CAM is functional but not class-leading**: most pure-VISI shops route to hyperMILL or PowerMill for HSM surfacing
- **Electrode design integration**: built-in workflow for sinker-EDM electrodes off the split cavity
- **Hexagon ecosystem**: integrates with Hexagon CMM for mold-side quality

[per VISI 2024 + Hexagon Mold-Maker Workflow Guide]`,
      },
    ],
    quiz: [
      {
        id: "course-26-m2-q1",
        type: "multiple_choice",
        prompt: "VISI's distinctive strength among mold/die CAMs is what?",
        options: [
          "Largest installed base",
          "Cheapest license",
          "Integrated split-design (cavity + core extraction from a parted geometry, with parting surfaces auto-detected)",
          "Best 5-axis simultaneous strategy",
        ],
        correctIndex: 2,
        explanation: "Per Hexagon Mold-Maker Workflow Guide + VISI 2024 Help: VISI's distinctive feature is sophisticated split-design (cavity + core extraction). Most pure-VISI shops use VISI for the mold-design + electrode workflow, then route to hyperMILL or PowerMill for HSM surfacing — combining VISI's design strength with another CAM's machining strength.",
        topicTags: ["visi", "mold_die", "split_design"],
      },
    ],
    prismEngines: ["CurriculumEngine", "VisiFunctionIndexEngine"],
    prismDispatcherActions: ["cam_visi_get_operations"],
  },

  {
    id: "course-26-m3",
    title: "Alphacam Entry — Wood + Composite + Stone Specialist (Hexagon)",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First Alphacam Job

**Why Alphacam:** Per CIMdata 2023, Alphacam (Hexagon, acquired via Vero Software 2014) holds the dominant non-metallic CAM share — wood, composite, stone, marble, glass, plastic. Metal shops rarely use it; non-metal shops standardize on it.

## Alphacam workflow

Alphacam is **2.5D-first** with optional 3D and 5-axis. The non-metallic materials (wood, foam, composite) it targets are mostly machined in 2.5D (router-style operations on flat sheets) — Alphacam is optimized for this.

## The 5-step Alphacam entry workflow (wood router job)

1. **Open part** (File → Open → DXF/DWG/AutoCAD-native or STEP)
2. **Set machine** (Setup → Machine → pick router post — Biesse, Homag, CNC Factory)
3. **Identify part type** (Sheet → Define → for nesting + 2.5D operations on a flat material)
4. **Apply Pocketing or Profile operation** (Toolpaths → Pocket or Profile → pick boundary):
   - Tool: Ø6 mm 2-flute straight router bit (wood) or Ø10 mm compression bit (plywood)
   - Stepover: 50% (non-metallic doesn't need chip-thinning)
   - Feed: 4-12 m/min (wood is fast)
5. **Nest + Post** (Nesting → minimize waste, then post-process)

[per Alphacam 2024 Help Manual + Hexagon Non-Metallic CAM Guide]

## Alphacam-specific traits

- **Material database is wood/composite-first**: 200+ wood species, 50+ composite layups, 30+ stone types pre-populated
- **Nesting algorithm is class-leading for sheet stock**: 90%+ material utilization on rectangular sheets
- **Router post library**: ships with 500+ posts for Biesse, Homag, Holz-Her, CNC Factory, ShopBot, etc.
- **JM Die Alphacam exposure**: NONE — JM is metal-only. Reference for metal/wood-hybrid shops or composite aerospace work.

[per Alphacam 2024 + Hexagon Non-Metallic CAM Guide]`,
      },
    ],
    quiz: [
      {
        id: "course-26-m3-q1",
        type: "multiple_choice",
        prompt: "Alphacam's target material domain is what?",
        options: [
          "Metals (steel, aluminum, stainless)",
          "Superalloys (Inconel, titanium)",
          "Non-metallics (wood, composite, stone, marble, glass, plastic)",
          "Ceramics only",
        ],
        correctIndex: 2,
        explanation: "Per Hexagon Non-Metallic CAM Guide + Alphacam 2024 Help: Alphacam is the dominant non-metallic CAM. Its material database ships pre-populated with 200+ wood species, 50+ composite layups, 30+ stone types. Metal shops rarely use Alphacam; non-metal shops standardize on it.",
        topicTags: ["alphacam", "non_metallic", "wood_composite"],
      },
    ],
    prismEngines: ["CurriculumEngine", "AlphacamFunctionIndexEngine"],
    prismDispatcherActions: ["cam_alphacam_get_operations"],
  },

  {
    id: "course-26-m4",
    title: "CAMWorks Entry — AFR (Automatic Feature Recognition) on SolidWorks",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First CAMWorks Job

**Why CAMWorks:** Per CIMdata 2023, CAMWorks (HCL Technologies until 2022; then CNC Software/Mastercam acquisition) is the dominant SolidWorks-add-in feature-recognition CAM. Its AFR (Automatic Feature Recognition) reads SolidWorks features (holes, pockets, slots) and auto-generates toolpaths.

## CAMWorks workflow

CAMWorks is a **SolidWorks add-in** that reads the design tree directly. AFR mode auto-generates toolpaths from recognized features; manual mode lets you override.

## The 4-step CAMWorks entry workflow

1. **Open part in SolidWorks** (CAMWorks add-in activates automatically)
2. **Switch to CAMWorks** (CAMWorks tab → Define Machine → pick mill/lathe/mill-turn)
3. **Run AFR** (CAMWorks → Extract Features → AFR processes design tree):
   - AFR identifies: holes, pockets, slots, bosses, faces, contours
   - For each recognized feature, AFR assigns a default operation
4. **Generate + Post** (Generate Operation Plan → Generate Toolpath → Post)

[per CAMWorks 2024 Help + CNC Software Best Practices 2024]

## CAMWorks-specific traits

- **AFR vs IFR**: AFR (Automatic) is fast but generic; IFR (Interactive) lets you tag features manually with constraints
- **Mastercam acquisition (2022)**: CAMWorks development is now under Mastercam ownership; expect tighter integration with Mastercam posts + tooling
- **Design intent preservation**: edits to the SolidWorks part propagate to CAMWorks toolpaths automatically (no re-import)
- **Mill-turn support**: weaker than GibbsCAM or Esprit; CAMWorks mill-turn is best for simple sub-spindle work

[per CAMWorks 2024 + CNC Software product roadmap 2022-2026]

## CAM ecosystem map (extends course-19 + 25)

After courses 18 + 19 + 20 + 25 + 26: 17 priority CAM systems covered at entry-level.

| CAM | Course | Distinctive feature |
|-----|--------|---------------------|
| Fusion 360 | 18 | Cloud-collaborative + Inventor HSM kernel |
| Mastercam | 18 | Dynamic Motion + largest tribal corpus |
| hyperMILL | 19 | #1 5-axis mold/die installed base |
| NX CAM | 19 | Tier-1 aerospace PMI + Adaptive Milling |
| SolidCAM | 19 | iMachining (US Patent 8,489,224) |
| Esprit | 20 | ProfitTurning + multi-channel mill-turn |
| PowerMill | 20 | Vortex roughing + built-in NC Editor |
| Inventor HSM | 20 | Inventor-paired Adaptive Clearing |
| CATIA Machining | 20 | Tier-1 aerospace + auto + defense PMI |
| Creo NC | 25 | PTC ecosystem (Raytheon, Caterpillar) |
| WorkNC | 25 | Auto5 1-click 5-axis conversion |
| GibbsCAM | 25 | Volumill (first commercial HSM) + mill-turn |
| EdgeCAM | 25 | SolidWorks/Inventor add-in + PC-DMIS |
| SURFCAM | 26 | TrueMill HSM (US Patent 7,451,013) |
| VISI | 26 | Mold-design split + electrode workflow |
| Alphacam | 26 | Non-metallic CAM (wood + composite + stone) |
| CAMWorks | 26 | SolidWorks AFR (Automatic Feature Recognition) |

Still pending entry-level coverage: TopSolid, BobCAD, Cimatron, SprutCAM, PartMaker, FeatureCAM (6 systems → 1 more course)

[per CIMdata 2023 + courses 18-26 cumulative coverage]`,
      },
    ],
    quiz: [
      {
        id: "course-26-m4-q1",
        type: "multiple_choice",
        prompt: "CAMWorks's distinctive feature is what?",
        options: [
          "5-axis simultaneous best-in-class",
          "AFR (Automatic Feature Recognition) — reads SolidWorks features (holes, pockets, slots) and auto-generates toolpaths",
          "Cloud collaboration",
          "Wood/composite specialist",
        ],
        correctIndex: 1,
        explanation: "Per CAMWorks 2024 Help + CNC Software Best Practices 2024: CAMWorks's distinctive feature is AFR (Automatic Feature Recognition). It reads SolidWorks feature tree (holes, pockets, slots, bosses) and auto-generates toolpaths with appropriate strategies — fastest CAM-side setup for SolidWorks-native shops. Mastercam acquired CAMWorks in 2022 for this AFR capability.",
        topicTags: ["camworks", "afr", "solidworks_addin"],
      },
    ],
    prismEngines: ["CurriculumEngine", "CamworksFunctionIndexEngine"],
    prismDispatcherActions: ["cam_camworks_get_operations"],
  },
];

export const COURSE_26_MODULES: Module[] = modules;
