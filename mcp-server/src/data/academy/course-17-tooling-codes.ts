/**
 * Course 17: Tooling Codes — ISO Insert + ANSI Body + Chip-Breaker
 *
 * 2026-05-24 lima iter24. The "tooling Rosetta stone" course — operators learn
 * to read every character of an insert/holder/grade code and feed that data
 * directly into speed-feed calculations.
 *
 * Mod1: ISO 1832 insert code anatomy (CNMG 120408 etc.)
 * Mod2: ANSI body code anatomy (toolholder hand, shank, lead angle)
 * Mod3: Material grade + chip-breaker designators (-PM/-MM/-KR/-MR/-WF) +
 *       how each code maps to a feed-rate range fed into SpeedFeedOrchestratorEngine.
 *
 * Every code character cited from ISO 1832:2017 + Sandvik Coromant Turning
 * Application Guide 2021. Lima soul preserved.
 */

import type { Module, Lesson, ContentType } from "../../engines/CurriculumEngine.js";

const CID = "course-17";

const mod1Lessons: Lesson[] = [
  {
    id: `${CID}-mod-1-les-1`,
    moduleId: `${CID}-mod-1`,
    title: "ISO 1832 Insert Code — Reading CNMG 120408 Character by Character",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# ISO 1832 Insert Code — The Universal Rosetta Stone

**Prerequisite:** course-5 (Turning Operations) module 1 recommended.
**Learning objective:** Read any ISO turning insert code and extract every parameter that feeds speed-feed calculation.
**Assessment:** Given the code "CNMG 120408-PM", state shape, clearance, tolerance, fixturing, length, thickness, nose-radius, and chip-breaker code.

## Code structure (ISO 1832:2017)

\`\`\`
C  N  M  G   12  04  08   - P  M
│  │  │  │   │   │   │     │  │
│  │  │  │   │   │   │     │  └─ chip-breaker code (manufacturer-specific)
│  │  │  │   │   │   │     └──── material grade code (P/M/K/N/S/H/B = ISO group)
│  │  │  │   │   │   └────────── nose radius × 100 (08 = R0.8 mm)
│  │  │  │   │   └────────────── thickness × 10 (04 = 4.76 mm; truncated from 4.7625)
│  │  │  │   └────────────────── inscribed-circle diameter (12 = 12.7 mm)
│  │  │  └────────────────────── fixturing type (G = with hole + chip-breaker)
│  │  └───────────────────────── tolerance class (M = ISO M, ±0.05-0.13 mm)
│  └──────────────────────────── clearance angle (N = 0°, neutral / negative rake)
└─────────────────────────────── shape (C = 80° rhombic)
\`\`\`

[per ISO 1832:2017 §4.1-4.7 "Designation system for indexable inserts for cutting tools"]

## The 7 ISO shape codes (position 1)

| Code | Shape | Strength | Versatility | Typical use |
|------|-------|----------|-------------|-------------|
| **C** | 80° rhombic | High | Versatile | General turning, OD + face |
| **D** | 55° rhombic | Medium | Profile work | Contour, copy turning |
| **R** | Round | Highest | One direction only | Heavy roughing, profile |
| **S** | Square | High | 4 edges per side | Face milling, roughing |
| **T** | Triangle | Medium | 3 edges, sharp corners | General-purpose |
| **V** | 35° rhombic | Lowest (delicate) | Fine profile work | Finish profiling |
| **W** | Trigon | High | 6 edges (3 per side) | Heavy roughing |

## The 7 ISO clearance codes (position 2)

| Code | Angle | When | Source |
|------|-------|------|--------|
| **N** | 0° (negative) | Both sides usable, double the edges, max strength | ISO 1832 §4.2 |
| **P** | 11° | Aluminum + non-ferrous, fine finish | ISO 1832 §4.2 |
| **C** | 7° | General positive rake | ISO 1832 §4.2 |
| **B** | 5° | Heavy turning, low rake | ISO 1832 §4.2 |
| **D** | 15° | Very positive, soft materials | ISO 1832 §4.2 |
| **E** | 20° | Extreme positive, finishing | ISO 1832 §4.2 |
| **A** | 3° | Profiling, low clearance | ISO 1832 §4.2 |

## How this feeds speed-feed calculation

The insert code determines THREE critical inputs to SpeedFeedOrchestratorEngine:
1. **Effective lead angle** — from shape + holder lead → corrects chip thickness via cos(lead)
2. **Nose radius** — drives Ra prediction: \`Ra ≈ f² / (32 × r_ε)\` [Brammertz 1961]
3. **Permissible feed range** — chip-breaker code (-PM = finishing 0.10-0.30 mm/rev, -MM = medium 0.25-0.50, -KR = roughing 0.40-0.80) [per Sandvik Coromant Turning Application Guide 2021 ch.4]

Once you can read the code, you can derive these inputs without looking them up — and you can spot when the tool is wrong for the cut (e.g., -KR roughing breaker on a finishing pass = poor finish; -PM finishing breaker on a roughing pass = insert failure).

## Citation

- ISO 1832:2017 — "Indexable inserts for cutting tools — Designation"
- Sandvik Coromant Turning Application Guide 2021 ch.4 "Insert designation"
- Brammertz K.-H., "Die Entstehung der Oberflächenrauheit beim Feindrehen", Industrie-Anzeiger 1961 (Ra formula)`,
      },
      {
        type: "diagram" as ContentType,
        title: "ISO Insert Code Anatomy — Hover the Hotspots (interactive)",
        body: "Visual breakdown of 'CNMG 120408-PM' character by character. Each numbered hotspot shows what that position controls. Per ISO 1832:2017 §4.",
        diagramSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" role="img" aria-label="ISO 1832 insert code character anatomy"><rect x="0" y="0" width="400" height="200" fill="#0b1220" stroke="#334155"/><text x="50" y="100" fill="#22d3ee" font-size="22" font-family="monospace">C</text><text x="80" y="100" fill="#22d3ee" font-size="22" font-family="monospace">N</text><text x="110" y="100" fill="#22d3ee" font-size="22" font-family="monospace">M</text><text x="140" y="100" fill="#22d3ee" font-size="22" font-family="monospace">G</text><text x="180" y="100" fill="#a78bfa" font-size="22" font-family="monospace">12</text><text x="220" y="100" fill="#a78bfa" font-size="22" font-family="monospace">04</text><text x="260" y="100" fill="#a78bfa" font-size="22" font-family="monospace">08</text><text x="300" y="100" fill="#fde047" font-size="22" font-family="monospace">-PM</text><text x="200" y="160" fill="#94a3b8" font-size="9" text-anchor="middle">CNMG 120408-PM — shape, clearance, tolerance, fix, IC, thickness, nose-R, breaker</text><text x="200" y="180" fill="#94a3b8" font-size="8" text-anchor="middle">Per ISO 1832:2017 §4</text></svg>`,
        annotations: [
          { x: 50, y: 95, label: "1", description: "Position 1 — Shape: C = 80° rhombic. The 7 shape codes (C/D/R/S/T/V/W) trade strength vs profile versatility. C is the workhorse for general OD/face turning." },
          { x: 80, y: 95, label: "2", description: "Position 2 — Clearance angle: N = 0° (negative rake). Negative inserts have BOTH sides usable (doubles edge count, max strength). Positive inserts (P/C/B/D/E) have one usable side but lower cutting force." },
          { x: 110, y: 95, label: "3", description: "Position 3 — Tolerance class: M = ISO M (±0.05-0.13 mm on dimensions). Tighter classes: F (precision), G (general). Affects how repeatable the cut is after an indexing." },
          { x: 140, y: 95, label: "4", description: "Position 4 — Fixturing: G = WITH center hole + chip-breaker (most common). A/B variations use clamp-on instead." },
          { x: 190, y: 95, label: "5", description: "Positions 5-6 — Inscribed circle diameter: 12 = 12.7 mm. The diameter of the largest circle inscribed in the insert. Drives holder pocket selection." },
          { x: 230, y: 95, label: "6", description: "Positions 7-8 — Thickness: 04 = 4.76 mm. Affects depth-of-cut capability + ramp speed for chip evacuation." },
          { x: 270, y: 95, label: "7", description: "Positions 9-10 — Nose radius × 100: 08 = R0.8 mm. CRITICAL for surface finish: Ra ≈ f² / (32 × r_ε). Larger radius = smoother finish but higher force." },
          { x: 320, y: 95, label: "8", description: "Suffix — Chip-breaker code: -PM = precision/medium feed (0.10-0.30 mm/rev). -KR = roughing (0.40-0.80 mm/rev). Vendor-specific letters; check vendor catalog for mapping." },
        ],
      },
      {
        type: "calculator" as ContentType,
        title: "Try It Yourself — Decode an ISO Insert Code (interactive)",
        body: "Enter an ISO 1832 insert code (e.g., 'CNMG 120408-PM') and the calculator returns shape, clearance, tolerance, fixturing, IC diameter (mm), thickness (mm), nose radius (mm), and chip-breaker class. Wired to the material/tool catalog so it can ALSO return the recommended feed range for this insert. Per ISO 1832:2017 §4.",
        calculatorConfig: {
          engine: "SpeedFeedOrchestratorEngine",
          inputFields: ["iso_insert_code", "iso_material_group"],
          outputFields: ["shape", "clearance_deg", "tolerance_class", "fixturing", "ic_diameter_mm", "thickness_mm", "nose_radius_mm", "breaker_code", "recommended_feed_min_mm_per_rev", "recommended_feed_max_mm_per_rev"],
          defaults: { iso_insert_code: "CNMG120408-PM", iso_material_group: 1 },
        },
      },
    ],
    keyFormulas: ["iso_insert_decode", "brammertz_ra"],
  },
];

const mod2Lessons: Lesson[] = [
  {
    id: `${CID}-mod-2-les-1`,
    moduleId: `${CID}-mod-2`,
    title: "ANSI Body Code — Reading a Holder Designation",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# ANSI Body Code (Toolholder Designation)

**Prerequisite:** module 1 (ISO insert code).
**Learning objective:** Read a holder code and extract hand (R/L/N), lead angle, shank dimension, insert hand-match.

## Standard ANSI external toolholder code

\`\`\`
M  W  L  N  R  -  16  -  4  D
│  │  │  │  │      │     │  │
│  │  │  │  │      │     │  └─ insert size code (D = matches DCMT)
│  │  │  │  │      │     └──── shank height (4 = 1.0 inch = 25.4 mm)
│  │  │  │  │      └────────── shank width × 4 = 16 = 1.0 inch (square shank assumed)
│  │  │  │  └───────────────── hand: R = right-hand (most common), L = left, N = neutral
│  │  │  └──────────────────── insert clearance (N = negative rake, matches CNMG/SNMG)
│  │  └─────────────────────── lead angle: L = 0° (90° approach), can also be M/E/J/F/G/H
│  └────────────────────────── insert shape match: W = trigon (matches WNMG)
└───────────────────────────── insert hold method: M = top + center clamp (most secure)
\`\`\`

[per ANSI B212.4-2002 + ISO 5610:2014]

## The hand-match rule

The HOLDER hand must match the INSERT hand:
- **R-hand holder** + **R-hand insert** → cuts from RIGHT-to-LEFT toward chuck (standard OD turning)
- **L-hand holder** + **L-hand insert** → cuts LEFT-to-RIGHT (back-turning, threading toward tailstock)
- **N (neutral)** holder takes either hand → used for facing + threading on slim/long parts

Per Sandvik Coromant Turning Application Guide 2021 §3.2: "Hand-mismatch is the #1 setup error in turning operations. The cutting edge on a wrong-hand combination drags backwards and fractures within 5-10 cuts."

## Lead angle position (position 3, e.g., the "L" in MWLNR)

The lead angle (approach angle) determines:
1. **Effective chip thickness**: hex = fz × cos(lead) — higher lead = thinner chip = more passes for same depth
2. **Cutting force vector**: 0° lead = pure axial force; 45° lead = balanced; 90° lead = pure radial
3. **Available DOC for sharp shoulder**: 90° approach gives sharp 90° shoulders; 45° approach rounds them by tan(45) × R

| Position-3 code | Lead angle | Approach angle | Use |
|------------------|------------|----------------|-----|
| **L** | 0° | 90° | Square shoulders, default |
| **M** | 30° | 60° | Heavy roughing, force-balanced |
| **E** | 75° | 15° | Profile turning, light cuts |
| **F** | 45° | 45° | Heavy face + OD, balanced |

[per ANSI B212.4-2002 Table 3]`,
      },
    ],
    keyFormulas: ["lead_angle_correction"],
  },
];

const mod3Lessons: Lesson[] = [
  {
    id: `${CID}-mod-3-les-1`,
    moduleId: `${CID}-mod-3`,
    title: "Grade + Chip-Breaker Codes — Mapping Letters to Speed-Feed Numbers",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Material Grades and Chip-Breaker Designators

**Prerequisite:** modules 1-2.
**Learning objective:** Read a grade designator (manufacturer-specific) and chip-breaker code, then look up the recommended Vc + fn range for the workpiece material.

## The ISO material group system (P/M/K/N/S/H/B)

Every insert grade is rated for one or more of the 7 ISO material groups:

| ISO group | Material family | Typical kc1.1 | Source |
|-----------|------------------|----------------|--------|
| **P** | Unalloyed/low-alloy steel | 1800 N/mm² | ISO 513:2012 |
| **M** | Stainless steel | 2100 N/mm² | ISO 513:2012 |
| **K** | Cast iron | 1100 N/mm² | ISO 513:2012 |
| **N** | Non-ferrous (Al, Cu, brass) | 700 N/mm² | ISO 513:2012 |
| **S** | Superalloys (Inconel, Ti) | 2800 N/mm² | ISO 513:2012 |
| **H** | Hardened steel (>45 HRC) | 3200 N/mm² | ISO 513:2012 |
| **B** | Composites + plastics | varies | ISO 513:2012 |

[kc1.1 values from mcp-server/src/physics/constants.ts — canonical PRISM physics constants]

## Vendor-specific grade codes

Each manufacturer has their own grade naming. PRISM normalizes these via the material registry:

| Vendor | Steel rougher | Steel finisher | Stainless | Cast iron | Titanium |
|--------|---------------|----------------|-----------|-----------|----------|
| **Sandvik** | GC4225 | GC4215 | GC2025 | GC3215 | GC1115 |
| **Iscar** | IC8250 | IC807 | IC908 | IC8150 | IC907 |
| **Kennametal** | KCP25 | KCP10 | KCS10 | KCK20 | KC5510 |
| **Mitsubishi** | MC6025 | MC6015 | MP9025 | MK7025 | MS7025 |

[per Sandvik / Iscar / Kennametal / Mitsubishi catalog 2024 cross-reference]

## Chip-breaker code mapping to feed range

| Suffix | Class | Feed range (mm/rev) | When |
|--------|-------|---------------------|------|
| **-PF** | Precision finishing | 0.05-0.15 | Tight Ra, low DOC |
| **-PM** | Precision medium | 0.10-0.30 | Standard finishing |
| **-MM** | Medium roughing | 0.25-0.50 | Versatile general |
| **-MR** | Medium roughing (chip-control) | 0.30-0.55 | Long chips, hard control |
| **-KR** | Roughing | 0.40-0.80 | Heavy DOC, fast |
| **-WF** | Wiper finishing | 0.30-0.60 | High feed + good Ra (wiper geom) |

[per Sandvik Coromant Turning Application Guide 2021 ch.4]

## How this all feeds speed-feed

When PRISM's SpeedFeedOrchestratorEngine receives an ISO insert code + ANSI body code + workpiece material, it:
1. Decodes the insert (mod 1) → extracts shape, nose_radius, breaker_code
2. Decodes the holder (mod 2) → extracts lead_angle
3. Looks up the grade in the material registry → returns recommended Vc range
4. Maps the breaker code → returns recommended fn range
5. Applies lead-angle chip-thinning correction → fn_corrected = fn / cos(lead)
6. Computes RPM from Vc + diameter, returns final {RPM, F, ap, ae} block

**This is why every operator should be able to read a tooling code by sight — the inputs to a correct cut ARE the code.**`,
      },
      {
        type: "calculator" as ContentType,
        title: "Try It Yourself — Code → Speed-Feed Lookup (interactive)",
        body: "Combined calculator: enter ISO insert code + ANSI body code + workpiece material (ISO group P/M/K/N/S/H/B). Returns Vc range, fn range, applied lead-angle correction, and final RPM + feed-rate. This is the SAME pipeline that the production SpeedFeedOrchestratorEngine runs — visible end-to-end. Per ISO 1832 + ANSI B212.4 + ISO 513:2012.",
        calculatorConfig: {
          engine: "SpeedFeedOrchestratorEngine",
          inputFields: ["iso_insert_code", "ansi_body_code", "iso_material_group", "diameter_mm"],
          outputFields: ["vc_m_per_min", "fn_mm_per_rev", "lead_angle_deg", "lead_correction_factor", "rpm", "feed_rate_mm_per_min"],
          defaults: { iso_insert_code: "CNMG120408-PM", ansi_body_code: "MWLNR-16-4D", iso_material_group: 1, diameter_mm: 50 },
        },
      },
    ],
    keyFormulas: ["iso_insert_decode", "lead_angle_correction", "kienzle_force"],
  },
];

const modules: Module[] = [
  {
    id: `${CID}-mod-1`,
    courseId: CID,
    title: "ISO 1832 Insert Code — Reading CNMG 120408",
    description: "Decode every character of an ISO turning insert designation. + decode calculator + 8-hotspot annotated diagram + 2 quiz questions.",
    order: 1,
    lessons: mod1Lessons,
    quiz: { id: `${CID}-mod-1-quiz`, moduleId: `${CID}-mod-1`, questions: [
      {
        id: "c17-m1-q1", type: "multiple_choice", difficulty: 2,
        text: "In ISO insert code 'CNMG 120408-PM', what does the '08' position represent?",
        options: [
          { id: "a", text: "Thickness in mm", isCorrect: false },
          { id: "b", text: "Nose radius × 100 (08 = R0.8 mm)", isCorrect: true },
          { id: "c", text: "Inscribed circle diameter", isCorrect: false },
          { id: "d", text: "Lead angle", isCorrect: false },
        ],
        explanation: "Per ISO 1832:2017 §4 — positions 9-10 encode nose radius × 100. '08' = 0.8 mm. This radius drives surface finish: Ra ≈ f² / (32 × r_ε) [Brammertz 1961].",
        tags: ["iso_insert_code", "nose_radius"],
      },
      {
        id: "c17-m1-q2", type: "multiple_choice", difficulty: 1,
        text: "What's the practical advantage of a clearance code 'N' (0° / negative rake) insert?",
        options: [
          { id: "a", text: "Lower cutting force", isCorrect: false },
          { id: "b", text: "Both faces usable, doubling the edge count vs positive inserts", isCorrect: true },
          { id: "c", text: "Better surface finish", isCorrect: false },
          { id: "d", text: "Faster cutting speeds", isCorrect: false },
        ],
        explanation: "Per ISO 1832 §4.2 + Sandvik Application Guide 2021 ch.4 — negative inserts have a 0° clearance on BOTH faces, so flipping the insert gives a fresh edge. CNMG = 8 usable corners; CCMT (positive) = 4 usable.",
        tags: ["iso_insert_code", "clearance_angle"],
      },
    ], passingScore: 75 },
    estimatedMinutes: 70,
  },
  {
    id: `${CID}-mod-2`,
    courseId: CID,
    title: "ANSI Body Code — Holder Designation Anatomy",
    description: "Read holder codes (hand, lead, shank, insert-match). + lead-angle correction formula.",
    order: 2,
    lessons: mod2Lessons,
    quiz: { id: `${CID}-mod-2-quiz`, moduleId: `${CID}-mod-2`, questions: [
      {
        id: "c17-m2-q1", type: "multiple_choice", difficulty: 2,
        text: "You have an R-hand holder + L-hand insert. What happens in the first 5-10 cuts?",
        options: [
          { id: "a", text: "Excellent surface finish — the mismatch lets the edge wear evenly", isCorrect: false },
          { id: "b", text: "Insert fractures — cutting edge drags backwards, micro-chipping cascades to catastrophic failure", isCorrect: true },
          { id: "c", text: "Slower cycle time but workable", isCorrect: false },
          { id: "d", text: "No effect — hand is cosmetic", isCorrect: false },
        ],
        explanation: "Per Sandvik Coromant Turning Application Guide 2021 §3.2 — hand mismatch is the #1 setup error; the wrong-hand cutting edge drags backwards and fractures within 5-10 cuts.",
        tags: ["holder_hand", "setup_safety"],
      },
    ], passingScore: 75 },
    estimatedMinutes: 50,
  },
  {
    id: `${CID}-mod-3`,
    courseId: CID,
    title: "Grade Codes + Chip-Breakers → Speed-Feed Pipeline",
    description: "Map vendor grades + chip-breaker codes to actual Vc/fn ranges and end-to-end speed-feed pipeline.",
    order: 3,
    lessons: mod3Lessons,
    quiz: { id: `${CID}-mod-3-quiz`, moduleId: `${CID}-mod-3`, questions: [
      {
        id: "c17-m3-q1", type: "multiple_choice", difficulty: 2,
        text: "A '-KR' suffix on a turning insert indicates feed range 0.40-0.80 mm/rev. Which application is correct?",
        options: [
          { id: "a", text: "Finish turning to ±0.005 mm tolerance", isCorrect: false },
          { id: "b", text: "Heavy roughing with high DOC, fast metal removal", isCorrect: true },
          { id: "c", text: "Precision threading", isCorrect: false },
          { id: "d", text: "Aluminum mirror-finish polishing", isCorrect: false },
        ],
        explanation: "Per Sandvik Coromant Turning Application Guide 2021 ch.4 — -KR is the roughing chip-breaker class (0.40-0.80 mm/rev). Wrong application: -PF/-PM for finishing (0.05-0.30 mm/rev).",
        tags: ["chip_breaker", "feed_range"],
      },
    ], passingScore: 80 },
    estimatedMinutes: 60,
  },
];

export const COURSE_17_MODULES: Module[] = modules;
