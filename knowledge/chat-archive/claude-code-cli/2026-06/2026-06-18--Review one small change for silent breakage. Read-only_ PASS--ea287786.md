---
type: "chat-session"
source: "claude-code-cli"
session_id: "ea287786-b40e-4641-ab17-c6899e6925a3"
title: "Review one small change for silent breakage. Read-only; PASS/FAIL + P0/P1 (file:"
date: "2026-06-18"
first_ts: "2026-06-18T13:32:32.525Z"
last_ts: "2026-06-18T13:37:52.031Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 22
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/ea287786-b40e-4641-ab17-c6899e6925a3/subagents/agent-ace8703d2b09d2d0c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review one small change for silent breakage. Read-only; PASS/FAIL + P0/P1 (file:

> **claude-code-cli** | 2026-06-18 | 64 msgs (22 user / 42 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ea287786-b40e-4641-ab17-c6899e6925a3/subagents/agent-ace8703d2b09d2d0c.jsonl`

## Transcript

### User | 2026-06-18T13:32:32.525Z

Review one small change for silent breakage. Read-only; PASS/FAIL + P0/P1 (file:line). Run: `git -C H:/prism diff scripts/audit-unwired-engines.mjs scripts/audit-unwired-engines.test.mjs`

Change: in scripts/audit-unwired-engines.mjs, engineReferencedInConsumer now strips comments (new `stripCommentLines`) before wiring-detection, so a commented-out / JSDoc `import("...Engine.js")` mention can't false-WIRE a real orphan. stripCommentLines: (1) removes C-style block comments via `/\/\*[\s\S]*?\*\//g`, (2) drops whole lines whose trim() startsWith `//` or `*`. It has a single-entry cache (`_lastStripContent`/`_lastStripCode`) keyed by `content ===` reference.

VERIFY (silent-breakage focus):
- Does the single-entry cache ever return a STALE/wrong stripped result? (It keys on `content ===`; stripping is name-independent, so a cache hit across different `name` values is correct — confirm. Any path where two different contents collide?)
- Does removing whole `//`/`*` lines + block comments break any LEGITIMATE wiring detection? Consider: a static import line `import {x} from "...Engine.js"` (starts with `import`, kept ✓), a route-map `xproc: () => import("...")` (kept ✓), an ACTION_MAP tuple line (kept ✓). Could a real code line ever start with `*` or `//` after trim? (e.g. a continued expression?)
- The URL footgun: confirm a code line containing `http://` is NEVER mid-line stripped (only whole comment lines + block spans are removed). Could `/* */` regex eat a `/*` inside a string literal in a real consumer file, removing real code? Assess likelihood + harm.
- Perf: the cache collapses O(engines*files) strips to O(files) because applyConsumerClassification iterates all engines per file. Confirm that loop structure actually makes consecutive calls share `content` (else the cache is useless). Check applyConsumerClassification.
- Did the live audit count stay 15 (no regression)? 27/27 tests pass.
Report PASS/FAIL + P0/P1.

### Assistant | 2026-06-18T13:32:38.408Z

I'll investigate this change for silent breakage. Let me start by reading the diff and the relevant files.

### Assistant | 2026-06-18T13:32:39.075Z

[tool_use: Bash]

### User | 2026-06-18T13:32:42.686Z

[tool_result] diff --git a/scripts/audit-unwired-engines.mjs b/scripts/audit-unwired-engines.mjs
index dad5b1ea74..bfce4eda4c 100644
--- a/scripts/audit-unwired-engines.mjs
+++ b/scripts/audit-unwired-engines.mjs
@@ -128,8 +128,44 @@ function escapeRegExp(s) {
  * @param {string} content full text of the consumer file
  * @returns {boolean} true if `content` references `name` as a wiring
  */
+// Single-entry c
... [+4920 chars truncated]

### Assistant | 2026-06-18T13:32:46.126Z

Let me read the full file to understand the surrounding context and the consumer-classification loop structure.

### Assistant | 2026-06-18T13:32:46.292Z

[tool_use: Read]

### User | 2026-06-18T13:32:47.334Z

[tool_result] 1	#!/usr/bin/env node
2	// audit-unwired-engines.mjs
3	// Deep scan of canonical engines folder. Classifies each engine as:
4	//   WIRED-DIRECT       — imported by a dispatcher
5	//   WIRED-VIA-ROUTE    — imported by routes/*.ts (consumed by MCP server)
6	//   WIRED-VIA-REGISTRY — imported by registries/*.ts
7	//   WIRED-VIA-ORCH     — imported by *Orchestrator*.ts
8	//   WIRED-VIA-SINGLETON — wra
... [+24832 chars truncated]

### Assistant | 2026-06-18T13:32:50.957Z

Now let me examine the test file fully and verify the live audit count claim and run the tests.

### Assistant | 2026-06-18T13:32:51.234Z

[tool_use: Read]

### User | 2026-06-18T13:32:52.245Z

[tool_result] 1	// audit-unwired-engines.test.mjs
2	// Tests engineReferencedInConsumer — the wiring-detection predicate of
3	// audit-unwired-engines.mjs. Covers static imports, literal dynamic imports,
4	// table-driven ACTION_MAP wiring (the false-UNWIRED blind spot fixed 2026-05-18),
5	// substring-safety guards, and a real-file E2E against mechanicalDesignDispatcher.
6	//
7	// Run: node --test scripts/audi
... [+14895 chars truncated]

### Assistant | 2026-06-18T13:32:55.911Z

Now let me run the tests and the live audit to verify the claims (27/27 tests, count stays 15).

### Assistant | 2026-06-18T13:32:56.500Z

[tool_use: Bash]

### User | 2026-06-18T13:33:00.850Z

[tool_result]   ...
# Subtest: WIRE-EXEMPT engines are never reclassified by a consumer pass
ok 26 - WIRE-EXEMPT engines are never reclassified by a consumer pass
  ---
  duration_ms: 0.5291
  ...
# Subtest: truly dormant engine (zero consumers) stays unclassified -> UNWIRED in main()
ok 27 - truly dormant engine (zero consumers) stays unclassified -> UNWIRED in main()
  ---
  duration_ms: 0.0617
  ...
1..27
# 
... [+95 chars truncated]

### Assistant | 2026-06-18T13:33:04.913Z

27/27 confirmed. Now let me run the live audit to verify the UNWIRED count.

### Assistant | 2026-06-18T13:33:05.843Z

[tool_use: Bash]

### User | 2026-06-18T13:33:36.023Z

[tool_result] scanning engines …
  3805 engine files
scanning consumers ...
  dispatchers=119 routes=77 registries=27 orch=78 hooks=54 singletons=4 engines=3805

=== Unwired Engine Audit Summary ===
total engines:            3805
  UNWIRED                15
  WIRE-EXEMPT            114
  WIRED-DIRECT           3594
  WIRED-VIA-ENGINE       24
  WIRED-VIA-HOOK         8
  WIRED-VIA-ORCH         36
  WIRED-VIA-RO
... [+153 chars truncated]

### Assistant | 2026-06-18T13:33:40.636Z

Live count confirmed: UNWIRED=15, no regression. Now let me check whether the comment-stripping could break legitimate wiring detection. The key concern is the `* `-prefixed line filter — could a real consumer file have a multi-line static import where a continuation line starts with `*`? Let me check the actual import/route shapes in real dispatcher and route files for any line that, after `trim()`, begins with `*` or `//` but is part of live code.

### Assistant | 2026-06-18T13:33:43.328Z

[tool_use: Bash]

### User | 2026-06-18T13:33:47.053Z

[tool_result] === lines starting with * (after trim) in dispatchers/routes that contain Engine ===
mcp-server/src/tools/dispatchers/adaptiveControlDispatcher.ts:10: *   BayesianAdaptiveEngine, ToolLifeAdaptiveEngine, DigitalTwinSyncEngine
mcp-server/src/tools/dispatchers/agentDispatcher.ts:9: *   - chat                — One-shot agentic loop (AgenticLoopEngine.run)
mcp-server/src/tools/dispatchers/aiReasoningDi
... [+2171 chars truncated]

### Assistant | 2026-06-18T13:33:53.901Z

These are all JSDoc header comment lines (prefixed `*`) listing engine names in prose. This is exactly the desired behavior — these are prose mentions inside block comments and should be stripped so they don't false-WIRE. The key question: are any of these engines that would ONLY appear in such a comment line and have NO real import? That would be a false-UNWIRED regression. But these `*`-prefixed lines are inside `/** ... */` JSDoc blocks, so they're already removed by the block-comment regex first. Let me verify these are block comments and confirm the engines listed there also have real imports (so no regression).

Let me focus on the more critical risk: a real CODE line (not comment) that starts with `*` or `//` after trim, OR a block-comment regex eating real code inside a string literal. Let me hunt for both.

### Assistant | 2026-06-18T13:33:56.769Z

[tool_use: Bash]

### User | 2026-06-18T13:34:03.489Z

[tool_result] === CODE lines (not in block comments) starting with // that contain import + Engine.js — these would be wrongly dropped IF they were real code ===
(any hit here that is NOT a genuine comment = false-UNWIRED risk)
mcp-server/src/tools/dispatchers/aiDispatcher.ts:31:        // This would normally import and call the Python ModelRouterEngine
mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:
... [+214 chars truncated]

### Assistant | 2026-06-18T13:34:07.687Z

All three are genuine comments (correctly dropped). The third one is interesting — `IGESImportEngine` mentioned in a comment. Let me check if `IGESImportEngine` has a REAL import in that file too, to confirm no false-UNWIRED regression for it.

### Assistant | 2026-06-18T13:34:09.020Z

[tool_use: Bash]

### User | 2026-06-18T13:34:12.642Z

[tool_result] === IGESImportEngine references in cadAutomationDispatcher.ts ===
662:          // â”€â”€ CAD-UNIVERSAL-CONTROL-MS0/U-CUC07: IGES import via IGESImportEngine â”€â”€
664:            const { IGESImportEngine } = await import("../../engines/IGESImportEngine.js");
665:            const engine = new IGESImportEngine();
676:              source: "IGESImportEngine.parseIGES",
681:            const { IGES
... [+392 chars truncated]

### Assistant | 2026-06-18T13:34:18.321Z

IGESImportEngine has real `await import(...)` lines at 664/681/696 (which are code lines, NOT stripped), so it stays correctly WIRED. The comment at 662 being stripped causes no harm. This validates the design.

Now the critical block-comment string-literal footgun: can `/\/\*[\s\S]*?\*\//g` eat real code if a `/*` appears inside a string literal (e.g. a regex or URL)? Let me search for `/*` inside strings in the actual consumer files.

### Assistant | 2026-06-18T13:34:21.000Z

[tool_use: Bash]

### User | 2026-06-18T13:34:25.194Z

[tool_result] === occurrences of /* inside string/regex literals in consumer files (the block-regex footgun) ===
mcp-server/src/tools/dispatchers/businessDispatcher.ts:3568:"); usedPath = c; break; } catch { /*
mcp-server/src/tools/dispatchers/calcDispatcher.ts:1345:" }); } catch { /*
mcp-server/src/tools/dispatchers/devDispatcher.ts:724:")); Array.isArray(d) ? items.push(...d) : items.push(d); } catch (e) { /*
... [+1880 chars truncated]

### Assistant | 2026-06-18T13:34:33.838Z

The footgun IS present in real consumer files. There are `/*` tokens inside string literals (e.g. `intake.ts:27` has `*/*` which is a MIME wildcard `*/*`, and `index.ts` has glob patterns like `/api/v1/parts/*`, and several `catch { /* ... */ }` empty-comment idioms). Let me analyze whether any of these `/*` inside a string literal could actually cause the block-comment regex to span across real import code and remove it.

The danger: the regex `\/\*[\s\S]*?\*\/` is non-greedy, so a `/*` inside a string finds the NEXT `*/` and removes everything between. If an engine's only import sits between a string-literal `/*` and the next `*/`, that import would be silently stripped → false-UNWIRED. Let me check the most suspicious cases — particularly `routes/intake.ts:27` which has `*/*` (a `/*` immediately followed by something), and check whether real import-bearing code follows these tokens.

### Assistant | 2026-06-18T13:34:34.774Z

[tool_use: Read]

### User | 2026-06-18T13:34:36.983Z

[tool_result] 20	
21	/** Creates intake router. */
22	export function createIntakeRouter(): Router {
23	  const router = Router();
24	
25	  router.post(
26	    "/webhook",
27	    rawParser({ type: "*/*", limit: PAYLOAD_CAP_BYTES }),
28	    (req, res) => {
29	      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
30	      const signature = req.header("X-Intake-Signature") ?? undefined;
31	
... [+391 chars truncated]

### Assistant | 2026-06-18T13:34:47.900Z

`intake.ts:27` — `"*/*"` is a single string. The `/*` token inside it would start a block-comment match, and the regex would scan forward to the NEXT `*/`. The `*/` immediately follows (it's `*/*` = `*` `/` `*`... wait, let me trace precisely): the string is `"*/*"`. Scanning for `/\*`: the chars are `*`, `/`, `*`. The `/*` substring occurs at index 1-2 (`/` then `*`). After that, the regex needs `*/`. The next `*/` would be found in the FOLLOWING lines. So this `/*` opens a phantom block comment that swallows everything until the next genuine `*/`.

This is a real concern. Let me check what follows `intake.ts:27` to see if any import gets eaten, and check the most dangerous pattern systematically — whether unbalanced `/*` in strings spans into import lines. Let me write a precise analysis across all consumer files.

### Assistant | 2026-06-18T13:34:56.529Z

[tool_use: Bash]

### User | 2026-06-18T13:35:00.177Z

[tool_result] CASUALTY tools\dispatchers\ppDispatcher.ts:
   LOST: const { okumaB250LatheMasterPostEngine } = await import("../../engines/OkumaB250LatheMasterPostEngine.js");

=== total import casualties from block-comment regex: 1 ===

### Assistant | 2026-06-18T13:35:04.443Z

I found a real casualty. The block-comment regex eats a genuine import in `ppDispatcher.ts`. Let me examine the exact context to confirm whether this causes a false-UNWIRED classification for `OkumaB250LatheMasterPostEngine`.

### Assistant | 2026-06-18T13:35:05.853Z

[tool_use: Bash]

### User | 2026-06-18T13:35:11.447Z

[tool_result] === ppDispatcher.ts:6279 region (the /* in a string) ===
1625:  "pp_okuma_b250_lathe_program", // OkumaB250LatheMasterPostEngine — also prism_turning:lathe_okuma_b250_program
6308:            const { okumaB250LatheMasterPostEngine } = await import("../../engines/OkumaB250LatheMasterPostEngine.js");
6311:            result = okumaB250LatheMasterPostEngine.generateProgram(operations, config);

### Assistant | 2026-06-18T13:35:15.037Z

[tool_use: Read]

### User | 2026-06-18T13:35:15.986Z

[tool_result] 6274	          }
6275	          case "pp_label_batch": {
6276	            const engine = await getEngine("programLabeling");
6277	            const config = {
6278	              rootPath: params.root_path || params.rootPath || "H:/PRISM/JM DIE",
6279	              filePattern: params.file_pattern || params.filePattern || "**/*.MIN",
6280	              batchSize: params.batch_size || params.batchSi
... [+1923 chars truncated]

### Assistant | 2026-06-18T13:35:24.232Z

Now I need to verify the full picture. The casualty test flagged that the import line at 6308 disappears after the block-strip. The phantom `/*` comes from the glob string `"**/*.MIN"` at line 6279 (the `/*` in `*/*.MIN`... actually `**/*` contains `/*`). The regex then scans forward for the next `*/` and eats everything in between — including the import at line 6308. Let me find exactly where the phantom block opens and closes to confirm the span, and critically — whether `OkumaB250LatheMasterPostEngine` is still detected as wired via some OTHER reference that survives.

The engine basename is `OkumaB250LatheMasterPostEngine`. After stripping, does `OkumaB250LatheMasterPostEngine` still appear anywhere in the stripped code of ppDispatcher.ts?

### Assistant | 2026-06-18T13:35:31.248Z

[tool_use: Bash]

### User | 2026-06-18T13:35:37.136Z

[tool_result] Exit code 1
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\h\prism\scripts\audit-unwired-engines.mjs' imported from C:\Users\wompu\AppData\Local\Temp\okuma-check.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:10)
 
... [+561 chars truncated]

### Assistant | 2026-06-18T13:35:44.401Z

Path issue with the Windows drive mapping. Let me fix the import path.

### Assistant | 2026-06-18T13:35:50.106Z

[tool_use: Bash]

### User | 2026-06-18T13:35:53.550Z

[tool_result] name present in ORIGINAL: true
name present in STRIPPED: true
engineReferencedInConsumer (with fix): false
first phantom block spans lines 1 -> 34
opens with: "/**\n * prism_pp — PostPro"

### Assistant | 2026-06-18T13:36:01.359Z

This is a confirmed silent-breakage finding. `engineReferencedInConsumer("OkumaB250LatheMasterPostEngine", content)` returns **`false`** with the fix, even though the engine IS genuinely wired via a real `await import(...)` at line 6308.

The name still appears in the stripped code (because it's also mentioned at line 1625 in a `// OkumaB250...` trailing comment that survives the line-filter since that line starts with a quoted string `"pp_okuma_b250_lathe_program",`), so the `code.includes(name)` guard passes — but the actual import regex fails because the import line was eaten by the phantom block comment.

Wait — the name IS present in stripped, but the regex returns false. Let me confirm the real cause: which `OkumaB250` reference survives, and whether the import line specifically was eaten. Let me also check whether this engine is rescued by ANOTHER consumer (prism_turning) so it doesn't actually become UNWIRED in the live audit.

### Assistant | 2026-06-18T13:36:06.113Z

[tool_use: Bash]

### User | 2026-06-18T13:36:10.539Z

[tool_result] SURVIVES (stripped line): "\"pp_okuma_b250_lathe_program\", // OkumaB250LatheMasterPostEngine — also prism_turning:lathe_okuma_b2"
--- import line present in stripped? ---
has await import OkumaB250: false
=== now: is OkumaB250LatheMasterPostEngine wired by ANY OTHER consumer (turning dispatcher)? ===
mcp-server/src/tools/dispatchers/camDispatcher.ts
mcp-server/src/tools/dispatchers/ppDispatcher.t
... [+1 chars truncated]

### Assistant | 2026-06-18T13:36:15.156Z

Now I have the complete picture. The engine `OkumaB250LatheMasterPostEngine` is ALSO referenced in `camDispatcher.ts`. Let me confirm whether camDispatcher rescues it (so it stays WIRED-DIRECT in the live audit and the count stays 15), and check whether camDispatcher has the same phantom-block problem.

### Assistant | 2026-06-18T13:36:18.985Z

[tool_use: Bash]

### User | 2026-06-18T13:36:23.946Z

[tool_result] camDispatcher.ts -> true
ppDispatcher.ts -> false
=== how camDispatcher references it ===
6852:            const { okumaB250LatheMasterPostEngine } = await import("../../engines/OkumaB250LatheMasterPostEngine.js");
6901:              source_engine_versions: { "OkumaB250LatheMasterPostEngine": "1.1.0" },
7059:              // OkumaB250LatheMasterPostEngine. The engine is hardwired to
7066:         
... [+112 chars truncated]

### Assistant | 2026-06-18T13:36:30.740Z

This is the key insight that explains why the live count stayed at 15. `OkumaB250LatheMasterPostEngine` is rescued by `camDispatcher.ts` (which detects it as `true`), so it does NOT fall into UNWIRED in this particular live run. The bug is **latent/masked** by the multi-consumer redundancy — but the detection logic for ppDispatcher is genuinely broken.

Let me now assess the broader blast radius: how many engines repo-wide flip from wired→unwired due to this phantom-block-comment regression, and whether any of them are wired ONLY through an affected file (no rescuing consumer). I'll compare the full audit result pre-fix vs post-fix.

### Assistant | 2026-06-18T13:36:40.159Z

[tool_use: Bash]

### User | 2026-06-18T13:36:45.673Z

[tool_result] Engines whose REAL import is eaten by the phantom-block regex in >=1 consumer:
   OkumaB250LatheMasterPostEngine -> ppDispatcher.ts
total affected engine-imports: 1

### Assistant | 2026-06-18T13:36:55.488Z

The blast radius today is exactly 1 engine import (in ppDispatcher.ts), and it's masked because camDispatcher also wires that same engine. So no engine currently flips to UNWIRED → the live count legitimately stays 15. But the underlying detection bug is real and fragile: the moment that engine's camDispatcher wiring is removed/refactored, or a future `**/*` glob / `*/*` MIME string appears in a single-consumer dispatcher right before its only engine import, an engine silently flips to false-UNWIRED — the exact false-UNWIRED class this whole file's history is fighting (the comment at line 142 even claims "safe from the URL footgun" while overlooking the string-literal `/*` footgun).

Let me verify my understanding of the precise mechanism (the phantom block opens at the file's leading JSDoc and the regex's non-greedy match makes it benign there, but a `/*` inside a string mid-file opens a fresh phantom span). Let me confirm exactly which `/*`-in-string opens the span that eats line 6308.

### Assistant | 2026-06-18T13:37:00.365Z

[tool_use: Bash]

### User | 2026-06-18T13:37:04.314Z

[tool_result] PHANTOM SPAN eating line 6308: lines 6279 -> 6393
opens with: "/*.MIN\",\n              batchSi"
closes with: "atch = line.match(/G\\d+\\.?\\d*/"

### Assistant | 2026-06-18T13:37:16.738Z

Mechanism fully confirmed. The phantom block-comment span:
- **Opens** at line 6279 from `"**/*.MIN"` — the `/*` inside the glob string literal (the `**/*` → `/*`).
- **Closes** at line 6393 at `/G\d+\.?\d*/` — the `*/` inside a regex literal `match(/G\d+\.?\d*/)`.
- **Eats** 114 lines (6279–6393) of real code, including the genuine `await import("../../engines/OkumaB250LatheMasterPostEngine.js")` at line 6308.

This is precisely the string-literal `/*` footgun. The JSDoc comment at line 142 ("safe from the URL footgun — a `http://` in code has no block-open token") only reasoned about `http://`, missing that glob patterns (`**/*`), MIME types (`*/*`), and regex literals all contain `/*` or `*/` tokens. Now let me address the cache-staleness questions and confirm the cache is correct, then check the cache effectiveness in the loop.

The cache keys on `content === _lastStripContent` (reference/value equality on the same string). Since stripping is name-independent (it only depends on `content`), a cache hit across different `name` values returns the correct stripped code. The only collision risk would be two DIFFERENT contents that are `===` — impossible, since `===` on strings is value equality, and identical-value strings produce identical strips anyway. The cache is correct.

Let me verify the loop ordering makes the cache effective (consecutive calls share `content`).

### Assistant | 2026-06-18T13:37:17.519Z

[tool_use: Read]

### User | 2026-06-18T13:37:18.489Z

[tool_result] 210	export function applyConsumerClassification(engines, consumerFiles, classification, opts = {}) {
211	  const excludeSelf = opts.excludeSelf === true;
212	  for (const f of consumerFiles) {
213	    if (!f || !f.content) continue;
214	    for (const [name, info] of engines) {
215	      if (info.classified === "WIRE-EXEMPT") continue;
216	      if (excludeSelf && f.engineName === name) continue;

... [+442 chars truncated]

### Assistant | 2026-06-18T13:37:25.763Z

Loop structure confirmed: outer loop over `consumerFiles` (line 212), inner loop over all `engines` (line 214). So for ONE file `f`, all ~3805 engines call `engineReferencedInConsumer(name, f.content)` with the SAME `f.content` consecutively. The single-entry cache keyed on `content ===` hits on every call after the first per file. Cache is effective — strips run O(files), not O(files × engines). The cache correctness and perf claims hold.

One more cache subtlety to rule out: empty-string contents. Line 213 (`if (!f || !f.content) continue`) skips empty content, so `stripCommentLines` never sees `""`. And `engineReferencedInConsumer` returns early on falsy content (line 164) before touching the cache. No stale-cache path from empty strings.

Let me clean up my temp files.

### Assistant | 2026-06-18T13:37:26.663Z

[tool_use: Bash]

### User | 2026-06-18T13:37:30.617Z

[tool_result] cleaned

### Assistant | 2026-06-18T13:37:52.031Z

I have completed a thorough analysis. Here is my verdict.

VERDICT: FAIL

summary: The single-entry cache is correct (keys on string-value equality; stripping is name-independent so cross-`name` hits are sound) and effective (the `for file { for engine }` loop in applyConsumerClassification makes all ~3805 per-file calls share `content`, collapsing strips to O(files)). The line-comment removal is sound — it never mid-line strips, so the `http://` footgun is genuinely avoided. BUT the block-comment regex `/\/\*[\s\S]*?\*\//g` is NOT string-literal-aware: a `/*` token sitting inside a string literal (glob `**/*`, MIME `*/*`) opens a phantom comment span that the regex closes at the next `*/` (often inside a regex literal), silently deleting real code in between — including genuine engine `import(...)` statements. This is a live, reproducible false-UNWIRED regression, masked today only by multi-consumer redundancy, so the count legitimately reads 15.

findings:
- [P1] `scripts/audit-unwired-engines.mjs:150` -- The block-strip `content.replace(/\/\*[\s\S]*?\*\//g, "")` treats `/*` / `*/` tokens inside string/regex literals as comment delimiters. Reproduced live in `mcp-server/src/tools/dispatchers/ppDispatcher.ts`: the glob `"**/*.MIN"` at line 6279 opens a phantom block span that the regex closes at the regex literal `/G\d+\.?\d*/` on line 6393, eating 114 lines of real code — including the genuine `await import("../../engines/OkumaB250LatheMasterPostEngine.js")` at line 6308. As a result `engineReferencedInConsumer("OkumaB250LatheMasterPostEngine", ppDispatcherContent)` now returns **false** (verified) where it returned true before this change. The engine survives in the live audit only because `camDispatcher.ts:6852` independently wires it; any engine wired solely through such a single dispatcher would silently flip to false-UNWIRED — the exact failure class this file's whole history is built to prevent. The JSDoc at line 142 ("safe from the URL footgun -- a http:// 
... [+1370 chars truncated]
