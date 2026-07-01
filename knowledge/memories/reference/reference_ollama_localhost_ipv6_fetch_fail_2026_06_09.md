---
name: reference_ollama_localhost_ipv6_fetch_fail_2026_06_09
description: "Windows: Node fetch('http://localhost:11434') ECONNREFUSEDs (undici -> IPv6 ::1, Ollama binds IPv4). Use 127.0.0.1. Bug in OllamaTaskOffloaderEngine found by live-validating prism_local local_generate."
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.678Z
aliases: reference_ollama_localhost_ipv6_fetch_fail_2026_06_09
---


# Windows: use `127.0.0.1` not `localhost` for Node-fetch to a loopback service (slot:india 2026-06-09)

**Bug:** `OllamaTaskOffloaderEngine.ts` hardcoded `http://localhost:11434` for both its `/api/tags` install-probe (line ~178) and the `/api/chat` generation call (line ~306). On this Windows host (DESKTOP-N7MI1VB), Node's global `fetch` (undici) resolves `localhost` to IPv6 `::1` **first**; Ollama binds IPv4 only, so the connection ECONNREFUSEDs in ~120ms (NOT a timeout -- an immediate refuse). Effect: every Node-`fetch` path to Ollama via `localhost` silently failed -- `local_generate`, `mlDispatcher`'s `offload_execute`, and the install-probe that fills `installedModels` (so `selectModel`'s install-gate saw an empty set too).

**Why it hid:** `curl http://localhost:11434` returns 200 (curl is dual-stack, falls back to IPv4). So a manual curl check "proves Ollama is up" while Node-fetch to the same URL refuses. The india miner worked the whole time because it uses `http://127.0.0.1:11434` directly.

**Repro (definitive):**
```
node -e "fetch('http://localhost:11434/api/tags').then(r=>console.log(r.status)).catch(e=>console.log('ERR',e.cause?.code))"
# -> ERR ECONNREFUSED   (on this host)
node -e "fetch('http://127.0.0.1:11434/api/tags').then(r=>console.log(r.status))"
# -> 200
```

**Fix:** both URLs -> `http://127.0.0.1:11434`. Caught by LIVE-validating the new `prism_local local_generate` action (R15: validate on live data -- the type-check + unit tests were all green; only the live round-trip exposed it). After the fix, the dispatcher round-trip returned real gpt-oss:20b text.

**Generalizable lesson:** on Windows, for Node `fetch`/`http` to a LOCAL service, prefer the literal IPv4 `127.0.0.1` over `localhost` -- `localhost`-> `::1` resolution + an IPv4-only listener is a silent ECONNREFUSED. Convention in this repo (miner, ask-ollama) is already `127.0.0.1`; match it. (curl/browser dual-stack masks the bug.)

Related: [[reference_local_llm_mcp_route_2026_06_09]] (the local_generate ship), [[reference_india_transcript_mine_2026_06_09]] (miner uses 127.0.0.1).
