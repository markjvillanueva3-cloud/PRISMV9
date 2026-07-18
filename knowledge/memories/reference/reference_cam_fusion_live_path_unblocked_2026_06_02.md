---
name: reference_cam_fusion_live_path_unblocked_2026_06_02
description: "[PORTS CORRECTED — see reference_fusion_port_assignment_kilo_18361_2026_06_02] kilo=:18361 (CAM), delta=:18362 (CAD), operator-authoritative. The :18362/:18365 claim below was the buggy auto-detect. Authoring keystone endpoint #3 (param introspection) built; remaining setters R13-gated on a live #3 dump after operator loads the add-in on :18361"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.503Z
aliases: reference_cam_fusion_live_path_unblocked_2026_06_02
---


# CAM Fusion live-drive path unblocked (slot:kilo, 2026-06-02)

Operator /goal: *"delta claimed one of the two instances of fusion open so claim the other one."*

> ⚠ **PORTS SUPERSEDED (2026-06-02).** The operator corrected the assignment: **kilo=:18361 (CAM), delta=:18362 (CAD)** — *"you should be on 18361, 18362 literally says cad so its for delta."* The `:18362`/`:18365` claim in the next section was produced by the buggy auto-detect heuristic (commit `d1914afb96`) and is WRONG. Canonical: [[reference_fusion_port_assignment_kilo_18361_2026_06_02]]. Everything below the §Instance-claim block (nav-map, endpoint #3) is still valid — only the PORT was wrong.

## ~~Instance claim (commit `d1914afb96`)~~ — SUPERSEDED, ports were wrong
- ~~**kilo owns `:18362`**~~ → **WRONG.** kilo=:18361. :18362 is delta's live CAD (live-probe confirmed 4 foreign docs). The auto-detect picked :18362 because it answered `/documents` and transiently looked clean — but ownership is operator-assigned, not heuristic-inferred.
- ~~**delta owns `:18365`**~~ → delta owns **:18362** (CAD). :18365 was an old-add-in instance, not delta's CAD port.
- Tooling still valid: `scripts/fusion-claim-instance.mjs` now operator-PINS kilo to :18361 (`PRISM_FUSION_KILO_PORT`) and hard-excludes :18362 (`PRISM_FUSION_DELTA_PORTS`); the auto-detect resolver is advisory-only. Claim sidecar `state/shared/cam-drive/fusion-kilo-claim.json` now records `:18361` (source `operator-pin`). 15/15 tests.

## Fusion CAM-authoring nav-map 100%-plotted (commit `98bb5e50f1`) + keystone endpoint #3 (commit `09d54916e9`)
- `FUSION-CAM-AUTHORING-NAVMAP.md`: full `adsk.cam` authoring input-function map + the add-in's ~55-60% coverage gap (authoring is create-only + geometry-blind) + the dependency-ordered 7-endpoint addition list (3→1→2→6→4→5→7).
- **R12 strategy correction:** Fusion has ~7 turning strategies + cycle-differentiated `drilling`, NOT 15. 4 families (ID_boring/chamfer/bore_finish/live_tool_milling) bound to non-existent strategy names → recorded as collapse-mappings in matrix `fusion_strategy_map` block. DOC-confirmed: `turningFace`, `turningProfileRoughing`.
- **Endpoint #3 `GET /cam/operation/parameters` BUILT** — read-only introspection (op param names + real `.strategy`), the verify-before-bind keystone. 6/6 real-shape Python test (drives via `dispatch()`, asserts READ-ONLY + fail-soft).

## NEXT (gated)
- **Operator action:** load/restart `PRISM_Fusion_Drive` on the `:18361` instance (live-probe shows :18361 up but still on the OLD add-in, no `/documents`) so #3 loads, then a live `GET /cam/operation/parameters` dump verifies real param names → flip `fusion_strategy_verified`.
- Task #47 (setters #1/#2/#6/#4) is R13-gated on that live dump (don't bind [UNVERIFIED] names blind). Task #48 (#5 edit + #7 delete/reorder, [DOC] collection ops) is buildable now without the dump.
- 5-axis + multi-turn 100+op remains a large, mostly-unbuilt extension — and aspirational for JM (LTH-01..07 are turning-only).
