---
schema: ideablock-v1
title: "Tool geometry & cutting edge — rake, relief, inclination, lead angle, nose radius, edge preparation"
domain: "Cutting tool geometry"
category: manufacturing-math
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Shaw "Metal Cutting Principles" — tool geometry & reference systems
  - ISO 3002 — geometry of the active part of cutting tools
  - Boothroyd & Knight "Fundamentals of Machining"
  - Machinery's Handbook 31e — single-point tool angles, tool signature
  - Sandvik Coromant — turning/milling geometry application guides
---

## Question

Every cutting tool is a set of angles and an edge preparation — rake, relief,
inclination, lead, nose radius, hone. What each one does, and the trade it
forces between cutting force, edge strength, surface finish and tool life.

## Answer (canonical — geometry sets force, strength, finish and life; every angle is a trade)

### 1. The reference systems — three ways to state the same angles

Tool angles are defined in a coordinate frame, and there are three in use:
```
ASA (tool-in-hand)  — frame fixed to the tool shank; used to grind/inspect the tool
ORS (orthogonal)    — frame at the active edge; the "tool-in-use" the work sees
NRS (normal)        — angles in the plane normal to the edge; for inclined edges
```
The same physical tool has different *numbers* in each system — always state
which. ISO 3002 standardises the tool-in-use (working) reference planes.

### 2. Rake angle γ — the force/strength dial

The rake face guides the chip. The single biggest force lever:
```
positive γ  → larger shear angle φ → thinner chip → lower cutting force,
              but a thin, weak edge — needs a tough, sharp tool
negative γ  → small φ → thicker chip → high force & power, but a strong edge
              backed by the tool body — for hard materials, interrupted cuts
```
Via Merchant, `φ` rises with `γ` (`2φ + β − γ = π/2`) — so more positive rake
directly thins the chip and cuts force. The choice is force vs edge survival.

### 3. Relief (clearance) angle α — keep the flank off the work

The relief angle holds the flank face clear of the freshly cut surface:
```
α too small → flank rubs → friction heat, rapid flank wear, poor finish
α too large → the wedge angle (90°−α−γ) shrinks → weak edge, chips
```
Typical 5–12° for turning; just enough to clear, no more.

### 4. Inclination angle λ_s — steer the chip and protect the tip

`λ_s` tilts the cutting edge out of the reference plane:
```
λ_s > 0  → chip flows away from the finished surface; first contact is BACK
           from the fragile nose → protects the tip on entry (good for
           interrupted cuts and scaled stock)
λ_s < 0  → chip flows toward the finished surface; first contact at the nose
```
It does not change force much — it changes *where* the edge is loaded and
*where the chip goes*.

### 5. Lead / approach angle κ_r — chip thinning & the force split

The lead (approach) angle sets how the edge meets the work:
```
actual chip thickness   h = f · sin(κ_r)        (f = feed per rev)
edge engagement length  b = ap / sin(κ_r)       (ap = depth of cut)
```
A **smaller `κ_r` thins the chip** — you can feed *faster* for the same chip
load, and the engagement spreads over a longer edge (lower wear per length).
It also shifts force from radial to axial. A 90° lead gives a pure radial/axial
split and is needed to turn to a square shoulder; a 45° lead is the strong,
chip-thinning general-purpose choice. Small `κ_r` also moves the
depth-of-cut notch off a single point — fighting notch wear.

### 6. Nose radius r_ε — the finish driver

The corner radius blends the major and minor edges. Theoretical finish:
```
Ra_theoretical ≈ f² / (32 · r_ε)
```
A bigger `r_ε` → much better finish (it falls as `1/r_ε`) and a stronger
corner — but it raises the **radial force**, which deflects slender work and
feeds chatter. Rule of thumb: `r_ε ≤ depth of cut`, else the cut is all corner
radius and the radial force dominates.

### 7. Effective (working) vs nominal angles

The angles the chip actually sees differ from the ground angles because of the
feed motion — the resultant cutting velocity is tilted by the helix/feed, so
the **working rake** ≈ nominal rake − feed-helix angle. At high feed-per-rev
relative to diameter this is not negligible.

### 8. Edge preparation — sharp, hone, T-land, chamfer

The micro-geometry of the edge itself, edge radius `r_β`:
```
sharp        — lowest force; chips in interrupted cuts / hard materials
hone (r_β)   — a rounded edge; strengthens it, but PLOUGHS once r_β approaches
               the chip thickness → the size effect, rubbing not cutting
T-land/chamfer — a small negative-land; maximum edge strength for roughing
               and interrupted cuts; raises force
```
Critical: if the **undeformed chip thickness drops below the edge radius
`r_β`**, the tool cannot form a chip — it rubs and ploughs (the same size
effect that makes grinding's specific energy explode). Match edge prep to the
chip load.

### 9. Chip-breaker geometry

A ground or pressed groove behind the edge curls the chip tighter than its
natural radius until it work-hardens and snaps. The breaker **land width** and
**back-wall** tune the breaking window to a feed/DOC range — outside that
window chips run long (too light a cut) or jam (too heavy).

### 10. The tool signature

A single-point tool's geometry is the 7-element ASA signature: back rake,
side rake, end relief, side relief, end cutting-edge angle, side cutting-edge
angle, nose radius — a complete, ordered specification of the tool.

## Anti-patterns

- **Negative rake on a low-power or non-rigid setup** — the high force the
  strong edge demands stalls the cut or pushes the part; use positive rake.
- **Too little relief** — the flank rubs, heats and wears fast; finish degrades.
- **Nose radius larger than the depth of cut** — the cut is all corner radius,
  radial force dominates, slender parts deflect and chatter.
- **A sharp edge in an interrupted cut** — it chips; hone or chamfer it.
- **Honed/chamfered edge with chip thickness below the edge radius** — the
  tool ploughs instead of cutting (size effect): heat, work-hardening, no chip.
- **Quoting an angle without its reference system** — ASA vs ORS numbers
  differ; "rake = 6°" is ambiguous.

## Cross-references

- [[math-cutting-mechanics-merchant-oxley]] — rake → shear angle → cutting force (the Merchant relation)
- [[math-speed-feed-the-full-physics]] — lead-angle chip thinning lets feed rise; nose radius vs finish
- [[math-chatter-regenerative-stability]] — nose radius & radial force feeding the chatter limit
- [[math-cutting-fluid-tribology]] — edge preparation choice for interrupted cuts
- [[math-grinding-abrasive-process]] — the same size effect (chip thickness vs edge radius) at the extreme

## Provenance

Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-TOOL-GEOMETRY — a Phase-A
mathematical-depth entry of the operator /goal ("expand wiki to mathematical,
statistical max"). Tool geometry is foundational to every cut yet had no
dedicated entry — `math-cutting-mechanics-merchant-oxley` covers the shear
*process*, not the tool's *angle systems*. Confidence 0.96 — canonical
ISO 3002 / Shaw tool-geometry theory.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` +
`tribal-by-domain-inject` auto-surface this on `tool geometry`, `rake angle`,
`relief angle`, `clearance`, `inclination angle`, `lead angle`, `approach
angle`, `nose radius`, `chip thinning`, `edge preparation`, `hone`, `T-land`,
`chip breaker`, `tool signature` keywords. Zero new wiring required.
