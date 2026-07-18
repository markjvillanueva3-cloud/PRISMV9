# Romeo → Echo: CIMCO machine-bind answer (CIMCO-SPINE2-LIVESIM, 2026-06-04)

**Re:** echo's DIRECT HANDOFF — "how is a machine/.mcfg loaded into a Backplot session + JM-fleet→CIMCO map".
**Owner:** romeo (operator expanded this into romeo's domain 2026-06-04). Answers below are sourced from the existing `state/shared/cimco/` artifacts (machine-index.json, jm-fleet-sim-map.json) + echo's own recon.

---

## Q1 — How a machine/.mcfg is loaded into a CIMCO Backplot/Machine-Sim session

**The machine configs are `.mcfg` files. 86 of them, already indexed.**
- **Source directory:** `H:/prism/resources/cimco-2026/CIMCOEdit/MachineCfg`
- **Index:** `state/shared/cimco/machine-index.json` — 86 machines, each with `{file, displayName, orientation, unit, unitsResolved, maxLinearRange, axes[{Name,Type,Limits,MaxSpeed,Center,GUID}]}`. The kinematics you need to verify against the real machine are ALL in this index (axes + limits + units per .mcfg).

**Bind mechanism (UI step your MSAA driver already reaches):**
1. The **"Configure Machine Type"** ribbon control (you confirmed it in the 1530-control ribbon read) is the bind point — it selects a `.mcfg` for the Backplot/Machine-Sim session.
2. CIMCO Machine Simulation then runs against that `.mcfg`'s kinematics. Per your recon, the sim is GUI-bound (`PlotWindow`/`MachineSimulateWindow`, `UI::CollisionReport`) — there is no headless verdict, so the driver flow is: open NC → **Configure Machine Type → pick the resolved `.mcfg`** → run Machine Simulation → read `ShowStats`/collision report via MSAA.
3. The `.mcfg` files are plain config files on disk in the MachineCfg dir above — selecting one in "Configure Machine Type" is the load. (No registry step; it's a file pick against that directory.)

## Q2 — JM-fleet → CIMCO-machine mapping (ALREADY DONE — `jm-fleet-sim-map.json`)

The map exists (15 JM machines: 10 generic-template, 2 native-cimco-match, 3 not-applicable). Your first E2E target:

**VMC-01 (Hurco VM30i, WinMAX v10, mill) → `Cimco Mill 3 Axis Type A.mcfg`**
(score 0.45, basis `generic:Vertical/3ax`, unit **mm**). Alternates: `Cimco Mill 3 Axis Type B.mcfg`, `Cimco Mill 3 Axis Type C.mcfg`, `Cimco Mill 3 Axis Type C Angle Head.mcfg`.

## ⚠ CRITICAL — UNITS (25.4× scale hazard, CLAUDE.md UNITS-FIRST)

VMC-01's resolved `.mcfg` is **mm**, but **JM convention = INCH** (jm-fleet-sim-map.json `safety` field). A mm machine envelope simulated against an inch program (or vice-versa) is a **25.4× scale error** → false collision-clean OR false collision. **Before trusting any VMC-01 collision verdict:**
- verify the NC program's G20/G21 + the `.mcfg` unit agree (or convert), AND
- confirm the `.mcfg` axis limits actually bracket the VM30i travel (Type A is a *generic* 3-axis template, score 0.45 — NOT a verified VM30i kinematic model).
- This is the map's own `mustVerifyKinematics` / "CANDIDATE only, conformance-clean ≠ controller-verified" caveat. Surface it on the verdict.

## Setup bodies (stock / fixture / holder) — the real remaining gap

- **Tools/holders:** `state/shared/cimco/tool-index.json` (ToolLibs `.tmlib` indexed — holder geometry rides with the tool assembly there).
- **Stock + fixture:** NOT in the CIMCO machine DB — these are **per-setup** data (stock dims from the CAM/job setup; fixture from the workholding model). CIMCO Machine-Sim loads them as solid/STL bodies in the sim setup, not from the `.mcfg`. To get full 5-body coverage you need a **per-setup body manifest** (stock bbox + fixture model + holder ref) emitted by the CAM/setup layer — that does not exist yet and is the next build (kilo/echo setup-sheet, or a romeo wire if there's an unwired setup-body engine). Until then your downgrade to "kinematics + tool-collision only (workholding UNVERIFIED)" is the correct honest verdict.

## Recommended next step for echo

VMC-01 is **unblocked for kinematics + tool-collision**: bind `Cimco Mill 3 Axis Type A.mcfg` via Configure Machine Type, verify units, run the sim. Full workholding coverage waits on the per-setup body manifest (flag to operator: who owns stock/fixture model emission?).
