---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Independent second-pass review of a new PRISM code-graph engine + CLI + dispatch"
date: "2026-06-15"
first_ts: "2026-06-15T16:33:29.983Z"
last_ts: "2026-06-15T16:37:58.436Z"
cwd: "H:\\prism-slot-sierra"
messages: 40
user_msgs: 17
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a423a2eda818558f5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent second-pass review of a new PRISM code-graph engine + CLI + dispatch

> **claude-code-cli** | 2026-06-15 | 40 msgs (17 user / 23 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a423a2eda818558f5.jsonl`

## Transcript

### User | 2026-06-15T16:33:29.983Z

Independent second-pass review of a new PRISM code-graph engine + CLI + dispatcher wiring. Weight toward what a correctness reviewer misses: integration coupling, convention conformance, test integrity, the CLI/esbuild approach, maintainability. Read each file end-to-end.

FILES:
1. H:/prism/mcp-server/src/engines/CodeGraphProjectionEngine.ts
2. H:/prism/mcp-server/src/__tests__/CodeGraphProjectionEngine.test.ts
3. H:/prism/mcp-server/src/__tests__/devDispatcher.codeGraph-wire.test.ts
4. H:/prism/scripts/code-graph-projection.mjs
5. devDispatcher.ts code_graph_project wiring (action ~line 640, case handler) + devActionSchemas.ts code_graph_project schema (~line 131)

CONTEXT: unit GRAPH-AS-LLM-CONTEXT-MS0/U-GAC03. Uses the raw `typescript` compiler API (ts.createSourceFile per file -- both typescript AND ts-morph are deps; chose raw ts to avoid project-wide OOM, the spec's stated ts-morph failure mode). Just shipped U-GAC01 + U-GAC02 with the same conventions (singleton export, hermetic env/opts-override tests, dispatcher round-trip via fake-server handler, bare-data-then-wrap result, fail-loud). The CLI mirrors the graphrag-eval.mjs esbuild-bundle pattern.

CHECK (P0/P1/P2):
- Convention conformance: singleton export, header doc, ASCII-only, no inlined physics constants? Does the dispatcher wiring match sibling devDispatcher cases (code_integrity_*)? Does the schema match the devActionSchemas.ts pattern?
- The CLI esbuild approach: bundling CodeGraphProjectionEngine.ts with --external:typescript into a temp dir INSIDE mcp-server -- will "typescript" resolve from there? Is writing a temp dir inside mcp-server clean (gitignored? cleaned up)? Is the 8GB self-re-exec justified? Could the CLI just import the engine differently?
- repoRoot resolution: resolveRepoRoot (cwd basename === mcp-server ? dirname : cwd) -- robust for the dispatcher (MCP server cwd), the CLI (repo root cwd), and tests (opts.repoRoot)? Any case it resolves wrong + silently projects nothing?
- deps
... [+844 chars truncated]

### Assistant | 2026-06-15T16:33:41.265Z

I'll read all five files end-to-end before making any judgments.

### Assistant | 2026-06-15T16:33:41.638Z

[tool_use: Read]

### Assistant | 2026-06-15T16:33:41.770Z

[tool_use: Read]

### User | 2026-06-15T16:34:13.207Z

[tool_result] 1	/**
2	 * CodeGraphProjectionEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03
3	 * Real reference-value tests over hermetic temp-dir .ts fixtures (a<->b cycle,
4	 * external import, invalid TS, large file, oversize skip). Covers single-file,
5	 * multi-file deps, cyclic import, unparseable file, oversize skip, large-file parse,
6	 * egoGraph retrieval, target-not-found, and adversarial bad-gr
... [+5834 chars truncated]

### User | 2026-06-15T16:34:13.208Z

[tool_result] 1	/**
2	 * CodeGraphProjectionEngine.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03
3	 * =================================================================
4	 * Projects TypeScript source into a code graph for ego-graph retrieval by coding
5	 * agents (RepoGraph, ICLR 2025: ego-graph retrieval boosts SWE-bench resolve rate
6	 * +32.8%). Nodes = files + top-level symbols + import targets; edges = `declare
... [+12352 chars truncated]

### Assistant | 2026-06-15T16:34:17.253Z

[tool_use: Read]

### Assistant | 2026-06-15T16:34:17.290Z

[tool_use: Read]

### User | 2026-06-15T16:34:23.446Z

[tool_result] 1	/**
2	 * Round-trip wiring test for prism_dev:code_graph_project
3	 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03). Invokes THROUGH the registered devDispatcher
4	 * handler (schema validation + dispatch), projecting REAL engine source (live-data E2E).
5	 */
6	import { describe, it, expect, beforeAll, vi } from "vitest";
7	import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
8	
... [+2319 chars truncated]

### User | 2026-06-15T16:34:30.306Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * code-graph-projection.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03 verifies_via channel.
4	 *
5	 * Projects a TypeScript target to a code graph via the REAL CodeGraphProjectionEngine
6	 * (esbuild-bundled on the fly with `typescript` external, temp inside mcp-server so the
7	 * bundle resolves typescript from mcp-server/node_modules). Optional --center runs the
8	 * e
... [+3320 chars truncated]

### Assistant | 2026-06-15T16:34:37.628Z

Now I need to read the dispatcher wiring and schema files.

### Assistant | 2026-06-15T16:34:38.853Z

[tool_use: Grep]

### Assistant | 2026-06-15T16:34:39.540Z

[tool_use: Grep]

### User | 2026-06-15T16:35:19.095Z

[tool_result] 117-  audit_id: z.string(),                 // a real envelope MUST carry a minted id + ts
118-  ts: z.string(),                       // (reject hand-crafted envelopes missing them ->
119-  operation: z.string(),                //  no "audit_id":undefined JSONL lines)
120-  actor: z.string(),
121-  target_slot: z.string().nullable().optional(),
122-  task_id: z.string().nullable().optional(),
123
... [+1719 chars truncated]

### User | 2026-06-15T16:35:19.119Z

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

### Assistant | 2026-06-15T16:35:25.460Z

Now let me read the full dispatcher case and surrounding context more carefully, and check for the symlink guard and a few other details.

### Assistant | 2026-06-15T16:35:26.611Z

[tool_use: Read]

### Assistant | 2026-06-15T16:35:27.597Z

[tool_use: Grep]

### User | 2026-06-15T16:35:44.201Z

[tool_result] 59:const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage", ".cache"]);
284:          if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name));

### User | 2026-06-15T16:35:48.035Z

[tool_result] 1700	            const { codeGenerationIntegrityEngine } = await import("../../engines/CodeGenerationIntegrityEngine.js");
1701	            result = codeGenerationIntegrityEngine.getStatistics();
1702	            break;
1703	          }
1704	          case "code_graph_project": {
1705	            const { codeGraphProjectionEngine } = await import("../../engines/CodeGraphProjectionEngine.js");
1706
... [+1146 chars truncated]

### Assistant | 2026-06-15T16:35:52.731Z

[tool_use: Grep]

### Assistant | 2026-06-15T16:35:53.654Z

[tool_use: Grep]

### User | 2026-06-15T16:36:11.063Z

[tool_result] No matches found

### User | 2026-06-15T16:36:12.647Z

[tool_result] 631-  "resource_extraction_state_track",
632-  "post_processor_matrix_test",
633-  "speed_feed_at_scale_test",
634-  "domain_wizard_pipeline_test",
635-  "cad_cam_generation_test",
636-  "post_processor_numeric_dialect_test",
637:  "code_integrity_quick_validate",
638:  "code_integrity_validate",
639-  "code_integrity_stats",
640-  \ U-GAC03: CodeGraphProjectionEngine (GRAPH-AS-LLM-CONTEXT-MS0, sl
... [+1592 chars truncated]

### Assistant | 2026-06-15T16:36:16.625Z

Now let me check the symlink guard gap, the `repoRoot` not being passed through the dispatcher, and a few convention checks.

### Assistant | 2026-06-15T16:36:17.406Z

[tool_use: Read]

### Assistant | 2026-06-15T16:36:18.330Z

[tool_use: Grep]

### User | 2026-06-15T16:36:19.368Z

[tool_result] 271	    if (stat.isFile()) return EXTS.includes(path.extname(targetAbs)) ? [targetAbs] : [];
272	    const out: string[] = [];
273	    const walk = (dir: string) => {
274	      if (out.length >= maxFiles) return;
275	      let entries: fs.Dirent[];
276	      try {
277	        entries = fs.readdirSync(dir, { withFileTypes: true });
278	      } catch {
279	        return;
280	      }
281	      for (
... [+592 chars truncated]

### User | 2026-06-15T16:36:23.626Z

[tool_result] 759-/** Registers dev dispatcher.
760- * @param server - MCP server instance
761-  * @returns void
762- */
763:export function registerDevDispatcher(server: any): void {
764-  server.tool(
765-    "prism_dev",
766-    `Dev workflow tools. Actions: ${ACTIONS.join(", ")}`,
767-    {

### Assistant | 2026-06-15T16:36:28.264Z

Now I have everything I need. Let me verify the last two specific details: whether `repoRoot` is passed by the dispatcher handler and whether `.tmp-codegraph-` directories are gitignored.

### Assistant | 2026-06-15T16:36:29.019Z

[tool_use: Grep]

### Assistant | 2026-06-15T16:36:29.437Z

[tool_use: Grep]

### User | 2026-06-15T16:36:31.504Z

[tool_result] No matches found

### User | 2026-06-15T16:36:32.466Z

[tool_result] No matches found

### Assistant | 2026-06-15T16:36:36.042Z

Let me check the gitignore for tmp patterns and verify the sibling code_integrity wiring pattern for comparison.

### Assistant | 2026-06-15T16:36:36.430Z

[tool_use: Read]

### Assistant | 2026-06-15T16:36:37.645Z

[tool_use: Grep]

### User | 2026-06-15T16:36:48.684Z

[tool_result] No files found

### User | 2026-06-15T16:36:51.021Z

[tool_result] 1	# Build output
2	dist/
3	node_modules/
4	
5	# State files (runtime, not source)
6	state/memory_graph/
7	state/nl_hooks/
8	state/tenants/
9	state/telemetry/
10	
11	# Temp/debug files in C:\PRISM\state\
12	../state/*.txt
13	../state/*.js
14	../state/*.py
15	../state/*.bat
16	../state/*.ps1
17	../state/snapshots/
18	../state/wip/
19	../state/decisions/
20	../state/errors/
21	../state/events/
22	../
... [+716 chars truncated]

### Assistant | 2026-06-15T16:37:58.436Z

I now have all I need to produce a complete, citation-backed verdict. Here is my full review.

---

VERDICT: FAIL

summary: The engine, tests, and schema are solid overall -- the core design (syntactic-only TS parse, cycle-safe BFS, singleton export, schema-gated dispatcher) is correct and well-structured. Two P1 defects block merge: (1) the dispatcher case at `devDispatcher.ts:1707` silently drops `repoRoot`, so under the MCP server's cwd the resolver mis-roots and projects nothing or the wrong tree; (2) the `.tmp-codegraph-*` dir the CLI writes inside `mcp-server/` is not covered by any `.gitignore` pattern, making it a leak that `git status` will surface and the tmp-orphan janitor may not catch because it scans by PID pattern not by dir-name prefix. One P0-adjacent logic hazard and several P2s follow.

---

findings:

- [P1] `mcp-server/src/tools/dispatchers/devDispatcher.ts:1707` -- `codeGraphProjectionEngine.project({ target: p.target, maxFiles: p.maxFiles })` passes neither `repoRoot` nor the caller-resolved repo root. Inside the MCP server process, `process.cwd()` is `mcp-server/`, so `resolveRepoRoot()` at `CodeGraphProjectionEngine.ts:67-68` fires the `path.dirname(cwd)` branch and returns the repo root correctly -- BUT only if the MCP server is started from exactly `mcp-server/`. If the server is ever started from the repo root (or any other cwd), `basename(cwd)` is not `"mcp-server"`, `resolveRepoRoot` returns `cwd` unchanged, and every relative `target` (e.g. `"mcp-server/src/engines/X.ts"`) resolves to `cwd/mcp-server/src/engines/X.ts` -- which may exist -- but all relative import paths are computed against the wrong root, yielding `unresolved relative import` for everything and `depsResolved: false`. The sibling code_integrity cases pass their params directly but those engines take no root; this engine does. Fix: pass an explicit `repoRoot` in the dispatcher case, derived the same way `resolveRepoRoot` does it, so the dispatcher is not sensitive to MCP
... [+7768 chars truncated]
