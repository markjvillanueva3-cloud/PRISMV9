---
slug: harvest-memory-feedback-feedback-dont-soften-completeness-gates
category: summaries
source: H:\prism-knowledge-wiki\knowledge\memories\feedback\feedback_dont_soften_completeness_gates.md
source_hash: 094118bd915e7c61c0127657c261d83ec4fa2c14
last_verified: 2026-04-27
verified_by: wiki-harvest-h-drive.mjs
ollama_tokens: 834
claude_tokens: 0
cross_refs:
---

# memory-feedback-feedback-dont-soften-completeness-gates

When fixing hook hangs, never change `continueOnError` to `true` on hooks that enforce code-completeness or correctness (e.g., `code-completeness-gate`, `test-legitimacy`). These are designed to fail the tool call when banned patterns are detected. Instead, optimize subprocess ov

