---
name: reference_c4_delegation_live_gate_2026_06_18
description: "C4 (Hermes Delegation Contract) FINISHED this session (slot:bravo, commit df1f3bdde1). U-C4-DELEGATION-LIVE-GATE wired the delegation pre-gate into the LIVE wave-dispatch authority loop ZuluWaveSchedulerEngine.governedNextWave -- the 3rd instance of the 'built-but-not-wired-together' seam (after C2 orphan + C3 auction-feed). The pure composeGatedAuthority + evaluateDelegation (35 tests) existed + were dispatcher-wired but nothing in the live flow consulted them. Now governedNextWave takes an optional WaveDelegationGate {contracts, nowMs}; both governed_wave_execute + wave_loop_step inject the durable contract set via the new ZuluDelegationContractEngine.allContracts(). Strictly-narrowing, fail-closed, default-on no-op. 3-of-3 PASS (0 blockers)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.491Z
aliases: reference_c4_delegation_live_gate_2026_06_18
---


# C4 delegation live-gate -- FINISHED (2026-06-18, slot:bravo, commit df1f3bdde1)

## What shipped
`U-C4-DELEGATION-LIVE-GATE` (df1f3bdde1) closes the C4 seam -- the LIVE wave-dispatch authority loop now consults the delegation pre-gate:
- **`ZuluDelegationContractEngine.allContracts(): DelegationContract[]`** (`:454`) -- the durable contract reader for the gate. Returns ALL persisted contracts (active+expired+revoked) raw; the pure `evaluateDelegation` re-derives liveness from injected `nowMs`, so an expired/revoked match DENIES (fail-closed) rather than vanishing. Corrupt/read-only store -> `[]` -> "no-contract" for every assignment -> defer to governor (safe narrowing fallback). Never throws.
- **`ZuluWaveSchedulerEngine.governedNextWave(req, completedIds, souls, delegation?)`** -- new optional 4th param `WaveDelegationGate {contracts, nowMs}`. Per assignment, AFTER the governor verdict, composes `evaluateDelegation` + `composeGatedAuthority`. **STRICTLY-NARROWING** (composeGatedAuthority returns `governor.authorized` on non-deny -> can never widen a governor veto), **FAIL-CLOSED** (matching expired/revoked -> `delegation-denied:` veto), **ABSENT/empty gate == byte-identical legacy**. `galaxy` = subtask `.domain`, operation = `"assign"`. ACYCLIC (WaveScheduler -> {FleetGovernor, DelegationContract}; DelegationContract -> FleetGovernor; no back-edge; no module-load I/O).
- **`sessionDispatcher` `governed_wave_execute` + `wave_loop_step`** both inject the live contract set (default-ON; `apply_delegation:false` opts out). No live contract -> zero behavior change; it narrows only when an orchestrator-granted contract is live.

## Tests (10 engine invariants + 6 dispatcher round-trips)
denied-expired -> veto; denied-revoked -> veto; within-contract -> governor intact; no-contract (slot/galaxy mismatch) -> no-op; wildcard `*` galaxy; CANNOT-WIDEN (governor-veto stays vetoed under an active contract, reason is governor's not delegation's, proven via inverted `.not.toMatch`); absent==empty==back-compat; per-assignment isolation (one slot denied, other passes); token-cap NOT enforced at the assign-gate (no tokens_pending). Dispatcher e2e GRANTS through the real `delegation_grant`/`delegation_revoke` actions into a temp `PRISM_ZULU_DELEGATION_PATH` store + reads the consequence on the SAME singleton (faithful round-trip). Expired-at-gate is simulated by granting with `now:2000`/`deadline:2001` (grant() refuses a past deadline) so the gate's real `Date.now()` sees it expired. tsc clean; 83/83 (wave+e2e) + 49/49 (delegation+governor regression).

## The seam lesson (3rd instance -- now a confirmed pattern)
**"Wired to a dispatcher" != "wired to the capability that should consume it."** C4 is the 3rd in a row: C2 was an ORPHAN (no producer), C3 + C4 were INTEGRATION SEAMS -- a fully-built, fully-dispatcher-wired pure capability that the LIVE consuming loop never called. For C4: `composeGatedAuthority`/`evaluateDelegation` had 35 tests + grant/revoke/status/check dispatcher actions, but `governedNextWave` called raw `checkAuthority` and never the delegation gate. The fix is always the same shape: find the live consumer, inject the capability strictly-narrowing/back-compat, round-trip e2e through the real store. -> [[reference_c3_auction_live_feed_2026_06_18]] [[reference_c2_producer_and_lock_2026_06_18]] [[feedback_wire_test_validate_all_galaxies]]

## P2 follow-ups (3-of-3 caught; NOT blockers, safe-direction)
- **domain<->galaxy slug canonicalization (C5 note):** the gate keys on `subtask.domain` (free-form `z.string().min(1).max(60)`, NOT a canonical-galaxy enum) as the contract `galaxy`. A typo'd domain (`"milling"` vs contract `galaxy_scope:"mill"`) yields no-contract -> silently defers to governor. Direction is SAFE (narrowing-only), but an operator could believe a contract gates a wave when the slug never matches. Canonicalize domain->galaxy if C5 introduces it.
- **`Date.now()` wall-clock** (dispatcher injects nowMs): a backwards NTP step could briefly un-expire a contract; bounded by the governor ceiling + fail-closed deadline parsing. Acceptable.

## State / next
C1+C2+C3+C4 all FINISHED this session arc (governor gate, continuity producer+lock, auction live-feed, delegation live-gate) -- all 3-of-3 PASS. **Next Hermes capability: C5 Adaptive Back-Pressure** (`ZuluAdaptiveBackPressureEngine` -- dispatcher comment "trend-aware fan-out throttle (advisory)" already present; VERIFY orphan/partial state FIRST per the seam lesson before building). C5 can consume the C3 `auctionQueueDepths` / FleetHealthVector live signal. Related: [[reference_c1_governor_gate_2026_06_17]].
