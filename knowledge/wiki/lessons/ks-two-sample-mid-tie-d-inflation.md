---
title: 2-sample KS statistic — mid-tie measurement inflates D (classic pitfall)
type: lesson
tags: [statistics, kolmogorov-smirnov, scrutiny-3of3, cad, dimtol, slot-delta]
created: 2026-06-28
slot: delta
commits: [50d4afc5ac, e60deb869b]
related: [extracted-value-without-unit-label-is-a-scale-bomb, dont-soften-code-completeness-correctness-gates]
---

# 2-sample KS statistic: coalesce cross-sample ties before measuring D

**Context:** `U-DELTA-DIMTOL-KS-GATE` (the T-DIMTOL drift gate, `scripts/lib/cad-dimtol-ks-validate.mjs`).

## The bug

A two-pointer 2-sample Kolmogorov-Smirnov walk that advances **one step per pointer** when a value
appears in **both** samples measures the CDF gap `|F1(x) - F2(x)|` *mid-tie* — before all copies of
that value have been absorbed on both sides. This **inflates D upward** (never down) on tied/clustered
data. Minimal repro (pre-fix):
- `ksStatistic([5], [2,5,5,5,5]).D` returned **0.8**, true **0.2**.
- `ksStatistic([5], [5,5,5,5]).D` returned **1.0**, true **0** (identical single value -> no drift).

(The pre-fix values are 0.8/1.0; an earlier commit-message prose estimate of 0.6/0.75 was wrong — the
code/test are correct, the prose was off. R12: record the verified numbers.)

## The fix

For each distinct value `v = min(a[i], b[j])`, advance **both** pointers past *every* copy of `v`,
then measure the gap **once** per distinct value:

```js
while (i < n1 && j < n2) {
  const v = a[i] < b[j] ? a[i] : b[j];
  while (i < n1 && a[i] === v) i++;
  while (j < n2 && b[j] === v) j++;
  const gap = Math.abs(i / n1 - j / n2);
  if (gap > d) d = gap;
}
```

Verified against a brute-force `max_x |F1(x) - F2(x)|` oracle on 50,000 tie-heavy integer samples (0
mismatches). Standard reference points preserved: identical->0, disjoint->1, `[1,2,3,4]vs[3,4,5,6]`->0.5.

## Meta-lessons

1. **The 3-of-3 scrutiny gate earns its cost on subtle statistical bugs.** Two reviewers (holistic +
   analyst) PASSED this commit — one even claimed a brute-force oracle "matched exactly including
   duplicate-value samples." Only arm B's **independent 20k-case differential test against a
   hand-rolled oracle** surfaced the one-directional inflation. A single reviewer (or self-review)
   would have shipped it. Triangulation > confidence.
2. **Test the discriminating case, not just the easy ones.** The original 11 tests were all fully-
   disjoint (D=1), fully-identical (lockstep -> correct D=0 even when buggy), or had the sup away from
   a shared value — none exercised the mid-tie pattern, so the suite was green against the bug (R9
   coverage gap). The regression test now pins `[5]vs[2,5,5,5,5]->0.2` and `[5]vs[5,5,5,5]->0`.
3. **A real correctness bug can have negligible live impact — say so, don't overclaim either way.**
   The live T-DIMTOL pass-rate was unchanged after the fix (die 20%, general 26%) because real
   floating-point radii rarely tie *exactly* (`===`) across parts. So the bug was real and worth
   fixing, AND the within-class-heterogeneity finding it might have confounded turned out genuine. Both
   are true; report both (R12).
