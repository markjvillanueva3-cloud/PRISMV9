/**
 * Course 5: Turning Operations
 * Level: Intermediate→Advanced | 10 Modules | ~8 hours
 *
 * Complete lathe mastery from OD roughing to Swiss-type.
 * Insert selection, chip breaking, live tooling, sub-spindle.
 */

import type { Module, Lesson, Question } from
  "../../engines/CurriculumEngine.js";

const CID = "course-5";

const lessons: Record<number, Lesson[]> = {
  1: [{ id: `${CID}-m1-l1`, moduleId: `${CID}-mod-1`, title: "OD Roughing", order: 1, content: [{ type: "text",
    body: `# OD Roughing

## The Goal
Remove the bulk of material from the outside diameter quickly and safely.

## Insert Selection for Roughing
- **CNMG** (80° diamond): most common roughing insert. Strong corner, good for straight cuts.
- **WNMG** (80° diamond, different orientation): for profiling with better access.
- **SNMG** (square): strongest corner (90°), maximum depth of cut.

## Key Parameters
- **Depth of cut (ap)**: 1-5mm typical. Limited by insert size and machine rigidity.
- **Feed (f)**: 0.15-0.35 mm/rev for roughing. Higher = faster but rougher.
- **Speed (Vc)**: per material and insert grade.

## Roughing Cycle (G71 on Fanuc)
\`\`\`gcode
G71 U2.0 R0.5        (2mm DOC, 0.5mm retract)
G71 P100 Q200 U0.3 W0.1 F0.25  (rough from N100 to N200, leave 0.3 radial, 0.1 axial)
\`\`\`

## Rules
- **Rough from the largest diameter in** — start at the chuck, work toward the tailstock
- **Never rough past a shoulder without retracting** — tool will crash into the shoulder
- **Leave stock for finishing**: 0.2-0.5mm radial, 0.1-0.2mm axial
- **Chip control**: if chips are long/stringy, increase feed or change chipbreaker geometry` }] }],

  2: [{ id: `${CID}-m2-l1`, moduleId: `${CID}-mod-2`, title: "OD Finishing", order: 1, content: [{ type: "text",
    body: `# OD Finishing

## Insert Selection for Finishing
- **DNMG/VBMT** (55° or 35° diamond): sharp point, good access to profiles
- **RCMT** (round): excellent finish on smooth contours, strongest edge
- **Wiper inserts**: special flat on nose for 2× better finish at same feed

## Surface Finish Formula (Turning)
$$Ra \\approx \\frac{f^2}{32 \\times r_\\epsilon}$$

Where f = feed/rev, r_ε = nose radius.

**Example**: f=0.1mm/rev, nose radius=0.8mm:
Ra = 0.01 / 25.6 = **0.39 µm** (mirror-like!)

## Finishing Parameters
- **Feed**: 0.05-0.15 mm/rev (lower = smoother)
- **DOC**: 0.1-0.3mm (just enough to cut, not rub)
- **Speed**: 10-20% higher than roughing (better finish)

## Finishing Tips
- **Constant surface speed (G96)**: maintains Vc as diameter changes
  \`G96 S200 M03\` = constant 200 m/min regardless of diameter
- **Use G50 to cap RPM**: prevents overspeeding at small diameters
  \`G50 S3000\` = max 3000 RPM
- **Spring passes**: take the same finish cut twice without advancing. The tool was deflected on the first pass — the second cleans up.
- **Fresh cutting edge**: use a new insert edge for the finish pass` }] }],

  3: [{ id: `${CID}-m3-l1`, moduleId: `${CID}-mod-3`, title: "Facing", order: 1, content: [{ type: "text",
    body: `# Facing

## What It Is
Cutting the flat end of the workpiece perpendicular to the axis. Creates the Z-datum.

## Two Methods
### Outside-In
Start at the OD, feed toward center (X-). Most common.
- Better chip evacuation (chips fly outward)
- Tool path: start at X(OD+2), feed to X0 or X-0.5

### Inside-Out
Start at center, feed outward (X+). Used when:
- Center hole exists (need to start somewhere)
- Better finish at center (climb cutting at center)

## G-Code
\`\`\`gcode
G96 S200 M03          (constant surface speed)
G00 X52.0 Z0.5        (approach)
G01 Z0.0 F0.15        (touch face)
G01 X-1.6 F0.12       (face to center, past center by tool nose radius)
G00 Z0.5              (retract)
\`\`\`

## Important: Face First!
**SEQ-001**: Establish the Z-datum face before any other turning operation. Everything is measured from this face.

## Flatness
Facing flatness depends on:
- Machine rigidity
- Workpiece clamping (3-jaw vs collet)
- Tool nose radius (larger = flatter)
- Feed rate (lower = flatter)
Typical: 0.01-0.03mm flatness achievable` }] }],

  4: [{ id: `${CID}-m4-l1`, moduleId: `${CID}-mod-4`, title: "Grooving & Parting", order: 1, content: [{ type: "text",
    body: `# Grooving & Parting Off

## Grooving
Cutting a channel/groove into the OD, ID, or face.

### Types
- **External groove**: O-ring seats, snap ring grooves, shoulders
- **Internal groove**: bore grooves, seal seats
- **Face groove**: retaining ring grooves on faces

### Tool Types
- **Standard grooving insert**: 2-6mm width, various depths
- **Full-radius groove**: for O-ring seats (R specified on print)
- **Multi-function**: can groove, turn, and face (e.g., CoroCut)

### Programming
- **Plunge groove**: straight in (G01 X→depth)
- **Step groove**: for wide grooves, step-over by insert width minus 0.5mm
- **Peck groove (G75)**: for deep grooves, peck to prevent chip packing

## Parting Off (Cut-Off)
Separating the finished part from the bar stock.

### Rules
1. **Part off at the LOWEST possible RPM** that maintains Vc. As diameter decreases, RPM increases (G96). Cap with G50!
2. **Feed**: 0.05-0.15 mm/rev. Lower than grooving because the tool is fully buried.
3. **Cut-off at the chuck side** (not the tailstock side) — the part falls into the chip conveyor or parts catcher.
4. **Coolant essential** — tool is buried, heat has nowhere to go.
5. **Never stop the spindle during part-off** — the tool will weld to the workpiece.
6. **Pecking** may help in tough materials — retract 0.5mm, plunge again.` }] }],

  5: [{ id: `${CID}-m5-l1`, moduleId: `${CID}-mod-5`, title: "Threading (Single-Point)", order: 1, content: [{ type: "text",
    body: `# Single-Point Threading

## How It Works
The tool traces the thread profile in multiple passes, each slightly deeper than the last. The spindle encoder synchronizes the Z-feed to the spindle rotation to maintain pitch.

## G76 Threading Cycle (Fanuc)
\`\`\`gcode
G76 P010060 Q050 R0.02
G76 X8.376 Z-20.0 P812 Q200 F1.5
\`\`\`
- P: number of spring passes (01), thread run-out angle (00), infeed angle (60°)
- Q: minimum cutting depth per pass (50µm)
- R: finishing allowance
- X: thread minor diameter
- Z: thread length
- P: thread depth (812µm for M10×1.5)
- Q: first pass depth (200µm)
- F: pitch (1.5mm)

## Threading Insert Selection
- **60° full profile**: cuts the complete thread shape
- **60° partial profile (V-profile)**: for multiple pitches, you control the depth
- **Laydown style**: insert lies flat, more rigid
- **Top-notch style**: insert stands up, better chip flow

## Infeed Methods
- **Radial (0°)**: straight in. Simple but high forces, poor chip control.
- **Flank (29° or 30°)**: feeds at the thread angle. Best chip control.
- **Modified flank (60°)**: alternates sides. Best finish.
- **Incremental**: alternates left/right each pass. Good for large threads.

## Critical Rules
1. **SEQ-008**: Thread AFTER bore finishing (for internal threads)
2. **Don't change workpiece position** between threading passes
3. **Spring passes** (2-3 at final depth): essential for pitch accuracy
4. **Check with thread gauge**: Go and No-Go after every setup
5. **Thread run-out**: ensure enough clearance for tool retract at thread end` }] }],

  6: [{ id: `${CID}-m6-l1`, moduleId: `${CID}-mod-6`, title: "Boring", order: 1, content: [{ type: "text",
    body: `# Boring

## What It Is
Enlarging and finishing an existing hole from the inside. Used when:
- Drilled hole isn't round enough
- Need tighter tolerance than drilling provides
- Need concentricity to OD
- Need specific surface finish

## Boring Bar Selection
- **Steel bars**: standard, economical, L/D ≤ 4
- **Carbide bars**: stiffer (3× steel), L/D up to 6-7
- **Anti-vibration bars (tunable)**: internal damper, L/D up to 10+
- **Minimum bore diameter**: boring bar OD must be < bore diameter (typically bar = 60-70% of bore)

## Parameters
- **DOC**: 0.1-0.5mm for finishing, 0.5-3mm for roughing
- **Feed**: 0.05-0.15 mm/rev (conservative — deflection is the enemy)
- **Speed**: same as OD turning for the material

## Boring Challenges
- **Deflection**: the bar overhangs significantly. Keep L/D as small as possible.
- **Chatter**: boring bars are less rigid than OD tools. Anti-vibration bars help.
- **Chip evacuation**: chips must come OUT of the hole. Through-tool coolant helps.
- **Visibility**: you can't see the cut happening

## G-Code: Simple Boring Cycle
\`\`\`gcode
G00 X22.0 Z2.0       (approach — X smaller than bore)
G01 Z-30.0 F0.1      (bore to depth)
G00 X20.0             (retract tool away from wall)
G00 Z2.0              (retract out)
\`\`\`

## Achieving Tight Bore Tolerances
For ±0.005mm bores: rough bore → semi-finish → measure → adjust offset → finish bore → measure` }] }],

  7: [{ id: `${CID}-m7-l1`, moduleId: `${CID}-mod-7`, title: "Live Tooling", order: 1, content: [{ type: "text",
    body: `# Live Tooling (Mill-Turn)

## What It Is
A spinning tool on a turning center. The main spindle holds the workpiece (locked with C-axis), and a live tool (driven by its own motor) mills, drills, or taps.

## Why?
Complete the part in ONE setup instead of moving it to a mill:
- Cross-holes (perpendicular to axis)
- Flats (D-cuts, wrench flats)
- Keyways
- Off-center features
- Bolt circles on flanges

## Axes
- **C-axis**: rotational position of the main spindle (for angular positioning)
- **Y-axis**: cross-slide offset (for off-center features)
- **B-axis**: live tool tilt (on some machines)

## Programming Differences
- **G12.1 / G112**: Polar interpolation (program in XC instead of XY)
- **LIVE_RPM**: separate S command for live tool speed (not main spindle)
- **C-axis lock**: main spindle is C-locked (not rotating) during milling
- **Effective diameter**: D_eff changes with Y-offset for live tooling

## Common Live Tooling Operations
1. **Cross-drilling**: hole perpendicular to part axis
2. **Flat milling**: wrench flat on a shaft
3. **Keyway**: axial slot cut with end mill
4. **Tapping**: threaded cross-holes
5. **Hex milling**: hex shape on the end of a fitting

## Limitations
- **Power**: live tool motors are 3-7kW (vs 15-30kW main spindle)
- **Speed**: typically 4000-6000 RPM max (vs 10,000+ on a mill)
- **Rigidity**: less rigid than a dedicated milling machine
- **Tool size**: limited by turret station size` }] }],

  8: [{ id: `${CID}-m8-l1`, moduleId: `${CID}-mod-8`, title: "Sub-Spindle Operations", order: 1, content: [{ type: "text",
    body: `# Sub-Spindle Operations

## What It Is
A second spindle on the opposite end of the lathe. After machining the front of the part, the sub-spindle grabs it, the main spindle releases, and you machine the back — all in one cycle.

## The Workflow
1. Machine front features (OD, bore, face, thread)
2. Part-off (almost — leave a small witness)
3. Sub-spindle advances, grips the part
4. Part-off completes (or the part was already parted)
5. Sub-spindle retracts with the part
6. Machine back features (face back, bore, chamfer, engrave)
7. Part drops into collector — DONE

## Synchronization
- **Spindle sync**: both spindles rotate at the same speed for transfer (C-axis alignment for angular features)
- **Part-off with transfer**: the sub-spindle grabs, then the cutoff tool finishes

## Back-Working Operations
Common things done on the sub-spindle:
- Face the back (remove parting stub)
- Chamfer the back edge
- Drill/tap a back-side hole
- Turn a back-side diameter (that couldn't be reached from the front)
- Engrave part number

## Benefits
- **One setup = complete part** — no second operation
- **Better concentricity** — back features are concentric to front features
- **Less handling** — no re-chucking, no bench work
- **Faster cycle time** — front and back machining can overlap` }] }],

  9: [{ id: `${CID}-m9-l1`, moduleId: `${CID}-mod-9`, title: "Swiss-Type Turning", order: 1, content: [{ type: "text",
    body: `# Swiss-Type Turning

## What Makes Swiss Different
The workpiece feeds through a **guide bushing** right next to the cutting tool. The tool is always cutting near the bushing — minimal deflection regardless of part length.

## Why It Matters
Regular lathe: long, thin parts deflect under cutting force.
Swiss: the guide bushing supports the workpiece right at the cut point → **zero deflection**.

## Typical Parts
- Watch components (pins, shafts, screws)
- Medical (bone screws, dental implants, catheter tips)
- Electronics (connector pins, probe tips)
- Automotive (injector needles, valve stems)

## Characteristics
- **Bar diameter**: typically 2-32mm (some up to 38mm)
- **Bar feed**: automatic, from bar stock (3m or 4m bars)
- **Gang tooling**: tools mounted on a gang slide (not turret) for rapid tool changes
- **Guide bushing**: precision bushing that supports the bar at the cutting zone
- **Sliding headstock**: the headstock moves (not just the tool) — the bar slides through the bushing

## Programming Differences
- **Z-axis is reversed**: the headstock moves, not the tool
- **Bar feed**: G105/G136 or custom codes for bar advance
- **Simultaneous machining**: back tools + front tools can cut at the same time
- **Cycle time pressure**: Swiss parts are often seconds, not minutes

## When to Use Swiss vs Standard Lathe
| Factor | Swiss | Standard |
|--------|-------|----------|
| L/D ratio > 4 | ✓ Best | ✗ Deflection |
| Diameter < 25mm | ✓ Best | Possible |
| Diameter > 32mm | ✗ Too big | ✓ Best |
| Complex back-work | ✓ Built-in | Needs sub-spindle |
| Simple parts | ✗ Overkill | ✓ Cheaper |
| High volume | ✓ Fastest | Possible |` }] }],

  10: [{ id: `${CID}-m10-l1`, moduleId: `${CID}-mod-10`, title: "Turning Safety & Best Practices", order: 1, content: [{ type: "text",
    body: `# Turning Safety & Best Practices

## Chuck Safety
- **Never leave the chuck key in the chuck** — it will fly out when the spindle starts
- **Check jaw grip**: minimum 1× diameter gripped in jaws
- **Maximum RPM**: check the rated RPM of the chuck (decreases with diameter)
- **Jaw projection**: minimize how far jaws stick out — centrifugal force at high RPM can throw them

## Long Part Support
- For L/D > 3: use a **tailstock center** (live center recommended)
- For L/D > 8: use a **steady rest** (fixed support at a specific Z position)
- For L/D > 12: use a **follow rest** (travels with the tool, supports near the cut)

## Chip Wrapping (The #1 Turning Hazard)
Long, stringy chips can wrap around the workpiece or chuck:
- **Never reach in** to remove wrapped chips while spinning
- **Fix**: increase feed, change chipbreaker, use higher rake angle insert
- **Emergency**: hit E-STOP, wait for full stop, then carefully remove with pliers

## Speed Limiting
- **G50 S####**: sets maximum RPM when using constant surface speed (G96)
- Without G50, the spindle will accelerate to machine max as diameter decreases
- At the moment of part-off (D→0), RPM would go to infinity without a cap!

## Insert Handling
- **Inserts are carbide** — extremely hard but brittle
- **Never bang two inserts together** — they chip
- **Tighten clamp screws with a torque wrench** — finger-tight then 1/4 turn
- **Index (rotate) inserts to a fresh edge** before they get too dull
  (dull = visible wear land > 0.3mm, or audible change in cutting sound)

## The Turning Checklist
Before Cycle Start:
- [ ] Workpiece centered and gripped (pull test)
- [ ] Tailstock locked (if using)
- [ ] Tool nose radius offset set correctly
- [ ] G96 with G50 RPM limit
- [ ] Coolant aimed at the cutting zone
- [ ] Chip guard closed
- [ ] First run: single-block mode, 50% rapid override` }] }],
};

// Quizzes
export const COURSE_5_QUIZZES: Record<string, Question[]> = {
  [`${CID}-mod-2-quiz`]: [
    {
      id: "c5-q1", type: "calculation", difficulty: 2,
      text: "Calculate theoretical Ra for turning at f=0.12mm/rev with a 0.8mm nose radius insert.\n\nRa ≈ f² / (32 × r_ε)",
      correctAnswer: 0.56, tolerance: 5,
      explanation: "Ra = 0.12² / (32 × 0.8) = 0.0144 / 25.6 = 0.56 µm",
      tags: ["surface_finish", "turning", "nose_radius"],
    },
  ],
  [`${CID}-mod-5-quiz`]: [
    {
      id: "c5-q2", type: "multiple_choice", difficulty: 2,
      text: "When should you thread a bore — before or after finish boring?",
      options: [
        { id: "a", text: "Before (threading first is faster)", isCorrect: false },
        { id: "b", text: "After (threading on an unfinished bore risks damage to threads during finish boring)", isCorrect: true },
        { id: "c", text: "Doesn't matter", isCorrect: false },
      ],
      explanation: "SEQ-008: Thread AFTER bore finishing. Finish boring generates forces that could damage existing threads.",
      tags: ["threading", "sequence", "playbook"],
    },
  ],
};

const mk = (i: number, t: string, m: number): Module => ({
  id: `${CID}-mod-${i}`, courseId: CID, title: t,
  description: `${t} — Turning Operations`, order: i,
  lessons: lessons[i] ?? [],
  quiz: {
    id: `${CID}-mod-${i}-quiz`, moduleId: `${CID}-mod-${i}`,
    questions: COURSE_5_QUIZZES[`${CID}-mod-${i}-quiz`] ?? [],
    passingScore: 75,
  },
  estimatedMinutes: m,
});

export const COURSE_5_MODULES: Module[] = [
  mk(1, "OD Roughing", 45),
  mk(2, "OD Finishing", 50),
  mk(3, "Facing", 35),
  mk(4, "Grooving & Parting", 45),
  mk(5, "Threading (Single-Point)", 55),
  mk(6, "Boring", 50),
  mk(7, "Live Tooling", 45),
  mk(8, "Sub-Spindle Operations", 40),
  mk(9, "Swiss-Type Turning", 45),
  mk(10, "Turning Safety & Best Practices", 35),
];
