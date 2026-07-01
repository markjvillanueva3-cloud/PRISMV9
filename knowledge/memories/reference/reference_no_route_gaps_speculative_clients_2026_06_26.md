---
name: reference_no_route_gaps_speculative_clients_2026_06_26
description: The 158 no-route FE<->backend gaps are largely SPECULATIVE clients ahead of stub/absent backends -- wiring them as thin routes would create broken routes (R12). Verified on cadGeometry; cadDispatcher geometry_analyze is a stub.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.665Z
aliases: reference_no_route_gaps_speculative_clients_2026_06_26
---


# The no-route wiring gaps are speculative-client-ahead-of-backend, not thin-route wires (slot:quebec, 2026-06-26)

After the wiring auditor classified 170 gaps -> 158 no-route + 8 near-miss + 4 dynamic ([[reference_fe_route_wiring_audit_harness_2026_06_26]]), I attempted to close a cluster (crossroad-auto-decide: proceed, don't idle). The R8 verification (check the backend exists + matches BEFORE wiring) stopped an unsafe wire and revealed the pattern.

## Verified case: cadGeometry (4 no-route gaps) is NOT wireable as thin routes
`web/src/api/cadGeometry.ts` (`cadGeometryApi`) posts to `/api/v1/cad/geometry/{import,features,simplify,compare}` and expects a rich `GeometrySummary` (part_id, bounding_box, volume_cm3, surface_area_cm2, feature_count, issues). The backend reality:
- `routes/cad.ts` has `/cad/import`, `/cad/analyze` (-> `geometry_analyze`) -- DIFFERENT paths, and only 2 of the 4.
- **`cadDispatcher.ts:714 geometry_analyze is a STUB**: `result = engine.analyze?.(params) ?? { analysis: "geometry_properties", params }` -- returns a placeholder when the engine lacks `analyze`. Does NOT produce `GeometrySummary`. (A real no-stub-engine violation; owner = delta/cad.)
- `features` / `simplify` / `compare` (by part_id / two part_ids) have **no matching backend action** (the richer `geometry_compare_files`/`geometry_extract_metrics`/`geometry_hausdorff` exist but take a different contract).
=> Wiring thin routes here would return stub/placeholder data to the client -> a BROKEN route (R12). So it is NOT done. Closing it = real geometry-engine work to satisfy the `GeometrySummary` contract.

## The pattern (do NOT mechanically wire no-route gaps)
These FE clients were largely scaffolded AHEAD of the backend. A "no-route" gap is NOT proof that "the backend exists, just add a route" (that was true for ToolCribEngine/tool_crib_* but is the EXCEPTION). Each cluster MUST be verified: (1) does the dispatcher action exist? (2) is it real (not a `?? {stub}` fallback)? (3) does its output match the client's typed contract? Only then is it a thin route (like U-TOOLCRIB-ROUTE / U-SFC-KIENZLE-ROUTE). Otherwise it is engine work in the OWNER's domain.

## Ownership of the 158 no-route gaps (coordinate, do not silently duplicate)
- **51 client.ts** -- mostly ERP (payroll/kanban/receiving/shipping/calibration/osha/ncr/audit) = **hotel**, who already ships `audit-erp-fe-route-wiring.mjs` + a 73-dead-call dead-surface map ([[reference_post_ship_hotel-u-hotel-fe-wiring-audit]]). Leave to hotel.
- **admin(5)** -- sensitive (users/config/cache-purge); needs auth+role allowlist like `business.ts`.
- **orchestration: adaptiveControl/atcs/autonomous (12)** -- run/cancel/stage = state ops; need verifyToken; owner golf/zulu.
- **cadGeometry(4)** -- delta (stub backend, above).
- Rest: doc/learning/ppg/context/shop/business -- respective owners.

## Session results (7 clusters verified, 6 clean wires shipped)
After the crossroad-auto-decide directive (proceed, don't idle), I verified clusters and shipped the CLEAN ones:
- **SHIPPED (real non-stub backend, contract matched):** `ppg/history` (U-PPG-HISTORY-ROUTE, ab3dc20bde) · `dev/{quality-dashboard,pillar-summary,capability-census}` (U-DEV-DASHBOARD-ROUTES, 723f17e577; `dev/inventory` left -- no `prism_dev:inventory` action) · `machine-live/{list,maintenance}` (U-MACHINELIVE-METHOD-FIX, 42f2ac7a58 -- a METHOD MISMATCH: routes were POST, client called GET; fixed the client).
- **SKIPPED (verified speculative / no backing action -- would be broken wires):** `cadGeometry` (stub `geometry_analyze`), `session/{current,recent,summary}` (no `prism_session` current/recent/summary actions; `session_list` is in prism_orchestrate), `omega/status` (router has /history not /status), `context/recent` (router has /todo not /recent).
- **Auditor hardened:** inline `app.<verb>` route scan (de-flagged alarm-decode false-positive) + `classifyCall` method-mismatch bucket (U-WIRE-AUDIT-METHOD-MISMATCH, 78098abb71). Final live: **162 dead = 148 no-route + 2 method-mismatch + 8 near-miss + 4 dynamic** (was 170).
- **Method-mismatch is SMALL (2):** admin/users + erp/osha-incidents (both sensitive/cross-domain) -- so the bulk 148 are genuinely-missing backend routes, NOT verb bugs.

**The in-reach clean wins are EXHAUSTED** (verified across 7 clusters). The remaining 148 are speculative-ahead-of-missing/stub-backend (engine work), sensitive (admin, needs auth), or hotel's ERP (51). Those need owner-domain engine work or operator scope authorization -- not quebec thin-routing.

## Conclusion (the operator-scope fork)
Quebec CANNOT mechanically close these as thin routes; a per-cluster verify-then-build sweep is a cross-domain ENGINE program (will hit stub backends like cadGeometry), and several clusters are other owners' active lanes. So "continue closing the 158" is an operator scope decision, not a quebec auto-decide. Recommend: provide the Kienzle Tool Crib design HTML (the headline, backend ready) and let domain owners drive their own no-route gaps with the auditor as the shared loss function. Re-run: `node mcp-server/scripts/audit-fe-route-wiring.mjs`.
