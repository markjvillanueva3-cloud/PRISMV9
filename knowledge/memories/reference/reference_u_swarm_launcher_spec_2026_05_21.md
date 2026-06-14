---
name: reference_u_swarm_launcher_spec_2026_05_21
description: "2026-05-21 echo /loop iter 15. SWARM-LAUNCHER-MS0 design spec — user directive 'fold it' folded the swarm-scale-launcher gap into the /goal loop. 3 disconnected swarm layers identified; 6 buildable units. Commit e3d46d566a."
aliases: reference_u_swarm_launcher_spec_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.024Z
---


# U-GOAL-SYNERGY-SWARM-LAUNCHER-SPEC — swarm-launcher design (iter 15)

**Commit:** `e3d46d566a` (clean solo-file commit, no misattribution)
**Loop state:** iter 15/20 status=ok
**Spec file:** `state/shared/specs/SWARM-LAUNCHER-MS0.md`

## Origin

User asked "how close are we to developing something like this" re: an X post (@noisyb0y1) describing a Kimi K2.6 "Agent Swarm" (300 parallel sub-agents, one command → 100 files). Comparison verdict: PRISM is at/ahead of the blueprint on skill injection (~95%), MCP tools (~85%), real-file output (~95%), self-correcting CLI (~90%), self-operating loop (~85%) — and behind on exactly one axis: **swarm-scale (~55%)**. User directive: **"fold it"** — fold the swarm-launcher gap into the /goal synergize loop. This iter is the assessment + design spec.

## The finding — 3 disconnected swarm layers

PRISM has three separate "swarm" surfaces that never connect end-to-end:

1. **`SwarmExecutor` + `prism_orchestrate:swarm_execute`** — 8 coordination patterns (parallel/pipeline/map_reduce/consensus/hierarchical/ensemble/competition/collaboration) + 9 reduce functions. BUT runs over `agentRegistry` agents = internal `AgentExecutor` compute-task runners, **not Claude reasoning agents**. Confirmed: `orchestrationDispatcher.ts:177` `swarm_execute` resolves `agentRegistry.all()`; `:239` `swarm_quick` filters enabled+active registry agents. Powerful pattern layer, wired to the wrong worker type.

2. **Agent tool** — spawns real Claude reasoning subagents, BUT bounded (~2-3/scrutiny gate), per-chat, no swarm-pattern layer.

3. **26-slot NATO fleet** — real reasoning agents at fleet scale, BUT human-launched (one terminal window per slot).

**Missing piece = the bridge:** one command → decompose task → spawn N reasoning-agent workers → reap → aggregate to real files. Each layer owns part of the path; nothing owns the whole.

## Key reuse insight

Decomposition + aggregation **already exist**:
- `prism_context:parallel_plan` + `parallel_infer_dependencies` → dependency-aware unit graph
- `SwarmExecutor` reduce functions (`concat`/`merge`) → aggregate results
- `prism_atcs:checkpoint` + `assemble` → file assembly

~70% of a launcher is wiring existing surface. Genuinely-new code: a worker-route planner (parallelism budget → subagent vs slot) + the spawn bridge.

## 6 buildable units registered (SWARM-LAUNCHER-MS0)

| Unit | Deliverable | New LOC est. |
|---|---|---|
| U-SWARM-01 | decomposition front-end (wraps parallel_plan) | ~80 |
| U-SWARM-02 | worker-route planner (budget → worker class) | ~120 |
| U-SWARM-03 | spawn bridge (emit Agent-tool batch) | ~150 |
| U-SWARM-04 | reap + aggregate back-end | ~100 |
| U-SWARM-05 | `/swarm` skill + `swarm_launch` dispatcher action | ~60 |
| U-SWARM-06 | wire SwarmExecutor patterns over reasoning workers | ~90 |

~600 LOC total. **Milestone-scale, not a single /loop iter.**

## Honest scoping

- **MS0 realistic ceiling:** 8-12-wide reasoning swarm from one command (subagent path — multiple `Agent()` calls in one message run concurrently).
- **NOT in MS0:** true 300-agent scale — needs a harness-level slot auto-spawn primitive PRISM cannot build (it's Claude Code infrastructure). 26-slot fleet stays human-launched `/checkin-<slot> /loop`.
- **PRISM is not building a Kimi K2.6 competitor** — PRISM orchestrates whatever frontier model is best. This milestone closes the application-stack swarm gap, not the model gap.

## Loop continuity

Iter 15 was originally planned as the substrate-3 viz roost (completing the iter-13/14 prism-ai-memo triplet). The "fold it" directive displaced it; the viz roost ships as **iter 16**. SWARM-LAUNCHER-MS0 units enter the loop's pickup pool as a named milestone (registration in `atomic-roadmap.json` pending — advisory spec only, mustHumanVerify).

## Next-iter pickup

- **Iter 16** — substrate-3 `/system-viz` roost (`ghost.ai_memo_xref` roost + blind-spot children; mirror iter-9; completes the prism-ai-memo producer/consumer/viz triplet)
- **Iter 17** — meta-roost integration (extend iter-10 rollup with aiMemoXref substrate + register in iter-12 SUBSTRATE_TO_ROOST so the meta-roost compounds substrate-3 automatically)
- **Iter 18-20** — NN/GNN feedback consumer (lane-coordinate `claude-dbba2d72`) + handoff hygiene + roll-up close-out
- **SWARM-LAUNCHER-MS0** — U-SWARM-01..06 pickable by any slot once roadmap-registered
