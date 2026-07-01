---
title: Hermes CLI/fleet "won't launch" = broken IPv6 + IPv6-first auth call (SYN_SENT hang); fix = prefer-IPv4. Plus stranded-update finish.
tags: [hermes, cli, fleet, ipv6, networking, syn_sent, prefixpolicy, hang, update, venv, bravo]
created: 2026-06-26
slot: bravo
related:
  - hermes-desktop-relaunch-skips-failed-venv-recreate-2026-06-26
  - hermes-desktop-app-dead-venv-deps-and-full-rebuild-2026-06-25
memory: reference_hermes_ipv6_boot_hang_fix_2026_06_26
---

# Hermes CLI + 21-slot fleet "won't launch" (2026-06-26, slot:bravo)

Operator: "hermes cli wont load" + "i tried launching the hermes fleet with the file on my desktop... they're not launching" + "fix the hermes update, i dont think it finished."

Two independent faults, both resolved:

## Fault 1 — stranded `hermes update`
`hermes --version` said "64 commits behind" while `git -C hermes-agent status -b` showed `+0/-0` (tree current). The update had pulled the code but its **venv stage kept failing** ("Hermes is still running. Close all Hermes windows" / "`_http_parser.pyd: Access denied`") because running venv-bound processes held the locks. **Fix:** stop every process whose path/cmdline matches `hermes-agent\venv` (keep the **uv-python** `:8645` proxy — it doesn't lock the venv), then `venv\Scripts\python.exe -m pip install -e .` (non-destructive; tree current + `requires-python` unchanged → no destructive recreate needed). Result: `hermes --version` → **"Up to date."**

## Fault 2 — the real "won't launch": BROKEN IPv6 (the hard one)
`hermes --version`/`--help` worked, but `hermes status`, `doctor`, `--cli -z`, and every `hermes -p <slot>` fleet tab **hung forever** — robust across `--safe-mode`/`--ignore-user-config`. The CLI binary is fine; the runtime *boot* hangs.

### Diagnosis that nailed it — inspect the hung process's TCP connections
Run the hung command as a child of a known PID, wait ~10s, then:
```
Get-NetTCPConnection -OwningProcess <pid>   # walk the child tree too
```
The hung child had exactly one connection: **`SynSent -> [2606:4700:4400::6812:29f1]:443`** — a TCP handshake to a **Cloudflare IPv6** address that never gets a SYN-ACK. Confirmed IPv6 is globally dead here (even `2606:4700:4700::1111:443` HANG/FAILs) while IPv4 works (`1.1.1.1:443` OK; `git fetch` over HTTPS worked). Hermes's boot fetches `https://hermes-agent.nousresearch.com/...`, which **resolves IPv6-first** (Cloudflare dual-stack), tries IPv6 → SYN_SENT hang → **no happy-eyeballs / no connect-timeout fallback to IPv4** → the whole boot blocks. (Tailscale adapter present + an IPv6 default route via a link-local nexthop — IPv6 advertised but not routable.)

### Fix — prefer IPv4 (system-wide, immediate, reversible, no reboot)
```
netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 60 1
```
Raises IPv4-mapped addresses to precedence 60 (above `::/0`=40) so `getaddrinfo` returns IPv4 first. Immediately after: `[System.Net.Dns]::GetHostAddresses('hermes-agent.nousresearch.com')` returns IPv4 first, `hermes status` **completes**, the agent boot returns a real response, and `LAUNCH-HERMES-FLEET.bat` brings up all 21 slots. Revert with `netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 35 4` (original) or `netsh int ipv6 reset`. IPv6 stays enabled, so Tailscale is unaffected.

## Lessons
1. **A CLI that `--version`-works but hangs on real commands is a network/init hang, not a PATH problem.** Don't stop at "the binary resolves."
2. **To find a boot hang's cause: read the hung process's TCP connections** (`Get-NetTCPConnection -OwningProcess`, walk children). A `SynSent` to an IPv6 address = broken IPv6 + no IPv4 fallback. This beats guessing at config/auth.
3. **Broken-IPv6 hangs any app that resolves a dual-stack host IPv6-first without happy-eyeballs.** The fleet-wide fix is `netsh ... prefixpolicy ::ffff:0:0/96 60 1` (prefer IPv4), reversible, no reboot — not disabling IPv6 (which can break Tailscale/VPN).
4. Disambiguate the faults: a stranded *update* (venv lock) and a *boot hang* (IPv6) look like one "Hermes broken" but need different fixes.
5. The fleet model: `LAUNCH-HERMES-FLEET.bat` → 21 `hermes -p <slot>` TUIs (one isolated profile each under `%LOCALAPPDATA%\hermes\profiles\<slot>`). Booting a `-p` slot does NOT run inference, so it's fast; first *message* triggers the model (gpt-oss:120b) load.
