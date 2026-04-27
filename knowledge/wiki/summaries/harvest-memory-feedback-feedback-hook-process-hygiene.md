---
slug: harvest-memory-feedback-feedback-hook-process-hygiene
category: summaries
source: H:\prism-knowledge-wiki\knowledge\memories\feedback\feedback_hook_process_hygiene.md
source_hash: 20dc3cd59f3c5e5c9a4144b1209bcb7a4bf7445d
last_verified: 2026-04-27
verified_by: wiki-harvest-h-drive.mjs
ollama_tokens: 659
claude_tokens: 0
cross_refs:
---

# memory-feedback-feedback-hook-process-hygiene

PRISM hooks must exit quickly, declare a timeout, and avoid leaking node processes to prevent performance issues when running multiple concurrent tools. The `node-process-janitor.mjs` script helps manage these leaks by killing old node processes.

