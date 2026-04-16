# FMERGE / APPW 20-Role Scrutiny

Updated: 2026-04-10T19:40:00-05:00
Author: Codex
Scope: `H:/PRISM/mcp-server/web`, `H:/PRISM/web`, `H:/PRISM/mcp-server/data/milestones/FMERGE-MS1.json`, `H:/PRISM/mcp-server/data/milestones/APPW-MS8.json`, `H:/PRISM/PRISM-UNIFIED-ROADMAP-v2.md`

Status: Full 20-agent scrutiny complete across roadmap alignment, merge execution, machine workspace coverage, commercial truth posture, employee/mobile trust, viewer/simulation release truth, and multi-seat recovery.

## Critical Drift

1. The unified roadmap still recommended `PRISM/web` as canonical after FMERGE-MS0 had already published `H:/PRISM/mcp-server/web` as the canonical frontend target. This would reintroduce split-brain for new seats if left uncorrected.
2. `FMERGE-MS1` is directionally correct, but it is still too implicit about donor frontend API/hook layers. Surviving donor pages cannot be copied with their old `web/src/api`, `web/src/hooks`, `web/src/components/ui`, or donor shell/layout stack intact.
3. `APPW-MS8` was stricter than `FMERGE-MS1` on browser-backed verification, machine-workspace coverage, and fail-closed product posture, but it was also still assuming planned tooling already existed. Both milestones needed clearer execution surfaces.

## Launch Blockers

1. Browser-backed release truth does not exist yet. `/page-sweep`, `playwright.config.ts`, and the page/interaction/machine-CAD manifests were milestone promises rather than live infrastructure.
2. Shared machine CAD and print-to-program capability is still calculator-only. Routed lathe, wire, and print-to-CNC flows still need the same geometry-editing contract.
3. Critical employee/mobile, purchasing, machine-rate, and inventory flows still under-disclose source freshness/provenance or fail open on missing live identity/contracts.
4. Viewer/backplot/simulation still tolerates demo or placeholder posture, which keeps manual prove-out in the loop.
5. Recovery surfaces were stale enough that new Claude/Codex seats could pick the wrong tranche or wrong frontend target.

## 20 Role Lenses

1. Merge architect: Canonical target is correctly `H:/PRISM/mcp-server/web`; donor app is a source of surviving features, not a peer deployable app.
2. Route registrar: Donor-only pages still materially matter, especially `TurningPage.tsx`, `EdmPage.tsx`, `WireEdmStudioPage.tsx`, `MachineLivePage.tsx`, and `MechanicalDesignPage.tsx`.
3. CAD workspace owner: Machine-page CAD is still trapped inside calculator/program-release surfaces and must be extracted as shared workspace primitives before page migration claims are credible.
4. Wire EDM operator: The strongest donor value remains the step-oriented WEDM flow in `web/src/components/wedm-studio`, but `StepImport.tsx` still leaves sketch mode disabled and cannot be copied as “complete”.
5. Lathe operator: Donor `TurningPage.tsx` is useful as an operation grouping reference, but its old UI/hook stack should be decomposed into canonical machine workspace and typed client surfaces rather than mounted whole.
6. Machine-live operator: Donor `MachineLivePage.tsx` matters only if remapped onto canonical live-provider seams and the mounted `/api/v1/machine-live` backend contract.
7. Mechanical-design owner: Donor `MechanicalDesignPage.tsx` aligns with an unmounted backend route candidate (`mechanical.ts`) and should stay conditional until backend registration is explicit.
8. Diagnosis owner: Donor diagnosis/thermal/vibration surfaces are relevant only if their unmounted backend route modules are either mounted or explicitly waived.
9. ERP owner: Donor ERP/dashboard/admin/settings surfaces should not be merged because the canonical app already owns the routed business shell and protected-route posture.
10. Commerce owner: APPW already proves purchasing/material/machine-rate/vendor flows need canonical source-state disclosure; donor commerce surfaces are not a shortcut and should not compete with APPW.
11. Employee/mobile owner: Merge work must not regress the canonical employee shell into donor kiosk-era assumptions.
12. Viewer/simulation owner: Donor viewer-related patterns should not bypass the canonical viewer stack while demo fallback still exists.
13. Theme/system owner: Donor `components/ui`, `components/shared`, and `components/layout` should not be union-copied because APPW is standardizing on calculator-theme primitives in the canonical app.
14. API client owner: Donor `web/src/api/*.ts` wrappers should be reviewed as migration references only; surviving flows must converge into canonical typed clients instead of duplicating client layers.
15. Hook owner: Donor `web/src/hooks/*.ts` should not be preserved wholesale; surviving behavior must be remapped onto canonical provider seams or new shared hooks.
16. Testing owner: FMERGE output must be explicit enough that APPW can generate route manifests and Playwright coverage against one stable target.
17. Release owner: Any donor feature left in “coming soon”, demo, or synthetic posture must be merged only behind an explicit partial-live or unavailable contract.
18. Roadmap owner: FMERGE, APPW, roadmap index, and unified roadmap must all say the same canonical target and same non-goals.
19. Task-system owner: Merge discoveries should create or refine execution notes, but they should not reopen canonical-target debate that FMERGE-MS0 already closed.
20. Multi-seat coordinator: New Claude/Codex seats must be able to resume from the queue and roadmap docs without rediscovering which frontend is canonical.

## Explicitly Keep

- `H:/PRISM/web/src/pages/TurningPage.tsx`
- `H:/PRISM/web/src/pages/EdmPage.tsx`
- `H:/PRISM/web/src/pages/WireEdmStudioPage.tsx`
- `H:/PRISM/web/src/pages/MachineLivePage.tsx`
- `H:/PRISM/web/src/pages/MechanicalDesignPage.tsx`
- `H:/PRISM/web/src/components/wedm-studio`

These are donor review targets, not auto-merge targets.

## Explicitly Do Not Merge Wholesale

- `H:/PRISM/web/src/components/ui`
- `H:/PRISM/web/src/components/shared`
- `H:/PRISM/web/src/components/layout`
- `H:/PRISM/web/src/pages/AdminPage.tsx`
- `H:/PRISM/web/src/pages/SettingsPage.tsx`
- `H:/PRISM/web/src/pages/ErpDashboard.tsx`
- `H:/PRISM/web/src/api`
- `H:/PRISM/web/src/hooks`

These would recreate a second frontend architecture inside the canonical app.

## Backend Route Dependency Disposition

- Already mounted and should be treated as canonical integration targets:
  - `H:/PRISM/mcp-server/src/routes/machineLive.ts`
  - `H:/PRISM/mcp-server/src/routes/pipeline.ts`
  - `H:/PRISM/mcp-server/src/routes/integrations.ts`
  - `H:/PRISM/mcp-server/src/routes/viewer.ts`
- Still unmounted and require explicit FMERGE disposition before related donor pages can be promoted:
  - `H:/PRISM/mcp-server/src/routes/mechanical.ts`
  - `H:/PRISM/mcp-server/src/routes/cncOps.ts`
  - `H:/PRISM/mcp-server/src/routes/diagnosis.ts`
  - `H:/PRISM/mcp-server/src/routes/thermal.ts`
  - `H:/PRISM/mcp-server/src/routes/vibration.ts`

## Concrete Merge-Plan Edits Required

1. Materialize explicit FMERGE child tasks in the queue: donor page review, donor component convergence, route inventory audit, survivor route ledger, canonical client/hook convergence, and final build/proof.
2. Convert `APPW-MS8-U39` into the real `/page-sweep` preflight and live route/page census task instead of letting APPW rely on hardcoded counts.
3. Re-sequence APPW around the real gaps: shared surface/design-contract extraction, machine workspace + selector authority convergence, shell/dialog + commercial/operator truth convergence, routed-page fail-closed hardening, then authoritative page-sweep verification.

## APPW Planning Impact

- `APPW-MS8` remains the correct place for browser-backed route coverage, shared machine-workspace promotion, purchase-intelligence convergence, and fail-closed employee/mobile posture.
- `FMERGE-MS1` should finish as a narrow merge/review milestone, not expand into APPW work.
- The output of `FMERGE-MS1` must be explicit enough that `APPW-MS8-U39` and `U-APPW44` do not need to rediscover which donor surfaces survived.

## Encoded Into The Task System

- `FMERGE-MS1-U04` through `U08` are now materialized in `TASK_QUEUE`.
- `APPW-MS8-U39` now represents `/page-sweep` preflight + live route/page census + browser-truth harness.
- `CURRENT_POSITION.md` and `HANDOFF.md` now point new seats to the `FMERGE -> APPW` tranche instead of legacy WEDM-first recovery.
