# agent-orchestration Galaxy — Sentinel
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = agent-orchestration-domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** multi-agent swarm orchestration, hive-mind topology, Byzantine-FT consensus, 26-chat-slot fleet
coordination, slot-context per-prompt enrichment, autonomous task completion (ATCS state machine),
per-task model routing, multi-agent consensus.

**EXCLUDES:** AI model training → india (ai-training); fleet hygiene/reaper → golf (fleet-hygiene);
token-budget tracking → alpha (token-optimization); system-graph → sierra (system-viz).

**Slot affinity:** zulu (de-facto owner per ZULU-OMNISCIENT-MS0 + ZULU-ORCHESTRATOR-MS0); formally
fleet-managed — any slot may orchestrate via `prism_orchestrate`. Worktree: `H:/prism-slot-zulu` /
branch `slot/zulu`.

---

## §2 — Verified engines

Verified present in `ENGINE_DIGEST.md` (all 10 names grep-confirmed this session):

| Role | Engine file |
|------|-------------|
| Multi-agent orchestration + task queue | `AgentExecutor.ts` |
| Observe-Think-Act core loop primitive | `AgenticLoopEngine.ts` |
| Agent inventory + trigger-keyword registry | `AgentRegistryEngine.ts` |
| Cross-session agent memory | `AgentMemoryFabricEngine.ts` |
| Unified PRISM self-awareness surface | `AgentSelfAwarenessEngine.ts` |
| Cross-session orchestration (U-COORD04) | `CrossSessionOrchestratorEngine.ts` |
| Multi-terminal work distribution | `CrossTerminalCoordinationEngine.ts` |
| Concurrency-aware consensus wrapper | `ConsensusCoordinatorEngine.ts` |
| Local-model routing (Phase 0.19 U-LLM1) | `LocalModelOrchestratorEngine.ts` |
| Self-reliant AI system orchestration | `AutonomousAIOrchestrationEngine.ts` |

Note: no local `.ts` files under `engines/agent-orchestration/` — all engines live in the main engine
tree; the galaxy directory holds doctrine + corpus docs only.

---

## §3 — Dispatcher quick-ref

All five dispatchers verified in `mcp-server/src/tools/dispatchers/`:

| Dispatcher | Actions | Primary use |
|------------|---------|-------------|
| `prism_orchestrate` | ~71 | swarm-init, agent-spawn, hive-mind worker dispatch |
| `prism_atcs` | ~12 | file-system state machine; backs `/loop`, `/autopilot-full`, `/yolo`; survives `/compact` |
| `prism_autopilot_d` | ~7 | AutoPilot workflow orchestration |
| `prism_autonomous` | ~8 | autonomous execution; bridges ATCS state machine |
| `prism_omega` | ~6 | Omega quality equation Ω(x); task-quality gating |

**MCP-down fallback:** if `:3100` ECONNREFUSED, invoke directly:
```bash
node .claude/helpers/slot-task-claim.mjs claim --slot <nato> --unit "MILESTONE::U-ID"
node scripts/lib/zulu-context-bundle.mjs   # fleet-precheck PSN aggregator
```

**Fleet coordination is FILE-SYSTEM-native, not in-process:**
- `state/shared/slot-task-claims.json` — per-slot `MILESTONE::U-ID` locks (PER-SLOT-CLAIM-MS0)
- `.claude/helpers/chat-slots.mjs` + `chat-slots.json` — 26-slot NATO registry + liveness API
- `state/shared/AGENT_CHAT.jsonl` — inter-agent chat bus
- `state/shared/AGENT_WORKBOARD.md` — task workboard
- `.claude/hooks/slot-context-bundle-inject.mjs` — per-prompt fleet enrichment hook (verified)
- `scripts/lib/zulu-context-bundle.mjs` — PSN aggregator for fleet-precheck (verified)

---

## §4 — Canonical constants + data paths

No Kienzle/Taylor physics constants apply to this galaxy (pure orchestration — no machining physics).

**NEVER inline slot counts** — read `SLOT_NAMES.length` from `.claude/helpers/chat-slots.mjs` (source
of truth; current count is 26 but may change).

Key data stores (query, never full-read):
| Store | Path | Guard |
|-------|------|-------|
| Slot state | `.claude/helpers/chat-slots.json` | read via `chat-slots.mjs` API, not raw JSON |
| Task claims | `state/shared/slot-task-claims.json` | RMW via `slot-task-claim.mjs` CLI only (lockfile-guarded) |
| Agent chat bus | `state/shared/AGENT_CHAT.jsonl` | append-only; never truncate |
| Orchestration synthesis brain | `knowledge/memories/patterns/agent-orchestration_synthesis.md` | query via `prism_memory:semantic_search` |
| AI-systems fleet state | `knowledge/memories/patterns/ai-systems-fleet-state.md` | recall via semantic search; regenerate: `node scripts/ai-systems-fleet-state.mjs` |

---

## §5 — Domain gotchas / safety rails

1. **Parallel fan-out saturates a SHARED API.** With N concurrent `/loop`s already running fleet-wide,
   a 15–20-wide `Workflow` blast hits `Server is temporarily limiting requests` (observed 2026-06-08) —
   burns subagent tokens for zero results. Gate fan-out width on live fleet load; use
   narrower waves + pipeline-with-barrier; have agents return compact schema'd verdicts.
2. **Default subagent cannot reliably emit StructuredOutput schema** in some configs —
   `[[reference_alpha_explore_agent_schema_incompat]]`. Use plain-text agents or verify schema returns
   before building a pipeline that parses JSON from subagents.
3. **Loop iteration MUST `loop-state tick`** — skip the tick and `/compact` strands the count;
   the loop appears alive but progress is lost.
4. **`slot-task-claims.json` is a lockfile-guarded atomic RMW** — never `fs.writeFileSync` it
   directly; always use `slot-task-claim.mjs` CLI. Corrupt store → read-only refuse-write mode.
5. **`zulu-context-bundle.mjs` is the PSN aggregator, not a dispatcher action** — it lives at
   `scripts/lib/`, not in `.claude/hooks/`. Call it directly when building a fleet-precheck step.

---

## §6 — What NOT to do (domain refuses)

- **NEVER use `mcp__claude-flow__{swarm_*,agent_spawn,hive_mind_*}`** — redundant with the native
  26-slot NATO fleet + SLOT-WORKTREE-MS0; token waste (root CLAUDE.md §CLAUDE-FLOW TOOL POLICY).
- **NEVER fan out >8 parallel agents when fleet already runs N concurrent `/loop`s** — shared API
  rate-limit saturates (§5 gotcha #1).
- **NEVER spawn a fleet-reaper from this galaxy** — golf owns it (`feedback_golf_owns_reaper.md`);
  reaper PIDs are protected from sibling reap.
- **NEVER build a unit without `slot-task-claim claim` first** — race condition with peer slots
  building the same `MILESTONE::U-ID`.
- **NEVER hardcode slot names in fan-out logic** — read the sequence from `.claude/helpers/chat-slots.mjs`
  `SLOT_NAMES`; never re-enumerate `alpha..zulu` inline.
- **NEVER continue silently on a failed tool call in a loop** — stop and surface the error (R12;
  AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md §2.1 loop-engineering rule #2: "done is a claim, not a proof").
- **NEVER assume MCP is up** — if `:3100` ECONNREFUSED, fall back to direct `node scripts/<X>.mjs`;
  do not assume `prism_orchestrate:*` / `prism_atcs:*` calls succeeded.
- **NEVER full-read `chat-slots.json` raw** — use `chat-slots.mjs` API; the schema evolves and
  direct reads miss computed fields (`isAlive`, `staleThresholdMs`).

---

## §7 — Domain workflow / pipeline contract

Orchestration build pattern (logical order per R13):

1. **Claim** — `slot-task-claim.mjs claim --slot <nato> --unit "MILESTONE::U-ID"`
2. **Plan** — fan-out to specialist subagents (self-contained prompts: goal + absolute paths +
   invariants + run-this-test cmd + output format + doctrine refs)
3. **Barrier** — collect all verdicts before next wave; partial wave still yields value
4. **Heartbeat** — `slot-task-claim.mjs heartbeat --slot <nato>` each tick
5. **Commit** — `[SCOPE]/U-ID: title` on `slot/<nato>` branch; post-commit hook auto-releases claim
6. **Publish outcome** — `xproc_outcome_publish` (§10) so india closes the learning loop

---

## §8 — Tribal + corpus pointers

**Primary corpus (read before re-deriving orchestration patterns):**
- `mcp-server/src/engines/agent-orchestration/AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md` — 7-topic
  distilled corpus (loops/harness/LoRA/CAG/RAG/GNN/Obsidian); built 2026-06-10 via 8-agent Workflow
- `state/shared/articles/` — 7 full-capture operator-submitted articles
- `state/shared/articles/_topic-memos-2026-06-10/` — raw per-topic mining memos

**Wiki entries (query `knowledge/wiki/index.md` first):**
- `knowledge/wiki/architecture/agent-orchestration-galaxy.md`
- `knowledge/wiki/software-engineering/subagent-orchestration-discipline.md`
- `knowledge/wiki/code-tribal/llm-agent-loop-design.md`
- `knowledge/wiki/code-tribal/subagent-dispatch-patterns.md`

**Synthesis brain:** `knowledge/memories/patterns/agent-orchestration_synthesis.md`

**JM Die corpus:** not applicable to this galaxy (no machining programs). Use
`prismSelfAwarenessEngine.getJMDieCustomerPath()` only if routing orchestration work to die-shop units.

**Tribal capture rule:** `prism_knowledge:tribal_capture slot=zulu` — never write
`knowledge/tribal/*.md` directly (auto-overwritten on next capture run).

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge |
|-----------|--------|--------|
| ↔ ALL galaxies | (orchestrates everything) | `prism_orchestrate:agent_spawn` → any galaxy dispatcher |
| ↔ discovery (tango) | `engines/discovery/` | CONSUMES findings → orchestrator routing |
| ↔ token-optimization (alpha) | `engines/token-optimization/` | multi-agent token cost coordination |
| ↔ hermes-zulu (bravo) | `engines/hermes-zulu/` | agent-fleet orchestration peer |
| → ai-training (india) | `engines/ai-training/` | PRODUCES per-task model routing decisions |
| → fleet-hygiene (golf) | `engines/fleet-hygiene/` | escalates reaper / hygiene requests (never self-reap) |

---

## §10 — Closed-loop integration (india)

Publish outcomes so india's learning loop closes:
`xproc_outcome_publish {slot:'zulu', domain:'agent-orchestration'}` // UNVERIFIED — grep atcsDispatcher.ts before relying
Capture lessons: `prism_knowledge:tribal_capture slot=zulu domain=agent-orchestration` after any novel
failure mode. Spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
cd mcp-server && rtk npx vitest run -t "orchestrat|atcs|autopilot|autonomous|omega|agent"
node .claude/helpers/slot-task-claim.mjs list          # verify no stale claims
node .claude/helpers/chat-slots.mjs golf-liveness       # fleet heartbeat health
```

---

## §12 — Known bugs / open threads

- **`CoordinatorSwarmEngine` + `FullSystemAICoordinatorEngine`** — in PATHS.md but not confirmed in
  ENGINE_DIGEST.md; flagged UNWIRED in system graph. Do not build consumers until verified.
- **`prism_autopilot_d` naming** — dispatcher file is `autoPilotDispatcher.ts` (camelCase); MCP
  action prefix may differ — grep dispatcher source before invoking `prism_autopilot_d:*`.
- Open threads ledger: `mcp-server/src/engines/agent-orchestration/MEMORY.md` §Known assets.

---

## §13 — AI / reasoning surface

```bash
# $0 local reasoning for orchestration questions
node scripts/lib/galaxy-reasoning-bridge.mjs agent-orchestration "<question>"

# Semantic recall before re-deriving
# prism_memory:semantic_search query="agent-orchestration loop discipline" topK=20
```

**Ollama routing for this galaxy:**
- Draft multi-agent harness plan → `gpt-oss:120b` (deep domain reasoning)
- Classify a task for routing → `gpt-oss:20b` (quick filter/synthesis)
- Engine/hook code review → `qwen2.5-coder:32b`
- Semantic embed for vault recall → `nomic-embed-text`

Route deterministically in code (R5) — use Ollama only for judgment calls, never for
routing/retries/status-code handling.
