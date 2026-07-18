# QUOTING-SYNERGY-MS0/U-QP-PART-PHONE-GUARD — [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-PART-PHONE-GUARD (slot:charlie): reject phone numbers as part codes [MAIN-FORCE]

**Commit:** `988ccd358247` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T10:04:32-05:00
**Tags:** quoting-synergy-ms0, u-qp-part-phone-guard, auto-distilled

## Subject
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-PART-PHONE-GUARD (slot:charlie): reject phone numbers as part codes [MAIN-FORCE]

## Body
```
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-PART-PHONE-GUARD (slot:charlie): reject phone numbers as part codes [MAIN-FORCE]

Found by running the FULL Orders-Closed corpus (R12 -- scale reveals what samples hide):
the inline NNN-XXXX part shape matched letterhead PHONE numbers (815-397-8848), polluting
the join keys of 6,718 real actuals. RE_PART_INLINE now requires a LETTER in the code
(phones are all-digit NNN-NNN-NNNN) -> parts are now real (340-HWHPLG, RM124-00.). +1 test
(phone rejected, NNN-XXXX-with-letter kept). 28/28.

FULL-CORPUS RUN RESULT (the operator's 'run all documents through it', actual-price side):
all 12,761 JMD Orders Closed -> 12,593 text-extracted (98.7%) -> 6,718 standalone actuals
= $355,028,170.89 of real settled-price ground truth (53% yield, 98% high-confidence).
Output: state/shared/quoting/orders-closed-actuals.jsonl. Heap: needs --max-old-space-size
=16384 (merge OOMs at default; durable orchestrator heap-guard queued). Reporting note:
orchestrator 'pairs extracted: 73907' counts pretty-print JSON lines not records (real
pairs=0 since Orders-Closed has no quote side; the value is the 6,718 standalone actuals).
```

## Files touched (3)
- scripts/lib/docustrata-outcome-extract-lib.mjs      | 6 ++++--
- scripts/lib/docustrata-outcome-extract-lib.test.mjs | 6 ++++++
- 2 files changed, 10 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 988ccd358247`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._