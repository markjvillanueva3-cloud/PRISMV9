---
slug: harvest-memory-feedback-feedback-docker-wsl-recovery
category: summaries
source: H:\prism-knowledge-wiki\knowledge\memories\feedback\feedback_docker_wsl_recovery.md
source_hash: cb619a614299e57a1ed184af11ae6b67e8ddce72
last_verified: 2026-04-27
verified_by: wiki-harvest-h-drive.mjs
ollama_tokens: 754
claude_tokens: 0
cross_refs:
---

# memory-feedback-feedback-docker-wsl-recovery

When Docker Desktop fails to launch on Windows with WSL2, check the `com.docker.service` status first. If it's STOPPED with exit code 1077, start it and then follow a diagnostic sequence to resolve the issue, including killing zombie processes, shutting down WSL, and relaunching 

