---
name: reference_kilo_cam_collision_gate_2026_05_29
description: U-CAM-COLLISION-GATE-ENFORCE — CAM collision/gouge gate + physics NaN guard now code-enforced in camDispatcher (was the P0 safety gap)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.632Z
aliases: reference_kilo_cam_collision_gate_2026_05_29
---


Closed the P0 from the CAM galaxy completeness audit ([[reference_kilo_cam_galaxy_completeness_audit_2026_05_29]]): the CAM safety invariant "no toolpath ships without a clearance number" was enforced ONLY in the `cam-route-kilo.md` runbook — `camDispatcher.toolpath_generate` returned `collision_warnings:[]` (empty) and a `toolpath_generate → post_process` call shipped un-collision-checked output with no error. Commit `U-CAM-COLLISION-GATE-ENFORCE` (slot:kilo, 2026-05-29).

**Fix — 3 exported helpers in `mcp-server/src/tools/dispatchers/camDispatcher.ts`:**
- `applyCollisionGate(result, params, collisionEngine)` — wired into `toolpath_generate`. When `bodies[]`/`moves[]` present, runs `collisionDetectionEngine.checkFull(bodies, moves, margin)` and attaches `safety_gate{cleared, performed, minimum_clearance_mm, severity, reason}`. **cleared IFF `severity==="safe"` AND clearance finite > 0** — collision/near_miss/clearance_violation/NaN/throw all ⇒ `cleared:false` + `blocked:true`. No geometry ⇒ `performed:false, cleared:false, requires_collision_check:true` (fail-loud — never silently "safe"). Additive (never strips result fields). **Trap caught in-build:** clearing on `clearance>0` alone would wrongly pass a `clearance_violation` (below safety margin but >0) — must gate on `severity==="safe"`.
- `collisionGateForPost(params)` — wired into `post_process`. Refuses any toolpath carrying an explicit `safety_gate.cleared===false` or `blocked===true` (also nested `params.toolpath.*`). Legacy bare-param callers (no gate) pass through — non-breaking.
- `assertFiniteResult(result, label)` — depth-capped (≤3) NaN/±Infinity walk → fail-loud `{error, non_finite_field}` instead of NaN-as-success. Wraps all 6 physics actions (cam_kienzle_force/taylor_tool_life/feedrate_chipload/tool_deflection/coolant_strategy/omega_score). Merged the U-CAM-WIRE-PHYS-HARDEN P2 into this P0.

**Tests:** `mcp-server/src/__tests__/camDispatcher.collision-gate-wire.test.ts` 26/26 — pure-helper unit (incl. the clearance_violation>0 trap, throw, NaN, no-geometry) + dispatcher round-trip E2E (`toolpath_generate → post_process` refusal of an un-cleared toolpath; a wrong-named param yielding the NaN guard error through prism_cam) + z.enum membership guard. Regression: 376/379 cam family pass; the 3 failures are pre-existing (proven via `git stash` — `lathe_sf_*`/`strategy_compatibility_matrix`, untouched paths). 0 net-new tsc errors (repo baseline 548; the 1 camDispatcher error is pre-existing `lathe_postgen_skeleton`, line-shifted by the insertion).

Collision *capability* always existed (`CollisionDetectionEngine.checkFull` returns a real clearance number); the gap was *enforcement* in the data flow — now closed. CollisionDetectionEngine.checkFull contract: `(bodies, moves, margin) → {severity ∈ collision|near_miss|clearance_violation|safe, minimum_clearance_mm}`. CAMFeedrateChiploadEngine input contract: `{cuttingSpeedMmin, toolDiameterMm, fluteCount, chiploadMmTooth}` (wrong field names → NaN — that's what the guard now catches). Next audit P1s open: e2e-orchestrator, prismos-wire, tribal-allowlist-expand, wire-orphans.
