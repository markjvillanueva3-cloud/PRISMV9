# TOKEN-EFFICIENCY/U-INJECT-BUDGET-EVENT — [MAIN-FORCE] [TOKEN-EFFICIENCY]/U-INJECT-BUDGET-EVENT (slot:india, alpha co-domain): --event extension for the budget tool + post-audit dedup-drift findings

**Commit:** `c15c5a2183f8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T12:36:19-05:00
**Tags:** token-efficiency, u-inject-budget-event, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-EFFICIENCY]/U-INJECT-BUDGET-EVENT (slot:india, alpha co-domain): --event extension for the budget tool + post-audit dedup-drift findings

## Body
```
[MAIN-FORCE] [TOKEN-EFFICIENCY]/U-INJECT-BUDGET-EVENT (slot:india, alpha co-domain): --event extension for the budget tool + post-audit dedup-drift findings

Operator: "look for token usage inefficiency and context inefficiencies, fix the issues and fill the gaps" + "alpha is busy ... full permission to help its domain permanently."

HONEST HEADLINE (R12): the injection economy is MATURE, not wasteful -- alpha/bravo shipped dedup-lib + dedupeOrMarker (28 adopters) + budget tool + cap/knob enforce gates + a full 06-11 fleet audit; the big sink (slot-context-bundle) was deduped 06-09. Steady cap-snapshot 970B/3072B -> headroom (NOT miscalibrated; the "~244B" code comment was stale).

GENUINE FINDING -- post-06-11 dedup drift: 3 recurring injectors re-emit static content with NO dedup, bypassing the chokepoint: task-start-substrate-inject (1490B, tango, post-audit), auto-consensus-userprompt (331B, alpha backlog), model-tier-advisor (282B, MINE/MODEL-ROUTING-MS0). Root gap: cap-enforce only blocks OVER-cap + knob-enforce requires a knob but NOT dedup adoption -> nothing forces a new recurring injector to adopt dedupeOrMarker. Fix = one-line dedupeOrMarker each (firewall-blocked from india's worktree -> handed to alpha; spec has exact diff).

SHIPPED in-surface (non-hook): measure-injection-budget.mjs --event <Event> (back-compat default UserPromptSubmit) so the tool can finally audit SessionStart/Stop (alpha's lever #5). First SessionStart measure: 58 injectors, 12,363B. +5 tests. Flagged-not-touched (R12, uncertain semantics): cag-cold-cache-anchor 3x SessionStart wiring; context-bundle daemon ~33d dead (golf/papa lane).

Spec: state/shared/specs/INJECTION-POST-AUDIT-DRIFT-2026-06-12.md. Builds on alpha's tools (no dup -- 2 near-dups I started were deleted when the memory-recall surfaced the prior art).
```

## Files touched (4)
- scripts/measure-injection-budget.mjs                        | 22 ++++++++++++--------
- scripts/measure-injection-budget.test.mjs                   | 38 ++++++++++++++++++++++++++++++++++
- state/shared/specs/INJECTION-POST-AUDIT-DRIFT-2026-06-12.md | 79 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 131 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c15c5a2183f8`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._