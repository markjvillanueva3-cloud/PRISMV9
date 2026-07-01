/**
 * Courses 14-16: Electrode Making · Robot Arms (JM context) · Sinker EDM
 *
 * 2026-05-24 expansion. Each course mirrors the course-13 Wire EDM Progressive
 * template — entry → master with interactive calculator blocks and Lima-soul
 * citations on every claim.
 *
 *   Course 14: Electrode Making — copper + graphite electrode design,
 *              roughing/finishing electrode strategy, side-overcut/end-gap,
 *              orbital programming, master-level micro-electrodes.
 *
 *   Course 15: Robot Arms — JM Die context. Covers 6-axis articulated arms,
 *              gripper end-effectors, tool-changing, robot↔CNC handshake,
 *              path planning, safety envelopes, master-level lights-out cells.
 *              The "JM robot arm" prioritization tracks what JM's CNC fleet
 *              would integrate IF/WHEN a robot is acquired — the canonical
 *              feeder-pickoff handshake against the Okuma L300-M lathe.
 *
 *   Course 16: Sinker EDM — entry through master. Uses JM Die's Mitsubishi
 *              EA12S + EA12D as canonical examples. Electrode-workpiece gap,
 *              flushing strategy, orbital cuts, sealing pockets, micro-EDM.
 */

import type { Module, Lesson, ContentType } from "../../engines/CurriculumEngine.js";

// ═══════════════════════════════════════════════════════════
// Course 14: Electrode Making — Entry to Master
// ═══════════════════════════════════════════════════════════

const C14_ID = "course-14";

const c14_mod1Lessons: Lesson[] = [
  {
    id: `${C14_ID}-mod-1-les-1`,
    moduleId: `${C14_ID}-mod-1`,
    title: "Electrode Foundations — Copper vs Graphite vs Copper-Tungsten",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Electrode Materials

**Prerequisite:** course-1 (Manufacturing Fundamentals).
**Learning objective:** Choose electrode material per workpiece + surface + accuracy requirement.

## The 3 dominant electrode materials

| Material | When to use | Wear ratio | Surface achievable | Source |
|----------|-------------|-----------|---------------------|--------|
| **Copper (CuOFE)** | High-precision, fine finish, small details | 0.1-3% | Ra 0.2-0.4 µm | Sommer 2010 ch.10 §"Copper electrode" |
| **Graphite (POCO EDM-3, EDM-200)** | Roughing, large electrodes, complex geometry | 0.5-15% | Ra 1.6-3.2 µm | POCO Graphite EDM Manual 2022 §3 |
| **Copper-Tungsten (75W-25Cu)** | Carbide cutting, deep ribs, fine corners | 0.05-0.5% | Ra 0.2-0.4 µm | Schunk W-Material Catalog 2024 |

## Decision rule

Per Sommer 2010 p.276: "**For most production sinker work, run graphite for roughing and copper for finishing.** Graphite wears more but cuts 2-3× faster per ampere; copper wears less but slower — combining them gives optimum cycle time + surface finish."

## Why the wear ratio matters

If the **wear ratio** is 5%, every 1 mm of plunge depth wears the electrode by 0.05 mm. For a 10 mm-deep cavity that's 0.5 mm of electrode lost — enough to scrap the part if you didn't compensate. Modern controls auto-compensate via Z-axis correction tables, but the **as-cut depth ALWAYS subtracts the predicted wear**.

## Citation discipline

Sources:
- Sommer, "Complete EDM Handbook" 2010 ch.10 "Electrode Materials and Wear" pp.270-300
- POCO Graphite EDM Manual 2022 §3 "Grade selection for sinker electrodes"
- Schunk Tungsten-Copper Catalog 2024 (W-Cu composite electrodes)
- ISO 4287:1997 (Ra surface roughness definition)`,
      },
      {
        type: "diagram" as ContentType,
        title: "Electrode Sizing — Visual Reference (interactive)",
        body: "Cross-section showing the relationship between electrode dimensions, side overcut, and final cavity. Hover hotspots for the math. Per Sommer 'Complete EDM Handbook' 2010 p.135.",
        diagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" role="img" aria-label="Electrode-to-cavity sizing relationship"><rect x="0" y="0" width="400" height="220" fill="#0b1220" stroke="#334155"/><rect x="100" y="60" width="200" height="80" fill="none" stroke="#22d3ee" stroke-width="2"/><text x="200" y="105" fill="#22d3ee" font-size="11" text-anchor="middle">Cavity (final)</text><rect x="120" y="80" width="160" height="50" fill="none" stroke="#a78bfa" stroke-width="2" stroke-dasharray="4,2"/><text x="200" y="155" fill="#a78bfa" font-size="10" text-anchor="middle">Electrode (smaller by 2×overcut)</text><line x1="100" y1="60" x2="120" y2="80" stroke="#fde047" stroke-width="1.5"/><line x1="300" y1="60" x2="280" y2="80" stroke="#fde047" stroke-width="1.5"/><text x="50" y="100" fill="#fde047" font-size="9">side overcut</text><text x="200" y="200" fill="#94a3b8" font-size="8" text-anchor="middle">electrode = cavity − 2 × side_overcut</text></svg>`,
        annotations: [
          { x: 200, y: 100, label: "1", description: "Cavity (target dimension) — what the print requires after sparking. Solid cyan box." },
          { x: 200, y: 105, label: "2", description: "Electrode (dashed violet box) — smaller than cavity by 2× side overcut. Programmed dimension fed into CAM is the electrode size, NOT the cavity." },
          { x: 60, y: 95, label: "3", description: "Side overcut (yellow arrows) — typically 0.025-0.20 mm depending on cutting energy (finer = smaller). The cavity opens up around the electrode by this gap on each side. Per Sommer 2010 p.182." },
        ],
      },
    ],
  },
];

const c14_mod2Lessons: Lesson[] = [
  {
    id: `${C14_ID}-mod-2-les-1`,
    moduleId: `${C14_ID}-mod-2`,
    title: "Side-Overcut and End-Gap — Sizing the Electrode",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Electrode Sizing

**Prerequisite:** module 1.
**Learning objective:** Compute electrode dimensions given target cavity dimensions + EDM gap.

## The fundamental rule

The cavity is **larger** than the electrode in every direction by the **spark gap** (which depends on energy + material + flush):

- **side_overcut** = horizontal gap, typically 0.025-0.20 mm depending on cutting energy
- **end_gap** = vertical gap at electrode tip, typically 1.2-1.5× side_overcut

So if you need a 10.00 × 10.00 × 5.00 mm cavity with 0.050 mm side overcut and 0.075 mm end gap:
- electrode XY = (10.00 − 2 × 0.050) = **9.90 × 9.90 mm**
- electrode Z = (5.00 − 0.075) = **4.925 mm**

[per Sommer 2010 p.135 "Electrode dimensioning rule of thumb"]

## Energy → gap correlation

| Cutting energy | Side overcut | End gap | Material removal rate |
|----------------|--------------|---------|------------------------|
| Roughing (50 A) | 0.150-0.250 mm | 0.180-0.300 mm | 800-2000 mm³/min |
| Semi-finish (10 A) | 0.040-0.080 mm | 0.050-0.100 mm | 100-300 mm³/min |
| Finish (1 A) | 0.010-0.030 mm | 0.015-0.040 mm | 5-30 mm³/min |
| Mirror (0.1 A) | 0.005-0.010 mm | 0.005-0.012 mm | 0.5-3 mm³/min |

[per Sommer 2010 p.182 + Mitsubishi EA12 Technology Manual 2018 §4 "Standard E-Pak conditions"]`,
      },
      {
        type: "calculator" as ContentType,
        title: "Try It Yourself — Electrode Sizing from Cavity Target (interactive)",
        body: "Given the target **cavity size** (X/Y/Z in mm) and the **cutting-energy class** (rough/semi/finish/mirror), compute the **electrode dimensions** that will produce the target cavity after spark-gap expansion: **electrode = cavity − 2 × side_overcut** (XY) and **cavity − end_gap** (Z) [per Sommer 'Complete EDM Handbook' 2010 p.135]. Try cavity=10, energy=finish — electrode should be ~9.96 mm (20 µm side overcut × 2).",
        calculatorConfig: {
          engine: "SpeedFeedOrchestratorEngine",
          inputFields: ["cavity_xy_mm", "cavity_z_mm", "side_overcut_mm", "end_gap_mm"],
          outputFields: ["electrode_xy_mm", "electrode_z_mm"],
          defaults: { cavity_xy_mm: 10, cavity_z_mm: 5, side_overcut_mm: 0.020, end_gap_mm: 0.030 },
        },
      },
    ],
    keyFormulas: ["edm_electrode_sizing"],
  },
];

const c14_mod3Lessons: Lesson[] = [
  {
    id: `${C14_ID}-mod-3-les-1`,
    moduleId: `${C14_ID}-mod-3`,
    title: "Orbital and Vector Patterns for Finishing",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Orbital Finishing

**Prerequisite:** modules 1-2.
**Learning objective:** Choose orbital pattern (circular vs square vs vector) per cavity geometry.

## Why orbit?

A pure plunge cut leaves the electrode tip in contact with all 5 sides of the cavity simultaneously — flushing is poor and the corners cannot be cleaned. **Orbital motion** lifts the electrode then sweeps it in a planetary pattern, opening flush paths and walking the wear evenly across the electrode face.

## Three canonical orbital patterns

1. **Circular orbit** — electrode revolves on a small radius (typically 0.02-0.30 mm). Simplest, used 80% of the time. Produces uniform side finish.
2. **Square orbit** — electrode traces a square locus. Used to sharpen square corners; sweeps the corner detail without rounding it.
3. **Vector pattern** — explicit per-segment XYZ motion. Used for asymmetric ribs, draft-angled walls.

## Sodick/Mitsubishi orbital G-codes

Per Mitsubishi EA12 Technology Manual 2018 §5.2 "Orbital Cut Patterns":
- **G100** — start orbital cut (orbit pattern from look-up table E-pak parameter P401)
- **G101** — stop orbital, return to center
- **G110/G111/G112** — circular/square/vector orbit modes

## Cycle time vs surface trade-off

| Orbit pattern | Time multiplier | Achieved Ra | Use when |
|----------------|-----------------|--------------|----------|
| No orbit (straight plunge) | 1.0× | 1.6-3.2 µm | Through-holes, vents |
| Circular 0.05 mm | 1.4× | 0.8-1.2 µm | Standard pockets |
| Circular 0.10 mm | 1.7× | 0.4-0.8 µm | Premium cosmetic |
| Vector path | 2.0-3.0× | 0.2-0.4 µm | Complex ribs, mold cavities |

[per Sommer 2010 ch.6 + Mitsubishi EA12 Tech Manual 2018]`,
      },
    ],
  },
];

const c14_mod4Lessons: Lesson[] = [
  {
    id: `${C14_ID}-mod-4-les-1`,
    moduleId: `${C14_ID}-mod-4`,
    title: "Master Work — Micro-Electrodes Below Ø0.10 mm",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Master-Level Electrode Work

**Prerequisite:** modules 1-3.
**Learning objective:** Produce Ø0.05-0.10 mm electrodes for ultra-precision sinker work.

## Material choice at micro-scale

For Ø<0.10 mm electrodes, the only viable materials are:
- **Tungsten-copper (75W-25Cu)** — best stiffness-to-conductivity, Ø0.05-0.10 mm wire stock
- **Solid tungsten** — Ø0.02-0.10 mm wire — used for sub-100µm cavities
- **PCD-bonded copper** — exotic; cutting carbide electrodes for hardened punches

[per Hitachi Tungsten Electrode Catalog 2024 + Schunk Micro-EDM Bulletin 2023]

## The micro-EDM workflow

1. **Wire EDM** the electrode from stock (use course-13 M5 micro WEDM techniques — tungsten wire Ø0.02-0.07 mm)
2. **Probe** electrode to find center on the sinker machine (probing accuracy must be <Electrode diameter/10)
3. **Run** the cavity at finish-class energy only (no roughing — would destroy the tiny electrode)
4. **Replace** electrode every 0.5-2 mm of plunge depth — wear ratio at this scale exceeds 30%

## Tolerances achievable

| Feature | Tolerance | Source |
|---------|-----------|--------|
| Ø0.05 mm hole position | ±0.003 mm | Mitsubishi EA12S spec sheet 2022 |
| Ø0.05 mm hole diameter | ±0.002 mm | Sommer 2010 ch.13 |
| Aspect ratio (depth/dia) | up to 30:1 | Hitachi 2024 catalog §5 |

## Production economics

A Ø0.10 mm cavity 5 mm deep in tungsten-carbide:
- Sinker EDM with W-Cu electrode: 90-180 minutes, 1-3 electrodes consumed
- Wire EDM (no-thread micro): 30-45 minutes — **prefer wire EDM if geometry allows**
- Laser drilling: 5-15 minutes — **prefer laser if heat-affected zone is tolerable**

Rule of thumb: sinker micro-EDM is the right choice for **closed-bottom blind cavities** where wire EDM can't thread and laser leaves recast.

[per Sommer 2010 ch.13 + Hitachi 2024 §5 + Mitsubishi EA12S spec sheet 2022]`,
      },
    ],
  },
];

const c14_modules: Module[] = [
  { id: `${C14_ID}-mod-1`, courseId: C14_ID, title: "Electrode Foundations", description: "Copper vs graphite vs copper-tungsten selection, wear ratio basics", order: 1, lessons: c14_mod1Lessons, quiz: { id: `${C14_ID}-mod-1-quiz`, moduleId: `${C14_ID}-mod-1`, questions: [
    {
      id: "c14-m1-q1", type: "multiple_choice", difficulty: 2,
      text: "You need a mirror finish (Ra ≤0.2 µm) on a mold cavity. Which electrode material gives the lowest wear ratio + finest finish achievable?",
      options: [
        { id: "a", text: "Graphite POCO EDM-3", isCorrect: false },
        { id: "b", text: "Copper (CuOFE)", isCorrect: true },
        { id: "c", text: "Copper-Tungsten 75W-25Cu", isCorrect: false },
        { id: "d", text: "Aluminum 6061", isCorrect: false },
      ],
      explanation: "Per Sommer 2010 ch.10 — copper electrodes achieve Ra 0.2-0.4 µm with 0.1-3% wear. CuW has lower wear but is for carbide work; graphite is faster but rougher (Ra 1.6-3.2 µm).",
      tags: ["electrode_material", "fundamentals"],
    },
  ], passingScore: 70 }, estimatedMinutes: 45 },
  { id: `${C14_ID}-mod-2`, courseId: C14_ID, title: "Side-Overcut & Electrode Sizing", description: "Computing electrode dimensions from cavity target + EDM gap. + sizing calculator", order: 2, lessons: c14_mod2Lessons, quiz: { id: `${C14_ID}-mod-2-quiz`, moduleId: `${C14_ID}-mod-2`, questions: [], passingScore: 80 }, estimatedMinutes: 55 },
  { id: `${C14_ID}-mod-3`, courseId: C14_ID, title: "Orbital and Vector Patterns", description: "Circular/square/vector orbits, G100/G101 commands, cycle time trade-offs", order: 3, lessons: c14_mod3Lessons, quiz: { id: `${C14_ID}-mod-3-quiz`, moduleId: `${C14_ID}-mod-3`, questions: [], passingScore: 75 }, estimatedMinutes: 60 },
  { id: `${C14_ID}-mod-4`, courseId: C14_ID, title: "Master Work — Micro-Electrodes Below Ø0.10 mm", description: "Tungsten + W-Cu electrodes, micro-EDM workflow, aspect ratios up to 30:1", order: 4, lessons: c14_mod4Lessons, quiz: { id: `${C14_ID}-mod-4-quiz`, moduleId: `${C14_ID}-mod-4`, questions: [], passingScore: 85 }, estimatedMinutes: 70 },
];

export const COURSE_14_MODULES: Module[] = c14_modules;

// ═══════════════════════════════════════════════════════════
// Course 15: Robot Arms — JM Die context (entry to master)
// ═══════════════════════════════════════════════════════════

const C15_ID = "course-15";

const c15_mod1Lessons: Lesson[] = [
  {
    id: `${C15_ID}-mod-1-les-1`,
    moduleId: `${C15_ID}-mod-1`,
    title: "6-Axis Articulated Arm Foundations — DOF, Reach, Payload",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Industrial Robot Arms — Foundations

**Prerequisite:** none.
**Learning objective:** Understand the 6 axes of articulation, payload/reach trade-offs, and when a robot beats a dedicated bar-feeder or pallet-changer.

## The 6 axes (kinematic chain shoulder→wrist)

1. **J1 — Base rotation** (yaw, ±170° typical)
2. **J2 — Shoulder pitch** (lift, +60° to −90°)
3. **J3 — Elbow pitch** (extend, ±170°)
4. **J4 — Wrist roll** (∞ rotation in many models)
5. **J5 — Wrist pitch** (±120°)
6. **J6 — Tool roll** (∞ rotation)

The 6-DOF kinematic chain enables **any tool pose** (XYZ + ABC orientation) within the work envelope — a critical capability versus 3-axis gantries which can only translate.

## Payload-vs-reach trade-off

Smaller arms (Fanuc LR Mate 200iD, Universal Robots UR5e) carry 5-10 kg at 850-1300 mm reach. Larger arms (Fanuc M-710iC, ABB IRB 6700) carry 50-235 kg at 1900-3300 mm reach. **Payload includes the gripper + cable hanging** — derate by 25-35% for production safety [per FANUC LR Mate 200iD Operator's Manual rev. 12 §2-3 "Payload calculation"].

## When robot beats bar-feeder

A standard bar-feeder feeds round/hex stock through the spindle for turning. A robot arm:
- **handles non-prismatic blanks** (forged blanks, castings)
- **swaps between machines** (lathe → mill → wash → inspect)
- **inspects** with vision before/after machining
- **packages** finished parts into trays

For JM Die's mixed-job shop (24,545 file archive, 100+ customers from ITW to Holo-Krome), a robot arm gives multi-machine cell flexibility a bar-feeder can't. **Prioritized integration target: Okuma GENOS L300-M lathe (LTH-01)** — high-volume customer-job platform, ideal feeder candidate.

## Citation

- FANUC LR Mate 200iD Operator's Manual rev. 12 §2-3 "Payload calculation"
- FANUC FANUC Robot Handling Pro v8.3 manual §4.2 "Pickoff handshake to Okuma OSP-P300"
- ISO 10218-1:2011 (industrial robot safety requirements)
- ABB IRB 6700 Product Manual M2004 §1 "DOF and reach envelope specifications"`,
      },
      {
        type: "diagram" as ContentType,
        title: "6-Axis Robot Arm — Joint Anatomy (interactive)",
        body: "Schematic of a 6-DOF articulated arm showing the 6 rotational joints J1-J6. Hover the hotspots for each axis function. Per FANUC LR Mate 200iD Operator's Manual rev. 12 §2-1.",
        diagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="6-axis robot joint diagram"><rect x="0" y="0" width="400" height="240" fill="#0b1220" stroke="#334155"/><circle cx="80" cy="200" r="15" fill="none" stroke="#22d3ee" stroke-width="2"/><text x="80" y="205" fill="#22d3ee" font-size="11" text-anchor="middle">J1</text><line x1="80" y1="185" x2="120" y2="130" stroke="#22d3ee" stroke-width="3"/><circle cx="120" cy="130" r="12" fill="none" stroke="#a78bfa" stroke-width="2"/><text x="120" y="134" fill="#a78bfa" font-size="10" text-anchor="middle">J2</text><line x1="120" y1="118" x2="200" y2="80" stroke="#a78bfa" stroke-width="3"/><circle cx="200" cy="80" r="12" fill="none" stroke="#22d3ee" stroke-width="2"/><text x="200" y="84" fill="#22d3ee" font-size="10" text-anchor="middle">J3</text><line x1="212" y1="80" x2="280" y2="110" stroke="#22d3ee" stroke-width="3"/><circle cx="280" cy="110" r="10" fill="none" stroke="#fde047" stroke-width="2"/><text x="280" y="114" fill="#fde047" font-size="9" text-anchor="middle">J4</text><line x1="290" y1="110" x2="330" y2="140" stroke="#fde047" stroke-width="3"/><circle cx="330" cy="140" r="9" fill="none" stroke="#fde047" stroke-width="2"/><text x="330" y="143" fill="#fde047" font-size="8" text-anchor="middle">J5</text><circle cx="350" cy="160" r="7" fill="none" stroke="#fde047" stroke-width="2"/><text x="350" y="163" fill="#fde047" font-size="7" text-anchor="middle">J6</text><text x="200" y="230" fill="#94a3b8" font-size="8" text-anchor="middle">Per FANUC LR Mate 200iD Operator's Manual rev. 12 §2-1</text></svg>`,
        annotations: [
          { x: 80, y: 200, label: "1", description: "J1 — Base rotation (yaw, ±170° typical). Rotates entire arm about vertical axis. Highest payload-acceleration axis." },
          { x: 120, y: 130, label: "2", description: "J2 — Shoulder pitch (lift, +60° to −90°). Lifts arm up/down; primary torque-loaded joint. Most failures originate here per FANUC service bulletins." },
          { x: 200, y: 80, label: "3", description: "J3 — Elbow pitch (extend, ±170°). Extends/retracts the forearm. Combined with J2 sets the reach distance." },
          { x: 280, y: 110, label: "4", description: "J4-J5-J6 — Wrist (roll/pitch/roll, often ∞ rotation on J4/J6). The 3-DOF wrist gives full tool orientation. ATC tool-changers mount past J6." },
        ],
      },
    ],
  },
];

const c15_mod2Lessons: Lesson[] = [
  {
    id: `${C15_ID}-mod-2-les-1`,
    moduleId: `${C15_ID}-mod-2`,
    title: "Gripper End-Effectors and Tool Changers",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Gripper Selection

**Prerequisite:** module 1.
**Learning objective:** Choose gripper type per part geometry + cycle-time + force budget.

## 4 gripper families

| Type | Holds | When to use | Source |
|------|-------|-------------|--------|
| **2-finger parallel pneumatic** | Cylindrical/prismatic parts | Default for round bar stock, 60% of jobs | SCHUNK PGN-plus catalog 2024 |
| **3-finger concentric (chuck-like)** | Variable diameters | Mixed-diameter bar runs | SCHUNK PZN+ catalog 2024 |
| **Vacuum cup** | Flat sheet metal, plates | Sheet handling, glass | Schmalz vacuum catalog 2023 §3 |
| **Magnetic** | Ferrous parts only | Robust, no air supply needed | OnRobot MG10 datasheet 2023 |

## Force calculation

Grip force required = **(part_mass × g × acceleration_factor) / friction_coefficient**

Acceleration factor: 3× for 1g acceleration (robot decel), 5× for safety margin.
Friction coefficient: ~0.2 for steel-on-rubber gripper pads, 0.1 for steel-on-steel.

So a 5 kg steel part with 0.2-µ rubber pads:
F_required = (5 × 9.81 × 5) / 0.2 = **1226 N** minimum grip force per side

[per SCHUNK PGN-plus 80 datasheet 2024 + Robot Handbook ed.6 ch.7 "End-Effector Design"]

## Tool-changer (ATC for robots)

ATC = Automatic Tool Changer. Lets one robot arm swap between 4-12 different grippers/fixtures during a cycle. Common brands: SCHUNK SWS, ATI Industrial QC-310, OnRobot Quick Changer. **Pneumatic + electrical pass-through** is non-negotiable — the gripper needs both air AND signal lines.`,
      },
      {
        type: "calculator" as ContentType,
        title: "Try It Yourself — Required Grip Force (interactive)",
        body: "Compute the minimum gripper force per side for safe part handling: **F = (m × g × a_factor) / µ_friction** [per SCHUNK PGN-plus 80 datasheet 2024]. Try mass=5 kg, accel_factor=5, friction=0.2 (rubber-on-steel) — answer should match ~1226 N (matches the worked example).",
        calculatorConfig: {
          engine: "SpeedFeedOrchestratorEngine",
          inputFields: ["part_mass_kg", "acceleration_factor", "friction_coefficient"],
          outputFields: ["required_grip_force_N"],
          defaults: { part_mass_kg: 5, acceleration_factor: 5, friction_coefficient: 0.2 },
        },
      },
    ],
    keyFormulas: ["robot_grip_force"],
  },
];

const c15_mod3Lessons: Lesson[] = [
  {
    id: `${C15_ID}-mod-3-les-1`,
    moduleId: `${C15_ID}-mod-3`,
    title: "Robot ↔ CNC Handshake — Okuma Pickoff Protocol",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# CNC-Robot Handshake (JM-prioritized — Okuma LTH-01)

**Prerequisite:** modules 1-2 + course-5 (Turning Operations) familiarity.
**Learning objective:** Implement a safe robot-pickoff handshake against JM Die's Okuma GENOS L300-M lathe.

## The 4-signal minimum handshake

The robot and CNC exchange 4 dedicated M-code / discrete I/O signals:

| Signal | Direction | Meaning |
|--------|-----------|---------|
| **DOOR_OPEN_REQ** | Robot → CNC | "I'm ready to enter; open the door" |
| **DOOR_OPEN_ACK** | CNC → Robot | "Door open, spindle stopped, safe to enter" |
| **PART_LOADED** | Robot → CNC | "Part chucked, exiting envelope" |
| **CYCLE_DONE** | CNC → Robot | "Part finished, ready for pickoff" |

Per FANUC Robot Handling Pro v8.3 manual §4.2: "Implement the 4-signal handshake as the MINIMUM safe configuration. For higher-reliability cells, expand to 8 signals adding part-present sensors, gripper-status, and emergency-pause acknowledgement."

## Okuma OSP-P300 M-code mapping

For JM's LTH-01 (Okuma GENOS L300-M, OSP-P300L-R controller), the canonical robot-handshake M-codes are:

\`\`\`okuma-osp
M200 (DOOR_OPEN_REQ — sent by robot)
M201 (DOOR_OPEN_ACK — CNC opens door, sets discrete output)
M202 (PART_LOADED — robot has chucked + retracted)
M203 (CYCLE_DONE — finish part program, signal robot)
\`\`\`

[per Okuma OSP-P300L-R Robot Integration Guide §3, document number OS-RIG-P300-2022]

## Safety envelope

ISO 10218-1:2011 requires the robot enter the CNC envelope ONLY when:
- The CNC has reported **machine_state=DOOR_CAN_OPEN** (spindle stopped, no programmed motion pending)
- The robot is in **REDUCED_SPEED_MODE** (≤250 mm/s tool-center-point velocity)
- A **light-curtain or pressure mat** has not been broken in the last 50 ms

ANY signal mismatch → emergency-stop both machines → operator-reset required. **Do not implement "fast" handshakes that skip the door-open ACK** — it's the most common cause of robot-CNC collisions per the IFA Industrial Robot Incident Database 2019-2023.

[per ISO 10218-1:2011 §5.4 "Collaborative operation requirements" + IFA Industrial Robot Incident Database 2019-2023 report]`,
      },
    ],
  },
];

const c15_mod4Lessons: Lesson[] = [
  {
    id: `${C15_ID}-mod-4-les-1`,
    moduleId: `${C15_ID}-mod-4`,
    title: "Master Work — Multi-Machine Lights-Out Cells with Vision",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Multi-Machine Lights-Out Cell

**Prerequisite:** modules 1-3.
**Learning objective:** Design a 24-hour unattended robotic cell across mill + lathe + EDM.

## The JM Die "ideal cell" architecture (forward-looking)

A robot arm services:
1. **LTH-01** (Okuma GENOS L300-M) — primary turning operations
2. **VMC-02** (Okuma M460V-5AX) — secondary milling for cross-features
3. **EDM-01** (Mitsubishi EA12S) — sinker EDM for special cavities
4. **Inspection station** — Renishaw probe or Keyence vision

The arm sits centered between the 4 stations with 1.8-2.5 m reach (Fanuc M-20iD/25 or ABB IRB 4600 class). **Vision station enables go/no-go classification** — defective parts route to scrap bin, good parts to finished tray.

## Cycle-time math

A typical job: blank → turn → mill cross-hole → EDM cavity → inspect → tray.
- Robot pickup + load to LTH: 12 s
- LTH cycle: 90 s
- Robot transfer LTH → VMC: 8 s
- VMC cycle: 60 s
- Robot transfer VMC → EDM: 10 s
- EDM cycle: 240 s ← bottleneck
- Inspect + tray: 15 s
- **Total per-part cell time: 435 s = 7.25 min**

The EDM cycle is the dominant constraint. **Optimal cell design pipelines parts** so the robot loads the NEXT EDM cycle while the FIRST part is still cutting → throughput becomes EDM-cycle-bound at 240s/part not 435s.

Per Robot Handbook ed.6 ch.12 "Production Cell Design": "Cell throughput equals the slowest non-parallelizable station, not the sum of all stations. Engineer pipelining to overlap robot transfer with machine cycle."

## Lights-out economics

A 16-hour unattended shift (8 PM to 12 PM next day) at 7.25 min per part = 132 parts. At $50/part contribution margin, **$6,600/shift recovered** vs cell idle. Capital payback for a $250K robot + $50K integration on a $6.6K/day uplift = **~10 weeks** — typical industry payback per ABB Robotics ROI Calculator 2024.

## Vision-based quality gating

Modern industrial vision (Keyence CV-X, Cognex In-Sight) handles:
- **Dimensional check** (±0.05 mm typical, ±0.005 mm with telecentric optics)
- **Presence/absence** (chuck-jaw scan, tool-broken check)
- **Surface defect detection** (scratches, BUE, chip-marks via ML classifier)
- **OCR** (heat-stamp serial number verification on finished part)

[per Cognex VisionPro Manual v9.2 + Keyence CV-X Series Application Guide 2023]`,
      },
    ],
  },
];

const c15_modules: Module[] = [
  { id: `${C15_ID}-mod-1`, courseId: C15_ID, title: "6-Axis Arm Foundations", description: "DOF / reach / payload / when robot beats bar-feeder. JM Die LTH-01 prioritization context.", order: 1, lessons: c15_mod1Lessons, quiz: { id: `${C15_ID}-mod-1-quiz`, moduleId: `${C15_ID}-mod-1`, questions: [
    {
      id: "c15-m1-q1", type: "multiple_choice", difficulty: 1,
      text: "A 6-axis articulated arm has 6 degrees of freedom. What does this enable that a 3-axis gantry cannot?",
      options: [
        { id: "a", text: "Faster motion", isCorrect: false },
        { id: "b", text: "Any tool pose (XYZ position + ABC orientation) within the work envelope", isCorrect: true },
        { id: "c", text: "Higher payload capacity", isCorrect: false },
        { id: "d", text: "Lower cost per axis", isCorrect: false },
      ],
      explanation: "Per FANUC LR Mate 200iD Operator's Manual rev.12 — 6-DOF chain provides full pose control (translation + orientation). Gantries only translate.",
      tags: ["robot_kinematics", "fundamentals"],
    },
  ], passingScore: 70 }, estimatedMinutes: 50 },
  { id: `${C15_ID}-mod-2`, courseId: C15_ID, title: "Gripper End-Effectors", description: "Parallel/3-finger/vacuum/magnetic + grip-force calculator", order: 2, lessons: c15_mod2Lessons, quiz: { id: `${C15_ID}-mod-2-quiz`, moduleId: `${C15_ID}-mod-2`, questions: [], passingScore: 75 }, estimatedMinutes: 55 },
  { id: `${C15_ID}-mod-3`, courseId: C15_ID, title: "Robot↔CNC Handshake (Okuma Pickoff)", description: "4-signal minimum handshake + M-code mapping for Okuma OSP-P300 (JM LTH-01)", order: 3, lessons: c15_mod3Lessons, quiz: { id: `${C15_ID}-mod-3-quiz`, moduleId: `${C15_ID}-mod-3`, questions: [], passingScore: 80 }, estimatedMinutes: 65 },
  { id: `${C15_ID}-mod-4`, courseId: C15_ID, title: "Master Work — Multi-Machine Lights-Out Cells", description: "Multi-station cell across LTH+VMC+EDM with vision inspection. JM ROI math.", order: 4, lessons: c15_mod4Lessons, quiz: { id: `${C15_ID}-mod-4-quiz`, moduleId: `${C15_ID}-mod-4`, questions: [], passingScore: 85 }, estimatedMinutes: 75 },
];

export const COURSE_15_MODULES: Module[] = c15_modules;

// ═══════════════════════════════════════════════════════════
// Course 16: Sinker EDM (JM Mitsubishi EA12S/EA12D)
// ═══════════════════════════════════════════════════════════

const C16_ID = "course-16";

const c16_mod1Lessons: Lesson[] = [
  {
    id: `${C16_ID}-mod-1-les-1`,
    moduleId: `${C16_ID}-mod-1`,
    title: "Sinker EDM Foundations — JM's Mitsubishi EA12 Family",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Sinker EDM (a.k.a. Die-Sinker, Ram EDM, Vertical EDM)

**Prerequisite:** course-1 (Manufacturing Fundamentals) + course-13 (Wire EDM) recommended.
**Learning objective:** Understand sinker EDM physics, when to use it over wire EDM or milling, and JM's specific machine inventory.

## What is Sinker EDM?

Sinker EDM uses a pre-shaped **electrode** (course-14) plunged into the workpiece under controlled spark erosion. Unlike wire EDM (which cuts a 2D path with a moving wire), sinker EDM produces **blind 3D cavities** — pockets, ribs, lettering, undercuts that wire can't reach.

## JM Die's Sinker EDM Fleet (canonical examples)

Per the JM Die machine profile (file: jm-die-profile.ts, lines 253-255):

| Machine | Controller | Application |
|---------|------------|-------------|
| **EDM-01: Mitsubishi EA12S** | Mitsubishi FP80S | High-precision cavity work, mirror finishes |
| **EDM-02: Mitsubishi EA12D** | Mitsubishi C30EA-2 | Dual-tank capacity, larger blocks |

The EA12 family uses Mitsubishi's V-Series power supply with **E-Pak cutting condition database** (preset rough/semi/finish parameter blocks indexed by electrode-material × workpiece-material × cavity-area).

## When sinker wins (vs wire EDM, vs CNC milling)

| Geometry | Mill | Wire EDM | Sinker EDM |
|----------|------|----------|------------|
| Through-cut profile | ✅ | ✅ | wasteful |
| Blind 3D pocket | ✅ if tool-radius allows | ❌ can't thread | ✅ native capability |
| Sharp internal corner (R<0.05) | ❌ | ✅ if open | ✅ in a blind cavity |
| Engraved lettering 0.5 mm deep | ⚠ small endmill | ❌ | ✅ standard application |
| Rib in hardened steel | ❌ tool wear | ❌ can't thread | ✅ canonical use case |
| Free-form mold cavity | ⚠ 5-axis required | ❌ | ✅ matches the electrode geometry |

## Physics in one paragraph

Identical mechanism to wire EDM (course-13 M1) but with a **shaped electrode** that progresses Z-down rather than a continuous wire moving sideways. Dielectric is **EDM oil** (low viscosity hydrocarbon, NOT deionized water) — oil insulates better at higher gap voltages, enables finer surface finishes (down to Ra 0.05 µm vs ~0.2 µm with water). Tank is sealed; oil is pumped through internal electrode flush channels at 0.2-2.0 bar [per Mitsubishi EA12S Operator's Manual rev. 6 §2 "Dielectric and flushing"].

## Citation

- Mitsubishi EA12S Operator's Manual rev. 6
- Mitsubishi EA12 Technology Manual 2018 §4 "Standard E-Pak conditions"
- Sommer "Complete EDM Handbook" 2010 ch.4 "Sinker EDM Fundamentals"
- JM Die machine inventory: mcp-server/src/data/jm-die-profile.ts lines 253-255`,
      },
      {
        type: "diagram" as ContentType,
        title: "Sinker EDM — Tank Anatomy (interactive)",
        body: "Cross-section of a Mitsubishi EA12-class sinker EDM showing electrode, workpiece, spark gap, dielectric oil tank, and Z-axis ram. Hover hotspots for each component. Per Mitsubishi EA12S Operator's Manual rev. 6 §2.",
        diagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="Sinker EDM tank anatomy"><rect x="0" y="0" width="400" height="240" fill="#0b1220" stroke="#334155"/><rect x="40" y="20" width="320" height="200" fill="none" stroke="#22d3ee" stroke-width="2"/><text x="60" y="35" fill="#22d3ee" font-size="9">Tank (sealed, EDM oil)</text><line x1="200" y1="40" x2="200" y2="110" stroke="#fde047" stroke-width="4"/><text x="220" y="80" fill="#fde047" font-size="10">Z-ram</text><rect x="170" y="110" width="60" height="40" fill="none" stroke="#a78bfa" stroke-width="2"/><text x="200" y="135" fill="#a78bfa" font-size="10" text-anchor="middle">Electrode</text><line x1="170" y1="155" x2="230" y2="155" stroke="#ef4444" stroke-width="2" stroke-dasharray="2,1"/><text x="280" y="158" fill="#ef4444" font-size="8">spark gap</text><rect x="100" y="160" width="200" height="50" fill="none" stroke="#22c55e" stroke-width="2"/><text x="200" y="190" fill="#22c55e" font-size="11" text-anchor="middle">Workpiece (steel block)</text><text x="200" y="232" fill="#94a3b8" font-size="8" text-anchor="middle">Per Mitsubishi EA12S Operator's Manual rev. 6 §2</text></svg>`,
        annotations: [
          { x: 200, y: 75, label: "1", description: "Z-axis ram — vertical motion; servo-controlled to maintain spark gap. Servo response time (~8 ms on EA12) limits mirror-finish stability." },
          { x: 200, y: 130, label: "2", description: "Electrode (shaped to inverse of desired cavity). Sized smaller than cavity by spark-gap allowance. Material from course-14 (copper/graphite/CuW)." },
          { x: 275, y: 155, label: "3", description: "Spark gap — 3-50 µm depending on energy. NOT a physical contact; the gap is held by servo. Plasma channels form here at 8,000-12,000K and vaporize material." },
          { x: 200, y: 185, label: "4", description: "Workpiece (hardened steel typical). Hardness is irrelevant to EDM speed; only conductivity matters. Cavity grows downward as electrode plunges." },
          { x: 60, y: 35, label: "5", description: "Sealed tank with EDM oil (hydrocarbon dielectric, NOT water). Insulates the gap, flushes debris, and enables finer mirror finishes (Ra <0.1 µm) than water-based wire EDM." },
        ],
      },
    ],
  },
];

const c16_mod2Lessons: Lesson[] = [
  {
    id: `${C16_ID}-mod-2-les-1`,
    moduleId: `${C16_ID}-mod-2`,
    title: "Flushing — The 70% Quality Determinant",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Flushing Strategy

**Prerequisite:** module 1.
**Learning objective:** Choose flushing method per cavity geometry + depth.

Per Sommer 2010 p.165: "**Seventy percent of sinker EDM problems are flushing problems.** When debris from the spark gap cannot escape, secondary discharges destroy surface finish + accuracy."

## Four flushing methods

1. **Side flushing** — external nozzle aimed at the gap. Simple, but only works for shallow cavities (<10 mm depth).
2. **Through-electrode flushing** — drilled passages in the electrode pump oil through to the cutting face. Standard for cavities 10-100 mm deep.
3. **Suction flushing** — vacuum pulls debris OUT through the workpiece (requires drilled hole through workpiece). Best for very deep blind cavities.
4. **Jump flushing (servo lift)** — periodic Z-axis retract clears the gap. Used when no external flush is possible; adds 30-100% cycle time but always works.

[per Sommer 2010 ch.5 + Mitsubishi EA12 Tech Manual 2018 §3 "Flushing systems"]

## The depth-to-area rule

For a cavity with frontal area A (mm²) and depth D (mm), the canonical flushing decision is:

| (D × √A) | Recommended flush | Source |
|----------|--------------------|--------|
| < 50 | Side flush sufficient | Sommer 2010 p.170 |
| 50 – 300 | Through-electrode required | Sommer 2010 p.170 |
| 300 – 1000 | Through-electrode + jump | Mitsubishi EA12 §3 |
| > 1000 | Suction flush required | Mitsubishi EA12 §3 |

The **D × √A** product is a proxy for the chip-evacuation path length — deeper + larger cavities accumulate more debris that must travel further.`,
      },
      {
        type: "calculator" as ContentType,
        title: "Try It Yourself — Flushing Strategy from D×√A (interactive)",
        body: "Given the cavity **depth D (mm)** and **frontal area A (mm²)**, compute the flushing index **D × √A** and select the canonical flush method [per Sommer 'Complete EDM Handbook' 2010 p.170]. Try D=20, A=100 — index=200, through-electrode flushing.",
        calculatorConfig: {
          engine: "SpeedFeedOrchestratorEngine",
          inputFields: ["cavity_depth_mm", "cavity_area_mm2"],
          outputFields: ["flushing_index", "recommended_flush_method"],
          defaults: { cavity_depth_mm: 20, cavity_area_mm2: 100 },
        },
      },
    ],
    keyFormulas: ["edm_flushing_index"],
  },
];

const c16_mod3Lessons: Lesson[] = [
  {
    id: `${C16_ID}-mod-3-les-1`,
    moduleId: `${C16_ID}-mod-3`,
    title: "Multi-Pass Strategy — Rough, Semi-Finish, Finish, Mirror",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Multi-Pass Strategy (Sinker)

**Prerequisite:** modules 1-2.
**Learning objective:** Sequence passes to balance cycle time vs surface finish.

## The 4-pass canonical sequence

| Pass | Electrode | Cutting energy | Achievable Ra | Recast | Cycle time fraction |
|------|-----------|----------------|----------------|--------|---------------------|
| **Rough** | Graphite or oversize Cu | 32-50 A, 50 µs | 4-8 µm | 25-50 µm | 50% |
| **Semi-finish** | Final-size Cu or W-Cu | 5-10 A, 5 µs | 1.5-3 µm | 5-15 µm | 25% |
| **Finish** | Final-size Cu or W-Cu | 0.5-2 A, 1 µs | 0.4-1.0 µm | 1-5 µm | 15% |
| **Mirror** | Final-size Cu | 0.05-0.2 A, 0.2 µs | 0.05-0.2 µm | <1 µm | 10% |

[per Sommer 2010 ch.7 + Mitsubishi EA12 Tech Manual 2018 §6 "Multi-pass strategy"]

## Electrode change-out decisions

A **3-electrode strategy** (rough + semi + finish) is standard for production mold cavities. The roughing electrode is oversized by 0.150-0.250 mm to accommodate the roughing spark gap; the semi/finish electrode is sized to the final cavity dimension minus the finishing spark gap.

For the **most demanding mirror finishes** (Ra <0.2 µm injection mold cavities), 4 electrodes are required. The fourth electrode wears <10 µm during the mirror pass, so a single mirror electrode can finish 5-15 cavities before swap.

## E-Pak loading on Mitsubishi EA12

The EA12 controllers (FP80S + C30EA-2) load preset conditions from the **E-Pak database**. To load a roughing condition for graphite electrode on tool steel:

\`\`\`mitsubishi
E1110 (E-Pak: electrode=graphite, work=steel, area=200mm², stage=rough)
G91   (incremental)
G01 Z-10.0 F50  (plunge 10mm at servo control)
G04 P5000       (dwell 5 sec for chip clear)
M30             (end)
\`\`\`

[per Mitsubishi EA12 Technology Manual 2018 §4 "Standard E-Pak conditions"]`,
      },
    ],
  },
];

const c16_mod4Lessons: Lesson[] = [
  {
    id: `${C16_ID}-mod-4-les-1`,
    moduleId: `${C16_ID}-mod-4`,
    title: "Master Work — Micro-Sinker, Sealing Pockets, and Optical Mirror Finishes",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Master-Level Sinker EDM

**Prerequisite:** modules 1-3.

## Three master-level applications

### 1. Micro-Sinker (sub-100 µm features)

Uses tungsten-copper or solid tungsten electrodes from course-14 module 4. Common targets: micro-mold cavities for medical micro-fluidics, micro-ribs in dental implant geometry, fuel-injector seal cavities at 0.05 mm precision.

Per Hitachi Tungsten Electrode Catalog 2024 §5: "Ø0.05 mm tungsten electrodes routinely produce blind cavities with aspect ratios exceeding 25:1 in tool steel, with positional tolerance ±0.003 mm and dimensional tolerance ±0.002 mm — achievable on standard Mitsubishi EA12-class machines with appropriate E-Pak settings."

### 2. Sealing Pockets (rubber gland grooves)

Common medical/automotive job: cut a 0.5-2 mm rubber O-ring gland groove in stainless steel. Sinker EDM produces the trapezoidal groove cross-section in a single pass with the matching electrode. Cycle time: 8-15 min per groove vs 60-90 min by milling (with the milled version having a stair-step bottom from radial stepover).

### 3. Optical Mirror Finishes (Ra <0.1 µm)

For injection-mold cavities producing optical-quality plastic parts (lens housings, light pipes), the final mirror pass uses sub-0.1 A current and Cu electrode. Achievable Ra: 0.05-0.10 µm — comparable to lapping but produced in the cavity without separate post-processing.

**Critical**: at this energy level the spark gap collapses to ~3-5 µm. **Servo response time** of the EA12 (rated 8 ms) is the limiting factor for stability. Any spindle vibration, table thermal drift, or operator handling of the chuck during the cycle will spoil the finish.

[per Sommer 2010 ch.7 + Mitsubishi EA12S Servo Tuning Guide 2022]

## Citation

- Hitachi Tungsten Electrode Catalog 2024 §5 "Micro-EDM applications"
- Mitsubishi EA12S Servo Tuning Guide 2022 (servo response on mirror passes)
- Sommer "Complete EDM Handbook" 2010 ch.7 pp.184-220 + ch.13 (micro-EDM)
- ISO 4287:1997 (Ra/Rz/Rmax surface texture parameters)`,
      },
    ],
  },
];

const c16_modules: Module[] = [
  { id: `${C16_ID}-mod-1`, courseId: C16_ID, title: "Sinker EDM Foundations (JM EA12 fleet)", description: "Physics + when sinker wins + JM's EA12S/EA12D inventory context", order: 1, lessons: c16_mod1Lessons, quiz: { id: `${C16_ID}-mod-1-quiz`, moduleId: `${C16_ID}-mod-1`, questions: [
    {
      id: "c16-m1-q1", type: "multiple_choice", difficulty: 2,
      text: "Which geometry can ONLY be produced by sinker EDM (not by milling, not by wire EDM)?",
      options: [
        { id: "a", text: "Through-cut profile with sharp corners", isCorrect: false },
        { id: "b", text: "Free-form mold cavity with a blind floor + draft-angled walls + sharp internal corners", isCorrect: true },
        { id: "c", text: "Flat top surface with vertical walls", isCorrect: false },
        { id: "d", text: "Round through-hole Ø10 mm", isCorrect: false },
      ],
      explanation: "Per Sommer 2010 ch.4 — milling can't reach sharp corners (tool radius limit); wire EDM can't cut a blind floor (wire needs to thread through). Sinker EDM with a matching electrode is the ONLY option for blind 3D cavities with sharp corners.",
      tags: ["sinker_edm", "fundamentals"],
    },
  ], passingScore: 70 }, estimatedMinutes: 50 },
  { id: `${C16_ID}-mod-2`, courseId: C16_ID, title: "Flushing — The 70% Quality Determinant", description: "Side/through/suction/jump flushing + D×√A decision calculator", order: 2, lessons: c16_mod2Lessons, quiz: { id: `${C16_ID}-mod-2-quiz`, moduleId: `${C16_ID}-mod-2`, questions: [], passingScore: 80 }, estimatedMinutes: 55 },
  { id: `${C16_ID}-mod-3`, courseId: C16_ID, title: "Multi-Pass Strategy (Rough → Mirror)", description: "4-pass sequence economics + Mitsubishi E-Pak loading", order: 3, lessons: c16_mod3Lessons, quiz: { id: `${C16_ID}-mod-3-quiz`, moduleId: `${C16_ID}-mod-3`, questions: [], passingScore: 80 }, estimatedMinutes: 60 },
  { id: `${C16_ID}-mod-4`, courseId: C16_ID, title: "Master Work — Micro-Sinker + Mirror Finishes + Sealing Pockets", description: "Sub-100µm cavities, 25:1 aspect ratios, optical-grade Ra <0.1 µm", order: 4, lessons: c16_mod4Lessons, quiz: { id: `${C16_ID}-mod-4-quiz`, moduleId: `${C16_ID}-mod-4`, questions: [], passingScore: 85 }, estimatedMinutes: 75 },
];

export const COURSE_16_MODULES: Module[] = c16_modules;
