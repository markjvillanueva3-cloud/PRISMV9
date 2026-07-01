---
type: "chat-session"
source: "claude-code-cli"
session_id: "72879035-e0ca-4192-9498-ed9720495151"
title: "You are a master CAD/mechanical-design expert. Enumerate, EXHAUSTIVELY, every CA"
date: "2026-06-12"
first_ts: "2026-06-12T14:34:43.297Z"
last_ts: "2026-06-12T14:35:55.179Z"
cwd: "H:\\prism-slot-india"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/workflows/wf_980af3a7-06e/agent-afa0d01a4778953bf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# You are a master CAD/mechanical-design expert. Enumerate, EXHAUSTIVELY, every CA

> **claude-code-cli** | 2026-06-12 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/workflows/wf_980af3a7-06e/agent-afa0d01a4778953bf.jsonl`

## Transcript

### User | 2026-06-12T14:34:43.297Z

You are a master CAD/mechanical-design expert. Enumerate, EXHAUSTIVELY, every CAD GENERATION technique in this lens. Be comprehensive to the point of pedantry — the goal is a denominator of "every single possible technique", so list even rare/specialty ones.

LENS: surface-freeform
FOCUS: SURFACE & FREEFORM modeling: NURBS/Bezier surfaces, ruled, lofted, swept, boundary/network, fill/patch, offset, extend, trim/untrim, knit/stitch, thicken, ruled, T-splines/subdivision/sculpt, direct/synchronous editing (push-pull, move face, delete face), morph, mesh-to-BREP/reverse-engineering, reference geometry (planes, axes, points, coordinate systems), curves (splines, projected, intersection, composite, helix, conic).

For EACH technique output one line: "<short-id> | <canonical-name> | <one-line what-it-does>". Group by sub-category. Aim for 30-80 techniques in this lens. Do NOT stop early. Output ONLY the list (no preamble).

### Assistant | 2026-06-12T14:35:55.179Z

surf-nurbs-bezier | NURBS surface | Builds a free-form surface from a control-point net with rational basis functions and per-direction knot vectors/degrees.
surf-bezier | Bezier surface | Non-rational tensor-product patch defined by a control-point grid with Bernstein basis (no internal knots).
surf-coons | Coons patch | Interpolates a surface bounded by four boundary curves, blending opposite edges.
surf-gordon | Gordon surface | Interpolates a bidirectional network of curves (generalized Coons over a curve mesh).
surf-bspline | B-spline surface | Non-rational tensor-product spline surface with piecewise-polynomial control over a knot grid.
surf-tspline | T-spline surface | NURBS-superset surface allowing T-junctions so control points need not span full rows/columns (local refinement).
surf-rational-conic | Rational/conic surface | Surfaces exactly representing conic cross-sections (cylinders, cones, spheres, tori) via rational weights.
surf-procedural | Procedural/analytic surface | Surface defined by an explicit math function z=f(u,v) or parametric equations rather than control points.

ext-extrude | Surface extrude | Sweeps a profile curve linearly along a direction/vector to create a tangent surface.
ext-revolve | Surface of revolution | Spins a profile curve about an axis to generate an axisymmetric surface.
ext-loft | Lofted/skinned surface | Interpolates a surface through a series of ordered profile/section curves.
ext-sweep-single | Single-rail sweep | Drives a profile along one guide/path curve to form a swept surface.
ext-sweep-dual | Two-rail/multi-rail sweep | Sweeps one or more profiles along two or more guide rails, morphing between them.
ext-ruled | Ruled surface | Connects two curves with straight-line rulings (developable or non-developable).
ext-developable | Developable surface | Generates a ruled surface that can unroll flat without stretching (zero Gaussian curvature).
ext-boundary | Boundary/curve-network surface | Builds a surface from a clo
... [+8861 chars truncated]
