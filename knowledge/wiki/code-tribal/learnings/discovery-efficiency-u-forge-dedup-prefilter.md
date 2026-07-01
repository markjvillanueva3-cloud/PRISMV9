# DISCOVERY-EFFICIENCY/U-FORGE-DEDUP-PREFILTER — [MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-FORGE-DEDUP-PREFILTER: add producer-side dedup guard to the forge queue (close the 22/22 false-positive root cause)

**Commit:** `44c314c404c4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T14:18:09-05:00
**Tags:** discovery-efficiency, u-forge-dedup-prefilter, auto-distilled

## Subject
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-FORGE-DEDUP-PREFILTER: add producer-side dedup guard to the forge queue (close the 22/22 false-positive root cause)

## Body
```
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-FORGE-DEDUP-PREFILTER: add producer-side dedup guard to the forge queue (close the 22/22 false-positive root cause)

extraction-forge-detect.mjs scored extraction concepts for forge-worthiness but did
ZERO check against what PRISM already has, so the queue filled with already-built
concepts -- a 22/22 false-positive batch verify-on-disk'd 2026-06-15 (Radial Chip
Thinning -> ChipThinningCompensationEngine, Topology Optimization ->
FixtureTopologyOptimizerEngine SIMP, etc.). This adds the anti-duplication guard at
the SOURCE (tango's exact mandate -- the guard layer before any create).

New pure lib scripts/lib/forge-dedup-prefilter.mjs (conceptAlreadyBuilt /
significantStems / stem / STOPWORDS, 10/10 node:test). HIGH-PRECISION + CONSERVATIVE:
flags built ONLY when a significant stemmed-token bigram is a substring of an
engine/algorithm FILENAME (near-certain dup); ambiguous concepts still queue and
/forge-triple's DuplicationGuard stays the real gate (low false-negative -- never
silently drops a genuine new capability). Vendor names (solidworks/mastercam/haas/...)
are stopwords -> cross-lane tutorials are not novel caps.

Wired into the producer (filename-only engine list = stays 'light by design'); every
prefiltered concept is LOGGED by name (R12, no silent suppression). Live --dry-run over
4388 entries: 41 already-built concepts caught at source, all high-precision matches;
novel concepts pass through. node --check clean.
```

## Files touched (4)
- scripts/extraction-forge-detect.mjs        | 46 +++++++++++++++++++++++++++++++++++++++-------
- scripts/lib/forge-dedup-prefilter.mjs      | 89 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/forge-dedup-prefilter.test.mjs | 80 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 208 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- till queue and

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 44c314c404c4`
- Milestone envelope: `mcp-server/data/milestones/DISCOVERY-EFFICIENCY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._