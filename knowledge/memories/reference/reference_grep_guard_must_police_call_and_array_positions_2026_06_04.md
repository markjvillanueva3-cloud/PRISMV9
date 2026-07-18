---
name: reference_grep_guard_must_police_call_and_array_positions_2026_06_04
description: "An anti-revert / string-scanning grep guard must police call-arg `(` and array-literal `[` positions, not just `=`/`:`/`??`/`||` — else a `.default(\"<banned>\")` or `[\"<banned>\"]` slips silently."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.601Z
aliases: reference_grep_guard_must_police_call_and_array_positions_2026_06_04
---


**Bug class (found by scrutiny arm-C, 2026-06-04, slot:alpha, U-BW-TS-ENGINES-RETIRE-2):**
`scripts/no-retired-llm-refs.test.mjs` is the source-lock that fails when any executable code re-introduces a deleted Ollama model tag. Its first matcher only policed `=` / `??` / `||` / `:` immediately before the quoted tag. That missed two equally load-bearing positions:

- **`(` open-paren** — `z.string().min(1).default("qwen2.5-coder:7b")` and `pull("deepseek-r1:14b")`. A live `.default()` to a *deleted* model was sitting in `OllamaContextFloorEngine.ts` and the guard called itself green while a caller omitting `model` would cold-fail. The guard's own header CLAIMED "nothing in the codebase will route to it while this test is green" — a false guarantee.
- **`[` array-literal** — `existing: ["qwen2.5-coder:7b", ...]`. Adding the `[` arm immediately caught a real stale `multi_model_stack` in `extend-intel-envelope-v3.mjs` (declared deepseek-r1:14b as PRIMARY reasoning), which a re-run could have re-pulled.

**Fix:** widen the alternation to `(?:=|\?\?|\|\||:|\(|\[)` and **prove it with a discrimination test** — export an `isViolation(line)` helper and assert it FIRES on all executable positions AND stays SILENT on comments (`//`/`*`/`#`), bare array elements (`"x",` with no preceding operator), the kept floor model, and prose. A SCAN_DIRS/coverage extension shipped with no positive test is an untested invariant (R9, arm-B finding).

**Generalizable doctrine:** any grep/regex guard that means "no code references X" must enumerate EVERY executable position X can sit in — assignment, object-key, nullish/OR fallback, **call-arg / `.default(...)`**, **array literal** — and a positive+negative unit test must prove the matcher's discrimination, or the guard is silently bypassable. The historical fact that the guard "once caught something" is not in-code proof.

**Residual (honestly deferred):** the `,` comma-position (2nd+ array element, `, "<banned>"`) is still uncovered — deferred to avoid an unbounded fix-loop at high context; flagged in commit body + handoff. The `[` arm only catches the FIRST array element.

Commits: `fc9038ca2a` (retirement) + `8e2b2500c6` (scrutiny-fix + widen + test). Related: [[feedback_always_capture_lessons]], [[feedback_always_update_wiki_on_bug_finding]], [[reference_blackwell_model_retirement_2026_06_04]].
