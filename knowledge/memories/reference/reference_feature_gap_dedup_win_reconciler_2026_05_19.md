---
name: reference_feature_gap_dedup_win_reconciler_2026_05_19
description: 2026-05-19 india U-FEATURE-GAP-DEDUP-WIN-RECONCILER — META tool that auto-classifies FEATURE-GAP-AUDIT-MS0 units against codebase reality. 68 units → 8 DEDUP-WIN + 9 PARTIAL-NO-TESTS + 1 PARTIAL-PORT-ONLY + 13 GENUINE-GAP + 8 BATCH-WIRE + 29 UNKNOWN.
metadata:
  type: reference
---

2026-05-19 india `claude-82514795` commit `87a62f1c2b`: shipped META audit-rot reconciler. Pure classifier + real-fs CLI + real-data E2E oracle in 1448 LOC across 4 files (`scripts/lib/feature-gap-classifier.{mjs,test.mjs}`, `scripts/feature-gap-dedup-win-reconciler.{mjs,e2e.test.mjs}`). Tests: 47/47 (36 hermetic + 11 real-data E2E).

**Why:** the juliett /forge-audit-v2 2026-05-17 named 68 GAP units; R8 inspection by multiple slots since (delta /loop 2026-05-18 [[reference_feature_gap_audit_cad_dedup_wins_2026_05_18]] + india /loop this session) found that many "unwired" / "digest=0, absent" claims are stale — engines named are already on disk, wired, and tested. This META tool processes the whole audit in one pass so operators don't redo R8 per-unit.

**How to apply:**
- Run `node scripts/feature-gap-dedup-win-reconciler.mjs` to refresh the ledger after BUILD_STATE / atomic-roadmap updates.
- DEDUP-WIN verdicts (8 in first run) are eligible for close-out via `scripts/close-out-milestone.mjs` after human-verifying spec correctness (advisory + mustHumanVerify gate).
- PARTIAL-NO-TESTS / PARTIAL-NO-WIRING / PARTIAL-PORT-ONLY verdicts name the real gap — rescope the audit unit to the actual missing piece, not the imaginary port.
- GENUINE-GAP verdicts confirm the audit was right; treat as real ports.
- UNKNOWN verdicts (29 in first run) need human triage — title prose outside audit conventions.

**Lessons:**
1. **R8 dedup-preflight at audit scale.** Auditor-emitted unit titles drift quickly when the repo is being actively re-modularized. A META reconciler turning per-unit R8 into a single classifier pass pays compounding dividends — once for THIS audit, plus reusable for future ones.
2. **Word-boundary matching is the entire ballgame for false-positive avoidance.** The first implementation used substring-match for `findTestFiles` and `countDispatcherRefs`. Live run produced 13 DEDUP-WINs. The 2-agent scrutiny pass flagged this as P0 — caught 5 false-positives. Post-fix: 8 real DEDUP-WINs + 9 correctly-named PARTIAL-NO-TESTS. The 5 the loose matcher would have closed out had real test-coverage gaps the operator needed to know about.
3. **Pure-core + injected-deps MUST ship a real-data E2E** ([[reference_u_dispatcher_2026_05_16]] / [[reference_fleet_reaper_ms1]] lesson). Hermetic `fakeFs` proved the classifier logic but couldn't catch the substring-match bug or the JMDIE acronym-split shape. The 11-case real-data E2E anchored on `BackplotEngine` / `RLPostProcessorEngine` / `JMDieProgramLearningEngine` / `OkumaRunLogParserEngine` is the load-bearing oracle.
4. **Real PRISM engine naming has 4+ conventions per token.** `PRISM_FFT_X` → `FFTXEngine` OR `FftXEngine` OR `XEngine`. `PRISM_JMDIE_X` → `JMDieXEngine` (2-prefix-split). The combinator emits drop-prefix × acronym-preserve × 2-prefix-split for every suffix. Cost: ~10 candidates per unit × Map.get lookup — negligible.
5. **Per-file 2-reviewer gate finds different things from the 3-of-3 Stop gate.** Per-file caught the composite-PRISM parse gap (real-data finding: 9/32 units use this shape). Reviewers grading IN ISOLATION on the new file with the spec in front of them is a different attention budget than end-of-task arms reviewing a diff.

**Live ledger:** `state/shared/specs/FEATURE-GAP-DEDUP-WIN-LEDGER.{json,md,html}` — regenerate via the tool. Advisory + mustHumanVerify; operator close-out still requires spec verification.

**Shared-tree commit race:** the peer chat `claude-396bc735` was also working FEATURE-GAP-DEDUP-WIN-LEDGER paths this session — the ledger files were unstaged by their file-claim guard. Committed source-only at `87a62f1c2b`; ledger output committed separately to avoid the race. Same class as [[reference_cross_chat_commit_misattribution_2026_05_18]].

Related: [[reference_feature_gap_audit_cad_dedup_wins_2026_05_18]], [[feature-gap-audit-2026-05-17]], [[feedback_prioritize_devtools_backend]].
