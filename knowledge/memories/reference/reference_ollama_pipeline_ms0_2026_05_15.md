---
name: reference-ollama-pipeline-ms0-2026-05-15
description: "OLLAMA-PIPELINE-MS0/U-OPM01 (commit c34405927) — wired Ollama+Docker into /checkin /forge-audit /rgs pipelines after surveying that 21 hooks + 8 engines existed but skills had ZERO ollama mentions (9% offload rate vs 30% healthy target). Ships scripts/ollama-docker-health.mjs (CLI probe), .claude/hooks/ollama-pipeline-injector.mjs (UserPromptSubmit T2 4000ms — concrete model+saving recommendations for 9 pipeline triggers), .claude/hooks/ollama-prewarm-on-pipeline.mjs (UserPromptSubmit T3 3000ms — detached curl /api/generate with keep_alive=10m, 10-min per-model cooldown). Settings.json wired in C: (auto-mirrored to H:). Kill switches: PRISM_OLLAMA_PIPELINE_INJECT=0 / PRISM_OLLAMA_PREWARM_DISABLE=1."
aliases: reference_ollama_pipeline_ms0_2026_05_15
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.239Z
---


# OLLAMA-PIPELINE-MS0/U-OPM01 (2026-05-15)

**Commit:** `c34405927` (slot bravo, claude-6eac1b66, 4 files / 559 insertions).

## Originating user directives

1. "incorporate skill, script, hook pipeline usage of ollama and docker. we have a bunch of features of ollama and docker to help improve our development but I think it all stays idle"
2. "wire them into the checkin pipelines other slash commands that need it like forge and rgs"
3. "think of ways we can utilize them for tool calls to improve efficiency and accuracy"

## The discovery that shaped the work

Surveyed `H:/prism/.claude/hooks/*ollama*.mjs` and `mcp-server/src/engines/*Ollama*.ts` — found **21 hooks + 8 engines** already shipped. Then `grep -c "Ollama" .claude/commands/{forge-audit,rgs,forge-triple,checkin}.md`:

| Skill | Ollama mentions |
|-------|-----------------|
| forge-audit.md | **0** |
| rgs.md | **0** |
| forge-triple.md | **0** |
| forge2.md | 1 |
| checkin.md | 3 (mostly references) |

Offload stats: 5 offloaded vs 54 kept-on-Claude (**9%** offload rate — 30% healthy threshold per documented CLAUDE.md target). 6 models loaded (qwen2.5-coder 7b/14b/32b, deepseek-r1:14b, llama3.2-vision:11b, nomic-embed-text) sitting **idle**. The infrastructure was there; the SKILLS didn't reference it.

## What shipped

| File | Status | Role |
|------|--------|------|
| `scripts/ollama-docker-health.mjs` | NEW (185 LOC) | CLI probe — Ollama + Docker + Qdrant + Postgres + Prometheus in 1 line (`--text`/`--json`/`--require gate`). Uses curl subprocess — node `fetch` and `http.get` both fail under parallel-localhost-probe contention on Windows. |
| `.claude/hooks/ollama-pipeline-injector.mjs` | NEW (171 LOC, T2, 4000ms) | UserPromptSubmit hook. Detects 9 pipeline triggers (`/forge-audit`, `/rgs`, `/scrutinize`, `/dedup`, `/precompact`, `/deep-search`, `/pdf-learn`, `/close-out-audit`, `/forge-triple`). Injects concrete model + saving for each phase. |
| `.claude/hooks/ollama-prewarm-on-pipeline.mjs` | NEW (179 LOC, T3, 3000ms) | UserPromptSubmit hook. When trigger fires AND model NOT warm, spawns detached `curl /api/generate` with `keep_alive=10m`. 10-min cooldown stamp per-model in `.claude/cache/ollama-prewarm/`. Fire-and-forget. |
| `.claude/commands/checkin.md` | MODIFIED (+24) | New §6g local-compute health section + `local_compute:` line in §Report. |
| `.claude/commands/forge-audit.md` | MODIFIED (gitignored, on-disk) | New "Ollama + Docker routes" section: Phase 0 awareness summarize via qwen2.5-coder:7b, Phase 1 reviewer-D via deepseek-r1:14b, Phase 4 wiki dedup via nomic-embed + Qdrant, Phase 5 wiki write via qwen-14b. |
| `.claude/commands/rgs.md` | MODIFIED (gitignored, on-disk) | New "Ollama + Docker routes" section: brainstorm via deepseek-r1:14b, utilize via nomic-embed semantic search, generate stage-4 via qwen-32b. |
| `C:/Users/Mark Villanueva/.claude/settings.json` | MODIFIED | Both new hooks wired into UserPromptSubmit chain after ollama-task-offloader. Auto-mirrored to H: by c-to-h-mirror hook. |

## Wiring matrix

| Pipeline | Model | Saving |
|----------|-------|--------|
| `/checkin` §6g | qwen2.5-coder:7b (probe only) | visibility (operator) |
| `/forge-audit` Phase 0 summarize | qwen2.5-coder:7b | ~5K tokens/run |
| `/forge-audit` Phase 1 reviewer-D | deepseek-r1:14b | +cross-domain reasoning |
| `/forge-audit` Phase 4 dedup | nomic-embed-text + Qdrant | -90% manual review |
| `/forge-audit` Phase 5 wiki draft | qwen2.5-coder:14b | -2K tokens |
| `/rgs brainstorm` 1st pass | deepseek-r1:14b | -3K tokens |
| `/rgs utilize` action search | nomic-embed-text + Qdrant | better recall vs grep |
| `/rgs generate` stage 4 test plan | qwen2.5-coder:32b | -draft boilerplate |
| `/scrutinize` reviewer-D | qwen2.5-coder:32b | +1 perspective (free) |
| `/precompact` RESUME draft | qwen2.5-coder:14b | -post-compact budget |
| `/dedup` semantic pass | nomic-embed-text | catch renamed dupes |

## Why curl subprocess (not fetch)

Discovered empirically: `curl -fsS http://127.0.0.1:11434/api/tags` returns in 1s, but node's global `fetch` (undici) AND `http.get` both abort/timeout when 6+ probes fire in parallel on Windows. A single `http.get` works (152ms), but `Promise.all([probe1, probe2, ...])` all time out at 4s. Suspected undici connection-pool starvation or Windows IPv6/IPv4 resolution race. curl subprocess sidesteps both — slightly higher per-call latency (~50ms spawn overhead) but reliable under contention.

## Why this is additive, not replacing

The existing 21 Ollama hooks (`ollama-task-offloader`, `ollama-auto-router`, `ollama-route-pretooluse`, `ollama-route-recommender`, `ollama-reviewer-second-opinion`, `ollama-unified-semantic-router`, `ollama-skill-suggester`, `ollama-prism-intelligence`, `ollama-obsidian-rag`, etc.) fire on harness events automatically — they're good. The gap was that SKILLS (the long-form `.md` runbooks invoked by /forge-audit, /rgs) didn't reference Ollama. Operators reading the skill saw no Ollama routes. Chats post-/compact re-derived from skill text and missed the wiring.

The new injector hook makes the skill-level wiring **deterministic and surface-visible on every invocation** — the same `/forge-audit run-3` fires the same Ollama recommendations as run-1, regardless of skill text drift. The prewarm hook hides the cold-load latency (3s for qwen-7b, 30s for qwen-32b) by warming during Claude's prompt-processing window.

## Smoke evidence

```
$ echo '{"prompt":"/forge-audit quality pass"}' | node H:/prism/.claude/hooks/ollama-pipeline-injector.mjs
{"continue":true,"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"## 🧠 Ollama pipeline routes for /forge-audit\n\n_Ollama is **up** · 0 model(s) warm in VRAM..."}}

$ echo '{"prompt":"/scrutinize this code"}' | node H:/prism/.claude/hooks/ollama-prewarm-on-pipeline.mjs
{"continue":true,"suppressOutput":true}

$ node H:/prism/scripts/ollama-docker-health.mjs
local-compute: ✓ Ollama 6 models · 0 warm · ✗ Docker spawnSync docker ETIMEDOUT · ✗ Qdrant · ✗ Postgres · ✗ Prometheus
  hint: no models warm in VRAM — first hook call will cold-start (3-5s latency)
```

## Knobs

| Knob | Default | Effect |
|------|---------|--------|
| `PRISM_OLLAMA_PIPELINE_INJECT` | `1` | Pipeline-injector hook on/off |
| `PRISM_OLLAMA_PREWARM_DISABLE` | `0` (enabled) | Set `=1` to disable auto-warmup |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama daemon URL (shared with task-offloader) |

## Known limits

- **Docker engine down at ship time** — Docker Desktop responded with HTTP 500 to `docker ps` during ship verification. Qdrant/Postgres/Prometheus depend on Docker so all show down. The health probe reports this accurately; the launcher (`mcp-server/scripts/ollama-docker-launcher.mjs`) is the remediation path. Not a bug in this ship.
- **qwen-32b cold load = 30s** — the prewarm hook fires-and-forgets; if a chat invokes /scrutinize immediately, the model may still be loading. Cooldown stamp prevents re-warming. Accepted trade-off — most chats have multi-second Claude reasoning between prewarm fire and first Ollama call.
- **Settings.json edits in C: only** — H:/.claude/settings.json is the auto-mirrored copy; the c-to-h-mirror hook keeps it in sync. Never edit H:/.claude/settings.json directly per project doctrine.

## Related

- [[reference_subagent_per_task_presearch_2026_05_15]] — sister feature on the same milestone family (CHECKIN-UPGRADE-MS0 / OLLAMA-PIPELINE-MS0)
- [[reference_master_index_surface]] — search-first discipline that this hook complements
- [[feedback_ollama_token_routing]] — the standing doctrine this milestone applies
- [[feedback_reflect_all_changes_post_update]] — 4-surface doc reflection rule applied here
- [[feedback_conflict_fork_rule]] — used when staging-lane guard blocked
