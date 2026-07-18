---
schema: ideablock-v1
title: "CAD geometry mathematics — NURBS, transforms, GD&T datums, tolerance zones, curvature"
domain: "CAD mathematics"
category: cad-math
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Piegl & Tiller "The NURBS Book"
  - ASME Y14.5-2018 (Dimensioning and Tolerancing) + Y14.5.1 (mathematical definition)
  - Machinery's Handbook 31e §Geometry + §GD&T
  - Mortenson "Geometric Modeling"
extracted_via: human-authored
extracted_at: 2026-05-21T15:40:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MATH-CAD-GEOMETRY)
---

## Question

The geometry mathematics under CAD — curves, surfaces, transforms, GD&T's mathematical definition, curvature — with the formulas a CAD/CAM engine needs.

## Answer (canonical — parametric geometry + the math of GD&T)

### 1. Homogeneous transforms

A point `[x y z 1]ᵀ` transformed by a 4×4 matrix. Translation, rotation, scale compose by matrix multiplication:
```
T(d) translation;  Rx,Ry,Rz rotations;  combined  M = T·Rz·Ry·Rx
```
Order matters — `R·T ≠ T·R`. Rotation about an arbitrary axis: translate axis to origin → rotate → translate back. Quaternions avoid gimbal lock for 3D rotation interpolation: `q = (cos(θ/2), sin(θ/2)·n̂)`; SLERP interpolates orientations smoothly.

### 2. Parametric curves — Bézier → B-spline → NURBS

**Bézier** of degree n: `C(u) = Σ Bᵢ,ₙ(u)·Pᵢ`, where `Bᵢ,ₙ` are Bernstein polynomials. Simple but global control (moving one point moves the whole curve).

**B-spline** — piecewise, local control via a knot vector. Basis functions `Nᵢ,ₚ(u)` from the Cox-de-Boor recursion:
```
Nᵢ,₀(u) = 1 if uᵢ ≤ u < uᵢ₊₁ else 0
Nᵢ,ₚ(u) = (u−uᵢ)/(uᵢ₊ₚ−uᵢ)·Nᵢ,ₚ₋₁ + (uᵢ₊ₚ₊₁−u)/(uᵢ₊ₚ₊₁−uᵢ₊₁)·Nᵢ₊₁,ₚ₋₁
```

**NURBS** (Non-Uniform Rational B-Spline) — adds a weight `wᵢ` per control point, making the curve *rational*:
```
C(u) = Σ Nᵢ,ₚ(u)·wᵢ·Pᵢ  /  Σ Nᵢ,ₚ(u)·wᵢ
```
The rational form is what lets NURBS represent conics *exactly* (a circle is a NURBS with specific weights — a polynomial B-spline can only approximate it). NURBS surfaces: tensor product `S(u,v) = ΣΣ Rᵢ,ⱼ(u,v)·Pᵢ,ⱼ`. NURBS is the universal CAD representation because one form covers lines, conics, free-form — exactly.

### 3. Curve/surface differential geometry

```
Tangent:   C'(u)
Curvature: κ = |C'×C''| / |C'|³           (radius of curvature ρ = 1/κ)
```
Surface curvature: principal curvatures `κ₁, κ₂`; Gaussian `K = κ₁·κ₂`; mean `H = (κ₁+κ₂)/2`. Curvature drives CAM — the ball-nose scallop height + the max stepover depend on local surface curvature; a tight concave radius limits the tool diameter.

### 4. GD&T — the mathematical definition (Y14.5.1)

A geometric tolerance defines a **tolerance zone** — a region the feature must lie within. The mathematical core:

| Control | Tolerance zone (math) |
|---|---|
| Position | Cylinder of diameter `t` about the true position axis |
| Flatness | Space between two parallel planes `t` apart |
| Cylindricity | Space between two coaxial cylinders, radial gap `t` |
| Profile | Space between two offset surfaces, ±t/2 from nominal |
| Perpendicularity | Zone (plane-pair or cylinder) `t`, oriented 90° to the datum |
| Runout | The FIM (full indicator movement) as the part rotates about the datum axis |

**Datum reference frame** — three mutually perpendicular planes (primary, secondary, tertiary) constrain the 6 DOF. Primary datum contacts ≥ 3 points (constrains 3 DOF), secondary ≥ 2 (constrains 2), tertiary ≥ 1 (constrains 1). The datums establish the coordinate system every tolerance is measured in.

### 5. Material condition modifiers — bonus tolerance

At **MMC** (maximum material condition), as a feature departs from MMC toward LMC, **bonus tolerance** is granted:
```
total_position_tolerance = stated_tolerance + |actual_size − MMC_size|
```
A hole at MMC (smallest) gets only the stated tolerance; the same hole larger gets the stated + the size departure. MMC is used where assembly (fit) is the concern — it mathematically guarantees a worst-case mating envelope.

### 6. Best-fit + feature extraction

A CMM measures a cloud of points; the feature (plane, cylinder, circle) is *fit* to them. Least-squares fit minimizes `Σdᵢ²` (Gaussian/LSQ — the default). Minimum-zone fit (Chebyshev) minimizes the *maximum* deviation — the mathematically correct fit for a tolerance-zone check per Y14.5.1, but harder to compute. The choice changes the reported error; aerospace specs often mandate minimum-zone.

Circle fit (algebraic, Kåsa): minimize `Σ(xᵢ²+yᵢ²+D·xᵢ+E·yᵢ+F)²` — linear least squares, fast; refine with a geometric (orthogonal-distance) fit for accuracy.

### 7. Geometric intersections + offsets

Line-plane, line-sphere, plane-plane (→ line) — the bread-and-butter of toolpath geometry. **Curve offset** (for cutter-comp + 2D contour): offset a curve by distance `d` along its normal — but offsets of NURBS are *not* NURBS in general (the offset of a circle is a circle, but the offset of a free-form curve must be re-approximated). This is why CAM offset paths carry tolerance.

### Anti-patterns

- **"A circle is a B-spline."** Only a *rational* one (NURBS with the right weights). Polynomial B-splines approximate circles — fine for display, wrong for a precision bore.
- **"LSQ fit is the right fit."** LSQ (Gaussian) is the default but the *minimum-zone* (Chebyshev) fit is what Y14.5.1 specifies for tolerance verification. They give different errors.
- **"Transform order doesn't matter."** `R·T ≠ T·R`. Rotate-then-translate ≠ translate-then-rotate. Always specify the order.
- **"GD&T position tolerance is a square zone."** Position is a *cylindrical* zone (diameter t). A square zone (±x, ±y) under-uses the diagonal by 1.41× — the cylindrical zone is the correct, larger, usable region.
- **"Ignore bonus tolerance."** At MMC, bonus tolerance is real usable capability. A stack-up that ignores it is over-conservative.

### Tie-ins

- [[part-setup-tolerance-stack-up-methods]] — tolerance-zone math feeds the stack
- [[quality-first-article-inspection-and-spc-cadence]] — best-fit + minimum-zone in CMM verification
- [[math-cam-toolpath-mathematics]] — NURBS + offsets in toolpath generation
- [[operation-ordering-datum-sequencing]] — the datum reference frame
- [[print-to-program-pipeline-canonical]] — GD&T extraction is pipeline stage 5

## Provenance

Distilled from Piegl & Tiller "The NURBS Book" + ASME Y14.5-2018 + Y14.5.1 (mathematical definition) + Machinery's Handbook 31e §Geometry §GD&T + Mortenson "Geometric Modeling". Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-CAD-GEOMETRY — **51st canonical entry**, Phase-A mathematical expansion (CAD domain). New `cad-math` category.

System injection: `tribal-by-domain-inject` + `master-index-precheck-inject` auto-surface on `NURBS`, `Bezier`, `B-spline`, `Cox-de-Boor`, `homogeneous transform`, `quaternion`, `curvature`, `GD&T`, `tolerance zone`, `datum reference frame`, `MMC`, `bonus tolerance`, `best-fit`, `minimum zone`, `Chebyshev fit`, `curve offset`, `Y14.5` keywords. Zero new wiring required.

## Cross-references

- [[part-setup-tolerance-stack-up-methods]] — tolerance-zone → stack
- [[quality-first-article-inspection-and-spc-cadence]] — best-fit in CMM
- [[math-cam-toolpath-mathematics]] — NURBS in toolpaths
- [[operation-ordering-datum-sequencing]] — datum frame
- [[print-to-program-pipeline-canonical]] — GD&T extraction stage
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
