# india session db2a6ecd (2026-06-06, 14.4MB, spine 66KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Commit ab2ccf42a4 – P4: Hermes desktop app surfaced in `/system‑viz` with a local `qwen2.5-coder:32b` model, pinned warm (`keep_alive=-1`, `OLLAMA_MAX_LOADED_MODELS=4`).  
- Commit e6713584e2 – Documentation & wiki entry for Hermes‑Obsidian bridge and system‑state memory.  

**DECISIONS**  
- Use a local GPU‑resident model (`qwen2.5-coder:32b`) as the primary Hermes engine; fallback to `anthropic/claude-opus-4-8` (xhigh) only when extra‑usage credits are added.  
- Set `OLLAMA_KEEP_ALIVE=-1` and `OLLAMA_MAX_LOADED_MODELS=4` so the 32 B model stays resident across loads.  
- Enable the dormant Hermes‑Obsidian bridge; no memories yet, but bridge logic is active.  
- Plan to add a prewarm‑on‑restart hook for Ollama to avoid cold‑load timeouts.  
- Implement a review gate on `knowledge/hermes‑outputs/` before treating local outputs as authoritative.  

**OPERATOR DIRECTIVES**  
- “Make sure all credentials are setup and all settings for Hermes are synergized with how we run our system.”  
- “Make sure Claude Code is running on it with Opus 4.8 on xhigh, then continue with the rest of your current tasks.”  
- “Double check if you wired the correct local LLM.”  

**FINDINGS/BUGS**  
- Anthropic 400 error: Hermes was using a third‑party API key; policy requires extra‑usage credits for Opus.  
- Ollama instance contention and orphaned `llama-server` runners caused model loading failures.  
- Incomplete download (`-partial`) of `qwen2.5-coder:32b`; resolved by re‑pulling the full 21 GB blob.  
- Ollama 0.30.3 had a memory‑fit hang on Blackwell GPUs; upgraded to 0.30.6 which fixed the issue.  
- Hermes was initially wired to an 8 B vision model (stopgap); now correctly wired to the 32 B model.  

**AI‑SYSTEM SPECIFICS**  
- **Hermes engine**: local `qwen2.5-coder:32b` (32,768 tokens, ~51 tok/s on Blackwell).  
- **Fallback**: `anthropic/claude-opus-4-8`, reasoning effort `xhigh`.  
- **PRISM MCP**: healthy at `http://127.0.0.1:3100/mcp`.  
- **Ollama env**: `OLLAMA_KEEP_ALIVE=-1`, `OLLAMA_MAX_LOADED_MODELS=4`; GPU usage ~47.8 GB/96 GB.  
- **Metrics**: 51 tok/s (32 B), 181 tok/s (8 B) when warm; cold‑load of 32 B ≈208 s from `H:` disk.  

**OPEN THREADS**  
1. Add a prewarm‑on‑restart hook for Ollama to keep the 32 B model resident after service restarts.  
2. Decide on final Hermes brain: stay with 32 B, upgrade to a 70 B‑class model (e.g., `qwen2.5:72b`), or switch to Opus 4.8 once extra‑usage credits are added.  
3. Implement the review gate for local Hermes outputs before they enter PRISM.  
4. Verify that the Hermes‑Obsidian bridge produces memories after Hermes starts generating them.
