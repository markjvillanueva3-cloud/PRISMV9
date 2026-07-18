---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are an adversarial reviewer. Below is a permanent-fix plan for a recurring M"
date: "2026-06-04"
first_ts: "2026-06-04T03:46:44.375Z"
last_ts: "2026-06-04T03:49:06.010Z"
cwd: "H:\\PRISM"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a988dec04854c88c3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are an adversarial reviewer. Below is a permanent-fix plan for a recurring M

> **claude-code-cli** | 2026-06-04 | 27 msgs (11 user / 16 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a988dec04854c88c3.jsonl`

## Transcript

### User | 2026-06-04T03:46:44.375Z

You are an adversarial reviewer. Below is a permanent-fix plan for a recurring MCP-server drop. 
== LIVE GROUND TRUTH (DESKTOP-N7MI1VB, slot golf, 2026-06-03) ==
- The recurring symptom: chats periodically show "MCP DISCONNECTED" then a watchdog restart. Operator: "permanently fix the mcp server drop we constantly experience."
- MCP HTTP bridge listens on :3100, owner node pid 36276 (756MB RSS, just boosted to AboveNormal).
- THREE node processes at ~2.9GB RSS each — right at the documented 3GB watchdog OOM-restart threshold (a restart = a drop).
- CPU was at 100% (16 logical cores, Ryzen 7 7800X3D). No single runaway — AGGREGATE saturation from 201 active fleet /loop sessions + Obsidian + Defender (MsMpEng) + ollama. CPU starvation of the MCP event loop = request timeouts = "MCP DISCONNECTED".
- PRIORITY INVERSION found: ollama 'llama-server' runner processes were at AboveNormal priority, PREEMPTING the Normal-priority MCP server. Golf normalized runners->Normal + boosted MCP->AboveNormal as immediate relief (CPU 100%->93%). But ollama RESPAWNS runners at AboveNormal on each model load, so a one-shot fix is NOT durable.
- RAM is healthy: 40% used, 76GB free of 127GB. GPU: 96GB RTX PRO 6000 Blackwell, just optimized (4-model roster, 54GB resident, 42GB free, 1% util — lots of idle GPU compute).

== PRIOR MCP-DROP FIXES ALREADY SHIPPED (do NOT rebuild; verify they're deployed) ==
- commit 1297b0a8f5 (2026-05-31, golf): "MCP :3100 Already connected to a transport" — buildRequestServer() makes a FRESH McpServer per /mcp request (SDK allows only 1 transport/server; overlapping multi-chat requests threw -> client timeout -> DISCONNECTED). Split registerTools -> bootstrapServices(once)+bindDispatchers(per-server).
- MCP-OOM-FIX (2026-05-23): watchdog preemptive restart on RSS pressure (3GB threshold), supervisor spawnChild injects NODE_OPTIONS heap bump.
- Ollama serve is now a scheduled task (PRISM Ollama Serve, Normal priority, logon trigger), CPU throttle task DISABLED
... [+24809 chars truncated]

### Assistant | 2026-06-04T03:46:54.359Z

I'll verify the load-bearing claims in this plan against live ground truth before issuing a verdict. The plan makes specific, falsifiable assertions about code line numbers, deployment state, and config values. Let me check the highest-risk ones in parallel.

### Assistant | 2026-06-04T03:46:55.730Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:46:56.914Z

[tool_use: Bash]

### User | 2026-06-04T03:47:05.991Z

[tool_result] -rw-r--r-- 1 wompu 197611 8429763 2026-06-03 15:35 mcp-server/dist/index.js
-rw-r--r-- 1 wompu 197611   65047 2026-06-02 20:21 mcp-server/src/index.ts

### User | 2026-06-04T03:47:07.096Z

[tool_result] 417:// heavy global I/O ONCE; bindDispatchers() is side-effect-free tool registration that runs
421:let _postBindDone = false;
523: * on fresh per-request servers built by buildRequestServer(). The temporary
527:async function bindDispatchers(server: McpServer): Promise<void> {
809:  // server's bindDispatchers() call — and must NOT re-run on the fresh per-request servers
810:  // built by buildRe
... [+609 chars truncated]

### Assistant | 2026-06-04T03:47:11.173Z

Both confirmed: `dist/index.js` (15:35) is newer than `src/index.ts` (20:21 prev day) so the factory fix IS deployed, and `bindDispatchers(s)` runs at :898 inside `buildRequestServer` called per-request at :1205. Now let me verify the cost of `bindDispatchers` (the dominant-cause claim), the watchdog/supervisor knobs, and the embedder hot-path claims.

### Assistant | 2026-06-04T03:47:12.134Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:47:13.662Z

[tool_use: Bash]

### User | 2026-06-04T03:47:23.663Z

[tool_result] async function bindDispatchers(server: McpServer): Promise<void> {
  // =========================================================================
  // UNIVERSAL AUTO-HOOK PROXY: Wraps ALL prism_* dispatchers with:
  //   1. Before/after dispatch hooks (DISPATCH-ACTION-VALIDATE, DISPATCH-PERF-TRACK)
  //   2. Category-specific hooks (CALC, FILE, STATE, AGENT, FORMULA)
  //   3. Error capture → REFL
... [+1678 chars truncated]

### User | 2026-06-04T03:47:32.326Z

[tool_result] scripts/mcp-server-watchdog.mjs:12: *   - Probe GET /health with PRISM_MCP_WATCHDOG_TIMEOUT_MS (default 10000).
scripts/mcp-server-watchdog.mjs:14: *   - On failure: increment `consecutiveFails` in state file.
scripts/mcp-server-watchdog.mjs:15: *   - After PRISM_MCP_WATCHDOG_FAIL_THRESHOLD consecutive failures (default 2,
scripts/mcp-server-watchdog.mjs:20: *       4. Reset consecutiveFails to 0 
... [+3629 chars truncated]

### Assistant | 2026-06-04T03:47:38.233Z

All confirmed. The `bindDispatchers` body proves the per-request cost claim is real: every `/mcp` POST monkey-patches `server.tool`, then calls `register*Dispatcher(server)` for ~90 dispatchers, and `wrapWithUniversalHooks` wraps each of ~7,244 actions in a fresh closure — synchronous, on the event loop, no cache. The watchdog knobs (RSS 3072, TIMEOUT 10000, FAIL_THRESHOLD 2, BOOTGUARD default-OFF at :314) and supervisor heap 4096 (:205) all match the plan.

Now the embedder hot-path and the safety-routing guardrail — the two highest-risk GPU claims.

### Assistant | 2026-06-04T03:47:39.809Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:47:41.076Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:47:42.381Z

[tool_use: Bash]

### User | 2026-06-04T03:47:51.864Z

[tool_result] 134:  async embedBatch(texts: readonly string[]): Promise<EmbedResult[]> {
137:    for (const t of texts) out.push(await this.embed(t));
158:  unload(): void {

### User | 2026-06-04T03:47:53.308Z

[tool_result] 37:  | "safety_critical"
58:  qualityTier: number;
59:  /** 0-100 quality tier for code-focused tasks; falls back to qualityTier when omitted. */
86:  requireSafety?: boolean;
131:  // output length. SAFETY INVARIANT: every local entry keeps qualityTier
132:  // < 85 so the `safety_critical` tier floor (canServe) always routes
141:    qualityTier: 83,
154:    qualityTier: 80, // reasoning speciali
... [+1093 chars truncated]

### User | 2026-06-04T03:47:55.541Z

[tool_result] 28:export interface IndexEmbedder {
47:  private readonly embedder: IndexEmbedder;
50:  constructor(store: QdrantVectorStoreEngine, embedder: IndexEmbedder, config: IndexConfig) {

### Assistant | 2026-06-04T03:48:02.367Z

All three confirmed:
- `LocalEmbeddingEngine.embedBatch` (:137) IS sequential `for...await` and DOES have `unload()` (:158) — both plan claims accurate.
- `ModelRoutingEngine` safety invariant is REAL and code-enforced: every local model `qualityTier < 85`, `canServe` hard-fails `safety_critical` below the floor (:545 hardFail=true), `requireSafety` honored (:86, :433). The §4-item-3 guardrail is sound.
- `SemanticAssetIndexEngine` takes an injected `IndexEmbedder` via ctor (:50) — the swap seam exists as claimed.

One last critical check: the regression/starvation question (does AboveNormal MCP + ollama renice actually have headroom, and is the 2.9GB steady-state or growing) and whether the supervisor uses `spawn` (so `spawnSync` import claim holds).

### Assistant | 2026-06-04T03:48:04.710Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:48:07.204Z

[tool_use: Bash]

### User | 2026-06-04T03:48:16.713Z

[tool_result] 15: *   - On child exit: exponential backoff respawn (5s → 60s cap). Reset
17: *   - SIGTERM / SIGINT: stop respawn loop, propagate to child, wait 5s for
23: *   --dry-run    Probe + log only, never spawn. Returns 0 if server up, 1 if down.
24: *   --once       Spawn once, exit when child exits. No respawn loop.
39:import { spawn } from "node:child_process";
165:// ---------- supervised spawn ----
... [+930 chars truncated]

### User | 2026-06-04T03:48:18.289Z

[tool_result] ls: cannot access 'H:/PRISM/scripts/mcp-priority-guardian.ps1': No such file or directory
ls: cannot access 'H:/PRISM/scripts/mcp-load-harness.mjs': No such file or directory
H:/PRISM/scripts/ollama-cpu-throttle.ps1
H:/PRISM/state/shared/specs/MCP-CAPACITY-MS0.md
---HEALTH eventloop---
419:// startup event) against the shared server (still needed for REST routes + /health + bridge).
522: * Safe to
... [+322 chars truncated]

### Assistant | 2026-06-04T03:48:23.964Z

All final claims verified. Supervisor imports only `spawn` (:39), so the plan's "add `spawnSync` to the import" is correct and necessary. `OllamaEmbedderEngine.embedMany` exists (:159), `pairwiseCosine` (:174). `mcp-priority-guardian.ps1` and `mcp-load-harness.mjs` are correctly described as new files (absent). `ollama-cpu-throttle.ps1` and `MCP-CAPACITY-MS0.md` exist as claimed. `/health` (:982) does NOT currently expose `eventLoopLag` — confirming the §5-A papa add is genuinely new. `requestTimeout = 0` (:1318) confirms the server-side keep-alive claim.

I have enough verified ground truth to issue the verdict. Let me confirm the one remaining skeptical question — whether the 2.9GB RSS is steady-state or growing (the leak-masking concern) by checking the watchdog log.

### Assistant | 2026-06-04T03:48:26.025Z

[tool_use: Bash]

### User | 2026-06-04T03:49:04.739Z

[tool_result] {"ts":"2026-06-04T01:48:27.442Z","pid":1916,"level":"debug","msg":"Healthy","statusCode":200,"rssMB":51,"uptimeSec":841}
{"ts":"2026-06-04T01:53:27.453Z","pid":15444,"level":"debug","msg":"Healthy","statusCode":200,"rssMB":60,"uptimeSec":1141}
{"ts":"2026-06-04T01:58:27.464Z","pid":20028,"level":"debug","msg":"Healthy","statusCode":200,"rssMB":632,"uptimeSec":1441}
{"ts":"2026-06-04T02:03:27.457Z"
... [+2764 chars truncated]

### Assistant | 2026-06-04T03:49:06.010Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
