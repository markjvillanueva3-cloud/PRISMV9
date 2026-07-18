# TEST-HERMETICITY/U-PSN-CHECKLIST-TEST-ENABLED — [MAIN-FORCE] [TEST-HERMETICITY]/U-PSN-CHECKLIST-TEST-ENABLED (slot:alpha): pin {enabled:true} on 4 psn-prompt-checklist fire-path tests (12/16 -> 16/16)

**Commit:** `4307ece06719` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T19:09:29-05:00
**Tags:** test-hermeticity, u-psn-checklist-test-enabled, auto-distilled

## Subject
[MAIN-FORCE] [TEST-HERMETICITY]/U-PSN-CHECKLIST-TEST-ENABLED (slot:alpha): pin {enabled:true} on 4 psn-prompt-checklist fire-path tests (12/16 -> 16/16)

## Body
```
[MAIN-FORCE] [TEST-HERMETICITY]/U-PSN-CHECKLIST-TEST-ENABLED (slot:alpha): pin {enabled:true} on 4 psn-prompt-checklist fire-path tests (12/16 -> 16/16)

ROOT CAUSE: shouldInject defaults its enabled flag to the module-level ENABLED const, which is captured from PRISM_PSN_CHECKLIST_INJECT_DISABLE at IMPORT time. This fleet sets that kill-switch (=1), so ENABLED=false and the 4 true-expecting fire-path tests (FIRES-on-prompt / HONORS-custom-minLen / FIRES-on-slash-args / BOUNDARY-exact-minLen) returned false -> failed. The shouldInject LOGIC is correct (proven live: {enabled:true} -> true). FIX (R9, not a weakening): pin {enabled:true} on the fire-path assertions so they test the gating heuristic hermetically, independent of the deploy-time knob. The ambient-disable path stays covered by the explicit {enabled:false} test. LESSON: a hook whose ENABLED is env-captured at import needs opts.enabled-pinned fire-path tests, else they are env-dependent. Pre-existing failure, unrelated to the prior pruneTag commit d3e0b7ebaf.
```

## Files touched (2)
- .claude/hooks/psn-prompt-checklist-inject.test.mjs | 17 +++++++++++------
- 1 file changed, 11 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- LESSON: a hook whose ENABLED is env-captured at import needs opts.enabled-pinned fire-path tests, else they are env-dependent. Pre-existing failure, unrelated to the prior pruneTag commit d3e0b7ebaf.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4307ece06719`
- Milestone envelope: `mcp-server/data/milestones/TEST-HERMETICITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._