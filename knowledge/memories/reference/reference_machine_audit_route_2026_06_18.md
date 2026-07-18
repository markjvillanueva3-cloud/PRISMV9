---
name: reference_machine_audit_route_2026_06_18
description: "GET /api/machine-audit backend route shipped (slot:romeo 2026-06-18): real JM-fleet machine-data-completeness audit for the SPA MachineDataAuditPage (was 404->mock). routes/machineAudit.ts wires ShopConfigurationEngine + MachineDataAuditEngine via a flat->nested adapter, audited vs PRISM's TRACKED attributes (REQUIRED_MAPPABLE). Fixed a scrutiny-arm-B P1 (all-red 54-field audit -> meaningful tracked-subset signal)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.648Z
aliases: reference_machine_audit_route_2026_06_18
---


# GET /api/machine-audit backend route (slot:romeo, 2026-06-18)

Backend-for-frontend route the operator goal demanded ("move to backend tasks so we can focus on frontend").
The SPA `web/src/pages/MachineDataAuditPage.tsx` (MCAT-MS0 U-MCAT19) does `GET /api/machine-audit` expecting
`{machines: MachineAuditRecord[], summary: AuditSummary}`; no backend existed -> it 404'd and fell back to
random MOCK data. Now served by `mcp-server/src/routes/machineAudit.ts` (`createMachineAuditRouter`, mounted
`app.use("/api/machine-audit", ...)` in registerRoutes).

## How it works (romeo WIRES two existing engines; builds no new engine)
- `ShopConfigurationEngine.getMachines()` -> the REAL 21 JM machines (FLAT `ShopMachine` shape).
- `toCanonical()` restructures the real values into the NESTED `CanonicalMachinePackage` paths the audit
  navigates (`max_rpm`->`spindle.max_rpm`, `max_power_kw`->`spindle.power_continuous_kw`,
  `max_torque_nm`->`spindle.torque_max_nm`, `spindle_taper`->`spindle.taper`, `work_envelope.{x,y,z}_mm`->
  `envelope.{x,y,z}_travel_mm`, `controller`->`controller.family`, `coolant_types[0]`->`coolant.type`).
  MOVES real values only; absent fields stay absent (honestly audited missing).
- `MachineDataAuditEngine.auditMachineFields()` (static) gives per-field presence; the route computes the
  4 SPA category booleans + completeness over `REQUIRED_MAPPABLE` (the tracked attributes), not all 54.

## THE FIX (scrutiny arm-B P1, both arms agreed)
First pass used `categoryComplete` = ALL canonical fields present + `calculateCompleteness` / 54 fields.
Since `ShopMachine` carries only a subset (~21 of 54 fields it can never supply), EVERY category read false
and completeness floored at ~0.12 for all 21 machines -> a data-rich Okuma rendered "0%/all-red" = MISLEADING
(R12). Fix: audit against `REQUIRED_MAPPABLE` = the universally-tracked, speed/feed-relevant fields
(spindle rpm/power/torque, controller.family, envelope x/z, coolant.type; mill-only taper/envelope.y EXCLUDED
so lathes are judged fairly). Real distribution now: Okuma lathes ~1.0/all-complete, data-thin mills 0.36-0.45
with gaps surfaced -> real variation, meaningful signal. NOT a softening (verified: not trivially 1.0-for-all).

## Honesty (R12) -- documented in-file, deferred to foxtrot MCAT enrichment
- `backfilled_fields: []` (route does no backfill) -- foxtrot: `MachineDataHardeningEngine` provenance.
- `confidence_overall` = completeness_score (LABELED presence-proxy) -- foxtrot: `MachineQualityScoreEngine`.
- completeness is "vs PRISM's TRACKED attributes", not the full 54-field canonical ideal (foxtrot: full view +
  per-machine-TYPE criteria). Posted to chat-bus (event machine-audit-base-shipped-correction).

## Verified
`mcp-server/src/__tests__/machineAudit-route.test.ts` 5/5 -- registerRoutes-level (fails-on-revert, R9); real
fleet (count==getMachines().length, real id present, NOT 50 mocks); shape+ranges; backfilled==[]; MEANINGFUL
signal (>=1 machine spindle_complete=true, summary.spindle_complete>0, tracked machine completeness>0.3);
negative-control 404. tsc clean. 2-arm per-file scrutiny PASS (arm-B re-review confirmed the P1 fix).
UNCOMMITTED on shared tree (lane guard; fleet sweep folds). Spec: FRONTEND-BACKEND-CONTRACT-2026-06-18.md.
Sibling: [[reference_frontend_backend_contract_audit_2026_06_18]].
