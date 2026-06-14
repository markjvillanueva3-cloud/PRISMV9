---
schema: ideablock-v1
title: "Fixturing & workholding — 3-2-1 location, force/form closure, clamp-force & slip/tip analysis"
domain: "Workholding mechanics"
category: manufacturing-math
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Boothroyd & Knight "Fundamentals of Machining and Machine Tools"
  - ASME Y14.5 — datum reference frames
  - Machinery's Handbook 31e — jigs, fixtures, locating & clamping
  - Nee, Rahman et al. — computer-aided fixture design
  - Shigley "Mechanical Engineering Design" — friction, contact
---

## Question

How do you locate a part in exactly six degrees of freedom, compute the clamp
force that will hold it against the cut without slipping or tipping, and prove
the clamping itself won't distort the part — the complete workholding math.

## Answer (canonical — locate deterministically, clamp enough to not slip or tip, no more)

### 1. The 3-2-1 locating principle — constrain 6 DOF deterministically

A rigid body has 6 DOF (3 translation, 3 rotation). Deterministic location
uses **exactly** 6 point contacts, no more:
```
Primary datum plane:    3 points  → constrains 1 translation + 2 rotations
Secondary datum plane:  2 points  → constrains 1 translation + 1 rotation
Tertiary datum plane:   1 point   → constrains the last translation
                        ─────────
                        6 points  → 6 DOF, zero redundancy
```
The 3 primary points must be **spread wide** (large triangle) — the angular
location error of the part scales as `δ/L`, `δ` the locator height variation,
`L` the point spacing. More than 6 points is **over-constraint**: the part
rocks on whichever subset touches, and location stops being repeatable.

### 2. Force closure vs form closure

- **Form closure** — geometry alone removes all 6 DOF; the part cannot move
  even with zero friction (a fully kinematic nest). Rare, expensive.
- **Force closure** — locators remove DOF *toward* themselves; **clamps +
  friction** hold the part *against* the locators. Almost every real fixture.
  The clamp does not locate — it only preserves locator contact.

### 3. Static equilibrium — the workholding free body

The part under cut is a rigid body in equilibrium:
```
Σ F = 0 :   F_cut + W + Σ F_clamp + Σ R_locator = 0
Σ M = 0 :   Σ ( rᵢ × Fᵢ ) = 0          about any point
```
`F_cut` the cutting force (and its reaction torque), `W` weight, `F_clamp`
clamp forces, `R_locator` locator reactions. Two hard constraints on any valid
solution:
```
every R_locator · n̂ ≥ 0          (locators only push — contact is maintained)
|R_tangential| ≤ μ · R_normal     (no slip at any contact)
```
If a required `R_locator` goes **negative**, the part has lifted off that
locator — the fixture has failed even if nothing slipped.

### 4. Required clamping force — the slip condition

For a friction-held part, the clamp force must make total friction beat the
in-plane cutting force with a safety factor `S` (typically 2–3):
```
F_clamp ≥ ( S · F_cut,tangential − μ · ΣR_locator,normal ) / ( μ · n_clamp )
```
`μ` = contact friction coefficient (typical dry steel-on-steel ≈ 0.1–0.2 —
use the canonical value, do not over-credit friction), `n_clamp` the number of
clamps sharing the load. Under-clamping → the part walks; over-clamping →
distortion (§7). Both are failures.

### 5. The friction cone

At each contact the reaction `R` must lie inside the **friction cone** of
half-angle `φ`:
```
φ = atan(μ)            no slip  ⇔  |R_tangential| ≤ R_normal · tan(φ)
```
A reaction direction outside the cone means the surfaces are already sliding.
Form-closure points are exempt (geometry, not friction, holds them).

### 6. Slip and tip — two independent failure modes

A fixture must pass **both** checks; they fail at different clamp forces:
```
SLIP :  S · F_cut,tangential  ≤  μ · ( ΣF_clamp,normal + W_normal + ΣR_locator )
TIP  :  M_restoring  ≥  S · M_overturning
        M_overturning  = F_cut × (moment arm about the locator/clamp edge)
        M_restoring    = ( F_clamp + W ) × (their arms about the same edge)
```
A part can be slip-safe yet tip about a locator edge when the cut is high
above the support plane — long reach, deep pockets, tall parts.

### 7. Distortion under clamping — the clamp force is also a load

The clamp force `F_clamp` is itself a structural load. On a thin wall or an
unsupported span it deflects the part; machined to size while distorted, the
part springs back **out of tolerance** when released. Two consequences:
```
clamp deflection :  δ_clamp ≈ F_clamp / k_local      (local part stiffness)
contact stress   :  Hertzian — peak p₀ at a hard locator can brinell a soft part
```
Rule: clamp **over a locator** (force flows straight into support, span ≈ 0),
never over an unsupported span. For thin walls reduce `F_clamp` to the slip/tip
minimum and add support locators rather than more clamp force.

### 8. Locator & clamp placement as an optimisation

Given the cutting-force envelope over the toolpath, choose locator/clamp
positions to **minimise part deflection** (and keep all `R_locator ≥ 0`)
across every cut. Objective: minimise `max_t δ_part(t)`; variables: contact
positions; constraints: 3-2-1 determinism, accessibility, no over-constraint.
A small constrained optimisation — the fixture-layout problem.

### 9. Fixture error stack & the datum reference frame

Fixture-induced location error stacks: locator manufacturing tolerance +
wear + clamp-induced shift + repeatability. It feeds straight into the part
tolerance budget. The 3-2-1 datum planes **must coincide with the GD&T datum
reference frame** (Y14.5) — locating on a non-datum surface measures the part
from the wrong origin and silently consumes tolerance.

## Anti-patterns

- **Over-constraint** — 4 locators in one plane: the part rocks on whichever 3
  touch, location is no longer repeatable. Use exactly 3-2-1.
- **Clamping over an unsupported span** — the part is machined distorted and
  springs out of tolerance on release. Clamp over a locator.
- **Sizing clamp force by "tighten hard"** — over-clamping distorts soft/thin
  parts and brinells contacts; size it to the slip/tip minimum × safety.
- **Checking slip but not tip** — a tall part with a high cut tips about a
  locator edge while every contact is still slip-safe.
- **Locating on a non-datum surface** — the part is then measured from the
  wrong origin; fixture and GD&T datum frame must coincide.
- **Crediting optimistic friction** — `μ` for oily/coated surfaces collapses;
  size clamps for the low end of the `μ` range.

## Cross-references

- [[math-engineering-mechanics-of-materials]] — part stiffness, beam/plate deflection under clamp load, Hertzian contact
- [[math-cad-geometry-nurbs-gdt]] — the GD&T datum reference frame the 3-2-1 scheme must match
- [[math-cutting-mechanics-merchant-oxley]] — the cutting force `F_cut` the fixture must resist
- [[math-chatter-regenerative-stability]] — fixture/part stiffness sets the FRF, hence the chatter limit
- [[math-metrology-measurement-uncertainty]] — fixture error stack as a measurement-budget term

## Provenance

Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-FIXTURING — a Phase-A
mathematical-depth entry of the operator /goal ("expand wiki to mathematical,
statistical max"). Workholding is on the critical path of every setup yet had
no dedicated math entry. Confidence 0.96 — canonical 3-2-1 / force-closure /
static-equilibrium theory.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` +
`tribal-by-domain-inject` auto-surface this on `fixture`, `workholding`,
`clamp force`, `3-2-1 locating`, `force closure`, `form closure`, `slip`,
`tipping`, `friction cone`, `over-constraint`, `locator`, `datum reference
frame` keywords. Zero new wiring required.
