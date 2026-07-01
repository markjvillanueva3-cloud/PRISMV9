# HOTEL-NETPLAT-UI/U-DESTUB-AILEARNING — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-NETPLAT-UI]/U-DESTUB-AILEARNING (slot:hotel): AI Learning dashboard machine list -> real JM fleet

**Commit:** `d3ce9e5a9eb4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T09:14:51-05:00
**Tags:** hotel-netplat-ui, u-destub-ailearning, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-NETPLAT-UI]/U-DESTUB-AILEARNING (slot:hotel): AI Learning dashboard machine list -> real JM fleet

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-NETPLAT-UI]/U-DESTUB-AILEARNING (slot:hotel): AI Learning dashboard machine list -> real JM fleet

DEMO_MACHINES no longer lists generic competitor machines (DMG DMU 50, Mazak INTEGREX, Okuma
MU-5000, Fanuc Robodrill). It now lists JM's real machines (Hurco VM30i, Okuma M460V-5AX, Haas
VF-2, Okuma GENOS L300-M, Roku-Roku HC 658-II, Mitsubishi FA10S) covering all five JM controller
families (hurco/okuma/haas/fanuc/mitsubishi). ids match JM_DIE_CONTROLLER_MAP machine_id so the
per-machine RL learning state keys to the backend's machine_id; unknown machines return an empty
learning state (total_experiences:0) handled gracefully by the existing UI.

Verified: pure-string swap in typed MachineEntry[] (LSP no new type error); no test asserts this
page's DEMO_MACHINES (LearningDashboard.test targets a different component).
```

## Files touched (2)
- mcp-server/web/src/pages/AILearningDashboardPage.tsx | 16 ++++++++++------
- 1 file changed, 10 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d3ce9e5a9eb4`
- Milestone envelope: `mcp-server/data/milestones/HOTEL-NETPLAT-UI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._