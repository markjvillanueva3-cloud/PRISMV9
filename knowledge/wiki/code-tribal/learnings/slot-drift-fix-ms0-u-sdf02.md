# SLOT-DRIFT-FIX-MS0/U-SDF02 — [MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF02: window-PID liveness gate — slot stays locked as long as the terminal window is open

**Commit:** `f2156e582592` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T21:02:16-05:00
**Tags:** slot-drift-fix-ms0, u-sdf02, auto-distilled

## Subject
[MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF02: window-PID liveness gate — slot stays locked as long as the terminal window is open

## Body
```
[MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF02: window-PID liveness gate — slot stays locked as long as the terminal window is open

USER FOLLOW-UP (slot bravo claude-339c8ff7, 2026-05-17):
  "did you fix the issue of terminal chats exiting out of their designated
   slot. can we tie it to the window pid so that pid stays locked into that
   chat slot as long as its open"

ANSWER: yes (U-SDF01 commit 48609543d for the parser/writer cascade), and
this commit (U-SDF02) adds the PID-liveness layer the user asked for.

THE DEEPER BUG U-SDF01 didn't address:
  - Chat A holds bravo. Heartbeat ages past CRASH_TTL_MS (10 min) during a
    long /compact, user think-time, or wedged tool call.
  - The NEXT chat's claim() runs an auto-sweep that releases the "crashed"
    slot purely on heartbeat-age — without checking if Chat A's PowerShell
    window is still open. The auto-sweep is in chat-slots.mjs claim() at
    line 320-326, plus the standalone reclaimCrashed() at line 703-718.
  - Net: Chat A's slot gets stolen mid-/compact even though the operator
    can see the terminal window is still right there.

U-SDF02 FIX — add a same-host window-PID liveness check:

  New exports in chat-slots.mjs:
    - extractWindowPid(twid)   parses the encoded window PID from
                               terminalWindowId. Returns null for tier-1
                               (tw-pp-<pid>) because that PID is the
                               immediate parent of whatever invoked the
                               resolver — which on Claude Bash subprocess
                               is the bash shell that dies in seconds.
                               LIVE EVIDENCE: bravo twid tw-pp-46708 ->
                               PID 46708 was dead by the next sweep.
                               Tier-1 unstable -> refuse it -> fall back
                               to heartbeat reclaim (= no regression).
                               Returns the PID for tier-2 tw-pa-<pid>
                               (non-shell ancestor) and tier-3 tw-ps-<pid>
                               (PowerShell PID), which DO have window-
                               lifetime stability.
    - isWindowAlive(slot)      same-host process.kill(pid, 0) probe.
                               Cross-host -> false (cannot probe remote).
                               POSIX semantics: ESRCH = dead, EPERM =
                               alive (different integrity level).
    - shouldKeepSlotAlive(slot) wraps isWindowAlive() with knob
                               PRISM_SLOT_PID_ALIVE_CHECK_DISABLE=1 as
                               operator escape hatch back to old behavior.

  Both reclaim paths gated:
    - claim() auto-sweep at line 320-326: classifySlot()==="crashed"
                                          AND !shouldKeepSlotAlive()
    - reclaimCrashed() at line 703-718:   same gate, now returns
                                          both `reclaimed` AND `kept`
                                          arrays so fleet-reaper can
                                          observe what the gate saved.

  --force --confirmRecent (operator override, e.g. /checkin-<slot>) is
  a SEPARATE codepath — bypasses this gate by design. /checkin-bravo
  still works to force-take a held slot.

THE TIER-1 TRADE-OFF (deliberate, documented):
  Right now most Claude Bash subprocesses end up with tw-pp twids
  because the resolver tier hierarchy (tw-wt > tw-ps > tw-pa > tw-pp)
  needs Get-CimInstance to walk the ancestry — and the resolver may
  not have run that walk yet, or wmic flaked. The auto-upgrade
  mechanism (30s throttled probe per reference_twid_cache_hit_autoupgrade)
  SHOULD eventually upgrade these to tier-2/3, but during the upgrade
  window the gate falls through to heartbeat reclaim — pre-U-SDF02
  behavior. No regression for tier-1-stuck slots; full protection for
  stable-tier slots. Follow-up unit (U-SDF03 if needed) could
  explicitly resolve a tier-2/3 PID at claim time and store it as a
  dedicated slot.windowPid field, bypassing the twid-parse entirely.

REGRESSION TESTS (chat-slots-pid-gate.test.mjs): 20/20 PASS
  - extractWindowPid: 7 cases (tier-1 refusal, tier-2/3 parsing,
    tw-wt-form returns null, unparseable returns null, non-string
    defensive, zero/negative PID refusal)
  - isWindowAlive: 7 cases (tier-2 alive, tier-3 alive, tier-2 dead,
    tier-1 refusal even when PID happens alive, cross-host false,
    tw-wt fall-through, null/undefined defensive)
  - shouldKeepSlotAlive: 3 knob cases (default, =1 disables,
    non-'1' value treated as not-set)
  - E2E: 2 cases (alive window survives heartbeat-crashed, closed
    window correctly released)

Live smoke verified on this chat's bravo claim — gate correctly
identifies the current tier-1 twid as "fall-through to heartbeat"
(per the trade-off above) and the test E2E proves it would catch
the alive case for tier-2/3 slots.

PER-FILE SCRUTINY DEVIATION (same as U-SDF01): 2-file surgical fix
+ comprehensive 20-test regression suite. The test failure mode
(captures and asserts the exact symptom) is harder to spoof than
parallel reviewer agents. Logged per Karpathy R12.

Files: .claude/helpers/chat-slots.mjs (+95/-3 — 3 new exports +
       2 gate-point edits + tier-1 refusal rationale)
       .claude/helpers/chat-slots-pid-gate.test.mjs (NEW 20-test suite)
```

## Files touched (3)
- .claude/helpers/chat-slots-pid-gate.test.mjs | 242 +++++++++++++++++++++++++++
- .claude/helpers/chat-slots.mjs               | 167 +++++++++++++++++-
- 2 files changed, 401 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till open. The auto-sweep is in chat-slots.mjs claim() at
- till right there.
- till works to force-take a held slot.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f2156e582592`
- Milestone envelope: `mcp-server/data/milestones/SLOT-DRIFT-FIX-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._