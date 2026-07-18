---
name: reference_ollama_localhost_systemic_2026_06_09
description: "SYSTEMIC: 33 fleet files hardcode http://localhost:11434 -> ALL Ollama-unreachable on this Windows box (localhost->IPv6 ::1, Ollama binds IPv4 127.0.0.1). Explains the chronic ~6-7% offload rate. Bounded fix applied (OLLAMA_URL env, fixes 8 env-overridable callers); 25 hardcoded files need per-file edits (13 hooks bravo-lane, 7 engines papa/india + rebuild)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.678Z
aliases: reference_ollama_localhost_systemic_2026_06_09
---


# Ollama localhost-IPv6: SYSTEMIC fleet audit (slot:bravo, 2026-06-09)

## The scope (grep `localhost:11434` over the fleet) -- CORRECTED 2026-06-09: NODE-FETCH-ONLY
**33 files** hardcode `http://localhost:11434`, but they are NOT all broken. **The bug is NODE-`fetch`-ONLY.** Node's `fetch` uses the first DNS result (IPv6 `::1`) -> Ollama binds IPv4 `127.0.0.1` -> UNREACHABLE (proven: node fetch localhost fails ~64ms, 127.0.0.1 connects ~9ms). But shell **`curl` does IPv4 fallback (Happy Eyeballs)** so `curl http://localhost:11434` **WORKS** (tested live: curl localhost + curl 127 both reach 10 models). So of the 33: **~11 use `curl` and are FINE** (ollama-auto-router, ollama-terminal-watcher, ...); **~22 use node `fetch`/`request` and ARE broken** -- those are the offload-rate culprits. DO NOT "fix" the curl ones (changing localhost->127 in a working curl hook is churn + risks the fleet treating working code as broken). The hardcode-guard's anchored regex (quote-immediately-before-URL) already excludes curl-command strings -- U-GUARD-CURL-PRECISION locks that. Breakdown of the raw 33 (curl vs fetch per-file confirm still needed for the engine list):
- **16 hooks** in `.claude/hooks/`: claudemd-ollama-enforcer, memory-system-init, ollama-auto-router, ollama-autostart, ollama-context-aggregator, ollama-engine-api-extractor, ollama-obsidian-rag, ollama-prism-intelligence, ollama-reviewer-second-opinion, ollama-route-recommender, ollama-session-continuity, ollama-terminal-watcher, ollama-unified-semantic-router, optimal-context-inject, prompt-rewriter-health-warn, prompt-rewriter-ollama (FIXED this session, U-REWRITER-LOCALHOST-FIX).
- **5 scripts** in `scripts/`: checkin-recall, embed-engines-into-tribal-index, prism-hybrid, lib/hybrid-retrieval, lib/path-embed.
- **12 engines** in `mcp-server/src/engines/`: AISystemRouterEngine, LatheLoRAOllamaDeployerEngine, LocalAwarenessRouterEngine, LocalCommitMessageEngine, LocalHookAggregatorEngine, LocalLearningEngine, LocalValidationEngine, OllamaCAMIntegrationEngine, OllamaClientEngine (FIXED, U-OCTOPUS-LIVE-PRODUCER), OllamaHookBridgeEngine, OllamaIntegrationEngine, QdrantMemoryEngineSingleton.

## Env-overridability (decides one-line-fix vs per-file edit)
Only **8 of 33** read `process.env.OLLAMA_URL` (env-overridable): 3 hooks + 5 engines (LocalAwarenessRouter/LocalCommitMessage/LocalHookAggregator/LocalLearning/LocalValidation). The other **25 hardcode** `localhost` directly (13 hooks + 7 engines + the scripts) and need per-file edits.

## Bounded fix applied (this session)
Set `OLLAMA_URL=http://127.0.0.1:11434` in `C:/Users/wompu/.claude/settings.json` env (mirrored to H:, both parse-valid; env-resolved reach validated = 10 models). This fixes the **8 env-overridable callers at runtime, no file edit / no rebuild** -- live for NEW sessions (running peers keep their env until restart). It is CORRECT (127.0.0.1 is factually where host-native Ollama runs -- [[reference_ollama_9p_bind_fix_2026_05_29]]) + trivially reversible (remove the key) + the worst case is MORE LOCAL load (the operator's stated goal), never breakage. Plus the 2 source fixes shipped this session (prompt-rewriter-ollama hook + OllamaClientEngine).

## Remaining work (deliberate rollout -- NOT bulk-flipped overnight; blast radius)
- **13 hardcoded hooks** -> per-file `localhost`->`127.0.0.1` default (pure .mjs, no rebuild, mostly fail-soft). BRAVO/alpha lane. Each should default to 127 AND prefer `process.env.OLLAMA_URL`. Do MEASURED (not all-at-once) -- activating N Ollama-on-every-prompt hooks across ~10 sessions risks GPU /api/chat contention ([[feedback_alpha_ollama_offline_degradation]]: /api/tags answers while /api/chat hangs under load). Validate each like the rewriter (live skip_reason check).
- **7 hardcoded engines** -> default 127 + env, then `npm run build:tsc` (NOT build:fast -- only build:tsc emits the per-file dist/engines/*.js that scripts load directly; see [[reference_ollama_localhost_ipv6_2026_06_09]]). PAPA/INDIA lane.
- **5 scripts** -> per-file edit (bravo/papa).

## Lesson
A single host-environment bug (Windows localhost->IPv6) silently broke an ENTIRE feature surface (33 callers) and depressed a headline metric (offload rate) for weeks while individual chats mis-diagnosed it as timeouts / GPU contention / model-roster staleness. When you find a hardcoded `localhost` Ollama bug, GREP THE WHOLE FLEET -- it is never just one file. Prefer the env-var bounded fix (correct + reversible + no blast-radius-gamble) before per-file edits.

## CRITICAL (R8/R12 correction): this was FIRST found 2026-05-30, the fix REGRESSED
[[reference_ollama_hooks_localhost_ipv6_bug_2026_05_30]] discovered this EXACT bug 10 days earlier ("fleet-wide, all 26 chats", same IPv6 ::1 root cause) and supposedly fixed it fleet-wide. Yet 33 files STILL hardcode localhost on 2026-06-09. So a per-file localhost->127 sweep does NOT hold -- it regresses (new hooks/engines get written with the localhost default, or the fix was partial). THE DURABLE FIX is two-layer: (1) the OLLAMA_URL env var (done this session -- covers every env-overridable caller fleet-wide, regression-proof for those), AND (2) a LINT/PreToolUse GUARD that blocks any NEW `http://localhost:11434` hardcode (catches the regression vector at write time). Layer 2 is the missing piece -- without it the 05-30 -> 06-09 regression repeats. (Owner: bravo/alpha hook lane; next unit.) My earlier reference_ollama_localhost_ipv6_2026_06_09 wrongly called the 06-09 instance "first" -- corrected: 05-30 is first, 06-09 is the regression + systemic rollup.
