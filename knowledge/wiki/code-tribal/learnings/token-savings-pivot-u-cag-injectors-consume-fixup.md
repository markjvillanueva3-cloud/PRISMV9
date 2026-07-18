# TOKEN-SAVINGS-PIVOT/U-CAG-INJECTORS-CONSUME-FIXUP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-PIVOT]/U-CAG-INJECTORS-CONSUME-FIXUP (slot:sierra 2026-05-27): action scrutiny arm-C P1+P2 findings from 0325e81389

**Commit:** `7f6a8ded5a8c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T21:39:30-05:00
**Tags:** token-savings-pivot, u-cag-injectors-consume-fixup, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-PIVOT]/U-CAG-INJECTORS-CONSUME-FIXUP (slot:sierra 2026-05-27): action scrutiny arm-C P1+P2 findings from 0325e81389

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-PIVOT]/U-CAG-INJECTORS-CONSUME-FIXUP (slot:sierra 2026-05-27): action scrutiny arm-C P1+P2 findings from 0325e81389

P1 - memory-relevance-inject: removed _markSeen() call on the CAG-skip path. Was burning the 24h per-(session,file) rate-limit window on a SKIP, so if the COLD sidecar later went stale within that window and the same Edit re-fired, _recentlySeen would suppress the fallback that fail-OPEN was supposed to preserve. Silent rate-limiter-blocks-fallback class.

P2 - tribal-by-domain-inject: session_id extractor now accepts BOTH input.session_id AND input.sessionId (mirrors master-index pattern). Was a silent-full-rerank-on-COLD class if harness ever drifted to camelCase.

Tests: 130/130 pass after fixup. Closes scrutiny arm-C findings from 0325e81389.
```

## Files touched (3)
- .claude/hooks/memory-relevance-inject.mjs |  8 +++++++-
- .claude/hooks/tribal-by-domain-inject.mjs | 11 +++++++++--
- 2 files changed, 16 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7f6a8ded5a8c`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._