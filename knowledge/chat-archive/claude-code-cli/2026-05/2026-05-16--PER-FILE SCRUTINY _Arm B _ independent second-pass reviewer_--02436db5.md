---
type: "chat-session"
source: "claude-code-cli"
session_id: "02436db5-5bb2-4a62-8e0d-1eeba8600240"
title: "PER-FILE SCRUTINY (Arm B — independent second-pass reviewer) for U-DISPATCHER of"
date: "2026-05-16"
first_ts: "2026-05-16T21:33:44.680Z"
last_ts: "2026-05-16T21:36:15.173Z"
cwd: "H:\\prism\\mcp-server"
messages: 44
user_msgs: 19
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/02436db5-5bb2-4a62-8e0d-1eeba8600240/subagents/agent-ac6f6495f1df126e6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# PER-FILE SCRUTINY (Arm B — independent second-pass reviewer) for U-DISPATCHER of

> **claude-code-cli** | 2026-05-16 | 44 msgs (19 user / 25 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/02436db5-5bb2-4a62-8e0d-1eeba8600240/subagents/agent-ac6f6495f1df126e6.jsonl`

## Transcript

### User | 2026-05-16T21:33:44.680Z

PER-FILE SCRUTINY (Arm B — independent second-pass reviewer) for U-DISPATCHER of milestone RGS-TOOL-AUTOINVOKE-MS1. Do NOT assume Arm A (wiring-specialist) caught everything.

## Targets (read end-to-end)
1. `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts` — the 3 new `roadmap_tool_plan_*` case branches (search SCRIPT-WIRE banner "RGS tool-plan sidecar") + the `execFileSync` import addition.
2. `H:/prism/mcp-server/src/schemas/devActionSchemas.ts` — the 3 new ACTION_DEV_SCHEMAS entries.
3. `H:/prism/mcp-server/src/__tests__/devDispatcher.rgs-tool-plan-wire.test.ts` — the 9-case wire test (NEW file).

You are weighted toward what a wiring-specialist under-emphasizes:
- **Security at the subprocess I/O boundary**: `unit_key` flows from an MCP caller into `execFileSync(process.execPath, [scriptPath, "--unit", unitKey, ...])`. execFileSync does NOT spawn a shell so classic `;`/`|`/backtick injection is neutralized — but verify: (a) could a `unit_key` starting with `-` (e.g. `--ollama-off` or `-rf`) be interpreted as a FLAG by the planner script rather than a value? The argv is `[scriptPath, "--unit", unitKey, "--json"]` — unitKey is positionally after `--unit` so it's consumed as that flag's value, but confirm the planner's arg parser doesn't re-scan. The charset regex `[A-Za-z0-9_:.\-]` ALLOWS leading `-` — is that a real risk given the `--unit <val>` positional consumption? Argue it. (b) path-traversal: `scriptPath = path.join(PATHS.SCRIPTS, "rgs-tool-planner.mjs")` is a fixed literal — not user-influenced — confirm.
- **Test integrity (R9)**: do the 9 tests actually fail if the wiring breaks? The "coverage REAL subprocess" test accepts BOTH success AND structured-error — is that too lenient (would it pass even if the case were a no-op stub)? Argue whether the `withPlan <= totalOpen` invariant + the `error === "coverage script failed"` branch genuinely prove the execFileSync wiring, or whether a stub returning `{error:"coverage script failed"}` would also 
... [+1188 chars truncated]

### Assistant | 2026-05-16T21:33:48.035Z

I'll review the three target files end-to-end.

### Assistant | 2026-05-16T21:33:48.510Z

[tool_use: Bash]

### Assistant | 2026-05-16T21:33:49.583Z

[tool_use: Grep]

### User | 2026-05-16T21:33:52.403Z

[tool_result] 872ad577d [MAIN] [TSC-FIX]/FiveAxisCADTemplateEngine: kc1_1->kc11_mpa 7 of 15 (total 959->952)
e752b186e [MAIN] [PER-SLOT-CLAIM-MS0]/U-PSC03+U-PSC06: checkin Step 12 claim integration + concurrent-race E2E oracle — MILESTONE COMPLETE 6/6
bb59cfe3a [MAIN] [TSC-FIX]/BarStockCutPlanEngine: 13->0 (total 972->959)
b6f24770c [MAIN] [PER-SLOT-CLAIM-MS0]/U-PSC04+U-PSC05: post-commit auto-release + Stop-ti
... [+131 chars truncated]

### User | 2026-05-16T21:33:52.987Z

[tool_result] 4309:          case "roadmap_tool_plan_query": {
4330:          case "roadmap_tool_plan_coverage": {
4346:          case "roadmap_tool_plan_build": {

### Assistant | 2026-05-16T21:33:55.789Z

[tool_use: Read]

### User | 2026-05-16T21:33:56.682Z

[tool_result] 4280	                build_analysis: { estimated_hours: bhrs, maintenance_hours_per_year: Number(mhpy), risks: ["No external library available — full build + maintenance burden"], pros: ["Full control over implementation"], cons: ["Build time, cost, and ongoing maintenance"] },
4281	                integrate_analysis: { library_options: [], pros: [], cons: ["No suitable integration option was supp
... [+8860 chars truncated]

### Assistant | 2026-05-16T21:33:56.790Z

[tool_use: Grep]

### User | 2026-05-16T21:33:57.432Z

[tool_result] 9:import { execSync, execFileSync } from "child_process";
572:              const resumeOutput = execSync(
588:              const phase0Output = execSync(
699:                const startupOutput = execSync(
791:                const preCheck = execSync(`node "${path.join(PATHS.SCRIPTS, "pre_build_check.js")}"`, { cwd: MCP_ROOT, timeout: 10000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })
... [+485 chars truncated]

### Assistant | 2026-05-16T21:34:00.542Z

I notice a discrepancy already. Let me check the schemas file and the test file, plus reconcile the actual script names.

### Assistant | 2026-05-16T21:34:01.810Z

[tool_use: Grep]

### User | 2026-05-16T21:34:02.425Z

[tool_result] 69-  // guarded to the roadmap-id alphabet [A-Za-z0-9_:.-] as defense-in-depth: it
70-  // flows into a subprocess argv, and although the dispatcher uses execFileSync
71-  // (no shell) the regex re-checks the contract at the validation boundary too.
72:  roadmap_tool_plan_query: z.object({
73-    unit_key: z.string().min(1).regex(/^[A-Za-z0-9_:.\-]+$/, "unit_key must be roadmap-id charset only ([
... [+936 chars truncated]

### Assistant | 2026-05-16T21:34:02.671Z

[tool_use: Read]

### User | 2026-05-16T21:34:03.718Z

[tool_result] 1	/**
2	 * devDispatcher × RGS tool-plan sidecar wire (RGS-TOOL-AUTOINVOKE-MS1 / U-DISPATCHER).
3	 *
4	 * The 948-plan sidecar (state/shared/roadmap-tool-plans.json) had no dispatcher
5	 * surface — an engine-wiring-doctrine violation per the MS1 punch-list. This
6	 * wires `roadmap_tool_plan_{query,build,coverage}` into prism_dev.
7	 *
8	 * Test strategy (per the MS0 core lesson — "hermetic fakes
... [+10042 chars truncated]

### Assistant | 2026-05-16T21:34:04.510Z

[tool_use: Bash]

### User | 2026-05-16T21:34:09.544Z

[tool_result] rgs-plan-coverage.mjs
rgs-plan-coverage.test.mjs
rgs-tool-planner.e2e.test.mjs
rgs-tool-planner.mjs
rgs-tool-planner.test.mjs
---PATHS.SCRIPTS---

### Assistant | 2026-05-16T21:34:12.401Z

Now let me verify the schema enum registration, PATHS.SCRIPTS resolution, PROJECT_ROOT, and check the canonical script's actual argument parser for the leading-dash question.

### Assistant | 2026-05-16T21:34:14.117Z

[tool_use: Grep]

### User | 2026-05-16T21:34:15.085Z

[tool_result] 4308-          // ──────────────────────────────────────────────────────────────────────────────
4309:          case "roadmap_tool_plan_query": {
4310-            const unitKey = String(params.unit_key ?? params.unitKey ?? "");
--
4329-          }
4330:          case "roadmap_tool_plan_coverage": {
4331-            const scriptPath = path.join(PATHS.SCRIPTS, "rgs-plan-coverage.mjs");
--
4345-     
... [+137 chars truncated]

### Assistant | 2026-05-16T21:34:16.702Z

[tool_use: Bash]

### Assistant | 2026-05-16T21:34:18.286Z

[tool_use: Grep]

### User | 2026-05-16T21:34:20.345Z

[tool_result] 10: *   node scripts/rgs-tool-planner.mjs [--milestone <id>] [--unit <ms::id>]
568:  const args = process.argv.slice(2);
576:    return i >= 0 ? args[i + 1] : null;
579:    const i = args.indexOf("--unit");
580:    return i >= 0 ? args[i + 1] : null;
584:    return i >= 0 ? Number(args[i + 1]) : null;
590:    const v = i >= 0 ? Number(args[i + 1]) : null;
710:const isMain = process.argv[1] &&
711:
... [+81 chars truncated]

### User | 2026-05-16T21:34:25.440Z

[tool_result] ---PROJECT_ROOT in devDispatcher---
17:import { PATHS } from "../../constants.js";
24:const MCP_ROOT = PATHS.MCP_SERVER;
25:const PROJECT_ROOT = PATHS.PRISM_ROOT;
29:const STATE_DIR = PATHS.STATE_DIR;
571:              const PYTHON_PATH = PATHS.PYTHON;
573:                `"${PYTHON_PATH}" "${path.join(PATHS.SCRIPTS_CORE, "resume_detector.py")}" --json`,
587:              const PYTHON_PATH = PATHS
... [+239 chars truncated]

### Assistant | 2026-05-16T21:34:28.736Z

The argument parser uses `args.indexOf("--unit")` then takes `args[i+1]` positionally. Let me see the full parser and confirm PATHS.SCRIPTS / PATHS.PRISM_ROOT, and check the coverage script's contract.

### Assistant | 2026-05-16T21:34:29.552Z

[tool_use: Read]

### Assistant | 2026-05-16T21:34:30.853Z

[tool_use: Bash]

### User | 2026-05-16T21:34:31.388Z

[tool_result] 565	// ---------------------------------------------------------------------------
566	
567	async function main() {
568	  const args = process.argv.slice(2);
569	
570	  const ollamaOff  = args.includes("--ollama-off");
571	  const forceFlag  = args.includes("--force");
572	  const jsonOut    = args.includes("--json");
573	
574	  const milestoneFilter = (() => {
575	    const i = args.indexOf("--mi
... [+1459 chars truncated]

### Assistant | 2026-05-16T21:34:31.758Z

[tool_use: Bash]

### User | 2026-05-16T21:34:38.669Z

[tool_result] 7:const DEFAULT_PRISM_ROOT = path.resolve(DEFAULT_MCP_SERVER, "..");
26:const PRISM_ROOT = resolvePath(DEFAULT_PRISM_ROOT, ["PRISM_ROOT", "PRISM_ROOT_PATH"]);
28:const DATA_DIR = resolvePath(path.join(PRISM_ROOT, "data"), ["PRISM_DATA_DIR"]);
29:const STATE_DIR = resolvePath(path.join(PRISM_ROOT, "state"), ["PRISM_STATE_DIR"]);
30:const EXTRACTED_DIR = resolvePath(path.join(PRISM_ROOT, "extracted"
... [+631 chars truncated]

### User | 2026-05-16T21:34:38.690Z

[tool_result] 10: *   node scripts/rgs-plan-coverage.mjs --json   # machine-readable JSON
33: *   totalOpen: number,
34: *   withPlan: number,
36: *   coveragePct: number,
37: *   perPipeline: Record<string, { shipped: number, blocked: number, reverted: number, total: number, shipRate: number }>,
38: *   bySource: Record<string, number>
45:  const totalOpen = openUnits.length;
49:  let withPlan = 0;
52:      wi
... [+587 chars truncated]

### Assistant | 2026-05-16T21:34:41.546Z

Now I have what I need. Let me verify the sidecar shape (flat vs `.plan` nesting) referenced in P0-6a, and the coverage script's emit + exit behavior.

### Assistant | 2026-05-16T21:34:42.886Z

[tool_use: Bash]

### Assistant | 2026-05-16T21:34:45.787Z

[tool_use: Bash]

### User | 2026-05-16T21:34:46.670Z

[tool_result]     e.shipRate = (e.shipped + 1) / (e.shipped + e.blocked + e.reverted + 2);
  }

  // bySource: count plans by .source. The sidecar stores each ToolPlan FLAT
  // (plans[key] IS the plan — no .plan nesting), so read entry.source directly.
  const bySource = {};
  for (const entry of Object.values(plans)) {
    const src = entry?.source ?? "unknown";
    bySource[src] = (bySource[src] ?? 0) + 1;
 
... [+752 chars truncated]

### User | 2026-05-16T21:34:51.581Z

[tool_result] schemaVersion 1.0.0 plans 0
sample key: undefined
sample shape keys: none
has .plan nesting? n/a

### Assistant | 2026-05-16T21:34:54.361Z

Important finding: the real sidecar has **0 plans** (`schemaVersion 1.0.0 plans 0`), not "hundreds" as the test comment claims. Let me verify the coverage script's CLI emit/exit path and the dispatcher's `path` import.

### Assistant | 2026-05-16T21:34:55.751Z

[tool_use: Bash]

### Assistant | 2026-05-16T21:34:56.959Z

[tool_use: Bash]

### Assistant | 2026-05-16T21:34:58.117Z

[tool_use: Bash]

### User | 2026-05-16T21:34:59.607Z

[tool_result] function renderText(report, sidecarMissing) {
  const lines = [];

  const pctStr = sidecarMissing
    ? "0.0% (no sidecar)"
    : `${report.coveragePct}%`;

  lines.push(`% open units with fresh plan: ${pctStr}`);
  lines.push("=".repeat(48));

  if (sidecarMissing) {
    lines.push("");
    lines.push("  No sidecar found — run /rgs tool-plan --all-open to generate tool plans.");
    lines.push(`
... [+1662 chars truncated]

### User | 2026-05-16T21:35:03.993Z

[tool_result] {
  "sidecarMissing": false,
  "totalOpen": 4423,
  "withPlan": 0,
  "withoutPlan": 4423,
  "coveragePct": 0,
  "perPipeline": {},
  "bySource": {}
}
EXIT=0
---STDERR---
[rgs-unit-enum] Envelope in BOX-AUDIT.json has no id field, using filename stem "BOX-AUDIT"
[rgs-unit-enum] Envelope in DEV-VELOCITY-AUTOTRIGGER-MS0.json has no id field, using filename stem "DEV-VELOCITY-AUTOTRIGGER-MS0"
[rgs-uni
... [+287 chars truncated]

### User | 2026-05-16T21:35:07.831Z

[tool_result] 8:import * as path from "path";

### Assistant | 2026-05-16T21:36:15.173Z

I have everything needed for the verdict. The coverage script runs cleanly (exit 0, valid JSON `{totalOpen:4423, withPlan:0, ...}`), `path`/`PATHS`/`execFileSync` imports confirmed, the planner's arg parser confirmed positional, and the sidecar shape confirmed flat with 0 plans.

---

## VERDICT: PASS (with 1 P1, 3 P2, 2 P3)

The wiring is functionally correct, secure at the subprocess boundary, and the `.plan` nesting bug is NOT reintroduced. The build passes. One P1 (test-comment lie about sidecar contents masks a real false-green gap) and several P2/P3 hygiene items. None are P0 — nothing here blocks the unit, but the P1 weakens the MS0 core-lesson guarantee the unit was specifically created to honor.

---

### Direct answers to the three required questions

**1. Is the leading-dash `unit_key` argv risk real or neutralized by positional `--unit <val>` consumption?**

**Neutralized — confirmed by reading the actual parser.** `rgs-tool-planner.mjs:578-581`:
```js
const i = args.indexOf("--unit");
return i >= 0 ? args[i + 1] : null;
```
The parser does `indexOf("--unit")` then *unconditionally* takes `args[i+1]` as the value — it does **not** re-scan for or reject leading-dash tokens, and it does **not** use a getopt-style library that would treat `-rf` as a flag. The dispatcher builds `argv = [scriptPath, "--unit", unitKey, "--json"]` (devDispatcher.ts:4358), so `unitKey` is always at `i+1` and is consumed as the `--unit` value verbatim regardless of leading `-`. A `unit_key` of `--ollama-off` would be read as the *unit filter string* `"--ollama-off"` (which matches 0 envelopes → empty result), NOT as the `--ollama-off` flag (that is parsed independently via `args.includes("--ollama-off")` at line 570, and the dispatcher only appends the real `--ollama-off` from the typed `params.ollama_off` boolean at devDispatcher.ts:4360). `execFileSync` with no shell already neutralizes metachar injection. The charset regex `^[A-Za-z0-9_:.\-]+$` allowing leading `-` is therefor
... [+9419 chars truncated]
