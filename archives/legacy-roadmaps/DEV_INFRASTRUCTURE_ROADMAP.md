# MCP SERVER DEVELOPMENT INFRASTRUCTURE ROADMAP
# Priority: TOP — This is THE roadmap. Everything else is downstream.
# Scope: MCP server internals ONLY. No manufacturing data campaigns, no product features.
# Truth Source: MASTER_INDEX.md (31 dispatchers, 368 actions, 37 engines, 19 registries)
# Date: 2026-02-13 (updated from 2026-02-11)

---

## PROBLEM STATEMENT

We built a massive capability set and are using a fraction of it:

| System | Have | Using | Utilization | Gap |
|--------|------|-------|-------------|-----|
| Hooks | 118 | ~25 firing | 21% | 93 hooks dormant |
| Agents | 64 (3 tiers) | ~10 invoked | 16% | 54 agents idle |
| Skills | 119 verified | ~30 loaded | 25% | 89 skills unused |
| Scripts | 73 core | ~20 registered | 27% | 53 scripts invisible |
| Swarm patterns | 8 | 2 used | 25% | 6 patterns dormant |
| ATCS | 10 actions | Rarely | 10% | Autonomous capability wasted |
| Manus | 11 actions | Occasionally | 30% | Delegation potential wasted |
| Auto-fire cadence | 30 functions | ~20 firing | 67% | 10 functions dormant |
| Superpowers | 3 systems | Only when remembered | ~30% | Should be DEFAULT |
| Compaction recovery | 3 layers | Advisory only | 70% success | 30% failure = lost work |

This roadmap fixes all of it. 7 phases (D0-D6), ~28 work items, est 7-12 sessions.
Full content: See /mnt/user-data/outputs/DEV_INFRASTRUCTURE_ROADMAP.md (928 lines)

## PHASES

D0: FIX BROKEN (1 session) - code_search, agent strings, phase0_hooks, dead code
D1: WIRE EVERYTHING (1-2 sessions) - scripts, hooks 21%→80%, skills auto-load, agent auto-recommend
D2: AUTO-FIRE (1-2 sessions) - ralph default gate, omega on all, brainstorm auto, ATCS auto, manus auto, hook chains
D3: CONTEXT & TOKENS (1-2 sessions) - compaction 70→95%, progressive loading, token budgets, auto-continuation
D4: LEARNING (1-2 sessions) - session-end learning 0→5+, error DB, knowledge graph
D5: ORCHESTRATION (1-2 sessions) - AutoPilot default, swarm deployment, pipeline automation
D6: AUTONOMOUS (1-2 sessions) - Manus↔ATCS, multi-session tasks, self-monitoring

All manufacturing/product work DEFERRED until D0-D6 complete.
Every Part 9 underutilization issue has a specific phase and fix.
Master Index verified: 27 dispatchers, 324 actions, 29 engines, 19 registries, 73 scripts, 119 skills.