---
schema: ideablock-v1
title: "Engineering mechanics — stress/strain, beam deflection, buckling, fatigue, Hertz contact, thermal stress"
domain: "Engineering mathematics"
category: engineering-math
version_state: Current
confidence: 0.97
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Strength of Materials + §Mechanics
  - Timoshenko & Gere "Mechanics of Materials"
  - Shigley "Mechanical Engineering Design"
  - Roark's "Formulas for Stress and Strain"
extracted_via: human-authored
extracted_at: 2026-05-21T15:15:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MATH-ENGINEERING-MECHANICS)
---

## Question

The engineering-mechanics formulas that underlie machining rigidity, tooling stress, fixture design, and part-strength — stress, deflection, buckling, fatigue, contact, thermal — with units.

## Answer (canonical — the mechanics-of-materials toolkit for manufacturing)

### 1. Stress + strain

```
σ = F/A            [normal stress, Pa]        ε = ΔL/L     [strain, dimensionless]
τ = F/A            [shear stress]             γ = shear strain
σ = E·ε            [Hooke's law; E = Young's modulus]
τ = G·γ            [G = shear modulus = E/(2(1+ν)); ν = Poisson's ratio]
```
Principal stresses from the 2D state `(σx, σy, τxy)`:
```
σ₁,₂ = (σx+σy)/2 ± √[ ((σx−σy)/2)² + τxy² ]
```
**Von Mises** equivalent stress (the yield criterion for ductile metals):
```
σ_vm = √[ ½((σ₁−σ₂)² + (σ₂−σ₃)² + (σ₃−σ₁)²) ]      yield when σ_vm ≥ σ_y
```

### 2. Beam deflection — Euler-Bernoulli

For a beam of second moment of area `I`, modulus `E`:
```
EI · d⁴y/dx⁴ = w(x)            [governing equation; w = distributed load]
```
Cantilever, point load `P` at the free end (the boring-bar / endmill case):
```
δ_max = P·L³ / (3·E·I)         k = P/δ = 3·E·I / L³   [tip stiffness]
```
For a round section: `I = π·d⁴/64`. The **L³ and d⁴** are the load-bearing terms — stiffness falls with the *cube* of length and rises with the *fourth power* of diameter. Worked example: doubling stickout L drops stiffness 8×; this is the rigidity-envelope physics (see [[synthesis-rigidity-envelope]]).

Timoshenko beam adds shear deformation — matters when `L/d < ~10` (short, stubby beams), where Euler-Bernoulli over-predicts stiffness.

### 3. Buckling — Euler column

A slender column in compression fails by buckling, not crushing, above the critical load:
```
P_cr = π²·E·I / (K·L)²         [K = effective-length factor: 1.0 pinned-pinned, 0.5 fixed-fixed, 2.0 fixed-free]
```
Slenderness ratio `λ = K·L/r` where `r = √(I/A)` is the radius of gyration. Long columns (high λ) → Euler buckling; short columns → yield. The transition is the Johnson-Euler crossover.

### 4. Torsion of a shaft

```
τ_max = T·r / J               [T torque, r outer radius, J polar moment]
θ = T·L / (G·J)               [angle of twist, rad]
J = π·d⁴/32   (solid round)
```

### 5. Fatigue — S-N + Miner's rule

Cyclic loading fails below the static strength. The S-N (Wöhler) curve: stress amplitude `S` vs cycles-to-failure `N`. Basquin's law for the finite-life region:
```
S = σ'f · (2N)^b              [σ'f fatigue strength coefficient, b fatigue exponent]
```
Steels have an **endurance limit** `S_e` (~0.5·UTS, with surface/size/load correction factors) below which life is effectively infinite. Aluminum has no true endurance limit.

**Miner's rule** — cumulative damage under variable amplitude:
```
Σ (nᵢ / Nᵢ) = D ;   failure when D ≥ 1
```
`nᵢ` cycles applied at stress level `i`, `Nᵢ` cycles-to-failure at that level. **Mean-stress correction** (Goodman): `σa/S_e + σm/UTS = 1` adjusts the allowable alternating stress for a non-zero mean.

### 6. Hertz contact stress

Two curved bodies pressed together — the max contact pressure (the bearing / gear / locator-ball case):
```
For sphere-on-flat:  p_max = (3F)/(2π·a²),   a = [3F·R/(4E*)]^(1/3)
where 1/E* = (1−ν₁²)/E₁ + (1−ν₂²)/E₂
```
Hertz stress drives rolling-contact fatigue + locator wear. The subsurface shear maximum (~0.78·p_max, at depth ~0.48a) is where rolling-contact spalling initiates.

### 7. Thermal stress

A constrained body heated by `ΔT`:
```
σ_thermal = E·α·ΔT            [fully constrained; α = thermal expansion coefficient]
ΔL = α·L·ΔT                   [free expansion]
```
Worked example: steel (α≈12×10⁻⁶/°C, E=200 GPa) constrained, ΔT=50°C → σ = 200e9·12e-6·50 = 120 MPa — substantial. This is why fixtures must allow thermal growth and why a part clamped rigidly while heating distorts (see [[synthesis-thermal-envelope]]).

### 8. Pressure vessels (thin-wall)

```
σ_hoop = p·r/t              σ_long = p·r/(2t)        [thin-wall, t < r/10]
```
Hoop stress is twice longitudinal — why pressure vessels fail along a longitudinal seam.

### 9. Bolted joints

Preload `Fi`, external load `P`, joint stiffness `kc`, bolt stiffness `kb`:
```
Bolt load:  Fb = Fi + P·kb/(kb+kc)
Joint load: Fj = Fi − P·kc/(kb+kc)
```
The stiffer the clamped members relative to the bolt, the less of `P` the bolt sees — the principle behind proper preload + the reason a soft gasket ruins a joint.

### Safety factor

```
SF = strength / stress              (typ 1.5-2 ductile static, 3-4 fatigue/uncertainty, 10+ brittle/life-critical)
```

### Anti-patterns

- **"Use yield strength for the stress check."** Use von Mises equivalent stress vs yield — a uniaxial number can't gate a multiaxial state.
- **"Euler-Bernoulli always."** For `L/d < 10` it over-predicts stiffness; use Timoshenko (shear deformation matters for stubby tools/fixtures).
- **"Long bolt = strong joint."** Joint strength is about *preload* + the bolt/member stiffness ratio, not bolt length. A properly preloaded short bolt in stiff members beats a loose long one.
- **"Fatigue = static strength × a factor."** No — fatigue is a separate failure mode with its own curve. A part safe statically can fail in fatigue at a fraction of yield.
- **"Thermal stress is small."** E·α·ΔT for steel at 50 °C is 120 MPa — not small. Constrained thermal expansion is a real failure + distortion driver.

### Tie-ins

- [[synthesis-rigidity-envelope]] — beam-deflection `k = 3EI/L³` is the tool-stiffness physics
- [[synthesis-thermal-envelope]] — thermal stress + expansion
- [[workholding-clamp-force-and-selection]] — bolted-joint preload + Hertz contact at locators
- [[tooling-toolholders-and-runout-control]] — toolholder stiffness + stickout
- [[math-speed-feed-the-full-physics]] — cutting force is the load these formulas resist

## Provenance

Distilled from Machinery's Handbook 31e §Strength of Materials §Mechanics + Timoshenko & Gere "Mechanics of Materials" + Shigley "Mechanical Engineering Design" + Roark's "Formulas for Stress and Strain". Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-ENGINEERING-MECHANICS — **50th canonical entry**, Phase-A mathematical expansion (engineering domain). New `engineering-math` category.

System injection: `tribal-by-domain-inject` + `master-index-precheck-inject` auto-surface on `stress strain`, `von Mises`, `beam deflection`, `Euler-Bernoulli`, `Timoshenko`, `buckling`, `Euler column`, `torsion`, `fatigue`, `S-N curve`, `Miner's rule`, `Goodman`, `Hertz contact`, `thermal stress`, `pressure vessel`, `bolted joint`, `safety factor`, `mechanics of materials` keywords. Zero new wiring required.

## Cross-references

- [[synthesis-rigidity-envelope]] — beam-deflection physics
- [[synthesis-thermal-envelope]] — thermal stress
- [[workholding-clamp-force-and-selection]] — preload + Hertz contact
- [[tooling-toolholders-and-runout-control]] — holder stiffness
- [[math-speed-feed-the-full-physics]] — cutting force as the load
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
