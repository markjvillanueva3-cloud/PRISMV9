# SCRUTINY-PP-AGI-PHYSICS-2026-04-15

## Physics Rigor Scrutiny Report for PP-AGI-MAXOUT-ROADMAP

**Scrutiny Pass:** 3 (Physics Rigor and Formula Grounding)
**Date:** 2026-04-15
**Scrutinized File:** `H:\prism\PP-AGI-MAXOUT-ROADMAP-2026-04-15.md`
**Status:** FINDINGS REQUIRING ATTENTION

---

## Executive Summary

The PP-AGI-MAXOUT roadmap proposes 6 Physics-Informed Neural Networks (PINNs) in Section 3.2. This scrutiny evaluates whether the physics foundations referenced are:
1. Correctly specified
2. Complete with all necessary correction factors
3. Backed by literature citations
4. Implemented in the existing codebase
5. Unit-consistent

**Overall Assessment:** The roadmap references solid foundational physics but has **gaps in specification completeness** and **missing physics models** that would be required for production-grade PINNs.

---

## PINN-by-PINN Analysis

### 1. Force PINN

**Roadmap Specification:**
```
Kienzle Fc = kc1.1 x ap x fz^(1-mc)
```

**EXISTING IMPLEMENTATION (KienzleForceModel.ts):**
```typescript
// Full equation: Fc = kc1.1 x h^(1-mc) x b x C_rake x C_edge
const Kc = kc1_1 * Math.pow(h, -mc);
const rakeCorrection = 1 - (rakeAngle - 6) * 0.01;
const edgeCorrection = (h < 3 * edgeRadius) ? 1 + 0.3 * Math.min(ratio, 1.0) : 1.0;
const Fc = Kc * b * h * rakeCorrection * edgeCorrection;
```

| Aspect | Roadmap | Implementation | Status |
|--------|---------|----------------|--------|
| Base formula | Kienzle | Kienzle | CORRECT |
| Rake angle correction | NOT MENTIONED | 1% per degree from 6 deg reference | GAP |
| Edge radius correction | NOT MENTIONED | Plowing regime at h < 3*re | GAP |
| 3-component decomposition | NOT MENTIONED | Fc, Ff, Fp with ratios | GAP |
| Lead angle adjustment | NOT MENTIONED | sin/cos transformation | GAP |

**MISSING PHYSICS:**
1. **Oblique cutting model** (Stabler's chip flow angle, inclination effects)
2. **Specific cutting pressure variation with speed** (at high speeds, kc decreases)
3. **Size effect** (kc increases at very small chip thicknesses beyond edge correction)

**LITERATURE GAPS:**
- Roadmap cites no source. Implementation cites Kienzle (1952), Altintas (2012), Sandvik Coromant.
- Missing: Kronenberg "Machining Science", Merchant force model for oblique cutting

**RECOMMENDATION:** Add oblique cutting model, size effect formula, speed-dependent kc correction.

---

### 2. Temperature PINN

**Roadmap Specification:**
```
Loewen-Shaw, Jaeger moving heat source
```

**EXISTING IMPLEMENTATIONS:**

1. **JaegerTempField.ts** (314 lines):
   - Implements Jaeger (1942) moving band heat source
   - Uses numerical integration with K0 Bessel function
   - Peclet number regimes (high Pe, intermediate, quasi-static)
   - Burn risk threshold at 600 deg C

2. **Shaw Cutting Temperature Model (F-THERMAL-001):**
   ```
   T = T0 + (0.754 x U) / (rho x cp) x sqrt((Vc x h) / k)
   ```

| Aspect | Roadmap | Implementation | Status |
|--------|---------|----------------|--------|
| Loewen-Shaw | MENTIONED | Partial (Shaw coefficient 0.754) | INCOMPLETE |
| Jaeger heat source | MENTIONED | Full implementation | CORRECT |
| Heat partition | NOT SPECIFIED | partition_ratio input (default 0.5) | GAP |
| White layer threshold | NOT SPECIFIED | Constants at 700-850 deg C | PRESENT |

**MISSING PHYSICS:**
1. **Loewen-Shaw partition factor** is mentioned but not fully implemented - the 0.754 coefficient is Shaw's simplification, but the full Loewen-Shaw (1954) partition model R = beta * sqrt(rho_t * c_t * k_t) / (rho_w * c_w * k_w) is absent
2. **Komanduri-Hou (2001)** 3D moving source model for end milling not present
3. **Chip-tool-workpiece partition** - current model uses fixed partition ratio, should be dynamically computed
4. **Secondary shear zone heating** - only primary deformation zone modeled

**LITERATURE:**
- Jaeger (1942) - cited and implemented
- Carslaw & Jaeger (1959) - cited
- Komanduri & Hou (2001) - cited but 3D model not implemented
- **MISSING:** Loewen & Shaw (1954) "On the Analysis of Cutting-Tool Temperatures"

**RECOMMENDATION:** Implement dynamic heat partition per Loewen-Shaw, add secondary shear zone.

---

### 3. Wear PINN

**Roadmap Specification:**
```
Taylor T = (C/Vc)^(1/n), Archard
```

**EXISTING IMPLEMENTATIONS:**

1. **ExtendedTaylorModel.ts** (502 lines):
   ```typescript
   T = (C x k_coat x k_temp x k_hard) / (Vc^(1/n) x f^a x ap^b)
   ```
   - Full extended Taylor with feed/depth exponents
   - Coating multipliers (TiN 1.3, TiAlN 1.5, diamond 3.0)
   - Temperature correction
   - Hardness correction

2. **UsuiWearModel.ts** (280 lines):
   ```
   dVB/dt = A x sigma_n x Vs x exp(-B/theta)
   ```
   - Diffusion-based wear prediction
   - Time integration
   - Break-in, steady-state, accelerated regime classification

| Aspect | Roadmap | Implementation | Status |
|--------|---------|----------------|--------|
| Taylor equation | MENTIONED | Full extended model | CORRECT |
| Archard wear | MENTIONED | NOT IMPLEMENTED | MISSING |
| Crater wear | NOT MENTIONED | UsuiWearModel has VB/KT ratio (0.4) | PARTIAL |
| Usui diffusion | NOT MENTIONED | Full implementation | PRESENT |

**MISSING PHYSICS:**
1. **Archard wear law:** V = K x W x L / H (volume = coefficient x load x sliding distance / hardness)
   - Not implemented anywhere in codebase
   - Critical for adhesive wear prediction
2. **Crater wear location** (KT distance from cutting edge per Trent)
3. **Notch wear** (important for superalloys) - absent
4. **Multi-mechanism wear** (combining adhesive + abrasive + diffusion)
5. **Takeyama-Murata (1963)** temperature-activated wear absent

**LITERATURE:**
- Taylor (1907) - cited
- ISO 3685:1993 - cited
- Usui (1984) - cited in UsuiWearModel
- **MISSING:** Archard (1953) "Contact and Rubbing of Flat Surfaces"
- **MISSING:** Trent & Wright "Metal Cutting" for crater wear mechanics

**RECOMMENDATION:** Implement Archard law, notch wear model, multi-mechanism coupling.

---

### 4. Deflection PINN

**Roadmap Specification:**
```
Euler-Bernoulli, Timoshenko beam
```

**EXISTING IMPLEMENTATION (ToolDeflectionModel.ts):**
```typescript
// I = pi x D^4 / 64
const I = (Math.PI * Math.pow(d, 4)) / 64;
// delta = F x L^3 / (3 x E x I)
const static_deflection = (cutting_force * Math.pow(L, 3)) / (3 * E * I);
// Dynamic factor (default 1.5)
const dynamic_deflection = static_deflection * dynamic_factor;
```

| Aspect | Roadmap | Implementation | Status |
|--------|---------|----------------|--------|
| Euler-Bernoulli | MENTIONED | Implemented (cantilever) | CORRECT |
| Timoshenko beam | MENTIONED | NOT IMPLEMENTED | MISSING |
| Dynamic amplification | NOT SPECIFIED | Fixed factor 1.5 | SIMPLIFIED |
| Runout | NOT SPECIFIED | Added to surface error | PRESENT |

**WHEN IS TIMOSHENKO NEEDED?**
- L/D < 10: Euler-Bernoulli sufficient (current implementation)
- L/D >= 10 OR thick beams: Timoshenko shear correction needed
- **Criterion:** kappa = 6(1+nu)/(7+6nu) for circular sections

**MISSING PHYSICS:**
1. **Timoshenko shear deformation:**
   ```
   delta_total = delta_bending + delta_shear
   delta_shear = F x L / (kappa x G x A)
   ```
   - Required for L/D > 10 (common in boring bars)
2. **Multi-section beams** (stepped tools with shank/flute transition)
3. **Tapered tool geometry** (typical in end mills)
4. **Receptance coupling** (tool-holder-spindle assembly)

**LITERATURE:**
- Altintas (2012) - cited
- Schmitz & Smith (2019) - cited
- **MISSING:** Schmitz RCSA (Receptance Coupling Substructure Analysis) for assembly deflection

**RECOMMENDATION:** Add Timoshenko shear correction for L/D > 10, implement multi-section beam model.

---

### 5. Chatter PINN

**Roadmap Specification:**
```
Altintas-Budak SLD, regenerative
```

**EXISTING IMPLEMENTATION (StabilityLobeDiagram.ts):**
```typescript
// SDOF Model: b_lim = -1 / (2 x Ks x Re[G(jw_c)])
// G(jw) = 1 / (K x (1 - r^2 + j x 2 x zeta x r))
const criticalDepth = denominator > 1e-9 ? 1 / denominator : 1000;
// Radial immersion correction (simplified)
const immersionFactor = 1 / (ae_D * (1 - Math.cos(Math.asin(Math.sqrt(ae_D)))));
```

| Aspect | Roadmap | Implementation | Status |
|--------|---------|----------------|--------|
| Altintas-Budak SLD | MENTIONED | SDOF simplified | PARTIAL |
| Regenerative chatter | MENTIONED | Basic model | PRESENT |
| Process damping | NOT MENTIONED | NOT IMPLEMENTED | MISSING |
| Multi-mode FRF | NOT MENTIONED | SDOF only | GAP |
| Variable pitch/helix | NOT MENTIONED | NOT IMPLEMENTED | MISSING |

**MISSING PHYSICS:**
1. **Process damping** (critical at low speeds):
   ```
   b_lim_actual = b_lim_classical + delta_b_process_damping
   ```
   - Indentation force at tool-workpiece interface
   - Tlusty (1978), Wu (1989), Altintas (2008) models
   - Neglecting this underestimates stability at low RPM by 30-50%

2. **Multi-degree-of-freedom (MDOF)** stability:
   - Current SDOF assumes single dominant mode
   - Real tools have multiple modes that couple
   - Requires FRF-based eigenvalue formulation

3. **Helix angle effects:**
   - Variable helix averages directional factors
   - Required for variable pitch/helix tools (chatter suppression)

4. **Mode coupling chatter** (different from regenerative):
   - X-Y mode interaction in milling
   - Not addressed in current model

**LITERATURE:**
- Altintas & Budak (1995) - cited
- Schmitz & Smith (2019) - cited
- **MISSING:** Altintas et al. (2008) "Analytical prediction of chatter stability in milling with process damping"
- **MISSING:** Tlusty & Polacek (1963) original stability criterion

**RECOMMENDATION:** CRITICAL - Add process damping model, implement MDOF stability with FRF input.

---

### 6. Surface PINN

**Roadmap Specification:**
```
Brammertz Ra = f^2/(32xr) + vibration
```

**EXISTING IMPLEMENTATION (SurfaceFinishPredictor.ts):**
```typescript
// Rt = f^2/(8R) + re/2 (peak-to-valley)
// Ra approx Rt/4 for regular periodic profiles
const Rt_mm = (f * f) / (8 * R) + re_mm / 2;
const Ra_ideal_um = Rt_um / 4;
// BUE correction (1-1.3x factor in BUE zone)
// Material correction (P=1.0, M=1.15, N=0.75, etc.)
// Vibration RSS combination
const Ra_composite = Math.sqrt(Ra_kinematic^2 + scallop^2 + vibration^2);
```

| Aspect | Roadmap | Implementation | Status |
|--------|---------|----------------|--------|
| Brammertz Ra | MENTIONED | f^2/(32R) equivalent | CORRECT |
| Vibration | MENTIONED | RSS combination | CORRECT |
| Edge radius | NOT SPECIFIED | re/2 term | PRESENT |
| BUE effect | NOT SPECIFIED | Speed-dependent factor | PRESENT |
| Scallop height | NOT SPECIFIED | Ball/barrel/flat models | PRESENT |

**FORMULA VERIFICATION:**
- Roadmap: Ra = f^2/(32xr)
- Implementation: Rt = f^2/(8R), Ra = Rt/4 = f^2/(32R) -- MATHEMATICALLY CONSISTENT

**MISSING PHYSICS:**
1. **Side flow** (material deformation at high feeds)
2. **Thermal damage contribution** (softened surface rougher)
3. **Tool wear progression effect** on Ra
4. **Chip re-deposition** (common in aluminum)

**LITERATURE:**
- Brammertz (1961) - cited
- Whitehouse (2002) - cited
- ISO 4287:1997 - cited

**STATUS:** Most complete of all PINNs - minor additions needed.

---

## Unit Consistency Analysis

### Current State

The codebase shows GOOD unit discipline with explicit annotations:

| Quantity | Units in constants.ts | Consistency |
|----------|----------------------|-------------|
| kc1.1 | N/mm^2 | CONSISTENT |
| Cutting speed | m/min | CONSISTENT |
| Feed | mm/rev or mm/tooth | CONSISTENT |
| Temperature | deg C (some K) | MIXED |
| Deflection | mm | CONSISTENT |
| Force | N | CONSISTENT |

**ISSUE:** Temperature uses both Celsius and Kelvin:
- White layer thresholds: deg C
- Johnson-Cook model: K
- Jaeger model: K (converts from C)

**RECOMMENDATION:** Standardize on Kelvin internally, accept both units at API boundary.

---

## Uncertainty Quantification

**CURRENT STATE:** Partial - `AtomicValue<T>` includes uncertainty percentage

```typescript
export function createAtomicValue<T>(
  value: T,
  unit: string,
  uncertaintyPct: number,
  source: string,
  confidence: number,
  calculation?: string
): AtomicValue<T>
```

**GAPS:**
1. No propagation rules (RSS for independent, linear for dependent)
2. No distinction between aleatory and epistemic uncertainty
3. No validation against experimental data

**RECOMMENDATION:** Implement uncertainty propagation per GUM (Guide to Uncertainty in Measurement).

---

## Safety Factor Application

**CURRENT STATE:** Present but inconsistent

| Engine | Safety Factor | Source |
|--------|---------------|--------|
| ToolDeflectionModel | 1.5 min, 2.0 critical | Hard-coded |
| ExtendedTaylorModel | Implicit via life margin | None specified |
| StabilityLobeDiagram | None | GAP |

**RECOMMENDATION:** Establish standard safety factors per criticality class.

---

## Summary of Missing Physics

### Critical (Required for Production PINNs)

| Model | Missing Element | Priority |
|-------|-----------------|----------|
| Chatter PINN | Process damping | P0-CRITICAL |
| Chatter PINN | MDOF stability | P0-CRITICAL |
| Wear PINN | Archard adhesive wear | P0-CRITICAL |
| Temperature PINN | Dynamic heat partition | P1-HIGH |
| Deflection PINN | Timoshenko shear | P1-HIGH |

### High Priority

| Model | Missing Element | Priority |
|-------|-----------------|----------|
| Force PINN | Oblique cutting model | P1-HIGH |
| Force PINN | Size effect correction | P1-HIGH |
| Wear PINN | Notch wear (superalloys) | P1-HIGH |
| Temperature PINN | 3D Komanduri-Hou | P2-MEDIUM |

### Medium Priority

| Model | Missing Element | Priority |
|-------|-----------------|----------|
| Surface PINN | Side flow / thermal damage | P2-MEDIUM |
| Deflection PINN | Multi-section beam | P2-MEDIUM |
| Wear PINN | Multi-mechanism coupling | P2-MEDIUM |

---

## Literature Gaps

The following citations are referenced in physics literature but NOT in the roadmap or codebase:

1. **Archard, J.F. (1953)** "Contact and Rubbing of Flat Surfaces" - REQUIRED for adhesive wear
2. **Loewen, E.G. & Shaw, M.C. (1954)** "On the Analysis of Cutting-Tool Temperatures" - REQUIRED for heat partition
3. **Altintas, Y. et al. (2008)** "Chatter stability in milling with process damping" - REQUIRED for low-speed stability
4. **Tlusty, J. & Polacek, M. (1963)** "The Stability of Machine Tools Against Self-Excited Vibrations" - Foundation reference
5. **Oxley, P.L.B. (1989)** "Mechanics of Machining" - Slip-line field theory
6. **Merchant, M.E. (1945)** "Mechanics of the Metal Cutting Process" - Orthogonal cutting foundation

---

## Recommended Physics Additions for Roadmap

### PP-AGI-MS4 (Physics-Informed Force/Temp PINN) should include:

1. Oblique cutting with Stabler's chip flow angle
2. Loewen-Shaw dynamic heat partition
3. Secondary shear zone heating
4. Size effect correction for micro-cutting

### PP-AGI-MS7 (Chatter PINN update required):

1. **Process damping module** - MANDATORY addition
2. MDOF eigenvalue stability with FRF input
3. Variable helix/pitch averaging
4. Mode coupling detection

### PP-TOOL-MS* (Tool Intelligence) should add:

1. Archard adhesive wear model
2. Notch wear model for ISO S materials
3. Multi-mechanism wear superposition

---

## Verdict

**ROADMAP PHYSICS SCORE:** 75/100

| Category | Score | Notes |
|----------|-------|-------|
| Formula correctness | 90% | Base formulas correct |
| Correction factors | 60% | Many missing (rake, edge, process damping) |
| Literature citations | 50% | Critical references missing |
| Unit consistency | 85% | Temperature C/K mixed |
| Uncertainty quantification | 40% | Present but incomplete |
| Safety factors | 50% | Inconsistent application |

**CRITICAL PATH RECOMMENDATION:**
Before implementing PINNs, address the **P0-CRITICAL** gaps:
1. Process damping in Chatter PINN (affects all low-speed machining)
2. Archard wear law (affects adhesive wear dominant materials)
3. MDOF stability (affects all multi-mode tools)

---

*Generated by PRISM Scrutiny Pass 3 - Physics Rigor Analysis*
*Agent: Claude Opus 4.5*
*Timestamp: 2026-04-15T[auto]*
