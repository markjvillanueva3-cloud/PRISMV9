# SIERRA-BACKEND/U-BUILD-STATE-DORMANT-BRIDGE — [MAIN-FORCE] [SIERRA-BACKEND]/U-BUILD-STATE-DORMANT-BRIDGE (slot:sierra): surface DORMANT-BRIDGE in the BUILD_STATE backend-completion signal

**Commit:** `630ad435e616` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T12:31:48-05:00
**Tags:** sierra-backend, u-build-state-dormant-bridge, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-BUILD-STATE-DORMANT-BRIDGE (slot:sierra): surface DORMANT-BRIDGE in the BUILD_STATE backend-completion signal

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-BUILD-STATE-DORMANT-BRIDGE (slot:sierra): surface DORMANT-BRIDGE in the BUILD_STATE backend-completion signal

R15 follow-through for U-AUDIT-DORMANT-BRIDGE (7e65e4af9d): wire the new audit classification into
BUILD_STATE -- the auto-injected (SessionStart) backend-completion signal. Verified all ~20 audit
consumers handle DORMANT-BRIDGE safely first: most read `unwiredEngines` (which now excludes dormant
bridges); build-state reads specific count keys, so `built = total - UNWIRED` correctly counts a
dormant bridge as BUILT (not a wiring gap). No consumer false-flags them.

Added the distinct surface: headline.dormant_bridges + a DORMANT_BRIDGES section (engine + gateEnv +
remedy "enable the gate, NOT add a dispatcher action"). Degrades gracefully on pre-DORMANT-BRIDGE
audit files (?? 0 / ?? []).

Live: BUILD_STATE now BUILT=3799, NEEDS_WIRING=7 (cycleSchedulingBridge no longer a false wiring gap),
dormant_bridges=1 (cycleSchedulingBridge -> PRISM_REACTIVE_CHAINS_ENABLE). The operator's "is the
backend complete?" signal now distinguishes built-but-gated from fully-wired and from unwired.
```

## Files touched (2)
- scripts/build-state-snapshot.mjs | 16 +++++++++++++++-
- 1 file changed, 15 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 630ad435e616`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._