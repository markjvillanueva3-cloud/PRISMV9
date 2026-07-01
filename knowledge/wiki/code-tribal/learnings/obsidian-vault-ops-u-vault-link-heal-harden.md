# OBSIDIAN-VAULT-OPS/U-VAULT-LINK-HEAL-HARDEN — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-LINK-HEAL-HARDEN (slot:sierra): close the short-token edit-distance auto-apply hole (session-gate P1)

**Commit:** `d948b85a74e7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T12:34:25-05:00
**Tags:** obsidian-vault-ops, u-vault-link-heal-harden, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-LINK-HEAL-HARDEN (slot:sierra): close the short-token edit-distance auto-apply hole (session-gate P1)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-LINK-HEAL-HARDEN (slot:sierra): close the short-token edit-distance auto-apply hole (session-gate P1)

Both end-of-session reviewers PASSed but flagged the SAME residual: the recalibrated
scorer still admitted short-token Levenshtein-<=2 matches as auto-apply-eligible
(goal->go, null->mill, echo->eco, skill->mill). A 1-2 edit distance on a 3-5 char token
is a coincidental near-collision, NOT a rename — the SAME wholesale-corruption class the
structural demotion fixed, merely shifted to the edit-distance path.

Fix: the tight-Levenshtein auto-apply tier now requires BOTH (a) shorter token >=
MIN_AUTOAPPLY_LEN (8) chars, AND (b) edit distance <= MAX_AUTOAPPLY_EDIT_FRACTION (~1/6)
of the shorter token. Anything tighter-but-short falls to 0.70 medium (operator-review),
reason `short-token-levenshtein-N`. The reason-gate (exact/lev-1/lev-2 only) still backstops.

Live re-gen (100-link sample): autoApplyCount 33 -> 2, and 0 of the 2 have a weak reason
(schema=exact-match, reference=levenshtein-1 — both legitimate). The goal->go / skill->mill
class is now correctly medium-review.

Tests 47/47 (+3: long-slug 2-edit clears, 6-char 2-edit demoted, the 4 real gate-found
false positives all <0.85). R9: would fail on revert of the length/fraction guard.
```

## Files touched (5)
- mcp-server/src/engines/SpeedFeedOrchestratorEng-1.archive.2026-06-08 | 3539 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/__tests__/wiki-link-fix-suggester.test.mjs                   |   25 +-
- scripts/wiki-link-fix-suggester.mjs                                  |   31 +-
- state/shared/wiki-link-fix-candidates.json                           |  864 +++++++--------
- 4 files changed, 4019 insertions(+), 440 deletions(-)

## Lessons surfaced in commit body
- till admitted short-token Levenshtein-<=2 matches as auto-apply-eligible
- till backstops.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d948b85a74e7`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._