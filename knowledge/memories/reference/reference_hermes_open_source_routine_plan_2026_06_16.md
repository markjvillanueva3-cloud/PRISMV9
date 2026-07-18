---
name: reference_hermes_open_source_routine_plan_2026_06_16
description: Hermes Agent is the open-source MIT NousResearch/hermes-agent git repo on disk; resolved incorporation-plan open questions from source + shipped emit-only manufacturing-routine planner that pushes PRISM intel to the operator phone.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.607Z
aliases: reference_hermes_open_source_routine_plan_2026_06_16
---


**Open-source Hermes pivot + routine planner (2026-06-16, slot:zulu).** Operator: "hermes is completely open sourced so lets make sure we're taking full advantage of it in our build."

**Source identity (VERIFIED):** the full Hermes Agent source is a live git repo at `C:/Users/wompu/AppData/Local/hermes/hermes-agent` -> `origin github.com/NousResearch/hermes-agent` (MIT), branch `main`, HEAD `v2026.6.5-810-g7d183f649`, **exactly 312 commits behind `@{u}`** (`git rev-list --count HEAD..@{u}`). So the version bump (U-CLI-VERSION-BUMP) is a tracked `git pull` + `uv pip install -e .` in `hermes-agent/venv`, NOT a mystery installer (still operator-gated; back up auth.json/profiles/ first -- a 312-commit jump may touch the auth schema).

**Black-box corrections (from source -- the 2026-06-02 incorporation plan treated Hermes as a black box w/ 6 "verify in GUI" open questions):**
- **cron is NOT `*.skill` files** (plan guessed wrong, OQ#4). It is a JSON job store (`~/.hermes/cron/jobs.json` -> `output/{id}/{ts}.md`) + `croniter` scheduler (`cron/scheduler.py`, `cron/jobs.py`), authored via `hermes cron create "<sched>" "<prompt>" --name --deliver <telegram|discord|slack|sms|email|github|webhook|local> [--script <py>] [--skills a,b]` + `hermes webhook subscribe` (GitHub/API triggers, HMAC). The `[SILENT]` reply = no-spam. `HermesAutomationBridge.cronList()` already reads jobs.json correctly.
- **`hermes mcp serve` = Hermes-as-MCP-server** (REVERSE channel the black-box view missed, `mcp_serve.py`): 9+1 messaging tools (conversations_list, messages_read/send, events_poll/wait, permissions_*, channels_list) across Telegram/Discord/Slack/WhatsApp/Signal. CC/PRISM can connect to Hermes as an MCP server to push operator phone alerts.
- agentskills.io-compatible; six terminal backends (local/Docker/SSH/Singularity/Modal/Daytona, serverless persistence); self-improving learning loop + FTS5 session recall + Honcho user modeling + zero-context-cost RPC subagent calls.
- Python interp resolved (OQ#2): `uv` + Python 3.11, venv at `hermes-agent/venv`. OQ#1 (hot-reload) / #5 (MCP tool cap) / #6 (acp_adapter) still need a `agent/` source trace (PARTIAL).

**Shipped (011a032deb, U-HB-ROUTINE-PLAN):** `HermesAutomationBridge.routinePlan()` + `prism_hermes:hermes_routine_plan` (read-only, action 7->8). EMIT-ONLY (never spawns, install-independent) generator of source-verified `hermes cron create ... --deliver telegram` automations: prism-shop-brief (daily 7am) / prism-fleet-pulse (every 4h, SILENT) / prism-regression-watch (every 2h, SILENT) / prism-closeout-watch (--script audit-close-out-candidates.mjs, SILENT) -> push PRISM manufacturing intel to the operator's phone while away. Shell-paste safe (no backticks/dquotes in prompts; runtime quote+whitespace guards -- backticks inside bash dquotes = command substitution). 34/34 tests; per-file 2-arm scrutiny PASS (4 P2 latent, 2 hardened inline). PRISM never auto-deploys -- operator runs each emitted command or via hermes_run dual-key.

**Next source-unlocked (proposed, ROI order):** (1) wire `hermes mcp serve` as a CC MCP server for direct phone delivery (operator-present, needs platform creds + gateway up); (2) trace incorporation-plan OQ #1/#5/#6 from `agent/` + `acp_adapter/` (cheap, read-only); (3) agentskills.io skill bridge. See `state/shared/specs/HERMES-APP-INCORPORATION-PLAN-2026-06-02.md` §6 (SOURCE-VERIFIED ADDENDUM) + `mcp-server/data/milestones/HERMES-BRIDGE-MS0.json`. Related: [[reference_hermes_cc_bridge_ms0_2026_06_14]] [[reference_hermes_bridge_ms0_2026_06_13]] [[reference_hermes_app_incorporation_plan_2026_06_02]].
