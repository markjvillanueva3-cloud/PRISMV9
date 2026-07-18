---
name: feedback_bravo_launches_hermes_obsidian_apps
description: Bravo (Hermes domain) is authorized to launch the Hermes and Obsidian desktop apps whenever needed for autonomous work + learning.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.415Z
aliases: feedback_bravo_launches_hermes_obsidian_apps
---


The **bravo** slot owns the Hermes/Zulu domain and is **authorized to launch the Hermes desktop app and the Obsidian desktop app** whenever needed — no per-time operator confirmation required.

- **Hermes app:** `C:/Users/wompu/AppData/Local/hermes/` (config `config.yaml`, `SOUL.md` = ZULU persona, `state.db`, `cron/`, `skills/`, `memories/`). It is the slot-less ZULU master orchestrator; running it = autonomous fleet work + learning (kanban auto-dispatch + curator self-curation + memory). Launch the installed Hermes executable / `hermes` CLI gateway.
- **Obsidian app:** config at `C:/Users/wompu/AppData/Roaming/obsidian/`. Opens the PRISM brain vault (`H:/prism/knowledge/` + `knowledge/memories/`). It is PSN leg #1 (the persistent brain). Launch the installed Obsidian executable.

**Why:** Operator directive 2026-06-03 (`/goal /yolo`, bravo's primary domain): *"since this is your primary domain, make it a memory and rule that bravo is allowed to launch the hermes and obsidian apps when needed."* The goal is Hermes fully operational for autonomous work + learning overnight, fully synergized with Obsidian. Bravo cannot deliver that if it has to stop and ask before starting the apps.

**How to apply:** When a bravo task needs Hermes or Obsidian running (autonomous overnight work, Hermes↔Obsidian synergy verification, fleet orchestration, brain-vault indexing) and the process is not up, **launch it directly** (PowerShell `Start-Process`). Verify the process comes up and (for Hermes) that it connects to PRISM MCP at `http://127.0.0.1:3100/mcp`. This authorization is bravo-scoped (the Hermes/Zulu galaxy owner); it is not a general fleet grant. Reversible by the operator at any time. Pairs with [[feedback_all_slots_free_access]] (broad-access posture) and the Hermes-as-ZULU-master architecture [[reference_hermes_master_orchestrator_arch_2026_06_02]].
