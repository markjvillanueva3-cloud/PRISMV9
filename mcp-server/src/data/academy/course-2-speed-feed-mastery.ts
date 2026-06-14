/**
 * Course 2: Speed & Feed Mastery
 * Level: Intermediate | 10 Modules | ~6 hours
 *
 * Deep dive into the physics of cutting. Students learn to
 * calculate speed/feed from scratch, understand Kienzle force
 * and Taylor tool life, and use stability lobes for chatter-free
 * machining. Every module has a live PRISM calculator.
 */

import type { Module, Lesson, Question } from
  "../../engines/CurriculumEngine.js";

const CID = "course-2";

// ═══════════════════════════════════════════════════════════
// Module 1: Chip Load Explained
// ═══════════════════════════════════════════════════════════

const mod1: Lesson[] = [{
  id: `${CID}-mod-1-les-1`,
  moduleId: `${CID}-mod-1`,
  title: "What is Chip Load and Why It Matters",
  order: 1,
  content: [{
    type: "text",
    body: `# Chip Load — The Foundation of Feed Rate

## What is Chip Load?

**Chip load (fz)** is the thickness of material each cutting edge removes per revolution. Think of it as "how big a bite each tooth takes."

$$f_z = \\frac{V_f}{z \\times n}$$

Where:
- $f_z$ = chip load (mm/tooth)
- $V_f$ = table feed rate (mm/min)
- $z$ = number of flutes
- $n$ = spindle speed (RPM)

## Why It Matters

Chip load is the **single most important parameter** for tool life. Every tool manufacturer specifies a recommended chip load range.

### Too Low (Rubbing)
- The tool slides over the surface instead of cutting
- Heat builds up with nowhere to go
- Tool edge breaks down from thermal cycling
- **This is the #1 mistake beginners make** — going too light

### Too High (Overload)
- Excessive force bends or breaks the tool
- Poor surface finish (scallops, chatter)
- Spindle load alarm or stall

### Just Right (Cutting)
- Clean chip formation — heat leaves with the chip
- Predictable tool wear (gradual, not sudden)
- Good surface finish
- Maximum productivity per tool dollar

## Typical Chip Loads by Tool Diameter

| Tool Diameter | Aluminum fz | Steel fz | Stainless fz |
|---------------|-------------|----------|--------------|
| 3mm | 0.02-0.04 | 0.01-0.025 | 0.008-0.02 |
| 6mm | 0.04-0.08 | 0.025-0.05 | 0.02-0.04 |
| 12mm | 0.06-0.12 | 0.04-0.08 | 0.03-0.06 |
| 25mm | 0.10-0.20 | 0.06-0.12 | 0.05-0.10 |

**Rule of thumb**: fz ≈ 1% of tool diameter for steel, 2% for aluminum.`,
  }],
  keyFormulas: ["feed_rate"],
}];

// ═══════════════════════════════════════════════════════════
// Module 2: Kienzle Cutting Force
// ═══════════════════════════════════════════════════════════

const mod2: Lesson[] = [{
  id: `${CID}-mod-2-les-1`,
  moduleId: `${CID}-mod-2`,
  title: "Kienzle Force Model — Predicting Cutting Force",
  order: 1,
  content: [
    {
      type: "text",
      body: `# Kienzle Cutting Force Model

## The Formula

$$F_c = k_{c1.1} \\times a_p \\times f_z^{(1-m_c)}$$

This is the most important formula in machining physics. It predicts how much force the tool experiences during cutting.

## What Each Variable Means

### $k_{c1.1}$ — Specific Cutting Force (N/mm²)
The force needed to cut 1mm² of chip cross-section. **This is a material property.**

| Material | kc1.1 (N/mm²) | What it means |
|----------|---------------|---------------|
| Aluminum 6061 | 600-800 | Easy to cut (low force) |
| Carbon Steel 1045 | 1500-1800 | Moderate force |
| Stainless 304 | 1800-2200 | High force |
| Ti-6Al-4V | 1400-1600 | Moderate force but LOW speed |
| Inconel 718 | 2800-3500 | Very high force |

### $a_p$ — Depth of Cut (mm)
How deep the tool goes into the material. Directly proportional — double the depth, double the force.

### $f_z$ — Feed per Tooth (mm)
The chip load. Note the **(1-mc)** exponent — force doesn't increase linearly with feed.

### $m_c$ — Kienzle Exponent
Material-dependent constant (typically 0.18-0.35). This makes the relationship non-linear.

## Visual: How Force Changes with Parameters

Imagine you're cutting aluminum (kc1.1 = 700, mc = 0.25):

| ap (mm) | fz (mm) | Fc (N) | Comment |
|---------|---------|--------|---------|
| 1 | 0.05 | 149 | Light finishing cut |
| 2 | 0.10 | 495 | Medium cut |
| 4 | 0.15 | 1267 | Heavy roughing |
| 6 | 0.20 | 2286 | Aggressive roughing |

**Key insight**: Doubling $a_p$ doubles force, but doubling $f_z$ only increases force by ~68% (because of the exponent).`,
    },
    {
      type: "calculator",
      title: "Kienzle Force Calculator",
      calculatorConfig: {
        engine: "KienzleForceModelEngine",
        inputFields: ["kc1_1", "mc", "depth_of_cut", "feed_per_tooth"],
        outputFields: ["cutting_force", "power"],
        defaults: { kc1_1: 1500, mc: 0.25, depth_of_cut: 3, feed_per_tooth: 0.1 },
      },
    },
  ],
  keyFormulas: ["kienzle", "power"],
}];

// ═══════════════════════════════════════════════════════════
// Module 3: Taylor Tool Life
// ═══════════════════════════════════════════════════════════

const mod3: Lesson[] = [{
  id: `${CID}-mod-3-les-1`,
  moduleId: `${CID}-mod-3`,
  title: "Taylor Tool Life — Speed vs Life Trade-off",
  order: 1,
  content: [
    {
      type: "text",
      body: `# Taylor Tool Life Equation

## The Formula

$$T = \\left(\\frac{C}{V_c}\\right)^{\\frac{1}{n}}$$

This tells you how long a tool will last at a given cutting speed. It's the most important economic equation in machining.

## What Each Variable Means

### $T$ — Tool Life (minutes)
How many minutes of cutting before the tool needs replacing.

### $C$ — Taylor Constant (m/min)
The cutting speed at which tool life = 1 minute. Material + tool combination specific.

### $V_c$ — Cutting Speed (m/min)
Your chosen surface speed. **This is the variable you control.**

### $n$ — Taylor Exponent
How sensitive tool life is to speed changes:
- $n$ = 0.1 → very sensitive (HSS tools)
- $n$ = 0.25 → moderate (carbide tools)
- $n$ = 0.5 → less sensitive (ceramic tools)

## The Trade-off Visualized

For carbide in steel (C=350, n=0.25):

| Vc (m/min) | Tool Life (min) | Parts per tool |
|------------|-----------------|----------------|
| 100 | 150 | ~50 parts |
| 150 | 37 | ~18 parts |
| 200 | 9.4 | ~5 parts |
| 250 | 3.1 | ~2 parts |
| 300 | 1.2 | barely 1 part |

**Doubling speed cuts tool life by 16× (for n=0.25)!**

## The Economic Sweet Spot

Running faster costs more tools but saves time. The optimal speed minimizes **cost per part** (not tool cost alone):

$$V_{opt} = C \\times \\left(\\frac{n}{1-n} \\times \\frac{1}{C_t / C_m + t_{tc}}\\right)^n$$

Where $C_t$ = tool cost, $C_m$ = machine rate, $t_{tc}$ = tool change time.

**Key insight**: On an expensive machine ($200/hr), run faster and burn more tools. On a cheap machine ($50/hr), run slower and save tools.`,
    },
    {
      type: "calculator",
      title: "Taylor Tool Life Calculator",
      calculatorConfig: {
        engine: "UltimateSpeedFeedEngine",
        inputFields: ["cutting_speed"],
        outputFields: ["tool_life"],
        defaults: { cutting_speed: 200 },
      },
    },
  ],
  keyFormulas: ["taylor"],
}];

// ═══════════════════════════════════════════════════════════
// Module 4: SFM to RPM
// ═══════════════════════════════════════════════════════════

const mod4: Lesson[] = [{
  id: `${CID}-mod-4-les-1`,
  moduleId: `${CID}-mod-4`,
  title: "Converting Surface Speed to Spindle RPM",
  order: 1,
  content: [{
    type: "text",
    body: `# SFM to RPM Conversion

## The Formula (Metric)

$$RPM = \\frac{V_c \\times 1000}{\\pi \\times D}$$

## The Formula (Imperial)

$$RPM = \\frac{SFM \\times 3.82}{D_{inches}}$$

(3.82 = 12/π, the "magic number" machinists memorize)

## Why This Matters

Tool manufacturers give you **surface speed** (Vc or SFM), but the machine needs **RPM**. You must convert every time.

## Quick Reference Table

| Vc (m/min) | D=6mm | D=12mm | D=25mm | D=50mm |
|------------|-------|--------|--------|--------|
| 100 | 5305 | 2653 | 1273 | 637 |
| 200 | 10610 | 5305 | 2546 | 1273 |
| 300 | 15915 | 7958 | 3820 | 1910 |

## Machine RPM Limits

Always check your machine's max RPM:
- **Standard VMC**: 8,000-12,000 RPM
- **High-speed VMC**: 15,000-24,000 RPM
- **HSM spindle**: 30,000-42,000 RPM
- **Lathe**: 3,000-6,000 RPM (chuck work)

If the calculated RPM exceeds machine max → **cap at max RPM**. You'll run below optimal Vc but that's better than not running at all.

## Effective Diameter in Ball End Mills

For ball end mills, the effective cutting diameter changes with depth of cut:

$$D_{eff} = 2 \\times \\sqrt{ap \\times (D - ap)}$$

At shallow DOC, the effective diameter is much smaller than nominal — so you need much higher RPM!`,
  }, {
    type: "calculator",
    title: "Live RPM Calculator (interactive)",
    body: `Enter your **cutting speed Vc** (m/min) and **tool diameter D** (mm) below — the spindle RPM is computed live via PRISM's SpeedFeedOrchestratorEngine. Formula [per ISO 3002-1:1982, clause 4]: RPM = (Vc × 1000) / (π × D). Try the table values above to verify (Vc=200 m/min, D=12 mm should give ~5305 RPM).`,
    calculatorConfig: {
      engine: "SpeedFeedOrchestratorEngine",
      inputFields: ["Vc_m_per_min", "diameter_mm"],
      outputFields: ["rpm"],
      defaults: { Vc_m_per_min: 200, diameter_mm: 12 },
    },
  }],
  keyFormulas: ["rpm_from_vc"],
  prismEngines: ["SpeedFeedOrchestratorEngine"],
}];

// ═══════════════════════════════════════════════════════════
// Module 5: Feed Rate Calculation
// ═══════════════════════════════════════════════════════════

const mod5: Lesson[] = [{
  id: `${CID}-mod-5-les-1`,
  moduleId: `${CID}-mod-5`,
  title: "Calculating the Right Feed Rate",
  order: 1,
  content: [{
    type: "text",
    body: `# Feed Rate Calculation

## The Formula

$$V_f = f_z \\times z \\times n$$

Where:
- $V_f$ = feed rate (mm/min)
- $f_z$ = chip load (mm/tooth) — from manufacturer
- $z$ = number of flutes
- $n$ = spindle RPM — from your SFM conversion

## Step-by-Step Example

**Given**: 12mm 4-flute carbide end mill in 6061 aluminum
1. Manufacturer recommends: Vc = 300 m/min, fz = 0.08 mm/tooth
2. RPM = (300 × 1000) / (π × 12) = 7958 RPM
3. Feed = 0.08 × 4 × 7958 = **2547 mm/min**

## Feed per Revolution (f)

For turning, feed is given per revolution:

$$V_f = f \\times n$$

- Roughing: f = 0.15-0.35 mm/rev
- Finishing: f = 0.05-0.15 mm/rev

## Plunge Feed (Drilling, Ramping)

When the tool moves in Z (plunging into material), use reduced feed:
- **Drilling**: full manufacturer-recommended feed
- **Ramping**: 50% of XY feed rate
- **Plunge milling**: 30-50% of XY feed rate
- **Helical entry**: 50% feed, helical angle ≤ 2-3°

## What Changes Feed Rate?

| Situation | Adjust feed |
|-----------|-------------|
| Slotting (ae = D) | Reduce 30-50% |
| Thin walls | Reduce 30-50% |
| Long stick-out | Reduce 20-40% |
| Hard material (>45 HRC) | Reduce 40-60% |
| Finishing pass | Reduce to achieve target Ra |
| Adaptive/HSM toolpath | Can increase 50-200% |`,
  }, {
    type: "calculator",
    title: "Live Feed Rate Calculator (interactive)",
    body: `Enter **chip load fz** (mm/tooth from manufacturer table), **flute count z**, and **spindle RPM n** — feed rate is computed live via PRISM's SpeedFeedOrchestratorEngine. Formula [per Sandvik Coromant *Modern Metal Cutting* — milling section]: Vf = fz × z × n (mm/min). Try the example above (fz=0.08, z=4, n=7958 RPM) — answer should be ~2547 mm/min.`,
    calculatorConfig: {
      engine: "SpeedFeedOrchestratorEngine",
      inputFields: ["fz_mm_per_tooth", "flute_count", "rpm"],
      outputFields: ["feed_rate_mm_per_min"],
      defaults: { fz_mm_per_tooth: 0.08, flute_count: 4, rpm: 7958 },
    },
  }],
  keyFormulas: ["feed_rate", "mrr"],
  prismEngines: ["SpeedFeedOrchestratorEngine"],
}];

// ═══════════════════════════════════════════════════════════
// Module 6: Stability Lobes
// ═══════════════════════════════════════════════════════════

const mod6: Lesson[] = [{
  id: `${CID}-mod-6-les-1`,
  moduleId: `${CID}-mod-6`,
  title: "Stability Lobes — Finding Chatter-Free Zones",
  order: 1,
  content: [{
    type: "text",
    body: `# Stability Lobe Diagrams

## What is Chatter?

Chatter is **self-excited vibration** during cutting. It produces:
- Terrible surface finish (wavy marks)
- Loud screeching noise
- Rapid tool wear or breakage
- Dimensional inaccuracy

## Why Does Chatter Happen?

The tool-workpiece system has **natural frequencies** (like a tuning fork). When the tooth-passing frequency aligns with a natural frequency → **regenerative chatter**.

$$f_{tooth} = \\frac{z \\times n}{60}$$

If $f_{tooth}$ is near a natural frequency → chatter.

## The Stability Lobe Diagram

A stability lobe diagram is a map of **RPM vs Depth of Cut** showing where chatter WILL and WON'T occur.

- **Above the boundary line** → UNSTABLE (chatter)
- **Below the boundary line** → STABLE (no chatter)
- **The lobes** create "sweet spots" at specific RPMs where you can cut deeper without chatter

## How to Use Stability Lobes

1. **Find the sweet spots** — RPMs where the boundary is highest
2. **Run AT those RPMs** — not between them
3. **If you get chatter**, change RPM by 5-10% (often enough to move into a stable lobe)
4. **Higher lobes** (higher RPM) generally allow deeper cuts

## Quick Chatter Fixes (No Lobe Diagram)

If you hear chatter RIGHT NOW:
1. **Change RPM by 10%** (up or down — try both)
2. **Reduce depth of cut** by 30-50%
3. **Reduce stick-out** (shorter tool = stiffer = higher natural frequency)
4. **Switch to fewer flutes** (changes tooth-passing frequency)
5. **Add rigidity** — tighten workholding, use shorter tool, bigger shank`,
  }],
}];

// ═══════════════════════════════════════════════════════════
// Modules 7-10: Chip Thinning, ISO Strategies, Deflection,
// Full Walkthrough
// ═══════════════════════════════════════════════════════════

const mod7: Lesson[] = [{
  id: `${CID}-mod-7-les-1`,
  moduleId: `${CID}-mod-7`,
  title: "Chip Thinning Compensation",
  order: 1,
  content: [{
    type: "text",
    body: `# Chip Thinning — When ae < D/2

## The Problem

When your radial engagement (ae) is less than half the tool diameter, the actual chip is **thinner** than your programmed fz. The tool is rubbing more than cutting.

## The Physics

$$h_{ex} = f_z \\times \\frac{2 \\times a_e}{D} \\quad (\\text{when } a_e < D/2)$$

At ae = 10% of D, the actual chip is only ~20% as thick as the programmed fz. You need to increase feed to compensate.

## The Fix: Adjusted Feed

$$f_{z(adj)} = f_z \\times \\frac{D}{2 \\times a_e}$$

**Example**: 12mm end mill, ae = 1.2mm (10% engagement)
- Manufacturer fz = 0.08 mm
- Adjusted fz = 0.08 × (12 / (2 × 1.2)) = 0.08 × 5 = **0.40 mm/tooth**
- Feed rate goes from 2560 mm/min to **12800 mm/min**!

## When Does This Apply?

- **Finishing passes** (light radial engagement)
- **HSM/adaptive toolpaths** (typically 5-15% ae)
- **Rest machining** (cleaning up small remaining stock)

## The Result

With proper chip thinning compensation:
- Tool cuts properly (not rubbing)
- Cycle time drops dramatically
- Tool life actually improves (paradox: faster = longer life)

**This is WHY adaptive toolpaths are faster than conventional** — they compensate automatically.`,
  }],
}];

const mod8: Lesson[] = [{
  id: `${CID}-mod-8-les-1`,
  moduleId: `${CID}-mod-8`,
  title: "Material-Specific Strategies by ISO Group",
  order: 1,
  content: [{
    type: "text",
    body: `# Cutting Strategies by ISO Material Group

## P — Steel

**Approach**: Moderate speed, generous chip load, flood coolant.
- Vc: 150-300 m/min (carbide)
- fz: 0.04-0.12 mm (scale with diameter)
- Coolant: Flood (5-8% concentration)
- Coating: TiAlN (purple) or AlCrN
- **Tip**: Steel is forgiving. If in doubt, start at 200 m/min and adjust.

## M — Stainless Steel

**Approach**: Moderate speed, NEVER dwell, sharp tools, positive rake.
- Vc: 100-200 m/min (carbide)
- fz: 0.03-0.08 mm
- Coolant: Flood (higher concentration 8-10%)
- Coating: TiAlN or AlTiN
- **Key rule**: Keep the tool cutting! Interruptions cause work hardening.
- **Avoid**: Rubbing, dwelling, center-cutting with no pilot hole

## K — Cast Iron

**Approach**: Higher speed, dry or MQL, expect dust not chips.
- Vc: 200-400 m/min (carbide), 400-800 (ceramic)
- fz: 0.05-0.15 mm
- Coolant: Dry or MQL preferred (flood causes thermal shock)
- Coating: TiAlN or uncoated carbide
- **Tip**: Chips are powdery/short. Good chip control but very abrasive.

## N — Aluminum

**Approach**: Maximum speed, sharp uncoated tools, prevent built-up edge.
- Vc: 300-1000+ m/min
- fz: 0.06-0.25 mm (can push hard)
- Coolant: Flood or MQL (ethanol-based)
- Coating: DLC or uncoated (polished flutes)
- **Key rule**: 2-3 flutes ONLY (more flutes = chip packing)
- **Avoid**: TiAlN coating (aluminum bonds to it)

## S — Titanium / Superalloys

**Approach**: Low speed, high feed, maximum coolant, sharp edges.
- Vc: 30-60 m/min (Ti), 15-30 m/min (Inconel)
- fz: 0.05-0.15 mm (push the feed, save on speed)
- Coolant: HIGH PRESSURE through-spindle (1000+ PSI)
- Coating: TiAlN or AlCrN
- **Key rule**: Heat kills. Low speed + high pressure coolant.
- **Tip**: Use climb milling to keep minimum chip thickness.

## H — Hardened Steel (>45 HRC)

**Approach**: High speed, light cuts, CBN or ceramic.
- Vc: 100-200 m/min (CBN), 300-800 m/min (ceramic)
- ap: 0.1-0.3 mm maximum
- fz: 0.03-0.08 mm
- Coolant: DRY (thermal shock cracks ceramics)
- **Key rule**: Depth of cut < nose radius of insert.`,
  }],
}];

const mod9: Lesson[] = [{
  id: `${CID}-mod-9-les-1`,
  moduleId: `${CID}-mod-9`,
  title: "Tool Deflection — Why Your Dimensions Are Off",
  order: 1,
  content: [
    {
      type: "text",
      body: `# Tool Deflection

## The Problem

Under cutting force, the tool bends like a cantilever beam. This makes your actual cut shallower/wider than programmed.

## The Formula

$$\\delta = \\frac{F_c \\times L^3}{3 \\times E \\times I}$$

Where:
- $\\delta$ = deflection at tool tip (mm)
- $F_c$ = cutting force (N)
- $L$ = stick-out length (mm) — **cubed!**
- $E$ = Young's modulus (210,000 N/mm² for carbide)
- $I$ = moment of inertia ($\\frac{\\pi D^4}{64}$)

## Why Stick-Out Matters So Much

$L$ is **cubed** in the formula. Doubling the stick-out increases deflection by **8×**.

| Stick-out | Deflection (relative) |
|-----------|----------------------|
| 30mm (2.5×D) | 1× (baseline) |
| 45mm (3.75×D) | 3.4× |
| 60mm (5×D) | 8× |
| 75mm (6.25×D) | 15.6× |
| 90mm (7.5×D) | 27× |

## Practical Rules

1. **Keep L/D ≤ 3** for finishing (tight tolerance)
2. **L/D ≤ 5** for roughing (acceptable)
3. **L/D > 5** → reduce DOC and feed significantly
4. **Use the largest diameter tool** that fits the geometry
5. **Shrink-fit or hydraulic holders** outperform collet chucks for stiffness

## Compensating for Deflection

If you can't shorten the tool:
1. **Spring pass** — take a light final pass at full depth (tool is already deflected, so it cuts the remainder)
2. **Reduce ap** to lower force and therefore deflection
3. **Offset the toolpath** by the calculated deflection amount
4. **Use a tapered shank** — thicker at the holder end`,
    },
    {
      type: "calculator",
      title: "Tool Deflection Calculator",
      calculatorConfig: {
        engine: "ToolDeflectionEngine",
        inputFields: ["tool_diameter", "cutting_speed"],
        outputFields: ["deflection"],
        defaults: { tool_diameter: 12, cutting_speed: 200 },
      },
    },
  ],
  keyFormulas: ["deflection", "kienzle"],
}];

const mod10: Lesson[] = [{
  id: `${CID}-mod-10-les-1`,
  moduleId: `${CID}-mod-10`,
  title: "Putting It All Together — Full S/F Walkthrough",
  order: 1,
  content: [
    {
      type: "text",
      body: `# Complete Speed/Feed Calculation Walkthrough

## The Scenario

**Job**: Pocket milling a 50×30×10mm pocket in 4140 steel
**Tool**: 12mm 4-flute TiAlN-coated carbide end mill
**Machine**: Haas VF-2 (8100 RPM max, 15kW spindle)

## Step 1: Look Up Material Data

4140 steel (ISO group P):
- kc1.1 = 1800 N/mm²
- mc = 0.25
- Taylor C = 300, n = 0.25
- Recommended Vc = 180-250 m/min (carbide, TiAlN)

## Step 2: Calculate RPM

Using Vc = 200 m/min (middle of range):

$$RPM = \\frac{200 \\times 1000}{\\pi \\times 12} = 5305 \\text{ RPM}$$

Machine max = 8100 RPM ✓ (within limits)

## Step 3: Calculate Feed Rate

Manufacturer chip load for 12mm in steel: fz = 0.06 mm/tooth

$$V_f = 0.06 \\times 4 \\times 5305 = 1273 \\text{ mm/min}$$

## Step 4: Verify Cutting Force

$$F_c = 1800 \\times 3 \\times 0.06^{(1-0.25)} = 1800 \\times 3 \\times 0.141 = 761 \\text{ N}$$

## Step 5: Verify Power

$$P_c = \\frac{761 \\times 200}{60000} = 2.54 \\text{ kW}$$

Machine has 15kW ✓ (well within power)

## Step 6: Check Tool Life

$$T = \\left(\\frac{300}{200}\\right)^{\\frac{1}{0.25}} = 1.5^4 = 5.06 \\text{ minutes}$$

That's only 5 minutes! For a production run, reduce Vc to 150 m/min:

$$T = \\left(\\frac{300}{150}\\right)^4 = 2^4 = 16 \\text{ minutes}$$

## Step 7: Final Parameters

| Parameter | Value |
|-----------|-------|
| RPM | 3979 (at Vc=150) |
| Feed | 955 mm/min |
| DOC (ap) | 3mm |
| WOC (ae) | 8mm (for pocketing) |
| Tool life | ~16 min |
| MRR | 22,920 mm³/min |
| Power | 1.9 kW |

## The Checklist

Before hitting Cycle Start:
- [ ] RPM within machine limits
- [ ] Power within spindle capability
- [ ] Tool deflection acceptable (L/D < 4)
- [ ] Force won't break tool (check vs tool mfr data)
- [ ] Coolant aimed at the cut
- [ ] First pass in single-block mode`,
    },
    {
      type: "calculator",
      title: "Full Speed/Feed Calculator",
      calculatorConfig: {
        engine: "SpeedFeedOrchestratorEngine",
        inputFields: [
          "cutting_speed", "tool_diameter",
          "depth_of_cut", "feed_per_tooth", "flute_count",
        ],
        outputFields: [
          "rpm", "feed_rate", "cutting_force",
          "power", "tool_life", "mrr",
        ],
        defaults: {
          cutting_speed: 200, tool_diameter: 12,
          depth_of_cut: 3, feed_per_tooth: 0.06,
          flute_count: 4,
        },
      },
    },
  ],
  keyFormulas: [
    "kienzle", "taylor", "rpm_from_vc",
    "feed_rate", "power", "mrr", "deflection",
  ],
}];

const mod11: Lesson[] = [{
  id: `${CID}-m11-l1`, moduleId: `${CID}-mod-11`,
  title: "Citation Discipline — Cutting Data Sources", order: 1,
  content: [{
    type: "text",
    body: `# Citation Discipline — Cutting-Data Sources

**Prerequisite:** Modules 1-10 of this course (Kienzle, Taylor, SFM, chip-thinning, stability lobes, etc.).
**Learning objective:** For every speed/feed claim, identify its source — a handbook table, a tool-vendor catalog, an ISO test standard, or a textbook formula. Speed/feed is the highest-citation-density domain in shop math.
**Assessment:** Justify the cutting parameters for one operation in your last setup. Cite every input value.

## Why Speed/Feed Needs Sources

Every speed/feed table is **conditional** on tool grade, coating, material grade, machine rigidity, coolant, depth of cut, and L/D ratio. A starting value pulled from one source may be wrong by 2× on the next job. The only defense against guessing is citation.

## Citation Pattern (Cutting-Data Variant)

\`<parameter value> [per <handbook/standard/vendor catalog>, <year>, <table/section>]\`

Examples revisiting earlier modules of THIS course:

- **"Kienzle equation Fc = kc1.1 × ap × fz^(1-mc)"** [per Kienzle, O., 1952. *Die Bestimmung von Kräften und Leistungen an spanenden Werkzeugen und Werkzeugmaschinen.* VDI-Zeitschrift 94 (11-12): 299-305. PRISM kc1.1 + mc constants per ISO group live in \`src/physics/constants.ts\`.]
- **"Taylor tool life equation V·T^n = C"** [per Taylor, F.W., 1907. *On the Art of Cutting Metals.* Transactions of the ASME 28: 31-350. Modern n/C values: ISO 3685:1993 *Tool-life testing with single-point turning tools.*]
- **"Tool-life test method for milling"** [per ISO 8688-1:1989 (face milling) + ISO 8688-2:1989 (end milling) — ISO; defines the standard conditions under which T values are measured.]
- **"Sandvik recommended cutting data for steel P-group"** [per Sandvik Coromant, *Coromant Capto / Modern Metal Cutting* catalog, current revision (CoroPlus app or printed catalog) — Section: Turning/Milling cutting data per ISO material group.]
- **"Iscar recommended chip-load fz for solid carbide end mills"** [per Iscar Metals, *Master Catalog*, current edition — Section: Solid Carbide End Mills, chip-load tables per Ø/material.]
- **"Stability lobe diagram derivation"** [per Altintas, Y., 2012. *Manufacturing Automation: Metal Cutting Mechanics, Machine Tool Vibrations, and CNC Design*, 2nd ed., Cambridge University Press, Chapter 4 (chatter stability).]
- **"Machining center performance test code"** [per ASME B5.54-2005 (R2017) — for accuracy verification under cutting conditions.]
- **"Material-group classification P/M/K/N/S/H"** [per ISO 513:2012 — anchors which kc1.1 + Taylor constants apply.]

## Doctrine vs Technique vs Reference (Cutting-Data Lens)

| Category | In speed/feed | Examples |
|----------|--------------|----------|
| **Doctrine** | Universal physical laws. Memorize. | Kienzle structure · Taylor structure · RPM = Vc·1000/(πD) · power = Fc·Vc/60000 |
| **Technique** | Derivation from the formula + inputs. | Plug + solve for parameters · adjust for chip thinning · apply L/D deflection limit |
| **Reference** | Tables that change by tool + material. | kc1.1 per ISO group · Sandvik/Iscar chip-load tables · Taylor n/C per material |

## The Cutting-Data Failure Mode

A programmer copies a chip-load value from Sandvik's table for a *P-group steel* but the part is *K-group cast iron*. The Kienzle force prediction is off by ~60% (kc1.1 P=1800 vs K=1100, plus different mc exponent). Tool chips on the first cut. **Defense:** every chip-load + Vc + Taylor-life claim must cite (a) the source table, and (b) the matched ISO material group.

## Practice

For your last cutting job, write the citation chain for:
1. **Vc** (cutting speed) — table source + tool grade + ISO material group + coolant assumption
2. **fz** (chip load per tooth) — table source + tool diameter + axial DOC assumption
3. **ap** (axial DOC) — limit from tool catalog + L/D deflection check
4. **Expected tool life T** — Taylor n/C source or vendor expected-life claim

If any chain has gaps → the operation is operating on guesses, not data.`,
  }],
}];

// ═══════════════════════════════════════════════════════════
// Quiz Questions
// ═══════════════════════════════════════════════════════════

export const COURSE_2_QUIZZES: Record<string, Question[]> = {
  [`${CID}-mod-2-quiz`]: [
    {
      id: "c2-m2-q1", type: "calculation", difficulty: 2,
      text: "Calculate the cutting force for:\n" +
        "kc1.1 = 1500 N/mm², mc = 0.25, ap = 4mm, fz = 0.1mm",
      correctAnswer: 1069,
      tolerance: 3,
      explanation: "Fc = 1500 × 4 × 0.1^(1-0.25) = " +
        "1500 × 4 × 0.1^0.75 = 1500 × 4 × 0.178 ≈ 1069 N",
      tags: ["kienzle", "cutting_force"],
    },
    {
      id: "c2-m2-q2", type: "multiple_choice", difficulty: 2,
      text: "In the Kienzle model, what happens to " +
        "cutting force when you double the depth of cut?",
      options: [
        { id: "a", text: "Force doubles", isCorrect: true,
          explanation: "ap is linear in the formula" },
        { id: "b", text: "Force quadruples", isCorrect: false },
        { id: "c", text: "Force increases by 68%", isCorrect: false,
          explanation: "That's what happens when you double fz" },
        { id: "d", text: "Force stays the same", isCorrect: false },
      ],
      explanation: "ap has a linear (exponent=1) relationship " +
        "with force. Double ap = double Fc.",
      tags: ["kienzle", "cutting_force"],
    },
  ],
  [`${CID}-mod-3-quiz`]: [
    {
      id: "c2-m3-q1", type: "calculation", difficulty: 3,
      text: "Using Taylor's equation with C=350, n=0.25, " +
        "calculate tool life at Vc = 250 m/min.",
      correctAnswer: 3.84,
      tolerance: 5,
      explanation: "T = (350/250)^(1/0.25) = 1.4^4 = 3.84 min",
      tags: ["taylor", "tool_life"],
    },
  ],
  [`${CID}-mod-4-quiz`]: [
    {
      id: "c2-m4-q1", type: "calculation", difficulty: 2,
      text: "What RPM for a 20mm end mill at 250 m/min?",
      correctAnswer: 3979,
      tolerance: 2,
      explanation: "RPM = (250×1000)/(π×20) = 250000/62.83 " +
        "≈ 3979",
      tags: ["rpm", "speed_feed"],
    },
  ],
  [`${CID}-mod-10-quiz`]: [
    {
      id: "c2-m10-q1", type: "calculation", difficulty: 3,
      text: "Calculate the feed rate (mm/min) for:\n" +
        "- 16mm 3-flute end mill\n- Vc = 180 m/min\n" +
        "- fz = 0.07 mm/tooth",
      correctAnswer: 752,
      tolerance: 3,
      explanation: "RPM = (180×1000)/(π×16) = 3581. " +
        "Vf = 0.07 × 3 × 3581 = 752 mm/min",
      tags: ["feed_rate", "rpm", "speed_feed"],
    },
  ],
  [`${CID}-mod-11-quiz`]: [
    {
      id: "c2-m11-q1", type: "multiple_choice", difficulty: 2,
      text: "You copy a chip-load value fz=0.10 mm/tooth from a Sandvik table for P-group steel, but the part is K-group cast iron. Predict the consequence on the first cut.",
      options: [
        { id: "a", text: "No effect — chip load is independent of material group", isCorrect: false,
          explanation: "Chip load IS material-group-dependent; the table is conditional on the group it was measured for." },
        { id: "b", text: "Cutting force ~60% off (kc1.1 mismatch: P=1800 vs K=1100), tool may chip or break", isCorrect: true },
        { id: "c", text: "Tool life doubles because cast iron is softer than steel", isCorrect: false,
          explanation: "Cast iron's lower kc1.1 doesn't translate to longer life — the wear mechanism is different (abrasive vs adhesive)." },
        { id: "d", text: "Surface finish improves due to lower force", isCorrect: false,
          explanation: "Force is only one input; chip morphology in K-group differs and may scallop or chip the cutting edge." },
      ],
      explanation: "Citation: ISO 513:2012 (material-group definition) + Sandvik Modern Metal Cutting (group-specific chip-load tables) + Kienzle 1952 (force formula coupling kc1.1 to material). Defense = always match ISO group to data source.",
      tags: ["citation_discipline", "kienzle", "iso_513", "chip_load"],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// Module Assembly
// ═══════════════════════════════════════════════════════════

const makeModule = (
  idx: number, title: string, lessons: Lesson[],
  minutes: number
): Module => ({
  id: `${CID}-mod-${idx}`,
  courseId: CID,
  title,
  description: `${title} — Speed/Feed Mastery`,
  order: idx,
  lessons,
  quiz: {
    id: `${CID}-mod-${idx}-quiz`,
    moduleId: `${CID}-mod-${idx}`,
    questions: COURSE_2_QUIZZES[`${CID}-mod-${idx}-quiz`] ?? [],
    passingScore: 75,
  },
  estimatedMinutes: minutes,
});

export const COURSE_2_MODULES: Module[] = [
  makeModule(1, "Chip Load Explained", mod1, 30),
  makeModule(2, "Kienzle Cutting Force", mod2, 45),
  makeModule(3, "Taylor Tool Life", mod3, 40),
  makeModule(4, "SFM to RPM Conversion", mod4, 30),
  makeModule(5, "Feed Rate Calculation", mod5, 35),
  makeModule(6, "Stability Lobes", mod6, 45),
  makeModule(7, "Chip Thinning Compensation", mod7, 35),
  makeModule(8, "Material-Specific Strategies", mod8, 40),
  makeModule(9, "Tool Deflection", mod9, 40),
  makeModule(10, "Full S/F Walkthrough", mod10, 50),
  makeModule(11, "Citation Discipline — Cutting Data Sources", mod11, 35),
];
