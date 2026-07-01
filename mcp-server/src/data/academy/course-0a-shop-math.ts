/**
 * Course 0A: Shop Math for Machinists
 * Level: Novice (absolute beginner) | 8 Modules | ~6 hours
 *
 * No math knowledge assumed. Every concept taught with
 * machining examples — "What's the circumference of a 12mm
 * end mill?" not "What's the circumference of a circle?"
 */

import type { Module, Lesson, Question } from
  "../../engines/CurriculumEngine.js";

const CID = "course-0a";

const mod1: Lesson[] = [{
  id: `${CID}-m1-l1`, moduleId: `${CID}-mod-1`,
  title: "Numbers & Decimals in the Shop", order: 1,
  content: [{
    type: "text",
    body: `# Numbers & Decimals

## Why Decimals Matter in Machining

Every dimension on a CNC machine is a decimal number. When the print says **25.400 mm**, the machine moves exactly that far — not 25.4, not 25.40, but 25.400.

## Place Values (Machining Context)

| Digits | What It Means | Machining Example |
|--------|--------------|-------------------|
| 25. | Whole mm | Rough stock size |
| 25.4 | Tenths (0.1mm) | General machining tolerance |
| 25.40 | Hundredths (0.01mm) | Precision tolerance |
| 25.400 | Thousandths (0.001mm = 1µm) | Grinding tolerance |

## Reading Decimal Numbers

Practice reading these like a machinist:
- **0.125** = "one twenty-five thou" (in inches) or "point one two five"
- **3.175** = "three point one seven five millimeters"
- **12.700** = "twelve point seven zero zero" (NOT "twelve point seven hundred")

## Adding & Subtracting Decimals

**Line up the decimal points!**

Stock is 25.400mm. You need to remove 3.175mm.
\`\`\`
  25.400
-  3.175
--------
  22.225 mm remaining
\`\`\`

## Multiplying Decimals

Feed per tooth × number of teeth × RPM = feed rate:
\`\`\`
0.08 × 4 × 5000 = 1600 mm/min
\`\`\`
Count total decimal places in the inputs (2) → put that many in the answer.

## The Zero Trap

**0.5** and **0.050** are NOT the same!
- 0.5 mm = 500 µm (half a millimeter)
- 0.050 mm = 50 µm (fifty microns)
- A machinist who confuses these scraps a $500 part`,
  }],
}];

const mod2: Lesson[] = [{
  id: `${CID}-m2-l1`, moduleId: `${CID}-mod-2`,
  title: "Fractions — The Language of Inch Drawings", order: 1,
  content: [{
    type: "text",
    body: `# Fractions & Conversions

## Why Fractions?

Inch-based drawings use fractions everywhere: 1/4" bolts, 3/8" stock, 5/16-18 screws. You MUST convert between fractions and decimals fluently.

## The Conversion Table (Memorize These)

| Fraction | Decimal (inches) | mm |
|----------|-----------------|-----|
| 1/64 | 0.0156 | 0.397 |
| 1/32 | 0.0313 | 0.794 |
| 1/16 | 0.0625 | 1.588 |
| 1/8 | 0.125 | 3.175 |
| 3/16 | 0.1875 | 4.763 |
| 1/4 | 0.250 | 6.350 |
| 5/16 | 0.3125 | 7.938 |
| 3/8 | 0.375 | 9.525 |
| 7/16 | 0.4375 | 11.113 |
| 1/2 | 0.500 | 12.700 |
| 5/8 | 0.625 | 15.875 |
| 3/4 | 0.750 | 19.050 |
| 7/8 | 0.875 | 22.225 |
| 1 | 1.000 | 25.400 |

## How to Convert: Fraction → Decimal

**Divide the top by the bottom:**
- 3/8 = 3 ÷ 8 = **0.375**
- 7/16 = 7 ÷ 16 = **0.4375**

## The Magic Number: 25.4

**1 inch = 25.4 mm** (exact)

- Inches to mm: multiply by 25.4
- mm to inches: divide by 25.4

**Example**: 3/4" bolt = 0.750 × 25.4 = **19.05 mm**`,
  }],
}];

const mod3: Lesson[] = [{
  id: `${CID}-m3-l1`, moduleId: `${CID}-mod-3`,
  title: "The Metric System — Modern Machining", order: 1,
  content: [{
    type: "text",
    body: `# The Metric System

## The Units That Matter

| Unit | Symbol | Size | Use in Machining |
|------|--------|------|-----------------|
| Meter | m | ~39 inches | Machine travel specs |
| Millimeter | mm | 0.001m = ~0.040" | ALL dimensions |
| Micrometer | µm | 0.001mm | Surface finish, precision |

## Quick Conversions

- **1 mm** = 0.03937 inches ≈ **about 0.040"**
- **1 inch** = **25.4 mm** exactly
- **1 µm** = 0.001 mm = 0.000039" ≈ **about 40 millionths**

## Metric Prefixes in the Shop

| Prefix | Symbol | Factor | Example |
|--------|--------|--------|---------|
| kilo- | k | 1000 | kW (kilowatt = 1000 watts) |
| milli- | m | 0.001 | mm (millimeter) |
| micro- | µ | 0.000001 | µm (surface finish) |

## When to Use Metric vs Imperial

- **Metric**: Most modern CNC machines, European/Asian drawings, ISO standards
- **Imperial**: Legacy US drawings, many US shops, tap drill charts
- **Both**: You WILL encounter both. Learn to switch instantly.

## Practical: Common Metric Sizes

| What | Typical Metric Size |
|------|-------------------|
| End mill diameters | 3, 4, 5, 6, 8, 10, 12, 16, 20, 25 mm |
| Drill sizes | 3.3, 4.2, 5.0, 6.8, 8.5, 10.2 mm |
| Stock sizes | 25, 30, 40, 50, 75, 100 mm |
| Bolt sizes | M3, M4, M5, M6, M8, M10, M12, M16, M20 |`,
  }],
}];

const mod4: Lesson[] = [{
  id: `${CID}-m4-l1`, moduleId: `${CID}-mod-4`,
  title: "Geometry — Circles, Angles, Triangles", order: 1,
  content: [{
    type: "text",
    body: `# Basic Geometry for Machinists

## Circles (You'll Use This Every Day)

Every cutting tool is a circle. Every bore is a circle. Every arc move is a circle.

- **Diameter (D)** = distance across the circle through the center
- **Radius (R)** = half the diameter (R = D/2)
- **Circumference (C)** = distance around the circle = **π × D**
- **π (pi)** = 3.14159 (memorize at least 3.14)

**Machining example**: A 12mm end mill spinning at 5000 RPM. How fast is the cutting edge moving?

C = π × 12 = 37.7mm per revolution
Speed = 37.7 × 5000 = 188,500 mm/min = **188.5 m/min** ← this is your cutting speed (Vc)!

## Angles

- Full circle = **360°**
- Right angle = **90°** (square corner)
- **45°** = half a right angle (chamfer angle)
- **30°/60°** = common helix angles on end mills

## Triangles (The Secret of Machining Math)

The **right triangle** is the most important shape in machining:
- One angle is always 90°
- Used for: bolt circles, tapers, angular features, trig

**Pythagorean theorem**: a² + b² = c²

**Machining example**: A pocket is 30mm wide and 40mm long. What's the diagonal? √(30² + 40²) = √(900 + 1600) = √2500 = **50mm**`,
  }],
}];

const mod5: Lesson[] = [{
  id: `${CID}-m5-l1`, moduleId: `${CID}-mod-5`,
  title: "Area & Volume — Stock Size and Material", order: 1,
  content: [{
    type: "text",
    body: `# Area & Volume

## Why You Need This

- **Area** = how much material the tool removes per pass
- **Volume** = raw stock size, material weight, MRR

## Area Formulas

| Shape | Formula | Machining Use |
|-------|---------|--------------|
| Rectangle | A = L × W | Face milling area, pocket floor |
| Circle | A = π × R² = π × D²/4 | Bore cross-section, drill area |
| Triangle | A = ½ × base × height | Chamfer cross-section |

## Volume Formulas

| Shape | Formula | Machining Use |
|-------|---------|--------------|
| Box | V = L × W × H | Rectangular stock size |
| Cylinder | V = π × R² × H | Round bar stock |

## Material Removal Rate (MRR)

**MRR = ap × ae × Vf** (mm³/min)

This tells you how fast you're removing material — critical for:
- Estimating cycle time
- Checking spindle power
- Comparing strategies

**Example**: ap=3mm, ae=6mm, Vf=1200mm/min
MRR = 3 × 6 × 1200 = **21,600 mm³/min = 21.6 cm³/min**

## Material Weight

Weight = Volume × Density

| Material | Density (g/cm³) | kg per 100×100×100mm block |
|----------|----------------|---------------------------|
| Aluminum | 2.7 | 2.7 kg |
| Steel | 7.85 | 7.85 kg |
| Titanium | 4.43 | 4.43 kg |
| Brass | 8.5 | 8.5 kg |`,
  }],
}];

const mod6: Lesson[] = [{
  id: `${CID}-m6-l1`, moduleId: `${CID}-mod-6`,
  title: "Ratios & Percentages — Overrides and Mixes",
  order: 1,
  content: [{
    type: "text",
    body: `# Ratios & Percentages

## Feed Override

The feed override knob on the controller adjusts feed rate by percentage:
- **100%** = programmed feed (normal)
- **50%** = half speed (cautious first run)
- **120%** = 20% faster (operator pushing for cycle time)

**Calculation**: Actual feed = Programmed feed × Override%

If programmed feed is 1200 mm/min at 80% override:
Actual = 1200 × 0.80 = **960 mm/min**

## Coolant Concentration

Coolant concentrate is mixed with water:
- **5% concentration** = 5 parts concentrate per 100 parts total
- In a 200-liter sump: 200 × 0.05 = **10 liters concentrate**

## Scrap Rate

If you make 100 parts and 3 are bad:
Scrap rate = 3/100 = **3%**
Yield = 97/100 = **97%**

## Tolerance as Percentage

A dimension of 25.000 ±0.025mm:
Tolerance band = 0.050mm
As % of nominal = 0.050/25.000 × 100 = **0.2%**

## L/D Ratio (Stick-Out Ratio)

Tool length ÷ tool diameter:
- 30mm stick-out ÷ 10mm diameter = **L/D = 3** (good)
- 60mm ÷ 10mm = **L/D = 6** (deflection risk!)

Rule: Keep L/D ≤ 3 for finishing, ≤ 5 for roughing.`,
  }],
}];

const mod7: Lesson[] = [{
  id: `${CID}-m7-l1`, moduleId: `${CID}-mod-7`,
  title: "Basic Algebra — Solving Machining Formulas",
  order: 1,
  content: [{
    type: "text",
    body: `# Basic Algebra for Machinists

## Why Algebra?

Every speed/feed formula requires plugging in numbers and solving. You need to be comfortable rearranging formulas.

## Substitution (Plug and Solve)

**RPM formula**: RPM = (Vc × 1000) / (π × D)

Given: Vc = 200 m/min, D = 12mm

RPM = (200 × 1000) / (3.14159 × 12)
RPM = 200,000 / 37.7
RPM = **5,305**

## Solving for an Unknown

Sometimes you know the RPM and need to find the required Vc:

RPM = (Vc × 1000) / (π × D)

Rearrange: **Vc = (RPM × π × D) / 1000**

Given: RPM = 8000, D = 10mm
Vc = (8000 × 3.14159 × 10) / 1000
Vc = 251,327 / 1000 = **251 m/min**

## Order of Operations (PEMDAS)

**P**arentheses → **E**xponents → **M**ultiply/**D**ivide → **A**dd/**S**ubtract

Fc = kc1.1 × ap × fz^(1-mc)

Step 1: (1 - mc) = (1 - 0.25) = 0.75
Step 2: fz^0.75 = 0.1^0.75 = 0.178
Step 3: kc1.1 × ap = 1500 × 3 = 4500
Step 4: 4500 × 0.178 = **800 N**

## Unit Cancellation

Cutting power: P = (Fc × Vc) / 60,000

Units: (N × m/min) / 60,000 = N·m/min ÷ 60,000 = **kW**

Always check that your answer has the right units!`,
  }],
}];

const mod8: Lesson[] = [{
  id: `${CID}-m8-l1`, moduleId: `${CID}-mod-8`,
  title: "Trigonometry — Angles, Tapers, Bolt Circles",
  order: 1,
  content: [{
    type: "text",
    body: `# Trigonometry for Machinists

## The Big Three

For a right triangle with angle θ:
- **sin(θ)** = opposite / hypotenuse
- **cos(θ)** = adjacent / hypotenuse
- **tan(θ)** = opposite / adjacent

**Memory trick**: **SOH-CAH-TOA**

## Machining Application 1: Taper Angle

A tapered part goes from ⌀30mm to ⌀20mm over 50mm length.

Taper per side = (30-20)/2 = 5mm
tan(θ) = 5/50 = 0.1
θ = arctan(0.1) = **5.71°**

## Machining Application 2: Bolt Circle

6 holes equally spaced on a ⌀50mm bolt circle:
- Angle between holes = 360°/6 = 60°
- Hole 1: X = 25 × cos(0°) = 25.000, Y = 25 × sin(0°) = 0.000
- Hole 2: X = 25 × cos(60°) = 12.500, Y = 25 × sin(60°) = 21.651
- Hole 3: X = 25 × cos(120°) = -12.500, Y = 25 × sin(120°) = 21.651

## Machining Application 3: Chamfer Depth

A 45° chamfer, 1mm deep:
- Width = depth × tan(45°) = 1 × 1 = 1mm (45° makes it easy!)

A 30° chamfer, 1mm deep:
- Width = 1 × tan(30°) = 1 × 0.577 = **0.577mm**

## Common Angles to Know

| Angle | sin | cos | tan | Where You See It |
|-------|-----|-----|-----|-----------------|
| 30° | 0.500 | 0.866 | 0.577 | Helix angle, dovetails |
| 45° | 0.707 | 0.707 | 1.000 | Chamfers, center drills |
| 60° | 0.866 | 0.500 | 1.732 | Thread profile, hexagons |
| 90° | 1.000 | 0.000 | ∞ | Square shoulders |`,
  }],
}];

const mod9: Lesson[] = [{
  id: `${CID}-m9-l1`, moduleId: `${CID}-mod-9`,
  title: "Citation Discipline & Source Attribution",
  order: 1,
  content: [{
    type: "text",
    body: `# Citation Discipline — Shop Math Edition

**Prerequisite:** Modules 1-8 of this course (you should already recognize the formulas being cited).
**Learning objective:** Recognize *which* shop-math claims need a source, *how* to format a citation at the claim, and *why* uncited rules cause silent failures on the floor.
**Assessment:** Take any claim from modules 1-8 and write its full citation. If you cannot, that is a curriculum-debt item — escalate.

## Why Citations Matter on the Shop Floor

A speed/feed claim without a source is an opinion. An opinion can wreck a tool, scrap a part, or hurt an operator. On the shop floor — and in the academy that trains shop-floor workers — every claim that affects an outcome must be traceable to a source.

**Lima (the canonical academy slot) discipline:**
> *Cite sources at the claim, not in a bibliography. Distinguish doctrine (memorize) from technique (derive) from reference (look up).*

## The Citation Pattern

\`<claim> [per <source>, <year>, <page/clause>]\`

Examples revisiting earlier modules of THIS course with explicit sources:

- **"1 inch = 25.400 mm exactly"** [per International Yard and Pound Agreement, 1959 — ratified by US, UK, Canada, Australia, New Zealand, South Africa. Reference: Frank B. Schwab, *Refinement of values for the yard and the pound*, NBS Journal of Research, 1959.]
- **"Kienzle cutting-force equation: Fc = kc1.1 × ap × fz^(1-mc)"** [per Kienzle, O., 1952. *Die Bestimmung von Kräften und Leistungen an spanenden Werkzeugen und Werkzeugmaschinen.* VDI-Zeitschrift 94 (11-12): 299-305. PRISM-specific kc1.1 values per ISO group live in \`mcp-server/src/physics/constants.ts\` (canonical: P=1800, M=2100, K=1100, N=700, S=2800, H=3200).]
- **"L/D ≤ 3 for finishing, L/D ≤ 5 for roughing"** [per Sandvik Coromant, *Modern Metal Cutting* handbook, machining theory chapter — page references vary by region/edition; verify against your shop's copy on the rack.]
- **"RPM = (Vc × 1000) / (π × D)"** [per ISO 3002-1:1982, *Basic quantities in cutting and grinding* — clause 4 (spindle speed definition).]
- **"0.05 (5%) coolant concentration for general machining"** [per supplier MSDS for the specific coolant; PRISM JM Die default profile in \`src/data/jm-die-profile.ts\`. Always defer to the supplier — coolant concentrations are vendor-specific, not universal.]

## Doctrine vs Technique vs Reference

A claim's category tells you how to handle it on the floor:

| Category | Definition | Lookup behavior | Examples |
|----------|-----------|----------------|----------|
| **Doctrine** | Universal constants and rules. Memorize cold. | Recall instantly | 1 inch = 25.4 mm · SOH-CAH-TOA · PEMDAS · 360°/N for bolt-circle spacing |
| **Technique** | Procedures derived each time from inputs. | Re-derive from formula | Plug values into Kienzle · Rearrange RPM = Vc×1000/(πD) to solve for Vc · Decimal subtraction with aligned decimal points |
| **Reference** | Tables and values that change by material/tool/standard. | Look up every time | kc1.1 per ISO material group · Thread-pitch tables · Coolant concentration per supplier MSDS · G-code syntax per controller dialect |

Confusing the categories wastes time and creates risk. Trying to memorize every kc1.1 value is brittle (wrong values cause force-prediction failures); looking up SOH-CAH-TOA every day is slow (and a signal of incomplete training).

## The Silent-Failure Mode

A class of shop-floor mistakes comes from **inherited rules without sources**. Someone says "always run aluminum at 1000 SFM" — but *where does that come from*? What grade of aluminum (6061? 7075? cast 380?)? What tool coating? What machine rigidity? Without the source, the rule can't be debugged when chips load up, can't be updated when the alloy changes, and can't survive a coolant or tool-substrate swap.

**Floor rule:** *if you can't cite it, you can't defend it. If you can't defend it, you can't ship it as curriculum or as a setup sheet.*

## Practice (Assessment)

Pick any claim from modules 1-8 of this course (e.g., "Keep L/D ≤ 3 for finishing"). Write the full citation in the pattern above. If you cannot identify the source, that is a **curriculum-debt** item — flag it for the academy maintainers (lima soul mandate: *"promoting an uncited claim to a curriculum → reject, demand source"*).

Successful completion of this module means: the next time you read a shop-floor instruction, you ask *"per what source?"* before you trust it.`,
  }],
}];

// ═══════════════════════════════════════════════════════════
// Quizzes
// ═══════════════════════════════════════════════════════════

export const COURSE_0A_QUIZZES: Record<string, Question[]> = {
  [`${CID}-mod-1-quiz`]: [
    {
      id: "c0a-q1", type: "multiple_choice", difficulty: 1,
      text: "Which is larger: 0.5mm or 0.050mm?",
      options: [
        { id: "a", text: "0.5mm", isCorrect: true,
          explanation: "0.5 = 0.500, which is 10× larger than 0.050" },
        { id: "b", text: "0.050mm", isCorrect: false },
        { id: "c", text: "They are the same", isCorrect: false },
      ],
      explanation: "0.5mm = 500µm, 0.050mm = 50µm. Trailing zeros matter!",
      tags: ["decimals", "math"],
    },
  ],
  [`${CID}-mod-2-quiz`]: [
    {
      id: "c0a-q2", type: "calculation", difficulty: 1,
      text: "Convert 3/8 inch to decimal inches.",
      correctAnswer: 0.375, tolerance: 1,
      explanation: "3 ÷ 8 = 0.375",
      tags: ["fractions", "conversion"],
    },
    {
      id: "c0a-q3", type: "calculation", difficulty: 2,
      text: "Convert 3/4 inch to millimeters. (1 inch = 25.4mm)",
      correctAnswer: 19.05, tolerance: 1,
      explanation: "3/4 = 0.750 inches. 0.750 × 25.4 = 19.05mm",
      tags: ["fractions", "metric", "conversion"],
    },
  ],
  [`${CID}-mod-4-quiz`]: [
    {
      id: "c0a-q4", type: "calculation", difficulty: 2,
      text: "What is the circumference of a 16mm end mill? Use π = 3.14159",
      correctAnswer: 50.27, tolerance: 2,
      explanation: "C = π × D = 3.14159 × 16 = 50.27mm",
      tags: ["geometry", "circumference"],
    },
  ],
  [`${CID}-mod-7-quiz`]: [
    {
      id: "c0a-q5", type: "calculation", difficulty: 2,
      text: "Calculate RPM for a 10mm tool at Vc = 250 m/min.\nRPM = (Vc × 1000) / (π × D)",
      correctAnswer: 7958, tolerance: 2,
      explanation: "RPM = (250 × 1000) / (3.14159 × 10) = 7958",
      tags: ["algebra", "rpm", "speed_feed"],
    },
  ],
  [`${CID}-mod-8-quiz`]: [
    {
      id: "c0a-q6", type: "calculation", difficulty: 2,
      text: "6 holes on a ⌀40mm bolt circle. What is the Y coordinate of hole 2 (at 60°)?\nY = R × sin(60°), sin(60°) = 0.866",
      correctAnswer: 17.32, tolerance: 2,
      explanation: "R = 40/2 = 20. Y = 20 × 0.866 = 17.32mm",
      tags: ["trig", "bolt_circle"],
    },
  ],
  [`${CID}-mod-9-quiz`]: [
    {
      id: "c0a-q7", type: "calculation", difficulty: 1,
      text: "Convert 3.500 inches to millimeters using the canonical conversion factor (per International Yard and Pound Agreement, 1959).",
      correctAnswer: 88.9, tolerance: 0.1,
      explanation: "3.500 × 25.4 = 88.900 mm. Citation: International Yard and Pound Agreement, 1959 — '1 inch = 25.4 mm exactly' is a defined value, not a measured one.",
      tags: ["citation_discipline", "unit_conversion", "doctrine"],
    },
  ],
};

// Module Assembly
const mk = (
  i: number, t: string, l: Lesson[], m: number
): Module => ({
  id: `${CID}-mod-${i}`, courseId: CID, title: t,
  description: `${t} — Shop Math`, order: i,
  lessons: l,
  quiz: {
    id: `${CID}-mod-${i}-quiz`, moduleId: `${CID}-mod-${i}`,
    questions: COURSE_0A_QUIZZES[`${CID}-mod-${i}-quiz`] ?? [],
    passingScore: 70,
  },
  estimatedMinutes: m,
});

export const COURSE_0A_MODULES: Module[] = [
  mk(1, "Numbers & Decimals", mod1, 40),
  mk(2, "Fractions & Conversions", mod2, 45),
  mk(3, "The Metric System", mod3, 35),
  mk(4, "Basic Geometry", mod4, 45),
  mk(5, "Area & Volume", mod5, 40),
  mk(6, "Ratios & Percentages", mod6, 35),
  mk(7, "Basic Algebra", mod7, 50),
  mk(8, "Trigonometry for Machinists", mod8, 50),
  mk(9, "Citation Discipline & Source Attribution", mod9, 30),
];
