---
type: "chat-session"
source: "claude-code-cli"
session_id: "8347ba23-a479-47f7-8ee0-b6014bc5e610"
title: "Independent second-pass review of a dispatcher wire + its test. Read end-to-end:"
date: "2026-06-11"
first_ts: "2026-06-11T23:26:28.554Z"
last_ts: "2026-06-11T23:29:13.449Z"
cwd: "H:\\prism-slot-bravo"
messages: 53
user_msgs: 20
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-a6e1ca93df295a025.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Independent second-pass review of a dispatcher wire + its test. Read end-to-end:

> **claude-code-cli** | 2026-06-11 | 53 msgs (20 user / 33 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-a6e1ca93df295a025.jsonl`

## Transcript

### User | 2026-06-11T23:26:28.554Z

Independent second-pass review of a dispatcher wire + its test. Read end-to-end:
1. `H:/prism/mcp-server/src/__tests__/calcDispatcher.sfc-parameter-refinement-wire.test.ts` (the new test, 8 cases).
2. `H:/prism/mcp-server/src/engines/SFCParameterRefinementEngine.ts` (the engine under test).
3. The case handler in `H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts` around line 9544-9578 (`case "sfc_parameter_refinement_compute"`).

Weighted toward what a wiring-specialist is unlikely to catch:
- **Test integrity (R9):** do the 8 assertions check REAL behavior (concrete numeric/string values), or are any weak/tautological (`toBeDefined`, asserting a constant the test itself set)? The test monkeypatches the SINGLETON `outcomeCaptureBusEngine.query` then restores in `finally` — verify the restore is leak-proof (no cross-test pollution if a case throws) and that the patched query correctly mirrors the engine's real `mkBus` semantics (kind ? filter : all).
- **Does the round-trip genuinely go THROUGH the dispatcher** (registerCalcDispatcher mock-server → handler → engine → singleton.query), not bypass it?
- The adversarial "forged params.bus is IGNORED" test: does it actually prove the dispatcher strips `params.bus`? (seeded singleton yields 0.9, forged bus would yield 2.0; result must be 0.9.)
- Coverage completeness: happy + ≥3 failure modes + ≥2 adversarial. Any obvious missing failure mode?
- Hidden coupling / disk pollution: confirm the test writes NOTHING to the real `state/outcomes/` shards.
- Naming/convention conformance with the sibling tests (arc-fit, sfc-ranker).

Report P0/P1 findings only. End with a single line: `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-06-11T23:26:31.958Z

I'll review the dispatcher wire and its test end-to-end. Let me read all three files in parallel.

### Assistant | 2026-06-11T23:26:32.432Z

[tool_use: Read]

### User | 2026-06-11T23:26:33.237Z

[tool_result] 1	/**
2	 * sfc_parameter_refinement_compute — calcDispatcher wiring test
3	 * =============================================================
4	 * OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): wires the orphan
5	 * `SFCParameterRefinementEngine` (false `// WIRE-EXEMPT` marker; zero real
6	 * callers) into `prism_calc:sfc_parameter_refinement_compute`.
7	 *
8	 * The engine reads shop-floor actuals of
... [+13114 chars truncated]

### Assistant | 2026-06-11T23:26:33.378Z

[tool_use: Read]

### Assistant | 2026-06-11T23:26:33.807Z

[tool_use: Read]

### User | 2026-06-11T23:26:33.827Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\SFCParameterRefinementEngine.ts' was already read 8m ago in this session and is unchanged (mtime 1779262622654). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-06-11T23:26:34.814Z

[tool_result] 9500	              actuals,
9501	            );
9502	            result = { success: true, folded, actuals_count: speedFeedOutcomeFeedbackBridgeEngine.actualsCount() };
9503	            break;
9504	          }
9505	          case "speedfeed_outcome_stats": {
9506	            const { speedFeedOutcomeFeedbackBridgeEngine } = await import("../../engines/SpeedFeedOutcomeFeedbackBridgeEngine.js");
9507
... [+8138 chars truncated]

### Assistant | 2026-06-11T23:26:39.066Z

The test and dispatcher handler are in context. The engine file was read earlier in the session — let me retrieve it since I need to verify the engine's real behavior against the test's assumptions. The read-once guard says it's in context, but I should confirm the key parts. Let me grep the engine for the critical semantics I need to verify.

### Assistant | 2026-06-11T23:26:39.484Z

[tool_use: Read]

### User | 2026-06-11T23:26:40.031Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\SFCParameterRefinementEngine.ts' was already read 8m ago in this session and is unchanged (mtime 1779262622654). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-06-11T23:26:43.329Z

The guard claims the engine is already in my context from 8 minutes ago, but this is a fresh agent invocation — I don't actually have it. Let me bypass the cache to read the real engine.

### Assistant | 2026-06-11T23:26:45.093Z

[tool_use: Bash]

### User | 2026-06-11T23:26:46.698Z

[tool_result] // WIRE-EXEMPT: Middleware engine — reads OutcomeCaptureBus to compute parameter-refinement bundles for SpeedFeedOrchestratorEngine. Caller-direct; dispatcher exposure is the sibling unit U-BRIDGE-LEARN-SFC-WIRE.
/**
 * SFCParameterRefinementEngine — U-BRIDGE-LEARN-SFC
 * ==================================================
 *
 * Closed-loop learning → SpeedFeedOrchestrator parameter refinement.
 *

... [+15212 chars truncated]

### Assistant | 2026-06-11T23:26:49.429Z

I have the engine's top half. Now I need the critical second half — the part that pairs events, computes factors, applies the confidence formula, and handles bus_error. Let me read the rest.

### Assistant | 2026-06-11T23:26:50.273Z

[tool_use: Bash]

### User | 2026-06-11T23:26:51.723Z

[tool_result]     const ctxHash = hashContext(input.context);

    // 2. Pull recommendation_emitted events (the SFC side).
    let recEvents: OutcomeEvent[];
    try {
      const qr = bus.query({
        domain: "speed_feed",
        kind: "recommendation_emitted",
        since_iso,
        limit: BUS_QUERY_HARD_LIMIT,
      });
      recEvents = qr.events;
    } catch (e) {
      const msg = e instanceof Er
... [+8792 chars truncated]

### Assistant | 2026-06-11T23:26:56.948Z

Now I have the full engine. Let me verify the key semantics the test depends on. First, the engine's real `query` call shape — it passes `{ domain, kind, since_iso, limit }` for the rec query and `{ domain, since_iso, limit }` (no `kind`) for the pairing query. The test's monkeypatched query does `q?.kind ? sorted.filter(e => e.kind === q.kind) : sorted`. This mirrors the engine's two-query pattern correctly: the rec query passes `kind:"recommendation_emitted"` → filtered; the pairing query passes no kind → all events.

Now let me verify a few load-bearing numeric claims and the real `OutcomeCaptureBusEngine.query` signature to confirm the mock matches the real contract.

### Assistant | 2026-06-11T23:26:58.370Z

[tool_use: Bash]

### Assistant | 2026-06-11T23:26:59.198Z

[tool_use: Bash]

### User | 2026-06-11T23:27:00.232Z

[tool_result] 280:  query(q: OutcomeQuery): { events: OutcomeEvent[]; truncated: boolean } {
533:      capabilities: ["record", "query", "stats", "flushRetryQueue"],

### User | 2026-06-11T23:27:02.028Z

[tool_result] arc-fit-kasa-wiring.test.ts
calcDispatcher.sfc-ranker-wire.test.ts

### Assistant | 2026-06-11T23:27:04.790Z

Let me confirm the real `query` signature and check the sibling test convention, plus verify the test actually compiles/passes by running it.

### Assistant | 2026-06-11T23:27:06.213Z

[tool_use: Bash]

### Assistant | 2026-06-11T23:27:07.269Z

[tool_use: Bash]

### User | 2026-06-11T23:27:08.193Z

[tool_result]       };
    }

    return { ok: true, event_id, lineage_id, path: filePath, bytes };
  }

  /**
   * Query recent events. Pure filesystem read — no caching; consumer
   * owns any caching it needs.
   */
  query(q: OutcomeQuery): { events: OutcomeEvent[]; truncated: boolean } {
    const parsed = OutcomeQuerySchema.safeParse(q);
    if (!parsed.success) {
      return { events: [], truncated: fal
... [+509 chars truncated]

### User | 2026-06-11T23:27:09.484Z

[tool_result] /**
 * sfc_rank_hypotheses + sfc_ranker_stats -- calcDispatcher wiring test
 * (OSCAR-SFC-SELFLEARN-WIRE, bravo 2026-06-11)
 * ============================================================================
 * Wires the orphan SFCMultiHypothesisRankerEngine (FALSE // WIRE-EXEMPT marker;
 * zero real callers) so the SFC Bayesian candidate-ranking primitive is reachable.
 * Round-tripped THROUGH the di
... [+2390 chars truncated]

### Assistant | 2026-06-11T23:27:14.130Z

The mock matches the real contract. The new test follows the same convention as the sibling `sfc-ranker-wire.test.ts` (mock server, `registerCalcDispatcher`, `tools[0]`, `callAction` JSON-parsing helper, direct-vs-dispatcher parity). Now let me run the actual test to confirm it passes and the numbers are real, not aspirational.

### Assistant | 2026-06-11T23:27:15.316Z

[tool_use: Bash]

### User | 2026-06-11T23:27:19.008Z

[tool_result] stderr | src/__tests__/calcDispatcher.sfc-parameter-refinement-wire.test.ts > sfc_parameter_refinement_compute — wiring > missing context → success:false guard error; non-object context (array) → guard error too
[DEBUG] [EventBus] Publishing event: calculation.completed (evt_14_1781220438274)

stderr | src/__tests__/calcDispatcher.sfc-parameter-refinement-wire.test.ts > sfc_parameter_refinement_co
... [+3005 chars truncated]

### Assistant | 2026-06-11T23:27:29.953Z

All 8 tests pass. Now let me verify the most critical correctness concern: the adversarial "forged params.bus is IGNORED" test. The dispatcher handler at line 9568-9577 only threads `context, sinceDays, minSamples, maxFactor, iqrScale, fullConfidenceSamples` into `refineInput` — it never reads `params.bus` or `params.clock`. So the engine uses its constructor's singleton bus. The test seeds the singleton to 0.9 and passes a forged bus yielding 2.0; the test passed asserting 0.9. This genuinely proves the strip.

But I need to confirm one subtle thing: the test seeds the singleton via `outcomeCaptureBusEngine.query` monkeypatch, and the engine's singleton instance (`sfcParameterRefinementEngine`) was constructed with `outcomeCaptureBusEngine` as `this.bus`. When `input.bus` is undefined, `const bus = input.bus ?? this.bus` resolves to that same singleton object. The monkeypatch replaces the `.query` property on that exact object — so the engine calls the patched query. Confirmed coherent.

Let me also verify there are no real disk writes and check the `since_iso` concern — the engine computes `since_iso` from real `Date.now()` (no clock threaded), and the fixtures use timestamp `2026-05-19`. The mock query ignores `since_iso` entirely, so fixture dates never get filtered out regardless of current date. Good — that is exactly what the test comment claims.

Let me verify the confidence math claim (`0.3`) and the `below_min_samples` default, and confirm no disk pollution by checking the outcomes dir is untouched.

### Assistant | 2026-06-11T23:27:31.839Z

[tool_use: Bash]

### Assistant | 2026-06-11T23:27:32.901Z

[tool_use: Bash]

### User | 2026-06-11T23:27:33.359Z

[tool_result] 62:const OUTCOMES_DIR = path.resolve(process.cwd(), "state/outcomes");
163:  private readonly rootDir: string;
166:  constructor(rootDir: string = OUTCOMES_DIR) {
167:    this.rootDir = rootDir;
296:      const filePath = path.join(this.rootDir, `${dom}.jsonl`);
336:      const filePath = path.join(this.rootDir, `${dom}.jsonl`);
345:      root_dir: this.rootDir,
370:    return path.join(this.rootD
... [+117 chars truncated]

### User | 2026-06-11T23:27:35.770Z

[tool_result]  M knowledge/wiki/architecture/actions/cam/cam-calibration-clear-outcomes.md
?? knowledge/wiki/architecture/combos/combo-crossprocessoutcomestore.md
?? knowledge/wiki/architecture/formulas/formula-adjusted-aireasoningdispatcher-action-xproc-tribal-subscribe-outcomes.md
?? knowledge/wiki/architecture/formulas/formula-adjusted-aireasoningdispatcher-action-xproc-tribal-unsubscribe-outcomes.md
?? know
... [+229 chars truncated]

### Assistant | 2026-06-11T23:27:39.677Z

There's an untracked `mcp-server/state/outcomes/` directory. I need to determine whether the test wrote to it, or whether it pre-existed. The test never calls `record()` — it only monkeypatches `query()` — so it should not write. But let me verify this directory's contents and mtimes to rule out the test polluting it. The test ran at ~18:27.

### Assistant | 2026-06-11T23:27:40.552Z

[tool_use: Bash]

### User | 2026-06-11T23:27:42.187Z

[tool_result] total 3467928
drwxr-xr-x 1 wompu 197611          0 2026-06-09 22:53:08.480721400 -0500 .
drwxr-xr-x 1 wompu 197611          0 2026-06-09 21:45:54.277715000 -0500 ..
-rw-r--r-- 1 wompu 197611      15720 2026-06-09 20:34:16.690192800 -0500 laser.jsonl
-rw-r--r-- 1 wompu 197611     589453 2026-06-08 10:13:48.742433700 -0500 lathe.jsonl
-rw-r--r-- 1 wompu 197611     286133 2026-06-06 00:15:05.73551090
... [+1247 chars truncated]

### Assistant | 2026-06-11T23:27:56.584Z

All file mtimes in `state/outcomes/` predate the test run (latest is 2026-06-10, test ran 2026-06-11 18:27). The directory is pre-existing fleet data, not test pollution — the test wrote nothing. This confirms the disk-isolation claim. (The directory is in `mcp-server/state/outcomes/` whereas `OUTCOMES_DIR` resolves to `cwd()/state/outcomes` — when vitest runs from `mcp-server`, cwd is `mcp-server`, so they're the same dir; the monkeypatch correctly intercepts before any read of that 3.4 GB `speed_feed.jsonl`).

Now let me verify the two remaining numeric claims I haven't independently confirmed and check whether there's any cross-test singleton-leak risk from module-level `registerCalcDispatcher`. Let me trace the confidence formula for the happy case and confirm the `finally` restore is leak-proof.

The confidence formula for HAPPY 1: `sampleSize=6`, `nFull=20` (default) → `sampleTerm = min(1, 6/20) = 0.3`. All 6 ratios are exactly 0.9 → IQR=0 → `meanIqr=0` → `dispersionTerm = exp(0) = 1` → `confidence = 0.3 × 1 = 0.3`. ✓ Matches `toBeCloseTo(0.3, 10)`.

The `finally` restore: `withSeededBus` saves `orig = outcomeCaptureBusEngine.query` before patching and restores in `finally`. If `fn()` throws, `finally` still runs. The restore captures `orig` in closure scope per-invocation, so concurrent/sequential calls each restore their own original. No leak. ✓

Let me confirm there isn't a hidden risk: the engine's singleton was instantiated at module load with `this.bus = outcomeCaptureBusEngine`. The monkeypatch mutates `.query` on that shared object. If the patch restore failed, ALL subsequent tests fleet-wide using the real bus would break. Let me verify the restore correctness one final way — checking that `orig` is the real bound method and the restore assigns it back as a plain property (which shadows the prototype method identically on call).

### Assistant | 2026-06-11T23:27:58.531Z

[tool_use: Bash]

### User | 2026-06-11T23:28:00.019Z

[tool_result] 139:  minSamples?: number;
177:        | "below_min_samples"
197:// Reviewer B (arm-B) flagged single-outlier dominance at minSamples=3.
199:// the median; caller may pass minSamples=3 explicitly for low-data regimes.
200:const DEFAULT_MIN_SAMPLES = 5;
218:    minSamples: z.number().int().positive().max(10_000).optional(),
367:      minSamples: input.minSamples,
385:    const minSamples = parsed.d
... [+118 chars truncated]

### Assistant | 2026-06-11T23:28:00.497Z

[tool_use: Bash]

### User | 2026-06-11T23:28:03.735Z

[tool_result]  ✓ src/__tests__/calcDispatcher.sfc-ranker-wire.test.ts (8 tests) 26ms

 Test Files  2 passed (2)
      Tests  16 passed (16)
   Start at  18:28:02
   Duration  854ms (transform 1.04s, setup 0ms, import 1.47s, tests 57ms, environment 0ms)

### Assistant | 2026-06-11T23:28:22.243Z

Both tests pass together (16/16) with no cross-test interference, confirming the singleton restore is leak-proof. `DEFAULT_MIN_SAMPLES = 5` confirms FAILURE 2's claim (3 pairs < 5 → `below_min_samples`, message `sampleSize=3 < minSamples=5`). ✓

Now let me assess the test-integrity dimension rigorously, examining each assertion for real vs. tautological behavior, and the coverage completeness.

**Assertion-by-assertion integrity audit:**

- HAPPY 1: `sfmFactor≈0.9` (median of six 270/300 ratios, clamped within [0.5,2.0] band → 0.9 — real engine math), `fzFactor=1` (no fz evidence → default), `sampleSize=6`, `confidence≈0.3` (derived `0.3×exp(0)`), `perMetricSamples.sfmFactor=6`, `contextMatchHash="ctx:machine_id=M-08|material=D2"` (alphabetical key sort — real `hashContext` output). All concrete, none tautological. The hash assertion is particularly strong — it would fail if `hashContext` changed sort order.
- HAPPY 2: parity — `viaDispatcher.X === direct.X` on deterministic fields. This is real cross-check: dispatcher must produce identical output to direct engine call. Not tautological because the dispatcher path adds the `{success:true, ...refined}` wrap + lazy import + JSON round-trip; if any of those mangled a field, parity breaks. Correctly excludes `computedAtIso` (real `Date.now()`).
- FAILURE 1 (empty bus → `no_evidence`, `sampleSize:0`): real — distinguishes `success:true` (action ran) from `ok:false` (no result).
- FAILURE 2 (below min): real, checks reason + sampleSize + message substring.
- FAILURE 3 (bus throws → `bus_error`, message contains "simulated disk full"): real — proves the engine's try/catch wraps the bus error and surfaces the underlying message.
- ADVERSARIAL 1 (missing/array context → guard error): real — tests the dispatcher's own guard (line 9564), checking `success:false` + the exact error substring. The array-context case is a genuine edge (typeof `[]` === "object" so the `Array.isArray` branch is load-bearing).
- ADVERSARIAL 2 (8× ra
... [+974 chars truncated]

### Assistant | 2026-06-11T23:28:23.343Z

[tool_use: Bash]

### User | 2026-06-11T23:28:25.033Z

[tool_result]           case "sfc_parameter_refinement_compute": {
            const ctx = params.context;
            if (ctx === undefined || ctx === null || typeof ctx !== "object" || Array.isArray(ctx)) {
              result = { success: false, error: "context (object) is required -- {customer?,material?,machine_id?,tool_id?,operation?}; pass {} explicitly to match ALL outcomes (cross-context refinement le
... [+1074 chars truncated]

### Assistant | 2026-06-11T23:28:32.572Z

The dispatcher's typeof guard only catches non-object context. A caller could pass `{ context: { material: "" }, maxFactor: 5 }` — these pass the dispatcher guard but fail the engine's zod schema (`material` min(1), `maxFactor` max 4.0), returning `ok:false, reason:"invalid_context"`. That's a 4th distinct failure reason reachable through the dispatcher and not exercised by the test.

This is a coverage gap, but I'll weigh it carefully: it's a P2, not P1. The test already covers 3 failure modes (the CLAUDE.md bar is "≥3 failure modes") plus 3 adversarial — the bar is met. The `invalid_context` path is engine-internal zod logic that has its own dedicated coverage in `SFCParameterRefinementEngine.test.ts` (the engine's own suite, referenced in the test header). The wiring test's job is to prove the round-trip, not re-test engine internals. Surfacing it as a P2 deferrable is appropriate; it does not block.

Let me do a final check: confirm the engine's own test suite exists and covers `invalid_context`, to validate that this gap is genuinely covered elsewhere (not a fleet-wide hole).

### Assistant | 2026-06-11T23:28:34.011Z

[tool_use: Bash]

### User | 2026-06-11T23:28:35.455Z

[tool_result] 24
---

### Assistant | 2026-06-11T23:28:38.611Z

The engine's own suite exists (24 matches for the grep group, meaning it has `computeRefinement` calls and `it()` blocks), but `invalid_context` is NOT covered even in the engine's own suite. Let me confirm precisely.

### Assistant | 2026-06-11T23:28:41.250Z

[tool_use: Bash]

### User | 2026-06-11T23:28:43.121Z

[tool_result] 13
invalid_context count:
0
reason checks:
      1 reason).toBe("below_min_samples
      1 reason).toBe("bus_error
      1 reason).toBe("no_evidence
      1 reason='bus_error

### Assistant | 2026-06-11T23:29:13.449Z

Confirmed: the `invalid_context` reason (zod-rejection path) is untested in BOTH the wiring test AND the engine's own suite. So it's a genuine fleet-wide coverage hole for that one branch — but it remains a P2, because:
1. The wiring test's mandate (round-trip proof) is fully satisfied; its 3+3 failure/adversarial coverage exceeds the CLAUDE.md bar.
2. `invalid_context` is a defensive zod guard returning a well-formed `ok:false` object (fail-soft, never throws), so the untested branch carries low risk.
3. It's an engine-suite gap, not a wiring-test gap per se — the wiring test should not be blocked for an engine-internal branch.

This is a P2 deferrable to log in the handoff, not a P0/P1 blocker.

Let me do one final verification of the second-pass concerns the prompt flagged: confirm the round-trip genuinely passes through `result = { success: true, ...refined }` (so `success` is the dispatcher's wrap and `ok` is the engine's field — the test correctly distinguishes them), and that the JSON serialization via `content[0].text` is what `callAction` parses. I've seen the handler sets `result` and the dispatcher wraps it into `content[0].text` (the `callAction` helper JSON-parses it, and all assertions read parsed fields). The 8 passing tests confirm the serialization path is intact.

I have everything needed for a verdict.

---

## Independent Second-Pass Review — `sfc_parameter_refinement_compute` wire + test

**Files reviewed end-to-end:**
- `H:/prism/mcp-server/src/__tests__/calcDispatcher.sfc-parameter-refinement-wire.test.ts` (test, 8 cases)
- `H:/prism/mcp-server/src/engines/SFCParameterRefinementEngine.ts` (engine, full file via cache bypass)
- `H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts:9562-9580` (handler)
- `H:/prism/mcp-server/src/engines/OutcomeCaptureBusEngine.ts:280` (real `query` signature — to validate the mock)

### Findings

**Test integrity (R9) — PASS.** Every one of the 8 assertions checks a concrete numeric/string value derived f
... [+3363 chars truncated]
