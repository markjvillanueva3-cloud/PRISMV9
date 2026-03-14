# PRISM Post Processor Pipeline — Design Specification

**Date**: 2026-03-13
**Track**: PP (Post Processor)
**Milestones**: PP-MS0 through PP-MS8 (9 milestones, 42 units)
**New Engines**: 6 (PostProcessorPipelineEngine, ControllerDialectEngine, FiveAxisPostEngine, PostProcessorVerificationEngine, MachineSequenceEngine, MultiChannelPostEngine)
**Existing Engines Wired**: 30+ (every physics/stochastic/safety engine feeds the pipeline)
**Target**: 200+ tests, coverage across all 15 controller dialects

---

## Vision

Build a universal post processor system that chains ALL of PRISM's 900+ engines into a single deterministic pipeline producing mathematically optimized, physics-verified G-code for any machine, any controller, and any CAM software.

No other post processor on the market does per-block variable speed/feed with chip thinning compensation, stability lobe RPM selection, cumulative thermal tracking, wear progression derating, stochastic confidence intervals, and controller-specific feature injection — all in one pipeline.

---

## Architecture: 7-Phase Staged Pipeline

```
PHASE 0: INPUT NORMALIZATION + SMART DEFAULTS (PP-MS0)
├─ 0.1 Parse input (G-code / CL data / JSON / Fusion CPS)
├─ 0.2 Machine resolution (910 catalog)
├─ 0.3 Tool resolution (46,590 catalog)
├─ 0.4 Holder resolution (1,164 catalog)
├─ 0.5 Material resolution (2,957 DB)
├─ 0.6 Smart defaults (fill ALL gaps)
└─ 0.7 Transfer learning (similar past setups)

PHASE 1: PHYSICS FOUNDATION per operation (PP-MS1)
├─ 1.1 UltimateSpeedFeed → base Vc/fz/RPM/F
├─ 1.2 Constitutive model → flow stress at cutting temp (JC/ZA)
├─ 1.3 Stability lobes → chatter-free RPM zones
├─ 1.4 Spindle harmonics → resonance avoidance
├─ 1.5 Tool deflection limits → max allowable force
├─ 1.6 Chip morphology → evacuation verification
├─ 1.7 Coolant strategy → type/pressure/flow
├─ 1.8 Fixture force check → clamping vs cutting force
└─ 1.9 Process capability forecast → predicted Cpk

PHASE 2: BLOCK-BY-BLOCK OPTIMIZATION (PP-MS2)
├─ 2.1 Engagement analysis → ae/ap/θ/D_eff per block
├─ 2.2 Chip thinning compensation → adjusted fz
├─ 2.3 Adaptive feed → constant chip load/force/MRR/thermal
├─ 2.4 Corner detection → feed reduction at engagement spikes
├─ 2.5 Plunge/ramp detection → axial feed limiting
├─ 2.6 Wear progression → S/F derating over program life
├─ 2.7 Thermal tracking → cumulative heat → speed derating
└─ 2.8 Deflection-limited feed → force cap per block

PHASE 3: MOTION OPTIMIZATION (PP-MS3)
├─ 3.1 Toolpath smoothing → B-spline/Bezier/corner-round
├─ 3.2 Motion dynamics → achievable feed (accel/jerk/corner)
├─ 3.3 Look-ahead simulation → realistic feed profiles
├─ 3.4 Multi-axis kinematics → singularity/rotary limits
├─ 3.5 Controller feature injection → AICC/Cycle32/G187/etc
└─ 3.6 Machine geometric error compensation → volumetric HTM

PHASE 4: STOCHASTIC VERIFICATION (PP-MS4)
├─ 4.1 Monte Carlo process simulation → force/temp distributions
├─ 4.2 Uncertainty propagation → confidence intervals
├─ 4.3 Dimensional uncertainty → P(within tolerance)
├─ 4.4 Surface finish distribution → P(Ra > target)
├─ 4.5 Environmental variation → temp/humidity impact
├─ 4.6 Material batch variability → heat-to-heat spread
└─ 4.7 Process robustness score → Taguchi S/N ratio

PHASE 5: SAFETY + KNOWLEDGE (PP-MS4)
├─ 5.1 G-code safety analysis → 24 rules
├─ 5.2 Playbook rules → 296 rules, 42 categories
├─ 5.3 Tribal knowledge → 2,800+ tips, CAM-specific
├─ 5.4 Reliability check → Palmgren-Miner cumulative damage
├─ 5.5 Energy optimization → idle/coolant/spindle
└─ 5.6 Acoustic check → noise prediction + advisory

PHASE 6: OUTPUT GENERATION (PP-MS5)
├─ 6.1 G-code generation → 15 controller dialects
├─ 6.2 Controller parameter blocks → optimization codes
├─ 6.3 Probe routines → WCS/inspection/tool measure
├─ 6.4 Setup sheet → complete operator documentation
├─ 6.5 Analytics report → force/temp/wear/time/cost/CI
├─ 6.6 Cycle time estimate → machine motion model
└─ 6.7 Digital twin snapshot → predicted state for comparison
```

---

## New Engines

### 1. PostProcessorPipelineEngine (~1200L)
- Orchestrates all 35 stages across 7 phases
- Configurable stage enable/disable
- Stage dependency resolution
- Pipeline timing and progress events
- Actions: pp_run_full, pp_run_partial, pp_analyze, pp_configure, pp_reoptimize

### 2. ControllerDialectEngine (~2000L)
- 15 controller family dialects (Fanuc 0i/30i/31i, Siemens 840D/ONE, Heidenhain TNC640/7, Haas NGC, Mazak SmoothAi/G, Okuma OSP-P300/P500, Brother, Doosan, Hurco, Mitsubishi, Fagor)
- Canned cycle translation tables
- Work offset syntax maps
- Sub-program conventions
- Tool change sequences per ATC type
- Arc format rules, comment syntax, decimal formatting
- Safe start/end blocks per controller

### 3. FiveAxisPostEngine (~1500L)
- RTCP/TCPC per controller (G43.4/TRAORI/FUNCTION TCPM/G234)
- Rotary axis limit management and unwinding
- Inverse time feed (G93) calculation
- Linearization with user-configurable tolerance
- Coordinate system rotation (G68.2/CYCLE800/Plane Spatial)
- Singularity detection and management

### 4. PostProcessorVerificationEngine (~1000L)
- Controller grammar validation
- Travel limit verification against machine work volume
- Feed/speed sanity checking
- Sequence validation (tool order, coolant, work offsets)
- Backplot reconstruction and path deviation check

### 5. MachineSequenceEngine (~800L)
- Machine-specific startup/shutdown sequences
- Tool change sequences per ATC type
- Coolant management (flood/TSC/MQL/cryo)
- Spindle warm-up cycles

### 6. MultiChannelPostEngine (~1000L)
- Mill-turn channel synchronization
- Sub-spindle transfer sequences
- Swiss-type lathe support
- Multi-channel parallel cycle time tracking

---

## CAM System Integration

### Phase A: Inline (10 CAM systems with open post formats)
| CAM | Post Format | PRISM Bridge |
|-----|-------------|--------------|
| Fusion 360 | .cps (JS) | HTTP to PRISM server |
| Mastercam | .pst (text) | HTTP to PRISM server |
| NX | TCL script | HTTP to PRISM server |
| CATIA | PP table + VB | HTTP to PRISM server |
| SolidCAM | .gpp (text) | HTTP to PRISM server |
| PowerMill | .opt + macro | HTTP to PRISM server |
| GibbsCAM | .pit (text) | HTTP to PRISM server |
| CAMWorks | TechDB + config | HTTP to PRISM server |
| BobCAD | post config | HTTP to PRISM server |
| SprutCAM | CLData script | HTTP to PRISM server |

### Phase B: Re-optimization (ALL CAM systems including encrypted)
- hyperMILL, Tebis, Edgecam, any G-code source
- Parse output G-code → run pipeline stages 1-6 → write optimized G-code
- Preserves program structure, comments, custom M-codes
- CLI: `prism optimize input.nc --machine DMU50 --material 316L`

---

## HTTP API

```
POST /api/post-process          — full pipeline, returns optimized G-code
POST /api/post-process/resolve  — resolve context only (for UI preview)
GET  /api/post-process/machines — search machine catalog
GET  /api/post-process/materials — search material DB
GET  /api/post-process/tools    — search tool catalog
GET  /api/post-process/controllers — list controller dialects
GET  /api/post-process/health   — health + version
```

---

## Dependency Chain

```
PP-MS0 (Foundation)
  └→ PP-MS1 (Physics Stages)
       └→ PP-MS2 (Block-by-Block)
            └→ PP-MS3 (Motion + Controller Dialect)
                 └→ PP-MS4 (Stochastic + Safety)
                      └→ PP-MS5 (5-Axis + Output + Verification)
                           └→ PP-MS6 (Fusion .cps + HTTP API)
                                └→ PP-MS7 (Multi-CAM + Mill-Turn)
                                     └→ PP-MS8 (Integration + Benchmarks + Skills)
```

---

## Smart Defaults (Adaptive Input Handling)

| Missing Input | Default Source | Confidence |
|---|---|---|
| Material | Infer from operation or generic 4140 | 0.3-0.7 |
| Machine | Best-fit from 910 catalog | 0.5 |
| Tool | Auto-select from 46,590 tools | 0.6-0.9 |
| Holder | Auto-select for max stiffness | 0.7 |
| Coolant | Material + operation → playbook | 0.8 |
| Tolerance | ISO 2768-m (medium) | 0.5 |
| Surface finish | Operation-based (Ra 3.2/1.6/0.8) | 0.7 |
| Aggressiveness | 0.5 (balanced) | default |

---

## Deliverables Summary

- **6 new engines** (~7,500 lines)
- **30+ existing engines wired** into pipeline
- **35 active optimization stages** + 5 reporting stages
- **15 controller dialects**
- **10 CAM system post templates** + Phase B universal re-optimizer
- **HTTP API** with 7 endpoints
- **Fusion .cps** with full properties panel
- **4 slash commands** (/post-process, /post-optimize, /post-configure, /post-benchmark)
- **6 hookify rules**
- **200+ tests** (unit + integration + benchmarks)
- **Benchmark suite** quantifying improvement over constant S/F
