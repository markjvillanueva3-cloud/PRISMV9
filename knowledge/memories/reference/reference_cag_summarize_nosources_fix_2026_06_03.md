---
name: reference_cag_summarize_nosources_fix_2026_06_03
description: CAG-router summarize() rendered a misleading "→ +" fleet-wide for the most-common (no-keyword) HYBRID route — dead "(no sources)" fallback defeated by a truthy " + " string; same dead-fallback/untested-producer-shape class as the NN/GNN schema-read fixes
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.499Z
aliases: reference_cag_summarize_nosources_fix_2026_06_03
---


# CAG-router summarize() honest-no-sources render fix (slot:india, 2026-06-03, commit 56b942f50a)

## What

`scripts/lib/cag-router.mjs` `summarize()` (the 1-line CAG-route hook-inject formatter) rendered
`→ +` (dangling separator) instead of `→ (no sources)` for the **low-confidence default route** —
a no-keyword-match prompt classifies as `HYBRID conf 0` with empty cold+hot. Because keyword
match-rate is ~1%, that misleading render hit **nearly every prompt fleet-wide** (it's the literal
`## 🧭 CAG-route — HYBRID (conf 0%) → +` line every session's SessionStart shows).

## Root cause — dead fallback defeated by a truthy string

The HYBRID arm built `` `${coldSources[0]} + ${hotSources[0]}` `` → with both lists empty that's the
literal string `" + "` (space-plus-space), which is **truthy**, so the downstream
`sources || "(no sources)"` fallback **never fired**. The COLD/HOT arms were never affected
(`[].slice().join(", ")` is `""`, which correctly triggers the fallback) — the bug was HYBRID-only
because only that arm interpolated a constant separator between two possibly-empty operands.

Fix: `cold1 && hot1 ? "cold + hot" : cold1 || hot1` — empty+empty collapses to `""` so the fallback
fires; one-sided shows just the present side (no phantom separator).

## Lesson (compounds with the NN/GNN arc this session)

This is the **same regression class** as [[reference_nn_graded_schema_read_fix_2026_06_03]] and
[[nn-leg-schema-read-fix]]: **a fallback / branch that is dead code because no test exercised the
producing shape.** The `summarize` tests covered COLD, HOT, HYBRID-*with-sources*, and null — but
never HYBRID-*with-empty-sources*, the single most common production input. A correctness guard
(`|| "(no sources)"`) is only as good as the set of producer shapes its tests actually drive through
it. **Pair every fallback with a test that drives the exact input that should trigger it** — and when
the input is "the common default", that test is mandatory, not edge-case polish.

R9 detail: arm-B scrutiny caught that my first no-sources assertion `!s.includes("→ +")` was green on
BOTH old and new (the old bug rendered TWO spaces `"→  + "`, so the one-space literal never matched) —
tightened to `!s.includes(" + ")` which discriminates. A non-discriminating assertion is itself a
dead guard; the lesson applies recursively to the test.

## State

Fix committed `56b942f50a`, 3-of-3 PASS (0 P0/P1). +5 summarize tests (44/44). A P3 test-tightening
follow-up (`U-CAG-SUMMARIZE-NOSOURCES-FIX-P3`) is verified (44/44) but pending commit — blocked at the
time by a stale `.git/index.lock` (a peer workholding-DB `git add` crashed leaving the lock + 4 staged
files; did NOT remove it — a live git.exe + peer staged files = index-corruption risk). Land the P3
test commit + a CLAUDE.md `## Recent regressions` line + wiki note on the next tick once the lock
clears. Files: `scripts/lib/cag-router.mjs` + `scripts/lib/cag-router.test.mjs`. Consumer:
`.claude/hooks/cag-router-inject.mjs:149`. Related: [[reference_cag_router_2026_05_26]].
