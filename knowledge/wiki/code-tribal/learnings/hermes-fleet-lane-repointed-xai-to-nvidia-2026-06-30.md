---
title: Fleet Hermes lane repointed off dead xAI-OAuth to NVIDIA cloud
type: lesson
slot: alpha
date: 2026-06-30
tags: [hermes, ollama-offload, nvidia, fleet, token-economy, xai-oauth-dead]
commit: e2579970a6
memory: reference_hermes_grok_via_proxy_deadtoken_2026_06_29
---

# Fleet Hermes lane: dead xAI-OAuth -> NVIDIA cloud

## Symptom
Operator told many fleet slots to use Hermes agents; they "were all getting xAI errors."

## Root cause
The fleet has TWO shared Hermes inference surfaces, both resolving their endpoint from
`PRISM_HERMES_PROXY_URL` (default `http://127.0.0.1:8645/v1` = the local xAI-OAuth proxy):
- `scripts/ask-hermes.mjs` (Bash bridge) -- had an Ollama fallback, so slots still got
  answers but with noisy xai errors and the LOST "stronger-than-Ollama" managed lane.
- `scripts/hermes-mcp-server.mjs` (the `mcp__hermes__hermes_ask/status/models` tools) --
  NO fallback; returned the raw xai auth error to any slot using the MCP tool.

The `:8645` proxy only supports `--provider xai|nous` (`hermes-proxy-ensure.mjs:53`), and
BOTH are dead for this account (xAI OAuth `invalid_grant`/revoked; Nous no-credits). So the
proxy itself cannot serve a working lane -- the lane had to move off the proxy.

## Fix (the "stronger-than-Ollama managed lane" is now NVIDIA cloud)
NVIDIA build.nvidia.com (`integrate.api.nvidia.com/v1`) is OpenAI-compatible and the existing
NGC key (`NVIDIA_API_KEY`, already in the fleet env) authenticates its hosted inference.
1. `settings.json` env (non-secret config; key NOT committed):
   `PRISM_HERMES_PROXY_URL=https://integrate.api.nvidia.com/v1` +
   `PRISM_HERMES_MODEL=meta/llama-3.3-70b-instruct`.
2. `ask-hermes.mjs`: `DEFAULT_TOKEN = PRISM_HERMES_TOKEN || NVIDIA_API_KEY || "prism"`.
   The `:8645` proxy IGNORED the bearer (attached the real OAuth); NVIDIA REQUIRES it. Falling
   back to `NVIDIA_API_KEY` avoids duplicating the key into a second env var.
3. `hermes-mcp-server.mjs`: new pure `authHeaders()` (bearer from
   `PRISM_HERMES_TOKEN||NVIDIA_API_KEY`) on the chat + both `/models` fetches; `hermesStatus`
   falls back to an authed `/models` probe when `/health` is absent -- a DIRECT cloud lane has
   NO `/health`, so a `/health`-only probe falsely reported the lane DOWN and degraded the whole
   fleet to Ollama even while NVIDIA was serving.

## Verified
`PRISM_HERMES_PROXY_URL=...nvidia... node scripts/ask-hermes.mjs ask "..." --json` ->
`{"source":"hermes","model":"meta/llama-3.3-70b-instruct","content":"HERMES_NV_FLEET_OK"}`
(was a xai error + Ollama-fallback). 83/83 tests (added cloud-up + both-probes-fail cases).

## Lessons
- When a "managed lane" upstream dies and its proxy is provider-locked (xai|nous), don't fight
  the proxy -- repoint the env-configurable bridge at a working OpenAI-compatible cloud lane.
- A direct cloud lane has no `/health`: a health-only liveness probe must fall back to an authed
  `/models` probe, or it false-reports DOWN and silently degrades the fleet to the fallback.
- One env var (`PRISM_HERMES_PROXY_URL`) fixed BOTH surfaces because both already read it (DRY
  pays off): the bearer was the only code gap (proxy ignored it; cloud requires it).

## Follow-up status (updated after fixing the meta-health probe + assessing the octopus)
- **DONE** `scripts/reconcile-zulu-ledger.mjs` `checkHermesProxy` (the SessionStart meta-health
  probe gating the "HERMES DOWN" banner + the octopus/verified-offload degrade decision): now
  falls back to an authed `/models` probe when `/health` is absent, so the NVIDIA lane reports UP
  (commit U-METAHEALTH-CLOUD-PROBE, 37/37 tests). The false-DOWN banner is gone.
- **SCOPED (deferred, graceful-degrading)** the **octopus** Grok voice (`MultiModelConsensusEngine`
  -> `GrokClientEngine`): `GrokClientEngine.ts:68` ALREADY reads `PRISM_HERMES_PROXY_URL` (so its
  endpoint is NVIDIA now), BUT it requests `grok-4`/`grok-4.3` model ids NVIDIA doesn't serve, and
  -- more importantly -- repurposing the "Grok voice" to NVIDIA-llama is SEMANTICALLY WRONG: it would
  duplicate the existing Ollama voice and REDUCE consensus voice DIVERSITY (the point of the octopus).
  The correct fix is a NEW dedicated NVIDIA consensus voice (new client engine + wiring + mcp-server
  build + tests), a feature -- NOT a quick env-reroute. Degrades gracefully today: the octopus runs
  on its other voices (Claude + Ollama(17 models) + Gemini), so consensus still works without Grok.
  Next-unit candidate: `U-OCTOPUS-NVIDIA-VOICE` (add NVIDIA cloud as a distinct consensus voice).

## Reversal
Delete the 2 `settings.json` env lines -> the lane returns to the `:8645` proxy default.

Sibling: the same-session Hermes DESKTOP-app fixes (billing-null->Nous, agent-init 30s timeout,
stale-'ok' xai-oauth credential, prism-MCP connect_timeout) -- see memory
[[reference_hermes_grok_via_proxy_deadtoken_2026_06_29]].
