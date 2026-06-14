---
title: Fleet-Hygiene Galaxy — Architecture Map
type: architecture
domain: fleet-hygiene
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [fleet-hygiene, reaper, orphan, chat-slot, mcp-server, galaxy, golf]
---

# Fleet-Hygiene Galaxy — Architecture Map

The fleet-hygiene galaxy (owned by **slot:golf**) runs the fleet reaper + orphan/zombie reaping + chat-slot hygiene + the GPU/Ollama coordinator + MCP-server health. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified content lives here, NOT hand-copied): `mcp-server/src/engines/fleet-hygiene/MEMORY.md` · doctrine: `mcp-server/src/engines/fleet-hygiene/CLAUDE.md`

## Role

Slot-aware orphan reaper (PID→slot via ancestry + `chat-slots.json`, confirm-after-N-ticks gate); fleet-memory-monitor (names which chat to `/compact` under RAM pressure); task-health watchdog (`fleet-task-health-watch.mjs`). Golf is the dedicated hygiene slot (write-allowlist constrained). See root CLAUDE.md §GOLF SLOT + §FLEET-REAPER.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/fleet-hygiene/{CLAUDE,MEMORY}.md`
- [[galaxy-context-federation]] — fleet-hygiene is a federation spoke; rolls up to the master brain
- [[fleet-reaper]] · [[feedback_golf_owns_reaper]] · [[feedback_psn_definition]]

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the golf galaxy card + master-index back-pointer + root CLAUDE.md §FLEET-REAPER. Domain owner (golf) refines._
