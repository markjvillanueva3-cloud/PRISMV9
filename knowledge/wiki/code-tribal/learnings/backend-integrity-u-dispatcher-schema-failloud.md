# BACKEND-INTEGRITY/U-DISPATCHER-SCHEMA-FAILLOUD — [MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [BACKEND-INTEGRITY]/U-DISPATCHER-SCHEMA-FAILLOUD (slot:bravo): make the no-schema pass-through MEASURABLE (P1 from the dispatcher assessment)

**Commit:** `49d617581e4f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:15:50-05:00
**Tags:** backend-integrity, u-dispatcher-schema-failloud, auto-distilled

## Subject
[MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [BACKEND-INTEGRITY]/U-DISPATCHER-SCHEMA-FAILLOUD (slot:bravo): make the no-schema pass-through MEASURABLE (P1 from the dispatcher assessment)

## Body
```
[MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [BACKEND-INTEGRITY]/U-DISPATCHER-SCHEMA-FAILLOUD (slot:bravo): make the no-schema pass-through MEASURABLE (P1 from the dispatcher assessment)

validateActionParams(dispatcherMiddleware.ts:82) silently returned valid:true for any
action with NO registered schema -> unvalidated params (incl safety-relevant calc/cam)
reached engines with ZERO signal. Fix is ADDITIVE + NON-blocking (throwing would
mass-break the ~40% of schema-less actions): the no-schema branch now sets a
schemaMissing:true flag + increments runtime coverage counters; new exports
getSchemaCoverageStats() (validated vs passthrough call counts + distinct missing
actions, deduped+sorted) and resetSchemaCoverageStats(). Once-per-action warn gated by
PRISM_DISPATCHER_SCHEMA_WARN=1 (never per-call spam). Turns the SILENT gap into a
MEASURABLE one fleet-wide. Purely additive: all 95 importers unaffected (read
valid/success/data, unchanged); tsc green; 6/6 behavioral tests (flag, validated-vs-
passthrough counts, per-action dedup, real per-field error paths, back-compat, reset).
FOLLOW-UP: wire getSchemaCoverageStats to a prism_dev action; let safety-critical
dispatchers branch fail-closed on schemaMissing. Assessment: state/shared/specs/DISPATCHER-CAPABILITY-ASSESSMENT-2026-06-22.md.
```

## Files touched (3)
- mcp-server/src/__tests__/dispatcherMiddleware-schema-coverage.test.ts | 89 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/utils/dispatcherMiddleware.ts                          | 54 +++++++++++++++++++++++++++++++++++--
- 2 files changed, 141 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 49d617581e4f`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-INTEGRITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._