---
type: "chat-session"
source: "claude-code-cli"
session_id: "efd1e0c2-2259-4fc4-b09d-8c6af113ed16"
title: "Review this 4-file unit (slot:oscar, U-SFC-TSX-REEXEC) for correctness, silent b"
date: "2026-06-25"
first_ts: "2026-06-25T00:51:23.275Z"
last_ts: "2026-06-25T00:56:10.853Z"
cwd: "H:\\prism"
messages: 72
user_msgs: 27
assistant_msgs: 45
raw_file: "H:/.claude/projects/H--prism/efd1e0c2-2259-4fc4-b09d-8c6af113ed16/subagents/agent-a11345bd021d17e4e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review this 4-file unit (slot:oscar, U-SFC-TSX-REEXEC) for correctness, silent b

> **claude-code-cli** | 2026-06-25 | 72 msgs (27 user / 45 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/efd1e0c2-2259-4fc4-b09d-8c6af113ed16/subagents/agent-a11345bd021d17e4e.jsonl`

## Transcript

### User | 2026-06-25T00:51:23.275Z

Review this 4-file unit (slot:oscar, U-SFC-TSX-REEXEC) for correctness, silent breakage, convention conformance, and test integrity. Grade PASS or FAIL with P0/P1/P2 findings + file:line citations. Read each file END TO END.

CONTEXT: PRISM `.mjs` scripts that import `.ts` engines via `.js` specifiers crash under bare `node` with ERR_MODULE_NOT_FOUND (Node TS type-strip won't rewrite `.js`->`.ts`). Crons/loops/MCP-boot that launch `node script.mjs` die opaquely. Fix: a shared tsx self-reexec guard + convert the affected SFC scripts' static `.ts` imports to guarded dynamic imports. This generalizes the proven inline impl in scripts/quoting-train-cycle.mjs (charlie U-QP-TSX-REEXEC, 3-of-3 PASSED).

FILES (absolute):
1. H:/prism/mcp-server/scripts/lib/tsx-reexec-guard.mjs  (NEW shared lib: isUnderTsx/resolveTsxCli/planTsxReexec/reexecUnderTsxIfNeeded)
2. H:/prism/mcp-server/scripts/lib/tsx-reexec-guard.test.mjs  (NEW, node:test, 16 tests)
3. H:/prism/mcp-server/scripts/sfc-full-sweep-compare.mjs  (EDITED: static .ts imports -> guard + dynamic import)
4. H:/prism/mcp-server/scripts/sfc-all-axis-sweep.mjs  (EDITED: same)

Use `git -C H:/prism diff -- mcp-server/scripts/sfc-full-sweep-compare.mjs mcp-server/scripts/sfc-all-axis-sweep.mjs` to see the edits.

EVAL GATE ALREADY PASSED (verify the claims hold): 16/16 tests pass; bare `node sfc-all-axis-sweep.mjs` and bare `node sfc-full-sweep-compare.mjs --no-vendor` both now produce full output (previously ERR_MODULE_NOT_FOUND); tsx-direct path runs in-process without double-launch.

SPECIFICALLY CHECK:
- Does reexecUnderTsxIfNeeded run BEFORE the dynamic `.ts` imports in each edited script? (a static `.ts` import would hoist + throw first — confirm the engine imports are now DYNAMIC and the guard import is a `.mjs` static import that's safe under bare node.)
- Infinite-loop safety: the breaker PRISM_TSX_REEXEC=1 set on the child.
- Arg passthrough + exit-code fidelity + fail-loud on child error (R12).
- Are the dynamically-
... [+338 chars truncated]

### Assistant | 2026-06-25T00:51:26.430Z

I'll review this 4-file unit end to end. Let me start by reading all the files and the diff.

### Assistant | 2026-06-25T00:51:26.903Z

[tool_use: Read]

### Assistant | 2026-06-25T00:51:27.384Z

[tool_use: Read]

### User | 2026-06-25T00:51:28.117Z

[tool_result] 1	/**
2	 * tsx-reexec-guard -- shared bare-node -> tsx self-re-exec for `.mjs` scripts that load `.ts` engines.
3	 *
4	 * WHY (the bug class this kills):
5	 *   A `.mjs` script that imports a TypeScript engine via a `.js` specifier
6	 *   (`import ... from "../src/engines/X.js"` where only `X.ts` exists) runs fine under
7	 *   `npx tsx` but throws `ERR_MODULE_NOT_FOUND` under bare `node` -- Node's
... [+6248 chars truncated]

### Assistant | 2026-06-25T00:51:28.453Z

[tool_use: Bash]

### User | 2026-06-25T00:51:28.662Z

[tool_result] 1	/**
2	 * Tests for tsx-reexec-guard.mjs (U-SFC-TSX-REEXEC, slot:oscar).
3	 * Run: cd mcp-server && node scripts/lib/tsx-reexec-guard.test.mjs   (node:test auto-runs on exit)
4	 *
5	 * Coverage: pure decision matrix (isUnderTsx / resolveTsxCli / planTsxReexec) + the side-effecting
6	 * reexecUnderTsxIfNeeded with INJECTED runner+exit spies (no real child launched in unit tests) +
7	 * a real E2E 
... [+7683 chars truncated]

### User | 2026-06-25T00:51:32.832Z

[tool_result] diff --git a/mcp-server/scripts/sfc-all-axis-sweep.mjs b/mcp-server/scripts/sfc-all-axis-sweep.mjs
index 793485c488..1aabedef6d 100644
--- a/mcp-server/scripts/sfc-all-axis-sweep.mjs
+++ b/mcp-server/scripts/sfc-all-axis-sweep.mjs
@@ -40,7 +40,13 @@
 import fs from "node:fs";
 import path from "node:path";
 import { pathToFileURL } from "node:url";
-import { speedFeedNineAxisOrchestratorEngine } f
... [+1937 chars truncated]

### Assistant | 2026-06-25T00:51:37.916Z

Now let me read both edited scripts end to end to verify the dynamic-import bindings are used only after the guard resolves, and check surrounding conventions.

### Assistant | 2026-06-25T00:51:38.416Z

[tool_use: Read]

### Assistant | 2026-06-25T00:51:38.720Z

[tool_use: Read]

### User | 2026-06-25T00:51:40.080Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * sfc-full-sweep-compare — OSCAR-SFC-9AXIS-MS0 / U-OSC-FULL-SWEEP
4	 * ===============================================================
5	 *
6	 * The "compare ALL potential inputs vs G-Wizard + HSMAdvisor baseline" sweep.
7	 * Enumerates the FULL prod-mode input space the SFC app page exposes (every
8	 * material × tool-diameter × optimization-mode per ISO group, mill
... [+18972 chars truncated]

### User | 2026-06-25T00:51:40.150Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * sfc-all-axis-sweep -- OSCAR-SFC-9AXIS-MS0 / U-OSC-ALL-AXIS-SWEEP
4	 * ================================================================
5	 *
6	 * Clause 1 of the standing /goal: "Run calculations for every possible combination of
7	 * machines, spindles, controller, materials, work holding/fixture, tool holder connection
8	 * type and holding mechanism (balance, max
... [+27401 chars truncated]

### Assistant | 2026-06-25T00:51:43.097Z

Now let me verify the claims hold. Let me check the engine import specifiers resolve to `.ts`-only files (the actual bug premise), confirm tsx is installed, and run the tests.

### Assistant | 2026-06-25T00:51:45.482Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:51:46.596Z

[tool_use: Bash]

### User | 2026-06-25T00:51:50.945Z

[tool_result] ls: cannot access 'src/engines/SpeedFeedNineAxisOrchestratorEngine.js': No such file or directory
ls: cannot access 'src/engines/SpeedFeedExhaustiveCombinationEngine.js': No such file or directory
ls: cannot access 'src/engines/SpeedFeedTriComparatorEngine.js': No such file or directory
-rw-r--r-- 1 wompu 197611 19688 Jun 19 07:59 src/engines/SpeedFeedExhaustiveCombinationEngine.ts
-rw-r--r-- 1 wo
... [+169 chars truncated]

### User | 2026-06-25T00:51:51.648Z

[tool_result] node_modules/tsx/dist/cli.mjs*
node_modules/tsx/dist/loader.mjs
node_modules/tsx/dist/preflight.cjs

### Assistant | 2026-06-25T00:51:54.600Z

The premise holds: only `.ts` exists (no sibling `.js`), so a bare-node `.js` specifier import would throw `ERR_MODULE_NOT_FOUND`. tsx is installed at the expected paths. Now let me run the tests and verify the bare-node + tsx-direct paths.

### Assistant | 2026-06-25T00:51:55.422Z

[tool_use: Bash]

### User | 2026-06-25T00:52:00.755Z

[tool_result]   ...
# Subtest: reexecUnderTsxIfNeeded: bare node -> relaunches under tsx with argv passthrough + breaker env + exits with child status
ok 13 - reexecUnderTsxIfNeeded: bare node -> relaunches under tsx with argv passthrough + breaker env + exits with child status
  ---
  duration_ms: 0.2619
  ...
# Subtest: reexecUnderTsxIfNeeded: child relaunch error -> fail-loud exit(1), not silent success
ok 1
... [+678 chars truncated]

### Assistant | 2026-06-25T00:52:02.934Z

16/16 pass, 0 skipped. Now let me verify the actual bare-node launch of both edited scripts produces full output (the key end-to-end claim) and that the tsx-direct path runs without a double-launch.

### Assistant | 2026-06-25T00:52:04.825Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:52:06.119Z

[tool_use: Bash]

### User | 2026-06-25T00:52:19.644Z

[tool_result] === BARE NODE: sfc-all-axis-sweep --json ===
{
  "unit": "U-OSC-ALL-AXIS-SWEEP",
  "mode": "core",
  "named_axes_swept": 25,
  "oat_runs": 262,
  "oat_feasible": 262,
  "dead_axes": [
    "machine_accuracy",
EXIT=0

### User | 2026-06-25T00:52:27.143Z

[tool_result] === BARE NODE: sfc-full-sweep-compare --no-vendor --json ===
{
  "total_cells": 144,
  "total_comparisons": 576,
  "tool_materials": [
    "carbide",
    "hss",
    "ceramic",
    "cbn"
EXIT=0

### Assistant | 2026-06-25T00:52:29.893Z

Both bare-node launches now produce full JSON output (previously `ERR_MODULE_NOT_FOUND`). Now let me verify the tsx-direct path runs in-process without a double-launch. I'll instrument via a probe that detects whether the guard re-spawned.

### Assistant | 2026-06-25T00:52:32.191Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:52:33.945Z

[tool_use: Bash]

### User | 2026-06-25T00:52:41.831Z

[tool_result] === TSX-DIRECT (should run in-process, no double launch) ===
{
  "unit": "U-OSC-ALL-AXIS-SWEEP",
  "mode": "core",
  "named_axes_swept": 25,
EXIT=0

### User | 2026-06-25T00:52:57.701Z

[tool_result] === infinite-loop safety: breaker prevents re-spawn under bare node when set ===
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^
--- (with breaker set, bare node hits the .ts import directly; expect ERR_MODULE_NOT_FOUND, proving no further re-spawn) ---

### Assistant | 2026-06-25T00:53:03.109Z

The breaker behavior is exactly correct: with `PRISM_TSX_REEXEC=1` set, the guard does NOT re-spawn (returns `reexec-breaker-set`), so bare node falls straight through to the `.ts` dynamic import and throws `ERR_MODULE_NOT_FOUND`. This proves the child can never infinitely relaunch (the child always carries the breaker). tsx-direct ran in-process with EXIT=0 and no double-launch.

Let me do final checks: ASCII-only in the new lib, and confirm `process.argv[1]` direct-invoke detection still works correctly under the re-exec (since the child is launched as `node cli.mjs scriptPath ...`).

### Assistant | 2026-06-25T00:53:05.075Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:53:07.376Z

[tool_use: Bash]

### User | 2026-06-25T00:53:13.853Z

[tool_result] === non-ASCII bytes in new lib + test (expect no output = clean) ===
grep: -P supports only unibyte and UTF-8 locales
exit=2  (1=no matches=clean)

### User | 2026-06-25T00:53:20.531Z

[tool_result] === confirm full-sweep-compare runs main via bare run() (no INVOKED_DIRECTLY guard there) under tsx-direct, no double ledger ===
  "total_cells": 144,
  "ledger_rows": 576,
EXIT ok

### Assistant | 2026-06-25T00:53:23.270Z

The locale broke `grep -P`. Let me re-check ASCII the other way.

### Assistant | 2026-06-25T00:53:24.847Z

[tool_use: Bash]

### User | 2026-06-25T00:53:30.350Z

[tool_result] === non-ASCII detection (LC_ALL=C, byte class) ===
grep-exit=1 (1=clean)

### Assistant | 2026-06-25T00:53:35.180Z

Both new files are ASCII-only (grep-exit=1 = no non-ASCII bytes). All claims verified. Let me note: the two edited scripts already contained non-ASCII (em-dashes, ×, Δ) in pre-existing code/comments, but those are outside this diff and not introduced by this unit.

Let me do one final correctness check on a subtle point: the dynamic-import bindings are module-top-level `const` after a top-level `await import(...)`, and they're referenced inside functions called only after module evaluation completes. Confirming the binding scope.

### Assistant | 2026-06-25T00:53:36.600Z

[tool_use: Grep]

### Assistant | 2026-06-25T00:53:37.895Z

[tool_use: Grep]

### User | 2026-06-25T00:53:39.483Z

[tool_result] 49:const { speedFeedNineAxisOrchestratorEngine } = await import("../src/engines/SpeedFeedNineAxisOrchestratorEngine.js");
230:          const res = speedFeedNineAxisOrchestratorEngine.run(withPatch(baseFn, lv.patch));
354:                      const res = speedFeedNineAxisOrchestratorEngine.run(input);

### User | 2026-06-25T00:53:41.661Z

[tool_result] 41:const { speedFeedExhaustiveCombinationEngine } = await import("../src/engines/SpeedFeedExhaustiveCombinationEngine.js");
42:const { speedFeedTriComparatorEngine } = await import("../src/engines/SpeedFeedTriComparatorEngine.js");
118:      yield* speedFeedExhaustiveCombinationEngine.runStreaming({ domain, sample_mode: SWEEP_MODE });
135:        res = speedFeedTriComparatorEngine.run(cellToTriInp
... [+11 chars truncated]

### Assistant | 2026-06-25T00:53:47.836Z

All bindings confirmed. The dynamically-imported engine consts are module-top-level (lines 49 / 41-42), and every use is inside a function (`runOAT`/`runFactorial` at 230/354; `run`/`allCells` at 118/135) that executes only after module evaluation — i.e. after the top-level `await import(...)` resolves. ESM top-level `await` blocks the module's evaluation completion, so by the time `main()`/`run()` is reached the bindings are populated. No temporal-dead-zone hazard.

One last verification of exit-code fidelity through a real child, to confirm the production path (not just the injected-spy test) propagates a non-zero status.

### Assistant | 2026-06-25T00:53:51.462Z

[tool_use: Bash]

### User | 2026-06-25T00:53:56.214Z

[tool_result] === exit-code fidelity: bare-node child that exits non-zero must propagate ===
PROPAGATED_EXIT=0

### Assistant | 2026-06-25T00:54:00.631Z

That probe returned 0, not 42 — but this is a false alarm from my probe, not the guard. The probe was placed at repo-root-adjacent path `mcp-server/exitprobe.mjs`; `import.meta.url` re-exec passes `scriptPath` and the child runs it, but the `exit(42)` exit code should propagate. Let me check why — the relevant question is whether `child.status` is correctly forwarded. Let me re-probe with clearer instrumentation.

### Assistant | 2026-06-25T00:54:03.140Z

[tool_use: Bash]

### User | 2026-06-25T00:54:08.058Z

[tool_result] REACHED-AFTER-GUARD reason=already-under-tsx
ENGINE-LOADED
PROPAGATED_EXIT=0

### Assistant | 2026-06-25T00:54:12.694Z

That explains it — the parent process here was `already-under-tsx` (the Bash tool's `node` was apparently tsx-wrapped in that invocation context), so the guard correctly no-op'd and ran in-process... but then `process.exit(42)` returned 0. That is surprising. Let me check: it says `already-under-tsx`, meaning `process.execArgv` carried tsx. Let me confirm the real cwd-vs-launch behavior and isolate exit-code propagation through an explicit bare-node parent.

### Assistant | 2026-06-25T00:54:13.965Z

[tool_use: Bash]

### User | 2026-06-25T00:54:19.644Z

[tool_result] execArgv of plain node:
["-e","console.log(JSON.stringify(process.execArgv))"]
--- NODE_OPTIONS:
<unset>

### Assistant | 2026-06-25T00:54:23.734Z

Plain `node` has clean execArgv (no tsx, no NODE_OPTIONS). So the `already-under-tsx` in the previous probe is puzzling. The difference: the probe used a heredoc-then-`node ./exitprobe.mjs`. Let me re-run that exact pattern but print execArgv to understand — and critically, test exit-code propagation explicitly with a definitely-bare-node parent and a child that exits non-zero.

### Assistant | 2026-06-25T00:54:26.146Z

[tool_use: Bash]

### User | 2026-06-25T00:54:31.676Z

[tool_result] execArgv=[]
plan={"reexec":true,"reason":"bare-node-needs-tsx","tsxCli":"H:\\prism\\mcp-server\\node_modules\\tsx\\dist\\cli.mjs"}
exit=0

### Assistant | 2026-06-25T00:54:37.331Z

Now the plan correctly says `reexec:true` for this bare-node heredoc launch. So the earlier `already-under-tsx` result was anomalous to that one invocation (likely a stale/wrapped node in that specific Bash sub-shell). The key remaining question — does the child's non-zero exit code propagate — is best answered directly through the injected-runner unit test (test 13 asserts `exitCode===7` from `child.status:7`) which already proves `exit(child.status)` fidelity, plus a real spawn. Let me do one clean real-spawn exit-code test.

### Assistant | 2026-06-25T00:54:40.694Z

[tool_use: Bash]

### User | 2026-06-25T00:54:46.285Z

[tool_result] PROPAGATED_EXIT=0

### Assistant | 2026-06-25T00:54:51.526Z

Still 0. The child exits 42 but the parent reports 0. This points at a real exit-code-fidelity question in the production relaunch path. Let me trace exactly what `spawnSync` returns. The hypothesis: under tsx, the child's `process.exit(42)` may surface as `child.status=42`, but maybe `spawnSync` is hitting something else (e.g. the child crashed differently, or status came back null and the `exit(... : 1)` fired... but then it'd be 1 not 0). Let me instrument the guard's actual return.

### Assistant | 2026-06-25T00:54:55.284Z

[tool_use: Bash]

### User | 2026-06-25T00:55:02.121Z

[tool_result] status=42 signal=null error=undefined
parent_exit=0

### Assistant | 2026-06-25T00:55:07.800Z

Now I've isolated it. `spawnSync` correctly returns `status=42`. So the guard's `exit(child.status)` would call `process.exit(42)`. The `parent_exit=0` here is because my `tracerun.mjs` does NOT itself call `process.exit(42)` — it just logs and falls off the end (exit 0). That's a flaw in *my probe*, not the guard.

So in the real guard path: `spawnSync` returns `status:42` → `exit(42)` is called → parent exits 42. My earlier `exitprobe.mjs` returned 0 because in those runs the guard took the `already-under-tsx` / in-process path and ran the child's body in-process, where `process.exit(42)` *should* have exited 42... Let me confirm the in-process path one final time, cleanly, since that's the one that returned 0 unexpectedly.

### Assistant | 2026-06-25T00:55:10.088Z

[tool_use: Bash]

### User | 2026-06-25T00:55:17.660Z

[tool_result] === direct tsx run of a script that exits 42 ===
argv1=H:\prism\mcp-server\childexit.mjs
tsx_direct_exit=0

### Assistant | 2026-06-25T00:55:21.577Z

This is the real finding. `tsx ./childexit.mjs` where the script calls `process.exit(42)` returns exit code **0**, not 42. tsx itself swallows the synchronous `process.exit(code)` exit code in this version. Let me confirm this is a tsx behavior (not specific to my script) and check whether `process.exitCode = 42` vs `process.exit(42)` differs — this determines whether the *guard's* `exit(child.status)` is affected or only the inner script.

### Assistant | 2026-06-25T00:55:25.936Z

[tool_use: Bash]

### User | 2026-06-25T00:55:31.945Z

[tool_result] === A: tsx + process.exit(7) ===
exit_A=0
=== B: tsx + process.exitCode=7 + natural end ===
exit_B=0
=== C: tsx + throw ===
exit_C=1
=== D: plain node + process.exit(7) (control) ===
exit_D=0
  "version": "4.21.0",

### Assistant | 2026-06-25T00:55:41.417Z

Important: control case D shows plain `node ./t1.mjs` with `process.exit(7)` ALSO returns exit_D=0. That means the exit code is being lost at the shell/Bash-tool layer in *this environment*, not by tsx specifically (A, B, D all return 0; only the `throw` case C surfaces a non-zero 1). This is an environment artifact of how the Bash tool captures `$?` across these wrapped invocations — not a code defect in the guard.

The authoritative evidence for exit-code fidelity is therefore:
1. The direct `spawnSync` trace I ran returned `status=42` correctly — so `exit(child.status)` receives the right value.
2. Unit test 13 asserts the guard calls `exit(7)` when `child.status===7` (injected runner), and test 14/15 assert `exit(1)` on error/null.

The production line `exit(child && typeof child.status === "number" ? child.status : 1)` is correct. The `$?`-returns-0 anomaly is this sandbox's shell-capture behavior (even plain-node `process.exit(7)` reads as 0 here), not the guard. I've verified the guard forwards the right status value; I cannot fully verify the OS-level exit propagation in this shell, and I'm flagging that honestly rather than asserting it works.

Let me make one final read of the original (pre-edit) script headers to confirm I'm not missing any prior import-time side effect that now happens after the await (ordering regression).

### Assistant | 2026-06-25T00:55:42.837Z

[tool_use: Bash]

### User | 2026-06-25T00:55:49.213Z

[tool_result] import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { speedFeedNineAxisOrchestratorEngine } from "../src/engines/SpeedFeedNineAxisOrchestratorEngine.js";

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const modeIdx = args.indexOf("--mode");
const MODE = modeIdx >= 0 && args[modeIdx + 1] ? args[modeIdx + 1] : "core
... [+303 chars truncated]

### Assistant | 2026-06-25T00:56:10.853Z

Confirmed: the only thing the edit changed is converting the single static engine import into the guard call + dynamic import. No other module-load side effects existed between the imports and the rest of the module, so the ordering is preserved. The `const args = process.argv.slice(2)` and everything after still runs after the engine binding resolves — identical to before, except now correctly under tsx.

I have everything I need. Here is my verdict.

---

VERDICT: PASS

summary: This is a clean, well-engineered fix. The shared `tsx-reexec-guard.mjs` correctly converts the affected SFC scripts to bare-node-survivable launches via a guarded synchronous tsx re-exec, with a pure/testable decision core and injectable side-effects. I verified end to end: the bug premise (only `.ts` siblings exist), bare-node now produces full output (was `ERR_MODULE_NOT_FOUND`), tsx-direct runs in-process with no double-launch, the breaker stops infinite relaunch, 16/16 tests pass with real load-bearing asserts (no `.skip`/`.only`), and both new files are ASCII-only.

findings:
- [VERIFIED] `H:/prism/mcp-server/scripts/lib/tsx-reexec-guard.mjs:48-49` (in callers) -- The guard import is a static `.mjs` (safe under bare node) and `reexecUnderTsxIfNeeded(import.meta.url)` runs as the first executable statement BEFORE the dynamic `.ts` `await import(...)`. Engine bindings are now dynamic (`sfc-all-axis-sweep.mjs:49`, `sfc-full-sweep-compare.mjs:41-42`), so no `.js`-specifier static import hoists and throws first. Confirmed against the premise: `SpeedFeedNineAxisOrchestratorEngine.ts` / `SpeedFeedExhaustiveCombinationEngine.ts` / `SpeedFeedTriComparatorEngine.ts` have NO sibling `.js`.
- [VERIFIED] Infinite-loop safety -- `tsx-reexec-guard.mjs:106` sets `PRISM_TSX_REEXEC: "1"` on the child; `planTsxReexec` (line 73) returns `reexec:false reason:"reexec-breaker-set"` when set. Live-proven: `PRISM_TSX_REEXEC=1 node sfc-all-axis-sweep.mjs` does NOT re-spawn (falls straight to the `.ts` import a
... [+1730 chars truncated]
