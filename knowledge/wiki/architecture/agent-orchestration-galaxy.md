---
title: Agent-Orchestration Galaxy — Architecture Map
type: architecture
domain: agent-orchestration
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [agent-orchestration, model-routing, fleet, agentic-loop, galaxy]
---

# Agent-Orchestration Galaxy — Architecture Map

The agent-orchestration galaxy orchestrates all galaxies + per-task model routing across the 26-slot NATO fleet. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/agent-orchestration/MEMORY.md` · doctrine: `mcp-server/src/engines/agent-orchestration/CLAUDE.md`

## Role

Per the brain: `AgentExecutor` (multi-agent orchestration, task queue, execution coordination), `AgenticLoopEngine` (Observe-Think-Act orchestrator), `AgentRegistryEngine` (inventory of Task-tool agents with trigger keywords). Golf owns the fleet-reaper (doctrine moved alpha→golf 2026-05-16, [[feedback_golf_owns_reaper]]). Per-task model routing + pre-search runs on every slot.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/agent-orchestration/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — agent-orchestration is a federation spoke; rolls up to the master brain
- [[feedback_golf_owns_reaper]] · [[feedback_psn_definition]]

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the agent-orchestration galaxy card + master-index back-pointer. Domain owner refines._
