---
slug: harvest-memory-feedback-feedback-esm-toplevel-return
category: summaries
source: H:\prism-knowledge-wiki\knowledge\memories\feedback\feedback_esm_toplevel_return.md
source_hash: ee407b9d71b592627e2bd91953fc9b13ad3229ad
last_verified: 2026-04-27
verified_by: wiki-harvest-h-drive.mjs
ollama_tokens: 507
claude_tokens: 0
cross_refs:
---

# memory-feedback-feedback-esm-toplevel-return

ESM top-level `return` breaks hook scripts because `.mjs` files are parsed as ES modules, which do not allow top-level `return` statements. To fix this, either use `exit(0)` or wrap the logic in a function called `main()`.

