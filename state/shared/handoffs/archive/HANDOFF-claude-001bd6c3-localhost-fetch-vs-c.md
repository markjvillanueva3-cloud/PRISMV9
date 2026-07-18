---
session: claude-001bd6c3
topic: localhost-fetch-vs-curl
slot: bravo
written_at: 2026-06-10T03:35:09.708Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-001bd6c3
status: active
---

# HANDOFF: claude-001bd6c3
Updated: 2026-06-10T03:35:09.708Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-001bd6c3

## STATE
Overnight bravo, cad-fusion-live-ms0, ~10 commits. LOCALHOST-IPv6 campaign: the bug is NODE-FETCH-ONLY (corrected from 'all 33'). FIXED node-fetch callers: prompt-rewriter-ollama, optimal-context-inject, OllamaClientEngine + claudemd-enforcer default (absorbed) + OLLAMA_URL env (8 callers) + the WRITE-TIME GUARD (U-LOCALHOST-HARDCODE-GUARD, durable layer-2, fetch-vs-curl precise, 12/12). curl hooks (ollama-auto-router/terminal-watcher) NOT broken, left alone. Plus go-live, octopus-producer, ollama-fanout, consensus-drain x2. Memories: reference_ollama_localhost_systemic (corrected to node-fetch-only scope), +5 others. DISCIPLINE: empirical-tested curl-vs-fetch before fixing (avoided churning 11 working hooks), corrected own overcounted scope, durable guard. Next: audit the ~22 node-fetch files (confirm fetch not curl per-file), or ollama-auto-router cold-model warmup, or await rate-limit clear for ultracode discovery.

## RESUME
R12 SCOPE CORRECTION this iter (U-GUARD-CURL-PRECISION): the localhost->IPv6 bug is NODE-FETCH-ONLY. Shell curl does IPv4 fallback + WORKS (tested). So of the 33 localhost files, ~11 use curl (FINE: ollama-auto-router, ollama-terminal-watcher) + ~22 use node fetch (the real broken ones). DO NOT fix the curl hooks -- they work. The hardcode-guard already excludes curl-command strings (anchored regex), now test-locked. NEXT dormant-feature candidates (verify fetch-vs-curl FIRST): the ~22 node-fetch localhost files (5 scripts: checkin-recall, embed-engines-into-tribal-index, prism-hybrid, lib/hybrid-retrieval, lib/path-embed -- check if fetch or curl; 7 hardcoded engines need build:tsc papa/india). ollama-auto-router is NOT localhost-broken; its non-injection is a cold-model timeout (additive+fail-soft, low priority). RATE-LIMIT active: direct tools + ollama-fanout only.

## CONTEXT

