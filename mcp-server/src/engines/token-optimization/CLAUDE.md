# token-optimization Galaxy — slot:alpha
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = token-optimization domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** token-zone state (GREEN/YELLOW/RED/CRITICAL), per-task budget enforcement, fleet-wide token economy, telemetry, diff-cost estimation, hook-level profiling, CAG prompt-cache routing, Ollama offload policy, memory governance (Obsidian vault, per-slot MEMORY.md discipline), route-suggest nudges.

**EXCLUDES:** system-viz graph building → sierra; fleet-reaper → golf; multi-agent orchestration logic → zulu; session handoff machinery → all slots via universal rails.

**Slot:** alpha · Worktree: `H:/prism-slot-alpha` · Branch: `slot/alpha`

---

## §2 — Verified engines

No local `.ts` files in `mcp-server/src/engines/token-optimization/` — this galaxy is doctrine-only. Engines live in `mcp-server/src/engines/` root (all file-existence confirmed):

| Role | Engine file |
|------|-------------|
| Per-prompt zone state (GREEN/YELLOW/RED) | `TokenAwarenessEngine.ts` |
| Per-task budget enforcement | `TokenBudgetAllocatorEngine.ts` |
| Fleet-wide token economy | `TokenEconomyEngine.ts` |
| Telemetry by hook/route | `TokenEconomyTrackerEngine.ts` |
| Record + route spending decisions | `TokenAccountingEngine.ts` |
| Per-session cumulative ledger | `SessionTokenLedgerEngine.ts` |
| Diff-cost estimation | `DiffTokenEstimatorEngine.ts` |
| Hook-level token cost profiling | `HookEfficiencyEngine.ts` |
| CAD-specific token efficiency (cross-galaxy bridge to delta/echo) | `CADTokenRepresentationEngine.ts` |
| Cost↔efficiency bridge | `CostEfficiencyBridgeEngine.ts` |

---

## §3 — Dispatcher quick-ref

**MCP-down fallback:** `node scripts/ollama-offload-dashboard.mjs --json` (offload ratio + per-hook breakdown offline).

### prism_context (contextDispatcher.ts — verified)
| Action | Use |
|--------|-----|
| `token_economy_get_budget` | Read current per-task budget |
| `token_economy_record_spending` | Log actual spend |
| `token_economy_detect_waste` | Surface wasteful patterns |
| `token_economy_report` | Fleet-wide economy report |
| `token_budget_allocate` | Allocate budget for a task |
| `token_budget_can_afford` | Pre-check before expensive op |
| `diff_token_uncommitted` | Cost of uncommitted diff |
| `diff_token_staged` | Cost of staged diff |
| `diff_token_between` | Cost between two refs |
| `diff_token_last_commits` | Cost of last N commits |
| `token_awareness_state` | Current zone + ctx% |
| `token_awareness_zone` | GREEN/YELLOW/RED enum |
| `token_awareness_should_compact` | Boolean compact signal |
| `token_awareness_recommend` | Next-action recommendation |
| `token_awareness_history` | Zone history for this session |

### prism_dev (devDispatcher.ts — verified)
| Action | Use |
|--------|-----|
| `token_ledger_record` | Record spend event |
| `token_ledger_summary` | Per-session summary |
| `token_ledger_project` | Project remaining budget |
| `token_ledger_reset` | Clear ledger |
| `cost_route` | Route task to cheapest model |
| `cost_route_infer` | Infer cost route from task type |
| `read_optimize_recommend` | Recommend partial-read strategy |
| `read_optimize_oneliner` | Single-line read-opt hint |
| `read_optimize_batch` | Batch read optimization plan |
| `read_optimize_batch_cost` | Estimate batch read cost |
| `output_truncate` | Truncate oversized output |
| `output_truncate_json` | Truncate JSON output |
| `output_truncate_savings` | Report truncation savings |
| `output_truncate_auto` | Auto-truncate on threshold |

### prism_session
`master_index_query` — "where is X?" (110K-node graph, cheap)
`dispatcher_map_compact` — dispatcher→action map

---

## §4 — Canonical constants + data paths

**NEVER inline token thresholds or budget constants.** Import from `TokenAwarenessEngine.ts` or read via `token_awareness_state` dispatcher action. The zones (GREEN <70%, YELLOW 70–85%, RED 85–95%, CRITICAL >95%) are owned by the engine — a hardcoded literal in a hook/script will drift silently.

| Store | Path | Size / access rule |
|-------|------|--------------------|
| Ollama offload stats | `mcp-server/data/state/ollama-offload-stats.json` | schemaVersion 2.0.0; `offloaded`/`keptOnClaude` are TOP-LEVEL — NOT under `totals`. Always probe `j.schemaVersion` before reading. |
| PSN savings aggregate | `state/shared/dashboards/psn-savings-aggregate.json` | Cumulative savings across 6 detectors |
| CAG route sidecars | `state/shared/cag-route/route-<sid>-*.json` | Per-prompt CAG route decisions |
| Ollama rate-limit guard | `.claude/cache/ollama-rate-limit.json` | Check before heavy offload burst |
| Token awareness sidecar | Written per-turn by `token-awareness-sidecar.mjs` | Use this (not transcript bytes) as ground truth for zone |

---

## §5 — Domain gotchas / safety rails

1. **`postCompactBytes / 3.5` is NOT a token count.** The JSONL transcript logs full hook-injection + tool outputs redundantly → over-reports 5–10×. Only the authoritative per-turn `usage` block drives real compaction decisions. `chat-token-watch` MUST downgrade a physically-impossible byte-estimate (>1.1× context cap) to `suspect:warn`, never `critical`. (Regression fixed U-CBF01/CBF02; 49/49 tests.)
2. **Compact-boundary format changed.** Claude Code changed the compact marker from `"isCompactSummary":true` → `{type:"system",subtype:"compact_boundary"}`. All byte-ctx estimators (`precompact-auto-trigger`, `transcript-token-counter`, statusline, `chat-token-watch`) broke silently on the old format. If you touch any of these estimators, parse the NEW marker. Wiki: `[[compact-boundary-format-change-constant-compaction]]`.
3. **Stale zone from stale sidecar.** `applyStaleness` must NEVER bump a measured GREEN zone to YELLOW just because the sidecar is old — staleness is a freshness signal, not a budget signal. Surface `stale:true + ageMs` separately; never overwrite the measured zone. (Regression fixed `384b05e265`.)
4. **Ollama `/api/tags` up ≠ `/api/chat` works.** GPU contention kills chat while tags responds. Always verify with `node scripts/ollama-docker-health.mjs` or inspect `ollama-offload-stats.json byHook` before declaring Ollama healthy.
5. **`token-zone-state-inject.mjs` and `route-suggest-inject.mjs` do NOT exist.** The live hook names are `token-awareness-inject.mjs` and `mcp-route-suggest.mjs`. Using the stale names in settings.json or hook references silently no-ops.
6. **Subagent fan-out prompt overflow.** PRISM injects >200K SessionStart cold-cache anchors into every subagent → "Prompt is too long." Fix: gate SessionStart anchors OFF for Task/Workflow subagents. Alpha-owned open thread.

---

## §6 — What NOT to do (domain refuses)

- **NEVER read `system-graph.json` (644MB / ~186K tokens)** to look up a node. Use `node scripts/system-viz-query.mjs node-card <id>` (~200 tokens, 98.7% cut).
- **NEVER use `postCompactBytes / 3.5` as a token count** (over-reports 5–10×; see §5 #1).
- **NEVER inline token zone thresholds or budget floors** — always read from `TokenAwarenessEngine.ts` or `token_awareness_state`.
- **NEVER assume Ollama is healthy from `/api/tags` alone** — verify chat endpoint separately (§5 #4).
- **NEVER re-read a file written/edited this turn** — the harness tracks state; re-reading burns the exact tokens this galaxy exists to save.
- **NEVER skip `rtk` prefix on bash commands with >500 chars output.** RTK saves 60–99% on git/vitest/tsc/gh.
- **NEVER spawn a broad Agent search when `Grep` with a tight pattern answers.**
- **NEVER use `token-zone-state-inject.mjs` or `route-suggest-inject.mjs`** — those names are stale (§5 #5).
- **NEVER call `loop-state tick` inside a `ScheduleWakeup` sleep** — the 5-min cache TTL exceeds the round-trip value; tick synchronously.
- **NEVER treat transcript-mine synthesis (gpt-oss:120b) as ground truth** — verify engine names / file paths before acting.

---

## §7 — Token-budget zone decision table

| Zone | ctx% signal | Alpha action |
|------|-------------|-------------|
| GREEN | <70% | Proceed normally; `rtk` all bash |
| YELLOW | 70–85% | Prefer batched calls; Ollama offload; `Read offset+limit`; no new broad Agent searches |
| RED | 85–95% | Finish current unit only; write handoff; no new exploratory work |
| CRITICAL | >95% | Only `/handoff` write; trust precompact hook to capture state |
| SUSPECT | byte-est >1.1× cap | Downgrade to WARN; use per-turn `usage` sidecar as ground truth |

---

## §8 — Tribal + corpus pointers

- **Wiki:** `[[compact-boundary-format-change-constant-compaction]]` · `[[ollama-pipeline-ms0]]` · `[[ollama-expand-ms0]]` · `[[session-continuity-stack]]` · `[[feedback_psn_definition]]`
- **Memory:** `[[reference_session_continuity_stack_2026_05_15]]` · `[[feedback_karpathy_discipline]]`
- **Memory governance (alpha-owned):**
  - Canonical dir: `C:/Users/wompu/.claude/projects/H--PRISM/memory/`
  - H: mirror: `H:/prism/knowledge/memories/` (auto-fed every Stop by `stop-obsidian-memory-feed.mjs`)
  - `MEMORY.md` index discipline: ≤200 lines, pointer-only; older entries archived to `MEMORY-ARCHIVE.md`
  - Tribal capture: `prism_knowledge:tribal_capture slot=alpha` — NEVER write `knowledge/tribal/token-optimization-*.md` directly (auto-overwritten on regen)
- **Awareness check:**
  ```bash
  node scripts/token-awareness-snapshot.mjs        # regenerates TOKEN-OPTIMIZATION-AWARENESS.md
  node scripts/ollama-offload-dashboard.mjs --json # offload ratio + per-hook breakdown
  ```

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Peer galaxy | Bridge |
|-----------|-------------|--------|
| CONSUMES ← | system-viz (sierra) | Reads graph node-card for token-waste hotspot analysis |
| CONSUMES ← | fleet-hygiene (golf) | Consumes reaper telemetry + rate-limit findings |
| PRODUCES → | india (ai-training) | Publishes outcome + features for GNN tier-5 + LoRA (§10) |
| PRODUCES → | all slots | Zone state injected every UserPromptSubmit via `token-awareness-inject.mjs` |

**Live headline metrics (survive every /compact):**
- Ollama offload ratio: **8.9%** (target ≥30%). Blocker: `OFFLOADABLE_PATTERNS` scope too narrow. Fix: widen patterns + re-measure via `ollama-offload-dashboard.mjs`.
- Route-suggest take-rate: **0.8%**. Hook fires but suggestions ignored. Open thread: adoption fix, not capability fix.

---

## §10 — Closed-loop integration (india)

Publish via `xproc_outcome_publish {slot:'alpha', domain:'token-optimization'}` // UNVERIFIED action name — grep contextDispatcher before relying on it. Tribal learnings via `prism_knowledge:tribal_capture slot=alpha`. Full protocol: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
cd mcp-server && rtk npx vitest run -t "Token|token|Budget|budget|Diff|Economy|Ledger|Hook.*Efficiency|Cost.*Efficiency"
node scripts/token-awareness-snapshot.mjs   # PSN leg audit (pure-node, no port 3100 needed)
node scripts/ollama-offload-dashboard.mjs   # offload ratio health check
```

---

## §12 — Known bugs / open threads

- **Subagent SessionStart overflow (HIGH, alpha-owned):** >200K anchor tokens injected into every Task/Workflow subagent → "Prompt is too long." Fix: gate SessionStart injectors off for subagents. Not yet shipped.
- **Route-suggest take-rate 0.8%:** `mcp-route-suggest.mjs` fires but model ignores suggestions. Adoption fix needed — capability is working.
- **Context-bundle daemon DOWN:** fleet runs all 60 legacy injectors/turn. Biggest unrealized injection-budget lever. Owner: infra/golf/papa — coordinate before alpha unilaterally changes.
- **Open thread ledger:** alpha MEMORY.md `## Open queue` section.

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs token-optimization "<question>"
```

Ollama routing for this galaxy (alpha IS the offload-policy owner):
- Summarize long transcript for compaction → `gpt-oss:20b`
- Classify a CAG/RAG route → `qwen2.5-coder:1.5b` (trivial classification)
- Deep offload-policy reasoning / engine architecture → `gpt-oss:120b`
- Engine/hook code review → `qwen2.5-coder:32b`

**Hooks (verified present in `H:/prism/.claude/hooks/`):**
`token-awareness-inject.mjs` · `token-awareness-sidecar.mjs` · `token-awareness-stop-advisory.mjs` · `token-budget-gate.mjs` · `mcp-route-suggest.mjs` · `cag-router-inject.mjs` · `cag-cold-cache-anchor.mjs` · `cag-soul-cache-block.mjs` · `ollama-task-offloader.mjs` · `ollama-pipeline-injector.mjs` · `ollama-prewarm-on-pipeline.mjs` · `ollama-route-pretooluse.mjs` · `prompt-rewriter-ollama.mjs` · `cad-token-vocabulary-guard.mjs` · `claudemd-ollama-enforcer.mjs` · `posttool-ollama-offload-nudge.mjs` · `stop-token-savings-summary.mjs` · `alpha-token-domain-awareness-inject.mjs`
