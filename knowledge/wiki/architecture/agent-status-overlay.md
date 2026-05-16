---
title: Agent-status overlay (G2 — pixel-department overlay for system-viz)
kind: architecture
milestone: OBSIDIAN-INTELLIGENCE-MS3/U-AGENT-PIXEL-DEPT-OVERLAY
status: current
created: 2026-05-16
---

# Agent-status overlay — live subagent badges on the system-viz map

OBSIDIAN-INTELLIGENCE-MS3 / G2 (U-AGENT-PIXEL-DEPT-OVERLAY). Ship commit `c1e7c6d06`.

## What it is

A live "pixel department" overlay for the PRISM system-viz graph: one
color-coded badge per occupied chat slot, showing whether that agent is
**typing**, **parsing**, **idle**, or **errored**. It turns the abstract
12-slot fleet into a glanceable activity board layered over the 3D graph.

## Status classification

Each occupied slot in `chat-slots.json` is classified by `classifyAgentStatus`
(precedence, first match wins):

| Status | Condition | Color |
|--------|-----------|-------|
| `errored` | matched AGENT_CHAT entry has an error status, OR heartbeat unparseable, OR heartbeat age >= IDLE_TTL_MS (10 min — reaper-crashed) | `#ef4444` |
| `idle` | heartbeat age >= ACTIVE_TTL_MS (2 min) but < IDLE_TTL_MS | `#64748b` |
| `parsing` | heartbeat fresh (< 2 min) AND mid-pipeline (any `pipelineStep/Iter/Target` set) | `#3b82f6` |
| `typing` | heartbeat fresh, no pipeline in flight | `#22c55e` |

Inputs: `chat-slots.json` heartbeat age (primary) + the latest matching
`AGENT_CHAT.jsonl` entry (matched on pid + strict host; an error status there
overrides the heartbeat-derived status).

## Why a separate file, not part of system-graph.json

`generate-system-viz.mjs` writes the overlay to its **own sibling file**
`state/shared/system-viz/agent-overlay.json` — deliberately NOT into
`system-graph.json`. The overlay is intrinsically time-varying (heartbeat
ages, `generatedAt`); folding it into the canonical structural graph would
churn that file on every run and re-trigger every downstream consumer
(wiki-regen, master-index, GraphSAGE). The separate file keeps the canonical
graph stable. The generator step is additive and try/catch-isolated — an
overlay failure can never abort the primary `system-graph.json` write.

## Surfaces

| Surface | Path |
|---------|------|
| Logic lib | `scripts/lib/agent-overlay.mjs` — `classifyAgentStatus`, `matchChatEntry`, `chatEntryPid`, `parseChatJsonl`, `buildAgentOverlay`, `STATUS_COLORS`, `AGENT_STATUSES` |
| Generator | `scripts/generate-system-viz.mjs` — writes `agent-overlay.json` each run |
| Overlay JSON | `state/shared/system-viz/agent-overlay.json` (regenerated; gitignored runtime dir) |
| Viewer renderer | `state/shared/system-viz/agent-overlay.js` — `window.AgentOverlay.{renderAgentOverlay,fetchAgentOverlay,mountAgentOverlay}` |
| Viewer styling | `state/shared/system-viz/agent-overlay.css` |
| Test | `mcp-server/src/__tests__/AgentOverlay.test.ts` — 42 vitest cases |

The `.css`/`.js` are hand-authored **source** force-tracked in git even though
`state/shared/system-viz/` is a gitignored runtime dir — they must physically
sit there so the viewer (`graph.html`) loads them as siblings.

## Load-bearing invariants

- **Vendored thresholds, not imported.** `ACTIVE_TTL_MS` (= chat-slots
  `STALE_TTL_MS`) and `IDLE_TTL_MS` (= `CRASH_TTL_MS`) are re-declared in
  `agent-overlay.mjs` because `.claude/helpers/chat-slots.mjs` is
  vitest-unloadable — importing it would break the test suite. Same vendoring
  pattern as `process-slot-map.mjs` (FLEET-REAPER). `AgentOverlay.test.ts`
  has a drift-guard that re-reads `chat-slots.mjs` and asserts parity.
- **`lastMessage` is untrusted.** It comes from the append-only multi-writer
  `AGENT_CHAT.jsonl` log. The lib strips control chars; the viewer renders it
  exclusively via `textContent` (never `innerHTML`) — a drift-guard test
  enforces the renderer stays innerHTML-free.
- **Pure lib.** `agent-overlay.mjs` has no `fs`, no imports, no side effects —
  the test exercises every branch hermetically with an injected `now`.
- **Deterministic.** For a fixed `now`, `buildAgentOverlay` output is
  byte-identical (sorted slot order, fixed field order).

## Knobs

None — the overlay regenerates with every `generate-system-viz.mjs` run.
`MESSAGE_MAX_CHARS` (240) and `FUTURE_GRACE_MS` (5 min) are exported constants.

## Follow-up (NOT in G2 scope)

- A live poll loop wired into `graph.html` via `mountAgentOverlay({pollMs})`.
- Structural CSS drift-guard (status->hex binding, not substring presence).
- Stream-tail `AGENT_CHAT.jsonl` rather than full read + tail-truncate.

Memory: [[reference_g2_agent_overlay_2026_05_16]]. Sister G-series:
[[reference_d4_action_traces_2026_05_16]] (D4 dep).
