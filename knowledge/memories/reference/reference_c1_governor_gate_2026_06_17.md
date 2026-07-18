---
name: reference_c1_governor_gate_2026_06_17
description: "C1 (Hermes Dependency-Ordered Multi-Wave DAG Scheduler) COMPLETED this session. C1's last unmet spec requirement was 'ZuluFleetGovernorEngine authority check runs before every fan-out wave' -- the wave path (computeWaveN/nextWaveAssignments + schedule_wave/next_wave_execute dispatcher actions) was a PURE scheduler emitting assignments with ZERO governance. FIX: ZuluWaveSchedulerEngine.governedNextWave(req, completedIds, souls) runs checkAuthority per ready assignment; unauthorized ones move to a `vetoed` audit list (never dispatched). Wired sessionDispatcher action governed_wave_execute (caller supplies parsed souls; dispatcher stays pure). Commit U-C1-GOVERNOR-GATE (84e3c34f62, slot:bravo). 54/54 tests; 3-of-3 PASS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.490Z
aliases: reference_c1_governor_gate_2026_06_17
---


# C1 governor gate -- the last C1 requirement (2026-06-17, slot:bravo)

## What C1 is + its state
C1 = the Hermes/Zulu Dependency-Ordered Multi-Wave DAG Scheduler (HERMES-CAPABILITY-EXPANSION C1,
spec `state/shared/specs/HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md`). Its spec has two
requirements: (1) "emit AND execute wave_2+ after wave_1 completes" and (2) "ZuluFleetGovernorEngine
authority check runs before every fan-out wave". Requirement (1) shipped this session
(`ZuluWaveSchedulerEngine` with `computeWaveN`/`allWaves`/`nextWaveAssignments` + dispatcher actions
`schedule_wave`/`compute_wave_n`/`next_wave_execute`/`wave_exec_render`). Requirement (2) was the
last gap -- the wave path was a PURE scheduler with NO governance: it emitted slot assignments a
runtime would spawn with zero authority check.

## The gap + fix (U-C1-GOVERNOR-GATE, 84e3c34f62)
`ZuluWaveSchedulerEngine.governedNextWave(req, completedIds, souls)`: wraps `nextWaveAssignments`
and runs `ZuluFleetGovernorEngine.checkAuthority({slot, task_text: subtask.description,
operation:"assign"}, soul)` per ready assignment. An assignment whose slot is NOT authorized
(refuse-rule hit / out-of-domain / no resolvable soul) is moved from `wave_assignments` to a
`vetoed` audit list (subtask_id+slot+reason), so a runtime spawning the batch never dispatches an
unauthorized agent. Pure: souls INJECTED as a `slot -> SlotSoul` map (engine stays I/O-free).
FAIL-CLOSED: absent soul / non-Map souls -> vetoed (never fabricate authority). overflow/unrouted/
blocked/done pass through (governance gates only the would-dispatch-now batch). Throws on a
malformed plan BEFORE the gate (same contract as nextWaveAssignments). Dispatcher action
`governed_wave_execute` (caller supplies parsed souls as a Record -> Map, same pure
caller-provides-soul contract as `check_authority`/`zulu_authority_check`). No circular import
(ZuluFleetGovernorEngine imports only zod + the SlotSoul type).

## Validation
54/54 ZuluWaveSchedulerEngine tests (10 new: all-authorized, refuse-veto, out-of-domain, no-soul
fail-closed, orchestrator-rule-4, mixed-verdict split, overflow passthrough, non-Map adversarial,
malformed-throws, terminal-done). Clean tsc on the changed files (93 baseline errors all
pre-existing elsewhere). 3-of-3 scrutiny PASS (arm B mutation-verified the veto paths; arm C traced
the import graph acyclic + the Map<string,never>->ReadonlyMap type-flow clean).

## Notes
- The `PRISM Zulu Build Loop` cron pointer (`state/shared/zulu-build-loop-next.json`) still listed
  C1 as pending/shipped:0 -- it is STALE (single-writer, cron-maintained, cron Disabled); it does not
  reflect the in-flight C-unit engine work (C1/C2-continuity/C3-health/C4-delegation engines all
  already exist on disk). Reconcile via the queue mechanism, not a manual edit.
- C2..C8 remain (Cross-Session Continuity, Fleet Health Synthesis, Delegation Contract, Adaptive
  Back-Pressure, Live Capability Registry, Capability Attestation, Soul Evolution Advisor) -- several
  have engines already (ZuluTaskContinuityEngine, ZuluFleetHealthSynthesisEngine,
  ZuluDelegationContractEngine) so they are partial, not greenfield.

Related: [[reference_c1_already_built_runtime_driver_gap]], [[reference_c1_executable_wave_bridge]].
