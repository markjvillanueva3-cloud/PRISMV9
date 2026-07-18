---
source: project
section: FLEET-MEMORY-MONITOR — durable RAM/per-chat-tree advisor (5-min cron, slot:golf)
slug: fleet-memory-monitor-durable-ram-per-chat-tree-advisor-5-min
indexed_at: 2026-06-06T05:19:22.020Z
---

## FLEET-MEMORY-MONITOR — durable RAM/per-chat-tree advisor (5-min cron, slot:golf)

Scheduled task that names WHICH chat to `/compact` under critical pressure. Attribution unit is the **claude.exe tree** (NOT `chat-slots.pid` — ephemeral). One `AGENT_CHAT` advisory per critical episode. Phase offset +330s. Knobs: `PRISM_FLEET_MEMMON_*`. Wiki: [[fleet-memory-monitor]]. Memory: [[reference_fleet_memory_monitor_2026_05_16]].
