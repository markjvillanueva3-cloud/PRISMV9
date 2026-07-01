/**
 * Course 34 — Per-Machine-Type Operations Guide
 *
 * Per user directive 2026-05-25: "expand all domains of machining, each machine type".
 *
 * 7 modules covering each major machine type's distinctive operations + decision criteria
 * for routing a job to the right machine.
 *
 * Compact dual-level format. Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-34-m1",
    title: "3-Axis VMC (Vertical Machining Center)",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# 3-Axis VMC — The Workhorse

**Prerequisite:** course-33.
**Learning objective:** Recognize what a 3-axis VMC is best at + what it CANNOT do.

## LAYMAN VERSION

A 3-axis VMC (X-Y-Z linear motion + spinning vertical spindle) is the most common machine in U.S. job shops (8 of JM Die's 21 machines). Best for:
- Flat features (face mills, pockets, slots, holes)
- Multi-side parts that get re-fixtured between operations
- Prismatic parts (rectangular blocks, plates)

Cannot do (without extra setup):
- Undercuts (cutter can't reach under a feature)
- Curved compound surfaces (need 4th or 5th axis)
- Side-of-part features in one setup

## ADVANCED VERSION

### Distinguishing characteristics

| Spec | Typical 3-axis VMC (HAAS VF-2 class) |
|------|--------------------------------------|
| Work envelope | 30-50 × 16-25 × 20-25 inches |
| Spindle taper | CAT-40 or BT-40 |
| Spindle RPM | 8,000-12,000 (entry); 15,000-30,000 (HSM) |
| Spindle power | 10-30 kW |
| Rapid traverse | 35-60 m/min |
| ATC pockets | 18-30 (carousel) |
| Probing | Optional (Renishaw NC-4 or similar) |
| Cost (new) | $80K-200K |

### Best operations

| Operation | Why VMC is good |
|-----------|-----------------|
| Face milling (flat top surface) | Vertical spindle, gravity helps fixturing |
| 2D pocketing | Visual access from above |
| Drilling (axial through workpiece) | Plain X-Y positioning |
| Tapping | Rigid tapping standard |
| 3D contouring (limited slopes) | Ball-mill on shallow surfaces |
| Probing for setup + in-process | Renishaw integration mature |

### Worst operations (need different machine)

| Operation | Right machine |
|-----------|---------------|
| Round shafts | Lathe |
| Complex 5-axis surfaces | 5-axis machine |
| Side features in one setup | HMC (next module) |
| Production volumes (>500 parts) | Special-purpose dedicated cell |
| Very large parts (>3 ft) | Bridge mill or HBM (next modules) |

### Common 3-axis VMC operation sequence (JM Die canonical)

\`\`\`
1. Face top
2. Drill all holes + tap
3. Rough pocket + bosses
4. Finish pocket + bosses
5. Probe critical features
6. Flip + repeat second side
\`\`\`

[per JM Die ShopConfigurationEngine + HAAS VF-2 spec 2024]`,
      },
    ],
    quiz: [{
      id: "course-34-m1-q1",
      type: "multiple_choice",
      prompt: "A 3-axis VMC is FUNDAMENTALLY unable to do what without re-fixturing?",
      options: ["Face milling", "Drilling", "Side-of-part features (need to flip part or use HMC)", "Pocketing"],
      correctIndex: 2,
      explanation: "A 3-axis VMC has linear X-Y-Z axes only. Side-of-part features require accessing perpendicular faces. Solutions: re-fixture (slow) OR use an HMC (horizontal — naturally has B-axis indexing) OR add a 4th axis to the VMC.",
      topicTags: ["3_axis_vmc", "machine_types"],
    }],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["machine_get", "shop_config_get"],
  },

  {
    id: "course-34-m2",
    title: "HMC (Horizontal Machining Center) + 4-Axis VMC",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# HMC — Multi-Side Production Champion

## LAYMAN VERSION

An HMC has a HORIZONTAL spindle + a rotating B-axis pallet (workholding can rotate to present different sides to the cutter). This means you can machine 4 sides of a part in ONE setup. Best for:
- Production parts with features on multiple sides
- Engine blocks, pump housings (lots of mounting flanges + ports)
- Higher production volumes (pallet pool feeds the spindle continuously)

A 4-axis VMC is a compromise: vertical spindle (like a VMC) + rotating A-axis (rotates around X) on the table. Cheaper than HMC but only 2-3 sides accessible (not 4).

## ADVANCED VERSION

### HMC characteristics

| Spec | Typical HMC (Mazak HCN-5000 class) |
|------|------------------------------------|
| Work envelope | 30-50 × 20-30 × 25-30 inches |
| Spindle taper | CAT-50 (heavier than VMC's CAT-40) |
| Pallet | 2-4 pallet pool (changeover ~10 seconds) |
| B-axis | 1° increments (some 0.001°) |
| Rapid | 50-80 m/min |
| Cost | $250K-600K (3-4× a VMC) |

### When HMC beats VMC

| Scenario | Justification |
|----------|---------------|
| Part has features on 3+ sides | Saves N-1 setups; recoups HMC cost in 1-2 jobs |
| Production volume > 100 parts | Pallet changeover hides setup time |
| Lights-out operation | Pallet pool runs while operator is gone |

### When 4-axis VMC is the right compromise

- Budget: $130K vs $400K HMC
- Production volume too low for HMC justification
- Only 2-3 sides need access (not full 4)
- Examples: bolt-circle drilling on the side of a shaft, keyway milling on a shaft

[per Mazak HCN-5000 spec + JM Die fleet analysis]`,
      },
    ],
    quiz: [{
      id: "course-34-m2-q1",
      type: "multiple_choice",
      prompt: "When does an HMC's higher cost (3-4× a VMC) pay back?",
      options: [
        "Single-piece prototypes",
        "Parts with features on 3+ sides at production volume — saves N-1 re-fixturing setups + pallet pool enables lights-out operation",
        "Pure 2D work",
        "Always cheaper to use VMC",
      ],
      correctIndex: 1,
      explanation: "HMC's B-axis pallet rotates to expose 4 sides in 1 setup. For 3-sided parts at production volume (>100 parts), saved setup time + pallet pool's lights-out capability recoups the 3-4× cost in 1-2 jobs. For single prototypes or 2D-only work, VMC's lower cost wins.",
      topicTags: ["hmc", "4_axis", "machine_types"],
    }],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["machine_get"],
  },

  {
    id: "course-34-m3",
    title: "5-Axis Machining Centers (Trunnion + Gantry + Head/Head)",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# 5-Axis — Complex Surface Specialist

## LAYMAN VERSION

A 5-axis machine has X-Y-Z + 2 rotary axes (A/B/C in various combinations). The 2 extra axes let you tilt the tool OR rotate the part so the spindle can reach undercuts + compound curved surfaces.

3 main configurations:
- **Trunnion** (table tilts): part rotates on a cradle. Smaller envelope; cheaper. JM Die has 2.
- **Gantry** (head moves): spindle moves on a gantry over a stationary table. Large parts.
- **Head/Head** (head pivots): spindle pivots + tilts. Aerospace + mold/die standard.

Use 5-axis when:
- Compound curved surfaces (impellers, turbine blades)
- Undercuts unreachable in 3-axis
- Reducing setups (1 setup vs 5-6 in 3-axis)

## ADVANCED VERSION

### Configuration trade-offs

| Config | Pros | Cons | Typical use |
|--------|------|------|-------------|
| Trunnion (table tilts) | Cheaper; smaller footprint; stable workholding | Limited tilt range (typically ±110°); smaller envelope | General 5-axis production |
| Gantry (head moves) | Large envelope (10+ ft); rigid for big parts | Expensive; floor space | Aerospace structural; large molds |
| Head/Head | Full kinematic envelope; complex surfaces | Most expensive; least rigid; alignment-critical | Mold/die; aerospace blades |

### RTCP (Rotational Tool Center Point) — mandatory for 5-axis

Per course-24 mod 2: without RTCP compensation, tool tip position drifts as rotary axes move. Mandatory features:
- Fanuc 31i/32i: G43.4 (option K6)
- Siemens 840D: TRAORI
- Heidenhain: M128
- Haas (limited 5-axis): G234

### When to choose 5-axis over 3+2 indexed

| Geometry | Choose |
|----------|--------|
| Impeller blade with continuous curvature | 5-axis simultaneous |
| Pocket on tilted face | 3+2 indexed (cheaper, simpler) |
| Ruled-surface wall | 5-axis swarf |
| Multi-side prismatic | HMC or 3+2 indexed |

[per Sandvik Coromant 5-axis machining handbook 2024]`,
      },
    ],
    quiz: [{
      id: "course-34-m3-q1",
      type: "multiple_choice",
      prompt: "When would 3+2 indexed machining beat 5-axis simultaneous, even on a 5-axis-capable machine?",
      options: [
        "Never — always use 5-axis simultaneous",
        "When the feature is a pocket on a tilted face — 3+2 indexed is simpler, faster to program, and uses standard 3-axis CAM strategies on the tilted plane",
        "Only on prototypes",
        "When the part is aluminum",
      ],
      correctIndex: 1,
      explanation: "Per Sandvik Coromant 5-axis handbook 2024: 3+2 indexed positions the rotary axes once, then performs standard 3-axis machining on the tilted plane. Simpler programming, lower collision risk, no singularity concerns. 5-axis simultaneous is only needed when the tool axis must change CONTINUOUSLY along the path (impeller blades, turbine surfaces, complex undercuts). For tilted-face pockets, 3+2 is the right call.",
      topicTags: ["5_axis", "3_plus_2", "indexed_machining"],
    }],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["five_axis_singularity", "rtcp_compensation_calculate"],
  },

  {
    id: "course-34-m4",
    title: "Lathes (2-Axis + Sub-Spindle + Live Tooling)",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# Lathes — Round-Part Production

## LAYMAN VERSION

A lathe spins the workpiece while a stationary tool cuts. Best for round/cylindrical parts (shafts, bushings, gears, rolls). 3 main types:
- **2-axis lathe** (X-Z): basic turning
- **Sub-spindle lathe**: second spindle catches the part for back-side machining in same setup
- **Mill-turn (live tooling)**: rotating tools on the turret can drill cross-holes + mill flats

Lathes excel at: any rotationally symmetric feature. Lathes struggle with: non-symmetric features (which is what live tooling + sub-spindle solve).

## ADVANCED VERSION

### Lathe categories

| Type | What | Use |
|------|------|-----|
| 2-axis CNC | X (cross) + Z (axial) | Basic shafts, simple turning |
| Mill-turn (C-axis indexed) | Adds C-axis indexing for live tools | Cross-holes, flats on shafts |
| Mill-turn (C-axis interpolated) | Continuous C-axis motion + live tools | Complex side-of-shaft features |
| Sub-spindle | Second spindle for pickoff back-side machining | Complete-part-in-one-setup |
| Swiss-type (sliding headstock) | Headstock slides under guide bushing | Small precision parts (medical, aerospace bolts) |
| Multi-spindle | 4-12 spindles cycle simultaneously | Very high volume (1M+ parts/year) |

### When to use which lathe type

| Part | Lathe choice |
|------|--------------|
| Simple shaft, single setup | 2-axis lathe |
| Shaft with cross holes | Mill-turn C-axis indexed |
| Shaft with milled flats + key | Mill-turn C-axis interpolated |
| Symmetric part needing both ends | Sub-spindle lathe (pickoff) |
| Small precision (Ø<25 mm) high volume | Swiss-style |
| Very high volume (1M+) | Multi-spindle |

### Critical lathe-specific topics (recap from prior courses)

- CSS vs RPM mode (course-30 mod 1, course-31 mod 5)
- Tool nose radius compensation (course-31 mod 5)
- Threading G76 (course-30 mod 1)
- Springback compensation (course-24 mod 3)
- Multi-channel sync codes (course-19 mod 6, course-20 mod 1)

[per Sandvik turning handbook 2024 + Mazak Integrex spec]`,
      },
    ],
    quiz: [{
      id: "course-34-m4-q1",
      type: "multiple_choice",
      prompt: "For a small precision medical bone screw (Ø6 mm × 30 mm long, 50,000 parts/year), which lathe type?",
      options: [
        "2-axis CNC lathe",
        "Swiss-style sliding-headstock — small precision, high volume, sliding bushing supports tiny diameters during turning (no deflection)",
        "Mill-turn C-axis",
        "Manual lathe",
      ],
      correctIndex: 1,
      explanation: "Per CIMdata + Citizen/Star Swiss-style handbooks: Swiss-style sliding-headstock is THE standard for small-diameter precision parts at production volume. The guide bushing supports the workpiece right at the cutting zone, eliminating deflection — critical for Ø<25 mm work. Medical bone screws, surgical fasteners, dental implants all run on Swiss-style.",
      topicTags: ["lathe", "swiss_style", "medical"],
    }],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["machine_get", "lathe_select_lathe"],
  },

  {
    id: "course-34-m5",
    title: "Wire EDM + Sinker EDM (Non-Traditional)",
    order: 4,
    content: [
      {
        type: "text" as ContentType,
        body: `# EDM — Cuts Without Cutting

## LAYMAN VERSION

EDM (Electrical Discharge Machining) removes material by ELECTRICAL SPARKS, not mechanical cutting. The workpiece is submerged in dielectric fluid; a wire (wire EDM) or shaped electrode (sinker EDM) discharges sparks that vaporize tiny amounts of material.

Why EDM?
- **Cuts hardened materials** (HRC 65+) that conventional tools can't touch
- **Sharp internal corners** (smaller than any end mill can produce)
- **Thin walls / fragile parts** (no cutting force)
- **Complex 2D shapes** through hardened stock

Wire EDM: cuts 2D profiles by passing a brass wire through the workpiece (like a band saw).
Sinker EDM: burns a pocket shape using a graphite or copper electrode.

## ADVANCED VERSION

### Wire EDM

| Spec | Typical (Sodick AG class) |
|------|---------------------------|
| Wire diameter | 0.10 mm to 0.30 mm (brass or coated) |
| Cut speed | 5-200 mm²/min (material + thickness dependent) |
| Surface finish | Ra 0.2-3.2 (multi-pass dependent) |
| Accuracy | ±2-5 μm (after skim passes) |
| Material | Anything CONDUCTIVE (steel, carbide, copper, brass; NOT plastics or aluminum oxide ceramics) |

**Best operations:**
- Punch + die manufacturing
- Hardened tool steel through-cuts
- Tight-corner internal features
- Thin (0.5 mm wall) work

**Programming via course-22 + course-28 references.**

### Sinker EDM

| Spec | Typical (Mitsubishi EA class) |
|------|------------------------------|
| Electrode | Graphite or copper, custom shape |
| Removal rate | 5-200 mm³/min |
| Surface finish | VDI 21-42 (Ra ~0.2-12.5) |
| Accuracy | ±5-15 μm |

**Best operations:**
- Mold cavity machining (after rough milling)
- Sharp corners + small radii (smaller than smallest ball-mill)
- Through-holes in hardened material
- Decorative texturing of molds

**Operation order — typical mold cavity workflow:**
1. CNC rough mill cavity (3D HSM) — 80-90% of material
2. CNC semi-finish (leave 0.3-0.5 mm stock)
3. Heat-treat to working hardness (HRC 50-55)
4. Sinker EDM finish + tight corners
5. Polish (manual) to mirror finish if required

[per Sodick AG/AQ wire EDM + Mitsubishi EA sinker EDM programming references 2024]`,
      },
    ],
    quiz: [{
      id: "course-34-m5-q1",
      type: "multiple_choice",
      prompt: "What material property is REQUIRED for EDM?",
      options: [
        "Magnetic",
        "Electrically conductive (sparks need to flow between electrode and workpiece)",
        "Soft (HB < 200)",
        "Non-ferrous",
      ],
      correctIndex: 1,
      explanation: "Per Sodick + Mitsubishi EDM references: EDM removes material via electrical discharge (sparking) between electrode and workpiece. Both must conduct electricity. Steels, carbides, copper, brass, hardened tool steels — all OK. Plastics, ceramics (most), glass — NOT machinable by EDM. The material's MECHANICAL properties (hardness) don't matter — only electrical conductivity. This is why EDM is the go-to for HRC 65 hardened steel that conventional tools can't touch.",
      topicTags: ["edm", "non_traditional", "conductivity"],
    }],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["wedm_generate_toolpath", "edm_sinker_program"],
  },

  {
    id: "course-34-m6",
    title: "Grinders (Surface, Cylindrical, Centerless, Creep-Feed, Form)",
    order: 5,
    content: [
      {
        type: "text" as ContentType,
        body: `# Grinders — Tight Tolerance + Mirror Finish

## LAYMAN VERSION

Grinders use a spinning ABRASIVE WHEEL to remove tiny amounts of material — micrometers per pass. They achieve sub-micron tolerances + mirror finishes that no milling/turning can match.

5 main types:
- **Surface grinder**: flat parts; reciprocating table + wheel
- **Cylindrical grinder**: round parts; like a lathe but with a wheel
- **Centerless grinder**: round parts without holding ends; high volume
- **Creep-feed grinder**: very slow + very deep cuts; superalloys
- **Form grinder**: shaped wheel grinds specific profile

## ADVANCED VERSION

| Grinder type | Best for | Tolerance | Surface |
|--------------|----------|-----------|---------|
| Surface | Flat precision parts (gage blocks, slides) | ±2 μm | Ra 0.05-0.4 |
| Cylindrical (Studer) | Round + ID + OD precision | ±1 μm | Ra 0.05-0.8 |
| Centerless | High volume round (bearings, pins) | ±5 μm | Ra 0.2-1.6 |
| Creep-feed (Mägerle) | Superalloy turbine blades, deep slots | ±5 μm | Ra 0.4-3.2 |
| Form (CNC shaped wheel) | Specific profile shapes | ±3 μm | Ra 0.2-1.6 |
| Gear (Reishauer) | Precision gear flanks | DIN 5 | Ra 0.4-0.8 |

### Key grinding physics (recap from course-24 mod 4)

- **Spark-out** time at end of pass: lets elastic deflection dissipate to zero
- **Wheel dressing**: re-sharpens dull abrasive grains; mandatory periodic
- **Thermal damage**: wheel speed too high → workpiece overheats → "grinding burn" tempering
- **Coolant flood**: critical for heat extraction + chip flushing

### When to grind vs hard-turn (recap from course-33 mod 5)

| Spec | Decision |
|------|----------|
| Ra > 0.4 μm | Either grinding or hard turning |
| Ra < 0.4 μm | Grinding (mirror finish) |
| Tolerance > ±10 μm | Hard turning faster |
| Tolerance < ±10 μm | Grinding |
| Production volume > 100 | Grinding usually cheaper at high volume |

[per Studer + Reishauer grinding handbooks + ASM Handbook Vol 16 §11]`,
      },
    ],
    quiz: [{
      id: "course-34-m6-q1",
      type: "multiple_choice",
      prompt: "For high-volume cylindrical bearing rings (10,000+ per month, Ra 0.4, ±5 μm OD), which grinder?",
      options: [
        "Surface grinder",
        "Centerless grinder — no end-holding required, very high volume, ±5 μm at production rate",
        "Form grinder",
        "Creep-feed grinder",
      ],
      correctIndex: 1,
      explanation: "Per Studer + Reishauer handbooks: centerless grinding is THE high-volume cylindrical solution. No end-fixturing required (work rolls between control wheel + grinding wheel). Achieves ±5 μm at production rates of 1000+ parts/hour. Bearings, pins, bushings — all centerless-ground. Surface grinder is for flat work; form grinder for shaped wheels; creep-feed for deep slots in superalloys.",
      topicTags: ["grinder", "centerless", "bearings"],
    }],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["grinding_surface_finish_calc"],
  },

  {
    id: "course-34-m7",
    title: "Machine Selection — The Routing Decision Tree",
    order: 6,
    content: [
      {
        type: "text" as ContentType,
        body: `# Routing a Job to the Right Machine

## The decision tree

\`\`\`
Is the part rotationally symmetric?
  YES → LATHE family
    Tiny + high volume (Ø<25mm, 1000s+)? → Swiss-style
    Both-end machining? → Sub-spindle lathe
    Side-of-shaft features? → Mill-turn with live tooling
    Standard shaft? → 2-axis CNC lathe

  NO → Continue:

  Is hardness > HRC 50?
    YES → Hard-machining OR EDM OR grinding
      Internal sharp corners? → Wire EDM
      Through hardened material? → Wire EDM
      Mold cavity? → Sinker EDM (after CNC roughing)
      Tight tolerance + Ra<0.4? → Grinding
      Otherwise → Hard turning (CBN)

    NO → Continue:

  Does the part have complex 3D surfaces / undercuts / impeller-blade-like features?
    YES → 5-axis machining center
      Trunnion if standard part size (<24" cube)
      Gantry if large (>3 ft)
      Head/Head if complex surfaces requiring max kinematics

    NO → Continue:

  Does the part have features on multiple sides + production volume > 50?
    YES → HMC (4 sides in 1 setup)
    NO → Continue:

  Does the part have features on 2-3 sides + budget-constrained?
    YES → 4-axis VMC
    NO → 3-axis VMC (the default)
\`\`\`

## When in doubt — use PRISM's machine recommender

\`\`\`
prism_data machine_recommend \\
  --part_envelope_mm="200,150,80" \\
  --material=4140_steel \\
  --tolerance_class=IT8 \\
  --quantity=50 \\
  --required_features="probing,4th_axis"
\`\`\`

Returns ranked candidate machines from JM Die's 21-machine fleet (course-23 mod 4).

## Closing — the academy's coverage of /goal's "each machine type" axis

After course-34, the PRISM Academy has documented:
- 3-axis VMC (M1)
- HMC + 4-axis VMC (M2)
- 5-axis machining centers in 3 configurations (M3)
- All lathe types: 2-axis, sub-spindle, mill-turn, Swiss, multi-spindle (M4)
- EDM: wire + sinker (M5)
- Grinders: 6 types (M6)
- Plus from prior courses: laser cutters (course-22), waterjet (course-22), robot machining (course-27 SprutCAM), routers (course-26 Alphacam non-metallic)

**Every major machine class in U.S. manufacturing is now documented in the academy.**

[per PRISM ShopConfigurationEngine + JM Die machine inventory + each vendor's reference manual]`,
      },
    ],
    quiz: [{
      id: "course-34-m7-q1",
      type: "multiple_choice",
      prompt: "Apply the decision tree: hardened H13 die (HRC 55) with sharp internal corners + intricate cavity. Which machine + sequence?",
      options: [
        "3-axis VMC only — standard CNC milling",
        "CNC rough mill at HRC 30 (pre-harden) → HEAT TREAT to HRC 55 → sinker EDM finish + sharp corners → polish if mirror needed",
        "Lathe alone",
        "Grinder alone",
      ],
      correctIndex: 1,
      explanation: "Per the decision tree + course-33 + course-34: hardened die work follows the canonical mold/die workflow. CNC mill bulk material BEFORE hardening (soft state HRC 30, easy machining). Heat treat to HRC 55. Sinker EDM finishes the cavity + handles sharp internal corners that no end mill can reach. Polish/mirror finish if required. Hard-milling alone would be slow + risky; grinding alone can't handle the complex 3D geometry.",
      topicTags: ["machine_selection", "hardened_steel", "mold_die"],
    }],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["machine_recommend", "shop_config_get"],
  },
];

export const COURSE_34_MODULES: Module[] = modules;
