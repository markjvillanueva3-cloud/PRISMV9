# Wire EDM Validation Test Suite Roadmap (WEDM-VAL)

**Goal**: Validate that PRISM produces accurate, machine-ready Wire EDM programs for ALL 15 machines across 6 controllers, using 42 test scenarios at 5 difficulty levels, covering 17 materials, 7 wire types, and industry standards (ISO 14137).

**Test matrix**: 42 scenarios × 5 controllers × 3 materials = 630 test permutations (not all combinations valid — actual ~280 meaningful tests)

---

## Test Coverage Matrix

### Controllers to Validate (5 post processors + 1 generic)
| Controller | Machines | Post Engine | Unique Codes |
|-----------|---------|-------------|-------------|
| Fanuc α-C | ROBOCUT α-CiC | EDMPostProcessGCodeEngine | M50/M60, E-pack, G51 taper, G61.1/G64 |
| Sodick | ALC600G, AG600L, VL600Q | EDMPostProcessGCodeEngine | M60/M61, C### conditions, K-SMC |
| Makino Hyper-i | U6, U6 HEAT, U86 | EDMPostProcessGCodeEngine | M60/M61, E-pack, HyperCut, M80/M81 |
| Mitsubishi M800 | MV1200R, MV2400R | EDMPostProcessGCodeEngine | M50/M51, V### conditions, D-codes |
| AgieCharmilles | CUT P 350, CUT P 550 | EDMPostProcessGCodeEngine | M50/M51, ISPG/IPG, TAPER-EXPERT |
| Generic (Accutex) | AU-300iA, AU-500iA | fallback | Standard G-codes |

### Materials for Validation (3 tiers)
| Tier | Materials | Why |
|------|----------|-----|
| Standard | D2 tool steel, 4140 steel, 6061 aluminum | Most common, well-characterized |
| Challenging | Ti-6Al-4V, Inconel 718, 304 stainless | Slow cut, high recast risk |
| Exotic | Carbide (WC), Copper, PCD | Extreme MRR variance, special parameters |

### Wire Types to Validate
| Wire | When Used |
|------|----------|
| Brass 0.25mm | Default — most tests |
| Coated 0.25mm | Speed tests, thick parts |
| Brass 0.20mm | Fine corner tests |
| Molybdenum 0.10mm | Micro feature tests |

---

## WAVE 1: Foundational Tests (T01-T06)
### WEDM-VAL-MS1: Basic Geometry & Program Structure
**Units: 12 | Priority: P0**

Validate basic G-code output is syntactically correct and geometrically accurate for each controller.

| Unit | Test | What It Validates | Pass Criteria |
|------|------|-------------------|---------------|
| U01 | T01 — Simple Square (25×25mm, D2 steel, 1 pass) × 5 controllers | G01 linear moves, G41/G42 offset, G40 cancel, program header/footer, M-codes | Output matches canonical program structure per controller |
| U02 | T02 — Simple Circle (Ø20mm, D2 steel, 1 pass) × 5 controllers | G02/G03 circular interpolation, I/J format, full-circle cutter comp | Arc output correct, I/J calculate to circle center |
| U03 | T03 — Rectangle with R2 corners × 5 controllers | G01↔G02 transitions, tangent continuity | No discontinuities at line-to-arc transitions |
| U04 | T04 — Wire Threading Sequence × 5 controllers | M50/M60 (Fanuc), M60/M61 (Sodick/Makino), tank fill codes | Threading M-code sequence matches controller spec |
| U05 | T05 — Absolute (G90) vs Incremental (G91) × 5 controllers | Both modes produce geometrically identical paths | Final position matches for both modes |
| U06 | T06 — G41 vs G42 Offset (punch vs die) × 5 controllers | Correct offset side — G41=left=die, G42=right=punch | Punch geometry + 2×offset = die geometry |
| U07 | T01 on aluminum 6061 × 5 controllers | Material-specific technology table/condition code selection | Tech codes reference aluminum, not steel |
| U08 | T01 on Ti-6Al-4V × 5 controllers | Slow-cut material parameters | Reduced speed, increased t_off in parameters |
| U09 | T02 with 0.20mm wire × 5 controllers | Wire diameter affects offset values | Offset smaller than 0.25mm wire equivalent |
| U10 | Negative: non-conductive material rejection | Pipeline rejects ceramic/glass | Error returned, no G-code generated |
| U11 | Negative: geometry too small for wire | Slot width < wire+gap (0.28mm) | Error/warning for infeasible geometry |
| U12 | Negative: missing start hole for closed profile | Closed profile without start hole access | Error identifying missing start hole |

---

## WAVE 2: Multi-Pass & Offset Tests (T07-T14)
### WEDM-VAL-MS2: Multi-Pass Strategy Validation
**Units: 10 | Priority: P0**

Validate the multi-pass rough→trim→finish cascade produces correct offsets and technology changes per pass.

| Unit | Test | What It Validates | Pass Criteria |
|------|------|-------------------|---------------|
| U01 | T07 — 4-pass circle (Ø25mm, D2, Ra 0.4µm target) × 5 ctrl | Offset decreases per pass, tech table changes, 4 distinct passes in output | Pass 1 offset > Pass 2 > Pass 3 > Pass 4; final offset converges to wire_radius + spark_gap_finish |
| U02 | T08 — Punch+Die pair from same geometry × 5 ctrl | G41 for die, G42 for punch, clearance offset correct | Die_ID - Punch_OD = 2 × clearance exactly |
| U03 | T09 — Part with 3 start holes and tabs × 5 ctrl | Multi-hole threading, tab placement in G-code, tab cut sequence | M-codes for thread/cut/rethread appear in correct order; tab positions in output |
| U04 | T10 — Staggered entry/exit × 5 ctrl | Entry and exit points offset by 0.03-0.06mm | Lead-in and lead-out coordinates differ; no witness mark at junction |
| U05 | T11 — 5 pockets with separate start holes × 5 ctrl | Wire cut→rethread→rapid→rethread→resume sequence | 5 threading sequences, rapid moves between pockets, no cutting during rapids |
| U06 | T13 — Mirror finish (7 skim passes, Ra<0.2µm) × 3 ctrl | Extended pass count, monotonically decreasing energy | 7+ passes in output; each pass has lower power than previous |
| U07 | T14 — Multiple work offsets (G54-G59) × 5 ctrl | Coordinate system switching for multi-part fixturing | Each part uses correct G5x; geometry identical relative to each WCS |
| U08 | Offset convergence math verification | Final pass offset = wire_radius + spark_gap_finish only | `offset_final = 0.125 + 0.003 = 0.128mm` (no remaining stock) |
| U09 | Energy cascade verification | E_pass_n = E_rough × 0.6^(n-1) | Each pass energy is ~60% of previous; Ra decreases monotonically |
| U10 | Wire consumption tracking across passes | Total wire = Σ(cut_time_per_pass × wire_speed_per_pass) | Wire consumption matches manual calculation |

---

## WAVE 3: Taper & Complex Geometry Tests (T15-T22)
### WEDM-VAL-MS3: Taper, Complex Profiles & Corner Strategy
**Units: 10 | Priority: P0**

Validate 4-axis UV programming, corner compensation, and complex profile accuracy.

| Unit | Test | What It Validates | Pass Criteria |
|------|------|-------------------|---------------|
| U01 | T15 — 2° constant taper on 50mm height × 5 ctrl | Taper G-code (G51/equiv), UV offset = tan(2°)×25mm = 0.873mm | Top and bottom profiles differ by 2×tan(2°)×50 = 3.49mm |
| U02 | T16 — Variable taper (circle top, square bottom) × 3 ctrl | 4-axis UV independent profiles, sync points | Upper and lower profiles are geometrically independent but synchronized |
| U03 | T17 — Land-and-relief (5mm straight + 20mm 1° taper) × 3 ctrl | Combined zero-taper + taper in single program | First 5mm has no UV offset; remaining 20mm has UV offset |
| U04 | T18 — Involute gear profile (12T M2) × 3 ctrl | Complex curve (many short arcs/lines), tight form tolerance | Profile deviation < 0.005mm on involute form; tooth spacing within 0.01mm |
| U05 | T20 — 90° sharp inside corners with corner strategy × 5 ctrl | Corner codes (G61.1/K0/etc), wire lag compensation, over-travel + dwell | Corner strategy codes present; over-travel distance matches wire lag calculation |
| U06 | T21 — Mixed arcs and lines (R1, R3, R5 tangent) × 5 ctrl | Arc direction (G02 vs G03), tangent continuity, no gouging | No discontinuities; correct arc direction at each transition |
| U07 | T22 — 0.10mm moly wire program × 5 ctrl | Wire-specific tension, offset, speed values | All parameters reference 0.10mm wire specs, not 0.25mm defaults |
| U08 | Corner compensation math verification | OT = δ×sin(θ/2)/sin(θ) for θ=90° | Over-travel ≈ wire_lag for 90° corner |
| U09 | Wire lag physics verification | δ = F×L²/(8T) for typical values | lag ≈ 0.1N × 80² / (8×15) = 0.067mm (realistic) |
| U10 | Taper accuracy prediction | ε = (wire_dia/2) × H / guide_distance | For 0.25mm wire, 50mm height, 120mm guide: ε ≈ 0.052mm |

---

## WAVE 4: Material & Machine-Specific Tests (T23-T30)
### WEDM-VAL-MS4: Extreme Conditions & Edge Cases
**Units: 10 | Priority: P1**

Validate handling of challenging materials, tall parts, thin walls, and failure recovery.

| Unit | Test | What It Validates | Pass Criteria |
|------|------|-------------------|---------------|
| U01 | T23 — Tall part (250mm height, D2 steel) × 3 ctrl | Height-adjusted parameters (speed, flush pressure, tension) | Parameters differ from standard-height defaults; flush pressure increased |
| U02 | T24 — Thin wall (0.5mm between cuts) × 3 ctrl | Reduced power, correct cut sequence (far side first) | Power reduced from standard; cut order prevents wall damage |
| U03 | T25 — Carbide workpiece (WC) × 3 ctrl | Carbide-specific technology (~30% MRR factor) | Tech codes reference carbide; speed dramatically lower than steel |
| U04 | T26 — Titanium (Ti-6Al-4V) × 3 ctrl | Low-conductivity material handling, MRR factor 0.5 | Tech codes reference titanium; speed ~50% of steel |
| U05 | T27 — Tight tolerance (±0.003mm, 5+ passes) × 3 ctrl | Sufficient pass count, fine final offset | ≥5 passes; final spark gap ≤ 3µm |
| U06 | T28 — PCD workpiece × 2 ctrl | Semi-conductive material, very slow cutting | Drastically reduced parameters; warning about semi-conductor |
| U07 | T29 — Inconel 718 × 3 ctrl | Superalloy parameters, recast layer awareness | Recast warning in output; HAZ noted; parameters slower than steel |
| U08 | T30 — Wire break recovery sequence × 5 ctrl | M-codes for break detect, retract, rethread, backup, resume | Recovery sequence includes all 5 steps in correct order |
| U09 | Recast layer prediction per material | d = 2√(α×t_on) for each material | D2 recast > aluminum recast (different α values); values physically reasonable |
| U10 | Wire break probability calculation | P = 1-exp(-λ×H×DC/FF) for tall Ti part | High probability for tall titanium (P > 0.3); low for short aluminum (P < 0.05) |

---

## WAVE 5: System-Level & Cross-Controller Tests (T31-T42)
### WEDM-VAL-MS5: Cross-Controller Consistency & Pipeline Integration
**Units: 14 | Priority: P0**

Validate same geometry produces correct but controller-specific output across all controllers, and the full pipeline chains correctly.

| Unit | Test | What It Validates | Pass Criteria |
|------|------|-------------------|---------------|
| U01 | T31 — Same part, 5 controller outputs compared | Post-processor dialect differences | Each output syntactically valid for its controller; geometry identical across all |
| U02 | T32 — Fanuc full program validation | Complete Fanuc program with headers/footers | Matches Fanuc wire EDM syntax reference (helmancnc.com) |
| U03 | T33 — Sodick full program validation | Complete Sodick program with C-codes | Matches Sodick syntax reference (MIT fab lab) |
| U04 | T34 — Mitsubishi full program validation | Complete Mitsubishi program with V500 codes | Matches Mitsubishi programming reference |
| U05 | T35 — Makino full program validation | Complete Makino program with E-packs | Matches Makino Hyper-i reference |
| U06 | T36 — Batch production program (50-piece loop) | Subroutine looping, part counter, consistent offsets | Program structure supports 50 cycles without manual intervention |
| U07 | T37 — Full mold core (complex + multi-pass + tight tol) | End-to-end pipeline: drawing→feasibility→params→gcode | Complete program generated with all features covered |
| U08 | T38 — Circular interpolation accuracy (Ø5, Ø25, Ø100mm) | G02/G03 at multiple radii | Circle roundness deviation < 0.002mm per ISO 230-4 |
| U09 | T39 — Edge case: zero-length segment | Degenerate geometry handling | No empty G01 blocks; no NaN values |
| U10 | T40 — Edge case: near-full-circle arc (359.9°) | Arc endpoint calculation for near-full circles | Correct endpoint; no full-circle substitution error |
| U11 | T41 — Stress test: 10,000-segment profile | Performance, memory, output completeness | All segments in output; generation < 5 seconds |
| U12 | T42 — Non-conductive material rejection | Full pipeline abort for ceramic | Pipeline aborts at feasibility stage with clear error |
| U13 | Full pipeline integration: drawing→feasibility→material→machine→starthole→setup→toolpath→multipass→params→flushing→wire→corner→surface→postprocess→gcode→cost→docs→quality | End-to-end 20-stage pipeline | All stages complete; G-code generated; cost estimated; setup sheet produced |
| U14 | Cross-material comparison: same part in D2 vs 6061 vs Ti | Parameters scale correctly by material | MRR ratio matches material factor ratio (D2:1.0, Al:1.8, Ti:0.5) |

---

## Summary

| Wave | Milestone | Units | Focus |
|------|-----------|-------|-------|
| 1 — Foundational | MS1 | 12 | Basic geometry, program structure, threading, offset side, negative tests |
| 2 — Multi-Pass | MS2 | 10 | Offset cascade, punch/die, tabs, mirror finish, WCS, energy validation |
| 3 — Taper & Complex | MS3 | 10 | UV taper, variable taper, involute gear, corner compensation, mixed profiles |
| 4 — Extreme | MS4 | 10 | Tall parts, thin walls, exotic materials, tight tolerances, wire break recovery |
| 5 — System-Level | MS5 | 14 | Cross-controller, full pipeline, edge cases, batch production, stress test |
| **Total** | **5** | **56** | **~280 meaningful test permutations** |

---

## Industry References for Validation

| Source | URL | Use |
|--------|-----|-----|
| Helman CNC — Wire EDM Programming | helmancnc.com | Fanuc, Sodick canonical program structure |
| MIT Fab Lab — Sodick G/T/M Codes | fab.cba.mit.edu | Sodick code reference |
| Reliable EDM — Complete EDM Handbook | reliableedm.com | Die clearance, punch/die programming |
| ISO 14137:2015 | iso.org | Machine accuracy test geometries |
| ISO 230-4 | iso.org | Circular interpolation accuracy |
| BobCAD — Wire EDM Examples | bobcad.com | Taper and land examples |
| SST — 4-Axis Best Practice | sstconsumables.com | Variable taper programming |
| Makino — Programming Techniques | makino.com | Makino-specific practices |

## Test Execution Strategy

1. **Implement test geometry definitions** — 42 test part geometries as JSON/TypeScript data
2. **Run each through full pipeline** — drawing interpretation → G-code generation
3. **Validate G-code output** — syntax check, geometry check, parameter check per controller
4. **Cross-reference against known-good programs** — from manufacturer examples and tutorials
5. **Physics validation** — verify calculated MRR, Ra, recast match expected ranges
6. **Regression baseline** — store first-pass results as golden reference for future regression
