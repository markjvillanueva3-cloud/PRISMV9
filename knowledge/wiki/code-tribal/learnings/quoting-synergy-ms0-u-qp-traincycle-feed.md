# QUOTING-SYNERGY-MS0/U-QP-TRAINCYCLE-FEED — [MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-TRAINCYCLE-FEED (slot:charlie): wire $355M Orders-Closed actuals into train-cycle as gate-safe ADVISORY distribution-match

**Commit:** `23692f9ffc3a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T14:53:21-05:00
**Tags:** quoting-synergy-ms0, u-qp-traincycle-feed, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING-SYNERGY-MS0]/U-QP-TRAINCYCLE-FEED (slot:charlie): wire $355M Orders-Closed actuals into train-cycle as gate-safe ADVISORY distribution-match

## Body
```
[MAIN-FORCE] [AI-SYNERGY-BRIDGE-WIKI]/U-BRIDGE-WIKI-TEST-PIN (slot:bravo): single-corpus refactor + regression-PINNED CAG-hit test (3-of-3 arm B fix)

The 3-of-3 re-scrutiny PASSED arms A+C (fix verified correct, incl a live ZORBLAX42
wiki-survives-dense probe) but arm B correctly FAILED on TEST INTEGRITY (R9): the new
"P1 corpus-parity" test called gatherGalaxyDocs DIRECTLY with a hardcoded includeWiki, so
it passed even with {includeWiki} stripped from reasonForGalaxy's 502/521 gathers -- it did
NOT pin the fix (the same integration-gap sin, recursively).

TWO changes:
1. SINGLE-CORPUS REFACTOR (R7): reasonForGalaxy now builds the reasoning corpus ONCE
   (`reasoningDocs = gatherGalaxyDocs(..., { includeWiki })`) and feeds BOTH the CAG
   fingerprint AND the dense rerank from it. Eliminates the two separate gather call sites
   (= two revert risks) and makes fingerprint/dense/prompt corpus divergence structurally
   impossible. `opts.cagFile` added (injectable CAG path for tests/ops).
2. REGRESSION-PINNED TEST: the new test exercises reasonForGalaxy END-TO-END via a seeded
   CAG hit -- it seeds the cache keyed by the WIKI-INCLUDED corpus fingerprint, so a hit
   PROVES reasonForGalaxy fingerprinted over the wiki corpus. Plus a control (same key,
   wiki-LESS fingerprint -> must MISS). The hit path returns before dense+Ollama, so it's
   hermetic (no live service).

PIN VERIFIED (the thing arm B required): with the fix, 39/39 pass; with wiki forced OFF
(PRISM_GALAXY_BRIDGE_WIKI=0, simulating the dropped-wiki regression) the P1 test FAILS
(not ok / fail 1) -- proving it detects the regression it names. The prior test passed on
revert; this one does not.

No production-logic change to the wiki behavior itself (that shipped in U-BRIDGE-WIKI +
U-BRIDGE-WIKI-DENSE-FIX); this hardens the structure (one corpus) and the test (real oracle).
```

## Files touched (3)
- scripts/lib/galaxy-reasoning-bridge.mjs      | 17 +++++++++++------
- scripts/lib/galaxy-reasoning-bridge.test.mjs | 48 ++++++++++++++++++++++++++++++++++--------------
- 2 files changed, 45 insertions(+), 20 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 23692f9ffc3a`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._