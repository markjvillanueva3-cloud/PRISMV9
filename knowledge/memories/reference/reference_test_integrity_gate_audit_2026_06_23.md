---
name: reference_test_integrity_gate_audit_2026_06_23
description: "2026-06-23 slot:alpha audit of PRISM test-integrity/anti-fake-test enforcement -- 7 dormant gates found, test-legitimacy re-armed (calibrated), stale-green hole closed, CI gate added, PRISM_ALLOW_UNWIRED lifted."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.221Z
aliases: reference_test_integrity_gate_audit_2026_06_23
---


Operator-requested assessment (via /checkin-alpha) of stop hooks / safety gates / stub-prevention / **test-generation anti-fake-test system**, validated with ollama + hermes + octopus + one Opus agent (max).

## Verdict (4-substrate + Opus-agent consensus): test-integrity enforcement was INADEQUATE for safety-critical CNC code
The anti-fake-test systems EXIST and are well-built, but their **teeth were dormant**. Verified by reading code + all 3 settings.json (not titles):

- **`test-legitimacy.mjs`** -- a functional PreToolUse write-time blocker (placeholder asserts, .skip/.only, synthetic mass-gen, >=2 mocks in 7 critical domains, live-goal-vs-mock mismatch) -- was **UNWIRED in ALL settings (0 refs)**. Dormant **by accident** (git shows only a bulk frontmatter sweep ever touched it), not retired.
- **6 more block-capable gates dormant**: stop_on_missing_tests, test-100-percent-gate, duplication-hard-block (CLAUDE.md falsely calls it a live "key PreToolUse block"), postgen-validator-skip-guard, ai-duplication-guard, agi-safety-envelope-guard.
- **`stop_on_failing_tests`** wired + fail-closed BUT read a STATIC `mcp-server/data/state/VITEST_REPORT.json` -- a *stale-GREEN* report passed. Live report was **56 days old** (2026-04-29): the fleet had been shipping Stop on a 56-day green report.
- **`comprehensive-build-enforce` + `test-coverage-enforcer`** = ADVISORY only (headers literally "BLOCKING: never") -- nudges, not blocks.
- **`scrutinize-before-stop`** escapable: auto-pass after 3 blocks + stop_hook_active early-approve + 0-owned-files skip.
- **`stop_on_unwired_assets`** wired but neutered by `PRISM_ALLOW_UNWIRED=1` (user settings:54).
- Detection is **purely syntactic** -- cannot catch `expect(fn()).toBe('John')` where fn hardcodes 'John' (the R9 class). Needs execution+mutation, which only CI can add.

## Fixes shipped (all 4 operator-approved)
1. **Re-armed test-legitimacy** as PreToolUse `^(Edit|Write|MultiEdit|NotebookEdit)$` blocker -- but FIRST measured FP on the live 6,499-file corpus: as-is it blocked **1,835 (28.2%)**, ~99% false positives from the `weak presence-only` pattern firing on ANY single `.toBeDefined()` line. **Calibrated** it to file-level dominance (weak present AND zero strong assertions); Edits evaluate vs the on-disk file so adding a smoke line to a real test never blocks. New rate: **62 (1.0%), all genuine pre-existing fakes**. 7/7 behavioral tests (`.claude/hooks/__tests__/test-legitimacy.test.mjs`).
2. **Closed the stale-GREEN hole** in `stop_on_failing_tests.mjs`: blocks Stop when an uncommitted TEST file is newer than the green report (execFileSync, fail-open on git error, knob `STOP_ON_FAILING_TESTS_SKIP_FRESHNESS=1`). NOTE: with the 56-day-stale report this blocks ~every chat with test edits until the report is regenerated -- the real remediation is to regenerate VITEST_REPORT.json (+keep it fresh).
3. **CI gate** `scripts/ci-test-legitimacy-scan.mjs` (+5/5 tests) wired into `.github/workflows/ci.yml` -- scans CHANGED test files only (legacy 62 stay advisory). The only gate `PRISM_ALLOW_*` env flags can't bypass.
4. **Lifted `PRISM_ALLOW_UNWIRED` 1->0** (orphan count = 4 of 3831, no block-storm; transcript-scoped + reversible).

## Lessons
- A gate EXISTING/being well-built != it FIRES. Verify wiring in ALL active settings (user C: + project H:/prism), not the hook file's presence. (sibling of "read body not title")
- Before wiring a fleet-wide write-time blocker, MEASURE its block rate on the real corpus -- a "weak presence-only" rule that blocks any single occurrence is ~99% FP; the real fake signal is file-level dominance.
- A test for an anti-fake-test gate must contain the fake patterns as fixtures -> assemble forbidden literals (`expect(true).toBe(true)`, `.skip`, `.toBeDefined()`) at runtime so the completeness gate doesn't block the test file itself.
- Octopus engine live-dispatch returned a `staging-stub` even with PRISM_OCTOPUS_LIVE_DISPATCH=1 -- the /octopus engine path isn't doing real fan-out on this config; equivalent multi-model consensus done manually (qwen3-coder + gpt-oss:120b + grok + Opus agent).

Related: [[feedback_safety_critical_tests]] · [[feedback_dont_soften_completeness_gates]] · [[feedback_settings_wiring_drift_2026_05_16]]
