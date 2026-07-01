# QUOTING-SYNERGY-MS0/U-QP-NRE-AMORTIZE-TEST-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-NRE-AMORTIZE-TEST-FIX (slot:charlie): fix STALE NRE-amortization test + misleading comment (pre-existing RED)

**Commit:** `8cb19e2f8805` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:14:00-05:00
**Tags:** quoting-synergy-ms0, u-qp-nre-amortize-test-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-NRE-AMORTIZE-TEST-FIX (slot:charlie): fix STALE NRE-amortization test + misleading comment (pre-existing RED)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-NRE-AMORTIZE-TEST-FIX (slot:charlie): fix STALE NRE-amortization test + misleading comment (pre-existing RED)

quoting-system.test.ts "handles NRE items with amortization" was RED (pre-existing,
verified by stash — not caused by the margin-floor work). The test asserted
nre.items[1].amortized_per_part === 0 (an NRE item with no amortize_over_qty should
NOT amortize), encoding an obsolete "lump NRE billed separately" model.

R12 decided the wrong side = the test, not the code: QuoteEstimatorEngine totalCost
(line ~377) folds in ONLY amortized_per_part*qty — total_nre is reported but NEVER
separately billed. So if an unset-amortize item produced amortized_per_part 0, its
NRE cost would VANISH from the quote (under-quote). The code's amortize-all (line 829
`amortize_over_qty || input.quantity`) is therefore correct — it recovers ALL NRE in
the per-part price. The test + the `amortize_over_qty` type comment ("if set, folds…")
were stale relative to that.

Fix (no pricing change — code behavior is correct as-is): (1) test now asserts both
items amortize + the real recovery invariant (amortized_per_part*qty ≈ total_nre, i.e.
no NRE silently dropped); (2) corrected the misleading type comment. 37/37 green.

Future (scoped, NOT now): billing total_nre as a separate upfront line (standard NRE
practice) is a possible enhancement — a behavior change needing its own validation,
not a rushed pricing edit.

Verify: cd mcp-server && npx vitest run src/__tests__/quoting-system.test.ts (37/37)
```

## Files touched (3)
- mcp-server/src/__tests__/quoting-system.test.ts | 12 +++++++++---
- mcp-server/src/engines/QuoteEstimatorEngine.ts  |  2 +-
- 2 files changed, 10 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- wrong side = the test, not the code: QuoteEstimatorEngine totalCost

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8cb19e2f8805`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._