# OBSERVABILITY-MS0/U-METRICS02 — [MAIN] [OBSERVABILITY-MS0]/U-METRICS02 (slot:bravo): /metrics/view live dashboard + JSON-RPC error capture

**Commit:** `815649d03226` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T22:07:28-05:00
**Tags:** observability-ms0, u-metrics02, auto-distilled

## Subject
[MAIN] [OBSERVABILITY-MS0]/U-METRICS02 (slot:bravo): /metrics/view live dashboard + JSON-RPC error capture

## Body
```
[MAIN] [OBSERVABILITY-MS0]/U-METRICS02 (slot:bravo): /metrics/view live dashboard + JSON-RPC error capture

Follow-on to U-METRICS01:
- GET /metrics/view — self-contained auto-refreshing (3s) HTML dashboard over
  /metrics?format=json. XSS-safe by construction (DOM createElement+textContent,
  NOT innerHTML — security hook enforced this). HTML in metricsViewHtml().
- JSON-RPC error capture — /mcp POST now taps the response body (tools/call only,
  bounded 128KB, fail-safe: always calls original write/end, never throws) to
  detect JSON-RPC protocol errors AND MCP isError results (both HTTP 200), so
  error rate is real, not just HTTP-level.

Monkey-patch verified TRANSPARENT live: a 467KB tools/list response round-trips
intact after restart; /metrics/view serves 200 HTML; JSON metrics populate.
Tests: 9 vitest (added metricsViewHtml XSS-safety smoke). Deploy: build:fast.
```

## Files touched (4)
- mcp-server/src/__tests__/metrics-collector.test.ts | 10 +++++++++-
- mcp-server/src/index.ts                            | 53 +++++++++++++++++++++++++++++++++++++++++++++++++++--
- mcp-server/src/observability/metrics-collector.ts  | 54 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 114 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 815649d03226`
- Milestone envelope: `mcp-server/data/milestones/OBSERVABILITY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._