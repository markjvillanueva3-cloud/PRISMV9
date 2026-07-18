---
type: "chat-session"
source: "claude-code-cli"
session_id: "ef62ba0b-1dcc-4832-bf71-5829a4d12eb1"
title: "THIS machine = DESKTOP-N7MI1VB, the PRISM \"blackwell\" host. Current REAL hardwar"
date: "2026-06-08"
first_ts: "2026-06-08T14:05:37.699Z"
last_ts: "2026-06-08T14:10:41.771Z"
cwd: "H:\\PRISM"
messages: 68
user_msgs: 27
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/ef62ba0b-1dcc-4832-bf71-5829a4d12eb1/subagents/workflows/wf_ef669510-aa4/agent-aff3c3d17e8d16e09.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# THIS machine = DESKTOP-N7MI1VB, the PRISM "blackwell" host. Current REAL hardwar

> **claude-code-cli** | 2026-06-08 | 68 msgs (27 user / 41 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/ef62ba0b-1dcc-4832-bf71-5829a4d12eb1/subagents/workflows/wf_ef669510-aa4/agent-aff3c3d17e8d16e09.jsonl`

## Transcript

### User | 2026-06-08T14:05:37.699Z

THIS machine = DESKTOP-N7MI1VB, the PRISM "blackwell" host. Current REAL hardware (verified live this session):
- CPU: AMD Ryzen 9 9950X3D2 — 16 cores / 32 logical threads (UPGRADED; host preset description still says "Ryzen 7 7800X3D" — stale)
- RAM: 136434212864 bytes = 127 GiB total
- GPU: NVIDIA RTX PRO 6000 Blackwell Workstation Edition, 96GB (97887 MiB), driver 596.59, CUDA compute capability 12.0 (sm_120)
Drive swap (verified): H: is now the NEW 4TB NVMe = live working tree (Claude runs from H:\prism, branch cad-fusion-live-ms0, latest commit present). P: is the OLD 4TB drive holding a stale pre-swap P:\prism copy that must be LEFT UNTOUCHED as cold backup. A full repo git-grep for 'P:/prism' / 'P:\\prism' returned ZERO hits in tracked files.
The host preset file state/shared/dashboards/fleet-reaper-host-presets.json ALREADY has DESKTOP-N7MI1VB -> label "blackwell" (96GB/127GB/32B-resident), set 2026-06-03 by a GPU-SWAP pass — but its description still names the OLD CPU (7800X3D), suggesting CPU/RAM-pinned settings may not have been revisited after the CPU upgrade.

Work entirely READ-ONLY. Do not edit any file. Use rtk-prefixed bash / Grep / Read. The repo is huge — scope greps tightly and EXCLUDE these noise dirs: node_modules, .git, .claude/projects (chat transcripts — they echo file contents and pollute results), dist, build output, *.jsonl. Prefer 'git grep' from H:/prism (auto-skips .gitignore'd + untracked) over raw grep. Report concrete file:line and the exact current value vs what it should be for the new hardware. Distinguish (a) CORRECTNESS bugs that would break or misroute the live system NOW, from (b) PERF retunes that merely leave performance on the table. Flag severity P0 (breaks live system) / P1 (silently wrong / leaves the machine on old-hardware defaults) / P2 (cosmetic/doc drift).

YOUR SURFACE: Node heap + CPU/thread tuning. Find every hardware-pinned setting for: NODE_OPTIONS / --max-old-space-size (the docs mention a 16GB build heap + a
... [+560 chars truncated]

### Assistant | 2026-06-08T14:06:06.931Z

I'll analyze the Node heap + CPU/thread tuning surface for hardware-pinned settings. Let me search systematically.

### Assistant | 2026-06-08T14:06:08.828Z

[tool_use: Bash]

### Assistant | 2026-06-08T14:06:09.793Z

[tool_use: Bash]

### Assistant | 2026-06-08T14:06:10.951Z

[tool_use: Bash]

### User | 2026-06-08T14:06:13.910Z

[tool_result] .claude/helpers/install-nn-graph-retrain-task.ps1:107:$nodeHeap = '--max-old-space-size=8192'
.claude/helpers/smart-recovery.mjs:40:    hint = "Heap overflow: for builds, prefer the faster build path or increase NODE_OPTIONS=--max-old-space-size when appropriate.";
.claude/hooks/auto-consensus-sync-bash.test.mjs:102:  assert.equal(classifyDestructiveBash("NODE_OPTIONS=--max-old-space-size=8192 rm 
... [+5747 chars truncated]

### User | 2026-06-08T14:06:19.572Z

[tool_result] (Bash completed with no output)

### User | 2026-06-08T14:06:24.423Z

[tool_result] .claude/helpers/smart-recovery.mjs:40:    hint = "Heap overflow: for builds, prefer the faster build path or increase NODE_OPTIONS=--max-old-space-size when appropriate.";
.claude/hooks/auto-consensus-sync-bash.test.mjs:102:  assert.equal(classifyDestructiveBash("NODE_OPTIONS=--max-old-space-size=8192 rm -rf dist"), "rm-recursive-force");
.claude/hooks/prism-http-autostart.mjs:51:        NODE_OPTI
... [+8561 chars truncated]

### Assistant | 2026-06-08T14:06:29.721Z

Good leads. Let me dig into the key files: package.json scripts, settings.json env, the MCP supervisor, and the regen-viz heap. Let me read the critical ones.

### Assistant | 2026-06-08T14:06:30.587Z

[tool_use: Bash]

### Assistant | 2026-06-08T14:06:32.740Z

[tool_use: Bash]

### User | 2026-06-08T14:06:34.264Z

[tool_result] (Bash completed with no output)

### User | 2026-06-08T14:06:38.539Z

[tool_result] .claude/hooks/nn-graph-health-inject.mjs:100: * Returns { dormant, healthy, auroc, brier, poolSize, graded, verdict, reason }.
.claude/hooks/nn-graph-health-inject.mjs:125:  // `poolSize` is DEFERRED-shape telemetry only — the GRADED shape carries
.claude/hooks/nn-graph-health-inject.mjs:126:  // `holdoutN` instead and no `poolSize`, so this is 0 for a graded report.
.claude/hooks/nn-graph-health-
... [+5530 chars truncated]

### Assistant | 2026-06-08T14:06:42.388Z

The grep for package.json heap flags returned nothing — let me check the actual build scripts and read the key files. Let me look at MINBatchExtractorEngine, McxBatchExtractorEngine, CADRegressionWorkerThreadRunnerEngine, build-wiki-embeddings, and the supervisor.

### Assistant | 2026-06-08T14:06:43.801Z

[tool_use: Read]

### User | 2026-06-08T14:06:44.692Z

[tool_result] 118	export const DEFAULT_MAX_BYTES_PER_FILE = 32 * 1024 * 1024;
119	export const DEFAULT_CHECKPOINT_EVERY = 250;
120	export const SCHEMA_VERSION: MINBatchCheckpoint["schemaVersion"] = "1.0.0";
121	
122	/** Default concurrency: min(os.cpus()-1, 8), floor 1. */
123	export function defaultConcurrency(): number {
124	  const cpus = os.cpus()?.length ?? 1;
125	  return Math.max(1, Math.min(cpus - 1, 8)
... [+559 chars truncated]

### Assistant | 2026-06-08T14:06:44.763Z

[tool_use: Read]

### Assistant | 2026-06-08T14:06:45.280Z

[tool_use: Read]

### User | 2026-06-08T14:06:45.839Z

[tool_result] 148	  ".mcx-9",
149	  ".mcam",
150	]);
151	
152	/** Default concurrency: min(os.cpus()-1, 8), floor 1. */
153	export function defaultConcurrency(): number {
154	  const cpus = os.cpus()?.length ?? 1;
155	  return Math.max(1, Math.min(cpus - 1, 8));
156	}
157	
158	// --------------------------------------------------------------------------
159	// Helpers — pure, tested directly
160	// ------------
... [+352 chars truncated]

### User | 2026-06-08T14:06:47.725Z

[tool_result] 195	  const startedAt = Date.now();
196	  // MCP-OOM-FIX (slot:kilo 2026-05-23): bump heap to 4GB. Server was OOM-
197	  // killed every ~14 min (exit code 0xFFFFFFFF = Windows abnormal kill) at
198	  // RSS 720MB / heap 624/664MB — past Node 22's default ~1.5GB old-space
199	  // cap. Driver: prism_guard:error_ledger_recall_similar called constantly
200	  // by peer chats, accumulating retained r
... [+1295 chars truncated]

### Assistant | 2026-06-08T14:06:54.098Z

This is read-only analysis work, so I'll continue with Read/Grep rather than invoking edit-oriented audit chains. The MINBatchExtractorEngine and McxBatchExtractorEngine both cap at `min(cpus-1, 8)`. Let me read the remaining key files and check package.json build scripts directly.

### Assistant | 2026-06-08T14:06:54.099Z

[tool_use: Read]

### User | 2026-06-08T14:06:54.942Z

[tool_result] 1	{
2	    "name": "prism-mcp-server",
3	    "version": "1.0.0",
4	    "description": "PRISM Manufacturing Intelligence MCP Server - CNC machining data, calculations, and AI orchestration",
5	    "main": "dist/index.js",
6	    "bin": {
7	        "prism": "dist/cli.js"
8	    },
9	    "type": "module",
10	    "scripts": {
11	        "patch": "node scripts/close_gaps.js && node scripts/add_atcs_rename
... [+5709 chars truncated]

### Assistant | 2026-06-08T14:07:00.839Z

Now let me look at the esbuild config, the regen-viz heap (24576 = 24GB, which on the OLD 64GB box was already aggressive), worker_threads usage, and the Workflow concurrency cap. Let me also read CADRegressionWorkerThreadRunnerEngine and check settings.json env.

### Assistant | 2026-06-08T14:07:04.996Z

[tool_use: Read]

### Assistant | 2026-06-08T14:07:05.199Z

[tool_use: Bash]

### User | 2026-06-08T14:07:05.909Z

[tool_result] 1	/**
2	 * Shared esbuild configuration for PRISM MCP Server.
3	 *
4	 * All build scripts (`build`, `build:fast`, `build:incremental`, `build:cli`)
5	 * import from here so externals and flags live in ONE place.
6	 *
7	 * Usage:
8	 *   node esbuild.config.mjs                  # default: split build → dist/
9	 *   node esbuild.config.mjs --no-splitting   # single-file build → dist/index.js
10	 *   
... [+3947 chars truncated]

### User | 2026-06-08T14:07:09.387Z

[tool_result] .claude/helpers/pipeline-broadcast.mjs:20: * append-only concurrency model.
.claude/helpers/slot-task-claim.mjs:16://   - **P0 concurrency**: file lock around RMW (advisory `.lock` file with stale-TTL)
.claude/hooks/__tests__/concurrency-test.mjs:4: * concurrency-test.mjs — CPP-MS1-U-CPP07
.claude/hooks/__tests__/concurrency-test.mjs:22: *   node .claude/hooks/__tests__/concurrency-test.mjs
.claud
... [+9063 chars truncated]

### Assistant | 2026-06-08T14:07:16.126Z

The esbuild config has no thread tuning (it auto-detects). The DetachedLoRARunnerEngine and CADRegressionWorkerThreadRunnerEngine are GPU/CPU pool concerns. Let me focus the worker_threads/concurrency search to find the actual hardcoded pool sizes, and look at the Workflow concurrency cap and any `availableParallelism`. Let me also check settings.json env vars and the regen-viz 24GB heap context.

### Assistant | 2026-06-08T14:07:17.328Z

[tool_use: Bash]

### Assistant | 2026-06-08T14:07:20.106Z

[tool_use: Bash]

### User | 2026-06-08T14:07:22.146Z

[tool_result] mcp-server/src/engines/MINBatchExtractorEngine.ts:8: *   • Bounded worker pool: `min(os.cpus()-1, 8)`.
mcp-server/src/engines/MINBatchExtractorEngine.ts:122:/** Default concurrency: min(os.cpus()-1, 8), floor 1. */
mcp-server/src/engines/MINBatchExtractorEngine.ts:124:  const cpus = os.cpus()?.length ?? 1;
mcp-server/src/engines/McxBatchExtractorEngine.ts:152:/** Default concurrency: min(os.cpus()
... [+112 chars truncated]

### User | 2026-06-08T14:07:26.585Z

[tool_result] .claude/commands-archive/automation/auto-agent.md:113:  maxAgents: 6
.claude/commands-archive/automation/self-healing.md:73:  "maxAgents": 4,
.claude/commands-archive/automation/smart-agents.md:51:  "maxAgents": 8,
.claude/commands-archive/github/github-modes.md:140:mcp__claude-flow__swarm_init { topology: "hierarchical", maxAgents: 5 }
.claude/commands-archive/github/issue-tracker.md:28:mcp__clau
... [+5617 chars truncated]

### Assistant | 2026-06-08T14:07:33.086Z

Found several. `os.cpus()` is only used in the two batch extractors (both `min(cpus-1, 8)`). The Workflow concurrency / parallel agent caps are in claude-flow archives (not live) and statusline (cosmetic). Let me check the GPU-related concurrency (LoRA runner, embed pool) and the live env vars in settings.json, plus the regen-viz 24GB heap. These GPU pool sizes and embed pools matter most for the Blackwell upgrade. Let me read the relevant sections.

### Assistant | 2026-06-08T14:07:34.427Z

[tool_use: Read]

### User | 2026-06-08T14:07:35.720Z

[tool_result] 90	export interface QueueStatus {
91	  capacity: number;
92	  queued_count: number;
93	  running_count: number;
94	  available_slots: number;
95	  is_saturated: boolean;
96	  concurrency: number;
97	  p95_service_time_ms: number;
98	}
99	
100	export class QueueSaturatedError extends Error {
101	  retry_after_ms: number;
102	  constructor(msg: string, retry_after_ms: number) {
103	    super(msg);
1
... [+1420 chars truncated]

### Assistant | 2026-06-08T14:07:36.392Z

[tool_use: Bash]

### User | 2026-06-08T14:07:41.320Z

[tool_result] .claude/helpers/mcp-http-bridge.mjs:50:const MAX_CONCURRENT = parseInt(process.env.MCP_MAX_CONCURRENT || "3", 10);
.claude/helpers/mcp-http-bridge.mjs:283:  if (activeRequests >= MAX_CONCURRENT || requestQueue.length === 0) {
.claude/helpers/mcp-http-bridge.mjs:507:    maxConcurrent: MAX_CONCURRENT,
.claude/hooks/chat-state-isolator.mjs:20:const MAX_CONCURRENT_CHATS = 8;
.claude/hooks/chat-state-i
... [+3303 chars truncated]

### Assistant | 2026-06-08T14:07:47.263Z

The DetachedLoRARunner default concurrency is 1 with a hard cap of 16 (GPU pool — Blackwell 96GB can run more). Now let me check the live env vars in both settings.json files (the GPU embed pool lock mentioned in CLAUDE.md, MCP supervisor heap, and any UV_THREADPOOL_SIZE), and read the regen-viz heap context plus the build-wiki-embeddings CONCURRENCY.

### Assistant | 2026-06-08T14:07:52.680Z

[tool_use: Bash]

### Assistant | 2026-06-08T14:07:52.765Z

[tool_use: Bash]

### User | 2026-06-08T14:07:56.623Z

[tool_result] scripts/build-wiki-embeddings.mjs:195:  // time. We issue up to PRISM_EMBED_CONCURRENCY embed requests in flight via a
scripts/build-wiki-embeddings.mjs:201:  const CONCURRENCY = Math.max(1, parseInt(process.env.PRISM_EMBED_CONCURRENCY || "1", 10) || 1);
scripts/build-wiki-embeddings.mjs:223:      if (done % 250 === 0) process.stderr.write(`[wiki-embed]   ${done}/${work.length} (${ok} ok / ${reuse
... [+1247 chars truncated]

### User | 2026-06-08T14:08:00.803Z

[tool_result] 6:    "PRISM_PYTHON_GPU_PATH": "H:/Tools/python-gpu/Scripts/python.exe",
11:    "NIM_EMBED_URL": "http://127.0.0.1:8010/v1",
=== C settings ===
6:    "PRISM_PYTHON_GPU_PATH": "H:/Tools/python-gpu/Scripts/python.exe",
11:    "NIM_EMBED_URL": "http://127.0.0.1:8010/v1",

### Assistant | 2026-06-08T14:08:07.774Z

Key findings emerging. Notably:
- regen-viz at line 211 already references "Host has 136GB total / 71GB free" — so regen-viz was retuned for the 127GiB box (24GB heap is fine). That's a doc-anchored value confirming RAM context.
- `tribal-graph-embedding.mjs` line 24-29 references "RTX PRO" with DEFAULT_CONCURRENCY=1. Let me read that comment fully — it may be pinned to the old GPU.
- settings.json env is minimal (no NODE_OPTIONS/UV_THREADPOOL_SIZE pins at all).

Let me read the tribal-graph-embedding comment and check the build heap comment, plus look for the embed-pool-lock and any other RAM/thread-pinned defaults in scripts/helpers.

### Assistant | 2026-06-08T14:08:08.667Z

[tool_use: Read]

### User | 2026-06-08T14:08:11.093Z

[tool_result] 18	
19	export const DEFAULT_MODEL = "nomic-embed-text";
20	export const EMBEDDING_DIM = 768;
21	export const DEFAULT_BATCH_SIZE = 32;
22	// Default = 1 → exact legacy sequential behavior (deterministic call order, all
23	// pre-existing tests unchanged). Consumers opt into GPU saturation by passing
24	// concurrency>1 (e.g. from PRISM_EMBED_CONCURRENCY). Empirically on an RTX PRO
25	// 6000 Blackw
... [+1572 chars truncated]

### Assistant | 2026-06-08T14:08:14.236Z

[tool_use: Bash]

### User | 2026-06-08T14:08:18.854Z

[tool_result] .claude/commands-archive/_flat-variants/grinder-harden.md:18:prism_ai:grinder_harden_model
.claude/commands-archive/_flat-variants/grinder-learn.md:18:prism_knowledge:grinder_knowledge_extract
.claude/commands-archive/_flat-variants/grinder-optimize.md:18:prism_grinding:grinder_optimize_program
.claude/commands-archive/_flat-variants/grinder-studio.md:18:prism_grinding:grinder_studio_pipeline
.cla
... [+4716 chars truncated]

### Assistant | 2026-06-08T14:08:27.274Z

Important: `tribal-graph-embedding.mjs:24-28` and `build-wiki-embeddings.mjs:201` document that the RTX PRO 6000 Blackwell achieves 15.3× throughput at concurrency 16 vs 1, yet `DEFAULT_CONCURRENCY = 1`. This is a P1 perf-left-on-table (the default is intentionally conservative for determinism, but operators must opt in via env). 

The grep confirmed there are no `64GB`/`7800X3D`/old-GPU references in tracked code. Let me do a final targeted sweep: the NN-graph retrain heap (8192), the smart-recovery / posttool hints, vitest pool config, and any `.npmrc`/vitest.config thread settings. Let me also verify the nn-graph retrain lifecycle and check vitest config for thread pools.

### Assistant | 2026-06-08T14:08:30.739Z

[tool_use: Bash]

### Assistant | 2026-06-08T14:08:32.838Z

[tool_use: Bash]

### User | 2026-06-08T14:08:35.270Z

[tool_result] mcp-server/vitest.config.ts:15: * so going to maxThreads = 8 (one per physical core) is the right cap;
mcp-server/vitest.config.ts:17: * fight for the front-end. minThreads = 4 keeps a warm pool for
mcp-server/vitest.config.ts:32:    pool: "threads",
mcp-server/vitest.config.ts:33:    poolOptions: {
mcp-server/vitest.config.ts:34:      threads: {
mcp-server/vitest.config.ts:38:        maxThreads: 
... [+1029 chars truncated]

### User | 2026-06-08T14:08:39.259Z

[tool_result] 8: * vitest.config so isolate/pool behaviour was implicit. Pinning the pool
12: * Hardware target: AMD Ryzen 7 7800X3D — 8 physical cores, 16 threads,
14: * unusually cheap (test working sets stay in cache across forks),
17: * fight for the front-end. minThreads = 4 keeps a warm pool for
20: * Pool choice: "threads" (worker_threads) over "forks" because PRISM
23: * startup cost and share the V8 is
... [+994 chars truncated]

### Assistant | 2026-06-08T14:08:46.253Z

This is the most important find. `mcp-server/vitest.config.ts` is explicitly hardware-pinned to the OLD CPU:
- Line 12 (in the .ps1 sibling and the config header): "Hardware target: AMD Ryzen 7 7800X3D — 8 physical cores, 16 threads"
- `maxThreads: 8` (one per physical core of the OLD 8-core CPU)
- `minThreads: 4`
- `maxConcurrency: 8`

The new 9950X3D2 has 16 physical cores / 32 threads. Let me read the full vitest.config.ts header and the pool block to capture exact line numbers and current values.

### Assistant | 2026-06-08T14:08:46.427Z

[tool_use: Read]

### User | 2026-06-08T14:08:46.913Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\vitest.config.ts' was already read 2m ago in this session and is unchanged (mtime 1778280638874). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-08T14:08:51.434Z

The guard says it was already read — but I only saw grep snippets, not the full file. Let me get the exact lines with a targeted grep including line numbers and surrounding context.

### Assistant | 2026-06-08T14:08:51.898Z

[tool_use: Bash]

### User | 2026-06-08T14:08:55.675Z

[tool_result] /**
 * Vitest configuration for mcp-server.
 *
 * OBSIDIAN-AUTOMATE-MS3/U-VITEST-PARALLEL
 *
 * Why this exists: mcp-server's test suite is ~3400 cases. Default Vitest
 * concurrency runs file-level workers fine but PRISM had no top-level
 * vitest.config so isolate/pool behaviour was implicit. Pinning the pool
 * and worker counts to the host gives deterministic timing and unlocks
 * the multi-co
... [+2073 chars truncated]

### Assistant | 2026-06-08T14:09:01.117Z

(That triage hint is a false-positive triggered by "testTimeout" in the file output — no test ran.)

I now have the full picture. Let me do two final verification checks: confirm there are no other `8` physical-core-pinned spots and check the regen-viz build heap comment one more time for the "16GB build" reference, plus verify the `prism-http-autostart` 16GB heap usage is for the HTTP server.

### Assistant | 2026-06-08T14:09:01.811Z

[tool_use: Read]

### User | 2026-06-08T14:09:03.988Z

[tool_result] 40	  try {
41	    // Start in detached mode so it survives this process
42	    const child = spawn('bash', [STARTUP_SCRIPT], {
43	      detached: true,
44	      stdio: 'ignore',
45	      cwd: 'H:/prism/mcp-server',
46	      env: {
47	        ...process.env,
48	        TRANSPORT: 'http',
49	        PORT: String(PRISM_HTTP_PORT),
50	        LOG_LEVEL: 'info',
51	        NODE_OPTIONS: '--max-old-spac
... [+227 chars truncated]

### Assistant | 2026-06-08T14:09:15.821Z

Interesting — there are TWO different heap settings for the same MCP HTTP server: `prism-http-autostart.mjs` spawns it with 16384 (16GB), but `mcp-server-supervisor.mjs` spawns it with only 4096 (4GB). On the 127GiB box, the supervisor's 4GB is now very conservative — that's a P1 perf/retune (the 4GB was a 2026-05-23 OOM-mitigation when the box was smaller; the comment even notes it's a mitigation, not a fix). I have enough to compile the report.

Let me capture the build heap "16GB" reference context that the prompt mentioned, and do one last check on whether `availableParallelism` is anywhere (the modern API the os.cpus() spots should arguably use). I've already confirmed os.cpus() is only in the 2 batch extractors. Let me verify the smart-recovery/posttool hints are advisory text only (not pins) and finalize.

I have all the data needed. Compiling findings.

### Assistant | 2026-06-08T14:09:15.821Z

[tool_use: TaskUpdate]

### User | 2026-06-08T14:09:16.663Z

[tool_result] Updated task #2 status

### Assistant | 2026-06-08T14:10:25.514Z

[tool_use: StructuredOutput]

### User | 2026-06-08T14:10:26.010Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-08T14:10:41.771Z

Audit complete. Summary of the Node heap + CPU/thread tuning surface on the upgraded blackwell host (16c/32t, 127GiB RAM, RTX PRO 6000 96GB):

**P1 (silently sized for old hardware / inconsistent):**
1. `mcp-server/vitest.config.ts:38-39,49` — thread pool hard-pinned to the retired 8-core/16-thread 7800X3D (maxThreads=8, maxConcurrency=8, header rationale explicitly cites "7800X3D - 8 physical cores"). Should default to 16 on the 16-core CPU.
2. `scripts/mcp-server-supervisor.mjs:206` — MCP HTTP server spawned with only 4GB heap (a 2026-05-23 OOM-mitigation for the smaller box); below the watchdog's own 3GB RSS restart threshold on a 127GiB box.
3. `prism-http-autostart.mjs:51` (16GB) vs `mcp-server-supervisor.mjs:206` (4GB) — two launchers of the *same* server disagree on heap by 4x; stability is non-deterministic by launch path.
4. `MINBatchExtractorEngine.ts:122` + `McxBatchExtractorEngine.ts:152` — `min(os.cpus()-1, 8)` hard ceiling of 8 leaves 24 of 32 threads idle.
5. `tribal-graph-embedding.mjs:29` + `build-wiki-embeddings.mjs:201` — GPU embed default concurrency 1 despite the file's own measured 15.3x speedup at concurrency 16 on this exact Blackwell GPU (opt-in via `PRISM_EMBED_CONCURRENCY`).

**P2 (tuning headroom / cosmetic / confirmed-clean):**
- DetachedLoRARunner concurrency default 1 (96GB VRAM could hold more).
- `UV_THREADPOOL_SIZE` never set anywhere (libuv default 4) — no old-hw pin, just an absent setting for the fs-heavy census jobs.
- `regen-viz.mjs:211` heap (24GB) and its "136GB host" comment are already correctly retuned for 127GiB — no drift.
- No 64GB RAM pin or oversized heap exists anywhere; build/test/CI 16GB and 8GB script heaps are all safe on 127GiB.
- The two `os.cpus()` sites could modernize to `os.availableParallelism()` (same result on this host).

No P0: nothing in this surface breaks the live system now; all findings are perf-left-on-table or the supervisor/autostart heap inconsistency. Full file:line + current-vs-recommended v
... [+37 chars truncated]
