# MIT-COURSE-INTEGRATION/U-CAD-CAM-TRIBAL-WIKI — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MIT-COURSE-INTEGRATION]/U-CAD-CAM-TRIBAL-WIKI (slot:india iter24): per-resource tribal + wiki extract for delta+kilo training

**Commit:** `22562163273a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T22:59:50-05:00
**Tags:** mit-course-integration, u-cad-cam-tribal-wiki, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MIT-COURSE-INTEGRATION]/U-CAD-CAM-TRIBAL-WIKI (slot:india iter24): per-resource tribal + wiki extract for delta+kilo training

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MIT-COURSE-INTEGRATION]/U-CAD-CAM-TRIBAL-WIKI (slot:india iter24): per-resource tribal + wiki extract for delta+kilo training

iter23 was the routing layer (consolidator + JSON + handoff broadcast). iter24 is the concrete training-corpus layer: per-resource tribal jsonl + operator wiki indexes that delta/kilo directly ingest.

scripts/extract-cadcam-tribal-wiki.mjs (16/16 tests PASS):
- Reads state/shared/cadcam-consolidated-corpus.json (iter23)
- Per CAD entry (21) and CAM entry (598) emits tribal jsonl: {ts, domain, slug, kind, source, tip, consume:{spec_md, source_file, bridge_engines, enriches_engines, bridge_dispatchers}, audience, advisory:true, must_human_verify:true}
- Imports bridge map from generate-pdf-course-bridge-features.mjs (iter22 single source of truth)
- Audience routing: cad->delta, cam->kilo; dual-classified to BOTH
- Wiki index render: grouped by kind, names bridge engines/dispatchers, ingest snippet, 50-entry truncation

Outputs:
- state/shared/cad-tribal-corpus.jsonl (21 entries, audience=delta) [gitignored — regen via script]
- state/shared/cam-tribal-corpus.jsonl (598 entries, audience=kilo) [gitignored — regen via script]
- knowledge/wiki/training/cad-corpus-index.md (operator view for delta)
- knowledge/wiki/training/cam-corpus-index.md (operator view for kilo)

Consumer protocol: read wiki index -> pick priority kinds -> for each entry read consume.spec_md (AUTOGEN-SPEC) -> ingest consume.source_file -> wire training output into consume.bridge_engines + consume.enriches_engines.

BOOTSTRAP-SLOT-ENFORCE: india on shared tree pending /checkin-india §2c cutover.

Closes operator goal_clear "extract all data and handoff to delta to use to train cad and Kilo for training cam".
```

## Files touched (5)
- knowledge/wiki/training/cad-corpus-index.md |  75 ++++++++
- knowledge/wiki/training/cam-corpus-index.md | 283 ++++++++++++++++++++++++++++
- scripts/extract-cadcam-tribal-wiki.mjs      | 190 +++++++++++++++++++
- scripts/extract-cadcam-tribal-wiki.test.mjs | 158 ++++++++++++++++
- 4 files changed, 706 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 22562163273a`
- Milestone envelope: `mcp-server/data/milestones/MIT-COURSE-INTEGRATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._