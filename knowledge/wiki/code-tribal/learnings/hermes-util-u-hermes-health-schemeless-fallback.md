# HERMES-UTIL/U-HERMES-HEALTH-SCHEMELESS-FALLBACK — [MAIN-FORCE] [HERMES-UTIL]/U-HERMES-HEALTH-SCHEMELESS-FALLBACK (slot:alpha): harden healthUrlFor fallback to emit a FETCHABLE root /health -- closes the residual false-HUNG the 3-of-3 flagged

**Commit:** `d3da76904b33` · **By:** markjvillanueva3-cloud · **At:** 2026-06-27T13:38:23-05:00
**Tags:** hermes-util, u-hermes-health-schemeless-fallback, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-HEALTH-SCHEMELESS-FALLBACK (slot:alpha): harden healthUrlFor fallback to emit a FETCHABLE root /health -- closes the residual false-HUNG the 3-of-3 flagged

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-HEALTH-SCHEMELESS-FALLBACK (slot:alpha): harden healthUrlFor fallback to emit a FETCHABLE root /health -- closes the residual false-HUNG the 3-of-3 flagged

R16 gap-closure on 829033c2f5. A scheme-less PRISM_HERMES_PROXY_URL (e.g.
'127.0.0.1:8645/v1') made new URL() throw -> the old fallback emitted a scheme-less
URL that fetch() rejects -> classifyHealth='hung' -> a NEW false HUNG (same alarm class
the hook prevents). Fallback now prepends http:// when no scheme is present, re-derives
the origin, and keeps the string-strip as a last resort that never throws. Empty/null
-> '/health' (no crash). 26/26 tests (scheme-less now asserts a fetchable http:// URL +
empty/null adversarial). Live hook still SILENT against the healthy default proxy.
```

## Files touched (3)
- .claude/hooks/hermes-proxy-health-inject.mjs      | 15 +++++++++++++--
- .claude/hooks/hermes-proxy-health-inject.test.mjs | 15 ++++++++++++---
- 2 files changed, 25 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- TIL]/U-HERMES-HEALTH-SCHEMELESS-FALLBACK (slot:alpha): harden healthUrlFor fallback to emit a FETCHABLE root /health -- closes the residual false-HUNG the 3-of-3 flagged
- till SILENT against the healthy default proxy.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d3da76904b33`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._