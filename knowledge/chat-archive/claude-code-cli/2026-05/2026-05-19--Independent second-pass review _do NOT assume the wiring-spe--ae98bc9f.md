---
type: "chat-session"
source: "claude-code-cli"
session_id: "ae98bc9f-268e-4456-bc52-3a656c53c8a8"
title: "Independent second-pass review (do NOT assume the wiring-specialist caught every"
date: "2026-05-19"
first_ts: "2026-05-19T00:28:06.348Z"
last_ts: "2026-05-19T00:30:28.509Z"
cwd: "H:\\prism"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/ae98bc9f-268e-4456-bc52-3a656c53c8a8/subagents/agent-a1b7ad89b4b684e34.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Independent second-pass review (do NOT assume the wiring-specialist caught every

> **claude-code-cli** | 2026-05-19 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ae98bc9f-268e-4456-bc52-3a656c53c8a8/subagents/agent-a1b7ad89b4b684e34.jsonl`

## Transcript

### User | 2026-05-19T00:28:06.348Z

Independent second-pass review (do NOT assume the wiring-specialist caught everything) of the FormulaHarvesterEngine→prism_dev wiring for U-GAP-TRIBAL-FORMULA-REGISTRY.

Files (read each end-to-end):
1. H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts — wiring change at line 30 (ACTIONS array) + ~lines 5442-5457 (3 new case blocks: formula_harvest, formula_harvest_sources, formula_harvest_audit).
2. H:/prism/mcp-server/src/engines/FormulaHarvesterEngine.ts — engine wired (static harvest/getSources/audit; reads 3 JS files from a FORMULA_ROOT path on disk).
3. H:/prism/mcp-server/src/__tests__/devDispatcher.formula-harvest-wire.test.ts — round-trip test (4 cases, 4/4 passing).

Weight your review toward what a wiring specialist is unlikely to catch:
- Hidden coupling / security: FormulaHarvesterEngine reads files from disk via a hard-coded FORMULA_ROOT — is that path safe, does a missing-file path fail loud or silently return 0 (R12)? Does the dispatcher expose anything that shouldn't be reachable read-only?
- Error budget: what happens if the JS knowledge files are absent (fresh checkout)? The test asserts totalFormulas > 50 — is that a brittle real-data dependency that will false-red in CI without the Resources dir? Is that acceptable/documented?
- Test integrity: is the anti-stub assertion (totalFormulas>50) actually load-bearing, or could a stub pass? Are the arithmetic invariants (registryEntries.length === totalFormulas) real?
- Naming/convention conformance, inlined constants, no @ts-nocheck.
- Any silent-skip or swallowed-error in the engine's harvest() catch block (it logs and sets byFile[x]=0 on read failure — is that R12-compliant or a silent degrade that the dispatcher now exposes)?

Report P0/P1/P2/P3 findings and grade PASS or FAIL with specific line numbers.

### Assistant | 2026-05-19T00:28:18.455Z

I'll review these three files end-to-end with focus on the areas a wiring specialist would miss.

### Assistant | 2026-05-19T00:28:19.028Z

[tool_use: Read]

### Assistant | 2026-05-19T00:28:19.930Z

[tool_use: Read]

### User | 2026-05-19T00:28:24.236Z

[tool_result] 1	/**
2	 * FormulaHarvesterEngine — RES-MS1: Extract formulas from JS knowledge files
3	 *
4	 * Parses the 3 JS formula files in resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/
5	 * and converts structured formula objects into FormulaRegistry entries.
6	 *
7	 * Source files:
8	 *   - PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js (3,223 lines, ~88 formulas)
9	 *   - PRISM_ADVANCED_CROSS_DOMAIN_v1.
... [+13449 chars truncated]

### User | 2026-05-19T00:28:25.378Z

[tool_result] 1	/**
2	 * devDispatcher × FormulaHarvesterEngine wire (FEATURE-GAP-AUDIT-MS0 / U-GAP-TRIBAL-FORMULA-REGISTRY).
3	 *
4	 * FormulaHarvesterEngine (RES-MS1) was BUILT + tested (19/19) but UNWIRED —
5	 * no dispatcher referenced it, so the ~107 machining formulas it harvests
6	 * from the 3 JS knowledge files were unreachable through the MCP surface
7	 * (the classic FEATURE-GAP-AUDIT "built-but-orph
... [+7676 chars truncated]

### Assistant | 2026-05-19T00:28:27.682Z

Now let me read the dispatcher wiring change.

### Assistant | 2026-05-19T00:28:28.971Z

[tool_use: Read]

### Assistant | 2026-05-19T00:28:29.414Z

[tool_use: Read]

### User | 2026-05-19T00:28:34.001Z

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
... [+10727 chars truncated]

### User | 2026-05-19T00:28:34.146Z

[tool_result] 5400	          case "test_generate_summary": {
5401	            const { autoTestGeneratorEngine: tgSum } = await import("../../engines/AutoTestGeneratorEngine.js");
5402	            result = { summary: tgSum.summary() };
5403	            break;
5404	          }
5405	
5406	          // ── AUTO-4: Route sync validation ──
5407	          case "route_sync_scan": {
5408	            const { routeSyncVal
... [+4330 chars truncated]

### Assistant | 2026-05-19T00:28:37.390Z

Let me check the constants file to verify the FORMULA_ROOT path situation, and whether PATHS provides a non-hardcoded root.

### Assistant | 2026-05-19T00:28:38.681Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:28:41.095Z

[tool_use: Bash]

### User | 2026-05-19T00:28:43.501Z

[tool_result] 7:const DEFAULT_PRISM_ROOT = path.resolve(DEFAULT_MCP_SERVER, "..");
26:const PRISM_ROOT = resolvePath(DEFAULT_PRISM_ROOT, ["PRISM_ROOT", "PRISM_ROOT_PATH"]);
28:const DATA_DIR = resolvePath(path.join(PRISM_ROOT, "data"), ["PRISM_DATA_DIR"]);
29:const STATE_DIR = resolvePath(path.join(PRISM_ROOT, "state"), ["PRISM_STATE_DIR"]);
30:const EXTRACTED_DIR = resolvePath(path.join(PRISM_ROOT, "extracted"
... [+595 chars truncated]

### User | 2026-05-19T00:28:47.027Z

[tool_result] PRISM_ADVANCED_CROSS_DOMAIN_v1.js  32.6K
PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js  155.0K
PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js  125.2K
---gitcheck---
resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js
exit:0
---tracked---

### Assistant | 2026-05-19T00:28:49.412Z

This is a critical finding. Let me confirm the gitignore status and CI implications.

### Assistant | 2026-05-19T00:28:51.137Z

[tool_use: Bash]

### User | 2026-05-19T00:29:04.787Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'resources\|MACHINING'
---ls-files count tracked in resources---
6
---is whole resources ignored---
exit:1

### Assistant | 2026-05-19T00:29:09.042Z

The 3 source `.js` files match `git check-ignore` exit 0 — they ARE git-ignored (some pattern matches them even though `.gitignore` has no literal "resources" — likely a `*.js` or directory pattern). Only 6 files tracked in `resources/`, and the 3 formula files are not among them. This confirms my central concern. Let me verify the exact ignore rule and whether the test files are tracked.

### Assistant | 2026-05-19T00:29:11.377Z

[tool_use: Bash]

### User | 2026-05-19T00:29:22.546Z

[tool_result] .git/info/exclude:8:resources/	resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js
---tracked resources files---
resources/fusion360/prism-test-runner/index.js
resources/fusion360/prism-test-runner/manifest.json
resources/hypermill/prism_test_runner.py
resources/inventor-hsm/PrismTestRunner.ivb
resources/mastercam/PrismTestRunner.cs
resources/mastercam/Pri
... [+115 chars truncated]

### Assistant | 2026-05-19T00:30:28.509Z

Confirmed. The `.git/info/exclude` line 8 ignores `resources/` wholesale. The 3 formula source files are **not tracked in git** and will be **absent on a fresh checkout / CI runner**. Also notable: the new test file is **not yet tracked** (uncommitted), and the engine is tracked.

I have enough to render a definitive verdict.

---

# Independent Second-Pass Review — FormulaHarvesterEngine → prism_dev Wiring

**Verdict: FAIL** (P0 + P1 findings; the wiring mechanics are correct but the design violates R12 fail-loud and the test is a real-data CI landmine)

---

## P0 — `resources/` is git-ignored; the entire feature is dead on a fresh checkout, and the test will false-red in CI

**Evidence:** `.git/info/exclude:8: resources/` — the wholesale `resources/` ignore matches all 3 source files (`PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js`, `PRISM_ADVANCED_CROSS_DOMAIN_v1.js`, `PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js`). `git ls-files resources/` returns only 6 unrelated CAM test-runner files. The formula files are local-only artifacts.

Consequences:

1. **Engine** (`FormulaHarvesterEngine.ts:285-321`): on a fresh clone every `readFile` throws ENOENT → caught at line 300-303 → `byFile[x]=0`, `totalFormulas:0`. The dispatcher action returns `{totalFormulas:0, formulas:[], registryEntries:[]}` and **reports success**. The feature is silently inert. This is the classic R12 violation — *"Migration completed" is a lie if 30 records were skipped.*

2. **Test** (`devDispatcher.formula-harvest-wire.test.ts:111, 132`): `expect(r.data.totalFormulas).toBeGreaterThan(50)` and `totalHarvested > 50`. On any machine without the local `resources/` dir (CI runner, fresh clone, a teammate's box) these two assertions hard-fail. The test header itself (lines 10-17) explicitly calls this the "single assertion that proves production wiring" — but it proves it *only* on the one machine that has the un-tracked files.

This is exactly the failure mode the `RGS-TOOL-AUTOINVOKE-MS1` lesson the test cite
... [+9692 chars truncated]
