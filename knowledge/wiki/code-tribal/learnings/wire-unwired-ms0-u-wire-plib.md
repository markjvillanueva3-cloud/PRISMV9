# WIRE-UNWIRED-MS0/U-WIRE-PLIB — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PLIB: wire PrintLibraryEngine into prism_dev (9 read-only actions)

**Commit:** `23318c7f849f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T09:53:13-05:00
**Tags:** wire-unwired-ms0, u-wire-plib, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PLIB: wire PrintLibraryEngine into prism_dev (9 read-only actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PLIB: wire PrintLibraryEngine into prism_dev (9 read-only actions)

Wires the in-memory print/drawing library — title-block extraction +
revision tracking + customer/material/format indexing + multi-field
search. 9 read-only actions through prism_dev. Engine-pair test
pre-existed; this commit ships the dispatcher round-trip suite.

9 read-only actions:
  plib_get                  — get(printId) → record|null
  plib_find_by_part         — findByPartNumber(partNumber)
  plib_get_revision_history — getRevisionHistory(partNumber)
  plib_search               — search(criteria) — multi-field, ACTIVE-default
  plib_get_by_part_id       — getByPartId(partId)
  plib_get_by_customer      — getByCustomer(customer) — ACTIVE-only
  plib_list_customers       — listCustomers() — distinct + counts
  plib_get_stats            — getStats() — totals + breakdowns
  plib_list                 — list(status?) — optional status filter

DEFER (3 write methods, class=path-traversal + state-mutation):
  ingest    — file_path stored verbatim, caller can poison via '../'
  linkToPart — mutates print.part_id (and persists via bridge)
  update    — partial mutation of whitelisted fields

Wire-level invariants:
  - found / has_history discriminators for null-returning paths
    (get returns null on miss; getRevisionHistory returns null when
    no prints for part)
  - is_empty discriminator on getStats() (helps LLM differentiate
    'no data yet' from 'data with zero totals')
  - All schemas strict on no-arg endpoints (extra params rejected)
  - DoS caps: query ≤ 256 chars, limit ≤ 1000

Tests: 30/30 PASS dispatcher round-trip + engine-direct seeding in
       beforeAll (mirrors SSL pattern — singleton state survives
       across tests in same vitest worker).

8th read-source-first catch this session: engine search() defaults to
status='active' filter (line 330), getByCustomer() filters to
status='active' (line 416). Initial test fixtures asserted total
counts; corrected to assert active-only after auto-supersession when
ingesting PART-A revB.

WIRE-UNWIRED-MS0 progress: 24->25 wires this session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../src/__tests__/dispatcher.printLibrary.test.ts  | 359 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  55 ++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  98 +++++-
- 3 files changed, 511 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 23318c7f849f`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._