# MACHINING-TRIBAL-COVERAGE/U-MTC10 — [MAIN] [MACHINING-TRIBAL-COVERAGE]/U-MTC10: coolant & chip-evacuation canonical — flood/MQL/TSC/air by-material, recutting diagnosis, pecking, coolant-aim, toolpath↔evac coupling

**Commit:** `ea0f4546cc59` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T18:38:08-05:00
**Tags:** machining-tribal-coverage, u-mtc10, auto-distilled

## Subject
[MAIN] [MACHINING-TRIBAL-COVERAGE]/U-MTC10: coolant & chip-evacuation canonical — flood/MQL/TSC/air by-material, recutting diagnosis, pecking, coolant-aim, toolpath↔evac coupling

## Body
```
[MAIN] [MACHINING-TRIBAL-COVERAGE]/U-MTC10: coolant & chip-evacuation canonical — flood/MQL/TSC/air by-material, recutting diagnosis, pecking, coolant-aim, toolpath↔evac coupling

Final unit of golf's FLEET-PENDING-EXTRACT-2026-05-18 bravo redistribution
(MTC07-MTC10 — all 4 shipped this session).

Scope honesty (R12): the audit's 5-bucket taxonomy (operation-ordering,
workholding, part-setup, machining-tactics, tooling-selection) is now
fully covered — U-MTC05/06 (prior) + U-MTC07/08/09 (this session). MTC10's
"next-weakest" target is therefore NOT a 6th audit bucket; it targets the
real frontier — the 63.8% UNCATEGORIZED tip mass — with a high-value
canonical the keyword-bucketed audit lumps into "uncategorized" but which
is a top-tier shop know-how gap: coolant & chip-evacuation strategy.
Tagged category=machining-tactics (closest audit bucket) so the existing
pickup hooks surface it; it complements the operation-ordering /
workholding / setup trio rather than duplicating any.

Content (PhD-level, field-grounded, ~120 lines):
- Coolant method selection table (flood/TSC/MQL/air/HP-jet/dry) by
  operation + material, with by-material unknown-job defaults
- Recutting as the silent tool-killer — diagnose FIRST (5 symptom
  signatures + 3-tier fix order: get-chip-out → smaller-chip → no-nest)
- Pecking & deep-hole strategy table by hole depth (<3×D … >10×D;
  G73 vs G83 semantics; shallow-first-peck; feed-decay-with-depth)
- Coolant aim — the free fix (at the shear zone not the general area;
  two-nozzle deep pockets; TSC filtration discipline)
- Toolpath↔chip-evac coupling (climb for ejection; pocket out-to-in;
  helical entry never plunge; no full-slot in gummy; air-broom on MQL)
- 8-row symptom→root-cause failure table + 5-line shop check

Single-file ideablock-v1, no audit-script change (so no multi-file
scrutiny gate); index-lag identical to U-MTC05-09. Frontmatter verified.

MACHINING-TRIBAL-COVERAGE-MS0: MTC01-09 shipped → MTC10 shipped. Golf's
bravo redistribution batch (MTC07-10) COMPLETE.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- ...cuation-strategy-flood-mql-tap-air-recutting.md | 108 +++++++++++++++++++++
- 1 file changed, 108 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ea0f4546cc59`
- Milestone envelope: `mcp-server/data/milestones/MACHINING-TRIBAL-COVERAGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._