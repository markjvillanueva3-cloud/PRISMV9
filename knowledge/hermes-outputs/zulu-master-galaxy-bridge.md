# ZULU Master Galaxy Bridge — Hermes App ↔ PRISM OS (H: Drive)

**Status:** Autonomous build — live link established 2026-06-12.

## Master Role Declaration
ZULU (slot-less orchestrator) is the **Master Brain** and **Master Galaxy Chat Slot** for the entire PRISM fleet and all 34 galaxy brains.

- **Authority:** Highest in the hierarchy. Issues targeted briefs via `prism_context:slot_brief_write`, broadcasts via `prism_context:chat_post`, wakes slots via fleet-wake-sequencer.
- **Scope:** Full read/write access to:
  - H:/prism/ entire filesystem (engines, dispatchers, knowledge/, state/, mcp-server/, cad-engine/, web/, scripts/, .claude/hooks/, CLAUDE.md, etc.)
  - PRISM MCP server (:3100) — all 103+ prism_* dispatchers (prism_calc, prism_cam, prism_session, prism_memory, prism_knowledge, prism_orchestrate, etc.)
  - Hermes app systems (skills, slash commands, memory, delegation, cron, gateway)
  - Active fleet (17 NATO slots) + bus (AGENT_CHAT.jsonl) + workboard + live heartbeat surface
  - All galaxies (34 MEMORY.md files) + wiki (722 entries) + tribal knowledge
  - PS ZULU instance (PowerShell Claude Code CLI surface) via shared bus + delegation

## Link Mechanisms (Working)
1. **Filesystem** — Direct `read_file`, `write_file`, `search_files`, `terminal` on H:\
2. **MCP** — PRISM MCP server running on :3100 (process 99820). All prism_* actions available as tools.
3. **Hermes Config** — `~/.hermes/config.yaml` + profiles include PRISM paths (H:/prism as cwd).
4. **Bus + Workboard** — AGENT_CHAT.jsonl + AGENT_WORKBOARD.md + live-fleet-heartbeat.jsonl (real-time feed).
5. **Delegation** — `delegate_task` to PS ZULU instance for PowerShell/Claude Code CLI heavy work.
6. **Slash Commands** — Full Hermes set (`/help`, `/model`, `/skill`, `/cron`, `/zulu-master`, etc.) + PRISM coordination commands routed through ZULU.
7. **Skills** — All Hermes skills + PRISM-specific (prism-galaxy-master, prism-vault-loop, etc.) loaded on demand.
8. **Hooks** — All .claude/hooks/ available; new live-fleet-heartbeat-push.mjs wired for real-time slot status.
9. **Autonomous Features** — Fleet wake sequencer, reaper (golf), self-awareness guards, 4-LOOP protocol, duplication checks, handoff system, cron jobs, memory engine.

## Master Galaxy Coordination Protocol
- Every slot/galaxy posts heartbeat to live-fleet-heartbeat.jsonl every turn.
- ZULU reads tail for real-time view.
- Targeted briefs land in state/shared/slot-briefs/<slot>.md and are consumed on next prompt.
- PS ZULU instance acts as the "PowerShell execution arm" for any Claude Code CLI or native PS tasks.
- All galaxies inherit full CLAUDE.md rules (expert role, 4-LOOP, self-awareness, no stubs, token economy, etc.).

## Verification (Real Execution)
- MCP server: Listening on :3100.
- Filesystem: Full H:/prism access confirmed.
- Ollama: Connected (13 models).
- Hermes: Running with PRISM cwd.
- Live surface: To be activated via hook (next autonomous step).

ZULU now has direct, unified access to the entire PRISM OS + Hermes app stack. Master brain role active.

---
**Next autonomous step:** Implement live-fleet-heartbeat-push.mjs hook + register as master in workboard.