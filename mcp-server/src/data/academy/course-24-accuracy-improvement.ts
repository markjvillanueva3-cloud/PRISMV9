/**
 * Course 24 — Accuracy Improvement Per Machine Class
 *
 * Closes the /goal axis: "how to improve accuracy". Maps the 4 dominant accuracy-loss
 * pathways (geometric, thermal, dynamic, process) to specific compensation strategies
 * for mill / lathe / wire EDM / grinder.
 *
 * 4 modules, ~5 hours, advanced tier, prereq=course-21 (continuous improvement).
 * Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-24-m1",
    title: "Machine Accuracy Fundamentals — ISO 230 + Ballbar + Thermal",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# Machine Accuracy — the 4 error pathways

**Learning objective:** Decompose any dimensional error into its causal pathway + select the right compensation.
**Why this matters:** A machine with 0.025 mm position error can hit ±0.005 mm features IF you correctly identify and compensate the dominant pathway. Doing the wrong compensation makes things worse.

## The 4 accuracy-loss pathways

| Pathway | Source | Typical magnitude | Compensation |
|---------|--------|-------------------|--------------|
| **Geometric** | Machine kinematic errors (squareness, parallelism, ballscrew pitch) | 5-25 μm | ISO 230-1 calibration + ballscrew compensation tables |
| **Thermal** | Spindle warm-up, environment temp, coolant temp shifts | 10-50 μm | ISO 230-3:2007 thermal compensation, warm-up cycle |
| **Dynamic** | Servo following error, acceleration/deceleration mismatch | 5-20 μm | Loop gain tuning, S-curve acceleration |
| **Process** | Tool deflection, workholding deflection, springback | 5-100+ μm | Force model + finish-pass strategy |

[per ISO 230-1:2012, ISO 230-2:2014, ISO 230-3:2007, ISO 230-4:2005]

## ISO 230 series — what each part covers

| Standard | What |
|----------|------|
| **ISO 230-1:2012** | Geometric accuracy of machine tools — straightness, squareness, parallelism |
| **ISO 230-2:2014** | Positioning accuracy and repeatability (laser interferometer test) |
| **ISO 230-3:2007** | Thermal effects (spindle warm-up curve, environmental temp variation) |
| **ISO 230-4:2005** | Circular tests (ballbar test — measures multi-axis geometric errors in <30 min) |
| **ISO 230-6:2002** | Diagonal positioning (cross-axis interaction errors) |
| **ISO 230-7:2015** | Spindle axis tests (radial + axial runout, thermal drift) |

[per ISO 230 series 2002-2015]

## The ballbar test (ISO 230-4) — 30-minute machine health check

The ballbar test runs a circular interpolation while measuring deviation from perfect circularity. Pattern detection identifies specific errors:

| Ballbar pattern | Likely cause |
|-----------------|--------------|
| **Oval (squashed)** | Axis squareness error |
| **Lobed (3-lobe)** | Backlash on one or both axes |
| **Spiked at quadrants** | Reversal spike from servo overshoot |
| **Off-center** | Origin shift from previous test (ignore — re-zero) |
| **Spiral** | Lost-step or encoder drift |

\`\`\`
prism_safety acc_ball_bar --machine_id=HAAS_VF2 --radius_mm=100
# Returns: pattern classification + estimated error per pathway
\`\`\`

[per Renishaw QC20-W ballbar user guide 2023 + ISO 230-4:2005]

## Thermal compensation — the 60-80% rule

Per ISO 230-3:2007 research: 60-80% of all geometric drift on uncompensated machines is THERMAL. This means thermal compensation is the highest-leverage accuracy investment.

JM Die's HAAS VF-2 thermal compensation cycle:

1. Power on → 30-minute warm-up program (G65 P9001 macro)
2. Run probe cycle at 30 min to capture reference position
3. Re-probe every 4 operating hours
4. Apply thermal offset to G54 work coord

This protocol reduces thermal drift from 25-40 μm to 5-8 μm — a 4-5× accuracy improvement at $0 hardware cost.

\`\`\`
prism_calc thermal_compensation_model --machine_id=HAAS_VF2
prism_safety acc_thermal_error --machine_id=HAAS_VF2 --warmup_minutes=30
\`\`\`

[per ISO 230-3:2007 + JM Die thermal-comp protocol 2024-2026]

## Volumetric error compensation

For 5-axis + high-precision machines, ISO 230-1 errors compose into volumetric error:

\`\`\`
prism_safety acc_volumetric --machine_id=Mori_NTX_1000 --x_mm=200 --y_mm=150 --z_mm=80
# Returns: total volumetric error at that point, decomposed by source
\`\`\`

Modern controllers (Fanuc, Siemens, Mazak) support inverse compensation — feed the error map into the controller and it adjusts toolpath positions in real-time.

[per Siemens 840D volumetric compensation manual + Fanuc 31i-MB option K6]`,
      },
    ],
    quiz: [
      {
        id: "course-24-m1-q1",
        type: "multiple_choice",
        prompt: "Per ISO 230-3:2007 research, what percentage of geometric drift on uncompensated machines is THERMAL?",
        options: ["10-20%", "30-40%", "60-80%", "95-100%"],
        correctIndex: 2,
        explanation: "Per ISO 230-3:2007: 60-80% of geometric drift on uncompensated machines is thermal in origin (spindle heat-up, environmental temp variation, coolant temp shifts). This is why thermal compensation is the single highest-leverage accuracy investment — typically 4-5× improvement at $0 hardware cost.",
        topicTags: ["accuracy", "thermal_compensation", "iso_230_3"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ThermalCompensationEngine", "AccuracyEngine"],
    prismDispatcherActions: ["acc_ball_bar", "acc_thermal_error", "acc_volumetric", "thermal_compensation_model"],
  },

  {
    id: "course-24-m2",
    title: "Mill Accuracy — Geometric Comp + RTCP + Head Clearance",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Improving Mill Accuracy

## The 3-axis mill accuracy stack

A 3-axis VMC accuracy stack (from machine to feature):

\`\`\`
Feature accuracy = machine_positioning_error
                 ⊕ thermal_drift
                 ⊕ workholding_deflection
                 ⊕ tool_deflection
                 ⊕ tool_runout
                 ⊕ measurement_uncertainty
\`\`\`

(⊕ = RSS — root-sum-square for independent errors)

**JM Die HAAS VF-2 typical stack (2026 measured):**
- Positioning: ±8 μm
- Thermal (after warm-up + comp): ±5 μm
- Workholding (vise + parallels): ±3 μm
- Tool deflection (Ø10 end mill, 30 mm overhang, 200 N force): ±12 μm
- Tool runout (TG25 collet, balanced): ±4 μm
- Measurement (CMM): ±2 μm
- **RSS total**: ±16 μm

This means JM's VF-2 can reliably hold ±20 μm features after thermal comp. Tighter than that requires reducing tool deflection (shorter L/D ratio) or switching to a higher-accuracy machine.

[per JM Die machine certification records + ISO 230-2:2014 calibration]

## RTCP (Rotational Tool Center Point) on 5-axis

For 5-axis simultaneous machining, the tool tip position depends on rotary axis positions. Without RTCP compensation, every degree of rotary movement introduces position error.

**Without RTCP**: at 30° tilt + 100 mm pivot length, untilted offset = 100 × sin(30°) = 50 mm — uncompensated, the tool tip is 50 mm away from where you commanded.

**With RTCP** (Fanuc G43.4 / Siemens TRAORI / Heidenhain M128): the controller compensates in real-time. Programmed point IS the tool tip position.

\`\`\`
prism_calc rtcp_compensation_calculate --machine_id=Mori_NTX_1000 --pivot_length_mm=100
\`\`\`

[per Fanuc 5-axis Programming Manual B-63534EN/03 + Siemens 840D Cycle Programming 2024]

## Tool runout — the silent accuracy killer

Tool runout (TIR) directly translates to dimensional error:

| TIR | Diameter error |
|-----|----------------|
| 5 μm (excellent — Haimer Power Clamp shrink-fit) | ±2.5 μm |
| 10 μm (good — TG25 collet, balanced) | ±5 μm |
| 20 μm (average — ER32 collet, unbalanced) | ±10 μm |
| 50 μm (poor — worn collet or holder) | ±25 μm |

**Measure runout EVERY tool change.** A dial indicator + magnetic base + 30 seconds catches most issues.

\`\`\`
prism_safety spindle_runout_calculate --machine_id=HAAS_VF2 --holder=TG25 --balance_grade=G2.5
\`\`\`

[per ISO 1940-1 balance grade + Haimer Power Clamp 2024 spec]

## Toolholder selection for accuracy

| Holder | TIR (typical) | Best for | Cost |
|--------|---------------|----------|------|
| Haimer Power Clamp shrink-fit | 3 μm | Precision finishing, high-balance HSM | $$$$ |
| Big Daishowa hydraulic | 3-5 μm | High-rigidity finishing | $$$ |
| TG25 ER-style collet | 8-12 μm | General-purpose | $$ |
| Side-lock end mill holder | 10-25 μm | Heavy roughing only | $ |

For tight-tolerance features, invest in Haimer or BIG hydraulic. The marginal cost ($400-800 per holder) pays back in scrap reduction within 30 days for any shop running ±10 μm tolerances.

[per JM Die toolholder protocol + AMT 2023 holder benchmarks]`,
      },
    ],
    quiz: [
      {
        id: "course-24-m2-q1",
        type: "multiple_choice",
        prompt: "On JM Die's HAAS VF-2 with RSS-stack total ±16 μm, what is the dominant contributor to total error?",
        options: [
          "Machine positioning (±8 μm)",
          "Tool deflection (±12 μm for Ø10 endmill, 30 mm overhang, 200 N force)",
          "Thermal drift after comp (±5 μm)",
          "Measurement uncertainty (±2 μm)",
        ],
        correctIndex: 1,
        explanation: "Per JM Die machine certification 2026: tool deflection is the dominant error contributor at ±12 μm. This means the highest-leverage accuracy improvement is reducing tool L/D ratio (shorter overhang) or reducing cutting force (lighter pass). Better than throwing money at a more-accurate machine.",
        topicTags: ["mill_accuracy", "tool_deflection", "rss_stack"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ToolDeflectionEngine", "SpindleRunoutEngine", "RtcpCompensationEngine"],
    prismDispatcherActions: ["rtcp_compensation_calculate", "spindle_runout_calculate", "tool_deflection_predict"],
  },

  {
    id: "course-24-m3",
    title: "Lathe Accuracy — Springback + Taper + Tool Offset Wear",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# Improving Lathe Accuracy

## The lathe accuracy stack (different from mill)

Lathe accuracy errors compose differently:

\`\`\`
Diameter accuracy = X-axis_positioning_error
                  ⊕ Z-axis_positioning_error (affects taper, not diameter directly)
                  ⊕ insert_nose_radius_compensation_error
                  ⊕ tool_wear_progression
                  ⊕ workpiece_deflection (long parts, slender shafts)
                  ⊕ springback (material elastic recovery after cut)
                  ⊕ thermal_drift
\`\`\`

**JM Die ST-30 (lathe) typical stack:**
- X positioning: ±5 μm
- Tool offset (insert wear progression): ±15 μm over 200 parts
- Workpiece deflection (Ø25 × 200 mm shaft, single-end held): ±20 μm
- Springback (1045 steel finish cut): ±5 μm
- Thermal: ±8 μm after warm-up
- **RSS**: ±27 μm in diameter

[per JM Die ST-30 calibration 2026 + Sandvik Coromant lathe handbook 2024]

## Springback — the elastic recovery problem

When you cut material, the cutter pushes it elastically. After cut, the material springs back, leaving the part slightly larger than the programmed diameter:

\`\`\`
springback_mm = (cutting_force / material_E_modulus) × workpiece_length_mm × geometry_factor
\`\`\`

Approximate values for common materials:

| Material | Springback (typical finish cut) |
|----------|--------------------------------|
| 1018 mild steel | 2-5 μm |
| 4140 alloy | 3-8 μm |
| 17-4 PH stainless | 5-12 μm |
| Ti-6Al-4V titanium | 10-25 μm (much higher elastic modulus contribution) |
| Inconel 718 | 15-30 μm |

\`\`\`
prism_calc springback_predict --material=4140 --tool_force_N=180 --workpiece_length_mm=200
\`\`\`

**Compensation**: undersize the finish pass by the predicted springback. Most CAM systems (Mastercam, Esprit) have a springback offset parameter — populate it from PRISM.

[per Sandvik Coromant turning handbook 2024 §3.5 + ASM Handbook Vol 16 Machining]

## Taper error budget on long shafts

For long shafts, even perfect X-axis accuracy yields a taper from:
- Headstock thermal growth (warm-up effect on chuck centerline)
- Tailstock alignment drift
- Workpiece thermal expansion during cut

**JM Die taper protocol for Ø25 × 600 mm shafts:**
- After warm-up: ±10 μm taper (cold start: ±35 μm)
- Re-measure every 50 parts
- Re-align tailstock every 200 parts or whenever taper exceeds spec

\`\`\`
prism_calc lathe_taper_error_budget --machine_id=ST_30 --shaft_length_mm=600 --warmup_min=30
\`\`\`

[per JM Die lathe protocol + Sandvik Coromant shaft turning guide 2024]

## Tool wear progression — the linear-drift offset

Insert wear progresses linearly until it accelerates (Taylor's equation breakdown):

\`\`\`
diameter_drift_per_part = (insert_wear_per_part) × 2
                        = (linear_wear_rate_mm/min × cycle_time_min_per_part) × 2
\`\`\`

For CNMG 120408 in 4140 at Vc=200 m/min, fn=0.25 mm/rev:
- Linear wear rate: ~0.02 mm/15 min cutting time
- Cycle time per part: 3 min
- Diameter drift per part: ~0.008 mm (= 8 μm)
- After 50 parts: 0.4 mm drift (BLOWS THE TOLERANCE)

**Compensation**: probe every 20 parts (Renishaw + macro) → apply tool offset:

\`\`\`
prism_calc tool_offset_wear --insert_id=cnmg_120408_pm --material=4140 --parts_cut=20
prism_calc turning_offset_probe --machine_id=ST_30 --probe_cycle=O8800
\`\`\`

[per Sandvik Coromant tool life methodology + Renishaw OMV programming guide 2024]`,
      },
    ],
    quiz: [
      {
        id: "course-24-m3-q1",
        type: "multiple_choice",
        prompt: "When turning Ti-6Al-4V titanium, what is the typical springback magnitude on a finish cut?",
        options: ["1-3 μm", "5-10 μm", "10-25 μm", "100-200 μm"],
        correctIndex: 2,
        explanation: "Per Sandvik Coromant turning handbook 2024 + ASM Handbook Vol 16: Ti-6Al-4V springs back 10-25 μm on finish cuts due to its lower elastic modulus relative to cutting force. Compensate by undersizing the finish pass — most CAM systems have a springback offset parameter that PRISM springback_predict can populate.",
        topicTags: ["lathe_accuracy", "springback", "titanium"],
      },
    ],
    prismEngines: ["CurriculumEngine", "SpringbackPredictionEngine", "ToolWearProgressionEngine"],
    prismDispatcherActions: ["springback_predict", "lathe_taper_error_budget", "tool_offset_wear", "turning_offset_probe"],
  },

  {
    id: "course-24-m4",
    title: "Wire EDM + Grinder Accuracy — Corner Radius + Taper Error",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# Wire EDM + Grinder Accuracy

## Wire EDM — the 4 accuracy sources

Wire EDM achieves ±2-5 μm precision but each accuracy source matters:

| Source | Magnitude | Compensation |
|--------|-----------|--------------|
| Wire diameter variation | ±5 μm (Brass wire ±2 μm; coated wire ±5 μm) | Offset table per wire type + age |
| Spark gap (overburn) | 30-80 μm per pass | Multi-pass strategy: rough → semi-finish → finish |
| Wire deflection (vertical sag) | 5-30 μm depending on flush, tension, height | Higher tension + better flush; verify via test cut |
| Thermal recast layer | 5-15 μm of altered material | Trim passes remove recast; specify in skim passes |

[per WEDM precision handbook + ISO 28080 wire EDM tolerance]

## Multi-pass strategy for sub-±5 μm

JM Die multi-pass protocol for tight-tolerance wire EDM:

| Pass | Type | Offset | Cycle time | Surface finish |
|------|------|--------|------------|----------------|
| 1 | Rough | +200 μm | 100% | Ra 3.2 |
| 2 | Semi-finish | +50 μm | 25% | Ra 1.6 |
| 3 | Finish | +15 μm | 12% | Ra 0.8 |
| 4 | Skim | +5 μm | 8% | Ra 0.4 |
| 5 | Final skim | 0 μm | 5% | Ra 0.2 |

5-pass total cycle time ≈ 150% of single-pass roughing time but yields ±2-3 μm accuracy.

\`\`\`
prism_edm wedm_plan_passes --feature_tolerance_um=5 --material=A2_tool_steel
\`\`\`

[per JM Die WEDM multi-pass protocol + Sodick AG/AQ programming guide 2024]

## Corner radius accuracy — wire deflection physics

At a corner, the wire wants to take a shortcut (chord) but the program follows the corner radius. The deflection limits achievable corner radius:

\`\`\`
min_corner_radius_mm = wire_diameter_mm / 2 + spark_gap_um/1000 + wire_deflection_mm
\`\`\`

For 0.25 mm wire + 50 μm gap + 10 μm deflection: min corner radius = 0.135 mm.

Trying to cut a 0.05 mm corner with 0.25 mm wire? Impossible — choose smaller wire (0.07 mm) or accept the larger natural radius.

\`\`\`
prism_edm wedm_calculate_corners --wire_diameter_mm=0.25 --feature_corner_um=50
\`\`\`

[per WEDM corner geometry handbook + Sodick application notes 2024]

## Grinder accuracy — the 3-tier process

Grinding achieves the tightest accuracies (±1-3 μm) but requires 3 stages:

| Stage | Wheel speed | Feed | Stock removal | Surface |
|-------|-------------|------|---------------|---------|
| Rough grind | Standard | Higher | 0.1-0.3 mm | Ra 1.6 |
| Semi-finish | Slightly higher | Lower | 0.02-0.05 mm | Ra 0.4 |
| Spark-out (no feed) | Same | 0 | <0.001 mm | Ra 0.05-0.1 |

**Spark-out is the secret to sub-μm grinding.** After programmed feed, the wheel continues spinning while feed stops — the elastic deflection of the system "sparks out" to zero, leaving the part at exactly programmed position.

\`\`\`
prism_calc grinding_surface_finish_calc --wheel_grit=80 --feed_mm_per_min=10 --spark_out_seconds=30
\`\`\`

[per Studer cylindrical grinding handbook + Norton wheel selection guide 2024]

## Workpiece springback in grinding

Grinding generates massive heat at the cut zone. This causes thermal expansion → springs back as part cools:

\`\`\`
thermal_springback_um = α_thermal × ΔT × workpiece_length_mm × geometry_factor

For 1045 steel at 50°C ΔT over 100 mm length:
  α = 11.7 × 10^-6 / °C
  thermal_springback = 11.7e-6 × 50 × 100 × 0.5 = 0.029 mm = 29 μm
\`\`\`

**Compensation**: allow workpiece to thermally equilibrate (typically 10-20 min) BEFORE final dimension check.

[per ASM Handbook Vol 16 §3 Grinding Heat]

## Wire EDM + grinder synergy for tight tolerance

For features needing both:
1. Wire EDM rough out the feature (fast, accurate)
2. Grinder finish to tight tolerance + low Ra (sub-μm)

This 2-stage approach is JM Die's protocol for precision EDM electrodes + reference fixtures.

[per JM Die precision protocol + PRISM grinding + WEDM integration 2026]`,
      },
    ],
    quiz: [
      {
        id: "course-24-m4-q1",
        type: "multiple_choice",
        prompt: "What is the role of 'spark-out' time in grinding?",
        options: [
          "Cleans the wheel of debris",
          "Allows elastic system deflection to dissipate (no-feed grinding), achieving sub-μm position accuracy",
          "Reduces heat in the workpiece",
          "Improves surface finish via dwelling",
        ],
        correctIndex: 1,
        explanation: "Per Studer cylindrical grinding handbook: spark-out is no-feed grinding at the end of a pass. The system has accumulated elastic deflection during feed; spark-out lets that deflection dissipate to zero, leaving the part at exactly the programmed position. Without spark-out, parts are systematically oversize by 1-3 μm.",
        topicTags: ["grinding", "spark_out", "precision"],
      },
    ],
    prismEngines: ["CurriculumEngine", "WedmMultiPassEngine", "GrindingEngine"],
    prismDispatcherActions: ["wedm_plan_passes", "wedm_calculate_corners", "grinding_surface_finish_calc"],
  },
];

export const COURSE_24_MODULES: Module[] = modules;
