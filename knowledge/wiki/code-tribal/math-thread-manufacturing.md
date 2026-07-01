---
schema: ideablock-v1
title: "Thread manufacturing — geometry, pitch diameter, infeed schedules, thread milling, tapping"
domain: "Threading"
category: manufacturing-math
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - ISO 68-1 / ISO 965 — ISO general-purpose metric thread profile & tolerances
  - ASME B1.1 — Unified Inch Screw Threads
  - Machinery's Handbook 31e — screw thread systems, three-wire measurement
  - Smith "Cutting Tool Technology" — threading operations
  - Sandvik Coromant — threading application guide (infeed methods)
---

## Question

The geometry of a thread and the math of cutting one — pitch diameter, the
infeed schedule for single-point threading, helical interpolation for thread
milling, and synchronized tapping.

## Answer (canonical — the pitch diameter is the controlled dimension; cut it in the right number of passes)

### 1. Thread geometry — the 60° profile

ISO metric and Unified threads share a 60° symmetric V. Key quantities, pitch
`P` (lead `L = P · n_starts`):
```
fundamental triangle height   H = P · √3 / 2 = 0.8660·P
external major diameter       d
external pitch diameter       d₂ = d − 0.6495·P        (= d − 3H/4)
external minor diameter       d₃ = d − 1.2269·P
helix angle at the PD         λ = atan( L / (π·d₂) )
```
The crest and root are truncated from the sharp triangle (1/8·H crest,
1/4·H root for ISO).

### 2. Pitch diameter — the controlled dimension & three-wire measurement

The **pitch diameter `d₂`** governs fit and strength — not the major
diameter. It is measured over three wires of diameter `w`:
```
M = d₂ + 3·w − 0.86603·P          (60° thread, measurement over wires)
best-wire size  w_best = P / (2·cos30°) = 0.57735·P     (contacts at the PD)
```
Pitch and flank-angle errors shift the *effective* (virtual) pitch diameter —
a thread can be in tolerance on `d₂` yet fail on gauge because pitch error
inflates the virtual PD.

### 3. Single-point threading — the infeed schedule

A thread is cut in many passes; the schedule sets how depth is added:
```
Radial infeed       — straight in; both flanks cut every pass. Simple but
                      poor chip control, doubles cutting width, bad on coarse P.
Flank (angle) infeed— feed along ~29.5° (just under the 30° flank); one flank
                      cuts → a clean coiled chip. Standard for medium/coarse P.
Modified flank      — alternating/incremental flank feed; best chip + even wear.
```
To keep the **chip cross-section roughly constant** pass to pass, depth is
added on a diminishing schedule:
```
total thread depth  h_t ≈ 0.6134·P            (external 60°)
depth at pass i of N (constant-area):  hᵢ = h_t · √(i / N)
```
so the first passes are deep and later passes shallow — equal load, no
overload on the finish passes.

### 4. Thread-cutting force

Cutting force grows with engaged width pass to pass; with a constant-area
schedule (§3) it is roughly level instead of escalating — that is the whole
point of the `√(i/N)` law. The last 1–2 passes are run at near-zero added
depth (spring passes) to clean the flanks.

### 5. Thread milling — helical interpolation

A thread mill (a multi-tooth cutter smaller than the hole) generates the
thread by **helical interpolation**: a full circular interpolation in XY plus
a simultaneous Z advance of exactly one pitch per 360°:
```
x = xc + R·cos θ,   y = yc + R·sin θ,   z = z₀ + (P/2π)·θ
```
`R` = (hole PD − cutter PD)/2. Advantages over single-point/tapping: one tool
for many diameters of the same pitch, no lead-in thread, blind holes to the
bottom, climb-cut control, and a broken-tool recovery (the tool is smaller
than the hole). Internal-thread cutter-radius compensation must account for
the helix, not just the circle.

### 6. Tapping — synchronized feed

A tap cuts an internal thread with the feed **rigidly synchronized** to
spindle rotation:
```
feed per revolution  f = P     (exactly — rigid tapping; any mismatch
                                 over/undercuts the flanks and breaks taps)
```
- **Cut tapping** removes chips — needs chip evacuation (spiral-flute for
  blind holes, gun/spiral-point for through holes).
- **Form (roll) tapping** displaces material plastically — no chips, a
  stronger grain-flow thread, but needs ~30 % more torque and a larger
  pre-drill (the minor diameter is *formed up*, not cut). Tap torque scales
  with engaged thread length and material flow stress.

### 7. Fit classes & tolerance

External 2A/3A (inch) or 6g/8g (metric); internal 2B/3B or 6H. The class sets
the **allowance** (a deliberate clearance, e.g. the `g` fundamental deviation)
and the tolerance band on `d₂`. Tighter class → finer pitch-diameter band →
more finish passes / better tool condition required.

### 8. Thread strength — engagement length

A threaded joint should fail in the bolt shank, not by stripping. The
engagement length for full strength balances the external-thread shear area
against the internal-thread shear area; for steel-in-steel ≈ 1×D engagement is
ample, soft materials (aluminium, plastic) need ≈ 2×D — hence thread inserts.

## Anti-patterns

- **Radial infeed on coarse pitches** — both flanks cut, chip control is poor,
  the insert deflects and chatters; use flank or modified-flank infeed.
- **Feed ≠ pitch in tapping** — a non-rigid tapping cycle that lets feed and
  rotation drift over/undercuts the flanks and snaps the tap; use rigid
  (synchronized) tapping.
- **Too few threading passes** — overloads the insert; too many → final passes
  rub and work-harden the flanks. Use the `√(i/N)` constant-area schedule.
- **Ignoring the helix angle** in single-point tool grind or thread-mill comp —
  insufficient side relief rubs the trailing flank.
- **Form tapping with a cut-tap drill size** — form tapping needs a larger
  pre-drill (it forms the minor diameter up); the wrong hole strips or jams.
- **Judging a thread by major diameter** — `d₂` (pitch diameter) is the fit
  dimension; gauge on it.

## Cross-references

- [[math-cad-geometry-nurbs-gdt]] — thread callouts and their tolerance on the drawing
- [[math-cutting-mechanics-merchant-oxley]] — the cutting force the infeed schedule keeps level
- [[math-cnc-interpolation-motion-control]] — helical interpolation (thread milling) & synchronized-feed tapping
- [[math-engineering-mechanics-of-materials]] — thread shear area, joint strength, engagement length
- [[math-speed-feed-the-full-physics]] — surface speed limits for threading inserts and taps

## Provenance

Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-THREADING — a Phase-A
mathematical-depth entry of the operator /goal ("expand wiki to mathematical,
statistical max"). Threading is on the critical path of most turned and many
milled parts; PRISM has a `prism_thread` dispatcher but no math wiki entry.
Confidence 0.96 — canonical ISO 68/965 + ASME B1.1 thread geometry.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` +
`tribal-by-domain-inject` auto-surface this on `thread`, `pitch diameter`,
`thread milling`, `tapping`, `rigid tapping`, `infeed schedule`, `flank
infeed`, `helix angle`, `three-wire measurement`, `form tapping`, `helical
interpolation`, `thread fit class` keywords. Zero new wiring required.
