# TOKEN-SAVINGS-PIVOT/U-PSN-BANNER-FAIL-LOUD — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-BANNER-FAIL-LOUD (slot:alpha iter2): R12 fix — SessionStart route-savings banner stops lying

**Commit:** `b2e995f3b116` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T13:21:12-05:00
**Tags:** token-savings-pivot, u-psn-banner-fail-loud, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-BANNER-FAIL-LOUD (slot:alpha iter2): R12 fix — SessionStart route-savings banner stops lying

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-BANNER-FAIL-LOUD (slot:alpha iter2): R12 fix — SessionStart route-savings banner stops lying

Pre-fix bug: when totalTakeups === 0 the rate fell back to a 0.30
"doctrine" placeholder, and est-saved was computed as fires × 0.30 ×
8000 — turning a 0/41 measured take-rate into a banner that claimed
"Take-rate: 30% doctrine · Est. saved: ~98K tokens" at EVERY session
start of EVERY chat. Pure R12 (fail-loud) violation: every operator
boot saw fabricated savings numbers backed by zero takeups.

Fix:
  • Savings = ACTUAL totalTakeups × TOKENS_PER_TAKEUP (8K). 0 takeups
    → "~0K tokens", no projection from doctrine.
  • Rate label has three honest states:
      - warming up (N/M)     for fires < 5 (avoid 0/0 alarm)
      - N/M (P%) — below 30% for fires ≥ 5, below-target (gap surfaced)
      - P% measured ✓        for fires ≥ 5, at/above the 30% target
  • Extracted to pure formatBanner(stats) for testability — main()
    now just IO-wraps it.
  • All magic numbers (0.30, 8000, 5) are named constants at top.

PSN synergy across legs (closes iter1 ACTION-HINT → measurement loop):
  • Telemetry sidecar (PSN brain) → honest banner at SessionStart
  • SessionStart inject (PRISM OS hook) → every chat sees the gap
  • iter1 action-hints make hints actionable; iter2 makes the dashboard
    fail-loud about whether they're being taken. Together they close
    the measurement→behavior→measurement feedback loop.

22 tests covering:
  • happy: 35/100 (✓), 30/100 (✓ boundary), 25/100 → ~200K saved
  • warming: 0/3, 1/4 → "warming up", no premature alarm
  • below: 5/50 (10%), 0/41 (0%), 0/100 → "below 30% target" tag
  • R12 regression: 0/41 case MUST report ~0K (not the pre-fix ~98K)
  • failure modes (5): null, undefined, non-object, zero/negative fires,
    NaN fires
  • adversarial: missing takeupTotals, missing byToolName/byClassifier
  • variability spanning: warming / below / at-or-above each render
  • shape: canonical 3-line banner preserved

22/22 node:test pass.
```

## Files touched (3)
- .../route-savings-session-start-banner.test.mjs    | 192 +++++++++++++++++++++
- .../hooks/route-savings-session-start-inject.mjs   |  76 ++++++--
- 2 files changed, 251 insertions(+), 17 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b2e995f3b116`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._