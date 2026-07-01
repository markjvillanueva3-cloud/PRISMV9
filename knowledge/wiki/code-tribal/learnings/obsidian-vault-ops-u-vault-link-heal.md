# OBSIDIAN-VAULT-OPS/U-VAULT-LINK-HEAL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-LINK-HEAL (slot:sierra): recalibrate broken-wikilink scorer — disarm 14,100 over-confident auto-applies

**Commit:** `984313825ef9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T12:23:18-05:00
**Tags:** obsidian-vault-ops, u-vault-link-heal, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-LINK-HEAL (slot:sierra): recalibrate broken-wikilink scorer — disarm 14,100 over-confident auto-applies

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-LINK-HEAL (slot:sierra): recalibrate broken-wikilink scorer — disarm 14,100 over-confident auto-applies

Gap-C2/P2. CORRECTION to the audit (R12): real broken count is 15,828 not 4,136, and a
suggester->apply pipeline already exists (3 scheduled tasks). The real defect was scorer
OVER-CONFIDENCE: scoreCandidate returned 0.85-0.95 for a bare prefix/substring match,
tagging 91% (14,100 of 15,410) of broken links auto-apply-eligible. A short token like
"echo" is a substring of dozens of unrelated slugs -> auto-applying would corrupt links
wholesale.

Fix: exact=1.0 + Levenshtein<=2 (0.92/0.86) are the ONLY auto-apply signals; prefix/
substring -> 0.70 MEDIUM (review, below the 0.85 floor); 3-edit -> 0.62 low. Defense in
depth (reviewer-A blocker): autoApplyEligible gates on match REASON (exact/lev-1/lev-2),
not score alone -- closes the distance-decay leak where two long (>60-char) slugs
differing by 3 edits scored 0.95 via 1-dist/maxLen.

Regenerated the stale 2026-06-05 candidates file that carried autoApplyCount:14100 ->
now high:33 over the processed sample (wholesale-corruption artifact disarmed). processed/
totalBroken make partial coverage explicit; full-corpus run OOMs (all candidates held in
memory before the single write) -> scoped follow-up U-VAULT-LINK-HEAL-STREAM.

Tests 45/45 node:test incl echo-substring adversarial (<0.85), tight-typo (>=0.85),
3-edit (<0.85), long-slug decay-leak guard. 2-reviewer scrutiny (1 PASS / 1 FAIL on
decay-leak + stale artifact -> both fixed). NOTHING auto-applied: apply pipeline stays
dry/operator-gated (migration freeze).
```

## Files touched (4)
- scripts/__tests__/wiki-link-fix-suggester.test.mjs |   98 +-
- scripts/wiki-link-fix-suggester.mjs                |   87 +-
- state/shared/wiki-link-fix-candidates.json         | 4019 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 4162 insertions(+), 42 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 984313825ef9`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._