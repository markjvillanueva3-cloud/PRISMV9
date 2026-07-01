# DOMAIN-KNOWLEDGE/U-PAPA-LORA-DISTILL-MODE — [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-DISTILL-MODE (slot:papa): add --distill mode to domain-corpus-to-lora-dataset.mjs -- local Ollama (qwen2.5-coder:14b, R5) synthesizes ONE grounded Q&A pair per (PDF,domain) from the extracted text, MUCH better LoRA than raw text dumps. GIGO-safe: control-byte sanitize + a distill-floor + RAW FALLBACK on any Ollama failure (never blocks). Injectable fetch -> 5 new tests (20/20, no network). Full --distill --out regen of the 65 is the bounded follow-on. Validated live: 2 PDFs -> real post-processor Q&A pairs.

**Commit:** `7c8c734985e4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T21:27:33-05:00
**Tags:** domain-knowledge, u-papa-lora-distill-mode, auto-distilled

## Subject
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-DISTILL-MODE (slot:papa): add --distill mode to domain-corpus-to-lora-dataset.mjs -- local Ollama (qwen2.5-coder:14b, R5) synthesizes ONE grounded Q&A pair per (PDF,domain) from the extracted text, MUCH better LoRA than raw text dumps. GIGO-safe: control-byte sanitize + a distill-floor + RAW FALLBACK on any Ollama failure (never blocks). Injectable fetch -> 5 new tests (20/20, no network). Full --distill --out regen of the 65 is the bounded follow-on. Validated live: 2 PDFs -> real post-processor Q&A pairs.

## Body
```
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-DISTILL-MODE (slot:papa): add --distill mode to domain-corpus-to-lora-dataset.mjs -- local Ollama (qwen2.5-coder:14b, R5) synthesizes ONE grounded Q&A pair per (PDF,domain) from the extracted text, MUCH better LoRA than raw text dumps. GIGO-safe: control-byte sanitize + a distill-floor + RAW FALLBACK on any Ollama failure (never blocks). Injectable fetch -> 5 new tests (20/20, no network). Full --distill --out regen of the 65 is the bounded follow-on. Validated live: 2 PDFs -> real post-processor Q&A pairs.
```

## Files touched (3)
- scripts/domain-corpus-to-lora-dataset.mjs      | 60 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/domain-corpus-to-lora-dataset.test.mjs | 51 +++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 108 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- TILL-MODE (slot:papa): add --distill mode to domain-corpus-to-lora-dataset.mjs -- local Ollama (qwen2.5-coder:14b, R5) synthesizes ONE grounded Q&A pair per (PDF,domain) from the extracted text, MUCH better LoRA than raw text dumps. GIGO-safe: control-byte sanitize + a distill-floor + RAW FALLBACK on any Ollama failure (never blocks). Injectable fetch -> 5 new tests (20/20, no network). Full --distil

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7c8c734985e4`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-KNOWLEDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._