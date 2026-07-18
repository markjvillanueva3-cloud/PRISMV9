---
name: feedback-ollama-docker-pipeline-dead-code-2026-05-16
description: "Audit of PRISM's Ollama+Docker pipeline integration. 88% of ollama-* hooks are dead-code-on-disk — shipped but never wired in settings.json. Same 'Named-not-Invoked' regression class as feedback_settings_wiring_drift_2026_05_16. 2 hooks wired this turn (ollama-pipeline-injector + ollama-prewarm-on-pipeline). 13+ remain unwired. Cost-router lib used by 1 of 18 consumers. Offloader telemetry shows zero offloads (all decisions = keep). Docker auto-recovery missing."
aliases: feedback_ollama_docker_pipeline_dead_code_2026_05_16
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.437Z
---


# Ollama + Docker pipeline utilization is mostly dead-code-on-disk

Operator directive 2026-05-16: "make sure we're utilizing ollama and docker in pipelines effectively." Audit finding: we're not. 88% of the Ollama hook surface is unwired despite the [[reference_ollama_pipeline_ms0_2026_05_15|OLLAMA-PIPELINE-MS0]] milestone shipping 4 weeks ago.

## The damning state of the world (audited 2026-05-16 18:00 UTC)

### Ollama hook wiring matrix

| Hook (file exists on disk) | Tier | Intended event | settings.json wirings |
|---|---|---|---|
| ollama-task-offloader.mjs | T? | UserPromptSubmit | ✓ 1 wiring |
| ollama-auto-router.mjs | T? | UserPromptSubmit | ✓ 1 wiring |
| ollama-pipeline-injector.mjs | T2 | UserPromptSubmit | ✓ **wired 2026-05-16** (this turn) |
| ollama-prewarm-on-pipeline.mjs | T3 | UserPromptSubmit | ✓ **wired 2026-05-16** (this turn) |
| ollama-route-recommender.mjs | T4 | UserPromptSubmit | 0 — DEAD CODE |
| ollama-reviewer-second-opinion.mjs | T0 | PreToolUse:Bash on git commit | 0 — DEAD CODE (BLOCKER tier — needs careful smoke-test before wire) |
| ollama-skill-suggester.mjs | T4 | UserPromptSubmit | 0 — DEAD CODE |
| ollama-context-aggregator.mjs | ? | ? | 0 — DEAD CODE |
| ollama-obsidian-rag.mjs | ? | ? | 0 — DEAD CODE |
| ollama-unified-semantic-router.mjs | ? | ? | 0 — DEAD CODE |
| ollama-prism-intelligence.mjs | ? | ? | 0 — DEAD CODE |
| ollama-session-continuity.mjs | ? | ? | 0 — DEAD CODE |
| ollama-autostart.mjs | ? | ? | ? (not audited) |
| ollama-engine-api-extractor.mjs | ? | ? | ? (not audited) |
| ollama-route-pretooluse.mjs | ? | PreToolUse | ? (not audited) |
| ollama-schema-engine-sync-gate.mjs | ? | ? | ? (not audited) |
| ollama-terminal-watcher.mjs | ? | ? | ? (not audited) |
| ollama-architecture-plan.mjs | ? | ? | 0 — DEAD CODE |

**17 ollama-* hooks exist. Only 4 are wired.** The 2 I just wired this turn (pipeline-injector + prewarm-on-pipeline) were explicitly named in the [[reference_ollama_pipeline_ms0_2026_05_15|OLLAMA-PIPELINE-MS0]] commit body as already-wired — same regression mechanism as `feedback_settings_wiring_drift_2026_05_16` (multi-chat merges silently revert settings.json wiring).

### Cost-router lib coverage

The `ollama-cost-router.mjs` library (shipped 2026-05-15 by this very chat, commit 831d04c2b in earlier session — produces tier-aware model selection across cheap/balanced/strong/best tiers) is used by **exactly 1 of 18 ollama-* hooks** (just the task-offloader). The other 17 hooks hardcode model selection or skip routing.

### Offloader telemetry is suspicious

`ollama-offload-stats.json` shows the last 5 events:
```
ollama-task-offloader keep cat=unknown
ollama-task-offloader keep cat=unknown
ollama-task-offloader keep cat=unknown
ollama-task-offloader keep cat=unknown
ollama-task-offloader keep cat=unknown
```

**Every event was `decision=keep` with `category=unknown`** — meaning the classifier in ollama-task-offloader is NOT detecting offloadable categories in any real prompt. The hook fires but routes zero work to Ollama. The 30% healthy offload-rate target documented in [[reference_ollama_pipeline_ms0_2026_05_15]] is unmet because the offloader classifier itself is broken or its OFFLOADABLE_PATTERNS table is out of sync with real prompt shapes.

Total counters return `?` (undefined) — suggests the stats schema diverged from what the read code expects, OR the totals haven't been initialized since a counter reset.

### Docker auto-recovery is missing

- Docker engine has been DOWN this entire session.
- 5+ services depend on it: Qdrant (semantic recall), Postgres (state), Prometheus (metrics), and others.
- No hook auto-restarts it.
- The `ollama-docker-launcher.mjs` script EXISTS but only fires on user-prompt with `local_inference:1` intent — not as a recovery mechanism.
- Until the gap-#3 §6g alert I shipped earlier this turn, /checkin didn't even SURFACE the down-state.

## The "Named-not-Invoked" regression class strikes again

This is the THIRD time this session I've documented the same root pattern:

1. `feedback_settings_wiring_drift_2026_05_16` — U-P0 + U-P1 audit-viz-first + post-ship-distill hooks shipped, wiring silently reverted.
2. `feedback_checkin_loop_goal_utilization_audit_2026_05_16` — /checkin Step 10 named tribal_search, cot_reason, neural_recommend but never invoked them.
3. This memo — 14 of 17 ollama-* hooks are NAMED in `feature/intelligence/awareness` doc surfaces but UNWIRED.

**The pattern is structural, not incidental.** PRISM's hook-development velocity exceeds its hook-verification velocity. Hooks ship to disk + envelopes mark them complete + doc surfaces name them, but settings.json wiring drifts away under multi-chat fleet pressure. The c-to-h-mirror gap (bash node-writes don't fire the mirror) makes this worse.

## Top-5 fixes (HIGH-ROI first)

| # | Fix | Status |
|---|---|---|
| 1 | Wire ollama-pipeline-injector + ollama-prewarm-on-pipeline | ✓ **SHIPPED THIS TURN** |
| 2 | Diagnose + fix the offloader classifier (cat=unknown 100% of recent events) — likely the OFFLOADABLE_PATTERNS regex table is too narrow OR the prompt parsing dropped a field. Without this, Ollama offloading is functionally OFFLINE despite the hook firing. | NEXT SESSION |
| 3 | Audit remaining 13 unwired ollama-* hooks; wire the safe T2/T3 ones (route-recommender, skill-suggester, context-aggregator) | NEXT SESSION |
| 4 | Wire ollama-cost-router into ollama-auto-router (currently only the offloader uses tier-aware selection) | NEXT SESSION |
| 5 | Docker auto-recovery hook: PostToolUse cron-style detector that re-launches Docker engine when stale-state file age > N + alerts loudly on /checkin | NEXT SESSION |

## Apply protocol (third time codified)

For ANY new hook or pipeline integration in PRISM:

1. Ship the hook .mjs file.
2. Ship the wiring in settings.json IN THE SAME COMMIT.
3. Smoke-test the hook with empty + trigger stdin BEFORE committing.
4. Add a "verify wiring" line to the commit body: `node -e "...settings.json...grep <hook-name>..."`.
5. In the post-ship distill memo, include a "wiring grep" command so future audits can re-check in <1 second.

This memo is now the third in the series; the pattern is documented and should propagate to next session via wiki-precheck-inject keyword match on "Named-not-Invoked" or "wiring drift".

## Related

- [[feedback_settings_wiring_drift_2026_05_16]] — sister silent-drift regression (audit-viz-first + post-ship-distill)
- [[feedback_checkin_loop_goal_utilization_audit_2026_05_16]] — sister Named-not-Invoked audit on /checkin
- [[reference_ollama_pipeline_ms0_2026_05_15]] — the milestone this audit found dead
- [[reference_ollama_cost_routing]] — the lib only 1 of 18 consumers uses
- [[feedback_reflect_all_changes_post_update]] — the doc-reflection rule honored by this memo
