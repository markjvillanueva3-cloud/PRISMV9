---
name: reference_hermes_model_config_grok43_2026_06_26
description: "How to set the Hermes default model correctly + a config-set GOTCHA. `hermes config set model <name>` writes the ACTIVE PROFILE's config (profiles/<slot>/config.yaml), NOT global, and DRIFTS the provider (picked Nous -> failed on no-credits); `config set model.<dotkey>` CLOBBERS the rest of the model dict (default went unset). The reliable model block is a full dict: {base_url:'', default: grok-4.3, max_tokens, ollama_num_ctx, provider: xai-oauth}. grok-4.3 via xai-oauth (SuperGrok/Premium+) works; via Nous it fails (no usable paid credits). VERIFY with a real `hermes --cli -z PONG`, not just status."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.606Z
aliases: reference_hermes_model_config_grok43_2026_06_26
---


2026-06-26 slot:bravo. Operator: "it's defaulting to gpt-oss, change the default model to grok 4.3 max."

## How Hermes resolves the default model (layered -- this is the trap)
- Each profile has its OWN `profiles/<slot>/config.yaml` with a top-level `model:` DICT: `{base_url, default, max_tokens, ollama_num_ctx, provider}`. `default` = the model id, `provider` = where it routes.
- `hermes config set <k> <v>` writes the **ACTIVE PROFILE's** config (e.g. `profiles/zulu/config.yaml`), shown in its output -- NOT the global `config.yaml`. So it only changes ONE profile; the desktop + other 20 fleet profiles keep their own (gpt-oss) config.
- `hermes model` (the canonical picker) is INTERACTIVE (TTY-guarded) -- Claude can't run it; it's the clean way for the operator to set model+provider+reasoning in one validated flow.

## The GOTCHA that cost several attempts (R12)
- `hermes config set model grok-4.3` set `model.default=grok-4.3` but DRIFTED `model.provider` to Nous -> grok-4.3 routed via Nous Portal -> **"no final response was produced; treating the run as failed"** because the Nous account has *no usable paid credits*.
- `hermes config set model.provider xai-oauth` then CLOBBERED the model dict down to just `{provider: xai-oauth}` -> `Model: (not set)` -> still failed.
- FIX: edit `profiles/zulu/config.yaml` directly to the FULL block:
  ```yaml
  model:
    base_url: ''
    default: grok-4.3
    max_tokens: 32768
    ollama_num_ctx: 131072
    provider: xai-oauth
  ```
  Then `hermes status` -> `Model: grok-4.3 / Provider: xAI Grok OAuth (SuperGrok / Premium+)`, and `hermes --cli -z PONG` -> a real response ("PONG received"). xAI SuperGrok works; Nous does not (no credits).

## Key facts
- xAI live catalog (via the :8645 proxy `/v1/models`) has `grok-4.3` -- there is NO `grok-4.3-max` MODEL. "grok 4.3 max" = grok-4.3 at `reasoning_effort: max` (a separate config key).
- Always VERIFY a model change with a real one-shot inference (`hermes --cli -z <prompt>`), not just `hermes status` -- status showed grok-4.3 while the actual run failed (wrong provider).
- Per-profile model config mirrors the per-profile AUTH model ([[reference_hermes_per_profile_auth_creds_2026_06_26]]) -- changing the CLI default (zulu) does NOT change the desktop/fleet profiles; propagate per-profile if "everywhere" is wanted (note: 21 agents on grok = concurrent xAI sub load).
Related: [[reference_hermes_ipv6_boot_hang_fix_2026_06_26]].
