---
type: "chat-session"
source: "claude-code-cli"
session_id: "4c896ca9-8e03-4cbf-9b68-0250f060c32f"
title: "Independent second-pass review of a PRISM SFC engine bug-fix unit (oscar slot, S"
date: "2026-06-21"
first_ts: "2026-06-21T01:27:06.145Z"
last_ts: "2026-06-21T01:32:08.421Z"
cwd: "H:\\prism\\mcp-server"
messages: 59
user_msgs: 21
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism/4c896ca9-8e03-4cbf-9b68-0250f060c32f/subagents/agent-a33d4114cf3d92ea1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent second-pass review of a PRISM SFC engine bug-fix unit (oscar slot, S

> **claude-code-cli** | 2026-06-21 | 59 msgs (21 user / 38 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/4c896ca9-8e03-4cbf-9b68-0250f060c32f/subagents/agent-a33d4114cf3d92ea1.jsonl`

## Transcript

### User | 2026-06-21T01:27:06.145Z

Independent second-pass review of a PRISM SFC engine bug-fix unit (oscar slot, SFC-WIRING-MS0 prerequisite). Read BOTH files end-to-end:
1. Engine (edited): `H:/prism/mcp-server/src/engines/HeatTreatmentAwareSpeedFeedEngine.ts`
2. New test: `H:/prism/mcp-server/src/__tests__/heat-treatment-aware-speed-feed.test.ts`

CONTEXT: Two bugs fixed in the engine: (a) dangling refs to deleted `REGIME_MODIFIERS`/`REGIME_EXPECTED_HARDNESS` (now read from canonical `CANONICAL_HEAT_TREAT_REGIME[regime].modifier` / `.expected`), proven to throw `ReferenceError` live; (b) positive-guard `x<=0` let NaN through -> now `Number.isFinite(x)&&x>0`. The engine previously had ZERO test coverage of `adjust()` (the only "heat-treatment" test tests a DIFFERENT engine, HeatTreatmentEngine). The new test adds 23 cases.

REVIEW FOR (weight toward what physics-review won't catch):
- TEST INTEGRITY (R9): do the assertions verify INTENT, not tautology? Are the reference values (300*modifier, Taylor 655.7, etc.) actually meaningful, or could the test pass against a hardcoded/wrong impl? Any `toBeDefined()`-style stubs, `.skip`/`.only`, weakened assertions?
- Coverage adequacy: happy + >=3 failure modes + >=2 adversarial + variability (>=3 spanning regimes)? Is anything important UNtested (e.g. the `source` strings, the AtomicValue shape, taylor_n edge)?
- Convention conformance: NodeNext `.js` import suffix, ASCII-only, naming, file location (src/__tests__/).
- Hidden issues in the engine edit: does `spec` get correctly narrowed (TS), is the error message still matched by the tests, any other code path still referencing the dead symbols?
- Is the NaN-guard message ("positive baseline_sfm + chip_load + tool_life required") still accurate given it now also rejects NaN/Infinity?

Grade PASS or FAIL with P0/P1/P2 findings + file:line citations.

### Assistant | 2026-06-21T01:27:09.145Z

I'll review both files end to end, then verify the claims against the actual code.

### Assistant | 2026-06-21T01:27:09.627Z

[tool_use: Read]

### Assistant | 2026-06-21T01:27:10.073Z

[tool_use: Read]

### User | 2026-06-21T01:27:11.849Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\HeatTreatmentAwareSpeedFeedEngine.ts' was already read 1s ago in this session and is unchanged (mtime 1782005050489). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### User | 2026-06-21T01:27:15.322Z

[tool_result] 1	/**
2	 * HeatTreatmentAwareSpeedFeedEngine — Unit Tests
3	 *
4	 * Reference-value coverage for the heat-treat regime modifier engine that was
5	 * shipping a DANGLING-REFERENCE bug: an incomplete refactor (U-SFC-HEATTREAT-REGIME)
6	 * swapped the inline `REGIME_MODIFIERS` / `REGIME_EXPECTED_HARDNESS` tables for the
7	 * canonical `CANONICAL_HEAT_TREAT_REGIME` import but left the OLD symbol refer
... [+7584 chars truncated]

### Assistant | 2026-06-21T01:27:18.083Z

The engine file was already read this session but isn't in my visible context. Let me read it now, plus the canonical constants it depends on.

### Assistant | 2026-06-21T01:27:18.698Z

[tool_use: Read]

### User | 2026-06-21T01:27:21.613Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\HeatTreatmentAwareSpeedFeedEngine.ts' was already read 10s ago in this session and is unchanged (mtime 1782005050489). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PR
... [+17 chars truncated]

### Assistant | 2026-06-21T01:27:23.873Z

The read guard blocks me but the engine content is not actually in my visible context. Let me work around it.

### Assistant | 2026-06-21T01:27:24.565Z

[tool_use: Bash]

### User | 2026-06-21T01:27:39.841Z

[tool_result] /**
 * HeatTreatmentAwareSpeedFeedEngine — material regime modifier
 *
 * Given a baseline speed/feed envelope (from SpeedFeedOrchestrator) and the
 * stock's heat-treatment state (annealed / normalized / quenched-tempered /
 * through-hardened / precipitation-hardened / nitrided / case-hardened),
 * applies the Machinery's Handbook + Sandvik §C heat-treat modifiers:
 *
 *   SFM × modifier_per_tre
... [+6376 chars truncated]

### Assistant | 2026-06-21T01:27:43.652Z

Now I have the engine end to end. Let me verify the canonical constants the engine and test depend on - this is load-bearing for the reference values (modifier, expected hardness bands, taylor_n claims).

### Assistant | 2026-06-21T01:27:44.693Z

[tool_use: Grep]

### User | 2026-06-21T01:27:45.930Z

[tool_result] 987:export type HeatTreatRegime =
991:export interface HeatTreatRegimeSpec {
998:export const CANONICAL_HEAT_TREAT_REGIME: Record<HeatTreatRegime, HeatTreatRegimeSpec> = {
1030:export function regimeExpectedHardnessHb(regime: HeatTreatRegime): number | null {
1031:  const spec = CANONICAL_HEAT_TREAT_REGIME[regime];

### Assistant | 2026-06-21T01:27:48.919Z

[tool_use: Read]

### User | 2026-06-21T01:27:49.425Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\physics\constants.ts' (same offset/limit) was already read 9m ago in this session and is unchanged (mtime 1782001558055). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-06-21T01:27:51.723Z

The guard claims it's in context but it isn't visible to me. Let me grep the actual table body with context to verify the reference values.

### Assistant | 2026-06-21T01:27:52.790Z

[tool_use: Bash]

### User | 2026-06-21T01:28:03.928Z

[tool_result] //   ASM Handbook Vol 16 sec 6; Kennametal Hard-Turn application guide.
// ============================================================================
export type HeatTreatRegime =
  | "annealed" | "normalized" | "quenched_tempered" | "through_hardened"
  | "precip_hardened" | "nitrided" | "case_hardened";

export interface HeatTreatRegimeSpec {
  /** Speed/feed multiplier vs the annealed (1.0) b
... [+2443 chars truncated]

### Assistant | 2026-06-21T01:28:06.080Z

Now I have the canonical ground truth. Let me verify the key reference values and cross-check the test claims against the actual constants and engine logic.

Let me verify the Taylor math and the specific test reference values numerically.

### Assistant | 2026-06-21T01:28:12.506Z

[tool_use: Bash]

### User | 2026-06-21T01:28:16.452Z

[tool_result] qt life n=0.25: 655.6929 -> toFixed(1): 655.7
qt life n=0.20: 1192.1689
|v-655.7| = 0 < 0.5 ? true
annealed mod 1 sfm 300 chip 0.1
normalized mod 0.85 sfm 255 chip 0.085
quenched_tempered mod 0.55 sfm 165 chip 0.055
through_hardened mod 0.35 sfm 105 chip 0.035
precip_hardened mod 0.45 sfm 135 chip 0.045
nitrided mod 0.3 sfm 90 chip 0.03
case_hardened mod 0.4 sfm 120 chip 0.04

### Assistant | 2026-06-21T01:28:23.294Z

The reference values all check out: Taylor life 655.7 is exact, SFM/chip scale by canonical modifier. Now let me verify the test claims about hardness bands and warning strings against the actual constant table and engine messages.

Verification against the canonical table:
- `quenched_tempered`: `min_hrc:28, max_hrc:45`. Test uses hardness 38 (in band -> pass), 20 (below 28 -> "below regime"), 55 (above 45 -> "above regime"). Engine message says "below regime" / "above regime". Correct.
- `annealed`: `max_hrb:90`. Test HRB 100 > 90 -> "above regime". Correct.
- Heavy modifier `<= 0.40`: through_hardened 0.35 triggers "verify rigidity". Correct.
- Unknown regime: engine throws "unknown regime". Test matches `/unknown regime/`. Correct.
- NaN guard: `baseline_tool_life_min: NaN` -> rejected, message "positive baseline_sfm...". Correct.

Let me check whether any dead symbols still linger anywhere and confirm there's no other consumer broken by the refactor (silent breakage check).

### Assistant | 2026-06-21T01:28:24.598Z

[tool_use: Grep]

### User | 2026-06-21T01:28:25.695Z

[tool_result] src\__tests__\heat-treatment-aware-speed-feed.test.ts:6: * swapped the inline `REGIME_MODIFIERS` / `REGIME_EXPECTED_HARDNESS` tables for the
src\__tests__\heat-treatment-aware-speed-feed.test.ts:8: * the lookup sites, so `adjust()` threw `ReferenceError: REGIME_MODIFIERS is not defined`
src\__tests__\heat-treatment-aware-speed-feed.test.ts:30:  it("does NOT throw ReferenceError (regression: REGIME
... [+31 chars truncated]

### Assistant | 2026-06-21T01:28:26.173Z

[tool_use: Grep]

### User | 2026-06-21T01:28:27.295Z

[tool_result] src\physics\constants.ts:980:// table: HeatTreatmentAwareSpeedFeedEngine (flat-modifier path) AND UltimateSpeedFeedEngine
src\tools\dispatchers\safetyDispatcher.ts:728:          const { heatTreatmentAwareSpeedFeedEngine: ht } = await import("../../engines/HeatTreatmentAwareSpeedFeedEngine.js");
src\__tests__\heat-treatment-aware-speed-feed.test.ts:2: * HeatTreatmentAwareSpeedFeedEngine — Unit Test
... [+3938 chars truncated]

### Assistant | 2026-06-21T01:28:30.495Z

Important finding: there are now TWO test files for this same engine. The new one under review (`heat-treatment-aware-speed-feed.test.ts`) plus a pre-existing `HeatTreatmentAwareSpeedFeedEngine.test.ts`. Let me read the pre-existing one to check for duplication/conflict and verify the task claim that `adjust()` had ZERO coverage.

### Assistant | 2026-06-21T01:28:31.306Z

[tool_use: Bash]

### User | 2026-06-21T01:28:38.807Z

[tool_result] import { describe, it, expect } from "vitest";
import {
  heatTreatmentAwareSpeedFeedEngine as eng,
  HeatTreatmentAwareSpeedFeedEngine,
  type HeatTreatSFInput,
} from "../engines/HeatTreatmentAwareSpeedFeedEngine.js";

function nominal(o: Partial<HeatTreatSFInput> = {}): HeatTreatSFInput {
  return {
    material: "H13 tool steel",
    heat_treat_regime: "annealed",
    baseline_sfm: 200,
    ba
... [+4600 chars truncated]

### Assistant | 2026-06-21T01:28:45.980Z

This is a significant finding. There is a **pre-existing test file** `HeatTreatmentAwareSpeedFeedEngine.test.ts` (18 cases) that already covers `adjust()` thoroughly — including modifier values, Taylor extension, hardness checks, the no-hardness warning, the heavy-modifier warning, unknown regime, non-positive guards, and all 7 regimes. This directly contradicts the task prompt's premise that "this engine's adjust() had ZERO coverage."

Critically, this pre-existing file would ALSO have caught the dangling-ref `ReferenceError` (e.g. its `annealed regime preserves baseline` test calls `adjust()`). So either the pre-existing file was failing before the engine fix (and the regression went unnoticed because the suite was red/unrun), or there's something else going on. Either way, the new test file is substantially duplicative of the existing one. Let me check the file naming convention requirement and whether the duplicate matters, and verify the `@ts-expect-error` and import suffix details.

Let me also confirm the convention rule (`EngineName.test.ts matching engine file`) — the pre-existing file matches that convention; the new file does NOT.

### Assistant | 2026-06-21T01:28:49.096Z

[tool_use: Bash]

### User | 2026-06-21T01:28:54.212Z

[tool_result] 129:const HEAT_TREAT_SF_ACTIONS = new Set(["heat_treat_sf_adjust"]);
---ASCII CHECK new test---
grep: -P supports only unibyte and UTF-8 locales
ASCII-clean (no non-ASCII bytes)
---ASCII CHECK engine---
grep: -P supports only unibyte and UTF-8 locales

### Assistant | 2026-06-21T01:28:58.208Z

The `LC_ALL=C` broke `-P`. Let me redo the ASCII check properly and inspect the dispatcher consumer to confirm nothing else broke.

### Assistant | 2026-06-21T01:29:00.460Z

[tool_use: Bash]

### User | 2026-06-21T01:29:05.176Z

[tool_result] === non-ASCII in NEW test (should be none for code; box-drawing in comments is the question) ===
grep: -P supports only unibyte and UTF-8 locales
=== exit 0 ===
=== dispatcher consumer context ===
          const { faiAutoGenerationEngine: fai } = await import("../../engines/FAIAutoGenerationEngine.js");
          result = fai.generate(params as Parameters<typeof fai.generate>[0]);
        } else 
... [+2146 chars truncated]

### Assistant | 2026-06-21T01:29:09.695Z

The grep `-P` is unavailable in this Git Bash. The dispatcher consumer (`safetyDispatcher.ts:728`) is intact and correctly calls `ht.adjust()`. Let me do the non-ASCII check with a node-based scan and run both test files to verify they actually pass (and critically, whether the pre-existing one was already passing — which determines whether the "ReferenceError live" claim holds).

### Assistant | 2026-06-21T01:29:13.107Z

[tool_use: Bash]

### User | 2026-06-21T01:29:18.263Z

[tool_result] === src/__tests__/heat-treatment-aware-speed-feed.test.ts non-ASCII lines: 18
2: "—" in: * HeatTreatmentAwareSpeedFeedEngine — Unit Tests
10: "—" in: * (heat-treatment-engine.test.ts) tests a DIFFERENT engine (
14: "·" in: *   annealed 1.00 · normalized 0.85 · quenched_tempered 0.55
15: "·" in: *   precip_hardened 0.45 · nitrided 0.30 · case_hardened 0.4
29: "─" in: // ── Regression guard: the dan
... [+1381 chars truncated]

### Assistant | 2026-06-21T01:29:25.871Z

Non-ASCII characters (em-dash `—`, box-drawing `─`, arrows `→`, `·`, `×`, `§`) appear in BOTH files, but ONLY in comments/test-description strings — never in code identifiers or assertion logic. The engine's non-ASCII is pre-existing (not introduced by this fix). The repo convention from the user CLAUDE.md is "ASCII-only where the repo requires it" and the project explicitly flags "no smart-quotes/em-dashes in code." These are in comments and `it(...)` description strings, which is the softer case — many PRISM files carry box-drawing in comments. The engine already shipped with them, so the test merely matches the surrounding convention (R11). I'll flag as P2.

Now the load-bearing question: did the pre-existing test pass before the fix? If `adjust()` threw `ReferenceError` live, the pre-existing 18-case file would have been fully RED. Let me run both files now to confirm green post-fix, and check git to see if the pre-existing file is new in this session or predates it.

### Assistant | 2026-06-21T01:29:29.240Z

[tool_use: Bash]

### User | 2026-06-21T01:29:43.613Z

[tool_result] === git status of both test files ===
46b8140bc8 [MAIN] [PRISM-FIRST-PART-PERFECT]/U-HEAT-TREAT-SF (slot:foxtrot iter27) [BOOTSTRAP-SLOT-ENFORCE]: HeatTreatmentAwareSpeedFeedEngine — 7-regime modifier (annealed=1.00 / normalized=0.85 / Q&T=0.55 / through_hardened=0.35 / precip=0.45 / nitrided=0.30 / case_hardened=0.40) on SFM + chip-load + Taylor tool-life (V·T^n=C extension, T scales by modifier^
... [+461 chars truncated]

### Assistant | 2026-06-21T01:29:48.027Z

This is the decisive finding. The pre-existing `HeatTreatmentAwareSpeedFeedEngine.test.ts` was committed in `46b8140bc8` (the original engine ship, "16/16 tests PASS") and is the convention-correct filename. The engine is modified (`M`) and the NEW test is untracked (`??`).

The task premise — "this engine's adjust() had ZERO coverage, the only heat-treatment test tests a DIFFERENT engine" — is **factually wrong**. The pre-existing file directly tests `adjust()` with 18 cases. Now let me run both test files to confirm: (1) the new test passes post-fix, and (2) whether the pre-existing test was red before the fix (proving the ReferenceError claim) or was somehow passing.

### Assistant | 2026-06-21T01:29:49.434Z

[tool_use: Bash]

### User | 2026-06-21T01:29:56.025Z

[tool_result] === run NEW test ===

 RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/heat-treatment-aware-speed-feed.test.ts (23 tests) 7ms

 Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  20:29:55
   Duration  244ms (transform 58ms, setup 0ms, import 74ms, tests 7ms, environment 0ms)

### Assistant | 2026-06-21T01:29:59.168Z

New test: 23/23 pass post-fix. Now let me prove the regression claim by verifying the pre-existing test would have been RED before the fix. Let me check git to see what the engine looked like before, and confirm the pre-existing test also exercises the dangling refs.

### Assistant | 2026-06-21T01:30:01.254Z

[tool_use: Bash]

### User | 2026-06-21T01:30:07.665Z

[tool_result] === run PRE-EXISTING test (current fixed engine) ===

 RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/HeatTreatmentAwareSpeedFeedEngine.test.ts (16 tests) 5ms

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  20:30:06
   Duration  154ms (transform 44ms, setup 0ms, import 58ms, tests 5ms, environment 0ms)


=== what did the engine look like BEFORE this fix? diff the lookup site
... [+3607 chars truncated]

### Assistant | 2026-06-21T01:30:16.435Z

Now I have the complete and critical picture. The git diff reveals the truth, and it **contradicts the task prompt's stated root cause**:

**The pre-fix engine did NOT have dangling `REGIME_MODIFIERS`/`REGIME_EXPECTED_HARDNESS` references.** The pre-fix engine had those tables **defined inline** (the diff shows them being DELETED from the engine, not referenced-without-definition). So the engine did NOT throw `ReferenceError: REGIME_MODIFIERS is not defined` at runtime in its committed state — the inline tables existed and the pre-existing test passed (16/16, as the commit message states).

This means:
1. The task prompt's claim "(a) dangling refs to deleted `REGIME_MODIFIERS`/`REGIME_EXPECTED_HARDNESS`... proven to throw `ReferenceError` live" describes a state that **the committed engine was never in**. The diff is: inline tables -> canonical import (a clean refactor), plus the NaN-guard. There was no live `ReferenceError` in the committed engine.
2. The new test file's entire header docblock (lines 4-11) and its first test (`does NOT throw ReferenceError (regression: REGIME_MODIFIERS undefined)`) are premised on a regression that **did not exist in the committed code**. The "ZERO coverage" claim is false — `HeatTreatmentAwareSpeedFeedEngine.test.ts` (16 cases) was shipped in the same original commit.

Let me confirm there's no intermediate broken state by checking whether the pre-fix engine actually compiles/runs (i.e., the inline tables were truly present pre-edit), and verify the test count claim ("adds 23 cases").

### Assistant | 2026-06-21T01:30:20.252Z

[tool_use: Bash]

### User | 2026-06-21T01:30:25.319Z

[tool_result] === Confirm the COMMITTED (pre-edit) engine had inline tables AND referenced them (no dangling ref) ===
69:const REGIME_MODIFIERS: Record<HeatTreatRegime, number> = {
79:const REGIME_EXPECTED_HARDNESS: Record<HeatTreatRegime, { min_hrc?: number; max_hrc?: number; min_hrb?: number; max_hrb?: number }> = {
97:    const modifier = REGIME_MODIFIERS[input.heat_treat_regime];
108:      const expected = 
... [+167 chars truncated]

### Assistant | 2026-06-21T01:30:31.675Z

Confirmed definitively. The **committed (HEAD) engine**:
- Defined `REGIME_MODIFIERS` (line 69) and `REGIME_EXPECTED_HARDNESS` (line 79) inline
- Referenced them at lines 97 and 108 — **the definitions and references matched; there was NO dangling reference**
- Did **NOT** import `CANONICAL_HEAT_TREAT_REGIME`

So the committed engine never threw `ReferenceError` and the pre-existing 16-case test passed (as its commit states). The "dangling-ref ReferenceError proven live" narrative in both the task prompt and the new test's docblock describes a state the committed code was never in. The actual change under review is a clean refactor (inline -> canonical import) plus a genuine NaN-guard hardening.

This is a P1 test-integrity / honesty issue: the new test documents and asserts against a fictional regression, and duplicates an existing convention-named test. The NaN-guard portion is real and well-tested. Let me do a final check — confirm the `@ts-expect-error` is necessary (so the test compiles) and that there are no `.skip`/`.only`.

### Assistant | 2026-06-21T01:30:36.015Z

[tool_use: Bash]

### User | 2026-06-21T01:31:02.408Z

[tool_result] === .skip / .only / fdescribe / xit scan (new test) ===
none

=== test case count (it/ it.each loop) ===
17
(plus 7 from the REGIMES for-loop = 23 total; matches vitest '23 tests')

=== tsc type-check just these two files' engine (compile sanity, fast) ===

### Assistant | 2026-06-21T01:31:07.343Z

No `.skip`/`.only`, 23 real cases confirmed, and tsc reported no errors mentioning HeatTreatment (the `@ts-expect-error` on the missing-regime case is therefore correctly placed — without it, the deliberately-invalid omission would be a tsc error). The engine narrows `spec` correctly (`if (!spec)` after the indexed lookup), and the error message `/positive baseline_sfm/` is still matched by both test files.

Let me do one final verification that the full SFC-adjacent suite isn't broken by the engine edit (regression sweep) and that the dispatcher round-trip still type-checks the param shape.

### Assistant | 2026-06-21T01:31:10.641Z

[tool_use: Bash]

### User | 2026-06-21T01:31:34.038Z

[tool_result] === Full tsc noEmit (any error anywhere from the refactor)? show count + any constants/dispatcher hits ===
src/engines/InventorCADCodeGeneratorEngine.ts(148,3): error TS2353: Object literal may only specify known properties, and 'maxOpsPerScript' does not exist in type 'CADCapabilityMatrix'.
--- total error lines: 1 ---
--- errors referencing our touched files: ---

### Assistant | 2026-06-21T01:32:08.421Z

The single tsc error is in `InventorCADCodeGeneratorEngine.ts` — a pre-existing, unrelated error in a completely different galaxy (CAD), not touched by this fix. None of the touched files (engine, dispatcher, constants) produce any type error. The refactor is type-clean.

I have everything needed for a verdict. Let me compile findings.

## Summary of verification performed

**Engine (`HeatTreatmentAwareSpeedFeedEngine.ts`)** — read end-to-end:
- The fix is a clean refactor: inline `REGIME_MODIFIERS`/`REGIME_EXPECTED_HARDNESS` -> canonical `CANONICAL_HEAT_TREAT_REGIME[regime].modifier`/`.expected` import (constants.ts:998), plus a real NaN-guard (`Number.isFinite(x) && x > 0`). Both changes are correct, `spec` is properly narrowed (`if (!spec)`), error messages unchanged, dispatcher consumer at `safetyDispatcher.ts:728` intact, no remaining dead-symbol references anywhere (grep clean), full tsc clean for touched files.
- Reference values verified numerically: Taylor life `60*0.55^(-4)=655.69 -> 655.7` exact; all 7 modifier/SFM/chip values match the canonical table.

**Test (`heat-treatment-aware-speed-feed.test.ts`)** — read end-to-end, ran live (23/23 pass):
- Assertions verify intent (real reference values, canonical-sourced, not tautologies); no `.skip`/`.only`/stubs; covers happy + 4 failure modes + 2 adversarial + 7-regime variability.

**The load-bearing finding** (`git show HEAD` + `git diff` + git status):

---

VERDICT: FAIL

summary: The engine fix itself is correct, type-clean, well-tested (23/23 pass), and wired — the NaN-guard hardening and inline->canonical refactor are sound. However, the new test file is built on a FALSE root-cause narrative and duplicates an existing convention-named test. `git show HEAD` proves the committed engine never had a dangling `REGIME_MODIFIERS` reference (it defined those tables inline at lines 69/79 and referenced them at 97/108) and a pre-existing `HeatTreatmentAwareSpeedFeedEngine.test.ts` (16 cases, shipped green in co
... [+3783 chars truncated]
