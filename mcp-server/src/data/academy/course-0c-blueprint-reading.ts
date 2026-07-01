/**
 * Course 0C: Blueprint Reading & GD&T
 * Level: Novice | 12 Modules | ~10 hours
 *
 * Read any engineering drawing — from basic orthographic views
 * through full GD&T feature control frames. The longest
 * pre-machining course because blueprint literacy is essential
 * for every single job a machinist touches.
 */

import type { Module, Lesson, Question } from
  "../../engines/CurriculumEngine.js";

const CID = "course-0c";

const lessons: Record<number, Lesson[]> = {
  1: [{ id: `${CID}-m1-l1`, moduleId: `${CID}-mod-1`, title: "What is a Blueprint?", order: 1, content: [{ type: "text",
    body: `# What is a Blueprint?

## The Language of Manufacturing

A blueprint (engineering drawing) is the **contract** between the designer and the machinist. It tells you:
- **What** to make (geometry, features)
- **How big** (dimensions, tolerances)
- **How smooth** (surface finish)
- **What material** (alloy, temper)
- **How many** (quantity)

## Parts of a Drawing

### Title Block (Bottom Right)
- Part name and number
- Material specification (e.g., "6061-T6 ALUMINUM")
- General tolerances (unless stated: ±0.1mm)
- Scale (1:1, 2:1, 1:2)
- Drawn by, checked by, approved by
- Revision letter (A, B, C...)

### Revision Block (Top Right or Adjacent)
- Rev A: "Initial release"
- Rev B: "Changed bore diameter from 25.0 to 25.4"
- **ALWAYS check the revision** — old prints = wrong parts

### Drawing Area (Main Views)
- Usually 2-3 orthographic views
- May include section views, detail views, isometric
- Dimensions and tolerances

### Notes/Specifications (Usually Left Side or Below)
- Special instructions: "DEBURR ALL EDGES", "BREAK SHARP EDGES 0.2mm MAX"
- Heat treatment: "HEAT TREAT TO 28-32 HRC"
- Finish: "ANODIZE TYPE II, BLACK"
- Inspection: "100% INSPECT BORE DIAMETER"

## Paper Sizes

| Size | mm | inches | Common Use |
|------|-----|--------|-----------|
| A4 | 210×297 | 8.3×11.7 | Simple parts |
| A3 | 297×420 | 11.7×16.5 | Most parts |
| A2 | 420×594 | 16.5×23.4 | Complex assemblies |
| A1 | 594×841 | 23.4×33.1 | Large assemblies |

## Digital Drawings
Modern shops use PDFs, not paper. Same information, same rules. Some shops use 3D models (MBD — Model-Based Definition) with dimensions embedded in the CAD model.` }] }],

  2: [{ id: `${CID}-m2-l1`, moduleId: `${CID}-mod-2`, title: "Orthographic Projection", order: 1, content: [{ type: "text",
    body: `# Orthographic Projection

## The 3-View System

Imagine putting the part inside a glass box. Project what you see onto each wall:

- **Front view** — look straight at the part's most characteristic face
- **Top view** — look down from above (placed ABOVE the front view)
- **Right view** — look from the right side (placed RIGHT of the front view)

This is **3rd angle projection** (used in USA, Canada, UK). The views "unfold" like a box opening.

## Line Types

| Line | Appearance | Meaning |
|------|------------|---------|
| **Visible** | Solid, thick | Edges you can see |
| **Hidden** | Dashed | Edges behind the surface |
| **Center** | Long-short-long | Center of circles, axes of symmetry |
| **Phantom** | Long-short-short-long | Alternate positions, reference parts |
| **Dimension** | Thin with arrows | Shows measurements |
| **Section** | Cross-hatched area | Cut surface in section views |

## Reading Views Together

Each feature appears in ALL views:
- A hole in the **front view** = circle
- Same hole in the **top view** = hidden lines (dashed)
- Same hole in the **right view** = hidden lines (dashed)

**Key skill**: Mentally projecting between views. "This circle in the front view — where does it appear in the top view?"

## How Many Views?

- **1 view**: Very simple parts (round bar, flat plate) + notes
- **2 views**: Parts with symmetry (turned parts)
- **3 views**: Most machined parts
- **More**: Complex castings, assemblies` }] }],

  3: [{ id: `${CID}-m3-l1`, moduleId: `${CID}-mod-3`, title: "Section & Isometric Views", order: 1, content: [{ type: "text",
    body: `# Isometric & Section Views

## Isometric View
A 3D pictorial showing the part at 30° angles. Helps you visualize what the orthographic views describe.
- Not to scale (distorted by perspective)
- No dimensions (for visualization only)
- Shows the part "as built"

## Section Views (Cutting the Part Open)

When internal features are hard to see with hidden lines, we "cut" the part:

### Full Section (A-A)
Cut all the way through. Shows the interior clearly. Cross-hatching shows the cut material.

### Half Section
Cut half the part. One half shows the exterior, the other shows the interior. Used for symmetrical parts.

### Offset Section
The cutting plane bends to pass through multiple features that aren't in a straight line.

### Broken-Out Section
A small area "broken away" to show a local internal feature (like a keyway or O-ring groove).

### Detail View
A magnified circle showing a small area at a larger scale. "DETAIL B SCALE 5:1"

## Cross-Hatching Rules
- Lines at 45° to the part edges
- Different hatch patterns = different materials (in assemblies)
- **Never dimension to a hatched surface** — dimension to the edge
- Thin parts (gaskets, sheet metal) are filled solid black instead of hatched` }] }],

  4: [{ id: `${CID}-m4-l1`, moduleId: `${CID}-mod-4`, title: "Dimensioning", order: 1, content: [{ type: "text",
    body: `# Dimensioning Basics

## Types of Dimensions

### Linear
- **Horizontal/Vertical**: 50.0 with arrows showing extent
- **Chain dimensions**: 10.0 + 15.0 + 25.0 (linked end-to-end) — tolerance accumulates!
- **Baseline dimensions**: all measured from ONE reference — prevents tolerance stacking

### Diameter (⌀)
- **⌀25.0** = 25mm diameter
- Always preceded by the ⌀ symbol
- Dimension lines pass through the center

### Radius (R)
- **R5.0** = 5mm radius
- Dimension line points to the arc center

### Angular
- **45°** with angular dimension lines
- Measured between two surfaces

### Reference Dimensions
- **(50.0)** in parentheses = for reference only, not inspected
- Used when the dimension can be derived from others

## Dimensioning Rules

1. **Never duplicate** a dimension — state it once
2. **Dimension to visible edges** — not hidden lines
3. **Group related dimensions** — don't scatter across views
4. **Baseline from datums** — functional surfaces first
5. **Don't dimension to intersections** of centerlines` }] }],

  5: [{ id: `${CID}-m5-l1`, moduleId: `${CID}-mod-5`, title: "Tolerancing", order: 1, content: [{ type: "text",
    body: `# Tolerancing

## Why Tolerances?

Nothing is perfect. Tolerances define **how imperfect is acceptable**.

## Types

### Bilateral (±)
**25.000 ±0.025** = acceptable range: 24.975 to 25.025

### Unilateral
**25.000 +0.025/-0.000** = acceptable: 25.000 to 25.025 only

### Limit Dimensions
**25.025 / 24.975** = upper limit / lower limit stated directly

## Fits (How Parts Go Together)

### Clearance Fit
Shaft is always smaller than hole. Parts slide freely.
- Shaft: ⌀24.980 ±0.010
- Hole: ⌀25.020 ±0.010
- Min clearance: 0.020mm

### Interference (Press) Fit
Shaft is always larger than hole. Pressed together.
- Shaft: ⌀25.030 ±0.005
- Hole: ⌀25.000 ±0.005
- Press force required

### Transition Fit
May be clearance or interference depending on actual sizes.

## ISO Fit System
- **H7/g6** = sliding fit (clearance)
- **H7/k6** = location transition fit
- **H7/p6** = press fit (interference)
- The letter = position, the number = tolerance grade

## The Cost Rule
| Tolerance | Relative Cost | Process |
|-----------|--------------|---------|
| ±0.5mm | 1× | Sawing, rough milling |
| ±0.1mm | 1.5× | Standard milling |
| ±0.025mm | 3× | Finish milling |
| ±0.010mm | 5× | Precision milling/turning |
| ±0.005mm | 10× | Grinding |
| ±0.001mm | 50× | Honing, lapping |` }] }],

  6: [{ id: `${CID}-m6-l1`, moduleId: `${CID}-mod-6`, title: "Surface Finish Symbols", order: 1, content: [{ type: "text",
    body: `# Surface Finish Symbols

## The Symbol
The check mark (✓) with modifiers:

- Basic ✓ = any manufacturing method
- ✓ with bar on top = material removal required (must be machined)
- ✓ with circle = material removal NOT permitted (as-cast, as-forged)

## Ra Values on Drawings

The number inside/next to the symbol is Ra in µm (or µin):
- **Ra 0.4** (16 µin) — ground, honed
- **Ra 0.8** (32 µin) — fine finish milling/turning
- **Ra 1.6** (63 µin) — standard finish
- **Ra 3.2** (125 µin) — rough finish
- **Ra 6.3** (250 µin) — as-milled rough

## Lay Direction
Additional symbols show which direction the machining marks go:
- **=** — parallel to surface edge
- **⊥** — perpendicular to edge
- **X** — crossed (honing pattern)
- **M** — multi-directional (lapping)
- **C** — circular (face turning)
- **R** — radial

## Where on the Drawing?
Surface finish symbols are placed on:
- The surface they apply to (touching the edge line)
- A leader line pointing to the surface
- General note: "ALL SURFACES Ra 3.2 UNLESS OTHERWISE NOTED"` }] }],

  7: [{ id: `${CID}-m7-l1`, moduleId: `${CID}-mod-7`, title: "Thread Callouts", order: 1, content: [{ type: "text",
    body: `# Thread Callouts on Drawings

## Metric Threads
**M10 × 1.5 - 6H** (internal) or **M10 × 1.5 - 6g** (external)
- M = metric
- 10 = nominal diameter (mm)
- 1.5 = pitch (mm). If omitted = coarse pitch
- 6H/6g = tolerance class. Uppercase = internal, lowercase = external

## Unified (Inch) Threads
**1/4-20 UNC 2B** (internal) or **1/4-20 UNC 2A** (external)
- 1/4 = nominal diameter (inches)
- 20 = threads per inch (TPI)
- UNC = Unified National Coarse (UNF = Fine)
- 2 = class of fit (1=loose, 2=standard, 3=tight)
- B = internal, A = external

## Pipe Threads
**1/4-18 NPT** = National Pipe Taper
- Tapers at 1°47'24" (seals by wedging)
- Requires pipe dope or Teflon tape
- **NPTF** (dryseal) — seals without tape

## Thread Representation on Drawings
- **External**: two parallel lines (crest and root diameter)
- **Internal (section)**: dashed lines showing thread profile
- **Thread note**: attached via leader line
- **Thread depth**: "M10×1.5 - 15 DEEP" = 15mm thread depth` }] }],

  8: [{ id: `${CID}-m8-l1`, moduleId: `${CID}-mod-8`, title: "Hole Callouts", order: 1, content: [{ type: "text",
    body: `# Hole Callouts

## Simple Hole
**⌀10.0 THRU** = 10mm through hole
**⌀10.0 ↧ 15.0** = 10mm diameter, 15mm deep (blind hole)

## Counterbore (⌴)
**⌀10.0 THRU**
**⌴ ⌀18.0 ↧ 8.0**
= 10mm through hole with 18mm counterbore, 8mm deep
Used for: socket head cap screws (SHCS)

## Countersink (⌵)
**⌀5.0 THRU**
**⌵ ⌀10.0 × 90°**
= 5mm through hole with 10mm countersink at 90°
Used for: flat head screws (flush with surface)

## Spotface
**⌀10.0 THRU**
**SF ⌀20.0**
= 10mm through hole with 20mm spotface (shallow flat area)
Used for: bolt head seating on rough/curved surfaces

## Tapped Hole
**M8 × 1.25 - 6H ↧ 15**
**⌀6.8 THRU**
= 6.8mm drill through, M8×1.25 thread 15mm deep

## Reading Complex Hole Callouts

Drawing says:
\`\`\`
4× ⌀8.5 THRU
⌴ ⌀14.0 ↧ 9.0
\`\`\`
Translation: Drill 4 holes, each 8.5mm through, with 14mm counterbore 9mm deep. For M8 SHCS.` }] }],

  9: [{ id: `${CID}-m9-l1`, moduleId: `${CID}-mod-9`, title: "GD&T Introduction", order: 1, content: [{ type: "text",
    body: `# GD&T — Geometric Dimensioning & Tolerancing

## Why GD&T?

Regular ± tolerances only control **size**. But parts also need to be **flat**, **straight**, **round**, and in the **right position**. GD&T controls geometry.

## The Feature Control Frame

The rectangular box that contains GD&T information:

\`[⊕ | ⌀0.050 | A | B | C ]\`

Reading left to right:
1. **Geometric symbol** (⊕ = position)
2. **Tolerance value** (⌀0.050mm)
3. **Primary datum** (A)
4. **Secondary datum** (B)
5. **Tertiary datum** (C)

## The 14 Geometric Controls

### Form (no datum needed)
- **⏤** Flatness — surface stays within a flat zone
- **⏤** Straightness — line stays within a straight zone
- **○** Circularity — cross-section stays within two concentric circles
- **⌭** Cylindricity — entire cylinder stays within two coaxial cylinders

### Orientation (needs datum)
- **⊥** Perpendicularity — surface is 90° to datum
- **∥** Parallelism — surface is parallel to datum
- **∠** Angularity — surface at specified angle to datum

### Location (needs datum)
- **⊕** Position — feature center within tolerance zone
- **◎** Concentricity — center points within tolerance zone
- **⌯** Symmetry — median points within tolerance zone

### Runout (needs datum)
- **↗** Circular runout — single cross-section variation during rotation
- **↗↗** Total runout — entire surface variation during rotation

### Profile
- **⌒** Profile of a line — 2D cross-section shape
- **⌓** Profile of a surface — 3D surface shape

## Datums
**Datums** are reference features (usually flat surfaces or bores) from which all GD&T measurements are taken.

- **Datum A** = primary (3 contact points, most stable surface)
- **Datum B** = secondary (2 contact points)
- **Datum C** = tertiary (1 contact point)

This is the **3-2-1 rule** — fully constrains the part in space.` }] }],

  10: [{ id: `${CID}-m10-l1`, moduleId: `${CID}-mod-10`, title: "GD&T Form Controls", order: 1, content: [{ type: "text",
    body: `# GD&T Form Controls

Form controls don't need datums — they control a feature against itself.

## Flatness (⏤)
The surface must lie between two parallel planes separated by the tolerance value.

**[⏤ | 0.025]** = surface flatness within 0.025mm

**How to measure**: Place part on surface plate, sweep with indicator. Total indicator reading (TIR) must be ≤ 0.025mm.

**Machining impact**: Face milling produces ~0.02-0.05mm flatness. Grinding: ~0.005mm. Lapping: ~0.001mm.

## Straightness (⏤ on an edge)
An element (line) on a surface must be straight within the tolerance.

**[⏤ | 0.010]** on a shaft = any lengthwise line within 0.010mm

## Circularity (○)
Any cross-section of a cylinder or sphere must be round within the tolerance.

**[○ | 0.015]** = each cross-section between two concentric circles 0.015mm apart

**How to measure**: V-block + indicator, rotate part 360°. Half the TIR ≈ circularity.

## Cylindricity (⌭)
The entire cylinder (not just one cross-section) must be between two coaxial cylinders.

**[⌭ | 0.020]** = entire surface within 0.020mm zone

This is the **tightest form control** — controls roundness, straightness, and taper simultaneously.

**Hierarchy**: Cylindricity controls circularity, straightness, and taper. If cylindricity is specified, you don't need the others separately.` }] }],

  11: [{ id: `${CID}-m11-l1`, moduleId: `${CID}-mod-11`, title: "GD&T Position", order: 1, content: [{ type: "text",
    body: `# GD&T Location — True Position

## Position (⊕) — The Most Common GD&T Symbol

Controls where a feature is located relative to datums.

**[⊕ | ⌀0.050 | A | B | C]**
= feature center must be within a ⌀0.050mm cylinder relative to datums A, B, C

## Why Position Instead of ±?

With ± tolerancing: 50.0 ±0.025 in X AND 50.0 ±0.025 in Y
= creates a **square** tolerance zone (0.050 × 0.050mm)
= corners of the square allow more error than sides

With position ⌀0.050: creates a **circular** tolerance zone
= 57% more area than the square → more good parts accepted
= equal tolerance in all directions (makes more sense for holes)

## Material Condition Modifiers

### MMC (Ⓜ) — Maximum Material Condition
"The feature has the most material possible"
- Hole at MMC = smallest hole
- Shaft at MMC = largest shaft
- **Bonus tolerance**: as the feature departs from MMC, you get extra position tolerance

### LMC (Ⓛ) — Least Material Condition
Opposite of MMC. Rarely used.

### RFS (default) — Regardless of Feature Size
No modifier = tolerance applies at all sizes. No bonus.

## Calculating True Position

Actual position deviation:

$$TP = 2 \\times \\sqrt{\\Delta X^2 + \\Delta Y^2}$$

Where ΔX and ΔY are deviations from nominal in each axis.

**Example**: Hole is 0.015mm off in X, 0.020mm off in Y:
TP = 2 × √(0.015² + 0.020²) = 2 × √(0.000625) = 2 × 0.025 = **0.050mm**

If specification is ⌀0.050 → **exactly at the limit!**` }] }],

  12: [{ id: `${CID}-m12-l1`, moduleId: `${CID}-mod-12`, title: "GD&T Orientation & Runout", order: 1, content: [{ type: "text",
    body: `# GD&T Orientation & Runout

## Perpendicularity (⊥)
Surface or axis must be 90° to the datum within the tolerance.

**[⊥ | 0.020 | A]** = surface perpendicular to datum A within 0.020mm

**Machining impact**: Square shoulders, bore axes perpendicular to a face.

## Parallelism (∥)
Surface must be parallel to datum within the tolerance.

**[∥ | 0.015 | A]** = surface parallel to datum A within 0.015mm

**Machining impact**: Top and bottom faces of a plate. Measured by flipping part on surface plate.

## Angularity (∠)
Surface at specified angle to datum.

**[∠ | 0.025 | A]** at 30° = surface at 30° ±within 0.025mm zone

## Circular Runout (↗)
How much a surface varies when rotated 360° around a datum axis. Single cross-section.

**[↗ | 0.030 | A]** = mount on datum A axis, rotate, indicator stays within 0.030mm TIR

**Use**: Checking concentricity of turned diameters, face runout of flanges.

## Total Runout (↗↗)
Like circular runout but checks the ENTIRE surface (all cross-sections simultaneously).

**[↗↗ | 0.050 | A-B]** = surface checked along full length while rotating on A-B axis

**Use**: Critical bearing seats, seal surfaces, precision shafts.

## Practical GD&T Priority for Machinists

| What to Check First | Why |
|---------------------|-----|
| **Position of holes** | Most common GD&T callout by far |
| **Perpendicularity** | Square shoulders, bore-to-face relationship |
| **Runout** | Turned parts, anything that rotates |
| **Flatness** | Mating surfaces, sealing faces |
| **Parallelism** | Plate parts, top/bottom relationship |

Master these 5 and you'll handle 90% of GD&T on shop drawings.` }] }],

  13: [{ id: `${CID}-m13-l1`, moduleId: `${CID}-mod-13`, title: "Citation Discipline — Drafting Standards Edition", order: 1, content: [{ type: "text",
    body: `# Citation Discipline — Blueprint Reading & GD&T

**Prerequisite:** Modules 1-12 of this course (you should already recognize the symbols being cited).
**Learning objective:** For every GD&T symbol, dimension callout, and surface-finish mark on a drawing, identify the *standard* (ASME or ISO) that defines its meaning. A drawing without a referenced standard is ambiguous — and ambiguous drawings end in scrap.
**Assessment:** Pull a real shop drawing. Find its title-block "interpret per" or "drawn to" clause. If absent → that drawing has no traceable interpretation rules.

## Why Drafting Needs a Cited Standard

The same symbol (⊕, ⌖, ▱) means slightly different things under different standards. **ASME Y14.5-2009 vs ASME Y14.5-2018** changed the symbology for surface texture, the rules for composite position tolerance, and the default tolerance interpretation. **ISO 1101 vs ASME Y14.5** disagree on default modifiers (independency principle vs envelope principle, Rule #1). If a drawing doesn't cite which standard governs, two inspectors can both correctly call the same part PASS and FAIL.

## The Citation Pattern (Drafting Variant)

\`<symbol/rule/callout> [per <standard>, <year/revision>, <clause or paragraph>]\`

Examples revisiting earlier modules of THIS course with explicit standards:

- **"⊕ Position (true position) feature control frame"** [per ASME Y14.5-2018, §7.4 (Position) — issuing body: ASME. Mathematical basis: ASME Y14.5.1M-1994 (re-affirmed 2012).]
- **"True position calculation TP = 2 × √(ΔX² + ΔY²)"** [per ASME Y14.5.1M, §6.3.4 (radial deviation to diametric tolerance) — the factor of 2 converts radial to diametric.]
- **"Datum reference frame (A | B | C)"** [per ASME Y14.5-2018, §4 (Datum Reference Frames) — or ISO 5459:2011 for ISO drawings.]
- **"Default tolerance interpretation"** [per ASME Y14.5-2018, §2.1.1.3 (Rule #1 — Taylor's Principle / Envelope Principle) — *NOTE: ISO uses Independency Principle by default; the GG&T standard cited in the title block determines which rule applies.*]
- **"Surface roughness symbol ∇ with Ra value"** [per ASME Y14.36M-1996 (R2008) for the symbol itself + ASME B46.1-2019 for the surface-texture parameters (Ra, Rz, etc.) — *or* ISO 1302:2002 for ISO drawings.]
- **"Thread callout 1/4-20 UNC-2B"** [per ASME B1.1 (Unified Inch Screw Threads) — 2B = tolerance class. For metric: M6 × 1 - 6H per ISO 261.]
- **"Hole tolerance class H7"** [per ISO 286-2:2010, *Geometrical product specifications — ISO code system for tolerances on linear sizes* — clause 7.]
- **"Section line spacing + angle"** [per ASME Y14.2-2014, §6 (Section Lines / Hatching).]

## Doctrine vs Technique vs Reference (Drafting Lens)

| Category | In drafting | Examples |
|----------|-------------|----------|
| **Doctrine** | Standards that govern *every* drawing in your shop. | The shop's chosen base standard (e.g., "ASME Y14.5-2018 unless noted otherwise") + Rule #1 vs Independency Principle |
| **Technique** | Procedure to derive the inspection plan from the drawing. | Reading a feature control frame left-to-right · Building a tolerance stack · Deriving the part-coordinate system from the datum reference frame |
| **Reference** | Symbol-by-symbol, callout-by-callout meaning. Look up the latest revision when in doubt. | ASME Y14.5 symbol glossary · ISO 1101 symbol glossary · Surface-finish parameter definitions (Ra vs Rz vs Rt) |

## The Drawing-Ambiguity Failure Mode

A real scenario: a customer drawing shows a hole position callout ⊕ 0.05 | A | B | C. Inspection at supplier A uses ASME Y14.5-2009 (composite position rules); inspection at supplier B uses ASME Y14.5-2018 (which changed the composite-tolerance interpretation). Both inspectors measure the same parts and arrive at different verdicts. The customer audits supplier B and finds the parts non-conforming — but they conform under the standard the drawing was *originally drawn to* (2009). The drawing's title block didn't cite the revision; ambiguity caused real scrap.

**Floor rule:** *if the title block doesn't cite the drafting standard + revision, query the drawing back to engineering before machining a single chip.* The cost of one round-trip query is always less than the cost of a misinterpreted GD&T callout.

## Practice (Assessment)

Open the next real shop drawing you encounter and audit its title block:

1. What **base drafting standard** is cited? (e.g., "ASME Y14.5-2018", "ISO 8015 + ISO 1101")
2. If GD&T appears, is the **standard revision** explicit?
3. Is **Rule #1 / Envelope Principle** stated or implied? (Often noted as "unless otherwise specified, dimensions apply per ASME Y14.5 Rule #1")
4. Is the **surface-finish standard** explicit (ASME Y14.36M vs ISO 1302)?

If any answer is *missing* → that drawing has interpretation debt. Flag it; query engineering; do not assume the latest revision unless told.` }] }],
};

// Quizzes
export const COURSE_0C_QUIZZES: Record<string, Question[]> = {
  [`${CID}-mod-2-quiz`]: [
    {
      id: "c0c-q1", type: "multiple_choice", difficulty: 1,
      text: "In 3rd angle projection, where is the top view placed relative to the front view?",
      options: [
        { id: "a", text: "Below", isCorrect: false },
        { id: "b", text: "Above", isCorrect: true },
        { id: "c", text: "To the right", isCorrect: false },
        { id: "d", text: "To the left", isCorrect: false },
      ],
      explanation: "In 3rd angle projection (US/UK standard), the top view is placed ABOVE the front view.",
      tags: ["blueprint", "orthographic"],
    },
  ],
  [`${CID}-mod-5-quiz`]: [
    {
      id: "c0c-q2", type: "multiple_choice", difficulty: 2,
      text: "A dimension reads 25.000 +0.025/-0.000. What is the maximum acceptable size?",
      options: [
        { id: "a", text: "25.025mm", isCorrect: true },
        { id: "b", text: "25.050mm", isCorrect: false },
        { id: "c", text: "25.000mm", isCorrect: false },
        { id: "d", text: "24.975mm", isCorrect: false },
      ],
      explanation: "Unilateral tolerance: 25.000 + 0.025 = 25.025mm maximum.",
      tags: ["tolerance", "unilateral"],
    },
  ],
  [`${CID}-mod-9-quiz`]: [
    {
      id: "c0c-q3", type: "multiple_choice", difficulty: 2,
      text: "What does ⊕ mean in a GD&T feature control frame?",
      options: [
        { id: "a", text: "Flatness", isCorrect: false },
        { id: "b", text: "Concentricity", isCorrect: false },
        { id: "c", text: "Position (true position)", isCorrect: true },
        { id: "d", text: "Perpendicularity", isCorrect: false },
      ],
      explanation: "⊕ = Position — the most commonly used GD&T symbol. Controls where a feature is located relative to datums.",
      tags: ["gdt", "position"],
    },
  ],
  [`${CID}-mod-11-quiz`]: [
    {
      id: "c0c-q4", type: "calculation", difficulty: 3,
      text: "A hole is 0.012mm off in X and 0.016mm off in Y from nominal position. Calculate true position.\n\nTP = 2 × √(ΔX² + ΔY²)",
      correctAnswer: 0.040, tolerance: 5,
      explanation: "TP = 2 × √(0.012² + 0.016²) = 2 × √(0.000144 + 0.000256) = 2 × √0.0004 = 2 × 0.02 = 0.040mm",
      tags: ["gdt", "position", "calculation"],
    },
  ],
  [`${CID}-mod-13-quiz`]: [
    {
      id: "c0c-q5", type: "multiple_choice", difficulty: 2,
      text: "A drawing arrives with no revision noted on its base drafting standard — title block just says 'ASME Y14.5'. The position callout ⊕ 0.05 | A | B | C governs a critical interface hole. What is the correct lima-discipline action?",
      options: [
        { id: "a", text: "Machine to current shop default (latest ASME Y14.5)", isCorrect: false,
          explanation: "Defaulting to latest revision changes the composite-tolerance interpretation vs 2009/2018; this can flip pass/fail." },
        { id: "b", text: "Query engineering for the governing revision before machining", isCorrect: true },
        { id: "c", text: "Inspect to both revisions and use whichever passes", isCorrect: false,
          explanation: "This is biasing toward acceptance, not toward interpretation truth. The standard governs both manufacturing AND inspection rules." },
        { id: "d", text: "Skip the GD&T callout and machine to the basic dimension only", isCorrect: false,
          explanation: "Ignoring the feature control frame is interpretation by omission — exactly what the citation rule exists to prevent." },
      ],
      explanation: "Citation: per the lima soul mandate (cite at claim) + ASME Y14.5 itself (which has materially different composite-tolerance rules between revisions). A round-trip query to engineering always costs less than misinterpreted GD&T.",
      tags: ["citation_discipline", "gdt", "drafting_standards", "interpretation"],
    },
  ],
};

// Module Assembly
const mk = (i: number, t: string, m: number): Module => ({
  id: `${CID}-mod-${i}`, courseId: CID, title: t,
  description: `${t} — Blueprint Reading & GD&T`, order: i,
  lessons: lessons[i] ?? [],
  quiz: {
    id: `${CID}-mod-${i}-quiz`, moduleId: `${CID}-mod-${i}`,
    questions: COURSE_0C_QUIZZES[`${CID}-mod-${i}-quiz`] ?? [],
    passingScore: 70,
  },
  estimatedMinutes: m,
});

export const COURSE_0C_MODULES: Module[] = [
  mk(1, "What is a Blueprint?", 40),
  mk(2, "Orthographic Projection", 50),
  mk(3, "Isometric & Section Views", 45),
  mk(4, "Dimensioning Basics", 40),
  mk(5, "Tolerancing", 50),
  mk(6, "Surface Finish Symbols", 35),
  mk(7, "Thread Callouts", 40),
  mk(8, "Hole Callouts", 45),
  mk(9, "GD&T Introduction", 60),
  mk(10, "GD&T Form Controls", 50),
  mk(11, "GD&T Location Controls", 55),
  mk(12, "GD&T Orientation & Runout", 50),
  mk(13, "Citation Discipline — Drafting Standards Edition", 40),
];
