---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Review a 3-file token-efficiency change (U-WIKI-TRIBAL-DEDUP) in the PRISM repo "
date: "2026-06-10"
first_ts: "2026-06-10T17:57:27.588Z"
last_ts: "2026-06-10T18:00:05.412Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 10
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-ad47d4cbce8be87f8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Review a 3-file token-efficiency change (U-WIKI-TRIBAL-DEDUP) in the PRISM repo 

> **claude-code-cli** | 2026-06-10 | 26 msgs (10 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-ad47d4cbce8be87f8.jsonl`

## Transcript

### User | 2026-06-10T17:57:27.588Z

Review a 3-file token-efficiency change (U-WIKI-TRIBAL-DEDUP) in the PRISM repo at H:/prism. Read each file END-TO-END and grade PASS/FAIL with P0/P1/P2 findings.

CONTEXT: Two SessionStart hooks both render wiki↔tribal coverage blocks every session — `wiki-tribal-coverage-inject.mjs` (GLOBAL headline + a "Top N missing" file list) and `wiki-tribal-coverage-per-domain-inject.mjs` (per-domain worst-N, with actionable samples). The change makes the GLOBAL hook DROP its redundant "Top N missing" list when the per-domain sibling will render, keeping its unique headline. Quality-preserving: when per-domain is stale/disabled/empty, the global samples are KEPT (no regression). Default ON; `PRISM_WIKI_TRIBAL_DEDUP=0` restores legacy.

FILES:
1. H:/prism/.claude/hooks/wiki-tribal-coverage-inject.mjs  — added: import of sibling's pure fns (loadReport/pickWorst/DEFAULT_THRESHOLD/DEFAULT_STALE_HRS/REPORT_PATH), `perDomainWillRender(reportPath, nowMs)` predictor, `opts.suppressSamples` in formatDigest, wiring in main() with PRISM_WIKI_TRIBAL_DEDUP knob.
2. H:/prism/.claude/hooks/wiki-tribal-coverage-per-domain-inject.mjs — added: `export` keyword on the existing REPORT_PATH const (single-source the path).
3. H:/prism/.claude/hooks/wiki-tribal-coverage-inject.test.mjs — added: 7 tests (suppressSamples on/off + perDomainWillRender true/above-threshold/missing/stale/sibling-disabled).

VERIFY SPECIFICALLY:
- No circular import / side-effect on module load (sibling's I/O is under its own __isMain guard).
- perDomainWillRender honors the SAME knobs the sibling honors (INJECT=0, THRESHOLD, STALE_HRS) so the prediction can't diverge from the sibling's actual gate — and fail-safe returns false (keep samples) on ANY error.
- formatDigest stays PURE (no I/O); the I/O prediction is in main() only.
- No quality regression: headline + footer always preserved; samples only dropped when sibling definitely renders.
- Tests are real (R9) — assert behavior, not stubs.
Tests already pass 29/29; li
... [+120 chars truncated]

### Assistant | 2026-06-10T17:57:33.065Z

I'll review this 3-file change end-to-end. Let me start by reading all three files plus the sibling hook (since the change imports from it).

### Assistant | 2026-06-10T17:57:34.048Z

[tool_use: Read]

### Assistant | 2026-06-10T17:57:34.496Z

[tool_use: Read]

### Assistant | 2026-06-10T17:57:34.916Z

[tool_use: Read]

### User | 2026-06-10T17:57:36.602Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * .claude/hooks/wiki-tribal-coverage-inject.mjs
4	 *
5	 * SessionStart hook — surfaces wiki↔tribal coverage drift from
6	 * `state/shared/.wiki-tribal-cross-ref-audit.json` (producer:
7	 * scripts/wiki-tribal-cross-ref-audit.mjs, iter-7 echo /loop /goal synergy).
8	 *
9	 * Iter 8 of the /goal synergize loop (echo, 2026-05-21). Producer/consumer
10	 * pair after iter-
... [+10524 chars truncated]

### User | 2026-06-10T17:57:37.064Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * .claude/hooks/wiki-tribal-coverage-per-domain-inject.mjs — U-VICTOR-A2
4	 *
5	 * SessionStart sibling of `wiki-tribal-coverage-inject.mjs` (echo iter-8).
6	 * Parent hook surfaces the GLOBAL coverage gap; this one surfaces the
7	 * **worst per-domain** gaps so a slot whose work-area is ORANGE-tier (e.g.
8	 * shop-floor at 50%) sees it without having to manually run
... [+6403 chars truncated]

### User | 2026-06-10T17:57:37.447Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for wiki-tribal-coverage-inject.mjs (/goal synergy iter 8, echo).
4	 *
5	 * Coverage:
6	 *   - loadAudit:       valid JSON, missing/corrupt/wrong-shape/zero-size
7	 *   - coverageGap:     valid coverage, missing/non-finite, out-of-range clamp
8	 *   - pickTopMissing:  empty/null, K clamped [0,20], non-string entries safe
9	 *   - formatDigest:    below-thresh
... [+12516 chars truncated]

### Assistant | 2026-06-10T17:57:49.358Z

I have all three files. Now let me verify the specific concerns the prompt raised. The most important is whether `perDomainWillRender` actually honors the SAME knobs the sibling uses — particularly the TOPK knob, and whether `pickWorst`'s `Math.max(1, topK)` floor creates a divergence. Let me check the producer/sibling gate logic carefully.

First, a critical concern: the sibling's actual gate uses `PRISM_WIKI_TRIBAL_PER_DOMAIN_TOPK` (default 3), but the predictor hardcodes `3` and never reads that knob. Let me check whether that matters and whether there's a `Math.max(1, topK)` divergence on the threshold-pass.

### Assistant | 2026-06-10T17:57:50.745Z

[tool_use: Grep]

### Assistant | 2026-06-10T17:57:51.951Z

[tool_use: Bash]

### User | 2026-06-10T17:57:53.432Z

[tool_result] .claude\hooks\wiki-tribal-coverage-per-domain-inject.mjs:23: *   PRISM_WIKI_TRIBAL_PER_DOMAIN_TOPK=N        — top-K worst surfaced (default 3)
.claude\hooks\wiki-tribal-coverage-per-domain-inject.mjs:148:  const topK = envNum("PRISM_WIKI_TRIBAL_PER_DOMAIN_TOPK", DEFAULT_TOPK);

### User | 2026-06-10T17:57:58.638Z

[tool_result]   ...
# Subtest: perDomainWillRender: stale report -> false
ok 28 - perDomainWillRender: stale report -> false
  ---
  duration_ms: 1.0409
  ...
# Subtest: perDomainWillRender: PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT=0 -> false (sibling disabled)
ok 29 - perDomainWillRender: PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT=0 -> false (sibling disabled)
  ---
  duration_ms: 1.0105
  ...
1..29
# tests 29
# suites 0

... [+76 chars truncated]

### Assistant | 2026-06-10T17:58:08.884Z

29/29 pass. Now let me reason about the TOPK divergence concern carefully. The predictor uses `pickWorstDomains(loaded.report.byDomain, threshold, 3)` with hardcoded K=3, while the sibling main() uses `envNum("PRISM_WIKI_TRIBAL_PER_DOMAIN_TOPK", DEFAULT_TOPK)`.

Let me analyze whether this can cause a divergence between the prediction (`.length > 0`) and the sibling's actual render decision. The sibling renders iff `pickWorst(...).length > 0`. The predictor checks `pickWorst(..., 3).length > 0`. The key question: can K differ change whether the result is empty vs non-empty?

Looking at `pickWorst`: it filters first (threshold + wikiFiles>0), sorts, then `.slice(0, Math.max(1, topK))`. With `Math.max(1, topK)`, even `topK=0` yields slice(0,1). So if ANY domain passes the filter, the slice is non-empty for any topK≥0 (since max(1,...) floors at 1). Therefore `.length > 0` is invariant to topK — it depends only on whether the filtered set is non-empty. So hardcoding K=3 vs reading the knob does NOT change the boolean prediction. Good — no divergence there. Let me verify there are no other render-gate inputs the sibling honors that the predictor misses, and check the `Math.max(1, topK)` edge plus a subtle stale-comparison difference.

### Assistant | 2026-06-10T17:58:18.709Z

[tool_use: Bash]

### User | 2026-06-10T17:58:27.299Z

[tool_result] sibling render topK=0: true
sibling render topK=99: true
predictor (hardcoded 3): true
boundary cov===0.5 sibling: false predictor: false
stale-exact sibling render: true
stale-exact predictor: false

### Assistant | 2026-06-10T17:58:31.758Z

Confirmed the topK-invariance and threshold-boundary parity. The last line shows a stale-boundary mismatch but my test harness constructed `nowMs` wrong (the `Date.now() - ageExact + Date.now()` is nonsense). Let me redo the stale-boundary comparison cleanly to determine if there's a real divergence at the exact stale boundary.

### Assistant | 2026-06-10T17:58:38.704Z

[tool_use: Bash]

### User | 2026-06-10T17:58:46.372Z

[tool_result] predictor at exact ceiling (renders?): true
sibling ageMs: 604800000 ageHrs: 168
sibling at exact ceiling (renders?): true
predictor 1ms past (renders?): false
sibling 1ms past (renders?): false

### Assistant | 2026-06-10T17:58:53.064Z

Stale boundary is in exact parity (both use strict `>`). Both predictor and sibling agree at the exact ceiling (render) and 1ms past (silent). The predictor faithfully mirrors the sibling's gate.

Now let me verify the two remaining concerns: (1) no module-load side effect from the import (the sibling's I/O is under `__isMain`), and (2) the live A/B claim. Let me also confirm `pickWorst`'s `Math.max(1, topK)` doesn't cause a quality regression in the SIBLING itself (since the sibling reads the real topK knob, `Math.max(1,...)` means topK=0 would still show 1 domain — but that's the sibling's pre-existing behavior, unchanged by this commit).

### Assistant | 2026-06-10T17:59:01.010Z

[tool_use: Bash]

### User | 2026-06-10T17:59:09.531Z

[tool_result] captured-on-import: ""
side-effect-free: true
---A/B---
DEDUP ON (default):
bytes=291 hasTop=false hasHeadline=true
DEDUP OFF (legacy):
bytes=467 hasTop=true hasHeadline=true

### Assistant | 2026-06-10T17:59:16.385Z

All concerns verified against live behavior:

- **Import is side-effect-free** — importing the global hook captured zero stdout (sibling main() correctly gated behind `__isMain`).
- **Live A/B confirmed** — DEDUP ON = 291B (no "Top" list, headline kept); DEDUP OFF = 467B (Top list present, headline kept). Both retain the headline; only the redundant list is dropped under dedup. (My numbers differ from the prompt's 552B→372B because the on-disk report changed since the prompt was written, but the behavior — drop list, keep headline+footer — matches exactly.)

Let me confirm one last thing: that the per-domain block is actually rendering live right now (so the dedup is correctly predicting a live render, not a false suppression), and check the footer is retained in the dedup-ON output.

### Assistant | 2026-06-10T17:59:20.573Z

[tool_use: Bash]

### User | 2026-06-10T17:59:26.175Z

[tool_result] === per-domain sibling live render? ===
RENDERS (543B)
=== dedup-ON full output (footer check) ===
## 📚 Wiki↔Tribal coverage (8h old)
   ⚠ **13,228** of 42,941 wiki files lack tribal embedding — coverage **69.2%** · 10 stale tribal entries.
   _Re-embed via tribal-index regen. Full report: `state/shared/.wiki-tribal-cross-ref-audit.json`. Disable: `PRISM_WIKI_TRIBAL_INJECT=0`._

### Assistant | 2026-06-10T18:00:05.412Z

The closed loop is proven live: the sibling per-domain hook IS rendering (543B), the predictor correctly returns true, and the global hook drops its sample list while retaining both the headline and the footer. No false suppression. The dedup is exactly correct: samples dropped only because the per-domain block genuinely renders this session.

I have everything needed to grade. Final analysis below.

---

## Code Quality Analysis Report

### Summary
- **Overall Quality Score: 9/10**
- **Files Analyzed: 3** (+ 1 sibling read for cross-reference)
- **Issues Found: 3** (0 P0, 0 P1, 3 P2)
- **Grade: PASS**

This is a clean, surgical, well-disciplined token-efficiency change. Every claim in the prompt verified true against live execution. The design (predict-the-sibling-and-suppress, fail-safe to legacy) is correct, and the parity between the predictor and the sibling's real gate holds at every boundary I tested.

### Critical Issues
None.

### Verification of the stated concerns (all PASS)

1. **No circular import / module-load side-effect** — VERIFIED. Importing `wiki-tribal-coverage-inject.mjs` captured **zero stdout** (`side-effect-free: true`). The sibling's I/O + `emit()`/`process.exit()` are fully behind its `__isMain` IIFE guard (`per-domain:143`), so the import pulls only pure exports. No circular dependency (the sibling imports nothing from the global hook).

2. **Predictor honors the SAME gate as the sibling, fail-safe on error** — VERIFIED with boundary tests:
   - `INJECT=0` short-circuit → `false` (`inject:163`), matches sibling `:145`.
   - THRESHOLD / STALE_HRS knobs read with the same empty-string-vs-undefined discipline as the sibling, falling back to the sibling's exported `PD_THRESHOLD`/`PD_STALE_HRS` defaults (`inject:166-171`).
   - **Threshold boundary**: `coverage === 0.50` → both exclude (sibling `false`, predictor `false`) — the sibling's `pickWorst` uses `coverage >= threshold` exclusion, and the predictor calls the *same* `pickWorst`, so they 
... [+4861 chars truncated]
