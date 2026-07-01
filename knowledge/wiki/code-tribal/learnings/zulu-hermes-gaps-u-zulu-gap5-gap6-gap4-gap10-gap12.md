# ZULU-HERMES-GAPS/U-ZULU-GAP5-GAP6-GAP4-GAP10-GAP12 — [MAIN] [ZULU-HERMES-GAPS]/U-ZULU-GAP5-GAP6-GAP4-GAP10-GAP12 (slot:bravo): close shipDraft stub-publish + dedup-never-fires + spec flips

**Commit:** `4fac9846752e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T21:36:28-05:00
**Tags:** zulu-hermes-gaps, u-zulu-gap5-gap6-gap4-gap10-gap12, auto-distilled

## Subject
[MAIN] [ZULU-HERMES-GAPS]/U-ZULU-GAP5-GAP6-GAP4-GAP10-GAP12 (slot:bravo): close shipDraft stub-publish + dedup-never-fires + spec flips

## Body
```
[MAIN] [ZULU-HERMES-GAPS]/U-ZULU-GAP5-GAP6-GAP4-GAP10-GAP12 (slot:bravo): close shipDraft stub-publish + dedup-never-fires + spec flips

G5 P1: shipDraft default flipped to state/shared/specs/SKILL-CANDIDATE-AUTOPASS-<id>.md
(staging marker, NOT live skill). New ctx.stagingDir opt precedes legacy
ctx.commandsDir (back-compat). buildStubBody gains operator-promote section.
Orchestrator passes stagingDir not commandsDir.

G6 P2: gateCandidate gains Map<name, Set<kw>> Jaccard-overlap dedup against
candidate-derived keywords (extractCandidateKeywords) vs each existing skill's
keywords; overlap >= KEYWORD_OVERLAP_THRESHOLD (0.4 default) -> AUTO-FAIL.
New exports: tokenizeKeywords / extractCandidateKeywords / jaccardSimilarity /
parseSkillFrontmatter. Legacy Set<string> path preserved.

G4 DOCS-COMPLETE / G10+G12 OPERATOR-ACTION spec flips. Operator punch list
in HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md §8.

Tests: 51/51 (3 G5 + 9 G6 = 12 new).
```

## Files touched (5)
- scripts/lib/skill-loop-pipeline.mjs                | 392 ++++++++++++++++++
- scripts/lib/skill-loop-pipeline.test.mjs           | 455 +++++++++++++++++++++
- scripts/skill-loop-run.mjs                         | 187 +++++++++
- .../specs/ZULU-HERMES-GAP-AUDIT-2026-05-20.md     |  10 +-
- 4 files changed, 1039 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4fac9846752e`
- Milestone envelope: `mcp-server/data/milestones/ZULU-HERMES-GAPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._