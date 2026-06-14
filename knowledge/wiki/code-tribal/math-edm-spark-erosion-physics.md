---
schema: ideablock-v1
title: "EDM spark-erosion physics — the discharge, energy per pulse, MRR, recast/HAZ, wire-EDM"
domain: "Electrical discharge machining"
category: manufacturing-math
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - McGeough "Advanced Methods of Machining" — EDM theory
  - Ho & Newman — state of the art in EDM (review)
  - Jameson "Electrical Discharge Machining"
  - ISO 28640 / shop practice — wire-EDM multi-pass strategy
  - Machinery's Handbook 31e — electrical discharge machining
---

## Question

EDM removes metal with sparks, no mechanical force — how a single discharge
erodes a crater, what sets the material-removal rate, why finish and MRR
fight each other, and what the recast layer costs.

## Answer (canonical — thermo-electric erosion; energy per spark sets both MRR and roughness)

### 1. The process — thermo-electric, contactless

Tool electrode and workpiece are submerged in a **dielectric** and held a few
tens of micrometres apart — they never touch. A pulsed voltage breaks the
dielectric down into a **plasma channel**; the intense local heat melts and
vaporises a tiny crater in *both* surfaces. Removal is by melting/boiling, not
shear — so hardness is irrelevant (EDM cuts hardened steel as easily as soft).

### 2. The single discharge cycle

```
ignition delay  — voltage rises, dielectric ionises, a channel forms
discharge (t_on)— plasma column conducts; current I_e flows; metal melts/boils
pulse off (t_off)— current stops, channel collapses, dielectric flushes the
                   debris and de-ionises ready for the next strike
```
`t_on` and `t_off` are the primary settings. Duty and frequency:
```
pulse frequency  f = 1 / (t_on + t_off)
duty factor      τ = t_on / (t_on + t_off)
```

### 3. Energy per spark

During the discharge the gap voltage is roughly constant (`U_g ≈ 20–25 V`,
set by the plasma); the energy delivered to one spark is:
```
E_spark = ∫ u·i dt ≈ U_g · I_e · t_on
```
`I_e` = discharge current. Energy per spark is *the* lever — it sets crater
size, hence both MRR and roughness.

### 4. Crater volume & material-removal rate

Each spark removes a crater whose volume scales with the spark energy
(`V_crater ∝ E_spark^k`, k ≈ 0.7–1). The removal rate is craters × rate ×
efficiency:
```
MRR ≈ V_crater · f · η
```
`η` < 1 — much melted metal re-solidifies in place rather than flushing away.
MRR rises with `I_e`, `t_on` and `f`, but `η` falls as the gap loads with
debris — there is a practical ceiling.

### 5. Pulse generators

- **RC (relaxation)** — a capacitor charges then dumps; simple, but pulse
  energy is uncontrolled. Legacy / fine-finish niche.
- **Transistor (iso-pulse)** — switched rectangular pulses of controlled
  `I_e`, `t_on`, `t_off`. The modern standard — every parameter independent.

### 6. The finish-vs-MRR trade — fundamental

Bigger sparks (more `E_spark`) dig deeper craters → **more MRR but a rougher
surface**:
```
Ra  ∝  E_spark^(~1/3)            roughness grows with spark energy
MRR ∝  E_spark · f               removal grows faster
```
You cannot have fast *and* fine in one setting — this is why EDM is run as a
**rough cut then trim/skim passes** (§10), not a single pass.

### 7. Recast layer & heat-affected zone

Melted metal not flushed away re-solidifies on the surface as the **recast
(white) layer** — hard, brittle, micro-cracked. Below it lies a **heat-
affected zone** with **tensile residual stress**. Consequences:
- roughing leaves a thick recast layer (tens of µm);
- the HAZ tensile stress is a **fatigue-life killer** on dynamic parts;
- finish/trim passes exist largely to *remove* the previous pass's recast.
A fatigue-critical EDM'd part must have the recast verified removed.

### 8. The spark gap & the servo

The gap (typically 10–50 µm) must be held precisely. The servo advances or
retracts the electrode to keep the **average gap voltage** at a target:
```
gap too small → short circuit / DC arcing → surface damage, electrode burn
gap too large → open circuit → no discharge, zero MRR
```
The servo reads gap voltage as the proxy for gap width and rides the edge.

### 9. Flushing — clear the debris or arc

Eroded debris must leave the gap between pulses. If it accumulates the
discharge degrades from a clean spark to a **DC arc** that stays in one place
and craters the surface (and breaks wires). Flushing: pressure or suction
through the gap, or **jump cycles** that periodically retract the electrode to
pump fresh dielectric in.

### 10. Wire-EDM specifics

Wire-EDM uses a **continuously fed wire** electrode (brass/coated, used once
and discarded — it erodes too):
- **Wire lag / bow** — the discharge pressure bows the wire *back* from the
  programmed path; on corners and arcs this leaves a radius/taper error. The
  control compensates, and trim passes correct it.
- **Wire tension** — higher tension reduces lag and improves accuracy but
  risks wire breakage; it is a controlled trade.
- **Multi-pass strategy** — a fast **rough (main) cut** for the bulk, then one
  or more **skim/trim passes** at low energy that take a few µm each to reach
  final size, finish and accuracy and to strip the recast.
- **Wire breakage** — over-current, poor flushing or a debris-arc snaps the
  wire; auto-rethreading recovers it.

## Anti-patterns

- **Maxing energy for MRR, then needing many trim passes** — the rough recast
  is deep, the trims are slow; the net job is slower and the surface worse.
- **Poor flushing** — debris turns sparks into DC arcs that crater the surface
  and break wires; fix flushing before raising energy.
- **Ignoring wire lag on corners** — programmed sharp corners come out radiused
  and tapered; allow the control's lag compensation + a trim pass.
- **Leaving recast on a fatigue part** — the tensile HAZ and micro-cracks
  initiate fatigue; verify recast removal or add a finishing pass.
- **Tracking the gap by feel** — the servo must ride average gap voltage;
  open- and short-circuit pulses both mean zero good removal.

## Cross-references

- [[math-speed-feed-the-full-physics]] — the EDM analogue: pulse energy & frequency vs MRR (the parameter trade)
- [[math-metrology-measurement-uncertainty]] — recast-layer thickness & residual-stress measurement
- [[math-engineering-mechanics-of-materials]] — the HAZ tensile residual stress and its fatigue cost
- [[math-cad-geometry-nurbs-gdt]] — wire-lag corner/taper error vs the drawing tolerance
- [[math-grinding-abrasive-process]] — the other thermal-dominated process; recast vs grinding burn

## Provenance

Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-EDM — a Phase-A
mathematical-depth entry of the operator /goal ("expand wiki to mathematical,
statistical max"). Wire-EDM is one of PRISM's three core domains, yet the
`math-*` series had no spark-erosion physics entry (the WEDM wiki holds
operator know-how; this is the process-physics math companion). Confidence
0.95 — canonical McGeough/Ho-Newman EDM theory.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` +
`tribal-by-domain-inject` auto-surface this on `EDM`, `wire EDM`, `spark
erosion`, `electrical discharge`, `discharge energy`, `pulse on time`,
`recast layer`, `heat-affected zone`, `spark gap`, `flushing`, `wire lag`,
`trim pass`, `dielectric` keywords. Zero new wiring required.
