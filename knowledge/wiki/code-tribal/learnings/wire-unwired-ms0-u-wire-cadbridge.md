# WIRE-UNWIRED-MS0/U-WIRE-CADBRIDGE — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CADBRIDGE: wire CadBridge → prism_cad (status, no-spawn)

**Commit:** `27cb36522c28` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T23:30:58-05:00
**Tags:** wire-unwired-ms0, u-wire-cadbridge, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CADBRIDGE: wire CadBridge → prism_cad (status, no-spawn)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CADBRIDGE: wire CadBridge → prism_cad (status, no-spawn)

Files
  mcp-server/src/engines/CadBridge.ts                          +46 LOC
  mcp-server/src/tools/dispatchers/cadDispatcher.ts            +63 LOC
  mcp-server/src/schemas/cadActionSchemas.ts                   +45 LOC
  mcp-server/src/__tests__/cadDispatcher.cadBridgeStatus.test.ts  +224 LOC (11 cases, 11/11 PASS)

What ships
  Engine: two new pure-inspection methods on CadBridge —
    static peekInstance(): CadBridge | null      // live singleton or null
    instance.getStatus(): { initialized:true, ready, starting, processAlive,
                            processPid, pendingRequests, nextRequestId,
                            pythonPath, bridgePath, timeoutMs }
  Neither method spawns Python or starts the JSON-RPC bridge. Both are
  synchronous instance-field reads — safe for high-frequency observability
  polling and for hermetic unit tests.

  Dispatcher: prism_cad gains one action:
    cad_bridge_status — invokes CadBridge.peekInstance() + getStatus(),
                        returns instanceExists=false when no singleton yet.

  Schema: cadBridgeStatusSchema = z.object({}).strict() (empty + strict —
  callers passing stray fields get a clean Zod boundary rejection rather
  than silent ignore).

Why this design
  CadBridge.getInstance() lazily constructs a CadBridge that, on first
  method call, spawns 'python bridge.py' — heavyweight side effect.
  An operability action that exposed bridge.ping() would force-spawn
  Python every time an operator checked "is the bridge up?". This wiring
  exposes ONLY synchronous singleton-state inspection, with a no-spawn
  invariant locked in by 2 test cases.

  CadBridge was identified as built-but-unwired in BUILD_STATE.NEEDS_WIRING
  (sample_engines: CadBridge, suggestedDispatcher prism_cad, no dispatcher
  reference anywhere in the repo). Verified via grep across all
  src/tools/dispatchers/*.ts before adding wiring.

Coverage (11 cases, hermetic — never spawns the Python subprocess)
  * action registration — 'cad_bridge_status' accepted, returns success=true
  * singleton-absent — instanceExists=false, initialized=false, no PID fields
  * singleton-absent — peekInstance() still null after action invocation
  * singleton-present — initialized=true, ready=false, processAlive=false
  * singleton-present — config fields (pythonPath, bridgePath, timeoutMs)
                        from constructor opts; bridgePath matches /bridge\.py$/
  * idempotency — repeat invocations preserve nextRequestId=1, ready=false
  * adversarial — missing params → success=true (params optional)
  * adversarial — extra params → middleware decides; never throws
  * adversarial — typo'd action → 'Unknown action' branch fires
  * no-spawn invariant — 5× consecutive calls, peekInstance() stays null
  * no-spawn invariant — 5× calls after getInstance(), starting/processAlive
                          stay false (getStatus never calls ensureRunning)

Round-trip discipline
  Test invokes through registerCadDispatcher → prism_cad tool handler
  (fakeServer pattern, mirrors devDispatcher.wiringPotential.test.ts).
  Engine singleton is NEVER called directly outside fixture setup —
  every assertion flows: handler({action, params}) → JSON content[0].text
  → JSON.parse → field assertion.

Karpathy R8 schema-first
  slimResponse strips null/undefined/empty payload fields
  (MEMORY.md [[reference_slimresponse_strips_empty_arrays]]).
  Engine returns processPid: null when absent; wire-shape arrives as
  undefined. Test asserts `toBe(undefined)` for the absent case — anchored
  in repo doctrine, not invented for this commit.

Notes
  - .strict() schema means extra-key params get rejected by the
    middleware boundary BEFORE my case fires — adversarial test
    accommodates both "stripped + succeed" and "rejected + error" paths.
  - The existing cad-bridge.test.ts (CC-MS0) continues to test the heavy
    spawning round-trip behind `describe.skipIf(!hasCadQuery)` — that
    coverage is untouched.

Action enum count: prism_cad 202 → 203 (no regressions; check
DISPATCHER_DIGEST.md after the auto-regen settles).
```

## Files touched (5)
- .../cadDispatcher.cadBridgeStatus.test.ts          | 224 +++++++++++++++++++++
- mcp-server/src/engines/CadBridge.ts                |  46 +++++
- mcp-server/src/schemas/cadActionSchemas.ts         |  45 +++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  63 ++++++
- 4 files changed, 378 insertions(+)

## Lessons surfaced in commit body
- till null after action invocation

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 27cb36522c28`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._