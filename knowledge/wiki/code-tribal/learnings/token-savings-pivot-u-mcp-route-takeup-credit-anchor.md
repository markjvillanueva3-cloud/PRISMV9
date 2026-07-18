# TOKEN-SAVINGS-PIVOT/U-MCP-ROUTE-TAKEUP-CREDIT-ANCHOR — [MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TAKEUP-CREDIT-ANCHOR (slot:alpha): anchor extractScriptRoute to a real node invocation (close the over-credit surface)

**Commit:** `abc53833de36` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T13:29:54-05:00
**Tags:** token-savings-pivot, u-mcp-route-takeup-credit-anchor, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TAKEUP-CREDIT-ANCHOR (slot:alpha): anchor extractScriptRoute to a real node invocation (close the over-credit surface)

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TAKEUP-CREDIT-ANCHOR (slot:alpha): anchor extractScriptRoute to a real node invocation (close the over-credit surface)

Per-file scrutiny (arm A) on U-MCP-ROUTE-TAKEUP-SCRIPT-CREDIT (481c7a32e0)
flagged a P2: the `\b` substring regex matched a BARE MENTION of the script name
(`echo system-viz-query.mjs`, `node my-system-viz-query.mjs`,
`node ask-ollama.mjs.bak`) -- which, while a matching nudge is open in-window,
would dishonestly INFLATE the very take-rate this feature exists to make honest.

Fix: require an actual `node ... <name>.mjs` invocation -- `\bnode\b` present AND
the script preceded by a path-sep/whitespace (excludes the my-<name> hyphen
prefix) AND `.mjs` terminated by ws/quote/end (excludes <name>.mjs.bak). New
invokesNodeScript() helper. Real invocations (rtk-prefix + absolute-path
tolerant) still credit; bare mentions/look-alikes now correctly return null.

Tests: +anchor-guard negative cases (echo/cat/grep mention, hyphen-prefix,
.bak) + positive-still-credits; mcp-route-takeup 34/34.
```

## Files touched (3)
- .claude/hooks/__tests__/mcp-route-takeup.test.mjs | 13 +++++++++++++
- .claude/hooks/mcp-route-takeup.mjs                | 17 ++++++++++++++---
- 2 files changed, 27 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till credit; bare mentions/look-alikes now correctly return null.
- till-credits; mcp-route-takeup 34/34.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show abc53833de36`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._