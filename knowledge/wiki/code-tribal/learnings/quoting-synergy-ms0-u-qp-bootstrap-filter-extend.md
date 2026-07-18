# QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-FILTER-EXTEND — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-FILTER-EXTEND (slot:charlie /goal-yolo iter9): extend NON_CUSTOMER_SUBDIRS regex + import-safe CLI guard + 14-case unit test.

**Commit:** `5b370300f01c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T02:04:45-05:00
**Tags:** quoting-synergy-ms0, u-qp-bootstrap-filter-extend, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-FILTER-EXTEND (slot:charlie /goal-yolo iter9): extend NON_CUSTOMER_SUBDIRS regex + import-safe CLI guard + 14-case unit test.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-FILTER-EXTEND (slot:charlie /goal-yolo iter9): extend NON_CUSTOMER_SUBDIRS regex + import-safe CLI guard + 14-case unit test.

iter8 --scan-archive surfaced remaining noise leaking through customer extraction:
"POST PROCESSORS", "_PART LIBRARY", and similar shop-template/library subdirs were
still being treated as customer names. iter9 closes the gap:

1. Extended regex catches POST[s_-]?PROCESSORS?, POSTS?, PART[s_-]?LIBRAR(Y|IES),
   LIBRAR(Y|IES), MACROS?, TEMPLATES?, MASTERS?, SETUPS?, SAMPLES?, EXAMPLES?,
   REFERENCE(S?), DOCS?, DOCUMENTATION, MANUALS?, TUTORIALS?, TRAININGS?, MISC,
   MISCELLANEOUS plus optional leading underscore (^_?) for _PART LIBRARY shape.

2. main() now guarded by import.meta.url === pathToFileURL(argv[1]).href so the
   test file can import {isLikelyCustomer, extractCustomer} without triggering
   the 100-record archive walk. Exposed by iter9 test run (9.5s -> 121ms).

3. New test file scripts/quoting-baseline-bootstrap.filter.test.mjs - 14/14 PASS.
   Coverage: 40+ iter9 reject cases, 24 legacy anti-regression rejects, 13 real
   customer positives, edge/boundary/adversarial inputs, BOTH JM path layouts
   (machine-then-customer + customer-then-machine), case-insensitive variants,
   Windows backslash paths, plus the load-bearing scenario "POST PROCESSORS
   layered AHEAD of real customer must still resolve to the real customer".

Tested via node --test. Bootstrap chain continues to ship size-byte stub
actual_revenue_usd; the real Docustrata invoice-extractor bridge is the next
high-leverage unit (FIRST-TRAINING-CYCLE-EVIDENCE.md item #1).
```

## Files touched (3)
- scripts/quoting-baseline-bootstrap.filter.test.mjs | 213 +++++++++++++++++++++
- scripts/quoting-baseline-bootstrap.mjs             |  28 ++-
- 2 files changed, 233 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till being treated as customer names. iter9 closes the gap:
- till resolve to the real customer".

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5b370300f01c`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._