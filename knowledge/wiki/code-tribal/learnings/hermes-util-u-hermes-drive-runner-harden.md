# HERMES-UTIL/U-HERMES-DRIVE-RUNNER-HARDEN — [MAIN-FORCE] [HERMES-UTIL]/U-HERMES-DRIVE-RUNNER-HARDEN (slot:zulu): close 3 P2s from 3-of-3 scrutiny (live-path timeout + connect fail-loud + timer cleanup)

**Commit:** `eff7c092b720` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T11:35:12-05:00
**Tags:** hermes-util, u-hermes-drive-runner-harden, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-DRIVE-RUNNER-HARDEN (slot:zulu): close 3 P2s from 3-of-3 scrutiny (live-path timeout + connect fail-loud + timer cleanup)

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-DRIVE-RUNNER-HARDEN (slot:zulu): close 3 P2s from 3-of-3 scrutiny (live-path timeout + connect fail-loud + timer cleanup)

3-of-3 scrutiny on the runner PASSED (A+B+C, no P0/P1) but arm C surfaced three
P2 robustness gaps on the LIVE autonomous-execution path. Per "keep hardening" +
R16 (loop until gaps closed), fixed all three rather than deferring:

1. LIVE OLLAMA PATH HAD NO PER-SUBTASK TIMEOUT (the worst): the dispatcher passed
   perSubtaskTimeoutMs=undefined -> 0 -> no timeout, so the runner's "never hangs"
   guarantee was FALSE on the real path -- a hung Ollama daemon would block a wave's
   Promise.all forever (waveCap only guards BETWEEN waves, not within). Fix: default
   180s per subtask in the dispatcher case (callers may override, incl 0 to disable).

2. CONNECT FAILURE SILENTLY SWALLOWED (R12): the case did `await connect()` and
   discarded the result -- a down daemon then burned the whole retry budget on
   "not connected" generate failures, reporting status:failed with no clear cause.
   Fix: check conn.ok; on failure return a fail-loud {ran:false, reason:
   "ollama-connect-failed: <err>"} envelope BEFORE any execution.

3. TIMEOUT TIMER LEAK: the per-subtask setTimeout was never cleared/unref'd, so an
   orphaned timer pinned the event loop for up to timeoutMs after the executor won
   the race (deferred shutdown in a short-lived runner/cron). Fix: capture the handle,
   clearTimeout in finally, unref it so it can never pin the loop.

TEST: +1 e2e (gate ON + connect fails -> fail-loud envelope, generate never called).
15/15 (10 runner unit + 5 e2e). tsc clean. The other arm-C P2 (trace.dispatched
cosmetic) is currently-impossible and left as an auditability note.
```

## Files touched (4)
- mcp-server/src/__tests__/sessionDispatcher.autonomousDrive.e2e.test.ts | 17 +++++++++++++++++
- mcp-server/src/engines/HermesAutonomousDriveRunnerEngine.ts            | 11 ++++++++---
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts                  | 14 ++++++++++++--
- 3 files changed, 37 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- TIL]/U-HERMES-DRIVE-RUNNER-HARDEN (slot:zulu): close 3 P2s from 3-of-3 scrutiny (live-path timeout + connect fail-loud + timer cleanup)
- til gaps closed), fixed all three rather than deferring:

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show eff7c092b720`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._