---
title: Windows cp.spawn(extensionless shim) ENOENTs ASYNC -> silent dead spawn (the recurring octopus-drain stall)
slug: windows-cp-spawn-extensionless-shim-enoent-2026-06-23
galaxy: hermes-zulu
slot: zulu
created: 2026-06-23
tags: [windows, cp.spawn, ENOENT, portable-node, stop-hook, octopus, consensus-drain, silent-failure, R12, false-validation, recurrence]
---

# Windows cp.spawn(extensionless shim) ENOENTs ASYNC -> silent dead spawn

Root-caused + fixed a **recurring multi-day octopus-consensus-drain stall** (`U-DRAIN-SPAWN-ENOENT`, commit on cad-fusion-live-ms0). The bug class is transferable to ANY Node hook/script that spawns a process on Windows.

## The bug class

`H:/.claude/bin/portable-node` is an **extensionless** executable (a bash shebang script + a sibling `portable-node.cmd`). It works when invoked from **Git Bash** (shebang) or a **settings.json `command` string** (the harness runs those through a shell, which resolves it via the `.cmd`). But:

```js
import { spawn } from "node:child_process";
spawn("H:/.claude/bin/portable-node", [script, "--max=1"], { detached: true, stdio: "ignore" });
```

`child_process.spawn` (without `shell:true`) calls Win32 `CreateProcess`, which **cannot execute a file with no `.exe`/`.cmd` extension** -> **`ENOENT`**. Critically, that error is delivered **asynchronously** as an `'error'` event on the child — NOT a synchronous throw. So a `try { spawn(...) } catch {}` around the call **never sees it**. With `stdio:"ignore"` and the hook process exiting immediately, the failure vanishes completely: the hook reports "spawned", nothing runs, no trace.

## Why it RECURRED (the false-validation trap)

The drain stalled, was "fixed", and stalled again across 06-17 / 06-19 / 06-21 — each ~2 days. The 06-19 fix re-wired the (genuinely-orphaned-then) Stop hook into settings.json and validated by running `echo '{}' | node stop-consensus-drain.mjs` -> `{"continue":true,"systemMessage":"...spawned"}`. **That only proves the hook RETURNS "spawned" — never that a processed record appeared.** Every drain record in the queue's processed log was actually a **manual shell-resolved run during the investigation itself**; the autofire hook never once worked. A symptom that recurs after a fix means the fix addressed a *different* mechanism (or none) — enumerate every path and verify the OUTCOME (the side-effect), not the launch.

## The fix

- **Spawn `process.execPath`** (the real node.exe already running the hook — always a spawnable binary, the same `H:/Tools/nodejs/node.exe` the `.cmd` resolves to), never the shim. Resolver:
  ```js
  export function resolveNodeBin(execPath = process.execPath, existsImpl = fs.existsSync) {
    if (execPath && /(^|[\\/])node(\.exe)?$/i.test(execPath) && existsImpl(execPath)) return execPath;
    for (const p of ["H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe"]) if (existsImpl(p)) return p;
    return execPath;
  }
  ```
  **Basename-anchor the guard** `/(^|[\\/])node(\.exe)?$/i` — a bare `/node(\.exe)?$/` FALSE-matches `portable-node` (it ends in "node"), re-arming the bug (caught by 3-of-3 P1; both arms).
- **Tee the detached child's stdout/stderr to an append log** (was `stdio:"ignore"`) so the *next* failure is diagnosable in seconds, not days (R12 fail-loud).
- This is a **fleet-wide bug class**: `docker-hook-broker.mjs` FALLBACK_BIN defaulted to the same shim (its own test already overrode to `process.execPath`, proving it broken); `stop-bg-runner.mjs` carried a dead `NODE_BIN = shim` const. Audit with: grep for `spawn(...portable-node` without `.cmd`/`shell:true`. Settings.json `command` strings are SAFE (shell-resolved); only `cp.spawn`/`spawnSync`/`execFile` targets are at risk.

## Detection (so it can't silently recur)

`reconcile-zulu-ledger.mjs`'s octopus meta-utilization probe (`U-ZLR-META-UTIL`) now grades the drain `UNDER-UTILIZED` once the newest `drained_at` is >48h old — turning a silent multi-day stall into a surfaced verdict. Detection (reconciler) + diagnosis (drain log) + the spawn fix together close the loop. Related: [[meta-systems-utilization-truth-harness-2026-06-22]] · memory [[reference_octopus_drain_unwired_fix_2026_06_19]] · [[reference_zulu_meta_systems_utilization_probe_2026_06_22]].

## Sibling: bare `spawnSync("node", ...)` ENOENTs by PATH (not by extension) — `U-BARE-NODE-SPAWN-FIX` 2026-06-23

Same family, different mechanism. The shim case above ENOENTs because an **extensionless explicit path** can't be `CreateProcess`'d. The bare-`"node"` case ENOENTs because **`node` is not on the hook child's PATH**: the harness runs hooks via portable-node, and the spawned child's PATH has no resolvable `node`. Confirmed live on this host: `spawnSync("node", ["--version"])` → `ENOENT` **even with the full current PATH**, while `spawnSync(process.execPath, ...)` → status 0. (Memory [[reference_precompact_bare_node_enoent_2026_05_16]] records this class once broke `/compact`→precompact for the operator.)

Both cases share the **silent-degradation shape**: the spawn is usually inside a fail-soft `try/catch` (advisory hook), so the ENOENT is swallowed and the hook's function simply never runs — no error, no trace. A 2026-06-23 fleet sweep found **10 bare-`"node"` spawns across 7 core hooks/helpers** (forced-handoff append, PSN-tick, session-id resolution, mistake-digest, tier1-refresh, commit-pressure relief, the cross-PC installer) all silently failing; all fixed to `process.execPath`.

**The one fix for the whole class:** spawn **`process.execPath`** (the real running node.exe — always a spawnable binary, no PATH/extension dependency), never a bare `"node"` and never the extensionless `.../bin/portable-node` shim. `portable-node.cmd` would need `shell:true` on modern Node. **Audit the class with two greps:** `spawn.*portable-node` (without `.cmd`/`shell:true`) AND `(spawn|spawnSync|execFile|execFileSync)\(\s*["']node["']` — both are the same "Windows spawn ENOENT, silently swallowed" bug. settings.json `command` strings are SAFE (shell-resolved); only `cp.*` JS spawn targets are at risk.
