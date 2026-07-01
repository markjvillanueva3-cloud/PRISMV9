# HZP-DASH-MS0/U-HZD-QUAD-LAYOUT — [MAIN] [HZP-DASH-MS0]/U-HZD-QUAD-LAYOUT (slot:bravo): regenerate-launch-fleet.mjs + snap-wt-quadrants.ps1 — 4-window quadrant fleet layout

**Commit:** `8e089a126cd5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T00:55:44-05:00
**Tags:** hzp-dash-ms0, u-hzd-quad-layout, auto-distilled

## Subject
[MAIN] [HZP-DASH-MS0]/U-HZD-QUAD-LAYOUT (slot:bravo): regenerate-launch-fleet.mjs + snap-wt-quadrants.ps1 — 4-window quadrant fleet layout

## Body
```
[MAIN] [HZP-DASH-MS0]/U-HZD-QUAD-LAYOUT (slot:bravo): regenerate-launch-fleet.mjs + snap-wt-quadrants.ps1 — 4-window quadrant fleet layout

Operator showed a screenshot of 21 chats running as tabs across 4 wt windows
snapped to monitor quadrants. The original .bat (12 separate floating windows)
was outdated AND wrong-shape. Replaces it with a regeneratable layout.

Files (both in repo, tracked):
  scripts/regenerate-launch-fleet.mjs   reads chat-slots.json -> writes LAUNCH-PRISM-FLEET.bat
  scripts/snap-wt-quadrants.ps1         Win32 SetWindowPos snaps wt windows to corners

Layout produced:
  - 4 Windows Terminal windows titled prism-NW / prism-NE / prism-SW / prism-SE
  - Round-robin distribution of N live slots across the 4 quadrants
  - golf first (fleet-reaper guardian) -> always in NW
  - 2 dashboards (system-viz :8765, hzp-dash :8767) ride in NW as first 2 tabs
  - All chats/dashboards live as TABS within their window (one wt.exe `; nt` chain per window)
  - After spawn, snap-wt-quadrants.ps1 finds each window by title and SetWindowPos to its quadrant
  - Work-area aware (uses SystemParametersInfo SPI_GETWORKAREA so taskbar isn't covered)

First run: 20 live slots + 2 dashboards = 22 tabs across 4 quadrants.
  NW: dashboards + golf, echo, juliett, november, sierra
  NE: alpha, foxtrot, kilo, oscar, tango
  SW: bravo, hotel, lima, papa, whiskey
  SE: charlie, india, mike, romeo, xray

The .bat itself lives on Desktop (C:/Users/wompu/OneDrive/Desktop/LAUNCH-PRISM-FLEET.bat) —
NOT in repo. Re-run `node H:/prism/scripts/regenerate-launch-fleet.mjs` any time
chat-slots.json changes to pick up new/dropped slots. Override output path via --out.

PS1 snap helper bug fixes (caught on re-read before first run):
  - $h variable collision (was reusing as both height int AND window IntPtr) -> renamed to $hwnd, $totalW/$totalH
  - Find-WindowByTitle returned wrong scope ($script:found set in callback but local $found returned) -> consistent script-scope use
  - Pattern passed via $script:findPattern so the EnumWindowsProc callback sees it
```

## Files touched (3)
- scripts/regenerate-launch-fleet.mjs | 199 ++++++++++++++++++++++++++++++++++++
- scripts/snap-wt-quadrants.ps1       | 115 +++++++++++++++++++++
- 2 files changed, 314 insertions(+)

## Lessons surfaced in commit body
- wrong-shape. Replaces it with a regeneratable layout.
- wrong scope ($script:found set in callback but local $found returned) -> consistent script-scope use

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8e089a126cd5`
- Milestone envelope: `mcp-server/data/milestones/HZP-DASH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._