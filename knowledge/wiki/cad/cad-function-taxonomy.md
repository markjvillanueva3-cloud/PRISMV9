---
title: CAD function taxonomy — every function class, mapped to PRISM's generation lanes
slug: cad-function-taxonomy
kind: cad
domain: cad
status: shipped
shipped_at: 2026-06-12
shipped_by: claude-f61fa6d7 (slot zulu, delta-galaxy population — operator "delta needs every single cad function knowledge available")
provenance: model-knowledge baseline cross-checked against in-repo engine surface (cad/CLAUDE.md engine list, CadQueryCodeGeneratorEngine, ap242 emitter); per-function programmatic coverage = build123d/CadQuery general capability, exec-verify pending quebec's kernel install
related:
  - cad-complex-assembly-archetypes
  - cad-text-to-cad-landscape
  - ui-fusion360-navigation
  - cad-foundations
---

# CAD function taxonomy — the complete function inventory

> **Queryable runtime sibling:** `CADOperationTaxonomyEngine` already serves machine-readable operation taxonomy via `prism_cad` actions `cad_taxonomy_{lookup,list,generate,aerospace,search,compatibility,validate,stats,suggest}` (cadDispatcher.ts:128-130) — including aerospace/complex-surface ops. THIS entry is the human/LLM knowledge index with **generation-lane coverage grades** the engine doesn't carry; use the engine for per-op detail, this table for "can our programmatic lane do it."

The master index of *every CAD function class* delta must know to generate arbitrary parts and assemblies. Per function family: what it does, whether PRISM's **programmatic kernel lane** (CadQuery/build123d on OpenCASCADE — the lane the Ollama text→CAD bridge emits) covers it, and where the PRISM engine surface touches it. Seat-specific command locations live in the `ui-*-navigation` entries; this is the seat-agnostic function knowledge.

Coverage legend: ✅ = programmatic lane does this today · ⚠ = possible but fragile/limited (OCC kernel quirks or weak control) · ❌ = not available programmatically (seat or new build required).

## 1. Sketch (2D profile) functions

| Function | Notes | Prog. lane |
|---|---|---|
| Line / arc / circle / ellipse / rectangle / polygon / slot / point | profile primitives | ✅ |
| Spline (NURBS through points / by CVs) / conic | degree, CVs, knots — math in [[math-cad-geometry-nurbs-gdt]] | ✅ (Spline/Bezier) |
| Text (for engraving) | font→outline curves | ⚠ (font dependency) |
| Constraints: coincident, tangent, parallel, perpendicular, concentric, collinear, horizontal/vertical, equal, symmetric, midpoint, fix | seats solve constraint systems; code-CAD states geometry **explicitly** instead — constraints become arithmetic | n/a by design |
| Dimensions: linear, angular, radial/diametral, driven | in code-CAD all dims are parameters — THE advantage for generation | ✅ (parameters) |
| Sketch ops: trim/extend/offset/project/intersect/mirror/pattern/fillet/chamfer | offset2D, mirror, PolarLocations/GridLocations cover the generative cases | ✅ |

**Key doctrine:** code-CAD replaces the constraint solver with explicit parametric arithmetic. A generator never "constrains then solves" — it computes coordinates from parameters. This is why dimensional intent must be fully resolved (units first!) before generation.

## 2. Solid creation

| Function | Notes | Prog. lane |
|---|---|---|
| Extrude (one/two-side, symmetric, to-face, taper) | the workhorse | ✅ (taper ⚠) |
| Revolve (full/partial) | turned parts | ✅ |
| Sweep (path / path+guide / twist) | pipes, springs, cams | ✅ (guide ⚠) |
| Loft (sections + rails / centerline) | transitions, aero | ✅ (rails ⚠) |
| Hole (simple / counterbore / countersink / tapped) | build123d has first-class Hole/CBoreHole/CSinkHole | ✅ |
| Thread (cosmetic vs modeled) | modeled = helix sweep, expensive; machining wants cosmetic + callout | ✅ both |
| Primitives (box/cylinder/sphere/torus/wedge/cone) | | ✅ |
| Coil / helix | springs, threads | ✅ |
| Rib / web / emboss | thin stiffeners; emboss = wrap-project | ⚠ (compose from extrude+boolean) |

## 3. Solid modification

| Function | Notes | Prog. lane |
|---|---|---|
| Boolean: union / cut / intersect | CSG core | ✅ |
| Fillet (constant radius) | OCC handles most; **the #1 kernel-failure point on complex edge chains — order matters, biggest first** | ✅⚠ |
| Fillet (variable / full-round / face) | | ⚠ |
| Chamfer (equal / 2-distance / angle-distance) | | ✅ |
| Shell (uniform, open faces) | thin-wall parts, housings | ✅⚠ (fails on tight curvature < wall thickness) |
| Draft | molds/castings demand it; OCC draft is the weakest major op | ⚠ (prefer designing taper INTO the extrude) |
| Scale (uniform/non-uniform) | mold shrinkage compensation | ✅ |
| Split body / face · offset face · replace face · delete face (direct edit) | healing + variant generation | ⚠ |
| Thicken (surface→solid) | | ✅ |
| Patterns: linear / circular / along path / at points · mirror | mass-instancing = how big assemblies stay cheap | ✅ |

## 4. Surface (open-shell) functions

| Function | Notes | Prog. lane |
|---|---|---|
| Extrude/revolve/sweep/loft as surface | | ✅ |
| Patch (n-sided fill) / boundary fill | | ⚠ |
| Trim / untrim / extend / stitch (sew) | sew faces → shell → solid | ✅⚠ |
| Offset surface / ruled surface / midsurface | | ⚠ |
| Continuity control (G0/G1/G2) | Class-A surfacing = G2+ everywhere; **beyond the programmatic lane today** — see archetypes entry | ❌ Class-A |

## 5. Assembly functions

| Function | Notes | Prog. lane |
|---|---|---|
| Component instancing (occurrence vs body) | one definition, N placements — THE scale mechanism | ✅ (cq.Assembly / build123d Compound + Location) |
| Joints/mates: rigid, revolute, slider, cylindrical, planar, ball, pin-slot | build123d RigidJoint/RevoluteJoint/LinearJoint...; CadQuery assembly constraints (Point/Axis/Plane) | ✅ static · ⚠ kinematic solve |
| Top-down skeleton / master model | layout sketch/surfaces drive component generators — **the canonical PRISM strategy for complex assemblies** | ✅ (it's just code structure) |
| In-context (cross-component) references | in code: pass skeleton parameters/geometry into each generator | ✅ |
| Component patterns | | ✅ |
| Interference / clearance check | `CollisionDetectionEngine` (⚠ SAFETY surface) + OCC common-volume | ✅ |
| BOM / structure export | STEP AP242 carries assembly tree (`NEXT_ASSEMBLY_USAGE_OCCURRENCE`) | ✅ |
| Configurations / variants | table-driven parameters → N variants — trivial in code-CAD | ✅ |
| Motion study / kinematic simulation | seat feature | ❌ (defer) |

## 6. Sheet metal

Flange · contour flange · bend/unfold/refold · flat pattern (k-factor) · hem · jog · corner relief. Programmatic: ⚠ — model the FOLDED solid ✅; flat-pattern development needs bend-allowance math (k-factor per material/tooling — keep in a data table, never inline). Seats own production flat patterns today.

## 7. Mold / die specific (JM-relevant)

| Function | Notes | Prog. lane |
|---|---|---|
| Draft analysis (pull direction) | face-normal vs pull vector classification | ✅ (math is simple per-face) |
| Parting line / parting surface | silhouette edge at pull direction → surface extension | ⚠ (simple parts ✅, freeform ❌) |
| Core/cavity split | boolean part (shrink-scaled) from insert blocks + parting surface | ✅ for machinable die work |
| Shrinkage scale | material-dependent factor — data-table lookup, NEVER inline | ✅ (scale op) |
| Cooling channels / ejector pins / runners·gates | parametric hole/pipe networks from layout points | ✅ |
| Slides / lifters | standard mechanisms from catalog dims | ✅ parametric |
| Electrode derivation (+ spark gap) | **PROVEN in PRISM** — `cad-generate-ejot-electrode-exact.mjs`, gap on burning surfaces ONLY (never shank) | ✅ |

## 8. Mesh / interrogation / annotation

Tessellate (B-Rep→mesh ✅ `BRepTessellatorEngine`) · mesh repair/simplify (`MeshEngine`) · mesh→B-Rep (⚠ hard) · measure/mass properties (✅) · section analysis (✅ boolean) · curvature/zebra/draft analysis (⚠ compute, no viz) · PMI/GD&T annotation (AP242 — representation vs presentation, see [[cad-foundations]]; emitter support is delta roadmap).

## How this taxonomy is used

1. **Generation planning:** the text→CAD lane (and delta's coming Seek-CAD refine loop) decomposes any request into functions from THIS table; ❌/⚠ rows trigger strategy substitution (e.g. design-in taper instead of post-draft) or seat handoff.
2. **Gap roadmap:** every ⚠/❌ row is a delta backlog candidate, priority-ordered by the archetypes in [[cad-complex-assembly-archetypes]].
3. **Training signal:** function-coverage per generated part = a measurable axis for india's closed-loop corpus (which functions appear, which fail) — pairs with the STEP-corpus composition signals (commit `22be177ec3`).
