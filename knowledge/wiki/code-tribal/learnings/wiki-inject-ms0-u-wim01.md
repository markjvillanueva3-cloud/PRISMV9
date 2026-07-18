# WIKI-INJECT-MS0/U-WIM01 — [MAIN] [WIKI-INJECT-MS0]/U-WIM01: wiki-precheck embeddings-staleness guard + test

**Commit:** `0843e56a4aa6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T22:23:58-05:00
**Tags:** wiki-inject-ms0, u-wim01, auto-distilled

## Subject
[MAIN] [WIKI-INJECT-MS0]/U-WIM01: wiki-precheck embeddings-staleness guard + test

## Body
```
[MAIN] [WIKI-INJECT-MS0]/U-WIM01: wiki-precheck embeddings-staleness guard + test

The semantic-recall fallback in wiki-precheck-inject.mjs runs cosine over
_embeddings.jsonl, which only regenerates when Ollama is up — so it silently
rots vs the hourly-regenerated _leaf-index.jsonl. As of this session 2,878 of
17,616 concept entries (16%) had no vector: invisible to paraphrase recall,
with nothing surfacing the degradation.

Guard (fail-loud, R12):
- embeddingStaleness() / computeEmbStaleness() — pure mtime lag verdict,
  fresh statSync each call (never cached — leaf-index updates without the
  embeddings file changing would rot a cached verdict).
- staleFooterNote() — appends a warning to the semantic-hit footer when the
  index is >= EMB_STALE_HOURS (24h, knob PRISM_WIKI_EMB_STALE_HOURS) behind.
- emb_stale_h telemetry on matched_semantic + noop_no_matches decisions.
- logMiss() gains an embStale flag so a miss-analyzer can down-weight misses
  logged against a known-stale index.

Scoped to the BM25-zero-hit semantic path only; BM25-hit prompts byte-identical.
New test suite (hook had zero coverage): 17/17 — pure-fn boundary cases +
main() stale/fresh/happy-path integration + fail-on-revert source-wiring guard.
3-of-3 per-file scrutiny PASS.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .claude/hooks/wiki-precheck-inject.mjs      |  74 +++++++++--
- .claude/hooks/wiki-precheck-inject.test.mjs | 188 ++++++++++++++++++++++++++++
- 2 files changed, 250 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0843e56a4aa6`
- Milestone envelope: `mcp-server/data/milestones/WIKI-INJECT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._