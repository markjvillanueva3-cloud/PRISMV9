---
schema: ideablock-v1
title: "Cutting mechanics — Merchant circle, shear-angle, Oxley's slip-line model, cutting temperature"
domain: "Machining mathematics"
category: machining-math
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - M. E. Merchant (1945) — "Mechanics of the Metal Cutting Process"
  - P. L. B. Oxley (1989) — "Mechanics of Machining: An Analytical Approach"
  - M. C. Shaw — "Metal Cutting Principles"
  - Loewen & Shaw (1954) — cutting temperature analysis
  - Machinery's Handbook 31e §Cutting Mechanics
extracted_via: human-authored
extracted_at: 2026-05-21T14:30:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MATH-CUTTING-MECHANICS)
---

## Question

What is the analytical physics of chip formation — the Merchant circle, shear angle prediction, Oxley's model, and cutting temperature — the math under the empirical Kienzle `kc`?

## Answer (canonical — the orthogonal cutting model and its forces, angles, and temperatures)

### Orthogonal cutting — the idealized model

The analytical treatment idealizes cutting as **orthogonal** (2D): the cutting edge is perpendicular to the cutting velocity, chip flows in the plane. Real cutting is oblique (3D) but orthogonal theory gives the governing physics; oblique adds the inclination angle as a correction.

Key geometric variables:
- `α` — rake angle (positive = tool leans away from cut)
- `t1` — uncut chip thickness (the feed projected); `t2` — deformed chip thickness
- `φ` — shear angle (the plane the chip shears along)
- `r_c = t1/t2` — chip thickness ratio (always < 1; the chip is thicker + shorter than the uncut layer)

### Shear angle from the chip ratio

```
tan(φ) = (r_c · cos α) / (1 − r_c · sin α)
```
Measure `t1` (known from feed) and `t2` (measured from a chip sample), get `r_c`, solve for `φ`. The shear angle is the single most important derived quantity — small `φ` means a thick chip + high forces; large `φ` means a thin chip + low forces + efficient cutting.

### Shear strain in the primary zone

The chip undergoes intense shear on the shear plane. The shear strain `γ`:
```
γ = cos α / ( sin φ · cos(φ − α) )
```
Typical values γ = 2-5 — far beyond any tensile-test strain. This is why machining chips are heavily work-hardened and why cutting forces don't follow handbook yield strength: the material at the shear plane is deforming at strain 2-5, strain-rate 10³-10⁵ /s, and elevated temperature simultaneously.

### The Merchant force circle

Merchant resolved the cutting forces onto a circle. The measurable forces are `Fc` (cutting, along Vc) and `Ft` (thrust, perpendicular). From these, the force on the shear plane `Fs`, the normal force `Fn`, the friction force on the rake `F`, and the normal `N`:

```
Fs = Fc·cos φ − Ft·sin φ                    [force along the shear plane]
Fn = Fc·sin φ + Ft·cos φ                    [normal to the shear plane]
F  = Fc·sin α + Ft·cos α                    [friction force on the rake face]
N  = Fc·cos α − Ft·sin α                    [normal force on the rake face]
μ  = F/N = tan β                             [β = friction angle on the rake]
```

The shear stress on the shear plane (a material property, ~constant for a given material):
```
τ_s = Fs / A_s = Fs · sin φ / (b · t1)       [A_s = shear-plane area]
```

### Merchant's minimum-energy shear angle

Merchant postulated the shear angle adjusts to **minimize cutting energy**. Minimizing gives:
```
2φ + β − α = π/2          →     φ = π/4 − β/2 + α/2
```
This says: increase rake angle `α` → shear angle `φ` increases → thinner chip → lower force. And reduce friction `β` (better coating, coolant) → `φ` increases → lower force. The Merchant relation explains *why* sharp positive-rake tools + low-friction coatings cut with less force. (Real materials deviate — the Merchant prediction is a clean idealization; Lee-Shaffer and Oxley refine it.)

### Oxley's predictive model — beyond Merchant

Merchant treats the shear zone as a single plane. Oxley's **parallel-sided shear zone** model treats it as a zone of finite thickness, couples the mechanics with the material's strain / strain-rate / temperature constitutive behavior (a Johnson-Cook-type flow stress), and solves iteratively. Oxley predicts forces, shear angle, and temperature *from material properties alone* — no empirical `kc` needed. It is the basis of modern predictive machining models. PRISM's `cutting_physics_ext_oxley` action implements it.

The Johnson-Cook flow stress (the constitutive law Oxley + FEA models use):
```
σ = [A + B·εⁿ] · [1 + C·ln(ε̇/ε̇₀)] · [1 − ((T−T_room)/(T_melt−T_room))^m]
```
- `[A + B·εⁿ]` — strain hardening
- `[1 + C·ln(ε̇/ε̇₀)]` — strain-rate hardening
- `[1 − T*^m]` — thermal softening
A, B, C, n, m are material constants — canonical in `physics/constants.ts`, never inline.

### Cutting temperature — Loewen & Shaw

Most cutting energy becomes heat. The mean shear-plane temperature rise:
```
ΔT_shear = (1 − Λ) · (Fs · Vs) / (ρ · c · A_s · Vc · ... )     [Λ = fraction conducted into workpiece]
```
More usefully, the **rake-face (tool-chip interface) temperature** governs crater wear + coating survival. Loewen-Shaw partition the heat between chip, tool, and work; the interface temperature can reach 700-1100 °C in steel — which is exactly the coating-service-ceiling range (see [[synthesis-thermal-envelope]]). The non-dimensional thermal number `R = ρ·c·Vc·t1/k` (a Péclet number) sets how much heat convects away with the chip vs conducts into the tool: high R (fast cut) → most heat leaves with the chip.

### Velocities — the kinematic relations

```
Vc  — cutting velocity (tool relative to work)
Vs  = Vc · cos α / cos(φ − α)        [shear velocity, along the shear plane]
Vch = Vc · sin φ / cos(φ − α)        [chip velocity, along the rake; = Vc·r_c]
```
The chip moves slower than the tool (`Vch < Vc`) because it's thicker — mass conservation: `t1·Vc = t2·Vch`.

### From analytical model back to Kienzle

The empirical Kienzle `kc = kc1.1·h^(-mc)` (see [[math-speed-feed-the-full-physics]]) is the *engineering shortcut* for the analytical chain above. The `h^(-mc)` size effect emerges from the analytical model because at small `t1` the secondary (rubbing) zone is a larger fraction of the total — thin chips spend proportionally more energy on ploughing/rubbing than shearing. Kienzle is Oxley's physics, curve-fit to a power law. Use Kienzle for fast engineering; use Oxley/FEA when you need temperature, residual stress, or to predict a material with no `kc1.1` data.

### Anti-patterns

- **"Cutting force ∝ yield strength."** No — the shear-plane material is at strain 2-5, strain-rate 10³-10⁵/s, elevated temperature. Use the dynamic flow stress (Johnson-Cook), not the static yield.
- **"The shear plane is a plane."** It's an idealization. Oxley's finite-thickness zone is more accurate; FEA shows a curved, graded zone. Merchant's single plane is a useful first model, not the truth.
- **"Merchant predicts the shear angle exactly."** It predicts the *trend* (φ rises with α, falls with β). Real materials deviate — Merchant over/under-predicts by 5-15°. Use it for intuition, Oxley/empirical for numbers.
- **"Temperature doesn't matter for force."** It does — thermal softening (`[1−T*^m]`) reduces flow stress, which reduces force. Force and temperature are coupled; that's why Oxley solves them together.

### Tie-ins

- [[math-speed-feed-the-full-physics]] — the Kienzle/Taylor engineering layer this model underlies
- [[synthesis-thermal-envelope]] — Loewen-Shaw heat partition + coating ceilings
- [[tooling-tool-life-and-wear-management]] — crater wear is rake-face-temperature driven
- [[tooling-coatings-and-substrates-deep-dive]] — coatings manage the rake-face temperature
- [[machining-tactics-chip-control-and-evacuation]] — chip ratio + chip form

## Provenance

Distilled from Merchant (1945) "Mechanics of the Metal Cutting Process" + Oxley (1989) "Mechanics of Machining" + Shaw "Metal Cutting Principles" + Loewen & Shaw (1954) cutting-temperature analysis + Machinery's Handbook 31e §Cutting Mechanics. Johnson-Cook constants canonical in PRISM `physics/constants.ts`. Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-CUTTING-MECHANICS — **48th canonical entry**, second of the Phase-A mathematical-depth expansion.

System injection: `tribal-by-domain-inject` + `master-index-precheck-inject` auto-surface on `cutting mechanics`, `Merchant circle`, `shear angle`, `shear plane`, `Oxley model`, `orthogonal cutting`, `chip ratio`, `shear strain`, `Johnson-Cook`, `flow stress`, `cutting temperature`, `Loewen Shaw`, `rake face temperature`, `friction angle` keywords. Zero new wiring required.

## Cross-references

- [[math-speed-feed-the-full-physics]] — the engineering layer (Kienzle/Taylor) above this model
- [[synthesis-thermal-envelope]] — heat partition + coating ceilings
- [[tooling-tool-life-and-wear-management]] — crater wear physics
- [[tooling-coatings-and-substrates-deep-dive]] — coatings vs rake-face temperature
- [[machining-tactics-chip-control-and-evacuation]] — chip ratio + form
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
