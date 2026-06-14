# hermes-zulu Galaxy — slot:bravo (+ zulu/zebra fleet orchestrator overlay)
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = hermes-zulu-domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**BRAVO** builds hermes-zulu (engines, hooks, dispatchers, soul-files, dream cycle, self-reflect
populater, stub-hunter audits). **ZULU** IS the live orchestrator — cross-slot synthesis, fleet
directives, NATO-slot coordination. Same galaxy dir, two roles: builder + runtime.

**EXCLUDES:** domain-specialist work (mill→foxtrot, lathe→whiskey, wedm→mike, quoting→charlie).
Do NOT treat zulu as a 13th worker slot — it is orchestration above the 25 worker slots.

Worktree: `H:/prism-slot-bravo` · branch: `slot/bravo`
Open-tasks ledger: `state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md`

**Operator grants (B-1..B-4):**
- B-1: free reign on ALL backend dev incl india AI/NN/GNN/LoRA/RAG (coordinate w/ india)
- B-2: enhancements auto-apply to ALL galaxies
- B-3: commit to `slot/bravo`
- B-4: launch Hermes + Obsidian apps
Bound by safety/scrutiny (never relaxed).

---

## §2 — Verified engines

No local `.ts` engines inside `mcp-server/src/engines/hermes-zulu/` — all engines live flat in
`mcp-server/src/engines/` and are wired into `sessionDispatcher.ts`.

| Role | Engine file (`mcp-server/src/engines/`) |
|------|-----------------------------------------|
| Parallel fanout planner | `HermesParallelFanoutPlannerEngine.ts` |
| File scope partitioner (no-collide) | `HermesFileScopePartitionerEngine.ts` |
| Per-fanout token/turn budget | `HermesParallelBudgetEnvelopeEngine.ts` |
| Parallel verdict merger | `HermesParallelVerdictAggregatorEngine.ts` |
| Self-correction loop | `HermesSelfCorrectionEngine.ts` |
| Dream marker scanner | `DreamMarkerScannerEngine.ts` |
| Fleet task auctioneer | `ZuluTaskAuctionEngine.ts` |
| Fleet authority check (read-only) | `ZuluFleetGovernorEngine.ts` |
| Dashboard control surface | `ZuluDashboardControlEngine.ts` |
| Opus invocation (zulu's reasoning lever) | `MoonshotClientEngine.ts` |
| Model-provenance ledger | `ModelAttributionEngine.ts` |
| Model-tier complexity router | `OpusCapabilityEngine.ts` |
| Targeted slot-brief channel | `SlotBriefEngine.ts` |
| Soul-aware fanout extender | `SoulAwareFanoutExtenderEngine.ts` |
| Agent specialization profiler | `AgentSpecializationProfileEngine.ts` |

---

## §3 — Dispatcher quick-ref

**DISPATCHER: none named.** All hermes-zulu C2 routes via `prism_session` (and `prism_context` /
`memoryDispatcher` for specific actions). Do NOT search `DISPATCHER_DIGEST.md` for "hermes" —
it returns zero hits intentionally.

| Action | Dispatcher | Engine | When |
|--------|-----------|--------|------|
| `hermes_fanout_plan` | `prism_session` | `HermesParallelFanoutPlannerEngine` | Plan a parallel-agent burst |
| `hermes_file_scope_partition` | `prism_session` | `HermesFileScopePartitionerEngine` | No-collide file partitioning |
| `hermes_budget_estimate` | `prism_session` | `HermesParallelBudgetEnvelopeEngine` | Per-fanout token/turn budget |
| `hermes_verdict_aggregate` | `prism_session` | `HermesParallelVerdictAggregatorEngine` | Merge parallel verdicts |
| `hermes_self_correct` | `prism_session` | `HermesSelfCorrectionEngine` | Self-correction loop |
| `dream_scan` | `prism_session` | `DreamMarkerScannerEngine` | Parse offline DREAM: markers |
| `dream_markers_to_proposals` | `prism_session` | `DreamMarkerScannerEngine` | Markers → DreamArtifactBundle |
| `zulu_task_auction` | `prism_session` | `ZuluTaskAuctionEngine` | Distribute work orders to slots |
| `zulu_authority_check` | `prism_session` | `ZuluFleetGovernorEngine` | Before any cross-slot directive |
| `model_attribution_record` | `prism_session` | `ModelAttributionEngine` | Fleet model-provenance ledger |
| `opus_assess_complexity` | `prism_session` | `OpusCapabilityEngine` | Model-tier complexity routing |
| `slot_brief_write` / `slot_brief_list` | `prism_context` | `SlotBriefEngine` | Hermes → slot targeted brief |
| `weekly_synthesis_get` | `memoryDispatcher` | sidecar reader | Read weekly self-reflection output |

**MCP-down fallback:** `node scripts/reconcile-zulu-ledger.mjs` (context-regain first step).

---

## §4 — Canonical constants + data paths

No physics constants apply (orchestration domain). Key data surfaces:

| Surface | Path | Access rule |
|---------|------|-------------|
| Fleet message bus | `state/shared/AGENT_CHAT.jsonl` | append via chat-bus; never truncate |
| Per-slot soul files | `state/shared/slot-souls/<nato>.md` | read via `slot-context-bundle-inject.mjs`; edit on schemaVersion bump only |
| Slot briefs (targeted) | `state/shared/slot-briefs/<slot>.md` | write via `prism_context:slot_brief_write`; consume-once |
| Self-reflect sidecar | `knowledge/memories/patterns/ai-systems-fleet-state.md` | regenerate: `node scripts/ai-systems-fleet-state.mjs` |
| Open-tasks ledger | `state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md` | read at context-regain BEFORE any build |
| Closed-loop spec | `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md` | fleet learning loop contract |

NEVER full-read `AGENT_CHAT.jsonl` (unbounded growth) — tail the last N lines or query by timestamp.

---

## §5 — Domain gotchas / safety rails

1. **No-named-dispatcher trap.** Grepping `DISPATCHER_DIGEST.md` for hermes/zulu returns zero hits —
   that is correct. All actions are on `prism_session` / `prism_context` / `memoryDispatcher`.

2. **ZuluFleetGovernorEngine is READ-ONLY.** Authority checks only. The `:8767` control path
   (veto/escalate/promote) is GOVERNANCE-GATED — do NOT actuate it until readiness audit clears.
   Zero slots have `zuluOptIn`. Readiness: [[reference_hermes_control_readiness_nogo_2026_06_01]].

3. **Hostile-payload in self-reflect input.** The populater consumes peer chat output. Always parse
   with bounded `firstBrace..matched-pair` scan; NEVER `JSON.parse` on unbounded peer output
   (greedy-slice exploitability class, caught by Arm-B scrutiny).

4. **`prism_memory:semantic_search` silent failure.** Returns `{ok:false}` when Qdrant is down —
   no exception thrown. Always check liveness before calling; fall back to `MEMORY.md §Indexed memories`.

5. **Wrong inter-channel choice = fleet noise.** Three channels exist:
   - **chat-bus** (`AGENT_CHAT.jsonl`) — broadcast to all slots
   - **soul-file** (`slot-souls/<nato>.md`) — persistent persona; changes on schemaVersion bump only
   - **slot-brief** (`slot-briefs/<slot>.md`) — targeted, consume-once
   Rule: broadcast → chat-bus · persona-change → soul-file · targeted one-shot → slot-brief.

6. **CRLF landmine (Windows).** Repo is de-facto CRLF on Windows/Git-for-Windows; LF is
   un-stickable. Do NOT burn budget fighting EOL. [[reference_git_crlf_windows_reality_2026_06_02]].

7. **Self-reflect cron offset.** Sunday 20:53 offset was chosen to avoid 4 other scheduled tasks.
   Any time change requires re-running the offset calc. If `hermes_reflection.exists=false` in a
   `weekly_synthesis_get` response → the cron is dead; re-register via the installer PS1 script
   (verify script name before citing — // OWNER-GATE).

---

## §6 — What NOT to do (domain refuses)

- **NEVER add `zebra` to `SLOT_NAMES`** — hermes/zulu is slot-LESS as conductor above the 25 worker slots.
- **NEVER actuate `:8767` fleet-control path** without governance gate cleared (zero slots have `zuluOptIn`).
- **NEVER write a stub assertion** (`expect(x).toBeDefined()`) when a real value check would catch breakage (R9).
- **NEVER use `git add -A` or `git add .`** in the shared tree — thousands of peer-unrelated files absorb.
- **NEVER treat `prism_session:master_index_query` as multi-word search** — pass ONE distinctive token; multi-word queries filter to empty.
- **NEVER fire `prism_memory:semantic_search` without a Qdrant liveness check** — silent `{ok:false}` on Qdrant-down.
- **NEVER run the 5h-account-switch coordinator** without `PRISM_5H_WEIGHTED_TOKEN_TRIGGER` set — INERT by default.
- **NEVER clean stale `pct=1` sidecars** from superseded `populate-5h-quota.mjs` without verifying against current `five-hour-token-sum.mjs` chain (mis-switch risk).
- **NEVER coordinate slots without consulting their soul-file refuses-list** first.
- **NEVER fabricate engine names, dispatcher actions, or file paths** — grep/Glob/Read to verify; mark `// UNVERIFIED` if uncertain.

---

## §7 — Domain workflow / pipeline

**Context-regain procedure (run in this order):**
1. `node scripts/reconcile-zulu-ledger.mjs` — FIRST (rots in hours; must run before any other step)
2. Read `state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md`
3. Check `state/shared/AGENT_CHAT.jsonl` tail for pending directives

**Stub-hunter cadence (run at every milestone close-out — non-optional):**
```bash
node scripts/stub-sweep-full.mjs          # 5-pattern codebase sweep
node scripts/audit-unwired-engines.mjs    # orphan detection
node scripts/reconcile-zulu-ledger.mjs    # context-regain / ledger sync
```

**Fleet synthesis pattern (zulu):**
Write a `ZULU-CROSS-SLOT-<topic>-<date>.md` per multi-slot synthesis pass.
Moonshot routing: `MoonshotClientEngine` → Opus; alpha audits cost via token-optimization galaxy.

---

## §8 — Tribal + corpus pointers

Wiki entries:
- [[architecture/hermes-self-reflect-populater]] · [[architecture/hermes-dream-cycle]]
- [[architecture/slot-soul-frontmatter]] · [[architecture/slot-context-bundle-inject]]
- [[feedback_parallel_scrutiny_per_file]] · [[lessons/silent-clobber-prevention]]
- [[lessons/hostile-payload-class]] · [[zulu-ledger-reconciler]]

JM Die corpus: not applicable to this galaxy (orchestration domain, no machining data).

Tribal capture rule: `prism_knowledge:tribal_capture slot=bravo` — NEVER write directly to
`knowledge/tribal/hermes-zulu-*.md` (auto-overwritten on regen).

Brain: `mcp-server/src/engines/hermes-zulu/MEMORY.md`

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge | Notes |
|-----------|--------|--------|-------|
| ↔ peer | `engines/token-optimization/` (alpha) | token cost audit | alpha audits Hermes invocation cost |
| ↔ peer | `engines/fleet-hygiene/` (golf) | fleet-reaper coordination | golf owns reaper; bravo/zulu coordinate |
| → consumer | `engines/discovery/` (tango) | duplication guard | bravo invokes tango audit surfaces |
| ← producer | `engines/system-viz/` (sierra) | canonical asset graph | bravo cross-checks built assets against the graph |
| ↔ peer | `engines/ai-training/` (india) | moonshot routing | Opus invocations route through hermes-zulu |
| ↔ peer | `engines/agent-orchestration/` | agent-fleet orchestration | symmetric C2 peer |

---

## §10 — Closed-loop integration (india)

Publish outcomes: `xproc_outcome_publish {slot: 'bravo', domain: 'hermes-zulu'}` // UNVERIFIED action name — grep sessionDispatcher.ts before relying on it.
Tribal capture: `prism_knowledge:tribal_capture slot=bravo`. Feature emission: `xproc_kg_project_features` // UNVERIFIED. Calibration: `xproc_calibration_monitor_record` // UNVERIFIED.
Full contract: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
cd mcp-server
rtk npx vitest run -t "Hermes|Zulu|Dream|Moonshot|SlotBrief|ModelAttrib|OpusCapab|SoulAware|AgentSpec"
# Individual engine tests:
rtk npx vitest run src/__tests__/HermesParallelFanoutPlannerEngine.test.ts
rtk npx vitest run src/__tests__/HermesSelfCorrectionEngine.test.ts
rtk npx vitest run src/__tests__/zulu_governor_wire.test.ts
rtk npx vitest run src/__tests__/dream_scanner_wire.test.ts
```

---

## §12 — Known bugs / open threads

- `outcome-bus-auto-tap.mjs` cited in closed-loop specs is **verified absent** from disk — do NOT cite it as live wiring. The xproc_* action names above are marked UNVERIFIED for the same reason.
- `RULES.md` referenced in prior CLAUDE.md as a standalone file in this dir **does not exist** — rules are inline (B-1..B-4 in §1 above).
- 5h-account-switch coordinator: INERT by default (`PRISM_5H_WEIGHTED_TOKEN_TRIGGER` gate); 105 tests + live E2E shipped. Do NOT activate without the trigger set.
- Open queue: `state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md`

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs hermes-zulu "<question>"
```

Ollama routing for this galaxy:
- Draft a slot-brief / classify a slot's lane / summarize a handoff → `gpt-oss:20b`
- Lint engine code / stub-sweep triage → `qwen2.5-coder:32b`
- Deep orchestration reasoning / cross-slot synthesis → `gpt-oss:120b`

AI-systems fleet state (GNN selective-deploy, octopus, RAG/CAG, Ollama offload):
`knowledge/memories/patterns/ai-systems-fleet-state.md` — regenerate: `node scripts/ai-systems-fleet-state.mjs`
Synergy: [[reference_ai_systems_fleet_state_2026_06_11]] · [[gnn-selective-deploy]] · [[psn-octopus-fleet-synergy-ms0]]
