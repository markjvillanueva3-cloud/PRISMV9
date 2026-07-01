# FLEET-LAUNCHER/U-OPEN-TODAYS-SESSIONS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER]/U-OPEN-TODAYS-SESSIONS (slot:tango): raise resume size-cap 40->256MB so fleet tabs open today's sessions

**Commit:** `750d7cb4a88c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T16:50:46-05:00
**Tags:** fleet-launcher, u-open-todays-sessions, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER]/U-OPEN-TODAYS-SESSIONS (slot:tango): raise resume size-cap 40->256MB so fleet tabs open today's sessions

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER]/U-OPEN-TODAYS-SESSIONS (slot:tango): raise resume size-cap 40->256MB so fleet tabs open today's sessions

Operator work order: make the desktop fleet launcher open each slot's most
recent session from today, from the most up-to-date pwsh tabs.

Two blockers fixed:
1. The 40MB resume size-guard (pre-upgrade 32GB box) kicked 6 of 13 slots with
   TODAY's work (alpha 158MB, sierra 96MB, india 75MB, oscar 68MB, papa 63MB,
   echo 41MB) to fresh /checkin instead of resuming today's session. Raised
   default 40->256MB in BOTH gates (regenerator RESUME_MAX_MB +
   slot-tab-boot.ps1 resumeMaxMb) per Blackwell directive (128GB RAM). Knob:
   MCP_RESUME_MAX_MB. Still falls back to fresh on a GB-scale/corrupt transcript.
2. Desktop .bat frozen 2026-06-01 with -ForceCheckin on papa/sierra/tango (all
   bound with today's sessions). Regenerated -> 12 bound slots emit bare -Slot
   (boot Tier-1 resolves today's session by chatId at launch).

Deployed (outside repo): desktop .bat regenerated + slot-tab-boot.ps1 cap raised
(AST-validated). Verified all 13 active slots have today's session by chatId; pwsh 7.6.1.
```

## Files touched (2)
- scripts/regenerate-launch-fleet.mjs | 15 ++++++++++++---
- 1 file changed, 12 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till falls back to fresh on a GB-scale/corrupt transcript.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 750d7cb4a88c`
- Milestone envelope: `mcp-server/data/milestones/FLEET-LAUNCHER.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._