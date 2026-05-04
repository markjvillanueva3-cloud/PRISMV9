---
source: project
section: ONE-GLANCE CHECKLIST (every new task)
slug: one-glance-checklist-every-new-task
indexed_at: 2026-05-02T20:38:22.545Z
---

## ONE-GLANCE CHECKLIST (every new task)

1. Read HANDOFF for this chat via per-agent-handoff.mjs `read`
2. If building/auditing/investigating → hooks auto-inject inventory + duplicate guards
3. Check `PRISM-INVENTORY-LATEST.md` if you need counts
4. Use MCP dispatcher actions before reinventing logic
5. Obey shared directives for coordination (6 chats running)
6. Finish current delivery before starting next roadmap pass (per ROADMAP_COLLABORATION_STATE.md gate)
7. On session end → `/handoff` writes to per-chat file; `/compact` also wires this automatically
