# ENGINE-AUDIT/U-FABRICATED-OUTPUT-SWEEP — [MAIN-FORCE] [ENGINE-AUDIT]/U-FABRICATED-OUTPUT-SWEEP (slot:bravo): iter8 fleet-wide placeholder fabricated-output trace -- 2 NEW real defects surfaced (WEDM cut-time, Lathe efficiency)

**Commit:** `af8cf4013fd5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T11:44:12-05:00
**Tags:** engine-audit, u-fabricated-output-sweep, auto-distilled

## Subject
[MAIN-FORCE] [ENGINE-AUDIT]/U-FABRICATED-OUTPUT-SWEEP (slot:bravo): iter8 fleet-wide placeholder fabricated-output trace -- 2 NEW real defects surfaced (WEDM cut-time, Lathe efficiency)

## Body
```
[MAIN-FORCE] [ENGINE-AUDIT]/U-FABRICATED-OUTPUT-SWEEP (slot:bravo): iter8 fleet-wide placeholder fabricated-output trace -- 2 NEW real defects surfaced (WEDM cut-time, Lathe efficiency)

Traced 8 high-signal hardcoded/placeholder hits for the feedrate-bug class.
6 benign (S0-rpm filled in assembleProgram:604 VERIFIED; collision body_type
not-read mislabel; documented sentinels; test-template). 2 NEW real
fabricated-output defects, both domain-owned (need input-API/geometry change,
not safe bravo plumbing since the real value is out of scope):
 - WEDMCalculatorAIEngine:433 pathLength=100 -> every passes[].cutting_time_min
   + predicted_cycle_time_min fabricated (mike: add cut_length_mm + fail-loud).
 - LatheOpusReasoningEngine:1931 cycleTimePerPart=5 -> cost/efficiency fabricated
   (whiskey/charlie: derive from volume/MRR; partly cancels as relative score).
Rigorously traced + precisely routed to owners (audit's job; R8/R12 -- not blind-fixed).
```

## Files touched (2)
- state/shared/specs/ENGINE-ALGORITHM-FORMULA-AUDIT-2026-06-19.md | 8 ++++++++
- 1 file changed, 8 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show af8cf4013fd5`
- Milestone envelope: `mcp-server/data/milestones/ENGINE-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._