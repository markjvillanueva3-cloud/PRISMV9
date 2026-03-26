/**
 * L0 Foundation Courses: L0-04 through L0-08
 * Level: Foundational (absolute beginner) | 5 courses | ~28 hours total
 *
 * Extends the existing 0A (Math), 0B (Measurement), 0C (Blueprint) courses
 * with Materials, Safety, Machines, Tools, and Workholding.
 * No prior manufacturing knowledge assumed.
 */

import type { Module, Lesson, Question } from
  "../../engines/CurriculumEngine.js";

// ═══════════════════════════════════════════════════════════
// L0-04: Materials & Metallurgy Basics (8 modules, ~6 hours)
// ═══════════════════════════════════════════════════════════

const C04 = "L0-04";

const c04_mod1: Lesson[] = [{
  id: `${C04}-m1-l1`, moduleId: `${C04}-mod-1`,
  title: "What is Metal?", order: 1,
  content: [{
    type: "text",
    body: `# What is Metal?

## Atoms and Crystals — Simplified

All metals are made of atoms packed together in repeating patterns called **crystal structures**. Think of stacking oranges in a box — the pattern determines the metal's properties.

| Crystal Structure | Name | Metals | Properties |
|------------------|------|--------|-----------|
| BCC | Body-Centered Cubic | Steel, chromium, tungsten | Strong, magnetic (steel), moderate ductility |
| FCC | Face-Centered Cubic | Aluminum, copper, nickel, austenitic stainless | Very ductile, easy to form |
| HCP | Hexagonal Close-Packed | Titanium, magnesium, zinc | Harder to deform, anisotropic |

## Why This Matters for Machining

- **Ductile metals** (FCC) produce long, stringy chips — need good chip breakers
- **Hard metals** (BCC at high carbon) resist cutting — need tougher tools, lower speeds
- **HCP metals** (titanium) work-harden if you dwell — keep the tool moving

## Key Material Properties

| Property | What It Means | How It Affects Machining |
|----------|--------------|------------------------|
| **Hardness** | Resistance to denting (HRC, HB) | Harder = slower speed, tougher tool |
| **Tensile Strength** | Force to pull apart (MPa) | Higher = more cutting force |
| **Ductility** | How far it stretches before breaking | Ductile = long chips, gummy |
| **Thermal Conductivity** | How fast heat moves through it | Low = heat stays at tool tip |
| **Machinability** | How easy to cut (% vs 1212 steel) | Higher % = easier to machine |

## The Machinability Index

Everything is compared to **AISI 1212 free-machining steel = 100%**:
- 6061-T6 aluminum: **300-400%** (3-4× easier than baseline)
- 4140 steel: **65%** (harder to cut)
- 316 stainless: **36%** (much harder)
- Ti-6Al-4V titanium: **22%** (very difficult)
- Inconel 718: **12%** (extremely difficult)`,
  }],
  prismEngines: ["MaterialDatabaseEngine"],
}];

const c04_mod2: Lesson[] = [{
  id: `${C04}-m2-l1`, moduleId: `${C04}-mod-2`,
  title: "Iron & Steel Families", order: 1,
  content: [{
    type: "text",
    body: `# Iron & Steel Families

## Carbon is King

The single most important element in steel is **carbon**. It determines hardness, strength, and machinability.

| Category | Carbon % | Examples | Machinability | Typical Use |
|----------|---------|---------|--------------|-------------|
| **Low Carbon** | <0.30% | 1018, 1020, A36 | Easy (70-80%) | Brackets, fixtures, weldments |
| **Medium Carbon** | 0.30-0.60% | 1045, 4140, 4340 | Moderate (55-70%) | Shafts, gears, axles |
| **High Carbon** | >0.60% | 1095, W1 | Hard (40-55%) | Springs, blades, punches |
| **Tool Steel** | 0.60-1.5%+ | D2, H13, M2, S7 | Difficult (25-40%) | Dies, molds, cutting tools |
| **Cast Iron** | 2-4% | A48 Class 30/40 | Easy (short chips!) | Housings, bases, blocks |

## AISI/SAE Numbering System

The 4-digit code tells you what's in the steel:

| First Digits | Alloy System | Example | Special Property |
|-------------|-------------|---------|-----------------|
| **10xx** | Plain carbon | 1018, 1045 | Just iron + carbon |
| **11xx** | Free-machining | 1144 | Added sulfur for easy cutting |
| **41xx** | Chrome-moly | 4140, 4340 | Tough, heat-treatable |
| **43xx** | Nickel-chrome-moly | 4340 | Very strong, aerospace |
| **D2** | Tool steel (cold work) | D2 | 1.5% C, 12% Cr — wear resistant |
| **H13** | Tool steel (hot work) | H13 | Molds, die casting dies |

## What This Means in the Shop

- **1018**: Your go-to for fixtures and jigs. Cheap, welds easily, machines clean.
- **4140 pre-hard (28-32 HRC)**: Most common shaft/gear material. Machines well with carbide.
- **D2 (58-62 HRC)**: You're grinding this, not milling it. Or using CBN inserts.
- **Cast iron**: Makes short, powdery chips. No coolant needed (keeps dust down with air blast). Easy on tools but abrasive.`,
  }],
}];

const c04_mod3: Lesson[] = [{
  id: `${C04}-m3-l1`, moduleId: `${C04}-mod-3`,
  title: "Aluminum Alloys", order: 1,
  content: [{
    type: "text",
    body: `# Aluminum Alloys

## The Series System

Aluminum uses a 4-digit series number. The first digit tells you the main alloying element:

| Series | Alloying Element | Key Alloy | Machinability | Typical Use |
|--------|-----------------|-----------|--------------|-------------|
| **1xxx** | Pure aluminum (99%+) | 1100 | Soft, gummy | Reflectors, foil |
| **2xxx** | Copper | 2024-T3 | Good | Aircraft skin, structures |
| **3xxx** | Manganese | 3003 | Moderate | Cookware, heat exchangers |
| **5xxx** | Magnesium | 5052 | Moderate | Marine, pressure vessels |
| **6xxx** | Magnesium + Silicon | **6061-T6** | Excellent | MOST common in shops |
| **7xxx** | Zinc | **7075-T6** | Very good | Aerospace, high-strength |

## The Two You'll See 90% of the Time

**6061-T6** — The "mild steel of aluminum"
- Hardness: ~95 HB, tensile: 310 MPa
- Machines beautifully at high speed (300+ m/min)
- Excellent surface finish achievable
- Anodizes well

**7075-T6** — The "strong aluminum"
- Hardness: ~150 HB, tensile: 570 MPa
- Nearly as strong as mild steel at 1/3 the weight
- Slightly gummier than 6061, still excellent machinability
- Aerospace standard

## The T-Temper Code

The letter after the dash tells you the heat treatment:
- **T3**: Solution treated + cold worked (stronger than T0)
- **T4**: Solution treated + natural aging
- **T6**: Solution treated + **artificial aging** (peak strength, most common)
- **T651**: T6 + stress relieved by stretching (less warping)

## Aluminum Machining Gotchas

1. **Chip welding (BUE)**: Aluminum sticks to the tool at low speed. Fix: run FAST (300+ m/min), use sharp tools, polished flute tools, or diamond coating.
2. **Long stringy chips**: Use chip breaker geometry or high feed rates to break chips.
3. **Workpiece movement**: Aluminum is soft — don't over-clamp thin parts or they'll spring back.
4. **Coolant**: Flood coolant prevents chip welding. MQL (mist) also works well.`,
  }],
}];

const c04_mod4: Lesson[] = [{
  id: `${C04}-m4-l1`, moduleId: `${C04}-mod-4`,
  title: "Stainless Steel", order: 1,
  content: [{
    type: "text",
    body: `# Stainless Steel

## The Three Families

All stainless steels contain **≥10.5% chromium** (forms protective oxide layer). But the structure determines behavior:

| Family | Structure | Key Grades | Magnetic? | Machinability |
|--------|----------|-----------|-----------|--------------|
| **Austenitic** | FCC | 304, 316, 303 | No | Poor (36-78%) |
| **Martensitic** | BCT | 410, 420, 440C | Yes | Moderate (50-55%) |
| **Precipitation Hardened** | Mixed | 17-4 PH, 15-5 PH | Yes | Moderate (45-50%) |
| **Duplex** | FCC+BCC | 2205 | Partially | Poor (30-40%) |

## The Grades You'll See

**304** — "The standard stainless." Kitchen sinks, food equipment, medical. Gummy to cut.
**316** — Like 304 but with molybdenum for better corrosion resistance. Marine, chemical. Even gummier.
**303** — "Free-machining stainless." Added sulfur makes it cut much better. Use this when machinability matters.
**17-4 PH** — Precipitation hardened to 28-47 HRC depending on condition. Aerospace, medical implants.

## The Work-Hardening Trap

**THIS IS THE #1 MISTAKE WITH STAINLESS:**

Austenitic stainless (304, 316) **work-hardens** when you rub instead of cut. If your tool dwells, skims, or takes too light a cut, the surface becomes harder than the tool can penetrate. Next pass = tool destruction.

**Rules for stainless:**
1. **NEVER let the tool rub** — always maintain positive chip load
2. **Don't take cuts less than 0.05mm** — you'll work-harden the surface
3. **Use sharp tools** — dull tools = more rubbing = more work hardening
4. **Climb milling only** — conventional milling starts with zero chip thickness (rubbing!)
5. **Maintain rigidity** — vibration causes intermittent contact (rubbing!)
6. **Coolant is mandatory** — stainless has low thermal conductivity, all heat goes to the tool`,
  }],
}];

const c04_mod5: Lesson[] = [{
  id: `${C04}-m5-l1`, moduleId: `${C04}-mod-5`,
  title: "Exotic Materials", order: 1,
  content: [{
    type: "text",
    body: `# Exotic Materials — Titanium, Superalloys & Beyond

## Titanium (Ti-6Al-4V)

The most common titanium alloy. 60% the weight of steel, nearly as strong. Used in: jet engines, medical implants, racing parts, aerospace structures.

**Why it's hard to machine:**
- Thermal conductivity is **1/7th of steel** — heat stays at the tool tip
- Chemically reactive — titanium welds to the tool coating
- Springy (low modulus) — deflects away from the tool, then springs back
- Work hardens if you let it rub

**Typical parameters:** Vc = 40-60 m/min (carbide), fz = 0.08-0.15mm, flood coolant mandatory.

## Nickel Superalloys (Inconel 718, Waspaloy, Hastelloy)

Used in the **hot section of jet engines** (700-1100°C). Extremely strong even at high temperature.

**Why they're the hardest metals to machine:**
- Maintain strength at cutting temperature (tool sees full load at all times)
- Extreme work hardening
- Abrasive carbide particles in the microstructure
- Very low thermal conductivity

**Typical parameters:** Vc = 15-35 m/min (ceramic or whisker-reinforced), aggressive feed, rigid setup mandatory.

## Other Exotics You May Encounter

| Material | Difficulty | Special Concern |
|----------|-----------|----------------|
| **Copper** | Easy to cut, hard to hold size | Very ductile, gummy, burrs |
| **Brass** | Excellent machinability | Free-cutting, short chips |
| **Magnesium** | Easy to cut | **FIRE HAZARD** — chips ignite, use mineral oil coolant, Class D extinguisher |
| **Tungsten** | Extremely hard | Only diamond or CBN tooling works |
| **Cobalt-Chrome** | Very hard | Medical implants, similar to superalloys |`,
  }],
}];

const c04_mod6: Lesson[] = [{
  id: `${C04}-m6-l1`, moduleId: `${C04}-mod-6`,
  title: "Plastics & Composites", order: 1,
  content: [{
    type: "text",
    body: `# Plastics & Composites

## Engineering Plastics in Machining

Many precision parts are plastic: bushings, insulators, medical devices, semiconductor components.

| Plastic | Trade Name | Key Property | Machining Notes |
|---------|-----------|-------------|----------------|
| **Acetal** | Delrin | Stiff, low friction | Machines like aluminum. Best plastic for CNC. |
| **PEEK** | Victrex | High temp (260°C) | Expensive ($100+/kg). Aerospace/medical. Sharp tools. |
| **Nylon** | Nylon 6/66 | Tough, wear-resistant | Absorbs moisture → dimensions change! Machine dry. |
| **UHMW** | — | Wear/impact resistant | Very gummy, pushes away from tool |
| **PTFE** | Teflon | Chemical resistant | Extremely soft, hard to hold tolerance |
| **Polycarbonate** | Lexan | Transparent, impact | Melts easily → use air blast, not flood coolant |
| **Acrylic** | Plexiglass | Transparent, stiff | Cracks if stressed. Diamond tools for optical finish. |

## Composite Materials (CFRP / GFRP)

- **CFRP** (Carbon Fiber Reinforced Polymer): Lightweight, strong, abrasive dust
- **GFRP** (Glass Fiber): Cheaper, still abrasive

**Machining composites is different from metals:**
1. **No melting point** — overheating causes delamination and resin burn
2. **Abrasive fibers** destroy carbide tools — use PCD or diamond-coated
3. **Dust is hazardous** — ALWAYS use dust extraction, not coolant
4. **Delamination** — fibers peel away at edges. Use compression routers (up-down helix).
5. **No coolant on most plastics** — causes swelling, cracking, or contamination`,
  }],
}];

const c04_mod7: Lesson[] = [{
  id: `${C04}-m7-l1`, moduleId: `${C04}-mod-7`,
  title: "The ISO 513 Material Groups", order: 1,
  content: [{
    type: "text",
    body: `# ISO 513 Material Groups — The Universal Classification

## Why This Matters

Every cutting tool manufacturer organizes their catalogs by ISO 513 material group. Every speed/feed table uses this system. Learn it once, use it everywhere.

## The Six Groups

| Group | Color | Materials | Chip Type | Key Challenge |
|-------|-------|----------|-----------|--------------|
| **P** | 🔵 Blue | Carbon steel, alloy steel, tool steel | Long, continuous | Crater wear, high forces |
| **M** | 🟡 Yellow | Stainless steel, duplex, PH | Long, irregular | Work hardening, heat, BUE |
| **K** | 🔴 Red | Cast iron, CGI, hardened steel | Short, segmented | Abrasive wear, hard particles |
| **N** | 🟢 Green | Aluminum, copper, brass, plastic | Long, soft | BUE (built-up edge), gumming |
| **S** | 🟠 Orange | Titanium, superalloys (Inconel, Waspaloy) | Segmented, hot | Extreme heat, chemical wear |
| **H** | ⚪ Grey | Hardened steel (>45 HRC) | Segmented | Extreme abrasion, high temp |

## How to Use ISO 513

When you pick up an insert box, you'll see colored dots or letters:
- **P05-P25**: For steel. P05 = finishing (high speed, light cut). P25 = roughing (lower speed, heavy cut).
- **M10-M30**: For stainless. The number indicates toughness needed.
- **K10-K30**: For cast iron.

**The number after the letter = toughness rating.** Lower = harder (more wear resistant, more brittle). Higher = tougher (more impact resistant, wears faster).

## Practical: Matching Material to Group

| Your Workpiece | ISO Group | Tool Recommendation |
|---------------|-----------|-------------------|
| 1018 steel | P | GC4325, TiAlN coated carbide |
| 4140 pre-hard | P (toward K) | GC4325 or GC4315 |
| 304 stainless | M | GC2220, sharp positive geometry |
| 6061-T6 aluminum | N | Uncoated or diamond-coated, polished |
| Ti-6Al-4V | S | GC1125, high-pressure coolant |
| D2 at 60 HRC | H | CBN or ceramic insert |
| Grey cast iron | K | GC3210, no coolant (air blast) |`,
  }],
  prismEngines: ["MaterialDatabaseEngine"],
}];

const c04_mod8: Lesson[] = [{
  id: `${C04}-m8-l1`, moduleId: `${C04}-mod-8`,
  title: "Material Identification in the Shop", order: 1,
  content: [{
    type: "text",
    body: `# Material Identification in the Shop

## Why Identification Matters

Machining the wrong material with the wrong parameters can:
- Destroy expensive tools instantly
- Scrap the part
- Create a **safety hazard** (magnesium fires, titanium dust explosion)

## Quick Identification Methods

### The Magnet Test
- **Sticks to magnet**: Carbon steel, martensitic stainless, cast iron
- **Doesn't stick**: Aluminum, copper, brass, austenitic stainless (304/316), titanium

### The Spark Test
Grind a corner on a bench grinder and observe:
- **Carbon steel**: Orange sparks with forks (more carbon = more forks)
- **Stainless**: Short, dark red sparks, few forks
- **Cast iron**: Short, red sparks
- **Titanium**: Brilliant white sparks (CAUTION: fire risk with fines)
- **Aluminum**: No sparks (too soft)

### The Weight Test
Pick up identically-sized pieces:
- **Heaviest**: Steel (7.85 g/cm³) or brass (8.5)
- **Medium**: Titanium (4.43)
- **Lightest**: Aluminum (2.7) or magnesium (1.74)

### The Color/Appearance Test
- **Bright silver**: Aluminum or zinc
- **Dark grey**: Steel or cast iron
- **Yellow/gold**: Brass or bronze
- **Reddish**: Copper
- **Dull grey with oxide**: Titanium

## Reading a Mill Test Report (MTR)

Every batch of metal comes with an MTR (also called a material certificate). It contains:

| Field | What It Tells You |
|-------|------------------|
| **Heat number** | Unique batch ID for traceability |
| **Chemistry** | Exact % of C, Mn, Cr, Ni, Mo, etc. |
| **Mechanical properties** | Tensile strength, yield strength, elongation, hardness |
| **Specification** | ASTM/AMS/AISI standard it meets |
| **Condition** | Hot rolled, cold drawn, annealed, heat treated |

**ALWAYS check the MTR matches the drawing requirement before machining.** Aerospace shops require full material traceability — wrong material = scrapped part + audit finding.`,
  }],
}];

// L0-04 Quizzes
const C04_QUIZZES: Record<string, Question[]> = {
  [`${C04}-mod-1-quiz`]: [
    {
      id: "c04-q1", type: "multiple_choice", difficulty: 1,
      text: "Which crystal structure makes a metal most ductile?",
      options: [
        { id: "a", text: "BCC (Body-Centered Cubic)", isCorrect: false },
        { id: "b", text: "FCC (Face-Centered Cubic)", isCorrect: true,
          explanation: "FCC metals like aluminum and copper have the most slip planes, making them highly ductile" },
        { id: "c", text: "HCP (Hexagonal Close-Packed)", isCorrect: false },
      ],
      explanation: "FCC metals (aluminum, copper, nickel, austenitic stainless) are the most ductile due to having 12 slip systems.",
      tags: ["materials", "crystal_structure"],
    },
    {
      id: "c04-q2", type: "multiple_choice", difficulty: 1,
      text: "AISI 1212 steel has a machinability index of 100%. If Ti-6Al-4V has an index of 22%, what does this mean?",
      options: [
        { id: "a", text: "Titanium is 22% as easy to machine as 1212 steel", isCorrect: true,
          explanation: "The index is relative — lower means harder to machine" },
        { id: "b", text: "Titanium is 22 times harder than steel", isCorrect: false },
        { id: "c", text: "Titanium needs 22% more coolant", isCorrect: false },
      ],
      explanation: "Machinability index is relative to AISI 1212 baseline. 22% means titanium is roughly 4.5× harder to machine.",
      tags: ["materials", "machinability"],
    },
  ],
  [`${C04}-mod-2-quiz`]: [
    {
      id: "c04-q3", type: "multiple_choice", difficulty: 1,
      text: "What does the '41' in AISI 4140 steel mean?",
      options: [
        { id: "a", text: "It contains 41% carbon", isCorrect: false },
        { id: "b", text: "It is a chromium-molybdenum alloy steel", isCorrect: true,
          explanation: "41xx = chrome-moly alloy series" },
        { id: "c", text: "It has 41 HRC hardness", isCorrect: false },
      ],
      explanation: "AISI 41xx = chromium-molybdenum alloy. The last two digits (40) mean 0.40% carbon.",
      tags: ["materials", "steel", "nomenclature"],
    },
  ],
  [`${C04}-mod-3-quiz`]: [
    {
      id: "c04-q4", type: "multiple_choice", difficulty: 2,
      text: "You're machining 6061-T6 aluminum and getting a built-up edge (BUE) on your tool. What should you try FIRST?",
      options: [
        { id: "a", text: "Slow down the spindle", isCorrect: false,
          explanation: "Slower speed makes BUE WORSE in aluminum" },
        { id: "b", text: "Increase cutting speed significantly", isCorrect: true,
          explanation: "Higher speed (300+ m/min) generates enough heat to prevent aluminum welding to the tool" },
        { id: "c", text: "Switch to a harder tool material", isCorrect: false },
      ],
      explanation: "BUE in aluminum is solved by running FAST. Higher speed keeps the chip flowing and prevents welding.",
      tags: ["materials", "aluminum", "troubleshooting"],
    },
  ],
  [`${C04}-mod-4-quiz`]: [
    {
      id: "c04-q5", type: "multiple_choice", difficulty: 2,
      text: "Why must you NEVER take a light cut in 304 stainless steel?",
      options: [
        { id: "a", text: "It wastes cycle time", isCorrect: false },
        { id: "b", text: "Light cuts cause work hardening, making the surface harder than the tool can penetrate", isCorrect: true },
        { id: "c", text: "Stainless is too soft for light cuts", isCorrect: false },
      ],
      explanation: "Austenitic stainless work-hardens when the tool rubs instead of cuts. Always maintain a minimum chip load.",
      tags: ["materials", "stainless", "work_hardening"],
    },
  ],
  [`${C04}-mod-7-quiz`]: [
    {
      id: "c04-q6", type: "multiple_choice", difficulty: 1,
      text: "A 304 stainless steel workpiece belongs to which ISO 513 material group?",
      options: [
        { id: "a", text: "P (Blue) — Steel", isCorrect: false },
        { id: "b", text: "M (Yellow) — Stainless Steel", isCorrect: true },
        { id: "c", text: "K (Red) — Cast Iron", isCorrect: false },
        { id: "d", text: "S (Orange) — Superalloys", isCorrect: false },
      ],
      explanation: "All stainless steels fall under ISO 513 Group M (yellow). This determines which insert grade to use.",
      tags: ["materials", "iso513"],
    },
    {
      id: "c04-q7", type: "multiple_choice", difficulty: 2,
      text: "An insert box says 'P10-P25'. What does the number range tell you?",
      options: [
        { id: "a", text: "The hardness range of the workpiece", isCorrect: false },
        { id: "b", text: "P10=finishing (harder grade), P25=roughing (tougher grade)", isCorrect: true },
        { id: "c", text: "The recommended feed rate range", isCorrect: false },
      ],
      explanation: "Lower number = harder, more wear resistant (finishing). Higher = tougher, more impact resistant (roughing).",
      tags: ["materials", "iso513", "tooling"],
    },
  ],
  [`${C04}-mod-8-quiz`]: [
    {
      id: "c04-q8", type: "multiple_choice", difficulty: 1,
      text: "You hold a magnet to an unknown bar. It does NOT stick. Which material can you rule OUT?",
      options: [
        { id: "a", text: "Aluminum", isCorrect: false },
        { id: "b", text: "Carbon steel", isCorrect: true,
          explanation: "Carbon steel is always magnetic" },
        { id: "c", text: "304 stainless steel", isCorrect: false,
          explanation: "Austenitic stainless is typically non-magnetic" },
      ],
      explanation: "Carbon steel is always magnetic. Non-magnetic metals include aluminum, copper, brass, austenitic stainless, and titanium.",
      tags: ["materials", "identification"],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// L0-05: Shop Safety & Hazard Recognition (6 modules, ~4 hours)
// ═══════════════════════════════════════════════════════════

const C05 = "L0-05";

const c05_mod1: Lesson[] = [{
  id: `${C05}-m1-l1`, moduleId: `${C05}-mod-1`,
  title: "Personal Protective Equipment", order: 1,
  content: [{
    type: "text",
    body: `# Personal Protective Equipment (PPE)

## Mandatory PPE in Any Machine Shop

### Safety Glasses — ANSI Z87.1+
- Worn at ALL TIMES on the shop floor, not just at the machine
- Must have **side shields** — chips fly sideways
- Prescription glasses alone are NOT sufficient unless Z87-rated
- Replace if scratched (impaired vision = missed defects)

### Steel-Toe Boots — ASTM F2413
- Heavy vises, fixtures, and workpieces WILL fall
- Minimum rating: 75 ft-lb impact, 2500 lb compression
- Slip-resistant soles (coolant on floors is slippery)

### Hearing Protection
- CNC machines run 80-95+ dB continuously
- OSHA requires protection at ≥85 dB (8-hr TWA)
- Options: foam plugs (NRR 29-33), ear muffs (NRR 22-31)
- Hearing damage is **permanent and cumulative**

## PPE You MUST NOT Wear

### NEVER wear gloves near rotating machinery
- Gloves can catch on the spindle, chuck, or workpiece
- The machine will pull your hand in before you can react
- **Gloves near a lathe = potential amputation**
- OK to wear gloves for material handling AWAY from running machines

### NEVER wear loose clothing, jewelry, or lanyards
- Ties, hoodie strings, necklaces, bracelets, watches — all entanglement hazards
- Long sleeves must be rolled up or secured
- Long hair MUST be tied back and tucked in — ponytails get caught in spindles`,
  }],
  prismEngines: ["SafetyValidationEngine"],
}];

const c05_mod2: Lesson[] = [{
  id: `${C05}-m2-l1`, moduleId: `${C05}-mod-2`,
  title: "Machine Guarding & Interlocks", order: 1,
  content: [{
    type: "text",
    body: `# Machine Guarding & Interlocks

## Guarding Systems

Every CNC machine has guarding to keep you away from the cutting zone:

| Guard Type | Purpose | Common Bypass? |
|-----------|---------|---------------|
| **Enclosure doors** | Full containment of chips, coolant, broken tools | Door interlock switch |
| **Chuck guard** (lathe) | Prevents contact with spinning chuck | Proximity switch |
| **Chip shield** | Blocks flying chips from manual operations | Physical barrier |
| **Light curtain** | Detects hand entry into danger zone | Infrared beam array |
| **E-stop** (mushroom button) | Immediate power cut to drives | Red mushroom, always accessible |

## Interlocks — What They Do

An **interlock** prevents the machine from operating when a guard is open.

**Opening the door while the spindle is running:**
- Interlock signals the controller → spindle stops → axes halt
- Some machines allow door-open at low RPM (for setup)
- NEVER override a door interlock to run with the door open

## CRITICAL RULE: Never Bypass a Safety Interlock

Shops that bypass interlocks for "convenience":
- Void the machine warranty
- Violate OSHA regulations
- Risk catastrophic injury
- Face criminal liability if someone gets hurt

If an interlock is faulty → **lock out the machine and call maintenance**. Do NOT wire around it.`,
  }],
}];

const c05_mod3: Lesson[] = [{
  id: `${C05}-m3-l1`, moduleId: `${C05}-mod-3`,
  title: "Chip & Coolant Hazards", order: 1,
  content: [{
    type: "text",
    body: `# Chip & Coolant Hazards

## Hot Chips

Metal chips coming off the tool can be **600-900°C**:
- Steel chips glow orange/red when they leave the cutting zone
- They land on skin, clothing, shoes, and nearby surfaces
- Burns are the #1 minor injury in machine shops

**Protection:**
- Safety glasses with side shields (always)
- Closed-toe boots (no sandals, ever)
- Avoid reaching into the enclosure during cutting
- Use a chip hook or brush to clear chips — NEVER bare hands

## Sharp Chips

Fresh metal chips have razor-sharp edges:
- Long, curly steel chips are like metal ribbons with knife edges
- Cast iron chips are small but abrasive
- NEVER grab a handful of chips — use a scoop or vacuum

## Coolant Hazards

| Hazard | Cause | Prevention |
|--------|-------|-----------|
| **Mist inhalation** | Coolant atomized by high-speed spindle | Mist collectors, enclosure, N95 mask if needed |
| **Dermatitis** | Prolonged skin contact with coolant | Barrier cream, wash hands, don't soak in coolant |
| **Bacterial growth** | Tramp oil, stagnant coolant, warm temps | Regular concentration checks, sump cleaning |
| **Slippery floors** | Coolant spray, leaks, splashes | Non-slip mats, clean up immediately, drainage |
| **Eye splash** | Opening door during coolant flow | Wait for flow to stop, safety glasses always |`,
  }],
}];

const c05_mod4: Lesson[] = [{
  id: `${C05}-m4-l1`, moduleId: `${C05}-mod-4`,
  title: "Electrical & Fire Safety", order: 1,
  content: [{
    type: "text",
    body: `# Electrical & Fire Safety

## Lockout/Tagout (LOTO)

Before ANY maintenance inside a machine:
1. **Turn off** the machine at the main disconnect
2. **Lock** the disconnect with YOUR personal padlock
3. **Tag** it with your name, date, and reason
4. **Try to start** the machine to verify lockout worked
5. **Only YOU remove your lock** when work is complete

LOTO prevents someone from turning on a machine while you're inside it. Failure to LOTO has killed experienced machinists.

## Fire Hazards

### Magnesium Fire — EXTREME DANGER
- Magnesium chips ignite easily, burn at **3,100°C**
- **NEVER use water** on a magnesium fire — it explodes (water decomposes into hydrogen + oxygen)
- Use **Class D extinguisher** (dry powder) or dry sand
- Keep magnesium chips DRY — wet chips are more dangerous
- Dedicated magnesium machines should have dry machining (no coolant) and spark-proof chip collection

### Titanium Dust Fire
- Fine titanium dust/swarf can ignite
- Less dangerous than magnesium but still serious
- Class D extinguisher required

### Oil-Soaked Rag Fire
- Rags soaked in cutting oil can **spontaneously combust** in a pile
- Always dispose in metal containers with self-closing lids
- Never leave oily rags in a pile overnight

### Electrical Panel Fire
- CO2 or dry chemical extinguisher (never water near electricity)
- Know the location of the electrical disconnect for your area`,
  }],
}];

const c05_mod5: Lesson[] = [{
  id: `${C05}-m5-l1`, moduleId: `${C05}-mod-5`,
  title: "Lifting & Ergonomics", order: 1,
  content: [{
    type: "text",
    body: `# Lifting & Ergonomics

## Safe Lifting

Machine shop items are heavy:
- Kurt vise: 25-40 kg (55-88 lbs)
- Fixture plate: 15-50 kg
- Raw stock billet: 10-100+ kg
- Tombstone: 100-200+ kg (ALWAYS use crane)

**OSHA recommended limit:** 23 kg (51 lbs) for regular lifting

### Proper Technique
1. Feet shoulder-width apart, close to the load
2. Bend at the KNEES, not the waist
3. Grip firmly, keep load close to body
4. Lift with your LEGS, keep back straight
5. Don't twist while carrying — turn with your feet

### When to Use Mechanical Assistance
- Over 25 kg → get help or use a hoist
- Over 50 kg → overhead crane mandatory
- Awkward shapes (round stock, long bars) → always get help

## Crane Signals
If your shop has an overhead crane, learn the hand signals:
- **Hoist (up):** index finger pointing up, circling
- **Lower:** index finger pointing down, circling
- **Stop:** palm out, arm extended
- **Emergency stop:** both arms extended, palms down

## Repetitive Strain
- Deburring by hand for hours causes wrist/hand fatigue
- Use pneumatic deburring tools when possible
- Take breaks, alternate hands, stretch
- Report early symptoms — don't "tough it out"`,
  }],
}];

const c05_mod6: Lesson[] = [{
  id: `${C05}-m6-l1`, moduleId: `${C05}-mod-6`,
  title: "Emergency Procedures", order: 1,
  content: [{
    type: "text",
    body: `# Emergency Procedures

## E-Stop Response

When you hit the emergency stop:
1. The spindle stops immediately (or within 1-2 seconds)
2. Axis motion halts (servo drives de-energized)
3. Coolant may or may not stop (depends on machine)
4. **DO NOT just reset and restart** — investigate why you stopped

## Machine Crash Procedure

If a tool crashes into the workpiece/fixture/vice:
1. Hit **E-STOP** immediately
2. Do NOT try to jog the machine while crashed
3. Assess: is the spindle still in the holder? Is the tool broken?
4. Check for damage: spindle, tool holder, workpiece, fixture, ball screws
5. Call a supervisor or lead machinist
6. **Never restart without clearing the crash** — broken tool fragments may be inside the part

## First Aid Basics

| Injury | Immediate Action |
|--------|-----------------|
| **Cut (minor)** | Apply pressure, wash with clean water, bandage |
| **Cut (deep/bleeding)** | Apply pressure, elevate, call for help |
| **Chip in eye** | DO NOT rub! Flush with eyewash station for 15+ minutes |
| **Coolant splash in eye** | Flush with eyewash for 15-20 minutes, get medical attention |
| **Burn from hot chip** | Cool with running water for 10+ minutes |
| **Crush injury** | Do not move the person, call 911 |

## Near-Miss Reporting

A **near-miss** is an event that COULD have caused injury but didn't. Examples:
- A part flew out of the chuck but hit the enclosure (not a person)
- A tool broke but the door was closed
- Coolant spilled on the floor but nobody slipped (yet)

**ALWAYS report near-misses.** They prevent the NEXT incident from being an actual injury.`,
  }],
}];

// L0-05 Quizzes
const C05_QUIZZES: Record<string, Question[]> = {
  [`${C05}-mod-1-quiz`]: [
    {
      id: "c05-q1", type: "multiple_choice", difficulty: 1,
      text: "Why must you NEVER wear gloves while operating a lathe?",
      options: [
        { id: "a", text: "Gloves make it hard to feel the controls", isCorrect: false },
        { id: "b", text: "Gloves can catch on the rotating chuck/spindle and pull your hand in", isCorrect: true },
        { id: "c", text: "Gloves get dirty from coolant", isCorrect: false },
      ],
      explanation: "Entanglement with rotating machinery is one of the most serious shop hazards. Gloves near a spinning lathe can grab and pull your entire hand/arm into the machine.",
      tags: ["safety", "ppe", "lathe"],
    },
  ],
  [`${C05}-mod-2-quiz`]: [
    {
      id: "c05-q2", type: "multiple_choice", difficulty: 1,
      text: "A door interlock switch on the CNC is broken. What should you do?",
      options: [
        { id: "a", text: "Wire around it so you can keep running production", isCorrect: false },
        { id: "b", text: "Lock out the machine and call maintenance", isCorrect: true },
        { id: "c", text: "Run the machine with the door open at reduced speed", isCorrect: false },
      ],
      explanation: "Never bypass a safety interlock. A broken interlock = machine is down until maintenance fixes it properly.",
      tags: ["safety", "interlocks"],
    },
  ],
  [`${C05}-mod-4-quiz`]: [
    {
      id: "c05-q3", type: "multiple_choice", difficulty: 2,
      text: "Magnesium chips catch fire on the machine. What extinguisher do you grab?",
      options: [
        { id: "a", text: "Water extinguisher", isCorrect: false,
          explanation: "NEVER — water on burning magnesium causes a violent explosion" },
        { id: "b", text: "CO2 extinguisher", isCorrect: false,
          explanation: "CO2 doesn't work on metal fires" },
        { id: "c", text: "Class D (dry powder) extinguisher", isCorrect: true },
      ],
      explanation: "Magnesium burns at 3100°C. Only Class D extinguisher (dry powder like Met-L-X) or dry sand can suppress it. Water decomposes into hydrogen and oxygen, causing an explosion.",
      tags: ["safety", "fire", "magnesium"],
    },
  ],
  [`${C05}-mod-6-quiz`]: [
    {
      id: "c05-q4", type: "multiple_choice", difficulty: 1,
      text: "A chip flies into your coworker's eye. What's the FIRST thing to do?",
      options: [
        { id: "a", text: "Try to remove the chip with tweezers", isCorrect: false },
        { id: "b", text: "Tell them to rub their eye to flush it out", isCorrect: false },
        { id: "c", text: "Guide them to the eyewash station and flush for 15+ minutes", isCorrect: true },
      ],
      explanation: "Never try to manually remove a foreign object from an eye. Flush continuously with the eyewash station for at least 15 minutes, then seek medical attention.",
      tags: ["safety", "first_aid"],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// L0-06: Introduction to CNC Machines (8 modules, ~6 hours)
// ═══════════════════════════════════════════════════════════

const C06 = "L0-06";

const c06_mod1: Lesson[] = [{
  id: `${C06}-m1-l1`, moduleId: `${C06}-mod-1`,
  title: "What is CNC?", order: 1,
  content: [{
    type: "text",
    body: `# What is CNC?

## Computer Numerical Control

**CNC** = a computer reading a program (G-code) and sending precise motion commands to servo motors that move the cutting tool and/or workpiece.

### The Three Parts of Every CNC System

1. **The Program (G-code)** — A text file of instructions:
   \`\`\`
   G00 X0 Y0 Z10.    (rapid to position)
   G01 Z-5. F200      (feed down into material at 200mm/min)
   G01 X50. F800       (cut across 50mm at 800mm/min)
   \`\`\`

2. **The Controller** — The "brain" that reads G-code and converts it to electrical signals:
   - Fanuc, Siemens, Heidenhain, Mazak, Haas
   - Has a screen, keyboard, mode switches, override knobs, E-stop

3. **The Servo Motors** — The "muscles" that move the axes:
   - Linear axes: X, Y, Z (straight-line motion)
   - Rotary axes: A, B, C (rotation around X, Y, Z)
   - Spindle motor: rotates the cutting tool (milling) or workpiece (turning)

## CNC vs Manual Machining

| Feature | Manual | CNC |
|---------|--------|-----|
| Precision | ±0.025mm typical | ±0.005mm typical |
| Repeatability | Operator dependent | ±0.002mm or better |
| Complex shapes | Very difficult | Easy (the computer does the math) |
| Setup time | Fast (no programming) | Slower (needs program + setup) |
| Production speed | Slow | Fast (runs 24/7 unattended) |
| Skill required | Manual dexterity | Programming + setup knowledge |`,
  }],
}];

const c06_mod2: Lesson[] = [{
  id: `${C06}-m2-l1`, moduleId: `${C06}-mod-2`,
  title: "Vertical Machining Centers (VMC)", order: 1,
  content: [{
    type: "text",
    body: `# Vertical Machining Centers (VMC)

## Anatomy of a VMC

The spindle points **vertically downward**, and the table moves in X and Y:

- **Spindle**: Holds the cutting tool, rotates at 100-30,000+ RPM
- **Table**: Flat surface where you clamp the workpiece. Moves left-right (X) and front-back (Y)
- **Column**: The vertical structure. The spindle moves up-down (Z) along the column.
- **Tool magazine**: ATC (Automatic Tool Changer) holds 20-120 tools
- **Enclosure**: Safety doors with interlocks and windows

## Axes

| Axis | Direction | What It Does |
|------|-----------|-------------|
| **X** | Left ↔ Right | Moves table/workpiece side to side |
| **Y** | Front ↔ Back | Moves table/workpiece toward/away from operator |
| **Z** | Up ↔ Down | Moves spindle up/down (into the cut) |

## Common VMC Sizes

| Size Class | Table (mm) | Travel X×Y×Z | Spindle | Typical Use |
|-----------|-----------|-------------|---------|-------------|
| Small (40-taper) | 500×250 | 510×400×460 | 8-12K RPM | Prototypes, small parts |
| Mid (40-taper) | 1000×500 | 1020×510×510 | 10-15K RPM | General job shop |
| Large (50-taper) | 1300×600 | 1270×635×635 | 6-10K RPM | Large parts, heavy cuts |

## When to Use a VMC

VMCs are the **most common** CNC machine type. Use for:
- Flat parts with features on the top and sides
- Pockets, holes, contours, slots
- 3D surfaces (mold cavities, aerospace parts)
- Parts that fit in a vise or on a fixture plate`,
  }],
  prismEngines: ["MachineDatabaseEngine"],
}];

const c06_mod3: Lesson[] = [{
  id: `${C06}-m3-l1`, moduleId: `${C06}-mod-3`,
  title: "Horizontal Machining Centers (HMC)", order: 1,
  content: [{
    type: "text",
    body: `# Horizontal Machining Centers (HMC)

## Why Horizontal?

The spindle points **horizontally** (parallel to the floor). This gives two major advantages:

1. **Chips fall DOWN** — gravity clears chips from the cutting zone. On a VMC, chips pile up in pockets and re-cut.
2. **4-sided machining** — mount the part on a tombstone, machine 4 sides without re-clamping.

## Key Features

### B-Axis (Rotary Table)
HMCs typically have a **rotary table** (B-axis) that indexes in 0.001° increments. This lets you:
- Machine all 4 sides of a part without unclamping
- Access angular features
- Use tombstone fixtures for multiple parts

### Pallet Changer
Most HMCs have **two pallets**:
- While the machine cuts on Pallet 1, the operator loads/unloads Pallet 2
- Swap time: 5-15 seconds
- This maximizes spindle utilization (the machine never waits for the operator)

### Tombstone Fixtures
A **tombstone** is a large rectangular block bolted to the pallet. Parts are clamped on all 4 sides. One pallet can hold 4, 8, 16+ parts.

## HMC vs VMC

| | VMC | HMC |
|---|-----|-----|
| Best for | Small batches, prototypes, 1-2 setups | Production, multi-side, high volume |
| Chip evacuation | Poor (chips sit in pocket) | Excellent (gravity) |
| Spindle utilization | 40-60% (loading time) | 80-95% (pallet changer) |
| Cost | $50K-$300K | $200K-$1M+ |
| Typical production | 1-500 parts | 500-100,000+ parts |`,
  }],
}];

const c06_mod4: Lesson[] = [{
  id: `${C06}-m4-l1`, moduleId: `${C06}-mod-4`,
  title: "CNC Lathes", order: 1,
  content: [{
    type: "text",
    body: `# CNC Lathes

## How a Lathe Works

The **workpiece rotates** and the **tool moves** into it. Opposite of a mill (where the tool rotates and the workpiece is still).

## Anatomy

- **Headstock**: Contains the spindle motor and chuck. Spins the workpiece.
- **Chuck**: 3-jaw (self-centering) or collet. Grips the workpiece.
- **Turret**: Holds 8-24 tools. Indexes to select the next tool.
- **Tailstock**: Supports long parts from the other end.
- **Bed**: The base — flat bed or slant bed (better chip evacuation).

## Axes

| Axis | Direction | What It Does |
|------|-----------|-------------|
| **X** | In/Out (radial) | Moves tool toward/away from centerline |
| **Z** | Left/Right (axial) | Moves tool along the length of the part |
| **C** | Rotation (spindle) | Controlled spindle rotation for milling |
| **Y** | Vertical (optional) | Off-center milling, cross-drilling |

## What Makes Parts Round

Every operation on a lathe creates a **surface of revolution**:
- **Facing**: Flat face (perpendicular to axis)
- **OD Turning**: Cylindrical outside surface
- **Boring**: Cylindrical inside surface
- **Grooving**: Channel cut into the surface
- **Threading**: Helical groove (screws, bolts)
- **Parting**: Cutting the part off the bar stock

## Live Tooling

Modern CNC lathes have **live tooling** — driven (spinning) tools mounted in the turret. This allows:
- Drilling off-center holes
- Milling flats, hexagons, keyways
- Cross-drilling (Y-axis)

With live tooling + C-axis + Y-axis, a lathe becomes a **mill-turn** machine.`,
  }],
}];

const c06_mod5: Lesson[] = [{
  id: `${C06}-m5-l1`, moduleId: `${C06}-mod-5`,
  title: "Swiss-Type Lathes", order: 1,
  content: [{
    type: "text",
    body: `# Swiss-Type Lathes

## What Makes Swiss Different

In a conventional lathe, the workpiece is held in a chuck and the tool moves. In a **Swiss-type** lathe:
- The **headstock slides** (Z-axis) while the workpiece is supported by a **guide bushing** right at the cut
- This means the tool always cuts next to the guide bushing — **zero deflection**, even on tiny parts

## Why Swiss Dominates Small Parts

| Part Diameter | Swiss Advantage |
|--------------|----------------|
| <3mm | Essential — conventional lathe can't hold tolerance |
| 3-16mm | Major — better finish, tighter tolerance |
| 16-32mm | Moderate — Swiss still faster for production |
| >32mm | Conventional lathe is usually better |

## Typical Swiss Parts
- Medical: bone screws, dental implants, surgical pins
- Electronics: connector pins, contacts
- Watchmaking: gears, shafts, crowns
- Automotive: injector nozzles, sensor housings
- Aerospace: fasteners, fittings

## Swiss Machine Features

- **5-9 axes**: Main spindle, sub-spindle, multiple tool gangs, Y-axis
- **Bar feeder**: Automatically feeds 12-foot bars through the headstock
- **Sub-spindle**: Catches the part after cutoff, machines the back side
- **Gang tooling**: Multiple tools mounted in a line (faster than a turret for small parts)
- **Guide bushing**: The heart of Swiss — supports the bar at the cutting point
- **High-pressure coolant**: 70-100+ bar through the tool for chip evacuation in deep holes

## Production Speed

Swiss machines run **unattended for hours**. A bar feeder loads a 12-foot bar, and the machine makes hundreds or thousands of parts before the operator needs to reload. Cycle times of 15-90 seconds per part are common.`,
  }],
}];

const c06_mod6: Lesson[] = [{
  id: `${C06}-m6-l1`, moduleId: `${C06}-mod-6`,
  title: "Grinders, EDM & Specialty Machines", order: 1,
  content: [{
    type: "text",
    body: `# Grinders, EDM & Specialty Machines

## Surface Grinder
- Flat grinding wheel passes over a workpiece on a magnetic chuck
- Achieves: ±0.002mm flatness, Ra 0.1-0.4 µm finish
- Used for: hardened parts, precision flats, mold components

## Cylindrical Grinder
- Grinding wheel turns against a rotating cylindrical workpiece
- OD grinding (outside) or ID grinding (inside bores)
- Achieves: ±0.001mm roundness, mirror finish

## Centerless Grinder
- No chuck — workpiece is supported between a grinding wheel, regulating wheel, and work rest blade
- Extremely fast for production of round parts (pins, shafts, rollers)
- Throughfeed: parts pass through continuously

## Wire EDM (Electrical Discharge Machining)
- A thin wire (0.1-0.3mm brass) cuts through metal using electrical sparks
- No cutting force — can cut hardened steel, carbide, anything conductive
- Accuracy: ±0.002mm, excellent surface finish
- Used for: die openings, punch profiles, complex 2D shapes in hard materials

## Sinker EDM
- A shaped electrode (copper or graphite) "sinks" into the workpiece via spark erosion
- Creates complex 3D cavities in hardened steel
- Used for: injection mold cavities, die cavities, micro features

## Laser Cutting
- High-power laser (CO2 or fiber) melts/vaporizes material along a path
- Sheet metal cutting: fast, accurate, no tooling cost
- Typical materials: steel up to 25mm, aluminum up to 20mm, stainless up to 15mm

## Waterjet
- 60,000 PSI water stream with abrasive garnet particles
- Cuts ANY material: metal, stone, glass, composites, food
- No heat-affected zone — cold cutting process
- Accuracy: ±0.05-0.1mm typical`,
  }],
}];

const c06_mod7: Lesson[] = [{
  id: `${C06}-m7-l1`, moduleId: `${C06}-mod-7`,
  title: "CNC Controllers", order: 1,
  content: [{
    type: "text",
    body: `# CNC Controllers — The Machine's Brain

## The Big Five

| Controller | Maker | Market Share | Where You'll See It |
|-----------|-------|-------------|-------------------|
| **Fanuc** | Japan | ~60% worldwide | Most machines globally, especially Asia |
| **Siemens** (Sinumerik) | Germany | ~20% | European machines (DMG MORI, etc.) |
| **Heidenhain** | Germany | ~8% | High-end European mills (Hermle, Mikron) |
| **Mazatrol** | Mazak | Mazak machines | Mazak machines only (conversational) |
| **Haas** | USA | Haas machines | Haas machines only (Fanuc-compatible) |

## Controller Interface

Every controller has:

1. **Screen**: Shows program, position, alarms, graphics
2. **Mode switch**: AUTO (run program), EDIT (modify program), MDI (manual data input), JOG (move axes by hand)
3. **Feed/Speed override knobs**: 0-200% adjustment while running
4. **Cycle Start / Feed Hold buttons**: Green = go, yellow = pause
5. **E-Stop**: Red mushroom button — emergency power cut
6. **Jog handwheel (MPG)**: Precise manual axis movement

## G-Code is (Mostly) Universal

The basic G-codes (G00, G01, G02, G03, etc.) work on ALL controllers. But each controller has:
- Different canned cycle formats (drilling, tapping)
- Different macro/variable syntax
- Different tool change sequences
- Different screen layouts and menus

**If you learn one controller well, you can adapt to any other in a few days.**`,
  }],
}];

const c06_mod8: Lesson[] = [{
  id: `${C06}-m8-l1`, moduleId: `${C06}-mod-8`,
  title: "Machine Specs That Matter", order: 1,
  content: [{
    type: "text",
    body: `# Machine Specifications That Matter

## The Spec Sheet — What to Look For

| Specification | What It Means | Why It Matters |
|--------------|--------------|---------------|
| **Table size** (mm×mm) | Physical work area | Determines max part size |
| **X/Y/Z travel** (mm) | Maximum axis movement | Limits how far the tool can reach |
| **Spindle speed** (RPM) | Maximum rotation speed | Higher = faster cutting in aluminum |
| **Spindle power** (kW) | Motor strength | More power = heavier cuts in steel |
| **Spindle torque** (Nm) | Twisting force | Critical for large tools at low RPM |
| **Spindle taper** | Tool holder interface | CAT40, BT40, HSK63, etc. |
| **Rapid traverse** (m/min) | Maximum non-cutting speed | Faster rapids = shorter cycle time |
| **Tool magazine** | Number of tool positions | More = fewer tool changes during job |
| **Repeatability** (mm) | How precisely it returns to a point | ±0.002mm is typical, ±0.001mm is high-end |
| **Accuracy** (mm) | How close to the commanded position | Affected by ballscrew pitch, thermal growth |
| **Machine weight** (kg) | Total mass | Heavier = more rigid = better surface finish |

## Spindle Taper Sizes

| Taper | Tool Holder | Typical Machine Size | Max RPM |
|-------|-----------|-------|---------|
| **CAT40 / BT40** | Standard | Small-mid mills | 8,000-15,000 |
| **CAT50 / BT50** | Heavy duty | Large mills | 4,000-8,000 |
| **HSK63** | High-speed | High-speed centers | 15,000-42,000 |
| **HSK100** | Heavy + fast | Large 5-axis | 10,000-18,000 |

## How to Read a Spec Sheet

**Example: Haas VF-2**
- Table: 914×356mm — fits most job-shop parts
- Travel: 762×406×508mm — good 3-axis envelope
- Spindle: 8,100 RPM, 22.4 kW — adequate for steel, fast enough for aluminum
- Taper: CAT40 — industry standard tooling
- Magazine: 20+1 tools — enough for most jobs
- Rapid: 25.4 m/min — reasonable
- Weight: 3,175 kg — decent rigidity for its size`,
  }],
  prismEngines: ["MachineDatabaseEngine"],
}];

// L0-06 Quizzes
const C06_QUIZZES: Record<string, Question[]> = {
  [`${C06}-mod-1-quiz`]: [
    {
      id: "c06-q1", type: "multiple_choice", difficulty: 1,
      text: "In a CNC system, what does the 'controller' do?",
      options: [
        { id: "a", text: "Holds the cutting tool", isCorrect: false },
        { id: "b", text: "Reads G-code and sends motion commands to the servo motors", isCorrect: true },
        { id: "c", text: "Supplies coolant to the cutting zone", isCorrect: false },
      ],
      explanation: "The controller is the 'brain' — it interprets the G-code program and converts it into precise electrical signals for the servo motors.",
      tags: ["cnc", "controller"],
    },
  ],
  [`${C06}-mod-2-quiz`]: [
    {
      id: "c06-q2", type: "multiple_choice", difficulty: 1,
      text: "On a VMC, which axis moves the spindle up and down?",
      options: [
        { id: "a", text: "X axis", isCorrect: false },
        { id: "b", text: "Y axis", isCorrect: false },
        { id: "c", text: "Z axis", isCorrect: true },
      ],
      explanation: "Z always aligns with the spindle axis. On a VMC, the spindle is vertical, so Z = up/down.",
      tags: ["cnc", "axes", "vmc"],
    },
  ],
  [`${C06}-mod-4-quiz`]: [
    {
      id: "c06-q3", type: "multiple_choice", difficulty: 1,
      text: "On a CNC lathe, which component rotates?",
      options: [
        { id: "a", text: "The cutting tool", isCorrect: false },
        { id: "b", text: "The workpiece (held in the chuck)", isCorrect: true },
        { id: "c", text: "The tailstock", isCorrect: false },
      ],
      explanation: "On a lathe, the workpiece spins and the tool moves into it. This is opposite of a mill where the tool spins.",
      tags: ["cnc", "lathe"],
    },
  ],
  [`${C06}-mod-8-quiz`]: [
    {
      id: "c06-q4", type: "multiple_choice", difficulty: 2,
      text: "A machine spec says 'repeatability ±0.002mm'. What does this mean?",
      options: [
        { id: "a", text: "The machine is accurate to ±0.002mm from nominal", isCorrect: false },
        { id: "b", text: "The machine returns to the same position within ±0.002mm each time", isCorrect: true },
        { id: "c", text: "The machine can cut features no smaller than 0.002mm", isCorrect: false },
      ],
      explanation: "Repeatability measures how consistently the machine returns to a commanded position. Accuracy measures how close to the actual commanded value.",
      tags: ["cnc", "specifications"],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// L0-07: Cutting Tools — Types & Anatomy (8 modules, ~6 hours)
// ═══════════════════════════════════════════════════════════

const C07 = "L0-07";

const c07_mod1: Lesson[] = [{
  id: `${C07}-m1-l1`, moduleId: `${C07}-mod-1`,
  title: "Why Cutting Tools Matter", order: 1,
  content: [{
    type: "text",
    body: `# Why Cutting Tools Matter

## The 3-5% Rule

Cutting tools represent only **3-5% of the total cost** of manufacturing a part. But the tool controls the OTHER 95%:

- **Cycle time**: The right tool at the right parameters can cut cycle time in half
- **Surface finish**: A worn or wrong tool produces scrap
- **Machine load**: Wrong tool = excessive force = machine damage or part failure
- **Dimensional accuracy**: Tool deflection, wear, and runout all affect part size

## The Real Cost of a "Cheap" Tool

| Scenario | Tool Cost | Cycle Time | Parts/Day | Scrap Rate | True Cost/Part |
|----------|----------|-----------|----------|-----------|---------------|
| Cheap insert, slow params | $3 | 8 min | 60 | 5% | $12.50 |
| Premium insert, optimized | $8 | 4 min | 120 | 0.5% | $7.80 |

The premium tool costs 2.5× more but produces parts at **37% less cost**.

## Tool Selection Impacts Everything

Choosing the wrong tool leads to:
- **Chatter** → poor surface finish → scrap or rework
- **Tool breakage** → crashed machine, damaged workpiece, lost time
- **Short tool life** → frequent tool changes → lost production time
- **Excessive heat** → dimensional errors, work hardening, reduced tool life

The goal of this course is to teach you tool types so you can make intelligent selections.`,
  }],
}];

const c07_mod2: Lesson[] = [{
  id: `${C07}-m2-l1`, moduleId: `${C07}-mod-2`,
  title: "End Mills", order: 1,
  content: [{
    type: "text",
    body: `# End Mills — The Milling Workhorse

## End Mill Types by Geometry

| Type | Shape | Best For |
|------|-------|---------|
| **Flat (square)** | Flat bottom | Pocketing, slotting, facing, 2D contours |
| **Ball nose** | Hemisphere tip | 3D surfaces, mold finishing, fillet blending |
| **Bull nose** | Flat + corner radius | Stronger corners, semi-finishing, pocketing |
| **Corner radius** | Small radius on corners | General purpose (radius prevents chipping) |
| **Chamfer** | Angled tip | Chamfering edges, countersinking |

## Flute Count

| Flutes | Chip Space | Best For |
|--------|-----------|---------|
| **2** | Maximum | Aluminum, plastics (need room for big chips) |
| **3** | Good balance | General purpose, aluminum at moderate feeds |
| **4** | Moderate | Steel, stainless, cast iron (most common) |
| **5-7** | Minimum | High-feed finishing, hardened materials |

## Key Features

- **Helix angle**: 30° standard, 35-45° high-performance (better chip evacuation, smoother cut)
- **Variable helix**: Different helix per flute (reduces harmonic chatter)
- **Center cutting**: Can plunge straight down (needed for ramping/drilling with an end mill)
- **Up-cut vs down-cut**: Up-cut pulls chips out (general). Down-cut pushes chips down (composites, thin material).

## Coatings for End Mills

| Coating | Color | Best For |
|---------|-------|---------|
| **Uncoated** | Silver | Aluminum (sharp edge, no sticking) |
| **TiN** | Gold | General steel, visible wear indicator |
| **TiAlN** | Dark purple/black | High-temp: steel, stainless, cast iron |
| **AlCrN** | Grey | Hardened steel, high-speed machining |
| **Diamond (CVD)** | Grey | Aluminum (prevents BUE), composites, graphite |
| **ZrN** | Light gold | Non-ferrous, prevents galling |`,
  }],
  prismEngines: ["ToolDatabaseEngine"],
}];

const c07_mod3: Lesson[] = [{
  id: `${C07}-m3-l1`, moduleId: `${C07}-mod-3`,
  title: "Drills", order: 1,
  content: [{
    type: "text",
    body: `# Drills — Making Holes

## Twist Drill Anatomy

A standard twist drill has:
- **Point angle**: 118° (general) or 140° (aluminum, stainless) — the angle at the tip
- **Lip**: The two cutting edges that do the actual cutting
- **Web**: The core between the flutes — thicker = stronger, thinner = easier penetration
- **Margin**: The narrow land that guides the drill in the hole
- **Flute**: Helical channel that evacuates chips

## Drill Types

| Type | Use | Key Feature |
|------|-----|------------|
| **Twist drill** | General holes | Most common, 118° or 140° point |
| **Spot drill** | Start holes precisely | 90° or 120° tip, short and rigid |
| **Center drill** | Lathe center holes + spotting | 60° tip + pilot diameter |
| **Indexable drill** | Fast hole production | Replaceable inserts, 2-5×D depth |
| **Gun drill** | Deep holes (10-100×D) | Single flute, internal coolant, oil-hole |
| **Step drill** | Multiple diameters | Stepped profile for counterbore + hole |

## Peck Drilling

For holes deeper than 3× the drill diameter, you must **peck**:
1. Drill to depth increment (e.g., 1-3× diameter)
2. Retract to clear chips
3. Return and drill deeper
4. Repeat until full depth

**G73**: High-speed peck (partial retract — for chip breaking)
**G83**: Full-retract peck (comes all the way out — for deep holes, better chip clearing)

## Through-Coolant Drills

Coolant flows through holes in the drill body, directly to the cutting edge:
- Dramatically improves chip evacuation
- Allows deeper holes without pecking
- Reduces heat at the cutting edge
- Requires a machine with through-spindle coolant (TSC)`,
  }],
}];

const c07_mod4: Lesson[] = [{
  id: `${C07}-m4-l1`, moduleId: `${C07}-mod-4`,
  title: "Inserts & Indexable Tools", order: 1,
  content: [{
    type: "text",
    body: `# Inserts & Indexable Tools

## Why Indexable?

Instead of replacing the entire tool when it's dull, you **rotate the insert** to a fresh cutting edge, or replace just the insert ($3-15) instead of the whole tool ($50-500).

## ISO Insert Designation — Decoding the Code

Example: **CNMG 120408**

| Position | Code | Meaning |
|---------|------|---------|
| 1st (C) | Shape | **C** = 80° diamond (also: S=square, T=triangle, R=round, D=55° diamond, V=35° diamond, W=trigon) |
| 2nd (N) | Clearance | **N** = 0° (also: A=3°, B=5°, C=7°, P=11°) |
| 3rd (M) | Tolerance | **M** = ±0.08mm IC, ±0.13mm thickness |
| 4th (G) | Type | **G** = with chipbreaker + hole (also: A=no hole, N=no hole no chipbreaker) |
| 5th-6th (12) | Size | **12** = 12mm inscribed circle diameter |
| 7th-8th (04) | Thickness | **04** = 4mm thick |
| 9th-10th (08) | Corner radius | **08** = 0.8mm corner radius |

## Common Insert Shapes

| Shape | Letter | Strength | Finish | Typical Use |
|-------|--------|----------|--------|-------------|
| Round (R) | Strongest | Good | Heavy roughing |
| Square (S) | Very strong | Good | Roughing, 4 edges |
| 80° Diamond (C) | Strong | Good | General turning, best all-rounder |
| Triangle (T) | Moderate | Moderate | Finishing, 3 edges |
| 55° Diamond (D) | Lower | Excellent | Profiling, finishing |
| 35° Diamond (V) | Weakest | Best | Fine profiling, tight corners |

## Chipbreaker Geometry

Every insert has a chipbreaker ground into the top face:
- **Roughing (R/MR)**: Wide, deep groove — handles heavy cuts, breaks thick chips
- **Medium (M/MM)**: Balanced — most versatile for general machining
- **Finishing (F/MF)**: Narrow, shallow — light cuts, excellent surface finish`,
  }],
  prismEngines: ["ToolDatabaseEngine"],
}];

const c07_mod5: Lesson[] = [{
  id: `${C07}-m5-l1`, moduleId: `${C07}-mod-5`,
  title: "Tool Holders", order: 1,
  content: [{
    type: "text",
    body: `# Tool Holders — The Critical Link

## Why Holders Matter

The tool holder connects the cutting tool to the machine spindle. A bad holder = runout = poor finish + short tool life.

**Runout rule of thumb**: Every 0.01mm (0.0004") of runout reduces tool life by ~10%.

## Holder Types

| Type | Runout | Clamping Force | Best For |
|------|--------|---------------|---------|
| **ER Collet Chuck** | 0.010-0.015mm | Moderate | General purpose, drills, end mills |
| **Milling Chuck** | 0.005-0.010mm | High | End mills, heavy milling |
| **Hydraulic Chuck** | 0.003mm | High | Precision finishing, drilling |
| **Shrink-Fit** | 0.002mm | Very high | High-speed, high-precision |
| **Side-Lock (Weldon)** | 0.015-0.025mm | Moderate | Budget, heavy roughing |
| **Shell Mill Arbor** | N/A | Bolt-on | Face mills, large shell mills |

## Spindle Taper Interfaces

| Taper | Pull Stud | Contact | Speed Limit |
|-------|----------|---------|------------|
| **CAT40** (V-flange) | Yes | Taper only | ~12,000 RPM |
| **BT40** (V-flange) | Yes | Taper only | ~12,000 RPM |
| **HSK63A** (hollow taper) | No (built-in) | Taper + face | ~33,000 RPM |
| **CAT50** | Yes | Taper only | ~6,000 RPM |

## HSK vs CAT — The Key Difference

- **CAT/BT**: Only the taper contacts the spindle. At high RPM, the spindle bore expands slightly, loosening the grip.
- **HSK**: Both the taper AND the face contact the spindle. The hollow shank actually grips TIGHTER at high RPM. This is why HSK is used for high-speed machining.`,
  }],
}];

const c07_mod6: Lesson[] = [{
  id: `${C07}-m6-l1`, moduleId: `${C07}-mod-6`,
  title: "Tool Coatings", order: 1,
  content: [{
    type: "text",
    body: `# Tool Coatings — The Invisible Shield

## What Coatings Do

A thin layer (2-6 µm) applied to the cutting edge that provides:
- **Heat resistance** — coating insulates the carbide substrate from cutting heat
- **Hardness** — coating is harder than the base material, resists abrasive wear
- **Low friction** — smoother chip flow, less BUE, better finish

## Common Coatings

| Coating | Color | Max Temp | Hardness (HV) | Best For |
|---------|-------|---------|---------------|---------|
| **TiN** | Gold | 600°C | 2,300 | General steel, visible wear indicator |
| **TiCN** | Grey-violet | 450°C | 3,000 | Stainless, harder steels, better wear |
| **TiAlN** | Dark purple/black | 900°C | 3,300 | High-speed steel/stainless, dry machining |
| **AlCrN** | Grey | 1,100°C | 3,200 | Hardened steel, high-temp applications |
| **AlTiN** | Black | 900°C | 3,500 | Aerospace alloys, superalloys |
| **Diamond (CVD)** | Grey | 700°C | 10,000 | Aluminum, composites, graphite |
| **DLC** | Dark grey | 350°C | 5,000 | Non-ferrous, medical, low friction |

## Coating Selection Logic

| Workpiece Material | Recommended Coating | Why |
|-------------------|-------------------|-----|
| Aluminum | Uncoated, ZrN, or Diamond | Sharp edge prevents BUE; TiAlN would CAUSE sticking |
| Carbon steel | TiAlN or AlCrN | High heat resistance for sustained cutting |
| Stainless | TiAlN (PVD) | Heat resistance + low friction reduces work hardening |
| Cast iron | TiCN or Al₂O₃ | Abrasion resistance for abrasive particles |
| Titanium | TiAlN or AlTiN | Extreme heat resistance (titanium hoards heat) |
| Hardened steel >50 HRC | CBN or ceramic | Coated carbide can't handle the hardness |
| Plastics | Uncoated, diamond | Sharp edge, low friction, no heat buildup |`,
  }],
}];

const c07_mod7: Lesson[] = [{
  id: `${C07}-m7-l1`, moduleId: `${C07}-mod-7`,
  title: "Tool Materials", order: 1,
  content: [{
    type: "text",
    body: `# Tool Materials — The Hardness vs Toughness Tradeoff

## The Fundamental Tradeoff

**Harder tools** resist wear but break easily under shock.
**Tougher tools** absorb impact but wear out faster.

You must choose the right balance for each application.

## Tool Material Hierarchy (soft→hard, tough→brittle)

| Material | Hardness (HV) | Toughness | Speed Range | Use |
|----------|--------------|-----------|------------|-----|
| **HSS** (High-Speed Steel) | 800 | Excellent | 30-60 m/min | Manual machines, tapping, form tools |
| **Cobalt HSS** (M42) | 900 | Very good | 40-80 m/min | Harder materials, better heat resistance |
| **Solid Carbide** | 1,500-1,800 | Good | 80-400 m/min | CNC end mills, drills — the standard |
| **Cermet** | 1,800-2,000 | Moderate | 150-350 m/min | Finishing steel/stainless (excellent finish) |
| **Ceramic** (Al₂O₃, Si₃N₄) | 2,000-2,500 | Low | 300-1,000 m/min | Cast iron roughing, superalloy finishing |
| **CBN** (Cubic Boron Nitride) | 4,500 | Low | 150-300 m/min | Hardened steel (>45 HRC), hard turning |
| **PCD** (Polycrystalline Diamond) | 8,000 | Very low | 300-3,000 m/min | Aluminum, composites, non-ferrous |

## When to Use What

- **Small parts, general**: Solid carbide end mills and drills (90% of CNC work)
- **Production turning**: Carbide inserts (80% of turning)
- **Hardened steel turning**: CBN inserts (replaces grinding)
- **Cast iron at high speed**: Ceramic inserts (3-5× faster than carbide)
- **Aluminum production**: PCD inserts (10× the tool life of carbide)
- **Threading/tapping**: HSS or cobalt HSS (toughness matters more than speed)`,
  }],
}];

const c07_mod8: Lesson[] = [{
  id: `${C07}-m8-l1`, moduleId: `${C07}-mod-8`,
  title: "Reading a Tool Catalog", order: 1,
  content: [{
    type: "text",
    body: `# Reading a Tool Catalog

## The Catalog Page Layout

Every major tooling manufacturer (Sandvik, Kennametal, ISCAR, Walter) uses a similar layout:

### 1. Product Selection Guide
- Start with your **operation** (turning, milling, drilling, etc.)
- Then your **material** (ISO P/M/K/N/S/H)
- Then your **application** (roughing, semi-finishing, finishing)

### 2. Tool Body Page
Shows the physical tool:
- Ordering code / catalog number
- Dimensions diagram with key measurements
- Insert pocket size and compatibility
- Shank type and size (CAT40, HSK63, etc.)

### 3. Insert Selection
For each tool body, compatible inserts are listed:
- ISO designation (CNMG 120408)
- Grade (material-specific: GC4325, GC2220, etc.)
- Chipbreaker (MR for roughing, MM for medium, MF for finishing)
- Geometry code (positive, negative, wiper, etc.)

### 4. Speed & Feed Tables
The most important page:

| Material | ISO Group | Vc (m/min) | fn (mm/rev) | ap (mm) |
|----------|----------|-----------|-------------|---------|
| Low carbon steel | P | 250-400 | 0.15-0.40 | 1.0-5.0 |
| Stainless 304 | M | 150-250 | 0.10-0.30 | 0.5-3.0 |
| Cast iron | K | 200-350 | 0.15-0.50 | 1.0-6.0 |

**Start in the MIDDLE of the range**, then adjust based on results.

### 5. Application Notes
- Minimum/maximum depth of cut for each insert
- Recommended coolant type and pressure
- Wear patterns to watch for
- Troubleshooting tips

## Online Catalogs & Tool Selection Apps

Most manufacturers now have online tools:
- **Sandvik CoroPlus Tool Guide** — select operation, material, get tool + parameters
- **Kennametal NOVO** — similar guided selection
- **ISCAR ITA** — machining advisor with calculator
- **Walter GPS** — guided parameter selection

These give you a starting point. Fine-tuning happens at the machine.`,
  }],
  prismEngines: ["ToolDatabaseEngine"],
}];

// L0-07 Quizzes
const C07_QUIZZES: Record<string, Question[]> = {
  [`${C07}-mod-2-quiz`]: [
    {
      id: "c07-q1", type: "multiple_choice", difficulty: 1,
      text: "How many flutes should you typically use when milling aluminum?",
      options: [
        { id: "a", text: "2 or 3 flutes", isCorrect: true,
          explanation: "Fewer flutes = bigger chip space. Aluminum makes large chips that need room." },
        { id: "b", text: "5 or 6 flutes", isCorrect: false },
        { id: "c", text: "It doesn't matter", isCorrect: false },
      ],
      explanation: "Aluminum produces large, soft chips. 2-3 flute end mills provide the chip space needed. 4+ flutes can pack and re-cut chips.",
      tags: ["tooling", "end_mill", "aluminum"],
    },
  ],
  [`${C07}-mod-4-quiz`]: [
    {
      id: "c07-q2", type: "multiple_choice", difficulty: 2,
      text: "In the ISO insert designation CNMG 120408, what does '08' at the end mean?",
      options: [
        { id: "a", text: "8mm inscribed circle", isCorrect: false },
        { id: "b", text: "0.8mm corner radius", isCorrect: true },
        { id: "c", text: "8mm thickness", isCorrect: false },
      ],
      explanation: "The last two digits are corner radius in tenths of mm. 08 = 0.8mm. The '12' = 12mm IC, '04' = 4mm thick.",
      tags: ["tooling", "inserts", "iso_designation"],
    },
  ],
  [`${C07}-mod-5-quiz`]: [
    {
      id: "c07-q3", type: "multiple_choice", difficulty: 2,
      text: "Which tool holder type provides the BEST runout for precision finishing?",
      options: [
        { id: "a", text: "ER collet chuck (0.010-0.015mm TIR)", isCorrect: false },
        { id: "b", text: "Side-lock / Weldon (0.015-0.025mm TIR)", isCorrect: false },
        { id: "c", text: "Shrink-fit (0.002mm TIR)", isCorrect: true },
      ],
      explanation: "Shrink-fit provides the lowest runout (0.002mm), followed by hydraulic (0.003mm). Lower runout = longer tool life + better finish.",
      tags: ["tooling", "holders", "runout"],
    },
  ],
  [`${C07}-mod-7-quiz`]: [
    {
      id: "c07-q4", type: "multiple_choice", difficulty: 1,
      text: "What tool material would you use to turn hardened steel at 58 HRC?",
      options: [
        { id: "a", text: "Solid carbide", isCorrect: false,
          explanation: "Carbide works up to ~45 HRC, then wear rate is excessive" },
        { id: "b", text: "CBN (Cubic Boron Nitride)", isCorrect: true },
        { id: "c", text: "HSS (High-Speed Steel)", isCorrect: false,
          explanation: "HSS is far too soft for hardened steel" },
      ],
      explanation: "CBN is the standard for hard turning (>45 HRC). It's hard enough to cut hardened steel and can replace cylindrical grinding.",
      tags: ["tooling", "materials", "hard_turning"],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// L0-08: Workholding Fundamentals (6 modules, ~6 hours)
// ═══════════════════════════════════════════════════════════

const C08 = "L0-08";

const c08_mod1: Lesson[] = [{
  id: `${C08}-m1-l1`, moduleId: `${C08}-mod-1`,
  title: "Why Workholding Matters", order: 1,
  content: [{
    type: "text",
    body: `# Why Workholding Matters

## The Part Must Not Move

During machining, cutting forces can reach **500-5,000+ Newtons**. If the workpiece shifts even 0.05mm:
- Dimensions are wrong → scrap
- Tool crashes into the part → broken tool, damaged machine
- Part flies out of the chuck → **lethal projectile**

## The Three Goals of Workholding

1. **Locate** the part precisely (know where it is in the machine's coordinate system)
2. **Clamp** the part securely (resist all cutting forces with safety margin)
3. **Support** the part against deflection (thin walls, long parts)

## Common Workholding Failures

| Failure Mode | Cause | Consequence |
|-------------|-------|-------------|
| Part shifts in vise | Insufficient clamping force, parallels not seated | Dimensional error, scrap |
| Part flies from chuck | RPM too high, grip too weak, wrong jaw type | Extreme danger — can be fatal |
| Part deflects during cut | Thin wall, no support, tool pressure | Dimensional error, chatter |
| Part distorts after unclamping | Over-clamping thin or aluminum parts | Parts are oversize, won't pass inspection |
| Wrong datum | Part loaded against wrong reference | All features in wrong location |

## The Cardinal Rule

**You can NEVER over-think workholding. A $500 part in a $300,000 machine is only as good as the $50 vise holding it.**`,
  }],
}];

const c08_mod2: Lesson[] = [{
  id: `${C08}-m2-l1`, moduleId: `${C08}-mod-2`,
  title: "Vises", order: 1,
  content: [{
    type: "text",
    body: `# Vises — The Most Common Milling Workholding

## Kurt-Style Precision Vise

The industry standard for CNC milling. Features:
- **Angle-lock jaw mechanism**: Jaws pull DOWN as they clamp (seats the part on parallels)
- **Precision ground**: Jaw faces parallel to ±0.005mm
- **Repeatability**: Parts load to the same position every time

## Setup Components

### Parallels
Steel bars placed under the part to raise it above the jaws:
- Part sits on TWO parallels
- Tap down with dead-blow hammer to seat on parallels before clamping
- **Test**: After clamping, try to wiggle the parallels. If they slide freely = part not seated. Re-seat!

### Vise Stop
A fixed reference point at the back of the jaw:
- Every part loads to the same Z-axis position
- Critical for production runs (consistent part location)

### Soft Jaws
Custom-machined jaws for specific parts:
- Machine the jaw to match the part profile
- Provides more surface contact = more clamping force
- Essential for round or irregular parts

## Multi-Vise Setups

For production: bolt 2 or 3 vises side-by-side on the table:
- Machine 2-3 parts per cycle
- Use a common vise stop for consistent location
- Each vise independently adjusted

## Clamping Force Rules

- Tighten with a torque wrench for consistency (not "gorilla-tight")
- **Too loose** = part shifts during heavy cuts
- **Too tight** = part distorts (especially thin aluminum or plastic)
- General rule: 20-30 ft-lbs for 6" vise on general work`,
  }],
}];

const c08_mod3: Lesson[] = [{
  id: `${C08}-m3-l1`, moduleId: `${C08}-mod-3`,
  title: "Chucks & Collets", order: 1,
  content: [{
    type: "text",
    body: `# Chucks & Collets — Lathe Workholding

## 3-Jaw Self-Centering Chuck

The most common lathe chuck:
- Three jaws move simultaneously via a scroll plate
- Self-centering: round parts are automatically centered
- **TIR (Total Indicator Runout)**: 0.05-0.10mm for standard chuck
- Good for: round stock, hexagonal stock, general turning

**Limitation**: Only centers round or hexagonal parts. Cannot hold irregular shapes.

## 4-Jaw Independent Chuck

Each jaw moves independently:
- Can hold ANY shape (square, rectangular, irregular)
- Used to offset workpieces (eccentric turning)
- Requires manual indication with a dial indicator to center
- TIR achievable: **0.005mm or better** with patience

## 6-Jaw Chuck

Six jaws for thin-walled parts:
- Distributes clamping force over more points
- Less distortion on tubes, thin rings, and delicate parts
- Self-centering like a 3-jaw

## Collets

### ER Collets (Milling)
- Spring collet system with 1mm range per collet (ER32-12 holds 11-12mm)
- Quick tool changes, decent runout (0.010-0.015mm)

### 5C Collets (Lathe)
- Excellent accuracy (0.005mm TIR)
- Very fast part changes (push in, pull lever)
- Limited to parts ≤1.0625" (27mm) diameter

### Dead-Length Collets (Lathe)
- Part doesn't move axially during clamping
- Critical when Z-axis position must be precise
- Used in production turning where every part must be the same length`,
  }],
}];

const c08_mod4: Lesson[] = [{
  id: `${C08}-m4-l1`, moduleId: `${C08}-mod-4`,
  title: "Fixtures & Jigs", order: 1,
  content: [{
    type: "text",
    body: `# Fixtures & Jigs

## Custom Fixture Plates

A fixture plate is an aluminum or steel plate with a grid of threaded holes (typically M8 or 5/16-18 on 50mm or 2" centers). Parts and clamps bolt directly to the plate.

**Advantages:**
- Infinite flexibility — clamp anything anywhere
- Quick changeover between jobs
- Can be designed for multiple parts

## Modular Fixturing Systems

Pre-made components that bolt together:

| System | Manufacturer | Feature |
|--------|-------------|---------|
| **Insta-Lok** | Jergens | Quick-change pins and clamps on grid plates |
| **Pitbull** | Mitee-Bite | Compact edge clamps (minimal obstruction) |
| **Makro-Grip** | Lang Technik | Vise-style clamping with 5-axis access |
| **Zero-Point** | Various | Pre-locate fixtures to <0.005mm repeatability |

## Vacuum Tables
- For thin sheet parts that can't be clamped conventionally
- Require sealed table surface and vacuum pump
- Clamping force = atmospheric pressure × area ≈ 10 N/cm²
- **Limitation**: Only works for downward cutting forces; plunging can lift the part

## Magnetic Chucks
- Used on surface grinders and some milling machines
- Electromagnetic or permanent-magnet
- Only for ferromagnetic materials (steel, cast iron)
- Easy load/unload — just flip the switch
- **Limitation**: Part must be flat on the bottom, and cutting forces must be moderate`,
  }],
}];

const c08_mod5: Lesson[] = [{
  id: `${C08}-m5-l1`, moduleId: `${C08}-mod-5`,
  title: "The 3-2-1 Locating Principle", order: 1,
  content: [{
    type: "text",
    body: `# The 3-2-1 Locating Principle

## Six Degrees of Freedom

A free object in space can move in **6 ways**:
- **3 translations**: X, Y, Z (left-right, front-back, up-down)
- **3 rotations**: Around X, around Y, around Z (pitch, yaw, roll)

To fully locate a part, you must constrain all 6 DOF.

## The 3-2-1 Method

### 3 Points Define the Primary Datum (Plane)
- Place the part on **3 support points** on its largest flat face
- This constrains: Z translation + rotation around X + rotation around Y
- **3 DOF constrained, 3 remaining**

### 2 Points Define the Secondary Datum (Line)
- Press the part against **2 locating pins** on its longest edge
- This constrains: Y translation + rotation around Z
- **5 DOF constrained, 1 remaining**

### 1 Point Defines the Tertiary Datum (Point)
- Press the part against **1 locating pin** on a third face
- This constrains: X translation
- **All 6 DOF constrained!**

## Why 3-2-1 Matters

When the blueprint says "Datum A, B, C":
- **Datum A** = the primary plane (3 points)
- **Datum B** = the secondary line (2 points)
- **Datum C** = the tertiary point (1 point)

Your fixture MUST match the datum scheme on the print. If you fixture against the wrong datums, every GD&T tolerance is measured wrong.

## Common Mistake: Over-Constraining

**Never use more locating points than needed.** If you use 4 points on the primary plane instead of 3, the part will rock if the surfaces aren't perfectly flat. The part contacts 3 points and the 4th lifts — this is called **over-constrained** or "rocking".`,
  }],
}];

const c08_mod6: Lesson[] = [{
  id: `${C08}-m6-l1`, moduleId: `${C08}-mod-6`,
  title: "Clamping Force Calculations", order: 1,
  content: [{
    type: "text",
    body: `# Clamping Force Calculations

## The Basic Formula

**Minimum clamping force = Cutting force × Safety factor / Friction coefficient**

Fc_clamp = Fc_cutting × SF / µ

Where:
- **Fc_cutting**: Maximum cutting force during the operation (N)
- **SF**: Safety factor (typically **2.0-3.0**)
- **µ**: Friction coefficient between part and fixture (steel on steel ≈ 0.15-0.25, serrated jaws ≈ 0.30-0.40)

## Example Calculation

Milling 4140 steel with 20mm end mill:
- Cutting force estimate: 1,200 N
- Safety factor: 2.5
- Friction coefficient (smooth vise jaws): 0.20

Fc_clamp = 1,200 × 2.5 / 0.20 = **15,000 N** (≈ 3,370 lbf)

A standard 6" Kurt vise generates ~20,000 N at 30 ft-lbs torque — sufficient!

## Where to Clamp

### DO:
- Clamp **close to the cutting zone** (reduces deflection)
- Clamp **over solid support** (not over voids or thin sections)
- Clamp **perpendicular to the primary cutting force** direction

### DON'T:
- Clamp on thin walls (will distort or crush)
- Clamp far from the cut (part deflects toward the tool)
- Clamp on finished surfaces without protection (jaw marks)

## Thin-Wall Clamping Strategies

For thin-walled aluminum or delicate parts:
1. **Soft jaws** machined to match the part profile (distribute force)
2. **Vacuum holding** (no clamping distortion)
3. **Wax or low-melt alloy** fill (support the cavity during machining, melt out after)
4. **Leave extra stock** as sacrificial clamping tabs, remove in final operation`,
  }],
  prismEngines: ["FixtureDesignEngine", "ChuckJawForceEngine"],
}];

// L0-08 Quizzes
const C08_QUIZZES: Record<string, Question[]> = {
  [`${C08}-mod-2-quiz`]: [
    {
      id: "c08-q1", type: "multiple_choice", difficulty: 1,
      text: "After clamping a part in a vise, you try to wiggle the parallels and they slide freely. What does this mean?",
      options: [
        { id: "a", text: "The setup is correct — parallels should be free", isCorrect: false },
        { id: "b", text: "The part is not seated on the parallels — re-seat and re-clamp", isCorrect: true },
        { id: "c", text: "The parallels are the wrong size", isCorrect: false },
      ],
      explanation: "Free parallels mean the part lifted off them during clamping. Tap the part down with a dead-blow hammer, then clamp.",
      tags: ["workholding", "vise", "setup"],
    },
  ],
  [`${C08}-mod-5-quiz`]: [
    {
      id: "c08-q2", type: "multiple_choice", difficulty: 2,
      text: "In the 3-2-1 locating principle, how many support points define the PRIMARY datum?",
      options: [
        { id: "a", text: "1 point", isCorrect: false },
        { id: "b", text: "2 points", isCorrect: false },
        { id: "c", text: "3 points", isCorrect: true },
      ],
      explanation: "3 points define a plane (primary datum), constraining 3 of 6 degrees of freedom. 2 points define the secondary (line), 1 point the tertiary.",
      tags: ["workholding", "datum", "3-2-1"],
    },
  ],
  [`${C08}-mod-6-quiz`]: [
    {
      id: "c08-q3", type: "calculation", difficulty: 2,
      text: "Cutting force is 800 N, safety factor is 2.5, friction coefficient is 0.20. What minimum clamping force is required?\nFormula: Fc_clamp = Fc × SF / µ",
      correctAnswer: 10000, tolerance: 2,
      explanation: "Fc_clamp = 800 × 2.5 / 0.20 = 10,000 N",
      tags: ["workholding", "clamping_force", "calculation"],
    },
    {
      id: "c08-q4", type: "multiple_choice", difficulty: 1,
      text: "Why should you NEVER clamp directly on a thin wall?",
      options: [
        { id: "a", text: "Thin walls are too smooth for jaw grip", isCorrect: false },
        { id: "b", text: "Clamping force will distort or crush the thin wall", isCorrect: true },
        { id: "c", text: "It takes too long to set up", isCorrect: false },
      ],
      explanation: "Thin walls can't absorb clamping force without deforming. Use soft jaws, vacuum, or sacrificial tabs instead.",
      tags: ["workholding", "thin_wall"],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// Module Assembly Helpers
// ═══════════════════════════════════════════════════════════

function mkModule(
  courseId: string,
  idx: number,
  title: string,
  lessons: Lesson[],
  quizzes: Record<string, Question[]>,
  courseName: string,
  minutes: number,
): Module {
  return {
    id: `${courseId}-mod-${idx}`,
    courseId,
    title,
    description: `${title} — ${courseName}`,
    order: idx,
    lessons,
    quiz: {
      id: `${courseId}-mod-${idx}-quiz`,
      moduleId: `${courseId}-mod-${idx}`,
      questions: quizzes[`${courseId}-mod-${idx}-quiz`] ?? [],
      passingScore: 70,
    },
    estimatedMinutes: minutes,
  };
}

// ═══════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════

export const L0_04_MODULES: Module[] = [
  mkModule(C04, 1, "What is Metal?", c04_mod1, C04_QUIZZES, "Materials & Metallurgy", 45),
  mkModule(C04, 2, "Iron & Steel Families", c04_mod2, C04_QUIZZES, "Materials & Metallurgy", 45),
  mkModule(C04, 3, "Aluminum Alloys", c04_mod3, C04_QUIZZES, "Materials & Metallurgy", 40),
  mkModule(C04, 4, "Stainless Steel", c04_mod4, C04_QUIZZES, "Materials & Metallurgy", 45),
  mkModule(C04, 5, "Exotic Materials", c04_mod5, C04_QUIZZES, "Materials & Metallurgy", 40),
  mkModule(C04, 6, "Plastics & Composites", c04_mod6, C04_QUIZZES, "Materials & Metallurgy", 35),
  mkModule(C04, 7, "ISO 513 Material Groups", c04_mod7, C04_QUIZZES, "Materials & Metallurgy", 50),
  mkModule(C04, 8, "Material Identification", c04_mod8, C04_QUIZZES, "Materials & Metallurgy", 40),
];

export const L0_05_MODULES: Module[] = [
  mkModule(C05, 1, "Personal Protective Equipment", c05_mod1, C05_QUIZZES, "Shop Safety", 35),
  mkModule(C05, 2, "Machine Guarding & Interlocks", c05_mod2, C05_QUIZZES, "Shop Safety", 30),
  mkModule(C05, 3, "Chip & Coolant Hazards", c05_mod3, C05_QUIZZES, "Shop Safety", 30),
  mkModule(C05, 4, "Electrical & Fire Safety", c05_mod4, C05_QUIZZES, "Shop Safety", 35),
  mkModule(C05, 5, "Lifting & Ergonomics", c05_mod5, C05_QUIZZES, "Shop Safety", 25),
  mkModule(C05, 6, "Emergency Procedures", c05_mod6, C05_QUIZZES, "Shop Safety", 30),
];

export const L0_06_MODULES: Module[] = [
  mkModule(C06, 1, "What is CNC?", c06_mod1, C06_QUIZZES, "Intro to CNC Machines", 45),
  mkModule(C06, 2, "Vertical Machining Centers (VMC)", c06_mod2, C06_QUIZZES, "Intro to CNC Machines", 45),
  mkModule(C06, 3, "Horizontal Machining Centers (HMC)", c06_mod3, C06_QUIZZES, "Intro to CNC Machines", 40),
  mkModule(C06, 4, "CNC Lathes", c06_mod4, C06_QUIZZES, "Intro to CNC Machines", 50),
  mkModule(C06, 5, "Swiss-Type Lathes", c06_mod5, C06_QUIZZES, "Intro to CNC Machines", 40),
  mkModule(C06, 6, "Grinders, EDM & Specialty", c06_mod6, C06_QUIZZES, "Intro to CNC Machines", 45),
  mkModule(C06, 7, "CNC Controllers", c06_mod7, C06_QUIZZES, "Intro to CNC Machines", 40),
  mkModule(C06, 8, "Machine Specs That Matter", c06_mod8, C06_QUIZZES, "Intro to CNC Machines", 45),
];

export const L0_07_MODULES: Module[] = [
  mkModule(C07, 1, "Why Cutting Tools Matter", c07_mod1, C07_QUIZZES, "Cutting Tools", 30),
  mkModule(C07, 2, "End Mills", c07_mod2, C07_QUIZZES, "Cutting Tools", 50),
  mkModule(C07, 3, "Drills", c07_mod3, C07_QUIZZES, "Cutting Tools", 45),
  mkModule(C07, 4, "Inserts & Indexable Tools", c07_mod4, C07_QUIZZES, "Cutting Tools", 55),
  mkModule(C07, 5, "Tool Holders", c07_mod5, C07_QUIZZES, "Cutting Tools", 40),
  mkModule(C07, 6, "Tool Coatings", c07_mod6, C07_QUIZZES, "Cutting Tools", 35),
  mkModule(C07, 7, "Tool Materials", c07_mod7, C07_QUIZZES, "Cutting Tools", 40),
  mkModule(C07, 8, "Reading a Tool Catalog", c07_mod8, C07_QUIZZES, "Cutting Tools", 45),
];

export const L0_08_MODULES: Module[] = [
  mkModule(C08, 1, "Why Workholding Matters", c08_mod1, C08_QUIZZES, "Workholding", 35),
  mkModule(C08, 2, "Vises", c08_mod2, C08_QUIZZES, "Workholding", 50),
  mkModule(C08, 3, "Chucks & Collets", c08_mod3, C08_QUIZZES, "Workholding", 50),
  mkModule(C08, 4, "Fixtures & Jigs", c08_mod4, C08_QUIZZES, "Workholding", 45),
  mkModule(C08, 5, "The 3-2-1 Locating Principle", c08_mod5, C08_QUIZZES, "Workholding", 50),
  mkModule(C08, 6, "Clamping Force Calculations", c08_mod6, C08_QUIZZES, "Workholding", 55),
];
