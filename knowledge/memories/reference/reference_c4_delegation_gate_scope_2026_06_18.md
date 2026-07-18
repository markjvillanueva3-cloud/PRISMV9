---
name: reference_c4_delegation_gate_scope_2026_06_18
description: "C4 (Hermes Delegation Contract) SCOPE + ready design (slot:bravo, 2026-06-18). C4's engine (ZuluDelegationContractEngine, 615 lines) + dispatcher actions (grant/revoke/status/compose) + 2 test files (35 tests) are ALREADY shipped -- NOT an orphan. But like C3 it has a 'built-but-not-wired-together' seam: the LIVE wave-dispatch authority path (ZuluWaveSchedulerEngine.governedNextWave -> ZuluFleetGovernorEngine.checkAuthority) BYPASSES the delegation pre-gate. composeGatedAuthority + evaluateDelegation (both PURE, tested) exist + are dispatcher-wired but NOTHING in the live flow consults them. The remaining unit U-C4-DELEGATION-LIVE-GATE = wire the delegation pre-gate into governedNextWave (strictly-narrowing, fail-closed). NOT YET BUILT -- design captured below for a fresh focused pass (deferred from the C1-C3 arc as the most intricate + safety-critical unit)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.491Z
aliases: reference_c4_delegation_gate_scope_2026_06_18
---


# C4 delegation live-gate -- scope + ready design (2026-06-18, slot:bravo)

## The gap (verified, the C3 seam-class again)
`composeGatedAuthority` (`ZuluDelegationContractEngine.ts:310-336`, PURE, strictly-narrowing + fail-closed -- verified) and `evaluateDelegation` (`:223`, PURE -- contracts INJECTED, returns `no-contract|within-contract|denied`) both exist, are dispatcher-wired (grant/revoke/status/evaluate/compose actions), and are tested (35 tests across 2 files). BUT the LIVE wave-dispatch authority loop `ZuluWaveSchedulerEngine.governedNextWave` (`:407-435`) calls raw `ZuluFleetGovernorEngine.checkAuthority` and NEVER consults the delegation pre-gate. `ZuluFleetGovernorEngine` only MENTIONS delegation in a comment. Spec (`HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md` C4): "wire as a PRE-GATE before the governor authority check" -- unbuilt where it matters.

## Verified facts for the build (R12 -- cite these, already checked)
- `composeGatedAuthority(delegation, governor)`: `denied` -> authorized:false (gate delegation); non-deny + governor -> governor.authorized; missing governor on non-deny -> false (fail-closed). NEVER authorizes on its own -> STRICTLY NARROWING. (`:310-336`)
- `evaluateDelegation(contracts: readonly DelegationContract[], req: {grantee_slot, operation, galaxy, tokens_pending?}, nowMs)` is PURE (contracts injected, NOT a store read). Matches on `grantee_slot` + `operations.includes(operation)` + (`galaxy_scope==="*" || ===galaxy`). (`:223-250`)
- `DELEGATION_OPERATIONS` includes **"assign"** (the wave-assignment op, matching the governor's `operation:"assign"`).
- ACYCLIC confirmed: `ZuluDelegationContractEngine` does NOT import `ZuluWaveSchedulerEngine`. Both import `ZuluFleetGovernorEngine` (delegation imports `ORCHESTRATOR_ROLES` from it); governor imports neither. So `WaveScheduler -> {FleetGovernor, DelegationContract}` + `DelegationContract -> FleetGovernor` is acyclic.
- `governedNextWave` already builds `descById` + has `req.subtasks` (each has `.domain` = the galaxy for the delegation `galaxy` field).

## Ready design (cleanest -- optional injected contracts, NO new orphan)
Add an OPTIONAL param to `governedNextWave(req, completedIds, souls, delegationCtx?)` where `delegationCtx = { contracts: readonly DelegationContract[]; nowMs: number }`. In the per-assignment loop, AFTER the governor verdict: if `delegationCtx` provided, `const d = ZuluDelegationContractEngine.evaluateDelegation(contracts, {grantee_slot: a.slot, operation: "assign", galaxy: subtaskDomainById.get(a.subtask_id) ?? ""}, nowMs); const finalAuth = composeGatedAuthority(d, {authorized: verdict.authorized, reason: verdict.reason}).authorized;` and authorize/veto on `finalAuth`. **Absent delegationCtx = byte-identical current behavior (back-compat).** Import `{ ZuluDelegationContractEngine, type DelegationVerdict }` (value import of the pure statics -- no instantiation, no I/O).
WIRE (R15, same commit -- avoid a new orphan): the dispatcher `governed_wave_execute` (+ `wave_loop_step`) reads ACTIVE contracts from the store + injects `{contracts, nowMs}`. **TODO confirm a durable active-contracts reader exists** (`listActive`/`activeContracts(now)`); if not, add a small store-reading method (the engine already has `grant`/`revoke` that read the store). Default-ON is SAFE: no active contract -> `evaluateDelegation` returns `no-contract` -> `composeGatedAuthority` keeps the governor verdict -> zero behavior change; it narrows ONLY when an orchestrator-granted contract is live. Optional opt-out `apply_delegation:false`.

## Invariant tests required (the safety-critical part -- do NOT skip)
denied-delegation -> authorized assignment moves to vetoed; within-contract/no-contract -> governor verdict intact; governor-vetoed assignment is NEVER revisited (delegation can't widen); absent delegationCtx -> back-compat (existing governedNextWave tests still green); fail-closed via the compose core; dispatcher round-trip: a granted contract (orchestrator) narrows a real wave, an expired/revoked one denies.

## Why deferred (R6 -- not abandoned)
Shipped this session FIRST (all 3-of-3 PASS): C1 governor gate, C2 producer+lock+ownership-verify, C3 auction live-feed. C4 is the most intricate + safety-critical (it gates which agents DISPATCH) and surfaced an R6 scoping-spiral at deep context -- deferred to a fresh focused pass per R6 (commit solid + handoff + restart the approach, never the goal). Related: [[reference_c3_auction_live_feed_2026_06_18]] (the seam-class lesson), [[reference_c2_producer_and_lock_2026_06_18]], [[reference_c1_governor_gate_2026_06_17]]. Next after C4: C5 Adaptive Back-Pressure (depends on C3, can consume the shipped `auctionQueueDepths` live signal).
