# PDF-TRIBAL-HERMES/U-PDF-TRIBAL-HERMES — [MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-PDF-TRIBAL-HERMES (slot:zulu): Hermes /learn tribal-knowledge generation over the resources PDF corpus

**Commit:** `5462f9531e50` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:14:40-05:00
**Tags:** pdf-tribal-hermes, u-pdf-tribal-hermes, auto-distilled

## Subject
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-PDF-TRIBAL-HERMES (slot:zulu): Hermes /learn tribal-knowledge generation over the resources PDF corpus

## Body
```
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-PDF-TRIBAL-HERMES (slot:zulu): Hermes /learn tribal-knowledge generation over the resources PDF corpus

Closes the gap generate-cad-cam-pdf-tribal-seeds.mjs left (POINTER tips only -- its comment
"full semantic summarization requires Ollama (currently offline)"). Ollama AND the Hermes
:8645 proxy are now UP, so this distills REAL shop-floor tribal tips from each of the 6,013
extracted PDF node texts via Hermes (xAI Grok, free OAuth), Ollama qwen2.5-coder:32b fallback.

Resumable (done sha8s derived from tips.jsonl -> reaper kill resumes), fail-soft per node,
thin-page skip. Output state/shared/pdf-tribal-tips/tips.jsonl feeds the tribal store
(tribal-embed-index) -> RAG/GNN/LoRA + tribal-by-domain injection (the PRISM app).
LIVE-validated: 2 nodes -> 13 actionable tips via grok-4.3, 0 failed. 12/12 pure-helper tests
(parseTips numbering/bullets/NONE/cap-8/adversarial + nodeText shapes + buildUserPrompt cap +
worthExtracting thin-skip). Full 6,013-node batch launched in background. Runtime output gitignored.
```

## Files touched (4)
- .gitignore                                       |   3 +
- scripts/generate-pdf-tribal-tips-hermes.mjs      | 203 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/generate-pdf-tribal-tips-hermes.test.mjs |  67 +++++++++++++++++++++
- 3 files changed, 273 insertions(+)

## Lessons surfaced in commit body
- tills REAL shop-floor tribal tips from each of the 6,013

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5462f9531e50`
- Milestone envelope: `mcp-server/data/milestones/PDF-TRIBAL-HERMES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._