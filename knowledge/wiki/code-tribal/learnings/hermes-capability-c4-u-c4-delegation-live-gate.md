# HERMES-CAPABILITY-C4/U-C4-DELEGATION-LIVE-GATE — [MAIN-FORCE] [HERMES-CAPABILITY-C4]/U-C4-DELEGATION-LIVE-GATE (slot:bravo): wire the delegation pre-gate into governedNextWave -- strictly-narrowing, fail-closed, default-on no-op

**Commit:** `df1f3bdde114` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T07:54:09-05:00
**Tags:** hermes-capability-c4, u-c4-delegation-live-gate, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-CAPABILITY-C4]/U-C4-DELEGATION-LIVE-GATE (slot:bravo): wire the delegation pre-gate into governedNextWave -- strictly-narrowing, fail-closed, default-on no-op

## Body
```
[MAIN-FORCE] [HERMES-CAPABILITY-C4]/U-C4-DELEGATION-LIVE-GATE (slot:bravo): wire the delegation pre-gate into governedNextWave -- strictly-narrowing, fail-closed, default-on no-op

The C4 seam (same class as the C3 "built-but-not-wired-together" lesson):
composeGatedAuthority + evaluateDelegation (both PURE, 35 tests) were dispatcher-wired
(grant/revoke/status/check) but the LIVE wave-dispatch authority loop
ZuluWaveSchedulerEngine.governedNextWave called raw ZuluFleetGovernorEngine.checkAuthority
and NEVER consulted the delegation pre-gate. This unit closes that seam.

WIRE:
- ZuluDelegationContractEngine.allContracts(): the durable contract reader for the gate
  (raw DelegationContract[]; corrupt/read-only store -> [] -> "no-contract" -> defer to
  governor, the safe narrowing fallback; never throws).
- ZuluWaveSchedulerEngine.governedNextWave(req, completedIds, souls, delegation?): new
  optional WaveDelegationGate {contracts, nowMs}. Per assignment, AFTER the governor
  verdict, compose evaluateDelegation + composeGatedAuthority. STRICTLY-NARROWING: a
  matching expired/revoked contract FAILS CLOSED -> veto; no matching contract -> governor
  verdict unchanged; a governor-veto is NEVER widened. ABSENT/empty gate = byte-identical
  legacy behavior. Acyclic (WaveScheduler -> {FleetGovernor, DelegationContract};
  DelegationContract -> FleetGovernor; no back-edge).
- sessionDispatcher governed_wave_execute + wave_loop_step inject the live contract set
  (default-ON; apply_delegation:false opts out). No live contract -> no behavior change.

TEST (10 engine invariants + 6 dispatcher round-trips):
- denied-expired -> veto; denied-revoked -> veto; within-contract -> governor intact;
  no-contract (slot mismatch / galaxy mismatch) -> no-op; wildcard galaxy; CANNOT-WIDEN
  (governor-veto stays vetoed under an active contract); absent==empty==back-compat;
  per-assignment isolation (one slot denied, the other passes); token-cap not enforced at
  the assign-gate (no tokens_pending). Dispatcher e2e GRANTS through the real
  delegation_grant action into a temp store + reads the consequence: expired narrows a real
  wave, revoked denies fail-closed, active defers, empty is a no-op, apply_delegation:false
  opts out, cross-galaxy never matches.

VALIDATE: tsc clean; 83/83 (wave+e2e) + 49/49 (delegation+governor regression) green.

Closes C4. Next: C5 Adaptive Back-Pressure (consumes the C3 auctionQueueDepths signal).
```

## Files touched (6)
- mcp-server/src/__tests__/ZuluWaveSchedulerEngine.test.ts              | 137 +++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/sessionDispatcher.delegationGate.e2e.test.ts | 163 ++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ZuluDelegationContractEngine.ts                |  16 +++++
- mcp-server/src/engines/ZuluWaveSchedulerEngine.ts                     |  58 +++++++++++++--
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts                 |  18 +++--
- 5 files changed, 383 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- lesson):

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show df1f3bdde114`
- Milestone envelope: `mcp-server/data/milestones/HERMES-CAPABILITY-C4.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._