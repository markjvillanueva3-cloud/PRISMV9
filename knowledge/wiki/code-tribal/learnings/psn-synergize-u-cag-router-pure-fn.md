# PSN-SYNERGIZE/U-CAG-ROUTER-PURE-FN — [MAIN] [PSN-SYNERGIZE]/U-CAG-ROUTER-PURE-FN (slot:sierra iter1 reorient): pure-fn Cache-Augmented Generation router. 39/39 tests.

**Commit:** `3787ba822a9a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T11:39:02-05:00
**Tags:** psn-synergize, u-cag-router-pure-fn, auto-distilled

## Subject
[MAIN] [PSN-SYNERGIZE]/U-CAG-ROUTER-PURE-FN (slot:sierra iter1 reorient): pure-fn Cache-Augmented Generation router. 39/39 tests.

## Body
```
[MAIN] [PSN-SYNERGIZE]/U-CAG-ROUTER-PURE-FN (slot:sierra iter1 reorient): pure-fn Cache-Augmented Generation router. 39/39 tests.

Source: akshay_pachaar X tweet 2056714042455343160 (RAG vs CAG, 2026-05-19) + Chan et al. 2024.

PROBLEM: PRISM auto-injects ~92KB doctrine (CLAUDE.md+MEMORY.md+ENGINE_DIGEST.md+
DISPATCHER_DIGEST.md) on EVERY UserPromptSubmit, even pure-live-state queries.
RAG also fires per-query against Qdrant for state that hasn't changed in months.

SOLUTION: classify the query first:
  COLD   - skip live retrieval; cache-augmented from doctrine
  HOT    - skip doctrine; live state surfaces / RAG only
  HYBRID - prepend cold slice, then hit hot surfaces

FILES (3):
  scripts/lib/cag-router.mjs              - pure-fn classifier, 5 exports
  scripts/lib/cag-router.test.mjs         - 39 tests, all pass
  knowledge/wiki/architecture/cag-router.md

COMPOSITION (confirmed novel via graph + duplicationGuard):
  master-index-search-lib.mjs - same BM25-lite key-set
  prompt-cache.mjs            - output cache; CAG is INPUT/query cache
  aiSystemRouterEngine.route  - Claude-vs-Ollama for TASKS; CAG for QUERIES
  output_cache_* dispatchers  - response-side; CAG is query-side

KEY DESIGN:
- Pure-fn (zero I/O), composable into any hook chain
- Cold-source registry curated 7 entries with coldRationale (akshay's caveat)
- Hybrid markers FORCE hybrid (R7 - surface conflicts, don't average)
- Empty/null - HYBRID + LOW-CONFIDENCE evidence (R12 fail-loud)
- MAX_QUERY_BYTES=64KB latency bound (10MB pathological was 2.8s before cap)
- Word-boundary regex with metachar escape - ragout != rag, prism_* literal

PER-FILE SCRUTINY: 2 parallel reviewers (code-analyzer + reviewer). Both PASS.
P0=0 P1=0 P2=4 (2 fixed: MAX_QUERY_BYTES guard + unreachable tie-branch
removal; 2 accepted: slot-intent generous, sizeBytes drift). P3=2 cosmetic.

FOLLOW-UP UNITS queued:
- U-CAG-HOOK-INJECT    : wire as UserPromptSubmit hook
- U-CAG-CACHE-CONTROL  : wrap doctrine in cache_control: ephemeral
- U-CAG-DASHBOARD      : /system-viz ghost.cag_router roost

3RD ARTICLE cyrilXBT 2052923836090167526 PARTIAL: opener "Your Obsidian Vault
Can Now Write Back to Itself" - PRISM's auto-feed today is one-way C-to-H;
vault writes-back is the next gap. Proposed U-VAULT-BACKWRITE-MS0 in
reference_x_article_cyrilxbt_2026_05_26 for next pick-unit.

DUNIK_7 2058905748579418615 UNFETCHED: X anti-scraper + browser MCPs held by
peer chats + WebFetch 402 + nitter dead + WebSearch unindexed. R12 fail-loud
memory captured; operator paste unblocks.

[MAIN] override; commit lands on cad-fusion-live-ms0.
```

## Files touched (3)
- knowledge/wiki/architecture/cag-router.md | 99 +++++++++++++++++++++++++++++++
- state/shared/MEMORY-RECENT.md             | 77 ++++++++++++++++++++++++
- 2 files changed, 176 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3787ba822a9a`
- Milestone envelope: `mcp-server/data/milestones/PSN-SYNERGIZE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._