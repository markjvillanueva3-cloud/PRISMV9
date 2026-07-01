# LATHE-PROD-READY-MS0 / U-LPR-WETRUN-WIRE — expose FSM via MCP

## Context

`LATHE-PROD-READY-MS0` is the in-progress milestone driving JM Die's print-to-program pilot. The last 13 commits built the wet-run pilot chain (orchestrator → dashboard → alert → notify → delivery → shift-handoff). One earlier unit, **U-LPR-WETRUN-FSM**, landed a `WetRunStateMachineEngine` (487 LOC, 5-state FSM: `WET_PASS → WET_SOFT_FAIL / WET_HARD_FAIL → QUARANTINE → RESOLVED`) with a companion test file, but the engine is **orphaned** — no dispatcher exposes it over MCP. Until it is wired, operators and upstream orchestrators cannot start sessions, record outcomes, submit post-mortems, or clear quarantines through the platform, which blocks `U-LPR68` (first wet-run pilot) and the `WET_HARD_FAIL → QUARANTINE → RESOLVED` governance path.

This unit wires the FSM into the `prism_safety` dispatcher following the exact pattern established by `U-LPR-ORCH-WIRE2` (pilot-orchestrator safety projection) and `U-LPR-ALERT / NOTIFY / DELIVERY` (kill-switch-style multi-case dispatch).

## Scope — 14 new `prism_safety` actions

Expose every public method of `WetRunStateMachineEngine` over MCP:

| Action | Engine method | Purpose |
|---|---|---|
| `wet_run_fsm_start_session` | `startSession` | Begin WET_PASS session |
| `wet_run_fsm_get_session` | `getSession` | Fetch one session |
| `wet_run_fsm_list_sessions` | `listSessions` | Filter by state / tenant |
| `wet_run_fsm_record_part` | `recordPartOutcome` | Pass or scrap; auto-transitions |
| `wet_run_fsm_record_safety` | `recordSafetyEvent` | Forces WET_HARD_FAIL → QUARANTINE |
| `wet_run_fsm_submit_postmortem` | `submitPostMortem` | ≥2 approvers, ≥20-char root-cause |
| `wet_run_fsm_clear_quarantine` | `clearQuarantine` | 5-day hold + post-mortem required |
| `wet_run_fsm_resolve` | `resolveSession` | Advance / rerun / abort non-quarantine |
| `wet_run_fsm_list_transitions` | `listTransitions` | Audit trail |
| `wet_run_fsm_list_scrap` | `listScrapEvents` | Scrap ledger |
| `wet_run_fsm_list_safety_events` | `listSafetyEvents` | Safety-event ledger |
| `wet_run_fsm_get_postmortem` | `getPostMortem` | Retrieve post-mortem doc |
| `wet_run_fsm_list_clearances` | `listClearances` | Quarantine clearances |
| `wet_run_fsm_stats` | `getStats` | Aggregate counters + hard-fail rate |

## Files to modify

### 1. `mcp-server/src/tools/dispatchers/safetyDispatcher.ts`
- Add `WET_RUN_FSM_ACTIONS: Set<string>` alongside `WET_RUN_PILOT_ACTIONS` (keep the two sets separate — FSM is session-state, orchestrator is promotion-readiness projection).
- Include the new set in `ALL_ACTIONS` (feeds the `z.enum` tool descriptor).
- Add handler branch `else if (WET_RUN_FSM_ACTIONS.has(action)) { ... }` **before** the `else` that returns "Unknown safety action". Lazy-import `wetRunStateMachineEngine` singleton (mirrors kill-switch pattern at lines 188-252) and switch on `action`, translating `params` → engine method arguments.
- Route events through the same `response_level` formatter already wired at lines 368-381.

### 2. `mcp-server/src/schemas/safetyActionSchemas.ts`
- Add a new section `// Wet-Run FSM (U-LPR-WETRUN-WIRE) — 14 actions` after kill-switch (line 665).
- Define Zod schemas mirroring engine argument shapes:
  - `wetRunFsmStateEnum = z.enum(["WET_PASS","WET_SOFT_FAIL","WET_HARD_FAIL","QUARANTINE","RESOLVED"])`
  - `wetRunFsmSafetyKindEnum` (7 kinds, matches `SafetyEventKind`)
  - `wetRunFsmStartSchema`, `wetRunFsmSessionIdSchema`, `wetRunFsmListSchema`, `wetRunFsmRecordPartSchema`, `wetRunFsmRecordSafetySchema`, `wetRunFsmPostMortemSchema`, `wetRunFsmClearSchema`, `wetRunFsmResolveSchema`, `wetRunFsmListTransitionsSchema`, `wetRunFsmNoParams`.
  - Honor engine validation boundaries (≥10-char `detail`/`evidence`/`notes`, ≥20-char `root_cause`/`remediation`) via `z.string().min(N)` so bad requests reject at the schema layer, not in-engine.
- Register all 14 entries in `ACTION_SAFETY_SCHEMAS` (line 672 map).

### 3. `mcp-server/src/__tests__/dispatchers/safetyDispatcher.test.ts` *(or a new `safetyDispatcher.wetRunFsm.test.ts` if the main file is crowded)*
- Smoke-test each of the 14 actions through the dispatcher tool callback.
- One full happy-path scenario exercising `start → record_part(pass) → record_part(scrap, root_cause) → record_safety → get_session (state=QUARANTINE) → submit_postmortem → clear_quarantine (with time advance override) → stats`.
- One schema-rejection case per critical constraint (missing `session_id`, short `detail`, <2 approvers).
- Before-each must call `wetRunStateMachineEngine.clearAll()` to avoid cross-test pollution (singleton shared across dispatcher calls).

## Conventions honored

- **Dispatcher rules** (`dispatchers.md`): action names snake_case, action in `z.enum` matches case statement exactly, lazy import of engine, `{success: true, data}`-shaped return (reused via existing dispatcher wrapper).
- **Schema rules** (`schemas.md`): Zod v4, `.describe()` on every field, enum values snake_case where user-facing.
- **Safety dispatcher invariant**: `SafetyBlockError` must propagate — preserved by existing `catch (error)` at line 382.
- **Anti-regression**: action count increases by 14. No existing action signatures change.

## Reused existing code

- `wetRunStateMachineEngine` singleton — `mcp-server/src/engines/WetRunStateMachineEngine.ts:487`.
- `validateActionParams` / `dispatcherError` — `mcp-server/src/utils/dispatcherMiddleware.ts` (already imported).
- `formatByLevel` response-level shaping — `mcp-server/src/types/ResponseLevel.ts` (already imported).
- `safetyExtractKeyValues` — extend with FSM-specific keys (`state`, `scrap_count`, `safety_event_count`, `hard_fail_rate`) so summary responses stay terse.

## Verification

```bash
cd mcp-server

# 1. Typecheck — touched files only (fast)
npx tsc --noEmit 2>&1 | grep -E "safetyDispatcher|safetyActionSchemas" || echo "CLEAN"

# 2. FSM engine tests (unchanged, must still pass)
npx vitest run src/__tests__/engines/WetRunStateMachineEngine.test.ts

# 3. New dispatcher wiring tests
npx vitest run src/__tests__/dispatchers/safetyDispatcher.test.ts

# 4. Full sweep — confirm no collateral regressions
rtk npx vitest run

# 5. Prod build
npm run build:fast
```

Acceptance: all tests pass, `tsc --noEmit` clean, build green, 14 new actions reachable, FSM happy-path integration test green including quarantine 5-day gate (using `now` override).

## Commit

Single commit on `main`, YOLO-mode auto-commit format per memory:

```
LATHE-PROD-READY-MS0/U-LPR-WETRUN-WIRE: expose WetRunStateMachineEngine via prism_safety

14 new actions wire the FSM into MCP following U-LPR-ORCH-WIRE2 pattern:
 start/get/list sessions, record part/safety events,
 submit postmortem, clear quarantine, resolve, audit queries, stats.
```
