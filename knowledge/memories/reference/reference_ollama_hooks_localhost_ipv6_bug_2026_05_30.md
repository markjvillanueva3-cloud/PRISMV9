---
name: ollama-hooks-localhost-ipv6-bug-2026-05-30
description: "17 ollama hooks fast-failed \"offline\" because http://localhost:11434 resolves to IPv6 ::1, which host-native ollama (IPv4-only) refuses — fix is 127.0.0.1"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.677Z
aliases: reference_ollama_hooks_localhost_ipv6_bug_2026_05_30
---


**The bug (fleet-wide, all 26 chats):** every ollama hook that defaulted to `http://localhost:11434` was fast-failing (`ECONNREFUSED` in ~100ms, logged as `ollama-offline`). Node's `fetch` resolves `localhost` to **IPv6 `::1` first**; the host-native `ollama.exe` binds **IPv4 `0.0.0.0` only** → `::1` connection refused instantly. `curl localhost` worked (tries IPv4), masking it. The old *container* ollama bound dual-stack so `localhost` worked — switching to host-native ollama (see [[ollama-9p-bind-fix-2026-05-29]]) EXPOSED this latent bug.

**Proof (2026-05-30 slot golf):**
```
http://localhost:11434  → FAIL ECONNREFUSED 110ms   (Node fetch → ::1)
http://127.0.0.1:11434  → OK 200 18ms
```
This is why the prompt-rewriter logged **598 attempts / 0 hits / 0 tokens saved** — it never reached ollama. After the fix, a live test produced a real structured rewrite: `model=qwen2.5-coder:7b, 7391ms, conf=0.80, skip=none`.

**17 affected hooks** (`grep -l localhost:11434 .claude/hooks/`): prompt-rewriter-ollama, prompt-rewriter-health-warn, ollama-auto-router, stop-obsidian-memory-extract, optimal-context-inject, ollama-unified-semantic-router, ollama-terminal-watcher, ollama-session-continuity, ollama-route-recommender, ollama-reviewer-second-opinion, ollama-prism-intelligence, ollama-obsidian-rag, ollama-engine-api-extractor, ollama-context-aggregator, ollama-autostart, memory-system-init, claudemd-ollama-enforcer. All read `process.env.OLLAMA_URL || "http://localhost:11434"`.

**Fix applied:** `setx OLLAMA_URL "http://127.0.0.1:11434"` (persistent user env → all hooks read the env first → fleet-wide fix on next session start). **NOT applied to the current session** (already-spawned Claude Code inherited the old env — the rewriter banner stays until a fresh session).

**Pending (hand to alpha — token-optimization galaxy owner):** harden the 17 in-repo DEFAULTS `localhost`→`127.0.0.1` so the fix is git-versioned + env-independent + portable to other machines. Mechanical identical replace. Also: rewriter prefers qwen-7b (7.4s, borderline vs 8s WALL_TIMEOUT because 7b is CPU-hybrid under the NIM VRAM squeeze) — prefer `qwen2.5-coder:3b` (~2-3s, fits GPU) for reliable per-prompt rewrites.

**General rule:** in PRISM hooks, ALWAYS use `127.0.0.1` not `localhost` for local services on Node. Node's IPv6-first resolution + IPv4-only servers = silent fast-fail. Applies to any localhost:PORT in a `fetch`.
