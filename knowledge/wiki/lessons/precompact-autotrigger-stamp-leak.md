---
title: Flaky test from a leaked shared-cache dedup stamp
type: lesson
tags: [testing, hermeticity, flaky-test, dedup, stop-gate, precompact]
created: 2026-06-09
by: claude-db273e77 (slot:alpha)
commit: 05e3c45196
---

# Flaky test from a leaked shared-cache dedup stamp

**Symptom.** `precompact-auto-trigger.test.mjs` passed 14/14 once, then failed
13/14 on every subsequent run. The SOFT-band subtest asserted an inject IS emitted
but got `{"continue":true,"suppressOutput":true}`.

**Root cause.** `precompact-auto-trigger.mjs` dedups its SOFT inject per session by
writing a marker (`precompact-auto-soft-fired-<sid>.marker`) to a **hardcoded
shared** dir `H:/prism/.claude/cache`. The test used **fixed** session ids and its
`afterEach` cleaned only the temp transcript — never the marker. First run: no
marker → inject → pass. Every run after: leaked marker → dedup-suppress → fail.

**Why it's dangerous.** A test that fails on every run *after the first* is a
fleet-wide `stop_on_failing_tests` hazard — it silently blocks the Stop gate of any
chat that runs the suite, while looking green to whoever first authored it.

**Isolate-before-blame (R8/R12).** It surfaced while editing an unrelated file
(`precompact-handoff.mjs`). `grep` proved the test had zero reference to that file;
`git stash` of the edit → still 13/14 → the edit was exonerated. Never claim "my
change regressed X" until you've reverted your change and reproduced X at HEAD.

**Fix.** Test-only `cleanTestMarkers()` in `beforeEach` + `afterEach`, removing
only the test's own markers (`startsWith("precompact-") && endsWith(".marker") &&
(includes("test-") || includes("tta"))`). Provably cannot touch a live chat's
marker: production sids are `claude-<hexUUID>`, and hex (0-9a-f) can spell neither
`test` nor `tta`; `safeSid` only sanitizes, never synthesizes letters. Hermetic:
3 consecutive runs 14/14, zero leaked.

**Generalizable rule.** Any hook test asserting a *deduped/throttled/stamped*
behavior must reset the dedup substrate, not just the input fixture — especially
when the substrate is a hardcoded shared dir. The deeper fix is to make such a
`CACHE_DIR` env-overridable so the test can redirect it to a tmp dir (full
hermeticity, zero shared-state risk); shipped the test-side cleanup here, left the
env-override for the hook owner.

See: [[reference_precompact_autotrigger_stamp_leak_2026_06_09]] ·
[[reference_precompact_memory_seed_2026_06_09]]
