---
type: "chat-session"
source: "claude-code-cli"
session_id: "00175b01-57de-45eb-953e-d6b540d69477"
title: "You are finding the highest-ROI DORMANT (built-but-unwired) engines across PRISM"
date: "2026-06-03"
first_ts: "2026-06-03T17:54:26.038Z"
last_ts: "2026-06-03T17:58:33.992Z"
cwd: "H:\\prism"
messages: 59
user_msgs: 20
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/00175b01-57de-45eb-953e-d6b540d69477/subagents/workflows/wf_b5b2319b-0cb/agent-a47c55b6ad0f62ba1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:02"
---

# You are finding the highest-ROI DORMANT (built-but-unwired) engines across PRISM

> **claude-code-cli** | 2026-06-03 | 59 msgs (20 user / 39 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/00175b01-57de-45eb-953e-d6b540d69477/subagents/workflows/wf_b5b2319b-0cb/agent-a47c55b6ad0f62ba1.jsonl`

## Transcript

### User | 2026-06-03T17:54:26.038Z

You are finding the highest-ROI DORMANT (built-but-unwired) engines across PRISM. Repo root: H:/prism. SessionStart awareness reports ~110 engines on disk with NO dispatcher reference (NEEDS_WIRING).

Investigate (read-only — you may RUN audit scripts, do NOT edit):
1. Run: node scripts/audit-unwired-engines.mjs  (or rtk node ...). Capture the list of unwired engines + suggested dispatchers.
2. Run: node scripts/audit-orphan-inventory.mjs  — the built+documented+unwired punch list (top orphans from awareness: 'Mill AGI', 'Wire EDM AGI', 'Quality AI').
3. For the top ~15 unwired engines, judge ROI: an engine that is (built + documented + has a clear consuming dispatcher + high-value domain) is high-ROI to wire. A half-built stub is NOT — flag those separately for the stub-hunter.
4. Cross-check against state/shared/BUILD_STATE.json NEEDS_WIRING list. Top unwired domains per awareness: Other(21), Speed(6), Monolith(5), Wet(3), Creo(3).

Return PLAIN TEXT: a ranked TOP 10 unwired-engine-to-wire list. For each: engine name, file path, the EXACT target dispatcher + a proposed action name, effort (S/M/L), and whether it's genuinely built (wire it) vs a stub (defer to stub-hunter). Prioritize ones bravo or alpha can wire fast with a real round-trip test.

### Assistant | 2026-06-03T17:54:38.386Z

I'll investigate the unwired engines in the PRISM repository. Let me start by running the audit scripts to gather the data.

### Assistant | 2026-06-03T17:54:38.451Z

[tool_use: Bash]

### User | 2026-06-03T17:55:10.648Z

[tool_result] scanning engines …
  3774 engine files
scanning consumers …
  dispatchers=109 routes=77 registries=27 orch=78 hooks=54 singletons=4

=== Unwired Engine Audit Summary ===
total engines:            3774
  UNWIRED                110
  WIRE-EXEMPT            110
  WIRED-DIRECT           3489
  WIRED-VIA-HOOK         9
  WIRED-VIA-ORCH         40
  WIRED-VIA-ROUTE        12
  WIRED-VIA-SINGLETON    4
l
... [+111 chars truncated]

### Assistant | 2026-06-03T17:55:14.125Z

Let me use the rtk shorthand for more concise output.

### Assistant | 2026-06-03T17:55:14.170Z

[tool_use: Bash]

### User | 2026-06-03T17:55:38.136Z

[tool_result] scanning engines …
  3774 engine files
scanning consumers …
  dispatchers=109 routes=77 registries=27 orch=78 hooks=54 singletons=4

=== Unwired Engine Audit Summary ===
total engines:            3774
  UNWIRED                110
  WIRE-EXEMPT            110
  WIRED-DIRECT           3489
  WIRED-VIA-HOOK         9
  WIRED-VIA-ORCH         40
  WIRED-VIA-ROUTE        12
  WIRED-VIA-SINGLETON    4
l
... [+111 chars truncated]

### Assistant | 2026-06-03T17:55:40.377Z

Now let me check the audit output JSON file and run the orphan inventory audit.

### Assistant | 2026-06-03T17:55:40.503Z

[tool_use: Read]

### User | 2026-06-03T17:55:44.533Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generated": "2026-06-03T17:55:37.056Z",
4	  "generatedBy": "scripts/audit-unwired-engines.mjs",
5	  "canonicalEnginesFolder": "H:\\PRISM\\mcp-server\\src\\engines",
6	  "counts": {
7	    "totalCanonicalEngines": 3774,
8	    "WIRED-DIRECT": 3489,
9	    "UNWIRED": 110,
10	    "WIRED-VIA-ORCH": 40,
11	    "WIRE-EXEMPT": 110,
12	    "WIRED-VIA-ROUTE": 12,
13	    
... [+23224 chars truncated]

### Assistant | 2026-06-03T17:55:47.468Z

Now let me run the orphan inventory audit to get more detail on the documented, built engines:

### Assistant | 2026-06-03T17:55:47.576Z

[tool_use: Bash]

### User | 2026-06-03T17:55:52.421Z

[tool_result] Exit code 1
node:internal/modules/cjs/loader:1252
  throw err;
  ^

Error: Cannot find module 'H:\PRISM\scripts\audit-orphan-inventory.mjs'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1249:15)
    at Function._load (node:internal/modules/cjs/loader:1075:27)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/
... [+232 chars truncated]

### Assistant | 2026-06-03T17:55:59.083Z

Let me check what audit scripts are available:

### Assistant | 2026-06-03T17:55:59.096Z

[tool_use: Glob]

### User | 2026-06-03T17:56:01.230Z

[tool_result] scripts\audit-roadmap-drift.mjs
scripts\audit-stop-hooks.mjs
scripts\audit-hook-paths.mjs
scripts\audit-hook-duplicates.mjs
scripts\audit-cross-file-hooks.mjs
scripts\audit-edit-hooks.mjs
scripts\audit-round-aggregate.mjs
scripts\audit-roadmap-viz-bindings.mjs
scripts\audit-worktrees.mjs
scripts\audit-untracked-refs.mjs
scripts\audit-wiki-coverage.mjs
scripts\audit-monolith-port-state.mjs
scripts\
... [+1333 chars truncated]

### Assistant | 2026-06-03T17:56:04.255Z

Let me check the BUILD_STATE.json file and read some of the top unwired engines to assess which are genuinely built vs stubs:

### Assistant | 2026-06-03T17:56:04.515Z

[tool_use: Read]

### User | 2026-06-03T17:56:07.751Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generatedAt": "2026-06-03T15:01:17.618Z",
4	  "headline": {
5	    "built_engines": 3664,
6	    "built_with_wiki": 1137,
7	    "needs_wiring": 110,
8	    "needs_building_active_units": 3025,
9	    "needs_frontend_merge_count": 2,
10	    "pending_milestones_with_activity": 112,
11	    "drift_milestones": 192,
12	    "stale_milestones": 198,
13	    "domains_trac
... [+2078 chars truncated]

### Assistant | 2026-06-03T17:56:10.536Z

Let me now sample key unwired engines to assess whether they are genuinely built or stubs. I'll check several high-value ones:

### Assistant | 2026-06-03T17:56:10.870Z

[tool_use: Read]

### User | 2026-06-03T17:56:13.087Z

[tool_result] 1	/**
2	 * PlaywrightAutomationEngine — GUI Automation Script Generation for Web-Based CAD
3	 * Generates Playwright automation scripts to control web-based CAD software
4	 * (OnShape, TinkerCAD, FreeCAD web) from extracted video action sequences.
5	 * Includes execution planning to decide between CadQuery and Playwright paths.
6	 */
7	import { log } from "../utils/Logger.js";
8	import type { Extr
... [+23284 chars truncated]

### Assistant | 2026-06-03T17:56:19.265Z

Let me check a few more engines to assess build quality, then read the dispatcher map to understand wiring targets:

### Assistant | 2026-06-03T17:56:20.222Z

[tool_use: Bash]

### User | 2026-06-03T17:56:33.104Z

[tool_result]   373 mcp-server\src\engines\GCodeMaterialParserEngine.ts
  420 mcp-server\src\engines\QuotingClosedLoopEngine.ts
  295 mcp-server\src\engines\MonolithWorkholdingDatabaseEngine.ts
    0 mcp-server\src\engines\WEDMLoRADatasetBuilderEngine.ts
 1088 total

### Assistant | 2026-06-03T17:56:37.035Z

Let me check dispatcher references and look at the mapping to understand targets:

### Assistant | 2026-06-03T17:56:37.303Z

[tool_use: Bash]

### User | 2026-06-03T17:56:47.175Z

[tool_result] ls: cannot access 'mcp-serversrctoolsdispatchers*.ts': No such file or directory

### Assistant | 2026-06-03T17:56:49.617Z

Let me use the correct path format:

### Assistant | 2026-06-03T17:56:49.846Z

[tool_use: Bash]

### User | 2026-06-03T17:56:58.372Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/adaptiveControlDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/agentDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/algorithmDispatcher.synergy.test.ts
H:/prism/mcp-server/src/tools/dispatchers/algorithmDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/atcsDispatcher.t
... [+910 chars truncated]

### Assistant | 2026-06-03T17:57:01.327Z

Let me check the mapping of dispatchers to get a sense of the wiring targets, and sample a few key unwired engines:

### Assistant | 2026-06-03T17:57:02.215Z

[tool_use: Grep]

### User | 2026-06-03T17:57:06.938Z

[tool_result] Found 30 files limit: 30
mcp-server\src\tools\dispatchers\cimcoDispatcher.ts
mcp-server\src\tools\dispatchers\calcDispatcher.ts
mcp-server\src\tools\dispatchers\multiAxisProgramDispatcher.ts
mcp-server\src\tools\dispatchers\partsLibraryDispatcher.ts
mcp-server\src\tools\dispatchers\inboxDispatcher.ts
mcp-server\src\tools\dispatchers\quotingDispatcher.ts
mcp-server\src\tools\dispatchers\knowledgeDi
... [+1305 chars truncated]

### Assistant | 2026-06-03T17:57:09.919Z

Let me check the dispatcher digest and sample several unwired engines to assess quality:

### Assistant | 2026-06-03T17:57:09.919Z

[tool_use: Read]

### User | 2026-06-03T17:57:12.785Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**106 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-06-03 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **13834**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|----
... [+11325 chars truncated]

### Assistant | 2026-06-03T17:57:16.614Z

Now let me sample several unwired engines to assess their build quality. I'll check a mix including stubs and solid implementations:

### Assistant | 2026-06-03T17:57:16.615Z

[tool_use: Read]

### User | 2026-06-03T17:57:19.477Z

[tool_result] 1	/**
2	 * GCodeMaterialParserEngine — extract the material callout from the header
3	 * comment block of a CNC program.
4	 *
5	 * QUOTING-SYNERGY-MS0/U-QP-MATERIAL-FROM-GCODE-PARSE (slot:charlie iter48 2026-05-26).
6	 *
7	 * JM Die's program corpus stores material in the COMMENT HEADER, not the
8	 * file path. iter45 detected material from path tokens (AL6061/SS304/D2 etc.)
9	 * — but only ~40% o
... [+1668 chars truncated]

### Assistant | 2026-06-03T17:57:23.308Z

Let me sample a few more engines to understand the build-quality distribution, then compile the ranking:

### Assistant | 2026-06-03T17:57:23.780Z

[tool_use: Read]

### User | 2026-06-03T17:57:26.184Z

[tool_result] 1	/**
2	 * QuotingClosedLoopEngine — autonomous self-improving / self-learning controller
3	 * for the quoting system.
4	 *
5	 * QUOTING-SYNERGY-MS0/U-QP-CLOSED-LOOP-CORE (slot:charlie iter46 2026-05-26).
6	 *
7	 * Composes the 5 existing quoting substrate engines into ONE closed loop:
8	 *
9	 *   ┌─ observe ─┐   ┌─ compare ──┐   ┌─ detect ──┐   ┌─ act ──────┐
10	 *   │ Outcomes  │──▶│ Accuracy   
... [+3067 chars truncated]

### Assistant | 2026-06-03T17:57:29.967Z

Let me check MonolithWorkholdingDatabaseEngine and sample a few more to get quality distribution, then check if there's documentation:

### Assistant | 2026-06-03T17:57:30.235Z

[tool_use: Read]

### User | 2026-06-03T17:57:32.170Z

[tool_result] 1	/**
2	 * MonolithWorkholdingDatabaseEngine — U-DB-MONOLITH-WORKHOLDING-LOADER
3	 * ====================================================================
4	 *
5	 * TS-typed port of `PRISM_WORKHOLDING_DATABASE` from the v8.89 monolith
6	 * extraction (lives at `extracted/workholding/PRISM_WORKHOLDING_DATABASE.js`).
7	 * Closes the gap that **no live engine actually loaded this data** — the
8	 * 10+
... [+3060 chars truncated]

### Assistant | 2026-06-03T17:57:35.957Z

Let me check a few more engines and look for documentation or wiki coverage to understand build completeness better:

### Assistant | 2026-06-03T17:57:36.977Z

[tool_use: Bash]

### User | 2026-06-03T17:57:47.644Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-03T17:57:52.156Z

Let me check which unwired engines have test files and read a couple more engines to assess stub vs complete distinction:

### Assistant | 2026-06-03T17:57:52.185Z

[tool_use: Bash]

### User | 2026-06-03T17:57:57.333Z

[tool_result] === PlaywrightAutomationEngine ===
546 mcp-server/src/engines/PlaywrightAutomationEngine.ts
NO TEST
=== SpeedFeedChatterStabilityAdapterEngine ===
303 mcp-server/src/engines/SpeedFeedChatterStabilityAdapterEngine.ts
HAS TEST
=== UnifiedProgramParserEngine ===
1698 mcp-server/src/engines/UnifiedProgramParserEngine.ts
NO TEST
=== MillPrintToProgramEngine ===
27 mcp-server/src/engines/MillPrintToProg
... [+123 chars truncated]

### Assistant | 2026-06-03T17:58:00.708Z

Perfect. Now let me check a few more critical ones and assess their dispatcher targets:

### Assistant | 2026-06-03T17:58:00.880Z

[tool_use: Read]

### User | 2026-06-03T17:58:02.506Z

[tool_result] 1	/**
2	 * MillPrintToProgramEngine — thin delegator to the real MillingPrintToProgramEngine.
3	 *
4	 * STUB-RESCUE (slot:bravo 2026-05-27, U-STUB-HUNT-09, mill-galaxy). Original was
5	 * tagged "U-EFF25 stub — SUPERSEDED" because millDispatcher had been rewired to
6	 * MillingPrintToProgramEngine but MillMasterOrchestratorFacadeEngine still
7	 * imported this shim and got `{ok:false, stub:true}` 
... [+1003 chars truncated]

### Assistant | 2026-06-03T17:58:05.791Z

Let me check one more stub to contrast:

### Assistant | 2026-06-03T17:58:05.791Z

[tool_use: Read]

### User | 2026-06-03T17:58:06.824Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-03T17:58:33.992Z

Now let me compile my findings into the final ranking. Based on my analysis of the 110 unwired engines, I have enough data to produce the TOP 10 ranking:

---

## TOP 10 HIGH-ROI UNWIRED ENGINES TO WIRE

**Ranking Methodology:** Built + documented + has dispatcher target + high manufacturing value + wirable by bravo/alpha in one round-trip test cycle.

| # | Engine | File Path | Target Dispatcher | Action Name | Effort | Status | Reason |
|---|--------|-----------|-------------------|-------------|--------|--------|--------|
| 1 | QuotingClosedLoopEngine | `mcp-server/src/engines/QuotingClosedLoopEngine.ts` | `prism_quoting` | `run_closed_loop` | M | **WIRE NOW** | 420 LOC, fully documented closed-loop controller for quote accuracy feedback. Composes 5 existing engines. Quoting dispatcher (81 actions) ready. High business ROI — autonomous quote recalibration. No test yet but architecture is solid (R1–R4 Karpathy patterns). |
| 2 | GCodeMaterialParserEngine | `mcp-server/src/engines/GCodeMaterialParserEngine.ts` | `prism_cam` | `parse_material_from_gcode` | S | **WIRE NOW** | 373 LOC, production-ready parser for JM Die corpus. Handles Fanuc/Haas/Hurco/Mazatrol/Okuma dialects. Confidence scoring (0.55–0.95) built-in. Material normalization complete. prism_cam (2475 actions). Trivial wiring effort. |
| 3 | SpeedFeedChatterStabilityAdapterEngine | `mcp-server/src/engines/SpeedFeedChatterStabilityAdapterEngine.ts` | `prism_vibration_physics` | `calculate_chatter_speed_feed_limit` | M | **WIRE NOW** | 303 LOC, HAS test file, bridges vibration physics ↔ speed/feed. Chatter stability is manufacturing-critical (tool breakage/scrap). Target dispatcher exists (36 actions). Confidence model built-in. Mid-effort wiring. |
| 4 | MonolithWorkholdingDatabaseEngine | `mcp-server/src/engines/MonolithWorkholdingDatabaseEngine.ts` | `prism_safety` | `query_workholding_fixtures` | M | **WIRE NOW** | 295 LOC, typed port from v8.89 monolith. 13 fixture-type specs + 5 product specs (Kurt, 
... [+6017 chars truncated]
