---
name: reference-mcp-connectivity-check-wire-2026-05-24
description: Wired existing-but-unwired mcp-connectivity-check.mjs hook into UserPromptSubmit chain so every chat gets an auto-banner if :3100 is down at turn-start. Avoided shipping a duplicate (mcp-connectivity-inject.mjs draft was deleted after pre-write graph context surfaced the existing hook). The well-built T2 injector (8.3K + companion test, pure helpers, 30s throttle, faster recovery re-probe, operator-facing restart instructions in banner) existed since at least 5/19 but was never in settings.json.
metadata:
  type: reference
---

# MCP connectivity check — wired into UserPromptSubmit (2026-05-24, slot:kilo)

## User directive

> "can we have a cheap way to enforce chats to check whether or not they're connected to the mcp server before they do anything so i don't have to constantly check every turn"

## What was done

Wired the already-built `mcp-connectivity-check.mjs` hook into `C:/Users/<u>/.claude/settings.json` UserPromptSubmit chain (auto-mirrored to `H:/.claude/settings.json` by `c-to-h-mirror`).

Insertion point: directly after `master-index-precheck-inject.mjs`. Timeout: 2000ms (probe budget 1000ms + parsing).

## R8 / dedup save

Pre-write graph context fired on the draft asset name `mcp-connectivity-inject.mjs` and surfaced 3 related nodes including `mcp-connectivity-check`. A 1-line `ls .claude/hooks/ | grep mcp` confirmed:

```
mcp-connectivity-check.mjs       8.3K   ← EXISTING
mcp-connectivity-check.test.mjs  7.8K   ← EXISTING TEST
mcp-connectivity-inject.mjs      5.1K   ← MY DUPLICATE (deleted, never committed)
```

The existing hook is BETTER along every dimension:
- T2 tier frontmatter
- Companion vitest with pure-helper exports
- 30s default throttle + faster recovery re-probe when prior state was disconnect
- Operator-facing banner with EXACT restart commands
- HEAD probe (cheaper than GET) with 1s timeout
- Pure `getConfig` / `loadState` / `shouldProbe` / `probeUrl` / `buildBanner` helpers
- Atomic-write state file; tmpdir-scoped

Per R8 (read before you write) + `duplicationGuardEngine`, my draft was deleted. Going forward, every UserPromptSubmit fires the existing hook.

## Why it wasn't wired before

The hook source carries this comment:
> "@hook UserPromptSubmit  (wire FIRST in the chain so the banner lands at the top)"

Someone built it (probably in response to operator pain point quoted in the hook header: *"we get randomly kicked off sometimes"* from 2026-05-19), wrote the test, but the settings.json wiring step never happened. Sister to [[feedback_settings_wiring_drift_2026_05_16]] — the recurring "shipped + tested but never wired" pattern.

## How it works (cheap on every turn)

1. UserPromptSubmit fires the hook (timeout 2000ms; usually completes in ~30ms)
2. Throttle check: if `state.lastProbeAt` is fresh (≤30s) AND prior status was OK, skip the network probe → return `{continue:true}` instantly
3. Otherwise: HEAD `:3100` with 1s timeout
4. Healthy → silent `{continue:true}` (no banner noise)
5. Down → inject loud banner:
   ```
   🛑 MCP SERVER DISCONNECTED — every mcp__prism__* tool call will fail this turn
      URL: http://127.0.0.1:3100
      Error: ECONNREFUSED (HTTP —)

      To reconnect:
        1. Check the daemon: `node H:/prism/mcp-server/dist/index.js --port 3100`
        2. Or restart via launcher: `node H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs --services=mcp`
        3. Verify: `curl -I http://127.0.0.1:3100` returns HTTP 200/404 (not refused)

      While disconnected, fall back to direct script invocation:
        `node H:/prism/scripts/<X>.mjs` instead of `mcp__prism_*` tool calls
   ```
6. On recovery, prior-disconnect state forces fast re-probe (no 30s wait)

## Composes with the rest of the always-connected stack

| Layer | Mechanism |
|---|---|
| Watchdog mem-probe (iter 10, `8cbd06cf5a`) | Preempts before OOM |
| Supervisor heap bump (iter 9, `ee8be4fd2f`) | 4GB ceiling vs 1.5GB default |
| Bridge retry + self-heal (lima 5/22) | Masks restart window |
| Watchdog wedge probe (lima 5/22) | Catches listening-but-unresponsive |
| **THIS — UserPromptSubmit banner (iter 11)** | **Surfaces disconnect to the chat itself** |

The previous 4 layers keep the server up. This 5th layer makes the chat AWARE if those layers ever fail — closes the "silent degradation" gap the user was tired of catching manually.

## Knobs

- `PRISM_MCP_CONNECTIVITY_DISABLE=1` — skip the probe entirely
- `PRISM_MCP_CONNECTIVITY_TIMEOUT_MS=N` — probe timeout (default 1000)
- `PRISM_MCP_CONNECTIVITY_THROTTLE_SEC=N` — re-probe throttle (default 30)
- `PRISM_MCP_CONNECTIVITY_VERBOSE=1` — always emit banner even when healthy
- `PRISM_MCP_URL=...` — override URL (default http://127.0.0.1:3100)

## Verification

```
$ echo '{}' | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/mcp-connectivity-check.mjs
{"continue":true}    ← server is up, silent verdict as designed
```

## Cross-refs

- [[reference_mcp_oom_heap_bump_2026_05_23]] — supervisor heap bump (iter 9 of this session)
- [[reference_mcp_server_3100_crash_fix_2026_05_22]] — lima's bridge + supervisor fix
- [[feedback_settings_wiring_drift_2026_05_16]] — recurring "shipped + tested but never wired" pattern
- Hook source: `.claude/hooks/mcp-connectivity-check.mjs` (pre-existing, unmodified)
- Hook test: `.claude/hooks/mcp-connectivity-check.test.mjs` (pre-existing, unmodified)
- Settings wiring: `C:/Users/<u>/.claude/settings.json` UserPromptSubmit chain (auto-mirrored to H:/.claude/settings.json)
