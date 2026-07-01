---
name: reference_slot_brief_channel_2026_06_02
description: Targeted orchestrator→slot brief channel — slot-brief-inject.mjs (READ/consume-once) + prism_context:slot_brief_write/list (WRITE). The keystone for Hermes-as-ZULU.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.206Z
aliases: reference_slot_brief_channel_2026_06_02
---


**Targeted orchestrator→slot brief channel (HERMES-MASTER-ORCHESTRATOR-MS0, 2026-06-02, slot:bravo).** The one genuinely-new PRISM artifact for [[reference_hermes_master_orchestrator_arch_2026_06_02]]. Lets the slot-less ZULU master (the Hermes app, via the prism MCP it now connects to) — or any chat — push a TARGETED work order to ONE slot.

**READ/deliver side** — `.claude/hooks/slot-brief-inject.mjs` (UserPromptSubmit, committed `97cf13fee4`). Reads `state/shared/slot-briefs/<slot>.md`, injects it into THAT slot's next prompt, then CONSUMES it (atomic rename → `slot-briefs/_delivered/<slot>-<intMtimeMs>-<hash>.md`). At-most-once (archive-before-emit). Never-throws. Slot resolved via chat-slots.json (mirrors slot-soul-inject). Slot key validated `/^[a-z]+$/` BEFORE path.join (traversal defense). 4096-byte head-truncate cap. Knobs `PRISM_SLOT_BRIEF_INJECT_{DISABLE,VERBOSE}`. Wired in settings.json UserPromptSubmit after slot-soul-inject (C:+H:). 21/21 tests.

**WRITE side** — `SlotBriefEngine` + `prism_context:slot_brief_write` / `slot_brief_list` (committed `69e8232541`). `writeBrief({slot,body,from?})` atomic-writes `<lane>/<slot>.md`; same alpha-only slot guard. `listPending()` / `listDelivered({slot?,limit?})`. Symmetric to `chat_post` (broadcast) — targeted+consume-once. Secure lane-confined write path replacing the deferred broad filesystem-MCP mount. 15/15 tests, tsc 0-new, 2-arm scrutiny PASS.

**LANE BUG + FIX (R12, `39d14444db` + test `cafa931723`).** Original engine used `PATHS.STATE_DIR` for the lane — WRONG: inside the running MCP server process that resolves to `mcp-server/state` (cwd/`__dirname`-relative), NOT the `H:/prism/state/shared/slot-briefs` the hook reads. So `slot_brief_write` via MCP landed where no hook would deliver — **the channel was silently broken via the MCP path** (only the direct-file-write path worked). Tests missed it (temp `rootOverride`); only visible against the running server. Fix: hardcode `SLOT_BRIEFS_ROOT = "H:/prism/state/shared/slot-briefs"` (mirrors `ChatBusEngine.CHAT_BUS_ROOT` cross-process pattern + the hook's `PRISM_ROOT||"H:/prism"` fallback), env override `PRISM_SLOT_BRIEFS_DIR`. **Lesson: any engine writing a shared `state/shared/*` coordination lane must hardcode the repo-root like ChatBusEngine — `PATHS.STATE_DIR` diverges per process. Verify cross-process lanes against the RUNNING server, not just unit tests.**

**ACTIVATION VERIFIED LIVE (2026-06-02):** from the Hermes app's OWN venv mcp client (`…/hermes-agent/venv`, `mcp 1.26.0` + StreamableHTTP already installed) → `http://127.0.0.1:3100/mcp`: initialize OK (prism-mcp-server v2.10.0), **90 prism_* tools** reachable, `slot_brief_write` lands in the correct lane, `slot_brief_list` works, and a real sierra chat consumed its queued brief (now in `_delivered/`). Server runs under the `PRISM MCP Server` scheduled task (`mcp-server-supervisor.mjs`); to load a fresh dist you must KILL the `:3100` listener PID (the task Stop/Start leaves the detached child alive) then Start the task. Remaining operator step: restart the Hermes GUI app so it reads the config + connects live (the venv client proved it will).

**Three-way channel distinction:** `slot-soul-inject` = PERSISTENT personality (every prompt) · `chat-bus`/`chat_post` = BROADCAST all slots · **slot-brief = TARGETED + consume-once**. Lane: `state/shared/slot-briefs/{README.md,.gitignore}` (transient `<slot>.md` + `_delivered/` git-ignored, only README tracked).

**End-to-end pathway now live:** Hermes app → prism MCP → `prism_context:slot_brief_write` → `slot-briefs/<slot>.md` → `slot-brief-inject.mjs` → slot's context.
