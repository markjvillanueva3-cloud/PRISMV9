---
name: reference_hermes_app_launch_fix_cred_pool_2026_06_12
description: "Hermes desktop app launch-crash root cause+fix (its own autonomous agent vibe-coded its source and broke the Python import chain) + Hermes Claude credential-pool architecture (5 OAuth accounts in auth.json, fill_first failover, CLAUDE_CODE_OAUTH_TOKEN bridge, add-account flow)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.604Z
aliases: reference_hermes_app_launch_fix_cred_pool_2026_06_12
---


2026-06-12 slot:alpha. The operator's installed **Nous Hermes desktop app** (`C:/Users/wompu/AppData/Local/hermes/`) stopped launching after its OWN autonomous agent ("Hermes") vibe-coded changes to its source without compiling. Debugged + fixed; then mapped its Claude auth model.

## Launch crash — root cause + fix (the desktop never booted)
The WebView2 desktop boot loop kept failing with "Hermes backend exited before it became ready (1)". The Python backend (`hermes-agent/`) crashed on import. Two broken files (autonomous-agent edits, `git`-modified vs the cloned Hermes repo HEAD):
- **`toolsets.py`** (×2 sites, lines ~74 + ~277): `"max_concurrent_children": 12,` — a config key:value pasted **inside a Python `[list]` of tool-name strings** → `SyntaxError: invalid syntax`. (`max_concurrent_children` is a real knob but belongs in `config.yaml` under `delegation:`, not a tool list.) Fix: removed both insertions.
- **`agent/prompt_builder.py`**: (a) `if "127 GB" in str(os.sysconf) ...` — **`os.sysconf` is Unix-only → AttributeError on Windows** (runtime, not caught by py_compile); `build_environment_hints()` is called at boot via `agent/system_prompt.py:234`. (b) the function's `return` was dedented to column 0 → `'return' outside function`. Fix: un-nested the always-true `if`, restored 4-space indent.
- Verified: all 6 changed `.py` compile, `build_environment_hints()` runs, boot chain (`toolsets`+`hermes_cli.kanban_db`) imports clean → app boots.
- Class of bug: an autonomous coding agent editing its OWN source then never compiling. Also broke the desktop "custom UI" (18 `tsc` errors across `TabBar.tsx`(new, split fn signature), `providers-settings.tsx`(blind global-replace duped JSX into ~6 spots, corrupted a useEffect cleanup), `use-prompt-actions.ts`(goal/loop block + bare `const` in case arms)) + 2 dead py files (`utils/prism_sync.py`, `utils/shared_prism_config.py`). The custom UI is NOT live — its `tsc -b && vite build` fails, so the app runs the last-good prebuilt `app.asar`. Operator chose to leave the UI alone.

## Hermes Claude auth = credential pool (NOT api keys in config)
- `config.yaml` stores NO inline keys (`providers: {}`, `credential_pool_strategies: {}`, all `api_key:''`). Claude runs via `provider: anthropic` (default `claude-fable-5`, fallback `claude-opus-4-8`).
- Credentials live in **`auth.json` → `credential_pool.<provider>`** (lists). The operator already has **5 anthropic OAuth accounts** (`credential_pool.anthropic`, `auth_type: oauth`; 3 healthy "dashboard PKCE", 1 expired/exhausted "hermes_pkce", 1 "claude_code" link with no inline token / `secret_fingerprint` only). Also copilot×1, openai-codex×1, xai-oauth×2.
- Selection logic: `agent/credential_pool.py` `CredentialPool.select()`. Default strategy = **`STRATEGY_FILL_FIRST`** when `credential_pool_strategies` is empty (`get_pool_strategy:434`) → drains priority-0 account, fails over to next on exhaustion. Other strategies: `round_robin`/`random`/`least_used` (set `credential_pool_strategies: {anthropic: round_robin}` to spread load). DEAD/exhausted entries excluded from rotation.
- Token resolve order (`hermes_cli/auth.py:490`): **`ANTHROPIC_API_KEY → ANTHROPIC_TOKEN → CLAUDE_CODE_OAUTH_TOKEN`** — a Claude Code OAuth token is accepted directly (the PRISM↔Hermes credential bridge).
- **Add an anthropic account** (`hermes_cli/main.py:3949 _run_anthropic_oauth_flow`): runs `claude setup-token` (browser auth → mints `sk-ant-oat-...`) then `save_anthropic_oauth_token()`; triggered by `hermes model`. Can also link Claude Code's credential store directly (`use_anthropic_claude_code_credentials`). GUI equivalent = the Hermes dashboard PKCE login (Settings → providers). NOTE: `hermes` CLI has a TTY guard (`main.py:310`) refusing non-interactive/piped/subprocess invocation — run account flows in a real terminal, not Claude Code's `!`.
- `auth.json.active_provider` was `xai-oauth` (a failing Grok key), not anthropic — worth re-pointing if Claude accounts seem unused.

**Why this matters:** PRISM is incorporating the Hermes app as the external ZULU master-orchestrator ([[reference_hermes_app_incorporation_plan_2026_06_02]] · [[reference_hermes_master_orchestrator_arch_2026_06_02]]). Keeping Hermes launchable + its Claude credential pool healthy is a prerequisite for that synergy. **How to apply:** if Hermes won't launch, read `AppData/Local/hermes/logs/desktop.log` (tail) for the backend traceback; `git diff` the `hermes-agent` repo for autonomous-agent breakage; py_compile changed files. For "use all my Claude accounts," check `auth.json credential_pool.anthropic` count + statuses, the `credential_pool_strategies` config, and `active_provider`. Related: [[reference_hermes_on_claude_subscription_opus48_2026_06_04]] · [[reference_hermes_local_model_autonomy_2026_06_04]].
