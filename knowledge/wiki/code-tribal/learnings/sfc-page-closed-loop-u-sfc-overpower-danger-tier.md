# SFC-PAGE-CLOSED-LOOP/U-SFC-OVERPOWER-DANGER-TIER — [MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-OVERPOWER-DANGER-TIER (slot:oscar): graduate severe over-power to 'danger' (scrutiny P2 follow-up)

**Commit:** `e865ea83a775` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T09:58:38-05:00
**Tags:** sfc-page-closed-loop, u-sfc-overpower-danger-tier, auto-distilled

## Subject
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-OVERPOWER-DANGER-TIER (slot:oscar): graduate severe over-power to 'danger' (scrutiny P2 follow-up)

## Body
```
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-OVERPOWER-DANGER-TIER (slot:oscar): graduate severe over-power to 'danger' (scrutiny P2 follow-up)

Extends U-SFC-JM-FLEET-CLOSED-LOOP. The over-power fix made >100% spindle power
grade not-'safe' (-> 'warning'). This adds the scrutiny-suggested graduated tier:
>150% of spindle power (a severe over-power no feed/depth trim recovers -- the
spindle stalls hard) now deducts 0.8, forcing score < the 0.4 'danger' threshold.
So an operator sees 'warning' for 100-150% (trim your cut) vs 'danger' for >150%
(wrong machine). Hardening, inline-constant convention matched.

Test: heavy cut (DOC 18 / WOC 12, steel) on the Haas OM-2 (5.6 kW) -> power >150%
-> safety_status 'danger'. Page-path test 16/16; safety-score-boundaries + L2P4
regression clean (63/63). Used 'git commit -- <paths>' to avoid the shared-index
sweep that hit the prior commit.
```

## Files touched (3)
- mcp-server/src/__tests__/sfc-jm-fleet-page-closed-loop.test.ts | 25 +++++++++++++++++++++++++
- mcp-server/src/engines/ProductEngine.ts                        |  7 ++++++-
- 2 files changed, 31 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrong machine). Hardening, inline-constant convention matched.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e865ea83a775`
- Milestone envelope: `mcp-server/data/milestones/SFC-PAGE-CLOSED-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._