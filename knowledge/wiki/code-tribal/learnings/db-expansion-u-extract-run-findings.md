# DB-EXPANSION/U-EXTRACT-RUN-FINDINGS — [MAIN] [DB-EXPANSION]/U-EXTRACT-RUN-FINDINGS: truthful --status (byCategory) + honest catalog-extraction gap

**Commit:** `eeeef9e672df` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T20:00:00-05:00
**Tags:** db-expansion, u-extract-run-findings, auto-distilled

## Subject
[MAIN] [DB-EXPANSION]/U-EXTRACT-RUN-FINDINGS: truthful --status (byCategory) + honest catalog-extraction gap

## Body
```
[MAIN] [DB-EXPANSION]/U-EXTRACT-RUN-FINDINGS: truthful --status (byCategory) + honest catalog-extraction gap

db-toolbelt.mjs --status was a silent misreport: printed prism-reference-db {} while store holds 13920 records (summarizer ignored the byCategory manifest shape). Fixed -> total=13920 + category breakdown. jm-die/vendor-catalog unaffected.

First real extraction run over the 242-PDF MANUFACTURER_CATALOGS corpus (logged in masterplan EXECUTION FINDINGS): BUILT extract-generic-catalog.py mis-parses geometry (Korloy 1/32in -> 5mm wrong columns), yields 0 on speeds-feeds grids, crashes on garr/harvey -> output REFUSED + deleted (never poison a cutting DB with mis-parsed data, R12). camelot-extract.py cleanly pulls SF grid tables but they are not yet mapped to MATH_SCIENCE_SCHEMA. Real PHASE-2 keystone = net-new camelot-tables->schema classifier+normalizer with reference-value validation BEFORE persist. 242 PDFs remain un-ingested-by-design, loud-flagged not silently half-filled.
```

## Files touched (3)
- scripts/db-toolbelt.mjs                                      | 17 ++++++++++++++---
- state/shared/specs/DATA-EXTRACTION-UTILIZATION-MASTERPLAN.md | 12 ++++++++++++
- 2 files changed, 26 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- wrong columns), yields 0 on speeds-feeds grids, crashes on garr/harvey -> output REFUSED + deleted (never poison a cutting DB with mis-parsed data, R12). camelot-extract.py cleanly pulls SF grid tables but they are not yet mapped to MATH_SCIENCE_SCHEMA. Real PHASE-2 keystone = net-new camelot-tables->schema classifier+normalizer with reference-value validation BEFORE persist. 242 PDFs remain un-ingeste

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show eeeef9e672df`
- Milestone envelope: `mcp-server/data/milestones/DB-EXPANSION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._