---
name: ask-hermes
description: Query Hermes (Nous) from any Claude Code chat slot. Routes a prompt through the local Hermes OpenAI-compatible proxy to a managed-OAuth provider (xAI Grok) -- a STRONGER/different model than local Ollama, reached via Hermes' credential management, processed outside the Claude context window. Auto-falls-back to free local Ollama if the proxy is down. Use when you want grok-class reasoning on a chunk of work without spending Claude tokens.
version: 1.0.0
tier: T4
trigger:
  autoSuggest:
    keywords:
      - ask-hermes
      - ask hermes
      - hermes
      - grok
      - nous
      - managed provider
---

# /ask-hermes -- query Hermes from any chat slot

Routes a prompt to **Hermes' local OpenAI-compatible proxy** (`hermes proxy`,
`:8645/v1`) via `scripts/ask-hermes.mjs`. The proxy forwards to a managed-OAuth
upstream (xAI **Grok**, ready; Nous Portal if logged in) and attaches your real
credential -- so you get grok-class output **without** it entering the Claude
context window, and **without** burning Claude tokens. If the proxy is down, the
bridge degrades to free local **Ollama** (loud about why), so it never hard-fails.

This is the canonical way to reach Hermes capabilities from any Claude Code slot.

## Modes

```bash
# General question (literal text).
node scripts/ask-hermes.mjs ask "explain the tradeoff between climb and conventional milling"

# Digest / explain / triage a FILE ("-" reads stdin).
node scripts/ask-hermes.mjs summarize mcp-server/src/engines/SomeEngine.ts
node scripts/ask-hermes.mjs explain   scripts/regen-viz.mjs
node scripts/ask-hermes.mjs triage    /tmp/tsc-errors.log

# One-line classification.
node scripts/ask-hermes.mjs classify "is this a roughing or finishing pass: ap=0.2mm ae=0.1D"
```

Flags: `--model <id>` (default: first from `/v1/models`) - `--json` -
`--timeout <ms>` (default 120000) - `--max-tokens <n>` (default 1024) -
`--no-fallback` (fail loud instead of degrading to Ollama) - `--url <base>`.

Env: `PRISM_HERMES_PROXY_URL` (default `http://127.0.0.1:8645/v1`) -
`PRISM_HERMES_TOKEN` (default "prism"; proxy ignores the value and attaches the
real OAuth cred) - `PRISM_HERMES_MODEL`.

## Proxy lifecycle (always-on)

The proxy is kept live by the **`PRISM Hermes Proxy`** scheduled task
(`.claude/helpers/install-hermes-proxy-task.ps1`, S4U current-user). If it is not
installed or not running, start it ad-hoc:

```bash
node scripts/hermes-proxy-ensure.mjs --provider xai   # idempotent: starts only if down
```

`ask-hermes` works from this or any other slot the moment the proxy is up; if it
is down you transparently get the free Ollama answer instead.

## When to use which local route

| Want | Use |
|---|---|
| free, fast, mechanical text (summarize/explain/classify/triage) | `/ask-local` (Ollama) |
| stronger grok-class reasoning via Hermes' managed OAuth, still off-Claude | `/ask-hermes` |
| Claude deep reasoning + safety | stay in Claude |

`/ask-hermes` is the escalation tier above `/ask-local` -- reach for it when
local Ollama is not strong enough but you still want the work out of the Claude
context window.

## Caveat -- the full agentic loop

`hermes chat` (the full Hermes AGENT: tools, skills, agentic loop) is pinned in
Hermes config to an Anthropic model and currently returns HTTP 400 under the
third-party-app billing policy ("add extra usage at claude.ai/settings/usage").
That is an account-billing matter, not a defect. **`/ask-hermes` uses the proxy
completion path (grok), which works today** -- it does not require the Anthropic
billing fix. Fund claude.ai to also enable the Anthropic-backed agent loop.

## Exit codes

`0` ok (answered by Hermes OR the Ollama fallback) - `2` usage error / missing
input - `3` Hermes failed AND fallback disabled/unavailable (fail loud).

## Related

- `scripts/ask-hermes.mjs` -- the bridge (pure core + thin shell), `scripts/ask-hermes.test.mjs` (20 cases).
- `scripts/hermes-proxy-ensure.mjs` + `.claude/helpers/install-hermes-proxy-task.ps1` -- keepalive + durable task.
- `scripts/lib/task-substrate-router.mjs` -- surfaces `/ask-hermes` as the managed-provider escalation tier on task-start.
- `/ask-local` -- the free local-Ollama sibling.
- Memory `reference_hermes_bridge_ms0_2026_06_13` -- the full repair + bridge record.
