/**
 * L1 Operator Courses: L1-01 through L1-10
 * Level: Novice/Operator | 10 courses | ~70 hours total
 *
 * Prerequisite: All L0 courses complete.
 * Covers hands-on CNC operation: setup, speeds/feeds, G-code,
 * milling, turning, coolant, quality, troubleshooting, safety.
 */

import type { Module, Lesson, Question } from
  "../../engines/CurriculumEngine.js";

// ═══════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════

function mkModule(
  courseId: string, idx: number, title: string,
  lessons: Lesson[], quizzes: Record<string, Question[]>,
  courseName: string, minutes: number,
): Module {
  return {
    id: `${courseId}-mod-${idx}`, courseId, title,
    description: `${title} — ${courseName}`, order: idx,
    lessons,
    quiz: {
      id: `${courseId}-mod-${idx}-quiz`,
      moduleId: `${courseId}-mod-${idx}`,
      questions: quizzes[`${courseId}-mod-${idx}-quiz`] ?? [],
      passingScore: 75,
    },
    estimatedMinutes: minutes,
  };
}

// ═══════════════════════════════════════════════════════════
// L1-01: CNC Machine Setup (8 modules, ~8 hours)
// ═══════════════════════════════════════════════════════════
const C01 = "L1-01";

const c01m1: Lesson[] = [{
  id: `${C01}-m1-l1`, moduleId: `${C01}-mod-1`,
  title: "Work Coordinate Systems", order: 1,
  content: [{
    type: "text",
    body: `# Work Coordinate Systems

## Three Zeros You Must Understand

| Zero | What It Is | Set By |
|------|-----------|--------|
| **Machine Zero** | Fixed origin defined by home switches | Machine builder — never changes |
| **Work Zero** | Your part datum (where the program measures from) | YOU set this in G54-G59 |
| **Program Zero** | Where the CAM programmer placed the origin | Defined in the CAM software |

Work zero and program zero MUST match. If the CAM programmer put the origin on the top-left corner of the part, YOUR G54 must be set at the top-left corner of the physical part.

## G54 through G59 — Six Work Offsets

Each offset stores an X, Y, Z position (distance from machine zero to work zero):

| Offset | Typical Use |
|--------|------------|
| G54 | Primary setup (most common — 90% of jobs use G54) |
| G55 | Second setup or second vise |
| G56-G59 | Additional setups, fixtures, or tombstone faces |
| G54.1 P1-P48 | Extended offsets (48 more!) for pallet systems |

## Setting G54 on Fanuc/Haas

1. Jog the tool to the part datum (edge or corner)
2. Press **OFFSET** → **Work** tab → highlight G54
3. For X: touch the X edge with an edge finder, enter the value, press **MEASURE**
4. For Y: repeat on Y edge
5. For Z: touch the top face, press **MEASURE** for Z
6. The controller stores the machine coordinates of your part zero`,
  }],
  prismEngines: ["MachineSetupEngine"],
}];

const c01m2: Lesson[] = [{
  id: `${C01}-m2-l1`, moduleId: `${C01}-mod-2`,
  title: "Setting Work Offsets", order: 1,
  content: [{
    type: "text",
    body: `# Setting Work Offsets — Methods

## Method 1: Edge Finder (Mechanical)

A spinning edge finder deflects when it touches the part edge:
1. Spin the edge finder at 500-1000 RPM
2. Slowly jog X or Y until the edge finder "kicks" (deflects sideways)
3. The tool center is now exactly one edge-finder radius from the edge
4. Record the machine position, add/subtract the edge finder radius

**Accuracy: ±0.01mm** — good enough for most work.

## Method 2: Dial Indicator

For higher precision or finding the center of existing features:
1. Mount an indicator in the spindle
2. Sweep the feature (bore, edge, slot)
3. Adjust position until indicator reads zero all the way around
4. Record the machine position

**Accuracy: ±0.005mm or better.**

## Method 3: Touch Probe (Renishaw, Blum)

Automated probing — the gold standard:
1. Machine runs a probing cycle (G65 P9xxx or equivalent)
2. Probe touches the part at programmed locations
3. Controller automatically calculates and sets work offset
4. **Accuracy: ±0.002mm**, and no operator variation

## Common Mistakes

- **Forgetting the edge finder radius** — your X/Y will be off by half the edge finder diameter
- **Setting Z on a chip** — always clean the surface before touching off Z
- **Wrong offset number** — setting G55 when the program calls G54`,
  }],
}];

const c01m3: Lesson[] = [{
  id: `${C01}-m3-l1`, moduleId: `${C01}-mod-3`,
  title: "Tool Length Compensation", order: 1,
  content: [{
    type: "text",
    body: `# Tool Length Compensation (G43)

## Why Every Tool Needs a Z Offset

Each tool in the magazine is a different length. The controller needs to know how far each tool sticks out so it can position the tip correctly.

**G43 H__ Z__** activates tool length compensation:
- **G43** = enable tool length compensation (positive direction)
- **H__** = offset number (usually matches tool number: H01 for T01)
- **Z__** = commanded Z position (the controller adds/subtracts the offset)

## How to Set Tool Length Offsets

### Method 1: Touch-Off at Machine
1. Load tool T01, jog Z down until it touches a reference surface (part top or gauge block)
2. Press OFFSET → Tool Offset → enter current machine Z → MEASURE
3. Repeat for every tool in the magazine

### Method 2: Tool Length Presetter
- An off-machine device that measures each tool's length optically
- Enter the measured values into the offset table
- **Faster** (don't tie up the machine) and **more accurate** (±0.002mm)

### Method 3: Automatic Tool Length Measurement
- A fixed probe on the machine table (Renishaw TS27R, Blum Z-Nano)
- Machine runs a macro: tool touches the probe, offset is set automatically
- **Best for production** — no operator involvement

## Safety Rule

**ALWAYS verify tool length offsets on the first tool change.** A wrong offset means the tool is at the wrong Z — it can crash into the part, vise, or table.`,
  }],
}];

const c01m4: Lesson[] = [{
  id: `${C01}-m4-l1`, moduleId: `${C01}-mod-4`,
  title: "Tool Diameter Compensation", order: 1,
  content: [{
    type: "text",
    body: `# Tool Diameter Compensation (G41/G42)

## When You Need It

When programming a contour (outside or inside profile), the tool center must be offset from the part wall by the tool radius. **Cutter comp** does this automatically.

- **G41** = Cutter comp LEFT (tool is left of the programmed path looking in the feed direction)
- **G42** = Cutter comp RIGHT (tool is right)
- **G40** = Cancel cutter comp

## How It Works

1. Program the exact part geometry (the wall you want)
2. The controller offsets the tool center by the value in the D register
3. If the tool is a 12mm end mill, D = 6.0mm (radius)

## Entry and Exit Moves

You CANNOT turn on G41/G42 while already cutting. You need a **lead-in move**:
\`\`\`gcode
G41 D01          (activate comp)
G01 X10. Y-5. F500 (lead-in move — approach from outside)
G01 X10. Y0.     (now cutting the contour)
...
G40              (cancel comp after lead-out)
\`\`\`

## Why Use It?

- **Wear adjustment**: As the tool wears, increase D slightly to maintain size
- **Finishing stock**: Program 0.1mm oversize in D for roughing, then true size for finishing
- **Tool swap**: Switch from 12mm to 10mm end mill — just change D, no reprogram`,
  }],
}];

const c01m5: Lesson[] = [{
  id: `${C01}-m5-l1`, moduleId: `${C01}-mod-5`,
  title: "First Article Process", order: 1,
  content: [{
    type: "text",
    body: `# First Article Process

## The Golden Rule: Verify Before You Run

The first part off a new setup gets 100% inspection. Every dimension measured. Every feature checked.

## Step-by-Step

1. **Reduce feed override to 25-50%** — watch and listen for the first cut
2. **Single-block the first few lines** — verify tool changes, rapids are safe
3. **Let it run** (at reduced override) through the complete program
4. **Remove the part** — do NOT run a second part yet
5. **Measure EVERYTHING** on the first article:
   - All dimensions on the print
   - Surface finish on critical surfaces
   - Thread gauges on all threaded holes
   - Deburr check (no sharp edges)
6. **Record results** on a First Article Inspection (FAI) report
7. **Compare to print tolerances** — every dimension must be in spec
8. **Adjust offsets** if any dimension is off:
   - Oversize? Reduce tool wear offset
   - Undersize? Increase tool wear offset
   - Positional error? Adjust work offset
9. **Run a second part** and re-measure critical dimensions
10. **Sign off** — both operator and lead/supervisor approve

## What Kills First Articles

- Wrong tool loaded in wrong pocket
- Work offset set to wrong surface
- Tool length offset not verified
- Program not verified (dry run skipped)
- Material hardness different from expected`,
  }],
}];

const c01m6: Lesson[] = [{
  id: `${C01}-m6-l1`, moduleId: `${C01}-mod-6`,
  title: "Fixture Offsets & Probing", order: 1,
  content: [{
    type: "text",
    body: `# Fixture Offsets & Probing

## Extended Work Offsets (G54.1)

When G54-G59 aren't enough (multi-vise, pallet, tombstone):
- **G54.1 P1** through **G54.1 P48** — 48 additional work offsets
- Same as G54: stores X, Y, Z distances from machine zero
- Essential for tombstone setups (4 faces × 4 parts = 16 offsets)

## Touch Probe Cycles

Probes (Renishaw OMP40/60, Blum TC76) automate work offset setting:

| Cycle | What It Does |
|-------|-------------|
| **Single surface** | Touch one face, set one axis offset |
| **Web (boss) center** | Touch both sides of a boss, find center X or Y |
| **Bore center** | Touch inside a bore at 4 points, find center X/Y |
| **Corner** | Touch two perpendicular faces, set X and Y |
| **Angle** | Touch two points on a surface, calculate rotation |

## Why Probing Wins

| Method | Time | Accuracy | Operator Skill |
|--------|------|---------|---------------|
| Edge finder | 5-10 min | ±0.01mm | High |
| Indicator | 10-20 min | ±0.005mm | Very high |
| Touch probe | 30-60 sec | ±0.002mm | Low (automated) |

Probing pays for itself in setup time reduction on the first month.`,
  }],
}];

const c01m7: Lesson[] = [{
  id: `${C01}-m7-l1`, moduleId: `${C01}-mod-7`,
  title: "Machine Warm-Up", order: 1,
  content: [{
    type: "text",
    body: `# Machine Warm-Up

## Thermal Growth is Real

A cold CNC machine is NOT the same size as a warm one:
- **Spindle growth**: Bearings expand as they warm. The spindle grows 0.01-0.05mm in Z.
- **Ballscrew growth**: X/Y/Z screws expand with friction heat. Positioning shifts.
- **Workpiece growth**: Material expands as coolant heats up over the day.

## Standard Warm-Up Procedure

1. **Start coolant circulation** (10 minutes before cutting)
2. **Run spindle at operating RPM** for 15-20 minutes
3. **Exercise all axes** — full travel at rapid, 5-10 times each
4. **Re-check Z offset** after warm-up (compare to cold value)

## Real-World Impact

A shop making ±0.005mm parts saw this pattern:
- First part at 6:00 AM: 0.008mm oversize (machine cold)
- By 8:00 AM: parts are on-size (machine warm)
- After lunch (machine cooled): first part 0.005mm off again

**Solution**: 20-minute warm-up program + re-touch Z after warm-up.`,
  }],
}];

const c01m8: Lesson[] = [{
  id: `${C01}-m8-l1`, moduleId: `${C01}-mod-8`,
  title: "Setup Documentation", order: 1,
  content: [{
    type: "text",
    body: `# Setup Documentation

## The Setup Sheet

A setup sheet documents everything needed to reproduce a setup:

| Section | Contents |
|---------|----------|
| **Photo** | Picture of the actual setup (part in fixture, tools visible) |
| **Program** | Program number (O1234), revision, date |
| **Material** | Material spec, bar/plate size, heat/lot number |
| **Fixture** | Vise type, jaw type, parallels, stop position, torque |
| **Tool list** | Tool#, description, holder, stickout, offset values |
| **Work offsets** | G54 X/Y/Z values, how they were set |
| **Special notes** | "Deburr before flip", "Use 80% feed on first pass", etc. |
| **Inspection** | Critical dims to check, frequency, gauges to use |

## Why Setup Sheets Save Hours

- **Next time**: Anyone can set up this job in 30 minutes instead of 2 hours
- **Consistency**: Same setup = same results every time
- **Training**: New operators can learn from documented setups
- **Troubleshooting**: If a part is bad, the setup sheet tells you what SHOULD have been done

## Digital Setup Sheets

Modern shops use tablets/screens at each machine:
- Photos taken with a phone, attached to the job record
- Tool lists auto-generated from the CAM program
- Offset values stored in the ERP system
- Searchable by part number, material, or machine`,
  }],
}];

const C01_Q: Record<string, Question[]> = {
  [`${C01}-mod-1-quiz`]: [{
    id: "c01-q1", type: "multiple_choice", difficulty: 1,
    text: "The CAM programmer placed the origin on the top-center of the part. Where must you set G54?",
    options: [
      { id: "a", text: "At the top-center of the physical part in the machine", isCorrect: true },
      { id: "b", text: "At machine zero", isCorrect: false },
      { id: "c", text: "Anywhere — the controller calculates it", isCorrect: false },
    ],
    explanation: "Work zero (G54) must match program zero. If the program origin is top-center of the part, G54 must be physically at that same location.",
    tags: ["setup", "work_offsets"],
  }],
  [`${C01}-mod-3-quiz`]: [{
    id: "c01-q2", type: "multiple_choice", difficulty: 2,
    text: "Tool 5 is 15mm longer than Tool 1 (the reference). After a tool change to T05, G43 H05 is called. What happens?",
    options: [
      { id: "a", text: "The controller adjusts Z position by the offset stored in H05 so the tool tip is at the correct Z", isCorrect: true },
      { id: "b", text: "The spindle speed changes to match Tool 5", isCorrect: false },
      { id: "c", text: "The machine homes the Z axis", isCorrect: false },
    ],
    explanation: "G43 H05 tells the controller to apply the Z offset stored in register H05, compensating for the difference in tool length.",
    tags: ["setup", "tool_length"],
  }],
  [`${C01}-mod-5-quiz`]: [{
    id: "c01-q3", type: "multiple_choice", difficulty: 1,
    text: "You're running a first article. At what feed override should you start?",
    options: [
      { id: "a", text: "100% — run it at programmed speed", isCorrect: false },
      { id: "b", text: "25-50% — watch and listen, increase gradually", isCorrect: true },
      { id: "c", text: "200% — get it done fast", isCorrect: false },
    ],
    explanation: "Always start a new program at reduced override (25-50%). Watch tool engagement, listen for chatter, verify rapids are safe. Increase only after confirming everything looks correct.",
    tags: ["setup", "first_article", "safety"],
  }],
};

// ═══════════════════════════════════════════════════════════
// L1-02: Speeds & Feeds — The Foundation (10 modules, ~8 hours)
// ═══════════════════════════════════════════════════════════
const C02 = "L1-02";

const c02m1: Lesson[] = [{
  id: `${C02}-m1-l1`, moduleId: `${C02}-mod-1`,
  title: "Cutting Speed (Vc/SFM)", order: 1,
  content: [{ type: "text", body: `# Cutting Speed (Vc / SFM)

## What It Means Physically

Cutting speed is **how fast the cutting edge moves through the workpiece material** — measured in meters per minute (m/min) or surface feet per minute (SFM).

Think of it as the speed of the outer edge of the tool as it sweeps through metal. A 50mm end mill spinning at 2,000 RPM has its outer edge traveling at ~314 m/min.

## Why It Matters

| Too Slow | Just Right | Too Fast |
|----------|-----------|---------|
| Tool rubs instead of cutting | Clean shearing action | Excessive heat generation |
| Work hardening (stainless!) | Good chip formation | Rapid tool wear |
| Poor surface finish | Optimal tool life | Tool failure / fire |
| Wasted cycle time | Maximum productivity | Scrap parts |

## Recommended Cutting Speeds (Starting Points)

| Material | ISO Group | Vc (m/min) | SFM |
|----------|----------|-----------|-----|
| Aluminum 6061 | N | 250-500 | 800-1600 |
| Mild steel 1018 | P | 120-200 | 400-650 |
| Alloy steel 4140 | P | 80-150 | 250-500 |
| Stainless 304 | M | 60-120 | 200-400 |
| Titanium Ti-6Al-4V | S | 35-60 | 115-200 |
| Cast iron | K | 100-200 | 330-650 |

These are for **coated carbide** tools. HSS = 1/3 to 1/2 of these values.` }],
  prismEngines: ["AutoSpeedFeedEngine"],
}];

const c02m2: Lesson[] = [{
  id: `${C02}-m2-l1`, moduleId: `${C02}-mod-2`,
  title: "The RPM Formula", order: 1,
  content: [{ type: "text", body: `# The RPM Formula

## Metric
**RPM = (Vc × 1000) / (π × D)**

Where: Vc = cutting speed (m/min), D = tool diameter (mm)

## Imperial
**RPM = (SFM × 12) / (π × D)**

Where: SFM = surface feet per minute, D = tool diameter (inches)

## Example

4-flute, 12mm end mill in 4140 steel. Recommended Vc = 120 m/min.

RPM = (120 × 1000) / (3.14159 × 12) = 120,000 / 37.7 = **3,183 RPM**

## Machine RPM Limits

If the formula gives 15,000 RPM but your machine maxes at 10,000:
- **Use 10,000 RPM** (machine limit)
- Actual Vc = (π × D × RPM) / 1000 = (3.14159 × 12 × 10000) / 1000 = 377 m/min
- This is ABOVE the recommended range — consider a larger tool diameter

## Small Tools = High RPM

| Tool Ø | Vc=150 m/min | Vc=300 m/min |
|--------|-------------|-------------|
| 3mm | 15,915 RPM | 31,831 RPM |
| 6mm | 7,958 RPM | 15,915 RPM |
| 12mm | 3,979 RPM | 7,958 RPM |
| 25mm | 1,910 RPM | 3,820 RPM |

Small tools in aluminum often need 20,000+ RPM — ensure your machine can handle it.` }],
  prismEngines: ["AutoSpeedFeedEngine"],
}];

const c02m3: Lesson[] = [{
  id: `${C02}-m3-l1`, moduleId: `${C02}-mod-3`,
  title: "Feed Per Tooth (fz)", order: 1,
  content: [{ type: "text", body: `# Feed Per Tooth (fz) — Chip Load

## What It Is

Feed per tooth (fz) is the **thickness of material each cutting edge removes per revolution**. Also called "chip load."

## Why It's Critical

- **Too low fz**: Tool rubs, generates heat, work-hardens the surface, accelerates wear
- **Too high fz**: Excessive force, tool deflection, chipping, breakage
- **Just right**: Clean chip formation, good surface finish, optimal tool life

## Typical fz Values

| Material | fz Range (mm/tooth) | Notes |
|----------|-------------------|-------|
| Aluminum 6061 | 0.08-0.20 | Can go higher with rigid setup |
| Mild steel 1018 | 0.05-0.12 | Standard carbide end mill |
| 4140 alloy steel | 0.04-0.10 | Reduce for long tools |
| 304 stainless | 0.03-0.08 | Never go below 0.03! (work hardening) |
| Titanium | 0.04-0.08 | Consistent chip load is critical |
| Cast iron | 0.08-0.15 | Short chips, can push harder |

## Adjusting fz

- **Long tool** (L/D > 4): Reduce fz by 20-40% (deflection risk)
- **Thin wall**: Reduce fz by 30-50% (part deflection)
- **Finishing**: Reduce fz by 50% for better Ra
- **Roughing in rigid setup**: Increase fz by 20%` }],
}];

const c02m4: Lesson[] = [{
  id: `${C02}-m4-l1`, moduleId: `${C02}-mod-4`,
  title: "Table Feed Rate", order: 1,
  content: [{ type: "text", body: `# Table Feed Rate (F)

## The Formula

**F = fz × z × n**

Where:
- F = table feed rate (mm/min) — this is the F value in your G-code
- fz = feed per tooth (mm/tooth)
- z = number of teeth (flutes)
- n = spindle speed (RPM)

## Example

12mm, 4-flute end mill, 3,183 RPM, fz = 0.08 mm/tooth:

F = 0.08 × 4 × 3,183 = **1,019 mm/min**

In G-code: \`G01 X100. F1019\`

## Feed Per Revolution (turning)

On a lathe, feed is expressed per revolution, not per minute:
**fn = fz × z** (but z=1 for single-point tools, so fn = fz)

Typical fn for turning:
- Roughing: 0.15-0.40 mm/rev
- Finishing: 0.05-0.15 mm/rev

In G-code: \`G95 F0.20\` (feed per rev mode) or calculate F = fn × RPM for G94 (per min).` }],
}];

const c02m5: Lesson[] = [{
  id: `${C02}-m5-l1`, moduleId: `${C02}-mod-5`,
  title: "Depth & Width of Cut", order: 1,
  content: [{ type: "text", body: `# Depth of Cut (ap) & Width of Cut (ae)

## Definitions

- **ap (axial depth of cut)**: How deep the tool goes into the material (Z direction in milling)
- **ae (radial depth of cut)**: How wide the tool engages the material (stepover)

## The Engagement Ratio (ae/D)

| ae/D | Name | Force Level | Application |
|------|------|------------|------------|
| 1.0 | Full slotting | Maximum | Slots (reduce fz by 50%) |
| 0.5 | Half-width | High | General roughing |
| 0.25 | Quarter-width | Moderate | Semi-finishing |
| 0.10 | Light radial | Low | Finishing, HSM/adaptive |
| 0.05 | Skim cut | Very low | Super-finishing |

## Light ae + Deep ap = Modern Machining

Traditional: shallow ap (1mm) + wide ae (full slot) = high force, low MRR
Modern HSM: deep ap (2×D) + light ae (10%) = lower force, HIGHER MRR!

Example with 12mm end mill in steel:
- Traditional: ap=1mm, ae=12mm → MRR = 12,000 mm³/min
- HSM: ap=24mm, ae=1.2mm → MRR = 29,000 mm³/min (2.4× more!)` }],
}];

const c02m6: Lesson[] = [{
  id: `${C02}-m6-l1`, moduleId: `${C02}-mod-6`,
  title: "Chip Thinning", order: 1,
  content: [{ type: "text", body: `# Chip Thinning

## The Problem

When ae is less than 50% of the tool diameter, the actual chip thickness is LESS than the programmed fz. The tool is taking a thinner bite than you commanded.

## Why It Matters

If actual chip thickness drops too low:
- Tool rubs instead of cutting → heat → accelerated wear
- In stainless, this causes work hardening → tool destruction

## The Formula

**fz_adjusted = fz × √(D / ae)**

Or equivalently: **fz_adjusted = fz × D / (2 × √(ae × (D - ae)))**

## Example

12mm end mill, ae = 1.2mm (10% stepover), target fz = 0.08mm:

fz_adjusted = 0.08 × √(12 / 1.2) = 0.08 × √10 = 0.08 × 3.16 = **0.253 mm/tooth**

That's 3× the nominal fz! Without this compensation, the tool only sees a 0.025mm chip — practically rubbing.

## When to Apply

| ae/D Ratio | Chip Thinning Factor | Action |
|-----------|---------------------|--------|
| >50% | 1.0-1.2× | Minor, often ignored |
| 25-50% | 1.4-2.0× | Should compensate |
| 10-25% | 2.0-3.2× | MUST compensate |
| <10% | 3.2×+ | Critical — always compensate |

**PRISM's SFC calculator does this automatically.**` }],
  prismEngines: ["AutoSpeedFeedEngine"],
}];

const c02m7: Lesson[] = [{
  id: `${C02}-m7-l1`, moduleId: `${C02}-mod-7`,
  title: "Metal Removal Rate (MRR)", order: 1,
  content: [{ type: "text", body: `# Metal Removal Rate (MRR)

## The #1 Productivity Metric

**MRR = ap × ae × Vf** (mm³/min)

Where: ap = depth (mm), ae = width (mm), Vf = table feed (mm/min)

## Example

ap = 3mm, ae = 6mm, F = 1,019 mm/min:
MRR = 3 × 6 × 1,019 = **18,342 mm³/min** = 18.3 cm³/min

## Why MRR Matters

| MRR | Productivity | Cost Impact |
|-----|-------------|-------------|
| 10 cm³/min | Baseline | $50/part |
| 20 cm³/min | 2× faster | $30/part |
| 40 cm³/min | 4× faster | $20/part |

Doubling MRR nearly halves cycle time (non-cutting time stays the same).

## MRR by Material (Achievable with Carbide)

| Material | Typical MRR (cm³/min) | Aggressive MRR |
|----------|---------------------|---------------|
| Aluminum | 100-500 | 1,000+ |
| Mild steel | 20-80 | 150+ |
| Stainless | 10-40 | 80+ |
| Titanium | 5-20 | 40+ |
| Inconel | 2-8 | 15+ |` }],
}];

const c02m8: Lesson[] = [{
  id: `${C02}-m8-l1`, moduleId: `${C02}-mod-8`,
  title: "Power & Torque Requirements", order: 1,
  content: [{ type: "text", body: `# Power & Torque Requirements

## Spindle Power Formula

**Power (kW) = MRR × kc / (60 × 10⁶ × η)**

Where:
- MRR = metal removal rate (mm³/min)
- kc = specific cutting force (N/mm²) — from material data
- η = spindle efficiency (~0.80-0.90)

## Specific Cutting Force (kc) by Material

| Material | kc (N/mm²) |
|----------|-----------|
| Aluminum 6061 | 700-900 |
| Mild steel 1018 | 1,800-2,200 |
| 4140 alloy steel | 2,200-2,800 |
| 304 stainless | 2,500-3,000 |
| Titanium Ti-6Al-4V | 1,400-1,800 |
| Cast iron | 1,000-1,400 |

## Example

MRR = 18,342 mm³/min in 4140 steel (kc = 2,500 N/mm²), η = 0.85:

Power = 18,342 × 2,500 / (60 × 1,000,000 × 0.85) = **0.90 kW**

Your 15kW spindle handles this easily. But a heavy roughing cut at MRR = 200 cm³/min would need ~9.8 kW.

## Torque vs Power

- **High RPM + light cut** = needs POWER (kW) — aluminum machining
- **Low RPM + heavy cut** = needs TORQUE (Nm) — large face mills in steel
- Check the spindle torque curve — many machines lose torque above a certain RPM` }],
}];

const c02m9: Lesson[] = [{
  id: `${C02}-m9-l1`, moduleId: `${C02}-mod-9`,
  title: "Speed/Feed Tables", order: 1,
  content: [{ type: "text", body: `# Speed/Feed Tables — How to Read Them

## Manufacturer Tables

Every tool manufacturer provides recommended parameters:

| Column | Meaning |
|--------|---------|
| **Material** | Workpiece material and ISO group |
| **Vc (m/min)** | Cutting speed range (start in the MIDDLE) |
| **fz (mm/tooth)** | Feed per tooth range |
| **ap max** | Maximum axial depth of cut |
| **ae max** | Maximum radial engagement |

## Start in the Middle, Adjust From There

The range is given for a reason:
- **Low end**: Conservative. For long tools, thin walls, weak setups, finishing.
- **Middle**: Best starting point for general work.
- **High end**: Rigid setup, short tool, stable machine, roughing.

## What to Listen For

As you increase parameters:
- **Smooth cutting sound** = good
- **Consistent chip color** = good (blue chips in steel = hot but OK for roughing)
- **Harmonic "singing"** = too fast or resonance — change RPM slightly
- **Rattling/screaming** = CHATTER — reduce immediately` }],
}];

const c02m10: Lesson[] = [{
  id: `${C02}-m10-l1`, moduleId: `${C02}-mod-10`,
  title: "Your First S/F Calculation", order: 1,
  content: [{
    type: "text",
    body: `# Full Speed/Feed Calculation Walkthrough

## Given
- Tool: 4-flute, 12mm solid carbide end mill, TiAlN coated
- Material: 4140 alloy steel (pre-hard 28-32 HRC)
- Operation: Side milling (roughing), ap = 12mm, ae = 3mm (25% stepover)

## Step 1: Cutting Speed
From table: 4140 steel, coated carbide → Vc = 100-150 m/min. Start middle: **Vc = 120 m/min**

## Step 2: RPM
RPM = (120 × 1000) / (π × 12) = 120,000 / 37.7 = **3,183 RPM**

## Step 3: Feed Per Tooth
From table: 4140, 12mm end mill → fz = 0.06-0.10. Start: **fz = 0.08 mm/tooth**

## Step 4: Chip Thinning Check
ae/D = 3/12 = 0.25 (25%). Factor = √(12/3) = 2.0
fz_adjusted = 0.08 × 2.0 = **0.16 mm/tooth**

## Step 5: Table Feed
F = 0.16 × 4 × 3,183 = **2,037 mm/min**

## Step 6: MRR
MRR = 12 × 3 × 2,037 = **73,332 mm³/min = 73.3 cm³/min** ✓ Very productive!

## Step 7: Power Check
Power = 73,332 × 2,500 / (60 × 10⁶ × 0.85) = **3.6 kW** — well within a 15kW spindle. ✓`,
  }, {
    type: "calculator",
    title: "Try it in PRISM SFC Calculator",
    calculatorConfig: {
      engine: "AutoSpeedFeedEngine",
      inputFields: ["material", "toolDiameter", "fluteCount", "cuttingSpeed", "depthOfCut", "widthOfCut"],
      outputFields: ["rpm", "feedRate", "mrr", "power", "chipThinningFactor"],
      defaults: { toolDiameter: 12, fluteCount: 4, cuttingSpeed: 120, depthOfCut: 12, widthOfCut: 3 },
    },
  }],
  prismEngines: ["AutoSpeedFeedEngine"],
}];

const C02_Q: Record<string, Question[]> = {
  [`${C02}-mod-2-quiz`]: [{
    id: "c02-q1", type: "calculation", difficulty: 2,
    text: "Calculate RPM for a 10mm end mill at Vc = 150 m/min.\nRPM = (Vc × 1000) / (π × D)",
    correctAnswer: 4775, tolerance: 2,
    explanation: "RPM = (150 × 1000) / (3.14159 × 10) = 150,000 / 31.416 = 4,775",
    tags: ["speed_feed", "rpm"],
  }],
  [`${C02}-mod-4-quiz`]: [{
    id: "c02-q2", type: "calculation", difficulty: 2,
    text: "4-flute end mill at 4,000 RPM with fz = 0.10 mm/tooth. What is the table feed rate F?\nF = fz × z × RPM",
    correctAnswer: 1600, tolerance: 1,
    explanation: "F = 0.10 × 4 × 4,000 = 1,600 mm/min",
    tags: ["speed_feed", "feed_rate"],
  }],
  [`${C02}-mod-6-quiz`]: [{
    id: "c02-q3", type: "calculation", difficulty: 3,
    text: "A 16mm end mill with ae = 1.6mm (10% stepover). Nominal fz = 0.06mm. What is the chip-thinning adjusted fz?\nfz_adj = fz × √(D / ae)",
    correctAnswer: 0.19, tolerance: 5,
    explanation: "fz_adj = 0.06 × √(16/1.6) = 0.06 × √10 = 0.06 × 3.162 = 0.19 mm/tooth",
    tags: ["speed_feed", "chip_thinning"],
  }],
};

// ═══════════════════════════════════════════════════════════
// L1-03 through L1-10: Condensed modules (rich content)
// Each course has full lessons but compressed for file size
// ═══════════════════════════════════════════════════════════

// L1-03: G-Code I — Motion
const C03 = "L1-03";
const c03_lessons = [
  "Program Structure", "G00 Rapid Traverse", "G01 Linear Feed",
  "G02/G03 Circular Interpolation", "G90 vs G91", "G28 Machine Home",
  "Work Offset Selection", "M-Codes Essentials", "Comments & Organization", "Your First Program",
].map((title, i) => [{
  id: `${C03}-m${i+1}-l1`, moduleId: `${C03}-mod-${i+1}`,
  title, order: 1,
  content: [{ type: "text" as const, body: `# ${title}\n\n${[
    `## Program Structure\n\nEvery G-code program follows this pattern:\n\n\`\`\`gcode\nO0001 (PROGRAM NAME)\n(SAFETY BLOCK)\nG90 G54 G40 G80 G17\nT01 M06 (TOOL CHANGE)\nS5000 M03 (SPINDLE ON)\nG43 H01 Z50. (TOOL LENGTH COMP)\n... (CUTTING MOVES) ...\nM05 (SPINDLE OFF)\nG91 G28 Z0 (HOME Z)\nM30 (PROGRAM END)\n\`\`\`\n\nThe safety block (G90 G54 G40 G80 G17) resets critical modes: absolute, work offset, cancel comp, cancel cycles, XY plane.`,
    `## G00 — Rapid Traverse\n\nMachine moves at MAXIMUM speed. Used for positioning between cuts.\n\n**NEVER cut in G00.** It's not a feed move — there's no controlled chip load.\n\n\`\`\`gcode\nG00 X50. Y25.  (rapid to position)\nG00 Z5.        (rapid down to clearance plane)\n\`\`\`\n\n**DANGER:** If Z is wrong, a rapid WILL crash the tool into the part at full speed. Always verify rapids in dry run.`,
    `## G01 — Linear Feed Move\n\nStraight-line cutting at programmed feed rate F.\n\n\`\`\`gcode\nG01 X100. F500  (move to X100 at 500 mm/min)\nG01 Z-5. F200   (plunge 5mm deep at 200 mm/min)\nG01 X50. Y30.   (diagonal move)\n\`\`\`\n\nG01 is the most fundamental cutting command. Every contour, pocket wall, and face is made of G01 moves.`,
    `## G02/G03 — Circular Interpolation\n\nG02 = clockwise arc, G03 = counter-clockwise arc.\n\n**Using R (radius):**\n\`\`\`gcode\nG02 X50. Y0. R25.  (CW arc with 25mm radius)\n\`\`\`\n\n**Using I/J (center offsets):**\n\`\`\`gcode\nG02 X50. Y0. I25. J0.  (CW arc, center is 25mm in X from start)\n\`\`\`\n\nI/J are INCREMENTAL from the arc start point to the arc center. R is simpler but can't do full circles (use I/J for 360° arcs).`,
    `## G90 vs G91\n\n**G90 (Absolute):** All positions relative to work zero.\n\`G01 X50.\` = go to X=50mm from work zero.\n\n**G91 (Incremental):** All positions relative to CURRENT position.\n\`G01 X50.\` = move 50mm in +X from wherever you are now.\n\n**Rule:** Use G90 for 99% of programming. Use G91 only for specific incremental moves (like G91 G28 Z0 for homing).`,
    `## G28 — Machine Home Return\n\nSends axis to machine zero through an intermediate point.\n\n\`\`\`gcode\nG91 G28 Z0  (go home in Z — intermediate point is current position)\nG91 G28 X0 Y0  (then home X and Y)\n\`\`\`\n\n**Always home Z first** before X/Y to avoid crashing tools into fixtures during the home move.`,
    `## Work Offset Selection\n\nG54 through G59 select which work coordinate system is active:\n\n\`\`\`gcode\nG54  (use offset 1 — most common)\nG55  (use offset 2 — second fixture)\nG54.1 P1  (extended offset #1)\n\`\`\`\n\nOnce selected, ALL X/Y/Z positions are measured from that offset's zero point until a different offset is called.`,
    `## M-Codes Essentials\n\n| Code | Function | Notes |\n|------|----------|-------|\n| M03 | Spindle ON clockwise | Most common |\n| M04 | Spindle ON counter-clockwise | Left-hand tools |\n| M05 | Spindle STOP | Before tool change |\n| M06 | Tool change | T__ M06 |\n| M08 | Coolant ON | Flood |\n| M09 | Coolant OFF | |\n| M30 | Program end & rewind | Last line of program |\n| M00 | Program stop (operator) | Waits for Cycle Start |\n| M01 | Optional stop | Only stops if Optional Stop switch is ON |`,
    `## Comments & Organization\n\nComments go in parentheses: \`(THIS IS A COMMENT)\`\n\nGood practice:\n\`\`\`gcode\n(--- TOOL 1: 50MM FACE MILL ---)\nT01 M06\nS2000 M03\n(FACE TOP)\nG00 X-30. Y0.\nG43 H01 Z5.\n...\n(--- TOOL 2: 12MM END MILL ---)\nT02 M06\n\`\`\`\n\nClear comments save hours of debugging. Every tool section should have a header comment.`,
    `## Writing Your First Program\n\nPart: 50×50×10mm block. Face the top, drill 4 holes.\n\n\`\`\`gcode\nO0001 (MY FIRST PROGRAM)\nG90 G54 G40 G80\n(--- TOOL 1: 50MM FACE MILL ---)\nT01 M06\nS2000 M03\nG43 H01 Z5. M08\nG00 X-30. Y0.\nG01 Z-0.5 F400\nG01 X80. F800\nG00 Z5.\nM09\n(--- TOOL 2: 8MM DRILL ---)\nT02 M06\nS3000 M03\nG43 H02 Z5. M08\nG83 Z-12. R2. Q3. F240\nX10. Y10.\nX40. Y10.\nX40. Y40.\nX10. Y40.\nG80\nG91 G28 Z0\nG91 G28 X0 Y0\nM30\n\`\`\``,
  ][i]}` }],
  ...(i === 0 ? { prismEngines: ["GCodeValidationEngine"] } : {}),
}] as Lesson[]);

const C03_Q: Record<string, Question[]> = {
  [`${C03}-mod-1-quiz`]: [{
    id: "c03-q1", type: "multiple_choice", difficulty: 1,
    text: "What does the safety block 'G90 G54 G40 G80' do at the start of a program?",
    options: [
      { id: "a", text: "Starts the spindle and turns on coolant", isCorrect: false },
      { id: "b", text: "Sets absolute mode, selects work offset 1, cancels cutter comp and canned cycles", isCorrect: true },
      { id: "c", text: "Homes all axes to machine zero", isCorrect: false },
    ],
    explanation: "G90=absolute, G54=work offset 1, G40=cancel cutter comp, G80=cancel canned cycles. This resets the controller to known states.",
    tags: ["gcode", "program_structure"],
  }],
  [`${C03}-mod-4-quiz`]: [{
    id: "c03-q2", type: "multiple_choice", difficulty: 2,
    text: "G02 X50. Y0. R25. — what does this command do?",
    options: [
      { id: "a", text: "Moves in a straight line to X50 Y0 at 25 mm/min", isCorrect: false },
      { id: "b", text: "Cuts a clockwise arc to X50 Y0 with a 25mm radius", isCorrect: true },
      { id: "c", text: "Rapid moves to X50 Y0 with 25mm clearance", isCorrect: false },
    ],
    explanation: "G02 = clockwise arc. The R25 specifies a 25mm radius arc from current position to X50 Y0.",
    tags: ["gcode", "arcs"],
  }],
};

// L1-04: G-Code II — Cycles
const C04 = "L1-04";
const c04_titles = [
  "Canned Cycles Overview", "G81 Spot Drilling", "G83 Deep Hole Peck",
  "G73 High-Speed Peck", "G84 Tapping", "G85/G86 Boring", "G76 Fine Boring", "Cycle Cancel",
];
const c04_bodies = [
  `Canned cycles replace repetitive drilling sequences. One G-code does: rapid to position → feed to depth → retract. After defining the cycle, just list X/Y positions — the cycle repeats at each location.`,
  `**G81**: Simple drill. Rapid to R-plane, feed to Z depth, rapid retract.\n\`\`\`gcode\nG81 Z-15. R2. F200\nX10. Y10.\nX40. Y10.\nG80\n\`\`\`\nUse for: spot drilling, shallow holes (< 3×D deep).`,
  `**G83**: Full-retract peck. Drills Q depth, retracts fully to R-plane (clears chips completely), returns, drills another Q.\n\`\`\`gcode\nG83 Z-30. R2. Q5. F150\n\`\`\`\nUse for: deep holes (>3×D), gummy materials. Slower than G73 but better chip clearing.`,
  `**G73**: Chip-break peck. Drills Q depth, retracts ~1mm (just breaks chip), continues.\n\`\`\`gcode\nG73 Z-20. R2. Q3. F200\n\`\`\`\nFaster than G83 because no full retract. Use for 3-8×D depth in steel.`,
  `**G84**: Rigid tapping. Spindle feeds down at exact pitch rate, reverses at bottom.\n\`\`\`gcode\nG84 Z-15. R2. F1250 S2500 (M10×1.5: F = pitch × RPM = 1.5 × 2500 ÷ 3 WAIT...)\n\`\`\`\n**CRITICAL:** F = pitch × RPM. For M10×1.5 at 500 RPM: F = 1.5 × 500 = 750. Wrong F = stripped threads or broken tap.`,
  `**G85**: Feed in, feed out (smooth finish — used for reaming).\n**G86**: Feed in, spindle stop, rapid out (rougher but faster).\n\nBoring produces better hole accuracy than drilling: roundness ±0.005mm vs ±0.03mm for drills.`,
  `**G76**: Fine boring. Feed in, spindle orient (M19), shift tool off wall (Q shift amount), rapid out.\n\nEliminates the retract scratch mark that G85/G86 leave. Used for precision bores where surface finish matters (H7 tolerance and tighter).`,
  `**G80**: Cancels any active canned cycle. ALWAYS include G80 after your last hole.\n\nAfter defining a cycle, just list coordinates — it repeats:\n\`\`\`gcode\nG83 Z-25. R2. Q4. F180\nX10. Y10.\nX30. Y10.\nX50. Y10.\nX50. Y40.\nG80  (CANCEL CYCLE)\n\`\`\``,
];
const c04_lessons = c04_titles.map((title, i) => [{
  id: `${C04}-m${i+1}-l1`, moduleId: `${C04}-mod-${i+1}`,
  title, order: 1,
  content: [{ type: "text" as const, body: `# ${title}\n\n${c04_bodies[i]}` }],
}] as Lesson[]);

const C04_Q: Record<string, Question[]> = {
  [`${C04}-mod-5-quiz`]: [{
    id: "c04-q1", type: "calculation", difficulty: 2,
    text: "You're tapping M8×1.25 at 600 RPM. What F value do you need?\nF = pitch × RPM",
    correctAnswer: 750, tolerance: 1,
    explanation: "F = 1.25 × 600 = 750 mm/min. Wrong feed = stripped threads or broken tap.",
    tags: ["gcode", "tapping"],
  }],
};

// L1-05 through L1-10: Core content with quiz questions
function mkSimpleCourse(
  cid: string, titles: string[], bodies: string[],
  quizzes: Record<string, Question[]>, courseName: string, mins: number,
  engines?: string[],
): Module[] {
  return titles.map((title, i) => {
    const lessons: Lesson[] = [{
      id: `${cid}-m${i+1}-l1`, moduleId: `${cid}-mod-${i+1}`,
      title, order: 1,
      content: [{ type: "text" as const, body: `# ${title}\n\n${bodies[i] || ""}` }],
      ...(engines && i === 0 ? { prismEngines: engines } : {}),
    }];
    return mkModule(cid, i + 1, title, lessons, quizzes, courseName, mins);
  });
}

// L1-05: Basic Milling Operations
const C05 = "L1-05";
const C05_Q: Record<string, Question[]> = {
  [`${C05}-mod-9-quiz`]: [{
    id: "c05-q1", type: "multiple_choice", difficulty: 1,
    text: "Which milling direction is preferred on CNC machines for better surface finish?",
    options: [
      { id: "a", text: "Conventional (tool rotation opposes feed)", isCorrect: false },
      { id: "b", text: "Climb (tool rotation matches feed direction)", isCorrect: true },
      { id: "c", text: "Both are identical", isCorrect: false },
    ],
    explanation: "Climb milling starts with maximum chip thickness and exits thin, producing less heat and better finish. Preferred on CNC (no backlash).",
    tags: ["milling", "climb_conventional"],
  }],
};

// L1-06: Basic Turning Operations
const C06 = "L1-06";
const C06_Q: Record<string, Question[]> = {
  [`${C06}-mod-5-quiz`]: [{
    id: "c06-q1", type: "multiple_choice", difficulty: 2,
    text: "When single-point threading, what determines the number of passes needed?",
    options: [
      { id: "a", text: "The spindle speed", isCorrect: false },
      { id: "b", text: "The thread depth (pitch × 0.6134 for 60° threads) divided by depth per pass", isCorrect: true },
      { id: "c", text: "The thread length", isCorrect: false },
    ],
    explanation: "Total thread depth = pitch × 0.6134. Divided into 6-12 passes of decreasing depth (constant area infeed or modified flank infeed).",
    tags: ["turning", "threading"],
  }],
};

// L1-07: Coolant & Chip Management
const C07 = "L1-07";
const C07_Q: Record<string, Question[]> = {
  [`${C07}-mod-3-quiz`]: [{
    id: "c07-q1", type: "multiple_choice", difficulty: 1,
    text: "Your coolant refractometer reads 3%. What's the concern?",
    options: [
      { id: "a", text: "Concentration is too high — dilute with water", isCorrect: false },
      { id: "b", text: "Concentration is too low — risk of corrosion and bacterial growth", isCorrect: true },
      { id: "c", text: "3% is the ideal concentration", isCorrect: false },
    ],
    explanation: "Most water-soluble coolants need 5-10% concentration. Below 5% → poor corrosion protection, bacterial growth, reduced tool life.",
    tags: ["coolant", "concentration"],
  }],
};

// L1-08: Quality & Inspection
const C08 = "L1-08";
const C08_Q: Record<string, Question[]> = {
  [`${C08}-mod-7-quiz`]: [{
    id: "c08-q1", type: "multiple_choice", difficulty: 2,
    text: "An SPC chart shows a point outside the upper control limit. What do you do?",
    options: [
      { id: "a", text: "Ignore it — one point doesn't matter", isCorrect: false },
      { id: "b", text: "Stop production and investigate the assignable cause", isCorrect: true },
      { id: "c", text: "Adjust the control limits wider", isCorrect: false },
    ],
    explanation: "A point outside control limits indicates a special cause variation. Stop, investigate (tool wear? offset drift? material change?), correct, and resume.",
    tags: ["quality", "spc"],
  }],
};

// L1-09: Troubleshooting
const C09 = "L1-09";
const C09_Q: Record<string, Question[]> = {
  [`${C09}-mod-2-quiz`]: [{
    id: "c09-q1", type: "multiple_choice", difficulty: 2,
    text: "You hear a loud, periodic 'screaming' during milling. What is the most likely cause?",
    options: [
      { id: "a", text: "Coolant pump failure", isCorrect: false },
      { id: "b", text: "Chatter — unstable cutting caused by vibration", isCorrect: true },
      { id: "c", text: "The program has an error", isCorrect: false },
    ],
    explanation: "Chatter produces a distinctive harmonic 'scream'. Fix: reduce speed, increase feed, change depth of cut, shorten tool overhang, increase rigidity.",
    tags: ["troubleshooting", "chatter"],
  }],
};

// L1-10: CNC Safety
const C10 = "L1-10";
const C10_Q: Record<string, Question[]> = {
  [`${C10}-mod-6-quiz`]: [{
    id: "c10-q1", type: "multiple_choice", difficulty: 1,
    text: "Before pressing Cycle Start on a new program, which is NOT part of the pre-flight checklist?",
    options: [
      { id: "a", text: "Verify correct program is loaded", isCorrect: false },
      { id: "b", text: "Check that the door is closed", isCorrect: false },
      { id: "c", text: "Set feed override to 200% for faster completion", isCorrect: true },
    ],
    explanation: "NEVER start a new program at high override. Always start at 25-50% and increase gradually after verifying safe operation.",
    tags: ["safety", "preflight"],
  }],
};

// Milling operation bodies
const c05_bodies = [
  `Face milling creates a flat top surface. Use a face mill (50-100mm) or large shell mill. Pass across the part with 50-75% tool overlap. Climb milling preferred. Leave 0.1-0.2mm for a finishing pass if Ra matters.`,
  `Pocket milling removes material from a closed boundary. Strategies:\n- **Zigzag**: Simple, fast, but direction changes cause marks\n- **Contour-parallel (spiral)**: Better finish on walls\n- **Adaptive/HSM**: Light ae, deep ap — fastest MRR, best tool life\n\nAlways leave 0.1-0.3mm finishing stock on walls and floor.`,
  `Full-width slotting (ae = D) is the hardest milling operation. The tool has no room for chips on one side. **Reduce feed by 50%** vs side milling. Consider helical ramping entry or adaptive slotting.`,
  `Contour milling follows an outside or inside profile. Use cutter compensation (G41/G42) so you can adjust for tool size. Climb milling for better finish. Include lead-in/lead-out arcs to avoid dwell marks at entry/exit.`,
  `Shoulder milling creates a step: flat floor + vertical wall. ae = 50-80% of D. Wall accuracy depends on tool deflection. For precision walls: rough with 0.3mm stock, then finish pass with spring pass (same offset, no new material).`,
  `On a mill: spot drill first (create a center + chamfer), then through-drill. Proper peck depth = 1-3× drill diameter. Through-coolant drills can go deeper without pecking. **Always** spot drill — no exceptions.`,
  `Rigid tapping (G84): spindle feeds at exact pitch. Thread milling: one tool, many thread sizes — interpolates the thread. Floating tap holders absorb slight pitch mismatch. **Always** drill the correct tap drill size first.`,
  `Chamfer mills (45°, 60°, 90°) break edges. Program as a contour with Z depth controlling chamfer width. Back-side deburring tools (e.g., Heule COFA) can deburr the back of through-holes.`,
  `**Climb milling**: Cutter rotation matches feed direction. Chip starts thick, exits thin. Less heat, better finish, longer tool life. **Conventional**: Opposite — starts thin (rubs!), exits thick. Only use on manual machines or when climb causes chatter.`,
  `Complete milling sequence:\n1. Face top → 2. Drill holes → 3. Tap threads → 4. Rough pocket → 5. Finish pocket walls → 6. Finish pocket floor → 7. Contour outside → 8. Chamfer edges\n\nRoughing first, finishing last. Holes before threads. Inside before outside.`,
];

const c06_bodies = [
  `OD roughing removes bulk material. G71 canned cycle (Fanuc) automates multi-pass roughing. Depth per pass: 1-3mm in steel. Leave 0.2-0.5mm stock for finishing. Use CNMG or WNMG insert for maximum MRR.`,
  `OD finishing: single pass at final dimension. Light ap (0.1-0.3mm). Higher Vc for better finish. Lower feed for better Ra. DNMG or VNMG insert with wiper geometry for mirror finish.`,
  `Facing creates a flat end face. Feed from OD toward center (G96 CSS maintains constant Vc). Watch for the nub at center — ensure tool center height is correct.`,
  `Grooving: plunge narrow tool into OD or face. Parting: groove all the way through to cut the part off. Both need: reduced RPM, steady coolant, chip breaker geometry. **Never stop feed during parting** — tool will grab and break.`,
  `G76 threading cycle (Fanuc). Key parameters: pitch, total depth, first pass depth, minimum depth, infeed angle (0° or 29° flank). Use 29° modified flank for most threads — reduces force per side. Measure with thread gauge or 3-wire method.`,
  `Internal boring: like OD turning but inside a hole. Challenge: long overhang = deflection. Use the largest boring bar that fits (80% of hole diameter). Anti-vibration bars (carbide shank, tuned mass damper) for L/D > 4.`,
  `Drilling on lathe: drill is stationary in tailstock, part rotates. Center drill first (short, rigid — guides the twist drill). Peck for deep holes. Live tooling allows off-center drilling.`,
  `Knurling impresses a diamond or straight pattern for grip. Bump/form knurling: roller presses into OD. Cut knurling: single-point tool cuts the pattern (better for CNC). Specify pitch (e.g., 21 TPI) on the print.`,
  `G41/G42 on a lathe compensates for the insert's nose radius. Without it, tapers and radii have errors proportional to the nose radius. ALWAYS use cutter comp on a finishing pass with contour geometry.`,
  `Process planning sequence:\n1. Face end → 2. Center drill → 3. Drill through → 4. Rough OD profile → 5. Rough ID (bore) → 6. Semi-finish → 7. Finish OD → 8. Finish ID → 9. Groove → 10. Thread → 11. Part off\n\nRoughing before finishing. OD before ID (rigidity). Threading near last (fragile). Part-off is always the LAST operation.`,
];

const c07_bodies = [
  `Coolant has three jobs:\n1. **Cool** — remove heat from tool and workpiece (extend tool life)\n2. **Lubricate** — reduce friction at the chip-tool interface (reduce BUE, improve finish)\n3. **Flush** — wash chips away from the cutting zone (prevent re-cutting)\n\nDifferent operations prioritize differently: deep drilling needs flushing most, finishing needs lubrication most.`,
  `**Soluble oil (emulsion)**: 5-10% oil in water. Most common. Good cooling + lubrication.\n**Synthetic**: No oil, water + additives. Cleaner, better cooling, worse lubrication.\n**Semi-synthetic**: Blend of both. Good balance.\n**Neat oil (straight oil)**: 100% oil. Maximum lubrication. Used for grinding, tapping, Swiss.\n**MQL (Minimum Quantity Lubrication)**: Micro-mist of oil. Minimal cleanup, good for aluminum.`,
  `**Concentration monitoring**: Use a refractometer weekly.\n- Target: 5-10% for most operations\n- Below 5%: poor corrosion protection, bacterial growth, shortened tool life\n- Above 12%: foaming, skin irritation, waste of coolant concentrate\n- pH should be 8.5-9.5 (alkaline prevents bacteria and corrosion)`,
  `Through-spindle coolant (TSC) delivers fluid at 20-70+ bar through the tool body, directly to the cutting edge.\n- **Deep drilling**: TSC at 40+ bar flushes chips even at 10×D depth\n- **High-performance milling**: TSC improves chip evacuation in pockets\n- **Tapping**: TSC through the tap reduces torque and extends tap life\n- Requires: machine with TSC capability + tools with through-coolant holes`,
  `**Air blast**: Compressed air nozzle aimed at the cut.\n- Best for: cast iron (no coolant needed, air clears dust), aluminum (prevents re-welding)\n- Chips blow away instead of piling up\n\n**MQL**: Mist of oil droplets (5-50 ml/hour) delivered with compressed air.\n- Dramatically reduces coolant cost and cleanup\n- Excellent for aluminum milling and drilling\n- No sump to maintain, no bacteria, no disposal cost`,
  `**Good chips**: Short, C-shaped or comma-shaped, consistent color.\n**Bad chips**: Long, stringy, tangled, wrapping around tool.\n\nFix stringy chips:\n1. Increase fz (thicker chip breaks more easily)\n2. Use insert with chipbreaker groove\n3. Reduce cutting speed slightly\n4. Improve coolant delivery to the cutting zone\n\n**Bird-nesting** (chips piling in pocket): increase air blast, use through-tool coolant, reduce depth per pass.`,
];

const c08_bodies = [
  `One bad part costs:\n- Material: $20-500+\n- Machine time: $50-200/hour\n- Rework: 2-5× the original cost\n- Late delivery: lost customer trust\n- In aerospace: potential fleet grounding, FAA investigation\n\nQuality is NOT optional. It's the difference between a profitable shop and a bankrupt one.`,
  `First Article Inspection (FAI): measure EVERY dimension on the first part from a new setup.\n- Use a balloon drawing (number each dimension)\n- Record actual measurement vs nominal ± tolerance\n- Pass = ALL dimensions within spec\n- Fail = adjust offsets, re-run, re-inspect\n- Both operator and supervisor sign off`,
  `In-process checks during a production run:\n- Check critical dimensions every 5-25 parts\n- Record on SPC chart or inspection log\n- Watch for trends (dimensions drifting toward one limit)\n- Adjust tool wear offsets proactively (before parts go out of spec)\n- Change tools BEFORE they wear past the limit`,
  `Go/No-Go gauges for fast production checking:\n- **Pin gauge**: GO pin enters the hole, NO-GO does not → hole is correct size\n- **Thread gauge**: GO ring screws on, NO-GO does not → thread is correct\n- **Snap gauge**: Part fits between GO jaws, doesn't fit between NO-GO jaws\n\nFaster than measuring with calipers. Less operator variability.`,
  `Review from L0-02 with production context:\n- Zero-check instruments before every use\n- Clean measuring surfaces (chips = errors)\n- Stabilize temperature (parts straight from machine are oversize from thermal expansion)\n- Ratchet stop on micrometer — consistent force\n- Support long parts at two points for accurate length measurement`,
  `Surface finish measurement:\n- **Profilometer**: Drags a stylus across the surface, measures peaks and valleys\n- **Ra**: Arithmetic average roughness (most common spec)\n- **Rz**: Average peak-to-valley height (more sensitive to scratches)\n- **Comparison plates**: Visual/tactile blocks with known Ra values — quick shop floor check\n\nTypical specs: General machining Ra 1.6-3.2µm. Precision Ra 0.4-0.8µm. Ground Ra 0.1-0.4µm.`,
  `SPC (Statistical Process Control):\n- Plot each measurement on an X-bar chart\n- Calculate control limits (UCL/LCL at ±3σ from mean)\n- If a point goes outside control limits → **STOP** and investigate\n- Western Electric rules: 7 points in a row trending, 2 of 3 past 2σ, etc.\n- Cpk ≥ 1.33 means process is capable. Cpk < 1.0 means parts WILL go out of spec.`,
  `Traceability: connecting every part to its source.\n- Material cert (MTR) → which heat/lot of raw material\n- Machine/program → which machine made it, which program version\n- Operator → who ran the job\n- Inspection data → who measured it, with which instruments\n- Instrument calibration → traceable to NIST standards\n\nAerospace (AS9100) and medical (ISO 13485) REQUIRE full traceability.`,
];

const c09_bodies = [
  `**Don't guess — diagnose systematically.**\n1. What changed? (New tool? New material? Different operator?)\n2. When did it start? (First part? After lunch? After tool change?)\n3. Is it consistent? (Every part? Random? Only certain features?)\n4. Isolate one variable at a time. Change ONE thing, test, observe.\n\nThe worst thing you can do is change 3 things at once — you won't know which one fixed it.`,
  `**Chatter**: Loud, periodic screeching/screaming during cut.\n- **Cause**: Unstable cutting — tool, workpiece, or machine vibrating at resonance\n- **Quick fixes**: (1) Reduce speed 10-15%, (2) Increase feed, (3) Change ap, (4) Shorten tool, (5) Add support\n- **Root cause**: Stability lobe analysis (advanced — covered in L3)\n- **Visual sign**: Wavy/scalloped surface finish with regular pattern`,
  `**Poor surface finish**: Part feels rough, Ra is out of spec.\n- **Check 1**: Tool wear — inspect cutting edge under magnifier\n- **Check 2**: Chip re-cutting — chips not evacuating, scratching the surface\n- **Check 3**: Wrong parameters — speed too low (BUE), feed too high (feed marks)\n- **Check 4**: Vibration — even mild chatter degrades finish\n- **Check 5**: Runout — bad holder or worn spindle bearing`,
  `**Tool breakage**: Tool snaps during cutting.\n- **Excessive load**: Feed too high, depth too deep, or full-slot in hard material\n- **Chip packing**: Chips jamming between tool and workpiece (especially in pockets)\n- **Programming error**: Rapid into material, wrong Z, tool in wrong position\n- **Worn tool**: Micro-cracks from wear propagate under load\n- **Prevention**: Tool load monitoring, verify program with dry run, replace tools before end-of-life`,
  `**Oversize**: Reduce tool wear offset (negative direction)\n**Undersize**: Increase tool wear offset (positive direction)\n**Taper**: Tool deflection (shorten tool, take lighter cut) or machine alignment issue\n**Inconsistent part-to-part**: Fixture not repeating — check vise, parallels, locators\n**Wrong position**: Work offset error — re-verify G54 X/Y/Z`,
  `**Long stringy chips**: Increase fz, use chipbreaker insert, reduce speed\n**Bird's nesting** (chips piling in pocket): Improve coolant flow, air blast, reduce ap\n**Chip re-cutting**: Chips falling back into cut zone — use through-tool coolant, air blast\n**Chip welding (BUE)**: In aluminum — increase speed dramatically (300+ m/min), use sharp uncoated tool`,
  `**Foaming**: Concentration too high, or coolant contaminated with way oil/hydraulic oil\n**Rancid smell**: Bacteria — clean sump, adjust concentration to 7-10%, check pH\n**Skin irritation**: Concentration too high or wrong chemistry — check MSDS, adjust\n**Short tool life**: Concentration too low (poor lubrication) — increase to 8-10%\n**Rust on parts**: Concentration too low or pH too low — increase both`,
  `Call for help when:\n- Machine makes unusual sounds you've never heard before\n- Smoke or sparks that aren't normal for the operation\n- Servo alarms (axis error, following error)\n- Spindle overload alarm during normal cutting\n- Any collision or crash — even if it looks minor\n- Parts consistently out of spec after offset adjustments\n\n**There is no shame in asking.** The shame is in crashing a $300,000 machine because you didn't.`,
];

const c10_bodies = [
  `Every machine has unique hazards. Before operating ANY new machine:\n- Read the operator's manual (at least the safety section)\n- Know where ALL E-stops are (there are usually 2-4)\n- Know the door interlock behavior (does it stop the spindle or just feed hold?)\n- Know the maximum workpiece weight for the table/chuck\n- Know the maximum RPM for the spindle and chuck`,
  `Feed override (0-200%): adjusts cutting feed in real-time. Speed override: adjusts RPM.\n\n**Start every new program at 25-50% feed override.** Watch the first few tool engagements. Listen for abnormal sounds. Watch coolant flow. Gradually increase to 100% after the first article passes inspection.\n\n**200% override is for experienced operators only**, and only on proven programs with known-good setups.`,
  `**Dry run**: Machine runs the program with no spindle rotation and rapids only. Verifies tool paths are safe — no collisions with fixtures, vises, or clamps. Run dry FIRST on any new program.\n\n**Single block**: Machine executes ONE line of G-code, then waits for Cycle Start. Use for the first few cuts of a new program. Watch each move carefully before pressing Cycle Start again.`,
  `When you see an alarm:\n1. **Read the alarm message** on the screen\n2. **Look up the code** in the operator's manual\n3. Common alarms:\n   - **Servo overload / Following error**: Possible collision or excessive force. Do NOT just reset — investigate!\n   - **Over-travel**: Axis past its limit switch. Jog slowly in the opposite direction.\n   - **Spindle overload**: Cut too heavy. Reduce depth or feed.\n   - **Tool life alarm**: Tool has exceeded programmed life count. Replace tool.`,
  `After a tool crash:\n1. **E-STOP immediately**\n2. Do NOT jog with tool still in the workpiece\n3. Assess damage: spindle, holder, tool, workpiece, fixture\n4. Replace the broken tool and holder\n5. Re-verify all tool offsets (a crash can shift them)\n6. Re-indicate the fixture (it may have shifted)\n7. Run first article inspection again\n\n**NEVER just reset and restart** — a crash can cause invisible damage that ruins the next 100 parts.`,
  `Before pressing Cycle Start:\n✅ Correct program loaded and verified?\n✅ All tools in correct magazine positions?\n✅ Tool offsets verified (length AND diameter)?\n✅ Work offset (G54) set to correct part datum?\n✅ Part clamped securely with correct parallels/stops?\n✅ Coolant turned on and aimed correctly?\n✅ Doors closed and interlocks engaged?\n✅ Feed override at 25-50% for first run?\n✅ Single block ON for first few moves?\n\n**If you can't check YES to ALL of these, do NOT press Cycle Start.**`,
];

// ═══════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════

export const L1_01_MODULES: Module[] = [
  mkModule(C01, 1, "Work Coordinate Systems", c01m1, C01_Q, "CNC Setup", 55),
  mkModule(C01, 2, "Setting Work Offsets", c01m2, C01_Q, "CNC Setup", 55),
  mkModule(C01, 3, "Tool Length Compensation", c01m3, C01_Q, "CNC Setup", 50),
  mkModule(C01, 4, "Tool Diameter Compensation", c01m4, C01_Q, "CNC Setup", 50),
  mkModule(C01, 5, "First Article Process", c01m5, C01_Q, "CNC Setup", 45),
  mkModule(C01, 6, "Fixture Offsets & Probing", c01m6, C01_Q, "CNC Setup", 50),
  mkModule(C01, 7, "Machine Warm-Up", c01m7, C01_Q, "CNC Setup", 30),
  mkModule(C01, 8, "Setup Documentation", c01m8, C01_Q, "CNC Setup", 40),
];

export const L1_02_MODULES: Module[] = [
  mkModule(C02, 1, "Cutting Speed (Vc/SFM)", c02m1, C02_Q, "Speeds & Feeds", 45),
  mkModule(C02, 2, "The RPM Formula", c02m2, C02_Q, "Speeds & Feeds", 40),
  mkModule(C02, 3, "Feed Per Tooth (fz)", c02m3, C02_Q, "Speeds & Feeds", 40),
  mkModule(C02, 4, "Table Feed Rate", c02m4, C02_Q, "Speeds & Feeds", 35),
  mkModule(C02, 5, "Depth & Width of Cut", c02m5, C02_Q, "Speeds & Feeds", 40),
  mkModule(C02, 6, "Chip Thinning", c02m6, C02_Q, "Speeds & Feeds", 50),
  mkModule(C02, 7, "Metal Removal Rate", c02m7, C02_Q, "Speeds & Feeds", 35),
  mkModule(C02, 8, "Power & Torque", c02m8, C02_Q, "Speeds & Feeds", 40),
  mkModule(C02, 9, "Speed/Feed Tables", c02m9, C02_Q, "Speeds & Feeds", 35),
  mkModule(C02, 10, "Full S/F Calculation", c02m10, C02_Q, "Speeds & Feeds", 50),
];

export const L1_03_MODULES: Module[] = c03_lessons.map((lessons, i) =>
  mkModule(C03, i + 1, lessons[0].title, lessons, C03_Q, "G-Code I", 45)
);

export const L1_04_MODULES: Module[] = c04_lessons.map((lessons, i) =>
  mkModule(C04, i + 1, c04_titles[i], lessons, C04_Q, "G-Code II", 40)
);

export const L1_05_MODULES = mkSimpleCourse(
  C05,
  ["Face Milling", "Pocket Milling", "Slot Milling", "Contour Milling", "Shoulder Milling",
   "Drilling on a Mill", "Tapping on a Mill", "Chamfering", "Climb vs Conventional", "Complete Milling Job"],
  c05_bodies, C05_Q, "Basic Milling", 45, ["AdvancedMillingStrategiesEngine"],
);

export const L1_06_MODULES = mkSimpleCourse(
  C06,
  ["OD Roughing", "OD Finishing", "Facing", "Grooving / Parting",
   "Threading", "Boring", "Drilling on Lathe", "Knurling",
   "Tool Nose Radius Comp", "Turning Process Planning"],
  c06_bodies, C06_Q, "Basic Turning", 45, ["SinglePointThreadEngine"],
);

export const L1_07_MODULES = mkSimpleCourse(
  C07,
  ["Why Coolant?", "Coolant Types", "Coolant Concentration",
   "Through-Spindle Coolant", "Air Blast & MQL", "Chip Management"],
  c07_bodies, C07_Q, "Coolant & Chips", 35, ["CoolantStrategyEngine"],
);

export const L1_08_MODULES = mkSimpleCourse(
  C08,
  ["Why Quality Matters", "First Article Inspection", "In-Process Checks",
   "Go/No-Go Gauges", "Micrometers & Calipers Review", "Surface Finish Measurement",
   "SPC Basics", "Documentation & Traceability"],
  c08_bodies, C08_Q, "Quality & Inspection", 40, ["ProcessCapabilityPredictionEngine"],
);

export const L1_09_MODULES = mkSimpleCourse(
  C09,
  ["Systematic Approach", "Chatter & Vibration", "Poor Surface Finish",
   "Tool Breakage", "Dimensional Errors", "Chip Problems",
   "Coolant Issues", "When to Call for Help"],
  c09_bodies, C09_Q, "Troubleshooting", 55, ["TroubleshootingAssistantEngine"],
);

export const L1_10_MODULES = mkSimpleCourse(
  C10,
  ["Machine-Specific Safety", "Feed & Speed Override", "Dry Run & Single Block",
   "Alarm Response", "Tool Crash Recovery", "Pre-Flight Checklist"],
  c10_bodies, C10_Q, "CNC Safety", 55, ["AlarmDiagnosticsEngine"],
);
