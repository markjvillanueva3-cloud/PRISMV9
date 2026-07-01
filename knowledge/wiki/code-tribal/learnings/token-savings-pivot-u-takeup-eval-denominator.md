# TOKEN-SAVINGS-PIVOT/U-TAKEUP-EVAL-DENOMINATOR — [MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-TAKEUP-EVAL-DENOMINATOR (slot:alpha): honest take-rate -- evaluations denominator splits genuine-low from wiring-broken

**Commit:** `5752cc01af64` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T07:53:20-05:00
**Tags:** token-savings-pivot, u-takeup-eval-denominator, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-TAKEUP-EVAL-DENOMINATOR (slot:alpha): honest take-rate -- evaluations denominator splits genuine-low from wiring-broken

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-TAKEUP-EVAL-DENOMINATOR (slot:alpha): honest take-rate -- evaluations denominator splits genuine-low from wiring-broken

The take-rate audit reported healthSignal "takeup-wiring-broken" for EVERY 0-take dataset. A live probe proved classifiersTakenBy credits correctly when an eligible route fires in-window -- so 0 takes is GENUINE, not a wiring bug (R12 fabricated signal that sent chats chasing a non-existent verify-wiring fix). Add takeupTotals.evaluations: mcp-route-takeup.mjs bumps it whenever it evaluates a CREDITABLE route (eligibleClassifiersFor non-null -- unmapped prism_*:* actions gated out), even at 0 credit. summarize() emits genuine-low-take-rate (path proven live, fleet genuinely not routing) vs legacy takeup-wiring-broken (never exercised, evaluations 0). Live validation: dashboard flipped takeup-wiring-broken -> genuine-low-take-rate (totalFires 672, evaluations>0). 40 takeup + 19 audit tests (happy + 0-credit + accumulate + disabled + missing-sidecar + adversarial wrong-session + gate); classify() untouched (route-suggest-decay consumer unaffected); per-file 2-arm scrutiny PASS, 2 P2 fixed inline.
```

## Files touched (5)
- .claude/hooks/__tests__/mcp-route-takeup.test.mjs | 86 ++++++++++++++++++++++++++++++++++++++++++++-
- .claude/hooks/mcp-route-takeup.mjs                | 85 +++++++++++++++++++++++++++++++-------------
- scripts/audit-mcp-route-takerate.mjs              | 25 +++++++++++--
- scripts/audit-mcp-route-takerate.test.mjs         | 51 +++++++++++++++++++++++++++
- 4 files changed, 220 insertions(+), 27 deletions(-)

## Lessons surfaced in commit body
- wrong-session + gate); classify() untouched (route-suggest-decay consumer unaffected); per-file 2-arm scrutiny PASS, 2 P2 fixed inline.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5752cc01af64`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._