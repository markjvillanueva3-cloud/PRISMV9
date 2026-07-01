# SIERRA-LEVERAGE/U-N2-NEGATIVE-FINDING — [MAIN] [SIERRA-LEVERAGE]/U-N2-NEGATIVE-FINDING (slot:sierra): N2 orphan-hub pairing is merge-OOM-blocked

**Commit:** `e4ee86737b91` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T19:48:34-05:00
**Tags:** sierra-leverage, u-n2-negative-finding, auto-distilled

## Subject
[MAIN] [SIERRA-LEVERAGE]/U-N2-NEGATIVE-FINDING (slot:sierra): N2 orphan-hub pairing is merge-OOM-blocked

## Body
```
[MAIN] [SIERRA-LEVERAGE]/U-N2-NEGATIVE-FINDING (slot:sierra): N2 orphan-hub pairing is merge-OOM-blocked

Built+tested a correct orphan->hub pairer (10/10) but reverted: architecture-graph
subgroup is a TYPE bucket (dispatcher/registry/fs), NOT a domain cluster, so
same-subgroup anchors are nonsensical (dispatcher->dispatcher); the real per-engine
orphans + call-edges live only in the 548MB merged graph (OOM exit-134). Same keystone
blocker as W1's 7 generators. R8 lesson: verify a field's SEMANTICS before assuming
domain meaning. Memory: reference_sierra_n2_wrong_substrate_2026_05_29.
```

## Files touched (2)
- state/shared/specs/SIERRA-HIGH-LEVERAGE-OPPORTUNITIES-2026-05-29.md | 2 +-
- 1 file changed, 1 insertion(+), 1 deletion(-)

## Lessons surfaced in commit body
- lesson: verify a field's SEMANTICS before assuming
- wrong_substrate_2026_05_29.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e4ee86737b91`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-LEVERAGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._