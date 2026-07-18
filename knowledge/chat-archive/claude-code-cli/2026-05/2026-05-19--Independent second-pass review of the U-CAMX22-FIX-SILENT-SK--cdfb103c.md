---
type: "chat-session"
source: "claude-code-cli"
session_id: "cdfb103c-04dc-4242-861f-a2bf5f316565"
title: "Independent second-pass review of the U-CAMX22-FIX-SILENT-SKIP change in PRISM ("
date: "2026-05-19"
first_ts: "2026-05-19T00:26:58.819Z"
last_ts: "2026-05-19T00:33:35.978Z"
cwd: "H:\\prism\\mcp-server"
messages: 70
user_msgs: 25
assistant_msgs: 45
raw_file: "H:/.claude/projects/H--prism/cdfb103c-04dc-4242-861f-a2bf5f316565/subagents/agent-a9ab83a141c40e99b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Independent second-pass review of the U-CAMX22-FIX-SILENT-SKIP change in PRISM (

> **claude-code-cli** | 2026-05-19 | 70 msgs (25 user / 45 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/cdfb103c-04dc-4242-861f-a2bf5f316565/subagents/agent-a9ab83a141c40e99b.jsonl`

## Transcript

### User | 2026-05-19T00:26:58.819Z

Independent second-pass review of the U-CAMX22-FIX-SILENT-SKIP change in PRISM (H:/prism), a safety-critical CNC manufacturing codebase. Do NOT assume a prior reviewer caught everything. Weight your review toward: integration coupling, hidden behavioral change, convention conformance, and test integrity.

Files (read each fully):
1. H:/prism/mcp-server/src/engines/AutoSpeedFeedEngine.ts
2. H:/prism/mcp-server/src/engines/PrintToProgramPipelineEngine.ts  (the AutoSpeedFeed call site, ~line 2515-2545)
3. H:/prism/mcp-server/src/__tests__/AutoSpeedFeedEngine.camx22-sync.test.ts

Context: previously AutoSpeedFeedEngine.optimize() was `async` only because it did `await import("./UltimateSpeedFeedEngine.js")` + `await import("./PostProcessorFeedOptimizerEngine.js")` lazy-loads. PrintToProgramPipelineEngine.runFullPipeline is synchronous and could not await it, so it surfaced a "visible skip" and emitted UNOPTIMIZED base G-code (U-CAMX22-VISIBLE-SKIP). The fix: static-import both engines, extract a synchronous `_optimizeImpl(input,usfe,ppfo)` core, expose `optimizeSync()`, and switch the pipeline call site to `optimizeSync()`.

Specifically hunt for:
- BEHAVIORAL DIVERGENCE: is the body of `_optimizeImpl` byte-for-byte the prior `optimize()` body (minus the two await-lazy-load lines)? Any subtle change to S/F physics math, modal state tracking, or result shape is a P0 (CNC safety).
- Other callers of `asfe.optimize()` / `.analyze()` / `.batchCalculate()` across the repo — did keeping `optimize()` async preserve them? Grep for usages.
- Does the pipeline call site correctly handle the result and still fall back to base G-code on throw (R12 fail-loud)? Is there any path where optimization silently no-ops now?
- Test legitimacy: do the parity tests actually fail if the sync core diverges? Are edge-case assertions concrete (not toBeDefined/not.toThrow-only)?
- Convention conformance vs H:/.claude/rules/engines.md (canonical constants, no silentCatch in engines, typed returns).
... [+96 chars truncated]

### Assistant | 2026-05-19T00:27:09.642Z

I'll review the U-CAMX22-FIX-SILENT-SKIP change. Let me read the three files and investigate integration coupling.

### Assistant | 2026-05-19T00:27:09.960Z

[tool_use: Read]

### User | 2026-05-19T00:27:11.703Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\AutoSpeedFeedEngine.ts' was already read 16s ago in this session and is unchanged (mtime 1779149752644). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-05-19T00:27:14.317Z

The file was already loaded but I don't have it in my actual context window. Let me bypass the cache.

### Assistant | 2026-05-19T00:27:15.138Z

[tool_use: Bash]

### User | 2026-05-19T00:27:36.975Z

[tool_result] cache disabled for session

### Assistant | 2026-05-19T00:27:41.164Z

That doesn't persist. Let me read with explicit offsets to work around the guard.

### Assistant | 2026-05-19T00:27:41.637Z

[tool_use: Read]

### User | 2026-05-19T00:27:43.495Z

[tool_result] 1	/**
2	 * AutoSpeedFeedEngine — Automated Line-by-Line Speed & Feed Optimization
3	 *
4	 * The missing link in CNC programming: takes raw G-code from any CAM system
5	 * and automatically calculates physics-optimized S (spindle speed) and F (feed rate)
6	 * for EVERY cutting line using PRISM's full speed/feed engine stack.
7	 *
8	 * Pipeline:
9	 *   1. Parse G-code → extract tool changes, modal s
... [+4413 chars truncated]

### Assistant | 2026-05-19T00:27:46.519Z

Note the engines.md convention says "Every engine must export a class with static methods" — but this engine uses singleton instances. I'll flag convention conformance contextually. Let me continue reading the engine.

### Assistant | 2026-05-19T00:27:47.584Z

[tool_use: Read]

### User | 2026-05-19T00:27:51.173Z

[tool_result] 120	    tools_processed: number;
121	    average_feed_change_pct: number;
122	    estimated_time_savings_pct: number;
123	    power_limited_lines: number;
124	    chip_thinning_adjustments: number;
125	    corner_decelerations: number;
126	    plunge_limits: number;
127	    arc_limits: number;
128	  };
129	  warnings: string[];
130	  /** Warnings from MachiningPlaybookEngine material/anti-pattern 
... [+7622 chars truncated]

### Assistant | 2026-05-19T00:27:54.026Z

[tool_use: Read]

### User | 2026-05-19T00:27:59.342Z

[tool_result] 320	              strategy: input.strategy as any,
321	              axial_depth_mm: input.axial_depth_mm,
322	              radial_depth_mm: input.radial_depth_mm,
323	              machine_power_kw: input.machine_power_kw,
324	              machine_max_rpm: Math.min(input.machine_max_rpm ?? 99999, tool.max_rpm ?? 99999),
325	              machine_rigidity: input.machine_rigidity,
326	           
... [+8540 chars truncated]

### Assistant | 2026-05-19T00:28:02.614Z

[tool_use: Read]

### User | 2026-05-19T00:28:06.753Z

[tool_result] 539	
540	      if (annotate && adjustments.length > 0) {
541	        optimizedLine += ` (${adjustments.join(", ")})`;
542	      }
543	
544	      optimizedLines.push(optimizedLine);
545	      lineDetails.push({
546	        line_number: i + 1,
547	        original: trimmed,
548	        optimized: optimizedLine,
549	        original_s: origS || null,
550	        original_f: origF || null,
551	       
... [+8455 chars truncated]

### Assistant | 2026-05-19T00:28:09.804Z

Let me see the rest of the engine (helpers, git history for the diff) and then the call site.

### Assistant | 2026-05-19T00:28:10.437Z

[tool_use: Read]

### User | 2026-05-19T00:28:21.536Z

[tool_result] 759	      // Query playbook for material-relevant rules
760	      const advice = machiningPlaybookEngine.advise({
761	        material_iso: isoGroup,
762	        categories: ["material_tip", "anti_pattern", "chip_control"],
763	      });
764	
765	      // Collect generic critical/important warnings from playbook
766	      for (const rule of advice.rules) {
767	        if (rule.severity === "critic
... [+7602 chars truncated]

### Assistant | 2026-05-19T00:28:24.212Z

Now let me see the git diff to verify `_optimizeImpl` is byte-for-byte the prior `optimize()` body, and find all callers.

### Assistant | 2026-05-19T00:28:25.833Z

[tool_use: Bash]

### User | 2026-05-19T00:28:42.644Z

[tool_result] 98c9f585d7 [MAIN]/U-EFF23: restore 2020 src files from Box canonical
---DIFF---

### Assistant | 2026-05-19T00:28:45.615Z

Only one commit touched it and the diff is empty against HEAD~3. Let me check the actual commit history more broadly and find the U-CAMX22 commit.

### Assistant | 2026-05-19T00:28:47.629Z

[tool_use: Bash]

### User | 2026-05-19T00:29:06.871Z

[tool_result] 98c9f585d7 [MAIN]/U-EFF23: restore 2020 src files from Box canonical
---STATUS---
 M mcp-server/src/engines/AutoSpeedFeedEngine.ts
?? knowledge/wiki/architecture/engines/wedm/sinkeredmprinttoprogramengine.md
?? knowledge/wiki/architecture/engines/wedm/wedmprinttoprogramengine.md
?? knowledge/wiki/architecture/frontends/page/fe-page-latheprinttoprogram.md
?? knowledge/wiki/architecture/frontends/pa
... [+546 chars truncated]

### Assistant | 2026-05-19T00:29:09.322Z

The change is uncommitted (working tree modification). Let me diff the working tree against HEAD to see exactly what changed.

### Assistant | 2026-05-19T00:29:10.116Z

[tool_use: Bash]

### User | 2026-05-19T00:29:20.589Z

[tool_result] mcp-server/src/engines/AutoSpeedFeedEngine.ts | 84 ++++++++++++++++++++++-----
 1 file changed, 70 insertions(+), 14 deletions(-)

--- Changes ---

mcp-server/src/engines/AutoSpeedFeedEngine.ts
  @@ -26,6 +26,13 @@
  +// U-CAMX22-FIX-SILENT-SKIP (2026-05-18): static imports replace the prior
  +// `await import()` lazy-load. No circular dependency exists (neither engine
  +// imports AutoSpeedFeed
... [+4414 chars truncated]

### Assistant | 2026-05-19T00:29:24.277Z

The diff confirms the change is surgical: the `_optimizeImpl` body is byte-for-byte the prior `optimize()` body minus the 3 lazy-load lines (`// Lazy-load orchestrated engines` + 2 awaits). No S/F physics math, modal tracking, or result shape changed. Now let me check all callers across the repo and the call site.

### Assistant | 2026-05-19T00:29:25.499Z

[tool_use: Grep]

### User | 2026-05-19T00:29:34.935Z

[tool_result] src\tools\dispatchers\camDispatcher.ts:465:    case "autoSF": return _autoSF ??= (await import("../../engines/AutoSpeedFeedEngine.js")).autoSpeedFeedEngine;
src\__tests__\AutoSpeedFeedEngine.camx22-sync.test.ts:2: * AutoSpeedFeedEngine — U-CAMX22-FIX-SILENT-SKIP sync-path suite
src\__tests__\AutoSpeedFeedEngine.camx22-sync.test.ts:31:} from "../engines/AutoSpeedFeedEngine.js";
src\__tests__\AutoSp
... [+8140 chars truncated]

### Assistant | 2026-05-19T00:29:39.561Z

All other callers (`HurcoV11MillMasterPostEngine`, `OkumaOSPMillMasterPostEngine`, `CNCProgramAssemblerEngine`, `CAMKernelDispatcherBridge`, `GCodeIntelligencePipelineEngine`, `camDispatcher`, `untested-engines-batch2.test.ts`) use `await ...optimize(...)` — the async signature is preserved (returns `Promise`), so they remain correct. No other caller uses `optimizeSync()` except the pipeline and the new test. Now the call site:

### Assistant | 2026-05-19T00:29:40.353Z

[tool_use: Read]

### User | 2026-05-19T00:29:46.895Z

[tool_result] 2485	      const cp = cpm.resumeFrom(3);
2486	      programOutput = cp?.data ?? this.generateProgram(operations, input);
2487	    } else {
2488	      programOutput = this.generateProgram(operations, input);
2489	      cpm.checkpoint('generate_program', 3, programOutput, Date.now() - t0);
2490	    }
2491	    let { blocks, text } = programOutput;
2492	
2493	    // S4.5: AutoSpeedFeedEngine post-proc
... [+3265 chars truncated]

### Assistant | 2026-05-19T00:29:50.723Z

I see a critical issue at the call site. Line 2491 destructures `let { blocks, text } = programOutput;` then S4.5 reassigns `text = r.gcode`. But line 2546 calls `this.runSafetyChecks(blocks, operations, maxRPM, maxPower)` using `blocks` — which was NOT regenerated from the optimized `text`. Let me verify whether `blocks` is consumed downstream from the optimized text, and check `getAutoSpeedFeedEngine`.

### Assistant | 2026-05-19T00:29:51.501Z

[tool_use: Read]

### User | 2026-05-19T00:29:55.017Z

[tool_result] 60	
61	function getSmartToolSelector(): any {
62	  return smartToolSelectorEngine;
63	}
64	
65	function getCoatingSelector(): any {
66	  return coatingSelectionEngine;
67	}
68	
69	function getAutoSpeedFeedEngine(): any {
70	  return autoSpeedFeedEngine;
71	}
72	
73	function getCoolantStrategyEngine(): any {
74	  return coolantStrategyEngine;
75	}
76	
77	function getEntryExitStrategyEngine(): any {
... [+42 chars truncated]

### Assistant | 2026-05-19T00:29:58.817Z

`getAutoSpeedFeedEngine()` returns the static singleton (consistent with the static-import change). Now let me check how `text` and `blocks` are used after S4.5 — this is the key integration concern (is the optimized G-code actually returned, and is `blocks` stale for safety checks).

### Assistant | 2026-05-19T00:30:00.618Z

[tool_use: Bash]

### User | 2026-05-19T00:30:16.349Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
38 matches in 15 files:

1661:0:{ blocks: ProgramBlock[]; text: string } {
1662:0:ProgramBlock[] = [];
--- after 2542 usages of text/blocks ---

### Assistant | 2026-05-19T00:30:19.146Z

The awk produced no output, meaning `text`/`blocks` are not referenced as standalone words between 2542-2760. Let me find where `text` is consumed in the return value and where `blocks` feeds safety/output after S4.5.

### Assistant | 2026-05-19T00:30:20.875Z

[tool_use: Grep]

### User | 2026-05-19T00:30:20.878Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issue:
An unexpected parameter `limit` was provided</tool_use_error>

### Assistant | 2026-05-19T00:30:24.484Z

[tool_use: Bash]

### User | 2026-05-19T00:30:32.206Z

[tool_result] 2546:    const safetyChecks = this.runSafetyChecks(blocks, operations, maxRPM, maxPower);
2690:    const emittedProgramText = canEmitProgram ? text : "";
2691:    const emittedProgramLineCount = canEmitProgram ? blocks.length : 0;
2694:    // Run SetupSheetFromGCodeEngine on the actually-emitted program text (NOT
2702:    let gcodeSetupSheet: GCodeSetupSheetResult | undefined;
2705:        gcodeSe
... [+384 chars truncated]

### Assistant | 2026-05-19T00:30:34.925Z

Now I have the integration picture. Let me read the return shape and the key lines 2690-2695, 2760-2780.

### Assistant | 2026-05-19T00:30:35.846Z

[tool_use: Read]

### User | 2026-05-19T00:30:36.940Z

[tool_result] 2686	      ? safetyChecks.filter(c => c.status === "pass").length / safetyChecks.length
2687	      : 1;
2688	    const hasFailedSafetyChecks = safetyChecks.some(c => c.status === "fail");
2689	    const canEmitProgram = !hasFailedSafetyChecks && operations.length > 0;
2690	    const emittedProgramText = canEmitProgram ? text : "";
2691	    const emittedProgramLineCount = canEmitProgram ? blocks.le
... [+1443 chars truncated]

### Assistant | 2026-05-19T00:30:43.458Z

This confirms a pre-existing integration concern (NOT introduced by this change, but now activated): `emittedProgramText = text` (the optimized G-code) is what's emitted and fed to the setup-sheet engine, but `runSafetyChecks(blocks, ...)` at line 2546 validates the **pre-optimization `blocks`**, and `emittedProgramLineCount = blocks.length` reports the stale block count. This was always the structure, but before this fix the optimization was a no-op (visible skip emitted base G-code, so `text` == base). Now `text` is genuinely optimized while `blocks` and safety checks still reflect the unoptimized program. I'll classify this precisely. Let me read the test file fully.

### Assistant | 2026-05-19T00:30:43.789Z

[tool_use: Read]

### User | 2026-05-19T00:30:47.352Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\AutoSpeedFeedEngine.camx22-sync.test.ts' was already read 2m ago in this session and is unchanged (mtime 1779150225022). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable
... [+21 chars truncated]

### Assistant | 2026-05-19T00:30:50.359Z

It's not actually in my context. Let me work around the guard with an offset.

### Assistant | 2026-05-19T00:30:50.891Z

[tool_use: Read]

### User | 2026-05-19T00:30:56.367Z

[tool_result] 1	/**
2	 * AutoSpeedFeedEngine — U-CAMX22-FIX-SILENT-SKIP sync-path suite
3	 * =============================================================
4	 *
5	 * CAMX-MS0.3 / U-CAMX22-FIX-SILENT-SKIP (slot juliett, 2026-05-18)
6	 *
7	 * U-CAMX22-VISIBLE-SKIP made the async-optimize()-in-a-sync-pipeline skip
8	 * *auditable* (a warn + base G-code emitted unoptimized). This unit actually
9	 * FIXES it: a synch
... [+7834 chars truncated]

### Assistant | 2026-05-19T00:31:03.898Z

I have everything I need. Let me verify the parity test's strength — whether `optimizeSync` and `optimize` truly share `_optimizeImpl` (so parity is structurally guaranteed) and assess whether the parity test can actually catch divergence.

The parity tests (lines 115-137) compare `optimizeSync()` vs `await optimize()`. Both delegate to the **same** `_optimizeImpl` — so this parity is somewhat tautological by construction (both call the identical core). It proves the async wrapper didn't break, but it would NOT catch a divergence in S/F physics math vs the *prior* (pre-refactor) behavior, because there's no golden/reference assertion on actual S/F values — every parity assertion is `sync === async`, never `gcode === <expected optimized string>`. Let me confirm the test's concrete-value coverage and check one downstream safety concern.

### Assistant | 2026-05-19T00:31:06.052Z

[tool_use: Bash]

### User | 2026-05-19T00:31:10.221Z

[tool_result] 2026:  private runSafetyChecks(
2546:    const safetyChecks = this.runSafetyChecks(blocks, operations, maxRPM, maxPower);
2691:    const emittedProgramLineCount = canEmitProgram ? blocks.length : 0;
2773:      program_line_count: emittedProgramLineCount,
3103:        program_line_count: data.blocks.length,

### Assistant | 2026-05-19T00:31:13.121Z

[tool_use: Read]

### User | 2026-05-19T00:31:17.228Z

[tool_result] 2026	  private runSafetyChecks(
2027	    blocks: ProgramBlock[],
2028	    operations: PlannedOperation[],
2029	    maxRPM: number,
2030	    maxPower: number,
2031	  ): SafetyCheck[] {
2032	    const checks: SafetyCheck[] = [];
2033	
2034	    // Fail closed when the machine limits are so small that the cycle is not
2035	    // practically runnable, even if individual operations can be derated.
2036
... [+484 chars truncated]

### Assistant | 2026-05-19T00:31:28.329Z

This confirms the integration concern. `runSafetyChecks` inspects `blocks[].code` (RPM ceilings, Z plunge, feed limits) on the **pre-optimization** blocks. After this fix, S4.5 mutates `text` with physics-optimized S/F (potentially much higher RPM/feed via `aggressiveness` scaling up to 1.3x), but:

1. Safety checks at line 2546 still run against the **un-optimized `blocks`** — so an optimized S value that exceeds `maxRPM` would NOT be caught by the spindle-speed safety rule (the safety check sees the original conservative S).
2. The emitted program text (line 2690 `emittedProgramText = text`) IS the optimized one — so the operator receives optimized G-code that was safety-validated only in its pre-optimized form.

This is a genuine **pre-existing latent ordering bug that this change activates**: before the fix, `text` was the unoptimized base G-code (visible skip), so `text` and `blocks` agreed and the safety check covered what was emitted. Now they diverge. This is the most important finding. Note this is in `PrintToProgramPipelineEngine.ts` (the call site), not the engine refactor itself, and the engine has internal power-budget clamping (lines 502-514) and machine_max_rpm clamping (354-361) — but the pipeline call site at 2515-2522 does **not** pass `machine_max_rpm` / `machine_power_kw` into `asfInput`, so the engine's own clamps are inert here.

Let me verify the pipeline does not pass machine limits into the ASF input.

### Assistant | 2026-05-19T00:31:29.803Z

[tool_use: Bash]

### User | 2026-05-19T00:31:38.781Z

[tool_result] exit:1

### Assistant | 2026-05-19T00:31:48.346Z

Confirmed: the `asfInput` (lines 2515-2522) passes only `gcode, material, iso_group, tools, annotate, preserve_rapids` — **no `machine_max_rpm`, no `machine_power_kw`, no `aggressiveness`**. So:
- The engine's internal RPM/power clamps (AutoSpeedFeedEngine.ts:354-361, 502-514) are inert (those guards are gated on `input.machine_max_rpm` / `input.machine_power_kw` being set).
- `aggressiveness` defaults to 0.5 → `aggScale = 0.7 + 0.5*0.6 = 1.0` (no scaling), which limits the severity somewhat — optimized RPM = physics RPM from `UltimateSpeedFeedEngine`, unbounded by machine here.
- The pipeline's own `runSafetyChecks` (the only remaining backstop) validates stale pre-optimization `blocks`.

This is a real CNC-safety integration gap that the fix activates. It is not introduced by the engine refactor (which is clean), but by switching the call site from a no-op skip to a live optimization without re-running safety on the optimized output. Let me do a final build/type check to confirm no compilation breakage from the `any`-typed result cast and signature changes.

### Assistant | 2026-05-19T00:31:49.946Z

[tool_use: Bash]

### User | 2026-05-19T00:32:29.188Z

[tool_result] tsc-grep-done

### Assistant | 2026-05-19T00:32:32.102Z

No type errors in the changed files (the grep returned nothing, build process completed). Let me run the new test file to confirm it passes and the parity actually holds.

### Assistant | 2026-05-19T00:32:32.856Z

[tool_use: Bash]

### User | 2026-05-19T00:32:54.475Z

[tool_result]  DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework

 RUN  v4.1.5 H:/PRISM/mcp-server

stderr | src/__tests__/AutoSpeedFeedEngine.camx22-sync.test.ts
[INFO] [TribalKnowledge] Categorizing static tips (lazy init)...
[INFO] [TribalKnowledge] Loaded 4234 raw 
... [+512 chars truncated]

### Assistant | 2026-05-19T00:33:35.978Z

All 14 tests pass. I have a complete picture. Here is my independent second-pass review.

---

## Independent Second-Pass Review — U-CAMX22-FIX-SILENT-SKIP

### Behavioral divergence (engine refactor) — CLEAN

I verified the working-tree diff (`git diff HEAD`) line-by-line. `_optimizeImpl` is **byte-for-byte** the prior `optimize()` body with exactly three lines removed:
```
-    // Lazy-load orchestrated engines
-    const usfe = await this._getUltimateEngine();
-    const ppfo = await this._getFeedOptimizer();
```
These three were hoisted into the `optimize()` async wrapper (AutoSpeedFeedEngine.ts:195-199) and the new `optimizeSync()` (213-219). Zero changes to S/F physics math, modal state tracking (`modalS/modalF/modalG`), aggressiveness scaling, power-budget clamp, or result shape. The async `optimize()`, `analyze()`, `batchCalculate()` signatures are preserved (still return `Promise`), so all ~10 other callers (`HurcoV11MillMasterPostEngine`, `OkumaOSPMillMasterPostEngine`, `CNCProgramAssemblerEngine`, `CAMKernelDispatcherBridge`, `GCodeIntelligencePipelineEngine`, `camDispatcher`, `untested-engines-batch2.test.ts`) remain correct. The engine-side change is sound. Tests: 14/14 pass; tsc clean for both files.

### P1 — Optimized G-code is emitted but safety-validated only in its PRE-optimization form

**`PrintToProgramPipelineEngine.ts:2546` vs `:2533` / `:2690`** (call site, activated by this change — not the engine).

Sequence in `runFullPipeline`:
- 2491: `let { blocks, text } = programOutput;`
- 2533: `text = r.gcode;` — `text` is now the **physics-optimized** G-code (S/F rewritten, RPM/feed up to physics-optimal).
- 2546: `runSafetyChecks(blocks, …)` — inspects `blocks[].code` (RPM ceiling, Z-plunge, feed limits per `runSafetyChecks` at :2026-2047), i.e. the **un-optimized** program. `blocks` is never regenerated from optimized `text`.
- 2690: `emittedProgramText = canEmitProgram ? text : ""` — the operator receives the optimized text.
- 2691/2773: `progra
... [+5036 chars truncated]
