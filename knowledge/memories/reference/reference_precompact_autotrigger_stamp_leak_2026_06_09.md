---
name: reference_precompact_autotrigger_stamp_leak_2026_06_09
description: "Flaky-test bug — precompact-auto-trigger.test.mjs leaked per-session dedup markers (fixed sids, no cleanup) → failed on every run after the first → fleet-wide stop_on_failing_tests hazard. Fixed with scoped cleanTestMarkers (05e3c45196)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.120Z
aliases: reference_precompact_autotrigger_stamp_leak_2026_06_09
---


# precompact-auto-trigger flaky test — leaked dedup-stamp (05e3c45196)

**Found** while validating U-PRECOMPACT-MEMORY-SEED (2026-06-09, slot:alpha): the
unrelated `precompact-auto-trigger.test.mjs` showed 13/14 — initially looked like
my edit regressed it, but the test has **zero reference** to my file and HEAD
(without my edit) also failed 13/14. Decisive isolation: `git stash` my file →
still 13/14 → exonerated.

**Root cause.** `precompact-auto-trigger.mjs` writes per-session dedup markers
(`precompact-auto-soft-fired-<sid>.marker` + `precompact-pending-<sid>.marker`)
to a **hardcoded** shared `CACHE_DIR = H:/prism/.claude/cache`. The test uses
**fixed** session ids (`test-softlegit-cafebabe` etc.) and its `afterEach` only
removed `tmpDir` (the transcript) — never the markers. So the FIRST-ever run
emitted the SOFT inject (no marker → pass, 14/14); every run AFTER hit the leaked
dedup marker → `suppressOutput` → the SOFT-band subtest (which asserts an inject
IS emitted) failed → 13/14, permanently. The earlier 14/14 I saw was just the
first run since the marker had aged out.

**Why it matters (severity).** A test that fails on every run after the first is a
**fleet-wide `stop_on_failing_tests` hazard** — any chat that runs the helpers/hooks
test set gets its Stop gate blocked by a false failure. Silent until someone runs
it twice.

**Fix.** Test-only `cleanTestMarkers()` (beforeEach + afterEach) removing ONLY this
test's own markers — filter `startsWith("precompact-") && endsWith(".marker") &&
(includes("test-") || includes("tta"))`. Provably cannot delete a live chat's
marker: production sids are `claude-<hexUUID>`; hex (0-9a-f) can spell neither
`test` (needs `s`,`t`) nor `tta` (needs `t`), and `safeSid` only sanitizes, never
synthesizes letters. Proven hermetic: 3 consecutive runs 14/14, zero markers
leaked. Reviewer-confirmed delete-safety.

**Lesson (the class).** A hook that writes to a HARDCODED shared cache + a test
with FIXED ids + cleanup that only covers the temp transcript = guaranteed
cross-run state leak. Two durable fixes: (1) make the hook's `CACHE_DIR`
env-overridable so tests can point it at a tmp dir (the fully-hermetic fix — left
for the hook owner, it touches production code); (2) the test cleans its own
shared-dir artifacts (what shipped). Any hook test asserting a *deduped* behavior
must reset the dedup substrate, not just the input fixture. Pairs with
[[reference_precompact_memory_seed_2026_06_09]] (the work this was found under) and
the R8/R12 isolate-before-blame discipline (stash to exonerate before claiming a
regression).
