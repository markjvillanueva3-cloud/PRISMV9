---
schema: ideablock-v1
title: "CNC interpolation & motion control — feed profiles, S-curve jerk limiting, look-ahead, contour error"
domain: "CNC motion control"
category: manufacturing-math
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Altintas "Manufacturing Automation" 2e — ch. 5 (CNC, interpolation, trajectory)
  - Koren "Computer Control of Manufacturing Systems"
  - Suh et al. "Theory and Design of CNC Systems"
  - Erkorkmaz & Altintas — quintic spline feed-rate scheduling
  - ISO 6983 (G-code) / RS-274
---

## Question

How does a controller turn a string of toolpath points into smooth, accurate
axis motion — interpolation, feed-rate profiling, jerk limiting, look-ahead —
and which error actually scraps the part.

## Answer (canonical — interpolate the path, profile the feed with bounded jerk, look ahead to corners)

### 1. Linear interpolation (G01)

A move from `P₀` to `P₁` is parametrised by arc length `s ∈ [0, L]`,
`L = ‖P₁−P₀‖`. Each axis is a fixed fraction of the path:
```
x(s) = x₀ + (Δx/L)·s        ẋ = v · (Δx/L)
```
`v = ds/dt` is the **path-tangential feed**; the axis velocities are its
direction cosines × `v`. The interpolator emits an axis set point every
interpolation period `τ_ipo` (commonly 0.5–4 ms).

### 2. Circular interpolation (G02/G03)

An arc of radius `R` swept at path speed `v` has angular rate `ω = v/R`:
```
x(t) = xc + R·cos(θ₀ + ω t)      y(t) = yc + R·sin(θ₀ + ω t)
```
A controller that approximates the arc by chords of length `c` incurs a
**chord (radius) error**:
```
e_chord = R − √(R² − (c/2)²) ≈ c² / (8R)
```
Smaller `τ_ipo` (shorter chords) shrinks it quadratically. True circular
interpolation evaluates the trig directly and has no chord error.

### 3. Feed along the path

The programmed feed `F` is the magnitude of `ds/dt`. Curvature converts it to
a **centripetal acceleration** the axes must supply:
```
a_n = v² · κ = v² / R          (κ = path curvature)
```
This is why feed must drop in tight arcs — `a_n` cannot exceed the axis limit.

### 4. Acceleration-limited (trapezoidal) feed profile

The simplest profile: ramp at `a_max`, cruise at `v`, ramp down. Ramp distance
and time:
```
t_ramp = v / a_max           d_ramp = v² / (2·a_max)
```
If `L < 2·d_ramp` the move is **triangular** — it never reaches `v`; the peak
speed is `v_peak = √(a_max · L)`. Trapezoidal motion has a *step* in
acceleration → infinite jerk → it rings the machine structure.

### 5. Jerk-limited (S-curve) feed profile

Bounding the **jerk** `j = da/dt ≤ j_max` removes the acceleration step. The
canonical profile is **7-segment**:
```
1 jerk-up    a: 0→a_max        4 cruise     a = 0, v = v_max
2 const accel a = a_max         5 jerk-up    a: 0→−a_max
3 jerk-down  a: a_max→0         6 const decel a = −a_max
                                7 jerk-down  a: −a_max→0
```
Bounded jerk → continuous acceleration → no impulsive excitation of the
structural modes → less following error, better finish, longer tool life.
Phase-1 duration `t_j = a_max / j_max`; the velocity gained in a jerk phase is
`½·j·t_j²`. Short moves collapse segments (no const-accel, or no cruise).

### 6. Look-ahead

The controller cannot decide the feed of the current block in isolation — it
must **decelerate before** an upcoming slow corner. A look-ahead buffer holds
the next `N` blocks; the scheduler back-propagates each corner's junction
velocity so the machine is already at the right speed on arrival. A buffer too
shallow for a fine-segment path causes **data starvation** — the feed dips
because the controller cannot see far enough to plan.

### 7. Junction (corner) velocity

At a corner between two segments the tangent direction jumps. Passing it at
finite speed requires either `v→0` or a small allowed **junction deviation**
`δ` (a rounded corner). The deviation-limited corner speed:
```
v_junction = √( a_max · δ · sin(θ/2) / (1 − sin(θ/2)) )
```
`θ` = the included turn angle (θ=π straight → `v_junction→∞`, no limit;
θ→0 hairpin → `v_junction→0`). This is the basis of "junction deviation" /
"corner rounding" / G64 path-blending.

### 8. Contour error vs following error — the one that scraps parts

- **Following (tracking) error** — lag *along* the path from the servo loop;
  on a straight cut at constant feed it offsets timing, not geometry.
- **Contour error** — deviation *normal* to the intended path. This is what
  is on the part. On multi-axis moves, unequal per-axis following errors
  combine into a contour error even when each axis is "in spec". **Cross-
  coupled control** feeds back the contour error directly rather than per-axis.

### 9. Interpolation period & resolution

The interpolator runs every `τ_ipo`; the minimum feed change it can resolve is
one position-resolution unit per `τ_ipo`. Very fine-segment NURBS-as-G01 paths
can demand more blocks/second than the controller digests → feed drops. The
fix is real **spline interpolation** (§10), not finer G01.

### 10. NURBS / spline interpolation

Modern controllers interpolate a NURBS curve directly (G06.2 / G05). The
challenge is **constant-feed parametrisation**: the curve parameter `u` is not
arc length, so the controller must reparametrise (`ds = ‖C'(u)‖ du`) or
feed-correct each step, else feed pulses as `‖C'(u)‖` varies. Direct spline
interpolation removes chord error and the fine-segment starvation of §9.

## Anti-patterns

- **Sharp corners at high feed** — the servo cannot turn instantly; contour
  error blooms. Allow corner rounding (junction deviation / G64) or drop feed.
- **Fine-segment G01 instead of splines** — starves look-ahead, the feed dips;
  use true spline interpolation.
- **Trapezoidal (no jerk limit) on a light/whippy machine** — the accel step
  rings the structure, marking the surface; use the S-curve profile.
- **Confusing following error with contour error** — tightening per-axis gains
  cuts following error but unequal axes still leave contour error; cross-
  couple instead.
- **Look-ahead buffer too shallow** for the path's segment density — silent
  feed-rate loss that looks like a "slow machine".

## Cross-references

- [[math-cam-toolpath-mathematics]] — generates the path this interpolator executes
- [[math-machine-domains-dynamics-kinematics-accuracy]] — the servo loop & structural dynamics that bound `a_max`, `j_max`
- [[math-speed-feed-the-full-physics]] — the commanded feed `F` that profiling must realise
- [[math-chatter-regenerative-stability]] — bounded jerk avoids impulsive excitation of the chatter modes
- [[math-engineering-mechanics-of-materials]] — axis/structure stiffness behind the following-error model

## Provenance

Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-MOTION-CONTROL — a Phase-A
mathematical-depth entry of the operator /goal ("expand wiki to mathematical,
statistical max"). Motion control is the execution-side math every controller
and post-processor lives in (CAM-toolpath covered path *generation*, not
*execution*); no dedicated entry existed. Confidence 0.96 — canonical
Altintas/Koren/Erkorkmaz trajectory-generation theory.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` +
`tribal-by-domain-inject` auto-surface this on `interpolation`, `motion
control`, `feed profile`, `S-curve`, `jerk limit`, `look-ahead`, `junction
velocity`, `corner rounding`, `contour error`, `following error`, `trajectory
generation`, `NURBS interpolation` keywords. Zero new wiring required.
