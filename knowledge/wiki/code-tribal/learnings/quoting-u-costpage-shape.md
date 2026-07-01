# QUOTING/U-COSTPAGE-SHAPE — [MAIN-FORCE] [QUOTING]/U-COSTPAGE-SHAPE (slot:charlie): fix CostEstimatorPage dead-panel -- route shape adapter + {result} envelope unwrap

**Commit:** `940599eebe60` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T11:48:21-05:00
**Tags:** quoting, u-costpage-shape, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING]/U-COSTPAGE-SHAPE (slot:charlie): fix CostEstimatorPage dead-panel -- route shape adapter + {result} envelope unwrap

## Body
```
[MAIN-FORCE] [QUOTING]/U-COSTPAGE-SHAPE (slot:charlie): fix CostEstimatorPage dead-panel -- route shape adapter + {result} envelope unwrap

CostEstimatorPage was dead for EVERY caller (pre-existing, independent of the U-COST-ROUTE-REDACT
anon-redaction): TWO compounding bugs. (1) SHAPE: prism_intelligence:process_cost emits
total_cost_per_part/machine_cost/per-op breakdown ARRAY, but the page derefs result.per_part_cost/
total_cost/Object.entries(breakdown) -> undefined.toFixed() crash. (2) ENVELOPE: the route returns
{result: ...} but the FE post<T> returned the bare body -> res.per_part_cost undefined (the same
{result} dead-panel class as the 2026-06-23 quoting unwrap fix, inverted).

FIX (4 files):
- routes/cost.ts: new pure adaptCostEstimate(result) maps process_cost -> FE CostEstimate
  {per_part_cost<-total_cost_per_part, total_cost<-per_part*batch_size, breakdown:{machine,tooling,setup}}.
  Only the 3 components the engine actually computes -- no fabricated material/labor/overhead (R12).
  /estimate handler composes redact-FIRST, adapt-SECOND: anon -> redactor strips cost basis -> adapter
  passes through (no fabricated FE cost keys, secure empty panel); authed -> full FE shape. Dropped the
  Math.max(1,batch) clamp that masked a provided 0/negative batch (reviewer P2).
- web/src/api/cost.ts: new unwrapResult<T>(body)=body.result??body in post/get peels the {result}
  envelope; CostEstimate.breakdown loosened to Record<string,number> (was a 5-key literal -- interface
  drift; engine emits 3, page renders Object.entries key-agnostically).
- +8 route adapter tests (reference values 42.5/1062.5/{machine,tooling,setup}, anon redact-then-adapt
  no-leak, 5 adversarial) + 8 FE unwrap tests (peel/identity/over-peel-guard/round-trip-on-real-wrapped-
  wire/negative-control/error-path). 1 stale authed-breakdown assertion corrected to the new FE contract.

route+FE tests 36/36 green; sibling cost-route-contract/quote-route/quotes-instant 32/32 no-regression;
tsc clean on all 4 files. Per-file 2-arm scrutiny PASS (route reviewer caught + I fixed the P1 envelope
unwrap + P2 batch clamp; test reviewer PASS with proven teeth). FE auth-header wiring (the page sends no
token -> always anon -> secure empty until signed in) logged as a quebec follow-up.
```

## Files touched (5)
- mcp-server/src/__tests__/cost-route-redaction.test.ts |  99 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- mcp-server/src/routes/cost.ts                         |  50 +++++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/web/src/__tests__/cost-api-unwrap.test.ts  | 104 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/api/cost.ts                        |  33 ++++++++++++++++++++++++---------
- 4 files changed, 274 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- til signed in) logged as a quebec follow-up.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 940599eebe60`
- Milestone envelope: `mcp-server/data/milestones/QUOTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._