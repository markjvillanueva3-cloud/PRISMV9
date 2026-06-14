---
schema: ideablock-v1
title: "CAM toolpath mathematics — offsets, scallop, interpolation, feedrate optimization, post-processor kinematics"
domain: "CAM mathematics"
category: cam-math
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §CNC + §Interpolation
  - Marciniak "Geometric Modelling for Numerically Controlled Machining"
  - Altintas "Manufacturing Automation" (feed scheduling)
  - ISO 6983 (G-code) + ISO 14649 (STEP-NC)
extracted_via: human-authored
extracted_at: 2026-05-21T16:00:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MATH-CAM-TOOLPATH)
---

## Question

The mathematics CAM uses to turn a CAD surface into a toolpath — offsets, scallop, interpolation, feedrate scheduling, and the post-processor kinematic transforms.

## Answer (canonical — geometry → toolpath → optimized feed → controller G-code)

### 1. Cutter-contact vs cutter-location

CAM computes two related curves:
- **CC (cutter-contact) point** — where the tool touches the part surface.
- **CL (cutter-location) point** — the tool *center/tip* position the controller actually commands.

For a ball-nose on a surface with unit normal `n̂`: `CL = CC + r·n̂` (the center is one tool radius along the surface normal). For a flat endmill the offset depends on the contact geometry. The CL path is what gets posted to G-code.

### 2. Scallop height — the finishing-stepover law

Adjacent passes of a ball-nose leave a cusp (scallop) between them. For stepover `s`, tool radius `r`, on a flat surface:
```
h_scallop = r − √(r² − (s/2)²)        ≈ s²/(8r)   for s ≪ r
```
Inverted — stepover for a target scallop:
```
s = 2·√(2·r·h − h²)   ≈ 2√(2rh)
```
Worked example: r = 3 mm, target h = 0.005 mm → s ≈ 2√(2·3·0.005) = 2√0.03 = 0.346 mm. On curved surfaces the *effective* radius changes — convex regions need smaller stepover, concave allow larger. CAM scales `s` by local curvature.

### 3. Circular interpolation — G02/G03

The controller interpolates an arc from `(X0,Y0)` to `(X1,Y1)` given center offset `(I,J)` or radius `R`. The arc must be geometrically consistent: the start + end must be equidistant from the center. **Arc-fit tolerance** — a free-form curve is approximated by arcs (or lines) within a chord tolerance `ε`; tighter `ε` → more blocks → larger program but smoother motion. NURBS interpolation (G05/G06.2 on capable controls) feeds the spline directly — fewer blocks, smoother.

### 4. Chord-tolerance + linearization

A curve linearized into segments has a chord error:
```
ε_chord = R − R·cos(Δθ/2) ≈ R·Δθ²/8
```
For a target chord tolerance, the max angular step `Δθ = 2√(2ε/R)`. Small-radius features need many short segments — the source of huge G-code files. The trade is program size vs surface smoothness.

### 5. Feedrate scheduling — the cornering problem

Commanded feed `vf` is the *steady-state* target. The machine cannot step velocity instantly. **Trapezoidal** profiling ramps `vf` with bounded acceleration `A`:
```
distance to reach vf:  d_accel = vf²/(2A)
```
If a move is shorter than `2·d_accel`, the machine never reaches commanded feed — the "starvation" that makes small features cut slower than programmed. **S-curve** (jerk-limited) profiling bounds the *derivative* of acceleration → smoother, less machine excitation, slightly slower.

**Corner deceleration** — at a sharp direction change, the feed must drop so the centripetal acceleration `v²/ρ` stays within the machine limit:
```
v_corner = √(A_max · ρ)        [ρ = corner blend radius]
```
A true sharp corner (ρ→0) forces a full stop. This is why CAM-applied corner rounding + look-ahead matters. **Look-ahead** — the controller reads N blocks forward, plans the velocity profile so it decelerates *before* a corner instead of overshooting.

### 6. Constant-engagement / adaptive feed

In adaptive (trochoidal) toolpaths, the radial engagement `ae` varies through corners. Holding *chip load* constant means modulating feed:
```
fz_effective ∝ √(D/ae)         [chip-thinning — see math-speed-feed]
vf_corner = vf_nominal · (ae_nominal/ae_corner)   [first-order, to hold MRR/force]
```
Modern CAM computes the instantaneous engagement along the path and schedules `vf` so cutting force stays bounded — converting a fixed-feed program into a force-controlled one.

### 7. Post-processor kinematics — 5-axis

The post converts CL data (tool tip + tool axis vector) into machine axis commands. For a table-table 5-axis with rotary `A` + `C`:
```
Given tool axis (i,j,k):   A = acos(k),   C = atan2(j, i)
Then the linear axes are corrected for the rotary offset (the RTCP transform)
```
**RTCP** (G43.4/TCPM) makes the *control* do this transform live — the program carries tool-tip coordinates + axis vector, the control solves `A,C` + the linear compensation. Without RTCP the post must bake in the kinematics (machine-specific, fragile). The **singularity**: when `k→1` (tool axis ∥ C-axis), `atan2(j,i)` is indeterminate — a small tool-axis change demands a huge C move (see [[machining-tactics-five-axis-fundamentals]]).

### 8. Cycle-time estimation

```
t_cut = Σ (segment_length / vf_effective_segment)   + Σ t_rapid + Σ t_toolchange + Σ t_dwell
```
The honest estimate accounts for accel/decel (segments shorter than `2·d_accel` never reach `vf`), corner decel, and look-ahead. A naive `length/feed` estimate underestimates cycle time by 10-40 % on feature-dense parts.

### Anti-patterns

- **"CL = CC."** Only for a point tool. For a ball-nose, CL = CC + r·n̂; for a flat endmill the offset is contact-geometry dependent. Posting CC as CL gouges.
- **"Tighter chord tolerance is always better."** Tighter ε → more blocks → bigger program → can starve the look-ahead buffer → the machine actually runs *slower/jerkier*. Match ε to the finish requirement.
- **"Programmed feed = actual feed."** Accel/decel + corner decel mean small features cut well below commanded feed. Cycle-time estimates must model the velocity profile.
- **"Scallop is constant for a fixed stepover."** Effective radius changes with surface curvature — convex needs tighter stepover for the same scallop. CAM scales it; a fixed stepover gives variable finish.
- **"The post is just a formatter."** For 5-axis the post does the kinematic transform (or relies on RTCP). A wrong kinematic model = crash. The post is geometry, not formatting.

### Tie-ins

- [[math-cad-geometry-nurbs-gdt]] — NURBS + offset geometry feeding CAM
- [[math-speed-feed-the-full-physics]] — chip-thinning + force the feed schedule respects
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — strategies these formulas implement
- [[machining-tactics-five-axis-fundamentals]] — RTCP + singularity
- [[machining-tactics-gcode-safety-and-macros]] — the G-code these formulas emit
- [[cam-engine-wiring-bridge]] — the prism_cam engines computing this

## Provenance

Distilled from Machinery's Handbook 31e §CNC §Interpolation + Marciniak "Geometric Modelling for NC Machining" + Altintas "Manufacturing Automation" feed scheduling + ISO 6983 + ISO 14649. Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-CAM-TOOLPATH — **52nd canonical entry**, Phase-A mathematical expansion (CAM domain). New `cam-math` category.

System injection: `tribal-by-domain-inject` + `master-index-precheck-inject` auto-surface on `toolpath math`, `cutter contact`, `cutter location`, `scallop height`, `stepover`, `circular interpolation`, `chord tolerance`, `linearization`, `feedrate scheduling`, `trapezoidal profile`, `S-curve`, `look-ahead`, `corner deceleration`, `post processor kinematics`, `RTCP`, `cycle time estimation` keywords. Zero new wiring required.

## Cross-references

- [[math-cad-geometry-nurbs-gdt]] — geometry feeding CAM
- [[math-speed-feed-the-full-physics]] — force/chip-thinning the feed respects
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — strategy implementations
- [[machining-tactics-five-axis-fundamentals]] — RTCP + singularity
- [[machining-tactics-gcode-safety-and-macros]] — emitted G-code
- [[cam-engine-wiring-bridge]] — prism_cam engine wiring
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
