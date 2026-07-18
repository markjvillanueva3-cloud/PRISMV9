---
type: "chat-session"
source: "claude-code-cli"
session_id: "c56f23b2-0a94-465d-8a7a-1a82bd09cf63"
title: "3-of-3 scrutiny gate — reviewer B (INDEPENDENT second pass). Do not assume revie"
date: "2026-05-14"
first_ts: "2026-05-14T01:02:18.987Z"
last_ts: "2026-05-14T01:13:20.153Z"
cwd: "H:\\prism"
messages: 86
user_msgs: 36
assistant_msgs: 50
raw_file: "H:/.claude/projects/H--prism/c56f23b2-0a94-465d-8a7a-1a82bd09cf63/subagents/agent-a8df1675e98caf74e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# 3-of-3 scrutiny gate — reviewer B (INDEPENDENT second pass). Do not assume revie

> **claude-code-cli** | 2026-05-14 | 86 msgs (36 user / 50 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c56f23b2-0a94-465d-8a7a-1a82bd09cf63/subagents/agent-a8df1675e98caf74e.jsonl`

## Transcript

### User | 2026-05-14T01:02:18.987Z

3-of-3 scrutiny gate — reviewer B (INDEPENDENT second pass). Do not assume reviewer A caught everything. Weight: test integrity, dispatcher-wiring completeness, inlined-constant detection.

Session: charlie-p23-u01u02. Commits in scope:
- f26565281 [INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02
- 1a333b67f [INTEL-OLLAMA-OBSIDIAN-MS0]/P23-FIXUP (added 2 missed test files)

Same file list:
- H:/prism/mcp-server/src/engines/ModelTelemetryEngine.ts
- H:/prism/mcp-server/src/engines/ModelRoutingEngine.ts (only the adaptive-state additions)
- H:/prism/scripts/adapt-router-thresholds.mjs
- H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts (only the 4 new actions: model_telemetry_report / model_telemetry_log / model_telemetry_purge / router_adaptation_status)
- H:/prism/mcp-server/src/__tests__/ModelTelemetry.test.ts
- H:/prism/mcp-server/src/__tests__/AdaptRouterThresholds.test.ts
- H:/prism/mcp-server/src/__tests__/ModelRoutingEngine.test.ts (only the appended `applyAdaptiveState — INTEL-OLLAMA-OBSIDIAN-MS0/P23-U02` describe block)
- H:/prism/mcp-server/src/__tests__/devDispatcher.modelTelemetry.test.ts
- H:/prism/.claude/scripts/ram-orphan-monitor.ps1

Focus areas reviewer A is unlikely to weight:
1. **Dispatcher wiring completeness** — is each new action in BOTH the ACTIONS enum AND the switch statement? Are the schemas correct? Will Zod validation pass for typical-shape params?
2. **Test integrity** — re-derive the Hyndman-Fan Type 7 percentile reference values (P50=550, P95=955) yourself. Are they correct? Are there tests that pass with weaker implementations?
3. **Inlined constants** — does `adapt-router-thresholds.mjs` hide threshold values that should be named constants? Check FAILURE_RATE_DEGRADATION, FAILURE_RATE_RECOVERY, MIN_SAMPLES, LATENCY_P50, LATENCY_P95.
4. **Snake_case vs camelCase boundary** — Zod schema vs the JSONL field names — anyone going to be surprised?
5. **Adaptive-state shape — defensive parse** — what happens if `router-adaptation-state.json
... [+905 chars truncated]

### Assistant | 2026-05-14T01:02:24.187Z

I'll perform an independent second-pass review focusing on the areas reviewer A is unlikely to weight.

### Assistant | 2026-05-14T01:02:24.636Z

[tool_use: Bash]

### User | 2026-05-14T01:02:28.628Z

[tool_result] d912739b1 [CLEANUP-MS0]/U-GIT-TREE-SWEEP-FIXUP: address 3 P0 + 8 P1 scrutiny findings on classify + watcher
1a333b67f [MAIN] [INTEL-OLLAMA-OBSIDIAN-MS0]/P23-FIXUP: missed test files
2f089effd [MAIN] [CLEANUP-MS0]/U-CLEANUP-H3: ship hook-orphan-scan.mjs
f26565281 [MAIN] [INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02: ModelTelemetryEngine + adaptive router thresholds
b9a3662fd [CLEANUP-MS0]/U-GIT-TREE-SWEE
... [+80 chars truncated]

### Assistant | 2026-05-14T01:02:31.204Z

[tool_use: Read]

### User | 2026-05-14T01:02:31.968Z

[tool_result] 1	/**
2	 * ModelTelemetryEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U01
3	 *
4	 * Per-call telemetry logger for LLM/Ollama invocations. Captures
5	 * `{ts, model, backend, taskKind, promptTokens, completionTokens, latencyMs, outcome, errorBrief}`
6	 * per call and persists to a JSONL store on disk. Read-side surfaces
7	 * (`getRecentCalls`, `getStats`) feed the adaptive-routing tuner
8	 * (P23-U02, 
... [+22269 chars truncated]

### Assistant | 2026-05-14T01:02:34.789Z

Skipping re-read. Let me check the remaining files I haven't yet seen.

### Assistant | 2026-05-14T01:02:35.048Z

[tool_use: Read]

### User | 2026-05-14T01:02:35.771Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * adapt-router-thresholds.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U02
4	 *
5	 * Weekly cron tuner. Reads the last-7-days slice of
6	 * `mcp-server/data/state/model-telemetry.jsonl` (+ rotated `.1`), computes
7	 * per-model P95 latency + failure rate, and writes adaptation decisions to:
8	 *
9	 *   - `mcp-server/data/state/router-adaptation.jsonl`       (append-only aud
... [+14436 chars truncated]

### Assistant | 2026-05-14T01:02:39.510Z

[tool_use: Bash]

### User | 2026-05-14T01:02:43.597Z

[tool_result] diff --git a/mcp-server/src/engines/ModelRoutingEngine.ts b/mcp-server/src/engines/ModelRoutingEngine.ts
index ddfc6a57d..f48d2fd8b 100644
--- a/mcp-server/src/engines/ModelRoutingEngine.ts
+++ b/mcp-server/src/engines/ModelRoutingEngine.ts
@@ -272,8 +272,36 @@ export const DEFAULT_MODEL_CATALOG: ModelSpec[] = [
   },
 ];
 
+/**
+ * Per-model adaptation entry — produced by the P23-U02 tuner
+ * (`
... [+6692 chars truncated]

### Assistant | 2026-05-14T01:02:47.635Z

[tool_use: Bash]

### User | 2026-05-14T01:03:41.832Z

[tool_result] diff --git a/mcp-server/src/tools/dispatchers/devDispatcher.ts b/mcp-server/src/tools/dispatchers/devDispatcher.ts
index 403fe077c..092e20988 100644
--- a/mcp-server/src/tools/dispatchers/devDispatcher.ts
+++ b/mcp-server/src/tools/dispatchers/devDispatcher.ts
@@ -58,7 +58,20 @@ const ACTIONS = ["session_boot", "build", "code_template", "code_search", "file_
 // preserves engine state (ETag, backo
... [+6262 chars truncated]

### Assistant | 2026-05-14T01:03:44.892Z

[tool_use: Read]

### User | 2026-05-14T01:03:46.647Z

[tool_result] 1	/**
2	 * ModelTelemetryEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U01 round-trip + adversarial tests
3	 *
4	 * Coverage floor (per comprehensive-build-enforce):
5	 *   - happy path: round-trip log → read → stats
6	 *   - ≥3 failure modes: malformed JSONL, bad Zod input, sentinel-path throw
7	 *   - ≥2 adversarial inputs: string-typed numeric, negative/non-int counts, unparseable ts
8	 *   - ≥3 spa
... [+29838 chars truncated]

### Assistant | 2026-05-14T01:03:50.164Z

Let me verify the Hyndman-Fan Type 7 percentile reference values manually.

### Assistant | 2026-05-14T01:03:54.442Z

[tool_use: Bash]

### User | 2026-05-14T01:05:14.291Z

[tool_result] P50: 550
P95: 955
max: 1000
manual P95: 955

### Assistant | 2026-05-14T01:05:17.080Z

Reference values confirmed: P50=550, P95=955 are mathematically exact under Hyndman-Fan Type 7. Continuing review.

### Assistant | 2026-05-14T01:05:17.629Z

[tool_use: Read]

### User | 2026-05-14T01:05:18.377Z

[tool_result] 1	/**
2	 * AdaptRouterThresholds — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U02 tuner script tests
3	 *
4	 * Covers `runAdaptation()` exported from `scripts/adapt-router-thresholds.mjs`.
5	 * Verifies:
6	 *   - happy path: telemetry → decisions → log + state file
7	 *   - dry-run does NOT write
8	 *   - low-sample models are skipped (and prior state is preserved for them)
9	 *   - failureRate ≥ 0.20 → excl
... [+16690 chars truncated]

### Assistant | 2026-05-14T01:05:22.302Z

[tool_use: Bash]

### User | 2026-05-14T01:06:19.045Z

[tool_result] diff --git a/mcp-server/src/__tests__/ModelRoutingEngine.test.ts b/mcp-server/src/__tests__/ModelRoutingEngine.test.ts
index 284e022bc..38d636702 100644
--- a/mcp-server/src/__tests__/ModelRoutingEngine.test.ts
+++ b/mcp-server/src/__tests__/ModelRoutingEngine.test.ts
@@ -289,4 +289,134 @@ describe("ModelRoutingEngine", () => {
       );
     });
   });
+
+  // ── P23-U02 adaptive state ──────────
... [+6331 chars truncated]

### Assistant | 2026-05-14T01:06:21.934Z

[tool_use: Read]

### User | 2026-05-14T01:06:22.778Z

[tool_result] 1	/**
2	 * INTEL-OLLAMA-OBSIDIAN-MS0/P23 — dispatcher wiring tests
3	 *
4	 * Round-trips ModelTelemetryEngine (P23-U01) + router-adaptation-status
5	 * (P23-U02) through the `prism_dev` MCP tool's handler. Uses a fake MCP
6	 * server that captures the registered handler closure so we can invoke
7	 * it directly without standing up a transport.
8	 *
9	 * Why round-trip (not just engine-direct): cod
... [+12471 chars truncated]

### Assistant | 2026-05-14T01:06:26.231Z

[tool_use: Bash]

### User | 2026-05-14T01:06:30.755Z

[tool_result] 63:// backed by ModelTelemetryEngine. `model_telemetry_report` returns
64:// {windowMs?, totalCalls, byModel:{...}} stats. `model_telemetry_log`
66:// `model_telemetry_purge` drops entries older than `olderThanMs`.
67:"model_telemetry_report",
68:"model_telemetry_log",
69:"model_telemetry_purge",
74:"router_adaptation_status"] as const;
4344:          case "model_telemetry_report": {
4366:        
... [+128 chars truncated]

### Assistant | 2026-05-14T01:06:33.726Z

All 4 actions are present in BOTH the ACTIONS enum AND switch statement. Now let me verify the schema validation path and adapt-router-thresholds CLI behavior more carefully.

### Assistant | 2026-05-14T01:06:34.710Z

[tool_use: Read]

### User | 2026-05-14T01:06:35.618Z

[tool_result] 75	
76	const CODE_TEMPLATES: Record<string, string> = {
77	  tool_registration: `// Pattern: register tool\nimport { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { z } from "zod";\nexport function registerMyTools(server: McpServer): void {\n  server.tool("tool_name", "Description", { param: z.string() }, async (args) => {\n    return { content: [{ type: "text", text: JSON.st
... [+5790 chars truncated]

### Assistant | 2026-05-14T01:06:39.738Z

[tool_use: Bash]

### User | 2026-05-14T01:07:57.478Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T01:08:00.240Z

[tool_use: Bash]

### User | 2026-05-14T01:08:18.841Z

[tool_result] mcp-server/src/schemas/devActionSchemas.ts:43:export const ACTION_DEV_SCHEMAS: Record<string, z.ZodType<any>> = {
mcp-server/src/tools/dispatchers/devDispatcher.ts:13:import { ACTION_DEV_SCHEMAS } from "../../schemas/devActionSchemas.js";
mcp-server/src/tools/dispatchers/devDispatcher.ts:132:      const validation = validateActionParams(action, params, ACTION_DEV_SCHEMAS);
mcp-server/src/__tests__
... [+988 chars truncated]

### Assistant | 2026-05-14T01:08:21.684Z

[tool_use: Bash]

### User | 2026-05-14T01:08:24.894Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T01:08:27.968Z

Found a P0 finding. The 4 new actions are NOT in `ACTION_DEV_SCHEMAS`. Let me verify the validation behavior when a schema is missing.

### Assistant | 2026-05-14T01:08:28.697Z

[tool_use: Read]

### User | 2026-05-14T01:08:29.581Z

[tool_result] 1	/**
2	 * Dev Action Schemas - Zod schemas for prism_dev dispatcher actions
3	 */
4	import { z } from "zod";
5	
6	// ── RoadmapIntelligenceEngine shared sub-schemas (ENGINE-WIRE: prism_dev roadmap_intel_* actions) ──
7	const _riMilestoneUnit = z.object({
8	  id: z.string(), name: z.string(), description: z.string(),
9	  estimated_hours: z.number().nonnegative().optional(),
10	  actual_hours: z.nu
... [+3400 chars truncated]

### Assistant | 2026-05-14T01:08:32.033Z

Now let me check the validation behavior when a schema is missing.

### system

... [6 middle messages omitted -- see raw_file] ...

### User | 2026-05-14T01:09:50.786Z

[tool_result] opts.dryRun=true, script=false: false
opts.dryRun=false, script=true: true
opts.dryRun=undefined, script=true: false
opts.dryRun=undefined, script=false: true

### Assistant | 2026-05-14T01:09:55.039Z

[tool_use: Bash]

### User | 2026-05-14T01:09:58.369Z

[tool_result] mcp-server/src/engines/ModelRoutingEngine.ts:303:  /** Active adaptation overrides keyed by model id. Mutated by `applyAdaptiveState`. */
mcp-server/src/engines/ModelRoutingEngine.ts:328:  applyAdaptiveState(state: ModelAdaptiveState): void {

### Assistant | 2026-05-14T01:10:01.156Z

[tool_use: Bash]

### User | 2026-05-14T01:10:07.390Z

[tool_result] mcp-server/src/engines/ModelRoutingEngine.ts:303:  /** Active adaptation overrides keyed by model id. Mutated by `applyAdaptiveState`. */
mcp-server/src/engines/ModelRoutingEngine.ts:328:  applyAdaptiveState(state: ModelAdaptiveState): void {
mcp-server/src/__tests__/ModelRoutingEngine.test.ts:294:  describe("applyAdaptiveState — INTEL-OLLAMA-OBSIDIAN-MS0/P23-U02", () => {
mcp-server/src/__tests__
... [+1237 chars truncated]

### Assistant | 2026-05-14T01:10:10.989Z

P1 finding: `applyAdaptiveState` is wired into the engine but is never called from boot. The state file written by the cron exists, but no production code path reads it back at startup — only tests exercise the method.

### Assistant | 2026-05-14T01:10:11.977Z

[tool_use: Bash]

### User | 2026-05-14T01:10:16.916Z

[tool_result] mcp-server/src/engines/LocalModelOrchestratorEngine.ts:28:  modelRoutingEngine,
mcp-server/src/engines/LocalModelOrchestratorEngine.ts:95:    this.router = deps.router ?? modelRoutingEngine;

### Assistant | 2026-05-14T01:10:19.850Z

[tool_use: Bash]

### User | 2026-05-14T01:10:24.506Z

[tool_result] mcp-server/src/tools/dispatchers/devDispatcher.ts:72:// router-adaptation-state.json contents + (optional) recent decisions
mcp-server/src/tools/dispatchers/devDispatcher.ts:4399:            const statePath = path.join(stateDir, "router-adaptation-state.json");
mcp-server/src/__tests__/AdaptRouterThresholds.test.ts:37:    state: path.join(dir, "router-adaptation-state.json"),
mcp-server/src/__test
... [+262 chars truncated]

### Assistant | 2026-05-14T01:10:28.175Z

Confirmed. The router-adaptation-state.json file is written by the cron and *displayed* by `router_adaptation_status`, but `modelRoutingEngine.applyAdaptiveState()` is NEVER called at boot to apply it. The adaptive feedback loop is incomplete.

### Assistant | 2026-05-14T01:10:29.135Z

[tool_use: Bash]

### User | 2026-05-14T01:10:34.697Z

[tool_result] 79:    process.env.PRISM_MODEL_TELEMETRY_PATH = jsonl;
129:      delete process.env.PRISM_MODEL_TELEMETRY_PATH;
136:    process.env.PRISM_MODEL_TELEMETRY_PATH = jsonl;
148:      delete process.env.PRISM_MODEL_TELEMETRY_PATH;
155:    process.env.PRISM_MODEL_TELEMETRY_PATH = jsonl;

### Assistant | 2026-05-14T01:10:41.203Z

P1 finding: The dispatcher test sets `process.env.PRISM_MODEL_TELEMETRY_PATH` AFTER importing the engine. But `modelTelemetryEngine` is a module-level singleton constructed at import time (line 519 of ModelTelemetryEngine.ts), so the env var has no effect on the singleton's `jsonlPath`. The test calls `modelTelemetryEngine.reset()` which would delete from the singleton's resolved-at-import path — i.e. either the canonical production JSONL or unresolved.

### Assistant | 2026-05-14T01:10:44.805Z

[tool_use: Bash]

### User | 2026-05-14T01:10:49.187Z

[tool_result] Module-level singleton constructed at import time. env var set later has no effect.

### Assistant | 2026-05-14T01:10:55.336Z

[tool_use: Bash]

### User | 2026-05-14T01:10:58.648Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T01:11:01.852Z

[tool_use: Read]

### User | 2026-05-14T01:11:02.583Z

[tool_result] 170	    const cursors = projector.getAllCursors();
171	    expect(typeof cursors.bug_attribution).toBe("number");
172	    expect(cursors.bug_attribution).toBeGreaterThan(0);
173	  });
174	});
175	
176	describe("U-CLEANUP-B2 — dispatcher action enum + schema parity", () => {
177	  it("devActionSchemas exports the 3 peer_audit_* schemas with required fields", async () => {
178	    const { ACTION_DEV
... [+1402 chars truncated]

### Assistant | 2026-05-14T01:11:05.774Z

[tool_use: Bash]

### User | 2026-05-14T01:11:09.137Z

[tool_result] 352:const isMainModule = (() => {
355:      process.argv[1] &&
356:      path.resolve(process.argv[1]) === new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")
363:if (isMainModule) {

### Assistant | 2026-05-14T01:11:16.034Z

[tool_use: Bash]

### User | 2026-05-14T01:11:29.217Z

[tool_result] undefined
false

### Assistant | 2026-05-14T01:11:33.918Z

OS allocator pressure on bash, hook noise — irrelevant to the review. Continuing.

The argv parsing at module load means the test's `runAdaptation()` call (which sources `dryRun` from module-level if `opts.dryRun` is undefined) reads vitest's argv. In tests, `opts.dryRun` is explicitly passed (true/false), so the `?? dryRun` fallback is bypassed — but a future test that omits `opts.dryRun` would inherit vitest's argv state, which is brittle.

### Assistant | 2026-05-14T01:11:35.401Z

[tool_use: Bash]

### User | 2026-05-14T01:11:40.001Z

[tool_result] mcp-server/src/__tests__/ModelTelemetry.test.ts:34
mcp-server/src/__tests__/AdaptRouterThresholds.test.ts:16
mcp-server/src/__tests__/devDispatcher.modelTelemetry.test.ts:9

### Assistant | 2026-05-14T01:11:43.417Z

[tool_use: Bash]

### User | 2026-05-14T01:11:46.438Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T01:11:49.476Z

Now I have enough evidence to render verdict. Let me also verify the .mjs export resolution works in tests.

### Assistant | 2026-05-14T01:11:50.408Z

[tool_use: Bash]

### User | 2026-05-14T01:11:55.903Z

[tool_result] 21:import { runAdaptation } from "../../../scripts/adapt-router-thresholds.mjs";

### Assistant | 2026-05-14T01:11:58.911Z

[tool_use: Bash]

### User | 2026-05-14T01:12:02.318Z

[tool_result] /**
 * Vitest configuration for mcp-server.
 *
 * OBSIDIAN-AUTOMATE-MS3/U-VITEST-PARALLEL
 *
 * Why this exists: mcp-server's test suite is ~3400 cases. Default Vitest
 * concurrency runs file-level workers fine but PRISM had no top-level
 * vitest.config so isolate/pool behaviour was implicit. Pinning the pool
 * and worker counts to the host gives deterministic timing and unlocks
 * the
... [+1372 chars truncated]

### Assistant | 2026-05-14T01:12:04.808Z

[tool_use: Bash]

### User | 2026-05-14T01:12:09.012Z

[tool_result] 8: * vitest.config so isolate/pool behaviour was implicit. Pinning the pool
23: * startup cost and share the V8 isolate cache.
40:        // Keep workers isolated so a test that mutates module-level state
42:        isolate: true,

### Assistant | 2026-05-14T01:12:17.823Z

OK, `isolate: true` means each test file gets its own module cache. So the singleton-vs-env race in `devDispatcher.modelTelemetry.test.ts` (P1 finding) is per-file: when that test file is loaded, `process.env.PRISM_MODEL_TELEMETRY_PATH` is set BEFORE the dynamic `await import("../engines/ModelTelemetryEngine.js")` happens inside `buildPrismDevHandler()`'s transitive imports. The singleton resolves at first-import-time of that file.

Wait — the env var is set in line 79 inside `it()`. `buildPrismDevHandler()` is called on line 82, which calls `registerDevDispatcher`. The engine isn't imported until the lazy import in `case "model_telemetry_log":` at handler-invocation time (line 4367 of devDispatcher.ts). So the env var IS in place at the first import — good. But the second test case on line 133 sets a DIFFERENT path, and the singleton was already constructed on the first call. So the second `it` writes to the FIRST test's temp dir.

Wait, `await import()` caches the module. Once the engine is imported, `modelTelemetryEngine` is the same instance across all subsequent imports within that worker. The first `process.env` setting wins; subsequent test cases inherit it.

### Assistant | 2026-05-14T01:12:21.483Z

[tool_use: Read]

### User | 2026-05-14T01:12:22.220Z

[tool_result] 130	    }
131	  });
132	
133	  it("rejects invalid telemetry log input through the dispatcher (Zod parse fail)", async () => {
134	    const dir = makeFixtureDir("log-reject");
135	    const jsonl = path.join(dir, "model-telemetry.jsonl");
136	    process.env.PRISM_MODEL_TELEMETRY_PATH = jsonl;
137	    try {
138	      const handler = await buildPrismDevHandler();
139	      const resp = await handl
... [+637 chars truncated]

### Assistant | 2026-05-14T01:13:20.153Z

The second test rejects via Zod-fail BEFORE any disk write, so the stale singleton path doesn't matter for *that* specific test. The third test (`model_telemetry_purge`) sets a path but never logs anything — just calls purgeOlderThan(-100), which is rejected by the `Number.isFinite/<0` check in the dispatcher before reaching the engine. So the singleton-path-leak doesn't manifest as a test failure, but it's a fragility.

Now I have enough to render verdict.

---

VERDICT: FAIL

The 3-of-3 gate's intent is "any P0 or material P1 fails the arm." I'm flagging this as FAIL on the basis of two P0 findings — one is a real production bug (the adaptive feedback loop is incomplete), the other is a missing schema row that the codebase's own §SCHEMA + §DISPATCHER conventions mandate.

## P0 findings

**P0-1 — Adaptive feedback loop is half-wired. `applyAdaptiveState()` is never invoked at boot.**
- `mcp-server/src/engines/ModelRoutingEngine.ts:328` (`applyAdaptiveState`)
- `scripts/adapt-router-thresholds.mjs:283` (`writeAdaptationState`) — writes `router-adaptation-state.json` weekly.
- Reverse-grep shows zero non-test callers of `applyAdaptiveState`. `LocalModelOrchestratorEngine.ts:95` uses `modelRoutingEngine` but does not load the state. `devDispatcher.ts:4397` `router_adaptation_status` reads the file for display only — it never calls `applyAdaptiveState`.
- Result: the tuner publishes decisions to disk, but production routing never consumes them. The P23-U02 close-out claims "Patches `ModelRoutingEngine`'s in-memory catalog at runtime" — that's aspirational, not implemented. The docstring on `applyAdaptiveState` says "called at process boot" — nothing boots it.
- Fix: either (a) auto-load in `ModelRoutingEngine.constructor()` from a canonical path if it exists, or (b) call from `index.ts`/`server.ts` boot, or (c) ship a `prism_dev:adaptive_state_apply` action so cron + boot can fire it.

**P0-2 — No Zod schemas for the 4 new dispatcher actions.**
- `mcp-server/src/schem
... [+7910 chars truncated]
