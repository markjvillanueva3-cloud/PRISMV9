/**
 * Course 4: Milling Operations
 * Level: Intermediate→Advanced | 12 Modules | ~10 hours
 *
 * Every milling operation with animations, playbook rules,
 * and live calculators. Powered by PRISM's 296 playbook rules
 * and 433 toolpath strategies.
 */

import type { Module, Lesson, Question } from
  "../../engines/CurriculumEngine.js";

const CID = "course-4";

const lessons: Record<number, Lesson[]> = {
  1: [{ id: `${CID}-m1-l1`, moduleId: `${CID}-mod-1`, title: "Face Milling", order: 1, content: [{ type: "text",
    body: `# Face Milling

## What It Is
Removing material from the top surface to create a flat, parallel datum face. **Always the first operation** — establishes the reference surface for everything else.

## Tool Selection
- **Indexable face mill** (50-160mm): for large flat areas
- **Shell mill** (40-80mm): versatile, moderate areas
- **Large end mill** (20-32mm): small parts or limited access

## Key Parameters
- **ae** (width of cut): 60-75% of cutter diameter for optimal chip thinning
- **ap** (depth): 1-3mm typical for roughing, 0.3-0.5mm finishing
- **Enter/exit**: Position tool so it enters with gradual engagement (not full-width slam)

## Playbook Rules
- **SEQ-001**: Face first, establish datums — ALWAYS
- **Never face with the part center aligned to the cutter center** — causes double-cutting at the centerline (terrible finish)
- **Offset the tool** so one side of the cutter overhangs the workpiece edge

## Climb vs Conventional
- **Climb milling** (preferred): cutter rotation matches feed direction. Better finish, less heat, tool pulls into cut.
- **Conventional**: cutter opposes feed. Use only on machines with backlash (old manual mills).

## Common Mistakes
- Facing at full width (100% ae) → re-cutting chips → poor finish
- Not enough stock removal → leaves high spots
- Wrong insert grade for material (see ISO group chart)` }] }],

  2: [{ id: `${CID}-m2-l1`, moduleId: `${CID}-mod-2`, title: "Pocket Milling", order: 1, content: [{ type: "text",
    body: `# Pocket Milling

## Entry Methods (Critical!)

The tool must get INTO the pocket somehow. Options:

### 1. Pre-drilled Hole
Drill a starter hole, then plunge the end mill in. Safest but requires a tool change.

### 2. Helical Entry (Recommended)
Tool spirals down in a helix. Gentle on the tool, works in most materials.
- Helix angle: 1-3° (shallow = gentler)
- Helix diameter: 50-75% of tool diameter

### 3. Ramp Entry
Tool moves down at an angle while moving in XY. Good for shallow pockets.
- Ramp angle: 1-5° depending on material

### 4. Plunge Entry
Straight down. Only with center-cutting end mills. High axial force — avoid if possible.

## Toolpath Strategies

### Contour Parallel (Offset)
Concentric paths from outside in (or inside out). Constant engagement but sharp corners create load spikes.

### Zigzag/Lace
Back-and-forth rows. Fast but 50% of cuts are conventional (bad for finish).

### Adaptive/HSM (Best for Roughing)
Constant-engagement toolpath that maintains chip load. Benefits:
- 5-15% radial engagement (ae)
- Full depth of cut (ap = 1-2× D)
- Compensated feed rate for chip thinning
- **2-3× faster cycle time than conventional**
- **Longer tool life** (paradox: higher feed = less heat per tooth)

## Pocket Finishing
- Leave 0.1-0.3mm stock for finish pass
- Finish at full depth in one pass (no step-down)
- Use cutter compensation (G41/G42) for size adjustment
- Reduce feed 30-50% for better Ra` }] }],

  3: [{ id: `${CID}-m3-l1`, moduleId: `${CID}-mod-3`, title: "Slotting", order: 1, content: [{ type: "text",
    body: `# Slotting

## The Challenge
Full-width engagement (ae = D). This means:
- **Maximum cutting force** — tool is buried
- **No chip thinning** — actual chip = programmed fz
- **Poor chip evacuation** — chips have nowhere to go
- **Heat buildup** — tool is surrounded by material

## Slotting Rules
1. **Reduce feed 30-50%** compared to side milling
2. **Use 2-3 flute tools** (more chip space per flute)
3. **Through-spindle coolant** essential for deep slots
4. **Multiple depth passes** — don't full-slot in one pass
5. **Recommended ap per pass**: 0.5-1× D for roughing

## Better Alternative: Trochoidal Slotting
Instead of plowing straight through, use a circular/wave motion:
- Tool weaves side to side while advancing
- Only 10-20% radial engagement at any time
- **3-5× faster** than conventional slotting
- Works at full depth (1-2× D)
- Most CAM systems support this natively

## Keyway Slotting
- **Width** = key size (check DIN/ANSI standard)
- **Depth** = key height + clearance
- **Tolerance**: typically H7 on width (press fit for key)
- **Tool**: use exact keyway width end mill or slightly undersize + cleanup pass` }] }],

  4: [{ id: `${CID}-m4-l1`, moduleId: `${CID}-mod-4`, title: "Contour Milling", order: 1, content: [{ type: "text",
    body: `# Contour Milling (Profiling)

## What It Is
Following a 2D outline (contour) at a constant depth. The most common finishing operation.

## Key Concepts

### Stock Allowance
Leave material for the finish pass:
- **Roughing**: leave 0.2-0.5mm (depends on tolerance)
- **Semi-finish**: leave 0.05-0.1mm (for tight tolerance)
- **Finish**: cut to final dimension

### Lead-In / Lead-Out
Never plunge directly into a contour wall. Use:
- **Arc lead-in**: smooth tangential entry (90° arc at entry point)
- **Linear lead-in**: straight approach at an angle
- **Arc lead-out**: smooth exit to prevent witness mark

### Cutter Compensation
Use G41/G42 so you can adjust the tool diameter offset without reprogramming. Wear adjustments = change D offset by 0.01mm.

### Corner Treatment
- **Sharp internal corners**: tool must be smaller than corner radius!
  - If corner R = 3mm, tool D must be < 6mm
- **External corners**: decelerate to avoid overcut (corner rounding)
- **Fillet radius**: always specify minimum R = tool radius + 0.5mm

## Multiple-Depth Contouring
For walls deeper than 1× tool diameter:
- Step down in equal increments (ap = 0.5-1× D)
- Final pass at full depth for wall straightness
- **Spring pass**: repeat the last pass without moving deeper — cleans up deflection` }] }],

  5: [{ id: `${CID}-m5-l1`, moduleId: `${CID}-mod-5`, title: "Plunge Milling", order: 1, content: [{ type: "text",
    body: `# Plunge Milling (Z-Axis Roughing)

## When to Use
- **Deep pockets** where side loads cause deflection
- **Long reach** (L/D > 4) where conventional milling chatters
- **Hard materials** (>45 HRC) where lateral forces are problematic
- **Thin walls** that can't take side loads

## How It Works
Instead of cutting sideways (XY), the tool plunges straight down (Z), retracts, steps over, and plunges again. The force is **axial** (into the spindle) instead of radial (bending the tool).

## Advantages
- **Spindle absorbs the force** — no deflection
- **Works at any L/D ratio** — even L/D = 10+
- **Aggressive material removal** in hard materials
- **Simple programming** — series of Z plunges

## Parameters
- **Step-over**: 50-75% of tool diameter
- **Plunge feed**: equal to or higher than normal XY feed
- **Retract**: rapid (G00) to clearance height
- **Pattern**: row-by-row or spiral from outside in

## Limitations
- **Not a finishing strategy** — leaves scalloped floor
- **Floor cleanup required** — follow with face or contour pass
- **Chip evacuation** — through-spindle coolant strongly recommended` }] }],

  6: [{ id: `${CID}-m6-l1`, moduleId: `${CID}-mod-6`, title: "Adaptive / HSM Roughing", order: 1, content: [{ type: "text",
    body: `# Adaptive / HSM Roughing

## The Revolution in Roughing

Adaptive (also called HSM, Dynamic, or High-Efficiency Milling) is the single biggest productivity improvement in CNC milling in the last 20 years.

## The Concept
- **Low radial engagement** (ae = 5-15% of D)
- **Full axial engagement** (ap = 1-2× D)
- **Constant chip load** throughout the toolpath
- **Compensated feed rate** for chip thinning

## Why It's Faster
Traditional: ae=50%, ap=1×D, Vf=1000mm/min → MRR = 0.5×12×12×1000 = 72,000 mm³/min
Adaptive: ae=10%, ap=2×D, Vf=5000mm/min → MRR = 0.1×12×24×5000 = 144,000 mm³/min

**2× faster** with less force on the tool!

## Why Tool Life is BETTER (The Paradox)
- Each tooth is in contact for a shorter time → less heat absorption
- Chip carries the heat away (thick enough chip = good heat transfer)
- No re-cutting of chips (tool is always in fresh material)
- Constant engagement = constant temperature (no thermal cycling)

## CAM System Names
- **Mastercam**: Dynamic Motion / OptiRough
- **Fusion 360**: Adaptive Clearing
- **hyperMILL**: HPC (High Performance Cutting)
- **SolidCAM**: iMachining
- **NX**: Adaptive Milling
- **PowerMill**: Vortex

## Key Settings
- **Optimal load / stepover**: 8-12% of D (manufacturer recommendation)
- **Max depth**: 1.5-2× D (some materials allow more)
- **Lead-in**: helical or arc entry
- **Feed adjustment**: CAM auto-compensates for chip thinning` }] }],

  7: [{ id: `${CID}-m7-l1`, moduleId: `${CID}-mod-7`, title: "Rest Machining", order: 1, content: [{ type: "text",
    body: `# Rest Machining

## What It Is
Cleaning up material that the previous (larger) tool couldn't reach. The corners, fillets, and tight areas left behind.

## The Problem
A 25mm end mill leaves R12.5mm fillets in all corners. If the print calls for R3mm fillets, you need a smaller tool to clean up.

## Strategy
1. **Roughing**: 25mm tool removes 90% of material
2. **Rest rough**: 10mm tool cleans up corners and tight areas
3. **Rest finish**: 6mm tool (R3 corner radius) finishes to final dimension

## CAM Setup
- Reference the previous toolpath (CAM tracks what's left)
- Set **rest material detection** to avoid air-cutting
- Use **stock recognition** so the small tool only cuts where material remains

## Rules
- **Always rough before rest** — don't try to remove full stock with the small tool
- **Match the corner radius** to the smaller tool: tool R must be ≤ feature R
- **Stock allowance consistency** — if rough left 0.3mm, rest-rough should also leave 0.3mm (for consistent finish pass)
- **Watch deflection** — smaller tool = more flex. Reduce feed accordingly.` }] }],

  8: [{ id: `${CID}-m8-l1`, moduleId: `${CID}-mod-8`, title: "3D Surface Milling", order: 1, content: [{ type: "text",
    body: `# 3D Surface Milling

## When You Need It
Any part with curved, sculpted, or freeform surfaces: molds, dies, turbine blades, medical implants, consumer product housings.

## Tool Types
- **Ball end mill** — the default for 3D surfaces. Creates scallops.
- **Bull nose** (corner radius end mill) — wider stepover for flatter areas
- **Barrel cutter** — advanced, huge stepover on shallow curves (5-axis only)

## Ball End Mill Scallop Height

The residual material between passes:

$$h = R - \\sqrt{R^2 - (ae/2)^2}$$

Where R = ball radius, ae = stepover.

To achieve Ra 1.6µm finish: stepover ≈ 0.1-0.3mm with a 6-10mm ball end.

## Finishing Strategies
- **Parallel (zigzag)**: rows at constant Z-height. Good for gently curved surfaces.
- **Contour (waterline)**: follows the surface at constant Z. Good for steep walls.
- **Spiral**: starts at center, spirals outward. Good for round pockets/cores.
- **Scallop**: constant cusp height everywhere. Best overall quality.
- **Pencil**: traces the valleys between surfaces. Cleanup only.

## The 3+2 Trick
On a 5-axis machine: tilt the part so the ball end cuts near its equator (not the tip). This:
- Increases effective diameter → better surface speed
- Reduces scallop height at the same stepover
- Avoids zero-speed at the ball center (which causes rubbing)` }] }],

  9: [{ id: `${CID}-m9-l1`, moduleId: `${CID}-mod-9`, title: "Thread Milling", order: 1, content: [{ type: "text",
    body: `# Thread Milling

## When to Thread Mill (vs Tap)
- **Large threads** (M12+) — taps get expensive, thread mills are reusable
- **Hard materials** (>35 HRC) — taps break, thread mills survive
- **Blind holes** — thread mill can go closer to the bottom
- **Multiple thread sizes** — one tool with different programmed paths
- **Interrupted cuts** (cross-holes) — taps break, thread mills don't care

## How It Works
The tool orbits the hole in a helical path. One full orbit = the entire thread length if using a single-point thread mill, or just the thread pitch if using a multi-tooth.

## Single-Point vs Multi-Tooth
- **Single-point**: one row of teeth. Must helical interpolate for the full thread depth. Slower but works for any pitch.
- **Multi-tooth**: multiple rows of teeth spaced at the pitch. One orbit = done. Much faster but pitch-specific.

## Programming
\`\`\`gcode
(M10x1.5 internal thread mill — climb, bottom-up)
G00 X0 Y0 Z-13.5    (go to bottom of thread)
G01 Z-13.5 F500      (position)
G03 X0 Y0 Z-12.0 I4.25 J0 F300  (one helical orbit, rising 1.5mm = pitch)
G00 Z10.0            (retract)
\`\`\`

## Advantages Over Tapping
- Thread mill breaks → pull it out (no extraction needed)
- One tool does M8, M10, M12 (same pitch, different orbits)
- Better thread quality in hard materials
- Can do right-hand or left-hand threads with same tool` }] }],

  10: [{ id: `${CID}-m10-l1`, moduleId: `${CID}-mod-10`, title: "Drilling Strategies", order: 1, content: [{ type: "text",
    body: `# Drilling Strategies

## Drill Types
- **Twist drill**: general purpose, 118° or 135° point
- **Indexable insert drill**: fast, good for production
- **Carbide drill**: high speed, tight holes
- **Gun drill**: deep holes (10-100× depth)
- **Step drill**: multiple diameters in one pass
- **Center drill**: creates a starting dimple (60° or 90°)

## When to Peck (G83 vs G73)
- **No pecking**: depth < 3× diameter in easy material
- **G73 (high-speed peck)**: depth 3-6× diameter, partial retract
- **G83 (deep peck)**: depth > 6× diameter, full retract to clear chips

## Pilot Holes
For large drills (>20mm) or drills entering curved/angled surfaces:
1. Center drill (dimple for location)
2. Pilot drill (small hole for guidance, typically 50% of final diameter)
3. Production drill (final size)

## Spot Drilling
Create a flat surface for the drill to start on (when drilling on an angle or curved surface). Use a 90° spot drill or chamfer mill.

## Feed Calculation for Drilling
$$F = f_{rev} \\times RPM$$

Where $f_{rev}$ = feed per revolution (from drill manufacturer).

## Common Mistakes
- No pilot hole for large drills → drill walks
- Too fast retract in G83 → chip pack in flutes → drill breaks
- Drilling into a pocket floor with no support → breakthrough burr
- Wrong point angle for material (135° for steel, 118° for aluminum)` }] }],

  11: [{ id: `${CID}-m11-l1`, moduleId: `${CID}-mod-11`, title: "Tapping", order: 1, content: [{ type: "text",
    body: `# Tapping

## Rigid Tapping (G84)
Modern CNC machines synchronize spindle rotation with Z-axis feed. The tap goes in at exactly the right pitch, reverses at the bottom, and comes back out.

**The critical formula:**
$$F = pitch \\times RPM$$

M10×1.5 at 400 RPM: F = 1.5 × 400 = **600 mm/min**

**If F is wrong → broken tap or stripped threads.**

## Floating Tap Holders
For machines without rigid tapping: the holder has a spring that compensates for spindle/feed mismatch. Slower but safer.

## Tap Drill Size
**Rule: Drill diameter = Major diameter - Pitch**
- M8×1.25: drill = 8 - 1.25 = **6.75mm** (use 6.8mm)
- M10×1.5: drill = 10 - 1.5 = **8.5mm**
- M12×1.75: drill = 12 - 1.75 = **10.25mm** (use 10.2mm)

## Thread Depth
- **75% thread** is standard (90-100% of strength with 50% less torque to tap)
- Only specify 100% thread for critical structural applications

## Tapping Coolant
- **Flood coolant**: standard, tap-specific cutting oil works best
- **Tapping paste/oil**: for manual or slow tapping
- **Through-tool coolant**: best for blind holes (flushes chips up)

## When Taps Break
Broken taps are EXTREMELY hard to remove. Prevention:
- Correct tap drill size (not too small!)
- Adequate peck depth for blind holes
- Proper speed (taps have narrow speed ranges)
- Fresh sharp tap (replace before they get dull)
- If it DOES break: EDM removal is often the only option` }] }],

  12: [{ id: `${CID}-m12-l1`, moduleId: `${CID}-mod-12`, title: "Micro-Machining", order: 1, content: [{ type: "text",
    body: `# Micro-Machining

## What Counts as Micro?
Tools smaller than 1mm diameter (down to 0.1mm). Features measured in microns.

## Challenges
- **Runout**: 0.005mm runout on a 0.5mm tool = 1% of diameter (catastrophic)
- **Deflection**: tiny tools deflect at minuscule forces
- **Speed**: RPM must be extreme to maintain Vc. 0.5mm tool at 200 m/min = 127,000 RPM
- **Feeds**: fz = 0.002-0.010mm (below most controller resolution)
- **Visibility**: you can't see what you're cutting without magnification

## Equipment Requirements
- **High-speed spindle**: 40,000-80,000+ RPM (often air turbine)
- **Shrink-fit or precision collet holder**: <0.003mm runout
- **Microscope or camera**: for setup verification
- **Vibration-free environment**: separate foundation, no nearby heavy equipment
- **Temperature control**: ±0.5°C air temperature

## Applications
- Medical devices (bone screws, implant features)
- Electronics (connector pins, PCB features)
- Watchmaking (gears, springs, bezels)
- Mold making (micro textures, thin ribs)
- Optics (lens mounts, fiber channels)

## Key Rules
1. **Minimize runout above all else** — it's the #1 failure mode
2. **Use microscope for tool setting** — you can't see 0.2mm tools by eye
3. **Air blast or MQL only** — flood coolant can break micro tools
4. **Maximum 2 flutes** — chip evacuation in tiny spaces
5. **Program in microns** if controller supports it (G21 → G20.1 on some controls)` }] }],
};

// Quizzes
export const COURSE_4_QUIZZES: Record<string, Question[]> = {
  [`${CID}-mod-2-quiz`]: [
    {
      id: "c4-q1", type: "multiple_choice", difficulty: 2,
      text: "What is the recommended entry method for pocket milling?",
      options: [
        { id: "a", text: "Plunge straight down", isCorrect: false },
        { id: "b", text: "Helical entry at 1-3° angle", isCorrect: true },
        { id: "c", text: "Rapid to depth", isCorrect: false },
        { id: "d", text: "Side entry from edge", isCorrect: false },
      ],
      explanation: "Helical entry is the recommended pocket entry method — gentle on the tool, works in most materials.",
      tags: ["pocket", "entry", "toolpath"],
    },
  ],
  [`${CID}-mod-6-quiz`]: [
    {
      id: "c4-q2", type: "multiple_choice", difficulty: 2,
      text: "Why does adaptive/HSM roughing give LONGER tool life despite running at much higher feed rates?",
      options: [
        { id: "a", text: "The tool runs cooler because each tooth contacts material for less time", isCorrect: true },
        { id: "b", text: "The tool is harder", isCorrect: false },
        { id: "c", text: "More coolant is used", isCorrect: false },
        { id: "d", text: "The material is softer at high speeds", isCorrect: false },
      ],
      explanation: "Low radial engagement = short contact time per tooth = less heat absorption. The chip carries heat away. Constant engagement avoids thermal cycling.",
      tags: ["hsm", "adaptive", "tool_life"],
    },
  ],
  [`${CID}-mod-11-quiz`]: [
    {
      id: "c4-q3", type: "calculation", difficulty: 2,
      text: "Calculate the feed rate for rigid tapping M12×1.75 at 300 RPM.\n\nF = pitch × RPM",
      correctAnswer: 525, tolerance: 1,
      explanation: "F = 1.75 × 300 = 525 mm/min",
      tags: ["tapping", "feed", "threading"],
    },
  ],
};

const mk = (i: number, t: string, m: number): Module => ({
  id: `${CID}-mod-${i}`, courseId: CID, title: t,
  description: `${t} — Milling Operations`, order: i,
  lessons: lessons[i] ?? [],
  quiz: {
    id: `${CID}-mod-${i}-quiz`, moduleId: `${CID}-mod-${i}`,
    questions: COURSE_4_QUIZZES[`${CID}-mod-${i}-quiz`] ?? [],
    passingScore: 75,
  },
  estimatedMinutes: m,
});

export const COURSE_4_MODULES: Module[] = [
  mk(1, "Face Milling", 45),
  mk(2, "Pocket Milling", 55),
  mk(3, "Slotting", 40),
  mk(4, "Contour Milling", 50),
  mk(5, "Plunge Milling", 35),
  mk(6, "Adaptive / HSM Roughing", 55),
  mk(7, "Rest Machining", 35),
  mk(8, "3D Surface Milling", 50),
  mk(9, "Thread Milling", 40),
  mk(10, "Drilling Strategies", 45),
  mk(11, "Tapping", 40),
  mk(12, "Micro-Machining", 35),
];
