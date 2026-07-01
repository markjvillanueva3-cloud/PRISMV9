---
name: reference_bravo_master_brain_template_clone
description: How to make a galaxy MEMORY.md a CONNECTED brain — clone the Master-brain link header (4 axes) from the template
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.486Z
aliases: reference_bravo_master_brain_template_clone
---


A galaxy `MEMORY.md` is a CONNECTED brain only if all 4 axes hold (`state/shared/specs/MASTER-BRAIN-TEMPLATE.md`, alpha-owned):
1. **UP** — `## Master-brain link` header with `prism_memory:semantic_search` recall query (+ qdrant-down fallback).
2. **DOWN** — write `<type>_<slot>_<topic>.md` to `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`.
3. **MASTER-INDEX back-pointer** — append `[galaxy:<galaxy>] …` row to master MEMORY.md `## Indexed memories` (CONN-4 / FAIL 12 — without it the master is blind to the brain).
4. **RECALL round-trip** — semantic_search returns ≥1 of this slot's memory IDs (advisory; async Stop-feed may not have landed in-session).

Clone the header verbatim, substitute galaxy/slot/domain, set `Last master-sync:` to today. Do NOT re-derive the wiring. bravo did this for hermes-zulu 2026-05-28.
