---
type: "chat-session"
source: "claude-code-cli"
session_id: "c0895ba0-2690-4d76-aa1d-08b469017b9b"
title: "Review a React/TSX change in PRISM (slot charlie, quoting frontend, unit U-QP-TR"
date: "2026-06-13"
first_ts: "2026-06-13T20:01:03.471Z"
last_ts: "2026-06-13T20:02:59.458Z"
cwd: "H:\\prism-slot-charlie"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-charlie/c0895ba0-2690-4d76-aa1d-08b469017b9b/subagents/agent-a94c515e85ddd410a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Review a React/TSX change in PRISM (slot charlie, quoting frontend, unit U-QP-TR

> **claude-code-cli** | 2026-06-13 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/c0895ba0-2690-4d76-aa1d-08b469017b9b/subagents/agent-a94c515e85ddd410a.jsonl`

## Transcript

### User | 2026-06-13T20:01:03.471Z

Review a React/TSX change in PRISM (slot charlie, quoting frontend, unit U-QP-TRAINING-STATUS-UI). Read END-TO-END:
1. `H:/prism/mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx` (run `git -C H:/prism --no-pager diff HEAD -- mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx` for the exact change)
2. `H:/prism/mcp-server/web/src/__tests__/QuotingCalibrationHealthPage.test.tsx` (run the diff too)

CONTEXT: A prior commit (7a421d3eb1) added a 6-case test for a `TrainingStatusPanel` but never shipped the panel — leaving 6 failing tests on the trunk (false-completion regression). This change reconstructs the panel from the test contract AND extends it with a `RealWorldMatch` subsection rendering `docustrata_actuals_match` (the $355M / 6,718 real Orders-Closed settled-price ADVISORY signal). All 8 tests now pass (6 original + 2 new). The page fetches `quoting_active_factor_get` + `training_status` via `Promise.all` (independent — one failing must not blank the other).

VERIFY (weight toward integration + UX + state-management, and what a test-focused reviewer misses):
- **Promise.all independence**: a `training_status` failure must not blank the active-factor section, and vice-versa. Trace `refresh()`.
- **R12 honest-empty**: the no-snapshot branch surfaces the reason (never a blank/fake panel). The docustrata `RealWorldMatch` renders ONLY when `dm.advisory` truthy (no fabricated signal when the match did not run).
- **Render-value correctness**: MAPE `toFixed(1)+%`, coverage `%`, `total_predicted.toLocaleString()`, `actual_total_usd` via `Math.round + toLocaleString`, `actuals_priced.toLocaleString()`, `median_ratio.toFixed(2)`. Any NaN/undefined deref under partial snapshots (missing data_source_coverage, missing fields)?
- **getByText exactness risk**: any element whose text could collide / split across child elements and break a future assertion?
- **ASCII-only** in the .tsx (PRISM ascii-guard blocks em-dash/non-ASCII in code files) — confirm no new n
... [+369 chars truncated]

### Assistant | 2026-06-13T20:01:07.195Z

I'll review this React/TSX change end-to-end. Let me start by reading the exact diffs and full file contents.

### Assistant | 2026-06-13T20:01:08.601Z

[tool_use: Bash]

### Assistant | 2026-06-13T20:01:09.172Z

[tool_use: Bash]

### User | 2026-06-13T20:01:10.861Z

[tool_result] diff --git a/mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx b/mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx
index 13e84e2915..3f0bfa63fb 100644
--- a/mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx
+++ b/mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx
@@ -104,6 +104,62 @@ interface ApplyResult {
   fallback_reason?: string;
 }
 
+// Closed-loop training-s
... [+9583 chars truncated]

### User | 2026-06-13T20:01:12.789Z

[tool_result] diff --git a/mcp-server/web/src/__tests__/QuotingCalibrationHealthPage.test.tsx b/mcp-server/web/src/__tests__/QuotingCalibrationHealthPage.test.tsx
index 1bf50192c7..408138ca85 100644
--- a/mcp-server/web/src/__tests__/QuotingCalibrationHealthPage.test.tsx
+++ b/mcp-server/web/src/__tests__/QuotingCalibrationHealthPage.test.tsx
@@ -228,4 +228,44 @@ describe('QuotingCalibrationHealthPage -- traini
... [+2245 chars truncated]

### Assistant | 2026-06-13T20:01:17.196Z

Now let me read both files end-to-end to verify context, conventions, and hidden coupling.

### Assistant | 2026-06-13T20:01:17.688Z

[tool_use: Read]

### Assistant | 2026-06-13T20:01:18.113Z

[tool_use: Read]

### User | 2026-06-13T20:01:18.837Z

[tool_result] 1	/**
2	 * QuotingCalibrationHealthPage — operator view of the live quoting calibration.
3	 *
4	 * Shows: currently-active global + per-customer factors, age + staleness flag,
5	 * MAPE/bias projection (pre vs post), CoV verification result + escalation
6	 * reason, "Apply to a test quote" tool that runs predicted_usd through the
7	 * active-factor loader runtime bridge.
8	 *
9	 * Calls the live M
... [+25511 chars truncated]

### User | 2026-06-13T20:01:19.211Z

[tool_result] 1	// @vitest-environment jsdom
2	/**
3	 * QuotingCalibrationHealthPage.test.tsx -- front-to-back contract test for the
4	 * closed-loop training-status consumer (T5, U-QP-TRAINING-STATUS-ACTION).
5	 *
6	 * WHY this test exists (R9 -- tests verify intent, not behavior):
7	 * The page's TrainingStatusPanel parses a SPECIFIC backend snapshot shape emitted by
8	 * quoting-train-cycle.mjs -> buildTrain
... [+12677 chars truncated]

### Assistant | 2026-06-13T20:01:26.160Z

I have both files end-to-end. Let me verify the key concerns systematically.

**1. Promise.all independence** — `refresh()` (lines 183-207): `Promise.all` resolves both reads, then two independent `if` blocks set `error`/`active` and `trainingError`/`training` separately. Critically, `callQuoting` (lines 32-58) wraps everything in try/catch and **never rejects** — it always resolves to `{ok, data?, error?}`. So `Promise.all` cannot reject. Independence holds in both directions. Verified, and the test at line 203-217 proves the training-fail direction.

**2. R12 honest-empty** — Lines 402-412 surface the reason. The docustrata block (line 470) renders only when `dm && dm.advisory` truthy. Verified.

**3. ASCII check** — Let me verify no non-ASCII was introduced in the diff hunk specifically (the existing file already has em-dashes and the warning glyph, but those predate this change).

### Assistant | 2026-06-13T20:01:28.272Z

[tool_use: Bash]

### Assistant | 2026-06-13T20:01:28.944Z

[tool_use: Bash]

### User | 2026-06-13T20:01:30.008Z

[tool_result] NO non-ASCII in added .tsx lines

### User | 2026-06-13T20:01:31.754Z

[tool_result] NO non-ASCII in added test lines

### Assistant | 2026-06-13T20:01:45.376Z

No new non-ASCII. The added code uses `--` and `->` (ASCII) consistently, avoiding the em-dashes present in the pre-existing code.

**4. Render-value correctness** — checking each formatter against the test assertions and for partial-snapshot NaN/undefined derefs:

- MAPE: `typeof snap.mape_pct === 'number'` guard before `.toFixed(1)` — safe against null/undefined. ✓
- Coverage: `typeof cov?.coverage_pct === 'number'` — `cov?.` optional-chains the parent, so missing `data_source_coverage` is safe. ✓
- Records: `typeof snap.total_predicted === 'number'` then `.toLocaleString()`. ✓
- `actual_total_usd`: `typeof ... === 'number'` then `Math.round + toLocaleString`. ✓
- `actuals_priced`: `typeof ... === 'number'` then `.toLocaleString()`. ✓
- `median_ratio`: `typeof ... === 'number'` then `.toFixed(2)`. ✓
- consumed/available: `cov?.consumed_count ?? 0` / `cov?.available_count ?? 0` — safe under missing `data_source_coverage` (renders `0/0`). ✓

All numeric derefs are type-guarded. No NaN/undefined deref path exists under partial snapshots.

**5. getByText exactness / text-splitting risk** — Let me examine the test assertions against actual DOM structure for collision risk.

The key concern: `screen.getByText('2/3 sources consumed')` at test line 142. In the source (lines 439-448), that text is inside a `<span>` with `{cov?.consumed_count ?? 0}/{cov?.available_count ?? 0} sources consumed`. React renders this as multiple text nodes within one span: `"2"`, `"/"`, `"3"`, `" sources consumed"`. `getByText` with a string normalizes whitespace and matches against the element's full text content — this works for the default `getByText` because testing-library matches the element whose **normalized text** equals the string when children are text nodes. This passes (the test is the existing one and presumably green), so I'll confirm the suite actually passes rather than theorize.

Let me verify the docustrata `actual_total_usd` rounding: `297030689.93775` → `Math.round` = `2970
... [+262 chars truncated]

### Assistant | 2026-06-13T20:01:46.484Z

[tool_use: Bash]

### User | 2026-06-13T20:01:50.632Z

[tool_result] [1m[46m RUN [49m[22m [36mv4.0.18 [39m[90mH:/PRISM/mcp-server/web[39m

 [32m✓[39m src/__tests__/QuotingCalibrationHealthPage.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[32m 146[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m   Start at [22m 15:01:49
[2m   Duration [22m 942ms[2m (tr
... [+76 chars truncated]

### Assistant | 2026-06-13T20:02:06.055Z

All 8 tests pass (6 original + 2 new). Now let me verify a couple of subtle integration concerns the test suite cannot catch.

**6. Function hoisting** — `TrainingStatusPanel` (line 397) references `KV` (line 564), `RealWorldMatch` (line 478), and `Panel` (line 385), all `function` declarations defined later in the module. Function declarations are hoisted, and these are referenced at render-call time (not module-eval time), so this is valid. ✓

**7. `RealWorldMatch` reuse for `real_distribution_match`** — Line 473 renders `rm` via `RealWorldMatch` without `showDollars`, so `actual_total_usd`/`actuals_priced` are not rendered for that branch. But `rm` (real_distribution_match) type has `reference_reliable`/`reliability_verdict` fields not surfaced. Let me check whether that's a dead-data concern or intentional. The `RealWorldMatch` prop type (lines 484-490) only declares the 5 shared fields, and `rm` is passed in — `real_distribution_match` has `reference_reliable`, `reliability_verdict`, `advisory` which aren't in the prop type. TypeScript structural typing: passing a wider object to a narrower prop is fine (excess properties allowed when passing a variable). Not a bug, just unsurfaced advisory metadata — a P3 at most, not P0/P1.

**8. Potential getByText collision between the two RealWorldMatch instances** — Both `dm` and `rm` render a "Verdict" KV and "Median ratio" KV. If both blocks render simultaneously, `getByText('under-quoting')` could match two nodes and throw. But in the docustrata test (line 232), the snapshot has no `real_distribution_match` (trainingOk default omits it), so `rm` is undefined and that branch doesn't render. No collision in the test. However, this is a latent integration risk worth noting: when BOTH `docustrata_actuals_match.advisory` and `real_distribution_match.verdict` are present and share a verdict value (e.g. both "calibrated"), a future single-value `getByText` assertion would break — but the current tests don't do this, and the l
... [+873 chars truncated]

### Assistant | 2026-06-13T20:02:07.555Z

[tool_use: Bash]

### Assistant | 2026-06-13T20:02:08.980Z

[tool_use: Bash]

### User | 2026-06-13T20:02:10.580Z

[tool_result] src/App.tsx:94:const QuotingCalibrationHealthPage = lazyNamed(() => import('./pages/QuotingCalibrationHealthPage'), 'QuotingCalibrationHealthPage');
src/App.tsx:291:              <Route path="quoting-calibration-health" element={lazyElement(<QuotingCalibrationHealthPage />)} />

### User | 2026-06-13T20:02:38.946Z

[tool_result] NO tsc errors referencing QuotingCalibrationHealthPage

### Assistant | 2026-06-13T20:02:59.458Z

The page is wired into `App.tsx` routing (lazy-loaded named export at line 94, mounted at route `quoting-calibration-health` line 291), and `tsc --noEmit` reports no type errors referencing this file. The change exports both the named `QuotingCalibrationHealthPage` (line 167, consumed by `lazyNamed`) and a default (line 587).

All concerns verified. Here is my review.

---

## Code Review: U-QP-TRAINING-STATUS-UI

**Files reviewed end-to-end:**
- `H:/prism/mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx`
- `H:/prism/mcp-server/web/src/__tests__/QuotingCalibrationHealthPage.test.tsx`

### Verification results

**Promise.all independence (PASS)** — `refresh()` (`QuotingCalibrationHealthPage.tsx:183-207`): `callQuoting` (`:32-58`) is wrapped in try/catch and *always resolves* to `{ok,data?,error?}`, never rejects, so `Promise.all` (`:188-191`) cannot reject. The two result objects feed two independent `if` blocks (`:194-199` active-factor, `:201-206` training). A failure in either leaves the other's state untouched. Proven by the test at `:203-217` (training transport-fails, `LOADED` still renders).

**R12 honest-empty (PASS)** — No-snapshot branch (`:402-412`) surfaces `payload?.reason ?? trainingError ?? 'unknown'` plus the remediation command; never a blank/fake panel. The docustrata `RealWorldMatch` gates on `dm && dm.advisory` (`:470`) — no fabricated signal when the match did not run. Test `:262-270` confirms absence.

**Render-value correctness (PASS)** — Every numeric formatter is type-guarded with `typeof x === 'number'` before `.toFixed`/`.toLocaleString`/`Math.round`: MAPE (`:429`), coverage (`:430`, `cov?.` optional-chains the missing-parent case), records (`:431`), `actual_total_usd` (`:503-504`), `actuals_priced` (`:506-507`), `median_ratio` (`:502`). consumed/available use `?? 0` (`:440`). No NaN/undefined deref path exists under partial snapshots. `297030689.93775 -> Math.round -> 297,030,690` and `0.4 -> "0.40"` match test assertions exactly.
... [+1576 chars truncated]
