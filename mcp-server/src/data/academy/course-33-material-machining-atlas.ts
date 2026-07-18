/**
 * Course 33 — Material Machining Atlas (How to Cut Every Material)
 *
 * Per user directive 2026-05-25: "how to cut different materials (all materials),
 * explain recommendations and why we do operations in certain order".
 *
 * 6 modules, ~6 hours, intermediate tier, prereq=course-32.
 * Each material gets: properties, optimal Vc/fz/ap, tool selection, coolant,
 * coating, chip-control strategy, operation order rationale, common failure modes.
 * Continues course-29 LAYMAN + ADVANCED template; adds interactive calculator slots.
 *
 * Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-33-m1",
    title: "Group P — Steels (1018, 4140, 4340, A2/D2, H13, 17-4 PH, etc.)",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# How to Cut Steels (ISO Group P)

**Prerequisite:** course-32 mod 3 (tool wear mechanisms).
**Learning objective:** Select optimal Vc/fz/ap + tool + coating + coolant for any steel from 1018 mild through H13 hardened die steel.

## LAYMAN VERSION

Steels are the workhorse material in U.S. job shops (60-70% of jobs at JM Die). They cut predictably but the right parameters depend on HOW HARD the steel is:

- **Soft steels** (1018, A36, low-carbon): cuts easily, BUE risk if too slow, work-hardens a little. Use coated carbide, flood coolant, moderate Vc.
- **Medium-alloy steels** (1045, 4140, 4340): the bread-and-butter steels. Need positive-rake carbide, AlTiN coating, flood coolant, Vc=120-200 m/min.
- **Tool steels** (A2, D2, H13, M2): pre-hardened or hardenable. Soft (annealed): cuts like 4140. Hardened (>HRC 45): needs CBN or ceramic tools, NO coolant (thermal shock), Vc reduced 50%.
- **Stainless precipitation-hardened** (17-4 PH): toughness combined with hardness; tricky — uses Group M strategies (next module).

## ADVANCED VERSION — The 4 sub-classes

### P1: Low-carbon / mild steels (1018, A36, A283)

| Property | Value |
|----------|-------|
| Hardness | HB 120-180 |
| UTS | 380-550 MPa |
| kc1.1 (Kienzle) | 1500-1800 |
| Machinability rating | 60-80 (vs B1112 = 100) |

**Recommended parameters (carbide AlTiN-coated end mill, fz at Ø10):**
- Vc: 180-220 m/min (Sandvik 2024 §5.2)
- fz: 0.05-0.12 mm/tooth
- ap: 1× tool D (general); 2× D for plunge roughing
- ae: 60-70% D traditional; 8-12% D for HSM
- Coolant: flood; through-spindle for deep holes

**Operation order rationale:**
1. Pre-machined stock (mill flat datum face) — establishes flatness for fixturing
2. Drill all holes BEFORE pocketing — lower force, doesn't disturb fixturing
3. Rough pocket — leave 0.3-0.5 mm stock
4. Semi-finish — 0.05-0.1 mm stock left
5. Finish — 0 stock, climb cut
6. Drill + tap (last) — taps are fragile, do them after the bulk is removed

**Failure modes + fixes:**
- BUE at low Vc → increase Vc above 100 m/min, use coating
- Burrs at exit → climb cut + low fz on exit pass

### P2: Medium-alloy steels (1045, 4140, 4340, 8620)

| Property | Value |
|----------|-------|
| Hardness | HB 180-280 |
| UTS | 600-950 MPa |
| kc1.1 (Kienzle) | 2000-2400 |
| Machinability rating | 50-65 |

**Recommended parameters (carbide AlTiN, Ø10 end mill):**
- Vc: 120-180 m/min (4140 annealed); 80-130 m/min (4140 normalized HB220+)
- fz: 0.04-0.10 mm/tooth
- ap: 1× tool D rough; 0.5× for thin walls
- ae: 60% traditional; 8-12% HSM
- Coolant: flood mandatory (heat management)

**Why 4140 needs flood vs 1018 tolerates MQL:**
- 4140 has chromium (Cr), molybdenum (Mo) — these elements increase cutting-zone temperature
- Higher T → faster diffusion wear of tool (course-32 mod 3)
- Flood coolant routes heat into chip via convective transfer

**Operation order — JM Die 4140 shaft example:**
1. Rough face + center drill (establish Z datum)
2. Rough OD via G71 (CSS mode G96) — 0.5 mm finish stock
3. Heat treat (if specified — quench + temper to HRC 28-32)
4. Re-fixture, finish face (account for heat-treat distortion)
5. Finish OD via G70 (with springback comp per course-24 mod 3)
6. Threading via G76 (single-pass) or G76 multi-pass
7. Inspect (CMM with thermal compensation)

### P3: Hardened tool steels (A2, D2, H13, M2, hardened past HRC 45)

| Property | Value |
|----------|-------|
| Hardness | HRC 45-65 |
| UTS | 1800-2400 MPa |
| Machinability rating | 15-30 |

**THIS IS A DIFFERENT CUTTING REGIME** — conventional carbide fails fast. Use:
- **CBN inserts** (cubic boron nitride) — only material harder than the workpiece
- **Solid CBN end mills** for milling
- **Ceramic** (Al₂O₃-TiC) for turning
- **NO COOLANT** — thermal shock cracks CBN. Use compressed air for chip evacuation only

**Recommended parameters (CBN, hardened H13):**
- Vc: 100-180 m/min (CBN can run hard)
- fz: 0.02-0.05 mm/tooth (very light)
- ap: 0.1-0.5 mm (very small)
- Dry or compressed air only

**Operation order — hardened die machining:**
1. Pre-hardened blank from supplier (already hardened to HRC 50-55)
2. Rough CBN milling (large stock removal, slow careful passes)
3. Semi-finish CBN (0.05 mm stock)
4. Finish CBN with sharper insert (better surface integrity)
5. EDM for sharp corners + inaccessible features (course-22 mod 4 wire EDM)
6. Polish (manual) if mirror finish required
7. Re-temper if any rework would change hardness

### P4: Precipitation-hardened stainless (17-4 PH, 13-8 PH)

These behave like medium-carbon steel BEFORE aging, like hardened tool steel AFTER aging:

**Machine BEFORE aging** (in solution-annealed state HB 200):
- Same as 4140 — carbide AlTiN, Vc=120-150 m/min
- Allow stock for 0.4% shrinkage during aging

**Machine AFTER aging** (HRC 35-45):
- Reduce Vc to 50% — Vc=60-80 m/min
- Use CBN for HRC>40 surfaces
- Watch for work hardening

## Coating selection for steels

| Coating | Best for | Mechanism |
|---------|----------|-----------|
| AlTiN / TiAlN | General-purpose steel cutting | High-T Al₂O₃ formation (course-32 mod 3) |
| TiCN | Mid-toughness, finishing | High hardness + adhesion-resistant |
| AlCrN | High-feed roughing | Thermal stability up to 1100°C |
| TiAlSiN | Hard milling (HRC 45-55) | Si content increases thermal limit |
| CBN | Hard turning (HRC>50) | Only material harder than the workpiece |

## Source citations

- Sandvik Coromant cutting data 2024 §5.2 (steels)
- Kennametal steel machining application guide 2024
- ASM Handbook Vol 16 §6.1 (steel machining)
- Trent + Wright 2000 §7 (steel-tool interactions)
- PRISM physics constants.ts (Kienzle kc1.1 values per ISO group P)`,
      },
      {
        type: "calculator" as ContentType,
        body: "Compute optimal Vc + fz for any steel given hardness + tool + coating. Calls speed_feed_calc with material spec.",
        config: {
          dispatcher: "data",
          action: "speed_feed_calc",
          examples: [
            { material: "4140_steel_HRC28", tool: "carbide_endmill_10mm_AlTiN", op: "2d_pocket" },
            { material: "1018_steel", tool: "carbide_endmill_10mm_AlTiN", op: "face_mill" },
            { material: "H13_HRC52", tool: "cbn_endmill_6mm", op: "finish" },
          ],
        },
      },
    ],
    quiz: [
      {
        id: "course-33-m1-q1",
        type: "multiple_choice",
        prompt: "Why is flood coolant mandatory for 4140 but MQL is acceptable for 1018?",
        options: [
          "4140 is cheaper",
          "4140 contains Cr + Mo alloying — these increase cutting-zone temperature → faster diffusion wear of tool. Flood coolant transports heat into chip via convection",
          "1018 is harder",
          "No physical reason; tradition only",
        ],
        correctIndex: 1,
        explanation: "Per Sandvik 2024 §5.2 + course-32 mod 3 (diffusion wear): 4140 contains 1% Cr + 0.2% Mo. These alloying elements raise the cutting-zone temperature at typical Vc, accelerating tool-substrate diffusion (W → chip, C → tool). Flood coolant routes heat into the chip via convection, keeping the cutting-zone T below the diffusion threshold. 1018 (no alloying) has lower cutting-zone T at the same Vc — MQL is sufficient.",
        topicTags: ["steels", "coolant_selection", "4140", "diffusion_wear"],
      },
    ],
    prismEngines: ["CurriculumEngine", "SpeedFeedOrchestratorEngine"],
    prismDispatcherActions: ["speed_feed_calc", "cutting_data_recommend", "material_get"],
  },

  {
    id: "course-33-m2",
    title: "Group M — Stainless Steels (303, 304, 316, 410, 416)",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# How to Cut Stainless Steels (ISO Group M)

## LAYMAN VERSION

Stainless steel is steel with chromium that resists rust. But that chromium also makes it HARDER TO CUT than regular steel:

1. **It work-hardens fast** — the surface gets harder as you cut, so the NEXT pass cuts a harder surface
2. **It conducts heat poorly** — heat stays at the cutting edge instead of leaving in the chip
3. **It's gummy** — tends to weld to the tool (BUE)
4. **It's stringy** — chips can wrap around the tool and break it

The fixes: use SHARP positive-rake tools, AVOID rubbing (always cut, never rub), use plenty of coolant, KEEP CUTTING (don't dwell — once you start a cut, finish it without stopping).

## ADVANCED VERSION

### M1: Austenitic stainless (303, 304, 316)

| Property | 304 | 316 |
|----------|-----|-----|
| Hardness | HB 170 | HB 180 |
| UTS | 580 MPa | 620 MPa |
| kc1.1 | 2300-2500 | 2500-2800 |
| Machinability rating | 45 | 36 |
| Thermal conductivity | 16 W/m·K (1/3 of steel) | 14 W/m·K |
| Work-hardening exponent (n) | 0.45 | 0.50 (higher = worse) |

**Recommended parameters (carbide AlTiN, Ø10 end mill, 304):**
- Vc: 100-140 m/min (Sandvik 2024 §5.3)
- fz: 0.04-0.08 mm/tooth (light — work hardening sensitive)
- ap: 0.5-1× tool D
- ae: 50% traditional; 8-12% HSM
- Coolant: flood mandatory (10-20× more flow than steel)
- Lead angle: 45° (chip thinning + heat-routing)

**Critical: minimum chip thickness rule:**
For 304/316, MINIMUM chip thickness (after chip thinning) must be ≥ 0.04 mm. Below this, the tool RUBS instead of cuts → work-hardens the surface → next pass hits harder surface → wear accelerates.

**Operation order rationale — 304 stainless valve body:**
1. Rough mill outside (heaviest cuts first; uses sharpest tools)
2. Rough drill all holes (drill into UN-work-hardened material)
3. Boring (ID work) — single-edge boring bar, sharp insert
4. Semi-finish outside (uniform stock = 0.1 mm)
5. Finish outside (climb, fresh tool)
6. Tap last (taps are most fragile)
7. Deburr (mandatory — stainless burrs are hazardous)

### M2: Martensitic stainless (410, 416, 420)

These can be hardened by quench like tool steel:
- Solution-annealed (HB 160): cut like 304
- Hardened (HRC 35-45): use CBN inserts; same approach as hardened steels

416 specifically has sulfur added for machinability — runs 30-40% faster than 304 in annealed state.

### M3: Duplex + super-duplex stainless (2205, 2507)

These have both austenite + ferrite phases. Even harder to cut than 304:
- Vc: 60-100 m/min (40% lower than 304)
- fz: 0.05-0.08 mm/tooth
- Tool wear: 2-3× faster than 304
- Coolant: high-pressure through-spindle preferred

## Why work-hardening matters mathematically

\`\`\`
Surface hardness after cut = bulk × (1 + n × ε_surface)

For 304 at typical cutting strain:
  bulk: HV 200
  surface: HV 200 × (1 + 0.45 × 0.6) = HV 254 (27% harder)
  affected depth: 50-200 μm

For 316 at same conditions:
  surface: HV 200 × (1 + 0.50 × 0.6) = HV 260 (30% harder)
\`\`\`

This means: if you re-cut the same surface (e.g., spring-pass or rework), force is 30% higher than the first cut.

## Surface integrity for stainless

Surface roughness target Ra 1.6 for general; Ra 0.8 for hydraulic seals; Ra 0.4 for medical implants.

**Compensation for work hardening:** plan for INCREMENTAL stock removal, not single big cuts. 0.3 → 0.1 → 0 mm depth schedule preserves surface integrity.

## Source citations

- Sandvik Coromant cutting data 2024 §5.3 (stainless)
- Iscar stainless machining application guide 2024
- ASM Handbook Vol 16 §6.2 (stainless machining)
- AIAG MSA 4th ed (medical implant surface integrity)`,
      },
    ],
    quiz: [
      {
        id: "course-33-m2-q1",
        type: "multiple_choice",
        prompt: "When milling 304 stainless, what is the MINIMUM allowable chip thickness (after chip thinning) and why?",
        options: [
          "0.001 mm (the smaller the better)",
          "0.04 mm — below this, tool rubs instead of cuts → work-hardens surface → next pass hits HV 254 (27% harder) → accelerated wear",
          "1.0 mm (must always be heavy cut)",
          "No minimum exists",
        ],
        correctIndex: 1,
        explanation: "Per Sandvik 2024 §5.3 + course-32 mod 3 (BUE + work hardening): 304 has work-hardening exponent n=0.45. Below 0.04 mm chip thickness, the cutting edge rubs the surface instead of forming a chip, plastically deforming + hardening the surface to HV 254 (27% above bulk HV 200). The NEXT pass then encounters this hardened surface, accelerating diffusion + abrasion wear. The minimum-chip rule is THE most-violated stainless-milling principle and cause of premature tool failure.",
        topicTags: ["stainless", "work_hardening", "minimum_chip_thickness", "rubbing"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["speed_feed_calc", "chip_thinning"],
  },

  {
    id: "course-33-m3",
    title: "Group N — Aluminum + Non-Ferrous (6061, 7075, brass, copper, magnesium)",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# How to Cut Aluminum + Non-Ferrous (ISO Group N)

## LAYMAN VERSION

Aluminum is the "easy" material — soft, conducts heat well, cuts fast. But it has its own quirks:

1. **Chip welding** — aluminum LOVES sticking to tools. Use polished or TiB₂-coated tools, NEVER AlTiN (the Al in the coating + workpiece weld together)
2. **High RPM ok** — aluminum tolerates Vc=300-500 m/min easily on HSM machines
3. **High feed ok** — fz can be 0.15-0.30 mm/tooth without issue
4. **Coolant or air** — flood works; MQL works; even dry works for many ops

Brass + copper are different: copper is gummy + work-hardens like stainless. Brass is the friendliest non-ferrous (almost as easy to cut as butter).

Magnesium is the dangerous one: fine chips can IGNITE. Never machine magnesium dry; flood coolant or specific cutting fluids only.

## ADVANCED VERSION

### N1: Aluminum alloys (6061, 7075, 2024)

| Property | 6061-T6 | 7075-T6 | 2024-T351 |
|----------|---------|---------|-----------|
| Hardness | HB 95 | HB 150 | HB 120 |
| UTS | 310 MPa | 570 MPa | 470 MPa |
| kc1.1 | 800-900 | 1000-1100 | 950 |
| Machinability rating | 360 (very high) | 220 | 280 |
| Thermal conductivity | 167 W/m·K | 130 | 140 |

**Recommended parameters (uncoated polished carbide or TiB₂, Ø10 end mill, 6061):**
- Vc: 300-500 m/min (with HSM machines); 200-300 m/min (general)
- fz: 0.15-0.30 mm/tooth (very aggressive)
- ap: 2× tool D for slot; 1× for general
- ae: 50% traditional; 8-12% HSM (less critical due to low force)
- Coolant: flood or MQL (flood for finish; MQL for rough at HSM speeds)

**Tool selection:**
- **Solid carbide end mill with 2-3 flutes** (low flute count = more chip clearance; aluminum chips are voluminous)
- **TiB₂ coating** (non-stick) or **polished uncoated** carbide
- **AVOID AlTiN/AlCrN** — aluminum welds to the Al-containing coating

**Operation order — 6061 housing:**
1. Face mill top (establish datum)
2. Drill holes (low force allows quick drilling)
3. Rough pocket (high stepover OK due to low force)
4. Finish pocket + contour (climb, fresh polished tool)
5. Tap last (aluminum taps easily; thread mill safer for blind holes)

### N2: Copper + brass

**Brass (C36000 free-machining):**
- Vc: 200-400 m/min
- fz: 0.10-0.20 mm/tooth
- Machinability rating: 100 (the B1112 reference)
- Uncoated carbide is fine; coatings add cost without benefit

**Copper (pure or C10100):**
- Vc: 120-250 m/min
- fz: 0.05-0.12 mm/tooth (lower than brass — copper is gummy)
- Use polished carbide; TiB₂ for chip-welding control
- Work-hardens like stainless — minimum chip thickness ≥ 0.04 mm

### N3: Magnesium (AZ31B, AZ91D)

**SAFETY CRITICAL** — fine magnesium chips ignite at ~500°C. Cutting-zone temps can reach this.

**Mandatory precautions:**
- NEVER dry machine — always flood coolant (water-soluble OK; oil-based PREFERRED)
- Sharp tools only (dull tool = more heat = ignition risk)
- Avoid feed rates that produce powder chips (use larger fz to produce ribbon chips)
- Have Class D fire extinguisher within 10 ft (regular ABC extinguishers ARE NOT EFFECTIVE on magnesium fires — they spread the fire)
- No water on magnesium fires — water + Mg = hydrogen explosion

**Recommended parameters (sharp carbide, AZ31B):**
- Vc: 200-400 m/min
- fz: 0.10-0.25 mm/tooth (large enough to produce ribbon chips, not powder)
- Coolant: oil-based or water-soluble (per OSHA + per JM Die safety protocol)

[per ASM Handbook Vol 2 + OSHA 29 CFR 1910.151(c) magnesium handling]

## Source citations

- Sandvik Coromant cutting data 2024 §5.4 (aluminum + non-ferrous)
- ASM Handbook Vol 2 (Properties + Selection: Nonferrous Alloys)
- OSHA 29 CFR 1910.151(c) (magnesium fire safety)
- NFPA 484 (Standard for Combustible Metals)
- Kennametal aluminum HSM application guide 2024`,
      },
    ],
    quiz: [
      {
        id: "course-33-m3-q1",
        type: "multiple_choice",
        prompt: "Why is AlTiN coating WRONG for cutting 6061 aluminum, despite being great for steel?",
        options: [
          "AlTiN is too expensive for aluminum",
          "The Al content in AlTiN coating + Al in workpiece + cutting-zone heat → chip-tool diffusion welding (aluminum welds to the AlTiN). Use TiB₂ or polished uncoated carbide instead",
          "AlTiN is too soft for aluminum",
          "No physical reason; AlTiN works fine",
        ],
        correctIndex: 1,
        explanation: "Per Kennametal aluminum HSM guide + course-32 mod 3 (diffusion wear): aluminum has high affinity for aluminum at cutting-zone temperatures. AlTiN coating (Aluminum-Titanium-Nitride) puts aluminum in CONTACT with aluminum workpiece — welding diffusion is rapid. Tool chips off the AlTiN, then the exposed substrate also welds. Use TiB₂ (Titanium-Diboride, non-stick chemistry) or polished uncoated carbide for aluminum. AlTiN is GREAT for steel (forms Al₂O₃ oxidation barrier) but WRONG for aluminum.",
        topicTags: ["aluminum", "coating_selection", "altin", "tib2"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["coating_search", "material_get"],
  },

  {
    id: "course-33-m4",
    title: "Group S — Superalloys (Ti-6Al-4V, Inconel 625/718, Hastelloy)",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# How to Cut Superalloys (ISO Group S)

## LAYMAN VERSION

Superalloys (titanium + nickel-based) are the hardest materials in common production use. They:

1. **Retain strength at high temperature** (good for jet engines, bad for cutting tools)
2. **Work-harden aggressively** (worse than stainless)
3. **Diffuse into tools** (titanium with W carbide, nickel with carbide binder)
4. **Conduct heat very poorly** (almost no heat leaves in chip — most goes into tool)

The result: cutting speeds are SLOW (titanium 30-90 m/min vs steel 150-200), tools wear FAST (life measured in minutes, not hours), and the cost per cubic inch removed is 10-50× higher than steel.

But these materials are mandatory for jet engines, gas turbines, medical implants — so we machine them carefully.

## ADVANCED VERSION

### S1: Titanium alloys (Ti-6Al-4V most common, also Ti-CP, Ti-5553)

| Property | Ti-6Al-4V | Ti-CP grade 2 |
|----------|-----------|---------------|
| Hardness | HB 320 | HB 200 |
| UTS | 950 MPa | 345 MPa |
| kc1.1 | 1900-2200 | 1500-1700 |
| Thermal conductivity | 7 W/m·K (VERY low) | 17 W/m·K |
| Diffusion partner | W carbide (worst) | W carbide |

**Recommended parameters (Ti-6Al-4V, ZrN-coated carbide Ø10 end mill):**
- Vc: 50-90 m/min (Sandvik 2024 §5.5)
- fz: 0.06-0.12 mm/tooth (relatively high — chip routing thermal)
- ap: 0.5-1× tool D (light)
- ae: 30-50% (HSM-like; high engagement risks chatter due to low E modulus)
- Coolant: high-pressure through-spindle MANDATORY (heat extraction)

**Why ZrN > AlTiN for titanium:**
- AlTiN has Aluminum, which has higher affinity for Ti than Zr does
- ZrN coating creates a Zr-N barrier that titanium doesn't readily diffuse into
- CrN is the alternative; same low-diffusion principle

**Critical Ti rules:**
- **No dwelling** — once you start a cut, finish it (Ti work-hardens during dwell)
- **No rubbing** — minimum chip thickness ≥ 0.05 mm
- **Sharp tools only** — Ti gets harder near a dull cutting edge; vicious cycle
- **No air machining** — needs through-spindle coolant or large flood volume

### S2: Nickel-based (Inconel 625, 718, 750)

| Property | Inconel 625 | Inconel 718 |
|----------|-------------|-------------|
| Hardness | HB 240 | HB 360 (aged) |
| UTS | 760 MPa (annealed) | 1240 MPa (aged) |
| kc1.1 | 2800-3200 | 3000-3500 |
| Diffusion partner | W carbide |  |
| γ' precipitation | n/a | yes (the precipitation-hardening mechanism) |

**Recommended parameters (Inconel 718 aged, ceramic SiAlON insert):**
- Vc: 200-400 m/min (with ceramic; carbide is 25-50)
- fz: 0.05-0.10 mm/tooth
- ap: 0.5-1× tool D
- ae: 30-50%
- Coolant: through-spindle high-pressure OR dry (with ceramic; thermal shock risk with ceramic + flood)

**Why ceramic outperforms carbide on Inconel:**
- Inconel diffuses into W carbide at ~700°C
- Ceramic (Al₂O₃-TiC or SiAlON) doesn't have W → no diffusion
- Ceramics tolerate higher T (no diffusion ceiling) so you can run much higher Vc

**Operation order — Inconel 718 turbine disk:**
1. Solution-anneal blank (soft state, HB 240) — most material removal here
2. Carbide turning/milling at Vc=40 m/min for bulk shaping
3. Heat treat — age to γ' precipitation (HRC 35-45)
4. Ceramic finishing at Vc=300 m/min — finish features
5. Surface integrity verification (white layer < 5 μm — course-32 mod 4)
6. Polish/sand blast specific surfaces (FAA + EASA spec)
7. NDT inspection (X-ray + dye penetrant — γ' microcracks are critical-defect)

### S3: Other superalloys (Hastelloy C-276, MP35N, Stellite, Monel)

Each has a different diffusion partner profile. General rule: when in doubt, use ceramic + high Vc, or CBN if available.

## Source citations

- Sandvik Coromant cutting data 2024 §5.5 (superalloys)
- Reed 2008 "The Superalloys: Fundamentals and Applications"
- ASM Handbook Vol 16 §6.4 (superalloy machining)
- Trent + Wright 2000 §10 (diffusion wear in superalloy)
- NADCAP AC7110/14 (superalloy machining qualification)`,
      },
    ],
    quiz: [
      {
        id: "course-33-m4-q1",
        type: "multiple_choice",
        prompt: "Why does ceramic (Al₂O₃-TiC or SiAlON) outperform tungsten-carbide tools on Inconel 718?",
        options: [
          "Ceramic is cheaper",
          "Inconel diffuses into W carbide at ~700°C. Ceramic has no W → no diffusion → can run at much higher Vc (200-400 m/min vs 25-50 for carbide)",
          "Ceramic is harder than Inconel",
          "Tradition; no physical reason",
        ],
        correctIndex: 1,
        explanation: "Per Reed 2008 'The Superalloys' + course-32 mod 3 (diffusion wear): Inconel + W carbide has rapid diffusion wear above ~700°C. Ceramic inserts (Al₂O₃-TiC + SiAlON) contain no tungsten — diffusion path doesn't exist, so tool wear stays low even at high Vc. The ceiling moves from diffusion-limited (carbide ~50 m/min) to oxidation/thermal-shock-limited (ceramic ~400 m/min). 6-8× higher Vc enables practical production rates for jet-engine + gas-turbine parts.",
        topicTags: ["superalloys", "ceramic_tooling", "inconel", "diffusion_wear"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["material_get", "tool_select_recommend"],
  },

  {
    id: "course-33-m5",
    title: "Group K + H — Cast Iron + Hardened/Bearing Materials",
    order: 4,
    content: [
      {
        type: "text" as ContentType,
        body: `# How to Cut Cast Iron + Hardened Materials

## LAYMAN VERSION

**Cast iron** is the easiest material to machine in some ways — chips break apart naturally (no curly stringy chips), no work hardening, low cost. But it's ABRASIVE (silicon carbide particles in the iron matrix wear tools). And gray cast iron releases SiO₂ DUST which is a respiratory hazard.

**Hardened materials** (HRC>45) require specialty tools (CBN, ceramic) and a completely different cutting regime — light cuts, no coolant (thermal shock).

## ADVANCED VERSION

### K1: Gray cast iron (A48-30, A48-35, A48-40)

| Property | A48-30 | A48-40 |
|----------|--------|--------|
| Hardness | HB 180 | HB 220 |
| UTS | 207 MPa | 276 MPa |
| kc1.1 | 1100-1300 | 1300-1500 |
| Machinability rating | 100-120 |  |

**Recommended parameters (uncoated K10 carbide, Ø10 end mill):**
- Vc: 150-250 m/min (Sandvik 2024 §5.6)
- fz: 0.10-0.20 mm/tooth
- ap: 1-2× tool D (chips break naturally; can run hot)
- ae: 50-70%
- Coolant: DRY (cast iron generates SiO₂ dust + cools naturally; coolant + dust = abrasive paste)
- Respiratory: N95 + dust extraction MANDATORY

**Why dry cutting cast iron:**
- Iron + silicon carbide chips break into fine particles
- Dust + water/coolant = abrasive paste that wears machine ways and ballscrews
- Dust alone is captured by extraction; mixed with coolant it isn't
- Per OSHA crystalline silica rule + ACGIH TLV 0.025 mg/m³ — extraction REQUIRED

### K2: Ductile (nodular) cast iron (60-40-18, 80-55-06)

Spheroidal graphite particles vs gray's flake particles. Better strength + ductility:

- Vc: 100-180 m/min
- fz: 0.08-0.15 mm/tooth
- Coolant: dry OR MQL (less abrasive than gray)

### K3: Compacted graphite iron (CGI)

Modern automotive material (engine blocks). Between gray + ductile:
- Vc: 80-140 m/min
- Tool life is the challenge — wears 2-3× faster than gray

### H: Hardened materials (steel HRC>45, hardened die steel, hard chrome plating)

This is the same regime as course-33 mod 1 P3 (hardened tool steels). Key points:

- **CBN preferred** — only material harder than the workpiece
- **Ceramic OK** for steel HRC 45-55; not for HRC>55
- **NO coolant** — thermal shock cracks ceramic + CBN
- **Light cuts** — ap < 0.5 mm
- **Sharp positive-rake inserts** when possible (chamfered edge OK for CBN)

**Hard-turning vs grinding decision:**
- Hard turning (CBN insert on a lathe at Vc=120-180): faster than grinding for ID/OD work
- Grinding still wins for: Ra < 0.4, dimensional accuracy < 5 μm, complex geometry
- Hard turning typically achieves Ra 0.4-1.6, ±10 μm

Hard turning replaced grinding for ~30% of operations in modern auto manufacturing (course-22 grinder discussion).

## Source citations

- Sandvik Coromant cutting data 2024 §5.6 (cast iron) + §5.7 (hardened)
- ASM Handbook Vol 16 §6.5 (cast iron machining)
- OSHA 29 CFR 1910.1053 (crystalline silica)
- ACGIH TLV manual 2024 (respiratory limits)
- Trent + Wright 2000 §11 (hard machining)
- AMT 2023 Best Practices (hard turning vs grinding economics)`,
      },
    ],
    quiz: [
      {
        id: "course-33-m5-q1",
        type: "multiple_choice",
        prompt: "Why is gray cast iron machined DRY (not flood coolant)?",
        options: [
          "Coolant is too expensive",
          "Dust + coolant = abrasive paste that wears machine ways/ballscrews. Plus iron chips break naturally (no thermal management needed). Mandatory: N95 + dust extraction per OSHA crystalline silica rule",
          "Cast iron rusts when wet",
          "No physical reason",
        ],
        correctIndex: 1,
        explanation: "Per Sandvik 2024 §5.6 + OSHA 29 CFR 1910.1053: gray cast iron generates SiC particles + crystalline silica dust. Dry, this dust is captured by extraction. Mixed with coolant, it becomes an abrasive paste that wears machine ways + ballscrews (and is exempt from extraction systems). Cast iron also breaks chips naturally — no thermal management need for cutting-zone cooling. OSHA respirable crystalline silica TLV (0.025 mg/m³) requires N95 + extraction regardless.",
        topicTags: ["cast_iron", "dry_machining", "dust_safety", "osha_silica"],
      },
    ],
    prismEngines: ["CurriculumEngine"],
    prismDispatcherActions: ["material_get", "coolant_recommend"],
  },

  {
    id: "course-33-m6",
    title: "Operation Order — Why We Do Things In Certain Order",
    order: 5,
    content: [
      {
        type: "text" as ContentType,
        body: `# Why Operation Order Matters

## LAYMAN VERSION

The order you do machining operations is not arbitrary — it follows physics + economics rules:

1. **Heavy cuts before light cuts** — heavy cuts deflect things; if you finished first, the part would deflect during roughing and lose accuracy
2. **Roughing tools before finishing tools** — finishing tools are expensive + fragile; expose them to material AFTER bulk is gone
3. **Drill holes before milling pockets** — drilling has low side force; pocketing has high side force that can move the part
4. **Heat-generating ops together** — group hot ops so the part thermally equilibrates between groups
5. **Inspection between operations if critical** — measure before next op affects what you measured
6. **Soft jaws / fixtures before final clamping** — workholding marks should be where they don't matter

## ADVANCED VERSION

### Universal operation-order rules

**Rule 1: Datum-first**
- The first features machined define the WORK COORDINATE SYSTEM
- All subsequent features reference back to these
- Typical: face mill top → drill datum holes → use datum holes for second-op fixturing

**Rule 2: Heavy-removal before precision**
- Bulk material removal creates THERMAL TRANSIENTS + RESIDUAL STRESS RELEASE
- Both move the part dimensionally
- Order: rough → semi-finish → STRESS RELIEF (anneal/age if applicable) → finish

**Rule 3: Stable workholding before complex geometry**
- Mill the FLAT SIDES first (for vise) or DATUM HOLES (for fixture pins)
- Complex 5-axis surfaces require those flats/holes to fixture properly

**Rule 4: Inside-out for nested features**
- Drill the hole FIRST, then mill the boss around it
- This way the boss provides material support during drilling
- Reverse order: drill into nothing-but-air, drill walks, hole is crooked

**Rule 5: Coolant-compatible ops grouped**
- Flood coolant ops together (steel turning, drilling, milling)
- Dry ops together (cast iron, certain hard turning)
- Don't switch coolant mid-job (mess; spindle bearings need re-purge)

### JM Die canonical operation-order template (mill side)

For a typical 4140 prismatic part:

\`\`\`
SETUP 1 (vise, datum flat):
  1. Face mill top (datum Z)
  2. Drill datum holes (for 2nd-op fixture pins)
  3. Drill all required holes (low force)
  4. Rough pocket (heavy cuts; high force)
  5. Semi-finish pocket (uniform 0.1 mm stock)
  6. Contour outside (rough first if heavy stock)
  7. Probe critical features (CMM-style verification at machine)

SETUP 2 (fixture pins into datum holes from setup 1):
  8. Face mill bottom (now datum is flat-top from setup 1)
  9. Drill features on second side
  10. Rough + finish features on second side
  11. Tap (last — fragile)
  12. Deburr + chamfer (workhardened material removed; clean edges)
  13. Final inspection (CMM, thermal-stabilized)
\`\`\`

### JM Die canonical operation-order template (lathe side)

For a 4140 shaft:

\`\`\`
SETUP 1 (chuck + tailstock):
  1. Face (Z datum)
  2. Center drill (for tailstock support)
  3. Rough OD via G71/G72 (CSS = G96, max RPM clamped via G50)
  4. Drill main bore (if applicable, via G83 peck)
  5. Heat treat (if specified — remove from machine, quench/temper)
  6. Re-fixture with previous datum face
  7. Finish OD via G70 (with springback comp)
  8. Threading via G76
  9. Inspect (thermal compensation for cold check)

SETUP 2 (parting + second side, OR sub-spindle pickoff):
  10. Part off OR transfer to sub-spindle
  11. Face opposite end
  12. Finish second-side features
  13. Final inspection
\`\`\`

### Why the order matters — quantified examples

**Bad order example 1:** Finish first, then drill.
- Finish surface is now Ra 0.4
- Drilling vibrates the part, causes finish marks/witness
- Final Ra: 1.6+ (failed spec)

**Bad order example 2:** Tap before bulk roughing.
- Tap into pre-machined hole at full ap
- Roughing later vibrates the part, breaks the tap-formed thread crest
- Re-tap required → 50% scrap rate

**Bad order example 3:** Setup 2 before stress relief.
- Heavy roughing in setup 1 created residual stress
- Setup 2 re-fixtures without stress relief
- Part bows during setup 2 cutting; final dimension wrong by 0.05-0.2 mm

### When to deviate from canonical order

| Situation | Deviation | Why |
|-----------|-----------|-----|
| Tight tolerance + thermal sensitivity | Insert thermal stabilization (let part cool 10-30 min) between rough + finish | Avoids thermal-distortion-locked-in |
| Long-shaft turning | Use tailstock through whole job; never remove | Tailstock + cold-zero matter |
| Hard-machined part | Skip semi-finish; rough directly to finish stock | Hard machining is expensive; minimize passes |
| Aerospace + medical | INSERT CMM-style probe verification between every critical op | Trust-but-verify per AS9100 |
| Family-of-parts production | Group all setup-1 ops, then all setup-2 ops, NOT one-at-a-time | Reduces setup changeovers (course-21 mod 4 SMED) |

## Source citations

- Boothroyd + Knight 2006 "Fundamentals of Machining and Machine Tools" §3 (process planning)
- Sandvik Coromant operation planning guide 2024
- AMT 2023 Best Practices (operation-order optimization)
- AS9100D + ISO 13485 (process control + inspection points)
- JM Die operational manual 2024 (canonical order templates)

## Closing — the 87+ modules now cover the full /goal axis

After courses 18-33 (16 courses, 93 modules), the PRISM Academy has documented:
- ✅ All 23 priority CAM systems entry-level
- ✅ Function index for every CAM
- ✅ Dual-level LAYMAN + ADVANCED pedagogy (course-29 template)
- ✅ Complete toolpath catalog + per-input effects + programming paradigms
- ✅ ~1000+ cross-system Rosetta Stone mappings
- ✅ Math/science deep-dive (Merchant + Komanduri + 5 wear mechanisms + Brammertz + Gilbert)
- ✅ Material atlas (P + M + N + S + K + H — ALL 6 ISO groups)
- ✅ Operation-order rationale + canonical mill + lathe templates`,
      },
    ],
    quiz: [
      {
        id: "course-33-m6-q1",
        type: "multiple_choice",
        prompt: "Why must heat treatment go between rough OD and finish OD on a 4140 shaft, NOT after finishing?",
        options: [
          "Heat treatment is optional anyway",
          "Heat treatment causes 0.2-0.5% volumetric distortion (course-24 mod 3 springback context). Doing it AFTER finish would distort the finished dimension; doing it BETWEEN rough + finish allows the finish pass to correct for distortion",
          "Order doesn't matter",
          "Heat treatment is faster after finishing",
        ],
        correctIndex: 1,
        explanation: "Per Sandvik 2024 + AMT 2023: heat treatment causes 0.2-0.5% volumetric distortion + thermal residual stress release. Finishing after heat treatment lets the finish pass correct for this distortion. Heat treatment AFTER finishing would lock in distortion. This is THE rule for hardenable steels — and the same logic applies to aging (precipitation-hardening) of 17-4 PH (course-33 mod 1 P4) and Inconel 718 (course-33 mod 4 S2).",
        topicTags: ["operation_order", "heat_treatment", "distortion", "4140"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ProcessPlanningEngine"],
    prismDispatcherActions: ["process_plan_generate", "process_plan_optimize"],
  },
];

export const COURSE_33_MODULES: Module[] = modules;
