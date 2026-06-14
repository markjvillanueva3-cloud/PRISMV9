---
name: reference_cimco_drift_grouping_bug_2026_06_03
description: CIMCO post-proof drift audit over-reports semantic-drift for Okuma lathes — groupByBaseName customer-collision + unreachable okuma-osp dialect mask. Next unit.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.062Z
aliases: reference_cimco_drift_grouping_bug_2026_06_03
---


# CIMCO post-proof drift audit — Okuma lathe over-report (recon finding, slot:echo, 2026-06-03)

**Finding** (evidence-backed recon agent over the real JM lathe corpus, NOT inference): `cimco-post-proof.mjs`'s golden-integrity drift audit flags all 6 Okuma lathes (LTH-01..06) with `dialect:"unknown"` and **40/40 sampled pairs "semantic-drift"** — but this is largely a measurement artifact, two independent causes:

**(A) PRIMARY — grouping bug** in `groupByBaseName` (`scripts/cimco-post-proof.mjs:90-97`). It groups by `filename minus spaces/ext/case`, so the **same literal filename reused by different customers** (`CNC LATHE\WSR\CASE1250.MIN`, `THOMASON\...`, etc. — 8 files keyed `CASE1250` across customer subdirs) gets paired and compared. These are **genuinely different parts colliding on a name** → "semantic-drift" is technically true but **meaningless** as a golden-integrity/version-drift signal. This is the bulk of the 40.

**(B) SECONDARY — unreachable dialect mask.** Native Okuma OSP goldens carry a line-1 program-name header `$<NAME>.MIN%` (e.g. `$CASEWSR.MIN%`) that echoes the filename = zero machining semantics, plus `DEF WORK`/`/CALL OBAR`/`NBAR`/`NAT##` OSP markers. `detectDialect()` (`scripts/lib/nc-dialect-masks.mjs:65-74`) has NO branch returning `"okuma-osp"`, so the `DIALECT_MASKS.okuma-osp` entry is **dead code** and the `$..%` line is never masked → `firstDiffLine:1` in all 40 entries. (Verified: true copies like `X.MIN` vs `X - Copy.MIN` already classify `byte-identical`, so the masking gap only affects true re-saved siblings.)

**Fix (next unit, U-CIMCO-DRIFT-GROUPING-FIX):**
1. Grouping/pair-selection — don't pair files from different customer subdirs (or require body-similarity before declaring a same-part group). This is the highest-value fix (clears the misleading bulk).
2. Dialect — add `detectDialect` → `"okuma-osp"` rule (`/^\$[^\n]*\.MIN%/mi` || `/^\s*DEF WORK\b/mi` || `/\/CALL OBAR\b/mi`) + an `okuma-osp` mask for the `$<NAME>.MIN%` line (paren-free anchored, fail-closed). Safe + correct but only reclassifies the true-sibling subset.
3. Tests: real-data fixtures from both OSP families + the customer-collision case + a true-sibling case.

**Discipline note:** my earlier same-session hypothesis ("unknown dialect → false drift across the lathe fleet") was PARTIALLY right but missed the dominant grouping cause — the recon agent quoting real bytes corrected it (R12, don't flip on inference). Sibling: [[reference_cimco_navmap_2026_06_03]]. Wiki [[cimco-verification-simulation-integration]].
