# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-SCORER-TYPEAWARE — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-SCORER-TYPEAWARE (slot:xray) [BOOTSTRAP-SLOT-ENFORCE]: type-aware + optimal (Kuhn's) dimension-set matching

**Commit:** `a1c1efa31d48` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T19:49:43-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-scorer-typeaware, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-SCORER-TYPEAWARE (slot:xray) [BOOTSTRAP-SLOT-ENFORCE]: type-aware + optimal (Kuhn's) dimension-set matching

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-SCORER-TYPEAWARE (slot:xray) [BOOTSTRAP-SLOT-ENFORCE]: type-aware + optimal (Kuhn's) dimension-set matching

OCR closed-loop scorer fidelity upgrade (the score IS the training signal). Two changes:
(A) Replaced closest-first GREEDY matching with OPTIMAL max-cardinality bipartite matching (Kuhn's
    augmenting-path) — fixes a documented greedy UNDERCOUNT (truth [100,100.9] vs got [100.5,101.4]
    is 2 matches, greedy gave 1) that biased recall DOWN. Matched count is now provably maximal.
(B) Added TYPE-AWARE matching (default ON, bare-number/unknown → value-only fallback): a diameter no
    longer matches a linear/angular of equal magnitude. opts.typeAware=false restores legacy value-only.

Scrutiny: reviewer-A (code-analyzer) full PASS on Kuhn's correctness + back-compat + determinism, and
CAUGHT a P0 — parseVisionResponse defaults extracted dim type to the literal string 'unknown' (not
null), which type-aware would have scored matched=0 against typed truth, silently zeroing the live
training gradient. FIXED at source: dimType treats 'unknown'/sentinel strings as null → value-only
fallback; regression-pinned with the real producer shape. 25/25 tests green. (reviewer-B 2nd-pass
rate-limited by API throttle — arm-B re-scrutiny pending; committing to preserve tested work across a
slot switch.) Runner CAVEAT string updated to reflect type-aware default.
```

## Files touched (8)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/winmax-ui-map.json |  14 ++++++++++--
- scripts/lib/dimension-set-score.mjs                                         | 115 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------------------------
- scripts/lib/dimension-set-score.test.mjs                                    |  96 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---------
- scripts/ocr-closed-loop.mjs                                                 |   6 +++--
- scripts/winmax-ui-map.mjs                                                   |  66 +++++++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/winmax-ui-map.test.mjs                                              | 126 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----
- state/shared/post-training/WINMAX-LIVE-TEST-LOG.md                          |  15 +++++++++++++
- 7 files changed, 386 insertions(+), 52 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a1c1efa31d48`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._