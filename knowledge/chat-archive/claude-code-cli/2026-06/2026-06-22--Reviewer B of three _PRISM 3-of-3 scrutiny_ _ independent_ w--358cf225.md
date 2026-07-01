---
type: "chat-session"
source: "claude-code-cli"
session_id: "358cf225-d753-40b9-9ef5-8ea38cf462fa"
title: "Reviewer B of three (PRISM 3-of-3 scrutiny) — independent, weighted toward test "
date: "2026-06-22"
first_ts: "2026-06-22T16:13:13.599Z"
last_ts: "2026-06-22T16:17:28.372Z"
cwd: "H:\\prism"
messages: 62
user_msgs: 21
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/agent-adaf245df83d683d1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Reviewer B of three (PRISM 3-of-3 scrutiny) — independent, weighted toward test 

> **claude-code-cli** | 2026-06-22 | 62 msgs (21 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/agent-adaf245df83d683d1.jsonl`

## Transcript

### User | 2026-06-22T16:13:13.599Z

Reviewer B of three (PRISM 3-of-3 scrutiny) — independent, weighted toward test integrity + convention. Review commit e7f12c4ef6 on cad-fusion-live-ms0.

Run: `git -C H:/prism show e7f12c4ef6` (6 files). Two new tests: a bracket-robustness case in viz-dual-registration-audit.test.mjs, and a freshnessThresholdsFromEnv case in augmentation-freshness.test.mjs.

VERIFY (cite file:line):
1. TEST INTENT (R9): the new bracket test asserts parseGeneratorArray returns 3 entries from an array whose comments contain a balanced "FAST[]" AND an UNBALANCED "[". Confirm by reasoning (or temporarily reverting extractArrayBody mentally) that this test WOULD FAIL with the old raw-bracket-count code (depth never reaches 0 -> null -> []). If it would pass with the old code too, it's a weak test -- flag it.
2. The freshnessThresholdsFromEnv test: does it cover defaults, valid override, AND invalid (0/negative/non-numeric) fallback? Is the assertion concrete (deepEqual to specific values, not toBeDefined)?
3. Run all affected tests and confirm green: viz-dual-registration-audit.test (13/13), augmentation-freshness.test (16/16), regen-viz-fast-order.test (4/4).
4. CONVENTION: the helper freshnessThresholdsFromEnv -- does it match the lib's existing export style + JSDoc convention? Is the postflight's `...freshnessThresholdsFromEnv()` spread idiomatic?
5. Did the refactor weaken any existing assertion or leave any dead code (e.g. an unused import after the envHr removal in the audit)?

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines for P0/P1, notes (<=5). If unsure, FAIL.

### Assistant | 2026-06-22T16:13:17.797Z

I'll review commit e7f12c4ef6 thoroughly. Let me start by examining the commit and the affected files.

### Assistant | 2026-06-22T16:13:18.396Z

[tool_use: Bash]

### User | 2026-06-22T16:13:23.301Z

[tool_result] commit e7f12c4ef6221e93d91a3b51095669701b0fd32d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 11:12:15 2026 -0500

    [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FRESHNESS-HARDEN (slot:sierra): close 2 scrutiny P2s -- postflight<->audit threshold parity + un-fragile extractArrayBody (comment/string brackets)
    
    The iter-13 3-of-3 surfaced 2 non-blocking P2s; this closes
... [+2208 chars truncated]

### Assistant | 2026-06-22T16:13:26.435Z

Let me read the full diff and the affected files end to end.

### Assistant | 2026-06-22T16:13:27.531Z

[tool_use: Bash]

### User | 2026-06-22T16:13:32.799Z

[tool_result] commit e7f12c4ef6221e93d91a3b51095669701b0fd32d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 11:12:15 2026 -0500

    [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FRESHNESS-HARDEN (slot:sierra): close 2 scrutiny P2s -- postflight<->audit threshold parity + un-fragile extractArrayBody (comment/string brackets)
    
    The iter-13 3-of-3 surfaced 2 non-blocking P2s; this closes
... [+11913 chars truncated]

### Assistant | 2026-06-22T16:13:36.575Z

Now let me read the full files end to end to verify the surrounding contracts, not just the hunks. Let me read the two lib files and the test files completely.

### Assistant | 2026-06-22T16:13:36.911Z

[tool_use: Read]

### User | 2026-06-22T16:13:37.862Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\viz-dual-registration-audit.mjs' was already read 30s ago in this session and is unchanged (mtime 1782144430865). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-06-22T16:13:41.757Z

The read guard says it's already in context, but I haven't seen the full file yet — only the diff hunk. Let me read it with explicit offsets to see the full file including parseGeneratorArray and parseLoadOptional.

### Assistant | 2026-06-22T16:13:42.230Z

[tool_use: Read]

### User | 2026-06-22T16:13:47.691Z

[tool_result] 1	// viz-dual-registration-audit.mjs -- deterministic auditor for the system-viz
2	// FAST[]+merge-splice "both-or-neither" invariant (sierra galaxy, CLAUDE.md s3/s5/s7 rails).
3	//
4	// THE INVARIANT (galaxy doctrine): every ghost-roost feature generator must be registered in
5	// BOTH regen-viz.mjs `FAST[]` (so it runs) AND have a merge-augmentations.mjs `loadOptional(...)`
6	// for the JSON it 
... [+5407 chars truncated]

### Assistant | 2026-06-22T16:13:51.661Z

I have the full extractArrayBody and parseGeneratorArray now. Let me verify the test intent for the bracket test by carefully tracing through. First let me read the test file to see the existing tests around the new one and the `parseGeneratorArray skips commented-out entries` baseline.

### Assistant | 2026-06-22T16:13:52.419Z

[tool_use: Read]

### User | 2026-06-22T16:13:55.375Z

[tool_result] 120	  cleanup();
121	  assert.equal(r.summary.unverifiable, 1);
122	  assert.equal(r.summary.silentDiscards, 0, "unverifiable must NOT be asserted as a discard (R12)");
123	});
124	
125	test("dashboard generator (non-fold json) is out of scope -> not flagged orphan", () => {
126	  const dash = `import fs from "node:fs";\nconst VIZ_DIR="state/shared/system-viz";\nfs.writeFileSync(VIZ_DIR+"/dashboar
... [+1938 chars truncated]

### Assistant | 2026-06-22T16:14:08.903Z

Now let me carefully trace the test source string. The key question for R9: would the OLD raw-bracket-count code FAIL this test?

Let me reason about the test `src`:
```
const HEAVY = [
  "generate-a.mjs",  // too slow for FAST[] but ok
  "generate-b.mjs",  // [deprecated -- an UNBALANCED [ here
  "generate-c.mjs",
];
```

**OLD code trace** (counts every `[` and `]` regardless of strings/comments):
- Line 1: `const HEAVY = [` → `[` opens, depth=1.
- Line 2: `// too slow for FAST[] but ok` → `[` depth=2, `]` depth=1.
- Line 3: `// [deprecated -- an UNBALANCED [ here` → two `[` chars (`[deprecated` and `[ here`), depth goes 1→2→3.
- Line 4: no brackets.
- Line 5: `];` → `]` depth=2.

The old code would scan to end of string, depth never returns to 0 → returns `null` → `parseGeneratorArray` returns `[]`. So `deepEqual([], [a,b,c])` FAILS. Good — the test would genuinely fail against the old code. Let me confirm the test string has exactly the brackets I traced. Let me count brackets in line 3 carefully: `"generate-b.mjs",  // [deprecated -- an UNBALANCED [ here` — yes, two `[`, zero `]`.

Line 2: `"generate-a.mjs",  // too slow for FAST[] but ok` — `FAST[]` = one `[` one `]`, balanced.

So old code: opens depth=1 (line1), +1−1 (line2)=1, +1+1 (line3)=3, −1 (line5)=2. Ends at depth 2, never 0 → null → `[]`. The test asserts `[a,b,c]`. **Confirmed: this test genuinely fails on the old code.** R9 satisfied.

**NEW code trace**: brackets inside `//` comments are skipped. Only the real `[` (line1) and real `]` (line5) count → depth 1→0 at line5's `]` → returns body. Then `parseGeneratorArray` splits, `stripLineComment` strips the `//` parts, regex matches the three `.mjs` → `[a,b,c]`. Correct.

Now let me verify `stripLineComment` handles line 2 and 3 correctly (the inline comments after a string). Line 2 is `  "generate-a.mjs",  // too slow for FAST[] but ok`. The regex in `stripLineComment` matches `[^"']*"[^"]*"[^"']*?` then `\s*//.*`. The code-before-comment is kept. T
... [+89 chars truncated]

### Assistant | 2026-06-22T16:14:09.454Z

[tool_use: Bash]

### User | 2026-06-22T16:14:14.204Z

[tool_result]   ...
# Subtest: parseLoadOptional collects all loadOptional json names
ok 11 - parseLoadOptional collects all loadOptional json names
  ---
  duration_ms: 0.1207
  ...
# Subtest: extractGeneratorOutputs: convention fallback captures *-augmentation.json const
ok 12 - extractGeneratorOutputs: convention fallback captures *-augmentation.json const
  ---
  duration_ms: 0.0655
  ...
# Subtest: extract
... [+296 chars truncated]

### Assistant | 2026-06-22T16:14:17.654Z

13/13 pass. Now let me verify the test genuinely fails on the OLD code by temporarily restoring the old extractArrayBody and running just this test, to empirically confirm my R9 reasoning (not just assert it).

### Assistant | 2026-06-22T16:14:24.936Z

[tool_use: Bash]

### User | 2026-06-22T16:14:30.159Z

[tool_result] OLD result: []
Old code FAILS the test (returns [] instead of 3): true

### Assistant | 2026-06-22T16:14:32.938Z

Empirically confirmed: the old code returns `[]` on this test src, so the new test genuinely fails against the old implementation. **R9 satisfied — this is a real intent test, not a stub.**

Now let me run the freshness tests and the regen-viz-fast-order test.

### Assistant | 2026-06-22T16:14:34.090Z

[tool_use: Bash]

### User | 2026-06-22T16:14:39.139Z

[tool_result] # tests 16
# suites 0
# pass 16
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 70.9859
===== regen-viz-fast-order =====
Could not find 'scripts/lib/regen-viz-fast-order.test.mjs'

### Assistant | 2026-06-22T16:14:41.644Z

Freshness 16/16 pass. The regen-viz-fast-order test isn't at that path. Let me locate it.

### Assistant | 2026-06-22T16:14:42.348Z

[tool_use: Bash]

### User | 2026-06-22T16:15:13.707Z

[tool_result] scripts/regen-viz-fast-order.test.mjs
---glob---
./scripts/regen-viz-fast-order.test.mjs

### Assistant | 2026-06-22T16:15:16.117Z

It's at `scripts/regen-viz-fast-order.test.mjs`. Let me run it.

### Assistant | 2026-06-22T16:15:16.861Z

[tool_use: Bash]

### User | 2026-06-22T16:15:23.769Z

[tool_result] 1..3
# tests 4
# suites 3
# pass 4
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 285.3068

### Assistant | 2026-06-22T16:15:29.216Z

4/4 pass (the harness reports "tests 4" with 3 suites — matches the stated 4/4). All three affected test files green: 13/13, 16/16, 4/4.

Now let me verify the freshness threshold parity claim and convention conformance. Let me read the full lib file to check the export style and JSDoc convention against the new helper.

### Assistant | 2026-06-22T16:15:30.037Z

[tool_use: Read]

### User | 2026-06-22T16:15:31.186Z

[tool_result] 1	// augmentation-freshness.mjs -- classify the freshness of every system-viz
2	// augmentation file the MERGE actually folds into the live graph.
3	//
4	// WHY (reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21):
5	// regen-viz re-merges system-graph.json and reports GREEN from whatever augmentation
6	// files exist on disk. Two silent-staleness paths leave a GREEN graph on rot
... [+5062 chars truncated]

### Assistant | 2026-06-22T16:15:37.937Z

The new `freshnessThresholdsFromEnv` matches the lib's convention perfectly: it's an `export function` (matching `parseMergedAugmentations`, `classifyAugmentationFreshness`), has a complete JSDoc block with `@param`/`@returns` like the sibling exports, ASCII-only, and the inner `hr` helper preserves the exact semantics of the old `envHr` (`Number.isFinite(v) && v > 0`). The default param `env = process.env` allows the test to inject `{}`.

Let me verify the `classifyAugmentationFreshness` signature accepts the spread thresholds (so `...thresholds` is wired correctly) and that the old `envHr`/`FRESHNESS_DEFAULTS` aren't left dangling in the audit file. Let me read `classifyAugmentationFreshness`.

### Assistant | 2026-06-22T16:15:38.605Z

[tool_use: Read]

### User | 2026-06-22T16:15:40.771Z

[tool_result] 98	/**
99	 * Classify each merged augmentation by file-mtime age. Pure: caller injects `now` (ms)
100	 * and an optional `statImpl` so the result is deterministic and testable.
101	 *
102	 * class:
103	 *   "fresh"          age < freshHr
104	 *   "stale-warn"     freshHr <= age < staleHr   (non-slow; advisory)
105	 *   "stale-expected" slow-cadence + age < slowHr (HEAVY; expected lag, advisory)
10
... [+2162 chars truncated]

### Assistant | 2026-06-22T16:15:45.575Z

`classifyAugmentationFreshness` destructures `freshHr/staleHr/slowHr` from opts, defaulting to `FRESHNESS_DEFAULTS`. So `{ dir: VIZ_DIR, now, ...thresholds }` correctly overrides all three. The `...freshnessThresholdsFromEnv()` spread is idiomatic and the keys (`freshHr/staleHr/slowHr`) align exactly with the destructured opts keys. The spread is safe — no extra/wrong keys.

Now let me verify the audit file end-to-end to check for dead code (unused imports after `FRESHNESS_DEFAULTS` → `freshnessThresholdsFromEnv` swap, and the removed `envHr`).

### Assistant | 2026-06-22T16:15:45.863Z

[tool_use: Read]

### User | 2026-06-22T16:15:47.825Z

[tool_result] read-once-guard: 'H:\prism\scripts\audit-augmentation-freshness.mjs' was already read 2m ago in this session and is unchanged (mtime 1782144633050). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T16:15:50.559Z

I have not actually read this full file yet (only the diff hunk). The guard is mistaken about my context. Let me grep for any leftover references to the removed symbols (`FRESHNESS_DEFAULTS`, `envHr`) to confirm no dead code/dangling references.

### Assistant | 2026-06-22T16:15:51.714Z

[tool_use: Grep]

### User | 2026-06-22T16:15:55.103Z

[tool_result] 27:  freshnessThresholdsFromEnv,
39:// (U-VIZ-POSTFLIGHT-PARITY) so both classify with identical thresholds.
40:const thresholds = freshnessThresholdsFromEnv();
52:const rows = classifyAugmentationFreshness(files, { dir: VIZ_DIR, now, ...thresholds });
57:  thresholds,

### Assistant | 2026-06-22T16:15:59.033Z

No dangling `FRESHNESS_DEFAULTS` or `envHr` references remain in the audit file. The import was cleanly swapped (`FRESHNESS_DEFAULTS` → `freshnessThresholdsFromEnv`), the inline `envHr` arrow removed, and `thresholds` computed once and reused in both `classifyAugmentationFreshness` call (line 52) and the report (line 57). No dead code. Let me confirm `FRESHNESS_DEFAULTS` is not used anywhere else in the audit file (the only remaining reference to the old import).

### Assistant | 2026-06-22T16:16:00.729Z

[tool_use: Bash]

### User | 2026-06-22T16:16:05.100Z

[tool_result] scripts/audit-augmentation-freshness.mjs:18:// Knobs: PRISM_AUG_FRESH_HR / PRISM_AUG_STALE_HR / PRISM_AUG_SLOW_HR (hours).

### Assistant | 2026-06-22T16:16:10.279Z

The only remaining reference in the audit file is line 18 — a documentation comment listing the knobs, which is still accurate (the env vars are still honored, just through the shared helper now). No dead code. `regen-viz.mjs` no longer has any inline env-reading; it uses the helper.

Now let me verify the parity claim empirically — that the postflight and the audit now produce identical thresholds under an env override. Let me also check the postflight in regen-viz.mjs reads the same env consistently. Let me do a quick parity check by invoking the helper under an override.

### Assistant | 2026-06-22T16:16:13.978Z

[tool_use: Bash]

### User | 2026-06-22T16:16:18.459Z

[tool_result] node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\h\prism\scripts\lib\augmentation-freshness.mjs' imported from C:\Users\wompu\AppData\Local\Temp\parity-check.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:10)
    at 
... [+560 chars truncated]

### Assistant | 2026-06-22T16:16:21.512Z

Path resolution issue (Git Bash `/h/` mangled to `C:\h\`). Let me use a file inside the repo dir with a relative import.

### Assistant | 2026-06-22T16:16:24.066Z

[tool_use: Bash]

### User | 2026-06-22T16:16:32.605Z

[tool_result] default: {"freshHr":24,"staleHr":168,"slowHr":720}
staleHr=2000: {"freshHr":24,"staleHr":2000,"slowHr":720}
DEFAULTS: {"freshHr":24,"staleHr":168,"slowHr":720}

### Assistant | 2026-06-22T16:16:37.261Z

Parity confirmed: the helper returns the documented defaults `{24, 168, 720}`, honors a valid override (`staleHr=2000`), and since both the audit (`scripts/audit-augmentation-freshness.mjs:40`) and the postflight (`scripts/regen-viz.mjs:339`) call `freshnessThresholdsFromEnv()` with no args against the same `process.env`, they classify with identical thresholds by construction. The P2 #1 parity bug is genuinely closed.

Let me verify there are no other callers of `parseGeneratorArray`/`extractArrayBody` that the state-machine rewrite could regress (e.g. drift-guard mentioned in the commit message). Let me check consumers of `parseGeneratorArray`.

### Assistant | 2026-06-22T16:16:38.366Z

[tool_use: Grep]

### User | 2026-06-22T16:16:39.977Z

[tool_result] scripts\lib\augmentation-freshness.test.mjs:23:import { parseGeneratorArray } from "./viz-dual-registration-audit.mjs";
scripts\lib\augmentation-freshness.test.mjs:258:  const heavyGens = parseGeneratorArray(regen, "HEAVY");
scripts\regen-viz-fast-order.test.mjs:21:import { parseGeneratorArray } from "./lib/viz-dual-registration-audit.mjs";
scripts\regen-viz-fast-order.test.mjs:25:const FAST = par
... [+1266 chars truncated]

### Assistant | 2026-06-22T16:16:44.033Z

The consumers are: the dual-reg auditor itself (lines 174-175, parses live FAST/HEAVY from regen-viz.mjs), and tests. The commit claims "live FAST 104 / HEAVY 5 unchanged" — the `regen-viz-fast-order.test.mjs` (which parses the REAL regen-viz.mjs source) passed 4/4, confirming the state-machine rewrite is behavior-preserving against the real source. The `augmentation-freshness.test.mjs:258` also parses real HEAVY and passed (16/16). Let me verify the live parse count to confirm the backward-compat claim with one concrete check.

### Assistant | 2026-06-22T16:16:46.447Z

[tool_use: Bash]

### User | 2026-06-22T16:16:51.674Z

[tool_result] FAST count: 104 | HEAVY count: 5
HEAVY entries: ["generate-fs-deep-inventory.mjs","generate-l11-file-leaves.mjs","h-drive-skipped-census.mjs","augment-graph-with-awareness.mjs","build-business-value-map.mjs"]

### Assistant | 2026-06-22T16:17:00.983Z

Live FAST=104, HEAVY=5 — exactly matching the commit's backward-compat claim. The state-machine rewrite is behavior-preserving on the real source. The 5 HEAVY entries align with the `SLOW_CADENCE` set in augmentation-freshness.mjs (consistency between the two libs holds).

Let me do a final check on the new state-machine for one subtle correctness concern: the escaped-char handling and template-literal edge. The `inStr` branch handles `\\` by skipping the next char — correct for `"a\"b"`. Template literals (backtick) are treated as plain strings, which is fine for this domain (no `${...}` containing brackets is expected in a generator-name array, and even if present, `${` interpolation isn't parsed — but a `[` inside a template interpolation would be skipped as "in string", which is the safe direction for this use case). One genuine edge: a regex literal containing `[` (character class) outside a string would still be miscounted — but generator arrays contain only string literals + comments, never regexes, so this is not a real exposure here. Worth noting as P2-informational, not a defect for this code's domain.

Let me verify the full audit test suite (the auditDualRegistration path) isn't regressed by re-confirming all 13 pass and checking the `regen-viz-fast-order` suite content briefly for assertion quality.

### Assistant | 2026-06-22T16:17:01.408Z

[tool_use: Read]

### User | 2026-06-22T16:17:02.677Z

[tool_result] 1	// Regression tests for the U-VIZ-AUG-STALE-REWIRE FAST[]/HEAVY[] wiring (sierra 2026-06-22).
2	// Run direct: `node scripts/regen-viz-fast-order.test.mjs`.
3	//
4	// These encode INTENT (R9), not config-mirroring:
5	//   1. The 3 cheap stale-orphan generators are FAST-registered so they re-run every regen
6	//      (without it, merge folds a ~44-day-old frozen file forever -- the bug this unit 
... [+3285 chars truncated]

### Assistant | 2026-06-22T16:17:28.372Z

These tests assert concrete intent (real generator names, ordering invariants, FAST/HEAVY membership) — not stubs. They depend on `parseGeneratorArray` parsing the real regen-viz.mjs correctly, and they pass 4/4, which transitively validates the extractArrayBody rewrite against the live source.

I have now verified all five review points. Let me summarize my findings.

## Summary of verification

**1. Test intent (R9) — bracket test:** Verified both by reasoning AND empirically. The OLD raw-bracket-count code, traced on the test src (`viz-dual-registration-audit.test.mjs:142-148`), ends at depth 2 (never 0) → returns `null` → `[]`. I ran the old implementation against the exact test fixture: it returns `[]`, so `deepEqual([], [a,b,c])` genuinely FAILS. This is a real intent test, not a weak one.

**2. freshnessThresholdsFromEnv test:** Covers all three cases with concrete `deepEqual` assertions (`augmentation-freshness.test.mjs:189-206`): defaults (unset→`{24,168,720}`), valid override (`{12,200,1000}`), AND invalid fallback (`0`/`-5`/`abc` → each independently defaults). No `toBeDefined` stub.

**3. Tests green:** viz-dual-registration-audit 13/13, augmentation-freshness 16/16, regen-viz-fast-order 4/4. All confirmed by running.

**4. Convention:** `freshnessThresholdsFromEnv` (`augmentation-freshness.mjs:57`) is an `export function` with a full JSDoc `@param`/`@returns` block matching sibling exports, ASCII-only, preserving the exact `Number.isFinite(v) && v > 0` semantics of the removed `envHr`. The `...freshnessThresholdsFromEnv()` spread (`audit:52`, `regen-viz:339`) is idiomatic — keys align exactly with `classifyAugmentationFreshness`'s destructured opts.

**5. No weakened assertions / no dead code:** The `FRESHNESS_DEFAULTS` import and inline `envHr` arrow were cleanly removed from the audit; no dangling references (only an accurate knob-doc comment at audit:18 remains). Parity proven empirically (`staleHr=2000` → both consumers identical by construction). L
... [+2206 chars truncated]
