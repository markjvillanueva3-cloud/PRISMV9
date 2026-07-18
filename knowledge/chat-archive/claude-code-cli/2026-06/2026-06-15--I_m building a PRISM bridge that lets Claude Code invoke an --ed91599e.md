---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "I'm building a PRISM bridge that lets Claude Code invoke an external app (Hermes"
date: "2026-06-15"
first_ts: "2026-06-15T00:52:45.247Z"
last_ts: "2026-06-15T00:57:38.381Z"
cwd: "H:\\prism-slot-sierra"
messages: 66
user_msgs: 28
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a3b9747210b8444e4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# I'm building a PRISM bridge that lets Claude Code invoke an external app (Hermes

> **claude-code-cli** | 2026-06-15 | 66 msgs (28 user / 38 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a3b9747210b8444e4.jsonl`

## Transcript

### User | 2026-06-15T00:52:45.247Z

I'm building a PRISM bridge that lets Claude Code invoke an external app (Hermes CLI) in a SANDBOXED way, mirroring the existing CIMCO/Fusion/WinMax bridges. Report the exact sandbox + launch + exec patterns I must reuse. Repo root H:/prism. Be concrete and concise with file paths + key code.

EXAMINE:
1. `mcp-server/src/engines/PluginSandboxPolicyEngine.ts` — read it. What is its API (methods, policy shape)? How does a caller declare an allowed external command / sandbox boundary? What does it gate (filesystem, exec, network)? How is it wired to a dispatcher?
2. How existing bridges actually LAUNCH / EXEC an external process safely:
   - `scripts/cimco-launch-probe.mjs` and `scripts/cimco-fleet-drive.mjs` and `scripts/cimco-sim-driver.mjs` — how do they spawn/drive CIMCO? (child_process spawn/execFile? a .ps1? mock-default?)
   - `scripts/winmax-driver.mjs` and `scripts/winmax-launch.ps1` — the launch pattern.
   - `mcp-server/src/engines/Fusion360AutomationBridge.ts` — the AutomationBridge engine pattern (transport, mock mode, AtomicValue, dispatcher wiring).
3. The COMMON pattern across them: MOCK-by-default env flag, AtomicValue {value,confidence,source,warning} return, never-auto-launch / operator-supervised safety, fail-soft (R12, never fabricate). Confirm and give the canonical shape.
4. Which dispatcher are these bridges wired into (cimco/winmax/fusion actions)? Grep dispatchers for cimco/winmax/fusion/sandbox actions so I know where a `hermes_*` action would go.

Report: the PluginSandboxPolicyEngine API + the canonical safe-exec/launch pattern (with a representative code snippet) + the dispatcher wiring location for a new external-app bridge. Cite paths.

### Assistant | 2026-06-15T00:52:47.905Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:52:48.701Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:52:48.702Z

[tool_use: Glob]

### User | 2026-06-15T00:52:50.414Z

[tool_result] H:\prism\mcp-server\src\engines\BatchProcessor.ts
H:\prism\mcp-server\src\engines\DfMRulesEngine.ts
H:\prism\mcp-server\src\engines\DiffEngine.ts
H:\prism\mcp-server\src\engines\FinancialAnalysisEngine.ts
H:\prism\mcp-server\src\engines\GCodeTemplateEngine.ts
H:\prism\mcp-server\src\engines\IntentDecompositionEngine.ts
H:\prism\mcp-server\src\engines\PurchasingDirectoryEngine.ts
H:\prism\mcp-serve
... [+5206 chars truncated]

### User | 2026-06-15T00:53:05.995Z

[tool_result] No files found

### User | 2026-06-15T00:53:06.057Z

[tool_result] No files found

### Assistant | 2026-06-15T00:53:08.349Z

I'll systematically read all the relevant files in parallel to build a complete picture before reporting.

### Assistant | 2026-06-15T00:53:09.174Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:53:09.934Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:53:10.395Z

[tool_use: Glob]

### User | 2026-06-15T00:53:24.396Z

[tool_result] No files found

### User | 2026-06-15T00:53:24.476Z

[tool_result] No files found

### User | 2026-06-15T00:53:25.828Z

[tool_result] No files found

### Assistant | 2026-06-15T00:53:28.254Z

The files aren't at those paths. Let me search for the actual file locations first.

### Assistant | 2026-06-15T00:53:29.809Z

[tool_use: Bash]

### User | 2026-06-15T00:54:38.216Z

[tool_result] H:/prism/mcp-server/src/engines/PluginSandboxPolicyEngine.ts
H:/prism/.claude/worktrees/rgs6-audit-v2/mcp-server/src/engines/Fusion360AutomationBridge.ts
H:/prism/mcp-server/src/engines/Fusion360AutomationBridge.ts
H:/prism/prism-test-6d0595/mcp-server/src/engines/Fusion360AutomationBridge.ts
H:/prism/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/workflows/scripts/cimco-post-proof
... [+11821 chars truncated]

### Assistant | 2026-06-15T00:54:40.589Z

Good, now I have the real paths. Let me read all the key files in parallel.

### Assistant | 2026-06-15T00:54:41.414Z

[tool_use: Read]

### Assistant | 2026-06-15T00:54:41.764Z

[tool_use: Read]

### Assistant | 2026-06-15T00:54:42.109Z

[tool_use: Read]

### User | 2026-06-15T00:54:49.943Z

[tool_result] 1	/**
2	 * PluginSandboxPolicyEngine — HMPI14 plugin sandbox policy evaluator.
3	 *
4	 * Pure-core: evaluates a plugin's requested capability set against a
5	 * safety-tier policy (shop_floor / dev / sandbox). Returns the granted
6	 * subset + denials + a verdict (allowed / partial / blocked).
7	 *
8	 * @module engines/PluginSandboxPolicyEngine
9	 */
10	
11	import { z } from "zod";
12	
13	export c
... [+2838 chars truncated]

### User | 2026-06-15T00:54:50.003Z

[tool_result] 1	/**
2	 * Fusion360AutomationBridge — HTTP bridge for Autodesk Fusion 360 (.f3d/.f3z).
3	 *
4	 * Fusion 360 exposes automation via an add-in that runs a local HTTP server
5	 * (default http://127.0.0.1:7540). This bridge issues newline-delimited JSON
6	 * requests against that add-in and exposes the same lifecycle as the sibling
7	 * bridges so the CADAutomationRouter (U-CAUT10) can treat all six
... [+13047 chars truncated]

### User | 2026-06-15T00:54:50.017Z

[tool_result] 1	// cimco-launch-probe.mjs — loader/query API over state/shared/cimco/launch-surface.json.
2	//
3	// U-CIMCO-LAUNCH-PROBE (slot:echo, CIMCO-INTEGRATION-MS0). The launch-surface catalogs HOW a blind
4	// agent starts and drives the local CIMCO Edit 2026 install to prove a generated post:
5	//   - executables[]      : the verified exe inventory (path + role + sizeBytes)
6	//   - launchPatterns[]   
... [+8127 chars truncated]

### Assistant | 2026-06-15T00:54:55.082Z

Now let me read the remaining key files in parallel.

### Assistant | 2026-06-15T00:54:55.526Z

[tool_use: Read]

### Assistant | 2026-06-15T00:54:55.905Z

[tool_use: Read]

### Assistant | 2026-06-15T00:54:56.217Z

[tool_use: Read]

### User | 2026-06-15T00:55:01.543Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * CIMCO fleet closed-loop drive -- U-CIMCO-FLEET-DRIVE.
4	 *
5	 * "Begin closed-loop testing on all JM fleet machines." Drives each sim-able JM
6	 * machine through CIMCO Machine Simulation AUTONOMOUSLY (the MSAA driver launches
7	 * CIMCO cold -- no operator, proven U-CIMCO-SIM-AUTONOMOUS-PROOF):
8	 *   launch CIMCO + invoke "Machine Simulation" -> --op read-report 
... [+13716 chars truncated]

### User | 2026-06-15T00:55:02.056Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * CIMCO Machine-Simulation Driver — Node orchestrator (U-CIMCO-SIM-2).
4	 *
5	 * The connective tissue between the shipped C# MSAA helper (PrismCimcoUI.exe)
6	 * and the shipped verdict core (cimco-control-map.parseSimulationReport +
7	 * CimcoVerificationBridgeEngine.assessLiveRunClearance), so a PRISM-emitted .NC
8	 * can be round-tripped:
9	 *   post → .NC → CIMCO
... [+36795 chars truncated]

### User | 2026-06-15T00:55:02.199Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * WinMax Desktop Driver — Hurco WinMax Mill prove-out for PRISM-emitted .NC files.
4	 *
5	 * Closes Path D from spec-hurco-post-verification-2026-05-22
6	 * ("Build a WinMax GUI driver") so the JM Die Hurco post fleet
7	 * (VM30i v8.9.153 / v10_9 DRILLFIX / v11 / PRISM-Master) can be round-trip
8	 * verified end-to-end:  Fusion post  →  .NC  →  WinMaxMill  →  load+ba
... [+13773 chars truncated]

### Assistant | 2026-06-15T00:55:05.820Z

Now let me read the dispatchers and the winmax launch script in parallel.

### Assistant | 2026-06-15T00:55:06.639Z

[tool_use: Read]

### Assistant | 2026-06-15T00:55:07.356Z

[tool_use: Read]

### Assistant | 2026-06-15T00:55:07.793Z

[tool_use: Bash]

### User | 2026-06-15T00:55:10.574Z

[tool_result] 1	<#
2	.SYNOPSIS
3	  Guarded, idempotent launcher for the Hurco WinMax DS/MT Desktop simulators (mill | lathe).
4	  slot:echo. Fixes the "WinMax apps don't finish launching" wedge.
5	
6	.DESCRIPTION
7	  Root cause of the wedge (diagnosed 2026-06-01):
8	    1. The two products launch from DIFFERENT installs via DIFFERENT CNC_Launcher.exe and REQUIRE a
9	       /product argument. A bare CNC_Launcher
... [+6067 chars truncated]

### User | 2026-06-15T00:55:11.828Z

[tool_result] 1	/**
2	 * prism_cimco — CIMCO Edit 2026 + Machine Simulation bridge dispatcher
3	 * =============================================================================
4	 *
5	 * SPINE-1 of the CIMCO integration. The single invocable MCP surface every galaxy
6	 * calls to query the verified CIMCO inventory (86 machine defs / 25 .js posts + 44
7	 * .eRPost controllers / 366 cutters) and to evaluate Machi
... [+9950 chars truncated]

### User | 2026-06-15T00:55:22.496Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/adaptiveControlDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/agentDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/aiDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/algorithmDispatcher.synergy.test.ts
H:/prism/mcp-server/src/tools/dispatchers/algorithmDispatcher.ts

... [+1534 chars truncated]

### Assistant | 2026-06-15T00:55:25.551Z

Now let me grep the dispatchers for winmax and fusion wiring, and also check the cadAutomationDispatcher for fusion actions.

### Assistant | 2026-06-15T00:55:26.360Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:55:26.866Z

[tool_use: Read]

### User | 2026-06-15T00:55:31.578Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/autoPilotDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/cadDrawingKnowledgeDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts
H:/pr
... [+553 chars truncated]

### User | 2026-06-15T00:55:33.209Z

[tool_result] 1	/**
2	 * prism_cad_automation â€” CAD Automation Dispatcher
3	 *
4	 * Wires the unified CADAutomationRouter (U-CAUT10) into the MCP action surface
5	 * so skills, agents, and external clients can drive CAD automation through a
6	 * single set of 14 actions regardless of which underlying bridge services the
7	 * call (SolidWorks, Inventor, FreeCAD, Mastercam, Fusion 360, hyperMILL).
8	 *
9	 * Act
... [+3034 chars truncated]

### Assistant | 2026-06-15T00:55:35.821Z

Now let me check where winmax actions are dispatched and verify the server registration wiring.

### Assistant | 2026-06-15T00:55:37.350Z

[tool_use: Grep]

### Assistant | 2026-06-15T00:55:37.845Z

[tool_use: Glob]

### User | 2026-06-15T00:55:40.681Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts-7017-              const { hurcoV11MillMasterPostEngine } = await import("../../engines/HurcoV11MillMasterPostEngine.js");
H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts-7018-              // ──────────────────────────────────────────────────────────
H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts-7019-              
... [+592 chars truncated]

### User | 2026-06-15T00:55:48.815Z

[tool_result] No files found

### Assistant | 2026-06-15T00:55:52.039Z

Let me check where winmax actions actually live in the dispatcher surface and find the server registration.

### Assistant | 2026-06-15T00:55:52.846Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:55:53.989Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:55:55.600Z

[tool_use: Bash]

### User | 2026-06-15T00:56:03.873Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts

### User | 2026-06-15T00:56:07.885Z

[tool_result] H:/prism/mcp-server/src/data/controller-knowledge-tips.ts:372:    source: "controller:hurco_winmax_features",
H:/prism/mcp-server/src/engines/Fusion360ControllerCatalogEngine.ts:229:      { postFile: "hurco.cps", description: "Hurco WinMax / V-series", axisCount: 3, capabilities: ["G81-G89", "winmax_subroutines"], compatibleMachines: ["VM-series", "VMX-series"] },
H:/prism/mcp-server/src/engines/M
... [+3290 chars truncated]

### User | 2026-06-15T00:56:07.890Z

[tool_result] H:/prism/mcp-server/src/architecture/MULTI_AGENT_BLUEPRINT.ts:63: * │  │ prism_cam     │  │ prism_biz    │                     │
H:/prism/mcp-server/src/bot/discord-bot.ts:60:  program:   { dispatcher: 'prism_cam',             action: 'print_to_program_full',  description: 'Generate CNC program',                 category: 'generation' },
H:/prism/mcp-server/src/bot/discord-bot.ts:61:  post:      {
... [+3960 chars truncated]

### Assistant | 2026-06-15T00:56:11.805Z

The winmax `verify` action currently routes through `prism_cam` (the camDispatcher). Let me confirm that and find the server registration entry point to understand how a new `prism_hermes` dispatcher would be wired.

### Assistant | 2026-06-15T00:56:12.835Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:56:14.522Z

[tool_use: Bash]

### User | 2026-06-15T00:56:18.183Z

[tool_result] (Bash completed with no output)

### User | 2026-06-15T00:56:20.622Z

[tool_result] H:/prism/mcp-server/src/index.ts:72:import { registerCimcoDispatcher } from "./tools/dispatchers/cimcoDispatcher.js"; // prism_cimco — CIMCO verification/sim oracle (CIMCO-INTEGRATION-MS0)
H:/prism/mcp-server/src/index.ts:618:  registerCimcoDispatcher(server);
H:/prism/mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts:480:export function registerCadAutomationDispatcher(server: any): void
... [+128 chars truncated]

### Assistant | 2026-06-15T00:56:23.406Z

Now let me read the relevant index.ts section to understand the full registration pattern.

### Assistant | 2026-06-15T00:56:24.182Z

[tool_use: Read]

### Assistant | 2026-06-15T00:56:24.582Z

[tool_use: Read]

### User | 2026-06-15T00:56:25.396Z

[tool_result] 60	import { registerValidationDispatcher } from "./tools/dispatchers/validationDispatcher.js";
61	import { registerDocumentDispatcher } from "./tools/dispatchers/documentDispatcher.js";
62	import { registerInboxDispatcher } from "./tools/dispatchers/inboxDispatcher.js";
63	import { registerIntakeDispatcher } from "./tools/dispatchers/intakeDispatcher.js";
64	import { createIntakeRouter } from "./r
... [+2507 chars truncated]

### User | 2026-06-15T00:56:25.710Z

[tool_result] 610	  
611	  // Skills + Scripts + Knowledge V2 (23 actions)
612	  registerSkillScriptDispatcher(server);
613	  
614	  // Manufacturing Calculations (21 actions) — Hooked: pre/post-calculation
615	  registerCalcDispatcher(server);
616	
617	  // CIMCO Edit 2026 + Machine Simulation bridge (6 actions) — fleet program/post verification + sim oracle
618	  registerCimcoDispatcher(server);
619	
620	  //
... [+326 chars truncated]

### Assistant | 2026-06-15T00:57:38.381Z

I now have all the information needed. Let me compile the complete report.

---

# PRISM Bridge Pattern: Complete Report for Hermes CLI Integration

## 1. PluginSandboxPolicyEngine API

**File:** `H:/prism/mcp-server/src/engines/PluginSandboxPolicyEngine.ts`

This is a **pure evaluation engine** — it does NOT spawn processes itself. It evaluates a plugin's requested capability set against a tier policy and returns a grant/deny verdict. A Hermes bridge does not call this engine at runtime; it tells you the tier your bridge must declare.

### Policy shape

```ts
// The 9 gatable capabilities
type Capability =
  "filesystem-read" | "filesystem-write" | "network" | "process-spawn" |
  "env-read" | "env-write" | "tool-call" | "memory-read" | "memory-write";

// Three safety tiers — most restrictive first
type SafetyTier = "shop_floor" | "dev" | "sandbox";

// Input to the evaluator
interface SandboxRequest {
  plugin_id: string;       // e.g. "hermes-cli-bridge"
  tier: SafetyTier;
  requested: Capability[]; // what the plugin needs
}

// Output
interface PolicyVerdict {
  plugin_id: string;
  tier: SafetyTier;
  granted: Capability[];
  denied: Array<{ capability: Capability; reason: string }>;
  verdict: "allowed" | "partial" | "blocked";
}
```

### Tier allowlists (what each tier permits)

| Capability | `shop_floor` | `dev` | `sandbox` |
|---|---|---|---|
| filesystem-read | YES | YES | YES |
| filesystem-write | NO | YES | YES |
| network | NO | YES | YES |
| **process-spawn** | NO | NO | **YES** |
| env-read | NO | YES | YES |
| env-write | NO | NO | YES |
| tool-call | YES | YES | YES |
| memory-read | YES | YES | YES |
| memory-write | NO | YES | YES |

**Critical for Hermes:** `process-spawn` is only allowed at the `sandbox` tier. Your Hermes bridge must declare `tier: "sandbox"` and request `["process-spawn", "filesystem-read", "env-read", "tool-call"]`.

### API (two static methods)

```ts
// Evaluate — call once at bridge init to confirm your capabilities are
... [+9740 chars truncated]
