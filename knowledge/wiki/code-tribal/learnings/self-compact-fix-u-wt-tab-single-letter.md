# SELF-COMPACT-FIX/U-WT-TAB-SINGLE-LETTER — [MAIN-FORCE] [SELF-COMPACT-FIX]/U-WT-TAB-SINGLE-LETTER (slot:alpha): match single first-letter WT tab titles -> unblock fleet self-compact + self-startup

**Commit:** `cb690f9bda17` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T10:34:14-05:00
**Tags:** self-compact-fix, u-wt-tab-single-letter, auto-distilled

## Subject
[MAIN-FORCE] [SELF-COMPACT-FIX]/U-WT-TAB-SINGLE-LETTER (slot:alpha): match single first-letter WT tab titles -> unblock fleet self-compact + self-startup

## Body
```
[MAIN-FORCE] [SELF-COMPACT-FIX]/U-WT-TAB-SINGLE-LETTER (slot:alpha): match single first-letter WT tab titles -> unblock fleet self-compact + self-startup

ROOT CAUSE (live-verified): the fleet's WT tabs are named by the slot's SINGLE FIRST LETTER (a,b,...,z) -- operators pin 1-char tab titles so all 26 NATO tabs fit the bar, and a manual WT rename overrides the app-set 'PRISM <slot>' title. focusWtTabBySlot matched only <slot>, PRISM <slot>, and <slot> | <tag>, so it returned no-tab -> self-compact + self-startup never actuated (fallback every time).

FIX: add a 4th ANCHORED match tier -- the slot's single first letter (nl === slotInit / $nl -eq $slotInit). NATO first letters are unique (alpha->a ... zulu->z), so a<->alpha is unambiguous; the ambiguous-tab refusal backstops any collision. Added to BOTH the live PowerShell FOCUS_PS match AND a new pure exported JS mirror tabNameMatchesSlot (hermetically testable). Purely additive OR-clause; pre-existing tiers preserved.

PROOF (live, this box): focusWtTabBySlot('alpha') -> {ok:true, tabName:'a', hwnd:657790, paneCount:1} (was no-tab); self-compact --dry-run -> action:dry-run wouldSend /compact to tab 'a'; self-startup -> resolves slot alpha (stall-gate correctly skips while working). Tests 36/36 (+8 tabNameMatchesSlot incl adversarial zebra|alpha->false). Scrutiny 3-of-3 PASS (reviewer A + reviewer B + code-analyzer C), 0 findings.
```

## Files touched (3)
- scripts/lib/wt-tab-focus.mjs      | 80 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--------
- scripts/lib/wt-tab-focus.test.mjs | 68 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 140 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cb690f9bda17`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACT-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._