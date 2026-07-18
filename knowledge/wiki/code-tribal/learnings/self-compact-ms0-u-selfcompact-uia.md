# SELF-COMPACT-MS0/U-SELFCOMPACT-UIA — [MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-UIA (slot:alpha): wire zulu's proven UIA tab-focus resolver into self-compact (actuates on WT tabs) + R12-correct the false zulu mechanism claim

**Commit:** `fede01d2b242` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T00:37:40-05:00
**Tags:** self-compact-ms0, u-selfcompact-uia, auto-distilled

## Subject
[MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-UIA (slot:alpha): wire zulu's proven UIA tab-focus resolver into self-compact (actuates on WT tabs) + R12-correct the false zulu mechanism claim

## Body
```
[MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-UIA (slot:alpha): wire zulu's proven UIA tab-focus resolver into self-compact (actuates on WT tabs) + R12-correct the false zulu mechanism claim

R8 follow-up to U-SELFCOMPACT: the prior commit resolved the send window ONLY from the stable owning-window pid (tw-ps/tw-pa), so it fell back on every Windows-Terminal tab. But the proven zulu-orchestrator-sweep (scripts/zulu-orchestrator-sweep.mjs:435-455) already resolves WT tabs via a tiered resolver. self-compact now REUSES it: Tier-1 focusWtTabBySlot(slot) (UIA, focuses this chat's WT tab by slot name, single-pane-verified -- works on tw-wt), Tier-2 matchWindowsByTitle("PRISM <slot>") for legacy separate windows, Tier-3 the stable owning-window pid; NEVER the transient slot.pid. A WT-present-but-not-uniquely-targetable tab (ambiguous/multi-pane/no-tab) is REFUSED (never guesses another chat's tab) -- the safety invariant, regression-pinned.

R12 CORRECTION: the U-SELFCOMPACT regression entry claimed zulu "resolves its hwnd from the same dead entry.pid -> silent no-op" citing zulu-orchestrator-lib.mjs:71 -- FALSE (3-of-3 arm A caught it; asserted without reading the live send site). entry.pid in zulu-orchestrator-lib is opt-in GATING, not hwnd resolution. CLAUDE.md regression entry + reference memory + /self-compact skill all corrected to the verified UIA mechanism.

LIVE on this session: the UIA tier RAN and returned no-tab (this chat's WT tab is not named "PRISM alpha") -> correct safe fallback; actuation requires the "PRISM <slot>" tab-naming convention zulu also depends on (fleet-launcher gap, not a code bug). 24/24 tests (tiered resolver branches + injected-spawner round-trip + ambiguous/multi-pane safety). Lesson: READ the live send site before claiming a resolution mechanism.
```

## Files touched (4)
- CLAUDE.md                     |   3 ++-
- scripts/self-compact.mjs      | 114 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----------------------------------
- scripts/self-compact.test.mjs |  69 ++++++++++++++++++++++++++++++++++++++++++++++++++++-----------------
- 3 files changed, 133 insertions(+), 53 deletions(-)

## Lessons surfaced in commit body
- Lesson: READ the live send site before claiming a resolution mechanism.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fede01d2b242`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._