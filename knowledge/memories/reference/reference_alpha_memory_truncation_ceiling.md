---
name: reference_alpha_memory_truncation_ceiling
description: master MEMORY.md silently truncates fleet-wide recall past 24576 bytes — pointer-only discipline
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.017Z
aliases: reference_alpha_memory_truncation_ceiling
---


The master `MEMORY.md` (`C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`) is loaded into every session's context and **silently truncates past 24576 bytes**, killing fleet-wide recall of the freshest entries. It crossed the ceiling once (24688 B / 100.5%, status=critical) and re-grew within days after a one-shot compress without a durable watchdog.

**Discipline (alpha-owned governance):** index ≤200 lines, pointer-only, ≤140 chars/entry; detail lives in per-file memories + wiki, NOT the index. Overflow → `state/shared/MEMORY-RECENT.md` (recent) / `MEMORY-ARCHIVE.md` (old). Watchdog: `scripts/memory-size-watch.mjs` (gate via Stop hook or `/loop --interval 1d`). Verify: `node scripts/node-staleness-rank.mjs --json | jq '.memory.bytes,.memory.status'` → bytes<22000 + status=="fresh".
