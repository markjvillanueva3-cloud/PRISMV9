---
name: feedback-agent-fanout-gate-on-fleet-load
description: Gate parallel agent/Workflow fan-out width on live fleet load — a 15-20-wide blast rate-limits out when N /loops already run concurrently.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.396Z
aliases: feedback_agent_fanout_gate_on_fleet_load
---


When the fleet already runs multiple concurrent `/loop`s, a fresh WIDE parallel agent fan-out (a `Workflow` with `parallel()` over 15-20 agents) **rate-limits out entirely** — `API Error: Server is temporarily limiting requests (not your usage limit)` — returning ZERO results while still burning subagent tokens.

**Observed 2026-06-08 (slot:papa):** a 20-agent galaxy-context-depth-audit Workflow failed every single agent + the synthesis arm; `galaxiesAudited:0`, ~1.2M subagent tokens spent for nothing, while 8 fleet `/loop`s were live.

**Why:** the rate limit is SERVER-side and SHARED across the whole fleet's API usage, not your per-session usage cap. A 20-wide blast from one slot collides with every peer slot's concurrent agents and trips the global throttle.

**How to apply:**
1. Before a wide `Workflow`, check live fleet load — `loop-state` lists other active `/loop` sessions; the chat-bus shows peers online.
2. Prefer NARROWER waves (e.g. 4-6 at a time) or `pipeline`-with-barrier over one 20-wide `parallel()`.
3. Have agents return compact schema'd verdicts so a PARTIAL wave still yields value (a 20-wide all-or-nothing blast yields nothing on throttle).
4. Do the deterministic grunt yourself (`grep`/`ls`/`wc`) and reserve agents for genuine judgment only (R5 — code answers deterministic questions). Most "audit" work is deterministic and needs no agent.

Codified in the agent-orchestration galaxy sentinel (`mcp-server/src/engines/agent-orchestration/CLAUDE.md` anti-pattern #2). Pairs with [[feedback_r5_thru_r12_doctrine]] R6 (token budgets are not advisory). Sibling separate failure mode: MCP `:3100` down silently fails `prism_*` dispatcher calls — fall back to `node scripts/<X>.mjs`, never assume success (R12).
