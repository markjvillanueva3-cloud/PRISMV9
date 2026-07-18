/**
 * Course 1: Manufacturing Fundamentals
 * Level: Novice | 12 Modules | ~8 hours
 *
 * The complete foundation for understanding CNC machining.
 * A novice completing this course will understand machine types,
 * coordinate systems, cutting tools, materials, basic speed/feed
 * concepts, drawing reading, surface finish, tolerances,
 * workholding, coolant, and shop safety.
 *
 * Visual-first: every concept starts with a diagram or animation
 * before text explanation.
 */

import type { Module, Lesson, Question } from
  "../../engines/CurriculumEngine.js";

const COURSE_ID = "course-1";

// ═══════════════════════════════════════════════════════════
// Module 1: What is CNC Machining?
// ═══════════════════════════════════════════════════════════

const mod1Lessons: Lesson[] = [
  {
    id: `${COURSE_ID}-mod-1-les-1`,
    moduleId: `${COURSE_ID}-mod-1`,
    title: "From Raw Stock to Finished Part",
    order: 1,
    content: [
      {
        type: "text",
        body: `# What is CNC Machining?

**CNC** stands for **Computer Numerical Control**. It means a computer controls the movement of cutting tools to shape metal, plastic, or other materials into precise parts.

## The Big Picture

Every CNC part starts the same way:

1. **Raw stock** — a block, bar, or casting of material
2. **Cutting tools** remove material layer by layer
3. **G-code program** tells the machine exactly where to move
4. **Finished part** — accurate to thousandths of an inch

## Why CNC?

- **Repeatability** — make 1,000 identical parts
- **Precision** — tolerances tighter than a human hair (±0.001")
- **Speed** — modern machines cut at 40,000+ RPM
- **Complexity** — shapes impossible to make by hand

## Types of Material Removal

- **Milling** — rotating tool, stationary workpiece
- **Turning** — rotating workpiece, stationary tool
- **Drilling** — creating holes
- **Grinding** — ultra-fine surface finishing
- **EDM** — electrical discharge (no contact)`,
      },
      {
        type: "text",
        body: `## Key Vocabulary

| Term | Meaning |
|------|---------|
| **Spindle** | The rotating part that holds the cutting tool |
| **Table** | The platform that holds the workpiece |
| **Axis** | A direction of movement (X, Y, Z) |
| **Feed** | How fast the tool moves through material |
| **Speed** | How fast the spindle rotates (RPM) |
| **DOC** | Depth of Cut — how deep the tool goes per pass |
| **Chip** | The material removed by cutting |
| **Coolant** | Fluid that cools the tool and flushes chips |
| **Fixture** | Device that holds the workpiece in place |
| **G-code** | The programming language CNC machines understand |`,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// Module 2: Machine Types
// ═══════════════════════════════════════════════════════════

const mod2Lessons: Lesson[] = [
  {
    id: `${COURSE_ID}-mod-2-les-1`,
    moduleId: `${COURSE_ID}-mod-2`,
    title: "CNC Machine Types — Visual Guide",
    order: 1,
    content: [
      {
        type: "text",
        body: `# CNC Machine Types

## Vertical Machining Center (VMC)
The most common CNC mill. The spindle points **down** (vertical).

- **Best for**: flat parts, pockets, holes, contours
- **Axes**: 3 (X, Y, Z) or 4-5 with rotary table
- **Example**: Haas VF-2, DMG MORI DMU 50
- **Workpiece**: bolted to the table or held in a vise

## Horizontal Machining Center (HMC)
The spindle points **sideways** (horizontal).

- **Best for**: box-shaped parts, multi-side machining
- **Advantage**: chips fall away from the cut (gravity helps)
- **Example**: Makino a51nx, Okuma MB-5000H
- **Often has**: pallet changer for continuous production

## CNC Lathe / Turning Center
The **workpiece** rotates, the tool stays still.

- **Best for**: round parts — shafts, bushings, fittings
- **Axes**: 2 (X, Z) or more with live tooling
- **Example**: Haas ST-10, Mazak QTN-200
- **Variations**: Swiss-type (for small precision parts)

## 5-Axis Machining Center
Can tilt and rotate the tool OR workpiece in 5 directions simultaneously.

- **Best for**: complex geometry — turbine blades, impellers, medical implants
- **Advantage**: reach undercuts, reduce setups from 6 to 1
- **Example**: DMG MORI DMU 80, Hermle C 42 U
- **Cost**: 2-5x more than a 3-axis VMC

## Other Types
- **CNC Grinder** — ultra-precise surface finishing (Ra < 0.1 µm)
- **CNC EDM** — cuts hardened steel with electrical sparks
- **CNC Router** — large, fast, for wood/plastic/aluminum
- **CNC Swiss** — tiny precision parts (watchmaking, medical)
- **Mill-Turn** — combines milling and turning in one machine`,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// Module 3: Coordinate Systems
// ═══════════════════════════════════════════════════════════

const mod3Lessons: Lesson[] = [
  {
    id: `${COURSE_ID}-mod-3-les-1`,
    moduleId: `${COURSE_ID}-mod-3`,
    title: "X, Y, Z — Understanding Machine Coordinates",
    order: 1,
    content: [
      {
        type: "text",
        body: `# Coordinate Systems

Every CNC machine uses a **Cartesian coordinate system** — the same X, Y, Z you learned in math class.

## The Right-Hand Rule
Hold your right hand:
- **Thumb** = X (left/right)
- **Index finger** = Y (front/back)
- **Middle finger** = Z (up/down)

## Milling Machine Axes
- **X** — table moves left/right
- **Y** — table moves toward/away from you
- **Z** — spindle moves up/down
- **+Z is always AWAY from the workpiece** (safety rule!)

## Lathe Axes
- **X** — cross-slide (toward/away from centerline)
- **Z** — along the length of the part
- **X values are usually diameter** (not radius)

## Machine Zero vs Work Zero
- **Machine Zero (G28/G53)** — fixed reference point set by manufacturer
- **Work Zero (G54-G59)** — YOUR reference point on the workpiece
- You set work zero during setup using an edge finder or probe

## Absolute vs Incremental
- **Absolute (G90)** — all positions relative to work zero
- **Incremental (G91)** — each move relative to current position

**Example**: Moving to X=50 Y=30 Z=-5
- Absolute: "Go to the point 50mm right, 30mm back, 5mm below zero"
- Incremental: "Move 50mm right, 30mm back, 5mm down from where you are now"`,
      },
      {
        type: "calculator",
        title: "Coordinate Converter",
        calculatorConfig: {
          engine: "UnitConversionEngine",
          inputFields: ["cutting_speed"],
          outputFields: ["rpm"],
          defaults: { cutting_speed: 200 },
        },
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// Module 4: Cutting Tool Anatomy
// ═══════════════════════════════════════════════════════════

const mod4Lessons: Lesson[] = [
  {
    id: `${COURSE_ID}-mod-4-les-1`,
    moduleId: `${COURSE_ID}-mod-4`,
    title: "Parts of a Cutting Tool",
    order: 1,
    content: [
      {
        type: "text",
        body: `# Cutting Tool Anatomy

## End Mill (Milling Tool)

An end mill is the most common milling cutter. Here's every part:

### Cutting Geometry
- **Flutes** — the spiral grooves that carry chips away (2, 3, 4, or more)
- **Cutting edges** — the sharp edges that actually cut (one per flute)
- **Helix angle** — the spiral angle of the flutes (typically 30-45°)
- **End teeth** — cutting edges on the bottom face (center-cutting or not)
- **Corner radius** — rounded corner for strength (0 = sharp corner)

### Dimensions
- **Diameter (D)** — the cutting diameter (most critical dimension)
- **Flute length (LOC)** — how deep the flutes extend
- **Overall length (OAL)** — total tool length
- **Shank diameter** — the part held by the collet/holder

### Materials
- **HSS (High Speed Steel)** — cheapest, sharpest, least heat resistant
- **Carbide** — 3x harder than HSS, handles high speeds
- **Ceramic** — for hardened steel and superalloys
- **CBN** — for hardened steel above 45 HRC
- **PCD (Diamond)** — for aluminum and composites

### Coatings
- **TiN (gold)** — general purpose, +25% tool life
- **TiAlN (dark purple)** — high-temp, best for steel/stainless
- **AlCrN** — for hardened steel and dry machining
- **DLC (diamond-like)** — for aluminum (prevents built-up edge)
- **Uncoated** — for aluminum, plastics, soft materials`,
      },
      {
        type: "text",
        body: `## Turning Inserts

Turning tools use replaceable inserts (you don't sharpen them — you flip or replace them).

### Insert Shape Codes (ISO)
- **C** — diamond 80° (most common for OD turning)
- **D** — diamond 55° (finishing, tight corners)
- **T** — triangle 60° (general purpose)
- **S** — square 90° (facing, strong corner)
- **R** — round (contour turning, strong edge)
- **V** — diamond 35° (profiling, tight access)

### Insert Size
The number after the shape = inscribed circle diameter in mm:
- CNMG **12**04 = 12mm inscribed circle
- WNMG **08**04 = 8mm inscribed circle

### Nose Radius
The last 2 digits = nose radius × 10:
- CNMG1204**04** = 0.4mm nose radius
- CNMG1204**08** = 0.8mm nose radius

**Larger nose radius = better finish but needs more force**

### Insert Grade
Manufacturer-specific. General rule:
- **Lower grade number** = harder, more wear resistant, less tough
- **Higher grade number** = tougher, handles interruptions, less wear resistant`,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// Module 5: Material Basics
// ═══════════════════════════════════════════════════════════

const mod5Lessons: Lesson[] = [
  {
    id: `${COURSE_ID}-mod-5-les-1`,
    moduleId: `${COURSE_ID}-mod-5`,
    title: "Know Your Material — The 6 ISO Groups",
    order: 1,
    content: [
      {
        type: "text",
        body: `# Material Basics for Machinists

## The 6 ISO Material Groups

Every workpiece material falls into one of 6 groups. This determines your cutting parameters.

### P — Steel (Blue)
- Most common group in job shops
- Carbon steel (1018, 1045), alloy steel (4140, 4340, 8620)
- Tool steel (D2, H13, A2, M2)
- **Machinability**: Good to moderate
- **Chip**: Long, continuous (can be stringy)
- **Typical Vc**: 150-300 m/min (carbide)

### M — Stainless Steel (Yellow)
- 300 series (304, 316), 400 series (410, 420), precipitation hardened (17-4 PH)
- **Challenge**: Work hardens — if you rub instead of cut, it gets harder
- **Key rule**: Never dwell! Keep the tool moving and cutting
- **Typical Vc**: 100-200 m/min

### K — Cast Iron (Red)
- Gray iron, ductile iron, malleable iron
- **Advantage**: Chips break easily (short, powdery)
- **Challenge**: Abrasive, wears tools fast
- **Typical Vc**: 200-400 m/min

### N — Non-Ferrous (Green)
- Aluminum (6061, 7075, 2024), brass, copper, zinc
- **Advantage**: Easy to cut, high speeds possible
- **Challenge**: Aluminum sticks to tools (built-up edge)
- **Key rule**: Use sharp, polished, uncoated or DLC-coated tools
- **Typical Vc**: 300-1000+ m/min

### S — Heat Resistant / Titanium (Brown)
- Titanium (Ti-6Al-4V), Inconel (718, 625), Waspaloy, Hastelloy
- **Challenge**: Low thermal conductivity — heat stays at the tool tip
- **Key rule**: Lower speeds, high feed, lots of coolant
- **Typical Vc**: 30-60 m/min (titanium), 15-30 m/min (Inconel)

### H — Hardened Steel (Gray)
- Steel above 45 HRC (after heat treatment)
- **Challenge**: Extremely abrasive, generates huge forces
- **Key rule**: Use CBN or ceramic inserts, light cuts, high speed
- **Typical Vc**: 100-200 m/min (CBN)`,
      },
    ],
    keyFormulas: ["kienzle", "taylor"],
  },
];

// ═══════════════════════════════════════════════════════════
// Module 6: Speeds & Feeds Concept
// ═══════════════════════════════════════════════════════════

const mod6Lessons: Lesson[] = [
  {
    id: `${COURSE_ID}-mod-6-les-1`,
    moduleId: `${COURSE_ID}-mod-6`,
    title: "Speed and Feed — The Two Numbers That Matter Most",
    order: 1,
    content: [
      {
        type: "text",
        body: `# Speeds & Feeds — The Concept

These are the two most important numbers in machining. Get them right and you'll make good parts with long tool life. Get them wrong and you'll break tools, ruin parts, or waste time.

## Speed = How Fast the Tool Spins (RPM)

The spindle speed determines how fast the cutting edge moves through the material.

**Surface Speed (Vc)** — the actual velocity at the tool's outer edge, in m/min or SFM.

$$RPM = \\frac{Vc \\times 1000}{\\pi \\times D}$$

- Higher speed = faster cutting, more heat
- Every material has an optimal speed range
- Too fast → tool overheats and dies
- Too slow → poor finish, inefficient

## Feed = How Fast the Tool Advances

**Feed per tooth (fz)** — how much each flute bites per revolution. Think of it as "chip thickness."

$$Vf = fz \\times z \\times RPM$$

- Higher feed = faster cycle time, more force
- Too high → tool breaks, poor finish
- Too low → rubbing instead of cutting (bad for tool life!)

## The Balance

Speed and feed work together:
- **High speed + low feed** = finishing (smooth surface)
- **Low speed + high feed** = roughing (fast material removal)
- **Both too high** = tool failure
- **Both too low** = wasting time and money

## The Golden Rule

**Never rub.** The tool must always be cutting, not rubbing. Rubbing creates heat without removing material, which destroys the tool.`,
      },
      {
        type: "calculator",
        title: "RPM Calculator",
        calculatorConfig: {
          engine: "SpeedFeedOrchestratorEngine",
          inputFields: ["cutting_speed", "tool_diameter"],
          outputFields: ["rpm", "feed_rate"],
          defaults: { cutting_speed: 200, tool_diameter: 12 },
        },
      },
    ],
    keyFormulas: ["rpm_from_vc", "feed_rate"],
  },
];

// ═══════════════════════════════════════════════════════════
// Modules 7-12: Drawings, Surface Finish, Tolerances,
// Workholding, Coolant, Safety
// ═══════════════════════════════════════════════════════════

const mod7Lessons: Lesson[] = [{
  id: `${COURSE_ID}-mod-7-les-1`,
  moduleId: `${COURSE_ID}-mod-7`,
  title: "Reading Engineering Drawings",
  order: 1,
  content: [{
    type: "text",
    body: `# Reading Engineering Drawings

## The 3 Views
Most drawings show the part from 3 directions:
- **Front view** — what you see looking straight at it
- **Top view** — looking down from above
- **Right side view** — looking from the right

## Key Symbols
- **⌀** — diameter (⌀25.0 = 25mm diameter)
- **R** — radius (R5.0 = 5mm radius)
- **±** — tolerance (25.0 ±0.1 = between 24.9 and 25.1)
- **▽** — surface finish symbol
- **⊕** — positional tolerance (GD&T)

## Dimensions to Look For First
1. **Overall size** — X × Y × Z of the raw stock needed
2. **Critical tolerances** — the tightest dimensions (these drive your process)
3. **Surface finish requirements** — which surfaces need to be smooth
4. **Material callout** — what material (usually in the title block)
5. **Quantity** — how many parts to make

## Title Block (Bottom Right)
Contains: part name, part number, material, scale, drawn by, revision, tolerances (general).

## Common Mistakes
- Misreading diameter for radius (⌀25 ≠ R25)
- Missing a hidden line (dashed = feature behind the view)
- Ignoring general tolerances in the title block
- Not checking the revision letter (old drawings = wrong part)`,
  }],
}];

const mod8Lessons: Lesson[] = [{
  id: `${COURSE_ID}-mod-8-les-1`,
  moduleId: `${COURSE_ID}-mod-8`,
  title: "Surface Finish — What Ra Really Means",
  order: 1,
  content: [{
    type: "text",
    body: `# Surface Finish

## What is Ra?
**Ra** (Roughness Average) is the average height of the peaks and valleys on a surface, measured in **micrometers (µm)** or **microinches (µin)**.

- **Ra 0.4 µm** (16 µin) — mirror-like, ground surface
- **Ra 0.8 µm** (32 µin) — fine machined finish
- **Ra 1.6 µm** (63 µin) — standard machined finish
- **Ra 3.2 µm** (125 µin) — rough machined finish
- **Ra 6.3 µm** (250 µin) — as-milled rough surface

## What Affects Surface Finish?

### Feed Rate (Biggest Factor)
$$Ra \\approx \\frac{f^2}{32 \\times r_\\epsilon}$$

Lower feed = smoother surface. This is the #1 knob to turn.

### Nose Radius (Second Biggest)
Larger nose radius = smoother surface (but needs more force).

### Other Factors
- **Speed** — higher speed generally improves finish
- **Tool sharpness** — worn tools make rough surfaces
- **Rigidity** — vibration = chatter marks
- **Coolant** — proper coolant improves finish 10-20%

## Conversion: µm ↔ µin
**1 µm = 39.37 µin** (multiply µm × 40 for quick estimate)`,
  }],
  keyFormulas: ["surface_finish"],
}];

const mod9Lessons: Lesson[] = [{
  id: `${COURSE_ID}-mod-9-les-1`,
  moduleId: `${COURSE_ID}-mod-9`,
  title: "Tolerances — How Close is Close Enough?",
  order: 1,
  content: [{
    type: "text",
    body: `# Tolerances

## What is a Tolerance?
The **allowed variation** from the nominal dimension. No machined part is ever perfect — tolerances define "good enough."

## Types of Tolerances

### Bilateral (±)
25.0 **±0.1** means acceptable range: 24.9 to 25.1
- Equal both directions

### Unilateral
25.0 **+0.1/-0.0** means acceptable range: 25.0 to 25.1
- Only one direction allowed

### Limit Dimensions
**25.1 / 24.9** — upper and lower limits stated directly

## Typical Machining Capabilities

| Process | Typical Tolerance |
|---------|-------------------|
| Rough milling | ±0.25 mm (±0.010") |
| Finish milling | ±0.05 mm (±0.002") |
| Precision milling | ±0.025 mm (±0.001") |
| Turning | ±0.025 mm (±0.001") |
| Grinding | ±0.005 mm (±0.0002") |
| Honing/Lapping | ±0.001 mm (±0.00004") |

## The Cost of Tight Tolerances
Every 10× tighter tolerance roughly **doubles the cost**:
- ±0.1mm → standard (1x cost)
- ±0.01mm → precision (2x cost)
- ±0.001mm → ultra-precision (4x+ cost)

**Golden rule**: Only specify tight tolerances where they actually matter (mating surfaces, bearing bores, seal grooves).`,
  }],
}];

const mod10Lessons: Lesson[] = [{
  id: `${COURSE_ID}-mod-10-les-1`,
  moduleId: `${COURSE_ID}-mod-10`,
  title: "Workholding — Securing the Part",
  order: 1,
  content: [{
    type: "text",
    body: `# Workholding

## Why It Matters
If the part moves during cutting, you get a scrapped part (or worse — a crash). Good workholding is rigid, repeatable, and accessible.

## Common Workholding Methods

### Vise (Most Common for Milling)
- Kurt-style 6" vise on the table
- Holds rectangular/square stock
- Quick setup, good rigidity
- **Jaw pressure**: 2,000-10,000 lbs depending on size
- **Tip**: Use parallels under the part for Z-height consistency

### Chuck (Lathes)
- 3-jaw (self-centering) — for round stock
- 4-jaw (independent) — for irregular shapes
- Collet chuck — for small, precise work
- **Tip**: Don't overtighten — you'll distort the part

### Fixture Plate
- Threaded holes on a grid pattern
- Clamp parts with toe clamps, strap clamps
- Best for: production runs, complex shapes

### Vacuum Table
- Suction holds flat parts down
- Best for: thin sheet material, large flat parts
- **Limitation**: low holding force, not for heavy cuts

### Magnetic Chuck (Grinding)
- Electromagnetic or permanent magnet
- Best for: flat ferrous parts on surface grinders

## The 3-2-1 Principle
- **3 points** on the primary plane (bottom)
- **2 points** on the secondary plane (back)
- **1 point** on the tertiary plane (side)
This fully constrains the part in 6 degrees of freedom.`,
  }],
}];

const mod11Lessons: Lesson[] = [{
  id: `${COURSE_ID}-mod-11-les-1`,
  moduleId: `${COURSE_ID}-mod-11`,
  title: "Coolant — Keeping Things Cool",
  order: 1,
  content: [{
    type: "text",
    body: `# Coolant Basics

## Why Coolant?
1. **Cooling** — reduces heat at the cutting zone
2. **Lubrication** — reduces friction between tool and chip
3. **Chip evacuation** — flushes chips away from the cut
4. **Corrosion prevention** — protects machine and part surfaces

## Types of Coolant

### Flood Coolant (Most Common)
- Water-soluble oil mixed at 5-10% concentration
- Delivered through nozzles aimed at the cutting zone
- Best general-purpose cooling

### MQL (Minimum Quantity Lubrication)
- Tiny amount of oil mist (5-50 mL/hr)
- Less mess, lower cost, environmentally friendly
- Works well for aluminum and steel at moderate speeds

### Through-Spindle Coolant (TSC)
- Coolant pumped through the tool itself
- Essential for deep holes (gun drilling, deep pockets)
- Pressure: 300-1000+ PSI

### Dry Machining
- No coolant at all
- Works for: cast iron, some steels with TiAlN-coated tools
- Advantage: no cleanup, no coolant disposal cost
- Disadvantage: shorter tool life, higher temperatures

### Cryogenic (LN2 / CO2)
- Liquid nitrogen or CO2 snow at the cutting zone
- For: titanium, Inconel, superalloys
- Extends tool life 2-5× vs flood coolant

## Concentration Matters
- **Too low** (<3%) → rust, bacteria growth, poor lubrication
- **Too high** (>12%) → skin irritation, foaming, wasted money
- **Check weekly** with a refractometer (takes 10 seconds)`,
  }],
}];

const mod12Lessons: Lesson[] = [{
  id: `${COURSE_ID}-mod-12-les-1`,
  moduleId: `${COURSE_ID}-mod-12`,
  title: "Shop Safety — The Non-Negotiables",
  order: 1,
  content: [{
    type: "text",
    body: `# Shop Safety

## The Non-Negotiables (Violate = Sent Home)

1. **Safety glasses** — worn AT ALL TIMES on the shop floor
2. **No loose clothing** — ties, scarves, loose sleeves get caught in spindles
3. **No gloves near rotating machinery** — gloves catch and pull your hand in
4. **Closed-toe shoes** — steel-toe preferred
5. **Long hair tied back** — same reason as loose clothing
6. **Never reach into a running machine** — wait for full stop

## Before Starting Any Machine

1. Check the work area for loose tools, rags, parts
2. Verify the workpiece is secure (pull-test on clamps)
3. Check tool is tight in holder (torque wrench for ER collets)
4. Verify coolant level and concentration
5. Close all doors and guards
6. Run the program in single-block or dry-run first

## Chip Handling
- **Never use your hands** to clear chips — use a brush or air
- Hot chips can burn (steel chips reach 400-600°C)
- Long stringy chips are razor-sharp — wear leather gloves ONLY when machine is OFF
- Chip augers and conveyors: keep hands clear

## Emergency Procedures
- **E-STOP** (big red button) — know where it is on every machine you use
- **Feed Hold** — pauses motion but spindle keeps running
- **Fire** — coolant fires are rare but real; know where the extinguisher is
- **Injury** — report immediately, no matter how minor

## Ergonomics
- Lift with your legs, not your back
- Heavy vises and fixtures: use a hoist or ask for help
- Standing all day: anti-fatigue mats, supportive footwear
- Noise: wear hearing protection near grinding or high-speed machining

## The #1 Rule
**If you're unsure, stop and ask.** No part is worth an injury.`,
  }],
}];

const mod13Lessons: Lesson[] = [{
  id: `${COURSE_ID}-m13-l1`, moduleId: `${COURSE_ID}-mod-13`,
  title: "Citation Discipline — Manufacturing Standards", order: 1,
  content: [{
    type: "text",
    body: `# Citation Discipline — Manufacturing Standards

**Prerequisite:** Modules 1-12 of this course.
**Learning objective:** For every safety rule, machine spec, and process step you'll execute, identify the governing standard. Manufacturing is regulated by OSHA, ISO, and ANSI — your work has to map to them.
**Assessment:** Pick one machine in your shop. Identify the safety standard it conforms to + the inspection record.

## Why Manufacturing Needs Cited Standards

A machinist who can't cite the safety standard their guarding meets is a machinist who can't defend a near-miss investigation. A shop that can't cite which G-code standard its posts target can't onboard a new controller. Standards are the language between operator, programmer, supplier, and regulator.

## The Citation Pattern (Manufacturing Variant)

\`<claim/rule/spec> [per <standard>, <issuing body>, <revision>, <clause>]\`

Cited claims revisiting modules of THIS course:

- **"Machine guarding required on rotating spindles"** [per OSHA 29 CFR 1910.212(a)(1), *General requirements for all machines* — US Department of Labor; subpart O.]
- **"Hearing protection above 85 dBA TWA"** [per OSHA 29 CFR 1910.95, *Occupational noise exposure* — DoL.]
- **"Lockout/Tagout for service & maintenance"** [per OSHA 29 CFR 1910.147, *The control of hazardous energy* — DoL.]
- **"G-code program structure"** [per ISO 6983-1:2009, *Automation systems and integration — Numerical control of machines — Program format and definitions of address words* — ISO; clause 4.]
- **"Machine-tool accuracy test methods"** [per ISO 230-1:2012, *Test code for machine tools — Part 1: Geometric accuracy of machines* — ISO; or ASME B5.54 for US.]
- **"Manual machine guarding"** [per ANSI B11.6-2001 (R2007), *Manual Turning Machines (Lathes) with or without Automatic Control* — issuing body: ANSI / AMT.]
- **"ISO material groups P/M/K/N/S/H"** [per ISO 513:2012, *Classification and application of hard cutting materials* — ISO. PRISM kc1.1 values per group live in \`mcp-server/src/physics/constants.ts\` (do not inline).]

## Doctrine vs Technique vs Reference (Shop-Floor Lens)

| Category | In manufacturing | Examples |
|----------|-----------------|----------|
| **Doctrine** | Safety rules. Never optional. | OSHA LOTO before service · machine-guard interlocks · no gloves near rotating spindle |
| **Technique** | Operator/programmer procedures. | Setting work-zero · running a dry-cycle · debugging a post |
| **Reference** | Standards + machine-specific docs. | ISO 6983 G-code syntax · controller manual · OEM probing manual |

## The Audit Failure Mode

An OSHA inspection finds an unguarded belt drive on a manual mill. The shop's defense is "we've never had an incident" — irrelevant. The inspection cites 29 CFR 1910.212. The fine + retrofit + downtime costs an order of magnitude more than the original guard would have. **Rule: if you can't cite the standard your machine meets, assume it doesn't.**

## Practice (Assessment)

For the machine you operate most:

1. Locate the **safety conformance label** (CE, ANSI/AMT B11, ISO).
2. Find the **G-code standard** the post-processor targets (vendor manual, usually ISO 6983 + vendor extensions).
3. Check the **last machine accuracy test** date (per ISO 230 / ASME B5.54).
4. Verify your **LOTO procedure** is documented and posted (29 CFR 1910.147).

If any is missing → escalate to maintenance / safety officer. An uncited machine is operating on luck.`,
  }],
}];

// ═══════════════════════════════════════════════════════════
// Quiz Questions — Per Module
// ═══════════════════════════════════════════════════════════

export const COURSE_1_QUIZZES: Record<string, Question[]> = {
  "course-1-mod-1-quiz": [
    {
      id: "c1-m1-q1", type: "multiple_choice", difficulty: 1,
      text: "What does CNC stand for?",
      options: [
        { id: "a", text: "Computer Numerical Control", isCorrect: true },
        { id: "b", text: "Computer Network Configuration", isCorrect: false },
        { id: "c", text: "Controlled Numeric Cutting", isCorrect: false },
        { id: "d", text: "Central Numerical Computer", isCorrect: false },
      ],
      explanation: "CNC = Computer Numerical Control",
      tags: ["basics"],
    },
    {
      id: "c1-m1-q2", type: "multiple_choice", difficulty: 1,
      text: "In milling, what rotates?",
      options: [
        { id: "a", text: "The workpiece", isCorrect: false },
        { id: "b", text: "The cutting tool", isCorrect: true },
        { id: "c", text: "Both", isCorrect: false },
        { id: "d", text: "Neither", isCorrect: false },
      ],
      explanation: "In milling, the tool rotates. In turning, the workpiece rotates.",
      tags: ["machine_types"],
    },
  ],
  "course-1-mod-3-quiz": [
    {
      id: "c1-m3-q1", type: "multiple_choice", difficulty: 1,
      text: "On a vertical mill, which axis moves the spindle up and down?",
      options: [
        { id: "a", text: "X", isCorrect: false },
        { id: "b", text: "Y", isCorrect: false },
        { id: "c", text: "Z", isCorrect: true },
        { id: "d", text: "A", isCorrect: false },
      ],
      explanation: "Z is always the spindle axis. On a VMC, Z moves up/down.",
      tags: ["coordinates", "axes"],
    },
    {
      id: "c1-m3-q2", type: "multiple_choice", difficulty: 2,
      text: "What is the difference between G90 and G91?",
      options: [
        { id: "a", text: "G90 = absolute positioning, G91 = incremental positioning", isCorrect: true },
        { id: "b", text: "G90 = metric, G91 = imperial", isCorrect: false },
        { id: "c", text: "G90 = rapid, G91 = feed", isCorrect: false },
        { id: "d", text: "G90 = spindle on, G91 = spindle off", isCorrect: false },
      ],
      explanation: "G90 = absolute (relative to work zero), G91 = incremental (relative to current position).",
      tags: ["coordinates", "gcode"],
    },
  ],
  "course-1-mod-5-quiz": [
    {
      id: "c1-m5-q1", type: "multiple_choice", difficulty: 1,
      text: "Which ISO group does aluminum belong to?",
      options: [
        { id: "a", text: "P (Steel)", isCorrect: false },
        { id: "b", text: "M (Stainless)", isCorrect: false },
        { id: "c", text: "K (Cast Iron)", isCorrect: false },
        { id: "d", text: "N (Non-Ferrous)", isCorrect: true },
      ],
      explanation: "Aluminum is ISO group N (Non-Ferrous), along with brass, copper, and zinc.",
      tags: ["material", "iso_group"],
    },
    {
      id: "c1-m5-q2", type: "multiple_choice", difficulty: 2,
      text: "Why is stainless steel harder to machine than carbon steel?",
      options: [
        { id: "a", text: "It's always harder", isCorrect: false },
        { id: "b", text: "It work-hardens when rubbed instead of cut", isCorrect: true },
        { id: "c", text: "It melts at a lower temperature", isCorrect: false },
        { id: "d", text: "It's magnetic", isCorrect: false },
      ],
      explanation: "Stainless steel work-hardens. If the tool rubs instead of cuts, the surface gets harder, making subsequent passes even harder.",
      tags: ["material", "stainless", "work_hardening"],
    },
  ],
  "course-1-mod-6-quiz": [
    {
      id: "c1-m6-q1", type: "calculation", difficulty: 2,
      text: "Calculate the RPM for a 10mm end mill at 200 m/min surface speed.\n\nFormula: RPM = (Vc × 1000) / (π × D)",
      correctAnswer: 6366,
      tolerance: 2,
      explanation: "RPM = (200 × 1000) / (3.14159 × 10) = 200000 / 31.42 ≈ 6366",
      tags: ["speed_feed", "rpm"],
    },
    {
      id: "c1-m6-q2", type: "multiple_choice", difficulty: 1,
      text: "What happens if you machine too slowly (both speed and feed too low)?",
      options: [
        { id: "a", text: "Perfect finish, long tool life", isCorrect: false },
        { id: "b", text: "The tool rubs instead of cuts, reducing tool life", isCorrect: true },
        { id: "c", text: "The machine overheats", isCorrect: false },
        { id: "d", text: "Nothing bad — slower is always safer", isCorrect: false },
      ],
      explanation: "Too slow = rubbing, not cutting. Rubbing creates heat without removing material, which destroys the cutting edge.",
      tags: ["speed_feed", "rubbing"],
    },
  ],
  "course-1-mod-12-quiz": [
    {
      id: "c1-m12-q1", type: "multiple_choice", difficulty: 1,
      text: "When is it safe to wear gloves near a CNC machine?",
      options: [
        { id: "a", text: "When handling heavy parts with the spindle stopped", isCorrect: true },
        { id: "b", text: "When the machine is running at low RPM", isCorrect: false },
        { id: "c", text: "Always — gloves protect your hands", isCorrect: false },
        { id: "d", text: "Never — gloves are banned in all shops", isCorrect: false },
      ],
      explanation: "Gloves near rotating machinery are dangerous — they can catch and pull your hand in. Only wear gloves when the machine is fully stopped.",
      tags: ["safety"],
    },
  ],
  "course-1-mod-13-quiz": [
    {
      id: "c1-m13-q1", type: "multiple_choice", difficulty: 2,
      text: "An OSHA inspector asks for the standard your machine-guarding conforms to. You can't produce a citation. What is the most defensible response?",
      options: [
        { id: "a", text: "Argue 'we've never had an incident here'", isCorrect: false,
          explanation: "Incident-free history is not a defense against an unguarded-machinery citation under 29 CFR 1910.212." },
        { id: "b", text: "Document the gap, retrofit per ANSI B11 series, and update the safety register", isCorrect: true },
        { id: "c", text: "Pull the machine out of service permanently", isCorrect: false,
          explanation: "Over-correction — retrofit + documentation is the proportional response." },
        { id: "d", text: "Argue the machine is too old to require guarding", isCorrect: false,
          explanation: "OSHA's general duty clause + 1910.212 apply regardless of machine age." },
      ],
      explanation: "Citation: 29 CFR 1910.212(a)(1) requires guarding on all machines; ANSI B11 series gives the technical retrofit standards. The right move is documented retrofit, not denial.",
      tags: ["citation_discipline", "osha", "machine_guarding"],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// Module Assembly
// ═══════════════════════════════════════════════════════════

export const COURSE_1_MODULES: Module[] = [
  { id: `${COURSE_ID}-mod-1`, courseId: COURSE_ID, title: "What is CNC Machining?", description: "The big picture — from raw stock to finished part", order: 1, lessons: mod1Lessons, quiz: { id: `${COURSE_ID}-mod-1-quiz`, moduleId: `${COURSE_ID}-mod-1`, questions: COURSE_1_QUIZZES[`${COURSE_ID}-mod-1-quiz`] ?? [], passingScore: 70 }, estimatedMinutes: 30 },
  { id: `${COURSE_ID}-mod-2`, courseId: COURSE_ID, title: "Machine Types", description: "VMC, HMC, lathe, 5-axis, EDM, grinder — what each does", order: 2, lessons: mod2Lessons, quiz: { id: `${COURSE_ID}-mod-2-quiz`, moduleId: `${COURSE_ID}-mod-2`, questions: [], passingScore: 70 }, estimatedMinutes: 40 },
  { id: `${COURSE_ID}-mod-3`, courseId: COURSE_ID, title: "Coordinate Systems", description: "X, Y, Z — absolute vs incremental, machine vs work zero", order: 3, lessons: mod3Lessons, quiz: { id: `${COURSE_ID}-mod-3-quiz`, moduleId: `${COURSE_ID}-mod-3`, questions: COURSE_1_QUIZZES[`${COURSE_ID}-mod-3-quiz`] ?? [], passingScore: 70 }, estimatedMinutes: 45 },
  { id: `${COURSE_ID}-mod-4`, courseId: COURSE_ID, title: "Cutting Tool Anatomy", description: "Flutes, helix, coating, HSS vs carbide — know your tools", order: 4, lessons: mod4Lessons, quiz: { id: `${COURSE_ID}-mod-4-quiz`, moduleId: `${COURSE_ID}-mod-4`, questions: [], passingScore: 70 }, estimatedMinutes: 50 },
  { id: `${COURSE_ID}-mod-5`, courseId: COURSE_ID, title: "Material Basics", description: "The 6 ISO groups — steel, stainless, cast iron, aluminum, titanium, hardened", order: 5, lessons: mod5Lessons, quiz: { id: `${COURSE_ID}-mod-5-quiz`, moduleId: `${COURSE_ID}-mod-5`, questions: COURSE_1_QUIZZES[`${COURSE_ID}-mod-5-quiz`] ?? [], passingScore: 70 }, estimatedMinutes: 40 },
  { id: `${COURSE_ID}-mod-6`, courseId: COURSE_ID, title: "Speeds & Feeds Concept", description: "RPM, feed rate, chip load — the two numbers that matter most", order: 6, lessons: mod6Lessons, quiz: { id: `${COURSE_ID}-mod-6-quiz`, moduleId: `${COURSE_ID}-mod-6`, questions: COURSE_1_QUIZZES[`${COURSE_ID}-mod-6-quiz`] ?? [], passingScore: 70 }, estimatedMinutes: 50 },
  { id: `${COURSE_ID}-mod-7`, courseId: COURSE_ID, title: "Reading Engineering Drawings", description: "3 views, dimensions, tolerances, title block — read any print", order: 7, lessons: mod7Lessons, quiz: { id: `${COURSE_ID}-mod-7-quiz`, moduleId: `${COURSE_ID}-mod-7`, questions: [], passingScore: 70 }, estimatedMinutes: 45 },
  { id: `${COURSE_ID}-mod-8`, courseId: COURSE_ID, title: "Surface Finish", description: "Ra, Rz — what the numbers mean and how to achieve them", order: 8, lessons: mod8Lessons, quiz: { id: `${COURSE_ID}-mod-8-quiz`, moduleId: `${COURSE_ID}-mod-8`, questions: [], passingScore: 70 }, estimatedMinutes: 35 },
  { id: `${COURSE_ID}-mod-9`, courseId: COURSE_ID, title: "Tolerances", description: "Bilateral, unilateral, limits — and why tight tolerances cost more", order: 9, lessons: mod9Lessons, quiz: { id: `${COURSE_ID}-mod-9-quiz`, moduleId: `${COURSE_ID}-mod-9`, questions: [], passingScore: 70 }, estimatedMinutes: 35 },
  { id: `${COURSE_ID}-mod-10`, courseId: COURSE_ID, title: "Workholding", description: "Vise, chuck, fixtures, vacuum, 3-2-1 principle", order: 10, lessons: mod10Lessons, quiz: { id: `${COURSE_ID}-mod-10-quiz`, moduleId: `${COURSE_ID}-mod-10`, questions: [], passingScore: 70 }, estimatedMinutes: 40 },
  { id: `${COURSE_ID}-mod-11`, courseId: COURSE_ID, title: "Coolant Basics", description: "Flood, MQL, through-spindle, cryogenic — when and why", order: 11, lessons: mod11Lessons, quiz: { id: `${COURSE_ID}-mod-11-quiz`, moduleId: `${COURSE_ID}-mod-11`, questions: [], passingScore: 70 }, estimatedMinutes: 30 },
  { id: `${COURSE_ID}-mod-12`, courseId: COURSE_ID, title: "Shop Safety", description: "PPE, machine guards, chip handling, emergency procedures", order: 12, lessons: mod12Lessons, quiz: { id: `${COURSE_ID}-mod-12-quiz`, moduleId: `${COURSE_ID}-mod-12`, questions: COURSE_1_QUIZZES[`${COURSE_ID}-mod-12-quiz`] ?? [], passingScore: 70 }, estimatedMinutes: 30 },
  { id: `${COURSE_ID}-mod-13`, courseId: COURSE_ID, title: "Citation Discipline — Manufacturing Standards", description: "OSHA/ISO/ANSI citations for every safety rule and machine spec", order: 13, lessons: mod13Lessons, quiz: { id: `${COURSE_ID}-mod-13-quiz`, moduleId: `${COURSE_ID}-mod-13`, questions: COURSE_1_QUIZZES[`${COURSE_ID}-mod-13-quiz`] ?? [], passingScore: 70 }, estimatedMinutes: 35 },
];
