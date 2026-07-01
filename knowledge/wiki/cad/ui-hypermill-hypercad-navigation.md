---
title: hyperMILL / hyperCAD-S — UI navigation + automation entry points (hard-coded seat knowledge)
slug: ui-hypermill-hypercad-navigation
kind: cad
domain: cad
status: shipped
shipped_at: 2026-06-12
shipped_by: claude-f61fa6d7 (slot zulu, delta-galaxy population)
provenance: model-knowledge baseline + in-repo corpus pointers (OPEN MIND E-Learning corpus on H:); THIS MACHINE RUNS hyperCAD v31 — verify version-specific menu names against v31, NOT v33 (cad/CLAUDE.md gotcha 7)
related:
  - ui-fusion360-navigation
  - ui-mastercam-navigation
  - cad-corpus-paths
  - cad-text-to-cad-landscape
---

# hyperMILL / hyperCAD-S — UI navigation + automation entry points

Purpose: seat knowledge for OPEN MIND's stack. **hyperCAD-S is the CAD host; hyperMILL is the CAM system docked inside it.** JM's canonical mill-CAM lane is hyperMILL (echo's order-flow stage); delta cares about the hyperCAD-S side (model prep, electrode work) and the automation surface.

## The two-product mental model

- **hyperCAD-S** — OPEN MIND's own CAD ("CAD for CAM"): model import/repair, face/edge selection optimized for machining prep, electrode derivation, mesh + V-sketch tools. NOT a parametric-history modeler like Fusion — it is direct/explicit modeling; edits don't replay a timeline.
- **hyperMILL** — the CAM application presented as a docked browser inside hyperCAD-S (or historically inside other hosts). All machining jobs, tools, and posts live there.
- On THIS machine: **hyperCAD v31 is the running install** (v33 exists but is not the live seat — use v31; verify before automating).

## hyperCAD-S anatomy

- **Ribbon-style tabs** (v-series): Start/File · Drawing · Curves · Surfaces · Solids · Meshes · Analysis · Electrode · hyperMILL (the CAM tab). Exact tab set varies by version + licensed modules — enumerate on the live v31 seat before scripting against names.
- **Model browser** (docked left): entity tree — solids, meshes, curve sets, workplanes, layers ("structures"). Visibility toggles per node.
- **hyperMILL browser** (docked, the CAM heart) — tabbed:
  | Tab | Contents |
  |---|---|
  | **Job list** | machining jobs tree (the program): job lists → compound jobs → jobs (one strategy each) |
  | **Model** | milling areas, stock models, fixtures registered for CAM |
  | **Tools** | tool database entries used in this document |
  | **Features** | recognized features (holes, pockets) feeding feature-based automation |
  | **Macros** | stored strategy macros (the automation currency) |
- **Graphics window**: middle-drag rotate · Shift+middle pan · scroll zoom (OPEN MIND default scheme; configurable to mimic other CAD).

## The CAM workflow (what echo/kilo automation mirrors)

1. Import model into hyperCAD-S (STEP/IGES/native readers) → repair/orient → define workplane(s).
2. hyperMILL tab → **New job list**: pick machine (.mac machine model), NC controller/post config, workpiece zero.
3. Define **stock** (box/casting/STL) + **milling areas/boundaries**.
4. Add **jobs**: 2D (pocket/contour/drill), 3D (roughing/finishing/rest), 5X strategies; per-job dialog = Tool · Contours/Areas · Strategy · Parameters · Linking pages.
5. **Calculate** (per job or whole list) → toolpath compute is batched/background.
6. Simulate: internal machine simulation / hyperVIEW → collision + limit check.
7. **Post-process** the job list → NC out via the configured post (OPEN MIND post + machine config; JM specifics live in echo's post-processor galaxy).

## Automation entry points (how PRISM drives this seat)

- **Feature + macro technology is the native automation path**: recognized features (Features tab) + the **macro database** (Macros tab) let a whole strategy stack apply automatically to matching geometry — this is hyperMILL's intended "CAM automation," and the highest-leverage hook for PRISM (encode JM doctrine as macros; apply by feature match).
- **hyperMILL AUTOMATION Center** (licensed module, v-series): rule-based scripting of the prep→job→calc→post chain for families-of-parts. If the v31 license includes it, this is the closed-loop lane.
- **hyperCAD-S API/scripting**: limited public surface (no rich open API like Fusion). Practical integration is file-level (STEP in / NC out) + macro/feature automation + the AUTOMATION Center where licensed. PRISM treats the seat as a **file-in/file-out CAM service** orchestrated externally.
- **PRISM bridges**: `HyperCADSCodeGeneratorEngine` (codegen), hyperMILL family engines in the cam galaxy (kilo), post-processor configs (echo). The Ollama text→CAD lane (`scripts/cad-text-to-cadquery.mjs`) bypasses the seat entirely for geometry generation — hyperMILL consumes its STEP output.
- **UNITS:** hyperMILL job lists carry their own unit setting; JM convention is INCH — verify per job list, never assume (25.4x rail).

## In-repo corpus (verify/extend here first)

- `OPEN MIND E-Learning` corpus + hyperMILL 31/33 install resources — paths per [[cad-corpus-paths]] / `reference_cam_corpus_locations`.
- 25 extracted hyperMILL assets already in PRISM (extraction-log; do NOT re-extract).
- Nightly UI-knowledge feed: night-queue id `hypermill-ui-navigation` (staged → attended promote).
