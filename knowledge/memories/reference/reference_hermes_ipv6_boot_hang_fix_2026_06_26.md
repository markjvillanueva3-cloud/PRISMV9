---
name: reference_hermes_ipv6_boot_hang_fix_2026_06_26
description: "Hermes CLI/fleet 'won't launch' (2026-06-26) root cause = BROKEN IPv6: the runtime boot fetches a Cloudflare-fronted Nous endpoint that resolves IPv6-first, IPv6 is dead on this box, and Hermes has no IPv4 fallback -> SYN_SENT hang on every hermes status/doctor/-z/-p boot. Fix = prefer IPv4 via `netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 60 1` (immediate, reversible, no reboot). Diagnosed via Get-NetTCPConnection showing SynSent to an IPv6 Cloudflare addr. Also finished a stranded hermes update via pip install -e . after quiescing venv-locking procs."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.605Z
aliases: reference_hermes_ipv6_boot_hang_fix_2026_06_26
---


2026-06-26 slot:bravo. Operator: "hermes cli wont load" + "the hermes fleet... aren't launching" + "fix the hermes update, i dont think it finished." Two faults:

**Fault 1 — stranded `hermes update`:** tree was already current (`git -C hermes-agent status -b` = `+0/-0` vs origin/main) but `hermes --version` said "64 commits behind" because the update's venv reinstall never finished ("Hermes is still running" / locked `.pyd`). Fix: stop every proc whose path/cmdline matches `hermes-agent\venv` (KEEP the uv-python :8645 proxy — it doesn't lock the venv), then `venv\Scripts\python.exe -m pip install -e .`. → `hermes --version` = "Up to date." Non-destructive (no venv recreate; `requires-python >=3.11,<3.14` unchanged). See [[reference_hermes_app_relaunch_fix_2026_06_26]].

**Fault 2 — the real "won't launch" = BROKEN IPv6 (hard to find):** `hermes --version`/`--help` work, but `hermes status`/`doctor`/`--cli -z`/`hermes -p <slot>` (the 21 fleet tabs) all HANG forever — even with `--safe-mode`/`--ignore-user-config`. **Diagnosis:** run the hung command, `Get-NetTCPConnection -OwningProcess <pid>` (walk the child tree). The hung child had one connection: `SynSent -> [2606:4700:4400::6812:29f1]:443` = a Cloudflare **IPv6** handshake with no reply. IPv6 is globally dead on this box (even `2606:4700:4700::1111:443` fails) while IPv4 works (git fetch worked). Hermes boot fetches `https://hermes-agent.nousresearch.com/...` which resolves **IPv6-first**; Hermes tries IPv6, no happy-eyeballs/timeout fallback → whole boot blocks. (Box also has Tailscale + an IPv6 default route via link-local nexthop — IPv6 advertised, not routable.)

**Fix (operator chose "prefer IPv4 system-wide"):** `netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 60 1` — IPv4-mapped precedence 60 > `::/0`=40, so getaddrinfo returns IPv4 first. Immediate, no reboot, reversible (`... 35 4` restores, or `netsh int ipv6 reset`), IPv6 stays enabled so Tailscale unaffected. After: `hermes status` completes, agent `-z` returns a real response, `LAUNCH-HERMES-FLEET.bat` brought up all 21 slots (alpha..zulu), desktop relaunched.

**How to apply / lessons:** (1) A CLI that `--version`-works but hangs on real commands = network/init hang, NOT PATH. (2) To find a boot hang: read the hung process's TCP connections — `SynSent` to an IPv6 addr = broken IPv6 + no IPv4 fallback. (3) prefer-IPv4 prefixpolicy is the reversible fleet-wide fix (don't disable IPv6 outright — breaks Tailscale). (4) The launcher = `C:\Users\wompu\OneDrive\Desktop\LAUNCH-HERMES-FLEET.bat` → 21 `hermes -p <slot>` TUIs (isolated profiles under `%LOCALAPPDATA%\hermes\profiles\<slot>`); booting a slot doesn't run inference (fast), first message loads gpt-oss:120b. Config primary model = gpt-oss:120b (131K ctx); Hermes requires >=64K context (a 32K model is rejected at run, not boot).
