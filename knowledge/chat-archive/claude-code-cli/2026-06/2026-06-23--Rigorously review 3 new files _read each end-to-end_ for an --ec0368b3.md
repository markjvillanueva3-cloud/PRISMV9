---
type: "chat-session"
source: "claude-code-cli"
session_id: "ec0368b3-d2e4-4416-b9bd-e0bd521ec632"
title: "Rigorously review 3 new files (read each end-to-end) for an SFC speed/feed accur"
date: "2026-06-23"
first_ts: "2026-06-23T12:53:49.946Z"
last_ts: "2026-06-23T12:57:35.887Z"
cwd: "H:\\prism"
messages: 54
user_msgs: 20
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/ec0368b3-d2e4-4416-b9bd-e0bd521ec632/subagents/agent-af3ddeab6f2bd189b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Rigorously review 3 new files (read each end-to-end) for an SFC speed/feed accur

> **claude-code-cli** | 2026-06-23 | 54 msgs (20 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ec0368b3-d2e4-4416-b9bd-e0bd521ec632/subagents/agent-af3ddeab6f2bd189b.jsonl`

## Transcript

### User | 2026-06-23T12:53:49.946Z

Rigorously review 3 new files (read each end-to-end) for an SFC speed/feed accuracy auditor. Grade PASS/FAIL with P0/P1/P2 findings and file:line citations. Read-only.

FILES:
- H:/prism/scripts/lib/sfc-accuracy-audit-lib.mjs  (pure physics-invariant checks + streaming JSONL reader; 7 exports)
- H:/prism/scripts/sfc-accuracy-audit.mjs  (CLI driver: parse args, stream, write json+md report)
- H:/prism/scripts/lib/sfc-accuracy-audit-lib.test.mjs  (node:test, currently 21/21 passing)

WHAT IT DOES: streams the SFC-ACCURACY-MS1 result corpus (state/shared/sfc-variability-results/<domain>/chunk-*.jsonl, ~11M rows) and flags any computed speed/feed row that is physically impossible, self-contradictory, or violates a closed-form identity (feed = rpm*fz*flutes; vc = pi*D*rpm/1000). It is the verification half of "run millions of variations so we know all calculations are accurate".

WEIGHT YOUR REVIEW toward:
1. PHYSICS CORRECTNESS of each invariant: are feed = rpm*fz*flutes and vc = pi*D*rpm/1000 stated correctly? Is it sound to apply vc=piDn only to mill (lathe vc uses workpiece diameter, not tool diameter)? Are the non-negativity / range checks (conf in [0,1], life sentinel 9999) physically justified? Any invariant that is WRONG and would mislead the operator.
2. TEST INTEGRITY (R9): do the tests verify intent, not just run? Are the reference rows real? Is there ≥happy + ≥3 failure + ≥2 adversarial? Any assertion that would pass even if the check were broken? Any .skip/.only? Are the tolerance-boundary tests meaningful?
3. CONVENTION / inlined-constant conformance, naming, dead code, the markdown/json report correctness.
4. R12 honesty: does the grade (PASS/FAIL) and the headline reflect reality, or could it over/under-state?
Report concrete findings only; do not assume arm A caught anything.

### Assistant | 2026-06-23T12:53:52.522Z

I'll review these 3 files end-to-end. Let me start by reading all three files in parallel.

### Assistant | 2026-06-23T12:53:53.429Z

[tool_use: Read]

### Assistant | 2026-06-23T12:53:53.908Z

[tool_use: Read]

### Assistant | 2026-06-23T12:53:54.004Z

[tool_use: Read]

### User | 2026-06-23T12:53:54.328Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\sfc-accuracy-audit-lib.mjs' was already read 18s ago in this session and is unchanged (mtime 1782218981736). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T12:53:54.881Z

[tool_result] read-once-guard: 'H:\prism\scripts\sfc-accuracy-audit.mjs' was already read 18s ago in this session and is unchanged (mtime 1782219145864). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T12:53:55.768Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\sfc-accuracy-audit-lib.test.mjs' was already read 17s ago in this session and is unchanged (mtime 1782219059018). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-06-23T12:53:59.499Z

The read-once guard says these were already read, but I don't actually have their content in my context. Let me disable the cache and read them.

### Assistant | 2026-06-23T12:53:59.781Z

[tool_use: Read]

### User | 2026-06-23T12:54:00.672Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\sfc-accuracy-audit-lib.mjs' was already read 24s ago in this session and is unchanged (mtime 1782218981736). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T12:54:05.704Z

The guard is blocking me but the content is not actually in my context. Let me use the env var to disable the cache via the Bash tool to read, or use offset/limit to bypass. Let me try with the PRISM_READ_CACHE=0 disable via Bash cat as a fallback, but first try Read with an explicit offset.

### Assistant | 2026-06-23T12:54:05.818Z

[tool_use: Read]

### User | 2026-06-23T12:54:07.094Z

[tool_result] 1	/**
2	 * SFC-ACCURACY-MS2 -- Variability-corpus accuracy auditor (pure core + reader).
3	 *
4	 * The SFC-ACCURACY-MS1 harness (sfc-variability-batch-run.mjs) COMPUTES millions
5	 * of speed/feed configurations and persists one JSONL row per config under
6	 * state/shared/sfc-variability-results/<domain>/chunk-*.jsonl. Computing them is
7	 * only half the operator goal ("run millions of variation
... [+16555 chars truncated]

### Assistant | 2026-06-23T12:54:11.723Z

Now I have the lib file. Let me read the CLI driver and the test file.

### Assistant | 2026-06-23T12:54:12.476Z

[tool_use: Read]

### User | 2026-06-23T12:54:14.093Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * SFC-ACCURACY-MS2 -- Variability-corpus accuracy auditor (CLI).
4	 *
5	 * Streams the SFC-ACCURACY-MS1 result corpus
6	 * (state/shared/sfc-variability-results/<domain>/chunk-*.jsonl) and checks
7	 * every computed speed/feed row against closed-form SFC identities and
8	 * physical-validity invariants (see sfc-accuracy-audit-lib.mjs). Emits an
9	 * operator-readable
... [+5587 chars truncated]

### Assistant | 2026-06-23T12:54:16.976Z

Now the test file.

### Assistant | 2026-06-23T12:54:17.642Z

[tool_use: Read]

### User | 2026-06-23T12:54:19.048Z

[tool_result] 1	/**
2	 * Tests for sfc-accuracy-audit-lib.mjs.
3	 * Reference rows are the REAL corpus samples (mill #6416334, lathe #4495957)
4	 * read off disk during the build, plus hand-built defect rows that pin each
5	 * invariant. Run: `node scripts/lib/sfc-accuracy-audit-lib.test.mjs`
6	 */
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	import { mkdtemp, writeFile, mkdi
... [+10545 chars truncated]

### Assistant | 2026-06-23T12:54:24.496Z

I have all three files. Now let me verify key claims by inspecting the actual corpus writer schema referenced in the docstring (sfc-variability-batch-run.mjs:205-230), since the auditor's correctness hinges on the schema of `out` fields and the `?? 0` coercion claims for `rpm`/`vf`.

### Assistant | 2026-06-23T12:54:24.892Z

[tool_use: Glob]

### Assistant | 2026-06-23T12:54:25.017Z

[tool_use: Glob]

### User | 2026-06-23T12:54:36.042Z

[tool_result] scripts\sfc-variability-batch-run.mjs

### User | 2026-06-23T12:54:36.111Z

[tool_result] scripts\sfc-variability-enumerate.mjs
scripts\sfc-variability-enumerate-lathe.mjs
scripts\sfc-variability-cache.mjs
scripts\sfc-variability-resume-guard.test.mjs
scripts\sfc-variability-launch.test.mjs
scripts\sfc-variability-resume-guard.mjs
scripts\sfc-variability-batch-run.mjs
scripts\sfc-variability-launch.mjs

### Assistant | 2026-06-23T12:54:39.150Z

Let me read the relevant section of the batch-run writer to verify the row schema claims — specifically the `round()` null behavior, the `?? 0` coercion for rpm/vf, and which fields exist in `out`.

### Assistant | 2026-06-23T12:54:40.132Z

[tool_use: Read]

### User | 2026-06-23T12:54:41.776Z

[tool_result] 160	    tap: input.spindle_taper,
161	    spr: input.spindle_bearing_preload,
162	    ctl: input.controller,
163	    cool: input.coolant_type,
164	    cpr:  input.coolant_pressure_bar,
165	    cc:   input.coolant_concentration_pct,
166	    mat:  input.material,
167	    iso:  input.iso_group,
168	    hb:   input.hardness_hb,
169	    op:   input.operation,
170	    cut:  input.cut_type,
171	    str: 
... [+4681 chars truncated]

### Assistant | 2026-06-23T12:54:52.335Z

The writer schema is confirmed. Key findings from cross-referencing the writer:

1. `round()` (line 233-237) returns `null` for non-finite — confirms the auditor's `null_numeric` premise.
2. `rpm: Math.round(out.spindle_rpm ?? 0)` and `vf: Math.round(out.feed_rate_mmmin ?? 0)` — confirms the auditor's exclusion of rpm/vf from REQUIRED_FINITE (they coerce to 0, not null).
3. `conf: round(out.overall_confidence, DP_CONF)` — the field is `conf`, matches.
4. `pch: round(out.stability_assessment?.p_chatter, DP_PCHAT)` — matches `pch`.
5. `safe: (out.safety_checks ?? []).every((c) => c.passed !== false)` — **critical observation:** `safe` is `true` when `safety_checks` is empty/absent. The auditor's `unsafe_no_limit` and `safe_with_critical_limit` checks depend on the relationship between `safe` and `lim`.

Now let me check one important physics subtlety: the writer emits `vf` (feed_rate_mmmin) and `fz` (feed_per_tooth_mm). For a lathe, "feed per tooth" with `fl: 1` — let me verify the feed identity applies to lathe. Let me check the row schema and the `in.fl` for lathe and whether `vf = rpm*fz*fl` holds for turning. Let me look at how the lathe rows are structured and the DP constants.

### Assistant | 2026-06-23T12:54:53.152Z

[tool_use: Read]

### User | 2026-06-23T12:54:54.280Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * SFC-ACCURACY-MS1 Stage 2 — Streaming batch worker.
4	 *
5	 * Reads the Stage 1 enumerator's combo stream, drives
6	 * SpeedFeedOrchestratorEngine.compute() on each cell, and persists
7	 * (input fingerprint, output, safety status) to chunked JSONL files
8	 * under state/shared/sfc-variability-results/<domain>/.
9	 *
10	 * Operator directive: "generate the billions"
... [+6751 chars truncated]

### Assistant | 2026-06-23T12:55:06.014Z

Now I have a critical physics question to resolve regarding the **lathe feed identity**. The auditor applies `vf = rpm * fz * fl` to BOTH mill and lathe (line 136-146, no domain gate). For turning:

- Lathe feed is `feed_per_revolution (mm/rev)`, and `vf = rpm * f_rev`. There is no "tooth" — a single-point turning tool has `fl = 1`.
- The writer stores `fz: out.feed_per_tooth_mm`. For lathe, the orchestrator's `feed_per_tooth_mm` with `fl=1` would equal feed-per-rev, so `vf = rpm * fz * 1` holds numerically.

The REAL_LATHE row: `rpm: 300, fz: 0.039, vf: 12` → 300*0.039*1 = 11.7 ≈ 12 ✓. So the identity holds for lathe **as long as `fl=1` and `feed_per_tooth_mm` is really feed-per-rev**. This is sound. Let me verify the lathe enumerator always emits `fl: 1` (flutes), because if a lathe row ever had `fl != 1`, the identity `vf = rpm*fz*fl` would be wrong for turning.

### Assistant | 2026-06-23T12:55:07.350Z

[tool_use: Grep]

### User | 2026-06-23T12:55:08.957Z

[tool_result] 272-    input.nose_radius_mm = nose;
273-    input.tool_diameter_mm = size;
274:    input.flutes = 1; // single-edge insert
275-    input.tool_material = grade === "PCD" ? "pcd" : grade === "CBN" ? "cbn" : grade === "cermet" ? "cermet" : "carbide";
276-  } else if (toolFamily === "boring_bar") {
--
279-    input.tool_diameter_mm = Math.max(6, Math.round(size * 0.8));
280-    input.tool_stickout_mm
... [+698 chars truncated]

### Assistant | 2026-06-23T12:55:24.512Z

This is an important finding. The lathe enumerator emits **`flutes = 2` for drills** (line 285). For a turning drill operation, `feed_per_tooth_mm` with `fl=2` — if the orchestrator computes `vf = rpm * fz * 2` for a 2-flute drill, the identity holds (drills genuinely have multiple flutes and feed-per-tooth is meaningful). So the identity `vf = rpm*fz*fl` is actually still correct there — drilling on a lathe is the same feed math as drilling on a mill. The concern about "lathe = single point only" is resolved: the identity is general (`vf = rpm * fz * flutes`) and holds whenever `feed_per_tooth_mm` is genuinely per-tooth. This is sound.

Now let me check one more subtle physics point: the `vc_rpm_inconsistent_mill` check is correctly **mill-only** (line 152). Good — lathe vc uses workpiece diameter, not `td` (tool diameter). The auditor explicitly restricts it. Sound.

Let me now verify the test count claim (21 tests) and that they actually pass, and check for `.skip`/`.only`.

### Assistant | 2026-06-23T12:55:26.153Z

[tool_use: Grep]

### Assistant | 2026-06-23T12:55:27.021Z

[tool_use: Grep]

### User | 2026-06-23T12:55:27.728Z

[tool_result] No matches found

### User | 2026-06-23T12:55:28.635Z

[tool_result] scripts\lib\sfc-accuracy-audit-lib.test.mjs:21

Found 21 total occurrences across 1 file.

### Assistant | 2026-06-23T12:55:32.036Z

21 tests, no `.skip`/`.only`/`.todo`. Let me run the test suite myself to confirm 21/21 passing (R12 — verify the claim rather than trust it).

### Assistant | 2026-06-23T12:55:32.681Z

[tool_use: Bash]

### User | 2026-06-23T12:55:36.559Z

[tool_result]   ...
# Subtest: streamAllRows: missing domain dir is non-fatal (empty coverage, no throw)
ok 20 - streamAllRows: missing domain dir is non-fatal (empty coverage, no throw)
  ---
  duration_ms: 0.323
  ...
# Subtest: sampleOf produces a bounded slice with the violation attached
ok 21 - sampleOf produces a bounded slice with the violation attached
  ---
  duration_ms: 0.0696
  ...
1..21
# tests 21

... [+86 chars truncated]

### Assistant | 2026-06-23T12:55:54.192Z

Confirmed: 21/21 pass, 0 skipped, 0 todo. Now let me verify a subtle correctness concern in the test at line 100-104: the "adversarial empty out" test asserts exactly 7 `null_numeric` violations. But with an empty `out={}`, other checks could also fire (e.g., `zero_speed`, `missing` other things). Let me trace: with `out={}`, `rpm`/`vc` are `undefined`, so `isNum` is false → `zeroSpeed` is false. `safe` is undefined → no safety checks. `fl` from `in:{}` is null → no feed check. So only the 7 null_numeric fire. The test is precise. Good.

Now let me examine a potential gap. Let me verify whether `vf=0` / `rpm=0` interacts correctly. Consider a row where `rpm` coerced to 0 by the writer (`?? 0`) but `safe=false`. The `zero_speed_unsafe` WARN fires. But also the feed check: `fl>0, rpm=0` → `vfExpected=0`, and `vf` would be 0 too → consistent. Fine.

Let me check one real edge case the auditor might mishandle: the **`unsafe_no_limit`** check (line 171). The writer sets `safe = (out.safety_checks ?? []).every(c => c.passed !== false)`. If `safety_checks` is empty, `safe=true`. So `safe=false` REQUIRES at least one failed safety check. But `lim` is derived from `limiting_factors` (a DIFFERENT array). It's entirely possible for a row to legitimately have `safe=false` (a failed safety_check) with `lim=[]` (no limiting_factors at warning/critical severity). This would generate a `unsafe_no_limit` WARN — but it's only WARN and explicitly labeled "opacity (WARN, not wrong)". That's defensible. Let me verify how common this is in the real corpus to ensure it doesn't produce noise that drowns real signal — but that's a tuning concern, not a correctness bug. It's WARN, doesn't affect grade.

Let me check the JSON report `generatedAt` and verify there are no issues with the markdown rendering of nested objects (the `out` in samples can contain `lim` arrays). Let me verify the byCheck iteration order in renderMarkdown matches checksSorted — line 337 iterates `Object.entries(report.
... [+892 chars truncated]

### Assistant | 2026-06-23T12:55:55.352Z

[tool_use: Grep]

### User | 2026-06-23T12:55:56.833Z

[tool_result] 48:    sampleLimit: 5,
51:    progressEvery: DEFAULT_PROGRESS_EVERY,
59:    else if (a === "--sample-limit") args.sampleLimit = Number(argv[++i]);
60:    else if (a === "--progress") args.progressEvery = Number(argv[++i]);
84:  if (!Number.isFinite(args.maxRows) || args.maxRows < 0) {
90:  const report = createReport({ sampleLimit: args.sampleLimit });
98:    if (report.totals.rows % args.progress
... [+14 chars truncated]

### Assistant | 2026-06-23T12:56:24.563Z

Found a real edge case. `--progress` is parsed via `Number()` with no validation (line 60). If `--progress 0` or `--progress abc` (NaN) is passed:
- `--progress 0` → line 98: `report.totals.rows % 0 === 0` → `% 0` is `NaN`, `NaN === 0` is false → progress just never prints. Not fatal.
- `--progress abc` → `progressEvery = NaN` → `rows % NaN === 0` is always false → no progress. Not fatal.

So no crash, just silent disabling of progress. This is a minor robustness gap (P2), not a correctness defect. Only `--max-rows` is validated; `--sample-limit` and `--progress` are unvalidated, but their failure modes are benign (no crash, no wrong report).

Let me verify one more physics correctness item: the **feed tolerance formula** at line 138. The rounding tolerance term is `FEED_TOL_ROUNDING_PER_RPMFL = 5e-5` scaled by `rpm*fl`. This models the half-ULP error from rounding `fz` to 4 decimal places: a rounding error of ±0.00005 in `fz`, multiplied by `rpm*fl`, propagates to `vf`. That's `0.5 * 10^-4 = 5e-5`. Correct derivation. Plus `vf` itself is rounded to 0dp (±0.5), absorbed by `FEED_TOL_BASE_MMMIN = 1.0`. Sound. The 6% relative term is a generous catch-all. Let me verify the high-rpm boundary test (line 78-82) is actually meaningful: 20000*0.0001*8 = 16.0 exactly, vf=16. The rounding tolerance there: `1.0 + 20000*8*5e-5 + 0.06*16 = 1.0 + 8.0 + 0.96 = 9.96`. So this test would tolerate up to ±9.96 — it does NOT actually exercise a tight boundary because the values are exact. Let me check whether the feed_inconsistent failure test (line 71-76) actually exceeds tolerance.

Test line 73: `rpm=1000, fz=0.1, vf=800, fl=4` → expected = 400, claimed 800, diff=400. Tolerance = `1.0 + 1000*4*5e-5 + 0.06*max(800,400) = 1.0 + 0.2 + 48 = 49.2`. diff 400 >> 49.2 → fires. Good, real failure.

But the "tolerates rounding at high rpm*flutes (no false positive)" test (line 78) has a tolerance of ~9.96 yet the actual error is 0 — so it would pass even if the rounding term were completely 
... [+585 chars truncated]

### Assistant | 2026-06-23T12:56:26.197Z

[tool_use: Bash]

### User | 2026-06-23T12:56:29.812Z

[tool_result] === scripts/lib/sfc-accuracy-audit-lib.mjs ===
  (ASCII clean)
=== scripts/sfc-accuracy-audit.mjs ===
  (ASCII clean)
=== scripts/lib/sfc-accuracy-audit-lib.test.mjs ===
  (ASCII clean)

### Assistant | 2026-06-23T12:56:47.337Z

All three files are ASCII-clean. Regarding inlined constants: the only numeric constants here (`Math.PI`, `/1000`, tolerance terms, `9999` sentinel) are not physics material constants (kc1.1, Taylor, material) — they are the closed-form geometric identities (`vc = pi*D*n/1000`) and writer-matched sentinels/rounding tolerances. `Math.PI` and `/1000` are inherent to the identity being checked, not values that should be imported from `constants.ts`. The `9999` life sentinel and the DP rounding are tied to the writer's own emission, not physics. This is appropriate — importing from `constants.ts` would be wrong here since the auditor checks identities, not material lookups. No violation.

Let me do a final verification on one potential correctness gap: does the auditor catch a row where `fz` is present but the feed identity check is SKIPPED because `fl` is missing from `in`? Let me confirm the guard at line 133-136 and whether that's an intentional skip or a silent blind spot.

Looking at line 133: `const fl = cell.in && isNum(cell.in.fl) ? cell.in.fl : null;` and line 136 requires `fl != null && fl > 0`. If `fl` is absent, the feed check is silently skipped. Per the writer, `fl: input.flutes` is always present (mill enumerator and lathe enumerator both set `input.flutes`). Let me confirm the mill enumerator always sets flutes so this isn't a real blind spot in practice.

### Assistant | 2026-06-23T12:56:48.140Z

[tool_use: Grep]

### User | 2026-06-23T12:56:49.626Z

[tool_result] 235:  if (toolFamily === "drill")       return flutes === 2;

### Assistant | 2026-06-23T12:56:53.655Z

[tool_use: Grep]

### User | 2026-06-23T12:56:55.160Z

[tool_result] 234:function flutesFitToolFamily(flutes, toolFamily) {
235:  if (toolFamily === "drill")       return flutes === 2;
236:  if (toolFamily === "reamer")      return flutes >= 4;
237:  if (toolFamily === "face_mill")   return flutes >= 4;
238:  if (toolFamily === "thread_mill") return flutes >= 3;
287:                     toolFamily, toolMaterial, coating, diameter, flutes, helix, corner, stickoutLd,
... [+480 chars truncated]

### Assistant | 2026-06-23T12:57:35.887Z

Confirmed: the mill enumerator always emits `flutes` (line 324, from `TOOL_FLUTE_OPTIONS`). So `in.fl` is always present in the corpus, and the feed check's `fl != null` guard is a defensive fallback, not a real blind spot. The feed identity check effectively always runs on real corpus rows. Sound.

I have enough to render a complete verdict. Let me consolidate. One last check — confirm the docstring's cited line range (`sfc-variability-batch-run.mjs:205-230`) matches the actual `slimOutput` return (it does — I read lines 205-230 and the schema matches the auditor's expectations exactly).

Let me also confirm whether `trq` (torque) being in NONNEG but NOT in REQUIRED_FINITE is intentional and whether a null `trq` would be silently missed. The writer emits `trq: round(out.torque_Nm, DP_TORQUE)` which can be `null` on non-finite. The auditor's REQUIRED_FINITE excludes `trq`, `vc` is included but `trq` is not. So a silent non-finite torque (`trq: null`) would NOT be caught by `null_numeric`, and the `neg_physical` / NONNEG check uses `isNum(v)` which skips null. **This is a real gap**: a non-finite torque calc surfaces as `trq: null` and the auditor is completely blind to it. Same applies to `defl`, `ap`, `ae`, `conf`, `pch`, `vf`, `rpm` (the last two coerce to 0 instead of null per the writer). Let me verify which writer fields can be null but are NOT in REQUIRED_FINITE.

Writer fields that go through `round()` (can be null on non-finite): `vc, fz, ap, ae, mrr, pkw, trq, fN, life, Ra, defl, conf, pch`.
REQUIRED_FINITE = `[vc, fz, mrr, pkw, fN, life, Ra]`.
**Missing from REQUIRED_FINITE (can be silently null): `ap, ae, trq, defl, conf, pch`.**

So a silent non-finite calc for axial depth, radial depth, torque, deflection, confidence, or p_chatter would produce `null` with `err==null` and the auditor would NOT flag it. The docstring claims the auditor catches "the canonical silent bad calc" — but it only catches it for 7 of 13 nullable fields. This is a genuine complete
... [+5225 chars truncated]
