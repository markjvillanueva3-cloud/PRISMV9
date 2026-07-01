---
schema: ideablock-v1
title: "Machine-tool mathematics — kinematics, dynamics/FRF, volumetric accuracy, servo control"
domain: "Machine-tool mathematics"
category: machine-math
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Slocum "Precision Machine Design"
  - Altintas "Manufacturing Automation" (dynamics, servo)
  - ISO 230 series (machine-tool test code) + ISO 10791
  - Machinery's Handbook 31e §Machine Tool Accuracy
extracted_via: human-authored
extracted_at: 2026-05-21T17:15:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MATH-MACHINE-DOMAINS)
---

## Question

The mathematics of the machine tool itself — forward/inverse kinematics, structural dynamics (FRF), volumetric error, servo control — completing the Phase-A domain set.

## Answer (canonical — the machine as a kinematic chain + a dynamic structure + a controlled servo)

### 1. Kinematics — forward + inverse

A machine is a chain of joints (linear axes X/Y/Z, rotary A/B/C). **Forward kinematics**: given joint positions, compute the tool-tip pose — chain the homogeneous transforms `T = T₁·T₂·...·Tₙ`. **Inverse kinematics**: given a desired tool-tip pose, solve for joint positions.

For a 3-axis mill, IK is trivial (the axes ARE the coordinates). For 5-axis it's the rotary solve: given tool axis `(i,j,k)` on a table-table A-C machine:
```
A = acos(k)              C = atan2(j, i)
```
then the linear axes correct for the rotary pivot offset (the RTCP transform — see [[math-cam-toolpath-mathematics]]). The **singularity** is where the Jacobian loses rank — for A-C that's `k→1` (tool ∥ C-axis), where `C` is indeterminate.

The **Jacobian** `J` maps joint velocities to tool-tip velocity: `ẋ_tip = J·q̇`. Near a singularity `det(J)→0` — a finite tip velocity demands infinite joint velocity.

### 2. Structural dynamics — the FRF

The machine structure is a spring-mass-damper system. A single mode:
```
m·ẍ + c·ẋ + k·x = F(t)
ωₙ = √(k/m)              ζ = c/(2√(km))            [natural freq, damping ratio]
```
The **Frequency Response Function** `G(ω) = X(ω)/F(ω)` — how much the tool deflects per unit force at frequency ω:
```
G(ω) = 1 / (k − m·ω² + i·c·ω)
|G(ω)| peaks at ω ≈ ωₙ, amplified by Q = 1/(2ζ)
```
The FRF is measured by **tap testing** (impact hammer + accelerometer). It is the input to the stability-lobe calculation (see [[math-speed-feed-the-full-physics]] §9) — `ap_lim = −1/(2·Kc·Re[G(ω)])`. The machine's dynamic stiffness, not its static stiffness, sets the chatter limit.

### 3. Volumetric accuracy — the 21 error components

A 3-axis machine has **21 geometric error components**: each of 3 axes has 6 errors (3 linear: positioning + 2 straightness; 3 angular: roll, pitch, yaw) = 18, plus 3 squareness errors between axis pairs. The volumetric error at any point is the superposition.

**Abbe error** — the dominant amplification: an angular error `θ` at an offset `d` from the measurement scale produces a linear error:
```
ε_Abbe = d · θ            [d = Abbe offset; θ = angular error in rad]
```
A 10 μrad pitch error at a 200 mm Abbe offset = 2 μm of tool-tip error. Minimizing the Abbe offset (scale in line with the cut) is the single biggest precision-design lever — Slocum's "Abbe principle."

### 4. Thermal error

The machine grows with temperature (see [[math-engineering-mechanics-of-materials]] §thermal):
```
ΔL = α·L·ΔT
```
Spindle thermal growth: 5-50 μm Z-drift per °C of bearing-temperature rise. Column tilt, ball-screw extension all add. Thermal error is often the *largest* error source in a production day — bigger than the geometric 21. Mitigations: warm-up cycles, thermal-compensation models (sensor → predicted-growth → offset), temperature-controlled cells.

### 5. Servo control — the position loop

Each axis is a closed-loop servo. The classic cascade: position loop (P) → velocity loop (PI) → current loop. **Following error** (the lag between commanded + actual position) at constant feed:
```
ε_following = vf / Kv          [Kv = velocity gain / "servo stiffness"]
```
Higher `Kv` → less lag → tighter contour accuracy — but too high → instability. **Contour error** at a corner or arc comes from the *mismatch* of following errors between axes — if X and Y have different `Kv`, a 45° line bows. Axis `Kv` matching is a contouring-accuracy requirement.

**Feedforward** — predicting the command and pre-compensating — cancels most following error without raising `Kv` (and its instability risk).

### 6. Backlash + reversal

At a direction reversal, lost motion (backlash + the friction "stiction" reversal spike) produces a position error. On a ball-screw machine backlash is < 5 μm; on a worn acme leadscrew it can exceed 100 μm. Backlash drives the climb-vs-conventional safety decision (see [[machining-tactics-climb-vs-conventional-milling]]) and shows up as a quadrant glitch on a ballbar test (ISO 230-4).

### 7. Machine acceptance tests (ISO 230)

| Test | ISO | Measures |
|---|---|---|
| Positioning accuracy / repeatability | 230-2 | Linear axis error + repeatability |
| Ballbar (circularity) | 230-4 | Backlash, squareness, servo mismatch, stick-slip — all at once |
| Thermal | 230-3 | Drift under spindle + ambient heating |
| Spindle (rotation) | 230-7 | Spindle error motion (radial/axial/tilt) |
| Laser interferometry | — | The 21-component volumetric calibration |

### Anti-patterns

- **"Static stiffness sets the chatter limit."** No — *dynamic* stiffness (the FRF, `Re[G(ω)]`) does. A statically stiff machine with a lightly-damped mode still chatters. Tap-test for the FRF.
- **"More servo gain = better accuracy."** Up to the stability limit. Past it the axis oscillates. Feedforward gives the accuracy without the gain.
- **"Geometric calibration fixes accuracy."** It fixes the *geometric* 21 — but thermal error is often larger in a production day. Calibrate geometry AND manage thermal.
- **"Abbe offset is a detail."** It linearly amplifies every angular error. A small angular error at a large offset is a big tip error. Designing the scale in-line with the cut is the biggest precision lever.
- **"Backlash doesn't matter on a CNC."** On a ball-screw machine it's small; on a worn leadscrew it's large + it gates the climb-milling safety decision. Ballbar-test it.

### Tie-ins

- [[math-speed-feed-the-full-physics]] — the FRF feeds the stability-lobe limit
- [[math-cam-toolpath-mathematics]] — kinematics + RTCP + following-error in contouring
- [[math-engineering-mechanics-of-materials]] — structural stiffness + thermal stress
- [[synthesis-rigidity-envelope]] — the machine is one link of the rigidity chain
- [[synthesis-thermal-envelope]] — machine thermal drift
- [[machining-tactics-five-axis-fundamentals]] — Jacobian singularity
- [[machining-tactics-climb-vs-conventional-milling]] — backlash gates the decision

## Provenance

Distilled from Slocum "Precision Machine Design" + Altintas "Manufacturing Automation" + ISO 230 series + Machinery's Handbook 31e §Machine Tool Accuracy. Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-MACHINE-DOMAINS — **55th canonical entry**, **completes Phase-A** of the /goal mathematical expansion (8 domains: machining/speed-feed ×2, statistics, engineering, CAD, CAM, shop-floor, business, machine-domains). New `machine-math` category.

System injection: `tribal-by-domain-inject` + `master-index-precheck-inject` auto-surface on `machine kinematics`, `forward kinematics`, `inverse kinematics`, `Jacobian`, `FRF`, `frequency response`, `tap test`, `natural frequency`, `damping ratio`, `volumetric error`, `21 error components`, `Abbe error`, `thermal error`, `servo control`, `following error`, `Kv gain`, `backlash`, `ballbar`, `ISO 230` keywords. Zero new wiring required.

## Cross-references

- [[math-speed-feed-the-full-physics]] — FRF → stability lobe
- [[math-cam-toolpath-mathematics]] — kinematics + contouring
- [[math-engineering-mechanics-of-materials]] — structure + thermal
- [[synthesis-rigidity-envelope]] · [[synthesis-thermal-envelope]] — machine as a chain link
- [[machining-tactics-five-axis-fundamentals]] — singularity
- [[machining-tactics-climb-vs-conventional-milling]] — backlash
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
