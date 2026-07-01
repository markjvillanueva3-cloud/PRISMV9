## token-optimization — slot:alpha

### Current state

**Size:** 119 lines (~4.8 KB)
**Quality grade:** PARTIAL

The current CLAUDE.md is better than most galaxy stubs — it has a real engine inventory, a hook list, anti-patterns, related-galaxy edges, closed-loop integration wiring, and a cross-cutting methodology block. However it has meaningful gaps:

1. **Missing verified dispatcher action map.** PATHS.md has the action names but CLAUDE.md does not — a chat starting from CLAUDE.md alone won't know the exact action strings to call without another read.
2. **Karpathy 5-step is duplicated verbatim from the global CLAUDE.md** (lines 48–54). Pure token waste — a pointer suffices.
3. **`token-zone-state-inject.mjs` and `route-suggest-inject.mjs` listed as hooks (line 22–24) do NOT appear in the verified hook listing** from `.claude/hooks/`. Actual hook is `token-awareness-inject.mjs` and `mcp-route-suggest.mjs`. These two names appear to be stale or fabricated. Mark as // UNVERIFIED until confirmed.
4. **No mention of the compaction-doctrine regression** (U-CBF01/CBF02 compact-boundary format change, `{type:"system",subtype:"compact_boundary"}`) — the single biggest live correctness issue for this galaxy's own estimators; a new alpha chat would re-hit it.
5. **No mention of the Ollama offload ratio target (8.9% → 30%)** or the current blocker (context-bundle daemon DOWN ~32 days) — the headline metric and its P0 blocker are in MEMORY.md but not in the doctrine file.
6. **`CADTokenRepresentationEngine.ts` listed** but its role description "CAD token efficiency" is vague — this galaxy is token-optimization, not CAD. Its actual function (cross-galaxy bridge to echo/delta) needs one line of context or it reads as an error.
7. **Closed-loop integration block (lines 69–87) references `xproc_outcome_publish`, `xproc_kg_project_features`, `xproc_calibration_monitor_record`** — these action names are NOT verified against any dispatcher this session. Mark // UNVERIFIED.
8. **AWARENESS.md reports "AI engines attributed: 0 / AI dispatcher actions: 0"** — contradicts the SOUL.md claim that this galaxy "owns or wires AI." The awareness surface is auto-generated and stale; the CLAUDE.md should not cite it as authoritative.
9. **No "what NOT to do" list.** Anti-patterns exist but they describe tool-call discipline, not domain mistakes (e.g., reading the 193MB system-graph.json instead of node-card, using transcript-byte-count as budget signal, treating ollama /api/tags up as /api/chat up).

---

### KEEP

- **Lines 1–19 (engine inventory):** all 9 engines verified present in `mcp-server/src/engines/` — accurate, load-bearing for any alpha work session.
- **Lines 20–31 (hooks + skills):** hook names verified (except 2 flagged above); skills list is real and useful.
- **Lines 34–38 (memory governance block):** canonical memory dir paths, MEMORY.md ≤200-line discipline — load-bearing.
- **Lines 40–46 (Anti-patterns block):** unique, accurate, domain-specific. Keep verbatim.
- **Lines 56–67 (Related galaxies + wiki cross-refs):** PSN edges to system-viz and fleet-hygiene are real and load-bearing.
- **Lines 69–88 (Closed-loop integration with india block):** structurally correct wiring doctrine even if action names need verification; keep with `// UNVERIFIED` tags on xproc_* names until grepped.
- **Lines 93–118 (Cross-cutting methodology + AI-systems pointer):** the PC-specs, Ollama model roster, CAG/RAG/LoRA harness doc, compact-doctrine paragraph — all high-value, domain-accurate. Keep.
- **Lines 114–119 (Critic + keep-working stanza):** universal but short; acceptable as a local reminder pointer.

---

### DROP

- **Lines 48–54 (Karpathy 5-step verbatim):** exact duplicate of global CLAUDE.md §KARPATHY DISCIPLINE. Replace with a 1-line pointer: `> Karpathy 5-step: global CLAUDE.md §KARPATHY DISCIPLINE — not repeated here.`
- **`token-zone-state-inject.mjs` (line 22) and `route-suggest-inject.mjs` (line 24):** not found in `.claude/hooks/` listing — stale/wrong names. Replace with verified names: `token-awareness-inject.mjs`, `mcp-route-suggest.mjs`.
- **Any re-statement of R1–R15 rules in prose:** the galaxy file should carry a single pointer to `global CLAUDE.md §CLAUDE.md RULES 5–13`, not restate them.
- **The AWARENESS.md auto-generated note** if it gets pasted inline — stale the moment it's regenerated; point to the file, don't embed.

---

### ADD (domain-specific — the heart of this assessment)

#### 1. Verified dispatcher action cheatsheet (daily-use, confirmed at contextDispatcher.ts + devDispatcher.ts)

```
prism_context:
  token_economy_get_budget       — read current per-task budget
  token_economy_record_spending  — log actual spend
  token_economy_detect_waste     — surface wasteful patterns
  token_economy_report           — fleet-wide economy report
  token_budget_allocate          — allocate budget for a task
  token_budget_can_afford        — pre-check before expensive op
  diff_token_uncommitted         — cost of uncommitted diff
  diff_token_staged              — cost of staged diff
  diff_token_between <a> <b>     — cost between two refs
  diff_token_last_commits <n>    — cost of last N commits
  token_awareness_state          — current zone + ctx%
  token_awareness_zone           — GREEN/YELLOW/RED enum
  token_awareness_should_compact — boolean compact signal
  token_awareness_recommend      — next-action recommendation
  token_awareness_history        — zone history for this session

prism_dev:
  token_ledger_record            — record spend event
  token_ledger_summary           — per-session summary
  token_ledger_project           — project remaining budget
  token_ledger_reset             — clear ledger
  cost_route                     — route task to cheapest model
  cost_route_infer               — infer cost route from task type
  read_optimize_recommend        — recommend partial-read strategy
  read_optimize_oneliner         — single-line read-opt hint
  read_optimize_batch            — batch read optimization plan
  read_optimize_batch_cost       — estimate batch read cost
  output_truncate                — truncate oversized output
  output_truncate_json           — truncate JSON output
  output_truncate_savings        — report truncation savings
  output_truncate_auto           — auto-truncate on threshold

prism_session:
  master_index_query             — "where is X?" (110K-node graph)
  dispatcher_map_compact         — dispatcher→action map (cheap)
  token_awareness_*              — (see prism_context above; some actions dual-registered)
  cag_route                      — CAG prompt-cache route decision
```

#### 2. Live headline metrics + P0 blockers (must survive every /compact)

- **Ollama offload ratio: 8.9% (target ≥30%).** Blocker: `OFFLOADABLE_PATTERNS` scope too narrow. Own action: widen patterns + re-measure via `node scripts/ollama-offload-dashboard.mjs`.
- **Context-bundle daemon DOWN ~32 days** (as of 2026-06-11). Fleet runs all 60 legacy injectors/turn instead of the 1 compact bundle the daemon produces. Biggest unrealized lever for injection budget. Owner: infra/golf/papa lane — coordinate before alpha tries to fix unilaterally.
- **Route-suggest take-rate: 0.8%.** Hook fires but suggestions ignored. Alpha's open thread: adoption fix, not capability fix.
- **Subagent fan-out BLOCKED:** PRISM injects >200K SessionStart cold-cache anchors into every subagent → "Prompt is too long." Fix: gate SessionStart anchors OFF for Task/Workflow subagents (HIGH, alpha-owned U-1 in MEMORY.md open queue).

#### 3. Compaction-doctrine: the compact-boundary regression (U-CBF01/CBF02)

Claude Code changed its compact marker from `"isCompactSummary":true` → `{type:"system",subtype:"compact_boundary"}`. This silently broke ALL byte-ctx estimators: `precompact-auto-trigger`, `transcript-token-counter`, sidecar, statusline, `chat-token-watch` → whole-transcript byte count → false `>=HARD` → constant false /compact loop. **All 5 estimators fixed (49/49 tests).** Wiki: `[[compact-boundary-format-change-constant-compaction]]`.

Rule that follows: **never trust `postCompactBytes/3.5` as a token count** — the JSONL logs full injection + tool outputs redundantly, so it over-reports by 5–10×. Only the authoritative per-turn `usage` block in the API response / sidecar drives a real compaction decision. `chat-token-watch` downgrades a physically-impossible byte-estimate to `suspect:warn`, not `critical`.

#### 4. Token-budget zone decision table (operational)

| Zone | Signal | Alpha action |
|------|--------|-------------|
| GREEN (<70%) | Normal | Proceed; `rtk` all bash |
| YELLOW (70–85%) | Caution | Prefer batched calls; Ollama offload; `Read offset+limit`; no new broad Agent searches |
| RED (85–95%) | Pressure | Finish current unit only; write handoff; no new exploratory work |
| CRITICAL (>95%) | Autocompact imminent | Only `/handoff` write; trust precompact hook to capture state |
| SUSPECT | Byte-estimate > 1.1× context cap | Downgrade to WARN; use per-turn `usage` sidecar as ground truth |

#### 5. What NOT to do in this domain

- **Do NOT read `system-graph.json` (644MB / ~186K tokens)** to look up a node. Use `node scripts/system-viz-query.mjs node-card <id>` (~200 tokens, 98.7% cut) or `find <query>` → ids → `node-card`.
- **Do NOT use `postCompactBytes / 3.5` as a token count** (over-reports 5–10× due to JSONL redundancy). Use the per-turn `usage` block.
- **Do NOT assume Ollama `/api/tags` up means `/api/chat` works.** GPU contention can kill chat while tags responds. Always verify with `node scripts/ollama-docker-health.mjs` or check `ollama-offload-stats.json`.
- **Do NOT inline token constants or budget thresholds.** Import from `TokenAwarenessEngine.ts` or read from `token_awareness_state` dispatcher action.
- **Do NOT spawn broad Agent searches when `Grep` with a tight pattern answers.** Anti-pattern enforced by SOUL.md refuses list.
- **Do NOT re-read a file you wrote/edited this turn.** The harness tracks state; re-reading wastes the exact tokens this galaxy exists to save.
- **Do NOT skip `rtk` prefix on any bash command with >500 chars output.** RTK saves 60–99% on git/vitest/tsc/gh. No exceptions.
- **Do NOT call `loop-state tick` in a `ScheduleWakeup` sleep.** 5-min cache TTL exceeds the round-trip value. Tick synchronously.
- **Do NOT treat transcript-mine synthesis (gpt-oss:120b) as ground truth.** It is advisory; verify claimed engine names / file paths before acting.

#### 6. Canonical awareness check command

```bash
node scripts/token-awareness-snapshot.mjs   # regenerates TOKEN-OPTIMIZATION-AWARENESS.md (11-leg PSN audit)
node scripts/ollama-offload-dashboard.mjs --json  # offload ratio + per-hook breakdown
```

Auto-injected at SessionStart for slot:alpha by `H:/.claude/hooks/alpha-token-domain-awareness-inject.mjs`.

#### 7. Key telemetry files (schema notes — avoid the schema-probe pitfall)

- `mcp-server/data/state/ollama-offload-stats.json` — schemaVersion 2.0.0; `offloaded`/`keptOnClaude` are TOP-LEVEL fields, NOT under `totals`. Always `j.schemaVersion` probe before reading.
- `state/shared/dashboards/psn-savings-aggregate.json` — cumulative PSN savings across 6 detectors.
- `state/shared/cag-route/route-<sid>-*.json` — per-prompt CAG route sidecars.
- `.claude/cache/ollama-rate-limit.json` — Ollama rate-limit guard (check before heavy offload).

#### 8. Hook names (verified 2026-06-13)

Confirmed present in `H:/prism/.claude/hooks/`:
- `token-awareness-inject.mjs` — surfaces zone to every prompt (NOT `token-zone-state-inject.mjs` — stale name)
- `token-awareness-sidecar.mjs` — writes per-turn sidecar
- `token-awareness-stop-advisory.mjs` — Stop advisory on RED/CRITICAL
- `token-budget-gate.mjs` — gates expensive ops on budget
- `mcp-route-suggest.mjs` — route-before-reimplement nudges (NOT `route-suggest-inject.mjs` — stale name)
- `cag-router-inject.mjs` · `cag-cold-cache-anchor.mjs` · `cag-soul-cache-block.mjs` — CAG prompt-cache anchoring
- `ollama-task-offloader.mjs` · `ollama-pipeline-injector.mjs` · `ollama-prewarm-on-pipeline.mjs` · `ollama-route-pretooluse.mjs` — Ollama offload routing
- `prompt-rewriter-ollama.mjs` — local prompt compression (skips silently when Ollama /api/chat dead)
- `cad-token-vocabulary-guard.mjs` · `claudemd-ollama-enforcer.mjs` · `posttool-ollama-offload-nudge.mjs` — misc token guards
- `stop-token-savings-summary.mjs` — Stop-hook savings summary
- `alpha-token-domain-awareness-inject.mjs` — SessionStart domain awareness (alpha-gated)

---

### IDEAL SECTION OUTLINE

```
# Token Optimization Galaxy (ALPHA slot)
## 1. Domain scope (2 lines: what alpha owns)
## 2. Engine inventory (verified names + 1-line role each)
## 3. Hook inventory (verified names + 1-line role each, stale names corrected)
## 4. Dispatcher actions — daily cheatsheet (prism_context / prism_dev / prism_session)
## 5. Skills (token-related slash commands)
## 6. Anti-patterns (KEEP as-is)
## 7. What NOT to do in this domain (NEW — 8 concrete domain-specific rules)
## 8. Token-budget zone decision table (GREEN/YELLOW/RED/CRITICAL/SUSPECT)
## 9. Live headline metrics + P0 blockers (offload ratio / bundle daemon / route-suggest)
## 10. Compaction doctrine (compact-boundary regression lesson)
## 11. Telemetry files + schema notes
## 12. Awareness check commands
## 13. Memory governance (KEEP)
## 14. Closed-loop integration with india (KEEP, xproc_* names flagged UNVERIFIED)
## 15. Related galaxies + PSN edges (KEEP)
## 16. Wiki cross-refs (KEEP)
## 17. UNIVERSAL-CORE POINTER (1 block — pointer only, no duplication)
```

---

### UNIVERSAL-CORE POINTER

The galaxy CLAUDE.md should contain exactly this block (not the prose itself):

```markdown
## Universal operating rules (pointer — do NOT duplicate here)
> Source of truth: `H:/prism/CLAUDE.md` (project) + `C:/Users/wompu/.claude/CLAUDE.md` (global).
> Rules that apply to this galaxy WITHOUT repetition:
> - R1–R15 (Karpathy discipline + agent-era rules) → §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13
> - Scrutiny 3-of-3 gate (every Stop with file changes) → §SCRUTINY GATE
> - Per-chat handoff (write at /compact + session end) → §PER-CHAT HANDOFF
> - Commit format `[SCOPE]/U-ID: title` on slot/alpha branch → §SESSION HYGIENE
> - Units-first (inch vs mm) → §SAFETY RAILS (not primary concern for this galaxy but universal)
> - No-stub enforcement → §ENFORCEMENT GATES
> - RTK prefix on all bash → §RTK
> - Ollama fallback ladder (Ollama → Sonnet agent → Opus) → §AI SYSTEM ROUTING
> This galaxy ADDS domain-specific content above. Never paste universal prose here — it rots.
```
