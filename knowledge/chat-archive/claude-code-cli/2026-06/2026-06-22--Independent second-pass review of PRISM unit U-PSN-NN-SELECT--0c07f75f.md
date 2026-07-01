---
type: "chat-session"
source: "claude-code-cli"
session_id: "0c07f75f-24a7-47d8-a038-b4f2e5216e1d"
title: "Independent second-pass review of PRISM unit U-PSN-NN-SELECTIVE (slot:india) — f"
date: "2026-06-22"
first_ts: "2026-06-22T20:55:21.524Z"
last_ts: "2026-06-22T20:56:54.788Z"
cwd: "H:\\prism\\mcp-server"
messages: 33
user_msgs: 14
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/0c07f75f-24a7-47d8-a038-b4f2e5216e1d/subagents/agent-a1583bbd6433e1c91.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Independent second-pass review of PRISM unit U-PSN-NN-SELECTIVE (slot:india) — f

> **claude-code-cli** | 2026-06-22 | 33 msgs (14 user / 19 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/0c07f75f-24a7-47d8-a038-b4f2e5216e1d/subagents/agent-a1583bbd6433e1c91.jsonl`

## Transcript

### User | 2026-06-22T20:55:21.524Z

Independent second-pass review of PRISM unit U-PSN-NN-SELECTIVE (slot:india) — fixes the PSN-health NN/GNN leg #10 misreporting RED "UNGRADED" + adds selective-deploy modeling. Grade PASS/FAIL with P0/P1/P2 + file:line. Lens: test integrity, convention conformance, R7 single-source-of-truth, regression. Read all 3 files:

1. `H:/prism/mcp-server/src/engines/PSNHealthCheckEngine.ts` (schema `nnGnn` + `classifyNnGnn`)
2. `H:/prism/scripts/generate-psn-health-features.mjs` (`gatherNnGnn` now uses canonical `classifyGnn`)
3. `H:/prism/mcp-server/src/__tests__/PSNHealthCheckEngine.test.ts` (new tests)

CHECK:
- TEST INTEGRITY: does the "AUROC passes but Brier fails -> names BRIER not 'AUROC < gate'" test genuinely pin the bug fix (would it fail against the old `AUROC ${a} < gate` code)? Are the selective-deploy assertions concrete (coverage %, tau, 'deploy-ready-selective', 'full-coverage pending')? Any false-green? Any `.skip`/`.only`? Do the EXISTING 24 tests still pass given the schema/classifier change (no regression)?
- R7 SINGLE-SOURCE: the fix routes the generator through `classifyGnn` (the same reader the PSN-leg hook uses) to eliminate the divergent ad-hoc read. Confirm this genuinely unifies the readers and the leg now matches the hook's verdict. Is the `selectiveCoverage`/`selectiveTau` mapping from `classifyGnn`'s `selectiveOperatingPoint` correct?
- CONVENTION: ascii-only in all 3 changed regions (the test file pre-existing uses unicode arrows; my NEW content should be ascii `->`). Matches surrounding style? Any inlined constant (NN_AUROC_PROMOTE/NN_BRIER_PROMOTE are imported module constants — confirm not re-inlined)?
- BLAST RADIUS: classifyNnGnn only affects the NN/GNN leg; confirm no other leg classifier touched. The schema addition is additive-optional; confirm devDispatcher psn_health_check + the second generator (psn-synergy-collect) are not broken by the schema change.

Report only real findings, concise.

### Assistant | 2026-06-22T20:55:24.824Z

I'll read all three files end-to-end before forming any judgment.

### Assistant | 2026-06-22T20:55:24.828Z

[tool_use: Read]

### User | 2026-06-22T20:55:25.230Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\PSNHealthCheckEngine.ts' was already read 9s ago in this session and is unchanged (mtime 1782161434543). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-22T20:55:25.328Z

[tool_use: Read]

### Assistant | 2026-06-22T20:55:25.660Z

[tool_use: Read]

### User | 2026-06-22T20:55:25.957Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-psn-health-features.mjs' was already read 9s ago in this session and is unchanged (mtime 1782161492615). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T20:55:26.084Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\PSNHealthCheckEngine.test.ts' was already read 9s ago in this session and is unchanged (mtime 1782161598249). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-22T20:55:29.443Z

The read-once guard indicates these files were already read earlier in this session. Let me use Grep to access the specific content I need to verify.

### Assistant | 2026-06-22T20:55:30.998Z

[tool_use: Grep]

### User | 2026-06-22T20:55:31.976Z

[tool_result] 33-  engines:   z.object({ built: z.number().int().nonnegative(), wired: z.number().int().nonnegative(), unwired: z.number().int().nonnegative() }).optional(),
34-  algorithms:z.object({ count: z.number().int().nonnegative() }).optional(),
35-  formulas:  z.object({ constantsFileExists: z.boolean(), inlinedViolations: z.number().int().nonnegative() }).optional(),
36:  nnGnn:     z.object({
37-    
... [+3703 chars truncated]

### Assistant | 2026-06-22T20:55:33.151Z

[tool_use: Grep]

### User | 2026-06-22T20:55:34.094Z

[tool_result] 17-import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
18-import { existsSync } from "node:fs";
19-// Canonical GNN deploy-gate reader (single source of truth, shared with the PSN-leg hook).
20:import { loadEval, classifyGnn } from "../.claude/hooks/nn-graph-health-inject.mjs";
21-import path from "node:path";
22-
23-const ROOT = "H:/prism";
--
32-const BROKEN_LINK_AMBER 
... [+2808 chars truncated]

### Assistant | 2026-06-22T20:55:34.126Z

[tool_use: Grep]

### User | 2026-06-22T20:55:35.033Z

[tool_result] 12-  engines:    { built: 2700, wired: 2600, unwired: 100 },  // ~3.7% unwired
13-  algorithms: { count: 250 },
14-  formulas:   { constantsFileExists: true, inlinedViolations: 0 },
15:  nnGnn:      { auroc: 0.82, brier: 0.12, promoted: true },
16-  prismAi:    { engineCount: 7, memoCoveragePct: 85 },
17-});
18-
--
91-    expect(r.legs.find(l => l.name === "Formulas")?.status).toBe("red");
92-  })
... [+3796 chars truncated]

### Assistant | 2026-06-22T20:55:38.837Z

Now let me get the remaining details I need — the generator's old ad-hoc read path vs new path, the hook's `classifyGnn` signature, and a check on the `generate-psn-health-features.mjs` local classifier block (the stale inline branch at line ~111 that still uses the old signal text).

### Assistant | 2026-06-22T20:55:41.073Z

[tool_use: Grep]

### User | 2026-06-22T20:55:41.962Z

[tool_result] 22- * Discipline (mirrors knowledge-link-audit-inject / wiki-tribal-coverage):
23- *   - ADVISORY only, NEVER blocking — exits 0; valid SessionStart envelope
24- *   - No spawn — the eval pipeline runs on its own schedule
25: *   - State-gated: silent ONLY when the GNN is healthy+deployed (AUROC past
26- *     the promotion gate AND not deferred) — the interesting state (dormant /
27- *     below-
... [+9689 chars truncated]

### Assistant | 2026-06-22T20:55:42.353Z

[tool_use: Grep]

### User | 2026-06-22T20:55:43.328Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\devDispatcher.ts-35-const DOCS_DIR = path.join(MCP_ROOT, "data", "docs");
H:\prism\mcp-server\src\tools\dispatchers\devDispatcher.ts-36-const STATE_DIR = PATHS.STATE_DIR;
src\tools\dispatchers\devDispatcher.ts:37:[Omitted long matching line]
src\tools\dispatchers\devDispatcher.ts-38-\ U-DOCU-05 \ MS-DOCU-INGEST: JMDieArchiveBackAnnotationEngine surfaces (3
... [+2440 chars truncated]

### Assistant | 2026-06-22T20:55:46.551Z

Now let me check the one remaining concern — the stale inline classifier in the generator file that still uses the old signal text, and verify the `psn-synergy-collect` second generator for blast radius.

### Assistant | 2026-06-22T20:55:49.027Z

[tool_use: Grep]

### User | 2026-06-22T20:55:49.950Z

[tool_result] 31-const STALE_PRISM_OS_MIN = 60;
32-const BROKEN_LINK_AMBER  = 2.0;
33-const BROKEN_LINK_RED    = 5.0;
34-const TRIBAL_MIN_DOMAINS = 3;
35:const NN_AUROC_PROMOTE   = 0.78;
36:const NN_BRIER_PROMOTE   = 0.15;
37-const MEMO_COV_AMBER     = 75.0;
38-const MEMO_COV_RED       = 50.0;
39-const UNWIRED_AMBER_PCT  = 10.0;
40-const UNWIRED_RED_PCT    = 25.0;
--
102-      if (!i.constantsFileExists) return
... [+2272 chars truncated]

### Assistant | 2026-06-22T20:55:50.247Z

[tool_use: Grep]

### User | 2026-06-22T20:55:50.254Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/scripts/generate-psn-synergy-collect.mjs. Note: your current working directory is H:\prism\mcp-server.</tool_use_error>

### Assistant | 2026-06-22T20:55:54.651Z

Now I have everything I need. Let me locate the second PSN collector to close the blast-radius check.

### Assistant | 2026-06-22T20:55:55.267Z

[tool_use: Glob]

### Assistant | 2026-06-22T20:55:55.744Z

[tool_use: Glob]

### User | 2026-06-22T20:56:03.062Z

[tool_result] H:\prism\scripts\psn-synergy-collect.mjs
H:\prism\scripts\psn-synergy-collect.test.mjs

### User | 2026-06-22T20:56:03.109Z

[tool_result] No files found

### Assistant | 2026-06-22T20:56:06.494Z

[tool_use: Grep]

### User | 2026-06-22T20:56:07.386Z

[tool_result] 630-  const tribal = collectTribalLeg();
631-  const systemViz = collectSystemVizLeg();
632:  const nnGnn = collectNNGNNLeg();
633-  const prismOs = collectPrismOsLeg();
634-  const prismAI = collectPrismAILeg();
--
670-  const algorithmsOut = scanLegOutEdges(algorithms.files, "algorithms");
671-  const formulasOut = scanLegOutEdges(formulas.files, "formulas");
672:  const nnGnnOut = scanLegOutEdg
... [+602 chars truncated]

### Assistant | 2026-06-22T20:56:54.788Z

I have all the information needed. Here is the complete review.

---

VERDICT: FAIL

summary: The core bug fix (PSNHealthCheckEngine `classifyNnGnn` now names the correct failing gate and surfaces selective-deploy) and the R7 unification of `gatherNnGnn` through `classifyGnn` are both correct and well-reasoned. However, there is one P1 defect: the local inline classifier inside `generate-psn-health-features.mjs` is a stale divergent copy that was NOT updated by this unit — it still emits the misleading `AUROC ${a} < gate` signal even when AUROC passes and Brier fails, and it is silently blind to `selectiveDeployReady`. This is the exact divergence the R7 unification was supposed to eliminate, but it only half-closed it.

findings:

- [P1] `H:/prism/scripts/generate-psn-health-features.mjs:106-111` -- The local `switch` classifier block for `"nnGnn"` (used by the script's own `classifyLeg` function, separate from `gatherNnGnn`) was NOT updated. Line 111 still reads `return { status: "amber", signal: \`AUROC ${i.auroc.toFixed(3)} < ${NN_AUROC_PROMOTE} gate\` }` — the identical stale signal the engine fix was designed to correct. It also has no `selectiveDeployReady` branch. This means: (a) when the script calls its own `classifyLeg("nnGnn", ...)` path it produces the wrong signal; (b) the fix did not achieve the stated R7 single-source goal for the generator's classification output — only `gatherNnGnn` (the gatherer) was unified, not the classifier that consumes its output in this file. Fix: either delete this local `case "nnGnn"` block and delegate to `PSNHealthCheckEngine.check()`, or mirror the three-branch logic from `classifyNnGnn` in the engine. The simplest correct fix is to import and call `PSNHealthCheckEngine.check({ nnGnn: i })` for this leg, making it a true single source.

- [P2] `H:/prism/scripts/generate-psn-health-features.mjs:35-36` -- `NN_AUROC_PROMOTE = 0.78` and `NN_BRIER_PROMOTE = 0.15` are re-declared as local constants in this file rather than i
... [+4705 chars truncated]
