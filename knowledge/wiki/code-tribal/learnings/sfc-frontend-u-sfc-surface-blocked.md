# SFC-FRONTEND/U-SFC-SURFACE-BLOCKED — [MAIN-FORCE] [SFC-FRONTEND]/U-SFC-SURFACE-BLOCKED (slot:oscar): surface gate-blocked orchestrate responses in the SFC UI (was fail-silent)

**Commit:** `1d5dc8a8dd81` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T21:55:26-05:00
**Tags:** sfc-frontend, u-sfc-surface-blocked, auto-distilled

## Subject
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-SURFACE-BLOCKED (slot:oscar): surface gate-blocked orchestrate responses in the SFC UI (was fail-silent)

## Body
```
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-SURFACE-BLOCKED (slot:oscar): surface gate-blocked orchestrate responses in the SFC UI (was fail-silent)

Found via the live e2e visual pass (Playwright on an alt-port Vite against the :3100 bridge): POST /api/v1/speed-feed/orchestrate returns 200 with { result: { blocked:true, reason, blocker } } when a safety/completeness gate fires (e.g. pre-machine-completeness-gate: 'INCOMPLETE MACHINE DATA: spindle.max_rpm, spindle.power missing'). SpeedFeedPage read result?.result?.value -- undefined for that shape -- so it rendered NOTHING: no result, no error, no reason. The user clicked Calculate and got a blank panel. oscar soul: a safety/completeness block must be SURFACED, never swallowed (R12 fail-loud). FIX: detect { blocked:true } and render a prominent red, dark-canonical (role=alert) panel with the reason + gate name; gate the empty-state on !isBlocked. VERIFIED 3 ways: live Playwright (panel renders the reason, panelBg rgba(16,26,38,0.92) = .prism-dark neutralized) + unit render test 2/2 (mocked blocked response) + tsc clean. FOLLOW-UP (separate, deeper): the completeness gate blocks the default JM preset because the payload sends flat machine_max_rpm/machine_power_kw but the gate checks nested spindle.max_rpm/spindle.power -- a payload-shape mismatch to reconcile next.
```

## Files touched (3)
- mcp-server/web/src/__tests__/SpeedFeedPage-blocked-surfacing.test.tsx | 47 +++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/pages/SpeedFeedPage.tsx                            | 23 ++++++++++++++++++++-
- 2 files changed, 69 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1d5dc8a8dd81`
- Milestone envelope: `mcp-server/data/milestones/SFC-FRONTEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._