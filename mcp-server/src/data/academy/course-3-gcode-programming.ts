/**
 * Course 3: G-Code Programming
 * Level: Intermediate | 10 Modules | ~8 hours
 *
 * Learn to write, read, and debug CNC programs. Covers G00-G99,
 * M-codes, canned cycles, work offsets, cutter compensation,
 * subprograms, and common mistakes. Uses PRISM's
 * GCodeSafetyAnalyzer for automated code review.
 */

import type { Module, Lesson, Question } from
  "../../engines/CurriculumEngine.js";

const CID = "course-3";

// ═══════════════════════════════════════════════════════════
// Module 1: G-Code Structure
// ═══════════════════════════════════════════════════════════

const mod1: Lesson[] = [{
  id: `${CID}-mod-1-les-1`,
  moduleId: `${CID}-mod-1`,
  title: "Anatomy of a G-Code Line",
  order: 1,
  content: [{
    type: "text",
    body: `# G-Code Structure

## What is G-Code?

G-code is the **programming language** that CNC machines understand. Every movement, tool change, and spindle command is a G-code instruction.

## A Single Line (Block)

\`\`\`gcode
N10 G01 X50.0 Y30.0 Z-5.0 F1200 S5000 M08
\`\`\`

| Letter | Meaning | This Line |
|--------|---------|-----------|
| **N** | Line number (optional) | Block #10 |
| **G** | Preparatory command | G01 = linear feed move |
| **X/Y/Z** | Axis positions | Move to X50 Y30 Z-5 |
| **F** | Feed rate (mm/min) | 1200 mm/min |
| **S** | Spindle speed (RPM) | 5000 RPM |
| **M** | Machine function | M08 = coolant ON |

## Essential G-Codes (Memorize These)

### Motion
| Code | Name | What It Does |
|------|------|-------------|
| **G00** | Rapid | Move as fast as possible (no cutting) |
| **G01** | Linear feed | Move in a straight line at feed rate F |
| **G02** | CW arc | Clockwise circular interpolation |
| **G03** | CCW arc | Counter-clockwise circular interpolation |

### Positioning
| Code | Name | What It Does |
|------|------|-------------|
| **G90** | Absolute | Positions relative to work zero |
| **G91** | Incremental | Positions relative to current point |
| **G28** | Home | Return to machine home position |

### Units & Planes
| Code | Name | What It Does |
|------|------|-------------|
| **G20** | Inch mode | All dimensions in inches |
| **G21** | Metric mode | All dimensions in millimeters |
| **G17** | XY plane | Arcs in XY (default for milling) |
| **G40** | Cancel comp | Cancel cutter compensation |
| **G43** | Tool length comp | Apply tool length offset |
| **G49** | Cancel TLC | Cancel tool length compensation |

### Canned Cycles
| Code | Name | What It Does |
|------|------|-------------|
| **G73** | Peck drill (high-speed) | Peck with partial retract |
| **G80** | Cancel cycle | Cancel any canned cycle |
| **G81** | Drill | Simple drill to depth |
| **G83** | Peck drill (deep) | Peck with full retract |
| **G84** | Tap | Rigid or floating tap |

## Essential M-Codes

| Code | Name | What It Does |
|------|------|-------------|
| **M00** | Program stop | Pause (operator presses Cycle Start) |
| **M01** | Optional stop | Pause only if Optional Stop is ON |
| **M03** | Spindle CW | Start spindle clockwise |
| **M04** | Spindle CCW | Start spindle counter-clockwise |
| **M05** | Spindle stop | Stop spindle |
| **M06** | Tool change | Change to tool in T register |
| **M08** | Coolant ON | Turn on flood coolant |
| **M09** | Coolant OFF | Turn off coolant |
| **M30** | End program | End + rewind to beginning |

## Program Structure Template

\`\`\`gcode
% (program start delimiter)
O1001 (PROGRAM NAME)
(--- SETUP ---)
G90 G21 G17 G40 G49 G80 (safety line)
T1 M06 (load tool 1)
G43 H1 (apply tool length offset)
S5000 M03 (spindle on CW at 5000 RPM)
M08 (coolant on)
(--- MACHINING ---)
G00 X0 Y0 (rapid to start position)
G43 Z50.0 H1 (rapid to safe Z)
G00 Z2.0 (rapid to approach height)
G01 Z-5.0 F200 (plunge to depth)
G01 X50.0 F1200 (cut to X50)
... (more cutting moves)
(--- END ---)
G00 Z50.0 (retract to safe Z)
M05 (spindle stop)
M09 (coolant off)
G28 G91 Z0 (return Z home)
G28 X0 Y0 (return XY home)
M30 (end program)
%
\`\`\``,
  }],
}];

// ═══════════════════════════════════════════════════════════
// Module 2: Motion Commands
// ═══════════════════════════════════════════════════════════

const mod2: Lesson[] = [{
  id: `${CID}-mod-2-les-1`,
  moduleId: `${CID}-mod-2`,
  title: "G00, G01, G02, G03 — Making the Machine Move",
  order: 1,
  content: [{
    type: "text",
    body: `# Motion Commands

## G00 — Rapid Traverse

Moves at **maximum speed** to a position. **Never use G00 to cut material** — it moves unpredictably (not in a straight line on some controllers).

\`\`\`gcode
G00 X100.0 Y50.0    (rapid in XY)
G00 Z5.0            (rapid in Z — always retract Z first!)
\`\`\`

**Safety rule**: Always rapid Z UP before rapid XY. Otherwise the tool may drag through the part.

## G01 — Linear Feed Move

Moves in a **straight line** at the specified **feed rate (F)**.

\`\`\`gcode
G01 X50.0 Y30.0 F1200   (move to X50 Y30 at 1200 mm/min)
G01 Z-5.0 F200           (plunge at 200 mm/min)
\`\`\`

The F value is **modal** — it stays active until you change it.

## G02 — Clockwise Arc

\`\`\`gcode
G02 X50.0 Y0.0 I0.0 J-25.0 F800
\`\`\`

- **I, J** = arc center offset from start point (incremental)
- **R** = radius (alternative to I, J) — simpler but ambiguous for >180°

## G03 — Counter-Clockwise Arc

Same as G02 but opposite direction.

\`\`\`gcode
G03 X0.0 Y50.0 R25.0 F800   (CCW arc, radius 25mm)
\`\`\`

## I, J, K vs R

- **I** = X offset to arc center
- **J** = Y offset to arc center
- **K** = Z offset (for helical moves)
- **R** = radius (can't do full circles — use I,J for those)

## Helical Interpolation

Combine G02/G03 with Z movement for a helix:

\`\`\`gcode
G03 X0 Y0 Z-3.0 I25.0 J0 F600   (helical entry)
\`\`\`

**Use case**: Helical entry into pockets (gentler than plunging).`,
  }],
}];

// ═══════════════════════════════════════════════════════════
// Module 3: Canned Cycles
// ═══════════════════════════════════════════════════════════

const mod3: Lesson[] = [{
  id: `${CID}-mod-3-les-1`,
  moduleId: `${CID}-mod-3`,
  title: "Canned Drilling Cycles — G81, G83, G84",
  order: 1,
  content: [{
    type: "text",
    body: `# Canned Cycles

Canned cycles automate repetitive operations (drilling, tapping, boring). One line does what would take 10+ lines of G01 code.

## G81 — Simple Drill

\`\`\`gcode
G81 X10.0 Y20.0 Z-15.0 R2.0 F150
\`\`\`

- **X, Y** = hole position
- **Z** = final depth
- **R** = retract plane (approach height)
- **F** = feed rate

Action: rapid to R → feed to Z → rapid out to R

## G83 — Deep Hole Peck Drill

\`\`\`gcode
G83 X10.0 Y20.0 Z-30.0 R2.0 Q5.0 F120
\`\`\`

- **Q** = peck depth (5mm per peck)

Action: feed 5mm → retract to R → rapid back → feed 5mm deeper → repeat

**When to use**: Holes deeper than 3× drill diameter. Pecking clears chips and prevents drill binding.

## G73 — High-Speed Peck

Like G83 but **partial retract** (only backs off 1-2mm per peck). Faster than G83 for moderate-depth holes.

## G84 — Tapping

\`\`\`gcode
G84 X10.0 Y20.0 Z-12.0 R2.0 F500
\`\`\`

The feed rate MUST match: **F = pitch × RPM**

For M8×1.25 at 400 RPM: F = 1.25 × 400 = 500 mm/min

**Rigid tapping** (most modern machines): the spindle reverses at the bottom. No need for tension/compression tapping heads.

## G80 — Cancel Canned Cycle

**Always call G80** after your last hole. Otherwise the machine will try to drill at every subsequent XY move!

\`\`\`gcode
G83 X10.0 Y10.0 Z-20.0 R2.0 Q3.0 F120
X30.0 Y10.0    (drills here too — cycle is modal)
X50.0 Y10.0    (and here)
G80             (NOW cancel the cycle)
G00 Z50.0      (safe to rapid without drilling)
\`\`\`

## Multiple Holes Pattern

\`\`\`gcode
G83 X10.0 Y10.0 Z-20.0 R2.0 Q3.0 F120
X30.0         (same Y, new X)
X50.0
X10.0 Y30.0   (new row)
X30.0
X50.0
G80
\`\`\``,
  }],
}];

// ═══════════════════════════════════════════════════════════
// Modules 4-10: Offsets, Tool Changes, Cutter Comp,
// Subprograms, Structure, Mistakes, Reading Programs
// ═══════════════════════════════════════════════════════════

const mod4: Lesson[] = [{
  id: `${CID}-mod-4-les-1`, moduleId: `${CID}-mod-4`,
  title: "Work Offsets — G54 Through G59", order: 1,
  content: [{
    type: "text",
    body: `# Work Offsets

## What Are Work Offsets?

Work offsets tell the machine **where your part's zero point is** on the table. Without them, the machine only knows its own home position.

## The 6 Standard Offsets

| Code | Use |
|------|-----|
| **G54** | First part (or only part) — most common |
| **G55** | Second part (or second fixture) |
| **G56** | Third part |
| **G57-G59** | Additional parts/fixtures |

## Setting Work Offsets

### Method 1: Edge Finder
1. Touch the edge finder to the X face → record X position
2. Touch Y face → record Y position
3. Touch top of part with tool → record Z position
4. Enter values into G54 offset page

### Method 2: Probe (Automatic)
\`\`\`gcode
G65 P9023 A1.0   (Renishaw probing cycle)
\`\`\`
The probe automatically sets G54 XYZ.

### Method 3: Indicate with Dial Indicator
For precision work (±0.005mm), indicate a bore or edge.

## Using Offsets in Your Program

\`\`\`gcode
G54          (activate first offset)
G00 X0 Y0   (rapid to part zero)
... (machine first part)

G55          (switch to second offset)
G00 X0 Y0   (rapid to second part's zero)
... (machine second part)
\`\`\`

## G10 — Set Offsets from Program

\`\`\`gcode
G10 L2 P1 X-250.0 Y-150.0 Z-50.0
\`\`\`
Sets G54 (P1) to X-250 Y-150 Z-50. Useful for automated multi-part fixtures.`,
  }],
}];

const mod5: Lesson[] = [{
  id: `${CID}-mod-5-les-1`, moduleId: `${CID}-mod-5`,
  title: "Tool Changes — T, M06, H, D", order: 1,
  content: [{
    type: "text",
    body: `# Tool Changes

## The Sequence

\`\`\`gcode
T2 M06       (load tool 2 from magazine)
G43 H2       (apply tool 2 length offset)
S4000 M03    (spindle on at 4000 RPM)
\`\`\`

## T — Tool Select
**T2** tells the magazine to get tool #2 ready. On machines with a pre-stage, call T early:
\`\`\`gcode
T3           (pre-stage tool 3 while still cutting with tool 2)
... (finish cutting)
T3 M06       (now the change is instant)
\`\`\`

## M06 — Tool Change
Physically swaps the tool. Machine retracts Z, swaps, returns.

## G43 H — Tool Length Compensation
**Critical**: every tool is a different length. G43 H# applies the measured length offset.

**Forgetting G43 = CRASH.** The machine will plunge to the wrong Z.

## D — Diameter Offset (for Cutter Compensation)
\`\`\`gcode
G41 D1    (apply cutter comp left, using offset D1)
\`\`\`

## Safe Tool Change Template
\`\`\`gcode
(--- TOOL CHANGE ---)
G00 Z50.0 M09     (retract + coolant off)
M05                (spindle off)
G28 G91 Z0         (Z home)
T3 M06             (change to tool 3)
G43 H3             (NEVER forget this!)
S6000 M03          (new speed)
M08                (coolant on)
G00 X... Y...      (rapid to next position)
\`\`\``,
  }],
}];

const mod6: Lesson[] = [{
  id: `${CID}-mod-6-les-1`, moduleId: `${CID}-mod-6`,
  title: "Cutter Compensation — G41/G42", order: 1,
  content: [{
    type: "text",
    body: `# Cutter Compensation (G41/G42)

## What It Does
Offsets the toolpath by the tool's **radius**. You program the part geometry exactly, and the controller adjusts for tool size.

## G41 — Comp Left (Climb Milling)
Tool is LEFT of the programmed path (looking in the direction of travel).

## G42 — Comp Right (Conventional Milling)
Tool is RIGHT of the programmed path.

## G40 — Cancel Compensation

## When to Use It
- **Manual programming**: program the part outline, let comp handle the offset
- **Tool wear adjustment**: adjust D offset by 0.01mm instead of reprogramming
- **Tool diameter changes**: switch from 12mm to 11.5mm without changing the program

## The Rules (Violate = Crash)

1. **Lead-in required**: must be a G01 move ≥ tool radius long when activating G41/G42
2. **No inside corners smaller than tool radius**: the tool can't fit
3. **Cancel (G40) before rapid moves**: comp + G00 = unpredictable
4. **D offset must be set**: check the offset page

## Example
\`\`\`gcode
G41 D1 G01 X10.0 F500   (activate comp left, lead-in)
G01 Y50.0                 (cut along wall)
G01 X80.0                 (cut along wall)
G01 Y0.0                  (cut along wall)
G40 G01 X-10.0            (cancel comp, lead-out)
\`\`\``,
  }],
}];

const mod7: Lesson[] = [{
  id: `${CID}-mod-7-les-1`, moduleId: `${CID}-mod-7`,
  title: "Subprograms — M98/M99", order: 1,
  content: [{
    type: "text",
    body: `# Subprograms

## Why Use Subprograms?
Repeat a pattern (bolt circle, pocket pattern) without copy-pasting code.

## M98 — Call Subprogram
\`\`\`gcode
M98 P2000 L4    (call program O2000, repeat 4 times)
\`\`\`

## M99 — Return from Subprogram
At the end of the subprogram, M99 returns to the calling program.

## Example: Bolt Circle
\`\`\`gcode
(MAIN PROGRAM O1000)
G54 G90 G00 X0 Y0
G43 Z50.0 H1
S3000 M03 M08

(Hole 1)
G00 X25.0 Y0.0
M98 P2000         (call drilling sub)

(Hole 2)
G00 X17.678 Y17.678
M98 P2000

(Hole 3)
G00 X0.0 Y25.0
M98 P2000

M30

(SUBPROGRAM O2000)
G00 Z2.0
G83 Z-15.0 R2.0 Q3.0 F150
G80
G00 Z50.0
M99
\`\`\`

## Local vs External Subprograms
- **Local**: In the same file (same memory)
- **External**: Separate program file (M98 P#### calls it)

## Macro B (Advanced)
Variables (#1-#33 local, #100-#199 common) enable parametric programming:
\`\`\`gcode
#1 = 25.0    (diameter)
#2 = 6       (number of holes)
#3 = 360/#2  (angle increment)
\`\`\``,
  }],
}];

const mod8: Lesson[] = [{
  id: `${CID}-mod-8-les-1`, moduleId: `${CID}-mod-8`,
  title: "Program Structure Best Practices", order: 1,
  content: [{
    type: "text",
    body: `# Program Structure

## The Standard Layout

Every well-organized program follows this structure:

\`\`\`gcode
%
O1001 (PART-NAME REV-A)
(DATE: 2026-03-20)
(MATERIAL: 6061-T6 ALUMINUM)
(STOCK: 100x75x25mm)

(========== TOOL LIST ==========)
(T1 = 12mm 4FL CARBIDE ENDMILL)
(T2 = 6mm 2FL CARBIDE ENDMILL)
(T3 = 8.5mm CARBIDE DRILL)
(T4 = M10x1.5 TAP)

(========== TOOL 1 — FACE MILL ==========)
N100 G90 G21 G17 G40 G49 G80
N110 T1 M06
N120 G43 H1
N130 S5000 M03
N140 M08
... (cutting moves)
N190 M09 M05

(========== TOOL 2 — POCKET ==========)
N200 T2 M06
...

(========== END ==========)
N900 G28 G91 Z0
N910 G28 X0 Y0
N920 M30
%
\`\`\`

## Best Practices

1. **Safety line first** (G90 G21 G17 G40 G49 G80) — cancels everything
2. **Comment the tool list** at the top
3. **Section headers** for each tool
4. **N-numbers by tool** (T1 = N100s, T2 = N200s)
5. **Retract Z BEFORE XY rapids**
6. **Coolant OFF before tool change**
7. **End with G28 Z, then G28 XY, then M30**
8. **Never leave canned cycles active** (G80 after drilling)`,
  }],
}];

const mod9: Lesson[] = [{
  id: `${CID}-mod-9-les-1`, moduleId: `${CID}-mod-9`,
  title: "Common G-Code Mistakes (and How to Avoid Them)",
  order: 1,
  content: [{
    type: "text",
    body: `# Common G-Code Mistakes

## 1. Forgetting G43 (Tool Length Comp)
**Result**: Tool plunges to wrong Z → **CRASH**
**Fix**: Always include G43 H# after every M06

## 2. Rapid Through the Part (G00 in Z)
**Result**: Tool drags through material at max speed
**Fix**: Always retract Z to safe height BEFORE G00 XY moves

## 3. Wrong Feed Mode (G94 vs G95)
- **G94** = mm/min (milling default)
- **G95** = mm/rev (turning default)
**Result**: Feed is 1000× too fast or slow
**Fix**: Always specify G94 or G95 at program start

## 4. Leaving Canned Cycle Active
\`\`\`gcode
G83 X10 Y10 Z-20 R2 Q3 F120
X30 Y10      (drills here — intended)
G00 X100 Y0  (ALSO DRILLS HERE — not intended!)
\`\`\`
**Fix**: Always G80 after last hole

## 5. Arc Errors (G02/G03)
- I, J don't match the geometry → alarm
- Using R for >180° arc → wrong direction
**Fix**: Use I, J for full circles. Verify with backplot.

## 6. Missing Decimal Points
\`\`\`gcode
G01 X50 F1200    (some controllers read X50 as X0.050!)
G01 X50.0 F1200  (unambiguous — always use decimals)
\`\`\`

## 7. G91 Left Active
If G91 (incremental) is left on, all subsequent absolute moves are wrong.
**Fix**: Start every program with G90 in the safety line.

## 8. Wrong Work Offset
Machining with G55 when you set up G54 → **off by hundreds of mm**.
**Fix**: Verify the active offset matches your setup sheet.

## The Dry Run Checklist
Before cutting metal:
- [ ] Single-block through first 20 lines
- [ ] Verify G54 matches setup
- [ ] Check tool lengths in offset page
- [ ] Rapid override at 25% for first run
- [ ] Hand on feed hold button
- [ ] Backplot the program if available`,
  }],
}];

const mod10: Lesson[] = [{
  id: `${CID}-mod-10-les-1`, moduleId: `${CID}-mod-10`,
  title: "Reading Real Programs — Line by Line", order: 1,
  content: [{
    type: "text",
    body: `# Reading Real G-Code Programs

## Program 1: Simple Face Mill + Pocket

\`\`\`gcode
%
O2001 (BRACKET-A REV-C)
N10 G90 G21 G17 G40 G49 G80

(--- T1: 50mm FACE MILL ---)
N100 T1 M06
N110 G43 H1
N120 S2500 M03 M08
N130 G00 X-30.0 Y-40.0
N140 G00 Z2.0
N150 G01 Z-1.0 F300
N160 G01 X130.0 F2000
N170 G00 Z2.0
N180 G00 Y-20.0
N190 G01 Z-1.0 F300
N200 G01 X-30.0 F2000
N210 G00 Z50.0 M09 M05

(--- T2: 12mm ENDMILL ---)
N300 T2 M06
N310 G43 H2
N320 S5000 M03 M08
N330 G00 X10.0 Y10.0
N340 G00 Z2.0
N350 G01 Z-8.0 F200
N360 G01 X60.0 F1200
N370 G01 Y40.0
N380 G01 X10.0
N390 G01 Y10.0
N400 G00 Z50.0 M09 M05

N900 G28 G91 Z0
N910 G28 X0 Y0
N920 M30
%
\`\`\`

## Line-by-Line Analysis

| Line | What Happens |
|------|-------------|
| N10 | Safety line — absolute, metric, XY plane, cancel comp/TLC/cycles |
| N100 | Load 50mm face mill |
| N110 | Apply its length offset |
| N120 | Spindle CW 2500 RPM, coolant on |
| N130 | Rapid to start position (off the part) |
| N140 | Rapid to 2mm above surface |
| N150 | Feed down 1mm into material (face mill depth) |
| N160 | Feed across the part at 2000 mm/min (face milling pass 1) |
| N170 | Retract above surface |
| N180 | Step over 20mm |
| N190-200 | Second pass back the other direction |
| N210 | Retract high, coolant/spindle off |
| N300-400 | Same pattern: load end mill, cut a rectangular pocket |
| N900-920 | Return home, end program |

## What to Look For When Reading

1. **Tool sequence** — what tools are used and in what order?
2. **Z movements** — where does the tool plunge? How deep?
3. **Feed rates** — do they change between plunge and XY cuts?
4. **Safety** — is there a safety line? G43 after every tool change?
5. **Coolant** — on before cutting, off before tool change?`,
  }],
  prismEngines: ["GCodeSafetyAnalyzerEngine"],
}];

const mod11: Lesson[] = [{
  id: `${CID}-m11-l1`, moduleId: `${CID}-mod-11`,
  title: "Citation Discipline — G-Code Standards & Controller References", order: 1,
  content: [{
    type: "text",
    body: `# Citation Discipline — G-Code & Controllers

**Prerequisite:** Modules 1-10 of this course (G-code structure, motion, canned cycles, comp).
**Learning objective:** For every G-code, M-code, and canned cycle, identify the *governing standard* (ISO baseline) AND the *controller-specific dialect* (vendor extension). G-code is *not* one language — it is one ISO base + many vendor dialects.
**Assessment:** Print a real program from your shop. Cite the controller manual for every non-ISO-standard code in it.

## Why G-Code Needs Cited References

G83 on a Fanuc controller does *deep-hole peck drilling*. G83 on a Heidenhain controller does *something completely different*. ISO 6983 defines a base vocabulary; every vendor extends it. A program that runs on machine A may crash machine B unless the *target controller* is cited.

## Citation Pattern (G-Code Variant)

\`<code/cycle> [per <controller manual, model, edition, section> | base: <ISO clause>]\`

Examples revisiting modules of THIS course:

- **"G-code program structure (N/G/M/X/Y/Z/F/S address words)"** [per ISO 6983-1:2009, *Numerical control of machines — Program format and definitions of address words* — ISO; clause 5.]
- **"G81/G83 canned drilling cycles"** [per Fanuc 30i/31i/32i Operator's Manual (B-64304EN) — Section: Canned Cycle for Drilling — *Fanuc-specific behavior; do NOT assume Heidenhain or Siemens 840D match.* Base ref: ISO 6983-2.]
- **"G41/G42 cutter compensation"** [per ISO 6983-1:2009 clause 6 + vendor-specific lookahead behavior (Fanuc Series 30i / Haas NGC / Okuma OSP-P300) — vendor manual is authoritative for lookahead window.]
- **"G54-G59 work offsets"** [per ISO 6983-1:2009; extended offsets G54.1 Px per Fanuc 30i Operator's Manual (Macro Compiler variants vary).]
- **"M-codes M03/M04/M05/M06/M08/M09"** [per ISO 6983-1:2009 §7 — these six are standardized; M-codes ≥M50 are vendor-defined.]
- **"Haas G-code dialect (G187, G253, etc.)"** [per Haas *Mill Operator's Manual*, current revision, available via Haas Tooling — these are Haas-specific extensions, not portable.]
- **"Okuma OSP-P300 user tasks"** [per Okuma *OSP-P300M Programming Manual* — User Tasks 1/2 are Okuma-specific; do not exist on Fanuc/Haas.]
- **"Macro programming (#variables, IF/GOTO)"** [per Fanuc *Macro B* (Custom Macro B) manual or Haas *Macros B Programming Reference* — vendor dialects differ; #100-#199 vs #100-#149 ranges vary.]

## Doctrine vs Technique vs Reference (G-Code Lens)

| Category | In G-code | Examples |
|----------|-----------|----------|
| **Doctrine** | ISO 6983 base + universal cycle structures. | Modal codes · linear G01 syntax · M03 = spindle on CW |
| **Technique** | Hand-coding from formula or macro pattern. | Writing a bolt-circle subprogram · expressing a chamfer in G01 |
| **Reference** | Controller-specific everything else. | Fanuc canned cycles · Haas G/M codes · Okuma user tasks · macro variable ranges · post-processor output |

## The Cross-Controller Failure Mode

A program written for a Fanuc 0i-MF runs perfectly. The shop buys a Haas Mini Mill. The same program "runs" but G73 peck drilling has different retract behavior (Fanuc = retract to R-plane; Haas may differ per setting #22). Result: tool crashes on the second hole. **Defense:** for any program that will move between controllers, cite the *target controller manual* on every canned cycle and macro, then verify on the new controller before production.

## Practice (Assessment)

Pull a recent post-processed program. For each line:

1. Is the G-code in ISO 6983 baseline (G00/G01/G02/G03/G17/G18/G19/G40/G41/G42/G54-G59/G80-G89/G90/G91)? If yes → portable.
2. If not (e.g., G187 on Haas, G131 on Fanuc) → cite the **controller manual section** that defines it.
3. For every M-code ≥ M50 → cite the **machine-specific M-code list** (Haas, Fanuc, Okuma, Heidenhain, Siemens).
4. For every macro variable → cite the **macro programming manual** that allocates that range.

If a code can't be cited → it may be a non-standard code that won't run on a substitute machine. Flag for post-processor regeneration.`,
  }],
}];

// ═══════════════════════════════════════════════════════════
// Quiz Questions
// ═══════════════════════════════════════════════════════════

export const COURSE_3_QUIZZES: Record<string, Question[]> = {
  [`${CID}-mod-1-quiz`]: [
    {
      id: "c3-m1-q1", type: "multiple_choice", difficulty: 1,
      text: "What does G00 do?",
      options: [
        { id: "a", text: "Linear feed move", isCorrect: false },
        { id: "b", text: "Rapid traverse (maximum speed)", isCorrect: true },
        { id: "c", text: "Clockwise arc", isCorrect: false },
        { id: "d", text: "Program stop", isCorrect: false },
      ],
      explanation: "G00 = rapid traverse. Moves at machine maximum speed. Never use for cutting.",
      tags: ["gcode", "motion"],
    },
    {
      id: "c3-m1-q2", type: "multiple_choice", difficulty: 1,
      text: "What does M06 do?",
      options: [
        { id: "a", text: "Turns coolant on", isCorrect: false },
        { id: "b", text: "Starts the spindle", isCorrect: false },
        { id: "c", text: "Performs a tool change", isCorrect: true },
        { id: "d", text: "Ends the program", isCorrect: false },
      ],
      explanation: "M06 = tool change. Combined with T# to specify which tool.",
      tags: ["gcode", "mcode", "tool_change"],
    },
  ],
  [`${CID}-mod-3-quiz`]: [
    {
      id: "c3-m3-q1", type: "calculation", difficulty: 2,
      text: "For tapping M10×1.5 at 500 RPM, what feed rate (F) is needed?\n\nFormula: F = pitch × RPM",
      correctAnswer: 750,
      tolerance: 1,
      explanation: "F = 1.5 × 500 = 750 mm/min",
      tags: ["gcode", "tapping", "feed"],
    },
  ],
  [`${CID}-mod-9-quiz`]: [
    {
      id: "c3-m9-q1", type: "multiple_choice", difficulty: 2,
      text: "What happens if you forget G43 after a tool change?",
      options: [
        { id: "a", text: "The program pauses", isCorrect: false },
        { id: "b", text: "The tool goes to the wrong Z depth — potential crash", isCorrect: true },
        { id: "c", text: "The spindle won't start", isCorrect: false },
        { id: "d", text: "Nothing — G43 is optional", isCorrect: false },
      ],
      explanation: "Without G43, the machine uses Z=0 at the spindle nose, not the tool tip. The tool will be too deep by the tool's length — crash.",
      tags: ["gcode", "safety", "tool_length"],
    },
    {
      id: "c3-m9-q2", type: "multiple_choice", difficulty: 2,
      text: "You hear the machine rapid through material after a drilling cycle. What did you forget?",
      options: [
        { id: "a", text: "M05 (spindle stop)", isCorrect: false },
        { id: "b", text: "G80 (cancel canned cycle)", isCorrect: true },
        { id: "c", text: "G40 (cancel cutter comp)", isCorrect: false },
        { id: "d", text: "M09 (coolant off)", isCorrect: false },
      ],
      explanation: "Canned cycles are modal. Without G80, every subsequent XY move triggers a drilling cycle.",
      tags: ["gcode", "canned_cycle", "safety"],
    },
  ],
  [`${CID}-mod-11-quiz`]: [
    {
      id: "c3-m11-q1", type: "multiple_choice", difficulty: 2,
      text: "A program written for a Fanuc 0i-MF uses G73 peck drilling. The shop transfers it to a Haas Mini Mill. The same program runs but the second hole crashes. What's the most likely root cause + cited remedy?",
      options: [
        { id: "a", text: "G73 retract behavior differs between Fanuc and Haas (Setting #22) — cite each controller's manual for canned-cycle semantics", isCorrect: true },
        { id: "b", text: "Tool offset overflow — Haas can only hold 200 offsets", isCorrect: false,
          explanation: "Both controllers handle hundreds of offsets — this is not a portability issue." },
        { id: "c", text: "Coolant code M08 means something different on Haas", isCorrect: false,
          explanation: "M03/M05/M08/M09 are ISO 6983 standardized; portable across controllers." },
        { id: "d", text: "G54 work offset behavior differs", isCorrect: false,
          explanation: "G54-G59 are ISO 6983 standardized; portable." },
      ],
      explanation: "Citation: Fanuc 30i Operator's Manual + Haas Mill Operator's Manual both define G73 differently — peck retract is controller-specific even though the G-code letter+number match. ISO 6983-2 acknowledges this divergence. The remedy is post-processor regeneration targeting Haas, not assuming program portability.",
      tags: ["citation_discipline", "gcode", "iso_6983", "controller_dialect"],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// Module Assembly
// ═══════════════════════════════════════════════════════════

const mk = (
  i: number, t: string, l: Lesson[], m: number
): Module => ({
  id: `${CID}-mod-${i}`, courseId: CID, title: t,
  description: `${t} — G-Code Programming`, order: i,
  lessons: l,
  quiz: {
    id: `${CID}-mod-${i}-quiz`, moduleId: `${CID}-mod-${i}`,
    questions: COURSE_3_QUIZZES[`${CID}-mod-${i}-quiz`] ?? [],
    passingScore: 75,
  },
  estimatedMinutes: m,
});

export const COURSE_3_MODULES: Module[] = [
  mk(1, "G-Code Structure", mod1, 50),
  mk(2, "Motion Commands", mod2, 45),
  mk(3, "Canned Cycles", mod3, 50),
  mk(4, "Work Offsets", mod4, 40),
  mk(5, "Tool Changes", mod5, 35),
  mk(6, "Cutter Compensation", mod6, 40),
  mk(7, "Subprograms", mod7, 40),
  mk(8, "Program Structure", mod8, 35),
  mk(9, "Common Mistakes", mod9, 45),
  mk(10, "Reading Real Programs", mod10, 50),
  mk(11, "Citation Discipline — G-Code Standards & Controller References", mod11, 40),
];
