# UP SET — Op-1 5-axis CAM drive — PROGRESS / HANDOFF

**Slot:** kilo (CAM) · **Date:** 2026-05-30 · **Add-in:** PRISM_Fusion_Drive @ `http://127.0.0.1:18365`
**Material:** H13 annealed (ISO P, hot-work, derate ~20%) · **Machine:** Okuma GENOS M460V-5AX (5-axis table-table trunnion, BIG-PLUS CAT40) · **Units: INCH** (verified `default_length_units="in"`).

## DONE (verified live)
1. **Add-in on unique port :18365** — port-soup resolved (extractor :18360, PRISMBridge :18361, PRISMBridgeCAD :18362). Committed `[kilo] [CAM-DRIVE]/U-FUSION-PORT-FIX`.
2. **Autonomy fixes** — `/status` exposes `data_file_id`; `/open` uses `Data.findFileById` fast-path (beats 60s cloud-enumeration cap).
3. **Insert/mate capability BUILT + PROVEN + COMMITTED** `[kilo] [CAM-DRIVE]/U-FUSION-ASSEMBLY`:
   - `/component/insert` (addByInsert by file_id + inch transform + ground), `/component/list`, `/component/joint` (planar-face rigid mate). Proven on scratch doc (UP SET:1/:2 + Rigid 1). Live as HTTP routes after next Fusion restart; usable NOW via `/execute`.
4. **Working setup doc created + SAVED:** `UP SET - OP1 - 5AX SETUP` (folder FIXTURE, save-as from `OKUMA SIMPLIFIED MATE FIXTURE FOR FUSION` — original untouched).
   - Occurrences: FIXTURE BASE:1, JAW 1:1, JAW 2:1, **UP SET:1**.
   - **UP SET placed:** X[-2.358,2.358], Y[-1.61,1.61] (centered on jaws, Y shifted +0.228), **Z[6.13,10.74] — bottom RAISED 0.5" above jaw top lip (Z5.63) as a fixture-clearance riser** per [[feedback_setup_extra_material_fixture_clearance]] (operator rule 2026-05-31: always add extra material height so finishing the overall height clears the jaws/parallels). Stock bottom stays at jaw top Z5.63; the Z[5.63,6.13] gap is sacrificial riser. Verified via transform2 move.

## CACHED CLOUD IDS (`jm-fusion-docs.json`)
- UP SET (part): `urn:adsk.wipprod:dm.lineage:EeJ2MQY3Qsu4W9X91m9mug`
- OKUMA SIMPLIFIED MATE FIXTURE: `urn:adsk.wipprod:dm.lineage:YwctopDrRAGb7hceRX_b7w`
- Okuma M460V-5AX machine model: `urn:adsk.wipprod:dm.lineage:6Jq6ta9ZQGujWkeKQYq85A`

## FIXTURE GEOMETRY (inch, fixture coords)
- FIXTURE BASE: Ø12.5 round sub-plate, centered X0/Y0 (= TABLE CENTER), top Z=4.37.
- JAW 1 (−Y) + JAW 2 (+Y): dovetail serrated jaws, Z[4.37→5.63], gap Y[−1.464,+1.464]. **Jaw top lip = Z 5.63**. Locator dowel on JAW 1 front.

## GROUNDED CAM API (no re-introspection needed)
- `cam.setups.createInput(adsk.cam.OperationTypes.MillingOperation)` → SetupInput.
- SetupInput attrs: `.models` (PYTHON LIST of BRepBody), `.machine`, `.stockSolids` (From-Solid stock body list), `.fixtures` (+ `.fixtureEnabled=True` for jaw collision), `.parameters`, `.stockMode`, `.name`, `.operationType`.
- 5-axis machine: `adsk.cam.Machine.createFromTemplate(adsk.cam.MachineTemplate.Generic5AxisTableTable)` → assign to `setupInput.machine`. (Templates: Generic{3Axis,4Axis,5AxisHeadHead,5AxisHeadTable,5AxisTableTable}.)
- Assembly API (live-proven): `root.occurrences.addByInsert(dataFile, Matrix3D, isAsmCtx)`; `JointGeometry.createByPlanarFace(face, None, JointKeyPointTypes.CenterKeyPoint)` + `joints.createInput` + `setAsRigidJointMotion()` + `joints.add`.
- **GOTCHA:** after addByInsert of a CLOUD component, the occurrence bbox is `[0,0,0]` until the cloud reference resolves async — re-query after `doEvents()`/short wait before trusting geometry. A transient duplicate occurrence may appear then settle.
- Internal units = cm. INCH in/out: `*2.54` inbound, `/2.54` outbound. Set CAM feed params as unit-suffixed inch expressions (e.g. `"14 in/min"`, `"0.5 in"`) — NOT the mm CAM_PARAM_MAP ×0.1 (that caused the 10× feed bug).

## NEXT (the actual program — fresh budget)
1. **Create CAM setup** via `/execute`: switch to Manufacture (CAM product), `createInput(Milling)`, `.models=[UP SET body proxy]`, `.machine=Generic5AxisTableTable`, `.stockSolids` OR fixed-box relative stock (oversize sides +0.125", top +0.05", bottom 0 at jaw top), `.fixtures=[BASE,JAW1,JAW2 bodies]` + `fixtureEnabled=True`. After add, enumerate `setup.parameters` for `wcs*`/`*origin*` and set **WCS origin = stock-bottom-center (0,0,5.63 fixture = part-local 0,0,0)**. Machine-from-table-center ✓ (fixture centered at origin).
2. **PARTING PLANE** (operator interpretation: "do the entire top half + sides, leave bottom half attached"): mid-height **Z 8.435 fixture / part-local Z 2.305** (part now Z[6.13,10.74]). Op-1 machines Z 8.435→10.74 + side walls down to ~8.435; lower half + the 0.5" riser (Z5.63→6.13) stay for grip/Op-2. **Side-wall + overall-height finish must NOT go below part bottom Z6.13** — the riser keeps the tool clear of jaw tops (Z5.63) per [[feedback_setup_extra_material_fixture_clearance]]. CONFIRM if a feature-based plane is preferred (operator said "geometry-driven").
3. **Op-1 sequence** (~24 ops, geometry-driven, INCH, tools T1–T13): face → 3D adaptive rough → rest rough → semi-finish → finish walls/floors → **Ø1.625" central bore = BORING BAR** (face 41, NOT slim endmill) → Ø0.876" angled cross-bore (face 20) → multiaxis drill the angled holes (Ø0.186–1.000") normal to faces → ball-finish blended top faces (faces 27,31,37) → chamfers → **post Okuma NC** (`H:/PRISM/JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/okuma/OKUMA_M460V_5AX_PRISM_Enhanced_iMachining.cps`). Per-file scrutiny on G-code-emitting steps; shop_floor tier Ω≥0.95 S(x)≥0.98.
4. **Doc-reflect** the 5-axis setup SOP → tribal + wiki (operator directive: "this should be a tribal and wiki so you know how to do setups in 5 axis always") + add to CAM-AI learning loop.

## KEY FEATURE MAP (part-local, from /cam/feature-candidates)
- Central stepped bore: Ø1.625" (face 41, vertical, ~3.57" deep, from Z-shoulder up through top) over Ø2.125" bottom counterbore (face 38 — **Op-2/bottom**).
- Top tower Ø2.322" boss (face 2) + Ø0.876" angled cross-bore (face 20, axis [-0.819,0.574,0]).
- Multi-axis holes Ø0.186/0.202/0.450/0.487/0.520/0.632/1.000" on compound-normal faces.
- Blended top faces (normals [0.496,0.709,0.5], [-0.287,-0.410,0.866]) → ball-finish.
