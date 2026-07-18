---
name: feedback_verify_no_committed_imports_uncommitted
description: "Before declaring a batch shipped, grep committed engines for imports of still-untracked files — an orphaned dependency build-breaks history silently."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.451Z
aliases: feedback_verify_no_committed_imports_uncommitted
---


When closing out a multi-file build, run an orphaned-dependency check: for every untracked (`??`) source file, confirm no ALREADY-COMMITTED file imports it. A committed engine importing an uncommitted module compiles locally (the file is present on disk) but **build-breaks in history** — anyone who checks out that commit gets an unresolved import. This is a silent break: tsc/vitest pass locally, so nothing surfaces it until a fresh checkout or CI.

**Concrete catch (2026-05-30, slot:hotel, QB-PARITY Phase-5):** `git status` showed `?? src/data/bank-accounts.ts`. A Grep proved `BankDepositTransferEngine.ts` (committed in Phase-3 `U-QBP-14`) imports `../data/bank-accounts.js`. The dependency was never committed — the Phase-3 commit was build-broken in history. Rescued via `U-QBP-14-FIXUP` (commit the orphaned file so HEAD-onward builds; can't retroactively fix the broken middle commits without rewriting shared history, which we don't do).

**Why:** the slot-worktree build always has uncommitted files present, so local green ≠ committed-tree green — the same class as [[feedback_dispatcher_path_green_not_engine_green]] (engine-green ≠ dispatcher-path-green; tests-pass ≠ type-clean). Esbuild/vitest never see the missing-from-history gap.

**How to apply:** at every batch close-out, before `git commit`: `git status --short` → for each `??` data/constants/util file, `Grep "<basename>"` across `src/`; if a tracked file imports it, stage it in THIS commit (or a `-FIXUP` commit). Pairs with [[feedback_always_close_out]] (R12 fail-loud — surface the prior break, don't mask it). Also confirm `tsc --noEmit` is 0-error on the committed set, not just that vitest is green.
