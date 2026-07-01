# HOTEL/U-WEDMERP-RATES-REDACT — [MAIN-FORCE] [HOTEL]/U-WEDMERP-RATES-REDACT (slot:hotel): strip margin_pct + overhead_pct from anon GET /api/v1/wedm-erp/quote/rates

**Commit:** `5538ba5c38fd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T12:47:16-05:00
**Tags:** hotel, u-wedmerp-rates-redact, auto-distilled

## Subject
[MAIN-FORCE] [HOTEL]/U-WEDMERP-RATES-REDACT (slot:hotel): strip margin_pct + overhead_pct from anon GET /api/v1/wedm-erp/quote/rates

## Body
```
[MAIN-FORCE] [HOTEL]/U-WEDMERP-RATES-REDACT (slot:hotel): strip margin_pct + overhead_pct from anon GET /api/v1/wedm-erp/quote/rates

SECURITY (anon margin/overhead leak, found by the per-route ERP sweep -- NOT the headline 23:23 verifyToken
count). GET /quote/rates is intentionally anon-reachable (a prospect-facing rate card) but bundled
overhead_pct + margin_pct -- the shop's INTERNAL margin/overhead structure -- into the anon response. Same
leak class as the quoting cost sweep + the hotel-portal PII gate (charlie-soul refuse: no margin/overhead
to a customer/anon surface). The comment even called it 'public, no auth' -- the intent was a public rate
card, but it shipped the margin/overhead percentages.

FIX (redact-when-anon, mirroring the quoting pattern -- the route HAS a legitimate public view, just not of
the margin): an authed caller (req.userId set by the global /api optionalToken, index.ts:140) gets the FULL
card incl. overhead_pct + margin_pct; an anon prospect gets only the customer-facing machine/operator/wire
rates with the two percentages STRIPPED. Fresh-per-request object (no carryover); constants stay imported
from WEDM_DEFAULT_RATES (physics/wedm-constants.ts), never inlined.

Test (wedm-erp-routes-u04.test.ts): added an optionalToken stand-in to the harness (sets userId only on an
Authorization header -- /quote/rates is NOT verifyToken-gated so this is the only authed path); rewrote the
/quote/rates block: AUTHED -> full card incl. percentages; ANON -> not.toHaveProperty(overhead_pct/
margin_pct) + a raw-wire string scan (no margin_pct/overhead_pct anywhere). 16/16 u04 green; tsc clean.
Per-file 2-arm scrutiny PASS (route: percentages provably stripped for anon, redact-vs-gate sound; test:
3 independent leak-proof mechanisms with teeth).

PRE-EXISTING (NOT this diff, R12): wedm-erp-routes-u07.test.ts > /job/:id/variance fails in isolation
(expected 52, got 0) -- a variance_pct calc bug last touched by peer commit 6ec393cf41 [MAIN]/U-EFF16
(@ts-nocheck removal). Orthogonal to /quote/rates; not fixed per lane discipline; recorded for the owning
slot.
```

## Files touched (3)
- mcp-server/src/__tests__/wedm-erp-routes-u04.test.ts | 43 ++++++++++++++++++++++++++++++++++---------
- mcp-server/src/routes/wedm-erp.ts                    | 24 ++++++++++++++++++------
- 2 files changed, 52 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5538ba5c38fd`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._