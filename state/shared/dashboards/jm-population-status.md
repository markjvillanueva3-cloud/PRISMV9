# JM-Population Status — JM-DOC-POPULATION-MS0

> Read-only awareness surface (U-JMDOC-SYNERGY-STATUS, slot:hotel). Regenerate via
> `node scripts/jm-population-status.mjs`. Source of truth: the campaign ledger + bridge registry.

**Generated:** 2026-06-03T05:01:47.485Z

## Coverage headline

- **67.034%** of JM documents are surfaced through a SHIPPED seed bridge
  (**372,036** of **554,999** documents).
- Accountability gate integrity: **GREEN ✅** (ledger invariants hold).
- Tracked tuples: **21 shipped**, **2 deferred**, **6 pending**.
- JM customers in corpus: **474** distinct (147,791 docs CRM-linked).
- Financial-guarded documents (link/pointer-only, NO discrete ERP records): **34,452**.

## Documents by disposition

| Disposition | Documents | Share |
|-------------|-----------|-------|
| consumed | 179,201 | 32.289% |
| indexed-only | 144,973 | 26.121% |
| metadata | 142,622 | 25.698% |
| viewer-only | 85,345 | 15.378% |
| unrouted-misc | 2,858 | 0.515% |
| malformed-line | 0 | 0% |

## Shipped vs pending tuples

- **Shipped:** 21 tuple(s), 372,036 documents (67.034% of total).
- **Deferred:** 2 tuple(s), 1,036 documents (explicit, owned elsewhere).
- **Pending:** 6 tuple(s), 179,202 documents (planned, not yet bridged).

### Pending punch list (build these to raise coverage)

| Tuple (source/bucket) | Documents | Unit | Owner |
|-----------------------|-----------|------|-------|
| jm_die_category/program | 140,215 | U-JMDOC03 | coord:echo+kilo |
| part_library/program | 25,976 | U-JMDOC03 | coord:echo+kilo |
| jm_die_category/cad | 7,285 | U-JMDOC04 | coord:delta |
| part_library/cad | 5,709 | U-JMDOC04 | coord:delta |
| jm_die_category/setup | 16 | U-JMDOC06 | coord:foxtrot |
| docustrata_manifest/packing_slip | 1 | U-JMDOC09 | coord:charlie |

---
_Schema 1.0.0. Inputs: jm-document-ledger-summary.json · jm-doc-bridge-registry.json · jm-corpus-summary.json._
