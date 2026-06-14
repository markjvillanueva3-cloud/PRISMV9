---
name: reference_hermes_on_claude_subscription_opus48_2026_06_04
description: "How Hermes runs on the Claude Max subscription at Opus 4.8 (provider=anthropic + claude_code OAuth, NOT OpenRouter) — the config + the root-cause it fixed."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.141Z
aliases: reference_hermes_on_claude_subscription_opus48_2026_06_04
---


The **Hermes desktop agent** (`C:/Users/wompu/AppData/Local/hermes/`) runs on **Claude Opus 4.8 via the Claude Max subscription** as of 2026-06-04 (slot:bravo).

**The working config** (`config.yaml` model block):
```yaml
model:
  default: claude-opus-4-8      # (or claude-opus-4-7); NOT anthropic/claude-opus-4.6
  provider: anthropic           # NOT auto
  base_url: ''                  # NOT https://openrouter.ai/api/v1
```
Hermes has a built-in `claude_code` credential source that auto-reads `C:/Users/wompu/.claude/.credentials.json` (the live Claude Max OAuth bundle) — no env var / key injection needed. The Anthropic SDK builds the client with `Authorization: Bearer <oauth accessToken>` + `anthropic-beta: oauth-...` headers automatically (`_is_oauth_token=True`).

**Root cause it fixed:** the old config (`provider: auto` + `base_url: openrouter`) routed EVERY request to OpenRouter, which had no key + exhausted credit → gateway init aborted → Hermes boot-looped 5× and died. The `claude_code`/anthropic path was never reached because routing landed on OpenRouter first. Backups: `config.yaml.bak-opus48-<ts>` + `config.yaml.bak-2026-06-03`.

**Consequence — Hermes now shares the fleet's account + 5h pool:** Hermes draws from the SAME Claude Max subscription + 5-hour usage window as the 26-chat fleet. A turn auth-succeeds (request_id returned) but 429s while the 5h window is saturated by the fleet. This is exactly what `scripts/account-switch-restart-coordinator.mjs` (account-switch@90%-5h → staggered restart) manages — Hermes is now a first-class member of that account pool.

**How to verify Hermes is on 4.8:** `hermes model` → `Current model: claude-opus-4-8 / Active provider: Anthropic`; process stays up (no boot-loop); Web UI http://127.0.0.1:9120 → 200. Related: [[feedback_bravo_launches_hermes_obsidian_apps]] · ZULU-ACCOUNT-CYCLE-MS0 (5h-populator U4 still pending — gates the auto-switch trigger).
