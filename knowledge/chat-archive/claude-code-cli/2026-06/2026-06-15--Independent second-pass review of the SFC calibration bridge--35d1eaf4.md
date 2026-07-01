---
type: "chat-session"
source: "claude-code-cli"
session_id: "35d1eaf4-6a6d-473d-bc4b-97c2e1c28152"
title: "Independent second-pass review of the SFC calibration bridge (U-FT-11). Worktree"
date: "2026-06-15"
first_ts: "2026-06-15T17:41:52.265Z"
last_ts: "2026-06-15T17:46:45.495Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 74
user_msgs: 27
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-aa0b84d5ed958972b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# Independent second-pass review of the SFC calibration bridge (U-FT-11). Worktree

> **claude-code-cli** | 2026-06-15 | 74 msgs (27 user / 47 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-aa0b84d5ed958972b.jsonl`

## Transcript

### User | 2026-06-15T17:41:52.265Z

Independent second-pass review of the SFC calibration bridge (U-FT-11). Worktree: H:/prism-slot-oscar. Read files end-to-end; cite file:line. Do NOT call mcp__prism__*.

FILES: mcp-server/scripts/sfc-calib-sync.mjs + mcp-server/scripts/sfc-calib-sync.test.mjs (both NEW).

Context: the bridge feeds vendor_corroborated regimes from the full-sweep baseline into SpeedFeedDeepLearningEngine.recordFeedback, closing the self-learning loop. predicted=PRISM p50, actual=vendor (prism/(1+bias/100)), segment key iso|_|cut_type.

Weight toward what a correctness-analyzer might miss:
- CONCURRENCY / STATE OWNERSHIP: the bridge constructs its OWN engine instance with persist:true on the canonical state file, does read-modify-write (loadState on construct -> recordFeedback -> saveState). If the MCP singleton is live and also writes that file, is there a lost-update window? Is it documented? Is a cron-time-only run the mitigation? Severity?
- SEMANTIC HONESTY: only vendor_corroborated regimes feed (containment>=0.6, low divergence) -> bias is small -> factors stay near 1.0. Is that the intended conservative behavior, and is the "why only corroborated" rationale documented? Does feeding a p50 envelope value as a single 'measurement' make sense vs e.g. weighting by n?
- FAIL MODES: empty baseline (zero corroborated -> clear message), missing file, malformed regime, non-positive p50, bias=null, unknown iso_group, baseline schemaVersion<1.1.0 (no cut_type). Are all handled without throwing or silently mis-feeding?
- The job_id uses the baseline file MTIME date for idempotency -- is that robust? (re-running on the same file = same date = skip; a regenerated sweep = new mtime = re-feed.) Any clock/timezone footgun?
- sync fs in an async main(): acceptable for a one-shot CLI (matches sfc-aggregate.mjs convention) or a real concern?
- ASCII-only, no inlined physics constants, naming/comment conventions match sfc-aggregate.mjs.
- TEST: are the 6 tests real (vendor inversion math 200/1.25=160
... [+216 chars truncated]

### Assistant | 2026-06-15T17:41:54.925Z

I'll review the SFC calibration bridge files end-to-end. Let me start by reading both files completely.

### Assistant | 2026-06-15T17:41:55.387Z

[tool_use: Read]

### Assistant | 2026-06-15T17:41:55.729Z

[tool_use: Read]

### User | 2026-06-15T17:41:56.283Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\scripts\sfc-calib-sync.mjs' was already read 11s ago in this session and is unchanged (mtime 1781545252755). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-06-15T17:41:56.394Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\scripts\sfc-calib-sync.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1781545195087). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-06-15T17:41:59.668Z

The read-once guard says these files are already in my context, but I don't actually have them in this fresh session. Let me bypass the cache to read them properly.

### Assistant | 2026-06-15T17:42:00.579Z

[tool_use: Bash]

### User | 2026-06-15T17:42:07.788Z

[tool_result]      1	/**
     2	 * SFC closed-loop calibration BRIDGE (U-FT-11, SFC-FULLTUNE) -- the keystone that closes the loop.
     3	 * ===================================================================================================
     4	 *
     5	 * Reads the full-sweep baseline moat (<out>/baseline-params.json, U-FT-06 + U-FT-11-PRE) and feeds
     6	 * every VENDOR_CORROBORATED regime's (PRISM-vs-
... [+11705 chars truncated]

### Assistant | 2026-06-15T17:42:11.570Z

Now let me read the test file.

### Assistant | 2026-06-15T17:42:12.400Z

[tool_use: Bash]

### User | 2026-06-15T17:42:36.979Z

[tool_result]      1	/**
     2	 * Tests for sfc-calib-sync.mjs (U-FT-11) -- run via: tsx --test scripts/sfc-calib-sync.test.mjs
     3	 * (node:test; needs tsx because the bridge imports the TS SpeedFeedDeepLearningEngine.)
     4	 *
     5	 * Covers: the ISO->material round-trip self-check (resolveISOGroup default-to-P trap), the pure
     6	 * regime->recordFeedback mapping (vendor inversion + segment-key co
... [+6780 chars truncated]

### Assistant | 2026-06-15T17:42:41.057Z

Now let me verify the key contracts the bridge depends on. I need to check the actual `SpeedFeedDeepLearningEngine` to verify `composeSegmentKey`, `recordFeedback`, `resolveISOGroup`, the constructor options, and `segmentFactors` state shape.

### Assistant | 2026-06-15T17:42:42.931Z

[tool_use: Bash]

### User | 2026-06-15T17:42:52.844Z

[tool_result] 62:// method + the captureSFC emit in recordFeedback close that loop.
67:// Persistence is OPT-IN at construction (the exported singleton persists; fresh `new` instances in
69:// (a corrupt/unwritable state file can never break recordFeedback's contract).
410:function resolveISOGroup(material: string): string {
439: * NOTE: resolveISOGroup defaults an UNRECOGNIZED material to "P" (steel); until
44
... [+4737 chars truncated]

### Assistant | 2026-06-15T17:42:56.202Z

Critical finding emerging. The bridge calls `engine.recordFeedback(plan.jobId, plan.predicted, plan.actual, plan.context)` with 4 positional args, but the engine's `recordFeedback` signatures are different. Let me look at both `recordFeedback` signatures closely (the SelfLearning inner class at line 651 and the outer at 1401).

### Assistant | 2026-06-15T17:42:57.198Z

[tool_use: Read]

### User | 2026-06-15T17:42:58.535Z

[tool_result] 400	    },
401	    samples,
402	  };
403	}
404	
405	// ============================================================================
406	// PHYSICS-BASED CALCULATIONS
407	// ============================================================================
408	
409	/** Get ISO group from material name */
410	function resolveISOGroup(material: string): string {
411	  const m = material.toLowerCase();
412	
... [+5472 chars truncated]

### Assistant | 2026-06-15T17:43:03.169Z

Now I need to see the critical `recordFeedback` signature. The bridge calls it positionally as `recordFeedback(jobId, predicted, actual, context)`. Let me look at the outer `recordFeedback` at line 1401.

### Assistant | 2026-06-15T17:43:04.900Z

[tool_use: Read]

### User | 2026-06-15T17:43:06.024Z

[tool_result] 1390	    if (operation === "tapping") {
1391	      insights.push("Tapping: rigid tapping preferred, 60-70% of drilling speed");
1392	    }
1393	
1394	    return insights;
1395	  }
1396	
1397	  // ============================================================================
1398	  // SELF-LEARNING INTERFACE
1399	  // ============================================================================
1400	

... [+3105 chars truncated]

### Assistant | 2026-06-15T17:43:11.207Z

Good — the outer `recordFeedback(jobId, predicted, actual, context)` matches the bridge's positional call exactly. Now let me verify the `regime` field in context is typed `CutType`. The bridge passes `regime: regime.cut_type` (a string like "roughing"). And the segment key for the outer recordFeedback uses `composeSegmentKey({material, regime})` — so it depends on the engine internally composing the same key, NOT the `segment` field the bridge computes. Let me verify the `segmentFactors` lazy-seed in the inner recordFeedback (line 651-675) and the persisted state shape.

### Assistant | 2026-06-15T17:43:12.445Z

[tool_use: Read]

### User | 2026-06-15T17:43:14.690Z

[tool_result] 520	const MAX_PERSISTED_HISTORY = 5000;
521	
522	/**
523	 * Default state-file: `mcp-server/data/state/sfc-calib-factors.json`, resolved from this module so it
524	 * works under both `tsx` (src/) and the esbuild bundle (dist/) -- `engineDir/../..` is the mcp-server
525	 * root in both layouts (`src/engines/X` and `dist/engines/X` both sit two levels under mcp-server/).
526	 */
527	function defaul
... [+6278 chars truncated]

### Assistant | 2026-06-15T17:43:17.616Z

Now let me read the inner `recordFeedback` (line 651-695) to confirm how `segmentFactors` get lazily seeded and saved, and the constructor of the engine to verify persist passthrough.

### Assistant | 2026-06-15T17:43:18.843Z

[tool_use: Read]

### User | 2026-06-15T17:43:21.267Z

[tool_result] 651	  recordFeedback(entry: FeedbackEntry): void {
652	    this.feedbackHistory.push(entry);
653	    const segKey = entry.segment_key ?? SEGMENT_GLOBAL_KEY;
654	
655	    // The GLOBAL bucket always learns from the full history: identical to the pre-segmentation
656	    // behavior for context-less feedback, and the live fallback every starved segment inherits.
657	    this.applyWindow(this.globalF
... [+3832 chars truncated]

### Assistant | 2026-06-15T17:43:30.256Z

I now have a critical insight that affects the test's correctness. Let me note: `applyWindow` requires `history.length < 5` to early-return — so a **single** feedback per segment will NOT seed a per-metric factor; the segment IS created (line 661-664) seeded from global `{...this.globalFactors}` = all 1.0, and `segmentSampleCount` is set to 1, but `applyWindow` does nothing because `segHistory.length` (1) < 5.

This is highly relevant to the test assertions. The test E2E feeds exactly 2 regimes, each a DIFFERENT segment (`P|_|roughing` and `N|_|finishing`), so each segment gets exactly 1 sample. The test asserts `state.segmentFactors["P|_|roughing"]` is truthy (line 94). The segment map entry IS created at line 661-664 (seeded to global 1.0), and saveState persists it. So `segmentFactors["P|_|roughing"]` = `{speed:1, feed:1, tool_life:1, surface_finish:1}` — truthy. The assertion passes. Good — but it only proves the segment KEY was registered, not that any learning occurred (which is the intended conservative near-1.0 behavior). Let me verify the engine constructor passthrough and `FeedbackEntry` shape, plus confirm `captureSFC` won't write to canonical state during the test.

### Assistant | 2026-06-15T17:43:31.471Z

[tool_use: Read]

### User | 2026-06-15T17:43:33.688Z

[tool_result] 744	   * U-OSC9-CALIB-PERSIST: persistence is OPT-IN. The exported singleton constructs with
745	   * `{ persist: true }` so shop-floor calibration survives MCP-server restarts; a bare
746	   * `new SpeedFeedDeepLearningEngine()` (every test) stays hermetic (no disk read/write).
747	   * Tests that need to exercise persistence pass an explicit `stateFile` tmp path.
748	   */
749	  constructor(opts
... [+665 chars truncated]

### Assistant | 2026-06-15T17:43:39.009Z

Constructor passthrough confirmed: `new SpeedFeedDeepLearningEngine({persist:true, stateFile})` → `SelfLearningSystem({persist, stateFile})`. The bridge's E2E test passes `--state-file` so it never touches the canonical `data/state/sfc-calib-factors.json`. Confirmed isolation.

Now let me verify the `FeedbackEntry` type shape (does it require fields the bridge omits?) and check that the baseline schema field names the bridge reads (`vc_mpm.p50`, `fz_mm.p50`, `bias_vc_pct`, `bias_fz_pct`, `confidence`, `status`, `cut_type`, `iso_group`, `regime`) match the actual `sfc-aggregate.mjs` output.

### Assistant | 2026-06-15T17:43:41.503Z

[tool_use: Bash]

### User | 2026-06-15T17:43:50.826Z

[tool_result] 197:interface FeedbackEntry {
---FEEDBACKENTRY BODY---
interface FeedbackEntry {
  job_id: string;
  timestamp: number;
  predicted: {
    speed_mpm: number;
    feed_mm: number;
    tool_life_min: number;
    Ra_um: number;
  };
  actual: {
    speed_mpm?: number;
    feed_mm?: number;
    tool_life_min?: number;
    Ra_um?: number;
  };
  error_pct: Record<string, number>;
  /** U-OSC9: canonica
... [+86 chars truncated]

### Assistant | 2026-06-15T17:43:54.761Z

The bridge constructs `predicted` with all four fields (speed/feed/tool_life/Ra) — matches the required `FeedbackEntry.predicted` shape. The outer `recordFeedback` builds the inner entry. Good.

Now let me verify the baseline schema field names against the actual aggregator output. Let me check `sfc-aggregate.mjs` and the `RegimeBaseline` shape it writes.

### Assistant | 2026-06-15T17:43:57.217Z

[tool_use: Bash]

### User | 2026-06-15T17:44:06.977Z

[tool_result] 9: *   <out>/baseline-params.json   -- the per-(iso,operation,cut_type) baseline moat (vc/fz envelope,
17: * (iso_group, operation) regime (a one-line peek per shard), then each regime is reduced
26: * and a regime with no vendor citations is prism_only (never vendor_corroborated). The
99:  // ---- Pass 1: group shards by (iso_group, operation) regime via a one-line peek ----
106:      key = `${re
... [+813 chars truncated]

### Assistant | 2026-06-15T17:44:09.853Z

Let me read the actual `RegimeBaseline` emission block in sfc-aggregate.mjs to confirm the exact field names (especially `bias_vc_pct`, `bias_fz_pct`, `confidence`, `status`, `vc_mpm`/`fz_mm` p50) the bridge depends on.

### Assistant | 2026-06-15T17:44:10.794Z

[tool_use: Read]

### User | 2026-06-15T17:44:12.148Z

[tool_result] 200	    emittedCount, segregatedCount, insufficientCount,
201	    generatedFrom: { total_cells: total, driven, feed_eligible: feedEligible },
202	  };
203	  const compareSummary = {
204	    schemaVersion: SUMMARY_SCHEMA_VERSION,
205	    generatedAt: new Date().toISOString(),
206	    shards: shardFiles.length,
207	    regimes: regimeShards.size,
208	    total, driven, cited, comparable, feedEligibl
... [+2495 chars truncated]

### Assistant | 2026-06-15T17:44:15.274Z

I need to find where the `regimes` array entries are constructed (the `RegimeBaseline` shape) in sfc-aggregate.mjs — the block that emits `vc_mpm`, `fz_mm`, `bias_vc_pct`, `bias_fz_pct`, `confidence`, `status`, `cut_type`, `iso_group`, `regime`. Let me search for that builder.

### Assistant | 2026-06-15T17:44:18.018Z

[tool_use: Bash]

### User | 2026-06-15T17:44:29.054Z

[tool_result] 25: * agreement), thin regimes (< minRegimeN) are insufficient_data, tapping is segregated,
114:  console.log(`[sfc-aggregate] ${regimeShards.size} regimes${unreadable ? ` (${unreadable} unreadable shard(s) skipped)` : ""}`);
152:    for (const r of base.regimes) allRegimes.push(r);
167:            operation: c.sample.operation,
168:            cut_type: c.sample.cut_type,
174:            prism_vc
... [+1010 chars truncated]

### Assistant | 2026-06-15T17:44:32.992Z

The `regimes` array is `allRegimes`, populated from `base.regimes` (line 152), where `base` comes from `reduceRegime` per shard. The `RegimeBaseline` shape is built by a function that lives upstream. Let me find where `base.regimes` entries get their `bias_vc_pct`, `confidence`, `status`, `vc_mpm`, `fz_mm` fields — likely in an imported lib. Let me check the imports and the reduce function.

### Assistant | 2026-06-15T17:44:33.680Z

[tool_use: Read]

### User | 2026-06-15T17:44:34.934Z

[tool_result] 100	  const regimeShards = new Map(); // "iso:op" -> shard paths
101	  let unreadable = 0;
102	  for (const f of shardFiles) {
103	    let key;
104	    try {
105	      const rec = JSON.parse(peekFirstLine(f));
106	      key = `${rec.sample.iso_group}:${rec.sample.operation}`;
107	    } catch {
108	      unreadable++;
109	      continue; // empty/corrupt shard -- skip (fail-soft; counted)
110	    }
... [+3260 chars truncated]

### Assistant | 2026-06-15T17:44:38.143Z

The `RegimeBaseline` shape is produced by `SpeedFeedBaselineGenericParamsEngine.deriveBaseline`. Let me find that engine and verify the exact field names: `confidence`, `status`, `iso_group`, `cut_type`, `regime`, `vc_mpm.p50`, `fz_mm.p50`, `bias_vc_pct`, `bias_fz_pct`.

### Assistant | 2026-06-15T17:44:39.675Z

[tool_use: Bash]

### User | 2026-06-15T17:44:53.029Z

[tool_result] H:/prism-slot-oscar/mcp-server/src/data/sfc-combinatorial-baseline-params.ts
H:/prism-slot-oscar/mcp-server/src/engines/speed-feed/MEMORY.md
H:/prism-slot-oscar/mcp-server/src/tools/dispatchers/calcDispatcher.ts
H:/prism-slot-oscar/mcp-server/src/__tests__/sfc/combinatorial-baseline-params.test.ts

### Assistant | 2026-06-15T17:44:56.506Z

[tool_use: Bash]

### User | 2026-06-15T17:45:05.257Z

[tool_result] 3: * (U-CSFH-07) into per-regime baseline parameters: a vc/fz envelope (from PRISM's
5: * cited subset) + provenance, with thin / non-calibratable (e.g. tapping) / divergent regimes SEGREGATED or
6: * flagged so a degenerate regime never silently feeds calibration (U-OSC9-CALIB-*).
10: * Regime = (iso_group, operation, cut_type) -- resolves the CutType the DL calibration loop keys on
11: * (segmen
... [+5030 chars truncated]

### Assistant | 2026-06-15T17:45:10.955Z

This confirms every field the bridge reads is real and correctly named: `regime`, `iso_group`, `cut_type`, `status: "baseline"`, `confidence: "vendor_corroborated"`, `vc_mpm` (BaselineEnvelope with `.p50`), `fz_mm`, `bias_vc_pct`, `bias_fz_pct`. Schema version is `1.1.0` which carries `cut_type`.

One important serialization note at line 56-63: "writeAtomic via JSON.stringify... STRIPS null-valued fields" — wait, let me verify. Standard `JSON.stringify` does NOT strip null fields (it strips `undefined`). The comment says null fields "arrive ABSENT". Let me check this carefully, because the bridge does `regime.bias_vc_pct != null` checks, which handle both `null` and `absent` identically — so the bridge is robust either way. Let me read that serialization note fully.

### Assistant | 2026-06-15T17:45:12.111Z

[tool_use: Read]

### User | 2026-06-15T17:45:13.773Z

[tool_result] 56	 * One regime's baseline. SERIALIZATION NOTE for consumers reading this THROUGH a
57	 * dispatcher (prism_calc:sfc_baseline_generic_params): the MCP result serializer
58	 * STRIPS null-valued fields, so every `| null` field below (vc_mpm / fz_mm /
59	 * bias_vc_pct / bias_fz_pct / containment_frac / divergent_frac) arrives ABSENT
60	 * (undefined), NOT explicit null. Treat undefined as null (e.
... [+1471 chars truncated]

### Assistant | 2026-06-15T17:45:20.987Z

The bridge reads the baseline-params.json file **directly** (via `fs.readFileSync` + `JSON.parse`), not through the MCP dispatcher serializer. So it gets explicit `null` for null fields, and the bridge's `!= null` and optional-chaining (`regime.vc_mpm?.p50`) handle both null and absent cases robustly. Confirmed correct.

Now let me verify the bias semantics one more time. The bridge says `vendor = prism / (1 + bias/100)` where `bias = mean (prism - vendor)/vendor * 100`. Let me verify this algebra is exactly invertible against the actual bias definition. If bias = (prism-vendor)/vendor*100, then prism/vendor = 1 + bias/100, so vendor = prism/(1+bias/100). Correct. But this is the inversion of a **mean of ratios**, not a ratio of means — so the reconstructed "vendor" is an approximation (Jensen's inequality). The doc comment at line 25-27 acknowledges bias as a mean. This is a known modeling approximation, not a bug. Let me verify the bias definition in the comparator to confirm `bias = mean signedPct(prism, vendor)`.

### Assistant | 2026-06-15T17:45:23.963Z

[tool_use: Bash]

### User | 2026-06-15T17:45:29.037Z

[tool_result] H:/prism-slot-oscar/mcp-server/src/data/sfc-combinatorial-baseline-params.ts:59: * bias_vc_pct / bias_fz_pct / containment_frac / divergent_frac) arrives ABSENT
H:/prism-slot-oscar/mcp-server/src/data/sfc-combinatorial-baseline-params.ts:76:  bias_vc_pct: number | null;
H:/prism-slot-oscar/mcp-server/src/data/sfc-combinatorial-baseline-params.ts:77:  bias_fz_pct: number | null;
H:/prism-slot-oscar
... [+290 chars truncated]

### Assistant | 2026-06-15T17:45:31.589Z

[tool_use: Read]

### User | 2026-06-15T17:45:32.806Z

[tool_result] 234	          containment_frac: null, divergent_frac: null, confidence: "none", provenance, reason,
235	        });
236	        continue;
237	      }
238	
239	      const vc = envelope(clean.map((r) => r.prism_vc_mpm).filter((v): v is number => v !== null));
240	      const fz = envelope(clean.map((r) => r.prism_fz_mm).filter((v): v is number => v !== null));
241	      const biasVc = mean(fe.map((
... [+1166 chars truncated]

### Assistant | 2026-06-15T17:45:36.464Z

Now I need to verify the bias DELTA direction. `bias = mean(vc_delta_pct)`. The bridge's inversion assumes `bias = (prism - vendor)/vendor * 100`. Let me confirm `vc_delta_pct` is defined that way (prism relative to vendor, with vendor as denominator), in the comparator engine.

### Assistant | 2026-06-15T17:45:39.405Z

[tool_use: Bash]

### User | 2026-06-15T17:45:51.189Z

[tool_result] ===file?===
H:/prism-slot-oscar/mcp-server/src/data/sfc-combinatorial-baseline-params.ts
H:/prism-slot-oscar/mcp-server/src/data/sfc-combinatorial-compare.ts
H:/prism-slot-oscar/mcp-server/src/__tests__/sfc/combinatorial-compare.test.ts

### Assistant | 2026-06-15T17:45:54.027Z

[tool_use: Bash]

### User | 2026-06-15T17:45:59.155Z

[tool_result] 34: *   prism_higher  -- outside envelope, PRISM vc > vendor (directional; the known
71:  /** signed percent (prism - vendor)/vendor*100; + => PRISM higher. null unless comparable. */
72:  vc_delta_pct: number | null;
73:  fz_delta_pct: number | null;
114:function signedPct(prism: number, vendor: number): number {
115:  return ((prism - vendor) / vendor) * 100;
143:  return direction > 0 ? "prism_
... [+386 chars truncated]

### Assistant | 2026-06-15T17:46:07.039Z

Confirmed at line 114-115: `signedPct(prism, vendor) = ((prism - vendor) / vendor) * 100`. The bridge's comment cites `sfc-combinatorial-compare.ts:114` — accurate citation. The inversion `vendor = prism / (1 + bias/100)` is algebraically correct for the per-cell delta; on the mean it's an approximation (Jensen), but the comment is honest about bias being a mean. The test verifies `200/(1+25/100) = 200/1.25 = 160` and `0.1/(1+10/100) = 0.1/1.1` — both correct.

Now let me verify the `safeWriteSync` import in the engine (referenced in saveState) exists, and check the test's E2E assertion about persistence one more time. The key concern: does `recordFeedback` actually persist `segmentFactors["P|_|roughing"]` when only ONE sample is fed (the test asserts truthy at line 94)? From the inner `recordFeedback` (line 660-671), the segment IS created and set in the map on first touch regardless of `applyWindow` running — so it persists. The test assertion is real but verifies registration, not learning. Let me confirm there are no other consumers of this state file that would create a lost-update window, and check git log to see if the canonical state file is referenced by the MCP singleton at runtime.

### Assistant | 2026-06-15T17:46:08.792Z

[tool_use: Bash]

### User | 2026-06-15T17:46:15.103Z

[tool_result] 67:// Persistence is OPT-IN at construction (the exported singleton persists; fresh `new` instances in
562:  // U-OSC9-CALIB-PERSIST: durable state is OPT-IN. The exported singleton persists shop-floor
746:   * `new SpeedFeedDeepLearningEngine()` (every test) stays hermetic (no disk read/write).
1507: * U-OSC9-CALIB-PERSIST: should the SHARED singleton persist?
1516:export function singletonCalibP
... [+192 chars truncated]

### Assistant | 2026-06-15T17:46:18.501Z

Now I've confirmed the critical concurrency concern. Let me read the singleton persist gate (line 1507-1525) to understand WHEN the live MCP singleton writes the canonical state file, which is the crux of the lost-update concern.

### Assistant | 2026-06-15T17:46:19.261Z

[tool_use: Read]

### User | 2026-06-15T17:46:19.832Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\engines\SpeedFeedDeepLearningEngine.ts' (same offset/limit) was already read 3m ago in this session and is unchanged (mtime 1781273558959). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new sta
... [+41 chars truncated]

### Assistant | 2026-06-15T17:46:22.600Z

[tool_use: Bash]

### User | 2026-06-15T17:46:27.596Z

[tool_result] /**
 * U-OSC9-CALIB-PERSIST: should the SHARED singleton persist?
 *
 * The singleton is the live MCP surface that accumulates shop-floor actuals, so in production it
 * persists. But pre-existing tests call the singleton directly (e.g. SFOutcomeFeedbackLoopWire.test.ts,
 * speedfeed-dl-stats-wire.test.ts), so under the test runner persistence MUST be inert -- otherwise
 * those tests would read/w
... [+698 chars truncated]

### Assistant | 2026-06-15T17:46:32.160Z

Now I have the full picture for the concurrency concern. The live MCP singleton (`speedFeedDeepLearningEngine`) persists to `data/state/sfc-calib-factors.json` in production whenever its `recordFeedback` is called. The bridge constructs its OWN engine instance with `persist:true` on the **same canonical file** (when `--state-file` is not passed). Both do load-modify-write with no cross-process lock.

This is a genuine lost-update window. Let me confirm `safeWriteSync` is atomic (tmp+rename, which prevents torn reads but NOT lost updates), and check whether the doc/plan documents the cron-only mitigation. Let me check the bridge's docstring and the plan reference.

### Assistant | 2026-06-15T17:46:34.219Z

[tool_use: Bash]

### User | 2026-06-15T17:46:45.495Z

[tool_result] 68:// tests stay hermetic), atomic (tmp+rename via safeWriteSync), schemaVersion-gated, and fail-soft
73:import { safeWriteSync } from "../utils/atomicWrite.js";
627:   * Fail-soft atomic persist (tmp+rename via safeWriteSync). NEVER throws -- recordFeedback's contract
===safeWriteSync def===
H:/prism-slot-oscar/mcp-server/src/utils/atomicWrite.ts
