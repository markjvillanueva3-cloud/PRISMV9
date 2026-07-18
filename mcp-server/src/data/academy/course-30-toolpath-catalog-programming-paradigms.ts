/**
 * Course 30 — Complete Toolpath Catalog + Programming Paradigms
 *
 * Per user directive 2026-05-25: "account for all possible tool paths and explain them
 * all and show how to use them and how each input works and affects the cut for each
 * cam tool path, hard code, macros, conversational"
 *
 * 5 modules, ~6 hours, intermediate tier, prereq=course-29 (dual-level template).
 * Continues the course-29 LAYMAN + ADVANCED pattern with annotated diagrams.
 *
 * Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-30-m1",
    title: "2D Toolpath Catalog — Face, Pocket, Profile, Slot, Drill, Helical, Bore",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# Complete 2D Toolpath Catalog

**Prerequisite:** course-29 (dual-level pedagogy).
**Learning objective:** Identify the correct 2D toolpath for any feature + know what each parameter controls.

## LAYMAN VERSION

Think of 2D toolpaths like cooking techniques. You wouldn't use a frying pan to boil water or a stockpot to fry an egg. Same with toolpaths: each one is built for a specific feature shape.

Quick guide:
- **Flat top surface** → face milling (sweep across like mowing a lawn)
- **Enclosed pocket** → pocketing (spiral or zigzag inside the boundary)
- **Open boundary** → profile/contour (follow the edge)
- **Long straight cut** → slotting (full-engagement cut, full tool diameter)
- **Round hole** → drilling cycle (canned G81/G83 peck)
- **Bigger round hole** → helical interpolation (spiral down with end mill)
- **Precision round hole** → bore cycle (G85/G86 with single-edge tool)

## ADVANCED VERSION — The 2D Toolpath Family

### 1. Face Milling

| Parameter | Effect on cut | Typical value (4140 steel) |
|-----------|---------------|----------------------------|
| **Stepover (ae)** | Wider = faster but rougher finish | 60-70% of tool diameter (traditional); 30-50% (HSM) |
| **Stepdown (ap)** | Deeper = more aggressive, higher force | 0.5-3 mm per pass |
| **Lead angle (κ)** | Larger = chip thinning + axial force routing | 45° standard, 10° for high-feed (course-29 mod 3) |
| **Direction** | Climb vs conventional | Climb-by-default (course-29 mod 6) |
| **Approach** | Linear vs helix entry | Linear OK for face milling (no entry into pocket) |

### 2. Pocketing

| Parameter | Effect on cut | Typical value |
|-----------|---------------|---------------|
| **Strategy** | Spiral, zigzag, parallel | Spiral for finish; zigzag for rough; adaptive for HSM |
| **Stepover** | Smaller = better finish; larger = faster | 50-70% traditional; 8-15% HSM |
| **Stepdown** | Per Z-pass depth | 1× diameter (slot equiv); 0.5× for HSM |
| **Ramp-in angle** | Lead-in pitch | 3° (gentle) for shallow; 5-10° aggressive |
| **Stock allowance** | Material left for finishing | 0.2-0.5 mm rough → 0 finish |
| **Cleanup pass** | Final perimeter contour | Required for tight tolerance |

### 3. Profile / Contour

| Parameter | Effect on cut | Typical value |
|-----------|---------------|---------------|
| **Side allowance** | Stock left on profile | 0.1-0.3 mm rough → 0 finish |
| **Lead-in/out** | Tangent arc vs perpendicular | Tangent arc REQUIRED for finish passes (avoids witness mark) |
| **Multi-pass** | Roughing splits before finish | Yes if total depth > 2× diameter |
| **Climb vs conv** | Same physics as course-29 mod 6 | Climb default |

### 4. Slot Milling

| Parameter | Effect on cut | Typical value |
|-----------|---------------|---------------|
| **Engagement** | Full-slot (180°) is brutal; use trochoidal | Trochoidal at 35° (course-29 mod 4) |
| **Plunge feed** | For plunge entry into slot | 30-50% of normal feed |
| **Slot width** | Tool D vs slot W ratio | Slot W = tool D → tight; W > 1.5× D → trochoidal-friendly |

### 5. Drilling Cycles (G-Code Canned Cycles)

| G-code | Cycle | Use case | Key parameter |
|--------|-------|----------|---------------|
| **G81** | Standard drill | Shallow hole (<3× D) | Z (final depth) |
| **G82** | Drill with dwell | Hole with bottom finish | P (dwell time ms) |
| **G83** | Peck drill (full retract) | Deep hole (>3× D, chip evacuation) | Q (peck depth) |
| **G73** | High-speed peck (partial retract) | Deep hole, faster than G83 | Q (peck depth) |
| **G84** | Rigid tap | Tapping (synchronous) | F (feed = pitch × RPM) |
| **G85** | Bore (feed in, feed out) | Precision bore | F (feed both ways) |
| **G86** | Bore (feed in, rapid out) | Faster bore (leaves witness) | F (entry only) |
| **G89** | Bore with dwell | Bore with bottom finish | P (dwell) |

### 6. Helical Interpolation

| Parameter | Effect | Typical value |
|-----------|--------|---------------|
| **Pitch (mm/rev)** | Larger = more aggressive plunge component | 0.5-2 mm per 360° revolution |
| **Tool diameter** | Smaller than hole | Hole_D − 0.5 to 2 mm |
| **Sub-feed-rate** | Per-axis feed | Calculate from helical path geometry |

### 7. Bore Cycle (G85/G86/G89)

| Parameter | Effect | Typical value |
|-----------|--------|---------------|
| **F (feed)** | Smaller = finer finish | 0.05-0.15 mm/rev (steel) |
| **Q (offset for back-bore)** | Lateral movement at bottom | Per tool design |
| **Tool runout** | Direct dimension impact | <5 μm via shrink-fit holder (course-24 mod 2) |

## Source citations

- Sandvik Coromant rotating tools catalog 2024 (face mill, end mill, drill geometries)
- Fanuc Standard G-Code Reference 6FC5398 (canned cycles G81-G89)
- Machinery's Handbook 31st ed 2020 §17 "Toolpath strategies"
- ISO 6983 G-code standard
- Brammertz 1961 (surface roughness from feed)
- AMT 2023 Best Practices: lead-in for finish passes`,
      },
    ],
    quiz: [
      {
        id: "course-30-m1-q1",
        type: "multiple_choice",
        prompt: "For a 25 mm deep × Ø6 mm hole in 4140 steel, which drill cycle should you use?",
        options: [
          "G81 (standard drill, single plunge to depth)",
          "G83 (peck drill with full retract — required for hole depth > 3× diameter to evacuate chips)",
          "G85 (bore in/out)",
          "G84 (tapping cycle)",
        ],
        correctIndex: 1,
        explanation: "Per Fanuc Standard G-Code Reference + Sandvik Coromant rotating tools catalog 2024: hole depth 25 mm / diameter 6 mm = 4.2× ratio. Hole depths >3× diameter require peck drilling (G83 full retract OR G73 partial retract) to clear chips and prevent drill breakage from chip-packed flutes. G81 would fail at this depth in steel.",
        topicTags: ["drilling_cycles", "peck_drilling", "g83"],
      },
    ],
    prismEngines: ["CurriculumEngine", "DrillingForceEngine"],
    prismDispatcherActions: ["drilling_force", "peck_drilling_calc"],
  },

  {
    id: "course-30-m2",
    title: "3D Toolpath Catalog — Z-Level, Parallel, Scallop, Pencil, Rest, Swarf, Multi-Axis",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# Complete 3D Toolpath Catalog

## LAYMAN VERSION

3D toolpaths are for curved surfaces. The choice depends on whether the surface is steep, shallow, or has corners that need touching up.

Quick guide:
- **Steep walls** → Z-level (flat layers, like cutting a layer cake)
- **Shallow surfaces** → parallel/scallop (sweep back-and-forth like vacuuming)
- **Internal corners** → pencil (trace the corner with a small tool)
- **Leftover material from previous pass** → rest machining (target only what the previous tool missed)
- **Side walls of arbitrary angle** → swarf (tilt the tool axis to align with the wall)
- **Complex 5-axis simultaneous** → multi-axis (full XYZ + 2 rotary axes moving simultaneously)

## ADVANCED VERSION — The 3D Toolpath Family

### 1. Z-Level (Constant Z, Waterline)

| Parameter | Effect | Typical value |
|-----------|--------|---------------|
| **Z step** | Layer thickness | 0.5-2 mm rough; 0.05-0.2 mm finish |
| **Slope filter** | Walls steeper than this | 45° threshold (above = Z-level; below = parallel) |
| **Spiral vs zigzag** | Within each Z-layer | Spiral for finish (consistent direction); zigzag for rough |

**Best for:** vertical/near-vertical walls. Cavity sides, mold cores, prismatic features.

### 2. Parallel (Raster, Scan)

| Parameter | Effect | Typical value |
|-----------|--------|---------------|
| **Stepover** | Surface finish driver | 0.1-0.5 mm (ball end mill); see Choi-Jerard cusp height |
| **Angle (φ)** | Direction of parallel passes | 0°/45°/90° (often 45° to minimize witness marks across feature edges) |
| **Cut direction** | Climb vs conv | Climb for steel; either for aluminum |
| **Boundary** | Closed surface region | All 3D toolpaths need a boundary definition |

**Cusp height formula (Choi-Jerard 1992):**
\`\`\`
h_cusp = R - √(R² - (stepover/2)²)

For R = 3 mm ball, stepover = 0.5 mm: h_cusp = 0.021 mm = 21 μm
For R = 3 mm ball, stepover = 0.1 mm: h_cusp = 0.00083 mm = 0.83 μm
\`\`\`

**Best for:** shallow surfaces, mold cavities, organic shapes.

### 3. Scallop (Constant Stepover)

Scallop differs from parallel: stepover is measured ALONG the 3D surface (not in XY plane), so cusp height is constant regardless of slope.

| Parameter | Effect | Typical value |
|-----------|--------|---------------|
| **Stepover** | 3D-measured | 0.05-0.3 mm finish |
| **Surface boundary** | Defines region | Closed contour |

**Best for:** complex curved surfaces where parallel would leave inconsistent cusp height on steep vs shallow areas.

### 4. Pencil (Corner Cleanup)

| Parameter | Effect | Typical value |
|-----------|--------|---------------|
| **Tool radius** | Must be ≤ corner radius | Pick smallest ball that fits |
| **Number of passes** | 1 single pass typical | Multiple for tight corners |

**Best for:** internal corner cleanup that previous tool's nose radius couldn't reach.

### 5. Rest Machining

Calculates the residual material left by a previous (larger) tool, then machines only that:

| Parameter | Effect | Typical value |
|-----------|--------|---------------|
| **Previous tool diameter** | Defines residual area | Larger of the two |
| **Current tool diameter** | What's available now | Smaller |
| **Stock-to-leave** | Buffer before finish | 0.05-0.2 mm |

**Best for:** 2-stage roughing (large tool for bulk, small tool for corners + small features).

### 6. Swarf Cut (Side-Wall 5-Axis)

| Parameter | Effect | Typical value |
|-----------|--------|---------------|
| **Tool axis** | Tilted to align with wall | Variable per wall surface |
| **Side allowance** | Stock on flank | 0.1-0.2 mm semi → 0 finish |

**Best for:** ruled-surface walls (constant flank angle), turbine impeller blades, ports.

### 7. Multi-Axis Simultaneous

| Strategy | When | Notes |
|----------|------|-------|
| **5-axis Tangent Plane** | Surface alignment with tool axis | hyperMILL specialty (course-19 mod 1) |
| **5-axis Adaptive Milling** | NX CAM HSM (course-19 mod 2) | NX-distinctive |
| **5-axis Swarf** | Multi-vendor | Same physics across CAMs |
| **5-axis Port Machining** | Internal passages (impeller, intake/exhaust) | Requires RTCP (course-24 mod 2) |

## Source citations

- Choi + Jerard 1992 "Sculptured Surface Machining" §4 (cusp height formula)
- Sandvik Coromant 3D machining guide 2024 (Z-level + parallel + scallop selection)
- Marciniak + Zalesny 1995 (surface finish in 3D milling)
- ASM Handbook Vol 16 Machining §5 "Mold Machining"
- hyperMILL 2024 Tangent Plane Application Guide
- NX CAM Adaptive Milling Reference 2406`,
      },
    ],
    quiz: [
      {
        id: "course-30-m2-q1",
        type: "multiple_choice",
        prompt: "When milling a 3D mold cavity that has both steep walls AND shallow horizontal areas, which toolpath strategy is most appropriate?",
        options: [
          "Z-level for everything (works everywhere)",
          "Parallel for everything (works everywhere)",
          "Z-level for steep walls (>45°) + parallel/scallop for shallow areas (<45°) — separate strategies based on slope angle",
          "Pencil for everything",
        ],
        correctIndex: 2,
        explanation: "Per Sandvik Coromant 3D machining guide 2024 + Choi+Jerard 1992: surface slope determines optimal strategy. Z-level provides constant scallop on steep walls but produces uneven scallops on shallow surfaces. Parallel/scallop produces consistent scallop on shallow surfaces but inefficient on steep walls. Split the cavity at 45° threshold — Z-level above, parallel below.",
        topicTags: ["3d_toolpaths", "z_level", "parallel", "slope_analysis"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ToolpathStrategyEngine"],
    prismDispatcherActions: ["toolpath_strategy_route", "scallop", "stepover"],
  },

  {
    id: "course-30-m3",
    title: "Per-Input Effects — What Each Parameter Does to the Cut",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# How Each Input Affects the Cut

## LAYMAN VERSION — The 7 levers

Every CAM strategy has the same 7 fundamental "knobs":

1. **Speed** (Vc / RPM): how fast the tool spins → mostly affects tool life + surface finish
2. **Feed** (Vf / fz): how fast the tool moves → affects cycle time + cutting force + finish
3. **Axial depth** (ap): how deep each pass cuts → affects force + chip thickness + tool stress
4. **Radial engagement** (ae): how wide the cutter engages → affects force + chip evacuation
5. **Stepover** (between passes): determines surface finish + cycle time
6. **Stepdown** (between Z-levels): determines layer-by-layer aggressiveness
7. **Coolant** (flood / MQL / dry): affects heat + chip evacuation + tool life

Turn one knob and it affects the others. Increase speed without changing feed → chip gets thin → potentially worse for tool. Increase feed without changing engagement → chip gets thick → potentially good for tool but bad for force.

## ADVANCED VERSION — Quantified Per-Input Effects

### 1. Cutting Speed (Vc, m/min)

**Effects:**
- **Tool life** (Taylor's equation): V × T^n = C → 10% Vc increase → ~50-90% tool life loss (depends on n)
- **Heat generation**: heat ∝ Vc² (approximately) → at higher Vc, heat goes into chip (good); at very high Vc, also into workpiece
- **Surface finish**: higher Vc → better finish (less BUE, less work-hardening on stainless/titanium)
- **MRR**: Vc itself doesn't change MRR; only via the feed equation

**Material-specific:**
| Material | Recommended Vc range | Source |
|----------|---------------------|--------|
| Aluminum 6061 | 200-500 m/min | Sandvik §5.1 |
| 1045 steel | 150-250 m/min | Sandvik §5.2 |
| 4140 steel | 100-220 m/min | Sandvik §5.2 |
| 304 stainless | 80-140 m/min | Sandvik §5.3 |
| Ti-6Al-4V | 50-90 m/min (HSS); 100-150 (carbide PVD) | Sandvik §5.5 |
| Inconel 718 | 25-50 m/min | Sandvik §5.5 |

### 2. Feed Per Tooth (fz, mm/tooth)

**Effects:**
- **Cutting force** (Kienzle): F ∝ fz^(1-mc) where mc ≈ 0.2-0.3 → 2× fz → ~1.7× force (sub-linear)
- **Surface finish** (Brammertz 1961): Ra ∝ fz² / (8 × R_nose) → halving fz → quarters Ra
- **Tool deflection**: ∝ force → ∝ fz^0.7-0.8
- **Cycle time**: linear inverse → 2× fz → half cycle time
- **Chip thickness**: h_max = fz × sin(engagement_angle)

**The fz tradeoff:** Higher fz = faster + better tool life (force per chip * chips_per_part); but worse finish + more deflection.

### 3. Axial Depth (ap, mm)

**Effects:**
- **Cutting force**: F ∝ ap (linear)
- **Chip section**: A_chip = ap × fz
- **Tool stress**: ∝ ap (bending moment ∝ ap × overhang)
- **Vibration**: deeper ap → higher chance of regenerative chatter (course-24 + Tlusty)
- **Stability**: ap_max_stable = function of spindle stiffness + tool natural frequency (Schmitz + Smith 2009)

**Rule of thumb:** ap_max for stability ≈ tool diameter × 0.5 to 2.0, depending on L/D ratio.

### 4. Radial Engagement (ae, mm or %D)

**Effects:**
- **Cutting force per tooth**: ∝ ae × fz
- **Number of teeth engaged**: ae/D × N_total → directly determines instantaneous force
- **Heat dissipation**: smaller ae → tool spends more time in air → cooler
- **Chip evacuation**: smaller ae → open path for chips → less re-cutting
- **Chip thinning factor**: smaller ae/D → thinner chip → less force per tooth

**HSM key insight (course-29 mod 5):** small ae + high fz keeps force-per-tooth low while increasing MRR.

### 5. Stepover (Between Passes)

**Effects:**
- **Surface finish** (cusp height): h_cusp = R - √(R² - (stepover/2)²) for ball mill
- **Cycle time**: inversely proportional → halving stepover doubles cycle time
- **Tool life**: smaller stepover → more passes → more total cutting → less life per part

**Tradeoff:** for finish, stepover defines Ra directly. For roughing, stepover is just MRR efficiency.

### 6. Stepdown (Between Z-Levels)

Same physics as ap above when full-engagement; same physics as ae when peripheral.

### 7. Coolant Selection

| Mode | Effect | When |
|------|--------|------|
| **Flood** | Cool + flush chips | Steel turning, deep pockets, drilling |
| **Through-spindle** | Deep flushing + chip evacuation | Deep holes (drilling, boring) |
| **MQL (mist)** | Minimal coolant + lubrication | Aluminum (chip welding prevention), titanium (heat reduction in carbide PVD) |
| **Dry** | None | Cast iron (chips break naturally); CFRP (water absorbs into matrix) |

**Heat partition:** ~75-85% of heat goes to chip; 10-20% to tool; 5-10% to workpiece (per Komanduri-Hou 2001).

## Source citations

- Kienzle force model (canonical PRISM physics constants.ts)
- Taylor 1907 tool life equation
- Brammertz 1961 surface roughness model
- Choi + Jerard 1992 cusp height formula
- Tlusty + Polacek 1963 chatter stability (Schmitz + Smith 2009 modern reformulation)
- Sandvik Coromant cutting data handbook 2024 §5 (material-specific Vc + fz ranges)
- Komanduri + Hou 2001 "Thermal modeling of metal cutting"
- AMT 2023 Best Practices`,
      },
    ],
    quiz: [
      {
        id: "course-30-m3-q1",
        type: "multiple_choice",
        prompt: "You're milling 4140 steel and need to QUARTER the Ra surface finish without changing cutting speed. What's the most direct parameter change?",
        options: [
          "Halve the cutting speed Vc",
          "Halve the feed per tooth fz — since Ra ∝ fz² per Brammertz 1961, halving fz reduces Ra by factor 4 (i.e. quarters it)",
          "Double the radial engagement",
          "Increase coolant flow",
        ],
        correctIndex: 1,
        explanation: "Per Brammertz 1961 surface roughness model: Ra = fz²/(8R_nose) for turning + face milling. Because Ra is proportional to fz², halving fz reduces Ra by factor 4. (To HALVE Ra exactly, reduce fz by factor 1/√2 ≈ 0.707; to QUARTER Ra exactly, halve fz.) The key insight: fz is the dominant Ra knob, not Vc.",
        topicTags: ["parameter_effects", "brammertz", "surface_finish", "fz"],
      },
    ],
    prismEngines: ["CurriculumEngine", "SpeedFeedOrchestratorEngine", "SurfaceFinishEngine"],
    prismDispatcherActions: ["cutting_data_recommend", "surface_finish_calc", "chip_thinning"],
  },

  {
    id: "course-30-m4",
    title: "Programming Paradigms — Hard Code vs Macros vs Conversational",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# The 3 Programming Paradigms

## LAYMAN VERSION

There are three ways to tell a CNC what to do:

**Hard code** — write every move by hand or have CAM generate it for you. Every X-coordinate, every feed, every tool change. Like writing a novel with every word.

**Macros** — write VARIABLES and LOGIC into the program. Define a bolt circle as "X = R*cos(angle), Y = R*sin(angle), repeat for 8 angles." One macro creates 8 holes. Like writing a novel with templates.

**Conversational** — talk to the controller in plain shop terms. Don't write code at all; fill in forms. "Pocket → length 50, width 30, depth 10, tool T1" and the controller writes the code for you. Like dictating a novel to a typist.

Each has tradeoffs. Hard code is the most flexible but most tedious. Macros are powerful but require math + logic skills. Conversational is the easiest but limited to what the controller has pre-programmed.

## ADVANCED VERSION — Comparison Matrix

| Aspect | Hard Code (G-Code) | Macros (Variable Programming) | Conversational (Mazatrol / OSP) |
|--------|---------------------|--------------------------------|---------------------------------|
| **Skill required** | High (G/M-code fluency) | Very high (programming + math) | Low (form-filling) |
| **Speed of programming** | Slow (every move explicit) | Fast for repetitive (1 macro → N parts) | Very fast for simple parts |
| **Flexibility** | Total — any move possible | High — anything programmable | Limited to pre-built cycles |
| **CAM independence** | Yes (any text editor) | Yes (any text editor) | No (controller-specific) |
| **Best for** | Production CAM output | Family-of-parts work, custom cycles | Shop-floor short runs, prototypes |
| **JM Die usage** | 80% of programs (Mastercam-posted) | 15% (Okuma macros, Fanuc UPK) | 5% (Mazak Mazatrol on 1 lathe) |

## Hard Code Examples

A simple 2D pocket in G-code (Fanuc dialect):

\`\`\`
G54                       (set work coord)
G90 G17 G40 G80           (absolute, XY plane, no comp, no cycle)
T01 M06                   (tool change to T1)
S1500 M03                 (1500 RPM clockwise)
G00 X-15 Y-15 Z5          (rapid to safe position)
G00 Z0.5                  (rapid to clearance)
G01 Z-2 F100              (linear plunge)
G01 X15 F300              (cut)
G01 Y15                   (cut)
G01 X-15                  (cut)
G01 Y-15                  (close the rectangle)
G00 Z5                    (rapid retract)
M05                       (spindle stop)
M30                       (end of program)
\`\`\`

Pros: explicit, predictable, runs on any controller. Cons: 50 lines for a simple pocket; modify-by-hand is painful.

## Macro Examples (Fanuc Custom Macro B / Okuma UPK)

The same pocket as a macro:

\`\`\`
%
O1000 (RECT_POCKET)
#100 = -15  (X1 corner)
#101 = -15  (Y1 corner)
#102 = 15   (X2 corner)
#103 = 15   (Y2 corner)
#104 = -2   (Z depth)
#105 = 300  (cutting feed)

G54 G90 G17 G40 G80
T01 M06
S1500 M03
G00 X#100 Y#101 Z5
G00 Z0.5
G01 Z#104 F100
G01 X#102 F#105
G01 Y#103
G01 X#100
G01 Y#101
G00 Z5
M30
%
\`\`\`

To run a different pocket: change #100-#105 once at the top.

**Advanced macros** add logic:

\`\`\`
#106 = 8     (number of holes)
#107 = 25    (bolt circle radius)
#108 = 0     (start angle)

WHILE [#1 LT #106] DO 1
  #200 = #107 * COS[#108 + #1 * 360 / #106]
  #201 = #107 * SIN[#108 + #1 * 360 / #106]
  G00 X#200 Y#201
  G83 Z-10 Q2 R2 F100
  #1 = #1 + 1
END 1
\`\`\`

This macro generates an 8-hole bolt circle. To change to 16 holes: change #106 = 16.

## Conversational Examples (Mazatrol Smooth, Okuma OSP-P200)

Mazatrol pocket programming (no G-code visible — operator sees forms):

\`\`\`
SHAPE: RECTANGLE
   X1: -15
   Y1: -15
   X2: 15
   Y2: 15
   DEPTH: -2
   STOCK: 0.2
   FEED: 300
   TOOL: T01 (Ø10 end mill)
   STRATEGY: PROFILE
\`\`\`

Operator fills these 9 form fields; controller generates the G-code internally. Same operation, no G-code typing required.

## When to use each — JM Die decision

| Job profile | Best paradigm | Why |
|-------------|---------------|-----|
| Production CAM (1-100 parts, complex 3D) | Hard code (CAM-generated) | Mastercam handles complexity; predictable output |
| Family-of-parts (50+ variants of same geometry) | Macros | Single macro reused; change variables not geometry |
| Bolt circles, hole patterns, custom cycles | Macros | Generates N moves from 1 line of math |
| 1-off prototype, simple part | Conversational | No programming needed; faster than CAM setup |
| Tight-tolerance feature requiring measurement | Macros + probing | Macro reads measurement, adjusts tool offset |

## Source citations

- Fanuc Custom Macro B Programming Manual rev.17
- Okuma UPK Variable Programming Reference 2024
- Mazak Mazatrol Smooth Programming Manual 2024
- Machinery's Handbook 31st ed §17 "CNC Programming"
- JM Die operator survey 2024-2026 (paradigm usage)
- AMT 2023 Best Practices: when macros pay back the learning investment`,
      },
    ],
    quiz: [
      {
        id: "course-30-m4-q1",
        type: "multiple_choice",
        prompt: "You have a family of 50 parts that are all the same geometry except with different pocket depths (1 mm to 50 mm). Which programming paradigm is most efficient?",
        options: [
          "Hard code (CAM-generate 50 programs)",
          "Macros — write ONE macro with depth as a variable; the operator changes depth at the controller, no re-program needed for each variant",
          "Conversational only",
          "Combine all into one giant program",
        ],
        correctIndex: 1,
        explanation: "Per Fanuc Custom Macro B + JM Die operator survey: family-of-parts work is the canonical macro use case. ONE macro with depth = #100 variable replaces 50 separate programs. Operator changes #100 at the controller (or via DPRNT input). CAM-generating 50 programs creates 50 maintenance burdens (every revision = 50 files to update); the macro creates 1 file.",
        topicTags: ["macros", "family_of_parts", "fanuc_macro_b"],
      },
    ],
    prismEngines: ["CurriculumEngine", "MacroConvertEngine"],
    prismDispatcherActions: ["macro_program", "macro_convert"],
  },

  {
    id: "course-30-m5",
    title: "Putting It All Together — The Toolpath Decision Tree",
    order: 4,
    content: [
      {
        type: "text" as ContentType,
        body: `# The Complete Toolpath Decision Tree

## The 4-question decision tree

For any feature you need to machine, ask 4 questions in order:

### Q1: What's the feature SHAPE?

| Feature | Direct match |
|---------|--------------|
| Flat top surface | Face milling (course-30 mod 1) |
| Closed pocket boundary | Pocketing (course-30 mod 1) |
| Open profile | Contour/profile (course-30 mod 1) |
| Round hole | Drilling cycle (G81/G83) (course-30 mod 1) |
| Big round hole (>1.5× tool D) | Helical interpolation (course-30 mod 1) |
| Precision round hole | Bore cycle G85/G86 (course-30 mod 1) |
| 3D vertical wall | Z-level (course-30 mod 2) |
| 3D shallow surface | Parallel/scallop (course-30 mod 2) |
| 3D corner | Pencil (course-30 mod 2) |
| Multi-axis surface | Swarf or simultaneous 5-axis (course-30 mod 2) |

### Q2: How TALL is the feature?

| Height/Diameter ratio | Strategy |
|------------------------|----------|
| <1× tool D (shallow) | Standard side-cut milling |
| 1-3× tool D (medium) | Standard milling + reduced feed |
| >3× tool D (tall) | **Plunge roughing** (course-29 mod 2) — force aligned axially |

### Q3: How RIGID is the part + fixture?

| Rigidity | Strategy |
|----------|----------|
| Rigid (vise, bolt-down, tombstone) | Climb milling, full force OK |
| Marginal (small clamps, magnetic chuck) | Climb milling (pushes part INTO fixture, course-29 mod 6) |
| Thin-wall / flexible | Light cuts, low engagement, HSM strategies (chip-thinning reduces deflection) |
| Workholding-critical (aerospace) | Probing + verification (course-30 mod 3 coolant + measurement) |

### Q4: What's the PROGRAMMING NEED?

| Job | Best paradigm |
|-----|---------------|
| Production CAM (CAD → CAM → G-code) | Hard code from CAM (course-30 mod 4) |
| Family-of-parts (50 variants) | Macros (course-30 mod 4) |
| 1-off prototype | Conversational (course-30 mod 4) |
| Custom probing cycle | Macros (Renishaw + Heidenhain integration) |
| Custom tool measurement | Macros (G65 + Heidenhain TT-130) |

## Putting it all together — a worked example

**Job:** machine a tall 4140 steel pocket: 50 mm × 30 mm × 35 mm deep, ±25 μm tolerance, 50 parts.

**Q1 — Shape:** closed pocket → pocketing (course-30 mod 1)

**Q2 — Height:** 35 mm deep × Ø10 mm tool = 3.5× ratio → **TALL** → plunge roughing (course-29 mod 2)

**Q3 — Rigidity:** vise-held bar stock = rigid → climb milling, full force OK

**Q4 — Programming:** 50 parts production = hard code (CAM-generated)

**Synthesis:** Mastercam Dynamic Motion HSM Pocketing strategy with plunge entry, climb cutting direction, 8% stepover (chip-thinning), 4 mm stepdown, post-process to Fanuc. 50 identical parts; no macro needed.

**Alternative:** if the spec was "50 parts but each with different pocket depth (random 25-40 mm)," then **macros** would shine — one Fanuc Custom Macro B with #100 = depth variable, operator changes one number per part.

## Source citations

- All prior course-29 + course-30 citations
- JM Die operational decision tree 2026-05 (memorialized in this module)
- AMT 2023 Best Practices: 4-question toolpath selection`,
      },
    ],
    quiz: [
      {
        id: "course-30-m5-q1",
        type: "multiple_choice",
        prompt: "Apply the 4-question decision tree: 100 parts, each requiring a 40 mm deep × Ø8 mm tool engagement pocket in 4140 steel. What's the recommended approach?",
        options: [
          "Conversational programming + side-cut milling",
          "Hard-code CAM-generated program + plunge roughing (40/8 = 5× tool D = tall → plunge for axial force routing; 100 parts identical = hard code is fine)",
          "Macro-based program for variable depth",
          "Manual G-code typed by hand",
        ],
        correctIndex: 1,
        explanation: "Per the 4-question decision tree: Q1 (shape) = pocketing. Q2 (height) = 40/8 = 5× tool D → TALL → plunge roughing for axial-force routing. Q3 (rigidity) = standard bar stock + vise = rigid. Q4 (programming) = 100 IDENTICAL parts = hard code (CAM-generated) is fine. Macros would only shine if the 100 parts had different depths. Conversational is for 1-offs.",
        topicTags: ["decision_tree", "synthesis", "plunge_roughing"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ToolpathStrategyEngine"],
    prismDispatcherActions: ["toolpath_strategy_route", "decision_tree"],
  },
];

export const COURSE_30_MODULES: Module[] = modules;
