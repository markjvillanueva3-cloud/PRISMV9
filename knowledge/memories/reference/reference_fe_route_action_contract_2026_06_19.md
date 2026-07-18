---
name: reference_fe_route_action_contract_2026_06_19
description: "FE-route to dispatcher-action static contract verifier (sierra) -- catches the registered-dispatcher-non-resolving-action silent 200+{error} footgun fleet-wide; found 16 live P0s."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.573Z
aliases: reference_fe_route_action_contract_2026_06_19
---


# FE-route <-> dispatcher-action contract verifier (U-FE-ROUTE-ACTION-CONTRACT, slot:sierra 2026-06-19)

Closes the silent-failure class that bit the specialty mount (d9b533d27): an Express REST router
calls `callTool("prism_X", "action", ...)` for an action name that does NOT exist on the `prism_X`
dispatcher. The dispatcher's `z.enum(ACTIONS)` rejects it -> callTool returns `{ error }` with HTTP
**200** -> the SPA's `if (!res.ok)` cannot detect it. Romeo's mount-prefix audit (layer 1) and the
per-domain behavioral `route-contract-*.test.ts` (layer 3) both MISS this; this is **layer 2**.

## Three-layer FE<->BE contract chain (no overlap)
1. **SPA fetch-prefix <-> mounted route path** -> `scripts/audit-frontend-backend-contract.mjs` (romeo, [[reference_frontend_backend_contract_audit_2026_06_18]])
2. **mounted route's callTool action <-> dispatcher action set** -> THIS tool (the gap)
3. **engine output shape** -> `mcp-server/src/__tests__/route-contract-*.test.ts` (cam-ppg/erp-context/sfc-speedfeed, behavioral)

## Assets
- `scripts/lib/fe-route-action-contract.mjs` -- pure lib. Parses each dispatcher's resolvable action
  set = union of `z.enum(CONST)` (const array, spread-resolving, **incl. `new Set([...])` consts** --
  safetyDispatcher declares action groups as `new Set([...])` and spreads them) + inline `z.enum([...])`
  + `case "x":` labels + any `const *_ACTIONS=[...]`. Conservative union -> no false alarms; still
  catches the footgun actions (which appear NOWHERE). Dispatchers whose action set is reachable only
  through object-key/ACTION_MAP dispatch (prism_fluid_thermal, prism_mechanical -- `z.string()` action
  param + a runtime lookup map) yield 0 parseable actions and are reported **UNVERIFIABLE**, never
  broken (R12). (prism_safety WAS UNVERIFIABLE until the `new Set([...])` parser fix surfaced its 3 P0s.)
- `scripts/audit-fe-route-action-contract.mjs` -- CLI (`--json --p0-only --fail-on-p0 --out <path>`).
- `scripts/lib/fe-route-action-contract.test.mjs` -- 11 tests: pure-fn fixtures + controlled e2e
  classification + LIVE parser false-negative guard (resolves login/refresh_token/wheel_select).
- `state/shared/FE-ROUTE-ACTION-CONTRACT-AUDIT.json` -- snapshot report (regen via `node scripts/audit-fe-route-action-contract.mjs --out state/shared/FE-ROUTE-ACTION-CONTRACT-AUDIT.json`).

## Severity model
- **P0** = MOUNTED router calls a non-resolving action (live silent breakage).
- **INFO** = UNMOUNTED router, same problem (deferred/expected).
- **UNVERIFIABLE** = dispatcher action set not statically parseable.
- **DYNAMIC** = action arg is a variable/template (can't verify statically).

## Live finding (2026-06-19): 19 P0s across 7 mounted routers (verified TRUE, not parser artifacts)
- `auth.ts`: `refresh` (dispatcher has `refresh_token`!), `logout`, `whoami`, `generate_key` -- all absent. Live login/session breakage.
- `safety.ts`: `validate`, `check_limits`, `collision_check` (real action is `check_toolpath_collision`) -- SAFETY-CRITICAL silent failure; surfaced by the `new Set([...])` parser fix.
- `admin.ts`: `prism_dev:{status,registry_stats,dispatcher_inventory,cache_clear}`, `prism_tenant:user_manage`, `prism_compliance:audit_log`.
- `cost.ts`: `prism_intelligence:{cost_compare,cost_history}`.
- `exportRoutes.ts`: `prism_export:render_speed_feed_card`. `quality.ts`: `prism_quality:capability_analysis`. `schedule.ts`: `prism_scheduling:{machine_status,conflict_detect}`.
- Also: 30 INFO (unmounted routers, same class -- deferred) + 6 UNVERIFIABLE (prism_fluid_thermal) + 10 DYNAMIC.

Each P0 is a frontend feature that 200+{error}-fails silently. Fixes = reconcile each route to the
real action name (e.g. auth `refresh`->`refresh_token`) or build the missing action; sequenced as
follow-on units (auth first -- foundational). Re-run the CLI after each fix to confirm P0 count drops.

Sibling: [[reference_frontend_backend_contract_audit_2026_06_18]]. Doctrine: R12 fail-loud, R15 wire-test-validate.
