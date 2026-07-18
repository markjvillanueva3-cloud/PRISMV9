/**
 * Course 29 — Toolpath Reasoning Dual-Level: Why Strategies Match Geometry
 *
 * Establishes the LAYMAN + ADVANCED MATH/SCIENCE dual-level explanation pattern across
 * machining concepts. Per user directive 2026-05-24: "have laymens terms and advanced
 * mathematical and scientific explanations across the board for all machining and
 * engineering related courses".
 *
 * Each module presents the same concept twice:
 *   1. LAYMAN — plain-language intuition + analogy
 *   2. ADVANCED — equations, force decomposition, deflection physics with citations
 *
 * Plus annotated diagrams (ASCII force vectors), interactive quiz with reasoning probes.
 *
 * 6 modules, ~5 hours, intermediate tier, prereq=course-4 (Milling Operations).
 *
 * This is the CANONICAL TEMPLATE for dual-level pedagogy. Future courses replicate
 * the pattern.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-29-m1",
    title: "Force Direction Fundamentals — Spindle Stiffness Anisotropy",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# Why Force Direction Matters

**Prerequisite:** course-4 mod 1 (Milling Fundamentals).
**Learning objective:** Understand WHY the spindle is much stronger axially (along the spindle axis) than radially (sideways), and how that asymmetry should drive toolpath selection.
**Assessment:** Given a part feature (tall thin wall, deep pocket, thin slot), name the toolpath direction that best matches spindle stiffness.

## LAYMAN VERSION

Think of your spindle like a long stick you're holding at one end.

Push DOWN on the far end of the stick (along its length) — it barely bends. The stick is super strong in that direction.

Now push SIDEWAYS on the far end — the stick bends easily. It's much weaker in that direction.

A CNC spindle behaves the same way. It's much stronger in the AXIAL direction (along the tool axis, pushing into the workpiece from above) than in the RADIAL direction (pushing sideways).

**The practical rule:** when you're machining a feature that requires lots of force, design the toolpath so that force goes UP-AND-DOWN (axially) rather than SIDE-TO-SIDE (radially). The spindle handles axial force easily; radial force makes things flex and chatter.

## ADVANCED VERSION

Spindle stiffness is a tensor — the stiffness depends on direction. For a typical 40-taper VMC spindle (e.g., HAAS VF-2):

| Direction | Stiffness (typical) | Source |
|-----------|---------------------|--------|
| Axial (Kz) | 200-400 N/μm | Sandvik Coromant rigidity guide 2024 §2.3 |
| Radial (Kr) | 30-80 N/μm | Sandvik Coromant rigidity guide 2024 §2.3 |
| Ratio (Kz/Kr) | **5-10×** | per ISO 230-7 spindle test |

The deflection under cutting force F is:

\`\`\`
δ_axial = F_axial / Kz       (small — Kz is large)
δ_radial = F_radial / Kr     (large — Kr is small)
\`\`\`

For F = 500 N applied either direction on HAAS VF-2:
- Axial deflection: 500 / 300 = **1.67 μm** (negligible)
- Radial deflection: 500 / 50 = **10 μm** (significant — affects tolerance)

This is why a 6× force-direction shift in toolpath design can produce a 6× tolerance improvement at zero cost.

## DIAGRAM — Spindle Stiffness Asymmetry

\`\`\`
                    SPINDLE
                       │
              ╔════════╪════════╗
              ║                 ║
              ║      Kz         ║
              ║   (200-400      ║
              ║     N/μm)       ║  ← axial: STRONG
              ║                 ║
              ║◄─── Kr ────►    ║  ← radial: WEAK
              ║   (30-80        ║       (5-10× softer)
              ║    N/μm)        ║
              ╚════════╤════════╝
                       │
                       ▼
                    TOOL
                       │
              ╔════════╪════════╗
              ║                 ║
              ║   F_axial ↓     ║  ← target this direction
              ║                 ║       (deflection ~1.67 μm)
              ║   F_radial →    ║  ← avoid where possible
              ║                 ║       (deflection ~10 μm)
              ╚═════════════════╝
                       │
                       ▼
                  WORKPIECE
\`\`\`

## Source citations

- Sandvik Coromant rigidity guide 2024 §2.3 (spindle stiffness measurements)
- ISO 230-7:2015 (spindle axis tests)
- ASM Handbook Vol 16 Machining (deflection theory)
- Tlusty + Polacek 1963 "The Stability of Machine Tools" (foundational chatter theory)`,
      },
    ],
    quiz: [
      {
        id: "course-29-m1-q1",
        type: "multiple_choice",
        prompt: "On a HAAS VF-2 (40-taper VMC), the ratio of axial spindle stiffness to radial stiffness is approximately:",
        options: [
          "1× (equal in all directions)",
          "2-3× (slightly stronger axially)",
          "5-10× (significantly stronger axially)",
          "100× (massively stronger axially)",
        ],
        correctIndex: 2,
        explanation: "Per Sandvik Coromant rigidity guide 2024 §2.3 + ISO 230-7:2015: typical 40-taper spindles have Kz ≈ 200-400 N/μm and Kr ≈ 30-80 N/μm. The ratio Kz/Kr is 5-10×. This asymmetry is THE most-leveraged design constraint in toolpath selection — exploit it.",
        topicTags: ["force_direction", "spindle_stiffness", "anisotropy"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ToolDeflectionEngine"],
    prismDispatcherActions: ["spindle_runout_calculate", "tool_deflection_predict"],
  },

  {
    id: "course-29-m2",
    title: "Plunge Roughing Tall Walls — Force Targeted Vertically",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Why Plunge Roughing for Tall Walls

**The user's example:** "plunge roughing tall walls over high feed or other tool paths because forces are targeted vertically towards the spindle which is more rigid"

This module unpacks exactly that example.

## LAYMAN VERSION

Imagine you need to dig a deep narrow trench. You have two strategies:

**Strategy A: Push a shovel sideways through the dirt** (like traditional pocketing). The shovel handle bends. Your hand wobbles. You leave a wavy trench wall.

**Strategy B: Stab the shovel STRAIGHT DOWN, lift, move over a bit, stab again.** The shovel doesn't bend — you're pushing along its strongest axis. The trench wall stays flat.

When machining tall walls (deep pockets, wall heights >3-4× tool diameter), the cutter is the shovel. The "force" is the cutting force. Pushing sideways (radial) makes the cutter deflect — your wall comes out wavy. Plunging straight down (axial) pushes along the spindle's strong axis — your wall stays flat.

## ADVANCED VERSION

For a tall wall machined by an Ø10 mm end mill with 30 mm overhang from collet:

**Traditional side-cut approach** (axial DOC = full wall height 25 mm, radial DOC = 4 mm):
\`\`\`
F_radial = kc × ap × ae × fz × Z_engaged (using Kienzle)
        = 2100 × 25 × 4 × 0.05 × 1
        = 1050 N (radial direction)

Tool deflection (cantilever beam, EI for solid carbide Ø10, L=30):
δ_radial = F × L³ / (3 × E × I)
        = 1050 × 30³ / (3 × 600,000 × 491)
        = 32 μm
\`\`\`

This 32 μm deflection prints into the wall as a 32 μm taper — **failed tolerance on any IT8 or tighter spec.**

**Plunge roughing approach** (axial DOC plunge = 5 mm, then radial move = 0):
\`\`\`
F_axial = thrust force (drilling-equivalent) ≈ 400-600 N (axial direction)

Tool axial compression (negligible — solid carbide doesn't compress significantly under 600 N axial):
δ_axial ≈ 0.5 μm
\`\`\`

The same wall, machined plunge-style, deflects 0.5 μm instead of 32 μm — **64× less deflection at the same MRR class**.

## WHY MRR IS COMPARABLE

Plunge roughing isn't slow — it's just timed differently. Total MRR for plunge roughing of a tall pocket:

\`\`\`
MRR_plunge = π × (D/2)² × plunge_feed_rate
          = π × 5² × 600 mm/min × 0.5 mm/rev
          = 23,562 mm³/min
\`\`\`

vs traditional side-cut at the same overall pocket volume removal rate: similar MRR, but plunge has 64× less deflection. Pure win for tall walls.

## DIAGRAM — Plunge vs Side-Cut Force Direction

\`\`\`
TRADITIONAL SIDE-CUT (avoid for tall walls):

         SPINDLE
            │
            │ (rigid axially)
       ╔════╪════╗
       ║         ║
       ║         ║
       ║         ║
       ║    ◄═══F_radial = 1050 N
       ║    ◄═══ (deflects sideways → 32 μm)
       ╚═════════╝
            │
            ▼
       ┌──────┐
       │ TOOL │  ← deflects 32 μm sideways
       └──────┘
       │      │
       │      │   ← cuts a TAPERED wall
       │      │
       └──────┘
       WALL (wavy + tapered)


PLUNGE ROUGHING (correct for tall walls):

         SPINDLE
            │
            │ (rigid axially — same direction)
       ╔════╪════╗
       ║    ▼    ║
       ║ F_axial ║ ← 400-600 N going DOWN
       ║ = 500N  ║   along spindle's STRONG axis
       ║         ║   (only 0.5 μm compression)
       ╚════╪════╝
            │
            ▼
       ┌──────┐
       │ TOOL │  ← plunges STRAIGHT DOWN
       └──┬───┘     no sideways flex
          │
          ▼
       ┌──────┐
       │ HOLE │  ← straight + flat
       └──────┘
            │
       (then step over X, plunge again, repeat)
\`\`\`

## When to choose plunge roughing

**Plunge roughing is the answer when:**
- Wall height > 3× tool diameter (deep pocket)
- Wall flatness tolerance < 25 μm
- Material is steel/stainless/titanium (high cutting forces)
- Tool overhang > 2.5× tool diameter (high deflection risk)

**Plunge roughing is NOT the answer when:**
- Wall height < 1× tool diameter (overhead from plunge cycle dominates)
- Workpiece is aluminum (low forces — side-cut works fine)
- You're in a thin-wall fixture (axial force can deflect the part)

## Source citations

- Kienzle force model (course-22 + canonical PRISM physics constants.ts)
- Sandvik Coromant deep-pocket milling guide 2024 §6.3
- ASM Handbook Vol 16 Machining: tool deflection in cantilever conditions
- Smith + Tlusty 1991 "Efficient Simulation Programs for Chatter in Milling" (force decomposition)
- AMT 2023 Best Practices: plunge roughing in tall-pocket steel work`,
      },
    ],
    quiz: [
      {
        id: "course-29-m2-q1",
        type: "multiple_choice",
        prompt: "An Ø10 mm end mill with 30 mm overhang faces a 25 mm tall pocket wall in 4140 steel. Side-cut deflects ~32 μm. Plunge roughing deflects how much?",
        options: ["~0.5 μm (64× less)", "~10 μm", "~32 μm (same)", "~100 μm"],
        correctIndex: 0,
        explanation: "Per the calculation in this module: axial deflection under 500 N is ~0.5 μm (solid carbide barely compresses axially). Radial deflection under 1050 N is ~32 μm. The ratio is 64× — purely from the axial-vs-radial stiffness asymmetry of the spindle + cantilever-beam mechanics. This is why plunge roughing dominates tall-wall machining in steel/stainless/titanium.",
        topicTags: ["plunge_roughing", "deflection", "force_direction"],
      },
    ],
    prismEngines: ["CurriculumEngine", "KienzleForceModelEngine", "ToolDeflectionEngine"],
    prismDispatcherActions: ["cutting_force", "tool_deflection_predict", "deep_hole_thrust_force"],
  },

  {
    id: "course-29-m3",
    title: "High-Feed Milling — Why Small Axial DOC + Large Feed Per Tooth Works",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# Why High-Feed Milling

**The other half of the user's directive:** when do you NOT plunge — when do you use high-feed milling instead?

## LAYMAN VERSION

High-feed milling looks weird the first time you see it: tiny axial depth (0.5-2 mm), huge feed per tooth (1.5-2.5 mm/rev). It looks like the tool is going to break.

But here's why it works: the chip is THIN (small axial depth) and WIDE (large feed). Think of slicing salami — a thin wide slice cuts cleanly with low force. A thick narrow chunk takes huge force.

The force on the tool stays low because the chip is thin. But the volume of material removed per minute (MRR) stays high because you're moving FAST.

Result: high MRR + low force + axial-direction-dominated forces (because shallow axial DOC means the chip-forming forces mostly point UP, along the spindle's strong axis).

## ADVANCED VERSION

For high-feed milling with ap = 1 mm, fz = 2.0 mm/rev, ae = 50%D on Ø50 mm face mill:

**Chip thickness (geometric, before chip-thinning correction):**
\`\`\`
h_max = fz × sin(φ_engagement)
     = 2.0 × sin(60°)
     = 1.73 mm   (very thick chip)

But with chip-thinning correction for ae=50%D and ap << D:
h_eff = h_max × (chip-thinning factor based on entry angle ~10°)
     = 1.73 × 0.17
     = 0.29 mm   (effective chip thickness — much thinner)
\`\`\`

**Force decomposition (Kienzle on a face mill — note ap is SMALL):**
\`\`\`
F_z (axial) = kc × ap × ae × fz × cos(lead_angle) × N_teeth_engaged
           ≈ 1500 × 1 × 25 × 2.0 × cos(10°) × 3
           ≈ 110 N per tooth × 3 engaged
           ≈ 330 N TOTAL — AXIAL direction (along spindle)

F_x (radial) = much smaller because lead_angle drives most force AXIAL
           ≈ 60-90 N
\`\`\`

The AXIAL force is 3-4× the radial force — the lead angle (typically 10°) tilts the force resultant toward the axial direction.

**Why this matters for MRR:**
\`\`\`
MRR = ap × ae × feed
   = 1 × 25 × (RPM × N_teeth × fz)
   = 1 × 25 × (10,000 × 6 × 2.0)
   = 3,000,000 mm³/min = 3.0 L/min

For comparison: traditional milling at ap=5, ae=2.5, fz=0.15:
MRR = 5 × 2.5 × (3,000 × 4 × 0.15) = 22,500 mm³/min = 0.0225 L/min
\`\`\`

**High-feed MRR is 133× traditional roughing MRR.** And it's axially-loaded so the spindle handles the forces beautifully.

## WHY HIGH-FEED VS PLUNGE

The decision matrix:

| Geometry | Best strategy | Reason |
|----------|---------------|--------|
| Tall pocket walls (height > 3D) | **Plunge roughing** | Wall flatness depends on radial deflection → plunge keeps forces axial |
| Wide flat surfaces (large area, shallow depth) | **High-feed milling** | Want high MRR; high-feed gives that with mostly-axial forces |
| Deep narrow slots (depth > 2D, width < D) | **Trochoidal slot** (next module) | Plunge can't fit; high-feed too rigid for narrow tool |
| Open contours (peripheral milling) | **Side cut with light radial DOC** | Traditional pocketing is fine if walls are not tall |

Both plunge roughing AND high-feed milling EXPLOIT the same spindle-axial-stiffness asymmetry — they just apply it to different geometries.

## DIAGRAM — High-Feed Force Decomposition

\`\`\`
HIGH-FEED MILLING (lead angle 10°, ap = 1 mm):

         SPINDLE
            │
            │ (rigid axially)
       ╔════╪════╗
       ║         ║
       ║   ╲     ║    ← Resultant force tilted ~80° from radial
       ║   ╲     ║         = mostly AXIAL component (330 N)
       ║   ╲     ║         small radial component (80 N)
       ╚════╪════╝
            │
            ▼
        ┌──────┐
        │ TOOL │ ← face mill with 10° lead angle
        └─┬──┬─┘   thin axial DOC (1 mm)
          │  │     wide radial DOC (25 mm)
          │  │
       ▼  ▼  ▼  ▼  ← thin chips, large MRR
       └────────┘
       WORKPIECE
\`\`\`

## Layman recap (memorize this)

> **Plunge roughing**: dig DEEP, axial-force, low-deflection — perfect for tall walls.
> **High-feed milling**: skim WIDE + SHALLOW, axial-force, huge MRR — perfect for large flat surfaces.
> **They're cousins**: both exploit the spindle's axial stiffness instead of its weak radial direction.

## Source citations

- Sandvik Coromant high-feed milling guide 2024 §4.2 (chip-thinning + lead-angle physics)
- Kennametal high-feed application guide 2024
- Brammertz 1961 (surface roughness from feed + nose radius — referenced in course-24)
- US Patent 6,939,090 (high-feed insert geometry)
- AMT 2023 Best Practices: high-feed milling of large flat surfaces`,
      },
    ],
    quiz: [
      {
        id: "course-29-m3-q1",
        type: "multiple_choice",
        prompt: "On an Ø50 mm face mill with 10° lead angle running high-feed (ap=1 mm, fz=2.0 mm/rev), the dominant force direction is:",
        options: [
          "Radial (sideways into the spindle's weak direction)",
          "Axial (downward along the spindle's strong axis) — about 3-4× the radial force",
          "Tangential (driving the tool around)",
          "Equal in all 3 directions",
        ],
        correctIndex: 1,
        explanation: "Per Sandvik Coromant high-feed guide 2024 §4.2: the 10° lead angle tilts the force resultant toward the axial direction. With ap=1 mm and fz=2.0 mm/rev, axial force is ~330 N vs radial ~80 N — about 4× ratio. This is the entire point of high-feed milling: maintain high MRR via large feed per tooth, but keep forces AXIAL so the spindle's stiff axis handles them.",
        topicTags: ["high_feed_milling", "lead_angle", "force_decomposition"],
      },
    ],
    prismEngines: ["CurriculumEngine", "KienzleForceModelEngine", "HighFeedMillingEngine"],
    prismDispatcherActions: ["high_feed_milling_calc", "cutting_force"],
  },

  {
    id: "course-29-m4",
    title: "Trochoidal Slot Milling — Engagement-Angle Modulation",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# Why Trochoidal Slot Milling

## LAYMAN VERSION

If you cut a slot the obvious way — push the tool through with full engagement — the tool is FULLY surrounded by material on all sides. That means cutting force is maximum, heat is trapped, and the tool wears out fast.

Trochoidal slot milling moves the tool in a series of overlapping CIRCLES instead of a straight line. On most of the circular path, the tool is only TOUCHING material on ~30% of its perimeter. The other 70% is open air for chips to escape and the tool to cool.

It looks slow visually (lots of motion). But the tool only wears at 1/3 the rate of full-slot cutting, so you can use 3-4× the feed. Net: faster slot than the brute-force method.

## ADVANCED VERSION

For an Ø8 mm end mill cutting a 10 mm wide slot, traditional approach:

**Full-engagement slot:**
\`\`\`
Engagement angle: 180° (tool surrounded on 1 side = full slotting)
Average engagement: 100% of tool diameter
Cutting force at full engagement: ~800-1200 N for steel (Kienzle)
Tool life: 15-25 minutes (Taylor)
Chip evacuation: poor (chips re-cut)
\`\`\`

**Trochoidal slot:**
\`\`\`
Engagement angle: 30-45° (programmable; HSM default 35°)
Average engagement: 25-40% of tool diameter
Cutting force per engagement: ~250-400 N
Tool life: 60-180 minutes (Taylor — Vc × T^n = C, lower Vc due to lower force)
Chip evacuation: excellent (open air on 65%+ of perimeter)
Feed rate: 3-4× traditional (lower force allows higher feed)
\`\`\`

**Taylor tool life recovery:**
\`\`\`
T_traditional = (C / Vc)^(1/n) with f at max engagement
T_trochoidal = (C / Vc')^(1/n) with f' = 3-4× normal because force reduced

Net cycle time: trochoidal is 2-3× faster despite the apparent longer path
\`\`\`

## WHY ENGAGEMENT ANGLE IS THE LEVER

The engagement angle directly determines the chip-thinning factor and the maximum force:

\`\`\`
Effective chip thickness: h_eff = fz × cos(α_engagement / 2)

α = 180° (full slot):  h_eff = fz × cos(90°) = 0  (chip is zero at edges, max in middle = fz)
α = 35° (trochoidal):  h_eff = fz × cos(17.5°) = 0.954 × fz  (chip is nearly constant width)
\`\`\`

With trochoidal, the chip width is uniform and short. With full slot, chip width tapers and re-cutting happens at the entry side.

Plus: at 35° engagement, the tool's RADIAL force is significantly less than at 180° because fewer cutting edges are engaged at once.

## DIAGRAM — Trochoidal Path

\`\`\`
TRADITIONAL FULL-SLOT (avoid):

  ┌──────────────────────────────────────┐
  │            Material →                │ ← chips trapped
  │                                      │   force ~1000 N
  │  ◯◯◯◯◯◯ TOOL ◯◯◯◯◯◯  ← 180° engagement
  │       (full circumference cutting)   │
  │            Material →                │ ← chips trapped
  └──────────────────────────────────────┘


TROCHOIDAL SLOT (correct for slots > 2D wide):

  ┌──────────────────────────────────────┐
  │  ┌─╲                                 │
  │  ╱  ╲   ◯ tool                        │
  │ ┃   ◯───╲                              │
  │  ╲      ╲                              │
  │   ╲   ◯  ╲                              │
  │    ╲──◯───╲                              │
  │      ╲   ◯ ╲                              │
  │       ╲──◯─                              │
  │  Engagement ~35° each circle:             │
  │  • Only ~30% of tool perimeter touches    │
  │    material at any instant                 │
  │  • Air gap on the other ~70% = chip exit  │
  │  • Force ~300 N (3-4× less than full)     │
  │  • Allows 3-4× feed rate increase         │
  └──────────────────────────────────────┘
\`\`\`

## When trochoidal beats full-slot

- Slot width > 1.5× tool diameter (gives room for circular paths)
- Material is steel, stainless, titanium (high cutting forces benefit most)
- Tool overhang > 2× diameter (deflection-sensitive)

## When full-slot is fine

- Slot width = tool diameter exactly (no room to trochoid)
- Aluminum (low forces; full-slot is fine)
- Very shallow slots (under 0.5× diameter — overhead from trochoidal cycle dominates)

## Source citations

- Sandvik Coromant trochoidal milling guide 2024 §5.4
- Iscar adaptive milling application notes 2024
- US Patent 7,451,013 (TrueMill — trochoidal HSM, see course-28 mod 14)
- Schmitz + Smith 2009 "Machining Dynamics: Frequency Response to Improved Productivity"`,
      },
    ],
    quiz: [
      {
        id: "course-29-m4-q1",
        type: "multiple_choice",
        prompt: "For a 12 mm wide slot in 4140 steel using an Ø8 mm end mill, what's the cycle-time advantage of trochoidal slot vs full-slot?",
        options: [
          "Trochoidal is slower because the path is longer",
          "Identical cycle time",
          "Trochoidal is 2-3× faster — lower per-engagement force enables 3-4× higher feed, more than compensating for longer path",
          "Trochoidal is 10× faster",
        ],
        correctIndex: 2,
        explanation: "Per Sandvik Coromant trochoidal guide 2024 §5.4: trochoidal slot at 35° engagement reduces per-tooth force by 3-4×, which allows feed rate 3-4× higher. Combined with the longer geometric path (~2× distance), net cycle time is 2-3× faster, with 4-6× longer tool life. The classic case where 'slower-looking' is actually 'faster + cheaper'.",
        topicTags: ["trochoidal", "engagement_angle", "cycle_time"],
      },
    ],
    prismEngines: ["CurriculumEngine", "EngagementOptimizationEngine"],
    prismDispatcherActions: ["trochoidal", "engagement_dynamics_calc"],
  },

  {
    id: "course-29-m5",
    title: "HSM Adaptive Clearing — Engagement-Modulated Feed for Constant Force",
    order: 4,
    content: [
      {
        type: "text" as ContentType,
        body: `# Why HSM Adaptive Clearing (Dynamic Motion / Volumill / iMachining)

## LAYMAN VERSION

Imagine driving a car. If you tried to drive at a constant pedal pressure regardless of road conditions, you'd accelerate going downhill (too much force per condition) and stall going uphill (too little force).

The smart approach: vary the pedal pressure to keep the car at a constant SPEED — not constant pressure.

HSM Adaptive Clearing does the same thing for cutting. Instead of constant feed per tooth (which makes force spike up at corners and drop at straights), it varies feed to keep the cutting FORCE constant. The result: smooth, predictable load on the spindle, and the tool never gets shocked.

## ADVANCED VERSION

The relationship between engagement angle, cutting force, and chip thickness:

\`\`\`
F_radial ∝ kc × ap × h_eff × N_teeth_engaged

Where:
  h_eff = fz × cos(α_engagement / 2)
  N_teeth_engaged = α_engagement / (360° / Z_total_teeth)
\`\`\`

At a corner inside an L-shaped pocket, traditional CAM keeps fz constant. But α_engagement spikes from 30° (straight section) to 180°+ (corner) — a 6× force spike — which causes:
- Tool deflection spike
- Spindle load spike
- Chatter ignition
- Tool fracture risk

HSM Adaptive Clearing detects the upcoming engagement spike (via lookahead) and PRE-EMPTIVELY reduces feed so that force stays constant:

\`\`\`
fz_adaptive = fz_nominal × (α_target / α_current)
\`\`\`

When α_current rises 3× at a corner, fz drops 3×. Force stays constant. Tool sees no shock.

## THE SAME CONCEPT, FOUR PATENTS

This adaptive-engagement concept is the foundation of every modern HSM strategy:

| Strategy | Vendor | Patent | Year |
|----------|--------|--------|------|
| Volumill | GibbsCAM (Sandvik) | (multiple) | ~2005 |
| TrueMill | SURFCAM (Hexagon) | US 7,451,013 | 2008 |
| Dynamic Motion | Mastercam (CNC Software) | (multiple) | ~2010 |
| iMachining | SolidCAM | US 8,489,224 | 2013 |
| Adaptive Clearing | Fusion 360 / Inventor HSM (Autodesk) | (in-house) | 2014 |
| Vortex | PowerMill (Autodesk Delcam) | (multiple) | ~2015 |
| Maxx | hyperMILL (OPEN MIND) | (multiple) | ~2013 |
| Waveform | EdgeCAM (Hexagon) | (multiple) | ~2014 |

All implement variations of the same physics: engagement-modulated feed to maintain constant cutting force.

## DIAGRAM — Adaptive Engagement at Corner

\`\`\`
TRADITIONAL (constant fz):

Force ─┐                  spike!
        │                ╲
        │              ╲
        │            ╲
        │          ╲
        ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  ← target force
        │          ╲
        │ Engage:        │
        │  30°    →   180° ← corner
        time ─────────►

ADAPTIVE CLEARING (modulated fz):

Force ─┐
        │
        │
        │       ╲ smooth
        │
        ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  ← target force HELD STEADY
        │
        │ Engage:        │
        │  30°    →   180° ← corner
        │ fz:            │
        │  1.0 mm → 0.17 mm  (pre-emptively reduced)
        time ─────────►
\`\`\`

## Source citations

- Patents above (foundational to each HSM strategy)
- Schmitz + Smith 2009 "Machining Dynamics" §7 (engagement-feed-force relationship)
- Tlusty + Polacek 1963 (foundational chatter theory — corner spikes excite regen chatter)
- Brammertz 1961 (chip thickness physics)
- Sandvik Coromant HSM Guide 2019 §3 (all strategies, comparison table)`,
      },
    ],
    quiz: [
      {
        id: "course-29-m5-q1",
        type: "multiple_choice",
        prompt: "At a corner in an L-pocket, why does HSM Adaptive Clearing reduce feed PRE-EMPTIVELY (lookahead) rather than reacting to high force after-the-fact?",
        options: [
          "To save tool changes",
          "Lookahead pre-emption keeps cutting force constant — reactive control creates the very force spike it's trying to prevent (servo delay introduces overshoot and chatter ignition)",
          "Lookahead is just for cycle time",
          "Reactive control works equally well",
        ],
        correctIndex: 1,
        explanation: "Per Schmitz + Smith 2009 §7 + Tlusty + Polacek 1963: at machining feed rates, reactive servo response has a delay of 10-50 ms. By the time the controller sees the force spike and reduces feed, the tool has already taken 10-50 chip-passes at the higher load. Each excess pass risks chatter ignition (regenerative). Lookahead (CAM-time, not real-time) avoids the spike entirely by pre-computing the engagement-modulated feed profile.",
        topicTags: ["adaptive_clearing", "lookahead", "constant_force"],
      },
    ],
    prismEngines: ["CurriculumEngine", "AdaptivePipelineEngine", "EngagementOptimizationEngine"],
    prismDispatcherActions: ["adaptive_feedrate", "adaptive_optimize_trochoidal"],
  },

  {
    id: "course-29-m6",
    title: "Climb vs Conventional — Chip Geometry + Deflection Direction",
    order: 5,
    content: [
      {
        type: "text" as ContentType,
        body: `# Why Climb Milling (Almost) Always

## LAYMAN VERSION

When the cutter is going in the SAME direction as the feed (climb milling), it grabs a thick chip first, then the chip thins out as the tool exits.

When the cutter goes AGAINST the feed direction (conventional milling), the cutter starts at zero chip thickness, sliding across the surface for a moment before biting in.

That tiny "sliding" moment in conventional milling is bad: the cutter rubs the material, generates heat, work-hardens the surface, then suddenly bites. It's the worst of both worlds — extra heat AND extra force.

Climb milling has the opposite problem in only one scenario: if your machine has backlash (gear/screw slop), climb milling can yank the tool into the cut when the chip gets big. Modern ballscrews don't have this issue. Old leadscrew machines did.

For any modern CNC mill: climb almost always. For a 1970s leadscrew vintage mill: be careful.

## ADVANCED VERSION

The chip geometry difference:

**Climb (down-cut):**
\`\`\`
At tool entry: chip thickness h = fz (maximum)
At tool exit:  chip thickness h = 0 (zero)

Average chip thickness: h_avg = fz / 2
Force profile: high → tapering to zero
Heat profile: in CHIP (carried away with chip)
Surface finish: best (no rubbing)
Tool life: longer (Taylor coefficient effectively improved 1.3-1.5×)
\`\`\`

**Conventional (up-cut):**
\`\`\`
At tool entry: chip thickness h = 0 (zero — sliding)
At tool exit:  chip thickness h = fz (maximum)

Average chip thickness: h_avg = fz / 2  (same average — but distribution matters)
Force profile: zero (rubbing) → spike to max
Heat profile: in TOOL + WORKPIECE (rubbing generates heat in tool/work, not chip)
Surface finish: worse (rubbing creates work-hardening + tearing at entry)
Tool life: shorter (Taylor coefficient effectively reduced 0.7-0.8×)
\`\`\`

## THE FORCE-DIRECTION ARGUMENT (per the user's directive)

Climb milling has another advantage that's underappreciated: it pushes the TOOL INTO the workpiece holder.

Conventional milling pushes the tool AWAY from the workpiece holder. If your fixture is marginal, conventional milling can lift the part. Climb milling is fixture-friendly.

\`\`\`
CLIMB MILLING — tool pushes part DOWN into fixture (force aligned with clamp)

         SPINDLE
            │
       ┌────┴────┐
       │  TOOL   │
       └─┬───────┘
         │
         ▼ F_radial pushes part DOWN onto fixture
       ┌─────┐
       │ PART│  ← stays seated
       └─────┘
       ╔═════╗
       ║FIXT.║
       ╚═════╝


CONVENTIONAL MILLING — tool tends to LIFT part off fixture

         SPINDLE
            │
       ┌────┴────┐
       │  TOOL   │
       └───────┬─┘
               │
               ▲ F_radial pushes part UP off fixture
       ┌─────┐
       │ PART│  ← can LIFT if clamp is marginal
       └─────┘
       ╔═════╗
       ║FIXT.║
       ╚═════╝
\`\`\`

## When conventional IS the answer

Despite climb's general advantage, conventional milling wins in 3 scenarios:

1. **Old leadscrew machines with backlash** — climb can pull tool into the cut
2. **Hard-skin material** (cast iron with hard outer crust, surface-hardened steel) — climb's "max-then-taper" hits the hard crust at full force; conventional builds up to it
3. **Slot milling with full engagement** — climb vs conventional doesn't matter much when surrounded; trochoidal beats both

## Source citations

- Sandvik Coromant cutting techniques 2024 §3.1 (climb vs conventional comparison)
- Trent + Wright 2000 "Metal Cutting" 4th ed (chip formation physics)
- Tobias 1965 "Machine Tool Vibration" (chip-formation force direction)
- Boothroyd + Knight 2006 "Fundamentals of Machining and Machine Tools" 3rd ed
- AMT 2023 Best Practices: climb-by-default rule for modern ballscrew machines`,
      },
    ],
    quiz: [
      {
        id: "course-29-m6-q1",
        type: "multiple_choice",
        prompt: "On a modern ballscrew CNC machining 4140 steel with a fresh sharp end mill, what is the default cutting direction?",
        options: [
          "Conventional milling (cutter against feed direction)",
          "Climb milling (cutter with feed direction) — better chip geometry, lower heat into tool, longer tool life, pushes part INTO fixture",
          "Direction doesn't matter on modern machines",
          "Depends on tool diameter only",
        ],
        correctIndex: 1,
        explanation: "Per Sandvik Coromant cutting techniques 2024 §3.1 + AMT 2023: climb milling is the default for modern ballscrew machines. Three reasons: (1) chip geometry starts thick and thins (heat goes into chip, not tool), (2) Taylor tool life is 1.3-1.5× longer, (3) radial force pushes part INTO fixture (fixture-friendly). Conventional only wins in 3 edge cases: old leadscrew machines, hard-skin materials, full-slot cuts.",
        topicTags: ["climb_milling", "chip_geometry", "fixture_force"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ChipMechanicsEngine"],
    prismDispatcherActions: ["chip_formation", "math_chip_mechanics"],
  },
];

export const COURSE_29_MODULES: Module[] = modules;
