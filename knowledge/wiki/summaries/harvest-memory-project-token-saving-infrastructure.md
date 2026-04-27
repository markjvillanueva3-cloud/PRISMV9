---
slug: harvest-memory-project-token-saving-infrastructure
category: summaries
source: H:\prism-knowledge-wiki\knowledge\memories\project\token_saving_infrastructure.md
source_hash: 62f11dd972fba8580ccc4cd7160a5cded82699cb
last_verified: 2026-04-27
verified_by: wiki-harvest-h-drive.mjs
ollama_tokens: 518
claude_tokens: 0
cross_refs:
---

# memory-project-token-saving-infrastructure

PRISM is a project that includes 11 auto-fire hooks in `.claude/hooks/lib/` registered via `portable-user-settings.json`, designed to improve token efficiency by preventing wasted operations like grep, glob, and read. The hooks use a fd 0 stdin fallback for Windows ESM compatibil

