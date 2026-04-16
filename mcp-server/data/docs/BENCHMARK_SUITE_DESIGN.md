# PRISM Benchmark Suite — Exhaustive Validation Design
Generated: 2026-03-16

## Mission
Prove mathematically that every PRISM output is correct, and that PRISM produces demonstrably better CNC programs than any CAM software defaults. Test EVERY feature with EVERY variable combination.

## Architecture: 5-Layer Testing Pyramid

### Layer 1: Synthetic Benchmark Parts (15 canonical parts × parametric sweeps)
### Layer 2: Mathematical Formula Proofs (every formula, known-answer verification)
### Layer 3: Cross-Engine Consistency (N engines computing same thing must agree)
### Layer 4: End-to-End Pipelines (print→CAD→CAM→program→simulate→verify)
### Layer 5: Real-World Benchmarks (beat CAM programmer defaults)

## Test Volume Targets

| Category | Combinations | Tests Per | Total |
|----------|-------------|-----------|-------|
| Speed/Feed (6 ISO groups × 8 ops × 12 diameters × 5 machines × 3 DOC) | 8,640 | 1 | 8,640 |
| Post-Processor (20 dialects × 15 parts × 3 complexity levels) | 900 | 1 | 900 |
| Deflection (12 diameters × 8 overhangs × 6 materials × 3 loads) | 1,728 | 1 | 1,728 |
| Surface Finish (8 processes × 6 materials × 5 feed rates × 5 nose radii) | 1,200 | 1 | 1,200 |
| Thermal Compensation (5 machine types × 4 temp deltas × 3 axes) | 60 | 1 | 60 |
| Stability Lobes (6 tool configs × 6 materials × 10 RPM points) | 360 | 1 | 360 |
| Tool Life Taylor (6 ISO groups × 5 speeds × 4 tool materials) | 120 | 1 | 120 |
| Tolerance Stack (10 stack configs × 3 methods: WC/RSS/MC) | 30 | 1 | 30 |
| Monte Carlo Convergence (10 engines × 4 sample sizes) | 40 | 1 | 40 |
| Cross-Engine Consistency (5 physics paths × 15 parts) | 75 | 1 | 75 |
| E2E Pipeline (15 parts × 5 machines × 20 dialects) | 1,500 | 1 | 1,500 |
| Machine-Specific (910 machines × top 3 operations) | 2,730 | 1 | 2,730 |
| **TOTAL** | | | **~17,393** |

## Benchmark Parts (15 Canonical + Parametric Variants)

Each part tested across:
- 6 material groups (P-steel, M-stainless, K-cast iron, N-aluminum, S-superalloy, H-hardened)
- 5 machine classes (hobby/benchtop/mid-range VMC/production HMC/5-axis)
- 3 tolerance tiers (general ±0.1mm, precision ±0.025mm, ultra-precision ±0.005mm)

### Parts BP-001 through BP-015
(see main design in conversation)

## Machine Coverage Matrix

Must test across ALL machine archetypes:

| Machine Type | Count in DB | Test Coverage Target |
|-------------|------------|---------------------|
| 3-axis VMC (Haas, DMG, Mazak) | ~300 | 50 representative |
| 5-axis (DMU, Hermle, Grob) | ~100 | 30 representative |
| HMC (Mazak, Makino, OKK) | ~80 | 20 representative |
| Lathe/Turning (Haas, Mazak, Okuma) | ~120 | 30 representative |
| Mill-Turn/Swiss (Star, Citizen, Tsugami) | ~50 | 15 representative |
| Grinder (Studer, Kellenberger, Okamoto) | ~40 | 10 representative |
| EDM (Sodick, Makino, AgieCharmilles) | ~30 | 10 representative |
| Hobby CNC (Shapeoko, Tormach, GRBL) | 28 | 28 (all) |
| Cobots (UR, FANUC CRX, ABB GoFa) | 12 | 12 (all) |
| **Total** | 910+ | **205 machines tested** |

## Formula Verification Matrix

Every formula independently verified against hand calculation:

| Formula | Engine | Reference | Tolerance |
|---------|--------|-----------|-----------|
| Kienzle Fc = kc1.1 × ap × fz^(1-mc) | SpeedFeedOrchestrator | Machinery's Handbook | ±2% |
| Taylor T = (C/Vc)^(1/n) | SpeedFeedOrchestrator | Machinery's Handbook | ±5% |
| Deflection delta = FL^3/3EI | Multiple (5 engines) | Beam theory | ±1% |
| Ra = f^2/(32r) | SurfaceFinish | ISO 4287 | ±5% |
| Merchant phi = pi/4 - beta/2 + gamma/2 | ChipMorphology | Merchant 1945 | Exact |
| J-C sigma = (A+Be^n)(1+Cln(edot))(1-T*^m) | Superalloy | Johnson-Cook 1983 | ±5% |
| Tsai-Hill (s1/X)^2 - s1s2/X^2 + (s2/Y)^2 + (t/S)^2 | Composites | Tsai-Hill | ±5% |
| Faraday MRR = MI/(zFrho) | ECM | Faraday's law | ±1% |
| Preston MRR = kpv | Lapping | Preston 1927 | ±5% |
| EOQ = sqrt(2DS/H) | PartFamilyEcon | Wilson 1934 | Exact |
| Archard V = K*Fn*s/H | Wear | Archard 1953 | ±5% |
| Hertz p_max = (6FE*^2/pi^3R^2)^1/3 | Burnishing | Hertz contact | ±3% |
| G-ratio G = Vmat/Vwheel | Grinding | Malkin 2008 | ±10% |
| L10 = (C/P)^p × 10^6 | BearingLoad | ISO 281 | ±2% |
| Thermal delta = alpha*dT*L | ThermalGrowth | ISO 230-3 | ±1% |
| Abbe eps = eps_scale + L*sin(theta) | ErrorBudget | Slocum | ±1% |
| Shaw MRR USM | Ultrasonic | Shaw model | ±10% |
| Finnie erosion E = Kmv^n*f(alpha) | AJM | Finnie | ±10% |
| ... (499 formulas total) | | | |
