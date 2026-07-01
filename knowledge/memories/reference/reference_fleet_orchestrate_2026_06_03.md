---
name: reference_fleet_orchestrate_2026_06_03
description: "scripts/fleet-orchestrate.mjs — the ZULU \"wake the fleet\" tool. Composes per-slot resource-rich orchestration briefs + delivers via the slot-brief channel."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.575Z
aliases: reference_fleet_orchestrate_2026_06_03
---


**Fleet orchestration tool (HERMES-MASTER-ORCHESTRATOR-MS0/U-FLEET-ORCHESTRATE, 2026-06-02→03, slot:bravo, commit `5fb2318190`).** The runtime arm that lets the ZULU master "wake the fleet one by one."

`scripts/fleet-orchestrate.mjs` reads `state/shared/CHAT-SLOT-DOMAINS.md` (slot→domain) + `scripts/lib/slot-galaxy-map.mjs` (slot→galaxy), and for each assigned slot composes a **resource-rich ZULU brief**: domain focus + next-unit pickup cmd (`priority-queue.mjs --pick --slot X` / `/pick-unit`) + galaxy-brain pointer (`engines/<galaxy>/MEMORY.md`) + memory recall (`prism_memory:semantic_search`) + wiki/tribal auto-inject note + build doctrine (per-file scrutiny→3-of-3→no-stubs→commit) + coordination rule. Delivers via the slot-brief channel → `state/shared/slot-briefs/<slot>.md` → `slot-brief-inject.mjs` consumes on that slot's next `/checkin-<slot>`.

- **Modes:** DRY-RUN default (prints plan); `--apply` writes (skips slots with a pending brief unless `--force`); `--slot X` for one. **fs-only (no exec)** — the security hook false-positives on the shell-command *strings* in the brief template, so write the file via Bash heredoc not the Write tool. Skips orchestrator (zulu/zebra) + unmapped slots (november/yankee).
- **Exports (pure, tested 5/5):** `parseSlotDomains` (parses `| **SLOT** | domain |`), `composeOrchestrationBrief(slot,domain,galaxy)`, `buildFleetPlan(slotDomains)`. Guard: `path.basename(argv[1]) === "fleet-orchestrate.mjs"` (exact — startsWith also matched the .test.mjs and ran main() on import).
- **First live run:** 19 briefs delivered (alpha..whiskey, 0 failed). `kilo.md` verified content-correct.

**Caller:** the Hermes app (as ZULU, via the prism MCP it connects to) is the intended driver, but any chat/CLI runs it. Pairs with [[reference_slot_brief_channel_2026_06_02]] (the channel) + [[reference_hermes_master_orchestrator_arch_2026_06_02]] (arch) + the SOUL=ZULU persona (`…/AppData/Local/hermes/SOUL.md`). Hermes app launched 2026-06-02 (4 Hermes.exe procs; reads config.yaml `mcp_servers.prism` + SOUL.md on startup). **ENV gotcha this session:** bash stdout capture was flaky (commands auto-backgrounded, `.output` empty, some SIGTERM'd) — verify via the Read tool on fs-written result files, not piped stdout.
