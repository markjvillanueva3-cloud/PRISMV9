---
type: "chat-session"
source: "claude-code-cli"
session_id: "72879035-e0ca-4192-9498-ed9720495151"
title: "You are building the CANONICAL, deduplicated taxonomy of EVERY POSSIBLE CAD GENE"
date: "2026-06-12"
first_ts: "2026-06-12T14:36:45.193Z"
last_ts: "2026-06-12T14:39:37.452Z"
cwd: "H:\\prism-slot-india"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/workflows/wf_980af3a7-06e/agent-ace99c3de486a29f5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# You are building the CANONICAL, deduplicated taxonomy of EVERY POSSIBLE CAD GENE

> **claude-code-cli** | 2026-06-12 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/workflows/wf_980af3a7-06e/agent-ace99c3de486a29f5.jsonl`

## Transcript

### User | 2026-06-12T14:36:45.193Z

You are building the CANONICAL, deduplicated taxonomy of EVERY POSSIBLE CAD GENERATION TECHNIQUE, merging these 4 lens enumerations. Dedupe synonyms (e.g. "fillet" == "round"), keep the most standard name, preserve specialty techniques, and ORGANIZE into clear categories (sketch-based, placed-features, patterns, boolean, surface, freeform/direct, sheet-metal, weldment, mold/tooling, assembly, 2D-drawing, import/repair, reference-geometry, curves, specialty).

LENS ENUMERATIONS:
### parametric-feature
parametric-feature CAD generation techniques, exhaustively enumerated by sub-category:

SKETCH-BASED ADDITIVE
PF-EXT | Extrude (Pad/Boss-Extrude) | Linearly projects a closed sketch profile through a distance to add material.
PF-EXTTHIN | Thin-Feature Extrude | Extrudes an open or closed profile with a wall thickness offset instead of a solid fill.
PF-EXTUPTO | Extrude Up-To (Up-To-Surface/Next/Vertex) | Extrudes until terminated by a referenced face, vertex, plane, or next body.
PF-EXTSYM | Symmetric/Midplane Extrude | Grows material equally in both directions from the sketch plane.
PF-EXTTAPER | Tapered/Drafted Extrude | Adds a draft angle to the side walls during the extrusion.
PF-REV | Revolve (Revolved Boss) | Sweeps a profile about an axis through an angle to create rotational solids.
PF-REVTHIN | Thin Revolve | Revolves a profile with a wall-thickness offset for tubular/shell rotational parts.
PF-SWEEP | Sweep | Drives a profile along a 2D/3D guide path to add material.
PF-SWEEPGUIDE | Sweep with Guide Curves | Sweeps a profile constrained by one or more guide curves to control cross-section evolution.
PF-SWEEPSOLID | Solid Sweep | Moves a tool body along a path, subtracting/adding the swept volume.
PF-SWEEPTWIST | Sweep with Twist | Adds rotational twist of the profile along the path length.
PF-LOFT | Loft / Blend | Interpolates a solid transition between two or more profile sections.
PF-LOFTGUIDE | Loft with Guide Curves | Lofts between sections constrained by 
... [+43941 chars truncated]

### Assistant | 2026-06-12T14:39:37.452Z

I'll build the canonical deduplicated taxonomy by merging all 4 lens enumerations, deduping synonyms, and organizing into clear categories.

# CANONICAL CAD GENERATION TECHNIQUE TAXONOMY

The authoritative deduplicated denominator merging parametric-feature, surface-freeform, manufacturing-specialty, and system-and-assembly lenses. Synonyms collapsed to the most standard name (e.g. fillet==round, deboss==engrave, knit==stitch==sew).

## SKETCH-BASED ADDITIVE (solid)
1. CT-EXTRUDE — Extrude (Pad/Boss): linearly project a closed sketch profile through a distance to add material.
2. CT-EXTRUDE-THIN — Thin-Feature Extrude: extrude an open/closed profile with a wall-thickness offset instead of solid fill.
3. CT-EXTRUDE-UPTO — Extrude Up-To (surface/next/vertex): extrude until terminated by a referenced face, vertex, plane, or next body.
4. CT-EXTRUDE-SYM — Symmetric/Midplane Extrude: grow material equally both directions from the sketch plane.
5. CT-EXTRUDE-TAPER — Tapered/Drafted Extrude: add a draft angle to side walls during extrusion.
6. CT-REVOLVE — Revolve (Revolved Boss): sweep a profile about an axis through an angle for rotational solids.
7. CT-REVOLVE-THIN — Thin Revolve: revolve a profile with wall-thickness offset for tubular/shell rotational parts.
8. CT-SWEEP — Sweep: drive a profile along a 2D/3D path to add material.
9. CT-SWEEP-GUIDE — Sweep with Guide Curves: sweep a profile constrained by guide curves controlling cross-section evolution.
10. CT-SWEEP-SOLID — Solid Sweep: move a tool body along a path, adding/subtracting the swept volume.
11. CT-SWEEP-TWIST — Sweep with Twist: add rotational twist of the profile along the path length.
12. CT-SWEEP-SPINE — Sweep with Spine/Orientation Control: sweep with a spine curve controlling section orientation/scaling.
13. CT-LOFT — Loft/Blend: interpolate a solid transition through two or more profile sections.
14. CT-LOFT-GUIDE — Loft with Guide Curves: loft between sections constrained by guide rails for shape c
... [+38757 chars truncated]
