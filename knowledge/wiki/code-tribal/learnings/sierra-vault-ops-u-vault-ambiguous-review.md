# SIERRA-VAULT-OPS/U-VAULT-AMBIGUOUS-REVIEW — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-AMBIGUOUS-REVIEW (slot:sierra): --ambiguous review report for unhealable ambiguous broken links

**Commit:** `f5b639911242` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T19:30:02-05:00
**Tags:** sierra-vault-ops, u-vault-ambiguous-review, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-AMBIGUOUS-REVIEW (slot:sierra): --ambiguous review report for unhealable ambiguous broken links

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-AMBIGUOUS-REVIEW (slot:sierra): --ambiguous review report for unhealable ambiguous broken links

Unit #4 of the highest-ROI vault queue: the safe sub-unit of the residual-orphan work
the link-heal (U-VAULT-LINK-DOCTOR) deferred. The link-heal auto-fixed HEALABLE links
(unique slug rematch) but DELIBERATELY never touched AMBIGUOUS ones (real note exists but
>1 candidate -- auto-picking would invent intent). This surfaces them for human review.

ADDITIVE to vault-link-doctor.mjs (HEALABLE/apply paths byte-unchanged, prior 16,628->4,245
heal intact): classifyBrokenTarget now returns the rival candidate LIST (cands), diagnose
collects report.ambiguousLinks (capped AMBIG_CAP=1000, with truncated honesty flag), and a
--ambiguous mode writes state/shared/vault-ambiguous-links-report.json. READ-ONLY -- an
ambiguous link is NEVER auto-rewritten (the invariant the heal preserved).

LIVE-VALIDATED: 169 ambiguous links captured. The pattern is actionable: nearly all rivals are
SAME-BASENAME DUPLICATES across memories/reference/ vs memories/galaxies/<galaxy>/ (galaxy
buildout cloned reference memos) -- the operator/follow-up can now pick the canonical home + dedup.

19 tests (2 new: cands rival-list deepEqual + diagnose ambiguousLinks fixture, mutation-proof).
2-arm scrutiny BOTH PASS (no P0/P1). Closed 3 P2: --ambiguous Usage doc, truncated flag (R12),
candidates-as-paths accepted v1. Sibling of [[reference_sierra_vault_link_heal_2026_06_17]].
```

## Files touched (3)
- scripts/vault-link-doctor.mjs      | 46 +++++++++++++++++++++++++++++++++++++++++++---
- scripts/vault-link-doctor.test.mjs | 21 +++++++++++++++++++++
- 2 files changed, 64 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f5b639911242`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._