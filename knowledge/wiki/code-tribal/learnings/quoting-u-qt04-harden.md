# QUOTING/U-QT04-HARDEN — [MAIN-FORCE] [QUOTING]/U-QT04-HARDEN (slot:charlie): unwrapQuotingBody handles the 3rd response shape (MCP content envelope)

**Commit:** `17a082f72303` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T14:22:14-05:00
**Tags:** quoting, u-qt04-harden, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING]/U-QT04-HARDEN (slot:charlie): unwrapQuotingBody handles the 3rd response shape (MCP content envelope)

## Body
```
[MAIN-FORCE] [QUOTING]/U-QT04-HARDEN (slot:charlie): unwrapQuotingBody handles the 3rd response shape (MCP content envelope)

Discovered a THIRD quoting response variant while auditing built-but-unsurfaced actions: /quote/what-if returns result = { type:'text', text:'<json>' } (an un-parsed MCP content envelope) -- reading .result gives the envelope, not the data (the same dead-panel class as U-QT04). Hardened unwrapQuotingBody to peel the outer .result THEN an MCP {type:text,text} content envelope (JSON.parse), so it is robust across all 3 shapes: bare /quoting, wrapped /quote/* simple, and /quote/* content-envelope. Malformed payload -> null (never throws into render).

Live-verified the 3rd shape: POST /api/v1/quote/what-if -> { ok, result: { type:text, text:'[{scenario,unit_price,delta_pct}]' } } (qty 10->100 = -31.58%, 10->1 = +236.84%). +2 regression tests (content-envelope peel + malformed-null). web tsc 0 errors; client.test 10/10.
```

## Files touched (3)
- mcp-server/web/src/__tests__/client.test.ts | 19 +++++++++++++++++++
- mcp-server/web/src/api/client.ts            | 26 ++++++++++++++++++++------
- 2 files changed, 39 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 17a082f72303`
- Milestone envelope: `mcp-server/data/milestones/QUOTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._