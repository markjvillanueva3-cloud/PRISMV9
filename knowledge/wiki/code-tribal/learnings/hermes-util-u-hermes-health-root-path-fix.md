# HERMES-UTIL/U-HERMES-HEALTH-ROOT-PATH-FIX — [MAIN-FORCE] [HERMES-UTIL]/U-HERMES-HEALTH-ROOT-PATH-FIX (slot:alpha): probe /health at origin root, not /v1/health -- fix false fleet-wide HUNG banner

**Commit:** `829033c2f5af` · **By:** markjvillanueva3-cloud · **At:** 2026-06-27T12:49:00-05:00
**Tags:** hermes-util, u-hermes-health-root-path-fix, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-HEALTH-ROOT-PATH-FIX (slot:alpha): probe /health at origin root, not /v1/health -- fix false fleet-wide HUNG banner

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-HEALTH-ROOT-PATH-FIX (slot:alpha): probe /health at origin root, not /v1/health -- fix false fleet-wide HUNG banner

The SessionStart health-inject built BASE_URL/health = http://127.0.0.1:8645/v1/health,
but the proxy serves /health at the ORIGIN ROOT (only /chat/completions,/completions,
/embeddings,/models,/responses are forwarded under /v1). The probe got 404
path_not_allowed -> classifyHealth -> hung -> a false HUNG banner on every SessionStart,
fleet-wide, while /health (root) returned {status:ok,authenticated:true}.

Fix: pure healthUrlFor(baseUrl) derives <origin>/health (URL-parse + scheme-less
fallback that strips a trailing /v1); probeHealth fetches it directly. Verified live:
hook now SILENT against the healthy proxy. 25/25 tests (4 new R9 healthUrlFor cases).
Self-corrects U-HERMES-PROXY-HEALTH-INJECT (3531072be8).
```

## Files touched (3)
- .claude/hooks/hermes-proxy-health-inject.mjs      | 29 +++++++++++++++++++++++++----
- .claude/hooks/hermes-proxy-health-inject.test.mjs | 22 +++++++++++++++++++++-
- 2 files changed, 46 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- TIL]/U-HERMES-HEALTH-ROOT-PATH-FIX (slot:alpha): probe /health at origin root, not /v1/health -- fix false fleet-wide HUNG banner

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 829033c2f5af`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._