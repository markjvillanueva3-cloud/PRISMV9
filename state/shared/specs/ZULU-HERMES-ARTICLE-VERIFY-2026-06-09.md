# ZULU/Hermes build verification vs the 8 agentic-architecture articles
**Date:** 2026-06-09 · **Slot:** zulu (claude-86373eb3) · **Method:** all 8 articles full-text captured
(fxtwitter API for the 2 login-walled X articles; canonical mirrors for 2; golf's distillation for 3) →
gpt-oss:120b cross-reference (58s, `H:/tmp/xart/verify-report.md`) → Claude fact-check of every claimed
gap against the repo → LIVE cron-chain validation. Articles archived: `state/shared/articles/2026-06-09-*.md`.

## Verdicts (corrected)
| Area | Verdict | Basis |
|---|---|---|
| ZULU fleet orchestration | **BUILT-CORRECT, actuation operator-gated** | All arch-spec phases P0-P5 shipped (verified on disk). Gap audit G1-G13 fixed except G10/G12 (operator actions, by design). |
| Harness / dynamic workflows | **BUILT-CORRECT** | Workflow tool: journaled resume, worktree isolation, all 6 canonical patterns; `emitWorkflowScript()` codegen. Adversarial verify = scrutiny 2-arm/3-of-3 with independent agents. |
| Compounding loops | **BUILT-PARTIAL** | ms→weekly timescales covered (hooks, Stop-stream, /loop, 5-min reaper, nightly dream, weekly reflection, galaxy crons). Gap: cron→cron output chaining (`context_from` pattern) not used PRISM-side. |
| Obsidian self-learning OS | **BUILT + NEWLY WIRED (this session)** | PRISM-side loops existed; Hermes-side was EMPTY (no memories, no vault skills, no cron, gateway down). Now wired — see below. |

## Ollama-claimed gaps OVERTURNED by fact-check (machinery exists)
- Classifier routing → `ai_route_task`/`ai_classify_task`/`complexity_route` (dev+intelligence dispatchers), `aiSystemRouterEngine`.
- Session search → `coord_sqlite` (contextDispatcher:113), `semantic_search`/`qdrant_vector_search` (memoryDispatcher), tribal BM25, 602-transcript miner. (Not literal SQLite-FTS-over-transcripts; functional equivalent.)
- Skill curation → `skill_audit` (devDispatcher:6855), `skill_refinement_digest` (:6881), `skill_quality_registry_build`, skill_tier_*.
- Inbox processor → `inbox_promote_now`/`inbox_prune_now` (memoryDispatcher:113-114) + `prism_intake:webhook_ingest`.
- Memory consolidation → `consolidate` (memoryDispatcher:267) + `knowledge_distillation_scan/run`.
- Error fallback → `dead_letter_queue_manage` (devDispatcher:612), `error_ledger_append` (guardDispatcher:45), error-pattern-promote Stop hook.
- Thinking partner → `contradiction_check` + `emerging_thesis` + `postmortem_create` (memoryDispatcher).
- Hard turn cap → Hermes `agent.max_turns: 60` (config.yaml) + /loop targets + token budgets.
- Connection finder / weekly synthesis / morning brief → dream-cycle-synth (nightly Jaccard), self-reflect-populater (weekly), slot-brief-inject + daily_brief_get.

## TRUE remaining gaps (ranked)
1. **P0 (operator, 2 actions):** (a) UAC-approve `hermes gateway install` → boot persistence for the gateway
   (currently running detached, PID 85536 — dies at logoff). (b) Register `PRISM Zulu Orchestrator` task (G10)
   + set `zuluOptIn` on slots (G12) when ready for actuation.
2. ~~**P1 — GEPA-style offline skill optimization**~~ **CLOSED 2026-06-10 (zulu overnight):**
   `scripts/hermes-skill-gepa.mjs` — reads Hermes `cron/output/<job>/*.md` Response/Error tails +
   jobs.json outcomes + the live SKILL.md → Ollama (qwen2.5-coder:32b, gpt-oss:20b fallback) →
   staged `state/shared/specs/SKILL-CANDIDATE-GEPA-<date>-<skill>.md` (always NEEDS-REVIEW, never
   touches the live skill) + `skill-loop-verdicts.jsonl` audit line. 6/6 parser tests
   (`hermes-skill-gepa.test.mjs`); live-validated against the 4 real 2026-06-09 failure traces;
   first candidate staged `SKILL-CANDIDATE-GEPA-20260610-prism-vault-loop.md`. Re-run after each
   batch of real cron runs accumulates (the seed corpus was infra failures; laziness traces will
   sharpen it).
3. ~~**P2 — cron output chaining** (`context_from`)~~ **CLOSED 2026-06-10 (zulu overnight):** wired in
   `cron/jobs.json` — morning-brief (044ec1701ace) ← inbox-sweep (61374a47c8bd); weekly-review
   (bdae7a31d99e) ← [morning-brief, inbox-sweep]. Prompts updated to treat chained context as
   yesterday's state (build on it, don't re-do). Scheduler injects fail-soft when no output exists
   (scheduler.py:1152-1195). Verified `hermes cron list` parses + gateway running.
4. **P2 — single review queue:** aggregate hermes-outputs + staged skill candidates + pending approvals into
   one operator view (reuse AGENT_WORKBOARD).
5. **P2 — Curator lifecycle:** `skill_audit` exists but no inactivity-triggered stale(30d)→archive(90d)
   daemon with snapshot/rollback + never-delete (Hermes Curator pattern).

## Hermes→Obsidian self-learning loop — WIRED THIS SESSION (Task #35)
Hermes-side was empty: memories/ had NO files, zero PRISM skills, zero cron jobs, gateway down.
Shipped (all on disk, C:/Users/wompu/AppData/Local/hermes/):
- `memories/MEMORY.md` (PRISM env facts, vault map, tool names, write-lane rule) + `memories/USER.md` (Mark profile).
- `skills/prism/prism-vault-loop/SKILL.md` — READ→ACT→WRITE-BACK contract + UNATTENDED MODE (anti-laziness)
  + exact `mcp_prism_prism_*` tool names + 3 job definitions (morning brief / inbox sweep / weekly self-review).
- 3 cron jobs (ids 044ec1701ace, 61374a47c8bd, bdae7a31d99e) @ 6:07 daily / 20:23 daily / Sun 19:11,
  deliver local, skill-attached, model `claude-opus-4-8`.
- `config.yaml` mcp_servers += `prism-vault-fs` (stdio @modelcontextprotocol/server-filesystem scoped
  H:/prism/knowledge) — hot-reloaded; log confirms "105 tool(s) from 2 server(s)".
- Gateway daemon STARTED (detached, PID 85536) — `cron status`: "cron jobs will fire automatically".

### Live validation (R12 — full honesty)
| Run | Model | Result |
|---|---|---|
| tick 1 | gpt-oss:20b | Loaded skill+105 MCP tools, then LISTED tools and asked "which would you like?" — agentic laziness (Article 1 failure #1). |
| tick 2 | gpt-oss:120b | 4 API calls: terminal env + tool_search executed, then bailed with "I'm ready" (76 tokens). Local models unreliable unattended → gap #2. |
| tick 3 | claude-opus-4-8 | HTTP 400 "out of extra usage" — quota window exhausted at 21:31; non-retryable. |
| tick 4 | qwen2.5-coder:32b | Rejected pre-flight: 32K ctx < Hermes 64K floor. |
**Chain proven:** scheduler ✓ skill-load ✓ MCP-tools ✓ model-execution ✗(today, quota). First live proof =
2026-06-10 06:07 run (fresh quota window) → check `cron/output/044ec1701ace/` + `knowledge/hermes-outputs/notes/`.

## Strengths beyond the articles (Ollama's list, spot-checked)
Slot-less master with authority gate + no gate exemptions · 34 galaxy brains + master digest ·
7 recall injectors fusing memory+wiki+tribal pre-turn · nightly Jaccard dream synthesis ·
operator-gated skill promotion (staging, dedup-Jaccard 0.4) · write-lane vault collision protection ·
26-slot worktree isolation (stronger than Hermes profiles) · units-first + S(x) safety doctrine.

## Appendix: live fleet test-drive (2026-06-09 ~22:00, operator-directed)
Exercised the orchestration machinery against the 13 open slots (alpha bravo charlie golf sierra papa delta echo hotel india oscar romeo kilo):
- **Fleet state read:** 12/13 alive; delta CRASHED (15min), golf STALE. Surfaced to golf via brief + bus.
- **Awareness pipeline:** ran; per-slot role/domain/queue fingerprints (india q=380, bravo q=365, delta q=340). All success priors 50% (no outcome history yet — outcomes teach the router).
- **Orchestrator sweep --dry-run:** planned decisions for 14 slots (12 compact-preserve, 2 noop); gates held everywhere; G13 awareness fed decisions; single-instance lock held under concurrency.
- **DEFECT (P1, routed to bravo):** actuation fails `uia:no-tab` on EVERY slot — resolve-hwnd-by-title assumes one-window-per-chat but fleet runs WT tabs (tw-wt-*). Fail-loud (safe), but G10+G12 alone will not enable actuation.
- **TEACHER channel LIVE-PROVEN:** 13 targeted briefs authored to slot-briefs/; charlie+india+sierra consumed theirs within minutes (_delivered/). Bus broadcast posted (id ae2ded48).
- **DEFECT (fixed in-flight):** my `prism-vault-fs` stdio MCP destabilized Hermes's MCP layer — keepalive/reconnect loop leaked 12 orphan npx processes and poisoned the prism HTTP connection (TaskGroup errors). REVERTED from config.yaml + skill; orphans killed; gateway (PID 33248) + dashboard bounced clean. Vault access = mediated prism dispatcher tools only.
- **Hermes `-z` one-shot:** fails "no final response" on ALL models (20b/120b/opus) — one-shot-path quirk, distinct from the cron path which demonstrably executes (runs produced model+tool activity). Cron path remains the validated harness; 6:07am opus run = definitive E2E proof.

---

## CLOSURE ADDENDUM — 2026-06-10 (zulu): LOCAL-MODEL E2E PROOF LANDED

**The loop is fully operational on local models.** Root cause of every prior local-model
failure ("Response remained truncated after 3 continuation attempts", continuation-confusion
artifacts, "lazy" responses): **Ollama's /v1 OpenAI-compat endpoint ignores
`options.num_ctx`** -- Hermes's `model.ollama_num_ctx` knob never reached the server, so
every run executed inside the machine-env default **16384-token window** while Hermes's
initial prompt is ~25K tokens (system + skill + 27 visible tools; 91 MCP tools deferred by
tool_search). Ollama silently front-truncated the prompt (the model lost the skill/system
text -- hence "where do I resume?" confusion), generation hit the context boundary within
~3s -> finish_reason=length -> Hermes's 3-continuation spiral. Verified empirically:
a /v1 request with `options.num_ctx=65536` loaded the model at the 16384 default
(`ollama ps` CONTEXT column).

**Fix (live + reboot-durable):**
1. User-scope env `OLLAMA_CONTEXT_LENGTH=65536` (overrides machine-scope 16384; the
   `\PRISM Ollama Serve` S4U task runs as user -> reads it on relaunch).
2. `model.context_length: 65536` in Hermes config.yaml (believed window == real window;
   also satisfies Hermes's 64K floor check).
3. `model.max_tokens: 16384` (Hermes custom-profile default was 65536 = num_ctx ->
   context-fill mode).
4. `mcp_servers.prism.timeout: 300` (one prism_dev file_read hit the 180s cap mid-run).

**Proof (live cron runs through the real gateway/scheduler path):**
- 09:05 inbox sweep on **gpt-oss:20b** -> "completed successfully"; both prism_memory
  actions executed; wrote `knowledge/hermes-outputs/notes/2026-06-10-inbox-sweep.md`.
- 09:22 morning brief on **gpt-oss:120b** -> "completed successfully"; 18+ API calls at
  in=25-39K tokens; wrote `2026-06-10-morning-brief.md` with grounded MASTER-DIGEST +
  dream-synth citations, all 4 required sections.

**Final job config:** inbox-sweep=gpt-oss:20b, morning-brief+weekly=gpt-oss:120b,
fallback_model=claude-opus-4-8 (anthropic). Obsidian bridge re-verified
`live:true authenticated:true` through the supervised :3100 server the same morning.

**Diagnostic for recurrence:** if local runs spiral on truncation again, check
`ollama ps` CONTEXT column first (must be 65536) -- the env var or serve task changed.
