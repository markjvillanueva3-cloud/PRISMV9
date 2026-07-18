---
type: "chat-session"
source: "claude-code-cli"
session_id: "02436db5-5bb2-4a62-8e0d-1eeba8600240"
title: "PER-FILE SCRUTINY (Arm A — content-specialist wiring-review-agent) for U-DISPATC"
date: "2026-05-16"
first_ts: "2026-05-16T21:33:25.489Z"
last_ts: "2026-05-16T21:34:46.881Z"
cwd: "H:\\prism\\mcp-server"
messages: 32
user_msgs: 12
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/02436db5-5bb2-4a62-8e0d-1eeba8600240/subagents/agent-aaa5765008a74bda3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# PER-FILE SCRUTINY (Arm A — content-specialist wiring-review-agent) for U-DISPATC

> **claude-code-cli** | 2026-05-16 | 32 msgs (12 user / 20 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/02436db5-5bb2-4a62-8e0d-1eeba8600240/subagents/agent-aaa5765008a74bda3.jsonl`

## Transcript

### User | 2026-05-16T21:33:25.489Z

PER-FILE SCRUTINY (Arm A — content-specialist wiring-review-agent) for U-DISPATCHER of milestone RGS-TOOL-AUTOINVOKE-MS1.

## Target (read end-to-end)
1. `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts` — the 3 new case branches `roadmap_tool_plan_query` / `roadmap_tool_plan_coverage` / `roadmap_tool_plan_build`, inserted right AFTER `case "roadmap_intel_health"` (search for the SCRIPT-WIRE comment banner "RGS tool-plan sidecar"). Also the import-line change at top: `import { execSync, execFileSync } from "child_process";` (execFileSync was added).
2. `H:/prism/mcp-server/src/schemas/devActionSchemas.ts` — the 3 new entries in `ACTION_DEV_SCHEMAS` (search "RGS-TOOL-AUTOINVOKE-MS1 / U-DISPATCHER").

## What to verify (wiring-completeness axis)
- **Enum↔schema↔case parity**: all 3 actions (`roadmap_tool_plan_query`, `roadmap_tool_plan_build`, `roadmap_tool_plan_coverage`) must appear in (a) the `ACTIONS` z.enum array in devDispatcher.ts (search the array near line 30-40 — it's a multi-line string array; the 3 actions MUST be added there or the action will be rejected at the `z.enum(ACTIONS)` validation), (b) `ACTION_DEV_SCHEMAS` map, (c) a `case` branch. **CRITICAL: confirm the 3 actions were actually added to the ACTIONS enum array — if they are only in ACTION_DEV_SCHEMAS + a case but NOT in the ACTIONS z.enum, the dispatcher's `action: z.enum(ACTIONS)` will reject every call before the case is reached. This is the #1 wiring bug for this class of change.**
- **Subprocess seam**: `build` + `coverage` use `execFileSync(process.execPath, [scriptPath, ...], {cwd: PROJECT_ROOT, ...})`. Verify: (a) `execFileSync` is imported, (b) `process.execPath` (NOT bare "node" — there is a documented regression about bare-node ENOENT under portable-node), (c) `PATHS.SCRIPTS` resolves the scripts dir and `PROJECT_ROOT`/`PATHS.PRISM_ROOT` is the cwd, (d) no shell-string interpolation of the user-controlled `unit_key` (execFileSync passes argv directly — injection-safe), (e) 
... [+2039 chars truncated]

### Assistant | 2026-05-16T21:33:31.493Z

I will read both files end-to-end before forming any verdict.

### Assistant | 2026-05-16T21:33:32.321Z

[tool_use: Read]

### Assistant | 2026-05-16T21:33:32.905Z

[tool_use: Read]

### User | 2026-05-16T21:33:33.292Z

[tool_result] 1	/**
2	 * Dev Workflow Dispatcher - Consolidates 7 dev tools → 1
3	 * Actions: session_boot, build, code_template, code_search, file_read, file_write, server_info
4	 */
5	import { z } from "zod";
6	import { log } from "../../utils/Logger.js";
7	import * as fs from "fs";
8	import * as path from "path";
9	import { execSync, execFileSync } from "child_process";
10	import { slimResponse } from "../..
... [+12851 chars truncated]

### User | 2026-05-16T21:33:34.585Z

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
... [+4363 chars truncated]

### Assistant | 2026-05-16T21:33:37.272Z

Continuing the read of both files to get the complete picture.

### Assistant | 2026-05-16T21:33:38.143Z

[tool_use: Read]

### Assistant | 2026-05-16T21:33:38.648Z

[tool_use: Read]

### User | 2026-05-16T21:33:39.203Z

[tool_result] 100	// OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-CALL-CHAIN: wire CallChainEngine
101	// (anti-pattern detector for tool-call sequences — complements tool_call_*
102	//  which wraps ToolCallParallelizationEngine; this one wraps CallChainEngine).
103	"tool_chain_record",
104	"tool_chain_detected",
105	"tool_chain_string",
106	"tool_chain_summary",
107	"tool_chain_suggest",
108	"tool_chain_reset",
109	/
... [+5841 chars truncated]

### User | 2026-05-16T21:33:40.061Z

[tool_result] 80	    ollama_off: z.boolean().optional().describe("Deterministic mode — skip the Ollama synthesis reader (default false)"),
81	  }),
82	  roadmap_tool_plan_coverage: z.object({}).optional()
83	    .describe("No params — returns the anti-rot coverage dashboard for the whole tool-plan sidecar"),
84	
85	  // ── U-DOCU-04 / MS-DOCU-INGEST: BlueprintProgramJoinEngine query-layer lookups ──
86	  // Poi
... [+5632 chars truncated]

### Assistant | 2026-05-16T21:33:43.414Z

I need to see the rest of the ACTIONS array carefully — specifically looking for the 3 new actions near the end of the array, and the case statements for them. Let me also finish reading the schema file.

### Assistant | 2026-05-16T21:33:45.114Z

[tool_use: Grep]

### User | 2026-05-16T21:33:45.732Z

[tool_result] 4306-          // shell) is used for the user-controlled `unit_key` arg — injection-immune;
4307-          // the Zod schema additionally charset-guards it to the roadmap-id alphabet.
4308-          // ──────────────────────────────────────────────────────────────────────────────
4309:          case "roadmap_tool_plan_query": {
4310-            const unitKey = String(params.unit_key ?? params.unit
... [+888 chars truncated]

### Assistant | 2026-05-16T21:33:45.837Z

[tool_use: Grep]

### User | 2026-05-16T21:33:46.518Z

[tool_result] 70-  // flows into a subprocess argv, and although the dispatcher uses execFileSync
71-  // (no shell) the regex re-checks the contract at the validation boundary too.
72:  roadmap_tool_plan_query: z.object({
73-    unit_key: z.string().min(1).regex(/^[A-Za-z0-9_:.\-]+$/, "unit_key must be roadmap-id charset only ([A-Za-z0-9_:.-])")
74-      .describe("Roadmap unit key — composite 'MILESTONE::U-ID
... [+650 chars truncated]

### Assistant | 2026-05-16T21:33:49.852Z

Good — case statements confirmed. Now I need to verify the single most critical check: whether the 3 actions appear in the ACTIONS z.enum array. The array spans lines 30-209. Let me search it directly.

### Assistant | 2026-05-16T21:33:51.112Z

[tool_use: Grep]

### User | 2026-05-16T21:33:51.872Z

[tool_result] 4307-          // the Zod schema additionally charset-guards it to the roadmap-id alphabet.
4308-          // ──────────────────────────────────────────────────────────────────────────────
4309:          case "roadmap_tool_plan_query": {
4310-            const unitKey = String(params.unit_key ?? params.unitKey ?? "");
4311-            if (!unitKey) { result = { error: "Missing required: unit_key (
... [+522 chars truncated]

### Assistant | 2026-05-16T21:33:54.525Z

The grep only shows the case statements. I need to check whether the names are also present in the ACTIONS `const` array (lines 30–209). Let me read that specific section precisely.

### Assistant | 2026-05-16T21:33:54.892Z

[tool_use: Read]

### User | 2026-05-16T21:33:55.768Z

[tool_result] 195	"rev_idx_engine_to_dependents",
196	"rev_idx_keyword_search",
197	"rev_idx_assets_by_type",
198	"rev_idx_add_mapping",
199	"rev_idx_remove_mapping",
200	"rev_idx_rebuild",
201	"rev_idx_rebuild_all",
202	"rev_idx_stats",
203	"rev_idx_recover_wal",
204	// OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-IMPACT-ANALYSIS: ImpactAnalysisEngine.

### Assistant | 2026-05-16T21:33:59.492Z

The ACTIONS array ends at line 209 with `"impact_can_delete", "impact_find_orphans"] as const`. The three new actions are NOT visible anywhere in lines 30-209. Let me do a precise text search to be certain they are not in the array at all.

### Assistant | 2026-05-16T21:34:00.335Z

[tool_use: Grep]

### User | 2026-05-16T21:34:00.965Z

[tool_result] 4309:          case "roadmap_tool_plan_query": {
4330:          case "roadmap_tool_plan_coverage": {
4346:          case "roadmap_tool_plan_build": {

### Assistant | 2026-05-16T21:34:05.300Z

This is the critical finding. The three action names appear **only** in `case` statements (lines 4309, 4330, 4346) and **nowhere** in the `ACTIONS` array (lines 30–209). Now let me read the full case bodies and the surrounding roadmap_intel_health case to verify the subprocess seam, import, and banner style.

### Assistant | 2026-05-16T21:34:05.524Z

[tool_use: Read]

### User | 2026-05-16T21:34:06.561Z

[tool_result] 4280	                build_analysis: { estimated_hours: bhrs, maintenance_hours_per_year: Number(mhpy), risks: ["No external library available — full build + maintenance burden"], pros: ["Full control over implementation"], cons: ["Build time, cost, and ongoing maintenance"] },
4281	                integrate_analysis: { library_options: [], pros: [], cons: ["No suitable integration option was supp
... [+6302 chars truncated]

### Assistant | 2026-05-16T21:34:09.645Z

I now have everything I need. Let me also verify the ACTIONS array tail and the `execFileSync` import line to be thorough.

### Assistant | 2026-05-16T21:34:10.460Z

[tool_use: Read]

### User | 2026-05-16T21:34:13.538Z

[tool_result] 204	// OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-IMPACT-ANALYSIS: ImpactAnalysisEngine.
205	// Read-only surfaces only — executeRename is NOT MCP-exposed (destructive).
206	"impact_analyze_rename",
207	"impact_analyze_delete",
208	"impact_can_delete",
209	"impact_find_orphans"] as const;
210	
211	const CODE_TEMPLATES: Record<string, string> = {

### Assistant | 2026-05-16T21:34:46.881Z

The ACTIONS array closes at line 209. The three new actions are confirmed absent. I have all the data needed for a complete verdict.

---

## FAIL

---

### P0 — ACTIONS enum missing all 3 new actions (CRITICAL wiring bug)

**File:** `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts`, line 30–209

**Finding:** `roadmap_tool_plan_query`, `roadmap_tool_plan_build`, and `roadmap_tool_plan_coverage` are present in:
- `ACTION_DEV_SCHEMAS` (devActionSchemas.ts lines 72, 76, 82) — PRESENT
- `case` statements (devDispatcher.ts lines 4309, 4330, 4346) — PRESENT
- `ACTIONS` array (devDispatcher.ts lines 30–209) — **ABSENT in all three**

The `ACTIONS` array closes at line 209 with `"impact_find_orphans"] as const`. A text search for `roadmap_tool_plan` in the entire file returns exactly three hits, all in `case` positions at lines 4309, 4330, 4346. Zero hits inside the array.

**Impact:** The dispatcher validates the incoming `action` field against `z.enum(ACTIONS)` before the switch is ever reached. Every call to `prism_dev:roadmap_tool_plan_query`, `prism_dev:roadmap_tool_plan_build`, or `prism_dev:roadmap_tool_plan_coverage` will be rejected at the Zod validation boundary with an "Invalid enum value" error. The case statements are completely unreachable. The 948-plan sidecar remains inaccessible via MCP — the engine-wiring-doctrine violation the punch-list identified is not actually closed by this PR.

**Fix:** Add all three action names to the `ACTIONS` array. The natural insertion point is directly after `"roadmap_intel_health"` at line 37, immediately before the `// HOOK-SYNERGY-MS0` comment block, keeping the array in the same section-grouping style as the surrounding entries:

```
"roadmap_intel_health",
"roadmap_tool_plan_query",
"roadmap_tool_plan_build",
"roadmap_tool_plan_coverage",
// HOOK-SYNERGY-MS0/U-HOOK-REGISTRY ...
```

---

### Passing checks (recorded for completeness)

**execFileSync import (line 9):** `import { execSync, execFileSync } from "c
... [+2778 chars truncated]
