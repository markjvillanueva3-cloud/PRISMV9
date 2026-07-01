# ECHO-MS-PRINT-PROGRAM-LOOP/U-PPL-D5-BRIDGE — [MAIN] [ECHO-MS-PRINT-PROGRAM-LOOP]/U-PPL-D5-BRIDGE: wire McxProgramParser into ProgramEquivalentIndex as third 'mill-gcode' kind

**Commit:** `601b9547b09f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T14:27:22-05:00
**Tags:** echo-ms-print-program-loop, u-ppl-d5-bridge, auto-distilled

## Subject
[MAIN] [ECHO-MS-PRINT-PROGRAM-LOOP]/U-PPL-D5-BRIDGE: wire McxProgramParser into ProgramEquivalentIndex as third 'mill-gcode' kind

## Body
```
[MAIN] [ECHO-MS-PRINT-PROGRAM-LOOP]/U-PPL-D5-BRIDGE: wire McxProgramParser into ProgramEquivalentIndex as third 'mill-gcode' kind

D5-honest-scoping (slot echo, claude-2081f435, /loop iter 5) found McxProgramParserEngine + McxBatchExtractorEngine already shipped under LATHE-PROD-READY-MS0/U-LPR26+U-LPR28. The real remaining D5 value is a BRIDGE, not a fresh parser. This commit:

- Extends ProgramEquivalentKind union: cad-as-program | lathe-gcode | mill-gcode
- Adds buildMillProgramEntries via mcxEntryToProgramEquivalent helper (pure transform; ok-status rows with resolvable JM-Die PN become mill-gcode entries; everything else aggregated as skipped_non_ok or skipped_no_pn)
- Adds mcx_source aggregation (totalEntries, recognized, skipped_non_ok, skipped_no_pn, byFormat, byMagicVerified)
- Adds mcxProgramEntries field to ComposeOptions, fixes limit-cap default to span lathe+mill streams
- Moves linked-count loop AFTER mcx iteration so mill print_refs are aggregated
- prism_cad:program_equivalent_index_compose schema accepts mcx_entries[]; dispatcher case handler reads and passes through
- 10 new tests covering: mill-only mode, 3-way CAD+lathe+mill compose, status filtering (parse_failed/io_error/skipped_existing/skipped_oversize -> skipped_non_ok), ok-but-no-PN -> skipped_no_pn, byFormat aggregation, magicVerified partitioning, unknown-format handling, print_ref DI enrichment, fail-loud on non-array mcxProgramEntries, CAD+lathe-only backward compat -- 31/31 PASS (21 existing D4 + 10 new D5 bridge)

Unlocks: MILL_AI_TRAINING_REPORT, mill back-annotation, mill archive re-opt, mill family fingerprinting. Composes existing engines via imports; never forks UniversalCADIndexEngine / CADFileIndexerEngine / McxProgramParserEngine / McxBatchExtractorEngine / ProgramPrintLinkIndexEngine.

Track D 4/5 -> 5/5. MS-PRINT-PROGRAM-LOOP completed_units 4 -> 5 (of 23).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../__tests__/ProgramEquivalentIndexEngine.test.ts | 246 +++++++++++++++++++++
- .../src/engines/ProgramEquivalentIndexEngine.ts    | 168 +++++++++++++-
- 2 files changed, 411 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 601b9547b09f`
- Milestone envelope: `mcp-server/data/milestones/ECHO-MS-PRINT-PROGRAM-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._