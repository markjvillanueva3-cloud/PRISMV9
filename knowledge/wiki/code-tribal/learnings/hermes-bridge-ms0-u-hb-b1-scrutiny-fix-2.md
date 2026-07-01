# HERMES-BRIDGE-MS0/U-HB-B1-SCRUTINY-FIX-2 — [MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HB-B1-SCRUTINY-FIX-2 (slot:zulu): close the 2 NEW P1s the re-scrutiny arm-B found (TOCTOU race + fail-open-on-corrupt)

**Commit:** `c5bca80f4d2d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T14:36:07-05:00
**Tags:** hermes-bridge-ms0, u-hb-b1-scrutiny-fix-2, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HB-B1-SCRUTINY-FIX-2 (slot:zulu): close the 2 NEW P1s the re-scrutiny arm-B found (TOCTOU race + fail-open-on-corrupt)

## Body
```
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HB-B1-SCRUTINY-FIX-2 (slot:zulu): close the 2 NEW P1s the re-scrutiny arm-B found (TOCTOU race + fail-open-on-corrupt)

The re-scrutiny of the hardened launcher was 2 PASS (arms A,C) / 1 FAIL (arm B).
Arms A+C judged it safe (the hard per-call clamp of 6 is un-bypassable, every guard
degrades toward the clamp). Arm B (correctly stricter for a money-spending boundary)
found 2 NEW edge P1s in the cumulative guard, now fixed:

- P1 TOCTOU: in-flight markers were written one-per-iteration AFTER each Start-Process
  (a multi-second window in which a concurrent call double-launched the same slot).
  FIX: CLAIM all planned slots up-front -- write every marker BEFORE the spawn loop --
  so a concurrent occupancy snapshot already sees them (window shrunk to the marker
  write). The realistic caller is the single zulu skill; this closes the within-loop
  window it could hit on a fast re-call.
- P1 fail-OPEN on corrupt chat-slots.json: a PRESENT-but-unparseable file silently let
  the launcher spawn everything (this repo's recurring "fail-open read" class). FIX:
  Get-OccupiedSlots now distinguishes corrupt (present+unparseable) from absent
  (legit fresh state); a corrupt file FAIL-CLOSES the live spawn (refuse), absent does
  not block.
- Also: InvariantCulture + RoundtripKind heartbeat parse (was $null/AdjustToUniversal,
  culture-sensitive); skip the .launcher.lock from the marker scan; env-overridable
  $ChatSlotsPath/$InFlightDir for hermetic testing.

TESTED (spawns nothing): N1 -Live+corrupt -> refused fail-closed; N2 -Live+all-alive ->
"nothing to launch" skipped[alive,alive] (occupancy/heartbeat read proven via temp
file); R1 clamp 999->6 refuse + R2 dry-run unchanged (no regression).

Gate status: round-2 arms A+C PASS; arm-B's 2 P1s now fixed + behavior-proven.
Lesson (again): I overclaimed "cannot double-launch"; the independent arm proved the
cumulative guard was best-effort TOCTOU + fail-open. A safety boundary's cumulative
bound must be claim-before-act + fail-closed-on-unknown, not read-then-act.
```

## Files touched (2)
- scripts/fleet/launch-fleet-bounded.ps1 | 45 +++++++++++++++++++++++++++++++++------------
- 1 file changed, 33 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- Lesson (again): I overclaimed "cannot double-launch"; the independent arm proved the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c5bca80f4d2d`
- Milestone envelope: `mcp-server/data/milestones/HERMES-BRIDGE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._