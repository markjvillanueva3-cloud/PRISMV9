# RATE-LIMIT-FIX/U-RAG-DENSE-EMBED-127 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-RAG-DENSE-EMBED-127 (slot:bravo): RAG-HYBRID dense-arm embeddings URL localhost->127 (node-http IPv6 bug)

**Commit:** `1a59c22336ef` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:38:36-05:00
**Tags:** rate-limit-fix, u-rag-dense-embed-127, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-RAG-DENSE-EMBED-127 (slot:bravo): RAG-HYBRID dense-arm embeddings URL localhost->127 (node-http IPv6 bug)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-RAG-DENSE-EMBED-127 (slot:bravo): RAG-HYBRID dense-arm embeddings URL localhost->127 (node-http IPv6 bug)

hybrid-retrieval.mjs DEFAULT_OLLAMA_URL was hardcoded http://localhost:11434/api/embeddings (NOT env-overridable) -> on Windows node http hits IPv6 ::1 -> the dense-arm embeddings call silently failed. This is the dense arm of india's RAG-HYBRID (slot india) + sierra's PSN-ENHANCE viz wiring -- so the dense retrieval arm may have been degraded by the systemic localhost-IPv6 bug. Fix: env-overridable (OLLAMA_URL) default 127.0.0.1. node --check clean.

HANDOFF to india/sierra: validate the RAG-HYBRID dense pipeline end-to-end now that embeddings reach Ollama (was it silently falling back to sparse-only?). Sibling RAG scripts with the same hardcoded localhost default still need the fix + pipeline validation (their lane): scripts/prism-hybrid.mjs:51, scripts/lib/path-embed.mjs:29 (path-embed uses its own PRISM_PATH_EMBED_URL env). Reachable bravo-lane localhost surface now closed; remaining = india-RAG-scripts + 7 engines (build:tsc, papa/india) + 9 unwired hooks (operator wiring decision).
```

## Files touched (2)
- scripts/lib/hybrid-retrieval.mjs | 23 +++++++++++++++++++++--
- 1 file changed, 21 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till need the fix + pipeline validation (their lane): scripts/prism-hybrid.mjs:51, scripts/lib/path-embed.mjs:29 (path-embed uses its own PRISM_PATH_EMBED_URL env). Reachable bravo-lane localhost surface now closed; remaining = india-RAG-scripts + 7 engines (build:tsc, papa/india) + 9 unwired hooks (operator wiring decision).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1a59c22336ef`
- Milestone envelope: `mcp-server/data/milestones/RATE-LIMIT-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._