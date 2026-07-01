---
artifact: hermes-cloud-local-config-finding
by: slot:zulu 2026-06-29 (operator: "hermes updated today by alpha... switched to cloud and local llms; make sure reflected in the entire codebase")
status: FINDING + propagation plan. Contains NO secrets (config secret fields were empty / env-backed; redacted by reference).
---

# Hermes "cloud + local" update -- what changed today + how PRISM reflects it

## 1. WHERE the change is (R12 lookup of today's work)
- **NO alpha commits in the PRISM repo today** -- verified 3 ways: (a) hermes/grok/octopus-filtered `git log --all --since today` = 0 alpha; (b) all-scope `slot:alpha` log today = 0; (c) by-slot commit count today (sierra 23, charlie 20, delta 19, oscar 19, whiskey 19, zulu 18, india 10, echo 9 -- NO alpha). Alpha's latest handoff has 0 hermes lines; slot/alpha branch is 12 days old.
- **The change is in the EXTERNAL Hermes app config**, not the repo: `C:\Users\wompu\AppData\Local\hermes\config.yaml`, backed up today as `config.yaml.bak-hermesfix-20260629083206` (08:32) + `state.db.bak-hermesfix-...091936` + temp logs `hermes_{credfix,initfix,inittime,verify}_*` through the day. This config is **AppData-only / NOT version-controlled** -> R15 orphan-infra (same class delta fixed today for the Fusion add-in, U-DELTA-ADDIN-TRACKED-SOURCE).

## 2. WHAT changed -- the cloud+local routing (config.yaml _config_version 28)
The Hermes **AGENT/CLI** now routes across cloud + local with a local-first router:
- **Cloud (NVIDIA NIM):** `model.default = meta/llama-3.3-70b-instruct` @ integrate.api.nvidia.com; `fallback_model/providers = nvidia qwen3-next-80b`; `moa.default.reference_models = nvidia {nemotron-3-ultra-550b, qwen3.5-397b, deepseek-v4-pro}`, aggregator llama-3.3-70b.
- **Local (Ollama):** `auxiliary.*` (approval/compression/curator/mcp/title/triage/vision) + `delegation` = ollama @ 127.0.0.1:11434 (`gpt-oss:20b`, `qwen3-coder:30b`, `qwen2.5vl:32b`).
- **Router (experimental):** `model_router_enabled: true`, **`default_to_local_first: true`**, `prefer_local_for_builds: true`, `claude_escalation_threshold: 0.65`, `auto_invocation_router: true`.
- **Grok demoted:** xAI Grok now only `x_search.model = grok-4.20-reasoning`. `model_catalog` = Nous Research.

## 3. WHAT PRISM uses -- the :8645 proxy (SEPARATE layer)
- PRISM's `ask-hermes.mjs` + `mcp__hermes` + octopus Hermes voices hit the **`:8645` proxy** = `hermes proxy start` = an OpenAI-/v1 passthrough to the **xAI Grok OAuth** upstream. This is DISTINCT from the agent `config.yaml` model section above.
- **LIVE STATE NOW: the proxy is 401 / `authenticated: false`** (it WAS authenticated ~30 min ago -- my knowledge-enrichment Grok calls succeeded). The xAI OAuth dropped. **PRISM's Hermes lane is currently DOWN.**
- PRISM Hermes integration is **grok-proxy-centric**: `ask-hermes` default grok-4.3, `grok-capability-rank.mjs`, octopus `hermesAgentLenses` default "grok-4.3", `verified-offload-tiered` strong-tier = hermes(grok). It does NOT reflect the new NVIDIA+Ollama+router agent config -- and it does not need to, AS LONG AS the proxy stays the grok lane.

## 4. OPERATOR-GATED (cannot be auto-decided -- credentials / external / architecture)
- **A. Re-authenticate the proxy** (it's 401 now). Browser OAuth: `hermes auth add xai-oauth` (PKCE) OR `node H:/prism/scripts/hermes-proxy-ensure.mjs`. zulu CANNOT do OAuth (credential action). **This is the immediate blocker -- PRISM's Hermes lane is dark until re-auth.**
- **B. Architecture decision:** do you want PRISM to KEEP the xAI-Grok proxy lane (status quo -- works when authed; grok-centric code unchanged), or MIGRATE PRISM's Hermes consumers to the new NVIDIA-cloud + Ollama-local + router (leverage the local-first routing, NVIDIA NIM models)? Migration is a deliberate change to the fleet's AI substrate + a paid external cloud (NVIDIA key) -- it should not be auto-applied (could break the working lane + needs the NVIDIA credential handled).

## 5. zulu RECOMMENDATION
1. **Re-auth the proxy first** (B-A) -- nothing else matters while it's 401.
2. **Keep the grok proxy as PRISM's Hermes lane for now** (least risk; the code already works + is cloud(grok)+local(ollama-fallback) dual-lane). The new NVIDIA+Ollama agent router is the Hermes APP's internal routing; PRISM does not need to mirror it to function.
3. **Version-control a SANITIZED config template** (secrets stripped) so this cloud+local setup is recoverable (close the AppData-only orphan, R15) -- a clean future unit (needs the secret-scrub; not done here to avoid committing credentials).
4. **IF migrating to NVIDIA+Ollama (B-B):** the propagation checklist is -- `ask-hermes.mjs` (default model + base_url + the `--model` resolution), `grok-capability-rank.mjs` (it ranks GROK; NVIDIA/Ollama ids need their own ranker or a provider-aware selector), octopus `hermesAgentLenses` (the default voice), `verified-offload-tiered` strong-tier, and the substrate-router `how:` strings. ~5 files; gated on B-B + the NVIDIA key.

## Bottom line
Alpha's "cloud and local" is the external Hermes-app `config.yaml` (NVIDIA NIM cloud + Ollama local + local-first router), NOT a repo commit. PRISM's repo-side Hermes integration is already cloud(grok)+local(ollama-fallback) dual-lane and is consistent -- but it rides the **:8645 xAI proxy, which is 401 right now**. Immediate action is operator re-auth; the NVIDIA+Ollama migration is a separate, deliberate, operator-gated decision (recommendation: keep the grok proxy unless you explicitly want PRISM on NVIDIA NIM).
