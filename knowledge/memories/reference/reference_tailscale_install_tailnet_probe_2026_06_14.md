---
name: tailscale-install-tailnet-probe-2026-06-14
description: 2026-06-14 (slot:bravo) — installed Tailscale 1.98.4 (operator "install missing programs") + shipped a read-only tailnet-probe foundation (U-TAILNET-PROBE 1f4dbf635a). Mesh-control DEFERRED pending operator `tailscale up` login + 2nd host + governance. winget is NOT available on this host.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.217Z
aliases: reference_tailscale_install_tailnet_probe_2026_06_14
---


2026-06-14 (slot:bravo, AGENTIC-SUBSTRATE-BRIDGE Task #6) — operator directive "if were missing programs and app, install them".

## Installed
- **Tailscale 1.98.4 (amd64)** at `C:/Program Files/Tailscale/tailscale.exe`. Was absent (not on PATH, not in installed-apps). Installed from the OFFICIAL MSI `https://pkgs.tailscale.com/stable/tailscale-setup-1.98.4-amd64.msi` (URL verified against the live stable index -- a WebFetch first hallucinated a `/windows/` path segment that 404'd; R12: verify URLs, don't trust a guessed one) via elevated `msiexec /quiet /norestart` (this Claude Code shell runs ELEVATED/admin -> no UAC hang). Verified: exit 0, `tailscale version` = 1.98.4.
- **State: LOGGED OUT.** `tailscale status` -> "Logged out. Log in at: https://login.tailscale.com/a/...". `tailscale up` + browser auth to the OPERATOR's tailnet account is the operator's step (an agent cannot auth to their account).

## Host facts (relevant for future installs)
- **winget is NOT available** on DESKTOP-N7MI1VB (Get-Command winget -> not found). To install software here: download the official MSI/EXE + `msiexec /quiet` (works because the shell is elevated). Docker (29.4.3), Ollama (service), Node (portable), Python (portable) are present.

## Shipped (commit 1f4dbf635a)
- `scripts/tailnet-probe.mjs` -- STRICTLY READ-ONLY tailnet detector (only command: `status --json`; never any control verb -- soul refuse_list: unsafe-fleet-control-before-governance). execFileSync (no shell) + fixed args = no injection surface. Fail-soft (missing -> installed:false; unparseable -> healthy:false). Pure DI-tested helpers (parseTailscaleStatus/findTailscaleBin/probeTailnet/formatProbe). 7 R9 tests, 2/2 per-file scrutiny PASS (both empirically reverted guards + confirmed read-only).

## Deferred (R15/R12 -- can't validate now, NOT under-delivery)
The `prism_fleet_network` mesh-CONTROL dispatcher is deferred: you cannot validate control ops against a logged-out, peerless tailnet, and the soul forbids fleet-control before governance. It needs: operator `tailscale up` login + a 2nd host joining + governance. When built it consumes `probeTailnet` (forward-compatible foundation -- same probe reports self+peers the instant login+2nd-host happen, zero code change).

-> [[reference_agentic_substrate_bridge_2026_06_14]] · [[feedback_harness_only_tools_wall_2026_06_14]]
