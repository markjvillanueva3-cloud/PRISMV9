---
type: "chat-session"
source: "claude-code-cli"
session_id: "1981bb83-0e76-4058-af8a-a99dd99987be"
title: "Read-only investigation (MCP server is DOWN — use ONLY Read/Grep/Glob, NO mcp__p"
date: "2026-05-30"
first_ts: "2026-05-30T02:24:55.911Z"
last_ts: "2026-05-30T02:32:24.774Z"
cwd: "H:\\prism-slot-kilo"
messages: 102
user_msgs: 39
assistant_msgs: 63
raw_file: "H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_a0be3ab8-f4c/agent-aea02876a7afba339.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# Read-only investigation (MCP server is DOWN — use ONLY Read/Grep/Glob, NO mcp__p

> **claude-code-cli** | 2026-05-30 | 102 msgs (39 user / 63 assistant) | cwd: H:\prism-slot-kilo
> Raw: `H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_a0be3ab8-f4c/agent-aea02876a7afba339.jsonl`

## Transcript

### User | 2026-05-30T02:24:55.911Z

Read-only investigation (MCP server is DOWN — use ONLY Read/Grep/Glob, NO mcp__prism tools). Repo: H:/prism (and worktree H:/prism-slot-kilo).

QUESTION: How does the DELTA slot (CAD galaxy) actually CONTROL / DRIVE the CAD software (Creo, Fusion, etc.)? Is it true live-drive (executing create/modify commands in the running app) or PRISM-side modeling/enumeration only?

Investigate concretely:
- The dispatchers/actions named in delta's galaxy: cad_atomic_ops, cad_creo_ribbon. Find them (grep "cad_atomic_ops"/"cad_creo_ribbon"/"creo_ribbon" in mcp-server/src/tools/dispatchers/ and engines/). Read the engine(s) behind them.
- Look in mcp-server/src/engines/cad/ (CLAUDE.md, MEMORY.md, PATHS.md) and any Creo/Fusion *Bridge*/*Ribbon*/*AtomicOps* engines.
- Determine the MECHANISM: does delta generate an add-in/plugin that runs INSIDE the CAD app and exposes an HTTP/socket endpoint PRISM calls? Does it call a live API to create features/sketches? Or does it only model the ribbon/feature-tree PRISM-side without touching the live app?
- Is there evidence of an actual round-trip: PRISM command -> CAD app executes -> result back? Or is it catalog/representation only (like a parameter dictionary)?
Be precise and grounded. Quote the file paths. If delta is ALSO enumeration/representation-only (not true live drive), say so plainly — do not assume it drives just because the slot domain is "CAD".

### Assistant | 2026-05-30T02:25:06.162Z

I'll investigate how the DELTA slot (CAD galaxy) actually controls or drives CAD software. Let me start by finding the dispatchers and engines named in delta's galaxy.

### Assistant | 2026-05-30T02:25:07.620Z

[tool_use: Grep]

### Assistant | 2026-05-30T02:25:08.032Z

[tool_use: Glob]

### User | 2026-05-30T02:25:34.024Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-30T02:25:34.258Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-30T02:25:36.764Z

The repo is large. Let me narrow the search paths.

### Assistant | 2026-05-30T02:25:37.056Z

[tool_use: Glob]

### User | 2026-05-30T02:26:24.554Z

[tool_result] H:/prism/mcp-server/src/engines/cad\CLAUDE.md
H:/prism/mcp-server/src/engines/cad\PATHS.md
H:/prism/mcp-server/src/engines/cad\TOOLBELT.md
H:/prism/mcp-server/src/engines/cad\MEMORY.md

### Assistant | 2026-05-30T02:26:26.920Z

The `cad/` engine dir only has docs (the galaxy "brain"), no actual engine code. Let me read these docs and search the dispatchers directory.

### Assistant | 2026-05-30T02:26:27.398Z

[tool_use: Read]

### Assistant | 2026-05-30T02:26:27.829Z

[tool_use: Read]

### User | 2026-05-30T02:26:30.762Z

[tool_result] 1	# CAD Galaxy MEMORY.md — per-domain memory cascade index (2026-05-27)
2	
3	> Per SCOPE-EXPANSION §Q2. Auto-loads when editing under `engines/cad/`. STUB / awaiting U-GALAXY-MS1-C1 migration + cad-soul slot assignment.
4	
5	## Master-brain link
6	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="cad" topK=20`
7	- **DOWN (pu
... [+1830 chars truncated]

### User | 2026-05-30T02:26:31.470Z

[tool_result] 1	# CAD Galaxy PATHS.md — H:/-wide path atlas for slot:delta
2	
3	> Highest-ROI artifact: converts every future Grep/Glob from O(N) → O(1) for CAD work. Sourced from [[reference_cad_domain_map_for_delta_2026_05_27]] (4-parallel-agent hunt, iter112). Format: `<path> | <purpose> | <maintainer>`.
4	>
5	> **External corpus + software + launchers:** this file covers repo/engine paths; for the **129,306
... [+6916 chars truncated]

### Assistant | 2026-05-30T02:26:38.739Z

The PATHS.md names the key engines. I see `MastercamCADExecutionBridge.ts`, `SolidWorksCADExecutionBridge.ts`, `Fusion360CADGeneratorAdapter.ts`, and various `*CodeGenerator*` engines. The naming distinction is important: "ExecutionBridge" vs "CodeGenerator". Let me read the CLAUDE.md brain and find the actual engine files. MCP is down so I'll use Read/Grep/Glob only.

### Assistant | 2026-05-30T02:26:39.218Z

[tool_use: Read]

### Assistant | 2026-05-30T02:26:39.631Z

[tool_use: Read]

### User | 2026-05-30T02:26:57.326Z

[tool_result] 1	# CAD Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-27 — HONEST STUB)
2	
3	> **Bibryam Context Cascade pattern (Pillar P1).** Auto-loads when Claude edits under `mcp-server/src/engines/cad/`. Root + engines/baseline CLAUDE.md inherit; this covers cad-specific surface.
4	>
5	> ## ⚠ HONEST STUB — alpha (mill specialist) is NOT the cad specialist
6	>
7	> **Canonical cad slot per JULI
... [+4332 chars truncated]

### User | 2026-05-30T02:26:57.335Z

[tool_result] 1	# CAD Galaxy TOOLBELT.md — tool-call efficiency for slot:delta
2	
3	> Memoized Grep/Glob/Bash/Read/git/dispatcher patterns delta reaches for most. Each entry saves tokens or time vs. the naive alternative. Sourced from [[reference_delta_cad_toolchain_session_2026_05_27]].
4	
5	## prism_* dispatcher actions used most (route BEFORE Grep — soul: route-before-grep)
6	- `prism_session:master_index_qu
... [+4555 chars truncated]

### Assistant | 2026-05-30T02:27:01.589Z

Now I have the key file names. The critical question is the mechanism. Let me read the actual engine files. The naming tells a story: "ExecutionBridge" (SolidWorks, Mastercam) vs "CodeGenerator"/"Adapter" (Inventor, Fusion360, FreeCAD, HyperCAD-S). Let me read the SolidWorks bridge first (the one named "ExecutionBridge") and the dispatchers.

### Assistant | 2026-05-30T02:27:01.957Z

[tool_use: Read]

### User | 2026-05-30T02:27:05.031Z

[tool_result] 1	/**
2	 * SolidWorksCADExecutionBridge — planning↔execution bridge for SolidWorks CAD ops.
3	 *
4	 * Mirrors the AutodeskFusionMCPProxyEngine.executeOperation() pattern but emits
5	 * a VBA macro scaffold instead of a Python script, because SolidWorks does NOT
6	 * yet ship a public MCP-style remote endpoint. The live execution path is the
7	 * COM bridge (SolidWorksAutomationBridge.ts) which is 
... [+15339 chars truncated]

### Assistant | 2026-05-30T02:27:09.607Z

This is a major finding. The `SolidWorksCADExecutionBridge` is explicitly **NOT live drive** — it's a dry-run VBA macro scaffold generator with operator-in-the-loop. But its docstring references two important things: `AutodeskFusionMCPProxyEngine` (which it says mirrors the pattern but emits Python) and `SolidWorksAutomationBridge.ts` (the "live COM verb set"). Let me read both of those plus the Mastercam bridge and the dispatchers.

### Assistant | 2026-05-30T02:27:09.974Z

[tool_use: Read]

### User | 2026-05-30T02:27:12.519Z

[tool_result] 1	/**
2	 * SolidWorksAutomationBridge — PRISM-side TypeScript host for SolidWorks COM automation.
3	 *
4	 * CAD-AUTOMATION-MS0 / U-CAUT02
5	 *
6	 * Architecture:
7	 *   TypeScript (this file) ──execFile──> SolidWorksBridge.exe
8	 *                          <──── newline-delimited JSON stdout ──────
9	 *
10	 * The C# bridge hosts SldWorks.Application via COM interop. This engine spawns
11	 * it on 
... [+14602 chars truncated]

### Assistant | 2026-05-30T02:27:16.657Z

Now this is concrete and significant. `SolidWorksAutomationBridge` IS a live-drive bridge — it spawns a compiled C# `SolidWorksBridge.exe` that hosts `SldWorks.Application` via COM interop, sends JSON commands over stdin, reads JSON responses. But the verb set is **read/export only**: `open, getFeatureTree, exportSTEP, exportPDF, getBoundingBox, close`. There is NO create/extrude/sketch verb. Let me check whether the bridge exe actually exists and read the Fusion proxy + Mastercam bridge.

### Assistant | 2026-05-30T02:27:17.340Z

[tool_use: Glob]

### Assistant | 2026-05-30T02:27:17.580Z

[tool_use: Read]

### User | 2026-05-30T02:27:20.438Z

[tool_result] H:/prism/mcp-server/bridges\inventor\InventorBridge.cs
H:/prism/mcp-server/bridges\solidworks\SolidWorksBridge.cs
H:/prism/mcp-server/bridges\inventor\README.md
H:/prism/mcp-server/bridges\solidworks\README.md
H:/prism/mcp-server/bridges\mastercam\MastercamNetHook.cs
H:/prism/mcp-server/bridges\mastercam\README.md

### User | 2026-05-30T02:27:21.473Z

[tool_result] 1	/**
2	 * MastercamCADExecutionBridge — planning↔execution bridge for Mastercam CAD ops.
3	 *
4	 * Mirrors SolidWorksCADExecutionBridge / InventorCADExecutionBridge but emits
5	 * a C# NET-Hook scaffold (Mastercam's managed add-in API surface) instead of
6	 * VBA / iLogic. Mastercam exposes its automation surface through compiled C#
7	 * add-ins built against `Mastercam.IO`, `Mastercam.Curves`, `
... [+15356 chars truncated]

### Assistant | 2026-05-30T02:27:27.194Z

The picture is sharpening. The `*CADExecutionBridge` engines (SolidWorks, Mastercam, Inventor) are all **dry-run code-scaffold generators** — they emit VBA/C#/iLogic source that an operator pastes, builds, runs, and verifies manually. The docstrings explicitly say "Pure dry-run by design — operator-in-the-loop preserved." But there's a separate `*AutomationBridge` family that IS live (COM via compiled .exe), limited to read/export verbs. 

Now the key question for delta's named actions `cad_atomic_ops` and `cad_creo_ribbon`. Let me find those specifically, plus the Fusion proxy and the Creo bridge. Let me also read the actual bridge C# / README to confirm the live verb set.

### Assistant | 2026-05-30T02:27:28.612Z

[tool_use: Grep]

### Assistant | 2026-05-30T02:27:29.056Z

[tool_use: Glob]

### Assistant | 2026-05-30T02:27:29.153Z

[tool_use: Glob]

### User | 2026-05-30T02:27:32.644Z

[tool_result] H:/prism/mcp-server/src/engines\CreoToolkitBridgeEngine.ts
H:/prism/mcp-server/src/engines\CreoAddinRibbonEngine.ts
H:/prism/mcp-server/src/engines\CreoIntegrationTestSuiteEngine.ts
H:/prism/mcp-server/src/engines\CreoFunctionIndexEngine.ts

### User | 2026-05-30T02:27:32.881Z

[tool_result] H:/prism/mcp-server/src/engines\SensorFusionEngine.ts
H:/prism/mcp-server/src/engines\FusionToolSyncEngine.ts
H:/prism/mcp-server/src/engines\FusionCPSParserEngine.ts
H:/prism/mcp-server/src/engines\PhysicsFusionOrchestrator.types.ts
H:/prism/mcp-server/src/engines\PhysicsFusionConvergenceEngine.ts
H:/prism/mcp-server/src/engines\PhysicsFusionOrchestratorEngine.ts
H:/prism/mcp-server/src/engines\F
... [+2737 chars truncated]

### User | 2026-05-30T02:27:33.096Z

[tool_result] No files found

### Assistant | 2026-05-30T02:27:37.939Z

The `cad_atomic_ops` / `cad_creo_ribbon` action names don't appear literally in dispatchers — they're likely paraphrased in the MEMORY.md index. The real engines are `CreoAddinRibbonEngine`, `CreoToolkitBridgeEngine`, `AutodeskFusionMCPProxyEngine`, `Fusion360LiveBridgeEngine`, `Fusion360InHostRunnerEngine`. Let me read the most live-drive-relevant ones: the Creo ribbon/toolkit engines, the Fusion MCP proxy, and the Fusion live bridge. Also the bridge READMEs.

### Assistant | 2026-05-30T02:27:40.980Z

[tool_use: Read]

### Assistant | 2026-05-30T02:27:41.096Z

[tool_use: Read]

### system

... [22 middle messages omitted -- see raw_file] ...

### User | 2026-05-30T02:29:29.384Z

[tool_result] 317	  async executeOperation(
318	    moduleId: string,
319	    operationId: string,
320	    params: Record<string, unknown>
321	  ): Promise<{ script: string; result: MCPToolCallResult }> {
322	    const { Fusion360CADFunctionIndexEngine } = await import("./Fusion360CADFunctionIndexEngine.js");
323	    const op = Fusion360CADFunctionIndexEngine.getOperation(moduleId, operationId);
324	    if (!op
... [+2797 chars truncated]

### User | 2026-05-30T02:29:30.537Z

[tool_result] No files found

### User | 2026-05-30T02:29:30.905Z

[tool_result] H:/prism/mcp-server/src/engines\Fusion360LiveBridgeEngine.ts

### Assistant | 2026-05-30T02:29:39.492Z

No production `CreoTransport` implementation file exists (only the interface + injected stubs). The Fusion proxy renders Python and ships it via real HTTP. Now the critical wiring question: are these engines actually wired into a dispatcher so a PRISM command can reach them? Let me check the dispatchers and whether the Fusion proxy / Creo engines are instantiated anywhere. Let me read the Fusion360LiveBridgeEngine head and check dispatcher wiring.

### Assistant | 2026-05-30T02:29:40.440Z

[tool_use: Read]

### Assistant | 2026-05-30T02:29:40.675Z

[tool_use: Glob]

### User | 2026-05-30T02:29:42.638Z

[tool_result] 1	/**
2	 * Fusion360LiveBridgeEngine — PRISM-side client for the Fusion 360 API Server Add-In.
3	 * Communicates with the add-in's HTTP server running inside Fusion 360 on localhost:18360.
4	 *
5	 * Provides typed methods for all CAD operations: sketch, extrude, fillet, chamfer,
6	 * revolve, hole, pattern, combine, shell, export, undo, parameters, and raw code execution.
7	 *
8	 * Also supports e
... [+2278 chars truncated]

### User | 2026-05-30T02:29:43.557Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers\cadDrawingKnowledgeDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers\cadAutomationDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers\cadRegressionDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers\cadDispatcher.ts

### Assistant | 2026-05-30T02:29:47.868Z

Another live-drive engine: `Fusion360LiveBridgeEngine` is a PRISM-side HTTP client for a **custom Fusion 360 API Server Add-In** running inside Fusion on `localhost:18360`, with typed methods for sketch/extrude/fillet/chamfer/revolve/hole/pattern/combine/shell — full create/modify, plus "video-to-live-CAD replay" via ExtractedAction sequences. This is a second, distinct live-drive transport (separate from Autodesk's official MCP server on :27182).

Now the wiring question — does `cadAutomationDispatcher.ts` actually route to these live engines? Let me read it.

### Assistant | 2026-05-30T02:29:48.428Z

[tool_use: Read]

### User | 2026-05-30T02:29:54.826Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1151 of 4954 total (91442 tokens, cap 25000). Call Read with offset=1152 limit=1151 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * prism_cad_automation â€” CAD Automation Dispatcher
3	 *
4	 * Wires the unified CADAutomationR
... [+49825 chars truncated]

### Assistant | 2026-05-30T02:30:06.362Z

The dispatcher confirms the critical architecture. The key actions for live drive:
- `execute_script` → routes through `CADAdapterRegistry.getCADAdapter()` → `adapter.executeScript(script)`, and reports `requires_live_host: cadAdapterRequiresLiveHost(cadSystem)`.
- `orchestrate_intent` → `MasterCADControlBrainEngine.orchestrate()` — full chain intent → select_cad → plan → build → (execute) → validate, with an `executionResult`.

So the wiring exists. The decisive question is what `adapter.executeScript()` actually does for each CAD system, and whether `requires_live_host` is true. Let me read the `CADAdapterRegistry` and one concrete adapter (the Fusion360 one, since the official MCP path is the most real live-drive). Let me also check the FreeCAD code generator since that one might actually run a subprocess headlessly.

### Assistant | 2026-05-30T02:30:06.602Z

[tool_use: Read]

### User | 2026-05-30T02:30:09.386Z

[tool_result] 1	/**
2	 * CADAdapterRegistry — U-CUIX-P0-19 / CAD-UIX-MS0
3	 *
4	 * Central registry mapping `CADSystemId` → ICADCodeGenerator adapter singleton.
5	 * The `cadAutomationDispatcher` uses this to route build_script / execute_script /
6	 * validate_script / list_capabilities / list_systems actions to the correct
7	 * adapter without the dispatcher importing every adapter directly (lazy
8	 * import p
... [+7958 chars truncated]

### Assistant | 2026-05-30T02:30:13.823Z

Important nuance: `requiresLiveHost: true` is set for all 4 registered adapters (freecad, fusion360, inventor, mastercam), and Creo/SolidWorks/etc. are declared-but-unregistered. The decisive question is what `executeScript()` actually does — does it spawn/POST to a live host, or just return the script as a dry-run artifact? Let me read the FreeCAD adapter's `executeScript` (FreeCAD can run headless via subprocess, the most likely true automation) and the Fusion360 code generator adapter's `executeScript`.

### Assistant | 2026-05-30T02:30:16.184Z

[tool_use: Grep]

### Assistant | 2026-05-30T02:30:17.397Z

[tool_use: Grep]

### User | 2026-05-30T02:30:20.687Z

[tool_result] 28: * Execution (runScriptBody): spawns FreeCADCmd in a child process with the
36:import { spawn } from "node:child_process";
130:    requiresSubprocess: true,
140:  // constructor. Allow override of spawner for tests.
141:  private readonly spawnFn: typeof spawn;
143:  constructor(opts: { spawnFn?: typeof spawn } = {}) {
145:    this.spawnFn = opts.spawnFn ?? spawn;
839:        const proc = this.
... [+92 chars truncated]

### User | 2026-05-30T02:30:20.880Z

[tool_result] No matches found

### Assistant | 2026-05-30T02:30:24.758Z

FreeCAD is the real one. Let me read the FreeCAD `executeScript`/`runScriptBody` region around line 820-860 to confirm it actually spawns `FreeCADCmd` and runs the script (true headless drive). Then read the Fusion360 code generator's executeScript (no spawn/fetch found there — likely returns dry-run, meaning the live path for Fusion is via the separate MCPProxy/LiveBridge engines, not this adapter).

### Assistant | 2026-05-30T02:30:25.640Z

[tool_use: Read]

### User | 2026-05-30T02:30:30.629Z

[tool_result] 800	      em.warn(`parameter ${name} missing value`, "warn");
801	      return;
802	    }
803	    em.parameter(name, value as number | string | boolean, unit);
804	    const pyVal = typeof value === "string" ? JSON.stringify(value) : String(value);
805	    em.line(`${name} = ${pyVal}  # ${unit}`);
806	  }
807	
808	  private emitParameterEquation(op: CADOperation, em: CADEmitter): void {
809	    co
... [+2771 chars truncated]

### Assistant | 2026-05-30T02:30:37.174Z

That confirms FreeCAD is genuine headless live drive: `runScriptBody` spawns `FreeCADCmd -c <script.body>` as a child process, captures stdout/stderr, and reports ok/metrics. This actually executes generated Python in FreeCAD's interpreter to build geometry. The note "Actual execution harness lives in U-CADC06 (freecad-executor.py)" indicates a more complete harness was planned, but the spawn path itself is real.

I now have enough to characterize each transport precisely. Let me do two final confirming reads: the Fusion360 code generator adapter's `runScriptBody` (to confirm it's dry-run, contrasting with the MCPProxy/LiveBridge live paths), and check the bridge READMEs for Inventor/Mastercam to confirm verb sets. Let me grep the Fusion360CodeGeneratorEngine for runScriptBody and read the Inventor/Mastercam bridge READMEs.

### Assistant | 2026-05-30T02:30:41.693Z

[tool_use: Grep]

### User | 2026-05-30T02:30:47.952Z

[tool_result] 1695:  protected async runScriptBody(
1696-    script: { body: string; cadSystem: CADSystemId },
1697-  ): Promise<CADExecutionResult> {
1698-    const isMock = process.env.PRISM_CAD_MOCK === "true" || process.env.CI === "true";
1699-
1700-    if (isMock) {
1701-      log.debug("Fusion360CodeGeneratorEngine: mock execution mode");
1702-      return {
1703-        ok: true,
1704-        output: "Mo
... [+332 chars truncated]

### Assistant | 2026-05-30T02:30:50.797Z

Let me read the rest of the Fusion360 `runScriptBody` (post-mock branch) to see what the non-mock path does — this determines whether `execute_script` for fusion360 actually drives the live app or returns an artifact.

### Assistant | 2026-05-30T02:30:51.727Z

[tool_use: Read]

### User | 2026-05-30T02:30:56.462Z

[tool_result] 1711	        },
1712	      };
1713	    }
1714	
1715	    log.info("Fusion360CodeGeneratorEngine: real execution via HTTP bridge");
1716	    return {
1717	      ok: false,
1718	      error: "Real Fusion 360 execution requires HTTP add-in bridge (not configured)",
1719	      durationMs: 0,
1720	    };
1721	  }
1722	}
1723	
1724	// ── Singleton export ──────────────────────────────────────────────────
... [+104 chars truncated]

### Assistant | 2026-05-30T02:31:02.443Z

That's the decisive contrast. The `Fusion360CodeGeneratorEngine` (the adapter registered in `CADAdapterRegistry` for `execute_script`) does NOT actually drive Fusion in its real path — non-mock returns `ok: false, error: "Real Fusion 360 execution requires HTTP add-in bridge (not configured)"`. So the dispatcher-wired `execute_script` path for fusion360 is a stub for live execution; only the script-build is real. The genuine live drive for Fusion lives in the SEPARATE `AutodeskFusionMCPProxyEngine` (:27182) and `Fusion360LiveBridgeEngine` (:18360) — which I need to confirm are NOT wired into the dispatcher.

Let me do a final targeted check: is `AutodeskFusionMCPProxyEngine` or `Fusion360LiveBridgeEngine` referenced by any dispatcher, and read the Inventor/Mastercam bridge READMEs to confirm their verb sets.

### Assistant | 2026-05-30T02:31:04.343Z

[tool_use: Grep]

### Assistant | 2026-05-30T02:31:04.552Z

[tool_use: Read]

### User | 2026-05-30T02:31:08.987Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\cadDrawingKnowledgeDispatcher.ts:8: * Wires to: cadDispatcher (existing), Fusion360CodeGeneratorEngine, Fusion360LiveBridgeEngine,
H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts:12: *   Fusion360CodeGeneratorEngine, Fusion360LiveBridgeEngine
H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts:40:    case "f360Bridge": return _f360Bridge 
... [+2059 chars truncated]

### User | 2026-05-30T02:31:09.189Z

[tool_result] 1	# MastercamNetHook — PRISM Bridge DLL
2	
3	## What It Does
4	
5	Loaded in-process by Mastercam.exe via the `-runchook` argument.  
6	Opens a named pipe (`\\.\pipe\prism-mcam-{pid}`) and services JSON commands  
7	sent by the TypeScript `MastercamAutomationBridge` engine in PRISM.
8	
9	## Build Requirements
10	
11	| Item | Value |
12	|------|-------|
13	| .NET Framework | 4.8 (matches Mastercam's
... [+4923 chars truncated]

### Assistant | 2026-05-30T02:31:16.066Z

Now I have a complete and grounded picture. Key wiring confirmation:
- `Fusion360LiveBridgeEngine` IS wired into the live dispatchers: `cadDispatcher.ts` (line 40 lazy singleton `f360Bridge`, used at line 2301) and `camDispatcher.ts` (lines 11983-11998). This is the genuine live-drive path (HTTP to the custom add-in on :18360 with sketch/extrude/fillet verbs).
- `SolidWorksAutomationBridge` IS wired into `camDispatcher.ts` (line 457 `swAutoBridge`, lines 14282-14325) — but only the read/export verbs (open/getFeatureTree/exportSTEP/exportPDF/getBoundingBox/close).
- `AutodeskFusionMCPProxyEngine` and `CreoToolkitBridgeEngine` are NOT referenced by any dispatcher — built but unwired to the MCP action surface.

Let me read the one concrete dispatcher call site for `fusion360LiveBridgeEngine` in `cadDispatcher.ts` to confirm a real create/modify round-trip is invoked, then I have everything.

### Assistant | 2026-05-30T02:31:16.847Z

[tool_use: Read]

### User | 2026-05-30T02:31:19.562Z

[tool_result] 2285	              data: {
2286	                sequence: evidence.sequence,
2287	                count: evidence.sequence.length,
2288	                caveats: evidence.caveats,
2289	                corpus_class_found: evidence.corpus_class_found,
2290	                corpus_report_path: reportPath,
2291	                corpus_read_error: corpusReadError,
2292	                degraded: corpusRead
... [+3560 chars truncated]

### Assistant | 2026-05-30T02:31:25.177Z

This is the definitive live-drive proof. The `cadDispatcher.ts` action `cad_class_drive_build` performs an actual round-trip: it imports `fusion360LiveBridgeEngine`, does a `healthCheck()` against the live Fusion add-in (`localhost:18360`), and if up, dispatches per-feature build commands (extrude/revolve/fillet/etc., with `distance_mm`/`radius_mm`/`angle_deg` params) into the live Fusion design — with a `dry_run` toggle. This is PRISM-command → live-Fusion-executes → result-back. The action name even contains "drive".

I have a complete, grounded picture across all transports. Let me record the final structured answer.

### Assistant | 2026-05-30T02:32:07.341Z

[tool_use: StructuredOutput]

### User | 2026-05-30T02:32:08.478Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-30T02:32:24.774Z

I've completed the investigation. Here's the grounded verdict on how the DELTA slot (CAD galaxy) drives CAD software:

## Bottom line: PARTIAL live-drive, not uniform

Delta is **mostly PRISM-side modeling + code-generation**, but it does have genuine live-drive for a *subset* of CAD apps — with very different capability per app. The slot domain being "CAD" does NOT mean it drives every app; the mechanism varies sharply by vendor.

### Three transport classes coexist

**1. True live create/modify (real round-trip)**
- `Fusion360LiveBridgeEngine.ts` — PRISM-side HTTP client to a **custom Fusion add-in on `localhost:18360`** with typed sketch/extrude/fillet/chamfer/revolve/hole/pattern verbs. **Wired** into `cadDispatcher.ts` action `cad_class_drive_build` (line 2301) and `camDispatcher.ts`: it does `healthCheck()` → per-feature build into the live design → result back, with a `dry_run` toggle. The action name literally says "drive_build."
- `AutodeskFusionMCPProxyEngine.ts` — JSON-RPC client to **Autodesk's official Fusion MCP server (`127.0.0.1:27182/mcp`)**; `fusion_mcp_execute` runs generated Python in the live design. Genuine, but **UNWIRED** to any dispatcher (orphan).
- `FreeCADCodeGeneratorEngine.ts` — `runScriptBody` actually `spawn`s `FreeCADCmd -c <script>` headlessly (real subprocess execution).

**2. Live read/export only (no create)**
- `SolidWorksAutomationBridge.ts` — spawns compiled C# `SolidWorksBridge.exe` (COM → `SldWorks.Application`), but verbs are limited to `open/getFeatureTree/exportSTEP/exportPDF/getBoundingBox/close`. Wired into `camDispatcher.ts`. Mastercam (`MastercamNetHook` named-pipe) and Inventor are the same read/export pattern.

**3. Dry-run code-gen only (no live drive at all)**
- `SolidWorksCADExecutionBridge.ts` / `MastercamCADExecutionBridge.ts` / Inventor — explicitly "Pure dry-run by design — operator-in-the-loop preserved." They emit VBA/C#/iLogic scaffolds an operator pastes and runs manually.
- `CreoToolkitBridgeEngine.ts` —
... [+1132 chars truncated]
