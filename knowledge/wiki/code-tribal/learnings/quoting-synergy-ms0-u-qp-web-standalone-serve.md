# QUOTING-SYNERGY-MS0/U-QP-WEB-STANDALONE-SERVE — [MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-WEB-STANDALONE-SERVE (slot:charlie): standalone static-serve + reverse-proxy -> the quoting frontend is now USABLE without touching the shared backend

**Commit:** `9963087faa02` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:16:41-05:00
**Tags:** quoting-synergy-ms0, u-qp-web-standalone-serve, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-WEB-STANDALONE-SERVE (slot:charlie): standalone static-serve + reverse-proxy -> the quoting frontend is now USABLE without touching the shared backend

## Body
```
[MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-WEB-STANDALONE-SERVE (slot:charlie): standalone static-serve + reverse-proxy -> the quoting frontend is now USABLE without touching the shared backend

Operator chose the non-disruptive path. scripts/serve-web-static.mjs serves the built
mcp-server/dist/web (SPA fallback) and STREAMS /api + /ws to the live :3100 backend with
correct method/body forwarding (req.pipe) -- the POST-body forwarding the vite dev-proxy
fumbled (localhost->IPv6 + body issues on Windows). Dependency-free (node http/net/fs).

LIVE-VERIFIED on :4000 against the running backend:
- GET /            -> 200, serves the real app (title PRISM Academy + JS bundle)
- GET /quote-builder -> 200 (SPA client-route fallback to index.html)
- POST /api/mcp/quoting {gcode_cycle_time} -> REAL result (total_seconds 12.04) [body forwarded]
- POST {inflation_adjust} -> backend schema-validation (proves body received + parsed)

Defensive: path-traversal guard (rejects .. segments + resolve-escape backstop), 502 on
backend-down, fail-loud on missing build, GET-only static, WS upgrade proxied. Pure helpers
(contentTypeFor/isProxyPath/safeStaticPath) unit-tested 4/4 (incl. traversal + bad-encoding).

RUN: node mcp-server/scripts/serve-web-static.mjs  (http://127.0.0.1:4000/; env
PRISM_WEB_SERVE_PORT / PRISM_API_TARGET override).
```

## Files touched (3)
- mcp-server/scripts/serve-web-static.mjs      | 161 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/scripts/serve-web-static.test.mjs |  60 +++++++++++++++++++++++++
- 2 files changed, 221 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9963087faa02`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._