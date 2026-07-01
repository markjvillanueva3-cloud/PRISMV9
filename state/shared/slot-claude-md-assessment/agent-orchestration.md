# agent-orchestration — fleet-managed

## Current state

**Size:** ~61 lines / ~3.6KB (CLAUDE.md). Supporting docs verified on disk: MEMORY.md (~118 lines), PATHS.md (~119 lines), TOOLBELT.md (~29 lines), SOUL.md (~46 lines), AWARENESS.md (~37 lines), AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md (large operator corpus, 2026-06-10).

**Quality grade: GOOD**

The file was a stub until 2026-06-08 (papa thickening pass), then received a cross-cutting methodology block from the galaxy-enrichment program (2026-06-09). It is genuinely load-bearing: the scope, action surface, 5 grounded anti-patterns, and per-prompt fleet-enrichment info are domain-accurate and verified (dispatcher counts match DISPATCHER_DIGEST.md: prism_orchestrate=71 actions, prism_atcs=12, prism_autopilot_d=7, prism_autonomous=8, prism_omega=6).

**Stale / inaccurate content found:**

1. `TOOLBELT.md` lists only `prism_orchestrate` as the domain dispatcher — missing prism_atcs, prism_autopilot_d, prism_autonomous. These are load-bearing daily-use dispatchers for this galaxy, verified in DISPATCHER_DIGEST.md.
2. AWARENESS.md reports "AI engines attributed: 0 / AI dispatcher actions: 0 / reasoning/neural bridges: 0" — this is the auto-generated heuristic and is clearly wrong (the galaxy owns/wires AgentExecutor, AgenticLoopEngine, ConsensusCoordinatorEngine, etc.). Safe to mark as advisory-only.
3. The "Critic + keep-working contract" stanza (last block of CLAUDE.md) is a global-doctrine pointer — load-bearing but could be slimmed to a one-liner pointer instead of 5 lines.
4. The `<!-- AI-SYSTEMS-STATE:BEGIN -->` block in CLAUDE.md is DUPLICATED verbatim in MEMORY.md — wasted tokens on the cascade load.
5. PATHS.md `## Engines` list is auto-derived with 143 name-matched entries prefaced "verify ownership" — this is honest but the raw list bloats the file. The 83 unlisted entries are hidden behind "…and 83 more (keyword match — prune false positives)." No pruning has occurred since scaffold generation 2026-05-29.
6. No stale dispatcher names or fabricated engine names found — the cited engines (AgentExecutor, AgenticLoopEngine, AgentRegistryEngine, ConsensusCoordinatorEngine, CrossSessionOrchestratorEngine) are all verified present in ENGINE_DIGEST.md.

---

## KEEP

From **CLAUDE.md** — keep as-is (all verified):
- `## Scope` — precise domain boundary (hive-mind, swarm, slot-fleet, prism_orchestrate)
- `## Cross-galaxy edges` — accurate ↔ ALL galaxies pointer + 4 named symmetric edges
- `## Action surface` — full verified dispatcher list (prism_orchestrate + prism_atcs), file-system-native fleet coordination paths (slot-task-claims.json, chat-slots.json, AGENT_CHAT.jsonl), per-prompt fleet enrichment hook names
- `## Known failure modes / anti-patterns` — all 5 items are grounded, cited, and unique to this domain (the rate-limit lesson from 2026-06-08 is especially load-bearing)
- `## Cross-cutting methodology` block — PC specs, Ollama model tiers, loop discipline, vault paths, harness/LoRA/CAG/RAG guidance; all verified and domain-relevant
- `## AI-systems fleet state` synergy pointer — valid single pointer, keep (remove the MEMORY.md duplicate instead)
- `## Critic + keep-working contract` — keep the intent, slim to a 2-line pointer

From **MEMORY.md** — keep:
- Master-brain link block, Indexed memories section, Cross-galaxy bridges, Standing patterns/invariants, Known assets, Domain anchors (authoritative corpus refs)
- `AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md` reference — this is the richest domain knowledge artifact in this galaxy; keep the pointer and the 7-topic summary

From **PATHS.md** — keep:
- Critical resource roots block (auto-maintained, fleet-wide)
- Registered DB intake block (InferenceDB + WorkflowDB)
- Knowledge/tribal/memory atlas block (uniform vault routing)
- The `## Paths cited in this galaxy's CLAUDE.md` list (small, useful for drift detection)

From **TOOLBELT.md** — keep:
- Shared token-lean patterns (route before Grep, Ollama-offload, RTK, parallel calls)
- Karpathy 5-step (universal but domain-scaffolded here)

From **SOUL.md** — keep:
- `## Refuses` list — the 5 domain-specific refuses are precise and enforced

---

## DROP

From **CLAUDE.md**:
- The duplicated `<!-- AI-SYSTEMS-STATE:BEGIN -->` block — already in MEMORY.md; drop one copy. Keep in MEMORY.md (naturally recalled); remove from CLAUDE.md to save ~8 lines on every cascade load.
- The verbose 5-line "Critic + keep-working" block — compress to a 1-line pointer: `Critic discipline + keep-working: see global CLAUDE.md §HONESTY RULES + R6 + R12 + scrutinize-before-stop.mjs`.

From **TOOLBELT.md**:
- The auto-generated one-liner `## This galaxy's dispatchers: prism_orchestrate` — replace with the full verified list (see ADD below).

From **PATHS.md**:
- The 143-engine name-matched raw list (all 66 shown + "83 more") — replace with the ~12 engines that are verified load-bearing for this domain (see ADD). The raw keyword-match list has served its scaffold purpose; it wastes ~40 lines of cascade tokens on CAD/lathe/EDM orchestrators that are not daily-use for agent-orchestration work.

From **MEMORY.md**:
- The `<!-- AI-SYSTEMS-STATE:BEGIN -->` duplicate — drop from here since it's in CLAUDE.md (or vice versa; pick one).
- The auto-fill disclaimer `_Auto-surfaced by scripts/fill-galaxy-memory-sections.mjs…_` — keep for regeneration guidance but trim the advisory warning from the body since the distilled facts are mostly correct and already footnoted.

**Generic content not worth carrying in the galaxy file (pointer to main CLAUDE.md is sufficient):**
- No generic content in CLAUDE.md currently duplicates main — the cross-cutting methodology was intentionally added here per the galaxy-enrichment program. Keep it; the value/token ratio is high for this domain.

---

## ADD (domain-specific — the heart of this assessment)

### 1. Verified core engine list (replace the 143-entry scaffold dump in PATHS.md)

The following are verified present in ENGINE_DIGEST.md and are the daily-use engines for agent-orchestration work:

```
AgentExecutor.ts              — multi-agent orchestration, task queue, execution coordination
AgenticLoopEngine.ts          — Observe-Think-Act orchestrator (the core loop primitive)
AgentRegistryEngine.ts        — agent inventory + trigger-keyword registry
AgentMemoryFabricEngine.ts    — cross-session agent memory
AgentSelfAwarenessEngine.ts   — unified PRISM self-awareness surface
CrossSessionOrchestratorEngine.ts — cross-session orchestration (U-COORD04)
CrossTerminalCoordinationEngine.ts — multi-terminal work distribution
ConsensusCoordinatorEngine.ts — concurrency-aware wrapper around MultiModelConsensusEngine
LocalModelOrchestratorEngine.ts   — local-model routing (Phase 0.19 U-LLM1)
AutonomousAIOrchestrationEngine.ts — self-reliant AI system orchestration
CoordinatorSwarmEngine.ts     — (PATHS.md only; not in ENGINE_DIGEST.md — UNVERIFIED in digest)
FullSystemAICoordinatorEngine.ts  — (PATHS.md only; flagged UNWIRED in system graph)
```

### 2. Full dispatcher surface (TOOLBELT.md needs this)

```
prism_orchestrate  — 71 actions — primary: swarm-init, agent-spawn, hive-mind worker dispatch
prism_atcs         — 12 actions — file-system state machine; backs /loop, /autopilot-full, /yolo
prism_autopilot_d  — 7 actions  — AutoPilot workflow orchestration
prism_autonomous   — 8 actions  — autonomous execution engine; bridges ATCS state machine
prism_omega        — 6 actions  — Omega quality equation Ω(x); used for task-quality gating
```

### 3. Fleet coordination infrastructure (explicit paths, verified)

Critical file-system-native coordination surfaces (all verified in CLAUDE.md §Action surface + codebase):
```
state/shared/slot-task-claims.json         — per-slot MILESTONE::U-ID locks (PER-SLOT-CLAIM-MS0)
.claude/helpers/chat-slots.mjs             — 26-slot NATO registry + slot-liveness API
.claude/helpers/chat-slots.json            — live slot state (lastHeartbeat, branch, pid)
state/shared/AGENT_CHAT.jsonl              — inter-agent chat bus
state/shared/AGENT_WORKBOARD.md            — task workboard
.claude/helpers/slot-task-claim.mjs        — CLI: claim|release|heartbeat|list|check|sweep
.claude/hooks/slot-context-bundle-inject.mjs — per-prompt fleet enrichment hook (verified in hooks dir)
```

### 4. Key scripts for this galaxy's daily workflow (add to TOOLBELT.md)

```bash
# Claim a task before building (mandatory per anti-pattern #4)
node .claude/helpers/slot-task-claim.mjs claim --slot <nato> --unit "MILESTONE::U-ID"

# Heartbeat an in-progress claim
node .claude/helpers/slot-task-claim.mjs heartbeat --slot <nato>

# Check live fleet slot state
node .claude/helpers/chat-slots.mjs golf-liveness

# Query orchestration-related memories
prism_memory:semantic_search query="agent-orchestration" topK=20

# Reason over this galaxy's own corpus (PSN leg #10, $0 local Ollama)
node scripts/lib/galaxy-reasoning-bridge.mjs agent-orchestration "<question>"

# Check fleet task health
node .claude/hooks/fleet-task-health-watch.mjs  # (advisory)
```

### 5. Domain-specific "what NOT to do" (formalize as REFUSES section in CLAUDE.md)

The SOUL.md refuses are good; promote them into CLAUDE.md with brief justifications:
- **NEVER use `mcp__claude-flow__{swarm_*,agent_spawn,hive_mind_*}`** — redundant with native 26-slot fleet; token waste
- **NEVER fan out >8 parallel agents when fleet already runs N concurrent /loops** — shared API rate-limit at 15-20 wide (observed 2026-06-08 live lesson)
- **NEVER spawn a fleet-reaper** — golf owns it; `feedback_golf_owns_reaper.md`
- **NEVER build a unit without `slot-task-claim claim` first** — race condition with peer slots
- **NEVER assume MCP is up** — if `:3100` ECONNREFUSED, fall back to `node scripts/<X>.mjs` directly
- **NEVER hardcode slot count** — read `SLOT_NAMES.length` from `.claude/helpers/chat-slots.mjs`
- **NEVER inline slot names in fan-out logic** — the sequence `alpha..zulu` is canonical; read it, don't re-enumerate
- **NEVER continue silently on a failed tool call in a loop** — stop and surface the error (Addy Osmani loop-engineering rule #2: "done is a claim, not a proof"; AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md §2.1)

### 6. Canonical corpora for agent-orchestration (missing from CLAUDE.md, present in MEMORY.md only)

```
AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md       — 7-topic distilled corpus (loops/harness/LoRA/CAG/RAG/GNN/Obsidian);
                                             built 2026-06-10 via 8-agent Workflow; R12-verified
state/shared/articles/                     — 7 full-capture operator-submitted articles
state/shared/articles/_topic-memos-2026-06-10/  — raw per-topic mining memos
knowledge/wiki/agent-orchestration/        — 5 wiki entries (domain-tagged)
knowledge/wiki/architecture/agent-orchestration-galaxy.md
knowledge/wiki/software-engineering/subagent-orchestration-discipline.md
knowledge/wiki/code-tribal/llm-agent-loop-design.md
knowledge/wiki/code-tribal/subagent-dispatch-patterns.md
knowledge/memories/patterns/agent-orchestration_synthesis.md  — Obsidian synthesis brain
```

### 7. Key invariants missing from CLAUDE.md (present in MEMORY.md only — promote a pointer)

- **Workflow tool = deterministic JS fan-out** — `parallel` / `pipeline` composable patterns; subagent prompts must be self-contained (goal + absolute paths + invariants + test cmd + output format)
- **Default subagent StructuredOutput schema incompatibility** — `[[reference_alpha_explore_agent_schema_incompat]]`; use plain-text agents or verify schema returns
- **Loop state tick discipline** — every `/loop` iteration MUST `loop-state tick` or `/compact` strands the count

### 8. Missing: explicit slot affinity note in CLAUDE.md

The SOUL.md says "slotless infra galaxy — fleet-shared" but CLAUDE.md §Scope says "canonical slot: zulu (de-facto)". This is a real conflict (R7): zulu is the de-facto affinity per ZULU-OMNISCIENT-MS0 / ZULU-ORCHESTRATOR-MS0, but the galaxy is formally fleet-shared (no dedicated slot). CLAUDE.md should state both explicitly: "**Slot affinity: zulu (de-facto owner per ZULU-OMNISCIENT-MS0); formally fleet-managed — any slot may orchestrate via prism_orchestrate.**"

---

## IDEAL SECTION OUTLINE

```
# agent-orchestration Galaxy — Sentinel

## Slot affinity + scope
  - zulu de-facto (ZULU-OMNISCIENT-MS0 + ZULU-ORCHESTRATOR-MS0); fleet-shared
  - domain boundary: swarm, hive-mind, 26-slot fleet coordination, per-task model routing,
    autonomous task completion, multi-agent consensus

## Action surface (route here before reimplementing)
  - Full dispatcher table: prism_orchestrate (71) · prism_atcs (12) · prism_autopilot_d (7)
    · prism_autonomous (8) · prism_omega (6)
  - Fleet coordination file paths (slot-task-claims.json, chat-slots.mjs, AGENT_CHAT.jsonl)
  - Per-prompt fleet enrichment: slot-context-bundle-inject.mjs + zulu-context-bundle.mjs

## Core engines (verified in ENGINE_DIGEST.md)
  - ~12 verified daily-use engines (see ADD §1)

## Key scripts + daily workflow
  - slot-task-claim CLI, chat-slots liveness, galaxy-reasoning-bridge, fleet-task-health

## Domain REFUSES (what NOT to do)
  - 8 explicit refuses (see ADD §5)

## Known failure modes / anti-patterns
  - Fan-out rate-limit (keep; add budget-gate pattern)
  - MCP-down fallback (keep)
  - Claim-before-build (keep)
  - golf owns reaper (keep)
  - Loop iteration must tick loop-state (add)
  - Subagent StructuredOutput schema incompatibility (add)

## Harness + loop engineering doctrine
  - 5 building blocks (from AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md §1)
  - Orchestrator/specialist/subagent split
  - LoRA / CAG / RAG pointers (model-only-for-judgment R5)
  - Ollama model tier table (120b/32b/1.5b/nomic-embed)

## Obsidian vault + recall
  - Vault paths, semantic_search command, galaxy-reasoning-bridge

## Domain corpora (pointers)
  - AGENTIC-SYSTEMS-SOURCE-KNOWLEDGE.md, wiki/agent-orchestration/, synthesis brain

## Cross-galaxy edges (PSN)
  - ↔ ALL galaxies · ↔ discovery · ↔ token-optimization · ↔ hermes-zulu · → ai-training

## AI-systems fleet state (synergy pointer)
  - Single pointer block to knowledge/memories/patterns/ai-systems-fleet-state.md

## Universal-core pointer
  - → main CLAUDE.md (safety rails, R1-R15, 3-of-3 scrutiny, handoff, commit format)
```

---

## UNIVERSAL-CORE POINTER

The following universal rules MUST remain accessible as a pointer to main `H:/prism/CLAUDE.md` — do NOT duplicate into this galaxy file:

- **Safety rails:** no-inline-physics-constants, no-stub-engines, units-first (§SAFETY RAILS)
- **R1-R15 rules:** Karpathy discipline + agent-era rules (§KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13)
- **3-of-3 scrutiny gate:** `scrutiny-3way.mjs` + scrutiny ledger (§SCRUTINY GATE)
- **Per-chat handoff protocol:** `per-agent-handoff.mjs write/read` (§PER-CHAT HANDOFF)
- **Commit format:** `[SCOPE]/U-ID: title` (§SESSION HYGIENE)
- **Slot-worktree lane discipline:** commit to `slot/<nato>` not trunk (§LANE DISCIPLINE)
- **HONESTY RULES:** verify before claiming, R12 fail-loud, existence != complete (§HONESTY RULES)
- **claude-flow tool policy:** redundant vs harvest 5 (§CLAUDE-FLOW TOOL POLICY)
- **Golf slot / fleet-reaper:** golf owns the reaper (§GOLF SLOT + §FLEET-REAPER)
- **MCP dispatcher map:** full `DISPATCHER_DIGEST.md` (§MCP DISPATCHERS)

**Pointer line to add at top of galaxy CLAUDE.md:**
```
> Universal doctrine (safety/R1-R15/scrutiny/handoff/commit/honesty): H:/prism/CLAUDE.md (do not duplicate here).
```
