---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Review a new PRISM engine + dispatcher wiring + CLI for correctness, edge cases,"
date: "2026-06-15"
first_ts: "2026-06-15T16:33:26.532Z"
last_ts: "2026-06-15T16:36:57.986Z"
cwd: "H:\\prism-slot-sierra"
messages: 24
user_msgs: 10
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a57b021847df15bd0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Review a new PRISM engine + dispatcher wiring + CLI for correctness, edge cases,

> **claude-code-cli** | 2026-06-15 | 24 msgs (10 user / 14 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a57b021847df15bd0.jsonl`

## Transcript

### User | 2026-06-15T16:33:26.532Z

Review a new PRISM engine + dispatcher wiring + CLI for correctness, edge cases, silent-failure risk. Read each file END-TO-END.

FILES:
1. H:/prism/mcp-server/src/engines/CodeGraphProjectionEngine.ts (new engine)
2. H:/prism/mcp-server/src/__tests__/CodeGraphProjectionEngine.test.ts
3. H:/prism/mcp-server/src/__tests__/devDispatcher.codeGraph-wire.test.ts
4. H:/prism/scripts/code-graph-projection.mjs (CLI; self-re-execs 8GB heap, esbuild-bundles the engine with typescript external into a temp INSIDE mcp-server)
5. H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts -- ONLY the code_graph_project wiring: action in ACTIONS (~line 640), handler `case "code_graph_project"` (search it). And H:/prism/mcp-server/src/schemas/devActionSchemas.ts -- the code_graph_project schema (~line 131).

CONTRACT (unit GRAPH-AS-LLM-CONTEXT-MS0/U-GAC03): project a TypeScript target (file|dir) to a code graph via per-file ts.createSourceFile (RepoGraph ICLR-2025). nodes = file + top-level symbols + import targets; edges = declares (file->symbol) + imports (file->file/external). egoGraph(graph,centerId,hops) = ego retrieval over the projected graph. Per-file parse (no project-wide type-check) so it CANNOT OOM. depsResolved = all relative imports resolved.

CHECK (P0 crash/correctness/security, P1 real bug/edge, P2 minor):
- AST extraction: declInfo handles function/class/interface/type/enum/const (variable stmt -> each identifier); is it missing exported default / namespace / export-from? Are non-exported top-level decls included (intended? RepoGraph wants symbols)?
- resolveImportToRel: .js->.ts/.tsx swap, /index resolution, relative-only -- correct? Any path-escape (spec "../../../etc/passwd") risk -- but it only fs.existsSync + records a rel id, never reads outside, right? Windows path.sep vs posix handling correct?
- egoGraph: BFS both directions, cycle-safe (visited set), node-capped; the adj-build `(adj.get(id) ?? adj.set(id,[]).get(id)!)` idiom -- correct + no undefined deref
... [+912 chars truncated]

### Assistant | 2026-06-15T16:33:32.693Z

I'll read all five files end-to-end before issuing any verdict.

### Assistant | 2026-06-15T16:33:33.083Z

[tool_use: Read]

### Assistant | 2026-06-15T16:33:33.217Z

[tool_use: Read]

### User | 2026-06-15T16:34:13.196Z

[tool_result] 1	/**
2	 * CodeGraphProjectionEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03
3	 * Real reference-value tests over hermetic temp-dir .ts fixtures (a<->b cycle,
4	 * external import, invalid TS, large file, oversize skip). Covers single-file,
5	 * multi-file deps, cyclic import, unparseable file, oversize skip, large-file parse,
6	 * egoGraph retrieval, target-not-found, and adversarial bad-gr
... [+5834 chars truncated]

### User | 2026-06-15T16:34:13.200Z

[tool_result] 1	/**
2	 * CodeGraphProjectionEngine.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03
3	 * =================================================================
4	 * Projects TypeScript source into a code graph for ego-graph retrieval by coding
5	 * agents (RepoGraph, ICLR 2025: ego-graph retrieval boosts SWE-bench resolve rate
6	 * +32.8%). Nodes = files + top-level symbols + import targets; edges = `declare
... [+12352 chars truncated]

### Assistant | 2026-06-15T16:34:21.612Z

[tool_use: Read]

### Assistant | 2026-06-15T16:34:21.627Z

[tool_use: Read]

### User | 2026-06-15T16:35:15.147Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * code-graph-projection.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03 verifies_via channel.
4	 *
5	 * Projects a TypeScript target to a code graph via the REAL CodeGraphProjectionEngine
6	 * (esbuild-bundled on the fly with `typescript` external, temp inside mcp-server so the
7	 * bundle resolves typescript from mcp-server/node_modules). Optional --center runs the
8	 * e
... [+3320 chars truncated]

### User | 2026-06-15T16:35:15.158Z

[tool_result] 1	/**
2	 * Round-trip wiring test for prism_dev:code_graph_project
3	 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03). Invokes THROUGH the registered devDispatcher
4	 * handler (schema validation + dispatch), projecting REAL engine source (live-data E2E).
5	 */
6	import { describe, it, expect, beforeAll, vi } from "vitest";
7	import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
8	
... [+2319 chars truncated]

### Assistant | 2026-06-15T16:35:18.111Z

Now I need to read the dispatcher and schema sections.

### Assistant | 2026-06-15T16:35:19.675Z

[tool_use: Grep]

### Assistant | 2026-06-15T16:35:20.369Z

[tool_use: Grep]

### User | 2026-06-15T16:35:22.243Z

[tool_result] 633-  "speed_feed_at_scale_test",
634-  "domain_wizard_pipeline_test",
635-  "cad_cam_generation_test",
636-  "post_processor_numeric_dialect_test",
637-  "code_integrity_quick_validate",
638-  "code_integrity_validate",
639-  "code_integrity_stats",
640-  \ U-GAC03: CodeGraphProjectionEngine (GRAPH-AS-LLM-CONTEXT-MS0, slot:sierra 2026-06-15)
641:  "code_graph_project",
642-  \ U-WIRE-DR \ WIRE-UN
... [+1398 chars truncated]

### User | 2026-06-15T16:35:22.685Z

[tool_result] 102-\ U-WIRE-HZPAUDIT: HzpDashAuditEngine envelope sub-schemas (mirror the engine's exported
103-// AuditEnvelopeRequestSchema; build() re-validates strictly via .parse so the boundary stays
104-\ passthrough-tolerant). slot:papa->golf 2026-06-15.
105-const _hzpAuditRequest = z.object({
106-  operation: z.enum(["assign", "veto", "promote-refuse", "adopt-doctrine", "escalate", "bus-send"]),
107-  a
... [+3577 chars truncated]

### Assistant | 2026-06-15T16:35:24.969Z

I have everything I need. Let me now trace several specific concerns before concluding.

### Assistant | 2026-06-15T16:35:26.922Z

[tool_use: Grep]

### Assistant | 2026-06-15T16:35:27.826Z

[tool_use: Grep]

### User | 2026-06-15T16:35:44.191Z

[tool_result] 1374-            }
1375-            \ PATH SAFETY (mirrors case "file_write" — this is an MCP-exposed action): confine
1376-            // the READ to the repo root and the WRITE to MCP_ROOT; reject path-traversal escapes.
1377:            const repoRoot = path.resolve(MCP_ROOT, "..");
1378:            const resolvedInput = path.resolve(repoRoot, inputPath);
1379:            if (!resolvedInput.sta
... [+1404 chars truncated]

### User | 2026-06-15T16:35:44.196Z

[tool_result] 5: * multi-file deps, cyclic import, unparseable file, oversize skip, large-file parse,
34:  writeFileSync(join(dir, "bad.ts"), `export function broken(((( { not valid typescript =====`);
46:    expect(g.filesParsed).toBe(1);
69:    expect(g.filesParsed).toBeGreaterThanOrEqual(6); // a,b,c,standalone,bad,big
82:  it("unparseable file does not throw; file node still emitted (no total loss)", () => 
... [+248 chars truncated]

### Assistant | 2026-06-15T16:35:46.839Z

Now I have all the information I need. Let me trace the remaining edge cases precisely before rendering the verdict.

### Assistant | 2026-06-15T16:35:48.855Z

[tool_use: Grep]

### User | 2026-06-15T16:36:11.060Z

[tool_result] 1684-          // orphan, not WIRE-EXEMPT). Pure validators that detect corrupted generated code
1685-          // (binary signatures, sourcemap leakage, invalid TS starts, structural corruption)
1686-          // BEFORE it is written to disk. Natural prism_dev home (code-quality tooling).
1687-          case "code_integrity_quick_validate": {
1688-            const { codeGenerationIntegrityEngine
... [+2262 chars truncated]

### Assistant | 2026-06-15T16:36:57.986Z

I have everything I need. Here is the verdict.

---

VERDICT: FAIL

summary: The dispatcher handler silently drops `maxFileBytes` from the `project()` call, making the oversize-skip guard permanently inactive through the MCP surface. A second structural issue is that the "unparseable file" test contract is wrong — the engine counts `bad.ts` as `filesParsed` (not `filesSkipped`) after a parse error due to an early-continue path, yet the test asserts `filesParsed === 1` and will green-light a misleading count. A third issue is that the `resolveImportToRel` posix/Windows join mix can silently produce unresolvable candidates on Windows when the input `fromRel` already uses backslashes from `relId`.

---

findings:

- [P1] `mcp-server/src/tools/dispatchers/devDispatcher.ts:1707` -- `maxFileBytes` is accepted by the schema but never passed to `codeGraphProjectionEngine.project()`. The handler passes only `{ target, maxFiles }`. A caller who sets `maxFileBytes` via the MCP action gets silently ignored — oversize files that should be skipped are parsed, and the 5 MB default is used regardless of what the caller requested. Fix: change line 1707 to `codeGraphProjectionEngine.project({ target: p.target, maxFiles: p.maxFiles, maxFileBytes: (p as any).maxFileBytes })` and add `maxFileBytes` to the schema object in `devActionSchemas.ts:132`.

- [P1] `mcp-server/src/engines/CodeGraphProjectionEngine.ts:133-136` + test `CodeGraphProjectionEngine.test.ts:84` -- When `ts.createSourceFile` throws (the `try/catch` at line 131-137 of the engine), the code does `filesSkipped++` and `continue` — but by that point the file node was already added via `addNode` at line 126 and `filesParsed` is NOT incremented. The test at line 84 asserts `g.filesParsed === 1` for `bad.ts`, which cannot be true: `bad.ts` hits the catch, increments `filesSkipped`, and the loop `continue`s before `filesParsed++` at line 164. So `filesParsed` will be 0 and `filesSkipped` will be 1. The test assertion is inverted
... [+4886 chars truncated]
