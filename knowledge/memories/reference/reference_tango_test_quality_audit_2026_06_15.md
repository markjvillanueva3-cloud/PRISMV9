---
name: reference_tango_test_quality_audit_2026_06_15
description: tango extended stub-class-audit-tobedefined.mjs with skipped/focused/assertion-free dims + stripCode FP guard; found 5 files/~17 silently-skipped tests. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.220Z
aliases: reference_tango_test_quality_audit_2026_06_15
---


**TANGO TEST-ASSERTION-QUALITY AUDIT (slot tango, 2026-06-15, commit `e2292fdee1`)** — autonomous high-ROI build under "keep pushing through with crons and harnessed loops to build and wire autonomously" + standing [[feedback_always_build_high_roi_order]].

**Dedup law WORKED:** the planned "test-assertion-quality scanner" was a near-duplicate of the EXISTING `scripts/stub-class-audit-tobedefined.mjs` (catches `toBeDefined()`-only stubs). Verify-on-disk + memory recall ([[reference_bravo_stub_hunter_scripts]]) caught it BEFORE building a parallel tool. **EXTENDED the existing one** (anti-sprawl) instead of rebuilding — the correct move.

**Added 3 R9/R12 dimensions** it did not cover + `--quality`/`--json` CLI + `scanQuality()` tree walk over FULL `mcp-server/src` (was central `__tests__` only) + REPO derived from script location (dropped hardcoded `H:/prism`): **skipped** (`it/test/describe.skip`, `.todo`, `xit/xdescribe` — R12 "a `.skip` reports green but never runs"), **focused** (`.only` — silently disables siblings), **assertion-free** (active `it()` block, zero `expect`/`assert`).

**LIVE FINDING (verified-on-disk):** 5 files / ~17 genuinely-skipped tests, biggest `lathe-orchestration.test.ts` = 11 `describe.skip` blocks (MACHINE_READINESS/EMERGENCY_RECOVERY/PROVE_OUT, lines 500/573/654). stubOnly=0, focused=0, assertionFree=0. Routed advisory to **whiskey (lathe)** — likely intentional (unbuilt features) but each skip must be confirmed-or-deleted, not left ambiguous.

**TWO FP CLASSES found ON LIVE DATA + fixed before shipping (R12 — never ship a detector known to mis-fire):** (1) Jasmine `fit()`/`fdescribe()` aliases collided with curve-`fit()`/`model.fit()` (CPK surrogate, ArcFitting, Weibull, regression → 13 false focused hits) — dropped (vitest/node:test have no `fit`/`fdescribe`); (2) focus/skip markers inside test-FIXTURE strings (`GapPredictorEngine`, `CounterfactualBuildSimulator` carry them as test INPUT data) + comments — fixed with `stripCode()` single-pass scanner blanking string/comment CONTENTS (delimiters kept, so `describe.skip("title")` still matches but `"it.only(...)"`-as-data doesn't). **Lesson: a code-pattern auditor MUST strip strings+comments or it fires on its own test fixtures.** 34/34 node:test PASS. scan()/isStubTest() untouched (backward compat). Report: `state/shared/specs/TANGO-ENGINE-ALGO-ASSESSMENT-2026-06-15.md` §Test-assertion quality. Sister: [[reference_tango_engine_algo_assessment_2026_06_15]].
