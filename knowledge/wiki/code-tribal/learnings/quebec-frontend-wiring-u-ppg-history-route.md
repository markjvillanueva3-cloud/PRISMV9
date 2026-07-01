# QUEBEC-FRONTEND-WIRING/U-PPG-HISTORY-ROUTE — [MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-PPG-HISTORY-ROUTE (slot:quebec): close ppg/history dead wire (clean, verified) + fix auditor inline-route false-positives

**Commit:** `ab3dc20bde58` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T09:13:22-05:00
**Tags:** quebec-frontend-wiring, u-ppg-history-route, auto-distilled

## Subject
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-PPG-HISTORY-ROUTE (slot:quebec): close ppg/history dead wire (clean, verified) + fix auditor inline-route false-positives

## Body
```
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-PPG-HISTORY-ROUTE (slot:quebec): close ppg/history dead wire (clean, verified) + fix auditor inline-route false-positives

First CLEAN no-route gap closed after per-cluster verification. GET /api/v1/ppg/history was dead (client.ts ppgHistory() -> no route); prism_product:ppg_history is a REAL (non-stub) action, so a thin read-only route mirroring /ppg/controllers closes it.

- routes/ppg.ts: + GET /history -> callTool("prism_product","ppg_history",{}) ({ ok, data } envelope per file convention).
- __tests__/ppgHistoryRoute.test.ts: 3 tests (forward+wrap, throw->500 fail-loud, registration). Green; mcp tsc clean.
- scripts/audit-fe-route-wiring.mjs: AUDITOR FIX -- step 3b now also scans inline app.<method>("/api/...") in index.ts. Caught while verifying alarm-decode = a FALSE POSITIVE (index.ts:254 inline route the router-only scan missed); prevents wiring a duplicate. Count corrected 170->167.

Verification confirms most no-route gaps are NOT clean wires (cadGeometry = stub backend); ppg/history IS. 155 no-route remain (cross-domain, owner-driven via the auditor as shared loss function).
```

## Files touched (4)
- mcp-server/scripts/audit-fe-route-wiring.mjs     |  8 +++++++
- mcp-server/src/__tests__/ppgHistoryRoute.test.ts | 75 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/ppg.ts                     | 12 +++++++++++
- 3 files changed, 95 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ab3dc20bde58`
- Milestone envelope: `mcp-server/data/milestones/QUEBEC-FRONTEND-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._