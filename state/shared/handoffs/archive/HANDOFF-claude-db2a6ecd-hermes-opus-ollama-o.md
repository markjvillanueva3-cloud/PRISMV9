---
session: claude-db2a6ecd
topic: hermes-opus-ollama-obsidian
slot: bravo
written_at: 2026-06-06T06:10:31.686Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-db2a6ecd
status: active
---

# HANDOFF: claude-db2a6ecd
Updated: 2026-06-06T06:10:31.687Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-db2a6ecd

## STATE
## Hermes fully active (this session)
- ROOT CAUSE of 'typed msg nothing happened': Hermes->Anthropic 400 'third-party apps draw from extra usage not plan'. Claude Code=first-party (plan); Hermes=third-party (needs extra-usage credits). No claude-code provider in Hermes.
- OLLAMA was fully wedged: instance contention (bind-loop) + 5 orphaned llama-server GPU runners + 0.30.3 memory-fit hang on Blackwell for >8GB models. FIXED: killed orphans+single serve; UPDATED 0.30.3->0.30.6; disabled PRISM Ollama CPU Throttle task (NIM-contention-only, GPU now free 94GB).
- Hermes config: model=qwen3-vl:8b-instruct/openai/127.0.0.1:11434/v1, OPENAI_API_KEY=ollama-local appended to .env, reasoning_effort xhigh, fallback_model anthropic/claude-opus-4-8. Backups: config.yaml.bak-*.
- OBSIDIAN: vault=H:/prism/knowledge (open, obsidian-local-rest-api plugin). RE-ENABLED 'PRISM Hermes-Obsidian Bridge' task (scripts/hermes-obsidian-memory-bridge.mjs surfaces Hermes memories->knowledge/hermes-brain/). Ran: 0 memories yet (Hermes was blocked).
- Large models (13-32GB) load slowly from H: + abort on client disconnect; keep chat model pinned warm. Memory [[reference_hermes_local_wire_ollama_fix_2026_06_06]].

## RESUME
HERMES LIVE on local qwen3-vl:8b-instruct (GPU-warm 181tok/s, pinned keep_alive=-1) + wired to PRISM MCP :3100. To put Hermes on OPUS 4.8 xhigh (operator's want): BLOCKED by Anthropic third-party billing 400 — operator must add extra-usage credits at claude.ai/settings/usage; THEN flip Hermes config.yaml model.default -> claude-opus-4-8 / provider anthropic / base_url '' (one edit) — fallback_model already = anthropic/claude-opus-4-8, reasoning_effort=xhigh already set. NEXT BUILDS (pending operator Opus decision): (1) review gate on knowledge/hermes-outputs/ so local-model output is scrutinized before authoritative (operator directive: 'review hooks fire so nothing wrong from local ships'); (2) durable prewarm task for the Hermes model across ollama restarts (none exists; model pinned only until ollama restart).

## CONTEXT

