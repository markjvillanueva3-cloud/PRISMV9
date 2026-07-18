# QUEBEC-FRONTEND-WIRING/U-WIRE-AUDIT-METHOD-MISMATCH — [MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-WIRE-AUDIT-METHOD-MISMATCH (slot:quebec): auditor detects method-mismatch (route exists, wrong verb)

**Commit:** `78098abb7103` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T09:26:13-05:00
**Tags:** quebec-frontend-wiring, u-wire-audit-method-mismatch, auto-distilled

## Subject
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-WIRE-AUDIT-METHOD-MISMATCH (slot:quebec): auditor detects method-mismatch (route exists, wrong verb)

## Body
```
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-WIRE-AUDIT-METHOD-MISMATCH (slot:quebec): auditor detects method-mismatch (route exists, wrong verb)

classifyCall() adds a precise 4th bucket: a dead "GET /x" whose EXACT path is registered under a different verb is a frontend-fixable client-verb bug, distinct from a genuinely-missing route. Surfaced after U-MACHINELIVE-METHOD-FIX.

- scripts/audit-fe-route-wiring.mjs: + classifyCall (exported, pure) -> dynamic / method-mismatch / near-miss / no-route (most-specific first); report schema 1.2.0 + a METHOD-MISMATCH dump.
- scripts/audit-fe-route-wiring.test.ts: + 5 classifyCall tests (16 total, green).

LIVE: 162 dead = 148 no-route + 2 method-mismatch + 8 near-miss + 4 dynamic. The method-mismatch class is SMALL (2: admin/users, erp/osha-incidents -- both sensitive/cross-domain), so the 148 ARE genuinely-missing backend routes (owner-domain work) -- the bulk is not mechanically frontend-fixable. Honest correction of the "many are verb bugs" hypothesis.

Session: 6 verified clean wires closed (ppg/history + 3 dev + 2 machineLive); 170->162 dead. Auditor is now a robust shared loss function for the domain owners.
```

## Files touched (3)
- mcp-server/scripts/audit-fe-route-wiring.mjs     | 55 ++++++++++++++++++++++++++++++++++---------------------
- mcp-server/scripts/audit-fe-route-wiring.test.ts | 24 +++++++++++++++++++++++-
- 2 files changed, 57 insertions(+), 22 deletions(-)

## Lessons surfaced in commit body
- wrong verb)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 78098abb7103`
- Milestone envelope: `mcp-server/data/milestones/QUEBEC-FRONTEND-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._