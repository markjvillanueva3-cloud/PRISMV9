---
name: reference_hermes_per_profile_auth_creds_2026_06_26
description: "Hermes CLI credentials are PER-PROFILE: each of the 21 fleet profiles has its own %LOCALAPPDATA%\\hermes\\profiles\\<slot>\\auth.json. 2026-06-26 state: only the `bravo` profile is logged into Nous (active_provider=nous); the active CLI profile is `zulu` + the other 19 default to a xai-oauth whose refresh token is REVOKED server-side ('invalid_grant: Refresh token has been revoked'). Fixes are operator-only (browser login). Built scripts/propagate-hermes-fleet-auth.mjs to copy one re-authed profile's auth.json to the rest (token-blind, dry-run default, per-target backups)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.607Z
aliases: reference_hermes_per_profile_auth_creds_2026_06_26
---


2026-06-26 slot:bravo. Operator: "fix hermes cli credentials -- not logged into my Nous subscription + the grok api key isn't working."

## Hermes auth is PER-PROFILE (key architectural fact)
The 21-slot fleet launcher (`LAUNCH-HERMES-FLEET.bat` -> `hermes profile create <slot> --clone`) gives each slot its OWN credential store at `C:\Users\wompu\AppData\Local\hermes\profiles\<slot>\auth.json` (NOT a shared top-level one; the top-level `auth.json` is separate). So logging in / re-authing in one profile does NOT fix the others. The active CLI profile is in `C:\Users\wompu\AppData\Local\hermes\active_profile` (was `zulu`).

## Live state (from `node scripts/propagate-hermes-fleet-auth.mjs --list`, token-blind)
- **`bravo`**: active_provider=**nous**, nous=yes, pool=7, 19.7KB -> the ONLY profile logged into the operator's paid Nous subscription.
- **`zulu`** (the CLI default): active_provider=xai-oauth, nous=no.
- **other 19**: active_provider=xai-oauth, nous=no.
- So `hermes` (bare CLI, profile=zulu) reports "Nous not logged in" even though bravo IS -- a profile-default issue, not a missing Nous sub.

## Why "grok api key not working"
`hermes status` -> xAI OAuth error: `xAI token refresh failed. Response: {"error":"invalid_grant","error_description":"Refresh token has been revoked"}`. The Grok access was OAuth (no API key set: "xAI / Grok (not set)"), and the refresh token is **revoked server-side** -> dead in ALL 21 profiles including bravo. `active_provider=xai-oauth` across 20/21 means they default to the dead Grok. Model routing still works via Ollama (config model gpt-oss:120b / Custom endpoint), so the agent runs; only the Grok provider is dead.

## Fixes = OPERATOR-ONLY (browser logins; Claude cannot enter credentials; flows are TTY-guarded)
- **Nous**: `hermes portal` (or desktop app -> Settings -> Providers) -- already authed in bravo, so alternatively point the CLI default at a Nous-authed profile.
- **Grok**: `hermes auth add xai-oauth` (re-authorize; clears the revoked token).
- **Propagate fleet-wide** (after one profile is re-authed): `node scripts/propagate-hermes-fleet-auth.mjs --from <slot> --apply` -- copies that profile's auth.json to the other 20 (backs each up first, token-blind). CAVEAT: sharing one Nous session across 21 concurrent agents may trip the sub's concurrent-session / rate limits -- confirm the plan allows it before fleet-wide propagation.

## Lessons
1. Hermes fleet auth is per-profile -- a single login does not fix the fleet; either propagate the auth.json or log in per profile.
2. "Not logged in" in the CLI can mean the ACTIVE profile lacks the credential even though another profile has it -- check `active_profile` + per-profile `auth.json` (use the --list tool, never print token values).
3. A revoked OAuth refresh token is server-side -- it is dead in every profile/copy and only a fresh re-auth fixes it; copying won't.
4. Tool: `scripts/propagate-hermes-fleet-auth.mjs` (dry-run default, `--list`/`--from <slot> [--apply]`/`--only`). Related: [[reference_hermes_ipv6_boot_hang_fix_2026_06_26]] (same session: IPv6 boot-hang fix), [[reference_hermes_app_launch_fix_cred_pool_2026_06_12]] (credential-pool architecture).
