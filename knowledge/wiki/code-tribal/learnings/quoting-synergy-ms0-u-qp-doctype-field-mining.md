# QUOTING-SYNERGY-MS0/U-QP-DOCTYPE-FIELD-MINING — [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-DOCTYPE-FIELD-MINING (slot:charlie): extract actual $ from real Orders-Closed POs [MAIN-FORCE]

**Commit:** `17e0cb39c69c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T02:09:02-05:00
**Tags:** quoting-synergy-ms0, u-qp-doctype-field-mining, auto-distilled

## Subject
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-DOCTYPE-FIELD-MINING (slot:charlie): extract actual $ from real Orders-Closed POs [MAIN-FORCE]

## Body
```
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-DOCTYPE-FIELD-MINING (slot:charlie): extract actual $ from real Orders-Closed POs [MAIN-FORCE]

The Orders-Closed docs are PURCHASE ORDERS carrying $ as per-line 'Amount: $X' /
'Unit Cost: $Y' + an 'Order Number', NOT an 'INVOICE TOTAL' line -- so the flat
RE_INVOICE_TOTAL extracted $0 from the credential-free actual-price source.

- mineDollarAmounts / mineOrderNumber / mineOrderTotal (labeled-total else max-dollar,
  with method + confidence). classifyRow's ACTUAL branch now uses mineOrderTotal +
  captures order_number (precise join key) + actual_price_method. Pure, no rate/margin const.
- +6 node:test incl. a REAL Elite-Fasteners-PO(#28469) fixture; 24/24 pass.
- LIVE-VALIDATED on 80 real Orders-Closed PDFs: 25 (31%) now yield an actual $ (was 0%
  with the old regex), matching the documented ~35%-carry-$ ceiling. methods 21 labeled
  + 4 max-dollar; order# captured 8/25. Samples $521.25/ord28469, $756/ord28250, $350.

Honest scope (R12): unlocks the ACTUAL-price stream from real POs. Customer/part
join-key extraction from PO letterhead (JM Die is the vendor, customer is the issuer)
is still weak -> follow-on. order# is the stronger join key now captured.
```

## Files touched (3)
- scripts/lib/docustrata-outcome-extract-lib.mjs      | 77 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----
- scripts/lib/docustrata-outcome-extract-lib.test.mjs | 64 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 136 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- till weak -> follow-on. order# is the stronger join key now captured.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 17e0cb39c69c`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._