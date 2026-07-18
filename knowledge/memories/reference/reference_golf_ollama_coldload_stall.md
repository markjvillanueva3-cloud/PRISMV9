---
name: reference-golf-ollama-coldload-stall
description: Ollama /api/chat hangs while /api/tags responds — the model mmap-loads too slowly from H: and short-timeout hook calls abort mid-load; NOT VRAM.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.598Z
aliases: reference_golf_ollama_coldload_stall
---


**Symptom (slot:golf, 2026-05-29):** `curl /api/tags` responds instantly but `/api/chat` hangs (>150s, returns 499). `ollama ps` shows no model resident. GPU is idle (3GB/16GB, 5% util) — so it is NOT VRAM contention.

**Root cause:** `OLLAMA_MODELS=H:/Tools/ollama/models`. The 9.6GB qwen-7b cold-loads via mmap from `H:` too slowly; every short-timeout hook call (prompt-rewriter, ollama-task-offloader) aborts mid-load → Ollama logs `client connection closed before server finished loading, aborting load` → the load cancels → the next call starts cold again. A death spiral. Even a patient 600s warm did not complete.

**Fix path (NOT a quick toggle):** (1) move `OLLAMA_MODELS` to a local SSD; (2) raise the offload hooks' Ollama timeout so they tolerate a slow cold-load; (3) keep one small model warm (`keep_alive`). Restarting `prism-ollama` alone does NOT fix it. This is why fleet Ollama-offload sits ~0-10% instead of the ≥30% target.
