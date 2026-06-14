---
name: reference_delta_fusion_pattern_dup_defect_2026_05_31
description: PRISMBridgeCAD /pattern linear (rectangular) handler emits 3x coincident duplicate bodies per instance — real bridge defect found by build-map model-state verification; circular pattern is clean. Fix belongs in the deployed bridge (shared CAM/CAD).
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.084Z
aliases: reference_delta_fusion_pattern_dup_defect_2026_05_31
---


# Fusion bridge linear-pattern emits 3× coincident duplicate bodies (defect, found by build-map verify)

**Found by** the echo-pattern build-map model-state verification (slot:delta, 2026-05-31) — the first real
defect it caught that step-success `success:true` completely hid.

## The defect (empirically probed, fresh /new doc, single /pattern call)
`POST /pattern {type:"linear", count:3, spacing_mm:40, axis:"X"}` after a 20×20×10 extrude:
- handler reports `{success:true, feature_name:"R-Pattern1", instance_count:3}` — intent CORRECT.
- but `GET /geometry` → **body_count=9**, not 3. The 9 bodies sit at exactly **3 distinct X positions**
  (-10, 30, 70 mm — correct spacing-40 placement) each **TRIPLED into coincident duplicates** (every body
  20×20×10, vol 4000mm³, identical bbox per position).
- **CIRCULAR pattern is CLEAN** (count 4 → exactly 4 bodies, verified). The defect is LINEAR-specific.

## Root cause location (NOT yet fixed — shared bridge code)
`C:/Users/wompu/AppData/Roaming/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridgeCAD/PRISMBridgeCAD.py`
`_create_pattern`, the `pat_type == "linear"` path (≈L777-804): `rectangularPatternFeatures.createInput(...)`
with a single-direction setup. The 3×-duplication suggests either the entities collection contains the seed
3× or the pattern is being added once per existing body — investigate the `entities` build (it adds
`root.bRepBodies.item(count-1)` — if called when bodies already exist it may pattern the wrong/multiple set).
This is DEPLOYED add-in code shared by kilo (CAM) + echo (post) — a fix needs the operator to re-Run the
add-in, and must not disturb kilo's live CAM drive. Routed to bridge owners via AGENT_CHAT.

## How the build map flags it (the honest disposition — NOT rubber-stamped)
`scripts/lib/cad-fusion-buildmap-lib.mjs` BUILD_MAPS.C3D_EXTRUDE_RECT_PATTERN = `{bodyCount:3,
uniqueXPositions:3}`. `verifyBuildMap` now has a `uniqueXPositions` check (buckets float X-mins by 1mm). On
the live run: `uniqueXPositions ok (3/3)` = count+spacing intent correct; `bodyCount FAIL (expected 3, got
9)` = the duplicate-body defect surfaced. bodyCount was deliberately NOT relaxed to 9 — coincident duplicate
solids are genuinely wrong CAD output (bad mass, bad STEP export, bad CAM stock). Fudging the prediction to
match a buggy reality would defeat the entire point of model-state verification. Ledger: modelProven 8/9,
RECT_PATTERN modelVerified=false, sole failure "bodyCount: expected 3, got 9".

## Lesson
This is the build-map system PROVING its worth: it caught a real geometry bug that the bridge's own
`success:true` + the screenshot approach would both have missed (a screenshot of 3-at-correct-positions with
hidden coincident dups looks identical to a correct part). Deterministic model-state assertion > pixels.
Pairs with [[reference_delta_course_system_and_channel_verify_2026_05_31]] §ECHO PATTERN.
