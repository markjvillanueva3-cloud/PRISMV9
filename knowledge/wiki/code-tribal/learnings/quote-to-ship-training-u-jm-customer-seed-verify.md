# QUOTE-TO-SHIP-TRAINING/U-JM-CUSTOMER-SEED-VERIFY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTE-TO-SHIP-TRAINING]/U-JM-CUSTOMER-SEED-VERIFY (slot:hotel): real-corpus verification of the customer seed-bridge

**Commit:** `16b16e98e32e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T10:16:17-05:00
**Tags:** quote-to-ship-training, u-jm-customer-seed-verify, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTE-TO-SHIP-TRAINING]/U-JM-CUSTOMER-SEED-VERIFY (slot:hotel): real-corpus verification of the customer seed-bridge

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTE-TO-SHIP-TRAINING]/U-JM-CUSTOMER-SEED-VERIFY (slot:hotel): real-corpus verification of the customer seed-bridge

Closes the live-E2E gap from U-JM-CUSTOMER-CORPUS-SEED (MCP was down during build, so the dispatcher
round-trip used 3 samples). scripts/verify-jm-customer-corpus-seed.ts runs the ACTUAL
CustomerManagementEngine.seedFromJMCorpus against the full real corpus (jm-customers.jsonl) and
asserts accounting + active/prospect split + real idempotency. Exit 0/1, advisory, mutates nothing.

VERIFIED: 473 parsed -> 470 seeded (3 pre-existed via persistence rehydrate, correctly deduped),
139 active / 331 prospect, re-seed adds 0 (idempotent). Finding: only 139/473 JM customers have
machining files; 331 are scan/doc-only — useful CRM segmentation signal.
```

## Files touched (2)
- scripts/verify-jm-customer-corpus-seed.ts | 65 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 65 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 16b16e98e32e`
- Milestone envelope: `mcp-server/data/milestones/QUOTE-TO-SHIP-TRAINING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._