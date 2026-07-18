# WIRE-UNWIRED-MS0/U-WIRE-RI — wire ResourceIndexEngine into prism_dev (6 actions)

**Commit:** `a750451126ed` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T06:25:59-05:00
**Tags:** wire-unwired-ms0, u-wire-ri, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-RI: wire ResourceIndexEngine into prism_dev (6 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-RI: wire ResourceIndexEngine into prism_dev (6 actions)

H: drive resource discovery (PDFs, MIT courses, manufacturer catalogs,
machine models, post processors, JM DIE programs). Read methods only;
markExtracted() DEFERRED — mutates shared extraction-status registry
that other resource-extraction pipelines consume.

- ri_get_index: {force_refresh} → ResourceIndex (5-min cached fs scan)
- ri_get_unextracted_folders: {priority_filter} → ResourceFolder[]
- ri_search: {query, type_filter} → ResourceEntry[]
- ri_get_extraction_summary: human-readable progress digest
- ri_get_jm_die_folders: customer folders with program counts
- ri_get_jm_die_program_sample: {machine_type, count≤500} → file samples

Wire-safety doctrine:
- All 6 methods pure (fs reads + cache lookups, no mutation)
- force_refresh defaults false → respects 5-min cache TTL across peer calls
- DoS guards: query ≤256 chars, machine_type ≤64 chars, sample count ≤500
- ResourceType + priority filters gated to engine enums
- Engine throws on unknown machine_type → dispatcher catches + emits error
- count / folder_count / total_files / length survivors alongside arrays

Tests: 21/21 PASS (5 schema gates incl. DoS + enum + happy paths
returning real H: drive shape + VARIABILITY across 3 priority filters
asserting subset invariant + ROUTING PROOFs (unextracted_count parity,
extraction_summary string equality, jm_die_folders name set equality) +
unknown machine_type → error envelope + count parity on samples +
3 schema-reject envelope checks).

Note: test suite runs ~10s (vs typical ~600ms) because dispatcher reads
issue real H: drive fs scans on every call. force_refresh + parity tests
are the expensive ones; in production, the 5-min cache amortizes this.
```

## Files touched (4)
- .../src/__tests__/dispatcher.resourceIndex.test.ts | 231 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  37 ++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  53 ++++-
- 3 files changed, 320 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- Note: test suite runs ~10s (vs typical ~600ms) because dispatcher reads

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a750451126ed`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._