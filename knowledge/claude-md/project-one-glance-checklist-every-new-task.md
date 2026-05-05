---
schema_version: 1.0.0
source: project
section: ONE-GLANCE CHECKLIST (every new task)
slug: one-glance-checklist-every-new-task
start_line: 349
end_line: 357
indexed_at: 2026-05-05T13:49:55.490Z
content_hash: 875afd4d6be32162a5298b4ffff819d5dfdab57e2728342e17e0bee73a37a86e
mirror_engine: ClaudeMdChunkerEngine
---
## ONE-GLANCE CHECKLIST (every new task)
1. Read HANDOFF for this chat via per-agent-handoff.mjs `read`
2. If building/auditing/investigating → hooks auto-inject inventory + duplicate guards
3. Check `PRISM-INVENTORY-LATEST.md` if you need counts
4. Use MCP dispatcher actions before reinventing logic
5. Obey shared directives for coordination (6 chats running)
6. Finish current delivery before starting next roadmap pass (per ROADMAP_COLLABORATION_STATE.md gate)
7. On session end → `/handoff` writes to per-chat file; `/compact` also wires this automatically
