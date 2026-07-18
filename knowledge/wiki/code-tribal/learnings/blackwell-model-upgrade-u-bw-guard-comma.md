# BLACKWELL-MODEL-UPGRADE/U-BW-GUARD-COMMA — [MAIN] [BLACKWELL-MODEL-UPGRADE]/U-BW-GUARD-COMMA (slot:alpha): close the documented ,-position bypass in the anti-revert guard + kill the trailing-comment false-positive class

**Commit:** `416acfe8cd7c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-05T22:44:47-05:00
**Tags:** blackwell-model-upgrade, u-bw-guard-comma, auto-distilled

## Subject
[MAIN] [BLACKWELL-MODEL-UPGRADE]/U-BW-GUARD-COMMA (slot:alpha): close the documented ,-position bypass in the anti-revert guard + kill the trailing-comment false-positive class

## Body
```
[MAIN] [BLACKWELL-MODEL-UPGRADE]/U-BW-GUARD-COMMA (slot:alpha): close the documented ,-position bypass in the anti-revert guard + kill the trailing-comment false-positive class

The handoff-flagged residual: EXEC_RE's leading-operator set (=|??|||:|(|[) missed a
retired tag as an INLINE 2nd+ array element -- ["gpt-oss:120b", "deepseek-r1:14b"] --
a fallback chain routing to a deleted small model. Added the , arm.

Live main-tree scan (R12) then surfaced a false positive the naive arm introduced:
ConsensusAuditLogEngine.ts:67 names deepseek-r1:14b in a TRAILING comment example
(voices: string[]; // ... (e.g. ["claude", "deepseek-r1:14b"])) -- documentation, not
routing. isCommentLine() only stripped FULL comment lines. Added stripTrailingComment()
(string-aware // cut; preserves the executable head so '?? "<tag>" // note' still
trips) and wired it into isViolation -- hardening ALL arms, not just the new one.

Tests: +1 positive (inline 2nd-element), +2 negatives (trailing-comment example spared;
trailing comment cannot mask an executable-head violation). Live main-tree scan GREEN
(3/3). Closes the inline-fallback revert path in the no-accidental-revert source lock.
```

## Files touched (2)
- scripts/no-retired-llm-refs.test.mjs | 57 +++++++++++++++++++++++++++++++++++++++++++++++++--------
- 1 file changed, 49 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 416acfe8cd7c`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-MODEL-UPGRADE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._