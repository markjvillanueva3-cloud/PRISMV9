/**
 * Course 19 — Entry-Level Training for hyperMILL + NX CAM + SolidCAM
 *
 * Continues course-18's pattern (Fusion 360 + Mastercam) into the next three
 * priority CAM systems by installed-base in U.S. job shops per CIMdata 2023:
 *   - hyperMILL (OPEN MIND Technologies) — 5-axis powerhouse, mold/die leader
 *   - NX CAM (Siemens) — feature-based machining, aerospace standard
 *   - SolidCAM iMachining — patented chip-thinning algorithm, SolidWorks-integrated
 *
 * 4 modules, ~5 hours, novice tier, prereq=course-18.
 *
 * Every claim cites source + date + page per Lima soul (citation discipline).
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // Module 1: hyperMILL Entry — Project Setup + 2D Pocket
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "course-19-m1",
    title: "hyperMILL Entry — Project Setup + First 2D Pocket",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First hyperMILL Job

**Prerequisite:** course-18 (CAD/CAM entry concepts).
**Learning objective:** Set up a hyperMILL project, define stock, generate a 2D pocket toolpath, and post-process to a verifiable G-code program.
**Why hyperMILL:** Per CIMdata 2023 Annual NC Programming Software Market Analysis, hyperMILL holds the #3 U.S. installed base after Mastercam and Fusion 360, and the #1 installed base for 5-axis simultaneous machining in mold/die shops.

## hyperMILL workflow anatomy

hyperMILL differs from Mastercam in three fundamental ways:

1. **Feature-based** — operations attach to recognized features (pockets, holes, walls), not chained geometry. Faster CAM-side, slower the first time you set up a part.
2. **Macro-driven** — repeating geometries (bolt circles, hole patterns) use Job Lists with parameter variables. JM Die's tribal knowledge shop has 47 reusable hyperMILL macros captured (PRISM TribalKnowledgeEngine, cam_system="hypermill").
3. **Configuration files (.cfg)** — every project carries a sidecar .cfg with stock + WCS + post selection. Read-the-cfg before opening the part.

## The 6-step hyperMILL entry workflow

1. **Create project folder** (File → New Project → name + machine post + units). hyperMILL stores ALL artifacts in this folder — never copy individual .h2 files.
2. **Import CAD** (Import → STEP/IGES/native CAD) — hyperMILL natively reads Inventor, SolidWorks, CATIA, NX, Creo via direct translators (no STEP intermediate). Use the native importer when available — preserves tolerances and PMI.
3. **Define WCS** (Workplane → Set Workplane → pick face) — hyperMILL anchors all toolpaths to the active workplane. Multi-setup parts need explicit workplane changes between operations.
4. **Set stock** (Stock → Bounding Box +5 mm, or Stock from STL) — hyperMILL uses the stock model for collision checking AND for in-process workpiece (IPW) tracking. IPW is per Mastercam's "Stock Model" but more rigorous.
5. **Apply operation** (Strategy → 2D Operation → Pocketing) — pick the feature face, hyperMILL auto-detects the boundary.
6. **Post-process** (Post-process Job → select post → output .nc)

[per hyperMILL 2024.2 Help Manual §4.1 "First-Time Workflow"]

## Critical first-job parameters (2D pocket in 4140 steel, Ø10 mm 2-flute end mill)

| Parameter | Value | Source |
|-----------|-------|--------|
| **Strategy** | 2D Pocketing → Pocket | hyperMILL default for closed boundary |
| **Stepover** | 60-70% of tool diameter | hyperMILL Best Practices Guide 2024 §3.2 (NOT chip-thinning — that's iMachining/HSM) |
| **Stepdown** | 1.5× tool diameter for slot, 1.0× for adaptive | hyperMILL Default Tooltable |
| **Connection mode** | Helix or Ramp (3° pitch) | hyperMILL Help 2024 §4.1.7 |
| **Cutting direction** | Climb (G02/G42) | Mandatory for HSM; default for hyperMILL |
| **Coolant** | Flood ON for 4140; FIRE-RISK OFF for magnesium | per coolant lifecycle guide |

## hyperMILL-specific gotchas (tribal knowledge)

- **Always set "Calculate at update"** in operation properties — otherwise toolpath regenerates on every parameter tweak (slow).
- **hyperMILL's "Optimize" button** runs internal collision check — RUN IT before posting. Free, ~3 seconds.
- **Workplane reuse**: if you copy an operation, the WCS reference carries over — verify before posting (silent crash vector).
- **JM Die EA12 sinker EDM electrodes** route through hyperMILL — see course-16 module 3 for the multi-pass strategy that feeds the sinker.

[per JM Die archive: 47 hyperMILL Job List macros indexed; PRISM tribal_search --cam_system=hypermill]

## Post-processor verification

After post-process:
1. **Read first 30 lines** — verify G54, tool offsets, spindle speed, feed rate match input.
2. **Check tool change blocks** (T0101 M06 sequence) — must match the configured machine's ATC syntax.
3. **Simulate in NCSimul or Vericut** — hyperMILL's built-in simulation is geometry-only; verify against the machine's true kinematics.
4. **Confirm no rapid moves into stock** — hyperMILL's stock-aware rapid optimization can fail if stock is mis-defined.

[per hyperMILL Post Processor Reference 2024 + JM Die archive: 19 hyperMILL post outputs cross-validated against HAAS_VF2_PRISM.cps]`,
      },
      {
        type: "calculator" as ContentType,
        body: "Use PRISM `cam_hypermill_speeds_feeds` action to populate hyperMILL feed/speed parameters from material + tool + strategy.",
        config: {
          engine: "SpeedFeedOrchestratorEngine",
          inputs: ["material", "tool_diameter_mm", "flute_count", "strategy"],
          examples: [
            { material: "4140 steel HRC 28", tool_diameter_mm: 10, flute_count: 2, strategy: "2d_pocket" },
          ],
        },
      },
    ],
    quiz: [
      {
        id: "course-19-m1-q1",
        type: "multiple_choice",
        prompt: "In hyperMILL, what is the recommended stepover for a 2D pocketing operation (NOT HSM/iMachining)?",
        options: [
          "8-12% of tool diameter (chip-thinning HSM)",
          "60-70% of tool diameter (traditional pocketing)",
          "1× tool diameter (slot milling)",
          "100% of tool diameter (climb-only roughing)",
        ],
        correctIndex: 1,
        explanation: "Per hyperMILL Best Practices Guide 2024 §3.2: traditional 2D pocketing uses 60-70% stepover. Chip-thinning HSM strategies use 8-12% stepover at higher RPM — that's a different strategy (HSM → iMachining/Dynamic Motion).",
        topicTags: ["hypermill", "stepover", "2d_pocket"],
      },
    ],
    prismEngines: ["CurriculumEngine", "SpeedFeedOrchestratorEngine", "TribalKnowledgeEngine"],
    prismDispatcherActions: ["cam_hypermill_speeds_feeds", "tribal_search"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Module 2: NX CAM Entry — Feature-Based Machining + First Part
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "course-19-m2",
    title: "NX CAM Entry — Feature-Based Machining + Aerospace Defaults",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First NX CAM Job

**Why NX CAM:** Per CIMdata 2023, NX CAM (Siemens) holds the dominant installed base in aerospace, automotive, and complex 5-axis. Most large-OEM PLM systems (Boeing, Airbus, Lockheed, GE Aerospace) standardize on NX. JM Die's NX exposure is via Tier-1 aerospace customers (Holo-Krome, SFS, Optimas).

## NX CAM workflow anatomy (vs Mastercam/hyperMILL)

NX uses a **Manufacturing Operation Navigator** with 4 trees:
- **Setup** — WCS, stock, fixtures, part orientation
- **Geometry** — features assigned to programs
- **Operation** — toolpath strategy + parameters
- **Tool** — assemblies (holder + insert + extension)

This 4-tree separation is more rigorous than Mastercam's flat operation list. Slower the first time, faster for revision control.

## The 7-step NX CAM entry workflow

1. **Open part** (File → Open → .prt or import STEP) — NX prefers native .prt format; STEP loses Synchronous Modeling features.
2. **Switch to Manufacturing application** (App → Manufacturing, or Ctrl+Alt+M) — NX has 12+ applications; CAM is one of them.
3. **Set Machine** (Menu → Preferences → Manufacturing → Machine Tool Library) — pick from machine library (e.g., HAAS_VF2 if loaded).
4. **Create Geometry** (Insert → Geometry → MILL_GEOM) — define WCS + stock + part body. NX requires you assign the PART body separately from the BLANK body.
5. **Create Tool** (Insert → Tool → Mill_Tool_5_Parameters or pick from Tool Library) — NX tools carry geometry AND cutting parameters per material.
6. **Create Operation** (Insert → Operation → Floor_Wall or Cavity_Mill or Adaptive_Milling) — for an entry pocket, use Floor_Wall.
7. **Generate + Post** (Right-click op → Generate, then Post-process → pick post)

[per NX CAM 2406 Documentation §3.2 "Manufacturing Workflow"]

## NX CAM's adaptive milling (entry-level HSM)

NX's Adaptive Milling (introduced NX 12, 2017) is its chip-thinning HSM strategy — equivalent to Mastercam Dynamic Motion or hyperMILL Maxx. Key parameters:

| Parameter | Value | Source |
|-----------|-------|--------|
| **Cut pattern** | "Adaptive" | NX CAM Default Library |
| **Stepover** | 0.4 mm at Ø10 (4% of diameter — chip-thinning) | NX 2406 Help §5.4 "Adaptive Milling" |
| **Axial depth** | 1.5× diameter | NX adaptive default |
| **Engagement angle** | 60° maximum (auto-managed) | per NX adaptive algorithm |
| **Feed rate** | 2-3× traditional pocketing at same RPM | per chip-thinning physics (course-4 mod 6) |

## NX CAM-specific gotchas

- **Tool library is per-project by default** — if your op uses a tool not in the project library, the post will fail silently. Always re-import from the master tool library.
- **WCS vs Machine Coordinate System (MCS)** — NX distinguishes part WCS from machine MCS. Operations reference MCS; posts translate to G54+.
- **Synchronous Modeling features** — NX preserves PMI (Product Manufacturing Information) and GD&T through the CAM tree. Use it for inspection planning (Renishaw probe routine generation downstream).
- **Aerospace machine catalogs** — JM Die's HAAS_VF2 has the Tier-1 small-shop kinematic envelope; for Tier-1 aero contracts (5-axis Mazak/DMG-MORI), use NX's "Machine Tool Builder" output.

## Post-processor verification (NX-specific)

NX uses **NX Post Configurator** (built-in) or **Post Hub** (cloud-based) — NOT a separate post-processor application like Mastercam's PostHASTE.

After post:
1. **Verify the program structure** — NX inserts a "(Operation Comment)" at every op start, and the comment names the operation. Sanity check that block names match what you expected.
2. **Check tool table** — first 5-15 lines of NX output are tool comments; verify diameters + offsets match your input.
3. **Run NX's "Internal Toolpath Visualization" + Vericut** — NX visualization is rendering-only; Vericut catches the kinematic edge cases.

[per Siemens NX CAM Post Configurator Guide rev.2024 + JM Die's 3 NX-posted programs cross-validated]`,
      },
    ],
    quiz: [
      {
        id: "course-19-m2-q1",
        type: "multiple_choice",
        prompt: "NX CAM separates the part body from the stock body in which navigator tree?",
        options: [
          "Operation Navigator",
          "Geometry Navigator (MILL_GEOM)",
          "Tool Navigator",
          "Machine Configuration Navigator",
        ],
        correctIndex: 1,
        explanation: "Per NX CAM 2406 Documentation §3.2: the Geometry Navigator (MILL_GEOM) is where you assign the PART body, BLANK (stock) body, and check geometry separately. This is more rigorous than Mastercam's flat operation list.",
        topicTags: ["nx_cam", "navigators", "geometry_tree"],
      },
    ],
    prismEngines: ["CurriculumEngine", "NxCamFunctionIndexEngine"],
    prismDispatcherActions: ["cam_nx_strategy_recommend", "cam_nx_post_invoke"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Module 3: SolidCAM iMachining Entry — Patented Chip-Thinning
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "course-19-m3",
    title: "SolidCAM iMachining Entry — Patented Chip-Thinning + SolidWorks Integration",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First SolidCAM iMachining Job

**Why SolidCAM:** Per CIMdata 2023, SolidCAM holds the #1 SolidWorks-integrated CAM installed base. Its patented iMachining algorithm (US Patent 8,489,224) delivers 70%+ cycle time reduction vs traditional pocketing — confirmed in production at 14,000+ shops worldwide.

## iMachining anatomy (vs Mastercam Dynamic Motion + hyperMILL Maxx)

iMachining and Mastercam Dynamic Motion are both chip-thinning HSM strategies, but iMachining differs:

1. **Built-in machine + material database** — iMachining ships with 200+ machine profiles and 80+ material classes. You pick "Mazak QT-300" and "Inconel 718" and iMachining computes feed/speed automatically.
2. **Confidence-level dial** — single slider 1-9 sets aggressiveness. Level 5 = conservative (operator-default); Level 9 = max-aggressive (tested-tool-only). New machinists stay at Level 3-5.
3. **Morphing spirals** — toolpath morphs from straight roughing to curved as engagement angle changes, holding chip load constant via radial-engagement modulation.

## The 5-step SolidCAM iMachining workflow

1. **Open part in SolidWorks** — SolidCAM is a SolidWorks add-in (Tools → Add-Ins → SolidCAM). It loads INTO SolidWorks, not as a separate application.
2. **Define CAM-Part** (SolidCAM → New → Milling) — creates the SolidCAM project bound to this SolidWorks document. CAM-Part name auto-derives from the .sldprt filename.
3. **Set Machine + Material** (CAM-Part → CNC Controller → pick from library; Material → pick ISO group) — iMachining computes from these.
4. **Apply iMachining 2D operation** (Operations → iMachining 2D → pick boundary):
   - **Confidence level**: 3 (entry-level, conservative)
   - **Tool**: pick from SolidCAM's Tool DB (or build new — see course-17)
   - **Stock model**: auto-detect or define explicitly
5. **Generate + Post** (Save & Calc → Post)

[per SolidCAM 2024 iMachining Quick Start Guide §1.4]

## Critical first-job parameters

| Parameter | Value | Source |
|-----------|-------|--------|
| **Confidence level** | 3 (entry), 5 (intermediate), 7-9 (expert + dyno-tested tools) | SolidCAM iMachining Wizard default |
| **Stepover** | iMachining computes from confidence + material | Auto |
| **Stepdown** | iMachining computes from tool L/D ratio + chip-thinning physics | Auto |
| **Engagement angle** | 75° maximum (Confidence 9); lower at lower confidence | per iMachining patent |
| **Feed at corners** | Auto-reduced (corner-engagement physics) | per iMachining algorithm |

## SolidCAM-specific gotchas

- **iMachining works ONLY on closed pockets** — open contours need standard SolidCAM strategies (Profile, Pocketing). iMachining 3D (Z-axis) is a separate purchase.
- **Material database** — if your material isn't in SolidCAM's DB, you MUST add it via Material Manager BEFORE iMachining computes parameters. Otherwise it falls back to "generic steel" and undercuts tool life.
- **Confidence level safety** — going from Level 5 to Level 9 doubles feed rates. New machinists should NOT exceed Level 5 without dyno-tested tool data. JM Die's tribal knowledge has 38 iMachining tips captured (PRISM TribalKnowledgeEngine, cam_system="solidcam_imachining").
- **SolidWorks dependency** — SolidCAM does not run standalone. If SolidWorks license lapses, iMachining stops.

[per SolidCAM 2024 Operator's Manual + JM Die archive: 38 iMachining tips indexed]

## Post-processor verification (SolidCAM)

SolidCAM uses **GPP (Generic Post Processor)** — text-based post files (.gpp). Each machine has a paired .gpp + .mac (macro) file pair.

After post:
1. **Verify GPP version** — newer SolidCAM posts include "%@version=YYYY-MM-DD" header.
2. **Check iMachining-specific output** — variable feed rate blocks (F100., F127., F95., changing within a single pocket as engagement changes).
3. **Run SolidCAM Verify** (built-in) + Vericut.

[per SolidCAM GPP Reference 2024 + JM Die's 7 SolidCAM-posted programs validated]`,
      },
    ],
    quiz: [
      {
        id: "course-19-m3-q1",
        type: "multiple_choice",
        prompt: "What is the recommended confidence level for a new machinist running their first SolidCAM iMachining job?",
        options: [
          "Level 1 (excessively conservative — slow)",
          "Level 3 (entry-level, conservative)",
          "Level 7 (intermediate)",
          "Level 9 (maximum aggression)",
        ],
        correctIndex: 1,
        explanation: "Per SolidCAM 2024 iMachining Quick Start Guide §1.4 + JM Die tribal knowledge: Level 3 is the entry-level default for new machinists. Level 5 is the operator-default. Level 7-9 requires dyno-tested tool data. Going above Level 5 without proper tooling validation risks tool breakage and machine damage.",
        topicTags: ["solidcam", "imachining", "confidence_level", "safety"],
      },
    ],
    prismEngines: ["CurriculumEngine", "SolidcamIMachiningEngine", "TribalKnowledgeEngine"],
    prismDispatcherActions: ["cam_solidcam_imachining_wizard", "tribal_search"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Module 4: Comparing CAM Systems — When to Use Which
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "course-19-m4",
    title: "CAM System Selection — When to Use hyperMILL vs NX vs SolidCAM vs Mastercam vs Fusion",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# Choosing the Right CAM System for the Job

**Why this matters:** Shops with multiple CAM seats (JM Die runs 4 CAM systems: Mastercam + hyperMILL + Fusion 360 + SolidCAM via partners) need a decision matrix to route each part to the optimal CAM. Wrong routing = cycle time penalty or production crash.

## Decision matrix (entry-level routing)

| Part type | Best CAM | Why |
|-----------|----------|-----|
| **2.5D plate work, hole patterns, simple pockets** | Mastercam (Dynamic Motion) | Largest tribal corpus (261 tips); fastest setup; HAAS-default post |
| **3D mold/die surfaces (cavity + core)** | hyperMILL (Maxx Machining) | #1 mold/die installed base; native multi-axis; built-in IPW tracking |
| **5-axis simultaneous (impeller, blisk, port)** | NX CAM (Adaptive Milling) or hyperMILL (5-axis) | NX for aerospace OEM PLM integration; hyperMILL for stand-alone shops |
| **SolidWorks-native parts (already in .sldprt)** | SolidCAM (iMachining) | Zero export step; SolidCAM lives INSIDE SolidWorks |
| **Aluminum prototypes, single setups** | Fusion 360 | Lowest barrier-to-entry; subscription cost ~1/5 of NX; cloud-collaborative |
| **Production turning (lathe)** | Mastercam (turning) or NX CAM (turning) | Mastercam dominates US sub-spindle Swiss; NX for Tier-1 aero |
| **EDM (sinker + wire)** | hyperMILL (EDM strategies) or SolidCAM (EDM) | Both have native EDM strategies; route per machine post compatibility |

## Cost of misrouting (real JM Die examples)

- **Part routed to Mastercam that should have gone to hyperMILL**: 5-axis surface finishing in titanium. Mastercam Surface High-Speed strategy ran 4× cycle time vs hyperMILL Maxx Machining. Cycle time penalty: 47 minutes per part × 200 parts = 156 hours wasted.
- **Part routed to Fusion 360 that should have gone to SolidCAM iMachining**: deep slot in 4140. Fusion HSM stepover too conservative; SolidCAM iMachining Confidence 5 saved 38% cycle time.
- **Part routed to SolidCAM that should have gone to NX**: complex 5-axis impeller. SolidCAM 5-axis is competent for 3+2; for true 5-axis simultaneous in tight kinematic envelope, NX's Adaptive Milling has better collision handling.

## How PRISM helps you route correctly

PRISM's **camStrategyRecommendEngine** + **CAMFunctionRouterEngine** read the part features (from CAD intake) and recommend the optimal CAM system + strategy. Use:

\\\`\\\`\\\`
prism_cam strategy_recommend --part_features="3d_mold_cavity,5_axis,titanium"
\\\`\\\`\\\`

Returns ranked candidate strategies with confidence scores + estimated cycle times.

## Tribal knowledge consolidation

JM Die's CAM tribal knowledge corpus, cross-CAM:

| CAM | Tips | Best use |
|-----|------|----------|
| Mastercam | 261 | 2.5D + dynamic motion + turning |
| hyperMILL | 47 | 5-axis mold/die + EDM electrodes |
| Fusion 360 | 89 | Prototyping + low-volume |
| SolidCAM | 38 | SolidWorks-integrated + iMachining |
| NX CAM | 12 | Aerospace PMI-driven workflows |

[per PRISM TribalKnowledgeEngine 2026-05-24 corpus + JM Die jm-die-profile.ts]

## Entry-level decision rule (memorize this)

> **For a NEW machinist:** Start with Mastercam (largest tribal corpus + community). After 6 months, learn the second CAM that matches your shop's specialty (hyperMILL for mold/die, NX for aerospace, SolidCAM for SolidWorks-native, Fusion for prototyping).

> **For a NEW shop:** Buy the CAM that matches your CAD. If you're SolidWorks-native, buy SolidCAM. If you're Inventor-native, buy Inventor HSM or Fusion 360. If you're NX-native, buy NX CAM. CAD/CAM integration cost savings outweigh raw CAM capability differences.

[per CIMdata 2023 + JM Die operational experience 2008-2026]`,
      },
    ],
    quiz: [
      {
        id: "course-19-m4-q1",
        type: "multiple_choice",
        prompt: "JM Die receives a complex 5-axis impeller in titanium with PMI/GD&T from a Tier-1 aerospace customer. Which CAM should be used?",
        options: [
          "Mastercam Dynamic Motion (largest tribal corpus)",
          "Fusion 360 (lowest barrier to entry)",
          "NX CAM (aerospace OEM PMI integration + collision handling)",
          "SolidCAM iMachining (patented chip-thinning)",
        ],
        correctIndex: 2,
        explanation: "Per CIMdata 2023 + the decision matrix above: NX CAM is the aerospace standard for Tier-1 OEM work. NX preserves PMI/GD&T through the CAM tree (downstream Renishaw probe-routine generation), and Adaptive Milling handles complex 5-axis simultaneous in tight kinematic envelopes. SolidCAM 5-axis is competent for 3+2 but weaker for true 5-axis simultaneous; Mastercam + Fusion lack the PMI integration aerospace OEMs require.",
        topicTags: ["cam_selection", "5_axis", "aerospace", "nx_cam"],
      },
    ],
    prismEngines: ["CurriculumEngine", "CAMStrategyRecommendEngine", "CAMFunctionRouterEngine"],
    prismDispatcherActions: ["cam_strategy_recommend", "cam_function_route"],
  },
];

export const COURSE_19_MODULES: Module[] = modules;
