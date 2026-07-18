# AI-SYSTEMS/U-LEARNLOOP-CONTAINSSIMILAR-FLOOR — [MAIN-FORCE] [AI-SYSTEMS]/U-LEARNLOOP-CONTAINSSIMILAR-FLOOR (slot:india): add absolute-overlap floor to containsSimilar so short patterns stop fuzzy-matching on shared common words

**Commit:** `4ff03e9f7bcc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T10:42:28-05:00
**Tags:** ai-systems, u-learnloop-containssimilar-floor, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS]/U-LEARNLOOP-CONTAINSSIMILAR-FLOOR (slot:india): add absolute-overlap floor to containsSimilar so short patterns stop fuzzy-matching on shared common words

## Body
```
[MAIN-FORCE] [AI-SYSTEMS]/U-LEARNLOOP-CONTAINSSIMILAR-FLOOR (slot:india): add absolute-overlap floor to containsSimilar so short patterns stop fuzzy-matching on shared common words

Closes the analyst-flagged P2 from U-LEARNLOOP-CLEARALL-ISOLATION. containsSimilar word-overlap path returned matchRatio>0.6 alone, so a 3-word persisted correction (e.g. 'feed rate 0.010') sharing just feed+rate (2 words, ratio 0.67) with unrelated prose wrongly matched. Now requires matchRatio>0.6 AND matchCount>=3. The unchanged direct-substring match still covers short EXACT patterns, so the floor only removes spurious fuzzy matches.

Blast radius (R8): containsSimilar is private, called ONLY by checkForCorrection, which has ZERO production consumers (grep: no non-test .checkForCorrection; the 2 dispatcher wirings of learningLoopEngine -- agentDispatcher/orchestrationDispatcher -- call getStats only). So this is a precision improvement to an as-yet-unconsumed method; no live behavioral regression. Recall trade is inert for >=5-word patterns (floor never binds) and >=4-word (byte-identical); only a 3-word/2-of-3/non-substring case is newly missed -- acceptable (those are low-precision borderline matches; no production reader).

R9 regression test added (engines/LearningLoopEngine.test.ts): positive control triggers + carries the '150 SFM' suggestion at confidence>0.7; negative 'the feed rate question here is unrelated' does NOT trigger (analyst empirically proved it fails without the floor, passes with it). Both LearningLoop test files green: 31/31 + 26/26 = 57/57. code-analyzer scrutiny PASS, 0 blockers.
```

## Files touched (3)
- mcp-server/src/__tests__/engines/LearningLoopEngine.test.ts | 17 +++++++++++++++++
- mcp-server/src/engines/LearningLoopEngine.ts                |  9 ++++++++-
- 2 files changed, 25 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrongly matched. Now requires matchRatio>0.6 AND matchCount>=3. The unchanged direct-substring match still covers short EXACT patterns, so the floor only removes spurious fuzzy matches.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4ff03e9f7bcc`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._