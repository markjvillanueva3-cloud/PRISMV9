# ZULU-BUILDLOOP/U-ZBL-C6-CAPABILITY-REGISTRY — [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C6-CAPABILITY-REGISTRY (slot:zulu, operator 'build for bravo'): ZuluCapabilityRegistryEngine -- read-only runtime capability attestation

**Commit:** `96f528bc81e2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T19:20:20-05:00
**Tags:** zulu-buildloop, u-zbl-c6-capability-registry, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C6-CAPABILITY-REGISTRY (slot:zulu, operator 'build for bravo'): ZuluCapabilityRegistryEngine -- read-only runtime capability attestation

## Body
```
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C6-CAPABILITY-REGISTRY (slot:zulu, operator 'build for bravo'): ZuluCapabilityRegistryEngine -- read-only runtime capability attestation

C6 of the hermes-zulu capability queue. Read-only registry that attests, per
live chat slot, its current CAPABILITY to take work: liveness (alive/stale/
crashed/idle from heartbeat age), warmth (warm_since/warm_ms from claimedAt),
queue_depth (active non-released slot-task-claims), domain_affinity
(topic > branch-slot-name > branch > unknown), active_models.

- Pure core (no I/O, deterministic with injected nowMs): classifyLiveness,
  buildAttestation (clamps queue/NaN, null-safe record, R12-honest active_models
  source 'provided'|'unavailable' -- no model-probe stub), buildRegistry
  (null-safe input, sorts alive-first then warmth-desc).
- Instance snapshot()/attest() read chat-slots.json + slot-task-claims.json via
  __forTests + PRISM_CHAT_SLOTS_FILE/PRISM_SLOT_TASK_CLAIMS_FILE env overrides;
  READ-ONLY (no store mutation), degrades (never throws) when files unreadable.
- Wired prism_session: capability_registry_snapshot / capability_attest.
  Actions 385->387.
- 16 tests (13 engine + 3 dispatcher round-trip E2E). esbuild-clean, 0 tsc
  errors in C6 files. Full Zulu suite 195/195 green.
- Fixed pre-existing Zebra->Zulu rename debris in ZuluTaskAuctionEngine.test.ts
  (imported nonexistent ZebraTaskAuctionEngine.js -- unloadable on HEAD; same
  class as the C4 governor-test fix).

R9 caught a real null-access bug pre-ship: buildRegistry(null) threw at
input.claimCounts (only input.slots was guarded) -> fixed the producer (guard
input once), not the test. R12: active_models honest 'unavailable' default.

3-of-3 scrutiny PENDING (reviewer agents rate-limited, reset 8pm CT 2026-06-15);
batched with C5 for the next agent-available window before clearance.
```

## Files touched (6)
- mcp-server/src/__tests__/ZuluCapabilityRegistryEngine.dispatch.test.ts |  84 ++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/ZuluCapabilityRegistryEngine.test.ts          | 174 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/ZuluTaskAuctionEngine.test.ts                 |  42 +++++++--------
- mcp-server/src/engines/ZuluCapabilityRegistryEngine.ts                 | 306 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts                  |  25 +++++++++
- 5 files changed, 610 insertions(+), 21 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 96f528bc81e2`
- Milestone envelope: `mcp-server/data/milestones/ZULU-BUILDLOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._