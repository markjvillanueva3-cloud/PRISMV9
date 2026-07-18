---
name: reference_sierra_fe_route_mount_2026_06_18
description: "Sierra shipped U-FE-ROUTE-MOUNT (e195a2b425) + U-FE-ROUTE-MOUNT-FIX (d9b533d27b), 2026-06-18, branch cad-fusion-live-ms0 -- the sierra->backend transition unit. NET RESULT: 8 frontend-facing Express routers (cncOps, diagnosis, mechanical, milling, thermal, vibration, settings, print) mounted in routes/index.ts; the SPA 404'd on /api/v1/{those} because each createXRouter factory was referenced ONLY in its own def file (never imported/mounted) -- a pure WIRING omission. Each downstream dispatcher pre-verified REGISTERED in src/index.ts (registerCncOpsDispatcher 219, registerDiagnosisDispatcher 160, registerMechanicalDesignDispatcher 225, registerFluidThermalDispatcher 226, registerVibrationPhysicsDispatcher 221 + prism_calc/cam/knowledge for milling + machineTypeClassifierEngine for print) AND its ACTIONS confirmed valid. A 9th router (specialty /grinding,/forming/*,/welding/*) was mounted then REVERTED (d9b533d27b): endpoint-level R16 verification found it is a NEVER-TESTED router calling 6 NON-EXISTENT dispatcher actions (grinding_calculate, sheet_metal_calculate, casting_calculate, molding_calculate, joint_design, weld_inspect; only welding_calculate is valid) -- mounting it turned a clean 404 into a 200+{error:Unknown action} body the SPA if(!res.ok) cannot detect (silent-failure footgun) + an R13 lapse (I verified the dispatcher REGISTERED, not that its ACTIONS resolve). specialty deferred to U-FE-SPECIALTY-CONTRACT. VALIDATED: romeo's audit-frontend-backend-contract.mjs (8 v1 bases gap->COVERED; HEAD had 0 mounts), tsc exit 0, 13-test runtime+wiring guard (fe-route-mount.test.ts), 2-arm scrutiny PASS 0 P0/P1."
type: reference
galaxy: frontend-app
source: prism-memory
synced: 2026-06-27T20:30:47.191Z
aliases: reference_sierra_fe_route_mount_2026_06_18
---


# Sierra: FE-ROUTE-MOUNT -- 9 orphaned frontend-facing routers wired (2026-06-18)

The sierra->backend transition (operator: "complete all sierra tasks then move to back end
tasks so we can focus on front end, web app/phone app"). Sierra vault-ops + system-viz were
well-hardened; pivoted to a concrete backend unit that directly unblocks the web app.

## The gap class (how it was found)
Compared the SPA's distinct `/api/v1/<base>` calls (grep `mcp-server/web/src/`) against the
authoritative backend mount table (`routes/index.ts` `app.use(...)`). Route FILES existed for
several "missing" bases (cncOps.ts, milling.ts, thermal.ts ...), so a naive grep would
false-positive -- the decisive check was: **is each `createXRouter` factory referenced anywhere
outside its own def file?** `grep -rln createMillingRouter` => only milling.ts. Confirmed 9
orphaned routers: real handlers, registered dispatchers, never mounted. The SPA 404'd on each.

## R13 foundation proof before mounting (do NOT mount a consumer atop an unproven dep)
Read each thin router -- all are clean `callTool("prism_X","action",req.body)` proxies (NOT
stubs). Then verified every `prism_X` is REGISTERED (`register*Dispatcher` in src/index.ts), so
mounting yields working 200s, not 500s. settings.ts = in-memory (no dep); print.ts =
machineTypeClassifierEngine direct import. Only AFTER that proof did I edit index.ts.

## The fix (commit e195a2b425)
`app.use("/api/v1/<base>", createXRouter(callTool))` x8 + `app.use("/api/v1", createSpecialtyRouter(callTool))`
(bare, exposes /grinding + /forming/* + /welding/*). Placed after the global /api middleware
(security/cors/ratelimit/auth/audit/versioning) so they inherit it -- no security posture change
vs the 50 existing mounts (all `optionalToken`, public-by-default).

## Complementary split with romeo (avoid collision per operator "coordinate with the fleet")
romeo built `scripts/audit-frontend-backend-contract.mjs` (the static prefix-gap AUDIT) under the
same backend->frontend goal. Sierra did NOT duplicate it -- instead used romeo's audit to VALIDATE
the fix (gap->COVERED) and shipped the complementary RUNTIME guard (fe-route-mount.test.ts: each
router mounts + answers non-404, 2 pure endpoints return real data, settings round-trips, a
negative control 404s to prove non-vacuity, + a static assertion that index.ts mounts all 9).
romeo's shopLive mount (/api/shop/*) was uncommitted in the shared index.ts working tree; folded
into this commit with co-attribution (R12) rather than a split commit -- preserves both, nothing lost.

## The specialty self-catch (R16 loop paid off) + R13 lesson
After mounting, I did NOT stop -- R16 (loop until gaps closed) drove an ENDPOINT-level recheck:
do the SPA's exact paths resolve to real router routes? That found specialty.ts is a never-tested
router whose 6/7 routes call dispatcher actions that DO NOT EXIST. Mounting it (e195a2b425) made a
clean 404 into a 200+{error} body -- worse, because the SPA `if(!res.ok)` passes on a 200. Reverted
in d9b533d27b. THE R13 LESSON: "dispatcher REGISTERED" != "the action the router calls is VALID".
When wiring a router->dispatcher proxy, verify the ACTION NAME is in the dispatcher's ACTIONS enum
(grep the `case "<action>"` / `ACTIONS = [...]`), not just that `register<X>Dispatcher` exists. The
8 kept routers all passed this deeper check; specialty failed it.

## Next unit: U-FE-SPECIALTY-CONTRACT (precise spec)
Reconcile the SPA forming/grinding/welding pages with real dispatcher actions, then mount + test.
SPA contracts (mcp-server/web/src/api/{forming,grinding,welding}.ts):
- forming: POST /forming/{sheet-metal,casting,molding}  (BASE /api/v1/forming)
- grinding: POST /grinding/{calculate,wheel-select,dressing}  (BASE /api/v1/grinding)
- welding: POST /welding/{calculate,joint-design,inspection}  (BASE /api/v1/welding)
Real dispatcher ACTIONS: prism_forming = blow_molding_calculate/casting_defect_analyze/press_brake_
calculate/stamping_die_calculate/sheet_metal_nesting_optimize/...(20); prism_grinding = wheel_select/
dress_params/grinding_force/surface_finish_predict/dressing_interval_optimize/...(10); prism_welding =
welding_calculate/weld_strength_calculate/weld_distortion_calculate/adhesive_bond_calculate/...(6).
Work: map each SPA endpoint -> the semantically-correct action (verify against the SPA Result types),
fix specialty.ts paths+actions, mount, runtime-test. NOTE some SPA features (weld INSPECTION,
grinding "dressing"/"calculate") may have NO clean backend action -> may need a new dispatcher action
built (R13: build the producer first). This is physics-calc routing -- do NOT guess a mapping.

## Lesson (the durable signal)
A route FILE existing != the route being MOUNTED. The orphan signal is "factory referenced only in
its own file". The frontend-404 class = SPA `/api/v1/X` call with no `app.use` in index.ts. Use
romeo's audit (static) + this runtime guard (mounted+functional) as defense-in-depth. See sibling
[[reference_sierra_viz_graphio_truncation_guard_2026_06_18]] (same R12 silent-gap hunting pattern).
