# QUOTING/U-COST-ROUTE-REDACT — [MAIN-FORCE] [QUOTING]/U-COST-ROUTE-REDACT (slot:charlie): redact internal cost basis + $/hr-in-notes from anon /api/v1/cost/{estimate,quote} + /api/v1/pipeline/quote

**Commit:** `943bf4259abf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T09:59:31-05:00
**Tags:** quoting, u-cost-route-redact, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING]/U-COST-ROUTE-REDACT (slot:charlie): redact internal cost basis + $/hr-in-notes from anon /api/v1/cost/{estimate,quote} + /api/v1/pipeline/quote

## Body
```
[MAIN-FORCE] [QUOTING]/U-COST-ROUTE-REDACT (slot:charlie): redact internal cost basis + $/hr-in-notes from anon /api/v1/cost/{estimate,quote} + /api/v1/pipeline/quote

The R16 sibling of U-QUOTE-COMPAT-REDACT + U-QUOTES-INSTANT-REDACT. app.use('/api', optionalToken)
(routes/index.ts:140) makes the whole /api surface anon-reachable (auth.ts:64-76 never rejects anon).
THREE handlers leaked the shop cost basis to anonymous callers:
  - POST /cost/estimate  -> process_cost (IntelligenceEngine.ts:1104) PURE cost basis:
    total/machine/tool/setup_cost_per_part + breakdown + inputs.machine_rate_per_hour (the shop $/hr).
  - POST /cost/quote     -> shop_quote (ProductEngine.ts:1908) customer pricing + internal cost_breakdown
    + a $/hr rate inlined into notes[0] ('Machine: X at $137/hr').
  - POST /pipeline/quote -> process_cost (same PURE-cost leak).

FIX (R8 reuse + extend): the shared redactInternalMarginFields/redactThroughEnvelope (quote.ts) already
covered the /quote + /quotes shapes; process_cost is a 4th shape -> extend REDACTED_FLAT_KEYS +=
total/tool/setup_cost_per_part and REDACTED_NESTED_BLOCKS += breakdown/inputs (additive: no shipped
customer surface carries top-level breakdown/inputs, so it matches ONLY process_cost; 20/20 quote + 7/7
quotes regression stays green). Add a shop_quote-specific redactShopQuoteNotes that filters the notes
array for a $<n>/hr rate pattern (field-name redaction can't catch a value-in-a-string), keeping the
customer-safe lead-time/volume-discount notes. Gate each handler with redact-when-!req.userId. ENVELOPE:
prism_intelligence returns the STANDARD content[] envelope which callTool (index.ts:887) JSON.parses, so
the route gets the real object -> redactInternalMarginFields directly (NOT redactThroughEnvelope).

CLEAN (not touched, verified): /pipeline/roi (ROI payback, no cost basis), /export/* (echoes caller body),
/cost/compare+/history (honest 501). Customer pricing + process metrics + lead-time + volume-discount
notes PRESERVED; authed + erp.ts admin path unchanged; margin-floor gate never softened (soul refuse).

Tests: 12/12 new cost-route-redaction.test.ts (prod-shape mock = parsed engine object, anon NUMBER
leak-scan, authed pass-through, negative-control, >=2 adversarial); 5/5 cost-route-contract + 7/7
quotes-instant + 3/3 quote-compat adapter regression green; tsc clean on the 4 files.
```

## Files touched (5)
- mcp-server/src/__tests__/cost-route-redaction.test.ts | 256 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/cost.ts                         |  37 ++++++++++++++++++++++++++++++--
- mcp-server/src/routes/pipeline.ts                     |   8 ++++++-
- mcp-server/src/routes/quote.ts                        |  24 +++++++++++++++------
- 4 files changed, 315 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 943bf4259abf`
- Milestone envelope: `mcp-server/data/milestones/QUOTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._