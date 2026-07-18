---
type: "chat-session"
source: "claude-code-cli"
session_id: "c56f23b2-0a94-465d-8a7a-1a82bd09cf63"
title: "3-of-3 scrutiny gate — reviewer C (analyst). Weight: silent breakage, regression"
date: "2026-05-14"
first_ts: "2026-05-14T01:02:34.143Z"
last_ts: "2026-05-14T01:10:41.053Z"
cwd: "H:\\prism"
messages: 62
user_msgs: 26
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/c56f23b2-0a94-465d-8a7a-1a82bd09cf63/subagents/agent-adf72d7c7676f22ab.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# 3-of-3 scrutiny gate — reviewer C (analyst). Weight: silent breakage, regression

> **claude-code-cli** | 2026-05-14 | 62 msgs (26 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c56f23b2-0a94-465d-8a7a-1a82bd09cf63/subagents/agent-adf72d7c7676f22ab.jsonl`

## Transcript

### User | 2026-05-14T01:02:34.143Z

3-of-3 scrutiny gate — reviewer C (analyst). Weight: silent breakage, regression risk, I/O security, error-budget completeness, integration coupling.

Session: charlie-p23-u01u02. Commits f26565281 + 1a333b67f.

Files:
- H:/prism/mcp-server/src/engines/ModelTelemetryEngine.ts (new — JSONL telemetry logger)
- H:/prism/mcp-server/src/engines/ModelRoutingEngine.ts (extended — applyAdaptiveState API)
- H:/prism/scripts/adapt-router-thresholds.mjs (new — weekly cron tuner)
- H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts (+4 actions in prism_dev)
- 4 test files (ModelTelemetry / AdaptRouterThresholds / ModelRoutingEngine + appended block / devDispatcher.modelTelemetry)
- .claude/scripts/ram-orphan-monitor.ps1 (PowerShell session monitor)

Focus weight (reviewer A holistic, reviewer B integrity+wiring — you cover):
1. **Silent breakage** — could any of these changes silently break existing callers of ModelRoutingEngine.route()? The score function now uses getEffectiveLatency() instead of m.latencyMsTypical. Verify that pre-adaptation behavior is identical (effectiveLatency falls back to declared when no adaptation).
2. **Regression risk** — the JSONL parsers in coerceEntry + adapt-router-thresholds.mjs's isValidEntry must agree. Are they?
3. **I/O security** — could a maliciously crafted JSONL file cause unbounded memory consumption, prototype pollution, or path traversal? Check telemetry logger and tuner.
4. **Error-budget completeness** — does every code path handle: missing file, empty file, malformed line, partial mid-write line, file write failure, rename failure?
5. **Integration coupling** — the singleton modelTelemetryEngine reads PRISM_MODEL_TELEMETRY_PATH at construct time. If the env var changes after the server boots, what happens? Is that a real concern?
6. **PowerShell script safety** — ram-orphan-monitor.ps1 calls Stop-Process on bash processes. Could it kill the parent claude-code session (which spawns bash)? Verify the age filter (>30 min) is 
... [+1016 chars truncated]

### Assistant | 2026-05-14T01:02:38.009Z

I'll analyze the changes for silent breakage, regression risk, I/O security, error-budget completeness, and integration coupling.

### Assistant | 2026-05-14T01:02:38.760Z

[tool_use: Bash]

### User | 2026-05-14T01:02:42.403Z

[tool_result] d912739b1 [CLEANUP-MS0]/U-GIT-TREE-SWEEP-FIXUP: address 3 P0 + 8 P1 scrutiny findings on classify + watcher
1a333b67f [MAIN] [INTEL-OLLAMA-OBSIDIAN-MS0]/P23-FIXUP: missed test files
2f089effd [MAIN] [CLEANUP-MS0]/U-CLEANUP-H3: ship hook-orphan-scan.mjs
f26565281 [MAIN] [INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02: ModelTelemetryEngine + adaptive router thresholds
b9a3662fd [CLEANUP-MS0]/U-GIT-TREE-SWEE
... [+80 chars truncated]

### Assistant | 2026-05-14T01:02:44.690Z

[tool_use: Bash]

### User | 2026-05-14T01:02:49.205Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
.claude/scripts/ram-orphan-monitor.ps1             |   101 +
 .../src/__tests__/AdaptRouterThresholds.test.ts    |   413 +
 .../src/__tests__/ModelRoutingEngine.test.ts       |   130 +
 .../src/engines/CrossTerminalBroadcastEngine.ts    |    93 +-
 mcp-server/src/engines/ModelRoutingEngine.ts       |   123 +-
 mcp-server/s
... [+557 chars truncated]

### Assistant | 2026-05-14T01:02:51.904Z

The diff includes unrelated CLEANUP work. Let me focus on the P23-U01+U02 files specifically.

### Assistant | 2026-05-14T01:02:52.420Z

[tool_use: Read]

### User | 2026-05-14T01:02:52.855Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ModelTelemetryEngine.ts' was already read 21s ago in this session and is unchanged (mtime 1778718659453). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-05-14T01:02:56.176Z

[tool_use: Bash]

### User | 2026-05-14T01:03:01.290Z

[tool_result] /usr/bin/bash: line 1: :PRISM_READ_CACHE: command not found
ok

### Assistant | 2026-05-14T01:03:05.328Z

[tool_use: Bash]

### User | 2026-05-14T01:03:08.741Z

[tool_result]   519 mcp-server/src/engines/ModelTelemetryEngine.ts
  678 mcp-server/src/engines/ModelRoutingEngine.ts
  377 scripts/adapt-router-thresholds.mjs
  101 .claude/scripts/ram-orphan-monitor.ps1
 1675 total

### Assistant | 2026-05-14T01:03:11.775Z

[tool_use: Read]

### User | 2026-05-14T01:03:12.221Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ModelTelemetryEngine.ts' was already read 41s ago in this session and is unchanged (mtime 1778718659453). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-05-14T01:03:15.163Z

The read-once guard is blocking. Let me check if the file is actually in my context (the guard claims it is, but I cannot find it in this session — this is a fresh agent invocation).

### Assistant | 2026-05-14T01:03:15.948Z

[tool_use: Bash]

### User | 2026-05-14T01:03:20.253Z

[tool_result] /**
 * ModelTelemetryEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U01
 *
 * Per-call telemetry logger for LLM/Ollama invocations. Captures
 * `{ts, model, backend, taskKind, promptTokens, completionTokens, latencyMs, outcome, errorBrief}`
 * per call and persists to a JSONL store on disk. Read-side surfaces
 * (`getRecentCalls`, `getStats`) feed the adaptive-routing tuner
 * (P23-U02, `scripts/adapt-r
... [+3800 chars truncated]

### Assistant | 2026-05-14T01:03:23.358Z

[tool_use: Bash]

### User | 2026-05-14T01:03:30.181Z

[tool_result]   calls: number;
  failures: number;
  /** Failures / calls, in [0, 1]. 0 when calls=0. */
  failureRate: number;
  /** Latency percentiles (ms). */
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyMaxMs: number;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  /** Earliest entry ts in window, ISO. */
  firstSeen: string;
  /** Latest entry ts in window, ISO. */
  lastSeen: stri
... [+5700 chars truncated]

### Assistant | 2026-05-14T01:03:33.198Z

[tool_use: Bash]

### User | 2026-05-14T01:03:37.961Z

[tool_result]   }

  /**
   * Return recent entries, oldest→newest. `windowMs` filters by ts;
   * `model` filters by exact id; `limit` keeps only the *latest* N
   * entries (after filtering) — useful for tail-style dashboards.
   *
   * Reads merge `jsonlPath` AND `jsonlPath + ".1"` (the rotated tail).
   * The rotated file's entries are emitted before the live file's, so
   * the result stays in oldest→newes
... [+5923 chars truncated]

### Assistant | 2026-05-14T01:03:41.390Z

[tool_use: Bash]

### User | 2026-05-14T01:03:44.466Z

[tool_result]   /**
   * Delete the JSONL store (live, rotated `.1`, and any leftover `.tmp`).
   * Tests only — the singleton anchors at the production JSONL path; do
   * not call from a wired dispatcher action.
   */
  reset(): void {
    for (const suffix of ["", ".1", ".tmp"]) {
      const p = this.jsonlPath + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }

  // ── internals ─────────────
... [+3697 chars truncated]

### Assistant | 2026-05-14T01:03:48.491Z

Now I have a complete picture of ModelTelemetryEngine. Let me read ModelRoutingEngine.

### Assistant | 2026-05-14T01:03:49.089Z

[tool_use: Bash]

### User | 2026-05-14T01:04:44.147Z

[tool_result] /**
 * ModelRoutingEngine — Phase 0.19 U-LLM7
 *
 * Decide which LLM backend/model should service a given request so simple
 * queries take the local Ollama path (free, on-prem, fast once warm) and
 * only queries that genuinely need frontier reasoning fall back to the paid
 * Claude/OpenAI APIs. Pure scoring function: the engine does NO network I/O
 * — callers feed it request features + a live b
... [+4932 chars truncated]

### Assistant | 2026-05-14T01:04:47.724Z

[tool_use: Bash]

### User | 2026-05-14T01:05:45.590Z

[tool_result] 279: * catalog at runtime so the route() scorer/gates reflect observed reality.
303:  /** Active adaptation overrides keyed by model id. Mutated by `applyAdaptiveState`. */
317:  listModels(): ReadonlyArray<ModelSpec> {
328:  applyAdaptiveState(state: ModelAdaptiveState): void {
368:   * Return the latency the scorer + canServe gates should use for a given
372:  getEffectiveLatency(modelId: string
... [+644 chars truncated]

### Assistant | 2026-05-14T01:05:48.542Z

[tool_use: Bash]

### User | 2026-05-14T01:05:52.485Z

[tool_result]   {
    id: "gpt-5-codex",
    backend: "openai",
    paramsB: 0,
    vramGB: 0,
    qualityTier: 90,
    codeTier: 95,
    latencyMsTypical: 2200,
    inputCostUSDPer1k: 0.005,
    outputCostUSDPer1k: 0.02,
    runsOn: ["home_4080", "work_3080", "cloud_only"],
    tags: ["code", "tools"],
  },
];

/**
 * Per-model adaptation entry — produced by the P23-U02 tuner
 * (`scripts/adapt-router-threshol
... [+4808 chars truncated]

### Assistant | 2026-05-14T01:05:55.948Z

[tool_use: Bash]

### User | 2026-05-14T01:06:02.224Z

[tool_result]           `forced model ${ctx.forceModel} fails hard constraints`,
          rationale,
        );
      }
      const cost = this.estimateCost(pinned, req);
      rationale.unshift(`pinned by ctx.forceModel=${pinned.id}`);
      return {
        ok: true,
        backend: pinned.backend,
        model: pinned.id,
        rationale,
        expectedLatencyMs: pinned.latencyMsTypical,
        expec
... [+7027 chars truncated]

### Assistant | 2026-05-14T01:06:06.815Z

I notice a key issue: `route()` returns `expectedLatencyMs: winner.model.latencyMsTypical` (line 414, 445) — the **declared** latency, not the **effective** one. The scoring uses `effLatency` but the returned `expectedLatencyMs` for both the pinned and the winner uses `m.latencyMsTypical`. This is a contract bug — the rationale string also shows declared latency.

Let me continue analyzing.

### Assistant | 2026-05-14T01:06:07.837Z

[tool_use: Bash]

### User | 2026-05-14T01:06:14.986Z

[tool_result]     }
  }

  private error(msg: string, rationale: string[]): RoutingDecision {
    return {
      ok: false,
      backend: null,
      model: null,
      rationale,
      expectedLatencyMs: 0,
      expectedCostUSD: 0,
      fallbacks: [],
      error: msg,
    };
  }

  getBackendStatus(hardware: HardwareProfile): {
    ollama: { available: boolean; models: string[] };
    anthropic: { availabl
... [+1832 chars truncated]

### Assistant | 2026-05-14T01:06:17.532Z

Now let me read the adapt-router-thresholds script:

### Assistant | 2026-05-14T01:06:18.495Z

[tool_use: Bash]

### User | 2026-05-14T01:06:32.182Z

[tool_result] #!/usr/bin/env node
/**
 * adapt-router-thresholds.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U02
 *
 * Weekly cron tuner. Reads the last-7-days slice of
 * `mcp-server/data/state/model-telemetry.jsonl` (+ rotated `.1`), computes
 * per-model P95 latency + failure rate, and writes adaptation decisions to:
 *
 *   - `mcp-server/data/state/router-adaptation.jsonl`       (append-only audit log)
 *   - `mc
... [+5424 chars truncated]

### Assistant | 2026-05-14T01:06:35.222Z

[tool_use: Bash]

### User | 2026-05-14T01:07:57.468Z

[tool_result] // ── percentile (Hyndman–Fan Type 7, matches numpy default) ────────────────

function percentile(sortedNumbers, p) {
  if (sortedNumbers.length === 0) return 0;
  if (sortedNumbers.length === 1) return sortedNumbers[0];
  if (p <= 0) return sortedNumbers[0];
  if (p >= 1) return sortedNumbers[sortedNumbers.length - 1];
  const rank = (sortedNumbers.length - 1) * p;
  const lo = Math.floor(rank),
... [+4283 chars truncated]

### Assistant | 2026-05-14T01:08:00.999Z

[tool_use: Bash]

### User | 2026-05-14T01:08:05.515Z

[tool_result]   return decisions.length;
}

function writeAdaptationState(p, state, now) {
  if (!p) return;
  ensureDir(p);
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: now.toISOString(),
    state,
  };
  // tmp + rename for atomicity (matches ModelTelemetryEngine.purgeOlderThan pattern).
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf
... [+2548 chars truncated]

### Assistant | 2026-05-14T01:08:07.634Z

Now the dispatcher:

### Assistant | 2026-05-14T01:08:09.064Z

[tool_use: Bash]

### User | 2026-05-14T01:09:00.901Z

[tool_result] 63:// backed by ModelTelemetryEngine. `model_telemetry_report` returns
64:// {windowMs?, totalCalls, byModel:{...}} stats. `model_telemetry_log`
66:// `model_telemetry_purge` drops entries older than `olderThanMs`.
67:"model_telemetry_report",
68:"model_telemetry_log",
69:"model_telemetry_purge",
4343:          // INTEL-OLLAMA-OBSIDIAN-MS0/P23-U01 — ModelTelemetryEngine read/log/purge surfaces.
43
... [+835 chars truncated]

### Assistant | 2026-05-14T01:09:03.887Z

Memory pressure is firing. Let me finish the analysis efficiently.

### Assistant | 2026-05-14T01:09:04.468Z

[tool_use: Bash]

### User | 2026-05-14T01:09:08.102Z

[tool_result]             break;
          }

          // INTEL-OLLAMA-OBSIDIAN-MS0/P23-U01 — ModelTelemetryEngine read/log/purge surfaces.
          case "model_telemetry_report": {
            const { modelTelemetryEngine } = await import("../../engines/ModelTelemetryEngine.js");
            const windowMs = typeof params.windowMs === "number" && Number.isFinite(params.windowMs) && params.windowMs > 0
      
... [+3718 chars truncated]

### Assistant | 2026-05-14T01:09:12.171Z

[tool_use: Bash]

### User | 2026-05-14T01:09:16.596Z

[tool_result]                   try { return JSON.parse(line); }
                  catch { return { malformed: true, raw: line.slice(0, 120) }; }
                });
              }
            } catch { /* tolerate */ }
            result = {
              success: true,
              data: {
                state,
                stateLoadError,
                recent,
                paths: { state: statePat
... [+496 chars truncated]

### Assistant | 2026-05-14T01:09:19.900Z

[tool_use: Bash]

### User | 2026-05-14T01:09:24.901Z

[tool_result] 74:"router_adaptation_status"] as const;
4397:          case "router_adaptation_status": {

### Assistant | 2026-05-14T01:09:28.077Z

Note: dispatcher action `router_adaptation_status` is wired but there is no dispatcher path to actually CALL `applyAdaptiveState` — the state file just sits on disk. That's an integration concern. Let me check if anyone loads it at boot:

### Assistant | 2026-05-14T01:09:29.153Z

[tool_use: Grep]

### User | 2026-05-14T01:09:30.009Z

[tool_result] Found 5 files
mcp-server\src\__tests__\devDispatcher.modelTelemetry.test.ts
mcp-server\src\tools\dispatchers\devDispatcher.ts
mcp-server\src\__tests__\ModelRoutingEngine.test.ts
mcp-server\src\__tests__\AdaptRouterThresholds.test.ts
mcp-server\src\engines\ModelRoutingEngine.ts

### Assistant | 2026-05-14T01:09:33.062Z

[tool_use: Grep]

### User | 2026-05-14T01:09:33.728Z

[tool_result] 72:// router-adaptation-state.json contents + (optional) recent decisions
4399:            const statePath = path.join(stateDir, "router-adaptation-state.json");

### Assistant | 2026-05-14T01:09:38.355Z

**Critical integration gap confirmed:** `applyAdaptiveState` is never called outside tests. The tuner writes `router-adaptation-state.json`, but no boot path / server-start hook / dispatcher action loads it into the live `modelRoutingEngine` singleton. The closed loop the spec describes ("state file is consumed at process boot by `ModelRoutingEngine.applyAdaptiveState(state)`") is **not implemented**.

Now the PowerShell script:

### Assistant | 2026-05-14T01:09:38.638Z

[tool_use: Read]

### User | 2026-05-14T01:09:39.413Z

[tool_result] 1	# RAM + Orphan Process Monitor (session-bound)
2	# Runs every 180s. Emits status only on:
3	#   - memory >85%
4	#   - any process killed
5	#   - 15-min heartbeat tick
6	#
7	# Kills:
8	#   - long-lived orphan bash (>30 min) — current bash.exe processes
9	#   - long-running git (>10 min) — usually hung clone/push
10	#   - delegates node reaping to PRISM janitor (--full)
11	#
12	# Logs to state/sha
... [+3488 chars truncated]

### Assistant | 2026-05-14T01:10:41.053Z

Now I have enough to deliver the verdict. Critical observations:

1. **Silent breakage**: `route()` returns `expectedLatencyMs: winner.model.latencyMsTypical` (line 414 + 445) — uses declared, not effective. Score uses effLatency, contract returns differ. Callers reading `expectedLatencyMs` from the decision see pre-adaptation values even after `applyAdaptiveState` is called.

2. **Integration gap (P1)**: `applyAdaptiveState` has zero non-test callers. Tuner writes the state file, but no boot path loads it into the singleton. The feedback loop is open.

3. **PowerShell parent-kill risk**: `Stop-Process -Name bash` with `>30 min` filter. `$myPid` is the PowerShell monitor's own PID, NOT the parent claude-code session. If claude-code spawns long-lived bash workers (which it does — Bash tool can leave `bash.exe` lingering on Windows under the wrapper), or if the operator's interactive bash terminal has been open >30 min, it gets killed. The filter checks `$p.Id -eq $myPid` which only protects the PowerShell loop, not bash trees. No parent-chain check.

4. **JSONL parser parity**: ModelTelemetryEngine `coerceEntry` checks `typeof promptTokens === "number" && Number.isInteger`; tuner `isValidEntry` uses `Number.isInteger(r.promptTokens)` directly. `Number.isInteger("5")` returns false, so the parity holds, but symmetry note: tuner does NOT validate `model.length > 0` (it checks `model.length === 0` returns false) — they agree. ✓

5. **I/O security / DoS**: `getRecentCalls` calls `fs.readFileSync` on full JSONL (up to 50MiB live + 50MiB rotated). For a 100MiB read on every cron + every `model_telemetry_report` call, memory spike is bounded (~100MiB transient) but not great. `purgeOlderThan` does the same. The tuner does the same. No streaming. **Not a security hole** — file is local + write-controlled. P2.

6. **Race on append + rotation**: `rotateIfNeeded` calls `statSync` then `rename` non-atomically. If two processes both hit logCall simultaneously when file is at 49.9
... [+9202 chars truncated]
