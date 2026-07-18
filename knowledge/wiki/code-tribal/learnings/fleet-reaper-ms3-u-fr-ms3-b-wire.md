# FLEET-REAPER-MS3/U-FR-MS3-B-WIRE — [MAIN] [FLEET-REAPER-MS3]/U-FR-MS3-B-WIRE: Tier-1.5 bg-throttle in runSweep

**Commit:** `9baacb056e71` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T22:09:58-05:00
**Tags:** fleet-reaper-ms3, u-fr-ms3-b-wire, auto-distilled

## Subject
[MAIN] [FLEET-REAPER-MS3]/U-FR-MS3-B-WIRE: Tier-1.5 bg-throttle in runSweep

## Body
```
[MAIN] [FLEET-REAPER-MS3]/U-FR-MS3-B-WIRE: Tier-1.5 bg-throttle in runSweep

Wires the U-FR-MS3-B pure helper (scripts/lib/bg-app-throttle.mjs, shipped
in 8486d89344) into fleet-reaper-sweep.mjs runSweep() between Tier-1
soft-relief and Tier-2 serviceRestart. ~70 LOC integration with full
read/decide/throttle-or-restore cycle.

Flow:
1. Read prior stamp (state/shared/.fleet-reaper-bg-throttle.json)
2. decideAction({usedPct, memPressurePct, priorStampPids, env})
3. If "throttle" + actionsAllowed + new candidates found:
   pickThrottleCandidates → setPriorityForPids("BelowNormal") → buildStamp +
   writeFileSync (best-effort, atomic-ish via mkdirSync+writeFileSync)
4. If "restore" (hysteresis-drop crossed, prior pids exist):
   setPriorityForPids(priorPids, "Normal") → unlinkSync stamp

Honored gates (inherited from existing reaper flow):
- isStatus / noRelief: skip entirely (read-only / opt-out)
- actionsAllowed: required for state mutation; dryRun classifies without acting
- All decisions delegate to helper (pure decideAction); env-knob checks live
  inside the helper for centralized policy

bgThrottle field added to runSweep return for telemetry. defaults to
{action:"noop", reason:"skipped-mode", ...} when isStatus/noRelief, so the
pre-MS3 caller shape is preserved (LEGACY PARITY — existing callers that
ignored the field still ignore it; the field is purely additive).

Files:
- scripts/fleet-reaper-sweep.mjs (+import block, +Tier-1.5 block ~65 LOC,
  +bgThrottle in result return)

Tests: 116/116 PASS across 6 reaper test suites (bg-throttle + self-bg-io +
tier + ballast + hunt + service-restart). The bg-throttle suite's 20 cases
already cover the pure decision; no new test cases needed for the wire (the
helper is hermetic-tested; the wire is a 1-call delegation).

Spec: state/shared/specs/FLEET-REAPER-MS3-CHAT-CAPACITY-DESIGN.md §U-FR-MS3-B
```

## Files touched (2)
- scripts/fleet-reaper-sweep.mjs | 82 ++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 82 insertions(+)

## Lessons surfaced in commit body
- till ignore it; the field is purely additive).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9baacb056e71`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-MS3.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._