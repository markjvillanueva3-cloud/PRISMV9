# DOMAIN-KNOWLEDGE/U-PAPA-TRIBAL-CURSOR-DOMAINSET — [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-CURSOR-DOMAINSET (slot:papa): domain-set-keyed resume cursor (closes arm-A P2 silent-label-drop)

**Commit:** `88193cc8188d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T23:12:21-05:00
**Tags:** domain-knowledge, u-papa-tribal-cursor-domainset, auto-distilled

## Subject
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-CURSOR-DOMAINSET (slot:papa): domain-set-keyed resume cursor (closes arm-A P2 silent-label-drop)

## Body
```
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-CURSOR-DOMAINSET (slot:papa): domain-set-keyed resume cursor (closes arm-A P2 silent-label-drop)

The 3-of-3 arm-A flagged a reachable silent-data-loss in the documented --domains all
widening: the reused resume cursor is keyed on slug ALONE, but a slug carries different
domains across corpora (a CIMCO post PDF is in BOTH cam and post-processor). Running
--domains all APPENDED onto the cad/cam run's cursor would skip every already-cursored
slug -> 364 genuinely-new (slug,domain) labels silently dropped. Fix: cursorPathFor(outPath,
domainsArg) keys the cursor by the sorted domain-set, so each distinct --domains invocation
resumes independently -- a fresh --domains all run gets its own empty cursor, truncates, and
rebuilds the COMPLETE dataset (cad/cam included), no silent loss. Default + explicit cad,cam
share one cursor (same set). +1 R9 test (17/17). Hardens U-PAPA-TRIBAL-CORPUS-LORA per R16.
```

## Files touched (3)
- scripts/tribal-corpus-to-lora-dataset.mjs      | 15 ++++++++++++++-
- scripts/tribal-corpus-to-lora-dataset.test.mjs | 16 +++++++++++++++-
- 2 files changed, 29 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 88193cc8188d`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-KNOWLEDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._