# POST-PDF-NODE-MS0/U-MILL-POST-PARITY-MATRIX — [MAIN] [POST-PDF-NODE-MS0]/U-MILL-POST-PARITY-MATRIX (slot:echo iter7): 9-feature Hurco V11 → 14-dialect mill-post parity matrix + 101 concrete-value tests. Closes the corpus-PASS asymmetry (V11 82.4% vs Haas 41.2% vs Okuma 47.1%). Maps every V11 feature to its Haas + Okuma + Heidenhain + Siemens + Fanuc + Mazak + Mitsubishi + Fagor + DMG MORI + Brother + Doosan + Citizen + Generic equivalent. Required-floor features (SAFE-START-BLOCK + COMMENT-FORMAT) cover all 14 dialects. Helpers: featureForDialect, featuresByCategory, gapAnalysis. 101/101 tests PASS — every assertion is a concrete string-equality check, no presence-only stubs. Files: mill-post-feature-parity.{ts,test.ts}.

**Commit:** `7a6fdea2022f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T13:33:54-05:00
**Tags:** post-pdf-node-ms0, u-mill-post-parity-matrix, auto-distilled

## Subject
[MAIN] [POST-PDF-NODE-MS0]/U-MILL-POST-PARITY-MATRIX (slot:echo iter7): 9-feature Hurco V11 → 14-dialect mill-post parity matrix + 101 concrete-value tests. Closes the corpus-PASS asymmetry (V11 82.4% vs Haas 41.2% vs Okuma 47.1%). Maps every V11 feature to its Haas + Okuma + Heidenhain + Siemens + Fanuc + Mazak + Mitsubishi + Fagor + DMG MORI + Brother + Doosan + Citizen + Generic equivalent. Required-floor features (SAFE-START-BLOCK + COMMENT-FORMAT) cover all 14 dialects. Helpers: featureForDialect, featuresByCategory, gapAnalysis. 101/101 tests PASS — every assertion is a concrete string-equality check, no presence-only stubs. Files: mill-post-feature-parity.{ts,test.ts}.

## Body
```
[MAIN] [POST-PDF-NODE-MS0]/U-MILL-POST-PARITY-MATRIX (slot:echo iter7): 9-feature Hurco V11 → 14-dialect mill-post parity matrix + 101 concrete-value tests. Closes the corpus-PASS asymmetry (V11 82.4% vs Haas 41.2% vs Okuma 47.1%). Maps every V11 feature to its Haas + Okuma + Heidenhain + Siemens + Fanuc + Mazak + Mitsubishi + Fagor + DMG MORI + Brother + Doosan + Citizen + Generic equivalent. Required-floor features (SAFE-START-BLOCK + COMMENT-FORMAT) cover all 14 dialects. Helpers: featureForDialect, featuresByCategory, gapAnalysis. 101/101 tests PASS — every assertion is a concrete string-equality check, no presence-only stubs. Files: mill-post-feature-parity.{ts,test.ts}.
```

## Files touched (3)
- .../mill-post-feature-parity.test.ts               | 509 +++++++++++++++++++++
- .../mill-post-feature-parity.ts                    | 443 ++++++++++++++++++
- 2 files changed, 952 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7a6fdea2022f`
- Milestone envelope: `mcp-server/data/milestones/POST-PDF-NODE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._