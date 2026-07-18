---
title: Hermes CLI "not connected to my account" = per-profile auth + CLI default profile lacked the (valid, shared) Nous/Grok creds; "paid sub not working" = Nous reports no usable credits
tags: [hermes, credentials, auth, nous, xai, grok, oauth, per-profile, fleet, billing, bravo]
created: 2026-06-26
slot: bravo
related:
  - hermes-cli-fleet-boot-hang-broken-ipv6-prefer-ipv4-2026-06-26
  - hermes-app-launch-fix-cred-pool
memory: reference_hermes_per_profile_auth_creds_2026_06_26
---

# Hermes CLI "not letting me connect to my Nous/Grok account" (2026-06-26, slot:bravo)

Operator: "not logged into my Nous account I paid a subscription for + the grok api key isn't working ... not letting me connect."

## Two things that LOOK like "not connected" but are distinct
1. **Per-profile auth + wrong default.** Hermes auth is PER-PROFILE (each of 21 fleet profiles has its own `%LOCALAPPDATA%\hermes\profiles\<slot>\auth.json`). The operator's VALID Nous + xAI/Grok OAuth lived in the **`bravo`** profile (and the shared `...\hermes\shared\nous_auth.json`), but the CLI default (`active_profile` = `zulu`) did NOT have them -> `hermes status` (default) showed "Nous not logged in" + the revoked xai-oauth. So the account WAS connected, just not in the profile the bare `hermes` CLI uses. Don't conclude "not logged in" from the default profile alone -- check `hermes -p <slot> status` per profile.
2. **"Paid subscription not working" = Nous reports no usable credits.** `hermes -p bravo status` showed `Nous Portal: logged in` (valid) but a `Nous Tool Gateway` warning: *"Your Nous Portal account has no usable paid credits ... Add credits / update billing at portal.nousresearch.com/billing. If you recently bought credits, run `hermes model` to refresh."* That's a billing/account state, NOT a login failure -- Claude can't fix it; it's the operator's portal/billing or a `hermes model` refresh.

## Why "not letting me connect" when they ran the login
`hermes portal` found the existing shared creds and sat at an interactive prompt: `Found existing Nous OAuth credentials at ...\shared\nous_auth.json -- Import these credentials? [Y/n]:`. Run in a context where that prompt can't be answered, it just hangs = "won't connect." The fix is to answer Y in a real terminal -- or copy an already-authed profile's auth.json.

## Diagnosis method (network was a red herring)
After the IPv6 prefer-IPv4 fix, all Nous endpoints (portal/hermes-agent/chat/inference-api .nousresearch.com:443) connect fine. So this was NOT network -- it was profile/credential placement + billing. Confirm reachability before assuming a login flow is "broken."

## Fix applied (operator-authorized "connect my CLI")
The operator's own VALID creds existed in `bravo`. Copied `bravo`'s auth.json into the CLI default `zulu` via `scripts/propagate-hermes-fleet-auth.mjs --from bravo --only zulu --apply` (token-blind file copy, backs up the target first -- Claude never reads/enters the token). `hermes status` (default) then showed `Nous Portal: logged in`, `xAI OAuth: logged in`, model `grok-4.3 (SuperGrok/Premium+)`.

## What stays OPERATOR-ONLY
- Re-auth that requires a browser login (entering credentials).
- **Fleet-wide propagation to all 21 profiles** -- reversible, but sharing ONE Nous session across 21 concurrent agents can trip the paid sub's concurrent-session/rate limits and get the session revoked. Confirm the plan allows it before `--from <authed-slot> --apply` (all targets).
- Nous credits/billing.

## Lessons
1. "Hermes CLI not logged in" is often the ACTIVE profile lacking creds another profile already has -- auth is per-profile; check `active_profile` + per-profile `auth.json` (use the `--list` tool, never print tokens).
2. A valid login can still be unusable due to **account credits/billing** ("no usable paid credits") -- separate that from the login state; it's operator/portal territory.
3. Connect a profile by copying an already-authed profile's auth.json (token-blind, backed up) -- but treat multi-profile credential sharing as operator-only (subscription concurrency risk).
4. Tool: `scripts/propagate-hermes-fleet-auth.mjs` (`--list` / `--from <slot> [--only a,b] [--apply]`, dry-run default, per-target backups).
