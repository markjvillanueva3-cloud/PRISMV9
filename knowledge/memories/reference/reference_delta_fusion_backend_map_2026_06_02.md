---
name: reference_delta_fusion_backend_map_2026_06_02
description: "Fusion bridge (:18365) input-function map — 139-op ontology, only 16 wired; critical path to intricate CAD + assemblies; instance-claim convention"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.548Z
aliases: reference_delta_fusion_backend_map_2026_06_02
---


**CORRECTION (verified live 2026-06-02 via /status traceback):** the add-in actually running on **:18365 is the INSTALLED `PRISM_Fusion_Drive.py`** (`C:/Users/<u>/AppData/Roaming/Autodesk/Autodesk Fusion 360/API/AddIns/PRISM_Fusion_Drive/`, 3049 lines) — NOT the repo's `scripts/fusion-addins/PRISMBridgeCAD.py` (3480 lines), a divergent sibling. Core build verbs OVERLAP (G1 ran clean). DIFFERENCES: live has NO `/atomic` (no 139-op ontology) and NO `/close` (reap docs via `/execute`); live HAS first-class **assembly verbs** `/component/insert` (`file_id,ground,x_in/y_in/z_in,is_assembly_context`) + `/component/joint` (`joint_type,occ_one/two,face_one/two_index,offset_in,flip,key_point`) + `/component/list`, plus `/doc/save`, `/doc/save-as`, `/viewport/capture`. **So assemblies are NOT 0-verb /execute-only — they are FIRST-CLASS on the live bridge** (the readiness workflow's assembly verdict was based on the wrong add-in). Tension: `/component/insert` needs a saved `file_id` vs delta's `saveChanges=false` rule → assemblies need a scoped reapable save area.

**delta drives :18365, kilo CAM :18361** (`state/shared/fusion-instance-claims.json`, one port = one slot; port via `PRISM_BRIDGE_CAD_PORT`). The repo `PRISMBridgeCAD.py` map below is 100% PLOTTED / 16-of-139-atomic-wired and still valid for that repo sibling. Full navigable map (now carries the §0 live-add-in correction): `knowledge/wiki/architecture/fusion-bridge-backend-map.md` (commits ac6761803b + this session's correction).

**Surface:** 17 first-class POST verbs (`/sketch /extrude /revolve /hole /fillet /chamfer /pattern /combine /shell /export /undo /new /close /parameter /tool-import /execute /atomic`) + 17 GET reads + `/batch` (≤50 ops) + `/cam/*` (kilo) + `/data/*`. Status code is 404 ONLY for "Unknown endpoint"; **all other errors return HTTP 200 with `{error}` — inspect the JSON body, not the status**. Units: bridge=mm, Fusion internal=cm (÷10 in). 60s main-thread timeout, 150ms POST cooldown.

**`/atomic` ontology** (`scripts/cad-atomic-ops-ontology.mjs`, verified `ATOMIC_OPS.length===139`: sketch 30·op 34·asm 14·drawing 15·construct 10·insert 5·inspect 7·surf 10·mesh 6·sm 8): only 16 wired (15 `drawing.*` + `op.press-pull`; **only 7 autonomously drivable** — 8 drawing ops are UI text-command `driveable:false`). 123 unwired → fail loud with live `wired_ops[]`. `/execute` (adsk+app+math+json pre-bound; blocks import/eval/file-open) reaches the other 123 with no typed contract / no verify signal.

**NOT READY for intricate/assembly training** (readiness workflow wf_373c2669-094): build path is revolve-only+hardcoded (bracket/plate fall through to die revolve = wrong topology); face-geometry probe sees ONLY cylinders+cones (`face-geometry-probe.mjs:31`) → can build intricacy it can NEVER score = "train on unverifiable signal" trap. Assemblies = 0/14 `asm.*` wired + single-doc lifecycle + zero assembly ground truth.

**Critical path (intricate single parts):** G1 prismatic extrude-adapter + non-revolve build branch (mirror `cad-fusion-revolve-adapter.mjs`; the root) → G2 `applyAxialBore` via the proven `/execute` participantBodies-cut pattern + generalize `cad-fusion-correction-loop.mjs:72` off `radial-hole`-only → **G3 probe extension** (surface-type histogram + fillet/chamfer detectors — the verification ceiling, load-bearing) → G5 sketch constrain/dim → G6 loft/sweep/spline. **Assemblies** = separate milestone G7-G11 (PoC via `/execute` occurrences.addNewComponent+joints.add first).

**Operator-gated:** add-in source edits (G4 fix `/extrude cut`+`/combine cut` participant-body binding; G8 wire `asm.*`) need a Fusion add-in reload; live bug re-confirmation (the 5 known caveats are runtime observations, NOT bridge-emitted strings — mechanism verified, text unrepro'd this session); assembly ground truth is cross-slot (xray owns the 11-class corpus, all single-part). Coordinate with kilo before components land (CAM setup reads model bodies via `/cam/setup/bodies`).

Related: [[reference_delta_feature_correction_loop_2026_06_01]] · [[cad-feature-correction-loop]] (wiki) · [[cad-knowledge-index]]
