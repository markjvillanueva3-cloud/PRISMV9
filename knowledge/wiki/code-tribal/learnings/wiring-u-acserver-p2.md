# WIRING/U-ACSERVER-P2 — [MAIN-FORCE] [WIRING]/U-ACSERVER-P2 (slot:romeo, for kilo): body-read timeout hardening + stale config comments (3-of-3 P2s)

**Commit:** `1c8b4f2da514` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T15:04:32-05:00
**Tags:** wiring, u-acserver-p2, auto-distilled

## Subject
[MAIN-FORCE] [WIRING]/U-ACSERVER-P2 (slot:romeo, for kilo): body-read timeout hardening + stale config comments (3-of-3 P2s)

## Body
```
[MAIN-FORCE] [WIRING]/U-ACSERVER-P2 (slot:romeo, for kilo): body-read timeout hardening + stale config comments (3-of-3 P2s)

Follow-up to the 3-of-3-PASSed orphan resolution (30e225404c). Closes the two P2
findings:
- arm C: readJsonBody had no app-level idle timer -> an incomplete-body client
  (under-sends vs its Content-Length) could hold a loopback connection up to node's
  5-min default. Added server.requestTimeout=30s + headersTimeout=10s in start()
  (generous for a loopback AC script call; loopback-only so low exposure).
- HyperMillACServerConfig.ts comments still cited the old HyperMillACBridgeEngine
  name -> updated to HyperMillACServerEngine (E1144).
Test still 20 passed / 1 skipped / 0 failed; tsc clean. (Remaining stale doc refs in
ENGINE_DIGEST auto-regen + mill/pdf-corpus-mill galaxy docs are other owners' hygiene.)
```

## Files touched (3)
- mcp-server/src/engines/HyperMillACServerConfig.ts | 4 ++--
- mcp-server/src/engines/HyperMillACServerEngine.ts | 5 +++++
- 2 files changed, 7 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till cited the old HyperMillACBridgeEngine
- till 20 passed / 1 skipped / 0 failed; tsc clean. (Remaining stale doc refs in

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1c8b4f2da514`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._