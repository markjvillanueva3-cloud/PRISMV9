# GRAPH-AUTOUSE/U-INLINE-CARD-PREWRITE — [MAIN-FORCE] [GRAPH-AUTOUSE]/U-INLINE-CARD-PREWRITE (slot:alpha): wire the shared GAP-A inline node-card into pre-write-graph-inject (3rd of 4 BM25 surfaces)

**Commit:** `6ee830404ea6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T12:56:45-05:00
**Tags:** graph-autouse, u-inline-card-prewrite, auto-distilled

## Subject
[MAIN-FORCE] [GRAPH-AUTOUSE]/U-INLINE-CARD-PREWRITE (slot:alpha): wire the shared GAP-A inline node-card into pre-write-graph-inject (3rd of 4 BM25 surfaces)

## Body
```
[MAIN-FORCE] [GRAPH-AUTOUSE]/U-INLINE-CARD-PREWRITE (slot:alpha): wire the shared GAP-A inline node-card into pre-write-graph-inject (3rd of 4 BM25 surfaces)

pre-write's multi-hit path now prepends the top hit's node CARD (via the shared renderTopCardBlock) when score >= PRISM_PRE_WRITE_INLINE_CARD_MIN_SCORE (default 10), so the model needs zero follow-up node-card/Read call. pre-write already had the seekCard-backed seekDocs resolver (sierra U-SV-NODE-VAULT-PATHS) so only the renderInject branch + inlineCardMinScore param were added; the exact-match-collapse path is untouched and the GAP-A card can NEVER fire on it (early return precedes all card logic; pinned by a new isolation test). Faithful clone of pre-grep's GAP-A branch (2-arm verified logically identical; env localized to PRE_WRITE; no PRE_GREP bleed). Truncation marker unicode-ellipsis -> ASCII ... with overflow slice reserving 3 bytes (cap exact 1500, was 1501); one existing assertion tightened. +7 GAP-A tests (card present/absent by threshold, score===threshold boundary, threshold=0 disable, exact-match isolation, seekDocs-null still renders, overflow names-only cap). Tests 21/21. Per-file 2-arm scrutiny PASS (code-analyzer + reviewer, 0 findings). Live: file_path system-graph-write-lock.mjs -> inline card score 16.0. NEXT: pre-bash (4th surface), then a tiny pre-grep ASCII-parity cleanup, then master-index-precheck-inject.
```

## Files touched (3)
- .claude/hooks/pre-write-graph-inject.mjs      | 44 +++++++++++++++++++++++++-----
- .claude/hooks/pre-write-graph-inject.test.mjs | 71 +++++++++++++++++++++++++++++++++++++++++++++++--
- 2 files changed, 106 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- till renders, overflow names-only cap). Tests 21/21. Per-file 2-arm scrutiny PASS (code-analyzer + reviewer, 0 findings). Live: file_path system-graph-write-lock.mjs -> inline card score 16.0. NEXT: pre-bash (4th surface), then a tiny pre-grep ASCII-parity cleanup, then master-index-precheck-inject.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6ee830404ea6`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-AUTOUSE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._