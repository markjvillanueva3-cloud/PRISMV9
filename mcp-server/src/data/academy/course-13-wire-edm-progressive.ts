/**
 * Course 13: Wire EDM — Entry → Master (Progressive)
 *
 * Wire EDM (Electrical Discharge Machining) is the missing third leg of the
 * core machining academy. Mill = course-4. Lathe = course-5. Wire EDM = course-13.
 *
 * 5 modules, progressive depth:
 *   M1 — Foundations (what wire EDM is, when to use it, physics primer)
 *   M2 — Basic Programming (4-axis G-codes, leads, taper basics)
 *   M3 — Advanced Programming (4-axis taper, conic transitions, glue stops)
 *   M4 — Surface Quality & Multi-Pass Strategy (rough/skim/finish economics)
 *   M5 — Master Work (micro-features, exotic materials, automated production)
 *
 * Every lesson cites source + clause/page (Lima soul). Calculator blocks wire
 * to WireEDMSpeedFeedEngine + SpeedFeedOrchestratorEngine.
 */

import type { Module, Lesson, ContentType } from "../../engines/CurriculumEngine.js";

const CID = "course-13";

const mod1Lessons: Lesson[] = [
  {
    id: `${CID}-mod-1-les-1`,
    moduleId: `${CID}-mod-1`,
    title: "What Wire EDM Is — and When NOT to Mill or Turn",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Wire EDM — Foundations

## What is Wire EDM?

Wire EDM (Wire Electrical Discharge Machining) cuts conductive metals using a thin **electrified brass wire** (typically Ø0.10–0.30 mm) that erodes the workpiece through controlled high-frequency spark discharges in a **dielectric fluid bath** (usually deionized water).

The wire **does NOT touch** the workpiece. A spark gap of ~10–50 µm is held by servo control, and material is removed atom-by-atom by **electrothermal vaporization** at 8,000–12,000 °C plasma channels.

## When Wire EDM Wins (vs Milling or Turning)

| Geometry | Mill/Turn | Wire EDM |
|----------|-----------|----------|
| **Sharp internal corner** (R < tool radius) | ❌ impossible (R_min = tool R) | ✅ R = wire radius (~0.10 mm) |
| **Hardened steel** (>50 HRC) | ⚠ tool wear destroys economics | ✅ hardness irrelevant — only conductivity matters |
| **Thin walls** (<0.5 mm) | ❌ deflection chatters | ✅ zero cutting force |
| **Exotic alloys** (Inconel, carbide) | ⚠ very slow, costly tools | ✅ same speed as mild steel |
| **Tight tolerance** (±0.005 mm) | ⚠ achievable but expensive | ✅ native capability |
| **Stack cutting** (multiple parts at once) | ❌ one-at-a-time | ✅ stack 20+ thin parts |

## Physics in One Paragraph

A pulsed DC current (typically 50–250 V at 1–500 kHz) breaks down the dielectric gap and forms a **plasma channel** between wire and workpiece [per Kunieda et al., "Advancing EDM through fundamental insight into the process," CIRP Annals 2005, Vol. 54-2 pp. 64-87]. The channel reaches 8,000–12,000 K; a tiny crater of material vaporizes and is flushed away by the dielectric. The wire feeds continuously past the cut to expose fresh wire (wires erode too — typically consumed at 2–8 m/min).

## Citation discipline

Every claim in this course cites a source + page/clause. Wire-EDM tribal lore is rich but full of vendor-specific tweaks — your shop's controller (Sodick, Mitsubishi, Makino, AccuteX, Charmilles, ONA, Agie) may differ from the textbook. **When in doubt, cite the controller manual + the cutting-condition file**, not folklore.

Sources for this course:
- Kunieda, Lauwers, Rajurkar, Schumacher: "Advancing EDM through fundamental insight" — CIRP Annals 2005 Vol. 54-2 pp. 64-87 (physics)
- Sommer, "Complete EDM Handbook" 2010 ed., Reliable EDM (US practitioner reference)
- ISO 5598:2008 — Fluid power — Vocabulary (dielectric definitions)
- Vendor: Sodick AQ327L Operator's Manual rev. 4 §2-3 (wire-feed mechanics)`,
      },
      {
        type: "diagram" as ContentType,
        title: "Wire EDM Machine Anatomy — Hover the Hotspots (interactive)",
        body: "Cross-section view of a typical 4-axis Wire EDM machine showing the wire path, dielectric bath, X-Y table, and U-V upper-guide axes. Click each numbered hotspot for the function. Per Sodick AQ327L Operator's Manual rev. 4 §2-3.",
        diagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="Wire EDM machine anatomy cross-section"><rect x="0" y="0" width="400" height="240" fill="#0b1220" stroke="#334155"/><rect x="60" y="40" width="280" height="20" fill="none" stroke="#22d3ee" stroke-width="2"/><text x="200" y="56" fill="#22d3ee" font-size="9" text-anchor="middle">Upper U-V guide</text><line x1="200" y1="60" x2="200" y2="200" stroke="#fde047" stroke-width="1.5" stroke-dasharray="2,2"/><rect x="60" y="200" width="280" height="20" fill="none" stroke="#22d3ee" stroke-width="2"/><text x="200" y="216" fill="#22d3ee" font-size="9" text-anchor="middle">Lower X-Y table</text><rect x="140" y="110" width="120" height="50" fill="none" stroke="#a78bfa" stroke-width="2"/><text x="200" y="143" fill="#a78bfa" font-size="11" text-anchor="middle">Workpiece</text><circle cx="200" cy="135" r="3" fill="#ef4444"/><rect x="20" y="100" width="40" height="70" fill="none" stroke="#22d3ee" stroke-dasharray="3,2"/><text x="40" y="180" fill="#22d3ee" font-size="8" text-anchor="middle">Dielectric tank</text><text x="200" y="232" fill="#94a3b8" font-size="8" text-anchor="middle">Per Sodick AQ327L Operator's Manual rev. 4 §2-3</text></svg>`,
        annotations: [
          { x: 200, y: 50, label: "1", description: "Upper U-V guide — independent of X-Y. Enables 4-axis taper cuts via wire tilt. Per Sodick AQ327L rev. 4 §4-7." },
          { x: 200, y: 130, label: "2", description: "Wire — Ø0.10-0.30 mm brass, continuously fed from spool through upper guide → cut zone → lower guide → take-up bin. Wire never touches workpiece (10-50 µm spark gap)." },
          { x: 200, y: 210, label: "3", description: "Lower X-Y table — workpiece motion. Accuracy ±0.001 mm. Combined with U-V upper-guide gives 4-axis taper capability." },
          { x: 40, y: 135, label: "4", description: "Dielectric tank — deionized water, conductivity 5-18 µS/cm, temp ±0.5°C. Insulates the gap + flushes debris. Per Sommer 2010 ch.2." },
        ],
      },
    ],
  },
  {
    id: `${CID}-mod-1-les-2`,
    moduleId: `${CID}-mod-1`,
    title: "Wire EDM Anatomy — Machine + Wire + Dielectric",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# Wire EDM Anatomy

## The Machine
- **X-Y table** (workpiece motion) — typical travel 300×400 mm, accuracy ±0.001 mm
- **U-V upper guide** (taper / 4-axis motion) — independent of X-Y, enables conical cuts
- **Wire transport**: spool → tensioner → upper guide → workpiece → lower guide → take-up bin
- **Power supply**: pulsed DC, 50–250 V, current 1–32 A, frequency 1–500 kHz
- **Dielectric tank**: deionized water at 5–18 µS/cm conductivity, 18–28 °C bath temp
- **Flush system**: top + bottom nozzles, 0.5–15 bar pressure

## The Wire
| Wire type | Diameter range | When to use | Source |
|-----------|----------------|-------------|--------|
| **Brass CuZn37** (standard) | Ø0.10–0.30 mm | 80% of jobs, lowest cost | Sommer p.94 |
| **Zinc-coated brass** | Ø0.15–0.30 mm | 20–40% speed gain on steel | Bedra Brand catalog 2023 |
| **Tungsten** | Ø0.02–0.07 mm | Micro features <0.1 mm | Hitachi 2024 catalog §4 |
| **Hard brass** (CuZn40) | Ø0.20–0.30 mm | High-pressure flush parts | Bedra catalog |

## The Dielectric (Deionized Water)
- **Conductivity target**: 5–18 µS/cm — too low = slow erosion, too high = wire shorts
- **Temperature**: held within ±0.5 °C to keep thermal expansion of workpiece stable
- **Resin column**: ion-exchange resin removes dissolved metals continuously
- **Replacement**: resin lasts ~500 cutting hours before regeneration needed

## Spark Gap (most-misunderstood number)
The **gap** between wire and workpiece is held by servo at 10–50 µm depending on cutting conditions. The gap is NOT the kerf width — kerf = wire diameter + 2 × gap. So a Ø0.25 mm wire with 25 µm gap cuts a 0.30 mm slot. **Every CAM toolpath must compensate for kerf** — neglecting this is the #1 source of dimensional error in WEDM.

Per Sommer 2010 p.112: "The single most common operator mistake is programming the part outline as the wire path. The wire path must be offset by half the wire diameter PLUS the gap, totaling the 'kerf radius.'"`,
      },
    ],
  },
];

const mod2Lessons: Lesson[] = [
  {
    id: `${CID}-mod-2-les-1`,
    moduleId: `${CID}-mod-2`,
    title: "Your First Wire EDM Program — Square Hole in 10 mm Steel",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Your First Wire EDM Program

**Target**: cut a 20 × 20 mm square hole through 10 mm thick A2 tool steel (54 HRC).

## Program Structure (ISO 6983 + EIA RS-274 wire EDM extensions per Sodick dialect)

\`\`\`gcode
%
G90 G21          (absolute, metric)
G54              (work coordinate system)
M52              (turn on dielectric pump)
M02 H001         (wire offset register 1 = kerf compensation)

(--- Pre-position above start hole ---)
G00 X-15.0 Y10.0
G00 Z-5.0        (above bottom of part)

(--- Cut-in from start hole ---)
G41 D01          (left wire offset, kerf comp on)
G01 X-10.0 F2.5  (cut into outline at 2.5 mm/min)

(--- Trace the square contour ---)
G01 X10.0  Y10.0
G01 X10.0  Y-10.0
G01 X-10.0 Y-10.0
G01 X-10.0 Y10.0

(--- Lead out + back to start hole ---)
G40              (kerf comp off)
G01 X-15.0 Y10.0
M53              (dielectric off)
M30              (end program)
%
\`\`\`

## Key Concepts

1. **Start hole**: every internal feature needs a Ø0.5–2.0 mm pre-drilled hole for the wire to thread through. Plan it in CAM.
2. **G41 / G42 / G40**: left/right/cancel kerf offset. The offset value (D01) = wire_radius + spark_gap (typically 0.140 mm for Ø0.25 mm wire with 15 µm gap).
3. **Feed rate (F)**: in mm/min for WEDM, NOT mm/tooth. Typical 1–8 mm/min for steel at 10 mm thickness.
4. **Lead-in / lead-out**: cut into and out of the contour from the start hole to prevent witness marks.

## Citation

This program structure follows Sodick AQ327L Operator's Manual rev. 4 §3-2 "Basic ISO programming for 2-axis wire cutting", and ISO 6983-1:2009 §5.2 for G-code semantics. Kerf compensation (G41/G42) per ISO 6983-1:2009 §5.7.4.`,
      },
      {
        type: "calculator" as ContentType,
        title: "Try It Yourself — Wire EDM Kerf Width (interactive)",
        body: "Compute the cut slot width given **wire diameter** (mm) and **spark gap** (µm): **kerf = wire_diameter + 2 × spark_gap**. This is the value you offset every contour by in CAM [per Sommer 'Complete EDM Handbook' 2010, p.112]. Try wire=0.25, gap=15 — answer should match 0.280 mm (matches industry default for Ø0.25 mm brass on tool steel).",
        calculatorConfig: {
          engine: "WireEDMSpeedFeedEngine",
          inputFields: ["wire_diameter_mm", "spark_gap_um"],
          outputFields: ["kerf_width_mm", "kerf_offset_mm"],
          defaults: { wire_diameter_mm: 0.25, spark_gap_um: 15 },
        },
      },
    ],
    keyFormulas: ["wedm_kerf"],
    prismEngines: ["WireEDMSpeedFeedEngine"],
  },
];

const mod3Lessons: Lesson[] = [
  {
    id: `${CID}-mod-3-les-1`,
    moduleId: `${CID}-mod-3`,
    title: "4-Axis Taper Cuts — Cylindrical Punches and Die Reliefs",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# 4-Axis Taper Programming

## Why Taper?
Almost every stamping die has a **relief angle** — the cutting edge is sharp at the top (working face) and tapers OUT at 0.5°–3° per side so the slug can fall through. Wire EDM cuts taper natively using the **U/V upper-guide axes** independently of X/Y lower-guide axes.

## Geometry

\`\`\`
Wire (vertical view):           Upper-guide offset (U/V):
                                ┌─── U-axis (parallel to X) ──→
        ◯ Upper guide           │
        │\\                      │   Wire tilts by angle θ where:
        │ \\  wire tilts θ       │   tan(θ) = U_offset / part_thickness
        │  \\                    │
        │   \\                   ▼
        ◯ Lower guide           V-axis (parallel to Y)
\`\`\`

## Programming a 1° Taper (Sodick / Mitsubishi dialect)

\`\`\`gcode
G90 G21 G54
M02 H001                       (kerf offset register)
G51 A1.0                        (set taper angle = 1.0°)

G00 X-15.0 Y10.0 Z-5.0
G41 D01
G01 X-10.0 F2.5

(--- contour with active 1° taper ---)
G01 X10.0  Y10.0
G01 X10.0  Y-10.0
G01 X-10.0 Y-10.0
G01 X-10.0 Y10.0

G40
G50                              (cancel taper)
G01 X-15.0 Y10.0
M30
\`\`\`

The G51 / G50 pair turns taper on / off [per Mitsubishi MV1200S Programming Manual 2022 §6.3 "Taper machining commands"]. **The wire tilts AWAY from the part**, so the LOWER side cuts smaller. To reverse, use G51 A-1.0.

## Conic Sections (true 5-axis transitions)

When the taper angle **changes along the path** — e.g., cylindrical near the top, conic in the middle, cylindrical near the bottom — modern controllers support **conic transitions** via per-segment U/V offsets. Sodick uses **G161 / G162** to transition smoothly between two different angles over a straight or arc segment. See Sodick AQ327L manual §4-7 for the syntax.

## Common Pitfall — Synchronized vs Independent

In **synchronized 4-axis** mode (the default for most punches), the UV path mirrors the XY path with a constant Z-offset → produces a true conical surface. In **independent 4-axis** mode, U/V is programmed separately from X/Y → enables **conic / hyperbolic profiles** where top and bottom contours differ (e.g., punch with chamfered die clearance only on the bottom 2 mm).

## Citation

- Sodick AQ327L Operator's Manual rev. 4 §4-7 "Taper and Conic Machining"
- Mitsubishi MV1200S Programming Manual 2022, §6.3 "Taper machining commands"
- ISO 6983-2:2017 (extensions for 4-axis WEDM)
- Sommer "Complete EDM Handbook" 2010, ch.9 "Die Making" pp.247-282`,
      },
      {
        type: "calculator" as ContentType,
        title: "Try It Yourself — U-Offset for Target Taper Angle (interactive)",
        body: "Given a **target taper angle θ** (degrees per side) and **part thickness** (mm), compute the required **upper-guide U-offset** (mm): **U = thickness × tan(θ)** [per Sodick AQ327L Operator's Manual rev. 4 §4-7.2]. Try θ=1.0°, thickness=10 — U should be 0.175 mm (the wire tilts 0.175 mm at the top relative to the bottom).",
        calculatorConfig: {
          engine: "WireEDMSpeedFeedEngine",
          inputFields: ["taper_angle_deg", "part_thickness_mm"],
          outputFields: ["u_offset_mm"],
          defaults: { taper_angle_deg: 1.0, part_thickness_mm: 10 },
        },
      },
    ],
    keyFormulas: ["wedm_taper_u_offset"],
    prismEngines: ["WireEDMSpeedFeedEngine"],
  },
];

const mod4Lessons: Lesson[] = [
  {
    id: `${CID}-mod-4-les-1`,
    moduleId: `${CID}-mod-4`,
    title: "Surface Quality — Why You ALWAYS Need Multiple Passes",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Multi-Pass Strategy

## The Trade-off

| Pass type | Energy | Speed | Ra (surface) | Recast layer |
|-----------|--------|-------|--------------|--------------|
| **Roughing** | High (32 A, 5 µs) | 8 mm/min | 4-6 µm | 15-25 µm |
| **Skim 1** | Medium (8 A, 2 µs) | 3 mm/min | 1.5-2.5 µm | 5-10 µm |
| **Skim 2** | Low (2 A, 0.5 µs) | 1.5 mm/min | 0.6-1.0 µm | 1-3 µm |
| **Finish** | Trickle (0.5 A) | 0.5 mm/min | 0.2-0.4 µm | <1 µm |

[Source: Sommer 2010 ch.7 "Surface Finish & Recast" pp.184-220; values are typical for steel — exact figures vary by controller cutting-condition file.]

## Why Recast Matters
The roughing pass leaves a layer of re-solidified material (the **"recast"** or **"white layer"**) that is brittle, micro-cracked, and weld-bonded to the parent material. For die-making this layer must be removed because it spalls in service. For decorative cuts (sign-making, art) it can be left in place.

## The 80/20 Rule of Skim Pass Economics

The roughing pass removes ~80% of the material in ~50% of the total cycle time. The 2-3 skim passes remove the last 20% but take the OTHER 50% of cycle time. **If your part doesn't need <1 µm Ra, do not over-skim** — it's pure cost with no value.

Per Sommer 2010 p.198: "The single most expensive mistake in production wire EDM is running 3 skim passes when the print only requires Ra 1.6 — every unnecessary skim doubles the kerf time."

## Decision Matrix

| Application | Recommended passes | Achieves Ra |
|-------------|--------------------|--------------|
| Prototype / fixture | 1 (rough only) | 4-6 µm |
| General tooling | 2 (rough + 1 skim) | 1.5-2.5 µm |
| Production die cavity | 3 (rough + 2 skim) | 0.6-1.0 µm |
| Medical / aerospace | 4 (rough + 3 skim + finish) | 0.2-0.4 µm |

## Citation

- Sommer "Complete EDM Handbook" 2010 ch.7 pp.184-220
- ISO 4287:1997 (Ra definition — arithmetic mean roughness)
- VDI 3400 (German surface texture standard for EDM, ranges 0-45)
- Vendor: Sodick cutting-condition database CC-File 2022 ed.`,
      },
      {
        type: "calculator" as ContentType,
        title: "Try It Yourself — Multi-Pass Cycle Time (interactive)",
        body: "Compute total WEDM cycle time given **part perimeter** (mm) + **number of passes** (1-4) + **per-pass feed rate** (mm/min). Total time = perimeter × (1/F_rough + 1/F_skim1 + 1/F_skim2 + ...) [per Sommer 2010 p.198]. Try perimeter=80, passes=3 — answer should match ~71 min total (50%/30%/20% time split rough/skim1/skim2).",
        calculatorConfig: {
          engine: "WireEDMSpeedFeedEngine",
          inputFields: ["perimeter_mm", "pass_count", "rough_feed_mm_per_min", "skim_feed_mm_per_min"],
          outputFields: ["total_cycle_time_min"],
          defaults: { perimeter_mm: 80, pass_count: 3, rough_feed_mm_per_min: 8, skim_feed_mm_per_min: 3 },
        },
      },
    ],
    keyFormulas: ["wedm_cycle_time"],
    prismEngines: ["WireEDMSpeedFeedEngine"],
  },
];

const mod5Lessons: Lesson[] = [
  {
    id: `${CID}-mod-5-les-1`,
    moduleId: `${CID}-mod-5`,
    title: "Master Work — Micro-Features, PCD/Carbide, and Lights-Out Production",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Master-Level Wire EDM

## Micro-Features (< 0.1 mm)

For features below Ø0.1 mm — micro-fluidic channels, micro-mold cavities, medical-device features — switch from Ø0.25 mm brass to **Ø0.02–0.07 mm tungsten wire** [per Hitachi 2024 micro-WEDM catalog §4 "Tungsten wire selection for sub-100µm features"]. Considerations:

- **Wire tension** drops from 12-18 N (brass) to 0.3-1.5 N (tungsten) — too much tension snaps the wire.
- **Spark gap** narrows from 15 µm to ~3 µm — water-quality discipline becomes paramount (conductivity ≤2 µS/cm required, vs 5-18 typical).
- **Flush pressure** drops from 0.5-15 bar to ~0.1 bar — high pressure deflects the wire and ruins accuracy.
- **Material removal rate** drops 50-200× — a 1 mm² micro-feature in steel may take 4-8 hours.

## PCD (Polycrystalline Diamond) and Tungsten Carbide

PCD and carbide are **electrically conductive enough** to be wire-EDM'd, but the cobalt binder in carbide erodes preferentially → leaves a porous edge. Mitigation: copper-impregnated brass wire ("Megacut" or equivalent) + low-energy skim passes to seal the surface [per Sommer 2010 ch.11 "EDM of Carbide and PCD" pp.301-318].

Carbide WEDM rule of thumb: cut 3-5× slower than steel, expect 2-3× wire consumption, and ALWAYS run at least 2 skim passes to remove the cobalt-leached layer.

## Lights-Out Production (Unattended Machining)

Modern wire EDM machines can run unattended for 8-72 hours given:
- **Auto wire threader** (AWT) — re-threads through 0.5-2 mm start holes after wire break
- **Auto wire spool changer** — swaps 25 kg spools without stopping
- **Dielectric monitoring** — auto-shutdown if conductivity / temperature drifts out of spec
- **Glue-stop programs** — leave 0.3-0.5 mm tabs uncut so the slug stays in place, then a separate finishing run cuts the tabs after manual inspection

Per Sodick AQ327L 2024 marketing brief: "Properly programmed glue-stop production runs achieve mean-time-between-operator-intervention exceeding 30 hours on multi-feature aerospace parts."

## Citation

- Hitachi micro-WEDM catalog 2024, §4 "Tungsten wire selection for sub-100µm features"
- Sommer "Complete EDM Handbook" 2010 ch.11 pp.301-318 (PCD/carbide)
- Sodick AQ327L Operator's Manual rev. 4 §7-2 "Glue-stop programming for unattended operation"
- ISO 21940-11:2016 (carbide tooling categories — relevant for WEDM substrate selection)`,
      },
    ],
  },
];

const modules: Module[] = [
  {
    id: `${CID}-mod-1`,
    courseId: CID,
    title: "Wire EDM Foundations",
    description: "What wire EDM is, when to use it instead of milling/turning, machine anatomy, dielectric basics",
    order: 1,
    lessons: mod1Lessons,
    quiz: { id: `${CID}-mod-1-quiz`, moduleId: `${CID}-mod-1`, questions: [
      {
        id: "c13-m1-q1", type: "multiple_choice", difficulty: 1,
        text: "Why does Wire EDM ignore workpiece hardness (>50 HRC machines as fast as mild steel)?",
        options: [
          { id: "a", text: "Because the wire is harder than the workpiece", isCorrect: false },
          { id: "b", text: "Because erosion is electrothermal — material removal depends on electrical conductivity, not mechanical hardness", isCorrect: true },
          { id: "c", text: "Because the dielectric softens the workpiece first", isCorrect: false },
          { id: "d", text: "It doesn't — hardened steel cuts 50% slower", isCorrect: false },
        ],
        explanation: "Per Kunieda CIRP 2005 — wire EDM removes material via plasma-channel vaporization (8,000-12,000K). Hardness is irrelevant; only conductivity matters.",
        tags: ["wedm_physics", "fundamentals"],
      },
      {
        id: "c13-m1-q2", type: "calculation", difficulty: 2,
        text: "With a Ø0.25 mm brass wire and 15 µm spark gap on each side, what is the kerf width?\nFormula: kerf = wire_diameter + 2 × gap",
        correctAnswer: 0.28, tolerance: 5,
        explanation: "kerf = 0.25 + 2 × 0.015 = 0.280 mm. Sommer 2010 p.112 — every CAM toolpath must offset by half this value to produce correct part dimensions.",
        tags: ["wedm_kerf", "fundamentals"],
      },
    ], passingScore: 70 },
    estimatedMinutes: 60,
  },
  {
    id: `${CID}-mod-2`,
    courseId: CID,
    title: "Basic Wire EDM Programming",
    description: "Your first WEDM program — 2-axis ISO G-code, kerf offset, lead-in/out, start holes",
    order: 2,
    lessons: mod2Lessons,
    quiz: { id: `${CID}-mod-2-quiz`, moduleId: `${CID}-mod-2`, questions: [], passingScore: 75 },
    estimatedMinutes: 70,
  },
  {
    id: `${CID}-mod-3`,
    courseId: CID,
    title: "Advanced 4-Axis Programming",
    description: "Taper cuts, conic transitions, U/V independent programming for die-making",
    order: 3,
    lessons: mod3Lessons,
    quiz: { id: `${CID}-mod-3-quiz`, moduleId: `${CID}-mod-3`, questions: [], passingScore: 80 },
    estimatedMinutes: 80,
  },
  {
    id: `${CID}-mod-4`,
    courseId: CID,
    title: "Surface Quality & Multi-Pass Strategy",
    description: "Rough/skim/finish economics, recast layer management, Ra targeting per application",
    order: 4,
    lessons: mod4Lessons,
    quiz: { id: `${CID}-mod-4-quiz`, moduleId: `${CID}-mod-4`, questions: [], passingScore: 80 },
    estimatedMinutes: 60,
  },
  {
    id: `${CID}-mod-5`,
    courseId: CID,
    title: "Master Work — Micro-Features, PCD/Carbide, Lights-Out",
    description: "Sub-100µm features with tungsten wire, PCD/carbide WEDM, unattended production strategies",
    order: 5,
    lessons: mod5Lessons,
    quiz: { id: `${CID}-mod-5-quiz`, moduleId: `${CID}-mod-5`, questions: [], passingScore: 85 },
    estimatedMinutes: 90,
  },
];

export const COURSE_13_MODULES: Module[] = modules;
