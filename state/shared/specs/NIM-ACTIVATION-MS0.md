# NIM-ACTIVATION-MS0 — make the built-but-orphaned NVIDIA NIM stack live

**Owner:** golf (claude-9876118b) · **Created:** 2026-05-18 · **Status:** spec / in-progress
**Goal source:** operator — "get nvidia nim working and synergized with prism os,
obsidian brain, system-viz, ai systems, prism awareness, and the full prism system"

## Root cause (3 gaps — fully diagnosed this session)

PRISM built a complete NIM client + 3-backend router but **nothing ever used it**:

1. **Server never provisioned** → ✅ **FIXED**. `mcp-server/scripts/nim-docker-launcher.mjs`
   (+ `.test.mjs`, 16/16) shipped this session — idempotent, honest fail-loud,
   mirrors `ollama-docker-launcher.mjs`. In-tree (absorbed into peer commit
   `405ac15be7`, files correct).
2. **Router orphaned** → `.claude/hooks/lib/local-llm-bridge.mjs`
   (NIM→vLLM→Ollama, capability-aware, bit-exact Ollama fallback) +
   `nim-hook-bridge.mjs` have **zero production consumers**. Only
   `local-llm-bridge` self-references `ollama-hook-bridge`. README/test are docs.
3. **Each offload hook has a bespoke INLINE Ollama client** → migrating to
   NIM-awareness is a per-hook *rewrite* (delegate inline HTTP → `queryLocalLLM`),
   NOT a one-line import swap. Confirmed: `ollama-auto-router.mjs:127` has its
   own `queryOllama`.

## Irreducible operator gate (cannot be automated)

NIM cannot serve until the operator does, ONCE:
1. Start Docker Desktop (`! "C:/Program Files/Docker/Docker/Docker Desktop.exe"`)
2. Free NGC key at build.nvidia.com → `setx NGC_API_KEY <key>` → new shell
3. `node mcp-server/scripts/nim-docker-launcher.mjs`

A hook must not start Docker or create an NVIDIA account key unattended.
The launcher already surfaces this exact remediation on `blocked-docker` /
`blocked-ngc-key` (R12 fail-loud, verified live).

## Units — U-NIM-MIGRATE-01..N (one hook per /loop iteration, per-file gate)

Each unit: rewrite one offload hook's inline Ollama client to call
`local-llm-bridge.queryLocalLLM(prompt, opts)` (+ `isLocalLLMAvailable`).
Safe to land incrementally — `local-llm-bridge` falls back to Ollama
bit-exactly when NIM is down, so behavior is unchanged until the operator
provisions NIM, then the whole fleet auto-uses it.

Per-unit checklist:
- [ ] Read the hook; identify its inline Ollama call + result shape.
- [ ] Replace inline HTTP with `queryLocalLLM` (map opts.hookType so the
      router's capability routing applies: classify/docstring/summary→NIM,
      reasoning/code→vLLM).
- [ ] Preserve the hook's existing result-shape contract exactly.
- [ ] Add/extend a node:test asserting the delegation + fallback path.
- [ ] 2-reviewer per-file scrutiny gate (pressure-permitting per
      [[feedback_no_parallel_agents_high_pressure]] — serialize if >92% commit).
- [ ] Commit `[MAIN] [NIM-ACTIVATION-MS0]/U-NIM-MIGRATE-NN: <hook>`.

Migration target list (≈12 — confirm with
`grep -l queryOllama .claude/hooks/*.mjs` minus the lib/ + router files):
ollama-auto-router · ollama-unified-semantic-router · ollama-prism-intelligence
· ollama-context-aggregator · ollama-route-recommender · ollama-obsidian-rag ·
ollama-session-continuity · ollama-terminal-watcher · mcp-route-suggest ·
stop-obsidian-memory-extract · claudemd-ollama-enforcer · grep-index-first
(verify each actually does inference offload vs just routing-advice before
migrating — some may be advice-only and out of scope).

## Synergy acceptance (the "synergized with the full prism system" bar)

- [ ] ≥1 offload hook proven routing through `local-llm-bridge` (exemplar).
- [ ] All true-offload consumers migrated; `grep -l "queryOllama\b" .claude/hooks/*.mjs`
      returns only `lib/` + `local-llm-bridge.mjs`.
- [ ] `localLLMHealth()` surfaced in fleet awareness / system-viz (a `nim`
      availability node alongside the existing `ollama` one) so the fleet
      *knows* when NIM is live.
- [ ] Doc-reflection: CLAUDE.md pointer + wiki entry + memory + this spec
      flipped to `complete` (per the 4-surface rule).
- [ ] Operator runbook (the 3 gate steps) in the CLAUDE.md pointer.

## Done ≠ deployed (R12 honesty)

Shipping all units makes the fleet **NIM-capable**; whether NIM actually
*serves* depends entirely on the operator gate above. The milestone is
"complete" when the code path is wired + tested + the operator has a
one-command activation — NOT contingent on NIM running this session.
