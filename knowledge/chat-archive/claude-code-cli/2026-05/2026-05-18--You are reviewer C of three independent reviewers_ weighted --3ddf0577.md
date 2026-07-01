---
type: "chat-session"
source: "claude-code-cli"
session_id: "3ddf0577-364b-4462-8405-7577878d7264"
title: "You are reviewer C of three independent reviewers, weighted toward SILENT BREAKA"
date: "2026-05-18"
first_ts: "2026-05-18T00:38:19.524Z"
last_ts: "2026-05-18T00:46:04.957Z"
cwd: "H:\\prism"
messages: 73
user_msgs: 27
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism/3ddf0577-364b-4462-8405-7577878d7264/subagents/agent-aba6905280dadf98a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# You are reviewer C of three independent reviewers, weighted toward SILENT BREAKA

> **claude-code-cli** | 2026-05-18 | 73 msgs (27 user / 46 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3ddf0577-364b-4462-8405-7577878d7264/subagents/agent-aba6905280dadf98a.jsonl`

## Transcript

### User | 2026-05-18T00:38:19.524Z

You are reviewer C of three independent reviewers, weighted toward SILENT BREAKAGE / REGRESSION RISK / INTEGRATION COUPLING (do NOT assume reviewers A or B caught everything). PRISM manufacturing platform, slot delta, FEATURE-GAP-AUDIT-MS0.

Three new engines + dispatcher edits this session. Assess regression/integration risk:

1. H:/prism/mcp-server/src/engines/BRepTessellatorEngine.ts — STEP entity-map → triangle mesh. Check: does the dispatcher Map-rehydration in cadDispatcher.ts (brep_tessellate case) correctly reconstruct Maps from JSON objects? Could the `entityMap as Map<number,never>` casts hide a runtime type error?
2. H:/prism/mcp-server/src/engines/GeodesicDistanceEngine.ts — Dijkstra/FMM/path/iso. Check: the computePath cycle-guard (bounded by numVertices) — can it still infinite-loop on a pathological mesh? Heap correctness under equal distances?
3. H:/prism/mcp-server/src/engines/ToolNoseRadiusCompensationEngine.ts — TNR + LAP validator. Check: validateProgram state machine — does re-cancel/re-activate (G41→G40→G80→G42→G40→G80) correctly NOT false-flag? Word-boundary regex robust against G410/G420?

Dispatcher edits (read only the new case blocks + ACTIONS enum additions):
- H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts
- H:/prism/mcp-server/src/tools/dispatchers/turningDispatcher.ts

Also: 7 new test files were added to mcp-server/src/__tests__/ for engines that already existed (MeshDecimation, SpectralGraph, SurfaceReconstruction, Curvature/Offset, Voronoi/Isosurface) — verify these tests import the REAL existing engine singletons (not re-implementations) and would catch a regression in those engines.

Flag: silent-breakage risk, integration coupling, error-budget gaps, any-cast hazards. Read end-to-end. First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then ≤5 notes. If unsure, choose FAIL.

### Assistant | 2026-05-18T00:38:25.848Z

I'll review these files end-to-end for silent breakage, regression risk, and integration coupling.

### Assistant | 2026-05-18T00:38:26.234Z

[tool_use: Read]

### Assistant | 2026-05-18T00:38:27.121Z

[tool_use: Read]

### User | 2026-05-18T00:38:27.172Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\BRepTessellatorEngine.ts' was already read 21s ago in this session and is unchanged (mtime 1779061189190). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CAC
... [+5 chars truncated]

### Assistant | 2026-05-18T00:38:27.265Z

[tool_use: Read]

### User | 2026-05-18T00:38:28.204Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\GeodesicDistanceEngine.ts' was already read 22s ago in this session and is unchanged (mtime 1779062269003). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-05-18T00:38:28.289Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ToolNoseRadiusCompensationEngine.ts' was already read 22s ago in this session and is unchanged (mtime 1779064276840). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### Assistant | 2026-05-18T00:38:31.650Z

The engine files are already in my context from a prior read. Let me read the dispatcher files to inspect the new case blocks and test files.

### Assistant | 2026-05-18T00:38:33.327Z

[tool_use: Grep]

### User | 2026-05-18T00:38:34.312Z

[tool_result] 101-    "airfoil profile param must be an AirfoilProfile object or a { naca4, naca5, uiucDat } shortcut"
102-  );
103-}
104-
105-const ACTIONS = [
106-  "geometry_create", "geometry_transform", "geometry_analyze",
107-  "mesh_generate", "mesh_import", "mesh_export",
108-  // B-Rep tessellator — STEP entity-map → triangle mesh (U-GAP-CAD-BREP-TESSELLATOR)
109:  "brep_tessellate",
110-  // Geodesic 
... [+5504 chars truncated]

### Assistant | 2026-05-18T00:38:34.865Z

[tool_use: Grep]

### User | 2026-05-18T00:38:35.931Z

[tool_result] 75-  \ CAM-EXHAUST-MS0: Cpk/life/offset/optimizer engines
76-  "turning_cpk_surrogate", "turning_insert_life",
77-  "turning_offset_wear", "turning_offset_probe",
78-  "turning_robust_optimize",
79-  \ MS-PRINT-PROGRAM-LOOP\U-PPL-A1: structural fingerprint + cluster classify
80-  "turning_min_fingerprint", "turning_min_classify",
81-  \ MS-PRINT-PROGRAM-LOOP\U-PPL-B1: program reoptimization orches
... [+5408 chars truncated]

### Assistant | 2026-05-18T00:38:39.003Z

Now let me read the three engine files since the read-cache says they're in context — but they aren't visibly in my context. Let me read them with explicit ranges to inspect the critical logic.

### Assistant | 2026-05-18T00:38:40.713Z

[tool_use: Bash]

### User | 2026-05-18T00:38:51.965Z

[tool_result] 839 BRepTessellatorEngine.ts
501 GeodesicDistanceEngine.ts
247 ToolNoseRadiusCompensationEngine.ts
Σ 1587

### Assistant | 2026-05-18T00:38:54.663Z

[tool_use: Bash]

### User | 2026-05-18T00:39:03.311Z

[tool_result]   1 │ /**
  2 │  * ToolNoseRadiusCompensationEngine — TNR (G40/G41/G42) reference + validation
  3 │  *
  4 │  * Tool Nose Radius (TNR) compensation handles the offset between the theoretical
  5 │  * sharp tool point used in part programs and the actual tangent contact point on
  6 │  * a finite-radius tool nose. Without TNR, programmed contours on angles/arcs
  7 │  * deviate from the part-print
... [+10300 chars truncated]

### Assistant | 2026-05-18T00:39:06.435Z

TNR engine is clean. Now let me check the state machine logic for the re-cancel/re-activate scenario and the regex. Then the other two engines.

### Assistant | 2026-05-18T00:39:07.484Z

[tool_use: Bash]

### User | 2026-05-18T00:39:12.340Z

[tool_result]   1 │ /**
  2 │  * GeodesicDistanceEngine — geodesic distance on triangle meshes
  3 │  *
  4 │  * Computes single- and multi-source shortest-path distances on a triangle
  5 │  * mesh, plus iso-distance curves and back-traced geodesic paths.
  6 │  *
  7 │  * Algorithms:
  8 │  *   - Dijkstra on the vertex graph with Euclidean edge weights — fast, exact
  9 │  *     on the graph, an upper bound o
... [+20611 chars truncated]

### Assistant | 2026-05-18T00:39:17.530Z

The Geodesic engine logic is sound. The cycle-guard is bounded by `numVertices` strictly via `step < safetyMax` — even on a pathological mesh it terminates. Greedy descent is monotone (only moves to strictly-smaller `distances[neighbor]`), so it cannot cycle; the bound is defensive. Heap is correct under equal distances (strict `<` comparisons, stable enough for Dijkstra correctness). Now the BRep engine and the rehydration concern.

### Assistant | 2026-05-18T00:39:18.825Z

[tool_use: Bash]

### User | 2026-05-18T00:40:31.383Z

[tool_result]      1	/**
     2	 * BRepTessellatorEngine — STEP B-Rep solid → triangle mesh tessellation
     3	 *
     4	 * Tessellates parsed STEP B-Rep entities into a triangle mesh. Operates on the
     5	 * entity-map representation produced by a STEP parser (e.g. AtomicStepDecomposerEngine
     6	 * or upstream STEP loaders): a `byType` map of `ADVANCED_FACE` entities plus a
     7	 * generic `entityMap` 
... [+5763 chars truncated]

### Assistant | 2026-05-18T00:40:35.447Z

[tool_use: Bash]

### User | 2026-05-18T00:40:43.167Z

[tool_result]      1	  /**
     2	   * Tessellate every `ADVANCED_FACE` in `stepData` and concatenate the results
     3	   * into a single offset-corrected mesh.
     4	   *
     5	   * @param stepData Parsed STEP entity data (`byType` + `entityMap`).
     6	   * @param entityMap Resolver for entity-id refs. May be `stepData.entityMap`.
     7	   * @param options Resolution / error-handling knobs.
     8	   * 
... [+5895 chars truncated]

### Assistant | 2026-05-18T00:40:52.420Z

The BRep entry point has hard runtime guards (`stepData.byType instanceof Map` and `entityMap instanceof Map` both throw if not a Map). This is the critical integration point. Now let me trace the dispatcher rehydration interaction carefully and check the new test files.

### Assistant | 2026-05-18T00:40:54.268Z

[tool_use: Bash]

### User | 2026-05-18T00:40:59.144Z

[tool_result] /usr/bin/bash: line 1: /c/Users/wompu/bin/rtk: Argument list too long
---NEW (by git)---
 M mcp-server/src/__tests__/ActionTraceEngine.test.ts
 M mcp-server/src/__tests__/MultiModelConsensus.test.ts
 M mcp-server/src/__tests__/speed-feed-orchestrator.test.ts
?? mcp-server/src/__tests__/CrossChatDirectiveDetector.test.ts
?? mcp-server/src/__tests__/CustomerMaterialMapEngine.test.ts
?? mcp-server/sr
... [+685 chars truncated]

### Assistant | 2026-05-18T00:41:02.726Z

Noted. Let me find the 7 new test files for the pre-existing engines (MeshDecimation, SpectralGraph, SurfaceReconstruction, Curvature/Offset, Voronoi/Isosurface) — they aren't in the git status above, so they may be in a different state or named differently.

### Assistant | 2026-05-18T00:41:03.814Z

[tool_use: Bash]

### User | 2026-05-18T00:41:08.212Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-18T00:41:11.185Z

No test files matching those engine names in the working tree status. Let me check if they were committed this session.

### Assistant | 2026-05-18T00:41:12.812Z

[tool_use: Bash]

### User | 2026-05-18T00:41:19.088Z

[tool_result] 0c0c8225c0 [FEATURE-GAP-AUDIT-MS0]/U-GAP-CAD-GEODESIC: port GeodesicDistanceEngine from monolith
1aa7b63bd7 [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-GAP-LATHE-NOSE-RADIUS-COMP: port TNR engine + add LAP validator
21e5766ef1 [FEATURE-GAP-AUDIT-MS0]/U-GAP-CAD-VORONOI-ISOSURFACE: add tests (engines already ported)
710c6b0fb4 [FEATURE-GAP-AUDIT-MS0]/U-GAP-CAD-BREP-TESSELLATOR: port BRepTessellator from monoli
... [+851 chars truncated]

### Assistant | 2026-05-18T00:41:22.257Z

Now let me verify the 7 "engine already ported" test files import the REAL singletons (not re-implementations).

### Assistant | 2026-05-18T00:41:23.858Z

[tool_use: Bash]

### User | 2026-05-18T00:41:28.332Z

[tool_result] === MeshDecimationEngine.test.ts ===
19:import { describe, it, expect } from "vitest";
20:import { meshDecimationEngine } from "../engines/MeshDecimationEngine";
21:import type { TriangleMesh } from "../engines/MeshDecimationEngine";
=== SpectralGraphEngine.test.ts ===
19:import { describe, it, expect } from "vitest";
20:import { spectralGraphEngine } from "../engines/SpectralGraphEngine";
=== Sur
... [+858 chars truncated]

### Assistant | 2026-05-18T00:41:32.794Z

All 5 import the real engine singletons from `../engines/` — no re-implementations. Now verify those engines actually exist and the tests assert real behavior (would catch a regression — not stubs). Let me also confirm the dispatcher cast hazard with a focused build check.

### Assistant | 2026-05-18T00:41:36.626Z

[tool_use: Bash]

### User | 2026-05-18T00:42:46.294Z

[tool_result] MeshDecimationEngine: 44 expect() / 0 weak-only
SpectralGraphEngine: 53 expect() / 0 weak-only
SurfaceReconstructionEngine: 40 expect() / 0 weak-only
CurvatureOffsetEngines: 37 expect() / 0 weak-only
VoronoiIsosurfaceEngines: 42 expect() / 0 weak-only
      0 [main] grep (42268) child_copy: cygheap read copy failed, 0x0..0x80000C950, done 0, windows pid 42268, Win32 error 299
BRepTessellatorEngine
... [+366 chars truncated]

### Assistant | 2026-05-18T00:42:49.665Z

A grep child-copy error garbled the BRep count. Let me re-check the BRep test assertion density and the dispatcher rehydration round-trip concern (the core integration-coupling risk).

### Assistant | 2026-05-18T00:42:52.528Z

[tool_use: Bash]

### User | 2026-05-18T00:43:13.012Z

[tool_result] expect(): 119
toBeDefined-only lines: 0
imports real engine: True
rehydrate/Map round-trip test present: True

### Assistant | 2026-05-18T00:43:26.922Z

BRep test: 119 expect(), 0 weak-only, imports the real engine, and covers Map round-trip. Now the critical regression concern — the dispatcher `rehydrateMap` semantics. Let me analyze the key correctness issue.

The dispatcher rehydration (cadDispatcher.ts:501-516):
```ts
const rehydrateMap = <V>(src: unknown): Map<unknown, V> => {
  if (src instanceof Map) return src as Map<unknown, V>;
  if (src && typeof src === "object") {
    return new Map(Object.entries(src as Record<string, V>).map(
      ([k, v]) => [Number.isNaN(Number(k)) ? k : Number(k), v]
    ));
  }
  return new Map();
};
```

Two integration concerns to verify: (1) `byType` keys are STEP type strings (e.g. `"ADVANCED_FACE"`) — `Number("ADVANCED_FACE")` is `NaN`, so key stays string. Correct. But `Number("")` is `0`, and `Number(" ")` is `0` — an empty/whitespace key would be coerced to numeric `0`. For `byType` that's a non-issue (type strings are non-empty). (2) For `entityMap`, JSON object keys are always strings; `Number("123")` → `123`. Correct. Edge: a STEP id key like `"123abc"` → `NaN` → kept as string `"123abc"`, but `entityMap.get(surfaceRef)` where `surfaceRef` is a number would miss it — however valid STEP ids are always numeric, so acceptable. Let me confirm the engine's guard catches the empty-input degenerate case the dispatcher can produce.

The dispatcher passes `byType as Map<string, never[]>` and `entityMap as Map<number, never>`. The engine entry point hard-guards both with `instanceof Map` throws. `rehydrateMap` always returns a `Map` (even the `return new Map()` fallback), so the `instanceof Map` guard always passes — meaning a caller who omits `params.stepData` gets an empty Map → engine returns an empty mesh with `statistics.faces:0`, not an error. That's a silent-degradation surface but it's fail-soft-by-design and `success:true` with empty data is detectable by the caller.

Let me check the `as never` cast hazard and one final integration point: whether `tessellateBrep` is ca
... [+88 chars truncated]

### Assistant | 2026-05-18T00:43:29.201Z

[tool_use: Bash]

### User | 2026-05-18T00:43:30.037Z

[tool_result] Exit code 66

### Assistant | 2026-05-18T00:43:34.423Z

[tool_use: Bash]

### User | 2026-05-18T00:43:43.039Z

[tool_result] timeout: failed to run command 'npx': No such file or directory
tsc exit=127
0
--- relevant ---
      0 [main] bash 3083668 dofork: child -1 - forked process 33700 died unexpectedly, retry 0, exit code 0xC000012D, errno 11
/usr/bin/bash: fork: retry: Resource temporarily unavailable

### Assistant | 2026-05-18T00:43:45.994Z

Fork-storm / resource exhaustion in the bash environment (the box is under the memory pressure documented in CLAUDE.md). Let me use PowerShell to run a scoped type-check.

### Assistant | 2026-05-18T00:43:48.849Z

[tool_use: PowerShell]

### User | 2026-05-18T00:44:05.447Z

[tool_result] Exit code 9
exit=-1073740791
0

### Assistant | 2026-05-18T00:44:09.615Z

tsc itself crashed under host memory pressure (exit `0xC0000409` = stack buffer overrun / OOM, not a type error) — 0 `error TS` lines because it never completed. I cannot get a clean full-build signal in this environment. Let me do a targeted syntactic/type sanity check on just the modified dispatcher case blocks and the three engines using a lighter approach.

### Assistant | 2026-05-18T00:44:11.686Z

[tool_use: PowerShell]

### User | 2026-05-18T00:44:19.342Z

[tool_result] [31;1m&: [31;1mThe term 'node.exe' is not recognized as a name of a cmdlet, function, script file, or executable program.[0m
[31;1m[31;1mCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.[0m
checked: src/engines/BRepTessellatorEngine.ts -> 
[31;1m&: [31;1mThe term 'node.exe' is not recognized as a name of a cmdlet, function, script 
... [+524 chars truncated]

### Assistant | 2026-05-18T00:44:25.567Z

[tool_use: PowerShell]

### User | 2026-05-18T00:44:28.483Z

[tool_result] Exit code 1
node=H:/.claude/bin\node.cmd
check src/engines/BRepTessellatorEngine.ts -> exit=1 :: node:internal/modules/esm/get_format:218   throw new ERR_UNKNOWN_FILE_EXTENSION(ext, filepath);         ^  TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for H:\PRISM\mcp-server\src\engines\BRepTessellatorEngine.ts     at Object.getFileProtocolModuleFormat [as file:] (node:intern
... [+1404 chars truncated]

### Assistant | 2026-05-18T00:44:31.810Z

Node can't check `.ts` directly. Let me try esbuild (the fast build path PRISM uses) which gives a real transpile/parse signal cheaply.

### Assistant | 2026-05-18T00:44:34.987Z

[tool_use: PowerShell]

### User | 2026-05-18T00:44:37.960Z

[tool_result] esbuild exit=0

### Assistant | 2026-05-18T00:44:43.495Z

esbuild parses all 5 files (3 engines + 2 dispatchers) with zero warnings/errors — no syntax errors, no obvious import breakage. esbuild does not type-check, so the `as never` / `as Map<...>` casts are not validated, but those are deliberate boundary casts and the engine has runtime `instanceof Map` guards behind them, so a malformed input fails loud (throws) rather than silently corrupting.

Let me do a final targeted review of the two remaining regression concerns: the TNR state machine re-cancel sequence and the word-boundary regex against `G410`/`G420`, and confirm the geodesic heap pop edge case (single-element heap).

### Assistant | 2026-05-18T00:44:50.568Z

[tool_use: PowerShell]

### User | 2026-05-18T00:44:51.983Z

[tool_result] (PowerShell completed with no output)

### Assistant | 2026-05-18T00:44:54.823Z

The here-string didn't pass through. Let me write a temp script file instead.

### Assistant | 2026-05-18T00:44:59.642Z

[tool_use: Write]

### User | 2026-05-18T00:45:05.334Z

[tool_result] PreToolUse:Write hook error: [python3 ${CLAUDE_PLUGIN_ROOT}/hooks/security_reminder_hook.py]: \u26a0\ufe0f Security Warning: Using child_process.exec() can lead to command injection vulnerabilities.

This codebase provides a safer alternative: src/utils/execFileNoThrow.ts

Instead of:
  exec(`command ${userInput}`)

Use:
  import { execFileNoThrow } from '../utils/execFileNoThrow.js'
  aw
... [+376 chars truncated]

### Assistant | 2026-05-18T00:45:07.912Z

False-positive hook trigger (my script has no exec). The file likely wrote. Let me run it.

### Assistant | 2026-05-18T00:45:08.863Z

[tool_use: PowerShell]

### User | 2026-05-18T00:45:15.502Z

[tool_result] Exit code 1
node:internal/modules/cjs/loader:1252
  throw err;
  ^

Error: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\tnr_probe.mjs'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1249:15)
    at Function._load (node:internal/modules/cjs/loader:1075:27)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modu
... [+236 chars truncated]

### Assistant | 2026-05-18T00:45:31.319Z

The Write was blocked by the hook (file not created). Let me reason through the TNR logic by inspection instead — it's simple and deterministic.

**Regex `/\bG(40|41|42)\b/` against `G410`/`G420`:** `\b` is a word boundary between a word char and non-word char. In `G410`, after `G41` the next char is `0` (a word char), so there is **no** `\b` between `1` and `0` — the regex requires `\b` immediately after the captured group. `G(41)\b` would need position-3 to be a boundary; position-3 in `G410` is between `1` and `0` (both word chars) = not a boundary. So `G410` does **not** match `G41`. However — the alternation `(40|41|42)` with `\bG...\b`: could `G410` match `G40`? `G40` requires chars `G`,`4`,`0` consecutively; `G410` is `G`,`4`,`1`,`0` — no `G40` substring. `G420` → `G`,`4`,`2`,`0`: contains `G42` at 0-2, then `\b` needed at position 3 (between `2` and `0`) = not a boundary → no match. **Correct: `G410`/`G420` are not false-flagged.** Edge: `G041` → `\bG(40|41|42)\b` — substring `G04`? not in alternation. `041` doesn't start with `G4`. No match (acceptable; `G041` is non-standard leading-zero, rare on lathes).

**Re-cancel/re-activate state machine (G41→G40→G80→G42→G40→G80→G41→G80):** The loop sets `activeTNR` on G41/G42, clears to `null` on G40. Trace: L1 G41→active=G41; L2 G40→active=null; L3 G80, active=null → **no flag** (correct, cancelled before G80); L4 G42→active=G42; L5 G40→active=null; L6 G80, active=null → **no flag** (correct); L7 G41→active=G41; L8 G80, active=G41 → **flag** (correct — genuinely unbalanced). The state machine correctly does NOT false-flag the balanced re-cancel/re-activate sequences. One nuance: G40 and G41/G42 on the *same line* — `parseProgram` captures only the *first* TNR match per line via `G_TNR_REGEX.exec` (single, non-global), so a line like `G40 G42` would be read as `G40` (first occurrence). That's a minor parse ambiguity but not a regression risk for the stated scenarios; multi-TNR-per-line is invalid G-code anyway.

**G
... [+355 chars truncated]

### Assistant | 2026-05-18T00:45:32.615Z

[tool_use: PowerShell]

### User | 2026-05-18T00:45:40.926Z

[tool_result] cleaned

### Assistant | 2026-05-18T00:46:04.957Z

Review complete. All files read end-to-end; logic verified by inspection and esbuild parse-check (full tsc was impossible — the host is under the documented OOM/fork-storm pressure, tsc crashed with `0xC0000409`, not a type error).

VERDICT: PASS

BLOCKER: none

Notes (≤5):

1. **Dispatcher Map-rehydration is correct, with one bounded edge.** `rehydrateMap` (cadDispatcher.ts:501-509) handles all three input shapes: live `Map` (pass-through), JSON object (rebuild via `Object.entries`, numeric-coerce keys), and missing/non-object (empty `Map`). For `entityMap`, JSON keys are always strings and valid STEP ids are numeric, so `Number(k)` reconstructs `#id` keys faithfully and `entityMap.get(numericRef)` resolves. For `byType`, STEP type strings (`"ADVANCED_FACE"`) → `Number()` is `NaN` → key correctly kept as string. The `as Map<number,never>` / `as Map<string,never[]>` casts are NOT a runtime hazard: the engine entry point hard-guards both with `instanceof Map` throws (BRepTessellatorEngine.ts:15-20), so a malformed input fails loud rather than silently corrupting. Latent (non-blocking): an empty/whitespace JSON key would coerce to numeric `0` (`Number("")===0`) — irrelevant for STEP type strings and numeric ids, but worth a comment if this rehydrator is ever reused for arbitrary maps.

2. **Silent-degradation surface (acceptable, fail-soft by design).** Omitting `params.stepData`/`params.entityMap` yields empty Maps → `instanceof Map` guard passes → engine returns `{success:true, data:{statistics:{faces:0,...}}}` instead of an error. This is detectable by callers (faces:0) and consistent with the engine's `continueOnFaceError` fail-soft contract, but a caller that doesn't inspect statistics could mistake an empty mesh for a valid one. Not a regression (new code), not a blocker.

3. **GeodesicDistanceEngine cannot infinite-loop and heap is correct.** `computePath` greedy descent is strictly monotone (only moves when `distances[neighbor] < bestDist`), so it cannot cycle
... [+1627 chars truncated]
