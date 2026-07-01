---
name: loop-state-read-api-2026-06-14
description: 2026-06-14 (slot:bravo) — exported readFleetLoops() from loop-state.mjs: programmatic fleet loop-state query (the safe .mjs foundation for the future prism_session:loop_state_query dispatcher action). cmdList delegates to it (DRY, behavior-preserving). Commit 4c0410301b, 26/26 tests, live-verified on 289 loops.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.647Z
aliases: reference_loop_state_read_api_2026_06_14
---


2026-06-14 (slot:bravo, session 17b9f42e, AGENTIC-SUBSTRATE-BRIDGE /loop iter2) — `U-LOOP-STATE-READ-API`.

## What + why
The `/loop` infra (`.claude/helpers/loop-state.mjs`) had a CLI (`loop-state.mjs list`) but no IMPORTABLE reader -- dispatchers/hooks/scripts had to shell out to query fleet loop state. The agentic-substrate-bridge plan's round-1 #3 (a `prism_session:loop_state_query` dispatcher action) needs a programmatic reader. Built the safe .mjs-only foundation FIRST (R13 logical order); the TS dispatcher action wraps it later in fresh context (the dispatcher needs the heavy mcp-server TS build, which is spiral-risk at deep context).

## Files (commit 4c0410301b, [MAIN-FORCE] cad-fusion-live-ms0)
- `.claude/helpers/loop-state.mjs`: added `export function readFleetLoops({dir, now})` -> `{count, loops[]}` (sorted freshest-first; fail-soft on missing dir / corrupt file; injectable `now` for deterministic staleMs). Refactored `cmdList` to delegate -> ONE read path (DRY), output shape UNCHANGED.
- `.claude/helpers/loop-state-readfleet.test.mjs`: 6 R9 tests (sort order, iter/target/status field carry, fail-soft missing-dir, corrupt-skip, non-loop-file filter, empty).

## Verification (R15)
- TEST 6 new + existing loop-state tests pass (26/26).
- VALIDATE (live, behavior-preserving): `node loop-state.mjs list` reads 289 real fleet loops, output shape `{ok:true,count,loops}` identical to pre-refactor.
- ADDITIVE: the LIVE loop hooks (tick/start/iteration-inject/force-loop-continue) use start/tick, NOT cmdList's internals -- untouched. Safe to edit the load-bearing loop helper because the change is purely additive + delegation with a test-pinned + live-verified shape.

## DISPATCHER CONSUMER -- SHIPPED (commit 79f452a2bf, U-LOOP-STATE-QUERY-DISPATCHER, same session)
`prism_session:loop_state_query` wired in `mcp-server/src/tools/dispatchers/sessionDispatcher.ts`: added to the ACTIONS enum + a `case` that re-reads the SAME on-disk loop-*.json contract (cross-module-root, so re-read in TS rather than importing the .mjs readFleetLoops -- the helper is outside the mcp-server TS build) -> {success, count, loops[]} sorted freshest-first, fail-soft, optional `active_only` filter + `loop_state_dir` override (test isolation, mirrors coordination_record's ledger_path). 7 dispatcher round-trip tests (`sessionDispatcher.loopStateQuery.e2e.test.ts`, via the captureHandler harness copied from coordinationLedger.dispatcher.e2e.test.ts) + 2/2 scrutiny (wiring-review + test-review) PASS; tsc clean. Reviewer-flagged NaN-timestamp edge fixed inline (staleMs guarded null) + R9-pinned. Round-1 #3 COMPLETE end-to-end (foundation + consumer). → [[reference_agentic_substrate_bridge_2026_06_14]] · [[reference_cag_hitrate_telemetry_2026_06_14]]

### Test-harness reuse note (fleet-wide)
To round-trip-test ANY prism_session action: copy the captureHandler/invoke harness from `mcp-server/src/__tests__/coordinationLedger.dispatcher.e2e.test.ts` (mock McpServer.tool() captures the handler; invoke {action, params}; parse content[0].text). The ok() wrapper SLIMS empty arrays AND null values -> absent, so assert via count + `x == null` normalization, not `toEqual([])`/`toBeNull()`.

## GOTCHA learned this session
`git commit -m "...\`backtick\`..."` (DOUBLE quotes) -> bash command-substitutes the backtick content (ate `loop-state.mjs list` from a commit body). Use single-quoted -m or `git commit -F -` heredoc for messages containing backticks. → [[feedback_commit_msg_backtick_substitution]]
