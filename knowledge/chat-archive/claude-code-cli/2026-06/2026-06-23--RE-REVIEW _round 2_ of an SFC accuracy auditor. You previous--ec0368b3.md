---
type: "chat-session"
source: "claude-code-cli"
session_id: "ec0368b3-d2e4-4416-b9bd-e0bd521ec632"
title: "RE-REVIEW (round 2) of an SFC accuracy auditor. You previously graded it FAIL on"
date: "2026-06-23"
first_ts: "2026-06-23T13:13:38.417Z"
last_ts: "2026-06-23T13:19:53.113Z"
cwd: "H:\\prism"
messages: 63
user_msgs: 23
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/ec0368b3-d2e4-4416-b9bd-e0bd521ec632/subagents/agent-acdeb062ea4dc87a7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# RE-REVIEW (round 2) of an SFC accuracy auditor. You previously graded it FAIL on

> **claude-code-cli** | 2026-06-23 | 63 msgs (23 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ec0368b3-d2e4-4416-b9bd-e0bd521ec632/subagents/agent-acdeb062ea4dc87a7.jsonl`

## Transcript

### User | 2026-06-23T13:13:38.417Z

RE-REVIEW (round 2) of an SFC accuracy auditor. You previously graded it FAIL on a P1 (REQUIRED_FINITE omitted ap/ae/trq/defl/conf, so silent non-finite calcs in those fields slipped through and the PASS grade could under-state reality). Confirm the P1 and your other findings are now resolved. Grade PASS/FAIL with file:line citations. Read-only.

FILES (read each end-to-end):
- H:/prism/scripts/lib/sfc-accuracy-audit-lib.mjs
- H:/prism/scripts/sfc-accuracy-audit.mjs
- H:/prism/scripts/lib/sfc-accuracy-audit-lib.test.mjs

FIXES APPLIED since your FAIL:
1. [your P1] REQUIRED_FINITE now = [vc, fz, ap, ae, mrr, pkw, trq, fN, life, Ra, defl, conf] (12 fields). A null in any with err==null is now flagged null_numeric (CRITICAL). Validated: full 11.2M-row re-run still 0 critical/0 warn (these fields are never legitimately null in the live corpus). pch deliberately left out (a stability metric can be legitimately absent).
2. [your P2 weak test] the high-rpm rounding-tolerance test now uses vf=21 vs exact 16 (dev 5, within the rounding band but exceeding base+rel) so it FAILS if FEED_TOL_ROUNDING_PER_RPMFL is set to 0.
3. [your P2] CLI validates --progress (>0) and --sample-limit (>=0).
4. [your P2] renderMarkdown "Sample violations" now iterates report.checksSorted (severity-ranked).
5. NEW (addresses arm A's sensitivity P2): measureRow() + report.stats surface the worst-case accuracy margin (max feed/vc relative deviation), with a FEED_REL_MIN_MMMIN=15 floor so tiny-feed rounding doesn't inflate the headline. 5 new tests added (now 26/26 passing).

VERIFY:
1. Is the P1 genuinely resolved -- can a silent non-finite calc still slip through for ANY field that should be finite? (Reconsider pch's exclusion: is it correct that pch can be legitimately null?)
2. Test integrity (R9): are the 5 new tests real (verify intent, not just run)? Does the new rounding-band test actually pin the rounding term? Any assertion that passes trivially via null coercion?
3. Is the accuracy-margin 
... [+384 chars truncated]

### Assistant | 2026-06-23T13:13:41.433Z

I'll re-review all three files end to end, focusing on whether the P1 is genuinely closed and the other findings resolved.

### Assistant | 2026-06-23T13:13:42.025Z

[tool_use: Read]

### Assistant | 2026-06-23T13:13:42.389Z

[tool_use: Read]

### Assistant | 2026-06-23T13:13:42.759Z

[tool_use: Read]

### User | 2026-06-23T13:13:44.481Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\sfc-accuracy-audit-lib.mjs' was already read 13s ago in this session and is unchanged (mtime 1782220177090). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T13:13:45.349Z

[tool_result] read-once-guard: 'H:\prism\scripts\sfc-accuracy-audit.mjs' was already read 13s ago in this session and is unchanged (mtime 1782219755258). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T13:13:45.797Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\sfc-accuracy-audit-lib.test.mjs' was already read 14s ago in this session and is unchanged (mtime 1782220204423). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-06-23T13:13:50.525Z

The read-once guard says these files are already in my context, but I don't actually see their content in this conversation. Let me bypass the cache to read them fresh.

### Assistant | 2026-06-23T13:13:50.989Z

[tool_use: Read]

### User | 2026-06-23T13:13:53.959Z

[tool_result] 0	/**
1	 * SFC-ACCURACY-MS2 -- Variability-corpus accuracy auditor (pure core + reader).
2	 *
3	 * The SFC-ACCURACY-MS1 harness (sfc-variability-batch-run.mjs) COMPUTES millions
4	 * of speed/feed configurations and persists one JSONL row per config under
5	 * state/shared/sfc-variability-results/<domain>/chunk-*.jsonl. Computing them is
6	 * only half the operator goal ("run millions of variation
... [+21386 chars truncated]

### Assistant | 2026-06-23T13:13:57.014Z

The library file is fully read. Now let me read the CLI and test files.

### Assistant | 2026-06-23T13:13:58.535Z

[tool_use: Read]

### Assistant | 2026-06-23T13:13:59.015Z

[tool_use: Read]

### User | 2026-06-23T13:14:00.860Z

[tool_result] 0	#!/usr/bin/env node
1	/**
2	 * SFC-ACCURACY-MS2 -- Variability-corpus accuracy auditor (CLI).
3	 *
4	 * Streams the SFC-ACCURACY-MS1 result corpus
5	 * (state/shared/sfc-variability-results/<domain>/chunk-*.jsonl) and checks
6	 * every computed speed/feed row against closed-form SFC identities and
7	 * physical-validity invariants (see sfc-accuracy-audit-lib.mjs). Emits an
8	 * operator-readable
... [+5957 chars truncated]

### User | 2026-06-23T13:14:01.345Z

[tool_result] 0	/**
1	 * Tests for sfc-accuracy-audit-lib.mjs.
2	 * Reference rows are the REAL corpus samples (mill #6416334, lathe #4495957)
3	 * read off disk during the build, plus hand-built defect rows that pin each
4	 * invariant. Run: `node scripts/lib/sfc-accuracy-audit-lib.test.mjs`
5	 */
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import { mkdtemp, writeFile, mkdi
... [+13530 chars truncated]

### Assistant | 2026-06-23T13:14:04.752Z

All three files are now fully read. Let me verify the key claims against the actual writer schema to confirm the P1 resolution is sound. Let me check the batch writer's `round()` and field emission to confirm which fields route through `round()` (and thus can surface as `null`) versus those coerced with `?? 0`.

### Assistant | 2026-06-23T13:14:06.013Z

[tool_use: Bash]

### User | 2026-06-23T13:14:10.952Z

[tool_result]   if (!rawOut || typeof rawOut !== "object") return null;
  // SpeedFeedOrchestrator wraps results in an AtomicValue<OrchestratorResult>
  // envelope: {value, confidence, source}. Unwrap if the top-level lacks
  // the canonical fields and a `.value` object is present.
  const out = (rawOut.cutting_speed_mpm == null && rawOut.value && typeof rawOut.value === "object")
    ? rawOut.value
    : raw
... [+1602 chars truncated]

### Assistant | 2026-06-23T13:14:13.505Z

This confirms the writer schema precisely. Let me verify the `round()` function returns `null` on non-finite and check `pch`'s source to validate the exclusion claim.

### Assistant | 2026-06-23T13:14:15.414Z

[tool_use: Bash]

### User | 2026-06-23T13:14:19.949Z

[tool_result]   if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const m = Math.pow(10, dp);
  return Math.round(v * m) / m;
}

// Lightweight non-crypto fingerprint — fast enough for 1B+ calls.
// 16 hex chars from FNV-style rolling hash over sorted-key JSON.
function fingerprint(slim) {
  const fpRaw = JSON.stringify(slim, Object.keys(slim).sort());
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4
... [+287 chars truncated]

### Assistant | 2026-06-23T13:14:45.074Z

`round()` confirmed: returns `null` on any non-finite value. Now let me check whether `p_chatter` / `stability_assessment` can legitimately be absent (validating the `pch` exclusion). Note the writer uses `out.stability_assessment?.p_chatter` with optional chaining — so if `stability_assessment` is absent, `p_chatter` is `undefined`, and `round(undefined)` returns `null`. This is the crux of the pch exclusion claim.

### Assistant | 2026-06-23T13:14:46.749Z

[tool_use: Grep]

### User | 2026-06-23T13:14:48.632Z

[tool_result] No matches found

### Assistant | 2026-06-23T13:14:52.449Z

[tool_use: Grep]

### User | 2026-06-23T13:14:54.743Z

[tool_result] Found 20 files limit: 20
mcp-server\web\src\types\speedfeed.ts
mcp-server\src\engines\SpeedFeedOrchestratorEngine.ts
mcp-server\src\__tests__\speed-feed-orchestrator-convergence-baseline.test.ts
mcp-server\src\engines\DesignToFloorPipelineEngine.ts
prism-test-6d0595\mcp-server\web\src\types\speedfeed.ts
prism-test-6d0595\mcp-server\src\engines\plugins\ChatterStabilityPlugin.ts
prism-test-6d0595\mc
... [+931 chars truncated]

### Assistant | 2026-06-23T13:15:06.564Z

[tool_use: Grep]

### User | 2026-06-23T13:15:08.693Z

[tool_result] 300-  resolved_geometry: ResolvedGeometry;
301-
302-  // ── Stability assessment ──
303:  stability_assessment: {
304-    zone: "stable" | "marginal" | "unstable";
305:    p_chatter: number;
306-    suggested_rpm_pocket?: number;
307-    lobe_index?: number;
308-    message: string;
--
1940-    ra_ci95: [number, number]; ra_mean: number;
1941-    ra_cpk: number | null;
1942-    weibull: { beta: nu
... [+1984 chars truncated]

### Assistant | 2026-06-23T13:15:30.468Z

The `OrchestratorResult` interface declares `stability_assessment` as a non-optional field with `p_chatter: number` required (line 303-305). So in the primary orchestrator path, `p_chatter` is always present. However, the auditor's `pch` exclusion claim rests on the writer's optional chaining `out.stability_assessment?.p_chatter` — which would produce `null` only if `stability_assessment` is entirely absent.

Let me check whether there are code paths where the result is unwrapped from an `AtomicValue` envelope where `stability_assessment` might not be present, and whether the live re-run (0 critical/0 warn claimed) would have caught a `pch=null`. Let me verify the reviewer's most important question: can `pch` be legitimately null in the live corpus? I'll check actual corpus data.

### Assistant | 2026-06-23T13:15:35.610Z

[tool_use: Bash]

### User | 2026-06-23T13:16:09.243Z

[tool_result] === mill : state/shared/sfc-variability-results/mill/chunk-w0-000000200000.jsonl ===
{"fp":"ab71801ad52fe8c7","idx":200001,"in":{"m":"vmc-3axis-std","mt":"vertical_mill","mpk":22,"mrr":12000,"rig":"low","gw":"box","age":1,"aax":2,"ajx":10,"tap":"BT40","spr":"light","ctl":"fanuc-30i","cool":"flood","cpr":1,"cc":5,"mat":"1045","iso":"P","hb":180,"op":"milling","cut":"roughing","str":"conventional","
... [+4575 chars truncated]

### Assistant | 2026-06-23T13:16:18.284Z

The live corpus confirms the writer schema exactly (matching the documented row schema in the lib header), and in these samples `pch` is `0`, never null. Let me verify across a broader sample whether `pch` is ever null/absent in the live corpus — this is the key question for whether excluding `pch` from REQUIRED_FINITE is correct (i.e., whether a null pch is a legitimate state vs. always present).

### Assistant | 2026-06-23T13:16:23.972Z

[tool_use: Bash]

### User | 2026-06-23T13:16:45.315Z

[tool_result] Exit code 1
=== Total chunks ===
mill: 126529 chunks
lathe: 95779 chunks
=== pch null/absent scan across a sampling of chunks (grep for null or missing pch) ===
/usr/bin/bash: line 29: 0
0: syntax error in expression (error token is "0")

### Assistant | 2026-06-23T13:16:48.238Z

The arithmetic broke on a multi-line `grep -c` output, but I got the key fact: 126,529 + 95,779 chunks. Let me redo the pch scan cleanly to determine if `pch:null` ever occurs alongside `err:null` in the live corpus.

### Assistant | 2026-06-23T13:16:52.591Z

[tool_use: Bash]

### User | 2026-06-23T13:17:07.234Z

[tool_result] === pch:null occurrences (any) across first 10 chunks per domain ===
mill: pch:null rows = 0  (out of 8050 sampled rows)
lathe: pch:null rows = 0  (out of 500 sampled rows)
=== distinct pch values across first 5 mill chunks (is it ever null/non-zero?) ===
   3050 "pch":0

### Assistant | 2026-06-23T13:17:13.077Z

In this sampling `pch` is always present and `0`, never null. The exclusion is defensible: the writer's optional chaining means an absent `stability_assessment` would null `pch`, and the lib documents this as "a stability metric can be legitimately absent for some operations" — a conservative WARN-or-skip choice rather than a CRITICAL. Importantly, the auditor still range-checks `pch` when it IS a number (line 216-218), so a non-finite-but-present scenario can't produce a bad numeric silently.

Now let me verify the critical test-integrity question: do the new tests actually FAIL if the logic breaks? Let me run the test suite and then probe the rounding-band test by mutating the constant. First, run as-is.

### Assistant | 2026-06-23T13:17:14.034Z

[tool_use: Bash]

### User | 2026-06-23T13:17:23.676Z

[tool_result]   ...
# Subtest: measureRow: err rows and missing inputs measure null
ok 24 - measureRow: err rows and missing inputs measure null
  ---
  duration_ms: 0.1606
  ...
# Subtest: recordRow tracks the worst-case accuracy margin
ok 25 - recordRow tracks the worst-case accuracy margin
  ---
  duration_ms: 0.2422
  ...
# Subtest: sampleOf produces a bounded slice with the violation attached
ok 26 - sampl
... [+194 chars truncated]

### Assistant | 2026-06-23T13:17:28.009Z

26/26 pass, 0 skipped, 0 todo — no `.skip`/`.only`. Now the critical R9 mutation tests. The task claims the rounding-band test (line 78-86) fails if `FEED_TOL_ROUNDING_PER_RPMFL=0`. Let me verify by temporarily mutating the constant in a copy and re-running ONLY that logic, without touching the original file. I'll do this in a temp dir.

### Assistant | 2026-06-23T13:17:32.244Z

[tool_use: Bash]

### User | 2026-06-23T13:17:39.871Z

[tool_result] === MUTATION 1: FEED_TOL_ROUNDING_PER_RPMFL -> 0 (should break the rounding-band test) ===
not ok 7 - feed identity tolerates rounding at high rpm*flutes (pins the rounding term)
# pass 25
# fail 1
rc=1

### Assistant | 2026-06-23T13:17:44.117Z

The mutation kills exactly test #7 (the rounding-band test) and nothing else — confirming it genuinely pins the `FEED_TOL_ROUNDING_PER_RPMFL` term (R9 verified; `rm -rf` was on a self-created `mktemp` temp dir, safe). Now let me mutate two more things: (a) remove `ap`/`ae`/`trq`/`defl`/`conf` from `REQUIRED_FINITE` to confirm the P1 fix's empty-out test (#9, expects 12 nulls) catches it; and (b) verify the margin-floor test pins the floor.

### Assistant | 2026-06-23T13:17:48.222Z

[tool_use: Bash]

### User | 2026-06-23T13:17:58.925Z

[tool_result] === MUTATION 2: drop the P1-added fields from REQUIRED_FINITE (regress to old 7-field list) ===
const REQUIRED_FINITE = ["vc", "fz", "mrr", "pkw", "fN", "life", "Ra"];
not ok 10 - adversarial: err==null with an empty out -> one null_numeric per required field
--- pass/fail ---
# pass 25
# fail 1

### Assistant | 2026-06-23T13:18:04.514Z

Regressing `REQUIRED_FINITE` to the old 7-field list breaks test #10 (the empty-out adversarial test, which asserts exactly 12 nulls). So the P1 fix is genuinely pinned by a test that fails if the field list shrinks. Now let me confirm the margin-floor test (`FEED_REL_MIN_MMMIN`) actually pins the floor, and run the final mutation on `FEED_REL_MIN_MMMIN`.

### Assistant | 2026-06-23T13:18:11.532Z

[tool_use: Bash]

### User | 2026-06-23T13:18:17.833Z

[tool_result] === MUTATION 3: FEED_REL_MIN_MMMIN -> 0 (floor removed; tiny-feed ratio should now report) ===
not ok 21 - measureRow: real rows have near-zero feed deviation; vc only on mill
not ok 22 - measureRow: feed margin floor suppresses the inflated ratio at tiny feeds
--- counts ---
# pass 24
# fail 2
============================================================
=== MUTATION 4: break feed identity (drop f
... [+460 chars truncated]

### Assistant | 2026-06-23T13:18:24.316Z

All four mutations break the expected tests:
- Mutation 3 (floor→0): breaks test #21 (real lathe vf=12 now reports below-floor as non-null) and #22 (the dedicated floor-suppression test). The floor is genuinely pinned.
- Mutation 4 (break feed identity): breaks 5 tests including margin tests. The closed-form identity is load-bearing across the suite.

Now let me verify question 3's safety concern: does the 15 mm/min margin floor HIDE a real low-feed feed-calc bug? The key is that `measureRow` (margin statistic) is separate from `auditRow`'s `feed_inconsistent` CHECK. Let me confirm the `feed_inconsistent` check has NO floor — i.e., a low-feed bug is still caught as a violation even if it's excluded from the headline margin. I'll construct a low-feed bug and check both paths.

### Assistant | 2026-06-23T13:18:31.800Z

[tool_use: Bash]

### User | 2026-06-23T13:18:37.227Z

[tool_result] auditRow checks: [ 'feed_inconsistent' ]
feed_inconsistent caught? true
measureRow feedRelErr (margin stat): 0.8 (null = excluded from headline margin)

tiny-legit (11.7 vs 12) feed_inconsistent? false (false = correctly tolerated)

### Assistant | 2026-06-23T13:18:43.465Z

This is the decisive evidence for question 3. A genuine low-feed bug (vf=10 where expected=50, an 80% deviation) is STILL caught as a `feed_inconsistent` CRITICAL violation by `auditRow` — even though `measureRow` excludes it from the headline margin statistic (returns null because vf<15). The floor only affects the descriptive margin number, not the pass/fail guard. The grade and safety net are uncompromised. The floor is honest: it keeps the reported "2.69%" margin from being inflated by sub-mm rounding noise, but never suppresses a real defect.

Now let me confirm the trivial-pass concern (question 2): could any of the 5 new `measureRow` assertions pass trivially via null coercion? The dangerous pattern would be an assertion like `m.vcRelErr < 0.01` where `m.vcRelErr` is null. Let me look carefully — line 208 has `assert.ok(m.vcRelErr < 0.01)`. If `vcRelErr` were null, `null < 0.01` is `true` in JS, which would pass trivially.

### Assistant | 2026-06-23T13:18:53.397Z

[tool_use: Bash]

### User | 2026-06-23T13:18:57.470Z

[tool_result] REAL_MILL vcRelErr = 0.00022619693688700248 (must be a real small number, not null, for line 208 to be non-trivial)
null < 0.01 evaluates to: true <- if vcRelErr were null this assert would pass trivially
So line 208 is non-trivial ONLY because vcRelErr is genuinely 0.00022619693688700248
feedRelErr = 0.00006766137451946683 | line 207 has explicit != null guard

### Assistant | 2026-06-23T13:19:05.081Z

I found a latent test-hygiene weakness. Line 208 `assert.ok(m.vcRelErr < 0.01)` would pass trivially if `vcRelErr` were null (since `null < 0.01 === true`). It is currently non-trivial only because `vcRelErr` is genuinely `0.0002` for `REAL_MILL`. But the assertion itself does not GUARD against null — unlike line 207 which uses an explicit `!= null &&` guard. This is a P2 robustness gap, not a correctness defect (the test does presently verify intent because the value is real), but it's worth flagging.

Let me confirm whether mutation-4 evidence already covers this: when feed identity broke, did line 208's test (#21) fail for the RIGHT reason (feedRelErr), or could the vcRelErr clause mask a regression? Mutation 4 broke test #21 via the feedRelErr clause (line 207), so the test does fail-loud on a feed bug. The vcRelErr clause is the soft one. Let me do one final targeted mutation — break ONLY `vcIdentityMill` to see if line 208 catches it.

### Assistant | 2026-06-23T13:19:08.817Z

[tool_use: Bash]

### User | 2026-06-23T13:19:12.926Z

[tool_result] === MUTATION 5: break vc identity (x10 error) -> does line 208 (vcRelErr<0.01) catch it? ===
  const expected = (Math.PI * td * out.rpm) / 100;
not ok 1 - happy: real mill row produces zero violations
not ok 21 - measureRow: real rows have near-zero feed deviation; vc only on mill
--- counts ---
# pass 24
# fail 2

### Assistant | 2026-06-23T13:19:20.484Z

Breaking the vc identity (a 10x error) DOES break test #21 via line 208 — because with `REAL_MILL` the `vcRelErr` is a real number, the `< 0.01` assertion fires correctly. So in practice the assertion verifies intent. The null-coercion trivial-pass is only a latent hazard (it would mask a regression only if `vcRelErr` ever returned null for `REAL_MILL`, which it doesn't). This confirms it as a minor P2, not a P1.

Let me do a final confirmation on the CLI arg validation (fix #3) and the markdown severity-ranked iteration (fix #4) — both are in the files I've read. CLI validates `--progress` (line 87-90: `>0`) and `--sample-limit` (line 91-94: `>=0`). The `renderMarkdown` "Sample violations" iterates `report.checksSorted` (line 415). Both confirmed in the source.

Let me verify there are no `.only`/`.skip` and the test count assertion matches the headline claim (26 tests).

### Assistant | 2026-06-23T13:19:21.915Z

[tool_use: Grep]

### User | 2026-06-23T13:19:24.108Z

[tool_result] No matches found

### Assistant | 2026-06-23T13:19:53.113Z

No `.only`/`.skip`/`.todo` present. The test run confirmed `# pass 26 / # fail 0 / # skipped 0 / # todo 0`.

I have now verified everything end-to-end with live mutation testing. Let me compile my findings.

## Re-Review Verdict

VERDICT: PASS

summary: The P1 from my prior FAIL is genuinely closed. `REQUIRED_FINITE` now carries all 12 fields that the batch writer routes through `round()` (`vc, fz, ap, ae, mrr, pkw, trq, fN, life, Ra, defl, conf`) — exactly the fields where a non-finite engine value silently surfaces as `null` with `err==null`. I confirmed this against the live writer (`sfc-variability-batch-run.mjs:205-230`, `round()` returns `null` on non-finite) and the live corpus. Mutation testing proves the P1 fix, the rounding-band term, the margin floor, and both closed-form identities are all pinned by tests that fail-loud when the logic regresses. One minor P2 (latent test-hygiene) remains; it does not block.

findings:

- [P0|P1] none.

- [P2] `H:/prism/scripts/lib/sfc-accuracy-audit-lib.test.mjs:208` — `assert.ok(m.vcRelErr < 0.01)` lacks the explicit `!= null` guard that its sibling on line 207 has (`m.feedRelErr != null && ...`). Because `null < 0.01 === true` in JS, this assertion would pass trivially if `vcRelErr` ever returned null for `REAL_MILL`. It is currently non-trivial (verified: `REAL_MILL` yields `vcRelErr=0.000226`, and Mutation 5 — a 10x vc-identity bug — does break this test), so it verifies intent today. Fix: harden to `assert.ok(m.vcRelErr != null && m.vcRelErr < 0.01)` to match line 207 and eliminate the latent null-coercion masking path. Deferrable.

### Verification performed (auditable)

**1. P1 truly closed — can a silent non-finite calc still slip through?**
- Confirmed the writer (`scripts/sfc-variability-batch-run.mjs:205-230`) routes exactly these 12 fields through `round()`, and `round()` (`:233-236`) returns `null` on any non-finite value. `rpm`/`vf` use `Math.round(... ?? 0)` so they coerce to 0 (caught by `zero_speed`/`neg
... [+2834 chars truncated]
