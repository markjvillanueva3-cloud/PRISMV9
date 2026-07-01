---
type: "chat-session"
source: "claude-code-cli"
session_id: "9aab2d98-78ae-4a9b-9dd7-d941b46c3453"
title: "Independent second-pass review of H:\\prism\\mcp-server\\scripts\\train-cnc-controll"
date: "2026-05-19"
first_ts: "2026-05-19T15:28:31.432Z"
last_ts: "2026-05-19T15:34:05.610Z"
cwd: "H:\\PRISM"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/9aab2d98-78ae-4a9b-9dd7-d941b46c3453/subagents/agent-a16ebc317e527aec3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Independent second-pass review of H:\prism\mcp-server\scripts\train-cnc-controll

> **claude-code-cli** | 2026-05-19 | 20 msgs (8 user / 12 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/9aab2d98-78ae-4a9b-9dd7-d941b46c3453/subagents/agent-a16ebc317e527aec3.jsonl`

## Transcript

### User | 2026-05-19T15:28:31.432Z

Independent second-pass review of H:\prism\mcp-server\scripts\train-cnc-controller-from-corpus.mjs. The primary reviewer is checking regex correctness + pure-core boundary + fail-loud. You should focus on what they're unlikely to catch:

1. **Integration coupling** — the file declares (in its docstring) that CNCControllerDeepLearningEngine.ingestLearnedPatterns() (NOT YET WRITTEN) will consume the emitted JSON. Is the emitted schema flexible enough that the engine can resolve a learned pattern to a `controller` field cleanly? (e.g. is the `controller` literal one of the existing ControllerFamily enum values exported by the engine: okuma_osp / haas_ngc / hurco_winmax / fanuc / mazak_mazatrol / siemens_sinumerik / heidenhain_tnc / mitsubishi / roku_roku)
2. **Security** — extractor reads operator-supplied filenames as `source_file` and bakes them into JSON. Is there any path-traversal risk? Any chance a malicious filename in the corpus (e.g. `../../etc/passwd.min`) becomes a payload in the ledger?
3. **Error budget completeness** — what happens if a .min file is gigabytes? Is the readFileSync('utf8') call bounded? What happens on a binary file masquerading as .min?
4. **Naming / convention conformance** — does the file follow CLAUDE.md conventions: NO inline physics constants (this script has none, but verify), R8 fail-loud, JSDoc on every public function?
5. **Inlined constants** — are the file extensions list and ControllerFamily literals duplicated from the engine? Should they be shared? (Note: the engine is .ts and this script is .mjs — sharing requires extra effort; flag if a duplication-risk exists.)
6. **Stub assertions / silent-success** — is there any code path where the script writes an empty/near-empty ledger and exits 0? Per R12 the script must fail loudly when extraction is trivially empty.
7. **Test file readiness** — what test cases should the companion test file (not yet written) MUST include to catch regressions in the regexes? Name them.

Report P0/P
... [+79 chars truncated]

### Assistant | 2026-05-19T15:28:44.474Z

I'll review the file thoroughly, focusing on the angles you've highlighted.

### Assistant | 2026-05-19T15:28:44.551Z

[tool_use: Read]

### User | 2026-05-19T15:28:52.205Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\scripts\train-cnc-controller-from-corpus.mjs' was already read 9s ago in this session and is unchanged (mtime 1779204459688). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-05-19T15:28:55.196Z

Let me check the file fresh and gather supporting context.

### Assistant | 2026-05-19T15:28:56.353Z

[tool_use: Bash]

### User | 2026-05-19T15:29:35.303Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
#!/usr/bin/env node
/**
 * train-cnc-controller-from-corpus.mjs
 *
 * AI-TRAINING-FIRST-MS0 / U-AITRAIN-POST-CNC-CONTROLLER-DEEP-LEARNING — Step 1+2:
 * Mine real CNC programs to produce a non-stub LearnedControllerPatterns ledger
 * that CNCControllerDeepLearningEngine can ingest at runtime.
 *
 * SCOPE — deterministic, p
... [+10821 chars truncated]

### Assistant | 2026-05-19T15:29:42.920Z

[tool_use: Read]

### User | 2026-05-19T15:29:53.811Z

[tool_result] 300	    controllerCounts[r.controller] = (controllerCounts[r.controller] || 0) + 1;
301	  }
302	  if (fileResults.length === 0) {
303	    throw new Error(
304	      `buildLedger: ${files.length} corpus file(s) found but none yielded a ` +
305	        `detectable controller family — extractors produced an empty ledger`
306	    );
307	  }
308	  return {
309	    schemaVersion: "1.0.0",
310	    genera
... [+2785 chars truncated]

### Assistant | 2026-05-19T15:29:59.184Z

Now let me check the engine the docstring claims is the consumer, to verify the integration contract.

### Assistant | 2026-05-19T15:30:00.282Z

[tool_use: Bash]

### User | 2026-05-19T15:30:25.919Z

[tool_result] 1F 1D:

./ CNCControllerDeepLearningEngine.ts

### Assistant | 2026-05-19T15:30:30.643Z

[tool_use: Grep]

### User | 2026-05-19T15:30:47.170Z

[tool_result] 26:export type ControllerFamily =
51:  family: ControllerFamily;
64:  source_controller: ControllerFamily;
65:  target_controller: ControllerFamily;
74:  controller: ControllerFamily;
84:  controller: ControllerFamily;
92:  controller: ControllerFamily;
103:const CONTROLLER_PROFILES: Record<ControllerFamily, ControllerProfile> = {
215:const GCODE_TRANSLATIONS: Record<string, Record<ControllerFamil
... [+752 chars truncated]

### Assistant | 2026-05-19T15:30:53.183Z

[tool_use: Read]

### User | 2026-05-19T15:31:02.589Z

[tool_result] 26	export type ControllerFamily =
27	  | "okuma_osp"
28	  | "haas_ngc"
29	  | "hurco_winmax"
30	  | "fanuc"
31	  | "mazak_mazatrol"
32	  | "siemens_sinumerik"
33	  | "heidenhain_tnc"
34	  | "mitsubishi"
35	  | "roku_roku";
36	
37	export type ControllerCapability =
38	  | "conversational"
39	  | "iso_gcode"
40	  | "macro_b"
41	  | "custom_macro"
42	  | "cutter_comp"
43	  | "tool_life_mgmt"
44	  | "
... [+724 chars truncated]

### Assistant | 2026-05-19T15:31:08.155Z

I have the engine contract. Let me verify a couple more security/edge angles before issuing findings.

### Assistant | 2026-05-19T15:31:10.190Z

[tool_use: Bash]

### User | 2026-05-19T15:31:48.079Z

[tool_result] 10:31 ./
10:31 ../
11:41 BASE WAFER INSERT MACRO.min  193.0K
15:51 BASIC CASING WITH SINGLE COUNTERBORE.min  193.0K
11:10 BASIC TOP HAT CASING WITH SINGLE COUNTERBORE.min  193.0K
---
3918F 19D:

__tests__/ 5AXIS-DEEP.test.ts AHPEngine.test.ts AIAutoUtilizationEngine.test.ts AIDecisionExplanationEngine.test.ts AIDispatcherConsensusDecide.test.ts AIMLFormulasEngine.test.ts AIReasoningDispatcher.tier
... [+1413 chars truncated]

### Assistant | 2026-05-19T15:34:05.610Z

I have enough context. Here is the independent second-pass review.

---

# Independent second-pass review — `train-cnc-controller-from-corpus.mjs`

**File reviewed:** `H:\prism\mcp-server\scripts\train-cnc-controller-from-corpus.mjs` (386 lines)
**Engine consumer (contract source):** `H:\prism\mcp-server\src\engines\CNCControllerDeepLearningEngine.ts` lines 26-35
**Focus:** integration coupling, security, error budget, naming, inlined-constant duplication, silent-success, test readiness.

---

## P0 — must fix before ship

### P0-A — Unbounded `readFileSync('utf8')` on operator-supplied corpus (line 220)

`mineFile()` calls `readFileSync(filePath, "utf8")` with **no size cap**. The corpus is `H:/prism/JM DIE/MACRO PROGRAMS` (operator-controlled, but the script's contract is "any corpus dir"). A single multi-GB `.nc` (3D-printer slice, blob masquerading as G-code, malformed export) will OOM the host — and per `## Recent regressions` 2026-05-18 the fleet already lost a `system-graph.json` to an OOM-killed Node child, with the reaper blinded in the same window. A 16-GB-heap script that OOMs hands the same blast radius to this tool.

**Fix:**
```js
const st = statSync(filePath);
const MAX_BYTES = Number(process.env.PRISM_TRAIN_CNC_MAX_BYTES ?? 32 * 1024 * 1024); // 32 MB
if (st.size > MAX_BYTES) {
  throw new Error(`mineFile: ${basename(filePath)} is ${st.size} bytes (cap ${MAX_BYTES}); set PRISM_TRAIN_CNC_MAX_BYTES to override`);
}
```
Throw at the file level, let `buildLedger` decide policy (skip vs. abort). Currently it would abort the whole run — that is fine per R12.

### P0-B — Binary file masquerading as `.min` silently produces noise

`detectControllerFamily` for `.min` returns `"okuma_osp"` **unconditionally** (line 56 fallback after the sniff — the sniff is decorative; the next line returns the same value regardless). A binary `.min` (someone renamed a `.dwg`, a CAD export, a UTF-16 file) gets ingested as Okuma OSP. `readFileSync(..., "utf8")` will not throw o
... [+17760 chars truncated]
