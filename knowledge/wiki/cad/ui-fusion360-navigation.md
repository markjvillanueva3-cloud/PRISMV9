---
title: Fusion 360 — UI navigation + automation entry points (hard-coded seat knowledge)
slug: ui-fusion360-navigation
kind: cad
domain: cad
status: shipped
shipped_at: 2026-06-12
shipped_by: claude-f61fa6d7 (slot zulu, delta-galaxy population)
provenance: model-knowledge baseline + in-repo corpus pointers; version-specific menu names verify on the live seat (JM runs Fusion per reference_order_flow_canonical_2026_05_27 — Fusion CAD is delta's lane)
related:
  - fusion-backend-nav-map
  - cad-text-to-cad-landscape
  - cad-corpus-paths
  - ui-hypermill-hypercad-navigation
  - ui-mastercam-navigation
---

# Fusion 360 — UI navigation + automation entry points

Purpose: the knowledge an AI agent (or new operator) needs to *drive* Fusion 360 — where things are, how to move, and where the programmatic hooks live so PRISM can generate CAD through this seat. Fusion CAD is the canonical first stage of the JM order flow (Fusion CAD → hyperMILL CAM mill / Fusion-Mastercam CAM lathe).

## Workspace model (the top-level switch)

Fusion is organized as **workspaces**, switched from the top-left dropdown. Each swaps the entire toolbar:

| Workspace | What it's for | PRISM relevance |
|---|---|---|
| **Design** | Parametric solid/surface/mesh modeling | Where generated CAD lands; timeline = parametric history |
| **Manufacture** | CAM: setups, 2D/3D/turning/multi-axis strategies, post | kilo/echo lane (CAM + post); JM `.cps` posts live here |
| **Drawing** | 2D prints from the model | print-generation lane (xray round-trip checks) |
| Render / Animation / Simulation | viz + FEA | rarely needed by PRISM |

## Design-workspace anatomy

- **Toolbar tabs** (top): Solid · Surface · Mesh · Sheet Metal · Plastic · Utilities. Most generation work = Solid tab (Create/Modify/Construct/Inspect groups).
- **Browser** (left tree): document root → Origin (planes/axes) → Bodies → Sketches → Components (assemblies). Right-click a node for context ops (new component, ground, isolate).
- **Timeline** (bottom): every feature in order. Right-click → Edit Feature is THE way to change a parametric step; drag the marker to roll back.
- **ViewCube** (top-right): click faces/corners for standard views; click the home icon to reset.
- **Navigation bar** (bottom-center): orbit, pan, zoom, look-at, display settings, grid.
- **Data Panel** (slide-out, top-left grid icon): cloud projects/files. Fusion is cloud-native — local export needs explicit Export (`File > Export` → `.f3d/.step/.iges` etc.).

## Mouse + keyboard (defaults)

- Orbit: **Shift + middle-drag** · Pan: **middle-drag** · Zoom: **scroll** (cursor-centered).
- **S** — the shortcut/search toolbox (type any command name; fastest path to anything).
- Sketch: **L** line · **C** circle · **R** rectangle (2-point) · **D** dimension · **X** construction toggle · **P** project geometry.
- Model: **E** extrude · **Q** press/pull · **M** move · **F** fillet (via S-box) · **J** joint (assembly) · **Shift+S** Scripts & Add-Ins.
- Finish sketch / OK = the green check on the right-side dialog; **Esc** cancels the active tool.

## The modeling loop (what generated code mirrors)

1. Create Sketch → pick plane/face → draw profile → constrain + dimension → Finish Sketch.
2. Create > Extrude/Revolve/Sweep/Loft from the profile.
3. Modify > Fillet/Chamfer/Shell/Combine on the solid.
4. Construct > offset/angled planes for downstream sketches.
5. Inspect > Measure / Section Analysis to validate.
6. File > Export → STEP for downstream CAM/PRISM round-trip.

## Automation entry points (how PRISM drives this seat)

- **Scripts & Add-Ins** (`Shift+S`, or Utilities tab → ADD-INS): runs **Python or C++** against the Fusion API. The API namespaces: `adsk.core` (app/UI plumbing) + `adsk.fusion` (design objects).
- Canonical generation skeleton (the shape `CadQueryCodeGeneratorEngine`/`Fusion360CADGeneratorAdapter` output mirrors):
  ```python
  import adsk.core, adsk.fusion
  app = adsk.core.Application.get()
  design = adsk.fusion.Design.cast(app.activeProduct)
  root = design.rootComponent
  sk = root.sketches.add(root.xYConstructionPlane)
  sk.sketchCurves.sketchCircles.addByCenterRadius(adsk.core.Point3D.create(0,0,0), 0.5*2.54)  # Fusion API unit = cm
  prof = sk.profiles.item(0)
  ext = root.features.extrudeFeatures.addSimple(prof, adsk.core.ValueInput.createByReal(2.54), adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
  root.parentDesign.exportManager.execute(root.parentDesign.exportManager.createSTEPExportOptions('C:/out/part.step'))
  ```
- **UNITS TRAP (safety rail):** the Fusion API's internal length unit is **centimeters**, regardless of document units. JM convention is INCH → multiply inches by **2.54** in API code (NOT 25.4 — that's the mm path used by CadQuery/build123d). A wrong factor here is the 25.4x-class scale error.
- **No true headless mode**: scripts run inside the live app. PRISM's long-running pattern is CAD-FUSION-LIVE (keep a session resident; drive via add-in) — see galaxy `cad-fusion-live/`.
- **Navigate by REFERENCE, not by sight (canonical)**: the `PRISM_Fusion_Drive` add-in exposes read-only HTTP endpoints on `:18365` — `/design/tree`, `/design/features`, `/design/parameters`, `/design/selection` (delta), `/post/library`, `/post/programs` (echo), plus the CAM backend (kilo). An agent should query these JSON maps (stable ids/paths, INCH bbox + unit label) instead of screenshots or blind UI probing. Full map: `state/shared/fusion-backend/BACKEND-NAV-MAP.md` · [[fusion-backend-nav-map]]. The UI knowledge in THIS entry is for understanding the seat, talking to operators, and add-in-down fallback.
- **PRISM bridges**: `Fusion360CADGeneratorAdapter` (codegen), the `cad-fusion-live` galaxy (resident-session pattern), `scripts/cad-text-to-cadquery.mjs` (Ollama text→CadQuery lane — kernel-equivalent STEP without the seat).

## In-repo corpus (verify/extend here first)

- `H:/PRISM/resources/FUSION360/` — install + training resources (per [[cad-corpus-paths]]).
- `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` — real JM Fusion projects.
- Nightly UI-knowledge feed: night-queue ids `fusion-ui-navigation`, `fusion-api-scripting` (staged → attended promote).
