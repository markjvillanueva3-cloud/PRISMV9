---
name: reference_cam_adaptive_collision_vendorapi_2026_06_13
description: "CAM (kilo) Phase-2 deep-research anchor — adaptive/high-efficiency roughing (constant engagement angle, trochoidal transitions; Volumill/iMachining), toolpath taxonomy (2.5D/3D/5-axis+RTCP), gouge/holder collision (Choi-Jerard sculptured surface), IPW stock model, vendor automation APIs (Fusion360/Mastercam NET-Hook/hyperMILL/Esprit/NX Open/PowerMill/SolidWorks). Written 2026-06-13 slot:zulu Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.501Z
aliases: reference_cam_adaptive_collision_vendorapi_2026_06_13
---


**Context:** Phase-2 anchor for the CAM galaxy (kilo), per the 2026-06-13 knowledge-max `/goal`. Spec:
`FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §kilo.

## Adaptive / High-Efficiency roughing (the modern MRR lever)
- **Constant-engagement-angle clearing:** maintain a controlled tool engagement (TEA) by spiraling/morphing the
  path + **trochoidal transitions** in corners → no full-width slotting, constant chip load, deep axial (full
  flute) + light radial → pairs directly with radial chip-thinning (see mill memo) for high feed/MRR + long tool
  life. Branded: Autodesk Adaptive Clearing, SolidCAM **iMachining**, Celeritive **VoluMill**, hyperMILL MAXX,
  Mastercam Dynamic Motion. (Engagement-control + trochoidal corners are the shared principle; the patents differ.)
- vs **conventional offset/contour roughing:** parallel offsets to the boundary — simple, but full-width
  engagement in slots/corners spikes force + heat → lower feeds, shorter life.

## Toolpath taxonomy
- **2.5D:** facing, contour/profile, pocket (with islands), drilling/canned-cycle, chamfer, thread-mill, engrave.
- **3D:** roughing (adaptive/Z-level/plunge), finishing — parallel/raster, scallop/constant-stepover, pencil
  (corner), radial, spiral, **rest machining** (rough leftover from a larger tool, IPW-driven), steep/shallow.
- **5-axis:** simultaneous swarf (flank), flowline, multiaxis-contour, tool-axis control (lead/lag/tilt), +
  **3+2 (positional)** indexing. **RTCP/TCPM** keeps the programmed point at the tool tip during rotary moves.

## Gouge + collision avoidance (safety core)
- Check the **tool + holder + shank + arbor** against the **part + fixture + clamps + stock**. Sculptured-surface
  gouge theory: Choi & Jerard, *Sculptured Surface Machining* (1998). Holder-collision drives minimum tool
  stickout / tapered-tool / shrink-fit selection. PRISM kilo's `collision_check_full` is the triad endpoint
  (cam_strategy_recommend → toolpath_generate → collision_check_full).
- **IPW (in-process workpiece) / stock model:** the running solid after each op — drives rest-machining,
  air-cut avoidance, and accurate engagement for feed optimization.

## Cutter engagement + feed optimization
- Per-move TEA (tool engagement angle) from the IPW → feed-rate optimization (slow into full engagement, speed
  up in air/light cuts) — the link to speed-feed (oscar): force-aware feed scheduling along the path.

## Vendor automation APIs (the 6 tier-1 bridges + more)
- **Fusion 360 API** (Python/JS, `adsk.cam`), **Mastercam** NET-Hook / C-Hook (.NET), **hyperMILL** automation
  interface / OPEN MIND API, **Esprit** KBM (Knowledge-Based Machining, .NET), **Siemens NX Open** (CAM), **Autodesk
  PowerMill** macro/COM, **SolidWorks CAM** (EApp/CAMWorks). Each exposes: setup/stock, tool library, operation
  create + params, post. Print-to-program = AFR (delta) → strategy select → params (oscar feeds) → post (echo).

## Integration (kilo)
- Consumes delta (AFR features) + oscar (speed/feed) + echo (post). Next deep-research (roadmap §kilo): ingest
  the 6 vendor API references into the bridge engines; Choi-Jerard gouge math; ISO 14649 (STEP-NC) for
  CAM-neutral toolpath. Re-verify vendor API method names against current docs on the next pass (web throttled).

Sources (canonical): Choi & Jerard *Sculptured Surface Machining* (1998); Autodesk Fusion 360 API docs;
Mastercam NET-Hook SDK; OPEN MIND hyperMILL automation; Hexagon Esprit KBM; Siemens NX Open; ISO 14649 STEP-NC;
vendor adaptive-clearing literature (VoluMill / iMachining / Adaptive Clearing). Expertise-authored anchor;
vendor-API specifics flagged for web re-verification.
