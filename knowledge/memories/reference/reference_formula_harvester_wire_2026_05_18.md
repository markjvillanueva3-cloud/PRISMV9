---
name: reference-formula-harvester-wire-2026-05-18
description: U-GAP-TRIBAL-FORMULA-REGISTRY — wire orphan FormulaHarvesterEngine to prism_dev + R12 + git-track knowledge files
metadata:
  type: reference
---

**U-GAP-TRIBAL-FORMULA-REGISTRY (FEATURE-GAP-AUDIT-MS0)** — shipped 2026-05-18, slot foxtrot, commit `4ab0fa591f`.

R8 dedup-win: the unit ("Formula-registry harvester — 400+ formulas in 3 JS files") was already built as `FormulaHarvesterEngine.ts` (RES-MS1) — 19/19 tests — but **unwired** (zero dispatcher ref, FEATURE-GAP-AUDIT orphan class). Real deliverable was wiring, not building.

Shipped: `prism_dev:formula_harvest{,_sources,_audit}` (3 devDispatcher actions, mirror the `formula_accuracy` family convention). 4-case dispatcher round-trip test (real-data anti-stub: `totalFormulas>50` from real disk parse of 107 formulas).

**3-round per-file scrutiny caught 3 real issues** (P0+P1+P2 — would have shipped broken otherwise):
- **P0** — `resources/` is git-ignored (`.git/info/exclude:8`), so the 3 knowledge JS files (~313KB) were untracked → real-data oracle was machine-local, feature dead on fresh clone/CI. Fix: `git add -f` + commit the 3 files (now travel with the repo).
- **P1** — engine `catch` swallowed read failure → success-shaped `{totalFormulas:0}` (R12 violation / `engines.md` no-silentCatch). Fix: `harvest()` now returns `degraded`/`errors`/`filesRead`, logs a LOUD undercount error; `audit()` propagates.
- **P2** — hard-coded `H:/prism/...` `FORMULA_ROOT` (2nd-PC/CI broken). Fix: `process.env.PRISM_FORMULA_ROOT ?? nodePath.join(PATHS.PRISM_ROOT, ...)`.

**Why:** the 12-chat shared-`H:/prism` git index made commits fail repeatedly — `git add -f` was un-staged by peers; `git commit` lost the HEAD ref-lock race (`fatal: cannot lock ref 'HEAD'`).

**How to apply:** for contended-ref commits on `cad-fusion-live-ms0`, the race-proof primitive is **`commit-tree` + `update-ref` compare-and-swap** in a retry loop with a private `GIT_INDEX_FILE` and raw `command git` (RTK output-filtering hides the ref-lock error from grep-based retry detection). Recompute `read-tree` from FRESH HEAD each retry so concurrent peer changes to other files are never reverted. Landed clean on attempt 1 — exactly 6 files, no peer contamination. See [[reference_cross_chat_commit_misattribution_2026_05_18]] · [[feedback_conflict_fork_rule]].
