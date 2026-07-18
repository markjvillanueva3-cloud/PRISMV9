# QUOTING/U-QUOTE-COMPAT-REDACT-P0 — [MAIN-FORCE] [QUOTING]/U-QUOTE-COMPAT-REDACT-P0 (slot:charlie): close 3 scrutiny gaps -- envelope no-op P0 + 3 sibling routes + uncertainty leak

**Commit:** `b3cad3b84e85` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T23:05:04-05:00
**Tags:** quoting, u-quote-compat-redact-p0, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING]/U-QUOTE-COMPAT-REDACT-P0 (slot:charlie): close 3 scrutiny gaps -- envelope no-op P0 + 3 sibling routes + uncertainty leak

## Body
```
[MAIN-FORCE] [QUOTING]/U-QUOTE-COMPAT-REDACT-P0 (slot:charlie): close 3 scrutiny gaps -- envelope no-op P0 + 3 sibling routes + uncertainty leak

3-of-3 gate caught that the initial redaction was DECORATIVE and incomplete:

P0 (arm A): redaction was a NO-OP in production. prism_business returns a
{type:"text",text:JSON} MCP envelope (slimResponse, no content[]) that callTool
can't peel, so redactInternalMarginFields saw only {type,text} -> passed the full
cost stack through inside text. FIX: redactThroughEnvelope parses the envelope,
redacts the real object, re-wraps. Negative-control proven (5 tests fail on neuter).
This is the same envelope class as reference_charlie_estimate_flow_envelope_nested_fix.

P1 (arm B): the uncertainty block (estimated_cost/ci95_low/ci95_high = raw per-part
cost basis) was not redacted. FIX: uncertainty in REDACTED_NESTED_BLOCKS.

P1 (arm C): 3 sibling routes on the same anon router leaked the same stack and were
unflagged -- /injection-mold (FLAT machine_rate_hr/total_cost/margin_pct), /sheet-metal
+ /additive (nested). FIX: all 3 flagged sensitive + a FLAT-key deletion path
(REDACTED_FLAT_KEYS) added for the injection-mold shape.

Sensitive set: 5 routes, both nested+flat shapes. Non-sensitive verified clean
(price-breaks/compare/what-if projected arrays; blueprint_to_quote returns the input
spec not a result; sec_ops no margin; material-price = public market data). Customer
price + lead_time + mold_cost preserved; authed callers + erp.ts authed path unchanged;
graceful empty-{} keeps the FE adaptQuoteEstimate from a 502. 20/20 route security test
(real router + production envelope mock + rawResult wire leak-scan + negative-control
teeth); tsc clean; dist rebuilt; 3-of-3 PASS (blockCount 0). quebec anon-UX follow-up
logged in OPEN-THREADS.
```

## Files touched (4)
- mcp-server/src/__tests__/quote-route-margin-redaction.test.ts | 207 ++++++++++++++++++++++++++++++++++++++++++--------
- mcp-server/src/engines/quoting/OPEN-THREADS.md                |  55 +++++++++-----
- mcp-server/src/routes/quote.ts                                |  86 +++++++++++++++++----
- 3 files changed, 283 insertions(+), 65 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b3cad3b84e85`
- Milestone envelope: `mcp-server/data/milestones/QUOTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._