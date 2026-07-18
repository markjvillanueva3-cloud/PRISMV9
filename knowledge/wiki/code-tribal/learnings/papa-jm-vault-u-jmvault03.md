# PAPA-JM-VAULT/U-JMVAULT03 — [MAIN] [PAPA-JM-VAULT]/U-JMVAULT03 (slot:papa): + business/order-flow dimension + shared backend reader (R15 fleet-consumable)

**Commit:** `4f68d017c90b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T13:41:10-05:00
**Tags:** papa-jm-vault, u-jmvault03, auto-distilled

## Subject
[MAIN] [PAPA-JM-VAULT]/U-JMVAULT03 (slot:papa): + business/order-flow dimension + shared backend reader (R15 fleet-consumable)

## Body
```
[MAIN] [PAPA-JM-VAULT]/U-JMVAULT03 (slot:papa): + business/order-flow dimension + shared backend reader (R15 fleet-consumable)

DEEPER DISTILLATION -- the shop-profile now learns BOTH dimensions of how JM runs:
  - MANUFACTURING (files.jsonl): machine util + work-kind + customer x machine (existing)
  - BUSINESS/ORDER-FLOW (documents.jsonl, NEW): aggregateDocuments() distills 111,745
    business docs spanning 2014-04-15 -> 2026-02-23 by role -- SALES_ORDER 19.3%,
    CLOSED_ORDER 11.4%, PRINT 6.8%, QUOTE 0.9%, PACKING_SLIP... The real 12-year order
    pipeline. Folded into shop-profile.json (schema 1.0.0 -> 1.1.0, additive .business
    block) + the vault note. Fail-soft: documents.jsonl optional, profile builds without it.

R15 FLEET-CONSUMABILITY -- scripts/lib/jm-shop-profile-reader.mjs: shared backend reader
(loadShopProfile / rankedMachineCategories / topMachineCategory / workKindMix /
businessOrderMix / machineUsageWeight). The BACKEND equivalent of the frontend's
shopUsageOrder.ts -- any engine/script/dispatcher queries the distilled shop knowledge
without re-parsing the 38K-file corpus. Pure, fail-soft (missing/corrupt -> null, never
throws). NOT a dup of ShopProfileTemplateEngine (that is the quoting pricing/rate profile).

Tests: bridge 9/9 (+4: aggregateDocuments fixture/missing, business fold/omit), reader 4/4.
```

## Files touched (8)
- knowledge/memories/reference/reference_jm_shop_function_profile.md | 21 +++++++++++++++
- mcp-server/web/public/jm-shop-profile.json                         | 86 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/jm-shop-knowledge-to-vault.mjs                             | 68 ++++++++++++++++++++++++++++++++++++++++++------
- scripts/jm-shop-knowledge-to-vault.test.mjs                        | 48 +++++++++++++++++++++++++++++++++-
- scripts/lib/jm-shop-profile-reader.mjs                             | 90 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/jm-shop-profile-reader.test.mjs                        | 72 +++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/jm-shop-profile.json                                  | 86 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- 7 files changed, 456 insertions(+), 15 deletions(-)

## Lessons surfaced in commit body
- TILLATION -- the shop-profile now learns BOTH dimensions of how JM runs:
- til + work-kind + customer x machine (existing)
- tills 111,745
- tilled shop knowledge

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4f68d017c90b`
- Milestone envelope: `mcp-server/data/milestones/PAPA-JM-VAULT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._