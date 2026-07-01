---
title: Mastercam — UI navigation + automation entry points (hard-coded seat knowledge)
slug: ui-mastercam-navigation
kind: cad
domain: cad
status: shipped
shipped_at: 2026-06-12
shipped_by: claude-f61fa6d7 (slot zulu, delta-galaxy population)
provenance: model-knowledge baseline + in-repo corpus pointers; THIS MACHINE RUNS Mastercam X8 (classic-menu era, pre-2017-ribbon) — X8 documented as primary, ribbon noted for newer seats
related:
  - ui-fusion360-navigation
  - ui-hypermill-hypercad-navigation
  - cad-corpus-paths
  - cad-text-to-cad-landscape
---

# Mastercam — UI navigation + automation entry points

Purpose: seat knowledge for Mastercam. JM's lathe-CAM lane includes Mastercam (order flow: Fusion CAD → Fusion/Mastercam CAM lathe); the local seat is **X8** — the classic menu UI, NOT the ribbon (ribbon shipped with Mastercam 2017+). Document both, automate against X8.

## X8 anatomy (the live seat)

- **Menu bar**: File · Edit · View · Analyze · Create · Solids · Xform · Machine Type · Toolpaths · Screen · Settings · Help. Geometry creation lives under **Create** (point/line/arc/spline/rectangle…); transforms under **Xform** (translate/rotate/mirror/offset/scale).
- **Operations Manager** (docked left) — THE control center, two tabs:
  - **Toolpaths**: machine group → properties (stock setup, tool settings, files) → toolpath operations list. Each operation node expands to Parameters · Tool · Geometry · Toolpath. Edit any → operation goes **dirty (red X)** → must **Regenerate** (toolbar buttons: regen selected / regen all).
  - **Solids**: solid feature history (Mastercam solids keep an op tree even though wireframe doesn't).
- **Status bar** (bottom): live attribute state — Z depth, color, level, point/line style, WCS / Cplane / Tplane selectors. **Levels** (layers) managed from here or Screen menu.
- **Gview vs planes (the classic confusion):** **Gview** = what you look at; **Cplane** = where geometry is created; **Tplane** = toolpath plane; **WCS** = the coordinate system both reference. Misaligned Cplane/WCS is the classic wrong-plane geometry bug — check the status bar before creating.

## Mouse + keyboard (X8 defaults)

- Rotate: **middle-drag** · Pan: **Shift + middle-drag** · Zoom: **scroll** (cursor-centered).
- **Alt+1..7** standard Gviews (top/front/right/iso…) · **Alt+F1** fit · **F1** zoom window · **Alt+F2** un-zoom.
- **F9** toggle axes display · **Alt+F9** show all axes/gnomon · **Alt+T** toggle toolpath display · **Alt+S** shaded/wireframe.
- **Esc** exits the active function; chaining dialogs are modal — finish or cancel before anything else responds.

## The CAM workflow (what automation mirrors)

1. **Machine Type** menu → pick Mill/Lathe/Wire default (machine definition + control definition + post are bound here).
2. Machine group **Properties** in the Ops Manager → Stock setup (box/cylinder/model), Tool settings.
3. **Toolpaths** menu → pick strategy (Contour, Pocket, Drill, Face; Surface rough/finish; lathe Rough/Finish/Thread/Cutoff) → **chain geometry** (the chaining dialog — direction matters; partial chains via endpoints) → parameter pages (Tool · Cut Parameters · Linking · Lead in/out) → OK generates the op.
4. Iterate: edit parameters → red-X → **Regenerate**.
5. **Verify** (solid stock simulation) or **Backplot** (tool motion replay) from the Ops Manager toolbar.
6. **Post (G1)**: post-process selected ops through the bound `.pst` post → NC file out.

## Ribbon-era delta (2017+, for newer seats only)

Menus → contextual ribbon tabs (Wireframe · Surfaces · Solids · Model Prep · Drafting · Transform · Machine · View · Toolpaths); Operations Manager and the Gview/Cplane/WCS model are unchanged — knowledge transfers, command *locations* differ.

## Automation entry points (how PRISM drives this seat)

- **NET-Hook API** (.NET, `Mastercam.App` namespaces): the modern scripting surface — geometry creation, toolpath ops, chaining, posting are all reachable from C# add-ins (X8 supports NET-Hooks; this is the recommended lane).
- **C-Hooks** (C++ SDK): the deep/native add-in surface — full access, heavier build chain (requires matching SDK per Mastercam version).
- **VBScript** (legacy, X-era): in-product VB editor for light geometry/utility scripting — exists on X8, gone in modern releases; treat as fallback only.
- **File-level integration**: STEP/IGES in; NC out via `.pst` post. As with hyperMILL, PRISM can treat the seat as a file-in/file-out CAM service orchestrated externally — the Ollama text→CAD lane (`scripts/cad-text-to-cadquery.mjs`) produces the STEP upstream.
- **PRISM bridges**: `MastercamCADExecutionBridge` (delta), `MastercamFunctionIndexEngine` + mastercam bridge family (kilo/cam galaxy), Mastercam post assets (echo). 45 Mastercam assets already extracted (extraction-log; do NOT re-extract).
- **UNITS:** Mastercam files carry inch/metric per file (and the machine/control definition has its own default). JM convention is INCH — verify per file before any geometry or post step (25.4x rail).

## In-repo corpus (verify/extend here first)

- `H:/PRISM/resources/` Mastercam X8 corpus + training material — paths per [[cad-corpus-paths]] / `reference_cam_corpus_locations`.
- JM Die real programs: `H:/PRISM/JM DIE/` (lathe + mill customer folders; access via `prismSelfAwarenessEngine.getJMDieCustomerPath()`).
- Nightly UI-knowledge feed: night-queue id `mastercam-ui-navigation` (staged → attended promote).
