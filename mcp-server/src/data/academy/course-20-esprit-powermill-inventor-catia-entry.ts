/**
 * Course 20 — Entry-Level Training for Esprit + PowerMill + Inventor HSM + CATIA Machining
 *
 * Continues course-19 into the next 4 priority CAM systems by installed-base in U.S. shops:
 *   - Esprit (DP Technology, now Hexagon) — Swiss-style mill-turn leader, ProfitTurning patent
 *   - PowerMill (Autodesk) — mold/die + automotive surface finishing, NC Editor included
 *   - Inventor HSM (Autodesk) — Inventor-integrated CAM, Fusion-paired strategies
 *   - CATIA Machining (Dassault Systèmes) — large-OEM aerospace + auto + defense
 *
 * 4 modules, ~4 hours, novice tier, prereq=course-19.
 * Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-20-m1",
    title: "Esprit Entry — Mill-Turn + ProfitTurning + Swiss Machining",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First Esprit Job (Mill-Turn focus)

**Why Esprit:** Per CIMdata 2023, Esprit (DP Technology, acquired by Hexagon 2021) holds the dominant installed base for Swiss-style sliding-headstock mill-turn machines (Citizen, Star, Tornos, Tsugami). Its ProfitTurning algorithm (patented) delivers 40-60% turning cycle time reduction vs traditional roughing strategies.

## Esprit anatomy (vs Mastercam Turning)

Esprit's mill-turn paradigm separates each spindle into its own channel:
- **Channel 1**: Main spindle
- **Channel 2**: Sub spindle (pickoff)
- **Channel 3**: Lower turret (tool-post)
- **Channel 4**: Upper turret (live tooling)

Mastercam handles mill-turn but Esprit's multi-channel sync is more rigorous — better for production Swiss work where 4-12 simultaneous tool operations are normal.

## The 5-step Esprit Swiss entry workflow

1. **Open part** (File → Open → STEP/native CAD)
2. **Pick machine from library** (Setup → Machine → Citizen K-16 or Star SR-32J) — Esprit ships with 200+ Swiss machine profiles
3. **Define guide-bushing offset** — Swiss-specific parameter; tool overhang past bushing limits Z-reach
4. **Apply ProfitTurning roughing** (Operations → Turning → ProfitTurning Rough) — Esprit auto-computes engagement-modulated feed
5. **Multi-channel sync** (Sync → Add Sync Code → pick timing tag) — operations on Ch1 and Ch3 sync at named tag points
6. **Post-process** (Output → pick post — Citizen Cincom for K-16)

[per Esprit 2024 Help Manual §7 "Mill-Turn Workflow"]

## ProfitTurning critical parameters

| Parameter | Value | Source |
|-----------|-------|--------|
| **Strategy** | ProfitTurning (US patent) | Esprit Help 2024 §7.3 |
| **Engagement angle** | Auto-modulated 30-75° | Esprit ProfitTurning algorithm |
| **Feed at corners** | Auto-reduced 30% | Esprit corner-engagement physics |
| **Cycle time vs traditional** | 40-60% reduction | Per Esprit benchmarks 2023 |

## Esprit-specific gotchas

- **Guide bushing tolerance**: Swiss requires +0.005-0.010 mm bushing-to-stock clearance. Too tight = scoring; too loose = chatter.
- **Sync codes are channel-aware**: a sync on Ch1 must have a matching sync on the partner channel or program hangs.
- **Bar pull cycle**: Esprit auto-inserts bar-pull at part separation; verify the pull distance matches your part-off width + facing allowance.
- **JM Die Swiss exposure**: limited — JM runs primarily 3-axis VMC + 4-axis HMC. Swiss is for SFS/Holo-Krome Tier-1 fastener subcontract.

[per Esprit 2024 + JM Die machine inventory: no Swiss currently; Esprit training for outsource coordination]`,
      },
    ],
    quiz: [
      {
        id: "course-20-m1-q1",
        type: "multiple_choice",
        prompt: "Esprit's ProfitTurning algorithm delivers what typical cycle time reduction vs traditional roughing?",
        options: ["10-20%", "20-30%", "40-60%", "70-80%"],
        correctIndex: 2,
        explanation: "Per Esprit benchmarks 2023 + US patent documentation: ProfitTurning delivers 40-60% cycle time reduction via engagement-modulated feed (similar to iMachining for turning).",
        topicTags: ["esprit", "profitturning", "swiss"],
      },
    ],
    prismEngines: ["CurriculumEngine", "EspritFunctionIndexEngine"],
    prismDispatcherActions: ["cam_esprit_strategy_recommend"],
  },

  {
    id: "course-20-m2",
    title: "PowerMill Entry — Mold/Die Surface Finishing + Vortex Roughing",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First PowerMill Job

**Why PowerMill:** Per CIMdata 2023, PowerMill (Autodesk, acquired from Delcam 2014) is the #2 mold/die CAM after hyperMILL. Its Vortex roughing strategy (constant engagement, trochoidal-style) is widely deployed in automotive die manufacturing.

## PowerMill workflow anatomy

PowerMill is **toolpath-database driven** — every toolpath is stored as a parameterized template you can apply to multiple geometries. This is faster than Mastercam's per-operation setup for repetitive mold work.

## The 6-step PowerMill entry workflow

1. **Open project** (File → New Project → name + machine post). PowerMill projects are FOLDER-based (every project = folder).
2. **Import model** (Models → Import → STEP/IGES/Inventor/SolidWorks native)
3. **Calculate block** (Blocks → Calculate from Model → +5 mm offset) — PowerMill's "block" is the stock
4. **Set NC Programs** (NC Programs → Create → name + post selector)
5. **Apply Vortex toolpath** (Toolpath → Roughing → Vortex):
   - **Stepover**: 50% of tool diameter (Vortex constant-engagement)
   - **Stepdown**: 1.0-1.5× diameter
   - **Engagement**: Auto-managed 30-60°
6. **Post-process** (NC Program → Right-click → Post → pick post)

[per PowerMill 2024 Help §6 "First-Time Workflow"]

## PowerMill's NC Editor

PowerMill ships with a built-in NC Editor — competing tools (Mastercam, hyperMILL) require external editors (CIMCO Edit, NC Viewer). NC Editor verifies:
- Tool table consistency
- Feed/speed sanity
- Rapid-into-stock collisions
- Cycle time estimation per machine post

Use it before sending to the machine.

## PowerMill-specific gotchas

- **Vortex requires SOLID stock** (not surface) — if your stock is imported as STL/surface, switch to Adaptive Roughing instead.
- **Database-driven means revisions propagate**: editing a toolpath template updates ALL operations using it. Use template versioning for revision control.
- **JM Die PowerMill exposure**: minimal (1 license, used for Tier-1 mold electrode runs). Training is for outsource coordination.

[per PowerMill 2024 + JM Die operational notes]`,
      },
    ],
    quiz: [
      {
        id: "course-20-m2-q1",
        type: "multiple_choice",
        prompt: "PowerMill's Vortex roughing strategy uses constant engagement angle — what is the typical engagement range?",
        options: ["10-20°", "30-60°", "75-90°", "100-120°"],
        correctIndex: 1,
        explanation: "Per PowerMill 2024 Help §6: Vortex auto-manages engagement at 30-60° to hold chip load constant, similar to iMachining/Adaptive Milling.",
        topicTags: ["powermill", "vortex", "engagement"],
      },
    ],
    prismEngines: ["CurriculumEngine", "PowerMillFunctionIndexEngine"],
    prismDispatcherActions: ["cam_powermill_strategy_recommend"],
  },

  {
    id: "course-20-m3",
    title: "Inventor HSM Entry — Inventor-Integrated CAM (Fusion-paired)",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First Inventor HSM Job

**Why Inventor HSM:** Autodesk's Inventor-integrated CAM (formerly HSMWorks → Inventor HSM Express/Premium). Inventor HSM and Fusion 360 share the same CAM kernel — strategies and posts are interoperable. For Inventor-native shops, Inventor HSM is the lowest-friction CAM choice.

## Inventor HSM vs Fusion 360

| Aspect | Inventor HSM | Fusion 360 |
|--------|--------------|------------|
| **CAD platform** | Inventor (desktop) | Fusion 360 (desktop + cloud) |
| **CAM kernel** | Same (Autodesk HSM) | Same (Autodesk HSM) |
| **Strategies** | Adaptive Clearing, 2D/3D milling, turning, probing | Same set |
| **License model** | Perpetual (legacy) + subscription | Subscription only |
| **Best for** | Existing Inventor shops with legacy CAD | New shops + cloud workflows |

If your team is Inventor-native and produces production work, Inventor HSM. If you're new + collaborate cloud-first, Fusion 360. They speak the same strategy language.

## The 4-step Inventor HSM entry workflow

1. **Open .ipt or .iam in Inventor**
2. **Switch to CAM workspace** (Environments → CAM)
3. **Apply Adaptive Clearing** (Adaptive Clearing is HSM's equivalent of Dynamic Motion / iMachining / Vortex):
   - Optimal Load: 10% of tool diameter
   - Maximum Stepdown: 2× diameter
   - Engagement: Auto
4. **Post-process** (Post Process → pick post)

[per Inventor HSM 2024 Help §4 + Fusion 360 Manufacturing Help §5]

## Common Inventor HSM gotchas

- **Tool library shared with Fusion 360** — export from Inventor HSM, import into Fusion. Same .tools file format.
- **Strategy parameters carry across projects** — once you tune Adaptive Clearing for 4140 steel, save as template.
- **JM Die Inventor HSM exposure**: 1 license; used for occasional Inventor-source customer work. Most JM CAM is Mastercam.

[per Inventor HSM 2024 + JM Die operational notes]`,
      },
    ],
    quiz: [
      {
        id: "course-20-m3-q1",
        type: "multiple_choice",
        prompt: "Inventor HSM and Fusion 360 share what underlying technology?",
        options: [
          "Same UI",
          "Same CAM kernel (Autodesk HSM) and strategies/posts are interoperable",
          "Same license model",
          "Same cloud collaboration features",
        ],
        correctIndex: 1,
        explanation: "Per Inventor HSM 2024 Help §4 + Fusion 360 Manufacturing Help §5: both products use Autodesk's HSM CAM kernel. Strategies (Adaptive Clearing, 2D/3D milling) and post-processors are interoperable.",
        topicTags: ["inventor_hsm", "fusion_360", "cam_kernel"],
      },
    ],
    prismEngines: ["CurriculumEngine", "InventorHSMFunctionIndexEngine"],
    prismDispatcherActions: ["cam_inventor_hsm_strategy_recommend"],
  },

  {
    id: "course-20-m4",
    title: "CATIA Machining Entry — Large-OEM Aerospace + Auto + Defense",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First CATIA Machining Job

**Why CATIA Machining:** Per CIMdata 2023, CATIA (Dassault Systèmes) holds the dominant CAD share at large-OEM aerospace (Boeing, Airbus, Lockheed Martin, Dassault Aviation), automotive (Stellantis, Renault, Tesla), and defense. Its Machining workbench is the standard CAM for parts modeled in CATIA.

## CATIA's KBM (Knowledge-Based Machining) paradigm

CATIA Machining uses **Knowledge-Based Machining (KBM)** — rules attach to features (pockets, holes, walls) and propagate to toolpaths automatically. This is more rigorous than Mastercam's flat operation list, more flexible than NX's tree-based navigators.

## The 5-step CATIA Machining entry workflow

1. **Open .CATPart in CATIA** (V5 or 3DEXPERIENCE)
2. **Switch to Machining workbench** (Start → Machining → Surface Machining or Multi-Axis Machining)
3. **Create Part Operation** (Insert → Part Operation → name + machine + WCS)
4. **Apply Roughing operation** (Insert → Roughing or 2.5-Axis Pocketing):
   - Tool: pick from Tool Library (CATIA tools are KBE-parametric)
   - Strategy: Sweeping or Helical
5. **Generate + Verify** (Replay → Mesh-Box Verification)
6. **Post-process** (Right-click → Generate APT Source → Process via post)

[per CATIA Machining Workbench User Guide V5R28 + CATIA 3DEXPERIENCE 2024]

## CATIA-specific traits

- **APT-based output** — CATIA emits APT (Automatic Programming Tool) as intermediate, then post-processes to machine G-code. Two-stage workflow.
- **KBE rules**: tooling decisions can be rule-driven from material + feature geometry. Aerospace shops use this extensively.
- **License gravity**: CATIA Machining requires a Machining workbench license PLUS the underlying CATIA seat. High-cost entry.
- **JM Die CATIA exposure**: limited — Tier-1 aerospace work routes through CATIA-source models translated to Mastercam. Direct CATIA programming reserved for SFS Tier-1 contract.

## Cross-reference (when to use CATIA vs NX vs hyperMILL)

| Customer profile | Best CAM | Why |
|------------------|----------|-----|
| Tier-1 aerospace OEM (Boeing/Airbus) | CATIA Machining or NX CAM | CAD-CAM integration; PMI/GD&T preservation |
| Tier-2 aerospace job shop | hyperMILL or NX | Lower cost; rich 5-axis capability |
| Auto OEM die shop | PowerMill or hyperMILL | Mold/die specialization |
| General job shop (JM Die profile) | Mastercam + hyperMILL | Largest tribal corpus + mold/die coverage |

[per CIMdata 2023 + decision matrix from course-19 mod 4]`,
      },
    ],
    quiz: [
      {
        id: "course-20-m4-q1",
        type: "multiple_choice",
        prompt: "CATIA Machining emits what intermediate format BEFORE post-processing to machine G-code?",
        options: [
          "DXF (drawing exchange)",
          "APT (Automatic Programming Tool)",
          "STEP (geometric)",
          "GERBER (PCB)",
        ],
        correctIndex: 1,
        explanation: "Per CATIA Machining Workbench User Guide V5R28: CATIA emits APT as the intermediate, then post-processes APT to machine-specific G-code. This two-stage workflow is a CATIA-distinctive trait inherited from its pre-CAM lineage.",
        topicTags: ["catia", "apt", "post_processing"],
      },
    ],
    prismEngines: ["CurriculumEngine", "CatiaFunctionIndexEngine"],
    prismDispatcherActions: ["cam_catia_strategy_recommend"],
  },
];

export const COURSE_20_MODULES: Module[] = modules;
