---
source: project
section: CLAUDE-FLOW TOOL POLICY (2026-05-28, slot:alpha)
slug: claude-flow-tool-policy-2026-05-28-slot-alpha
indexed_at: 2026-06-06T05:19:14.888Z
---

## CLAUDE-FLOW TOOL POLICY (2026-05-28, slot:alpha)

`mcp__claude-flow__*` exposes ~200 tools, **mostly redundant** with PRISM natives. Stop wasting attention on them. The rule:

**REDUNDANT — use PRISM natives instead:**
| claude-flow | PRISM native |
|---|---|
| `swarm_*` / `agent_spawn` / `hive_mind_*` | 26-slot NATO fleet + SLOT-WORKTREE-MS0 + slot-tab-boot launcher |
| `memory_store / memory_search / memory_retrieve` | `prism_memory:*` + auto-memory + AgentDB-backed |
| `hooks_*` | 700+ live PRISM hooks in `.claude/hooks/` |
| `embeddings_search / embeddings_generate` (basic) | ONNX 384-d + HNSW (`embeddings_search` action via PRISM) |
| `autopilot_*` | `prism_atcs:*` (12 actions, file-system state machine) |
| `task_*` | TaskCreate native + `prism_business:task_*` |
| `session_*` | `prism_session:*` + per-chat HANDOFF-* |
| `config_*` | direct settings.json edit via c-to-h-mirror |

**HARVEST — keep 5; no PRISM equivalent:**
1. **`embeddings_rabitq_build / _search`** — 1-bit quantized HNSW (32× compression). Use when NN-GRAPH MS2 retrain (~9GB RAM) hits memory pressure.
2. **`agentdb_graph-pathfinder`** — personalized PageRank / dynamic-mincut / spectral-sparsify / temporal-centrality. Stronger than our hand-rolled BFS in `/system-viz find`.
3. **`hooks_route`** — 3-tier model routing. **Tier-1 = Agent Booster, 0ms/$0 for var-to-const, add-types, simple renames** — every refactor like that should route here, not Sonnet.
4. **`managed_agent_create / prompt / events / terminate`** — Anthropic cloud-managed long-running agents (CLOUD, not the WASM-local subagents). Useful when a slot needs a multi-hour bake that survives /compact + cross-session restart.
5. **`aidefence_scan / has_pii / is_safe`** — PII + prompt-injection scanner. Plug into `intake_processor_*` / email-intake / webhook-ingest (currently ZERO PII gate on untrusted intake).

**DEFER — interesting but lower ROI today:** `wasm_agent_*` (sandbox isolation — niche), `consensus_decide` (octopus already covers), `daa_*` (cognitive-pattern adaptation — overlaps Hermes), `neural_*` train/predict (overlaps PRISM neural).

**Rule for chats:** if a task fits the redundant column, use the PRISM native — claude-flow on the redundant side is a token-burn distraction. The 5 HARVEST tools are real leverage; the other ~195 are not.
