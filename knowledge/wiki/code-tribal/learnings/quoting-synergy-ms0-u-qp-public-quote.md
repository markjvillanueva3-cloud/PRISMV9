# QUOTING-SYNERGY-MS0/U-QP-PUBLIC-QUOTE — [MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-PUBLIC-QUOTE (slot:charlie): customer-safe public quote boundary over FMV

**Commit:** `1b54551331c1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T10:34:48-05:00
**Tags:** quoting-synergy-ms0, u-qp-public-quote, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-PUBLIC-QUOTE (slot:charlie): customer-safe public quote boundary over FMV

## Body
```
[MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-PUBLIC-QUOTE (slot:charlie): customer-safe public quote boundary over FMV

MVP backend contract gap #1 (QUOTING-FRONTEND-MVP-PLAN 2026-06-22): the keystone
unblocking the customer-facing instant-quote flow (upload -> instant quote). The
public web path must NEVER leak internal pricing internals -- cost breakdown,
margin, raw machine_rate/material_spend, the gap-vs-charged reconciliation, the
verdict, or any $/in3 basis.

QuotingPublicQuoteEngine.toPublicQuote(fmv, leadTiers) is a TOTAL allow-list
projection: emits ONLY {quotable, quote_usd, currency, reason, lead_time_tiers?}.
Builds a fresh literal -- never spreads/copies the internal FmvResult -- so adding
a field to FmvResult can never silently leak it. Fail-closed on null/ok:false/
non-finite/non-positive price -> {quotable:false, quote_usd:null, reason:<sanitized>}.
sanitizePublicReason maps internal reasons (which can name internal fields like
"missing-required:time_in_cut_s+machine_rate+material_spend") to safe categories,
never echoing a field name. sanitizeLeadTiers rejects non-finite/negative days +
negative price, normalizes -0 -> 0.

Wired: prism_quoting:quoting_public_quote (enum + schema + dispatcher case,
mirrors the sibling fair_market_value pattern -- computes FMV then projects).

VALIDATED end-to-end through the live dispatcher handler:
  HAPPY      {"quotable":true,"quote_usd":2785.3,...,"lead_time_tiers":[{tier,business_days,price_usd}]}  (internal_cost:150 dropped)
  FAILCLOSED {"quotable":false,"quote_usd":null,"reason":"quote-unavailable"}
  LEAKS      NONE (no components/gap_pct/verdict/charged_usd/margin_usd in serialized output)

Tests: 11/11 (happy + 3 fail-closed + 2 adversarial NaN/Infinity/-50 + lead-tier
sanitization incl negative-days reject + -0 normalize + no-leak sentinel scan).
tsc clean on all touched files. Per-file 2-arm scrutiny PASS (arm A code-analyzer +
arm B reviewer; 2 P2s found and fixed: negative business_days reject, -0 price norm).
```

## Files touched (5)
- mcp-server/src/engines/QuotingPublicQuoteEngine.test.ts | 164 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/QuotingPublicQuoteEngine.ts      | 116 +++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts          |  17 ++++++
- mcp-server/src/tools/dispatchers/quotingDispatcher.ts   |  11 ++++
- 4 files changed, 308 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1b54551331c1`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._