# GRAPH-AUTOUSE/U-INLINE-CARD-PREREAD — [MAIN-FORCE] [GRAPH-AUTOUSE]/U-INLINE-CARD-PREREAD (slot:alpha): wire the shared GAP-A inline node-card into pre-read-graph-inject (2nd of 4 BM25 surfaces)

**Commit:** `aee30d93631f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T12:47:44-05:00
**Tags:** graph-autouse, u-inline-card-preread, auto-distilled

## Subject
[MAIN-FORCE] [GRAPH-AUTOUSE]/U-INLINE-CARD-PREREAD (slot:alpha): wire the shared GAP-A inline node-card into pre-read-graph-inject (2nd of 4 BM25 surfaces)

## Body
```
[MAIN-FORCE] [GRAPH-AUTOUSE]/U-INLINE-CARD-PREREAD (slot:alpha): wire the shared GAP-A inline node-card into pre-read-graph-inject (2nd of 4 BM25 surfaces)

pre-read previously injected only node NAMES. It now imports renderTopCardBlock from the shared graph-exact-match lib and, when the top hit scores >= PRISM_PRE_READ_INLINE_CARD_MIN_SCORE (default 10), prepends the node CARD (id/layer/status/label/score/info + vault doc pointers) so the model needs zero follow-up node-card/Read call. renderInject signature (keys,hits) -> (keys,hits,seekDocs,inlineCardMinScore); main() clones pre-grep's hook-safe seekCard-backed seekDocs resolver (seek-only, never the 644MB graph, fail-open import). Faithful clone of pre-grep's GAP-A branch (2-arm verified logically identical; env var correctly localized; no exact-match/nav-savings bleed). Truncation marker converted unicode-ellipsis -> ASCII ... (ascii-guard) with the overflow slice reserving 3 bytes so the cap is now EXACT (<=1500, was 1501); 2 existing assertions tightened to match (not weakened). +6 GAP-A tests (card present/absent by threshold, score===threshold boundary, threshold=0 disable, seekDocs-null still renders, overflow names-only cap). Tests 17/17. Per-file 2-arm scrutiny PASS (code-analyzer + reviewer, 0 P0/P1; 2 optional P2 actioned/noted). Live: file_path system-graph-write-lock.mjs -> inline card score 16.0 + real wiki/mem pointers. NEXT: pre-write + pre-bash (same clone), then master-index-precheck-inject.
```

## Files touched (3)
- .claude/hooks/pre-read-graph-inject.mjs      | 69 +++++++++++++++++++++++++++++++++++++++++++++-----
- .claude/hooks/pre-read-graph-inject.test.mjs | 63 +++++++++++++++++++++++++++++++++++++++++++--
- 2 files changed, 124 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till renders, overflow names-only cap). Tests 17/17. Per-file 2-arm scrutiny PASS (code-analyzer + reviewer, 0 P0/P1; 2 optional P2 actioned/noted). Live: file_path system-graph-write-lock.mjs -> inline card score 16.0 + real wiki/mem pointers. NEXT: pre-write + pre-bash (same clone), then master-index-precheck-inject.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show aee30d93631f`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-AUTOUSE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._