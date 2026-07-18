# WIRE-UNWIRED-MS0/U-WIRE-OSC — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-OSC: wire OperatingSystemCoordinationEngine into prism_dev (2 read actions + engine-pair test)

**Commit:** `994124df6eb0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T08:06:46-05:00
**Tags:** wire-unwired-ms0, u-wire-osc, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-OSC: wire OperatingSystemCoordinationEngine into prism_dev (2 read actions + engine-pair test)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-OSC: wire OperatingSystemCoordinationEngine into prism_dev (2 read actions + engine-pair test)

Wires 2 pure-read static methods through prism_dev:
- osc_list_hot_jobs              -> static listHotJobs()
- osc_build_messages_workspace   -> static buildMessagesWorkspace(input?)

Engine is the backend authority for operating-system messages
(per-scope inboxes for admin/machinist/inspector/planner) and hot
jobs (priority queue). Both wired methods are pure reads:
- listHotJobs reads the module-scope hotJobs[] array
- buildMessagesWorkspace composes per-scope summary + threads +
  linked records from module-scope catalogs (no shared state mutation)

Both methods are STATIC on the class — called as
OperatingSystemCoordinationEngine.<method> (NOT via the singleton at
engine line 586).

DEFERRED:
- setHotJob(record): mutates the shared module-scope hotJobs[]
  array. LLM-callable would let any chat thrash peer chats' hot-job
  priority queue (state-mutation class — peer queue thrash risk).
- clearHotJob(jobId): same risk class (peer queue mutation by id).

DoS guards:
- profileId: 1-128 chars (optional)
- email: 0-256 chars (optional, nullable)
- threadId: 0-256 chars (optional, nullable)

Test coverage: 25/25 vitest PASS across both files:
- dispatcher.operatingSystemCoordination.test.ts (12 tests): Zod
  schema validation (3 — base accept / oversize reject), 3 hot-job
  list tests (count parity / routing proof / idempotency), 4
  workspace tests (default invocation 10-field shape + 4 wire-count
  discriminators / 4-scope variability / invalid-threadId fallback
  to ws.threads[0].id / routing proof selectedThreadId+summary),
  2 error envelope.
- OperatingSystemCoordinationEngine.test.ts (13 tests): listHotJobs
  (3 — array shape + idempotent + 7-field HotJobRecord contract);
  buildMessagesWorkspace (10 — 10-field default workspace / 4-scope
  variability + distinct-summary invariant (>=3 unique) / invalid
  threadId fallback / valid threadId selection / activeMailbox
  contains '@' / identityLabel matches '... · ...' pattern (engine
  line 572) / channel-count >= 1 / null-email + null-threadId
  boundary / unknown-profileId adversarial / idempotent same-input).

Test note: this file calls listHotJobs as READ. It does NOT call
setHotJob/clearHotJob, so it does not perturb the in-memory hotJobs
array that peer chats may also be reading.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- .../OperatingSystemCoordinationEngine.test.ts      | 136 +++++++++++++++++
- .../dispatcher.operatingSystemCoordination.test.ts | 166 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  17 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  32 +++-
- 4 files changed, 350 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- note: this file calls listHotJobs as READ. It does NOT call

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 994124df6eb0`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._