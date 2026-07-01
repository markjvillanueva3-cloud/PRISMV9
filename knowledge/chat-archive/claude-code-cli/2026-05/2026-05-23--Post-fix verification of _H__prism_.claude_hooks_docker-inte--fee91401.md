---
type: "chat-session"
source: "claude-code-cli"
session_id: "fee91401-5f86-4444-8674-45a388dac493"
title: "Post-fix verification of `H:\\prism\\.claude\\hooks\\docker-intel-autostart.mjs` (29"
date: "2026-05-23"
first_ts: "2026-05-23T15:51:42.037Z"
last_ts: "2026-05-23T15:58:26.319Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 8
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/fee91401-5f86-4444-8674-45a388dac493/subagents/agent-ade0b1122bc7f9089.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Post-fix verification of `H:\prism\.claude\hooks\docker-intel-autostart.mjs` (29

> **claude-code-cli** | 2026-05-23 | 22 msgs (8 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fee91401-5f86-4444-8674-45a388dac493/subagents/agent-ade0b1122bc7f9089.jsonl`

## Transcript

### User | 2026-05-23T15:51:42.037Z

Post-fix verification of `H:\prism\.claude\hooks\docker-intel-autostart.mjs` (298 lines, just edited).

**Your prior review concluded PASS with P1 doctrine remediation required.** Verify the doctrine fix landed + check whether the operator's subsequent fixes introduced any regression.

**Doctrine fix to verify:**
- P1.A (dead-code-unwired) — hook should now be wired in `C:/Users/wompu/.claude/settings.json` SessionStart matcher-0 chain at position 11. Verify by reading the settings.json and grep for `docker-intel-autostart`. Confirm:
  - Position 11 (after `nim-autostart.mjs` at position 10).
  - Command shape matches sibling pattern: `"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/docker-intel-autostart.mjs`.
  - timeout: 5000 (matches other T1 SessionStart hooks).
  - `c-to-h-mirror` will replicate to `H:/.claude/settings.json` on next mirror-fire (do NOT verify replication directly — that's the mirror hook's job).

**Other fixes to verify don't introduce regression:**
- P1.B (first-run latency) — docstring should now state realistic first-run pull cost (~1.5GB, 5-15min). Verify.
- P2.B (compose-config validation) — new `composeConfigValid()` function + `config-invalid` sentinel status. Verify:
  - Function uses `docker compose -f docker-compose.yml -f docker-compose.intel.yml config --quiet` with the same timeout pattern as the other probes.
  - main() calls it AFTER `ensureVolumeDirs()` (volumes must exist or config might warn) and BEFORE `detachComposeUp()` (the whole point is pre-spawn validation).
  - `config-invalid` is in `THROTTLE_BY_STATUS` with 1m throttle (fail-loud + retry-soon).
- P1-1 (status-aware throttle) — operator implemented this from reviewer A's design. Verify the status table is sensible:
  - `already-running`: 1h (daemon-verified) — high trust
  - `up`: 5m (spawn launched, not verified) — low trust, re-probe soon
  - `docker-down`: 1m (re-probe after Docker Desktop starts) — addresses your P2.A concern
  - `config-invalid` + `error`:
... [+1171 chars truncated]

### Assistant | 2026-05-23T15:52:12.042Z

I'll perform a focused regression-detection pass on the doctrine fixes.

### Assistant | 2026-05-23T15:52:12.705Z

[tool_use: Read]

### User | 2026-05-23T15:52:36.276Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * docker-intel-autostart.mjs — Auto-start the PRISM intel-stack containers
5	 * (Qdrant + Ollama + nomic-embed-text preload) on every SessionStart.
6	 *
7	 * The intel stack is the embedder+vector backbone for PRISM's RAG +
8	 * tribal-search + memory-recall surface. When it's down, those surfaces
9	 * silently fall back to BM25-only / no-recall — degra
... [+13882 chars truncated]

### Assistant | 2026-05-23T15:52:40.541Z

Now let me verify the settings.json wiring:

### Assistant | 2026-05-23T15:52:42.834Z

[tool_use: Bash]

### User | 2026-05-23T15:53:34.380Z

[tool_result] Exit code 1
[eval]:1
const s=require('C:/Users/wompu/.claude/settings.json'); const ss=s.hooks.SessionStart; const m0=ss.find(x=>x.matcher==='*'); m0.hooks.forEach((h,i)=>console.log(i+':',h.command.slice(0,140),'| timeout:',h.timeout))
                                                                                                                                 ^

TypeError: Cannot read prop
... [+372 chars truncated]

### Assistant | 2026-05-23T15:53:42.666Z

[tool_use: Bash]

### User | 2026-05-23T15:54:49.816Z

[tool_result] === matcher "" idx 0 ===
2: "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/session-start-terminal-pin.mjs | timeout: 5000
10: "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/nim-autostart.mjs | timeout: 5000
11: "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/docker-intel-autostart.mjs | timeout: 5000
=== matcher "compact" idx 1 ===
=== matcher "clear" idx 2 ===
=== matcher "sta
... [+15 chars truncated]

### Assistant | 2026-05-23T15:54:54.897Z

Wiring confirmed at matcher-0 (empty-string matcher, which is the `*`/default chain), position 11, immediately after `nim-autostart.mjs` at position 10, with timeout 5000 — exactly matching the spec.

Now let me check whether the timeout 5000 is large enough given the worst-case probe cost:

### Assistant | 2026-05-23T15:55:00.109Z

[tool_use: Bash]

### User | 2026-05-23T15:55:35.094Z

[tool_result] Hot path worst-case  (already-running): 6000 ms
Cold path worst-case (cold spawn):     11000 ms
Wiring timeout:                       5000 ms
Cold-path EXCEEDS wiring timeout by:   6000 ms

### Assistant | 2026-05-23T15:55:39.979Z

Confirmed regression. Let me verify there's no compensating fast-fail behavior I'm missing — `spawnSync` with `timeout` does kill the subprocess, but the harness wiring `timeout: 5000` is a separate ceiling on the hook process itself. Let me also enumerate other regression checks:

### Assistant | 2026-05-23T15:55:51.042Z

[tool_use: Bash]

### User | 2026-05-23T15:56:17.505Z

[tool_result] writeSentinel literal calls: [ 'docker-down', 'already-running', 'config-invalid' ]
writeSentinel dynamic calls: [ 'status', 'launched ? "up" : "error"' ]
Statuses in THROTTLE_BY_STATUS table: [ 'already-running', 'up', 'docker-down', 'config-invalid', 'error' ]
All literal statuses present in throttle table.

Knobs found: [
  'PRISM_DOCKER_INTEL_AUTOSTART_DISABLE',
  'PRISM_DOCKER_INTEL_AUTOSTART
... [+244 chars truncated]

### Assistant | 2026-05-23T15:56:21.762Z

Acknowledged — proceeding without RTK since this is a one-shot node eval with bounded output, not a verbose-output command.

### Assistant | 2026-05-23T15:56:29.348Z

[tool_use: Bash]

### User | 2026-05-23T15:57:24.452Z

[tool_result] dockerAvailable NOT FOUND
containersUp NOT FOUND
composeConfigValid NOT FOUND

parseMs calls: [
  {
    env: 'PRISM_DOCKER_INTEL_AUTOSTART_TIMEOUT_MS',
    def: 'DEFAULT_PROBE_TIMEOUT_MS'
  },
  {
    env: 'PRISM_DOCKER_INTEL_AUTOSTART_CONTAINER_PROBE_TIMEOUT_MS',
    def: 'DEFAULT_CONTAINER_PROBE_TIMEOUT_MS'
  },
  {
    env: 'PRISM_DOCKER_INTEL_AUTOSTART_CONFIG_TIMEOUT_MS',
    def: 'DEFAULT_COM
... [+203 chars truncated]

### Assistant | 2026-05-23T15:57:35.435Z

[tool_use: Bash]

### Assistant | 2026-05-23T15:57:29.067Z

Task list is stale relative to this regression-pass — the P13-U02 unit was already completed in the prior turn. I'll proceed without TaskCreate calls since this is a single-shot review. Regex escaping ate the function/const matches — switching to a simpler grep:

### User | 2026-05-23T15:57:52.768Z

[tool_result] --- DEFAULT_THROTTLE_MS refs:
  85 const DEFAULT_THROTTLE_MS = 60 * 60 * 1000; // 1h fallback
 224     const statusThrottle = THROTTLE_BY_STATUS[sentinel.lastStatus] ?? DEFAULT_THROTTLE_MS;
--- DEFAULT_PROBE_TIMEOUT_MS refs:
  86 const DEFAULT_PROBE_TIMEOUT_MS = 3000;
 232   const probeTimeout = parseMs("PRISM_DOCKER_INTEL_AUTOSTART_TIMEOUT_MS", DEFAULT_PROBE_TIMEOUT_MS);
--- DEFAULT_CONTAINER_PRO
... [+2288 chars truncated]

### Assistant | 2026-05-23T15:58:26.319Z

All probes correctly thread `timeoutMs`. All 4 default constants are referenced exactly once each. All sentinel statuses (`docker-down`, `already-running`, `up`, `error`, `config-invalid`) appear in `THROTTLE_BY_STATUS`. No unreachable code (every `return emit(...)` ends a branch).

Now the critical regression: confirm the wiring timeout vs worst-case probe budget.

---

## VERDICT: FAIL

One real regression introduced by the doctrine fixes. Doctrine fixes themselves all landed correctly — the failure is in the wiring timeout interacting with the new compose-config probe.

### F1 (P0) — Wiring `timeout: 5000` is below worst-case cold-path probe budget

**Location:** `C:\Users\wompu\.claude\settings.json` SessionStart matcher-0 chain, position 11
**Evidence:** Worst-case cold path under default knobs: `dockerAvailable` 3000ms + `containersUp` 3000ms + `composeConfigValid` 5000ms = **11000ms — exceeds the 5000ms wiring ceiling by 6000ms**.

What actually happens:
- Hot path (`already-running`): info(≤3s) + ps(≤3s) = 6s — *also* exceeds 5s, but only matters when Docker is misbehaving (probes hit their internal `spawnSync` timeouts).
- Cold path (`docker-down`/`config-invalid`/`up`): + composeConfigValid 5s = 11s worst case.

In practice the probes typically return in 100-500ms each, so this won't bite under nominal conditions. But under any Docker Desktop wedge (which is *precisely* what this hook is designed to detect via `docker-down`), the harness will SIGTERM the hook mid-probe, the sentinel will NOT be written, and the next SessionStart will pay the same 5s tax again — defeating the throttle-on-`docker-down` design (the 1m re-probe never gets to record `docker-down` to begin with).

**Fix (pick one):**
- (a) Raise the wiring timeout to `12000` (4 probes worst-case + 1s slack). Other SessionStart hooks at 5000 don't spawn Docker — `docker info` on a wedged daemon is the slowest external dep in the chain. Precedent: this would still be in family with other I/O-heavy
... [+2511 chars truncated]
