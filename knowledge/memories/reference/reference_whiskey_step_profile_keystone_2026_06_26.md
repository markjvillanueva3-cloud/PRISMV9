---
name: reference-whiskey-step-profile-keystone-2026-06-26
description: "U-W-STEP-PROFILE: STEP->turning rotational-profile extraction (G1 closed-loop keystone core) + 3 lessons (centroid axis, degenerate-file sampling, JM OP STEPs are multi-body). Continues the Kienzle /goal (slot:whiskey)."
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.263Z
aliases: reference_whiskey_step_profile_keystone_2026_06_26
---


# U-W-STEP-PROFILE: STEP geometry -> turning rotational profile (slot:whiskey, 2026-06-26)

Continues [[reference_whiskey_kienzle_session_2026_06_26]] (the Kienzle /goal). The G1 keystone is `full_geometry_loop_closed` -- feeding REAL JM CAD geometry (2,307 STEP files) into the lathe closed loop. The OCR/PDF leg shipped in U-W2C; this builds the STEP leg.

## Shipped (commit 3b3c631caf)
- `scripts/lib/step-mesh-rotational-profile.mjs` (PURE, 11/11 tests): triangle MESH -> turning silhouette. occt-import-js returns a SURFACE MESH, not analytic B-rep cylinders, so `TurningCADImportEngine.importSolid` (needs analytic `CADSolidInput` faces) can't be fed from a STEP directly. Instead: detect the revolution axis (angular-symmetry score, centroid-anchored), radial-sweep -> `od_profile` (max-radius silhouette per axial bin) + `id_profile` (contiguous inner-wall cluster; end-cap disks rejected). Output matches the turning profile shape the Rung C loop consumes.
- `scripts/lathe-step-profile-probe.mjs` (occt adapter + units resolver, 6/6): STEP file -> mesh -> profile. UNITS-FIRST: resolves `CONVERSION_BASED_UNIT` inch / `SI_UNIT` mm, returns "unknown" rather than guessing (the 25.4x rail).
- LIVE (R15): real FASTENAL OKUMA part -> units=mm, 4 meshes, axis z, OD/ID extracted, correctly `suspect=true`.

## 3 lessons (R12 + scrutiny-caught)
1. **Anchor the axis at the CENTROID, not the bbox center (P1, arm-A scrutiny).** The revolution-axis line was anchored at `bbox.center`, which is NOT on the true axis for an off-center-feature or multi-body mesh -> the radial sweep measures r about the wrong line -> wrong OD/ID, reported as clean. FIX: `centroid(triples)` anchors the perp-plane center (a body of revolution's cross-section centroid lands on the axis; only shifts axially, which the sweep ignores) + a `suspect` flag (`symmetry_score > 0.05`) so a wrong/ambiguous profile can NEVER be silently consumed as clean. Lesson: for any mesh-derived axis/profile, the bbox center is a trap for non-centered geometry -- use the centroid + a confidence/suspect signal.
2. **Don't conclude a tool is broken from the SMALLEST sample (R12).** First test of occt on the 3 SMALLEST JM STEPs (~3.6KB) returned 0 meshes -> I almost concluded "occt can't mesh JM AP214 STEPs (blocker)". WRONG: 3.6KB is far too small for a real B-rep -- those are degenerate/placeholder exports with NO solid entities (grep found no `MANIFOLD_SOLID_BREP`). Testing real 150KB+ parts: occt meshes them fine (4 meshes, mm). Lesson: sample REPRESENTATIVE data (by size/content), never just the smallest/fastest, before declaring a backend limitation.
3. **JM "OP1/OP2" Fusion STEPs are often MULTI-BODY (open thread for iter5).** The FASTENAL part scored `suspect=true` (0.177, OD 336mm > axis_length 232mm) -- it is a multi-body OP-setup STEP (part + stock/fixture, or multiple shells), not a single clean turned solid. The extraction correctly flags it. iter5 wiring needs a BODY-SEGMENTATION step (isolate the part body, e.g. largest body-of-revolution sub-mesh) before scoring, OR prefer single-body part STEPs. occt's `root.children` / per-mesh grouping is the segmentation handle.

## iter5 SHIPPED (U-W-STEP-SEGMENT, commit 1208147585)
Body-segmentation DONE: `selectBestBodyProfile(meshArrays)` evaluates each occt body + combined, returns the LARGEST CLEAN body of revolution (the part); none clean -> least-suspect + `suspect=true` (never passes a fixture off as the part) + `pick_ambiguous` flag + `body_candidates` audit list. 16/16 core + 7/7 probe; 2-arm PASS. LIVE across 3 OKUMA parts: **AGRATI 9070219 OP2 -> CLEAN usable profile (OD 15.4mm, suspect=false)**; FASTENAL A15267 / ATF AIT-30366A -> no clean turned body (suspect=true, skipped).
**KEY DATA FINDING (iter6 input):** JM's Fusion CAD/CAM STEPs are SETUP-exports -- some are clean single turned parts, many bundle stock/fixture (no clean turned body). The STEP closed loop MUST gate on `suspect`/`pick_ambiguous` and only score the clean subset (plus consider a cleaner JM part-STEP source if one exists).

## Next (iter6)
Wire the selected clean profile -> a `TurningInput` (diameters/lengths/bore from od/id profiles; SKIP suspect+ambiguous) -> the Rung C driver (`scripts/lathe-closed-loop-full.mjs`) -> score vs the part's `.MIN` -> flip `full_geometry_loop_closed` for the STEP path.

Related: [[reference_whiskey_kienzle_session_2026_06_26]] · [[reference_whiskey_rungc_step_brep_gap_2026_06_26]] · [[reference_whiskey_kienzle_vision_route_u_w6_2026_06_26]] · [[feedback_check_units_first]]
