---
session: claude-001bd6c3
topic: ollama-localhost-systemic
slot: bravo
written_at: 2026-06-10T03:08:17.994Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-001bd6c3
status: active
---

# HANDOFF: claude-001bd6c3
Updated: 2026-06-10T03:08:17.994Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-001bd6c3

## STATE
Overnight session (slot bravo, cad-fusion-live-ms0) -- 7 commits: go-live+120b+RTK; U-OCTOPUS-LIVE-PRODUCER + OllamaClientEngine localhost->127 fleet fix; U-OLLAMA-FANOUT rate-limit primitive; U-CONSENSUS-DRAIN-LOCAL + PANEL-FIX (drain local-only, honest single-voice); U-REWRITER-LOCALHOST-FIX. Plus OLLAMA_URL env (8-caller bounded fix). THEME: the localhost->IPv6 bug is SYSTEMIC (33 files) and was the hidden cause of low Ollama utilization fleet-wide. Memories: reference_ollama_localhost_ipv6, reference_ollama_localhost_systemic, reference_ollama_fanout_ratelimit_fix, reference_consensus_drain_local (all 2026_06_09). DISCIPLINE held: validated each activation (rewriter live-tested), did NOT bulk-flip 33 files at 1am (blast radius), recorded systemic finding for deliberate per-lane rollout. Next iter: pick ONE more hardcoded-hook localhost fix + validate, OR await rate-limit clearing for ultracode discovery.

## RESUME
SYSTEMIC FIND this iter: 33 fleet files hardcode localhost:11434 -> all Ollama-unreachable on Windows (IPv6) -> explains the chronic 6-7 percent offload rate. FIXED: prompt-rewriter-ollama hook (U-REWRITER-LOCALHOST-FIX, live-validated conf-0.95 rewrite) + set OLLAMA_URL=http://127.0.0.1:11434 in settings.json (fixes 8 env-overridable callers at runtime, no rebuild, reversible). REMAINING (deliberate rollout, do NOT bulk-flip overnight -- GPU contention risk): 13 hardcoded hooks (.mjs, bravo/alpha lane, validate each like the rewriter), 7 hardcoded engines (need build:tsc, papa/india), 5 scripts. Full list in reference_ollama_localhost_systemic_2026_06_09. RATE-LIMIT still active -- no Claude workflows; direct tools + ollama-fanout only. effortLevel xhigh in settings:1807 still operator-gated.

## CONTEXT

