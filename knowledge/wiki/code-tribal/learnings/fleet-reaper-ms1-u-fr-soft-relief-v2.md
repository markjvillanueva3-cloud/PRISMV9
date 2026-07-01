# FLEET-REAPER-MS1/U-FR-SOFT-RELIEF-V2 — trim alive-slot large helpers under critical pressure

**Commit:** `b41b8292324f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T18:51:55-05:00
**Tags:** fleet-reaper-ms1, u-fr-soft-relief-v2, auto-distilled

## Subject
[FLEET-REAPER-MS1]/U-FR-SOFT-RELIEF-V2: trim alive-slot large helpers under critical pressure

## Body
```
[FLEET-REAPER-MS1]/U-FR-SOFT-RELIEF-V2: trim alive-slot large helpers under critical pressure

Investigation 2026-05-17 (slot golf, /checkin-golf + chats-still-crashing
directive): every fleet-reaper sweep this entire session showed
softRelief.targets=0 despite 89-99% commit pressure. Root cause: the legacy
selectSoftReliefTargets filter ONLY matched class==="owned-by-stale", but
chat-slots.reclaim() (which /checkin-golf runs every session) immediately
converts stale slots → free → their children reclassified as "unowned"
(reap path). Result: "owned-by-stale" is essentially a transient class that
never persists long enough to be a soft-relief target. The trim lever was
effectively DEAD for the entire fleet-reaper-MS1 era.

V2 fix: under criticalPressure tier (>=DEFAULT_MEM_CRITICAL_PCT, now 88%
post-OPT-2), ALSO include "owned-by-alive" helpers whose individual RSS
exceeds aliveRssThresholdBytes (default 100MB). Working-set trim is
REVERSIBLE — actively-working procs page back in within ms; idle ones return
RAM to the OS pool. So trimming a 200MB idle node hook or bash subproc of a
live chat is safe even though the slot itself is alive.

Safety properties preserved:
  - reap-path candidates STILL never trimmed (isCandidate exclusion intact)
  - age floor STILL applies to V2 targets (no just-spawned helpers trimmed)
  - V2 is criticalPressure-ONLY (not warn tier) — preserves the "never touch
    live work unless it's the actual emergency" invariant
  - V2 OFF by default if aliveRssThresholdBytes is null/0/negative/NaN
    (back-compat — pre-V2 callers see identical behavior)
  - criticalPressure check is === true (string "true" rejected — defensive)
  - empty/null snap returns empty targets (defensive)

Surfaces in softRelief output: new v2Engaged + v2TargetCount fields.
Knob: PRISM_FLEET_REAPER_SOFT_RELIEF_ALIVE_RSS_MB (default 100, 0=disable).

Tests: 21/21 PASS via node:test (scripts/__tests__/fleet-reaper-soft-relief-v2.test.mjs).
Coverage: legacy back-compat (3 cases) + V2 happy path (3) + boundary
(at-threshold, below-threshold, age-floor, just-past-floor) + reap-path
defense + 7 adversarial inputs (NaN/Infinity/undefined RSS, string
criticalPressure, negative/zero threshold, empty/null snap) + mixed/variability
(5 procs across 3 slots).

Live verification: function loaded clean (Object.keys check), output shape
correct (softRelief now carries v2Engaged + v2TargetCount fields). Real-time
engagement awaits a critical-tier sweep where mem.usedPct probe also succeeds
(the host's Win32 mem read intermittently fails at high pressure — pre-existing
class, unaffected by V2). The 21 hermetic tests are the regression oracle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../__tests__/fleet-reaper-soft-relief-v2.test.mjs | 298 +++++++++++++++++++++
- scripts/fleet-reaper-sweep.mjs                     |  86 +++++-
- 2 files changed, 374 insertions(+), 10 deletions(-)

## Lessons surfaced in commit body
- till-crashing
- TILL never trimmed (isCandidate exclusion intact)
- TILL applies to V2 targets (no just-spawned helpers trimmed)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b41b8292324f`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._