# SWARM-LAUNCHER-MS0 — single-command reasoning-agent swarm launcher

> **Status:** design spec (advisory) · **Author:** echo /goal synergy loop iter 15 · **Date:** 2026-05-21
> **Origin:** user directive "fold it" — fold the swarm-scale-launcher gap (identified in the
> Kimi K2.6 architecture comparison) into the /goal synergize loop as a candidate milestone.
> **Spec only — `mustHumanVerify: true`. Registers buildable units; does not auto-flip any roadmap.**

## 1. Why this exists

The /goal `synergize ... entire prism ecosystem fully wired and operational, self learning,
self operating` has one material gap on the **swarm-scale** axis. A comparison against the
Kimi K2.6 "Agent Swarm" pattern (300 parallel sub-agents, one command → 100 files) put a
number on it: PRISM is **~55%** there. PRISM has the *coordination substrate* but not the
*single-entry launcher*. This spec names the precise gap and the buildable units to close it.

## 2. What PRISM already has (the substrate — DO NOT rebuild)

| Layer | Asset | What it does |
|---|---|---|
| Swarm patterns | `SwarmExecutor.ts` | 8 patterns: parallel · pipeline · map_reduce · consensus · hierarchical · ensemble · competition · collaboration. 9 reduce functions (concat/merge/sum/avg/max/min/first/last/vote). |
| Group exec | `SwarmGroupExecutor.ts` | group-level swarm execution |
| Task runner | `AgentExecutor.ts` | task execution with priorities + `TaskResult` |
| Agent registry | `AgentRegistry.ts` | registered agents (id, name, category, status, enabled) |
| Dispatcher | `prism_orchestrate` | `swarm_execute · swarm_parallel · swarm_consensus · swarm_pipeline · swarm_quick · agent_parallel · agent_pipeline · plan_create · plan_execute` |
| Decomposition | `prism_context` | `parallel_plan · parallel_infer_dependencies · parallel_can_parallel` — **already builds dependency-aware execution plans** |
| Task state machine | `prism_atcs` | `task_init · queue_next · unit_complete · batch_validate · checkpoint · assemble` |
| Reasoning-agent fleet | 26-slot NATO chat fleet | 26 concurrent Claude sessions, coordinated via `chat-slots.json` + `slot-task-claim.json` + chat-bus + per-agent handoffs |
| Subagent spawn | Agent tool | spawns Claude reasoning subagents (per-chat, bounded ~2-3/scrutiny gate) |
| Locking | `DistributedLockManager` | `withLock(resource, fn)`, first-writer-wins + retry backoff |
| Coordinators | mesh / hierarchical / adaptive / byzantine | topology-specific agent coordination agent-types |

**The decomposition front-end and the aggregation back-end already exist.** `parallel_plan` +
`parallel_infer_dependencies` produce a dependency-aware unit graph; `SwarmExecutor`'s reduce
functions (`concat`/`merge`) aggregate results. This is ~70% of a launcher.

## 3. The precise gap — three disconnected layers

PRISM has three separate "swarm" surfaces that **never connect end-to-end**:

1. **`SwarmExecutor` + `swarm_execute`** — runs 8 coordination patterns, BUT over
   `agentRegistry` agents, which are internal `AgentExecutor` *compute-task runners*, **not
   Claude reasoning agents**. Confirmed: `orchestrationDispatcher.ts:177` `swarm_execute`
   resolves `agentRegistry.all()`; `swarm_quick:239` filters `enabled && status==="active"`
   registry agents. Powerful pattern layer, wired to the wrong worker type.

2. **Agent tool** — spawns *real Claude reasoning agents*, BUT bounded (a chat spawns a
   handful), per-chat (no cross-chat swarm), and with no pattern layer (no consensus/
   map_reduce/ensemble over the spawned set — the caller hand-codes it each time).

3. **26-slot NATO fleet** — *real Claude reasoning agents at fleet scale*, BUT
   **human-launched** (one terminal window per slot). No programmatic "spawn N slots from
   one command". Coordination (claims, chat-bus, handoffs) exists; the launcher does not.

**The missing piece is the bridge:** one command → decompose task → spawn N **reasoning-agent**
workers → reap → aggregate to real files. Each of the three layers owns part of it; nothing
owns the whole path.

## 4. Design — `SwarmLaunchOrchestrator`

A thin orchestrator that **wires existing primitives** — it is NOT a from-scratch build.

```
/swarm "<task>" [--parallelism N] [--pattern map_reduce|parallel|consensus]
   │
   ├─ 1. DECOMPOSE   → prism_context:parallel_plan + parallel_infer_dependencies
   │                   (EXISTS) → dependency-aware unit graph
   ├─ 2. ROUTE       → NEW: parallelism budget → worker class:
   │                     ≤ ~8 independent units  → Agent-tool subagents (one chat)
   │                     > ~8 units              → slot-chat workers via slot-task-claim
   ├─ 3. SPAWN       → NEW: the bridge — emit Agent() calls OR slot-task claims +
   │                     worker prompts; this is the genuinely-new ~150 LOC
   ├─ 4. REAP        → EXISTS: Agent-tool returns (subagent path) /
   │                     slot-task-claim heartbeat + post-commit release (slot path)
   ├─ 5. AGGREGATE   → SwarmExecutor reduce (concat/merge) (EXISTS) → real files
   └─ 6. CHECKPOINT  → prism_atcs:checkpoint + assemble (EXISTS)
```

**Worker-type honesty:** the Agent-tool path is genuinely parallel within one chat's turn
(multiple `Agent()` calls in one message run concurrently). The slot-chat path is parallel
across terminal windows but needs N slots already alive — so true "300 from one command"
requires either (a) a slot auto-spawn mechanism (out of scope — harness-level) or (b)
accepting subagent-level parallelism (~8-12) as the realistic ceiling per launch. **The spec
recommends (b)** as MS0: a 8-12-wide reasoning swarm from one command is a real, shippable
capability and covers the large majority of decomposable tasks. Fleet-scale (26+) stays the
human-launched `/checkin-<slot> /loop` model until a harness slot-spawn primitive exists.

## 5. Buildable units (the milestone)

| Unit | Deliverable | Reuses | New LOC (est.) |
|---|---|---|---|
| **U-SWARM-01** | Decomposition front-end — wraps `parallel_plan` + `parallel_infer_dependencies` into a swarm-ready unit graph (independent-set extraction) | `prism_context` parallel_* | ~80 |
| **U-SWARM-02** | Worker-route planner — parallelism budget → worker class (subagent vs slot), pure function + tests | — | ~120 |
| **U-SWARM-03** | Spawn bridge — emits Agent-tool call batch (subagent path) from the unit graph + worker prompts | Agent tool | ~150 |
| **U-SWARM-04** | Reap + aggregate back-end — collects worker results, applies `SwarmExecutor` reduce → real files | `SwarmExecutor`, `prism_atcs:assemble` | ~100 |
| **U-SWARM-05** | `/swarm` skill — single-command entry tying U-01..04; `prism_orchestrate:swarm_launch` action | all above | ~60 + skill md |
| **U-SWARM-06** | Wire `SwarmExecutor` patterns over reasoning-agent workers (pattern layer now applies to real agents — consensus/map_reduce/ensemble over Claude subagents) | `SwarmExecutor` | ~90 |

Total est.: ~600 new LOC + 1 skill + 1 dispatcher action. **Milestone-scale — 6 units, not a
single /loop iter.** ~70% of the value is wiring existing surface; the genuinely-new code is
U-02 (route planner) + U-03 (spawn bridge).

## 6. Honest scoping vs the Kimi blueprint

- **Realistic MS0 ceiling:** 8-12-wide reasoning swarm from one command (subagent path).
- **Not in MS0:** true 300-agent scale — that needs a harness-level slot auto-spawn primitive
  PRISM cannot build (it's Claude Code infrastructure, not PRISM code). 26-slot fleet stays
  human-launched.
- **PRISM is NOT building a Kimi K2.6 competitor** — PRISM orchestrates whatever frontier
  model is best. This milestone closes the *application-stack* swarm gap, not the *model* gap.

## 7. Loop integration

Folded into the /goal synergize loop per user directive "fold it" (2026-05-21). U-SWARM-01..06
are now candidate units. The /goal synergy loop continues its substrate-triplet work
(iter 16 = substrate-3 viz roost completion); SWARM-LAUNCHER-MS0 units are pickable by any
slot via the priority queue once registered in `atomic-roadmap.json`.

**Next:** the substrate-3 viz roost (deferred from iter 15) ships as iter 16; SWARM-LAUNCHER
units enter the loop's pickup pool as a named milestone.
