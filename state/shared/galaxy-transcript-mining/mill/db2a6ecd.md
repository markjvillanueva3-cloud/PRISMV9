# mill session db2a6ecd (2026-06-06, 14.4MB, spine 66KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `ab2ccf42a4` – P4: Hermes app surfaced in `/system‑viz`; new `scripts/generate-hermes-features.mjs`, wired to PRISM MCP, 21/21 tests, live graph 31 nodes/32 edges.  
- `e6713584e2` – Doc‑reflection: wiki entry `[[hermes-app-viz-roost]]`, memory note, and a feedback lesson on stale slot binding.

**DECISIONS**  
- Local LLM: start with `qwen3‑vl:8b‑instruct`; upgraded to `qwen2.5‑coder:32b` for RTX 6000 Blackwell (96 GB).  
- Fallback tier: `anthropic/claude-opus‑4‑8` at `reasoning_effort:xhigh`, activated only after extra‑usage credits are added.  
- Persistence: set `OLLAMA_KEEP_ALIVE=-1` and `OLLAMA_MAX_LOADED_MODELS=4` so the 32 B model stays resident with the fleet OCR model.  
- Bridge: re‑enabled `PRISM Hermes‑Obsidian Bridge` (`scripts/hermes‑obsidian‑memory‑bridge.mjs`) to sync Hermes memories into Obsidian vault.  
- Credentials: OAuth for Claude Code present; Anthropic key cleared (policy 400); OpenAI‑compat key added for local Ollama.

**OPERATOR DIRECTIVES**  
- Verify all credentials are configured and that Hermes is fully synergized with PRISM/Claude Code settings.  
- Confirm the correct local LLM is wired (RTX 6000 Blackwell).  
- Continue remaining tasks: add Opus 4.8 credits, enable review gate on `hermes‑outputs`, install durable prewarm hook.

**FINDINGS / BUGS**  
- Anthropic 400 error – third‑party app policy; cannot use Claude Code OAuth for Hermes.  
- Ollama instance contention & orphaned `llama-server.exe` runners caused model loading stalls.  
- Memory‑fit bug in ollama 0.30.3 prevented >8 GB models from loading on Blackwell.  
- Incomplete download (`-partial`) of `qwen2.5-coder:32b`; fixed by re‑pulling.  
- Stale slot binding and slot‑drift caused write blocks; resolved by clearing stale binding and pointing to live branch.  
- Hermes “nothing happened” due to Anthropic 400, not a hang.

**DOMAIN SPECIFICS**  
- **Engines / Actions**: Hermes agent (`agent.log`), PRISM MCP server (`http://127.0.0.1:3100/mcp`), Ollama server (`localhost:11434/v1`).  
- **Dispatchers / Hooks**: `claimSlot`, `heartbeat`, `install-hermes‑obsidian-memory‑bridge.mjs`, `hermes‑outputs` review gate, prewarm hook.  
- **Metrics**: token rates (51 tok/s for 32B), VRAM usage (47.8 GB/96 GB), Ollama keep‑alive status.  
- **Paths**: `H:/prism/.claude/helpers/chat-slots.mjs`, `scripts/generate-hermes-features.mjs`, `scripts/hermes‑obsidian‑memory‑bridge.mjs`.

**TOOLS USED**  
- PRISM CLI: `/checkin-bravo`, `/loop`, `/goal`.  
- Slot helpers: `chat-slots.mjs` (claim, heartbeat).  
- Diagnostic scripts: `audit-roadmap-drift.mjs`, `node scripts/ollama-cpu-throttle.ps1`, `scripts/hermes‑obsidian‑memory‑bridge.mjs`.  
- System utilities: `nvidia-smi`, `curl`, `ollama list/pull`, `git`.

**OPEN THREADS**  
- Add extra‑usage credits to enable Opus 4.8 at xhigh (operator action).  
- Implement review gate on `hermes‑outputs` to ensure local‑model outputs are vetted before entering PRISM.  
- Create durable prewarm hook for Ollama so the 32B model stays resident after restarts.  
- Optional: pull a 70 B‑class model (`qwen2.5:72b`) and switch Hermes if higher capacity is desired.  
- Run `regen-viz` to make the new Hermes roost visible in live `/system‑viz`.
