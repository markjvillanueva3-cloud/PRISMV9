---
title: OLLAMA-PIPELINE-MS0 — Wire local LLM into skill pipelines
slug: ollama-pipeline-ms0
kind: architecture
domain: ai-routing
status: shipped
shipped_at: 2026-05-15
shipped_by: claude-6eac1b66 (slot bravo)
commit: c34405927
milestone: OLLAMA-PIPELINE-MS0
unit: U-OPM01
related:
  - master-index-surface
  - awareness-stack
  - subagent-per-task-presearch
---

# OLLAMA-PIPELINE-MS0

Wire the 21-hook / 8-engine Ollama infrastructure into the actual SKILL pipelines (`/forge-audit`, `/rgs`, `/forge-triple`, `/scrutinize`, `/dedup`, `/precompact`, `/deep-search`, `/pdf-learn`, `/close-out-audit`). Closes the gap where 6 local models sat idle while Claude paid token cost for work qwen could do for free.

## Problem

Pre-ship audit showed:

- **21 Ollama hooks** (`.claude/hooks/ollama-*.mjs`) — all firing on harness events
- **8 Ollama engines** (`mcp-server/src/engines/Ollama*.ts`) — all dispatcher-wired
- **6 models loaded**: qwen2.5-coder (7b/14b/32b), deepseek-r1:14b, llama3.2-vision:11b, nomic-embed-text
- **0 Ollama mentions** in `/forge-audit`, `/rgs`, `/forge-triple` skill .md files
- **9% offload rate** (5/59 prompts) vs documented 30% healthy target

The infrastructure existed. The skills didn't reference it. Operators reading the skill markdown saw no Ollama routes, and post-`/compact` chats re-derived from skill text and missed the wiring entirely.

## Solution

Three load-bearing artifacts plus skill-doc updates:

### 1. `scripts/ollama-docker-health.mjs` — health probe

Single-shot CLI probe over Ollama daemon + Docker engine + Qdrant + Postgres + Prometheus.

```bash
node H:/prism/scripts/ollama-docker-health.mjs           # --text default, 1-line summary
node H:/prism/scripts/ollama-docker-health.mjs --json    # machine-readable
node H:/prism/scripts/ollama-docker-health.mjs --require ollama,qdrant  # exit 1 on missing
```

Uses curl subprocess. Node's global `fetch` and even `http.get` both fail under parallel-localhost-probe contention on Windows — a single probe works (152ms via http.get) but `Promise.all([probe1, probe2, ...probe6])` all abort at 4s. Suspected undici connection-pool starvation or IPv6/IPv4 resolution race. curl per-call sidesteps both reliably.

### 2. `.claude/hooks/ollama-pipeline-injector.mjs` — advisory injection

UserPromptSubmit hook, T2, timeout 4000ms. Pattern-matches 9 pipeline trigger commands and injects an `## 🧠 Ollama pipeline routes for /<pipeline>` block with concrete model + saving recommendations per phase.

Detected triggers (regex over the prompt):
- `/forge-audit` `/forge2` `/forge3` → forge-audit routes
- `/rgs` `/rgs2` `/rgs-sync` `/rgs3` → rgs routes
- `/forge-triple` → engine+test boilerplate routes
- `/scrutinize` `/scrutiny-3way` `/scrutiny-batch` → reviewer-D route
- `/dedup` → semantic dedup route
- `/precompact` → handoff draft route
- `/deep-search` → reasoning pass route
- `/pdf-learn` `/video-learn` `/doc-learn` → vision + extract routes
- `/close-out-audit` → envelope diff summarize route

Auto-skip path:
- `PRISM_OLLAMA_PIPELINE_INJECT=0` → return `{continue:true,suppressOutput:true}`
- No matching trigger → same silent skip
- Ollama down → block STILL emits, but prefixed with auto-start hint

### 3. `.claude/hooks/ollama-prewarm-on-pipeline.mjs` — latency hider

UserPromptSubmit hook, T3, timeout 3000ms. When a pipeline trigger matches AND the corresponding primary model is NOT warm in VRAM (`/api/ps` check), spawn a detached `curl /api/generate` with `keep_alive=10m` and `num_predict=1`. The model warms while Claude is still processing the user prompt (typically 2-4s reasoning window before first tool call), hiding the cold-start latency.

Per-model cooldown stamp lives at `.claude/cache/ollama-prewarm/<model_safe_name>.iso` — 10 min default. A chat firing `/forge-audit` twice in 30s doesn't re-warm.

Primary model per pipeline:

| Pipeline | Pre-warmed model | Cold load |
|----------|------------------|-----------|
| `/forge-audit`, `/forge2`, `/rgs*`, `/scrutinize`, `/deep-search`, `/pdf-learn`, `/video-learn`, `/close-out-audit` | qwen2.5-coder:7b | ~3s |
| `/forge-triple`, `/precompact` | qwen2.5-coder:14b | ~5s |
| `/dedup` | nomic-embed-text | <1s |

`deepseek-r1:14b` is **intentionally NOT auto-warmed** — 9GB cold-load is too aggressive for advisory-tier warming; reviewer-D role is opt-in via operator request.

## Wiring

Settings.json edits in `C:/Users/Mark Villanueva/.claude/settings.json` (auto-mirrored to `H:/.claude/settings.json` by c-to-h-mirror hook). Both hooks inserted into UserPromptSubmit chain immediately after `ollama-task-offloader.mjs` (the existing T2 anchor):

```
UserPromptSubmit:
  ...
  ollama-task-offloader.mjs       (T2, existing — keep/offload decision)
  ollama-pipeline-injector.mjs    (T2, NEW — advisory block on pipeline match)
  ollama-prewarm-on-pipeline.mjs  (T3, NEW — fire-and-forget warm)
  comprehensive-build-enforce.mjs (existing — keep position)
  ...
```

## Skill-doc updates

- `.claude/commands/checkin.md` (tracked) — new §6g local-compute health section + `local_compute:` line in §Report.
- `.claude/commands/forge-audit.md` (gitignored, local-only) — new "Ollama + Docker routes (shipped 2026-05-15 — OLLAMA-PIPELINE-MS0)" section with Phase 0/1/4/5 routing table.
- `.claude/commands/rgs.md` (gitignored, local-only) — same pattern: brainstorm → deepseek-r1, utilize → nomic-embed+Qdrant, generate stage 4 → qwen-32b.

The injector hook is the canonical source — skill docs are advisory documentation for operators reading the markdown. The hook fires regardless of skill-text drift.

## Smoke evidence

```text
$ echo '{"prompt":"/forge-audit quality pass"}' | node ollama-pipeline-injector.mjs | head -c 400
{"continue":true,"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":
"## 🧠 Ollama pipeline routes for /forge-audit\n\n_Ollama is **up** · 0 model(s) warm in VRAM
(none — first call cold-starts)_.\n\n- **Phase 0** (awareness summarize) — call
`qwen2.5-coder:7b` to compress the 4 awareness layers into <500 tokens before Phase 1 fans out.
Saves ~5K tokens/run.\n- ...

$ echo '{"prompt":"/scrutinize this code"}' | node ollama-prewarm-on-pipeline.mjs
{"continue":true,"suppressOutput":true}

$ node ollama-docker-health.mjs
local-compute: ✓ Ollama 6 models · 0 warm · ✗ Docker spawnSync docker ETIMEDOUT · ✗ Qdrant · ✗ Postgres · ✗ Prometheus
  hint: no models warm in VRAM — first hook call will cold-start (3-5s latency)
```

## Knobs

| Variable | Default | Effect |
|----------|---------|--------|
| `PRISM_OLLAMA_PIPELINE_INJECT` | `1` (enabled) | Injector hook on/off |
| `PRISM_OLLAMA_PREWARM_DISABLE` | `0` (enabled) | Set `=1` to disable auto-warmup |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama daemon URL — IPv4-pinned to avoid the Windows IPv6 resolution race |

## Known limits

- **Docker engine down at ship time** — Docker Desktop returned HTTP 500 to `docker ps` during ship verification. Qdrant/Postgres/Prometheus depend on Docker so all show down. The health probe reports this accurately; the launcher (`mcp-server/scripts/ollama-docker-launcher.mjs --services=ollama --skip-pull` etc.) is the remediation path. Not a regression in this ship.
- **qwen-32b cold load = ~30s** — the prewarm hook fires-and-forgets; if a chat invokes `/scrutinize` immediately after firing the warm, the model may still be loading. Cooldown stamp prevents re-warming. Accepted trade-off — most chats have multi-second Claude reasoning between prewarm fire and first Ollama call.
- **Settings.json — C: only** — H:/.claude/settings.json is the auto-mirrored copy; c-to-h-mirror hook keeps it in sync. Never edit H: directly per project doctrine.

## Related

- [[master-index-surface]] — the search-first discipline this hook complements
- [[awareness-stack]] — 5 other awareness layers this slots into
- [[subagent-per-task-presearch]] — sister feature on the same milestone family
- [[session-continuity-stack]] — auto-resume + terminal-pin context
