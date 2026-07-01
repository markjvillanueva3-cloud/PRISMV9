# QUEBEC-FRONTEND-WIRING/U-LATHEAI-404-MSG — [MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-LATHEAI-404-MSG (slot:quebec): lathe-AI client surfaces a clear missing-backend message on 404 (shop-floor testing-readiness)

**Commit:** `7d3d68eb58f3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T11:18:42-05:00
**Tags:** quebec-frontend-wiring, u-latheai-404-msg, auto-distilled

## Subject
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-LATHEAI-404-MSG (slot:quebec): lathe-AI client surfaces a clear missing-backend message on 404 (shop-floor testing-readiness)

## Body
```
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-LATHEAI-404-MSG (slot:quebec): lathe-AI client surfaces a clear missing-backend message on 404 (shop-floor testing-readiness)

The 1 live broken wire (U-CONTRACT-REACHABILITY finding): LatheResultsPage[routed] -> LatheAIPanel -> useLatheAI -> latheAI.ts POSTs to /api/v1/ai/reasoning, which is unmounted (lathe-AI backend pending). useApiCall ALREADY catches the throw into an error state (no crash -- verified, correcting the earlier 'throws on use' framing), but the surfaced message was the raw cryptic 'Not Found'. For shop-floor internal testing, surface the real state instead.

- latheAI.ts post(): res.status===404 -> throw a clear 'Lathe AI is not available yet -- backend (POST <base>, action <x>) not implemented' (names the action for debuggability); non-404 errors still bubble their {message}; success unchanged.
- +web vitest test (4/4): 404->clear msg (not raw Not Found) + action named + 200->result + 500->bubbles message.
- Scoped to latheAI (the one verified live broken wire); not generalized (R8, no premature abstraction). Real fix = build the lathe-AI backend (cam/lathe domain); this is the honest interim for testing-readiness.
```

## Files touched (3)
- mcp-server/web/src/__tests__/latheAI.test.ts | 47 +++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/api/latheAI.ts            |  6 ++++++
- 2 files changed, 53 insertions(+)

## Lessons surfaced in commit body
- till bubble their {message}; success unchanged.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7d3d68eb58f3`
- Milestone envelope: `mcp-server/data/milestones/QUEBEC-FRONTEND-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._