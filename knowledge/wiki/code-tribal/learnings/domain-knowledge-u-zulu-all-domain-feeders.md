# DOMAIN-KNOWLEDGE/U-ZULU-ALL-DOMAIN-FEEDERS — [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-ZULU-ALL-DOMAIN-FEEDERS (slot:zulu): R15 apply-to-all -- generalize the CAD/CAM GIGO-safe knowledge feeder to ALL manufacturing domains. build-domain-knowledge-feeders.mjs multi-label keyword-classifies the 1210 resource specs -> per-domain GIGO-safe feeders (live run: tooling 312/mill 39/cam 19/lathe 12/cad 12/post-proc 6/speed-feed 4; 80 dead-source dropped per R9; 769 keyword-unclassified -> cadcam-reclassify-ollama content pass refines). Feeders regenerate to state/shared/domain-knowledge/ (gitignored data). 8/8 real tests. Honest finding: resources/ is tooling/mill/cam-heavy; wedm/quality/etc knowledge lives in their own corpora (same as CAD->JM-drawings).

**Commit:** `a95356c00341` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T14:54:51-05:00
**Tags:** domain-knowledge, u-zulu-all-domain-feeders, auto-distilled

## Subject
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-ZULU-ALL-DOMAIN-FEEDERS (slot:zulu): R15 apply-to-all -- generalize the CAD/CAM GIGO-safe knowledge feeder to ALL manufacturing domains. build-domain-knowledge-feeders.mjs multi-label keyword-classifies the 1210 resource specs -> per-domain GIGO-safe feeders (live run: tooling 312/mill 39/cam 19/lathe 12/cad 12/post-proc 6/speed-feed 4; 80 dead-source dropped per R9; 769 keyword-unclassified -> cadcam-reclassify-ollama content pass refines). Feeders regenerate to state/shared/domain-knowledge/ (gitignored data). 8/8 real tests. Honest finding: resources/ is tooling/mill/cam-heavy; wedm/quality/etc knowledge lives in their own corpora (same as CAD->JM-drawings).

## Body
```
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-ZULU-ALL-DOMAIN-FEEDERS (slot:zulu): R15 apply-to-all -- generalize the CAD/CAM GIGO-safe knowledge feeder to ALL manufacturing domains. build-domain-knowledge-feeders.mjs multi-label keyword-classifies the 1210 resource specs -> per-domain GIGO-safe feeders (live run: tooling 312/mill 39/cam 19/lathe 12/cad 12/post-proc 6/speed-feed 4; 80 dead-source dropped per R9; 769 keyword-unclassified -> cadcam-reclassify-ollama content pass refines). Feeders regenerate to state/shared/domain-knowledge/ (gitignored data). 8/8 real tests. Honest finding: resources/ is tooling/mill/cam-heavy; wedm/quality/etc knowledge lives in their own corpora (same as CAD->JM-drawings).
```

## Files touched (3)
- scripts/build-domain-knowledge-feeders.mjs      | 118 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-domain-knowledge-feeders.test.mjs |  70 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 188 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a95356c00341`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-KNOWLEDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._