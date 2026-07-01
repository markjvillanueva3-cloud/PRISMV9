# QUOTING-SYNERGY-MS0/U-QP-PUBLIC-INSTANT-HARDEN — [MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-PUBLIC-INSTANT-HARDEN (slot:charlie): contain engine throws + reject degenerate quantity on the public path

**Commit:** `e29a673bbfe2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T11:11:50-05:00
**Tags:** quoting-synergy-ms0, u-qp-public-instant-harden, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-PUBLIC-INSTANT-HARDEN (slot:charlie): contain engine throws + reject degenerate quantity on the public path

## Body
```
[MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-PUBLIC-INSTANT-HARDEN (slot:charlie): contain engine throws + reject degenerate quantity on the public path

3-of-3 scrutiny (arm C analyst) found two P2 defense-in-depth holes on the
customer-facing quoting_public_instant_quote path; fixed both:

(1) THROW CONTAINMENT (load-bearing). instantQuoteEngine.quote() is NOT a
    never-throws contract -- a downstream estimate engine can throw, and the
    dispatcher's generic catch would surface the raw internal error string
    (e.g. "Quote estimation failed: <detail>") to the CUSTOMER. Wrapped quote()
    in the dispatcher case in try/catch; any throw maps to the safe
    toPublicQuoteFromInstant(null) -> {quotable:false, reason:"quote-unavailable"}.

(2) SCHEMA HARDENING. quoting_public_instant_quote `quantity` was z.number() --
    accepted 0/-5/NaN/2.5. Tightened to z.number().int().positive() + part_name/
    material .min(1) so a degenerate quantity is rejected at the schema.

Tests: +5 dispatcher round-trip tests (quotingDispatcher.test.ts 30/30): public_quote
valid->safe + missing->schema-reject; public_instant_quote real-part->safe+no-leak,
degenerate-qty->schema-reject, CONTAINMENT (garbage material still returns a
customer-safe shape, asserts NO error/detail/"Quote estimation failed" leak --
fails if try/catch removed). 51/51 both quoting test files. tsc clean.

3-of-3 scrutiny on parent e50c69f845: ALL PASS (A holistic + B test-integrity +
C analyst); these fixes close C's two P2 findings.
```

## Files touched (4)
- mcp-server/src/__tests__/quotingDispatcher.test.ts    | 92 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts        |  8 ++++--
- mcp-server/src/tools/dispatchers/quotingDispatcher.ts | 13 +++++++--
- 3 files changed, 108 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- till returns a

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e29a673bbfe2`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._