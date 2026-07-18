/**
 * Course 25 — Entry-Level Training for Creo NC + WorkNC + GibbsCAM + EdgeCAM
 *
 * Continues course-20's pattern into 4 more priority CAM systems:
 *   - Creo NC (PTC) — Tier-1 aerospace + auto, PMI-integrated
 *   - WorkNC (Hexagon) — auto-5-axis mold/die, Auto5 strategy
 *   - GibbsCAM (Sandvik) — Volumill chip-thinning, mill-turn strength
 *   - EdgeCAM (Hexagon) — Waveform roughing, SolidWorks/Inventor add-in
 *
 * 4 modules, ~4 hours, novice tier, prereq=course-20.
 * Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-25-m1",
    title: "Creo NC Entry — PTC's Aerospace + Auto CAM",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First Creo NC Job

**Why Creo NC:** Per CIMdata 2023, PTC Creo (formerly Pro/ENGINEER) holds ~12% of large-OEM aerospace + auto installed base, with deepest penetration at Raytheon, General Dynamics, Caterpillar, and John Deere. Creo NC is its integrated CAM module.

## Creo NC anatomy

Creo NC uses a **manufacturing model** that's distinct from but linked to the design model:
- **Design model** (.prt) — the engineering part
- **Manufacturing model** (.mfg) — references the design + adds stock + workcell + operations

This separation enables the design to revise without breaking the CAM toolpaths (PMI-driven update propagation).

## The 6-step Creo NC workflow

1. **Open design model in Creo** (Pro/ENGINEER native .prt)
2. **Create Manufacturing model** (File → New → Manufacturing → NC Assembly)
3. **Define Workcell** (Workcell → 3-Axis Mill or 5-Axis Mill, pick post)
4. **Set Operation** (Operations → Setup → reference part + stock + WCS)
5. **Apply NC Sequence** (NC Sequence → Volume Milling or Surface Milling) — Creo's terminology differs from Mastercam/hyperMILL but the concepts map
6. **Post-process** (Tools → CL Data → Output → APT)

[per Creo Parametric NC Help 3.0 + PTC Manufacturing Best Practices 2024]

## Creo NC-specific traits

- **APT intermediate** (like CATIA): emit APT, then post-process. Two-stage workflow.
- **PMI propagation**: GD&T from design propagates to CAM operation; inspection planning auto-generates from PMI
- **Volume Milling vs Surface Milling**: Volume Milling = traditional pocketing; Surface Milling = HSM/Z-level
- **Workcell library**: ships with profiles for common machines; custom workcells need an "MS-Manufacturing Setup" license

## Critical first-job parameters

| Parameter | Value | Source |
|-----------|-------|--------|
| **Strategy** | Volume Milling (entry) | Creo NC default |
| **Cut Type** | Climb (preferred for HSM) | PTC HSM Application Guide 2024 |
| **Stepover** | 60-70% for traditional; 8-12% for HSM | PTC Parameter Guide §5 |
| **Stock Allowance** | 0.5 mm (rough); 0.05 mm (semi-finish); 0 (finish) | PTC NC Help §6.2 |

[per PTC Creo NC Help 3.0]`,
      },
    ],
    quiz: [
      {
        id: "course-25-m1-q1",
        type: "multiple_choice",
        prompt: "Creo NC, like CATIA, uses what intermediate format BEFORE post-processing?",
        options: ["DXF", "APT (Automatic Programming Tool)", "STEP", "STL"],
        correctIndex: 1,
        explanation: "Per Creo Parametric NC Help 3.0: Creo NC emits APT as intermediate, then post-processes APT to machine-specific G-code. This 2-stage workflow matches CATIA Machining (course-20 mod 4) and is common in large-OEM aerospace systems.",
        topicTags: ["creo", "ptc", "apt"],
      },
    ],
    prismEngines: ["CurriculumEngine", "CreoFunctionIndexEngine"],
    prismDispatcherActions: ["cam_creo_strategy_recommend"],
  },

  {
    id: "course-25-m2",
    title: "WorkNC Entry — Auto-5-Axis Mold/Die",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First WorkNC Job

**Why WorkNC:** Per CIMdata 2023, WorkNC (Hexagon, acquired from Sescoi 2012) is #3 in U.S. mold/die CAM after hyperMILL and PowerMill. Its Auto5 strategy generates 5-axis simultaneous toolpaths from a 3-axis program with one click — unique among major CAMs.

## WorkNC workflow

WorkNC is **toolpath-template driven**: every operation is a template (workzone) you assign to geometry. Templates accumulate as your shop library; new jobs reuse old templates.

## The 4-step WorkNC entry workflow

1. **Open project** (File → New → name + machine post) — WorkNC projects are folder-based
2. **Import CAD** (Models → Import → STEP/IGES/native CAD)
3. **Define stock + workzone** (Stock → Define → bounding box or surface model; Workzone → from stock)
4. **Apply toolpath** (Toolpaths → Roughing → choose template — Trochoidal Pocketing for HSM, Z-Level for 3D)
5. **Auto5 (optional)** — for 5-axis: Toolpaths → Auto5 → from existing 3-axis program

[per WorkNC 2024 Help Manual §3 "First-Time Workflow"]

## Auto5 — WorkNC's distinctive feature

Auto5 converts a 3-axis program to 5-axis simultaneous automatically:
- Input: existing 3-axis Z-level program
- Output: 5-axis program with tool axis vector optimized for collision avoidance + scallop reduction
- Time: typically 5-15 minutes for a 50-100 MB toolpath

This is the fastest path to 5-axis for shops without dedicated 5-axis CAM expertise.

\`\`\`
prism_cam cam_worknc_get_operations --category=auto5
\`\`\`

[per WorkNC Auto5 Application Guide 2024]

## WorkNC-specific gotchas

- **Workzones cache geometry** — if you import a revised CAD, regenerate workzones (don't reuse stale ones)
- **Template library shared via shop network** — Hexagon's WorkNC Network License enables shop-wide template sharing
- **Collision check is REQUIRED before post** — Auto5 in particular needs collision verification (WorkNC's built-in or Vericut)

[per WorkNC 2024 + JM Die WorkNC exposure: limited, primarily outsource coordination]`,
      },
    ],
    quiz: [
      {
        id: "course-25-m2-q1",
        type: "multiple_choice",
        prompt: "WorkNC's distinctive feature among major CAMs is what?",
        options: [
          "Lowest CAM cost",
          "Auto5 — automatic 3-axis-to-5-axis conversion in one click",
          "Largest tribal corpus",
          "Cloud-based collaboration",
        ],
        correctIndex: 1,
        explanation: "Per WorkNC 2024 + CIMdata 2023: Auto5 is WorkNC's distinctive feature. It converts a 3-axis program to 5-axis simultaneous in one click via tool-axis vector optimization — fastest path to 5-axis for shops without dedicated 5-axis CAM expertise.",
        topicTags: ["worknc", "auto5", "5_axis"],
      },
    ],
    prismEngines: ["CurriculumEngine", "WorkNCFunctionIndexEngine"],
    prismDispatcherActions: ["cam_worknc_get_operations", "cam_worknc_extract_project"],
  },

  {
    id: "course-25-m3",
    title: "GibbsCAM Entry — Volumill Chip-Thinning + Mill-Turn",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First GibbsCAM Job

**Why GibbsCAM:** Per CIMdata 2023, GibbsCAM (acquired by 3D Systems 2008, then sold to Sandvik 2017) is a top-10 U.S. CAM with notable strength in mill-turn and Swiss machining. Its Volumill chip-thinning strategy was the first commercial HSM algorithm (predates Mastercam Dynamic Motion).

## GibbsCAM workflow

GibbsCAM is **graphics-tablet-style** UI (predates conventional ribbon UIs). Operators familiar with traditional CAM often find GibbsCAM faster for repetitive setups.

## The 5-step GibbsCAM entry workflow

1. **Open part** (File → Open → SolidWorks/Inventor/STEP)
2. **Set Machine** (Machine → Choose Machine → pick from library; mill-turn machines are well-supported)
3. **Define Stock** (Stock → Form → cylindrical or bounding box)
4. **Apply Volumill operation** (Volumill → Pocket → pick boundary):
   - Stepover: 8-12% (chip-thinning)
   - Engagement angle: auto-managed
5. **Post-process** (Output → MDD → pick post)

[per GibbsCAM 2024 Online Help §2 "Getting Started"]

## GibbsCAM-specific traits

- **MDD posts** — GibbsCAM uses MDD (Machine Definition Document) format; not interchangeable with Mastercam .pst posts
- **Mill-turn strength**: GibbsCAM was designed mill-turn-first; multi-channel sync is more intuitive than retrofitted CAMs
- **Volumill licensing**: separate add-on; not in base GibbsCAM. Confirm license before specing
- **JM Die GibbsCAM exposure**: minimal — primarily through outsource subcontract who use GibbsCAM

[per GibbsCAM 2024 Operator's Reference]`,
      },
    ],
    quiz: [
      {
        id: "course-25-m3-q1",
        type: "multiple_choice",
        prompt: "GibbsCAM's Volumill is what type of strategy?",
        options: [
          "Traditional pocketing (60-70% stepover)",
          "Chip-thinning HSM (8-12% stepover, auto-managed engagement) — the first commercial HSM algorithm",
          "Z-level finishing",
          "Trochoidal slot milling",
        ],
        correctIndex: 1,
        explanation: "Per GibbsCAM 2024 Online Help + CIMdata 2023: Volumill is GibbsCAM's chip-thinning HSM strategy. It was the FIRST commercial HSM algorithm — predates Mastercam Dynamic Motion (~2010), hyperMILL Maxx (2013), SolidCAM iMachining (2008 patent). All later HSM strategies trace lineage to Volumill's engagement-modulated feed principle.",
        topicTags: ["gibbscam", "volumill", "hsm_history"],
      },
    ],
    prismEngines: ["CurriculumEngine", "GibbscamFunctionIndexEngine"],
    prismDispatcherActions: ["cam_gibbscam_get_operations"],
  },

  {
    id: "course-25-m4",
    title: "EdgeCAM Entry — Waveform Roughing + SolidWorks/Inventor Add-In",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First EdgeCAM Job

**Why EdgeCAM:** Per CIMdata 2023, EdgeCAM (Hexagon, from Pathtrace) holds ~5% U.S. CAM share with strength in SolidWorks and Inventor add-in integration. Its Waveform roughing was Hexagon's response to Mastercam Dynamic Motion + GibbsCAM Volumill.

## EdgeCAM workflow

EdgeCAM is **add-in style** for SolidWorks/Inventor or standalone with CAD import. Most users run the add-in mode for seamless CAD-CAM updates.

## The 4-step EdgeCAM entry workflow

1. **Open part in SolidWorks/Inventor** (EdgeCAM activates as add-in)
2. **Switch to EdgeCAM** (EdgeCAM → Setup → pick machine + stock)
3. **Apply Waveform Roughing** (Toolpaths → Waveform → pick pocket):
   - Stepover: 5-15% (chip-thinning)
   - Engagement: auto
4. **Post-process** (Code Generator → pick post)

[per EdgeCAM 2024 Help §2]

## EdgeCAM-specific traits

- **Strategy Manager**: store + reuse strategies across projects (similar to PowerMill template database)
- **Inspect feature**: built-in CMM-style verification with PRISM \`prism_cam cam_edgecam_get_operations --category=inspect\`
- **Hexagon ecosystem**: integrates with Hexagon's CMM (PC-DMIS) for closed-loop quality
- **JM Die EdgeCAM exposure**: limited

[per EdgeCAM 2024 + Hexagon Manufacturing Suite Overview]

## Closing the loop — 4-CAM decision matrix update

Adding courses 19-25 entries to the cross-CAM decision matrix (extends course-19 mod 4):

| Part type | Best CAM | Why |
|-----------|----------|-----|
| Tier-1 aerospace OEM (PMI-driven) | CATIA, NX, or Creo NC | Native PMI integration |
| Auto-5-axis mold/die (1-click) | WorkNC | Auto5 conversion |
| Mill-turn Swiss + 2nd-spindle sync | GibbsCAM or Esprit | Designed mill-turn-first |
| SolidWorks/Inventor-native add-in | SolidCAM, EdgeCAM, or Inventor HSM | Zero export step |
| Custom toolpath + Boolean stock | Mastercam (largest tribal corpus) | Operator familiarity |

[per CIMdata 2023 + decision matrix from courses 19 + 25]`,
      },
    ],
    quiz: [
      {
        id: "course-25-m4-q1",
        type: "multiple_choice",
        prompt: "EdgeCAM's distinctive integration is with which ecosystem?",
        options: [
          "Standalone only",
          "Autodesk (Fusion 360 + Inventor + Vault)",
          "SolidWorks/Inventor add-in + Hexagon CMM (PC-DMIS) for closed-loop quality",
          "PTC Creo native",
        ],
        correctIndex: 2,
        explanation: "Per EdgeCAM 2024 Help + Hexagon Manufacturing Suite: EdgeCAM runs as an add-in inside SolidWorks or Inventor for seamless CAD-CAM updates. It also integrates with Hexagon's PC-DMIS CMM for closed-loop quality control — measurement results from PC-DMIS feed back into EdgeCAM for toolpath correction.",
        topicTags: ["edgecam", "hexagon_ecosystem", "cad_cam_integration"],
      },
    ],
    prismEngines: ["CurriculumEngine", "EdgecamFunctionIndexEngine"],
    prismDispatcherActions: ["cam_edgecam_get_operations"],
  },
];

export const COURSE_25_MODULES: Module[] = modules;
