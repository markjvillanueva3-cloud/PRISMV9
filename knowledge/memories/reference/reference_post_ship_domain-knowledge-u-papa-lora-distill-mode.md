---
name: reference_post_ship_domain-knowledge-u-papa-lora-distill-mode
description: Auto-distilled learnings from shipping DOMAIN-KNOWLEDGE/U-PAPA-LORA-DISTILL-MODE (commit 7c8c73498). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.838Z
aliases: reference_post_ship_domain-knowledge-u-papa-lora-distill-mode
---


# DOMAIN-KNOWLEDGE/U-PAPA-LORA-DISTILL-MODE

[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-DISTILL-MODE (slot:papa): add --distill mode to domain-corpus-to-lora-dataset.mjs -- local Ollama (qwen2.5-coder:14b, R5) synthesizes ONE grounded Q&A pair per (PDF,domain) from the extracted text, MUCH better LoRA than raw text dumps. GIGO-safe: control-byte sanitize + a distill-floor + RAW FALLBACK on any Ollama failure (never blocks). Injectable fetch -> 5 new tests (20/20, no network). Full --distill --out regen of the 65 is the bounded follow-on. Validated live: 2 PDFs -> real post-processor Q&A pairs.

**Shipped:** 2026-06-24T21:27:33-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[domain-knowledge-u-papa-lora-distill-mode]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._