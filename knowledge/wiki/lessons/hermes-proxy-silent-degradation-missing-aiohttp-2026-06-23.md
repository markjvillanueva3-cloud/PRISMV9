---
title: Hermes proxy silently dead (missing aiohttp) -> all ask-hermes degraded to ollama for >48h
slug: hermes-proxy-silent-degradation-missing-aiohttp-2026-06-23
galaxy: hermes-zulu
slot: zulu
created: 2026-06-23
tags: [hermes, ask-hermes, proxy, aiohttp, silent-degradation, stdio-ignore, R12, fail-loud, keepalive, scheduled-task, octopus-drain-sibling]
---

# Hermes proxy silently dead (missing aiohttp) -> ask-hermes degraded to ollama

Root-caused + fixed (`HERMES-BRIDGE-MS0/U-HERMES-PROXY-FAILLOUD`, commit on cad-fusion-live-ms0) a **silent multi-day degradation of the Hermes offload lane** — the operator's named "improve hermes utilization" goal. Sibling of the octopus-drain silent-spawn bug ([[windows-cp-spawn-extensionless-shim-enoent-2026-06-23]]): same fail-loud lesson, different mechanism.

## The symptom -> root cause chain

1. `reconcile-zulu-ledger.mjs`'s meta-utilization probe flagged **hermes UNDER-UTILIZED** ("no ask-hermes activity recorded" in the last 48h — the recency gate working as designed; the 858 lifetime calls were all >48h stale).
2. Probed the proxy at `127.0.0.1:8645` -> **ECONNREFUSED** on every endpoint. Nothing listening.
3. The `PRISM Hermes Proxy` scheduled task (runs `hermes-proxy-ensure.mjs --provider xai --port 8645`) **existed and was Ready** but had been failing **`LastTaskResult=3`** (the ensure script's "down and couldn't start/confirm" code) for hours. So the keepalive *was* firing — and *was* failing — every cycle.
4. The detached `hermes proxy start` spawn used **`stdio:"ignore"`**, which SWALLOWED the proxy's own startup error. Running the exact command in the FOREGROUND revealed it: **`hermes proxy requires aiohttp`** — a missing python dependency in the hermes venv. NOT an OAuth/credential issue (the trap to assume).

## The fix

- **Install the missing dep** into the hermes venv: `pip install aiohttp` (the hermes-agent's own declared `[messaging]` extra; restoring intended function, not adding a new library). Proxy then binds in ~1s. Validated end-to-end: `ask-hermes ask` returned `source:"hermes", model:"grok-4.20-0309-non-reasoning"` — real xAI Grok inference, NOT the ollama fallback.
- **Fail-loud the keepalive (the committed, recurrence-preventing fix):** `hermes-proxy-ensure.mjs` now **tees the detached proxy's stdout/stderr to an append log** (`PRISM_HERMES_PROXY_LOG`, default `state/shared/hermes-proxy-start.log`) instead of `stdio:"ignore"`. The next "won't start" (missing dep, port conflict, expired token) is diagnosable in seconds instead of foreground archaeology. Two pure helpers `resolveStartLogPath` + `buildStartStdio` (`["ignore",fd,fd]` tee, `"ignore"` fallback when log-open fails so logging never blocks the keepalive; fd-0 guarded via `typeof===number`).

## The transferable lessons

- **A keepalive that spawns a child with `stdio:"ignore"` is a silent-failure factory.** When the child fails to start, the keepalive reports only a generic timeout/exit-code; the real reason (a one-line dep error here) is lost. ALWAYS tee a detached service-start child's output to a log — the same R12 fail-loud rule as the octopus consensus-drain.
- **"Lane is UNDER-UTILIZED" can mean the lane is DEAD, not idle.** Don't assume a quiet substrate is legitimately quiet; probe whether it's even *available*. The graceful `ask-hermes -> ollama` fallback is exactly what HID the dead proxy: nothing errored, work just silently got cheaper-and-weaker.
- **Don't assume credentials.** A proxy that won't bind looks like an expired-OAuth problem (operator-only). Capture the actual stderr first — here it was a trivial missing pip dep, fixable without touching any credential.
- **The parent `closeSync(logFd)` right after a detached spawn is SAFE** — libuv dup's the fd into the child at spawn time; proven idiom in `daemon-supervisor.mjs` + `hermes-control-bridge.mjs`. Comment it so a future maintainer doesn't "fix" it into a leak.

Memory: [[reference_zulu_meta_systems_utilization_probe_2026_06_22]]. Related: [[windows-cp-spawn-extensionless-shim-enoent-2026-06-23]] (the octopus-drain sibling), [[reference_hermes_bridge_operational_2026_06_17]].
