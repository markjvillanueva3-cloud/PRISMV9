---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "You are researching how to configure the Nous Research Hermes desktop agent to u"
date: "2026-06-08"
first_ts: "2026-06-08T15:41:32.475Z"
last_ts: "2026-06-08T15:46:44.068Z"
cwd: "H:\\prism"
messages: 77
user_msgs: 30
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-a8d5b96811f76ec36.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:02"
---

# You are researching how to configure the Nous Research Hermes desktop agent to u

> **claude-code-cli** | 2026-06-08 | 77 msgs (30 user / 47 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-a8d5b96811f76ec36.jsonl`

## Transcript

### User | 2026-06-08T15:41:32.475Z

You are researching how to configure the Nous Research Hermes desktop agent to use "Claude Code" (Anthropic's claude CLI / Claude Max subscription via OAuth) as its LLM model provider. This is for a real config edit, so accuracy is critical — NEVER fabricate config keys; only report syntax you actually found in the source/docs, and cite the file:line for each claim.

The Hermes source repo is installed at: C:/Users/wompu/AppData/Local/hermes/hermes-agent/
The live config is at: C:/Users/wompu/AppData/Local/hermes/config.yaml (top-level keys: model:{default,provider,base_url}, providers:{}, fallback_providers:[], fallback_model:{provider,model})
Ollama runs locally at http://127.0.0.1:11434/v1 (model qwen2.5-coder:32b is the current default).

A prior working setup (PRISM commit 56aa423427, 2026-06-04) reportedly ran Hermes on "Opus 4.8 via Claude Max subscription (provider:anthropic + claude_code OAuth)". That linkage has been reset and the operator now wants Hermes linked to Claude Code again.

YOUR TASKS — report findings with file:line evidence for each:
1. Search the Hermes source (C:/Users/wompu/AppData/Local/hermes/hermes-agent/) for how model providers are defined and registered. Look in: README.md, AGENTS.md, RELEASE_v*.md (recent versions), docs/, and the python/ts source (grep for: "claude_code", "claude-code", "claude code", "anthropic", "provider", "oauth", "subscription", "max plan", "ANTHROPIC_API_KEY", "model provider"). Use ripgrep: rg -i "claude.?code|claude_code" C:/Users/wompu/AppData/Local/hermes/hermes-agent/
2. Determine the EXACT set of valid provider names Hermes accepts (e.g. is "claude_code" / "claude-code" / "anthropic" / "claude" a real provider keyword? What values does the provider field accept?). Find the enum/list/registry.
3. Determine the EXACT config.yaml syntax to make Hermes use Claude Code as its model. Report the precise YAML block (which keys under model: and/or providers:, what base_url if any, what auth mechanism — does it r
... [+1239 chars truncated]

### Assistant | 2026-06-08T15:41:43.712Z

I'll research how to configure Hermes to use Claude Code as its LLM provider. Let me start by exploring the source repo structure and searching for the key terms.

### Assistant | 2026-06-08T15:41:46.436Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:41:47.060Z

[tool_use: Bash]

### User | 2026-06-08T15:41:53.876Z

[tool_result] total 4307
drwxr-xr-x 1 wompu 197611      0 Jun  8 10:21 ./
drwxr-xr-x 1 wompu 197611      0 Jun  8 10:32 ../
-rw-r--r-- 1 wompu 197611    749 Jun  2 12:29 .dockerignore
-rw-r--r-- 1 wompu 197611  23700 Jun  2 12:29 .env.example
-rw-r--r-- 1 wompu 197611    198 Jun  2 12:29 .envrc
drwxr-xr-x 1 wompu 197611      0 Jun  8 10:31 .git/
-rw-r--r-- 1 wompu 197611    122 Jun  2 12:29 .gitattributes
drwxr
... [+5953 chars truncated]

### User | 2026-06-08T15:41:54.009Z

[tool_result] model:
  default: 'qwen2.5-coder:32b'
  provider: 'openai'
  base_url: 'http://127.0.0.1:11434/v1'
providers: {}
fallback_providers: []
credential_pool_strategies: {}
toolsets:
- hermes-cli
agent:
  max_turns: 60
  gateway_timeout: 1800
  restart_drain_timeout: 180
  api_max_retries: 3
  service_tier: auto
  tool_use_enforcement: auto
  task_completion_guidance: true
  environment
... [+14987 chars truncated]

### Assistant | 2026-06-08T15:41:58.612Z

Key finding already: the live config bottom has a documented fallback provider list and `fallback_model: provider: anthropic`. Notably "anthropic" is listed but `claude_code`/`claude-code` is NOT in the documented fallback list. Let me search the source comprehensively.

### Assistant | 2026-06-08T15:42:00.546Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:42:01.640Z

[tool_use: Bash]

### User | 2026-06-08T15:42:04.846Z

[tool_result] cli-config.yaml.example
hermes-already-has-routines.md
cli.py
acp_adapter\server.py
RELEASE_v0.4.0.md
RELEASE_v0.3.0.md
hermes_cli\auth_commands.py
RELEASE_v0.15.0.md
hermes_cli\web_server.py
hermes_cli\kanban_db.py
gateway\run.py
hermes_cli\auth.py
RELEASE_v0.13.0.md
RELEASE_v0.12.0.md
hermes_cli\config.py
hermes_cli\tips.py
hermes_cli\doctor.py
hermes_cli\commands.py
hermes_cli\stdio.py
hermes_c
... [+1184 chars truncated]

### User | 2026-06-08T15:42:06.223Z

[tool_result] {
  "name": "hermes-agent",
  "version": "1.0.0",
  "description": "An AI agent with advanced tool-calling capabilities, featuring a flexible toolsets system for organizing and managing tools.",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "scripts": {
    "postinstall": "echo '✅ Browser tools ready. Run: python run_agent.py --help'"
  },
  "repository": {
    "type": "git"
... [+507 chars truncated]

### Assistant | 2026-06-08T15:42:12.422Z

Installed version is 0.15.1 (pyproject.toml). There's a `plugins/model-providers/` directory — that's the provider registry. And the `claude_code` SKILL is an autonomous-agent skill (Hermes calling claude as a tool), not necessarily a model provider. Let me examine the provider plugins directory and the providers module.

### Assistant | 2026-06-08T15:42:13.989Z

[tool_use: Bash]

### User | 2026-06-08T15:42:19.595Z

[tool_result] ===plugins/model-providers===
README.md
alibaba/
alibaba-coding-plan/
anthropic/
arcee/
azure-foundry/
bedrock/
copilot/
copilot-acp/
custom/
deepseek/
gemini/
gmi/
huggingface/
kilocode/
kimi-coding/
minimax/
nous/
novita/
nvidia/
ollama-cloud/
openai-codex/
opencode-zen/
openrouter/
qwen-oauth/
stepfun/
xai/
xiaomi/
zai/
===providers/ dir===
README.md
__init__.py
__pycache__/
base.py
===gateway 
... [+414 chars truncated]

### Assistant | 2026-06-08T15:42:24.137Z

The `plugins/model-providers/` directory lists every provider. I see `anthropic/`, `copilot/`, `copilot-acp/`, `openai-codex/`, `nous/`, etc. — but NO `claude-code` or `claude_code` directory. Let me look at the providers registry and the anthropic plugin, plus check how providers are listed/registered.

### Assistant | 2026-06-08T15:42:25.752Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:42:26.460Z

[tool_use: Bash]

### User | 2026-06-08T15:42:31.296Z

[tool_result] # Model Provider Plugins

Each subdirectory is a self-contained provider profile plugin. The
directory layout mirrors `plugins/platforms/`:

```
plugins/model-providers/
├── openrouter/
│   ├── __init__.py      # registers the ProviderProfile
│   └── plugin.yaml      # manifest: name, kind, version, description
├── anthropic/
│   ├── __init__.py
│   └── plugin.yaml
└── ...
```

## 
... [+1956 chars truncated]

### User | 2026-06-08T15:42:33.477Z

[tool_result] ===anthropic plugin files===
total 9
drwxr-xr-x 1 wompu 197611    0 Jun  2 12:39 ./
drwxr-xr-x 1 wompu 197611    0 Jun  2 12:29 ../
-rw-r--r-- 1 wompu 197611 1672 Jun  2 12:29 __init__.py
drwxr-xr-x 1 wompu 197611    0 Jun  2 12:39 __pycache__/
-rw-r--r-- 1 wompu 197611  120 Jun  2 12:29 plugin.yaml
===anthropic __init__===
"""Native Anthropic provider profile."""

import json
import logging
i
... [+1594 chars truncated]

### Assistant | 2026-06-08T15:42:40.082Z

This is the key finding. The `anthropic` provider has aliases `("claude", "claude-oauth", "claude-code")` and reads `CLAUDE_CODE_OAUTH_TOKEN`. So `claude-code` IS a valid alias resolving to the `anthropic` provider, and it supports OAuth via `CLAUDE_CODE_OAUTH_TOKEN`. Let me examine the ProviderProfile base, how OAuth/auth works, and the auth CLI commands.

### Assistant | 2026-06-08T15:42:41.889Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:42:43.288Z

[tool_use: Bash]

### User | 2026-06-08T15:42:46.409Z

[tool_result] name: anthropic-provider
kind: model-provider
version: 1.0.0
description: Anthropic (Claude)
author: Nous Research
===BASE PROFILE===
"""Provider profile base class.

A ProviderProfile declares everything about an inference provider in one place:
auth, endpoints, client quirks, request-time quirks. The transport reads this
instead of receiving 20+ boolean flags.

Provider profiles are D
... [+6001 chars truncated]

### User | 2026-06-08T15:42:49.042Z

[tool_result] hermes_cli/auth_commands.py:36:_OAUTH_CAPABLE_PROVIDERS = {"anthropic", "nous", "openai-codex", "xai-oauth", "qwen-oauth", "google-gemini-cli", "minimax-oauth"}
hermes_cli/auth_commands.py:80:    if normalized in {"grok-oauth", "xai-oauth", "x-ai-oauth", "xai-grok-oauth"}:
hermes_cli/auth_commands.py:81:        return "xai-oauth"
hermes_cli/auth_commands.py:103:def _oauth_default_label(provider
... [+4968 chars truncated]

### Assistant | 2026-06-08T15:42:56.698Z

Excellent — very rich. Key facts confirmed:
- `anthropic` is OAuth-capable (`_OAUTH_CAPABLE_PROVIDERS` includes `"anthropic"`, auth_commands.py:36)
- `claude` / `claude-code` normalize to `anthropic` (auth.py:1498)
- It reads `ANTHROPIC_API_KEY -> ANTHROPIC_TOKEN -> CLAUDE_CODE_OAUTH_TOKEN` (auth.py:314, 490)
- `CLAUDE_CODE_OAUTH_TOKEN` is treated as implicit/set by Claude Code itself (auth.py:1368-1370)

Now let me see the OAuth login flow for anthropic (the `run_hermes_oauth_login_pure` referenced at auth_commands.py:226) and how the token is stored, plus the auth CLI command surface.

### Assistant | 2026-06-08T15:42:56.797Z

[tool_use: Bash]

### User | 2026-06-08T15:43:00.268Z

[tool_result]         requested_type = AUTH_TYPE_API_KEY
    if not requested_type:
        if provider.startswith(CUSTOM_POOL_PREFIX):
            requested_type = AUTH_TYPE_API_KEY
        else:
            requested_type = AUTH_TYPE_OAUTH if provider in _OAUTH_CAPABLE_PROVIDERS else AUTH_TYPE_API_KEY

    pool = load_pool(provider)

    # Clear ALL suppressions for this provider — re-adding a credential is
 
... [+7130 chars truncated]

### Assistant | 2026-06-08T15:43:08.432Z

Now I understand the OAuth flow: `hermes auth add anthropic --type oauth` runs `anthropic_adapter.run_hermes_oauth_login_pure()` (a PKCE login flow — Hermes' OWN OAuth, not reading Claude Code's credentials file). Let me check the anthropic_adapter for the OAuth implementation, and verify whether Hermes reads `~/.claude/.credentials.json` or has its own token. Also check how `CLAUDE_CODE_OAUTH_TOKEN` plays in (auth.py:1368).

### Assistant | 2026-06-08T15:43:08.433Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:43:10.614Z

[tool_use: Bash]

### User | 2026-06-08T15:43:12.736Z

[tool_result] 9:  - OAuth setup-tokens (sk-ant-oat*) → Bearer auth + beta header
10:  - Claude Code credentials (~/.claude.json or ~/.claude/.credentials.json) → Bearer auth
31:# read_claude_code_credentials_from_keychain) are all on cold user-triggered
254:# ("long context beta is not yet available for this subscription") for
270:# subscriptions reject it, but Bedrock/Azure still need it for 1M context.
2
... [+2554 chars truncated]

### User | 2026-06-08T15:43:15.044Z

[tool_result]         name="MiniMax (OAuth \u00b7 minimax.io)",
        auth_type="oauth_minimax",
        portal_base_url=MINIMAX_OAUTH_GLOBAL_BASE,
        inference_base_url=MINIMAX_OAUTH_GLOBAL_INFERENCE,
        client_id=MINIMAX_OAUTH_CLIENT_ID,
        scope=MINIMAX_OAUTH_SCOPE,
        extra={"region": "global", "cn_portal_base_url": MINIMAX_OAUTH_CN_BASE,
               "cn_inference_base_url": MINIMAX
... [+3567 chars truncated]

### Assistant | 2026-06-08T15:43:21.108Z

This is the definitive answer. The anthropic_adapter at the top documents the full auth model. Let me read the adapter header (lines 1-60) and the `run_oauth_setup_token` / credentials reading section to nail the exact auth mechanism, plus confirm the CLI command for setup-token.

### Assistant | 2026-06-08T15:43:21.477Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:43:22.341Z

[tool_use: Bash]

### User | 2026-06-08T15:43:25.806Z

[tool_result] """Anthropic Messages API adapter for Hermes Agent.

Translates between Hermes's internal OpenAI-style message format and
Anthropic's Messages API. Follows the same pattern as the codex_responses
adapter — all provider-specific logic is isolated here.

Auth supports:
  - Regular API keys (sk-ant-api*) → x-api-key header
  - OAuth setup-tokens (sk-ant-oat*) → Bearer auth + beta header
  - Claude Co
... [+1854 chars truncated]

### User | 2026-06-08T15:43:27.180Z

[tool_result] def run_oauth_setup_token() -> Optional[str]:
    """Run 'claude setup-token' interactively and return the resulting token.

    Checks multiple sources after the subprocess completes:
      1. Claude Code credential files (may be written by the subprocess)
      2. CLAUDE_CODE_OAUTH_TOKEN / ANTHROPIC_TOKEN env vars

    Returns the token string, or None if no credentials were obtained.
    Raises
... [+2509 chars truncated]

### Assistant | 2026-06-08T15:43:36.637Z

I now have the complete auth picture. There are two distinct paths to use Claude Code (Claude Max subscription OAuth) with Hermes:
1. `claude setup-token` → produces an `sk-ant-oat*` token → Hermes reads via `CLAUDE_CODE_OAUTH_TOKEN` or credentials file
2. Hermes-native PKCE OAuth (`hermes auth add anthropic --type oauth`) → stores in `~/.hermes/.anthropic_oauth.json`

Let me verify the exact config.yaml provider syntax/validation and check the RELEASE_v0.15 notes for Claude Code support, plus confirm the live credentials file exists. Let me also check how `model.provider` is validated against the registry and what the prior working commit referenced.

### Assistant | 2026-06-08T15:43:37.354Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:43:38.715Z

[tool_use: Bash]

### User | 2026-06-08T15:43:41.727Z

[tool_result] RELEASE_v0.13.0.md:306:- Fix: correct ACP docs — Claude Code CLI has no --acp flag (salvage #19058) ([#21201](https://github.com/NousResearch/hermes-agent/pull/21201))
RELEASE_v0.15.0.md:34:- **OpenHands orchestration skill** — A new optional skill under `optional-skills/autonomous-ai-agents/openhands/` lets the agent delegate coding tasks to the OpenHands CLI alongside `claude-code`, `codex`, an
... [+416 chars truncated]

### User | 2026-06-08T15:43:47.562Z

[tool_result] -rw-r--r-- 1 wompu 197611 63697 Jun  8 10:43 /c/Users/wompu/.claude.json
-rw-r--r-- 1 wompu 197611 18341 Jun  8 10:06 /c/Users/wompu/.claude/.credentials.json
---claude CLI---
claude not on PATH (bash)
---ENV---
CLAUDE_CODE_OAUTH_TOKEN set: NO
ANTHROPIC_API_KEY set: NO

### Assistant | 2026-06-08T15:43:58.744Z

Both Claude credential files exist. `~/.claude/.credentials.json` is present (the OAuth token Hermes reads). The release notes confirm `claude-code` is referenced only as an autonomous-agent delegation skill, NOT as a distinct model provider — the model-provider path is the `anthropic` profile with the `claude-code` alias. Let me verify the config-validation path (how `model.provider` is checked against the registry) and read the credentials file structure to confirm what Hermes expects.

### Assistant | 2026-06-08T15:44:00.023Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:44:03.881Z

[tool_use: Bash]

### User | 2026-06-08T15:44:04.920Z

[tool_result] def read_claude_code_credentials() -> Optional[Dict[str, Any]]:
    """Read refreshable Claude Code OAuth credentials.

    Checks two sources in order:
      1. macOS Keychain (Darwin only) — "Claude Code-credentials" entry
      2. ~/.claude/.credentials.json file

    This intentionally excludes ~/.claude.json primaryApiKey. Opencode's
    subscription flow is OAuth/setup-token based with refre
... [+1282 chars truncated]

### User | 2026-06-08T15:44:10.503Z

[tool_result] 807:    The password field contains a JSON string with the same claudeAiOauth
810:    Returns dict with {accessToken, refreshToken?, expiresAt?} or None.
843:    oauth_data = data.get("claudeAiOauth")
845:        access_token = oauth_data.get("accessToken", "")
846:        if access_token:
848:                "accessToken": access_token,
850:                "expiresAt": oauth_data.get("expir
... [+3004 chars truncated]

### Assistant | 2026-06-08T15:44:17.332Z

The live `~/.claude/.credentials.json` has exactly the `claudeAiOauth` block Hermes reads: `{accessToken, refreshToken, expiresAt, scopes, subscriptionType, rateLimitTier}` — this is a Claude Max subscription OAuth token. Hermes' `read_claude_code_credentials()` matches this shape precisely.

Now let me verify the config validation path (does `model.provider: claude-code` resolve, or must it be `anthropic`?) and find the prior-working-setup reference. Let me check how model_switch / config resolves the provider, and grep the model_catalog/providers handling.

### Assistant | 2026-06-08T15:44:17.522Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:44:19.273Z

[tool_use: Bash]

### User | 2026-06-08T15:44:26.323Z

[tool_result] 12:Discovery is lazy: the first call to ``get_provider_profile()`` or
26:    from providers import get_provider_profile
27:    profile = get_provider_profile("nvidia")   # ProviderProfile or None
28:    profile = get_provider_profile("kimi")     # checks name + aliases
54:    """Register a provider profile by name and aliases.
61:    for alias in profile.aliases:
65:def get_provider_profile(
... [+288 chars truncated]

### User | 2026-06-08T15:44:27.235Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-08T15:44:34.870Z

`get_provider_profile()` resolves aliases (providers/__init__.py:72-73), so `provider: claude-code` WILL resolve to the `anthropic` profile. But the live config's `auxiliary.vision` and `fallback_model` both use `provider: anthropic` (the canonical name), which is the safer, documented form. Let me confirm there's no separate validation enum that would reject `claude-code`, and read the `.env.example` anthropic section + how the agent picks up the token at runtime (runtime_provider.py).

### Assistant | 2026-06-08T15:44:34.945Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:44:35.964Z

[tool_use: Bash]

### User | 2026-06-08T15:44:40.152Z

[tool_result] 15:# LLM_MODEL=anthropic/claude-opus-4.6

### User | 2026-06-08T15:44:41.030Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-08T15:44:47.541Z

Let me find where the credentials are actually consumed at runtime (build_anthropic_client) to confirm the auto-detection chain, and check the auth.py `get_anthropic_oauth_token` resolution order (lines 1093-1145) which is the canonical runtime path.

### Assistant | 2026-06-08T15:44:49.404Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:44:51.528Z

[tool_use: Bash]

### User | 2026-06-08T15:44:53.630Z

[tool_result]     inspect Claude Code's refreshable credential file. If we have a refreshable
    Claude Code credential record, prefer it over the static env OAuth token.
    """
    if not env_token or not _is_oauth_token(env_token) or not isinstance(creds, dict):
        return None
    if not creds.get("refreshToken"):
        return None

    resolved = _resolve_claude_code_token_from_credentials(creds)
  
... [+1846 chars truncated]

### User | 2026-06-08T15:44:55.811Z

[tool_result] 30:# and the 3 usage sites (build_anthropic_client, build_anthropic_bedrock_client,
153:def _resolve_positive_anthropic_max_tokens(value) -> Optional[int]:
179:def _resolve_anthropic_messages_max_tokens(
198:    resolved = _resolve_positive_anthropic_max_tokens(requested)
571:def _build_anthropic_client_with_bearer_hook(
644:def build_anthropic_client(
688:        return _build_anthropic_client_wi
... [+1216 chars truncated]

### Assistant | 2026-06-08T15:45:02.953Z

I have everything needed. `resolve_anthropic_token()` (anthropic_adapter.py:1102-1144) is the canonical runtime resolver, and step 3 reads `~/.claude/.credentials.json` `claudeAiOauth.accessToken` automatically — which exists live and is a Max subscription token. The token auto-refreshes via the refreshToken (step 3 note + `_write_claude_code_credentials` at :997).

Let me do two final confirmations: (1) the CLI auth/model command surface to set this up, and (2) whether there's a model_switch path to select the provider non-interactively.

### Assistant | 2026-06-08T15:45:04.535Z

[tool_use: Bash]

### User | 2026-06-08T15:45:10.013Z

[tool_result] 1:"""Credential-pool auth subcommands."""
103:def _oauth_default_label(provider: str, count: int) -> str:
163:def auth_add_command(args) -> None:
420:def auth_list_command(args) -> None:
447:def auth_remove_command(args) -> None:
485:def auth_reset_command(args) -> None:
492:def auth_status_command(args) -> None:
512:def auth_logout_command(args) -> None:
516:def auth_spotify_command(args)
... [+410 chars truncated]

### Assistant | 2026-06-08T15:45:16.614Z

Let me confirm the `auth setup-token` subcommand registration and the model-selection CLI, to give an accurate CLI command set.

### Assistant | 2026-06-08T15:45:21.622Z

[tool_use: Bash]

### User | 2026-06-08T15:45:25.979Z

[tool_result] 587:    _DEFAULT_MODEL = DEFAULT_CONFIG.get("model", "")
589:    model_cfg = cfg.get("model")
1871:            model=getattr(args, "model", None),
1891:        "model": args.model,
2190:    _require_tty("model")
2237:    current_model = config.get("model")
2245:    model_cfg = config.get("model")
2306:                    raw_entry.get("model", "") or raw_entry.get("default_model", ""),
232
... [+1214 chars truncated]

### Assistant | 2026-06-08T15:45:37.133Z

[tool_use: Bash]

### User | 2026-06-08T15:45:43.642Z

[tool_result] hermes_cli/main.py:5983:        run_oauth_setup_token,
hermes_cli/main.py:6015:        token = run_oauth_setup_token()
hermes_cli/main.py:11454:# Keep this in sync with the ``subparsers.add_parser("NAME", ...)`` calls
hermes_cli/main.py:11814:    model_parser = subparsers.add_parser(
hermes_cli/main.py:11876:    fallback_parser = subparsers.add_parser(
hermes_cli/main.py:11887:    fallback_su
... [+2667 chars truncated]

### Assistant | 2026-06-08T15:45:47.112Z

Let me read the relevant CLI parser blocks: the `model` subparser (11814), the `auth add` (12419), and the `setup-token`/login context around 5983 and 12355.

### Assistant | 2026-06-08T15:45:48.061Z

[tool_use: Bash]

### User | 2026-06-08T15:45:52.318Z

[tool_result] === model parser 11814 ===
    model_parser = subparsers.add_parser(
        "model",
        help="Select default model and provider",
        description="Interactively select your inference provider and default model",
    )
    model_parser.add_argument(
        "--refresh",
        action="store_true",
        help="Wipe the model picker disk cache and re-fetch every provider's live /v1/model
... [+3732 chars truncated]

### Assistant | 2026-06-08T15:45:58.895Z

I have all the evidence needed. (The ERROR TRIAGE hook message is a false positive — no test was run; that's the slow-command watchdog mislabeling.) Let me do one final check to confirm the model id `claude-opus-4-8` is the right Opus identifier and that the prior-working-setup model name matches, then compile the report.

### Assistant | 2026-06-08T15:46:00.243Z

[tool_use: Bash]

### User | 2026-06-08T15:46:05.681Z

[tool_result] agent/anthropic_adapter.py:90:_FAST_MODE_SUPPORTED_SUBSTRINGS = ("opus-4-6", "opus-4.6")
agent/anthropic_adapter.py:98:    "claude-opus-4-8":   128_000,
agent/anthropic_adapter.py:100:    "claude-opus-4-7":   128_000,
agent/anthropic_adapter.py:102:    "claude-opus-4-6":   128_000,
agent/anthropic_adapter.py:105:    "claude-opus-4-5":    64_000,
agent/anthropic_adapter.py:109:    "claude-opus
... [+609 chars truncated]

### Assistant | 2026-06-08T15:46:44.068Z

All confirmed. `claude-opus-4-8` is a recognized Anthropic model id (anthropic_adapter.py:98, 128k max output) and the live config already uses `provider: anthropic` + `model: claude-opus-4-8` in two places (auxiliary.vision at :165-166 and fallback_model at :596-597). The fix is to set the PRIMARY `model:` block the same way.

Here is my report.

---

## Hermes ↔ Claude Code Configuration Report

### (A) Installed Hermes version
**0.15.1** — `pyproject.toml:version = "0.15.1"`. (The `package.json` "1.0.0" is the npm browser-tools wrapper, not the agent; the egg-info dir `hermes_agent.egg-info/` and RELEASE_v0.15.1.md confirm 0.15.x is current.)

### (B) Valid provider keywords for Claude (with evidence)
There is **no standalone `claude_code` / `claude-code` model provider**. Claude Code support is delivered through the **`anthropic`** provider profile, which carries `claude-code` as an alias.

- Canonical provider name: **`anthropic`**, with aliases `("claude", "claude-oauth", "claude-code")` — `plugins/model-providers/anthropic/__init__.py:54-56` (the `anthropic = AnthropicProfile(name="anthropic", aliases=("claude","claude-oauth","claude-code"), ...)` block).
- Alias resolution is live: `get_provider_profile()` maps any alias to the canonical name via `_ALIASES.get(name, name)` — `providers/__init__.py:72-73`. So `provider: claude-code`, `provider: claude`, or `provider: anthropic` all resolve to the same profile.
- A second, independent alias map in the auth layer also normalizes `"claude": "anthropic"` and `"claude-code": "anthropic"` — `hermes_cli/auth.py:1498`.
- `anthropic` is OAuth-capable: `_OAUTH_CAPABLE_PROVIDERS = {"anthropic", "nous", "openai-codex", ...}` — `hermes_cli/auth_commands.py:36`.
- The `claude_code` SKILL (`skills/autonomous-ai-agents/claude-code/SKILL.md`) is an autonomous-agent *delegation* skill (Hermes spawning the `claude` CLI as a sub-worker), **not** a model provider. RELEASE_v0.15.0.md:34 lists `claude-code` only in that delegation 
... [+5150 chars truncated]
