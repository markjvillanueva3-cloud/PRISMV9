# QUOTE-TO-SHIP-TRAINING/U-JM-CUSTOMER-SEED-DOCUSTRATA-ACTIVE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTE-TO-SHIP-TRAINING]/U-JM-CUSTOMER-SEED-DOCUSTRATA-ACTIVE (slot:hotel): transacted customers are active even if scan-only

**Commit:** `6b43fa1892a1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T10:24:44-05:00
**Tags:** quote-to-ship-training, u-jm-customer-seed-docustrata-active, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTE-TO-SHIP-TRAINING]/U-JM-CUSTOMER-SEED-DOCUSTRATA-ACTIVE (slot:hotel): transacted customers are active even if scan-only

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTE-TO-SHIP-TRAINING]/U-JM-CUSTOMER-SEED-DOCUSTRATA-ACTIVE (slot:hotel): transacted customers are active even if scan-only

Refines seedFromJMCorpus active/prospect: status=active when machiningFiles>0 OR
has_docustrata_record (a customer with a DocuStrata quote/invoice has transacted and is real even
if the corpus holds only scans for them). Uses the has_docustrata_record signal that was parsed but
previously unused (reviewer P2 from U-JM-CUSTOMER-CORPUS-SEED). +1 test (scan-only+txn=active,
scan-only+no-txn=prospect); 9/9 pass. Real corpus: active 139->142, prospect 331->328 (3 scan-only
customers had transaction records). No fabrication; pure real-signal reclassification.
```

## Files touched (3)
- mcp-server/src/__tests__/CustomerManagementEngine.jm-corpus-seed.test.ts | 12 ++++++++++++
- mcp-server/src/engines/CustomerManagementEngine.ts                       |  5 ++++-
- 2 files changed, 16 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6b43fa1892a1`
- Milestone envelope: `mcp-server/data/milestones/QUOTE-TO-SHIP-TRAINING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._