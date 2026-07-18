---
name: reference_hermes_cred_pool_verified_2026_06_15
description: "Live-verified state of the Nous Hermes desktop app (ZULU master-orchestrator embodiment) on 2026-06-15: boots clean, 9 healthy anthropic accounts, round_robin active, PRISM MCP wired. Corrects the stale 5-account/active=xai/fill_first picture in reference_hermes_app_launch_fix_cred_pool_2026_06_12."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.605Z
aliases: reference_hermes_cred_pool_verified_2026_06_15
---


2026-06-15 slot:zulu. Operator: "we already did all 6 accounts I have, check the work we did for getting hermes app working." Verified the LIVE state of `C:/Users/wompu/AppData/Local/hermes/` (R12 — checked the running app, not the stale memory). Supersedes the auth-state half of [[reference_hermes_app_launch_fix_cred_pool_2026_06_12]] (that file's launch-crash root-cause is still accurate; its "5 accounts / active=xai / 1 expired / fill_first" snapshot is now stale).

## Verified working (all green)
- **App boots + runs.** `logs/desktop.log` tail = full clean boot chain: "Hermes runtime is ready" -> "Starting Hermes backend" -> "Hermes backend is ready. Finalizing desktop startup" + live self-improvement reviews. The 2026-06-12 launch crash is fixed and STAYED fixed.
- **Both 06-12 Python fixes held** (the autonomous agent did NOT re-break them): `hermes-agent/toolsets.py` has no `max_concurrent_children` in a tool list; `hermes-agent/agent/prompt_builder.py` has no `os.sysconf` (the Windows-only AttributeError). grep-confirmed absent.
- **Credential pool = 9 anthropic OAuth accounts, ALL `last_status:"ok"`** (no last_error, all have refresh_token). `auth.json credential_pool.anthropic`:
  - priority 0-2: 3x "dashboard PKCE" (older GUI logins)
  - priority 3-5: `cc:gmail-1-main`, `cc:gmail-2`, `cc:gmail-3`
  - priority 6-8: `cc:outlook-1`, `cc:outlook-2`, `cc:outlook-3`
  The operator's "6 accounts" = the 6 `cc:gmail-*`/`cc:outlook-*` Claude-Code-credential links (priority 3-8). Plus copilot x1, openai-codex x1, xai-oauth x2.
- **`active_provider: anthropic`** (was a failing `xai-oauth` at 06-12 — now correct).
- **Strategy = `round_robin`** — `config.yaml:173-174 credential_pool_strategies: {anthropic: round_robin}`. AUTHORITATIVE: `agent/credential_pool.py get_pool_strategy()` (line 430) reads `config.yaml` via `_load_config_safe()`, NOT `auth.json` (whose `credential_pool_strategies:{}` empty field is unused). So Hermes ROTATES across all 9 accounts, not drain-one-then-failover. Correct for a multi-account pool meant to multiply throughput.
- **Fallback model = local Ollama** `qwen2.5-coder:32b` (`config.yaml:294 fallback_model`, base_url 127.0.0.1:11434) — graceful degrade when all Claude accounts exhaust.
- **PRISM MCP wired** into Hermes (`config.yaml:349 mcp_servers.prism`, connect_timeout 120) — P0 of [[reference_hermes_master_orchestrator_arch_2026_06_02]] is live.

## Not-yet-done (honest, not blockers to "working")
- **Custom Hermes UI still not live** — its `tsc -b && vite build` fails (18 tsc errors per 06-12); the app runs the last-good prebuilt `app.asar`. Operator chose to leave the UI alone.
- **Master-orchestrator plan P2-P5 pending** ([[reference_hermes_master_orchestrator_arch_2026_06_02]]): P2 Hermes SOUL=ZULU persona, P3 knowledge/hermes-outputs/ lane, P4 system-viz ghost.hermes_app roost, P5 verify zulu_authority_check. These are integration-deepening, not launch/auth.

**How to apply:** Hermes is launch-healthy + all 6 operator accounts (+3 extra) are pooled, healthy, and round-robined. For "use all my accounts" the config is already correct. CLI account flows still need a real TTY (`main.py:310` guard refuses Claude-Code `!` subprocess invocation). Safe auth.json summary (no token leak): node read + whitelist `{auth_type,label,last_status,priority,expires_at_ms}` only.
