# PDF-TRIBAL-HERMES/U-TRIBAL-EMBED-INDEX — [MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-EMBED-INDEX (slot:zulu): embedder to feed 1123 AI tribal tips into the canonical L1 vector index (per-prompt PSN surface)

**Commit:** `e79424845a8e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T21:10:27-05:00
**Tags:** pdf-tribal-hermes, u-tribal-embed-index, auto-distilled

## Subject
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-EMBED-INDEX (slot:zulu): embedder to feed 1123 AI tribal tips into the canonical L1 vector index (per-prompt PSN surface)

## Body
```
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-EMBED-INDEX (slot:zulu): embedder to feed 1123 AI tribal tips into the canonical L1 vector index (per-prompt PSN surface)

The seeds JSON (U-VIDEO-TIPS-INGEST-FIX) feeds /shop-knowledge but is read by NO
hook; the per-prompt tribal-by-domain-inject -> tribal-rerank reads
tribal-embed-index.json. This sibling of embed-cited-tips-into-tribal-index.mjs
reuses EVERY hardened IO primitive (shard-safe+clobber-guarded read/write,
withTribalIndexLock, embedText, runEmbedPool) -- no new dangerous index code.
Per-tip granularity, resumable via hash-skip, fail-loud Ollama preflight,
domain-mapped to rerank VALID_DOMAINS. Dry-run 1123 tips. 10/10 tests.
```

## Files touched (3)
- scripts/embed-pdf-tribal-tips-into-index.mjs      | 331 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/embed-pdf-tribal-tips-into-index.test.mjs | 120 +++++++++++++++++++++++
- 2 files changed, 451 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e79424845a8e`
- Milestone envelope: `mcp-server/data/milestones/PDF-TRIBAL-HERMES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._