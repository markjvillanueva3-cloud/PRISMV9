# DB-COVERAGE-GAPFILL-MS0/U-ROMEO-JSONL-DB-LOADER-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DB-COVERAGE-GAPFILL-MS0]/U-ROMEO-JSONL-DB-LOADER-FIX (slot:romeo): DatabaseRegistry silently dropped every .jsonl DB (JSON.parse on JSONL)

**Commit:** `17e30fecff36` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T11:18:09-05:00
**Tags:** db-coverage-gapfill-ms0, u-romeo-jsonl-db-loader-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DB-COVERAGE-GAPFILL-MS0]/U-ROMEO-JSONL-DB-LOADER-FIX (slot:romeo): DatabaseRegistry silently dropped every .jsonl DB (JSON.parse on JSONL)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DB-COVERAGE-GAPFILL-MS0]/U-ROMEO-JSONL-DB-LOADER-FIX (slot:romeo): DatabaseRegistry silently dropped every .jsonl DB (JSON.parse on JSONL)

REGRESSION (R12, silent data loss): DatabaseRegistry.loadDatabases JSON.parse'd EVERY file-backed DB
incl .jsonl -> threw 'Unexpected non-whitespace character after JSON at position 244 (line 2)' -> the
20,736-entry jm-vendor-ap-ledger.jsonl loaded as status:error fleet-wide (every session). Surfaced by a
new DB-served-live proof test. fix: detect .jsonl -> parse line-by-line, load good rows, fail-loud on
skip count (1 bad line no longer drops the whole DB). +6 round-trip tests through prism_data proving
all 4 DBs (machine/tool/insert/holder) serve real records live + the ledger now registers status:loaded.
2 files staged.
```

## Files touched (3)
- mcp-server/src/__tests__/dataDispatcher.db-served-live.test.ts | 122 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/registries/DatabaseRegistry.ts                  |  20 ++++++++++++++++++-
- 2 files changed, 141 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 17e30fecff36`
- Milestone envelope: `mcp-server/data/milestones/DB-COVERAGE-GAPFILL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._