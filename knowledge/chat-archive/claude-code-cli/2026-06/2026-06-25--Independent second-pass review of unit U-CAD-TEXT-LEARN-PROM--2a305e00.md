---
type: "chat-session"
source: "claude-code-cli"
session_id: "2a305e00-e356-4b4c-9010-951ae7d41845"
title: "Independent second-pass review of unit U-CAD-TEXT-LEARN-PROMPT. Weight toward TE"
date: "2026-06-25"
first_ts: "2026-06-25T13:36:25.167Z"
last_ts: "2026-06-25T13:39:24.492Z"
cwd: "H:\\prism"
messages: 46
user_msgs: 16
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/2a305e00-e356-4b4c-9010-951ae7d41845/subagents/agent-ad9ac130184c43b84.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent second-pass review of unit U-CAD-TEXT-LEARN-PROMPT. Weight toward TE

> **claude-code-cli** | 2026-06-25 | 46 msgs (16 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2a305e00-e356-4b4c-9010-951ae7d41845/subagents/agent-ad9ac130184c43b84.jsonl`

## Transcript

### User | 2026-06-25T13:36:25.167Z

Independent second-pass review of unit U-CAD-TEXT-LEARN-PROMPT. Weight toward TEST INTEGRITY + edge coverage. Do NOT assume arm A caught everything.

Read: `git -C H:/prism diff -- scripts/cad-text-to-cadquery.mjs scripts/cad-text-to-cadquery.test.mjs`

CONTEXT: new `loadLearnedRisk` reads the cad-failure ledger's learned patterns (via calibrated recommendAdjustments) back into the text->CAD generation prompt; buildPrompt gains a learnedRisk section. node:test (run `node scripts/cad-text-to-cadquery.test.mjs`).

VERIFY (PASS/FAIL + P0/P1 file:line):
1. Do the new tests use REAL assertions (deepEqual on exact guidance strings, calibrate:true + slug assertions inside the injected engine), not stubs? Would they FAIL if loadLearnedRisk regressed (e.g. dropped calibrate:true, or stopped preferring suggestions)?
2. Coverage: happy (suggestions), fallback (topRiskCategories), >=2 fail-soft modes (import throw / missing method / non-object), buildPrompt section present + absent + filter/cap. Any gap? Is the loadFromDisk path covered or at least not broken by the injected fakes (which lack loadFromDisk)?
3. Does the buildPrompt test prove the LEARNED and TRIBAL sections coexist independently + ordering (both before REQUEST)?
4. Any `.skip`/`.only`, weakened assertion, or test that passes trivially?
5. Run `node scripts/cad-text-to-cadquery.test.mjs` yourself and confirm the count (expect 17 pass).

Be adversarial. Return PASS or FAIL with findings.

### Assistant | 2026-06-25T13:36:31.240Z

I'll review this unit thoroughly. Let me start by reading the diff and the full files.

### Assistant | 2026-06-25T13:36:31.979Z

[tool_use: Bash]

### User | 2026-06-25T13:36:32.687Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-25T13:36:35.969Z

The diff was cached. Let me read the actual files end-to-end rather than rely on a diff hunk, per PRISM review discipline.

### Assistant | 2026-06-25T13:36:36.830Z

[tool_use: Read]

### Assistant | 2026-06-25T13:36:36.881Z

[tool_use: Read]

### User | 2026-06-25T13:36:38.889Z

[tool_result] read-once-guard: 'H:\prism\scripts\cad-text-to-cadquery.mjs' was already read 3s ago in this session and is unchanged (mtime 1782394414473). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T13:36:39.618Z

[tool_result] 1	// Tests for cad-text-to-cadquery.mjs (U-CAD-TEXT-BRIDGE, slot:zulu 2026-06-12).
2	// R9 intent: this bridge is the LLM caller the CadQueryCodeGeneratorEngine
3	// pipeline documents but never had. The pins that matter: (1) the JM doctrine
4	// (inch units / spark gap / no periodic splines) is HARD-CODED into every
5	// prompt, (2) the engine's canonical prompt is consumed when loadable and the

... [+14496 chars truncated]

### Assistant | 2026-06-25T13:36:43.578Z

The test file is in context. The .mjs source was already read this session, so it's in my context. Let me locate the exact `loadLearnedRisk` and `buildPrompt` implementation lines to cite accurately.

### Assistant | 2026-06-25T13:36:45.083Z

[tool_use: Grep]

### User | 2026-06-25T13:36:46.609Z

[tool_result] 122: * via the CALIBRATED CADTrialErrorLearningEngine.recommendAdjustments (U-CAD-LEARN-CALIBRATE)
134:export async function loadLearnedRisk(request, importImpl = (s) => import(s)) {
141:    if (!eng || typeof eng.recommendAdjustments !== "function") return [];
145:    const rec = eng.recommendAdjustments({ partType: slugify(request).slice(0, 24) }, { calibrate: true });
148:    // Prefer the engi
... [+1274 chars truncated]

### Assistant | 2026-06-25T13:36:50.867Z

Let me read the full `loadLearnedRisk` and `buildPrompt` implementation bodies to verify the test claims against the actual code.

### Assistant | 2026-06-25T13:36:51.908Z

[tool_use: Read]

### User | 2026-06-25T13:36:53.664Z

[tool_result] 115	  } catch { return []; } // tribal injection is advisory -- never block generation
116	}
117	
118	/**
119	 * Fail-soft: read THIS shop's LEARNED CAD-generation failure modes back into the prompt --
120	 * the missing REVERSE arrow (U-CAD-TEXT-LEARN-PROMPT). The script already FEEDS outcomes into
121	 * the cad-failure-ledger (ingestGenerationOutcome); this reads the ledger's learned patterns
1
... [+6417 chars truncated]

### Assistant | 2026-06-25T13:36:57.943Z

Now I have the full implementation of both `loadLearnedRisk` (lines 134-163) and `buildPrompt` (172-205). Let me verify the slug-derivation detail. The test asserts `partType: "a-2-inch-alignment-pin"` but the code does `slugify(request).slice(0, 24)`. Let me check what `slugify("a 2 inch alignment pin")` produces and whether `.slice(0,24)` truncates it — this is a critical correctness check.

### Assistant | 2026-06-25T13:36:58.532Z

[tool_use: Read]

### User | 2026-06-25T13:37:00.082Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * cad-text-to-cadquery.mjs -- the Ollama text->CAD generation bridge
4	 * (U-CAD-TEXT-BRIDGE, slot:zulu 2026-06-12; operator: "everything hard coded,
5	 * bridged and wired so we can utilize the prism ai systems on ollama to do
6	 * cad generation").
7	 *
8	 * PATTERN (open-source recon, DELTA-CAD-GALAXY-MAX-BUILDOUT-2026-06-12.md):
9	 * CadQuery/build123d + local LL
... [+3698 chars truncated]

### Assistant | 2026-06-25T13:37:09.287Z

I've verified `slugify` (line 60-61). `slugify("a 2 inch alignment pin")` = `"a-2-inch-alignment-pin"` which is 21 chars, so `.slice(0,24)` does not truncate it. The test assertion `candidate.partType === "a-2-inch-alignment-pin"` is correct.

One important nuance: the test asserts `partType` matches `slugify(request).slice(0, 24)`, but the test's own comment says "partType derived from the request slug." Let me verify there's no off-by-one: the code uses `slice(0, 24)` (line 145), and the test docstring at line 224 says "partType derived from the request slug" — the test passes the full 21-char slug, which is within 24. This test would NOT catch a regression where the `.slice(0, 24)` bound changed (since the input is shorter than 24). That's a minor coverage observation, not a bug.

Now let me run the test to confirm the count.

### Assistant | 2026-06-25T13:37:10.457Z

[tool_use: Bash]

### User | 2026-06-25T13:37:17.830Z

[tool_result]   ...
# Subtest: buildPrompt: learnedRisk rendered as a LEARNED FAILURE MODES section; absent when empty (backward compatible with <=4-arg callers)
ok 14 - buildPrompt: learnedRisk rendered as a LEARNED FAILURE MODES section; absent when empty (backward compatible with <=4-arg callers)
  ---
  duration_ms: 0.2466
  ...
# Subtest: buildPrompt: learnedRisk filters non-string/blank and caps at 5; tri
... [+799 chars truncated]

### Assistant | 2026-06-25T13:37:27.073Z

17 tests, all pass, 0 skipped, 0 fail — confirmed. Now let me adversarially verify the test integrity claims. Let me check whether the new tests would actually FAIL on a regression. First, the critical mutation test: would the test catch if `calibrate:true` were dropped or if the suggestions->fallback preference inverted?

Let me trace through the key assertions adversarially:

**1. `calibrate:true` regression** — Test line 223: `assert.equal(opts.calibrate, true, ...)` is inside the injected engine's `recommendAdjustments`. The real code at line 145 passes `{ calibrate: true }`. If the code dropped `calibrate:true` (passed `{}` or omitted the second arg), `opts.calibrate` would be `undefined`, and `assert.equal(undefined, true)` would throw → test fails. **This pin holds.** But note: if the code dropped the second argument entirely (`recommendAdjustments({partType})`), then `opts` would be `undefined` and `opts.calibrate` throws a TypeError — still a failure, just a different error. Either way it fails loud. Good.

**2. suggestions-preferred regression** — Test line 234 asserts `deepEqual(..., ["emit a single manifold solid (62% historical fail)"])`. The fake returns BOTH `suggestions` and `topRiskCategories`. If the code stopped preferring suggestions (e.g., always used topRiskCategories), the output would be `["avoid topology_mismatch -- historical fail rate 62%"]` instead → deepEqual fails. **This pin holds** because the fake supplies both and the expected string is the suggestion-format string.

Let me verify the exact guidance-string format the code produces matches the test's expected string.

### Assistant | 2026-06-25T13:37:28.171Z

[tool_use: Read]

### User | 2026-06-25T13:37:31.000Z

[tool_result] 145	    const rec = eng.recommendAdjustments({ partType: slugify(request).slice(0, 24) }, { calibrate: true });
146	    if (!rec || typeof rec !== "object") return [];
147	    const out = [];
148	    // Prefer the engine's actionable adjustment suggestions; fall back to the top risk categories.
149	    for (const s of Array.isArray(rec.suggestions) ? rec.suggestions : []) {
150	      if (s && type
... [+660 chars truncated]

### Assistant | 2026-06-25T13:37:41.781Z

Verified the format strings:

- Line 151: `` `${s.action.trim()} (${String(s.rationale).trim()})` `` → with action="emit a single manifold solid", rationale="62% historical fail" → `"emit a single manifold solid (62% historical fail)"`. Matches test line 234 exactly. **Real assertion, would fail on format regression.**
- Line 157: `` `avoid ${c.category} -- historical fail rate ${Math.round(c.rate * 100)}%` `` → with category="code_error", rate=0.41 → `Math.round(41)` = `"avoid code_error -- historical fail rate 41%"`. Matches test line 242 exactly. The `Math.round(0.41*100)` = `Math.round(41.0)` = 41 (note: `0.41*100` = `41.00000000000001` in float, rounds to 41). **Real assertion with the rounding logic exercised.**

Now let me verify the fail-soft test (line 245-249) covers the three modes the task asks about, and check the missing-method and non-object branches map to real code paths:

- Line 246 `import throw` → caught by outer `try/catch` line 162 → `[]`. Covered.
- Line 247 `{ cadTrialErrorLearningEngine: {} }` (no recommendAdjustments) → line 141 `typeof eng.recommendAdjustments !== "function"` → `[]`. Covered.
- Line 248 `recommendAdjustments: () => null` → line 146 `!rec` → `[]`. Covered (non-object/null result).

Now let me check the **loadFromDisk path** concern from the task. The code at line 144 guards `if (typeof eng.loadFromDisk === "function")`. The injected fakes in the tests do NOT have `loadFromDisk`, so that branch is skipped — the fakes don't break, but the `loadFromDisk` replay path itself is NOT exercised by any test. Let me confirm no fake provides it.

### Assistant | 2026-06-25T13:37:43.343Z

[tool_use: Grep]

### User | 2026-06-25T13:37:45.317Z

[tool_result] No matches found

### Assistant | 2026-06-25T13:37:58.580Z

Confirmed: `loadFromDisk` has zero test coverage. The guard at line 144 ensures the injected fakes (which lack `loadFromDisk`) don't break — so the test suite passes — but the replay-the-ledger branch (the `loadFromDisk()` call + its inner try/catch) is never executed by any test. This is a real but minor (P2) coverage gap: a regression that, say, called `loadFromDisk()` unconditionally (removing the `typeof` guard) would NOT be caught by these unit tests (the fakes lack the method, so an unguarded call would throw — actually that WOULD be caught because it'd throw inside the try and return `[]`, changing the suggestions test result). Let me think about that adversarially.

Actually — if the guard at line 144 were removed (regression to `eng.loadFromDisk()` unconditional), then in the `withSuggestions` test the fake has no `loadFromDisk`, so `eng.loadFromDisk()` throws `TypeError: eng.loadFromDisk is not a function`, caught by the outer `try/catch` → returns `[]` → `deepEqual(["emit a single manifold solid..."])` fails. So the guard-removal regression IS caught indirectly. Good — the coverage gap is narrower than it first appears: only a regression in the *body* of the loadFromDisk replay (e.g., wrong path, real-disk side effect) is uncovered, which is acceptable for a fail-soft advisory path.

Now let me verify the buildPrompt coexistence + ordering claims (task item 3). Test line 206-214 ("tribal + learned coexist") asserts both sections present, but does it prove **ordering** (both before REQUEST, and learned after tribal)? Let me re-examine.

Test 14 (line 200): `assert.ok(p.indexOf("LEARNED FAILURE MODES") < p.indexOf("REQUEST:"))` — proves learned before REQUEST.
Test 15 (line 206-214): asserts both `SHOP TRIBAL KNOWLEDGE` and `LEARNED FAILURE MODES` match, but does NOT assert their relative order to each other, nor that learned is before REQUEST in the coexist case.

The code (lines 197-201) emits tribal section, then learned section, then REQUEST — so orderi
... [+180 chars truncated]

### Assistant | 2026-06-25T13:37:59.837Z

[tool_use: Grep]

### User | 2026-06-25T13:38:02.413Z

[tool_result] 90:  assert.ok(p.indexOf("SHOP TRIBAL KNOWLEDGE") < p.indexOf("REQUEST:"));
200:  assert.ok(p.indexOf("LEARNED FAILURE MODES") < p.indexOf("REQUEST:"));

### Assistant | 2026-06-25T13:38:11.570Z

Confirmed: there are exactly two ordering assertions:
- Line 90: `SHOP TRIBAL KNOWLEDGE < REQUEST:` (in the tribal-only test, test 7)
- Line 200: `LEARNED FAILURE MODES < REQUEST:` (in the learned-only test, test 14)

Both prove "section before REQUEST" but each in a **separate** test where only one section is present. In the coexist test (test 15, line 206-214), neither the relative tribal-vs-learned order NOR "both before REQUEST simultaneously" is asserted. This addresses the task's item 3: the coexist test proves both sections are *present independently* and that the filter/cap works with both present, but it does NOT prove their *ordering* relative to each other or to REQUEST when both coexist.

This is a minor gap (P2): the ordering is deterministic by construction (lines 197→201→203), and each section's individual "before REQUEST" ordering is pinned. A regression that, say, moved the learned section *after* REQUEST would be caught by test 14. The only fully-uncovered scenario is "tribal vs learned relative order swaps when both present" — but a swap there is harmless (both are context-before-ask). Not load-bearing.

Now let me verify the other R9 concerns: any trivially-passing test, weakened assertion, `.skip`/`.only`. Let me scan.

### Assistant | 2026-06-25T13:38:12.678Z

[tool_use: Grep]

### User | 2026-06-25T13:38:14.174Z

[tool_result] No matches found

### Assistant | 2026-06-25T13:38:19.505Z

No `.skip`/`.only`/`.todo`, no `toBeDefined`, no tautological `assert.ok(true)`, no bare early `return`. Clean.

Now let me verify the wiring/integration concern from my independent second-pass angle: is `loadLearnedRisk` actually wired into the live generation path (not orphaned), and is the export present? From the earlier grep: line 349 `const learnedRisk = await loadLearnedRisk(request);` and line 350 passes it into `buildPrompt`. Let me confirm the export and the live wiring context.

### Assistant | 2026-06-25T13:38:20.007Z

[tool_use: Read]

### User | 2026-06-25T13:38:21.366Z

[tool_result] 343	  const mi = argv.indexOf("--model");
344	  const model = mi !== -1 && argv[mi + 1] ? argv[mi + 1] : DEFAULT_MODEL;
345	
346	  const tribalTips = await loadTribalTips(request);
347	  // Reverse arrow (U-CAD-TEXT-LEARN-PROMPT): steer this generation away from the shop's
348	  // historically-failing modes, read from the same ledger this loop feeds.
349	  const learnedRisk = await loadLearnedRis
... [+2249 chars truncated]

### Assistant | 2026-06-25T13:38:32.310Z

`loadLearnedRisk` is properly wired into the live `main()` path (line 349), fed into `buildPrompt` (line 350), and `learnedRiskCount` is surfaced in both `request.json` (line 365) and the summary (line 377). It is also exported (the test imports it at test-file line 14, and the test passes — so the export exists). Not orphaned. Good R15 wiring.

Now let me close one adversarial loop on the test's `partType` assertion. The test (line 224) asserts `candidate.partType === "a-2-inch-alignment-pin"` (21 chars). The code does `slugify(request).slice(0, 24)`. Since this test input never exceeds 24 chars, the `.slice(0, 24)` bound is **not exercised** — a regression changing `.slice(0,24)` to `.slice(0,99)` or removing the slice would pass undetected. This is a P2 (the fallback test uses request `"x"`, also short). Minor — the partType is only an engine lookup key, not safety-relevant, and the slice is a cosmetic bound.

Let me also verify there's no issue with how the fallback test (line 237-242) asserts the engine call — it uses `async () => ({...})` ignoring the url, so it doesn't assert `calibrate:true` in the fallback case. That's fine; the suggestions case (line 223) already pins `calibrate:true`. No regression escape there.

One final check — let me confirm the build of the `dist` engine the live path imports actually exists / has the method, so the wiring isn't pointing at a phantom (R12: the tests mock it, but live correctness depends on the real engine having `recommendAdjustments` with a `calibrate` option).

### Assistant | 2026-06-25T13:38:34.147Z

[tool_use: Bash]

### User | 2026-06-25T13:38:40.196Z

[tool_result] -rw-r--r-- 1 wompu 197611 39140 Jun 24 17:50 mcp-server/dist/engines/CADTrialErrorLearningEngine.js
---method check---
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
6 matches in 2 files:

205:0:...umber;     // logit-shift recommendAdjustments applies when calibrate=true (
... [+560 chars truncated]

### Assistant | 2026-06-25T13:38:43.780Z

The rtk grep output got truncated/grouped. Let me confirm the real engine signature directly to validate the live contract — specifically that `recommendAdjustments` accepts a `(candidate, opts)` shape with `calibrate` and returns `{suggestions, topRiskCategories}`.

### Assistant | 2026-06-25T13:38:45.597Z

[tool_use: Bash]

### User | 2026-06-25T13:38:49.192Z

[tool_result] 205:  calibrationShift: number;     // logit-shift recommendAdjustments applies when calibrate=true (0 when not applicable)
502:  recommendAdjustments(
763:   * attributed back to it. Computes the recommendation via recommendAdjustments,
769:   * @param rawCandidate generation candidate (same shape as recommendAdjustments)
777:    const recommendation = this.recommendAdjustments(rawCandidate, {
10
... [+645 chars truncated]

### Assistant | 2026-06-25T13:38:54.712Z

The live contract is confirmed against the real engine:
- `recommendAdjustments(candidate, opts)` exists (line 502) and accepts `{ calibrate?: boolean }` (line 504, 775).
- Return shape has `topRiskCategories: Array<{ category, rate }>` (line 132) and `suggestions: AdjustmentSuggestion[]` (line 133) — exactly the shape the fakes emulate and the code reads. The mocks are faithful to the real engine, so the unit tests are not testing a fictional contract.
- The dist `.js` exists (built Jun 24). The live wiring imports a real, present module.

Let me verify the `AdjustmentSuggestion` shape has `action`/`rationale`/`category` so the suggestion-format string in the code (line 151) matches reality.

### Assistant | 2026-06-25T13:38:55.977Z

[tool_use: Bash]

### User | 2026-06-25T13:39:00.047Z

[tool_result] 88:export interface AdjustmentSuggestion {
133:  suggestions: AdjustmentSuggestion[];
1143:  ): AdjustmentSuggestion[] {
===fields===
export interface AdjustmentSuggestion {
  category: FailureCategory;
  action: string; // human-readable adjustment
  rationale: string;
  expectedRiskReduction: number; // 0..1
}

### Assistant | 2026-06-25T13:39:24.492Z

Confirmed: `AdjustmentSuggestion` has `action: string` and `rationale: string` (lines 88-93). The code's format string at line 151 (`${action} (${rationale})`) correctly reads real fields. The mocks match the real contract.

I have completed an end-to-end, adversarial review. Let me consolidate findings.

## Summary of verification

**Files reviewed end-to-end:** `H:\prism\scripts\cad-text-to-cadquery.mjs` (the `loadLearnedRisk` impl lines 134-163, `buildPrompt` lines 172-205, live wiring lines 349-377) and `H:\prism\scripts\cad-text-to-cadquery.test.mjs` (full, 250 lines / 17 tests).

**Cross-checked against the live engine** `mcp-server/src/engines/CADTrialErrorLearningEngine.ts` to confirm the test mocks are faithful (not a fictional contract).

---

VERDICT: PASS

summary: The new `loadLearnedRisk` reverse-arrow and the `buildPrompt` LEARNED FAILURE MODES section are correct, fail-soft, properly wired into the live `main()` path (line 349-350, surfaced in `request.json`/summary), and backed by real assertions. All 17 node:test cases pass with 0 skipped/0 failed. The mocks faithfully mirror the real engine's `recommendAdjustments(candidate, {calibrate})` signature and `{suggestions, topRiskCategories}` return shape (verified against `CADTrialErrorLearningEngine.ts:88-133,502-504`). No P0/P1 issues; three P2 coverage observations that do not block merge.

findings:
- [P2] `scripts/cad-text-to-cadquery.test.mjs:224` -- the `partType` assertion exercises a 21-char slug ("a-2-inch-alignment-pin") against code that does `slugify(request).slice(0,24)` (`cad-text-to-cadquery.mjs:145`); both test inputs ("a 2 inch alignment pin", "x") are shorter than the 24 bound, so a regression that changed/removed the `.slice(0,24)` cap would pass undetected. Non-safety-relevant (lookup key only). -- Fix: add one assertion with a >24-char request to pin the truncation bound, or drop the bound if intentional.
- [P2] `scripts/cad-text-to-cadquery.test.mjs:206-214` -- the "tribal + lear
... [+2156 chars truncated]
